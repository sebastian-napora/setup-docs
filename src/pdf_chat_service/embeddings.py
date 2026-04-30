from __future__ import annotations

from dataclasses import dataclass
import json
import mimetypes
from pathlib import Path
from typing import Any

import httpx

from pdf_chat_service.docs_library import resolve_library_document


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
    timeout_seconds: float,
) -> LibraryDocumentEmbeddingResult:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    file_bytes = document.path.read_bytes()
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
        metadata=metadata,
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
    metadata: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    if not ingest_url.strip():
        raise EmbeddingError("Local RAG ingest URL cannot be empty.")
    if not file_bytes:
        raise EmbeddingError("Cannot ingest an empty document.")

    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    metadata_json = json.dumps(metadata, ensure_ascii=False)
    attempts = [
        {
            "data": {
                "document_id": metadata["file_id"],
                "file_id": metadata["file_id"],
                "metadata": metadata_json,
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
            },
        },
        {
            "json": {
                "paths": [metadata["source_path"]],
                "metadata": metadata,
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
