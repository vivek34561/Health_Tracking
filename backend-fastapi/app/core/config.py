import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    groq_api_key: str = ""
    hf_token: str = ""
    tavily_api_key: str = ""
    langchain_api_key: str = ""
    express_api_url: str = "http://localhost:5000"
    chroma_persist_dir: str = "./chroma_db"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    groq_model: str = "openai/gpt-oss-20b"
    max_tokens: int = 1024
    chunk_size: int = 800
    chunk_overlap: int = 100

    class Config:
        env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

