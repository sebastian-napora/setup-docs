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


def test_extract_image_document_text_uses_image_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_extract_image_text(
        *,
        image_bytes: bytes,
        filename: str | None,
        content_type: str | None,
        max_chars: int,
        image_chat_url: str,
        image_chat_prompt: str,
        image_chat_thinking: bool,
        timeout_seconds: float,
    ) -> str:
        assert image_bytes == b"image bytes"
        assert filename == "scan.png"
        assert content_type == "image/png"
        assert max_chars == 500
        assert image_chat_url == "http://image.test/analyze"
        assert image_chat_prompt == "Read image"
        assert image_chat_thinking is True
        assert timeout_seconds == 10
        return "Text from image"

    monkeypatch.setattr("pdf_chat_service.document.extract_image_text", fake_extract_image_text)

    text, document_type = extract_document_text(
        file_bytes=b"image bytes",
        filename="scan.png",
        content_type="image/png",
        max_chars=500,
        image_chat_url="http://image.test/analyze",
        image_chat_prompt="Read image",
        image_chat_thinking=True,
        timeout_seconds=10,
    )

    assert text == "Text from image"
    assert document_type == "image"


def test_extract_heic_document_text_uses_image_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_extract_image_text(
        *,
        image_bytes: bytes,
        filename: str | None,
        content_type: str | None,
        max_chars: int,
        image_chat_url: str,
        image_chat_prompt: str,
        image_chat_thinking: bool,
        timeout_seconds: float,
    ) -> str:
        assert image_bytes == b"image bytes"
        assert filename == "photo.heic"
        assert content_type == "image/heic"
        assert max_chars == 500
        return "Text from phone image"

    monkeypatch.setattr("pdf_chat_service.document.extract_image_text", fake_extract_image_text)

    text, document_type = extract_document_text(
        file_bytes=b"image bytes",
        filename="photo.heic",
        content_type="image/heic",
        max_chars=500,
        image_chat_url="http://image.test/analyze",
        image_chat_prompt="Read image",
        image_chat_thinking=False,
        timeout_seconds=10,
    )

    assert text == "Text from phone image"
    assert document_type == "image"


def test_extract_video_document_rejects_as_ai_context() -> None:
    with pytest.raises(DocumentExtractionError, match="Video files can be uploaded"):
        extract_document_text(
            file_bytes=b"video",
            filename="clip.mov",
            content_type="video/quicktime",
            max_chars=120_000,
        )


def test_extract_document_rejects_unsupported_file() -> None:
    with pytest.raises(DocumentExtractionError, match="PDF, Markdown, or image"):
        extract_document_text(
            file_bytes=b"hello",
            filename="notes.txt",
            content_type="text/plain",
            max_chars=120_000,
        )
