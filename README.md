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

### Troubleshooting: seeing "Hello World" on Cloudflare

If your Cloudflare URL still shows a generic **Hello World** page, Cloudflare is usually serving a default Worker or the wrong project output instead of this repo's `index.html`.

Fix checklist:

1. In **Pages → Settings → Builds & deployments**, confirm:
   - Framework preset: `None`
   - Build command: *(empty)*
   - Build output directory: `.`
2. In **Workers & Pages**, make sure no Worker route is attached to the same custom domain/path that would override the Pages project.
3. Redeploy the latest commit from the correct branch.
4. If using CLI, deploy from repo root so static assets are uploaded:

```bash
npx wrangler pages deploy . --project-name <your-project-name>
```

This repo now includes `wrangler.toml` with `pages_build_output_dir = "."` to make the correct Pages output directory explicit for CLI-driven deploys.

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

