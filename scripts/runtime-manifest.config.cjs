const path = require('path');

const BASE_RUNTIME_FILES = [
  './version.js',
  './utils.js',
  './balance.js',
  './eventbus.js',
  './state.js',
  './state/migrations.js',
  './sim/relationships.js',
  './sim/autonomy.js',
  './sim/household-simulator.js',
  './state/household-state.js',
  './diagnostics/error-buffer.js',
  './diagnostics/diagnostics-ui.js',
  './save/schema.js',
  './save/migrations/v0-to-v1.js',
  './save/migrations/v1-to-v2.js',
  './save/migrations/v2-to-v3.js',
  './save/migrations/v3-to-v4.js',
  './save/migrations/registry.js',
  './save/migrate.js',
  './save/lifecycle-bridge.js',
  './save/offline-simulation.js',
  './save/recovery-ui.js',
  './constants.js',
  './retention/strings.js',
  './retention/telemetry.js',
  './retention/experiments.js',
  './retention/personalization.js',
  './retention/visible-rewards.js',
  './retention/reward-effects.js',
  './retention/seasonal_journey.js',
  './retention/comeback-quests.js',
  './retention/reminders.js',
  './native/notifications.js',
  './retention/journey.js',
  './registries/content-registries.js',
  './content-packs.js',
  './data/packs/starter-packs.js',
  './garden-features-core.js',
  './modal-manager.js',
  './svg.js',
  './audio/audio-manager.js',
  './ui/phase2-preload.js'
];

const GAME_RUNTIME_FILES = [
  './core.js',
  './exploration.js',
  './domain/economy/economy-calculations.js',
  './economy.js',
  './achievements.js',
  './personality.js',
  './breeding.js',
  './growth.js',
  './weather.js',
  './rooms.js',
  './garden.js',
  './decay.js',
  './caretaker.js'
];

const UI_RUNTIME_FILES = [
  './ui/rendering.js',
  './ui/emotional-feedback.js',
  './ui/actions.js',
  './ui/notifications.js',
  './ui/animations.js',
  './ui/modals.js',
  './ui/furniture.js',
  './ui/breeding.js',
  './ui/economy.js',
  './ui/exploration.js',
  './ui/settings.js',
  './ui/phase2-managers.js'
];

const MINIGAME_RUNTIME_FILES = [
  './registries/minigame-registry.js',
  './config/minigame-descriptors.js',
  './minigames/framework.js',
  './minigames/fetch.js',
  './minigames/hideseek.js',
  './minigames/bubblepop.js',
  './minigames/matching.js',
  './minigames/simonsays.js',
  './minigames/coloring.js',
  './minigames/racing.js',
  './minigames/cooking.js',
  './minigames/fishing.js',
  './minigames/rhythm.js',
  './minigames/slider.js',
  './minigames/trivia.js',
  './minigames/runner.js',
  './minigames/tournament.js',
  './minigames/coop.js'
];

const COMPETITION_RUNTIME_FILES = ['./competition.js'];

const RUNTIME_BOOT_FILES = [
  './js/main.js',
  './js/boot/runtime-loader.js',
  './js/boot/runtime-manifest-shared.js',
  './js/boot/runtime-bootstrap-shared.js',
  './js/boot/runtime-orchestrators.js',
  './js/boot/file-runtime-bootstrap.js',
  './js/boot/pwa.js',
  './js/config/app-config.js',
  './js/config/runtime-manifest.generated.js',
  './js/config/runtime-manifest.classic.generated.js'
];

const ROOT_STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './apple-touch-icon.svg',
  './icon-192.png',
  './icon-192.svg',
  './icon-192-maskable.svg',
  './icon-512.png',
  './icon-512.svg',
  './icon-512-maskable.svg'
];

const EXTRA_STATIC_FILES = [
  './assets/audio/audio-manifest.json',
  './assets/audio/audio-credits.json',
  './assets/audio/CREDITS-AUDIO.md'
];

const SCAN_DIRS = ['css', 'assets', 'js/data'];

const EXCLUDE_ASSET_PATHS = new Set([
  'js/game.js',
  'js/ui.js',
  'js/minigames.js',
  'js/config/runtime-manifest.js'
]);

module.exports = {
  repoRoot: path.resolve(__dirname, '..'),
  BASE_RUNTIME_FILES,
  GAME_RUNTIME_FILES,
  UI_RUNTIME_FILES,
  MINIGAME_RUNTIME_FILES,
  COMPETITION_RUNTIME_FILES,
  RUNTIME_BOOT_FILES,
  ROOT_STATIC_FILES,
  EXTRA_STATIC_FILES,
  SCAN_DIRS,
  EXCLUDE_ASSET_PATHS
};
