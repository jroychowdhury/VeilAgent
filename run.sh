#!/usr/bin/env bash
# One command to start everything: creates a virtualenv, installs deps, runs the server.
set -e
cd "$(dirname "$0")"

PY=python3
command -v python3 >/dev/null 2>&1 || PY=python

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  $PY -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
python -m pip install -r backend/requirements.txt

echo ""
echo "SecureBank demo : http://localhost:8000/"
echo "API docs        : http://localhost:8000/docs"
echo "Stop the server with Ctrl+C"
echo ""

cd backend
python -m uvicorn main:app --reload --port 8000
