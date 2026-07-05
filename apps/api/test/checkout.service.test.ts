import { describe, expect, it, vi } from "vitest";
import { createCheckoutService } from "../src/services/checkout.service";
import { ApiError } from "../src/lib/api-error";
import type { ProductsRepository } from "../src/repositories/products.repository";
import type { OrdersRepository, OrderRecord } from "../src/repositories/orders.repository";
import type { CheckoutIdempotencyRepository, IdempotencyRecord } from "../src/repositories/checkout-idempotency.repository";
import type { MayarService } from "../src/services/mayar.service";
import type { CheckoutRequest } from "@warungkit/contracts";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "template-konten-instagram-umkm",
  name: "Template Konten Instagram UMKM",
  description: "Template konten Instagram siap edit.",
  price_idr: 49000,
  product_type: "digital_product" as const,
  sort_order: 1,
};

const baseRequest: CheckoutRequest = {
  productId: product.id,
  customerName: "Budi Santoso",
  customerEmail: "budi@example.com",
  customerPhone: "081234567890",
  idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

function buildDeps(overrides: {
  product?: typeof product | null;
  existingIdempotency?: IdempotencyRecord | null;
  mayarCreateInvoice?: MayarService["createInvoice"];
} = {}) {
  const createdOrder: OrderRecord = {
    id: "22222222-2222-4222-8222-222222222222",
    order_code: "WK-TEST-ORDER",
    product_id: product.id,
    customer_name: baseRequest.customerName,
    customer_email: baseRequest.customerEmail,
    customer_phone: baseRequest.customerPhone,
    amount_idr: product.price_idr,
    status: "pending",
    mayar_invoice_id: null,
    mayar_invoice_url: null,
    receipt_token: "33333333-3333-4333-8333-333333333333",
    paid_at: null,
    expires_at: null,
    metadata: {},
  };

  const productsRepository: ProductsRepository = {
    listActiveProducts: vi.fn(async () => []),
    findActiveProductById: vi.fn(async () => (overrides.product === undefined ? product : overrides.product)),
  };

  const markPaymentCreated = vi.fn(async () => {});
  const ordersRepository: OrdersRepository = {
    createPendingOrder: vi.fn(async () => createdOrder),
    findById: vi.fn(async () => createdOrder),
    findByMayarInvoiceId: vi.fn(async () => null),
    findByOrderCode: vi.fn(async () => null),
    markPaymentCreated,
    updateStatus: vi.fn(async () => {}),
  };

  const idempotencyRepository: CheckoutIdempotencyRepository = {
    findByKey: vi.fn(async () => overrides.existingIdempotency ?? null),
    create: vi.fn(async () => {}),
  };

  const mayarService: MayarService = {
    createInvoice:
      overrides.mayarCreateInvoice ??
      vi.fn(async () => ({
        invoiceId: "mayar-invoice-1",
        paymentUrl: "https://mayar.id/pay/abc",
        expiresAt: "2026-01-01T00:30:00.000Z",
      })),
    getInvoiceDetail: vi.fn(async () => ({ invoiceId: "mayar-invoice-1", providerStatus: null })),
  };

  return {
    productsRepository,
    ordersRepository,
    idempotencyRepository,
    mayarService,
    frontendBaseUrl: "https://warungkit-demo.pages.dev",
    requestId: "test-request-id",
    createdOrder,
  };
}

describe("checkout service", () => {
  it("creates an order and invoice for a valid request, returning CheckoutResponse", async () => {
    const deps = buildDeps();
    const service = createCheckoutService(deps);

    const result = await service.checkout(baseRequest, baseRequest.idempotencyKey);

    expect(result.status).toBe("payment_created");
    expect(result.orderId).toBe(deps.createdOrder.id);
    expect(result.paymentUrl).toBe("https://mayar.id/pay/abc");
    expect(deps.ordersRepository.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountIdr: product.price_idr }),
    );
  });

  it("never accepts a browser-submitted price — CheckoutRequest has no price field to submit", async () => {
    // Structural guarantee: a request literal with a `price` field does not
    // satisfy CheckoutRequest at the type level. At runtime, the amount
    // passed to createPendingOrder always comes from the resolved product,
    // never from the request object.
    const deps = buildDeps();
    const service = createCheckoutService(deps);

    const maliciousRequest = { ...baseRequest, price_idr: 1 } as CheckoutRequest;
    await service.checkout(maliciousRequest, maliciousRequest.idempotencyKey);

    expect(deps.ordersRepository.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountIdr: product.price_idr }),
    );
  });

  it("rejects when the product is inactive or not found", async () => {
    const deps = buildDeps({ product: null });
    const service = createCheckoutService(deps);

    await expect(service.checkout(baseRequest, baseRequest.idempotencyKey)).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
    });
  });

  it("rejects when the X-Idempotency-Key header is missing", async () => {
    const deps = buildDeps();
    const service = createCheckoutService(deps);

    await expect(service.checkout(baseRequest, undefined)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects when the X-Idempotency-Key header does not match the body idempotencyKey", async () => {
    const deps = buildDeps();
    const service = createCheckoutService(deps);

    await expect(
      service.checkout(baseRequest, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns the same response for a repeated idempotency key with the same request hash", async () => {
    const storedResponse = {
      orderId: "22222222-2222-4222-8222-222222222222",
      orderCode: "WK-TEST-ORDER",
      status: "payment_created" as const,
      paymentUrl: "https://mayar.id/pay/abc",
      expiresAt: "2026-01-01T00:30:00.000Z",
      receiptToken: "33333333-3333-4333-8333-333333333333",
    };

    const deps = buildDeps({
      existingIdempotency: {
        id: "idem-1",
        idempotency_key: baseRequest.idempotencyKey,
        request_hash: "will-be-overridden",
        order_id: storedResponse.orderId,
        response_payload: storedResponse as unknown as Record<string, unknown>,
        expires_at: storedResponse.expiresAt,
      },
    });

    // Force the stored hash to match what the service will compute for
    // baseRequest, by computing it the same way the service does.
    const { hashCheckoutRequest } = await import("../src/lib/hash");
    const matchingHash = await hashCheckoutRequest({
      productId: baseRequest.productId,
      customerName: baseRequest.customerName,
      customerEmail: baseRequest.customerEmail,
      customerPhone: baseRequest.customerPhone,
    });
    (deps.idempotencyRepository.findByKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "idem-1",
      idempotency_key: baseRequest.idempotencyKey,
      request_hash: matchingHash,
      order_id: storedResponse.orderId,
      response_payload: storedResponse as unknown as Record<string, unknown>,
      expires_at: storedResponse.expiresAt,
    });

    const service = createCheckoutService(deps);
    const result = await service.checkout(baseRequest, baseRequest.idempotencyKey);

    expect(result).toEqual(storedResponse);
    // No new order/invoice should be created for a genuine repeat.
    expect(deps.ordersRepository.createPendingOrder).not.toHaveBeenCalled();
  });

  it("returns 409 CHECKOUT_CONFLICT when the same idempotency key is reused with a different request", async () => {
    const deps = buildDeps({
      existingIdempotency: {
        id: "idem-1",
        idempotency_key: baseRequest.idempotencyKey,
        request_hash: "a-completely-different-hash",
        order_id: "some-other-order",
        response_payload: {},
        expires_at: "2026-01-01T00:30:00.000Z",
      },
    });
    const service = createCheckoutService(deps);

    await expect(service.checkout(baseRequest, baseRequest.idempotencyKey)).rejects.toMatchObject({
      code: "CHECKOUT_CONFLICT",
      status: 409,
    });
  });

  it("returns a safe PAYMENT_PROVIDER_ERROR when Mayar invoice creation fails, without leaking provider detail", async () => {
    const deps = buildDeps({
      mayarCreateInvoice: vi.fn(async () => {
        throw new Error("mayar said: invalid API key xyz-secret-123 at line 42");
      }),
    });
    const service = createCheckoutService(deps);

    const error = await service.checkout(baseRequest, baseRequest.idempotencyKey).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(apiError.message).not.toMatch(/xyz-secret-123|line 42/i);
    expect(deps.ordersRepository.markPaymentCreated).not.toHaveBeenCalled();
  });
});
