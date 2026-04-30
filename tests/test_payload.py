from pdf_chat_service.app import combine_prompt_and_pdf
from pdf_chat_service.chat_client import build_chat_payload


def test_build_chat_payload_matches_target_shape() -> None:
    payload = build_chat_payload(
        "Tell me about react in 5 words",
        model="RedHatAI/Qwen3.6-35B-A3B-NVFP4",
        stream=False,
    )

    assert payload == {
        "messages": [{"content": "Tell me about react in 5 words", "role": "user"}],
        "stream": False,
        "model": "RedHatAI/Qwen3.6-35B-A3B-NVFP4",
    }


def test_combine_prompt_and_pdf() -> None:
    content = combine_prompt_and_pdf(
        prompt_prefix="Summarize this:",
        pdf_text="[Page 1]\nHello",
    )

    assert content == "Summarize this:\n\n[Page 1]\nHello"


def test_combine_pdf_only_when_no_prompt() -> None:
    assert combine_prompt_and_pdf(prompt_prefix=" ", pdf_text="PDF text") == "PDF text"
