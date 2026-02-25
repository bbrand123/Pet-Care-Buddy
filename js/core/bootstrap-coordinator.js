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
                        Promise.resolve(result).catch(function rollbackAsyncBootFailure() {
                            started = false;
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
