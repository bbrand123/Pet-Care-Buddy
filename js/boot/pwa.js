export function resolvePwaBootPolicy(config, runtimeGlobal = globalThis) {
  const cfg = config || {};
  const enabled = cfg.enabled === true;
  const protocols = Array.isArray(cfg.enabledProtocols) ? cfg.enabledProtocols : ['http:', 'https:'];
  const protocol = runtimeGlobal && runtimeGlobal.location ? runtimeGlobal.location.protocol : null;
  const protocolOk = !!protocol && protocols.includes(protocol);
  const allowOfflineBanners = enabled && cfg.offlineBanner !== false;

  return {
    enabled,
    protocol,
    protocolOk,
    allowOfflineBanners
  };
}

function removeBanner(selector) {
  const existing = document.querySelector(selector);
  if (existing) existing.remove();
}

function _escBanner(s) {
  return String(s || '').replace(/[&<>"']/g, function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});
}

function buildUpdateBanner(config) {
  const banner = document.createElement('div');
  banner.className = config.className;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = `<span class="offline-banner-message">${_escBanner(config.message)}</span><span class="offline-banner-actions"><button type="button" class="offline-banner-action" data-banner-action="refresh">${_escBanner(config.refreshLabel)}</button><button type="button" class="offline-banner-dismiss" data-banner-action="dismiss" aria-label="Dismiss update banner">${_escBanner(config.dismissLabel)}</button></span>`;
  banner.querySelector('[data-banner-action="refresh"]')?.addEventListener('click', () => location.reload());
  banner.querySelector('[data-banner-action="dismiss"]')?.addEventListener('click', () => banner.remove());
  return banner;
}

export function initializePwa(config) {
  const cfg = config || {};
  const policy = resolvePwaBootPolicy(cfg, typeof window !== 'undefined' ? window : globalThis);

  if (policy.allowOfflineBanners && typeof window !== 'undefined') {
    window.addEventListener('offline', () => {
      removeBanner('.offline-update-banner');
      const banner = document.createElement('div');
      banner.className = cfg.offlineBanner?.className || 'offline-update-banner offline-banner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.textContent = cfg.offlineBanner?.message || "You're playing offline. Progress will sync when you reconnect.";
      document.body.appendChild(banner);
    });

    window.addEventListener('online', () => {
      removeBanner('.offline-banner');
      if (typeof window.showToast === 'function') {
        window.showToast(cfg.offlineBanner?.backOnlineToast || 'Back online!', '#66BB6A');
      }
    });
  }

  if (!policy.enabled) {
    return { skipped: true, reason: 'legacy-pwa-disabled' };
  }

  if (!('serviceWorker' in navigator) || !policy.protocolOk) {
    return null;
  }

  return navigator.serviceWorker.register(cfg.serviceWorkerUrl || './sw.js')
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            const banner = buildUpdateBanner(cfg.updateBanner || {
              className: 'offline-update-banner',
              message: 'A new version is available.',
              refreshLabel: 'Refresh',
              dismissLabel: 'Close'
            });
            document.body.appendChild(banner);
          }
        });
      });
      return reg;
    })
    .catch(() => null);
}
