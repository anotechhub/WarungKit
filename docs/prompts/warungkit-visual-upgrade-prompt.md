# Claude Code Prompt — WarungKit Visual Upgrade

Paste prompt ini ke Claude Code dari root repo WarungKit.

```text
You are completing WarungKit Visual Upgrade P11-A: Product Images, Feature Icons, and Premium Page Motion.

Context:
- The WarungKit app is already live and the checkout/payment flow works.
- Do not change the payment flow.
- Do not change backend behavior.
- This task is visual polish only.
- Newly added assets are available in:
  - apps/web/public/visuals/product-images/template-konten-instagram-umkm.webp
  - apps/web/public/visuals/product-images/paket-sop-operasional.webp
  - apps/web/public/visuals/product-images/sesi-konsultasi-bisnis-30-menit.webp
  - apps/web/public/visuals/feature-icons/mudah-dipakai-umkm.webp
  - apps/web/public/visuals/feature-icons/tampilan-profesional.webp
  - apps/web/public/visuals/feature-icons/checkout-terpercaya.webp
  - apps/web/public/visuals/feature-icons/digital-jasa.webp

Read first:
- CLAUDE.md
- docs/PROJECT_CHECKLIST.md
- apps/web/src
- apps/web/src/pages
- apps/web/src/components
- apps/web/src/styles/global.css
- docs/code-templates/product-assets.example.ts
- docs/code-templates/feature-assets.example.ts
- docs/code-templates/ScrollReveal.example.tsx
- docs/code-templates/warungkit-motion.example.css

Do not:
- modify apps/api
- modify Supabase
- modify Mayar integration
- change checkout request fields
- change order status verification
- expose tokens, secrets, emails, phone numbers, or raw backend payloads
- add external animation libraries
- add heavy dependencies
- call real Mayar or Supabase in tests
- deploy
- create commits

Goal:
Upgrade the frontend visuals so the site feels more premium, less generic, and more demo-ready.

## Required changes

### 1. Product images

Replace the existing generated/CSS product card visual blocks with real product image assets.

Mapping:
- slug `template-konten-instagram-umkm` → `/visuals/product-images/template-konten-instagram-umkm.webp`
- slug `paket-sop-operasional` → `/visuals/product-images/paket-sop-operasional.webp`
- slug `sesi-konsultasi-bisnis-30-menit` → `/visuals/product-images/sesi-konsultasi-bisnis-30-menit.webp`

Requirements:
- Keep product data from API as source of truth.
- Do not hardcode product prices.
- Use product slug only to select the visual asset.
- Use proper alt text for product images.
- Add loading="lazy" for product grid images.
- On checkout page, use eager loading only for the selected product summary if it is above the fold.
- Preserve current card layout and spacing.
- Add subtle hover zoom only on card image area, not the entire card.

### 2. Feature icons

Replace the current icon illustrations that look too generic/AI with the new icon assets.

Mapping:
- Mudah dipakai UMKM → `/visuals/feature-icons/mudah-dipakai-umkm.webp`
- Tampilan profesional → `/visuals/feature-icons/tampilan-profesional.webp`
- Checkout lebih terpercaya → `/visuals/feature-icons/checkout-terpercaya.webp`
- Cocok untuk digital & jasa → `/visuals/feature-icons/digital-jasa.webp`

Requirements:
- Icons are decorative, so alt="" and aria-hidden="true" are acceptable.
- Keep the text content unchanged.
- Keep the premium rounded-card layout.
- Do not use Lucide icons for these 4 feature tiles anymore.

### 3. Premium page-load motion

Add subtle Apple-like page motion on refresh/load.

Meaning:
- Do not create a modal popup.
- Add refined pop/fade-up reveal motion for hero, product cards, feature cards, and important sections.
- Animation should feel premium, soft, and subtle.
- It must not be distracting.

Implementation:
- Use CSS animation and/or a small IntersectionObserver component.
- Do not add Framer Motion or other animation packages.
- Respect `prefers-reduced-motion`.
- Add staggered reveal timing for product cards and feature cards.
- Use cubic-bezier motion similar to premium product sites.

Suggested classes:
- `.wk-page-enter`
- `.wk-pop-in`
- `.wk-reveal`
- `.wk-product-image`
- `.wk-feature-icon-image`

You may adapt from:
- docs/code-templates/ScrollReveal.example.tsx
- docs/code-templates/warungkit-motion.example.css

### 4. Tests

Update tests only where needed.

Minimum checks:
- Product cards render image assets based on product slug.
- Feature icons render image assets.
- Product data still comes from API, not hardcoded static product list.
- Checkout flow tests remain green.
- Payment status tests remain green.
- No token or secret appears in rendered output.

### 5. Performance

Keep assets lightweight.
- Use WebP assets from `/public/visuals`.
- Do not import large raw PNGs.
- Do not add network requests to external image services.

## Verification

Run:

pnpm --filter @warungkit/web lint
pnpm --filter @warungkit/web typecheck
pnpm --filter @warungkit/web test
pnpm --filter @warungkit/web build
pnpm test
pnpm build
git diff --check
git status --short

Return only:
1. Files modified
2. Product image integration result
3. Feature icon integration result
4. Page-load motion result
5. Tests and verification result
6. Confirmation no backend change, no payment logic change, no deploy, no secret change
7. Exact deploy command / next step
```
