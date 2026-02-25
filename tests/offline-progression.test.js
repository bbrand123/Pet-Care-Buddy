const test = require('node:test');
const assert = require('node:assert/strict');

const OfflineProgression = require('../js/save/offline-progression.js');

test('offline progression uses household path and preserves shared offline summary behavior', () => {
    const now = 120 * 60000;
    const save = {
        lastUpdate: now - (15 * 60000),
        pet: { hunger: 80, cleanliness: 80, happiness: 80, energy: 40 },
        pets: [{ id: 1, hunger: 80, cleanliness: 80, happiness: 80, energy: 40 }],
        activePetIndex: 0,
        garden: { lastGrowTick: now - (2 * 60000), plots: [] }
    };

    const result = OfflineProgression.applyOfflineProgression(save, {
        now,
        getTimeOfDay: () => 'night',
        householdStateApi: {
            simulateHouseholdToNowOnState(state) {
                state.pet.hunger = 70;
                state.pet.cleanliness = 75;
                state.pet.happiness = 78;
                state.pet.energy = 48;
                return { meta: { catchUpClamped: true } };
            }
        }
    });

    assert.equal(result.path, 'household');
    assert.equal(save.timeOfDay, 'night');
    assert.equal(save._offlineChanges.minutes, 15);
    assert.equal(save._offlineChanges.hunger, -10);
    assert.equal(save._offlineChanges.energy, 8);
});

test('offline progression falls back to legacy needs path when household simulator is unavailable', () => {
    const now = 50 * 60000;
    const save = {
        lastUpdate: now - (20 * 60000),
        pet: { hunger: 100, cleanliness: 100, happiness: 100, energy: 50 },
        pets: [{ hunger: 100, cleanliness: 100, happiness: 100, energy: 50 }],
        activePetIndex: 0,
        garden: { lastGrowTick: now, plots: [] }
    };

    const result = OfflineProgression.applyOfflineProgression(save, {
        now,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        personalityTraits: {},
        elderConfig: { wisdomDecayReduction: 1 }
    });

    assert.equal(result.path, 'legacy');
    assert.equal(save.pet.hunger < 100, true);
    assert.equal(save._offlineChanges.minutes, 20);
});
