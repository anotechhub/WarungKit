import { Hono } from "hono";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { readSupabaseConfig, readMayarConfig } from "../config/env";
import { createSupabaseServerClient } from "../lib/supabase";
import { createOrdersRepository } from "../repositories/orders.repository";
import { createPaymentEventsRepository } from "../repositories/payment-events.repository";
import { createMayarService } from "../services/mayar.service";
import { createWebhooksService } from "../services/webhooks.service";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const webhooksRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// POST /api/webhooks/mayar: this endpoint does not claim any HMAC/signature
// verification — Mayar's signature mechanism has not been independently
// re-verified against current documentation. The webhook payload is treated
// strictly as a trigger: the raw body is hashed for idempotency and a
// candidate invoice id is extracted defensively, but the actual order state
// change only ever happens after a server-side call to Mayar's invoice
// detail endpoint (see services/webhooks.service.ts and
// services/mayar.service.ts).
webhooksRoute.post("/mayar", async (c) => {
  const supabaseConfig = readSupabaseConfig(c.env);
  const mayarConfig = readMayarConfig(c.env);

  if (!supabaseConfig || !mayarConfig) {
    throw new ApiError(503, API_ERROR_CODES.CONFIGURATION_ERROR, "Service configuration is incomplete.");
  }

  // Raw body text only — never logged, never persisted as-is. Only its
  // SHA-256 hash and a small set of sanitized derived fields are stored.
  const rawBody = await c.req.text();

  const client = createSupabaseServerClient(supabaseConfig);
  const ordersRepository = createOrdersRepository(client);
  const paymentEventsRepository = createPaymentEventsRepository(client);
  const mayarService = createMayarService(mayarConfig);

  const webhooksService = createWebhooksService({
    ordersRepository,
    paymentEventsRepository,
    mayarService,
    requestId: c.get("requestId"),
  });

  const result = await webhooksService.handleWebhook(rawBody);

  return c.json(result, 200);
});
