import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://vgakksutqrupmbffjedk.supabase.co";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = anon ? createClient(url, anon) : null;

export const isSupabaseConfigured = Boolean(anon);

export function getSupabaseUrl(){ return url; }
