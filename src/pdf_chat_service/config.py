from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    chat_completions_url: str = "http://192.168.0.80:11112/v1/chat/completions"
    chat_model: str = "RedHatAI/Qwen3.6-35B-A3B-NVFP4"
    request_timeout_seconds: float = 120.0
    max_pdf_chars: int = 120_000
    docs_dir: Path = Path("docs")
    response_dir: Path = Path("response")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
