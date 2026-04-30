from datetime import datetime
from pathlib import Path

import pytest

from pdf_chat_service.history import (
    ChatHistoryError,
    clear_docs_chat_history,
    delete_docs_chat_history,
    list_docs_chat_history,
    load_docs_chat_history,
    save_docs_chat_history,
)


def test_save_and_load_docs_chat_history(tmp_path: Path) -> None:
    record = save_docs_chat_history(
        response_dir=tmp_path / "response",
        prompt="What is the date?",
        answer='May 5 -> "The date is May 5."',
        request_info={
            "model": "test-model",
            "files": [{"id": "notes.md", "name": "notes.md"}],
        },
        saved_response="response/docs-chat.md",
        created_at=datetime.fromisoformat("2026-04-30T09:10:11+00:00"),
    )

    loaded = load_docs_chat_history(response_dir=tmp_path / "response", history_id=record["id"])

    assert loaded["prompt"] == "What is the date?"
    assert loaded["answer"] == 'May 5 -> "The date is May 5."'
    assert loaded["request"]["files"][0]["id"] == "notes.md"


def test_list_docs_chat_history_returns_newest_summaries(tmp_path: Path) -> None:
    response_dir = tmp_path / "response"
    older = save_docs_chat_history(
        response_dir=response_dir,
        prompt="Older question",
        answer="Older answer",
        request_info={"model": "older-model", "files": []},
        saved_response="response/older.md",
        created_at=datetime.fromisoformat("2026-04-30T09:10:11+00:00"),
    )
    newer = save_docs_chat_history(
        response_dir=response_dir,
        prompt="Newer question",
        answer="Newer answer",
        request_info={"model": "newer-model", "files": []},
        saved_response="response/newer.md",
        created_at=datetime.fromisoformat("2026-04-30T09:11:11+00:00"),
    )

    history = list_docs_chat_history(response_dir=response_dir)

    assert [item["id"] for item in history] == [newer["id"], older["id"]]
    assert history[0]["prompt"] == "Newer question"
    assert history[0]["answer_preview"] == "Newer answer"


def test_load_docs_chat_history_rejects_unsafe_id(tmp_path: Path) -> None:
    with pytest.raises(ChatHistoryError, match="invalid"):
        load_docs_chat_history(response_dir=tmp_path / "response", history_id="../secret")


def test_delete_docs_chat_history_removes_one_record(tmp_path: Path) -> None:
    response_dir = tmp_path / "response"
    record = save_docs_chat_history(
        response_dir=response_dir,
        prompt="Question",
        answer="Answer",
        request_info={"model": "test-model", "files": []},
        saved_response="response/item.md",
        created_at=datetime.fromisoformat("2026-04-30T09:10:11+00:00"),
    )

    delete_docs_chat_history(response_dir=response_dir, history_id=record["id"])

    assert list_docs_chat_history(response_dir=response_dir) == []
    with pytest.raises(ChatHistoryError, match="not found"):
        load_docs_chat_history(response_dir=response_dir, history_id=record["id"])


def test_clear_docs_chat_history_removes_all_records(tmp_path: Path) -> None:
    response_dir = tmp_path / "response"
    save_docs_chat_history(
        response_dir=response_dir,
        prompt="Question 1",
        answer="Answer 1",
        request_info={"model": "test-model", "files": []},
        saved_response="response/item-1.md",
    )
    save_docs_chat_history(
        response_dir=response_dir,
        prompt="Question 2",
        answer="Answer 2",
        request_info={"model": "test-model", "files": []},
        saved_response="response/item-2.md",
    )

    assert clear_docs_chat_history(response_dir=response_dir) == 2
    assert list_docs_chat_history(response_dir=response_dir) == []
