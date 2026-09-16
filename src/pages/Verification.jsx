import { useParams, Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

export default function Verification(){
  const { id } = useParams();
  const { assessments } = useStore();
  const { t } = useI18n();
  const a = assessments.find(x=> x.id===id);
  useSeo({ title: a ? `Verify ${a.id}` : "Verify report", description: a ? `Verify ${a.id}.` : "Verify OnionSetu report via QR.", canonical: `/verify/${id}`, noindex:true });
  if(!a) return <div className="card card-pad">{t("verifyFail")} {id}. <Link to="/reports" className="btn btn-secondary" style={{marginLeft:8}}>{t("browseReports")}</Link></div>;
  return (
    <div style={{maxWidth:560, margin:"0 auto", display:"grid", gap:14}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:20, color:"#7A263A"}}>ONIONSETU</div>
        <div style={{fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{t("verification")}</div>
      </div>
      <div className="card card-pad" style={{textAlign:"center"}}>
        <div style={{width:64,height:64, borderRadius:"50%", background:"#EDF5EF", border:"2px solid #C8E4CC", display:"grid", placeItems:"center", margin:"0 auto", color:"#3F7D4A", fontWeight:800, fontSize:22}}>✓</div>
        <div style={{fontWeight:700, marginTop:10}}>{t("reportVerified")}</div>
        <div style={{fontSize:12, color:"#6B5A54"}}>{t("verifiedMsg")}</div>
        <div style={{marginTop:12, background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:10, padding:12, textAlign:"left", fontSize:12}}>
          <div><b>{t("reportId")}:</b> <span className="mono">{a.id}</span></div>
          <div><b>{t("lotLbl")}:</b> {a.lotId} · <b>{t("centerLbl")}:</b> {a.center}</div>
          <div><b>{t("policy")}:</b> {a.policyVersion} · <b>{t("gradesLbl")}:</b> A:{a.gradeA}% B:{a.gradeB ?? 0}% C:{a.gradeC ?? 0}% Reject:{a.gradeReject ?? 0}% · <b>{t("urs")}:</b> {a.urs}%</div>
          <div><b>{t("timestampLbl")}:</b> {new Date(a.date).toLocaleString()}</div>
          <div><b>{t("statusLbl")}:</b> {a.status} · <b>{t("syncLbl")}:</b> {a.sync}</div>
          <div style={{marginTop:6, wordBreak:"break-all"}}><b>SHA-256:</b> <span className="mono" style={{fontSize:10}}>{a.hash}</span></div>
        </div>
        <div style={{marginTop:10, fontSize:11, color:"#8a7a74"}}>{t("integrityNote")}</div>
        <Link to={`/reports/${a.id}`} className="btn btn-primary" style={{marginTop:12}}>{t("openFullReport")}</Link>
      </div>
    </div>
  );
}
