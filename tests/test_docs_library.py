from pathlib import Path

import pytest

from pdf_chat_service.docs_library import (
    DocumentLibraryError,
    ExtractedLibraryDocument,
    archive_library_document,
    build_docs_chat_prompt,
    build_docs_source_search_prompt,
    delete_archived_library_document,
    list_library_documents,
    rename_library_document,
    resolve_library_document,
    save_library_upload,
    search_extracted_documents,
)


def test_list_library_documents_returns_supported_files(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "notes.md").write_text("# Notes", encoding="utf-8")
    (docs_dir / "invite.pdf").write_bytes(b"%PDF")
    (docs_dir / "scan.png").write_bytes(b"image")
    (docs_dir / "ignored.txt").write_text("Nope", encoding="utf-8")

    documents = list_library_documents(docs_dir)

    assert [document.id for document in documents] == ["invite.pdf", "notes.md", "scan.png"]
    assert [document.document_type for document in documents] == ["pdf", "markdown", "image"]


def test_resolve_library_document_rejects_path_traversal(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (tmp_path / "secret.md").write_text("secret", encoding="utf-8")

    with pytest.raises(DocumentLibraryError, match="inside the docs folder"):
        resolve_library_document(docs_dir=docs_dir, document_id="../secret.md")


def test_save_library_upload_stores_supported_file_in_docs(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"

    document = save_library_upload(
        docs_dir=docs_dir,
        filename="notes.md",
        file_bytes=b"# Notes",
    )

    assert document.id == "notes.md"
    assert document.document_type == "markdown"
    assert (docs_dir / "notes.md").read_text(encoding="utf-8") == "# Notes"


def test_save_library_upload_suffixes_duplicate_filename(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "scan.png").write_bytes(b"old")

    document = save_library_upload(
        docs_dir=docs_dir,
        filename="scan.png",
        file_bytes=b"new",
    )

    assert document.id == "scan-1.png"
    assert (docs_dir / "scan.png").read_bytes() == b"old"
    assert (docs_dir / "scan-1.png").read_bytes() == b"new"


def test_save_library_upload_normalizes_path_filename(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"

    document = save_library_upload(
        docs_dir=docs_dir,
        filename="../secret.md",
        file_bytes=b"safe",
    )

    assert document.id == "secret.md"
    assert (docs_dir / "secret.md").read_bytes() == b"safe"
    assert not (tmp_path / "secret.md").exists()


def test_save_library_upload_rejects_unsupported_file(tmp_path: Path) -> None:
    with pytest.raises(DocumentLibraryError, match="PDF, Markdown, and image"):
        save_library_upload(
            docs_dir=tmp_path / "docs",
            filename="notes.txt",
            file_bytes=b"Notes",
        )


def test_archive_library_document_moves_file_to_archive(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    archive_dir = tmp_path / "docs_archive"
    nested_dir = docs_dir / "nested"
    nested_dir.mkdir(parents=True)
    (nested_dir / "scan.png").write_bytes(b"image")

    document = archive_library_document(
        docs_dir=docs_dir,
        archive_dir=archive_dir,
        document_id="nested/scan.png",
    )

    assert document.id == "nested/scan.png"
    assert document.document_type == "image"
    assert not (nested_dir / "scan.png").exists()
    assert not nested_dir.exists()
    assert (archive_dir / "nested" / "scan.png").read_bytes() == b"image"


def test_archive_library_document_suffixes_duplicate_archive_file(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    archive_dir = tmp_path / "docs_archive"
    docs_dir.mkdir()
    archive_dir.mkdir()
    (docs_dir / "notes.md").write_bytes(b"new")
    (archive_dir / "notes.md").write_bytes(b"old")

    document = archive_library_document(
        docs_dir=docs_dir,
        archive_dir=archive_dir,
        document_id="notes.md",
    )

    assert document.id == "notes-1.md"
    assert (archive_dir / "notes.md").read_bytes() == b"old"
    assert (archive_dir / "notes-1.md").read_bytes() == b"new"


def test_delete_archived_library_document_requires_confirmation(tmp_path: Path) -> None:
    archive_dir = tmp_path / "docs_archive"
    archive_dir.mkdir()
    (archive_dir / "notes.md").write_bytes(b"notes")

    with pytest.raises(DocumentLibraryError, match="USUWAM"):
        delete_archived_library_document(
            archive_dir=archive_dir,
            document_id="notes.md",
            confirmation="DELETE",
        )

    assert (archive_dir / "notes.md").exists()


def test_delete_archived_library_document_removes_file(tmp_path: Path) -> None:
    archive_dir = tmp_path / "docs_archive"
    nested_dir = archive_dir / "nested"
    nested_dir.mkdir(parents=True)
    (nested_dir / "notes.md").write_bytes(b"notes")

    document = delete_archived_library_document(
        archive_dir=archive_dir,
        document_id="nested/notes.md",
        confirmation="USUWAM",
    )

    assert document.id == "nested/notes.md"
    assert not (nested_dir / "notes.md").exists()
    assert not nested_dir.exists()


def test_rename_library_document_preserves_extension(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "example.md").write_text("# Notes", encoding="utf-8")

    document = rename_library_document(
        docs_dir=docs_dir,
        document_id="example.md",
        new_stem="changed",
    )

    assert document.id == "changed.md"
    assert document.name == "changed.md"
    assert document.document_type == "markdown"
    assert not (docs_dir / "example.md").exists()
    assert (docs_dir / "changed.md").read_text(encoding="utf-8") == "# Notes"


def test_rename_library_document_accepts_accidental_extension_input(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "example.md").write_text("# Notes", encoding="utf-8")

    document = rename_library_document(
        docs_dir=docs_dir,
        document_id="example.md",
        new_stem="changed.md",
    )

    assert document.id == "changed.md"
    assert (docs_dir / "changed.md").exists()
    assert not (docs_dir / "changed.md.md").exists()


def test_rename_library_document_rejects_duplicate_name(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "example.md").write_text("old", encoding="utf-8")
    (docs_dir / "changed.md").write_text("existing", encoding="utf-8")

    with pytest.raises(DocumentLibraryError, match="already exists"):
        rename_library_document(
            docs_dir=docs_dir,
            document_id="example.md",
            new_stem="changed",
        )

    assert (docs_dir / "example.md").read_text(encoding="utf-8") == "old"
    assert (docs_dir / "changed.md").read_text(encoding="utf-8") == "existing"


def test_build_docs_chat_prompt_requires_source_sentence_answer() -> None:
    prompt = build_docs_chat_prompt(
        user_prompt="data urodziny corki",
        documents=[
            ExtractedLibraryDocument(
                id="answers.md",
                name="answers.md",
                document_type="markdown",
                text="Corka urodzila sie 5 maja 2020 roku.",
            )
        ],
    )

    assert "exact source sentence" in prompt
    assert "image analysis returned by the image model" in prompt
    assert "without XML or HTML tags" in prompt
    assert 'Quote: "exact sentence from the file"' in prompt
    assert "<answer>" not in prompt
    assert "data urodziny corki" in prompt
    assert "--- FILE: answers.md (markdown) ---" in prompt


def test_search_extracted_documents_returns_matching_files_and_quotes() -> None:
    matches = search_extracted_documents(
        user_prompt="expired token login",
        documents=[
            ExtractedLibraryDocument(
                id="billing.md",
                name="billing.md",
                document_type="markdown",
                text="Invoices are exported on the first day of each month.",
            ),
            ExtractedLibraryDocument(
                id="screenshots/error.png",
                name="error.png",
                document_type="image",
                text="Screenshot shows login failed because the session token expired.",
            ),
        ],
        max_matches=3,
    )

    assert matches[0].file_id == "screenshots/error.png"
    assert matches[0].document_type == "image"
    assert "token expired" in matches[0].quote


def test_build_docs_source_search_prompt_mentions_files_and_sources() -> None:
    matches = search_extracted_documents(
        user_prompt="installation requirements",
        documents=[
            ExtractedLibraryDocument(
                id="manual.md",
                name="manual.md",
                document_type="markdown",
                text="Installation requires Python 3.10 and at least 8 GB RAM.",
            )
        ],
        max_matches=1,
    )

    prompt = build_docs_source_search_prompt(
        user_prompt="installation requirements",
        matches=matches,
    )

    assert "which file or files contain" in prompt
    assert "without XML or HTML tags" in prompt
    assert "--- SOURCE 1: manual.md (markdown) ---" in prompt
    assert "Installation requires Python 3.10" in prompt
