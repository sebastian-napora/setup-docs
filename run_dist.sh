#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
DIST_DIR="${FRONTEND_DIR}/dist"
VENV_DIR="${ROOT_DIR}/.venv"
CHAT_COMPLETIONS_URL_WAS_SET=0

if [ -n "${CHAT_COMPLETIONS_URL+x}" ]; then
  CHAT_COMPLETIONS_URL_WAS_SET=1
fi

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
BUILD_FRONTEND="${BUILD_FRONTEND:-0}"
FORCE_INSTALL="${FORCE_INSTALL:-0}"
MODEL_PORT="${MODEL_PORT:-11112}"
MODEL_ENDPOINT="${MODEL_ENDPOINT:-}"
MODEL_BASE_URL="${MODEL_BASE_URL:-}"
RUN_DIST_MODEL_PROMPT="${RUN_DIST_MODEL_PROMPT:-1}"

configure_model_base_url() {
  local base_url="${1%/}"

  export CHAT_COMPLETIONS_URL="${base_url}/v1/chat/completions"
  export IMAGE_CHAT_URL="${base_url}/v1/chat/image"
  export EMBEDDINGS_URL="${base_url}/v1/embeddings"
  export COMPRESS_URL="${base_url}/compress"
}

choose_model_endpoint() {
  local selected_base_url=""

  if [ -n "${MODEL_BASE_URL}" ]; then
    selected_base_url="${MODEL_BASE_URL}"
  elif [ -n "${MODEL_ENDPOINT}" ]; then
    case "${MODEL_ENDPOINT}" in
      1|local|localhost)
        selected_base_url="http://localhost:${MODEL_PORT}"
        ;;
      2|remote|lan|network|192.168.0.80)
        selected_base_url="http://192.168.0.80:${MODEL_PORT}"
        ;;
      *)
        echo "ERROR: MODEL_ENDPOINT must be local, remote, 1, or 2." >&2
        exit 1
        ;;
    esac
  elif [ "${RUN_DIST_MODEL_PROMPT}" = "1" ] && [ "${CHAT_COMPLETIONS_URL_WAS_SET}" = "0" ] && [ -t 0 ]; then
    local choice=""
    cat <<PROMPT
Choose model endpoint:
  1) http://localhost:${MODEL_PORT}
  2) http://192.168.0.80:${MODEL_PORT}
  3) keep current ${CHAT_COMPLETIONS_URL:-http://0.0.0.0:${MODEL_PORT}/v1/chat/completions}
PROMPT
    read -r -p "Select [1]: " choice
    case "${choice:-1}" in
      1)
        selected_base_url="http://localhost:${MODEL_PORT}"
        ;;
      2)
        selected_base_url="http://192.168.0.80:${MODEL_PORT}"
        ;;
      3)
        return
        ;;
      *)
        echo "ERROR: choose 1, 2, or 3." >&2
        exit 1
        ;;
    esac
  fi

  if [ -n "${selected_base_url}" ]; then
    configure_model_base_url "${selected_base_url}"
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

  if [ "${FORCE_INSTALL}" = "1" ] || [ ! -f "${VENV_DIR}/.pdf_chat_runtime_installed" ] || [ "${ROOT_DIR}/pyproject.toml" -nt "${VENV_DIR}/.pdf_chat_runtime_installed" ]; then
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

choose_model_endpoint
MODEL_URL="${CHAT_COMPLETIONS_URL:-http://0.0.0.0:${MODEL_PORT}/v1/chat/completions}"

APP_SCHEME="http"
_use_ssl=0
if [ -n "${APP_SSL_CERT}" ] && [ -n "${APP_SSL_KEY}" ]; then
  if [ -r "${APP_SSL_CERT}" ] && [ -r "${APP_SSL_KEY}" ]; then
    APP_SCHEME="https"
    _use_ssl=1
  else
    echo "WARNING: APP_SSL_CERT/APP_SSL_KEY are set but not readable by $(whoami)." >&2
    echo "         Run 'sudo bash setup_ssl.sh' to fix cert permissions." >&2
    echo "         Starting in HTTP mode." >&2
  fi
fi

cat <<INFO
PDF Chat Completions
====================

This serves the FastAPI API and the built React app from one Python server.

Model endpoint:
  ${MODEL_URL}

App:
  ${APP_SCHEME}://localhost:${APP_PORT}

Static files:
  ${DIST_DIR}

Endpoint choice shortcuts:
  MODEL_ENDPOINT=local ./run_dist.sh
  MODEL_ENDPOINT=remote ./run_dist.sh

HTTPS via Tailscale (enables microphone recording):
  sudo bash setup_ssl.sh   # issue certs once, then just run:
  ./run_dist.sh

Press Ctrl+C to stop the server.

INFO

require_free_port "${APP_PORT}"
ensure_backend_dependencies
ensure_frontend_dist

uvicorn_args=(
  pdf_chat_service.app:app
  --host "${APP_HOST}"
  --port "${APP_PORT}"
)

if [ "${_use_ssl}" = "1" ]; then
  uvicorn_args+=(--ssl-certfile "${APP_SSL_CERT}" --ssl-keyfile "${APP_SSL_KEY}")
fi

exec "${VENV_DIR}/bin/uvicorn" "${uvicorn_args[@]}"
