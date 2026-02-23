const test = require('node:test');
const assert = require('node:assert/strict');

const { EventBus, EVENTS } = require('../js/eventbus.js');
const StateManager = require('../js/state.js');

test('StateManager proxies nested writes and emits structured events', () => {
    EventBus._listeners = {};
    const state = {
        phase: 'egg',
        economy: { coins: 10 },
        nested: { value: 1 },
        _offlineChanges: { minutes: 5 }
    };

    const busEvents = [];
    EventBus.on(EVENTS.STATE_CHANGED, (evt) => busEvents.push(evt));
    const coinEvents = [];
    EventBus.on(EVENTS.COINS_CHANGED, (evt) => coinEvents.push(evt));

    const root = StateManager.init(state, { eventBus: EventBus });
    root.economy.coins = 25;
    root.nested.value = 2;

    assert.equal(StateManager.coins, 25);
    assert.equal(busEvents.length >= 2, true);
    assert.equal(busEvents.some((evt) => evt.path === 'economy.coins'), true);
    assert.equal(coinEvents.length, 1);
    assert.equal(coinEvents[0].balance, 25);

    const serialized = StateManager.toSaveData();
    assert.equal(serialized.includes('_offlineChanges'), false);

    const beforeLoadRoot = root;
    StateManager.loadSaveData({ phase: 'pet', economy: { coins: 7 }, nested: { value: 9 } });
    assert.equal(beforeLoadRoot, StateManager.getRoot());
    assert.equal(root.phase, 'pet');
    assert.equal(root.economy.coins, 7);
    assert.equal(root.nested.value, 9);
});
