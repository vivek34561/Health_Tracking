from groq import Groq
from app.core.config import get_settings
from typing import List, Dict, Optional

_client = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        settings = get_settings()
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def chat_completion(
    system_prompt: str,
    user_message: str,
    conversation_history: Optional[List[Dict]] = None,
    max_tokens: int = 1024
) -> str:
    """
    Send a chat completion request to Groq.
    conversation_history: list of {"role": "user"|"assistant", "content": "..."}
    """
    settings = get_settings()
    client = get_groq_client()

    messages = [{"role": "system", "content": system_prompt}]

    # Add prior conversation turns (keep last 10 for context)
    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()
