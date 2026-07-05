// Structured operational logging only. Never log request bodies, customer
// PII (email, phone), secrets, receipt tokens, or raw provider payloads —
// only the fields listed below.
export interface RequestLogFields {
  requestId: string;
  method: string;
  path: string;
  status: number;
  elapsedMs: number;
}

export function logRequest(fields: RequestLogFields): void {
  console.log(
    JSON.stringify({
      requestId: fields.requestId,
      method: fields.method,
      path: fields.path,
      status: fields.status,
      elapsedMs: fields.elapsedMs,
    }),
  );
}

// Non-sensitive payment/order operational events — orderId/orderCode are
// safe to log (they are not secrets and do not identify a person on their
// own); provider invoice IDs are safe (opaque Mayar-side identifiers).
// Never pass customer name/email/phone/receipt token/API keys/raw payloads
// into this helper.
export interface PaymentEventLogFields {
  requestId: string;
  event: string;
  orderId?: string;
  orderCode?: string;
  providerInvoiceId?: string;
  processingResult?: string;
}

export function logPaymentEvent(fields: PaymentEventLogFields): void {
  console.log(
    JSON.stringify({
      requestId: fields.requestId,
      event: fields.event,
      orderId: fields.orderId,
      orderCode: fields.orderCode,
      providerInvoiceId: fields.providerInvoiceId,
      processingResult: fields.processingResult,
    }),
  );
}
