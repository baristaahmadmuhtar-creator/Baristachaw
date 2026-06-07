# AI Brew AeroPress Bypass Report

Generated: 2026-06-07T15:31:03.133Z
Branch: main
SHA: eaa616f7e89dd1afd9892c0c39b960a13a328184

## Scope

AeroPress measured bypass software audit across 12 real-world bean archetypes, 5 roast levels, 8 taste targets, multiple manual water profiles, and mixed grinder confidence contexts.

## Results

- Cases: 480
- Passed: 480
- Failed: 0
- Average score: 100
- Artifact directory: `artifacts/ai-brew-audit/aeropress-bypass/eaa616f7e89d`

## Production Rules Verified

- Brew water passes through AeroPress chamber.
- Bypass water is added in the cup after pressing only.
- Final ratio is calculated from total drink water divided by dose.
- Concentrate ratio is calculated from brew water divided by dose.
- Target profiles shift bypass percentage, finish window, final ratio, and agitation guidance.
- Workflow guide rejects pour-over language such as drawdown, final pour, flat bed, filter wall, V60, and bloom pour.

## Known Limits

- This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.
- The matrix uses source-backed archetypes and realistic input profiles, but it does not replace cupping logs from actual AeroPress brews.

Final verdict: PASS_SOFTWARE_READY_REAL_BREW_VALIDATION_REQUIRED
