import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "NutriAI - AI-Powered Indian Food Nutrition Checker"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "nutriai"

    # JWT Authentication
    JWT_SECRET_KEY: str = "nutriai-super-secret-jwt-key-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Qdrant Vector Store
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "nutriai_knowledge"

    # Embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM & Fine-tuning
    BASE_MODEL_NAME: str = "Qwen/Qwen2.5-0.5B-Instruct"
    LORA_ADAPTER_PATH: str = "artifacts/lora_adapter"
    QLORA_ADAPTER_PATH: str = "artifacts/qlora_adapter"

    # Groq API
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen-2.5-32b"
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    LLM_TIMEOUT_SECONDS: float = 30.0

    # Device & Model
    MODEL_DEVICE: str = "auto"
    MODEL_QUANTIZATION: str = "none"

    # Paths
    KNOWLEDGE_BASE_PATH: str = "knowledge_base"
    ARTIFACTS_DIR: str = "artifacts"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
