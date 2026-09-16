import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import LanguageSelector from "./LanguageSelector";
import { OnionMark } from "./OnionMark";
import AppUpdater from "./AppUpdater";

const baseNav = [
  { to:"/", key:"dashboard", icon: IconDashboard, roles:["farmer","grader"] },
  { to:"/new", key:"newAssessment", icon: IconPlus, roles:["farmer","grader"] },
  { to:"/batch", key:"batchGrading", icon: IconClipboard, roles:["farmer","grader"] },
  { to:"/assessments", key:"assessments", icon: IconClipboard, roles:["farmer","grader"] },
  { to:"/reviews", key:"reviews", icon: IconEye, roles:["grader"] },
  { to:"/reports", key:"reports", icon: IconFile, roles:["farmer","grader"] },
  { to:"/policy", key:"policy", icon: IconScale, roles:["farmer","grader"] },
  { to:"/settings", key:"settings", icon: IconGear, roles:["farmer","grader"] },
];

export default function Layout({ children }){
  const { offline, setOffline, pendingCount, syncAll, activePolicy } = useStore();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const loc = useLocation();
  const nav2 = useNavigate();
  const nav = baseNav.filter(n=> !user || n.roles.includes(user.role));
  const isLanding = loc.pathname === "/landing";
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(()=>{ setMenuOpen(false); }, [loc.pathname]);

  useEffect(()=>{
    const onResize = ()=>{ if(window.innerWidth > 900) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return ()=> window.removeEventListener("resize", onResize);
  },[]);

  useEffect(()=>{
    if(menuOpen && window.innerWidth <= 900){
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return ()=>{ document.body.style.overflow = ""; };
  },[menuOpen]);

  function onTouchStart(e){
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e){
    if(touchStartX.current === null) return;
  }
  function onTouchEnd(e){
    if(touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if(menuOpen && dx < -60 && Math.abs(dx) > Math.abs(dy)){
      setMenuOpen(false);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if(isLanding) return children;

  return (
    <div className="app-shell" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {menuOpen && (
        <div
          aria-hidden="true"
          onClick={()=> setMenuOpen(false)}
          style={{position:"fixed", inset:0, background:"rgba(23,17,15,.32)", zIndex:39}}
        />
      )}
      <aside
        ref={sidebarRef}
        id="sidebar"
        className={`sidebar ${menuOpen ? "open" : ""}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-hidden={menuOpen ? "false" : undefined}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            <OnionMark style={{display:"block", height:34, width:27}} />
            <div>
              <div className="brand-name">ONIONSETU</div>
              <div className="brand-sub">{t("appSubtitle")}</div>
            </div>
          </div>
          <div style={{marginTop:10, fontSize:11, color:"#8a7a74", lineHeight:1.4}}>
            {t("procLedger")}
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          <div className="nav-group-label">{t("workspace")}</div>
          {nav.map(item=>(
            <NavLink key={item.to} to={item.to} onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive ? "nav-link active" : "nav-link"}>
              <item.icon />
              {t(item.key)}
            </NavLink>
          ))}
          <div className="nav-group-label" style={{marginTop:14}}>{t("systemGroup")}</div>
          <div style={{padding:"8px 10px"}}>
            <div style={{fontSize:12, fontWeight:600}}>{t("activePolicyLbl")}</div>
            <div style={{fontSize:13, color:"#7A263A", fontWeight:700}}>{activePolicy.version} · {activePolicy.sizeBand.min}–{activePolicy.sizeBand.max} mm</div>
            <div style={{fontSize:11, color:"#8a7a74", marginTop:2}}>{activePolicy.label}</div>
          </div>
          <div style={{padding:"8px 10px"}}>
            <div style={{fontSize:12, fontWeight:600, marginBottom:6}}>{t("languageSettings")}</div>
            <LanguageSelector variant="compact" style={{maxWidth:"100%"}} />
          </div>
        </nav>
        <div className="sidebar-foot">
          <div className="sync-card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span className={offline ? "badge badge-offline" : "badge badge-success"} style={{fontSize:10}}>
                <span className="dot" style={{background: offline ? "#D99024" : "#3F7D4A"}} /> {offline ? t("offlineLbl") : t("onlineLbl")}
              </span>
              <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:12}} onClick={()=> setOffline(v=>!v)}>{offline ? t("goOnline") : t("goOffline")}</button>
            </div>
            <div style={{fontSize:12, color:"#6B5A54"}}>
              {offline ? `${pendingCount} ${t("savedOfflineMsg")}` : t("syncedMsg")}
              <br/>{offline ? t("willSyncMsg") : t("upToDateMsg")}
            </div>
            {offline && pendingCount>0 && (
              <button className="btn btn-primary" style={{width:"100%",marginTop:10,fontSize:13}} onClick={syncAll}>{t("syncNow")}</button>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10, marginTop:12}}>
            <div style={{width:32,height:32, borderRadius:"50%", background:"#F8E9EC", border:"1px solid #EDE3DC", display:"grid", placeItems:"center", fontFamily:"Fraunces, serif", fontWeight:700, color:"#7A263A", fontSize:12}}>{(user?.name || "G").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()}</div>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontSize:13,fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{user?.name || "Guest"}</div>
              <div style={{fontSize:11,color:"#8a7a74"}}>{user?.role==="grader" ? t("grader") : t("farmer")} · {user?.center?.split("—")[0]?.trim() || "Lasalgaon"}</div>
            </div>
            <span className={`badge ${user?.role==="grader" ? "badge-maroon":"badge-success"}`} style={{flexShrink:0, fontSize:10}}>{user?.role || "guest"}</span>
          </div>
          <button className="btn btn-ghost" style={{width:"100%", marginTop:10, fontSize:12, justifyContent:"center"}} onClick={()=>{ logout(); nav2("/login"); }}>{t("logout")}</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn btn-secondary mobile-menu-btn" onClick={()=> setMenuOpen(v=>!v)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="sidebar">
              {menuOpen ? "X" : "Menu"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10, minWidth:0}}>
              <OnionMark style={{display:"block", height:30, width:24}} />
              <div className="topbar-brand-text" style={{minWidth:0}}>
                <div className="brand-title">ONIONSETU</div>
                <div className="brand-subtitle">{t("appSubtitle")}</div>
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="badge badge-maroon" style={{display:"none"}} id="top-policy">v2026.1</span>
            <span className="topbar-lang"><LanguageSelector variant="compact" /></span>
            <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>{ setMenuOpen(false); nav2("/policy"); }}>{t("policy")} {activePolicy.version}</button>
            <button className="btn btn-primary" onClick={()=>{ setMenuOpen(false); nav2("/new"); }}><IconPlus/> <span>{t("start")}</span></button>
          </div>
        </header>
        <AppUpdater />
        <div className="content">
          {children}
          <footer className="app-footer" style={{marginTop:32, padding:"18px 0 8px", borderTop:"1px solid #EDE3DC", display:"flex", flexWrap:"wrap", gap:12, justifyContent:"space-between", fontSize:12, color:"#6B5A54"}}>
            <div style={{minWidth:0, flex:"1 1 220px"}}>
              <div style={{fontWeight:700, color:"#17110F"}}>OnionSetu — Lasalgaon APMC</div>
              <div>{t("footerLoc")}</div>
              <div style={{marginTop:6, display:"flex", gap:10, flexWrap:"wrap"}}>
                <a href="/" style={{color:"#7A263A", fontWeight:600}}>{t("dashboard")}</a>
                <a href="/new" style={{color:"#7A263A", fontWeight:600}}>{t("newAssessment")}</a>
                <a href="/assessments" style={{color:"#7A263A", fontWeight:600}}>{t("assessments")}</a>
                <a href="/reports" style={{color:"#7A263A", fontWeight:600}}>{t("reports")}</a>
                <a href="/policy" style={{color:"#7A263A", fontWeight:600}}>{t("policy")}</a>
                <a href="/sitemap.xml" style={{color:"#7A263A"}}>Sitemap</a>
              </div>
            </div>
            <div className="app-footer-right" style={{minWidth:0, flex:"1 1 180px"}}>
              <div style={{fontWeight:600, color:"#17110F"}}>{t("footerVerifyTitle")}</div>
              <a href="/verify/OG-2026-0241" style={{color:"#7A263A", fontWeight:600}}>{t("verifyReportLink")}</a>
              <div style={{marginTop:6}}>© 2026 OnionSetu · <a href="/llms.txt" style={{color:"#7A263A"}}>llms.txt</a> · <a href="/robots.txt" style={{color:"#7A263A"}}>robots.txt</a></div>
            </div>
          </footer>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive?"bnav-link active":"bnav-link"}><IconDashboard/>{t("dashboard")}</NavLink>
        <NavLink to="/new" onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive?"bnav-link active":"bnav-link"}><IconPlus/>{t("newAssessment").split(" ")[0]}</NavLink>
        <NavLink to="/assessments" onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive?"bnav-link active":"bnav-link"}><IconClipboard/>{t("assessments")}</NavLink>
        <NavLink to="/reviews" onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive?"bnav-link active":"bnav-link"}><IconEye/>{t("reviews")}</NavLink>
        <NavLink to="/reports" onClick={()=> setMenuOpen(false)} className={({isActive})=> isActive?"bnav-link active":"bnav-link"}><IconFile/>{t("reports")}</NavLink>
      </nav>
    </div>
  );
}

function IconDashboard(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function IconPlus(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>; }
function IconClipboard(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>; }
function IconEye(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>; }
function IconFile(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M10 13H8M16 17H8M13 13h2"/></svg>; }
function IconScale(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v18"/><path d="M4 7l8-3 8 3-8 3-8-3Z"/><path d="M4 17l8 3 8-3"/></svg>; }
function IconGear(){ return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>; }
