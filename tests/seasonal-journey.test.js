const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('seasonal journey schedules a weekly chapter and supports admin stock/limited seeds', () => {
    global.gameState = { journeyRetention: {} };
    global.getTodayString = () => '2026-04-08';
    global.getCurrentSeason = () => 'spring';
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'seasonalJourneyEnabled';

    const SeasonalJourney = freshRequire('../js/retention/seasonal_journey.js');
    const current = SeasonalJourney.getCurrentSeasonalJourney();
    assert.ok(current);
    assert.equal(current.seasonId, 'spring');
    assert.equal(current.objectives.length > 0, true);
    assert.equal(Array.isArray(current.rewardTrack), true);

    const seedWeekly = SeasonalJourney.adminSeedWeeklyStock(current.weekKey, [
        { id: 'spring_special_frame', type: 'photoFrame', title: 'Spring Frame', cost: 11, stock: 1 }
    ]);
    assert.equal(seedWeekly.ok, true);
    const seedLimited = SeasonalJourney.adminSeedLimitedRewards([
        { id: 'spring_heirloom', type: 'roomProp', title: 'Spring Heirloom', cost: 22, stock: 1, startsOn: '2026-04-01', expiresOn: '2026-04-20', weekKey: current.weekKey }
    ]);
    assert.equal(seedLimited.ok, true);

    const next = SeasonalJourney.getCurrentSeasonalJourney();
    assert.equal(Array.isArray(next.adminWeeklyStock), true);
    assert.equal(next.adminWeeklyStock[0].id, 'spring_special_frame');
    assert.equal(Array.isArray(next.limitedRewards), true);
    assert.equal(next.limitedRewards.some((r) => r.id === 'spring_heirloom'), true);

    delete global.gameState;
    delete global.getTodayString;
    delete global.getCurrentSeason;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFSeasonalJourney;
});

