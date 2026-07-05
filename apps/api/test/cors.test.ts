import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { CloudflareBindings } from "../src/types/bindings";

const env: CloudflareBindings = {
  ALLOWED_ORIGINS: "https://warungkit-demo.pages.dev,http://localhost:5173",
};

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
});
