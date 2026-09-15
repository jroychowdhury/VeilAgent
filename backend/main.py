"""VeilAgent backend.

Serves three things on one port (default 8000):
  /                 the simulated SecureBank website (static files)
  /auth, /agent     the authorised agent endpoints
  /audit            security + agent logs for the dashboard
"""

import pathlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import admin, agent, audit, auth
from database import init_db

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANK_DIR = ROOT / "banking-demo"

app = FastAPI(
    title="VeilAgent Backend",
    description="Privacy-preserving autonomous banking agent - prototype backend",
    version="0.1.0",
)

# The extension talks to us from the page's origin, so allow the demo origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(agent.router)
app.include_router(audit.router)
app.include_router(admin.router)


@app.on_event("startup")
def startup() -> None:
    init_db()
    print("\n  VeilAgent backend ready")
    print("  SecureBank demo : http://localhost:8000/")
    print("  API docs        : http://localhost:8000/docs")
    print("  Audit logs      : http://localhost:8000/audit/logs\n")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "veilagent-backend"}


# Mounted last so the API routes above win.
app.mount("/", StaticFiles(directory=str(BANK_DIR), html=True), name="bank")
