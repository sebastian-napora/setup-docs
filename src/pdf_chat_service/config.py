from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict

from pdf_chat_service.image import DEFAULT_IMAGE_CHAT_PROMPT, DEFAULT_IMAGE_CHAT_URL

LOCAL_RAG_INGEST_PATH = "/local_rag/ingest"
LOCAL_RAG_SEARCH_PATH = "/local_rag/search"
LOCAL_RAG_QUERY_PATH = "/local_rag/query"
AUDIO_TRANSCRIPTIONS_PATH = "/v1/audio/transcriptions"
AUDIO_TRANSCRIPTIONS_PORT = 11114


class Settings(BaseSettings):
    chat_completions_url: str = "http://0.0.0.0:11112/v1/chat/completions"
    chat_model: str = "RedHatAI/Qwen3.6-35B-A3B-NVFP4"
    request_timeout_seconds: float = 120.0
    max_pdf_chars: int = 120_000
    image_chat_url: str = DEFAULT_IMAGE_CHAT_URL
    image_chat_prompt: str = DEFAULT_IMAGE_CHAT_PROMPT
    image_chat_thinking: bool = False
    local_rag_ingest_url: str | None = None
    local_rag_search_url: str | None = None
    local_rag_query_url: str | None = None
    rag_database_path: Path = Path("rag_data/rag.sqlite3")
    embeddings_url: str = "http://0.0.0.0:11112/v1/embeddings"
    embeddings_model: str = "text-embedding-3-small"
    audio_transcriptions_url: str | None = None
    compress_url: str = "http://0.0.0.0:11112/compress"
    docs_dir: Path = Path("docs")
    docs_archive_dir: Path = Path("docs_archive")
    embeddings_dir: Path = Path("embeddings")
    response_dir: Path = Path("response")
    source_search_max_matches: int = 8
    source_search_chunk_chars: int = 1_200
    source_search_chunk_overlap: int = 160
    embeddings_chunk_chars: int = 1_200
    embeddings_chunk_overlap: int = 160

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def resolved_local_rag_ingest_url(self) -> str:
        if self.local_rag_ingest_url and self.local_rag_ingest_url.strip():
            return self.local_rag_ingest_url.strip()
        return derive_service_url(
            url=self.chat_completions_url,
            path=LOCAL_RAG_INGEST_PATH,
        )

    def resolved_local_rag_search_url(self) -> str:
        if self.local_rag_search_url and self.local_rag_search_url.strip():
            return self.local_rag_search_url.strip()
        return derive_service_url(
            url=self.chat_completions_url,
            path=LOCAL_RAG_SEARCH_PATH,
        )

    def resolved_local_rag_query_url(self) -> str:
        if self.local_rag_query_url and self.local_rag_query_url.strip():
            return self.local_rag_query_url.strip()
        return derive_service_url(
            url=self.chat_completions_url,
            path=LOCAL_RAG_QUERY_PATH,
        )

    def resolved_audio_transcriptions_url(self) -> str:
        if self.audio_transcriptions_url and self.audio_transcriptions_url.strip():
            return self.audio_transcriptions_url.strip()
        return derive_service_url(
            url=self.chat_completions_url,
            path=AUDIO_TRANSCRIPTIONS_PATH,
            port=AUDIO_TRANSCRIPTIONS_PORT,
        )


def derive_service_url(*, url: str, path: str, port: int | None = None) -> str:
    parsed = urlsplit(url)
    target_port = 11112 if port is None else port
    if not parsed.scheme or not parsed.netloc:
        return f"http://127.0.0.1:{target_port}{path}"

    netloc = parsed.netloc
    if port is not None or parsed.hostname == "0.0.0.0":
        hostname = "127.0.0.1" if parsed.hostname == "0.0.0.0" else parsed.hostname
        if hostname is None:
            hostname = parsed.netloc
        elif ":" in hostname and not hostname.startswith("["):
            hostname = f"[{hostname}]"
        resolved_port = port if port is not None else parsed.port
        netloc = f"{hostname}:{resolved_port}" if resolved_port is not None else hostname

    return urlunsplit((parsed.scheme, netloc, path, "", ""))
