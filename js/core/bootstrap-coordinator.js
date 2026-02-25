(function initMLFCoreBootstrapCoordinator(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFCoreBootstrapCoordinator = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFCoreBootstrapCoordinatorModule() {
    'use strict';

    function createBootstrapCoordinator(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        let started = false;

        function canBoot() {
            if (typeof opts.canBoot === 'function') return !!opts.canBoot();
            return true;
        }

        function boot() {
            if (started) return false;
            if (!canBoot()) return false;
            started = true;
            try {
                if (typeof opts.onBoot === 'function') {
                    const result = opts.onBoot();
                    if (result && typeof result.then === 'function') {
                        // P1-03: Do NOT reset started on async failure.  The synchronous
                        // portion of boot (DOM creation, event listeners) already ran, so
                        // resetting the flag would allow a second boot() call that adds
                        // duplicate timers, listeners and DOM nodes.  Surface errors via
                        // opts.onBootError instead.
                        Promise.resolve(result).catch(function handleAsyncBootFailure(err) {
                            if (typeof opts.onBootError === 'function') opts.onBootError(err);
                        });
                    }
                }
            } catch (err) {
                started = false;
                throw err;
            }
            return true;
        }

        return Object.freeze({
            boot,
            hasStarted() { return started; }
        });
    }

    return Object.freeze({ createBootstrapCoordinator });
});
