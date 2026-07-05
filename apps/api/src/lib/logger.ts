// Structured operational logging only. Never log request bodies, customer
// PII, or secrets — only the fields listed below.
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
