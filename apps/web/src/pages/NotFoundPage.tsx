import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="not-found"><p className="eyebrow">404</p><h1>Halaman tidak ditemukan.</h1><p>Sepertinya halaman yang Anda cari belum tersedia.</p><Link className="button button--accent" to="/">Kembali ke Beranda</Link></main>
}
