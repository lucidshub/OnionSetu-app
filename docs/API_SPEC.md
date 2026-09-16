# OnionSetu — API Spec (FastAPI Gateway → Supabase)

Base: `/api` — Auth: `Authorization: Bearer <JWT>` (OTP → JWT)

## Auth
- `POST /auth/request-otp` `{identifier, role}` → 200 + OTP sent (Supabase email or SMS fallback mock, 5m TTL)
- `POST /auth/verify-otp` `{identifier, code, role}` → `{jwt, user}` — creates `profiles` row
- `POST /auth/refresh` `{refresh_token}` → new JWT

## Sessions
- `POST /sessions` `{lot_id, farmer, center, location}` → `201 {session_id}`
- `GET /sessions/{session_id}` → session + metadata
- `GET /sessions` → list (RLS: farmer own, grader all)

## Samples
- `POST /sessions/{session_id}/images` (multipart, 3 views, ≥1 with 25mm ref) → `{image_ids, quality_gate}`
- `GET /sessions/{session_id}/images` → list with storage refs

## Analysis
- `POST /sessions/{session_id}/analyze` → triggers YOLOv8 + MobileNetV2 (or OnionSetu.ai) → `{onion_results}`
- `GET /sessions/{session_id}/results` → per-onion size/defect/conf/grade + lot A%/URS%

## Policies
- `GET /policies` → list
- `GET /policies/{policy_id}` → detail
- `POST /policies` (admin) → create version
- `POST /policies/{policy_id}/activate` → set `is_active`, audit event
- `POST /sessions/{session_id}/regrade` `{policy_version}` → re-run grading rules only (no AI)

## Reports
- `POST /sessions/{session_id}/report` → `{report_id, pdf_url, qr}` — generates HTML→ReportLab PDF + QR (`/reports/{id}/verify`)
- `GET /reports/{report_id}` → full report (header, parties, sampling, evidence, onion table, aggregate, explainability, traceability, hash)
- `GET /reports/{report_id}/pdf` → PDF file from Storage
- `GET /reports/{report_id}/verify` → QR verification (report_id, status, policy, timestamp, grade, hash)

## Disputes
- `POST /reports/{report_id}/dispute` `{reason}` → `{dispute_id}` (original report immutable)
- `GET /disputes` / `GET /disputes/{dispute_id}`
- `POST /disputes/{dispute_id}/review` `{decision}` → linked review record

## Sync
- `POST /sync/batch` `{assessments, onions, images_refs}` — idempotent via client `id`
- `POST /sync/image` (upload to Storage → return path)
- `POST /sync/report` (upload PDF)

## AI (wrapped)
- `POST /api/ai-analyze` `{images:[base64], policyVersion}` → `{model:"Prototype Demo Inference", results:[{id,sizeMm,defect,confidence,reasoning,grade}]}` — deterministic demo mock, no live model. Live AI runs in batch grading: `POST /api/analyze-batch` (Roboflow detection + Qwen assessment, policy v0.2).

All endpoints enforce RLS (farmer own, grader all, admin policies) and write `audit_logs` hash chain.
