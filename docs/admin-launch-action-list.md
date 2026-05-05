# Admin Launch Action List

Gunakan dokumen ini sebagai daftar kerja singkat sebelum membuka Baristachaw ke user produksi. Detail panjang tetap ada di `docs/production-setup-operator-guide.md` dan `docs/admin-production-runbook.md`.

## Status Lokal Saat Ini

- Code gate: `npm run check` pass pada 2026-05-05.
- Env gate: `npm run prod:env:check` masih fail karena secret production belum diisi.
- Mobile auth gate: `npm run mobile:auth:check` masih fail karena Supabase public env belum diisi.

Ulangi semua gate sekaligus:

```bash
npm run launch:doctor
```

## Yang Harus Anda Siapkan

Jangan kirim nilai secret ke chat. Masukkan langsung ke Vercel, Supabase, EAS, atau file env lokal pribadi.

- Email owner dan admin untuk `ADMIN_EMAILS`. Minimal 2 email owner/support.
- Supabase production project URL, publishable key, dan service role key.
- `JWT_SECRET` dan `HEALTHCHECK_TOKEN` random panjang minimal 32 karakter.
- `GEMINI_API_KEY` untuk AI route production.
- Domain final production, saat ini default: `https://baristaclaw.vercel.app`.
- Privacy policy URL dan terms URL.
- Provider pembayaran pilihan untuk MVP: Midtrans/Xendit/Stripe links, atau RevenueCat untuk entitlement mobile.
- Harga final Starter, Pro, Team untuk Indonesia/Brunei/global.
- Sentry DSN web/server dan mobile sebelum store launch.
- Akun Play Console dan Apple Developer aktif jika mobile public launch ikut dibuka.

## Urutan Bereskan Admin

1. Jalankan SQL production di Supabase:

```text
supabase/admin_management.sql
supabase/catalog_platform.sql
supabase/production_verification.sql
```

2. Isi Vercel Production env wajib:

```text
APP_URL
ALLOWED_ORIGINS
JWT_SECRET
ADMIN_EMAILS
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
HEALTHCHECK_TOKEN
```

3. Isi mobile/EAS env wajib:

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_WEB_APP_URL
EXPO_PUBLIC_APP_SCHEME
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

4. Redeploy production, login dengan email admin, lalu buka `/admin`.

5. Di `/admin`, cek tab ini berurutan:

- `Database`: semua table dan Supabase mode harus siap, bukan runtime fallback.
- `Launch`: semua item `now` harus pass atau punya alasan defer yang jelas.
- `Plans`: product id, price id, checkout mode, dan market sudah sesuai provider.
- `Maintenance`: web/PWA/mobile harus `available`, kecuali sedang freeze deploy.
- `Audit`: perubahan admin pertama harus tercatat.

## Paid Launch Rule

Jangan nyalakan paid enforcement sampai kondisi ini pass:

- Checkout URL atau store product sudah valid untuk Starter/Pro/Team.
- Billing sync token atau webhook secret sudah dipasang.
- Receipt atau subscription bisa mengubah `user_entitlements`.
- `supabase/admin_management.sql` sudah deploy versi terbaru dengan RPC `public.consume_app_quota`.
- `app_usage_daily` bertambah saat `/api/ai` atau `/api/chat` dipakai dengan akun paid.
- `/api/account/status` menampilkan plan dan billing status yang benar setelah user login ulang.
- Admin audit mencatat override user, plan, dan billing.

Env yang baru boleh `true` setelah itu:

```text
BILLING_LIVE_MODE=true
PLAN_ENFORCEMENT_ENABLED=true
```

Untuk launch free-only, biarkan keduanya `false` dan tetap siapkan admin/support/monitoring.

## Final Gate Sebelum Submit

```bash
npm run launch:doctor
npm run smoke:prod
RUN_PROD_SMOKE=1 npm run release:verify
```

Jika production smoke butuh akun, isi `PROD_SMOKE_BEARER_TOKEN` secara lokal atau di CI secret, bukan di repo.
