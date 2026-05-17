# Grind Size Roast Adjustment

Roast adjustment is a conservative software starting point.

## Direction

For grinders where higher numbers mean coarser:

- `light`: finer strong shift
- `medium_light`: finer light shift
- `medium`: baseline
- `medium_dark`: coarser light shift
- `dark`: coarser strong shift

The engine clamps output inside the source range and rounds based on grinder unit precision.

## Exactness Rules

- Numeric ranges can shift visibly by roast.
- Broad fallback bands should explain direction rather than inventing a precise number.
- Espresso remains a dial-in workflow; roast shift is only a starting point, not a shot guarantee.

## Proof Examples

The current gate checks K-Ultra, Feima/600N, DF64, unknown/fallback behavior, all target profiles, and all exposed method families.
