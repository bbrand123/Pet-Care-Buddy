const test = require('node:test');
const assert = require('node:assert/strict');

const { EventBus, EVENTS, createEventBus } = require('../js/eventbus.js');
const StateManager = require('../js/state.js');
const StateDomainBridges = require('../js/state/state-domain-bridges.js');

test('StateManager proxies nested writes and emits structured events', () => {
    EventBus._listeners = {};
    StateDomainBridges.attachCoinsChangedBridge({ stateManager: StateManager, eventBus: EventBus, events: EVENTS });
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

test('createEventBus and createStateManager provide isolated instances', () => {
    const bus = createEventBus();
    const manager = StateManager.createStateManager({ globalRef: global });
    StateDomainBridges.attachCoinsChangedBridge({ stateManager: manager, eventBus: bus, events: EVENTS });

    const stateEvents = [];
    const coinEvents = [];
    bus.on(EVENTS.STATE_CHANGED, (evt) => stateEvents.push(evt));
    bus.on(EVENTS.COINS_CHANGED, (evt) => coinEvents.push(evt));

    const root = manager.init({ phase: 'egg', economy: { coins: 1 } }, { eventBus: bus });
    root.economy.coins = 9;

    assert.equal(root.economy.coins, 9);
    assert.equal(stateEvents.length, 1);
    assert.equal(coinEvents.length, 1);
    assert.equal(coinEvents[0].balance, 9);
});

test('StateManager.serialize returns schema-stamped payload and strips transient fields', () => {
    const originalSchema = global.MLFSaveSchema;
    global.MLFSaveSchema = {
        stampSaveSchemaVersion(payload) {
            payload.saveSchemaVersion = 7;
        }
    };

    try {
        const root = StateManager.init({
            phase: 'pet',
            economy: { coins: 3 },
            nested: { value: 4 },
            _offlineChanges: { minutes: 12 }
        }, { eventBus: EventBus });

        const snapshot = StateManager.serialize();
        assert.equal(typeof snapshot.serialized, 'string');
        assert.equal(snapshot.schemaVersion, 7);
        assert.equal(snapshot.payload.saveSchemaVersion, 7);
        assert.equal(snapshot.serialized.includes('_offlineChanges'), false);
        assert.equal(snapshot.payload._offlineChanges, undefined);
        assert.equal(root._offlineChanges.minutes, 12);

        snapshot.payload.nested.value = 99;
        assert.equal(root.nested.value, 4);

        const parsed = JSON.parse(snapshot.serialized);
        assert.equal(parsed.saveSchemaVersion, 7);
        assert.equal(parsed.nested.value, 4);
    } finally {
        global.MLFSaveSchema = originalSchema;
    }
});

test('StateManager.hydrate preserves root identity and emits STATE_REPLACED', () => {
    EventBus._listeners = {};
    const replacedEvents = [];
    EventBus.on(EVENTS.STATE_REPLACED, (evt) => replacedEvents.push(evt));

    const root = StateManager.init({
        phase: 'egg',
        economy: { coins: 1 }
    }, { eventBus: EventBus });

    const hydratedRoot = StateManager.hydrate({
        phase: 'pet',
        economy: { coins: 22 },
        saveSchemaVersion: 1
    }, { source: 'test' });

    assert.equal(hydratedRoot, root);
    assert.equal(StateManager.getRoot(), root);
    assert.equal(root.phase, 'pet');
    assert.equal(root.economy.coins, 22);
    assert.equal(replacedEvents.length, 1);
    assert.equal(replacedEvents[0].type, 'replace');
    assert.equal(replacedEvents[0].meta.reason, 'hydrate');
    assert.equal(replacedEvents[0].meta.source, 'test');
});

test('StateManager.serialize falls back to schema version 1 without MLFSaveSchema', () => {
    const originalSchema = global.MLFSaveSchema;
    delete global.MLFSaveSchema;
    try {
        StateManager.init({
            phase: 'egg',
            economy: { coins: 0 }
        }, { eventBus: EventBus });
        const snapshot = StateManager.serialize();
        assert.equal(snapshot.payload.saveSchemaVersion, 1);
        assert.equal(JSON.parse(snapshot.serialized).saveSchemaVersion, 1);
    } finally {
        if (typeof originalSchema !== 'undefined') {
            global.MLFSaveSchema = originalSchema;
        }
    }
});

test('StateManager.hydrate rejects non-object save payload roots', () => {
    StateManager.init({ phase: 'egg' }, { eventBus: EventBus });
    assert.throws(() => StateManager.hydrate([]), /object save payload/i);
    assert.throws(() => StateManager.hydrate('[]'), /object save payload/i);
});
