const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('native notifications deep-link route handler opens known routes', () => {
    let opened = [];
    global.showJourneyModal = () => { opened.push('journey'); };
    global.showStreakModal = () => { opened.push('streak'); };
    global.showExplorationModal = () => { opened.push('explore'); };
    global.switchRoom = (roomId) => { opened.push('room:' + roomId); };
    global.renderPetPhase = () => { opened.push('render'); };

    const NativeNotifications = freshRequire('../js/native/notifications.js');
    assert.equal(NativeNotifications.openRoute('journey'), true);
    assert.equal(NativeNotifications.openRoute('/streak'), true);
    assert.equal(NativeNotifications.openRoute('explore'), true);
    assert.equal(NativeNotifications.openRoute('garden'), true);
    assert.equal(opened.includes('journey'), true);
    assert.equal(opened.includes('streak'), true);
    assert.equal(opened.includes('explore'), true);
    assert.equal(opened.includes('room:garden'), true);
    delete global.showJourneyModal;
    delete global.showStreakModal;
    delete global.showExplorationModal;
    delete global.switchRoom;
    delete global.renderPetPhase;
    delete global.MLFNativeNotifications;
});

test('native notifications route handler returns false when required action is unavailable', () => {
    const NativeNotifications = freshRequire('../js/native/notifications.js');
    delete global.showJourneyModal;
    delete global.showStreakModal;
    delete global.showExplorationModal;
    delete global.switchRoom;
    delete global.renderPetPhase;

    assert.equal(NativeNotifications.openRoute('journey'), false);
    assert.equal(NativeNotifications.openRoute('streak'), false);
    assert.equal(NativeNotifications.openRoute('explore'), false);
    assert.equal(NativeNotifications.openRoute('garden'), false);
    delete global.MLFNativeNotifications;
});

test('native notifications deep-link telemetry records handled and unhandled routes distinctly', () => {
    const events = [];
    global.showJourneyModal = () => {};
    global.MLFRetentionTelemetry = {
        recordReminderFired(reminderType, deepLink) {
            events.push({ type: 'reminder_fired', reminderType, deepLink });
        },
        emit(event, payload) {
            events.push({ type: event, payload });
        }
    };

    const NativeNotifications = freshRequire('../js/native/notifications.js');
    assert.equal(NativeNotifications.__nativeDeepLink({ route: 'journey', reminderType: 'daily' }), true);
    assert.equal(NativeNotifications.__nativeDeepLink({ route: 'missing', reminderType: 'daily' }), false);

    assert.deepEqual(events[0], { type: 'reminder_fired', reminderType: 'daily', deepLink: 'journey' });
    assert.equal(events[1].type, 'reminder_deeplink_unhandled');
    assert.equal(events[1].payload.deepLink, 'missing');

    delete global.showJourneyModal;
    delete global.MLFRetentionTelemetry;
    delete global.MLFNativeNotifications;
});
