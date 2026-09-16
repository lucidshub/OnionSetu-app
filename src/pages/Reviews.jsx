import { useStore } from "../lib/store";
import { useState } from "react";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

export default function Reviews(){
  const { t } = useI18n();
  useSeo({ title:"Review Center", description:"Human-in-the-loop review queue — low-confidence onions flagged below 60% for grader confirmation. Accept or correct AI results; original preserved.", canonical:"/reviews" });
  const { assessments, updateAssessment } = useStore();
  const uncertain = assessments.flatMap(a=> (a.onions||[]).filter(o=> o.confidence<60).map(o=> ({...o, assessmentId:a.id, lotId:a.lotId, farmer:a.farmer})));
  const [decisions, setDecisions] = useState({});
  function act(o, action){
    setDecisions(prev=> ({...prev, [o.id+o.assessmentId]: action}));
  }
  return (
    <div style={{display:"grid", gap:14}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:t("reviews"), href:"/reviews"}]} />
      <div>
        <h1 className="h-display" style={{fontSize:28, margin:0}}>{t("reviewCenter")}</h1>
        <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>{t("reviewDesc")}</p>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:12}}>
        {uncertain.length===0 ? (
          <div className="card card-pad" style={{background:"#EDF5EF", borderColor:"#C8E4CC"}}>{t("noReviews")}</div>
        ) : uncertain.map(o=>(
          <div key={o.id+o.assessmentId} className="card card-pad" style={{display:"grid", gap:10}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontWeight:800, color:"#7A263A"}}>{o.id} <span style={{color:"#8a7a74", fontWeight:500}}>· {o.assessmentId}</span></span>
              <span className="badge badge-warning">{t("statusHumanReview")}</span>
            </div>
            <div style={{fontSize:13}}><b>AI:</b> {o.defect} · <b>{t("confidence")}:</b> {o.confidence}% · <b>{t("stepSize")}:</b> {o.sizeMm} mm</div>
            <div style={{fontSize:12, color:"#6B5A54"}}>{t("lotLbl")} {o.lotId} · {o.farmer}</div>
            <div style={{display:"flex", gap:8}}>
              <button className={`btn ${decisions[o.id+o.assessmentId]==="accepted" ? "btn-primary":"btn-secondary"}`} style={{flex:1, fontSize:12}} onClick={()=> act(o,"accepted")}>{t("acceptAI")}</button>
              <button className={`btn ${decisions[o.id+o.assessmentId]==="changed" ? "btn-primary":"btn-secondary"}`} style={{flex:1, fontSize:12}} onClick={()=> act(o,"changed")}>{t("changeOpt")}</button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=> act(o,"reviewed")}>{t("reviewBtn")}</button>
            </div>
            {decisions[o.id+o.assessmentId] && <div className="badge badge-success" style={{justifySelf:"start"}}>{t("decisionSaved")}: {decisions[o.id+o.assessmentId]}</div>}
          </div>
        ))}
      </div>
      <div className="card card-pad" style={{background:"#FBF6F0"}}>
        <div style={{fontWeight:700, fontSize:13}}>{t("reviewHow")}</div>
        <div style={{fontSize:12, color:"#6B5A54", marginTop:6}}>{t("reviewFlow")}</div>
      </div>
    </div>
  );
}
