# 🐾 My Little Friend

A virtual pet game built with vanilla JavaScript, HTML, and CSS, shipped primarily as an **iOS app** with an embedded `WKWebView` runtime.

## 🎮 Features

### Core Gameplay
- **13 Pet Types**: Dogs, cats, bunnies, birds, hamsters, turtles, fish, frogs, hedgehogs, pandas, penguins, unicorns 🦄, and dragons 🐉
- **Multi-Pet Household**: Keep multiple pets in one household save with a player-selected active pet
- **Growth System**: Pets grow from Baby → Child → Adult based on care actions
- **4 Core Needs**: Hunger, Cleanliness, Happiness, Energy
- **Dynamic Day/Night Cycle**: Real-time based with mood effects
- **Weather & Seasons**: Affects pet mood and gameplay bonuses
- **Background Pet Autonomy**: Non-active pets eat, sleep, play, socialize, and idle on their own
- **Persistent Offline Progress**: Household simulation catches up deterministically after app restarts/resume
- **Pet Relationships**: Pets build familiarity/affinity over time and can become friends or rivals

### Customization
- **4 Egg Types**: Different eggs hint at what pet will hatch (furry, feathery, scaly, magical)
- **Color Picker**: Choose from 5 colors per pet type
- **4 Patterns**: Solid, Spotted, Striped, Patchy
- **Accessories**: Hats, bows, collars, glasses, costumes
- **Furniture**: Customize beds and decorations in bedroom, kitchen, and bathroom
- **Text-to-Speech**: Hear your pet's name spoken aloud

### Activities
- **6 Rooms**: Bedroom, Kitchen, Bathroom, Backyard, Park, Garden
- **Room Bonuses**: Each room gives +30% bonus to specific actions
- **6 Mini-Games**: Fetch, Hide & Seek, Bubble Pop, Matching, Simon Says, Coloring
- **Garden System**: Plant, water, and harvest crops to feed your pet

### Progression
- **Mythical Unlocks**: Raise adult pets to unlock unicorns (2 adults) and dragons (3 adults)
- **Pet Codex**: Discover and collect all pet species
- **Stats Tracking**: View detailed statistics and achievements

## 📁 Project Structure (Current Runtime)

The shipped runtime (including the iOS app web view) boots through a single ES module entry:

- `index.html` -> `js/main.js` (only production script tag)
- `js/main.js` -> bootstraps modular runtime groups via `js/boot/runtime-orchestrators.js`
- `js/config/runtime-manifest.generated.js` -> generated ordered runtime file manifest
- `sw.js` + `sw-assets.generated.js` -> generated legacy web/PWA precache manifest (secondary)

Key runtime areas:

- `js/core.js` + extracted game-domain files (`js/economy.js`, `js/garden.js`, `js/decay.js`, etc.)
- `js/sim/*` + `js/state/household-state.js` (deterministic household simulation, autonomy, relationship logic, legacy state sync bridge)
- `js/ui/*` (rendering, actions, notifications, modals, settings, feature modules)
- `js/minigames/framework.js` + `js/minigames/*` implementations
- `js/registries/*` (minigame descriptors, content-pack application registries)
- `js/content-packs.js` (pack validation/queries) + `js/data/packs/*` (pack data)

## 🚀 Getting Started

### Primary: iOS App Development (WKWebView)
1. Open `My Little Friend/My Little Friend.xcodeproj` in Xcode
2. Build/run the `My Little Friend` app on an iPhone simulator or device
3. Validate gameplay and lifecycle behavior in the app (background/foreground, audio, save persistence)

### Secondary: Browser Runtime (Local Dev)
1. Clone the repository
2. Start a local HTTP server (for module boot and legacy service worker support), for example:

```bash
python3 -m http.server 4173
```

3. Open `http://localhost:4173`

No bundler is required.

Legacy PWA/service-worker behavior is now opt-in for local debugging only. To enable it, set `window.__MLF_ENABLE_LEGACY_WEB_PWA__ = true` before `js/main.js` loads (for example in a temporary local test page).

### Legacy Web Demo (Optional / Secondary)
If you maintain a web demo build, GitHub Pages can still be used (`https://[your-username].github.io/My-Little-Friend/`), but it is not the primary shipping target.

## 🛠️ Development

### iOS-First Workflow (Required Mindset)

- Optimize for touch interactions and `WKWebView` lifecycle reliability first.
- Treat browser-only polish, keyboard ergonomics, and PWA behavior as secondary unless the task explicitly requires them.
- Run the iOS regression checklist in `RELEASE_CHECKLIST_IOS.md` for release candidates.
- Prefer validating save/load, lifecycle suspend/resume, audio resume, and native bridge paths on iOS before browser polish.
- Follow approved runtime boundaries/extension points in `docs/RUNTIME_BOUNDARIES.md` when adding new systems.

### Runtime Architecture Notes

- `js/game.js`, `js/ui.js`, and `js/minigames.js` are legacy monoliths and are not loaded in production.
- Runtime load order is centralized in generated manifests, not HTML script-tag order.
- `StateManager` is the real state write/event path via a proxied `gameState` root and emits structured state events (`state:changed`, `state:replaced`) through `EventBus`.
- Household background simulation is implemented as pure modules in `js/sim/*` and synchronized with existing runtime state via `js/state/household-state.js`.
- Current saves maintain legacy `pets` / `pet` / `activePetIndex` compatibility while also storing `household` (`petsById`, `activePetId`, relationships, `lastSimulatedAt`, `simVersion`).
- Retention/Journey runtime state is stored in `journeyRetention` (chapter-local baselines/deltas, streak claim metadata, Journey tokens/bond) and migrated through `js/save/migrations/*`.
- Minigame metadata lives in `js/config/minigame-descriptors.js` and is registered through `js/registries/minigame-registry.js`.
- Content packs apply through `js/registries/content-registries.js` instead of mutating global registries directly in the pack loader.
- Extension-point and boundary guidance for contributors lives in `docs/RUNTIME_BOUNDARIES.md`.

### Regenerating Runtime / Legacy Web Manifests

```bash
npm run gen:runtime
```

This regenerates:

- `js/config/runtime-manifest.generated.js`
- `sw-assets.generated.js` (legacy web/PWA support)

### Retention Flags (P0 rollout)

Runtime retention flags live in `RETENTION_FEATURE_FLAGS` in `js/constants.js` and can be overridden in the dev admin panel (`?dev=true`):

- `journeyEnabled` (default `true`)
- `seasonalJourneyEnabled` (default `false`, scaffold for P2)
- `telemetryCaptureEnabled` (default `true`, local queue + funnel snapshots)
- `telemetryUploadEnabled` (default `false`, production-safe by default)
- `telemetryEndpoint` (default `''`)
- `pacingV2Enabled` (default `false`, reserved for P1 tuning rollout)
- `reminderPrioritizationV2Enabled` (default `false`, reserved for P1)
- `comebackQuestsEnabled` (default `true`, P2 comeback quest generation + HUD/reminder hooks)
- `journeyTokenStoreRotationEnabled` (default `true`, P2 rotating weekly Journey token store stock)
- `householdRetentionBeatsEnabled` (default `true`, P2 household sim retention alerts)
- `personalizationEnabled` (default `true`, P3 player-style classification + tailored prompts)
- `rewardMomentEffectsEnabled` (default `true`, P3 non-blocking reward haptics/animation sequencing)
- `experimentsEnabled` (default `false`, reserved for P3)

### Retention P1 Tuning (flag-gated)

When `RETENTION_FEATURE_FLAGS.pacingV2Enabled` is enabled, runtime pacing helpers read from `RETENTION_P1_TUNING` in `js/constants.js`:

- `growthThresholds.child|adult|elder`
  - `actionsNeeded`
  - `hoursNeeded`
- `journeyRewardPacing`
  - `objectiveComplete`
  - `chapterComplete`
  - `dailyComplete`
  - `noveltyUnlock`
  - `backlog`
    - `tokenPerMissedDay`
    - `dripLogins`
    - `maxBufferedMissedDays`
    - `minAwayDaysForBacklog`
- `noveltyUnlockCadence`
  - `earlyUnlockSpacingDays`
  - `weeklySpikeWeightBoost`
- `reminderCenter`
  - `lowValueDemoteAgeHours`
  - `maxHighPriorityPinned`

`RETENTION_FEATURE_FLAGS.reminderPrioritizationV2Enabled` enables the reminder-center sorting/prioritization logic while keeping notifications optional (players who decline native notifications still receive in-game reminder center items).

### Retention P2 Modules (Seasonal / Comeback / Household)

- `js/retention/seasonal_journey.js`
  - Weekly rotating seasonal chapter loop (season-aware objectives + reward track)
  - Admin seed APIs:
    - `adminSeedSeasonalWeeklyStock(weekKey, items)`
    - `adminSeedSeasonalLimitedRewards(items)`
- `js/retention/comeback-quests.js`
  - Crafts comeback quests from `awayDays + lastActivity`
  - Hooks into HUD emotional prompts and reminder center actions (`comeback`)
- `js/retention/journey.js`
  - Rotating Journey token store inventory with weekly stock and limited sinks
  - Admin/QA helpers:
    - `getJourneyTokenStoreInventory()`
    - `rotateJourneyTokenStoreStock({ weekKey?, force? })`
    - `adminSeedJourneyTokenStoreWeek(weekKey, items)`
    - `adminSeedJourneyLimitedRewards(items)`
- `js/sim/household-simulator.js` + `js/state/household-state.js`
  - Emits relationship/mood retention beats and converts them into reminder-center household alerts with one-tap follow-up actions

### Retention P3 Modules (Personalization / Reward Presence / Experiments)

- `js/retention/personalization.js`
  - Classifies play style (`care-focused`, `collector`, `explorer`, `breeder`)
  - Persists `playerProfile.style` + confidence and tailors emotional prompts/Journey suggestions
- `js/retention/visible-rewards.js`
  - Permanent visible reward catalogs (room props, idle animations, emotes, ambient variants, photo frames)
  - Summary API for HUD/Journey modal representation
- `js/retention/reward-effects.js`
  - Non-blocking reward moment sequencing (fast haptics + UI animation pulses)
  - Uses iOS native `window.webkit.messageHandlers.haptics` bridge when available
- `js/retention/experiments.js`
  - Deterministic A/B assignments, local dev overrides, and tuning override hooks
  - Feeds `getRetentionP1Tuning()` when `experimentsEnabled` is on

### Save Migration Notes (Journey Retention v4)

- Save schema is now `v4` (`saveSchemaVersion: 4`).
- `v3 -> v4` adds `journeyRetention` with chapter-local state.
- Migration intentionally initializes per-chapter progress as safe baselines/deltas and does not auto-complete future chapters retroactively.
- Older saves without `journeyRetention` are normalized during load and persisted on next save.
- P2/P3 runtime state (`journeyRetention.tokenStore`, `journeyRetention.seasonal`, `meta.householdRetentionAlerts`, `meta.reactivation.comebackQuest`, `meta.retentionUnlocks`, `playerProfile`) is lazily initialized and preserved by the v4 normalizer (no schema bump required).

### Adding New Features

**Add a New Pet Type:**
1. Add entry to `PET_TYPES` in `constants.js`
2. Create SVG generator in `svg.js`
3. Add to appropriate egg type

**Add a New Room:**
1. Add to `ROOMS` in `constants.js`
2. Define background colors and bonuses
3. Add navigation button in `generateRoomNavHTML()`

**Add a New Mini-game:**
1. Add metadata descriptor in `js/config/minigame-descriptors.js`
2. Add implementation file in `js/minigames/`
3. Register start logic in `js/minigames/framework.js` dispatcher
4. Regenerate manifests with `npm run gen:runtime`

## 🎨 Customization

### Modify Colors
Edit color variables in `css/style.css`:
```css
:root {
    --color-primary: #FF6B9D;
    --color-secondary: #4ECDC4;
    --color-accent: #FFE66D;
}
```

### Add New Accessories
Add to `ACCESSORIES` object in `constants.js`:
```javascript
newAccessory: {
    name: 'Accessory Name',
    emoji: '🎀',
    type: 'hat|bow|collar|glasses|costume',
    position: 'top|head|neck|eyes|body'
}
```

Then add rendering logic in `generateAccessoryOverlay()` in `svg.js`.

## 📱 Browser Coverage (Local Dev / Secondary)

Browser validation is primarily for local development and debugging. Shipping quality is determined by iOS app (`WKWebView`) behavior.

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## ♿ Accessibility

- WCAG AA color contrast compliance
- Screen reader support with ARIA labels
- Touch targets minimum 48px
- Touch-first interaction validation in iOS layouts
- Keyboard navigation support where practical (secondary to touch UX unless requested)
- Reduced motion support

## 📊 Performance

- **Initial Load**: < 500KB total
- **First Paint**: Fast (minimal HTML)
- **WKWebView Runtime Reliability**: Save/load and lifecycle resume correctness are prioritized
- **Browser Caching**: CSS/JS cached separately (secondary web path)
- **LocalStorage**: Game saves automatically

## 🧪 Tests

Run fast deterministic Node tests:

```bash
npm test
```

Run browser E2E gameplay flows (touch-oriented):

```bash
npm run test:e2e
```

Run iOS app build/test checks (Xcode / `xcodebuild`) for `WKWebView` and native bridge coverage before release.

Retention/TestFlight manual checks for the P0 overhaul are documented in:

- `docs/retention-p0-what-to-test.txt`

## 🤖 CI

GitHub Actions runs lightweight validation on every push and pull request:

- `npm test`
- `npm run gen:runtime`
- generated-manifest drift check (`git diff --exit-code` for runtime/SW manifest outputs)

This CI lane is intentionally lightweight and does not replace iOS simulator/device validation or the checklist in `RELEASE_CHECKLIST_IOS.md`.

Coverage includes:

- Garden systems (existing)
- Household simulation (autonomy, relationships, deterministic catch-up)
- StateManager proxy/event behavior
- Economy payout calculations
- Minigame descriptor registry validation
- Content-pack registry application
- Generated runtime/SW manifest smoke checks

For iOS release candidates (WKWebView runtime), use the manual regression checklist before TestFlight/App Store submission:

- `RELEASE_CHECKLIST_IOS.md`

## 🚢 iOS Release Validation

The shipping product is the native iOS app embedding this runtime in `WKWebView`. Browser checks are useful for local development, but they do not replace iOS lifecycle and bridge validation.

- Run the checklist in `RELEASE_CHECKLIST_IOS.md` for every release candidate.
- Prioritize save persistence, background/foreground resume, audio resume, haptics bridge, and external link handling.

## 🔄 Migration Notes

- Save storage key remains `myLittleFriend` (existing saves should continue to load).
- Save payloads include explicit `saveSchemaVersion` and are upgraded through ordered migrations.
- Current save schema (`v2`) adds a persistent `household` object used for multi-pet background simulation and offline catch-up.
- Legacy single-pet / older multi-pet saves are migrated into the household format while keeping compatibility fields used by existing runtime/UI code.
- `StateManager` now emits real structured events through `EventBus`; listeners can subscribe to `state:changed` / `state:replaced`.
- Production and `test.html` now boot via `js/main.js`; custom scripts/tests that depended on HTML script order should wait for `window.__MLF_RUNTIME_READY__` or the `mlf:runtime-ready` event.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

Built with ❤️ using vanilla JavaScript - no frameworks, just pure web technologies!

---

**Tip**: Press `📖 Codex` to view all pet species and track your collection progress!
