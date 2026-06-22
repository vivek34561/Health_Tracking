# this chat.py is all about to call groq and execute the tools as well as the main entry point for the chat feature
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from app.services.intent_service import classify_intent, Intent
from app.services.agent_service import run_agent
from app.tools.health_tools import (
    delete_water_log,
    delete_weight_log,
    delete_sleep_log,
    delete_activity,
    delete_goal,
    delete_food_log
)

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ConfirmedAction(BaseModel):
    tool: str
    id: int


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    user_id: Optional[int] = None  # For vector collection lookups
    confirmed_action: Optional[ConfirmedAction] = None


class ChatResponse(BaseModel):
    reply: str
    intent: str
    sources_used: List[str]
    confirmation_required: Optional[bool] = False
    confirm_action: Optional[Dict[str, Any]] = None
    structured_data: Optional[Dict[str, Any]] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Unified AI Health Agent endpoint.
    Executes the LangGraph workflow with tool-calling capabilities.
    If confirmed_action is passed, executes the confirmed delete operation directly.
    """
    message = request.message.strip()
    if not message and not request.confirmed_action:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Extract JWT token
    jwt_token = None
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ", 1)[1]

    user_id = request.user_id or 0

    # 1. Handle confirmed delete actions immediately (bulletproof bypass)
    if request.confirmed_action:
        action = request.confirmed_action
        config = {"configurable": {"jwt_token": jwt_token, "user_id": user_id}}
        
        tool_map = {
            "delete_water_log": delete_water_log,
            "delete_weight_log": delete_weight_log,
            "delete_sleep_log": delete_sleep_log,
            "delete_activity": delete_activity,
            "delete_goal": delete_goal,
            "delete_food_log": delete_food_log
        }
        
        tool = tool_map.get(action.tool)
        if not tool:
            raise HTTPException(status_code=400, detail=f"Unsupported confirm action tool: {action.tool}")
            
        try:
            # Run the tool directly
            result = await tool.ainvoke({"record_id": action.id}, config=config)
            
            # Format entity name for structured response
            entity = action.tool.replace("delete_", "").replace("_log", "")
            if entity == "activity":
                entity = "activity"
                
            return ChatResponse(
                reply=str(result),
                intent="DELETE",
                sources_used=[],
                confirmation_required=False,
                confirm_action=None,
                structured_data={
                    "intent": "DELETE",
                    "entity": entity,
                    "id": action.id,
                    "status": "success"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")

    # 2. Classify intent
    intent, confidence = classify_intent(message)

    # 3. Format history for LangGraph run_agent
    history = []
    if request.conversation_history:
        for msg in request.conversation_history:
            history.append({"role": msg.role, "content": msg.content})

    # 4. Run LangGraph Workflow
    try:
        agent_result = await run_agent(
            message=message,
            history=history,
            user_id=user_id,
            jwt_token=jwt_token or "",
            intent=intent.value
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Agent run error: {str(e)}")

    return ChatResponse(
        reply=agent_result["reply"],
        intent=agent_result["intent"] or intent.value,
        sources_used=agent_result["sources_used"],
        confirmation_required=agent_result["confirmation_required"],
        confirm_action=agent_result["confirm_action"],
        structured_data=agent_result["structured_data"]
    )
