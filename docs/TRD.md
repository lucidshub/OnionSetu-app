# ONIONSETU — TRD (Technical Decisions)

## Why Flutter (not React Native)
Single Android codebase, camera + SQLite offline + local storage, TFLite plugin maturity, fast for small team. Suggested modules: `lib/core`, `lib/models`, `lib/services/{camera,ai,cv,grading,reports,sync,auth,audit}`, `lib/database`, `lib/screens/{auth,dashboard,session,capture,analysis,results,review,reports,disputes,admin}`, `lib/widgets`.

## Why YOLOv8 Nano + TFLite
Onions must be detected/segmented per-frame before per-onion analysis (multiple onions per image). Nano is lightweight for on-device, Ultralytics training → TFLite export. Interface: `AIEngine` with `TFLiteAIEngine` and `DemoAIEngine` (deterministic mock behind same interface when .tflite not yet bundled).

## Why MobileNetV2 + TFLite
Lightweight CNN for mobile-constrained defect classification (Healthy/Damaged/Rotten/Sprouted) with confidence. Transfer learning, on-device inference, complements OpenCV. Do not claim internal rot detection from RGB.

## Why OpenCV
Deterministic CV: Laplacian blur, brightness, framing, overlap, reference detection, contour → pixel-to-mm (`mm_per_pixel = known_ref_mm / ref_pixels; onion_mm = diameter_pixels * mm_per_pixel`), size confidence. Non-globular geometry flagged as low confidence.

## Why Offline-first (SQLite)
Mandi connectivity unreliable. Core pipeline (session→capture→quality→AI→size→policy→confidence→review→report→QR) must work without internet. SQLite entities: `local_users, grading_sessions, sample_images, onion_results, reports, policy_versions, acknowledgements, disputes, review_records, audit_logs, sync_queue` with `uuid, created_at, updated_at, sync_status (PENDING_SYNC/SYNCING/SYNCED/SYNC_FAILED)`.

## Why FastAPI + Supabase
FastAPI: lightweight API gateway/business logic. Supabase: PostgreSQL (structured: users, sessions, reports, results, policies, disputes, reviews, audit, sync) + Storage (images, PDFs, crops). DB stores references, not blobs. See `DATABASE_SCHEMA.md`.

## Why OTP+JWT, SHA-256, Hash Chain
OTP+JWT: primary auth (no passwords), role-based (FARMER/GRADER/REVIEWER/ADMIN), RLS. SHA-256: per-photo-set hash + append-only audit hash chain (`prev_hash+event→SHA256`) for tamper evidence, not blockchain. Reports immutable; disputes create linked records.

## Web Prototype Note
The Vite React app at `/` faithfully represents the Flutter workflow for judging (same 12-step pipeline, same policy engine, same offline queue simulation). Single assessment runs Prototype Demo Inference (deterministic mock); batch grading runs live Roboflow detection + Qwen assessment.
