const test = require('node:test');
const assert = require('node:assert/strict');

function freshRequire(modulePath) {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

test('emotional feedback orchestrator builds pet-first presentation plan', () => {
    global.showMomentSummary = () => {};
    const EmotionalFeedback = freshRequire('../js/ui/emotional-feedback.js');
    const plan = EmotionalFeedback.buildPresentationPlan({
        action: 'feed',
        petName: 'Waddles',
        affinity: 'love',
        firstTimeAction: false,
        reactionEmote: '😋',
        statDeltas: { hunger: 15, happiness: 2 },
        meta: [{ text: 'Daily task progress +1.', type: 'daily' }]
    });

    assert.equal(plan.petReaction.text.includes('Waddles'), true);
    assert.equal(plan.mainResult.text.length > 0, true);
    assert.equal(Array.isArray(plan.meta), true);
    assert.equal(plan.uiMode === 'inline' || plan.uiMode === 'banner' || plan.uiMode === 'ceremony', true);
    assert.ok(plan.effects && plan.effects.hapticPreset);

    delete global.showMomentSummary;
    delete global.MLFEmotionalFeedback;
});

test('emotional feedback captures legacy reward toasts as meta during active care moment', async () => {
    const received = [];
    global.showMomentSummary = (plan) => { received.push(plan); };
    const EmotionalFeedback = freshRequire('../js/ui/emotional-feedback.js');

    EmotionalFeedback.startCareMoment({
        action: 'play',
        petName: 'Waddles',
        statDeltas: { happiness: 10 }
    });
    const captured = EmotionalFeedback.captureLegacyToast({
        message: '🏆 Achievement: First Steps!',
        options: {}
    });
    assert.equal(captured, true);

    await new Promise((resolve) => setTimeout(resolve, 360));
    assert.equal(received.length > 0, true);
    assert.equal((received[received.length - 1].meta || []).some((m) => /achievement/i.test(String(m.type || '') + ' ' + String(m.text || ''))), true);

    EmotionalFeedback.endCareMoment({ flush: true });
    delete global.showMomentSummary;
    delete global.MLFEmotionalFeedback;
});
