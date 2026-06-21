from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.services.health_data_service import fetch_health_data

router = APIRouter()


@router.get("/health-summary")
async def get_health_summary(
    authorization: Optional[str] = Header(None)
):
    """
    Return a structured health summary for the authenticated user.
    Used by the AI coach for Phase 2 standalone queries.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    jwt_token = authorization.split(" ", 1)[1]

    try:
        summary = await fetch_health_data(jwt_token)
        return {"success": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch health data: {str(e)}")
