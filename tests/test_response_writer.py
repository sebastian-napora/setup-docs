from datetime import datetime

from pdf_chat_service.response_writer import (
    render_choices_markdown,
    sanitize_filename_stem,
    save_completion_choices_markdown,
)


def test_save_completion_choices_markdown_uses_input_filename_and_timestamp(tmp_path) -> None:
    completion = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "# Summary\n\nDone.",
                }
            }
        ]
    }

    output_path = save_completion_choices_markdown(
        completion=completion,
        input_filename="Zaproszenie do składania ofert.pdf",
        response_dir=tmp_path,
        returned_at=datetime(2026, 4, 29, 20, 45, 1),
    )

    assert output_path.name == "Zaproszenie_do_sk_adania_ofert_20260429-204501.md"
    assert output_path.read_text(encoding="utf-8") == "# Summary\n\nDone.\n"


def test_render_choices_markdown_includes_all_choices() -> None:
    completion = {
        "choices": [
            {"message": {"content": "First"}},
            {"message": {"content": "Second"}},
        ]
    }

    assert render_choices_markdown(completion) == "## Choice 1\n\nFirst\n\n## Choice 2\n\nSecond\n"


def test_sanitize_filename_stem_falls_back_when_empty() -> None:
    assert sanitize_filename_stem("...") == "response"
