const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

function withFakeRuntime(fn) {
    const originals = {
        localStorage: global.localStorage,
        document: global.document,
        window: global.window,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout
    };
    const timers = [];
    let nextTimerId = 1;
    const storageCalls = [];
    const storageMap = new Map();
    const localStorage = {
        getItem(key) { return storageMap.has(String(key)) ? storageMap.get(String(key)) : null; },
        setItem(key, value) {
            storageCalls.push({ type: 'setItem', key: String(key), value: String(value) });
            storageMap.set(String(key), String(value));
        },
        removeItem(key) {
            storageCalls.push({ type: 'removeItem', key: String(key) });
            storageMap.delete(String(key));
        }
    };
    global.localStorage = localStorage;
    global.document = {
        visibilityState: 'visible',
        addEventListener() {}
    };
    global.window = {
        addEventListener() {}
    };
    global.setTimeout = (cb, ms) => {
        const id = nextTimerId++;
        timers.push({ id, cb, ms, cleared: false });
        return { __fakeTimerId: id, unref() {} };
    };
    global.clearTimeout = (handle) => {
        const id = handle && typeof handle === 'object' ? handle.__fakeTimerId : handle;
        const timer = timers.find((t) => t.id === id);
        if (timer) timer.cleared = true;
    };

    function runTimers(predicate) {
        for (const timer of timers) {
            if (timer.cleared) continue;
            if (predicate && !predicate(timer)) continue;
            timer.cleared = true;
            if (typeof timer.cb === 'function') timer.cb();
        }
    }

    try {
        return fn({ timers, runTimers, storageCalls, localStorage });
    } finally {
        if (originals.localStorage === undefined) delete global.localStorage;
        else global.localStorage = originals.localStorage;
        if (originals.document === undefined) delete global.document;
        else global.document = originals.document;
        if (originals.window === undefined) delete global.window;
        else global.window = originals.window;
        global.setTimeout = originals.setTimeout;
        global.clearTimeout = originals.clearTimeout;
        delete global.MLFRetentionTelemetry;
    }
}

test('retention telemetry computes D1/D7/D14/D30 snapshots locally', () => {
    const Telemetry = freshRequire('../js/retention/telemetry.js');
    const queue = [
        { event: 'journey_open', playerId: 'a', timestamp: Date.parse('2026-01-01T12:00:00Z') },
        { event: 'streak_claim', playerId: 'a', timestamp: Date.parse('2026-01-02T12:00:00Z') },
        { event: 'daily_completion', playerId: 'a', timestamp: Date.parse('2026-01-08T12:00:00Z') },
        { event: 'journey_open', playerId: 'a', timestamp: Date.parse('2026-01-15T12:00:00Z') },
        { event: 'comeback_open', playerId: 'a', timestamp: Date.parse('2026-01-31T12:00:00Z') },
        { event: 'journey_open', playerId: 'b', timestamp: Date.parse('2026-01-01T12:00:00Z') }
    ];
    const snapshot = Telemetry.computeRetentionFunnelSnapshot(queue);
    assert.equal(snapshot.size, 2);
    assert.equal(snapshot.D1.retained, 1);
    assert.equal(snapshot.D7.retained, 1);
    assert.equal(snapshot.D14.retained, 1);
    assert.equal(snapshot.D30.retained, 1);
    delete global.MLFRetentionTelemetry;
});

test('retention telemetry queues events append-only with event name and player', () => {
    const Telemetry = freshRequire('../js/retention/telemetry.js');
    global.gameState = { economy: { playerId: 'pid_queue' } };
    const record = Telemetry.emit('journey_open', { chapterId: 'chapter1' });
    assert.equal(record.event, 'journey_open');
    assert.equal(record.playerId, 'pid_queue');
    const recent = Telemetry.getQueueSnapshot(1);
    assert.equal(recent.length >= 1, true);
    delete global.gameState;
    delete global.MLFRetentionTelemetry;
});

test('retention telemetry does not start a flush loop when queue is empty', () => {
    withFakeRuntime(() => {
        const Telemetry = freshRequire('../js/retention/telemetry.js');
        const timerState = Telemetry.__debug.getTimerState();
        assert.equal(timerState.queueLength, 0);
        assert.equal(timerState.hasFlushTimer, false);
    });
});

test('retention telemetry batches queue/meta persistence writes for rapid events', () => {
    withFakeRuntime(({ storageCalls, runTimers }) => {
        const Telemetry = freshRequire('../js/retention/telemetry.js');
        storageCalls.length = 0; // Ignore initial lifecycle/meta bookkeeping writes.

        Telemetry.emit('journey_open', { chapterId: 'c1' });
        Telemetry.emit('journey_open', { chapterId: 'c2' });

        assert.equal(storageCalls.length, 0);
        assert.equal(Telemetry.__debug.getTimerState().hasPersistTimer, true);

        runTimers((timer) => Number(timer.ms) < 1000);

        const setCalls = storageCalls.filter((call) => call.type === 'setItem');
        assert.equal(setCalls.length, 2);
        assert.equal(Telemetry.__debug.getTimerState().queueLength, 2);
    });
});
