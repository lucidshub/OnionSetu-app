import { createContext, useContext, useEffect, useState } from "react";
import { languages, dict } from "./locales/index.js";

export { languages };
export { dict };

const LS_LANG = "onion-setu-lang";
const I18nContext = createContext(null);
export function useI18n(){ return useContext(I18nContext); }
export function I18nProvider({ children }){
  const [lang, setLangState] = useState(()=>{
    try{ const v=localStorage.getItem(LS_LANG); if(v && dict[v]) return v; }catch{}
    return "";
  });
  const [ready, setReady] = useState(Boolean(lang));
  function setLang(code){
    if(!dict[code]) code="en";
    try{ localStorage.setItem(LS_LANG, code); }catch{}
    try{
      const raw = localStorage.getItem("onion-setu-auth-v1");
      if(raw){ const u=JSON.parse(raw); localStorage.setItem("onion-setu-auth-v1", JSON.stringify({...u, preferredLang: code})); }
    }catch{}
    setLangState(code); setReady(true);
    try{ document.documentElement.lang = code; }catch{}
  }
  useEffect(()=>{ if(lang){ try{ document.documentElement.lang = lang; }catch{} } },[lang]);
  function t(key, fallback){
    const d = dict[lang] || dict.en;
    return d[key] ?? dict.en[key] ?? fallback ?? key;
  }
  return (
    <I18nContext.Provider value={{ lang: lang || "en", setLang, t, languages, ready, hasChosen: Boolean(lang) }}>
      {children}
    </I18nContext.Provider>
  );
}
