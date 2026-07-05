import { describe, expect, it, vi } from "vitest";
import { createWebhooksService } from "../src/services/webhooks.service";
import type { OrdersRepository, OrderRecord } from "../src/repositories/orders.repository";
import type { PaymentEventsRepository, PaymentEventRecord } from "../src/repositories/payment-events.repository";
import type { MayarService } from "../src/services/mayar.service";

const order: OrderRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  order_code: "WK-TEST-ORDER",
  product_id: "11111111-1111-4111-8111-111111111111",
  customer_name: "Budi Santoso",
  customer_email: "budi@example.com",
  customer_phone: "081234567890",
  amount_idr: 49000,
  status: "payment_created",
  mayar_invoice_id: "mayar-invoice-1",
  mayar_invoice_url: "https://mayar.id/pay/abc",
  receipt_token: "33333333-3333-4333-8333-333333333333",
  paid_at: null,
  expires_at: "2026-01-01T00:30:00.000Z",
  metadata: {},
};

function buildDeps(overrides: {
  existingEvent?: PaymentEventRecord | null;
  findByMayarInvoiceId?: OrderRecord | null;
  findById?: OrderRecord | null;
  findByOrderCode?: OrderRecord | null;
  providerStatus?: string | null;
} = {}) {
  const updateStatus = vi.fn(async () => {});
  const ordersRepository: OrdersRepository = {
    createPendingOrder: vi.fn(async () => order),
    findById: vi.fn(async () => (overrides.findById === undefined ? null : overrides.findById)),
    findByMayarInvoiceId: vi.fn(async () =>
      overrides.findByMayarInvoiceId === undefined ? order : overrides.findByMayarInvoiceId,
    ),
    findByOrderCode: vi.fn(async () => (overrides.findByOrderCode === undefined ? null : overrides.findByOrderCode)),
    markPaymentCreated: vi.fn(async () => {}),
    updateStatus,
  };

  const createEvent = vi.fn(
    async (input: Parameters<PaymentEventsRepository["create"]>[0]): Promise<PaymentEventRecord> => ({
      id: "event-1",
      provider: "mayar",
      provider_event_id: input.providerEventId,
      provider_event_hash: input.providerEventHash,
      order_id: input.orderId,
      sanitized_payload: input.sanitizedPayload,
      processing_status: input.processingStatus,
      processed_at: null,
      error_code: input.errorCode ?? null,
    }),
  );
  const markProcessed = vi.fn(async () => {});
  const paymentEventsRepository: PaymentEventsRepository = {
    findByProviderHash: vi.fn(async () => overrides.existingEvent ?? null),
    create: createEvent,
    markProcessed,
  };

  const mayarService: MayarService = {
    createInvoice: vi.fn(async () => ({
      invoiceId: "mayar-invoice-1",
      paymentUrl: "https://mayar.id/pay/abc",
      expiresAt: "2026-01-01T00:30:00.000Z",
    })),
    getInvoiceDetail: vi.fn(async () => ({
      invoiceId: "mayar-invoice-1",
      providerStatus: overrides.providerStatus ?? null,
    })),
  };

  return {
    ordersRepository,
    paymentEventsRepository,
    mayarService,
    requestId: "test-request-id",
    createEvent,
    markProcessed,
    updateStatus,
  };
}

describe("webhooks service", () => {
  it("treats a duplicate raw body (same hash) as an idempotent no-op, returning 200-safe", async () => {
    const deps = buildDeps({
      existingEvent: {
        id: "event-1",
        provider: "mayar",
        provider_event_id: null,
        provider_event_hash: "any-hash",
        order_id: order.id,
        sanitized_payload: {},
        processing_status: "verified",
        processed_at: "2026-01-01T00:00:00.000Z",
        error_code: null,
      },
    });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ invoiceId: "mayar-invoice-1" }));

    expect(result).toEqual({ received: true });
    expect(deps.createEvent).not.toHaveBeenCalled();
    expect(deps.updateStatus).not.toHaveBeenCalled();
  });

  it("never marks an order paid from the payload's own status field alone", async () => {
    // Payload claims a truthy/paid-looking status directly, but Mayar's
    // verified invoice detail says unpaid.
    const deps = buildDeps({ providerStatus: "unpaid" });
    const service = createWebhooksService(deps);

    await service.handleWebhook(JSON.stringify({ invoiceId: "mayar-invoice-1", data: { status: true } }));

    expect(deps.updateStatus).not.toHaveBeenCalled();
  });

  it("never treats a webhook payload with data.id alone as an invoice ID lookup", async () => {
    // Per Mayar webhook docs: data.id is the webhook/event ID, not a Mayar
    // invoice ID. A payload containing only data.id must not trigger
    // findByMayarInvoiceId with that value, and must not resolve an order.
    const deps = buildDeps({ findByMayarInvoiceId: null });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ data: { id: "webhook-event-id-not-an-invoice" } }));

    expect(result).toEqual({ received: true });
    expect(deps.ordersRepository.findByMayarInvoiceId).not.toHaveBeenCalled();
    expect(deps.mayarService.getInvoiceDetail).not.toHaveBeenCalled();
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "ignored" }));
  });

  it("never treats root id alone as an invoice ID lookup", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ id: "root-id-not-an-invoice" }));

    expect(result).toEqual({ received: true });
    expect(deps.ordersRepository.findByMayarInvoiceId).not.toHaveBeenCalled();
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "ignored" }));
  });

  it("correlates via an explicit invoiceId field and triggers verified lookup", async () => {
    const deps = buildDeps({ providerStatus: "paid" });
    const service = createWebhooksService(deps);

    await service.handleWebhook(JSON.stringify({ invoiceId: "mayar-invoice-1" }));

    expect(deps.ordersRepository.findByMayarInvoiceId).toHaveBeenCalledWith("mayar-invoice-1");
    expect(deps.mayarService.getInvoiceDetail).toHaveBeenCalledWith(order.mayar_invoice_id);
    expect(deps.updateStatus).toHaveBeenCalledWith(order.id, expect.objectContaining({ status: "paid" }));
    expect(deps.markProcessed).toHaveBeenCalledWith("event-1", expect.objectContaining({ processingStatus: "verified" }));
  });

  it("correlates via data.extraData.orderId only when it is a valid WarungKit order UUID, and triggers verified lookup", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null, findById: order, providerStatus: "paid" });
    const service = createWebhooksService(deps);

    await service.handleWebhook(JSON.stringify({ data: { extraData: { orderId: order.id } } }));

    expect(deps.ordersRepository.findById).toHaveBeenCalledWith(order.id);
    expect(deps.mayarService.getInvoiceDetail).toHaveBeenCalledWith(order.mayar_invoice_id);
    expect(deps.updateStatus).toHaveBeenCalledWith(order.id, expect.objectContaining({ status: "paid" }));
  });

  it("does not treat a non-UUID data.extraData.orderId as a valid correlation candidate", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null, findById: null });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ data: { extraData: { orderId: "not-a-uuid" } } }));

    expect(result).toEqual({ received: true });
    expect(deps.ordersRepository.findById).not.toHaveBeenCalled();
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "ignored" }));
  });

  it("correlates via data.extraData.noCustomer matching an existing order_code", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null, findByOrderCode: order, providerStatus: "paid" });
    const service = createWebhooksService(deps);

    await service.handleWebhook(JSON.stringify({ data: { extraData: { noCustomer: order.order_code } } }));

    expect(deps.ordersRepository.findByOrderCode).toHaveBeenCalledWith(order.order_code);
    expect(deps.mayarService.getInvoiceDetail).toHaveBeenCalledWith(order.mayar_invoice_id);
    expect(deps.updateStatus).toHaveBeenCalledWith(order.id, expect.objectContaining({ status: "paid" }));
  });

  it("safely ignores a payload with no extractable correlation candidate", async () => {
    const deps = buildDeps();
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ unrelated: "field" }));

    expect(result).toEqual({ received: true });
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "ignored" }));
    expect(deps.mayarService.getInvoiceDetail).not.toHaveBeenCalled();
  });

  it("safely ignores an uncorrelated payload (candidate present but no matching order) — relies on GET /api/orders polling", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(JSON.stringify({ invoiceId: "unknown-invoice-id" }));

    expect(result).toEqual({ received: true });
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "rejected" }));
    expect(deps.mayarService.getInvoiceDetail).not.toHaveBeenCalled();
  });

  it("never uses productId, customer email, customer mobile, or amount for correlation", async () => {
    const deps = buildDeps({ findByMayarInvoiceId: null });
    const service = createWebhooksService(deps);

    const result = await service.handleWebhook(
      JSON.stringify({
        productId: "11111111-1111-4111-8111-111111111111",
        email: "budi@example.com",
        mobile: "081234567890",
        amount: 49000,
      }),
    );

    expect(result).toEqual({ received: true });
    expect(deps.ordersRepository.findByMayarInvoiceId).not.toHaveBeenCalled();
    expect(deps.ordersRepository.findById).not.toHaveBeenCalled();
    expect(deps.ordersRepository.findByOrderCode).not.toHaveBeenCalled();
    expect(deps.createEvent).toHaveBeenCalledWith(expect.objectContaining({ processingStatus: "ignored" }));
  });

  it("never persists or logs the raw payload — only sanitized derived fields", async () => {
    const deps = buildDeps({ providerStatus: "paid" });
    const service = createWebhooksService(deps);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const secretLookingPayload = JSON.stringify({
      invoiceId: "mayar-invoice-1",
      customerSecretToken: "sk_live_should_never_appear",
    });
    await service.handleWebhook(secretLookingPayload);

    const createdCallArg = deps.createEvent.mock.calls[0]?.[0];
    expect(JSON.stringify(createdCallArg)).not.toContain("sk_live_should_never_appear");

    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("sk_live_should_never_appear");
    }

    consoleSpy.mockRestore();
  });
});
