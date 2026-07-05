import { z } from "zod";
import { orderStatusSchema } from "./order-status";

// Checkout request accepted from the browser. Deliberately narrow: the
// client sends only its intent (which product, who is buying, an
// idempotency key) — it never sends price, amount, product name, order
// status, a redirect URL, or arbitrary metadata. The backend resolves all
// business-truth fields (price, order status) from the database.
export const checkoutRequestSchema = z.object({
  productId: z.string().uuid(),
  customerName: z
    .string()
    .trim()
    .min(2, "Nama pelanggan minimal 2 karakter.")
    .max(120, "Nama pelanggan maksimal 120 karakter."),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email("Email tidak valid.")),
  customerPhone: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 karakter.")
    .max(20, "Nomor telepon maksimal 20 karakter.")
    .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid."),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutResponseSchema = z.object({
  orderId: z.string().uuid(),
  orderCode: z.string(),
  status: z.literal(orderStatusSchema.enum.payment_created),
  paymentUrl: z.string().url(),
  expiresAt: z.string(),
  receiptToken: z.string().uuid(),
});

export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
