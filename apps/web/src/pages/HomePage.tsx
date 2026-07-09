import {
  ArrowRight, BadgeCheck, Check, ChevronDown, CircleDollarSign, FileCheck2,
  LockKeyhole, MessageCircleHeart, ShieldCheck, Store,  WalletCards,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { HeroVisual } from '../components/HeroVisual'
import { ProductCard } from '../components/ProductCard'
import { ScrollReveal } from '../components/ScrollReveal'
import { SectionHeading } from '../components/SectionHeading'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { useProducts } from '../hooks/useProducts'
import { FEATURE_VISUALS, type FeatureVisualKey } from '../lib/feature-visuals'

const whyItems: { key: FeatureVisualKey; title: string; text: string }[] = [
  { key: 'easy', title: 'Mudah dipakai UMKM', text: 'Mulai dari katalog sederhana yang siap ditata dan dijual.' },
  { key: 'professional', title: 'Tampilan profesional', text: 'Desain bersih dan rapi untuk meningkatkan kepercayaan.' },
  { key: 'trusted', title: 'Checkout lebih terpercaya', text: 'Alur pembayaran tertata dengan status pesanan yang jelas.' },
  { key: 'digitalService', title: 'Cocok untuk digital & jasa', text: 'Jual template, SOP, konsultasi, kelas, dan layanan digital.' },
]

const STAGGER_STEP_MS = 90

const steps = [
  { index: '01', icon: Store, title: 'Pilih Produk', text: 'Temukan produk digital atau jasa yang paling relevan.' },
  { index: '02', icon: FileCheck2, title: 'Isi Checkout', text: 'Lengkapi data pemesan dengan sederhana dan jelas.' },
  { index: '03', icon: WalletCards, title: 'Bayar dengan Aman', text: 'Lanjutkan ke metode pembayaran yang tersedia.' },
  { index: '04', icon: BadgeCheck, title: 'Pesanan Terkonfirmasi', text: 'Status pesanan tercatat setelah pembayaran terverifikasi.' },
]

const trustItems = [
  { icon: CircleDollarSign, title: 'Harga yang Transparan', text: 'Harga produk tampil jelas sejak awal.' },
  { icon: LockKeyhole, title: 'Data Checkout Dijaga', text: 'Data yang diperlukan dikelola seperlunya.' },
  { icon: ShieldCheck, title: 'Pembayaran Terverifikasi', text: 'Status pesanan tidak hanya mengandalkan redirect.' },
  { icon: MessageCircleHeart, title: 'Konfirmasi Lebih Terpercaya', text: 'Pesanan punya status yang mudah dicek kembali.' },
]

const audiences = [
  ['Kreator & Desainer', 'Jual template, preset, atau aset digital yang kamu buat.'],
  ['Penjual Produk Digital', 'Distribusikan produk digital dengan tampilan yang rapi.'],
  ['Konsultan & Coach', 'Jual sesi konsultasi, mentoring, dan layanan profesional.'],
  ['Brand Lokal & UMKM', 'Perkuat brand dan kembangkan produk digital sebagai nilai tambah.'],
]

const testimonials = [
  { name: 'Nadia Putri', role: 'Desainer Template', quote: '“Tampilan toko saya jadi jauh lebih profesional. Pelanggan juga lebih percaya saat checkout.”' },
  { name: 'Riko Pratama', role: 'Pemilik Brand Lokal', quote: '“Katalognya rapi dan alurnya jelas. Lebih mudah menjelaskan produk ke pelanggan.”' },
  { name: 'Dewi Lestari', role: 'Business Coach', quote: '“Saya bisa menampilkan sesi konsultasi dengan lebih meyakinkan tanpa terasa ribet.”' },
]

const faqs = [
  'Apakah WarungKit cocok untuk UMKM?',
  'Apakah saya bisa menjual produk digital?',
  'Apakah bisa dipakai untuk jasa konsultasi?',
  'Bagaimana pelanggan melihat status pembayaran?',
]

export function HomePage() {
  const { products, loading, error } = useProducts()

  return (
    <>
      <SiteHeader />
      <main id="beranda">
        <section className="hero section-shell">
          <div className="hero-copy wk-page-enter">
            <p className="eyebrow">Storefront digital untuk UMKM</p>
            <h1>Jual Produk Digital UMKM dengan <span>Tampilan Premium.</span></h1>
            <p className="hero-copy__body">WarungKit membantu UMKM menjual template, SOP, konsultasi, dan produk digital dengan katalog yang rapi, checkout yang jelas, dan pengalaman yang lebih meyakinkan.</p>
            <div className="hero-copy__actions">
              <a href="#produk" className="button button--accent">Lihat Produk <ArrowRight size={17} /></a>
              <a href="#cara-kerja" className="button button--ghost">Pelajari Cara Kerja</a>
            </div>
            <div className="hero-proof">
              <span><Check size={15} /> Mudah dipakai</span><span><Check size={15} /> Katalog profesional</span><span><Check size={15} /> Checkout tertata</span>
            </div>
          </div>
          <div className="wk-page-enter" style={{ '--wk-delay': '120ms' } as CSSProperties}>
            <HeroVisual />
          </div>
        </section>

        <section id="produk" className="section-shell section-products">
          <SectionHeading eyebrow="Produk unggulan" title="Pilihan Produk Digital Terbaik untuk Bisnismu" align="left" action={<a href="#produk" className="text-link">Lihat Semua Produk <ArrowRight size={16} /></a>} />
          {loading ? <div className="product-grid product-grid--skeleton"><div /><div /><div /></div> : null}
          {error ? <div className="notice notice--error">{error}</div> : null}
          {!loading && !error ? (
            <div className="product-grid">
              {products.map((product, index) => (
                <ScrollReveal delayMs={index * STAGGER_STEP_MS} key={product.id}>
                  <ProductCard product={product} />
                </ScrollReveal>
              ))}
            </div>
          ) : null}
        </section>

        <section className="section-shell soft-panel" id="tentang">
          <SectionHeading eyebrow="Kenapa WarungKit" title="Dirancang untuk UMKM yang Ingin Tampil Profesional" body="Bukan sekadar halaman jualan. WarungKit membantu pengalaman belanja terasa lebih rapi dari awal." />
          <div className="why-grid">
            {whyItems.map(({ key, title, text }, index) => (
              <ScrollReveal className="why-card" delayMs={index * STAGGER_STEP_MS} key={key}>
                <span><img className="wk-feature-icon-image" src={FEATURE_VISUALS[key].src} alt="" loading="lazy" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section id="cara-kerja" className="section-shell steps-section">
          <SectionHeading eyebrow="Cara kerja" title="Mulai Jualan dalam 4 Langkah Mudah" />
          <div className="steps-grid">{steps.map(({ index, icon: Icon, title, text }) => <div className="step-card" key={title}><span className="step-index">{index}</span><div className="step-icon"><Icon size={26} /></div><h3>{title}</h3><p>{text}</p></div>)}</div>
        </section>

        <section id="keamanan" className="section-shell security-panel">
          <SectionHeading eyebrow="Keamanan" title="Dibangun untuk Transaksi yang Lebih Meyakinkan" body="Vibe coding tetap butuh fondasi yang benar. Harga, pembayaran, dan status pesanan harus diperlakukan dengan serius." />
          <div className="trust-grid">{trustItems.map(({ icon: Icon, title, text }) => <div className="trust-item" key={title}><Icon size={25} /><div><h3>{title}</h3><p>{text}</p></div></div>)}</div>
        </section>

        <section className="section-shell audience-section">
          <SectionHeading eyebrow="Dibuat untuk UMKM Indonesia" title="Untuk Semua Pelaku Usaha dan Kreator" />
          <div className="audience-grid">{audiences.map(([title, text], index) => <article className={`audience-card audience-card--${index + 1}`} key={title}><div className="audience-card__scene"><span /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="section-shell testimonials-section">
          <SectionHeading eyebrow="Cerita mereka" title="Apa Kata Pelaku UMKM yang Ingin Tampil Lebih Rapi?" />
          <div className="testimonial-grid">{testimonials.map(({ name, role, quote }) => <article className="testimonial-card" key={name}><div className="stars">★★★★★</div><p>{quote}</p><div className="testimonial-person"><span>{name.slice(0, 1)}</span><div><strong>{name}</strong><small>{role}</small></div></div></article>)}</div>
        </section>

        <section id="faq" className="section-shell faq-section">
          <SectionHeading eyebrow="FAQ" title="Pertanyaan yang Sering Diajukan" align="left" />
          <div className="faq-list">{faqs.map((question) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>WarungKit dirancang sebagai storefront digital yang sederhana, rapi, dan dapat berkembang sesuai kebutuhan bisnis Anda.</p></details>)}</div>
        </section>

        <section className="section-shell final-cta">
          <div><p className="eyebrow">WarungKit untuk UMKM modern</p><h2>Mulai Jualan dengan Tampilan yang Lebih Meyakinkan.</h2><p>Bangun storefront digital profesional, tampilkan produk dengan rapi, dan siapkan fondasi pembayaran yang aman.</p></div>
          <div className="final-cta__actions"><a href="#produk" className="button button--accent">Lihat Produk</a><Link to="/checkout" className="button button--ghost">Mulai Checkout</Link></div>
          <div className="final-cta__decor"><span /><span /><span /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
