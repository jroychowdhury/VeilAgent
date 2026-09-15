"""Token issue + verification for VeilAgent clients."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import database as db
from security import guard

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/token")
def issue_token(body: LoginRequest, request: Request):
    user = db.user_by_credentials(body.username, body.password)
    if user is None:
        db.log_access("UNKNOWN", "/auth/token", "BLOCKED", "Bad credentials")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    db.log_access(user["id"], "/auth/token", "ALLOWED", "Token issued")
    return {
        "client_id": user["id"],
        "role": user["role"],
        "token": user["token"],
    }


@router.get("/verify")
def verify(user=Depends(guard)):
    return {"client_id": user["id"], "role": user["role"], "status": "authorized"}
