const test = require('node:test');
const assert = require('node:assert/strict');

const EconomyCalculations = require('../js/domain/economy/economy-calculations.js');

test('minigame payout increases with score and respects cap', () => {
    const low = EconomyCalculations.computeMinigameCoinPayout({
        gameId: 'fetch', score: 10, difficulty: 1, economyMultiplier: 1, petStrength: 0.5, sessionCount: 1, cap: 999
    });
    const high = EconomyCalculations.computeMinigameCoinPayout({
        gameId: 'fetch', score: 400, difficulty: 1.3, economyMultiplier: 1, petStrength: 0.6, sessionCount: 2, cap: 999
    });
    const capped = EconomyCalculations.computeMinigameCoinPayout({
        gameId: 'tournament', score: 5000, difficulty: 3, economyMultiplier: 2, petStrength: 1, sessionCount: 20, cap: 40
    });

    assert.ok(high > low);
    assert.equal(capped, 40);
});

test('minigame base payout mode matches live curve inputs deterministically', () => {
    const payout = EconomyCalculations.computeMinigameCoinPayout({
        gameId: 'fetch',
        score: 64,
        difficulty: 1,
        mode: 'baseOnly'
    });
    assert.equal(payout, 42);
});

test('harvest payout applies seasonal boost deterministically', () => {
    const crop = { hungerValue: 8, happinessValue: 6, energyValue: 4, seasonBonus: ['summer'] };
    const offSeason = EconomyCalculations.computeHarvestCoinPayout({ crop, currentSeason: 'winter', economyMultiplier: 1 });
    const inSeason = EconomyCalculations.computeHarvestCoinPayout({ crop, currentSeason: 'summer', economyMultiplier: 1 });

    assert.ok(inSeason > offSeason);
    assert.equal(inSeason, Math.max(2, Math.round(offSeason * 1.2)));
});

test('staple crops are not net-positive in pure coin loops over repeated cycles', () => {
    const economyMultiplier = 0.82; // matches current tuned default in constants
    const staples = [
        {
            id: 'carrot',
            crop: { hungerValue: 15, happinessValue: 5, energyValue: 0, growTime: 3, seasonBonus: ['spring'] },
            season: 'spring',
            packCost: 14,
            seedsPerPack: 3
        },
        {
            id: 'tomato',
            crop: { hungerValue: 18, happinessValue: 8, energyValue: 0, growTime: 4, seasonBonus: ['summer'] },
            season: 'summer',
            packCost: 18,
            seedsPerPack: 3
        }
    ];

    staples.forEach((entry) => {
        const payoutPerHarvest = EconomyCalculations.computeHarvestCoinPayout({
            crop: entry.crop,
            currentSeason: entry.season,
            economyMultiplier
        });
        const cycles = 12;
        const grossCoins = payoutPerHarvest * cycles;
        const seedUnitCost = Math.ceil(entry.packCost / entry.seedsPerPack);
        const seedCoinsSpent = seedUnitCost * cycles;
        assert.ok(
            grossCoins <= seedCoinsSpent,
            `${entry.id} should not be net-positive in pure coin terms (${grossCoins} > ${seedCoinsSpent})`
        );
    });
});
