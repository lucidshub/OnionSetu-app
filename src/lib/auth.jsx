import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

const AuthContext = createContext(null);
export function useAuth(){ return useContext(AuthContext); }

const LS_KEY = "onion-setu-auth-v1";
const USERS_KEY = "onion-setu-users-v1";

const DEMO_USERS = [
  { id:"u-grader", name:"S. Kulkarni", email:"grader@gmail.com", phone:"9876543210", password:"123456", role:"grader", center:"Lasalgaon APMC — NAFED", location:"Nashik, MH" },
  { id:"u-farmer", name:"Ramesh Patil", email:"farmer@gmail.com", phone:"9876543211", password:"123456", role:"farmer", center:"Lasalgaon APMC", location:"Nashik, MH" },
];

export { isSupabaseConfigured };

function loadUsers(){
  try{
    const raw = localStorage.getItem(USERS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      // migrate old onionsetu.in users to gmail demo if needed — keep existing custom users
      return parsed;
    }
  }catch{}
  return DEMO_USERS;
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeContact(v){ return String(v).trim().toLowerCase(); }
function isPhone(v){ return /^[6-9]\d{9}$/.test(String(v).trim()); }

export function AuthProvider({ children }){
  const [user, setUser] = useState(()=>{
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw) return JSON.parse(raw);
    }catch{}
    return null;
  });
  const [users, setUsers] = useState(()=> loadUsers());
  const [supaUser, setSupaUser] = useState(null);

  // Listen to Supabase Auth state if configured
  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({ data })=> setSupaUser(data.session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session)=>{
      setSupaUser(session?.user || null);
    });
    return ()=> subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(user) localStorage.setItem(LS_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_KEY);
  },[user]);

  useEffect(()=>{ saveUsers(users); },[users]);

  function login(identifier, password, role){
    const idNorm = normalizeContact(identifier);
    const found = users.find(u=> {
      if(u.role !== role) return false;
      const emailMatch = u.email && normalizeContact(u.email)===idNorm;
      const phoneMatch = u.phone && String(u.phone).trim()===String(identifier).trim();
      return emailMatch || phoneMatch;
    });
    if(!found) return { ok:false, error:"No account found for that role. Try demo accounts or sign up with Gmail / phone." };
    if(found.password !== password) return { ok:false, error:"Incorrect password." };
    setUser({ id:found.id, name:found.name, email:found.email, phone:found.phone, role:found.role, center:found.center, location:found.location });
    return { ok:true };
  }
  function signup({ name, email, phone, password, role, center }){
    const emailNorm = email ? normalizeContact(email) : "";
    const phoneNorm = phone ? String(phone).trim() : "";
    if(!emailNorm && !phoneNorm) return { ok:false, error:"Enter a Gmail address or phone number." };
    if(emailNorm && users.some(u=> u.email && normalizeContact(u.email)===emailNorm && u.role===role)){
      return { ok:false, error:"An account with that email and role already exists." };
    }
    if(phoneNorm && users.some(u=> u.phone && String(u.phone).trim()===phoneNorm && u.role===role)){
      return { ok:false, error:"An account with that phone and role already exists." };
    }
    const nu = {
      id:`u-${Date.now()}`,
      name,
      email: emailNorm || `${phoneNorm}@phone.local`,
      phone: phoneNorm || "",
      password,
      role,
      center: center || (role==="grader" ? "Lasalgaon APMC — NAFED" : "Lasalgaon APMC"),
      location:"Nashik, MH"
    };
    const next = [...users, nu];
    setUsers(next);
    setUser({ id:nu.id, name:nu.name, email:nu.email, phone:nu.phone, role:nu.role, center:nu.center, location:nu.location });
    return { ok:true };
  }
  async function loginWithSupabaseOtp(identifier, role){
    localStorage.setItem("onion-setu-pending-role", role);
    const isPhone = /^[6-9]\d{9}$/.test(String(identifier).trim());
    if(isPhone){
      const phone = `+91${String(identifier).trim()}`;
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if(error){
        const msg = String(error.message||"");
        // Fallback to mock OTP if phone provider not configured — so demo still works
        if(msg.toLowerCase().includes("unsupported phone") || msg.toLowerCase().includes("phone provider") || msg.toLowerCase().includes("sms")){
          const { sendOtp } = await import("./otp");
          const { channelFor } = await import("./otp");
          const sent = sendOtp(identifier.trim(), "sms");
          // mark as mock so verify knows to use mock
          localStorage.setItem("onion-setu-otp-mock", "1");
          return { ok:true, channel:"sms", mock:true, code: sent.code };
        }
        return { ok:false, error: msg + " — Phone SMS needs Twilio configured in Supabase (Auth → Providers → Phone). Use Gmail OTP for now — it works without extra config." };
      }
      localStorage.removeItem("onion-setu-otp-mock");
      return { ok:true, channel:"sms" };
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email: String(identifier).trim().toLowerCase(), options:{ shouldCreateUser:true, data:{ role } } });
      if(error) return { ok:false, error: error.message };
      localStorage.removeItem("onion-setu-otp-mock");
      return { ok:true, channel:"email" };
    }
  }
  async function verifySupabaseOtp(identifier, code){
    const isMock = localStorage.getItem("onion-setu-otp-mock")==="1";
    if(isMock){
      const { verifyOtp } = await import("./otp");
      const v = verifyOtp(identifier.trim(), String(code).trim());
      if(!v.ok) return { ok:false, error: v.error };
      const pendingRole = localStorage.getItem("onion-setu-pending-role") || "farmer";
      const local = { id:`u-${Date.now()}`, name: identifier.includes("@") ? identifier.split("@")[0] : identifier, email: identifier.includes("@") ? String(identifier).trim().toLowerCase() : `${String(identifier).trim()}@phone.local`, phone: /^[6-9]\d{9}$/.test(String(identifier).trim()) ? String(identifier).trim() : "", role: pendingRole, center: pendingRole==="grader" ? "Lasalgaon APMC — NAFED" : "Lasalgaon APMC", location:"Nashik, MH" };
      setUser(local);
      localStorage.removeItem("onion-setu-pending-role");
      localStorage.removeItem("onion-setu-otp-mock");
      return { ok:true };
    }
    const isPhone = /^[6-9]\d{9}$/.test(String(identifier).trim());
    const pendingRole = localStorage.getItem("onion-setu-pending-role") || "farmer";
    if(isPhone){
      const phone = `+91${String(identifier).trim()}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: String(code).trim(), type:"sms" });
      if(error) return { ok:false, error: error.message };
      const u = data.user;
      const local = { id: u.id, name: u.user_metadata?.name || u.email || u.phone || pendingRole, email: u.email || `${phone}@phone.local`, phone: identifier, role: u.user_metadata?.role || pendingRole, center: pendingRole==="grader" ? "Lasalgaon APMC — NAFED" : "Lasalgaon APMC", location:"Nashik, MH" };
      setUser(local);
      localStorage.removeItem("onion-setu-pending-role");
      return { ok:true };
    } else {
      const email = String(identifier).trim().toLowerCase();
      const { data, error } = await supabase.auth.verifyOtp({ email, token: String(code).trim(), type:"email" });
      if(error) return { ok:false, error: error.message };
      const u = data.user;
      const local = { id: u.id, name: u.user_metadata?.name || email.split("@")[0], email: u.email, phone: "", role: u.user_metadata?.role || pendingRole, center: pendingRole==="grader" ? "Lasalgaon APMC — NAFED" : "Lasalgaon APMC", location:"Nashik, MH" };
      setUser(local);
      localStorage.removeItem("onion-setu-pending-role");
      return { ok:true };
    }
  }
  function logout(){
    if(supabase) supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("onion-setu-pending-role");
  }
  function demoLogin(role){
    const d = DEMO_USERS.find(u=> u.role===role);
    setUser({ id:d.id, name:d.name, email:d.email, phone:d.phone, role:d.role, center:d.center, location:d.location });
  }
  const isGrader = user?.role==="grader";
  const isFarmer = user?.role==="farmer";
  // Effective user considers supabase session too
  const effectiveUser = user || (supaUser ? { id: supaUser.id, name: supaUser.email || supaUser.phone, email: supaUser.email, phone: supaUser.phone, role: supaUser.user_metadata?.role || "farmer", center:"Lasalgaon APMC", location:"Nashik, MH" } : null);
  return (
    <AuthContext.Provider value={{ user: effectiveUser, rawUser: user, supaUser, users: DEMO_USERS, isGrader, isFarmer, login, signup, logout, demoLogin, isPhone, loginWithSupabaseOtp, verifySupabaseOtp, isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export const FEATURES = {
  farmer: { canCreateAssessment:true, canReview:false, canSwitchPolicy:false, canViewAllAssessments:false, canDispute:true, canVerify:true },
  grader: { canCreateAssessment:true, canReview:true, canSwitchPolicy:true, canViewAllAssessments:true, canDispute:true, canVerify:true },
};
