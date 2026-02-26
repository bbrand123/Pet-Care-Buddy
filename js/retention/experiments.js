(function initMLFRetentionExperiments(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFRetentionExperiments = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionExperiments(root) {
    'use strict';

    const STORAGE_KEY = 'mlf_retention_experiments_v1';
    const DEFAULT_EXPERIMENTS = Object.freeze({
        pacing_curve_v1: {
            id: 'pacing_curve_v1',
            enabledFlag: 'experimentsEnabled',
            variants: ['control', 'fast_early'],
            weights: [0.5, 0.5]
        },
        reminder_timing_v1: {
            id: 'reminder_timing_v1',
            enabledFlag: 'experimentsEnabled',
            variants: ['control', 'early_evening', 'late_evening'],
            weights: [0.34, 0.33, 0.33]
        },
        emotional_copy_v1: {
            id: 'emotional_copy_v1',
            enabledFlag: 'experimentsEnabled',
            variants: ['control', 'style_forward'],
            weights: [0.5, 0.5]
        }
    });

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function safeStorage() {
        try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; }
    }

    function readState() {
        const ls = safeStorage();
        if (!ls) return { assignments: {}, overrides: {}, updatedAt: 0 };
        try {
            const parsed = JSON.parse(ls.getItem(STORAGE_KEY) || '{}');
            return {
                assignments: isObject(parsed.assignments) ? parsed.assignments : {},
                overrides: isObject(parsed.overrides) ? parsed.overrides : {},
                updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0
            };
        } catch (_) {
            return { assignments: {}, overrides: {}, updatedAt: 0 };
        }
    }

    function writeState(state) {
        const ls = safeStorage();
        if (!ls) return false;
        try {
            ls.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (_) {
            return false;
        }
    }

    function hashString(input) {
        const str = String(input || '');
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function getPlayerId() {
        try {
            const gs = root && root.gameState;
            if (gs && gs.economy && typeof gs.economy.playerId === 'string' && gs.economy.playerId) return gs.economy.playerId;
        } catch (_) {}
        return 'unknown-player';
    }

    function isFlagEnabled(flagName) {
        if (!flagName) return true;
        if (typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled(flagName); } catch (_) {}
        }
        if (root && root.RETENTION_FEATURE_FLAGS && root.RETENTION_FEATURE_FLAGS[flagName] != null) {
            return !!root.RETENTION_FEATURE_FLAGS[flagName];
        }
        return true;
    }

    function weightedPick(variants, weights, seed) {
        const vs = Array.isArray(variants) ? variants.slice() : ['control'];
        if (vs.length === 1) return vs[0];
        const ws = Array.isArray(weights) && weights.length === vs.length ? weights : vs.map(() => 1 / vs.length);
        const total = ws.reduce((sum, n) => sum + (Number(n) > 0 ? Number(n) : 0), 0) || 1;
        const roll = (hashString(seed) % 100000) / 100000;
        let cursor = 0;
        for (let i = 0; i < vs.length; i++) {
            cursor += (Number(ws[i]) > 0 ? Number(ws[i]) : 0) / total;
            if (roll <= cursor || i === vs.length - 1) return vs[i];
        }
        return vs[0];
    }

    function getVariant(experimentId, playerId) {
        const def = DEFAULT_EXPERIMENTS[experimentId];
        if (!def) return 'control';
        if (!isFlagEnabled(def.enabledFlag)) return 'control';
        const state = readState();
        const overrides = state.overrides || {};
        if (typeof overrides[experimentId] === 'string' && overrides[experimentId]) return overrides[experimentId];
        const pid = playerId || getPlayerId();
        const key = `${experimentId}:${pid}`;
        if (typeof state.assignments[key] === 'string' && state.assignments[key]) return state.assignments[key];
        const picked = weightedPick(def.variants, def.weights, key);
        state.assignments[key] = picked;
        state.updatedAt = Date.now();
        writeState(state);
        return picked;
    }

    function getAssignments(playerId) {
        const out = {};
        Object.keys(DEFAULT_EXPERIMENTS).forEach((expId) => {
            out[expId] = getVariant(expId, playerId);
        });
        return out;
    }

    function setOverride(experimentId, variant) {
        const def = DEFAULT_EXPERIMENTS[experimentId];
        if (!def) return { ok: false, reason: 'unknown-experiment' };
        const safeVariant = String(variant || '').trim();
        if (safeVariant && safeVariant !== 'auto' && !def.variants.includes(safeVariant)) return { ok: false, reason: 'unknown-variant' };
        const state = readState();
        if (!isObject(state.overrides)) state.overrides = {};
        if (!safeVariant || safeVariant === 'auto') delete state.overrides[experimentId];
        else state.overrides[experimentId] = safeVariant;
        state.updatedAt = Date.now();
        writeState(state);
        return { ok: true, experimentId, variant: state.overrides[experimentId] || 'auto' };
    }

    function getRetentionTuningOverrides() {
        const assignments = getAssignments();
        const overrides = {};
        if (assignments.pacing_curve_v1 === 'fast_early') {
            overrides.growthThresholds = {
                child: { actionsNeeded: 10, hoursNeeded: 1.25 },
                adult: { actionsNeeded: 30, hoursNeeded: 4.5 }
            };
            overrides.journeyRewardPacing = { backlog: { dripLogins: 2, tokenPerMissedDay: 2 } };
        }
        if (assignments.reminder_timing_v1 === 'early_evening') {
            overrides.reminderCenter = { preferredStreakRiskHourLocal: 19 };
        } else if (assignments.reminder_timing_v1 === 'late_evening') {
            overrides.reminderCenter = { preferredStreakRiskHourLocal: 21 };
        }
        return overrides;
    }

    function deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        Object.keys(source).forEach(function(key) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
                && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        });
        return target;
    }

    function applyTuningOverrides(baseTuning) {
        if (!baseTuning || !isObject(baseTuning)) return baseTuning;
        if (!isFlagEnabled('experimentsEnabled')) return baseTuning;
        const overrides = getRetentionTuningOverrides();
        const out = JSON.parse(JSON.stringify(baseTuning));
        deepMerge(out, overrides);
        return out;
    }

    function getDebugSnapshot() {
        const state = readState();
        return {
            assignments: getAssignments(),
            overrides: Object.assign({}, state.overrides || {}),
            enabled: isFlagEnabled('experimentsEnabled')
        };
    }

    const api = Object.freeze({
        getAssignments,
        getVariant,
        setOverride,
        applyTuningOverrides,
        getRetentionTuningOverrides,
        getDebugSnapshot
    });

    if (root && typeof root === 'object') {
        root.MLFRetentionExperiments = api;
        if (typeof root.getRetentionExperimentVariant !== 'function') root.getRetentionExperimentVariant = api.getVariant;
        if (typeof root.applyRetentionExperimentTuningOverrides !== 'function') root.applyRetentionExperimentTuningOverrides = api.applyTuningOverrides;
    }

    return api;
});
