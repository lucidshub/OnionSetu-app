// POST /api/analyze-batch — OnionSetu batch grading (Roboflow detection + Qwen assessment + deterministic policy)
// One physical batch (100-200 onions), 10-15 multi-view images of the SAME batch.
// Roboflow detects onions per view (evidence only, NEVER summed as unique onions).
// Qwen assesses visible URS evidence. OnionSetu computes URS% against declared assessed_onions.
// Final grade comes ONLY from OnionSetu provisional policy v0.2 — never from AI confidence.
// Provider keys (ROBOFLOW_API_KEY, OPENROUTER_API_KEY) are server-only. Never sent to client.
const ROBOFLOW_MODEL = "onion-yhzc7-mo9ib/1";
const QWEN_MODEL_DEFAULT = "qwen/qwen2.5-vl-72b-instruct";
const POLICY_VERSION = "v0.2";
const MIN_VIEWS = 10;
const MAX_VIEWS = 15;
const MIN_BATCH = 100;
const MAX_BATCH = 200;

function thresholds(){
  const n = (v, d) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : d;
  };
  return {
    aMax: n(process.env.GRADING_A_MAX, 5),
    bMax: n(process.env.GRADING_B_MAX, 10),
    cMax: n(process.env.GRADING_C_MAX, 20),
  };
}

export function gradeBatchByURS(ursPercent, t = thresholds()){
  if(ursPercent <= t.aMax) return "A";
  if(ursPercent <= t.bMax) return "B";
  if(ursPercent <= t.cMax) return "C";
  return "Reject";
}

function stripDataUrl(img){
  if(typeof img !== "string" || !img) return null;
  const m = img.match(/^data:(.*?);base64,(.*)$/);
  if(m) return { mime: m[1] || "image/jpeg", b64: m[2] };
  if(/^[A-Za-z0-9+/=\s]+$/.test(img) && img.length > 100) return { mime: "image/jpeg", b64: img.replace(/\s/g, "") };
  return null;
}

async function fetchWithTimeout(url, opts = {}, ms = 45000){
  const c = new AbortController();
  const t = setTimeout(()=> c.abort(), ms);
  try{
    return await fetch(url, { ...opts, signal: c.signal });
  }finally{
    clearTimeout(t);
  }
}

async function roboflowDetect(b64, apiKey){
  const resp = await fetchWithTimeout(
    `https://detect.roboflow.com/${ROBOFLOW_MODEL}?api_key=${encodeURIComponent(apiKey)}`,
    { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body: b64 },
    30000
  );
  if(!resp.ok) throw new Error(`roboflow_${resp.status}`);
  const data = await resp.json().catch(()=> ({}));
  const preds = Array.isArray(data.predictions) ? data.predictions : [];
  let confSum = 0, confN = 0;
  for(const p of preds){
    const c = Number(p.confidence);
    if(Number.isFinite(c)){ confSum += c; confN++; }
  }
  return { count: preds.length, avgConfidence: confN ? confSum/confN : 0 };
}

const QWEN_SYSTEM = `You assess onion batch photos for the OnionSetu grading trial. These are multiple views of ONE physical batch.
Return STRICT JSON only, no markdown, no extra text, matching exactly:
{"urs_onions":0,"provider_estimate":0,"confidence":0.0,"issues":[{"issue":"string","count":0,"description":"string"}],"observations":[],"review_required":false}
Rules: urs_onions = distinct onions in the batch showing rot, damage, sprouting, undersize or other visible defects (integer >= 0). provider_estimate = your own batch-size guess (integer, informational only — the declared batch size is authoritative). confidence 0..1. issues: list each visible issue type with count and short description. observations: short strings. If you cannot confidently determine anything, set review_required true and urs_onions 0 — NEVER invent numbers.`;

function extractJson(text){
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if(!m) return null;
  try{ return JSON.parse(m[0]); }catch{ return null; }
}

function validateQwen(q){
  if(!q || typeof q !== "object") return "qwen_not_object";
  if(!Number.isInteger(q.urs_onions) || q.urs_onions < 0) return "qwen_bad_urs_onions";
  if(typeof q.confidence !== "number" || q.confidence < 0 || q.confidence > 1) return "qwen_bad_confidence";
  if(!Array.isArray(q.issues)) return "qwen_bad_issues";
  for(const it of q.issues){
    if(!it || typeof it.issue !== "string" || !Number.isInteger(it.count) || it.count < 0) return "qwen_bad_issue_entry";
  }
  if(q.observations !== undefined && !Array.isArray(q.observations)) return "qwen_bad_observations";
  return null;
}

async function qwenAssess(images, openRouterKey, model){
  const content = [
    { type:"text", text: QWEN_SYSTEM },
    ...images.slice(0, MAX_VIEWS).map(u=> ({ type:"image_url", image_url:{ url: u } })),
  ];
  const resp = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${openRouterKey}`,
      "HTTP-Referer":"https://onion-setu.vercel.app/",
      "X-Title":"OnionSetu batch grading",
    },
    body: JSON.stringify({ model, messages:[{ role:"user", content }], temperature:0.1, max_tokens:800 }),
  }, 60000);
  if(!resp.ok) throw new Error(`openrouter_${resp.status}`);
  const data = await resp.json().catch(()=> ({}));
  const text = data.choices?.[0]?.message?.content || "";
  if(!text) throw new Error("qwen_empty");
  const parsed = extractJson(text);
  if(!parsed) throw new Error("qwen_invalid_json");
  const err = validateQwen(parsed);
  if(err) throw new Error(err);
  return { parsed, rawLength: text.length };
}

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({ error:"Use POST { assessed_onions, images[] }" });

  let body = req.body;
  if(typeof body==="string"){ try{ body=JSON.parse(body); }catch{ return res.status(400).json({ error:"invalid_json", review_required:true }); } }
  const assessed_onions = Number(body?.assessed_onions);
  const imagesRaw = Array.isArray(body?.images) ? body.images : [];

  if(!Number.isInteger(assessed_onions) || assessed_onions < MIN_BATCH || assessed_onions > MAX_BATCH){
    return res.status(400).json({ error:"invalid_batch_size", detail:`assessed_onions must be an integer ${MIN_BATCH}-${MAX_BATCH}`, review_required:true });
  }
  // Keep only valid image payloads (data URLs or raw base64)
  const images = [];
  for(const img of imagesRaw.slice(0, MAX_VIEWS)){
    const p = stripDataUrl(img);
    if(p) images.push(`data:${p.mime};base64,${p.b64}`);
  }
  if(imagesRaw.length > MAX_VIEWS){
    return res.status(400).json({ error:"too_many_views", detail:`maximum ${MAX_VIEWS} views`, review_required:true });
  }
  if(images.length < MIN_VIEWS){
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      error:"insufficient_views", detail:`minimum ${MIN_VIEWS} views required`,
      review_required:true, review_reasons:["insufficient_views"],
    });
  }

  const roboflowKey = process.env.ROBOFLOW_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const qwenModel = process.env.OPENROUTER_MODEL_ID || QWEN_MODEL_DEFAULT;
  const reviewReasons = [];

  // 1) Roboflow detection per view (evidence only — per-view counts, never summed as unique onions)
  let detection_count_by_view = [];
  let detConfSum = 0, detConfN = 0;
  if(!roboflowKey){
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      error:"provider_not_configured", detail:"Roboflow key missing on server",
      review_required:true, review_reasons:["roboflow_not_configured"],
    });
  }
  try{
    for(const img of images){
      const p = stripDataUrl(img);
      const d = await roboflowDetect(p.b64, roboflowKey);
      detection_count_by_view.push(d.count);
      if(d.avgConfidence){ detConfSum += d.avgConfidence; detConfN++; }
    }
  }catch(e){
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      error:"roboflow_failed", detail:String(e?.message || e),
      review_required:true, review_reasons:["roboflow_failed"],
    });
  }

  // 2) Qwen visual assessment
  if(!openRouterKey){
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      roboflow:{ model: ROBOFLOW_MODEL, detection_count_by_view, average_detection_confidence: detConfN ? +(detConfSum/detConfN).toFixed(3) : 0 },
      error:"provider_not_configured", detail:"OpenRouter key missing on server",
      review_required:true, review_reasons:["openrouter_not_configured"],
    });
  }
  let q;
  try{
    const r = await qwenAssess(images, openRouterKey, qwenModel);
    q = r.parsed;
  }catch(e){
    const code = String(e?.message || "qwen_failed");
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      roboflow:{ model: ROBOFLOW_MODEL, detection_count_by_view, average_detection_confidence: detConfN ? +(detConfSum/detConfN).toFixed(3) : 0 },
      error: code.startsWith("qwen_") || code.startsWith("openrouter_") ? code : "qwen_failed",
      detail:"Qwen did not return usable structured output",
      review_required:true, review_reasons:[code.startsWith("qwen_") || code.startsWith("openrouter_") ? code : "qwen_failed"],
    });
  }

  // 3) Consistency: provider estimate conflict + impossible URS (denominator is ALWAYS assessed_onions)
  if(Number.isInteger(q.provider_estimate) && q.provider_estimate > 0){
    const ratio = q.provider_estimate / assessed_onions;
    if(ratio <= 0.5 || ratio >= 2){
      reviewReasons.push("provider_estimate_conflict");
    }
  }
  if(q.urs_onions > assessed_onions){
    return res.status(200).json({
      assessed_onions, views_submitted: images.length,
      roboflow:{ model: ROBOFLOW_MODEL, detection_count_by_view, average_detection_confidence: detConfN ? +(detConfSum/detConfN).toFixed(3) : 0 },
      qwen:{ model: qwenModel, urs_onions: q.urs_onions, confidence: q.confidence, issues: q.issues, observations: q.observations || [] },
      error:"impossible_urs_count", detail:"urs_onions exceeds assessed_onions — using declared batch size, human review required",
      review_required:true, review_reasons:["impossible_urs_count"],
    });
  }

  // 4) URS% + deterministic policy v0.2 (configurable thresholds)
  const t = thresholds();
  const urs_percent = +((q.urs_onions / assessed_onions) * 100).toFixed(2);
  const grade = gradeBatchByURS(urs_percent, t);
  if(q.review_required) reviewReasons.push("qwen_requested_review");
  if(q.confidence < 0.6) reviewReasons.push("low_qwen_confidence");

  return res.status(200).json({
    assessed_onions,
    views_submitted: images.length,
    roboflow:{
      model: ROBOFLOW_MODEL,
      detection_count_by_view,
      average_detection_confidence: detConfN ? +(detConfSum/detConfN).toFixed(3) : 0,
    },
    qwen:{
      model: qwenModel,
      urs_onions: q.urs_onions,
      confidence: q.confidence,
      issues: q.issues,
      observations: q.observations || [],
    },
    grading:{ urs_percent, grade, policy_version: POLICY_VERSION },
    review_required: reviewReasons.length > 0,
    review_reasons: reviewReasons,
  });
}
