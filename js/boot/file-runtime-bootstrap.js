(function bootFileProtocolRuntime(global) {
    'use strict';

    if (global.__MLF_RUNTIME_BOOTSTRAPPED__) return;
    global.__MLF_RUNTIME_BOOTSTRAPPED__ = true;

    function loadScript(url) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.async = false;
            s.src = url;
            s.onload = function() { resolve(); };
            s.onerror = function() { reject(new Error('Failed to load ' + url)); };
            document.head.appendChild(s);
        });
    }

    function toAbsoluteUrl(baseUrl, relPath) {
        try {
            return new URL(relPath, baseUrl).toString();
        } catch (e) {
            return relPath;
        }
    }

    function loadSequential(paths, baseUrl) {
        var list = Array.isArray(paths) ? paths : [];
        var chain = Promise.resolve();
        var loaded = global.__MLF_LOADED_SCRIPTS__;
        if (!loaded || typeof loaded.has !== 'function') {
            loaded = new Set();
            global.__MLF_LOADED_SCRIPTS__ = loaded;
        }
        list.forEach(function(path) {
            chain = chain.then(function() {
                var href = toAbsoluteUrl(baseUrl, path);
                if (loaded.has(href)) return;
                return loadScript(href).then(function() { loaded.add(href); });
            });
        });
        return chain;
    }

    loadScript('js/config/runtime-manifest.classic.generated.js')
        .then(function() {
            var manifest = global.MLFRuntimeManifest || {};
            var files = manifest.RUNTIME_SCRIPT_FILES || [];
            return loadSequential(files, 'js/');
        })
        .then(function() {
            global.__MLF_RUNTIME_READY__ = true;
            global.dispatchEvent(new Event('mlf:runtime-ready'));
        })
        .catch(function(err) {
            console.error('[MLF] File-protocol bootstrap failed:', err);
            try {
                if (typeof global.dismissSplashScreen === 'function') {
                    global.dismissSplashScreen({ skipMinDelay: true });
                }
            } catch (_) {}
        });
})(typeof globalThis !== 'undefined' ? globalThis : window);
