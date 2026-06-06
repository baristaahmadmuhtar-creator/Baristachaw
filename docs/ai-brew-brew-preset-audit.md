# AI Brew Brew Preset Audit

Date: 2026-06-06
Catalog: `apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json`
Status: SOFTWARE VALIDATED / HUMAN SENSORY VALIDATION PENDING

This audit covers the deterministic brew preset catalog used by AI Brew. The presets are starting points, not guarantees. Physical cup quality still depends on bean age, roast development, grinder calibration, water chemistry, filter fit, and barista technique.

## Source Confidence

| Level | Meaning | User-facing rule |
| --- | --- | --- |
| `official_reference` | Parameters are backed by an official manufacturer, competition, or event page. | May show as official reference, but still as an inspired/adapted brew plan. |
| `curated_reference` | Parameters are backed by strong secondary sources, roaster guides, or published brew guides. | Must say curated reference; no official claim. |
| `community_reference` | Parameters come from public community material. | Must be treated as experimental. |
| `internal_synthesis` | Parameters are AI Brew synthesis from method evidence and common barista practice. | Must not be presented as a named official recipe. |

## 2025/2026 Additions

| Preset | Source status | Software guardrail |
| --- | --- | --- |
| `inspired-wac-2025-jan-ahrend` | `official_reference` from WAC recipes page | Preserves 18 g / 100 g concentrate / 152 g final target, AeroPress bypass wording only. |
| `inspired-wac-2025-dharun-vyas` | `official_reference` from WAC recipes page | Preserves 16 g / 208 ml brew water / 12 ml dilution, inverted AeroPress wording only. |
| `inspired-tetsu-kasuya-2026-ten-pour` | `curated_reference` from secondary public coverage | Forces ten 30 g V60 pours at 20 g / 300 g, marks reported 2026 10x pour and not official; Hario Neo is represented with V60 fallback. |

## Source Map

| Preset ID | Label | Category | Confidence | Brewer support | Source URL(s) |
| --- | --- | --- | --- | --- | --- |
| `inspired-george-peng-temperature-control` | Inspired by George Peng Temperature Control | competition_inspired | curated_reference | orea-v3-v4 | https://wcc.coffee/world-brewers-cup<br>https://wcc.coffee/latest-news/meet-the-2025-world-brewers-cup-finalists-pwy6e |
| `inspired-martin-woelfl-orea-v4` | Inspired by Martin Woelfl OREA V4 | competition_inspired | curated_reference | orea-v3-v4 | https://wcc.coffee/world-brewers-cup<br>https://europeancoffeetrip.com/winning-pour-over-recipe-martin-woelfl/ |
| `inspired-carlos-medina-origami` | Inspired by Carlos Medina Origami | competition_inspired | curated_reference | origami-dripper-s-m | https://wcc.coffee/world-brewers-cup<br>https://www.slowpoursupply.co/pages/recipe-recap-carlos-medina-s-representing-chile-world-brewers-cup-champion-recipe |
| `inspired-tetsu-kasuya-46` | Inspired by Tetsu Kasuya 4:6 | competition_inspired | curated_reference | hario-v60 | https://wcc.coffee/world-brewers-cup<br>https://kurasu.kyoto/blogs/kurasu-journal/2016-world-brewers-cup-champion-tetsu-kasuya |
| `inspired-matt-winton-five-pour-v60` | Inspired by Matt Winton Five-Pour V60 | competition_inspired | curated_reference | hario-v60 | https://wcc.coffee/world-brewers-cup<br>https://www.hario-europe.com/blogs/hario-community/matt-winton-world-brewers-cup-champion |
| `nordic-light-roast-v60-style` | Nordic Light Roast V60 Style | competition_inspired | internal_synthesis | hario-v60 | https://wcc.coffee/world-brewers-cup<br>https://timwendelboe.no |
| `kalita-competition-balance-style` | Kalita Competition Balance Style | competition_inspired | internal_synthesis | kalita-wave-155-185 | https://wcc.coffee/world-brewers-cup |
| `matt-perger-style-v60` | Matt Perger-Style V60 | competition_inspired | curated_reference | hario-v60 | https://wcc.coffee/world-brewers-cup<br>https://www.baristahustle.com |
| `chemex-competition-clean-cup-style` | Chemex Competition Clean Cup Style | competition_inspired | internal_synthesis | chemex | https://wcc.coffee/world-brewers-cup |
| `cone-dripper-competition-brew` | Cone Dripper Competition Brew | competition_inspired | internal_synthesis | hario-v60, origami-dripper-s-m | https://wcc.coffee/world-brewers-cup |
| `hoffmann-style-ultimate-v60` | Hoffmann-Style Ultimate V60 | global_classic | curated_reference | hario-v60 | https://www.jameshoffmann.co.uk<br>https://honestcoffeeguide.com/brew-recipes/james-hoffmann-v60/ |
| `hoffmann-style-better-one-cup-v60` | Hoffmann-Style Better 1-Cup V60 | global_classic | curated_reference | hario-v60 | https://www.jameshoffmann.co.uk<br>https://honestcoffeeguide.com/brew-recipes/james-hoffmann-v60/ |
| `hoffmann-style-ultimate-aeropress` | Hoffmann-Style Ultimate AeroPress | global_classic | curated_reference | aeropress | https://www.jameshoffmann.co.uk<br>https://aeropress.com |
| `rao-style-high-extraction-v60` | Rao-Style High Extraction V60 | global_classic | curated_reference | hario-v60 | https://www.scottrao.com/blog<br>https://www.scottrao.com |
| `lance-style-two-pour-v60` | Lance-Style Two-Pour V60 | global_classic | curated_reference | hario-v60 | https://www.lancehedrick.com<br>https://www.youtube.com/@LanceHedrick |
| `april-style-v60-flat-bottom` | April-Style V60 Flat-Bottom | global_classic | curated_reference | april-brewer, hario-v60 | https://www.aprilcoffeeroasters.com<br>https://www.aprilcoffeeroasters.com/pages/brew-guides |
| `tim-wendelboe-style-aeropress` | Tim Wendelboe-Style AeroPress | global_classic | curated_reference | aeropress | https://timwendelboe.no<br>https://aeropress.com |
| `onyx-style-v60` | Onyx-Style V60 | global_classic | curated_reference | hario-v60 | https://onyxcoffeelab.com<br>https://onyxcoffeelab.com/pages/brew-guides |
| `blue-bottle-chemex-style` | Blue Bottle Chemex Style | global_classic | curated_reference | chemex | https://bluebottlecoffee.com<br>https://bluebottlecoffee.com/brew-guides |
| `kurasu-kyoto-style-v60` | Kurasu Kyoto V60 Style | global_classic | curated_reference | hario-v60 | https://kurasu.kyoto<br>https://kurasu.kyoto/blogs/kurasu-journal/2016-world-brewers-cup-champion-tetsu-kasuya |
| `rogue-wave-origami-style` | Rogue Wave-Style Origami | global_classic | curated_reference | origami-dripper-s-m, origami-dripper-air-s | https://roguewavecoffee.ca/blogs/brew-guide/recipe-how-to-make-an-origami-pour-over<br>https://www.stumptowncoffee.com/pages/brew-guide-origami |
| `manhattan-roasters-pour-over-style` | Manhattan-Style Pour Over | global_classic | internal_synthesis | hario-v60, origami-dripper-s-m | https://manhattancoffeeroasters.com<br>https://wcc.coffee/world-brewers-cup |
| `coffee-collective-filter-style` | Coffee Collective-Style Filter | global_classic | internal_synthesis | hario-v60, kalita-wave-155-185 | https://coffeecollective.dk<br>https://sca.coffee/research |
| `hario-switch-hybrid-style` | Hario Switch Hybrid Style | global_classic | curated_reference | hario-switch-03, hario-switch-02, mugen-x-switch | https://brewtuner.io/guides/hario-switch-brew-guide<br>https://wackercoffeeco.com/blogs/coffee-brewing-guides/hario-switch-brewing-guide |
| `clever-dripper-immersion-style` | Clever Immersion Sweetness | global_classic | curated_reference | clever-dripper | https://www.kobricks.com/brewguides/pdf/cleverdrip.pdf<br>https://sca.coffee/research |
| `hoffmann-style-french-press` | Hoffmann-Style French Press | global_classic | curated_reference | french-press | https://www.jameshoffmann.co.uk<br>https://sca.coffee/research |
| `modern-low-heat-moka-pot` | Modern Low-Heat Moka Pot | global_classic | curated_reference | bialetti-moka-pot | https://www.roastcc.com/brewing-guides/moka-pot<br>https://coffeebrewguides.com/moka-pot-guide/ |
| `japanese-iced-v60-flash-brew` | Japanese Iced V60 Flash Brew | global_classic | curated_reference | hario-v60 | https://www.vibrantcoffeeroasters.com/v60-iced<br>https://www.roastcc.com/learn/how-to-make-iced-coffee |
| `siphon-clean-aromatic-style` | Siphon Clean Aromatic Style | global_classic | curated_reference | hario-siphon | https://www.starbucksreserve.com/brew-guides/siphon<br>https://prima-coffee.com/blog/siphon-brewing-guide/ |
| `toddy-style-cold-brew-immersion` | Toddy-Style Cold Brew Immersion | global_classic | curated_reference | toddy-cold-brew | https://www.toddycafe.com/brewing<br>https://specialtycoffeemap.com/en/brew-guides/cold-brew |
| `sweetness-focus-brew` | Sweetness Focus Brew | taste_target | internal_synthesis | hario-v60, kalita-wave-155-185 | https://sca.coffee/research<br>https://worldcoffeeresearch.org/resources/coffee-varieties-catalog |
| `acidity-focus-brew` | Acidity Focus Brew | taste_target | internal_synthesis | hario-v60, origami-dripper-s-m | https://sca.coffee/research<br>https://worldcoffeeresearch.org/resources/coffee-varieties-catalog |
| `body-focus-brew` | Body Focus Brew | taste_target | internal_synthesis | kalita-wave-155-185, hario-v60 | https://sca.coffee/research<br>https://worldcoffeeresearch.org/resources/coffee-varieties-catalog |
| `clarity-focus-brew` | Clarity Focus Brew | taste_target | internal_synthesis | hario-v60, chemex | https://sca.coffee/research<br>https://worldcoffeeresearch.org/resources/coffee-varieties-catalog |
| `fast-brew` | Fast Brew | taste_target | internal_synthesis | hario-v60, april-brewer | https://sca.coffee/research |
| `inspired-wac-championship-style` | Inspired by Nemo Pop WAC 2025 | competition_inspired | official_reference | aeropress | https://aeropress.com/blogs/w-a-c-aeropress-recipes/1st-nemo-pop-australia-2025<br>https://worldaeropresschampionship.com/pages/recipes |
| `inspired-wac-2025-jan-ahrend` | Inspired by Jan Ahrend WAC 2025 | competition_inspired | official_reference | aeropress | https://worldaeropresschampionship.com/pages/recipes |
| `inspired-wac-2025-dharun-vyas` | Inspired by Dharun Vyas WAC 2025 | competition_inspired | official_reference | aeropress | https://worldaeropresschampionship.com/pages/recipes |
| `inspired-tetsu-kasuya-2026-ten-pour` | Inspired by Tetsu Kasuya 2026 10x Pour | competition_inspired | curated_reference | hario-v60 | https://roastaroma.com/blog/tetsu-kasuyas-new-multi-pour-method-2026-the-10-pour-super-coarse-v60-recipe |
| `inspired-aeropress-cold-brew-express` | AeroPress Cold Brew Express | global_classic | official_reference | aeropress | https://aeropress.com/blogs/aeropress-recipes/express-cold-brew |

## Software Validation Status

- Catalog count: 40 presets.
- Required metadata: unique ID, unique safe label, source URLs, guardrails, supported brewer IDs, and target profile IDs.
- Ratio invariant: every generated preset plan must display `totalWaterMl / doseG` rounded to 1 decimal.
- Manual edits: dose and water edits keep the preset attached as an adapted starting point while recalculating ratio, time, and method guardrails.
- Method vocabulary: AeroPress presets use setup, charge, stir, steep, press, bypass/dilute, and serve; French Press uses immersion/decant language; Switch/MUGEN keeps valve/release/chamber language.
- Tetsu 2026 10x pour: validated as `curated_reference`, ten equal 30 g pours, V60 fallback for Hario Neo, and not an official claim.

## Human Sensory Status

Physical sensory validation is pending. Do not mark a preset as sensory-passed until a human tester records bean, water, grinder, actual finish time, taste scores, defects, and next correction in `docs/ai-brew-sensory-validation-log.md`.

## Known Limitations

- Some classic presets are intentionally `internal_synthesis` because they represent style families rather than a single official public recipe.
- Secondary public coverage is used only as `curated_reference`; the UI must not label those presets as official.
- AI Brew software validation can prove consistency, guardrails, and method realism. It cannot prove every bean will taste ideal without dial-in.
