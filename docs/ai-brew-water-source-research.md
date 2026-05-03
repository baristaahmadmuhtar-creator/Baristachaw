# AI Brew Water Source Research

Tanggal riset: 2026-05-03

Dokumen ini mencatat sumber publik yang dipakai untuk memperkuat katalog air AI Brew. Prinsipnya:

- Angka mineral hanya dipakai sebagai autofill bila ada panel publik yang cukup untuk TDS, Ca, Mg, dan bicarbonate/KH.
- Jika sumber hanya menyebut pH, TDS, atau klaim umum, entry tetap `review_only` atau `manual_required`.
- Data komunitas/curated boleh membantu pencarian, tetapi tidak boleh ditampilkan sebagai official.
- Air RO, zero-mineral, low-mineral, alkaline caution, dan sparkling tidak boleh dianggap ready-brew otomatis.

## Source-backed Updates

| Brand | Entry | Source | Status |
| --- | --- | --- | --- |
| Evian | `evian-global`, `evian-my`, `evian-sg`, `evian-bn` | https://www.evian.com/en_gb/our-water/water-attributes | Full official mineral panel. Global/MY/SG are ready with high-buffer caution; BN stays review-only until exact imported label is verified. |
| FIJI | `fiji-global`, `fiji-my`, `fiji-sg` | https://www.fijiwater.ca/faqs | Full brand-published typical analysis. Ready with high-buffer caution. |
| Volvic | `volvic-global`, `volvic-my`, `volvic-sg`, `volvic-bn` | https://www.volvic.co.uk/products/natural-mineral-water/volvic-natural-mineral-water/natural-mineral-water-15l | Full official mineral panel. Global/MY/SG are ready; BN stays review-only until exact imported label is verified. |
| Acqua Panna | `acqua-panna-global`, `acqua-panna-my`, `acqua-panna-sg` | https://www.acquapanna.com/intl/1l-plastic-water-bottle | Full official typical analysis. Ready with high-buffer caution. |
| Highland Spring | `highland-spring-global`, `highland-spring-sg` | https://highlandspring.com/product-range/spring-water/ | Full official average analysis. Ready with high-buffer caution. |
| S.Pellegrino | `san-pellegrino-sg` | https://www.sanpellegrino.com/water/1-l-pet-bottle?_wrapper_format=html | Full official panel, but carbonated. Published for reference, not ready-brew autofill. |
| Spritzer | `spritzer-my`, `spritzer-sg`, `spritzer-bn` | https://www.spritzer.com.my/our-product/spritzer-natural-mineral-water/ | Official ions. Malaysia profile is ready; SG/BN imports stay review-only until exact market label is confirmed. |
| Icelandic Glacial | `icelandic-glacial-global`, `icelandic-glacial-sg`, `icelandic-glacial-bn` | https://icelandicglacial.com/pages/our-water | Official pH and TDS only. Kept review-only because Ca/Mg/bicarbonate are not public enough for brew minerals. |
| Cleo | `cleo-id` | https://cleopurewater.com/brand-cleo/ | Official TDS under 10 ppm. Published as low-mineral base, not ready-brew autofill. |
| Pristine 8.6+ | `pristine-8-6-plus-id`, `pristine-8-plus-id` | https://pristineofficial.com/tentang-ph86 | Official alkaline pH. Manual required because coffee mineral panel is incomplete or curated. |

## Kept Manual or Review-only

These entries should stay manual until a label photo, official product spec, regulator document, or lab report gives complete chemistry:

- `aqua-id`: official site confirms general natural mineral positioning, but no public Ca/Mg/HCO3 panel.
- `le-minerale-id`, `le-minerale-my`: official pages list essential minerals but do not publish quantities.
- `dasani-global`: official quality report is safety/compliance oriented and does not provide stable coffee-water Ca/Mg/HCO3 values.
- `nestle-pure-life-global`: Pure Life chemistry is region-specific; do not use one global point.
- `vittel-global`: Vittel source/SKU variants need explicit source modeling before autofill.
- `jeju-samdasoo-*`, `suntory-tennensui-*`, `watsons-water-*`, `heysong-water-*`, `nongfu-spring-*`, `natures-spring-*`, `la-vie-*`, `mont-fleur-*`: current public sources are incomplete or not official enough for automatic brew minerals.

## Production Notes

- `local:/Users/Alpha/...` is forbidden in normalized and public catalog data.
- Repo-local evidence must use `local:/data/catalog/raw-evidence/phase1/...` and confidence `<= 0.75`.
- Official source URLs are stored as `brand_site` or `official_report`.
- GH is computed as `Ca * 2.497 + Mg * 4.118`.
- KH is computed as `HCO3 * 0.82` unless an official source directly reports alkalinity as CaCO3.
- High-buffer water can be available as a source-backed preset, but UI must warn that it can mute acidity.
