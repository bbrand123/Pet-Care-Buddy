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

test('Journey backlog drip distributes missed-day rewards across multiple logins', () => {
    let today = '2026-01-01';
    global.getTodayString = () => today;
    global.getRetentionP1Tuning = () => ({
        journeyRewardPacing: {
            backlog: {
                tokenPerMissedDay: 2,
                dripLogins: 3,
                maxBufferedMissedDays: 10,
                minAwayDaysForBacklog: 1
            }
        }
    });
    global.gameState = {
        economy: { playerId: 'pid_test' },
        streak: { current: 1, todayBonusClaimed: false },
        journeyRetention: {
            version: 1,
            startedAtDate: '2026-01-01',
            currentChapterId: 'chapter1',
            lastUpdatedAt: Date.now(),
            chapterProgress: {},
            streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0, lastLoginDate: null, lastDripDate: null } },
            bond: { xp: 0, level: 1 },
            tokens: 0,
            features: { seasonalEnabled: false }
        }
    };
    global.JOURNEY_CHAPTERS = [{ id: 'chapter1', label: 'Week 1', dayStart: 1, dayEnd: 7, objectives: [], chapterReward: { tokens: 4 } }];

    const Journey = freshRequire('../js/retention/journey.js');
    let current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.backlogDrip.applied, 0);

    today = '2026-01-05'; // 3 missed days between Jan 1 and Jan 5
    current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.backlogDrip.applied, 2);
    assert.equal(current.backlogDrip.pending, 4);

    today = '2026-01-06';
    current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.backlogDrip.applied, 2);
    assert.equal(current.backlogDrip.pending, 2);

    today = '2026-01-07';
    current = Journey.getCurrentChapter('pid_test');
    assert.equal(current.backlogDrip.applied, 2);
    assert.equal(current.backlogDrip.pending, 0);
    assert.equal(global.gameState.journeyRetention.tokens, 6);

    delete global.getTodayString;
    delete global.getRetentionP1Tuning;
    delete global.gameState;
    delete global.JOURNEY_CHAPTERS;
    delete global.Journey;
    delete global.MLFJourney;
});

test('Journey token cosmetic redemption converts duplicates to currency fallback', () => {
    global.isRetentionFeatureFlagEnabled = () => true;
    global.gameState = {
        economy: { playerId: 'pid_test', coins: 0 },
        pet: { unlockedAccessories: [] },
        stickers: { spark: { collected: true } },
        streak: { current: 1, todayBonusClaimed: false },
        journeyRetention: {
            version: 1,
            startedAtDate: '2026-01-01',
            currentChapterId: 'chapter1',
            lastUpdatedAt: Date.now(),
            chapterProgress: {},
            streak: { backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0, lastLoginDate: null, lastDripDate: null } },
            bond: { xp: 0, level: 1 },
            tokens: 20,
            features: { seasonalEnabled: false }
        }
    };
    global.STICKERS = { spark: { name: 'Spark', emoji: '✨' } };
    global.ACCESSORIES = {};
    global.grantSticker = () => false; // duplicate path
    global.addCoins = (amount) => {
        global.gameState.economy.coins += amount;
        return amount;
    };
    global.JOURNEY_CHAPTERS = [{ id: 'chapter1', label: 'Week 1', dayStart: 1, dayEnd: 7, objectives: [], chapterReward: { tokens: 4 } }];

    const Journey = freshRequire('../js/retention/journey.js');
    const result = Journey.redeemJourneyTokenReward('cosmetic');
    assert.equal(result.ok, true);
    assert.equal(result.fallbackCoins > 0, true);
    assert.equal(global.gameState.economy.coins > 0, true);
    assert.equal(global.gameState.journeyRetention.tokens, 12);

    delete global.gameState;
    delete global.STICKERS;
    delete global.ACCESSORIES;
    delete global.grantSticker;
    delete global.addCoins;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.JOURNEY_CHAPTERS;
    delete global.Journey;
    delete global.MLFJourney;
});

test('Journey token store rotates weekly stock and enforces limited stock redemption', () => {
    global.isRetentionFeatureFlagEnabled = () => true;
    global.getTodayString = () => '2026-02-09';
    global.gameState = {
        economy: { playerId: 'pid_test', coins: 0 },
        pet: { unlockedAccessories: [] },
        streak: { current: 1, todayBonusClaimed: false },
        meta: {},
        journeyRetention: {
            version: 1,
            startedAtDate: '2026-02-01',
            currentChapterId: 'chapter1',
            lastUpdatedAt: Date.now(),
            chapterProgress: {},
            streak: { backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0, lastLoginDate: null, lastDripDate: null } },
            bond: { xp: 0, level: 1 },
            tokens: 40,
            features: { seasonalEnabled: false }
        }
    };
    global.JOURNEY_CHAPTERS = [{ id: 'chapter1', label: 'Week 1', dayStart: 1, dayEnd: 7, objectives: [], chapterReward: { tokens: 4 } }];
    global.addCoins = (amount) => {
        global.gameState.economy.coins += amount;
        return amount;
    };

    const Journey = freshRequire('../js/retention/journey.js');
    const initial = Journey.getJourneyTokenStoreInventory();
    assert.equal(Array.isArray(initial.items), true);
    assert.equal(initial.items.some((item) => item.id === 'story'), true);

    const weekKey = initial.weekKey;
    const seedResult = Journey.adminSeedJourneyLimitedRewards([
        { id: 'limitedCoinTest', type: 'currency', title: 'Limited Coin Cache', cost: 9, coins: 99, stock: 1, weekKey }
    ]);
    assert.equal(seedResult.ok, true);

    Journey.rotateJourneyTokenStoreStock({ weekKey, force: true });
    const rotated = Journey.getJourneyTokenStoreInventory();
    const limited = rotated.items.find((item) => item.id === 'limitedCoinTest');
    assert.ok(limited);
    assert.equal(limited.remaining, 1);

    const firstRedeem = Journey.redeemJourneyTokenReward('limitedCoinTest');
    assert.equal(firstRedeem.ok, true);
    assert.equal(global.gameState.economy.coins >= 99, true);

    const afterFirst = Journey.getJourneyTokenStoreInventory();
    const soldOut = afterFirst.items.find((item) => item.id === 'limitedCoinTest');
    assert.equal(!!soldOut.soldOut, true);

    const secondRedeem = Journey.redeemJourneyTokenReward('limitedCoinTest');
    assert.equal(secondRedeem.ok, false);
    assert.equal(secondRedeem.reason, 'sold-out');

    delete global.getTodayString;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.gameState;
    delete global.JOURNEY_CHAPTERS;
    delete global.addCoins;
    delete global.Journey;
    delete global.MLFJourney;
});
