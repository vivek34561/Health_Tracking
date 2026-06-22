import httpx
from app.core.config import get_settings
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import statistics
from typing import Optional

def to_local_datetime(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        # Standardize ISO format for fromisoformat
        clean_str = date_str.replace('Z', '+00:00')
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is not None:
            return dt.astimezone()
        return dt
    except Exception:
        return None


async def fetch_health_data(jwt_token: str) -> Dict[str, Any]:
    """
    Calls the Express backend to retrieve all health data for the authenticated user.
    Returns a structured summary dict.
    """
    settings = get_settings()
    base_url = settings.express_api_url
    headers = {"Authorization": f"Bearer {jwt_token}"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Fetch all data in parallel
        results = await _fetch_all(client, base_url, headers)

    return _build_summary(results)


async def _fetch_all(client: httpx.AsyncClient, base_url: str, headers: dict) -> dict:
    """Fetch all health endpoints concurrently."""
    import asyncio

    async def safe_get(url: str):
        try:
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return []

    weights, water, sleep, activities, goals, dashboard, nutrition_today, diet_goals = await asyncio.gather(
        safe_get(f"{base_url}/api/weights"),
        safe_get(f"{base_url}/api/water"),
        safe_get(f"{base_url}/api/sleep"),
        safe_get(f"{base_url}/api/activities"),
        safe_get(f"{base_url}/api/goals"),
        safe_get(f"{base_url}/api/dashboard"),
        safe_get(f"{base_url}/api/nutrition/today"),
        safe_get(f"{base_url}/api/diet/goals"),
    )

    return {
        "weights": weights if isinstance(weights, list) else weights.get("data", []),
        "water": water if isinstance(water, list) else water.get("data", []),
        "sleep": sleep if isinstance(sleep, list) else sleep.get("data", []),
        "activities": activities if isinstance(activities, list) else activities.get("data", []),
        "goals": goals if isinstance(goals, list) else goals.get("data", []),
        "dashboard": dashboard if isinstance(dashboard, dict) else {},
        "nutrition_today": nutrition_today if isinstance(nutrition_today, dict) else {},
        "diet_goals": diet_goals if isinstance(diet_goals, dict) else {},
    }


def _build_summary(data: dict) -> Dict[str, Any]:
    """Transform raw API responses into a structured health summary for LLM consumption."""
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # --- Weight Analysis ---
    weights = data.get("weights", [])
    weight_values = []
    for w in weights:
        try:
            weight_values.append(float(w.get("weight", 0)))
        except (ValueError, TypeError):
            pass

    latest_weight = weight_values[0] if weight_values else None
    weight_trend = "stable"
    if len(weight_values) >= 3:
        recent = weight_values[:3]
        if recent[0] < recent[-1] - 0.5:
            weight_trend = "decreasing"
        elif recent[0] > recent[-1] + 0.5:
            weight_trend = "increasing"

    # --- Sleep Analysis (last 7 days) ---
    sleep_logs = data.get("sleep", [])
    recent_sleep_hours = []
    for s in sleep_logs:
        try:
            h = float(s.get("totalHours") or s.get("total_hours", 0))
            if h > 0:
                recent_sleep_hours.append(h)
        except (ValueError, TypeError):
            pass
    recent_sleep_hours = recent_sleep_hours[:7]
    avg_sleep = round(statistics.mean(recent_sleep_hours), 1) if recent_sleep_hours else None
    sleep_quality = "good" if avg_sleep and avg_sleep >= 7 else ("fair" if avg_sleep and avg_sleep >= 6 else "poor")

    # --- Water Analysis (last 7 days) ---
    water_logs = data.get("water", [])
    # Group by day and sum
    water_by_day: Dict[str, float] = {}
    for w in water_logs:
        consumed_at_str = w.get("consumedAt") or w.get("consumed_at") or ""
        dt = to_local_datetime(consumed_at_str)
        if dt:
            day = dt.strftime("%Y-%m-%d")
            try:
                water_by_day[day] = water_by_day.get(day, 0) + float(w.get("amountMl") or w.get("amount_ml", 0))
            except (ValueError, TypeError):
                pass
    recent_water = list(water_by_day.values())[:7]
    avg_water = round(statistics.mean(recent_water)) if recent_water else None
    water_goal = 2500  # ml default

    # --- Activity Analysis ---
    activities = data.get("activities", [])
    total_activities = len(activities)
    last_week_activities = []
    total_calories = 0
    for a in activities:
        total_calories += int(a.get("calories_burned") or a.get("caloriesBurned", 0))
        date_str = (a.get("activityDate") or a.get("activity_date") or "")[:10]
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            if d >= week_ago:
                last_week_activities.append(a)
        except ValueError:
            pass
    workouts_this_week = len(last_week_activities)
    activity_types = list(set(a.get("activityType") or a.get("activity_type", "Unknown") for a in activities[:10]))

    # --- Goals Analysis ---
    goals = data.get("goals", [])
    active_goals = [g for g in goals if g.get("status") == "ACTIVE"]
    completed_goals = [g for g in goals if g.get("status") == "COMPLETED"]

    goal_summaries = []
    for g in active_goals[:5]:
        try:
            target = float(g.get("targetValue") or g.get("target_value", 1))
            current = float(g.get("currentValue") or g.get("current_value", 0))
            pct = min(100, round((current / target) * 100)) if target > 0 else 0
            goal_summaries.append({
                "type": g.get("goalType") or g.get("goal_type", "Unknown"),
                "progress_pct": pct,
                "current": current,
                "target": target,
                "unit": g.get("unit", ""),
            })
        except (ValueError, TypeError):
            pass

    # --- Dashboard ---
    dashboard = data.get("dashboard", {})

    return {
        "weight": {
            "latest_kg": latest_weight,
            "trend": weight_trend,
            "total_records": len(weight_values),
        },
        "sleep": {
            "avg_hours_last_7_days": avg_sleep,
            "quality": sleep_quality,
            "total_records": len(sleep_logs),
            "recommended_hours": 8,
        },
        "water": {
            "avg_ml_per_day": avg_water,
            "goal_ml": water_goal,
            "percent_of_goal": round((avg_water / water_goal) * 100) if avg_water else None,
        },
        "activity": {
            "workouts_this_week": workouts_this_week,
            "total_activities": total_activities,
            "total_calories_burned": total_calories,
            "recent_types": activity_types[:5],
        },
        "goals": {
            "active_count": len(active_goals),
            "completed_count": len(completed_goals),
            "details": goal_summaries,
        },
        "dashboard": dashboard,
        "nutrition_today": data.get("nutrition_today", {}),
        "diet_goals": data.get("diet_goals", {}),
        "generated_at": now.isoformat(),
    }


def format_summary_for_prompt(summary: Dict[str, Any]) -> str:
    """Format the health summary as a readable string for LLM context."""
    lines = ["=== USER HEALTH SUMMARY ==="]

    w = summary.get("weight", {})
    if w.get("latest_kg"):
        lines.append(f"Weight: {w['latest_kg']} kg (trend: {w['trend']})")

    s = summary.get("sleep", {})
    if s.get("avg_hours_last_7_days"):
        lines.append(
            f"Sleep: avg {s['avg_hours_last_7_days']}h/night last 7 days "
            f"(quality: {s['quality']}, target: {s['recommended_hours']}h)"
        )

    wt = summary.get("water", {})
    if wt.get("avg_ml_per_day"):
        lines.append(
            f"Water: avg {wt['avg_ml_per_day']}ml/day "
            f"({wt.get('percent_of_goal', 0)}% of {wt['goal_ml']}ml goal)"
        )

    a = summary.get("activity", {})
    lines.append(
        f"Activity: {a.get('workouts_this_week', 0)} workouts this week, "
        f"{a.get('total_calories_burned', 0)} total calories burned"
    )
    if a.get("recent_types"):
        lines.append(f"  Recent activities: {', '.join(a['recent_types'])}")

    g = summary.get("goals", {})
    lines.append(f"Goals: {g.get('active_count', 0)} active, {g.get('completed_count', 0)} completed")
    for gd in g.get("details", []):
        lines.append(
            f"  - {gd['type']}: {gd['progress_pct']}% complete "
            f"({gd['current']}/{gd['target']} {gd['unit']})"
        )

    nut = summary.get("nutrition_today", {})
    if nut and "consumed" in nut:
        consumed = nut["consumed"]
        targets = nut["targets"]
        remaining = nut["remaining"]
        lines.append(
            f"Diet & Nutrition (Today):\n"
            f"  - Calories: Consumed {consumed.get('calories', 0)} kcal / Goal {targets.get('calories', 0)} kcal (Remaining: {remaining.get('calories', 0)} kcal)\n"
            f"  - Protein: Consumed {consumed.get('protein', 0)}g / Goal {targets.get('protein', 0)}g (Remaining: {remaining.get('protein', 0)}g)\n"
            f"  - Carbs: Consumed {consumed.get('carbs', 0)}g / Goal {targets.get('carbs', 0)}g (Remaining: {remaining.get('carbs', 0)}g)\n"
            f"  - Fat: Consumed {consumed.get('fat', 0)}g / Goal {targets.get('fat', 0)}g (Remaining: {remaining.get('fat', 0)}g)\n"
            f"  - Fiber: Consumed {consumed.get('fiber', 0)}g / Goal {targets.get('fiber', 0)}g (Remaining: {remaining.get('fiber', 0)}g)"
        )

    lines.append("=========================")
    return "\n".join(lines)
