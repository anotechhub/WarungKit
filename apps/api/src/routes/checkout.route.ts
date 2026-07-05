import { Hono } from "hono";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const checkoutRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// POST /api/checkout: placeholder only for this phase. Checkout business
// logic, price resolution, order creation, and Mayar invoice creation are
// implemented in a later phase — this route deliberately does not read the
// request body to avoid processing/logging anything prematurely.
checkoutRoute.post("/", () => {
  throw new ApiError(501, API_ERROR_CODES.NOT_IMPLEMENTED, "Checkout is not implemented yet.");
});
