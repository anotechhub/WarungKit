# CLAUDE.md — WarungKit Project Rules

## Project Purpose

WarungKit is a secure digital storefront webinar demo for Indonesian UMKM. It demonstrates how an AI-assisted ("vibe coded") storefront becomes a trustworthy business application only when it adds real engineering boundaries: a backend API, controlled database access, payment verification, webhook handling, secret management, and security controls.

This is a demo-first project for a live 60-minute webinar — optimize for reliability and security of the core checkout-to-paid flow, not for enterprise-scale features.

## Architecture Target

- Frontend: React + Vite + TypeScript + Tailwind CSS, deployed as a static app.
- Backend: Hono API running on Cloudflare Workers.
- Database: Supabase PostgreSQL.
- Payment: Mayar invoice/payment-link integration.
- Repo model: pnpm monorepo (`apps/web`, `apps/api`, `packages/contracts`).
- Shared validation: Zod schemas in `packages/contracts`, used by both frontend and backend.

## Non-Negotiable Rules

- Use strict TypeScript everywhere. No `any` unless explicitly justified in a comment and reviewed.
- Never place secrets in code, logs, screenshots, documentation, or Git — no exceptions.
- The browser must never call Mayar directly.
- The browser must never receive the Mayar API key or the Supabase secret key (`SUPABASE_SECRET_KEY`).
- The browser must never directly access sensitive order tables (orders, payment events, idempotency records).
- Product prices must always be resolved from the database by the backend — never trust a browser-submitted price.
- A payment redirect is a UX event only — it is never proof of payment.
- Only verified backend logic (server-side confirmation against Mayar) may transition an order to `paid`.
- Checkout must be idempotent — the same idempotency key must never create a duplicate order.
- Mayar webhook processing must be idempotent — the same event must never be applied twice.
- Database schema changes require a migration file. No manual/ad-hoc schema edits.
- Row Level Security (RLS) is mandatory for every Supabase table, with no exceptions.
- No permissive anonymous policy for orders, payment events, or idempotency data.
- Every new API endpoint needs input validation, safe (non-leaking) error responses, and tests.
- All database access must go through a repository layer — no ad-hoc queries scattered across routes.
- All third-party integrations (Mayar, etc.) must be isolated behind a dedicated service/adapter layer.
- Every meaningful implementation task follows: **Plan → Scope → Implement → Verify → Commit.**
- Before declaring any task complete, run the relevant lint, typecheck, test, and build commands and confirm they pass.

## Design Rules

- Follow the approved WarungKit visual direction: charcoal / near-black, soft cream, muted terracotta, warm orange accents — clean, premium, modern, and relevant to Indonesian UMKM.
- Do not use generic, loud SaaS gradients or templated AI-default aesthetics.
- Use premium whitespace and clear visual hierarchy.
- Use logo and UI reference assets from `assets/brand/` and `assets/ui-reference/` once they are populated — do not invent new visual assets that conflict with them.
- Do not invent a new brand direction without explicit approval from the project owner.

## Working With Claude Code

- Reference exactly one skill (`.claude/skills/*/SKILL.md`) and one feature area per task. Keep prompts narrow enough to review.
- Do not invent business rules, expose secrets, or make uncontrolled project-wide changes.
- Inspect relevant docs (`docs/decisions/`, `docs/PROJECT_CHECKLIST.md`) and propose a plan before editing when a task is non-trivial.
- Change code only within the intended folders for the task at hand.
