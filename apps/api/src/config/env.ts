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

export interface MayarRuntimeConfig {
  mayarApiKey: string;
  mayarApiBaseUrl: string;
  frontendBaseUrl: string;
}

// FRONTEND_BASE_URL is not a secret — it is a public, backend-only
// configuration value used solely to construct the Mayar invoice redirect
// URL server-side. It must never be hardcoded in source; always read here.
export function readMayarConfig(env: CloudflareBindings): MayarRuntimeConfig | null {
  const mayarApiKey = env.MAYAR_API_KEY?.trim();
  const mayarApiBaseUrl = env.MAYAR_API_BASE_URL?.trim();
  const frontendBaseUrl = env.FRONTEND_BASE_URL?.trim();

  if (!mayarApiKey || !mayarApiBaseUrl || !frontendBaseUrl) {
    return null;
  }

  return {
    mayarApiKey,
    mayarApiBaseUrl: mayarApiBaseUrl.replace(/\/$/, ""),
    frontendBaseUrl: frontendBaseUrl.replace(/\/$/, ""),
  };
}
