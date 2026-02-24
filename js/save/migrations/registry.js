(function initMLFSaveMigrationRegistry(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let migrationV0ToV1 = null;
        let migrationV1ToV2 = null;
        try {
            migrationV0ToV1 = require('./v0-to-v1.js');
        } catch (_) {}
        try {
            migrationV1ToV2 = require('./v1-to-v2.js');
        } catch (_) {}
        module.exports = factory(migrationV0ToV1, migrationV1ToV2);
        return;
    }
    root.MLFSaveMigrationRegistry = factory(root.MLFSaveMigrationV0ToV1, root.MLFSaveMigrationV1ToV2);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrationRegistry(migrationV0ToV1, migrationV1ToV2) {
    'use strict';

    const MIGRATIONS = Object.freeze(
        [migrationV0ToV1, migrationV1ToV2]
            .filter(Boolean)
            .sort((a, b) => {
                if (a.fromVersion !== b.fromVersion) return a.fromVersion - b.fromVersion;
                return a.toVersion - b.toVersion;
            })
    );

    function getMigrationByFromVersion(version) {
        return MIGRATIONS.find((migration) => migration.fromVersion === version) || null;
    }

    return Object.freeze({
        MIGRATIONS,
        getMigrationByFromVersion
    });
});
