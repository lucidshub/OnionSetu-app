from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, sessions, reports, disputes, policies, sync

app = FastAPI(title="OnionSetu FastAPI Gateway", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(disputes.router, prefix="/disputes", tags=["disputes"])
app.include_router(policies.router, prefix="/policies", tags=["policies"])
app.include_router(sync.router, prefix="/sync", tags=["sync"])

@app.get("/")
def root(): return {"service":"OnionSetu FastAPI Gateway → Supabase (Postgres + Storage)", "docs":"/docs"}

@app.get("/health")
def health(): return {"status":"ok", "stack":"Roboflow detection + Qwen assessment + FastAPI + Supabase"}
