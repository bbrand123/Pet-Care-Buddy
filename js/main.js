import { APP_BOOT_CONFIG } from './config/app-config.js';
import { loadModularRuntime } from './boot/runtime-orchestrators.js';
import { initializePwa } from './boot/pwa.js';

async function bootstrap() {
  if (window.__MLF_RUNTIME_BOOTSTRAPPED__) return;
  window.__MLF_RUNTIME_BOOTSTRAPPED__ = true;
  window.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ = false;

  await loadModularRuntime({
    baseUrl: import.meta.url,
    timeoutMs: APP_BOOT_CONFIG.runtime.scriptLoadTimeoutMs
  });
  window.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ = true;
  window.dispatchEvent(new Event('mlf:runtime-scripts-loaded'));
  window.__MLF_RUNTIME_READY__ = true;
  window.dispatchEvent(new Event('mlf:runtime-ready'));

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
