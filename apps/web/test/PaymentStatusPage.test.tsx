import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentStatusPage } from '../src/pages/PaymentStatusPage'
import * as apiModule from '../src/lib/api'

const validOrderId = '22222222-2222-4222-8222-222222222222'
const validToken = '33333333-3333-4333-8333-333333333333'

function renderAt(path: string) {
  // Keep the real jsdom window.location/history in sync with the
  // MemoryRouter entry — PaymentStatusPage reads/mutates window.location
  // directly (via history.replaceState) to scrub the token from the
  // visible URL, independently of react-router's own in-memory history.
  window.history.replaceState(null, '', path)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PaymentStatusPage />
    </MemoryRouter>,
  )
}

function buildOrderStatus(overrides: Partial<Awaited<ReturnType<typeof apiModule.getOrderStatus>>> = {}) {
  return {
    orderId: validOrderId,
    orderCode: 'WK-TEST-ORDER',
    product: { name: 'Template Konten Instagram UMKM', slug: 'template-konten-instagram-umkm', productType: 'digital_product' as const },
    amountIdr: 49000,
    status: 'pending' as const,
    paidAt: null,
    expiresAt: null,
    paymentMethod: null,
    customer: { maskedEmail: 'bu**@example.com', maskedPhone: '081***90' },
    ...overrides,
  }
}

describe('PaymentStatusPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    sessionStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('shows "Data Pesanan Tidak Lengkap" and never calls the API when orderId or token is missing', () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus')

    renderAt('/payment-status')

    expect(screen.getByText(/data pesanan tidak lengkap/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /kembali ke beranda/i }).length).toBeGreaterThan(0)
    expect(getOrderStatusSpy).not.toHaveBeenCalled()
  })

  it('shows "Data Pesanan Tidak Lengkap" and never calls the API when orderId/token are not valid UUIDs', () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus')

    renderAt('/payment-status?orderId=WK-ANYTHING-000&token=also-not-a-uuid')

    expect(screen.getByText(/data pesanan tidak lengkap/i)).toBeInTheDocument()
    expect(getOrderStatusSpy).not.toHaveBeenCalled()
  })

  it('never renders a paid/success claim before a validated API response arrives', async () => {
    let resolveStatus: (value: ReturnType<typeof buildOrderStatus>) => void = () => {}
    vi.spyOn(apiModule, 'getOrderStatus').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve
        }),
    )

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(screen.queryByText(/pembayaran berhasil/i)).not.toBeInTheDocument()

    resolveStatus(buildOrderStatus({ status: 'pending' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /menunggu konfirmasi pembayaran/i })).toBeInTheDocument())
    expect(screen.queryByText(/^pembayaran berhasil$/i)).not.toBeInTheDocument()
  })

  it('shows the paid UI only after a validated response with status "paid"', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'paid', paidAt: '2026-01-01T00:10:00.000Z' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(await screen.findByRole('heading', { name: /^pembayaran berhasil$/i })).toBeInTheDocument()
  })

  it('shows the expired UI for status "expired"', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'expired' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(await screen.findByRole('heading', { name: /pembayaran kedaluwarsa/i })).toBeInTheDocument()
  })

  it('shows the failed UI for status "failed"', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'failed' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(await screen.findByRole('heading', { name: /pembayaran belum berhasil/i })).toBeInTheDocument()
  })

  it('shows the cancelled UI for status "cancelled"', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'cancelled' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(await screen.findByRole('heading', { name: /pesanan dibatalkan/i })).toBeInTheDocument()
  })

  it('never displays the receipt token anywhere in the rendered UI', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    const { container } = renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    await waitFor(() => expect(screen.getByRole('heading', { name: /menunggu konfirmasi pembayaran/i })).toBeInTheDocument())
    expect(container.innerHTML).not.toContain(validToken)
  })

  it('displays only masked email/phone from the backend response', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(await screen.findByText('bu**@example.com')).toBeInTheDocument()
    expect(screen.getByText('081***90')).toBeInTheDocument()
  })

  it('shows the paid-only placeholder "Bukti Pembayaran Segera Hadir" and keeps it non-functional', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'paid' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    const button = await screen.findByRole('button', { name: /bukti pembayaran segera hadir/i })
    expect(button).toBeDisabled()
  })
})

describe('PaymentStatusPage — URL token hygiene', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    sessionStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('stores the receipt token in sessionStorage, scoped to the orderId, on first load', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /menunggu konfirmasi pembayaran/i })).toBeInTheDocument(),
    )

    expect(sessionStorage.getItem(`warungkit:receipt-token:${validOrderId}`)).toBe(validToken)
  })

  it('replaces the browser URL to drop the token while keeping orderId, without reloading', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.get('orderId')).toBe(validOrderId)
      expect(url.searchParams.has('token')).toBe(false)
    })
  })

  it('still calls the backend order status API with the token internally after the URL is scrubbed', async () => {
    const getOrderStatusSpy = vi
      .spyOn(apiModule, 'getOrderStatus')
      .mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    await waitFor(() => expect(getOrderStatusSpy).toHaveBeenCalledWith(validOrderId, validToken))
  })

  it('recovers the token from sessionStorage and loads successfully when the URL only has orderId (reload-like flow)', async () => {
    sessionStorage.setItem(`warungkit:receipt-token:${validOrderId}`, validToken)
    const getOrderStatusSpy = vi
      .spyOn(apiModule, 'getOrderStatus')
      .mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}`)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /menunggu konfirmasi pembayaran/i })).toBeInTheDocument(),
    )
    expect(getOrderStatusSpy).toHaveBeenCalledWith(validOrderId, validToken)
  })

  it('shows "Data Pesanan Tidak Lengkap" and never calls the API when the URL has only orderId and sessionStorage has no matching token', () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus')

    renderAt(`/payment-status?orderId=${validOrderId}`)

    expect(screen.getByText(/data pesanan tidak lengkap/i)).toBeInTheDocument()
    expect(getOrderStatusSpy).not.toHaveBeenCalled()
  })

  it('never renders the receipt token in the DOM, even immediately on first load before the URL is scrubbed', async () => {
    vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    const { container } = renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    expect(container.innerHTML).not.toContain(validToken)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /menunggu konfirmasi pembayaran/i })).toBeInTheDocument(),
    )
    expect(container.innerHTML).not.toContain(validToken)
  })

  it('the manual "Cek Status Pembayaran" recheck still uses the resolved token after the URL is scrubbed', async () => {
    vi.useFakeTimers()
    const getOrderStatusSpy = vi
      .spyOn(apiModule, 'getOrderStatus')
      .mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)
    await vi.waitFor(() => expect(getOrderStatusSpy).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(45_000)

    const manualButton = screen.getByRole('button', { name: /cek status pembayaran/i })
    fireEvent.click(manualButton)

    await vi.waitFor(() =>
      expect(getOrderStatusSpy).toHaveBeenLastCalledWith(validOrderId, validToken),
    )
  })
})

describe('PaymentStatusPage — polling behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('polls every 3 seconds after the initial fetch', async () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)

    await vi.waitFor(() => expect(getOrderStatusSpy).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(3_000)
    expect(getOrderStatusSpy).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(getOrderStatusSpy).toHaveBeenCalledTimes(3)
  })

  it('stops automatic polling after 45 seconds and shows an enabled manual check button', async () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)
    await vi.waitFor(() => expect(getOrderStatusSpy).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(45_000)

    const callsAtTimeout = getOrderStatusSpy.mock.calls.length
    await vi.advanceTimersByTimeAsync(9_000)
    // No further automatic calls after the 45s window closes.
    expect(getOrderStatusSpy.mock.calls.length).toBe(callsAtTimeout)

    const manualButton = screen.getByRole('button', { name: /cek status pembayaran/i })
    expect(manualButton).toBeEnabled()
  })

  it('the manual "Cek Status Pembayaran" button triggers exactly one re-check', async () => {
    const getOrderStatusSpy = vi.spyOn(apiModule, 'getOrderStatus').mockResolvedValue(buildOrderStatus({ status: 'pending' }))

    renderAt(`/payment-status?orderId=${validOrderId}&token=${validToken}`)
    await vi.waitFor(() => expect(getOrderStatusSpy).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(45_000)
    const callsAfterTimeout = getOrderStatusSpy.mock.calls.length

    const manualButton = screen.getByRole('button', { name: /cek status pembayaran/i })
    fireEvent.click(manualButton)

    await vi.waitFor(() => expect(getOrderStatusSpy.mock.calls.length).toBe(callsAfterTimeout + 1))
  })
})
