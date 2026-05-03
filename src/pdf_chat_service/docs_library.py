from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil

from pdf_chat_service.document import extract_document_text
from pdf_chat_service.image import (
    DEFAULT_IMAGE_CHAT_PROMPT,
    DEFAULT_IMAGE_CHAT_URL,
    IMAGE_SUFFIXES,
)
from pdf_chat_service.video import VIDEO_SUFFIXES


SUPPORTED_DOCUMENT_SUFFIXES = {
    ".pdf": "pdf",
    ".md": "markdown",
    ".markdown": "markdown",
    **{suffix: "image" for suffix in IMAGE_SUFFIXES},
    **{suffix: "video" for suffix in VIDEO_SUFFIXES},
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

SOURCE_SEARCH_INSTRUCTION = """Answer only from the retrieved source passages.
Tell the user which file or files contain the requested information.
Always include the exact supporting sentence or passage as a quote.
For image files, the available source text is the image analysis returned by the image model.
Use plain text only, without XML or HTML tags.
If the requested information is not present in the retrieved passages, say that it was not found."""

WORD_PATTERN = re.compile(r"\w+", re.UNICODE)
STOPWORDS = {
    "about",
    "after",
    "also",
    "and",
    "are",
    "because",
    "but",
    "can",
    "czy",
    "dla",
    "does",
    "file",
    "find",
    "from",
    "gdzie",
    "get",
    "jak",
    "jaka",
    "jakie",
    "jest",
    "ktora",
    "ktore",
    "ktory",
    "lub",
    "ma",
    "mam",
    "mamy",
    "miejsce",
    "nie",
    "oraz",
    "plik",
    "pliku",
    "please",
    "podaj",
    "pokaz",
    "proszę",
    "search",
    "sie",
    "się",
    "that",
    "the",
    "this",
    "what",
    "where",
    "which",
    "with",
    "znajdz",
    "znajdź",
}


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


@dataclass(frozen=True)
class SourceSearchMatch:
    file_id: str
    name: str
    document_type: str
    quote: str
    score: float


@dataclass(frozen=True)
class DocumentSearchChunk:
    document: ExtractedLibraryDocument
    text: str
    index: int


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


COUNTS_CACHE_FILENAME = "_counts.json"


def count_docs_by_folder(docs_dir: Path) -> dict[str, int]:
    """Return a mapping of folder name → file count for all supported files in docs_dir."""
    root = docs_dir.resolve()
    if not root.exists() or not root.is_dir():
        return {}
    counts: dict[str, int] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if SUPPORTED_DOCUMENT_SUFFIXES.get(path.suffix.lower()) is None:
            continue
        rel = path.relative_to(root)
        folder = str(rel.parent) if rel.parent != Path(".") else ""
        counts[folder] = counts.get(folder, 0) + 1
    return counts


def read_counts_cache(docs_dir: Path) -> dict[str, object] | None:
    cache_path = docs_dir / COUNTS_CACHE_FILENAME
    try:
        data = json.loads(cache_path.read_text())
        if not isinstance(data, dict):
            return None
        counts_raw = data.get("counts", data)  # support old flat format
        counts = {str(k): int(v) for k, v in counts_raw.items() if k != "lastUpdateDate"}
        last_update = data.get("lastUpdateDate")
        return {"counts": counts, "lastUpdateDate": last_update}
    except Exception:
        pass
    return None


def write_counts_cache(docs_dir: Path) -> None:
    counts = count_docs_by_folder(docs_dir)
    cache_path = docs_dir / COUNTS_CACHE_FILENAME
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "counts": counts,
        "lastUpdateDate": datetime.now(timezone.utc).isoformat(),
    }
    cache_path.write_text(json.dumps(payload))


def validate_library_upload(*, filename: str | None, file_bytes: bytes) -> str:
    clean_name = normalize_upload_filename(filename)
    if not file_bytes:
        raise DocumentLibraryError("Uploaded file is empty.")
    if SUPPORTED_DOCUMENT_SUFFIXES.get(Path(clean_name).suffix.lower()) is None:
        raise DocumentLibraryError("Only PDF, Markdown, image, and video files are supported.")
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


FOLDER_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._ -]+")


def move_library_document(
    *,
    docs_dir: Path,
    document_id: str,
    folder_name: str,
) -> LibraryDocument:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    root = docs_dir.resolve()

    if folder_name:
        clean_folder = FOLDER_NAME_PATTERN.sub("_", folder_name).strip().strip(".")
        if not clean_folder:
            raise DocumentLibraryError("Invalid folder name.")
        target_dir = (root / clean_folder).resolve()
        try:
            target_dir.relative_to(root)
        except ValueError as exc:
            raise DocumentLibraryError("Folder must stay inside the docs directory.") from exc
    else:
        target_dir = root

    target_path = (target_dir / document.path.name).resolve()

    if target_path == document.path.resolve():
        return document
    if target_path.exists():
        raise DocumentLibraryError("A file with this name already exists in the target folder.")

    target_dir.mkdir(parents=True, exist_ok=True)
    shutil.move(str(document.path), str(target_path))
    remove_empty_parent_directories(start=document.path.parent, stop=root)

    document_type = SUPPORTED_DOCUMENT_SUFFIXES[target_path.suffix.lower()]
    return LibraryDocument(
        id=target_path.relative_to(root).as_posix(),
        name=target_path.name,
        path=target_path,
        size_bytes=target_path.stat().st_size,
        document_type=document_type,
    )


def archive_library_document(
    *,
    docs_dir: Path,
    archive_dir: Path,
    document_id: str,
) -> LibraryDocument:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    archive_root = prepare_library_directory(archive_dir)
    target_path = unique_relative_path(root=archive_root, relative_id=document.id)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(document.path), str(target_path))
    remove_empty_parent_directories(start=document.path.parent, stop=docs_dir.resolve())

    document_type = SUPPORTED_DOCUMENT_SUFFIXES[target_path.suffix.lower()]
    return LibraryDocument(
        id=target_path.relative_to(archive_root).as_posix(),
        name=target_path.name,
        path=target_path,
        size_bytes=target_path.stat().st_size,
        document_type=document_type,
    )


def delete_archived_library_document(
    *,
    archive_dir: Path,
    document_id: str,
    confirmation: str,
) -> LibraryDocument:
    if confirmation != "USUWAM":
        raise DocumentLibraryError('Type "USUWAM" to delete the archived file.')

    document = resolve_library_document(docs_dir=archive_dir, document_id=document_id)
    document.path.unlink()
    remove_empty_parent_directories(start=document.path.parent, stop=archive_dir.resolve())
    return document


def clear_archived_library(
    *,
    archive_dir: Path,
    confirmation: str,
) -> int:
    if confirmation != "USUWAM":
        raise DocumentLibraryError('Type "USUWAM" to delete all archived files.')

    documents = list_library_documents(docs_dir=archive_dir)
    deleted_count = 0
    for document in documents:
        document.path.unlink()
        deleted_count += 1

    # Clean up all empty subdirectories
    for subdir in sorted(archive_dir.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if subdir.is_dir() and not any(subdir.iterdir()):
            subdir.rmdir()

    return deleted_count


def rename_library_document(
    *,
    docs_dir: Path,
    document_id: str,
    new_stem: str,
) -> LibraryDocument:
    document = resolve_library_document(docs_dir=docs_dir, document_id=document_id)
    clean_stem = normalize_rename_stem(new_stem=new_stem, suffix=document.path.suffix)
    target_path = (document.path.parent / f"{clean_stem}{document.path.suffix}").resolve()
    root = docs_dir.resolve()
    try:
        target_path.relative_to(root)
    except ValueError as exc:
        raise DocumentLibraryError("Document id must stay inside the docs folder.") from exc

    if target_path == document.path.resolve():
        return document
    if target_path.exists():
        raise DocumentLibraryError("A file with this name already exists.")

    document.path.rename(target_path)
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


def normalize_rename_stem(*, new_stem: str, suffix: str) -> str:
    raw_stem = Path(new_stem.replace("\\", "/")).name.strip()
    if suffix and raw_stem.lower().endswith(suffix.lower()):
        raw_stem = raw_stem[: -len(suffix)]
    clean_stem = UPLOAD_FILENAME_PATTERN.sub("_", raw_stem)
    clean_stem = re.sub(r"\s+", " ", clean_stem).strip()
    clean_stem = clean_stem.strip(".")
    if not clean_stem:
        raise DocumentLibraryError("File name cannot be empty.")
    return clean_stem


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


def prepare_library_directory(directory: Path) -> Path:
    root = directory.resolve()
    if root.exists() and not root.is_dir():
        raise DocumentLibraryError(f"Docs path is not a folder: {directory}")
    root.mkdir(parents=True, exist_ok=True)
    return root


def unique_relative_path(*, root: Path, relative_id: str) -> Path:
    requested_path = Path(relative_id)
    if requested_path.is_absolute():
        raise DocumentLibraryError("Document id must be relative to the docs folder.")

    target_path = (root / requested_path).resolve()
    try:
        target_path.relative_to(root)
    except ValueError as exc:
        raise DocumentLibraryError("Document id must stay inside the docs folder.") from exc

    if not target_path.exists():
        return target_path

    suffix = target_path.suffix
    stem = target_path.stem or "document"
    parent = target_path.parent
    for counter in range(1, 10_000):
        candidate = parent / f"{stem}-{counter}{suffix}"
        if not candidate.exists():
            return candidate

    raise DocumentLibraryError("Could not choose a unique filename for the archived file.")


def remove_empty_parent_directories(*, start: Path, stop: Path) -> None:
    current = start.resolve()
    stop = stop.resolve()
    while current != stop:
        try:
            current.rmdir()
        except OSError:
            return
        current = current.parent


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
        raise DocumentLibraryError("Only PDF, Markdown, image, and video files are supported.")
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


def search_extracted_documents(
    *,
    user_prompt: str,
    documents: list[ExtractedLibraryDocument],
    max_matches: int = 8,
    chunk_chars: int = 1_200,
    chunk_overlap: int = 160,
) -> list[SourceSearchMatch]:
    user_prompt = user_prompt.strip()
    if not user_prompt:
        raise DocumentLibraryError("Prompt cannot be empty.")
    if not documents:
        raise DocumentLibraryError("At least one document must be selected.")
    if max_matches < 1:
        raise DocumentLibraryError("Maximum source matches must be at least 1.")

    query_terms = normalized_terms(user_prompt)
    scored_chunks: list[tuple[float, int, DocumentSearchChunk]] = []
    fallback_chunks: list[DocumentSearchChunk] = []
    sequence = 0

    for document in documents:
        for chunk in chunk_document_text(
            document=document,
            chunk_chars=chunk_chars,
            chunk_overlap=chunk_overlap,
        ):
            if not chunk.text:
                continue
            if chunk.index == 0 and len(fallback_chunks) < max_matches:
                fallback_chunks.append(chunk)
            score = score_search_chunk(chunk=chunk, query_terms=query_terms, raw_query=user_prompt)
            if score > 0:
                scored_chunks.append((score, sequence, chunk))
            sequence += 1

    if not scored_chunks:
        fallback = fallback_chunks[:max_matches]
        return [
            SourceSearchMatch(
                file_id=chunk.document.id,
                name=chunk.document.name,
                document_type=chunk.document.document_type,
                quote=clean_source_quote(chunk.text),
                score=0.0,
            )
            for chunk in fallback
        ]

    scored_chunks.sort(key=lambda item: (-item[0], item[1]))
    matches: list[SourceSearchMatch] = []
    matches_per_file: dict[str, int] = {}
    max_matches_per_file = 2 if max_matches > 2 else 1

    for score, _sequence, chunk in scored_chunks:
        current_count = matches_per_file.get(chunk.document.id, 0)
        if current_count >= max_matches_per_file:
            continue

        matches.append(
            SourceSearchMatch(
                file_id=chunk.document.id,
                name=chunk.document.name,
                document_type=chunk.document.document_type,
                quote=clean_source_quote(chunk.text),
                score=round(score, 4),
            )
        )
        matches_per_file[chunk.document.id] = current_count + 1

        if len(matches) >= max_matches:
            break

    return matches


def build_docs_source_search_prompt(
    *,
    user_prompt: str,
    matches: list[SourceSearchMatch],
) -> str:
    user_prompt = user_prompt.strip()
    if not user_prompt:
        raise DocumentLibraryError("Prompt cannot be empty.")
    if not matches:
        raise DocumentLibraryError("No source passages were found.")

    parts = [
        SOURCE_SEARCH_INSTRUCTION,
        f"User request:\n{user_prompt}",
        "Retrieved source passages:",
    ]

    for index, match in enumerate(matches, start=1):
        parts.append(
            "\n".join(
                [
                    f"--- SOURCE {index}: {match.file_id} ({match.document_type}) ---",
                    match.quote,
                    f"--- END SOURCE {index}: {match.file_id} ---",
                ]
            )
        )

    return "\n\n".join(parts)


def chunk_document_text(
    *,
    document: ExtractedLibraryDocument,
    chunk_chars: int,
    chunk_overlap: int,
) -> list[DocumentSearchChunk]:
    text = document.text.strip()
    if not text:
        return []

    chunk_chars = max(300, chunk_chars)
    chunk_overlap = min(max(0, chunk_overlap), chunk_chars // 2)
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    for paragraph in paragraphs:
        if len(paragraph) > chunk_chars:
            if current_parts:
                chunks.append("\n\n".join(current_parts))
                current_parts = []
                current_length = 0
            chunks.extend(split_long_text(paragraph, chunk_chars=chunk_chars, overlap=chunk_overlap))
            continue

        next_length = current_length + len(paragraph) + (2 if current_parts else 0)
        if current_parts and next_length > chunk_chars:
            chunks.append("\n\n".join(current_parts))
            current_parts = [paragraph]
            current_length = len(paragraph)
        else:
            current_parts.append(paragraph)
            current_length = next_length

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return [
        DocumentSearchChunk(document=document, text=chunk.strip(), index=index)
        for index, chunk in enumerate(chunks)
        if chunk.strip()
    ]


def split_long_text(text: str, *, chunk_chars: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_chars)
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def score_search_chunk(
    *,
    chunk: DocumentSearchChunk,
    query_terms: list[str],
    raw_query: str,
) -> float:
    if not query_terms:
        return 0.0

    chunk_text = chunk.text.lower()
    file_text = f"{chunk.document.id} {chunk.document.name}".lower()
    chunk_terms = set(normalized_terms(chunk.text, keep_stopwords=True))
    file_terms = set(normalized_terms(file_text, keep_stopwords=True))
    score = 0.0

    for term in query_terms:
        if term in chunk_terms:
            score += 4.0
            score += min(chunk_text.count(term), 5) * 0.5
        elif term_has_shared_prefix(term, chunk_terms):
            score += 2.0

        if term in file_terms:
            score += 1.5
        elif term_has_shared_prefix(term, file_terms):
            score += 0.75

    normalized_query = " ".join(query_terms)
    if len(normalized_query) >= 8 and normalized_query in chunk_text:
        score += 6.0

    raw_query = re.sub(r"\s+", " ", raw_query.lower()).strip()
    if len(raw_query) >= 8 and raw_query in chunk_text:
        score += 8.0

    return score


def normalized_terms(value: str, *, keep_stopwords: bool = False) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()

    for match in WORD_PATTERN.finditer(value.lower()):
        term = match.group(0).strip("_")
        if len(term) < 3 and not term.isdigit():
            continue
        if not keep_stopwords and term in STOPWORDS:
            continue
        if term not in seen:
            terms.append(term)
            seen.add(term)

    return terms


def term_has_shared_prefix(term: str, candidates: set[str]) -> bool:
    if len(term) < 5:
        return False

    prefix = term[:5]
    return any(
        len(candidate) >= 5 and (candidate.startswith(prefix) or term.startswith(candidate[:5]))
        for candidate in candidates
    )


def clean_source_quote(value: str, max_chars: int = 900) -> str:
    quote = re.sub(r"\s+", " ", value).strip()
    if len(quote) <= max_chars:
        return quote
    return quote[: max_chars - 3].rstrip() + "..."
