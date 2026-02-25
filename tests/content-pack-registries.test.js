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

test('content packs stay deferred when registry service is missing and can be applied later', () => {
    const g = globalThis;
    const originalService = g.ContentPackRegistryService;
    g.ContentPackRegistryService = undefined;
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

    const packId = `test_deferred_collections_${Date.now()}`;
    contentPacks.registerContentPack({
        id: packId,
        type: 'collections',
        version: '1.0.0',
        items: [{ id: 'sticker_test_deferred', kind: 'sticker', data: { name: 'Deferred Sticker', emoji: '🕒' } }]
    });

    const deferredState = contentPacks.getContentPackApplyState(packId);
    assert.equal(deferredState.applied, false);
    assert.equal(deferredState.attempted, true);
    assert.equal(deferredState.deferred, true);
    assert.equal(g.STICKERS.sticker_test_deferred, undefined);

    g.ContentPackRegistryService = registryService;
    contentPacks.reapplyAllContentPacksToGlobals();

    const appliedState = contentPacks.getContentPackApplyState(packId);
    assert.equal(appliedState.applied, true);
    assert.equal(appliedState.deferred, false);
    assert.equal(g.STICKERS.sticker_test_deferred.name, 'Deferred Sticker');

    g.ContentPackRegistryService = originalService;
});

test('starter task packs merge into daily lanes and weekly arcs via registries', () => {
    const g = globalThis;
    g.ContentPackRegistryService = registryService;
    g.DAILY_FIXED_TASKS = [
        { id: 'base_fixed_a', nameTemplate: 'Base fixed', lane: 'fixed' }
    ];
    g.DAILY_MODE_TASKS = [
        { id: 'base_mode_a', nameTemplate: 'Base mode', lane: 'mode' }
    ];
    g.DAILY_WILDCARD_TASKS = [
        { id: 'base_wild_a', nameTemplate: 'Base wildcard', lane: 'wildcard' }
    ];
    g.DAILY_TASKS = [];
    g.WEEKLY_THEMED_ARCS = [
        { id: 'base_weekly_arc', theme: 'Base Arc', tasks: [{ id: 'base_task', trackKey: 'feedCount', target: 1 }] }
    ];
    g.DAILY_SEASONAL_TASKS = {};
    g.REWARD_MODIFIERS = {};
    g.REWARD_BUNDLES = {};
    g.STICKERS = {};
    g.BADGES = {};
    g.TROPHIES = {};
    g.EXPLORATION_LOOT = {};
    g.BIOME_LOOT_POOLS = {};
    g.BIOME_EVENT_TEXT_POOLS = {};
    g.BIOME_NPC_ENCOUNTER_TEXT_POOLS = {};
    g.RIVAL_TRAINERS = [];
    g.BOSS_ENCOUNTERS = {};
    g.FURNITURE = { decorations: {} };
    g.ROOM_FURNITURE_ITEMS = {};
    g.ROOM_THEMES = {};
    g.ROOM_COSMETIC_SETS = {};
    g.ROOM_COSMETIC_BONUSES = {};
    g.PET_TYPES = {
        dog: {}, cat: {}, bunny: {}, bird: {}, hamster: {}, turtle: {}, fish: {}, frog: {},
        hedgehog: {}, penguin: {}, unicorn: {}, dragon: {}, pegasus: {}
    };
    g.MUTATION_COLORS = {};
    g.MUTATION_PATTERNS = {};
    g.HYBRID_PET_TYPES = {};
    g.HYBRID_LOOKUP = {};
    g.PET_TYPE_ADVANTAGES = {};
    g.BREEDING_OUTCOME_FLAVOR_TEXTS = [];
    g.EXPLORATION_BIOMES = { forest: {}, beach: {}, mountain: {}, cave: {}, skyIsland: {}, underwater: {}, skyZone: {} };
    g.ROOMS = { arcade: {}, observatory: {}, garden: {}, kitchen: {} };

    require('../js/data/packs/starter-packs.js');
    const report = g.reapplyAllContentPacksToGlobals();

    assert.equal(report.ok, true, `Content pack validation errors: ${report.errors.join('; ')}`);

    assert.ok(g.DAILY_MODE_TASKS.some((t) => t && t.id === 'daily_explorer_loop'));
    assert.ok(g.DAILY_FIXED_TASKS.some((t) => t && t.id === 'daily_cleanup_care'));
    assert.ok(g.DAILY_WILDCARD_TASKS.some((t) => t && t.id === 'daily_bond_journal'));
    assert.ok(g.WEEKLY_THEMED_ARCS.some((arc) => arc && arc.id === 'arc_minigame_marathon'));
    assert.ok(g.WEEKLY_THEMED_ARCS.some((arc) => arc && arc.id === 'arc_culinary_current'));

    const dailyTaskIds = new Set(g.DAILY_TASKS.map((t) => t && t.id));
    assert.ok(dailyTaskIds.has('base_fixed_a'));
    assert.ok(dailyTaskIds.has('base_mode_a'));
    assert.ok(dailyTaskIds.has('base_wild_a'));
    assert.ok(dailyTaskIds.has('daily_explorer_loop'));
    assert.ok(dailyTaskIds.has('daily_bond_journal'));
});
