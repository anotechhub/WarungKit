import { Hono } from "hono";
import { securityMiddleware, type SecurityVariables } from "./middleware/security";
import { errorHandler } from "./middleware/error-handler";
import { createCorsMiddleware } from "./lib/cors";
import { healthRoute } from "./routes/health.route";
import { productsRoute } from "./routes/products.route";
import { checkoutRoute } from "./routes/checkout.route";
import { ordersRoute } from "./routes/orders.route";
import { webhooksRoute } from "./routes/webhooks.route";
import type { CloudflareBindings } from "./types/bindings";

export function createApp(): Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}> {
  const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: SecurityVariables;
  }>();

  app.use("*", securityMiddleware);
  app.use("*", createCorsMiddleware());
  app.onError(errorHandler);

  app.route("/health", healthRoute);
  app.route("/api/products", productsRoute);
  app.route("/api/checkout", checkoutRoute);
  app.route("/api/orders", ordersRoute);
  app.route("/api/webhooks", webhooksRoute);

  return app;
}
