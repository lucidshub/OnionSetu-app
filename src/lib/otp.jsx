// Simulated OTP — swap mockSend with real provider (Twilio / SendGrid / Supabase) in production
const LS_OTP = "onion-setu-otp-v1";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function genCode(){ return String(Math.floor(100000 + Math.random()*900000)); }

function load(){
  try{ return JSON.parse(localStorage.getItem(LS_OTP) || "{}"); }catch{ return {}; }
}
function save(map){ localStorage.setItem(LS_OTP, JSON.stringify(map)); }

export function sendOtp(identifier, channel){
  // channel: "email" | "sms"
  const code = genCode();
  const key = String(identifier).trim().toLowerCase();
  const map = load();
  map[key] = { code, channel, expiresAt: Date.now()+TTL_MS, attempts:0 };
  save(map);
  // MOCK send — in production: call backend /api/send-otp
  console.log(`[OnionSetu OTP] Channel:${channel} To:${identifier} Code:${code} (expires in 5m)`);
  // For demo we return code so UI can show it; production would NOT expose it
  return { ok:true, code, channel, expiresAt: Date.now()+TTL_MS };
}

export function verifyOtp(identifier, code){
  const key = String(identifier).trim().toLowerCase();
  const map = load();
  const entry = map[key];
  if(!entry) return { ok:false, error:"No OTP found. Please request a new code." };
  if(Date.now() > entry.expiresAt){
    delete map[key]; save(map);
    return { ok:false, error:"OTP expired. Please request a new code." };
  }
  if(String(entry.code) !== String(code).trim()){
    entry.attempts = (entry.attempts||0)+1;
    save(map);
    return { ok:false, error:"Incorrect OTP. Please try again." };
  }
  delete map[key]; save(map);
  return { ok:true };
}

export function getPending(identifier){
  const key = String(identifier).trim().toLowerCase();
  const map = load();
  const e = map[key];
  if(!e) return null;
  if(Date.now()>e.expiresAt) return null;
  return e;
}

export function channelFor(identifier){
  const v = String(identifier).trim();
  if(/^[6-9]\d{9}$/.test(v)) return "sms";
  return "email";
}

export function maskContact(identifier, channel){
  const v = String(identifier).trim();
  if(channel==="sms"){
    return v.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
  }
  // email
  const [user, domain] = v.split("@");
  if(!domain) return v;
  return `${user.slice(0,2)}***@${domain}`;
}
