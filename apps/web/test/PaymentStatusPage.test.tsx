import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PaymentStatusPage } from '../src/pages/PaymentStatusPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PaymentStatusPage />
    </MemoryRouter>,
  )
}

describe('PaymentStatusPage', () => {
  it('never claims a paid/success state in preview mode (no orderId)', () => {
    renderAt('/payment-status')

    expect(screen.queryByText(/pembayaran berhasil/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/menunggu konfirmasi pembayaran/i).length).toBeGreaterThan(0)
  })

  it('never claims a paid/success state even when an orderId query parameter is present', () => {
    // This is the critical regression guard: an attacker or a user typing a
    // URL by hand can set any orderId value here. The page must not treat
    // that as proof of payment.
    renderAt('/payment-status?orderId=WK-ANYTHING-000')

    expect(screen.queryByText(/pembayaran berhasil/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^paid$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/menunggu konfirmasi pembayaran/i).length).toBeGreaterThan(0)
  })

  it('shows a disabled manual "Cek Status Pembayaran" action instead of live polling', () => {
    renderAt('/payment-status?orderId=WK-ANYTHING-000')

    const checkButton = screen.getByRole('button', { name: /cek status pembayaran/i })
    expect(checkButton).toBeDisabled()
  })

  it('keeps the download receipt action disabled regardless of URL state', () => {
    renderAt('/payment-status?orderId=WK-ANYTHING-000')

    const downloadButton = screen.getByRole('button', { name: /unduh bukti pembayaran/i })
    expect(downloadButton).toBeDisabled()
  })
})
