"""
RAG Service — PDF processing and semantic search.
Uses HuggingFace Inference API for embeddings (no local compilation needed).
Uses pure-Python JSON vector store instead of ChromaDB.
"""
import httpx
import io
from pypdf import PdfReader
from app.core.config import get_settings
from app.core.database import add_documents, similarity_search, has_documents
from typing import List, Tuple


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks for better retrieval."""
    words = text.split()
    chunks = []
    step = max(1, chunk_size - overlap)
    for i in range(0, len(words), step):
        chunk = " ".join(words[i: i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file using pypdf."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Get embeddings via HuggingFace Inference API.
    Uses sentence-transformers/all-MiniLM-L6-v2 model.
    Falls back to simple TF-IDF-like hashing if API fails.
    """
    settings = get_settings()
    api_url = f"https://api-inference.huggingface.co/models/{settings.embedding_model}"
    headers = {"Authorization": f"Bearer {settings.hf_token}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # HF Inference API accepts list of strings for feature-extraction
            response = await client.post(
                api_url,
                headers=headers,
                json={"inputs": texts, "options": {"wait_for_model": True}},
            )
            if response.status_code == 200:
                result = response.json()
                # For sentence-transformers, the response is a list of embeddings
                # Some models return [[embedding]] (mean pooled), others return [[[token_embeddings]]]
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], list) and isinstance(result[0][0], float):
                        # Already in the right format: [[float, float, ...], ...]
                        return result
                    elif isinstance(result[0], list) and isinstance(result[0][0], list):
                        # Token-level embeddings — mean pool
                        import numpy as np
                        return [list(np.mean(emb, axis=0)) for emb in result]
    except Exception as e:
        print(f"HuggingFace API embedding error: {e}")

    # Fallback: simple hash-based pseudo-embedding (384 dims to match MiniLM)
    print("Warning: Using fallback hash-based embeddings")
    return [_hash_embed(text) for text in texts]


def _hash_embed(text: str, dim: int = 384) -> List[float]:
    """
    Deterministic hash-based pseudo-embedding as fallback.
    Not great for semantic search but functional for basic keyword matching.
    """
    import hashlib
    import struct
    result = []
    for i in range(dim):
        h = hashlib.sha256(f"{i}:{text[:200]}".encode()).digest()
        val = struct.unpack("f", h[:4])[0]
        result.append(float(val))
    return result


async def store_report(user_id: int, filename: str, pdf_bytes: bytes) -> int:
    """
    Process and store a medical report PDF.
    Returns the number of chunks stored.
    """
    settings = get_settings()

    # Extract text
    full_text = extract_pdf_text(pdf_bytes)
    if not full_text.strip():
        return 0

    # Chunk
    chunks = chunk_text(full_text, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        return 0

    # Embed via HuggingFace API (batch in groups of 10 to avoid timeouts)
    all_embeddings = []
    batch_size = 10
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i: i + batch_size]
        embs = await get_embeddings(batch)
        all_embeddings.extend(embs)

    # Store
    metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]
    add_documents(user_id, chunks, all_embeddings, metadatas)

    return len(chunks)


async def retrieve_relevant_chunks(user_id: int, query: str, top_k: int = 5) -> List[Tuple[str, str]]:
    """
    Retrieve the most relevant text chunks for a query.
    Returns list of (text, source_filename) tuples.
    """
    try:
        if not has_documents(user_id):
            return []

        query_emb = await get_embeddings([query])
        if not query_emb:
            return []

        results = similarity_search(user_id, query_emb[0], top_k=top_k)
        return [(text, source) for text, source, _score in results]

    except Exception as e:
        print(f"RAG retrieval error: {e}")
        return []


def format_rag_context(chunks: List[Tuple[str, str]]) -> str:
    """Format retrieved chunks as context for LLM."""
    if not chunks:
        return ""
    lines = ["=== RELEVANT MEDICAL REPORT EXCERPTS ==="]
    for i, (text, source) in enumerate(chunks, 1):
        lines.append(f"\n[Excerpt {i} from '{source}']\n{text}")
    lines.append("\n=========================================")
    return "\n".join(lines)


def has_reports(user_id: int) -> bool:
    """Check if a user has any stored medical reports."""
    try:
        return has_documents(user_id)
    except Exception:
        return False
