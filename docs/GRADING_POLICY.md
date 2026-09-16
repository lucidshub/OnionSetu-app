# OnionSetu — Grading Policy (Versioned, A/B/C/URS)

## Principle
AI observes (`size + defect + confidence`), policy grades. Policy is **data**, not code.

```json
{
  "policy_id": "PROCUREMENT-2026",
  "version": "v2026.1",
  "size_band_mm": { "min": 35, "max": 70 },
  "defect_tolerances": { "rotten": 2, "sprouted": 3, "damaged": 5 }
}
```

Seed: `v2026.1` (35-70mm, rotten≤2%, sprouted≤3%, damaged≤5%) active; `v2025.2` (45-65mm) previous; `vAGMARK-1` (30-80mm) reference. All in `policies` table, `is_active`.

## Per-Onion
```
Size + defect + confidences + active policy → Grade A/B/C/URS
```
Example: `{onion_id: ONION-001, size_mm:54.2, size_conf:0.89, defect:healthy, defect_conf:0.96, grade:A}`

## Lot
```
Grade A% = (Grade A count / total valid) * 100
URS% = (URS count / total valid) * 100
(B/C similarly if used)
```
Example: 50 sampled, 40 Grade A, 10 URS → 80% / 20%.

## Policy Switch Demo (Wow Moment)
Capture once → store observations → Grade with V1 → switch to V2 → re-run **grading rules only** (no AI rerun) → same photos/observations → different Grade A/URS because policy changed. Proves policy is data.

Do not invent regulatory thresholds; store as config, show `policy_version` in every report.
