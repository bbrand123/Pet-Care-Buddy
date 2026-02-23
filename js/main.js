import { APP_BOOT_CONFIG } from './config/app-config.js';
import { RUNTIME_SCRIPT_FILES } from './config/runtime-manifest.js';
import { loadClassicScriptsSequentially } from './boot/runtime-loader.js';
import { initializePwa } from './boot/pwa.js';

async function bootstrap() {
  if (window.__MLF_RUNTIME_BOOTSTRAPPED__) return;
  window.__MLF_RUNTIME_BOOTSTRAPPED__ = true;

  await loadClassicScriptsSequentially(RUNTIME_SCRIPT_FILES, {
    baseUrl: import.meta.url,
    timeoutMs: APP_BOOT_CONFIG.runtime.scriptLoadTimeoutMs
  });

  initializePwa(APP_BOOT_CONFIG.pwa);
}

bootstrap().catch((err) => {
  console.error('[MLF] Bootstrap failed:', err);
  try {
    if (typeof window.dismissSplashScreen === 'function') {
      window.dismissSplashScreen({ skipMinDelay: true });
    }
  } catch (_) {}
});
