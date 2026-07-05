import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@warungkit/contracts";

// Internal-only row shape — never returned to the client as-is. Contains
// customer PII (name, email, phone) and the receipt token; the service
// layer is responsible for masking/stripping before any response leaves
// the backend.
export interface OrderRecord {
  id: string;
  order_code: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount_idr: number;
  status: OrderStatus;
  mayar_invoice_id: string | null;
  mayar_invoice_url: string | null;
  receipt_token: string;
  paid_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
}

export interface CreateOrderInput {
  orderCode: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amountIdr: number;
  receiptToken: string;
}

export interface OrdersRepository {
  createPendingOrder(input: CreateOrderInput): Promise<OrderRecord>;
  findById(orderId: string): Promise<OrderRecord | null>;
  findByMayarInvoiceId(mayarInvoiceId: string): Promise<OrderRecord | null>;
  findByOrderCode(orderCode: string): Promise<OrderRecord | null>;
  markPaymentCreated(
    orderId: string,
    fields: { mayarInvoiceId: string; mayarInvoiceUrl: string; expiresAt: string },
  ): Promise<void>;
  updateStatus(
    orderId: string,
    fields: { status: OrderStatus; paidAt?: string | null },
  ): Promise<void>;
}

// All database access for orders lives here. Services must never query
// Supabase directly for order data — this is the only module aware of the
// `orders` table's column names.
export function createOrdersRepository(client: SupabaseClient): OrdersRepository {
  return {
    async createPendingOrder(input: CreateOrderInput): Promise<OrderRecord> {
      const { data, error } = await client
        .from("orders")
        .insert({
          order_code: input.orderCode,
          product_id: input.productId,
          customer_name: input.customerName,
          customer_email: input.customerEmail,
          customer_phone: input.customerPhone,
          amount_idr: input.amountIdr,
          status: "pending",
          receipt_token: input.receiptToken,
        })
        .select(
          "id, order_code, product_id, customer_name, customer_email, customer_phone, amount_idr, status, mayar_invoice_id, mayar_invoice_url, receipt_token, paid_at, expires_at, metadata",
        )
        .single();

      if (error || !data) {
        throw new Error("orders_repository_create_failed");
      }

      return data as OrderRecord;
    },

    async findById(orderId: string): Promise<OrderRecord | null> {
      const { data, error } = await client
        .from("orders")
        .select(
          "id, order_code, product_id, customer_name, customer_email, customer_phone, amount_idr, status, mayar_invoice_id, mayar_invoice_url, receipt_token, paid_at, expires_at, metadata",
        )
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        throw new Error("orders_repository_query_failed");
      }

      return (data as OrderRecord | null) ?? null;
    },

    async findByMayarInvoiceId(mayarInvoiceId: string): Promise<OrderRecord | null> {
      const { data, error } = await client
        .from("orders")
        .select(
          "id, order_code, product_id, customer_name, customer_email, customer_phone, amount_idr, status, mayar_invoice_id, mayar_invoice_url, receipt_token, paid_at, expires_at, metadata",
        )
        .eq("mayar_invoice_id", mayarInvoiceId)
        .maybeSingle();

      if (error) {
        throw new Error("orders_repository_query_failed");
      }

      return (data as OrderRecord | null) ?? null;
    },

    async findByOrderCode(orderCode: string): Promise<OrderRecord | null> {
      const { data, error } = await client
        .from("orders")
        .select(
          "id, order_code, product_id, customer_name, customer_email, customer_phone, amount_idr, status, mayar_invoice_id, mayar_invoice_url, receipt_token, paid_at, expires_at, metadata",
        )
        .eq("order_code", orderCode)
        .maybeSingle();

      if (error) {
        throw new Error("orders_repository_query_failed");
      }

      return (data as OrderRecord | null) ?? null;
    },

    async markPaymentCreated(orderId, fields): Promise<void> {
      const { error } = await client
        .from("orders")
        .update({
          status: "payment_created",
          mayar_invoice_id: fields.mayarInvoiceId,
          mayar_invoice_url: fields.mayarInvoiceUrl,
          expires_at: fields.expiresAt,
        })
        .eq("id", orderId);

      if (error) {
        throw new Error("orders_repository_update_failed");
      }
    },

    async updateStatus(orderId, fields): Promise<void> {
      const { error } = await client
        .from("orders")
        .update({
          status: fields.status,
          ...(fields.paidAt !== undefined ? { paid_at: fields.paidAt } : {}),
        })
        .eq("id", orderId);

      if (error) {
        throw new Error("orders_repository_update_failed");
      }
    },
  };
}
