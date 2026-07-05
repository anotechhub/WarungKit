const REQUEST_ID_HEADER = "X-Request-Id";

// Loose UUID check — accepts standard UUID v1-v5 shapes. We don't need to
// enforce a specific version since we only need "looks like a safe opaque
// identifier", not cryptographic validation.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveRequestId(incoming: string | null | undefined): string {
  if (incoming && UUID_PATTERN.test(incoming.trim())) {
    return incoming.trim();
  }
  return crypto.randomUUID();
}

export { REQUEST_ID_HEADER };
