(function initMLFSaveMigrations(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let SaveSchema = null;
        let SaveMigrationRegistry = null;
        try {
            SaveSchema = require('./schema.js');
        } catch (_) {}
        try {
            SaveMigrationRegistry = require('./migrations/registry.js');
        } catch (_) {}
        module.exports = factory(SaveSchema, SaveMigrationRegistry);
        return;
    }
    root.MLFSaveMigrations = factory(root.MLFSaveSchema, root.MLFSaveMigrationRegistry);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrations(SaveSchema, SaveMigrationRegistry) {
    'use strict';

    class SavePayloadParseError extends Error {
        constructor(message, details) {
            super(message);
            this.name = 'SavePayloadParseError';
            if (details && typeof details === 'object') Object.assign(this, details);
        }
    }

    class SaveMigrationError extends Error {
        constructor(message, details) {
            super(message);
            this.name = 'SaveMigrationError';
            if (details && typeof details === 'object') Object.assign(this, details);
        }
    }

    function deepClonePayload(payload) {
        return JSON.parse(JSON.stringify(payload));
    }

    function parseSavePayloadJSON(serialized) {
        try {
            return JSON.parse(serialized);
        } catch (err) {
            throw new SavePayloadParseError('Save payload JSON could not be parsed.', {
                code: 'SAVE_JSON_PARSE_FAILED',
                cause: err
            });
        }
    }

    function normalizeChange(change, migration) {
        const base = (change && typeof change === 'object') ? change : { message: String(change) };
        return {
            migration: migration ? migration.name : null,
            fromVersion: migration ? migration.fromVersion : null,
            toVersion: migration ? migration.toVersion : null,
            path: typeof base.path === 'string' ? base.path : '$',
            kind: typeof base.kind === 'string' ? base.kind : 'note',
            message: typeof base.message === 'string' ? base.message : 'Migration change recorded.',
            before: Object.prototype.hasOwnProperty.call(base, 'before') ? base.before : undefined,
            after: Object.prototype.hasOwnProperty.call(base, 'after') ? base.after : undefined
        };
    }

    function serializeSavePayloadJSON(payload, options) {
        if (!SaveSchema || typeof SaveSchema.stampSaveSchemaVersion !== 'function') {
            return JSON.stringify(payload, null, options && options.pretty ? 2 : 0);
        }
        const clone = deepClonePayload(payload);
        SaveSchema.stampSaveSchemaVersion(clone);
        return JSON.stringify(clone, null, options && options.pretty ? 2 : 0);
    }

    function migrateSavePayload(payload, options) {
        if (!SaveSchema || !SaveMigrationRegistry) {
            throw new SaveMigrationError('Save migration modules are not available.');
        }

        SaveSchema.validateSavePayload(payload, { mode: 'pre-migration' });

        const cloneInput = !options || options.clone !== false;
        const working = cloneInput ? deepClonePayload(payload) : payload;
        const fromVersion = SaveSchema.getSaveSchemaVersion(working);
        const report = {
            fromVersion,
            toVersion: fromVersion,
            appliedMigrations: [],
            changes: [],
            warnings: [],
            changed: false
        };

        let currentVersion = fromVersion;
        while (currentVersion < SaveSchema.CURRENT_SCHEMA_VERSION) {
            const migration = SaveMigrationRegistry.getMigrationByFromVersion(currentVersion);
            if (!migration || typeof migration.apply !== 'function') {
                throw new SaveMigrationError(
                    'No migration registered from schema version ' + currentVersion + '.',
                    { code: 'MISSING_MIGRATION', fromVersion: currentVersion }
                );
            }

            const stepChanges = [];
            const context = {
                recordChange(change) {
                    const normalized = normalizeChange(change, migration);
                    stepChanges.push(normalized);
                    report.changes.push(normalized);
                },
                warn(message) {
                    report.warnings.push({
                        migration: migration.name,
                        fromVersion: migration.fromVersion,
                        toVersion: migration.toVersion,
                        message: String(message)
                    });
                }
            };

            const nextPayload = migration.apply(working, context);
            if (!nextPayload || typeof nextPayload !== 'object' || Array.isArray(nextPayload)) {
                throw new SaveMigrationError(
                    'Migration "' + migration.name + '" returned an invalid payload root.',
                    { code: 'INVALID_MIGRATION_RESULT', migration: migration.name }
                );
            }

            if (SaveSchema.getSaveSchemaVersion(nextPayload) !== migration.toVersion) {
                if (typeof SaveSchema.stampSaveSchemaVersion === 'function') {
                    SaveSchema.stampSaveSchemaVersion(nextPayload, migration.toVersion);
                } else {
                    nextPayload.saveSchemaVersion = migration.toVersion;
                }
                context.recordChange({
                    path: 'saveSchemaVersion',
                    kind: 'version',
                    message: 'Migration registry enforced target schema version.',
                    before: currentVersion,
                    after: migration.toVersion
                });
            }

            report.appliedMigrations.push({
                name: migration.name,
                fromVersion: migration.fromVersion,
                toVersion: migration.toVersion,
                changeCount: stepChanges.length
            });
            if (stepChanges.length > 0 || migration.fromVersion !== migration.toVersion) {
                report.changed = true;
            }

            currentVersion = migration.toVersion;
            report.toVersion = currentVersion;
        }

        SaveSchema.validateSavePayload(working, { mode: 'final' });
        return { payload: working, report };
    }

    return Object.freeze({
        SavePayloadParseError,
        SaveMigrationError,
        parseSavePayloadJSON,
        serializeSavePayloadJSON,
        migrateSavePayload
    });
});
