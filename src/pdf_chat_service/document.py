from pathlib import Path

from pdf_chat_service.pdf import PdfExtractionError, extract_pdf_text


class DocumentExtractionError(ValueError):
    pass


def extract_document_text(
    *,
    file_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    max_chars: int,
) -> tuple[str, str]:
    suffix = Path(filename or "").suffix.lower()

    if content_type == "application/pdf" or suffix == ".pdf":
        try:
            return extract_pdf_text(file_bytes, max_chars=max_chars), "pdf"
        except PdfExtractionError as exc:
            raise DocumentExtractionError(str(exc)) from exc

    if content_type in {None, "application/octet-stream", "text/markdown", "text/plain"} and suffix in {
        ".md",
        ".markdown",
    }:
        return extract_markdown_text(file_bytes, max_chars=max_chars), "markdown"

    raise DocumentExtractionError("Upload must be a PDF or Markdown file.")


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
