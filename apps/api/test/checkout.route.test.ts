import { afterEach, describe, expect, it, vi } from "vitest";
import type { CloudflareBindings } from "../src/types/bindings";

const configuredEnv: CloudflareBindings = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test-secret-key-not-real",
  MAYAR_API_KEY: "test-mayar-key-not-real",
  MAYAR_API_BASE_URL: "https://api.mayar.id/hl/v1",
  FRONTEND_BASE_URL: "https://warungkit-demo.pages.dev",
};

const activeProduct = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "template-konten-instagram-umkm",
  name: "Template Konten Instagram UMKM",
  description: "Template konten Instagram siap edit.",
  price_idr: 49000,
  product_type: "digital_product",
  sort_order: 1,
  is_active: true,
};

let idempotencyStore: Record<string, unknown> | null = null;

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: activeProduct, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "orders") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: "22222222-2222-4222-8222-222222222222",
                    order_code: "WK-TEST-ORDER",
                    product_id: activeProduct.id,
                    customer_name: "Budi Santoso",
                    customer_email: "budi@example.com",
                    customer_phone: "081234567890",
                    amount_idr: activeProduct.price_idr,
                    status: "pending",
                    mayar_invoice_id: null,
                    mayar_invoice_url: null,
                    receipt_token: "33333333-3333-4333-8333-333333333333",
                    paid_at: null,
                    expires_at: null,
                    metadata: {},
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        if (table === "checkout_idempotency") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: idempotencyStore
                    ? {
                        id: "idem-1",
                        idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                        request_hash: idempotencyStore.request_hash,
                        order_id: "22222222-2222-4222-8222-222222222222",
                        response_payload: idempotencyStore.response_payload,
                        expires_at: "2026-01-01T00:30:00.000Z",
                      }
                    : null,
                  error: null,
                }),
              }),
            }),
            insert: async (row: Record<string, unknown>) => {
              idempotencyStore = { request_hash: row.request_hash, response_payload: row.response_payload };
              return { error: null };
            },
          };
        }
        throw new Error(`Unexpected table in test mock: ${table}`);
      }),
    })),
  };
});

describe("POST /api/checkout (route integration)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    idempotencyStore = null;
  });

  it("creates an order and invoice end-to-end for a valid request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          statusCode: 200,
          messages: "success",
          data: {
            id: "mayar-invoice-1",
            transactionId: "transaction-uuid-1",
            link: "https://mayar.id/pay/abc",
            expiredAt: 1776617003000,
            extraData: { noCustomer: "WK-TEST-ORDER", idProd: "11111111-1111-4111-8111-111111111111" },
          },
        }),
      })),
    );

    const { createApp } = await import("../src/app");
    const app = createApp();

    const requestBody = {
      productId: activeProduct.id,
      customerName: "Budi Santoso",
      customerEmail: "budi@example.com",
      customerPhone: "081234567890",
      idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };

    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": requestBody.idempotencyKey },
        body: JSON.stringify(requestBody),
      },
      configuredEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; paymentUrl: string };
    expect(body.status).toBe("payment_created");
    expect(body.paymentUrl).toBe("https://mayar.id/pay/abc");
  });

  it("ignores an injected price/amount field — the order is still priced from the database product", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          statusCode: 200,
          messages: "success",
          data: {
            id: "mayar-invoice-1",
            transactionId: "transaction-uuid-1",
            link: "https://mayar.id/pay/abc",
            expiredAt: 1776617003000,
            extraData: { noCustomer: "WK-TEST-ORDER", idProd: "11111111-1111-4111-8111-111111111111" },
          },
        }),
      })),
    );

    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        body: JSON.stringify({
          productId: activeProduct.id,
          customerName: "Budi Santoso",
          customerEmail: "budi@example.com",
          customerPhone: "081234567890",
          idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          price: 1,
          amount: 1,
        }),
      },
      configuredEnv,
    );

    // Zod's default object parsing strips unknown keys, so the extra
    // `price`/`amount` fields are silently ignored rather than rejected —
    // the checkout still succeeds, and (verified precisely in
    // checkout.service.test.ts) the amount always comes from
    // products.price_idr, never from these injected fields.
    expect(res.status).toBe(200);
  });

  it("rejects when X-Idempotency-Key header is missing", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: activeProduct.id,
          customerName: "Budi Santoso",
          customerEmail: "budi@example.com",
          customerPhone: "081234567890",
          idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      },
      configuredEnv,
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 503 CONFIGURATION_ERROR when Mayar/Supabase bindings are missing, without naming the missing variable", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        body: JSON.stringify({
          productId: activeProduct.id,
          customerName: "Budi Santoso",
          customerEmail: "budi@example.com",
          customerPhone: "081234567890",
          idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      },
      {} as CloudflareBindings,
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/MAYAR_API_KEY|SUPABASE_SECRET_KEY/);
  });
});
