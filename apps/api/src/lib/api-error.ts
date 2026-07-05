import type { ApiErrorCode, ApiErrorResponse } from "@warungkit/contracts";

// Thrown by routes/services/repositories to signal a safe, client-facing
// error. The message here is always safe to return to the client — never
// put raw exception/database detail into `message`.
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function buildApiErrorResponse(
  code: ApiErrorCode,
  message: string,
  requestId: string,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}
