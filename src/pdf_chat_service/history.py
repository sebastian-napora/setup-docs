from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4


HISTORY_DIR_NAME = "history"
HISTORY_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")


class ChatHistoryError(ValueError):
    pass


def save_docs_chat_history(
    *,
    response_dir: Path,
    prompt: str,
    answer: str,
    request_info: dict[str, Any],
    saved_response: str,
    created_at: datetime | None = None,
) -> dict[str, Any]:
    returned_at = created_at or datetime.now().astimezone()
    history_id = f"{returned_at.strftime('%Y%m%d-%H%M%S')}_{uuid4().hex[:8]}"
    record = {
        "id": history_id,
        "created_at": returned_at.isoformat(timespec="seconds"),
        "prompt": prompt,
        "answer": answer,
        "request": request_info,
        "saved_response": saved_response,
    }

    history_dir = history_directory(response_dir)
    history_dir.mkdir(parents=True, exist_ok=True)
    history_path(history_dir=history_dir, history_id=history_id).write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return record


def list_docs_chat_history(*, response_dir: Path, limit: int = 100) -> list[dict[str, Any]]:
    history_dir = history_directory(response_dir)
    if not history_dir.exists():
        return []

    records: list[dict[str, Any]] = []
    for path in sorted(history_dir.glob("*.json"), key=lambda item: item.name, reverse=True):
        try:
            record = read_history_record(path)
        except ChatHistoryError:
            continue
        records.append(history_summary(record))
        if len(records) >= limit:
            break

    return records


def load_docs_chat_history(*, response_dir: Path, history_id: str) -> dict[str, Any]:
    history_id = validate_history_id(history_id)
    path = history_path(history_dir=history_directory(response_dir), history_id=history_id)
    if not path.is_file():
        raise ChatHistoryError(f"History item was not found: {history_id}")
    return read_history_record(path)


def delete_docs_chat_history(*, response_dir: Path, history_id: str) -> None:
    history_id = validate_history_id(history_id)
    path = history_path(history_dir=history_directory(response_dir), history_id=history_id)
    if not path.is_file():
        raise ChatHistoryError(f"History item was not found: {history_id}")
    path.unlink()


def clear_docs_chat_history(*, response_dir: Path) -> int:
    history_dir = history_directory(response_dir)
    if not history_dir.exists():
        return 0

    deleted_count = 0
    for path in history_dir.glob("*.json"):
        if not path.is_file():
            continue
        path.unlink()
        deleted_count += 1
    return deleted_count


def history_directory(response_dir: Path) -> Path:
    return response_dir / HISTORY_DIR_NAME


def history_path(*, history_dir: Path, history_id: str) -> Path:
    history_id = validate_history_id(history_id)
    return history_dir / f"{history_id}.json"


def validate_history_id(history_id: str) -> str:
    normalized_id = history_id.strip()
    if not normalized_id or not HISTORY_ID_PATTERN.fullmatch(normalized_id):
        raise ChatHistoryError("History id is invalid.")
    return normalized_id


def read_history_record(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ChatHistoryError(f"Could not read history item: {path.name}") from exc

    if not isinstance(data, dict):
        raise ChatHistoryError(f"History item has invalid shape: {path.name}")
    return data


def history_summary(record: dict[str, Any]) -> dict[str, Any]:
    request_info = record.get("request") if isinstance(record.get("request"), dict) else {}
    answer = record.get("answer") if isinstance(record.get("answer"), str) else ""
    files = request_info.get("files") if isinstance(request_info, dict) else []

    return {
        "id": record.get("id", ""),
        "created_at": record.get("created_at", ""),
        "prompt": record.get("prompt", ""),
        "answer_preview": preview_text(answer),
        "files": files if isinstance(files, list) else [],
        "model": request_info.get("model", "") if isinstance(request_info, dict) else "",
    }


def preview_text(value: str, max_chars: int = 180) -> str:
    preview = " ".join(value.split())
    if len(preview) <= max_chars:
        return preview
    return preview[: max_chars - 1].rstrip() + "..."
