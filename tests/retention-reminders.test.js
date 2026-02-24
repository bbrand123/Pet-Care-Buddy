const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('retention reminder center prioritizes high-value items above low-value items', () => {
    global.gameState = {
        reminders: { enabled: false, permission: 'denied', lastSent: {} },
        meta: {
            reminderCenter: { items: [], promptDismissed: false, lastPromptSession: 0, lastDigestDate: '' },
            reactivation: { lastSeenDate: null, awayDays: 0, lastActivity: '', pendingRecap: null, lastDialogueDate: '', lastRecapShownDate: '' },
            onboarding: { sessionGuideSkipped: false, reminderPromptSeen: false }
        },
        streak: { current: 4, todayBonusClaimed: false }
    };
    global.saveGame = () => ({ ok: true });
    const Reminders = freshRequire('../js/retention/reminders.js');

    const novelty = Reminders.addReminderCenterItem('novelty', '✨ New unlock', 'A new cosmetic is ready.', { type: 'journey' });
    const streak = Reminders.addReminderCenterItem('streakRisk', '🔥 Streak risk!', 'Log in to protect your streak.', { type: 'streak' });
    const items = Reminders.getReminderCenterItems();
    assert.equal(items[0].id, streak.id);
    assert.equal(items.some((i) => i.id === novelty.id), true);

    delete global.gameState;
    delete global.saveGame;
    delete global.MLFRetentionReminders;
});

test('retention reminder emotional prompt reflects streak-ready state', () => {
    global.gameState = {
        reminders: { enabled: false, permission: 'default', lastSent: {} },
        meta: {
            reminderCenter: { items: [], promptDismissed: false, lastPromptSession: 0, lastDigestDate: '' },
            reactivation: { lastSeenDate: null, awayDays: 0, lastActivity: 'expedition', pendingRecap: null, lastDialogueDate: '', lastRecapShownDate: '' },
            onboarding: { sessionGuideSkipped: false, reminderPromptSeen: false },
            bond: { level: 2 }
        },
        streak: { current: 5, todayBonusClaimed: false },
        journeyRetention: { bond: { xp: 22, level: 2 } },
        pets: [{ id: 'a' }],
        relationships: {}
    };
    const Reminders = freshRequire('../js/retention/reminders.js');
    const prompt = Reminders.getRetentionEmotionalPrompt();
    assert.ok(prompt);
    assert.equal(prompt.actionType, 'streak');
    assert.equal(prompt.title.length > 0, true);

    delete global.gameState;
    delete global.MLFRetentionReminders;
});
