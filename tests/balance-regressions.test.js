const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeDateShim(nowRef) {
    return class FakeDate extends Date {
        constructor(...args) {
            if (args.length === 0) {
                super(nowRef.value);
                return;
            }
            super(...args);
        }
        static now() {
            return nowRef.value;
        }
    };
}

function loadScript(relPath, sandbox) {
    const fullPath = path.join(__dirname, '..', relPath);
    const src = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(src, sandbox, { filename: relPath });
}

function createEconomySandbox() {
    const nowRef = { value: 0 };
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date: makeDateShim(nowRef),
        Math: Object.create(Math),
        __nowRef: nowRef,
        gameState: {
            economy: {
                coins: 0,
                inventory: { food: {}, toys: {}, medicine: {}, seeds: {}, accessories: {}, decorations: {}, crafted: {} },
                market: { dayKey: '', stock: [] },
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
                totalEarned: 0,
                totalSpent: 0,
                mysteryEggsOpened: 0,
                wealthPressure: { lastAppliedDate: '', lastFee: 0, lastBreakdown: null, unpaidFeeDebt: 0 }
            },
            exploration: { lootInventory: {} },
            garden: { inventory: {} },
            security: { suspicious: false, suspiciousReason: '', coinGainMinute: { windowStart: 0, earned: 0 }, coinGainSession: { earned: 0 } },
            season: 'spring',
            weather: 'sunny'
        },
        STORAGE_KEYS: { auctionHouse: 'auction', auctionSlotId: 'auctionSlot' },
        ECONOMY_AUCTION_SLOTS: ['slotA', 'slotB', 'slotC'],
        ECONOMY_HARDENING_BALANCE: {
            tamperPenaltyMultiplier: 0.12,
            coinGainRateLimit: {
                minuteSoftCap: 100,
                minuteFalloffPerCoin: 0.02,
                minuteMinMultiplier: 0.08,
                sessionSoftCap: 150,
                sessionFalloffPerCoin: 0.01,
                sessionMinMultiplier: 0.2
            },
            wealthPressure: {
                enabled: true,
                protectedWealth: 1600,
                tradableValueWeight: 0.35,
                dailyRate: 0.0035,
                minFee: 2,
                debtResalePenaltyPer100Coins: 0.03,
                debtResalePenaltyMax: 0.35
            }
        },
        ECONOMY_BALANCE: {
            sellPriceMultiplier: 1,
            expeditionSellPriceMultiplier: 0.5,
            wealthPressureDebtResalePenaltyPer100Coins: 0.03,
            wealthPressureDebtResalePenaltyMax: 0.35
        },
        EXPLORATION_LOOT: {
            ancientCoin: { id: 'ancientCoin', rarity: 'common' },
            rareRelic: { id: 'rareRelic', rarity: 'rare' }
        },
        BIOME_LOOT_POOLS: { forest: ['ancientCoin'], cave: ['rareRelic'] },
        GARDEN_CROPS: {},
        ECONOMY_SHOP_ITEMS: { accessories: {}, decorations: {} },
        SEASONS: {},
        WEATHER_TYPES: {},
        localStorage: {
            getItem() { return null; },
            setItem() {}
        },
        generatePlayerId() { return 'pid_test'; },
        createDefaultEconomyState() {
            return {
                coins: 0,
                starterSeedGranted: true,
                playerId: 'pid_test',
                inventory: { food: {}, toys: {}, medicine: {}, seeds: {}, accessories: {}, decorations: {}, crafted: {} },
                market: { dayKey: '', stock: [] },
                mysteryEggsOpened: 0,
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
                totalEarned: 0,
                totalSpent: 0,
                wealthPressure: { lastAppliedDate: '', lastFee: 0, lastBreakdown: null, unpaidFeeDebt: 0 }
            };
        },
        ensureExplorationState() {
            if (!this.gameState.exploration) this.gameState.exploration = { lootInventory: {} };
            return this.gameState.exploration;
        },
        saveGame() {},
        showToast() {},
        getTodayString() { return '2026-02-24'; },
        clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    };
    sandbox.Math.random = () => 0.5;
    vm.createContext(sandbox);
    loadScript('js/economy.js', sandbox);
    sandbox.getDynamicEconomyPrice = (base) => Math.max(1, Math.floor(Number(base) || 1));
    return sandbox;
}

function createExplorationSandbox() {
    const nowRef = { value: 100000 };
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date: makeDateShim(nowRef),
        Math: Object.create(Math),
        __nowRef: nowRef,
        gameState: {
            pet: { id: 'pet1', name: 'Scout', type: 'dog', energy: 50, growthStage: 'adult' },
            activePetIndex: 0,
            pets: [],
            currentRoom: 'bedroom',
            exploration: null
        },
        clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
        randomFromArray(arr) { return Array.isArray(arr) ? arr[0] : null; },
        showToast() {},
        announce() {},
        saveGame() {},
        refreshMasteryTracks() {},
        incrementDailyProgress() {},
        getRoomSystemMultiplier() { return 1; },
        consumeExpeditionRewardBonusRolls() { return 0; },
        getAsyncLoopTuning() { return { expeditionStage: {}, expeditionProgressionSlowdown: [] }; },
        getAllPetTypeData() { return null; },
        PET_TYPES: { dog: { name: 'Dog', emoji: '🐶' } },
        GROWTH_STAGES: { adult: { label: 'Adult' }, baby: { label: 'Baby' } },
        GAME_BALANCE: {
            timing: { treasureCooldownMs: 30000, dungeonRoomCooldownMs: 30000, npcBefriendCooldownMs: 30000 },
            petCare: { expeditionHappinessGain: 5, expeditionEnergyCost: 5 }
        },
        TREASURE_HUNT_BALANCE: {
            globalCooldownMs: 20000,
            energyCost: 5,
            successChanceBase: 0.48,
            successChanceMin: 0.2,
            extraRollChanceBase: 0.22,
            antiFarmWindowMs: 180000,
            penaltyResetMs: 240000,
            roomSwapPenaltyStep: 0.07,
            repeatPenaltyStep: 0.05,
            maxPenaltyStacks: 6
        },
        EXPEDITION_DURATIONS: [{ id: 'scout', ms: 40000, lootMultiplier: 1, label: 'Scout', name: 'Scout' }],
        EXPEDITION_BALANCE: {
            durationDiminishingThreshold: 2.15,
            durationDiminishingExponent: 0.82,
            biomeRarityWeightMultiplier: { forest: 1 },
            upkeepBaseCoins: 0,
            upkeepPerMinute: 0,
            biomeUpkeepMultiplier: { forest: 1 }
        },
        EXPLORATION_BIOMES: { forest: { id: 'forest', name: 'Forest', icon: '🌲', npcTypes: ['dog'] } },
        EXPLORATION_LOOT: { ancientCoin: { id: 'ancientCoin', rarity: 'common', emoji: '🪙', name: 'Ancient Coin' } },
        BIOME_LOOT_POOLS: { forest: ['ancientCoin'] },
        ROOM_TREASURE_POOLS: { bedroom: ['ancientCoin'], kitchen: ['ancientCoin'] },
        ROOMS: {
            bedroom: { id: 'bedroom', name: 'Bedroom', isOutdoor: false, icon: '🛏️' },
            kitchen: { id: 'kitchen', name: 'Kitchen', isOutdoor: false, icon: '🍳' }
        },
        spendCoins() { return { ok: true, spent: 0, balance: 0 }; }
    };
    sandbox.Math.random = () => 0.99;
    vm.createContext(sandbox);
    loadScript('js/exploration.js', sandbox);
    return sandbox;
}

test('coin gain rate limits reduce repeated high coin credits within a minute', () => {
    const sandbox = createEconomySandbox();
    sandbox.__nowRef.value = 1000;

    const first = sandbox.applyCoinGainRateLimits(120, 'Mini-game', sandbox.gameState);
    const second = sandbox.applyCoinGainRateLimits(120, 'Mini-game', sandbox.gameState);
    const third = sandbox.applyCoinGainRateLimits(120, 'Mini-game', sandbox.gameState);

    assert.equal(first.amount, 120);
    assert.ok(second.amount < first.amount, `expected second payout < first (${second.amount} < ${first.amount})`);
    assert.ok(third.amount <= second.amount, `expected third payout <= second (${third.amount} <= ${second.amount})`);
});

test('treasure hunt applies global cooldown, energy cost, and anti-farm penalties', () => {
    const sandbox = createExplorationSandbox();
    const startEnergy = sandbox.gameState.pet.energy;

    const first = sandbox.runTreasureHunt('bedroom');
    assert.equal(first.ok, true);
    assert.ok(first.energyCost > 0);
    assert.equal(sandbox.gameState.pet.energy, startEnergy - first.energyCost);

    const immediateRetry = sandbox.runTreasureHunt('bedroom');
    assert.equal(immediateRetry.ok, false);
    assert.equal(immediateRetry.reason, 'cooldown');

    sandbox.__nowRef.value += first.cooldownMs;
    const previewSwap = sandbox.getTreasureHuntPreview('kitchen');
    assert.ok(previewSwap.penaltyStacks >= 1);
    assert.ok(previewSwap.successChance < sandbox.TREASURE_HUNT_BALANCE.successChanceBase);
});

test('expedition loot provenance and debt apply resale penalties', () => {
    const sandbox = createEconomySandbox();

    const generic = sandbox.getLootSellPrice('rareRelic');
    const expedition = sandbox.getLootSellPrice({ id: 'rareRelic', meta: { source: 'expedition' } });
    assert.ok(expedition < generic, `expected expedition price < generic (${expedition} < ${generic})`);

    sandbox.gameState.economy.wealthPressure.unpaidFeeDebt = 500;
    const debtPenalized = sandbox.getLootSellPrice('rareRelic');
    assert.ok(debtPenalized < generic, `expected debt penalty price < generic (${debtPenalized} < ${generic})`);
});

test('garden harvest runtime honors harvestYield for inventory, progression, and coin awards', () => {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Math,
        Date,
        gameState: {
            garden: {
                plots: [{ cropId: 'pumpkin', stage: 3, growTicks: 99, watered: false }],
                inventory: {},
                totalHarvests: 0,
                expansionTier: 0
            },
            currentRoom: 'bedroom',
            pet: null
        },
        GARDEN_CROPS: {
            pumpkin: { id: 'pumpkin', name: 'Pumpkin', seedEmoji: '🎃', harvestYield: 2, stages: ['a', 'b', 'c', 'd'] }
        },
        MAX_GARDEN_PLOTS: 16,
        SEASONS: {},
        getCurrentSeason() { return 'autumn'; },
        awardHarvestCoins() { sandbox.__coinCalls += 1; return 5; },
        __coinCalls: 0,
        trackHarvest() {},
        addJournalEntry() {},
        incrementDailyProgress() { return []; },
        checkAchievements() { return []; },
        checkBadges() { return []; },
        checkStickers() { return []; },
        checkTrophies() { return []; },
        BADGE_TIERS: {},
        showToast() {},
        clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
        updateNeedDisplays() {},
        updatePetMood() {},
        updateWellnessBar() {},
        saveGame() {},
        renderGardenUI() {},
        getUnlockedPlotCount() { return 6; },
        escapeHTML(v) { return String(v); }
    };
    vm.createContext(sandbox);
    loadScript('js/garden.js', sandbox);

    sandbox.harvestPlot(0);

    assert.equal(sandbox.gameState.garden.inventory.pumpkin, 2);
    assert.equal(sandbox.gameState.garden.totalHarvests, 2);
    assert.equal(sandbox.__coinCalls, 2);
    assert.equal(sandbox.gameState.garden.plots[0], null);
});
