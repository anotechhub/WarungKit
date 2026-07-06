# Frontend Deployment Runbook — Cloudflare Pages via GitHub Actions

## Why the Cloudflare dashboard "Workers Build" setup is wrong for this frontend

`apps/web` is a static React/Vite app. Its correct deployment target is **Cloudflare Pages**, not Cloudflare Workers.

If a Cloudflare dashboard project (Git-connected) shows a **"Deploy command"** field containing anything like:

```
npx wrangler deploy
npx wrangler versions upload
```

that project was set up as a **Workers Build**, not a Pages project. This is wrong for `apps/web` because:

- `wrangler deploy` / `wrangler versions upload` are Workers-specific commands. Run against a static frontend, Wrangler falls back to zero-config auto-detection, which tries to create a brand-new Worker and installs dependencies with plain `npm`, not `pnpm` — this breaks on the `workspace:*` protocol used by `@warungkit/contracts` (`EUNSUPPORTEDPROTOCOL`).
- Even once the deploy command field is emptied correctly, letting Cloudflare's dashboard drive this build re-introduces the same class of misconfiguration risk on every settings change.

**Action: delete or disable that dashboard Git-connected build/deploy setup entirely.** Do not try to keep patching its "Deploy command" field. The correct and only supported path going forward is the GitHub Actions workflow described below, which explicitly calls `wrangler pages deploy` — never `wrangler deploy`.

## Correct deployment path

Frontend deploys are driven by [`.github/workflows/deploy-pages.yml`](../../.github/workflows/deploy-pages.yml):

1. GitHub Actions checks out the repo, installs dependencies with `pnpm install --frozen-lockfile` (Node 22.23.1, pnpm 10.34.4).
2. Builds only the frontend: `pnpm --filter @warungkit/web build`.
3. Deploys the static output via `cloudflare/wrangler-action@v3` running:
   ```
   pages deploy apps/web/dist --project-name=warungkit-demo --branch=main
   ```

This is a **Direct Upload** Cloudflare Pages deployment — Cloudflare Pages never clones the repo or runs its own build. GitHub Actions is the only thing that builds and uploads `apps/web/dist`.

### Naming

| Component | Name / URL |
|---|---|
| Cloudflare Pages project (frontend) | `warungkit-demo` → `https://warungkit-demo.pages.dev` |
| Cloudflare Worker (backend, already deployed) | `warungkit-api` → `https://warungkit-api.anotechhub.workers.dev` |

Do not rename either project close to the webinar date (see `docs/PROJECT_CHECKLIST.md` Section 13).

## Required GitHub configuration

### Repository Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token scoped to Cloudflare Pages deploy permission only. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID that owns the `warungkit-demo` Pages project. |

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://warungkit-api.anotechhub.workers.dev` |
| `VITE_CHECKOUT_ENABLED` | `false` (keep `false` until the deployed API and a real Mayar sandbox invoice have been verified end-to-end) |

**Never** put `MAYAR_API_KEY`, `SUPABASE_SECRET_KEY`, or any other backend secret in these frontend-facing GitHub Variables or in the Cloudflare Pages project settings. The frontend build only ever needs `VITE_`-prefixed, non-sensitive values — anything placed here ends up in the public browser bundle.

## After Pages is live: backend follow-up (not part of this change)

Once `https://warungkit-demo.pages.dev` is confirmed live, the **separate** Worker configuration (`apps/api`, out of scope for this workflow) should be updated to lock CORS to the real frontend origin:

```
FRONTEND_BASE_URL=https://warungkit-demo.pages.dev
ALLOWED_ORIGINS=https://warungkit-demo.pages.dev
```

This is a backend Worker configuration change and must be done separately via `wrangler` Worker config/secrets — it is not part of this frontend deployment workflow.

## Manual steps required before this workflow can run successfully

1. In the Cloudflare dashboard, delete/disable the existing Git-connected "Workers Build" project that was wrongly configured for `apps/web`.
2. Create the Cloudflare Pages project `warungkit-demo` (Direct Upload mode — no Git connection needed, since GitHub Actions pushes builds directly).
3. Create a Cloudflare API token scoped to Pages:Edit for the account, and add it plus the account ID as GitHub repository secrets listed above.
4. Add the two GitHub repository variables listed above.
5. Trigger the workflow (push to `main` touching `apps/web/**`, or run it manually via `workflow_dispatch`) and confirm a successful deploy at `https://warungkit-demo.pages.dev`.
