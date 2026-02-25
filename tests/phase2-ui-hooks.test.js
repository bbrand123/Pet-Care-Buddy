const test = require('node:test');
const assert = require('node:assert/strict');

const UiHooks = require('../js/ui/ui-hooks.js');
const Phase2Hooks = require('../js/ui/phase2-hooks.js');

test('phase2 hook bindings subscribe to explicit UI hooks in order', () => {
    const hooks = UiHooks.createUiHooks ? UiHooks.createUiHooks({ target: null }) : UiHooks;
    const calls = [];

    const binding = Phase2Hooks.bindPhase2Hooks({
        uiHooks: hooks,
        callbacks: {
            onToastShown(detail) { calls.push(['toast', detail && detail.plainText]); },
            onOverlayOpened(detail) { calls.push(['overlay-open', detail && detail.overlayType]); },
            onOverlayClosed(detail) { calls.push(['overlay-closed', detail && detail.overlayType]); },
            onRoomChanged(detail) { calls.push(['room', detail && detail.roomId]); }
        }
    });

    hooks.emit('toast:shown', { plainText: 'Saved' });
    hooks.emit('overlay:opened', { overlayType: 'modal' });
    hooks.emit('room:changed', { roomId: 'garden' });
    hooks.emit('overlay:closed', { overlayType: 'modal' });

    assert.deepEqual(calls, [
        ['toast', 'Saved'],
        ['overlay-open', 'modal'],
        ['room', 'garden'],
        ['overlay-closed', 'modal']
    ]);

    binding.unsubscribeAll();
    hooks.emit('room:changed', { roomId: 'bedroom' });
    assert.equal(calls.length, 4);
});
