import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import { readAllowedOrigins } from "../config/env";
import type { CloudflareBindings } from "../types/bindings";

// Strict allowlist CORS: never a wildcard. Origin is only echoed back when it
// exactly matches a configured entry in ALLOWED_ORIGINS (comma-separated).
export function createCorsMiddleware(): MiddlewareHandler<{ Bindings: CloudflareBindings }> {
  return async (c, next) => {
    const allowedOrigins = readAllowedOrigins(c.env);

    const middleware = cors({
      origin: (origin) => {
        if (!origin) {
          return undefined;
        }
        return allowedOrigins.includes(origin) ? origin : undefined;
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Request-Id"],
      credentials: false,
    });

    return middleware(c, next);
  };
}
