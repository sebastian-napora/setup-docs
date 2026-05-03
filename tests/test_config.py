from pathlib import Path

from pdf_chat_service.config import Settings


def test_settings_ignore_launcher_ssl_env_file_keys(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("CHAT_COMPLETIONS_URL", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "CHAT_COMPLETIONS_URL=http://example.test:11112/v1/chat/completions",
                "APP_SSL_CERT=/tmp/app.crt",
                "APP_SSL_KEY=/tmp/app.key",
            ]
        ),
        encoding="utf-8",
    )

    settings = Settings(_env_file=env_file)

    assert settings.chat_completions_url == "http://example.test:11112/v1/chat/completions"


def test_audio_transcriptions_url_defaults_to_asr_endpoint_on_chat_host() -> None:
    settings = Settings(
        chat_completions_url="http://192.168.0.80:11112/v1/chat/completions",
        audio_transcriptions_url=None,
    )

    assert settings.resolved_audio_transcriptions_url() == (
        "http://192.168.0.80:11114/v1/audio/transcriptions"
    )


def test_audio_transcriptions_url_normalizes_local_bind_address_to_asr_port() -> None:
    settings = Settings(
        chat_completions_url="http://0.0.0.0:11112/v1/chat/completions",
        audio_transcriptions_url=None,
    )

    assert settings.resolved_audio_transcriptions_url() == (
        "http://127.0.0.1:11114/v1/audio/transcriptions"
    )
