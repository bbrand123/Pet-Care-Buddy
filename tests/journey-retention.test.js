const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

function makeState() {
    return {
        lastUpdate: 1700000000000,
        economy: { playerId: 'pid_test' },
        streak: { current: 3, todayBonusClaimed: false },
        totalFeedCount: 10,
        totalDailyCompletions: 1,
        minigamePlayCounts: { matching: 2 },
        pet: { careActions: 20 }
    };
}

test('Journey.getCurrentChapter returns chapter-local progress using baselines', () => {
    global.gameState = makeState();
    global.JOURNEY_CHAPTERS = [
        {
            id: 'chapter1',
            label: 'Week 1',
            dayStart: 1,
            dayEnd: 7,
            objectives: [
                { id: 'feed6', metric: 'totalFeedCount', target: 6, label: 'Feed 6x', tokenReward: 2 }
            ],
            chapterReward: { tokens: 4 }
        }
    ];
    const Journey = freshRequire('../js/retention/journey.js');

    let current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.chapterId, 'chapter1');
    assert.equal(current.objectives[0].value, 0);

    global.gameState.totalFeedCount += 3;
    current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.objectives[0].value, 3);
    assert.equal(current.chapterComplete, false);
    delete global.gameState;
    delete global.JOURNEY_CHAPTERS;
    delete global.Journey;
    delete global.MLFJourney;
});

test('Journey.incrementChapterProgress updates explicit delta counters', () => {
    global.gameState = makeState();
    global.JOURNEY_CHAPTERS = [
        {
            id: 'chapter1',
            label: 'Week 1',
            dayStart: 1,
            dayEnd: 7,
            objectives: [
                { id: 'dailies', metric: 'totalDailyCompletions', target: 2, label: 'Do 2 dailies', tokenReward: 3 }
            ],
            chapterReward: { tokens: 5 }
        }
    ];
    const Journey = freshRequire('../js/retention/journey.js');
    const status = Journey.incrementChapterProgress('pid_test', 'totalDailyCompletions', 2);
    assert.ok(status);
    assert.equal(status.objectives[0].done, true);
    assert.equal(status.chapterEntry.deltas.totalDailyCompletions, 2);
    delete global.gameState;
    delete global.JOURNEY_CHAPTERS;
    delete global.Journey;
    delete global.MLFJourney;
});

test('Journey.claimStreak delegates to claimStreakBonus and emits success result', () => {
    global.gameState = makeState();
    global.JOURNEY_CHAPTERS = [
        { id: 'chapter1', label: 'Week 1', dayStart: 1, dayEnd: 7, objectives: [], chapterReward: { tokens: 4 } }
    ];
    global.claimStreakBonus = () => ({ bonus: { label: 'Daily Spark' }, milestones: [], streakDripCoins: 0 });
    global.saveGame = () => ({ ok: true });
    const Journey = freshRequire('../js/retention/journey.js');

    const result = Journey.claimStreak('pid_test');
    assert.equal(result.ok, true);
    assert.equal(global.gameState.journeyRetention.streak.lastClaimDate, new Date().toISOString().slice(0, 10));

    delete global.claimStreakBonus;
    delete global.saveGame;
    delete global.gameState;
    delete global.JOURNEY_CHAPTERS;
    delete global.Journey;
    delete global.MLFJourney;
});
