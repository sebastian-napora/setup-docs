from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pdf_chat_service.chat_client import build_chat_payload, post_chat_completion
from pdf_chat_service.config import Settings
from pdf_chat_service.document import DocumentExtractionError, extract_document_text
from pdf_chat_service.docs_library import (
    DocumentLibraryError,
    LibraryDocument,
    archive_library_document,
    build_docs_chat_prompt,
    delete_archived_library_document,
    extract_library_document,
    list_library_documents,
    save_library_upload,
    validate_library_upload,
)
from pdf_chat_service.history import (
    ChatHistoryError,
    clear_docs_chat_history,
    delete_docs_chat_history,
    list_docs_chat_history,
    load_docs_chat_history,
    save_docs_chat_history,
)
from pdf_chat_service.response_writer import render_choices_markdown, save_completion_choices_markdown

app = FastAPI(title="Document Chat Completions")
settings = Settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DocsChatRequest(BaseModel):
    files: list[str] = Field(..., min_length=1)
    prompt: str = Field(..., min_length=1)
    stream: bool = False
    model: str | None = None


class DeleteArchivedDocumentRequest(BaseModel):
    confirmation: str = Field(..., min_length=1)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/docs/files")
async def list_docs_files() -> dict[str, Any]:
    try:
        documents = list_library_documents(settings.docs_dir)
    except DocumentLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "docs_dir": str(settings.docs_dir),
        "files": [library_document_payload(document) for document in documents],
    }


@app.post("/api/docs/files")
async def upload_docs_files(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    pending_uploads: list[tuple[str | None, bytes]] = []
    for file in files:
        file_bytes = await file.read()
        try:
            validate_library_upload(filename=file.filename, file_bytes=file_bytes)
        except DocumentLibraryError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        pending_uploads.append((file.filename, file_bytes))

    if not pending_uploads:
        raise HTTPException(status_code=400, detail="Select at least one file to upload.")

    try:
        documents = [
            save_library_upload(
                docs_dir=settings.docs_dir,
                filename=filename,
                file_bytes=file_bytes,
            )
            for filename, file_bytes in pending_uploads
        ]
    except DocumentLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "docs_dir": str(settings.docs_dir),
        "files": [library_document_payload(document) for document in documents],
    }


@app.get("/api/docs/archive")
async def list_docs_archive() -> dict[str, Any]:
    try:
        documents = list_library_documents(settings.docs_archive_dir)
    except DocumentLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "archive_dir": str(settings.docs_archive_dir),
        "files": [library_document_payload(document) for document in documents],
    }


@app.post("/api/docs/files/{document_id:path}/archive")
async def archive_docs_file(document_id: str) -> dict[str, Any]:
    try:
        document = archive_library_document(
            docs_dir=settings.docs_dir,
            archive_dir=settings.docs_archive_dir,
            document_id=document_id,
        )
    except DocumentLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"file": library_document_payload(document)}


@app.delete("/api/docs/archive/{document_id:path}")
async def delete_archived_docs_file(
    document_id: str,
    request: DeleteArchivedDocumentRequest,
) -> dict[str, Any]:
    try:
        document = delete_archived_library_document(
            archive_dir=settings.docs_archive_dir,
            document_id=document_id,
            confirmation=request.confirmation,
        )
    except DocumentLibraryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"deleted": 1, "file": library_document_payload(document)}


@app.get("/api/docs/history")
async def list_docs_history() -> dict[str, Any]:
    return {"items": list_docs_chat_history(response_dir=settings.response_dir)}


@app.get("/api/docs/history/{history_id}")
async def get_docs_history_item(history_id: str) -> dict[str, Any]:
    try:
        return load_docs_chat_history(response_dir=settings.response_dir, history_id=history_id)
    except ChatHistoryError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/docs/history")
async def clear_docs_history() -> dict[str, Any]:
    return {"deleted": clear_docs_chat_history(response_dir=settings.response_dir)}


@app.delete("/api/docs/history/{history_id}")
async def delete_docs_history_item(history_id: str) -> dict[str, Any]:
    try:
        delete_docs_chat_history(response_dir=settings.response_dir, history_id=history_id)
    except ChatHistoryError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"deleted": 1, "id": history_id}


@app.post("/api/docs/chat")
async def chat_with_docs(request: DocsChatRequest) -> dict[str, Any]:
    document_ids = unique_document_ids(request.files)
    if not document_ids:
        raise HTTPException(status_code=400, detail="Select at least one document.")

    try:
        documents = [
            extract_library_document(
                docs_dir=settings.docs_dir,
                document_id=document_id,
                max_chars=settings.max_pdf_chars,
                image_chat_url=settings.image_chat_url,
                image_chat_prompt=settings.image_chat_prompt,
                image_chat_thinking=settings.image_chat_thinking,
                timeout_seconds=settings.request_timeout_seconds,
            )
            for document_id in document_ids
        ]
        content = build_docs_chat_prompt(user_prompt=request.prompt, documents=documents)
    except (DocumentExtractionError, DocumentLibraryError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    payload = build_chat_payload(
        content,
        model=request.model or settings.chat_model,
        stream=request.stream,
    )

    try:
        completion = await post_chat_completion(
            url=settings.chat_completions_url,
            payload=payload,
            timeout_seconds=settings.request_timeout_seconds,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail={
                "message": "Chat completions endpoint returned an error.",
                "response": exc.response.text,
            },
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach chat completions endpoint: {exc}",
        ) from exc

    answer = render_choices_markdown(completion).strip()
    response_path = save_completion_choices_markdown(
        completion=completion,
        input_filename="docs-chat",
        response_dir=settings.response_dir,
    )
    request_info = {
        "model": payload["model"],
        "stream": payload["stream"],
        "content_chars": len(content),
        "document_chars": sum(len(document.text) for document in documents),
        "files": [
            {
                "id": document.id,
                "name": document.name,
                "document_type": document.document_type,
                "chars": len(document.text),
            }
            for document in documents
        ],
    }
    history_record = save_docs_chat_history(
        response_dir=settings.response_dir,
        prompt=request.prompt,
        answer=answer,
        request_info=request_info,
        saved_response=str(response_path),
    )

    return {
        "request": request_info,
        "answer": answer,
        "history_item": history_record,
        "saved_response": str(response_path),
        "completion": completion,
    }


@app.post("/file/chat")
@app.post("/pdf/chat")
async def chat_with_document(
    file: UploadFile = File(...),
    prompt_prefix: str = Form(""),
    stream: bool = Form(False),
    model: str | None = Form(None),
) -> dict[str, Any]:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        document_text, document_type = extract_document_text(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type,
            max_chars=settings.max_pdf_chars,
            image_chat_url=settings.image_chat_url,
            image_chat_prompt=settings.image_chat_prompt,
            image_chat_thinking=settings.image_chat_thinking,
            timeout_seconds=settings.request_timeout_seconds,
        )
    except DocumentExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content = combine_prompt_and_document(prompt_prefix=prompt_prefix, document_text=document_text)
    payload = build_chat_payload(
        content,
        model=model or settings.chat_model,
        stream=stream,
    )

    try:
        completion = await post_chat_completion(
            url=settings.chat_completions_url,
            payload=payload,
            timeout_seconds=settings.request_timeout_seconds,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail={
                "message": "Chat completions endpoint returned an error.",
                "response": exc.response.text,
            },
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach chat completions endpoint: {exc}",
        ) from exc

    response_path = save_completion_choices_markdown(
        completion=completion,
        input_filename=file.filename,
        response_dir=settings.response_dir,
    )

    return {
        "request": {
            "model": payload["model"],
            "stream": payload["stream"],
            "content_chars": len(content),
            "document_chars": len(document_text),
            "document_type": document_type,
        },
        "saved_response": str(response_path),
        "completion": completion,
    }


def combine_prompt_and_document(*, prompt_prefix: str, document_text: str) -> str:
    prompt_prefix = prompt_prefix.strip()
    if not prompt_prefix:
        return document_text
    return f"{prompt_prefix}\n\n{document_text}"


def combine_prompt_and_pdf(*, prompt_prefix: str, pdf_text: str) -> str:
    return combine_prompt_and_document(prompt_prefix=prompt_prefix, document_text=pdf_text)


def unique_document_ids(document_ids: list[str]) -> list[str]:
    unique_ids: list[str] = []
    seen: set[str] = set()
    for document_id in document_ids:
        normalized_id = document_id.strip()
        if normalized_id and normalized_id not in seen:
            unique_ids.append(normalized_id)
            seen.add(normalized_id)
    return unique_ids


def library_document_payload(document: LibraryDocument) -> dict[str, Any]:
    return {
        "id": document.id,
        "name": document.name,
        "size_bytes": document.size_bytes,
        "document_type": document.document_type,
    }


def frontend_dist_path() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


frontend_dist = frontend_dist_path()
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
