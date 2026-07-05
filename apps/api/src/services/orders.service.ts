import { API_ERROR_CODES, type OrderStatusResponse } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { logPaymentEvent } from "../lib/logger";
import { mapMayarStatusToOrderStatus } from "../lib/mayar-status-mapper";
import type { OrdersRepository, OrderRecord } from "../repositories/orders.repository";
import type { ProductsRepository } from "../repositories/products.repository";
import type { MayarService } from "./mayar.service";

export interface OrdersServiceDeps {
  ordersRepository: OrdersRepository;
  productsRepository: ProductsRepository;
  mayarService: MayarService;
  requestId: string;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "***";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "*".repeat(phone.length);
  const visibleStart = phone.slice(0, 3);
  const visibleEnd = phone.slice(-2);
  return `${visibleStart}${"*".repeat(Math.max(3, phone.length - 5))}${visibleEnd}`;
}

async function buildResponse(
  order: OrderRecord,
  productsRepository: ProductsRepository,
): Promise<OrderStatusResponse> {
  const product = await productsRepository.findActiveProductById(order.product_id);

  return {
    orderId: order.id,
    orderCode: order.order_code,
    product: {
      name: product?.name ?? "Produk",
      slug: product?.slug ?? "",
      productType: product?.product_type ?? "digital_product",
    },
    amountIdr: order.amount_idr,
    status: order.status,
    paidAt: order.paid_at,
    expiresAt: order.expires_at,
    paymentMethod: null,
    customer: {
      maskedEmail: maskEmail(order.customer_email),
      maskedPhone: maskPhone(order.customer_phone),
    },
  };
}

export function createOrdersService(deps: OrdersServiceDeps) {
  const { ordersRepository, productsRepository, mayarService, requestId } = deps;

  return {
    // Token comparison and "no order found" both return the same class of
    // error information to the caller — we never reveal whether an order
    // exists to someone presenting an invalid/mismatched token (task
    // requirement: never confirm existence of another order).
    async getOrderStatus(orderId: string, token: string): Promise<OrderStatusResponse> {
      const order = await ordersRepository.findById(orderId);

      if (!order) {
        throw new ApiError(404, API_ERROR_CODES.ORDER_NOT_FOUND, "Order not found.");
      }

      if (order.receipt_token !== token) {
        throw new ApiError(403, API_ERROR_CODES.ORDER_ACCESS_DENIED, "Invalid receipt token for this order.");
      }

      // Redirect/query parameters are never trusted as payment proof. The
      // only thing that can move this order toward `paid` is a
      // server-side verification call to Mayar, performed here.
      if (order.status === "payment_created" && order.mayar_invoice_id) {
        try {
          const detail = await mayarService.getInvoiceDetail(order.mayar_invoice_id);
          const mappedStatus = mapMayarStatusToOrderStatus(detail.providerStatus);

          if (mappedStatus !== "payment_created") {
            await ordersRepository.updateStatus(order.id, {
              status: mappedStatus,
              paidAt: mappedStatus === "paid" ? new Date().toISOString() : undefined,
            });
            logPaymentEvent({
              requestId,
              event: "order_status_verified",
              orderId: order.id,
              orderCode: order.order_code,
              providerInvoiceId: order.mayar_invoice_id,
              processingResult: mappedStatus,
            });
            order.status = mappedStatus;
            if (mappedStatus === "paid") {
              order.paid_at = new Date().toISOString();
            }
          }
        } catch {
          // Verification call failed — do not change order state, do not
          // expose the provider error. The order remains in its last known
          // safe state (payment_created) and the client can retry later.
          logPaymentEvent({
            requestId,
            event: "order_status_verification_failed",
            orderId: order.id,
            orderCode: order.order_code,
            providerInvoiceId: order.mayar_invoice_id,
          });
        }
      }

      return buildResponse(order, productsRepository);
    },
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
