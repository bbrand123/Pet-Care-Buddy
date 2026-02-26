// ============================================================
// achievements.js  — Achievements, daily checklist, badges,
//                    stickers, trophies & daily streaks
// Extracted from constants.js
// ============================================================

// ==================== ACHIEVEMENTS ====================

const ACHIEVEMENTS = {
    firstFeed: { id: 'firstFeed', name: 'First Meal', icon: '🍎', description: 'Feed your pet for the first time', check: (gs) => (gs.pet && (gs.totalFeedCount || 0) >= 1) },
    firstHarvest: { id: 'firstHarvest', name: 'Green Thumb', icon: '🌱', description: 'Harvest your first crop', check: (gs) => (gs.garden && gs.garden.totalHarvests >= 1) },
    fiveHarvests: { id: 'fiveHarvests', name: 'Farmer', icon: '🧑‍🌾', description: 'Harvest 5 crops', check: (gs) => (gs.garden && gs.garden.totalHarvests >= 5) },
    tenCareActions: { id: 'tenCareActions', name: 'Caring Heart', icon: '💝', description: 'Perform 10 care actions', check: (gs) => (gs.pet && gs.pet.careActions >= 10) },
    fiftyCareActions: { id: 'fiftyCareActions', name: 'Devoted Caretaker', icon: '🏅', description: 'Perform 50 care actions', check: (gs) => (gs.pet && gs.pet.careActions >= 50) },
    raiseChild: { id: 'raiseChild', name: 'Growing Up', icon: '🌱', description: 'Raise a pet to Child stage', check: (gs) => (gs.pet && gs.pet.growthStage !== 'baby') },
    raiseAdult: { id: 'raiseAdult', name: 'All Grown Up', icon: '⭐', description: 'Raise a pet to Adult stage', check: (gs) => (gs.pet && ['adult', 'elder'].includes(gs.pet.growthStage)) },
    excellentCare: { id: 'excellentCare', name: 'Perfect Parent', icon: '🌟', description: 'Reach Excellent care quality', check: (gs) => (gs.pet && gs.pet.careQuality === 'excellent') },
    evolvePet: { id: 'evolvePet', name: 'Transcendence', icon: '✨', description: 'Evolve a pet to their special form', check: (gs) => (gs.pet && gs.pet.evolutionStage === 'evolved') },
    unlockMythical: { id: 'unlockMythical', name: 'Mythical Discovery', icon: '🦄', description: 'Unlock a mythical pet type', check: (gs) => (gs.adultsRaised >= 2) },
    adoptSecondPet: { id: 'adoptSecondPet', name: 'Growing Family', icon: '🏠', description: 'Adopt a second pet', check: (gs) => (gs.pets && gs.pets.length >= 2) },
    fullFamily: { id: 'fullFamily', name: 'Full House', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets at once', check: (gs) => (gs.pets && gs.pets.length >= 4) },
    playMinigame: { id: 'playMinigame', name: 'Game Time', icon: '🎮', description: 'Play your first mini-game', check: (gs) => { const counts = gs.minigamePlayCounts || {}; return Object.values(counts).some(c => c > 0); } },
    highScore50: { id: 'highScore50', name: 'High Scorer', icon: '🏆', description: 'Score 50+ in any mini-game', check: (gs) => { const scores = gs.minigameHighScores || {}; return Object.values(scores).some(s => s >= 50); } },
    visitAllRooms: { id: 'visitAllRooms', name: 'Explorer', icon: '🗺️', description: 'Visit all 11 rooms', check: (gs) => { const visited = gs.roomsVisited || {}; return ROOM_IDS.every(r => visited[r]); } },
    bestFriend: { id: 'bestFriend', name: 'Best Friends', icon: '💖', description: 'Reach Best Friend with any pet pair', check: (gs) => { const rels = gs.relationships || {}; return Object.values(rels).some(r => r.points >= 180); } },
    nightOwl: { id: 'nightOwl', name: 'Night Owl', icon: '🌙', description: 'Play during nighttime', check: (gs) => (gs.timeOfDay === 'night') },
    weatherWatcher: { id: 'weatherWatcher', name: 'Weather Watcher', icon: '🌧️', description: 'Experience all 3 weather types', check: (gs) => { const seen = gs.weatherSeen || {}; return seen.sunny && seen.rainy && seen.snowy; } },
    dailyComplete: { id: 'dailyComplete', name: 'Daily Champion', icon: '📋', description: 'Complete all daily tasks', check: (gs) => { const d = gs.dailyChecklist; return d && d.tasks && d.tasks.every(t => t.done); } },
    firstBreeding: { id: 'firstBreeding', name: 'Matchmaker', icon: '💕', description: 'Breed two pets for the first time', check: (gs) => (gs.totalBreedings || 0) >= 1 },
    hatchBreedingEgg: { id: 'hatchBreedingEgg', name: 'Proud Parent', icon: '🥚', description: 'Hatch your first breeding egg', check: (gs) => (gs.totalBreedingHatches || 0) >= 1 },
    firstHybrid: { id: 'firstHybrid', name: 'Hybrid Discovery', icon: '🧬', description: 'Create a hybrid pet through breeding', check: (gs) => (gs.totalHybridsCreated || 0) >= 1 },
    firstMutation: { id: 'firstMutation', name: 'Genetic Marvel', icon: '🌈', description: 'Breed a pet with a rare mutation', check: (gs) => (gs.totalMutations || 0) >= 1 },
    fiveBreedings: { id: 'fiveBreedings', name: 'Master Breeder', icon: '🏅', description: 'Successfully breed 5 times', check: (gs) => (gs.totalBreedings || 0) >= 5 },
    // Personality & Elder achievements
    reachElder: { id: 'reachElder', name: 'Elder Wisdom', icon: '🏛️', description: 'Raise a pet to Elder stage', check: (gs) => (gs.pet && gs.pet.growthStage === 'elder') },
    retirePet: { id: 'retirePet', name: 'Fond Farewell', icon: '🌅', description: 'Retire a pet to the Hall of Fame', check: (gs) => (gs.memorials && gs.memorials.length >= 1) },
    fiveMemorials: { id: 'fiveMemorials', name: 'Legacy Builder', icon: '🏆', description: 'Have 5 pets in the Hall of Fame', check: (gs) => (gs.memorials && gs.memorials.length >= 5) },
    favoriteFed: { id: 'favoriteFed', name: 'Gourmet Chef', icon: '👨‍🍳', description: 'Feed a pet its favorite food', check: (gs) => (gs.totalFavoriteFoodFed || 0) >= 1 }
};

// ==================== DAILY CHECKLIST ====================

const DAILY_FIXED_TASKS = [
    { id: 'feedDaily', nameTemplate: 'Feed your pet {target} times', icon: '🍎', target: 3, trackKey: 'feedCount', maxTarget: 6, lane: 'fixed' },
    { id: 'careDaily', nameTemplate: 'Do {target} care actions', icon: '💝', target: 5, trackKey: 'totalCareActions', maxTarget: 10, lane: 'fixed' }
];

const DAILY_MODE_TASKS = [
    { id: 'playMinigame', nameTemplate: 'Play {target} mini-game{plural}', icon: '🎮', target: 1, trackKey: 'minigameCount', maxTarget: 3, lane: 'mode' },
    { id: 'harvestCrop', nameTemplate: 'Harvest {target} crop{plural}', icon: '🌱', target: 1, trackKey: 'harvestCount', maxTarget: 3, lane: 'mode' },
    { id: 'visitPark', nameTemplate: 'Visit the Park {target} time{plural}', icon: '🌳', target: 1, trackKey: 'parkVisits', maxTarget: 2, lane: 'mode' },
    { id: 'expeditionRun', nameTemplate: 'Complete {target} expedition{plural}', icon: '🧭', target: 1, trackKey: 'expeditionCount', maxTarget: 2, lane: 'mode' },
    { id: 'arenaBattle', nameTemplate: 'Finish {target} arena battle{plural}', icon: '🏟️', target: 1, trackKey: 'battleCount', maxTarget: 3, lane: 'mode' }
];

const DAILY_WILDCARD_TASKS = [
    { id: 'wildBond', nameTemplate: 'Build bond points {target} time{plural}', icon: '💞', target: 1, trackKey: 'bondEvents', maxTarget: 2, lane: 'wildcard', minStage: 'child' },
    { id: 'wildHatch', nameTemplate: 'Hatch {target} new family member{plural}', icon: '🥚', target: 1, trackKey: 'hatchCount', maxTarget: 2, lane: 'wildcard', minStage: 'adult' },
    { id: 'wildMastery', nameTemplate: 'Gain {target} mastery point{plural}', icon: '🎯', target: 2, trackKey: 'masteryPoints', maxTarget: 6, lane: 'wildcard', minStage: 'adult' },
    { id: 'wildExplorer', nameTemplate: 'Discover {target} world event{plural}', icon: '🗺️', target: 1, trackKey: 'discoveryEvents', maxTarget: 3, lane: 'wildcard', minStage: 'baby' }
];

const DAILY_SEASONAL_TASKS = {
    spring: { id: 'seasonalSpring', nameTemplate: 'Enjoy {target} springtime activity', icon: '🌸', target: 1, trackKey: 'totalCareActions', maxTarget: 3, lane: 'seasonal' },
    summer: { id: 'seasonalSummer', nameTemplate: 'Do {target} summer splash play{plural}', icon: '☀️', target: 1, trackKey: 'totalCareActions', maxTarget: 3, lane: 'seasonal' },
    autumn: { id: 'seasonalAutumn', nameTemplate: 'Crunch through {target} autumn leaf pile{plural}', icon: '🍂', target: 1, trackKey: 'totalCareActions', maxTarget: 3, lane: 'seasonal' },
    winter: { id: 'seasonalWinter', nameTemplate: 'Have {target} cozy winter moment{plural}', icon: '❄️', target: 1, trackKey: 'totalCareActions', maxTarget: 3, lane: 'seasonal' }
};

function getDailyTasksWithSeason() {
    const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
    const seasonalTask = DAILY_SEASONAL_TASKS[season];
    const base = [...DAILY_FIXED_TASKS, ...DAILY_MODE_TASKS, ...DAILY_WILDCARD_TASKS];
    if (seasonalTask) base.push(seasonalTask);
    return base;
}

const DAILY_TASKS = [...DAILY_FIXED_TASKS, ...DAILY_MODE_TASKS, ...DAILY_WILDCARD_TASKS];

function getDailyTaskTarget(task, growthStage) {
    const t = task || {};
    const stage = GROWTH_STAGES[growthStage] ? growthStage : 'baby';
    const mult = getStageBalance(stage).dailyTaskMultiplier;
    const base = Math.max(1, Number(t.target) || 1);
    const maxTarget = Math.max(base, Number(t.maxTarget) || base);
    const scaled = Math.max(base, Math.min(maxTarget, Math.round(base * mult)));
    return scaled;
}

function getDailyTaskName(task, target) {
    const tmpl = String((task && task.nameTemplate) || (task && task.name) || 'Daily task');
    const safeTarget = Math.max(1, Number(target) || 1);
    const plural = safeTarget === 1 ? '' : 's';
    return tmpl.replace('{target}', safeTarget).replace('{plural}', plural);
}

const REWARD_MODIFIERS = {
    careRush: { id: 'careRush', name: 'Care Rush', emoji: '⚡', description: '+15% care gains for the next 20 care actions', effect: { type: 'careGainMultiplier', multiplier: 1.15, remainingActions: 20 } },
    happyHour: { id: 'happyHour', name: 'Happy Hour', emoji: '🎈', description: 'Extra happiness on actions for 30 minutes', effect: { type: 'happinessFlatBonus', value: 4, durationMs: 30 * 60 * 1000 } },
    luckyPaws: { id: 'luckyPaws', name: 'Lucky Paws', emoji: '🍀', description: '+1 loot roll on the next expedition', effect: { type: 'nextExpeditionBonusRolls', rolls: 1 } },
    focusedTraining: { id: 'focusedTraining', name: 'Focused Training', emoji: '🎯', description: '+20% competition rewards for the next 2 matches', effect: { type: 'competitionRewardMultiplier', multiplier: 1.2, remainingMatches: 2 } },
    familyAura: { id: 'familyAura', name: 'Family Aura', emoji: '👨‍👩‍👧‍👦', description: 'Relationship gain boost for 24h', effect: { type: 'relationshipMultiplier', multiplier: 1.2, durationMs: 24 * 60 * 60 * 1000 } }
};

const REWARD_BUNDLES = {
    dailyFinish: { id: 'dailyFinish', coins: 100, modifierId: 'careRush', collectible: { type: 'sticker', id: 'partySticker' } },
    streakDay1: { id: 'streakDay1', coins: 40, modifierId: 'happyHour', collectible: { type: 'sticker', id: 'starSticker' } },
    streakDay3: { id: 'streakDay3', coins: 55, modifierId: 'careRush', collectible: { type: 'sticker', id: 'partySticker' } },
    streakDay5: { id: 'streakDay5', coins: 75, modifierId: 'careRush', collectible: { type: 'accessory', id: 'bandana' } },
    streakDay7: { id: 'streakDay7', coins: 90, modifierId: 'happyHour', collectible: { type: 'sticker', id: 'streakFlame' } },
    streakDay10: { id: 'streakDay10', coins: 110, modifierId: 'focusedTraining', collectible: { type: 'accessory', id: 'sunglasses' } },
    streakDay14: { id: 'streakDay14', coins: 135, modifierId: 'familyAura', collectible: { type: 'sticker', id: 'heartSticker' } },
    streakDay21: { id: 'streakDay21', coins: 180, modifierId: 'luckyPaws', collectible: { type: 'accessory', id: 'crown' } },
    streakDay30: { id: 'streakDay30', coins: 240, modifierId: 'focusedTraining', collectible: { type: 'sticker', id: 'crownSticker' } },
    weeklyArcFinale: { id: 'weeklyArcFinale', coins: 320, modifierId: 'familyAura', collectible: { type: 'sticker', id: 'legendRibbon' } },
    // Recommendation #9: Sticker set completion bonuses
    stickerSetAnimals: { id: 'stickerSetAnimals', coins: 150, modifierId: 'luckyPaws' },
    stickerSetNature: { id: 'stickerSetNature', coins: 100, modifierId: 'careRush' },
    stickerSetFun: { id: 'stickerSetFun', coins: 120, modifierId: 'happyHour' },
    stickerSetSpecial: { id: 'stickerSetSpecial', coins: 200, modifierId: 'focusedTraining' }
};

// ==================== BADGES ====================

const BADGES = {
    // Feeding milestones
    firstFeedBadge: { id: 'firstFeedBadge', name: 'First Bite', icon: '🍼', description: 'Feed your pet for the first time', category: 'care', tier: 'bronze', check: (gs) => gs.pet && (gs.totalFeedCount || 0) >= 1 },
    tenFeeds: { id: 'tenFeeds', name: 'Snack Master', icon: '🍕', description: 'Feed your pet 10 times', category: 'care', tier: 'silver', check: (gs) => gs.pet && (gs.totalFeedCount || 0) >= 10 },
    // Play milestones
    firstPlay: { id: 'firstPlay', name: 'Playtime!', icon: '🎈', description: 'Play with your pet for the first time', category: 'play', tier: 'bronze', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).some(v => v > 0); } },
    tenPlays: { id: 'tenPlays', name: 'Game Enthusiast', icon: '🕹️', description: 'Play 10 mini-games', category: 'play', tier: 'silver', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).reduce((s, v) => s + v, 0) >= 10; } },
    fiftyPlays: { id: 'fiftyPlays', name: 'Arcade Champion', icon: '👾', description: 'Play 50 mini-games', category: 'play', tier: 'gold', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).reduce((s, v) => s + v, 0) >= 50; } },
    // Growth milestones
    babySteps: { id: 'babySteps', name: 'Baby Steps', icon: '👣', description: 'Hatch your first pet', category: 'growth', tier: 'bronze', check: (gs) => gs.phase === 'pet' && gs.pet },
    growUp: { id: 'growUp', name: 'Growing Pains', icon: '🌱', description: 'Raise a pet to Child stage', category: 'growth', tier: 'silver', check: (gs) => gs.pet && gs.pet.growthStage !== 'baby' },
    fullyGrown: { id: 'fullyGrown', name: 'All Grown Up', icon: '🌳', description: 'Raise a pet to Adult stage', category: 'growth', tier: 'gold', check: (gs) => gs.pet && ['adult', 'elder'].includes(gs.pet.growthStage) },
    // Care milestones
    cleanFreak: { id: 'cleanFreak', name: 'Squeaky Clean', icon: '🧼', description: 'Reach 100% cleanliness', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.cleanliness >= 100 },
    happyCamper: { id: 'happyCamper', name: 'Happy Camper', icon: '😊', description: 'Reach 100% happiness', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.happiness >= 100 },
    fullBelly: { id: 'fullBelly', name: 'Full Belly', icon: '😋', description: 'Reach 100% hunger', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.hunger >= 100 },
    // Garden milestones
    greenThumb: { id: 'greenThumb', name: 'Green Thumb', icon: '🌿', description: 'Harvest your first crop', category: 'garden', tier: 'bronze', check: (gs) => gs.garden && gs.garden.totalHarvests >= 1 },
    masterGardener: { id: 'masterGardener', name: 'Master Gardener', icon: '🏡', description: 'Harvest 20 crops', category: 'garden', tier: 'gold', check: (gs) => gs.garden && gs.garden.totalHarvests >= 20 },
    // Social milestones
    socialButterfly: { id: 'socialButterfly', name: 'Social Butterfly', icon: '🦋', description: 'Have 2 or more pets', category: 'social', tier: 'silver', check: (gs) => gs.pets && gs.pets.length >= 2 },
    bigFamily: { id: 'bigFamily', name: 'Big Family', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets at once', category: 'social', tier: 'gold', check: (gs) => gs.pets && gs.pets.length >= 4 },
    // Streak milestones
    streak3: { id: 'streak3', name: 'On a Roll', icon: '🔥', description: 'Reach a 3-day streak', category: 'streak', tier: 'bronze', check: (gs) => gs.streak && gs.streak.current >= 3 },
    streak7: { id: 'streak7', name: 'Week Warrior', icon: '⚡', description: 'Reach a 7-day streak', category: 'streak', tier: 'silver', check: (gs) => gs.streak && gs.streak.current >= 7 },
    streak30: { id: 'streak30', name: 'Monthly Master', icon: '🌟', description: 'Reach a 30-day streak', category: 'streak', tier: 'gold', check: (gs) => gs.streak && gs.streak.current >= 30 },
    // Exploration
    worldTraveler: { id: 'worldTraveler', name: 'World Traveler', icon: '🗺️', description: 'Visit all 11 rooms', category: 'exploration', tier: 'silver', check: (gs) => { const v = gs.roomsVisited || {}; return ROOM_IDS.every(r => v[r]); } },
    nightExplorer: { id: 'nightExplorer', name: 'Night Explorer', icon: '🌙', description: 'Play during nighttime', category: 'exploration', tier: 'bronze', check: (gs) => gs.timeOfDay === 'night' },
    // Breeding milestones
    firstBreed: { id: 'firstBreed', name: 'Matchmaker', icon: '💕', description: 'Breed two pets', category: 'breeding', tier: 'bronze', check: (gs) => (gs.totalBreedings || 0) >= 1 },
    hybridBreeder: { id: 'hybridBreeder', name: 'Hybrid Creator', icon: '🧬', description: 'Create a hybrid pet', category: 'breeding', tier: 'silver', check: (gs) => (gs.totalHybridsCreated || 0) >= 1 },
    mutationHunter: { id: 'mutationHunter', name: 'Mutation Hunter', icon: '🌈', description: 'Breed a pet with a mutation', category: 'breeding', tier: 'gold', check: (gs) => (gs.totalMutations || 0) >= 1 },
    masterBreeder: { id: 'masterBreeder', name: 'Master Breeder', icon: '🏆', description: 'Breed 5 times successfully', category: 'breeding', tier: 'gold', check: (gs) => (gs.totalBreedings || 0) >= 5 },
    // Elder & Personality badges
    elderWise: { id: 'elderWise', name: 'Wise Elder', icon: '🏛️', description: 'Raise a pet to Elder stage', category: 'growth', tier: 'gold', check: (gs) => gs.pet && gs.pet.growthStage === 'elder' },
    memorialFirst: { id: 'memorialFirst', name: 'Fond Memory', icon: '🌅', description: 'Retire your first pet', category: 'care', tier: 'silver', check: (gs) => (gs.memorials && gs.memorials.length >= 1) },
    personalityExplorer: { id: 'personalityExplorer', name: 'Personality Expert', icon: '🧠', description: 'Raise 3 pets with different personalities', category: 'care', tier: 'silver', check: (gs) => { const ps = gs.personalitiesSeen || {}; return Object.keys(ps).length >= 3; } }
};

const BADGE_TIERS = {
    bronze: { label: 'Bronze', color: '#CD7F32', glow: '#CD7F3266' },
    silver: { label: 'Silver', color: '#C0C0C0', glow: '#C0C0C066' },
    gold: { label: 'Gold', color: '#FFD700', glow: '#FFD70066' }
};

const BADGE_CATEGORIES = {
    care: { label: 'Care', icon: '💝' },
    play: { label: 'Play', icon: '🎮' },
    growth: { label: 'Growth', icon: '🌱' },
    garden: { label: 'Garden', icon: '🌻' },
    social: { label: 'Social', icon: '🤝' },
    streak: { label: 'Streak', icon: '🔥' },
    exploration: { label: 'Explore', icon: '🗺️' },
    breeding: { label: 'Breeding', icon: '🧬' }
};

// ==================== STICKER COLLECTION ====================

const STICKERS = {
    // Animal stickers - earned through caring actions
    happyPup: { id: 'happyPup', name: 'Happy Pup', emoji: '🐶', category: 'animals', rarity: 'common', source: 'Feed a dog pet' },
    sleepyKitty: { id: 'sleepyKitty', name: 'Sleepy Kitty', emoji: '😸', category: 'animals', rarity: 'common', source: 'Pet a cat' },
    bouncyBunny: { id: 'bouncyBunny', name: 'Bouncy Bunny', emoji: '🐇', category: 'animals', rarity: 'common', source: 'Play with a bunny' },
    tinyTurtle: { id: 'tinyTurtle', name: 'Tiny Turtle', emoji: '🐢', category: 'animals', rarity: 'common', source: 'Wash a turtle' },
    goldenFish: { id: 'goldenFish', name: 'Golden Fish', emoji: '🐠', category: 'animals', rarity: 'uncommon', source: 'Feed a fish pet' },
    sweetBird: { id: 'sweetBird', name: 'Sweet Bird', emoji: '🐤', category: 'animals', rarity: 'common', source: 'Play with a bird' },
    cuddlyPanda: { id: 'cuddlyPanda', name: 'Cuddly Panda', emoji: '🐼', category: 'animals', rarity: 'uncommon', source: 'Cuddle a panda' },
    royalPenguin: { id: 'royalPenguin', name: 'Royal Penguin', emoji: '🐧', category: 'animals', rarity: 'uncommon', source: 'Exercise with a penguin' },
    fuzzyHamster: { id: 'fuzzyHamster', name: 'Fuzzy Hamster', emoji: '🐹', category: 'animals', rarity: 'common', source: 'Feed a hamster' },
    happyFrog: { id: 'happyFrog', name: 'Happy Frog', emoji: '🐸', category: 'animals', rarity: 'common', source: 'Play with a frog' },
    spinyHedgehog: { id: 'spinyHedgehog', name: 'Spiny Hedgehog', emoji: '🦔', category: 'animals', rarity: 'common', source: 'Cuddle a hedgehog' },
    magicUnicorn: { id: 'magicUnicorn', name: 'Magic Unicorn', emoji: '🦄', category: 'animals', rarity: 'rare', source: 'Play with a unicorn' },
    fierceDragon: { id: 'fierceDragon', name: 'Fierce Dragon', emoji: '🐉', category: 'animals', rarity: 'rare', source: 'Feed a dragon' },
    // Nature stickers - earned through garden
    sproutSticker: { id: 'sproutSticker', name: 'Little Sprout', emoji: '🌱', category: 'nature', rarity: 'common', source: 'Plant your first seed' },
    sunflowerSticker: { id: 'sunflowerSticker', name: 'Sunflower', emoji: '🌻', category: 'nature', rarity: 'common', source: 'Harvest a sunflower' },
    rainbowSticker: { id: 'rainbowSticker', name: 'Rainbow', emoji: '🌈', category: 'nature', rarity: 'uncommon', source: 'Experience all 3 weather types' },
    cherryBlossom: { id: 'cherryBlossom', name: 'Cherry Blossom', emoji: '🌸', category: 'nature', rarity: 'uncommon', source: 'Play during spring' },
    snowflakeSticker: { id: 'snowflakeSticker', name: 'Snowflake', emoji: '❄️', category: 'nature', rarity: 'uncommon', source: 'Play during snowy weather' },
    // Fun stickers - earned through mini-games and activities
    starSticker: { id: 'starSticker', name: 'Gold Star', emoji: '⭐', category: 'fun', rarity: 'common', source: 'Score 25+ in any mini-game' },
    trophySticker: { id: 'trophySticker', name: 'Trophy', emoji: '🏆', category: 'fun', rarity: 'uncommon', source: 'Score 50+ in any mini-game' },
    partySticker: { id: 'partySticker', name: 'Party Time', emoji: '🎉', category: 'fun', rarity: 'common', source: 'Complete all daily tasks' },
    musicSticker: { id: 'musicSticker', name: 'Music Note', emoji: '🎵', category: 'fun', rarity: 'common', source: 'Play Simon Says' },
    artSticker: { id: 'artSticker', name: 'Art Palette', emoji: '🎨', category: 'fun', rarity: 'common', source: 'Play the Coloring game' },
    // Special stickers - earned through milestones
    heartSticker: { id: 'heartSticker', name: 'Big Heart', emoji: '💖', category: 'special', rarity: 'rare', source: 'Reach Best Friend relationship or a 14-day streak' },
    crownSticker: { id: 'crownSticker', name: 'Royal Crown', emoji: '👑', category: 'special', rarity: 'rare', source: 'Evolve a pet' },
    sparkleSticker: { id: 'sparkleSticker', name: 'Sparkle', emoji: '✨', category: 'special', rarity: 'rare', source: 'Reach Excellent care quality' },
    unicornSticker: { id: 'unicornSticker', name: 'Unicorn', emoji: '🦄', category: 'special', rarity: 'legendary', source: 'Unlock a mythical pet' },
    dragonSticker: { id: 'dragonSticker', name: 'Dragon', emoji: '🐉', category: 'special', rarity: 'legendary', source: 'Raise 3 adults' },
    streakFlame: { id: 'streakFlame', name: 'Eternal Flame', emoji: '🔥', category: 'special', rarity: 'rare', source: 'Reach a 7-day streak' },
    // Breeding stickers
    breedingEgg: { id: 'breedingEgg', name: 'Love Egg', emoji: '🥚', category: 'special', rarity: 'uncommon', source: 'Breed two pets' },
    dnaSticker: { id: 'dnaSticker', name: 'DNA Helix', emoji: '🧬', category: 'special', rarity: 'rare', source: 'Create a hybrid pet' },
    mutantStar: { id: 'mutantStar', name: 'Mutant Star', emoji: '🌟', category: 'special', rarity: 'legendary', source: 'Breed a mutated pet' },
    familyTree: { id: 'familyTree', name: 'Family Tree', emoji: '🌳', category: 'special', rarity: 'rare', source: 'Breed 3 times' },
    // Elder & Memorial stickers
    elderSticker: { id: 'elderSticker', name: 'Wise Elder', emoji: '🏛️', category: 'special', rarity: 'rare', source: 'Raise a pet to Elder stage' },
    memorialSticker: { id: 'memorialSticker', name: 'Memorial Rose', emoji: '🌹', category: 'special', rarity: 'rare', source: 'Retire a pet to the Hall of Fame' },
    wisdomSticker: { id: 'wisdomSticker', name: 'Book of Wisdom', emoji: '📖', category: 'special', rarity: 'legendary', source: 'Have 5 memorials' },
    legendRibbon: { id: 'legendRibbon', name: 'Legend Ribbon', emoji: '🎗️', category: 'special', rarity: 'legendary', source: 'Weekly objective arc finale reward' },
    moonCrest: { id: 'moonCrest', name: 'Moon Crest', emoji: '🌙', category: 'special', rarity: 'legendary', source: 'Streak prestige reward rotation' },
    sunCrest: { id: 'sunCrest', name: 'Sun Crest', emoji: '☀️', category: 'special', rarity: 'legendary', source: 'Streak prestige reward rotation' },
    tideCrest: { id: 'tideCrest', name: 'Tide Crest', emoji: '🌊', category: 'special', rarity: 'legendary', source: 'Streak prestige reward rotation' },
    bloomCrest: { id: 'bloomCrest', name: 'Bloom Crest', emoji: '🌸', category: 'special', rarity: 'legendary', source: 'Streak prestige reward rotation' }
};

const STICKER_RARITIES = {
    common: { label: 'Common', color: '#9E9E9E', stars: 1 },
    uncommon: { label: 'Uncommon', color: '#4CAF50', stars: 2 },
    rare: { label: 'Rare', color: '#2196F3', stars: 3 },
    legendary: { label: 'Legendary', color: '#FF9800', stars: 4 }
};

const STICKER_CATEGORIES = {
    animals: { label: 'Animals', icon: '🐾' },
    nature: { label: 'Nature', icon: '🌿' },
    fun: { label: 'Fun', icon: '🎮' },
    special: { label: 'Special', icon: '✨' }
};

// ==================== TROPHIES ====================

const TROPHIES = {
    // Care trophies
    nurturerTrophy: { id: 'nurturerTrophy', name: 'Nurturer', icon: '💝', description: 'Perform 100 care actions total', shelf: 'care', check: (gs) => { const total = (gs.pets || []).reduce((s, p) => s + (p ? (p.careActions || 0) : 0), 0); return total >= 100; } },
    healerTrophy: { id: 'healerTrophy', name: 'Healer', icon: '🩺', description: 'Use medicine 10 times', shelf: 'care', check: (gs) => (gs.totalMedicineUses || 0) >= 10 },
    groomExpert: { id: 'groomExpert', name: 'Groom Expert', icon: '✂️', description: 'Groom pets 20 times', shelf: 'care', check: (gs) => (gs.totalGroomCount || 0) >= 20 },
    // Growth trophies
    breederTrophy: { id: 'breederTrophy', name: 'Expert Breeder', icon: '🥚', description: 'Raise 3 pets to adult', shelf: 'growth', check: (gs) => (gs.adultsRaised || 0) >= 3 },
    evolutionMaster: { id: 'evolutionMaster', name: 'Evolution Master', icon: '🧬', description: 'Evolve any pet', shelf: 'growth', check: (gs) => (gs.pets || []).some(p => p && p.evolutionStage === 'evolved') },
    mythicalFinder: { id: 'mythicalFinder', name: 'Mythical Finder', icon: '🦄', description: 'Unlock a mythical pet type', shelf: 'growth', check: (gs) => (gs.adultsRaised || 0) >= 2 },
    // Game trophies
    arcadeStar: { id: 'arcadeStar', name: 'Arcade Star', icon: '🕹️', description: 'Score 50+ in 3 different mini-games', shelf: 'games', check: (gs) => { const s = gs.minigameHighScores || {}; return Object.values(s).filter(v => v >= 50).length >= 3; } },
    gameCollector: { id: 'gameCollector', name: 'Game Collector', icon: '🎲', description: 'Play all 6 mini-games', shelf: 'games', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).filter(v => v > 0).length >= 6; } },
    scoreKing: { id: 'scoreKing', name: 'Score King', icon: '👑', description: 'Score 100+ in any mini-game', shelf: 'games', check: (gs) => { const s = gs.minigameHighScores || {}; return Object.values(s).some(v => v >= 100); } },
    // Garden trophies
    harvestKing: { id: 'harvestKing', name: 'Harvest King', icon: '🌾', description: 'Harvest 30 crops total', shelf: 'garden', check: (gs) => gs.garden && gs.garden.totalHarvests >= 30 },
    fullGarden: { id: 'fullGarden', name: 'Full Garden', icon: '🏡', description: 'Unlock all 6 garden plots', shelf: 'garden', check: (gs) => gs.garden && getUnlockedPlotCount(gs.garden.totalHarvests) >= 6 },
    // Social trophies
    familyTrophy: { id: 'familyTrophy', name: 'Happy Family', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets with all at Good+ care', shelf: 'social', check: (gs) => { const ps = gs.pets || []; return ps.length >= 4 && ps.every(p => p && ['good', 'excellent'].includes(p.careQuality)); } },
    bondMaster: { id: 'bondMaster', name: 'Bond Master', icon: '💖', description: 'Reach Family relationship level', shelf: 'social', check: (gs) => { const r = gs.relationships || {}; return Object.values(r).some(v => v.points >= 250); } },
    // Dedication trophies
    streakLegend: { id: 'streakLegend', name: 'Streak Legend', icon: '🔥', description: 'Reach a 14-day streak', shelf: 'dedication', check: (gs) => gs.streak && gs.streak.current >= 14 },
    dailyDevotee: { id: 'dailyDevotee', name: 'Daily Devotee', icon: '📅', description: 'Complete daily tasks 7 times', shelf: 'dedication', check: (gs) => (gs.totalDailyCompletions || 0) >= 7 },
    collectorTrophy: { id: 'collectorTrophy', name: 'Collector', icon: '📦', description: 'Collect 15 stickers', shelf: 'dedication', check: (gs) => { const st = gs.stickers || {}; return Object.values(st).filter(v => v.collected).length >= 15; } },
    // Breeding trophies
    geneticist: { id: 'geneticist', name: 'Geneticist', icon: '🧬', description: 'Breed 3 different hybrid types', shelf: 'breeding', check: (gs) => { const h = gs.hybridsDiscovered || {}; return Object.keys(h).length >= 3; } },
    breedingLegend: { id: 'breedingLegend', name: 'Breeding Legend', icon: '💕', description: 'Breed 10 times total', shelf: 'breeding', check: (gs) => (gs.totalBreedings || 0) >= 10 },
    mutationCollector: { id: 'mutationCollector', name: 'Mutation Collector', icon: '🌈', description: 'Collect 3 mutated pets', shelf: 'breeding', check: (gs) => (gs.totalMutations || 0) >= 3 },
    // Elder & Memorial trophies
    elderMaster: { id: 'elderMaster', name: 'Elder Master', icon: '🏛️', description: 'Raise 2 pets to Elder stage', shelf: 'growth', check: (gs) => (gs.eldersRaised || 0) >= 2 },
    hallOfFame: { id: 'hallOfFame', name: 'Hall of Fame', icon: '🏆', description: 'Have 5 pets in the memorial', shelf: 'dedication', check: (gs) => (gs.memorials && gs.memorials.length >= 5) },
    legacyKeeper: { id: 'legacyKeeper', name: 'Legacy Keeper', icon: '📜', description: 'Retire an elder pet', shelf: 'dedication', check: (gs) => (gs.memorials && gs.memorials.some(m => m.growthStage === 'elder')) }
};

const TROPHY_SHELVES = {
    care: { label: 'Care', icon: '💝' },
    growth: { label: 'Growth', icon: '🌱' },
    games: { label: 'Games', icon: '🎮' },
    garden: { label: 'Garden', icon: '🌻' },
    social: { label: 'Social', icon: '🤝' },
    dedication: { label: 'Dedication', icon: '🔥' },
    breeding: { label: 'Breeding', icon: '🧬' }
};

// ==================== DAILY STREAKS ====================

const STREAK_MILESTONES = [
    { days: 1, bundleId: 'streakDay1', label: 'Day 1', description: 'Welcome back! Functional + cosmetic bundle.' },
    { days: 3, bundleId: 'streakDay3', label: '3-Day Streak', description: 'On a roll!' },
    { days: 5, bundleId: 'streakDay5', label: '5-Day Streak', description: 'Dedicated caretaker!' },
    { days: 7, bundleId: 'streakDay7', label: 'Week Streak', description: 'A whole week!' },
    { days: 10, bundleId: 'streakDay10', label: '10-Day Streak', description: 'Super dedicated!' },
    { days: 14, bundleId: 'streakDay14', label: '2-Week Streak', description: 'True devotion!' },
    { days: 21, bundleId: 'streakDay21', label: '3-Week Streak', description: 'Incredible commitment!' },
    { days: 30, bundleId: 'streakDay30', label: 'Monthly Streak', description: 'Legendary caretaker!' }
];

const STREAK_PRESTIGE_REWARDS = [
    { id: 'auroraLoop', label: 'Aurora Loop', icon: '🌌', collectible: { type: 'sticker', id: 'moonCrest' }, coins: 280, modifierId: 'luckyPaws' },
    { id: 'solarRelay', label: 'Solar Relay', icon: '🌞', collectible: { type: 'sticker', id: 'sunCrest' }, coins: 280, modifierId: 'careRush' },
    { id: 'tideRelay', label: 'Tide Relay', icon: '🌊', collectible: { type: 'sticker', id: 'tideCrest' }, coins: 280, modifierId: 'happyHour' },
    { id: 'springRelay', label: 'Spring Relay', icon: '🌸', collectible: { type: 'sticker', id: 'bloomCrest' }, coins: 280, modifierId: 'familyAura' }
];

const WEEKLY_THEMED_ARCS = [
    {
        id: 'carecraft',
        theme: 'Carecraft Week',
        icon: '🛠️',
        tasks: [
            { id: 'arc-care', icon: '💝', trackKey: 'totalCareActions', target: 18, nameTemplate: 'Do {target} care actions' },
            { id: 'arc-feed', icon: '🍎', trackKey: 'feedCount', target: 8, nameTemplate: 'Feed {target} times' },
            { id: 'arc-explore', icon: '🧭', trackKey: 'expeditionCount', target: 2, nameTemplate: 'Complete {target} expeditions' }
        ],
        finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
    },
    {
        id: 'wildfrontier',
        theme: 'Wild Frontier Week',
        icon: '🗺️',
        tasks: [
            { id: 'arc-park', icon: '🌳', trackKey: 'parkVisits', target: 4, nameTemplate: 'Visit the park {target} times' },
            { id: 'arc-discovery', icon: '✨', trackKey: 'discoveryEvents', target: 5, nameTemplate: 'Find {target} discovery events' },
            { id: 'arc-bond', icon: '💞', trackKey: 'bondEvents', target: 3, nameTemplate: 'Trigger {target} bond moments' }
        ],
        finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
    },
    // Recommendation #5: New weekly arc variants
    {
        id: 'gardenbloom',
        theme: 'Garden Bloom Week',
        icon: '🌻',
        tasks: [
            { id: 'arc-harvest', icon: '🌱', trackKey: 'harvestCount', target: 6, nameTemplate: 'Harvest {target} crops' },
            { id: 'arc-feed-bloom', icon: '🍎', trackKey: 'feedCount', target: 6, nameTemplate: 'Feed {target} times' },
            { id: 'arc-care-bloom', icon: '💝', trackKey: 'totalCareActions', target: 12, nameTemplate: 'Do {target} care actions' }
        ],
        finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
    },
    {
        id: 'arenaglory',
        theme: 'Arena Glory Week',
        icon: '🏟️',
        tasks: [
            { id: 'arc-battle', icon: '🏟️', trackKey: 'battleCount', target: 4, nameTemplate: 'Finish {target} arena battles' },
            { id: 'arc-minigame', icon: '🎮', trackKey: 'minigameCount', target: 5, nameTemplate: 'Play {target} mini-games' },
            { id: 'arc-expedition-glory', icon: '🧭', trackKey: 'expeditionCount', target: 2, nameTemplate: 'Complete {target} expeditions' }
        ],
        finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
    },
    {
        id: 'familybonds',
        theme: 'Family Bonds Week',
        icon: '👨‍👩‍👧‍👦',
        tasks: [
            { id: 'arc-bond-family', icon: '💞', trackKey: 'bondEvents', target: 5, nameTemplate: 'Trigger {target} bond moments' },
            { id: 'arc-care-family', icon: '💝', trackKey: 'totalCareActions', target: 15, nameTemplate: 'Do {target} care actions' },
            { id: 'arc-hatch-family', icon: '🥚', trackKey: 'hatchCount', target: 1, nameTemplate: 'Hatch {target} new family member' }
        ],
        finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
    }
];

// Stat boosts applied each day based on current streak length
function getStreakBonus(streakDays) {
    if (streakDays >= 14) return { happiness: 15, energy: 10, label: '+15 Happy, +10 Energy' };
    if (streakDays >= 7) return { happiness: 10, energy: 8, label: '+10 Happy, +8 Energy' };
    if (streakDays >= 3) return { happiness: 8, energy: 5, label: '+8 Happy, +5 Energy' };
    if (streakDays >= 1) return { happiness: 5, energy: 3, label: '+5 Happy, +3 Energy' };
    return { happiness: 0, energy: 0, label: 'No bonus' };
}
