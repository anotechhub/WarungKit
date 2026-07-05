import { Hono } from "hono";
import { z } from "zod";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { readSupabaseConfig, readMayarConfig } from "../config/env";
import { createSupabaseServerClient } from "../lib/supabase";
import { createOrdersRepository } from "../repositories/orders.repository";
import { createProductsRepository } from "../repositories/products.repository";
import { createMayarService } from "../services/mayar.service";
import { createOrdersService } from "../services/orders.service";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const ordersRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

const orderIdSchema = z.string().uuid();
const tokenSchema = z.string().uuid();

// GET /api/orders/:orderId?token=<receipt-token>: the token is required and
// must exactly match orders.receipt_token. An invalid token and an unknown
// order both fail — but with distinct error codes only after the token is
// confirmed valid for *some* order id shape; we never leak whether a
// different order exists to someone holding an invalid token for this id.
ordersRoute.get("/:orderId", async (c) => {
  const supabaseConfig = readSupabaseConfig(c.env);
  const mayarConfig = readMayarConfig(c.env);

  if (!supabaseConfig || !mayarConfig) {
    throw new ApiError(503, API_ERROR_CODES.CONFIGURATION_ERROR, "Service configuration is incomplete.");
  }

  const orderIdResult = orderIdSchema.safeParse(c.req.param("orderId"));
  const tokenResult = tokenSchema.safeParse(c.req.query("token"));

  if (!orderIdResult.success || !tokenResult.success) {
    throw new ApiError(422, API_ERROR_CODES.VALIDATION_ERROR, "A valid orderId and token query parameter are required.");
  }

  const client = createSupabaseServerClient(supabaseConfig);
  const ordersRepository = createOrdersRepository(client);
  const productsRepository = createProductsRepository(client);
  const mayarService = createMayarService(mayarConfig);

  const ordersService = createOrdersService({
    ordersRepository,
    productsRepository,
    mayarService,
    requestId: c.get("requestId"),
  });

  const response = await ordersService.getOrderStatus(orderIdResult.data, tokenResult.data);

  return c.json(response, 200);
});
