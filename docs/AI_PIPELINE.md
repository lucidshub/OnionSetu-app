# OnionSetu — AI Pipeline (YOLOv8 Nano + MobileNetV2 + OpenCV + TFLite)

## Interfaces (Dart/Flutter)
```dart
abstract class AIEngine {
  Future<List<Detection>> detect(Uint8List image); // YOLOv8 Nano
  Future<DefectResult> classify(Uint8List crop); // MobileNetV2: Healthy/Damaged/Rotten/Sprouted + confidence
}
class TFLiteAIEngine implements AIEngine { /* loads yolov8n.onion.tflite, mobilenetv2_defect.tflite */ }
class DemoAIEngine implements AIEngine { /* deterministic mock, lab 97.2% style, for UI flow */ }
```

## Detection — YOLOv8 Nano (TFLite)
- **Input:** Validated image (after quality gate)
- **Training:** Ultralytics YOLOv8 Nano, dataset `Onion Grading Dataset` (train 760, valid 200, test 240, nc=4: A,B,C,D), `yolov8n.pt` → export `yolov8n.onion.tflite` (currently training 5 epochs demo, best.pt in `runs/onionsetu_yolo`)
- **Output:** `{onion_id, bbox[x1,y1,x2,y2], mask, detection_confidence}` per onion. Web demo simulates O1-O5 boxes (yellow).

## Defect — MobileNetV2 (TFLite)
- **Input:** Crop per detection
- **Training:** Transfer learning, 4 classes, augmentation (blur, lighting, overlap), TFLite quantize. Web single-assessment runs Prototype Demo Inference (deterministic mock). Live AI runs in batch grading (Roboflow detection + Qwen assessment).
- **Output:** `{onion_id, defect_class, confidence}` + reasoning. UI shows confidence bar, 60% gate.

## Size — OpenCV
- **Ref:** 25mm known object in ≥1 frame. Steps: detect ref pixels → `mm_per_pixel = 25 / ref_pixels` → contour → `diameter_mm = diameter_pixels * mm_per_pixel` → size confidence. Non-globular → low confidence, reviewable. No depth sensor.

## Confidence Gate
Inputs: detection_conf, defect_conf, size_conf, image_quality, policy-boundary proximity. Output: `AUTO-GRADE` or `REVIEW REQUIRED` (configurable thresholds, never show low-conf as certain).

## Explainability
Per-onion: size (mm), size_conf, defect, defect_conf, grade (A/B/C/URS), reason (visible damage, size). Lot: A%/URS% + why (size band, defect tolerance, avg confidence).
