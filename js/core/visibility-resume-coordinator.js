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
        let isHandlingResume = false;

        function onHidden(meta) {
            if (typeof opts.onHidden === 'function') {
                return opts.onHidden(meta || null);
            }
            return null;
        }

        function onVisible(meta) {
            if (isHandlingResume) return { skipped: true, reason: 'resume-in-flight' };
            isHandlingResume = true;
            try {
                if (typeof opts.onVisible === 'function') {
                    return opts.onVisible(meta || null) || null;
                }
                return null;
            } finally {
                isHandlingResume = false;
            }
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
