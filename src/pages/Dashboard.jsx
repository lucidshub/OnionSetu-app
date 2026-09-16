import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

export default function Dashboard(){
  const { t } = useI18n();
  const { user } = useAuth();
  const isFarmer = user?.role==="farmer";
  useSeo({ title: t("dashboard"), description: "Overview of onion grading at Lasalgaon APMC.", canonical:"/" });
  const { assessments, activePolicy } = useStore();
  const visible = isFarmer ? assessments.filter(a=> a.farmer.toLowerCase().includes(user.name.toLowerCase()) || a.farmer==="Ramesh Patil") : assessments;
  const today = assessments.filter(a=> String(a.date).startsWith("2026-09-05")).length;
  const gradeAAvg = Math.round(assessments.slice(0,3).reduce((s,a)=>s+a.gradeA,0)/Math.max(1,Math.min(3,assessments.length)));
  const humanReviews = assessments.reduce((s,a)=>s+(a.humanReviews||0),0);
  const pending = assessments.filter(a=> a.status==="Human Review").length;

  return (
    <div style={{display:"grid", gap:18}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:t("dashboard"), href:"/"}]} />
      <div style={{display:"flex", flexWrap:"wrap", alignItems:"end", justifyContent:"space-between", gap:12}}>
        <div>
          <h1 className="h-display" style={{fontSize:32, margin:0}}>{isFarmer ? t("myFarm") : t("dashboard")}</h1>
          <p style={{margin:"6px 0 0", color:"#6B5A54", fontSize:14}}>{isFarmer ? <>{t("welcomeBack")}, <b style={{color:"#7A263A"}}>{user.name}</b> · {t("farmer")} · {user.center}</> : <>{t("procOverview")} — Lasalgaon APMC · <span style={{color:"#7A263A", fontWeight:600}}>NAFED / NCCF</span> — {t("grader")}: <b>{user?.role}</b></>}</p>
        </div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <Link to="/new" className="btn btn-primary">{t("startAssessment")}</Link>
          <Link to="/batch" className="btn btn-secondary">{t("batchGrading")} (10–15 views)</Link>
          <Link to="/assessments" className="btn btn-secondary">{t("viewAll")}</Link>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:12}}>
        <Metric label={isFarmer ? t("myAssessments") : t("todaysAssessments")} value={isFarmer ? visible.length : today} sub={isFarmer ? t("farmerDesc") : "Sep 5, 2026"} />
        <Metric label={t("gradeAPercent")} value={`${gradeAAvg}%`} sub={`${t("policy")} ${activePolicy.version}`} accent />
        <Metric label={t("humanReviews")} value={humanReviews} sub={isFarmer ? t("graderDesc") : t("flaggedByGate")} />
        <Metric label={t("pendingDisputes")} value={pending} sub={t("activity")} warn={pending>0} />
      </div>

      <div className="dash-grid" style={{display:"grid", gap:12}}>
        <div className="card">
          <div style={{padding:"16px 18px", borderBottom:"1px solid #EDE3DC", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <h3 style={{margin:0, fontSize:14, fontWeight:700}}>{t("recentTitle")}</h3>
            <Link to="/assessments" style={{fontSize:13, color:"#7A263A", fontWeight:600}}>{t("viewAll")} →</Link>
          </div>
          <div>
            {visible.slice(0,4).map(a=>(
              <div key={a.id} className="recent-row" style={{display:"flex", alignItems:"center", flexWrap:"wrap", gap:10, padding:"14px 18px", borderBottom:"1px solid #F3EAE2"}}>
                <div style={{width:42,height:42, flexShrink:0, borderRadius:10, background:"#FBF6F0", border:"1px solid #EDE3DC", display:"grid", placeItems:"center", fontFamily:"Fraunces, serif", fontWeight:700, color:"#7A263A"}}>{a.id.slice(-2)}</div>
                <div style={{flex:"1 1 160px", minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:13.5, overflowWrap:"anywhere"}}>{a.id} <span style={{color:"#8a7a74", fontWeight:500}}>· {a.lotId}</span></div>
                  <div style={{fontSize:12, color:"#6B5A54", overflowWrap:"anywhere"}}>{a.farmer} · {a.center}</div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontWeight:700, fontSize:13}}>A:{a.gradeA}% B:{a.gradeB ?? 0}% C:{a.gradeC ?? 0}% R:{a.gradeReject ?? a.reject ?? 0}%</div>
                  <div style={{fontSize:11, color:"#8a7a74"}}>{t("urs")}: {a.urs}%</div>
                  <div><StatusBadge status={a.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid", gap:12}}>
          <div className="card card-pad">
            <h3 style={{margin:"0 0 10px", fontSize:14, fontWeight:700}}>{t("activity")}</h3>
            <div style={{display:"grid", gap:10, fontSize:13}}>
              <Activity dot="#3F7D4A" text="OG-2026-0241 (68% Grade A)" time="10:24 AM" />
              <Activity dot="#D99024" text={`O8 (47% ${t("confidence")})`} time="10:22 AM" />
              <Activity dot="#7A263A" text="SHA-256" time="10:25 AM" />
              <Activity dot="#17110F" text={`${t("policy")} v2026.1 (35–70 mm)`} time={t("activeLbl")} />
              <Activity dot="#B33A3A" text="OG-2026-0238" time={t("statusHumanReview")} />
            </div>
          </div>
          <div className="card card-pad">
            <div style={{fontSize:12, letterSpacing:".08em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{t("howItWorks")}</div>
            <div style={{marginTop:8, fontSize:13, color:"#17110F", lineHeight:1.5}}>{t("howDesc1")}</div>
            <div style={{marginTop:8, fontSize:12, color:"#6B5A54"}}>{t("howDesc2")}</div>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:900px){ .dash-grid{grid-template-columns:1fr !important} }`}</style>
    </div>
  );
}
function Metric({label,value,sub,accent,warn}){
  return (
    <div className="card card-pad" style={{borderLeft: accent ? "3px solid #7A263A" : warn ? "3px solid #D99024" : "1px solid #EDE3DC"}}>
      <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{label}</div>
      <div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:28, marginTop:6, color: accent ? "#7A263A" : "#17110F"}}>{value}</div>
      <div style={{fontSize:12, color:"#6B5A54"}}>{sub}</div>
    </div>
  );
}
function StatusBadge({status}){
  const map={ Completed:"badge-success", "Human Review":"badge-warning", "Sync Pending":"badge-offline", Synced:"badge-success" };
  return <span className={`badge ${map[status]||""}`} style={{fontSize:10}}>{status}</span>;
}
function Activity({dot,text,time}){
  return (
    <div style={{display:"flex", gap:10, alignItems:"start"}}>
      <span className="dot" style={{background:dot, marginTop:7, flexShrink:0}} />
      <div style={{flex:1}}>{text}</div>
      <span style={{fontSize:11, color:"#8a7a74", whiteSpace:"nowrap"}}>{time}</span>
    </div>
  );
}
