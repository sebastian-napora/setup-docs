#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
VENV_DIR="${ROOT_DIR}/.venv"

if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT_DIR}/.env"
  set +a
fi

APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8080}"
APP_SSL_CERT="${APP_SSL_CERT:-}"
APP_SSL_KEY="${APP_SSL_KEY:-}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_RELOAD="${BACKEND_RELOAD:-0}"
FORCE_INSTALL="${FORCE_INSTALL:-0}"
MODEL_URL="${CHAT_COMPLETIONS_URL:-http://0.0.0.0:11112/v1/chat/completions}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - EXIT INT TERM

  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    echo "Stopping frontend (${FRONTEND_PID})..."
    kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi

  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    echo "Stopping backend (${BACKEND_PID})..."
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi

  if [ -n "${FRONTEND_PID}" ]; then
    wait "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi

  if [ -n "${BACKEND_PID}" ]; then
    wait "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
}

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
  local label="$2"

  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "ERROR: ${label} port ${port} is already in use." >&2
      echo "Stop the existing process or run with another port, for example:" >&2
      echo "  APP_PORT=8081 FRONTEND_PORT=5174 ./run_app.sh" >&2
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

  if [ "${FORCE_INSTALL}" = "1" ] || [ ! -f "${VENV_DIR}/.pdf_chat_installed" ] || [ "${ROOT_DIR}/pyproject.toml" -nt "${VENV_DIR}/.pdf_chat_installed" ]; then
    echo "Installing Python dependencies..."
    "${VENV_DIR}/bin/python" -m pip install --upgrade pip
    "${VENV_DIR}/bin/python" -m pip install -e ".[dev]"
    touch "${VENV_DIR}/.pdf_chat_installed"
  fi
}

ensure_frontend_dependencies() {
  require_command "yarn" "Install Yarn or enable Corepack, then run this script again."

  if [ "${FORCE_INSTALL}" = "1" ] || [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (
      cd "${FRONTEND_DIR}"
      yarn
    )
  fi
}

start_backend() {
  local backend_args=(
    "pdf_chat_service.app:app"
    "--host"
    "${APP_HOST}"
    "--port"
    "${APP_PORT}"
  )

  if [ "${BACKEND_RELOAD}" = "1" ]; then
    backend_args+=("--reload")
  fi

  if [ -n "${APP_SSL_CERT}" ] && [ -n "${APP_SSL_KEY}" ]; then
    if [ -r "${APP_SSL_CERT}" ] && [ -r "${APP_SSL_KEY}" ]; then
      backend_args+=(--ssl-certfile "${APP_SSL_CERT}" --ssl-keyfile "${APP_SSL_KEY}")
    else
      echo "WARNING: APP_SSL_CERT/APP_SSL_KEY are set but not readable by $(whoami)." >&2
      echo "         Run 'sudo bash setup_ssl.sh' to fix cert permissions." >&2
      echo "         Starting backend in HTTP mode." >&2
    fi
  fi

  echo "Starting backend: http${APP_SSL_CERT:+s}://localhost:${APP_PORT}"
  (
    cd "${ROOT_DIR}"
    "${VENV_DIR}/bin/uvicorn" "${backend_args[@]}"
  ) &
  BACKEND_PID="$!"
}

start_frontend() {
  echo "Starting frontend: http://localhost:${FRONTEND_PORT}"
  (
    cd "${FRONTEND_DIR}"
    yarn dev --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
  ) &
  FRONTEND_PID="$!"
}

trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT

cat <<INFO
PDF Chat Completions
====================

This starts the backend API and React frontend together.

Model endpoint:
  ${MODEL_URL}

Backend:
  http${APP_SSL_CERT:+s}://localhost:${APP_PORT}

Frontend:
  https://localhost:${FRONTEND_PORT}

HTTPS via Tailscale (enables microphone recording):
  APP_SSL_CERT=~/.config/tailscale/certs/aitopatom-4fc6.tailca9a17.ts.net.crt \\
  APP_SSL_KEY=~/.config/tailscale/certs/aitopatom-4fc6.tailca9a17.ts.net.key \\
  ./run_app.sh

Press Ctrl+C to stop both processes.

INFO

require_free_port "${APP_PORT}" "Backend"
require_free_port "${FRONTEND_PORT}" "Frontend"
ensure_backend_dependencies
ensure_frontend_dependencies

start_backend
start_frontend

while true; do
  if ! kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    echo "Backend process stopped unexpectedly." >&2
    exit 1
  fi

  if ! kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    echo "Frontend process stopped unexpectedly." >&2
    exit 1
  fi

  sleep 1
done
