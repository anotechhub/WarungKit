import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { CloudflareBindings } from "../src/types/bindings";

const emptyEnv: CloudflareBindings = {};

describe("GET /health", () => {
  it("returns 200 with the exact HealthResponse contract", async () => {
    const app = createApp();
    const res = await app.request("/health", {}, emptyEnv);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "warungkit-api" });
  });

  it("includes X-Request-Id header", async () => {
    const app = createApp();
    const res = await app.request("/health", {}, emptyEnv);

    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("respects an existing valid X-Request-Id", async () => {
    const app = createApp();
    const incoming = "11111111-1111-4111-8111-111111111111";
    const res = await app.request("/health", { headers: { "X-Request-Id": incoming } }, emptyEnv);

    expect(res.headers.get("X-Request-Id")).toBe(incoming);
  });

  it("includes required security headers", async () => {
    const app = createApp();
    const res = await app.request("/health", {}, emptyEnv);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not expose Worker version, environment values, or infrastructure detail", async () => {
    const app = createApp();
    const res = await app.request("/health", {}, emptyEnv);
    const body = (await res.json()) as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual(["service", "status"]);
  });
});
