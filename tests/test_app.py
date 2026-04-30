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
