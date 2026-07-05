-- WarungKit demo seed data.
-- Applied automatically on `supabase db reset` (local only). Idempotent via
-- UPSERT by slug so re-running is always safe. Contains no customer PII and
-- no secrets — catalog data only.

insert into public.products (
  id, slug, name, description, price_idr, product_type, is_active, sort_order
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'template-konten-instagram-umkm',
    'Template Konten Instagram UMKM',
    'Template konten Instagram siap edit untuk UMKM, membantu pelaku usaha kecil tampil profesional di media sosial tanpa perlu desainer.',
    49000,
    'digital_product',
    true,
    1
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'paket-sop-operasional',
    'Paket SOP Operasional',
    'Kumpulan template Standard Operating Procedure (SOP) operasional yang siap dipakai untuk merapikan proses bisnis UMKM sehari-hari.',
    79000,
    'digital_product',
    true,
    2
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'sesi-konsultasi-bisnis-30-menit',
    'Sesi Konsultasi Bisnis 30 Menit',
    'Sesi konsultasi bisnis privat selama 30 menit bersama mentor untuk membahas tantangan dan strategi pengembangan usaha UMKM.',
    149000,
    'service',
    true,
    3
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_idr = excluded.price_idr,
  product_type = excluded.product_type,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
