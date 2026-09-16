import { useRef, useState } from "react";
import { useSeo, Breadcrumbs } from "../lib/seo";

const MIN_VIEWS = 10;
const MAX_VIEWS = 15;

function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function BatchGrading(){
  useSeo({ title:"Batch Grading", description:"Grade one onion batch (100-200 onions) from 10-15 multi-view photos with Roboflow detection and Qwen assessment.", canonical:"/batch" });
  const [assessed, setAssessed] = useState(150);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function onPick(e){
    const list = Array.from(e.target.files || []).filter(f=> f.type.startsWith("image/"));
    setFiles(prev=> [...prev, ...list].slice(0, MAX_VIEWS));
    setErr("");
    e.target.value = "";
  }
  function removeAt(i){ setFiles(prev=> prev.filter((_,x)=> x!==i)); }

  async function submit(){
    setErr(""); setResult(null);
    const n = Number(assessed);
    if(!Number.isInteger(n) || n < 100 || n > 200){ setErr("Batch size must be a whole number between 100 and 200."); return; }
    if(files.length < MIN_VIEWS){ setErr(`Add at least ${MIN_VIEWS} views of the same batch (you have ${files.length}).`); return; }
    setBusy(true);
    try{
      const images = await Promise.all(files.slice(0, MAX_VIEWS).map(fileToDataUrl));
      const resp = await fetch("/api/analyze-batch",{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ assessed_onions: n, images }),
      });
      const data = await resp.json().catch(()=> ({}));
      if(!resp.ok && !data.review_required){
        setErr(data.error || `Request failed (HTTP ${resp.status}).`);
        return;
      }
      setResult(data);
    }catch(e){
      setErr(`Network failure: ${String(e?.message || e)}. Check connection and retry — nothing was graded.`);
    }finally{
      setBusy(false);
    }
  }

  const r = result;
  return (
    <div style={{display:"grid", gap:14, maxWidth:820}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:"Batch Grading", href:"/batch"}]} />
      <h1 className="h-display" style={{fontSize:28, margin:0}}>Batch grading</h1>
      <p style={{margin:"-6px 0 0", color:"#6B5A54", fontSize:13}}>One physical batch of 100–200 onions, photographed in 10–15 views. Views are evidence of the same batch — never counted as unique onions.</p>

      <div className="card card-pad" style={{display:"grid", gap:12}}>
        <label style={{display:"grid", gap:6, maxWidth:280}}>
          <span className="label">Declared batch size (100–200) *</span>
          <input className="input" type="number" min={100} max={200} value={assessed} onChange={e=> setAssessed(Number(e.target.value))} />
        </label>
        <div>
          <div style={{fontSize:12, fontWeight:700, marginBottom:6}}>Batch views ({files.length} / {MAX_VIEWS}, minimum {MIN_VIEWS})</div>
          <input ref={inputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={onPick} />
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <button className="btn btn-secondary" style={{fontSize:13}} onClick={()=> inputRef.current?.click()}>Add photos</button>
            <span style={{fontSize:12, color:"#6B5A54", alignSelf:"center"}}>Same batch, different angles. Blurry/invalid images will request review, not a fake grade.</span>
          </div>
          {files.length > 0 && (
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:8, marginTop:10}}>
              {files.map((f,i)=>(
                <div key={i} className="card" style={{padding:8, fontSize:11}}>
                  <div style={{fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>View {i+1}</div>
                  <div style={{color:"#6B5A54", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{f.name}</div>
                  <button className="btn btn-ghost" style={{fontSize:11, padding:"4px 6px"}} onClick={()=> removeAt(i)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {err && <div style={{background:"#FDECEC", border:"1px solid #F5C2C2", color:"#B33A3A", borderRadius:10, padding:"10px 12px", fontSize:13}}>{err}</div>}
        <button className="btn btn-primary" style={{minHeight:44}} disabled={busy} onClick={submit}>{busy ? "Analyzing batch…" : "Analyze batch →"}</button>
      </div>

      {r && (
        <div className="card card-pad" style={{display:"grid", gap:12}}>
          <h3 style={{margin:0, fontSize:16, fontWeight:700}}>Result</h3>
          {r.error && (
            <div style={{background:"#FEF3D8", border:"1px solid #FBE2A8", borderRadius:10, padding:10, fontSize:13}}>
              <b>Human review required</b> — {r.error}{r.detail ? `: ${r.detail}` : ""}. No grade was fabricated.
            </div>
          )}
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px,1fr))", gap:10, fontSize:13}}>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>BATCH SIZE</div><div style={{fontSize:20, fontWeight:700}}>{r.assessed_onions ?? assessed}</div></div>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>VIEWS</div><div style={{fontSize:20, fontWeight:700}}>{r.views_submitted ?? files.length} / {MAX_VIEWS}</div></div>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>URS</div><div style={{fontSize:20, fontWeight:700}}>{r.grading ? `${r.qwen?.urs_onions ?? "?"} onions` : "—"}</div></div>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>URS %</div><div style={{fontSize:20, fontWeight:700}}>{r.grading ? `${r.grading.urs_percent}%` : "—"}</div></div>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>FINAL GRADE</div><div style={{fontFamily:"Fraunces, serif", fontSize:28, fontWeight:700, color:"#7A263A"}}>{r.grading ? r.grading.grade : "—"}</div></div>
            <div><div style={{fontSize:11, color:"#8a7a74", fontWeight:700}}>AI ASSESSMENT CONFIDENCE</div><div style={{fontSize:20, fontWeight:700}}>{r.qwen ? `${Math.round(r.qwen.confidence*100)}%` : "—"}</div></div>
          </div>
          <div style={{fontSize:12, color:"#6B5A54"}}>Final grade calculated using OnionSetu grading policy {r.grading ? r.grading.policy_version : "v0.2"}.</div>
          {r.roboflow && <div style={{fontSize:12, color:"#6B5A54"}}>Roboflow <span className="mono" style={{fontSize:11}}>{r.roboflow.model}</span> per-view detections: [{r.roboflow.detection_count_by_view.join(", ")}] (evidence only — not summed as unique onions). Avg detection confidence: {r.roboflow.average_detection_confidence}.</div>}
          {r.qwen?.issues?.length > 0 && (
            <div style={{display:"grid", gap:6}}>
              {r.qwen.issues.map((it,i)=>(
                <div key={i} style={{fontSize:12, padding:"6px 8px", border:"1px solid #F3EAE2", borderRadius:8}}><b>{it.issue}</b> × {it.count} <span style={{color:"#6B5A54"}}>— {it.description}</span></div>
              ))}
            </div>
          )}
          <div>
            {r.review_required
              ? <span className="badge badge-warning">Human review required{r.review_reasons?.length ? `: ${r.review_reasons.join(", ")}` : ""}</span>
              : <span className="badge badge-success">Review Required: No</span>}
          </div>
        </div>
      )}
    </div>
  );
}
