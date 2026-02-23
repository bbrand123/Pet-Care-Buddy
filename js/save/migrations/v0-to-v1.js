(function initMLFSaveMigrationV0ToV1(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let schema = null;
        try {
            schema = require('../schema.js');
        } catch (_) {}
        module.exports = factory(schema);
        return;
    }
    root.MLFSaveMigrationV0ToV1 = factory(root.MLFSaveSchema);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrationV0ToV1(SaveSchema) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function hasPetObject(pet) {
        return isObject(pet);
    }

    function firstObjectInArray(arr) {
        if (!Array.isArray(arr)) return null;
        for (let i = 0; i < arr.length; i++) {
            if (isObject(arr[i])) return arr[i];
        }
        return null;
    }

    function recordChange(ctx, change) {
        if (ctx && typeof ctx.recordChange === 'function') ctx.recordChange(change);
    }

    function apply(payload, ctx) {
        if (!isObject(payload)) return payload;

        if (payload.phase === 'hatching') {
            recordChange(ctx, {
                path: 'phase',
                kind: 'repair',
                message: 'Reset legacy stuck hatching phase to egg during schema migration.',
                before: 'hatching',
                after: 'egg'
            });
            payload.phase = 'egg';
            if (payload.eggTaps !== 0) {
                recordChange(ctx, {
                    path: 'eggTaps',
                    kind: 'repair',
                    message: 'Reset egg tap counter after hatching-phase repair.',
                    before: payload.eggTaps,
                    after: 0
                });
                payload.eggTaps = 0;
            }
        }

        if (!Array.isArray(payload.pets) && hasPetObject(payload.pet)) {
            recordChange(ctx, {
                path: 'pets',
                kind: 'repair',
                message: 'Created pets array from legacy singular pet field.',
                before: payload.pets,
                after: '[derived-from-pet]'
            });
            payload.pets = [payload.pet];
        }

        if (payload.phase === 'pet' && !hasPetObject(payload.pet)) {
            const fallbackPet = firstObjectInArray(payload.pets);
            if (fallbackPet) {
                recordChange(ctx, {
                    path: 'pet',
                    kind: 'repair',
                    message: 'Restored active pet object from pets array.',
                    before: payload.pet,
                    after: '[derived-from-pets]'
                });
                payload.pet = fallbackPet;
            }
        }

        if (Array.isArray(payload.pets) && (!Number.isInteger(payload.activePetIndex) || payload.activePetIndex < 0)) {
            recordChange(ctx, {
                path: 'activePetIndex',
                kind: 'repair',
                message: 'Normalized activePetIndex to 0.',
                before: payload.activePetIndex,
                after: 0
            });
            payload.activePetIndex = 0;
        }

        if (SaveSchema && typeof SaveSchema.stampSaveSchemaVersion === 'function') {
            SaveSchema.stampSaveSchemaVersion(payload, 1);
        } else {
            payload.saveSchemaVersion = 1;
        }
        recordChange(ctx, {
            path: 'saveSchemaVersion',
            kind: 'version',
            message: 'Stamped save schema version 1.',
            before: 0,
            after: 1
        });

        return payload;
    }

    return Object.freeze({
        fromVersion: 0,
        toVersion: 1,
        name: 'legacy-v0-to-v1',
        apply
    });
});
