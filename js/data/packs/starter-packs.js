(function registerStarterContentPacks(global) {
    'use strict';
    if (typeof global.registerContentPack !== 'function') return;

    const addPack = (pack) => {
        try { global.registerContentPack(pack); } catch (err) { console.warn('[StarterPacks] Failed to register', pack && pack.id, err); }
    };

    addPack({
        id: 'starter_trivia_wildlife_plus_v1',
        version: '1.0.0',
        type: 'trivia',
        items: [
            { id: 'trivia_mantis_shrimp_vision', prompt: 'Why are mantis shrimp famous in animal science?', choices: ['They can survive in lava', 'They can see many color channels', 'They never sleep', 'They glow in moonlight'], answer: 1, category: 'ocean', difficulty: 'medium', tags: ['vision', 'marine'], explanation: 'Mantis shrimp have highly specialized eyes and can detect many kinds of light.' },
            { id: 'trivia_sloth_swim', prompt: 'What surprising skill do sloths have?', choices: ['They can mimic bird calls', 'They can swim well', 'They can jump high', 'They can see in total darkness'], answer: 1, category: 'mammals', difficulty: 'easy', tags: ['rainforest'], fact: 'Sloths are slow on land but can move efficiently in water.' },
            { id: 'trivia_elephant_communication', prompt: 'Elephants can communicate over long distances using...', choices: ['Ultrasound', 'Infra-sound rumbles', 'Wing vibrations', 'Color signals'], answer: 1, category: 'mammals', difficulty: 'medium', tags: ['behavior'], fact: 'Elephants use low-frequency sounds that can travel far.' },
            { id: 'trivia_penguin_parent', prompt: 'In emperor penguins, who keeps the egg warm during winter fasting?', choices: ['Both parents together', 'The male', 'The female', 'Older chicks'], answer: 1, category: 'birds', difficulty: 'medium', tags: ['penguin'], fact: 'Male emperor penguins balance the egg on their feet in extreme cold.' },
            { id: 'trivia_bat_mammal', prompt: 'Which of these is the only mammal naturally capable of sustained flight?', choices: ['Flying squirrel', 'Sugar glider', 'Bat', 'Colugo'], answer: 2, category: 'mammals', difficulty: 'easy', tags: ['flight'], fact: 'Bats are true flying mammals; gliders only glide.' },
            { id: 'trivia_coral_animal', prompt: 'Coral reefs are built by tiny animals called...', choices: ['Barnacles', 'Polyps', 'Shrimps', 'Sponges'], answer: 1, category: 'ocean', difficulty: 'easy', tags: ['reef'], fact: 'Coral polyps secrete hard skeletons that build reefs over time.' },
            { id: 'trivia_wolves_pack', prompt: 'What helps wolves coordinate while hunting and traveling?', choices: ['Color-changing fur', 'Scentless movement', 'Pack communication', 'Night vision only'], answer: 2, category: 'mammals', difficulty: 'easy', tags: ['pack', 'behavior'], fact: 'Wolves rely on body language, scent marking, and vocal calls.' },
            { id: 'trivia_koala_diet', prompt: 'Koalas eat mostly leaves from which tree?', choices: ['Oak', 'Pine', 'Eucalyptus', 'Maple'], answer: 2, category: 'mammals', difficulty: 'easy', tags: ['diet'], fact: 'Koalas specialize in eucalyptus leaves and rest a lot to conserve energy.' },
            { id: 'trivia_owl_silent_flight', prompt: 'Owls can fly quietly largely because of...', choices: ['Rubber-like talons', 'Soft feather edges', 'Hollow bones only', 'Tiny wings'], answer: 1, category: 'birds', difficulty: 'medium', tags: ['owl'], fact: 'Special feather structures reduce turbulence and muffle sound.' },
            { id: 'trivia_seahorse_pregnancy', prompt: 'Which animal group includes species where males carry developing young?', choices: ['Seahorses', 'Sharks', 'Jellyfish', 'Eels'], answer: 0, category: 'ocean', difficulty: 'easy', tags: ['fish'], fact: 'Male seahorses brood eggs in a pouch until they hatch.' },
            { id: 'trivia_arctic_fox_coat', prompt: 'Why does an arctic fox’s coat color often change between seasons?', choices: ['It absorbs more moonlight', 'It helps camouflage', 'It scares predators', 'It cools the body'], answer: 1, category: 'mammals', difficulty: 'easy', tags: ['seasonal'], fact: 'Seasonal coat changes help arctic foxes blend into snow or tundra.' },
            { id: 'trivia_bee_dance', prompt: 'Honeybees use the “waggle dance” to share information about...', choices: ['Nest temperature', 'Predator names', 'Food location', 'Rainfall totals'], answer: 2, category: 'insects', difficulty: 'medium', tags: ['behavior'], fact: 'The dance communicates direction and distance to food sources.' },
            { id: 'trivia_starfish_name', prompt: 'Why do many scientists prefer “sea star” over “starfish”?', choices: ['They are not fish', 'They do not live in the sea', 'They are plants', 'They have six arms'], answer: 0, category: 'ocean', difficulty: 'medium', tags: ['marine'], fact: 'Sea stars are echinoderms, not fish.' },
            { id: 'trivia_hummingbird_heart', prompt: 'Compared to many animals, hummingbirds generally have...', choices: ['Very slow heartbeats', 'Fast heartbeats', 'No sleep', 'No body heat'], answer: 1, category: 'birds', difficulty: 'medium', tags: ['hummingbird'], fact: 'Hummingbirds have extremely high heart rates to support hovering flight.' },
            { id: 'trivia_camel_hump', prompt: 'A camel’s hump mainly stores...', choices: ['Water', 'Fat', 'Air', 'Salt'], answer: 1, category: 'mammals', difficulty: 'easy', tags: ['desert'], fact: 'Camel humps store fat, which can be metabolized for energy.' },
            { id: 'trivia_otter_tools', prompt: 'Sea otters are known for using what to crack shellfish?', choices: ['Coral', 'Sticks', 'Rocks', 'Teeth only'], answer: 2, category: 'ocean', difficulty: 'easy', tags: ['tools'], fact: 'Sea otters often use rocks as tools while floating on their backs.' },
            { id: 'trivia_chameleon_color', prompt: 'Chameleons change color for camouflage and also for...', choices: ['Communication and temperature regulation', 'Storing sunlight', 'Growing faster', 'Sleeping'], answer: 0, category: 'reptiles', difficulty: 'medium', tags: ['color'], fact: 'Color changes can signal mood, status, and help manage body temperature.' },
            { id: 'trivia_krill_chain', prompt: 'Krill are especially important because they are a major food source for...', choices: ['Desert snakes', 'Many ocean animals including whales', 'Only penguins', 'Only seals'], answer: 1, category: 'ocean', difficulty: 'easy', tags: ['food web'], fact: 'Krill support large parts of marine food webs, especially in cold oceans.' }
        ]
    });

    addPack({
        id: 'starter_matching_decks_v1',
        version: '1.0.0',
        type: 'matching',
        items: [
            { id: 'deck_forest_foragers', theme: 'Forest Foragers', difficulty: 2, season: 'spring', pairs: [
                { id: 'mushroom', emoji: '🍄', name: 'Mushroom' }, { id: 'acorn', emoji: '🌰', name: 'Acorn' }, { id: 'fern', emoji: '🌿', name: 'Fern' }, { id: 'berry', emoji: '🫐', name: 'Berry' },
                { id: 'lantern', emoji: '🏮', name: 'Lantern' }, { id: 'leaf', emoji: '🍃', name: 'Leaf Charm' }, { id: 'owl', emoji: '🦉', name: 'Owl Token' }, { id: 'map', emoji: '🗺️', name: 'Trail Map' }
            ] },
            { id: 'deck_kitchen_favorites', theme: 'Kitchen Favorites', difficulty: 1, pairs: [
                { id: 'whisk', emoji: '🥣', name: 'Mixing Bowl' }, { id: 'spoon', emoji: '🥄', name: 'Spoon' }, { id: 'bread', emoji: '🍞', name: 'Bread' }, { id: 'jam', emoji: '🍯', name: 'Honey Jar' },
                { id: 'apple', emoji: '🍎', name: 'Apple' }, { id: 'carrot', emoji: '🥕', name: 'Carrot' }, { id: 'fish', emoji: '🐟', name: 'Fish Flakes' }, { id: 'egg', emoji: '🥚', name: 'Egg Crumble' },
                { id: 'berry', emoji: '🫐', name: 'Berry Puree' }, { id: 'oats', emoji: '🌾', name: 'Oats' }
            ] },
            { id: 'deck_sky_festival', theme: 'Sky Festival', difficulty: 3, season: 'summer', pairs: [
                { id: 'kite', emoji: '🪁', name: 'Kite' }, { id: 'cloud', emoji: '☁️', name: 'Cloud' }, { id: 'star', emoji: '⭐', name: 'Star' }, { id: 'lantern', emoji: '🏮', name: 'Sky Lantern' },
                { id: 'feather', emoji: '🪶', name: 'Feather' }, { id: 'compass', emoji: '🧭', name: 'Wind Compass' }, { id: 'ribbon', emoji: '🎐', name: 'Cloud Ribbon' }, { id: 'spark', emoji: '✨', name: 'Stardust' },
                { id: 'moon', emoji: '🌙', name: 'Moon Token' }, { id: 'sun', emoji: '☀️', name: 'Sun Token' }
            ] }
        ]
    });

    addPack({
        id: 'starter_cooking_recipes_v1',
        version: '1.0.0',
        type: 'cooking',
        items: [
            { id: 'ingredient_honey', kind: 'ingredient', icon: '🍯', name: 'Honey Drizzle' },
            { id: 'ingredient_seaweed', kind: 'ingredient', icon: '🌿', name: 'Seaweed Ribbon' },
            { id: 'ingredient_cocoa', kind: 'ingredient', icon: '🍫', name: 'Cocoa Dust' },
            { id: 'ingredient_rice', kind: 'ingredient', icon: '🍚', name: 'Rice Puffs' },
            { id: 'ingredient_clam', kind: 'ingredient', icon: '🦪', name: 'Clam Bits' },
            { id: 'ingredient_herb', kind: 'ingredient', icon: '🌱', name: 'Garden Herb' },

            { id: 'recipe_garden_crunch', name: 'Garden Crunch', ingredients: ['carrot', 'apple', 'herb'], difficulty: 'easy', rewardProfile: { specialFood: 1 }, tags: ['garden', 'fresh'], steps: ['Slice', 'Mix', 'Serve'], timingWindows: [1000, 1200, 900] },
            { id: 'recipe_sunny_oat_bites', name: 'Sunny Oat Bites', ingredients: ['oats', 'honey', 'apple'], difficulty: 'easy', rewardProfile: { specialFood: 1 }, tags: ['sweet', 'special'], steps: ['Blend', 'Shape', 'Bake'], timingWindows: [900, 1300, 1100] },
            { id: 'recipe_pond_picnic_mix', name: 'Pond Picnic Mix', ingredients: ['fish', 'mint', 'rice'], difficulty: 'medium', rewardProfile: { specialFood: 2 }, tags: ['pond'], steps: ['Flake', 'Steam', 'Cool'], timingWindows: [1100, 1400, 1000] },
            { id: 'recipe_forest_trail_stew', name: 'Forest Trail Stew', ingredients: ['pumpkin', 'berry', 'herb'], difficulty: 'medium', rewardProfile: { specialFood: 2 }, tags: ['forest', 'special'], steps: ['Mash', 'Simmer', 'Finish'], timingWindows: [1200, 1500, 1100] },
            { id: 'recipe_moonlight_meringue', name: 'Moonlight Meringue', ingredients: ['egg', 'cocoa', 'honey'], difficulty: 'hard', rewardProfile: { specialFood: 2 }, tags: ['night', 'dessert'], steps: ['Whip', 'Fold', 'Set'], timingWindows: [900, 900, 900] },
            { id: 'recipe_reef_rice_bowl', name: 'Reef Rice Bowl', ingredients: ['fish', 'rice', 'seaweed'], difficulty: 'medium', rewardProfile: { specialFood: 2 }, tags: ['beach', 'special'], steps: ['Steam', 'Layer', 'Garnish'], timingWindows: [1100, 1000, 1200] },
            { id: 'recipe_tide_shell_chowder', name: 'Tide Shell Chowder', ingredients: ['clam', 'pumpkin', 'mint'], difficulty: 'hard', rewardProfile: { specialFood: 3 }, tags: ['beach'], steps: ['Prep', 'Simmer', 'Serve'], timingWindows: [1000, 1600, 1000] },
            { id: 'recipe_berry_cloud_puffs', name: 'Berry Cloud Puffs', ingredients: ['berry', 'egg', 'rice'], difficulty: 'medium', rewardProfile: { specialFood: 2 }, tags: ['festival', 'sweet'], steps: ['Whisk', 'Fold', 'Plate'], timingWindows: [1000, 1100, 1000] },
            { id: 'recipe_autumn_hearth_mash', name: 'Autumn Hearth Mash', ingredients: ['pumpkin', 'oats', 'honey'], difficulty: 'easy', rewardProfile: { specialFood: 1 }, tags: ['autumn'], steps: ['Heat', 'Mash', 'Serve'], timingWindows: [1000, 1200, 900] },
            { id: 'recipe_mint_meadow_scramble', name: 'Mint Meadow Scramble', ingredients: ['egg', 'mint', 'herb'], difficulty: 'easy', rewardProfile: { specialFood: 1 }, tags: ['spring'], steps: ['Crack', 'Stir', 'Plate'], timingWindows: [1000, 900, 900] },
            { id: 'recipe_sky_spark_snack', name: 'Sky Spark Snack', ingredients: ['apple', 'berry', 'honey'], difficulty: 'easy', rewardProfile: { specialFood: 1 }, tags: ['festival', 'special'], steps: ['Dice', 'Drizzle', 'Serve'], timingWindows: [900, 900, 700] }
        ]
    });

    addPack({
        id: 'starter_fishing_catch_pack_v1',
        version: '1.0.0',
        type: 'fishing',
        items: [
            { id: 'catch_sunfin', name: 'Sunfin Minnow', emoji: '🐟', rarity: 'common', biomes: ['pond', 'any'], seasons: ['spring', 'summer'], flavor: 'It flashes gold when it turns in the light.' },
            { id: 'catch_mosscarp', name: 'Moss Carp', emoji: '🐠', rarity: 'common', biomes: ['pond'], seasons: ['spring', 'autumn'], flavor: 'Bits of pondweed cling to its fins like a tiny cape.' },
            { id: 'catch_ripple_perch', name: 'Ripple Perch', emoji: '🐟', rarity: 'common', biomes: ['pond'], times: ['day', 'sunrise'], flavor: 'It darts in short bursts and loves calm water.' },
            { id: 'catch_moon_guppy', name: 'Moon Guppy', emoji: '🐟', rarity: 'uncommon', biomes: ['pond'], times: ['night', 'sunset'], flavor: 'Its scales look silver-blue under night skies.' },
            { id: 'catch_lantern_koi', name: 'Lantern Koi', emoji: '🎏', rarity: 'rare', biomes: ['pond'], times: ['sunset', 'night'], flavor: 'Its fins glow softly like paper lanterns at dusk.' },
            { id: 'catch_shellskip', name: 'Shellskip', emoji: '🐡', rarity: 'common', biomes: ['beach'], seasons: ['summer'], flavor: 'A tiny hopper that skims tide pools.' },
            { id: 'catch_seaglass_sprat', name: 'Sea Glass Sprat', emoji: '🐟', rarity: 'uncommon', biomes: ['beach'], flavor: 'You can almost see the water through its scales.' },
            { id: 'catch_tide_ribbon_eel', name: 'Tide Ribbon Eel', emoji: '🪱', rarity: 'rare', biomes: ['beach'], times: ['night'], flavor: 'It twists like a streamer caught in the surf.' },
            { id: 'catch_cloud_scale', name: 'Cloudscale Fry', emoji: '🐟', rarity: 'uncommon', biomes: ['indoor', 'pond', 'any'], flavor: 'The scales are pale and puffy like tiny clouds.' },
            { id: 'catch_reef_pebblefish', name: 'Pebblefish', emoji: '🐠', rarity: 'common', biomes: ['beach', 'any'], flavor: 'Small, round, and colored like shoreline stones.' },
            { id: 'catch_spark_tetra', name: 'Spark Tetra', emoji: '✨', rarity: 'rare', biomes: ['pond'], seasons: ['winter', 'autumn'], flavor: 'A glittering catch that leaves a shimmer on the line.' },
            { id: 'catch_frost_goby', name: 'Frost Goby', emoji: '🐟', rarity: 'uncommon', biomes: ['pond'], seasons: ['winter'], flavor: 'Cool to the touch and quick as a snowflake gust.' }
        ]
    });

    addPack({
        id: 'starter_coloring_templates_v1',
        version: '1.0.0',
        type: 'coloring',
        items: [
            { id: 'template_meadow_classic', name: 'Sunny Meadow', variant: 'meadow', description: 'A bright outdoor scene with flowers and a tree.' },
            { id: 'template_moonlight_hills', name: 'Moonlight Hills', variant: 'moonlight', description: 'Color a calm night sky with hills and a glowing moon.' },
            { id: 'template_pond_day', name: 'Pond Picnic', variant: 'pond', description: 'A pond scene with reeds and water to paint.' },
            { id: 'template_festival_bunting', name: 'Festival Yard', variant: 'festival', description: 'Banners and lanterns decorate the scene for celebration.' },
            { id: 'template_moon_pond', name: 'Moon Pond', variant: 'pond', description: 'A pond template that feels great for cool palettes.' },
            { id: 'template_night_festival', name: 'Night Festival', variant: 'festival', description: 'Lanterns and banners are perfect for bold color combos.' }
        ]
    });

    addPack({
        id: 'starter_tournament_rivals_names_v1',
        version: '1.0.0',
        type: 'tournaments',
        items: [
            { id: 'tour_ivy', name: 'Ivy' }, { id: 'tour_comet', name: 'Comet' }, { id: 'tour_marble', name: 'Marble' }, { id: 'tour_pepper', name: 'Pepper' }, { id: 'tour_willow', name: 'Willow' },
            { id: 'tour_fable', name: 'Fable' }, { id: 'tour_orbit', name: 'Orbit' }, { id: 'tour_hazel', name: 'Hazel' }, { id: 'tour_miso', name: 'Miso' }, { id: 'tour_saffron', name: 'Saffron' },
            { id: 'tour_tango', name: 'Tango' }, { id: 'tour_pixel', name: 'Pixel' }, { id: 'tour_drift', name: 'Drift' }, { id: 'tour_glint', name: 'Glint' }, { id: 'tour_toffee', name: 'Toffee' }
        ]
    });

    addPack({
        id: 'starter_rivals_expansion_v1',
        version: '1.0.0',
        type: 'rivals',
        items: [
            { id: 'rival_aria_ranger', data: { id: 'rival_aria_ranger', name: 'Aria', emoji: '🧭', title: 'Trail Ranger', petType: 'frog', petName: 'Pebble', stats: { hunger: 74, cleanliness: 72, happiness: 78, energy: 81 }, difficulty: 5, battleHP: 84, winMessage: 'Pebble learned a lot from that match!', loseMessage: 'Trail training pays off!', minRivalsDefeated: 4 } },
            { id: 'rival_bex_mechanic', data: { id: 'rival_bex_mechanic', name: 'Bex', emoji: '🛠️', title: 'Workshop Mechanic', petType: 'dog', petName: 'Bolt', stats: { hunger: 82, cleanliness: 76, happiness: 80, energy: 88 }, difficulty: 6, battleHP: 95, winMessage: 'Bolt will be tuning our strategy tonight.', loseMessage: 'Bolt loves a clean victory lap!', minRivalsDefeated: 5 } },
            { id: 'rival_nova_stargazer', data: { id: 'rival_nova_stargazer', name: 'Nova', emoji: '🔭', title: 'Stargazer Ace', petType: 'bird', petName: 'Aster', stats: { hunger: 80, cleanliness: 84, happiness: 90, energy: 86 }, difficulty: 7, battleHP: 108, winMessage: 'Aster says you fight like a meteor shower!', loseMessage: 'Aster read your moves in the stars!', minRivalsDefeated: 6 } },
            { id: 'rival_lily_rematch_t1', data: { id: 'rival_lily_rematch_t1', name: 'Lily', emoji: '👧', title: 'Junior Trainer (Rematch)', petType: 'bunny', petName: 'Cotton II', stats: { hunger: 68, cleanliness: 66, happiness: 74, energy: 72 }, difficulty: 4, battleHP: 78, winMessage: 'Cotton II bounced back stronger!', loseMessage: 'We practiced for this rematch!', variantOf: 'rival_1', rematchTier: 1, unlockAfterIndex: 7, minRivalsDefeated: 7 } },
            { id: 'rival_max_autumn_variant', data: { id: 'rival_max_autumn_variant', name: 'Max', emoji: '🍂', title: 'Skilled Trainer · Autumn Cup', petType: 'dog', petName: 'Maple Rex', stats: { hunger: 78, cleanliness: 68, happiness: 82, energy: 84 }, difficulty: 5, battleHP: 88, winMessage: 'Maple Rex had fun out there!', loseMessage: 'Autumn training hits different!', variantOf: 'rival_2', rematchTier: 1, minRivalsDefeated: 6 } },
            { id: 'rival_sara_shadow_rematch', data: { id: 'rival_sara_shadow_rematch', name: 'Sara', emoji: '🌙', title: 'Expert Trainer · Night Rematch', petType: 'cat', petName: 'Umbra', stats: { hunger: 84, cleanliness: 82, happiness: 86, energy: 84 }, difficulty: 7, battleHP: 112, winMessage: 'Umbra respects your focus.', loseMessage: 'Umbra struck in the shadows!', variantOf: 'rival_3', rematchTier: 2, unlockAfterIndex: 8, minRivalsDefeated: 8 } },
            { id: 'rival_prof_oak_master', data: { id: 'rival_prof_oak_master', name: 'Prof. Oak', emoji: '📚', title: 'Veteran Trainer · Master Circuit', petType: 'turtle', petName: 'Elder Root', stats: { hunger: 88, cleanliness: 90, happiness: 85, energy: 82 }, difficulty: 8, battleHP: 118, winMessage: 'A thoughtful victory. Well earned.', loseMessage: 'Elder Root endured every trick.', variantOf: 'rival_4', rematchTier: 2, minRivalsDefeated: 9 } },
            { id: 'rival_luna_astral', data: { id: 'rival_luna_astral', name: 'Luna', emoji: '🌌', title: 'Mystic Trainer · Astral Path', petType: 'unicorn', petName: 'Nebula', stats: { hunger: 90, cleanliness: 92, happiness: 95, energy: 90 }, difficulty: 9, battleHP: 130, winMessage: 'Nebula bows to your radiant strategy.', loseMessage: 'Nebula shines through every opening!', rematchTier: 3, minRivalsDefeated: 10 } },
            { id: 'rival_drake_inferno_prime', data: { id: 'rival_drake_inferno_prime', name: 'Drake', emoji: '🔥', title: 'Champion Trainer · Prime Rematch', petType: 'dragon', petName: 'Inferno Prime', stats: { hunger: 96, cleanliness: 88, happiness: 96, energy: 98 }, difficulty: 10, battleHP: 145, winMessage: 'A champion acknowledges another champion.', loseMessage: 'Inferno Prime still rules the arena!', variantOf: 'rival_6', rematchTier: 3, minRivalsDefeated: 11 } }
        ]
    });

    addPack({
        id: 'starter_bosses_variants_v1',
        version: '1.0.0',
        type: 'bosses',
        items: [
            { id: 'springThornWarden', data: { name: 'Thorn Warden', emoji: '🌿🛡️', season: 'spring', type: 'hedgehog', maxHP: 140, attack: 9, defense: 8, moves: [ { name: 'Bramble Burst', emoji: '🌿', power: 14 }, { name: 'Root Snare', emoji: '🪢', power: 12 }, { name: 'Bloom Guard', emoji: '🌸', power: 6, healSelf: 14 } ], rewards: { happiness: 24, sticker: 'verdantWardenSeal' }, victoryMessage: 'The Thorn Warden bows and sinks back into the grove.' } },
            { id: 'summerInfernoRematch', data: { name: 'Sun Scorcher EX', emoji: '☀️🔥', season: 'summer', type: 'dragon', maxHP: 175, attack: 12, defense: 5, rematchTier: 1, rematchRequiresBossesDefeated: 3, moves: [ { name: 'Heat Wave+', emoji: '🔥', power: 16 }, { name: 'Solar Beam+', emoji: '☀️', power: 22 }, { name: 'Mirage Veil', emoji: '🌊', power: 7, healSelf: 16 } ], rewards: { happiness: 28, energy: 18 }, victoryMessage: 'The EX scorcher collapses into a halo of warm sparks.' } },
            { id: 'cavernBellTyrant', data: { name: 'Cavern Bell Tyrant', emoji: '🔔🕳️', season: null, type: 'turtle', maxHP: 165, attack: 10, defense: 9, rematchRequiresBossesDefeated: 2, moves: [ { name: 'Echo Slam', emoji: '🔔', power: 17 }, { name: 'Stone Roll', emoji: '🪨', power: 14 }, { name: 'Resonance Shell', emoji: '🎵', power: 5, healSelf: 18 } ], rewards: { happiness: 20, energy: 16, hunger: 10 }, victoryMessage: 'The cave quiets as the bell tyrant’s echoes fade.' } },
            { id: 'skyAegisSeraph', data: { name: 'Sky Aegis Seraph', emoji: '🪽✨', season: null, type: 'pegasus', maxHP: 185, attack: 11, defense: 8, rematchRequiresBossesDefeated: 4, moves: [ { name: 'Feather Lance', emoji: '🪶', power: 18 }, { name: 'Aegis Spiral', emoji: '🌀', power: 15 }, { name: 'Dawn Mend', emoji: '🌤️', power: 6, healSelf: 20 } ], rewards: { happiness: 30, energy: 20 }, victoryMessage: 'The Seraph ascends, leaving a trail of silver feathers.' } } 
        ]
    });

    addPack({
        id: 'starter_loot_biome_expansion_v1',
        version: '1.0.0',
        type: 'loot',
        items: [
            { id: 'dewLanternSeed', kind: 'lootItem', data: { id: 'dewLanternSeed', name: 'Dew Lantern Seed', emoji: '💧', rarity: 'uncommon', flavorText: 'A pale seed that glows faintly at dawn, wrapped in a cool film of dew.' } },
            { id: 'barkWhistle', kind: 'lootItem', data: { id: 'barkWhistle', name: 'Bark Whistle', emoji: '🎵', rarity: 'common', flavorText: 'Carved from fallen branchwood. It sings a soft forest note when the wind passes through.' } },
            { id: 'shoreKnot', kind: 'lootItem', data: { id: 'shoreKnot', name: 'Shore Knot', emoji: '🪢', rarity: 'common', flavorText: 'A sailor’s knot tied with sea-worn twine and tiny shell beads.' } },
            { id: 'saltPrism', kind: 'lootItem', data: { id: 'saltPrism', name: 'Salt Prism', emoji: '🔷', rarity: 'uncommon', flavorText: 'Crystalline salt catches the light in rainbow fragments.' } },
            { id: 'peakBell', kind: 'lootItem', data: { id: 'peakBell', name: 'Peak Bell', emoji: '🔔', rarity: 'uncommon', flavorText: 'A tiny bell tuned by mountain wind and thin air.' } },
            { id: 'stormQuartz', kind: 'lootItem', data: { id: 'stormQuartz', name: 'Storm Quartz', emoji: '⚡', rarity: 'rare', flavorText: 'A crackling quartz shard that hums before rain.' } },
            { id: 'echoShard', kind: 'lootItem', data: { id: 'echoShard', name: 'Echo Shard', emoji: '🧿', rarity: 'uncommon', flavorText: 'Tap it lightly and it returns the sound a heartbeat later.' } },
            { id: 'caveMossInk', kind: 'lootItem', data: { id: 'caveMossInk', name: 'Cave Moss Ink', emoji: '🖋️', rarity: 'common', flavorText: 'A rich green-black pigment made from glowing cave moss.' } },
            { id: 'skyPetal', kind: 'lootItem', data: { id: 'skyPetal', name: 'Sky Petal', emoji: '🌸', rarity: 'uncommon', flavorText: 'A flower petal from a cloud garden that never wilts.' } },
            { id: 'updraftToken', kind: 'lootItem', data: { id: 'updraftToken', name: 'Updraft Token', emoji: '🪙', rarity: 'rare', flavorText: 'Warm on one side, cool on the other, like a pocket weather vane.' } },
            { id: 'coralScript', kind: 'lootItem', data: { id: 'coralScript', name: 'Coral Script', emoji: '📜', rarity: 'uncommon', flavorText: 'Waterproof parchment etched with looping reef symbols.' } },
            { id: 'abyssPearl', kind: 'lootItem', data: { id: 'abyssPearl', name: 'Abyss Pearl', emoji: '⚪', rarity: 'rare', flavorText: 'A pearl so dark it reflects light as midnight blue.' } },
            { id: 'zephyrThread', kind: 'lootItem', data: { id: 'zephyrThread', name: 'Zephyr Thread', emoji: '🧵', rarity: 'common', flavorText: 'Light, strong thread spun from wind temple fibers.' } },
            { id: 'featherRune', kind: 'lootItem', data: { id: 'featherRune', name: 'Feather Rune', emoji: '🪶', rarity: 'rare', flavorText: 'A rune-etched feather that vibrates near updrafts.' } },

            { id: 'table_forest_expanded', kind: 'biomeLootTable', biomeId: 'forest', entries: [
                { id: 'forestCharm', weight: 8, min: 1, max: 2 }, { id: 'mossStone', weight: 8, min: 1, max: 2 }, { id: 'berryBundle', weight: 7, min: 1, max: 2 }, { id: 'ancientCoin', weight: 4, min: 1, max: 1 },
                { id: 'dewLanternSeed', weight: 4, min: 1, max: 1 }, { id: 'barkWhistle', weight: 5, min: 1, max: 1 }, { id: 'glowMushroom', weight: 3, min: 1, max: 2 }, { id: 'runeFragment', weight: 1.5, min: 1, max: 1 }
            ] },
            { id: 'table_beach_expanded', kind: 'biomeLootTable', biomeId: 'beach', entries: [
                { id: 'sunShell', weight: 8, min: 1, max: 2 }, { id: 'seaGlass', weight: 6, min: 1, max: 2 }, { id: 'tidePearl', weight: 1.6, min: 1, max: 1 }, { id: 'ancientCoin', weight: 3, min: 1, max: 1 },
                { id: 'shoreKnot', weight: 5, min: 1, max: 1 }, { id: 'saltPrism', weight: 4, min: 1, max: 1 }, { id: 'coralScript', weight: 2.5, min: 1, max: 1 }, { id: 'abyssPearl', weight: 0.9, min: 1, max: 1 }
            ] },
            { id: 'table_mountain_expanded', kind: 'biomeLootTable', biomeId: 'mountain', entries: [
                { id: 'summitCrystal', weight: 1.8, min: 1, max: 1 }, { id: 'eagleFeather', weight: 5, min: 1, max: 2 }, { id: 'emberOre', weight: 5, min: 1, max: 2 }, { id: 'mysteryMap', weight: 1.7, min: 1, max: 1 },
                { id: 'peakBell', weight: 4, min: 1, max: 1 }, { id: 'stormQuartz', weight: 1.2, min: 1, max: 1 }, { id: 'windCompass', weight: 2.3, min: 1, max: 1 }
            ] },
            { id: 'table_cave_expanded', kind: 'biomeLootTable', biomeId: 'cave', entries: [
                { id: 'caveLantern', weight: 5, min: 1, max: 1 }, { id: 'glowMushroom', weight: 7, min: 1, max: 2 }, { id: 'runeFragment', weight: 1.8, min: 1, max: 1 }, { id: 'ancientCoin', weight: 4, min: 1, max: 1 },
                { id: 'echoShard', weight: 4, min: 1, max: 1 }, { id: 'caveMossInk', weight: 5, min: 1, max: 2 }, { id: 'mysteryMap', weight: 1.2, min: 1, max: 1 }
            ] },
            { id: 'table_skyIsland_expanded', kind: 'biomeLootTable', biomeId: 'skyIsland', entries: [
                { id: 'cloudRibbon', weight: 6, min: 1, max: 1 }, { id: 'stardust', weight: 2.2, min: 1, max: 1 }, { id: 'windCompass', weight: 4, min: 1, max: 1 }, { id: 'skyLantern', weight: 2, min: 1, max: 1 },
                { id: 'skyPetal', weight: 4, min: 1, max: 2 }, { id: 'updraftToken', weight: 1.4, min: 1, max: 1 }, { id: 'zephyrThread', weight: 5, min: 1, max: 2 }
            ] },
            { id: 'table_underwater_expanded', kind: 'biomeLootTable', biomeId: 'underwater', entries: [
                { id: 'bubbleGem', weight: 1.8, min: 1, max: 1 }, { id: 'coralCrown', weight: 5, min: 1, max: 1 }, { id: 'tidePearl', weight: 1.4, min: 1, max: 1 }, { id: 'seaGlass', weight: 6, min: 1, max: 2 },
                { id: 'coralScript', weight: 4, min: 1, max: 1 }, { id: 'abyssPearl', weight: 0.8, min: 1, max: 1 }, { id: 'saltPrism', weight: 3.5, min: 1, max: 1 }
            ] },
            { id: 'table_skyZone_expanded', kind: 'biomeLootTable', biomeId: 'skyZone', entries: [
                { id: 'windCompass', weight: 4, min: 1, max: 1 }, { id: 'skyLantern', weight: 2.2, min: 1, max: 1 }, { id: 'stardust', weight: 2, min: 1, max: 1 }, { id: 'cloudRibbon', weight: 5, min: 1, max: 1 },
                { id: 'featherRune', weight: 1.3, min: 1, max: 1 }, { id: 'zephyrThread', weight: 4, min: 1, max: 2 }, { id: 'updraftToken', weight: 1.1, min: 1, max: 1 }
            ] }
        ]
    });

    (function addBiomeTextPacks() {
        const biomeTextItems = [];
        const biomeEvents = {
            forest: [
                'A ring of mushrooms glowed softly beside the trail, and {name} carefully stepped between them.',
                '{name} found fresh pawprints near a mossy log and followed them to a hidden clearing.',
                'Sunlight broke through the canopy in bright stripes while {name} sniffed out a tucked-away charm.'
            ],
            beach: [
                '{name} chased foam patterns across wet sand and uncovered a shell hidden beneath the tide line.',
                'A driftwood arch creaked in the breeze as {name} explored tiny tide pools beneath it.',
                '{name} found a smooth patch of sea glass where waves had sorted treasures by color.'
            ],
            mountain: [
                'Wind sang through the rocks and {name} discovered a crystal seam glittering in the cliff face.',
                '{name} paused at a narrow ledge where the clouds passed below like a river.',
                'A mountain bell echoed from somewhere above, and {name} followed the sound to a cache.'
            ],
            cave: [
                'Drops fell in a steady rhythm while {name} crossed a cavern lit by glow mushrooms.',
                '{name} found chalk marks from old explorers pointing toward a safe tunnel fork.',
                'The cave walls hummed faintly when {name} brushed a rune fragment clean.'
            ],
            skyIsland: [
                '{name} bounded across cloud-soft grass and discovered petals that shimmered in the air.',
                'A floating stone bridge swayed gently while {name} collected wind-laced trinkets.',
                '{name} watched tiny cloud fish drift between island roots before moving on.'
            ],
            underwater: [
                'Currents carried glowing plankton around {name} like a tiny parade of stars.',
                '{name} explored coral arches and found a pearl tucked under a waving anemone.',
                'A bubble trail led {name} to an old chest wedged in reef stone.'
            ],
            skyZone: [
                '{name} rode a warm updraft through a ring of chimes hanging in open sky.',
                'Feathers spiraled around {name} at a sky shrine before settling into a neat path.',
                'High above the clouds, {name} found a still pocket of air and a hidden token.'
            ]
        };
        const npcEvents = {
            forest: [
                '{npcName} peeked from behind a fern and offered to show the best berry patches in {biome}.',
                'A rustle in the brush revealed {npcName}, who had been guarding a very important acorn in {biome}.'
            ],
            beach: [
                '{npcName} bounced along the surf and proudly showed off a shell collection from {biome}.',
                'You met {npcName} near a tide pool in {biome}, where they were watching tiny fish swirl.'
            ],
            mountain: [
                '{npcName} appeared on a high ledge in {biome} and whistled a safe path down.',
                'A distant chirp led to {npcName}, who was caching shiny pebbles in {biome}.'
            ],
            cave: [
                '{npcName} emerged from the glow and tapped the cave wall like they knew every echo in {biome}.',
                'You spotted {npcName} balancing on a stone in {biome}, listening for dripping-water rhythms.'
            ],
            skyIsland: [
                '{npcName} drifted in on a breeze and invited you to race across the cloud roots of {biome}.',
                'A feather shower marked the arrival of {npcName}, a friendly scout from {biome}.'
            ],
            underwater: [
                '{npcName} swam in a wide circle and nudged a coral path open in {biome}.',
                'You found {npcName} carefully stacking shells beside a reef shelf in {biome}.'
            ],
            skyZone: [
                '{npcName} rode a thermal through {biome} and taught you how to read the wind chimes.',
                'A spiraling feather rune led to {npcName}, who knew hidden currents in {biome}.'
            ]
        };
        Object.keys(biomeEvents).forEach((biomeId) => {
            biomeEvents[biomeId].forEach((text, idx) => biomeTextItems.push({ id: `event_${biomeId}_${idx + 1}`, biomeId, kind: 'event', text }));
            (npcEvents[biomeId] || []).forEach((text, idx) => biomeTextItems.push({ id: `npc_${biomeId}_${idx + 1}`, biomeId, kind: 'npc', text }));
        });
        addPack({ id: 'starter_biome_events_and_npcs_v1', version: '1.0.0', type: 'biomeEvents', items: biomeTextItems });
    })();

    addPack({
        id: 'starter_tasks_rotation_v1',
        version: '1.0.0',
        type: 'tasks',
        items: [
            { id: 'daily_fish_focus', kind: 'dailyTemplate', lane: 'mode', data: { id: 'daily_fish_focus', nameTemplate: 'Catch {target} fish in mini-games', icon: '🎣', target: 2, maxTarget: 4, trackKey: 'minigameCount', lane: 'mode' } },
            { id: 'daily_arcade_run', kind: 'dailyTemplate', lane: 'mode', data: { id: 'daily_arcade_run', nameTemplate: 'Play {target} arcade-style mini-game{plural}', icon: '🕹️', target: 2, maxTarget: 4, trackKey: 'minigameCount', lane: 'mode' } },
            { id: 'daily_cleanup_care', kind: 'dailyTemplate', lane: 'fixed', data: { id: 'daily_cleanup_care', nameTemplate: 'Do {target} wash or groom-style care actions', icon: '🫧', target: 4, maxTarget: 8, trackKey: 'totalCareActions', lane: 'fixed' } },
            { id: 'daily_competition_push', kind: 'dailyTemplate', lane: 'mode', data: { id: 'daily_competition_push', nameTemplate: 'Win progress by finishing {target} competition battle{plural}', icon: '⚔️', target: 1, maxTarget: 3, trackKey: 'battleCount', lane: 'mode', minStage: 'child' } },
            { id: 'daily_bond_journal', kind: 'dailyTemplate', lane: 'wildcard', data: { id: 'daily_bond_journal', nameTemplate: 'Trigger {target} bond moment{plural}', icon: '💞', target: 2, maxTarget: 4, trackKey: 'bondEvents', lane: 'wildcard', minStage: 'child' } },
            { id: 'daily_explorer_loop', kind: 'dailyTemplate', lane: 'mode', data: { id: 'daily_explorer_loop', nameTemplate: 'Complete {target} exploration run{plural}', icon: '🧭', target: 2, maxTarget: 3, trackKey: 'expeditionCount', lane: 'mode' } },
            { id: 'daily_mastery_burst', kind: 'dailyTemplate', lane: 'wildcard', data: { id: 'daily_mastery_burst', nameTemplate: 'Gain {target} mastery point{plural}', icon: '🎯', target: 3, maxTarget: 7, trackKey: 'masteryPoints', lane: 'wildcard', minStage: 'adult' } },
            { id: 'daily_discovery_scout', kind: 'dailyTemplate', lane: 'wildcard', data: { id: 'daily_discovery_scout', nameTemplate: 'Discover {target} wild encounter{plural}', icon: '✨', target: 2, maxTarget: 4, trackKey: 'discoveryEvents', lane: 'wildcard' } },

            { id: 'arc_minigame_marathon', kind: 'weeklyArc', data: { id: 'arc_minigame_marathon', theme: 'Arcade Marathon Week', icon: '🕹️', tasks: [
                { id: 'arc-play-many', icon: '🎮', trackKey: 'minigameCount', target: 10, nameTemplate: 'Play {target} mini-games' },
                { id: 'arc-battle-cross', icon: '⚔️', trackKey: 'battleCount', target: 4, nameTemplate: 'Finish {target} competition battles' },
                { id: 'arc-expedition-cross', icon: '🧭', trackKey: 'expeditionCount', target: 3, nameTemplate: 'Complete {target} expeditions' }
            ], finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arcade Marathon Reward' } } },
            { id: 'arc_culinary_current', kind: 'weeklyArc', data: { id: 'arc_culinary_current', theme: 'Culinary Current Week', icon: '🍲', tasks: [
                { id: 'arc-feed-current', icon: '🍎', trackKey: 'feedCount', target: 10, nameTemplate: 'Feed {target} times' },
                { id: 'arc-care-current', icon: '💝', trackKey: 'totalCareActions', target: 16, nameTemplate: 'Do {target} care actions' },
                { id: 'arc-discovery-current', icon: '✨', trackKey: 'discoveryEvents', target: 6, nameTemplate: 'Find {target} discovery events' }
            ], finaleReward: { bundleId: 'weeklyArcFinale', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Culinary Current Reward' } } },

            { id: 'modifier_precisionFocus', kind: 'rewardModifier', data: { id: 'precisionFocus', name: 'Precision Focus', emoji: '🎯', description: '+20% competition rewards for the next 1 match', effect: { type: 'competitionRewardMultiplier', multiplier: 1.2, remainingMatches: 1 } } },
            { id: 'modifier_explorerStride', kind: 'rewardModifier', data: { id: 'explorerStride', name: 'Explorer Stride', emoji: '🧭', description: '+1 loot roll on the next expedition', effect: { type: 'nextExpeditionBonusRolls', rolls: 1 } } }
        ]
    });

    addPack({
        id: 'starter_rule_modifiers_v1',
        version: '1.0.0',
        type: 'ruleModifiers',
        items: [
            { id: 'trivia_lightning_round', kind: 'minigameRule', scopes: ['trivia'], weight: 2, name: 'Lightning Round', description: 'Two extra trivia questions this run.', effect: { extraQuestions: 2 } },
            { id: 'trivia_marathon', kind: 'minigameRule', scopes: ['trivia'], weight: 1, name: 'Marathon Quiz', description: 'One extra question and longer run.', effect: { extraQuestions: 1 } },
            { id: 'matching_big_board', kind: 'minigameRule', scopes: ['matching'], weight: 2, name: 'Big Board', description: 'Extra pairs added if the deck supports it.', effect: { extraPairs: 1 } },
            { id: 'matching_memory_sprint', kind: 'minigameRule', scopes: ['matching'], weight: 1, name: 'Memory Sprint', description: 'A denser deck for stronger scores.', effect: { extraPairs: 2 } },
            { id: 'cooking_specials_forest', kind: 'minigameRule', scopes: ['cooking'], weight: 2, name: 'Forest Specials', description: 'Cooking orders favor forest recipes this rotation.', effect: { preferTag: 'forest' } },
            { id: 'cooking_specials_festival', kind: 'minigameRule', scopes: ['cooking'], weight: 1, name: 'Festival Specials', description: 'Festival recipes appear more often.', effect: { preferTag: 'festival', extraRounds: 1 } },
            { id: 'fishing_long_session', kind: 'minigameRule', scopes: ['fishing'], weight: 2, name: 'Long Session', description: 'Two extra casts this run.', effect: { extraCasts: 2 } },
            { id: 'fishing_tournament_cast', kind: 'minigameRule', scopes: ['fishing'], weight: 1, name: 'Tournament Cast', description: 'One extra cast with higher pressure.', effect: { extraCasts: 1 } },
            { id: 'coloring_gallery_week', kind: 'minigameRule', scopes: ['coloring'], weight: 1, name: 'Gallery Week', description: 'Rotating templates are featured in the gallery.' , effect: {} },
            { id: 'tournament_open_scoring', kind: 'minigameRule', scopes: ['tournament'], weight: 2, name: 'Open Scoring', description: 'High-variance bracket scoring this week.', effect: { scoreVarianceMultiplier: 1.25 } },
            { id: 'tournament_home_crowd', kind: 'minigameRule', scopes: ['tournament'], weight: 1, name: 'Home Crowd', description: 'You gain a slight score bonus in the bracket.', effect: { playerScoreBonus: 4, coinMultiplier: 1.05 } },
            { id: 'rival_training_day', kind: 'competitionRule', scopes: ['rival'], weight: 2, name: 'Training Day', description: 'Rival rematches pay a little extra.', effect: { coinMultiplier: 1.08, rivalHpMultiplier: 1.02 } },
            { id: 'rival_handicap_circuit', kind: 'competitionRule', scopes: ['rival'], weight: 1, name: 'Handicap Circuit', description: 'Rivals arrive with slightly lower HP for fast runs.', effect: { coinMultiplier: 0.95, rivalHpMultiplier: 0.9 } },
            { id: 'boss_raid_week', kind: 'competitionRule', scopes: ['boss'], weight: 1, name: 'Raid Week', description: 'Bosses are tougher but reward better.', effect: { bossHpMultiplier: 1.08, coinMultiplier: 1.15 } },
            { id: 'boss_recovery_window', kind: 'competitionRule', scopes: ['boss'], weight: 1, name: 'Recovery Window', description: 'Bosses start a bit weaker this rotation.', effect: { bossHpMultiplier: 0.92, coinMultiplier: 0.95 } }
        ]
    });

    addPack({
        id: 'starter_collections_expansion_v1',
        version: '1.0.0',
        type: 'collections',
        items: [
            { id: 'verdantWardenSeal', kind: 'sticker', data: { id: 'verdantWardenSeal', name: 'Verdant Warden Seal', emoji: '🌿', category: 'special', rarity: 'rare', source: 'Defeat the Thorn Warden boss' } },
            { id: 'arcadeRibbon', kind: 'sticker', data: { id: 'arcadeRibbon', name: 'Arcade Ribbon', emoji: '🎮', category: 'fun', rarity: 'uncommon', source: 'Finish Arcade Marathon Week' } },
            { id: 'reefBadgeSticker', kind: 'sticker', data: { id: 'reefBadgeSticker', name: 'Reef Curator', emoji: '🪸', category: 'nature', rarity: 'rare', source: 'Collect reef-themed loot' } },
            { id: 'skyCircuitSticker', kind: 'sticker', data: { id: 'skyCircuitSticker', name: 'Sky Circuit', emoji: '🪽', category: 'special', rarity: 'legendary', source: 'Defeat a sky rematch boss' } },
            { id: 'cookbookStamp', kind: 'sticker', data: { id: 'cookbookStamp', name: 'Cookbook Stamp', emoji: '📖', category: 'fun', rarity: 'common', source: 'Complete Cooking Lab rotations' } },

            { id: 'biomeTreasureHunter', kind: 'badge', data: { id: 'biomeTreasureHunter', name: 'Biome Treasure Hunter', icon: '🧭', description: 'Collect 20 exploration loot items total', category: 'exploration', tier: 'silver', check: (gs) => { const ex = gs.exploration || {}; const inv = ex.lootInventory || {}; return Object.values(inv).reduce((s, v) => s + (Number(v) || 0), 0) >= 20; } } },
            { id: 'rivalRematchReady', kind: 'badge', data: { id: 'rivalRematchReady', name: 'Rematch Ready', icon: '↺', description: 'Defeat 8 rival trainers', category: 'play', tier: 'gold', check: (gs) => ((gs.competition || {}).rivalsDefeated || []).length >= 8 } },
            { id: 'themeCollectorBadge', kind: 'badge', data: { id: 'themeCollectorBadge', name: 'Theme Collector', icon: '🛋️', description: 'Unlock and use room customization themes', category: 'exploration', tier: 'silver', check: (gs) => { const rc = gs.roomCustomizations || {}; return Object.values(rc).some((v) => v && v.theme && v.theme !== 'auto' && v.theme !== 'default'); } } },

            { id: 'expeditionArchivist', kind: 'trophy', data: { id: 'expeditionArchivist', name: 'Expedition Archivist', icon: '🗺️', description: 'Complete 15 expeditions', shelf: 'games', check: (gs) => (((gs.exploration || {}).stats || {}).expeditionsCompleted || 0) >= 15 } },
            { id: 'variantSlayer', kind: 'trophy', data: { id: 'variantSlayer', name: 'Variant Slayer', icon: '👹', description: 'Defeat 3 different bosses', shelf: 'games', check: (gs) => Object.keys(((gs.competition || {}).bossesDefeated) || {}).length >= 3 } },
            { id: 'breedingLorekeeper', kind: 'trophy', data: { id: 'breedingLorekeeper', name: 'Breeding Lorekeeper', icon: '🧬', description: 'Hatch 5 breeding eggs', shelf: 'breeding', check: (gs) => (gs.totalBreedingHatches || 0) >= 5 } },
            { id: 'decorStrategist', kind: 'trophy', data: { id: 'decorStrategist', name: 'Decor Strategist', icon: '🏠', description: 'Use a boosted cosmetic set in any room', shelf: 'dedication', check: (gs) => { const rc = gs.roomCustomizations || {}; const fur = gs.furniture || {}; return Object.entries(rc).some(([roomId, c]) => !!(c && c.theme && c.theme !== 'auto' && ((c.furnitureSlots || []).some((x) => x && x !== 'none') || ((fur[roomId] || {}).decoration && (fur[roomId] || {}).decoration !== 'none')))); } } },

            { id: 'bundle_arcade_marathon_bonus', kind: 'rewardBundle', data: { id: 'bundle_arcade_marathon_bonus', coins: 180, modifierId: 'precisionFocus', collectible: { type: 'sticker', id: 'arcadeRibbon' } } }
        ]
    });

    addPack({
        id: 'starter_room_cosmetics_v1',
        version: '1.0.0',
        type: 'cosmetics',
        items: [
            { id: 'moonpaper', kind: 'roomTheme', data: { id: 'moonpaper', name: 'Moonpaper' } },
            { id: 'greenhouse', kind: 'roomTheme', data: { id: 'greenhouse', name: 'Greenhouse' } },
            { id: 'festival', kind: 'roomTheme', data: { id: 'festival', name: 'Festival' } },

            { id: 'lanternPost', kind: 'roomFurniture', data: { id: 'lanternPost', name: 'Lantern Post', emoji: '🏮' } },
            { id: 'planterWall', kind: 'roomFurniture', data: { id: 'planterWall', name: 'Planter Wall', emoji: '🪴' } },
            { id: 'recipeBoard', kind: 'roomFurniture', data: { id: 'recipeBoard', name: 'Recipe Board', emoji: '🧾' } },
            { id: 'reefTank', kind: 'roomFurniture', data: { id: 'reefTank', name: 'Reef Tank', emoji: '🐠' } },

            { id: 'teaLights', kind: 'decoration', data: { id: 'teaLights', name: 'Tea Lights', emoji: '🕯️', description: 'Warm little candles' } },
            { id: 'reefCoralDecor', kind: 'decoration', data: { id: 'reefCoralDecor', name: 'Reef Coral', emoji: '🪸', description: 'Colorful coral decor' } },
            { id: 'buntingDecor', kind: 'decoration', data: { id: 'buntingDecor', name: 'Bunting', emoji: '🎏', description: 'Festive room bunting' } },

            { id: 'set_arcade_marathon', kind: 'roomCosmeticSet', data: { id: 'set_arcade_marathon', name: 'Arcade Marathon Set', themeId: 'festival', furnitureIds: ['arcadeCabinet', 'lanternPost'], decorationId: 'buntingDecor', unlock: { source: 'tasks', weeklyArc: 'arc_minigame_marathon' } } },
            { id: 'set_explorer_grove', kind: 'roomCosmeticSet', data: { id: 'set_explorer_grove', name: 'Explorer Grove', themeId: 'greenhouse', furnitureIds: ['planterWall', 'shelf'], decorationId: 'plants', unlock: { source: 'exploration', biome: 'forest' } } },
            { id: 'set_moon_studio', kind: 'roomCosmeticSet', data: { id: 'set_moon_studio', name: 'Moon Studio', themeId: 'moonpaper', furnitureIds: ['telescope', 'lanternPost'], decorationId: 'teaLights', unlock: { source: 'competition', bosses: 2 } } },

            { id: 'bonus_arcade_festival_theme', kind: 'roomCosmeticBonus', data: { id: 'bonus_arcade_festival_theme', sourceType: 'theme', sourceId: 'festival', roomId: 'arcade', system: 'minigame', multiplier: 1.03 } },
            { id: 'bonus_observatory_moonpaper', kind: 'roomCosmeticBonus', data: { id: 'bonus_observatory_moonpaper', sourceType: 'theme', sourceId: 'moonpaper', roomId: 'observatory', system: 'exploration', multiplier: 1.03 } },
            { id: 'bonus_garden_greenhouse', kind: 'roomCosmeticBonus', data: { id: 'bonus_garden_greenhouse', sourceType: 'theme', sourceId: 'greenhouse', roomId: 'garden', system: 'exploration', multiplier: 1.04 } },
            { id: 'bonus_reef_tank', kind: 'roomCosmeticBonus', data: { id: 'bonus_reef_tank', sourceType: 'furniture', sourceId: 'reefTank', roomId: '*', system: 'competition', multiplier: 1.02 } },
            { id: 'bonus_set_arcade_marathon', kind: 'roomCosmeticBonus', data: { id: 'bonus_set_arcade_marathon', sourceType: 'set', sourceId: 'set_arcade_marathon', roomId: 'arcade', system: 'minigame', multiplier: 1.04 } },
            { id: 'bonus_set_explorer_grove', kind: 'roomCosmeticBonus', data: { id: 'bonus_set_explorer_grove', sourceType: 'set', sourceId: 'set_explorer_grove', roomId: 'garden', system: 'exploration', multiplier: 1.04 } },
            { id: 'bonus_set_moon_studio', kind: 'roomCosmeticBonus', data: { id: 'bonus_set_moon_studio', sourceType: 'set', sourceId: 'set_moon_studio', roomId: 'observatory', system: 'competition', multiplier: 1.03 } }
        ]
    });

    addPack({
        id: 'starter_breeding_outcomes_v1',
        version: '1.0.0',
        type: 'breeding',
        items: [
            { id: 'aurora', kind: 'mutationColor', data: { name: 'Aurora', hex: '#7DF9FF', description: 'Glows like shifting polar lights' } },
            { id: 'rosequartz', kind: 'mutationColor', data: { name: 'Rose Quartz', hex: '#F7CAC9', description: 'Soft crystal pink with warm sparkle' } },
            { id: 'verdigris', kind: 'mutationColor', data: { name: 'Verdigris', hex: '#43B3AE', description: 'Patina teal with metallic depth' } },
            { id: 'constellation', kind: 'mutationPattern', data: { name: 'Constellation', description: 'Tiny star-linked marks across the coat' } },
            { id: 'tidal', kind: 'mutationPattern', data: { name: 'Tidal', description: 'Layered wave bands and pearl flecks' } },
            { id: 'vinework', kind: 'mutationPattern', data: { name: 'Vinework', description: 'Trailing leaf and branch motifs' } },

            { id: 'skyhound', kind: 'hybridType', data: { name: 'Skyhound', emoji: '🐕', parents: ['dog', 'bird'], colors: ['#87CEEB', '#D4A574', '#FFE4C4', '#B0E0E6', '#FFD700'], sounds: ['Woof-chirp!', '*wing wag*', 'Bark-whistle!'], happySounds: ['Sky zoomies!', 'Wing wag!', 'Cloud fetch!'], sadSounds: ['Droopy ears...', 'Quiet chirp-woof...'], mythical: false, hybrid: true, description: 'A playful hound with gliding feathers and skybound curiosity.' } },
            { id: 'reefkitty', kind: 'hybridType', data: { name: 'Reefkitty', emoji: '🐱', parents: ['cat', 'fish'], colors: ['#00CED1', '#4169E1', '#FFA500', '#87CEFA', '#FFD700'], sounds: ['Mrr-blub!', '*bubble purr*', 'Mew-splash!'], happySounds: ['Bubble purr!', 'Reef pounce!', 'Splashy zoom!'], sadSounds: ['Quiet blub...', 'Soft sea-purr...'], mythical: false, hybrid: true, description: 'A sleek feline swimmer with finned grace and curious whiskers.' } },
            { id: 'lilyhopper', kind: 'hybridType', data: { name: 'Lilyhopper', emoji: '🐸', parents: ['bunny', 'frog'], colors: ['#98FB98', '#FFB6C1', '#FFFFFF', '#32CD32', '#D4A574'], sounds: ['Hop-ribbit!', '*lily splash*', 'Sniff-croak!'], happySounds: ['Pond binky!', 'Splash hop!', 'Happy croak-hop!'], sadSounds: ['Quiet splash...', 'Slow lily hop...'], mythical: false, hybrid: true, description: 'A springy marsh companion with long ears and powerful little hops.' } },

            { id: 'flavor_hybrid_discovery_1', kind: 'outcomeFlavor', text: 'A brand-new lineage has begun, and your nursery feels a little more magical tonight.', onlyHybrid: true },
            { id: 'flavor_hybrid_discovery_2', kind: 'outcomeFlavor', text: 'This hybrid baby carries little hints of both parents in every expression.', onlyHybrid: true },
            { id: 'flavor_mutation_glow_1', kind: 'outcomeFlavor', text: 'There is a rare shimmer in this baby’s traits that catches the light whenever they move.', onlyMutation: true },
            { id: 'flavor_mutation_glow_2', kind: 'outcomeFlavor', text: 'A mutation trait surfaced during incubation, giving this hatchling a one-of-a-kind look.', onlyMutation: true },
            { id: 'flavor_general_gentle_1', kind: 'outcomeFlavor', text: 'The nursery feels warm and quiet, like it knows something special just arrived.' },
            { id: 'flavor_general_gentle_2', kind: 'outcomeFlavor', text: 'Tiny paws, bright eyes, and a whole future of adventures ahead.' },
            { id: 'flavor_general_gentle_3', kind: 'outcomeFlavor', text: 'The family has a new story to tell, starting right now.' },
            { id: 'flavor_reefkitty_1', kind: 'outcomeFlavor', petType: 'reefkitty', text: 'A salty sparkle clings to this little one, like they dreamed of tide pools before hatching.' },
            { id: 'flavor_skyhound_1', kind: 'outcomeFlavor', petType: 'skyhound', text: 'This pup seems ready to chase clouds the moment those tiny wings get stronger.' },
            { id: 'flavor_lilyhopper_1', kind: 'outcomeFlavor', petType: 'lilyhopper', text: 'You can almost hear pond ripples and meadow grass in every tiny bounce.' }
        ]
    });

    // Apply any packs that depend on global constants and run a validation snapshot.
    if (typeof global.reapplyAllContentPacksToGlobals === 'function') {
        global.reapplyAllContentPacksToGlobals();
    }
    if (typeof global.validateContentPacks === 'function') {
        global.validateContentPacks({ log: false });
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
