import type { OrderStatus } from "@warungkit/contracts";

// Strict, exact-match mapping from a Mayar-reported invoice status string to
// our internal order_status. This is the ONLY place that decides whether an
// order becomes paid/expired/failed — never inferred from a redirect,
// webhook arrival, payment URL, transactionId presence, or any other
// signal. Unpaid/pending/unknown values conservatively stay at
// payment_created (no state change) rather than being guessed into a
// terminal state.
//
// Verified against Mayar's documented canonical GET /invoice/{id} response
// (P8-A.1 reconciliation): `data.status` is a plain string field such as
// "unpaid". The caller (mayar.service.ts) normalizes the provider status to
// lowercase before it reaches this function — only exact lowercase matches
// below are recognized.
const PAID_STATUS = "paid";
const EXPIRED_STATUS = "expired";
const FAILED_STATUS = "failed";

export function mapMayarStatusToOrderStatus(providerStatus: string | null | undefined): OrderStatus {
  if (providerStatus === PAID_STATUS) {
    return "paid";
  }

  if (providerStatus === EXPIRED_STATUS) {
    return "expired";
  }

  if (providerStatus === FAILED_STATUS) {
    return "failed";
  }

  // unpaid / pending / unknown / malformed — no state change.
  return "payment_created";
}
