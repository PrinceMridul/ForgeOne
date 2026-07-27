"""Configuration via Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    agent_runtime_host: str = "0.0.0.0"
    agent_runtime_port: int = 8000
    log_level: str = "info"
    database_url: str = "postgresql://forgeone:forgeone@localhost:5432/forgeone"
    redis_url: str = "redis://localhost:6379"
    qdrant_url: str = "http://localhost:6333"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o"
    agent_max_iterations: int = 50
    agent_timeout_seconds: int = 300
    sandbox_image: str = "forgeone/sandbox:latest"
    sandbox_memory_limit: str = "512m"
    sandbox_cpu_limit: float = 1.0
    sandbox_timeout_seconds: int = 60
    sandbox_network_enabled: bool = False

settings = Settings()
