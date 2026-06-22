import os
import sys

# Ensure parent directory is in sys.path so app.* imports work when run directly from within the app folder
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, upload, health, bodyfat_predict

app = FastAPI(
    title="HealthAI — AI Service",
    description="AI Health Coach, Medical Report RAG, and Unified Assistant",
    version="1.0.0",
)

# CORS — allow Angular dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4201",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router, prefix="/api", tags=["AI Chat"])
app.include_router(upload.router, prefix="/api", tags=["Medical Reports"])
app.include_router(health.router, prefix="/api", tags=["Health Data"])
app.include_router(bodyfat_predict.router, prefix="/api", tags=["Body Fat Prediction"])


@app.get("/")
async def root():
    return {
        "service": "HealthAI — AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "POST /api/chat",
            "upload": "POST /api/upload-report",
            "health_summary": "GET /api/health-summary",
            "docs": "GET /docs",
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}
