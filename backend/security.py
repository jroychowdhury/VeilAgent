"""The security gate: authentication (who is calling) then authorization (may they)."""

from typing import Optional

from fastapi import HTTPException, Request

import database as db

# endpoint prefix -> roles allowed to use it
PERMISSIONS = {
    "/agent": {"customer", "admin"},
    "/audit": {"customer", "admin"},
    "/admin": {"admin"},
}


def _bearer(request: Request) -> Optional[str]:
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


def authenticate(request: Request):
    """Return the calling user, or raise 401 and log the blocked attempt."""
    endpoint = request.url.path
    token = _bearer(request)

    if not token:
        db.log_access("UNKNOWN", endpoint, "BLOCKED", "Missing bearer token")
        raise HTTPException(status_code=401, detail="Missing authorization token")

    user = db.user_by_token(token)
    if user is None:
        db.log_access("UNKNOWN", endpoint, "BLOCKED", "Invalid token")
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    return user


def authorize(request: Request, user) -> None:
    """Check the authenticated client's role against the endpoint, or raise 403."""
    endpoint = request.url.path
    required = None
    for prefix, roles in PERMISSIONS.items():
        if endpoint.startswith(prefix):
            required = roles
            break

    if required is not None and user["role"] not in required:
        db.log_access(
            user["id"],
            endpoint,
            "FORBIDDEN",
            f"Role '{user['role']}' lacks permission",
        )
        raise HTTPException(status_code=403, detail="Client not permitted on this endpoint")

    db.log_access(user["id"], endpoint, "ALLOWED", "Token and role verified")


def guard(request: Request):
    """FastAPI dependency: authenticate, then authorize."""
    user = authenticate(request)
    authorize(request, user)
    return user
