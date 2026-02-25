(function initMLFPlatformAdapters(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFPlatformAdapters = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFPlatformAdapters() {
    'use strict';

    function createSafeStorage(storageRef) {
        const storage = storageRef || (typeof localStorage !== 'undefined' ? localStorage : null);
        return Object.freeze({
            getItem(key, fallback) {
                try {
                    const value = storage && typeof storage.getItem === 'function' ? storage.getItem(key) : null;
                    return value == null ? fallback : value;
                } catch (_) {
                    return fallback;
                }
            },
            setItem(key, value) {
                try {
                    if (!storage || typeof storage.setItem !== 'function') return false;
                    storage.setItem(key, String(value));
                    return true;
                } catch (_) {
                    return false;
                }
            },
            removeItem(key) {
                try {
                    if (!storage || typeof storage.removeItem !== 'function') return false;
                    storage.removeItem(key);
                    return true;
                } catch (_) {
                    return false;
                }
            },
            getJSON(key, fallback) {
                const raw = this.getItem(key, null);
                if (!raw) return fallback;
                try {
                    return JSON.parse(raw);
                } catch (_) {
                    return fallback;
                }
            },
            setJSON(key, value) {
                try {
                    return this.setItem(key, JSON.stringify(value));
                } catch (_) {
                    return false;
                }
            }
        });
    }

    function createPreferenceAdapter(options) {
        const opts = options || {};
        const storage = opts.storage || createSafeStorage(opts.storageRef);
        return Object.freeze({
            getString(key, fallback) {
                return storage.getItem(key, fallback);
            },
            setString(key, value) {
                return storage.setItem(key, value);
            },
            getBoolean(key, fallback) {
                const raw = storage.getItem(key, null);
                if (raw == null) return !!fallback;
                if (raw === 'true') return true;
                if (raw === 'false') return false;
                return !!fallback;
            },
            setBoolean(key, value) {
                return storage.setItem(key, value ? 'true' : 'false');
            },
            getJSON(key, fallback) {
                return storage.getJSON(key, fallback);
            },
            setJSON(key, value) {
                return storage.setJSON(key, value);
            },
            remove(key) {
                return storage.removeItem(key);
            }
        });
    }

    function createHapticsAdapter(options) {
        const opts = options || {};
        const rootRef = opts.root || (typeof globalThis !== 'undefined' ? globalThis : {});
        const navigatorRef = opts.navigatorRef || (typeof navigator !== 'undefined' ? navigator : null);
        const prefs = opts.prefs || createPreferenceAdapter({ storage: opts.storage || createSafeStorage(opts.storageRef) });
        const hapticPrefKey = opts.hapticPrefKey || (rootRef.STORAGE_KEYS && rootRef.STORAGE_KEYS.hapticOff) || 'myLittleFriend_hapticOff';

        function isEnabled() {
            if (!hapticPrefKey) return true;
            return !prefs.getBoolean(hapticPrefKey, false);
        }

        function postNative(payload) {
            try {
                if (!isEnabled()) return false;
                const handler = rootRef && rootRef.webkit && rootRef.webkit.messageHandlers && rootRef.webkit.messageHandlers.haptics;
                if (!handler || typeof handler.postMessage !== 'function') return false;
                handler.postMessage(payload || { type: 'confirm', strength: 'light' });
                return true;
            } catch (_) {
                return false;
            }
        }

        function vibrate(pattern) {
            try {
                if (!isEnabled()) return false;
                if (!navigatorRef || typeof navigatorRef.vibrate !== 'function') return false;
                navigatorRef.vibrate(pattern);
                return true;
            } catch (_) {
                return false;
            }
        }

        return Object.freeze({
            isEnabled,
            postNative,
            vibrate
        });
    }

    function createNotificationBridge(options) {
        const opts = options || {};
        const rootRef = opts.root || (typeof globalThis !== 'undefined' ? globalThis : {});
        const eventBus = opts.eventBus || rootRef.EventBus;
        const events = opts.events || rootRef.EVENTS || {};

        function toast(message, color, optionsArg) {
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit(events.TOAST_REQUESTED || 'ui:toastRequested', {
                    message,
                    color,
                    options: optionsArg || {}
                });
                return true;
            }
            if (typeof rootRef.showToast === 'function') {
                rootRef.showToast(message, color, optionsArg || {});
                return true;
            }
            return false;
        }

        function announce(message, optionsArg) {
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit(events.ANNOUNCEMENT_REQUESTED || 'ui:announcementRequested', {
                    message,
                    options: optionsArg
                });
                return true;
            }
            if (typeof rootRef.announce === 'function') {
                rootRef.announce(message, optionsArg);
                return true;
            }
            return false;
        }

        return Object.freeze({ toast, announce });
    }

    function createDefaultAdapters(options) {
        const opts = options || {};
        const storage = createSafeStorage(opts.storageRef);
        const prefs = createPreferenceAdapter({ storage });
        const haptics = createHapticsAdapter({
            root: opts.root,
            navigatorRef: opts.navigatorRef,
            storage,
            prefs,
            hapticPrefKey: opts.hapticPrefKey
        });
        const notifications = createNotificationBridge({
            root: opts.root,
            eventBus: opts.eventBus,
            events: opts.events
        });
        return Object.freeze({ storage, prefs, haptics, notifications });
    }

    return Object.freeze({
        createSafeStorage,
        createPreferenceAdapter,
        createHapticsAdapter,
        createNotificationBridge,
        createDefaultAdapters
    });
});
