# OnionSetu / ONIONGRADE LEDGER — Prototype Repository

**Team:** BG Coders — SIH 2026 — Problem Statement 26031
**Stack:** Flutter (SQLite, offline-first) + OpenCV + YOLOv8 Nano + MobileNetV2 (TFLite, on-device) + FastAPI + Supabase (Postgres + Storage) + OTP/JWT + SHA-256 hash chain
**Web Demo:** Responsive Vite React prototype at `/` faithfully represents the Flutter mobile workflow for judging (same 12-step pipeline).

## Quick Start

### Web Prototype (current demo)
```bash
cd onion-setu
npm install
npm run dev # http://localhost:5173
```

### Flutter App (offline-first field app)
```bash
cd flutter_app
flutter pub get
flutter run # requires Flutter SDK + Android device
# TFLite models: assets/models/yolov8n.onion.tflite , mobilenetv2_defect.tflite
# See docs/AI_PIPELINE.md for model interfaces (DemoAIEngine vs TFLiteAIEngine)
```

### FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Supabase env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Storage buckets: assessment-images, reports (see docs/DATABASE_SCHEMA.md)
```

## Implementation Contract
This prototype implements the **Master Spec v1 (PRD+TRD+System Design)** verbatim — see `docs/`:
- `PRD.md` — Product vision, users, MVP scope
- `TRD.md` — Technical decisions (why Flutter, YOLOv8 Nano, MobileNetV2, OpenCV, FastAPI, Supabase)
- `ARCHITECTURE.md` — High-level + data flow
- `AI_PIPELINE.md` — YOLOv8 detection + MobileNetV2 defect + OpenCV size + TFLite
- `GRADING_POLICY.md` — Versioned policy, A/B/C/URS, aggregation
- `DATABASE_SCHEMA.md` — Supabase + SQLite schema, RLS
- `API_SPEC.md` — FastAPI contract (auth, sessions, reports, disputes, sync)
- `SYNC_DESIGN.md` — Offline queue, retry, idempotency
- `AUDIT_DESIGN.md` — SHA-256 + hash chain, append-only
- `README.md` — This file

Do not replace Flutter with React Native, FastAPI with Node, Supabase with Mongo/Firebase, or YOLO/MobileNetV2 with cloud LLM — use mock `DemoAIEngine` behind the same interfaces if TFLite files are not yet bundled.

## Test the 20 Acceptance Tests
See `docs/README.md` §46 — Login OTP → New Session → Capture → Quality Gate → YOLO → MobileNetV2+OpenCV → Confidence → Policy A/B/C/URS → A%/URS% → Human Review → Flag → Second Review → PDF+QR → SHA-256 → Offline → Sync → Regrade.

Live: https://onion-setu.vercel.app — Reports include the 9 requested fields + uploaded images + QR (scan opens `/verify/:id`, per-user Supabase persistence).
