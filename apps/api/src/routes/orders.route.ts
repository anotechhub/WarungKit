import { Hono } from "hono";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const ordersRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// GET /api/orders/:orderId: placeholder only for this phase. Receipt-token
// validation and order status lookup are implemented in a later phase.
ordersRoute.get("/:orderId", () => {
  throw new ApiError(501, API_ERROR_CODES.NOT_IMPLEMENTED, "Order status lookup is not implemented yet.");
});
