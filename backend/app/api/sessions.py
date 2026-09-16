from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import uuid

router = APIRouter()

class SessionCreate(BaseModel):
    lot_id: str
    farmer: str
    center: str
    location: str | None = None

@router.post("")
def create_session(body: SessionCreate):
    sid = f"SESS-{uuid.uuid4().hex[:8].upper()}"
    return {"session_id": sid, "lot_id": body.lot_id}

@router.get("/{session_id}")
def get_session(session_id: str):
    return {"session_id": session_id, "status": "active"}

@router.get("")
def list_sessions():
    return [{"session_id": "SESS-001", "lot_id": "LOT-0241"}]

@router.post("/{session_id}/images")
def upload_images(session_id: str):
    return {"image_ids": ["img-001"], "quality_gate": "PASS"}

@router.get("/{session_id}/images")
def list_images(session_id: str):
    return [{"image_id": "img-001", "storage_path": f"assessment-images/{session_id}/view_0.jpg"}]

@router.post("/{session_id}/analyze")
def analyze(session_id: str):
    # Triggers Roboflow detection + Qwen assessment — returns onion results
    return {"onion_results": [{"onion_id":"ONION-001","size_mm":54.2,"defect_class":"healthy","confidence":0.94}]}

@router.get("/{session_id}/results")
def get_results(session_id: str):
    return {"grades": {"A": 50, "B": 20, "C": 20, "Reject": 10}, "urs_percent": 12, "onions": []}

@router.post("/{session_id}/regrade")
def regrade(session_id: str, policy_version: str):
    return {"policy_version": policy_version, "grades": {"A": 50, "B": 20, "C": 20, "Reject": 10}, "urs_percent": 12}
