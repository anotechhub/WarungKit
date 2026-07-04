# Skill: testing-qa

## Purpose
Keep unit, API, webhook, and manual smoke test coverage consistent across WarungKit so regressions are caught before rehearsal.

## When to Use
- After implementing or modifying any business logic, API endpoint, or webhook handler.
- Before any deployment to the public demo environment.
- Before webinar rehearsal and immediately before the live session.

## Required Inputs
- The feature or endpoint being tested and its acceptance criteria.
- Access to a sandbox environment for manual smoke testing (Mayar sandbox, demo Supabase project).
- Existing test suite structure in `apps/api`, `apps/web`, and `packages/contracts`.

## Implementation Workflow
1. Write unit tests for isolated logic first: Zod schema validation, price resolution, idempotency helpers, order state transitions.
2. Write API integration tests for each endpoint: success path, validation failure, duplicate-request behavior.
3. Write webhook tests: duplicate event, invalid event, verification failure, successful paid transition.
4. Run the full local quality gate (lint, typecheck, test, build) before considering any task complete.
5. Perform a manual smoke test through the real browser flow against the sandbox environment for anything payment-related.
6. Before rehearsal or live demo, re-run the full regression pass, including a fresh end-to-end smoke test.

## Non-Negotiable Rules
- No feature is considered complete without a corresponding test for its critical path.
- Idempotency (checkout and webhook) must have an explicit test proving duplicates are no-ops.
- Manual smoke testing is mandatory for any payment-related change — automated tests alone are not sufficient.
- Regression pass (full test suite + smoke test) is mandatory before rehearsal and before the live session.

## Completion Checklist
- [ ] Unit tests cover schema validation, price resolution, idempotency, and state transitions.
- [ ] API tests cover success, validation failure, and duplicate-request cases.
- [ ] Webhook tests cover duplicate, invalid, verification-failure, and successful-paid cases.
- [ ] Manual smoke test performed end-to-end in the sandbox environment.
- [ ] Full regression pass completed before rehearsal/live demo.

## Expected Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Manual smoke test record (order code + observed status transition).
