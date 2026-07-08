import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { CloudflareBindings } from "../src/types/bindings";

const env: CloudflareBindings = {
  ALLOWED_ORIGINS: "https://warungkit-demo.pages.dev,http://localhost:5173",
};

const ALLOWED_ORIGIN = "https://warungkit-demo.pages.dev";
const DISALLOWED_ORIGIN = "https://evil.example.com";

const configuredEnv: CloudflareBindings = {
  ...env,
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

const validCheckoutBody = {
  productId: activeProduct.id,
  customerName: "Budi Santoso",
  customerEmail: "budi@example.com",
  customerPhone: "081234567890",
  idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

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
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            insert: async () => ({ error: null }),
          };
        }
        throw new Error(`Unexpected table in test mock: ${table}`);
      }),
    })),
  };
});

describe("CORS", () => {
  it("allows an allowlisted origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/health",
      { headers: { Origin: "https://warungkit-demo.pages.dev" } },
      env,
    );

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://warungkit-demo.pages.dev");
  });

  it("does not grant CORS approval to a non-allowlisted origin", async () => {
    const app = createApp();
    const res = await app.request("/health", { headers: { Origin: "https://evil.example.com" } }, env);

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("never returns a wildcard origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/health",
      { headers: { Origin: "https://warungkit-demo.pages.dev" } },
      env,
    );

    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("handles OPTIONS preflight safely for an allowlisted origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/products",
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
        },
      },
      env,
    );

    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    expect(res.headers.get("Access-Control-Allow-Methods")).toMatch(/GET/);
  });

  it("preflight for checkout allows Content-Type and X-Idempotency-Key request headers", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "OPTIONS",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,x-idempotency-key",
        },
      },
      env,
    );

    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("Access-Control-Allow-Headers")).toMatch(/Content-Type/i);
    expect(res.headers.get("Access-Control-Allow-Headers")).toMatch(/X-Idempotency-Key/i);
  });

  it("unknown API route with an allowed Origin still includes Access-Control-Allow-Origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/this-route-does-not-exist",
      { headers: { Origin: ALLOWED_ORIGIN } },
      env,
    );

    expect(res.status).toBe(404);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("disallowed origin never receives Access-Control-Allow-Origin, even on an error response", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/this-route-does-not-exist",
      { headers: { Origin: DISALLOWED_ORIGIN } },
      env,
    );

    expect(res.status).toBe(404);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("CORS on checkout error responses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("VALIDATION_ERROR (invalid email) from an allowed Origin includes Access-Control-Allow-Origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Content-Type": "application/json",
          "X-Idempotency-Key": validCheckoutBody.idempotencyKey,
        },
        body: JSON.stringify({ ...validCheckoutBody, customerEmail: "not-an-email" }),
      },
      configuredEnv,
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("missing X-Idempotency-Key from an allowed Origin still includes Access-Control-Allow-Origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify(validCheckoutBody),
      },
      configuredEnv,
    );

    expect(res.status).toBe(422);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("mismatched X-Idempotency-Key from an allowed Origin still includes Access-Control-Allow-Origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Content-Type": "application/json",
          "X-Idempotency-Key": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        body: JSON.stringify(validCheckoutBody),
      },
      configuredEnv,
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("Mayar provider failure returns a safe error and still includes Access-Control-Allow-Origin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ statusCode: 500, messages: "internal provider failure" }),
      })),
    );

    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Content-Type": "application/json",
          "X-Idempotency-Key": validCheckoutBody.idempotencyKey,
        },
        body: JSON.stringify(validCheckoutBody),
      },
      configuredEnv,
    );

    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(JSON.stringify(body)).not.toMatch(/internal provider failure/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("CONFIGURATION_ERROR (missing bindings) from an allowed Origin still includes Access-Control-Allow-Origin", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Content-Type": "application/json",
          "X-Idempotency-Key": validCheckoutBody.idempotencyKey,
        },
        body: JSON.stringify(validCheckoutBody),
      },
      { ...env } as CloudflareBindings,
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFIGURATION_ERROR");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });

  it("error responses preserve security headers alongside CORS headers", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      {
        method: "POST",
        headers: { Origin: ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify(validCheckoutBody),
      },
      configuredEnv,
    );

    expect(res.status).toBe(422);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
