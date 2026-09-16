import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { OnionMark } from "./OnionMark";

export default function LanguageGate(){
  const { languages, setLang, t } = useI18n();
  const [pick, setPick] = useState("en");
  const [q, setQ] = useState("");
  const filtered = languages.filter(l =>
    !q || l.name.toLowerCase().includes(q.toLowerCase()) || l.native.includes(q)
  );
  return (
    <div style={{minHeight:"100dvh", background:"#FDFBF9", display:"grid", placeItems:"center", padding:"24px 12px"}}>
      <div style={{width:"100%", maxWidth:520, display:"grid", gap:16, textAlign:"center", justifyItems:"center"}}>
        <OnionMark style={{display:"block", height:48, width:38}} />
        <div>
          <h1 className="h-display" style={{margin:0, fontSize:26}}>{t("selectLanguage")}</h1>
          <p style={{margin:"8px 0 0", color:"#6B5A54", fontSize:13}}>{t("langNoteAll")}</p>
        </div>
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder={`${t("search")}…`} style={{maxWidth:380}} aria-label={t("search")} />
        <div style={{display:"grid", gap:8, width:"100%", maxHeight:"46vh", overflowY:"auto", padding:"2px"}}>
          {filtered.map(l=>(
            <button key={l.code} onClick={()=> setPick(l.code)} className="card" style={{padding:12, textAlign:"left", borderColor: pick===l.code ? "#7A263A" : "#EDE3DC", background: pick===l.code ? "#fdf2f4" : "white", cursor:"pointer"}}>
              <b style={{fontSize:13}}>{l.native}</b> <span style={{fontSize:11, color:"#8a7a74"}}>· {l.name}</span>
              {pick===l.code && <span style={{float:"right", color:"#7A263A", fontWeight:800}}>✓</span>}
            </button>
          ))}
          {filtered.length===0 && <div style={{fontSize:13, color:"#8a7a74"}}>{t("search")}…</div>}
        </div>
        <button className="btn btn-primary" style={{minWidth:200, minHeight:44}} onClick={()=> setLang(pick)}>{t("continue")} →</button>
      </div>
    </div>
  );
}
