import { z } from "zod";

export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorBodySchema,
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const API_ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  CHECKOUT_CONFLICT: "CHECKOUT_CONFLICT",
  PAYMENT_PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR",
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_ACCESS_DENIED: "ORDER_ACCESS_DENIED",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
