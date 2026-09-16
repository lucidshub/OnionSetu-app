import { useI18n } from "../lib/i18n";

export default function LanguageSelector({ variant = "compact", style }){
  const { lang, setLang, languages, t } = useI18n();
  if(variant === "full"){
    return (
      <label style={{ display:"grid", gap:6, ...style }}>
        <span style={{ fontSize:12, fontWeight:700 }}>{t("languageSettings")}</span>
        <select
          className="select"
          value={lang}
          onChange={e=> setLang(e.target.value)}
          aria-label={t("changeLanguage")}
          style={{ maxWidth:340 }}
        >
          {languages.map(l=> <option key={l.code} value={l.code}>{l.native} — {l.name}</option>)}
        </select>
      </label>
    );
  }
  return (
    <select
      className="select"
      value={lang}
      onChange={e=> setLang(e.target.value)}
      aria-label={t("changeLanguage")}
      title={t("changeLanguage")}
      style={{ maxWidth:170, fontSize:12, padding:"7px 8px", ...style }}
    >
      {languages.map(l=> <option key={l.code} value={l.code}>{l.native}</option>)}
    </select>
  );
}
