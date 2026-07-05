import { z } from "zod";

// Mirrors the public.order_status Postgres enum exactly (see
// supabase/migrations/20260705024011_create_warungkit_core_schema.sql).
// Do not add values here without a corresponding migration.
export const orderStatusSchema = z.enum([
  "pending",
  "payment_created",
  "paid",
  "expired",
  "failed",
  "cancelled",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

const orderStatusProductSchema = z.object({
  name: z.string(),
  slug: z.string(),
  productType: z.enum(["digital_product", "service"]),
});

const orderStatusCustomerSchema = z.object({
  maskedEmail: z.string(),
  maskedPhone: z.string(),
});

// Public order status contract returned by GET /api/orders/:orderId. Only
// fields safe to expose to whoever holds the receipt token — full customer
// name, raw email/phone, the receipt token itself, and any Mayar-internal
// detail are intentionally excluded.
export const orderStatusResponseSchema = z.object({
  orderId: z.string().uuid(),
  orderCode: z.string(),
  product: orderStatusProductSchema,
  amountIdr: z.number().int().nonnegative(),
  status: orderStatusSchema,
  paidAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  customer: orderStatusCustomerSchema,
});

export type OrderStatusResponse = z.infer<typeof orderStatusResponseSchema>;
