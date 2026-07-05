import { API_ERROR_CODES, type CheckoutRequest, type CheckoutResponse } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { hashCheckoutRequest } from "../lib/hash";
import { logPaymentEvent } from "../lib/logger";
import type { ProductsRepository } from "../repositories/products.repository";
import type { OrdersRepository } from "../repositories/orders.repository";
import type { CheckoutIdempotencyRepository } from "../repositories/checkout-idempotency.repository";
import type { MayarService } from "./mayar.service";

const INVOICE_EXPIRY_MINUTES = 30;

export interface CheckoutServiceDeps {
  productsRepository: ProductsRepository;
  ordersRepository: OrdersRepository;
  idempotencyRepository: CheckoutIdempotencyRepository;
  mayarService: MayarService;
  frontendBaseUrl: string;
  requestId: string;
}

function generateOrderCode(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `WK-${datePart}-${randomPart}`;
}

export function createCheckoutService(deps: CheckoutServiceDeps) {
  const { productsRepository, ordersRepository, idempotencyRepository, mayarService, frontendBaseUrl, requestId } =
    deps;

  return {
    async checkout(request: CheckoutRequest, headerIdempotencyKey: string | undefined): Promise<CheckoutResponse> {
      // 1-3. Idempotency key must be present in the header and must exactly
      // match the body's idempotencyKey. This prevents a client from
      // silently reusing someone else's idempotency key or omitting it.
      if (!headerIdempotencyKey || headerIdempotencyKey !== request.idempotencyKey) {
        throw new ApiError(
          422,
          API_ERROR_CODES.VALIDATION_ERROR,
          "X-Idempotency-Key header is required and must match the request body idempotencyKey.",
        );
      }

      // 4-6. Resolve the product from the database — price is NEVER
      // accepted from the client. An inactive or missing product is
      // rejected identically (do not reveal whether an inactive product
      // exists under that id).
      const product = await productsRepository.findActiveProductById(request.productId);
      if (!product) {
        throw new ApiError(404, API_ERROR_CODES.PRODUCT_NOT_FOUND, "Product not found or unavailable.");
      }

      const requestHash = await hashCheckoutRequest({
        productId: request.productId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
      });

      // 9. Idempotency check.
      const existing = await idempotencyRepository.findByKey(request.idempotencyKey);
      if (existing) {
        if (existing.request_hash === requestHash) {
          return existing.response_payload as unknown as CheckoutResponse;
        }
        throw new ApiError(
          409,
          API_ERROR_CODES.CHECKOUT_CONFLICT,
          "This idempotency key was already used for a different checkout request.",
        );
      }

      // 7-10. Create the pending order with a server-generated unique code
      // and receipt token. amount_idr comes only from products.price_idr.
      const orderCode = generateOrderCode();
      const receiptToken = crypto.randomUUID();

      const order = await ordersRepository.createPendingOrder({
        orderCode,
        productId: product.id,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        amountIdr: product.price_idr,
        receiptToken,
      });

      const expiresAt = new Date(Date.now() + INVOICE_EXPIRY_MINUTES * 60_000).toISOString();
      const redirectUrl = `${frontendBaseUrl}/payment-status?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(receiptToken)}`;

      // 11-14. Call Mayar only through the dedicated adapter service.
      let invoice;
      try {
        invoice = await mayarService.createInvoice({
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          redirectUrl,
          description: `${product.name} — ${orderCode}`,
          expiredAt: expiresAt,
          amountIdr: product.price_idr,
          productName: product.name,
          orderCode,
          productId: product.id,
          orderId: order.id,
        });
      } catch {
        // 18. Mayar failed: leave the order in an audit-safe `pending`
        // state (already its current state — no further mutation needed)
        // and return a generic provider error. Never expose the raw
        // provider error/stack trace to the client.
        logPaymentEvent({
          requestId,
          event: "mayar_create_invoice_failed",
          orderId: order.id,
          orderCode: order.order_code,
        });
        throw new ApiError(
          502,
          API_ERROR_CODES.PAYMENT_PROVIDER_ERROR,
          "Unable to create a payment invoice right now. Please try again shortly.",
        );
      }

      // 15. Persist invoice id/url, transition to payment_created. Use the
      // expiry Mayar actually confirmed (data.expiredAt) as the source of
      // truth, not just the value we requested.
      const confirmedExpiresAt = invoice.expiresAt;
      await ordersRepository.markPaymentCreated(order.id, {
        mayarInvoiceId: invoice.invoiceId,
        mayarInvoiceUrl: invoice.paymentUrl,
        expiresAt: confirmedExpiresAt,
      });

      const responsePayload: CheckoutResponse = {
        orderId: order.id,
        orderCode: order.order_code,
        status: "payment_created",
        paymentUrl: invoice.paymentUrl,
        expiresAt: confirmedExpiresAt,
        receiptToken,
      };

      // 16. Persist idempotency response safely (no secrets in the stored
      // payload — this is the exact response we already return to the
      // client, which itself never contains a Mayar key or internal data).
      await idempotencyRepository.create({
        idempotencyKey: request.idempotencyKey,
        requestHash,
        orderId: order.id,
        responsePayload: responsePayload as unknown as Record<string, unknown>,
        expiresAt: confirmedExpiresAt,
      });

      logPaymentEvent({
        requestId,
        event: "checkout_invoice_created",
        orderId: order.id,
        orderCode: order.order_code,
        providerInvoiceId: invoice.invoiceId,
      });

      // 17. Return CheckoutResponse.
      return responsePayload;
    },
  };
}

export type CheckoutService = ReturnType<typeof createCheckoutService>;
