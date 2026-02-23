(function initContentPacks(global) {
    'use strict';

    const registry = [];
    const registryById = Object.create(null);
    const appliedToGlobals = Object.create(null);

    const TYPE_REQUIRED_FIELDS = {
        trivia: ['id', 'prompt', 'choices', 'answer'],
        matching: ['id', 'theme', 'pairs'],
        cooking: ['id'],
        fishing: ['id', 'name', 'rarity'],
        coloring: ['id', 'name'],
        tournaments: ['id'],
        rivals: ['id', 'name', 'petType', 'petName'],
        bosses: ['id', 'name', 'moves'],
        loot: ['id', 'kind'],
        biomeEvents: ['id', 'biomeId', 'kind'],
        tasks: ['id', 'kind'],
        collections: ['id', 'kind'],
        cosmetics: ['id', 'kind'],
        breeding: ['id', 'kind'],
        ruleModifiers: ['id', 'kind', 'scopes']
    };

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function toId(value) {
        if (value === null || typeof value === 'undefined') return '';
        return String(value);
    }

    function shallowClone(item) {
        if (Array.isArray(item)) return item.slice();
        if (isObject(item)) return Object.assign({}, item);
        return item;
    }

    function hashStringToUintLocal(input) {
        const s = String(input || '');
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function getDayKey() {
        try {
            if (typeof global.getTodayStringWithTimeHardening === 'function') return global.getTodayStringWithTimeHardening();
            if (typeof global.getTodayString === 'function') return global.getTodayString();
        } catch (e) {}
        return new Date().toISOString().slice(0, 10);
    }

    function getWeekKeySafe() {
        try {
            if (typeof global.getWeekKey === 'function') return global.getWeekKey();
        } catch (e) {}
        return getDayKey().slice(0, 8) + 'W';
    }

    function ensureContentRotationState(targetState) {
        const state = (targetState && typeof targetState === 'object') ? targetState : global.gameState;
        if (!state || typeof state !== 'object') return { counters: {}, histories: {} };
        if (!isObject(state.contentRotation)) state.contentRotation = {};
        const cr = state.contentRotation;
        if (!isObject(cr.counters)) cr.counters = {};
        if (!isObject(cr.histories)) cr.histories = {};
        return cr;
    }

    function ensureHistoryBucket(scope, key, targetState) {
        const cr = ensureContentRotationState(targetState);
        const scopeId = toId(scope || 'default');
        const keyId = toId(key || 'default');
        if (!isObject(cr.histories[scopeId])) cr.histories[scopeId] = {};
        if (!isObject(cr.histories[scopeId][keyId])) {
            cr.histories[scopeId][keyId] = {
                recent: [],
                lastSeenOrder: {},
                count: 0
            };
        }
        const bucket = cr.histories[scopeId][keyId];
        if (!Array.isArray(bucket.recent)) bucket.recent = [];
        if (!isObject(bucket.lastSeenOrder)) bucket.lastSeenOrder = {};
        if (!Number.isFinite(bucket.count)) bucket.count = 0;
        return bucket;
    }

    function recordHistorySelection(scope, key, itemId, options) {
        const id = toId(itemId);
        if (!id) return null;
        const opts = isObject(options) ? options : {};
        const bucket = ensureHistoryBucket(scope, key, opts.state);
        const recentWindow = Math.max(0, Math.floor(Number(opts.recentWindow) || 4));
        bucket.count = Math.max(0, Math.floor(bucket.count || 0)) + 1;
        bucket.lastSeenOrder[id] = bucket.count;
        bucket.recent = [id].concat(bucket.recent.filter((v) => v !== id));
        if (bucket.recent.length > Math.max(recentWindow, 12)) bucket.recent.length = Math.max(recentWindow, 12);
        return bucket;
    }

    function resolvePoolItemId(item, idKey, index) {
        if (item && typeof item === 'object') {
            if (item[idKey]) return toId(item[idKey]);
            if (item.id) return toId(item.id);
            if (item.key) return toId(item.key);
            if (item.name) return toId(item.name);
        }
        if (typeof item === 'string' || typeof item === 'number') return toId(item);
        return `item_${index}`;
    }

    function chooseNextFromPool(pool, history, rules) {
        const items = asArray(pool).filter((item) => item !== null && typeof item !== 'undefined');
        if (items.length === 0) return null;
        const cfg = isObject(rules) ? rules : {};
        const idKey = cfg.idKey || 'id';
        const recentWindow = Math.max(0, Math.floor(Number(cfg.recentWindow) || 3));
        const nowOrder = Math.max(0, Math.floor(Number(history && history.count) || 0)) + 1;
        const recent = Array.isArray(history && history.recent) ? history.recent.map(toId) : [];
        const lastSeenOrder = isObject(history && history.lastSeenOrder) ? history.lastSeenOrder : {};
        const allowRecent = items.length <= Math.max(2, recentWindow + 1);
        const blocked = allowRecent ? new Set() : new Set(recent.slice(0, recentWindow));
        const immediateRepeatId = (!cfg.allowImmediateRepeat && items.length > 1) ? toId(recent[0]) : '';

        function buildWeighted(skipImmediateRepeat) {
            let weighted = [];
            let total = 0;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const id = resolvePoolItemId(item, idKey, i);
                if (!allowRecent && blocked.has(id)) continue;
                if (skipImmediateRepeat && immediateRepeatId && id === immediateRepeatId) continue;
                const explicitWeight = (item && typeof item === 'object' && Number.isFinite(item.weight)) ? Number(item.weight) : 1;
                const baseWeight = Math.max(0.01, explicitWeight);
                const seenOrder = Number(lastSeenOrder[id]) || 0;
                const unseenBoost = seenOrder > 0 ? 1 : Math.max(1, Number(cfg.unseenBoost) || 2.25);
                const recencyDistance = seenOrder > 0 ? Math.max(1, nowOrder - seenOrder) : Math.max(2, items.length + 1);
                const recencyBoost = Math.min(3, 1 + (recencyDistance / Math.max(2, items.length)));
                const finalWeight = baseWeight * unseenBoost * recencyBoost;
                total += finalWeight;
                weighted.push({ item, weight: finalWeight, id });
            }
            return { weighted, total };
        }

        let { weighted, total } = buildWeighted(true);
        if (weighted.length === 0 && immediateRepeatId) ({ weighted, total } = buildWeighted(false));

        if (weighted.length === 0) {
            const fallback = items[Math.floor(Math.random() * items.length)];
            return fallback;
        }
        if (total <= 0) return weighted[weighted.length - 1].item;
        let roll = Math.random() * total;
        for (let i = 0; i < weighted.length; i++) {
            roll -= weighted[i].weight;
            if (roll <= 0) return weighted[i].item;
        }
        return weighted[weighted.length - 1].item;
    }

    function chooseRotatingContentWithHistory(pool, options) {
        const opts = isObject(options) ? options : {};
        const scope = opts.scope || 'global';
        const key = opts.key || 'default';
        const idKey = opts.idKey || 'id';
        const history = ensureHistoryBucket(scope, key, opts.state);
        const choice = chooseNextFromPool(pool, history, {
            idKey,
            recentWindow: opts.recentWindow,
            unseenBoost: opts.unseenBoost
        });
        if (!choice) return null;
        const choiceId = resolvePoolItemId(choice, idKey, 0);
        recordHistorySelection(scope, key, choiceId, { state: opts.state, recentWindow: opts.recentWindow });
        return choice;
    }

    function normalizePackItemForMap(item, fallbackId) {
        if (!isObject(item)) return null;
        const id = toId(item.id || fallbackId);
        if (!id) return null;
        return Object.assign({}, item, { id });
    }

    function registerContentPack(pack) {
        if (!isObject(pack)) throw new Error('Content pack must be an object');
        const id = toId(pack.id);
        if (!id) throw new Error('Content pack is missing id');
        if (registryById[id]) throw new Error(`Duplicate content pack id: ${id}`);
        const normalized = {
            id,
            version: toId(pack.version || '1.0.0'),
            type: toId(pack.type),
            items: asArray(pack.items).map((item) => shallowClone(item)),
            meta: isObject(pack.meta) ? Object.assign({}, pack.meta) : {}
        };
        registry.push(normalized);
        registryById[id] = normalized;
        applyPackToKnownGlobals(normalized);
        return normalized;
    }

    function getContentPacks(type) {
        if (!type) return registry.slice();
        const typeId = toId(type);
        return registry.filter((pack) => pack.type === typeId);
    }

    function getPackItems(type, filterFn) {
        const packs = getContentPacks(type);
        const result = [];
        packs.forEach((pack) => {
            pack.items.forEach((item) => {
                if (!filterFn || filterFn(item, pack)) result.push(item);
            });
        });
        return result;
    }

    function mergeById(baseItems, packItems, options) {
        const opts = isObject(options) ? options : {};
        const idKey = opts.idKey || 'id';
        const out = [];
        const indexById = Object.create(null);
        asArray(baseItems).forEach((item, idx) => {
            const cloned = shallowClone(item);
            const id = resolvePoolItemId(cloned, idKey, idx);
            if (isObject(cloned) && !cloned[idKey]) cloned[idKey] = id;
            indexById[id] = out.length;
            out.push(cloned);
        });
        asArray(packItems).forEach((item, idx) => {
            const normalized = shallowClone(item);
            const id = resolvePoolItemId(normalized, idKey, idx);
            if (isObject(normalized) && !normalized[idKey]) normalized[idKey] = id;
            const existingIdx = indexById[id];
            if (typeof existingIdx === 'number') {
                out[existingIdx] = isObject(out[existingIdx]) && isObject(normalized)
                    ? Object.assign({}, out[existingIdx], normalized)
                    : normalized;
            } else {
                indexById[id] = out.length;
                out.push(normalized);
            }
        });
        return out;
    }

    function getPackTriviaQuestions(baseQuestions) {
        const base = asArray(baseQuestions).map((q, idx) => {
            const prompt = q && (q.prompt || q.q) ? String(q.prompt || q.q) : `Trivia ${idx + 1}`;
            return Object.assign({}, q, {
                id: (q && q.id) || `base_trivia_${hashStringToUintLocal(prompt).toString(16)}`,
                prompt,
                q: prompt,
                choices: Array.isArray(q && q.choices) ? q.choices.slice() : (Array.isArray(q && q.options) ? q.options.slice() : []),
                options: Array.isArray(q && q.options) ? q.options.slice() : (Array.isArray(q && q.choices) ? q.choices.slice() : [])
            });
        });
        return mergeById(base, getPackItems('trivia'), { idKey: 'id' });
    }

    function getPackMatchingDecks(baseItems) {
        const baseDeck = {
            id: 'base_food_and_accessories',
            theme: 'Food & Accessories',
            difficulty: 1,
            pairs: asArray(baseItems).map((item, idx) => ({
                id: (item && item.id) || `base_pair_${idx + 1}`,
                emoji: item && item.emoji ? item.emoji : '⭐',
                name: item && item.name ? item.name : `Pair ${idx + 1}`
            }))
        };
        return mergeById([baseDeck], getPackItems('matching'), { idKey: 'id' });
    }

    function getPackCookingRecipes(baseIngredients) {
        const ingredients = asArray(baseIngredients).map((item) => isObject(item) ? Object.assign({}, item) : item);
        const baseRecipeCandidates = [];
        const ingIds = ingredients.map((i) => i && i.id).filter(Boolean);
        for (let i = 0; i < ingIds.length; i++) {
            for (let j = i + 1; j < ingIds.length; j++) {
                for (let k = j + 1; k < ingIds.length; k++) {
                    baseRecipeCandidates.push({
                        id: `base_recipe_${ingIds[i]}_${ingIds[j]}_${ingIds[k]}`,
                        name: 'Classic Mix',
                        ingredients: [ingIds[i], ingIds[j], ingIds[k]],
                        difficulty: 'easy',
                        rewardProfile: { specialFood: 1 }
                    });
                }
            }
        }
        const packedIngredients = getPackItems('cooking', (item) => item && item.kind === 'ingredient');
        const packedRecipes = getPackItems('cooking', (item) => !item || item.kind !== 'ingredient');
        return {
            ingredients: mergeById(ingredients, packedIngredients, { idKey: 'id' }),
            recipes: mergeById(baseRecipeCandidates, packedRecipes, { idKey: 'id' })
        };
    }

    function getPackFishingCatches() {
        return mergeById([], getPackItems('fishing'), { idKey: 'id' });
    }

    function getPackColoringTemplates() {
        return mergeById([], getPackItems('coloring'), { idKey: 'id' });
    }

    function getPackTournamentRivals(baseNames) {
        const base = asArray(baseNames).map((name, idx) => ({ id: `base_tour_${idx + 1}`, name: String(name) }));
        const packed = getPackItems('tournaments').map((item, idx) => {
            if (isObject(item)) return Object.assign({ id: item.id || `tour_${idx + 1}` }, item);
            return { id: `tour_${idx + 1}`, name: String(item) };
        });
        const merged = mergeById(base, packed, { idKey: 'id' });
        return merged.map((entry) => entry.name || entry.id);
    }

    function getRuleModifiersForScope(scope, kind) {
        const scopeId = toId(scope);
        return getPackItems('ruleModifiers', (item) => {
            if (!item || (kind && item.kind !== kind)) return false;
            const scopes = Array.isArray(item.scopes) ? item.scopes.map(String) : [];
            return scopes.includes(scopeId) || scopes.includes('*');
        });
    }

    function getDeterministicRuleModifier(scope, kind, seedSuffix) {
        const pool = getRuleModifiersForScope(scope, kind).filter((m) => !m.disabled);
        if (pool.length === 0) return null;
        const seed = `${kind || 'mod'}:${scope}:${seedSuffix || ''}:${getDayKey()}:${getWeekKeySafe()}`;
        const idx = hashStringToUintLocal(seed) % pool.length;
        return pool[idx] || null;
    }

    function getPackedBiomeLootWeights() {
        const tables = Object.create(null);
        getPackItems('loot', (item) => item && item.kind === 'biomeLootTable').forEach((item) => {
            const biomeId = toId(item.biomeId);
            if (!biomeId) return;
            tables[biomeId] = {
                biomeId,
                entries: asArray(item.entries).map((entry) => ({
                    id: toId(entry && (entry.id || entry.lootId)),
                    weight: Math.max(0, Number(entry && entry.weight) || 0),
                    min: Math.max(1, Math.floor(Number(entry && entry.min) || 1)),
                    max: Math.max(1, Math.floor(Number(entry && entry.max) || (entry && entry.min) || 1))
                })).filter((entry) => entry.id)
            };
        });
        return tables;
    }

    function getPackedBiomeEvents(kind, biomeId) {
        const k = toId(kind || 'event');
        const b = toId(biomeId);
        return getPackItems('biomeEvents', (item) => item && item.kind === k && (!b || item.biomeId === b));
    }

    function getBreedingOutcomeFlavorPool() {
        return getPackItems('breeding', (item) => item && item.kind === 'outcomeFlavor');
    }

    function getBreedingFlavorLine(context) {
        const pool = getBreedingOutcomeFlavorPool();
        if (pool.length === 0) return null;
        const ctx = isObject(context) ? context : {};
        const filtered = pool.filter((item) => {
            if (item.onlyHybrid && !ctx.isHybrid) return false;
            if (item.onlyMutation && !ctx.hasMutation) return false;
            if (item.petType && item.petType !== ctx.petType) return false;
            return true;
        });
        const candidates = filtered.length ? filtered : pool;
        const choice = chooseRotatingContentWithHistory(candidates, {
            scope: 'breeding',
            key: 'celebrationFlavor',
            idKey: 'id',
            recentWindow: 5,
            state: ctx.state || global.gameState
        });
        return choice ? String(choice.text || '') : null;
    }

    function getPackedRoomCosmeticSystemBonusMultiplier(systemKey, roomId) {
        const bonuses = isObject(global.ROOM_COSMETIC_BONUSES) ? global.ROOM_COSMETIC_BONUSES : null;
        if (!bonuses || !global.gameState) return 1;
        const room = toId(roomId || (global.gameState && global.gameState.currentRoom) || 'bedroom');
        const system = toId(systemKey || 'minigame');
        const custom = isObject(global.gameState.roomCustomizations) ? (global.gameState.roomCustomizations[room] || {}) : {};
        const furniture = isObject(global.gameState.furniture) ? (global.gameState.furniture[room] || {}) : {};
        const activeTheme = toId(custom.theme || 'auto');
        const activeSlots = Array.isArray(custom.furnitureSlots) ? custom.furnitureSlots.map(toId) : [];
        const activeDecoration = toId(furniture.decoration || 'none');
        let mult = 1;
        Object.values(bonuses).forEach((entry) => {
            if (!entry) return;
            const roomOk = !entry.roomId || entry.roomId === '*' || entry.roomId === room;
            const systemOk = !entry.system || entry.system === '*' || entry.system === system;
            if (!roomOk || !systemOk) return;
            const sourceType = toId(entry.sourceType || '');
            const sourceId = toId(entry.sourceId || '');
            let active = false;
            if (sourceType === 'theme') active = sourceId === activeTheme;
            if (sourceType === 'furniture') active = activeSlots.includes(sourceId);
            if (sourceType === 'decoration') active = sourceId === activeDecoration;
            if (sourceType === 'set') {
                const setDef = isObject(global.ROOM_COSMETIC_SETS) ? global.ROOM_COSMETIC_SETS[sourceId] : null;
                if (setDef) {
                    const themeOk = !setDef.themeId || setDef.themeId === activeTheme;
                    const decorOk = !setDef.decorationId || setDef.decorationId === activeDecoration;
                    const furnReq = asArray(setDef.furnitureIds).map(toId);
                    const furnOk = furnReq.length === 0 || furnReq.every((id) => activeSlots.includes(id));
                    active = themeOk && decorOk && furnOk;
                }
            }
            if (!active) return;
            const entryMult = Math.max(0.9, Math.min(1.1, Number(entry.multiplier) || 1));
            mult *= entryMult;
        });
        return Math.max(0.9, Math.min(1.15, Number(mult) || 1));
    }

    function ensureGlobalObject(name, fallback) {
        if (!isObject(global[name])) global[name] = isObject(fallback) ? Object.assign({}, fallback) : {};
        return global[name];
    }

    function ensureGlobalArray(name) {
        if (!Array.isArray(global[name])) global[name] = [];
        return global[name];
    }

    function upsertArrayById(targetArr, incomingItems, idKey) {
        const key = idKey || 'id';
        const byId = Object.create(null);
        targetArr.forEach((item, idx) => {
            const id = resolvePoolItemId(item, key, idx);
            byId[id] = idx;
            if (isObject(item) && !item[key]) item[key] = id;
        });
        incomingItems.forEach((item, idx) => {
            if (!isObject(item)) return;
            const next = Object.assign({}, item);
            const id = resolvePoolItemId(next, key, idx);
            next[key] = id;
            if (typeof byId[id] === 'number') targetArr[byId[id]] = Object.assign({}, targetArr[byId[id]], next);
            else {
                byId[id] = targetArr.length;
                targetArr.push(next);
            }
        });
    }

    function getPackApplyStateRecord(packId) {
        const id = toId(packId);
        const existing = appliedToGlobals[id];
        return isObject(existing) ? existing : null;
    }

    function setPackApplyStateRecord(packId, next) {
        const id = toId(packId);
        if (!id) return null;
        const prev = getPackApplyStateRecord(id);
        const merged = Object.assign({
            packId: id,
            attempted: false,
            applied: false,
            skipped: false,
            deferred: false,
            reason: '',
            error: null,
            attempts: 0
        }, prev || {}, isObject(next) ? next : {});
        if (merged.attempted) {
            const previousAttempts = Number(prev && prev.attempts) || 0;
            const nextAttempts = Number(isObject(next) && next.attempts) || 0;
            merged.attempts = Math.max(previousAttempts + (nextAttempts > 0 ? nextAttempts : 1), previousAttempts);
        }
        appliedToGlobals[id] = merged;
        return merged;
    }

    function applyCollectionsPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyCollectionsPack === 'function') {
            return !!global.ContentPackRegistryService.applyCollectionsPack(pack, { global });
        }
        return false;
    }

    function applyTasksPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyTasksPack === 'function') {
            return !!global.ContentPackRegistryService.applyTasksPack(pack, { global });
        }
        return false;
    }

    function applyLootPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyLootPack === 'function') {
            return !!global.ContentPackRegistryService.applyLootPack(pack, { global });
        }
        return false;
    }

    function applyBiomeEventsPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyBiomeEventsPack === 'function') {
            return !!global.ContentPackRegistryService.applyBiomeEventsPack(pack, { global });
        }
        return false;
    }

    function applyRivalsPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyRivalsPack === 'function') {
            return !!global.ContentPackRegistryService.applyRivalsPack(pack, { global });
        }
        return false;
    }

    function applyBossesPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyBossesPack === 'function') {
            return !!global.ContentPackRegistryService.applyBossesPack(pack, { global });
        }
        return false;
    }

    function applyCosmeticsPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyCosmeticsPack === 'function') {
            return !!global.ContentPackRegistryService.applyCosmeticsPack(pack, { global });
        }
        return false;
    }

    function applyBreedingPack(pack) {
        if (global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyBreedingPack === 'function') {
            return !!global.ContentPackRegistryService.applyBreedingPack(pack, { global });
        }
        return false;
    }

    function applyPackToKnownGlobals(pack) {
        if (!pack || !pack.id) return null;
        const priorState = getPackApplyStateRecord(pack.id);
        if (priorState && priorState.applied) return priorState;
        const hasRegistryService = !!(global.ContentPackRegistryService && typeof global.ContentPackRegistryService.applyPack === 'function');
        if (!hasRegistryService) {
            return setPackApplyStateRecord(pack.id, {
                attempted: true,
                applied: false,
                skipped: true,
                deferred: true,
                reason: 'registry-service-unavailable',
                error: null
            });
        }
        try {
            let applied = false;
            let handled = true;
            switch (pack.type) {
                case 'collections':
                    applied = applyCollectionsPack(pack);
                    break;
                case 'tasks':
                    applied = applyTasksPack(pack);
                    break;
                case 'loot':
                    applied = applyLootPack(pack);
                    break;
                case 'biomeEvents':
                    applied = applyBiomeEventsPack(pack);
                    break;
                case 'rivals':
                    applied = applyRivalsPack(pack);
                    break;
                case 'bosses':
                    applied = applyBossesPack(pack);
                    break;
                case 'cosmetics':
                    applied = applyCosmeticsPack(pack);
                    break;
                case 'breeding':
                    applied = applyBreedingPack(pack);
                    break;
                default:
                    handled = false;
                    break;
            }
            return setPackApplyStateRecord(pack.id, {
                attempted: true,
                applied: !!applied,
                skipped: !applied,
                deferred: handled && !applied,
                reason: handled ? (applied ? 'applied' : 'registry-apply-noop') : 'unsupported-pack-type',
                error: null
            });
        } catch (err) {
            setPackApplyStateRecord(pack.id, {
                attempted: true,
                applied: false,
                skipped: false,
                deferred: false,
                reason: 'apply-error',
                error: String(err && err.message ? err.message : err)
            });
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('[ContentPacks] Failed applying pack to globals:', pack.id, err);
            }
            return getPackApplyStateRecord(pack.id);
        }
    }

    function createKnownIdSetFromObject(sourceObj) {
        return isObject(sourceObj) ? new Set(Object.keys(sourceObj).map(toId).filter(Boolean)) : null;
    }

    function addKnownId(set, value) {
        const id = toId(value);
        if (set && id) set.add(id);
    }

    function collectKnownValidationRefs(packs) {
        const known = {
            biomeIds: createKnownIdSetFromObject(global.EXPLORATION_BIOMES),
            roomIds: createKnownIdSetFromObject(global.ROOMS),
            rewardBundles: createKnownIdSetFromObject(global.REWARD_BUNDLES),
            rewardModifiers: createKnownIdSetFromObject(global.REWARD_MODIFIERS),
            stickers: createKnownIdSetFromObject(global.STICKERS),
            themes: createKnownIdSetFromObject(global.ROOM_THEMES),
            furniture: createKnownIdSetFromObject(global.ROOM_FURNITURE_ITEMS),
            decorations: (isObject(global.FURNITURE) && isObject(global.FURNITURE.decorations))
                ? new Set(Object.keys(global.FURNITURE.decorations).map(toId).filter(Boolean))
                : null,
            lootIds: createKnownIdSetFromObject(global.EXPLORATION_LOOT)
        };

        asArray(packs).forEach((pack) => {
            asArray(pack && pack.items).forEach((item) => {
                if (!isObject(item)) return;
                const itemData = isObject(item.data) ? item.data : item;
                if (pack.type === 'collections') {
                    if (item.kind === 'rewardModifier') addKnownId(known.rewardModifiers, itemData.id || item.id);
                    if (item.kind === 'rewardBundle') addKnownId(known.rewardBundles, itemData.id || item.id);
                    if (item.kind === 'sticker') addKnownId(known.stickers, itemData.id || item.id);
                }
                if (pack.type === 'tasks' && item.kind === 'rewardModifier') {
                    addKnownId(known.rewardModifiers, itemData.id || item.id);
                }
                if (pack.type === 'cosmetics') {
                    if (item.kind === 'roomTheme') addKnownId(known.themes, itemData.id || item.id);
                    if (item.kind === 'roomFurniture') addKnownId(known.furniture, itemData.id || item.id);
                    if (item.kind === 'decoration') addKnownId(known.decorations, itemData.id || item.id);
                }
                if (pack.type === 'loot' && item.kind === 'lootItem') {
                    addKnownId(known.lootIds, itemData.id || item.id);
                }
            });
        });

        return known;
    }

    function validateContentPacks(options) {
        const opts = isObject(options) ? options : {};
        const errors = [];
        const warnings = [];
        const seenPackIds = new Set();
        const seenItemIdsByType = Object.create(null);
        const knownRefs = collectKnownValidationRefs(registry);
        const knownBiomeIds = knownRefs.biomeIds;
        const knownRoomIds = knownRefs.roomIds;
        const knownRewardBundles = knownRefs.rewardBundles;
        const knownRewardModifiers = knownRefs.rewardModifiers;
        const knownStickers = knownRefs.stickers;
        const knownThemes = knownRefs.themes;
        const knownFurniture = knownRefs.furniture;
        const knownDecorations = knownRefs.decorations;
        const knownLootIds = knownRefs.lootIds;
        const knownSystems = new Set(['care', 'minigame', 'exploration', 'competition', 'crafting', 'economy', 'breeding']);

        function validateCombatEntity(entity, itemId, label) {
            if (!isObject(entity)) {
                errors.push(`${label} ${itemId} config must be an object`);
                return;
            }
            const moves = asArray(entity.moves);
            if (moves.length === 0) errors.push(`${label} ${itemId} has no moves`);
            moves.forEach((move, moveIdx) => {
                if (!isObject(move)) {
                    errors.push(`${label} ${itemId} move ${moveIdx} must be an object`);
                    return;
                }
                if (!toId(move.name)) errors.push(`${label} ${itemId} move ${moveIdx} missing name`);
                if (!Number.isFinite(Number(move.power))) errors.push(`${label} ${itemId} move ${moveIdx} missing numeric power`);
                if (typeof move.healSelf !== 'undefined' && !Number.isFinite(Number(move.healSelf))) {
                    errors.push(`${label} ${itemId} move ${moveIdx} has invalid healSelf`);
                }
            });
            if (typeof entity.maxHP !== 'undefined' && Number(entity.maxHP) <= 0) errors.push(`${label} ${itemId} maxHP must be > 0`);
            if (typeof entity.attack !== 'undefined' && !Number.isFinite(Number(entity.attack))) warnings.push(`${label} ${itemId} attack is non-numeric`);
            if (typeof entity.defense !== 'undefined' && !Number.isFinite(Number(entity.defense))) warnings.push(`${label} ${itemId} defense is non-numeric`);
        }

        registry.forEach((pack) => {
            if (!pack.id) errors.push('Pack missing id');
            if (seenPackIds.has(pack.id)) errors.push(`Duplicate pack id: ${pack.id}`);
            seenPackIds.add(pack.id);
            if (!pack.type) errors.push(`Pack ${pack.id} missing type`);
            if (!Array.isArray(pack.items)) errors.push(`Pack ${pack.id} missing items[]`);
            const required = TYPE_REQUIRED_FIELDS[pack.type] || [];
            const localIds = new Set();
            asArray(pack.items).forEach((item, idx) => {
                if (!isObject(item)) {
                    warnings.push(`Pack ${pack.id} item ${idx} is non-object`);
                    return;
                }
                const subject = isObject(item.data) ? item.data : item;
                const itemId = toId(item.id || `${pack.type}:${idx}`);
                if (item.id) {
                    if (localIds.has(itemId)) errors.push(`Duplicate item id in pack ${pack.id}: ${itemId}`);
                    localIds.add(itemId);
                    if (!seenItemIdsByType[pack.type]) seenItemIdsByType[pack.type] = new Set();
                    if (seenItemIdsByType[pack.type].has(itemId) && !item.override) {
                        warnings.push(`Duplicate item id across ${pack.type} packs (override expected?): ${itemId}`);
                    }
                    seenItemIdsByType[pack.type].add(itemId);
                }
                required.forEach((field) => {
                    const hasFieldOnSubject = typeof subject[field] !== 'undefined';
                    const hasFieldOnItem = typeof item[field] !== 'undefined';
                    if (!hasFieldOnSubject
                        && !hasFieldOnItem
                        && !(field === 'id' && item.id)
                        && !(field === 'prompt' && subject.q)
                        && !(field === 'choices' && subject.options)) {
                        errors.push(`Pack ${pack.id} item ${itemId} missing field: ${field}`);
                    }
                });
                if (pack.type === 'trivia') {
                    const choices = asArray(subject.choices || subject.options);
                    if (choices.length < 2) errors.push(`Trivia ${itemId} needs at least 2 choices`);
                    if (!Number.isInteger(subject.answer) || subject.answer < 0 || subject.answer >= choices.length) errors.push(`Trivia ${itemId} has invalid answer index`);
                }
                if (pack.type === 'matching' && asArray(subject.pairs).length < 4) warnings.push(`Matching deck ${itemId} has fewer than 4 pairs`);
                if (pack.type === 'loot' && item.kind === 'biomeLootTable') {
                    const entries = asArray(subject.entries || item.entries);
                    const totalWeight = entries.reduce((sum, e) => sum + Math.max(0, Number(e && e.weight) || 0), 0);
                    if (entries.length === 0) errors.push(`Biome loot table ${itemId} has no entries`);
                    if (totalWeight <= 0) errors.push(`Biome loot table ${itemId} has non-positive total weight`);
                    entries.forEach((entry, entryIdx) => {
                        const weight = Number(entry && entry.weight);
                        const min = Number(entry && entry.min);
                        const max = Number(entry && entry.max);
                        if (!toId(entry && (entry.id || entry.lootId))) errors.push(`Biome loot table ${itemId} entry ${entryIdx} missing loot id`);
                        if (!Number.isFinite(weight) || weight <= 0) errors.push(`Biome loot table ${itemId} entry ${entryIdx} has invalid weight`);
                        if (typeof entry.min !== 'undefined' && (!Number.isFinite(min) || min < 0)) warnings.push(`Biome loot table ${itemId} entry ${entryIdx} has invalid min`);
                        if (typeof entry.max !== 'undefined' && (!Number.isFinite(max) || max < 0)) warnings.push(`Biome loot table ${itemId} entry ${entryIdx} has invalid max`);
                        if (Number.isFinite(min) && Number.isFinite(max) && min > max) errors.push(`Biome loot table ${itemId} entry ${entryIdx} has min > max`);
                    });
                    if (knownBiomeIds && item.biomeId && !knownBiomeIds.has(toId(item.biomeId))) {
                        warnings.push(`Biome loot table ${itemId} references unknown biome: ${item.biomeId}`);
                    }
                }
                if (pack.type === 'cooking') {
                    if (item.kind === 'ingredient') {
                        if (!toId(subject.name || item.name)) errors.push(`Cooking ingredient ${itemId} missing name`);
                    } else {
                        if (asArray(subject.ingredients).length === 0) errors.push(`Cooking recipe ${itemId} missing ingredients`);
                        if (asArray(subject.steps).length === 0) warnings.push(`Cooking recipe ${itemId} missing steps`);
                    }
                }
                if (pack.type === 'ruleModifiers') {
                    if (!Array.isArray(item.scopes) || item.scopes.length === 0) errors.push(`Rule modifier ${itemId} must include scopes[]`);
                    if (!Number.isFinite(item.weight) && typeof item.weight !== 'undefined') warnings.push(`Rule modifier ${itemId} has non-numeric weight`);
                }
                if (pack.type === 'rivals') {
                    if (!toId(subject.petType)) errors.push(`Rival ${itemId} missing petType`);
                    if (!toId(subject.petName)) errors.push(`Rival ${itemId} missing petName`);
                    if (typeof subject.difficulty !== 'undefined' && !Number.isFinite(Number(subject.difficulty))) warnings.push(`Rival ${itemId} has non-numeric difficulty`);
                    if (typeof subject.battleHP !== 'undefined' && Number(subject.battleHP) <= 0) warnings.push(`Rival ${itemId} has non-positive battleHP`);
                }
                if (pack.type === 'bosses') validateCombatEntity(subject, itemId, 'Boss');
                if (pack.type === 'tasks') {
                    if (item.kind === 'weeklyArc') {
                        const arc = subject;
                        if (asArray(arc.tasks).length === 0) errors.push(`Weekly arc ${itemId} has no tasks`);
                        const reward = isObject(arc.finaleReward) ? arc.finaleReward : null;
                        if (reward && reward.bundleId && knownRewardBundles && !knownRewardBundles.has(toId(reward.bundleId))) {
                            warnings.push(`Weekly arc ${itemId} finaleReward references unknown reward bundle: ${reward.bundleId}`);
                        }
                        if (reward && reward.collectible && reward.collectible.type === 'sticker' && knownStickers && !knownStickers.has(toId(reward.collectible.id))) {
                            warnings.push(`Weekly arc ${itemId} finaleReward references unknown sticker: ${reward.collectible.id}`);
                        }
                    }
                    if (item.kind === 'rewardModifier' && isObject(subject.effect) && subject.effect.type === 'competitionRewardMultiplier') {
                        if (!Number.isFinite(Number(subject.effect.multiplier))) errors.push(`Reward modifier ${itemId} missing numeric competition multiplier`);
                    }
                }
                if (pack.type === 'collections' && item.kind === 'rewardBundle') {
                    if (subject.modifierId && knownRewardModifiers && !knownRewardModifiers.has(toId(subject.modifierId))) {
                        warnings.push(`Reward bundle ${itemId} references unknown modifier: ${subject.modifierId}`);
                    }
                }
                if (pack.type === 'biomeEvents') {
                    if (knownBiomeIds && item.biomeId && !knownBiomeIds.has(toId(item.biomeId))) {
                        warnings.push(`Biome event ${itemId} references unknown biome: ${item.biomeId}`);
                    }
                    if (!toId(subject.text || item.text)) errors.push(`Biome event ${itemId} missing text`);
                }
                if (pack.type === 'cosmetics') {
                    if (item.kind === 'roomCosmeticSet') {
                        const setData = subject;
                        if (setData.themeId && knownThemes && !knownThemes.has(toId(setData.themeId))) warnings.push(`Room cosmetic set ${itemId} references unknown theme: ${setData.themeId}`);
                        asArray(setData.furnitureIds).forEach((fId) => {
                            const fid = toId(fId);
                            if (!fid) return;
                            const known = (knownFurniture && knownFurniture.has(fid)) || (knownDecorations && knownDecorations.has(fid));
                            if (!known) warnings.push(`Room cosmetic set ${itemId} references unknown furniture/decor: ${fid}`);
                        });
                        if (setData.decorationId && knownDecorations && !knownDecorations.has(toId(setData.decorationId))) warnings.push(`Room cosmetic set ${itemId} references unknown decoration: ${setData.decorationId}`);
                        if (setData.unlock && setData.unlock.biome && knownBiomeIds && !knownBiomeIds.has(toId(setData.unlock.biome))) warnings.push(`Room cosmetic set ${itemId} unlock.biome unknown: ${setData.unlock.biome}`);
                    }
                    if (item.kind === 'roomCosmeticBonus') {
                        const bonus = subject;
                        if (bonus.roomId && bonus.roomId !== '*' && knownRoomIds && !knownRoomIds.has(toId(bonus.roomId))) warnings.push(`Room cosmetic bonus ${itemId} references unknown room: ${bonus.roomId}`);
                        if (bonus.system && !knownSystems.has(toId(bonus.system))) warnings.push(`Room cosmetic bonus ${itemId} references unknown system: ${bonus.system}`);
                        if (!Number.isFinite(Number(bonus.multiplier)) || Number(bonus.multiplier) <= 0) errors.push(`Room cosmetic bonus ${itemId} has invalid multiplier`);
                    }
                }
            });
        });

        // Reference checks if runtime globals are available.
        registry.forEach((pack) => {
            if (pack.type === 'rivals' && isObject(global.PET_TYPES) && isObject(global.HYBRID_PET_TYPES)) {
                asArray(pack.items).forEach((item) => {
                    const trainer = item.data || item;
                    const petType = trainer && trainer.petType;
                    if (petType && !global.PET_TYPES[petType] && !(isObject(global.HYBRID_PET_TYPES) && global.HYBRID_PET_TYPES[petType])) {
                        errors.push(`Rival ${item.id} references unknown petType: ${petType}`);
                    }
                });
            }
            if (pack.type === 'bosses' && isObject(global.PET_TYPES) && isObject(global.HYBRID_PET_TYPES)) {
                asArray(pack.items).forEach((item) => {
                    const boss = item.data || item;
                    const petType = boss && boss.type;
                    if (petType && !global.PET_TYPES[petType] && !(isObject(global.HYBRID_PET_TYPES) && global.HYBRID_PET_TYPES[petType])) {
                        errors.push(`Boss ${item.id} references unknown type: ${petType}`);
                    }
                });
            }
            if (pack.type === 'loot' && knownLootIds) {
                asArray(pack.items).forEach((item) => {
                    if (!item || item.kind !== 'biomeLootTable') return;
                    asArray(item.entries).forEach((entry) => {
                        const lootId = toId(entry && (entry.id || entry.lootId));
                        if (lootId && !knownLootIds.has(lootId)) {
                            warnings.push(`Biome loot table ${item.id} references unknown loot in effective loot pool: ${lootId}`);
                        }
                    });
                });
            }
        });

        const report = {
            ok: errors.length === 0,
            errorCount: errors.length,
            warningCount: warnings.length,
            errors,
            warnings,
            packs: registry.length,
            byType: registry.reduce((acc, pack) => {
                acc[pack.type] = (acc[pack.type] || 0) + 1;
                return acc;
            }, {})
        };
        if (opts.log && typeof console !== 'undefined') {
            const fn = report.ok ? 'info' : 'warn';
            console[fn]('[ContentPacks] Validation report:', report);
        }
        global.CONTENT_PACK_VALIDATION_REPORT = report;
        return report;
    }

    function reapplyAllContentPacksToGlobals() {
        Object.keys(appliedToGlobals).forEach((k) => { delete appliedToGlobals[k]; });
        registry.forEach((pack) => applyPackToKnownGlobals(pack));
        return validateContentPacks({ log: false });
    }

    function getContentPackApplyState(packId) {
        if (!packId) {
            return Object.keys(appliedToGlobals).reduce((acc, id) => {
                acc[id] = Object.assign({}, appliedToGlobals[id]);
                return acc;
            }, {});
        }
        const state = getPackApplyStateRecord(packId);
        return state ? Object.assign({}, state) : null;
    }

    global.registerContentPack = registerContentPack;
    global.getContentPacks = getContentPacks;
    global.getContentPackItems = getPackItems;
    global.getPackTriviaQuestions = getPackTriviaQuestions;
    global.getPackMatchingDecks = getPackMatchingDecks;
    global.getPackCookingRecipes = getPackCookingRecipes;
    global.getPackFishingCatches = getPackFishingCatches;
    global.getPackColoringTemplates = getPackColoringTemplates;
    global.getPackTournamentRivals = getPackTournamentRivals;
    global.getPackedBiomeLootWeights = getPackedBiomeLootWeights;
    global.getPackedBiomeEvents = getPackedBiomeEvents;
    global.getBreedingFlavorLine = getBreedingFlavorLine;
    global.getPackedRoomCosmeticSystemBonusMultiplier = getPackedRoomCosmeticSystemBonusMultiplier;
    global.getDeterministicRuleModifier = getDeterministicRuleModifier;
    global.mergeContentById = mergeById;
    global.chooseNextFromPool = chooseNextFromPool;
    global.chooseRotatingContentWithHistory = chooseRotatingContentWithHistory;
    global.ensureContentRotationState = ensureContentRotationState;
    global.ensureContentRotationHistoryBucket = ensureHistoryBucket;
    global.recordContentRotationSelection = recordHistorySelection;
    global.validateContentPacks = validateContentPacks;
    global.reapplyAllContentPacksToGlobals = reapplyAllContentPacksToGlobals;
    global.getContentPackApplyState = getContentPackApplyState;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            registerContentPack,
            getContentPacks,
            getPackItems,
            mergeById,
            chooseNextFromPool,
            chooseRotatingContentWithHistory,
            validateContentPacks,
            reapplyAllContentPacksToGlobals,
            getContentPackApplyState
        };
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
