(function initStateManager(global) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object';
    }

    function isTrackableObject(value) {
        if (!isObject(value)) return false;
        if (value instanceof Date) return false;
        if (typeof Element !== 'undefined' && value instanceof Element) return false;
        return true;
    }

    function splitPath(path) {
        if (!path && path !== 0) return [];
        return String(path).split('.').filter(Boolean);
    }

    function joinPath(parent, prop) {
        const key = String(prop);
        return parent ? `${parent}.${key}` : key;
    }

    function readPath(root, path) {
        const parts = splitPath(path);
        let current = root;
        for (let i = 0; i < parts.length; i++) {
            if (!isObject(current)) return undefined;
            current = current[parts[i]];
        }
        return current;
    }

    function writePath(root, path, value) {
        const parts = splitPath(path);
        if (parts.length === 0) return { ok: false, oldValue: root, newValue: value };
        let current = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (!isObject(current[key])) current[key] = {};
            current = current[key];
        }
        const lastKey = parts[parts.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        return { ok: true, oldValue, newValue: value };
    }

    function cloneForEvent(value) {
        if (!isObject(value)) return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (e) {
            if (Array.isArray(value)) return value.slice();
            return Object.assign({}, value);
        }
    }

    function jsonCloneForSave(value, options) {
        const pretty = !!(options && options.pretty);
        const transientKeys = (options && Array.isArray(options.transientKeys))
            ? options.transientKeys
            : ['_offlineChanges'];
        const transientKeySet = new Set(transientKeys.map((key) => String(key)));
        const serialized = JSON.stringify(value, function saveReplacer(key, nestedValue) {
            if (transientKeySet.has(String(key))) return undefined;
            return nestedValue;
        }, pretty ? 2 : 0);
        return {
            serialized: typeof serialized === 'string' ? serialized : '{}',
            payload: JSON.parse(typeof serialized === 'string' ? serialized : '{}')
        };
    }

    function stripTransientStateIfAvailable(globalRef, value, options) {
        const canonical = globalRef && globalRef.MLFCanonicalGameState;
        if (canonical && typeof canonical.stripTransientState === 'function') {
            return canonical.stripTransientState(value, options);
        }
        return null;
    }

    function stampSchemaVersionIfAvailable(globalRef, payload, options) {
        if (!payload || !isObject(payload) || Array.isArray(payload)) return payload;
        if (options && options.includeSchemaVersion === false) return payload;
        const saveSchema = globalRef && globalRef.MLFSaveSchema;
        if (saveSchema && typeof saveSchema.stampSaveSchemaVersion === 'function') {
            saveSchema.stampSaveSchemaVersion(payload);
            return payload;
        }
        if (!Number.isInteger(payload.saveSchemaVersion)) {
            payload.saveSchemaVersion = 1;
        }
        return payload;
    }

    const STATE_EVENTS = Object.freeze({
        changed: 'state:changed',
        replaced: 'state:replaced'
    });

    function createStateManager(options) {
        const config = isObject(options) ? options : {};
        const globalRef = config.globalRef || global;

        const manager = {
            _rawState: null,
            _state: null,
            _proxyCache: null,
            _eventBus: null,
            _listeners: [],
            _suspendEventsDepth: 0,

            init(state, initOptions) {
                this._rawState = isObject(state) ? state : {};
                this._proxyCache = new WeakMap();
                this._eventBus = initOptions && initOptions.eventBus ? initOptions.eventBus : (globalRef.EventBus || null);
                this._state = this._createProxy(this._rawState, '');
                return this._state;
            },

            bindEventBus(eventBus) {
                this._eventBus = eventBus || null;
                return this;
            },

            getRoot() {
                return this._state;
            },

            getRawState() {
                return this._rawState;
            },

            get(path) {
                return readPath(this._rawState, path);
            },

            set(path, value, meta) {
                if (!this._rawState) return;
                const result = writePath(this._rawState, path, this._unwrapProxy(value));
                if (!result.ok) return;
                this._emitChange({
                    type: 'set',
                    path: String(path),
                    oldValue: result.oldValue,
                    newValue: result.newValue,
                    meta: meta || null
                });
            },

            update(path, fn, meta) {
                const current = this.get(path);
                const next = typeof fn === 'function' ? fn(current) : current;
                this.set(path, next, meta);
            },

            replaceState(nextState, meta) {
                if (!isObject(this._rawState)) {
                    this.init(nextState || {}, { eventBus: this._eventBus });
                    return this._state;
                }
                const target = this._rawState;
                const next = isObject(nextState) ? nextState : {};
                this._suspendEventsDepth++;
                try {
                    Object.keys(target).forEach((key) => { delete target[key]; });
                    Object.assign(target, next);
                    this._proxyCache = new WeakMap();
                    this._state = this._createProxy(target, '');
                } finally {
                    this._suspendEventsDepth--;
                }
                this._emitEvent(STATE_EVENTS.replaced, {
                    type: 'replace',
                    path: '',
                    oldValue: null,
                    newValue: this._state,
                    meta: meta || null
                });
                return this._state;
            },

            serialize(options) {
                const pretty = !!(options && options.pretty);
                if (!this._rawState) {
                    const emptyPayload = {};
                    stampSchemaVersionIfAvailable(globalRef, emptyPayload, options);
                    const emptySerialized = JSON.stringify(emptyPayload, null, pretty ? 2 : 0);
                    return {
                        payload: emptyPayload,
                        serialized: emptySerialized,
                        schemaVersion: emptyPayload.saveSchemaVersion
                    };
                }

                let payload = stripTransientStateIfAvailable(globalRef, this._rawState, options);
                if (!payload) {
                    payload = jsonCloneForSave(this._rawState, options).payload;
                }
                stampSchemaVersionIfAvailable(globalRef, payload, options);
                const serialized = JSON.stringify(payload, null, pretty ? 2 : 0);
                return {
                    payload,
                    serialized,
                    schemaVersion: payload.saveSchemaVersion
                };
            },

            toSaveData(options) {
                return this.serialize(options).serialized;
            },

            hydrate(data, meta) {
                let nextState = data;
                if (typeof nextState === 'string') {
                    try {
                        nextState = JSON.parse(nextState);
                    } catch (err) {
                        throw new TypeError('StateManager.hydrate expected valid JSON string payload.');
                    }
                }
                if (!isObject(nextState) || Array.isArray(nextState)) {
                    throw new TypeError('StateManager.hydrate expected an object save payload.');
                }
                return this.replaceState(nextState, Object.assign({ reason: 'hydrate' }, meta || null));
            },

            loadSaveData(data, meta) {
                return this.hydrate(data, Object.assign({ reason: 'loadSaveData' }, meta || null));
            },

            onChange(path, callback) {
                if (typeof callback !== 'function') return function noop() {};
                const listener = { path: path == null ? '' : String(path), callback };
                this._listeners.push(listener);
                return () => {
                    const idx = this._listeners.indexOf(listener);
                    if (idx >= 0) this._listeners.splice(idx, 1);
                };
            },

            _emitChange(event) {
                if (this._suspendEventsDepth > 0) return;
                const payload = {
                    type: event.type || 'set',
                    path: event.path || '',
                    oldValue: cloneForEvent(event.oldValue),
                    newValue: cloneForEvent(event.newValue),
                    meta: event.meta || null,
                    ts: Date.now()
                };

                const listeners = this._listeners.slice();
                for (let i = 0; i < listeners.length; i++) {
                    const listener = listeners[i];
                    if (!listener) continue;
                    if (listener.path && payload.path !== listener.path && !payload.path.startsWith(listener.path + '.')) continue;
                    try {
                        listener.callback(payload);
                    } catch (err) {
                        console.error('[StateManager] Error in onChange listener for "' + listener.path + '":', err);
                    }
                }

                this._emitEvent(STATE_EVENTS.changed, payload);
            },

            _emitEvent(eventName, payload) {
                const bus = this._eventBus || globalRef.EventBus;
                if (!bus || typeof bus.emit !== 'function') return;
                try {
                    bus.emit(eventName, payload);
                } catch (err) {
                    console.error('[StateManager] Error emitting event "' + eventName + '":', err);
                }
            },

            _unwrapProxy(value) {
                if (!isObject(value)) return value;
                return value.__raw__ || value;
            },

            _createProxy(target, basePath) {
                if (!isTrackableObject(target)) return target;
                if (this._proxyCache && this._proxyCache.has(target)) return this._proxyCache.get(target);
                const stateManager = this;
                const proxy = new Proxy(target, {
                    get(obj, prop, receiver) {
                        if (prop === '__raw__') return obj;
                        const value = Reflect.get(obj, prop, receiver);
                        if (!isTrackableObject(value)) return value;
                        return stateManager._createProxy(value, joinPath(basePath, prop));
                    },
                    set(obj, prop, value, receiver) {
                        const path = joinPath(basePath, prop);
                        const oldValue = obj[prop];
                        const nextValue = stateManager._unwrapProxy(value);
                        const changed = !Object.is(oldValue, nextValue);
                        const ok = Reflect.set(obj, prop, nextValue, receiver);
                        if (ok && changed) {
                            stateManager._emitChange({ type: 'set', path, oldValue, newValue: nextValue, meta: { source: 'proxy' } });
                        }
                        return ok;
                    },
                    deleteProperty(obj, prop) {
                        const path = joinPath(basePath, prop);
                        if (!Object.prototype.hasOwnProperty.call(obj, prop)) return true;
                        const oldValue = obj[prop];
                        const ok = Reflect.deleteProperty(obj, prop);
                        if (ok) {
                            stateManager._emitChange({ type: 'delete', path, oldValue, newValue: undefined, meta: { source: 'proxy' } });
                        }
                        return ok;
                    }
                });
                if (this._proxyCache) this._proxyCache.set(target, proxy);
                return proxy;
            }
        };

        Object.defineProperties(manager, {
            pets: {
                get() {
                    return this._state ? this._state.pets : [];
                }
            },
            activePet: {
                get() {
                    if (!this._state) return null;
                    return this._state.pet || (this._state.pets && this._state.pets[this._state.activePetIndex]) || null;
                }
            },
            coins: {
                get() {
                    return this._state && this._state.economy ? this._state.economy.coins : 0;
                },
                set(val) {
                    if (this._state && this._state.economy) {
                        this._state.economy.coins = val;
                    }
                }
            },
            phase: {
                get() {
                    return this._state ? this._state.phase : 'egg';
                }
            },
            currentRoom: {
                get() {
                    return this._state ? this._state.currentRoom : 'bedroom';
                }
            }
        });

        return manager;
    }

    const StateManager = createStateManager({ globalRef: global });

    global.StateManager = StateManager;
    global.createStateManager = createStateManager;
    global.MLFStateManagerEvents = STATE_EVENTS;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StateManager;
        module.exports.createStateManager = createStateManager;
        module.exports.STATE_EVENTS = STATE_EVENTS;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
