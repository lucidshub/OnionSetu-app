import 'dart:typed_data';

/// OnionSetu AI interfaces — TFLiteAIEngine vs DemoAIEngine (same contract, swappable without UI change)
/// YOLOv8 Nano: detection/segmentation, MobileNetV2: defect classification — both on-device TFLite.

class Detection {
  final String onionId;
  final List<double> bbox; // [x1,y1,x2,y2]
  final double detectionConfidence;
  Detection(this.onionId, this.bbox, this.detectionConfidence);
}

class DefectResult {
  final String onionId;
  final String defectClass; // healthy/damaged/rotten/sprouted
  final double confidence;
  DefectResult(this.onionId, this.defectClass, this.confidence);
}

abstract class AIEngine {
  Future<List<Detection>> detect(Uint8List imageBytes); // YOLOv8 Nano
  Future<DefectResult> classify(Uint8List cropBytes); // MobileNetV2
}

/// Real on-device TFLite — loads yolov8n.onion.tflite + mobilenetv2_defect.tflite from assets
class TFLiteAIEngine implements AIEngine {
  // TODO: integrate tflite_flutter Interpreter, load assets, run inference
  @override
  Future<List<Detection>> detect(Uint8List imageBytes) async {
    // TODO: YOLOv8 Nano inference
    throw UnimplementedError('Bundle yolov8n.onion.tflite and implement');
  }
  @override
  Future<DefectResult> classify(Uint8List cropBytes) async {
    // TODO: MobileNetV2 inference
    throw UnimplementedError('Bundle mobilenetv2_defect.tflite and implement');
  }
}

/// Demo — deterministic mock behind same interface, lab 97.2% style, for UI flow when TFLite not yet bundled
class DemoAIEngine implements AIEngine {
  @override
  Future<List<Detection>> detect(Uint8List imageBytes) async {
    await Future.delayed(const Duration(milliseconds: 900));
    return List.generate(5, (i) => Detection('O${i+1}', [10+i*20, 20, 50+i*20, 60], 0.92 + i*0.01));
  }
  @override
  Future<DefectResult> classify(Uint8List cropBytes) async {
    await Future.delayed(const Duration(milliseconds: 300));
    const classes = ['healthy','damaged','rotten','sprouted'];
    // Deterministic demo: cycle through classes with high confidence
    final idx = DateTime.now().millisecond % 4;
    return DefectResult('O1', classes[idx], 0.94);
  }
}
