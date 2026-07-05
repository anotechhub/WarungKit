import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckoutPage } from '../src/pages/CheckoutPage'
import * as useProductsModule from '../src/hooks/useProducts'

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

describe('CheckoutPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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

  it('keeps the payment CTA disabled and labeled "Menunggu Integrasi Pembayaran"', () => {
    vi.spyOn(useProductsModule, 'useProducts').mockReturnValue({
      products: [realProduct],
      loading: false,
      error: null,
    })

    renderAt('/checkout?product=template-konten-instagram-umkm')

    const cta = screen.getByRole('button', { name: /menunggu integrasi pembayaran/i })
    expect(cta).toBeDisabled()
  })
})
