const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('household-state converts retention beats into reminder-center alerts', () => {
    const reminderCalls = [];
    global.addReminderCenterItem = (type, title, body, action) => {
        reminderCalls.push({ type, title, body, action });
        return { id: 'rem-test' };
    };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'householdRetentionBeatsEnabled';

    const HouseholdState = freshRequire('../js/state/household-state.js');
    const state = { meta: {} };
    const added = HouseholdState.applyHouseholdRetentionBeatsToState(state, [
        {
            type: 'relationship_friend_unlocked',
            petAId: '1',
            petBId: '2',
            petAName: 'Nova',
            petBName: 'Milo'
        }
    ]);

    assert.equal(added, 1);
    assert.equal(Array.isArray(state.meta.householdRetentionAlerts), true);
    assert.equal(state.meta.householdRetentionAlerts.length, 1);
    assert.equal(reminderCalls.length, 1);
    assert.equal(reminderCalls[0].type, 'household');
    assert.equal(reminderCalls[0].action.type, 'social');

    delete global.addReminderCenterItem;
    delete global.isRetentionFeatureFlagEnabled;
});

