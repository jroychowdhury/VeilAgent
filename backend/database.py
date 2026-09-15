"""SQLite storage for users, access logs and agent logs."""

import pathlib
import sqlite3
from datetime import datetime
from typing import Any, Optional

DB_PATH = pathlib.Path(__file__).resolve().parent.parent / "database" / "veilagent.db"

# Demo clients. The extension ships with the VEIL-001 token.
SEED_USERS = [
    ("VEIL-001", "demo", "customer", "veil-demo-token-001"),
    ("VEIL-ADM", "admin", "admin", "veil-admin-token-002"),
]


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id        TEXT PRIMARY KEY,
                username  TEXT NOT NULL,
                role      TEXT NOT NULL,
                token     TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS access_logs (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp  TEXT NOT NULL,
                client_id  TEXT NOT NULL,
                endpoint   TEXT NOT NULL,
                status     TEXT NOT NULL,
                reason     TEXT
            );

            CREATE TABLE IF NOT EXISTS agent_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   TEXT NOT NULL,
                client_id   TEXT NOT NULL,
                task        TEXT,
                action      TEXT,
                result      TEXT,
                redactions  INTEGER DEFAULT 0
            );
            """
        )
        for uid, username, role, token in SEED_USERS:
            conn.execute(
                "INSERT OR IGNORE INTO users (id, username, role, token) VALUES (?,?,?,?)",
                (uid, username, role, token),
            )


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def user_by_token(token: str) -> Optional[sqlite3.Row]:
    with connect() as conn:
        cur = conn.execute("SELECT * FROM users WHERE token = ?", (token,))
        return cur.fetchone()


def user_by_credentials(username: str, password: str) -> Optional[sqlite3.Row]:
    # Prototype only: the demo password is the username + "123".
    if password != f"{username}123":
        return None
    with connect() as conn:
        cur = conn.execute("SELECT * FROM users WHERE username = ?", (username,))
        return cur.fetchone()


def log_access(client_id: str, endpoint: str, status: str, reason: str = "") -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO access_logs (timestamp, client_id, endpoint, status, reason)"
            " VALUES (?,?,?,?,?)",
            (now(), client_id, endpoint, status, reason),
        )


def log_agent(client_id: str, task: str, action: str, result: str, redactions: int = 0) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO agent_logs (timestamp, client_id, task, action, result, redactions)"
            " VALUES (?,?,?,?,?,?)",
            (now(), client_id, task, action, result, redactions),
        )


def fetch(table: str, limit: int = 50) -> list[dict[str, Any]]:
    with connect() as conn:
        cur = conn.execute(
            f"SELECT * FROM {table} ORDER BY id DESC LIMIT ?", (limit,)  # noqa: S608
        )
        return [dict(row) for row in cur.fetchall()]


def access_summary() -> dict[str, int]:
    with connect() as conn:
        cur = conn.execute("SELECT status, COUNT(*) AS n FROM access_logs GROUP BY status")
        counts = {row["status"]: row["n"] for row in cur.fetchall()}
    return {
        "allowed": counts.get("ALLOWED", 0),
        "blocked": counts.get("BLOCKED", 0) + counts.get("FORBIDDEN", 0),
        "unauthorized_attempts": counts.get("BLOCKED", 0),
        "forbidden_attempts": counts.get("FORBIDDEN", 0),
    }
