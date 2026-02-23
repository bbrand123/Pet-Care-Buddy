(function initMLFRuntimeBootstrapShared(root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }
  root.MLFRuntimeBootstrapShared = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRuntimeBootstrapShared() {
  'use strict';

  const READY_EVENTS = Object.freeze({
    runtimeScriptsLoaded: 'mlf:runtime-scripts-loaded',
    runtimeReady: 'mlf:runtime-ready'
  });

  function getGlobal(target) {
    if (target && typeof target === 'object') return target;
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    return {};
  }

  function dispatchEventSafe(globalObj, eventName, detail) {
    if (!globalObj || typeof globalObj.dispatchEvent !== 'function') return;
    try {
      if (typeof CustomEvent === 'function') {
        globalObj.dispatchEvent(new CustomEvent(eventName, { detail: detail || null }));
      } else if (typeof Event === 'function') {
        globalObj.dispatchEvent(new Event(eventName));
      }
    } catch (_) {}
  }

  function setBootInfo(globalObj, patch) {
    const current = (globalObj && globalObj.__MLF_RUNTIME_BOOT_INFO__ && typeof globalObj.__MLF_RUNTIME_BOOT_INFO__ === 'object')
      ? globalObj.__MLF_RUNTIME_BOOT_INFO__
      : {};
    globalObj.__MLF_RUNTIME_BOOT_INFO__ = Object.assign({}, current, patch || {});
    return globalObj.__MLF_RUNTIME_BOOT_INFO__;
  }

  function markRuntimeScriptsLoaded(globalObj, meta) {
    const target = getGlobal(globalObj);
    target.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ = true;
    setBootInfo(target, Object.assign({ runtimeScriptsLoaded: true }, meta || {}));
    dispatchEventSafe(target, READY_EVENTS.runtimeScriptsLoaded, meta || null);
  }

  function markRuntimeReady(globalObj, meta) {
    const target = getGlobal(globalObj);
    target.__MLF_RUNTIME_READY__ = true;
    setBootInfo(target, Object.assign({ runtimeReady: true }, meta || {}));
    dispatchEventSafe(target, READY_EVENTS.runtimeReady, meta || null);
  }

  function resetRuntimeBootFlags(globalObj) {
    const target = getGlobal(globalObj);
    target.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ = false;
    target.__MLF_RUNTIME_READY__ = false;
    setBootInfo(target, { runtimeScriptsLoaded: false, runtimeReady: false });
  }

  function beginRuntimeBootstrap(globalObj) {
    const target = getGlobal(globalObj);
    if (target.__MLF_RUNTIME_BOOTSTRAPPED__) return false;
    target.__MLF_RUNTIME_BOOTSTRAPPED__ = true;
    resetRuntimeBootFlags(target);
    return true;
  }

  function defaultFailureHandler(globalObj, err) {
    const target = getGlobal(globalObj);
    try {
      console.error('[MLF] Bootstrap failed:', err);
    } catch (_) {}
    try {
      if (typeof target.dismissSplashScreen === 'function') {
        target.dismissSplashScreen({ skipMinDelay: true });
      }
    } catch (_) {}
  }

  function getAssertParityEnabled(globalObj, config) {
    const cfgEnabled = !(config && config.assertRuntimeManifestParity === false);
    const target = getGlobal(globalObj);
    if (typeof target.__MLF_RUNTIME_ASSERT_PARITY__ === 'boolean') return target.__MLF_RUNTIME_ASSERT_PARITY__;
    return cfgEnabled;
  }

  async function runRuntimeBoot(config) {
    const cfg = (config && typeof config === 'object') ? config : {};
    const globalObj = getGlobal(cfg.global);
    const started = beginRuntimeBootstrap(globalObj);
    if (!started) {
      return { skipped: true, reason: 'already-bootstrapped' };
    }

    const startedAt = Date.now();

    try {
      const loadRuntimeScripts = cfg.loadRuntimeScripts;
      if (typeof loadRuntimeScripts !== 'function') {
        throw new Error('runRuntimeBoot requires loadRuntimeScripts()');
      }

      const loadResult = await loadRuntimeScripts({
        assertRuntimeManifestParity: getAssertParityEnabled(globalObj, cfg)
      });
      const meta = Object.assign({
        bootPath: cfg.bootPath || 'unknown',
        startedAt,
        finishedAt: Date.now(),
        durationMs: Math.max(0, Date.now() - startedAt)
      }, (loadResult && typeof loadResult === 'object') ? loadResult : {});

      markRuntimeScriptsLoaded(globalObj, meta);
      markRuntimeReady(globalObj, meta);

      if (typeof cfg.onReady === 'function') {
        await cfg.onReady(meta);
      }
      return meta;
    } catch (err) {
      setBootInfo(globalObj, {
        bootPath: cfg.bootPath || 'unknown',
        runtimeError: String(err && err.message ? err.message : err),
        runtimeReady: false
      });
      if (typeof cfg.onError === 'function') {
        cfg.onError(err);
      } else {
        defaultFailureHandler(globalObj, err);
      }
      throw err;
    }
  }

  return Object.freeze({
    READY_EVENTS,
    beginRuntimeBootstrap,
    markRuntimeScriptsLoaded,
    markRuntimeReady,
    runRuntimeBoot,
    resetRuntimeBootFlags
  });
});
