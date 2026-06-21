"""
Pure-Python vector store using JSON files for persistence.
Replaces ChromaDB since it doesn't support Python 3.14 yet.
Uses cosine similarity via numpy.
"""
import json
import os
import numpy as np
from typing import List, Tuple, Dict, Any
from app.core.config import get_settings


def _get_store_path(user_id: int) -> str:
    settings = get_settings()
    store_dir = settings.chroma_persist_dir
    os.makedirs(store_dir, exist_ok=True)
    return os.path.join(store_dir, f"user_{user_id}_vectors.json")


def _load_store(user_id: int) -> List[Dict[str, Any]]:
    path = _get_store_path(user_id)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_store(user_id: int, entries: List[Dict[str, Any]]) -> None:
    path = _get_store_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)


def add_documents(user_id: int, texts: List[str], embeddings: List[List[float]], metadatas: List[Dict]) -> None:
    """Add document chunks with their embeddings to the user's vector store."""
    entries = _load_store(user_id)
    for text, emb, meta in zip(texts, embeddings, metadatas):
        entries.append({
            "text": text,
            "embedding": emb,
            "metadata": meta,
        })
    _save_store(user_id, entries)


def similarity_search(user_id: int, query_embedding: List[float], top_k: int = 5) -> List[Tuple[str, str, float]]:
    """
    Find the most similar chunks to the query embedding.
    Returns list of (text, source_filename, score).
    """
    entries = _load_store(user_id)
    if not entries:
        return []

    q = np.array(query_embedding, dtype=np.float32)
    q_norm = q / (np.linalg.norm(q) + 1e-10)

    scored = []
    for entry in entries:
        emb = np.array(entry["embedding"], dtype=np.float32)
        emb_norm = emb / (np.linalg.norm(emb) + 1e-10)
        score = float(np.dot(q_norm, emb_norm))
        scored.append((entry["text"], entry["metadata"].get("source", "Unknown"), score))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:top_k]


def has_documents(user_id: int) -> bool:
    """Check if a user has any stored documents."""
    return len(_load_store(user_id)) > 0


def get_user_collection(user_id: int):
    """Compatibility shim — returns a simple wrapper object."""
    return {"user_id": user_id}
