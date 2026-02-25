(function initMLFPhase2UiHookBindings(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let UiHooks = null;
        try {
            UiHooks = require('./ui-hooks.js');
        } catch (_) {}
        module.exports = factory(UiHooks);
        return;
    }
    root.MLFPhase2UiHookBindings = factory(root.MLFUiHooks);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFPhase2UiHookBindings(UiHooks) {
    'use strict';

    function noop() {}

    function bindPhase2Hooks(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const hooks = opts.uiHooks || UiHooks;
        if (!hooks || typeof hooks.on !== 'function') return { unsubscribeAll: noop };

        const callbacks = opts.callbacks || {};
        const unsubscribers = [];

        function bind(eventName, cbName) {
            const cb = callbacks[cbName];
            if (typeof cb !== 'function') return;
            unsubscribers.push(hooks.on(eventName, function onHook(evt) {
                cb(evt && evt.detail ? evt.detail : null, evt || null);
            }));
        }

        bind('toast:shown', 'onToastShown');
        bind('toast:removed', 'onToastRemoved');
        bind('overlay:opened', 'onOverlayOpened');
        bind('overlay:closing', 'onOverlayClosing');
        bind('overlay:closed', 'onOverlayClosed');
        bind('modal:opened', 'onModalOpened');
        bind('modal:closed', 'onModalClosed');
        bind('room:changed', 'onRoomChanged');

        return {
            unsubscribeAll() {
                while (unsubscribers.length > 0) {
                    const unsub = unsubscribers.pop();
                    try { if (typeof unsub === 'function') unsub(); } catch (_) {}
                }
            }
        };
    }

    return Object.freeze({
        bindPhase2Hooks
    });
});
