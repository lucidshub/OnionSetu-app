import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useState } from "react";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

export default function Assessments(){
  const { user } = useAuth();
  const { t } = useI18n();
  const isFarmer = user?.role==="farmer";
  useSeo({ title: isFarmer ? "My Assessments" : "Assessments", description: isFarmer ? "My assessments — view lots linked to your farmer account, with A/B/C/Reject grades and separate URS." : "Browse all onion grading assessments — filter by status, search by lot or farmer, view A/B/C/Reject grades with separate URS.", canonical:"/assessments" });
  const { assessments } = useStore();
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const statuses = ["All", t("statusCompleted"), t("statusHumanReview"), t("statusSyncPending")];
  const statusVal = (s)=> s==="All" ? "All" : s===t("statusCompleted") ? "Completed" : s===t("statusHumanReview") ? "Human Review" : s===t("statusSyncPending") ? "Sync Pending" : s;
  const statusLbl = (s)=> s==="Completed" ? t("statusCompleted") : s==="Human Review" ? t("statusHumanReview") : s==="Sync Pending" ? t("statusSyncPending") : s;
  const visible = isFarmer ? assessments.filter(a=> a.farmer.toLowerCase().includes(user.name.toLowerCase()) || a.farmer==="Ramesh Patil") : assessments;
  const filtered = visible.filter(a=>{
    const fv = statusVal(filter);
    if(fv!=="All" && a.status!==fv) return false;
    if(q && !(`${a.id} ${a.lotId} ${a.farmer} ${a.center}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  return (
    <div style={{display:"grid", gap:14}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:t("assessments"), href:"/assessments"}]} />
      <div style={{display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:12, alignItems:"end"}}>
        <div>
          <h1 className="h-display" style={{fontSize:28, margin:0}}>{isFarmer ? t("myAssessments") : t("allAssessments")}</h1>
          <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>{isFarmer ? t("farmerOnlyNote") : t("historyNote")}</p>
        </div>
        <Link to="/new" className="btn btn-primary">{t("newAssessment")}</Link>
      </div>
      <div className="card card-pad" style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
        <input className="input" placeholder={t("searchPh")} value={q} onChange={e=>setQ(e.target.value)} style={{flex:"1 1 200px", minWidth:0, maxWidth:320}} aria-label={t("search")} />
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          {statuses.map(s=>(
            <button key={s} className={filter===s ? "btn btn-primary":"btn btn-secondary"} style={{fontSize:12, padding:"7px 10px"}} onClick={()=>setFilter(s)}>{s==="All" ? t("viewAll") : s}</button>
          ))}
        </div>
        <span style={{marginLeft:"auto", fontSize:12, color:"#8a7a74"}}>{filtered.length} {t("records")}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t("thAssessment")}</th><th>{t("thLotFarmer")}</th><th>{t("thDate")}</th><th>{t("thGrade")}</th><th>{t("thStatus")}</th><th>{t("thLotStatus")}</th><th>{t("thSync")}</th><th>{t("thPolicy")}</th><th></th></tr></thead>
          <tbody>
            {filtered.map(a=>(
              <tr key={a.id}>
                <td><span className="mono" style={{fontWeight:700, color:"#7A263A"}}>{a.id}</span><div style={{fontSize:11, color:"#8a7a74"}}>{a.lotId}</div></td>
                <td><div style={{fontWeight:600, fontSize:13}}>{a.farmer}</div><div style={{fontSize:11, color:"#6B5A54"}}>{a.center}</div></td>
                <td style={{fontSize:12}}>{new Date(a.date).toLocaleDateString()}<div style={{fontSize:11, color:"#8a7a74"}}>{a.assessor}</div></td>
                <td><b>A:{a.gradeA}% B:{a.gradeB ?? 0}% C:{a.gradeC ?? 0}% R:{a.gradeReject ?? a.reject ?? 0}%</b><div style={{fontSize:11, color:"#6B5A54"}}>{t("urs")}: {a.urs}% · {a.sampleSize} onions</div></td>
                <td><Status status={a.status} label={statusLbl(a.status)} /></td>
                <td><span className={`badge ${a.acceptance==="Accepted"?"badge-success":"badge-error"}`} style={{fontSize:10}}>{a.acceptance==="Accepted"?t("accepted"):a.acceptance==="Rejected"?t("disputed"):(a.acceptance || t("accepted"))}</span></td>
                <td><span className={`badge ${a.sync==="Offline"||a.sync==="Sync Pending" ? "badge-offline":"badge-success"}`} style={{fontSize:10}}>{a.sync}</span></td>
                <td><span className="badge badge-maroon" style={{fontSize:10}}>{a.policyVersion}</span></td>
                <td><Link to={`/reports/${a.id}`} className="btn btn-secondary" style={{fontSize:12, padding:"6px 10px"}}>{t("reportBtn")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Status({status, label}){
  const map={ Completed:"badge-success", "Human Review":"badge-warning", "Sync Pending":"badge-offline" };
  return <span className={`badge ${map[status]||"badge"}`} style={{fontSize:10}}>{label || status}</span>;
}
