from pathlib import Path

from fastapi.testclient import TestClient

from pdf_chat_service import app as app_module


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
