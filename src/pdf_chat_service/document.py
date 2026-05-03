from pathlib import Path

from pdf_chat_service.image import (
    DEFAULT_IMAGE_CHAT_PROMPT,
    DEFAULT_IMAGE_CHAT_URL,
    IMAGE_CONTENT_TYPES,
    IMAGE_SUFFIXES,
    ImageExtractionError,
    extract_image_text,
)
from pdf_chat_service.pdf import PdfExtractionError, extract_pdf_text
from pdf_chat_service.video import VIDEO_CONTENT_TYPES, VIDEO_SUFFIXES


class DocumentExtractionError(ValueError):
    pass


def extract_document_text(
    *,
    file_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    max_chars: int,
    image_chat_url: str = DEFAULT_IMAGE_CHAT_URL,
    image_chat_prompt: str = DEFAULT_IMAGE_CHAT_PROMPT,
    image_chat_thinking: bool = False,
    timeout_seconds: float = 120.0,
) -> tuple[str, str]:
    suffix = Path(filename or "").suffix.lower()
    normalized_content_type = (content_type or "").split(";", maxsplit=1)[0].strip().lower()

    if normalized_content_type == "application/pdf" or suffix == ".pdf":
        try:
            return extract_pdf_text(file_bytes, max_chars=max_chars), "pdf"
        except PdfExtractionError as exc:
            raise DocumentExtractionError(str(exc)) from exc

    markdown_content_types = {"", "application/octet-stream", "text/markdown", "text/plain"}
    if normalized_content_type in markdown_content_types and suffix in {".md", ".markdown"}:
        return extract_markdown_text(file_bytes, max_chars=max_chars), "markdown"

    if normalized_content_type in IMAGE_CONTENT_TYPES or suffix in IMAGE_SUFFIXES:
        try:
            return (
                extract_image_text(
                    image_bytes=file_bytes,
                    filename=filename,
                    content_type=normalized_content_type,
                    max_chars=max_chars,
                    image_chat_url=image_chat_url,
                    image_chat_prompt=image_chat_prompt,
                    image_chat_thinking=image_chat_thinking,
                    timeout_seconds=timeout_seconds,
                ),
                "image",
            )
        except ImageExtractionError as exc:
            raise DocumentExtractionError(str(exc)) from exc

    if normalized_content_type in VIDEO_CONTENT_TYPES or suffix in VIDEO_SUFFIXES:
        raise DocumentExtractionError(
            "Video files can be uploaded and organized, but cannot be used as AI text context."
        )

    raise DocumentExtractionError("Upload must be a PDF, Markdown, or image file.")


def extract_markdown_text(markdown_bytes: bytes, max_chars: int) -> str:
    try:
        text = markdown_bytes.decode("utf-8-sig").strip()
    except UnicodeDecodeError as exc:
        raise DocumentExtractionError("Markdown file must be UTF-8 encoded.") from exc

    if not text:
        raise DocumentExtractionError("Markdown file is empty.")

    if max_chars > 0 and len(text) > max_chars:
        return text[:max_chars].rstrip() + "\n\n[Truncated]"

    return text
