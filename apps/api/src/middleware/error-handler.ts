import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError, buildApiErrorResponse } from "../lib/api-error";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "./security";

// Centralized error handler: never leaks stack traces, database error
// detail, or configuration/secret values. Every response follows the
// ApiError contract and includes the request id.
export const errorHandler: ErrorHandler<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}> = (err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof ApiError) {
    return c.json(buildApiErrorResponse(err.code, err.message, requestId), {
      status: err.status as 400 | 404 | 500 | 501 | 503,
    });
  }

  if (err instanceof HTTPException) {
    return c.json(
      buildApiErrorResponse(API_ERROR_CODES.INTERNAL_ERROR, "Request could not be processed.", requestId),
      { status: err.status },
    );
  }

  // Unexpected error: log internally (server-side only), respond generically.
  console.error(
    JSON.stringify({
      requestId,
      event: "unhandled_error",
      // Intentionally omit err.message/stack from the client response;
      // this server-side log line stays out of the HTTP response body.
    }),
  );

  return c.json(
    buildApiErrorResponse(API_ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred.", requestId),
    { status: 500 },
  );
};
