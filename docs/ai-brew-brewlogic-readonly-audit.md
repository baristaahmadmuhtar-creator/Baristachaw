# BrewLogic Read-Only AI Brew Audit

Tanggal: 2026-05-05

Tujuan audit ini adalah memakai BrewLogic sebagai pembanding pola seduh, bukan
menyalin data privat, transaksi, atau library user. Akses dilakukan read-only
dengan akun uji yang disediakan pemilik project.

## Skenario Pembanding

- Origin: Colombia
- Region: Huila
- Process: Natural
- Variety: Ombligon
- Roast: Medium Light
- Dose: 15 g
- Target: More Sweetness

Skenario ini hanya dipakai untuk mengetes cara BrewLogic membentuk resep.
BaristaChaw tidak mengunci optimasi ke beans ini. Hasil yang diambil adalah pola
alat seduh, SOP, dan guardrail umum yang bisa diterapkan ke banyak origin,
varietas, proses, roast, hot, dan iced.

## Pola Yang Diambil

1. Setiap alat seduh punya bahasa SOP sendiri.
   - V60 menekankan cone flow, center-to-mid pour, dan drawdown bersih.
   - Kalita/April menekankan flat bed, pulse pendek, dan spout rendah.
   - Chemex menekankan thick filter, rinse/preheat kuat, dan hindari wall bypass.
   - Clever/Hario Switch menekankan valve/release, contact time, dan tidak
     menambah air saat release.
   - Immersion seperti French Press/AeroPress menekankan contact time,
     press/decant, dan tidak over-agitation.

2. Natural high-aroma tidak boleh otomatis didorong terlalu panas.
   - Hot filter lebih aman sekitar 90-92C.
   - Japanese iced lebih aman sekitar 91-93C.
   - Ini dipakai sebagai guardrail rasa, bukan klaim resep resmi Ombligon.

3. Bloom dibuat lebih panjang dan lebih besar untuk natural.
   - Baseline 15 g lebih nyaman dengan bloom sekitar 40-50 g.
   - Tujuannya membuka gas dan menjaga sweetness tanpa agitasi kasar.

4. V60 hot untuk natural high-aroma dibuat kompak.
   - Total air sekitar 225-230 g untuk 15 g.
   - Rasio sekitar 1:15.
   - Step tetap sederhana: bloom, middle pour, final pour, lalu drawdown.

5. Japanese iced tetap diperlakukan sebagai total input, bukan hasil cangkir.
   - Hot concentrate sekitar 1:9.
   - Ice split lebih besar untuk natural high-aroma, sekitar 90 g pada 15 g.
   - Estimated cup output tetap dikurangi retensi kopi.

6. Hario Switch tetap core brewer, tetapi trust label harus jujur.
   - Diposisikan sebagai hybrid immersion-release turunan, bukan profil official.
   - SOP utama: rinse/preheat, kontrol valve, release bersih, tanpa swirl berat.

## Yang Tidak Diambil

- Email, transaksi, user list, atau data admin privat BrewLogic.
- Klaim official yang tidak punya sumber publik.
- Angka grinder BrewLogic yang konflik dengan catalog BaristaChaw tanpa audit
  sumber. BaristaChaw tetap memakai source confidence dan calibration note.

## Dampak Ke BaristaChaw

- Ombligon masuk ke sweetness-variety recognition sebagai curated specialty
  cue, tetapi bukan fokus tunggal AI Brew.
- V60 natural high-aroma More Sweetness mendapat service calibration khusus.
- Step share natural diberi bloom lebih besar untuk manual pour-over.
- Panduan Hario Switch dipisah dari copy Clever supaya user tidak melihat nama
  alat yang salah pada sequence release.
- Unit test baru mengunci hot dan iced V60 natural Ombligon supaya tidak
  regresi.
