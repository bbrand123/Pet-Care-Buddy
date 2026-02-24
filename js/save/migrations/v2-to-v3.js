(function initMLFSaveMigrationV2ToV3(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let schema = null;
        try {
            schema = require('../schema.js');
        } catch (_) {}
        module.exports = factory(schema);
        return;
    }
    root.MLFSaveMigrationV2ToV3 = factory(root.MLFSaveSchema);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrationV2ToV3(SaveSchema) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function recordChange(ctx, change) {
        if (ctx && typeof ctx.recordChange === 'function') ctx.recordChange(change);
    }

    function apply(payload, ctx) {
        if (!isObject(payload)) return payload;

        if (isObject(payload.economy)) {
            if (!isObject(payload.economy.pity)) {
                payload.economy.pity = { mysteryEggRareMisses: 0 };
                recordChange(ctx, {
                    path: 'economy.pity',
                    kind: 'add',
                    message: 'Added economy pity counters for mystery egg rare drops.',
                    before: undefined,
                    after: '[pity-state]'
                });
            } else if (!Number.isFinite(payload.economy.pity.mysteryEggRareMisses)) {
                const before = payload.economy.pity.mysteryEggRareMisses;
                payload.economy.pity.mysteryEggRareMisses = 0;
                recordChange(ctx, {
                    path: 'economy.pity.mysteryEggRareMisses',
                    kind: 'repair',
                    message: 'Repaired mystery egg pity counter.',
                    before,
                    after: 0
                });
            }
        }

        if (isObject(payload.exploration)) {
            if (!isObject(payload.exploration.pity)) {
                payload.exploration.pity = { expeditionRareMisses: 0 };
                recordChange(ctx, {
                    path: 'exploration.pity',
                    kind: 'add',
                    message: 'Added exploration pity counters for expedition rare loot.',
                    before: undefined,
                    after: '[pity-state]'
                });
            } else if (!Number.isFinite(payload.exploration.pity.expeditionRareMisses)) {
                const before = payload.exploration.pity.expeditionRareMisses;
                payload.exploration.pity.expeditionRareMisses = 0;
                recordChange(ctx, {
                    path: 'exploration.pity.expeditionRareMisses',
                    kind: 'repair',
                    message: 'Repaired expedition rare loot pity counter.',
                    before,
                    after: 0
                });
            }
        }

        if (SaveSchema && typeof SaveSchema.stampSaveSchemaVersion === 'function') {
            SaveSchema.stampSaveSchemaVersion(payload, 3);
        } else {
            payload.saveSchemaVersion = 3;
        }
        recordChange(ctx, {
            path: 'saveSchemaVersion',
            kind: 'version',
            message: 'Stamped save schema version 3.',
            before: 2,
            after: 3
        });

        return payload;
    }

    return Object.freeze({
        fromVersion: 2,
        toVersion: 3,
        name: 'pity-counters-v2-to-v3',
        apply
    });
});
