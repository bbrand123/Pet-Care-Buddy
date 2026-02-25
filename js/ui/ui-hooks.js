(function initMLFUiHooks(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFUiHooks = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFUiHooks() {
    'use strict';

    function createUiHooks(options) {
        const opts = options || {};
        const target = opts.target || (typeof window !== 'undefined' ? window : null);
        const listeners = {};

        function on(eventName, handler) {
            const key = String(eventName || '');
            if (!key || typeof handler !== 'function') return function noop() {};
            if (!listeners[key]) listeners[key] = [];
            listeners[key].push(handler);
            return function unsubscribe() {
                off(key, handler);
            };
        }

        function off(eventName, handler) {
            const key = String(eventName || '');
            const list = listeners[key];
            if (!list) return;
            const idx = list.indexOf(handler);
            if (idx >= 0) list.splice(idx, 1);
            if (list.length === 0) delete listeners[key];
        }

        function emit(eventName, detail) {
            const key = String(eventName || '');
            if (!key) return;
            const payload = {
                type: key,
                detail: detail || null,
                ts: Date.now()
            };
            const list = listeners[key] ? listeners[key].slice() : [];
            for (let i = 0; i < list.length; i++) {
                try {
                    list[i](payload);
                } catch (err) {
                    console.error('[MLFUiHooks] Listener error for "' + key + '":', err);
                }
            }
            if (target && typeof target.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
                try {
                    target.dispatchEvent(new CustomEvent('mlf:ui-hook', { detail: payload }));
                    target.dispatchEvent(new CustomEvent('mlf:ui-hook:' + key, { detail: payload }));
                } catch (_) {}
            }
            return payload;
        }

        function clearAll() {
            Object.keys(listeners).forEach(function clearKey(key) { delete listeners[key]; });
        }

        return Object.freeze({ on, off, emit, clearAll });
    }

    const singleton = createUiHooks();
    return Object.freeze(Object.assign({}, singleton, { createUiHooks }));
});
