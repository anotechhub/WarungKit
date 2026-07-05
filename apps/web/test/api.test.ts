import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, getProducts } from '../src/lib/api'

const validProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'template-konten-instagram-umkm',
  name: 'Template Konten Instagram UMKM',
  description: 'Template konten Instagram siap pakai untuk promosi UMKM Anda.',
  price_idr: 49000,
  product_type: 'digital_product',
  sort_order: 1,
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true
  const status = init.status ?? (ok ? 200 : 500)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  )
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
      message: expect.stringMatching(/format data katalog tidak valid/i),
    })
  })

  it('rejects a payload that is not an array at all', async () => {
    mockFetchOnce({ unexpected: 'shape' })

    const error = await getProducts().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).message).not.toMatch(/unexpected/i)
  })

  it('surfaces a safe error when the HTTP response is not ok, without exposing backend detail', async () => {
    mockFetchOnce({ error: { code: 'INTERNAL_ERROR', message: 'db explosion at line 42', requestId: 'x' } }, { ok: false, status: 500 })

    const error = await getProducts().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).message).not.toMatch(/db explosion|line 42/i)
  })
})
