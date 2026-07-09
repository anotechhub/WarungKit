import type { Product } from '@warungkit/contracts'
import { getProductVisual } from '../lib/product-visuals'

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const type = product.slug.includes('instagram') ? 'template' : product.slug.includes('sop') ? 'sop' : 'consultation'
  const asset = getProductVisual(product.slug)

  if (asset) {
    return (
      <div className={`product-visual product-visual--photo ${compact ? 'product-visual--compact' : ''}`}>
        <img className="wk-product-image" src={asset.src} alt={asset.alt} loading="lazy" />
      </div>
    )
  }

  return (
    <div className={`product-visual product-visual--${type} ${compact ? 'product-visual--compact' : ''}`} aria-hidden="true">
      {type === 'template' ? (
        <>
          <div className="phone phone--one"><div className="phone__bar" /><div className="template-grid"><i /><i /><i /><i /></div></div>
          <div className="phone phone--two"><div className="phone__bar" /><div className="template-card" /><div className="template-lines"><i /><i /><i /></div></div>
          <div className="mini-card mini-card--orange" />
        </>
      ) : null}
      {type === 'sop' ? (
        <>
          <div className="paper-stack"><div className="paper paper--back" /><div className="paper paper--mid" /><div className="paper paper--front"><b>SOP</b><span /><span /><span /><em /></div></div>
          <div className="binder" />
        </>
      ) : null}
      {type === 'consultation' ? (
        <>
          <div className="consultation-window"><div className="consultation-window__bar"><i /><i /><i /></div><div className="consultation-person consultation-person--one" /><div className="consultation-person consultation-person--two" /><div className="consultation-message" /></div>
        </>
      ) : null}
    </div>
  )
}
