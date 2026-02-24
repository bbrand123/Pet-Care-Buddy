const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
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
