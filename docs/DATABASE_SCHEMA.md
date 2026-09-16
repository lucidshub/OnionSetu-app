# OnionSetu — Database Schema (Supabase Postgres + SQLite)

## Supabase Postgres (central)
- **profiles** (id uuid FK auth.users, role, name, center, location, phone) — auto-created via trigger `handle_new_user`
- **policies** (id, version unique, label, size_min, size_max, tolerances jsonb, description, effective_from, is_active)
- **assessments** (id text PK, user_id uuid FK, lot_id, farmer_name, center, location, assessor_name, policy_version FK, model_version default `OnionSetu.ai v1`, sample_size, grade_a, urs, status, sync_status, confidence, human_reviews, hash, farmer_ack, grader_ack, dispute_* , created_at, updated_at + trigger)
- **assessment_onions** (id uuid, assessment_id FK, onion_id, size_mm, defect, confidence, grade)
- **assessment_images** (id uuid, assessment_id FK, view_index 0-2, storage_path, public_url, unique(assessment_id, view_index))
- **reviews** (id uuid, assessment_id FK, onion_id, ai_defect, ai_confidence, human_decision, reviewed_by)
- **disputes** (id uuid, assessment_id FK, reason, reported_by, status Open/Reviewed/Resolved, review_decision)
- **audit_logs** (id uuid, assessment_id FK, action, actor_id, actor_role, details jsonb)
- **Storage buckets:** `assessment-images` (private), `reports` (private) — RLS: authenticated can upload/select own; grader sees all via policy `exists (select 1 from profiles where id=auth.uid() and role='grader')`

See `supabase_schema.sql` for full DDL, indexes, RLS policies, seed.

## SQLite (local, offline)
`local_users, grading_sessions, sample_images, onion_results, reports, policy_versions, acknowledgements, disputes, review_records, audit_logs, sync_queue` — each with `uuid, created_at, updated_at, sync_status (PENDING_SYNC/SYNCING/SYNCED/SYNC_FAILED)`.

## Relationships
```
users → grading_sessions → sample_images / onion_results / reports → report_items / acknowledgements / disputes / review_records
policies → policy_versions
model_versions
```
Every finalized report references `policy_version` + `model_version` (OnionSetu.ai v1 / YOLOv8 Nano / MobileNetV2).

## Model Versioning
`model_versions (model_id, model_name, version, model_type, input_size, classes, created_at)` — e.g., `yolov8n/onion.tflite v1, mobilenetv2_defect v1`.
