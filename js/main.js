import { APP_BOOT_CONFIG } from './config/app-config.js';
import './boot/runtime-manifest-shared.js';
import './boot/runtime-bootstrap-shared.js';
import { loadModularRuntime } from './boot/runtime-orchestrators.js';
import { initializePwa } from './boot/pwa.js';

async function bootstrap() {
  const shared = globalThis.MLFRuntimeBootstrapShared;
  if (!shared || typeof shared.runRuntimeBoot !== 'function') {
    throw new Error('MLFRuntimeBootstrapShared is unavailable.');
  }

  await shared.runRuntimeBoot({
    global: window,
    bootPath: 'module',
    assertRuntimeManifestParity: APP_BOOT_CONFIG.runtime.assertManifestParity !== false,
    loadRuntimeScripts: ({ assertRuntimeManifestParity }) => loadModularRuntime({
      baseUrl: import.meta.url,
      timeoutMs: APP_BOOT_CONFIG.runtime.scriptLoadTimeoutMs,
      assertRuntimeManifestParity
    }),
    onReady() {
      initializePwa(APP_BOOT_CONFIG.pwa);
    }
  });
}

bootstrap().catch((err) => {
  console.error('[MLF] Bootstrap failed:', err);
});
