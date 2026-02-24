(function initMLFRetentionTelemetry(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFRetentionTelemetry = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionTelemetry() {
    'use strict';

    const STORAGE_KEYS = Object.freeze({
        queue: 'mlf_retention_telemetry_queue_v1',
        meta: 'mlf_retention_telemetry_meta_v1',
        flags: 'mlf_retention_flags_v1'
    });
    const EVENT_BATCH_SIZE = 30;
    const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
    const MAX_QUEUE = 1000;
    const MAX_BACKOFF_MS = 60 * 60 * 1000;
    const ACTIVITY_EVENTS = new Set([
        'journey_open',
        'streak_claim',
        'daily_completion',
        'comeback_open',
        'journey_objective_complete',
        'expedition_ready'
    ]);

    let _queue = null;
    let _meta = null;
    let _flushTimer = null;
    let _watchersInstalled = false;

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function now() {
        return Date.now();
    }

    function toDateString(ts) {
        const d = new Date(Number.isFinite(ts) ? ts : Date.now());
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function safeLocalStorage() {
        try {
            if (typeof localStorage === 'undefined') return null;
            return localStorage;
        } catch (_) {
            return null;
        }
    }

    function readJson(key, fallback) {
        const ls = safeLocalStorage();
        if (!ls) return fallback;
        try {
            const raw = ls.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (_) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        const ls = safeLocalStorage();
        if (!ls) return false;
        try {
            ls.setItem(key, JSON.stringify(value));
            return true;
        } catch (_) {
            return false;
        }
    }

    function getRuntimeFlags() {
        const defaults = {
            journeyEnabled: true,
            seasonalJourneyEnabled: false,
            telemetryCaptureEnabled: true,
            telemetryUploadEnabled: false,
            telemetryEndpoint: '',
            pacingV2Enabled: false,
            reminderPrioritizationV2Enabled: false,
            comebackQuestsEnabled: true,
            journeyTokenStoreRotationEnabled: true,
            householdRetentionBeatsEnabled: true,
            personalizationEnabled: true,
            rewardMomentEffectsEnabled: true,
            experimentsEnabled: false,
            devAdminEnabled: false
        };
        const fromConstants = (typeof RETENTION_FEATURE_FLAGS !== 'undefined' && RETENTION_FEATURE_FLAGS && isObject(RETENTION_FEATURE_FLAGS))
            ? RETENTION_FEATURE_FLAGS
            : {};
        const stored = readJson(STORAGE_KEYS.flags, {});
        return Object.assign({}, defaults, fromConstants, isObject(stored) ? stored : {});
    }

    function setFlag(key, value) {
        const current = getRuntimeFlags();
        current[key] = value;
        writeJson(STORAGE_KEYS.flags, current);
        return current[key];
    }

    function isDevAdminEnabled() {
        let queryHasDev = false;
        try {
            if (typeof location !== 'undefined' && location && typeof location.search === 'string') {
                const params = new URLSearchParams(location.search);
                queryHasDev = params.get('dev') === 'true';
            }
        } catch (_) {}
        return !!(queryHasDev || getRuntimeFlags().devAdminEnabled);
    }

    function ensureQueue() {
        if (_queue) return _queue;
        const stored = readJson(STORAGE_KEYS.queue, []);
        _queue = Array.isArray(stored) ? stored : [];
        return _queue;
    }

    function ensureMeta() {
        if (_meta) return _meta;
        const stored = readJson(STORAGE_KEYS.meta, {});
        _meta = {
            lastFlushAt: Number.isFinite(stored && stored.lastFlushAt) ? stored.lastFlushAt : 0,
            lastAttemptAt: Number.isFinite(stored && stored.lastAttemptAt) ? stored.lastAttemptAt : 0,
            backoffMs: Number.isFinite(stored && stored.backoffMs) ? stored.backoffMs : 0,
            lastError: typeof (stored && stored.lastError) === 'string' ? stored.lastError : '',
            lastSeenAt: Number.isFinite(stored && stored.lastSeenAt) ? stored.lastSeenAt : 0,
            expeditionReadyKey: typeof (stored && stored.expeditionReadyKey) === 'string' ? stored.expeditionReadyKey : ''
        };
        return _meta;
    }

    function persistQueueAndMeta() {
        writeJson(STORAGE_KEYS.queue, ensureQueue());
        writeJson(STORAGE_KEYS.meta, ensureMeta());
    }

    function inferPlayerId(payload) {
        if (payload && typeof payload.playerId === 'string' && payload.playerId) return payload.playerId;
        try {
            if (typeof gameState !== 'undefined' && gameState) {
                if (gameState.economy && typeof gameState.economy.playerId === 'string') return gameState.economy.playerId;
            }
        } catch (_) {}
        return 'unknown-player';
    }

    function enqueue(eventName, payload) {
        const flags = getRuntimeFlags();
        if (!flags.telemetryCaptureEnabled) return null;
        if (typeof eventName !== 'string' || !eventName) return null;
        const ts = Number.isFinite(payload && payload.timestamp) ? payload.timestamp : now();
        const record = Object.assign({}, payload || {}, {
            event: eventName,
            playerId: inferPlayerId(payload),
            timestamp: ts
        });
        const queue = ensureQueue();
        queue.push(record);
        if (queue.length > MAX_QUEUE) {
            queue.splice(0, queue.length - MAX_QUEUE);
        }
        persistQueueAndMeta();
        maybeScheduleFlush();
        return record;
    }

    function computeRetentionFunnelSnapshot(queueInput) {
        const events = Array.isArray(queueInput) ? queueInput : ensureQueue();
        const byPlayer = new Map();
        for (const event of events) {
            if (!event || typeof event.event !== 'string' || !ACTIVITY_EVENTS.has(event.event)) continue;
            const playerId = typeof event.playerId === 'string' && event.playerId ? event.playerId : 'unknown-player';
            const date = toDateString(Number(event.timestamp) || Date.now());
            let row = byPlayer.get(playerId);
            if (!row) {
                row = { firstDate: date, activeDates: new Set() };
                byPlayer.set(playerId, row);
            }
            if (date < row.firstDate) row.firstDate = date;
            row.activeDates.add(date);
        }

        const checkpoints = [1, 7, 14, 30];
        const cohorts = { size: byPlayer.size };
        checkpoints.forEach((day) => {
            cohorts['D' + day] = { retained: 0, pct: 0 };
        });

        for (const row of byPlayer.values()) {
            const first = new Date(row.firstDate + 'T00:00:00');
            for (const day of checkpoints) {
                const target = new Date(first.getTime() + (day * 86400000));
                const targetDate = toDateString(target.getTime());
                if (row.activeDates.has(targetDate)) {
                    cohorts['D' + day].retained += 1;
                }
            }
        }
        checkpoints.forEach((day) => {
            cohorts['D' + day].pct = cohorts.size > 0 ? Math.round((cohorts['D' + day].retained / cohorts.size) * 100) : 0;
        });
        return cohorts;
    }

    async function uploadBatch(records) {
        const flags = getRuntimeFlags();
        if (!flags.telemetryUploadEnabled) {
            return { ok: false, skipped: true, reason: 'upload-disabled' };
        }
        const endpoint = String(flags.telemetryEndpoint || '').trim();
        if (!endpoint || typeof fetch !== 'function') {
            return { ok: false, skipped: true, reason: 'endpoint-unavailable' };
        }
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ events: records })
        });
        if (!res.ok) {
            throw new Error('Telemetry upload failed with status ' + res.status);
        }
        return { ok: true };
    }

    async function flush(options) {
        const queue = ensureQueue();
        const meta = ensureMeta();
        if (queue.length === 0) return { ok: true, sent: 0, skipped: true };
        if (meta.backoffMs > 0 && (now() - meta.lastAttemptAt) < meta.backoffMs && !(options && options.force)) {
            return { ok: false, skipped: true, reason: 'backoff', waitMs: meta.backoffMs - (now() - meta.lastAttemptAt) };
        }

        const batch = queue.slice(0, EVENT_BATCH_SIZE);
        meta.lastAttemptAt = now();
        persistQueueAndMeta();
        try {
            const result = await uploadBatch(batch);
            if (result && result.ok) {
                queue.splice(0, batch.length);
                meta.lastFlushAt = now();
                meta.backoffMs = 0;
                meta.lastError = '';
            }
            persistQueueAndMeta();
            return Object.assign({ sent: result && result.ok ? batch.length : 0, remaining: queue.length }, result || {});
        } catch (err) {
            meta.backoffMs = meta.backoffMs > 0 ? Math.min(MAX_BACKOFF_MS, meta.backoffMs * 2) : 5000;
            meta.lastError = String((err && err.message) || err);
            persistQueueAndMeta();
            return { ok: false, error: meta.lastError, remaining: queue.length };
        }
    }

    function maybeScheduleFlush() {
        if (_flushTimer) return;
        _flushTimer = setTimeout(function onFlushTick() {
            _flushTimer = null;
            flush().catch(function noop() {});
            maybeScheduleFlush();
        }, FLUSH_INTERVAL_MS);
        if (_flushTimer && typeof _flushTimer.unref === 'function') {
            _flushTimer.unref();
        }
    }

    function getQueueSnapshot(limit) {
        const queue = ensureQueue();
        const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 25;
        return queue.slice(Math.max(0, queue.length - max));
    }

    function getDebugSnapshot() {
        const queue = ensureQueue();
        const meta = ensureMeta();
        const flags = getRuntimeFlags();
        return {
            flags,
            queueLength: queue.length,
            lastFlushAt: meta.lastFlushAt,
            lastAttemptAt: meta.lastAttemptAt,
            backoffMs: meta.backoffMs,
            lastError: meta.lastError,
            funnels: computeRetentionFunnelSnapshot(queue),
            recent: getQueueSnapshot(10)
        };
    }

    function emit(eventName, payload) {
        return enqueue(eventName, payload || {});
    }

    function recordReminderOptIn(method, permission) {
        return emit('reminder_opt_in', {
            method: method === 'ios' ? 'ios' : 'web',
            permission: typeof permission === 'string' ? permission : ''
        });
    }

    function recordReminderFired(reminderType, deepLink) {
        return emit('reminder_fired', {
            reminderType: typeof reminderType === 'string' ? reminderType : 'generic',
            deepLink: typeof deepLink === 'string' ? deepLink : ''
        });
    }

    function recordJourneyOpen(chapterId) {
        return emit('journey_open', { chapterId: typeof chapterId === 'string' ? chapterId : '' });
    }

    function recordComebackIfNeeded() {
        const meta = ensureMeta();
        const currentTs = now();
        const lastSeen = Number(meta.lastSeenAt) || 0;
        meta.lastSeenAt = currentTs;
        persistQueueAndMeta();
        if (!lastSeen) return null;
        const awayDays = Math.floor((currentTs - lastSeen) / 86400000);
        if (awayDays >= 1) {
            return emit('comeback_open', { awayDays });
        }
        return null;
    }

    function installStateWatchers() {
        if (_watchersInstalled) return;
        _watchersInstalled = true;
        try {
            if (typeof StateManager !== 'undefined' && StateManager && typeof StateManager.onChange === 'function') {
                StateManager.onChange('totalDailyCompletions', function onDailyCompletions(event) {
                    const next = Number(event && event.newValue) || 0;
                    const prev = Number(event && event.oldValue) || 0;
                    if (next > prev) {
                        emit('daily_completion', {
                            date: toDateString(now()),
                            completedObjectivesCount: next - prev
                        });
                    }
                });
                StateManager.onChange('exploration.expedition', function onExpedition(event) {
                    const next = event && event.newValue;
                    if (!next || typeof next !== 'object') return;
                    const endAt = Number(next.endAt) || 0;
                    if (!endAt || now() < endAt) return;
                    const meta = ensureMeta();
                    const key = 'expedition:' + toDateString(endAt);
                    if (meta.expeditionReadyKey === key) return;
                    meta.expeditionReadyKey = key;
                    persistQueueAndMeta();
                    emit('expedition_ready', { endAt });
                });
            }
        } catch (_) {}
    }

    function installLifecycleHooks() {
        maybeScheduleFlush();
        recordComebackIfNeeded();
        installStateWatchers();
        if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', function onVisibilityChange() {
                if (document.visibilityState === 'hidden') {
                    flush({ force: true }).catch(function noop() {});
                }
            });
        }
        if (typeof window !== 'undefined' && window && typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', function onPageHide() {
                flush({ force: true }).catch(function noop() {});
            });
        }
    }

    installLifecycleHooks();

    return Object.freeze({
        EVENT_BATCH_SIZE,
        FLUSH_INTERVAL_MS,
        emit,
        enqueue,
        flush,
        getDebugSnapshot,
        getQueueSnapshot,
        computeRetentionFunnelSnapshot,
        getRuntimeFlags,
        setFlag,
        isDevAdminEnabled,
        recordReminderOptIn,
        recordReminderFired,
        recordJourneyOpen,
        recordComebackIfNeeded
    });
});
