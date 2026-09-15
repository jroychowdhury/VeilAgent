"""Audit log feed for the security dashboard."""

from fastapi import APIRouter, Depends

import database as db
from security import guard

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def logs(limit: int = 30, user=Depends(guard)):
    return {
        "summary": db.access_summary(),
        "access_logs": db.fetch("access_logs", limit),
        "agent_logs": db.fetch("agent_logs", limit),
    }


@router.get("/summary")
def summary(user=Depends(guard)):
    return db.access_summary()
