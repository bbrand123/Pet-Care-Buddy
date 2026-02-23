const test = require('node:test');
const assert = require('node:assert/strict');

const registryService = require('../js/registries/content-registries.js');
const contentPacks = require('../js/content-packs.js');

test('content packs apply through registry service without pack-level global mutation assumptions', () => {
    const g = globalThis;
    g.ContentPackRegistryService = registryService;
    g.STICKERS = {};
    g.BADGES = {};
    g.TROPHIES = {};
    g.REWARD_MODIFIERS = {};
    g.REWARD_BUNDLES = {};
    g.EXPLORATION_BIOMES = {};
    g.ROOMS = {};
    g.ROOM_THEMES = {};
    g.ROOM_FURNITURE_ITEMS = {};
    g.FURNITURE = { decorations: {} };
    g.PET_TYPES = {};
    g.HYBRID_PET_TYPES = {};
    g.EXPLORATION_LOOT = {};

    let appliedCalls = 0;
    const originalApply = registryService.applyCollectionsPack;
    registryService.applyCollectionsPack = function wrapped(pack, options) {
        appliedCalls += 1;
        return originalApply.call(this, pack, options);
    };

    const packId = `test_collections_${Date.now()}`;
    contentPacks.registerContentPack({
        id: packId,
        type: 'collections',
        version: '1.0.0',
        items: [{ id: 'sticker_test_registry', kind: 'sticker', data: { name: 'Registry Sticker', emoji: '⭐' } }]
    });

    assert.equal(appliedCalls, 1);
    assert.equal(g.STICKERS.sticker_test_registry.name, 'Registry Sticker');

    registryService.applyCollectionsPack = originalApply;
});
