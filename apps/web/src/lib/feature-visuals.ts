export interface FeatureVisualAsset {
  src: string
}

export type FeatureVisualKey = 'easy' | 'professional' | 'trusted' | 'digitalService'

export const FEATURE_VISUALS: Record<FeatureVisualKey, FeatureVisualAsset> = {
  easy: { src: '/visuals/feature-icons/mudah-dipakai-umkm.webp' },
  professional: { src: '/visuals/feature-icons/tampilan-profesional.webp' },
  trusted: { src: '/visuals/feature-icons/checkout-terpercaya.webp' },
  digitalService: { src: '/visuals/feature-icons/digital-jasa.webp' },
}
