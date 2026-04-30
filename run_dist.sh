#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
DIST_DIR="${FRONTEND_DIR}/dist"
VENV_DIR="${ROOT_DIR}/.venv"

APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8080}"
BUILD_FRONTEND="${BUILD_FRONTEND:-0}"
FORCE_INSTALL="${FORCE_INSTALL:-0}"
MODEL_URL="${CHAT_COMPLETIONS_URL:-http://192.168.0.80:11112/v1/chat/completions}"

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "ERROR: ${command_name} was not found. ${install_hint}" >&2
    exit 1
  fi
}

require_free_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "ERROR: port ${port} is already in use." >&2
      echo "Stop the existing process or run with another port, for example:" >&2
      echo "  APP_PORT=8081 ./run_dist.sh" >&2
      exit 1
    fi
  fi
}

ensure_backend_dependencies() {
  require_command "python3" "Install Python 3.10+ and run this script again."

  if [ ! -x "${VENV_DIR}/bin/python" ]; then
    echo "Creating Python virtual environment in .venv..."
    python3 -m venv "${VENV_DIR}"
  fi

  if [ "${FORCE_INSTALL}" = "1" ] || [ ! -f "${VENV_DIR}/.pdf_chat_runtime_installed" ]; then
    echo "Installing Python runtime dependencies..."
    "${VENV_DIR}/bin/python" -m pip install --upgrade pip
    "${VENV_DIR}/bin/python" -m pip install -e "."
    touch "${VENV_DIR}/.pdf_chat_runtime_installed"
  fi
}

ensure_frontend_dist() {
  if [ "${BUILD_FRONTEND}" = "1" ]; then
    require_command "yarn" "Install Yarn or enable Corepack, then run this script again."
    echo "Building React app into frontend/dist..."
    (
      cd "${FRONTEND_DIR}"
      yarn
      yarn build
    )
  fi

  if [ ! -f "${DIST_DIR}/index.html" ]; then
    cat >&2 <<ERROR
ERROR: ${DIST_DIR}/index.html was not found.

Build the React app first:
  cd frontend
  yarn
  yarn build

Or let this script build it:
  BUILD_FRONTEND=1 ./run_dist.sh
ERROR
    exit 1
  fi
}

cat <<INFO
PDF Chat Completions
====================

This serves the FastAPI API and the built React app from one Python server.

Model endpoint:
  ${MODEL_URL}

App:
  http://localhost:${APP_PORT}

Static files:
  ${DIST_DIR}

Press Ctrl+C to stop the server.

INFO

require_free_port "${APP_PORT}"
ensure_backend_dependencies
ensure_frontend_dist

exec "${VENV_DIR}/bin/uvicorn" pdf_chat_service.app:app --host "${APP_HOST}" --port "${APP_PORT}"
