#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "==> Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install

echo "==> Building frontend..."
npm run build

echo "==> Done. Output: $FRONTEND_DIR/dist"
