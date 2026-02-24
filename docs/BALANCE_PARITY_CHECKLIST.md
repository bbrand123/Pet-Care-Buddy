# Balance Parity Checklist (Modular Runtime vs `js/game.js`)

Use this before shipping balance changes in the modular runtime.

## Economy

- `js/economy.js` reward sources all route through shared `addCoins()` hardening (rate-limit + debt repayment + telemetry).
- `js/economy.js` loot sell pricing matches current modifiers:
  - base sell multiplier
  - expedition provenance multiplier
  - wealth-pressure debt resale penalty
  - suspicious/tamper penalty (if security state exists)
- `js/economy.js` `awardMiniGameCoins()` and `js/domain/economy/economy-calculations.js` use the same payout curve / difficulty clamp.

## Garden

- `js/garden.js` harvest path honors crop `harvestYield` for:
  - inventory increments
  - coin rewards
  - `totalHarvests` progression
- Garden expansion state exists in saves (`garden.expansionTier`) and is migrated in `js/core.js`.
- UI exposes next expansion requirements/cost and can purchase the tier.

## Exploration

- `js/exploration.js` treasure hunts use `TREASURE_HUNT_BALANCE` for:
  - global cooldown
  - energy cost
  - repeat/swap penalties
- `js/exploration.js` expeditions use `EXPEDITION_BALANCE` for:
  - upkeep cost
  - loot roll diminishing
  - rarity weighting
- Loot inventory provenance metadata (`lootInventoryStacks`) is preserved for expedition/treasure sources.

## Daily Reset / Session

- `js/achievements.js` daily rollover applies coin decay and wealth-pressure fee.
- Session-local reward counters reset on load/background (`_sessionMinigameCount`, coin gain minute/session windows).

## Regression Checks

- Run `node --test tests/balance-regressions.test.js`
- Run `node --test tests/economy-calculations.test.js tests/garden-features.test.js`
- Run `npm run test:e2e` when touching UI reward loops / save flows
