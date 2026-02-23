# AGENTS.md

## Project Context (Platform)

- This project is now shipped as an **iOS game** (embedded HTML/CSS/JS runtime inside a native iOS app).
- It is **not** a public website and is **not** a Progressive Web App going forward.
- `index.html` remains the runtime entry point for the in-app web view, but web/PWA behavior is no longer the primary product target.

## Prioritization Guidance for Future Changes

- Prioritize **iOS/mobile gameplay UX** and **touch interactions** over desktop/browser-specific polish.
- Maintain accessibility where practical (clear labels, announcements, touch target sizing), but **keyboard navigation and desktop web ergonomics are lower priority** unless explicitly requested.
- Treat PWA/service worker/update-banner/offline web concerns as legacy/secondary unless a task specifically asks to maintain them.

## Codebase Guidance

- Use the **modular runtime files** in `js/` and split CSS sources as the source of truth.
- Avoid reintroducing monolithic logic from legacy combined files unless explicitly requested.

## Developer Workflow Guidance

- Treat Xcode + the iOS app (`WKWebView`) as the primary validation path for release-affecting changes.
- Run `npm test` for deterministic JS tests and `npm run test:e2e` for gameplay flow checks when touching gameplay/save/UI flows.
- Regenerate manifests with `npm run gen:runtime` when runtime file order or manifest-managed files change.
- Use `RELEASE_CHECKLIST_IOS.md` for every TestFlight/App Store candidate (save persistence, lifecycle resume, audio, haptics, external links, diagnostics).
- Follow `docs/RUNTIME_BOUNDARIES.md` for approved extension points (state, save, UI, registries, boot/runtime).
