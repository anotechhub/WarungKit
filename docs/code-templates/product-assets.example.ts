export const PRODUCT_VISUALS: Record<string, { src: string; alt: string }> = {
  'template-konten-instagram-umkm': {
    src: '/visuals/product-images/template-konten-instagram-umkm.webp',
    alt: 'Mockup template konten Instagram untuk UMKM',
  },
  'paket-sop-operasional': {
    src: '/visuals/product-images/paket-sop-operasional.webp',
    alt: 'Ilustrasi paket dokumen SOP operasional UMKM',
  },
  'sesi-konsultasi-bisnis-30-menit': {
    src: '/visuals/product-images/sesi-konsultasi-bisnis-30-menit.webp',
    alt: 'Ilustrasi sesi konsultasi bisnis online 30 menit',
  },
};

export function getProductVisual(slug: string) {
  return PRODUCT_VISUALS[slug] ?? PRODUCT_VISUALS['template-konten-instagram-umkm'];
}
