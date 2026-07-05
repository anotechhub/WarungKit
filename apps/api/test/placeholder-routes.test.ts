import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { CloudflareBindings } from "../src/types/bindings";

const emptyEnv: CloudflareBindings = {};

describe("Placeholder routes", () => {
  it("POST /api/checkout returns 501 NOT_IMPLEMENTED", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/checkout",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ any: "thing" }) },
      emptyEnv,
    );

    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("GET /api/orders/:orderId returns 501 NOT_IMPLEMENTED", async () => {
    const app = createApp();
    const res = await app.request("/api/orders/some-id", {}, emptyEnv);

    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("POST /api/webhooks/mayar returns 501 NOT_IMPLEMENTED", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/webhooks/mayar",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ any: "thing" }) },
      emptyEnv,
    );

    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_IMPLEMENTED");
  });

  it("never returns a raw exception message for placeholder routes", async () => {
    const app = createApp();
    const res = await app.request("/api/orders/some-id", {}, emptyEnv);
    const body = (await res.json()) as { error: { message: string } };

    expect(body.error.message).toBe("Order status lookup is not implemented yet.");
    expect(body.error.message).not.toMatch(/at Object|at Module|\.ts:\d+/);
  });
});
