# Economy Hardening Notes (Modular Runtime)

This note covers new/updated persistent economy state used by the modular runtime hardening pass.

## New / Updated Persistent State

### `gameState.economy.auction`

- `relistTracker`:
  Tracks per-item relist activity (`<itemType>:<itemId>`) for listing-fee escalation.
  Each entry stores `{ lastAt, count }` and resets after the configured relist window.

- `auctionEarningsPending`:
  Internal escrow accumulator for claim processing. Used so claim flows can account for value before clearing auction wallets.

- `auctionEarningsWithheld`:
  Coin value withheld by rate-limit/suspicious payout guards during auction claim.
  Value is preserved (not silently burned) and retried on later claims.

- `auctionEarningsLastClaimResult`:
  UI-neutral result surface for the latest claim attempt (requested, credited, withheld, guard multipliers, timestamp).

- `lastTrustedNowMs`:
  Frozen auction/economy timestamp anchor used when the save is suspicious to prevent clock-based rotation/expiry manipulation.

- `auctionIdentityMigrationDone`:
  One-time guard so legacy auction listing/wallet identity migration is not repeatedly applied.

### `gameState.economy.market.rare`

- `marketDayKey`:
  Hardened rotation key (`day:season:weather`) for the rare market offer set.

- `generatedForDay`:
  Indicates whether the day's rare market was already generated.
  Prevents same-day regeneration after buyout.

- `offers`:
  Persisted rare offers with `purchased` flags. Same-day reopen reuses this array even when all offers are purchased.

- `lastTrustedDayKey`:
  Last non-suspicious day key used to freeze daily rotations while the save is suspicious.

## Auction Storage (`STORAGE_KEYS.auctionHouse`)

Auction-house local storage now preserves/uses these listing fields when present:

- `sellerProfileId` (stable profile/player identity)
- `sellerPlayerId` (legacy alias preserved for compatibility)
- `expiresAt`
- `expiredAt`
- `status` (`active` / `expired`)
- `relistKey`
- `relistCount`

Auction storage root also supports:

- `profileWallets` (preferred seller proceeds wallet keyed by stable profile id)
- `wallets` (legacy slot wallet, still read/migrated)

## Rotation / Time Hardening Rules

- Dynamic economy price volatility and rare-market daily rotations use a hardened day key.
- If `getTodayStringWithTimeHardening()` exists, modular economy uses it.
- Otherwise, modular economy freezes to `economy.market.rare.lastTrustedDayKey` while `gameState.security.suspicious === true`.
- Rare market generation is once per hardened day key:
  first open generates offers, later opens reuse persisted offers (including an empty post-buyout state).

## Monolith Parity Notes (No Edits Made)

- `js/game.js` already contains a more advanced auction identity/profile-wallet path.
- Modular `js/economy.js` now mirrors the core protections:
  stable seller identity checks, suspicious auction lock enforcement, relist escalation, and profile-wallet claim routing.
- Some monolith-only helpers (full time hardening internals and broader UI affordances) remain outside the modular file; modular fallback freezes rotations using the suspicious flag when those helpers are unavailable.
