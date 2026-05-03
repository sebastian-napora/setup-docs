import asyncio

import httpx

from pdf_chat_service.chat_client import post_audio_transcription


def test_post_audio_transcription_sends_multipart_with_sync_client(monkeypatch) -> None:
    captured: dict[str, object] = {}
    real_client = httpx.Client

    def handle_request(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["content_type"] = request.headers["content-type"]
        captured["body"] = request.read()
        return httpx.Response(200, json={"text": "hello"}, request=request)

    def client_factory(*, timeout: float) -> httpx.Client:
        captured["timeout"] = timeout
        return real_client(timeout=timeout, transport=httpx.MockTransport(handle_request))

    monkeypatch.setattr(httpx, "Client", client_factory)

    response = asyncio.run(
        post_audio_transcription(
            url="http://transcriber.test/v1/audio/transcriptions",
            data=[("model", "whisper-1")],
            files=[("file", ("recording.webm", b"audio bytes", "audio/webm"))],
            timeout_seconds=12.0,
        )
    )

    assert response.json() == {"text": "hello"}
    assert captured["timeout"] == 12.0
    assert captured["url"] == "http://transcriber.test/v1/audio/transcriptions"
    assert str(captured["content_type"]).startswith("multipart/form-data; boundary=")
    body = captured["body"]
    assert isinstance(body, bytes)
    assert b'name="model"\r\n\r\nwhisper-1' in body
    assert b'name="file"; filename="recording.webm"' in body
    assert b"Content-Type: audio/webm" in body
    assert b"audio bytes" in body
