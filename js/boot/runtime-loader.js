const loadedScripts = new Set();

function getGlobalLoadRegistry() {
  if (typeof window === 'undefined') return loadedScripts;
  if (!window.__MLF_LOADED_SCRIPTS__) {
    window.__MLF_LOADED_SCRIPTS__ = new Set();
  }
  return window.__MLF_LOADED_SCRIPTS__;
}

function appendClassicScript(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error(`Timed out loading ${url}`));
    }, timeoutMs);

    script.src = url;
    script.async = false;
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to load ${url}`));
    };
    document.head.appendChild(script);
  });
}

export async function loadClassicScriptsSequentially(paths, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 15000);
  const baseUrl = options.baseUrl || import.meta.url;
  const registry = getGlobalLoadRegistry();

  for (const path of paths || []) {
    const href = String(new URL(path, baseUrl));
    if (registry.has(href)) continue;
    await appendClassicScript(href, timeoutMs);
    registry.add(href);
  }
}
