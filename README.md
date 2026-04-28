# 🐾 My Little Friend

A virtual pet game built with vanilla JavaScript, HTML, and CSS.

This project now ships as a **native web app** hosted from static assets (for example via **Cloudflare Pages**). The runtime entry point is `index.html`.

## 🎮 Features

- 13 pet types with growth stages (Baby → Child → Adult)
- Multi-pet household saves with active-pet switching
- Core needs system (hunger, cleanliness, happiness, energy)
- Day/night + weather + seasons
- Background pet autonomy and relationship simulation
- Mini-games, room bonuses, garden system, unlockables, codex, and achievements

## 🧱 Runtime Architecture

Production runtime boots through a single ES module entry:

- `index.html` → `js/main.js`
- `js/main.js` → modular orchestrators in `js/boot/runtime-orchestrators.js`
- `js/config/runtime-manifest.generated.js` controls ordered runtime loading

Legacy monolith files (`js/game.js`, `js/ui.js`, `js/minigames.js`) are not loaded in production.

## 🚀 Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start a static server from the repo root:
   ```bash
   python3 -m http.server 4173
   ```
3. Open:
   - `http://localhost:4173/index.html`

## ☁️ Cloudflare Pages Deployment

### Option A: Dashboard

1. Push this repository to GitHub/GitLab.
2. In Cloudflare Dashboard, create a **Pages** project from that repo.
3. Use the following build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `.`
4. Deploy.

### Option B: Wrangler CLI

```bash
npm install
npx wrangler pages deploy . --project-name <your-project-name>
```

If the project name does not exist yet, create it first in Cloudflare Pages.

## ✅ Validation

- Unit/integration tests:
  ```bash
  npm test
  ```
- Gameplay E2E checks:
  ```bash
  npm run test:e2e
  ```
- Runtime manifest regeneration (when runtime ordering changes):
  ```bash
  npm run gen:runtime
  ```

## 📁 Useful Files

- `index.html`: runtime entrypoint
- `_redirects`: Cloudflare/SPA route fallback
- `_headers`: Cloudflare security/cache headers
- `manifest.json`: installable web app metadata
- `sw.js` + `sw-assets.generated.js`: service worker and generated precache list

