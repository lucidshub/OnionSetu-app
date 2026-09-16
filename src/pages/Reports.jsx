import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { QRCodeSVG } from "qrcode.react";

export function ReportsList(){
  const { t: tList } = useI18n();
  useSeo({ title:"Reports", description:"Evidence-backed quality reports — open tamper-evident PDFs with QR verification, policy version and SHA-256 hash for every assessment.", canonical:"/reports" });
  const { assessments } = useStore();
  return (
    <div style={{display:"grid", gap:14}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:"Reports", href:"/reports"}]} />
      <h1 className="h-display" style={{fontSize:28, margin:0}}>{tList("qualityReports")}</h1>
      <p style={{margin:"-6px 0 0", color:"#6B5A54", fontSize:12}}>{tList("storedAsText")}</p>
      {/* Test artifact — kept for dev, not promoted as production feature */}
      <details style={{background:"#FDFBF9", border:"1px solid #EDE3DC", borderRadius:10, padding:"10px 14px"}}>
        <summary style={{fontSize:12, fontWeight:700, cursor:"pointer", color:"#6B5A54"}}>Developer test artifact — TOM2024 (120 sampled) — hidden by default</summary>
        <div style={{marginTop:8, display:"flex", gap:8, flexWrap:"wrap"}}>
          <a href="/test_reports/OnionSetu_TOM2024_Final_Report.pdf" target="_blank" rel="noopener" className="btn btn-secondary" style={{fontSize:11}}>Download Test PDF</a>
          <a href="/test_reports/tom2024_reports.json" target="_blank" rel="noopener" className="btn btn-ghost" style={{fontSize:11}}>JSON</a>
          <span style={{fontSize:11, color:"#8a7a74"}}>Not a production report — for validation only</span>
        </div>
      </details>
      <div style={{display:"grid", gap:10}}>
        {assessments.map(a=>(
          <Link key={a.id} to={`/reports/${a.id}`} className="card card-pad report-list-card" style={{display:"flex", gap:14, alignItems:"center", flexWrap:"wrap"}}>
            <div style={{width:48,height:48, flexShrink:0, borderRadius:10, background:"#7A263A", color:"white", display:"grid", placeItems:"center", fontWeight:700, fontFamily:"Fraunces, serif", fontSize:16}}>{a.id.slice(-2)}</div>
            <div style={{flex:"1 1 200px", minWidth:0}}>
              <div className="report-list-title" style={{fontWeight:700, overflowWrap:"anywhere"}}>{a.id} — A:{a.gradeA}% B:{a.gradeB ?? 0}% C:{a.gradeC ?? 0}% R:{a.gradeReject ?? a.reject ?? 0}% · URS:{a.urs}% <span className={`badge ${a.status==="Human Review"?"badge-warning":"badge-success"}`} style={{marginLeft:8}}>{a.status}</span></div>
              <div style={{fontSize:12, color:"#6B5A54", overflowWrap:"anywhere"}}>{a.lotId} · {a.farmer} · {a.center} · Policy {a.policyVersion} · {new Date(a.date).toLocaleDateString()}</div>
            </div>
            <span className="btn btn-secondary report-list-btn" style={{fontSize:12}}>{tList("openReport")} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ReportDetail(){
  const { id } = useParams();
  const { assessments, updateAssessment } = useStore();
  const { t, lang, languages } = useI18n();
  const [printLang, setPrintLang] = useState(null); // null = follow app lang, "en" = force English
  const effectiveLang = printLang || lang;
  const effectiveT = (k)=> {
    if(printLang==="en"){
      const enDict = { reportId:"Report ID", date:"Date", location:"Location", policyVersion:"Policy version", gradeA:"Grade A %", urs:"URS %", confidence:"Confidence", farmerAck:"Farmer acknowledgement", graderAck:"Grader acknowledgement", disputeStatus:"Review status", reviewStatus:"Review status" };
      return enDict[k] || k;
    }
    return t(k);
  };
  const a = assessments.find(x=> x.id===id);
  useSeo({ title: a ? `Report ${a.id}` : "Report", description: a ? `${a.id} — Grades A:${a.gradeA}% B:${a.gradeB ?? 0}% C:${a.gradeC ?? 0}% Reject:${a.gradeReject ?? 0}%, URS ${a.urs}% separate at ${a.location}.` : "Tamper-evident onion quality report with QR verification.", canonical: `/reports/${id}` });
  if(!a) return <div className="card card-pad">{t("verifyFail")}. <Link to="/reports">{t("browseReports")}</Link></div>;
  const hasImages = Array.isArray(a.images) && a.images.length;
  const hasOnions = Array.isArray(a.onions) && a.onions.length;
  const verifyUrl = `https://onion-setu.vercel.app/verify/${a.id}`;
  return (
    <div style={{display:"grid", gap:14}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:"Reports", href:"/reports"},{label:a.id, href:`/reports/${a.id}`}]} />
      <Link to="/reports" className="btn btn-ghost" style={{justifySelf:"start"}}>← All reports</Link>
      <h1 className="h-display" style={{fontSize:22, margin:0, position:"absolute", left:-9999, top:"auto", width:1, height:1, overflow:"hidden"}}>Report {a.id} — {a.gradeA}% Grade A quality assessment for {a.farmer}</h1>
      <div className="card card-pad" style={{border:"1px solid #EDE3DC"}}>
        <div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
          <div>
            <div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:22, color:"#7A263A"}}>ONIONSETU</div>
            <div style={{fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>Quality Assessment Report — Final</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"Fraunces, serif", fontSize:20, fontWeight:700, color:"#7A263A"}}>A:{a.gradeA}%  B:{a.gradeB||0}%  C:{a.gradeC||0}%  Reject:{a.gradeReject||0}%</div>
            <div style={{fontFamily:"Fraunces, serif", fontSize:13, fontWeight:700, color:"#6B5A54"}}>URS: {a.urs}% — separate</div>
            <div style={{marginTop:6}}><span className={`badge ${a.status==="Human Review"?"badge-warning":"badge-success"}`}>{a.status}</span> <span className={`badge ${a.acceptance==="Accepted"?"badge-success":"badge-error"}`} style={{marginLeft:6}}>{a.acceptance || "Accepted"}</span> <span className={`badge ${a.sync==="Offline"?"badge-offline":"badge-success"}`}>{a.sync}</span></div>
          </div>
        </div>

        <div className="divider" />

        {/* ——— STORAGE FORMAT — exactly as requested, typed ——— */}
        <div style={{background:"#FDFBF9", border:"1px solid #EDE3DC", borderRadius:12, overflow:"hidden"}}>
          <div style={{padding:"12px 14px", background:"#FBF6F0", borderBottom:"1px solid #EDE3DC", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8}}>
            <div style={{fontWeight:700, fontSize:13}}>{effectiveT("storedReportData") || "Stored Report Data"}</div>
            <span className="badge badge-maroon" style={{fontSize:10}}>{a.policyVersion} · {a.modelVersion}</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:0, fontSize:13}}>
            <Row label={effectiveT("reportId")} value={a.id} mono />
            <Row label={effectiveT("date")} value={new Date(a.date).toLocaleString()} />
            <Row label={effectiveT("location")} value={`${a.location} · ${a.center}`} />
            <Row label={effectiveT("policyVersion")} value={a.policyVersion} badge />
            <Row label="Grade A" value={`${a.gradeA}%`} strong color="#7A263A" />
            <Row label="Grade B" value={`${a.gradeB||0}%`} strong />
            <Row label="Grade C" value={`${a.gradeC||0}%`} strong />
            <Row label="Reject" value={`${a.gradeReject||0}%`} strong color="#B33A3A" />
            <Row label="URS" value={`${a.urs}%`} strong color="#6B5A54" />
            <Row label={effectiveT("confidence")} value={`${a.confidence ?? "—"}%`} suffix={a.confidence>=60 ? "High" : a.confidence ? "Review" : ""} />
            <Row label={effectiveT("farmerAck")} value={a.acknowledged?.farmer ? `${effectiveT("acknowledged")} ` : effectiveT("pending")} dot={a.acknowledged?.farmer ? "#3F7D4A" : "#D99024"} />
            <Row label={effectiveT("graderAck")} value={a.acknowledged?.grader ? `${effectiveT("acknowledged")} ` : effectiveT("pending")} dot={a.acknowledged?.grader ? "#3F7D4A" : "#D99024"} />
            <Row label={effectiveT("disputeStatus")} value={a.status==="Human Review" ? effectiveT("underReview") : a.acceptance==="Rejected" ? effectiveT("disputed") : effectiveT("acknowledged")} badgeColor={a.status==="Human Review" ? "warning" : a.acceptance==="Rejected" ? "error" : "success"} />
            <Row label={effectiveT("sampleSize")} value={`${a.sampleSize} onions`} />
            <Row label={effectiveT("lotId")} value={a.lotId} mono />
            <Row label={effectiveT("hash")} value={a.hash} mono small />
          </div>
        </div>

        {/* ——— UPLOADED IMAGES — part of final report ——— */}
        <div style={{marginTop:14}}>
          <div style={{fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:8}}>
            {t("uploadedImages")} — {t("finalReport")}
            <span className="badge" style={{fontSize:10}}>{hasImages ? `${a.images.length} captured views` : "Demo views"}</span>
            <span className="badge badge-maroon" style={{fontSize:10}}>{t("storedIn")}</span>
          </div>
          <div style={{fontSize:11, color:"#6B5A54", marginTop:2}}>These are the exact 3 views captured (with 25mm reference). They are stored in <span className="mono" style={{fontSize:11}}>assessment-images</span> bucket: <span className="mono" style={{fontSize:10}}>{a.id}/view_0..2.jpg</span> — referenced by <span className="mono" style={{fontSize:10}}>assessment_images</span> table.</div>
          <div className="capture-grid" style={{display:"grid", gap:10, marginTop:10}}>
            {[0,1,2].map(i=>{
              const stored = hasImages ? a.images.find(im=> im.view_index===i) : null;
              const demoSrc = "https://images.unsplash.com/photo-1508747703725-719777637510?w=600&h=400&fit=crop";
              const src = stored?.public_url || demoSrc;
              const label = `View ${i+1} of 3${i===0 ? " · 25mm ref" : ""}`;
              return (
                <div key={i} style={{border:"1px solid #EDE3DC", borderRadius:10, overflow:"hidden", background:"white"}}>
                  <img src={src} onError={(e)=>{ if(e.currentTarget.src !== demoSrc) e.currentTarget.src = demoSrc; }} alt={`Report ${a.id} uploaded image ${label} captured at ${a.location} on ${new Date(a.date).toLocaleDateString()}`} width="600" height="400" loading="lazy" style={{width:"100%", height:140, objectFit:"cover"}} />
                  <div style={{padding:"8px 10px", fontSize:11, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <span style={{fontWeight:700}}>{label}</span>
                    <span className="badge" style={{fontSize:9}}>{stored ? (stored.local ? "Local preview" : "Stored") : "Demo placeholder"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>

        <div style={{background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:10, padding:10, marginTop:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{background:"white", border:"1px solid #EDE3DC", borderRadius:8, padding:6}}>
            <QRCodeSVG value={verifyUrl} size={72} level="M" bgColor="#FFFFFF" fgColor="#7A263A" />
          </div>
          <div style={{fontSize:11}}>
            <div style={{fontWeight:700}}>{t("qrVerify")}</div>
            <div className="mono" style={{color:"#6B5A54", fontSize:10, wordBreak:"break-all"}}>{verifyUrl}</div>
            <div style={{fontSize:10, color:"#8a7a74"}}>Scan to open report — data is saved per-user in Supabase</div>
            <Link to={`/verify/${a.id}`} className="btn btn-secondary" style={{fontSize:11, padding:"5px 8px", marginTop:6}}>{t("openVerification")} →</Link>
          </div>
          <div style={{marginLeft:"auto", fontSize:11, color:"#6B5A54"}}>{t("reviewFlow")}</div>
        </div>

        <div className="card card-pad" style={{background: a.acceptance==="Rejected" ? "#FDECEC" : "#EDF5EF", borderColor: a.acceptance==="Rejected" ? "#F5C2C2" : "#C8E4CC", marginTop:14}}>
          <div style={{display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
            <div style={{fontWeight:700, fontSize:13}}>{t("lotStatusLbl")}: <span className={`badge ${a.acceptance==="Accepted"?"badge-success":"badge-error"}`} style={{marginLeft:6}}>{a.acceptance || "Accepted"}</span></div>
            <span style={{fontSize:11, color:"#6B5A54"}}>{t("acceptedHint")}</span>
            <div style={{marginLeft:"auto", display:"flex", gap:8}}>
              <button className={`btn ${a.acceptance==="Accepted"?"btn-primary":"btn-secondary"}`} style={{fontSize:11, padding:"6px 10px"}} onClick={()=> updateAssessment(a.id, { acceptance:"Accepted" })}>{t("markAccepted")}</button>
              <button className={`btn ${a.acceptance==="Rejected"?"btn-primary":"btn-secondary"}`} style={{fontSize:11, padding:"6px 10px", background: a.acceptance==="Rejected" ? "#B33A3A" : undefined, borderColor: a.acceptance==="Rejected" ? "#B33A3A" : undefined, color: a.acceptance==="Rejected" ? "white" : undefined}} onClick={()=> updateAssessment(a.id, { acceptance:"Rejected" })}>{t("markRejected")}</button>
            </div>
          </div>
        </div>

        <div className="divider" />
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
          <button className="btn btn-primary" onClick={()=> { setPrintLang(null); setTimeout(()=> window.print(), 100); }}>{t("downloadInSelected")} {languages.find(l=>l.code===lang)?.native} →</button>
          <button className="btn btn-secondary" onClick={()=> { setPrintLang("en"); setTimeout(()=> window.print(), 100); }}>{t("downloadInEnglish")} →</button>
          {printLang && <span className="badge badge-maroon" style={{fontSize:10}}>{printLang==="en" ? "English" : languages.find(l=>l.code===printLang)?.native} print mode — press Print again to switch</span>}
          <button className="btn btn-secondary" onClick={()=> {
            updateAssessment(a.id, { acknowledged:{ farmer:true, grader:true } });
            alert(t("ackDoneAlert"));
          }}>{t("markAckBtn")}</button>
          <button className="btn btn-ghost" style={{color:"#B33A3A"}} onClick={()=>{
            updateAssessment(a.id, { status:"Human Review", dispute:{ reason:"Flagged for human review", at:new Date().toISOString(), by:"Farmer" } });
            alert(t("flagDoneAlert"));
          }}>{t("flagHumanBtn")}</button>
          {a.dispute && <span className="badge badge-warning">On Hold: {a.dispute.reason}</span>}
        </div>
      </div>
      <style>{`@media(max-width:800px){ .capture-grid{grid-template-columns:1fr !important} }`}</style>
    </div>
  );
}

function Row({label, value, mono, small, strong, color, badge, badgeColor, dot, suffix}){
  return (
    <div style={{display:"flex", justifyContent:"space-between", gap:12, padding:"9px 14px", borderBottom:"1px solid #F3EAE2", borderRight:"1px solid #F3EAE2", alignItems:"center", background:"white"}}>
      <span style={{fontSize:11, letterSpacing:".06em", textTransform:"uppercase", fontWeight:700, color:"#8a7a74"}}>{label}</span>
      <span style={{display:"flex", gap:8, alignItems:"center", fontSize: mono ? (small ? 10 : 11) : 13, fontWeight: strong ? 700 : 500, color: color || "#17110F", fontFamily: mono ? "JetBrains Mono, monospace" : undefined, textAlign:"right", wordBreak: mono ? "break-all" : undefined, maxWidth:"58%"}}>
        {dot && <span className="dot" style={{background:dot}} />}
        <span style={{overflow:"hidden", textOverflow:"ellipsis"}}>{value}</span>
        {badge && <span className={`badge badge-${badgeColor||"maroon"}`} style={{fontSize:9}}>{value}</span>}
        {suffix && <span className="badge" style={{fontSize:9}}>{suffix}</span>}
      </span>
    </div>
  );
}
