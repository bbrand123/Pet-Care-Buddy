const test = require('node:test');
const assert = require('node:assert/strict');

const MiniGameRegistry = require('../js/registries/minigame-registry.js');
const defaultDescriptors = require('../js/config/minigame-descriptors.js');

test('minigame registry validates and returns default descriptors', () => {
    MiniGameRegistry.clear();
    MiniGameRegistry.registerMany(defaultDescriptors);

    const all = MiniGameRegistry.getAll();
    assert.ok(all.length >= 15);
    assert.equal(all[0].id, 'fetch');
    assert.equal(MiniGameRegistry.get('trivia').scoreLabel, 'facts');

    assert.throws(() => MiniGameRegistry.validate({ name: 'Missing Id' }), /missing id/i);
});
