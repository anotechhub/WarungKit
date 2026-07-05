import { Menu, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

const navItems = [
  { label: 'Beranda', href: '/#beranda' },
  { label: 'Produk', href: '/#produk' },
  { label: 'Cara Kerja', href: '/#cara-kerja' },
  { label: 'Keamanan', href: '/#keamanan' },
  { label: 'FAQ', href: '/#faq' },
]

export function SiteHeader({ checkout = false }: { checkout?: boolean }) {
  const [open, setOpen] = useState(false)

  if (checkout) {
    return (
      <header className="checkout-header">
        <BrandLogo />
        <div className="safe-transaction"><ShieldCheck size={16} /> Transaksi Aman & Terpercaya</div>
      </header>
    )
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandLogo />
        <nav className="desktop-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <div className="desktop-actions">
          <Link to="/#produk" className="button button--dark button--small">Mulai Jualan</Link>
        </div>
        <button className="mobile-menu-toggle" aria-label="Buka menu" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open ? (
        <nav className="mobile-nav" aria-label="Navigasi mobile">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
          ))}
          <Link to="/#produk" className="button button--dark" onClick={() => setOpen(false)}>Mulai Jualan</Link>
        </nav>
      ) : null}
    </header>
  )
}
