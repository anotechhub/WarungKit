import { Hono } from "hono";
import type { HealthResponse } from "@warungkit/contracts";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const healthRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// GET /health: public, no database dependency, must always return 200 with
// the exact HealthResponse contract. Never expose Worker version,
// environment values, secrets, or infrastructure detail here.
healthRoute.get("/", (c) => {
  const body: HealthResponse = {
    status: "ok",
    service: "warungkit-api",
  };
  return c.json(body, 200);
});
