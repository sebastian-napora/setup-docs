from __future__ import annotations

from dataclasses import dataclass
import json
import mimetypes
from pathlib import Path
from typing import Any

import httpx

from pdf_chat_service.docs_library import extract_library_document, resolve_library_document


class EmbeddingError(ValueError):
    pass


@dataclass(frozen=True)
class LibraryDocumentEmbeddingResult:
    file_id: str
    name: str
    document_type: str
    database_path: Path
    ingest_response: dict[str, Any]


async def create_library_document_embeddings(
    *,
    docs_dir: Path,
    document_id: str,
    local_rag_ingest_url: str,
    rag_database_path: Path,
    max_chars: int,
    image_chat_url: str,
    image_chat_prompt: str,
    image_chat_thinking: bool,
    timeout_seconds: float,
) -> LibraryDocumentEmbeddingResult:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    file_bytes = document.path.read_bytes()
    extracted_document = extract_library_document(
        docs_dir=docs_dir,
        document_id=document_id,
        max_chars=max_chars,
        image_chat_url=image_chat_url,
        image_chat_prompt=image_chat_prompt,
        image_chat_thinking=image_chat_thinking,
        timeout_seconds=timeout_seconds,
    )
    metadata = {
        "file_id": document.id,
        "name": document.name,
        "document_type": document.document_type,
        "source_path": str(document.path),
    }
    ingest_response = await post_local_rag_ingest(
        ingest_url=local_rag_ingest_url,
        filename=document.name,
        file_bytes=file_bytes,
        text=extracted_document.text,
        metadata=metadata,
        database_path=rag_database_path,
        timeout_seconds=timeout_seconds,
    )

    return LibraryDocumentEmbeddingResult(
        file_id=document.id,
        name=document.name,
        document_type=document.document_type,
        database_path=rag_database_path,
        ingest_response=ingest_response,
    )


async def post_local_rag_ingest(
    *,
    ingest_url: str,
    filename: str,
    file_bytes: bytes,
    text: str,
    metadata: dict[str, Any],
    database_path: Path,
    timeout_seconds: float,
) -> dict[str, Any]:
    if not ingest_url.strip():
        raise EmbeddingError("Local RAG ingest URL cannot be empty.")
    if not file_bytes:
        raise EmbeddingError("Cannot ingest an empty document.")
    if not text.strip():
        raise EmbeddingError("Cannot ingest a document without extracted text.")

    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    metadata_json = json.dumps(metadata, ensure_ascii=False)
    attempts = [
        {
            "json": {
                "text": text,
                "source": metadata["file_id"],
                "collection": "default",
            },
        },
        {
            "json": {
                "text": text,
                "source": metadata["file_id"],
                "collection": "default",
                "metadata": metadata,
                "database_path": str(database_path),
            },
        },
        {
            "data": {
                "document_id": metadata["file_id"],
                "file_id": metadata["file_id"],
                "metadata": metadata_json,
                "database_path": str(database_path),
            },
            "files": [
                (
                    "files",
                    (filename, file_bytes, content_type),
                )
            ],
        },
        {
            "data": {
                "document_id": metadata["file_id"],
                "file_id": metadata["file_id"],
                "metadata": metadata_json,
                "database_path": str(database_path),
            },
            "files": {
                "file": (filename, file_bytes, content_type),
            },
        },
        {
            "json": {
                "path": metadata["source_path"],
                "document_id": metadata["file_id"],
                "metadata": metadata,
                "database_path": str(database_path),
            },
        },
        {
            "json": {
                "paths": [metadata["source_path"]],
                "metadata": metadata,
                "database_path": str(database_path),
            },
        },
    ]

    last_status_error: httpx.HTTPStatusError | None = None
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for request_kwargs in attempts:
            response = await client.post(ingest_url, **request_kwargs)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                if response.status_code not in {400, 415, 422}:
                    raise
                last_status_error = exc
                continue
            return read_json_response(response)

    if last_status_error is not None:
        raise last_status_error
    raise EmbeddingError("Local RAG ingest did not return a response.")


async def post_local_rag_query(
    *,
    query_url: str,
    prompt: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    if not query_url.strip():
        raise EmbeddingError("Local RAG query URL cannot be empty.")
    if not prompt.strip():
        raise EmbeddingError("Local RAG query prompt cannot be empty.")

    messages = [
        {
            "role": "user",
            "content": prompt,
        }
    ]
    attempts = [
        {
            "messages": messages,
            "collection": "default",
        },
        {
            "messages": messages,
        },
    ]
    last_status_error: httpx.HTTPStatusError | None = None
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for payload in attempts:
            response = await client.post(query_url, json=payload)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                if response.status_code not in {400, 415, 422}:
                    raise
                last_status_error = exc
                continue
            return read_json_response(response)

    if last_status_error is not None:
        raise last_status_error
    raise EmbeddingError("Local RAG query did not return a response.")


def read_json_response(response: httpx.Response) -> dict[str, Any]:
    if not response.content:
        return {}
    try:
        response_data = response.json()
    except ValueError:
        return {"response": response.text}
    if isinstance(response_data, dict):
        return response_data
    return {"response": response_data}
