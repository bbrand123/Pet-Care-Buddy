// ============================================================
// rooms.js  — Room definitions, weather system, room cosmetics,
//             upgrade costs & bonus helper functions
// Extracted from constants.js
// ============================================================

// ==================== WEATHER SYSTEM ====================

const WEATHER_TYPES = {
    sunny: {
        name: 'Sunny',
        icon: '☀️',
        moodBonus: 5,
        happinessDecayModifier: 0,
        energyDecayModifier: 0,
        cleanlinessDecayModifier: 0,
        messages: [
            'loves the sunny weather!',
            'is soaking up the sunshine!',
            'is basking in the warm sun!'
        ]
    },
    rainy: {
        name: 'Rainy',
        icon: '🌧️',
        moodBonus: -5,
        happinessDecayModifier: 1,
        energyDecayModifier: 0,
        cleanlinessDecayModifier: 1,
        messages: [
            'doesn\'t love the rain...',
            'is a bit gloomy from the rain.',
            'wants to stay dry inside.'
        ]
    },
    snowy: {
        name: 'Snowy',
        icon: '🌨️',
        moodBonus: -3,
        happinessDecayModifier: 0,
        energyDecayModifier: 1,
        cleanlinessDecayModifier: 0,
        messages: [
            'is watching the snowflakes!',
            'shivers a little in the snow.',
            'thinks the snow is pretty!'
        ]
    }
};

const WEATHER_CHANGE_INTERVAL = 300000; // Check for weather change every 5 minutes

// ==================== ROOMS ====================

const ROOMS = {
    bedroom: {
        name: 'Bedroom',
        icon: '🛏️',
        isOutdoor: false,
        unlockRule: { type: 'default' },
        ground: { color1: '#8D6E63', color2: '#6D4C41' },
        decorEmoji: '🛏️ 🧸 🌙',
        nightDecorEmoji: '🛏️ 🧸 💤',
        bgDay: 'linear-gradient(180deg, #E8D5B7 0%, #F5E6CC 50%, #DCC8A0 100%)',
        bgNight: 'linear-gradient(180deg, #3E2723 0%, #4E342E 50%, #5D4037 100%)',
        bgSunset: 'linear-gradient(180deg, #D7CCC8 0%, #EFEBE9 50%, #DCC8A0 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 50%, #DCC8A0 100%)',
        bonus: { action: 'sleep', multiplier: 1.18, label: 'Sleep' }
    },
    kitchen: {
        name: 'Kitchen',
        icon: '🍳',
        isOutdoor: false,
        unlockRule: { type: 'default' },
        ground: { color1: '#BDBDBD', color2: '#9E9E9E' },
        decorEmoji: '🍳 🧁 🍎',
        nightDecorEmoji: '🍳 🧁 🍪',
        bgDay: 'linear-gradient(180deg, #FFF9C4 0%, #FFFDE7 50%, #FFF59D 100%)',
        bgNight: 'linear-gradient(180deg, #33302A 0%, #3E3A32 50%, #4A4538 100%)',
        bgSunset: 'linear-gradient(180deg, #FFE0B2 0%, #FFF8E1 50%, #FFF59D 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFF8E1 0%, #FFFDE7 50%, #FFF59D 100%)',
        bonus: { action: 'feed', multiplier: 1.18, label: 'Feed' }
    },
    bathroom: {
        name: 'Bathroom',
        icon: '🛁',
        isOutdoor: false,
        unlockRule: { type: 'default' },
        ground: { color1: '#80DEEA', color2: '#4DD0E1' },
        decorEmoji: '🛁 🧴 🫧',
        nightDecorEmoji: '🛁 🧴 🌊',
        bgDay: 'linear-gradient(180deg, #E0F7FA 0%, #B2EBF2 50%, #80DEEA 100%)',
        bgNight: 'linear-gradient(180deg, #1A3A3A 0%, #1E4D4D 50%, #1B3F3F 100%)',
        bgSunset: 'linear-gradient(180deg, #B2EBF2 0%, #E0F7FA 50%, #80DEEA 100%)',
        bgSunrise: 'linear-gradient(180deg, #E0F7FA 0%, #B2EBF2 50%, #80DEEA 100%)',
        bonus: { action: 'wash', multiplier: 1.18, label: 'Wash' }
    },
    backyard: {
        name: 'Backyard',
        icon: '🏡',
        isOutdoor: true,
        unlockRule: { type: 'default' },
        ground: { color1: '#7CB342', color2: '#558B2F' },
        decorEmoji: '🌻 🦋 🌿',
        nightDecorEmoji: '🌿 🦗 🌿',
        bgDay: 'linear-gradient(180deg, #87CEEB 0%, #98FB98 100%)',
        bgNight: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        bgSunset: 'linear-gradient(180deg, #FF7E5F 0%, #FEB47B 50%, #98FB98 100%)',
        bgSunrise: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #98FB98 100%)',
        bonus: { action: 'exercise', multiplier: 1.18, label: 'Exercise' }
    },
    park: {
        name: 'Park',
        icon: '🌳',
        isOutdoor: true,
        unlockRule: { type: 'careActions', count: 12, text: 'Care for your pet 12 times' },
        unlockCue: {
            behaviorHint: 'Your pet keeps peeking toward the front gate.',
            roomCue: 'A leash hook appears by the door.',
            uiHint: 'Keep a short routine of care actions to unlock park walks.'
        },
        ground: { color1: '#66BB6A', color2: '#43A047' },
        decorEmoji: '🌳 🌺 🦆',
        nightDecorEmoji: '🌳 🍃 🦉',
        bgDay: 'linear-gradient(180deg, #64B5F6 0%, #81C784 100%)',
        bgNight: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1A472A 100%)',
        bgSunset: 'linear-gradient(180deg, #FF8A65 0%, #FFB74D 50%, #81C784 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFCCBC 0%, #FFE0B2 50%, #81C784 100%)',
        bonus: { action: 'play', multiplier: 1.18, label: 'Play' }
    },
    garden: {
        name: 'Garden',
        icon: '🌱',
        isOutdoor: true,
        unlockRule: { type: 'careActions', count: 24, text: 'Care for your pet 24 times' },
        unlockCue: {
            behaviorHint: 'Your pet sniffs at seed packets near the window.',
            roomCue: 'A tiny planter sits by the back door.',
            uiHint: 'Mix care actions to help your pet discover the garden.'
        },
        ground: { color1: '#8D6E63', color2: '#6D4C41' },
        decorEmoji: '🌱 🪴 🌿',
        nightDecorEmoji: '🌱 🌙 🌿',
        bgDay: 'linear-gradient(180deg, #87CEEB 0%, #A5D6A7 50%, #81C784 100%)',
        bgNight: 'linear-gradient(180deg, #1a1a2e 0%, #1B3A1B 50%, #0f3460 100%)',
        bgSunset: 'linear-gradient(180deg, #FF7E5F 0%, #FEB47B 50%, #A5D6A7 100%)',
        bgSunrise: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #A5D6A7 100%)',
        bonus: { action: 'groom', multiplier: 1.18, label: 'Groom' }
    },
    library: {
        name: 'Library',
        icon: '📚',
        isOutdoor: false,
        unlockRule: { type: 'careActions', count: 60, text: 'Reach 60 care actions' },
        ground: { color1: '#8D6E63', color2: '#5D4037' },
        decorEmoji: '📚 🪴 🕯️',
        nightDecorEmoji: '📚 🌙 🕯️',
        bgDay: 'linear-gradient(180deg, #EAD7B7 0%, #D7BFA1 50%, #C19A6B 100%)',
        bgNight: 'linear-gradient(180deg, #2E221A 0%, #3C2F23 50%, #4E3C2F 100%)',
        bgSunset: 'linear-gradient(180deg, #E7C8A0 0%, #D9B98C 50%, #C19A6B 100%)',
        bgSunrise: 'linear-gradient(180deg, #F3DFC3 0%, #E6CCAA 50%, #C19A6B 100%)',
        bonus: { action: 'sleep', multiplier: 1.22, label: 'Sleep' }
    },
    arcade: {
        name: 'Arcade',
        icon: '🕹️',
        isOutdoor: false,
        unlockRule: { type: 'careActions', count: 85, text: 'Reach 85 care actions' },
        ground: { color1: '#3949AB', color2: '#1A237E' },
        decorEmoji: '🕹️ 🎮 ✨',
        nightDecorEmoji: '🕹️ 💡 🎮',
        bgDay: 'linear-gradient(180deg, #D1C4E9 0%, #B39DDB 50%, #9575CD 100%)',
        bgNight: 'linear-gradient(180deg, #120C2B 0%, #1F1147 50%, #2A1D6A 100%)',
        bgSunset: 'linear-gradient(180deg, #D8B4FE 0%, #C084FC 50%, #9575CD 100%)',
        bgSunrise: 'linear-gradient(180deg, #E9D5FF 0%, #D8B4FE 50%, #9575CD 100%)',
        bonus: { action: 'play', multiplier: 1.22, label: 'Play' }
    },
    spa: {
        name: 'Spa',
        icon: '🧖',
        isOutdoor: false,
        unlockRule: { type: 'careActions', count: 110, text: 'Reach 110 care actions' },
        ground: { color1: '#80CBC4', color2: '#4DB6AC' },
        decorEmoji: '🧖 🫧 🕯️',
        nightDecorEmoji: '🧖 🌙 🫧',
        bgDay: 'linear-gradient(180deg, #E0F2F1 0%, #B2DFDB 50%, #80CBC4 100%)',
        bgNight: 'linear-gradient(180deg, #1D3735 0%, #25504D 50%, #2D6A65 100%)',
        bgSunset: 'linear-gradient(180deg, #B2DFDB 0%, #A7DCD4 50%, #80CBC4 100%)',
        bgSunrise: 'linear-gradient(180deg, #E8F5F3 0%, #CDEBE8 50%, #80CBC4 100%)',
        bonus: { action: 'wash', multiplier: 1.22, label: 'Wash' }
    },
    observatory: {
        name: 'Observatory',
        icon: '🔭',
        isOutdoor: true,
        unlockRule: { type: 'adultsRaised', count: 2, text: 'Raise 2 adult pets' },
        ground: { color1: '#5C6BC0', color2: '#3949AB' },
        decorEmoji: '🔭 🌤️ ☁️',
        nightDecorEmoji: '🔭 🌌 ✨',
        bgDay: 'linear-gradient(180deg, #90CAF9 0%, #64B5F6 45%, #5C6BC0 100%)',
        bgNight: 'linear-gradient(180deg, #090B24 0%, #151C4A 50%, #22347A 100%)',
        bgSunset: 'linear-gradient(180deg, #FFB199 0%, #A18CD1 50%, #5C6BC0 100%)',
        bgSunrise: 'linear-gradient(180deg, #FAD0C4 0%, #A1C4FD 50%, #5C6BC0 100%)',
        bonus: { action: 'sleep', multiplier: 1.22, label: 'Sleep' }
    },
    workshop: {
        name: 'Workshop',
        icon: '🛠️',
        isOutdoor: false,
        unlockRule: { type: 'adultsRaised', count: 3, text: 'Raise 3 adult pets' },
        ground: { color1: '#8D6E63', color2: '#6D4C41' },
        decorEmoji: '🛠️ ⚙️ 🧰',
        nightDecorEmoji: '🛠️ 🔩 ⚙️',
        bgDay: 'linear-gradient(180deg, #D7CCC8 0%, #BCAAA4 50%, #8D6E63 100%)',
        bgNight: 'linear-gradient(180deg, #2E2723 0%, #3D332E 50%, #5D4A42 100%)',
        bgSunset: 'linear-gradient(180deg, #CBB8A9 0%, #B69F8E 50%, #8D6E63 100%)',
        bgSunrise: 'linear-gradient(180deg, #E3D6CE 0%, #CCB8AD 50%, #8D6E63 100%)',
        bonus: { action: 'exercise', multiplier: 1.22, label: 'Exercise' }
    }
};

const ROOM_ARTIFACT_BLUEPRINTS = {
    bedroom: [
        { id: 'bedroom-first-photo', trigger: 'milestone:child', label: 'First Photo', description: 'A framed snapshot from your early care days.', render: { emoji: '🖼️', layer: 'front' } },
        { id: 'bedroom-growth-plush', trigger: 'milestone:adult', label: 'Keepsake Plush', description: 'A plush toy stitched with your pet\'s initials.', render: { emoji: '🧸', layer: 'front' } },
        { id: 'bedroom-healing-blanket', trigger: 'recovery:stabilizing', label: 'Warm Blanket', description: 'A comfort blanket from the healing arc.', render: { emoji: '🧣', layer: 'front' } }
    ],
    kitchen: [
        { id: 'kitchen-favorite-bowl', trigger: 'milestone:child', label: 'Favorite Bowl', description: 'A bowl decorated with tiny hearts.', render: { emoji: '🥣', layer: 'front' } },
        { id: 'kitchen-family-menu', trigger: 'milestone:adult', label: 'Family Menu', description: 'A handwritten menu of favorite meals.', render: { emoji: '🧾', layer: 'back' } }
    ],
    bathroom: [
        { id: 'bathroom-soft-towels', trigger: 'milestone:child', label: 'Soft Towels', description: 'Fresh towels stacked for gentle care.', render: { emoji: '🧺', layer: 'front' } },
        { id: 'bathroom-repair-kit', trigger: 'recovery:healing', label: 'Care Kit', description: 'A small kit used during recovery days.', render: { emoji: '🧴', layer: 'front' } }
    ],
    backyard: [
        { id: 'backyard-lantern', trigger: 'milestone:adult', label: 'Garden Lantern', description: 'A lantern lights your shared evening routines.', render: { emoji: '🏮', layer: 'back' } },
        { id: 'backyard-rainwear', trigger: 'weather:rainy', label: 'Rain Boots', description: 'Mud-splashed boots from rainy play.', render: { emoji: '🥾', layer: 'front' } }
    ],
    park: [
        { id: 'park-picnic-token', trigger: 'roomUnlock:park', label: 'Picnic Token', description: 'A keepsake from your first unlocked park visit.', render: { emoji: '🧺', layer: 'front' } },
        { id: 'park-bloom-ribbon', trigger: 'season:spring', label: 'Bloom Ribbon', description: 'A ribbon tied during spring walks.', render: { emoji: '🌸', layer: 'back' } }
    ],
    garden: [
        { id: 'garden-first-sprout', trigger: 'roomUnlock:garden', label: 'First Sprout', description: 'The first sprout that never stopped growing.', render: { emoji: '🌱', layer: 'front' } },
        { id: 'garden-winter-lights', trigger: 'season:winter', label: 'Winter Lights', description: 'Seasonal lights hung across the garden fence.', render: { emoji: '✨', layer: 'back' } }
    ],
    library: [
        { id: 'library-first-book', trigger: 'roomUnlock:library', label: 'Favorite Book', description: 'The first book read together in the library.', render: { emoji: '📖', layer: 'front' } },
        { id: 'library-study-lamp', trigger: 'milestone:adult', label: 'Study Lamp', description: 'A lamp that kept the late reading sessions warm.', render: { emoji: '🕯️', layer: 'back' } }
    ],
    arcade: [
        { id: 'arcade-first-token', trigger: 'roomUnlock:arcade', label: 'First Token', description: 'A keepsake token from your first arcade session.', render: { emoji: '🪙', layer: 'front' } },
        { id: 'arcade-high-score', trigger: 'milestone:adult', label: 'High Score Trophy', description: 'A trophy earned from a memorable high score.', render: { emoji: '🏆', layer: 'front' } }
    ],
    spa: [
        { id: 'spa-first-visit', trigger: 'roomUnlock:spa', label: 'Spa Stone', description: 'A smooth stone from your first relaxing spa visit.', render: { emoji: '🪨', layer: 'front' } },
        { id: 'spa-candle', trigger: 'milestone:elder', label: 'Wellness Candle', description: 'A candle lit during a quiet elder care session.', render: { emoji: '🕯️', layer: 'back' } }
    ],
    observatory: [
        { id: 'observatory-first-star', trigger: 'roomUnlock:observatory', label: 'Star Chart', description: 'A chart from the first night of stargazing together.', render: { emoji: '🌌', layer: 'back' } },
        { id: 'observatory-telescope-log', trigger: 'milestone:elder', label: 'Telescope Log', description: 'A worn log of constellations spotted through the years.', render: { emoji: '🔭', layer: 'front' } }
    ],
    workshop: [
        { id: 'workshop-first-craft', trigger: 'roomUnlock:workshop', label: 'First Blueprint', description: 'A blueprint from the very first workshop project.', render: { emoji: '📐', layer: 'front' } },
        { id: 'workshop-tool-set', trigger: 'milestone:adult', label: 'Tool Set', description: 'A small set of tools collected over many crafting sessions.', render: { emoji: '🛠️', layer: 'back' } }
    ]
};

const ROOM_WALLPAPERS = {
    classic: { name: 'Classic', bg: 'none' },
    floral: { name: 'Floral', bg: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.24), transparent 24%), radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.2), transparent 20%)' },
    stripes: { name: 'Stripes', bg: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 10px, rgba(255,255,255,0.08) 10px 20px)' },
    stars: { name: 'Stars', bg: 'radial-gradient(circle at 16% 18%, rgba(255,255,255,0.35) 0 2px, transparent 2px), radial-gradient(circle at 72% 42%, rgba(255,255,255,0.28) 0 2px, transparent 2px), radial-gradient(circle at 45% 10%, rgba(255,255,255,0.3) 0 2px, transparent 2px)' },
    mosaic: { name: 'Mosaic', bg: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 8px, rgba(0,0,0,0.05) 8px 16px)' }
};

const ROOM_FLOORINGS = {
    natural: { name: 'Natural', bg: 'none' },
    hardwood: { name: 'Hardwood', bg: 'repeating-linear-gradient(90deg, rgba(70, 42, 24, 0.34) 0 16px, rgba(96, 61, 38, 0.24) 16px 32px)' },
    tile: { name: 'Tile', bg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.26) 0 2px, transparent 2px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.26) 0 2px, transparent 2px 28px)' },
    stone: { name: 'Stone', bg: 'radial-gradient(circle at 24% 40%, rgba(255,255,255,0.18), transparent 30%), radial-gradient(circle at 72% 60%, rgba(0,0,0,0.08), transparent 28%)' },
    carpet: { name: 'Carpet', bg: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))' }
};

const ROOM_FURNITURE_ITEMS = {
    none: { name: 'None', emoji: '❌' },
    plant: { name: 'Plant', emoji: '🪴' },
    lamp: { name: 'Lamp', emoji: '🛋️' },
    shelf: { name: 'Shelf', emoji: '🗄️' },
    toyChest: { name: 'Toy Chest', emoji: '🧸' },
    desk: { name: 'Desk', emoji: '🪑' },
    arcadeCabinet: { name: 'Arcade', emoji: '🕹️' },
    telescope: { name: 'Telescope', emoji: '🔭' },
    workbench: { name: 'Workbench', emoji: '🛠️' },
    hotTub: { name: 'Hot Tub', emoji: '♨️' }
};

const ROOM_THEMES = {
    auto: { name: 'Auto' },
    default: { name: 'Default' },
    aquarium: { name: 'Aquarium' },
    nest: { name: 'Nest' }
};

const ROOM_UPGRADE_COSTS = [150, 260, 420];
const MAX_ROOM_UPGRADE_LEVEL = ROOM_UPGRADE_COSTS.length;
const ROOM_UPGRADE_BONUS_STEPS = [0, 0.05, 0.09, 0.12];

function getRoomUpgradeLevel(roomId) {
    try {
        if (typeof gameState === 'undefined' || !gameState || typeof gameState.roomUpgrades !== 'object') return 0;
        const lvl = Number(gameState.roomUpgrades[roomId] || 0);
        if (!Number.isFinite(lvl)) return 0;
        return Math.max(0, Math.floor(lvl));
    } catch (e) {
        return 0;
    }
}

function getRoomBonusMultiplierForRoom(roomId, action) {
    const room = ROOMS[roomId];
    if (!room || !room.bonus || room.bonus.action !== action) return 1.0;
    const upgradeLevel = getRoomUpgradeLevel(roomId);
    const step = ROOM_UPGRADE_BONUS_STEPS[Math.max(0, Math.min(upgradeLevel, ROOM_UPGRADE_BONUS_STEPS.length - 1))] || 0;
    return room.bonus.multiplier + step;
}

function getRoomBonusLabel(roomId) {
    const room = ROOMS[roomId];
    if (!room || !room.bonus) return 'No bonus';
    const mult = getRoomBonusMultiplierForRoom(roomId, room.bonus.action);
    const pct = Math.round((mult - 1) * 100);
    return `+${pct}% ${room.bonus.label}`;
}

// Room bonus helper
function getRoomBonus(action) {
    const currentRoom = (typeof gameState !== 'undefined' && gameState && gameState.currentRoom) ? gameState.currentRoom : 'bedroom';
    return getRoomBonusMultiplierForRoom(currentRoom, action);
}

const ROOM_IDS = Object.keys(ROOMS);
