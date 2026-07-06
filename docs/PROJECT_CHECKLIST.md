# WarungKit — Project Checklist Eksekusi

> Dokumen ini adalah checklist eksekusi teknis untuk proyek demo webinar **WarungKit**. Sumber kebenaran utama tetap `WarungKit_BRD_Technical_Blueprint_v1.0.pdf`. Dokumen ini **tidak menggantikan** BRD — dokumen ini menerjemahkan BRD menjadi tugas yang bisa dikerjakan, diverifikasi, dan dipantau statusnya.

---

## 1. Purpose and Definition of Done

### Tujuan Dokumen
Checklist ini memastikan tim (dan Claude Code sebagai partner implementasi) memiliki jalur eksekusi yang jelas, aman, dan realistis untuk menyiapkan demo webinar 60 menit WarungKit — sebuah storefront UMKM yang menunjukkan alur checkout aman dari pemilihan produk hingga verifikasi pembayaran Mayar server-side.

### Definisi "WarungKit Demo Ready"
WarungKit dinyatakan **demo ready** hanya jika seluruh kondisi berikut terpenuhi:

- [ ] Frontend dapat diakses publik di `warungkit-demo.pages.dev` dan menampilkan katalog 3 produk demo.
- [ ] Checkout end-to-end berhasil: pilih produk → isi form → order `pending` dibuat di backend → link pembayaran Mayar dibuat → redirect ke halaman Mayar.
- [ ] Webhook Mayar diterima di backend, diverifikasi server-side, dan status order berubah dari `pending`/`payment_created` menjadi `paid` — tanpa pernah mempercayai redirect browser sebagai bukti pembayaran.
- [ ] Tidak ada API key Mayar atau Supabase secret key (`SUPABASE_SECRET_KEY`) yang muncul di kode frontend, bundle browser, network request, riwayat git, atau tangkapan layar.
- [ ] RLS aktif di seluruh tabel Supabase; tidak ada policy anonim yang permisif.
- [ ] Checkout dan pemrosesan webhook bersifat idempotent (duplikat tidak menghasilkan order ganda atau transisi status ganda).
- [ ] Seluruh command kualitas (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) lulus tanpa error.
- [ ] Rehearsal penuh 60 menit sudah dilakukan minimal satu kali, termasuk skenario fallback (screenshot/rekaman backup).
- [ ] CORS allowlist dikunci ke URL frontend demo — tidak ada wildcard origin.
- [ ] Checkpoint Git (`demo-start`, `demo-payment`, `demo-final`) tersedia dan dapat diakses ulang bila terjadi kegagalan live.

**Prinsip inti (tidak bisa ditawar):** Browser hanya mengirim niat (intent), backend yang memutuskan kebenaran (truth), database mencatat kebenaran, dan status pembayaran hanya berubah setelah verifikasi server-side terhadap Mayar.

---

## 2. Project Operating Principles

### Demo-First Delivery
- Prioritaskan keandalan alur inti (discover → checkout → bayar → webhook → paid) di atas fitur tambahan apa pun.
- Semua pekerjaan di luar scope BRD (multi-item cart, akun pelanggan, admin console penuh, refund otomatis, notifikasi WhatsApp) **tidak dikerjakan** untuk versi webinar.
- **Keputusan final admin visibility (menjawab Open Question Q-04, lihat Section 17):** WarungKit tidak membangun dashboard admin untuk MVP webinar. Bukti order dan payment event ditunjukkan langsung dari dashboard Supabase terkontrol, khusus untuk observabilitas presenter — bukan bagian dari produk publik WarungKit. Tidak ada pelanggan atau pengguna anonim yang dapat mengakses data order Supabase secara langsung.
- Setiap keputusan desain harus menjawab: "Apakah ini membuat demo 60 menit lebih andal atau lebih berisiko?"

### Security by Default
- Rahasia (Mayar API key, Supabase secret key `SUPABASE_SECRET_KEY`) **hanya** hidup di Cloudflare Worker secret/config — tidak pernah di frontend, git, atau log.
- Setiap input dari klien dianggap tidak tepercaya (untrusted) sampai divalidasi ulang di backend.
- Harga selalu diambil dari database (`products.price_idr`), tidak pernah dari body request klien.
- Status "paid" hanya boleh diset oleh backend setelah verifikasi server-side terhadap Mayar — redirect browser bukan bukti pembayaran.

### Code Quality
- TypeScript strict mode di seluruh apps; hindari `any` kecuali dijustifikasi dan direview.
- Validasi Zod digunakan bersama antara frontend (UX) dan backend (enforcement) via `packages/contracts`.
- Semua akses database sensitif melalui repository layer di backend, bukan langsung dari browser.
- Semua perubahan skema database wajib lewat migration file — tidak ada perubahan skema manual di dashboard tanpa migration yang tercatat.

### Git Checkpoints
- Commit dilakukan pada titik-titik naratif yang jelas (lihat Section 16), bukan commit besar tunggal di akhir.
- Branch checkpoint (`demo-start`, `demo-payment`, `demo-final`, `demo-backup`) disiapkan agar operator demo bisa pindah ke titik aman bila terjadi kegagalan live.
- Tidak ada perubahan kode atau deploy baru saat sesi webinar berlangsung, kecuali sudah direhearsal sebelumnya.

### Claude Code Collaboration
- Claude Code diperlakukan sebagai mitra implementasi terarah, bukan pengambil keputusan bisnis.
- Setiap task ke Claude harus memiliki: skill yang relevan, scope folder yang jelas, acceptance criteria, dan command verifikasi (lint/typecheck/test/build).
- Claude tidak diminta membuat aturan bisnis baru, mengekspos rahasia, atau melakukan perubahan lintas proyek tanpa rencana (plan) terlebih dahulu.
- Alur kerja standar: **Plan → Scope → Implement → Verify → Commit** (sesuai BRD Section 10.1).

---

## 3. Phase Overview

| Phase | Objective | Main Deliverable | Dependency | Priority | Demo Impact | Status |
|---|---|---|---|---|---|---|
| P0. BRD Review and Scope Lock | Mengunci pemahaman scope, keputusan, dan batasan dari BRD | Ringkasan scope tervalidasi tim (tanpa menduplikasi BRD) | — | Must Have | Tinggi | Done |
| P1. Repository and Git Foundation | Membangun monorepo pnpm dan struktur baseline | Skeleton repo, `.gitignore`, `pnpm-workspace.yaml` | P0 | Must Have | Tinggi | Done |
| P2. Claude Code Governance and Skills | Menyiapkan CLAUDE.md dan skill terskop | `.claude/skills/*`, `CLAUDE.md` | P1 | Must Have | Sedang | Done |
| P3. Architecture and Security Documentation | Mendokumentasikan arsitektur, threat model, dan keputusan | `docs/decisions/*`, `docs/runbooks/*` | P1 | Must Have | Sedang | Done |
| P4. Cloudflare, Supabase, and Mayar Environment Setup | Menyiapkan akun, penamaan project, dan kredensial sandbox | Reservasi nama/URL Cloudflare Pages, project Cloudflare Workers, project Supabase, akun Mayar sandbox | P1 | Must Have | Tinggi | Done |
| P5. Database Schema, RLS, and Seed Data | Membuat skema tabel inti, RLS, dan data produk demo | Migration files, `seed.sql` | P4 | Must Have | Tinggi | Done |
| P6. Backend API Foundation | Membangun Hono API dengan validasi dan repository layer | Endpoint `/health`, `/api/products`, struktur service | P5 | Must Have | Tinggi | Done |
| P7. Frontend Storefront and Checkout Experience | Membangun katalog dan form checkout | Halaman katalog dan checkout React | P6 | Must Have | Tinggi | Done |
| P8. Mayar Payment and Webhook Integration | Mengintegrasikan pembuatan invoice dan penerimaan webhook | Endpoint `/api/checkout`, `/api/webhooks/mayar` | P6, P7 | Must Have | Tinggi | Done |
| P9. Security, Testing, and Observability | Menjalankan uji keamanan, test otomatis, dan logging aman | Test suite, log terstruktur | P8 | Must Have | Sedang | Partial (unit/integration test coverage dari P6-P8 sudah ada; secret-scan riwayat git dan dependency audit penuh belum dijalankan) |
| P10. Cloudflare Deployment and End-to-End Validation | Deploy ke domain publik dan validasi alur penuh | Deployment live di `warungkit-demo.pages.dev` dan `*.workers.dev` | P9 | Must Have | Tinggi | In Progress (frontend build config Cloudflare Pages sedang diperbaiki; backend Worker deploy dan Mayar/Supabase secret belum dikerjakan) |
| P11. Webinar Rehearsal, Fallback, and Live Demo Readiness | Melatih alur demo dan menyiapkan fallback | Rekaman/screenshot backup, run sheet final | P10 | Must Have | Tinggi | Not Started |

---

## 4. Detailed Execution Checklist

### P0. BRD Review and Scope Lock

- [x] [Must Have] Validasi seluruh keputusan kunci BRD (produk, frontend, backend, database, payment, environment, workflow) disepakati tim
  - Why it matters: Mencegah scope creep dan interpretasi berbeda sebelum coding dimulai.
  - Claude Skill: —
  - Dependency: BRD v1.0 tersedia dan telah dibaca penuh.
  - Output / Evidence: Catatan kesepakatan tim (bisa berupa komentar/checklist internal, bukan file docs baru).
  - Acceptance criteria: Semua anggota tim menyatakan pemahaman yang sama terhadap 3 produk demo, alur checkout, dan batasan non-negotiable.
  - Risk if skipped: Implementasi menyimpang dari BRD, menyebabkan rework mendekati hari-H.

- [x] [Must Have] Konfirmasi 3 produk demo dan harga tetap (Rp49.000 / Rp79.000 / Rp149.000)
  - Why it matters: Produk dan harga adalah data yang akan di-seed ke database dan ditampilkan live.
  - Claude Skill: —
  - Dependency: P0 kesepakatan scope.
  - Output / Evidence: Daftar final produk untuk digunakan di `seed.sql` (P5).
  - Acceptance criteria: Nama, deskripsi singkat, harga, dan tipe (digital product/service) untuk ketiga produk sudah final.
  - Risk if skipped: Perubahan data produk mendadak dekat hari-H mengganggu rehearsal.

- [x] [Should Have] Tentukan jawaban untuk Open Questions tersisa (Q-01, Q-03, Q-05, Q-06) dari BRD Section 13.3
  - Why it matters: Beberapa keputusan (metode pembayaran sandbox, retensi data, nama project final) memengaruhi desain teknis P6-P9. Q-02 (mekanisme status page) dan Q-04 (visibilitas admin) sudah final — lihat Section 17.
  - Claude Skill: —
  - Dependency: Akses ke dashboard Mayar sandbox (P4).
  - Output / Evidence: Jawaban tercatat per pertanyaan (lihat Section 17 dokumen ini).
  - Acceptance criteria: Minimal Q-01 (metode pembayaran) terjawab sebelum P8 dimulai.
  - Risk if skipped: Keputusan teknis ad-hoc saat implementasi tanpa arah yang konsisten.

### P1. Repository and Git Foundation

- [x] [Must Have] Inisialisasi git repository dan `.gitignore` yang mencakup `.env`, `.dev.vars`, `node_modules`, build artifacts
  - Why it matters: Mencegah rahasia atau file besar ter-commit sejak awal.
  - Claude Skill: backend-api (untuk konvensi struktur) / manual setup
  - Dependency: —
  - Output / Evidence: `.gitignore` di root repo, `git status` bersih dari file sensitif.
  - Acceptance criteria: `git log` menunjukkan tidak ada commit yang menyertakan file `.env*`.
  - Risk if skipped: Kebocoran rahasia permanen di riwayat git (SC-01, BR-08).

- [x] [Must Have] Buat struktur monorepo pnpm sesuai Section 6 dokumen ini (`apps/web`, `apps/api`, `packages/contracts`, dst.)
  - Why it matters: Struktur ini menjadi fondasi seluruh pekerjaan berikutnya dan memisahkan tanggung jawab frontend/backend/kontrak.
  - Claude Skill: backend-api, frontend-design
  - Dependency: Git repo diinisialisasi.
  - Output / Evidence: `pnpm-workspace.yaml`, folder skeleton dengan `package.json` masing-masing.
  - Acceptance criteria: `pnpm install` berjalan tanpa error dari root.
  - Risk if skipped: Struktur berantakan menyulitkan Claude Code bekerja dengan scope yang jelas.

- [x] [Should Have] Setup `.github/workflows/` untuk CI dasar (lint, typecheck, test, build) tanpa auto-deploy
  - Why it matters: BRD eksplisit menyatakan CI hanya untuk validasi, bukan deploy otomatis sampai demo tervalidasi manual.
  - Claude Skill: testing-qa
  - Dependency: Struktur monorepo P1 selesai.
  - Output / Evidence: Workflow YAML yang menjalankan `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
  - Acceptance criteria: CI berjalan hijau di setiap push/PR.
  - Risk if skipped: Regresi tidak terdeteksi otomatis sebelum rehearsal.

- [x] [Must Have] Buat `.env.example` tanpa nilai rahasia apa pun
  - Why it matters: Memberi template variabel lingkungan tanpa risiko commit rahasia.
  - Claude Skill: security-review
  - Dependency: Daftar environment variable dari Section 7 dokumen ini.
  - Output / Evidence: File `.env.example` berisi nama variabel saja (lihat Section 7).
  - Acceptance criteria: File tidak berisi satu pun nilai kredensial asli.
  - Risk if skipped: Developer baru bingung variabel apa yang dibutuhkan, atau justru mengisi `.env` asli yang ter-commit.

### P2. Claude Code Governance and Skills

- [x] [Must Have] Buat `CLAUDE.md` proyek berisi aturan non-negotiable dari BRD Section 10.4
  - Why it matters: Menjadi kontrak permanen yang membatasi perilaku Claude Code selama proyek berjalan.
  - Claude Skill: —
  - Dependency: P1 struktur repo.
  - Output / Evidence: File `CLAUDE.md` di root repo.
  - Acceptance criteria: Memuat larangan `any`, larangan rahasia di source, kewajiban migration untuk skema, kewajiban repository layer, kewajiban validasi input, larangan set status paid dari redirect, kewajiban idempotent webhook, kewajiban lint/typecheck/test/build sebelum selesai.
  - Risk if skipped: Claude Code dapat mengambil jalan pintas tidak aman (R-05 pada Risk Register BRD).

- [x] [Must Have] Buat skill `.claude/skills/frontend-design/SKILL.md`
  - Why it matters: Mengarahkan Claude pada aturan UI responsif, aksesibilitas, dan kualitas frontend yang konsisten.
  - Claude Skill: frontend-design
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan layout, label form, error visible, keyboard focus, mobile responsiveness.
  - Acceptance criteria: Skill mencakup checklist aksesibilitas dasar sesuai NFR BRD Section 5.2.
  - Risk if skipped: UI tidak konsisten atau tidak accessible saat demo live.

- [x] [Must Have] Buat skill `.claude/skills/backend-api/SKILL.md`
  - Why it matters: Menjaga struktur route, validasi, error handling, dan middleware konsisten di seluruh API.
  - Claude Skill: backend-api
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan struktur route, safe error response, request ID, CORS.
  - Acceptance criteria: Skill mencakup pola validasi Zod dan pemisahan service/repository layer.
  - Risk if skipped: API dibangun tanpa boundary keamanan yang konsisten.

- [x] [Must Have] Buat skill `.claude/skills/database-engineering/SKILL.md`
  - Why it matters: Menjaga disiplin migration-first dan RLS sejak awal skema dibuat.
  - Claude Skill: database-engineering
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan migration wajib, index dan unique constraint, RLS wajib di semua tabel.
  - Acceptance criteria: Skill eksplisit melarang perubahan skema tanpa migration file.
  - Risk if skipped: Skema database drift dari migration, RLS lupa diaktifkan.

- [x] [Must Have] Buat skill `.claude/skills/payment-integration/SKILL.md`
  - Why it matters: Mengunci pola adapter Mayar, idempotency, dan verifikasi webhook agar tidak diimplementasikan sembarangan oleh AI.
  - Claude Skill: payment-integration
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan isolasi provider client, verifikasi server-side wajib, dedup webhook.
  - Acceptance criteria: Skill eksplisit melarang set status "paid" tanpa verifikasi server-side.
  - Risk if skipped: Risiko terbesar proyek — payment security gagal (BR-05, BR-06, SC-05).

- [x] [Must Have] Buat skill `.claude/skills/security-review/SKILL.md`
  - Why it matters: Menjadi checklist standar sebelum setiap fitur sensitif dianggap selesai.
  - Claude Skill: security-review
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan checklist secret handling, CORS, PII, dan live-demo checks dari BRD Section 8.3.
  - Acceptance criteria: Skill mencakup seluruh item checklist keamanan demo dari BRD.
  - Risk if skipped: Item keamanan kritikal terlewat sebelum go-live webinar.

- [x] [Must Have] Buat skill `.claude/skills/testing-qa/SKILL.md`
  - Why it matters: Menstandarkan lapisan test (unit, API, webhook, manual smoke) agar konsisten dieksekusi Claude.
  - Claude Skill: testing-qa
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan test data discipline dan lapisan test dari BRD Section 12.1.
  - Acceptance criteria: Skill mencakup unit test, API integration test, webhook test, dan manual smoke test.
  - Risk if skipped: Test coverage tidak konsisten, bug lolos ke rehearsal.

- [x] [Must Have] Buat skill `.claude/skills/demo-runbook/SKILL.md`
  - Why it matters: Menstandarkan checkpoint branch, langkah rehearsal, dan keamanan screen-sharing.
  - Claude Skill: demo-runbook
  - Dependency: CLAUDE.md dibuat.
  - Output / Evidence: File skill dengan aturan checkpoint branch dan fallback plan.
  - Acceptance criteria: Skill mencakup checklist operator demo dari BRD Section 11.4.
  - Risk if skipped: Operator demo tidak punya panduan konsisten saat live, meningkatkan risiko human error.

### P3. Architecture and Security Documentation

- [x] [Must Have] Buat Architecture Decision Record awal di `docs/decisions/`
  - Why it matters: Mencatat keputusan arsitektur (Cloudflare, Supabase, Mayar, monorepo) agar tidak diubah tanpa alasan jelas mendekati hari-H.
  - Claude Skill: —
  - Dependency: P0 scope lock.
  - Output / Evidence: File ADR markdown di `docs/decisions/0001-architecture-baseline.md`.
  - Acceptance criteria: ADR mencakup komponen dari BRD Section 6.2 (Customer Browser, Cloudflare Pages, Worker API, Supabase, Mayar, Claude Code).
  - Risk if skipped: Keputusan arsitektur diinterpretasikan ulang secara tidak konsisten oleh anggota tim berbeda.

- [x] [Must Have] Buat runbook keamanan di `docs/runbooks/`
  - Why it matters: Menjadi rujukan cepat saat rehearsal dan live demo untuk memverifikasi tidak ada kebocoran rahasia.
  - Claude Skill: security-review
  - Dependency: Skill security-review (P2) selesai.
  - Output / Evidence: File `docs/runbooks/security-checklist.md`.
  - Acceptance criteria: Mencakup seluruh item BRD Section 8.3 (Security checklist for live demo).
  - Risk if skipped: Operator demo lupa memverifikasi item keamanan kritikal sebelum live.

- [x] [Should Have] Dokumentasikan threat model ringkas berbasis BRD Section 8.2 di `docs/decisions/`
  - Why it matters: Membantu tim memahami mitigasi yang harus diimplementasikan per ancaman (price manipulation, webhook replay, dsb).
  - Claude Skill: security-review
  - Dependency: ADR arsitektur selesai.
  - Output / Evidence: File `docs/decisions/0002-threat-model.md`.
  - Acceptance criteria: Setiap ancaman dari BRD dipetakan ke kontrol teknis konkret yang akan diimplementasikan di P6-P9.
  - Risk if skipped: Mitigasi keamanan diimplementasikan tanpa mengacu eksplisit ke ancaman yang relevan.

### P4. Cloudflare, Supabase, and Mayar Environment Setup

- [x] [Must Have] Konfirmasi ketersediaan nama project Cloudflare Pages `warungkit-demo` dan kunci penamaan URL publik `warungkit-demo.pages.dev`
  - Why it matters: Nama dan URL publik frontend harus dikunci sejak awal agar tidak berubah mendekati hari-H (R-07), tanpa perlu membuat dan men-deploy project Pages kosong sebelum `apps/web` benar-benar ada.
  - Claude Skill: —
  - Dependency: Akun Cloudflare tersedia.
  - Output / Evidence: Konfirmasi bahwa nama `warungkit-demo` tersedia di Cloudflare Pages; catatan bahwa pembuatan project Pages sesungguhnya, koneksi GitHub, konfigurasi build, environment variable, dan deployment publik baru dilakukan di P10 setelah `apps/web` ada dan lulus validasi build.
  - Acceptance criteria: Nama project `warungkit-demo` dan URL `warungkit-demo.pages.dev` tercatat sebagai target final sebelum P7 selesai — tidak ada project Pages kosong yang dibuat/dideploy di tahap ini.
  - Risk if skipped: Perubahan nama/URL mendekati hari-H merusak konfigurasi CORS dan webhook.

- [x] [Must Have] Buat/reservasi project Cloudflare Workers dengan nama stabil menuju `warungkit-api.<cloudflare-subdomain>.workers.dev`
  - Why it matters: URL publik backend harus stabil karena menjadi endpoint webhook Mayar; reservasi nama project dilakukan lebih awal agar tidak berubah mendekati hari-H, terlepas dari kapan endpoint diimplementasikan.
  - Claude Skill: —
  - Dependency: Akun Cloudflare tersedia.
  - Output / Evidence: Project Cloudflare Worker direservasi atau aktif dengan URL publik stabil terdokumentasi.
  - Acceptance criteria: Nama project Worker dan URL publiknya terkonfirmasi dan terdokumentasi untuk digunakan pada deployment (P10) dan registrasi webhook Mayar (P8) di kemudian hari. Implementasi dan validasi `GET /health` yang benar-benar merespons tidak menjadi syarat penyelesaian tahap ini — itu adalah tugas P6 (implementasi) dan P10 (validasi publik).
  - Risk if skipped: Webhook Mayar tidak dapat didaftarkan ke URL yang stabil.

- [x] [Must Have] Buat project Supabase; simpan `SUPABASE_SECRET_KEY` sebagai Worker secret dan `SUPABASE_URL` sebagai Worker configuration variable backend-only
  - Why it matters: `SUPABASE_SECRET_KEY` adalah rahasia paling sensitif dalam proyek ini — tidak boleh bocor ke browser. `SUPABASE_URL` bukan rahasia, tetapi tetap backend-only dan tidak boleh di-commit dengan nilai produksi. (BRD PDF mungkin menyebut kredensial ini dengan istilah lama "service role key" — standar implementasi WarungKit menggunakan `SUPABASE_SECRET_KEY`.)
  - Claude Skill: database-engineering, security-review
  - Dependency: Akun Supabase tersedia.
  - Output / Evidence: Project Supabase aktif; `SUPABASE_SECRET_KEY` tersimpan via `wrangler secret put`, `SUPABASE_URL` tersimpan sebagai konfigurasi Worker.
  - Acceptance criteria: `SUPABASE_SECRET_KEY` tidak muncul di kode, `.env.example`, atau frontend build; `SUPABASE_URL` tidak muncul di frontend build.
  - Risk if skipped: Kebocoran akses penuh ke database (SC-01).

- [x] [Must Have] Buat akun Mayar sandbox/test dan simpan `MAYAR_API_KEY` hanya di Worker secret
  - Why it matters: Kredensial pembayaran adalah target risiko keamanan utama BRD.
  - Claude Skill: payment-integration, security-review
  - Dependency: Akun Mayar tersedia.
  - Output / Evidence: Sandbox Mayar aktif, API key tersimpan sebagai Worker secret.
  - Acceptance criteria: `MAYAR_API_KEY` tidak pernah muncul di frontend bundle atau network tab browser.
  - Risk if skipped: Kebocoran kredensial pembayaran (Threat: Leaked payment key).

- [x] [Must Have] Validasi izin/scope API key Mayar sandbox mencakup pembuatan invoice dan query status pembayaran
  - Why it matters: Key dengan izin tidak lengkap akan menggagalkan demo payment saat live.
  - Claude Skill: payment-integration
  - Dependency: Akun Mayar sandbox dibuat.
  - Output / Evidence: Hasil test call sukses membuat invoice dan mengambil status via Mayar API/dokumentasi terbaru.
  - Acceptance criteria: Test call manual (curl/Postman) berhasil membuat invoice test dan membaca statusnya.
  - Risk if skipped: Kegagalan integrasi baru diketahui saat implementasi P8, mepet H-3 hari.

- [x] [Should Have] Tentukan `ALLOWED_ORIGINS` awal mengarah ke penamaan URL Cloudflare Pages demo yang sudah dikunci (`warungkit-demo.pages.dev`)
  - Why it matters: CORS harus dikunci sejak awal, bukan ditambal di akhir (SC-06) — nilai awal ini bisa ditentukan dari penamaan URL yang dikunci di P4, meskipun project Pages sesungguhnya baru dibuat di P10.
  - Claude Skill: security-review, backend-api
  - Dependency: Penamaan URL Cloudflare Pages dikunci di P4.
  - Output / Evidence: Nilai `ALLOWED_ORIGINS` dicatat untuk digunakan di Worker config P6, dan dikonfirmasi ulang sebagai final di P10 setelah deployment Pages sesungguhnya.
  - Acceptance criteria: Tidak ada wildcard (`*`) digunakan sebagai origin.
  - Risk if skipped: CORS permisif menjadi celah keamanan (Threat: Misconfigured CORS).

### P5. Database Schema, RLS, and Seed Data

- [x] [Must Have] Buat migration untuk tabel `products` sesuai BRD Section 7.1
  - Why it matters: Menjadi source of truth harga dan katalog — tidak boleh diubah dari klien.
  - Claude Skill: database-engineering
  - Dependency: Project Supabase P4 aktif.
  - Output / Evidence: File migration di `supabase/migrations/`.
  - Acceptance criteria: Kolom mencakup `id` (UUID), `slug`, `name`, `description`, `price_idr`, `product_type`, `is_active`, `sort_order`, `created_at`, `updated_at`.
  - Risk if skipped: Tidak ada sumber kebenaran harga yang terstruktur (BR-03).

- [x] [Must Have] Buat migration untuk tabel `orders` sesuai BRD Section 7.1
  - Why it matters: Menyimpan state checkout dan pembayaran sebagai satu-satunya sumber kebenaran status order.
  - Claude Skill: database-engineering
  - Dependency: Migration `products` selesai.
  - Output / Evidence: File migration di `supabase/migrations/`.
  - Acceptance criteria: Kolom mencakup `id`, `order_code`, `product_id`, `customer_name`, `customer_email`, `customer_phone`, `amount_idr`, `status`, `mayar_invoice_id`, `mayar_invoice_url`, `receipt_token`, `paid_at`, `metadata`, timestamps.
  - Risk if skipped: Tidak ada tempat menyimpan state pending→paid secara auditable.

- [x] [Must Have] Buat migration untuk tabel `payment_events` sesuai BRD Section 7.1
  - Why it matters: Menjadi audit trail idempotent untuk mendeteksi webhook duplikat.
  - Claude Skill: database-engineering, payment-integration
  - Dependency: Migration `orders` selesai.
  - Output / Evidence: File migration di `supabase/migrations/`.
  - Acceptance criteria: Kolom mencakup `id`, `provider`, `provider_event_hash`, `provider_event_id`, `sanitized_payload`, `processing_status`, `processed_at`, `order_id`, timestamps; ada unique constraint pada hash/event id.
  - Risk if skipped: Webhook replay dapat diproses berkali-kali (BR-07).

- [x] [Must Have] Buat migration untuk tabel `checkout_idempotency` sesuai BRD Section 7.1
  - Why it matters: Mencegah duplikasi order dari retry/double-click checkout.
  - Claude Skill: database-engineering, payment-integration
  - Dependency: Migration `orders` selesai.
  - Output / Evidence: File migration di `supabase/migrations/`.
  - Acceptance criteria: Kolom mencakup `id`, `idempotency_key` (unique), `request_hash`, `order_id`, `response_payload`, `expires_at`, timestamps.
  - Risk if skipped: Klik ganda checkout menghasilkan order ganda (BR-11).

- [x] [Must Have] Aktifkan RLS di seluruh tabel (`products`, `orders`, `payment_events`, `checkout_idempotency`)
  - Why it matters: Non-negotiable rule proyek — tidak boleh ada tabel tanpa RLS.
  - Claude Skill: database-engineering, security-review
  - Dependency: Seluruh migration tabel selesai.
  - Output / Evidence: Statement `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` di migration.
  - Acceptance criteria: Query dari anon key tanpa policy eksplisit ditolak oleh Supabase.
  - Risk if skipped: Browser dapat mengakses data sensitif langsung (SC-04, BR-10).

- [x] [Must Have] Buat policy RLS: hanya `products` yang `is_active = true` dapat dibaca publik, tanpa policy permisif di tabel sensitif
  - Why it matters: Katalog perlu dapat dibaca publik, tapi order/payment tidak boleh diakses browser sama sekali.
  - Claude Skill: database-engineering, security-review
  - Dependency: RLS diaktifkan.
  - Output / Evidence: Policy SQL di migration.
  - Acceptance criteria: Anon key hanya bisa SELECT produk aktif; tidak ada SELECT/INSERT/UPDATE anon pada `orders`, `payment_events`, `checkout_idempotency`.
  - Risk if skipped: Kebocoran data pelanggan atau manipulasi order dari browser.

- [x] [Must Have] Buat `seed.sql` berisi 3 produk demo dengan harga final dari P0
  - Why it matters: Data demo harus konsisten setiap kali database di-reset untuk rehearsal.
  - Claude Skill: database-engineering
  - Dependency: Migration `products` selesai, harga final dikonfirmasi (P0).
  - Output / Evidence: File `supabase/seed.sql`.
  - Acceptance criteria: Menjalankan seed menghasilkan tepat 3 produk aktif sesuai BRD Section 3.2.
  - Risk if skipped: Data demo tidak konsisten antar rehearsal, menyulitkan validasi.

- [x] [Should Have] Tambahkan index dan unique constraint pada kolom pencarian tinggi (`order_code`, `slug`, `provider_event_hash`, `idempotency_key`)
  - Why it matters: Menjaga performa query tetap cepat (NFR performance < 3 detik) dan mencegah duplikasi data di level database.
  - Claude Skill: database-engineering
  - Dependency: Seluruh migration tabel selesai.
  - Output / Evidence: Statement `CREATE UNIQUE INDEX` di migration.
  - Acceptance criteria: Insert duplikat pada kolom unique menghasilkan constraint violation, bukan data ganda.
  - Risk if skipped: Race condition dapat menghasilkan order/event duplikat meski logic aplikasi benar.

### P6. Backend API Foundation

- [x] [Must Have] Setup project Hono di `apps/api` dengan struktur route/service/repository terpisah
  - Why it matters: Pemisahan layer memudahkan validasi keamanan dan pengujian terisolasi.
  - Claude Skill: backend-api
  - Dependency: P1 struktur monorepo, P2 skill backend-api.
  - Output / Evidence: Struktur folder `apps/api/src/{routes,services,repositories}`.
  - Acceptance criteria: `pnpm --filter api build` berhasil tanpa error.
  - Risk if skipped: Logic tercampur, menyulitkan audit keamanan sebelum demo.

- [x] [Must Have] Implementasikan `GET /health`
  - Why it matters: Endpoint dasar untuk memverifikasi Worker hidup sebelum debugging fitur lain.
  - Claude Skill: backend-api
  - Dependency: Setup Hono selesai.
  - Output / Evidence: Endpoint merespons `200 { status: "ok" }`.
  - Acceptance criteria: Dapat diakses dari URL publik Worker P4.
  - Risk if skipped: Tidak ada cara cepat memverifikasi deployment Worker saat troubleshooting live.

- [x] [Must Have] Implementasikan `GET /api/products` yang membaca dari tabel `products` via repository layer
  - Why it matters: Menjadi sumber katalog untuk frontend, memastikan harga selalu berasal dari database.
  - Claude Skill: backend-api, database-engineering
  - Dependency: Migration `products` (P5) dan seed data selesai.
  - Output / Evidence: Endpoint mengembalikan array produk aktif.
  - Acceptance criteria: Response hanya berisi produk dengan `is_active = true`, field harga sama dengan database.
  - Risk if skipped: Frontend tidak punya data katalog nyata untuk ditampilkan.

- [x] [Must Have] Terapkan middleware CORS dengan allowlist dari `ALLOWED_ORIGINS`
  - Why it matters: Non-negotiable rule — tidak boleh ada origin permisif di demo final.
  - Claude Skill: backend-api, security-review
  - Dependency: `ALLOWED_ORIGINS` ditentukan di P4.
  - Output / Evidence: Middleware CORS di `apps/api/src`.
  - Acceptance criteria: Request dari origin selain yang diizinkan ditolak.
  - Risk if skipped: Threat "Misconfigured CORS" terealisasi.

- [x] [Must Have] Terapkan request ID dan safe error handler di seluruh route
  - Why it matters: Observability tanpa mengekspos detail teknis ke klien.
  - Claude Skill: backend-api, security-review
  - Dependency: Setup Hono selesai.
  - Output / Evidence: Middleware yang men-generate request ID dan mengembalikan error message aman.
  - Acceptance criteria: Error response tidak menampilkan stack trace atau detail internal ke klien; request ID konsisten muncul di log dan response.
  - Risk if skipped: Kebocoran informasi teknis via pesan error (SC-09).

- [x] [Should Have] Siapkan struktur rate-limit readiness (belum tentu aktif penuh untuk demo)
  - Why it matters: BRD meminta "readiness", bukan implementasi penuh, agar tidak over-engineer untuk skala webinar.
  - Claude Skill: backend-api, security-review
  - Dependency: Middleware dasar selesai.
  - Output / Evidence: Struktur middleware rate-limit (dapat berupa stub/konfigurasi sederhana).
  - Acceptance criteria: Ada titik integrasi jelas di kode untuk mengaktifkan rate limit tanpa refactor besar.
  - Risk if skipped: Tidak signifikan untuk demo terkontrol, tapi menyulitkan ekstensi ke produksi.

### P7. Frontend Storefront and Checkout Experience

> **Scope note (keputusan final Q-04, lihat Section 17):** `apps/web` hanya berisi storefront publik (katalog, checkout, status pembayaran). Tidak ada halaman admin yang dibangun di frontend ini — bukti transaksi untuk presenter ditunjukkan langsung dari dashboard Supabase terkontrol (lihat P11 dan Section 15).

- [x] [Must Have] Setup project React + Vite + TypeScript + Tailwind di `apps/web`
  - Why it matters: Fondasi frontend sesuai keputusan BRD.
  - Claude Skill: frontend-design
  - Dependency: P1 struktur monorepo.
  - Output / Evidence: `apps/web` dengan `pnpm dev` berjalan lokal.
  - Acceptance criteria: `pnpm --filter web build` berhasil.
  - Risk if skipped: Tidak ada dasar untuk membangun UI katalog dan checkout.

- [x] [Must Have] Bangun halaman katalog yang mengambil data dari `GET /api/products`
  - Why it matters: Bagian "Discover" dari user journey utama.
  - Claude Skill: frontend-design
  - Dependency: P6 endpoint `/api/products` selesai.
  - Output / Evidence: Halaman menampilkan 3 produk demo dengan nama, deskripsi, harga, dan CTA "Beli Sekarang".
  - Acceptance criteria: Data yang tampil identik dengan data di database (bukan hardcode di frontend).
  - Risk if skipped: Demo tidak menunjukkan alur nyata backend-driven.

- [x] [Must Have] Bangun form checkout (nama, email, nomor WhatsApp) dengan validasi client-side
  - Why it matters: Validasi client-side untuk UX, tapi bukan satu-satunya lapisan keamanan (SC-03).
  - Claude Skill: frontend-design
  - Dependency: Skema Zod bersama di `packages/contracts` tersedia.
  - Output / Evidence: Form dengan pesan error yang jelas untuk input tidak lengkap/invalid.
  - Acceptance criteria: Field wajib tervalidasi sebelum submit; error message accessible (visible, label terkait).
  - Risk if skipped: UX buruk saat live demo jika ada input salah.

- [x] [Must Have] Kirim `productId`, data customer, dan `idempotencyKey` (client-generated UUID) ke `POST /api/checkout`
  - Why it matters: Klien tidak pernah mengirim harga final — hanya identitas produk (BR-02).
  - Claude Skill: frontend-design, payment-integration
  - Dependency: Endpoint `/api/checkout` (P8) tersedia.
  - Output / Evidence: Request payload sesuai kontrak BRD Section 9.2.
  - Acceptance criteria: Network tab tidak pernah menunjukkan field harga yang dikirim dari klien.
  - Risk if skipped: Celah manipulasi harga dari dev tools browser (Threat: Price manipulation).

- [x] [Must Have] Redirect otomatis ke `paymentUrl` dari response checkout
  - Why it matters: Bagian "Pay" dari user journey — customer diarahkan ke halaman Mayar.
  - Claude Skill: frontend-design
  - Dependency: Response checkout mengandung `paymentUrl` valid.
  - Output / Evidence: Redirect browser berhasil ke domain Mayar.
  - Acceptance criteria: Redirect terjadi hanya setelah response sukses dari backend, bukan simulasi di frontend.
  - Risk if skipped: Alur demo terputus antara checkout dan pembayaran.

- [x] [Must Have] Bangun halaman status pembayaran dengan polling 3 detik, batas maksimum 45 detik, dan tombol cek manual "Cek Status Pembayaran"
  - Why it matters: Status page harus mencerminkan state database, bukan asumsi dari redirect. Keputusan final (menjawab Open Question Q-02, lihat Section 17): halaman membaca `orderId` dan receipt token dari alur kembalian pembayaran, memanggil `GET /api/orders/:orderId` dengan token tersebut, melakukan polling otomatis setiap 3 detik, berhenti polling otomatis setelah maksimum 45 detik, lalu menampilkan tombol manual "Cek Status Pembayaran" agar pengguna dapat memeriksa ulang status kapan saja setelah polling berhenti.
  - Claude Skill: frontend-design, security-review
  - Dependency: Endpoint `/api/orders/:orderId` (P8) tersedia dan mendukung akses via receipt token.
  - Output / Evidence: Halaman menampilkan status `pending`/`payment_created`/`paid`/`expired`/`failed`/`cancelled`, dengan indikator polling aktif dan tombol cek manual yang selalu terlihat setelah polling berhenti.
  - Acceptance criteria: Status "paid" hanya muncul jika backend mengembalikan `paid` dari database setelah verifikasi server-side terhadap Mayar — parameter query dari redirect tidak pernah dipercaya sebagai bukti pembayaran (BR-05). Polling berhenti otomatis tepat pada atau sebelum 45 detik; tombol manual tetap berfungsi tanpa batas waktu setelahnya.
  - Risk if skipped: Risiko keamanan terbesar — fake paid status dapat ditampilkan begitu saja dari URL; tanpa fallback manual, pengguna terjebak jika webhook terlambat lebih dari 45 detik.

- [x] [Should Have] Terapkan aksesibilitas dasar: label form, fokus keyboard, responsif mobile
  - Why it matters: NFR aksesibilitas BRD Section 5.2.
  - Claude Skill: frontend-design
  - Dependency: Form checkout dan katalog selesai.
  - Output / Evidence: Halaman dapat dinavigasi via keyboard dan tampil baik di layar mobile.
  - Acceptance criteria: Tidak ada elemen interaktif tanpa label atau fokus yang terlihat.
  - Risk if skipped: Pengalaman buruk bagi audiens yang mencoba mengikuti demo di perangkat berbeda.

### P8. Mayar Payment and Webhook Integration

- [x] [Must Have] Buat service/adapter Mayar terisolasi di satu layer (`apps/api/src/services/mayar`)
  - Why it matters: BRD eksplisit meminta provider client terisolasi, memudahkan audit dan perubahan API provider.
  - Claude Skill: payment-integration
  - Dependency: `MAYAR_API_KEY` tersedia sebagai Worker secret (P4).
  - Output / Evidence: Modul service Mayar yang tidak diimpor langsung oleh frontend.
  - Acceptance criteria: Seluruh pemanggilan Mayar API melalui satu modul ini saja.
  - Risk if skipped: Duplikasi logic pemanggilan Mayar tersebar dan sulit diaudit.

- [x] [Must Have] Implementasikan `POST /api/checkout`: validasi input, resolve produk dari DB, buat order `pending`, buat invoice Mayar, simpan identifier
  - Why it matters: Ini adalah jantung alur BR-01 s.d. BR-11.
  - Claude Skill: backend-api, payment-integration, database-engineering
  - Dependency: Migration `orders` (P5), service Mayar, `checkout_idempotency` table.
  - Output / Evidence: Endpoint mengembalikan `orderId`, `orderCode`, `status`, `paymentUrl`, `expiresAt` sesuai kontrak BRD Section 9.2.
  - Acceptance criteria: Harga selalu diambil dari `products.price_idr`; permintaan dengan `idempotencyKey` sama tidak membuat order kedua.
  - Risk if skipped: Tanpa endpoint ini tidak ada demo checkout sama sekali.

- [x] [Must Have] Implementasikan `GET /api/orders/:orderId` dengan pembatasan akses aman (receipt token) yang mendukung polling frontend
  - Why it matters: Status order adalah data yang perlu dibatasi agar tidak bisa diakses sembarang orang menebak ID. Endpoint ini juga menjadi dasar keputusan final polling status pembayaran (Q-02, lihat Section 17): dipanggil setiap 3 detik oleh frontend selama maksimum 45 detik, dan dipanggil ulang oleh tombol manual "Cek Status Pembayaran" setelah itu.
  - Claude Skill: backend-api, security-review
  - Dependency: Tabel `orders` memiliki `receipt_token`.
  - Output / Evidence: Endpoint hanya mengembalikan data jika token valid disertakan; respons cukup ringan untuk dipanggil berulang tanpa membebani backend selama polling.
  - Acceptance criteria: Request tanpa token yang benar tidak mengembalikan detail order. Status "paid" hanya dikembalikan setelah verifikasi server-side terhadap Mayar tersimpan di database — tidak pernah berdasarkan asumsi dari redirect.
  - Risk if skipped: Order pelanggan lain dapat diakses hanya dengan menebak ID (BR-10).

- [x] [Must Have] Implementasikan `POST /api/webhooks/mayar`: terima event, hash/dedup, verifikasi status ke Mayar server-side, update status order idempotent
  - Why it matters: Ini satu-satunya jalur sah untuk mengubah order menjadi `paid` (BR-06).
  - Claude Skill: backend-api, payment-integration, security-review
  - Dependency: Tabel `payment_events`, service Mayar, endpoint `/api/checkout` selesai.
  - Output / Evidence: Endpoint publik yang dapat menerima webhook dari Mayar sandbox.
  - Acceptance criteria: Event dengan hash/id yang sama tidak memproses transisi status dua kali; status hanya berubah setelah verifikasi server-side ke Mayar API (bukan hanya percaya payload webhook).
  - Risk if skipped: Celah keamanan pembayaran paling kritikal — webhook spoofing/replay.

- [x] [Must Have] Implementasikan transisi status sesuai BRD Section 7.4 (`pending→payment_created→paid/expired/failed`, `pending→cancelled`, `paid→paid` no-op)
  - Why it matters: Mencegah transisi status yang tidak valid atau tidak konsisten.
  - Claude Skill: backend-api, database-engineering
  - Dependency: Endpoint checkout dan webhook selesai.
  - Output / Evidence: Fungsi state machine di service layer order.
  - Acceptance criteria: Transisi di luar tabel BRD Section 7.4 ditolak oleh logic aplikasi.
  - Risk if skipped: Status order bisa berubah secara tidak konsisten atau mundur (mis. paid → pending).

- [x] [Must Have] Daftarkan URL webhook publik Worker ke dashboard Mayar sandbox
  - Why it matters: Tanpa registrasi ini, Mayar tidak dapat mengirim event ke backend.
  - Claude Skill: payment-integration
  - Dependency: Worker dideploy publik (P4/P10).
  - Output / Evidence: Konfigurasi webhook URL tersimpan di dashboard Mayar.
  - Acceptance criteria: Test webhook dari dashboard Mayar berhasil diterima backend.
  - Risk if skipped: Demo live tidak dapat menerima notifikasi pembayaran sama sekali.

- [x] [Should Have] Tangani skenario expired dan failed payment di webhook handler
  - Why it matters: Demo harus bisa menjelaskan kegagalan pembayaran, bukan hanya jalur sukses.
  - Claude Skill: payment-integration
  - Dependency: Webhook handler dasar selesai.
  - Output / Evidence: Test case untuk event expired/failed mengubah status sesuai.
  - Acceptance criteria: Order berstatus `expired`/`failed` tidak dapat "dipulihkan" menjadi `paid` tanpa event verifikasi baru yang valid.
  - Risk if skipped: Skenario kegagalan pembayaran tidak dapat didemokan atau justru bug saat terjadi live.

### P9. Security, Testing, and Observability

- [ ] [Must Have] Jalankan secret-scanning manual/otomatis terhadap seluruh riwayat git sebelum deployment publik
  - Why it matters: Memastikan tidak ada rahasia pernah ter-commit, bahkan yang sudah "dihapus" di commit berikutnya.
  - Claude Skill: security-review
  - Dependency: Seluruh kode P1-P8 selesai.
  - Output / Evidence: Laporan hasil scan (mis. `git log -p | grep` terarah atau tool scanning).
  - Acceptance criteria: Tidak ditemukan pola API key/`SUPABASE_SECRET_KEY` di riwayat commit.
  - Risk if skipped: Rahasia bocor permanen meski sudah "diperbaiki" di commit terbaru.

- [x] [Must Have] Tulis unit test untuk skema Zod, resolusi harga, helper idempotency, dan transisi status order
  - Why it matters: Validasi logic bisnis kritikal secara terisolasi.
  - Claude Skill: testing-qa
  - Dependency: `packages/contracts` dan service order selesai.
  - Output / Evidence: File test di `apps/api`/`packages/contracts` yang lulus `pnpm test`.
  - Acceptance criteria: Coverage mencakup semua transisi status valid dan minimal satu kasus invalid.
  - Risk if skipped: Bug logic bisnis baru terdeteksi saat demo live.

- [x] [Must Have] Tulis API integration test untuk `/health`, `/api/products`, validasi checkout, dan duplicate checkout
  - Why it matters: Memverifikasi kontrak request/response sesuai BRD Section 9.
  - Claude Skill: testing-qa, backend-api
  - Dependency: Endpoint P6/P8 selesai.
  - Output / Evidence: Test suite API yang lulus.
  - Acceptance criteria: Test eksplisit memverifikasi bahwa checkout duplikat (idempotency key sama) tidak membuat order kedua.
  - Risk if skipped: Idempotency BR-11 tidak benar-benar terverifikasi otomatis.

- [x] [Must Have] Tulis webhook test untuk event duplikat, event tidak valid, kegagalan verifikasi, dan transisi ke paid
  - Why it matters: Ini adalah area risiko keamanan tertinggi di seluruh proyek.
  - Claude Skill: testing-qa, payment-integration
  - Dependency: Endpoint webhook P8 selesai.
  - Output / Evidence: Test suite webhook yang lulus.
  - Acceptance criteria: Test eksplisit memverifikasi bahwa event dengan hash sama diproses sebagai no-op kedua kali.
  - Risk if skipped: Webhook replay/spoofing tidak terdeteksi sebelum live.

- [ ] [Must Have] Lakukan manual smoke test: checkout browser nyata melalui Mayar sandbox hingga status order berubah
  - Why it matters: Test otomatis tidak menggantikan verifikasi pengalaman pengguna nyata end-to-end.
  - Claude Skill: testing-qa
  - Dependency: Deployment demo (P10) tersedia.
  - Output / Evidence: Catatan hasil smoke test (order code yang berhasil paid).
  - Acceptance criteria: Alur penuh dari klik "Beli Sekarang" hingga status "paid" berhasil tanpa intervensi manual database.
  - Risk if skipped: Kegagalan alur nyata baru diketahui saat live webinar.

- [ ] [Must Have] Verifikasi logging aman: request ID muncul, PII di-mask, tidak ada payload sensitif penuh yang dicatat
  - Why it matters: SC-07 — mencegah kebocoran data pelanggan atau payload pembayaran mentah di log.
  - Claude Skill: security-review, backend-api
  - Dependency: Middleware logging P6 selesai.
  - Output / Evidence: Contoh log actual dari request test yang menunjukkan masking.
  - Acceptance criteria: Log tidak pernah menampilkan email/nomor WhatsApp lengkap atau payload webhook mentah.
  - Risk if skipped: Kebocoran PII saat log diakses/di-screenshot.

- [ ] [Should Have] Jalankan dependency audit (`pnpm audit` atau setara) sebelum deployment final
  - Why it matters: Memastikan tidak ada dependency dengan kerentanan kritikal yang diketahui.
  - Claude Skill: security-review
  - Dependency: Seluruh dependency terpasang.
  - Output / Evidence: Laporan audit tanpa kerentanan kritikal terbuka.
  - Acceptance criteria: Tidak ada kerentanan severity tinggi/kritikal yang belum ditangani.
  - Risk if skipped: Risiko keamanan dari pihak ketiga tidak diketahui sebelum demo publik.

- [x] [Must Have] Verifikasi bahwa observabilitas order/payment hanya via dashboard Supabase terkontrol, bukan admin page WarungKit
  - Why it matters: Keputusan final Q-04 (lihat Section 17) — WarungKit tidak membangun admin dashboard untuk MVP webinar; dashboard Supabase digunakan khusus untuk observabilitas presenter, bukan bagian dari produk publik.
  - Claude Skill: security-review, database-engineering
  - Dependency: RLS (P5) aktif; akun Supabase presenter memiliki akses dashboard yang sesuai.
  - Output / Evidence: Konfirmasi bahwa tidak ada route/halaman admin di `apps/web`; akses dashboard Supabase dibatasi hanya untuk akun presenter/tim internal.
  - Acceptance criteria: Tidak ada endpoint atau halaman publik yang mengekspos daftar order/payment event; pelanggan atau pengguna anonim tidak dapat mengakses data order Supabase secara langsung.
  - Risk if skipped: Risiko kebocoran data pelanggan lain jika observabilitas tidak dibatasi hanya untuk presenter.

### P10. Cloudflare Deployment and End-to-End Validation

- [ ] [Must Have] Buat/hubungkan project Cloudflare Pages `warungkit-demo`, hubungkan repository GitHub yang sesuai, konfigurasi build command dan output directory, lalu deploy `apps/web` publik ke `warungkit-demo.pages.dev`
  - Why it matters: Frontend publik yang stabil dibutuhkan untuk rehearsal dan live demo; pembuatan project Pages baru dilakukan di sini (bukan di P4) karena `apps/web` sudah ada dan lulus validasi build, sehingga tidak ada project Pages kosong yang perlu di-maintain lebih awal.
  - Claude Skill: —
  - Dependency: P7 frontend selesai dan lulus build; nama project `warungkit-demo` sudah dikonfirmasi tersedia di P4.
  - Output / Evidence: Project Cloudflare Pages `warungkit-demo` aktif, terhubung ke repository/workflow deployment yang disetujui, build command dan output directory terkonfigurasi benar; URL dapat diakses publik dan menampilkan katalog nyata.
  - Acceptance criteria: Deployment berhasil tanpa error build; halaman termuat sempurna di `warungkit-demo.pages.dev`; alur storefront dan checkout tervalidasi dari URL Pages publik; URL Pages final dikonfirmasi digunakan di `ALLOWED_ORIGINS` Worker.
  - Risk if skipped: Tidak ada versi publik untuk direhearsalkan.

- [ ] [Must Have] Deploy `apps/api` ke Cloudflare Workers di URL `warungkit-api.<cloudflare-subdomain>.workers.dev`
  - Why it matters: Backend publik dibutuhkan agar webhook Mayar dapat mencapainya.
  - Claude Skill: —
  - Dependency: P8 backend selesai dan lulus build.
  - Output / Evidence: `GET /health` merespons 200 dari URL publik.
  - Acceptance criteria: Seluruh endpoint (`/api/products`, `/api/checkout`, `/api/orders/:orderId`, `/api/webhooks/mayar`) dapat diakses dari URL publik.
  - Risk if skipped: Webhook dan checkout tidak dapat diuji dalam kondisi nyata.

- [ ] [Must Have] Set Worker secret (`MAYAR_API_KEY`, `SUPABASE_SECRET_KEY`) via `wrangler secret put`, dan Worker configuration variables (`MAYAR_API_BASE_URL`, `SUPABASE_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT`) sebagai konfigurasi backend-only — tidak ada nilai produksi dari kedua kelompok ini yang ter-commit
  - Why it matters: Non-negotiable — kredensial rahasia hanya boleh ada di secret store Cloudflare; nilai konfigurasi backend tetap tidak boleh ter-commit meski bukan kredensial.
  - Claude Skill: security-review
  - Dependency: Worker deployment aktif.
  - Output / Evidence: Daftar secret terkonfirmasi via `wrangler secret list` (nama saja, bukan nilai); daftar configuration variable terdokumentasi terpisah dari daftar secret.
  - Acceptance criteria: Tidak ada rahasia atau nilai konfigurasi produksi di `wrangler.toml` atau file yang ter-commit.
  - Risk if skipped: Risiko kebocoran rahasia di riwayat git atau dashboard publik.

- [ ] [Must Have] Set `VITE_API_BASE_URL` di environment variable frontend Cloudflare Pages
  - Why it matters: Frontend perlu tahu URL backend publik tanpa hardcode.
  - Claude Skill: —
  - Dependency: URL Worker P4/P10 final.
  - Output / Evidence: Environment variable dikonfigurasi di dashboard Cloudflare Pages.
  - Acceptance criteria: Frontend berhasil memanggil backend menggunakan variable ini, bukan URL hardcoded.
  - Risk if skipped: Perubahan URL backend memerlukan rebuild kode, bukan konfigurasi.

- [ ] [Must Have] Kunci `ALLOWED_ORIGINS` production ke URL Cloudflare Pages final
  - Why it matters: CORS harus final sebelum rehearsal, sesuai R-07 Risk Register.
  - Claude Skill: security-review
  - Dependency: URL Cloudflare Pages final dikonfirmasi.
  - Output / Evidence: Nilai `ALLOWED_ORIGINS` Worker sesuai domain Pages yang sebenarnya.
  - Acceptance criteria: Request dari domain lain selain domain demo ditolak oleh backend.
  - Risk if skipped: Threat "Misconfigured CORS" tetap terbuka di production demo.

- [ ] [Must Have] Jalankan validasi end-to-end penuh di environment publik: discover → checkout → bayar sandbox → webhook → paid → status page
  - Why it matters: Ini adalah bukti akhir bahwa seluruh sistem bekerja sebagaimana dirancang di BRD.
  - Claude Skill: testing-qa, payment-integration
  - Dependency: Seluruh deployment P10 selesai.
  - Output / Evidence: Catatan hasil uji dengan order code dan waktu transisi status.
  - Acceptance criteria: Order berhasil mencapai status `paid` melalui webhook nyata, bukan update manual database.
  - Risk if skipped: Risiko kegagalan alur baru diketahui saat live webinar berlangsung.

### P11. Webinar Rehearsal, Fallback, and Live Demo Readiness

- [ ] [Must Have] Siapkan checkpoint branch `demo-start`, `demo-payment`, `demo-final`
  - Why it matters: Memberi operator demo jalur mundur aman jika terjadi kegagalan di satu tahap.
  - Claude Skill: demo-runbook
  - Dependency: P7, P8, P10 selesai per tahap terkait.
  - Output / Evidence: Branch git yang dapat di-checkout sesuai BRD Appendix B.
  - Acceptance criteria: Setiap branch dapat di-build dan dijalankan tanpa error.
  - Risk if skipped: Tidak ada jalur pemulihan cepat jika demo live gagal di satu tahap.

- [ ] [Must Have] Rekam/screenshot backup `demo-backup` untuk skenario known-good payment
  - Why it matters: Fallback wajib jika koneksi internet atau sandbox Mayar bermasalah saat live (R-01, R-02).
  - Claude Skill: demo-runbook
  - Dependency: Validasi end-to-end P10 berhasil minimal sekali.
  - Output / Evidence: File rekaman video/screenshot tersimpan di folder yang mudah diakses saat live.
  - Acceptance criteria: Materi backup mencakup seluruh alur dari checkout hingga status paid.
  - Risk if skipped: Tidak ada rencana cadangan jika demo live gagal total.

- [ ] [Must Have] Lakukan dry run penuh 60 menit mengikuti Run Sheet (Section 15 dokumen ini)
  - Why it matters: Validasi timing dan kelancaran narasi sebelum hari-H.
  - Claude Skill: demo-runbook
  - Dependency: Seluruh materi presentasi dan demo teknis siap.
  - Output / Evidence: Catatan waktu aktual tiap segmen dibandingkan target.
  - Acceptance criteria: Dry run selesai dalam rentang waktu wajar mendekati 60 menit, tanpa kegagalan teknis kritikal.
  - Risk if skipped: Timing meleset atau kegagalan teknis baru ditemukan saat live.

- [ ] [Must Have] Verifikasi ulang checklist keamanan live demo (BRD Section 8.3) tepat sebelum sesi
  - Why it matters: Item seperti "no secret dashboard shown" harus dicek ulang setiap kali sebelum live, bukan hanya sekali di awal.
  - Claude Skill: security-review, demo-runbook
  - Dependency: Dry run selesai.
  - Output / Evidence: Checklist tercentang penuh tepat sebelum sesi webinar dimulai.
  - Acceptance criteria: Seluruh item BRD Section 8.3 terkonfirmasi ulang H-0.
  - Risk if skipped: Kelalaian kecil (mis. tab dashboard secret masih terbuka) terekspos ke audiens live.

- [ ] [Must Have] Siapkan tab dashboard Supabase terkontrol untuk menunjukkan bukti transaksi presenter (keputusan final Q-04, lihat Section 17)
  - Why it matters: WarungKit tidak membangun admin dashboard untuk MVP webinar — bukti order/paid ditunjukkan langsung dari Supabase, khusus untuk presenter, bukan fitur publik.
  - Claude Skill: demo-runbook, security-review
  - Dependency: RLS aktif (P5); akses dashboard Supabase terbatas pada akun presenter.
  - Output / Evidence: Tab dashboard Supabase pre-loaded menampilkan tabel `orders`/`payment_events` dengan hanya data demo non-sensitif.
  - Acceptance criteria: Tidak ada kolom sensitif (mis. secret, token internal selain yang memang perlu didemokan) yang tampil di layar; presenter memahami dashboard ini hanya untuk observabilitas, bukan diklaim sebagai fitur produk WarungKit.
  - Risk if skipped: Audiens bisa salah paham bahwa WarungKit memiliki admin dashboard produk, atau data sensitif tak sengaja tertampil.

- [ ] [Should Have] Siapkan profil browser demo khusus tanpa kredensial pribadi/notifikasi
  - Why it matters: Mencegah kebocoran data pribadi presenter secara tidak sengaja saat screen-share.
  - Claude Skill: demo-runbook
  - Dependency: —
  - Output / Evidence: Profil browser terpisah dengan tab yang sudah pre-loaded (frontend, Worker logs, Supabase table, Mayar test page).
  - Acceptance criteria: Tidak ada notifikasi pribadi atau bookmark sensitif terlihat selama demo.
  - Risk if skipped: Risiko rendah tapi berdampak tinggi jika informasi pribadi presenter terekspos publik.

---

## 5. Required Claude Code Skills

- [x] **frontend-design**
  - Purpose: Memastikan UI katalog, checkout, dan status pembayaran responsif, accessible, dan bebas gaya generik AI.
  - When it must be invoked: Setiap kali membangun/mengubah komponen di `apps/web`.
  - Required inputs: Kontrak Zod dari `packages/contracts`, daftar endpoint yang tersedia, prinsip desain BRD Section 5.2 (NFR Accessibility).
  - Non-negotiable rules: Tidak menampilkan/menyimpan data sensitif di state client; label form dan pesan error selalu visible; tidak hardcode harga/produk di frontend.
  - Completion criteria: Lint, typecheck, build lulus; halaman accessible via keyboard; data katalog berasal dari API, bukan hardcode.

- [x] **backend-api**
  - Purpose: Membangun route Hono dengan validasi, error handling aman, dan struktur service/repository yang jelas.
  - When it must be invoked: Setiap kali membuat/mengubah endpoint di `apps/api`.
  - Required inputs: Skema Zod bersama, daftar environment variable (Section 7), aturan CORS/trust boundary BRD Section 6.3.
  - Non-negotiable rules: Semua input divalidasi ulang di backend; error response tidak membocorkan detail teknis; harga selalu diresolusi dari database.
  - Completion criteria: Lint, typecheck, test, build lulus; endpoint sesuai kontrak BRD Section 9.1; CORS allowlist aktif.

- [x] **database-engineering**
  - Purpose: Mengelola migration, RLS, index, dan struktur repository layer Supabase.
  - When it must be invoked: Setiap kali skema database berubah atau query baru dibutuhkan.
  - Required inputs: Model entitas BRD Section 7.1, aturan lifecycle order BRD Section 7.3-7.4.
  - Non-negotiable rules: Tidak ada perubahan skema tanpa migration file; RLS wajib aktif di semua tabel; tidak ada policy anonim permisif.
  - Completion criteria: Migration dapat dijalankan ulang dari nol; RLS terverifikasi menolak akses anon yang tidak sah; seed data konsisten.

- [x] **payment-integration**
  - Purpose: Membangun adapter Mayar, alur checkout, dan verifikasi webhook yang aman dan idempotent.
  - When it must be invoked: Setiap kali mengubah logic pembuatan invoice, webhook, atau transisi status order.
  - Required inputs: Dokumentasi Mayar terkini (bukan asumsi dari BRD), kredensial sandbox, tabel `payment_events`/`checkout_idempotency`.
  - Non-negotiable rules: Verifikasi status pembayaran selalu server-side; webhook harus idempotent; status "paid" tidak pernah diset dari redirect browser semata.
  - Completion criteria: Test webhook duplikat/invalid lulus; transisi status sesuai BRD Section 7.4; smoke test checkout-ke-paid berhasil di sandbox.

- [x] **security-review**
  - Purpose: Memvalidasi tidak ada kebocoran rahasia, CORS aman, PII terjaga, dan checklist keamanan live demo terpenuhi.
  - When it must be invoked: Sebelum setiap deployment publik dan sebelum rehearsal/live demo.
  - Required inputs: Checklist BRD Section 8.3, daftar environment variable, akses ke riwayat git untuk scanning.
  - Non-negotiable rules: Tidak ada secret di kode/log/screenshot; RLS aktif; CORS allowlist eksplisit; PII di-mask di log.
  - Completion criteria: Checklist keamanan live demo tercentang penuh; secret scan bersih; review CORS dan RLS terdokumentasi.

- [x] **testing-qa**
  - Purpose: Menjalankan dan menjaga lapisan test (unit, API, webhook, manual smoke) tetap konsisten.
  - When it must be invoked: Setelah setiap perubahan fitur signifikan dan sebelum deployment ke environment demo.
  - Required inputs: Lapisan test BRD Section 12.1, akses environment sandbox untuk smoke test.
  - Non-negotiable rules: Tidak ada fitur dianggap selesai tanpa test yang relevan; smoke test manual wajib sebelum rehearsal.
  - Completion criteria: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` lulus; smoke test checkout tercatat berhasil.

- [x] **demo-runbook**
  - Purpose: Mengelola checkpoint branch, jadwal rehearsal, dan keamanan operasional saat live demo.
  - When it must be invoked: Menjelang dan selama fase rehearsal (P11), serta saat menyiapkan sesi live.
  - Required inputs: Checkpoint branch BRD Appendix B, rehearsal timeline BRD Section 11.3, operator checklist BRD Section 11.4.
  - Non-negotiable rules: Tidak ada perubahan kode/deploy baru saat live kecuali sudah direhearsal; profil browser demo terpisah dari akun pribadi.
  - Completion criteria: Seluruh checkpoint branch teruji; materi backup tersedia; dry run 60 menit selesai tanpa kegagalan kritikal.

---

## 6. Required Repository Structure

```
warungkit/
├── apps/
│   ├── web/                # Storefront React + Vite + TypeScript + Tailwind (frontend statis di Cloudflare Pages)
│   └── api/                # Backend Hono API di Cloudflare Workers (satu-satunya penulis ke database dan pemanggil Mayar)
├── packages/
│   └── contracts/          # Skema Zod dan tipe TypeScript bersama antara frontend dan backend
├── supabase/
│   ├── migrations/         # Riwayat perubahan skema database dan RLS secara berurutan
│   └── seed.sql            # Data produk demo untuk katalog (tidak berisi data pelanggan)
├── .claude/
│   ├── skills/              # Skill Claude Code yang membatasi scope kerja per area (frontend, backend, database, payment, security, testing, demo)
│   └── settings.json       # Konfigurasi harness Claude Code untuk proyek ini
├── docs/
│   ├── decisions/           # Architecture Decision Record dan threat model
│   └── runbooks/            # Panduan operasional keamanan dan demo
├── scripts/                 # Skrip bantu lokal tanpa rahasia apa pun
├── tests/                   # Test lintas-aplikasi/integrasi bila diperlukan
├── CLAUDE.md                # Aturan permanen proyek untuk Claude Code
├── README.md                # Pengantar proyek untuk kontributor manusia
├── .gitignore                # Pengecualian file rahasia dan artefak build
├── .env.example              # Template nama variabel lingkungan tanpa nilai rahasia
├── package.json               # Konfigurasi root monorepo
└── pnpm-workspace.yaml         # Definisi workspace pnpm untuk apps dan packages
```

---

## 7. Environment and Secret Checklist

### Cloudflare Worker Secrets

Ini adalah kredensial sensitif dan hanya boleh disimpan melalui mekanisme secret Cloudflare Worker (mis. `wrangler secret put`), tidak pernah sebagai variabel konfigurasi biasa:

- [ ] `MAYAR_API_KEY`
- [ ] `SUPABASE_SECRET_KEY` *(catatan kompatibilitas: BRD PDF mungkin menyebut kredensial ini dengan istilah lama "service role key" — standar implementasi WarungKit menggunakan `SUPABASE_SECRET_KEY`, format Supabase secret key terkini)*

### Cloudflare Worker Configuration Variables

Ini adalah nilai konfigurasi backend-only. Nilai ini tidak terlihat oleh browser dan tidak boleh di-commit dengan nilai produksi, tetapi ini bukan kredensial rahasia seperti API key:

- [ ] `MAYAR_API_BASE_URL`
- [ ] `SUPABASE_URL`
- [ ] `ALLOWED_ORIGINS`
- [ ] `ENVIRONMENT`

### Frontend Public Environment Variables

Nilai ini boleh tersedia di build frontend dan tidak boleh pernah berisi rahasia apa pun:

- [ ] `VITE_API_BASE_URL`

### Never Commit

- [ ] Nilai asli dari seluruh variabel di tiga kelompok di atas — baik secret, konfigurasi backend, maupun konfigurasi frontend — tidak boleh pernah di-commit ke Git, termasuk melalui file `.env`, `.dev.vars`, file konfigurasi lokal apa pun, screenshot, output terminal, atau dokumentasi.
- [ ] Hanya nama variabel (bukan nilainya) yang boleh muncul di `.env.example`.
- [ ] Screenshot atau rekaman yang menampilkan dashboard secret Cloudflare/Supabase/Mayar.

---

## 8. Database Readiness Checklist

- [ ] Tabel `products` dibuat dengan kolom sesuai BRD Section 7.1 dan berfungsi sebagai satu-satunya sumber harga.
- [ ] Tabel `orders` dibuat dengan kolom lengkap termasuk `receipt_token` untuk pembatasan akses status.
- [ ] Tabel `payment_events` dibuat dengan constraint unique pada `provider_event_hash`/`provider_event_id` untuk idempotensi.
- [ ] Tabel `checkout_idempotency` dibuat dengan constraint unique pada `idempotency_key`.
- [ ] Seluruh primary key menggunakan UUID.
- [ ] Seluruh tabel memiliki `created_at` dan `updated_at` (audit timestamps).
- [ ] Index dan unique constraint diterapkan pada kolom pencarian tinggi (`order_code`, `slug`, event hash, idempotency key).
- [ ] RLS diaktifkan di seluruh tabel tanpa terkecuali.
- [ ] Data seed produk demo (3 produk) tersedia dan konsisten setiap kali database di-reset.
- [ ] Akses ke tabel `orders`, `payment_events`, `checkout_idempotency` hanya melalui service role dari backend — tidak ada akses anon langsung.
- [ ] Event pembayaran duplikat (hash/id sama) tidak menghasilkan baris baru atau efek samping ganda.
- [ ] `products.price_idr` dikonfirmasi sebagai satu-satunya sumber kebenaran harga di seluruh sistem.

---

## 9. API Readiness Checklist

### `GET /health`
- Purpose: Memverifikasi Worker API hidup dan dapat diakses publik.
- Validation: Tidak ada input untuk divalidasi.
- Trust boundary: Publik, tidak menyentuh data sensitif.
- Success response: `200 { status: "ok" }`.
- Failure response: Tidak berlaku dalam kondisi normal (endpoint tanpa dependency eksternal).
- Security requirement: Tidak mengekspos informasi versi/infrastruktur sensitif.
- Test evidence: Dipanggil dari URL publik dan lulus di CI/smoke test.

### `GET /api/products`
- Purpose: Menyediakan data katalog untuk frontend.
- Validation: Tidak ada input dari klien untuk divalidasi (query publik tanpa parameter sensitif).
- Trust boundary: Publik, hanya baca data non-sensitif.
- Success response: Array produk aktif dengan `id`, `name`, `description`, `price_idr`, dll.
- Failure response: Pesan error generik jika database tidak dapat diakses; tidak membocorkan detail koneksi.
- Security requirement: Hanya produk `is_active = true` yang dikembalikan.
- Test evidence: Integration test memverifikasi field harga sama dengan data di database.

### `POST /api/checkout`
- Purpose: Membuat order pending dan invoice pembayaran Mayar.
- Validation: Skema Zod untuk `productId`, `customer.{name,email,phone}`, `idempotencyKey` (wajib UUID valid).
- Trust boundary: Klien mengirim niat (product + data diri), backend menentukan harga dan status.
- Success response: `{ orderId, orderCode, status, paymentUrl, expiresAt }`.
- Failure response: Error tervalidasi (400) untuk input tidak valid; error aman (500) untuk kegagalan internal tanpa detail teknis.
- Security requirement: Harga tidak pernah diterima dari body request; idempotency key mencegah duplikasi order.
- Test evidence: Integration test untuk checkout valid, checkout dengan produk tidak aktif, dan checkout duplikat (idempotency key sama).

### `GET /api/orders/:orderId`
- Purpose: Menyediakan status order untuk halaman status pembayaran, termasuk mendukung polling otomatis setiap 3 detik (maksimum 45 detik) dan pemanggilan manual via tombol "Cek Status Pembayaran" (keputusan final Q-02, lihat Section 17).
- Validation: `orderId` format valid; token akses (receipt token) divalidasi.
- Trust boundary: Publik hanya dengan token yang benar; tidak ada enumerasi order lain; parameter query dari redirect Mayar tidak pernah dipercaya sebagai bukti status.
- Success response: Status order (`pending`/`payment_created`/`paid`/`expired`/`failed`/`cancelled`) dan data non-sensitif.
- Failure response: 404/403 generik jika token tidak valid, tanpa membocorkan apakah order ada.
- Security requirement: Tidak pernah mengembalikan data order tanpa token yang sah; status "paid" hanya dikembalikan setelah verifikasi server-side terhadap Mayar tersimpan di database.
- Test evidence: Test memverifikasi akses tanpa token/token salah ditolak; test memverifikasi endpoint dapat dipanggil berulang (polling) tanpa efek samping.

### `POST /api/webhooks/mayar`
- Purpose: Menerima event pembayaran dari Mayar dan memperbarui status order secara aman.
- Validation: Struktur payload webhook divalidasi terhadap pola yang diharapkan dari Mayar.
- Trust boundary: Payload webhook dianggap tidak tepercaya sampai status diverifikasi ulang ke Mayar API secara server-side.
- Success response: `200` acknowledgment setelah event diproses/diaudit (idempotent, termasuk untuk event duplikat).
- Failure response: Event tidak valid/tidak dapat diverifikasi dicatat sebagai anomali tanpa mengubah status order.
- Security requirement: Event hash/id dicek untuk mencegah replay; status "paid" hanya diset setelah verifikasi server-side berhasil.
- Test evidence: Test untuk event duplikat, event tidak valid, kegagalan verifikasi, dan transisi sukses ke paid.

---

## 10. Payment Integration Checklist

- [ ] Sandbox/test environment Mayar aktif dan dapat diakses tim sebelum implementasi P8.
- [ ] Izin/scope API key Mayar tervalidasi mencakup pembuatan invoice dan query status.
- [ ] Pembuatan invoice (create invoice) diimplementasikan melalui service adapter terisolasi.
- [ ] Redirect URL (payment URL) dikembalikan ke frontend hanya setelah invoice berhasil dibuat backend.
- [ ] URL webhook publik HTTPS terdaftar di dashboard Mayar sandbox.
- [ ] Verifikasi invoice/status pembayaran dilakukan server-side terhadap Mayar API, bukan hanya mempercayai payload webhook.
- [ ] Mekanisme pencegahan webhook duplikat (event hash/id) diimplementasikan dan diuji.
- [ ] Setiap event pembayaran dicatat di tabel `payment_events` dengan payload yang sudah disanitasi.
- [ ] Transisi status order mengikuti tabel BRD Section 7.4 tanpa penyimpangan.
- [ ] Skenario expired dan failed payment ditangani dan dapat didemokan.
- [ ] Status "paid" tidak pernah diset hanya berdasarkan redirect browser ke halaman sukses.
- [ ] Halaman status pembayaran melakukan polling `GET /api/orders/:orderId` setiap 3 detik, berhenti otomatis setelah maksimum 45 detik, dan menyediakan tombol manual "Cek Status Pembayaran" setelahnya (keputusan final Q-02, lihat Section 17).
- [ ] Parameter query dari redirect Mayar tidak pernah digunakan sebagai sumber status "paid" — status selalu dibaca ulang dari backend/database.

---

## 11. Security Review Checklist

- [ ] Secret scanning dijalankan terhadap seluruh riwayat git sebelum deployment publik.
- [ ] `.gitignore` mencakup seluruh file environment dan kredensial lokal.
- [ ] CORS allowlist eksplisit ke domain demo, tanpa wildcard.
- [ ] Validasi request dilakukan independen di backend, tidak mengandalkan validasi frontend saja.
- [ ] Struktur rate-limit readiness tersedia untuk endpoint checkout dan webhook.
- [ ] Request ID digunakan di seluruh log dan response error.
- [ ] Pesan error yang dikirim ke klien aman (tidak membocorkan detail teknis/internal).
- [ ] Logging tidak pernah mencatat secret, payload pembayaran mentah lengkap, atau PII tidak termask.
- [ ] RLS direview ulang di seluruh tabel sebelum deployment publik.
- [ ] Perlindungan replay webhook (hash/id dedup) diverifikasi dengan test otomatis.
- [ ] Dependency audit dijalankan dan tidak ada kerentanan kritikal terbuka.
- [ ] Threat model (BRD Section 8.2) direview ulang terhadap implementasi aktual sebelum go-live.
- [ ] Batas tanggung jawab browser vs backend didokumentasikan dan dipahami seluruh anggota tim (browser tidak pernah menjadi sumber kebenaran harga/status).

---

## 12. Test Plan Checklist

### Unit tests
- [ ] Validasi skema Zod (checkout request, webhook payload) — sukses dan gagal.
- [ ] Resolusi harga dari produk — memastikan harga selalu dari database.
- [ ] Helper idempotency key/request hash — deteksi duplikat dan kasus baru.
- [ ] Transisi status order — seluruh transisi valid dari BRD Section 7.4 dan penolakan transisi invalid.

### API tests
- [ ] `GET /health` merespons sukses.
- [ ] `GET /api/products` mengembalikan hanya produk aktif.
- [ ] `POST /api/checkout` sukses dengan input valid; gagal dengan input tidak lengkap/produk tidak aktif.
- [ ] `POST /api/checkout` duplikat (idempotency key sama) tidak membuat order kedua.

### Database tests
- [ ] RLS menolak akses anon ke `orders`, `payment_events`, `checkout_idempotency`.
- [ ] Constraint unique mencegah duplikasi `order_code`, `idempotency_key`, `provider_event_hash`.

### Webhook tests
- [ ] Event valid pertama kali memproses transisi status dengan benar.
- [ ] Event duplikat (hash/id sama) diproses sebagai no-op tanpa efek samping ganda.
- [ ] Event dengan format tidak valid ditolak/dicatat sebagai anomali tanpa mengubah status.
- [ ] Kegagalan verifikasi server-side terhadap Mayar tidak mengubah order menjadi paid.

### Payment tests
- [ ] Pembuatan invoice sandbox berhasil dan mengembalikan payment URL valid.
- [ ] Query status invoice sandbox berhasil dan konsisten dengan hasil webhook.
- [ ] Skenario expired/failed tervalidasi mengubah status sesuai.

### Security tests
- [ ] Tidak ada secret dalam response API atau bundle frontend (diverifikasi manual/otomatis).
- [ ] CORS menolak origin di luar allowlist.
- [ ] Akses `GET /api/orders/:orderId` tanpa token yang benar ditolak.

### Manual smoke tests
- [ ] Checkout browser nyata dari katalog hingga redirect ke Mayar sandbox berhasil.
- [ ] Pembayaran sandbox nyata memicu webhook dan status order berubah menjadi paid.
- [ ] Percobaan mengubah harga di dev tools browser tidak memengaruhi order yang dibuat backend.
- [ ] Halaman status pembayaran melakukan polling setiap 3 detik dan berhenti otomatis pada/sebelum 45 detik jika webhook belum diproses.
- [ ] Tombol manual "Cek Status Pembayaran" berfungsi dan menampilkan status terbaru setelah polling otomatis berhenti.
- [ ] Mengubah parameter query redirect secara manual (mis. menambahkan `status=paid` di URL) tidak membuat halaman menampilkan status paid tanpa konfirmasi backend.

### End-to-end test
- [ ] Alur penuh discover → select → checkout → pay → webhook → verified → paid → status page berhasil di environment demo publik.

### Regression checks sebelum webinar
- [ ] Seluruh test suite (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) lulus pada commit terakhir sebelum hari-H.
- [ ] Smoke test end-to-end diulang setelah perubahan konfigurasi apa pun (CORS, secret, URL).
- [ ] Tidak ada perubahan kode yang belum direhearsal setelah H-1 hari.

---

## 13. Deployment Checklist

- [ ] Cloudflare Pages project untuk `apps/web` dideploy ke `warungkit-demo.pages.dev` dengan nama project stabil. *(In Progress — repository GitHub sudah terhubung, Root directory dikoreksi ke `apps/web`; sedang memperbaiki "Deploy command"/"Non-production branch deploy command" yang salah berisi perintah `wrangler` bergaya Workers, menyebabkan langkah deploy gagal `EUNSUPPORTEDPROTOCOL` setelah build Vite sukses.)*
- [ ] Cloudflare Workers project untuk `apps/api` dideploy ke `warungkit-api.<cloudflare-subdomain>.workers.dev` dengan nama project stabil. *(Belum dikerjakan pada sesi ini.)*
- [ ] Worker secret (`MAYAR_API_KEY`, `SUPABASE_SECRET_KEY`) diset via `wrangler secret put`; Worker configuration variables (`MAYAR_API_BASE_URL`, `SUPABASE_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT`) diset sebagai konfigurasi backend-only tanpa nilai produksi ter-commit. *(Belum dikerjakan.)*
- [ ] Environment variable frontend (`VITE_API_BASE_URL`) diset di dashboard Cloudflare Pages, bukan hardcode di kode.
- [ ] `ALLOWED_ORIGINS` production dikunci ke URL Cloudflare Pages final sebelum rehearsal.
- [ ] Nama project Cloudflare (Pages dan Workers) dikunci minimal H-7 hari sebelum webinar, tidak diganti mendekati hari-H.
- [ ] URL webhook publik Worker didaftarkan ke dashboard Mayar sandbox dan diuji dapat menerima event.
- [ ] Smoke test deployment publik dijalankan setelah setiap deploy (bukan hanya sekali di awal).
- [ ] Rencana rollback: checkpoint branch (`demo-start`/`demo-payment`/`demo-final`) tersedia untuk redeploy cepat bila terjadi kegagalan konfigurasi mendekati hari-H.

---

## 14. Demo Rehearsal Checklist

### demo-start
- What is prebuilt: Katalog produk dan form checkout berfungsi; state checkout masih dummy/terkontrol.
- What is shown live: Navigasi katalog, pemilihan produk, pengisian form checkout.
- How success is verified: Form tervalidasi dengan benar dan menampilkan data produk nyata dari backend.
- Fallback action if it fails: Beralih ke screenshot/rekaman katalog dan form dari `demo-backup`.

### demo-payment
- What is prebuilt: Backend dapat membuat request pembayaran nyata ke Mayar sandbox dan mengembalikan payment URL.
- What is shown live: Submit checkout, redirect ke halaman pembayaran Mayar sandbox.
- How success is verified: Payment URL valid terbuka dan menampilkan detail invoice yang sesuai dengan order.
- Fallback action if it fails: Gunakan order/payment URL yang sudah diverifikasi sebelumnya (pre-created) dari sesi rehearsal terakhir.

### demo-final
- What is prebuilt: Webhook handler dan verifikasi server-side berfungsi penuh, transisi status ke paid teruji; halaman status pembayaran dengan polling 3 detik (maksimum 45 detik) dan tombol manual "Cek Status Pembayaran" sudah berfungsi.
- What is shown live: Penyelesaian pembayaran sandbox, lalu tampilkan status order berubah dari pending/payment_created ke paid di status page (via polling atau tombol manual) dan tabel Supabase.
- How success is verified: Status "paid" muncul di halaman status DAN di tabel `orders` Supabase secara bersamaan setelah webhook diproses. Jika webhook belum masuk dalam 45 detik, operator menekan tombol manual "Cek Status Pembayaran" untuk menunjukkan bahwa status tetap dapat diverifikasi ulang.
- Fallback action if it fails: Tampilkan rekaman video `demo-backup` yang menunjukkan transaksi sukses sebelumnya, sambil menjelaskan alur verifikasi secara naratif.

### demo-backup
- What is prebuilt: Screenshot dan rekaman video alur lengkap (checkout hingga paid) dari transaksi sukses sebelumnya.
- What is shown live: Hanya ditampilkan jika demo langsung gagal di salah satu tahap sebelumnya.
- How success is verified: Materi backup dapat diputar dengan lancar tanpa dependency pada koneksi internet live.
- Fallback action if it fails: Jelaskan alur secara verbal menggunakan diagram arsitektur BRD sebagai rujukan visual terakhir.

---

## 15. Live Webinar Run Sheet (60 Menit)

| Waktu | Segmen | Fokus |
|---|---|---|
| Pra-sesi (sebelum mulai) | Pre-session checks | Verifikasi URL publik aktif, tab browser pre-loaded, checklist keamanan Section 11 tercentang, koneksi internet cadangan siap. |
| 0-5 menit | Opening | Perkenalan masalah: website AI yang indah belum tentu aman menerima pembayaran. |
| 5-12 menit | Vibe coding overview | Definisi vibe coding, perbedaan AI assistant vs alur kerja AI-led dengan rules dan skills. |
| 12-20 menit | Architecture explanation | Jelaskan diagram Browser → Cloudflare Pages → Worker API → Supabase → Mayar dan batas kepercayaan. |
| 20-30 menit | Security explanation | Jelaskan non-negotiable rules: harga dari database, status paid hanya dari backend, rahasia hanya di server. |
| 30-45 menit | Product walkthrough & checkout demo | Tunjukkan katalog, pilih produk, isi form checkout, submit ke backend. |
| 45-55 menit | Mayar payment demo + webhook/Supabase proof | Selesaikan pembayaran sandbox, tunjukkan webhook diterima, status berubah ke paid di status page (polling/tombol manual) dan di dashboard Supabase terkontrol — presenter menjelaskan bahwa dashboard ini adalah observabilitas internal, bukan admin page produk WarungKit (keputusan final Q-04, lihat Section 17). |
| 55-60 menit | Closing takeaway & fallback route | Rangkum pesan inti (BRD Appendix C), tutup dengan checklist yang bisa dipakai audiens sendiri. Jika ada kegagalan teknis di segmen manapun, beralih ke materi `demo-backup` tanpa menghentikan alur presentasi. |

---

## 16. Git Checkpoints

- [x] `docs: add BRD PDF` — committed as `8ca8bc6 docs: add BRD and project checklist`
- [x] `chore: scaffold monorepo baseline` — committed as `c11a042`
- [x] `docs: add Claude rules and skills` — committed as `01da9f3 docs: add Claude rules and architecture runbooks`
- [x] `feat: add database schema and seed products` — committed as `fef05ea feat: add WarungKit core database schema and seed data`
- [x] `feat: add API foundation` — committed as `cad77fd feat: add secure API foundation and shared contracts`
- [x] `feat: add storefront and checkout UI` — committed as `bf50268 feat: add WarungKit storefront and safe checkout UI`
- [x] `feat: integrate Mayar invoice flow` — committed as `e2097d9 feat: add secure Mayar checkout and verification flow`
- [x] `feat: add webhook verification flow` — covered within `e2097d9` (webhook + verification flow shipped together)
- [x] `test: add integration and security coverage` — covered within `7d77a54 feat: complete secure Mayar checkout frontend integration` (frontend integration + test suite)
- [ ] `chore: prepare webinar demo release` — pending; blocked on P10 deployment (Cloudflare Pages build config fix in progress) and P9 remaining items (secret scan, dependency audit, manual smoke test)

---

## 17. Open Questions and Assumptions

Item berikut belum terjawab penuh di BRD dan tidak boleh memblokir implementasi — dijawab secara bertahap selama P0-P4:

- **Q-01**: Metode pembayaran sandbox Mayar mana yang akan digunakan live, dan bagaimana perilaku konfirmasinya? *(Perlu dijawab sebelum P8 dimulai.)*
- **Q-03**: Apakah demo menampilkan placeholder unduhan digital setelah status paid, atau berhenti di konfirmasi pembayaran? *(Di luar scope wajib BRD — opsional.)*
- **Q-05**: Nama project publik final untuk frontend dan Worker API — sudah dikunci sebagian di dokumen ini (`warungkit-demo.pages.dev`, `warungkit-api.<cloudflare-subdomain>.workers.dev`), tapi subdomain Cloudflare aktual perlu dikonfirmasi di P4.
- **Q-06**: Tanggal penghapusan data PII pelanggan hasil rehearsal dan event — perlu ditentukan tim sebelum P11 selesai, sesuai asumsi retensi data BRD Section 13.2.

**Keputusan terkonfirmasi (sebelumnya open question):**

- **Q-02 (Resolved)** — Mekanisme halaman status pembayaran: Halaman status pembayaran membaca `orderId` dan receipt token dari alur kembalian pembayaran, memanggil `GET /api/orders/:orderId`, melakukan **polling otomatis setiap 3 detik**, **berhenti otomatis setelah maksimum 45 detik**, lalu menampilkan **tombol manual "Cek Status Pembayaran"** yang selalu tersedia bagi pengguna untuk memeriksa ulang status kapan saja setelahnya. Parameter query dari redirect Mayar tidak pernah dipercaya sebagai bukti pembayaran; status "paid" hanya ditampilkan setelah backend mengonfirmasi dari database hasil verifikasi server-side. Diterapkan di P7, P8, dan checklist terkait (Section 9, 10, 12, 14).
- **Q-04 (Resolved)** — Visibilitas admin: WarungKit **tidak membangun dashboard admin** untuk MVP webinar. Bukti order dan payment event ditunjukkan langsung dari **dashboard Supabase terkontrol**, khusus untuk observabilitas presenter — bukan bagian dari produk publik WarungKit. Tidak ada pelanggan atau pengguna anonim yang dapat mengakses data order Supabase secara langsung. Diterapkan di Section 2, P7, P9, P11, dan Section 15.

**Asumsi yang berlaku** (dari BRD Section 13.2):
- Akun Cloudflare, Supabase, GitHub, dan Mayar sudah tersedia sebelum implementasi dimulai.
- Alur sandbox/test Mayar tersedia untuk rehearsal dan demo live.
- Repository disiapkan di muka; sesi live berfokus pada kode dan arsitektur bermakna, bukan UI dari nol.
- Domain kustom tidak dibutuhkan; URL project publik platform sudah cukup.
- Versi webinar adalah demonstrasi terkontrol, bukan go-live komersial langsung.
- Keputusan retensi data demo akan diterapkan setelah event, termasuk penghapusan/anonimisasi data pelanggan uji.

---

## 18. Immediate Next Actions

1. Konfirmasi kesepakatan tim terhadap seluruh keputusan kunci BRD dan finalisasi 3 produk demo beserta harga (P0).
2. Inisialisasi repository git dan struktur monorepo pnpm sesuai Section 6 dokumen ini (P1).
3. Buat `CLAUDE.md` dan seluruh skill `.claude/skills/*` sesuai Section 5 sebelum implementasi kode dimulai (P2).
4. Siapkan akun Cloudflare, Supabase, dan Mayar sandbox; buat/reservasi project Cloudflare Workers dan konfirmasi ketersediaan nama Cloudflare Pages, lalu kunci penamaan project publik (P4) — pembuatan project Pages sesungguhnya menunggu hingga P10.
5. Mulai implementasi migration database (`products`, `orders`, `payment_events`, `checkout_idempotency`) dengan RLS aktif sejak awal (P5).
