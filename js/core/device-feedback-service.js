(function initMLFCoreDeviceFeedbackService(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let PlatformAdapters = null;
        try {
            PlatformAdapters = require('../platform/adapters.js');
        } catch (_) {}
        module.exports = factory(PlatformAdapters);
        return;
    }
    root.MLFCoreDeviceFeedbackService = factory(root.MLFPlatformAdapters);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFCoreDeviceFeedbackServiceModule(PlatformAdapters) {
    'use strict';

    function createDeviceFeedbackService(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const adapters = (PlatformAdapters && typeof PlatformAdapters.createDefaultAdapters === 'function')
            ? PlatformAdapters.createDefaultAdapters({
                root: opts.root,
                navigatorRef: opts.navigatorRef,
                eventBus: opts.eventBus,
                events: opts.events
            })
            : null;
        const haptics = opts.haptics || (adapters && adapters.haptics) || null;

        function isHapticsEnabled() {
            if (haptics && typeof haptics.isEnabled === 'function') return !!haptics.isEnabled();
            return true;
        }

        function buzz(ms) {
            if (!haptics || typeof haptics.vibrate !== 'function') return false;
            return haptics.vibrate(ms || 50);
        }

        function postNative(payload) {
            if (!haptics || typeof haptics.postNative !== 'function') return false;
            return haptics.postNative(payload);
        }

        function vibrate(pattern) {
            if (!haptics || typeof haptics.vibrate !== 'function') return false;
            return haptics.vibrate(pattern);
        }

        return Object.freeze({
            adapters,
            isHapticsEnabled,
            buzz,
            postNative,
            vibrate
        });
    }

    return Object.freeze({ createDeviceFeedbackService });
});
