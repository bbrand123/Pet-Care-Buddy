# Runtime Boundaries and Approved Extension Points

This project ships as a **web app** from static assets (for example Cloudflare Pages). To keep save/load behavior reliable and the modular runtime maintainable, new features should plug into approved extension points instead of patching global runtime behavior ad hoc.

## Core Boundaries (What Owns What)

### State and Persistence

- `js/state.js` (`StateManager`) is the canonical state mutation/event/save serialization boundary.
- `js/core.js` orchestrates gameplay flow and high-level boot/load/save behavior.
- `js/save/*` owns save schema validation, migrations, lifecycle save bridging, offline load simulation, and recovery UI helpers.

Approved patterns:
- Add save payload fields through `StateManager` state shape updates and save migration modules (`js/save/migrations/*`).
- Use `StateManager.serialize()` / `StateManager.hydrate()` for persistence interactions.
- Add migration steps through the ordered registry in `js/save/migrations/registry.js` (with unit tests + fixtures).

Avoid:
- Writing directly to `localStorage` from feature modules.
- Mutating save payload shape in unrelated UI code.
- Silent repair logic in random boot paths that bypasses migration reporting.

### UI Rendering and Interaction

- `js/ui/*` modules own UI rendering, action wiring, notifications, modals, and screen behavior.
- `js/diagnostics/*` owns diagnostics collection/export UI.
- `js/save/recovery-ui.js` owns corrupted-save recovery dialog rendering/wiring.

Approved patterns:
- Add UI features in `js/ui/*` and call existing domain/state functions.
- Use diagnostics APIs (`MLFDiagnostics`, `MLFDiagnosticsUI`) for support/reporting flows.

Avoid:
- Embedding large HTML modal strings directly in `js/core.js` for new features.
- Cross-cutting UI side effects inside save/migration modules.

### Gameplay Domain Logic

- Domain systems live in dedicated modules (`js/economy.js`, `js/garden.js`, `js/decay.js`, `js/growth.js`, etc.).
- Minigame metadata registration lives in `js/config/minigame-descriptors.js` + `js/registries/minigame-registry.js`.
- Minigame implementations live in `js/minigames/*` and dispatch through `js/minigames/framework.js`.

Approved patterns:
- Put reusable calculations in domain modules and keep UI modules thin.
- Register new minigames through descriptors + framework dispatcher + runtime manifest generation.

Avoid:
- Adding new gameplay systems to legacy monoliths (`js/game.js`, `js/ui.js`, `js/minigames.js`).
- Hardcoding new feature registration in multiple files without a registry boundary.

### Content Packs and Registries

- Content pack application flows through `js/registries/content-registries.js`.
- Pack definitions live in `js/data/packs/*`.

Approved patterns:
- Extend registries first, then apply pack data through registry adapters.
- Validate pack shape before mutating runtime state/registries.

Avoid:
- Pack loaders mutating globals directly without registry validation.

### Boot and Runtime Loading

- Boot orchestration is shared across module and `file:` paths via `js/boot/runtime-bootstrap-shared.js`.
- Runtime order is generated (`js/config/runtime-manifest.generated.js` and classic variant).

Approved patterns:
- Add new runtime modules to `scripts/runtime-manifest.config.cjs` and regenerate manifests with `npm run gen:runtime`.
- Use the shared runtime ready signals (`window.__MLF_RUNTIME_READY__`, `mlf:runtime-ready`).

Avoid:
- Adding production script tags manually to `index.html` (outside the supported boot entries).
- Depending on script load order not represented in generated manifests.

## Legacy / Secondary Paths

- Legacy monoliths are archived references and must not be used for production changes.
- Service worker / PWA work is optional and should be maintained only when required for web distribution goals.

## Change Checklist for New Features

- Added/updated modular runtime files only (no legacy monolith dependency).
- Added tests for new modules and edge cases.
- Regenerated runtime manifests if load order changed (`npm run gen:runtime`).
- Considered save schema/migration impact.
- Considered diagnostics logging, mobile touch ergonomics, and browser compatibility where relevant.
