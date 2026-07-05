import type { CloudflareBindings } from "../types/bindings";

export interface SupabaseRuntimeConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
}

// Returns the Supabase runtime config only when both required bindings are
// present and non-empty. Callers must treat `null` as "configuration
// incomplete" and respond with a safe 503 — never log or expose which
// specific binding was missing.
export function readSupabaseConfig(env: CloudflareBindings): SupabaseRuntimeConfig | null {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabaseSecretKey = env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  return { supabaseUrl, supabaseSecretKey };
}

export function readAllowedOrigins(env: CloudflareBindings): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
