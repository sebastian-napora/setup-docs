from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from pdf_chat_service.document import extract_document_text
from pdf_chat_service.image import (
    DEFAULT_IMAGE_CHAT_PROMPT,
    DEFAULT_IMAGE_CHAT_URL,
    IMAGE_SUFFIXES,
)


SUPPORTED_DOCUMENT_SUFFIXES = {
    ".pdf": "pdf",
    ".md": "markdown",
    ".markdown": "markdown",
    **{suffix: "image" for suffix in IMAGE_SUFFIXES},
}
UPLOAD_FILENAME_PATTERN = re.compile(r"[^A-Za-z0-9._ -]+")

ANSWER_WITH_SOURCE_SENTENCE_INSTRUCTION = """Answer only from the selected files.
Always return the answer together with the exact source sentence from the files that supports it.
For image files, the available source text is the image analysis returned by the image model.
Use plain text only, without XML or HTML tags.
For simple fact questions, use this shape:
Answer: the answer
Quote: "exact sentence from the file"
If the answer is not present, say that it was not found in the selected files."""


class DocumentLibraryError(ValueError):
    pass


@dataclass(frozen=True)
class LibraryDocument:
    id: str
    name: str
    path: Path
    size_bytes: int
    document_type: str


@dataclass(frozen=True)
class ExtractedLibraryDocument:
    id: str
    name: str
    document_type: str
    text: str


def list_library_documents(docs_dir: Path) -> list[LibraryDocument]:
    root = docs_dir.resolve()
    if not root.exists():
        return []
    if not root.is_dir():
        raise DocumentLibraryError(f"Docs path is not a folder: {docs_dir}")

    documents: list[LibraryDocument] = []
    for path in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix().lower()):
        if not path.is_file():
            continue

        document_type = SUPPORTED_DOCUMENT_SUFFIXES.get(path.suffix.lower())
        if document_type is None:
            continue

        relative_id = path.relative_to(root).as_posix()
        documents.append(
            LibraryDocument(
                id=relative_id,
                name=path.name,
                path=path,
                size_bytes=path.stat().st_size,
                document_type=document_type,
            )
        )

    return documents


def validate_library_upload(*, filename: str | None, file_bytes: bytes) -> str:
    clean_name = normalize_upload_filename(filename)
    if not file_bytes:
        raise DocumentLibraryError("Uploaded file is empty.")
    if SUPPORTED_DOCUMENT_SUFFIXES.get(Path(clean_name).suffix.lower()) is None:
        raise DocumentLibraryError("Only PDF, Markdown, and image files are supported.")
    return clean_name


def save_library_upload(*, docs_dir: Path, filename: str | None, file_bytes: bytes) -> LibraryDocument:
    clean_name = validate_library_upload(filename=filename, file_bytes=file_bytes)
    root = docs_dir.resolve()
    if root.exists() and not root.is_dir():
        raise DocumentLibraryError(f"Docs path is not a folder: {docs_dir}")

    root.mkdir(parents=True, exist_ok=True)
    target_path = unique_upload_path(root=root, filename=clean_name)
    target_path.write_bytes(file_bytes)

    document_type = SUPPORTED_DOCUMENT_SUFFIXES[target_path.suffix.lower()]
    return LibraryDocument(
        id=target_path.relative_to(root).as_posix(),
        name=target_path.name,
        path=target_path,
        size_bytes=target_path.stat().st_size,
        document_type=document_type,
    )


def extract_library_document(
    *,
    docs_dir: Path,
    document_id: str,
    max_chars: int,
    image_chat_url: str = DEFAULT_IMAGE_CHAT_URL,
    image_chat_prompt: str = DEFAULT_IMAGE_CHAT_PROMPT,
    image_chat_thinking: bool = False,
    timeout_seconds: float = 120.0,
) -> ExtractedLibraryDocument:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    text, document_type = extract_document_text(
        file_bytes=document.path.read_bytes(),
        filename=document.path.name,
        content_type=None,
        max_chars=max_chars,
        image_chat_url=image_chat_url,
        image_chat_prompt=image_chat_prompt,
        image_chat_thinking=image_chat_thinking,
        timeout_seconds=timeout_seconds,
    )
    return ExtractedLibraryDocument(
        id=document.id,
        name=document.name,
        document_type=document_type,
        text=text,
    )


def normalize_upload_filename(filename: str | None) -> str:
    raw_name = Path((filename or "").replace("\\", "/")).name.strip()
    clean_name = UPLOAD_FILENAME_PATTERN.sub("_", raw_name)
    clean_name = re.sub(r"\s+", " ", clean_name).strip()
    clean_name = clean_name.strip(".")
    if not clean_name:
        raise DocumentLibraryError("Uploaded file must have a filename.")
    return clean_name


def unique_upload_path(*, root: Path, filename: str) -> Path:
    target_path = root / filename
    if not target_path.exists():
        return target_path

    suffix = target_path.suffix
    stem = target_path.stem or "document"
    for counter in range(1, 10_000):
        candidate = root / f"{stem}-{counter}{suffix}"
        if not candidate.exists():
            return candidate

    raise DocumentLibraryError("Could not choose a unique filename for the uploaded file.")


def resolve_library_document(*, docs_dir: Path, document_id: str) -> LibraryDocument:
    document_id = document_id.strip()
    if not document_id:
        raise DocumentLibraryError("Document id cannot be empty.")

    requested_path = Path(document_id)
    if requested_path.is_absolute():
        raise DocumentLibraryError("Document id must be relative to the docs folder.")

    root = docs_dir.resolve()
    candidate = (root / requested_path).resolve()
    try:
        relative_id = candidate.relative_to(root).as_posix()
    except ValueError as exc:
        raise DocumentLibraryError("Document id must stay inside the docs folder.") from exc

    document_type = SUPPORTED_DOCUMENT_SUFFIXES.get(candidate.suffix.lower())
    if document_type is None:
        raise DocumentLibraryError("Only PDF, Markdown, and image files are supported.")
    if not candidate.is_file():
        raise DocumentLibraryError(f"Document was not found: {document_id}")

    return LibraryDocument(
        id=relative_id,
        name=candidate.name,
        path=candidate,
        size_bytes=candidate.stat().st_size,
        document_type=document_type,
    )


def build_docs_chat_prompt(*, user_prompt: str, documents: list[ExtractedLibraryDocument]) -> str:
    user_prompt = user_prompt.strip()
    if not user_prompt:
        raise DocumentLibraryError("Prompt cannot be empty.")
    if not documents:
        raise DocumentLibraryError("At least one document must be selected.")

    parts = [
        ANSWER_WITH_SOURCE_SENTENCE_INSTRUCTION,
        f"User request:\n{user_prompt}",
        "Selected files:",
    ]

    for document in documents:
        parts.append(
            "\n".join(
                [
                    f"--- FILE: {document.id} ({document.document_type}) ---",
                    document.text,
                    f"--- END FILE: {document.id} ---",
                ]
            )
        )

    return "\n\n".join(parts)
