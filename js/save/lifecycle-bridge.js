(function initMLFSaveLifecycleBridge(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(null);
        return;
    }
    root.MLFSaveLifecycleBridge = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveLifecycleBridge(globalRoot) {
    'use strict';

    const state = {
        saveHandler: null,
        inFlightPromise: null,
        lastCompletedAt: 0,
        lastCompletedResult: null,
        debounceMs: 300,
        nativeResultTransport: null,
        diagnosticsReporter: null
    };

    function nowMs() {
        return Date.now();
    }

    function getRoot() {
        return globalRoot || (typeof globalThis !== 'undefined' ? globalThis : null);
    }

    function getDiagnostics() {
        if (typeof state.diagnosticsReporter === 'function') return { push: state.diagnosticsReporter };
        const root = getRoot();
        if (!root || !root.MLFDiagnostics || typeof root.MLFDiagnostics.push !== 'function') return null;
        return root.MLFDiagnostics;
    }

    function pushDiagnostic(level, message, meta) {
        const diag = getDiagnostics();
        if (!diag || typeof diag.push !== 'function') return;
        try {
            diag.push({
                category: 'SAVE',
                level: level || 'info',
                message: message || '',
                buildVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
                saveSchemaVersion: (typeof MLFSaveSchema !== 'undefined' && MLFSaveSchema && typeof MLFSaveSchema.CURRENT_SCHEMA_VERSION === 'number')
                    ? MLFSaveSchema.CURRENT_SCHEMA_VERSION
                    : null,
                meta: meta || null
            });
        } catch (_) {}
    }

    function postLifecycleSaveResult(result) {
        const normalized = result && typeof result === 'object' ? result : { ok: false, error: { code: 'INVALID_RESULT' } };
        if (typeof state.nativeResultTransport === 'function') {
            state.nativeResultTransport(normalized);
            return true;
        }
        const root = getRoot();
        try {
            const handler = root && root.webkit && root.webkit.messageHandlers && root.webkit.messageHandlers.lifecycleSave;
            if (!handler || typeof handler.postMessage !== 'function') return false;
            handler.postMessage(normalized);
            return true;
        } catch (err) {
            pushDiagnostic('error', 'Failed to post lifecycle save result to native handler.', {
                error: String(err && err.message ? err.message : err)
            });
            return false;
        }
    }

    function normalizeReason(reason) {
        if (typeof reason === 'string' && reason.trim()) return reason.trim();
        return 'native-lifecycle';
    }

    function normalizeError(err) {
        if (!err) return { code: 'UNKNOWN', message: 'Unknown save error.' };
        if (typeof err === 'string') return { code: 'ERROR', message: err };
        return {
            code: err.code ? String(err.code) : (err.name ? String(err.name) : 'ERROR'),
            message: err.message ? String(err.message) : String(err),
            name: err.name ? String(err.name) : null
        };
    }

    function normalizeSaveHandlerResult(rawResult, reason, startMs) {
        if (rawResult && typeof rawResult === 'object' && Object.prototype.hasOwnProperty.call(rawResult, 'ok')) {
            return Object.assign({
                reason,
                durationMs: Math.max(0, nowMs() - startMs),
                ts: new Date().toISOString(),
                source: 'lifecycle'
            }, rawResult);
        }
        if (rawResult === false) {
            return {
                ok: false,
                reason,
                durationMs: Math.max(0, nowMs() - startMs),
                ts: new Date().toISOString(),
                source: 'lifecycle',
                error: { code: 'SAVE_RETURNED_FALSE', message: 'saveGame returned false.' }
            };
        }
        return {
            ok: true,
            reason,
            durationMs: Math.max(0, nowMs() - startMs),
            ts: new Date().toISOString(),
            source: 'lifecycle'
        };
    }

    function getSaveHandler() {
        if (typeof state.saveHandler === 'function') return state.saveHandler;
        const root = getRoot();
        if (root && typeof root.saveGame === 'function') return root.saveGame;
        return null;
    }

    function executeLifecycleSave(reason, options) {
        const normalizedReason = normalizeReason(reason);
        const force = !!(options && options.force);
        const startedAt = nowMs();

        if (state.inFlightPromise) {
            return state.inFlightPromise.then((result) => Object.assign({}, result, { coalesced: true, reason: normalizedReason }));
        }

        if (!force && state.lastCompletedResult && (startedAt - state.lastCompletedAt) < state.debounceMs) {
            return Promise.resolve(Object.assign({}, state.lastCompletedResult, {
                debounced: true,
                reason: normalizedReason
            }));
        }

        state.inFlightPromise = Promise.resolve()
            .then(() => {
                const saveHandler = getSaveHandler();
                if (typeof saveHandler !== 'function') {
                    const bridgeError = new Error('saveGame handler unavailable for lifecycle save.');
                    bridgeError.code = 'SAVE_HANDLER_UNAVAILABLE';
                    throw bridgeError;
                }
                return saveHandler({
                    source: 'lifecycle',
                    reason: normalizedReason,
                    silentIndicator: true
                });
            })
            .then((rawResult) => normalizeSaveHandlerResult(rawResult, normalizedReason, startedAt))
            .catch((err) => ({
                ok: false,
                reason: normalizedReason,
                durationMs: Math.max(0, nowMs() - startedAt),
                ts: new Date().toISOString(),
                source: 'lifecycle',
                error: normalizeError(err)
            }))
            .then((result) => {
                state.lastCompletedAt = nowMs();
                state.lastCompletedResult = result;
                state.inFlightPromise = null;
                if (result.ok) {
                    pushDiagnostic('info', 'Lifecycle save completed.', {
                        reason: result.reason,
                        durationMs: result.durationMs,
                        debounced: !!result.debounced,
                        coalesced: !!result.coalesced
                    });
                } else {
                    pushDiagnostic('error', 'Lifecycle save failed.', {
                        reason: result.reason,
                        durationMs: result.durationMs,
                        error: result.error || null
                    });
                }
                return result;
            });

        return state.inFlightPromise;
    }

    function saveNowForLifecycle(reason) {
        return executeLifecycleSave(reason, { force: false });
    }

    function requestSave(message) {
        const request = (message && typeof message === 'object') ? message : { reason: message };
        const requestId = request.requestId ? String(request.requestId) : ('req_' + nowMs().toString(36));
        const reason = normalizeReason(request.reason);
        const force = request.force === true;

        return executeLifecycleSave(reason, { force }).then((result) => {
            const payload = Object.assign({}, result, { requestId });
            postLifecycleSaveResult(payload);
            return { accepted: true, requestId };
        });
    }

    function setSaveHandler(fn) {
        state.saveHandler = typeof fn === 'function' ? fn : null;
    }

    function setNativeResultTransport(fn) {
        state.nativeResultTransport = typeof fn === 'function' ? fn : null;
    }

    function setDiagnosticsReporter(fn) {
        state.diagnosticsReporter = typeof fn === 'function' ? fn : null;
    }

    function configure(options) {
        if (!options || typeof options !== 'object') return;
        if (Number.isInteger(options.debounceMs) && options.debounceMs >= 0) {
            state.debounceMs = options.debounceMs;
        }
    }

    function resetForTests() {
        state.saveHandler = null;
        state.inFlightPromise = null;
        state.lastCompletedAt = 0;
        state.lastCompletedResult = null;
        state.debounceMs = 300;
        state.nativeResultTransport = null;
        state.diagnosticsReporter = null;
    }

    const api = Object.freeze({
        configure,
        setSaveHandler,
        setNativeResultTransport,
        setDiagnosticsReporter,
        saveNowForLifecycle,
        requestSave,
        postLifecycleSaveResult,
        _resetForTests: resetForTests
    });

    const root = getRoot();
    if (root) {
        root.saveNowForLifecycle = saveNowForLifecycle;
    }

    return api;
});
