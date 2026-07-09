import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Public backend base URL only — never a secret. Used as a build-time
// fallback so a production build never silently falls back to same-origin
// relative paths (which returns the SPA's index.html, not JSON) just
// because VITE_API_BASE_URL wasn't set in the shell/CI environment.
const DEFAULT_API_BASE_URL = 'https://warungkit-api.anotechhub.workers.dev'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_PROXY_TARGET || DEFAULT_API_BASE_URL

  return {
    plugins: [react()],
    // Only applied for `vite build` (production bundles) — `vite dev` keeps
    // using the proxy above with a relative '' base, per .env.example.
    define:
      command === 'build'
        ? {
            'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
              env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
            ),
          }
        : undefined,
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
