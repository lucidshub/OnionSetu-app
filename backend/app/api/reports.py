from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

@router.post("/{session_id}/report")
def create_report(session_id: str):
    rid = f"RPT-{session_id}"
    return {"report_id": rid, "pdf_url": f"/reports/{rid}/pdf", "qr": f"/reports/{rid}/verify", "hash": "a3f9..."}

@router.get("/{report_id}")
def get_report(report_id: str):
    return {"report_id": report_id, "grades": {"A": 50, "B": 20, "C": 20, "Reject": 10}, "urs_percent": 12, "policy_version": "v2026.1", "hash": "computed-sha256"}

@router.get("/{report_id}/pdf")
def get_pdf(report_id: str):
    return {"pdf_path": f"reports/{report_id}.pdf"}

@router.get("/{report_id}/verify")
def verify(report_id: str):
    return {"report_id": report_id, "status": "Verified", "grades": {"A": 50, "B": 20, "C": 20, "Reject": 10}, "urs_percent": 12, "policy_version": "v2026.1", "hash": "computed-sha256"}
