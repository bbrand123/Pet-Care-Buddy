const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

function installMemoryStorage() {
    const store = new Map();
    global.localStorage = {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); },
        removeItem(key) { store.delete(key); }
    };
}

test('retention experiments assign deterministically and support overrides', () => {
    installMemoryStorage();
    global.gameState = { economy: { playerId: 'pid_test' } };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'experimentsEnabled';

    const Experiments = freshRequire('../js/retention/experiments.js');
    const v1 = Experiments.getVariant('pacing_curve_v1');
    const v2 = Experiments.getVariant('pacing_curve_v1');
    assert.equal(v1, v2);

    const set = Experiments.setOverride('pacing_curve_v1', 'fast_early');
    assert.equal(set.ok, true);
    assert.equal(Experiments.getVariant('pacing_curve_v1'), 'fast_early');

    const cleared = Experiments.setOverride('pacing_curve_v1', 'auto');
    assert.equal(cleared.ok, true);
    assert.equal(typeof Experiments.getVariant('pacing_curve_v1'), 'string');

    delete global.localStorage;
    delete global.gameState;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFRetentionExperiments;
});

test('retention experiments provide tuning overrides for enabled experiments', () => {
    installMemoryStorage();
    global.gameState = { economy: { playerId: 'pid_test' } };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'experimentsEnabled';
    const Experiments = freshRequire('../js/retention/experiments.js');
    Experiments.setOverride('pacing_curve_v1', 'fast_early');
    Experiments.setOverride('reminder_timing_v1', 'early_evening');

    const base = {
        growthThresholds: { child: { actionsNeeded: 12, hoursNeeded: 1.5 } },
        journeyRewardPacing: { backlog: { dripLogins: 3, tokenPerMissedDay: 2 } },
        reminderCenter: {}
    };
    const tuned = Experiments.applyTuningOverrides(base);
    assert.equal(tuned.growthThresholds.child.actionsNeeded <= 12, true);
    assert.equal(tuned.journeyRewardPacing.backlog.dripLogins <= 3, true);
    assert.equal(tuned.reminderCenter.preferredStreakRiskHourLocal, 19);

    delete global.localStorage;
    delete global.gameState;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFRetentionExperiments;
});

