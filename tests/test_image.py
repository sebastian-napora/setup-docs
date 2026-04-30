from typing import Any

import pytest

from pdf_chat_service.image import ImageExtractionError, extract_image_text


class FakeImageResponse:
    def __init__(
        self,
        *,
        payload: dict[str, Any] | None = None,
        status_code: int = 200,
        text: str = "",
    ) -> None:
        self.payload = payload or {}
        self.status_code = status_code
        self.text = text
        self.is_error = status_code >= 400

    def json(self) -> dict[str, Any]:
        return self.payload


class FakeImageClient:
    last_request: dict[str, Any] = {}
    response = FakeImageResponse(payload={"description": "Visible text from image"})

    def __init__(self, *, timeout: float) -> None:
        self.timeout = timeout

    def __enter__(self) -> "FakeImageClient":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def post(
        self,
        url: str,
        *,
        data: dict[str, str],
        files: dict[str, tuple[str, bytes, str]],
    ) -> FakeImageResponse:
        self.__class__.last_request = {
            "url": url,
            "data": data,
            "files": files,
            "timeout": self.timeout,
        }
        return self.response


def test_extract_image_text_posts_image_to_image_chat_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("pdf_chat_service.image.httpx.Client", FakeImageClient)

    text = extract_image_text(
        image_bytes=b"image bytes",
        filename="scan.png",
        content_type="image/png",
        max_chars=120_000,
        image_chat_url="http://image.test/v1/chat/image",
        image_chat_prompt="Extract text",
        image_chat_thinking=True,
        timeout_seconds=9,
    )

    assert text == "Visible text from image"
    assert FakeImageClient.last_request == {
        "url": "http://image.test/v1/chat/image",
        "data": {"prompt": "Extract text", "thinking": "true"},
        "files": {"image": ("scan.png", b"image bytes", "image/png")},
        "timeout": 9,
    }


def test_extract_image_text_requires_description(monkeypatch: pytest.MonkeyPatch) -> None:
    class EmptyDescriptionClient(FakeImageClient):
        response = FakeImageResponse(payload={"description": ""})

    monkeypatch.setattr("pdf_chat_service.image.httpx.Client", EmptyDescriptionClient)

    with pytest.raises(ImageExtractionError, match="did not return a description"):
        extract_image_text(
            image_bytes=b"image bytes",
            filename="scan.png",
            content_type="image/png",
            max_chars=120_000,
            image_chat_url="http://image.test/v1/chat/image",
            image_chat_prompt="Extract text",
            image_chat_thinking=False,
            timeout_seconds=9,
        )


def test_extract_image_text_surfaces_endpoint_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class EndpointErrorClient(FakeImageClient):
        response = FakeImageResponse(payload={"error": "At most 0 image(s) may be provided."})

    monkeypatch.setattr("pdf_chat_service.image.httpx.Client", EndpointErrorClient)

    with pytest.raises(ImageExtractionError, match="At most 0 image"):
        extract_image_text(
            image_bytes=b"image bytes",
            filename="scan.png",
            content_type="image/png",
            max_chars=120_000,
            image_chat_url="http://image.test/v1/chat/image",
            image_chat_prompt="Extract text",
            image_chat_thinking=False,
            timeout_seconds=9,
        )
