import asyncio
from typing import Any

import httpx

MultipartData = list[tuple[str, str]]
MultipartFiles = list[tuple[str, tuple[str, bytes, str]]]
MultipartUpload = list[tuple[str, tuple[None, str] | tuple[str, bytes, str]]]


def build_chat_payload(
    content: str,
    *,
    model: str,
    stream: bool = False,
    role: str = "user",
) -> dict[str, Any]:
    return {
        "messages": [{"content": content, "role": role}],
        "stream": stream,
        "model": model,
    }


async def post_chat_completion(
    *,
    url: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def post_audio_transcription(
    *,
    url: str,
    data: MultipartData,
    files: MultipartFiles,
    timeout_seconds: float,
) -> httpx.Response:
    return await asyncio.to_thread(
        post_audio_transcription_sync,
        url=url,
        data=data,
        files=files,
        timeout_seconds=timeout_seconds,
    )


def post_audio_transcription_sync(
    *,
    url: str,
    data: MultipartData,
    files: MultipartFiles,
    timeout_seconds: float,
) -> httpx.Response:
    with httpx.Client(timeout=timeout_seconds) as client:
        response = client.post(
            url,
            files=build_multipart_upload(data=data, files=files),
        )
        response.raise_for_status()
        return response


def build_multipart_upload(*, data: MultipartData, files: MultipartFiles) -> MultipartUpload:
    return [(key, (None, value)) for key, value in data] + files
