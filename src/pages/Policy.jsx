import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";

export default function Policy(){
  const { policies, activePolicy, setPolicy } = useStore();
  const { isGrader, user } = useAuth();
  const { t } = useI18n();
  useSeo({ title:"Grading Policy", description:"Versioned procurement policy — compare v2026.1 (35–70mm) vs v2025.2 (45–65mm). Switch active policy without redeploy; every report records the version used.", canonical:"/policy" });
  return (
    <div style={{display:"grid", gap:14}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:t("policy"), href:"/policy"}]} />
      <div>
        <h1 className="h-display" style={{fontSize:28, margin:0}}>{t("gradingPolicy")}</h1>
        <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>{t("policyIntro")} {isGrader ? t("graderDesc") : t("policyFarmerNote")}</p>
        {!isGrader && <div className="badge badge-warning" style={{marginTop:8}}>{t("farmerOnlyBadge")}</div>}
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 16px", background:"#7A263A", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontWeight:800, letterSpacing:".04em"}}>{t("policy")} {activePolicy.version}</div>
            <div style={{fontSize:12, opacity:.9}}>{activePolicy.label}</div>
          </div>
          <span className="badge" style={{background:"white", color:"#7A263A"}}>{t("activeLbl")}</span>
        </div>
        <div style={{padding:16, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14}}>
          <div>
            <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{t("sizeBand")}</div>
            <div style={{fontFamily:"Fraunces, serif", fontSize:24, fontWeight:700}}>{activePolicy.sizeBand.min} – {activePolicy.sizeBand.max} <span style={{fontSize:14, color:"#6B5A54"}}>mm</span></div>
            <div style={{fontSize:12, color:"#6B5A54"}}>{activePolicy.effectiveFrom} · {activePolicy.updatedBy}</div>
          </div>
          <div>
            <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{t("defectTolerances")}</div>
            <div style={{display:"flex", gap:8, marginTop:6, flexWrap:"wrap"}}>
              <span className="badge badge-error">{t("rotten")} ≤ {activePolicy.tolerances.rotten}%</span>
              <span className="badge badge-warning">{t("sprouted")} ≤ {activePolicy.tolerances.sprouted}%</span>
              <span className="badge">{t("damaged")} ≤ {activePolicy.tolerances.damaged}%</span>
            </div>
          </div>
        </div>
        <div style={{padding:"0 16px 16px", fontSize:12, color:"#6B5A54"}}>{activePolicy.description}</div>
      </div>

      <div style={{display:"grid", gap:10}}>
        <h3 style={{margin:0, fontSize:14, fontWeight:700}}>{t("allVersionsLbl")}</h3>
        {policies.map(p=>(
          <div key={p.version} className="card card-pad" style={{display:"flex", gap:14, alignItems:"center", borderColor: p.version===activePolicy.version ? "#7A263A" : "#EDE3DC", borderWidth: p.version===activePolicy.version ? 1.5 : 1}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>{p.version} — {p.label} <span style={{color:"#8a7a74", fontWeight:500}}>· {p.sizeBand.min}–{p.sizeBand.max} mm</span></div>
              <div style={{fontSize:12, color:"#6B5A54"}}>{p.description}</div>
              <div style={{fontSize:11, color:"#8a7a74"}}>{p.effectiveFrom} · {p.updatedBy}</div>
            </div>
            {isGrader ? (
              <button className={p.version===activePolicy.version ? "btn btn-ghost":"btn btn-primary"} style={{fontSize:12}} onClick={()=> setPolicy(p.version)} disabled={p.version===activePolicy.version}>
                {p.version===activePolicy.version ? t("activeBtn") : t("activateBtn")}
              </button>
            ) : (
              <span className="badge" style={{fontSize:10}} title="Only graders can switch policy">{t("viewOnlyBadge")} — {user?.role}</span>
            )}
          </div>
        ))}
      </div>
      <div className="card card-pad" style={{background:"#FBF6F0"}}>
        <div style={{fontSize:12, fontWeight:700}}>{t("policyHow")}</div>
        <div style={{fontSize:12, color:"#6B5A54", marginTop:4}}>{t("policyHowText")}</div>
      </div>
    </div>
  );
}
