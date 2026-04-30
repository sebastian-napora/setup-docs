from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from pdf_chat_service.image import DEFAULT_IMAGE_CHAT_PROMPT, DEFAULT_IMAGE_CHAT_URL


class Settings(BaseSettings):
    chat_completions_url: str = "http://0.0.0.0:11112/v1/chat/completions"
    chat_model: str = "RedHatAI/Qwen3.6-35B-A3B-NVFP4"
    request_timeout_seconds: float = 120.0
    max_pdf_chars: int = 120_000
    image_chat_url: str = DEFAULT_IMAGE_CHAT_URL
    image_chat_prompt: str = DEFAULT_IMAGE_CHAT_PROMPT
    image_chat_thinking: bool = False
    compress_url: str = "http://0.0.0.0:11112/compress"
    docs_dir: Path = Path("docs")
    docs_archive_dir: Path = Path("docs_archive")
    response_dir: Path = Path("response")
    source_search_max_matches: int = 8
    source_search_chunk_chars: int = 1_200
    source_search_chunk_overlap: int = 160

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
