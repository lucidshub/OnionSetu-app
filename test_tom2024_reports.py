#!/usr/bin/env python3
"""
TOM2024 Test Harness — generates reports in your exact format:
Report ID, Date, Location, Policy version, Grade A %, URS %, Confidence,
Farmer/grader acknowledgement, Dispute status + uploaded images
Uses Prototype Demo Inference mock. Live AI runs only in batch grading via /api/analyze-batch (Roboflow + Qwen).
"""
import zipfile, random, json, pathlib, datetime, os, base64, collections

ZIP = r"C:\Users\abdul\Downloads\TOM2024.zip"
OUT = pathlib.Path(r"C:\Users\abdul\Downloads\OnionSetu-main\onion-setu\test_reports")
OUT.mkdir(exist_ok=True, parents=True)

# Mapping TOM2024 folders -> our 4 defect classes
MAP = {
    "Healthy_leaf": "Healthy",
    "alternaria_d": "Damaged",
    "Alternaria_D": "Damaged",
    "caterpillars_p": "Damaged",
    "Caterpillar-P": "Damaged",
    "fusarium_d": "Rotten",
    "Fusarium-D": "Rotten",
    "Bulb_blight_d": "Rotten",
    "Bulb_blight-D": "Rotten",
    "virosis_d": "Damaged",  # virus -> damaged
    "Virosis-D": "Damaged",
}
# For grading, Healthy -> Grade A if size ok, others -> URS
POLICY = {"version":"v2026.1", "size_band":[35,70]}

def mock_predict(defect_gt, size_mm):
    # Simulate OnionSetu.ai mock with 97% lab style but with some variation vs ground truth
    # For demo, 85% will be correct, 15% error to show real-world drop
    import random as r
    if r.random() < 0.85:
        pred = defect_gt
        conf = random.randint(88, 97)
    else:
        # misclassify to another class
        choices = ["Healthy","Damaged","Rotten","Sprouted"]
        choices = [c for c in choices if c != defect_gt]
        pred = random.choice(choices)
        conf = random.randint(42, 68)
    grade = "Grade A" if (pred=="Healthy" and 35 <= size_mm <= 70) else "URS"
    reasoning = f"OnionSetu.ai: {pred} — {'uniform' if pred=='Healthy' else 'visible defect'} at {size_mm}mm. {'Grade A' if grade=='Grade A' else 'URS per v2026.1'}."
    return pred, conf, reasoning, grade

random.seed(42)
z = zipfile.ZipFile(ZIP)
# Use Category B English test as primary test set
test_files = [n for n in z.namelist() if 'onion with data augmentation/test' in n and 'CATB-English' in n and n.lower().endswith('.jpg')]
# Sample 120 balanced (20 per class)
by_class = collections.defaultdict(list)
for p in test_files:
    try:
        cls = p.split('/test/')[1].split('/')[0]
        by_class[cls].append(p)
    except: pass

sampled = []
for cls, files in by_class.items():
    sampled.extend(random.sample(files, min(20, len(files))))
random.shuffle(sampled)
print(f"Sampling {len(sampled)} images from {len(test_files)} test files")
# Extract sampled to temp and generate reports
reports = []
correct = 0
total = 0
confusion = collections.Counter()
grade_correct = 0

for idx, zip_path in enumerate(sampled):
    # Extract filename
    fname = pathlib.Path(zip_path).name
    # Ground truth
    try:
        gt_folder = zip_path.split('/test/')[1].split('/')[0]
        gt_defect = MAP.get(gt_folder, "Damaged")
    except:
        gt_defect = "Healthy"
    size_mm = random.randint(38, 74)  # simulated size from 25mm ref
    gt_grade = "Grade A" if (gt_defect=="Healthy" and 35 <= size_mm <= 70) else "URS"

    pred_defect, conf, reasoning, pred_grade = mock_predict(gt_defect, size_mm)
    is_correct = pred_defect == gt_defect
    if is_correct: correct += 1
    total += 1
    confusion[(gt_defect, pred_defect)] += 1
    if pred_grade == gt_grade: grade_correct += 1

    # Report in your exact format + images
    report = {
        "Report ID": f"OG-TEST-{1000+idx}",
        "Date": datetime.datetime.now().isoformat(),
        "Location": "Lasalgaon APMC — Nashik, MH (TOM2024 test)",
        "Policy version": POLICY["version"],
        "Grade A %": 68 if pred_grade=="URS" else 72,  # per-sample, for lot would be aggregate
        "URS %": 32 if pred_grade=="URS" else 28,
        "Confidence": conf,
        "Farmer/grader acknowledgement": {"farmer": False, "grader": False, "note": "Pending — farmer/grader review required"},
        "Dispute status": "No dispute",
        "Sample size": 1,
        "Lot ID": f"LOT-TEST-{1000+idx}",
        "Hash (SHA-256)": f"test-hash-{idx:04d}-" + "a3f9c1e7"[:8],
        "Ground truth": {"defect": gt_defect, "grade": gt_grade, "size_mm": size_mm, "source_file": zip_path},
        "Prediction": {"defect": pred_defect, "confidence": conf, "reasoning": reasoning, "grade": pred_grade, "correct": is_correct},
        "Uploaded images": [f"test_extract/{fname}"],
        "Per-Onion Results": [{"id":"O1", "sizeMm": size_mm, "defect": pred_defect, "confidence": conf, "grade": pred_grade, "reasoning": reasoning}]
    }
    reports.append(report)
    # Optionally extract image for visual
    if idx < 12:  # extract first 12 for demo
        try:
            out_path = OUT / "images" / fname
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with z.open(zip_path) as src, open(out_path, 'wb') as dst:
                dst.write(src.read())
        except Exception as e:
            print(f"extract failed {zip_path}: {e}")

# Save reports JSON
with open(OUT / "tom2024_reports.json", "w", encoding="utf-8") as f:
    json.dump(reports, f, indent=2, ensure_ascii=False)

# Summary
acc = correct/total*100 if total else 0
grade_acc = grade_correct/total*100 if total else 0
summary = {
    "total_tested": total,
    "defect_accuracy": round(acc,2),
    "grade_accuracy": round(grade_acc,2),
    "confusion": {f"{k[0]}->{k[1]}":v for k,v in confusion.items()},
    "by_class": {k: len(v) for k,v in by_class.items()},
    "sampled": len(sampled),
    "note": "Prototype Demo Inference mock. Live AI runs only in batch grading via /api/analyze-batch (Roboflow + Qwen). This is demo with 85% simulated field accuracy to show format."
}
with open(OUT / "summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)

print(f"\nDone. Reports: {OUT / 'tom2024_reports.json'}")
print(f"Defect accuracy (mock): {acc:.1f}% ({correct}/{total})")
print(f"Grade accuracy (mock): {grade_acc:.1f}%")
print("Confusion (gt->pred):")
for (gt,pred),c in confusion.most_common():
    print(f"  {gt:12} -> {pred:12}: {c}")
print(f"\nImages extracted to {OUT / 'images'} (12 samples)")
print(f"Summary: {OUT / 'summary.json'}")
