# Grinder Catalog Confidence Policy

BaristaChaw treats grinder data as a starting-point catalog, not a physical calibration guarantee.

## Confidence Levels

- `official`: public manufacturer or official chart is present. This can still need burr-zero and dose calibration.
- `community_verified`: repeated public/community references exist, but not enough to call it official.
- `curated`: BaristaChaw curated a practical baseline from public references or catalog bands.
- `dataset_unverified`: local/user dataset only. Keep confidence low unless a public source or calibration log is added.
- `fallback`: no grinder-specific reference. Show broad method band and calibration warning.

## Promotion Rules

- Do not promote `dataset_unverified` to `curated`, `community_verified`, or `official` without source URLs or calibration evidence.
- Do not claim exact espresso compatibility without fine/espresso evidence.
- Do not show high confidence for fallback or dataset-unverified grinder output.
- Numeric settings are always starting points. Real dial-in depends on burr zero, burr alignment, burr seasoning, coffee age, dose, water, and technique.

## Release Gate

Run:

```bash
npm run catalog:audit:grinders
npm run test:grinder-catalog:coverage
npm run test:grind-size:matrix
```

The coverage gate writes artifacts to `artifacts/grinder-catalog-audit/<sha>/`.
