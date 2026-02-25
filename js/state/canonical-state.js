(function initMLFCanonicalGameState(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFCanonicalGameState = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFCanonicalGameState() {
    'use strict';

    const DEFAULT_TRANSIENT_KEYS = Object.freeze([
        '_offlineChanges',
        '_hadOfflineChangesOnLoad',
        '_sessionMinigameCount',
        '_minigameRewardSession',
        '_careActionTimestamps'
    ]);

    const DEFAULT_TRANSIENT_PATHS = Object.freeze([
        'security.coinGainSession.earned',
        'security.coinGainMinute.windowStart',
        'security.coinGainMinute.earned'
    ]);

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function deepCloneJson(value) {
        if (value == null) return value;
        return JSON.parse(JSON.stringify(value));
    }

    function splitPath(path) {
        if (!path) return [];
        return String(path).split('.').filter(Boolean);
    }

    function setPathIfPresent(target, path, nextValue) {
        const parts = splitPath(path);
        if (parts.length === 0) return false;
        let cursor = target;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!isObject(cursor)) return false;
            cursor = cursor[parts[i]];
        }
        if (!isObject(cursor) && typeof cursor !== 'object') return false;
        const leaf = parts[parts.length - 1];
        if (!cursor || !Object.prototype.hasOwnProperty.call(cursor, leaf)) return false;
        cursor[leaf] = nextValue;
        return true;
    }

    function shouldStripPath(path, transientPathsSet) {
        if (!path || !transientPathsSet || transientPathsSet.size === 0) return false;
        return transientPathsSet.has(path);
    }

    function cloneWithoutTransients(value, config, basePath) {
        const transientKeys = config.transientKeys;
        const transientPaths = config.transientPaths;
        const path = basePath || '';

        if (Array.isArray(value)) {
            return value.map(function mapChild(child, idx) {
                return cloneWithoutTransients(child, config, path ? (path + '.' + idx) : String(idx));
            });
        }
        if (!isObject(value)) return value;

        const out = {};
        Object.keys(value).forEach(function eachKey(key) {
            if (transientKeys.has(String(key))) return;
            const childPath = path ? (path + '.' + key) : String(key);
            if (shouldStripPath(childPath, transientPaths)) return;
            out[key] = cloneWithoutTransients(value[key], config, childPath);
        });
        return out;
    }

    function stripTransientState(state, options) {
        const transientKeys = new Set(
            ((options && options.transientKeys) || DEFAULT_TRANSIENT_KEYS).map(function normalizeKey(key) {
                return String(key);
            })
        );
        const transientPaths = new Set(
            ((options && options.transientPaths) || DEFAULT_TRANSIENT_PATHS).map(function normalizePath(path) {
                return String(path);
            })
        );
        const root = isObject(state) || Array.isArray(state) ? state : {};
        return cloneWithoutTransients(root, { transientKeys, transientPaths }, '');
    }

    function ensureLegacyPetViews(state) {
        if (!isObject(state)) return state;
        if (!Array.isArray(state.pets)) {
            state.pets = state.pet ? [state.pet] : [];
        }
        state.pets = state.pets.filter(function onlyObjects(pet) {
            return !!pet && typeof pet === 'object';
        });
        if (!Number.isInteger(state.activePetIndex) || state.activePetIndex < 0) {
            state.activePetIndex = 0;
        }
        if (state.activePetIndex >= state.pets.length && state.pets.length > 0) {
            state.activePetIndex = 0;
        }
        if (!isObject(state.relationships)) {
            state.relationships = {};
        }
        if (state.pets.length > 0) {
            state.pet = state.pets[state.activePetIndex] || state.pets[0];
        } else if (!isObject(state.pet)) {
            state.pet = null;
        }
        return state;
    }

    function resetRuntimeTransientState(state, options) {
        if (!isObject(state)) return state;
        const now = Number.isFinite(Number(options && options.now)) ? Number(options.now) : Date.now();
        DEFAULT_TRANSIENT_KEYS.forEach(function clearTransientKey(key) {
            if (key === '_offlineChanges' && options && options.preserveOfflineChanges) return;
            if (key === '_sessionMinigameCount') state[key] = 0;
            else if (key === '_careActionTimestamps') state[key] = [];
            else if (Object.prototype.hasOwnProperty.call(state, key)) delete state[key];
        });
        setPathIfPresent(state, 'security.coinGainSession.earned', 0);
        setPathIfPresent(state, 'security.coinGainMinute.windowStart', 0);
        setPathIfPresent(state, 'security.coinGainMinute.earned', 0);

        if (!isObject(state.household)) {
            state.household = {
                activePetId: null,
                petsById: {},
                relationships: {},
                lastSimulatedAt: now,
                simVersion: 1
            };
        } else {
            if (!isObject(state.household.petsById)) state.household.petsById = {};
            if (!isObject(state.household.relationships)) state.household.relationships = {};
            if (!Number.isFinite(Number(state.household.lastSimulatedAt))) state.household.lastSimulatedAt = now;
            if (!Number.isInteger(state.household.simVersion)) state.household.simVersion = 1;
        }
        return state;
    }

    function normalizeLoadedState(state, options) {
        const opts = isObject(options) ? options : {};
        if (!isObject(state)) return {};
        const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : Date.now();

        ensureLegacyPetViews(state);

        if (typeof opts.ensureHouseholdState === 'function') {
            try {
                opts.ensureHouseholdState(state, now);
            } catch (err) {
                if (typeof opts.onWarning === 'function') {
                    opts.onWarning('ensureHouseholdState', err);
                }
            }
        }

        if (Array.isArray(opts.normalizers)) {
            opts.normalizers.forEach(function runNormalizer(normalizeFn) {
                if (typeof normalizeFn !== 'function') return;
                normalizeFn(state, { now, mode: opts.mode || 'load' });
            });
        }

        if (opts.resetRuntimeTransientState !== false) {
            resetRuntimeTransientState(state, { now, preserveOfflineChanges: !!opts.preserveOfflineChanges });
        }

        ensureLegacyPetViews(state);
        return state;
    }

    function createInitialState(options) {
        const opts = isObject(options) ? options : {};
        const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : Date.now();
        let state = null;
        if (typeof opts.baseFactory === 'function') {
            state = opts.baseFactory({ now });
        } else if (isObject(opts.baseState)) {
            state = deepCloneJson(opts.baseState);
        } else {
            state = {};
        }
        if (!isObject(state)) state = {};
        return normalizeLoadedState(state, Object.assign({}, opts, { now, mode: 'initial' }));
    }

    return Object.freeze({
        DEFAULT_TRANSIENT_KEYS,
        DEFAULT_TRANSIENT_PATHS,
        createInitialState,
        normalizeLoadedState,
        resetRuntimeTransientState,
        stripTransientState
    });
});
