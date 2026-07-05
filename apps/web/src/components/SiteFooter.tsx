import { Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="footer-brand">
          <BrandLogo />
          <p>Storefront digital untuk UMKM agar tampil profesional, transaksi lebih rapi, dan pelanggan lebih percaya.</p>
          <div className="social-row" aria-label="Sosial media">
            <a href="#instagram" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="#youtube" aria-label="YouTube"><Youtube size={18} /></a>
            <a href="#email" aria-label="Email"><Mail size={18} /></a>
          </div>
        </div>
        <div>
          <h3>Produk</h3>
          <a href="/#produk">Template Digital</a>
          <a href="/#produk">Paket Operasional</a>
          <a href="/#produk">Konsultasi Bisnis</a>
        </div>
        <div>
          <h3>Perusahaan</h3>
          <a href="/#tentang">Tentang Kami</a>
          <a href="/#faq">FAQ</a>
          <a href="/#kontak">Kontak</a>
        </div>
        <div>
          <h3>Hubungi Kami</h3>
          <span><Mail size={15} /> hello@warungkit.id</span>
          <span><Phone size={15} /> +62 812-3456-7890</span>
          <span><MapPin size={15} /> Indonesia</span>
        </div>
      </div>
      <div className="site-footer__bottom">© 2026 WarungKit. Semua hak dilindungi.</div>
    </footer>
  )
}
