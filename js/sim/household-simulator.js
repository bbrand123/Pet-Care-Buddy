(function initMLFHouseholdSimulator(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let Autonomy = null;
        let Relationships = null;
        let OfflineConfig = null;
        try {
            Autonomy = require('./autonomy.js');
        } catch (_) {}
        try {
            Relationships = require('./relationships.js');
        } catch (_) {}
        try {
            OfflineConfig = require('../save/offline-progression-config.js');
        } catch (_) {}
        module.exports = factory(Autonomy, Relationships, OfflineConfig);
        return;
    }
    root.MLFHouseholdSimulator = factory(root.MLFSimAutonomy, root.MLFSimRelationships, root.MLFOfflineProgressionConfig);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFHouseholdSimulator(Autonomy, Relationships, OfflineConfig) {
    'use strict';

    const OFFLINE = OfflineConfig || {};
    const SIM_VERSION = 1;
    const FIXED_STEP_MS = Number(OFFLINE.HOUSEHOLD_FIXED_STEP_MS) || (60 * 1000);
    const MAX_CATCHUP_MS = Number(OFFLINE.HOUSEHOLD_MAX_CATCHUP_MS) || (72 * 60 * 60 * 1000);

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function sortedPetIds(petsById) {
        return Object.keys(petsById || {}).sort((a, b) => {
            const an = Number(a);
            const bn = Number(b);
            if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
            return String(a).localeCompare(String(b));
        });
    }

    function getNeed(pet, key, fallback) {
        if (!pet) return fallback;
        if (pet.needs && Number.isFinite(Number(pet.needs[key]))) return Number(pet.needs[key]);
        if (key === 'fun' && Number.isFinite(Number(pet.happiness))) return Number(pet.happiness);
        if (key === 'hygiene' && Number.isFinite(Number(pet.cleanliness))) return Number(pet.cleanliness);
        if (Number.isFinite(Number(pet[key]))) return Number(pet[key]);
        return fallback;
    }

    function setNeed(pet, key, value) {
        if (!pet.needs || !isObject(pet.needs)) pet.needs = {};
        const clamped = clamp(Math.round(value), 0, 100);
        pet.needs[key] = clamped;
        if (key === 'fun') pet.happiness = clamped;
        else if (key === 'hygiene') pet.cleanliness = clamped;
        else pet[key] = clamped;
    }

    function computeMoodFromNeeds(pet) {
        const hunger = getNeed(pet, 'hunger', 50);
        const energy = getNeed(pet, 'energy', 50);
        const fun = getNeed(pet, 'fun', 50);
        const hygiene = getNeed(pet, 'hygiene', 50);
        const avg = (hunger + energy + fun + hygiene) / 4;
        const anyCritical = hunger < 20 || energy < 20 || fun < 20 || hygiene < 20;
        if (avg >= 75 && !anyCritical) return 'happy';
        if (avg >= 55 && !anyCritical) return 'content';
        if (anyCritical || avg < 35) return 'sad';
        if (avg < 50) return 'stressed';
        return 'neutral';
    }

    function normalizePetRecord(rawPet, nowMs) {
        const pet = isObject(rawPet) ? deepClone(rawPet) : {};
        const id = pet.id != null ? String(pet.id) : '';
        pet.id = id;
        pet.name = typeof pet.name === 'string' ? pet.name : 'Pet';
        pet.type = typeof pet.type === 'string' ? pet.type : 'cat';
        if (!isObject(pet.location)) pet.location = { roomId: 'bedroom' };
        if (typeof pet.location.roomId !== 'string') pet.location.roomId = 'bedroom';
        if (!isObject(pet.traits)) pet.traits = {};
        if (typeof pet.personality === 'string' && typeof pet.traits.personality !== 'string') {
            pet.traits.personality = pet.personality;
        }
        setNeed(pet, 'hunger', getNeed(pet, 'hunger', 70));
        setNeed(pet, 'energy', getNeed(pet, 'energy', 70));
        setNeed(pet, 'fun', getNeed(pet, 'fun', 70));
        setNeed(pet, 'hygiene', getNeed(pet, 'hygiene', 70));
        if (!isObject(pet.schedule)) pet.schedule = {};
        pet.schedule.currentActivity = (Autonomy && typeof Autonomy.normalizeActivity === 'function')
            ? Autonomy.normalizeActivity(pet.schedule.currentActivity || pet.currentActivity, nowMs)
            : (pet.schedule.currentActivity || pet.currentActivity || { type: 'idle', startedAtMs: nowMs, durationMs: FIXED_STEP_MS, endsAtMs: nowMs + FIXED_STEP_MS });
        pet.currentActivity = Object.assign({}, pet.schedule.currentActivity);
        pet.mood = typeof pet.mood === 'string' ? pet.mood : computeMoodFromNeeds(pet);
        if (!Number.isFinite(Number(pet.lastAutonomyDecisionAt))) pet.lastAutonomyDecisionAt = 0;
        return pet;
    }

    function normalizeRelationships(map, nowMs) {
        if (!Relationships || typeof Relationships.normalizeRelationship !== 'function') {
            return isObject(map) ? map : {};
        }
        const out = {};
        const src = isObject(map) ? map : {};
        Object.keys(src).forEach((key) => {
            if (key.indexOf('|') === -1) return;
            out[key] = Relationships.normalizeRelationship(src[key], nowMs);
        });
        return out;
    }

    function normalizeHousehold(household, nowMs) {
        const source = isObject(household) ? deepClone(household) : {};
        const petsById = {};
        if (isObject(source.petsById)) {
            Object.keys(source.petsById).forEach((sourceKey) => {
                const normalizedPet = normalizePetRecord(source.petsById[sourceKey], nowMs);
                if (!normalizedPet.id) normalizedPet.id = sourceKey;
                if (normalizedPet.id) petsById[normalizedPet.id] = normalizedPet;
            });
        }
        const petIds = sortedPetIds(petsById);
        const activePetId = source.activePetId != null && petsById[String(source.activePetId)]
            ? String(source.activePetId)
            : (petIds[0] || null);
        return {
            activePetId,
            petsById,
            relationships: normalizeRelationships(source.relationships, nowMs),
            lastSimulatedAt: Number.isFinite(Number(source.lastSimulatedAt)) ? Number(source.lastSimulatedAt) : (Number.isFinite(nowMs) ? nowMs : 0),
            simVersion: Number.isInteger(source.simVersion) ? source.simVersion : SIM_VERSION,
            telemetry: isObject(source.telemetry) ? source.telemetry : {}
        };
    }

    function applyActivityEffects(nextPet, dtMinutes) {
        const activity = nextPet.schedule && nextPet.schedule.currentActivity ? nextPet.schedule.currentActivity : { type: 'idle' };
        const hunger = getNeed(nextPet, 'hunger', 70);
        const energy = getNeed(nextPet, 'energy', 70);
        const fun = getNeed(nextPet, 'fun', 70);
        const hygiene = getNeed(nextPet, 'hygiene', 70);

        let h = hunger;
        let e = energy;
        let f = fun;
        let hy = hygiene;

        const baseHungerDecay = 0.6 * dtMinutes;
        const baseHygieneDecay = 0.25 * dtMinutes;
        const baseFunDecay = 0.35 * dtMinutes;

        h -= baseHungerDecay;
        hy -= baseHygieneDecay;
        f -= baseFunDecay;

        if (activity.type === 'eat') {
            h += 6 * dtMinutes;
            e += 0.5 * dtMinutes;
        } else if (activity.type === 'sleep') {
            e += 5 * dtMinutes;
            h -= 0.4 * dtMinutes;
            f -= 0.1 * dtMinutes;
            // P1-09: sleep provides a small hygiene recovery so hygiene can never
            // bottom-out permanently during long offline periods.
            hy += 0.15 * dtMinutes;
        } else if (activity.type === 'play') {
            f += 4 * dtMinutes;
            e -= 2 * dtMinutes;
            h -= 1.2 * dtMinutes;
            hy -= 0.4 * dtMinutes;
        } else if (activity.type === 'socialize') {
            f += 2.5 * dtMinutes;
            e -= 0.8 * dtMinutes;
            h -= 0.7 * dtMinutes;
        } else if (activity.type === 'exploreRoom') {
            f += 1.2 * dtMinutes;
            e -= 1 * dtMinutes;
            h -= 0.8 * dtMinutes;
            hy -= 0.3 * dtMinutes;
        } else {
            e += 0.4 * dtMinutes;
            // P1-09: idle activity provides passive hygiene recovery.
            hy += 0.05 * dtMinutes;
        }

        setNeed(nextPet, 'hunger', h);
        setNeed(nextPet, 'energy', e);
        setNeed(nextPet, 'fun', f);
        setNeed(nextPet, 'hygiene', hy);
        nextPet.mood = computeMoodFromNeeds(nextPet);
    }

    function chooseNextActivityIfNeeded(nextPet, householdContext, nowMs) {
        const current = nextPet.schedule && nextPet.schedule.currentActivity;
        const needsDecision = !current || !Number.isFinite(Number(current.endsAtMs)) || Number(current.endsAtMs) <= nowMs;
        if (!needsDecision) return;
        if (Autonomy && typeof Autonomy.decideNextActivity === 'function') {
            const nextActivity = Autonomy.decideNextActivity(nextPet, householdContext, nowMs);
            nextPet.schedule.currentActivity = nextActivity;
            nextPet.currentActivity = Object.assign({}, nextActivity);
            nextPet.lastAutonomyDecisionAt = Number.isFinite(nowMs) ? nowMs : 0;
            return;
        }
        const fallback = { type: 'idle', startedAtMs: nowMs, durationMs: FIXED_STEP_MS, endsAtMs: nowMs + FIXED_STEP_MS };
        nextPet.schedule.currentActivity = fallback;
        nextPet.currentActivity = Object.assign({}, fallback);
        nextPet.lastAutonomyDecisionAt = Number.isFinite(nowMs) ? nowMs : 0;
    }

    function tickPet(pet, context, dtMs, nowMs) {
        const nextPet = normalizePetRecord(pet, nowMs);
        const prevPet = normalizePetRecord(pet, nowMs);
        const options = (context && context.options) || {};
        const activePetId = context && context.activePetId != null ? String(context.activePetId) : null;
        const isActive = activePetId != null && String(nextPet.id) === activePetId;

        chooseNextActivityIfNeeded(nextPet, context, nowMs);

        if (!(options.skipActivePetNeeds && isActive)) {
            applyActivityEffects(nextPet, dtMs / 60000);
        } else {
            nextPet.mood = computeMoodFromNeeds(nextPet);
        }

        if (nextPet.schedule && nextPet.schedule.currentActivity) {
            nextPet.currentActivity = Object.assign({}, nextPet.schedule.currentActivity);
        }

        const events = [];
        const activity = nextPet.schedule && nextPet.schedule.currentActivity;
        if (activity && activity.type === 'socialize' && activity.targetPetId != null) {
            events.push({
                type: 'socialize',
                petId: String(nextPet.id),
                targetPetId: String(activity.targetPetId),
                at: nowMs
            });
        }
        if ((prevPet.mood !== nextPet.mood) && (nextPet.mood === 'sad' || nextPet.mood === 'happy')) {
            events.push({
                type: 'mood-shift',
                petId: String(nextPet.id),
                petName: nextPet.name || 'Pet',
                mood: nextPet.mood,
                previousMood: prevPet.mood || 'neutral',
                at: nowMs
            });
        }

        return { pet: nextPet, events };
    }

    function applySocialEvents(household, socialEvents, dtMs, nowMs) {
        if (!Relationships) return { household, retentionBeats: [] };
        const relationships = Object.assign({}, household.relationships || {});
        const petsById = household.petsById || {};
        const seenPairs = new Set();
        const retentionBeats = [];

        socialEvents
            .slice()
            .sort((a, b) => String(a.petId).localeCompare(String(b.petId)))
            .forEach((event) => {
                if (!event || event.type !== 'socialize') return;
                if (event.petId === event.targetPetId) return;
                const petA = petsById[String(event.petId)];
                const petB = petsById[String(event.targetPetId)];
                if (!petA || !petB) return;
                const key = Relationships.relationshipKey(petA.id, petB.id);
                if (seenPairs.has(key)) return;
                seenPairs.add(key);
                const current = relationships[key] || Relationships.createRelationship(nowMs);
                const result = Relationships.applySocialInteraction(current, petA, petB, nowMs);
                relationships[key] = result.relationship;
                if (typeof Relationships.detectRetentionBeats === 'function') {
                    const beats = Relationships.detectRetentionBeats(current, result.relationship, petA, petB);
                    if (Array.isArray(beats) && beats.length) retentionBeats.push.apply(retentionBeats, beats);
                }
            });

        Object.keys(relationships).forEach((key) => {
            relationships[key] = Relationships.applyPassiveDrift(relationships[key], nowMs, dtMs);
        });

        return { household: Object.assign({}, household, { relationships }), retentionBeats };
    }

    function tickNormalizedHousehold(household, dtMs, nowMs, options) {
        const next = normalizeHousehold(household, nowMs);
        const petIds = sortedPetIds(next.petsById);
        const socialEvents = [];
        const retentionBeats = [];
        const tickContext = {
            activePetId: next.activePetId,
            petsById: next.petsById,
            relationships: next.relationships,
            options: options || {}
        };

        petIds.forEach((petId) => {
            const result = tickPet(next.petsById[petId], tickContext, dtMs, nowMs);
            next.petsById[petId] = result.pet;
            if (Array.isArray(result.events)) socialEvents.push.apply(socialEvents, result.events);
        });

        socialEvents.forEach((event) => {
            if (event && event.type === 'mood-shift') {
                retentionBeats.push({
                    type: event.mood === 'happy' ? 'pet_happy_moment' : 'pet_needs_attention',
                    priority: event.mood === 'happy' ? 'low' : 'medium',
                    petId: event.petId,
                    petName: event.petName,
                    mood: event.mood,
                    previousMood: event.previousMood,
                    at: event.at
                });
            }
        });

        const socialResult = applySocialEvents(next, socialEvents, dtMs, nowMs);
        const withRelationships = socialResult && socialResult.household ? socialResult.household : next;
        if (socialResult && Array.isArray(socialResult.retentionBeats) && socialResult.retentionBeats.length) {
            retentionBeats.push.apply(retentionBeats, socialResult.retentionBeats);
        }
        withRelationships.lastSimulatedAt = Number.isFinite(nowMs) ? nowMs : withRelationships.lastSimulatedAt;
        withRelationships.simVersion = SIM_VERSION;
        return { household: withRelationships, meta: { socialEventCount: socialEvents.length, retentionBeats } };
    }

    function tickHousehold(stateOrHousehold, dtMs, nowMs, options) {
        const hasRoot = isObject(stateOrHousehold) && isObject(stateOrHousehold.household);
        const sourceHousehold = hasRoot ? stateOrHousehold.household : stateOrHousehold;
        const result = tickNormalizedHousehold(sourceHousehold, Math.max(0, Number(dtMs) || 0), nowMs, options);
        if (!hasRoot) return result;
        const nextState = Object.assign({}, stateOrHousehold, { household: result.household });
        return { state: nextState, household: result.household, meta: result.meta };
    }

    // P1-08: lightweight tick that operates on an already-normalised household object
    // without a full deep-clone, used by the simulateHouseholdToNow inner loop.
    function _tickNormalizedHouseholdInPlace(household, dtMs, nowMs, options) {
        const petIds = sortedPetIds(household.petsById);
        const socialEvents = [];
        const retentionBeats = [];
        const tickContext = {
            activePetId: household.activePetId,
            petsById: household.petsById,
            relationships: household.relationships,
            options: options || {}
        };

        petIds.forEach((petId) => {
            const result = tickPet(household.petsById[petId], tickContext, dtMs, nowMs);
            household.petsById[petId] = result.pet;
            if (Array.isArray(result.events)) socialEvents.push.apply(socialEvents, result.events);
        });

        socialEvents.forEach((event) => {
            if (event && event.type === 'mood-shift') {
                retentionBeats.push({
                    type: event.mood === 'happy' ? 'pet_happy_moment' : 'pet_needs_attention',
                    priority: event.mood === 'happy' ? 'low' : 'medium',
                    petId: event.petId,
                    petName: event.petName,
                    mood: event.mood,
                    previousMood: event.previousMood,
                    at: event.at
                });
            }
        });

        const socialResult = applySocialEvents(household, socialEvents, dtMs, nowMs);
        const withRelationships = socialResult && socialResult.household ? socialResult.household : household;
        if (socialResult && Array.isArray(socialResult.retentionBeats) && socialResult.retentionBeats.length) {
            retentionBeats.push.apply(retentionBeats, socialResult.retentionBeats);
        }
        withRelationships.lastSimulatedAt = Number.isFinite(nowMs) ? nowMs : withRelationships.lastSimulatedAt;
        withRelationships.simVersion = SIM_VERSION;
        return { household: withRelationships, meta: { socialEventCount: socialEvents.length, retentionBeats } };
    }

    // P1-10: module-level set tracks in-progress simulations to prevent double-decay.
    const _simInProgress = new WeakSet();

    function simulateHouseholdToNow(state, nowMs, options) {
        const hasRoot = isObject(state) && isObject(state.household);
        // P1-10: guard against concurrent calls on the same state object.
        const guardKey = isObject(state) ? state : null;
        if (guardKey && _simInProgress.has(guardKey)) {
            return hasRoot
                ? { state, household: state.household, meta: { steps: 0, rawElapsedMs: 0, appliedElapsedMs: 0, catchUpClamped: false, socialEventCount: 0, retentionBeats: [] } }
                : { household: (isObject(state) ? state : {}), meta: { steps: 0, rawElapsedMs: 0, appliedElapsedMs: 0, catchUpClamped: false, socialEventCount: 0, retentionBeats: [] } };
        }
        if (guardKey) _simInProgress.add(guardKey);

        const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
        const rootState = hasRoot ? deepClone(state) : { household: deepClone(isObject(state) ? state : {}) };
        let household = normalizeHousehold(rootState.household, now);

        const startAt = Number.isFinite(Number(household.lastSimulatedAt)) ? Number(household.lastSimulatedAt) : now;
        const rawElapsedMs = Math.max(0, now - startAt);
        const catchupCapMs = Math.max(FIXED_STEP_MS, Number(options && options.maxCatchupMs) || MAX_CATCHUP_MS);
        const appliedElapsedMs = Math.min(rawElapsedMs, catchupCapMs);
        const clamped = appliedElapsedMs < rawElapsedMs;

        let cursor = startAt;
        let steps = 0;
        let aggregateSocialEvents = 0;
        let aggregateRetentionBeats = [];
        if (appliedElapsedMs > 0) {
            const target = startAt + appliedElapsedMs;
            while (cursor < target) {
                const step = Math.min(FIXED_STEP_MS, target - cursor);
                cursor += step;
                // P1-08: household is already normalised from the previous iteration;
                // call tickNormalizedHousehold with _skipNormalize to avoid a full
                // JSON deep-clone on every one of potentially thousands of steps.
                const tickResult = _tickNormalizedHouseholdInPlace(household, step, cursor, options && options.tickOptions);
                household = tickResult.household;
                steps++;
                aggregateSocialEvents += (tickResult.meta && tickResult.meta.socialEventCount) || 0;
                if (tickResult.meta && Array.isArray(tickResult.meta.retentionBeats) && tickResult.meta.retentionBeats.length) {
                    aggregateRetentionBeats = aggregateRetentionBeats.concat(tickResult.meta.retentionBeats);
                }
            }
        }

        if (guardKey) _simInProgress.delete(guardKey);

        household.lastSimulatedAt = now;
        household.simVersion = SIM_VERSION;
        household.telemetry = Object.assign({}, household.telemetry || {}, {
            catchUpClamped: !!clamped,
            lastCatchUpAppliedMs: appliedElapsedMs,
            lastCatchUpRawMs: rawElapsedMs
        });

        rootState.household = household;
        const meta = {
            steps,
            rawElapsedMs,
            appliedElapsedMs,
            catchUpClamped: !!clamped,
            socialEventCount: aggregateSocialEvents,
            retentionBeats: aggregateRetentionBeats
        };
        return hasRoot ? { state: rootState, household, meta } : { household, meta };
    }

    return Object.freeze({
        SIM_VERSION,
        FIXED_STEP_MS,
        MAX_CATCHUP_MS,
        normalizeHousehold,
        tickPet,
        tickHousehold,
        simulateHouseholdToNow,
        computeMoodFromNeeds
    });
});
