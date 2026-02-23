# Changelog

## 2026-02-23 - iOS Reliability / Modular Runtime Hardening (P0-P3)

This release focuses on data safety, WKWebView lifecycle reliability, and stronger modular runtime boundaries for the shipped iOS app.

### Save / Load Reliability

- Added explicit save schema versioning (`saveSchemaVersion`) and a modular migration pipeline in `js/save/*`.
- Added ordered migration registry + migration entrypoint with migration reports (including tracked repairs).
- Added strict save payload validation and future-schema mismatch handling.
- Added golden save fixtures (legacy, corrupted, and future-version cases) and deterministic migration tests.
- Moved primary save/load persistence boundary onto `StateManager.serialize()` / `StateManager.hydrate()`.
- Extracted offline save-load simulation and corrupted-save recovery UI into modular save helpers.

### iOS WKWebView Lifecycle and Native Bridge

- Added native-triggered lifecycle saves from Swift on app inactive/background/terminate transitions.
- Added JS lifecycle save bridge (`saveNowForLifecycle(reason)`) with debounce/coalescing and native callback responses.
- Added timeout/failure handling and diagnostics reporting for lifecycle save failures.
- Added WKWebView native smoke test coverage for the lifecycle save message contract.

### Boot / Runtime Parity

- Unified `file:` and module boot paths behind shared runtime boot orchestration.
- Added runtime manifest parity assertions and shared ready-event/global signals.
- Added automated `file:` bootstrap smoke test.

### Diagnostics / Production Support

- Added structured diagnostics ring buffer with categories (`BOOT`, `SAVE`, `LOAD`, `MIGRATE`, `NATIVE`, `UI`).
- Added persisted recent logs and support-friendly diagnostics export UI.
- Added corrupted-save recovery dialog actions (`Export Diagnostics`, `Start Fresh`, `Try Continue`).
- Added native WKWebView load-failure fallback UI with `Retry` + `Copy Diagnostics`.

### Testing and CI

- Added gameplay flow E2E tests (boot, hatch/adopt, care, minigame, save/reload, corrupted-save recovery).
- Added legacy monolith quarantine tests and save offline-simulation/recovery UI tests.
- Added lightweight GitHub Actions CI on push/PR:
  - `npm test`
  - `npm run gen:runtime`
  - generated manifest drift check

### Documentation / Contributor Guidance

- Added `RELEASE_CHECKLIST_IOS.md` for iOS WebView regression validation.
- Updated `README.md` and `AGENTS.md` to reflect iOS-first/WKWebView priorities.
- Added `docs/RUNTIME_BOUNDARIES.md` documenting approved extension points and anti-patterns.

### Legacy / Secondary Web Path

- Marked legacy monolith files (`js/game.js`, `js/ui.js`, `js/minigames.js`) as archived with explicit warnings.
- Added automated guardrails ensuring legacy monoliths stay out of runtime manifests and SW assets.
- Made legacy PWA/service-worker boot opt-in for local debugging (`__MLF_ENABLE_LEGACY_WEB_PWA__ = true`).
