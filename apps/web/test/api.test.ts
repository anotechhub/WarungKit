import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, getOrderStatus, getProducts, postCheckout } from '../src/lib/api'
import type { CheckoutRequest } from '@warungkit/contracts'

const validProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'template-konten-instagram-umkm',
  name: 'Template Konten Instagram UMKM',
  description: 'Template konten Instagram siap pakai untuk promosi UMKM Anda.',
  price_idr: 49000,
  product_type: 'digital_product',
  sort_order: 1,
}

const validCheckoutRequest: CheckoutRequest = {
  productId: validProduct.id,
  customerName: 'Budi Santoso',
  customerEmail: 'budi@example.com',
  customerPhone: '081234567890',
  idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
}

const validCheckoutResponse = {
  orderId: '22222222-2222-4222-8222-222222222222',
  orderCode: 'WK-TEST-ORDER',
  status: 'payment_created' as const,
  paymentUrl: 'https://mayar.id/pay/abc',
  expiresAt: '2026-01-01T00:30:00.000Z',
  receiptToken: '33333333-3333-4333-8333-333333333333',
}

const validOrderStatusResponse = {
  orderId: '22222222-2222-4222-8222-222222222222',
  orderCode: 'WK-TEST-ORDER',
  product: { name: validProduct.name, slug: validProduct.slug, productType: 'digital_product' as const },
  amountIdr: 49000,
  status: 'pending' as const,
  paidAt: null,
  expiresAt: null,
  paymentMethod: null,
  customer: { maskedEmail: 'bu**@example.com', maskedPhone: '081***90' },
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true
  const status = init.status ?? (ok ? 200 : 500)
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('getProducts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a valid product list payload', async () => {
    mockFetchOnce([validProduct])

    const products = await getProducts()

    expect(products).toEqual([validProduct])
  })

  it('rejects a malformed payload (missing required field) with a safe error, no raw payload leaked', async () => {
    const malformed = [{ ...validProduct, price_idr: undefined }]
    mockFetchOnce(malformed)

    await expect(getProducts()).rejects.toMatchObject({
      message: expect.stringMatching(/format data dari server tidak valid/i),
    })
  })

  it('rejects a payload that is not an array at all', async () => {
    mockFetchOnce({ unexpected: 'shape' })

    const error = await getProducts().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).message).not.toMatch(/unexpected/i)
  })

  it('surfaces a safe, fixed error when the HTTP response is not ok — never the backend message text', async () => {
    mockFetchOnce({ error: { code: 'INTERNAL_ERROR', message: 'db explosion at line 42', requestId: 'x' } }, { ok: false, status: 500 })

    const error = await getProducts().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).message).not.toMatch(/db explosion|line 42/i)
    expect((error as ApiClientError).code).toBe('INTERNAL_ERROR')
  })
})

describe('postCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends only the allowed fields and the matching X-Idempotency-Key header', async () => {
    const fetchMock = mockFetchOnce(validCheckoutResponse)

    await postCheckout(validCheckoutRequest)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const sentBody = JSON.parse(init.body as string)

    expect(Object.keys(sentBody).sort()).toEqual(
      ['productId', 'customerName', 'customerEmail', 'customerPhone', 'idempotencyKey'].sort(),
    )
    expect(sentBody).not.toHaveProperty('price')
    expect(sentBody).not.toHaveProperty('amount')
    expect(sentBody).not.toHaveProperty('status')
    expect(sentBody).not.toHaveProperty('redirectUrl')
    expect(sentBody).not.toHaveProperty('metadata')

    const headers = init.headers as Record<string, string>
    expect(headers['X-Idempotency-Key']).toBe(validCheckoutRequest.idempotencyKey)
    expect(sentBody.idempotencyKey).toBe(validCheckoutRequest.idempotencyKey)
  })

  it('validates the response with the shared CheckoutResponse contract', async () => {
    mockFetchOnce(validCheckoutResponse)

    const result = await postCheckout(validCheckoutRequest)

    expect(result).toEqual(validCheckoutResponse)
  })

  it('rejects an invalid/malformed CheckoutResponse safely', async () => {
    mockFetchOnce({ orderId: 'not-a-uuid', status: 'paid' })

    const error = await postCheckout(validCheckoutRequest).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).message).toMatch(/format data dari server tidak valid/i)
  })

  it('surfaces the error code without the backend message text on failure', async () => {
    mockFetchOnce(
      { error: { code: 'CHECKOUT_CONFLICT', message: 'internal detail should not leak', requestId: 'x' } },
      { ok: false, status: 409 },
    )

    const error = await postCheckout(validCheckoutRequest).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).code).toBe('CHECKOUT_CONFLICT')
    expect((error as ApiClientError).message).not.toMatch(/internal detail/i)
  })
})

describe('getOrderStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the endpoint with orderId and token as a query parameter, and validates the response', async () => {
    const fetchMock = mockFetchOnce(validOrderStatusResponse)

    const result = await getOrderStatus('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333')

    expect(result).toEqual(validOrderStatusResponse)
    const [calledUrl] = fetchMock.mock.calls[0] as [string]
    expect(calledUrl).toContain('/api/orders/22222222-2222-4222-8222-222222222222')
    expect(calledUrl).toContain('token=33333333-3333-4333-8333-333333333333')
  })

  it('rejects a malformed OrderStatusResponse safely', async () => {
    mockFetchOnce({ orderId: 'not-a-uuid' })

    await expect(getOrderStatus('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333')).rejects.toMatchObject(
      { message: expect.stringMatching(/format data dari server tidak valid/i) },
    )
  })
})
