from pathlib import Path

from fastapi.testclient import TestClient

from pdf_chat_service import app as app_module
from pdf_chat_service.embeddings import LibraryDocumentEmbeddingResult


def test_upload_docs_files_stores_multiple_supported_files(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/files",
        files=[
            ("files", ("notes.md", b"# Notes", "text/markdown")),
            ("files", ("scan.png", b"image bytes", "image/png")),
        ],
    )

    assert response.status_code == 200
    assert response.json()["files"] == [
        {
            "id": "notes.md",
            "name": "notes.md",
            "size_bytes": 7,
            "document_type": "markdown",
        },
        {
            "id": "scan.png",
            "name": "scan.png",
            "size_bytes": 11,
            "document_type": "image",
        },
    ]
    assert (docs_dir / "notes.md").read_bytes() == b"# Notes"
    assert (docs_dir / "scan.png").read_bytes() == b"image bytes"


def test_upload_docs_files_rejects_unsupported_file(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(app_module.settings, "docs_dir", tmp_path / "docs")
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/files",
        files=[("files", ("notes.txt", b"Notes", "text/plain"))],
    )

    assert response.status_code == 400
    assert "PDF, Markdown, and image" in response.json()["detail"]
    assert not (tmp_path / "docs").exists()


def test_upload_docs_files_embeds_when_requested(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    rag_database_path = tmp_path / "rag_data" / "rag.sqlite3"
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    monkeypatch.setattr(app_module.settings, "rag_database_path", rag_database_path)
    monkeypatch.setattr(
        app_module.settings,
        "chat_completions_url",
        "http://192.168.0.80:11112/v1/chat/completions",
    )
    monkeypatch.setattr(app_module.settings, "local_rag_ingest_url", None)
    embedded_document_ids: list[str] = []
    ingest_urls: list[str] = []

    async def fake_create_library_document_embeddings(**kwargs):
        embedded_document_ids.append(kwargs["document_id"])
        ingest_urls.append(kwargs["local_rag_ingest_url"])
        return LibraryDocumentEmbeddingResult(
            file_id=kwargs["document_id"],
            name=kwargs["document_id"],
            document_type="markdown",
            database_path=kwargs["rag_database_path"],
            ingest_response={"ingested": 1},
        )

    monkeypatch.setattr(
        app_module,
        "create_library_document_embeddings",
        fake_create_library_document_embeddings,
    )
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/files",
        data={"embed": "true"},
        files=[("files", ("notes.md", b"# Notes", "text/markdown"))],
    )

    assert response.status_code == 200
    assert embedded_document_ids == ["notes.md"]
    assert ingest_urls == ["http://192.168.0.80:11112/local_rag/ingest"]
    assert response.json()["embeddings"] == [
        {
            "file_id": "notes.md",
            "name": "notes.md",
            "document_type": "markdown",
            "database_path": str(rag_database_path),
            "ingest_response": {"ingested": 1},
        }
    ]


def test_archive_docs_file_moves_file_to_archive(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    archive_dir = tmp_path / "docs_archive"
    docs_dir.mkdir()
    (docs_dir / "notes.md").write_bytes(b"Notes")
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    monkeypatch.setattr(app_module.settings, "docs_archive_dir", archive_dir)
    client = TestClient(app_module.app)

    response = client.post("/api/docs/files/notes.md/archive")

    assert response.status_code == 200
    assert response.json()["file"] == {
        "id": "notes.md",
        "name": "notes.md",
        "size_bytes": 5,
        "document_type": "markdown",
    }
    assert not (docs_dir / "notes.md").exists()
    assert (archive_dir / "notes.md").read_bytes() == b"Notes"


def test_rename_docs_file_preserves_extension(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "notes.md").write_bytes(b"Notes")
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    client = TestClient(app_module.app)

    response = client.patch("/api/docs/files/notes.md", json={"name": "renamed"})

    assert response.status_code == 200
    assert response.json()["file"] == {
        "id": "renamed.md",
        "name": "renamed.md",
        "size_bytes": 5,
        "document_type": "markdown",
    }
    assert not (docs_dir / "notes.md").exists()
    assert (docs_dir / "renamed.md").read_bytes() == b"Notes"


def test_delete_archived_docs_file_requires_confirmation(
    monkeypatch,
    tmp_path: Path,
) -> None:
    archive_dir = tmp_path / "docs_archive"
    archive_dir.mkdir()
    (archive_dir / "notes.md").write_bytes(b"Notes")
    monkeypatch.setattr(app_module.settings, "docs_archive_dir", archive_dir)
    client = TestClient(app_module.app)

    response = client.request(
        "DELETE",
        "/api/docs/archive/notes.md",
        json={"confirmation": "DELETE"},
    )

    assert response.status_code == 400
    assert "USUWAM" in response.json()["detail"]
    assert (archive_dir / "notes.md").exists()


def test_delete_archived_docs_file_removes_file(
    monkeypatch,
    tmp_path: Path,
) -> None:
    archive_dir = tmp_path / "docs_archive"
    archive_dir.mkdir()
    (archive_dir / "notes.md").write_bytes(b"Notes")
    monkeypatch.setattr(app_module.settings, "docs_archive_dir", archive_dir)
    client = TestClient(app_module.app)

    response = client.request(
        "DELETE",
        "/api/docs/archive/notes.md",
        json={"confirmation": "USUWAM"},
    )

    assert response.status_code == 200
    assert response.json()["deleted"] == 1
    assert not (archive_dir / "notes.md").exists()


def test_search_docs_sources_returns_answer_and_matching_sources(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    response_dir = tmp_path / "response"
    docs_dir.mkdir()
    (docs_dir / "login.md").write_text(
        "Login failed because the session token expired.",
        encoding="utf-8",
    )
    (docs_dir / "billing.md").write_text("Invoices are exported monthly.", encoding="utf-8")
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    monkeypatch.setattr(app_module.settings, "response_dir", response_dir)

    async def fake_post_chat_completion(**kwargs):
        content = kwargs["payload"]["messages"][0]["content"]
        assert "--- SOURCE 1: login.md (markdown) ---" in content
        return {
            "choices": [
                {
                    "message": {
                        "content": (
                            'Found in login.md\n'
                            'Quote: "Login failed because the session token expired."'
                        )
                    }
                }
            ]
        }

    monkeypatch.setattr(app_module, "post_chat_completion", fake_post_chat_completion)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/search",
        json={
            "files": ["billing.md", "login.md"],
            "prompt": "expired token login",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["request"]["mode"] == "source_search"
    assert payload["sources"][0]["file_id"] == "login.md"
    assert "session token expired" in payload["sources"][0]["quote"]
    assert payload["history_item"]["request"]["sources"][0]["file_id"] == "login.md"


def test_search_docs_sources_uses_all_documents_when_files_are_not_selected(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    response_dir = tmp_path / "response"
    docs_dir.mkdir()
    (docs_dir / "login.md").write_text(
        "Login failed because the session token expired.",
        encoding="utf-8",
    )
    (docs_dir / "billing.md").write_text("Invoices are exported monthly.", encoding="utf-8")
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    monkeypatch.setattr(app_module.settings, "response_dir", response_dir)

    async def fake_post_chat_completion(**kwargs):
        content = kwargs["payload"]["messages"][0]["content"]
        assert "--- SOURCE 1: " in content
        assert "login.md" in content
        assert "billing.md" in content
        return {
            "choices": [
                {
                    "message": {
                        "content": "Found matching context in the selected document set."
                    }
                }
            ]
        }

    monkeypatch.setattr(app_module, "post_chat_completion", fake_post_chat_completion)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/search",
        json={
            "prompt": "expired token monthly invoice",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert {file["id"] for file in payload["request"]["files"]} == {"billing.md", "login.md"}
    assert {source["file_id"] for source in payload["sources"]} == {"billing.md", "login.md"}


def test_search_docs_embeddings_uses_local_rag_query(
    monkeypatch,
    tmp_path: Path,
) -> None:
    docs_dir = tmp_path / "docs"
    response_dir = tmp_path / "response"
    docs_dir.mkdir()
    (docs_dir / "login.md").write_text("Login notes", encoding="utf-8")
    monkeypatch.setattr(app_module.settings, "docs_dir", docs_dir)
    monkeypatch.setattr(app_module.settings, "response_dir", response_dir)
    monkeypatch.setattr(
        app_module.settings,
        "chat_completions_url",
        "http://192.168.0.80:11112/v1/chat/completions",
    )
    monkeypatch.setattr(app_module.settings, "local_rag_query_url", None)
    query_urls: list[str] = []
    prompts: list[str] = []

    async def fake_post_local_rag_query(**kwargs):
        query_urls.append(kwargs["query_url"])
        prompts.append(kwargs["prompt"])
        return {
            "answer": "The login context was found through embeddings.",
            "sources": [
                {
                    "source": "login.md",
                    "text": "Login failed because the session token expired.",
                    "score": 0.91,
                    "metadata": {
                        "file_id": "login.md",
                        "name": "login.md",
                        "document_type": "markdown",
                    },
                }
            ],
        }

    monkeypatch.setattr(app_module, "post_local_rag_query", fake_post_local_rag_query)
    client = TestClient(app_module.app)

    response = client.post(
        "/api/docs/embedding-search",
        json={
            "files": ["login.md"],
            "prompt": "expired token login",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert query_urls == ["http://192.168.0.80:11112/local_rag/query"]
    assert prompts == ["expired token login"]
    assert payload["request"]["mode"] == "embedding_search"
    assert payload["answer"] == "The login context was found through embeddings."
    assert payload["sources"][0]["file_id"] == "login.md"
    assert "session token expired" in payload["sources"][0]["quote"]
