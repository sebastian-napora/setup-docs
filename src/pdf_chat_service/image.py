from __future__ import annotations

from typing import Any

import httpx


DEFAULT_IMAGE_CHAT_URL = "http://0.0.0.0:11112/v1/chat/image"
DEFAULT_IMAGE_CHAT_PROMPT = (
    "Extract all visible text from this image and describe the important facts. "
    "Return factual content only. Preserve exact wording for any readable text."
)

IMAGE_SUFFIXES = frozenset(
    {
        ".bmp",
        ".jpeg",
        ".jpg",
        ".png",
        ".tif",
        ".tiff",
        ".webp",
    }
)

IMAGE_CONTENT_TYPES = frozenset(
    {
        "image/bmp",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/webp",
    }
)


class ImageExtractionError(ValueError):
    pass


def extract_image_text(
    *,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    max_chars: int,
    image_chat_url: str = DEFAULT_IMAGE_CHAT_URL,
    image_chat_prompt: str = DEFAULT_IMAGE_CHAT_PROMPT,
    image_chat_thinking: bool = False,
    timeout_seconds: float = 120.0,
) -> str:
    if not image_chat_url.strip():
        raise ImageExtractionError("Image analysis endpoint URL cannot be empty.")

    payload = post_image_analysis(
        image_chat_url=image_chat_url,
        image_bytes=image_bytes,
        filename=filename or "image",
        content_type=content_type or "application/octet-stream",
        prompt=image_chat_prompt,
        thinking=image_chat_thinking,
        timeout_seconds=timeout_seconds,
    )
    description = payload.get("description")
    endpoint_error = payload.get("error")
    if isinstance(endpoint_error, str) and endpoint_error.strip():
        raise ImageExtractionError(
            f"Image analysis endpoint returned an error: {endpoint_error.strip()}"
        )

    if not isinstance(description, str) or not description.strip():
        raise ImageExtractionError("Image analysis endpoint did not return a description.")

    text = description.strip()
    if max_chars > 0 and len(text) > max_chars:
        return text[:max_chars].rstrip() + "\n\n[Truncated]"

    return text


def post_image_analysis(
    *,
    image_chat_url: str,
    image_bytes: bytes,
    filename: str,
    content_type: str,
    prompt: str,
    thinking: bool,
    timeout_seconds: float,
) -> dict[str, Any]:
    files = {"image": (filename, image_bytes, content_type)}
    data = {
        "prompt": prompt,
        "thinking": str(thinking).lower(),
    }

    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.post(image_chat_url, data=data, files=files)
    except httpx.HTTPError as exc:
        raise ImageExtractionError(f"Could not reach image analysis endpoint: {exc}") from exc

    if response.is_error:
        detail = response.text.strip()
        if len(detail) > 500:
            detail = detail[:500].rstrip() + "..."
        raise ImageExtractionError(
            f"Image analysis endpoint returned HTTP {response.status_code}: {detail}"
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise ImageExtractionError("Image analysis endpoint returned invalid JSON.") from exc

    if not isinstance(payload, dict):
        raise ImageExtractionError("Image analysis endpoint returned an unexpected response.")

    return payload
