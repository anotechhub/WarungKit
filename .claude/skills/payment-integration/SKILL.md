# Skill: payment-integration

## Purpose
Build and maintain the Mayar payment integration — invoice creation, redirect handling, and webhook verification — entirely on the backend.

## When to Use
- Creating or modifying the Mayar service/adapter layer in `apps/api`.
- Implementing `POST /api/checkout` payment-creation logic.
- Implementing `POST /api/webhooks/mayar` and order status transitions.

## Required Inputs
- Current Mayar API documentation (do not assume BRD-described fields are exact — verify against live docs).
- `MAYAR_API_KEY` and `MAYAR_API_BASE_URL` available only as backend secrets/config.
- `orders`, `payment_events`, and `checkout_idempotency` table schemas.
- Order status lifecycle and allowed transitions.

## Implementation Workflow
1. Isolate all Mayar API calls inside a single adapter/service module — never call Mayar from routes directly, and never from the frontend.
2. Implement checkout: validate input → resolve product/price from DB → create `pending` order → call Mayar to create invoice → store invoice id/url → return payment URL.
3. Implement idempotency: require an idempotency key on checkout; reuse the stored response for a repeated key instead of creating a new order.
4. Implement webhook: receive event → compute/check event hash or id against `payment_events` → if already processed, no-op safely → otherwise verify payment status server-side against Mayar → transition order status accordingly.
5. Never trust the webhook payload alone — always confirm status via a server-side call to Mayar before marking an order `paid`.
6. Handle expired/failed/cancelled paths explicitly, not just the success path.

## Non-Negotiable Rules
- The frontend never calls Mayar directly and never receives the Mayar API key.
- Checkout is idempotent — same idempotency key never creates a second order.
- Webhook processing is idempotent — the same provider event never applies a state change twice.
- Order status only becomes `paid` after server-side verification against Mayar — a redirect or webhook payload alone is never sufficient proof.
- Prices always come from the database, never from the client request.
- Payment event payloads are sanitized before storage — no unnecessary raw sensitive data retained.

## Completion Checklist
- [ ] Mayar calls isolated in one adapter module, not scattered across routes.
- [ ] Checkout idempotency key enforced and tested.
- [ ] Webhook event dedup (hash/id) implemented and tested.
- [ ] Order transitions only to `paid` after server-side verification.
- [ ] Expired/failed/cancelled scenarios handled explicitly.
- [ ] No Mayar key or secret present in frontend code, bundle, or logs.

## Expected Verification
- `pnpm --filter api test` — includes webhook duplicate-event and invalid-event test cases.
- Manual sandbox test: full checkout → Mayar sandbox payment → webhook → order reaches `paid`.
- Manual test: replaying the same webhook event a second time produces no duplicate side effect.
