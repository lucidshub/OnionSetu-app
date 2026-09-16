// POST /api/ai-analyze — single-assessment observation (Prototype Demo Inference).
// POST { images: [...], policyVersion:"v2026.1" }
// -> deterministic demo per-onion observations (size/defect/confidence).
// No live model is called here. Live AI runs only in batch grading via
// POST /api/analyze-batch (Roboflow detection + Qwen assessment).
// Final grades are decided by the versioned policy engine (grading.js),
// never by AI confidence. URS is NOT a grade — separate lot metric.
const MODEL_LABEL = "Prototype Demo Inference";

function demoResults(){
  return [
    {id:"O1", sizeMm:72, defect:"Healthy", confidence:94, reasoning:"Demo: uniform skin, firm — outside 35-70 band → Reject.", grade:"Reject", box:{x:2,y:4,w:28,h:26}},
    {id:"O2", sizeMm:65, defect:"Damaged", confidence:82, reasoning:"Demo: scuff near top — handling damage → Reject.", grade:"Reject", box:{x:34,y:4,w:28,h:26}},
    {id:"O3", sizeMm:58, defect:"Healthy", confidence:91, reasoning:"Demo: even color, globular — Grade B.", grade:"Grade B", box:{x:66,y:4,w:28,h:26}},
  ];
}

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({error:"Use POST { images, policyVersion }"});

  let body = req.body;
  if(typeof body==="string") try{ body=JSON.parse(body); }catch{}
  const { policyVersion="v2026.1" } = body||{};

  return res.status(200).json({
    model: MODEL_LABEL,
    policy: policyVersion,
    note:"Demo — deterministic mock. Live AI runs in batch grading via /api/analyze-batch (Roboflow + Qwen).",
    mockFallback:true,
    results: demoResults(),
  });
}
