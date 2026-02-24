(function initMLFSaveMigrationV1ToV2(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let schema = null;
        try {
            schema = require('../schema.js');
        } catch (_) {}
        module.exports = factory(schema);
        return;
    }
    root.MLFSaveMigrationV1ToV2 = factory(root.MLFSaveSchema);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveMigrationV1ToV2(SaveSchema) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function recordChange(ctx, change) {
        if (ctx && typeof ctx.recordChange === 'function') ctx.recordChange(change);
    }

    function normalizeNeed(value, fallback) {
        const num = Number(value);
        if (!Number.isFinite(num)) return fallback;
        return Math.max(0, Math.min(100, Math.round(num)));
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function ensurePetsArray(payload) {
        if (Array.isArray(payload.pets)) return payload.pets.filter((p) => isObject(p));
        if (isObject(payload.pet)) return [payload.pet];
        return [];
    }

    function ensurePetId(pet, fallbackId) {
        if (pet.id != null && (typeof pet.id === 'string' || Number.isInteger(pet.id))) return pet.id;
        pet.id = fallbackId;
        return pet.id;
    }

    function toHouseholdPetRecord(pet, payload) {
        const record = clone(pet);
        const roomId = typeof payload.currentRoom === 'string' ? payload.currentRoom : 'bedroom';
        record.needs = {
            hunger: normalizeNeed(pet.hunger, 70),
            energy: normalizeNeed(pet.energy, 70),
            fun: normalizeNeed(pet.happiness, 70),
            hygiene: normalizeNeed(pet.cleanliness, 70)
        };
        record.hunger = record.needs.hunger;
        record.energy = record.needs.energy;
        record.happiness = record.needs.fun;
        record.cleanliness = record.needs.hygiene;
        record.mood = typeof pet.mood === 'string' ? pet.mood : 'neutral';
        record.traits = isObject(record.traits) ? record.traits : {};
        if (typeof pet.personality === 'string' && typeof record.traits.personality !== 'string') {
            record.traits.personality = pet.personality;
        }
        record.schedule = isObject(record.schedule) ? record.schedule : {};
        if (isObject(pet.currentActivity) && !isObject(record.schedule.currentActivity)) {
            record.schedule.currentActivity = clone(pet.currentActivity);
        }
        record.currentActivity = isObject(record.schedule.currentActivity) ? clone(record.schedule.currentActivity) : null;
        record.location = isObject(record.location) ? record.location : {};
        if (typeof record.location.roomId !== 'string') record.location.roomId = roomId;
        return record;
    }

    function relationshipKey(a, b) {
        const sa = String(a);
        const sb = String(b);
        return sa <= sb ? `${sa}|${sb}` : `${sb}|${sa}`;
    }

    function mapLegacyRelationship(rel) {
        const points = Number(rel && rel.points) || 0;
        return {
            affinity: Math.max(-100, Math.min(100, Math.round(((points - 150) / 150) * 100))),
            familiarity: Math.max(0, Math.min(100, Math.round(points / 3))),
            lastInteractionAt: Number.isFinite(Number(rel && rel.lastInteraction)) ? Number(rel.lastInteraction) : 0,
            tags: []
        };
    }

    function buildHousehold(payload) {
        const pets = ensurePetsArray(payload);
        const petsById = {};
        let nextFallbackId = 1;
        pets.forEach((pet, idx) => {
            const fallbackId = `pet-${nextFallbackId++}`;
            const id = ensurePetId(pet, fallbackId);
            petsById[String(id)] = toHouseholdPetRecord(pet, payload);
        });

        let activePetId = null;
        if (pets.length > 0) {
            const idx = Number.isInteger(payload.activePetIndex) && payload.activePetIndex >= 0 && payload.activePetIndex < pets.length
                ? payload.activePetIndex
                : 0;
            const activePet = pets[idx] || pets[0];
            if (activePet && activePet.id != null) activePetId = String(activePet.id);
        }

        const relationships = {};
        if (isObject(payload.relationships)) {
            Object.keys(payload.relationships).forEach((legacyKey) => {
                const parts = String(legacyKey).split(/[-|]/).filter(Boolean);
                if (parts.length !== 2) return;
                const key = relationshipKey(parts[0], parts[1]);
                relationships[key] = mapLegacyRelationship(payload.relationships[legacyKey]);
            });
        }

        const seedTime = Number.isFinite(Number(payload.lastUpdate)) ? Number(payload.lastUpdate) : Date.now();
        return {
            activePetId,
            petsById,
            relationships,
            lastSimulatedAt: seedTime,
            simVersion: 1
        };
    }

    function apply(payload, ctx) {
        if (!isObject(payload)) return payload;

        const hadHousehold = isObject(payload.household);
        const missingPetsById = !hadHousehold || !isObject(payload.household.petsById);
        if (missingPetsById) {
            const before = hadHousehold ? '[partial-household]' : payload.household;
            payload.household = buildHousehold(payload);
            recordChange(ctx, {
                path: 'household',
                kind: 'add',
                message: 'Created household simulation state from legacy pet fields.',
                before,
                after: '[derived-household]'
            });
        } else {
            const rebuilt = buildHousehold(payload);
            payload.household.activePetId = rebuilt.activePetId;
            payload.household.petsById = rebuilt.petsById;
            if (!isObject(payload.household.relationships)) payload.household.relationships = rebuilt.relationships;
            if (!Number.isFinite(Number(payload.household.lastSimulatedAt))) payload.household.lastSimulatedAt = rebuilt.lastSimulatedAt;
            if (!Number.isInteger(payload.household.simVersion)) payload.household.simVersion = 1;
            recordChange(ctx, {
                path: 'household',
                kind: 'repair',
                message: 'Repaired partial household simulation state.',
                before: '[partial-household]',
                after: '[normalized-household]'
            });
        }

        if (SaveSchema && typeof SaveSchema.stampSaveSchemaVersion === 'function') {
            SaveSchema.stampSaveSchemaVersion(payload, 2);
        } else {
            payload.saveSchemaVersion = 2;
        }
        recordChange(ctx, {
            path: 'saveSchemaVersion',
            kind: 'version',
            message: 'Stamped save schema version 2.',
            before: 1,
            after: 2
        });

        return payload;
    }

    return Object.freeze({
        fromVersion: 1,
        toVersion: 2,
        name: 'household-v1-to-v2',
        apply
    });
});
