const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('retention visible rewards grant permanent unlocks and summarize counts', () => {
    global.gameState = { meta: {} };
    const VisibleRewards = freshRequire('../js/retention/visible-rewards.js');

    const grant1 = VisibleRewards.grantVisibleReward('roomProp');
    const grant2 = VisibleRewards.grantVisibleReward('emote');
    const grant3 = VisibleRewards.grantVisibleReward('photoFrame');
    assert.equal(grant1.ok, true);
    assert.equal(grant2.ok, true);
    assert.equal(grant3.ok, true);

    const summary = VisibleRewards.getVisibleRewardsSummary();
    assert.ok(summary);
    assert.equal(summary.total >= 3, true);
    assert.equal(summary.rows.find((r) => r.kind === 'roomProp').count >= 1, true);
    assert.equal(Array.isArray(summary.recent), true);

    delete global.gameState;
    delete global.MLFRetentionVisibleRewards;
});

test('retention visible rewards reports duplicates when preferred id already owned', () => {
    global.gameState = { meta: {} };
    const VisibleRewards = freshRequire('../js/retention/visible-rewards.js');
    const first = VisibleRewards.grantVisibleReward('ambient', 'ambient_fireflies');
    const second = VisibleRewards.grantVisibleReward('ambient', 'ambient_fireflies');
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.duplicate, true);

    delete global.gameState;
    delete global.MLFRetentionVisibleRewards;
});

