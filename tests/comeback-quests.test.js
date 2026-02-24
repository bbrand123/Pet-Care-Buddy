const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('comeback quests are created from away duration and complete via activity tracking', () => {
    const reminderCalls = [];
    global.getTodayString = () => '2026-02-24';
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'comebackQuestsEnabled';
    global.gameState = {
        economy: { playerId: 'pid_test', coins: 0 },
        meta: {
            reactivation: { awayDays: 7, lastActivity: 'expedition', comebackQuest: null }
        },
        journeyRetention: { tokens: 0, bond: { xp: 0, level: 1 } }
    };
    global.Journey = {
        ensureJourneyState(gs) {
            if (!gs.journeyRetention) gs.journeyRetention = { tokens: 0, bond: { xp: 0, level: 1 } };
            if (!gs.journeyRetention.bond) gs.journeyRetention.bond = { xp: 0, level: 1 };
            if (!Number.isFinite(Number(gs.journeyRetention.tokens))) gs.journeyRetention.tokens = 0;
            return gs.journeyRetention;
        },
        getCurrentChapter() { return { chapterId: 'chapter2' }; }
    };
    global.addCoins = (amount) => {
        global.gameState.economy.coins += amount;
        return amount;
    };
    global.addReminderCenterItem = (type, title, body, action) => {
        reminderCalls.push({ type, title, body, action });
        return { id: 'r1' };
    };
    global.saveGame = () => ({ ok: true });

    const Comeback = freshRequire('../js/retention/comeback-quests.js');
    const quest = Comeback.ensureComebackQuestForCurrentPlayer({ awayDays: 7, lastActivity: 'expedition' });
    assert.ok(quest);
    assert.equal(quest.awayDays, 7);
    assert.equal(reminderCalls.length > 0, true);

    const metric = quest.metric;
    for (let i = 0; i < quest.target; i++) {
        Comeback.recordActivity(metric, 1);
    }

    const finalQuest = global.gameState.meta.reactivation.comebackQuest;
    assert.equal(finalQuest.status, 'completed');
    assert.equal(Number(finalQuest.claimedAt) > 0, true);
    assert.equal(global.gameState.journeyRetention.tokens > 0 || global.gameState.economy.coins > 0, true);

    delete global.getTodayString;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.gameState;
    delete global.Journey;
    delete global.addCoins;
    delete global.addReminderCenterItem;
    delete global.saveGame;
    delete global.MLFComebackQuests;
});

