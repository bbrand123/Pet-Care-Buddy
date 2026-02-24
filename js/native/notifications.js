(function initMLFNativeNotifications(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFNativeNotifications = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFNativeNotifications() {
    'use strict';

    let _requestSeq = 0;
    const _pending = new Map();

    function hasNativeBridge() {
        return !!(typeof window !== 'undefined'
            && window.webkit
            && window.webkit.messageHandlers
            && window.webkit.messageHandlers.notifications
            && typeof window.webkit.messageHandlers.notifications.postMessage === 'function');
    }

    function nextRequestId() {
        _requestSeq += 1;
        return 'nativeNotif_' + Date.now().toString(36) + '_' + _requestSeq;
    }

    function postMessage(action, payload) {
        if (!hasNativeBridge()) return Promise.resolve({ ok: false, bridgeAvailable: false, reason: 'native-bridge-unavailable' });
        const requestId = nextRequestId();
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                _pending.delete(requestId);
                resolve({ ok: false, timedOut: true, requestId });
            }, 2500);
            _pending.set(requestId, { resolve, timeout });
            try {
                window.webkit.messageHandlers.notifications.postMessage(Object.assign({}, payload || {}, { action, requestId }));
            } catch (err) {
                clearTimeout(timeout);
                _pending.delete(requestId);
                resolve({ ok: false, requestId, error: String((err && err.message) || err) });
            }
        });
    }

    function requestPermission() {
        if (hasNativeBridge()) {
            return postMessage('requestPermission', {}).then((result) => {
                return String(result && result.permission ? result.permission : 'default');
            });
        }
        if (typeof Notification !== 'undefined' && Notification && typeof Notification.requestPermission === 'function') {
            return Notification.requestPermission().catch(() => 'denied');
        }
        return Promise.resolve('unsupported');
    }

    function scheduleReminder(input) {
        const payload = (input && typeof input === 'object') ? input : {};
        if (hasNativeBridge()) {
            return postMessage('schedule', {
                id: typeof payload.id === 'string' ? payload.id : '',
                title: typeof payload.title === 'string' ? payload.title : 'My Little Friend',
                body: typeof payload.body === 'string' ? payload.body : '',
                route: typeof payload.route === 'string' ? payload.route : '',
                reminderType: typeof payload.reminderType === 'string' ? payload.reminderType : '',
                delaySeconds: Number.isFinite(payload.delaySeconds) ? Math.max(1, Math.floor(payload.delaySeconds)) : null,
                fireAt: Number.isFinite(payload.fireAt) ? Math.floor(payload.fireAt) : null
            });
        }
        return Promise.resolve({ ok: false, bridgeAvailable: false, reason: 'web-fallback-only' });
    }

    function cancelReminder(id) {
        return postMessage('cancel', { id: typeof id === 'string' ? id : '' });
    }

    function cancelAllReminders() {
        return postMessage('cancelAll', {});
    }

    function handleNativeCallback(payload) {
        const data = (payload && typeof payload === 'object') ? payload : {};
        const requestId = typeof data.requestId === 'string' ? data.requestId : '';
        if (!requestId || !_pending.has(requestId)) return false;
        const pending = _pending.get(requestId);
        _pending.delete(requestId);
        clearTimeout(pending.timeout);
        pending.resolve(data);
        return true;
    }

    function openRoute(route) {
        const normalized = String(route || '').replace(/^#?\/?/, '').toLowerCase();
        if (!normalized) return false;
        if (normalized === 'streak') {
            if (typeof showStreakModal === 'function') showStreakModal();
            return true;
        }
        if (normalized === 'journey') {
            if (typeof Journey !== 'undefined' && Journey && typeof Journey.trackJourneyOpen === 'function') Journey.trackJourneyOpen();
            if (typeof showJourneyModal === 'function') showJourneyModal();
            return true;
        }
        if (normalized === 'explore' || normalized === 'expedition') {
            if (typeof showExplorationModal === 'function') showExplorationModal();
            return true;
        }
        if (normalized === 'garden') {
            if (typeof switchRoom === 'function') switchRoom('garden');
            if (typeof renderPetPhase === 'function') renderPetPhase();
            return true;
        }
        return false;
    }

    function handleNativeDeepLink(payload) {
        const data = (payload && typeof payload === 'object') ? payload : {};
        const route = typeof data.route === 'string' ? data.route : '';
        const reminderType = typeof data.reminderType === 'string' ? data.reminderType : 'generic';
        const opened = openRoute(route);
        if (typeof MLFRetentionTelemetry !== 'undefined' && MLFRetentionTelemetry && typeof MLFRetentionTelemetry.recordReminderFired === 'function') {
            MLFRetentionTelemetry.recordReminderFired(reminderType, route);
        }
        return opened;
    }

    const api = Object.freeze({
        hasNativeBridge,
        requestPermission,
        scheduleReminder,
        cancelReminder,
        cancelAllReminders,
        openRoute,
        __nativeCallback: handleNativeCallback,
        __nativeDeepLink: handleNativeDeepLink
    });

    if (typeof window !== 'undefined') {
        window.MLFNativeNotifications = api;
    }

    return api;
});
