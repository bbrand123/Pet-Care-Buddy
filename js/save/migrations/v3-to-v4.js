(function initMLFSaveMigrationV3ToV4(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let schema = null;
        let stateMigrations = null;
        try { schema = require('../schema.js'); } catch (_) {}
        try { stateMigrations = require('../../state/migrations.js'); } catch (_) {}
        module.exports = factory(schema, stateMigrations);
        return;
    }
    root.MLFSaveMigrationV3ToV4 = factory(root.MLFSaveSchema, root.MLFStateMigrations);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrationV3ToV4(SaveSchema, StateMigrations) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function recordChange(ctx, change) {
        if (ctx && typeof ctx.recordChange === 'function') ctx.recordChange(change);
    }

    function apply(payload, ctx) {
        if (!isObject(payload)) return payload;
        const before = isObject(payload.journeyRetention) ? '[existing-journeyRetention]' : undefined;
        if (StateMigrations && typeof StateMigrations.buildJourneyRetentionStateFromLegacy === 'function') {
            StateMigrations.buildJourneyRetentionStateFromLegacy(payload, { now: payload.lastUpdate || Date.now() });
        } else if (!isObject(payload.journeyRetention)) {
            payload.journeyRetention = {
                version: 1,
                startedAtDate: new Date(payload.lastUpdate || Date.now()).toISOString().slice(0, 10),
                currentChapterId: 'chapter1',
                lastUpdatedAt: payload.lastUpdate || Date.now(),
                chapterProgress: {},
                streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 } },
                bond: { xp: 0, level: 1 },
                tokens: 0,
                features: { seasonalEnabled: false }
            };
        }
        recordChange(ctx, {
            path: 'journeyRetention',
            kind: before ? 'repair' : 'add',
            message: 'Added chapter-local Journey retention state with per-chapter baselines/deltas (no retroactive completion).',
            before,
            after: '[journeyRetention]'
        });

        if (SaveSchema && typeof SaveSchema.stampSaveSchemaVersion === 'function') {
            SaveSchema.stampSaveSchemaVersion(payload, 4);
        } else {
            payload.saveSchemaVersion = 4;
        }
        recordChange(ctx, {
            path: 'saveSchemaVersion',
            kind: 'version',
            message: 'Stamped save schema version 4.',
            before: 3,
            after: 4
        });
        return payload;
    }

    return Object.freeze({
        fromVersion: 3,
        toVersion: 4,
        name: 'journey-retention-v3-to-v4',
        apply
    });
});
