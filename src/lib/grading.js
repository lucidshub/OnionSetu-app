export const CONFIDENCE_THRESHOLD = 60;

// Canonical grading: observation (size + defect + confidence) + policy → Grade A/B/C/Reject
// URS is NOT a grade — it is a separate lot metric.
export function classifyOnion(onion, policy){
  const { sizeMm, defect } = onion;
  const { min, max } = policy.sizeBand;
  // Defect: Rotten/Sprouted are always Reject (not URS as grade)
  if (defect === "Rotten" || defect === "Sprouted") return "Reject";
  if (defect === "Damaged") return "Reject";
  // Size bands for A/B/C — per v2026.1 35-70: C 35-50, B 50-60, A 60-70; outside = Reject
  if (sizeMm < min || sizeMm > max) return "Reject";
  if (sizeMm >= 60) return "Grade A";
  if (sizeMm >= 50) return "Grade B";
  if (sizeMm >= 35) return "Grade C";
  return "Reject";
}

export function gradeLot(onions, policy){
  if(!onions.length) return { total:0, gradeA:0, gradeB:0, gradeC:0, gradeReject:0, urs:0, counts:{A:0,B:0,C:0,Reject:0}, details:[], overallGrade:"Reject" };
  const counts = { A:0, B:0, C:0, Reject:0 };
  const details = onions.map(o => {
    const grade = classifyOnion(o, policy);
    const key = grade === "Grade A" ? "A" : grade === "Grade B" ? "B" : grade === "Grade C" ? "C" : "Reject";
    counts[key]++;
    return { ...o, grade };
  });
  const total = onions.length;
  const gradeA = Math.round((counts.A/total)*100);
  const gradeB = Math.round((counts.B/total)*100);
  const gradeC = Math.round((counts.C/total)*100);
  const gradeReject = Math.round((counts.Reject/total)*100);
  // URS is separate lot metric: % of undersized + rotten + sprouted (policy violation)
  const ursCount = onions.filter(o=> o.sizeMm < policy.sizeBand.min || o.defect==="Rotten" || o.defect==="Sprouted").length;
  const urs = Math.round((ursCount/total)*100);
  // overallGrade for convenience (most frequent)
  const overallGrade = counts.A >= counts.B && counts.A >= counts.C && counts.A >= counts.Reject ? "Grade A"
    : counts.B >= counts.C && counts.B >= counts.Reject ? "Grade B"
    : counts.C >= counts.Reject ? "Grade C" : "Reject";
  // Tolerance verdict from policy (defect rates vs allowed %): Reject if
  // rotten/sprouted exceed tolerance, URS if damaged exceeds tolerance.
  const pct = n => Math.round((n/total)*100);
  const rotten = onions.filter(o=> o.defect==="Rotten").length;
  const sprouted = onions.filter(o=> o.defect==="Sprouted").length;
  const damaged = onions.filter(o=> o.defect==="Damaged").length;
  const rottenPct = pct(rotten), sproutedPct = pct(sprouted), damagedPct = pct(damaged);
  const tol = policy.tolerances || {};
  const toleranceBreaches = [];
  if(rottenPct > (tol.rotten ?? 100)) toleranceBreaches.push(`rotten ${rottenPct}% > ${tol.rotten}% allowed`);
  if(sproutedPct > (tol.sprouted ?? 100)) toleranceBreaches.push(`sprouted ${sproutedPct}% > ${tol.sprouted}% allowed`);
  if(damagedPct > (tol.damaged ?? 100)) toleranceBreaches.push(`damaged ${damagedPct}% > ${tol.damaged}% allowed`);
  let lotStatus = "Within tolerance";
  if(rottenPct > (tol.rotten ?? 100) || sproutedPct > (tol.sprouted ?? 100)) lotStatus = "Reject";
  else if(toleranceBreaches.length) lotStatus = "URS";
  return { details, gradeA, gradeB, gradeC, gradeReject, urs, counts, total, overallGrade,
    rottenPct, sproutedPct, damagedPct, lotStatus, toleranceBreaches };
}

// Batch grading — OnionSetu provisional policy v0.2 (configurable thresholds).
// URS% <= 5 → A, 5-10 → B, 10-20 → C, >20 → Reject. URS is a separate metric, never a grade.
export const BATCH_POLICY_VERSION = "v0.2";
export const BATCH_THRESHOLDS = { aMax: 5, bMax: 10, cMax: 20 };
export function gradeBatchByURS(ursPercent, t = BATCH_THRESHOLDS){
  const u = Number(ursPercent);
  if(!Number.isFinite(u) || u < 0) return "Reject";
  if(u <= (t.aMax ?? 5)) return "A";
  if(u <= (t.bMax ?? 10)) return "B";
  if(u <= (t.cMax ?? 20)) return "C";
  return "Reject";
}
export function ursPercentFor(ursOnions, assessedOnions){
  const u = Number(ursOnions), a = Number(assessedOnions);
  if(!Number.isInteger(a) || a <= 0) return NaN;
  if(!Number.isInteger(u) || u < 0 || u > a) return NaN;
  return +((u / a) * 100).toFixed(2);
}

export function needsHumanReview(onion){
  return onion.confidence < CONFIDENCE_THRESHOLD;
}

export function lotConfidence(onions){
  if (!onions.length) return 0;
  return Math.round(onions.reduce((a,b)=>a+b.confidence,0)/onions.length);
}

// Real SHA-256 where Web Crypto is available, fallback to placeholder for old environments
export async function sha256(text){
  if(typeof crypto !== "undefined" && crypto.subtle){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b=> b.toString(16).padStart(2,"0")).join("");
  }
  return sha256Placeholder(text);
}

export function sha256Placeholder(seed="photo-set"){
  let h="";
  const chars="abcdef0123456789";
  let s=0; for(let i=0;i<seed.length;i++) s+=seed.charCodeAt(i);
  for(let i=0;i<64;i++){ h+=chars[(s*i*9301+49297)%16]; if((i+1)%8===0 && i!==63) h+=" "; }
  return h;
}
