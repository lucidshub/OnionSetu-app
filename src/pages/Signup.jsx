import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, isSupabaseConfigured } from "../lib/auth";
import { useSeo } from "../lib/seo";
import { useI18n } from "../lib/i18n";
import { sendOtp, verifyOtp, channelFor, maskContact } from "../lib/otp";
import { OnionMark } from "../components/OnionMark";

export default function Signup(){
  useSeo({ title:"Sign up", description:"Create a Farmer or Grader account on OnionSetu with Gmail or phone — real OTP via Supabase when configured.", canonical:"/signup" });
  const { signup, loginWithSupabaseOtp, verifySupabaseOtp } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [role, setRole] = useState("farmer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [center, setCenter] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // OTP
  const [step, setStep] = useState("form"); // form | otp
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  async function startOtp(identifier, channel){
    if(isSupabaseConfigured){
      localStorage.setItem("onion-setu-pending-role", role);
      localStorage.setItem("onion-setu-pending-name", name.trim());
      const { supabase } = await import("../lib/supabase");
      const isPhone = /^[6-9]\d{9}$/.test(String(identifier).trim());
      let res;
      if(isPhone){
        res = await supabase.auth.signInWithOtp({ phone: `+91${String(identifier).trim()}` });
        if(res.error && String(res.error.message).toLowerCase().includes("phone")){
          // fallback to mock for phone when provider not configured
          const sent = sendOtp(identifier.trim(), "sms");
          localStorage.setItem("onion-setu-otp-mock", "1");
          setOtpInfo({ channel:"sms", masked: maskContact(identifier, channel), identifier, code: sent.code });
          setOtp(""); setCooldown(30);
          const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
          return;
        }
      } else {
        res = await supabase.auth.signInWithOtp({ email: String(identifier).trim().toLowerCase(), options:{ shouldCreateUser:true, data:{ role, name: name.trim() } } });
      }
      if(res.error){
        setErr(res.error.message);
        setStep("form"); return;
      }
      localStorage.removeItem("onion-setu-otp-mock");
      setOtpInfo({ channel, masked: maskContact(identifier, channel), identifier, code: null });
      setOtp(""); setCooldown(30);
      const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
      return;
    }
    const sent = sendOtp(identifier, channel);
    setOtpInfo({ channel, masked: maskContact(identifier, channel), identifier, code: sent.code });
    setOtp(""); setCooldown(30);
    const iv = setInterval(()=> setCooldown(c=>{ if(c<=1){ clearInterval(iv); return 0; } return c-1; }), 1000);
  }

  function submit(e){
    e.preventDefault();
    setErr("");
    if(!name.trim() || !password) { setErr(t("errFill")); return; }
    if(!email.trim() && !phone.trim()){ setErr(t("errContact")); return; }
    if(email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){ setErr(t("errEmail")); return; }
    if(phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())){ setErr(t("errPhone")); return; }
    // choose OTP channel: prefer the identifier user will login with — if phone given, send SMS, else Gmail
    const identifier = phone.trim() || email.trim();
    const channel = channelFor(identifier);
    const data = { name: name.trim(), email: email.trim(), phone: phone.trim(), password, role, center: center.trim() };
    setPendingData(data);
    startOtp(identifier, channel);
    setStep("otp");
  }
  async function verify(e){
    e.preventDefault();
    setErr("");
    if(otp.trim().length!==6){ setErr(t("errOtp")); return; }
    if(isSupabaseConfigured){
      setBusy(true);
      const isPhone = /^[6-9]\d{9}$/.test(String(otpInfo.identifier).trim());
      const { supabase } = await import("../lib/supabase");
      let res;
      if(isPhone){
        res = await supabase.auth.verifyOtp({ phone: `+91${String(otpInfo.identifier).trim()}`, token: String(otp).trim(), type:"sms" });
      } else {
        res = await supabase.auth.verifyOtp({ email: String(otpInfo.identifier).trim().toLowerCase(), token: String(otp).trim(), type:"email" });
      }
      if(res.error){ setBusy(false); setErr(res.error.message); return; }
      // also create local profile fallback
      const r = signup(pendingData);
      setBusy(false);
      if(!r.ok && !r.ok){ /* ignore if already exists */ }
      nav("/", { replace:true }); return;
    }
    const v = verifyOtp(otpInfo.identifier, otp.trim());
    if(!v.ok){ setErr(v.error); return; }
    setBusy(true);
    const r = signup(pendingData);
    setBusy(false);
    if(!r.ok){ setErr(r.error); setStep("form"); return; }
    nav("/", { replace:true });
  }
  function resend(){
    if(isSupabaseConfigured){
      startOtp(otpInfo.identifier, otpInfo.channel);
      setErr(""); return;
    }
    startOtp(otpInfo.identifier, otpInfo.channel);
    setErr("");
  }

  const signupPhone = phone.trim();
  const signupIsDemoPhone = ["9876543210","9876543211"].includes(signupPhone);
  return (
    <div style={{minHeight:"100dvh", background:"#FDFBF9", display:"grid", placeItems:"center", padding:"20px 12px"}}>
      {step==="otp" && otpInfo?.code && (
        <div style={{position:"fixed", bottom:16, right:16, zIndex:50, background:"#17110F", color:"white", borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 24px rgba(0,0,0,.18)", display:"flex", gap:12, alignItems:"center", maxWidth:"calc(100vw - 24px)"}}>
          <div style={{width:36,height:36, borderRadius:8, background:"#F2B84B", color:"#17110F", display:"grid", placeItems:"center", fontWeight:800}}>O</div>
          <div>
            <div style={{fontSize:11, letterSpacing:".08em", textTransform:"uppercase", opacity:.7, fontWeight:700}}>SMS OTP · Demo · {maskContact(otpInfo.identifier || signupPhone, "sms")}</div>
            <div style={{fontFamily:"JetBrains Mono, monospace", fontSize:20, letterSpacing:".14em", fontWeight:700}}>{otpInfo.code}</div>
            <div style={{fontSize:11, opacity:.7}}>For {otpInfo.identifier} — expires in 5m</div>
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
          <h1 className="h-display" style={{margin:0, fontSize:32, lineHeight:.95}}>Create your<br/><span style={{color:"#7A263A"}}>OnionSetu</span> account</h1>
          <p style={{margin:0, color:"#6B5A54", fontSize:14}}>{t("oneAccountText")}</p>
          <div style={{background:"white", border:"1px solid #EDE3DC", borderRadius:12, padding:12, fontSize:12, color:"#6B5A54"}}>
            {t("farmerCanText")}<br/>{t("graderCanText")}
          </div>
        </div>

        {step==="form" ? (
        <form onSubmit={submit} className="card card-pad" style={{display:"grid", gap:14, alignContent:"start"}}>
          <h2 style={{margin:0, fontSize:18, fontWeight:700}}>{t("signup")}</h2>

          <div style={{display:"flex", gap:8, padding:4, background:"#FBF6F0", border:"1px solid #EDE3DC", borderRadius:10}}>
            <button type="button" onClick={()=> setRole("farmer")} className={role==="farmer" ? "btn btn-primary":"btn btn-ghost"} style={{flex:1, fontSize:13}}>{t("farmer")}</button>
            <button type="button" onClick={()=> setRole("grader")} className={role==="grader" ? "btn btn-primary":"btn btn-ghost"} style={{flex:1, fontSize:13}}>{t("grader")}</button>
          </div>

          <label style={{display:"grid", gap:6}}><span className="label">{t("fullName")} *</span>
            <input className="input" required value={name} onChange={e=> setName(e.target.value)} placeholder={role==="grader" ? "S. Kulkarni" : "Ramesh Patil"} autoComplete="name" />
          </label>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}} className="signup-grid">
            <label style={{display:"grid", gap:6}}><span className="label">{t("gmailLbl")}</span>
              <input className="input" type="email" value={email} onChange={e=> setEmail(e.target.value)} placeholder="ramesh@gmail.com" autoComplete="email" />
            </label>
            <label style={{display:"grid", gap:6}}><span className="label">{t("phoneLbl")}</span>
              <input className="input" type="tel" inputMode="numeric" value={phone} onChange={e=> setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="9876543211" autoComplete="tel" />
            </label>
          </div>
          <div style={{fontSize:11, color:"#8a7a74", marginTop:-8}}>{t("contactHint")}</div>
          <label style={{display:"grid", gap:6}}><span className="label">{t("password")} *</span>
            <input className="input" type="password" required value={password} onChange={e=> setPassword(e.target.value)} placeholder={t("pwdHint")} autoComplete="new-password" />
          </label>
          <label style={{display:"grid", gap:6}}><span className="label">{role==="grader" ? t("procCenter") : t("villageCenter")} <span style={{color:"#8a7a74", fontWeight:400}}>{t("centerOpt")}</span></span>
            <input className="input" value={center} onChange={e=> setCenter(e.target.value)} placeholder={role==="grader" ? "Lasalgaon APMC — NAFED" : "Lasalgaon"} />
          </label>

          {err && <div style={{background:"#FDECEC", border:"1px solid #F5C2C2", color:"#B33A3A", borderRadius:10, padding:"10px 12px", fontSize:13}}>{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={busy} style={{width:"100%", minHeight:44}}>{busy ? "Sending OTP…" : `Send OTP →`}</button>

          <div style={{textAlign:"center", fontSize:13, color:"#6B5A54"}}>{t("haveAccount")} <Link to="/login" style={{color:"#7A263A", fontWeight:700, textDecoration:"underline"}}>{t("login")}</Link></div>
        </form>
        ) : (
        <form onSubmit={verify} className="card card-pad" style={{display:"grid", gap:14, alignContent:"start"}}>
          <h2 style={{margin:0, fontSize:18, fontWeight:700}}>{t("verifyOtp")}</h2>
          <p style={{margin:0, color:"#6B5A54", fontSize:13}}>We sent a 6-digit code via <b>{otpInfo?.channel==="sms" ? "SMS" : "Gmail"}</b> to <b className="mono">{otpInfo?.masked}</b>.</p>
          {isSupabaseConfigured ? (
            <div style={{background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:10, padding:10, fontSize:12}}>
              <b>Real OTP sent via {otpInfo?.channel==="sms" ? "SMS (Supabase + Twilio)" : "Gmail (Supabase)"}.</b>
              <div style={{color:"#6B5A54", marginTop:4}}>Check your {otpInfo?.channel==="sms" ? "phone" : "Gmail inbox/spam"} for the 6-digit code — expires in 5 minutes.</div>
            </div>
          ) : (
            <div style={{background:"#EDF5EF", border:"1px solid #C8E4CC", borderRadius:10, padding:10, fontSize:12}}>
              <b>Demo OTP (simulated):</b> <span className="mono" style={{fontSize:16, color:"#7A263A", letterSpacing:".08em"}}>{otpInfo?.code}</span>
              <div style={{color:"#6B5A54", marginTop:4}}>Mock OTP — expires in 5 minutes. Add Supabase key to send real codes.</div>
            </div>
          )}
          <label style={{display:"grid", gap:6}}><span className="label">{t("enterOtp")} *</span>
            <input className="input" type="text" inputMode="numeric" maxLength={6} required value={otp} onChange={e=> setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="• • • • • •" style={{letterSpacing:".2em", textAlign:"center", fontSize:18}} autoFocus />
          </label>
          {err && <div style={{background:"#FDECEC", border:"1px solid #F5C2C2", color:"#B33A3A", borderRadius:10, padding:"10px 12px", fontSize:13}}>{err}</div>}
          <button className="btn btn-primary" type="submit" style={{width:"100%", minHeight:44}}>{t("verifyCreateText")}</button>
          <div style={{display:"flex", gap:8}}>
            <button type="button" className="btn btn-secondary" style={{flex:1, fontSize:12}} onClick={resend} disabled={cooldown>0}>{cooldown>0 ? `${t("resendIn")} ${cooldown}s` : t("resendOtp")}</button>
            <button type="button" className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{ setStep("form"); setErr(""); }}>{t("back")}</button>
          </div>
        </form>
        )}
      </div>
      <style>{`@media(max-width:800px){ .login-grid{ grid-template-columns:1fr !important } .signup-grid{ grid-template-columns:1fr !important } }`}</style>
    </div>
  );
}
