// Grading engine — independent from AI, versioned policy data (not hardcoded)
class Policy {
  final String id, version;
  final int sizeMin, sizeMax;
  final Map<String,dynamic> tolerances;
  Policy(this.id, this.version, this.sizeMin, this.sizeMax, this.tolerances);
}

class OnionObservation {
  final String onionId;
  final double sizeMm, sizeConf, defectConf;
  final String defectClass;
  OnionObservation(this.onionId, this.sizeMm, this.sizeConf, this.defectClass, this.defectConf);
}

String gradeOne(OnionObservation o, Policy p) {
  final inBand = o.sizeMm >= p.sizeMin && o.sizeMm <= p.sizeMax;
  if (o.defectClass == 'rotten' || o.defectClass == 'sprouted') return 'URS';
  if (!inBand) return 'URS'; // for demo, B/C splits would be size sub-bands
  if (o.defectClass == 'damaged') return 'URS';
  return 'A';
}

Map<String,dynamic> aggregate(List<String> grades) {
  final total = grades.length;
  final a = grades.where((g)=> g=='A').length;
  return {'A%': (a/total*100).round(), 'URS%': 100 - (a/total*100).round(), 'total': total};
}
