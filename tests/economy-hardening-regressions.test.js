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

function isoDay(nowMs) {
    return new Date(nowMs).toISOString().slice(0, 10);
}

function createEconomySandbox() {
    const nowRef = { value: Date.UTC(2026, 1, 24, 12, 0, 0) };
    const storage = {};
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date: makeDateShim(nowRef),
        Math: Object.create(Math),
        __nowRef: nowRef,
        __storage: storage,
        __toasts: [],
        gameState: {
            economy: {
                coins: 5000,
                playerId: 'pid_alpha',
                starterSeedGranted: true,
                inventory: {
                    food: {},
                    toys: {},
                    medicine: {},
                    seeds: {},
                    accessories: {},
                    decorations: {},
                    crafted: {}
                },
                market: { dayKey: '', stock: [] },
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
                totalEarned: 0,
                totalSpent: 0,
                mysteryEggsOpened: 0,
                wealthPressure: { lastAppliedDate: '', lastFee: 0, lastBreakdown: null, unpaidFeeDebt: 0 }
            },
            exploration: { lootInventory: {}, lootInventoryStacks: {} },
            garden: { inventory: {} },
            pet: { unlockedAccessories: [] },
            furniture: {},
            security: { suspicious: false, suspiciousReason: '', coinGainMinute: { windowStart: 0, earned: 0 }, coinGainSession: { earned: 0 } },
            season: 'spring',
            weather: 'sunny'
        },
        STORAGE_KEYS: { auctionHouse: 'auction-house', auctionSlotId: 'auction-slot' },
        ECONOMY_AUCTION_SLOTS: ['slotA', 'slotB', 'slotC'],
        ECONOMY_HARDENING_BALANCE: {
            suspiciousAuctionLock: true,
            tamperPenaltyMultiplier: 0.12,
            coinGainRateLimit: {
                minuteSoftCap: 200,
                minuteFalloffPerCoin: 0.03,
                minuteMinMultiplier: 0.05,
                sessionSoftCap: 260,
                sessionFalloffPerCoin: 0.03,
                sessionMinMultiplier: 0.05
            },
            wealthPressure: {
                enabled: true,
                protectedWealth: 1600,
                tradableValueWeight: 0.35,
                dailyRate: 0.0035,
                minFee: 2,
                debtResalePenaltyPer100Coins: 0.03,
                debtResalePenaltyMax: 0.35
            },
            auction: {
                listingExpiryMs: 24 * 60 * 60 * 1000,
                relistWindowMs: 3 * 24 * 60 * 60 * 1000,
                relistFeeStepRate: 0.02,
                relistFeeMaxExtraRate: 0.12,
                relistFeeEscalation: {
                    windowMs: 3 * 24 * 60 * 60 * 1000,
                    stepRate: 0.02,
                    maxExtraRate: 0.12
                }
            },
            recurringSinks: {
                enabled: true,
                requirePrestige: true,
                roomUpkeepBase: 6,
                roomUpkeepPerDecoratedRoom: 2,
                breedingPermitPerEgg: 4,
                auctionListingUpkeepPerActiveListing: 2,
                maxDailyTotal: 36
            }
        },
        ECONOMY_BALANCE: {
            shopPriceMultiplier: 1,
            rareMarketPriceMultiplier: 1,
            sellPriceMultiplier: 1,
            expeditionSellPriceMultiplier: 0.78,
            harvestRewardMultiplier: 0.82,
            auctionTransactionTaxRate: 0.08,
            auctionListingFeeRate: 0.03,
            auctionPerSlotListingCap: 12,
            wealthPressureDebtResalePenaltyPer100Coins: 0.03,
            wealthPressureDebtResalePenaltyMax: 0.35,
            volatilityMin: 1,
            volatilityRange: 0
        },
        ECONOMY_RARE_MARKET_POOL: [
            { id: 'r1', kind: 'food', itemId: 'kibbleBag', quantity: 1, basePrice: 10, rarity: 'rare' },
            { id: 'r2', kind: 'seed', itemId: 'carrotSeeds', quantity: 2, basePrice: 10, rarity: 'rare' },
            { id: 'r3', kind: 'loot', itemId: 'ancientCoin', quantity: 1, basePrice: 10, rarity: 'rare' },
            { id: 'r4', kind: 'accessory', itemId: 'wizardHat', quantity: 1, basePrice: 10, rarity: 'rare' }
        ],
        ECONOMY_SHOP_ITEMS: {
            food: { kibbleBag: { id: 'kibbleBag', name: 'Kibble', emoji: '🥣', basePrice: 20 } },
            toys: { squeakyBall: { id: 'squeakyBall', name: 'Ball', emoji: '🟠', basePrice: 18 } },
            medicine: { medKit: { id: 'medKit', name: 'MedKit', emoji: '🩹', basePrice: 22 } },
            seeds: { carrotSeeds: { id: 'carrotSeeds', name: 'Carrot Seeds', cropId: 'carrot', quantity: 3, basePrice: 15, emoji: '🥕' } },
            accessories: { wizardHat: { id: 'wizardHat', name: 'Wizard Hat', accessoryId: 'wizardHat', emoji: '🧙', basePrice: 40 } },
            decorations: { lamp: { id: 'lamp', name: 'Lamp', decorationId: 'lamp', emoji: '💡', basePrice: 30 } }
        },
        EXPLORATION_LOOT: {
            ancientCoin: { id: 'ancientCoin', name: 'Ancient Coin', emoji: '🪙', rarity: 'common' },
            shell: { id: 'shell', name: 'Shell', emoji: '🐚', rarity: 'common' },
            emberStone: { id: 'emberStone', name: 'Ember Stone', emoji: '🔥', rarity: 'common' },
            runeFragment: { id: 'runeFragment', name: 'Rune Fragment', emoji: '🪨', rarity: 'rare' },
            mysteryMap: { id: 'mysteryMap', name: 'Mystery Map', emoji: '🗺️', rarity: 'rare' },
            tidePearl: { id: 'tidePearl', name: 'Tide Pearl', emoji: '🦪', rarity: 'rare' },
            stardust: { id: 'stardust', name: 'Stardust', emoji: '✨', rarity: 'rare' }
        },
        BIOME_LOOT_POOLS: { forest: ['ancientCoin', 'shell', 'emberStone'] },
        GARDEN_CROPS: {
            carrot: { name: 'Carrot', seedEmoji: '🥕', hungerValue: 15, happinessValue: 5, energyValue: 0, seasonBonus: ['spring'], growTime: 3 },
            tomato: { name: 'Tomato', seedEmoji: '🍅', hungerValue: 18, happinessValue: 8, energyValue: 0, seasonBonus: ['summer'], growTime: 4 }
        },
        ACCESSORIES: { wizardHat: { id: 'wizardHat', name: 'Wizard Hat', emoji: '🧙' } },
        CRAFTED_ITEMS: {},
        FURNITURE: { decorations: { lamp: { id: 'lamp', name: 'Lamp', emoji: '💡' } } },
        ROOM_IDS: ['bedroom', 'livingroom'],
        SEASONS: { spring: { icon: '🌸', name: 'Spring' } },
        WEATHER_TYPES: { sunny: { icon: '☀️', name: 'Sunny' } },
        localStorage: {
            getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
            setItem(key, value) { storage[key] = String(value); }
        },
        showToast(message) { sandbox.__toasts.push(String(message)); },
        saveGame() {},
        generatePlayerId() { return 'pid_generated'; },
        createDefaultEconomyState() {
            return JSON.parse(JSON.stringify({
                coins: 240,
                playerId: 'pid_generated',
                starterSeedGranted: true,
                inventory: { food: {}, toys: {}, medicine: {}, seeds: {}, accessories: {}, decorations: {}, crafted: {} },
                market: { dayKey: '', stock: [] },
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
                totalEarned: 0,
                totalSpent: 0,
                mysteryEggsOpened: 0,
                wealthPressure: { lastAppliedDate: '', lastFee: 0, lastBreakdown: null, unpaidFeeDebt: 0 }
            }));
        },
        ensureExplorationState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : sandbox.gameState;
            if (!state.exploration || typeof state.exploration !== 'object') state.exploration = { lootInventory: {}, lootInventoryStacks: {} };
            if (!state.exploration.lootInventory) state.exploration.lootInventory = {};
            if (!state.exploration.lootInventoryStacks) state.exploration.lootInventoryStacks = {};
            return state.exploration;
        },
        addLootToInventory(lootId, qty) {
            const inv = sandbox.gameState.exploration.lootInventory;
            inv[lootId] = Math.max(0, Math.floor(inv[lootId] || 0)) + Math.max(1, Math.floor(qty || 1));
        },
        createSeededRng(seed) {
            let s = (Number(seed) || 1) >>> 0;
            return function rng() {
                s = (Math.imul(1664525, s) + 1013904223) >>> 0;
                return s / 0x100000000;
            };
        },
        getTodayString() { return isoDay(nowRef.value); },
        getCurrentSeason() { return 'spring'; },
        clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    };
    sandbox.Math.random = () => 0.12345;
    vm.createContext(sandbox);
    loadScript('js/economy.js', sandbox);
    sandbox.getDynamicEconomyPrice = (base) => Math.max(1, Math.floor(Number(base) || 1));
    return sandbox;
}

function writeAuctionData(sandbox, data) {
    sandbox.localStorage.setItem(sandbox.STORAGE_KEYS.auctionHouse, JSON.stringify(data));
}

function readAuctionData(sandbox) {
    return JSON.parse(sandbox.localStorage.getItem(sandbox.STORAGE_KEYS.auctionHouse) || '{"listings":[],"wallets":{},"profileWallets":{}}');
}

test('auction normalization preserves sellerPlayerId for self-trade checks', () => {
    const s = createEconomySandbox();
    writeAuctionData(s, {
        listings: [{
            id: 'l1',
            sellerSlot: 'slotB',
            sellerPlayerId: 'pid_alpha',
            itemType: 'food',
            itemId: 'kibbleBag',
            quantity: 1,
            price: 25,
            createdAt: s.__nowRef.value
        }],
        wallets: {},
        profileWallets: {}
    });

    const data = s.loadAuctionHouseData();
    assert.equal(data.listings[0].sellerPlayerId, 'pid_alpha');
});

test('buyAuctionListing rejects self-trades across slots for same stable player id', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    s.setAuctionSlot('slotA');
    writeAuctionData(s, {
        listings: [{
            id: 'self1',
            sellerSlot: 'slotB',
            sellerPlayerId: 'pid_alpha',
            itemType: 'food',
            itemId: 'kibbleBag',
            quantity: 1,
            price: 10,
            createdAt: s.__nowRef.value,
            expiresAt: s.__nowRef.value + 100000
        }],
        wallets: {},
        profileWallets: {}
    });

    const result = s.buyAuctionListing('self1');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'own-listing');
});

test('rare market remains empty for the same hardened day after full buyout', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    const first = s.getRareMarketplaceStock();
    assert.equal(first.length, 4);
    first.forEach((offer) => {
        const res = s.buyRareMarketOffer(offer.offerId);
        assert.equal(res.ok, true);
    });

    const afterBuyout = s.getRareMarketplaceStock();
    assert.equal(afterBuyout.length, 0);

    const refreshAgain = s.refreshRareMarketplace(false);
    assert.equal(refreshAgain.length, 0);
    const savedOffers = (((s.gameState.economy || {}).market || {}).rare || {}).offers || [];
    assert.ok(savedOffers.length >= 4);
    assert.ok(savedOffers.every((offer) => offer.purchased === true));
});

test('suspiciousAuctionLock blocks modular auction interactions', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    s.gameState.security.suspicious = true;
    s.gameState.economy.inventory.food.kibbleBag = 2;
    writeAuctionData(s, {
        listings: [{
            id: 'l2',
            sellerSlot: 'slotB',
            sellerPlayerId: 'pid_other',
            sellerProfileId: 'pid_other',
            itemType: 'food',
            itemId: 'kibbleBag',
            quantity: 1,
            price: 10,
            createdAt: s.__nowRef.value,
            expiresAt: s.__nowRef.value + 100000
        }],
        wallets: { slotA: 20 },
        profileWallets: { pid_alpha: 30 }
    });

    assert.equal(s.createAuctionListing('food', 'kibbleBag', 1, 20).reason, 'auction-locked-suspicious');
    assert.equal(s.buyAuctionListing('l2').reason, 'auction-locked-suspicious');
    assert.equal(s.cancelAuctionListing('l2').reason, 'auction-locked-suspicious');
    assert.equal(s.claimAuctionEarnings().reason, 'auction-locked-suspicious');
});

test('wealth-pressure valuation includes previously omitted buckets and auction wallets', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    s.gameState.economy.inventory.food.kibbleBag = 4;
    s.gameState.economy.inventory.toys.squeakyBall = 3;
    s.gameState.economy.inventory.medicine.medKit = 2;
    s.gameState.economy.inventory.seeds.carrot = 6;
    writeAuctionData(s, { listings: [], wallets: { slotA: 40 }, profileWallets: { pid_alpha: 60 } });

    const total = s.estimateTradableInventoryValue();
    assert.ok(total >= 100, `expected valuation to include omitted buckets + wallets, got ${total}`);
});

test('claimAuctionEarnings preserves value under rate limiting and tracks withheld amount', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    s.gameState.economy.coins = 0;
    s.gameState.security.coinGainMinute = { windowStart: s.__nowRef.value, earned: 5000 };
    s.gameState.security.coinGainSession = { earned: 5000 };
    writeAuctionData(s, { listings: [], wallets: { slotA: 150 }, profileWallets: { pid_alpha: 250 } });

    const result = s.claimAuctionEarnings();
    assert.equal(result.ok, true);
    const gross = result.claimedGross;
    const credited = result.amount;
    const withheld = result.withheld;
    assert.equal(credited + withheld, gross);
    assert.equal(s.gameState.economy.auction.auctionEarningsWithheld, withheld);
    const stored = readAuctionData(s);
    assert.equal(stored.wallets.slotA || 0, 0);
    assert.equal((stored.profileWallets || {}).pid_alpha || 0, 0);
});

test('hardened day key freezes under suspicious state despite local clock/day changes', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    const trusted = s.getHardenedEconomyDayKey();
    s.gameState.security.suspicious = true;
    s.__nowRef.value += 2 * 24 * 60 * 60 * 1000;
    const frozen = s.getHardenedEconomyDayKey();
    assert.equal(frozen, trusted);
});

test('relist fee escalation increases listing fee within configured window', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    s.gameState.economy.coins = 1000;
    s.gameState.economy.inventory.food.kibbleBag = 2;

    const first = s.createAuctionListing('food', 'kibbleBag', 1, 100);
    assert.equal(first.ok, true);
    assert.equal(first.listingFee, 3);
    const cancel = s.cancelAuctionListing(first.listing.id);
    assert.equal(cancel.ok, true);
    s.gameState.economy.inventory.food.kibbleBag = 1;

    const second = s.createAuctionListing('food', 'kibbleBag', 1, 100);
    assert.equal(second.ok, true);
    assert.ok(second.listingFee > first.listingFee, `expected relist escalation, got ${second.listingFee} <= ${first.listingFee}`);
});

test('expired listings are marked and blocked from purchase', () => {
    const s = createEconomySandbox();
    s.ensureEconomyState();
    writeAuctionData(s, {
        listings: [{
            id: 'expired1',
            sellerSlot: 'slotB',
            sellerPlayerId: 'pid_other',
            sellerProfileId: 'pid_other',
            itemType: 'food',
            itemId: 'kibbleBag',
            quantity: 1,
            price: 10,
            createdAt: s.__nowRef.value - (3 * 24 * 60 * 60 * 1000),
            expiresAt: s.__nowRef.value - 1000
        }],
        wallets: {},
        profileWallets: {}
    });

    const snap = s.getAuctionHouseSnapshot();
    const row = snap.listings.find((l) => l.id === 'expired1');
    assert.equal(row.isExpired, true);
    const buy = s.buyAuctionListing('expired1');
    assert.equal(buy.ok, false);
    assert.equal(buy.reason, 'listing-expired');
});

test('loot sell base prices vary for same rarity via item-level sell bands', () => {
    const s = createEconomySandbox();
    const shell = s.getLootSellBasePrice('shell');
    const ember = s.getLootSellBasePrice('emberStone');
    assert.notEqual(shell, ember);
    assert.equal(s.EXPLORATION_LOOT.shell.rarity, 'common');
    assert.equal(s.EXPLORATION_LOOT.emberStone.rarity, 'common');
});
