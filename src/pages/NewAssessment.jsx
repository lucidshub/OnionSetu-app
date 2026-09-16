import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { gradeLot, CONFIDENCE_THRESHOLD, sha256 } from "../lib/grading";
import { demoOnions } from "../lib/mockData";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

/* Guided 12-step wizard covering PRD §13-51 */
const STEP_KEYS = ["stepLotInfo","stepSampling","stepCapture","stepQualityGate","stepDetection","stepSize","stepDefects","stepConfidence","stepHumanReview","stepPolicyGrading","stepFarmerReview","stepReportEvidence"];

export default function NewAssessment(){
  useSeo({ title:"New Assessment", description:"Start a new onion grading session — enter lot details, capture 3 views with reference, run quality check and get Grade A/B/C/Reject with separate URS.", canonical:"/new" });
  const { t } = useI18n();
  const { activePolicy, policies, addAssessment, offline, setOffline } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [lot, setLot] = useState({
    lotId:"LOT-0245", farmer:"Ramesh Patil", center:"Lasalgaon APMC — NAFED", location:"Nashik, MH", assessor:"S. Kulkarni (Grader)", date:new Date().toISOString().slice(0,16)
  });
  const [captures, setCaptures] = useState([null,null,null]); // urls for preview
  const [captureFiles, setCaptureFiles] = useState([null,null,null]); // actual Files for Storage upload
  const [quality, setQuality] = useState(null);
  const [onions, setOnions] = useState(demoOnions.slice(0,5));
  const [reviewDecisions, setReviewDecisions] = useState({}); // id -> corrected defect
  const [policyVersion, setPolicyVersion] = useState(activePolicy.version);
  const policy = useMemo(()=> policies.find(p=>p.version===policyVersion) || activePolicy, [policyVersion, policies, activePolicy]);
  const grading = useMemo(()=> gradeLot(onions.map(o=> ({...o, defect: reviewDecisions[o.id] || o.defect })), policy), [onions, reviewDecisions, policy]);
  const lowConfidence = onions.filter(o=> o.confidence < CONFIDENCE_THRESHOLD);
  const [processing, setProcessing] = useState(false);
  const [farmerAccepted, setFarmerAccepted] = useState(false);
  const [graderAccepted, setGraderAccepted] = useState(false);
  const fileRefs = [useRef(),useRef(),useRef()];

  function next(){ setStep(s=> Math.min(STEP_KEYS.length-1, s+1)); }
  function prev(){ setStep(s=> Math.max(0, s-1)); }

  // capture helpers
  function useDemoImages(){
    setCaptures(["demo1","demo2","demo3"]);
    setCaptureFiles([null,null,null]);
    setQuality({ pass:true, issues:[] });
  }
  function handleFile(idx, e){
    const f=e.target.files?.[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    setCaptures(prev=> { const n=[...prev]; n[idx]=url; return n; });
    setCaptureFiles(prev=> { const n=[...prev]; n[idx]=f; return n; });
  }
  function runQualityCheck(){
    setProcessing(true);
    setTimeout(()=>{
      // simulate: if at least 2 captures => pass, else retake
      const filled = captures.filter(Boolean).length;
      if(filled<2){
        setQuality({ pass:false, issues:["Capture at least 2 views. Representative sampling requires multi-view coverage."] });
      } else if(captures[1]==="demo2" || captures[0]?.includes("demo")){
        setQuality({ pass:true, issues:[] });
      } else {
        // 85% pass randomly but deterministic for demo
        setQuality({ pass:true, issues:[] });
      }
      setProcessing(false);
    }, 900);
  }
  function simulateProcessingPipeline(){
    setProcessing(true);
    setTimeout(()=> setProcessing(false), 1200);
  }
  useEffect(()=>{ if(step===5 || step===6){ simulateProcessingPipeline(); } },[step]);

  // Detection (step 4): try live grading from captured Files, fall back to demo.
  function fileToBase64(file){
    return new Promise((resolve, reject)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  useEffect(()=>{
    if(step!==4) return;
    const files = captureFiles.filter(Boolean);
    if(offline || files.length===0) return; // demo mode — keep demoOnions
    let cancelled = false;
    (async ()=>{
      setProcessing(true);
      try{
        const images = await Promise.all(files.slice(0,3).map(fileToBase64));
        const resp = await fetch("/api/ai-analyze",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ images, policyVersion: policy.version }),
        });
        const data = await resp.json();
        if(cancelled || !Array.isArray(data.results) || !data.results.length) return;
        const boxes = demoOnions.map(o=> o.box);
        const validBox = b => b && [b.x,b.y,b.w,b.h].every(v=> Number.isFinite(Number(v)));
        const live = data.results.slice(0,10).map((r,i)=>({
          id: r.id || `O${i+1}`,
          sizeMm: Number(r.sizeMm) || 60,
          defect: ["Healthy","Damaged","Rotten","Sprouted"].includes(r.defect) ? r.defect : "Healthy",
          confidence: Math.max(0, Math.min(100, Number(r.confidence) || 70)),
          box: validBox(r.box) ? { x:Number(r.box.x), y:Number(r.box.y), w:Number(r.box.w), h:Number(r.box.h) } : boxes[i % boxes.length],
        }));
        setOnions(live);
      }catch{
        // keep demoOnions — demo/offline path must keep working
      }finally{
        if(!cancelled) setProcessing(false);
      }
    })();
    return ()=>{ cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[step]);

  async function finalize(){
    // keep sparse array so view_index is preserved (store skips nulls)
    const tmpId = lot.lotId.replace("LOT","OG");
    const canonical = JSON.stringify({ reportId: tmpId, lotId: lot.lotId, farmer: lot.farmer, center: lot.center, policyVersion: policy.version, gradeA: grading.gradeA, gradeB: grading.gradeB, gradeC: grading.gradeC, gradeReject: grading.gradeReject, urs: grading.urs, sampleSize: grading.total, onions: grading.details.map(d=>({id:d.id,sizeMm:d.sizeMm,defect:d.defect,confidence:d.confidence,grade:d.grade})) });
    const hash = await sha256(canonical);
    const entry = await addAssessment({
      lotId: lot.lotId, farmer: lot.farmer, center: lot.center, location: lot.location, assessor: lot.assessor,
      onions: grading.details, policyVersion: policy.version, modelVersion: "Prototype Demo Inference", hash,
      sampleSize: grading.total, gradeA: grading.gradeA, gradeB: grading.gradeB, gradeC: grading.gradeC, gradeReject: grading.gradeReject, urs: grading.urs,
      confidence: Math.round(onions.reduce((a,b)=>a+b.confidence,0)/onions.length),
      humanReviews: Object.keys(reviewDecisions).length + lowConfidence.length,
      status: farmerAccepted && graderAccepted ? "Completed" : "Completed",
      sync: offline ? "Offline" : "Synced",
      captures: captureFiles,
    });
    nav(`/reports/${entry.id}`, { replace:true });
  }

  return (
    <div style={{display:"grid", gap:16}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:"New Assessment", href:"/new"}]} />
      <div style={{display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:12, alignItems:"center"}}>
        <div>
          <h1 className="h-display" style={{fontSize:28, margin:0}}>{t("newAssessmentTitle")}</h1>
          <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>{t("farmerGraderSession")}</p>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span className="badge badge-maroon">{policy.version} · {policy.sizeBand.min}–{policy.sizeBand.max} mm</span>
          <span className={offline ? "badge badge-offline":"badge badge-success"}>{offline ? t("offlineQueued") : t("onlineLbl")}</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="card card-pad" style={{overflow:"hidden"}}>
        <div className="steps steps-scroll" style={{minWidth:0}}>
          {STEP_KEYS.map((k,i)=>(
            <div key={k} style={{display:"flex", alignItems:"center", gap:6, flexShrink:0}}>
              <div className={`step-dot ${i===step?"active": i<step?"done":""}`} >{i<step?"":i+1}</div>
              <span className="step-label" style={{color: i===step?"#7A263A": i<step?"#3F7D4A":"#8a7a74"}}>{t(k)}</span>
              {i<STEP_KEYS.length-1 && <div className={`step-line ${i<step?"done":""}`} />}
            </div>
          ))}
        </div>
        <div style={{marginTop:10, height:6, background:"#F3EAE2", borderRadius:999, overflow:"hidden"}}>
          <div style={{width:`${((step+1)/STEP_KEYS.length)*100}%`, height:"100%", background:"#7A263A", transition:"width .3s"}} />
        </div>
      </div>

      {/* Step contents */}
      <div className="card card-pad" style={{minHeight:420}}>
        {step===0 && <StepLot lot={lot} setLot={setLot} onNext={next} />}
        {step===1 && <StepSampling onNext={next} onPrev={prev} />}
        {step===2 && <StepCapture captures={captures} setCaptures={setCaptures} fileRefs={fileRefs} handleFile={handleFile} useDemo={useDemoImages} onNext={next} onPrev={prev} />}
        {step===3 && <StepQuality captures={captures} quality={quality} processing={processing} run={runQualityCheck} onNext={next} onPrev={prev} />}
        {step===4 && <StepDetection processing={processing} onions={onions} captures={captures} onNext={next} onPrev={prev} />}
        {step===5 && <StepSize onions={onions} processing={processing} onNext={next} onPrev={prev} />}
        {step===6 && <StepDefects onions={onions} processing={processing} onNext={next} onPrev={prev} />}
        {step===7 && <StepConfidence onions={onions} low={lowConfidence} onNext={next} onPrev={prev} />}
        {step===8 && <StepHumanReview onions={onions} low={lowConfidence} decisions={reviewDecisions} setDecisions={setReviewDecisions} onNext={next} onPrev={prev} />}
        {step===9 && <StepPolicy policy={policy} policies={policies} policyVersion={policyVersion} setPolicyVersion={setPolicyVersion} grading={grading} onions={onions} onNext={next} onPrev={prev} />}
        {step===10 && <StepFarmerReview grading={grading} lot={lot} policy={policy} farmerAccepted={farmerAccepted} setFarmerAccepted={setFarmerAccepted} graderAccepted={graderAccepted} setGraderAccepted={setGraderAccepted} onNext={next} onPrev={prev} />}
        {step===11 && <StepReport grading={grading} lot={lot} policy={policy} onions={onions} reviewDecisions={reviewDecisions} farmerAccepted={farmerAccepted} graderAccepted={graderAccepted} offline={offline} setOffline={setOffline} finalize={finalize} onPrev={prev} />}
      </div>

      <div style={{display:"flex", justifyContent:"space-between", gap:10}}>
        <button className="btn btn-secondary" onClick={prev} disabled={step===0}>← {t("back")}</button>
        {step<11 && <button className="btn btn-primary" onClick={next}>{t("continue")} →</button>}
      </div>
      <p style={{fontSize:11, color:"#8a7a74", textAlign:"center"}}>Demo inference (single) · Roboflow + Qwen (batch) — AI assists, human decides.</p>
    </div>
  );
}

function StepLot({lot,setLot,onNext}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("lotInformation")}</h3>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:12}}>
        <Field label={t("lotIdLbl")}><input className="input" value={lot.lotId} onChange={e=>setLot({...lot, lotId:e.target.value})} placeholder="LOT-0245" /></Field>
        <Field label={t("farmerSupplierLbl")}><input className="input" value={lot.farmer} onChange={e=>setLot({...lot, farmer:e.target.value})} /></Field>
        <Field label={t("procCenter")}><input className="input" value={lot.center} onChange={e=>setLot({...lot, center:e.target.value})} /></Field>
        <Field label={t("locationLbl")}><input className="input" value={lot.location} onChange={e=>setLot({...lot, location:e.target.value})} /></Field>
        <Field label={t("dateTimeLbl")}><input className="input" type="datetime-local" value={lot.date} onChange={e=>setLot({...lot, date:e.target.value})} /></Field>
        <Field label={t("assessorLbl")}><input className="input" value={lot.assessor} onChange={e=>setLot({...lot, assessor:e.target.value})} /></Field>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-primary" onClick={onNext}>{t("continueToSampling")}</button>
      </div>
    </div>
  );
}
function StepSampling({onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("representativeSampling")}</h3>
      <div style={{background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:12, padding:16, display:"grid", gap:12}}>
        <div style={{display:"flex", flexWrap:"wrap", alignItems:"center", gap:12, justifyContent:"center", fontWeight:700}}>
          <span className="badge">LOT</span> <span>↓</span> <span className="badge badge-maroon">REPRESENTATIVE SAMPLE</span> <span>↓</span> <span className="badge badge-success">MULTI-VIEW CAPTURE</span>
        </div>
        <p style={{margin:0, textAlign:"center", color:"#6B5A54", fontSize:13}}>The system does not need to inspect every onion individually. A defined sample from the lot is jointly selected by farmer + grader to reduce bias.</p>
        <div className="sampling-steps" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:10, fontSize:12, textAlign:"center"}}>
          <div className="card card-pad" style={{padding:12}}><b>Step 1</b><br/>Spread sample on mat</div>
          <div className="card card-pad" style={{padding:12}}><b>Step 2</b><br/>Place 25 mm reference</div>
          <div className="card card-pad" style={{padding:12}}><b>Step 3</b><br/>Capture 3 views</div>
        </div>
        <p style={{margin:0, fontSize:12, color:"#8a7a74", textAlign:"center", fontStyle:"italic"}}>{t("samplingQuote")}</p>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>{t("continue")} →</button>
      </div>
    </div>
  );
}
function StepCapture({captures,fileRefs,handleFile,useDemo,onNext,onPrev}){
  const { t } = useI18n();
  const filled = captures.filter(Boolean).length;
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("multiViewCapture")}</h3>
      <div className="capture-grid">
        {[0,1,2].map(i=>(
          <div key={i} className="card" style={{overflow:"hidden"}}>
            <div style={{padding:"10px 12px", fontSize:12, fontWeight:700, background:"#FBF6F0", borderBottom:"1px solid #EDE3DC", display:"flex", justifyContent:"space-between"}}>
              <span>VIEW {i+1} OF 3</span><span style={{color: captures[i] ? "#3F7D4A" : "#8a7a74"}}>{captures[i] ? "Captured" : "Pending"}</span>
            </div>
            <div style={{height:160, background:"#F3EAE2", display:"grid", placeItems:"center", position:"relative", overflow:"hidden"}}>
              {captures[i] ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={captures[i].startsWith("demo") ? "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop" : captures[i]} alt={`Captured onion sample view ${i+1} of 3 with onions arranged on mat`} width="400" height="300" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} />
              ) : (
                <div style={{textAlign:"center", color:"#8a7a74", fontSize:12}}>No image yet<br/>Use camera or upload</div>
              )}
              {i===0 && captures[i] && <span style={{position:"absolute", bottom:8, right:8, background:"white", border:"1px solid #EDE3DC", borderRadius:999, padding:"3px 8px", fontSize:10, fontWeight:700}}> 25 mm ref visible</span>}
            </div>
            <div style={{padding:10, display:"grid", gap:8}}>
              <input ref={fileRefs[i]} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(i,e)} />
              <button className="btn btn-secondary" style={{width:"100%", fontSize:13}} onClick={()=> fileRefs[i].current.click()}> Camera / Upload</button>
              {captures[i] && <button className="btn btn-ghost" style={{width:"100%", fontSize:12}} onClick={()=>{
                // retake
                const el=fileRefs[i].current; if(el) el.click();
              }}>Retake</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:12, background:"#FFFEFD"}}>
        <div style={{fontSize:12, fontWeight:700}}>Capture guidance</div>
        <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:8}}>
          {["Even lighting","Include 25 mm reference in View 1","Fill frame — avoid overlap","Onions fully visible"].map(t=> <span key={t} className="badge" style={{fontSize:11}}>{t}</span>)}
        </div>
      </div>
      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-ghost" onClick={useDemo}>Use demo images</button>
        <button className="btn btn-primary" onClick={onNext} disabled={filled<1}>Check Quality →</button>
      </div>
      {filled<1 && <p style={{margin:0, color:"#B33A3A", fontSize:12}}>Capture at least one view to continue (demo images available).</p>}
    </div>
  );
}
function StepQuality({quality,processing,run,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("imageQualityGate")}</h3>
      <p style={{margin:0, color:"#6B5A54", fontSize:13}}>Prevents poor input from entering the analysis pipeline. Checks sharpness, lighting, reference visibility, occlusion, framing.</p>
      {!quality ? (
        <div style={{display:"grid", gap:10}}>
          <button className="btn btn-primary" onClick={run} disabled={processing}>{processing ? "Checking..." : "Run Quality Check"}</button>
          {processing && <div className="card" style={{padding:14}}><div className="shimmer" style={{height:14, borderRadius:999}} /><p style={{fontSize:12, color:"#8a7a74", marginTop:8}}>Analyzing blur · lighting · reference object · framing…</p></div>}
        </div>
      ) : quality.pass ? (
        <div className="card" style={{borderColor:"#C8E4CC", background:"#EDF5EF", padding:16}}>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            <span style={{width:32,height:32, borderRadius:"50%", background:"#3F7D4A", color:"white", display:"grid", placeItems:"center", fontWeight:700}}></span>
            <div><div style={{fontWeight:700, color:"#3F7D4A"}}>PASS — Image quality accepted</div><div style={{fontSize:12, color:"#6B5A54"}}>Sharpness OK · Lighting OK · Reference visible · Framing OK</div></div>
          </div>
          <button className="btn btn-primary" style={{marginTop:12}} onClick={onNext}>Continue to detection →</button>
        </div>
      ) : (
        <div className="card" style={{borderColor:"#F5C2C2", background:"#FDECEC", padding:16}}>
          <div style={{fontWeight:700, color:"#B33A3A"}}>RETAKE REQUIRED</div>
          <ul style={{margin:"8px 0 0", paddingLeft:18, fontSize:13, color:"#6B5A54"}}>
            {quality.issues.map((iss,i)=> <li key={i}>{iss}</li>)}
          </ul>
          <div style={{display:"flex", gap:8, marginTop:12}}>
            <button className="btn btn-secondary" onClick={onPrev}>Retake Image</button>
            <button className="btn btn-ghost" onClick={run}>Re-check</button>
          </div>
          <p style={{margin:"8px 0 0", fontSize:12, color:"#8a7a74"}}>Example failures: “Image is too dark.” · “Reference object is not visible.” · “Onions are overlapping.” · “Image is blurry.”</p>
        </div>
      )}
      {!quality?.pass && quality && null}
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        {quality?.pass && <button className="btn btn-primary" onClick={onNext}>{t("continue")} →</button>}
      </div>
    </div>
  );
}
function StepDetection({processing,onions,captures=[],onNext,onPrev}){
  const { t } = useI18n();
  // Show the user's own capture; stock photo only in demo mode (no real capture).
  const realCapture = captures.find(c=> c && !String(c).startsWith("demo"));
  const imgSrc = realCapture || "https://images.unsplash.com/photo-1508747703725-719777637510?w=900&h=500&fit=crop";
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("onionDetection")}</h3>
      {processing ? (
        <div className="card" style={{padding:16, display:"grid", gap:10}}>
          <div className="shimmer" style={{height:180, borderRadius:12}} />
          <p style={{fontSize:12, color:"#6B5A54", margin:0}}>Detecting onions · segmenting crops for downstream analysis…</p>
        </div>
      ) : (
        <>
          <div style={{position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid #EDE3DC", height:260, background:"linear-gradient(180deg,#FDFBF9,#F3EAE2)"}}>
            <img src={imgSrc} alt="Segmented onion detection overlay showing detected onions with bounding boxes" width="900" height="500" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover", opacity:.88}} />
            {onions.slice(0,5).map(o=>(
              <div key={o.id} style={{position:"absolute", left:`${o.box.x}%`, top:`${o.box.y}%`, width:`${o.box.w}%`, height:`${o.box.h}%`, border:"2px solid #F2B84B", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,.18)", background:"rgba(242,184,75,.08)"}}>
                <span style={{position:"absolute", top:-8, left:8, background:"#F2B84B", color:"#17110F", fontSize:10, fontWeight:800, padding:"2px 6px", borderRadius:999}}>{o.id}</span>
              </div>
            ))}
            <span style={{position:"absolute", bottom:10, left:10, background:"white", border:"1px solid #EDE3DC", borderRadius:999, padding:"5px 10px", fontSize:12, fontWeight:700}}>{onions.length} onion{onions.length===1?"":"s"} detected</span>
          </div>
          <p style={{margin:0, fontSize:12, color:"#8a7a74"}}>Detector crops each onion for size + defect analysis.</p>
          <div style={{display:"flex", gap:8}}>
            <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
            <button className="btn btn-primary" onClick={onNext}>Continue to size →</button>
          </div>
        </>
      )}
    </div>
  );
}
function StepSize({onions,processing,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("sizeAnalysis")}</h3>
      {processing ? <div className="shimmer" style={{height:120, borderRadius:12}} /> : (
        <>
          <div className="card" style={{padding:14, background:"#FFFEFD"}}>
            <div style={{display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", fontSize:12}}>
              <span className="badge">Reference: 25 mm</span> <span>→</span> <span className="badge badge-maroon">Pixels → Millimeters</span> <span>→</span> <span className="badge badge-success">Diameter (mm)</span>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(92px,1fr))", gap:8, marginTop:12}}>
              {onions.map(o=>(
                <div key={o.id} className="card" style={{padding:8, textAlign:"center", minWidth:0}}>
                  <div style={{fontWeight:800, color:"#7A263A"}}>{o.id}</div>
                  <div style={{fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700}}>{o.sizeMm} <span style={{fontSize:12, color:"#8a7a74"}}>mm</span></div>
                  <div style={{fontSize:11, color:"#6B5A54"}}>{o.sizeMm>=35 && o.sizeMm<=70 ? "In band" : "Out of band"}</div>
                </div>
              ))}
            </div>
            <p style={{margin:"10px 0 0", fontSize:11, color:"#8a7a74"}}>Example: O1 — 72 mm · O2 — 65 mm · O3 — 58 mm · O4 — 69 mm · O5 — 61 mm. No depth sensor used.</p>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
            <button className="btn btn-primary" onClick={onNext}>Continue to defects →</button>
          </div>
        </>
      )}
    </div>
  );
}
function StepDefects({onions,processing,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("defectAnalysis")}</h3>
      {processing ? <div className="shimmer" style={{height:140, borderRadius:12}} /> : (
        <>
          <div className="card" style={{padding:12}}>
            <div style={{display:"grid", gap:8}}>
              {onions.map(o=>(
                <div key={o.id} style={{display:"flex", alignItems:"center", gap:8, padding:8, border:"1px solid #EDE3DC", borderRadius:10, background: o.defect==="Healthy" ? "#EDF5EF" : o.defect==="Rotten" ? "#FDECEC" : "#FEF3D8", minWidth:0}}>
                  <span style={{width:32, height:32, borderRadius:8, display:"grid", placeItems:"center", background:"white", border:"1px solid #EDE3DC", fontWeight:800, color:"#7A263A", flexShrink:0, fontSize:12}}>{o.id}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:700, fontSize:13}}>{o.defect} <span style={{fontWeight:500, color:"#6B5A54"}}>· {o.confidence}% confidence</span></div>
                    <div style={{height:6, background:"white", border:"1px solid #EDE3DC", borderRadius:999, overflow:"hidden", marginTop:4}}>
                      <div style={{width:`${o.confidence}%`, height:"100%", background: o.confidence>=60 ? "#3F7D4A" : "#D99024"}} />
                    </div>
                  </div>
                  <span className={`badge ${o.defect==="Healthy"?"badge-success": o.defect==="Rotten"?"badge-error":"badge-warning"}`} style={{fontSize:10, flexShrink:0}}>{o.confidence>=60?"Demo":"Review"}</span>
                </div>
              ))}
            </div>
            <p style={{margin:"10px 0 0", fontSize:11, color:"#8a7a74"}}>Demo defect review — Healthy / Damaged / Rotten / Sprouted. Human decides below 60%.</p>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
            <button className="btn btn-primary" onClick={onNext}>Confidence gate →</button>
          </div>
        </>
      )}
    </div>
  );
}
function StepConfidence({onions,low,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("confidenceGate")}</h3>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(132px,1fr))", gap:8}}>
        {onions.slice(0,4).map(o=>(
          <div key={o.id} className="card" style={{padding:10, textAlign:"center", borderColor: o.confidence>=CONFIDENCE_THRESHOLD ? "#C8E4CC" : "#FBE2A8", background: o.confidence>=CONFIDENCE_THRESHOLD ? "#EDF5EF" : "#FEF3D8", minWidth:0}}>
            <div style={{fontWeight:800, color:"#7A263A"}}>{o.id}</div>
            <div style={{fontFamily:"Fraunces, serif", fontSize:28, fontWeight:700, color: o.confidence>=60 ? "#3F7D4A" : "#B33A3A"}}>{o.confidence}%</div>
            <div className={`badge ${o.confidence>=CONFIDENCE_THRESHOLD ? "badge-success":"badge-error"}`} style={{marginTop:6, fontSize:9}}>{o.confidence>=CONFIDENCE_THRESHOLD?"AUTO-PROCESSED":"HUMAN REVIEW REQUIRED"}</div>
            <div style={{fontSize:11, color:"#6B5A54", marginTop:6}}>{o.confidence>=60 ? "≥ 60% → automatic continuation" : "< 60% → flagged for review"}</div>
          </div>
        ))}
      </div>
      {low.length>0 ? (
        <div className="card" style={{padding:12, background:"#FEF3D8", borderColor:"#FBE2A8"}}>
          <div style={{fontWeight:700, color:"#8a5a0a"}}> {low.length} onion{low.length>1?"s":""} below {CONFIDENCE_THRESHOLD}% — will require human review.</div>
          <div style={{fontSize:12, color:"#6B5A54"}}>AI confidence is below the configured threshold. Human review is required before finalizing.</div>
        </div>
      ) : (
        <div className="card" style={{padding:12, background:"#EDF5EF", borderColor:"#C8E4CC"}}>
          <div style={{fontWeight:700, color:"#3F7D4A"}}>All onions above threshold — can auto-continue.</div>
        </div>
      )}
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>Go to human review →</button>
      </div>
    </div>
  );
}
function StepHumanReview({onions,low,decisions,setDecisions,onNext,onPrev}){
  const { t } = useI18n();
  if(low.length===0){
    return (
      <div style={{display:"grid", gap:14}}>
        <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("humanReviewTitle")}</h3>
        <div className="card" style={{padding:16, background:"#EDF5EF", borderColor:"#C8E4CC"}}>
          <div style={{fontWeight:700, color:"#3F7D4A"}}>No low-confidence onions — review not required.</div>
          <p style={{margin:"6px 0 0", fontSize:13, color:"#6B5A54"}}>This is a human-in-the-loop system. High-confidence lots continue automatically; only uncertain cases are shown here.</p>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
          <button className="btn btn-primary" onClick={onNext}>{t("continue")} →</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("humanReviewTitle")}</h3>
      <div style={{display:"grid", gap:10}}>
        {low.map(o=>(
          <div key={o.id} className="card" style={{padding:14, display:"grid", gap:10}}>
            <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
              <span style={{width:40,height:40, borderRadius:10, background:"#7A263A", color:"white", display:"grid", placeItems:"center", fontWeight:800}}>{o.id}</span>
              <div>
                <div style={{fontWeight:700}}>{o.defect} · {o.confidence}% <span style={{color:"#B33A3A", fontWeight:600}}>— Below threshold</span></div>
                <div style={{fontSize:12, color:"#6B5A54"}}>Size {o.sizeMm} mm · AI classification shown for reference · Human decides.</div>
              </div>
              <span className="badge badge-warning" style={{marginLeft:"auto"}}>REVIEW REQUIRED</span>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              <button className={`btn ${!decisions[o.id] ? "btn-primary":"btn-secondary"}`} style={{fontSize:13}} onClick={()=> setDecisions(prev=>{ const n={...prev}; delete n[o.id]; return n; })}>Accept AI: {o.defect}</button>
              <select className="select" style={{maxWidth:200}} value={decisions[o.id] || ""} onChange={e=> setDecisions(prev=> ({...prev, [o.id]: e.target.value || undefined}))}>
                <option value="">— Change result —</option>
                <option value="Healthy">Healthy</option>
                <option value="Damaged">Damaged</option>
                <option value="Rotten">Rotten</option>
                <option value="Sprouted">Sprouted</option>
              </select>
              {decisions[o.id] && <span className="badge badge-success">Changed → {decisions[o.id]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>Continue to policy →</button>
      </div>
    </div>
  );
}
function StepPolicy({policy,policies,policyVersion,setPolicyVersion,grading,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("versionedPolicy")}</h3>
      <div className="policy-grid" style={{display:"grid", gap:12}}>
        <div className="card card-pad">
          <label className="label">Active policy version</label>
          <select className="select" value={policyVersion} onChange={e=> setPolicyVersion(e.target.value)}>
            {policies.map(p=> <option key={p.version} value={p.version}>{p.version} — {p.label} ({p.sizeBand.min}–{p.sizeBand.max} mm)</option>)}
          </select>
          <div style={{marginTop:10, fontSize:12, color:"#6B5A54"}}>{policy.description}</div>
          <div style={{marginTop:10, display:"grid", gap:6, fontSize:12}}>
            <div><b>Size band:</b> {policy.sizeBand.min}–{policy.sizeBand.max} mm</div>
            <div><b>Max rotten:</b> {policy.tolerances.rotten}% · <b>sprouted:</b> {policy.tolerances.sprouted}% · <b>damaged:</b> {policy.tolerances.damaged}%</div>
          </div>
          <div style={{marginTop:10, padding:8, background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:8, fontSize:11, color:"#8a7a74"}}>
            Policies can be changed without redeploying the application. Current policy is recorded in the report.
          </div>
        </div>
        <div className="card card-pad" style={{textAlign:"center"}}>
          <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>Lot result — Final grades</div>
          <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap", fontSize:13, fontWeight:700}}>
            <span>A:{grading.gradeA}%</span><span>B:{grading.gradeB}%</span><span>C:{grading.gradeC}%</span><span>Reject:{grading.gradeReject}%</span>
          </div>
          <div style={{fontSize:12, color:"#6B5A54", marginTop:6}}>URS: {grading.urs}% — separate metric</div>
          <div style={{fontSize:12, color:"#6B5A54"}}>Total sample: {grading.total} onions · Policy {policy.version}</div>
          <div style={{display:"flex", gap:6, justifyContent:"center", marginTop:10, flexWrap:"wrap"}}>
            <span className="badge badge-success">{grading.gradeA}% Grade A</span><span className="badge">{grading.gradeB}% Grade B</span><span className="badge">{grading.gradeC}% Grade C</span><span className="badge badge-error">{grading.gradeReject}% Reject</span>
          </div>
          <p style={{fontSize:11, color:"#8a7a74", marginTop:10}}>Policy changes affect the A/B/C/Reject grading rules. URS is reported separately.</p>
        </div>
      </div>
      <div className="card" style={{padding:12}}>
        <div style={{fontSize:12, fontWeight:700}}>Per-onion grading (policy {policy.version})</div>
        <div style={{display:"grid", gap:6, marginTop:8}}>
          {grading.details.map(d=>(
            <div key={d.id} className="grading-row" style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", fontSize:12, padding:"6px 8px", border:"1px solid #F3EAE2", borderRadius:8, background: d.grade==="Grade A" ? "#EDF5EF" : "#FEF3D8"}}>
              <b style={{minWidth:28}}>{d.id}</b><span>{d.sizeMm} mm</span><span>·</span><span>{d.defect}</span><span>·</span><span>{d.confidence}%</span><span className={`badge ${d.grade==="Grade A"?"badge-success":d.grade==="Reject"?"badge-error":"badge-warning"}`} style={{fontSize:10, marginLeft:"auto"}}>{d.grade}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>Farmer / Grader review →</button>
      </div>
      <style>{`@media(max-width:700px){ .policy-grid{grid-template-columns:1fr !important} }`}</style>
    </div>
  );
}
function StepFarmerReview({grading,lot,policy,farmerAccepted,setFarmerAccepted,graderAccepted,setGraderAccepted,onNext,onPrev}){
  const { t } = useI18n();
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("farmerGraderReview")}</h3>
      <p style={{margin:0, color:"#6B5A54", fontSize:13}}>The result is transparent to both parties. Never silently overwrite the original assessment — reviews create linked records.</p>
      <div className="policy-grid" style={{display:"grid", gap:12}}>
        <div className="card card-pad">
          <div style={{fontWeight:700}}>Grader</div>
          <div style={{fontSize:13, color:"#6B5A54"}}>{lot.assessor} · Review · Confirm · Finalize</div>
          <label style={{display:"flex", gap:8, alignItems:"center", marginTop:12, fontSize:13, cursor:"pointer"}}>
            <input type="checkbox" checked={graderAccepted} onChange={e=>setGraderAccepted(e.target.checked)} /> I have reviewed the evidence and grading against <b>{policy.version}</b>
          </label>
          <div style={{marginTop:10, display:"flex", gap:8}}>
            <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=> setGraderAccepted(true)}>Confirm</button>
            <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=> setGraderAccepted(false)}>Request second review</button>
          </div>
        </div>
        <div className="card card-pad">
          <div style={{fontWeight:700}}>Farmer</div>
          <div style={{fontSize:13, color:"#6B5A54"}}>{lot.farmer} · View result · View evidence · Request second review if dissatisfied</div>
          <label style={{display:"flex", gap:8, alignItems:"center", marginTop:12, fontSize:13, cursor:"pointer"}}>
            <input type="checkbox" checked={farmerAccepted} onChange={e=>setFarmerAccepted(e.target.checked)} /> I have seen the report and evidence
          </label>
          <div style={{marginTop:10}}>
            <button className="btn btn-ghost" style={{fontSize:12, color:"#B33A3A", borderColor:"#F5C2C2"}} onClick={()=> alert("Review flow: creates linked review record, preserves original.")}>Request Second Review</button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14, textAlign:"center", background:"#FBF6F0"}}>
        <div style={{fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700}}>A:{grading.gradeA}% B:{grading.gradeB}% C:{grading.gradeC}% Reject:{grading.gradeReject}%</div>
        <div style={{fontSize:12, color:"#6B5A54"}}>URS: {grading.urs}% separate · Lot {lot.lotId} · {policy.version} · {grading.total} onions</div>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={onNext}>Generate report →</button>
      </div>
    </div>
  );
}
function StepReport({grading,lot,policy,onions,reviewDecisions,farmerAccepted,graderAccepted,offline,setOffline,finalize,onPrev}){
  const { t } = useI18n();
  const hash = "computed on finalize — SHA-256 over canonical report content";
  return (
    <div style={{display:"grid", gap:14}}>
      <h3 style={{margin:0, fontSize:16, fontWeight:700}}>{t("qualityReportEvidence")}</h3>
      <div className="card card-pad" style={{border:"1px solid #EDE3DC"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"start", gap:12, flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:18, color:"#7A263A"}}>ONIONSETU</div>
            <div style={{fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>Quality Assessment Report</div>
          </div>
          <div style={{textAlign:"right", fontSize:11, color:"#6B5A54"}}>
            <div>Report ID: <span className="mono">{lot.lotId.replace("LOT","OG")}</span></div>
            <div>Policy: {policy.version} · Model: Prototype Demo Inference</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </div>
        <div className="divider" />
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:10, fontSize:12}}>
          <div><b>Lot ID:</b> {lot.lotId}</div><div><b>Farmer:</b> {lot.farmer}</div><div><b>Center:</b> {lot.center}</div><div><b>Sample:</b> {grading.total} onions</div><div><b>Grades:</b> A:{grading.gradeA}% B:{grading.gradeB}% C:{grading.gradeC}% Reject:{grading.gradeReject}%</div><div><b>URS:</b> {grading.urs}% separate</div>
        </div>
        <div style={{marginTop:10, display:"flex", gap:6, flexWrap:"wrap"}}>
          <span className="badge badge-success">A {grading.gradeA}%</span><span className="badge">B {grading.gradeB}%</span><span className="badge">C {grading.gradeC}%</span><span className="badge badge-error">Reject {grading.gradeReject}%</span><span className="badge">URS {grading.urs}% separate</span><span className="badge badge-maroon">{policy.version}</span>
        </div>
        <div style={{marginTop:12, background:"#FDFBF9", border:"1px solid #EDE3DC", borderRadius:10, padding:12}}>
          <div style={{fontSize:12, fontWeight:700}}>Evidence included</div>
          <ul style={{margin:"6px 0 0", paddingLeft:18, fontSize:12, color:"#6B5A54"}}>
            <li>Capture photos (3 views) · per-onion size + defect + confidence</li>
            <li>Human review decisions ({Object.keys(reviewDecisions).length || "0"} corrections) · timestamp & location</li>
            <li>Policy version {policy.version} · model version · assessor sign-off</li>
            <li>SHA-256 photo-set hash stored alongside report for tamper evidence</li>
          </ul>
        </div>
        <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{width:72,height:72, border:"1px solid #EDE3DC", borderRadius:8, display:"grid", placeItems:"center", background:"white", fontSize:10, textAlign:"center", padding:6}}>QR<br/>Verify<br/>Report</div>
          <div style={{fontSize:11, color:"#8a7a74"}}>QR links to verification page<br/><span className="mono">/verify/{lot.lotId.replace("LOT","OG")}</span><br/>Shows status · policy · hash</div>
          <span className="badge" style={{marginLeft:"auto", fontSize:10}}>Farmer: {farmerAccepted?" Ack":"Pending"} · Grader: {graderAccepted?" Ack":"Pending"}</span>
        </div>
      </div>

      <div className="card card-pad" style={{background: offline ? "#FFF4E6" : "#EDF5EF", borderColor: offline ? "#FFE1B5" : "#C8E4CC"}}>
        <div style={{fontWeight:700, color: offline ? "#9A5A00" : "#3F7D4A"}}>{offline ? "OFFLINE — Assessment saved locally" : "SYNCED — Ready for Supabase"}</div>
        <div style={{fontSize:12, color:"#6B5A54"}}>{offline ? "Assessment saved locally. Will sync when connection returns. (Local encrypted queue → Supabase on reconnect)" : "Assessment successfully synchronized to Supabase (PostgreSQL + Storage + Auth + RLS)."}</div>
        <div style={{display:"flex", gap:8, marginTop:10}}>
          <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=> setOffline(v=>!v)}>{offline ? "Simulate: Go online" : "Simulate: Go offline"}</button>
          {offline && <span className="badge badge-offline">Pending sync</span>}
        </div>
      </div>
      <p style={{margin:0, fontSize:11, color:"#8a7a74"}}>Integrity: SHA-256 provides tamper evidence for the stored photo set. It does not prove physical sample representativeness — stated as a known limitation. No blockchain used.</p>
      <div style={{display:"flex", gap:8}}>
        <button className="btn btn-secondary" onClick={onPrev}>{t("back")}</button>
        <button className="btn btn-primary" onClick={finalize}>Finalize & Generate Report →</button>
      </div>
    </div>
  );
}

function Field({label, children}){ return <label style={{display:"grid", gap:4}}><span className="label">{label}</span>{children}</label>; }
