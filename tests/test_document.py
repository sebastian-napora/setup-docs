import pytest

from pdf_chat_service.document import DocumentExtractionError, extract_document_text


def test_extract_markdown_document_text() -> None:
    text, document_type = extract_document_text(
        file_bytes=b"# Title\n\nContent",
        filename="notes.md",
        content_type="text/markdown",
        max_chars=120_000,
    )

    assert text == "# Title\n\nContent"
    assert document_type == "markdown"


def test_extract_markdown_document_text_with_octet_stream_content_type() -> None:
    text, document_type = extract_document_text(
        file_bytes=b"# Title",
        filename="notes.markdown",
        content_type="application/octet-stream",
        max_chars=120_000,
    )

    assert text == "# Title"
    assert document_type == "markdown"


def test_extract_document_rejects_unsupported_file() -> None:
    with pytest.raises(DocumentExtractionError, match="PDF or Markdown"):
        extract_document_text(
            file_bytes=b"hello",
            filename="notes.txt",
            content_type="text/plain",
            max_chars=120_000,
        )
