(function initMLFCorePersistenceCoordinator(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFCorePersistenceCoordinator = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFCorePersistenceCoordinatorModule() {
    'use strict';

    function createPersistenceCoordinator(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const storage = opts.storage || null;
        const saveKey = String(opts.saveKey || '');
        let lastSavedStorageSnapshot = null;
        let suppressUnloadAutosave = false;

        function readCurrentSaveSnapshot() {
            if (!storage || typeof storage.getItem !== 'function' || !saveKey) return null;
            return storage.getItem(saveKey, null);
        }

        function markSaveSnapshot(serialized) {
            lastSavedStorageSnapshot = typeof serialized === 'string' ? serialized : null;
        }

        function clearSaveSnapshot() {
            lastSavedStorageSnapshot = null;
        }

        function getLastSaveSnapshot() {
            return lastSavedStorageSnapshot;
        }

        function suppressUnloadAutosaveForReload() {
            suppressUnloadAutosave = true;
        }

        function resetUnloadAutosaveSuppression() {
            suppressUnloadAutosave = false;
        }

        function hasExternalSaveChangeSinceLastSave() {
            const current = readCurrentSaveSnapshot();
            return current !== lastSavedStorageSnapshot;
        }

        function shouldRunUnloadAutosave() {
            if (suppressUnloadAutosave) return false;
            if (hasExternalSaveChangeSinceLastSave()) return false;
            return true;
        }

        return Object.freeze({
            readCurrentSaveSnapshot,
            markSaveSnapshot,
            clearSaveSnapshot,
            getLastSaveSnapshot,
            suppressUnloadAutosaveForReload,
            resetUnloadAutosaveSuppression,
            hasExternalSaveChangeSinceLastSave,
            shouldRunUnloadAutosave
        });
    }

    return Object.freeze({ createPersistenceCoordinator });
});
