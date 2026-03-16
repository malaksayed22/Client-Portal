import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

const hasPlaceholderValue =
  supabaseUrl.includes("your_project_url_here") ||
  supabaseKey.includes("your_anon_key_here");

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseKey.length > 0 && !hasPlaceholderValue;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Keep app booting locally while keys are not configured yet.
  // Sync calls already fall back to local cache when Supabase is unavailable.
  console.warn(
    "Supabase is not configured yet. Add real values to .env (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).",
  );
}
