# AI Brew Data Quality

Dokumen ini menjadi aturan rilis untuk katalog grinder dan water brand AI Brew. Tujuannya sederhana: data yang tampil ke user harus jelas asalnya, jelas tingkat kepercayaannya, dan tidak mengklaim angka estimasi sebagai fakta.

## Source Levels

1. `official`: sumber publik resmi dari brand, lab, regulator, atau dokumen resmi yang dapat dibuka user.
2. `distributor_label`: foto label atau halaman distributor publik. Boleh dipakai sebagai referensi, tetapi tetap lebih lemah dari lab/brand resmi.
3. `curated/community`: dataset kurasi internal atau komunitas. Harus tampil sebagai curated/community reference, bukan klaim resmi.
4. `estimated`: baseline klasifikasi untuk membantu display. Tidak boleh dipakai sebagai ready-brew preset, tidak boleh dipasarkan sebagai angka faktual.

## Confidence And UI Labels

- `high`: hanya untuk official/direct source yang punya URL publik atau source resmi yang committed di repo.
- `medium`: curated/community dengan sumber pembanding publik yang masuk akal.
- `low`: user dataset, internal seed, source lokal, data incomplete, atau angka estimasi.

UI harus memakai label:

- Official reference
- Curated reference
- Community reference
- Estimated baseline

Untuk water:

- Direct label/lab data
- Derived from Ca/Mg/HCO3
- Estimated from classification
- Manual mineral input

## Grinder Setting Limits

Grinder setting bukan angka universal. Semua rekomendasi harus membawa catatan:

> Grinder settings depend on burr zero point, calibration, roast, and dose. Start here, then adjust by drawdown and taste.

Hal yang wajib diingat:

- Burr zero point berbeda antar unit.
- Click direction dan angka dial bisa berbeda antar versi.
- Stepped grinder dan stepless grinder tidak selalu bisa dibandingkan langsung.
- Roast level, dose, filter, dan flow dripper mengubah kebutuhan grind.
- User dataset tanpa source URL harus `dataset_unverified` dan `confidence=low`.
- Official grinder tanpa numeric chart tidak boleh dibuatkan angka palsu. Tampilkan `Reference official chart; manual setting required.`

## Water Data Limits

Label TDS tidak sama dengan profil air kopi lengkap. Untuk AI Brew, angka GH/KH lebih penting daripada sekadar TDS.

Formula derivasi yang dipakai untuk audit:

- GH as CaCO3 = Ca mg/L x 2.497 + Mg mg/L x 4.118
- Alkalinity as CaCO3 ~= HCO3 mg/L x 0.82

Aturan publish:

- `local:/Users/...` tidak boleh ada di published data.
- Source repo-local harus berada di `local:/data/catalog/raw-evidence/...`.
- Local/internal CSV bukan `official_report`; gunakan `catalog_seed`, `community_reference`, atau `raw_evidence`.
- Confidence source lokal/internal maksimal `0.75`.
- Estimated data harus `review_only`, `manual_required`, dan tidak ready brew.

## Water Safety Rules

Zero-mineral, RO, atau sangat low-mineral:

- Jika TDS <= 20, GH <= 15, atau KH <= 10, maka `is_brew_ready=false`.
- `presetStatus=manual_required`.
- `recommendedForFilter=false`.
- UI harus memberi CTA: `Use as RO base; add minerals manually.`

Alkaline water:

- Jika pH >= 8.2, tampilkan caution.
- Jangan label sebagai ideal V60/filter friendly.
- Gunakan manual_required kecuali ada complete direct public source.

High-buffer water:

- Jika KH >= 80 atau bicarbonate >= 100, jangan rekomendasikan sebagai excellent.
- UI warning: high alkalinity/buffer can mute acidity and flatten floral coffees.

## Release Gate

Sebelum publish:

```bash
npm run catalog:audit
npm run test:unit
npm run check
```

Untuk rilis penuh, jalankan juga:

```bash
npm run test:e2e
npm run test:a11y
npm run smoke:local
npm run release:verify
```
