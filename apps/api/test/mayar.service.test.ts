import { afterEach, describe, expect, it, vi } from "vitest";
import { createMayarService } from "../src/services/mayar.service";
import { mapMayarStatusToOrderStatus } from "../src/lib/mayar-status-mapper";

const config = {
  mayarApiKey: "test-mayar-key-not-real",
  mayarApiBaseUrl: "https://api.mayar.id/hl/v1",
  frontendBaseUrl: "https://warungkit-demo.pages.dev",
};

const createInvoiceInput = {
  customerName: "Budi Santoso",
  customerEmail: "budi@example.com",
  customerPhone: "081234567890",
  redirectUrl: "https://warungkit-demo.pages.dev/payment-status?orderId=abc&token=def",
  description: "Template Konten Instagram UMKM — WK-TEST-ORDER",
  expiredAt: "2026-01-01T00:30:00.000Z",
  amountIdr: 49000,
  productName: "Template Konten Instagram UMKM",
  orderCode: "WK-TEST-ORDER",
  productId: "11111111-1111-4111-8111-111111111111",
  orderId: "22222222-2222-4222-8222-222222222222",
};

function mockFetchOnce(body: unknown, init: { ok?: boolean } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: init.ok ?? true,
      json: async () => body,
    })),
  );
}

describe("mayar service — createInvoice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts the documented canonical object-shape response", async () => {
    mockFetchOnce({
      statusCode: 200,
      messages: "success",
      data: {
        id: "invoice-uuid-1",
        transactionId: "transaction-uuid-1",
        link: "https://mayar.id/pay/abc",
        expiredAt: 1776617003000,
        extraData: { noCustomer: "WK-TEST-ORDER", idProd: "11111111-1111-4111-8111-111111111111" },
      },
    });

    const service = createMayarService(config);
    const result = await service.createInvoice(createInvoiceInput);

    expect(result.invoiceId).toBe("invoice-uuid-1");
    expect(result.paymentUrl).toBe("https://mayar.id/pay/abc");
    // 1776617003000 epoch ms -> ISO timestamp
    expect(result.expiresAt).toBe(new Date(1776617003000).toISOString());
  });

  it("accepts a one-item array as a compatibility fallback for `data`", async () => {
    mockFetchOnce({
      statusCode: 200,
      messages: "success",
      data: [
        {
          id: "invoice-uuid-1",
          link: "https://mayar.id/pay/abc",
          expiredAt: 1776617003000,
        },
      ],
    });

    const service = createMayarService(config);
    const result = await service.createInvoice(createInvoiceInput);

    expect(result.invoiceId).toBe("invoice-uuid-1");
    expect(result.paymentUrl).toBe("https://mayar.id/pay/abc");
  });

  it("rejects an unexpected/malformed response shape safely, without exposing raw body", async () => {
    mockFetchOnce({ statusCode: 200, messages: "success", data: { unexpected: "shape" } });

    const service = createMayarService(config);
    const error = await service.createInvoice(createInvoiceInput).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("unexpected");
  });

  it("rejects a two-item array for `data` (not a safe one-item fallback)", async () => {
    mockFetchOnce({
      statusCode: 200,
      messages: "success",
      data: [
        { id: "invoice-1", link: "https://mayar.id/pay/1", expiredAt: 1776617003000 },
        { id: "invoice-2", link: "https://mayar.id/pay/2", expiredAt: 1776617003000 },
      ],
    });

    const service = createMayarService(config);
    await expect(service.createInvoice(createInvoiceInput)).rejects.toThrow();
  });

  it("rejects an HTTP error response safely", async () => {
    mockFetchOnce({ statusCode: 401, messages: "unauthorized" }, { ok: false });

    const service = createMayarService(config);
    await expect(service.createInvoice(createInvoiceInput)).rejects.toThrow();
  });
});

describe("mayar service — getInvoiceDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts the documented canonical invoice detail response and normalizes status to lowercase", async () => {
    mockFetchOnce({
      statusCode: 200,
      messages: "success",
      data: {
        id: "invoice-uuid-1",
        amount: 110000,
        status: "unpaid",
        expiredAt: 1764582069401,
        paymentUrl: "https://mayar.id/pay/abc",
        paymentLinkId: "invoice-uuid-1",
      },
    });

    const service = createMayarService(config);
    const result = await service.getInvoiceDetail("invoice-uuid-1");

    expect(result.invoiceId).toBe("invoice-uuid-1");
    expect(result.providerStatus).toBe("unpaid");
  });

  it("normalizes an uppercase/mixed-case provider status to lowercase before it reaches the mapper", async () => {
    mockFetchOnce({
      statusCode: 200,
      messages: "success",
      data: { id: "invoice-uuid-1", status: "PAID" },
    });

    const service = createMayarService(config);
    const result = await service.getInvoiceDetail("invoice-uuid-1");

    expect(result.providerStatus).toBe("paid");
  });

  it("rejects an invalid provider response shape safely", async () => {
    mockFetchOnce({ statusCode: 200, messages: "success", data: { totally: "wrong" } });

    const service = createMayarService(config);
    await expect(service.getInvoiceDetail("invoice-uuid-1")).rejects.toThrow();
  });
});

describe("mapMayarStatusToOrderStatus — exact-match mapping", () => {
  it("maps exact 'unpaid' status to payment_created (no state change)", () => {
    expect(mapMayarStatusToOrderStatus("unpaid")).toBe("payment_created");
  });

  it("maps exact 'paid' status to paid", () => {
    expect(mapMayarStatusToOrderStatus("paid")).toBe("paid");
  });

  it("maps exact 'expired' status to expired", () => {
    expect(mapMayarStatusToOrderStatus("expired")).toBe("expired");
  });

  it("maps exact 'failed' status to failed", () => {
    expect(mapMayarStatusToOrderStatus("failed")).toBe("failed");
  });

  it("never infers paid from an unrecognized status string", () => {
    expect(mapMayarStatusToOrderStatus("pending")).toBe("payment_created");
    expect(mapMayarStatusToOrderStatus("something-unexpected")).toBe("payment_created");
    expect(mapMayarStatusToOrderStatus(null)).toBe("payment_created");
    expect(mapMayarStatusToOrderStatus(undefined)).toBe("payment_created");
  });
});
