const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('retention personalization classifies explorer style from repeated exploration actions', () => {
    global.gameState = { playerProfile: {}, economy: { playerId: 'pid_test' } };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'personalizationEnabled';
    const Personalization = freshRequire('../js/retention/personalization.js');

    for (let i = 0; i < 6; i++) Personalization.recordAction('explore', 1);
    for (let i = 0; i < 2; i++) Personalization.recordAction('care', 1);

    const profile = Personalization.getProfile();
    assert.ok(profile);
    assert.equal(profile.style, 'explorer');
    assert.equal(profile.confidence >= 0, true);

    delete global.gameState;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFRetentionPersonalization;
});

test('retention personalization tailors prompts by player style', () => {
    global.gameState = { playerProfile: {}, economy: { playerId: 'pid_test' } };
    global.isRetentionFeatureFlagEnabled = (flag) => flag === 'personalizationEnabled';
    const Personalization = freshRequire('../js/retention/personalization.js');

    for (let i = 0; i < 5; i++) Personalization.recordAction('collection', 1);
    const prompt = Personalization.tailorPrompt({
        title: 'Build today',
        body: 'Open Journey to continue.',
        ctaLabel: 'Open Journey',
        actionType: 'journey'
    });
    assert.ok(prompt);
    assert.equal(typeof prompt.playerStyle, 'string');
    assert.equal(prompt.ctaLabel.length > 0, true);

    delete global.gameState;
    delete global.isRetentionFeatureFlagEnabled;
    delete global.MLFRetentionPersonalization;
});

