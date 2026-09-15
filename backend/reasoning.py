"""Reasoning layer.

The prototype ships a deterministic planner so the demo never depends on a model
being downloaded or an API key being present. It reads exactly the same sanitized
context an LLM/VLM would receive - element labels only, no redacted values - and
returns the same action JSON contract:

    {"action": "click", "target_index": 7, "target": "Transfer Money",
     "reason": "...", "done": false}

Swap in a real model by implementing `llm_decide` and setting VEILAGENT_REASONER=llm.
"""

import os
import re
from typing import Any, Optional

ACTIONS = {"click", "fill", "navigate", "scroll", "answer", "done"}

STOPWORDS = {
    "the", "a", "an", "to", "on", "in", "my", "me", "please", "and", "of",
    "for", "go", "open", "show", "click", "page", "i", "want", "can", "you",
}


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS}


def _score(task_tokens: set[str], element: dict[str, Any]) -> float:
    label = " ".join(
        str(element.get(k) or "")
        for k in ("label", "name", "placeholder", "aria_label", "id")
    )
    el_tokens = _tokens(label)
    if not el_tokens:
        return 0.0
    overlap = task_tokens & el_tokens
    if not overlap:
        return 0.0
    return len(overlap) / len(el_tokens | task_tokens) + 0.15 * len(overlap)


def _find(elements: list[dict], words: list[str], kinds: Optional[set[str]] = None):
    """First element whose label contains any of `words`."""
    for el in elements:
        if kinds and el.get("kind") not in kinds:
            continue
        label = " ".join(
            str(el.get(k) or "") for k in ("label", "name", "placeholder", "aria_label", "id")
        ).lower()
        if any(w in label for w in words):
            return el
    return None


def _action(action: str, element=None, value=None, reason="", done=False, message=None):
    payload = {
        "action": action,
        "target_index": element.get("index") if element else None,
        "target": (element.get("label") or element.get("name")) if element else None,
        "value": value,
        "reason": reason,
        "done": done,
    }
    if message:
        payload["message"] = message
    return payload


def _amount_in(task: str) -> Optional[str]:
    match = re.search(r"(?:rs\.?|inr|₹)?\s*([0-9][0-9,]{2,})", task.lower())
    if match:
        return match.group(1).replace(",", "")
    return None


def rule_decide(task: str, context: dict[str, Any]) -> dict[str, Any]:
    elements: list[dict] = context.get("elements", [])
    url = (context.get("url") or "").lower()
    task_l = task.lower()
    task_tokens = _tokens(task)

    on_transfer = "transfer" in url
    on_transactions = "transaction" in url
    on_login = "login" in url or url.endswith("/") or "index" in url

    # 1. Log in if we are sitting on the login screen.
    if on_login and _find(elements, ["username", "user id", "customer id"], {"input"}):
        username = _find(elements, ["username", "user id", "customer id"], {"input"})
        password = _find(elements, ["password"], {"input"})
        submit = _find(elements, ["sign in", "log in", "login"], {"button"})
        if username and not username.get("has_value"):
            return _action("fill", username, "demo", "Login form detected; entering demo user")
        if password and not password.get("has_value"):
            return _action("fill", password, "demo123", "Entering demo password")
        if submit:
            return _action("click", submit, reason="Submitting the login form")

    # 2. Money transfer intent.
    if any(w in task_l for w in ("transfer", "send money", "pay ", "remit")):
        if not on_transfer:
            target = _find(elements, ["transfer"], {"button", "link"})
            if target:
                return _action("click", target, reason="Navigating to the fund transfer page")
        amount_field = _find(elements, ["amount"], {"input"})
        amount = _amount_in(task)
        if amount_field and amount and not amount_field.get("has_value"):
            return _action("fill", amount_field, amount, f"Filling the transfer amount {amount}")
        review = _find(elements, ["review", "continue", "proceed"], {"button"})
        if review and on_transfer:
            return _action(
                "click", review, reason="Opening the transfer review step for user confirmation"
            )
        if on_transfer:
            return _action(
                "done", reason="Transfer page is open and prepared", done=True,
                message="Transfer page ready. A human still has to confirm the payment.",
            )

    # 3. Transactions / statement intent.
    if any(w in task_l for w in ("transaction", "statement", "history", "spending")):
        if not on_transactions:
            target = _find(elements, ["transaction", "statement"], {"button", "link"})
            if target:
                return _action("click", target, reason="Opening the transactions page")
        return _action(
            "done", reason="Transactions page is open", done=True,
            message="Transactions are on screen. Amounts stayed local - only labels were sent.",
        )

    # 4. Read-only questions about redacted values.
    if any(w in task_l for w in ("balance", "account number", "email", "phone", "ifsc")):
        return _action(
            "answer", done=True,
            reason="Requested value is classified sensitive and was redacted before transmission",
            message="That value was redacted on device, so the reasoning layer never received it. "
                    "It is visible to you on the page itself.",
        )

    # 5. Dashboard / home.
    if any(w in task_l for w in ("dashboard", "home", "account overview")):
        target = _find(elements, ["dashboard", "home"], {"button", "link"})
        if target:
            return _action("click", target, reason="Returning to the dashboard")

    # 6. Fallback: best label match anywhere on the page.
    scored = sorted(
        ((_score(task_tokens, el), el) for el in elements),
        key=lambda pair: pair[0],
        reverse=True,
    )
    if scored and scored[0][0] > 0.2:
        best = scored[0][1]
        if best.get("kind") == "input":
            return _action("fill", best, task.split()[-1], "Closest matching input field")
        return _action("click", best, reason="Closest matching control on the sanitized page")

    return _action(
        "done", done=True,
        reason="No control on the sanitized page matches this task",
        message="I could not map that task to anything on this page. Try: "
                "\"open the transfer page\" or \"show my transactions\".",
    )


def llm_decide(task: str, context: dict[str, Any]) -> dict[str, Any]:
    """Placeholder for an open-weight VLM/LLM (Qwen-VL, LLaVA, ...).

    Send `context` - which contains only sanitized labels - plus `task`, and parse
    the JSON the model returns. Falls back to the rule planner if anything fails.
    """
    return rule_decide(task, context)


def decide(task: str, context: dict[str, Any]) -> dict[str, Any]:
    backend = os.getenv("VEILAGENT_REASONER", "rules").lower()
    decision = llm_decide(task, context) if backend == "llm" else rule_decide(task, context)
    if decision.get("action") not in ACTIONS:
        decision = {"action": "done", "done": True, "reason": "Planner returned an unknown action"}
    decision["reasoner"] = backend
    return decision
