const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('retention reward effects schedule non-blocking haptic moments', async () => {
    const calls = [];
    global.triggerUiHaptic = (eventId, cfg) => {
        calls.push({ eventId, cfg });
        return true;
    };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'rewardMomentEffectsEnabled';
    const Effects = freshRequire('../js/retention/reward-effects.js');

    const started = Date.now();
    const ok = Effects.playRewardMoment('rewardClaim');
    assert.equal(ok, true);
    assert.equal(Date.now() - started < 20, true);

    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(calls.length > 0, true);

    delete global.triggerUiHaptic;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFRetentionRewardEffects;
});

