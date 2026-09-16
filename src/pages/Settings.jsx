import { useStore } from "../lib/store";
import { useSeo, Breadcrumbs } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import LanguageSelector from "../components/LanguageSelector";

export default function Settings(){
  const { offline, setOffline, syncAll, pendingCount, activePolicy } = useStore();
  const { t } = useI18n();
  useSeo({ title:"Settings", description:"Manage offline sync, language, and system status for OnionSetu.", canonical:"/settings" });
  return (
    <div style={{display:"grid", gap:14, maxWidth:820}}>
      <Breadcrumbs items={[{label:"Home", href:"/"},{label:"Settings", href:"/settings"}]} />
      <h1 className="h-display" style={{fontSize:28, margin:0}}>{t("settings")}</h1>

      <div className="card card-pad" style={{borderLeft:"3px solid #7A263A"}}>
        <h3 style={{margin:"0 0 10px", fontSize:14, fontWeight:700}}>{t("languageSettings")}</h3>
        <p style={{margin:"0 0 10px", fontSize:12, color:"#6B5A54"}}>{t("langNoteAll")}</p>
        <LanguageSelector variant="full" />
      </div>

      <div className="card card-pad">
        <h3 style={{margin:"0 0 10px", fontSize:14, fontWeight:700}}>{t("offlineSync")}</h3>
        <div style={{display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
          <span className={offline ? "badge badge-offline":"badge badge-success"}>{offline ? t("offlineLbl") : t("onlineLbl")}</span>
          <button className="btn btn-secondary" onClick={()=> setOffline(v=>!v)}>{offline ? t("goOnline") : t("goOffline")}</button>
          <button className="btn btn-primary" onClick={syncAll} disabled={!offline && pendingCount===0}>{t("syncNow")}</button>
          <span style={{fontSize:12, color:"#6B5A54"}}>{pendingCount} {t("records")} — per-user Supabase sync</span>
        </div>
        <p style={{margin:"10px 0 0", fontSize:12, color:"#6B5A54"}}>{t("landingDesc")}</p>
      </div>
      <div className="card card-pad">
        <h3 style={{margin:"0 0 10px", fontSize:14, fontWeight:700}}>{t("system")}</h3>
        <div style={{display:"grid", gap:8, fontSize:13}}>
          <div><b>{t("activePolicyLbl")}:</b> {activePolicy.version} ({activePolicy.sizeBand.min}–{activePolicy.sizeBand.max} mm)</div>
          <div><b>Detection:</b> Roboflow · <b>Assessment:</b> Qwen (batch) / Demo inference (single) · <b>Size ref:</b> 25mm</div>
          <div><b>Model:</b> Prototype Demo Inference (single) · Roboflow + Qwen (batch)</div>
          <div><b>{t("confidence")}:</b> 60%</div>
          <div><b>Backend:</b> Supabase — per-user RLS, Storage for images/reports, {t("qrVerify")}</div>
        </div>
      </div>
      <div className="card card-pad" style={{background:"#FFFEFD"}}>
        <h3 style={{margin:"0 0 8px", fontSize:14, fontWeight:700}}>{t("landingNote")}</h3>
      </div>
    </div>
  );
}
