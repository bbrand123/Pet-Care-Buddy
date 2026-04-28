# Web Release Checklist (Cloudflare Pages)

Use this checklist for production web deployments.

## Build + Runtime

- [ ] `npm test` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run gen:runtime` has been run if runtime ordering/files changed.
- [ ] No unexpected diffs in `js/config/runtime-manifest.generated.js` or `sw-assets.generated.js`.

## Browser Validation

- [ ] Fresh load on mobile Safari.
- [ ] Fresh load on mobile Chrome.
- [ ] Fresh load on desktop Chrome/Firefox/Safari.
- [ ] Save/load persistence survives tab close + browser restart.
- [ ] Audio initializes on first user interaction.
- [ ] Touch interactions and target sizing feel correct on phones.

## PWA / Caching (if enabled)

- [ ] `manifest.json` loads successfully.
- [ ] Service worker installs/updates without broken stale asset state.
- [ ] Offline fallback behavior is acceptable.

## Cloudflare Pages

- [ ] Deploy preview URL loads `index.html` correctly.
- [ ] Deep links route to `index.html` (verify `_redirects` behavior).
- [ ] Headers are served as expected from `_headers`.
- [ ] Production domain health check complete.
