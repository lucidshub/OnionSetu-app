# OnionSetu — Audit Design (SHA-256 + Hash Chain, Append-Only)

## Photo-Set Hash
```
Photo Set (3 views) → SHA-256 → photoSetHash (stored with report, displayed as mono hash)
```
If the 3 images are altered, recomputing the hash and comparing to the stored `hash` detects tampering. Provides tamper evidence, not proof of physical sample representativeness, internal rot, or lot representativeness.

## Hash Chain (Audit Log)
```
prev_hash + event_data (event_id, type, report_id, timestamp, actor) → SHA-256 → current_hash
```
Each `audit_logs` row stores `previous_hash` + `current_hash`, forming an append-only chain. Example:
```json
{ "event_id":"AUD-001", "event_type":"REPORT_FINALIZED", "report_id":"RPT-001", "timestamp":"...", "previous_hash":"abc...", "current_hash":"def..." }
```
Events: `SESSION_CREATED, IMAGE_CAPTURED, IMAGE_VALIDATED, IMAGE_REJECTED, AI_ANALYSIS_COMPLETED, GRADE_COMPUTED, POLICY_SWITCHED, REPORT_GENERATED, REPORT_FINALIZED, ACKNOWLEDGEMENT_ADDED, DISPUTE_RAISED, REVIEW_STARTED, REVIEW_COMPLETED, REPORT_REVISED, SYNC_STARTED, SYNC_COMPLETED, SYNC_FAILED`.

## Immutability
Finalized `reports` are never updated in place. Disputes create `disputes` + `review_records` linked to the original `report_id`; a new `report` revision is created if corrected, preserving the original for audit.

## Limitations
SHA-256 does not prove the sample was representative, every prediction was correct, or internal defects were absent — and report legal status requires authority validation. No blockchain.

## Supabase
`audit_logs` RLS: authenticated can insert/select own + grader sees all. Hash chain verified by re-hashing from genesis.
