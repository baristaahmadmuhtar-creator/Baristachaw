# AI Brew Method Matrix

This matrix summarizes AI Brew software readiness by method family. It is based on current unit, e2e, workflow, and stress gates. Physical brew validation remains tracked separately.

| Method family | Hot | Iced | Current label | Why |
|---|---:|---:|---|---|
| V60 | Supported | Supported | PRODUCTION STRONG | Exact hot/iced tests, bloom/pour map, hot-water/ice split, target-profile variation, Indonesian guide checks. |
| Hario Switch 02/03 | Supported | Supported | PRODUCTION STRONG | Chamber guard, valve semantics, Switch dose matrix, taste programme, and iced split are tested. |
| MUGEN x SWITCH | Supported | Supported | PRODUCTION STRONG | Separate capacity model and preset handling; not treated as Switch 03. |
| Chemex | Supported | Supported | PRODUCTION STRONG | Thick-filter family guide, longer drawdown tolerance, iced split, and stall guard are tested. |
| Flat-bottom | Supported | Supported | PRODUCTION STRONG | Kalita, April, Orea/B75-style flat-bed guidance uses level bed and pulse control. |
| Origami/Kono | Supported | Supported | PRODUCTION BASELINE | Cone/flat derivation is guarded; exact paper/filter field validation still benefits from real brew notes. |
| Clever | Supported | Supported when catalog allows | PRODUCTION STRONG | Steep/release guide and no pour-over leakage tests are present. |
| AeroPress | Supported | Guarded if unsupported | PRODUCTION BASELINE | Steep/press/stop-before-hiss guide exists; style variants still require user dial-in. |
| French Press | Supported | Guarded if unsupported | PRODUCTION STRONG | Steep, settle, press, decant, and no V60 leakage are tested. |
| Espresso | Supported | Not treated as filter iced | REAL-WORLD VALIDATION NEEDED | Dose/yield/time guardrails exist, but grinder zero point, basket, pressure, and puck prep must be dialed in physically. |
| Moka | Supported | Not treated as filter iced | PRODUCTION BASELINE | No tamp, medium heat, stop-before-sputter, and bitterness guard are tested. |
| Cold Brew | Supported | Dedicated cold mode | PRODUCTION BASELINE | Concentrate/ready-to-drink semantics and filtration guide exist; food-safety/process timing needs real operation validation. |
| Batch Brewer | Supported | Guarded if unsupported | PRODUCTION BASELINE | Machine-cycle guide avoids V60 pours; model-specific brewer calibration remains validation work. |
| Siphon | Supported | Guarded if unsupported | PRODUCTION BASELINE | Heat, draw-up, stir, drawdown, and serve phases are tested; flame/heat-control field skill remains critical. |

Status definitions:

- PRODUCTION STRONG: software gate coverage is broad and method-specific.
- PRODUCTION BASELINE: safe and useful starting recipe, but exact device/operator validation is still important.
- REAL-WORLD VALIDATION NEEDED: guarded software baseline exists, but field data is required before stronger claims.
- NOT READY: blocked for public exposure. No current exposed method is marked this way.
