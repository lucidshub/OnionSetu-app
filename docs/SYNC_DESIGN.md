# OnionSetu — Sync Design (Offline-First)

## Local Queue (SQLite)
Every local record has `uuid, created_at, updated_at, sync_status`. States: `PENDING_SYNC → SYNCING → SYNCED` or `SYNC_FAILED → retry`.

## Flow
```
Local record (PENDING_SYNC) → connectivity detected → HTTP queue (exponential backoff) → FastAPI → Supabase Postgres/Storage → SYNCED
```
Images: store locally → queue upload → Supabase Storage `assessment-images/{user_id}/{report_id}/view_0.jpg` → save `storage_path` + `public_url` in `assessment_images` → mark synced.
Reports: generate locally → store → queue upload → Storage `reports/{id}.pdf` → save ref → SYNCED.

## Retry & Idempotency
- Retry with exponential backoff on `SYNC_FAILED`.
- Client-generated UUIDs as idempotency keys — `INSERT ... ON CONFLICT (id) DO NOTHING` avoids duplicates on retry.
- `syncAll()` in `lib/store.jsx` pushes all `Offline/Pending` assessments + onions + images in order.

## Offline-Capable (no internet needed)
Session creation, capture, image validation (OpenCV Laplacian), AI inference (YOLOv8 Nano + MobileNetV2 TFLite or DemoAIEngine), size estimation, policy evaluation, confidence gate, human review, report + QR generation, local viewing.

## Online-Only
Central sync, cross-center verification (`/verify/:id` fetching from Supabase), admin policy activation, central dispute resolution.

## Current Web Demo
`lib/store.jsx` keeps `localStorage` cache (`onion-setu-v1`) + Supabase sync: `fetchAssessments()` on auth change, `addAssessment()` optimistic local + async Supabase insert (with `user_id = auth.uid()` if real UUID), `syncAll()` for Offline items. If `VITE_SUPABASE_*` not set or `supabase` null, it stays local-only (graceful fallback).
