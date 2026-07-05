import { Clock, Copy, Download, Headphones, Mail, MessageCircle, RefreshCcw, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { formatIdr, maskEmail, maskPhone } from '../lib/format'

// SECURITY (non-negotiable): payment state on this page must never be marked
// "paid" from the URL query parameter, local component state, mock/preview
// data, or a redirect back from the payment provider. A redirect is a UX
// event only, not proof of payment. Real payment state will be populated
// exclusively from GET /api/orders/:orderId (called with the order's receipt
// token) once the P8 backend is implemented — that endpoint currently
// returns 501 NOT_IMPLEMENTED, so this page renders an unverified/pending
// state unconditionally, regardless of what appears in the URL.
export function PaymentStatusPage() {
  const [searchParams] = useSearchParams()
  const isPreview = !searchParams.get('orderId')
  const previewEmail = maskEmail('laila@warungkit.id')
  const previewPhone = maskPhone('08123456789')

  return (
    <>
      <SiteHeader />
      <main className="status-page section-shell">
        <Link to="/" className="back-link">← Kembali ke Beranda</Link>
        <div className="status-title"><p className="eyebrow">Menunggu konfirmasi backend</p><h1>Status Pembayaran</h1><p>{isPreview ? 'Preview UI untuk status pembayaran yang akan dihubungkan ke API order pada P8.' : 'Status pesanan Anda akan tampil di sini setelah endpoint GET /api/orders/:orderId (P8) tersedia dan backend memverifikasi pembayaran.'}</p></div>
        <section className="success-card success-card--preview"><div className="success-icon"><Clock size={38} /></div><h2>Menunggu Konfirmasi Pembayaran</h2><p>Status final ("paid") hanya akan ditampilkan setelah backend memverifikasi pembayaran secara server-side melalui webhook Mayar dan GET /api/orders/:orderId — kehadiran orderId di URL bukan bukti pembayaran.</p><div className="order-code"><span>Contoh Kode Pesanan</span><strong>WK-PREVIEW-001</strong><button aria-label="Salin kode pesanan"><Copy size={16} /></button></div></section>
        <div className="status-check-action">
          <button className="button button--ghost" disabled aria-disabled="true" title="Menunggu endpoint GET /api/orders/:orderId (P8) — belum tersedia."><RefreshCcw size={16} /> Cek Status Pembayaran</button>
        </div>
        <div className="status-stack">
          <section className="status-detail-card product-summary-card"><div className="status-product-art"><div className="phone phone--one"><div className="phone__bar" /></div><div className="phone phone--two"><div className="phone__bar" /></div></div><div><p className="eyebrow">Ringkasan Produk (contoh)</p><h2>Template Konten Instagram UMKM</h2><ul><li>100+ template siap pakai</li><li>Desain modern dan editable</li><li>Cocok untuk berbagai jenis usaha</li></ul></div><div className="status-price"><span>Jumlah</span><b>1 Produk</b><span>Harga</span><strong>{formatIdr(49000)}</strong></div></section>
          <section className="status-detail-card customer-card"><div><p className="eyebrow">Informasi Pelanggan (contoh)</p><p><Mail size={18} /><span>Email<b>{previewEmail}</b></span></p><p><MessageCircle size={18} /><span>WhatsApp<b>{previewPhone}</b></span></p></div><div className="customer-shield"><ShieldCheck size={46} /></div></section>
          <section className="status-detail-card transaction-card"><p className="eyebrow">Detail Transaksi (contoh)</p><div><span>Status</span><b className="preview-pill">Menunggu Konfirmasi Pembayaran</b></div><div><span>Metode Pembayaran</span><b>QRIS</b></div><div><span>Waktu Pembayaran</span><b>Belum tersedia</b></div><div><span>Total Pembayaran</span><strong>{formatIdr(49000)}</strong></div></section>
          <section className="next-steps"><p className="eyebrow">Langkah Selanjutnya</p><div><article><span>1</span><Mail size={26} /><h3>Cek email konfirmasi</h3><p>Detail pesanan dikirimkan ke email Anda setelah pembayaran terverifikasi.</p></article><article><span>2</span><Download size={26} /><h3>Simpan bukti pembayaran</h3><p>Unduh dan simpan bukti setelah status pesanan terkonfirmasi.</p></article><article><span>3</span><Headphones size={26} /><h3>Pesanan diproses</h3><p>Sistem akan memproses pesanan Anda setelah status paid terverifikasi.</p></article></div></section>
        </div>
        <div className="status-actions"><Link className="button button--accent" to="/#produk">Lihat Produk Lain</Link><button className="button button--ghost" disabled aria-disabled="true"><Download size={17} /> Unduh Bukti Pembayaran</button></div>
        <div className="support-banner"><Headphones size={26} /><div><h3>Butuh bantuan?</h3><p>Jika ada pertanyaan atau kendala, tim kami siap membantu Anda.</p></div><a href="mailto:hello@warungkit.id" className="button button--ghost button--small">Hubungi Support</a></div>
      </main>
      <SiteFooter />
    </>
  )
}
