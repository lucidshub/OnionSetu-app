import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { StoreProvider } from "./lib/store";
import { AuthProvider, useAuth } from "./lib/auth";
import { I18nProvider, useI18n } from "./lib/i18n";
import Layout from "./components/Layout";
import { SplashScreen } from "./components/OnionSetuLoader";
import LanguageGate from "./components/LanguageGate";

const Dashboard = lazy(()=> import("./pages/Dashboard"));
const BatchGrading = lazy(()=> import("./pages/BatchGrading"));
const NewAssessment = lazy(()=> import("./pages/NewAssessment"));
const Assessments = lazy(()=> import("./pages/Assessments"));
const Reviews = lazy(()=> import("./pages/Reviews"));
import { ReportsList, ReportDetail } from "./pages/Reports";
const Policy = lazy(()=> import("./pages/Policy"));
const Settings = lazy(()=> import("./pages/Settings"));
const Verification = lazy(()=> import("./pages/Verification"));
const Landing = lazy(()=> import("./pages/Landing"));
const Login = lazy(()=> import("./pages/Login"));
const Signup = lazy(()=> import("./pages/Signup"));
const NotFound = lazy(()=> import("./pages/NotFound"));

function Loader(){
  return <div style={{padding:40, textAlign:"center", color:"#8a7a74", fontSize:14}}>Loading OnionSetu…</div>;
}

function Protected({ children, allow }){
  const { user } = useAuth();
  const { t } = useI18n();
  const loc = useLocation();
  if(!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if(allow && !allow.includes(user.role)) return (
    <div style={{maxWidth:560, margin:"40px auto", textAlign:"center", display:"grid", gap:14, padding:20}}>
      <div style={{width:56,height:56, borderRadius:"50%", background:"#FDECEC", border:"2px solid #F5C2C2", display:"grid", placeItems:"center", margin:"0 auto", color:"#B33A3A", fontWeight:800}}>!</div>
      <h2 style={{margin:0, fontFamily:"Fraunces, serif"}}>{t("roleNotAvailable")}</h2>
      <p style={{margin:0, color:"#6B5A54", fontSize:14}}>Your account is <b>{user.role}</b>. This section is for <b>{allow.join(" / ")}</b> only.</p>
      <p style={{margin:0, fontSize:13, color:"#8a7a74"}}>Farmer can: view Dashboard (my lots), Assessments (my lots), Reports, Policy (read), Verification. Grader can: all of the above + create assessments, human review, switch policy.</p>
      <Navigate to="/" />
    </div>
  );
  return children;
}

function AppRoutes(){
  const [loading, setLoading] = useState(true);
  const { hasChosen } = useI18n();
  useEffect(()=>{
    if(sessionStorage.getItem("onionsetu_splash_seen")){
      setLoading(false);
    }
  },[]);
  function handleDone(){
    sessionStorage.setItem("onionsetu_splash_seen","1");
    setLoading(false);
  }
  if(!hasChosen){
    return (
      <>
        {loading && <SplashScreen onDone={handleDone} />}
        <LanguageGate />
      </>
    );
  }
  return (
    <>
      {loading && <SplashScreen onDone={handleDone} />}
      <Suspense fallback={<Loader/>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/*" element={
          <Protected allow={["farmer","grader"]}>
          <Layout>
            <Suspense fallback={<Loader/>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/batch" element={<BatchGrading />} />
              <Route path="/new" element={<NewAssessment />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/reviews" element={
                <Protected allow={["grader"]}><Reviews /></Protected>
              } />
              <Route path="/reports" element={<ReportsList />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/verify/:id" element={<Verification />} />
              <Route path="/policy" element={<Policy />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </Layout>
          </Protected>
        } />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App(){
  return (
    <I18nProvider>
    <StoreProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </StoreProvider>
    </I18nProvider>
  );
}
