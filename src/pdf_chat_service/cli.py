import argparse
import asyncio
import json
from pathlib import Path

import httpx

from pdf_chat_service.app import combine_prompt_and_document
from pdf_chat_service.chat_client import build_chat_payload, post_chat_completion
from pdf_chat_service.config import Settings
from pdf_chat_service.document import extract_document_text


def main() -> None:
    parser = argparse.ArgumentParser(description="Send document text to chat completions.")
    parser.add_argument("document", type=Path, help="Path to a PDF, Markdown, or image file.")
    parser.add_argument("--prompt-prefix", default="", help="Text to prepend before the document content.")
    parser.add_argument("--model", default=None, help="Model name. Defaults to CHAT_MODEL.")
    parser.add_argument("--stream", action="store_true", help="Set stream=true in the request payload.")
    parser.add_argument("--show-payload", action="store_true", help="Print the outgoing JSON payload.")
    args = parser.parse_args()

    asyncio.run(run(args))


async def run(args: argparse.Namespace) -> None:
    settings = Settings()
    document_bytes = args.document.read_bytes()
    document_text, _document_type = extract_document_text(
        file_bytes=document_bytes,
        filename=args.document.name,
        content_type=None,
        max_chars=settings.max_pdf_chars,
        image_chat_url=settings.image_chat_url,
        image_chat_prompt=settings.image_chat_prompt,
        image_chat_thinking=settings.image_chat_thinking,
        timeout_seconds=settings.request_timeout_seconds,
    )
    content = combine_prompt_and_document(
        prompt_prefix=args.prompt_prefix,
        document_text=document_text,
    )
    payload = build_chat_payload(
        content,
        model=args.model or settings.chat_model,
        stream=args.stream,
    )

    if args.show_payload:
        print(json.dumps(payload, indent=2))

    try:
        completion = await post_chat_completion(
            url=settings.chat_completions_url,
            payload=payload,
            timeout_seconds=settings.request_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        raise SystemExit(f"Request failed: {exc}") from exc

    print(json.dumps(completion, indent=2))
