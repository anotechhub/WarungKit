# Skill: database-engineering

## Purpose
Manage Supabase PostgreSQL schema changes for WarungKit through migrations, with RLS enforced on every table.

## When to Use
- Creating or altering any table, index, constraint, or policy in `supabase/migrations`.
- Reviewing existing schema for RLS or access-control gaps.

## Required Inputs
- Target entity definitions (products, orders, payment_events, checkout_idempotency) and their required columns.
- Order lifecycle/status transition rules.
- Current RLS policy state for the affected table(s).

## Implementation Workflow
1. Write a new, timestamped migration file in `supabase/migrations/` — never edit an already-applied migration in place.
2. Use UUID primary keys and `created_at`/`updated_at` audit timestamps on every table.
3. Add indexes/unique constraints on high-lookup or uniqueness-critical columns (order_code, idempotency_key, provider_event_hash, etc.).
4. Enable RLS immediately in the same migration that creates the table — never leave a table without RLS, even temporarily.
5. Write explicit policies: public read only for non-sensitive data (e.g., active products); no anonymous access to orders, payment_events, or checkout_idempotency.
6. Verify the migration is idempotent/re-runnable from a clean database.

## Non-Negotiable Rules
- No schema change without a migration file — no manual dashboard edits that bypass migrations.
- RLS is mandatory on every table, with no exceptions and no temporary permissive policies.
- No permissive anonymous policy for orders, payment_events, or checkout_idempotency data.
- All sensitive data access happens through the backend repository layer, never directly from the browser.
- Price is only ever read from `products.price_idr` — never duplicated as a trusted value elsewhere.

## Completion Checklist
- [ ] Migration file created and re-runnable from a clean database.
- [ ] UUID primary keys and audit timestamps present.
- [ ] Required indexes/unique constraints applied.
- [ ] RLS enabled on the table in the same migration.
- [ ] Anonymous/public policies reviewed — no unintended access to sensitive tables.
- [ ] Seed data (if applicable) matches the confirmed demo product list.

## Expected Verification
- Local Supabase migration replay from a clean state succeeds without errors.
- Manual query test: an anonymous/anon-key client is denied access to `orders`, `payment_events`, `checkout_idempotency`.
- Manual query test: duplicate insert on a unique-constrained column fails as expected.
