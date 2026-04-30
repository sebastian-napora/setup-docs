from pathlib import Path

import pytest

from pdf_chat_service.docs_library import (
    DocumentLibraryError,
    ExtractedLibraryDocument,
    build_docs_chat_prompt,
    list_library_documents,
    resolve_library_document,
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
