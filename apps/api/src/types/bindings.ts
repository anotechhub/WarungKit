// The CloudflareBindings interface is generated into `bindings.gen.d.ts` via
// `pnpm --filter @warungkit/api cf-typegen` (wrangler types). That file
// declares CloudflareBindings as a global ambient interface based on the
// variable names present in `.dev.vars` at generation time — do not hand-edit
// it. This module re-exports the same shape as a regular importable type so
// application code can `import type { CloudflareBindings } from "../types/bindings"`
// consistently, without depending on ambient global type resolution order.
export interface CloudflareBindings {
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  MAYAR_API_KEY?: string;
  MAYAR_API_BASE_URL?: string;
}
