import { z } from "zod";
import type { MayarRuntimeConfig } from "../config/env";

// Verified against Mayar's documented canonical response examples for
// `POST /invoice/create` and `GET /invoice/{id}` (P8-A.1 reconciliation).
// `data` is documented as a single object. Some ambiguous doc text has
// suggested an array in the past — we allow a one-item array as a narrow,
// explicit compatibility fallback only, and reject every other shape.
const invoiceCreateDataSchema = z.object({
  id: z.string(),
  transactionId: z.string().optional(),
  link: z.string().url(),
  expiredAt: z.number(),
  extraData: z
    .object({
      noCustomer: z.string().optional(),
      idProd: z.string().optional(),
    })
    .partial()
    .optional(),
});

const createInvoiceResponseSchema = z.object({
  statusCode: z.number().optional(),
  messages: z.string().optional(),
  data: z.union([invoiceCreateDataSchema, z.array(invoiceCreateDataSchema).length(1)]),
});

// Documented canonical response for GET /invoice/{id}. `status` is a plain
// string field (e.g. "unpaid", "paid", "expired") — normalized to lowercase
// before being handed to the status mapper.
const invoiceDetailDataSchema = z.object({
  id: z.string(),
  amount: z.number().optional(),
  status: z.string().optional(),
  expiredAt: z.number().optional(),
  paymentUrl: z.string().optional(),
  paymentLinkId: z.string().optional(),
});

const invoiceDetailResponseSchema = z.object({
  statusCode: z.number().optional(),
  messages: z.string().optional(),
  data: z.union([invoiceDetailDataSchema, z.array(invoiceDetailDataSchema).length(1)]),
});

// Narrows Mayar's documented single-object `data` shape, or the one-item
// array compatibility fallback, down to the plain object in both cases.
function unwrapData<T>(data: T | T[]): T {
  if (Array.isArray(data)) {
    return data[0] as T;
  }
  return data;
}

export interface CreateInvoiceInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  redirectUrl: string;
  description: string;
  expiredAt: string;
  amountIdr: number;
  productName: string;
  orderCode: string;
  productId: string;
  orderId: string;
}

export interface CreateInvoiceResult {
  invoiceId: string;
  paymentUrl: string;
  expiresAt: string;
}

export interface InvoiceDetailResult {
  invoiceId: string;
  providerStatus: string | null;
}

export interface MayarService {
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailResult>;
}

// Every Mayar API call is isolated inside this module. Routes and other
// services must never call `fetch` against MAYAR_API_BASE_URL directly, and
// the frontend must never receive MAYAR_API_KEY or call Mayar itself.
export function createMayarService(config: MayarRuntimeConfig): MayarService {
  async function callMayar(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${config.mayarApiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${config.mayarApiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  return {
    async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
      const response = await callMayar("/invoice/create", {
        method: "POST",
        body: JSON.stringify({
          name: input.customerName,
          email: input.customerEmail,
          mobile: input.customerPhone,
          redirectUrl: input.redirectUrl,
          description: input.description,
          expiredAt: input.expiredAt,
          items: [
            {
              quantity: 1,
              rate: input.amountIdr,
              description: input.productName,
            },
          ],
          extraData: {
            noCustomer: input.orderCode,
            idProd: input.productId,
            orderId: input.orderId,
          },
        }),
      });

      if (!response.ok) {
        // Never surface the raw provider response body/status text upward —
        // the caller (checkout service) translates this into a generic,
        // safe PAYMENT_PROVIDER_ERROR for the client.
        throw new Error("mayar_create_invoice_failed");
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new Error("mayar_create_invoice_invalid_response");
      }

      const parsed = createInvoiceResponseSchema.safeParse(json);
      if (!parsed.success) {
        // Reject every unexpected shape safely — no raw body in the error.
        throw new Error("mayar_create_invoice_invalid_response");
      }

      const data = unwrapData<z.infer<typeof invoiceCreateDataSchema>>(parsed.data.data);

      return {
        invoiceId: data.id,
        paymentUrl: data.link,
        // data.expiredAt is documented as epoch milliseconds — convert to
        // the ISO-8601 timestamp WarungKit's CheckoutResponse/DB expect.
        expiresAt: new Date(data.expiredAt).toISOString(),
      };
    },

    async getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailResult> {
      const response = await callMayar(`/invoice/${encodeURIComponent(invoiceId)}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("mayar_get_invoice_detail_failed");
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new Error("mayar_get_invoice_detail_invalid_response");
      }

      const parsed = invoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("mayar_get_invoice_detail_invalid_response");
      }

      const data = unwrapData<z.infer<typeof invoiceDetailDataSchema>>(parsed.data.data);

      return {
        invoiceId: data.id,
        // Normalized to lowercase here so the status mapper can do a
        // simple, exact-match lookup — never inferred from anything else
        // (transactionId presence, paymentUrl presence, etc.).
        providerStatus: data.status ? data.status.toLowerCase() : null,
      };
    },
  };
}
