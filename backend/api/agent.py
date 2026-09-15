"""The reasoning endpoint. Only ever receives sanitized context."""

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

import database as db
import reasoning
from security import guard

router = APIRouter(prefix="/agent", tags=["agent"])


class SanitizedContext(BaseModel):
    url: str = ""
    page_title: str = ""
    elements: list[dict[str, Any]] = Field(default_factory=list)
    text_preview: str = ""
    redactions: int = 0
    screenshot_transmitted: bool = False
    vision_confidence: Optional[float] = None


class ReasonRequest(BaseModel):
    task: str
    context: SanitizedContext


@router.post("/reason")
def reason(body: ReasonRequest, user=Depends(guard)):
    context = body.context.model_dump()
    decision = reasoning.decide(body.task, context)
    db.log_agent(
        client_id=user["id"],
        task=body.task,
        action=f"{decision['action']} -> {decision.get('target') or '-'}",
        result=decision.get("reason", ""),
        redactions=context.get("redactions", 0),
    )
    return {
        "decision": decision,
        "received": {
            "elements": len(context.get("elements", [])),
            "redactions": context.get("redactions", 0),
            "screenshot_transmitted": context.get("screenshot_transmitted", False),
        },
    }


class ResultRequest(BaseModel):
    task: str = ""
    action: str = ""
    result: str = ""


@router.post("/result")
def record_result(body: ResultRequest, user=Depends(guard)):
    db.log_agent(user["id"], body.task, body.action, body.result)
    return {"recorded": True}


@router.get("/data")
def agent_data(user=Depends(guard)):
    """Exists mainly so an unauthorised client has a second endpoint to bounce off."""
    return {"client_id": user["id"], "sanitized_only": True}
