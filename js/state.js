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
        if (Array.isArray(value)) return value.slice();
        return Object.assign({}, value);
    }

    const STATE_EVENTS = Object.freeze({
        changed: 'state:changed',
        replaced: 'state:replaced'
    });

    const StateManager = {
        _rawState: null,
        _state: null,
        _proxyCache: null,
        _eventBus: null,
        _listeners: [],
        _suspendEventsDepth: 0,

        init(state, options) {
            this._rawState = isObject(state) ? state : {};
            this._proxyCache = new WeakMap();
            this._eventBus = options && options.eventBus ? options.eventBus : (global.EventBus || null);
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
                if (!this._state) this._state = this._createProxy(target, '');
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

        toSaveData() {
            if (!this._rawState) return '{}';
            const offlineChanges = this._rawState._offlineChanges;
            const hadOffline = Object.prototype.hasOwnProperty.call(this._rawState, '_offlineChanges');
            if (hadOffline) delete this._rawState._offlineChanges;
            try {
                return JSON.stringify(this._rawState);
            } finally {
                if (hadOffline) this._rawState._offlineChanges = offlineChanges;
            }
        },

        loadSaveData(data, meta) {
            if (!isObject(data)) return;
            this.replaceState(data, Object.assign({ reason: 'loadSaveData' }, meta || null));
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

            if (payload.path === 'economy.coins') {
                const events = global.EVENTS || {};
                const coinsEvent = events.COINS_CHANGED || 'economy:coinsChanged';
                this._emitEvent(coinsEvent, {
                    balance: Number(payload.newValue) || 0,
                    previousBalance: Number(payload.oldValue) || 0,
                    source: payload.meta && payload.meta.source ? payload.meta.source : 'state'
                });
            }
        },

        _emitEvent(eventName, payload) {
            const bus = this._eventBus || global.EventBus;
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
            const manager = this;
            const proxy = new Proxy(target, {
                get(obj, prop, receiver) {
                    if (prop === '__raw__') return obj;
                    const value = Reflect.get(obj, prop, receiver);
                    if (!isTrackableObject(value)) return value;
                    return manager._createProxy(value, joinPath(basePath, prop));
                },
                set(obj, prop, value, receiver) {
                    const path = joinPath(basePath, prop);
                    const oldValue = obj[prop];
                    const nextValue = manager._unwrapProxy(value);
                    const changed = !Object.is(oldValue, nextValue);
                    const ok = Reflect.set(obj, prop, nextValue, receiver);
                    if (ok && changed) {
                        manager._emitChange({ type: 'set', path, oldValue, newValue: nextValue, meta: { source: 'proxy' } });
                    }
                    return ok;
                },
                deleteProperty(obj, prop) {
                    const path = joinPath(basePath, prop);
                    if (!Object.prototype.hasOwnProperty.call(obj, prop)) return true;
                    const oldValue = obj[prop];
                    const ok = Reflect.deleteProperty(obj, prop);
                    if (ok) {
                        manager._emitChange({ type: 'delete', path, oldValue, newValue: undefined, meta: { source: 'proxy' } });
                    }
                    return ok;
                }
            });
            if (this._proxyCache) this._proxyCache.set(target, proxy);
            return proxy;
        }
    };

    Object.defineProperties(StateManager, {
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

    global.StateManager = StateManager;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StateManager;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
