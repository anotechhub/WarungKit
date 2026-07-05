import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckoutPage } from '../src/pages/CheckoutPage'
import * as useProductsModule from '../src/hooks/useProducts'
import * as apiModule from '../src/lib/api'
import { ApiClientError } from '../src/lib/api'

const realProduct = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'template-konten-instagram-umkm',
  name: 'Template Konten Instagram UMKM',
  description: 'Template konten Instagram siap pakai untuk promosi UMKM Anda.',
  price_idr: 49000,
  product_type: 'digital_product' as const,
  sort_order: 1,
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CheckoutPage />
    </MemoryRouter>,
  )
}

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText(/masukkan nama lengkap anda/i), { target: { value: 'Budi Santoso' } })
  fireEvent.change(screen.getByPlaceholderText(/masukkan email aktif anda/i), { target: { value: 'budi@example.com' } })
  fireEvent.change(screen.getByPlaceholderText(/08xxxxxxxxxx/i), { target: { value: '081234567890' } })
}

describe('CheckoutPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders a loading skeleton while products are being fetched', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({ products: [], loading: true, error: null })

    renderAt('/checkout?product=template-konten-instagram-umkm')

    expect(screen.getByText(/memuat data produk/i)).toBeInTheDocument()
  })

  it('renders product data sourced only from the API response, never a hardcoded fallback', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
      products: [realProduct],
      loading: false,
      error: null,
    })

    renderAt('/checkout?product=template-konten-instagram-umkm')

    expect(screen.getAllByText(realProduct.name).length).toBeGreaterThan(0)
    expect(screen.getAllByText(realProduct.description).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rp\s?49\.000/i).length).toBeGreaterThan(0)
  })

  it('renders "Produk tidak ditemukan" when the slug does not match any product', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
      products: [realProduct],
      loading: false,
      error: null,
    })

    renderAt('/checkout?product=slug-yang-tidak-ada')

    expect(screen.getByText(/produk tidak ditemukan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /kembali ke produk/i })).toBeInTheDocument()
    expect(screen.queryByText(/data pemesan/i)).not.toBeInTheDocument()
  })

  it('renders "Produk tidak ditemukan" when no product query parameter is present', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
      products: [realProduct],
      loading: false,
      error: null,
    })

    renderAt('/checkout')

    expect(screen.getByText(/produk tidak ditemukan/i)).toBeInTheDocument()
  })

  it('keeps the payment CTA disabled and labeled "Menunggu Integrasi Pembayaran" while VITE_CHECKOUT_ENABLED is false', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
      products: [realProduct],
      loading: false,
      error: null,
    })

    renderAt('/checkout?product=template-konten-instagram-umkm')

    const cta = screen.getByRole('button', { name: /menunggu integrasi pembayaran/i })
    expect(cta).toBeDisabled()
  })

  describe('when VITE_CHECKOUT_ENABLED=true', () => {
    function setup() {
      vi.stubEnv('VITE_CHECKOUT_ENABLED', 'true')
      vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
        products: [realProduct],
        loading: false,
        error: null,
      })
      renderAt('/checkout?product=template-konten-instagram-umkm')
      fillForm()
    }

    it('submits only the allowed fields with a matching idempotency key, and redirects only to response.paymentUrl', async () => {
      setup()
      const postCheckoutSpy = vi.spyOn(apiModule, 'postCheckout').mockResolvedValue({
        orderId: '22222222-2222-4222-8222-222222222222',
        orderCode: 'WK-TEST-ORDER',
        status: 'payment_created',
        paymentUrl: 'https://mayar.id/pay/abc',
        expiresAt: '2026-01-01T00:30:00.000Z',
        receiptToken: '33333333-3333-4333-8333-333333333333',
      })
      const assignSpy = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign: assignSpy })

      fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))

      await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('https://mayar.id/pay/abc'))

      const sentRequest = postCheckoutSpy.mock.calls[0]?.[0]
      expect(sentRequest).toEqual({
        productId: realProduct.id,
        customerName: 'Budi Santoso',
        customerEmail: 'budi@example.com',
        customerPhone: '081234567890',
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      })
      expect(sentRequest).not.toHaveProperty('price')
      expect(sentRequest).not.toHaveProperty('amount')
      expect(sentRequest).not.toHaveProperty('productName')
      expect(sentRequest).not.toHaveProperty('redirectUrl')
    })

    it('prevents duplicate submit while a request is in flight, showing "Menyiapkan Pembayaran..."', async () => {
      setup()
      let resolveCheckout: (value: Awaited<ReturnType<typeof apiModule.postCheckout>>) => void = () => {}
      vi.spyOn(apiModule, 'postCheckout').mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCheckout = resolve
          }),
      )
      vi.stubGlobal('location', { ...window.location, assign: vi.fn() })

      const submitButton = screen.getByRole('button', { name: /bayar sekarang/i })
      fireEvent.click(submitButton)

      expect(await screen.findByText(/menyiapkan pembayaran/i)).toBeInTheDocument()
      const busyButton = screen.getByRole('button', { name: /menyiapkan pembayaran/i })
      expect(busyButton).toBeDisabled()

      // A second click while in flight must not trigger a second call.
      fireEvent.click(busyButton)
      expect(apiModule.postCheckout).toHaveBeenCalledTimes(1)

      resolveCheckout({
        orderId: '22222222-2222-4222-8222-222222222222',
        orderCode: 'WK-TEST-ORDER',
        status: 'payment_created',
        paymentUrl: 'https://mayar.id/pay/abc',
        expiresAt: '2026-01-01T00:30:00.000Z',
        receiptToken: '33333333-3333-4333-8333-333333333333',
      })
    })

    it('reuses the same idempotency key when retrying with identical form data', async () => {
      setup()
      const postCheckoutSpy = vi
        .spyOn(apiModule, 'postCheckout')
        .mockRejectedValueOnce(new ApiClientError('Layanan bermasalah', 502, 'PAYMENT_PROVIDER_ERROR'))
        .mockResolvedValueOnce({
          orderId: '22222222-2222-4222-8222-222222222222',
          orderCode: 'WK-TEST-ORDER',
          status: 'payment_created',
          paymentUrl: 'https://mayar.id/pay/abc',
          expiresAt: '2026-01-01T00:30:00.000Z',
          receiptToken: '33333333-3333-4333-8333-333333333333',
        })
      vi.stubGlobal('location', { ...window.location, assign: vi.fn() })

      fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))
      await waitFor(() => expect(screen.getByText(/layanan pembayaran sedang bermasalah/i)).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))
      await waitFor(() => expect(postCheckoutSpy).toHaveBeenCalledTimes(2))

      const firstKey = postCheckoutSpy.mock.calls[0]?.[0]?.idempotencyKey
      const secondKey = postCheckoutSpy.mock.calls[1]?.[0]?.idempotencyKey
      expect(secondKey).toBe(firstKey)
    })

    it('shows a safe error message and does not redirect when the API call fails', async () => {
      setup()
      vi.spyOn(apiModule, 'postCheckout').mockRejectedValue(
        new ApiClientError('internal backend detail should not display', 400, 'VALIDATION_ERROR'),
      )
      const assignSpy = vi.fn()
      vi.stubGlobal('location', { ...window.location, assign: assignSpy })

      fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))

      await waitFor(() => expect(screen.getByText(/data yang anda masukkan belum valid/i)).toBeInTheDocument())
      expect(assignSpy).not.toHaveBeenCalled()
      expect(screen.queryByText(/internal backend detail/i)).not.toBeInTheDocument()
    })
  })
})
