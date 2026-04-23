# Baristachaw x BrewLogic — Integrasi & Peningkatan Akurasi

## Status
- Data publik BrewLogic telah diekstrak dan disalin ke `data/brewlogic-extract/`.
- Fokus integrasi: water profile, dripper, grinder, dan brew guidance.

## Implementasi prioritas (recommended)
1. **Data layer terverifikasi**: gunakan `waters.catalog/search`, `drippers.search`, `grinders.search` sebagai baseline; merge sumber baru hanya jika ada `source_url` + `updated_at`.
2. **Recipe engine**: tambah mode `manual_hot` dan `manual_ice` dengan parameter wajib: dose, water, temp, grind, total time, agitation.
3. **Akurasi air**: hitung otomatis hardness/alkalinity dari Ca/Mg/HCO3; tampilkan warning jika di luar target SCA.
4. **Ice brew calculator**: tampilkan rasio `ice_in_server`, `water_for_bloom`, `main_pour` agar hasil konsisten.
5. **AI guardrails**: jawaban AI wajib mengembalikan nilai numerik + alasan + fallback adjustment (+/- 1 klik grind, +/- 1°C).

## Formula standar
- Hardness (as CaCO3): `Ca*2.5 + Mg*4.1`
- Alkalinity (as CaCO3): `HCO3*0.82`
- Flash brew baseline: `coffee_g * 15 = total beverage`; `ice = 35–45% total beverage`; sisanya hot water.

## SOP seduh (ringkas)
- Hot V60 baseline: 15g coffee / 240g water / 92–94°C / 2:30–3:10
- Ice pour-over baseline: 20g coffee / 120g hot water + 80g ice / 93–95°C / grind 1 step lebih halus dari hot
- Koreksi: asam tipis -> lebih halus atau +1°C; pahit kering -> lebih kasar atau -1°C

## Struktur folder hasil
- `data/brewlogic-extract/*.json` (raw hasil ekstrak)
- `docs/BREWLOGIC_INTEGRATION_PLAN.md` (dokumen ini)