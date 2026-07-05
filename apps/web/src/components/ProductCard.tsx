import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatIdr } from '../lib/format'
import type { Product } from '@warungkit/contracts'
import { ProductVisual } from './ProductVisual'

export function ProductCard({ product }: { product: Product }) {
  const badge = product.product_type === 'service' ? 'Konsultasi' : product.slug.includes('sop') ? 'SOP' : 'Template'
  return (
    <article className="product-card">
      <div className="product-card__visual"><ProductVisual product={product} /></div>
      <div className="product-card__body">
        <span className="product-badge">{badge}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-card__bottom">
          <strong>{formatIdr(product.price_idr)}</strong>
          <Link to={`/checkout?product=${encodeURIComponent(product.slug)}`} className="button button--dark button--small">Beli Sekarang <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </article>
  )
}
