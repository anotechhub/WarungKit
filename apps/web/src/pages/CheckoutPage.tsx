import { ArrowLeft, CheckCircle2, Circle, CreditCard, Landmark, LockKeyhole, PackageSearch, QrCode, ShieldCheck, WalletCards } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductVisual } from '../components/ProductVisual'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { useProducts } from '../hooks/useProducts'
import { formatIdr } from '../lib/format'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const checkoutEnabled = import.meta.env.VITE_CHECKOUT_ENABLED === 'true'

  // Product display is always resolved from GET /api/products by the slug in
  // the query string — there is no hardcoded fallback name/description/price.
  // If the slug is missing or does not match any product returned by the
  // API, the checkout form is not shown at all (see the not-found state
  // below).
  const slug = searchParams.get('product')
  const { products, loading, error } = useProducts()
  const product = useMemo(() => products.find((candidate) => candidate.slug === slug) ?? null, [products, slug])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  if (loading) {
    return (
      <>
        <SiteHeader checkout />
        <main className="checkout-page section-shell">
          <Link to="/" className="back-link"><ArrowLeft size={17} /> Kembali ke Toko</Link>
          <section className="checkout-intro"><div><p className="eyebrow">Pembelian aman dan jelas</p><h1>Checkout</h1><p>Memuat data produk…</p></div><div className="checkout-intro__art"><CreditCard size={34} /><ShieldCheck size={38} /></div></section>
          <div className="checkout-layout">
            <div className="checkout-form">
              <div className="form-card form-card--skeleton" aria-hidden="true">
                <div className="skeleton-line skeleton-line--heading" />
                <div className="skeleton-block" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
              <div className="form-card form-card--skeleton" aria-hidden="true">
                <div className="skeleton-line skeleton-line--heading" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            </div>
            <aside className="order-summary order-summary--skeleton" aria-hidden="true">
              <div className="skeleton-line skeleton-line--heading" />
              <div className="skeleton-block" />
              <div className="skeleton-line" />
            </aside>
          </div>
        </main>
        <SiteFooter />
      </>
    )
  }

  if (!slug || error || !product) {
    return (
      <>
        <SiteHeader checkout />
        <main className="checkout-page section-shell">
          <Link to="/" className="back-link"><ArrowLeft size={17} /> Kembali ke Toko</Link>
          <section className="checkout-empty-state">
            <div className="checkout-empty-state__icon"><PackageSearch size={34} /></div>
            <h1>Produk tidak ditemukan</h1>
            <p>Produk yang Anda cari tidak tersedia atau tautan checkout tidak valid. Silakan kembali ke katalog untuk memilih produk.</p>
            <Link className="button button--accent" to="/#produk">Kembali ke Produk</Link>
          </section>
        </main>
        <SiteFooter />
      </>
    )
  }

  return (
    <>
      <SiteHeader checkout />
      <main className="checkout-page section-shell">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> Kembali ke Toko</Link>
        <section className="checkout-intro"><div><p className="eyebrow">Pembelian aman dan jelas</p><h1>Checkout</h1><p>Lengkapi data pemesan untuk melanjutkan ke halaman pembayaran.</p></div><div className="checkout-intro__art"><CreditCard size={34} /><ShieldCheck size={38} /></div></section>
        <div className="checkout-layout">
          <form id="checkout-form" onSubmit={handleSubmit} className="checkout-form">
            <section className="form-card"><div className="form-card__heading"><span>1</span><h2>Ringkasan Produk</h2></div><div className="checkout-product"><ProductVisual product={product} compact /><div><span className="product-badge">{product.product_type === 'service' ? 'Konsultasi' : 'Produk Digital'}</span><h3>{product.name}</h3><p>{product.description}</p></div><strong>{formatIdr(product.price_idr)}</strong></div></section>
            <section className="form-card"><div className="form-card__heading"><span>2</span><h2>Data Pemesan</h2></div><label>Nama Lengkap<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Masukkan nama lengkap Anda" /></label><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Masukkan email aktif Anda" /></label><label>Nomor WhatsApp<input required inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="08xxxxxxxxxx" /></label><p className="form-note"><ShieldCheck size={16} /> Pastikan data yang Anda masukkan sudah benar untuk kelancaran pesanan.</p></section>
            <section className="form-card"><div className="form-card__heading"><span>3</span><h2>Metode Pembayaran</h2></div><div className="payment-method payment-method--active"><span><Circle size={18} /></span><Landmark size={22} /><div><b>Transfer Bank</b><p>Bayar melalui rekening bank pilihan Anda.</p></div><em>Direkomendasikan</em></div><div className="payment-method"><span><Circle size={18} /></span><WalletCards size={22} /><div><b>E-Wallet</b><p>Bayar cepat dan praktis dengan dompet digital.</p></div></div><div className="payment-method"><span><Circle size={18} /></span><QrCode size={22} /><div><b>QRIS</b><p>Scan kode QR untuk pembayaran instan.</p></div></div><div className="payment-security"><LockKeyhole size={18} /> Metode pembayaran final akan dipilih di halaman payment gateway.</div></section>
          </form>
          <aside className="order-summary"><div className="order-summary__heading"><LockKeyhole size={20} /><h2>Ringkasan Pesanan</h2></div><div className="order-summary__product"><ProductVisual product={product} compact /><div><b>{product.name}</b><span>{formatIdr(product.price_idr)}</span></div></div><div className="summary-row"><span>Harga Produk</span><b>{formatIdr(product.price_idr)}</b></div><div className="summary-row"><span>Biaya Admin</span><b>Rp0</b></div><div className="summary-total"><span>Total Pembayaran</span><strong>{formatIdr(product.price_idr)}</strong></div><div className="summary-trust"><p><ShieldCheck size={19} /><span><b>Data Aman</b>Informasi yang diperlukan diproses seperlunya.</span></p><p><CheckCircle2 size={19} /><span><b>Checkout Rapi</b>Langkah pembelian dibuat lebih jelas dan tertata.</span></p><p><LockKeyhole size={19} /><span><b>Konfirmasi Otomatis</b>Status pesanan akan diperbarui setelah terverifikasi.</span></p></div><button className="button button--accent button--full" type="submit" form="checkout-form" disabled={!checkoutEnabled} aria-disabled={!checkoutEnabled} title="Menunggu Integrasi Pembayaran — endpoint checkout backend (P8) belum tersedia."><LockKeyhole size={18} /> Menunggu Integrasi Pembayaran</button><p className="checkout-terms">Dengan melanjutkan, Anda menyetujui syarat dan ketentuan.</p>{submitted ? <div className="checkout-warning">UI checkout sudah siap. Tombol pembayaran akan aktif setelah endpoint checkout dan Mayar P8 selesai.</div> : null}</aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
