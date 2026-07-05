# Runbook — Security Preflight WarungKit

Checklist praktis yang harus dijalankan pada titik-titik kunci siklus proyek WarungKit. Setiap item harus dicek ulang pada fase yang relevan — mengecek sekali di awal tidak cukup untuk item yang berkaitan dengan deployment atau live demo.

Referensi: `CLAUDE.md`, `docs/decisions/0001-architecture-baseline.md`, `docs/decisions/0002-threat-model.md`, `docs/PROJECT_CHECKLIST.md` (Section 11).

---

## Before Coding

- [ ] `CLAUDE.md` sudah dibaca dan dipahami oleh siapa pun (manusia atau Claude Code) yang akan menulis kode.
- [ ] `.gitignore` sudah mengecualikan `.env`, `.env.*`, `.dev.vars`, `.wrangler`, `.supabase`, dan file kredensial lain sebelum baris kode pertama ditulis.
- [ ] Tidak ada secret di dalam kode sumber — belum ada API key atau Supabase secret key (`SUPABASE_SECRET_KEY`) yang di-hardcode di mana pun.
- [ ] Skill Claude Code yang relevan (`.claude/skills/*/SKILL.md`) sudah diidentifikasi untuk task yang akan dikerjakan.

## Before Local Testing

- [ ] Variabel lingkungan lokal disimpan hanya di file yang di-ignore Git (`.dev.vars` lokal, bukan `.env.example`).
- [ ] `.env.example` hanya berisi nama variabel, tanpa nilai apa pun.
- [ ] Tidak ada secret di dalam kode sumber — pengecekan ulang setelah menulis logic baru (mis. adapter Mayar, repository Supabase).
- [ ] Log lokal tidak menampilkan payload lengkap yang berisi PII atau kredensial saat debugging.

## Before Public Deployment

- [ ] Tidak ada secret di riwayat Git — secret scanning dijalankan terhadap seluruh riwayat commit, bukan hanya commit terbaru.
- [ ] Worker secrets (`MAYAR_API_KEY`, `SUPABASE_SECRET_KEY`) dikonfigurasi via `wrangler secret put`, bukan file konfigurasi ter-commit.
- [ ] Frontend hanya memiliki `VITE_API_BASE_URL` sebagai environment variable — tidak ada variabel lain yang membocorkan konfigurasi backend/secret.
- [ ] CORS allowlist (`ALLOWED_ORIGINS`) dikunci ke domain demo final — tidak ada wildcard.
- [ ] RLS aktif dan direview di seluruh tabel Supabase (`products`, `orders`, `payment_events`, `checkout_idempotency`); tidak ada policy anonim permisif untuk tabel sensitif.
- [ ] Data PII pelanggan dibatasi seminimal mungkin (nama, email, nomor WhatsApp saja) — tidak ada field tambahan yang tidak perlu.
- [ ] Log memask email dan nomor telepon; tidak ada payload pembayaran mentah lengkap yang dicatat.
- [ ] Status order tidak pernah diset menjadi `paid` dari redirect browser — hanya dari transisi backend setelah verifikasi.
- [ ] Deduplikasi webhook (event hash/id) sudah diverifikasi dengan test — event duplikat menghasilkan no-op.
- [ ] Verifikasi Mayar dilakukan server-side (Worker memanggil balik Mayar API), bukan hanya mempercayai isi payload webhook.

## Before Rehearsal

- [ ] Seluruh item "Before Public Deployment" di atas sudah dikonfirmasi ulang setelah deployment terbaru.
- [ ] Tidak ada secret dashboard (Cloudflare/Supabase/Mayar) yang akan terlihat saat screen-share direncanakan.
- [ ] Materi fallback (screenshot/rekaman video) dari transaksi sukses sebelumnya sudah tersedia dan dapat diakses tanpa koneksi internet live.
- [ ] Checkpoint branch (`demo-start`, `demo-payment`, `demo-final`) sudah dapat di-build dan dijalankan tanpa error.
- [ ] Rencana penghapusan/anonimisasi data uji pelanggan pasca-rehearsal sudah disepakati.

## Before Live Webinar

- [ ] Seluruh item "Before Rehearsal" di atas dikonfirmasi ulang tepat H-0, bukan hanya saat rehearsal terakhir.
- [ ] Tidak ada secret dashboard yang terbuka di tab browser mana pun sebelum sesi dimulai.
- [ ] Profil browser demo khusus digunakan — bebas dari kredensial pribadi, notifikasi, dan bookmark sensitif.
- [ ] URL publik frontend dan backend sudah stabil dan tidak berubah sejak rehearsal terakhir.
- [ ] Materi fallback (screenshot/video) mudah diakses dari folder yang sudah diketahui presenter, tanpa perlu mencari saat live.
- [ ] Tidak ada rencana perubahan kode atau deploy baru selama sesi berlangsung.

## After Webinar

- [ ] Data uji pelanggan (nama, email, nomor WhatsApp) dari rehearsal dan event dihapus atau dianonimkan sesuai keputusan retensi yang sudah disepakati (lihat Open Question Q-06 di `docs/PROJECT_CHECKLIST.md`).
- [ ] Kredensial sandbox yang dipakai untuk demo (Mayar, Supabase) direview — dinonaktifkan atau dirotasi jika proyek tidak dilanjutkan ke tahap produksi.
- [ ] Catatan hasil webinar (apa yang berjalan lancar, apa yang perlu fallback) didokumentasikan untuk referensi proyek berikutnya.
- [ ] Akses dashboard Supabase/Cloudflare yang sempat dibagikan untuk keperluan demo direview dan dicabut bila tidak lagi diperlukan.
