# iOS Release Checklist (WKWebView)

Use this checklist for every App Store / TestFlight candidate. The shipping runtime is the iOS app (`WKWebView`), so browser-only validation is not sufficient.

## Release Metadata

- Date:
- Build version (`CFBundleShortVersionString` / `CFBundleVersion`):
- Git commit:
- Tester:
- Devices tested:
- iOS versions tested:

## Preflight (Required)

- Build app successfully in Xcode (`Release` configuration if applicable).
- Confirm bundled web assets were regenerated if runtime file order changed (`npm run gen:runtime`).
- Confirm automated checks pass:
  - `npm test`
  - `npm run test:e2e`
  - `xcodebuild ... build-for-testing` (or `test` if simulator/device is stable)
- Start from a clean install on at least one device/simulator.
- Confirm diagnostics export UI opens (`Export Diagnostics` / in-app diagnostics dialog).

## Save Persistence (Critical)

- New game boot -> hatch pet -> perform at least 3 care actions -> force a save.
- Kill and relaunch app; verify progress persists (pet, stats, coins, room state).
- Adopt an additional pet, save, relaunch; verify multi-pet roster persists.
- Confirm save payload still loads after an app update build over an existing install.
- Confirm corrupted save recovery dialog appears for invalid save data and offers:
  - `Export Diagnostics`
  - `Start Fresh`
  - `Try Continue`

## Background / Foreground Lifecycle (Critical)

- With active pet open, send app to background via app switcher and return:
  - no crash
  - state still present
  - timers/care state resume correctly (no obvious duplicate decay)
- Trigger interruption scenario (phone call / audio interruption simulation if available):
  - app resumes without broken UI overlays
  - save still intact
- Background app, then force-close from app switcher:
  - relaunch preserves recent actions (native lifecycle save bridge path)
- Verify no repeated error spam in diagnostics after lifecycle transitions.

## Audio Resume (WKWebView + App Lifecycle)

- Start app with sound/music enabled.
- Trigger at least one sound effect and one ambient/music cue.
- Background app and return:
  - audio resumes in correct state (enabled/disabled settings preserved)
  - no duplicate audio layers
- Open a minigame, end it, return to room:
  - room audio state restores correctly

## Haptics Bridge (Native Message Handler)

- Perform actions that should haptically confirm (egg tap, care action, reward).
- Verify no crashes if haptics are disabled in settings.
- Verify haptic events still work after background/foreground transitions.
- Check diagnostics buffer for native bridge errors (should be empty under normal use).

## External Link Handling (WKWebView Policy)

- Trigger any in-app external HTTP/HTTPS link.
- Verify link opens outside the app (system browser) and does not navigate the game `WKWebView`.
- Return to app and confirm game session remains intact.
- Verify non-HTTP local file loads still work (game boot assets, internal navigation).

## WKWebView Failure / Diagnostics UX

- Simulate or force a webview load failure (bad bundle asset, bad URL in debug build, or test hook).
- Confirm native fallback screen appears with:
  - `Retry`
  - `Copy Diagnostics`
- Confirm copied diagnostics includes error domain/code and app version info.
- Retry and verify successful recovery if issue is transient.

## Accessibility / Touch Regression Spot-Check

- Core buttons remain tappable (no clipped hit targets on supported iPhone sizes).
- Recovery dialog and diagnostics dialog are readable and dismissible.
- VoiceOver basic navigation on one critical flow (launch -> hatch -> care action) if available.

## Sign-off

- `PASS` / `FAIL`:
- Blocking issues:
- Notes / follow-up tickets:

