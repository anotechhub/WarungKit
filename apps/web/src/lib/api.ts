import { productListResponseSchema, type Product } from '@warungkit/contracts'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''

const endpoint = (path: string) => `${apiBaseUrl}${path}`

export class ApiClientError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Safe, user-facing message only — never surface backend internals, stack
// traces, or the raw unexpected payload shape to the UI.
const MALFORMED_RESPONSE_MESSAGE = 'Format data katalog tidak valid. Silakan coba lagi.'

export async function getProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(endpoint('/api/products'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new ApiClientError('Katalog belum dapat dimuat. Silakan coba lagi.', response.status)
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

export const getApiBaseUrl = () => apiBaseUrl || '/api (Vite proxy)'
