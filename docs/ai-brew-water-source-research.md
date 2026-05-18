# AI Brew Water Source Research

Tanggal riset: 2026-05-03

Update policy: 2026-05-19

Dokumen ini mencatat sumber publik yang dipakai untuk memperkuat katalog air AI Brew. Prinsipnya:

- Angka mineral hanya dipakai sebagai autofill bila ada panel publik yang cukup untuk TDS, Ca, Mg, dan bicarbonate/KH.
- Jika sumber hanya menyebut pH, TDS, atau klaim umum, entry tetap `review_only` atau `manual_required`.
- Data komunitas/curated boleh membantu pencarian, tetapi tidak boleh ditampilkan sebagai official.
- Air RO, zero-mineral, low-mineral, alkaline caution, dan sparkling tidak boleh dianggap ready-brew otomatis.

## Current Autofill Gate

As of 2026-05-19, AI Brew treats a brand-water entry as an autofill brew-water preset when all of these are true:

- The entry is either official/verified, or curated with trusted public community/coffee/academic support plus repo-local raw evidence.
- TDS, GH, and KH are available inside planner bounds.
- The water is not zero-mineral/RO, not estimated, and not blocked by consistency checks.
- Curated/community-backed entries stay medium confidence and must say they are starting points, not official mineral truth.

Curated Indonesian waters such as `aqua-id`, `le-minerale-id`, `vit-id`, `ades-id`, `crystalline-id`, and similar entries can autofill only as community-backed starting points when the mineral panel is complete and a trusted coffee/academic/public source supports the entry. They must not be labeled official, high-confidence, or physically validated. Entries with only repo-local evidence and no trusted public support remain manual-required.

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
| Indonesian coffee/community support | `aqua-id`, `le-minerale-id`, `2tang-id`, `club-id`, `oasis-id`, `prima-id`, `ron-88-id`, `frozen-id`, `amidis-id`, related Indonesian entries | https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi | Trusted coffee-community support. Can support medium-confidence curated use when complete mineral values exist; zero-mineral waters remain manual/remineralization only. |
| Indonesian AMDK academic context | `ades-id`, `vit-id`, `crystalline-id`, related entries | https://repository.urecol.org/index.php/proceeding/article/download/1773/1739 | Academic/public context for Indonesian bottled-water TDS behavior. Supports curated starting point only; does not upgrade entries to official. |

## 2026-05-19 Source Review Notes

These sources were reviewed as possible future promotions. They are useful evidence, but promotion still depends on mapping the exact SKU/source to the catalog entry:

- Poland Spring official 2025 WQR: `https://www.polandspring.com/sites/g/files/zmtnxh116/files/2026-02/PolandSpring_WQR_2025_EN.pdf`
- Arrowhead official WQR: `https://www.arrowheadwater.com/sites/g/files/zmtnxh146/files/2025-03/Arrowhead_Water_Quality_Report.pdf`
- Gerolsteiner official product analysis: `https://www.gerolsteiner.de/produkte/mineralwasser/sprudel`

No entry should be promoted from these sources until the product form is clear. For example, Gerolsteiner Sprudel is carbonated and extremely mineral-heavy, so it may be valid as a reference profile while still not being a brew-ready still-water autofill.

## Kept Manual or Review-only

These entries should stay manual until a label photo, official product spec, regulator document, trusted coffee/community publication, academic source, or lab report gives enough chemistry context:

- Local-only entries such as `alfa-spring-id`, `aetra-id`, and similar small/regional references: current values are repo-local curated/community references without trusted public support in the catalog.
- `dasani-global`: official quality report is safety/compliance oriented and does not provide stable coffee-water Ca/Mg/HCO3 values.
- `nestle-pure-life-global`: Pure Life chemistry is region-specific; do not use one global point.
- `vittel-global`: Vittel source/SKU variants need explicit source modeling before autofill.
- `jeju-samdasoo-*`, `suntory-tennensui-*`, `watsons-water-*`, `heysong-water-*`, `nongfu-spring-*`, `natures-spring-*`, `la-vie-*`, `mont-fleur-*`: current public sources are incomplete or not official enough for automatic brew minerals.

## Production Notes

- `local:/Users/Alpha/...` is forbidden in normalized and public catalog data.
- Repo-local evidence must use `local:/data/catalog/raw-evidence/phase1/...` and confidence `<= 0.75`.
- Official source URLs are stored as `brand_site` or `official_report`.
- `brand_site` alone does not unlock curated autofill unless the catalog entry also has complete mineral values and trusted public/community support.
- Public coffee/community evidence can unlock medium-confidence curated autofill, but never `official` or `high` confidence by itself.
- GH is computed as `Ca * 2.497 + Mg * 4.118`.
- KH is computed as `HCO3 * 0.82` unless an official source directly reports alkalinity as CaCO3.
- High-buffer water can be available as a source-backed preset, but UI must warn that it can mute acidity.
