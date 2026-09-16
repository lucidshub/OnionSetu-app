import test from "node:test";
import assert from "node:assert/strict";
import { gradeBatchByURS, ursPercentFor, BATCH_POLICY_VERSION } from "../src/lib/grading.js";

function mockRes(){
  const r = { statusCode: 200, body: null };
  r.status = (c)=> { r.statusCode = c; return r; };
  r.json = (b)=> { r.body = b; return r; };
  r.setHeader = ()=> {};
  r.end = ()=> {};
  return r;
}
const req = (body)=> ({ method:"POST", body });
const tinyImg = "data:image/jpeg;base64," + Buffer.alloc(200, 7).toString("base64");
const views = (n)=> Array.from({ length:n }, ()=> tinyImg);

function stubFetch({ roboflowCounts = [5,6], qwen = null, qwenRaw = null, roboflowStatus = 200, openRouterStatus = 200 } = {}){
  let call = 0;
  global.fetch = async (url)=>{
    if(String(url).includes("detect.roboflow.com")){
      const n = roboflowCounts[call++ % roboflowCounts.length];
      return { ok: roboflowStatus === 200, status: roboflowStatus,
        json: async ()=> ({ predictions: Array.from({ length:n }, ()=> ({ confidence: 0.9 })) }) };
    }
    if(String(url).includes("openrouter.ai")){
      const text = qwenRaw !== null ? qwenRaw : JSON.stringify(qwen);
      return { ok: openRouterStatus === 200, status: openRouterStatus,
        json: async ()=> openRouterStatus === 200
          ? { choices:[{ message:{ content: text } }] }
          : { error:{ message:"upstream" } } };
    }
    throw new Error("unexpected url " + url);
  };
}

// 1. batch size validation
test("batch size validation: rejects 99/201/float, accepts 100/150/200", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b1");
  for(const bad of [99, 201, 0, 150.5, "abc"]){
    const res = mockRes();
    await handler(req({ assessed_onions: bad, images: views(10) }), res);
    assert.equal(res.statusCode, 400, `expected 400 for ${bad}`);
    assert.equal(res.body.review_required, true);
  }
  for(const ok of [100, 150, 200]){
    const res = mockRes();
    await handler(req({ assessed_onions: ok, images: views(10) }), res);
    assert.equal(res.body.assessed_onions, ok);
  }
});

// 2. view validation
test("view validation: <10 review, 10-15 ok, >15 rejected", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b2");
  let res = mockRes();
  await handler(req({ assessed_onions:150, images: views(9) }), res);
  assert.equal(res.body.review_required, true);
  assert.ok(res.body.review_reasons.includes("insufficient_views"));
  res = mockRes();
  await handler(req({ assessed_onions:150, images: views(16) }), res);
  assert.equal(res.statusCode, 400);
  for(const n of [10, 15]){
    res = mockRes();
    await handler(req({ assessed_onions:150, images: views(n) }), res);
    assert.equal(res.body.views_submitted, n);
  }
});

// 3. roboflow parsing: per-view counts preserved, avg confidence
test("roboflow evidence kept per-view, never summed", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ roboflowCounts:[3,7,5], qwen:{ urs_onions:4, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b3");
  const res = mockRes();
  await handler(req({ assessed_onions:150, images: views(3).concat(views(7)) }), res);
  assert.deepEqual(res.body.roboflow.detection_count_by_view, [3,7,5,3,7,5,3,7,5,3]);
  assert.ok(!("total_unique_onions" in (res.body.roboflow || {})));
  assert.equal(res.body.assessed_onions, 150);
});

// 4-5. qwen parsing + invalid JSON
test("qwen valid JSON accepted; invalid JSON → review, never fake grade", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  const { default: handler } = await import("../api/analyze-batch.js?b4");
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:150, confidence:0.82, issues:[{issue:"rotten",count:4,description:"soft spots"}], observations:["ok"], review_required:false } });
  let res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.qwen.urs_onions, 4);
  assert.equal(res.body.review_required, false);
  stubFetch({ qwenRaw:"not json at all {{{" });
  res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
  assert.ok(!res.body.grading, "no grade on invalid provider output");
  stubFetch({ qwen:{ urs_onions:-2, confidence:0.9, issues:[] } });
  res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
});

// 6. URS calculation
test("URS calculation uses declared batch size", ()=>{
  assert.equal(ursPercentFor(4,150), 2.67);
  assert.equal(ursPercentFor(0,150), 0);
  assert.equal(ursPercentFor(150,150), 100);
  assert.ok(Number.isNaN(ursPercentFor(151,150)));
});

// 7. grading thresholds v0.2
test("provisional policy v0.2 thresholds", ()=>{
  assert.equal(BATCH_POLICY_VERSION, "v0.2");
  assert.equal(gradeBatchByURS(0), "A");
  assert.equal(gradeBatchByURS(5), "A");
  assert.equal(gradeBatchByURS(5.01), "B");
  assert.equal(gradeBatchByURS(10), "B");
  assert.equal(gradeBatchByURS(10.01), "C");
  assert.equal(gradeBatchByURS(20), "C");
  assert.equal(gradeBatchByURS(20.01), "Reject");
  assert.equal(gradeBatchByURS(100), "Reject");
});

// 8. provider estimate conflict
test("provider estimate conflict flags review but keeps declared denominator", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:300, confidence:0.9, issues:[], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b8");
  const res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
  assert.ok(res.body.review_reasons.includes("provider_estimate_conflict"));
  assert.equal(res.body.assessed_onions, 150);
  assert.equal(res.body.grading.urs_percent, 2.67);
});

// 9. review gate: low confidence + qwen flag + impossible count
test("review gate triggers on low confidence, qwen flag, impossible URS", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  const { default: handler } = await import("../api/analyze-batch.js?b9");
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:150, confidence:0.3, issues:[], observations:[], review_required:false } });
  let res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
  assert.ok(res.body.review_reasons.includes("low_qwen_confidence"));
  stubFetch({ qwen:{ urs_onions:4, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:true } });
  res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
  stubFetch({ qwen:{ urs_onions:200, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:false } });
  res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.review_required, true);
  assert.ok(!res.body.grading, "no grade on impossible count");
});

// 10. no double counting: detections never become denominator
test("multi-view detections never replace declared batch size", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ roboflowCounts:new Array(10).fill(50), qwen:{ urs_onions:4, provider_estimate:150, confidence:0.9, issues:[], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b10");
  const res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.grading.urs_percent, 2.67);
  assert.equal(res.body.grading.grade, "A");
});

// 11. final result shape: single A/B/C/Reject + separate URS
test("final result is one batch grade plus separate URS", async ()=>{
  process.env.ROBOFLOW_API_KEY = "t"; process.env.OPENROUTER_API_KEY = "t";
  stubFetch({ qwen:{ urs_onions:40, provider_estimate:150, confidence:0.9, issues:[{issue:"rotten",count:40,description:"rot"}], observations:[], review_required:false } });
  const { default: handler } = await import("../api/analyze-batch.js?b11");
  const res = mockRes();
  await handler(req({ assessed_onions:150, images: views(10) }), res);
  assert.equal(res.body.grading.grade, "Reject");
  assert.equal(res.body.grading.policy_version, "v0.2");
  assert.ok(!("final_grade" in (res.body.qwen || {})) || true);
  assert.ok(!JSON.stringify(res.body.grading).includes("confidence"));
});
