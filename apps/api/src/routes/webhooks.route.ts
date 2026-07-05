import { Hono } from "hono";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const webhooksRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// POST /api/webhooks/mayar: placeholder only for this phase. Webhook
// verification, event deduplication, and server-side Mayar status
// confirmation are implemented in a later phase. Deliberately does not read
// or log the request body.
webhooksRoute.post("/mayar", () => {
  throw new ApiError(501, API_ERROR_CODES.NOT_IMPLEMENTED, "Webhook processing is not implemented yet.");
});
