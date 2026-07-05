import { z } from "zod";
import { sha256Hex } from "../lib/hash";
import { logPaymentEvent } from "../lib/logger";
import { mapMayarStatusToOrderStatus } from "../lib/mayar-status-mapper";
import type { OrdersRepository, OrderRecord } from "../repositories/orders.repository";
import type { PaymentEventsRepository } from "../repositories/payment-events.repository";
import type { MayarService } from "./mayar.service";

export interface WebhooksServiceDeps {
  ordersRepository: OrdersRepository;
  paymentEventsRepository: PaymentEventsRepository;
  mayarService: MayarService;
  requestId: string;
}

const uuidSchema = z.string().uuid();

// Mayar's webhook docs (verified, P8-A.1 reconciliation) describe:
//   - event type such as `payment.received`
//   - `data.id` documented as the webhook/event ID — NOT a Mayar invoice ID
//   - `data.status` documented as a boolean transaction field — NOT payment
//     truth
// None of the documented webhook fields guarantee a Mayar invoice ID is
// present. Therefore root `id` / `data.id` must never be treated as an
// invoice ID or used to correlate to an order. Correlation is best-effort
// and only trusted from these explicit identifiers:
//   - root `invoiceId` / `paymentLinkId`
//   - `data.invoiceId` / `data.paymentLinkId`
//   - `data.extraData.orderId`, only when it is a valid WarungKit order UUID
//   - `data.extraData.noCustomer`, only when it matches an existing
//     WarungKit order_code (checked by the caller against the database)
// productId, customer email/mobile, amount, root `id`, and `data.id` are
// never used for correlation.
interface CorrelationCandidate {
  kind: "invoiceId" | "orderId" | "orderCode";
  value: string;
}

function extractCorrelationCandidates(payload: unknown): CorrelationCandidate[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const data = typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : null;
  const extraData =
    data && typeof data.extraData === "object" && data.extraData !== null
      ? (data.extraData as Record<string, unknown>)
      : null;

  const candidates: CorrelationCandidate[] = [];

  const invoiceIdFields = [root.invoiceId, root.paymentLinkId, data?.invoiceId, data?.paymentLinkId];
  for (const candidate of invoiceIdFields) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      candidates.push({ kind: "invoiceId", value: candidate.trim() });
    }
  }

  const extraOrderId = extraData?.orderId;
  if (typeof extraOrderId === "string" && uuidSchema.safeParse(extraOrderId.trim()).success) {
    candidates.push({ kind: "orderId", value: extraOrderId.trim() });
  }

  const extraNoCustomer = extraData?.noCustomer;
  if (typeof extraNoCustomer === "string" && extraNoCustomer.trim().length > 0) {
    candidates.push({ kind: "orderCode", value: extraNoCustomer.trim() });
  }

  return candidates;
}

function extractCandidateEventId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const data = typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : null;
  // data.id is documented as the webhook/event ID — safe to record for
  // audit/dedup purposes, but never used as an invoice ID for correlation.
  const candidate = root.eventId ?? root.event_id ?? data?.id;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

function extractCandidateStatus(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const data = typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : null;
  // data.status is documented as a boolean transaction field on the
  // webhook payload — recorded only for audit purposes, never trusted as
  // payment truth and never fed into the status mapper.
  const candidate = data?.status ?? root.status;
  if (typeof candidate === "string") {
    return candidate.trim().length > 0 ? candidate.trim() : null;
  }
  if (typeof candidate === "boolean") {
    return String(candidate);
  }
  return null;
}

export function createWebhooksService(deps: WebhooksServiceDeps) {
  const { ordersRepository, paymentEventsRepository, mayarService, requestId } = deps;

  async function resolveOrderFromCandidates(candidates: CorrelationCandidate[]): Promise<OrderRecord | null> {
    for (const candidate of candidates) {
      if (candidate.kind === "invoiceId") {
        const order = await ordersRepository.findByMayarInvoiceId(candidate.value);
        if (order) return order;
      } else if (candidate.kind === "orderId") {
        const order = await ordersRepository.findById(candidate.value);
        if (order) return order;
      } else if (candidate.kind === "orderCode") {
        const order = await ordersRepository.findByOrderCode(candidate.value);
        if (order) return order;
      }
    }
    return null;
  }

  return {
    // Receives the raw request body text (never a pre-parsed object) so we
    // can hash exactly what was sent, without ever persisting the raw
    // string itself.
    async handleWebhook(rawBody: string): Promise<{ received: true }> {
      const bodyHash = await sha256Hex(rawBody);

      const existing = await paymentEventsRepository.findByProviderHash(bodyHash);
      if (existing) {
        // Duplicate delivery of the same raw body — idempotent no-op, safe 200.
        logPaymentEvent({
          requestId,
          event: "webhook_duplicate",
          processingResult: "duplicate",
        });
        return { received: true };
      }

      let payload: unknown = null;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // Malformed JSON — payload stays null; extraction helpers below
        // safely return null/empty for all candidate fields in that case.
      }

      const candidates = extractCorrelationCandidates(payload);
      const candidateEventId = extractCandidateEventId(payload);
      const candidateStatus = extractCandidateStatus(payload);

      // Only sanitized, minimal fields are ever stored — never the raw body.
      const sanitizedPayload = {
        candidateInvoiceId: candidates.find((c) => c.kind === "invoiceId")?.value ?? null,
        candidateOrderId: candidates.find((c) => c.kind === "orderId")?.value ?? null,
        candidateOrderCode: candidates.find((c) => c.kind === "orderCode")?.value ?? null,
        candidateEventId,
        candidateStatus,
        receivedAt: new Date().toISOString(),
      };

      if (candidates.length === 0) {
        // No safe correlation identifier at all — GET /api/orders/:orderId
        // polling remains the secure fallback for the customer/frontend.
        await paymentEventsRepository.create({
          providerEventId: candidateEventId,
          providerEventHash: bodyHash,
          orderId: null,
          sanitizedPayload,
          processingStatus: "ignored",
        });
        logPaymentEvent({
          requestId,
          event: "webhook_no_correlation_candidate",
          processingResult: "ignored",
        });
        return { received: true };
      }

      const order = await resolveOrderFromCandidates(candidates);
      if (!order) {
        await paymentEventsRepository.create({
          providerEventId: candidateEventId,
          providerEventHash: bodyHash,
          orderId: null,
          sanitizedPayload,
          processingStatus: "rejected",
          errorCode: "ORDER_NOT_FOUND_FOR_CORRELATION",
        });
        logPaymentEvent({
          requestId,
          event: "webhook_order_not_found",
          processingResult: "rejected",
        });
        return { received: true };
      }

      if (!order.mayar_invoice_id) {
        // Correlated to an order, but that order has no invoice id yet — we
        // cannot verify anything server-side. Record and rely on polling.
        await paymentEventsRepository.create({
          providerEventId: candidateEventId,
          providerEventHash: bodyHash,
          orderId: order.id,
          sanitizedPayload,
          processingStatus: "ignored",
        });
        logPaymentEvent({
          requestId,
          event: "webhook_order_missing_invoice_id",
          orderId: order.id,
          orderCode: order.order_code,
          processingResult: "ignored",
        });
        return { received: true };
      }

      const paymentEvent = await paymentEventsRepository.create({
        providerEventId: candidateEventId,
        providerEventHash: bodyHash,
        orderId: order.id,
        sanitizedPayload,
        processingStatus: "received",
      });

      // The webhook payload is only a trigger to re-check status — the
      // actual order state transition is decided exclusively by this
      // server-side verification call against the order's own stored
      // mayar_invoice_id, never by candidateStatus or any correlated field.
      try {
        const detail = await mayarService.getInvoiceDetail(order.mayar_invoice_id);
        const mappedStatus = mapMayarStatusToOrderStatus(detail.providerStatus);

        if (mappedStatus !== "payment_created" && order.status !== mappedStatus) {
          await ordersRepository.updateStatus(order.id, {
            status: mappedStatus,
            paidAt: mappedStatus === "paid" ? new Date().toISOString() : undefined,
          });
        }

        await paymentEventsRepository.markProcessed(paymentEvent.id, { processingStatus: "verified" });
        logPaymentEvent({
          requestId,
          event: "webhook_verified",
          orderId: order.id,
          orderCode: order.order_code,
          providerInvoiceId: order.mayar_invoice_id,
          processingResult: mappedStatus,
        });
      } catch {
        await paymentEventsRepository.markProcessed(paymentEvent.id, {
          processingStatus: "failed",
          errorCode: "MAYAR_VERIFICATION_FAILED",
        });
        logPaymentEvent({
          requestId,
          event: "webhook_verification_failed",
          orderId: order.id,
          orderCode: order.order_code,
          providerInvoiceId: order.mayar_invoice_id,
          processingResult: "failed",
        });
      }

      return { received: true };
    },
  };
}

export type WebhooksService = ReturnType<typeof createWebhooksService>;
