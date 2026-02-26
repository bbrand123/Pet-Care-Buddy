(function initMLFStateDomainBridges(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let EventBusModule = null;
        let StateManager = null;
        try {
            EventBusModule = require('../eventbus.js');
        } catch (_) {}
        try {
            StateManager = require('../state.js');
        } catch (_) {}
        module.exports = factory(
            StateManager,
            EventBusModule && EventBusModule.EventBus,
            EventBusModule && EventBusModule.EVENTS
        );
        return;
    }
    root.MLFStateDomainBridges = factory(root.StateManager, root.EventBus, root.EVENTS);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFStateDomainBridges(DefaultStateManager, DefaultEventBus, DefaultEvents) {
    'use strict';

    const coinBridgeState = new WeakMap();

    function attachCoinsChangedBridge(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const stateManager = opts.stateManager || DefaultStateManager;
        const eventBus = opts.eventBus || DefaultEventBus;
        const events = opts.events || DefaultEvents || {};
        if (!stateManager || typeof stateManager.onChange !== 'function') return function noop() {};
        if (!eventBus || typeof eventBus.emit !== 'function') return function noop() {};

        const existing = coinBridgeState.get(stateManager);
        if (existing && typeof existing.unsubscribe === 'function') {
            return existing.unsubscribe;
        }

        const eventName = events.COINS_CHANGED || 'economy:coinsChanged';
        const unsubscribe = stateManager.onChange('economy.coins', function onCoinsChanged(payload) {
            try {
                eventBus.emit(eventName, {
                    balance: Number(payload && payload.newValue) || 0,
                    previousBalance: Number(payload && payload.oldValue) || 0,
                    source: payload && payload.meta && payload.meta.source ? payload.meta.source : 'state'
                });
            } catch (err) {
                console.error('[MLFStateDomainBridges] Error emitting coin change bridge event:', err);
            }
        });
        coinBridgeState.set(stateManager, { unsubscribe });
        return unsubscribe;
    }

    function attachDefaultStateDomainBridges() {
        return {
            coins: attachCoinsChangedBridge({
                stateManager: DefaultStateManager,
                eventBus: DefaultEventBus,
                events: DefaultEvents
            })
        };
    }

    if (DefaultStateManager && DefaultEventBus) {
        try {
            attachDefaultStateDomainBridges();
        } catch (_) {}
    }

    return Object.freeze({
        attachCoinsChangedBridge,
        attachDefaultStateDomainBridges
    });
});
