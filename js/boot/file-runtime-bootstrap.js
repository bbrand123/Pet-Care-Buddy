(function bootFileProtocolRuntime(global) {
    'use strict';

    if (global.__MLF_RUNTIME_BOOTSTRAPPED__) return;

    var DEFAULT_SCRIPT_LOAD_TIMEOUT_MS = 8000;

    function getScriptLoadTimeoutMs() {
        var raw = Number(global.__MLF_FILE_BOOT_SCRIPT_TIMEOUT_MS__);
        if (Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
        return DEFAULT_SCRIPT_LOAD_TIMEOUT_MS;
    }

    function loadScript(url, options) {
        var opts = options || {};
        var timeoutMs = Number.isFinite(Number(opts.timeoutMs)) ? Math.max(0, Math.floor(Number(opts.timeoutMs))) : getScriptLoadTimeoutMs();
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            var settled = false;
            var timerId = null;
            function finish(ok, err) {
                if (settled) return;
                settled = true;
                if (timerId != null) {
                    try { clearTimeout(timerId); } catch (_) {}
                    timerId = null;
                }
                if (ok) resolve();
                else reject(err || new Error('Failed to load ' + url));
            }
            s.async = false;
            s.src = url;
            s.onload = function() { finish(true); };
            s.onerror = function() { finish(false, new Error('Failed to load ' + url)); };
            document.head.appendChild(s);
            if (timeoutMs > 0) {
                timerId = setTimeout(function() {
                    try { if (typeof s.remove === 'function') s.remove(); } catch (_) {}
                    finish(false, new Error('Timed out loading ' + url));
                }, timeoutMs);
            }
        });
    }

    function resolveRuntimeScriptUrl(relPath) {
        var clean = String(relPath || '').replace(/^\.\//, '');
        try {
            return new URL('js/' + clean, document.baseURI).toString();
        } catch (e) {
            return 'js/' + clean;
        }
    }

    function loadSequential(paths) {
        var list = Array.isArray(paths) ? paths : [];
        var chain = Promise.resolve();
        var loaded = global.__MLF_LOADED_SCRIPTS__;
        if (!loaded || typeof loaded.has !== 'function') {
            loaded = new Set();
            global.__MLF_LOADED_SCRIPTS__ = loaded;
        }
        list.forEach(function(path) {
            chain = chain.then(function() {
                    var href = resolveRuntimeScriptUrl(path);
                    if (loaded.has(href)) return;
                    return loadScript(href).then(function() { loaded.add(href); });
                });
            });
            return chain;
        }

    function ensureSharedBootModulesLoaded() {
        return loadScript('js/boot/runtime-manifest-shared.js')
            .then(function() { return loadScript('js/boot/runtime-bootstrap-shared.js'); });
    }

    function loadClassicManifestAndRuntime(options) {
        var opts = options || {};
        return loadScript('js/config/runtime-manifest.classic.generated.js').then(function() {
            var manifest = global.MLFRuntimeManifest || {};
            var manifestHelpers = global.MLFRuntimeManifestShared;
            var parityReport = null;
            if (opts.assertRuntimeManifestParity !== false && manifestHelpers && typeof manifestHelpers.assertRuntimeManifestParity === 'function') {
                parityReport = manifestHelpers.assertRuntimeManifestParity(manifest, {
                    mode: 'file',
                    expectedRuntimeOrder: manifestHelpers.flattenRuntimeFiles(manifest)
                });
            }
            var files = manifest.RUNTIME_SCRIPT_FILES || [];
            return loadSequential(files).then(function() {
                return {
                    manifest: manifest,
                    runtimeScriptFiles: files.slice ? files.slice() : Array.prototype.slice.call(files),
                    manifestParityReport: parityReport
                };
            });
        });
    }

    ensureSharedBootModulesLoaded()
        .then(function() {
            var shared = global.MLFRuntimeBootstrapShared;
            if (!shared || typeof shared.runRuntimeBoot !== 'function') {
                throw new Error('MLFRuntimeBootstrapShared is unavailable for file bootstrap.');
            }
            return shared.runRuntimeBoot({
                global: global,
                bootPath: 'file',
                loadRuntimeScripts: function(ctx) {
                    return loadClassicManifestAndRuntime(ctx || {});
                }
            });
        })
        .catch(function(err) {
            try {
                var diagnostics = global && global.MLFDiagnostics;
                if (diagnostics && typeof diagnostics.error === 'function') {
                    diagnostics.error('BOOT', 'File-protocol bootstrap failed.', {
                        error: String(err && err.message ? err.message : err),
                        bootInfo: global.__MLF_RUNTIME_BOOT_INFO__ || null
                    });
                }
            } catch (_) {}
            console.error('[MLF] File-protocol bootstrap failed:', err);
            try {
                if (typeof global.dismissSplashScreen === 'function') {
                    global.dismissSplashScreen({ skipMinDelay: true });
                }
            } catch (_) {}
        });
})(typeof globalThis !== 'undefined' ? globalThis : window);
