import { afterEach, describe, expect, it, vi } from "vitest";
import type { CloudflareBindings } from "../src/types/bindings";

const configuredEnv: CloudflareBindings = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test-secret-key-not-real",
  MAYAR_API_KEY: "test-mayar-key-not-real",
  MAYAR_API_BASE_URL: "https://api.mayar.id/hl/v1",
  FRONTEND_BASE_URL: "https://warungkit-demo.pages.dev",
};

let existingEventHash: string | null = null;

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "payment_events") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: existingEventHash
                      ? {
                          id: "event-1",
                          provider: "mayar",
                          provider_event_id: null,
                          provider_event_hash: existingEventHash,
                          order_id: null,
                          sanitized_payload: {},
                          processing_status: "verified",
                          processed_at: "2026-01-01T00:00:00.000Z",
                          error_code: null,
                        }
                      : null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: "event-1",
                    provider: "mayar",
                    provider_event_id: null,
                    provider_event_hash: "new-hash",
                    order_id: null,
                    sanitized_payload: {},
                    processing_status: "ignored",
                    processed_at: null,
                    error_code: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table in test mock: ${table}`);
      }),
    })),
  };
});

describe("POST /api/webhooks/mayar (route integration)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    existingEventHash = null;
  });

  it("returns 200 with minimal JSON for an unrecognized payload (safe ignore)", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(
      "/api/webhooks/mayar",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unrelated: "field" }) },
      configuredEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ received: true });
  });

  it("returns 503 CONFIGURATION_ERROR when bindings are missing", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();

    const res = await app.request(
      "/api/webhooks/mayar",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      {} as CloudflareBindings,
    );

    expect(res.status).toBe(503);
  });
});
