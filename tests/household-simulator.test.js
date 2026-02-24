const test = require('node:test');
const assert = require('node:assert/strict');

const Autonomy = require('../js/sim/autonomy.js');
const Relationships = require('../js/sim/relationships.js');
const HouseholdSimulator = require('../js/sim/household-simulator.js');

test('autonomy chooses eat when hunger is low', () => {
    const pet = {
        id: '1',
        needs: { hunger: 10, energy: 80, fun: 80, hygiene: 80 },
        personality: 'playful'
    };
    const activity = Autonomy.decideNextActivity(pet, { petsById: { '1': pet } }, 1700000000000);
    assert.equal(activity.type, 'eat');
});

test('autonomy chooses sleep when energy is low', () => {
    const pet = {
        id: '1',
        needs: { hunger: 80, energy: 10, fun: 80, hygiene: 80 },
        personality: 'energetic'
    };
    const activity = Autonomy.decideNextActivity(pet, { petsById: { '1': pet } }, 1700000000000);
    assert.equal(activity.type, 'sleep');
});

test('relationship updates add friend/rival tags at thresholds', () => {
    const a = { id: '1', mood: 'happy', personality: 'playful' };
    const b = { id: '2', mood: 'happy', personality: 'playful' };
    let rel = { affinity: 58, familiarity: 49, lastInteractionAt: 0, tags: [] };
    const up = Relationships.applySocialInteraction(rel, a, b, 1700000000000, {
        baseAffinityDelta: 4,
        baseFamiliarityDelta: 4
    });
    assert.equal(up.relationship.affinity >= 60, true);
    assert.equal(up.relationship.familiarity >= 50, true);
    assert.equal(up.relationship.tags.includes('friend'), true);

    rel = { affinity: -58, familiarity: 49, lastInteractionAt: 0, tags: [] };
    const down = Relationships.applySocialInteraction(rel, { id: '1', mood: 'sad', personality: 'grumpy' }, { id: '2', mood: 'sad', personality: 'playful' }, 1700000600000, {
        baseAffinityDelta: -4,
        baseFamiliarityDelta: 4
    });
    assert.equal(down.relationship.affinity <= -60, true);
    assert.equal(down.relationship.familiarity >= 50, true);
    assert.equal(down.relationship.tags.includes('rival'), true);
});

test('household catch-up simulation is deterministic for the same inputs', () => {
    const initialState = {
        household: {
            activePetId: '1',
            petsById: {
                '1': {
                    id: '1',
                    name: 'Nova',
                    type: 'cat',
                    hunger: 65,
                    energy: 55,
                    happiness: 40,
                    cleanliness: 70,
                    personality: 'playful',
                    currentActivity: { type: 'idle', startedAtMs: 0, durationMs: 60000, endsAtMs: 60000 }
                },
                '2': {
                    id: '2',
                    name: 'Milo',
                    type: 'dog',
                    hunger: 30,
                    energy: 85,
                    happiness: 60,
                    cleanliness: 60,
                    personality: 'calm',
                    currentActivity: { type: 'idle', startedAtMs: 0, durationMs: 60000, endsAtMs: 60000 }
                }
            },
            relationships: {},
            lastSimulatedAt: 0,
            simVersion: 1
        }
    };
    const nowMs = 30 * 60 * 1000;

    const run1 = HouseholdSimulator.simulateHouseholdToNow(initialState, nowMs);
    const run2 = HouseholdSimulator.simulateHouseholdToNow(initialState, nowMs);

    assert.deepEqual(run1.household, run2.household);
    assert.deepEqual(run1.meta, run2.meta);
    assert.equal(run1.household.lastSimulatedAt, nowMs);
    assert.equal(Number.isFinite(run1.household.petsById['1'].hunger), true);
    assert.equal(Number.isFinite(run1.household.petsById['2'].energy), true);
});

