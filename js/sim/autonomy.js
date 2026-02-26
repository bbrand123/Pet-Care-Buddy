(function initMLFSimAutonomy(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFSimAutonomy = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSimAutonomy() {
    'use strict';

    const ACTIVITY_DURATIONS_MS = Object.freeze({
        eat: 6 * 60 * 1000,
        sleep: 20 * 60 * 1000,
        play: 12 * 60 * 1000,
        socialize: 10 * 60 * 1000,
        idle: 8 * 60 * 1000,
        exploreRoom: 9 * 60 * 1000
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }

    function getNeed(pet, key, fallback) {
        if (!pet || typeof pet !== 'object') return fallback;
        if (pet.needs && Number.isFinite(Number(pet.needs[key]))) return Number(pet.needs[key]);
        if (key === 'fun' && Number.isFinite(Number(pet.happiness))) return Number(pet.happiness);
        if (key === 'hygiene' && Number.isFinite(Number(pet.cleanliness))) return Number(pet.cleanliness);
        if (Number.isFinite(Number(pet[key]))) return Number(pet[key]);
        return fallback;
    }

    function getPersonalityKey(pet) {
        if (!pet || typeof pet !== 'object') return '';
        if (typeof pet.personality === 'string') return pet.personality.toLowerCase();
        if (pet.traits && typeof pet.traits.personality === 'string') return pet.traits.personality.toLowerCase();
        return '';
    }

    function getThresholds(pet) {
        const personality = getPersonalityKey(pet);
        const thresholds = {
            hunger: 35,
            energy: 30,
            fun: 35,
            hygiene: 25
        };
        if (personality === 'playful') thresholds.fun = 45;
        if (personality === 'lazy') thresholds.energy = 40;
        if (personality === 'grumpy') thresholds.social = 60;
        if (personality === 'energetic') thresholds.energy = 24;
        return thresholds;
    }

    function getCurrentHour(nowMs) {
        if (!Number.isFinite(nowMs)) return 12;
        return new Date(nowMs).getUTCHours();
    }

    function pickSocialTarget(pet, householdContext) {
        const selfId = String(pet && pet.id);
        const petsById = (householdContext && householdContext.petsById) || {};
        const relationships = (householdContext && householdContext.relationships) || {};
        const room = pet && pet.location && pet.location.roomId;
        let best = null;

        Object.keys(petsById).sort().forEach((candidateId) => {
            if (candidateId === selfId) return;
            const candidate = petsById[candidateId];
            if (!candidate) return;
            let score = 0;
            const sameRoom = room && candidate.location && candidate.location.roomId === room;
            if (sameRoom) score += 3;
            const key = selfId <= candidateId ? (selfId + '|' + candidateId) : (candidateId + '|' + selfId);
            const rel = relationships[key];
            if (rel && Number.isFinite(Number(rel.familiarity))) score += Number(rel.familiarity) * 0.03;
            if (rel && Number.isFinite(Number(rel.affinity))) score += Number(rel.affinity) * 0.02;
            score += clamp((100 - getNeed(candidate, 'fun', 50)) * 0.02, 0, 2);
            score += (Math.random() - 0.5) * 0.5;
            if (!best || score > best.score) {
                best = { petId: String(candidateId), score };
            }
        });

        return best ? best.petId : null;
    }

    function makeActivity(type, nowMs, extra) {
        const durationMs = ACTIVITY_DURATIONS_MS[type] || ACTIVITY_DURATIONS_MS.idle;
        return Object.assign({
            type,
            startedAtMs: Number.isFinite(nowMs) ? nowMs : 0,
            durationMs,
            endsAtMs: (Number.isFinite(nowMs) ? nowMs : 0) + durationMs
        }, extra || null);
    }

    function normalizeActivity(activity, nowMs) {
        if (!activity || typeof activity !== 'object') {
            return makeActivity('idle', nowMs);
        }
        const type = typeof activity.type === 'string' ? activity.type : 'idle';
        const durationMs = Math.max(1000, Number(activity.durationMs) || ACTIVITY_DURATIONS_MS[type] || ACTIVITY_DURATIONS_MS.idle);
        const startedAtMs = Number.isFinite(Number(activity.startedAtMs)) ? Number(activity.startedAtMs) : (Number.isFinite(nowMs) ? nowMs : 0);
        const endsAtMs = Number.isFinite(Number(activity.endsAtMs)) ? Number(activity.endsAtMs) : (startedAtMs + durationMs);
        const next = {
            type,
            startedAtMs,
            durationMs,
            endsAtMs
        };
        if (activity.targetPetId != null) next.targetPetId = String(activity.targetPetId);
        if (activity.roomId != null) next.roomId = String(activity.roomId);
        return next;
    }

    function decideNextActivity(pet, householdContext, nowMs) {
        const thresholds = getThresholds(pet);
        const hunger = getNeed(pet, 'hunger', 50);
        const energy = getNeed(pet, 'energy', 50);
        const fun = getNeed(pet, 'fun', 50);
        const hygiene = getNeed(pet, 'hygiene', 50);
        const hour = getCurrentHour(nowMs);
        const petsById = (householdContext && householdContext.petsById) || {};
        const petCount = Object.keys(petsById).length;

        if (energy <= thresholds.energy || (hour >= 22 || hour <= 5) && energy < 60) {
            return makeActivity('sleep', nowMs);
        }
        if (hunger <= thresholds.hunger) {
            return makeActivity('eat', nowMs);
        }
        if (fun <= thresholds.fun) {
            return makeActivity('play', nowMs);
        }

        const socialHygieneMin = thresholds.social != null ? Math.max(15, thresholds.social) : 15;
        if (petCount > 1 && hygiene > socialHygieneMin) {
            const targetPetId = pickSocialTarget(pet, householdContext);
            if (targetPetId) return makeActivity('socialize', nowMs, { targetPetId });
        }

        if (hour >= 8 && hour <= 20) {
            return makeActivity('exploreRoom', nowMs, {
                roomId: (pet && pet.location && pet.location.roomId) ? pet.location.roomId : 'bedroom'
            });
        }

        return makeActivity('idle', nowMs);
    }

    return Object.freeze({
        ACTIVITY_DURATIONS_MS,
        normalizeActivity,
        decideNextActivity
    });
});
