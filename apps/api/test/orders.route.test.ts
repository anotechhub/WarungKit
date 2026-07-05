import { afterEach, describe, expect, it, vi } from "vitest";
import type { CloudflareBindings } from "../src/types/bindings";

const configuredEnv: CloudflareBindings = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test-secret-key-not-real",
  MAYAR_API_KEY: "test-mayar-key-not-real",
  MAYAR_API_BASE_URL: "https://api.mayar.id/hl/v1",
  FRONTEND_BASE_URL: "https://warungkit-demo.pages.dev",
};

const orderId = "22222222-2222-4222-8222-222222222222";
const receiptToken = "33333333-3333-4333-8333-333333333333";

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: orderId,
                    order_code: "WK-TEST-ORDER",
                    product_id: "11111111-1111-4111-8111-111111111111",
                    customer_name: "Budi Santoso",
                    customer_email: "budi@example.com",
                    customer_phone: "081234567890",
                    amount_idr: 49000,
                    status: "pending",
                    mayar_invoice_id: null,
                    mayar_invoice_url: null,
                    receipt_token: receiptToken,
                    paid_at: null,
                    expires_at: null,
                    metadata: {},
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "products") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "11111111-1111-4111-8111-111111111111",
                      slug: "template-konten-instagram-umkm",
                      name: "Template Konten Instagram UMKM",
                      description: "desc",
                      price_idr: 49000,
                      product_type: "digital_product",
                      sort_order: 1,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table in test mock: ${table}`);
      }),
    })),
  };
});

describe("GET /api/orders/:orderId (route integration)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 422 when token query parameter is missing", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(`/api/orders/${orderId}`, {}, configuredEnv);

    expect(res.status).toBe(422);
  });

  it("returns 403 ORDER_ACCESS_DENIED for an invalid token", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const wrongToken = "99999999-9999-4999-8999-999999999999";
    const res = await app.request(`/api/orders/${orderId}?token=${wrongToken}`, {}, configuredEnv);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ORDER_ACCESS_DENIED");
  });

  it("returns masked customer data for a valid token, with no receipt token in the response", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(`/api/orders/${orderId}?token=${receiptToken}`, {}, configuredEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain(receiptToken);
    expect(JSON.stringify(body)).not.toContain("budi@example.com");
  });
});
