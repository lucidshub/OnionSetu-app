import 'dart:typed_data';

/// OpenCV service — blur (Laplacian), lighting, framing, overlap, reference detection, size estimation.
/// Reference: 25mm known object → mm_per_pixel = 25 / ref_pixels → onion_mm = diameter_pixels * mm_per_pixel

class QualityResult {
  final bool pass;
  final List<String> reasons;
  QualityResult(this.pass, this.reasons);
}

class SizeResult {
  final double diameterMm;
  final double confidence;
  SizeResult(this.diameterMm, this.confidence);
}

class OpenCVService {
  // TODO: integrate opencv_4 plugin, implement native calls
  Future<QualityResult> checkQuality(Uint8List imageBytes) async {
    // TODO: Laplacian variance for blur, brightness histogram, ref detection
    return QualityResult(true, []);
  }
  Future<SizeResult> estimateSize(Uint8List imageBytes, {required double refPixels}) async {
    // TODO: detect ref contour → mm_per_pixel → onion contour → diameter
    const mmPerPixel = 25.0 / 100; // placeholder
    return SizeResult(60.0 * mmPerPixel * 100, 0.89);
  }
}
