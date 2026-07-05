// SHA-256 hashing via the Web Crypto API (available natively in the
// Workers runtime — no external dependency needed).
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Stable hash of the checkout request data relevant to idempotency
// comparison — used to detect "same key, same request" vs. "same key,
// different request" (which must be rejected as a conflict).
export async function hashCheckoutRequest(input: {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<string> {
  const stable = JSON.stringify({
    productId: input.productId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
  });
  return sha256Hex(stable);
}
