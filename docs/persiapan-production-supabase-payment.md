# Persiapan Production Baristachaw: Supabase, Payment, Admin, dan Katalog

Panduan step-by-step paling lengkap sekarang ada di `docs/production-setup-operator-guide.md`. Dokumen ini tetap dipertahankan sebagai ringkasan cepat untuk admin/operator.

Dokumen ini dipakai sebelum launch Play Store/App Store. Targetnya: admin bisa mengelola user, plan, billing, audit, feature flag, dan queue katalog grinder/water/dripper dari `/admin`.

## 1. Supabase

1. Buat project Supabase baru.
2. Buka SQL Editor, jalankan berurutan:
   - `supabase/admin_management.sql`
   - `supabase/catalog_platform.sql`
3. Ambil nilai dari Supabase Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Pasang env production di Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `ADMIN_EMAILS=email-owner@domain.com`
   - `PLAN_ENFORCEMENT_ENABLED=true` setelah quota middleware sudah aktif.
5. Buka `/admin`, pastikan badge `dataMode` berubah dari `runtime_fallback` menjadi `supabase`.

## 2. Plan Catalog

Plan sekarang diatur dari `/admin?tab=plans`.

Yang bisa diedit:

- Nama plan, deskripsi, harga tampilan, dan harga USD.
- Limit harian AI, Deep, scanner, storage, seats, dan SLA.
- Provider billing, market, checkout mode, product ID, price ID, RevenueCat entitlement.
- Feature list, payment method list, dan recommended plan.

Setiap perubahan wajib isi `Operator note`. Ini sengaja dibuat wajib agar audit trail jelas ketika quota, harga, atau entitlement berubah.

Rekomendasi ID awal:

- Starter: `baristachaw_starter_monthly`, entitlement `starter`.
- Pro: `baristachaw_pro_monthly`, entitlement `pro`.
- Team: `baristachaw_team_monthly`, entitlement `team`.
- Enterprise: `baristachaw_enterprise`, entitlement `enterprise`.

## 3. Payment Indonesia

Untuk MVP Indonesia, urutan paling aman:

1. Mobile Android/iOS: pakai Google Play Billing dan App Store subscription.
2. Sinkronkan entitlement mobile lewat RevenueCat.
3. Web/PWA: pakai Stripe Checkout atau manual invoice sampai payment lokal final.
4. Receipt yang diterima user boleh masuk sebagai akses provisional, tetapi admin tetap harus verifikasi manual sebelum mengubah billing ke `active`.

Env yang perlu disiapkan sesuai provider:

- RevenueCat: `REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`.
- Google Play: `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- App Store: `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_SHARED_SECRET`, `APPLE_APP_ID`.
- Stripe/Web: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_CHECKOUT_URL`.
- Aktifkan `BILLING_LIVE_MODE=true` hanya setelah webhook dan refund/cancel/past_due sudah diuji.

## 4. Admin User Management

Gunakan tab `Users` untuk:

- Ubah role, status, username, display name.
- Terapkan plan sementara saat receipt diterima.
- Tandai billing `past_due`, `refunded`, atau `paymentActionRequired`.
- Catat recovery dan password reset.

Perubahan kritikal seperti suspend, delete, owner role, paid activation, dan direct plan override wajib punya alasan operator.

## 5. Katalog Grinder, Water, Dripper

Tab `Database` sekarang punya `Catalog operations`.

Gunakan `New catalog request` untuk memasukkan kandidat:

```json
{
  "brand": "Timemore",
  "model": "Chestnut C3S",
  "region": "Indonesia",
  "available_in": ["Indonesia"],
  "notes": "Needs verified source before publish"
}
```

Flow MVP:

1. Admin/support membuat request katalog.
2. Request masuk ke `catalog_review_queue`.
3. Admin memverifikasi sumber.
4. Data final dimasukkan ke tabel `grinders`, `waters`, atau `drippers`.
5. Jalankan build katalog bila memperbarui bundle statis:
   - `npm run catalog:bootstrap`
   - `npm run catalog:build`

Tabel katalog produksi:

- `grinders`
- `drippers`
- `waters`
- `brand_suggestions`
- `catalog_review_queue`
- `ingest_runs`

## 6. Checklist 1 Minggu Launch

- `/admin` mode Supabase sudah `pass`.
- `Plan catalog` sudah sesuai harga Indonesia dan provider live/test.
- Admin owner hanya email yang benar di `ADMIN_EMAILS`.
- Billing webhook bisa mengubah `active`, `trialing`, `past_due`, `cancelled`, `expired`, dan `refunded`.
- Katalog utama minimal punya grinder/water/dripper yang paling sering dipakai user Indonesia.
- Sentry/telemetry aktif untuk web, PWA, dan Android parity.
- Test web/PWA mobile memastikan login, mode tamu, admin nav, AI Chat, AI Brew, scanner, dan checkout tidak crash.
