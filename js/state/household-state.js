(function initMLFHouseholdState(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let HouseholdSimulator = null;
        let Relationships = null;
        try {
            HouseholdSimulator = require('../sim/household-simulator.js');
        } catch (_) {}
        try {
            Relationships = require('../sim/relationships.js');
        } catch (_) {}
        module.exports = factory(HouseholdSimulator, Relationships);
        return;
    }
    root.MLFHouseholdState = factory(root.MLFHouseholdSimulator, root.MLFSimRelationships);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFHouseholdState(HouseholdSimulator, Relationships) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }

    function getLegacyPets(state) {
        if (Array.isArray(state && state.pets) && state.pets.length > 0) {
            return state.pets.filter((pet) => isObject(pet));
        }
        if (isObject(state && state.pet)) return [state.pet];
        return [];
    }

    function normalizeNeed(value, fallback) {
        const num = Number(value);
        if (!Number.isFinite(num)) return fallback;
        return clamp(Math.round(num), 0, 100);
    }

    function buildPetRecordFromLegacy(pet, existingRecord, state) {
        const base = isObject(existingRecord) ? deepClone(existingRecord) : {};
        const merged = Object.assign(base, deepClone(pet));
        const roomId = (pet && pet.location && typeof pet.location.roomId === 'string')
            ? pet.location.roomId
            : ((state && typeof state.currentRoom === 'string') ? state.currentRoom : 'bedroom');
        merged.id = String(pet.id);
        merged.needs = Object.assign({}, isObject(base.needs) ? base.needs : {}, {
            hunger: normalizeNeed(pet.hunger, 70),
            energy: normalizeNeed(pet.energy, 70),
            fun: normalizeNeed(pet.happiness, 70),
            hygiene: normalizeNeed(pet.cleanliness, 70)
        });
        merged.hunger = merged.needs.hunger;
        merged.energy = merged.needs.energy;
        merged.happiness = merged.needs.fun;
        merged.cleanliness = merged.needs.hygiene;
        if (!isObject(merged.traits)) merged.traits = {};
        if (typeof pet.personality === 'string') merged.traits.personality = pet.personality;
        merged.personality = typeof pet.personality === 'string' ? pet.personality : (merged.personality || null);
        merged.location = Object.assign({}, isObject(base.location) ? base.location : {}, { roomId });
        if (!isObject(merged.schedule)) merged.schedule = {};
        if (isObject(pet.schedule) && isObject(pet.schedule.currentActivity)) merged.schedule.currentActivity = deepClone(pet.schedule.currentActivity);
        if (isObject(pet.currentActivity)) merged.schedule.currentActivity = deepClone(pet.currentActivity);
        if (HouseholdSimulator && typeof HouseholdSimulator.computeMoodFromNeeds === 'function') {
            merged.mood = HouseholdSimulator.computeMoodFromNeeds(merged);
        } else if (typeof merged.mood !== 'string') {
            merged.mood = 'neutral';
        }
        return merged;
    }

    function convertLegacyRelationshipsToHousehold(state, existingHouseholdRelationships, nowMs) {
        const out = isObject(existingHouseholdRelationships) ? deepClone(existingHouseholdRelationships) : {};
        const legacy = isObject(state && state.relationships) ? state.relationships : {};
        Object.keys(legacy).forEach((legacyKey) => {
            const rel = legacy[legacyKey];
            if (!isObject(rel)) return;
            const parts = String(legacyKey).split(/[-|]/).filter(Boolean);
            if (parts.length !== 2) return;
            const key = Relationships && typeof Relationships.relationshipKey === 'function'
                ? Relationships.relationshipKey(parts[0], parts[1])
                : (String(parts[0]) <= String(parts[1]) ? `${parts[0]}|${parts[1]}` : `${parts[1]}|${parts[0]}`);
            if (out[key] && Number.isFinite(Number(out[key].familiarity))) return;
            const legacyPoints = Number(rel.points);
            const points = Number.isFinite(legacyPoints) ? legacyPoints : 0;
            const mapped = {
                affinity: clamp(Math.round(((points - 150) / 150) * 100), -100, 100),
                familiarity: clamp(Math.round(points / 3), 0, 100),
                lastInteractionAt: Number.isFinite(Number(rel.lastInteraction)) ? Number(rel.lastInteraction) : (Number.isFinite(nowMs) ? nowMs : 0),
                tags: []
            };
            out[key] = (Relationships && typeof Relationships.normalizeRelationship === 'function')
                ? Relationships.normalizeRelationship(mapped, nowMs)
                : mapped;
        });
        return out;
    }

    function syncLegacyToHousehold(state, nowMs) {
        if (!isObject(state)) return state;
        const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
        const existingHousehold = isObject(state.household) ? state.household : {};
        const pets = getLegacyPets(state);
        const petsById = {};
        const existingPetsById = isObject(existingHousehold.petsById) ? existingHousehold.petsById : {};

        pets.forEach((pet) => {
            if (!isObject(pet) || pet.id == null) return;
            const id = String(pet.id);
            petsById[id] = buildPetRecordFromLegacy(pet, existingPetsById[id], state);
        });

        if (Object.keys(petsById).length === 0 && isObject(existingHousehold.petsById)) {
            Object.assign(petsById, deepClone(existingHousehold.petsById));
        }

        let activePetId = null;
        if (Array.isArray(state.pets) && state.pets.length > 0) {
            const idx = Number.isInteger(state.activePetIndex) ? state.activePetIndex : 0;
            const activePet = state.pets[idx] || state.pets[0];
            if (activePet && activePet.id != null) activePetId = String(activePet.id);
        } else if (isObject(state.pet) && state.pet.id != null) {
            activePetId = String(state.pet.id);
        } else if (existingHousehold.activePetId != null) {
            activePetId = String(existingHousehold.activePetId);
        }
        if (activePetId != null && !petsById[activePetId]) activePetId = Object.keys(petsById)[0] || null;

        const relationships = convertLegacyRelationshipsToHousehold(state, existingHousehold.relationships, now);
        const lastSimulatedAt = Number.isFinite(Number(existingHousehold.lastSimulatedAt))
            ? Number(existingHousehold.lastSimulatedAt)
            : now;
        const simVersion = Number.isInteger(existingHousehold.simVersion)
            ? existingHousehold.simVersion
            : ((HouseholdSimulator && HouseholdSimulator.SIM_VERSION) || 1);

        state.household = {
            activePetId,
            petsById,
            relationships,
            lastSimulatedAt,
            simVersion,
            telemetry: isObject(existingHousehold.telemetry) ? existingHousehold.telemetry : {}
        };
        return state;
    }

    function computeLegacyRelationshipPoints(rel) {
        const affinity = Number(rel && rel.affinity) || 0;
        const familiarity = Number(rel && rel.familiarity) || 0;
        return clamp(Math.round(affinity + (familiarity * 2)), 0, 300);
    }

    function syncHouseholdToLegacy(state) {
        if (!isObject(state) || !isObject(state.household)) return state;
        const household = state.household;
        const petsById = isObject(household.petsById) ? household.petsById : {};

        let orderedPets = [];
        if (Array.isArray(state.pets) && state.pets.length > 0) {
            orderedPets = state.pets
                .filter((pet) => isObject(pet))
                .map((pet) => {
                    const id = pet.id != null ? String(pet.id) : null;
                    const householdPet = id && petsById[id] ? petsById[id] : null;
                    if (!householdPet) return pet;
                    pet.hunger = normalizeNeed(householdPet.needs && householdPet.needs.hunger, pet.hunger);
                    pet.energy = normalizeNeed(householdPet.needs && householdPet.needs.energy, pet.energy);
                    pet.happiness = normalizeNeed(householdPet.needs && householdPet.needs.fun, pet.happiness);
                    pet.cleanliness = normalizeNeed(householdPet.needs && householdPet.needs.hygiene, pet.cleanliness);
                    pet.mood = householdPet.mood || pet.mood;
                    if (isObject(householdPet.schedule) && isObject(householdPet.schedule.currentActivity)) {
                        pet.currentActivity = deepClone(householdPet.schedule.currentActivity);
                    }
                    if (isObject(householdPet.location)) {
                        pet.location = Object.assign({}, pet.location || {}, householdPet.location);
                    }
                    return pet;
                });
        }

        const existingIds = new Set(orderedPets.map((pet) => String(pet.id)));
        Object.keys(petsById).sort().forEach((id) => {
            if (existingIds.has(String(id))) return;
            const householdPet = petsById[id];
            if (!isObject(householdPet)) return;
            orderedPets.push(Object.assign({}, householdPet, {
                id: Number.isFinite(Number(id)) ? Number(id) : id,
                hunger: normalizeNeed(householdPet.needs && householdPet.needs.hunger, 70),
                energy: normalizeNeed(householdPet.needs && householdPet.needs.energy, 70),
                happiness: normalizeNeed(householdPet.needs && householdPet.needs.fun, 70),
                cleanliness: normalizeNeed(householdPet.needs && householdPet.needs.hygiene, 70),
                currentActivity: isObject(householdPet.schedule && householdPet.schedule.currentActivity)
                    ? deepClone(householdPet.schedule.currentActivity)
                    : householdPet.currentActivity || null
            }));
        });

        state.pets = orderedPets;
        let activePetIndex = 0;
        if (household.activePetId != null && orderedPets.length > 0) {
            const idx = orderedPets.findIndex((pet) => String(pet.id) === String(household.activePetId));
            activePetIndex = idx >= 0 ? idx : 0;
        }
        state.activePetIndex = activePetIndex;
        state.pet = orderedPets[activePetIndex] || orderedPets[0] || null;

        const nextLegacyRelationships = {};
        const rels = isObject(household.relationships) ? household.relationships : {};
        Object.keys(rels).forEach((key) => {
            const rel = rels[key];
            const parts = String(key).split('|');
            if (parts.length !== 2) return;
            const legacyKey = (String(parts[0]) <= String(parts[1])) ? `${parts[0]}-${parts[1]}` : `${parts[1]}-${parts[0]}`;
            nextLegacyRelationships[legacyKey] = Object.assign({}, isObject(rel) ? rel : {}, {
                points: computeLegacyRelationshipPoints(rel),
                lastInteraction: Number(rel && rel.lastInteractionAt) || 0
            });
        });
        state.relationships = nextLegacyRelationships;
        return state;
    }

    function ensureHouseholdState(state, nowMs) {
        syncLegacyToHousehold(state, nowMs);
        if (HouseholdSimulator && typeof HouseholdSimulator.normalizeHousehold === 'function' && isObject(state.household)) {
            state.household = HouseholdSimulator.normalizeHousehold(state.household, Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now());
        }
        syncHouseholdToLegacy(state);
        return state;
    }

    function setLastSimulatedAt(state, nowMs) {
        if (!isObject(state)) return state;
        if (!isObject(state.household)) syncLegacyToHousehold(state, nowMs);
        if (isObject(state.household)) {
            state.household.lastSimulatedAt = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
        }
        return state;
    }

    function simulateHouseholdToNowOnState(state, nowMs, options) {
        if (!isObject(state)) return { state, meta: { skipped: true } };
        ensureHouseholdState(state, nowMs);
        if (!HouseholdSimulator || typeof HouseholdSimulator.simulateHouseholdToNow !== 'function') {
            setLastSimulatedAt(state, nowMs);
            return { state, meta: { skipped: true } };
        }
        const result = HouseholdSimulator.simulateHouseholdToNow({ household: state.household }, nowMs, options);
        if (result && result.household) state.household = result.household;
        syncHouseholdToLegacy(state);
        return { state, meta: (result && result.meta) || null };
    }

    function tickHouseholdOnState(state, dtMs, nowMs, options) {
        if (!isObject(state)) return { state, meta: { skipped: true } };
        ensureHouseholdState(state, nowMs);
        if (!HouseholdSimulator || typeof HouseholdSimulator.tickHousehold !== 'function') {
            setLastSimulatedAt(state, nowMs);
            return { state, meta: { skipped: true } };
        }
        const result = HouseholdSimulator.tickHousehold({ household: state.household }, dtMs, nowMs, options);
        if (result && result.household) state.household = result.household;
        syncHouseholdToLegacy(state);
        return { state, meta: (result && result.meta) || null };
    }

    return Object.freeze({
        syncLegacyToHousehold,
        syncHouseholdToLegacy,
        ensureHouseholdState,
        setLastSimulatedAt,
        simulateHouseholdToNowOnState,
        tickHouseholdOnState
    });
});
