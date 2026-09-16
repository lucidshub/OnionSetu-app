# ONIONSETU — PRD (Product Requirements)

## 1. Vision
Low-cost, smartphone-based, multi-view AI-assisted onion grading for procurement centers. Standardizes capture, validates quality, detects onions (YOLOv8 Nano), estimates size (OpenCV + 25mm ref), classifies visible condition (MobileNetV2: Healthy/Damaged/Rotten/Sprouted), applies versioned policy (A/B/C/URS, A%/URS%), gates confidence, enables human review, generates PDF+QR with SHA-256 audit, works offline and syncs via FastAPI → Supabase.

## 2. Users
- **Farmer:** Fair grading, evidence, ack/flag. Sees own lots only.
- **Grader/Officer:** Faster, consistent, defensible, human control, report generation.
- **Admin/Reviewer:** Records, policy versions, disputes, audit.

## 3. Problem
Subjective visual grading varies across centers, poor sampling, no photo evidence, no shared record, hard disputes, poor connectivity, policy changes require code changes, RGB cannot see internal rot.

## 4. MVP Must Work (P0 §45)
Session (UUID, lot), guided sampling, multi-photo capture (ref in ≥1 frame), quality gate (blur/lighting/ref/overlap/framing), YOLOv8 Nano detection (bbox/mask), MobileNetV2 defect (4 classes + conf), OpenCV size (mm + conf), versioned policy (A/B/C/URS, A%/URS%), confidence gate (AUTO-GRADE vs REVIEW REQUIRED), human review (accept/correct/second review, never overwrite finalized), report (on-screen + PDF + QR + photos + onion table + policy/model/timestamp/location/review/ack + SHA-256), offline (all above without internet), plus offline viewing.

## 5. Non-Functional
- Grading <10s on mid-range Android after final capture
- First-time user can complete guided capture without training
- Auth: OTP+JWT, RLS, minimal PII
- Audit: immutable reports, hash chain
- Configurability: policy as data

## 6. Acceptance Tests §46
20 tests: OTP login → session → capture → retake on bad image → analysis → detection → per-onion size/defect/conf → A/B/C/URS → A%/URS% → low-conf → human review → flag → second review (linked) → PDF → QR → SHA-256 → offline → pending queue → sync → regrade with different policy.
