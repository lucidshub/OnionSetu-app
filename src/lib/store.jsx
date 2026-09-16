import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { assessmentsSeed, policies as mockPolicies, generateId, generateLotId } from "./mockData";
import { gradeLot } from "./grading";
import { supabase, isSupabaseConfigured } from "./supabase";

const StoreContext = createContext(null);
export function useStore(){ return useContext(StoreContext); }
const LS_KEY = "onion-setu-v1";

function isUuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v)); }

export function StoreProvider({ children }){
  const [assessments, setAssessments] = useState(()=>{
    try{ const raw=localStorage.getItem(LS_KEY); if(raw) return JSON.parse(raw).assessments || assessmentsSeed; }catch{}
    return assessmentsSeed;
  });
  const [policies, setPolicies] = useState(mockPolicies);
  const [activePolicy, setActivePolicyState] = useState(()=>{
    try{ const raw=localStorage.getItem(LS_KEY); if(raw) return JSON.parse(raw).activePolicy || mockPolicies.find(p=>p.isActive); }catch{}
    return mockPolicies.find(p=>p.isActive);
  });
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(()=>{
    try{ const raw=localStorage.getItem(LS_KEY); if(raw) return JSON.parse(raw).pendingCount ?? 0; }catch{}
    return 0;
  });
  const [loading, setLoading] = useState(false);

  // Persist local cache (strip session-only blobs/Files — they can't survive reload)
  useEffect(()=>{
    try{
      const clean = assessments.map(a=>({
        ...a,
        captures: undefined,
        images: (a.images||[]).filter(im=> im && im.public_url && !String(im.public_url).startsWith("blob:")),
      }));
      localStorage.setItem(LS_KEY, JSON.stringify({ assessments: clean, activePolicy, pendingCount }));
    }catch{}
  },[assessments, activePolicy, pendingCount]);

  // Fetch policies from Supabase
  const fetchPolicies = useCallback(async()=>{
    if(!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from("policies").select("*").order("effective_from",{ascending:false});
    if(!error && data && data.length){
      const mapped = data.map(p=>({
        id:p.id, version:p.version, label:p.label, sizeBand:{min:p.size_min,max:p.size_max},
        tolerances:p.tolerances, description:p.description, effectiveFrom:p.effective_from, isActive:p.is_active
      }));
      setPolicies(mapped);
      const active = mapped.find(m=>m.isActive);
      if(active) setActivePolicyState(prev=> mapped.find(m=>m.version===prev.version) || active);
    }
  },[]);
  useEffect(()=>{ fetchPolicies(); },[fetchPolicies]);

  // Fetch assessments per-user from Supabase
  const fetchAssessments = useCallback(async()=>{
    if(!isSupabaseConfigured || !supabase) return;
    const { data:{ session } } = await supabase.auth.getSession();
    if(!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from("assessments").select("*, assessment_onions(*), assessment_images(*)").order("created_at",{ascending:false}).limit(50);
    if(!error && data){
      // Map DB rows to UI shape, keeping local shape compatible
      const mapped = data.map(row=>({
        id: row.id, lotId: row.lot_id, farmer: row.farmer_name, center: row.center, location: row.location,
        assessor: row.assessor_name, policyVersion: row.policy_version, modelVersion: row.model_version,
        sampleSize: row.sample_size, gradeA: row.grade_a, urs: row.urs, status: row.status, sync:"Synced",
        confidence: row.confidence, humanReviews: row.human_reviews, hash: row.hash,
        acknowledged:{ farmer: row.farmer_ack, grader: row.grader_ack },
        date: row.created_at, updatedAt: row.updated_at,
        onions: (row.assessment_onions||[]).map(o=>({ id:o.onion_id, sizeMm: Number(o.size_mm), defect:o.defect, confidence:o.confidence, grade:o.grade })),
        images: row.assessment_images||[],
        _user_id: row.user_id,
      }));
      // Merge with local pending offline items (those with sync Offline)
      setAssessments(prev=>{
        const pending = prev.filter(p=> p.sync==="Offline" || p.sync==="Pending" || p.sync==="Sync Pending");
        // Deduplicate by id
        const ids = new Set(mapped.map(m=>m.id));
        const merged = [...pending.filter(p=>!ids.has(p.id)), ...mapped];
        // If no Supabase data yet, keep seed
        return merged.length ? merged : prev;
      });
    }
    setLoading(false);
  },[]);

  // Initial fetch and on auth change
  useEffect(()=>{
    fetchAssessments();
    if(!supabase) return;
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(()=> fetchAssessments());
    return ()=> subscription.unsubscribe();
  },[fetchAssessments]);

  async function addAssessment(data){
    const id = generateId();
    const lotId = data.lotId || generateLotId();
    const grading = gradeLot(data.onions || [], activePolicy);
    // Instant local preview from captured Files (this session).
    // data.captures is aligned to view_index and may contain nulls.
    const localImages = [];
    if(data.captures && Array.isArray(data.captures)){
      data.captures.forEach((c,i)=>{
        if(c instanceof File){
          try{ localImages.push({ view_index:i, public_url: URL.createObjectURL(c), storage_path:null, local:true }); }catch{}
        } else if(typeof c === "string" && c && !String(c).startsWith("demo")){
          localImages.push({ view_index:i, public_url:c, storage_path:null, local:true });
        }
      });
    }
    const entry = {
      id, lotId, farmer: data.farmer, center: data.center, location: data.location,
      date: new Date().toISOString(), assessor: data.assessor,
      policyVersion: activePolicy.version, modelVersion:"Prototype Demo Inference",
      sampleSize: data.onions?.length || grading.total, gradeA: grading.gradeA, urs: grading.urs,
      status: data.status || "Completed", sync: offline ? "Offline" : "Synced",
      humanReviews: data.humanReviews ?? 0,
      confidence: data.confidence ?? Math.round((data.onions||[]).reduce((a,b)=>a+b.confidence,0)/Math.max(1,(data.onions||[]).length)),
      onions: grading.details, hash: data.hash || "a3f9c1e7 8b2d 4f0a 9e11 d6c3a5b8e902",
      acknowledged:{ farmer:false, grader:false }, ...data, id, lotId,
      images: localImages,
    };
    // Optimistic local
    setAssessments(prev=>[entry, ...prev]);
    if(offline) setPendingCount(c=>c+1);

    // Try Supabase persist if real user and online
    if(!offline && isSupabaseConfigured && supabase){
      try{
        const { data:{ session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if(uid && isUuid(uid)){
          // Upload images if captures are real File urls (blob)
          // data.captures is optional array of File or blob urls; we handle if data.captures present
          // For now, insert assessment row
          const { error: insErr } = await supabase.from("assessments").insert({
            id, user_id: uid, lot_id: lotId, farmer_name: entry.farmer, center: entry.center, location: entry.location,
            assessor_name: entry.assessor, policy_version: entry.policyVersion, model_version: "Prototype Demo Inference",
            sample_size: entry.sampleSize, grade_a: entry.gradeA, urs: entry.urs, status: entry.status, sync_status:"Synced",
            confidence: entry.confidence, human_reviews: entry.humanReviews, hash: entry.hash,
            farmer_ack:false, grader_ack:false
          });
          if(!insErr){
            // Onions
            if(entry.onions?.length){
              const rows = entry.onions.map(o=>({ assessment_id:id, onion_id:o.id, size_mm:o.sizeMm, defect:o.defect, confidence:o.confidence, grade:o.grade }));
              await supabase.from("assessment_onions").insert(rows);
            }
            // Images: if data.captures are Files, upload to storage (keep original view_index)
            const uploaded = [];
            if(data.captures && Array.isArray(data.captures)){
              for(let i=0;i<data.captures.length;i++){
                const c = data.captures[i];
                if(c instanceof File){
                  const path = `${uid}/${id}/view_${i}.jpg`;
                  const { error: upErr } = await supabase.storage.from("assessment-images").upload(path, c, { upsert:true });
                  if(!upErr){
                    const { data: urlData } = supabase.storage.from("assessment-images").getPublicUrl(path);
                    await supabase.from("assessment_images").insert({ assessment_id:id, view_index:i, storage_path:path, public_url:urlData.publicUrl });
                    uploaded.push({ view_index:i, storage_path:path, public_url:urlData.publicUrl });
                  }
                }
              }
              if(uploaded.length){
                // Swap local blob previews for permanent stored URLs (merge by view_index)
                setAssessments(prev=> prev.map(a=>{
                  if(a.id!==id) return a;
                  const byView = new Map((a.images||[]).map(im=>[im.view_index, im]));
                  uploaded.forEach(u=> byView.set(u.view_index, u));
                  return { ...a, images:[...byView.values()].sort((x,y)=>x.view_index-y.view_index) };
                }));
              }
            }
            // Audit
            await supabase.from("audit_logs").insert({ assessment_id:id, action:"create", actor_id:uid, actor_role: session.user?.user_metadata?.role || "farmer", details:{ grade_a: entry.gradeA, urs: entry.urs } });
            // Mark synced
            setAssessments(prev=> prev.map(a=> a.id===id ? { ...a, sync:"Synced" } : a));
          } else {
            console.warn("Supabase insert failed, keeping local", insErr);
            setAssessments(prev=> prev.map(a=> a.id===id ? { ...a, sync:"Offline" } : a));
            setPendingCount(c=>c+1);
          }
        }
      }catch(e){ console.warn("Supabase persist error", e); }
    }
    return entry;
  }

  async function updateAssessment(id, patch){
    setAssessments(prev=> prev.map(a=> a.id===id ? { ...a, ...patch } : a));
    if(isSupabaseConfigured && supabase){
      try{
        const { data:{ session } } = await supabase.auth.getSession();
        if(!session?.user) return;
        // Map patch to DB columns (only known fields)
        const colMap = { farmer:"farmer_name", center:"center", status:"status", dispute_reason:"dispute_reason" };
        const dbPatch = {};
        if(patch.status) dbPatch.status = patch.status;
        if(patch.dispute) { dbPatch.dispute_reason = patch.dispute.reason; dbPatch.dispute_by = patch.dispute.by; dbPatch.dispute_at = patch.dispute.at; }
        if(patch.acknowledged){ if(patch.acknowledged.farmer) dbPatch.farmer_ack = true; if(patch.acknowledged.grader) dbPatch.grader_ack = true; }
        if(Object.keys(dbPatch).length){
          await supabase.from("assessments").update(dbPatch).eq("id", id);
        }
      }catch(e){ console.warn("Supabase update failed", e); }
    }
  }

  async function syncAll(){
    // Push any Offline to Supabase
    const pendings = assessments.filter(a=> a.sync==="Offline" || a.sync==="Pending" || a.sync==="Sync Pending");
    for(const p of pendings){
      if(isSupabaseConfigured && supabase){
        try{
          const { data:{ session } } = await supabase.auth.getSession();
          if(!session?.user) continue;
          const uid = session.user.id;
          if(!isUuid(uid)) continue;
          const { error } = await supabase.from("assessments").insert({
            id: p.id, user_id: uid, lot_id: p.lotId, farmer_name: p.farmer, center: p.center, location: p.location,
            assessor_name: p.assessor, policy_version: p.policyVersion, model_version: p.modelVersion,
            sample_size: p.sampleSize, grade_a: p.gradeA, urs: p.urs, status:"Completed", sync_status:"Synced",
            confidence: p.confidence, human_reviews: p.humanReviews, hash: p.hash
          });
          if(!error && p.onions?.length){
            await supabase.from("assessment_onions").insert(p.onions.map(o=>({ assessment_id:p.id, onion_id:o.id, size_mm:o.sizeMm, defect:o.defect, confidence:o.confidence, grade:o.grade || "Grade A" })));
          }
          if(!error && p.captures && Array.isArray(p.captures)){
            // Upload pending captures captured while offline (Files only survive in-session)
            const uploaded = [];
            for(let i=0;i<p.captures.length;i++){
              const c = p.captures[i];
              if(c instanceof File){
                const path = `${uid}/${p.id}/view_${i}.jpg`;
                const { error: upErr } = await supabase.storage.from("assessment-images").upload(path, c, { upsert:true });
                if(!upErr){
                  const { data: urlData } = supabase.storage.from("assessment-images").getPublicUrl(path);
                  await supabase.from("assessment_images").insert({ assessment_id:p.id, view_index:i, storage_path:path, public_url:urlData.publicUrl });
                  uploaded.push({ view_index:i, storage_path:path, public_url:urlData.publicUrl });
                }
              }
            }
            if(uploaded.length){
              setAssessments(prev=> prev.map(a=>{
                if(a.id!==p.id) return a;
                const byView = new Map((a.images||[]).map(im=>[im.view_index, im]));
                uploaded.forEach(u=> byView.set(u.view_index, u));
                return { ...a, images:[...byView.values()].sort((x,y)=>x.view_index-y.view_index) };
              }));
            }
          }
        }catch(e){ console.warn("sync failed", e); continue; }
      }
    }
    setAssessments(prev=> prev.map(a=> a.sync==="Offline" ? { ...a, sync:"Synced", status: a.status==="Sync Pending" ? "Completed" : a.status } : a));
    setPendingCount(0); setOffline(false);
    fetchAssessments();
  }

  function setPolicy(version){
    const p = policies.find(x=>x.version===version);
    if(p) setActivePolicyState(p);
    // Optionally persist to Supabase: update policies is_active (grader only)
    if(isSupabaseConfigured && supabase){
      supabase.from("policies").update({ is_active:false }).neq("version", version).then(()=> supabase.from("policies").update({ is_active:true }).eq("version", version));
    }
  }

  return (
    <StoreContext.Provider value={{
      assessments, policies, activePolicy,
      setPolicy, addAssessment, updateAssessment,
      offline, setOffline, pendingCount, setPendingCount, syncAll, loading, fetchAssessments
    }}>
      {children}
    </StoreContext.Provider>
  );
}
