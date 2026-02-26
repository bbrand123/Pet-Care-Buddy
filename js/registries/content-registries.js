(function initContentPackRegistryService(global) {
    'use strict';

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function toId(value) {
        if (value == null) return '';
        return String(value);
    }

    function shallowClone(item) {
        if (Array.isArray(item)) return item.slice();
        if (isObject(item)) return Object.assign({}, item);
        return item;
    }

    function resolvePoolItemId(item, idKey, index, sourceHint) {
        if (item && typeof item === 'object') {
            if (item[idKey]) return toId(item[idKey]);
            if (item.id) return toId(item.id);
            if (item.key) return toId(item.key);
            if (item.name) return toId(item.name);
        }
        if (typeof item === 'string' || typeof item === 'number') return toId(item);
        return sourceHint ? `${sourceHint}_item_${index}` : `item_${index}`;
    }

    function ensureGlobalObject(targetGlobal, name, fallback) {
        if (!isObject(targetGlobal[name])) targetGlobal[name] = isObject(fallback) ? Object.assign({}, fallback) : {};
        return targetGlobal[name];
    }

    function ensureGlobalArray(targetGlobal, name) {
        if (!Array.isArray(targetGlobal[name])) targetGlobal[name] = [];
        return targetGlobal[name];
    }

    function upsertArrayById(targetArr, incomingItems, idKey, sourcePrefix) {
        const key = idKey || 'id';
        const byId = Object.create(null);
        targetArr.forEach((item, idx) => {
            const id = resolvePoolItemId(item, key, idx, sourcePrefix);
            byId[id] = idx;
            if (isObject(item) && !item[key]) item[key] = id;
        });
        incomingItems.forEach((item, idx) => {
            if (!isObject(item)) return;
            const next = Object.assign({}, item);
            const id = resolvePoolItemId(next, key, idx, sourcePrefix);
            next[key] = id;
            if (typeof byId[id] === 'number') targetArr[byId[id]] = Object.assign({}, targetArr[byId[id]], next);
            else {
                byId[id] = targetArr.length;
                targetArr.push(next);
            }
        });
    }

    function createRegistries(targetGlobal) {
        const g = targetGlobal || global;
        return {
            collections: {
                applyPack(pack) {
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        if (item.kind === 'sticker' && isObject(g.STICKERS)) g.STICKERS[item.id] = Object.assign({}, g.STICKERS[item.id] || {}, item.data || item);
                        if (item.kind === 'badge' && isObject(g.BADGES)) g.BADGES[item.id] = Object.assign({}, g.BADGES[item.id] || {}, item.data || item);
                        if (item.kind === 'trophy' && isObject(g.TROPHIES)) g.TROPHIES[item.id] = Object.assign({}, g.TROPHIES[item.id] || {}, item.data || item);
                        if (item.kind === 'rewardModifier' && isObject(g.REWARD_MODIFIERS)) {
                            const modifierId = toId(item.data && item.data.id || item.id);
                            g.REWARD_MODIFIERS[modifierId] = Object.assign({}, g.REWARD_MODIFIERS[modifierId] || {}, item.data || item, { id: modifierId });
                        }
                        if (item.kind === 'rewardBundle' && isObject(g.REWARD_BUNDLES)) {
                            const bundleId = toId(item.data && item.data.id || item.id);
                            g.REWARD_BUNDLES[bundleId] = Object.assign({}, g.REWARD_BUNDLES[bundleId] || {}, item.data || item, { id: bundleId });
                        }
                    });
                }
            },
            tasks: {
                applyPack(pack) {
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        if (item.kind === 'dailyTemplate') {
                            const lane = String(item.lane || item.data && item.data.lane || 'mode');
                            const task = Object.assign({}, item.data || item, { id: item.id });
                            if (lane === 'fixed' && Array.isArray(g.DAILY_FIXED_TASKS)) upsertArrayById(g.DAILY_FIXED_TASKS, [task], 'id');
                            else if (lane === 'wildcard' && Array.isArray(g.DAILY_WILDCARD_TASKS)) upsertArrayById(g.DAILY_WILDCARD_TASKS, [task], 'id');
                            else if (lane === 'seasonal' && isObject(g.DAILY_SEASONAL_TASKS)) {
                                const season = String(item.season || task.season || 'spring');
                                g.DAILY_SEASONAL_TASKS[season] = task;
                            } else if (Array.isArray(g.DAILY_MODE_TASKS)) upsertArrayById(g.DAILY_MODE_TASKS, [task], 'id');
                        }
                        if (item.kind === 'weeklyArc' && Array.isArray(g.WEEKLY_THEMED_ARCS)) {
                            upsertArrayById(g.WEEKLY_THEMED_ARCS, [Object.assign({}, item.data || item, { id: item.id })], 'id');
                        }
                        if (item.kind === 'rewardModifier' && isObject(g.REWARD_MODIFIERS)) {
                            const modifierId = toId(item.data && item.data.id || item.id);
                            g.REWARD_MODIFIERS[modifierId] = Object.assign({}, g.REWARD_MODIFIERS[modifierId] || {}, item.data || item, { id: modifierId });
                        }
                    });
                    if (Array.isArray(g.DAILY_TASKS)) {
                        g.DAILY_TASKS.length = 0;
                        asArray(g.DAILY_FIXED_TASKS).forEach((t) => g.DAILY_TASKS.push(t));
                        asArray(g.DAILY_MODE_TASKS).forEach((t) => g.DAILY_TASKS.push(t));
                        asArray(g.DAILY_WILDCARD_TASKS).forEach((t) => g.DAILY_TASKS.push(t));
                        // Include seasonal daily tasks so they are not silently omitted (P2-65)
                        if (isObject(g.DAILY_SEASONAL_TASKS)) {
                            Object.values(g.DAILY_SEASONAL_TASKS).forEach((t) => { if (t) g.DAILY_TASKS.push(t); });
                        }
                    }
                }
            },
            loot: {
                applyPack(pack) {
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        if (item.kind === 'lootItem' && isObject(g.EXPLORATION_LOOT)) {
                            g.EXPLORATION_LOOT[item.id] = Object.assign({}, g.EXPLORATION_LOOT[item.id] || {}, item.data || item, { id: item.id });
                        }
                        if (item.kind === 'biomeLootTable' && isObject(g.BIOME_LOOT_POOLS)) {
                            const biomeId = toId(item.biomeId);
                            const entries = asArray(item.entries);
                            const ids = entries.map((e) => toId(e && (e.id || e.lootId))).filter(Boolean);
                            const existing = Array.isArray(g.BIOME_LOOT_POOLS[biomeId]) ? g.BIOME_LOOT_POOLS[biomeId].slice() : [];
                            g.BIOME_LOOT_POOLS[biomeId] = Array.from(new Set(existing.concat(ids)));
                        }
                    });
                }
            },
            biomeEvents: {
                applyPack(pack) {
                    const events = ensureGlobalObject(g, 'BIOME_EVENT_TEXT_POOLS');
                    const npcs = ensureGlobalObject(g, 'BIOME_NPC_ENCOUNTER_TEXT_POOLS');
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        const biomeId = toId(item.biomeId);
                        if (!biomeId) return;
                        if (item.kind === 'event') {
                            if (!Array.isArray(events[biomeId])) events[biomeId] = [];
                            upsertArrayById(events[biomeId], [Object.assign({}, item)], 'id');
                        }
                        if (item.kind === 'npc') {
                            if (!Array.isArray(npcs[biomeId])) npcs[biomeId] = [];
                            upsertArrayById(npcs[biomeId], [Object.assign({}, item)], 'id');
                        }
                    });
                }
            },
            rivals: {
                applyPack(pack) {
                    if (!Array.isArray(g.RIVAL_TRAINERS)) return;
                    const incoming = pack.items.map((item) => {
                        const trainer = Object.assign({}, item.data || item);
                        trainer.id = item.id || trainer.id;
                        if (!trainer.name) trainer.name = item.id || 'Rival';
                        return trainer;
                    });
                    const existingIds = new Set(g.RIVAL_TRAINERS.map((trainer, idx) => toId(trainer && trainer.id || `rival_${idx}`)));
                    incoming.forEach((trainer) => {
                        const id = toId(trainer.id);
                        if (id && existingIds.has(id)) {
                            const idx = g.RIVAL_TRAINERS.findIndex((r, i) => toId(r && r.id || `rival_${i}`) === id);
                            if (idx >= 0) g.RIVAL_TRAINERS[idx] = Object.assign({}, g.RIVAL_TRAINERS[idx], trainer);
                            return;
                        }
                        g.RIVAL_TRAINERS.push(trainer);
                        if (id) existingIds.add(id);
                    });
                }
            },
            bosses: {
                applyPack(pack) {
                    if (!isObject(g.BOSS_ENCOUNTERS)) return;
                    pack.items.forEach((item) => {
                        const boss = Object.assign({}, item.data || item, { id: item.id || (item.data && item.data.id) || item.id });
                        const bossId = toId(item.id || boss.id);
                        if (!bossId) return;
                        g.BOSS_ENCOUNTERS[bossId] = Object.assign({}, g.BOSS_ENCOUNTERS[bossId] || {}, boss);
                    });
                }
            },
            cosmetics: {
                applyPack(pack) {
                    const furnitureDecor = isObject(g.FURNITURE) && isObject(g.FURNITURE.decorations) ? g.FURNITURE.decorations : null;
                    const roomFurniture = isObject(g.ROOM_FURNITURE_ITEMS) ? g.ROOM_FURNITURE_ITEMS : null;
                    const roomThemes = isObject(g.ROOM_THEMES) ? g.ROOM_THEMES : null;
                    const sets = ensureGlobalObject(g, 'ROOM_COSMETIC_SETS');
                    const bonuses = ensureGlobalObject(g, 'ROOM_COSMETIC_BONUSES');
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        if (item.kind === 'decoration' && furnitureDecor) furnitureDecor[item.id] = Object.assign({}, furnitureDecor[item.id] || {}, item.data || item);
                        if (item.kind === 'roomFurniture' && roomFurniture) roomFurniture[item.id] = Object.assign({}, roomFurniture[item.id] || {}, item.data || item);
                        if (item.kind === 'roomTheme' && roomThemes) roomThemes[item.id] = Object.assign({}, roomThemes[item.id] || {}, item.data || item);
                        if (item.kind === 'roomCosmeticSet') sets[item.id] = Object.assign({}, sets[item.id] || {}, item.data || item);
                        if (item.kind === 'roomCosmeticBonus') bonuses[item.id] = Object.assign({}, bonuses[item.id] || {}, item.data || item);
                    });
                }
            },
            breeding: {
                applyPack(pack) {
                    const mutationColors = isObject(g.MUTATION_COLORS) ? g.MUTATION_COLORS : null;
                    const mutationPatterns = isObject(g.MUTATION_PATTERNS) ? g.MUTATION_PATTERNS : null;
                    const hybrids = isObject(g.HYBRID_PET_TYPES) ? g.HYBRID_PET_TYPES : null;
                    const hybridLookup = isObject(g.HYBRID_LOOKUP) ? g.HYBRID_LOOKUP : null;
                    const advantages = isObject(g.PET_TYPE_ADVANTAGES) ? g.PET_TYPE_ADVANTAGES : null;
                    const flavorPool = ensureGlobalArray(g, 'BREEDING_OUTCOME_FLAVOR_TEXTS');
                    pack.items.forEach((item) => {
                        if (!item || !item.kind) return;
                        if (item.kind === 'mutationColor' && mutationColors) mutationColors[item.id] = Object.assign({}, mutationColors[item.id] || {}, item.data || item);
                        if (item.kind === 'mutationPattern' && mutationPatterns) mutationPatterns[item.id] = Object.assign({}, mutationPatterns[item.id] || {}, item.data || item);
                        if (item.kind === 'hybridType' && hybrids) {
                            const data = Object.assign({}, item.data || item, { id: item.id });
                            hybrids[item.id] = Object.assign({}, hybrids[item.id] || {}, data);
                            const parents = asArray(data.parents);
                            if (parents.length >= 2 && hybridLookup) {
                                hybridLookup[`${parents[0]}-${parents[1]}`] = item.id;
                                hybridLookup[`${parents[1]}-${parents[0]}`] = item.id;
                            }
                            if (advantages && parents.length >= 2) {
                                const combined = new Set([].concat(asArray(advantages[parents[0]]), asArray(advantages[parents[1]])));
                                advantages[item.id] = Array.from(combined);
                            }
                        }
                        if (item.kind === 'outcomeFlavor') {
                            upsertArrayById(flavorPool, [shallowClone(item)], 'id');
                        }
                    });
                }
            }
        };
    }

    const TYPE_TO_REGISTRY_KEY = Object.freeze({
        collections: 'collections',
        tasks: 'tasks',
        loot: 'loot',
        biomeEvents: 'biomeEvents',
        rivals: 'rivals',
        bosses: 'bosses',
        cosmetics: 'cosmetics',
        breeding: 'breeding'
    });

    const service = {
        createRegistries,
        applyPack(pack, options) {
            if (!pack || !pack.type) return false;
            const registries = createRegistries((options && options.global) || global);
            const registryKey = TYPE_TO_REGISTRY_KEY[String(pack.type)];
            const registry = registryKey ? registries[registryKey] : null;
            if (!registry || typeof registry.applyPack !== 'function') return false;
            registry.applyPack(pack);
            return true;
        },
        applyCollectionsPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'collections' }), options); },
        applyTasksPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'tasks' }), options); },
        applyLootPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'loot' }), options); },
        applyBiomeEventsPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'biomeEvents' }), options); },
        applyRivalsPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'rivals' }), options); },
        applyBossesPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'bosses' }), options); },
        applyCosmeticsPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'cosmetics' }), options); },
        applyBreedingPack(pack, options) { return this.applyPack(Object.assign({}, pack, { type: 'breeding' }), options); }
    };

    global.ContentPackRegistryService = service;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = service;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
