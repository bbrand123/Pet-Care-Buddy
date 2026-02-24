// ============================================================
// economy.js  –  Economy & trading system
// Extracted from game.js (lines 1280-2423)
// ============================================================

        // ==================== ECONOMY & TRADING ====================

        function getAuctionHouseStorageKey() {
            return STORAGE_KEYS.auctionHouse;
        }

        function getAuctionSlotStorageKey() {
            return STORAGE_KEYS.auctionSlotId;
        }

        function getAuctionSlotLabel(slotId) {
            const map = { slotA: 'Slot A', slotB: 'Slot B', slotC: 'Slot C' };
            return map[slotId] || String(slotId || 'Slot');
        }

        function hashStringToUint(value) {
            let hash = 2166136261;
            const str = String(value || '');
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        }

        function createDefaultAuctionHouseData() {
            return { listings: [], wallets: {} };
        }

        function loadAuctionHouseData() {
            try {
                const raw = localStorage.getItem(getAuctionHouseStorageKey());
                if (!raw) return createDefaultAuctionHouseData();
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return createDefaultAuctionHouseData();
                if (!Array.isArray(parsed.listings)) parsed.listings = [];
                if (!parsed.wallets || typeof parsed.wallets !== 'object') parsed.wallets = {};
                parsed.listings = parsed.listings
                    .filter((l) => l && typeof l === 'object')
                    .map((listing) => ({
                        id: String(listing.id || ''),
                        sellerSlot: String(listing.sellerSlot || 'slotA'),
                        itemType: String(listing.itemType || ''),
                        itemId: String(listing.itemId || ''),
                        quantity: Math.max(1, Math.floor(Number(listing.quantity) || 1)),
                        price: Math.max(1, Math.floor(Number(listing.price) || 1)),
                        createdAt: Number(listing.createdAt) || Date.now()
                    }))
                    .filter((l) => l.id && l.itemType && l.itemId);
                return parsed;
            } catch (e) {
                return createDefaultAuctionHouseData();
            }
        }

        function saveAuctionHouseData(data) {
            try {
                const clean = data && typeof data === 'object' ? data : createDefaultAuctionHouseData();
                if (!Array.isArray(clean.listings)) clean.listings = [];
                if (!clean.wallets || typeof clean.wallets !== 'object') clean.wallets = {};
                localStorage.setItem(getAuctionHouseStorageKey(), JSON.stringify(clean));
            } catch (e) {
                // ignore storage errors
            }
        }

        function createDefaultEconomyInventory() {
            return {
                food: {},
                toys: {},
                medicine: {},
                seeds: {},
                accessories: {},
                decorations: {},
                crafted: {}
            };
        }

        function ensureEconomyState(stateObj) {
            const state = stateObj || gameState;
            if (!state.economy || typeof state.economy !== 'object') {
                state.economy = createDefaultEconomyState();
            }
            const eco = state.economy;
            if (typeof eco.coins !== 'number' || !Number.isFinite(eco.coins)) eco.coins = 240;
            eco.coins = Math.max(0, Math.floor(eco.coins));
            if (!eco.inventory || typeof eco.inventory !== 'object') eco.inventory = createDefaultEconomyInventory();
            ['food', 'toys', 'medicine', 'seeds', 'accessories', 'decorations', 'crafted'].forEach((bucket) => {
                if (!eco.inventory[bucket] || typeof eco.inventory[bucket] !== 'object' || Array.isArray(eco.inventory[bucket])) {
                    eco.inventory[bucket] = {};
                }
            });
            if (!eco.market || typeof eco.market !== 'object') eco.market = { dayKey: '', stock: [] };
            if (typeof eco.market.dayKey !== 'string') eco.market.dayKey = '';
            if (!Array.isArray(eco.market.stock)) eco.market.stock = [];
            if (!eco.auction || typeof eco.auction !== 'object') eco.auction = { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 };
            if (!ECONOMY_AUCTION_SLOTS.includes(eco.auction.slotId)) eco.auction.slotId = 'slotA';
            if (typeof eco.auction.soldCount !== 'number') eco.auction.soldCount = 0;
            if (typeof eco.auction.boughtCount !== 'number') eco.auction.boughtCount = 0;
            if (typeof eco.auction.postedCount !== 'number') eco.auction.postedCount = 0;
            if (typeof eco.totalEarned !== 'number') eco.totalEarned = 0;
            if (typeof eco.totalSpent !== 'number') eco.totalSpent = 0;
            if (typeof eco.mysteryEggsOpened !== 'number') eco.mysteryEggsOpened = 0;
            // Rec 2: Ensure persistent playerId exists for auction self-trade prevention
            if (!eco.playerId || typeof eco.playerId !== 'string') eco.playerId = generatePlayerId();
            if (eco.starterSeedGranted !== true) {
                eco.inventory.seeds.carrot = (eco.inventory.seeds.carrot || 0) + 4;
                eco.inventory.seeds.tomato = (eco.inventory.seeds.tomato || 0) + 3;
                eco.inventory.seeds.strawberry = (eco.inventory.seeds.strawberry || 0) + 2;
                eco.starterSeedGranted = true;
            }
            const preferredSlot = (() => {
                try {
                    return localStorage.getItem(getAuctionSlotStorageKey());
                } catch (e) {
                    return null;
                }
            })();
            if (preferredSlot && ECONOMY_AUCTION_SLOTS.includes(preferredSlot)) eco.auction.slotId = preferredSlot;
            return eco;
        }

        function getCoinBalance() {
            return (ensureEconomyState().coins || 0);
        }

        function formatCoins(amount) {
            return Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString();
        }

        function addCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const add = Math.max(0, Math.floor(Number(amount) || 0));
            if (add <= 0) return 0;
            eco.coins += add;
            eco.totalEarned = (eco.totalEarned || 0) + add;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 +${add} coins${reason ? ` (${reason})` : ''}`, '#FFD700');
            }
            return add;
        }

        function spendCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const cost = Math.max(0, Math.floor(Number(amount) || 0));
            if (cost <= 0) return { ok: true, spent: 0, balance: eco.coins };
            if (eco.coins < cost) {
                return { ok: false, reason: 'insufficient-funds', needed: cost, balance: eco.coins };
            }
            eco.coins -= cost;
            eco.totalSpent = (eco.totalSpent || 0) + cost;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 -${cost} coins${reason ? ` (${reason})` : ''}`, '#FFB74D');
            }
            return { ok: true, spent: cost, balance: eco.coins };
        }

        function getEconomyCategoryMultiplier(category) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonalMultipliers = {
                spring: { seeds: 0.9, food: 0.96, toys: 1.02, medicine: 0.95, decorations: 0.98, mysteryEgg: 1.0, loot: 1.0 },
                summer: { seeds: 0.95, food: 1.05, toys: 1.1, medicine: 1.02, decorations: 1.03, mysteryEgg: 1.08, loot: 1.02 },
                autumn: { seeds: 1.05, food: 1.02, toys: 0.98, medicine: 0.96, decorations: 1.04, mysteryEgg: 1.04, loot: 1.04 },
                winter: { seeds: 1.18, food: 1.06, toys: 0.96, medicine: 1.14, decorations: 1.01, mysteryEgg: 1.06, loot: 1.08 }
            };
            const weatherMultipliers = {
                sunny: { seeds: 0.92, food: 0.97, toys: 1.06, medicine: 0.97, decorations: 1.0, mysteryEgg: 1.02, loot: 0.98 },
                rainy: { seeds: 1.05, food: 1.03, toys: 0.95, medicine: 1.1, decorations: 1.01, mysteryEgg: 1.0, loot: 1.04 },
                snowy: { seeds: 1.12, food: 1.04, toys: 0.94, medicine: 1.12, decorations: 1.02, mysteryEgg: 1.03, loot: 1.06 }
            };
            const seasonMult = (seasonalMultipliers[season] && seasonalMultipliers[season][category]) || 1;
            const weatherMult = (weatherMultipliers[weather] && weatherMultipliers[weather][category]) || 1;
            return seasonMult * weatherMult;
        }

        function getEconomyVolatility(itemKey) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const hash = hashStringToUint(`${day}:${season}:${weather}:${itemKey || ''}`);
            // Rec 7: Narrowed volatility window from 86%-119% to 92%-108%
            const volMin = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityMin === 'number')
                ? ECONOMY_BALANCE.volatilityMin : 0.92;
            const volRange = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityRange === 'number')
                ? ECONOMY_BALANCE.volatilityRange : 16;
            return volMin + ((hash % (volRange + 1)) / 100);
        }

        function getDynamicEconomyPrice(basePrice, category, itemKey, rarity) {
            const base = Math.max(1, Math.floor(Number(basePrice) || 1));
            const rarityMult = rarity === 'rare' ? 1.12 : rarity === 'legendary' ? 1.22 : 1;
            const globalMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.shopPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.shopPriceMultiplier
                : 1;
            const dynamic = base * getEconomyCategoryMultiplier(category) * getEconomyVolatility(itemKey) * rarityMult * globalMult;
            return Math.max(1, Math.round(dynamic));
        }

        function getEconomyPriceContext() {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonLabel = SEASONS[season] ? `${SEASONS[season].icon} ${SEASONS[season].name}` : season;
            const weatherLabel = WEATHER_TYPES[weather] ? `${WEATHER_TYPES[weather].icon} ${WEATHER_TYPES[weather].name}` : weather;
            return `${seasonLabel} · ${weatherLabel}`;
        }

        function getEconomyItemCount(category, itemId) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return 0;
            return Math.max(0, Math.floor(eco.inventory[category][itemId] || 0));
        }

        function addEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) eco.inventory[category] = {};
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            eco.inventory[category][itemId] = (eco.inventory[category][itemId] || 0) + qty;
            return eco.inventory[category][itemId];
        }

        function consumeEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return false;
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            const current = eco.inventory[category][itemId] || 0;
            if (current < qty) return false;
            eco.inventory[category][itemId] = current - qty;
            if (eco.inventory[category][itemId] <= 0) delete eco.inventory[category][itemId];
            return true;
        }

        function getSeedInventoryCount(cropId) {
            const eco = ensureEconomyState();
            return Math.max(0, Math.floor((eco.inventory.seeds && eco.inventory.seeds[cropId]) || 0));
        }

        function consumeSeedForCrop(cropId, count) {
            return consumeEconomyInventoryItem('seeds', cropId, count || 1);
        }

        function getShopItemData(category, itemId) {
            if (!ECONOMY_SHOP_ITEMS[category]) return null;
            return ECONOMY_SHOP_ITEMS[category][itemId] || null;
        }

        function getCraftedItemData(itemId) {
            return CRAFTED_ITEMS[itemId] || null;
        }

        function getShopItemPrice(category, itemId) {
            const item = getShopItemData(category, itemId);
            if (!item) return 0;
            return getDynamicEconomyPrice(item.basePrice, category, `${category}:${itemId}`, item.rarity);
        }

        function getMysteryEggPrice() {
            const base = getDynamicEconomyPrice(120, 'mysteryEgg', 'mysteryEgg', 'rare');
            const mult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.mysteryEggPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.mysteryEggPriceMultiplier
                : 1;
            return Math.max(1, Math.round(base * mult));
        }

        function grantAccessoryToActivePet(accessoryId) {
            const pet = gameState.pet;
            if (!pet || !ACCESSORIES[accessoryId]) return false;
            if (!Array.isArray(pet.unlockedAccessories)) pet.unlockedAccessories = [];
            if (!pet.unlockedAccessories.includes(accessoryId)) {
                pet.unlockedAccessories.push(accessoryId);
                return true;
            }
            return false;
        }

        function applyDecorationToCurrentRoom(decorationId) {
            if (!FURNITURE.decorations[decorationId]) return false;
            const room = gameState.currentRoom || 'bedroom';
            const validRooms = ROOM_IDS;
            const targetRoom = validRooms.includes(room) ? room : 'bedroom';
            if (!gameState.furniture[targetRoom]) gameState.furniture[targetRoom] = {};
            gameState.furniture[targetRoom].decoration = decorationId;
            return true;
        }

        function buyPetShopItem(category, itemId, amount) {
            const item = getShopItemData(category, itemId);
            if (!item) return { ok: false, reason: 'invalid-item' };
            // Rec 10: Check seasonal availability
            if (typeof isShopItemAvailable === 'function' && !isShopItemAvailable(itemId)) {
                return { ok: false, reason: 'out-of-season' };
            }
            const qty = Math.max(1, Math.floor(Number(amount) || 1));
            const unitPrice = getShopItemPrice(category, itemId);
            const totalPrice = unitPrice * qty;
            const spend = spendCoins(totalPrice, 'Shop', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: totalPrice, balance: spend.balance };

            if (category === 'seeds') {
                const cropId = item.cropId;
                addEconomyInventoryItem('seeds', cropId, (item.quantity || 1) * qty);
            } else if (category === 'accessories') {
                for (let i = 0; i < qty; i++) {
                    const unlocked = grantAccessoryToActivePet(item.accessoryId);
                    if (!unlocked) {
                        addEconomyInventoryItem('accessories', item.accessoryId, 1);
                    }
                }
            } else if (category === 'decorations') {
                addEconomyInventoryItem('decorations', item.decorationId, qty);
            } else if (category === 'food' || category === 'toys' || category === 'medicine') {
                addEconomyInventoryItem(category, itemId, qty);
            } else {
                addEconomyInventoryItem(category, itemId, qty);
            }

            saveGame();
            return { ok: true, item, quantity: qty, totalPrice, balance: getCoinBalance() };
        }

        function applyStatEffectsToPet(effects) {
            const pet = gameState.pet;
            if (!pet) return null;
            const before = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            const keys = ['hunger', 'cleanliness', 'happiness', 'energy'];
            keys.forEach((key) => {
                const delta = Number((effects && effects[key]) || 0);
                if (!Number.isFinite(delta) || delta === 0) return;
                pet[key] = clamp(pet[key] + delta, 0, 100);
            });
            const after = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            return {
                hunger: after.hunger - before.hunger,
                cleanliness: after.cleanliness - before.cleanliness,
                happiness: after.happiness - before.happiness,
                energy: after.energy - before.energy
            };
        }

        // Rec 5: Item durability tracking for toys and accessories
        function getItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            return gameState._itemDurability[key] || null;
        }

        function initItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            if (gameState._itemDurability[key] && gameState._itemDurability[key].current > 0) return gameState._itemDurability[key];
            let maxDur = 0;
            if (category === 'toys') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.toyDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.toyDurabilityMax : 10;
            } else if (category === 'accessories') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.accessoryDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.accessoryDurabilityMax : 15;
            }
            if (maxDur <= 0) return null;
            gameState._itemDurability[key] = { current: maxDur, max: maxDur };
            return gameState._itemDurability[key];
        }

        function degradeItemDurability(category, itemId) {
            const dur = getItemDurability(category, itemId);
            if (!dur) return null;
            dur.current = Math.max(0, dur.current - 1);
            return dur;
        }

        function repairItem(category, itemId) {
            if (!gameState._itemDurability) return { ok: false, reason: 'no-durability-data' };
            const key = `${category}:${itemId}`;
            const dur = gameState._itemDurability[key];
            if (!dur) return { ok: false, reason: 'no-durability-data' };
            if (dur.current >= dur.max) return { ok: false, reason: 'already-full' };
            const baseCost = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.durabilityRepairCostBase === 'number')
                ? ECONOMY_BALANCE.durabilityRepairCostBase : 8;
            const missing = dur.max - dur.current;
            const cost = Math.max(1, Math.floor(baseCost * missing * 0.6));
            const spend = spendCoins(cost, 'Repair', true);
            if (!spend.ok) return { ok: false, reason: 'insufficient-funds', needed: cost, balance: spend.balance };
            dur.current = dur.max;
            saveGame();
            return { ok: true, cost, durability: dur };
        }

        function useOwnedEconomyItem(category, itemId) {
            if (!gameState.pet) return { ok: false, reason: 'no-pet' };
            const isCrafted = category === 'crafted';
            const def = isCrafted ? getCraftedItemData(itemId) : getShopItemData(category, itemId);
            if (!def) return { ok: false, reason: 'invalid-item' };
            const sourceCategory = isCrafted ? 'crafted' : category;
            const sourceId = category === 'decorations'
                ? def.decorationId
                : category === 'accessories'
                    ? def.accessoryId
                    : itemId;

            // Rec 5: Durability system for toys and accessories
            const hasDurability = (category === 'toys' || (isCrafted && def.category === 'toys'));
            if (hasDurability) {
                const dur = initItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0) {
                    return { ok: false, reason: 'broken', durability: dur };
                }
            }

            if (!consumeEconomyInventoryItem(sourceCategory, sourceId, 1)) {
                return { ok: false, reason: 'not-owned' };
            }

            if ((category === 'food' || (isCrafted && def.category === 'food')) && typeof gameState.totalFeedCount === 'number') {
                gameState.totalFeedCount++;
            }
            if (category === 'medicine' || (isCrafted && def.category === 'medicine')) {
                gameState.totalMedicineUses = (gameState.totalMedicineUses || 0) + 1;
            }

            let deltas = null;
            if (def.effects) {
                deltas = applyStatEffectsToPet(def.effects);
                if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
                gameState.pet.careActions++;
            } else if (category === 'accessories') {
                grantAccessoryToActivePet(def.accessoryId || itemId);
                // Init durability for newly equipped accessories
                initItemDurability('accessories', def.accessoryId || itemId);
            } else if (category === 'decorations') {
                applyDecorationToCurrentRoom(def.decorationId || itemId);
            }

            // Rec 5: Degrade durability on use for toys
            if (hasDurability) {
                const dur = degradeItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0 && typeof showToast === 'function') {
                    showToast(`${def.emoji || '🧸'} ${def.name} is worn out! Repair it to use again.`, '#FFA726');
                }
                // Re-add item to inventory since toys with durability aren't single-use
                addEconomyInventoryItem(sourceCategory, sourceId, 1);
            }

            saveGame();
            return { ok: true, def, deltas };
        }

        // Rec 6: Prestige purchase system — high-value late-game sinks
        function getPrestigePurchases() {
            if (typeof PRESTIGE_PURCHASES === 'undefined') return {};
            return PRESTIGE_PURCHASES;
        }

        function getOwnedPrestige() {
            if (!gameState._prestigeOwned) gameState._prestigeOwned = {};
            return gameState._prestigeOwned;
        }

        function hasPrestigePurchase(purchaseId) {
            const owned = getOwnedPrestige();
            return !!owned[purchaseId];
        }

        function buyPrestigePurchase(purchaseId) {
            const purchases = getPrestigePurchases();
            const item = purchases[purchaseId];
            if (!item) return { ok: false, reason: 'invalid-prestige' };
            const owned = getOwnedPrestige();
            if (owned[purchaseId] && (owned[purchaseId] >= (item.maxOwned || 1))) {
                return { ok: false, reason: 'already-owned' };
            }
            const spend = spendCoins(item.cost, 'Prestige', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: item.cost, balance: spend.balance };
            owned[purchaseId] = (owned[purchaseId] || 0) + 1;
            gameState._prestigeOwned = owned;
            saveGame();
            return { ok: true, item, balance: getCoinBalance() };
        }

        // Rec 11: Coin decay system — daily tax on hoarded coins above threshold
        function applyCoinDecay() {
            const eco = ensureEconomyState();
            const threshold = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayThreshold === 'number')
                ? ECONOMY_BALANCE.coinDecayThreshold : 1000;
            const rate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayRate === 'number')
                ? ECONOMY_BALANCE.coinDecayRate : 0.005;
            if (eco.coins <= threshold) return 0;
            const excess = eco.coins - threshold;
            const tax = Math.max(1, Math.floor(excess * rate));
            eco.coins -= tax;
            eco.totalSpent = (eco.totalSpent || 0) + tax;
            if (typeof showToast === 'function') {
                showToast(`🏦 Coin maintenance: -${tax} coins (balance over ${threshold})`, '#90A4AE');
            }
            return tax;
        }

        // Rec 10: Check if a shop item is available in the current season
        function isShopItemAvailable(itemId) {
            if (typeof SEASONAL_SHOP_AVAILABILITY === 'undefined') return true;
            const seasons = SEASONAL_SHOP_AVAILABILITY[itemId];
            if (!seasons) return true; // Not in the rotation table = always available
            const currentSeason = gameState.season || (typeof getCurrentSeason === 'function' ? getCurrentSeason() : 'spring');
            return seasons.includes(currentSeason);
        }

        function getLootSellBasePrice(lootId) {
            const loot = EXPLORATION_LOOT[lootId];
            if (!loot) return 0;
            const rarity = loot.rarity || 'common';
            if (rarity === 'rare') return 34;
            if (rarity === 'uncommon') return 18;
            return 10;
        }

        function getLootSellPrice(lootId) {
            const base = getLootSellBasePrice(lootId);
            if (!base) return 0;
            const sellMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.sellPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.sellPriceMultiplier
                : 0.8;
            // Recommendation #7: Mastery biome rank loot sell bonus (+5% for biome rank 3+)
            // Determine which biome this loot is associated with
            let biomeSellBonus = 0;
            if (typeof getMasteryLootSellBonus === 'function' && typeof BIOME_LOOT_POOLS !== 'undefined') {
                for (const [biomeId, pool] of Object.entries(BIOME_LOOT_POOLS)) {
                    if (Array.isArray(pool) && pool.includes(lootId)) {
                        biomeSellBonus = Math.max(biomeSellBonus, getMasteryLootSellBonus(biomeId));
                    }
                }
            }
            return Math.max(1, Math.round(getDynamicEconomyPrice(base, 'loot', `loot:${lootId}`) * sellMult * (1 + biomeSellBonus)));
        }

        function sellExplorationLoot(lootId, count) {
            const ex = ensureExplorationState();
            const current = Math.max(0, Math.floor((ex.lootInventory && ex.lootInventory[lootId]) || 0));
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (current < qty) return { ok: false, reason: 'not-enough-loot' };
            const priceEach = getLootSellPrice(lootId);
            if (priceEach <= 0) return { ok: false, reason: 'invalid-loot' };
            ex.lootInventory[lootId] = current - qty;
            if (ex.lootInventory[lootId] <= 0) delete ex.lootInventory[lootId];
            const total = priceEach * qty;
            addCoins(total, 'Loot Sold', true);
            saveGame();
            return { ok: true, loot: EXPLORATION_LOOT[lootId], quantity: qty, total, priceEach };
        }

        function getOwnedEconomySnapshot() {
            ensureEconomyState();
            ensureExplorationState();
            const eco = gameState.economy;
            const ex = gameState.exploration;
            return {
                coins: eco.coins || 0,
                inventory: {
                    food: Object.assign({}, eco.inventory.food || {}),
                    toys: Object.assign({}, eco.inventory.toys || {}),
                    medicine: Object.assign({}, eco.inventory.medicine || {}),
                    seeds: Object.assign({}, eco.inventory.seeds || {}),
                    decorations: Object.assign({}, eco.inventory.decorations || {}),
                    accessories: Object.assign({}, eco.inventory.accessories || {}),
                    crafted: Object.assign({}, eco.inventory.crafted || {})
                },
                loot: Object.assign({}, ex.lootInventory || {}),
                crops: Object.assign({}, (gameState.garden && gameState.garden.inventory) || {})
            };
        }

        function refreshRareMarketplace(forceRefresh) {
            const eco = ensureEconomyState();
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const key = `${day}:${season}:${weather}`;
            if (!forceRefresh && eco.market.dayKey === key && Array.isArray(eco.market.stock) && eco.market.stock.length > 0) {
                return eco.market.stock;
            }

            const rand = createSeededRng(hashStringToUint(`market:${key}`));
            const pool = [...ECONOMY_RARE_MARKET_POOL];
            const picks = [];
            const count = Math.min(4, pool.length);
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(rand() * pool.length);
                picks.push(pool.splice(idx, 1)[0]);
            }
            eco.market.stock = picks.map((entry, idx) => {
                const categoryMap = {
                    food: 'food',
                    toys: 'toys',
                    medicine: 'medicine',
                    accessory: 'accessories',
                    seed: 'seeds',
                    decoration: 'decorations',
                    loot: 'loot'
                };
                const category = categoryMap[entry.kind] || entry.kind;
                const rareMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.rareMarketPriceMultiplier === 'number')
                    ? ECONOMY_BALANCE.rareMarketPriceMultiplier
                    : 1;
                const price = Math.max(1, Math.round(getDynamicEconomyPrice(entry.basePrice, category, `rare:${entry.id}`, entry.rarity || 'rare') * rareMult));
                return {
                    offerId: `${key}:${idx}:${entry.id}`,
                    itemRef: entry.id,
                    kind: entry.kind,
                    itemId: entry.itemId,
                    quantity: entry.quantity || 1,
                    price
                };
            });
            eco.market.dayKey = key;
            saveGame();
            return eco.market.stock;
        }

        function getRareMarketplaceStock() {
            refreshRareMarketplace(false);
            return (ensureEconomyState().market.stock || []).slice();
        }

        function buyRareMarketOffer(offerId) {
            const eco = ensureEconomyState();
            refreshRareMarketplace(false);
            const stock = eco.market.stock || [];
            const idx = stock.findIndex((offer) => offer && offer.offerId === offerId);
            if (idx === -1) return { ok: false, reason: 'offer-missing' };
            const offer = stock[idx];
            const spend = spendCoins(offer.price, 'Rare Market', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: offer.price, balance: spend.balance };

            let itemLabel = '';
            let itemEmoji = '🎁';
            if (offer.kind === 'loot') {
                addLootToInventory(offer.itemId, offer.quantity || 1);
                const loot = EXPLORATION_LOOT[offer.itemId];
                itemLabel = loot ? loot.name : offer.itemId;
                itemEmoji = loot ? loot.emoji : itemEmoji;
            } else if (offer.kind === 'food' || offer.kind === 'toys' || offer.kind === 'medicine') {
                addEconomyInventoryItem(offer.kind, offer.itemId, offer.quantity || 1);
                const item = getShopItemData(offer.kind, offer.itemId);
                itemLabel = item ? item.name : offer.itemId;
                itemEmoji = item ? item.emoji : itemEmoji;
            } else if (offer.kind === 'seed') {
                const seedDef = getShopItemData('seeds', offer.itemId);
                const cropId = seedDef ? seedDef.cropId : offer.itemId;
                addEconomyInventoryItem('seeds', cropId, offer.quantity || 1);
                itemLabel = seedDef ? seedDef.name : `${cropId} seeds`;
                itemEmoji = seedDef ? seedDef.emoji : '🌱';
            } else if (offer.kind === 'accessory') {
                const item = getShopItemData('accessories', offer.itemId);
                const accessoryId = item ? item.accessoryId : offer.itemId;
                if (!grantAccessoryToActivePet(accessoryId)) {
                    addEconomyInventoryItem('accessories', accessoryId, 1);
                }
                itemLabel = item ? item.name : accessoryId;
                itemEmoji = item ? item.emoji : '🎀';
            } else if (offer.kind === 'decoration') {
                const item = getShopItemData('decorations', offer.itemId);
                const decorationId = item ? item.decorationId : offer.itemId;
                addEconomyInventoryItem('decorations', decorationId, offer.quantity || 1);
                itemLabel = item ? item.name : decorationId;
                itemEmoji = item ? item.emoji : '🛋️';
            }

            stock.splice(idx, 1);
            eco.market.stock = stock;
            saveGame();
            return { ok: true, offer, itemLabel, itemEmoji, balance: eco.coins };
        }

        function getIngredientCount(source, id) {
            ensureEconomyState();
            ensureExplorationState();
            if (source === 'crop') {
                return Math.max(0, Math.floor(((gameState.garden && gameState.garden.inventory && gameState.garden.inventory[id]) || 0)));
            }
            if (source === 'loot') {
                return Math.max(0, Math.floor(((gameState.exploration && gameState.exploration.lootInventory && gameState.exploration.lootInventory[id]) || 0)));
            }
            if (source === 'crafted') {
                return getEconomyItemCount('crafted', id);
            }
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    const c = getEconomyItemCount(cat, id);
                    if (c > 0) return c;
                }
            }
            return 0;
        }

        function consumeIngredient(source, id, count) {
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (source === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'loot') {
                const inv = gameState.exploration && gameState.exploration.lootInventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'crafted') return consumeEconomyInventoryItem('crafted', id, qty);
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    if (consumeEconomyInventoryItem(cat, id, qty)) return true;
                }
            }
            return false;
        }

        function getCraftingRecipeStates() {
            ensureEconomyState();
            return Object.values(CRAFTING_RECIPES).map((recipe) => {
                const ingredientStatus = (recipe.ingredients || []).map((ing) => {
                    const owned = getIngredientCount(ing.source, ing.id);
                    return Object.assign({}, ing, { owned, missing: Math.max(0, ing.count - owned) });
                });
                const canCraftIngredients = ingredientStatus.every((ing) => ing.missing <= 0);
                const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
                const canCraft = canCraftIngredients && getCoinBalance() >= cost;
                return Object.assign({}, recipe, { ingredientStatus, canCraft, craftCost: cost });
            });
        }

        function craftRecipe(recipeId) {
            const recipe = CRAFTING_RECIPES[recipeId];
            if (!recipe) return { ok: false, reason: 'invalid-recipe' };
            const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
            for (const ing of (recipe.ingredients || [])) {
                if (getIngredientCount(ing.source, ing.id) < ing.count) {
                    return { ok: false, reason: 'missing-ingredients' };
                }
            }
            const spend = spendCoins(cost, 'Crafting', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: cost, balance: spend.balance };

            for (const ing of (recipe.ingredients || [])) {
                consumeIngredient(ing.source, ing.id, ing.count);
            }

            let craftedLabel = recipe.name;
            let craftedEmoji = recipe.emoji || '🛠️';
            if (recipe.outputType === 'crafted') {
                const def = getCraftedItemData(recipe.outputId);
                const itemKey = def ? def.id : recipe.outputId;
                addEconomyInventoryItem('crafted', itemKey, recipe.outputCount || 1);
                if (def) {
                    craftedLabel = def.name;
                    craftedEmoji = def.emoji;
                }
            } else if (recipe.outputType === 'accessory') {
                if (!grantAccessoryToActivePet(recipe.outputId)) {
                    addEconomyInventoryItem('accessories', recipe.outputId, recipe.outputCount || 1);
                }
                const acc = ACCESSORIES[recipe.outputId];
                if (acc) {
                    craftedLabel = acc.name;
                    craftedEmoji = acc.emoji;
                }
            }

            saveGame();
            return { ok: true, recipe, craftedLabel, craftedEmoji };
        }

        function getMinigameTaskTrackLabel(trackKey) {
            const labels = {
                expeditionCount: 'expedition',
                battleCount: 'arena battle',
                harvestCount: 'harvest',
                parkVisits: 'park visit'
            };
            return labels[trackKey] || 'activity';
        }

        function getMinigameDiminishingRedirectHint() {
            const supportedTracks = new Set(['expeditionCount', 'battleCount', 'harvestCount']);
            if (typeof initDailyChecklist === 'function') {
                try {
                    const checklist = initDailyChecklist();
                    const progress = (checklist && checklist.progress) || {};
                    const tasks = Array.isArray(checklist && checklist.tasks) ? checklist.tasks : [];
                    const pending = tasks.filter((task) => task && !task.done && supportedTracks.has(task.trackKey));
                    pending.sort((a, b) => {
                        const aTarget = Math.max(1, Number(a.target) || 1);
                        const bTarget = Math.max(1, Number(b.target) || 1);
                        const aProg = Math.min(aTarget, Number(progress[a.trackKey]) || 0);
                        const bProg = Math.min(bTarget, Number(progress[b.trackKey]) || 0);
                        const aRatio = aProg / aTarget;
                        const bRatio = bProg / bTarget;
                        return aRatio - bRatio;
                    });
                    const next = pending[0];
                    if (next) {
                        const target = Math.max(1, Number(next.target) || 1);
                        const done = Math.min(target, Number(progress[next.trackKey]) || 0);
                        return {
                            short: `Try ${getMinigameTaskTrackLabel(next.trackKey)} (${done}/${target})`,
                            detail: `Daily task: ${next.name} (${done}/${target})`
                        };
                    }
                } catch (e) {
                    // Do not block rewards on checklist issues.
                }
            }
            if (typeof getGoalLadder === 'function') {
                try {
                    const ladder = getGoalLadder();
                    const next = ladder && ladder.next;
                    if (next && typeof next.label === 'string') {
                        const label = next.label.toLowerCase();
                        if (/(expedition|arena|battle|harvest|garden|competition)/.test(label)) {
                            return {
                                short: 'Check your Goal Ladder',
                                detail: `Goal Ladder next: ${next.label}${next.progress ? ` (${next.progress})` : ''}`
                            };
                        }
                    }
                } catch (e) {
                    // Safe fallback below.
                }
            }
            return {
                short: 'Rotate to expedition, garden, or arena',
                detail: 'Try an expedition, harvest, or arena battle to keep momentum.'
            };
        }

        function awardMiniGameCoins(gameId, scoreValue) {
            const score = Math.max(0, Number(scoreValue) || 0);
            if (score <= 0) return 0;
            const gameBonus = {
                fetch: 1.0,
                hideseek: 1.1,
                bubblepop: 1.0,
                matching: 1.2,
                simonsays: 1.35,
                coloring: 0.95,
                racing: 1.12,
                cooking: 1.02,
                fishing: 1.08,
                rhythm: 1.1,
                slider: 1.08,
                trivia: 1.0,
                runner: 1.16,
                tournament: 1.2,
                coop: 1.08
            };
            const multiplier = gameBonus[gameId] || 1;
            const difficulty = typeof getMinigameDifficulty === 'function' ? getMinigameDifficulty(gameId) : 1;
            const difficultyRewardMult = Math.max(0.92, Math.min(1.52, 0.96 + ((difficulty - 1) * 0.52)));
            const payout = Math.max(3, Math.round((6 + Math.pow(score, 0.52) * 4.3) * multiplier * difficultyRewardMult));
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.minigameRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.minigameRewardMultiplier
                : 1;
            // Keep a slight stat link without heavily penalizing weaker pets.
            const petStrength = getPetMiniGameStrength(gameState.pet);
            const petStatRewardMult = Math.max(0.96, Math.min(1.04, 1 + ((petStrength - 0.5) * 0.08)));

            // Escalating mini-game session multiplier
            // 1st game = 1.0x, 2nd = 1.05x, 3rd = 1.1x, cap at 1.15x. Resets on session end.
            if (typeof gameState._sessionMinigameCount !== 'number') gameState._sessionMinigameCount = 0;
            gameState._sessionMinigameCount++;
            const sessionMult = Math.min(1.15, 1 + (Math.max(0, gameState._sessionMinigameCount - 1) * 0.05));
            const today = typeof getTodayString === 'function' ? getTodayString() : '';
            if (!gameState._dailyMinigameEarnings || gameState._dailyMinigameEarningsDay !== today) {
                gameState._dailyMinigameEarnings = 0;
                gameState._dailyMinigameEarningsDay = today;
                gameState._minigameWinStreak = 0;
            }

            const stage = (gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby';
            const prestigeRunMult = (typeof getPrestigeEffectValue === 'function')
                ? (Number(getPrestigeEffectValue('cosmeticChest', 'minigameCoinMultiplier', 1)) || 1)
                : 1;
            const streakBonusPerRun = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusPerRun) || 0.045);
            const streakBonusMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusMax) || 0.38);
            gameState._minigameWinStreak = Math.max(0, Number(gameState._minigameWinStreak) || 0) + 1;
            const streakMult = 1 + Math.min(streakBonusMax, Math.max(0, gameState._minigameWinStreak - 1) * streakBonusPerRun);
            const highSkillThreshold = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillThreshold) || 82);
            const highSkillPerPoint = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillPerPoint) || 0.011);
            const highSkillMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillMaxBonus) || 0.35);
            const highSkillBonus = score >= highSkillThreshold
                ? Math.min(highSkillMax, (score - highSkillThreshold) * highSkillPerPoint)
                : 0;
            const capBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapBase) || 94);
            const capStage = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapByStage && MINIGAME_BALANCE.perRunCapByStage[stage]) || capBase);
            const cap = Math.max(3, Math.floor(capStage));
            const rawTuned = Math.max(3, Math.round(payout * ecoMult * petStatRewardMult * sessionMult * streakMult * (1 + highSkillBonus) * prestigeRunMult));
            let tuned = Math.max(3, Math.min(cap, rawTuned));
            const perRunCapHit = tuned < rawTuned;

            const stageSoftCapBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapBase) || 380);
            const stageSoftCap = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapByStage && MINIGAME_BALANCE.dailySoftCapByStage[stage]) || stageSoftCapBase);
            const prestigeSoftCap = (typeof getPrestigeEffectValue === 'function')
                ? (Number(getPrestigeEffectValue('cosmeticChest', 'minigameDailySoftCapBonus', 0)) || 0)
                : 0;
            const dailySoftCap = Math.max(50, Math.floor(stageSoftCap + prestigeSoftCap));
            const earnedBefore = Math.max(0, Number(gameState._dailyMinigameEarnings) || 0);
            const overCap = Math.max(0, earnedBefore - dailySoftCap);
            let diminishingMult = 1;
            let inDiminishingRewards = false;
            if (overCap > 0) {
                const falloff = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapFalloffPerCoin) || 0.0042);
                const minMult = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapMinMultiplier) || 0.2);
                diminishingMult = Math.max(minMult, 1 / (1 + (overCap * falloff)));
                tuned = Math.max(1, Math.round(tuned * diminishingMult));
                inDiminishingRewards = true;
            }
            gameState._dailyMinigameEarnings += tuned;

            const redirectHint = inDiminishingRewards ? getMinigameDiminishingRedirectHint() : null;
            gameState._lastMinigameRewardContext = {
                at: Date.now(),
                source: 'minigame',
                gameId,
                score,
                tuned,
                payoutBase: payout,
                perRunCap: cap,
                perRunCapHit,
                dailySoftCap,
                dailyEarnedBefore: earnedBefore,
                dailyEarnedAfter: gameState._dailyMinigameEarnings,
                overCap,
                inDiminishingRewards,
                diminishingMult,
                summaryHint: inDiminishingRewards
                    ? `Diminishing rewards active (${Math.round(diminishingMult * 100)}% payout). ${redirectHint && redirectHint.detail ? redirectHint.detail : 'Rotate to expedition, harvest, or arena.'}`
                    : ''
            };

            if (inDiminishingRewards && typeof showToast === 'function') {
                const now = Date.now();
                if ((now - (Number(gameState._lastMinigameSoftCapToastAt) || 0)) > 45000) {
                    gameState._lastMinigameSoftCapToastAt = now;
                    const redirectText = redirectHint && redirectHint.short ? ` ${redirectHint.short}.` : '';
                    showToast(`🎮 Diminishing rewards active (${Math.round(diminishingMult * 100)}% payout).${redirectText}`, '#90A4AE');
                }
            }

            if (typeof balanceDebugLog === 'function') {
                balanceDebugLog('MinigameReward', {
                    gameId,
                    score,
                    difficulty,
                    payoutBase: payout,
                    tuned,
                    rawTuned,
                    perRunCap: cap,
                    perRunCapHit,
                    dailySoftCap,
                    dailyEarned: gameState._dailyMinigameEarnings,
                    overCap,
                    inDiminishingRewards,
                    diminishingMult,
                    streak: gameState._minigameWinStreak,
                    highSkillBonus
                });
                if (perRunCapHit || inDiminishingRewards) {
                    balanceDebugLog('MinigameCapEncounter', {
                        gameId,
                        perRunCapHit,
                        inDiminishingRewards,
                        perRunCap: cap,
                        dailySoftCap,
                        earnedBefore,
                        earnedAfter: gameState._dailyMinigameEarnings
                    });
                }
            }

            addCoins(tuned, 'Mini-game', true);
            return tuned;
        }

        function awardHarvestCoins(cropId) {
            const crop = GARDEN_CROPS[cropId];
            if (!crop) return 0;
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.harvestRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.harvestRewardMultiplier
                : 1;
            const currentSeason = gameState.season || getCurrentSeason();
            const payout = (typeof EconomyCalculations !== 'undefined' && EconomyCalculations && typeof EconomyCalculations.computeHarvestCoinPayout === 'function')
                ? EconomyCalculations.computeHarvestCoinPayout({
                    crop,
                    currentSeason,
                    economyMultiplier: ecoMult
                })
                : Math.max(2, Math.round((3 + Math.round((crop.hungerValue || 0) / 4) + Math.round((crop.happinessValue || 0) / 6) + Math.round((crop.energyValue || 0) / 6)) * ((crop.seasonBonus || []).includes(currentSeason) ? 1.2 : 1.0) * ecoMult));
            addCoins(payout, 'Harvest', true);
            return payout;
        }

        function openMysteryEgg() {
            const price = getMysteryEggPrice();
            const spend = spendCoins(price, 'Mystery Egg', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: price, balance: spend.balance };
            const eco = ensureEconomyState();
            const roll = Math.random();
            let reward = null;
            if (roll < 0.2) {
                // Rec 12: Reduced coin range from 40-80 to 20-50 for slightly negative EV
                const coinReward = 20 + Math.floor(Math.random() * 31);
                addCoins(coinReward, 'Mystery Egg Bonus', true);
                reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙' };
            } else if (roll < 0.45) {
                const foodKeys = Object.keys(ECONOMY_SHOP_ITEMS.food || {});
                const itemId = randomFromArray(foodKeys);
                addEconomyInventoryItem('food', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.food[itemId];
                reward = { type: 'food', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.63) {
                const toyKeys = Object.keys(ECONOMY_SHOP_ITEMS.toys || {});
                const itemId = randomFromArray(toyKeys);
                addEconomyInventoryItem('toys', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.toys[itemId];
                reward = { type: 'toys', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.79) {
                const medKeys = Object.keys(ECONOMY_SHOP_ITEMS.medicine || {});
                const itemId = randomFromArray(medKeys);
                addEconomyInventoryItem('medicine', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.medicine[itemId];
                reward = { type: 'medicine', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.93) {
                const lootId = randomFromArray(Object.keys(EXPLORATION_LOOT));
                addLootToInventory(lootId, 1);
                const loot = EXPLORATION_LOOT[lootId];
                reward = { type: 'loot', itemId: lootId, label: loot.name, emoji: loot.emoji };
            } else {
                const accId = randomFromArray(Object.keys(ACCESSORIES));
                if (!grantAccessoryToActivePet(accId)) {
                    addEconomyInventoryItem('accessories', accId, 1);
                }
                const acc = ACCESSORIES[accId];
                reward = { type: 'accessory', itemId: accId, label: acc.name, emoji: acc.emoji };
            }
            eco.mysteryEggsOpened = (eco.mysteryEggsOpened || 0) + 1;
            saveGame();
            return { ok: true, price, reward, balance: eco.coins };
        }

        function getAuctionHouseSnapshot() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const myWallet = Math.max(0, Math.floor((data.wallets && data.wallets[slotId]) || 0));
            const listings = (data.listings || [])
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((listing) => {
                    const label = getAuctionItemLabel(listing.itemType, listing.itemId);
                    return Object.assign({}, listing, label);
                });
            return {
                slotId,
                slotLabel: getAuctionSlotLabel(slotId),
                wallets: Object.assign({}, data.wallets || {}),
                myWallet,
                listings
            };
        }

        function setAuctionSlot(slotId) {
            if (!ECONOMY_AUCTION_SLOTS.includes(slotId)) return false;
            const eco = ensureEconomyState();
            eco.auction.slotId = slotId;
            try {
                localStorage.setItem(getAuctionSlotStorageKey(), slotId);
            } catch (e) {
                // ignore storage errors
            }
            saveGame();
            return true;
        }

        function getAuctionItemLabel(itemType, itemId) {
            if (itemType === 'loot' && EXPLORATION_LOOT[itemId]) {
                return { name: EXPLORATION_LOOT[itemId].name, emoji: EXPLORATION_LOOT[itemId].emoji };
            }
            if (itemType === 'crop' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Crop`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if (itemType === 'seed' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Seeds`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if ((itemType === 'food' || itemType === 'toys' || itemType === 'medicine') && ECONOMY_SHOP_ITEMS[itemType] && ECONOMY_SHOP_ITEMS[itemType][itemId]) {
                return { name: ECONOMY_SHOP_ITEMS[itemType][itemId].name, emoji: ECONOMY_SHOP_ITEMS[itemType][itemId].emoji };
            }
            if (itemType === 'crafted' && CRAFTED_ITEMS[itemId]) {
                return { name: CRAFTED_ITEMS[itemId].name, emoji: CRAFTED_ITEMS[itemId].emoji };
            }
            if (itemType === 'accessory' && ACCESSORIES[itemId]) {
                return { name: ACCESSORIES[itemId].name, emoji: ACCESSORIES[itemId].emoji };
            }
            if (itemType === 'decoration' && FURNITURE.decorations[itemId]) {
                return { name: FURNITURE.decorations[itemId].name, emoji: FURNITURE.decorations[itemId].emoji || '🛋️' };
            }
            return { name: itemId, emoji: '📦' };
        }

        function getAuctionOwnedCount(itemType, itemId) {
            ensureEconomyState();
            ensureExplorationState();
            if (itemType === 'loot') return Math.max(0, Math.floor((gameState.exploration.lootInventory[itemId] || 0)));
            if (itemType === 'crop') return Math.max(0, Math.floor((((gameState.garden || {}).inventory || {})[itemId] || 0)));
            if (itemType === 'seed') return getSeedInventoryCount(itemId);
            if (itemType === 'crafted') return getEconomyItemCount('crafted', itemId);
            if (itemType === 'accessory') return getEconomyItemCount('accessories', itemId);
            if (itemType === 'decoration') return getEconomyItemCount('decorations', itemId);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return getEconomyItemCount(itemType, itemId);
            return 0;
        }

        function consumeAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                const inv = gameState.exploration.lootInventory;
                if ((inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'seed') return consumeEconomyInventoryItem('seeds', itemId, count);
            if (itemType === 'crafted') return consumeEconomyInventoryItem('crafted', itemId, count);
            if (itemType === 'accessory') return consumeEconomyInventoryItem('accessories', itemId, count);
            if (itemType === 'decoration') return consumeEconomyInventoryItem('decorations', itemId, count);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return consumeEconomyInventoryItem(itemType, itemId, count);
            return false;
        }

        function addAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                addLootToInventory(itemId, count);
                return;
            }
            if (itemType === 'crop') {
                if (!gameState.garden.inventory[itemId]) gameState.garden.inventory[itemId] = 0;
                gameState.garden.inventory[itemId] += count;
                return;
            }
            if (itemType === 'seed') {
                addEconomyInventoryItem('seeds', itemId, count);
                return;
            }
            if (itemType === 'crafted') {
                addEconomyInventoryItem('crafted', itemId, count);
                return;
            }
            if (itemType === 'accessory') {
                addEconomyInventoryItem('accessories', itemId, count);
                return;
            }
            if (itemType === 'decoration') {
                addEconomyInventoryItem('decorations', itemId, count);
                return;
            }
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') {
                addEconomyInventoryItem(itemType, itemId, count);
            }
        }

        function createAuctionListing(itemType, itemId, quantity, price) {
            const eco = ensureEconomyState();
            const qty = Math.max(1, Math.floor(Number(quantity) || 1));
            const ask = Math.max(1, Math.floor(Number(price) || 1));
            const owned = getAuctionOwnedCount(itemType, itemId);
            if (owned < qty) return { ok: false, reason: 'not-enough-items', owned };

            // Rec 8: Enforce per-slot listing cap
            const perSlotCap = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionPerSlotListingCap === 'number')
                ? ECONOMY_BALANCE.auctionPerSlotListingCap : 12;
            const existingData = loadAuctionHouseData();
            const mySlotListings = (existingData.listings || []).filter(l => l.sellerSlot === eco.auction.slotId);
            if (mySlotListings.length >= perSlotCap) {
                return { ok: false, reason: 'slot-listing-cap', cap: perSlotCap };
            }

            // Rec 4: Charge non-refundable listing fee upfront
            const feeRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionListingFeeRate === 'number')
                ? ECONOMY_BALANCE.auctionListingFeeRate : 0.03;
            const listingFee = Math.max(1, Math.floor(ask * feeRate));
            const feeSpend = spendCoins(listingFee, 'Listing Fee', true);
            if (!feeSpend.ok) return { ok: false, reason: 'insufficient-funds-fee', needed: listingFee, balance: feeSpend.balance };

            if (!consumeAuctionItem(itemType, itemId, qty)) {
                // Refund listing fee if consume fails
                addCoins(listingFee, 'Listing Fee Refund', true);
                return { ok: false, reason: 'consume-failed' };
            }

            const data = loadAuctionHouseData();
            const listing = {
                id: `auc_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
                sellerSlot: eco.auction.slotId,
                // Rec 2: Embed persistent playerId for cross-slot self-trade prevention
                sellerPlayerId: eco.playerId || '',
                itemType,
                itemId,
                quantity: qty,
                price: ask,
                listingFee: listingFee,
                createdAt: Date.now()
            };
            data.listings.unshift(listing);
            if (data.listings.length > 80) data.listings = data.listings.slice(0, 80);
            saveAuctionHouseData(data);
            eco.auction.postedCount = (eco.auction.postedCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(itemType, itemId)), listingFee };
        }

        function cancelAuctionListing(listingId) {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            if (listing.sellerSlot !== eco.auction.slotId) return { ok: false, reason: 'not-owner' };
            data.listings.splice(idx, 1);
            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);
            saveAuctionHouseData(data);
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)) };
        }

        function buyAuctionListing(listingId) {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            // Rec 2: Block self-purchase by playerId (cross-slot exploit fix) + legacy slotId check
            if (listing.sellerSlot === eco.auction.slotId) return { ok: false, reason: 'own-listing' };
            if (listing.sellerPlayerId && listing.sellerPlayerId === eco.playerId) return { ok: false, reason: 'own-listing' };

            const spend = spendCoins(listing.price, 'Auction Buy', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: listing.price, balance: spend.balance };

            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);

            // Rec 3: Apply transaction tax — seller receives price minus tax
            const taxRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionTransactionTaxRate === 'number')
                ? ECONOMY_BALANCE.auctionTransactionTaxRate : 0.08;
            const taxAmount = Math.max(0, Math.floor(listing.price * taxRate));
            const sellerProceeds = listing.price - taxAmount;
            data.wallets[listing.sellerSlot] = Math.max(0, Math.floor((data.wallets[listing.sellerSlot] || 0))) + sellerProceeds;
            data.listings.splice(idx, 1);
            saveAuctionHouseData(data);
            eco.auction.boughtCount = (eco.auction.boughtCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)), balance: eco.coins, taxAmount };
        }

        function claimAuctionEarnings() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const amount = Math.max(0, Math.floor((data.wallets[slotId] || 0)));
            if (amount <= 0) return { ok: false, reason: 'nothing-to-claim' };
            data.wallets[slotId] = 0;
            saveAuctionHouseData(data);
            addCoins(amount, 'Auction Payout', true);
            eco.auction.soldCount = (eco.auction.soldCount || 0) + 1;
            saveGame();
            return { ok: true, amount, balance: eco.coins };
        }
