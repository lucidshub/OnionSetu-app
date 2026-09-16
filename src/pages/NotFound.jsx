import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
export default function NotFound(){
  const { t } = useI18n();
  useSeo({ title:"Page not found", description:"The page you requested does not exist.", canonical:"/404", noindex:true });
  return (
    <div style={{maxWidth:560, margin:"40px auto", textAlign:"center", display:"grid", gap:16, padding:"24px 12px"}}>
      <div style={{width:64,height:64, borderRadius:"50%", background:"#FDECEC", border:"2px solid #F5C2C2", display:"grid", placeItems:"center", margin:"0 auto", color:"#B33A3A", fontWeight:800, fontSize:28}}>!</div>
      <h1 className="h-display" style={{margin:0}}>{t("pageNotFound")}</h1>
      <p style={{margin:0, color:"#6B5A54", fontSize:14}}>{t("notFoundDesc")}</p>
      <div style={{display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap"}}>
        <Link to="/" className="btn btn-primary">{t("goDashboard")}</Link>
        <Link to="/assessments" className="btn btn-secondary">{t("viewAssessmentsBtn")}</Link>
        <Link to="/new" className="btn btn-ghost">{t("startNewBtn")}</Link>
      </div>
      <div style={{fontSize:12, color:"#8a7a74", display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
        <Link to="/policy" style={{color:"#7A263A", textDecoration:"underline"}}>{t("policy")}</Link>
        <span>·</span>
        <Link to="/reports" style={{color:"#7A263A", textDecoration:"underline"}}>{t("reports")}</Link>
        <span>·</span>
        <Link to="/sitemap.xml" style={{color:"#7A263A", textDecoration:"underline"}}>Sitemap</Link>
      </div>
    </div>
  );
}
