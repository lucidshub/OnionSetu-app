from fastapi import APIRouter

router = APIRouter()

@router.get("")
def list_policies():
    return [
        {"policy_id":"PROCUREMENT-2026","version":"v2026.1","size_band":{"min":35,"max":70},"defect_tolerances":{"rotten":2,"sprouted":3,"damaged":5},"is_active":True},
        {"policy_id":"PROCUREMENT-2025","version":"v2025.2","size_band":{"min":45,"max":65},"is_active":False},
    ]

@router.get("/{policy_id}")
def get_policy(policy_id: str):
    return {"policy_id": policy_id, "version":"v2026.1"}

@router.post("")
def create_policy(policy: dict):
    return {"policy_id": "PROCUREMENT-2026", "version":"v1"}

@router.post("/{policy_id}/activate")
def activate(policy_id: str):
    return {"policy_id": policy_id, "status":"ACTIVE", "audit_event":"POLICY_SWITCHED"}
