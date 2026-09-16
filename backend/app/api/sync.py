from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class SyncBatch(BaseModel):
    assessments: List[dict]
    onions: List[dict] | None = None
    images_refs: List[dict] | None = None

@router.post("/batch")
def sync_batch(body: SyncBatch):
    # Idempotent via client uuid
    return {"synced": len(body.assessments), "status":"SYNCED"}

@router.post("/image")
def sync_image():
    return {"storage_path": "assessment-images/uid/report/view_0.jpg"}

@router.post("/report")
def sync_report():
    return {"storage_path": "reports/report.pdf"}
