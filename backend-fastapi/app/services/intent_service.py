import json
from enum import Enum
from typing import Tuple, List, Dict
from app.services.groq_service import get_groq_client
from app.core.config import get_settings

class Intent(str, Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    ANALYTICS = "ANALYTICS"
    RAG = "RAG"
    HYBRID = "HYBRID"

def classify_intent(message: str) -> Tuple[Intent, float]:
    """
    Classify the user's message intent into one of the 7 categories:
    CREATE, READ, UPDATE, DELETE, ANALYTICS, RAG, HYBRID.
    Uses Groq JSON mode for structured classification, falling back to keywords if needed.
    """
    client = get_groq_client()
    settings = get_settings()
    
    system_prompt = (
        "You are an expert intent classifier for a health tracking assistant.\n"
        "Classify the user's input message into exactly one of the following intents:\n"
        "- CREATE: Logging or recording new health metrics (e.g. water, weight, sleep, activity, goals).\n"
        "- READ: Fetching, viewing, or querying history of logged metrics (e.g. 'how much water did I drink', 'show my sleep history').\n"
        "- UPDATE: Editing, modifying, or changing existing logs or goals (e.g. 'update weight to 74kg', 'change yesterday's sleep').\n"
        "- DELETE: Deleting or removing logs, records, or goals (e.g. 'delete today's water log').\n"
        "- ANALYTICS: Asking for summaries, averages, trends, comparisons, or recommendations over time based on logs (e.g. 'How was my sleep last week?', 'Am I reaching my goals?', 'How has my weight changed?').\n"
        "- RAG: Asking about uploaded medical report content (e.g. 'Summarize my blood report', 'What does cholesterol mean?').\n"
        "- HYBRID: Combining both medical report RAG and health metrics analysis (e.g. 'Based on my blood report and sleep history, what should I improve?', 'Compare my health data with my medical report').\n\n"
        "Return ONLY a valid JSON object with keys:\n"
        '{"intent": "ONE_OF_THE_SEVEN_STRINGS", "confidence": float}'
    )
    
    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        res_text = response.choices[0].message.content.strip()
        data = json.loads(res_text)
        intent_str = data.get("intent", "").upper()
        confidence = float(data.get("confidence", 1.0))
        
        # Verify it matches one of the values
        if intent_str in [i.value for i in Intent]:
            return Intent(intent_str), confidence
    except Exception as e:
        print(f"Error classifying intent via Groq: {e}")
        
    # Fallback to rules if Groq fails
    msg_lower = message.lower()
    if any(kw in msg_lower for kw in ["delete", "remove", "discard", "clear record", "cancel goal"]):
        return Intent.DELETE, 0.8
    if any(kw in msg_lower for kw in ["update", "change", "modify", "edit"]):
        return Intent.UPDATE, 0.8
    if any(kw in msg_lower for kw in ["log", "add", "record", "create", "set a goal"]):
        return Intent.CREATE, 0.8
    if any(kw in msg_lower for kw in ["report", "blood", "cholesterol", "lab", "pdf", "medical", "test"]):
        if any(kw2 in msg_lower for kw2 in ["sleep", "weight", "water", "activity"]):
            return Intent.HYBRID, 0.8
        return Intent.RAG, 0.8
    if any(kw in msg_lower for kw in ["how has", "trend", "improve", "average", "summary", "weekly", "monthly", "analytics"]):
        return Intent.ANALYTICS, 0.8
    if any(kw in msg_lower for kw in ["how much", "show", "history", "what is my", "get"]):
        return Intent.READ, 0.7
        
    return Intent.READ, 0.5


def get_system_prompt(intent: Intent, has_rag_data: bool = False) -> str:
    """Return the appropriate system prompt based on intent."""
    
    base_persona = (
        "You are HealthAI, a knowledgeable and empathetic AI health assistant. "
        "You provide personalized, evidence-based health insights in a friendly, encouraging tone. "
        "Always be supportive and constructive. Never provide medical diagnoses. "
        "If something needs medical attention, recommend consulting a healthcare professional. "
        "Format responses clearly with bullet points where appropriate. Keep responses concise (under 200 words). "
    )

    if intent in (Intent.READ, Intent.ANALYTICS):
        return base_persona + (
            "You have access to the user's health tracking data. "
            "Use this data to give specific, personalized insights about their sleep, water intake, "
            "weight, physical activity, and goal progress. "
            "Be specific — mention actual numbers from their data."
        )

    elif intent == Intent.RAG:
        return base_persona + (
            "You have access to excerpts from the user's uploaded medical reports. "
            "Use these excerpts to answer their questions. "
            "Explain medical terms in simple, easy-to-understand language. "
            "Always remind the user that they should discuss results with their doctor for proper medical advice."
        )

    elif intent == Intent.HYBRID:
        return base_persona + (
            "You have access to both the user's health tracking data AND excerpts from their medical reports. "
            "Synthesize insights from both sources to provide comprehensive, personalized recommendations. "
            "Explain how their tracked health habits relate to their medical report findings."
        )

    else:
        return base_persona + (
            "Answer the user's health-related questions based on general health knowledge. "
            "Encourage them to track their health data for more personalized insights."
        )
