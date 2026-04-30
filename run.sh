#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT_DIR}/.env"
  set +a
fi

APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8080}"
MODEL_URL="${CHAT_COMPLETIONS_URL:-http://0.0.0.0:11112/v1/chat/completions}"
VENV_DIR=".venv"

cat <<INFO
PDF Chat Completions
====================

This script will run the PDF upload service.

Before using it, make sure your local model server is running here:
  ${MODEL_URL}

The service will start here:
  http://localhost:${APP_PORT}

React dev UI:
  cd frontend && yarn && yarn dev
  http://localhost:5173

After it starts, upload a PDF from another terminal:
  curl -X POST "http://localhost:${APP_PORT}/pdf/chat" \\
    -F "file=@/path/to/your-file.pdf" \\
    -F "prompt_prefix=Summarize this PDF:"

Health check:
  http://localhost:${APP_PORT}/health

INFO

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 was not found. Install Python 3.10+ and run this script again."
  exit 1
fi

if [ ! -d "${VENV_DIR}" ]; then
  echo "Creating virtual environment in ${VENV_DIR}..."
  python3 -m venv "${VENV_DIR}"
fi

# shellcheck source=/dev/null
source "${VENV_DIR}/bin/activate"

echo "Installing/updating Python dependencies..."
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"

echo
echo "Checking whether the model endpoint is reachable..."
if curl -fsS --max-time 2 "${MODEL_URL%/chat/completions}/models" >/dev/null 2>&1; then
  echo "Model server responded at ${MODEL_URL%/chat/completions}/models"
else
  cat <<WARN
WARNING: Could not confirm the model server is reachable.

That may be okay if your server does not expose /v1/models, but /pdf/chat will fail
until this endpoint accepts POST requests:
  ${MODEL_URL}

WARN
fi

echo "Starting service..."
echo
exec uvicorn pdf_chat_service.app:app --reload --host "${APP_HOST}" --port "${APP_PORT}"
