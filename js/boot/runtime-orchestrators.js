import './runtime-manifest-shared.js';
import './runtime-bootstrap-shared.js';
import {
  BASE_RUNTIME_FILES,
  GAME_RUNTIME_FILES,
  UI_RUNTIME_FILES,
  MINIGAME_RUNTIME_FILES,
  COMPETITION_RUNTIME_FILES,
  RUNTIME_SCRIPT_FILES
} from '../config/runtime-manifest.generated.js';
import { loadClassicScriptsSequentially } from './runtime-loader.js';

function getManifestHelpers() {
  const helpers = globalThis.MLFRuntimeManifestShared;
  if (!helpers) throw new Error('MLFRuntimeManifestShared is not available.');
  return helpers;
}

export function getModularRuntimeManifest() {
  const helpers = getManifestHelpers();
  const groups = {
    BASE_RUNTIME_FILES,
    GAME_RUNTIME_FILES,
    UI_RUNTIME_FILES,
    MINIGAME_RUNTIME_FILES,
    COMPETITION_RUNTIME_FILES
  };
  const manifest = helpers.normalizeManifest(groups);
  manifest.RUNTIME_SCRIPT_FILES = Array.isArray(RUNTIME_SCRIPT_FILES) ? RUNTIME_SCRIPT_FILES.slice() : [];
  return manifest;
}

export async function loadModularRuntime(options = {}) {
  const common = {
    baseUrl: options.baseUrl || import.meta.url,
    timeoutMs: options.timeoutMs
  };
  const manifest = getModularRuntimeManifest();

  let parityReport = null;
  if (options.assertRuntimeManifestParity !== false) {
    const helpers = getManifestHelpers();
    parityReport = helpers.assertRuntimeManifestParity(manifest, {
      mode: 'module',
      expectedRuntimeOrder: helpers.flattenRuntimeFiles(manifest)
    });
  }

  await loadClassicScriptsSequentially(BASE_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(GAME_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(UI_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(MINIGAME_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(COMPETITION_RUNTIME_FILES, common);

  return {
    manifest,
    runtimeScriptFiles: manifest.RUNTIME_SCRIPT_FILES.slice(),
    manifestParityReport: parityReport
  };
}
