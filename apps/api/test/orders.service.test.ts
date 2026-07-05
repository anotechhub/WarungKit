import { describe, expect, it, vi } from "vitest";
import { createOrdersService } from "../src/services/orders.service";
import type { OrdersRepository, OrderRecord } from "../src/repositories/orders.repository";
import type { ProductsRepository } from "../src/repositories/products.repository";
import type { MayarService } from "../src/services/mayar.service";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "template-konten-instagram-umkm",
  name: "Template Konten Instagram UMKM",
  description: "Template konten Instagram siap edit.",
  price_idr: 49000,
  product_type: "digital_product" as const,
  sort_order: 1,
};

function buildOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    order_code: "WK-TEST-ORDER",
    product_id: product.id,
    customer_name: "Budi Santoso",
    customer_email: "budi@example.com",
    customer_phone: "081234567890",
    amount_idr: product.price_idr,
    status: "payment_created",
    mayar_invoice_id: "mayar-invoice-1",
    mayar_invoice_url: "https://mayar.id/pay/abc",
    receipt_token: "33333333-3333-4333-8333-333333333333",
    paid_at: null,
    expires_at: "2026-01-01T00:30:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function buildDeps(order: OrderRecord, providerStatus: string | null) {
  const updateStatus = vi.fn(async () => {});
  const ordersRepository: OrdersRepository = {
    createPendingOrder: vi.fn(async () => order),
    findById: vi.fn(async () => order),
    findByMayarInvoiceId: vi.fn(async () => order),
    findByOrderCode: vi.fn(async () => order),
    markPaymentCreated: vi.fn(async () => {}),
    updateStatus,
  };

  const productsRepository: ProductsRepository = {
    listActiveProducts: vi.fn(async () => []),
    findActiveProductById: vi.fn(async () => product),
  };

  const mayarService: MayarService = {
    createInvoice: vi.fn(async () => ({
      invoiceId: "mayar-invoice-1",
      paymentUrl: "https://mayar.id/pay/abc",
      expiresAt: "2026-01-01T00:30:00.000Z",
    })),
    getInvoiceDetail: vi.fn(async () => ({ invoiceId: "mayar-invoice-1", providerStatus })),
  };

  return { ordersRepository, productsRepository, mayarService, requestId: "test-request-id", updateStatus };
}

describe("orders service — getOrderStatus", () => {
  it("rejects an invalid/mismatched receipt token", async () => {
    const order = buildOrder();
    const deps = buildDeps(order, null);
    const service = createOrdersService(deps);

    await expect(service.getOrderStatus(order.id, "wrong-token-not-a-real-uuid")).rejects.toMatchObject({
      code: "ORDER_ACCESS_DENIED",
    });
  });

  it("rejects an unknown order id", async () => {
    const order = buildOrder();
    const deps = buildDeps(order, null);
    (deps.ordersRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const service = createOrdersService(deps);

    await expect(service.getOrderStatus("99999999-9999-4999-8999-999999999999", order.receipt_token)).rejects.toMatchObject(
      { code: "ORDER_NOT_FOUND" },
    );
  });

  it("returns masked contact data with a valid token, never the raw email/phone or receipt token", async () => {
    const order = buildOrder({ status: "pending", mayar_invoice_id: null });
    const deps = buildDeps(order, null);
    const service = createOrdersService(deps);

    const result = await service.getOrderStatus(order.id, order.receipt_token);

    expect(result.customer.maskedEmail).not.toBe(order.customer_email);
    expect(result.customer.maskedPhone).not.toBe(order.customer_phone);
    expect(JSON.stringify(result)).not.toContain(order.receipt_token);
    expect(JSON.stringify(result)).not.toContain(order.customer_email);
  });

  it("does not transition to paid when Mayar reports a pending/unpaid status", async () => {
    const order = buildOrder();
    const deps = buildDeps(order, "unpaid");
    const service = createOrdersService(deps);

    const result = await service.getOrderStatus(order.id, order.receipt_token);

    expect(result.status).toBe("payment_created");
    expect(deps.updateStatus).not.toHaveBeenCalled();
  });

  it("transitions to paid only after Mayar confirms a paid status", async () => {
    const order = buildOrder();
    const deps = buildDeps(order, "paid");
    const service = createOrdersService(deps);

    const result = await service.getOrderStatus(order.id, order.receipt_token);

    expect(result.status).toBe("paid");
    expect(deps.updateStatus).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({ status: "paid" }),
    );
  });

  it("transitions to expired only after Mayar confirms expiry", async () => {
    const order = buildOrder();
    const deps = buildDeps(order, "expired");
    const service = createOrdersService(deps);

    const result = await service.getOrderStatus(order.id, order.receipt_token);

    expect(result.status).toBe("expired");
    expect(deps.updateStatus).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({ status: "expired" }),
    );
  });

  it("ignores any redirect-style query parameters — only orderId and token influence the result", async () => {
    // This service function's signature only accepts orderId and token; it
    // has no parameter for a "status" or "paid" redirect flag at all, so
    // there is no code path by which a redirect parameter could influence
    // the outcome. This test documents that guarantee structurally.
    const order = buildOrder({ status: "pending", mayar_invoice_id: null });
    const deps = buildDeps(order, null);
    const service = createOrdersService(deps);

    const result = await service.getOrderStatus(order.id, order.receipt_token);

    expect(result.status).toBe("pending");
  });
});
