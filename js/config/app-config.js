const LEGACY_WEB_PWA_OPT_IN = typeof globalThis !== 'undefined'
  && globalThis.__MLF_ENABLE_LEGACY_WEB_PWA__ === true;

export const APP_BOOT_CONFIG = Object.freeze({
  runtime: {
    scriptLoadTimeoutMs: 15000,
    assertManifestParity: true
  },
  pwa: {
    enabled: LEGACY_WEB_PWA_OPT_IN,
    serviceWorkerUrl: './sw.js',
    enabledProtocols: ['http:', 'https:'],
    updateBanner: {
      className: 'offline-update-banner',
      message: 'A new version is available.',
      refreshLabel: 'Refresh',
      dismissLabel: 'Close'
    },
    offlineBanner: {
      className: 'offline-update-banner offline-banner',
      message: "You're playing offline. Progress will sync when you reconnect.",
      backOnlineToast: 'Back online!'
    }
  }
});
