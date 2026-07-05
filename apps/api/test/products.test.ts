import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CloudflareBindings } from "../src/types/bindings";

const configuredEnv: CloudflareBindings = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "test-secret-key-not-real",
};

const mockProducts = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "sesi-konsultasi-bisnis-30-menit",
    name: "Sesi Konsultasi Bisnis 30 Menit",
    description: "Sesi konsultasi bisnis privat.",
    price_idr: 149000,
    product_type: "service",
    sort_order: 3,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "template-konten-instagram-umkm",
    name: "Template Konten Instagram UMKM",
    description: "Template konten Instagram siap edit.",
    price_idr: 49000,
    product_type: "digital_product",
    sort_order: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

// Mock the Supabase client at the module boundary — no real credentials or
// network calls are ever used in this test file.
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => {
              // Repository requests ascending sort_order; simulate the
              // database already returning it pre-sorted, as Postgres would.
              const sorted = [...mockProducts].sort((a, b) => a.sort_order - b.sort_order);
              return { data: sorted, error: null };
            }),
          })),
        })),
      })),
    })),
  };
});

describe("GET /api/products", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns active products only, sorted by sort_order ascending, with only public fields", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();
    const res = await app.request("/api/products", {}, configuredEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;

    expect(body.map((p) => p.slug)).toEqual([
      "template-konten-instagram-umkm",
      "sesi-konsultasi-bisnis-30-menit",
    ]);

    for (const product of body) {
      expect(Object.keys(product).sort()).toEqual(
        ["description", "id", "name", "price_idr", "product_type", "slug", "sort_order"].sort(),
      );
      expect(product).not.toHaveProperty("created_at");
      expect(product).not.toHaveProperty("updated_at");
      expect(product).not.toHaveProperty("is_active");
    }
  });
});

describe("GET /api/products — configuration error", () => {
  it("returns 503 with a safe ApiError when Supabase bindings are missing", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();
    const res = await app.request("/api/products", {}, {} as CloudflareBindings);

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string; message: string; requestId: string } };

    expect(body.error.code).toBe("CONFIGURATION_ERROR");
    expect(body.error.message).toBe("Service configuration is incomplete.");
    expect(body.error.requestId).toBeTruthy();

    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/SUPABASE_URL/);
    expect(serialized).not.toMatch(/SUPABASE_SECRET_KEY/);
  });
});
