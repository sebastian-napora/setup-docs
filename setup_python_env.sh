#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${VENV_DIR:-${ROOT_DIR}/.venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
FORCE_INSTALL="${FORCE_INSTALL:-0}"
CREATE_ENV_FILE="${CREATE_ENV_FILE:-1}"
INSTALL_MARKER="${VENV_DIR}/.pdf_chat_dev_installed"

usage() {
  cat <<USAGE
Usage: ./setup_python_env.sh [options]

Set up the Python developer environment for PDF Chat Completions.

Options:
  --python PATH      Python executable to use instead of python3
  --venv PATH        Virtual environment path instead of .venv
  --force            Reinstall Python dependencies even if setup already ran
  --no-env-file      Do not create .env from .env.example
  -h, --help         Show this help

Environment variables:
  PYTHON_BIN         Same as --python
  VENV_DIR           Same as --venv
  FORCE_INSTALL=1    Same as --force
  CREATE_ENV_FILE=0  Same as --no-env-file
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --python)
      if [ "$#" -lt 2 ]; then
        echo "ERROR: --python requires a path." >&2
        exit 1
      fi
      PYTHON_BIN="$2"
      shift 2
      ;;
    --venv)
      if [ "$#" -lt 2 ]; then
        echo "ERROR: --venv requires a path." >&2
        exit 1
      fi
      VENV_DIR="$2"
      INSTALL_MARKER="${VENV_DIR}/.pdf_chat_dev_installed"
      shift 2
      ;;
    --force)
      FORCE_INSTALL="1"
      shift
      ;;
    --no-env-file)
      CREATE_ENV_FILE="0"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "ERROR: ${command_name} was not found. ${install_hint}" >&2
    exit 1
  fi
}

check_python_version() {
  local python_version

  python_version="$("${PYTHON_BIN}" -c 'import sys; print(".".join(map(str, sys.version_info[:3]))); raise SystemExit(0 if sys.version_info >= (3, 10) else 1)')" || {
    echo "ERROR: ${PYTHON_BIN} is Python ${python_version:-unknown}. Python 3.10+ is required." >&2
    exit 1
  }

  echo "Using Python ${python_version}: $(command -v "${PYTHON_BIN}")"
}

create_virtualenv() {
  if [ ! -x "${VENV_DIR}/bin/python" ]; then
    echo "Creating virtual environment: ${VENV_DIR}"
    mkdir -p "$(dirname "${VENV_DIR}")"
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
  else
    echo "Virtual environment already exists: ${VENV_DIR}"
  fi
}

install_dependencies() {
  if [ "${FORCE_INSTALL}" = "1" ] || [ ! -f "${INSTALL_MARKER}" ] || [ "${ROOT_DIR}/pyproject.toml" -nt "${INSTALL_MARKER}" ]; then
    echo "Installing Python developer dependencies..."
    "${VENV_DIR}/bin/python" -m pip install --upgrade pip
    (
      cd "${ROOT_DIR}"
      "${VENV_DIR}/bin/python" -m pip install -e ".[dev]"
    )
    touch "${INSTALL_MARKER}"
  else
    echo "Python dependencies already installed. Use --force to reinstall."
  fi
}

prepare_project_files() {
  mkdir -p "${ROOT_DIR}/docs" "${ROOT_DIR}/response"

  if [ "${CREATE_ENV_FILE}" = "1" ] && [ -f "${ROOT_DIR}/.env.example" ] && [ ! -f "${ROOT_DIR}/.env" ]; then
    cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
    echo "Created .env from .env.example"
  fi
}

verify_installation() {
  echo "Verifying Python imports..."
  "${VENV_DIR}/bin/python" -c 'import fastapi, httpx, pypdf, uvicorn; print("Python environment OK")'
}

require_command "${PYTHON_BIN}" "Install Python 3.10+ and run this script again."
check_python_version
create_virtualenv
install_dependencies
prepare_project_files
verify_installation

cat <<INFO

Python developer environment is ready.

Activate it:
  source "${VENV_DIR}/bin/activate"

Run tests:
  pytest

Run the backend:
  ./run.sh

Run backend and frontend together:
  ./run_app.sh

INFO
