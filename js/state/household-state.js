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
    const root = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {});

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

    function mergeLegacyIntoCanonicalHouseholdPet(pet, canonicalRecord, state) {
        if (!isObject(canonicalRecord)) return buildPetRecordFromLegacy(pet, canonicalRecord, state);
        const merged = buildPetRecordFromLegacy(pet, canonicalRecord, state);
        merged.id = String(pet.id);
        merged.needs = deepClone(isObject(canonicalRecord.needs) ? canonicalRecord.needs : (merged.needs || {}));
        merged.hunger = normalizeNeed(merged.needs.hunger, merged.hunger);
        merged.energy = normalizeNeed(merged.needs.energy, merged.energy);
        merged.happiness = normalizeNeed(merged.needs.fun, merged.happiness);
        merged.cleanliness = normalizeNeed(merged.needs.hygiene, merged.cleanliness);
        if (isObject(canonicalRecord.location)) merged.location = deepClone(canonicalRecord.location);
        if (isObject(canonicalRecord.schedule)) merged.schedule = deepClone(canonicalRecord.schedule);
        if (typeof canonicalRecord.mood === 'string') merged.mood = canonicalRecord.mood;
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

    function syncLegacyToHousehold(state, nowMs, options) {
        if (!isObject(state)) return state;
        const opts = isObject(options) ? options : {};
        const preferHousehold = opts.preferHousehold !== false;
        const hasExplicitLegacyPetsArray = Array.isArray(state.pets);
        const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
        const existingHousehold = isObject(state.household) ? state.household : {};
        const pets = getLegacyPets(state);
        const retainHouseholdOnlyPets = opts.retainHouseholdOnlyPets === true
            || (!hasExplicitLegacyPetsArray && pets.length === 0);
        const petsById = {};
        const existingPetsById = isObject(existingHousehold.petsById) ? existingHousehold.petsById : {};

        pets.forEach((pet) => {
            if (!isObject(pet) || pet.id == null) return;
            const id = String(pet.id);
            if (preferHousehold && isObject(existingPetsById[id])) {
                petsById[id] = mergeLegacyIntoCanonicalHouseholdPet(pet, existingPetsById[id], state);
                return;
            }
            petsById[id] = buildPetRecordFromLegacy(pet, existingPetsById[id], state);
        });

        if (retainHouseholdOnlyPets && isObject(existingHousehold.petsById)) {
            Object.keys(existingHousehold.petsById).forEach((id) => {
                if (petsById[id]) return;
                if (!isObject(existingHousehold.petsById[id])) return;
                petsById[id] = deepClone(existingHousehold.petsById[id]);
            });
        }

        let activePetId = null;
        if (Array.isArray(state.pets) && state.pets.length > 0) {
            const idx = Number.isInteger(state.activePetIndex) ? state.activePetIndex : 0;
            const activePet = state.pets[idx] || state.pets[0];
            if (activePet && activePet.id != null) activePetId = String(activePet.id);
        } else if (!preferHousehold && isObject(state.pet) && state.pet.id != null) {
            activePetId = String(state.pet.id);
        } else if (existingHousehold.activePetId != null) {
            activePetId = String(existingHousehold.activePetId);
        } else if (isObject(state.pet) && state.pet.id != null) {
            activePetId = String(state.pet.id);
        }
        if (activePetId != null && !petsById[activePetId]) activePetId = Object.keys(petsById)[0] || null;

        const relationships = preferHousehold && isObject(existingHousehold.relationships)
            ? convertLegacyRelationshipsToHousehold(state, existingHousehold.relationships, now)
            : convertLegacyRelationshipsToHousehold(state, {}, now);
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

    function ensureHouseholdState(state, nowMs, options) {
        syncLegacyToHousehold(state, nowMs, Object.assign({
            preferHousehold: true,
            retainHouseholdOnlyPets: false
        }, options || null));
        if (HouseholdSimulator && typeof HouseholdSimulator.normalizeHousehold === 'function' && isObject(state.household)) {
            state.household = HouseholdSimulator.normalizeHousehold(state.household, Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now());
        }
        syncHouseholdToLegacy(state);
        return state;
    }

    function extractEnsureSyncOptions(options) {
        if (isObject(options) && isObject(options.syncOptions)) {
            return options.syncOptions;
        }
        return null;
    }

    function isHouseholdRetentionBeatsEnabled() {
        if (root && typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled('householdRetentionBeatsEnabled'); } catch (_) {}
        }
        return true;
    }

    function ensureHouseholdRetentionAlertState(state) {
        if (!isObject(state)) return null;
        if (!isObject(state.meta)) state.meta = {};
        if (!Array.isArray(state.meta.householdRetentionAlerts)) state.meta.householdRetentionAlerts = [];
        return state.meta.householdRetentionAlerts;
    }

    function translateHouseholdBeatToAlert(beat) {
        if (!isObject(beat)) return null;
        if (beat.type === 'relationship_friend_unlocked') {
            return {
                id: `hh_${beat.type}_${beat.petAId}_${beat.petBId}`,
                type: 'household',
                priority: 'high',
                title: `💞 ${beat.petAName || 'Pet'} and ${beat.petBName || 'Pet'} became friends`,
                body: 'Open the household view to follow up with a social interaction and reinforce the bond.',
                action: { type: 'social' }
            };
        }
        if (beat.type === 'relationship_rival_unlocked') {
            return {
                id: `hh_${beat.type}_${beat.petAId}_${beat.petBId}`,
                type: 'household',
                priority: 'medium',
                title: `⚡ Tension rose between ${beat.petAName || 'pets'} and ${beat.petBName || 'pets'}`,
                body: 'A quick household check-in can redirect this rivalry into a stronger social beat.',
                action: { type: 'social' }
            };
        }
        if (beat.type === 'pet_needs_attention') {
            return {
                id: `hh_${beat.type}_${beat.petId}_${Math.floor((Number(beat.at) || 0) / 3600000)}`,
                type: 'household',
                priority: 'medium',
                title: `🫶 ${beat.petName || 'A pet'} needs a quick check-in`,
                body: 'One care action now can stabilize the household mood and keep your session flowing.',
                action: { type: 'care' }
            };
        }
        if (beat.type === 'pet_happy_moment') {
            return {
                id: `hh_${beat.type}_${beat.petId}_${Math.floor((Number(beat.at) || 0) / 86400000)}`,
                type: 'household',
                priority: 'low',
                title: `✨ ${beat.petName || 'A pet'} had a happy moment`,
                body: 'Follow up with play or social time to turn this into relationship progress.',
                action: { type: 'social' }
            };
        }
        return null;
    }

    function applyHouseholdRetentionBeatsToState(state, beats) {
        if (!isHouseholdRetentionBeatsEnabled()) return 0;
        if (!isObject(state) || !Array.isArray(beats) || beats.length === 0) return 0;
        const alerts = ensureHouseholdRetentionAlertState(state);
        if (!alerts) return 0;
        const seen = new Set(alerts.map((a) => a && a.id).filter(Boolean));
        let added = 0;
        beats.forEach((beat) => {
            const alert = translateHouseholdBeatToAlert(beat);
            if (!alert || !alert.id || seen.has(alert.id)) return;
            seen.add(alert.id);
            alert.createdAt = Date.now();
            alerts.push(alert);
            added += 1;
            if (root && typeof root.addReminderCenterItem === 'function') {
                try { root.addReminderCenterItem('household', alert.title, alert.body, alert.action || { type: 'social' }); } catch (_) {}
            }
        });
        if (alerts.length > 20) state.meta.householdRetentionAlerts = alerts.slice(-20);
        return added;
    }

    function setLastSimulatedAt(state, nowMs) {
        if (!isObject(state)) return state;
        if (!isObject(state.household)) syncLegacyToHousehold(state, nowMs, { preferHousehold: true });
        if (isObject(state.household)) {
            state.household.lastSimulatedAt = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
        }
        return state;
    }

    function simulateHouseholdToNowOnState(state, nowMs, options) {
        if (!isObject(state)) return { state, meta: { skipped: true } };
        ensureHouseholdState(state, nowMs, extractEnsureSyncOptions(options));
        if (!HouseholdSimulator || typeof HouseholdSimulator.simulateHouseholdToNow !== 'function') {
            setLastSimulatedAt(state, nowMs);
            return { state, meta: { skipped: true } };
        }
        const result = HouseholdSimulator.simulateHouseholdToNow({ household: state.household }, nowMs, options);
        if (result && result.household) state.household = result.household;
        syncHouseholdToLegacy(state);
        if (result && result.meta && Array.isArray(result.meta.retentionBeats)) {
            applyHouseholdRetentionBeatsToState(state, result.meta.retentionBeats);
        }
        return { state, meta: (result && result.meta) || null };
    }

    function tickHouseholdOnState(state, dtMs, nowMs, options) {
        if (!isObject(state)) return { state, meta: { skipped: true } };
        ensureHouseholdState(state, nowMs, extractEnsureSyncOptions(options));
        if (!HouseholdSimulator || typeof HouseholdSimulator.tickHousehold !== 'function') {
            setLastSimulatedAt(state, nowMs);
            return { state, meta: { skipped: true } };
        }
        const result = HouseholdSimulator.tickHousehold({ household: state.household }, dtMs, nowMs, options);
        if (result && result.household) state.household = result.household;
        syncHouseholdToLegacy(state);
        if (result && result.meta && Array.isArray(result.meta.retentionBeats)) {
            applyHouseholdRetentionBeatsToState(state, result.meta.retentionBeats);
        }
        return { state, meta: (result && result.meta) || null };
    }

    return Object.freeze({
        syncLegacyToHousehold,
        syncHouseholdToLegacy,
        ensureHouseholdState,
        setLastSimulatedAt,
        simulateHouseholdToNowOnState,
        tickHouseholdOnState,
        applyHouseholdRetentionBeatsToState
    });
});
