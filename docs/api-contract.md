# WarungKit API Contract

**Status:** P8-A implemented and reconciled against verified Mayar API documentation (P8-A.1), unit/route tested. **Not deployed. Not registered with Mayar. No real Mayar invoice has ever been created.**

This document describes the current `apps/api` HTTP contract. Shared request/response shapes live in `packages/contracts/src` and are the source of truth for field names and types — this document explains behavior and security guarantees around them.

---

## Non-negotiable guarantees (apply to every endpoint below)

- The frontend never sends a price, amount, product name, order status, or a redirect URL. The browser only ever sends its *intent* (which product, who is buying).
- `products.price_idr` is the only trusted price source. The backend always re-resolves it from the database at checkout time.
- **A payment redirect back to the frontend (`/payment-status?orderId=...&token=...`) is UX only** — it is never treated as proof of payment. The frontend must poll `GET /api/orders/:orderId` (with the receipt token) to learn real status.
- **The Mayar webhook is a trigger only, never payment truth**, and webhook-to-order correlation is **best-effort** (see the webhook section below for the exact safe identifiers used). The only way an order transitions to `paid`, `expired`, or `failed` is a server-side call to Mayar's invoice detail endpoint, mapped through a strict exact-match rule (`apps/api/src/lib/mayar-status-mapper.ts`). Unrecognized/unpaid/pending statuses never move the order out of `payment_created`. **Invoice detail verification is the only source of payment truth in this system.**
- Because webhook correlation is best-effort and may fail to identify an order, `GET /api/orders/:orderId` polling with the receipt token **remains required** — it is not merely a convenience, it is the guaranteed path to a correct status regardless of whether the webhook ever arrives or correlates successfully.
- `orders.receipt_token` is required to read order status and is never returned in any status response.
- No response ever includes: Mayar API key, Supabase secret key, raw Mayar response body, raw webhook payload, or the customer's full name/raw email/raw phone.

---

## `GET /health`

Public. No database dependency. Returns `{ "status": "ok", "service": "warungkit-api" }`. No version/environment/infrastructure detail exposed.

## `GET /api/products`

Public, read-only. Returns only active products (`is_active = true`), sorted by `sort_order` ascending, with only the public `Product` fields (`id, slug, name, description, price_idr, product_type, sort_order`). Returns `503 CONFIGURATION_ERROR` if Supabase bindings are missing, without naming which variable is absent.

## `POST /api/checkout`

**Request** (`CheckoutRequest`, `packages/contracts/src/checkout.ts`):

```json
{
  "productId": "uuid",
  "customerName": "string, 2-120 chars, trimmed",
  "customerEmail": "string, normalized lowercase, valid email",
  "customerPhone": "string, 8-20 chars, trimmed",
  "idempotencyKey": "uuid"
}
```

Also requires header `X-Idempotency-Key`, which must **exactly match** `idempotencyKey` in the body — a mismatch or missing header is rejected as `422 VALIDATION_ERROR`.

**Flow:**
1. Validate the body with Zod (`checkoutRequestSchema`).
2. Resolve the product by `productId` from the database; reject inactive/unknown products as `404 PRODUCT_NOT_FOUND` (same error for both cases — does not reveal whether an inactive product exists).
3. Hash the stable checkout fields (`productId`, `customerName`, `customerEmail`, `customerPhone`) and check `checkout_idempotency`:
   - same key + same hash → return the previously stored response, no new order created.
   - same key + different hash → `409 CHECKOUT_CONFLICT`.
4. Create a `pending` order with a server-generated unique `order_code` and `receipt_token`. `amount_idr` is always `products.price_idr` — never a client-submitted value.
5. Call Mayar (`POST {MAYAR_API_BASE_URL}/invoice/create`) via the isolated adapter in `apps/api/src/services/mayar.service.ts`, with:
   - `redirectUrl`: `{FRONTEND_BASE_URL}/payment-status?orderId=<orderId>&token=<receiptToken>`
   - `expiredAt`: 30 minutes (UTC ISO 8601) from order creation, requested value
   - `items`: one line item, `rate` = the database-resolved `amount_idr`
   - `extraData`: `{ noCustomer: orderCode, idProd: productId, orderId }`
6. Validate the response against Mayar's documented canonical shape: `{ statusCode, messages, data: { id, transactionId?, link, expiredAt, extraData? } }`, where `data` is an object. A one-item array for `data` is accepted only as a narrow compatibility fallback (ambiguous doc text); every other shape (missing `id`/`link`, wrong types, a multi-item array) is rejected safely as `PAYMENT_PROVIDER_ERROR` with no raw body exposed.
7. `data.id` is persisted as `mayar_invoice_id`; `data.link` is persisted as `mayar_invoice_url`. `data.expiredAt` (documented as epoch milliseconds) is converted to an ISO-8601 timestamp and used as the authoritative `expires_at` — the value Mayar actually confirmed, not just the value requested.
8. On success: persist `mayar_invoice_id`, `mayar_invoice_url`, `expires_at`; transition the order to `payment_created`; persist the idempotency response; return `CheckoutResponse`.
9. On Mayar failure (network error, non-2xx, or an invalid/unexpected response shape): the order stays in its last safe state (no partial/inconsistent transition), and the client receives a generic `502 PAYMENT_PROVIDER_ERROR` — never the raw Mayar error body or stack trace.

**Response** (`CheckoutResponse`):

```json
{
  "orderId": "uuid",
  "orderCode": "string",
  "status": "payment_created",
  "paymentUrl": "https://...",
  "expiresAt": "ISO-8601",
  "receiptToken": "uuid"
}
```

## `GET /api/orders/:orderId?token=<receiptToken>`

Both `orderId` (path) and `token` (query) must be valid UUIDs, or the request is rejected as `422 VALIDATION_ERROR`.

- Unknown order → `404 ORDER_NOT_FOUND`.
- Token does not match `orders.receipt_token` → `403 ORDER_ACCESS_DENIED`.
- If the order is `payment_created` and has a `mayar_invoice_id`, the backend calls Mayar's invoice detail endpoint (`GET {MAYAR_API_BASE_URL}/invoice/<mayar_invoice_id>`), validated against Mayar's documented canonical shape `{ statusCode, messages, data: { id, amount?, status?, expiredAt?, paymentUrl?, paymentLinkId? } }` (object, with the same one-item-array compatibility fallback as invoice creation). `data.status` is normalized to lowercase, then mapped through the strict status mapper before persisting any change. If the verification call itself fails or the response shape is invalid, the order is left unchanged and no error detail is exposed.
- **GET /api/orders/:orderId with the receipt token is the required, secure path for checking payment status.** The redirect URL the customer is sent to is UX only; the frontend is expected to poll this endpoint (see `docs/PROJECT_CHECKLIST.md` — every 3 seconds, up to 45 seconds, then a manual "Cek Status Pembayaran" action) rather than trust anything in the URL.
- Redirect/query parameters other than `token` have no code path that can influence the result.

**Response** (`OrderStatusResponse`) — public fields only, customer contact masked, no receipt token:

```json
{
  "orderId": "uuid",
  "orderCode": "string",
  "product": { "name": "string", "slug": "string", "productType": "digital_product | service" },
  "amountIdr": 49000,
  "status": "pending | payment_created | paid | expired | failed | cancelled",
  "paidAt": "ISO-8601 | null",
  "expiresAt": "ISO-8601 | null",
  "paymentMethod": "string | null",
  "customer": { "maskedEmail": "bu**@example.com", "maskedPhone": "081***90" }
}
```

## `POST /api/webhooks/mayar`

**Mayar's webhook is a trigger, not payment truth — never HMAC/signature-verified in this implementation.** Mayar's documented webhook payload has three important characteristics confirmed against current documentation (P8-A.1 reconciliation):

- `data.id` on the webhook payload is documented as the **webhook/event ID**, not a Mayar invoice ID.
- `data.status` on the webhook payload is documented as a **boolean transaction field**, not the invoice payment status string.
- No documented webhook field is guaranteed to carry a Mayar invoice ID.

Because of this, **webhook-to-order correlation is best-effort only**, and the handler behaves as follows:

1. The raw request body is read as text and SHA-256 hashed. The raw body itself is **never stored**.
2. If a `payment_events` row already exists with the same `(provider, provider_event_hash)`, this is treated as a duplicate delivery and the handler returns `200 { "received": true }` immediately (idempotent no-op).
3. The JSON body is parsed defensively; if parsing fails, the payload is treated as empty rather than erroring.
4. Correlation to an order is attempted **only** via these safe identifiers, in order:
   - explicit root `invoiceId` or `paymentLinkId`
   - explicit `data.invoiceId` or `data.paymentLinkId`
   - `data.extraData.orderId`, only when it is a syntactically valid WarungKit order UUID
   - `data.extraData.noCustomer`, only when it matches an existing WarungKit `order_code`
   - **Root `id`, `data.id`, `productId`, customer email/mobile, and `amount` are never used for correlation.**
5. Only sanitized fields are persisted to `payment_events.sanitized_payload`: `candidateInvoiceId`, `candidateOrderId`, `candidateOrderCode`, `candidateEventId` (from `data.id`, safe for audit only), `candidateStatus` (from `data.status`, safe for audit only), `receivedAt`. No raw payload, no PII.
6. If no safe correlation candidate is extractable at all, the event is recorded as `ignored` and the handler returns `200` — **`GET /api/orders/:orderId` polling with the receipt token remains the secure fallback** for the customer/frontend to learn the real status.
7. If a candidate is present but resolves to no known order, the event is recorded as `rejected` and the handler returns `200`.
8. If a matching order is found, the backend uses **the order's own stored `mayar_invoice_id`** (not anything from the webhook payload) to call Mayar's invoice detail endpoint server-side, and maps the confirmed status through the same strict status mapper used by `GET /api/orders/:orderId`. **The payload's own `status`/`candidateStatus` field is never used to set order state directly** — only the verified server-side call result is.

Response is always minimal: `{ "received": true }`.

---

## Mayar status mapping

`apps/api/src/lib/mayar-status-mapper.ts` maps a Mayar-reported invoice `status` string to one of the six `order_status` enum values via a strict **exact-match** rule (verified against Mayar's documented `GET /invoice/{id}` example, where `status` is a plain string such as `"unpaid"`): exact `paid` → `paid`, exact `expired` → `expired`, exact `failed` → `failed`; `unpaid`, `pending`, any unrecognized string, or a missing/malformed status all conservatively stay at `payment_created` (no state change). The provider status string is normalized to lowercase in `mayar.service.ts` before reaching this mapper. This mapping is never inferred from `transactionId` presence, `paymentUrl` presence, a redirect, a webhook's mere arrival, or any other signal — only from the mapped result of a verified, server-side Mayar invoice-detail API response. Invoice detail verification (this mapping) is the **only** source of payment truth in the entire system.

## Environment variables

| Variable | Type | Purpose |
|---|---|---|
| `ENVIRONMENT` | config | Runtime environment label |
| `ALLOWED_ORIGINS` | config | CORS allowlist (comma-separated) |
| `FRONTEND_BASE_URL` | config (not a secret) | Used only to construct the Mayar invoice `redirectUrl` server-side |
| `SUPABASE_URL` | config | Supabase project URL |
| `SUPABASE_SECRET_KEY` | secret | Backend-only Supabase service credential |
| `MAYAR_API_KEY` | secret | Backend-only Mayar API credential |
| `MAYAR_API_BASE_URL` | config | Mayar API base URL |

## Logging

Only `requestId`, HTTP method/path/status, elapsed time, `orderId`, `orderCode`, provider invoice id, and payment-event processing result are ever logged (`apps/api/src/lib/logger.ts`). Never logged: customer email/phone, receipt token, API keys, raw webhook payload, or the Mayar `Authorization` header.
