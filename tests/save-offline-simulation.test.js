const test = require('node:test');
const assert = require('node:assert/strict');

const OfflineSim = require('../js/save/offline-simulation.js');

test('applyGardenOfflineGrowth advances crop progress and resets watered state', () => {
    const now = 10 * 60000;
    const save = {
        season: 'spring',
        garden: {
            lastGrowTick: now - (3 * 60000),
            plots: [
                { cropId: 'carrot', stage: 0, growTicks: 0, watered: true }
            ]
        }
    };

    const result = OfflineSim.applyGardenOfflineGrowth(save, {
        now,
        seasons: { spring: { gardenGrowthMultiplier: 1 } },
        gardenCrops: { carrot: { growTime: 2 } }
    });

    assert.equal(result.changed, true);
    assert.equal(result.gardenTicksPassed, 3);
    assert.equal(save.garden.plots[0].growTicks, 4);
    assert.equal(save.garden.plots[0].stage, 2);
    assert.equal(save.garden.plots[0].watered, false);
    assert.equal(save.garden.lastGrowTick, now);
});

test('applyNeedsOfflineSimulation decays stats, tracks neglect, and records offline summary', () => {
    const now = 60 * 60000;
    const activePet = {
        id: 'a',
        hunger: 100,
        cleanliness: 100,
        happiness: 100,
        energy: 50,
        personality: 'calm',
        growthStage: 'adult'
    };
    const otherPet = {
        id: 'b',
        hunger: 15,
        cleanliness: 15,
        happiness: 15,
        energy: 15,
        growthStage: 'elder'
    };
    const save = {
        lastUpdate: now - (40 * 60000),
        activePetIndex: 0,
        pet: activePet,
        pets: [activePet, otherPet],
        relationships: { 'a-b': { points: 180 } }
    };

    const result = OfflineSim.applyNeedsOfflineSimulation(save, {
        now,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        personalityTraits: {
            calm: {
                statModifiers: {
                    hungerDecayMultiplier: 1,
                    cleanlinessDecayMultiplier: 1,
                    happinessDecayMultiplier: 1,
                    energyDecayMultiplier: 1
                }
            }
        },
        elderConfig: { wisdomDecayReduction: 0.5 }
    });

    assert.equal(result.changed, true);
    assert.equal(result.decay, 20);
    assert.equal(save.pet, save.pets[0]);
    assert.equal(save.pets[0].hunger, 70);
    assert.equal(save.pets[0].cleanliness, 90);
    assert.equal(save.pets[0].energy, 54);
    assert.equal(save.pets[0].happiness >= 80, true);
    assert.equal(save.pets[1].neglectCount, 4);
    assert.equal(save._offlineChanges.minutes, 40);
    assert.equal(typeof save._offlineChanges.hunger, 'number');
    assert.equal(save._offlineChanges.hunger < 0, true);
});

test('applyOfflineSimulation sets timeOfDay through injected function', () => {
    const save = { garden: { plots: [], lastGrowTick: 0 }, pets: [], activePetIndex: 0 };
    const result = OfflineSim.applyOfflineSimulation(save, {
        now: 123,
        getTimeOfDay: () => 'night'
    });
    assert.equal(result.now, 123);
    assert.equal(save.timeOfDay, 'night');
});

test('applyGardenOfflineGrowth repairs malformed plot numeric fields and avoids NaN corruption', () => {
    const now = 20 * 60000;
    const save = {
        season: 'spring',
        garden: {
            lastGrowTick: now - (2 * 60000),
            plots: [
                { cropId: 'carrot', stage: 'oops', growTicks: NaN, watered: 'yes' },
                { cropId: 'carrot', stage: 0, growTicks: 0, watered: false },
                { cropId: 'unknown', stage: NaN, growTicks: NaN, watered: null }
            ]
        }
    };

    const result = OfflineSim.applyGardenOfflineGrowth(save, {
        now,
        seasons: { spring: { gardenGrowthMultiplier: 1 } },
        gardenCrops: { carrot: { growTime: 2 } }
    });

    assert.equal(result.changed, true);
    assert.equal(save.garden.plots[0].growTicks, 3);
    assert.equal(Number.isFinite(save.garden.plots[0].stage), true);
    assert.equal(save.garden.plots[0].watered, false);
    assert.equal(Number.isFinite(save.garden.plots[2].growTicks), true);
    assert.equal(Number.isFinite(save.garden.plots[2].stage), true);
});
