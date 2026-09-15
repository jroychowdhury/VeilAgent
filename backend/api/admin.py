"""Admin-only endpoint. Used to demonstrate authorization (403) as distinct from
authentication (401): a valid customer token still gets refused here.
"""

from fastapi import APIRouter, Depends

from security import guard

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/accounts")
def all_accounts(user=Depends(guard)):
    return {
        "requested_by": user["id"],
        "accounts": [
            {"client_id": "VEIL-001", "role": "customer"},
            {"client_id": "VEIL-ADM", "role": "admin"},
        ],
    }
