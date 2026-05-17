# Grind Size Method Compatibility

Compatibility states:

- `compatible`: usable as a starting point for the selected method.
- `caution`: usable, but needs calibration or method-specific care.
- `not_recommended`: disabled by default because the grinder-method pairing is unsafe or unverified.
- `unsupported`: missing required grinder/method context.

## Espresso

Espresso requires verified fine/espresso capability. Filter-only, coarse-only, unknown filter, and 600N platform grinders are blocked unless future evidence proves safe espresso use.

Examples:

- Baratza Encore ESP: compatible starting point, still needs real shot dial-in.
- Timemore C2: not recommended for espresso.
- Feima/Murane/Latina/Flying Eagle/Yang-Chia 600N platform: not recommended for espresso.
- Unknown grinder: no high confidence.

## Filter And Immersion

Filter methods accept medium/fine-capable grinders. French Press and Cold Brew prefer coarse-capable grinders. Espresso-only grinders should remain caution for coarse/filter work when no coarse range is known.

## Moka

Moka uses fine-capable grinders but must not push users toward espresso-powder settings. UI copy should warn against too-fine bitter/stalled brews.
