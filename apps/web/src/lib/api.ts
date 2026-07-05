import {
  apiErrorResponseSchema,
  checkoutResponseSchema,
  orderStatusResponseSchema,
  productListResponseSchema,
  type CheckoutRequest,
  type CheckoutResponse,
  type OrderStatusResponse,
  type Product,
} from '@warungkit/contracts'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''

const endpoint = (path: string) => `${apiBaseUrl}${path}`

// A safe, frontend-facing error. `code` mirrors the backend ApiError code
// when one was present in a validated error response, so callers can branch
// on known codes (VALIDATION_ERROR, PRODUCT_NOT_FOUND, CHECKOUT_CONFLICT,
// PAYMENT_PROVIDER_ERROR, CONFIGURATION_ERROR, ...) without ever needing the
// raw backend payload, stack trace, or provider response body — those are
// never captured here in the first place.
export class ApiClientError extends Error {
  readonly status: number
  readonly code: string | null
  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Safe, user-facing message only — never surface backend internals, stack
// traces, or the raw unexpected payload shape to the UI. The backend's own
// ApiError.message text is intentionally NOT forwarded to the UI here —
// only its `code` is trusted, so a page can pick its own safe, localized
// copy per code (see ERROR_MESSAGES in CheckoutPage.tsx). This is a
// defense-in-depth measure independent of whatever the backend happens to
// put in that field.
const MALFORMED_RESPONSE_MESSAGE = 'Format data dari server tidak valid. Silakan coba lagi.'
const GENERIC_REQUEST_FAILED_MESSAGE = 'Permintaan tidak dapat diproses. Silakan coba lagi.'

// Reads only the safe `code` field from a non-2xx response body using the
// shared ApiError contract. The backend's free-text `message` is never
// propagated to the UI — only a small, known set of codes are ever branched
// on by callers, each with their own fixed, safe copy.
async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.json()
    const parsed = apiErrorResponseSchema.safeParse(payload)
    if (parsed.success) {
      return parsed.data.error.code
    }
  } catch {
    // Body wasn't JSON or didn't parse — no code available.
  }
  return null
}

export async function getProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(endpoint('/api/products'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    const code = await readErrorCode(response)
    throw new ApiClientError('Katalog belum dapat dimuat. Silakan coba lagi.', response.status, code)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  // Validate the response against the shared Zod contract — never rely on a
  // shallow Array.isArray check or an unsafe `as Product[]` cast. Any shape
  // drift from the backend contract is rejected here with a safe message
  // rather than propagated as untrusted data into the UI.
  const parsed = productListResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  return parsed.data
}

// POST /api/checkout. The request body only ever contains the fields the
// backend contract accepts (productId, customerName, customerEmail,
// customerPhone, idempotencyKey) — price, amount, product name, status, a
// redirect URL, and arbitrary metadata are never sent from the browser.
export async function postCheckout(
  request: CheckoutRequest,
  signal?: AbortSignal,
): Promise<CheckoutResponse> {
  const response = await fetch(endpoint('/api/checkout'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Idempotency-Key': request.idempotencyKey,
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const code = await readErrorCode(response)
    throw new ApiClientError(GENERIC_REQUEST_FAILED_MESSAGE, response.status, code)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  const parsed = checkoutResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  return parsed.data
}

// GET /api/orders/:orderId?token=<receiptToken>. The token is only ever
// forwarded to the backend as a query parameter here — it is never logged,
// never included in any thrown error message, and never displayed.
export async function getOrderStatus(
  orderId: string,
  token: string,
  signal?: AbortSignal,
): Promise<OrderStatusResponse> {
  const url = `${endpoint(`/api/orders/${encodeURIComponent(orderId)}`)}?token=${encodeURIComponent(token)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    const code = await readErrorCode(response)
    throw new ApiClientError(GENERIC_REQUEST_FAILED_MESSAGE, response.status, code)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  const parsed = orderStatusResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiClientError(MALFORMED_RESPONSE_MESSAGE, 502)
  }

  return parsed.data
}

export const getApiBaseUrl = () => apiBaseUrl || '/api (Vite proxy)'
