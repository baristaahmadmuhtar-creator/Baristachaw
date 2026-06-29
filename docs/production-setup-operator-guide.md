# Baristachaw Production Setup Operator Guide

Panduan ini untuk setup production end to end: Supabase, auth, RLS, admin allowlist, backup, Vercel env, payment Indonesia, monitoring, dan store readiness. Jangan kirim password, API key, service role key, atau private key ke chat. Masukkan secret langsung ke dashboard provider atau Vercel.

## Mode Bantuan Browser

Saya bisa bantu navigasi browser sampai halaman yang tepat. Bagian yang harus Anda lakukan sendiri adalah login, MFA, copy secret, dan konfirmasi pembayaran akun provider.

Dashboard yang akan sering dibuka:

- Supabase projects: https://supabase.com/dashboard/projects
- Vercel project env: https://vercel.com/dashboard lalu buka project `baristaclaw` > Settings > Environment Variables
- Midtrans dashboard: https://dashboard.midtrans.com/
- Xendit dashboard: https://dashboard.xendit.co/
- Stripe dashboard: https://dashboard.stripe.com/
- Mayar developer docs: https://dev.mayar.id/
- Sentry: https://sentry.io/
- Google Play Console: https://play.google.com/console/
- App Store Connect: https://appstoreconnect.apple.com/

Kalau browser sudah di halaman login, login sendiri lalu beri tahu saya "lanjut". Saya akan arahkan halaman berikutnya.

## Target Arsitektur

- Supabase menyimpan data admin, user, plan, receipt, audit, feature flag, dan katalog.
- Vercel menjalankan API server Baristachaw dengan secret server-only.
- Web/PWA memakai checkout link provider untuk MVP. Lifecycle pembayaran bisa disinkronkan ke `/api/billing/sync` memakai token server-only.
- Android/iOS store subscription memakai Google Play Billing dan App Store IAP, idealnya disatukan entitlement-nya lewat RevenueCat.
- Admin tetap menjadi final reviewer untuk aktivasi subscription/token, walaupun receipt user boleh auto-accept sebagai status awal.

## 1. Setup Supabase Production

1. Buka Supabase dan buat project baru.
2. Pilih region terdekat untuk target Indonesia/Brunei, biasanya Singapore kalau tersedia.
3. Simpan project password di password manager, bukan di repo.
4. Buka SQL Editor.
5. Jalankan file ini berurutan:

```text
supabase/admin_management.sql
supabase/catalog_platform.sql
supabase/production_verification.sql
```

6. File verification hanya untuk cek hasil. Jika query verification menampilkan 16 tabel, RLS aktif, dan policy/grant sesuai, database siap lanjut ke env.
7. Buka Table Editor dan pastikan tabel utama muncul:

```text
app_plans
app_users
app_usage_daily
user_entitlements
payment_receipts
app_feature_flags
admin_audit_events
waters
water_sources
drippers
dripper_sources
grinders
grinder_sources
brand_suggestions
catalog_review_queue
ingest_runs
```

7. Buka Authentication > URL Configuration.
8. Set Site URL:

```text
https://app.baristachaw.com
```

9. Tambahkan Redirect URLs:

```text
https://app.baristachaw.com/**
baristachaw://auth
```

10. Buka Authentication > Providers.
11. Aktifkan Email provider.
12. Aktifkan Google provider setelah OAuth Client Google siap.
13. Aktifkan email confirmation untuk production. Untuk launch besar, gunakan custom SMTP agar email tidak terlihat generik.

## 2. Verifikasi RLS dan Policy

Jalankan query ini di Supabase SQL Editor setelah migration:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'app_plans',
    'app_users',
    'app_usage_daily',
    'user_entitlements',
    'payment_receipts',
    'app_feature_flags',
    'admin_audit_events',
    'waters',
    'water_sources',
    'drippers',
    'dripper_sources',
    'grinders',
    'grinder_sources',
    'brand_suggestions',
    'catalog_review_queue',
    'ingest_runs'
  )
order by tablename;
```

Semua tabel sensitif harus `rowsecurity = true`. Untuk katalog publik, hanya data `published` yang boleh dibaca publik. Untuk admin/user/billing/audit, operasi tulis harus lewat service role API Baristachaw, bukan dari browser.

Verifikasi plan awal:

```sql
select code, name, billing_provider, market, display_price, checkout_mode, payment_methods
from public.app_plans
order by display_order;
```

Verifikasi audit siap:

```sql
select count(*) as audit_events_ready
from public.admin_audit_events;
```

## 3. Admin Allowlist

Admin production dikontrol dari env `ADMIN_EMAILS`.

Format:

```text
ADMIN_EMAILS=owner@domain.com,admin2@domain.com
```

Aturan:

- Pakai email yang sama dengan akun login produksi.
- Jangan pakai wildcard domain.
- Minimal 2 owner untuk backup akses.
- Setelah env diubah, redeploy production.
- Cek `/admin` di mobile dan desktop. Admin nav harus muncul setelah akun owner login.

## 4. Backup dan Hardening Supabase

Checklist wajib:

- Enable MFA untuk akun Supabase dan Google/GitHub login yang dipakai.
- Upgrade Supabase plan sebelum public launch supaya project tidak pause karena inactivity.
- Enable SSL enforcement.
- Review Security Advisor sampai tidak ada issue kritikal.
- Aktifkan backup/PITR sesuai plan Supabase.
- Simpan weekly export manual untuk minggu pertama launch.
- Jangan pernah pakai `SUPABASE_SERVICE_ROLE_KEY` di `VITE_` atau `EXPO_PUBLIC_`.

Query inspeksi cepat:

```sql
select now() as checked_at;
select count(*) from public.app_plans;
select count(*) from public.app_feature_flags;
```

## 5. Vercel Env Production

Masukkan env di Vercel project `baristaclaw`, scope Production. Preview boleh memakai sandbox provider.

Server wajib:

```text
APP_URL=https://app.baristachaw.com
ALLOWED_ORIGINS=https://app.baristachaw.com
JWT_SECRET=<random panjang minimal 32 karakter>
ADMIN_EMAILS=<email admin dipisah koma>
GEMINI_API_KEY=<secret>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable atau anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key server-only>
```

Monitoring:

```text
SENTRY_DSN=<server/web dsn>
HEALTHCHECK_TOKEN=<random secret untuk deep health>
```

Billing MVP:

```text
BILLING_LIVE_MODE=false
PLAN_ENFORCEMENT_ENABLED=false
BILLING_CHECKOUT_URL_STARTER=<provider hosted link>
BILLING_CHECKOUT_URL_PRO=<provider hosted link>
BILLING_CHECKOUT_URL_TEAM=<provider hosted link>
BILLING_PORTAL_URL=<provider customer portal jika ada>
BILLING_SYNC_TOKEN=<random secret untuk provider webhook/lifecycle sync>
```

Nyalakan ini hanya setelah receipt/admin flow dan quota sudah diuji:

```text
BILLING_LIVE_MODE=true
PLAN_ENFORCEMENT_ENABLED=true
```

Local check:

```bash
npm run prod:env:check
npm run mobile:auth:check
```

## 6. Payment Indonesia

Rekomendasi MVP paling realistis:

- Web/PWA Indonesia: Midtrans Payment Link atau Xendit Payment Link/Invoice.
- Web global card: Stripe Checkout.
- Android: Google Play subscriptions.
- iOS: App Store auto-renewable subscriptions.
- Entitlement lintas platform: RevenueCat, jika Anda ingin satu dashboard untuk Apple, Google, Stripe, dan web billing.

### Flow Receipt MVP

1. User pilih plan.
2. App membuka checkout provider dari `BILLING_CHECKOUT_URL_*`.
3. Provider atau operator mengirim event lifecycle ke `/api/billing/sync` dengan header `x-billing-sync-token: BILLING_SYNC_TOKEN`.
4. Event `active`, `trialing`, `past_due`, `cancelled`, `expired`, dan `refunded` akan memperbarui `user_entitlements`, `app_users`, dan audit.
5. Jika user upload receipt atau isi nomor invoice, sistem boleh memberi status receipt `auto_accepted` sebagai tanda receipt diterima.
6. Admin tetap membuka `/admin` > Users/Plans/Receipts untuk review manual.
7. Admin cek bukti di dashboard Midtrans/Xendit/Stripe/RevenueCat.
8. Admin hanya override manual jika sync provider belum cukup atau butuh koreksi support.
9. Semua perubahan wajib punya operator note agar masuk audit trail.

### Midtrans

Gunakan Payment Link untuk MVP tanpa integrasi API berat. Setelah akun live:

```text
MIDTRANS_SERVER_KEY=<secret>
MIDTRANS_CLIENT_KEY=<public client key>
MIDTRANS_WEBHOOK_SECRET=<notification secret jika dipakai>
BILLING_SYNC_TOKEN=<random secret yang juga dipakai adapter webhook>
MIDTRANS_ENV=production
BILLING_CHECKOUT_URL_STARTER=<Midtrans payment link Starter>
BILLING_CHECKOUT_URL_PRO=<Midtrans payment link Pro>
```

### Xendit

Gunakan Payment Link/Invoice untuk QRIS, VA, e-wallet, dan bank transfer. Setelah webhook siap:

```text
XENDIT_SECRET_KEY=<secret>
XENDIT_WEBHOOK_TOKEN=<webhook verification token>
BILLING_SYNC_TOKEN=<random secret yang juga dipakai adapter webhook>
XENDIT_ENV=production
BILLING_CHECKOUT_URL_STARTER=<Xendit payment link Starter>
BILLING_CHECKOUT_URL_PRO=<Xendit payment link Pro>
```

### Stripe

Gunakan Stripe Billing + Checkout Sessions untuk subscription web global. Untuk MVP saat ini, app sudah bisa diarahkan ke hosted checkout URL.

```text
STRIPE_SECRET_KEY=<secret>
STRIPE_WEBHOOK_SECRET=<webhook signing secret>
BILLING_SYNC_TOKEN=<random secret jika memakai adapter sync internal>
STRIPE_CHECKOUT_URL_STARTER=<Stripe hosted checkout link>
STRIPE_CHECKOUT_URL_PRO=<Stripe hosted checkout link>
STRIPE_CUSTOMER_PORTAL_URL=<Stripe customer portal link>
```

### Mayar

Mayar checkout scaffold memakai endpoint invoice resmi. Jangan jadikan Mayar live entitlement provider sebelum Mayar memberi dokumentasi signature webhook resmi dan implementasi verifikasi sudah hijau.

```text
MAYAR_API_KEY=<secret>
MAYAR_WEBHOOK_SECRET=<secret once official signature docs are available>
MAYAR_ENV=sandbox
MAYAR_SUCCESS_URL=https://app.baristachaw.com/billing/success
MAYAR_CANCEL_URL=https://app.baristachaw.com/billing/cancel
MAYAR_WEBHOOK_PATH=/api/billing/mayar-webhook
MAYAR_CHECKOUT_ENABLED=false
```

Current behavior: checkout can be created server-side, webhook endpoint fails closed, and manual payment fallback remains available.

## 7. Monitoring Production

Minimum sebelum launch:

- Sentry web/server aktif dengan release name.
- Endpoint internal `/api/monitoring/error` aktif untuk mencatat crash web/PWA ke log dan `admin_audit_events`.
- Sentry React Native/Expo aktif untuk Android/iOS build.
- Vercel function logs dicek setelah deploy.
- `/api/health` sukses.
- Deep health memakai `HEALTHCHECK_TOKEN`.
- Admin audit log dicek setelah perubahan user/plan.
- Rate limit API tetap aktif untuk route sensitif.
- Backup Supabase dicek setiap hari selama minggu pertama.

Smoke test production:

```bash
npm run smoke:prod
RUN_PROD_SMOKE=1 npm run release:verify
```

## 8. Store Readiness

### Android Play Store

1. Pastikan package name:

```text
com.baristachaw.mobile
```

2. Siapkan app signing.
3. Buat internal testing track.
4. Isi privacy policy URL dan terms URL.
5. Isi Data safety form berdasarkan data yang benar-benar dipakai: akun, email, payment, analytics/crash, AI request, file/gambar jika user upload.
6. Upload screenshot phone dan tablet jika diminta.
7. Buat subscription/base plan di Play Console untuk Starter, Pro, Team.
8. Test Google Play Billing dengan license tester.
9. Jalankan build:

```bash
npm run mobile:eas:build:android-production
```

### iOS App Store

1. Buat bundle ID dan capability Sign in with Apple jika dipakai.
2. Terima Paid Apps Agreement sebelum membuat IAP.
3. Buat auto-renewable subscription di App Store Connect.
4. Masukkan product ID yang konsisten dengan plan catalog.
5. Tambahkan App Store Server Notifications URL saat webhook sudah ada.
6. Isi App Privacy details berdasarkan data web/mobile/provider.
7. Upload screenshot iPhone dan iPad sesuai requirement App Store Connect.
8. Test lewat Sandbox/TestFlight.
9. Jalankan dari Mac:

```bash
npm run mobile:eas:build:ios-production
```

## 9. Jadwal Launch 7 Hari

Hari 1:

- Buat Supabase production.
- Jalankan SQL.
- Isi Vercel env sandbox.
- Jalankan `npm run prod:env:check`.

Hari 2:

- Aktifkan auth Email + Google.
- Test web, PWA, Android parity login, mode tamu, admin nav.
- Cek `/admin` data mode harus Supabase.

Hari 3:

- Buat payment link sandbox/live untuk Starter dan Pro.
- Test receipt auto-accepted lalu manual review admin.
- Pastikan token/quota berubah sesuai plan.

Hari 4:

- Aktifkan Sentry dan deep health.
- Jalankan smoke test production.
- Cek audit log admin.

Hari 5:

- Siapkan Play Console dan App Store Connect metadata.
- Upload icon, splash, privacy policy, terms, dan screenshots.

Hari 6:

- Internal/closed testing Android.
- TestFlight iOS dari Mac.
- Fix crash, UI, dan auth issue yang muncul.

Hari 7:

- Freeze env production.
- Backup manual Supabase.
- Final smoke test.
- Submit store review.

## 10. Data yang Perlu Anda Siapkan

- Email owner/admin yang akan masuk `ADMIN_EMAILS`.
- Nama legal/publisher app.
- Privacy policy URL.
- Terms URL.
- Supabase project URL dan keys.
- Provider payment pilihan: Midtrans, Xendit, Stripe, RevenueCat.
- Harga final Indonesia: Starter, Pro, Team.
- Screenshot store final.
- Akun Play Console dan Apple Developer aktif.

## Referensi Resmi

- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Midtrans Payment Link: https://docs.midtrans.com/docs/payment-link-overview
- Xendit Payment Links API: https://docs.xendit.co/docs/payment-links-api-overview
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Expo Sentry guide: https://docs.expo.dev/guides/using-sentry/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple In-App Purchase setup: https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/
