from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
import httpx
from app.core.config import get_settings
from app.services.rag_service import retrieve_relevant_chunks, format_rag_context

def format_to_local_time(date_str: str, format_pattern: str = "%Y-%m-%d %H:%M") -> str:
    if not date_str or date_str in ("Unknown Date", "Unknown"):
        return date_str
    try:
        # Standardize ISO format for fromisoformat
        clean_str = date_str.replace('Z', '+00:00')
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is not None:
            dt = dt.astimezone()
        return dt.strftime(format_pattern)
    except Exception:
        return date_str[:16].replace('T', ' ')

# ==========================================
# 1. PYDANTIC SCHEMAS (Validation Layer)
# ==========================================

class WaterCreateInput(BaseModel):
    amount_ml: int = Field(..., description="Amount of water in milliliters.")
    consumed_at: Optional[str] = Field(None, description="Optional ISO datetime string of when consumed.")

    @field_validator('amount_ml')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Water amount must be positive.")
        if v > 20000:
            raise ValueError("Water intake cannot exceed 20 liters (20,000ml) in a single entry.")
        return v

class WaterUpdateInput(BaseModel):
    record_id: int = Field(..., description="ID of the water log record to update.")
    amount_ml: int = Field(..., description="New amount of water in milliliters.")
    consumed_at: Optional[str] = Field(None, description="Optional ISO datetime string.")

    @field_validator('amount_ml')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Water amount must be positive.")
        if v > 20000:
            raise ValueError("Water intake cannot exceed 20 liters (20,000ml) in a single entry.")
        return v

class WeightCreateInput(BaseModel):
    weight_kg: float = Field(..., description="Weight of the user in kilograms.")
    recorded_at: Optional[str] = Field(None, description="Optional ISO datetime/date string.")

    @field_validator('weight_kg')
    @classmethod
    def validate_weight(cls, v):
        if v < 20.0:
            raise ValueError("Weight must be at least 20 kg.")
        if v > 500.0:
            raise ValueError("Weight cannot exceed 500 kg.")
        return v

class WeightUpdateInput(BaseModel):
    record_id: int = Field(..., description="ID of the weight record to update.")
    weight_kg: float = Field(..., description="New weight of the user in kilograms.")
    recorded_at: Optional[str] = Field(None, description="Optional ISO datetime/date string.")

    @field_validator('weight_kg')
    @classmethod
    def validate_weight(cls, v):
        if v < 20.0:
            raise ValueError("Weight must be at least 20 kg.")
        if v > 500.0:
            raise ValueError("Weight cannot exceed 500 kg.")
        return v

class SleepCreateInput(BaseModel):
    sleep_start: str = Field(..., description="Bedtime ISO datetime (e.g. '2026-06-21T22:30:00').")
    sleep_end: str = Field(..., description="Wakeup ISO datetime (e.g. '2026-06-22T06:30:00').")
    quality_score: Optional[int] = Field(None, description="Quality score from 1 to 10.")

    @field_validator('quality_score')
    @classmethod
    def validate_quality(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError("Quality score must be between 1 and 10.")
        return v

    @model_validator(mode='after')
    def validate_duration(self):
        try:
            start = datetime.fromisoformat(self.sleep_start.replace('Z', '+00:00'))
            end = datetime.fromisoformat(self.sleep_end.replace('Z', '+00:00'))
        except Exception:
            raise ValueError("Invalid date format. Please use ISO format YYYY-MM-DDTHH:MM:SS.")
        
        duration = (end - start).total_seconds() / 3600
        if duration <= 0:
            raise ValueError("Sleep end time must be after sleep start time.")
        if duration > 24.0:
            raise ValueError("Sleep duration cannot exceed 24 hours.")
        return self

class SleepUpdateInput(BaseModel):
    record_id: int = Field(..., description="ID of the sleep record to update.")
    sleep_start: str = Field(..., description="Bedtime ISO datetime.")
    sleep_end: str = Field(..., description="Wakeup ISO datetime.")
    quality_score: Optional[int] = Field(None, description="Quality score from 1 to 10.")

    @field_validator('quality_score')
    @classmethod
    def validate_quality(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError("Quality score must be between 1 and 10.")
        return v

    @model_validator(mode='after')
    def validate_duration(self):
        try:
            start = datetime.fromisoformat(self.sleep_start.replace('Z', '+00:00'))
            end = datetime.fromisoformat(self.sleep_end.replace('Z', '+00:00'))
        except Exception:
            raise ValueError("Invalid date format.")
        
        duration = (end - start).total_seconds() / 3600
        if duration <= 0:
            raise ValueError("Sleep end must be after sleep start.")
        if duration > 24.0:
            raise ValueError("Sleep duration cannot exceed 24 hours.")
        return self

class ActivityCreateInput(BaseModel):
    activity_type: str = Field(..., description="Type of exercise. E.g. 'WALKING', 'RUNNING', 'CYCLING', 'GYM', 'YOGA', 'OTHER'.")
    duration_minutes: int = Field(..., description="Duration of activity in minutes.")
    calories_burned: Optional[int] = Field(0, description="Calories burned.")
    distance_km: Optional[float] = Field(0.0, description="Optional distance covered in kilometers.")
    activity_date: Optional[str] = Field(None, description="Optional date string (YYYY-MM-DD).")

    @field_validator('duration_minutes')
    @classmethod
    def validate_duration(cls, v):
        if v <= 0:
            raise ValueError("Duration must be greater than 0 minutes.")
        if v > 1440:
            raise ValueError("Duration cannot exceed 24 hours (1440 minutes).")
        return v

    @field_validator('calories_burned')
    @classmethod
    def validate_calories(cls, v):
        if v is not None and v < 0:
            raise ValueError("Calories burned cannot be negative.")
        return v

class ActivityUpdateInput(BaseModel):
    record_id: int = Field(..., description="ID of the activity log to update.")
    activity_type: str = Field(..., description="Type of exercise.")
    duration_minutes: int = Field(..., description="Duration of activity in minutes.")
    calories_burned: Optional[int] = Field(0, description="Calories burned.")
    distance_km: Optional[float] = Field(0.0, description="Distance covered in kilometers.")
    activity_date: Optional[str] = Field(None, description="Optional date string (YYYY-MM-DD).")

    @field_validator('duration_minutes')
    @classmethod
    def validate_duration(cls, v):
        if v <= 0:
            raise ValueError("Duration must be greater than 0 minutes.")
        if v > 1440:
            raise ValueError("Duration cannot exceed 24 hours (1440 minutes).")
        return v

class GoalCreateInput(BaseModel):
    goal_type: str = Field(..., description="Goal type: 'WEIGHT', 'WATER', 'SLEEP', 'ACTIVITY', 'STEPS'.")
    target_value: float = Field(..., description="Target value to achieve.")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD). Defaults to today.")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD). Defaults to today + 7 days.")

    @field_validator('target_value')
    @classmethod
    def validate_target(cls, v):
        if v <= 0:
            raise ValueError("Target value must be greater than 0.")
        return v

class GoalUpdateInput(BaseModel):
    record_id: int = Field(..., description="ID of the goal to update.")
    goal_type: Optional[str] = Field(None, description="Goal type.")
    target_value: Optional[float] = Field(None, description="Target value to achieve.")
    current_value: Optional[float] = Field(None, description="Current progress value.")
    status: Optional[str] = Field(None, description="Goal status: 'ACTIVE', 'COMPLETED', 'FAILED'.")

class RecordIdInput(BaseModel):
    record_id: int = Field(..., description="The ID of the record to target.")

class SearchMedicalInput(BaseModel):
    query: str = Field(..., description="The keyword or search query to look for in medical reports.")

# ==========================================
# 2. HELPER TO MAKE AUTHENTICATED CALLS TO EXPRESS
# ==========================================

async def _api_call(method: str, path: str, json_data: Any = None, config: RunnableConfig = None) -> Dict[str, Any]:
    """Helper function to make authenticated calls back to the Express Core API."""
    settings = get_settings()
    base_url = settings.express_api_url
    
    # Extract JWT token from context
    jwt_token = config.get("configurable", {}).get("jwt_token", "") if config else ""
    headers = {}
    if jwt_token:
        # Support both bare token and Bearer prefix formats
        token_str = jwt_token if jwt_token.startswith("Bearer ") else f"Bearer {jwt_token}"
        headers["Authorization"] = token_str
        
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if method.upper() == "GET":
                response = await client.get(f"{base_url}{path}", headers=headers)
            elif method.upper() == "POST":
                response = await client.post(f"{base_url}{path}", json=json_data, headers=headers)
            elif method.upper() == "PUT":
                response = await client.put(f"{base_url}{path}", json=json_data, headers=headers)
            elif method.upper() == "DELETE":
                response = await client.delete(f"{base_url}{path}", headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            if response.status_code in (200, 201):
                return response.json()
            else:
                try:
                    err_msg = response.json().get("message", "API Error")
                except Exception:
                    err_msg = response.text or "API Error"
                return {"success": False, "error": f"HTTP {response.status_code}: {err_msg}"}
        except Exception as e:
            return {"success": False, "error": f"Network error: {str(e)}"}

# ==========================================
# 3. TOOL DEFINITIONS
# ==========================================

@tool(args_schema=WaterCreateInput)
async def create_water_log(amount_ml: int, consumed_at: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Log water intake in ml. amount_ml must be positive and <= 20000ml."""
    payload = {"amount_ml": amount_ml}
    if consumed_at:
        payload["consumed_at"] = consumed_at
    result = await _api_call("POST", "/api/water", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully logged {amount_ml}ml of water intake (Log ID: {result.get('id')})."

@tool(args_schema=WaterUpdateInput)
async def update_water_log(record_id: int, amount_ml: int, consumed_at: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Update an existing water log entry. amount_ml must be positive and <= 20000ml."""
    payload = {"amount_ml": amount_ml}
    if consumed_at:
        payload["consumed_at"] = consumed_at
    result = await _api_call("PUT", f"/api/water/{record_id}", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully updated water log entry {record_id} to {amount_ml}ml."

@tool(args_schema=RecordIdInput)
async def delete_water_log(record_id: int, config: RunnableConfig = None) -> str:
    """Delete a water log entry by its ID."""
    result = await _api_call("DELETE", f"/api/water/{record_id}", None, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully deleted water log entry {record_id}."

@tool
async def get_water_logs(config: RunnableConfig = None) -> str:
    """Fetch the history of water intake logs for the user."""
    result = await _api_call("GET", "/api/water", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    if not result:
        return "No water logs found."
    
    lines = ["Here are your water intake logs:"]
    for item in result[:10]: # Return top 10 logs for context
        date_str = item.get("consumed_at") or item.get("consumedAt") or item.get("recorded_at") or item.get("recordedAt") or "Unknown Date"
        local_date = format_to_local_time(date_str)
        lines.append(f"- ID: {item.get('id')} | Amount: {item.get('amount_ml') or item.get('amountMl')}ml | Date: {local_date}")
    return "\n".join(lines)


@tool(args_schema=WeightCreateInput)
async def create_weight_log(weight_kg: float, recorded_at: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Record user weight in kg. weight_kg must be between 20.0 and 500.0."""
    payload = {"weight": weight_kg}
    if recorded_at:
        payload["recordedAt"] = recorded_at
    result = await _api_call("POST", "/api/weights", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully recorded weight as {weight_kg}kg (Record ID: {result.get('id')})."

@tool(args_schema=WeightUpdateInput)
async def update_weight_log(record_id: int, weight_kg: float, recorded_at: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Update an existing weight record. weight_kg must be between 20.0 and 500.0."""
    payload = {"weight": weight_kg}
    if recorded_at:
        payload["recordedAt"] = recorded_at
    result = await _api_call("PUT", f"/api/weights/{record_id}", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully updated weight record {record_id} to {weight_kg}kg."

@tool(args_schema=RecordIdInput)
async def delete_weight_log(record_id: int, config: RunnableConfig = None) -> str:
    """Delete a weight record by its ID."""
    result = await _api_call("DELETE", f"/api/weights/{record_id}", None, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully deleted weight record {record_id}."

@tool
async def get_weight_history(config: RunnableConfig = None) -> str:
    """Retrieve weight history logs."""
    result = await _api_call("GET", "/api/weights", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    if not result:
        return "No weight history records found."
    
    lines = ["Here is your weight history:"]
    for item in result[:10]:
        date_str = item.get("recorded_at") or item.get("recordedAt") or "Unknown Date"
        local_date = format_to_local_time(date_str, "%Y-%m-%d")
        lines.append(f"- ID: {item.get('id')} | Weight: {item.get('weight')}kg | Date: {local_date}")
    return "\n".join(lines)


@tool(args_schema=SleepCreateInput)
async def create_sleep_log(sleep_start: str, sleep_end: str, quality_score: Optional[int] = None, config: RunnableConfig = None) -> str:
    """Add a sleep log with sleep_start and sleep_end datetimes. Sleep duration must not exceed 24 hours."""
    payload = {"sleep_start": sleep_start, "sleep_end": sleep_end}
    if quality_score is not None:
        payload["quality_score"] = quality_score
    result = await _api_call("POST", "/api/sleep", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully added sleep record (Record ID: {result.get('id')})."

@tool(args_schema=SleepUpdateInput)
async def update_sleep_log(record_id: int, sleep_start: str, sleep_end: str, quality_score: Optional[int] = None, config: RunnableConfig = None) -> str:
    """Update an existing sleep log. Sleep duration must not exceed 24 hours."""
    payload = {"sleep_start": sleep_start, "sleep_end": sleep_end}
    if quality_score is not None:
        payload["quality_score"] = quality_score
    result = await _api_call("PUT", f"/api/sleep/{record_id}", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully updated sleep record {record_id}."

@tool(args_schema=RecordIdInput)
async def delete_sleep_log(record_id: int, config: RunnableConfig = None) -> str:
    """Delete a sleep record by its ID."""
    result = await _api_call("DELETE", f"/api/sleep/{record_id}", None, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully deleted sleep record {record_id}."

@tool
async def get_sleep_logs(config: RunnableConfig = None) -> str:
    """Retrieve sleep history logs."""
    result = await _api_call("GET", "/api/sleep", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    if not result:
        return "No sleep records found."
    
    lines = ["Here is your sleep history:"]
    for item in result[:10]:
        total_hours = item.get("total_hours") or item.get("totalHours") or "Unknown"
        start_str = item.get("sleep_start") or item.get("sleepStart") or "Unknown"
        end_str = item.get("sleep_end") or item.get("sleepEnd") or "Unknown"
        local_start = format_to_local_time(start_str)
        local_end = format_to_local_time(end_str)
        lines.append(f"- ID: {item.get('id')} | Sleep: {total_hours}h | Start: {local_start} | End: {local_end}")
    return "\n".join(lines)


@tool(args_schema=ActivityCreateInput)
async def create_activity(activity_type: str, duration_minutes: int, calories_burned: Optional[int] = 0, distance_km: Optional[float] = 0.0, activity_date: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Record physical workout activity. activity_type must be WALKING, RUNNING, CYCLING, GYM, YOGA or OTHER."""
    payload = {
        "activity_type": activity_type.upper(),
        "duration": duration_minutes,
        "calories_burned": calories_burned,
        "distance_km": distance_km
    }
    if activity_date:
        payload["activity_date"] = activity_date
    result = await _api_call("POST", "/api/activities", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully recorded {activity_type} activity for {duration_minutes} minutes (ID: {result.get('id')})."

@tool(args_schema=ActivityUpdateInput)
async def update_activity(record_id: int, activity_type: str, duration_minutes: int, calories_burned: Optional[int] = 0, distance_km: Optional[float] = 0.0, activity_date: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Update an existing activity log entry. activity_type must be WALKING, RUNNING, CYCLING, GYM, YOGA or OTHER."""
    payload = {
        "activity_type": activity_type.upper(),
        "duration": duration_minutes,
        "calories_burned": calories_burned,
        "distance_km": distance_km
    }
    if activity_date:
        payload["activity_date"] = activity_date
    result = await _api_call("PUT", f"/api/activities/{record_id}", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully updated activity record {record_id}."

@tool(args_schema=RecordIdInput)
async def delete_activity(record_id: int, config: RunnableConfig = None) -> str:
    """Delete an activity log entry by ID."""
    result = await _api_call("DELETE", f"/api/activities/{record_id}", None, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully deleted activity log entry {record_id}."

@tool
async def get_activities(config: RunnableConfig = None) -> str:
    """Retrieve logged activities."""
    result = await _api_call("GET", "/api/activities", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    if not result:
        return "No activities found."
    
    lines = ["Here are your logged workouts:"]
    for item in result[:10]:
        act_type = item.get("activity_type") or item.get("activityType") or "Workout"
        duration = item.get("duration_minutes") or item.get("duration") or 0
        calories = item.get("calories_burned") or item.get("caloriesBurned") or 0
        date_str = item.get("activity_date") or item.get("activityDate") or "Unknown"
        lines.append(f"- ID: {item.get('id')} | {act_type} | Duration: {duration} mins | Calories: {calories} kcal | Date: {date_str[:10]}")
    return "\n".join(lines)


@tool(args_schema=GoalCreateInput)
async def create_goal(goal_type: str, target_value: float, start_date: Optional[str] = None, end_date: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Set a health goal. goal_type must be WATER, WEIGHT, SLEEP, ACTIVITY or STEPS."""
    payload = {
        "goal_type": goal_type.upper(),
        "target_value": target_value
    }
    if start_date:
        payload["start_date"] = start_date
    if end_date:
        payload["end_date"] = end_date
    result = await _api_call("POST", "/api/goals", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully created new {goal_type} goal with target {target_value} (Goal ID: {result.get('id')})."

@tool(args_schema=GoalUpdateInput)
async def update_goal(record_id: int, goal_type: Optional[str] = None, target_value: Optional[float] = None, current_value: Optional[float] = None, status: Optional[str] = None, config: RunnableConfig = None) -> str:
    """Update an existing goal record."""
    payload = {}
    if goal_type:
        payload["goal_type"] = goal_type.upper()
    if target_value is not None:
        payload["target_value"] = target_value
    if current_value is not None:
        payload["current_value"] = current_value
    if status:
        payload["status"] = status.upper()
        
    result = await _api_call("PUT", f"/api/goals/{record_id}", payload, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully updated goal record {record_id}."

@tool(args_schema=RecordIdInput)
async def delete_goal(record_id: int, config: RunnableConfig = None) -> str:
    """Delete a goal entry by ID."""
    result = await _api_call("DELETE", f"/api/goals/{record_id}", None, config)
    if "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    return f"Successfully deleted goal record {record_id}."

@tool
async def get_goals(config: RunnableConfig = None) -> str:
    """Retrieve all goals and their progress details."""
    result = await _api_call("GET", "/api/goals", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    if not result:
        return "No goals found."
    
    lines = ["Here are your active and past goals:"]
    for item in result:
        g_type = item.get("goal_type") or item.get("goalType") or "Goal"
        target = item.get("target_value") or item.get("targetValue") or 0.0
        curr = item.get("current_value") or item.get("currentValue") or 0.0
        status = item.get("status") or "ACTIVE"
        lines.append(f"- ID: {item.get('id')} | Goal: {g_type} | Target: {target} | Current: {curr} | Status: {status}")
    return "\n".join(lines)


@tool
async def generate_weekly_summary(config: RunnableConfig = None) -> str:
    """Generate a weekly statistics summary of the user's logged health metrics."""
    result = await _api_call("GET", "/api/reports/weekly", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
    
    # Return raw report variables for final summary compilation
    return (
        f"Weekly Report Summary Metrics:\n"
        f"- Average Sleep: {result.get('avg_sleep', 0)} hours/night\n"
        f"- Average Water Intake: {result.get('avg_water', 0)} ml/day\n"
        f"- Total Workouts Completed: {result.get('total_workouts', 0)}\n"
        f"- Net Weight Change: {result.get('weight_change', 0.0)} kg"
    )

@tool
async def generate_monthly_summary(config: RunnableConfig = None) -> str:
    """Generate a monthly statistics summary of the user's logged health metrics."""
    result = await _api_call("GET", "/api/reports/monthly", None, config)
    if isinstance(result, dict) and "success" in result and not result["success"]:
        return f"Error: {result['error']}"
        
    return (
        f"Monthly Report Summary Metrics:\n"
        f"- Average Sleep: {result.get('avg_sleep', 0)} hours/night\n"
        f"- Average Water Intake: {result.get('avg_water', 0)} ml/day\n"
        f"- Total Workouts Completed: {result.get('total_workouts', 0)}\n"
        f"- Net Weight Change: {result.get('weight_change', 0.0)} kg"
    )

@tool(args_schema=SearchMedicalInput)
async def search_medical_report(query: str, config: RunnableConfig = None) -> str:
    """
    Search the user's uploaded medical report PDF documents for the query keyword
    and retrieve relevant semantic text chunks (RAG).
    """
    user_id = config.get("configurable", {}).get("user_id") if config else None
    if not user_id:
        return "Error: User ID is missing in configuration context."
        
    chunks = await retrieve_relevant_chunks(user_id, query, top_k=4)
    if not chunks:
        return f"No medical report entries found relating to the query: '{query}'."
        
    return format_rag_context(chunks)

# List of all tools to expose to the agent
ALL_HEALTH_TOOLS = [
    create_water_log, update_water_log, delete_water_log, get_water_logs,
    create_weight_log, update_weight_log, delete_weight_log, get_weight_history,
    create_sleep_log, update_sleep_log, delete_sleep_log, get_sleep_logs,
    create_activity, update_activity, delete_activity, get_activities,
    create_goal, update_goal, delete_goal, get_goals,
    generate_weekly_summary, generate_monthly_summary,
    search_medical_report
]
