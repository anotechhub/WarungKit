import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseRuntimeConfig } from "../config/env";

// Server-side Supabase client only. Uses SUPABASE_SECRET_KEY — the backend
// service credential — and must never be constructed with a browser-safe
// publishable key or exposed outside repository-layer modules.
export function createSupabaseServerClient(config: SupabaseRuntimeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
