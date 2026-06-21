from enum import Enum
from typing import Tuple


class Intent(str, Enum):
    HEALTH_DATA = "health_data"
    RAG = "rag"
    COMBINED = "combined"
    GENERAL = "general"


# Keywords that indicate the user is asking about their tracked health data
HEALTH_KEYWORDS = [
    "sleep", "slept", "sleeping",
    "water", "hydration", "drink", "drank",
    "weight", "weigh", "bmi", "body",
    "calorie", "calories", "burned",
    "activity", "activities", "workout", "exercise", "run", "ran",
    "goal", "goals", "progress", "target",
    "step", "steps",
    "heart rate", "heartrate",
    "dashboard", "summary", "week", "today", "yesterday", "last week", "this week",
    "how am i", "am i on track", "my health", "my fitness",
    "improve", "recommendation", "should i",
]

# Keywords that indicate the user is asking about their medical reports
RAG_KEYWORDS = [
    "report", "blood", "cholesterol", "triglyceride",
    "prescription", "medicine", "medication", "drug",
    "diagnosis", "diagnose", "test result", "lab", "laboratory",
    "sugar", "glucose", "diabetes", "insulin",
    "hemoglobin", "hba1c", "rbc", "wbc", "platelet",
    "thyroid", "tsh", "t3", "t4",
    "liver", "kidney", "creatinine", "uric acid",
    "blood pressure", "bp", "hypertension",
    "ecg", "ekg", "ultrasound", "scan", "x-ray", "xray",
    "doctor", "physician", "medical", "clinical",
    "explain", "summarize", "what does", "what is",
    "pdf", "document", "uploaded",
]


def classify_intent(message: str) -> Tuple[Intent, float]:
    """
    Classify the user's message intent.
    Returns (Intent, confidence_score).
    """
    msg_lower = message.lower()

    health_hits = sum(1 for kw in HEALTH_KEYWORDS if kw in msg_lower)
    rag_hits = sum(1 for kw in RAG_KEYWORDS if kw in msg_lower)

    has_health = health_hits > 0
    has_rag = rag_hits > 0

    if has_health and has_rag:
        return Intent.COMBINED, 0.9
    elif has_health:
        return Intent.HEALTH_DATA, min(0.5 + health_hits * 0.1, 1.0)
    elif has_rag:
        return Intent.RAG, min(0.5 + rag_hits * 0.1, 1.0)
    else:
        # Default to health data for health assistant context
        return Intent.HEALTH_DATA, 0.3


def get_system_prompt(intent: Intent, has_rag_data: bool = False) -> str:
    """Return the appropriate system prompt based on intent."""

    base_persona = (
        "You are HealthAI, a knowledgeable and empathetic AI health assistant. "
        "You provide personalized, evidence-based health insights in a friendly, encouraging tone. "
        "Always be supportive and constructive. Never provide medical diagnoses. "
        "If something needs medical attention, recommend consulting a healthcare professional. "
        "Format responses clearly with bullet points where appropriate. Keep responses concise (under 200 words). "
    )

    if intent == Intent.HEALTH_DATA:
        return base_persona + (
            "You have access to the user's health tracking data provided below. "
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

    elif intent == Intent.COMBINED:
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
