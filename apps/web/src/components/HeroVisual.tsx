import { CheckCircle2, CreditCard, LayoutDashboard, ShoppingBag } from 'lucide-react'

export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-laptop">
        <div className="laptop-topbar"><span /><span /><span /><b>WarungKit</b><i /></div>
        <div className="laptop-content">
          <div className="mini-hero-copy"><small>Storefront digital untuk UMKM</small><strong>Jual lebih rapi. Tampil lebih dipercaya.</strong><em>Lihat Produk</em></div>
          <div className="mini-product-grid"><div /><div /><div /></div>
        </div>
      </div>
      <div className="hero-phone">
        <div className="phone-notch" />
        <small>Checkout</small>
        <div className="phone-line phone-line--wide" />
        <div className="phone-product"><ShoppingBag size={16} /><span>Template Konten<br />Instagram UMKM</span></div>
        <div className="phone-line" />
        <div className="phone-line" />
        <div className="phone-total"><span>Total</span><b>Rp49.000</b></div>
        <div className="phone-pay">Bayar Sekarang</div>
      </div>
      <div className="hero-success">
        <CheckCircle2 size={34} />
        <b>Pembayaran Berhasil</b>
        <span>Pesananmu sudah kami terima.</span>
        <button>Lihat Pesanan</button>
      </div>
      <div className="hero-float hero-float--one"><LayoutDashboard size={17} /></div>
      <div className="hero-float hero-float--two"><CreditCard size={17} /></div>
    </div>
  )
}
