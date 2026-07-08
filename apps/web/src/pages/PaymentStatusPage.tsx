import { AlertTriangle, Ban, Check, Clock, Download, Headphones, Mail, MessageCircle, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { ApiClientError, getOrderStatus } from '../lib/api'
import { formatIdr } from '../lib/format'
import type { OrderStatusResponse } from '@warungkit/contracts'

const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 45_000

// UUID check only — never a stricter/looser check that might accidentally
// accept a malformed token and forward it to the backend.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The receipt token is only ever held in memory and sessionStorage — never
// localStorage (which would outlive the tab/session) — and the key is
// scoped per orderId so unrelated orders never share a token slot.
const sessionTokenKey = (orderId: string) => `warungkit:receipt-token:${orderId}`

function readTokenFromSessionStorage(orderId: string): string | null {
  try {
    return sessionStorage.getItem(sessionTokenKey(orderId))
  } catch {
    // sessionStorage can throw in locked-down/private-browsing contexts —
    // treat as "no stored token" rather than letting the page crash.
    return null
  }
}

function writeTokenToSessionStorage(orderId: string, token: string): void {
  try {
    sessionStorage.setItem(sessionTokenKey(orderId), token)
  } catch {
    // Best-effort only — if storage isn't available, the token still works
    // for this page load via the URL/in-memory value; it just won't survive
    // a reload after the URL is scrubbed.
  }
}

type ViewState =
  | { kind: 'missing-params' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; data: OrderStatusResponse }

const STATUS_META: Record<
  OrderStatusResponse['status'],
  { title: string; tone: 'pending' | 'success' | 'warning' | 'error' | 'neutral' }
> = {
  pending: { title: 'Menunggu Konfirmasi Pembayaran', tone: 'pending' },
  payment_created: { title: 'Menunggu Konfirmasi Pembayaran', tone: 'pending' },
  paid: { title: 'Pembayaran Berhasil', tone: 'success' },
  expired: { title: 'Pembayaran Kedaluwarsa', tone: 'warning' },
  failed: { title: 'Pembayaran Belum Berhasil', tone: 'error' },
  cancelled: { title: 'Pesanan Dibatalkan', tone: 'neutral' },
}

const TONE_ICON = {
  pending: Clock,
  success: Check,
  warning: AlertTriangle,
  error: XCircle,
  neutral: Ban,
} as const

// SECURITY (non-negotiable): payment state on this page is only ever
// populated from a validated GET /api/orders/:orderId response — never from
// the URL query parameters themselves, local state, mock/preview data, or a
// redirect back from the payment provider. A redirect is a UX event only,
// not proof of payment. The receipt token is read from the URL solely to
// forward it to the backend as a query parameter — it is never rendered,
// never logged, and never included in any error message.
export function PaymentStatusPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const urlToken = searchParams.get('token')

  const orderIdIsValid = Boolean(orderId && uuidPattern.test(orderId))
  const urlTokenIsValid = Boolean(urlToken && uuidPattern.test(urlToken))

  // Resolve the token once per orderId: prefer the URL (first load, direct
  // Mayar redirect), otherwise recover it from sessionStorage (e.g. a
  // reload after the URL has already been scrubbed). This runs during
  // render (not an effect) so the very first render already has the right
  // token — avoiding an extra "loading" flash — but it never re-runs once
  // resolved, since useState's initializer only executes on mount.
  const [token] = useState<string | null>(() => {
    if (!orderIdIsValid) return null
    if (urlTokenIsValid && urlToken) return urlToken
    return readTokenFromSessionStorage(orderId as string)
  })

  const hasValidParams = Boolean(orderId && orderIdIsValid && token && uuidPattern.test(token))

  const [view, setView] = useState<ViewState>(hasValidParams ? { kind: 'loading' } : { kind: 'missing-params' })
  const [pollingActive, setPollingActive] = useState(hasValidParams)
  const [manualChecking, setManualChecking] = useState(false)

  const pollStartRef = useRef<number>(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist the token (scoped to this orderId) and strip it from the
  // visible URL immediately after the first successful read — before any
  // network request, screenshot, or recording could capture it. This is a
  // plain history.replaceState, not a react-router navigation, so it never
  // triggers a reload or a re-render loop.
  useEffect(() => {
    if (!orderId || !orderIdIsValid || !urlTokenIsValid || !urlToken) return

    writeTokenToSessionStorage(orderId, urlToken)

    const scrubbedUrl = new URL(window.location.href)
    scrubbedUrl.searchParams.delete('token')
    window.history.replaceState(window.history.state, '', `${scrubbedUrl.pathname}${scrubbedUrl.search}`)
  }, [orderId, orderIdIsValid, urlToken, urlTokenIsValid])

  const fetchStatus = useCallback(async () => {
    if (!orderId || !token) return
    try {
      const data = await getOrderStatus(orderId, token)
      setView({ kind: 'result', data })
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : 'Terjadi kendala saat memeriksa status pesanan. Silakan coba lagi.'
      setView({ kind: 'error', message })
    }
  }, [orderId, token])

  useEffect(() => {
    if (!hasValidParams) return

    pollStartRef.current = Date.now()
    setPollingActive(true)

    // Initial fetch immediately.
    void fetchStatus()

    intervalRef.current = setInterval(() => {
      if (Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPollingActive(false)
        return
      }
      void fetchStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [hasValidParams, fetchStatus])

  async function handleManualCheck() {
    if (manualChecking) return
    setManualChecking(true)
    try {
      await fetchStatus()
    } finally {
      setManualChecking(false)
    }
  }

  if (view.kind === 'missing-params') {
    return (
      <>
        <SiteHeader />
        <main className="status-page section-shell">
          <Link to="/" className="back-link">← Kembali ke Beranda</Link>
          <section className="checkout-empty-state">
            <div className="checkout-empty-state__icon"><AlertTriangle size={34} /></div>
            <h1>Data Pesanan Tidak Lengkap</h1>
            <p>Tautan status pembayaran ini tidak lengkap atau tidak valid. Silakan kembali ke beranda dan gunakan tautan yang dikirimkan setelah checkout.</p>
            <Link className="button button--accent" to="/">Kembali ke Beranda</Link>
          </section>
        </main>
        <SiteFooter />
      </>
    )
  }

  if (view.kind === 'loading') {
    return (
      <>
        <SiteHeader />
        <main className="status-page section-shell">
          <Link to="/" className="back-link">← Kembali ke Beranda</Link>
          <div className="status-title"><p className="eyebrow">Memeriksa status</p><h1>Status Pembayaran</h1><p>Memuat status pesanan Anda…</p></div>
          <section className="success-card success-card--preview status-card--skeleton" aria-busy="true">
            <div className="skeleton-line skeleton-line--heading skeleton-line--centered" />
            <div className="skeleton-line skeleton-line--centered" />
          </section>
        </main>
        <SiteFooter />
      </>
    )
  }

  if (view.kind === 'error') {
    return (
      <>
        <SiteHeader />
        <main className="status-page section-shell">
          <Link to="/" className="back-link">← Kembali ke Beranda</Link>
          <div className="status-title"><p className="eyebrow">Terjadi kendala</p><h1>Status Pembayaran</h1><p>{view.message}</p></div>
          <div className="status-check-action">
            <button className="button button--ghost" onClick={handleManualCheck} disabled={manualChecking} aria-busy={manualChecking}>
              <RefreshCcw size={16} /> Cek Status Pembayaran
            </button>
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  const { data } = view
  const meta = STATUS_META[data.status]
  const Icon = TONE_ICON[meta.tone]
  const isPaid = data.status === 'paid'

  return (
    <>
      <SiteHeader />
      <main className="status-page section-shell">
        <Link to="/" className="back-link">← Kembali ke Beranda</Link>
        <div className="status-title">
          <p className="eyebrow">Status pesanan Anda</p>
          <h1>Status Pembayaran</h1>
          <p>Status ini berasal langsung dari verifikasi backend — bukan dari tautan atau redirect.</p>
        </div>
        <section className={`success-card success-card--${meta.tone}`}>
          <div className="success-icon"><Icon size={38} /></div>
          <h2>{meta.title}</h2>
          <p>
            {meta.tone === 'pending'
              ? 'Status final akan diperbarui otomatis setelah backend memverifikasi pembayaran melalui Mayar.'
              : meta.tone === 'success'
                ? 'Pesanan Anda telah dikonfirmasi. Detail pesanan akan dikirimkan ke email dan WhatsApp Anda.'
                : meta.tone === 'warning'
                  ? 'Batas waktu pembayaran untuk pesanan ini telah berakhir. Silakan lakukan checkout ulang.'
                  : meta.tone === 'error'
                    ? 'Pembayaran untuk pesanan ini belum berhasil diverifikasi. Silakan coba lagi atau hubungi dukungan.'
                    : 'Pesanan ini telah dibatalkan.'}
          </p>
          <div className="order-code"><span>Kode Pesanan</span><strong>{data.orderCode}</strong></div>
        </section>

        {pollingActive ? (
          <p className="polling-note">Memeriksa status pembayaran secara otomatis setiap 3 detik…</p>
        ) : (
          <div className="status-check-action">
            <button className="button button--ghost" onClick={handleManualCheck} disabled={manualChecking} aria-busy={manualChecking}>
              <RefreshCcw size={16} /> Cek Status Pembayaran
            </button>
          </div>
        )}

        <div className="status-stack">
          <section className="status-detail-card product-summary-card">
            <div className="status-product-art"><div className="phone phone--one"><div className="phone__bar" /></div><div className="phone phone--two"><div className="phone__bar" /></div></div>
            <div><p className="eyebrow">Ringkasan Produk</p><h2>{data.product.name}</h2></div>
            <div className="status-price"><span>Jumlah</span><b>1 Produk</b><span>Harga</span><strong>{formatIdr(data.amountIdr)}</strong></div>
          </section>
          <section className="status-detail-card customer-card">
            <div>
              <p className="eyebrow">Informasi Pelanggan</p>
              <p><Mail size={18} /><span>Email<b>{data.customer.maskedEmail}</b></span></p>
              <p><MessageCircle size={18} /><span>WhatsApp<b>{data.customer.maskedPhone}</b></span></p>
            </div>
            <div className="customer-shield"><ShieldCheck size={46} /></div>
          </section>
          <section className="status-detail-card transaction-card">
            <p className="eyebrow">Detail Transaksi</p>
            <div><span>Status</span><b className={`status-pill status-pill--${meta.tone}`}>{meta.title}</b></div>
            <div><span>Metode Pembayaran</span><b>{data.paymentMethod ?? 'Belum tersedia'}</b></div>
            <div><span>Waktu Pembayaran</span><b>{data.paidAt ?? 'Belum tersedia'}</b></div>
            <div><span>Total Pembayaran</span><strong>{formatIdr(data.amountIdr)}</strong></div>
          </section>
        </div>

        <div className="status-actions">
          <Link className="button button--accent" to="/#produk">Lihat Produk Lain</Link>
          {isPaid ? (
            // Paid-only placeholder — intentionally always disabled. No real
            // PDF download is implemented yet; this only communicates that
            // the feature is coming soon once a transaction is verified paid.
            <button className="button button--ghost" disabled aria-disabled="true" title="Bukti Pembayaran Segera Hadir">
              <Download size={17} /> Bukti Pembayaran Segera Hadir
            </button>
          ) : (
            <button className="button button--ghost" disabled aria-disabled="true">
              <Download size={17} /> Unduh Bukti Pembayaran
            </button>
          )}
        </div>
        <div className="support-banner"><Headphones size={26} /><div><h3>Butuh bantuan?</h3><p>Jika ada pertanyaan atau kendala, tim kami siap membantu Anda.</p></div><a href="mailto:hello@warungkit.id" className="button button--ghost button--small">Hubungi Support</a></div>
      </main>
      <SiteFooter />
    </>
  )
}
