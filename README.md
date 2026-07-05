# WarungKit

A secure digital storefront webinar demo for Indonesian UMKM (small/micro businesses). WarungKit shows how an AI-assisted ("vibe coded") storefront becomes a trustworthy business application once real engineering boundaries are added: a backend API, controlled database access, server-side payment verification, webhook handling, secret management, and security controls.

## Current Status: Secure checkout/payment foundation, reconciled against verified Mayar API docs (P8-A.1)

This repository contains the repository scaffold, Claude Code governance layer (Phases P1–P2), architecture/security documentation (Phase P3), the reviewed database migration baseline (Phase P5-A), the backend API foundation (Phase P6), the frontend storefront/checkout/payment-status UI (Phase P7), a secure backend implementation of checkout, order-status lookup, and Mayar webhook handling (Phase P8-A), and a Mayar API contract reconciliation against Mayar's verified canonical response shapes (Phase P8-A.1) from `docs/PROJECT_CHECKLIST.md`. See `docs/api-contract.md` for the full endpoint contract and security model.

**P8-A/P8-A.1 are implemented but not deployed and not registered with Mayar.** No Cloudflare Worker deployment has been made, no webhook URL has been registered with Mayar, and no real Mayar invoice has ever been created outside of mocked tests. The frontend's checkout submission is still disabled (`VITE_CHECKOUT_ENABLED=false`) pending that manual go-live step.

Key correction in P8-A.1: **the Mayar webhook payload is a trigger only, never payment truth, and correlating a webhook to an order is best-effort** — Mayar's documented webhook fields (`data.id` = webhook/event ID, `data.status` = a boolean transaction flag) do not guarantee an invoice ID is present. Correlation is only attempted via explicit `invoiceId`/`paymentLinkId` fields or a validated `data.extraData.orderId`/`noCustomer`; root `id`, `data.id`, `productId`, customer contact fields, and `amount` are never used to correlate. Because correlation can fail, `GET /api/orders/:orderId` polling with the receipt token remains the required, guaranteed path to accurate status — not an optional convenience.

## Documentation Map

| Document | Purpose |
|---|---|
| `docs/WarungKit_BRD_Technical_Blueprint_v1.0.pdf` | Single source of truth for scope, architecture, security, data model, API direction, and demo flow. Never duplicated or replaced by other docs. |
| `docs/PROJECT_CHECKLIST.md` | Full phased, execution-ready checklist translating the BRD into concrete, testable tasks per phase (P0–P11). |
| `docs/decisions/0001-architecture-baseline.md` | Accepted Architecture Decision Record: locked technology choices, component responsibilities, trust boundaries, and the primary payment flow. |
| `docs/decisions/0002-threat-model.md` | Accepted threat model mapping each relevant attack scenario to a concrete WarungKit control and its verification evidence. |
| `docs/runbooks/security-preflight.md` | Practical security checklist split by project stage (before coding → after webinar), used to catch regressions before each milestone. |
| `docs/runbooks/demo-operator-baseline.md` | Baseline for the future P11 rehearsal: checkpoint definitions (`demo-start`/`demo-payment`/`demo-final`/`demo-backup`) and presenter hygiene rules. |
| `docs/api-contract.md` | Endpoint-by-endpoint API contract: request/response shapes, trust boundaries, the Mayar payment flow, and the security guarantees each endpoint enforces. |

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
  web/                  React + Vite + TypeScript storefront — Home, Checkout, Payment Status pages (checkout submission still disabled pending P8 go-live)
  api/                  Hono API on Cloudflare Workers — health, products, secure checkout, order status, and Mayar webhook handling
packages/
  contracts/            Shared Zod schemas and TypeScript types (HealthResponse, Product, ApiError, CheckoutRequest/Response, OrderStatusResponse)
supabase/
  migrations/           Versioned schema and RLS migrations (core schema baseline created; not yet pushed remotely)
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

- **Node.js 22 or above is required** (see `engines` in `package.json`).
- **pnpm 10 or above is required** (workspace defined in `pnpm-workspace.yaml`; run `pnpm install` from the repo root).
- Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` for local development and fill in real values there — never commit `.dev.vars`.
- `apps/web` is not yet scaffolded; its dependencies will be added in a later phase.

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
- **P5** Database Schema, RLS, and Seed Data *(migration + seed reviewed locally; not yet pushed remotely)*
- **P6** Backend API Foundation *(health + products implemented)*
- **P7** Frontend Storefront and Checkout Experience *(Home, Checkout, Payment Status UI implemented; checkout submission disabled pending P8 go-live)*
- **P8-A** Secure Checkout, Mayar Invoice, Order Status, and Webhook Foundation *(implemented and unit/route tested; not deployed, not registered with Mayar, no real invoice ever created)*
- **P8-A.1** Mayar API Contract Reconciliation *(implementation reconciled against verified Mayar canonical response shapes for invoice create/detail and webhook field semantics)*
- **P9** Security, Testing, and Observability
- **P10** Cloudflare Deployment and End-to-End Validation
- **P11** Webinar Rehearsal, Fallback, and Live Demo Readiness

## Root Scripts

The root `package.json` now runs real workspace scripts: `dev:api`, `lint`, `typecheck`, `test`, and `build` all delegate to `pnpm -r --if-present <script>`, so they work today across `apps/api` and `packages/contracts` and will pick up `apps/web` automatically once it is scaffolded (no root script changes needed later). `format` and `format:check` run Prettier across the whole repo.

## No Live Payment Integration

**Checkout/order-status/webhook code exists (P8-A), but no live payment integration has ever run.** Nothing has been deployed to Cloudflare Workers, no webhook URL has been registered with Mayar, and every test that exercises Mayar calls uses a mocked `fetch` — no real Mayar API request has been made from this codebase. Key security guarantees baked into this implementation:

- The frontend never sends a price — the backend always resolves `amount_idr` from `products.price_idr`.
- `GET /api/orders/:orderId` requires a `token` query parameter matching `orders.receipt_token`; an invalid token is rejected without confirming whether any other order exists. **This polling endpoint is required** — it is the only guaranteed path to accurate status if the webhook never arrives or fails to correlate.
- A payment redirect back to the frontend is UX only — it never marks an order paid.
- The Mayar webhook payload is a trigger only, never payment truth, and correlating it to an order is best-effort (see `docs/api-contract.md`); only a server-side call to Mayar's invoice detail endpoint, using the order's own stored `mayar_invoice_id`, can move an order to `paid`/`expired`/`failed`.
- Mayar invoices are created with a 30-minute expiry (requested `expiredAt`, UTC ISO 8601); the actual persisted expiry comes from Mayar's confirmed `data.expiredAt` (epoch ms) in the invoice-create response.

See `docs/api-contract.md` for the full endpoint-level contract.
