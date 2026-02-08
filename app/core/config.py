from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "LinkPet API"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://0.0.0.0:3000"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./linkpet.db"
    
    # LLM
    OPENAI_API_KEY: str = "" # Loaded from env
    OPENAI_API_BASE: str = "https://api-inference.modelscope.cn/v1"
    OPENAI_MODEL: str = "Qwen/Qwen2.5-Coder-7B-Instruct"
    OPENAI_EMBEDDING_MODEL: str = "Qwen/Qwen3-Embedding-8B"

    # Image Generation (Volcengine/Ark)
    ARK_API_KEY: str = ""
    ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    ARK_MODEL_ID: str = "doubao-seedream-4-5-251128"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
