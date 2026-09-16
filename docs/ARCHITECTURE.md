# ONIONSETU — Architecture

```
                     ONIONSETU / ONIONGRADE LEDGER
                                  |
             +--------------------+--------------------+
             |                                         |
       MOBILE APPLICATION                         BACKEND
       Flutter Offline-first                     FastAPI Gateway
             |                                         |
             |                                  +------+------+
             |                                  |             |
             |                              PostgreSQL     Storage
             |                              (Supabase)   (Supabase)
             |
             v
      Farmer + Grader Session
             |
      Standardized Sampling
             |
      Guided Multi-Photo Capture
             |
      Image Quality Validation (OpenCV)
             |
      YOLOv8 Nano + TFLite — Detection
             |
        +----+----------------+
        |                     |
        v                     v
 Size Estimation       Defect Classification
   OpenCV               MobileNetV2/TFLite
        |                     |
        +----------+----------+
                   |
             Confidence Gate (AUTO-GRADE / REVIEW REQUIRED)
                   |
             Versioned Grading Policy → Grade A/B/C/URS → A% / URS%
                   |
        Farmer + Grader Review (Accepted / Flagged → Dispute → Second Review)
                   |
              PDF + QR Report (SHA-256 / Audit)
                   |
              Local Queue (SQLite, PENDING_SYNC)
                   |
             HTTP Sync + Retry → FastAPI → Supabase
```

**Principles:** Observation separate from grading (AI observes, policy grades); AI assists, not replaces; finalized reports immutable (disputes create linked records); offline-first (core pipeline needs no internet).

**Data Flow:** Image → Detection → Size+Defect observation → Confidence gate → Versioned policy → Grade → Human acceptance → Evidence record → Supabase.
