#!/usr/bin/env bash
set -euo pipefail

DOCS_DIR="${DOCS_DIR:-./docs}"
APP_PORT="${APP_PORT:-8080}"
FILE_CHAT_URL="${FILE_CHAT_URL:-${PDF_CHAT_URL:-http://localhost:${APP_PORT}/file/chat}}"
PROMPT_PREFIX="${PROMPT_PREFIX:-Found me please everything related to Frontend aplications, what special funcionalites we need to implement - return please as well sentences which are covered that your s summarization}"
STREAM="${STREAM:-false}"
MODEL="${MODEL:-}"
REQUESTED_FILE="${1:-}"

if [ ! -d "${DOCS_DIR}" ]; then
  echo "ERROR: docs folder was not found: ${DOCS_DIR}" >&2
  exit 1
fi

files=()
if [ -n "${REQUESTED_FILE}" ]; then
  if [ -f "${REQUESTED_FILE}" ]; then
    files+=("${REQUESTED_FILE}")
  elif [ -f "${DOCS_DIR}/${REQUESTED_FILE}" ]; then
    files+=("${DOCS_DIR}/${REQUESTED_FILE}")
  else
    echo "ERROR: file was not found as a path or inside ${DOCS_DIR}: ${REQUESTED_FILE}" >&2
    exit 1
  fi
else
  while IFS= read -r -d '' file; do
    files+=("${file}")
  done < <(
    find "${DOCS_DIR}" -type f \( -iname '*.pdf' -o -iname '*.md' -o -iname '*.markdown' \) -print0 \
      | sort -z
  )
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "No PDF or Markdown files found in ${DOCS_DIR}" >&2
  exit 1
fi

count=0

for file in "${files[@]}"; do
  count=$((count + 1))
  response_file="${TMPDIR:-/tmp}/load_docs_response_${count}_$$.json"
  echo
  echo "Uploading ${file}"

  curl_args=(
    -sS
    -X POST "${FILE_CHAT_URL}"
    -F "file=@${file}"
    -F "prompt_prefix=${PROMPT_PREFIX}"
    -F "stream=${STREAM}"
    -o "${response_file}"
    -w "%{http_code}"
  )

  if [ -n "${MODEL}" ]; then
    curl_args+=(-F "model=${MODEL}")
  fi

  status="$(curl "${curl_args[@]}")"
  echo "HTTP ${status}"

  if [ "${status}" -lt 200 ] || [ "${status}" -ge 300 ]; then
    cat "${response_file}"
    echo
    exit 1
  fi

  cat "${response_file}"
  echo
done

echo
echo "Uploaded ${count} file(s) from ${DOCS_DIR}"
