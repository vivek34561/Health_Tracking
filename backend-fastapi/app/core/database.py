"""
Pinecone vector store for RAG service.
Replaces the previous JSON-based ChromaDB alternative.
Uses pinecone-client for vector storage and cosine similarity.
"""
import pinecone
import numpy as np
from typing import List, Tuple, Dict, Any
from app.core.config import get_settings

# Global index object to avoid re-initializing on each call
_index = None


def _init_pinecone():
    """Initialize Pinecone client and return the index."""
    global _index
    if _index is not None:
        return _index
    settings = get_settings()
    # Initialize Pinecone
    pc = pinecone.Pinecone(api_key=settings.pinecone_api_key, environment=settings.pinecone_environment)
    index_name = settings.pinecone_index_name
    # Check if index exists; if not, create it
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    if index_name not in existing_indexes:
        # Create index with dimension matching embedding model (384 for all-MiniLM-L6-v2)
        pc.create_index(
            name=index_name,
            dimension=384,
            metric="cosine"
        )
    _index = pc.Index(index_name)
    return _index


def add_documents(user_id: int, texts: List[str], embeddings: List[List[float]], metadatas: List[Dict]) -> None:
    """Add document chunks with their embeddings to the user's vector namespace."""
    index = _init_pinecone()
    vectors = []
    namespace = str(user_id)
    for idx, (text, embedding, meta) in enumerate(zip(texts, embeddings, metadatas)):
        # Create a unique vector ID
        vector_id = f"{user_id}-{meta.get('source', 'unknown')}-{idx}"
        # Ensure metadata includes text and source for retrieval
        payload = {
            "text": text,
            "source": meta.get("source", "unknown"),
            "user_id": user_id
        }
        vectors.append((vector_id, embedding, payload))
    if vectors:
        index.upsert(vectors=vectors, namespace=namespace)


def similarity_search(user_id: int, query_embedding: List[float], top_k: int = 5) -> List[Tuple[str, str, float]]:
    """
    Find the most similar chunks to the query embedding.
    Returns list of (text, source_filename, score).
    """
    index = _init_pinecone()
    namespace = str(user_id)
    # Query the index
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace
    )
    matches = results.get('matches', [])
    output: List[Tuple[str, str, float]] = []
    for match in matches:
        metadata = match.get('metadata', {})
        text = metadata.get('text', '')
        source = metadata.get('source', 'Unknown')
        score = float(match.get('score', 0.0))
        output.append((text, source, score))
    return output


def has_documents(user_id: int) -> bool:
    """Check if a user has any stored documents in their namespace."""
    index = _init_pinecone()
    namespace = str(user_id)
    try:
        # Describe index stats to get vector count for the namespace
        stats = index.describe_index_stats()
        namespaces = stats.get('namespaces', {})
        ns_stats = namespaces.get(namespace, {})
        vector_count = ns_stats.get('vector_count', 0)
        return vector_count > 0
    except Exception:
        # If any error occurs, assume no documents
        return False


def get_user_collection(user_id: int):
    """Compatibility shim — returns a simple dict."""
    return {"user_id": user_id}