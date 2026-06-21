from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Form
from pydantic import BaseModel
from typing import Optional
from app.services.rag_service import store_report

router = APIRouter()


class UploadResponse(BaseModel):
    success: bool
    message: str
    filename: str
    chunks_stored: int


@router.post("/upload-report", response_model=UploadResponse)
async def upload_report(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    authorization: Optional[str] = Header(None)
):
    """
    Upload a medical report PDF. The PDF is chunked, embedded with HuggingFace
    sentence-transformers, and stored in ChromaDB under the user's collection.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a .pdf file."
        )

    # Read file bytes
    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Max 10MB
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    try:
        chunks_count = await store_report(user_id, file.filename, pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    if chunks_count == 0:
        return UploadResponse(
            success=False,
            message="Could not extract text from the PDF. It may be image-based or encrypted.",
            filename=file.filename,
            chunks_stored=0,
        )

    return UploadResponse(
        success=True,
        message=f"Report '{file.filename}' processed and stored successfully.",
        filename=file.filename,
        chunks_stored=chunks_count,
    )
