import type { MiddlewareHandler } from "hono";
import { REQUEST_ID_HEADER, resolveRequestId } from "../lib/request-id";
import { logRequest } from "../lib/logger";
import type { CloudflareBindings } from "../types/bindings";

export interface SecurityVariables {
  requestId: string;
}

// Applies request-id propagation, standard security headers, and structured
// request logging (no body, no PII, no secrets). Runs first in the chain so
// every response — including error responses — carries these headers.
export const securityMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}> = async (c, next) => {
  const startedAt = Date.now();
  const requestId = resolveRequestId(c.req.header(REQUEST_ID_HEADER));
  c.set("requestId", requestId);

  await next();

  c.res.headers.set(REQUEST_ID_HEADER, requestId);
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "no-referrer");
  c.res.headers.set("Cache-Control", "no-store");

  logRequest({
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    elapsedMs: Date.now() - startedAt,
  });
};
