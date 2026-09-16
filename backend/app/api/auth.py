from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter()

class RequestOtpIn(BaseModel):
    identifier: str
    role: str

class VerifyOtpIn(BaseModel):
    identifier: str
    code: str
    role: str

@router.post("/request-otp")
def request_otp(body: RequestOtpIn):
    # Supabase Auth OTP via email/SMS (mock fallback if no SMS provider)
    return {"ok": True, "channel": "email" if "@" in body.identifier else "sms", "masked": body.identifier[:2]+"***"}

@router.post("/verify-otp")
def verify_otp(body: VerifyOtpIn):
    # Verify via supabase.auth.verifyOtp, issue JWT
    if len(body.code) != 6:
        raise HTTPException(400, "Invalid OTP")
    return {"jwt": "mock-jwt", "user": {"id": "mock-uuid", "role": body.role}}

@router.post("/refresh")
def refresh(refresh_token: str):
    return {"jwt": "mock-jwt-refreshed"}
