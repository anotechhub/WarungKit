# Runbook — Demo Operator Baseline WarungKit

Baseline operasional untuk fase P11 (Webinar Rehearsal, Fallback, and Live Demo Readiness). Dokumen ini akan diperluas saat P11 benar-benar dikerjakan, tetapi kerangka checkpoint dan aturan presenter dikunci sejak sekarang agar tidak diimprovisasi mendekati hari-H.

Referensi: `docs/decisions/0001-architecture-baseline.md`, `docs/runbooks/security-preflight.md`, `docs/PROJECT_CHECKLIST.md` (Section 14–15), `.claude/skills/demo-runbook/SKILL.md`.

---

## Checkpoint: demo-start

- **Purpose:** Membuktikan katalog dan form checkout berfungsi, tanpa bergantung pada integrasi pembayaran nyata.
- **What must already be prepared:** Katalog 3 produk demo ter-load dari backend; form checkout tervalidasi (client-side dan backend); state checkout boleh masih dummy/terkontrol.
- **What can be shown live:** Navigasi katalog, pemilihan produk, pengisian form checkout, submit form.
- **What must remain hidden:** Detail konfigurasi backend, dashboard secret apa pun, nilai environment variable.
- **Success proof:** Form checkout menampilkan data produk nyata (bukan hardcoded) dan tervalidasi dengan benar untuk input salah/kosong.
- **Fallback action:** Beralih ke screenshot/rekaman katalog dan form dari checkpoint `demo-backup`.

## Checkpoint: demo-payment

- **Purpose:** Membuktikan backend benar-benar membuat permintaan pembayaran nyata ke Mayar sandbox, bukan simulasi di frontend.
- **What must already be prepared:** Endpoint `POST /api/checkout` berfungsi penuh — order `pending` dibuat, invoice Mayar sandbox dibuat, payment URL valid dikembalikan.
- **What can be shown live:** Submit checkout, redirect browser ke halaman pembayaran Mayar sandbox, detail invoice yang sesuai dengan order yang baru dibuat.
- **What must remain hidden:** `MAYAR_API_KEY`, dashboard Mayar yang menampilkan kredensial, response mentah API yang berisi data internal.
- **Success proof:** Payment URL valid terbuka dan menampilkan detail invoice (nominal, deskripsi) yang cocok dengan order yang dibuat.
- **Fallback action:** Gunakan order/payment URL yang sudah diverifikasi sebelumnya (pre-created) dari sesi rehearsal terakhir yang berhasil.

## Checkpoint: demo-final

- **Purpose:** Membuktikan alur keamanan inti — webhook diterima, diverifikasi server-side, dan status order berubah menjadi `paid` tanpa pernah mempercayai redirect browser.
- **What must already be prepared:** Webhook handler dan verifikasi server-side berfungsi penuh; transisi status ke `paid` sudah teruji; halaman status pembayaran dengan polling 3 detik (maksimum 45 detik) dan tombol manual "Cek Status Pembayaran" sudah berfungsi.
- **What can be shown live:** Penyelesaian pembayaran di Mayar sandbox, lalu status order berubah dari `pending`/`payment_created` menjadi `paid` — ditunjukkan di halaman status pembayaran dan di dashboard Supabase terkontrol.
- **What must remain hidden:** `SUPABASE_SECRET_KEY`, tab dashboard Supabase yang menampilkan project settings/API keys, tabel selain yang memang relevan untuk demo (`orders`, `payment_events`).
- **Success proof:** Status "paid" muncul di halaman status DAN di tabel `orders` Supabase secara bersamaan, setelah webhook benar-benar diproses — bukan setelah update manual database. Jika webhook belum masuk dalam 45 detik, operator menekan tombol manual "Cek Status Pembayaran" untuk membuktikan status tetap dapat diverifikasi ulang.
- **Fallback action:** Tampilkan rekaman video `demo-backup` yang menunjukkan transaksi sukses sebelumnya, sambil menjelaskan alur verifikasi secara naratif menggunakan diagram arsitektur (`docs/decisions/0001-architecture-baseline.md`).

## Checkpoint: demo-backup

- **Purpose:** Menjadi jalur cadangan penuh jika koneksi internet, sandbox Mayar, atau bagian lain dari demo live gagal total.
- **What must already be prepared:** Screenshot dan rekaman video alur lengkap (dari katalog hingga status paid) dari transaksi sukses yang benar-benar terjadi di rehearsal — bukan mock-up atau simulasi.
- **What can be shown live:** Materi backup hanya diputar jika demo langsung gagal di salah satu checkpoint sebelumnya.
- **What must remain hidden:** Sama seperti checkpoint lain — tidak ada dashboard secret, kredensial, atau data pelanggan asli di materi backup.
- **Success proof:** Materi backup dapat diputar dengan lancar tanpa bergantung pada koneksi internet live.
- **Fallback action:** Jika materi backup pun gagal diputar (mis. masalah teknis presentasi), jelaskan alur secara verbal menggunakan diagram arsitektur BRD/ADR sebagai rujukan visual terakhir.

---

## Presenter Hygiene

- [ ] Gunakan **profil browser demo khusus**, terpisah dari profil pribadi — tanpa histori, bookmark, atau sesi login pribadi.
- [ ] Nonaktifkan **seluruh notifikasi pribadi** (email, chat, kalender, OS-level notification) sebelum sesi dimulai.
- [ ] Pastikan **tidak ada tab berisi secret** terbuka atau ter-preload — tidak ada dashboard yang menampilkan API key, Supabase secret key, atau connection string.
- [ ] Hanya buka **tab yang sudah di-preload** sesuai kebutuhan demo: frontend, halaman status pembayaran, dashboard Supabase (view tabel non-sensitif saja), halaman test Mayar sandbox.
- [ ] Siapkan **hotspot cadangan** (mobile data) sebagai jalur internet kedua jika koneksi utama bermasalah saat live.
- [ ] Pastikan **rekaman dan screenshot backup** (checkpoint `demo-backup`) sudah disiapkan dan diuji dapat diputar sebelum sesi, bukan disiapkan mendadak saat live.
