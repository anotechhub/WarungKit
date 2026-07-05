import { Link } from 'react-router-dom'

type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <Link className={`brand-logo ${className}`.trim()} to="/" aria-label="WarungKit beranda">
      <img src="/brand/brand_logo.png" alt="WarungKit" />
      {compact ? null : <span className="sr-only">WarungKit</span>}
    </Link>
  )
}
