from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.services.intent_service import classify_intent, get_system_prompt, Intent
from app.services.health_data_service import fetch_health_data, format_summary_for_prompt
from app.services.rag_service import retrieve_relevant_chunks, format_rag_context, has_reports
from app.services.groq_service import chat_completion

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    user_id: Optional[int] = None  # For RAG collection lookup


class ChatResponse(BaseModel):
    reply: str
    intent: str
    sources_used: List[str]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Unified AI Health Assistant endpoint.
    Automatically routes to health data, RAG, or combined based on message intent.
    """
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Extract JWT token
    jwt_token = None
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ", 1)[1]

    user_id = request.user_id or 0

    # 1. Classify intent
    intent, confidence = classify_intent(message)

    # Check if user has uploaded reports (influences routing)
    user_has_reports = has_reports(user_id)
    if not user_has_reports and intent in (Intent.RAG, Intent.COMBINED):
        if intent == Intent.COMBINED:
            intent = Intent.HEALTH_DATA
        else:
            # No reports uploaded — give helpful guidance
            return ChatResponse(
                reply=(
                    "I don't have any medical reports uploaded for you yet. "
                    "You can upload your blood reports, prescriptions, or lab results using the 📎 upload button below, "
                    "and I'll be able to answer questions about them!\n\n"
                    "In the meantime, I can help you with questions about your tracked health data — "
                    "sleep, water intake, weight, activities, and goals."
                ),
                intent=intent.value,
                sources_used=[]
            )

    # 2. Build context based on intent
    context_parts = []
    sources_used = []

    # Health data path
    if intent in (Intent.HEALTH_DATA, Intent.COMBINED):
        if jwt_token:
            try:
                health_summary = await fetch_health_data(jwt_token)
                health_context = format_summary_for_prompt(health_summary)
                context_parts.append(health_context)
                sources_used.append("health_data")
            except Exception as e:
                print(f"Health data fetch error: {e}")
                # Fall through gracefully
        else:
            sources_used.append("health_data")

    # RAG path
    if intent in (Intent.RAG, Intent.COMBINED) and user_has_reports:
        try:
            chunks = await retrieve_relevant_chunks(user_id, message, top_k=5)
            if chunks:
                rag_context = format_rag_context(chunks)
                context_parts.append(rag_context)
                sources_used.append("medical_reports")
        except Exception as e:
            print(f"RAG retrieval error: {e}")

    # 3. Build final prompt
    full_context = "\n\n".join(context_parts)
    if full_context:
        user_prompt = f"{full_context}\n\nUser question: {message}"
    else:
        user_prompt = message

    # 4. Get system prompt
    system_prompt = get_system_prompt(intent, user_has_reports)

    # 5. Build conversation history for Groq
    history = []
    if request.conversation_history:
        for msg in request.conversation_history:
            history.append({"role": msg.role, "content": msg.content})

    # 6. Call Groq LLM
    try:
        reply = chat_completion(
            system_prompt=system_prompt,
            user_message=user_prompt,
            conversation_history=history,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    return ChatResponse(
        reply=reply,
        intent=intent.value,
        sources_used=sources_used,
    )
