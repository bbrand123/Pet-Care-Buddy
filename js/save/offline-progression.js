(function initMLFOfflineProgression(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let OfflineSimulation = null;
        let OfflineConfig = null;
        try {
            OfflineSimulation = require('./offline-simulation.js');
        } catch (_) {}
        try {
            OfflineConfig = require('./offline-progression-config.js');
        } catch (_) {}
        module.exports = factory(OfflineSimulation, OfflineConfig);
        return;
    }
    root.MLFOfflineProgression = factory(root.MLFSaveOfflineSimulation, root.MLFOfflineProgressionConfig);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFOfflineProgression(OfflineSimulation, OfflineConfig) {
    'use strict';

    const CONFIG = OfflineConfig || {};
    const OFFLINE_SUMMARY_MINUTES_THRESHOLD = Number(CONFIG.OFFLINE_SUMMARY_MINUTES_THRESHOLD) || 5;

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function getActivePetSnapshot(state) {
        if (!isObject(state) || !isObject(state.pet)) return null;
        return {
            hunger: Number(state.pet.hunger) || 0,
            cleanliness: Number(state.pet.cleanliness) || 0,
            happiness: Number(state.pet.happiness) || 0,
            energy: Number(state.pet.energy) || 0
        };
    }

    function buildOfflineSummaryIfNeeded(state, activeBefore, nowMs) {
        if (!isObject(state) || !isObject(state.pet) || !activeBefore) return null;
        const lastUpdate = Number(state.lastUpdate);
        if (!Number.isFinite(lastUpdate) || lastUpdate <= 0) return null;
        const minutesPassed = Math.max(0, Math.round((Number(nowMs) - lastUpdate) / 60000));
        if (minutesPassed < OFFLINE_SUMMARY_MINUTES_THRESHOLD) return null;
        return {
            minutes: minutesPassed,
            hunger: (Number(state.pet.hunger) || 0) - activeBefore.hunger,
            cleanliness: (Number(state.pet.cleanliness) || 0) - activeBefore.cleanliness,
            happiness: (Number(state.pet.happiness) || 0) - activeBefore.happiness,
            energy: (Number(state.pet.energy) || 0) - activeBefore.energy
        };
    }

    function applyOfflineProgression(state, deps) {
        const options = isObject(deps) ? deps : {};
        const nowMs = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
        const activeBefore = getActivePetSnapshot(state);
        const result = {
            changed: false,
            now: nowMs,
            path: 'none',
            meta: {}
        };

        if (!isObject(state)) return result;

        if (OfflineSimulation && typeof OfflineSimulation.applyGardenOfflineGrowth === 'function') {
            const gardenResult = OfflineSimulation.applyGardenOfflineGrowth(state, Object.assign({}, options, { now: nowMs }));
            result.changed = !!(result.changed || (gardenResult && gardenResult.changed));
            result.meta.garden = gardenResult || null;
        }

        const householdStateApi = options.householdStateApi;
        const hasHouseholdPath = householdStateApi
            && typeof householdStateApi.simulateHouseholdToNowOnState === 'function';
        if (hasHouseholdPath) {
            const simResult = householdStateApi.simulateHouseholdToNowOnState(state, nowMs, options.householdOptions || null) || null;
            result.path = 'household';
            result.meta.household = simResult && simResult.meta ? simResult.meta : null;
            const householdMeta = result.meta.household || {};
            const householdChanged = !!(
                householdMeta.changed
                || (Number(householdMeta.appliedElapsedMs) > 0)
                || (Number(householdMeta.steps) > 0)
            );
            result.changed = !!(result.changed || householdChanged);
        } else if (OfflineSimulation && typeof OfflineSimulation.applyNeedsOfflineSimulation === 'function') {
            const needsResult = OfflineSimulation.applyNeedsOfflineSimulation(state, Object.assign({}, options, { now: nowMs }));
            result.path = 'legacy';
            result.meta.needs = needsResult || null;
            result.changed = !!(result.changed || (needsResult && needsResult.changed));
        }

        if (typeof options.getTimeOfDay === 'function') {
            state.timeOfDay = options.getTimeOfDay();
        }

        if (!state._offlineChanges) {
            const summary = buildOfflineSummaryIfNeeded(state, activeBefore, nowMs);
            if (summary) state._offlineChanges = summary;
        }

        return result;
    }

    return Object.freeze({
        OFFLINE_SUMMARY_MINUTES_THRESHOLD,
        applyOfflineProgression
    });
});
