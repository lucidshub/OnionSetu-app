from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class DisputeCreate(BaseModel):
    reason: str

@router.post("/{report_id}/dispute")
def create_dispute(report_id: str, body: DisputeCreate):
    return {"dispute_id": f"DISP-{report_id}", "status": "FLAGGED", "report_id": report_id}

@router.get("")
def list_disputes():
    return []

@router.get("/{dispute_id}")
def get_dispute(dispute_id: str):
    return {"dispute_id": dispute_id, "status": "FLAGGED"}

@router.post("/{dispute_id}/review")
def review_dispute(dispute_id: str, decision: str):
    return {"dispute_id": dispute_id, "status": "RESOLVED", "decision": decision}
