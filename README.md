# WarungKit

A secure digital storefront webinar demo for Indonesian UMKM (small/micro businesses). WarungKit shows how an AI-assisted ("vibe coded") storefront becomes a trustworthy business application once real engineering boundaries are added: a backend API, controlled database access, server-side payment verification, webhook handling, secret management, and security controls.

## Current Status: Foundation and architecture documentation in progress

This repository currently contains the repository scaffold, Claude Code governance layer (Phases P1–P2), and architecture/security documentation (Phase P3) from `docs/PROJECT_CHECKLIST.md`. No application code, no database schema, no Cloudflare/Supabase/Mayar configuration, and **no live payment integration** exist yet.

## Documentation Map

| Document | Purpose |
|---|---|
| `docs/WarungKit_BRD_Technical_Blueprint_v1.0.pdf` | Single source of truth for scope, architecture, security, data model, API direction, and demo flow. Never duplicated or replaced by other docs. |
| `docs/PROJECT_CHECKLIST.md` | Full phased, execution-ready checklist translating the BRD into concrete, testable tasks per phase (P0–P11). |
| `docs/decisions/0001-architecture-baseline.md` | Accepted Architecture Decision Record: locked technology choices, component responsibilities, trust boundaries, and the primary payment flow. |
| `docs/decisions/0002-threat-model.md` | Accepted threat model mapping each relevant attack scenario to a concrete WarungKit control and its verification evidence. |
| `docs/runbooks/security-preflight.md` | Practical security checklist split by project stage (before coding → after webinar), used to catch regressions before each milestone. |
| `docs/runbooks/demo-operator-baseline.md` | Baseline for the future P11 rehearsal: checkpoint definitions (`demo-start`/`demo-payment`/`demo-final`/`demo-backup`) and presenter hygiene rules. |

## High-Level Architecture (Target)

```
Customer Browser → Cloudflare Pages (React/Vite frontend)
                  → Cloudflare Worker (Hono API)
                  → Supabase PostgreSQL (orders, products, payment events)
                  → Mayar (payment provider, server-side only)
```

The browser only ever talks to the Worker API. The Worker is the sole caller of Mayar and the sole writer to sensitive database tables — order status becomes `paid` only after the Worker verifies payment server-side against Mayar, never from a browser redirect alone. See `docs/decisions/0001-architecture-baseline.md` for the full component breakdown and trust boundaries, `docs/decisions/0002-threat-model.md` for the threats this design mitigates, and `docs/PROJECT_CHECKLIST.md` plus the source BRD PDF for complete architecture and security detail.

## Repository Structure

```
apps/
  web/                  React + Vite + TypeScript + Tailwind storefront (not yet scaffolded)
  api/                  Hono API on Cloudflare Workers (not yet scaffolded)
packages/
  contracts/            Shared Zod schemas and TypeScript types (not yet scaffolded)
supabase/
  migrations/           Versioned schema and RLS migrations (not yet created)
.claude/
  skills/               Scoped Claude Code skills guiding implementation per feature area
docs/
  decisions/            Architecture Decision Records
  runbooks/             Operational runbooks (security, demo)
  PROJECT_CHECKLIST.md  Full phased execution checklist
assets/
  brand/                Approved WarungKit logo and brand assets
  ui-reference/         Approved UI/UX reference exports (Google Stitch direction)
scripts/                Local helper scripts (no secrets)
tests/                  Cross-app/integration tests (not yet created)
```

## Design Assets

- `assets/brand/` holds the approved WarungKit logo and brand direction reference (charcoal / near-black, soft cream, muted terracotta, warm orange accents).
- `assets/ui-reference/` holds the approved landing page UI/UX direction exported from Google Stitch.
- Frontend implementation must follow these references — see `.claude/skills/frontend-design/SKILL.md` and the Design Rules section of `CLAUDE.md`.

## Local Setup Prerequisites

- **Node.js 22 or above is required** (see `engines` in `package.json`) — application scaffolding must not begin until this is confirmed on the local machine.
- **A working pnpm installation is required** before any application scaffolding (workspace defined in `pnpm-workspace.yaml`).
- No application dependencies are installed yet — this will happen once `apps/web`, `apps/api`, and `packages/contracts` are scaffolded.

## Security Note

- No `.env`, `.dev.vars`, or other secret files exist in this repository, and none should ever be committed.
- `.env.example` lists required variable **names only** — no values.
- See `CLAUDE.md` for the full list of non-negotiable security rules (no secrets in code/logs/docs, backend-only price resolution, backend-only payment verification, mandatory RLS, etc.).

## Implementation Phases

This repository follows the phased plan in `docs/PROJECT_CHECKLIST.md`:

- **P0** BRD Review and Scope Lock
- **P1** Repository and Git Foundation *(this setup)*
- **P2** Claude Code Governance and Skills *(this setup)*
- **P3** Architecture and Security Documentation *(this setup)*
- **P4** Cloudflare, Supabase, and Mayar Environment Setup
- **P5** Database Schema, RLS, and Seed Data
- **P6** Backend API Foundation
- **P7** Frontend Storefront and Checkout Experience
- **P8** Mayar Payment and Webhook Integration
- **P9** Security, Testing, and Observability
- **P10** Cloudflare Deployment and End-to-End Validation
- **P11** Webinar Rehearsal, Fallback, and Live Demo Readiness

## Root Scripts

The root `package.json` currently contains **placeholder scripts only** (`lint`, `typecheck`, `test`, `build`) that print a notice instead of calling packages that do not exist yet. These will be completed to call `pnpm -r <script>` once `apps/web`, `apps/api`, and `packages/contracts` are scaffolded in later phases.

## No Live Payment Integration

**There is no live payment integration in this repository yet.** Mayar, Supabase, and Cloudflare are not configured, no API routes exist, and no database schema has been created. This will be built incrementally in later phases per `docs/PROJECT_CHECKLIST.md`.
