(function initMLFSimRelationships(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFSimRelationships = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSimRelationships() {
    'use strict';

    const AFFINITY_MIN = -100;
    const AFFINITY_MAX = 100;
    const FAMILIARITY_MIN = 0;
    const FAMILIARITY_MAX = 100;
    const FRIEND_AFFINITY = 60;
    const RIVAL_AFFINITY = -60;
    const TAG_FAMILIARITY_MIN = 50;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    }

    function relationshipKey(petAId, petBId) {
        const a = String(petAId);
        const b = String(petBId);
        return a <= b ? (a + '|' + b) : (b + '|' + a);
    }

    function createRelationship(nowMs) {
        return {
            affinity: 0,
            familiarity: 0,
            lastInteractionAt: Number.isFinite(nowMs) ? nowMs : 0,
            tags: []
        };
    }

    function normalizeTags(tags) {
        if (!Array.isArray(tags)) return [];
        const seen = new Set();
        const out = [];
        for (let i = 0; i < tags.length; i++) {
            const value = String(tags[i] || '').trim().toLowerCase();
            if (!value || seen.has(value)) continue;
            seen.add(value);
            out.push(value);
        }
        return out;
    }

    function normalizeRelationship(rel, nowMs) {
        const base = (rel && typeof rel === 'object' && !Array.isArray(rel)) ? rel : createRelationship(nowMs);
        const normalized = {
            affinity: clamp(Number(base.affinity) || 0, AFFINITY_MIN, AFFINITY_MAX),
            familiarity: clamp(Number(base.familiarity) || 0, FAMILIARITY_MIN, FAMILIARITY_MAX),
            lastInteractionAt: Number.isFinite(Number(base.lastInteractionAt)) ? Number(base.lastInteractionAt) : 0,
            tags: normalizeTags(base.tags)
        };
        return updateRelationshipTags(normalized);
    }

    function updateRelationshipTags(rel) {
        const next = Object.assign({}, rel || {});
        const affinity = clamp(Number(next.affinity) || 0, AFFINITY_MIN, AFFINITY_MAX);
        const familiarity = clamp(Number(next.familiarity) || 0, FAMILIARITY_MIN, FAMILIARITY_MAX);
        const tags = [];
        if (familiarity >= TAG_FAMILIARITY_MIN && affinity >= FRIEND_AFFINITY) tags.push('friend');
        if (familiarity >= TAG_FAMILIARITY_MIN && affinity <= RIVAL_AFFINITY) tags.push('rival');
        next.affinity = affinity;
        next.familiarity = familiarity;
        next.tags = tags;
        return next;
    }

    function getPetMoodScore(pet) {
        const mood = String((pet && pet.mood) || '').toLowerCase();
        if (mood === 'happy') return 2;
        if (mood === 'content') return 1;
        if (mood === 'stressed') return -1;
        if (mood === 'sad') return -2;
        return 0;
    }

    function getPersonalityKey(pet) {
        if (!pet || typeof pet !== 'object') return '';
        if (typeof pet.personality === 'string') return pet.personality.toLowerCase();
        if (pet.traits && typeof pet.traits.personality === 'string') return pet.traits.personality.toLowerCase();
        return '';
    }

    function getTraitCompatibility(petA, petB) {
        const a = getPersonalityKey(petA);
        const b = getPersonalityKey(petB);
        if (!a || !b) return 0;
        if (a === b) return 1;
        const clashes = {
            grumpy: new Set(['playful', 'energetic', 'shy']),
            lazy: new Set(['energetic']),
            shy: new Set(['grumpy']),
            energetic: new Set(['lazy']),
            playful: new Set(['grumpy'])
        };
        if (clashes[a] && clashes[a].has(b)) return -1;
        if (clashes[b] && clashes[b].has(a)) return -1;
        return 0;
    }

    function getCooldownMultiplier(lastInteractionAt, nowMs) {
        const now = Number.isFinite(nowMs) ? nowMs : 0;
        const last = Number.isFinite(lastInteractionAt) ? lastInteractionAt : 0;
        if (last <= 0 || now <= last) return 0.25;
        const delta = now - last;
        if (delta >= 10 * 60 * 1000) return 1;
        return clamp(0.25 + (delta / (10 * 60 * 1000)) * 0.75, 0.25, 1);
    }

    function applySocialInteraction(rel, petA, petB, nowMs, options) {
        const current = normalizeRelationship(rel, nowMs);
        const moodScore = getPetMoodScore(petA) + getPetMoodScore(petB);
        const traitScore = getTraitCompatibility(petA, petB);
        const cooldown = getCooldownMultiplier(current.lastInteractionAt, nowMs);
        const baseAffinity = Number(options && options.baseAffinityDelta) || 2;
        const baseFamiliarity = Number(options && options.baseFamiliarityDelta) || 2;

        const rawAffinity = (baseAffinity + moodScore + traitScore) * cooldown;
        const deltaAffinity = clamp(Math.round(rawAffinity), -6, 6);
        const deltaFamiliarity = clamp(Math.max(1, Math.round(baseFamiliarity * (0.5 + 0.5 * cooldown))), 1, 4);

        const next = updateRelationshipTags({
            affinity: clamp(current.affinity + deltaAffinity, AFFINITY_MIN, AFFINITY_MAX),
            familiarity: clamp(current.familiarity + deltaFamiliarity, FAMILIARITY_MIN, FAMILIARITY_MAX),
            lastInteractionAt: Number.isFinite(nowMs) ? nowMs : current.lastInteractionAt,
            tags: current.tags
        });

        return {
            relationship: next,
            deltaAffinity,
            deltaFamiliarity,
            cooldownMultiplier: cooldown
        };
    }

    function applyPassiveDrift(rel, nowMs, dtMs) {
        const current = normalizeRelationship(rel, nowMs);
        const now = Number.isFinite(nowMs) ? nowMs : current.lastInteractionAt;
        const dt = Math.max(0, Number(dtMs) || 0);
        if (dt <= 0) return current;

        const sinceLast = Math.max(0, now - (Number(current.lastInteractionAt) || 0));
        let familiarity = current.familiarity;
        let affinity = current.affinity;

        if (sinceLast > 12 * 60 * 60 * 1000) {
            const famDecayPerHour = 0.5;
            const famDecay = (dt / 3600000) * famDecayPerHour;
            familiarity = familiarity - famDecay;
        }

        if (sinceLast > 24 * 60 * 60 * 1000 && affinity !== 0) {
            const affinityRelaxPerHour = 0.25;
            const shift = (dt / 3600000) * affinityRelaxPerHour;
            if (affinity > 0) affinity = Math.max(0, affinity - shift);
            else affinity = Math.min(0, affinity + shift);
        }

        return updateRelationshipTags({
            affinity: clamp(Math.round(affinity), AFFINITY_MIN, AFFINITY_MAX),
            familiarity: clamp(Math.round(familiarity), FAMILIARITY_MIN, FAMILIARITY_MAX),
            lastInteractionAt: current.lastInteractionAt,
            tags: current.tags
        });
    }

    function getRelationshipHighlightsForPet(petId, relationships) {
        const id = String(petId);
        const rels = (relationships && typeof relationships === 'object') ? relationships : {};
        let bestFriend = null;
        let rival = null;
        Object.keys(rels).forEach((key) => {
            if (key.split('|').indexOf(id) === -1) return;
            const rel = normalizeRelationship(rels[key]);
            const otherId = key.split('|').find((part) => part !== id);
            if (!otherId) return;
            if (rel.affinity >= FRIEND_AFFINITY) {
                if (!bestFriend || rel.affinity > bestFriend.affinity || (rel.affinity === bestFriend.affinity && rel.familiarity > bestFriend.familiarity)) {
                    bestFriend = { petId: otherId, affinity: rel.affinity, familiarity: rel.familiarity, tags: rel.tags.slice() };
                }
            }
            if (rel.affinity <= RIVAL_AFFINITY) {
                if (!rival || rel.affinity < rival.affinity || (rel.affinity === rival.affinity && rel.familiarity > rival.familiarity)) {
                    rival = { petId: otherId, affinity: rel.affinity, familiarity: rel.familiarity, tags: rel.tags.slice() };
                }
            }
        });
        return { bestFriend, rival };
    }

    function detectRetentionBeats(previousRel, nextRel, petA, petB) {
        if (!previousRel) return [];
        const before = normalizeRelationship(previousRel);
        const after = normalizeRelationship(nextRel);
        const beats = [];
        const pair = {
            petAId: petA && petA.id != null ? String(petA.id) : '',
            petBId: petB && petB.id != null ? String(petB.id) : '',
            petAName: petA && typeof petA.name === 'string' ? petA.name : 'Pet',
            petBName: petB && typeof petB.name === 'string' ? petB.name : 'Pet'
        };
        const beforeTags = new Set(Array.isArray(before.tags) ? before.tags : []);
        const afterTags = new Set(Array.isArray(after.tags) ? after.tags : []);
        if (!beforeTags.has('friend') && afterTags.has('friend')) {
            beats.push(Object.assign({ type: 'relationship_friend_unlocked', priority: 'high' }, pair, {
                affinity: after.affinity,
                familiarity: after.familiarity
            }));
        }
        if (!beforeTags.has('rival') && afterTags.has('rival')) {
            beats.push(Object.assign({ type: 'relationship_rival_unlocked', priority: 'medium' }, pair, {
                affinity: after.affinity,
                familiarity: after.familiarity
            }));
        }
        const familiarityCrossed = before.familiarity < 75 && after.familiarity >= 75;
        if (familiarityCrossed) {
            beats.push(Object.assign({ type: 'relationship_familiarity_milestone', priority: 'medium' }, pair, {
                familiarity: after.familiarity
            }));
        }
        return beats;
    }

    return Object.freeze({
        AFFINITY_MIN,
        AFFINITY_MAX,
        FAMILIARITY_MIN,
        FAMILIARITY_MAX,
        FRIEND_AFFINITY,
        RIVAL_AFFINITY,
        TAG_FAMILIARITY_MIN,
        relationshipKey,
        createRelationship,
        normalizeRelationship,
        updateRelationshipTags,
        getTraitCompatibility,
        applySocialInteraction,
        applyPassiveDrift,
        getRelationshipHighlightsForPet,
        detectRetentionBeats
    });
});
