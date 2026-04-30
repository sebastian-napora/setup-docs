#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${APP_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DRY_RUN="${DRY_RUN:-0}"
FORCE="${FORCE:-0}"

require_command() {
  local command_name="$1"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "ERROR: ${command_name} was not found." >&2
    exit 1
  fi
}

pids_for_port() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

stop_port() {
  local label="$1"
  local port="$2"
  local pids=()
  local pid

  while IFS= read -r pid; do
    if [ -n "${pid}" ]; then
      pids+=("${pid}")
    fi
  done < <(pids_for_port "${port}")

  if [ "${#pids[@]}" -eq 0 ]; then
    echo "${label}: no server listening on port ${port}"
    return
  fi

  echo "${label}: stopping port ${port} pid(s): ${pids[*]}"
  if [ "${DRY_RUN}" = "1" ]; then
    return
  fi

  kill "${pids[@]}" >/dev/null 2>&1 || true
  sleep 1

  if [ "${FORCE}" = "1" ]; then
    local remaining=()
    while IFS= read -r pid; do
      if [ -n "${pid}" ]; then
        remaining+=("${pid}")
      fi
    done < <(pids_for_port "${port}")

    if [ "${#remaining[@]}" -gt 0 ]; then
      echo "${label}: force stopping pid(s): ${remaining[*]}"
      kill -9 "${remaining[@]}" >/dev/null 2>&1 || true
    fi
  fi
}

require_command "lsof"

cat <<INFO
Stopping PDF Chat Completions
=============================

Backend port:
  ${APP_PORT}

Frontend port:
  ${FRONTEND_PORT}

INFO

stop_port "Backend" "${APP_PORT}"
stop_port "Frontend" "${FRONTEND_PORT}"

echo "Done."
