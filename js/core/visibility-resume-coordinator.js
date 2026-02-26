(function initMLFCoreVisibilityResumeCoordinator(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFCoreVisibilityResumeCoordinator = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFCoreVisibilityResumeCoordinatorModule() {
    'use strict';

    function createVisibilityResumeCoordinator(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        let visibleInFlight = false;
        let visiblePromiseInFlight = null;

        function onHidden(meta) {
            if (typeof opts.onHidden === 'function') {
                return opts.onHidden(meta || null);
            }
            return null;
        }

        function onVisible(meta) {
            if (visibleInFlight) return { skipped: true, reason: 'resume-in-flight' };
            if (typeof opts.onVisible === 'function') {
                visibleInFlight = true;
                let result;
                try {
                    result = opts.onVisible(meta || null) || null;
                } catch (e) {
                    visibleInFlight = false;
                    throw e;
                }
                if (result && typeof result.then === 'function') {
                    visiblePromiseInFlight = Promise.resolve(result).finally(function clearVisiblePromise() {
                        visibleInFlight = false;
                        visiblePromiseInFlight = null;
                    });
                    return visiblePromiseInFlight;
                }
                visibleInFlight = false;
                return result;
            }
            return null;
        }

        function handleDocumentVisibilityChange(doc, meta) {
            const documentRef = doc || (typeof document !== 'undefined' ? document : null);
            if (!documentRef) return null;
            if (documentRef.hidden) return onHidden(meta || { hidden: true });
            return onVisible(meta || { hidden: false });
        }

        return Object.freeze({
            onHidden,
            onVisible,
            handleDocumentVisibilityChange
        });
    }

    return Object.freeze({ createVisibilityResumeCoordinator });
});
