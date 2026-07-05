-- WarungKit core schema baseline: products, orders, payment_events, checkout_idempotency.
-- Security model: browser has no direct write path to any table here except SELECT on
-- active products. All order/payment mutation happens through the Cloudflare Worker API
-- using the Supabase secret key (SUPABASE_SECRET_KEY, backend-only). See
-- docs/decisions/0001-architecture-baseline.md and docs/decisions/0002-threat-model.md.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- pgcrypto provides gen_random_uuid(); safe to run repeatedly.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helper function: maintain updated_at on every UPDATE
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at with now() on every row update. Applied to all WarungKit tables that carry an updated_at column.';

-- ---------------------------------------------------------------------------
-- Enum: order lifecycle status
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'payment_created',
      'paid',
      'expired',
      'failed',
      'cancelled'
    );
  end if;
end
$$;

comment on type public.order_status is
  'Allowed order lifecycle states. Transition to paid must only ever be written by the backend after server-side verification against Mayar — never from client input.';

-- ---------------------------------------------------------------------------
-- Table: products
-- Source of truth for catalog and pricing. Backend resolves price_idr from
-- here on every checkout; browser-submitted prices are never trusted.
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  price_idr bigint not null,
  product_type text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_idr_non_negative check (price_idr >= 0),
  constraint products_product_type_allowed check (
    product_type in ('digital_product', 'service')
  )
);

comment on table public.products is
  'Catalog source of truth. products.price_idr is the only trusted price value in the system — the backend must always resolve price from this table, never from client-submitted checkout data.';
comment on column public.products.price_idr is
  'Canonical price in IDR. Never accept this value from browser input; always read it here at checkout time.';

create index if not exists idx_products_active_catalog
  on public.products (is_active, sort_order)
  where is_active = true;

create trigger set_updated_at_products
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: orders
-- Customer checkout and payment state. Contains PII (name, email, phone) and
-- is never directly readable/writable by the browser.
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  product_id uuid not null references public.products (id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  amount_idr bigint not null,
  status public.order_status not null default 'pending',
  mayar_invoice_id text,
  mayar_invoice_url text,
  receipt_token uuid not null default gen_random_uuid(),
  paid_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_amount_idr_non_negative check (amount_idr >= 0),
  constraint orders_receipt_token_unique unique (receipt_token)
);

comment on table public.orders is
  'Customer checkout and payment state. Contains customer PII (name, email, phone) and must never be exposed through direct browser/anon access — all access goes through the Cloudflare Worker API using the backend service credential.';
comment on column public.orders.amount_idr is
  'Price snapshot captured by the backend from products.price_idr at checkout time — not a value trusted from the client.';
comment on column public.orders.receipt_token is
  'Unguessable token required to read order status publicly via the Worker API. Prevents order enumeration by sequential/guessable order id.';

-- Partial unique index: mayar_invoice_id must be unique only when present.
create unique index if not exists idx_orders_mayar_invoice_id_unique
  on public.orders (mayar_invoice_id)
  where mayar_invoice_id is not null;

create index if not exists idx_orders_order_code on public.orders (order_code);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_product_id on public.orders (product_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

create trigger set_updated_at_orders
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: payment_events
-- Idempotent audit trail of Mayar payment events. Deliberately does not store
-- a raw/full payload field — only a sanitized subset needed for demo proof.
-- ---------------------------------------------------------------------------

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  provider_event_hash text not null,
  order_id uuid references public.orders (id),
  sanitized_payload jsonb not null default '{}'::jsonb,
  processing_status text not null,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_events_provider_allowed check (provider in ('mayar')),
  constraint payment_events_processing_status_allowed check (
    processing_status in ('received', 'verified', 'duplicate', 'ignored', 'failed', 'rejected')
  )
);

comment on table public.payment_events is
  'Idempotent audit trail for Mayar payment events. sanitized_payload must never contain secrets or raw provider payloads — only fields needed to prove/demonstrate the verified transition. Status must only move to paid in orders after this table records a verified event.';
comment on column public.payment_events.sanitized_payload is
  'Sanitized subset of the provider event only. Never store secrets, signatures, or unnecessary full customer PII here.';

-- Dedup guard: same provider + event hash must not be processed twice.
create unique index if not exists idx_payment_events_provider_hash_unique
  on public.payment_events (provider, provider_event_hash);

-- Dedup guard: same provider + event id must not be processed twice, when id is present.
create unique index if not exists idx_payment_events_provider_event_id_unique
  on public.payment_events (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists idx_payment_events_order_id on public.payment_events (order_id);
create index if not exists idx_payment_events_processing_status on public.payment_events (processing_status);

create trigger set_updated_at_payment_events
  before update on public.payment_events
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: checkout_idempotency
-- Replay protection for POST /api/checkout — prevents duplicate orders and
-- duplicate Mayar invoice creation from retries or double-clicks.
-- ---------------------------------------------------------------------------

create table if not exists public.checkout_idempotency (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  request_hash text not null,
  order_id uuid references public.orders (id),
  response_payload jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checkout_idempotency is
  'Replay protection for checkout requests. Prevents duplicate orders and duplicate Mayar invoice creation from client retries or double-clicks.';
comment on column public.checkout_idempotency.response_payload is
  'Cached checkout response replayed for a repeated idempotency key. Must never contain a payment secret or provider API credential.';

create index if not exists idx_checkout_idempotency_expires_at on public.checkout_idempotency (expires_at);

create trigger set_updated_at_checkout_idempotency
  before update on public.checkout_idempotency
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.checkout_idempotency enable row level security;

-- products: public read of active catalog rows only. No public write path —
-- catalog changes go through migrations/seed, never through the browser.
drop policy if exists products_public_read_active on public.products;
create policy products_public_read_active
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

comment on policy products_public_read_active on public.products is
  'Optional, limited browser read access to the public catalog (active products only). No insert/update/delete policy exists for anon or authenticated — catalog mutation is migration/seed-only.';

-- orders: no anon/authenticated policy of any kind. Order data (including
-- customer PII and payment state) is only reachable via the Worker API using
-- the backend service credential, which bypasses RLS as expected for a
-- trusted server-side role. This is intentional: no policy is added here.
comment on table public.orders is
  'RLS is enabled with no anon/authenticated policy — WarungKit application access to orders must go exclusively through the Cloudflare Worker API using trusted backend service credentials, never directly from the browser.';

-- payment_events: no anon/authenticated policy of any kind, for the same
-- reason as orders — payment event data is backend-only.
comment on table public.payment_events is
  'RLS is enabled with no anon/authenticated policy — payment event data must only be accessed through trusted backend service credentials via the Cloudflare Worker API, never directly from the browser.';

-- checkout_idempotency: no anon/authenticated policy of any kind — idempotency
-- records are an internal backend replay-protection mechanism only.
comment on table public.checkout_idempotency is
  'RLS is enabled with no anon/authenticated policy — idempotency records are only read/written by the Cloudflare Worker API using trusted backend service credentials, never directly from the browser.';

-- ---------------------------------------------------------------------------
-- Seed: demo product catalog (idempotent upsert by slug)
-- Ensures the confirmed demo products exist immediately after this migration
-- runs on the remote database via a future `supabase db push`, independent of
-- supabase/seed.sql (which is only applied on local `supabase db reset`).
-- ---------------------------------------------------------------------------

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
