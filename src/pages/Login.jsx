import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, isSupabaseConfigured } from "../lib/auth";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { sendOtp, verifyOtp, channelFor, maskContact } from "../lib/otp";
import { OnionMark } from "../components/OnionMark";

export default function Login(){
  const { t, lang, setLang, languages } = useI18n();
  useSeo({ title: t("login"), description:"Login to OnionSetu as Farmer or Grader with Gmail or phone — real OTP via Supabase when configured.", canonical:"/login" });
  const { login, demoLogin, loginWithSupabaseOtp, verifySupabaseOtp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const next = loc.state?.from || "/";
  const [role, setRole] = useState("grader");
  const [identifier, setIdentifier] = useState("grader@gmail.com");
  const [password, setPassword] = useState("123456");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // OTP state
  const [step, setStep] = useState("credentials"); // credentials | otp
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState(null); // {channel, masked, code?}
  const [cooldown, setCooldown] = useState(0);

  async function submit(e){
    e.preventDefault();
    setErr("");
    if(!identifier.trim()){ setErr(t("errIdentifier")); return; }
    setBusy(true);
    if(isSupabaseConfigured){
      // Real OTP via Supabase — password not required for OTP flow
      const r = await loginWithSupabaseOtp(identifier.trim(), role);
      setBusy(false);
      if(!r.ok){ setErr(r.error); return; }
      setOtpInfo({ channel: r.channel, masked: maskContact(identifier.trim(), r.channel), code: r.code || null });
      setOtp(""); setStep("otp"); setCooldown(30);
      const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
      return;
    }
    const r = login(identifier.trim(), password, role);
    setBusy(false);
    if(!r.ok){ setErr(r.error); return; }
    // mock OTP
    const channel = channelFor(identifier.trim());
    const sent = sendOtp(identifier.trim(), channel);
    setOtpInfo({ channel, masked: maskContact(identifier.trim(), channel), code: sent.code });
    setOtp(""); setStep("otp"); setCooldown(30);
    const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
  }
  function onRole(r){
    setRole(r);
    if(r==="grader"){ setIdentifier("grader@gmail.com"); setPassword("123456"); }
    else { setIdentifier("farmer@gmail.com"); setPassword("123456"); }
    setStep("credentials"); setErr("");
  }
  function usePhone(){
    if(role==="grader") setIdentifier("9876543210");
    else setIdentifier("9876543211");
  }
  async function verify(e){
    e.preventDefault();
    setErr("");
    if(otp.trim().length!==6){ setErr(t("errOtp")); return; }
    if(isSupabaseConfigured){
      setBusy(true);
      const v = await verifySupabaseOtp(identifier.trim(), otp.trim());
      setBusy(false);
      if(!v.ok){ setErr(v.error); return; }
      nav(next, { replace:true }); return;
    }
    const v = verifyOtp(identifier.trim(), otp.trim());
    if(!v.ok){ setErr(v.error); return; }
    nav(next, { replace:true });
  }
  async function resend(){
    setErr("");
    if(isSupabaseConfigured){
      const r = await loginWithSupabaseOtp(identifier.trim(), role);
      if(!r.ok){ setErr(r.error); return; }
      setOtpInfo({ channel: r.channel, masked: maskContact(identifier.trim(), r.channel), code: null });
      setCooldown(30);
      const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
      return;
    }
    const channel = channelFor(identifier.trim());
    const sent = sendOtp(identifier.trim(), channel);
    setOtpInfo({ channel, masked: maskContact(identifier.trim(), channel), code: sent.code });
    setCooldown(30);
    const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
  }

  const isDemoPhone = ["9876543210","9876543211"].includes(String(identifier).trim());
  return (
    <div style={{minHeight:"100dvh", background:"#FDFBF9", display:"grid", placeItems:"center", padding:"20px 12px"}}>
      {step==="otp" && otpInfo?.code && isDemoPhone && (
        <div style={{position:"fixed", bottom:16, right:16, zIndex:50, background:"#17110F", color:"white", borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 24px rgba(0,0,0,.18)", display:"flex", gap:12, alignItems:"center", maxWidth:"calc(100vw - 24px)"}}>
          <div style={{width:36,height:36, borderRadius:8, background:"#F2B84B", color:"#17110F", display:"grid", placeItems:"center", fontWeight:800}}>O</div>
          <div>
            <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", opacity:.7, fontWeight:700}}>{otpInfo.channel==="sms" ? "SMS OTP" : "Gmail OTP"} · Demo · {isDemoPhone ? maskContact(identifier.trim(), otpInfo.channel) : ""}</div>
            <div style={{fontFamily:"JetBrains Mono, monospace", fontSize:20, letterSpacing:".14em", fontWeight:700}}>{otpInfo.code}</div>
            <div style={{fontSize:11, opacity:.7}}>For {identifier.trim()} — expires in 5m</div>
          </div>
          <button className="btn btn-ghost" style={{color:"white", borderColor:"rgba(255,255,255,.2)", fontSize:11, padding:"6px 8px"}} onClick={()=> navigator.clipboard?.writeText(otpInfo.code)}>{t("copyBtn")}</button>
        </div>
      )}
      <div style={{width:"100%", maxWidth:920, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18}} className="login-grid">
        <div style={{display:"grid", gap:14, alignContent:"center"}}>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            <OnionMark style={{display:"block", height:36, width:29}} />
            <div><div style={{fontFamily:"Fraunces, serif", fontWeight:700, fontSize:18}}>ONIONSETU</div><div style={{fontSize:10, letterSpacing:".14em", textTransform:"uppercase", color:"#8a7a74", fontWeight:700}}>Onion Quality Assessment</div></div>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
            <h1 className="h-display" style={{margin:0, fontSize:28, lineHeight:.95}}>{t("welcomeBack")}<br/><span style={{color:"#7A263A"}}>{t("onionSetu")}</span></h1>
            <select className="select" value={lang} onChange={e=> setLang(e.target.value)} style={{maxWidth:140, fontSize:12, padding:"6px 8px"}}>
              {languages.map(l=> <option key={l.code} value={l.code}>{l.flag} {l.native}</option>)}
            </select>
          </div>
          <p style={{margin:0, color:"#6B5A54", fontSize:14}}>{t("farmer")} — {t("farmerDesc")} · {t("grader")} — {t("graderDesc")}</p>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
            <RoleCard active={role==="farmer"} onClick={()=> onRole("farmer")} title={t("farmer")} desc={t("farmerDesc")} icon="F" />
            <RoleCard active={role==="grader"} onClick={()=> onRole("grader")} title={t("grader")} desc={t("graderDesc")} icon="G" />
          </div>
          <div style={{fontSize:12, color:"#8a7a74", background:"white", border:"1px solid #EDE3DC", borderRadius:10, padding:10}}>
            <b>{t("demoAccounts")}</b> — {t("selectLanguageDesc")}<br/>
            {t("farmer")}: <span className="mono" style={{fontSize:11}}>farmer@gmail.com</span> or <span className="mono" style={{fontSize:11}}>9876543211</span><br/>
            {t("grader")}: <span className="mono" style={{fontSize:11}}>grader@gmail.com</span> or <span className="mono" style={{fontSize:11}}>9876543210</span><br/>
            <div style={{display:"flex", gap:8, marginTop:8, flexWrap:"wrap"}}>
              <button className="btn btn-secondary" style={{fontSize:12, flex:1}} onClick={()=>{ demoLogin("farmer"); nav(next,{replace:true}); }}>{t("quickLogin")} {t("farmer")}</button>
              <button className="btn btn-secondary" style={{fontSize:12, flex:1}} onClick={()=>{ demoLogin("grader"); nav(next,{replace:true}); }}>{t("quickLogin")} {t("grader")}</button>
            </div>
          </div>
        </div>

        {step==="credentials" ? (
        <form onSubmit={submit} className="card card-pad" style={{display:"grid", gap:14, alignContent:"start"}}>
          <div>
            <h2 style={{margin:0, fontSize:18, fontWeight:700}}>{t("login")}</h2>
            <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>{t("oneAccountText")}</p>
          </div>

          <div style={{display:"flex", gap:8, padding:4, background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:10}}>
            <button type="button" onClick={()=> onRole("farmer")} className={role==="farmer" ? "btn btn-primary":"btn btn-ghost"} style={{flex:1, fontSize:13, minHeight:38}}> Farmer</button>
            <button type="button" onClick={()=> onRole("grader")} className={role==="grader" ? "btn btn-primary":"btn btn-ghost"} style={{flex:1, fontSize:13, minHeight:38}}> Grader</button>
          </div>

          <label style={{display:"grid", gap:6}}>
            <span className="label">{t("gmailOrPhone")} *</span>
            <input className="input" type="text" required value={identifier} onChange={e=> setIdentifier(e.target.value)} placeholder="farmer@gmail.com or 9876543211" autoComplete="username" inputMode="email" />
            <button type="button" className="btn btn-ghost" style={{fontSize:11, padding:"4px 6px", justifySelf:"start"}} onClick={usePhone}>Use phone: {role==="grader" ? "9876543210" : "9876543211"}</button>
          </label>
          <label style={{display:"grid", gap:6}}><span className="label">{t("password")} {isSupabaseConfigured && <span style={{fontWeight:400, color:"#8a7a74"}}>(OTP — leave blank)</span>}</span>
            <input className="input" type="password" required={!isSupabaseConfigured} value={password} onChange={e=> setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </label>
          {isSupabaseConfigured && <div style={{fontSize:11, color:"#3F7D4A", background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:8, padding:8}}> Real OTP enabled — Supabase will send a 6-digit code to your Gmail / SMS. {channelFor(identifier)==="sms" && "Requires Twilio configured in Supabase for SMS."}</div>}

          {err && <div style={{background:"#FDECEC", border:"1px solid #F5C2C2", color:"#B33A3A", borderRadius:10, padding:"10px 12px", fontSize:13}}>{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={busy} style={{width:"100%", minHeight:44}}>{busy ? t("loading") : `${t("sendOtp")} →`}</button>

          <div style={{textAlign:"center", fontSize:13, color:"#6B5A54"}}>{t("noAccount")} <Link to="/signup" style={{color:"#7A263A", fontWeight:700, textDecoration:"underline"}}>{t("signup")}</Link></div>
          <div style={{fontSize:11, color:"#8a7a74", textAlign:"center", borderTop:"1px solid #F3EAE2", paddingTop:10}}>Lasalgaon APMC · OTP sent via {channelFor(identifier)==="sms" ? "SMS" : "Gmail"} to your contact</div>
        </form>
        ) : (
        <form onSubmit={verify} className="card card-pad" style={{display:"grid", gap:14, alignContent:"start"}}>
          <div>
            <h2 style={{margin:0, fontSize:18, fontWeight:700}}>Verify OTP</h2>
            <p style={{margin:"4px 0 0", color:"#6B5A54", fontSize:13}}>We sent a 6-digit code via <b>{otpInfo?.channel==="sms" ? "SMS" : "Gmail"}</b> to <b className="mono">{otpInfo?.masked}</b>.</p>
          </div>
          {otpInfo?.code ? (
            <div style={{background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:10, padding:10, fontSize:12}}>
              <b>Demo OTP (SMS fallback — phone provider not configured):</b> <span className="mono" style={{fontSize:16, color:"#7A263A", letterSpacing:".08em"}}>{otpInfo?.code}</span>
              <div style={{color:"#6B5A54", marginTop:4}}>Phone SMS needs Twilio in Supabase. For now this mock code works — enter it above. Gmail OTP works for real without extra setup.</div>
            </div>
          ) : isSupabaseConfigured ? (
            <div style={{background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:10, padding:10, fontSize:12}}>
              <b>Real OTP sent via {otpInfo?.channel==="sms" ? "SMS (Supabase + Twilio)" : "Gmail (Supabase)"}.</b>
              <div style={{color:"#6B5A54", marginTop:4}}>Check your {otpInfo?.channel==="sms" ? "phone" : "Gmail inbox / spam"} for the 6-digit code. It expires in 5 minutes.</div>
            </div>
          ) : (
            <div style={{background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:10, padding:10, fontSize:12}}>
              <b>Demo OTP (simulated):</b> <span className="mono" style={{fontSize:16, color:"#7A263A", letterSpacing:".08em"}}>{otpInfo?.code}</span>
              <div style={{color:"#6B5A54", marginTop:4}}>Mock OTP — expires in 5 minutes.</div>
            </div>
          )}
          <label style={{display:"grid", gap:6}}><span className="label">Enter 6-digit OTP *</span>
            <input className="input" type="text" inputMode="numeric" maxLength={6} required value={otp} onChange={e=> setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="• • • • • •" style={{letterSpacing:".2em", textAlign:"center", fontSize:18}} autoFocus />
          </label>
          {err && <div style={{background:"#FDECEC", border:"1px solid #F5C2C2", color:"#B33A3A", borderRadius:10, padding:"10px 12px", fontSize:13}}>{err}</div>}
          <button className="btn btn-primary" type="submit" style={{width:"100%", minHeight:44}}>Verify & enter →</button>
          <div style={{display:"flex", gap:8}}>
            <button type="button" className="btn btn-secondary" style={{flex:1, fontSize:12}} onClick={resend} disabled={cooldown>0}>{cooldown>0 ? `Resend in ${cooldown}s` : `Resend OTP via ${otpInfo?.channel==="sms" ? "SMS" : "Gmail"}`}</button>
            <button type="button" className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{ setStep("credentials"); setErr(""); }}>Back</button>
          </div>
          <div style={{fontSize:11, color:"#8a7a74", textAlign:"center"}}>Didn’t receive it? Check spam for Gmail, or network for SMS. Demo code is shown above.</div>
        </form>
        )}
      </div>
      <style>{`@media(max-width:800px){ .login-grid{ grid-template-columns:1fr !important } }`}</style>
    </div>
  );
}
function RoleCard({active, onClick, title, desc, icon}){
  return (
    <button type="button" onClick={onClick} className="card" style={{textAlign:"left", padding:12, borderColor: active ? "#7A263A" : "#EDE3DC", background: active ? "#fdf2f4" : "white", cursor:"pointer"}}>
      <div style={{display:"flex", gap:10, alignItems:"center"}}>
        <span style={{width:32,height:32, borderRadius:8, background: active ? "#7A263A":"#FBF6F0", color: active ? "white":"#7A263A", display:"grid", placeItems:"center", fontWeight:700}}>{icon}</span>
        <div style={{fontWeight:700, fontSize:13}}>{title} {active && <span className="badge badge-maroon" style={{marginLeft:6, fontSize:9}}>Selected</span>}</div>
      </div>
      <div style={{fontSize:11, color:"#6B5A54", marginTop:6}}>{desc}</div>
    </button>
  );
}
