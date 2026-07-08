// Static-assets-only Worker entrypoint for the `warungkit-demo` frontend.
// This file must never contain business logic, API calls, secrets, or any
// Mayar/Supabase access — it only hands requests off to the built assets
// (see `assets.binding` in wrangler.jsonc) so Cloudflare can serve the Vite
// SPA build from a Workers Static Assets deployment.

interface AssetsBinding {
  fetch(request: Request): Promise<Response>
}

interface Env {
  ASSETS: AssetsBinding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request)
  },
}
