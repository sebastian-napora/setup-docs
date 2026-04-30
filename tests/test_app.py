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
