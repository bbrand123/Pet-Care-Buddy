import {
  BASE_RUNTIME_FILES,
  GAME_RUNTIME_FILES,
  UI_RUNTIME_FILES,
  MINIGAME_RUNTIME_FILES,
  COMPETITION_RUNTIME_FILES
} from '../config/runtime-manifest.generated.js';
import { loadClassicScriptsSequentially } from './runtime-loader.js';

export async function loadModularRuntime(options = {}) {
  const common = {
    baseUrl: options.baseUrl || import.meta.url,
    timeoutMs: options.timeoutMs
  };

  await loadClassicScriptsSequentially(BASE_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(GAME_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(UI_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(MINIGAME_RUNTIME_FILES, common);
  await loadClassicScriptsSequentially(COMPETITION_RUNTIME_FILES, common);
}
