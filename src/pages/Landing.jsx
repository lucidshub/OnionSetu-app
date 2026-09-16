import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { OnionMark } from "../components/OnionMark";

export default function Landing(){
  const { t } = useI18n();
  useSeo({ title:"Landing", description:"Onion quality assessment — standardized sampling and grading for procurement centers.", canonical:"/landing" });
  return (
    <div style={{maxWidth:720, margin:"0 auto", padding:"40px 16px", display:"grid", gap:16, textAlign:"center"}}>
      <div style={{display:"grid", gap:8, justifyItems:"center"}}>
        <OnionMark style={{display:"block", height:40, width:32}} />
        <div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:18}}>ONIONSETU</div>
        <div style={{fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>{t("appSubtitle")}</div>
      </div>
      <h1 className="h-display" style={{fontSize:28, margin:0}}>{t("landingTitle")}</h1>
      <p style={{color:"#6B5A54", fontSize:14, margin:0}}>{t("landingDesc")}</p>
      <div style={{display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginTop:8}}>
        <Link to="/new" className="btn btn-primary" style={{padding:"10px 18px"}}>{t("startAssessment")}</Link>
        <Link to="/" className="btn btn-secondary" style={{padding:"10px 18px"}}>{t("openApp")}</Link>
      </div>
      <p style={{fontSize:11, color:"#8a7a74"}}>{t("landingNote")}</p>
    </div>
  );
}
