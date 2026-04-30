from typing import Any

import httpx


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
