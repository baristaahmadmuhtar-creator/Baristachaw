# Buku Developer dan Operator BaristaChaw

Panduan end-to-end untuk membaca, menjalankan, mengembangkan, mengamankan, menguji, dan meluncurkan BaristaChaw.

Estimasi baca aktif: 60 sampai 90 menit. Baca aktif berarti tidak hanya membaca teks, tetapi juga membuka file yang disebut, menjalankan beberapa command, dan mengecek alur aplikasi di browser. Jika dibaca cepat tanpa praktik, waktunya bisa lebih pendek. Jika dipakai sebagai onboarding developer baru, gunakan sebagai materi 1 sesi penuh.

## Daftar Isi

1. Cara memakai buku ini
2. Ringkasan produk dan target kualitas
3. Peta arsitektur repo
4. Alur runtime web, PWA, dan mobile parity
5. Auth, sesi, browse-only preview, dan keamanan request
6. AI Chat, AI Search, attachment, scanner, dan speech
7. AI Brew dari input sampai panduan seduh
8. Data, Supabase, RLS, dan katalog
9. Admin Management
10. Billing, plan, entitlement, dan lifecycle pembayaran
11. UI system, aksesibilitas, animasi, PWA, dan icon
12. Testing, smoke, release gate, deploy, dan rollback
13. Security, observability, dan operasi launch week
14. Playbook debugging
15. Checklist akhir developer

## 1. Cara Memakai Buku Ini

Buku ini ditulis untuk developer/operator yang akan memegang BaristaChaw sampai production. Fokusnya bukan hanya "file apa ada di mana", tetapi bagaimana semua bagian saling terhubung. BaristaChaw bukan satu halaman web sederhana. Ia adalah workspace AI kopi yang punya web app, PWA, mobile parity, admin console, API server, auth, payment preparation, AI orchestration, katalog alat seduh, dan flow production readiness.

Cara baca yang disarankan:

1. Buka repo di editor.
2. Jalankan `npm run check` sekali untuk memastikan workspace lokal sehat.
3. Baca bab 2 sampai 4 untuk membangun mental model.
4. Baca bab 5 sampai 10 sambil membuka file yang disebut.
5. Baca bab 11 sampai 14 sambil mencatat area yang ingin Anda ubah.
6. Gunakan bab 15 sebagai checklist sebelum deploy.

Aturan penting saat bekerja di repo:

- Jangan commit secret.
- Jangan menaruh `SUPABASE_SERVICE_ROLE_KEY` di variable publik seperti `VITE_*` atau `EXPO_PUBLIC_*`.
- Jangan membuka aksi fitur tanpa auth gate; browse-only preview hanya untuk melihat app.
- Jangan mengubah logic AI Brew hanya berdasarkan tampilan UI; cek planner, validator, test, dan handoff ke tool lain.
- Jangan deploy production tanpa minimal `npm run check` dan smoke yang relevan.
- Untuk perubahan admin/billing/auth, tambahkan atau jalankan test yang menyentuh behavior server.

Latihan 5 menit:

- Buka `README.md`.
- Buka `package.json`.
- Buka `apps/web/src/App.tsx`.
- Buka `server-api/ai.ts`.
- Tulis satu kalimat: "BaristaChaw adalah ..." dari sudut pandang developer. Jika kalimat itu belum menyebut web, mobile, API, AI, dan admin, baca ulang bab berikutnya.

## 2. Ringkasan Produk dan Target Kualitas

BaristaChaw adalah aplikasi AI untuk workflow barista. Produk ini membantu user mencari ide kopi, berdiskusi dengan AI, menganalisis attachment, memakai scanner, membuat recipe seduh, menjalankan timer, menghitung rasio, menyimpan catatan, dan mengelola koleksi. Untuk operator, BaristaChaw menyediakan `/admin` untuk user management, plan catalog, maintenance flags, database/catalog request, audit, dan launch readiness.

Target kualitas produk:

- Bisa dipakai user awam tanpa memahami istilah teknis.
- Bisa dipakai barista serius tanpa merasa recipe terlalu asal.
- Bisa berjalan nyaman di web desktop, mobile web, PWA Android, Safari iOS, dan mobile parity app.
- Browse-only preview tetap tersedia untuk trust, app review, dan first-run experience.
- Paid plan bisa ditampilkan dengan friendly, tidak memaksa, tetapi jelas bahwa API dan operasional butuh dukungan plan berbayar.
- Admin bisa mengontrol user, plan, billing, maintenance, audit, dan katalog dengan minimum mental effort.
- Data dan secret production tidak bocor.
- Flow penting punya test atau minimal smoke yang jelas.

Produk ini punya beberapa persona:

- User umum: ingin bertanya soal kopi, mencari resep, atau menyimpan catatan.
- Barista rumahan: ingin AI Brew, ratio, timer, scanner, dan collection.
- Barista profesional: ingin kontrol grind, water chemistry, dripper, target rasa, dan reproducibility.
- Admin/operator: ingin melihat user, plan, billing, audit, maintenance, dan launch status.
- Developer: ingin tahu alur data, API, test, dan deployment.

Istilah kunci:

- Web app: aplikasi Vite React di `apps/web`.
- PWA: web app yang bisa dipasang ke home screen, memakai manifest/icon/metadata.
- Mobile parity: aplikasi Expo native yang sebagian besar menyamakan pengalaman web dan memakai API yang sama.
- Server API: handler di `server-api` yang dipanggil lewat `api`.
- Admin console: route `/admin` di web.
- AI Brew: fitur recipe seduh berbasis planner deterministik plus narasi AI yang divalidasi.
- Plan/entitlement: status langganan dan kuota fitur.
- Browse-only preview: user tanpa login bisa melihat app, tetapi aksi fitur dan mutasi tetap meminta login.

Target MVP production-ready di BaristaChaw bukan berarti semua mimpi fitur selesai. Artinya jalur utama bekerja, failure state jelas, rahasia aman, admin punya kontrol, dan release bisa dipantau. MVP production-ready harus jujur: jika payment provider belum live, UI boleh menampilkan checkout link atau manual invoice, tetapi admin dan user tidak boleh dibuat bingung.

Latihan 5 menit:

- Buka production app.
- Masuk sebagai browse-only user tanpa login.
- Cari fitur Home, Chat, Tools, Collection, dan Scanner.
- Buka `/admin` setelah login akun admin.
- Catat satu risiko produk dan satu risiko teknis yang Anda lihat.

## 3. Peta Arsitektur Repo

Struktur utama repo:

```text
apps/
  web/                 Vite React web + PWA
  mobile/              Expo mobile parity app
packages/
  shared/              shared helpers dan type linting lintas app
  design-tokens/       token warna, spacing, radius, typography
api/                   wrapper route untuk Vercel
server-api/            implementasi API server
supabase/              SQL schema, RLS, verification
scripts/               smoke, release, env check, catalog build, icon generation
tests/
  unit/                node test untuk logic dan API
  e2e/                 Playwright flow web/PWA/mobile viewport
docs/                  runbook dan buku operasional
```

`apps/web` adalah pusat pengalaman web. Route utama ada di `apps/web/src/App.tsx`. Page utama:

- `Home.tsx`: halaman awal setelah masuk, status workspace, plan growth surface, pencarian AI.
- `Chat.tsx`: obrolan AI, mode fast/normal/deep, attachment, audio, folder/session.
- `Scanner.tsx`: pemindaian visual/OCR/video, prompt scanner, permission handling.
- `BaristaTools.tsx`: AI Brew, Timer, Ratio, Todo.
- `Collection.tsx`: koleksi catatan, folder, item, search/filter.
- `AuthScreen.tsx`: masuk/daftar/browse-only setup flow.
- `AdminManagement.tsx`: admin console.

`apps/mobile` adalah Expo app. Di dalamnya ada native screens seperti `HomeScreen`, `ChatScreen`, `ScannerScreen`, `ToolsScreen`, `CollectionScreen`, dan `WebParityScreen`. Mobile parity tidak boleh dianggap proyek terpisah yang bebas berbeda. Ia harus mempertahankan contract produk: auth, browse-only preview, language, chat, scanner, collection, tools, telemetry, dan fallback.

`server-api` adalah lapisan server. Beberapa endpoint penting:

- `server-api/ai.ts`: AI action seperti search, analyze attachment, image generation, speech, deep, fast.
- `server-api/chat.ts`: chat orchestration.
- `server-api/auth/*`: guest, email, OAuth callback, mobile grants, logout, me.
- `server-api/account/*`: account status, export, delete, AI access gate.
- `server-api/admin/management.ts`: snapshot dan mutation admin.
- `server-api/billing/*`: checkout, portal, sync lifecycle.
- `server-api/monitoring/error.ts`: client error reporting.
- `server-api/health.ts`: health dan deep health.
- `server-api/waters`, `grinders`, `drippers`: katalog search.

`supabase` menyimpan SQL production:

- `admin_management.sql`: user, plans, usage, entitlement, feature flags, audit.
- `catalog_platform.sql`: katalog grinder, water, dripper, review queue, ingest.
- `production_verification.sql`: query inspeksi production.

`scripts` menyimpan command operasional:

- `check-production-env.mjs`: validasi env production.
- `check-mobile-auth-env.mjs`: validasi env mobile auth.
- `check-release.mjs`: release verification.
- `smoke-prod.mjs` dan `smoke-local.mjs`: smoke test.
- `run-local-gate.mjs` dan `run-prod-gate.mjs`: gate gabungan.
- `generate-icons.mjs`: generate icon PWA/native.
- `catalog/*`: bootstrap dan build katalog.

Mental model arsitektur:

1. UI memanggil context untuk auth, language, account status, navbar, theme, network.
2. UI memanggil service browser di `apps/web/src/services`.
3. Service browser memanggil `/api/*`.
4. Vercel API wrapper meneruskan ke `server-api`.
5. Server API memvalidasi auth, origin, rate limit, payload, dan plan.
6. Server API memanggil provider AI, Supabase, billing, atau katalog.
7. Response dikembalikan ke UI dengan error yang aman.
8. UI menampilkan hasil dengan fallback, loading, offline state, atau CTA plan.

Kesalahan umum developer baru:

- Mengedit hanya UI tanpa mengubah service/API/test.
- Mengubah API tanpa memikirkan mobile parity.
- Mengubah copy bahasa Indonesia di satu file, tetapi lupa localization lain.
- Mengubah AI Brew planner tetapi lupa validator atau E2E handoff Timer/Ratio.
- Mengubah admin patch tanpa audit event.
- Mengubah billing state tanpa account status snapshot.

Latihan 10 menit:

- Buka `apps/web/src/services/accountStatus.ts`.
- Buka `server-api/account/status.ts`.
- Ikuti alur dari UI membaca status plan sampai response API dibentuk.
- Catat field yang paling penting untuk gating fitur berbayar.

## 4. Alur Runtime Web, PWA, dan Mobile Parity

Runtime web dimulai dari `apps/web/src/main.tsx`, masuk ke `App.tsx`, lalu membungkus aplikasi dengan provider:

- `GlobalProvider`: language, translation, app-level state.
- `NavbarProvider`: state nav, desktop rail, chat sidebar.
- `AuthModalProvider`: status auth, user, modal masuk.
- `AccountStatusProvider`: plan, entitlement, maintenance, snapshot akun.
- `MotionConfig`: default motion.

`App.tsx` menangani beberapa hal penting:

- Route lazy loading untuk mengurangi bundle awal.
- Auth gate untuk route entry: `/`, `/scanner`, `/tools`, `/coffee`, `/collection`, `/chat`.
- Browse-only preview melalui auth screen/setup surface.
- Desktop sidebar dan bottom nav.
- Maintenance banner.
- Offline banner.
- Swipe navigation mobile.
- Loading fallback "Memuat ruang kerja barista".

PWA memakai web app yang sama, tetapi UX-nya berbeda karena:

- Tidak ada browser chrome saat standalone.
- iOS Safari punya perilaku keyboard dan viewport berbeda.
- Android PWA bisa terasa seperti app native, tetapi tetap web runtime.
- Pinch zoom, safe area, status bar, dan theme color harus dijaga.
- Cache/offline harus tidak membuat user melihat state lama yang berbahaya.

Mobile parity app memakai Expo. Tujuannya bukan menulis ulang semua logic web, tetapi membuat shell native yang konsisten. Beberapa screen native dibuat agar pengalaman mobile lebih rapi. Untuk fitur yang kompleks, parity bisa memakai web route atau API yang sama. `docs/mobile-parity-matrix.md` adalah dokumen yang harus dibaca sebelum mengubah behavior yang terlihat di web dan mobile.

Kontrak parity:

- Login dan browse-only preview harus tersedia.
- Bahasa harus konsisten.
- Chat mode harus normal/fast/deep.
- Scanner harus bisa mengambil kamera/library/file.
- Collection harus punya folder/catatan.
- Tools harus punya timer/ratio/todo dan akses AI Brew sesuai platform.
- Error dan maintenance harus manusiawi.
- Feature flag harus bisa mematikan permukaan bermasalah.

Mobile parity bukan sekadar "membuka web dalam app". Ia tetap punya tanggung jawab native seperti permission, haptic, telemetry, storage, splash, icon, dan fallback jika web parity lambat.

Latihan 5 menit:

- Buka `docs/mobile-parity-matrix.md`.
- Pilih satu fitur yang statusnya DONE.
- Cari file native yang mendukung fitur itu.
- Tulis risiko jika web mengubah contract response API tetapi mobile tidak ikut diuji.

## 5. Auth, Sesi, Browse-only Preview, dan Keamanan Request

BaristaChaw punya beberapa jalur masuk:

- Google OAuth.
- Facebook OAuth jika provider siap.
- Email/password melalui Supabase.
- Browse-only preview.
- Mobile auth grant untuk native shell.

Auth web dikendalikan oleh context dan endpoint:

- `server-api/auth/url.ts`: membuat URL OAuth dengan state aman.
- `server-api/auth/callback.ts`: menerima callback OAuth, menukar session, menyimpan cookie.
- `server-api/auth/email.ts`: email sign-in, signup, reset, recovery.
- `server-api/auth/guest.ts`: membuat guest session signed.
- `server-api/auth/me.ts`: membaca sesi saat ini.
- `server-api/auth/logout.ts`: menghapus cookie.
- `server-api/auth/mobile/*`: grant mobile dan deep link.

Prinsip keamanan auth:

- Cookie/session ditandatangani dengan `JWT_SECRET`.
- Request write harus melewati origin guard.
- CORS tidak boleh reflect origin sembarangan.
- Admin access tidak bergantung pada UI nav; server tetap harus mengecek allowlist.
- Browse-only user harus jelas belum login dan tidak diperlakukan seperti user paid.
- Error login harus generik untuk credential salah, tetapi cukup jelas untuk user.

Browse-only preview penting untuk produk:

- User bisa mencoba tanpa membuat akun.
- App review lebih mudah karena reviewer bisa masuk.
- Trust meningkat karena user tidak dipaksa login.
- Paid gating bisa muncul ketika user mencoba fitur yang butuh biaya.

Namun browse-only preview juga harus dibatasi:

- Tidak boleh mendapat akses API mahal tanpa aturan.
- Tidak boleh membuka admin.
- Tidak boleh menyimpan data server sebagai user tetap kecuali flow upgrade didesain.
- Harus bisa diarahkan ke login saat butuh sinkronisasi, history, atau plan.

Origin dan CORS:

Server API memakai helper di `server-api/_shared.ts`. Fungsi seperti `enforceTrustedRequestOrigin`, `getAllowedOrigin`, dan `applyCors` menjaga agar browser write tidak bisa dipanggil dari domain sembarang. `ALLOWED_ORIGINS` production harus berisi `https://baristaclaw.vercel.app`.

Session expiration:

Untuk user, sesi harus bisa dicek ulang via `/api/auth/me` dan `/api/account/status`. Jika token expired, UI harus meminta login ulang tanpa crash. Untuk mobile, auth grant harus sekali pakai dan punya TTL.

Latihan 10 menit:

- Buka `tests/unit/authGuestHandler.test.ts`.
- Buka `tests/unit/authEmailHandler.test.ts`.
- Buka `tests/unit/webAuthHandlers.test.ts`.
- Perhatikan pola test: preflight CORS, session cookie, error mapping, callback.

## 6. AI Chat, AI Search, Attachment, Scanner, dan Speech

AI BaristaChaw bukan satu endpoint prompt biasa. Ia punya orchestration, mode, language alignment, expectation profile, attachment handling, search grounding, dan paid access gate.

Endpoint utama:

- `/api/chat`: percakapan multi-turn.
- `/api/ai`: action terstruktur seperti fast, deep, search, analyze attachment, image generation, speech.

`server-api/ai.ts` memuat banyak guard:

- Batas ukuran body JSON.
- Batas inline attachment.
- MIME image yang didukung.
- Rate limit.
- Provider timeout.
- Search source quality gate.
- Deep response quality gate.
- E2E mock untuk test non-production.
- Paid access check untuk fitur tertentu.

Mode AI:

- Fast: jawaban cepat, ringkas, cocok untuk pertanyaan langsung.
- Normal: jawaban seimbang.
- Deep: lebih mendalam, punya struktur dan quality gate.
- Search: perlu sumber live dan grounding yang cukup.

Orchestration ada di `server-api/_orchestration.ts`. Tujuannya agar AI tidak melenceng dari maksud user. Contoh: jika user bertanya recipe beverage, jangan tiba-tiba jawab teknik manual brew. Jika user ingin jawaban singkat, jangan memberi esai. Jika bahasa user Indonesia, jawaban harus Indonesia.

Attachment:

- Inline attachment dibatasi agar aman untuk Vercel.
- Data URL disanitasi.
- Image/video/file/audio diarahkan ke action yang sesuai.
- Scanner memakai prompt khusus di `apps/web/src/features/scanner/buildScannerPrompt.ts`.

Search:

Search harus lebih ketat karena informasi terbaru bisa salah. Gate memeriksa jumlah sumber, domain unik, authority score, dan intent freshness. Untuk pertanyaan biasa, cache bisa dipakai. Untuk pertanyaan sensitif waktu, cache harus pendek atau dilewati.

Speech:

Speech generation dan audio playback harus tidak membuat UI stuck. Di web ada helper `chatAudio`. Di mobile ada service playback native. Jika provider gagal, UI harus menampilkan error yang bisa dipahami.

Paid gating:

`server-api/account/aiAccess.ts` menentukan apakah user boleh memakai fitur AI tertentu. Browse-only user diarahkan login, sementara free user bisa diarahkan ke plan minimal ketika mencoba fitur mahal. Ini bukan hanya UX; ini biaya operasional.

Latihan 10 menit:

- Buka `server-api/account/aiAccess.ts`.
- Buka `tests/unit/aiAccessGate.test.ts`.
- Identifikasi fitur mana yang butuh plan minimal.
- Pastikan pesan UI tidak terdengar menghukum user, tetapi menjelaskan manfaat upgrade.

## 7. AI Brew dari Input Sampai Panduan Seduh

AI Brew adalah salah satu fitur paling sensitif karena berhubungan dengan workflow barista nyata. Jika angka aneh, user langsung merasa app tidak profesional. Fitur ini harus masuk akal dari sisi data, rasa, UI, dan operational flow.

File utama:

- `apps/web/src/features/ai-brew/AiBrewPanel.tsx`
- `apps/web/src/features/ai-brew/planner.ts`
- `apps/web/src/features/ai-brew/aiComposer.ts`
- `apps/web/src/features/ai-brew/prompts.ts`
- `apps/web/src/features/ai-brew/extractionFinisher.ts`
- `apps/web/src/features/ai-brew/catalog.ts`
- `apps/web/src/features/ai-brew/storage.ts`
- `apps/web/src/features/ai-brew/types.ts`

AI Brew punya dua lapisan:

1. Planner deterministik.
2. Narasi AI yang harus tunduk pada planner.

Planner menerima input seperti:

- Nama kopi.
- Dose.
- Mode hot/iced.
- Quick atau Pro.
- Dripper/brewer.
- Grinder.
- Water brand atau mineral manual.
- Roast level.
- Process.
- Variety.
- Target profile: balance, sweetness, acidity, body.
- Bean profile tambahan.

Planner menghasilkan:

- Total water.
- Hot water.
- Ice.
- Temperature.
- Total time.
- Recommended ratio.
- Final beverage ratio.
- Hot extraction ratio untuk iced.
- Grind recommendation.
- Steps: label, start seconds, pour volume, target volume, note, kind.
- Summary.
- Confidence notes.
- Guardrails.
- Conformance.
- Fingerprint.

Perubahan penting terakhir: angka yang dilihat user sekarang dibulatkan agar barista mudah memakai recipe.

- Manual/filter: 5 ml dan 5 detik.
- Espresso: 1 ml dan 1 detik.
- Cold brew dan batch: increment lebih besar.
- Rasio tampil 1 desimal.
- Suhu tampil bulat.
- Presisi internal tetap dipertahankan untuk validasi rasa dan logic.

Kenapa pembulatan perlu:

Barista di service tidak ingin membaca "tuang 43 ml pada 00:37 dan target 128 ml". Angka seperti itu terlihat akurat, tetapi sulit dieksekusi. Pembulatan membuat instruksi lebih manusiawi: "tuang 45 ml pada 0:35, target 130 ml". Perubahan ini tidak boleh asal, karena total hot water tetap harus sama dengan total step pour, target final harus sama dengan hot water, dan iced split harus tetap logis.

Iced brew:

Seduh es punya risiko UI dan logic lebih tinggi. Jika recipe hanya punya bloom, middle pour, lalu serve, user akan merasa aneh. Untuk V60 iced, plan harus punya beberapa checkpoint operasional sebelum service. `serve` tidak boleh terlihat seperti step seduh utama jika membingungkan. Service note boleh menjelaskan stir/chill/server, tetapi sequence seduh harus fokus pada hot extraction.

AI narrative:

`aiComposer.ts` menulis sequence dan SOP, tetapi validator mencegah AI mengubah envelope. AI tidak boleh menambah step, mengubah timestamp, mengubah volume, menambah top-up dilution, memakai alat tidak didukung, atau memberi instruksi terlalu generic.

Handoff:

AI Brew bisa mengirim durasi ke Timer dan ratio/water ke Ratio tool. Karena user melihat angka bulat, handoff juga harus bulat. Jika result card menampilkan `1:14.1`, Ratio tool tidak boleh tiba-tiba berisi `14.05`.

Test penting:

- `tests/unit/aiBrewPlanner.test.ts`
- `tests/unit/aiBrewComposer.test.ts`
- `tests/unit/aiBrewHybrid.integration.test.ts`
- `tests/e2e/tools.spec.ts`
- `tests/e2e/aiBrewHybrid.spec.ts`

Checklist saat mengubah AI Brew:

- Apakah semua angka finite?
- Apakah hot dan iced sama-sama diuji?
- Apakah method family selain V60 tetap aman?
- Apakah step total pour sama dengan hot water?
- Apakah final target step sama dengan hot water?
- Apakah rasio dan suhu yang ditampilkan user sudah barista-friendly?
- Apakah prompt AI dan validator masih selaras?
- Apakah Timer/Ratio handoff masih benar?
- Apakah Mobile Safari dan Mobile Chrome E2E tidak pecah?

Latihan 15 menit:

- Jalankan `npm run test:unit -- tests/unit/aiBrewPlanner.test.ts`.
- Jalankan `npx playwright test tests/e2e/tools.spec.ts --grep "ai brew quick and pro iced modes"`.
- Buka hasil UI dan cari apakah ada angka terlalu detail.
- Jika ada angka seperti `14.05`, cari sumbernya dan pastikan apakah itu internal atau user-facing.

## 8. Data, Supabase, RLS, dan Katalog

Supabase production menyimpan:

- `app_users`: status user, role, plan, billing, recovery.
- `app_plans`: katalog plan dan kuota.
- `app_usage_daily`: pemakaian harian.
- `user_entitlements`: entitlement provider.
- `payment_receipts`: receipt user.
- `app_feature_flags`: maintenance/disabled/available.
- `admin_audit_events`: audit mutation.
- `waters`, `water_sources`: katalog air.
- `drippers`, `dripper_sources`: katalog brewer/dripper.
- `grinders`, `grinder_sources`: katalog grinder.
- `brand_suggestions`: usulan brand.
- `catalog_review_queue`: antrean review.
- `ingest_runs`: catatan ingest.

SQL ada di:

- `supabase/admin_management.sql`
- `supabase/catalog_platform.sql`
- `supabase/production_verification.sql`

RLS:

Semua tabel sensitif harus `rowsecurity = true`. Browser tidak boleh punya kemampuan menulis tabel admin/billing/audit langsung. Mutasi harus lewat server role API. Katalog publik boleh dibaca jika data published, tetapi review queue dan ingest harus dikontrol.

Service role:

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai server. Jangan pernah:

- Menaruh di `VITE_`.
- Menaruh di `EXPO_PUBLIC_`.
- Mengirim ke client.
- Menulis di screenshot/chat.
- Menaruh di docs real.

Katalog:

AI Brew dan scanner sangat bergantung pada katalog. Katalog yang buruk membuat hasil terasa asal. Flow katalog:

1. User/admin menemukan brand/model baru.
2. Admin membuat catalog request.
3. Request masuk `catalog_review_queue`.
4. Admin verifikasi sumber.
5. Data final masuk `waters`, `drippers`, atau `grinders`.
6. Jika perlu build bundle statis, jalankan script catalog.

Command:

```bash
npm run catalog:bootstrap
npm run catalog:build
npm run catalog:import:id-water
npm run catalog:import:global-water
```

Latihan 10 menit:

- Buka `supabase/production_verification.sql`.
- Buka `server-api/_supabaseAdmin.ts`.
- Cari bagaimana server membedakan fallback runtime dan Supabase mode.
- Pastikan Anda bisa menjelaskan mengapa RLS tetap dibutuhkan walaupun server memakai service role.

## 9. Admin Management

Admin ada di route `/admin`. File utama:

- `apps/web/src/pages/AdminManagement.tsx`
- `apps/web/src/pages/adminLocalization.ts`
- `apps/web/src/services/adminApi.ts`
- `server-api/admin/management.ts`
- `server-api/admin/_access.ts`
- `server-api/admin/_featureFlags.ts`

Tab admin:

- Command/Overview: ringkasan operasional, queue risiko, production checks, rekomendasi.
- Users: user management, role, username, status, plan, billing, recovery.
- Plans: edit plan catalog, harga, kuota, provider, product id, entitlement id, checkout mode.
- Maintenance: feature flags untuk web, PWA, mobile, admin, global.
- Database: status Supabase dan catalog operations.
- Audit: jejak mutasi admin.
- Launch: checklist launch readiness.

Prinsip admin:

- Admin UI friendly, tetapi server tetap sumber keamanan.
- Owner/admin/support/analyst/user punya bobot berbeda.
- Critical mutation harus punya operator reason.
- Plan update wajib operator note.
- Self lockout harus dicegah.
- Audit event harus ditulis untuk mutasi penting.
- Admin tidak boleh menulis langsung ke auth identity tanpa flow benar.

User management:

Admin bisa mengubah status akun, plan, billing, role, username, display name, support note, recovery status, dan flag risiko. Untuk aksi seperti suspend, delete, owner role, direct paid override, atau billing active, UI harus meminta reason.

Plans:

Plan bukan hard-coded copy biasa. Plan punya:

- `code`
- `name`
- `description`
- `priceMonthlyUsd`
- `displayPrice`
- `aiDailyLimit`
- `deepDailyLimit`
- `scannerDailyLimit`
- `storageMb`
- `seats`
- `supportSlaHours`
- `features`
- `billingProvider`
- `billingProductId`
- `billingPriceId`
- `revenuecatEntitlementId`
- `market`
- `checkoutMode`
- `paymentMethods`
- `recommended`

Maintenance:

Feature flag memungkinkan operator menurunkan risiko. Jika scanner provider error, admin bisa set scanner mobile ke maintenance. Jika billing provider bermasalah, checkout bisa ditahan. UI user harus menampilkan state yang jelas.

Audit:

Audit bukan pajangan. Audit dipakai saat:

- Ada komplain user.
- Ada perubahan plan tidak sengaja.
- Ada billing override.
- Ada support recovery.
- Ada investigasi keamanan.

Latihan 10 menit:

- Buka `tests/unit/adminManagementHandler.test.ts`.
- Cari test yang mencegah self lockout.
- Cari test yang mewajibkan support note.
- Tambahkan satu skenario mental: "admin support mencoba mengaktifkan plan pro tanpa alasan". Apa yang harus terjadi?

## 10. Billing, Plan, Entitlement, dan Lifecycle Pembayaran

Billing MVP BaristaChaw mendukung beberapa jalur:

- Web/PWA: hosted checkout link, Stripe Checkout, Midtrans, Xendit, manual invoice.
- Android/iOS: Google Play Billing dan App Store IAP, idealnya lewat RevenueCat.
- Admin: manual review receipt dan override plan.

Endpoint utama:

- `server-api/billing/checkout.ts`
- `server-api/billing/portal.ts`
- `server-api/billing/sync.ts`
- `apps/web/src/services/billing.ts`
- `apps/web/src/components/billing/PlanGrowthSurface.tsx`
- `apps/web/src/components/billing/AiAccessGate.tsx`

Plan growth surface harus:

- Menjelaskan manfaat plan dengan sederhana.
- Menampilkan current plan.
- Menampilkan recommended plan.
- Tidak memaksa user.
- Memberi CTA yang jelas.
- Menangani provider belum siap.
- Menjelaskan batas browse-only/free saat user mencoba fitur mahal.

Lifecycle billing:

- `none`: belum ada pembayaran.
- `active`: akses aktif.
- `trialing`: trial.
- `past_due`: pembayaran bermasalah.
- `cancelled`: dibatalkan.
- `expired`: entitlement habis.
- `refunded`: refund.

MVP yang aman:

1. Receipt user boleh dibuat provisional.
2. Admin tetap review manual untuk aktivasi penuh.
3. Billing provider sync harus punya secret token.
4. Account status harus membaca entitlement terbaru.
5. UI harus bisa memberi tahu user jika payment action diperlukan.

Payment Indonesia:

Untuk Indonesia, jalur paling praktis:

- Mobile: Google Play Billing dan App Store IAP.
- Aggregator: RevenueCat untuk entitlement mobile.
- Web/PWA: Midtrans/Xendit payment link atau Stripe jika market global.
- Admin: review receipt, plan override, audit.

Env billing jangan diaktifkan live sebelum diuji:

```text
BILLING_LIVE_MODE=false
PLAN_ENFORCEMENT_ENABLED=false
```

Setelah checkout, receipt, sync, refund, cancel, dan past_due diuji:

```text
BILLING_LIVE_MODE=true
PLAN_ENFORCEMENT_ENABLED=true
```

Latihan 10 menit:

- Buka `tests/unit/billingSyncHandler.test.ts`.
- Buka `server-api/billing/sync.ts`.
- Jelaskan bagaimana subscription active dicerminkan ke user entitlement.
- Jelaskan apa risiko jika webhook provider tidak punya token.

## 11. UI System, Aksesibilitas, Animasi, PWA, dan Icon

UI BaristaChaw harus terasa konsisten di desktop, mobile web, PWA, iOS Safari, Android PWA, dan mobile parity.

Komponen penting:

- `BottomNav.tsx`
- `DesktopSidebar.tsx`
- `AuthEntryModal.tsx`
- `EmailPasswordAuthForm.tsx`
- `AccountPrivacyPanel.tsx`
- `PlanGrowthSurface.tsx`
- `MaintenanceBanner.tsx`
- `OfflineBanner.tsx`
- `ConfirmActionDialog.tsx`
- icon registry di `apps/web/src/components/icons`

Design priorities:

- Minimum mental effort.
- Bahasa Indonesia yang natural.
- Dark/light mode konsisten.
- No zoom bug di mobile auth.
- Keyboard iOS aman.
- Modal searchable tidak menutup konten penting.
- Button punya label aksesibel.
- Loading state tidak membuat user panik.
- Text tidak overflow.
- Admin mobile tetap usable.

Animasi:

Animasi harus membantu orientasi, bukan memperlambat. Gunakan motion preset di `apps/web/src/utils/motionPresets.ts`. Untuk loading AI Brew, progress harus memberi konteks: validasi input, kalibrasi ratio/water/temp, sequence, finalisasi. Jangan membuat semua elemen berputar tanpa arti.

PWA:

PWA butuh:

- Manifest.
- Apple touch icon.
- Maskable icon.
- Theme color light/dark.
- Apple mobile web app capable.
- Status bar style.
- Viewport yang tidak membuat login bisa di-zoom kacau.

Icon:

Icon harus konsisten untuk favicon, PWA, Android, iOS PWA, dan native asset. Generate lewat:

```bash
npm run generate:icons
```

Accessibility:

E2E dan a11y harus mengecek:

- Tab semantics.
- Keyboard navigation.
- Dialog role.
- Focus management.
- Button aria-label.
- Reduced motion.
- Color contrast.
- Screen reader text yang tidak mengandung angka mentah yang berbeda dari UI.

Latihan 10 menit:

- Jalankan `npm run test:a11y`.
- Buka AI Brew modal di mobile viewport.
- Pakai keyboard Tab di desktop.
- Pastikan focus tidak hilang di picker/search/modal.

## 12. Testing, Smoke, Release Gate, Deploy, dan Rollback

Command utama:

```bash
npm run lint
npm run build
npm run check
npm run test:unit
npm run test:e2e
npm run test:e2e:mobile
npm run test:a11y
npm run smoke:local
npm run smoke:prod
npm run release:verify
```

Tidak semua perubahan butuh semua test. Pilih berdasarkan risiko:

- Copy kecil: `npm run check` dan test relevan.
- UI route penting: E2E route terkait.
- Auth: unit auth, E2E auth, smoke.
- Billing: unit billing, account status, admin.
- Admin: unit admin, E2E admin navigation.
- AI Brew: unit planner/composer, E2E tools.
- Mobile parity: mobile lint/test dan mobile E2E jika ada.

Deploy:

Production deploy:

```bash
vercel deploy --prod --yes
```

Setelah deploy:

```bash
npm run smoke:prod
```

Jika production smoke butuh token:

```bash
PROD_SMOKE_BEARER_TOKEN=<jwt> npm run smoke:prod
```

Rollback:

Rollback Vercel bisa dilakukan dari dashboard deployment. Namun rollback code juga harus dipahami:

1. Identifikasi commit buruk.
2. Cek deployment URL yang masih baik.
3. Promote deployment baik atau deploy revert commit.
4. Catat audit internal.
5. Jika masalah data, jangan asal revert schema tanpa migration plan.

Git hygiene:

- Commit kecil dengan pesan jelas.
- Jangan commit build artifact kecuali memang tracked.
- Jangan commit `.env.local`.
- Jangan stage file user yang tidak terkait.
- Setelah push, pastikan remote branch sesuai.

Latihan 10 menit:

- Jalankan `git status --short`.
- Jalankan `npm run check`.
- Buka latest Vercel deploy.
- Jalankan smoke production jika env siap.

## 13. Security, Observability, dan Operasi Launch Week

Security baseline:

- MFA untuk Supabase, Vercel, GitHub, Google Cloud, payment provider.
- Secret di dashboard provider/Vercel, bukan repo.
- Service role server-only.
- CORS allowlist.
- Origin guard untuk browser write.
- Rate limit untuk auth dan AI.
- File upload/attachment size limit.
- Error response disanitasi.
- Admin allowlist.
- RLS aktif.
- Audit trail.
- Backup/PITR.

Observability:

- Sentry atau monitoring error.
- `/api/monitoring/error` untuk client errors.
- `/api/health` untuk health.
- Deep health memakai `HEALTHCHECK_TOKEN`.
- Admin audit untuk mutation.
- Smoke prod untuk API dan UI.

Launch week routine:

Setiap hari:

- Cek `/admin` overview.
- Cek user risk queue.
- Cek billing past_due/refund/receipt.
- Cek audit event.
- Cek error monitoring.
- Cek Vercel logs.
- Cek Supabase Security Advisor.
- Cek quota AI provider.
- Cek user feedback.

Setiap deploy:

- Pastikan `npm run check`.
- Smoke local jika ada perubahan server.
- Deploy production.
- Smoke production.
- Buka web mobile dan desktop.
- Cek login, browse-only preview, admin nav, AI Chat, AI Brew, scanner, plan CTA.

Incident categories:

- P0: auth down, data leak, payment double charge, admin inaccessible, API total down.
- P1: AI down, scanner down, checkout broken, mobile parity login broken.
- P2: UI broken di satu route, copy salah, plan CTA kurang jelas.
- P3: polish, small visual issue, non-blocking wording.

Latihan 5 menit:

- Buat template catatan incident dengan kolom: waktu, impact, affected users, suspected cause, rollback decision, fix, verification, follow-up.

## 14. Playbook Debugging

Jika login tidak muncul:

1. Cek `App.tsx` auth gate.
2. Cek `AuthScreen.tsx`.
3. Cek `/api/auth/me`.
4. Cek cookie.
5. Cek `JWT_SECRET`.
6. Cek console browser.
7. Cek mobile standalone/PWA viewport.

Jika Google login gagal:

1. Cek Supabase provider Google enabled.
2. Cek OAuth client id/secret di Supabase.
3. Cek redirect URL Supabase callback.
4. Cek Site URL dan Redirect URLs.
5. Cek browser popup/callback.
6. Jangan menaruh Google client secret di Vercel jika Supabase yang mengelola provider.

Jika admin nav tidak muncul:

1. Cek user sudah login.
2. Cek email sama dengan `ADMIN_EMAILS`.
3. Cek env production sudah redeploy.
4. Cek `/api/admin/management` response.
5. Cek role dan allowlist server.
6. Jangan hanya mengandalkan UI nav sebagai bukti admin aman.

Jika AI Brew angka aneh:

1. Reproduksi input.
2. Baca stored plan localStorage.
3. Cek `planner.ts`.
4. Cek rounding helper.
5. Cek step total pour.
6. Cek UI formatter.
7. Cek prompts dan aiComposer.
8. Jalankan unit dan E2E tools.

Jika scanner error:

1. Cek permission camera.
2. Cek attachment size.
3. Cek MIME type.
4. Cek provider AI.
5. Cek network.
6. Cek mobile native permission.

Jika billing tidak aktif:

1. Cek plan catalog.
2. Cek checkout URL.
3. Cek provider env.
4. Cek `/api/billing/sync`.
5. Cek `BILLING_SYNC_TOKEN`.
6. Cek `user_entitlements`.
7. Cek `/api/account/status`.
8. Cek audit event.

Jika PWA icon/cache tidak update:

1. Cek manifest.
2. Cek generated icons.
3. Clear site data.
4. Remove dan Add to Home Screen ulang.
5. Cek service worker/cache behavior jika ada.

## 15. Checklist Akhir Developer

Sebelum menganggap perubahan production-ready:

- Scope perubahan jelas.
- Tidak ada secret di diff.
- UI dan API sama-sama dipikirkan.
- Mobile parity impact dicek.
- Bahasa Indonesia dicek.
- Dark/light mode tidak rusak.
- Browse-only preview tidak hilang.
- Admin impact dicek.
- Billing/plan impact dicek.
- Error state manusiawi.
- Test relevan pass.
- `npm run check` pass.
- Deploy production sukses jika diminta.
- Smoke production dijalankan jika memungkinkan.
- Git clean setelah commit/push.

Checklist command minimal:

```bash
git status --short
npm run check
npm run test:unit
npm run smoke:prod
```

Untuk AI Brew:

```bash
npm run test:unit -- tests/unit/aiBrewPlanner.test.ts tests/unit/aiBrewComposer.test.ts
npx playwright test tests/e2e/tools.spec.ts --grep "ai brew"
```

Untuk admin:

```bash
npm run test:unit -- tests/unit/adminManagementHandler.test.ts tests/unit/adminManagementSchema.test.ts
npx playwright test tests/e2e/admin-navigation.spec.ts
```

Untuk auth:

```bash
npm run test:unit -- tests/unit/authGuestHandler.test.ts tests/unit/authEmailHandler.test.ts tests/unit/webAuthHandlers.test.ts
npx playwright test tests/e2e/auth-onboarding.spec.ts
```

Penutup:

BaristaChaw siap berkembang jika setiap perubahan diperlakukan sebagai bagian dari sistem utuh. Developer tidak cukup hanya membuat tombol terlihat bagus. Operator tidak cukup hanya punya dashboard. AI tidak cukup hanya menjawab panjang. Semua harus menyatu: user mudah masuk, browse-only preview tetap nyaman, AI membantu dengan aman, barista mendapat angka yang masuk akal, admin punya kontrol, billing punya lifecycle, data terlindungi, dan release bisa diverifikasi.

## Lampiran A: Feature Ownership Map

Gunakan bagian ini saat menerima task baru. Sebelum mengedit file, tentukan area kepemilikan agar perubahan tidak menyebar tanpa kontrol.

Auth dan sesi:

- Owner UI: `apps/web/src/pages/AuthScreen.tsx`, `apps/web/src/components/auth/*`, `apps/web/src/context/AuthModalContext.tsx`.
- Owner API: `server-api/auth/*`.
- Owner mobile: `apps/mobile/src/screens/MobileAuthGate.tsx`, `apps/mobile/src/services/authFlow.ts`, `apps/mobile/src/services/authStore.ts`.
- Test utama: `tests/unit/auth*`, `tests/e2e/auth-*`, `tests/unit/mobileAuth*`.
- Risiko utama: user terkunci, callback salah, cookie tidak aman, browse-only preview hilang, mobile deep link rusak.

AI Chat dan AI API:

- Owner UI: `apps/web/src/pages/Chat.tsx`, `apps/web/src/components/chat/*`.
- Owner API: `server-api/chat.ts`, `server-api/ai.ts`, `server-api/_orchestration.ts`.
- Owner mobile: `apps/mobile/src/screens/ChatScreen.tsx`, `apps/mobile/src/services/apiClient.ts`.
- Test utama: `tests/unit/aiOrchestration.test.ts`, `tests/e2e/chat.spec.ts`, `tests/e2e/chat-language.spec.ts`.
- Risiko utama: jawaban salah bahasa, mode deep tidak memenuhi struktur, attachment terlalu besar, provider timeout, biaya API meledak.

AI Brew:

- Owner UI: `apps/web/src/features/ai-brew/AiBrewPanel.tsx`.
- Owner logic: `planner.ts`, `aiComposer.ts`, `prompts.ts`, `extractionFinisher.ts`.
- Owner persistence: `storage.ts`.
- Owner katalog: `catalog.ts` dan data katalog.
- Test utama: `aiBrewPlanner`, `aiBrewComposer`, `aiBrewHybrid`, `tools.spec.ts`.
- Risiko utama: angka tidak executable, iced flow janggal, AI mengubah envelope, handoff Timer/Ratio tidak konsisten.

Scanner:

- Owner UI: `apps/web/src/pages/Scanner.tsx`.
- Owner prompt: `apps/web/src/features/scanner/buildScannerPrompt.ts`.
- Owner API: `server-api/ai.ts`.
- Owner mobile: `apps/mobile/src/screens/ScannerScreen.tsx`, permission service.
- Test utama: `tests/e2e/scanner.spec.ts`, mobile scanner localization.
- Risiko utama: kamera permission gagal, upload terlalu besar, OCR salah konteks, error provider tidak jelas.

Collection:

- Owner UI: `apps/web/src/pages/Collection.tsx`.
- Owner local state: `features/collection/noteDraftState.ts`, storage service.
- Owner mobile: `CollectionScreen.tsx`, `collectionStore.ts`.
- Test utama: `collection.spec.ts`, `noteDraftState.test.ts`.
- Risiko utama: catatan hilang, folder move salah, filter/search tidak konsisten.

Admin:

- Owner UI: `AdminManagement.tsx`, `adminLocalization.ts`.
- Owner service: `apps/web/src/services/adminApi.ts`.
- Owner API: `server-api/admin/management.ts`, `_access.ts`, `_featureFlags.ts`.
- Owner DB: `supabase/admin_management.sql`, `catalog_platform.sql`.
- Test utama: `adminManagementHandler`, `adminManagementSchema`, `admin-navigation`.
- Risiko utama: non-admin bisa mutate, audit hilang, admin self lockout, plan berubah tanpa note, RLS salah.

Billing:

- Owner UI: `PlanGrowthSurface.tsx`, `AiAccessGate.tsx`.
- Owner service: `apps/web/src/services/billing.ts`, `accountStatus.ts`.
- Owner API: `server-api/billing/*`, `server-api/account/status.ts`, `server-api/account/aiAccess.ts`.
- Test utama: `billingSyncHandler`, `accountStatusHandler`, `aiAccessGate`.
- Risiko utama: paid user tidak aktif, free user mendapat akses mahal, refund tidak tercermin, checkout dead end.

Mobile parity:

- Owner native screens: `apps/mobile/src/screens/*`.
- Owner API client: `apps/mobile/src/services/apiClient.ts`.
- Owner shared copy: `apps/mobile/src/web-shared/*`, localization utils.
- Test utama: mobile unit, mobile parity localization, mobile auth handler.
- Risiko utama: web berubah tapi mobile copy/API contract tertinggal.

## Lampiran B: Studi Kasus 1 - Mengubah AI Brew Tanpa Merusak Rasa

Skenario: user melaporkan recipe V60 iced terasa aneh karena step terlalu sedikit atau angka terlalu susah dipakai.

Langkah kerja:

1. Reproduksi input user.
2. Buka localStorage plan jika E2E/local browser menyimpan last plan.
3. Catat `doseG`, `totalWaterMl`, `hotWaterMl`, `iceMl`, `finalBeverageRatio`, `hotExtractionRatio`, dan `steps`.
4. Pastikan step pour total sama dengan `hotWaterMl`.
5. Pastikan target step terakhir sama dengan `hotWaterMl`.
6. Pastikan tidak ada `serve` yang muncul sebagai step seduh utama jika flow iced.
7. Cek apakah method family punya adjustment khusus.
8. Ubah planner secara kecil.
9. Ubah UI formatter jika angka masih tidak user-friendly.
10. Ubah prompts/aiComposer agar AI tidak menampilkan angka lama.
11. Jalankan test planner.
12. Jalankan E2E tools di desktop dan mobile profile.

Hal yang tidak boleh dilakukan:

- Menghapus validator karena AI output gagal.
- Mengubah semua method family berdasarkan satu kasus V60.
- Mengubah ratio internal hanya agar display terlihat rapi.
- Menambah step service sebagai step brew jika membuat user bingung.
- Mengubah UI saja tanpa memperbaiki handoff Timer/Ratio.

Definition of done untuk kasus ini:

- V60 iced punya sequence operasional masuk akal.
- Angka display barista-friendly.
- Internal ratio masih valid.
- E2E quick dan pro iced pass.
- Handoff Timer/Ratio pass.
- Ringkasan dan SOP tidak mengandung angka mentah yang membingungkan.

## Lampiran C: Studi Kasus 2 - Menambah Provider Payment

Skenario: operator ingin menambah Xendit atau Midtrans untuk user Indonesia.

Langkah kerja:

1. Tentukan apakah provider dipakai sebagai hosted payment link, checkout API, atau webhook lifecycle penuh.
2. Tambahkan env provider di `.env.example` tanpa nilai real.
3. Tambahkan mapping provider di plan catalog jika belum ada.
4. Pastikan `/api/billing/checkout` bisa menghasilkan URL atau error friendly.
5. Pastikan `/api/billing/sync` hanya menerima request bertoken.
6. Pastikan status `active`, `past_due`, `cancelled`, `expired`, `refunded` bisa dimapping.
7. Pastikan `account/status` membaca hasil terbaru.
8. Pastikan admin audit menulis perubahan.
9. Tambahkan test unit untuk signature/token dan lifecycle.
10. Jalankan smoke flow checkout sandbox jika provider siap.

Pertanyaan desain:

- Apakah user langsung aktif setelah bayar atau harus manual review?
- Apakah receipt user hanya provisional?
- Apa yang terjadi saat refund?
- Apa yang terjadi saat chargeback?
- Apakah plan downgrade langsung atau akhir periode?
- Apakah mobile subscription disatukan lewat RevenueCat?

Untuk MVP, pilihan aman adalah:

- Hosted checkout link untuk web.
- Receipt masuk sebagai status review.
- Admin manual activate untuk paid entitlement.
- Webhook lifecycle disiapkan, tetapi live enforcement hanya setelah test lengkap.

## Lampiran D: Studi Kasus 3 - Membuat Admin Mutation Baru

Skenario: admin ingin menambah field `supportPriority` pada user.

Langkah kerja:

1. Tambahkan kolom di SQL migration atau schema source.
2. Tentukan nilai enum yang valid.
3. Tambahkan field ke type server dan client.
4. Tambahkan validasi patch di `server-api/admin/management.ts`.
5. Tentukan apakah perubahan butuh operator note.
6. Tentukan apakah perubahan masuk risk warning/critical.
7. Tambahkan UI field di Users tab.
8. Tambahkan copy Indonesia/English.
9. Tulis audit event.
10. Tambahkan test mutation success, invalid value, unauthorized, audit.
11. Pastikan mobile/user-facing account status tidak bocor field internal jika tidak perlu.

Kesalahan umum:

- Menambahkan input UI tetapi server menerima nilai apa saja.
- Menambahkan server patch tetapi lupa audit.
- Mengubah role/status tanpa self-lockout protection.
- Menampilkan field internal ke user biasa.

## Lampiran E: Studi Kasus 4 - Menjaga Bahasa Indonesia End-to-End

Skenario: sebagian UI admin atau user masih muncul English.

Langkah kerja:

1. Cari copy raw di component.
2. Pindahkan ke localization map jika reusable.
3. Pastikan fallback tidak membuat bahasa campur.
4. Cek bahasa di web, PWA, mobile parity, dan admin.
5. Jalankan test localization.
6. Lihat apakah istilah teknis lebih baik diterjemahkan atau dibiarkan.

Kaidah bahasa:

- "Sign in" menjadi "Masuk".
- "Create account" menjadi "Daftar" atau "Buat akun".
- "Billing" boleh menjadi "Pembayaran" jika user-facing.
- "Plan" boleh menjadi "Paket" untuk user, "Plan" untuk admin teknis jika konteks jelas.
- "Deep mode" bisa tetap "Mode Deep" karena nama fitur.
- "Scanner" bisa menjadi "Pemindai" untuk user, tetapi "Scanner" bisa dipakai jika UI sudah familiar.

Jangan menerjemahkan nama brand, route teknis, env var, atau provider.

## Lampiran F: Template PR dan Release Note

Template PR:

```text
Summary
- Apa yang berubah?
- Mengapa perubahan ini perlu?

User impact
- Web:
- PWA/mobile web:
- Mobile parity:
- Admin:
- Billing:

Risk
- Low/Medium/High:
- Area rawan:
- Rollback plan:

Validation
- npm run check
- Unit:
- E2E:
- Smoke:

Notes
- Env baru:
- Migration:
- Manual step:
```

Template release note internal:

```text
Release:
Commit:
Deploy URL:
Production alias:

Changed:
- 

Verified:
- 

Watch after deploy:
- 

Rollback:
- 
```

## Lampiran G: 60 Menit Onboarding Developer Baru

Menit 0-10:

- Baca README.
- Jalankan `npm install` jika belum.
- Jalankan `npm run check`.
- Buka app lokal.

Menit 10-20:

- Buka `App.tsx`.
- Ikuti route Home, Chat, Scanner, Tools, Collection, Admin.
- Pahami auth gate dan browse-only preview.

Menit 20-30:

- Buka `server-api/ai.ts`.
- Buka `server-api/_shared.ts`.
- Pahami rate limit, CORS, origin, auth, provider fallback.

Menit 30-40:

- Buka AI Brew planner dan tests.
- Baca satu test yang menjelaskan iced split.
- Jalankan test AI Brew.

Menit 40-50:

- Buka admin runbook.
- Buka admin management API.
- Pahami audit dan role.

Menit 50-60:

- Buka billing sync.
- Buka account status.
- Tulis satu improvement kecil dan test yang akan Anda jalankan.

Jika developer bisa menjawab 5 pertanyaan ini, onboarding awal berhasil:

1. Apa bedanya browse-only, free, dan paid user?
2. Di mana API memeriksa origin?
3. Mengapa AI Brew planner deterministik penting?
4. Mengapa admin mutation harus audit?
5. Command apa yang wajib sebelum deploy?

## Lampiran H: Walkthrough Produksi dari Issue ke Release

Bagian ini mensimulasikan satu perubahan nyata dari awal sampai production. Gunakan sebagai latihan membaca sistem.

Issue:

"User di PWA iOS mengatakan AI Brew iced V60 menampilkan angka sulit diikuti dan saat dikirim ke Ratio Tool angka berubah menjadi lebih detail."

Analisis awal:

Masalah ini terdengar seperti masalah presentation dan handoff. Tetapi jangan langsung mengedit UI. AI Brew punya planner, display formatter, prompt, composer, storage, dan tool handoff. Jika hanya UI result card dibulatkan, Ratio Tool masih bisa menerima angka mentah. Jika hanya planner dibulatkan semua, logic rasa bisa berubah. Jika prompt AI tidak dibulatkan, AI bisa menulis angka lama di narasi.

File yang harus diperiksa:

- `planner.ts`: sumber plan dan angka internal.
- `AiBrewPanel.tsx`: tampilan result, step card, SOP, loading, button handoff.
- `localization.ts`: summary bahasa Indonesia dan English.
- `aiComposer.ts`: narasi deterministic/hybrid.
- `prompts.ts`: prompt untuk AI coach.
- `BaristaTools.tsx`: handoff ke Timer dan Ratio.
- `tools.spec.ts`: E2E flow AI Brew ke Timer/Ratio.
- `aiBrewPlanner.test.ts`: invariant plan.

Keputusan desain:

Angka internal tetap boleh presisi jika dipakai untuk logic rasa, conformance, dan validation. Angka user-facing dibulatkan. Untuk manual brew, increment 5 ml dan 5 detik cukup masuk akal. Untuk espresso, 1 ml dan 1 detik lebih cocok. Untuk cold brew dan batch, increment lebih besar lebih masuk akal. Rasio ditampilkan 1 desimal. Suhu ditampilkan bulat.

Implementasi:

1. Tambahkan helper rounding di planner.
2. Terapkan pada total water, hot water, ice, step start, pour volume, target volume, dan estimated output.
3. Jangan membulatkan ratio internal secara kasar jika test rasa bergantung pada presisi.
4. Tambahkan formatter display ratio dan temperature.
5. Ubah summary dan service note.
6. Ubah UI result agar screen reader dan visual sama-sama rapi.
7. Ubah prompt composer agar AI tidak menyebut angka mentah.
8. Ubah handoff ke Ratio Tool.
9. Ubah E2E expected text ke display ratio.
10. Tambahkan test invariant bahwa semua step memakai increment.

Validasi:

```bash
npm run test:unit -- tests/unit/aiBrewPlanner.test.ts tests/unit/aiBrewComposer.test.ts
npx playwright test tests/e2e/tools.spec.ts --grep "ai brew quick and pro iced modes"
npx playwright test tests/e2e/tools.spec.ts --grep "ai brew can hand off an iced plan into timer and ratio tools"
npm run check
```

Review akhir:

- Apakah ada file non-AI Brew ikut berubah? Jika ya, kenapa?
- Apakah result UI, prompt, localization, dan handoff konsisten?
- Apakah mobile profiles Playwright pass?
- Apakah commit message menjelaskan user impact?

Pelajaran:

Masalah UI sering punya akar lintas sistem. Di BaristaChaw, angka bukan hanya teks. Angka adalah contract antara planner, UI, AI narrative, Timer, Ratio, dan ekspektasi barista. Karena itu perubahan kecil harus dilihat sebagai contract change.

## Lampiran I: Kamus Env Production

Env adalah bagian dari arsitektur. Salah env bisa membuat fitur terlihat rusak padahal code benar.

Env server wajib:

`APP_URL`

URL canonical app production. Dipakai untuk callback, internal base URL, dan beberapa link. Production saat ini memakai `https://baristaclaw.vercel.app`.

`ALLOWED_ORIGINS`

Daftar origin yang boleh melakukan browser write. Jangan isi wildcard untuk production.

`JWT_SECRET`

Secret panjang untuk menandatangani session. Minimal 32 karakter, lebih baik random panjang.

`ADMIN_EMAILS`

Daftar email owner/admin yang boleh membuka `/admin`. Jangan pakai wildcard domain. Gunakan email login production yang sama.

`GEMINI_API_KEY`

Provider AI. Bisa beberapa key dipisah koma jika sistem mendukung.

`SUPABASE_URL`

URL project Supabase.

`SUPABASE_PUBLISHABLE_KEY`

Key publik/anon jika dibutuhkan client atau auth flow yang aman.

`SUPABASE_SERVICE_ROLE_KEY`

Server-only. Jangan pernah masuk client env.

Monitoring:

`SENTRY_DSN`

DSN error monitoring. Bisa berbeda untuk web/server/mobile.

`HEALTHCHECK_TOKEN`

Token untuk deep health endpoint.

Billing:

`BILLING_LIVE_MODE`

Menandakan billing live. Jangan true sebelum provider diuji.

`PLAN_ENFORCEMENT_ENABLED`

Menandakan kuota plan ditegakkan. Bisa false saat soft launch.

`BILLING_SYNC_TOKEN`

Token untuk webhook atau sync lifecycle. Harus secret.

`BILLING_CHECKOUT_URL_STARTER`, `BILLING_CHECKOUT_URL_PRO`, `BILLING_CHECKOUT_URL_TEAM`

Hosted checkout link jika MVP belum memakai API checkout penuh.

Provider-specific:

- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_WEBHOOK_SECRET`
- `XENDIT_SECRET_KEY`
- `XENDIT_WEBHOOK_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REVENUECAT_API_KEY`
- `REVENUECAT_WEBHOOK_SECRET`
- `GOOGLE_PLAY_PACKAGE_NAME`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_SHARED_SECRET`

Mobile env:

Mobile tidak boleh menerima service role. Gunakan publishable key, project URL, app URL, deep link, dan public config yang memang aman.

Checklist env:

```bash
npm run prod:env:check
npm run mobile:auth:check
vercel env ls
```

Pertanyaan audit env:

- Apakah ada secret di git?
- Apakah ada service role di `VITE_`?
- Apakah ada service role di `EXPO_PUBLIC_`?
- Apakah admin email sudah benar?
- Apakah allowed origins hanya domain production?
- Apakah billing live mode sengaja true?
- Apakah health token ada?
- Apakah deploy dilakukan ulang setelah env berubah?

## Lampiran J: Security Review Mandiri 30 Menit

Gunakan daftar ini sebelum launch besar.

Menit 0-5: Secret.

- Cek `.env.example` hanya berisi placeholder.
- Cek `.env.local` tidak distage.
- Cek Vercel env scope production.
- Cek tidak ada key di docs.

Menit 5-10: Auth.

- Guest session signed tetap ada hanya untuk kompatibilitas backend.
- Email login error aman.
- OAuth callback redirect aman.
- Logout clear cookie.
- Mobile grant one-time.

Menit 10-15: API.

- Origin guard aktif untuk browser write.
- Rate limit auth dan AI.
- Attachment size limit.
- Error sanitized.
- E2E mock disabled production.

Menit 15-20: Admin.

- Admin allowlist server-side.
- Mutation role-based.
- Critical mutation butuh reason.
- Audit event tertulis.
- Self lockout dicegah.

Menit 20-25: Data.

- RLS true.
- Sensitive table tidak public write.
- Service role server-only.
- Backup/PITR disiapkan.
- Security Advisor dicek.

Menit 25-30: Billing.

- Webhook/sync token.
- Refund/cancel/past_due handled.
- Receipt provisional jelas.
- Plan enforcement tidak aktif prematur.
- Paid access gate punya test.

Output review:

```text
Tanggal:
Reviewer:
Scope:
Risiko kritikal:
Risiko warning:
Keputusan deploy:
Follow-up:
```

## Lampiran K: Data Dictionary Ringkas

`app_users`

Representasi user dalam sistem BaristaChaw. Jangan samakan begitu saja dengan auth provider user. Field penting biasanya role, account status, plan code, billing status, display name, username, recovery status, dan support note.

`app_plans`

Sumber katalog paket. UI plan dan admin plan harus membaca konsep yang sama: harga tampilan, kuota, provider, market, checkout mode, entitlement.

`user_entitlements`

Sumber kebenaran untuk akses berbayar dari provider seperti RevenueCat, Play Store, App Store, Stripe, Midtrans, atau Xendit.

`payment_receipts`

Tempat receipt user dan status review. Untuk MVP, receipt bisa masuk otomatis, tetapi aktivasi final sebaiknya diverifikasi admin.

`app_usage_daily`

Dipakai untuk enforcement kuota harian. Jika enforcement aktif, endpoint AI harus menulis/membaca usage dengan benar.

`app_feature_flags`

Kontrol maintenance/disabled/available per surface.

`admin_audit_events`

Jejak mutasi admin. Audit harus cukup detail untuk investigasi tetapi tidak menyimpan secret.

`catalog_review_queue`

Antrean request data katalog. Jangan langsung publish item tanpa review jika sumber belum jelas.

## Lampiran L: Prinsip Keputusan Teknis

Saat bingung memilih solusi, gunakan prioritas ini:

1. Jangan bocorkan data atau secret.
2. Jangan buka aksi browse-only tanpa keputusan produk.
3. Jangan membuat admin kehilangan kontrol.
4. Jangan membuat user membayar tanpa status jelas.
5. Jangan membuat AI Brew terlihat presisi palsu.
6. Jangan menambah dependency besar tanpa kebutuhan kuat.
7. Jangan membuat mobile parity tertinggal diam-diam.
8. Jangan deploy tanpa verifikasi yang sesuai risiko.

BaristaChaw akan terus berubah. Prinsip di atas membantu menjaga arah saat fitur bertambah.

## Lampiran M: Code Review Checklist per Area

Gunakan checklist ini saat membaca PR atau melakukan self-review sebelum commit.

Review UI:

- Apakah komponen mengikuti pola visual yang sudah ada?
- Apakah text muat di mobile?
- Apakah dark mode dan light mode sama-sama terbaca?
- Apakah tombol memakai label jelas?
- Apakah loading state menjelaskan apa yang sedang terjadi?
- Apakah error state memberi aksi berikutnya?
- Apakah keyboard iOS aman untuk input/modal?
- Apakah ada text English yang bocor di mode Indonesia?
- Apakah motion bisa dikurangi jika user memakai reduced motion?

Review API:

- Apakah method HTTP benar?
- Apakah payload divalidasi?
- Apakah request write memeriksa origin?
- Apakah auth dibutuhkan dan diperiksa server-side?
- Apakah rate limit relevan?
- Apakah error response tidak membocorkan secret/internal stack?
- Apakah provider timeout ditangani?
- Apakah response contract kompatibel dengan web dan mobile?

Review data:

- Apakah field baru perlu migration?
- Apakah RLS/policy berubah?
- Apakah service role tetap server-only?
- Apakah data user private tidak muncul ke publik?
- Apakah audit event perlu?
- Apakah fallback runtime masih aman jika Supabase belum siap?

Review AI:

- Apakah prompt terlalu longgar?
- Apakah AI bisa mengubah angka deterministic?
- Apakah bahasa jawaban mengikuti user?
- Apakah high-cost action punya paid gate?
- Apakah attachment size aman?
- Apakah search butuh sumber?
- Apakah deep mode punya quality gate?

Review admin:

- Apakah non-admin bisa membuka API?
- Apakah role rendah bisa mutate field tinggi?
- Apakah perubahan kritikal butuh reason?
- Apakah self lockout dicegah?
- Apakah audit event cukup jelas?
- Apakah UI mobile admin masih usable?

Review billing:

- Apakah plan display sama dengan plan backend?
- Apakah checkout dead end punya pesan?
- Apakah refund/cancel/past_due dimapping?
- Apakah receipt provisional jelas?
- Apakah paid access gate memakai account status terbaru?
- Apakah webhook/sync punya token?

Review mobile parity:

- Apakah perubahan web memengaruhi mobile copy?
- Apakah API response dipakai mobile?
- Apakah route/deep link berubah?
- Apakah browse-only preview masih ada?
- Apakah PWA dan native punya icon/status yang konsisten?

## Lampiran N: Roadmap Teknis yang Sehat

Roadmap bukan daftar mimpi fitur. Roadmap teknis harus mengurangi risiko dan membuka kemampuan produk. Untuk BaristaChaw, urutan yang sehat adalah:

Fase 1: Stabilitas MVP.

- Auth browse-only gate, Google, email stabil.
- AI Chat dan AI Brew tidak crash.
- Admin bisa membaca user/plan/audit.
- Billing checkout masih boleh manual/link.
- Smoke production mudah dijalankan.

Fase 2: Paid readiness.

- Plan enforcement aktif.
- Usage daily akurat.
- Billing sync provider diuji.
- Receipt review flow jelas.
- Plan UI tidak overpromise.

Fase 3: Mobile store readiness.

- Android/iOS build final.
- App icon, splash, privacy, terms.
- Deep link auth.
- Store subscription mapping.
- Crash reporting.

Fase 4: Data quality.

- Katalog water/grinder/dripper diperluas.
- Review queue aktif.
- Evidence pack diperbarui.
- AI Brew method coverage makin kaya.

Fase 5: Team/kedai.

- Team seats.
- Shared collection.
- SOP export.
- Manager controls.
- Audit export.

Setiap fase harus punya gate. Jangan melompat ke fitur besar jika gate dasar belum sehat. Produk yang terasa "mantap" biasanya bukan karena fiturnya banyak, tetapi karena alur utama tidak membuat user berpikir keras.

## Lampiran O: Cara Menulis Dokumen Internal Berikutnya

Dokumen internal BaristaChaw harus menjawab lima hal:

1. Siapa pembacanya?
2. Masalah apa yang diselesaikan?
3. File atau sistem mana yang terkait?
4. Langkah apa yang harus dilakukan?
5. Bagaimana tahu bahwa selesai?

Format yang disarankan:

```text
Judul
Target pembaca
Kapan dipakai
Ringkasan keputusan
Langkah
Validasi
Risiko
Rollback
Referensi file
```

Jangan menulis dokumen yang hanya berisi semangat. Dokumen harus bisa dipakai saat orang lelah, sedang incident, atau baru masuk project. Bahasa boleh ramah, tetapi instruksi harus konkret.
