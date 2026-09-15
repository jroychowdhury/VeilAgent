@echo off
REM One command to start everything on Windows.
cd /d "%~dp0"

if not exist ".venv" (
  echo Creating virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
python -m pip install -r backend\requirements.txt

echo.
echo SecureBank demo : http://localhost:8000/
echo API docs        : http://localhost:8000/docs
echo Stop the server with Ctrl+C
echo.

cd backend
python -m uvicorn main:app --reload --port 8000
