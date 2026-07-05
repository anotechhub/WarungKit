import { Hono } from "hono";
import { API_ERROR_CODES, checkoutRequestSchema } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { readSupabaseConfig, readMayarConfig } from "../config/env";
import { createSupabaseServerClient } from "../lib/supabase";
import { createProductsRepository } from "../repositories/products.repository";
import { createOrdersRepository } from "../repositories/orders.repository";
import { createCheckoutIdempotencyRepository } from "../repositories/checkout-idempotency.repository";
import { createMayarService } from "../services/mayar.service";
import { createCheckoutService } from "../services/checkout.service";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const checkoutRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

checkoutRoute.post("/", async (c) => {
  const supabaseConfig = readSupabaseConfig(c.env);
  const mayarConfig = readMayarConfig(c.env);

  if (!supabaseConfig || !mayarConfig) {
    throw new ApiError(503, API_ERROR_CODES.CONFIGURATION_ERROR, "Service configuration is incomplete.");
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(422, API_ERROR_CODES.VALIDATION_ERROR, "Request body must be valid JSON.");
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, API_ERROR_CODES.VALIDATION_ERROR, "Checkout request is invalid.");
  }

  const client = createSupabaseServerClient(supabaseConfig);
  const productsRepository = createProductsRepository(client);
  const ordersRepository = createOrdersRepository(client);
  const idempotencyRepository = createCheckoutIdempotencyRepository(client);
  const mayarService = createMayarService(mayarConfig);

  const requestId = c.get("requestId");
  const checkoutService = createCheckoutService({
    productsRepository,
    ordersRepository,
    idempotencyRepository,
    mayarService,
    frontendBaseUrl: mayarConfig.frontendBaseUrl,
    requestId,
  });

  const response = await checkoutService.checkout(parsed.data, c.req.header(IDEMPOTENCY_HEADER));

  return c.json(response, 200);
});
