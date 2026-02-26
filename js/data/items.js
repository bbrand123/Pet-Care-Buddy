// ============================================================
// items.js  — Furniture, garden crops, economy, shop items,
//             crafting, prestige purchases & seasonal availability
// Extracted from constants.js
// ============================================================

// ==================== FURNITURE ====================

const FURNITURE = {
    beds: {
        basic: { name: 'Basic Bed', emoji: '🛏️', description: 'A simple comfy bed' },
        plushy: { name: 'Plushy Bed', emoji: '🎀', description: 'A super soft bed' },
        royal: { name: 'Royal Bed', emoji: '👑', description: 'Fit for royalty' },
        cozy: { name: 'Cozy Nest', emoji: '🪺', description: 'A warm cozy nest' }
    },
    decorations: {
        none: { name: 'None', emoji: '', description: 'No decoration' },
        plants: { name: 'Plants', emoji: '🪴', description: 'Fresh greenery' },
        balloons: { name: 'Balloons', emoji: '🎈', description: 'Festive balloons' },
        lights: { name: 'Fairy Lights', emoji: '✨', description: 'Magical lighting' },
        toys: { name: 'Toy Box', emoji: '🧸', description: 'Fun toys' }
    }
};

// ==================== GARDEN SYSTEM ====================

const GARDEN_CROPS = {
    carrot: {
        name: 'Carrot',
        seedEmoji: '🥕',
        stages: ['🟫', '🌱', '🌿', '🥕'],
        growTime: 3, // grow ticks needed per stage
        hungerValue: 15,
        happinessValue: 5,
        energyValue: 0,
        seasonBonus: ['spring', 'autumn']
    },
    tomato: {
        name: 'Tomato',
        seedEmoji: '🍅',
        stages: ['🟫', '🌱', '🌿', '🍅'],
        growTime: 4,
        hungerValue: 18,
        happinessValue: 8,
        energyValue: 0,
        seasonBonus: ['summer']
    },
    strawberry: {
        name: 'Strawberry',
        seedEmoji: '🍓',
        stages: ['🟫', '🌱', '🌿', '🍓'],
        growTime: 5,
        hungerValue: 20,
        happinessValue: 12,
        energyValue: 0,
        harvestCoinBonus: 2,
        seasonBonus: ['spring', 'summer']
    },
    pumpkin: {
        name: 'Pumpkin',
        seedEmoji: '🎃',
        stages: ['🟫', '🌱', '🌿', '🎃'],
        growTime: 6,
        hungerValue: 25,
        happinessValue: 10,
        energyValue: 0,
        harvestCoinBonus: 7,
        seasonBonus: ['autumn']
    },
    sunflower: {
        name: 'Sunflower',
        seedEmoji: '🌻',
        stages: ['🟫', '🌱', '🌿', '🌻'],
        growTime: 4,
        hungerValue: 5,
        happinessValue: 20,
        energyValue: 0,
        seasonBonus: ['summer', 'spring']
    },
    apple: {
        name: 'Apple',
        seedEmoji: '🍎',
        stages: ['🟫', '🌱', '🌳', '🍎'],
        growTime: 7,
        hungerValue: 10,
        happinessValue: 0,
        energyValue: 15,
        harvestCoinBonus: 9,
        seasonBonus: ['autumn']
    }
};

// ==================== ECONOMY & TRADING ====================

const ECONOMY_BALANCE = {
    // Price side
    shopPriceMultiplier: 0.92,
    rareMarketPriceMultiplier: 0.9,
    mysteryEggPriceMultiplier: 0.85,
    sellPriceMultiplier: 0.88,
    // Reward side
    minigameRewardMultiplier: 0.88,
    harvestRewardMultiplier: 0.82,
    dailyCompletionReward: 70,
    minigameRewardCap: 74,
    // Rec 1: Daily minigame earning cap to prevent unlimited grinding
    dailyMinigameEarningsCap: 350,
    // Rec 3: Auction transaction tax (percentage taken from sale proceeds)
    auctionTransactionTaxRate: 0.08,
    // Rec 4: Auction listing fee (percentage of listing price, non-refundable)
    auctionListingFeeRate: 0.03,
    // Rec 5: Item durability — toys/accessories lose durability on use, need repair
    toyDurabilityMax: 10,
    accessoryDurabilityMax: 15,
    durabilityRepairCostBase: 8,
    // Rec 7: Narrowed volatility window (was 0.86 + hash%33/100 = 86%-119%)
    volatilityMin: 0.92,
    volatilityRange: 16, // 92%-108%
    // Rec 8: Per-slot auction listing cap
    auctionPerSlotListingCap: 12,
    // Rec 11: Coin decay — daily tax on balances above threshold
    coinDecayThreshold: 600,          // was 1000 — Fix 9: lower onset for meaningful pressure
    coinDecayRate: 0.018,             // was 0.005 — Fix 9: 1.8% daily instead of 0.5%
    coinDecayProtectedWallet: 350     // was 450 (implicit threshold*0.45) — Fix 9
};

const ECONOMY_SHOP_ITEMS = {
    food: {
        kibbleBag: {
            id: 'kibbleBag',
            name: 'Kibble Bag',
            emoji: '🥣',
            basePrice: 26,
            effects: { hunger: 18, happiness: 2 },
            description: 'Reliable daily pet food.'
        },
        veggieMix: {
            id: 'veggieMix',
            name: 'Veggie Mix',
            emoji: '🥗',
            basePrice: 32,
            effects: { hunger: 16, happiness: 6, energy: 3 },
            description: 'Fresh veggies for extra pep.'
        },
        deluxePlatter: {
            id: 'deluxePlatter',
            name: 'Deluxe Platter',
            emoji: '🍱',
            basePrice: 58,
            effects: { hunger: 28, happiness: 10, energy: 5 },
            description: 'Premium meal with strong stat boosts.',
            rarity: 'rare'
        }
    },
    toys: {
        squeakyBall: {
            id: 'squeakyBall',
            name: 'Squeaky Ball',
            emoji: '🟠',
            basePrice: 34,
            effects: { happiness: 18, energy: -3 },
            description: 'Classic toy for quick play.'
        },
        puzzleCube: {
            id: 'puzzleCube',
            name: 'Puzzle Cube',
            emoji: '🧩',
            basePrice: 48,
            effects: { happiness: 14, energy: -1, hunger: -2 },
            description: 'Brain game toy that keeps pets engaged.'
        },
        cometFrisbee: {
            id: 'cometFrisbee',
            name: 'Comet Frisbee',
            emoji: '🥏',
            basePrice: 64,
            effects: { happiness: 22, energy: -6, hunger: -3 },
            description: 'High-energy play gear.',
            rarity: 'rare'
        }
    },
    medicine: {
        herbalDrops: {
            id: 'herbalDrops',
            name: 'Herbal Drops',
            emoji: '🧪',
            basePrice: 42,
            effects: { hunger: 6, cleanliness: 8, happiness: 10, energy: 8 },
            description: 'Gentle daily care medicine.'
        },
        medKit: {
            id: 'medKit',
            name: 'Pet Med Kit',
            emoji: '🩹',
            basePrice: 76,
            effects: { hunger: 12, cleanliness: 14, happiness: 15, energy: 14 },
            description: 'Strong all-stat recovery.',
            rarity: 'rare'
        }
    },
    accessories: {
        ribbonBow: {
            id: 'ribbonBow',
            name: 'Ribbon Bow',
            emoji: '🎀',
            basePrice: 52,
            accessoryId: 'ribbonBow',
            description: 'A bright show-time bow.'
        },
        sunglasses: {
            id: 'sunglasses',
            name: 'Sunglasses',
            emoji: '🕶️',
            basePrice: 72,
            accessoryId: 'sunglasses',
            description: 'Stylish cool-weather shades.'
        },
        wizardHat: {
            id: 'wizardHat',
            name: 'Wizard Hat',
            emoji: '🧙',
            basePrice: 110,
            accessoryId: 'wizard',
            description: 'Rare magical headwear.',
            rarity: 'rare'
        },
        // Feature 11: Seasonal cosmetic pack
        winterScarf: {
            id: 'winterScarf',
            name: 'Winter Scarf',
            emoji: '🧣',
            basePrice: 65,
            accessoryId: 'winterScarf',
            description: 'A cozy scarf for cold days.',
            season: 'winter'
        },
        summerShades: {
            id: 'summerShades',
            name: 'Summer Shades',
            emoji: '😎',
            basePrice: 55,
            accessoryId: 'summerShades',
            description: 'Cool reflective shades for hot days.',
            season: 'summer'
        },
        fallLeafCrown: {
            id: 'fallLeafCrown',
            name: 'Leaf Crown',
            emoji: '🍂',
            basePrice: 70,
            accessoryId: 'fallLeafCrown',
            description: 'A rustic crown woven from autumn leaves.',
            season: 'autumn'
        },
        springFlowerCrown: {
            id: 'springFlowerCrown',
            name: 'Flower Crown',
            emoji: '🌸',
            basePrice: 60,
            accessoryId: 'springFlowerCrown',
            description: 'A delicate crown of spring blossoms.',
            season: 'spring'
        }
    },
    seeds: {
        carrotSeeds: {
            id: 'carrotSeeds',
            name: 'Carrot Seeds',
            emoji: '🥕',
            basePrice: 14,
            cropId: 'carrot',
            quantity: 3,
            description: 'Fast-growing starter seeds.'
        },
        tomatoSeeds: {
            id: 'tomatoSeeds',
            name: 'Tomato Seeds',
            emoji: '🍅',
            basePrice: 18,
            cropId: 'tomato',
            quantity: 3,
            description: 'Balanced growth and rewards.'
        },
        strawberrySeeds: {
            id: 'strawberrySeeds',
            name: 'Strawberry Seeds',
            emoji: '🍓',
            basePrice: 24,
            cropId: 'strawberry',
            quantity: 2,
            description: 'Sweet crop with strong happiness boost.'
        },
        pumpkinSeeds: {
            id: 'pumpkinSeeds',
            name: 'Pumpkin Seeds',
            emoji: '🎃',
            basePrice: 28,
            cropId: 'pumpkin',
            quantity: 2,
            description: 'Hearty seasonal harvest seeds.'
        },
        sunflowerSeeds: {
            id: 'sunflowerSeeds',
            name: 'Sunflower Seeds',
            emoji: '🌻',
            basePrice: 19,
            cropId: 'sunflower',
            quantity: 3,
            description: 'Mood-boosting flower seeds.'
        },
        appleSeeds: {
            id: 'appleSeeds',
            name: 'Apple Seeds',
            emoji: '🍎',
            basePrice: 32,
            cropId: 'apple',
            quantity: 2,
            description: 'Slow but high-value tree seeds.'
        }
    },
    decorations: {
        plantDecor: {
            id: 'plantDecor',
            name: 'Plant Decor Kit',
            emoji: '🪴',
            basePrice: 48,
            decorationId: 'plants',
            description: 'Natural room accents.'
        },
        balloonDecor: {
            id: 'balloonDecor',
            name: 'Balloon Decor Kit',
            emoji: '🎈',
            basePrice: 54,
            decorationId: 'balloons',
            description: 'Party-ready room style.'
        },
        lightDecor: {
            id: 'lightDecor',
            name: 'Fairy Light Kit',
            emoji: '✨',
            basePrice: 62,
            decorationId: 'lights',
            description: 'Soft glowing ambient lights.'
        },
        toyDecor: {
            id: 'toyDecor',
            name: 'Toy Box Decor',
            emoji: '🧸',
            basePrice: 58,
            decorationId: 'toys',
            description: 'Playful room atmosphere.'
        }
    }
};

const ECONOMY_RARE_MARKET_POOL = [
    { id: 'rare_stardust', kind: 'loot', itemId: 'stardust', quantity: 1, basePrice: 168, rarity: 'rare' },
    { id: 'rare_rune', kind: 'loot', itemId: 'runeFragment', quantity: 1, basePrice: 154, rarity: 'rare' },
    { id: 'rare_pearl', kind: 'loot', itemId: 'tidePearl', quantity: 1, basePrice: 132, rarity: 'rare' },
    { id: 'rare_map', kind: 'loot', itemId: 'mysteryMap', quantity: 1, basePrice: 145, rarity: 'rare' },
    { id: 'rare_hat', kind: 'accessory', itemId: 'wizardHat', quantity: 1, basePrice: 190, rarity: 'rare' },
    { id: 'rare_food', kind: 'food', itemId: 'deluxePlatter', quantity: 2, basePrice: 118, rarity: 'rare' },
    { id: 'rare_med', kind: 'medicine', itemId: 'medKit', quantity: 1, basePrice: 145, rarity: 'rare' },
    { id: 'rare_seed_bundle', kind: 'seed', itemId: 'appleSeeds', quantity: 4, basePrice: 98, rarity: 'rare' },
    { id: 'rare_decor', kind: 'decoration', itemId: 'lightDecor', quantity: 1, basePrice: 136, rarity: 'rare' }
];

const CRAFTED_ITEMS = {
    heartyStew: {
        id: 'heartyStew',
        name: 'Hearty Stew',
        emoji: '🥘',
        category: 'food',
        effects: { hunger: 30, happiness: 8, energy: 6 },
        description: 'Crafted warm meal from fresh crops.'
    },
    glowTonic: {
        id: 'glowTonic',
        name: 'Glow Tonic',
        emoji: '🧴',
        category: 'medicine',
        effects: { hunger: 4, happiness: 12, energy: 10, cleanliness: 4 }, // was: hunger:10, cleanliness:16, happiness:14, energy:12
        description: 'Handmade medicine infused with exploration finds.'
    },
    adventureToy: {
        id: 'adventureToy',
        name: 'Adventure Toy',
        emoji: '🧸',
        category: 'toys',
        effects: { happiness: 26, energy: -5, hunger: -3 },
        description: 'Crafted toy from treasure scraps and farm goods.'
    }
};

const CRAFTING_RECIPES = {
    heartyStewRecipe: {
        id: 'heartyStewRecipe',
        name: 'Hearty Stew',
        emoji: '🥘',
        outputType: 'crafted',
        outputId: 'heartyStew',
        outputCount: 1,
        // Rec 9: Rebalanced from 12 to 28 (closer to 50% of Deluxe Platter's 58 value)
        craftCost: 28,
        ingredients: [
            { source: 'crop', id: 'carrot', count: 1 },
            { source: 'crop', id: 'tomato', count: 1 },
            { source: 'crop', id: 'pumpkin', count: 1 }
        ]
    },
    glowTonicRecipe: {
        id: 'glowTonicRecipe',
        name: 'Glow Tonic',
        emoji: '🧴',
        outputType: 'crafted',
        outputId: 'glowTonic',
        outputCount: 1,
        // Rec 9: Rebalanced from 16 to 34; Fix 5: increased to 50 (focused mood/energy item, not all-stats)
        craftCost: 50, // was 34
        ingredients: [
            { source: 'crop', id: 'strawberry', count: 1 },
            { source: 'loot', id: 'glowMushroom', count: 1 },
            { source: 'loot', id: 'ancientCoin', count: 1 }
        ]
    },
    adventureToyRecipe: {
        id: 'adventureToyRecipe',
        name: 'Adventure Toy',
        emoji: '🧸',
        outputType: 'crafted',
        outputId: 'adventureToy',
        outputCount: 1,
        // Rec 9: Rebalanced from 20 to 30 (closer to 47% of Comet Frisbee's 64 value)
        craftCost: 30,
        ingredients: [
            { source: 'loot', id: 'forestCharm', count: 1 },
            { source: 'loot', id: 'cloudRibbon', count: 1 },
            { source: 'crop', id: 'sunflower', count: 1 }
        ]
    },
    ribbonAccessoryRecipe: {
        id: 'ribbonAccessoryRecipe',
        name: 'Ribbon Bow Accessory',
        emoji: '🎀',
        outputType: 'accessory',
        outputId: 'ribbonBow',
        outputCount: 1,
        // Rec 9: Rebalanced from 22 to 26 (closer to 50% of Ribbon Bow's 52 value)
        craftCost: 26,
        ingredients: [
            { source: 'loot', id: 'stardust', count: 1 },
            { source: 'loot', id: 'forestCharm', count: 1 },
            { source: 'crop', id: 'apple', count: 1 }
        ]
    }
};

const ECONOMY_AUCTION_SLOTS = ['slotA', 'slotB', 'slotC'];

// Rec 6: High-value prestige sinks — late-game aspirational purchases
const PRESTIGE_PURCHASES = {
    gardenExpansion: {
        id: 'gardenExpansion',
        name: 'Garden Plot Expansion',
        emoji: '🌿',
        description: 'Unlock 2 additional garden plots beyond the standard 6.',
        cost: 800,
        maxOwned: 1,
        category: 'garden'
    },
    premiumNursery: {
        id: 'premiumNursery',
        name: 'Premium Nursery',
        emoji: '🏠',
        description: 'Increase max pet capacity by 1 (up to 5 pets).',
        cost: 1200,
        maxOwned: 1,
        category: 'pets'
    },
    goldenFeeder: {
        id: 'goldenFeeder',
        name: 'Golden Feeder',
        emoji: '🥇',
        description: 'All food items give +15% bonus effects permanently.',
        cost: 600,
        maxOwned: 1,
        category: 'boost'
    },
    masterCrafterBench: {
        id: 'masterCrafterBench',
        name: 'Master Crafter Bench',
        emoji: '🔨',
        description: 'All crafting costs reduced by 25% permanently.',
        cost: 500,
        maxOwned: 1,
        category: 'crafting'
    },
    luxuryRoomUpgrade: {
        id: 'luxuryRoomUpgrade',
        name: 'Luxury Room Upgrade',
        emoji: '🏰',
        description: 'Unlock a 4th upgrade tier for all rooms (+16% bonus).',
        cost: 1500,
        maxOwned: 1,
        category: 'rooms'
    },
    petSpa: {
        id: 'petSpa',
        name: 'Pet Spa Pass',
        emoji: '💆',
        description: 'Unlock passive cleanliness decay reduction (-20%).',
        cost: 700,
        maxOwned: 1,
        category: 'boost'
    },
    expeditionGuild: {
        id: 'expeditionGuild',
        name: 'Expedition Guild Card',
        emoji: '🗺️',
        description: 'All expeditions yield +20% more loot.',
        cost: 900,
        maxOwned: 1,
        category: 'exploration'
    },
    cosmeticChest: {
        id: 'cosmeticChest',
        name: 'Rare Cosmetic Chest',
        emoji: '👑',
        description: 'Unlock an exclusive pet accessory set (Crown, Cape, Monocle).',
        cost: 2000,
        maxOwned: 1,
        category: 'cosmetic'
    },
    // Fix 10: Repeatable late-game coin sinks
    vitalityBoost: {
        id: 'vitalityBoost',
        name: 'Vitality Boost',
        emoji: '💪',
        description: 'All pet stat decay rates reduced by 15% for 24 hours.',
        cost: 350,
        maxOwned: null, // unlimited repurchases
        consumable: true,
        category: 'boost',
        activeUntil: null // TODO: wire active effect
    },
    luckyDay: {
        id: 'luckyDay',
        name: 'Lucky Day',
        emoji: '🍀',
        description: 'All coin rewards increased by 20% for the next 60 minutes.',
        cost: 500,
        maxOwned: null, // unlimited repurchases
        consumable: true,
        category: 'boost',
        activeUntil: null // TODO: wire active effect
    }
};

// Rec 10: Seasonal item rotation — items only available in specific seasons
const SEASONAL_SHOP_AVAILABILITY = {
    // Food
    kibbleBag: ['spring', 'summer', 'autumn', 'winter'], // Always available (staple)
    veggieMix: ['spring', 'summer', 'autumn'], // Not in winter
    deluxePlatter: ['summer', 'winter'], // Special occasion food
    // Toys
    squeakyBall: ['spring', 'summer', 'autumn', 'winter'], // Always available (staple)
    puzzleCube: ['autumn', 'winter'], // Indoor activity seasons
    cometFrisbee: ['spring', 'summer'], // Outdoor seasons only
    // Medicine
    herbalDrops: ['spring', 'summer', 'autumn', 'winter'], // Always available (essential)
    medKit: ['autumn', 'winter'], // Sick season availability
    // Seeds
    carrotSeeds: ['spring', 'autumn'],
    tomatoSeeds: ['spring', 'summer'],
    strawberrySeeds: ['spring', 'summer'],
    pumpkinSeeds: ['autumn'],
    sunflowerSeeds: ['spring', 'summer'],
    appleSeeds: ['summer', 'autumn'],
    // Accessories — always available
    ribbonBow: ['spring', 'summer', 'autumn', 'winter'],
    sunglasses: ['spring', 'summer'],
    wizardHat: ['autumn', 'winter'],
    // Feature 11: Seasonal cosmetic pack — each exclusive to its season
    winterScarf: ['winter'],
    summerShades: ['summer'],
    fallLeafCrown: ['autumn'],
    springFlowerCrown: ['spring'],
    // Decorations
    plantDecor: ['spring', 'summer'],
    balloonDecor: ['spring', 'summer', 'autumn', 'winter'],
    lightDecor: ['autumn', 'winter'],
    toyDecor: ['spring', 'summer', 'autumn', 'winter']
};

const MAX_GARDEN_PLOTS = 6;

// Progressive plot unlocking thresholds (harvests needed for each plot)
// Plot 1 is free, then unlock at 2, 5, 10, 16, 24 total harvests
const GARDEN_PLOT_UNLOCK_THRESHOLDS = [0, 2, 5, 10, 16, 24];
