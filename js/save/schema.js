(function initMLFSaveSchema(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFSaveSchema = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveSchema() {
    'use strict';

    const CURRENT_SCHEMA_VERSION = 1;
    const ALLOWED_PHASES = Object.freeze(['egg', 'hatching', 'pet']);

    class SavePayloadError extends Error {
        constructor(message, details) {
            super(message);
            this.name = 'SavePayloadError';
            if (details && typeof details === 'object') {
                Object.assign(this, details);
            }
        }
    }

    class SaveValidationError extends SavePayloadError {
        constructor(message, details) {
            super(message, details);
            this.name = 'SaveValidationError';
        }
    }

    class UnsupportedFutureSaveVersionError extends SavePayloadError {
        constructor(version, currentVersion) {
            super(
                'Save schema version ' + version + ' is newer than this app supports (' + currentVersion + ').',
                {
                    code: 'UNSUPPORTED_FUTURE_SCHEMA_VERSION',
                    path: 'saveSchemaVersion',
                    version,
                    currentVersion
                }
            );
            this.name = 'UnsupportedFutureSaveVersionError';
        }
    }

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function createValidationError(message, details) {
        return new SaveValidationError(message, details || null);
    }

    function getSaveSchemaVersion(payload) {
        if (!isObject(payload)) return null;
        if (!Object.prototype.hasOwnProperty.call(payload, 'saveSchemaVersion')) return 0;
        const value = payload.saveSchemaVersion;
        if (value == null) return 0;
        return value;
    }

    function assertSchemaVersionField(schemaVersion, options) {
        const allowFutureVersion = !!(options && options.allowFutureVersion);
        if (!Number.isInteger(schemaVersion) || schemaVersion < 0) {
            throw createValidationError(
                'Invalid save schema version at "saveSchemaVersion"; expected a non-negative integer.',
                { code: 'INVALID_SCHEMA_VERSION', path: 'saveSchemaVersion', value: schemaVersion }
            );
        }
        if (!allowFutureVersion && schemaVersion > CURRENT_SCHEMA_VERSION) {
            throw new UnsupportedFutureSaveVersionError(schemaVersion, CURRENT_SCHEMA_VERSION);
        }
    }

    function assertPetObject(pet, path) {
        if (!isObject(pet)) {
            throw createValidationError(
                'Invalid save payload at "' + path + '"; expected an object.',
                { code: 'INVALID_PET_OBJECT', path, value: pet }
            );
        }
    }

    function validateSavePayload(payload, options) {
        const mode = (options && options.mode) || 'final';
        const allowFutureVersion = !!(options && options.allowFutureVersion);

        if (!isObject(payload)) {
            throw createValidationError(
                'Invalid save payload root; expected an object.',
                { code: 'INVALID_ROOT', path: '$', valueType: Array.isArray(payload) ? 'array' : typeof payload }
            );
        }

        const schemaVersion = getSaveSchemaVersion(payload);
        assertSchemaVersionField(schemaVersion, { allowFutureVersion });

        if (payload.phase != null) {
            if (typeof payload.phase !== 'string' || ALLOWED_PHASES.indexOf(payload.phase) === -1) {
                throw createValidationError(
                    'Invalid "phase"; expected one of: ' + ALLOWED_PHASES.join(', ') + '.',
                    { code: 'INVALID_PHASE', path: 'phase', value: payload.phase }
                );
            }
        } else if (mode === 'final') {
            throw createValidationError(
                'Missing required field "phase" in save payload.',
                { code: 'MISSING_PHASE', path: 'phase' }
            );
        }

        if (payload.lastUpdate != null && (!Number.isFinite(payload.lastUpdate) || payload.lastUpdate < 0)) {
            throw createValidationError(
                'Invalid "lastUpdate"; expected a finite timestamp number.',
                { code: 'INVALID_LAST_UPDATE', path: 'lastUpdate', value: payload.lastUpdate }
            );
        }

        if (payload.pets != null) {
            if (!Array.isArray(payload.pets)) {
                throw createValidationError(
                    'Invalid "pets"; expected an array.',
                    { code: 'INVALID_PETS_ARRAY', path: 'pets', value: payload.pets }
                );
            }
            for (let i = 0; i < payload.pets.length; i++) {
                if (payload.pets[i] == null) continue;
                if (!isObject(payload.pets[i])) {
                    throw createValidationError(
                        'Invalid pet entry at "pets.' + i + '"; expected an object.',
                        { code: 'INVALID_PET_ENTRY', path: 'pets.' + i, value: payload.pets[i] }
                    );
                }
            }
        }

        if (payload.activePetIndex != null) {
            const activePetIndexIsInteger = Number.isInteger(payload.activePetIndex);
            const activePetIndexIsValid = mode === 'pre-migration'
                ? activePetIndexIsInteger
                : (activePetIndexIsInteger && payload.activePetIndex >= 0);
            if (!activePetIndexIsValid) {
                throw createValidationError(
                    mode === 'pre-migration'
                        ? 'Invalid "activePetIndex"; expected an integer prior to migration.'
                        : 'Invalid "activePetIndex"; expected a non-negative integer.',
                    { code: 'INVALID_ACTIVE_PET_INDEX', path: 'activePetIndex', value: payload.activePetIndex }
                );
            }
        }

        if (payload.pet != null) {
            assertPetObject(payload.pet, 'pet');
        }

        if (mode === 'final' && payload.phase === 'pet') {
            const hasPetObject = isObject(payload.pet);
            const hasPetArray = Array.isArray(payload.pets) && payload.pets.some(isObject);
            if (!hasPetObject && !hasPetArray) {
                throw createValidationError(
                    'Pet-phase saves must include "pet" or at least one entry in "pets".',
                    { code: 'MISSING_PET_FOR_PET_PHASE', path: 'pet' }
                );
            }
        }

        return payload;
    }

    function stampSaveSchemaVersion(payload, version) {
        if (!isObject(payload)) {
            throw createValidationError(
                'Cannot stamp schema version on non-object payload.',
                { code: 'INVALID_ROOT', path: '$', valueType: typeof payload }
            );
        }
        const nextVersion = version == null ? CURRENT_SCHEMA_VERSION : version;
        assertSchemaVersionField(nextVersion, { allowFutureVersion: false });
        payload.saveSchemaVersion = nextVersion;
        return payload;
    }

    return Object.freeze({
        CURRENT_SCHEMA_VERSION,
        ALLOWED_PHASES,
        SavePayloadError,
        SaveValidationError,
        UnsupportedFutureSaveVersionError,
        getSaveSchemaVersion,
        validateSavePayload,
        stampSaveSchemaVersion
    });
});
