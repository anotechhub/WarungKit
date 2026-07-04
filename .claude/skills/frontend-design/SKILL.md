# Skill: frontend-design

## Purpose
Build responsive, accessible, on-brand UI for the WarungKit storefront (`apps/web`) without hardcoding product or pricing data.

## When to Use
- Creating or modifying any component, page, or layout in `apps/web`.
- Implementing catalog, checkout form, or payment status pages.
- Applying or adjusting the WarungKit visual direction.

## Required Inputs
- Approved brand direction: charcoal / near-black, soft cream, muted terracotta, warm orange accents.
- Assets from `assets/brand/` (logo) and `assets/ui-reference/` (Stitch UI direction), when available.
- Shared Zod contracts from `packages/contracts` for form/data shapes.
- List of available backend endpoints (do not invent endpoints).

## Implementation Workflow
1. Confirm which endpoint(s) supply the data the UI needs — never hardcode product names, prices, or descriptions.
2. Check `assets/brand/` and `assets/ui-reference/` for the current approved look before styling anything.
3. Build components with accessible markup first (labels, roles, focus order), then apply visual styling.
4. Use Tailwind utility classes consistent with the brand palette — no ad-hoc color values that drift from it.
5. Verify responsive behavior at mobile and desktop breakpoints.

## Non-Negotiable Rules
- No product, price, or catalog data hardcoded in components — always sourced from the backend API.
- No generic loud SaaS gradients or templated AI-default aesthetics.
- Use only the approved palette (charcoal, soft cream, muted terracotta, warm orange) — do not invent a new direction without approval.
- Never store or display Mayar keys, Supabase service role keys, or full sensitive order data in client state.
- Form labels, visible error messages, and keyboard focus states are mandatory on every interactive element.
- A payment status page must never treat a redirect query parameter as proof of payment — status must come from the backend.

## Completion Checklist
- [ ] Data displayed comes from a real API call, not hardcoded fixtures.
- [ ] Component is keyboard-navigable with visible focus states.
- [ ] Form fields have associated labels and accessible error messaging.
- [ ] Styling matches the approved brand palette and reference UI.
- [ ] No secrets, tokens, or sensitive order fields appear in client-rendered state or dev tools.
- [ ] Responsive on mobile and desktop viewport widths.

## Expected Verification
- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web build`
- Manual check: inspect browser network tab to confirm no secret values are present in requests/responses.
