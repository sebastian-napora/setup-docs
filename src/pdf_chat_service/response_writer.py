from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any


def save_completion_choices_markdown(
    *,
    completion: dict[str, Any],
    input_filename: str | None,
    response_dir: Path,
    returned_at: datetime | None = None,
) -> Path:
    response_dir.mkdir(parents=True, exist_ok=True)
    timestamp = (returned_at or datetime.now().astimezone()).strftime("%Y%m%d-%H%M%S")
    filename_stem = sanitize_filename_stem(input_filename)
    output_path = response_dir / f"{filename_stem}_{timestamp}.md"
    output_path.write_text(render_choices_markdown(completion), encoding="utf-8")
    return output_path


def sanitize_filename_stem(filename: str | None) -> str:
    stem = Path(filename or "response").stem
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._-")
    return sanitized or "response"


def render_choices_markdown(completion: dict[str, Any]) -> str:
    choices = completion.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    rendered_choices: list[str] = []
    for index, choice in enumerate(choices, start=1):
        content = extract_choice_content(choice)
        if len(choices) == 1:
            rendered_choices.append(content)
        else:
            rendered_choices.append(f"## Choice {index}\n\n{content}")

    return "\n\n".join(rendered_choices).rstrip() + "\n"


def extract_choice_content(choice: Any) -> str:
    if not isinstance(choice, dict):
        return ""

    message = choice.get("message")
    if isinstance(message, dict):
        return stringify_content(message.get("content"))

    return stringify_content(choice.get("text"))


def stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        return "\n\n".join(parts)
    if content is None:
        return ""
    return str(content)
