// ============================================================
// narrative.js  — Memory moments, welcome messages, elder wisdom,
//                  mentoring, caretaker titles & styles, seasonal
//                  events, weather stories, room memories, stat
//                  reactions, neglect recovery, feedback messages,
//                  micro-events, idle monologues, room flavor text,
//                  pet commentary, exploration narratives, milestone
//                  reactions, collectible descriptions & pet diary
// Extracted from constants.js
// ============================================================

// ==================== MEMORY MOMENTS SYSTEM ====================
const MEMORY_MOMENTS = {
    baby: {
        25: {
            lazy: ['{name} fell asleep in their food bowl. Twice.', '{name} found the softest spot in the house and claimed it forever.'],
            energetic: ['{name} tried to chase their own tail and got dizzy!', '{name} bounced off every wall in the room. Literally.'],
            curious: ['{name} just discovered their own reflection and stared at it for 5 minutes.', '{name} tried to figure out where the light switch sound comes from.'],
            shy: ['{name} hid behind the curtain, but their tail was sticking out the whole time.', '{name} peeked at you from behind a pillow for ten minutes straight.'],
            playful: ['{name} turned a sock into their favorite toy. It\'s their best friend now.', '{name} invented a game where they pounce on shadows.'],
            grumpy: ['{name} glared at a butterfly. The butterfly did not care.', '{name} grumbled at their own hiccups.']
        },
        50: {
            lazy: ['{name} perfected the art of sleeping with one eye open.', '{name} dreamed about treats and made little chomping sounds.'],
            energetic: ['{name} discovered running and hasn\'t stopped since!', '{name} tried to play with the vacuum cleaner. It did not go well.'],
            curious: ['{name} figured out how to open the treat cabinet. Uh oh.', '{name} spent an hour watching ants march across the garden.'],
            shy: ['{name} fell asleep on your lap during a thunderstorm. You didn\'t move for an hour.', '{name} brought you their favorite toy — the first time they\'ve shared it.'],
            playful: ['{name} organized all their toys by size. Then knocked them all over.', '{name} learned to play hide and seek. They always hide in the same spot.'],
            grumpy: ['{name} pushed their water bowl an inch to the left. Apparently it was in the wrong spot.', '{name} sat in a sunbeam and almost smiled. Almost.']
        },
        75: {
            lazy: ['{name} has developed a three-nap-per-day routine. Very disciplined.', '{name} sighed contentedly and melted into the couch like butter.'],
            energetic: ['{name} did three laps of the house to celebrate breakfast. Just breakfast.', '{name} brought you a ball at 6 AM. Every. Single. Day.'],
            curious: ['{name} has catalogued every bug in the garden. They have names.', '{name} tried to figure out what "outside the window" is.'],
            shy: ['{name} touched noses with you for the first time. You both froze.', '{name} waited by the door when they heard you coming home.'],
            playful: ['{name} taught themselves a new trick just to impress you!', '{name} stole your shoe and led you on a chase around the house.'],
            grumpy: ['{name} let you pet them for 3 whole seconds before walking away. A new record!', '{name} brought you a dead leaf. It might have been a gift. Maybe.']
        }
    },
    child: {
        25: {
            lazy: ['{name} found an even comfier napping spot. Research is ongoing.', '{name} yawned so big they startled themselves.'],
            energetic: ['{name} learned a new trick and won\'t stop showing it off!', '{name} challenged the neighbor\'s pet to a race through the fence.'],
            curious: ['{name} tried to catch a snowflake and looked genuinely confused when it disappeared.', '{name} discovered the mirror and spent the day making faces at it.'],
            shy: ['{name} made a friend! ...It was a stuffed animal, but it counts.', '{name} bravely explored a new room while holding onto your leg.'],
            playful: ['{name} set up an elaborate obstacle course out of household items.', '{name} tried to sneak a treat from the kitchen counter. So close.'],
            grumpy: ['{name} judged the weather from the window. Unacceptable, apparently.', '{name} reluctantly shared their bed with a stuffed toy. Don\'t tell anyone.']
        },
        50: {
            lazy: ['{name} has mastered the art of the strategic yawn to get belly rubs.', '{name} fell asleep standing up. Impressive, honestly.'],
            energetic: ['{name} found a stick and decided it\'s the best stick in the world.', '{name} ran circles around an elder pet until they got dizzy.'],
            curious: ['{name} tried to understand how the fridge makes food cold. Still working on it.', '{name} followed a butterfly through three rooms.'],
            shy: ['{name} made eye contact with a stranger and handled it like a champion.', '{name} hummed softly while you brushed them. They trust you so much.'],
            playful: ['{name} invented a new game. Nobody else understands the rules.', '{name} hid your keys as a "game." Very funny, {name}.'],
            grumpy: ['{name} tolerated a belly rub for 5 seconds. Personal best!', '{name} complained about dinner, ate all of it, then complained again.']
        },
        75: {
            lazy: ['{name} and you watched the sunset together in comfortable silence.', '{name} dreamed so vividly their paws twitched. Chasing dream-treats, probably.'],
            energetic: ['{name} learned that puddles are for jumping in, not walking around.', '{name} tried to bring the entire park home. Just the good parts.'],
            curious: ['{name} discovered music and tilts their head at every new song.', '{name} learned to open doors. Nothing is safe now.'],
            shy: ['{name} voluntarily sat next to a new visitor. Everyone held their breath.', '{name} sang softly when they thought no one was listening. You were.'],
            playful: ['{name} put on a show for the family. Standing ovation. They bowed.', '{name} found a cardboard box and declared it their castle.'],
            grumpy: ['{name} growled at the rain, then sat watching it for an hour. Complicated feelings.', '{name} saw you were sad and sat next to you. Said nothing. Meant everything.']
        }
    },
    adult: {
        25: {
            lazy: ['{name} has refined lounging to an art form. Truly a master.', '{name} invented a new sleeping position that looks physically impossible.'],
            energetic: ['{name} still has the energy of a baby. Some things never change.', '{name} organized a game with every pet in the house. Team captain energy.'],
            curious: ['{name} reads the expressions on your face and responds perfectly now.', '{name} figured out your daily routine and waits at each spot.'],
            shy: ['{name} gently comforted a scared baby pet. They remember how it feels.', '{name} chose to sit next to you at the window. No words needed.'],
            playful: ['{name} still turns everything into a game. Laundry day is an adventure.', '{name} developed a signature move. It\'s kind of adorable.'],
            grumpy: ['{name} has earned "distinguished grump" status. Wears it with pride.', '{name} secretly saved the best treat for you. Don\'t mention it.']
        },
        50: {
            lazy: ['{name} and you have perfected the lazy Sunday together.', '{name} taught a younger pet the art of the perfect nap.'],
            energetic: ['{name} started the morning with parkour. Off the couch, over the table, into your arms.', '{name} has enough energy to power a small city. Or at least this house.'],
            curious: ['{name} has become the house detective. No crumb goes unexamined.', '{name} watches cooking shows with genuine interest. Taking notes?'],
            shy: ['{name} let a stranger pet them today. You\'ve never been so proud.', '{name} fell asleep in the middle of the living room. Anywhere is safe with you.'],
            playful: ['{name} threw their own surprise party. Everyone was surprised, including {name}.', '{name} learned that the best toy is quality time with you.'],
            grumpy: ['{name} pretended to be annoyed by cuddles, then fell asleep in your arms.', '{name} has a special grumpy face just for you. It means "I love you."']
        },
        75: {
            lazy: ['You and {name} have achieved peak relaxation synchronization.', '{name} sighed so contentedly the whole room felt calmer.'],
            energetic: ['{name} is living proof that joy is a choice. And they choose it every day.', '{name} still gets the zoomies. Some things are eternal.'],
            curious: ['{name} has explored every corner of this world and still finds wonder in it.', '{name} noticed you changed something in the room instantly. Nothing gets past them.'],
            shy: ['{name} initiated a cuddle for the first time. Time stopped for a moment.', '{name} trusts you completely now. It was a long, beautiful journey.'],
            playful: ['{name} taught you a game today. Role reversal! They were very patient.', '{name}\'s favorite game is still whatever game you\'re playing together.'],
            grumpy: ['{name} let their guard down and purred. Don\'t tell anyone. Seriously.', '{name} grumped at a younger pet, then tucked them in. Softie.']
        }
    }
};

function getMemoryMoment(pet) {
    if (!pet) return null;
    const stage = pet.growthStage || 'baby';
    const personality = pet.personality || 'playful';
    const name = pet.name || 'Your pet';
    const ageInHours = typeof getPetAge === 'function' ? getPetAge(pet) : 0;
    const progress = typeof getGrowthProgress === 'function'
        ? getGrowthProgress(pet.careActions || 0, ageInHours, stage, pet.careQuality || 'average')
        : 0;

    if (!MEMORY_MOMENTS[stage]) return null;

    const thresholds = [25, 50, 75];
    const seen = pet._seenMemoryMoments || {};

    for (const threshold of thresholds) {
        if (progress >= threshold && !seen[`${stage}_${threshold}`]) {
            const momentPool = MEMORY_MOMENTS[stage][threshold];
            if (!momentPool) continue;
            const personalityPool = momentPool[personality] || momentPool['playful'];
            if (!personalityPool || personalityPool.length === 0) continue;
            const msg = personalityPool[Math.floor(Math.random() * personalityPool.length)];
            if (!pet._seenMemoryMoments) pet._seenMemoryMoments = {};
            pet._seenMemoryMoments[`${stage}_${threshold}`] = true;
            return msg.replace(/\{name\}/g, name);
        }
    }
    return null;
}

// ==================== WELCOME BACK PERSONALITY MESSAGES ====================
const WELCOME_BACK_MESSAGES = {
    short: {
        lazy: '{name} opens one eye. "Oh, you\'re back already? I barely noticed."',
        energetic: '{name} looks up and wags excitedly. "Oh! You\'re back already!"',
        curious: '{name} glances up from investigating something. "Back so soon? I just found something cool!"',
        shy: '{name} peeks out. "Oh! You weren\'t gone long... that\'s good."',
        playful: '{name} bounces over. "Yay! Ready for round two?"',
        grumpy: '{name} barely acknowledges your return. "Hmph. That was quick."'
    },
    medium: {
        lazy: '{name} stretches and yawns. "Welcome back... I had the best nap while you were gone."',
        energetic: '{name} runs to the door! "I missed you! I have SO much energy saved up!"',
        curious: '{name} trots over with bright eyes. "You\'re back! Where did you go? What did you see?"',
        shy: '{name} pads over nervously. "I-I missed you... is that okay to say?"',
        playful: '{name} does a happy spin! "FINALLY! I\'ve been waiting to show you this trick!"',
        grumpy: '{name} pretends not to notice you\'re back. ...Then follows you to every room.'
    },
    long: {
        lazy: '{name} was sleeping by the door. They yawn and shuffle toward you. "Took you long enough..."',
        energetic: '{name} is sitting by the door, tail going a mile a minute! "YOU\'RE HERE YOU\'RE HERE YOU\'RE HERE!"',
        curious: '{name} was watching the door intently. Their eyes light up when they see you!',
        shy: '{name} is sitting by the door, waiting. Their eyes light up when they see you.',
        playful: '{name} has been rearranging their toys by the door. "I was just... you know... organizing."',
        grumpy: '{name} is sitting by the door with their back to you. They turn slowly. "Oh. It\'s you. ...Good."'
    },
    veryLong: {
        lazy: '{name} is curled up by the door. When they hear your voice, they slowly pad over and lean against you.',
        energetic: '{name} bursts into tears of joy and practically tackles you! "NEVER LEAVE AGAIN!"',
        curious: '{name} searches your face, trying to understand. Then nuzzles close. "Don\'t go that long again, okay?"',
        shy: '{name} is curled up alone. When they hear your voice, they slowly pad over... then won\'t leave your side.',
        playful: '{name} tries to act normal, but their bottom lip quivers. "I wasn\'t worried! ...Okay, I was a little worried."',
        grumpy: '{name} won\'t look at you at first. Then they press against your leg and stay there. "...Don\'t do that again."'
    }
};

function getWelcomeBackMessage(pet, minutesAway) {
    const name = pet.name || 'Your pet';
    const personality = pet.personality || 'playful';
    let tier;
    if (minutesAway < 60) tier = 'short';
    else if (minutesAway < 240) tier = 'medium';
    else if (minutesAway < 720) tier = 'long';
    else tier = 'veryLong';
    const messages = WELCOME_BACK_MESSAGES[tier];
    const msg = messages[personality] || messages['playful'];
    return msg.replace(/\{name\}/g, name);
}

// ==================== ELDER WISDOM MOMENTS ====================
const ELDER_WISDOM_SPEECHES = {
    lazy: [
        'Remember when we used to nap in the garden? Those were perfect afternoons.',
        'The secret to a good life? A full belly and a soft spot to rest.',
        'I\'ve learned that the best moments are the quiet ones, side by side.',
        'Young ones rush around so much. They\'ll learn — the best things come to those who wait.',
        'I dreamed about our first day together. We\'ve come so far since then.'
    ],
    energetic: [
        'Remember when we used to race around the park? I could still beat you!',
        'Every day is a gift. That\'s why I still get the zoomies!',
        'I\'ve run a thousand laps, but the best ones were with you beside me.',
        'The young ones think they have energy. Ha! I invented energy.',
        'We\'ve shared so many adventures. Let\'s have a thousand more!'
    ],
    curious: [
        'Remember when we explored the garden for the first time? Everything was so new.',
        'I\'ve investigated every corner of this world, and the most wonderful thing is still you.',
        'Wisdom isn\'t about knowing everything. It\'s about never stopping asking questions.',
        'The young ones ask me what I\'ve learned. I tell them: stay curious, always.',
        'I still wonder about things. That\'s how you know you\'re alive.'
    ],
    shy: [
        'Remember when I was too scared to come out? You waited for me. That meant everything.',
        'Trust is the greatest gift anyone ever gave me. Thank you for your patience.',
        'I used to hide from the world. Now the world feels like home because of you.',
        'The young ones are scared sometimes. I tell them: find your person. You\'ll be okay.',
        'Quiet love is still love. Maybe the deepest kind.'
    ],
    playful: [
        'Remember when we played in the park? Those were the best times.',
        'I\'m old, but I\'ve never lost my sense of fun. Life\'s too short for seriousness!',
        'The best games are the ones where everyone is laughing — especially you.',
        'I\'ve played a thousand games, but my favorite was always the next one with you.',
        'The young ones think I\'m silly. Good. The world needs more silly.'
    ],
    grumpy: [
        'Don\'t tell anyone, but... I\'m glad we\'ve had all this time together.',
        'I\'ve complained about a lot of things. Never once complained about you. ...Don\'t let it go to your head.',
        'Remember when I used to grumble at everything? ...Okay, I still do. But I mean it less now.',
        'The young ones think I\'m tough. Between us? You made me soft.',
        'If I had to do it all again, I\'d grumble exactly the same amount. But I\'d always choose you.'
    ]
};

// ==================== LEGACY MENTORING SYSTEM ====================
const MENTOR_CONFIG = {
    minElderAge: 20,
    mentorBonusRelationship: 1.5,
    mentorBonusCareGain: 1.15,
    mentorWisdomMessages: {
        lazy: ['{elder} shows {young} the perfect napping position. Wisdom passed down!',
               '{elder} teaches {young} that patience is a virtue. Then falls asleep.'],
        energetic: ['{elder} races {young} around the yard. The elder still wins!',
                    '{elder} teaches {young} a new trick. "I learned this when I was your age!"'],
        curious: ['{elder} shows {young} a secret hiding spot. Eyes wide with wonder!',
                  '{elder} and {young} investigate the garden together. Two generations of curiosity!'],
        shy: ['{elder} gently encourages {young} to try something new. Baby steps!',
              '{elder} sits quietly with {young}. Sometimes presence is the best lesson.'],
        playful: ['{elder} invents a new game just for {young}. It\'s a hit!',
                  '{elder} teaches {young} their signature move. The legacy continues!'],
        grumpy: ['{elder} pretends to be annoyed by {young}. Then secretly teaches them everything.',
                 '{elder} grumbles wisdom at {young}. "Listen up, kid. I\'m only saying this once."']
    }
};

// ==================== CARETAKER TITLE SYSTEM ====================
const CARETAKER_TITLES = {
    newcomer: { label: 'Newcomer', emoji: '🌱', minActions: 0, description: 'Just starting your journey' },
    caringFriend: { label: 'Caring Friend', emoji: '💚', minActions: 20, description: 'Building bonds of trust' },
    devotedGuardian: { label: 'Devoted Guardian', emoji: '🛡️', minActions: 50, description: 'A steadfast protector' },
    belovedKeeper: { label: 'Beloved Keeper', emoji: '💖', minActions: 100, description: 'Cherished by all pets' },
    legendaryCaretaker: { label: 'Legendary Caretaker', emoji: '👑', minActions: 200, description: 'A true legend of care' }
};

const CARETAKER_TITLE_ORDER = ['newcomer', 'caringFriend', 'devotedGuardian', 'belovedKeeper', 'legendaryCaretaker'];

function getCaretakerTitle(totalActions) {
    let result = 'newcomer';
    for (const key of CARETAKER_TITLE_ORDER) {
        if (totalActions >= CARETAKER_TITLES[key].minActions) result = key;
    }
    return result;
}

function getCaretakerTitleData(totalActions) {
    const key = getCaretakerTitle(totalActions);
    return { key, ...CARETAKER_TITLES[key] };
}

// ==================== CARETAKER STYLE PROFILE ====================
const CARETAKER_STYLES = {
    chef: { label: 'The Chef', emoji: '👨‍🍳', description: 'Loves feeding their pets' },
    entertainer: { label: 'The Entertainer', emoji: '🎭', description: 'Always playing and having fun' },
    healer: { label: 'The Healer', emoji: '💊', description: 'Keeps their pets healthy and clean' },
    cuddler: { label: 'The Cuddler', emoji: '🤗', description: 'Gentle care and affection' },
    natural: { label: 'The Natural', emoji: '🌿', description: 'A balanced caretaker' }
};

function getCaretakerStyle(actionCounts) {
    if (!actionCounts) return CARETAKER_STYLES.natural;
    const feed = (actionCounts.feed || 0) + (actionCounts.treat || 0);
    const play = (actionCounts.play || 0) + (actionCounts.exercise || 0);
    const heal = (actionCounts.wash || 0) + (actionCounts.medicine || 0) + (actionCounts.groom || 0);
    const cuddle = (actionCounts.cuddle || 0) + (actionCounts.sleep || 0);
    const total = feed + play + heal + cuddle;
    if (total < 10) return CARETAKER_STYLES.natural;
    const threshold = total * 0.35;
    if (feed > threshold && feed >= play && feed >= heal && feed >= cuddle) return CARETAKER_STYLES.chef;
    if (play > threshold && play >= feed && play >= heal && play >= cuddle) return CARETAKER_STYLES.entertainer;
    if (heal > threshold && heal >= feed && heal >= play && heal >= cuddle) return CARETAKER_STYLES.healer;
    if (cuddle > threshold && cuddle >= feed && cuddle >= play && cuddle >= heal) return CARETAKER_STYLES.cuddler;
    return CARETAKER_STYLES.natural;
}

// ==================== SEASONAL NARRATIVE EVENTS ====================
const SEASONAL_NARRATIVE_EVENTS = {
    spring: [
        { id: 'spring_bird', title: '🐦 A Visitor!', message: 'A baby bird has landed in the garden! {name} watches it with wide eyes.', duration: 3, chance: 0.3 },
        { id: 'spring_flowers', title: '🌸 First Blooms', message: 'The garden is blooming! {name} sniffs every single flower.', duration: 2, chance: 0.3 }
    ],
    summer: [
        { id: 'summer_fireflies', title: '✨ Firefly Festival', message: 'The garden glows with fireflies tonight! {name} tries to catch them, giggling.', duration: 2, chance: 0.3 },
        { id: 'summer_heatwave', title: '☀️ Hot Day', message: '{name} found the coolest spot in the house and is NOT moving.', duration: 1, chance: 0.3 }
    ],
    autumn: [
        { id: 'autumn_harvest', title: '🍂 Harvest Festival', message: 'It\'s harvest time! {name} helps gather fallen leaves into a big pile, then jumps in.', duration: 2, chance: 0.3 },
        { id: 'autumn_wind', title: '🍃 Breezy Day', message: '{name} chases leaves tumbling in the autumn wind, laughing all the way.', duration: 1, chance: 0.3 }
    ],
    winter: [
        { id: 'winter_snow', title: '❄️ First Snow!', message: '{name} discovers snow for the first time and makes tiny paw prints everywhere!', duration: 2, chance: 0.3, oneTime: true },
        { id: 'winter_cozy', title: '🧣 Cozy Evening', message: 'You and {name} cuddle up by the warmest spot in the house. Perfect.', duration: 1, chance: 0.3 }
    ]
};

function getSeasonalEvent(pet, season) {
    if (!pet || !season) return null;
    const events = SEASONAL_NARRATIVE_EVENTS[season];
    if (!events) return null;
    const name = pet.name || 'Your pet';
    const seenEvents = pet._seenSeasonalEvents || {};
    for (const event of events) {
        if (event.oneTime && seenEvents[event.id]) continue;
        if (Math.random() < event.chance) {
            return { ...event, message: event.message.replace(/\{name\}/g, name) };
        }
    }
    return null;
}

// ==================== WEATHER MICRO-STORIES ====================
const WEATHER_MICRO_STORIES = {
    rainy: {
        first: ['{name} sees rain for the first time and tries to catch the drops!',
                '{name} presses their nose against the window, mesmerized by raindrops racing down the glass.'],
        recurring: ['{name} listens to the rain and their eyelids get heavy...',
                    '{name} watches puddles form outside. So many splashing possibilities!']
    },
    snowy: {
        first: ['{name} discovers snow for the first time! They poke it cautiously, then POUNCE!',
                '{name} makes tiny paw prints in the snow and looks back at them in wonder.'],
        recurring: ['{name} watches snowflakes fall and tries to count them.',
                    '{name} presses against the window, breath making fog circles on the glass.']
    },
    sunny: {
        afterRain: ['{name} spots a rainbow and stares in wonder.',
                    'The sun breaks through! {name} runs to the window to feel the warmth.'],
        recurring: ['{name} finds the perfect sunbeam and melts into it.',
                    '{name} squints happily in the sunshine.']
    }
};

function getWeatherStory(pet, weather, previousWeather) {
    if (!pet || !weather) return null;
    const name = pet.name || 'Your pet';
    const weatherSeen = pet._weatherSeen || {};
    const stories = WEATHER_MICRO_STORIES[weather];
    if (!stories) return null;
    let pool;
    if (weather === 'sunny' && previousWeather === 'rainy') {
        pool = stories.afterRain || stories.recurring;
    } else if (!weatherSeen[weather]) {
        pool = stories.first || stories.recurring;
    } else {
        pool = stories.recurring;
        if (Math.random() > 0.3) return null;
    }
    if (!pool || pool.length === 0) return null;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    return msg.replace(/\{name\}/g, name);
}

// ==================== ROOM MEMORIES ====================
const ROOM_MEMORY_THRESHOLDS = {
    kitchen: {
        stat: 'feedCount',
        thresholds: [
            { count: 10, emoji: '🥣', label: 'Favorite Bowl', description: 'A well-worn food bowl sits in the corner — {name}\'s favorite spot to eat.' },
            { count: 25, emoji: '🧑‍🍳', label: 'Kitchen Helper', description: '{name} has their own little spot by the counter. They "help" with every meal.' }
        ]
    },
    bedroom: {
        stat: 'sleepCount',
        thresholds: [
            { count: 10, emoji: '🛏️', label: 'Cozy Indent', description: 'There\'s a pet-shaped indent in the bed. {name}\'s spot, always warm.' },
            { count: 25, emoji: '💤', label: 'Dream Corner', description: '{name}\'s corner of the bedroom is covered in their favorite things. Home within home.' }
        ]
    },
    bathroom: {
        stat: 'washCount',
        thresholds: [
            { count: 8, emoji: '🧴', label: 'Bath Friend', description: '{name}\'s favorite bath toy sits on the edge of the tub, always ready.' },
            { count: 20, emoji: '🫧', label: 'Splash Zone', description: 'Water marks on the wall from {name}\'s enthusiastic bath times. Memories in every splash.' }
        ]
    },
    backyard: {
        stat: 'playCount',
        thresholds: [
            { count: 10, emoji: '⚽', label: 'Play Spot', description: 'A worn patch of grass marks {name}\'s favorite play area.' },
            { count: 25, emoji: '🏆', label: 'Champion\'s Ground', description: 'The backyard bears the marks of a thousand games. This is {name}\'s kingdom.' }
        ]
    },
    park: {
        stat: 'parkVisits',
        thresholds: [
            { count: 8, emoji: '🌳', label: 'Favorite Tree', description: '{name} always runs to the same tree first. It\'s their tree now.' },
            { count: 20, emoji: '🐾', label: 'Trail Blazer', description: '{name} has worn a little path through the park. Their own personal trail.' }
        ]
    },
    garden: {
        stat: 'harvestCount',
        thresholds: [
            { count: 10, emoji: '🌱', label: 'Green Paws', description: '{name} likes to "help" in the garden. There are tiny paw prints between the rows.' },
            { count: 25, emoji: '🌻', label: 'Garden Guardian', description: 'A sunflower grows in {name}\'s favorite corner. They check on it every day.' }
        ]
    }
};

function getRoomMemories(pet, room) {
    if (!pet || !room) return [];
    const config = ROOM_MEMORY_THRESHOLDS[room];
    if (!config) return [];
    const counts = pet._roomActionCounts || {};
    const count = counts[config.stat] || 0;
    const name = pet.name || 'Your pet';
    const memories = [];
    for (const t of config.thresholds) {
        if (count >= t.count) {
            memories.push({ emoji: t.emoji, label: t.label, description: t.description.replace(/\{name\}/g, name) });
        }
    }
    return memories;
}

// ==================== LOW STAT REACTIONS ====================
const LOW_STAT_REACTIONS = {
    hunger: {
        lazy: '{name} lies flat, too hungry to even yawn. They gaze at you weakly.',
        energetic: '{name} slumps against the wall, energy gone. Their tummy rumbles sadly.',
        curious: '{name} has stopped exploring. They just stare at the food bowl, then at you.',
        shy: '{name} hides in a corner, holding their tummy. They\'re too shy to ask for food.',
        playful: '{name} pushes their empty bowl toward you with a sad little nudge.',
        grumpy: '{name} gives you the silent treatment and pointedly looks at the empty food bowl.'
    },
    cleanliness: {
        lazy: '{name} doesn\'t even care about being messy anymore. That\'s concerning.',
        energetic: '{name} tries to shake off the dirt but just makes it worse.',
        curious: '{name} sniffs themselves and looks confused. "What is that smell?"',
        shy: '{name} hides, embarrassed about being dirty. They won\'t come out.',
        playful: '{name} tried to clean themselves but just made a bigger mess.',
        grumpy: '{name} glares at you as if it\'s YOUR fault they\'re dirty. (It might be.)'
    },
    happiness: {
        lazy: '{name} doesn\'t even have the energy to be sad. They just... exist.',
        energetic: '{name}\'s bounce is gone. They sit still, staring at nothing. It\'s heartbreaking.',
        curious: '{name} has lost interest in everything. The spark in their eyes has dimmed.',
        shy: '{name} is hiding and won\'t come out. Soft whimpering sounds come from the corner.',
        playful: '{name}\'s toys sit untouched. They don\'t want to play. Something is very wrong.',
        grumpy: '{name} isn\'t even grumpy anymore. Just... sad. That\'s worse.'
    },
    energy: {
        lazy: '{name} is beyond tired. Even breathing seems like an effort.',
        energetic: '{name} crashes hard. All that energy, just... gone. They can barely keep their eyes open.',
        curious: '{name} wants to explore but their legs won\'t cooperate. They need rest.',
        shy: '{name} curls up in the smallest ball possible. They need rest and safety.',
        playful: '{name} fell asleep mid-play. They pushed too hard. Time for rest.',
        grumpy: '{name} is too exhausted to grumble. They just sigh and close their eyes.'
    }
};

function getLowStatReaction(pet, stat) {
    if (!pet || !stat) return null;
    const personality = pet.personality || 'playful';
    const name = pet.name || 'Your pet';
    const reactions = LOW_STAT_REACTIONS[stat];
    if (!reactions) return null;
    const msg = reactions[personality] || reactions['playful'];
    return msg ? msg.replace(/\{name\}/g, name) : null;
}

// ==================== NEGLECT RECOVERY ARC ====================
const NEGLECT_RECOVERY_MESSAGES = {
    first: {
        lazy: '{name} eats quietly, not looking at you.',
        energetic: '{name} accepts the care but doesn\'t bounce. Just a quiet nod.',
        curious: '{name} glances at you briefly but looks away.',
        shy: '{name} flinches at your touch, then holds still. Waiting.',
        playful: '{name} takes the treat but doesn\'t smile. Not yet.',
        grumpy: '{name} turns away from you, but stays close enough to reach.'
    },
    second: {
        lazy: '{name} shifts a little closer. A tired blink that might mean something.',
        energetic: '{name} perks up slightly. A tiny tail wag, quickly hidden.',
        curious: '{name} glances up briefly and holds your gaze for a moment.',
        shy: '{name} doesn\'t flinch this time. Progress.',
        playful: '{name} pokes at a toy, then looks at you. Testing the waters.',
        grumpy: '{name} huffs, but doesn\'t move away when you come near.'
    },
    third: {
        lazy: '{name} leans against you with a soft sigh. Forgiveness is warm.',
        energetic: '{name} bounces once — just once — and looks hopeful.',
        curious: '{name} nudges your hand. Maybe things are okay.',
        shy: '{name} reaches out and touches your hand. The tiniest gesture, the biggest meaning.',
        playful: '{name} brings you a toy and drops it at your feet. Ready to try again?',
        grumpy: '{name} grumbles something that sounds suspiciously like "I missed you."'
    }
};

function getNeglectRecoveryMessage(pet, recoveryStep) {
    if (!pet) return null;
    const personality = pet.personality || 'playful';
    const name = pet.name || 'Your pet';
    let tier;
    if (recoveryStep <= 1) tier = 'first';
    else if (recoveryStep === 2) tier = 'second';
    else tier = 'third';
    const messages = NEGLECT_RECOVERY_MESSAGES[tier];
    if (!messages) return null;
    const msg = messages[personality] || messages['playful'];
    return msg ? msg.replace(/\{name\}/g, name) : null;
}

// ==================== CARETAKER TITLE PET REFERENCES ====================
const CARETAKER_PET_SPEECHES = {
    newcomer: ['My person is still learning!', 'We\'re figuring this out together.'],
    caringFriend: ['My Caring Friend is the best!', 'I\'m lucky to have such a good friend.'],
    devotedGuardian: ['My Guardian always takes care of me!', 'I feel so safe with my Guardian.'],
    belovedKeeper: ['My Beloved Keeper is amazing!', 'Everyone wishes they had a Keeper like mine!'],
    legendaryCaretaker: ['My Caretaker is LEGENDARY!', 'I have the greatest Caretaker in the whole world!']
};

// ==================== EXPANDED FEEDBACK MESSAGE POOLS ====================
// Each action has: default (8-10), personality overrides (2-3 each), growth stage overrides (2-3 each)
// Selection priority: personality+stage → personality → stage → default random

const EXPANDED_FEEDBACK = {
    feed: {
        default: [
            'Yummy! That hit the spot!',
            'Munch munch munch... so good!',
            '*happy chomping sounds* Delicious!',
            'That was the best meal ever!',
            'Tummy feels warm and full now!',
            'Nom nom! Every bite was wonderful!',
            'So satisfying — can still taste the yumminess!',
            'That smelled incredible and tasted even better!',
            'All gone! Licked the bowl clean!',
            '*contented sigh* Perfectly full.'
        ],
        personality: {
            lazy: [
                '*eats slowly* Mmm... no rush... this is nice...',
                'Food delivered right to me... life is good... *yawn*',
                'Eating is my favorite activity. Zero movement required.'
            ],
            energetic: [
                'CHOMP CHOMP CHOMP! Done! What\'s next?!',
                'Fuel UP! Gonna need this energy! LET\'S GO!',
                'Ate that in record time! Personal best!'
            ],
            curious: [
                'Interesting flavor profile! What spices are in this?',
                'I wonder where this food comes from? So many tastes to explore!',
                '*inspects each bite carefully* Fascinating texture!'
            ],
            shy: [
                '*quietly nibbles* ...thank you for the food...',
                '*eats in a cozy corner, tail wagging softly* This is really nice...',
                '...you remembered what I like? That\'s... really sweet.'
            ],
            playful: [
                '*tosses food in the air and catches it* Wheee! Tasty!',
                'Bet I can finish before you count to three! NOM!',
                'Food fight! Just kidding... but maybe? Hehe!'
            ],
            grumpy: [
                'Fine. It\'s adequate. *secretly goes back for seconds*',
                '*grumbles* I GUESS the seasoning was acceptable.',
                'Don\'t watch me eat. ...Is there more?'
            ]
        },
        stage: {
            baby: [
                '*tiny happy squeaks* Num num num!',
                '*milk dribbles everywhere* Goo goo! More pease!',
                '*bounces in high chair* Yummy yummy in my tummy!'
            ],
            child: [
                'That was SO good! Can I have dessert too? Please please please?',
                'I\'m getting big and strong from all this yummy food!',
                'I tried something new today and it was actually really good!'
            ],
            adult: [
                'A well-balanced meal. I appreciate good nutrition.',
                'Nothing like a proper meal after a long day.',
                'I\'ve really developed a taste for home cooking.'
            ],
            elder: [
                'Reminds me of meals when I was young... good times.',
                '*savors each bite slowly* You learn to enjoy the little things.',
                'Thousands of meals, and each one still brings me joy.'
            ]
        }
    },
    wash: {
        default: [
            'So clean! Squeaky squeaky!',
            'Sparkly fresh from ears to toes!',
            'Ahh, that warm water felt amazing!',
            'Fresh as a daisy and twice as sweet!',
            '*shakes off water everywhere* Whoops! But so clean!',
            'The bubbles were the best part!',
            'Squeaky clean and smelling wonderful!',
            'That scrub-a-dub felt SO nice!',
            '*sniffs self happily* I smell like flowers!',
            'Nothing beats the feeling of being all clean!'
        ],
        personality: {
            lazy: [
                '*sits in warm bath, half asleep* This is basically a warm nap...',
                'Do I have to get OUT of the bath? It\'s so comfy in here...',
                'The warm water is making me sleeeepy...'
            ],
            energetic: [
                'SPLASH SPLASH SPLASH! Bath time is play time!',
                'Bubble fight! PEW PEW PEW! *splashes everywhere*',
                'That was speed-cleaning! New bath record! YEAH!'
            ],
            curious: [
                'Why do bubbles float? And why are they rainbow-colored? Fascinating!',
                '*examines soap closely* What makes it so slippery? I must know!',
                'Did you know water spirals different directions in different hemispheres?'
            ],
            shy: [
                '*peeks out from behind shower curtain* ...is it over?',
                '*wrapped in towel like a burrito* ...this part is nice though.',
                'The warm water is calming... I feel safe.'
            ],
            playful: [
                '*makes bubble beard* Look! I\'m a wizard! Bubble magic!',
                '*slides across wet floor* WHEEEEE! Bath time parkour!',
                'I made a bubble crown AND a bubble mustache! How do I look?'
            ],
            grumpy: [
                '*tolerates bath with maximum grumpiness* ...fine. I GUESS I needed this.',
                'I didn\'t need a bath. I had a perfectly good layer of... character.',
                '*reluctantly admits* Okay. Being clean does feel... slightly better. Hmph.'
            ]
        },
        stage: {
            baby: [
                '*splish splash splish!* Bubba! Bubba!',
                '*giggles at rubber ducky* Ducky fwend!',
                '*tiny paws paddle in the water* Wheee so warm!'
            ],
            child: [
                'Can we do the bubble mountain again? That was awesome!',
                'I made a mohawk with the soap suds! Look look!',
                'Bath time used to be scary but now it\'s actually kinda fun!'
            ],
            adult: [
                'A proper bath — just what I needed to unwind.',
                'Clean fur is happy fur. I feel like a new pet.',
                'There\'s something meditative about a good wash.'
            ],
            elder: [
                'A warm bath soothes these old bones wonderfully.',
                'I remember when I used to splash around like a youngster... *chuckles*',
                'Gentle warm water and good company. Simple pleasures.'
            ]
        }
    },
    play: {
        default: [
            'So much fun! Let\'s do that again!',
            'Wheee! That was the BEST!',
            'My heart is so full of happy right now!',
            '*bouncing with joy* Again again again!',
            'That was incredible! High five!',
            'Best. Playtime. EVER!',
            'I\'m so happy I could burst!',
            'Nothing in the world beats playing together!',
            '*tail wagging furiously* SO MUCH FUN!',
            'Can every moment be playtime? Please?'
        ],
        personality: {
            lazy: [
                'That was... actually worth getting up for. *flops down*',
                '*played for exactly two minutes* Okay that\'s my daily exercise done.',
                'Fun but... nap-level tired now. Worth it though.'
            ],
            energetic: [
                'MORE MORE MORE! I could play FOREVER!',
                'THAT WAS AMAZING! Again! No wait — something NEW! No — again!',
                'I\'m not even a LITTLE bit tired! Round two?!'
            ],
            curious: [
                'Playing teaches me so much about the world! Every game is a lesson!',
                'What if we invented a NEW game? I have seventeen ideas!',
                'I noticed something cool during play — did YOU see it too?'
            ],
            shy: [
                '*quiet smile* ...I really liked playing with just you.',
                'That was fun... can we do it again? Just us two?',
                '*happy but soft-spoken* I feel brave when we play together.'
            ],
            playful: [
                'BEST DAY EVER! And I say that every day! Because it\'s always true!',
                '*cartwheels* Did you SEE that move?! I\'m basically a LEGEND!',
                'Life is a game and I am WINNING!'
            ],
            grumpy: [
                'That was... tolerable. Maybe even slightly above tolerable. MAYBE.',
                '*trying very hard not to smile* It wasn\'t THAT fun. Stop looking at me.',
                'I only played because YOU wanted to. Not because I enjoyed it. *tail wag*'
            ]
        },
        stage: {
            baby: [
                '*squeals with delight* WHEEEE! Pway pway!',
                '*claps tiny paws* Mooore! Mooore!',
                '*rolls around giggling* Hehehehe!'
            ],
            child: [
                'I got better at that! Did you notice? Did you see?!',
                'When I grow up I\'m gonna be the best player EVER!',
                'Can we play until the stars come out? Pleeeease?'
            ],
            adult: [
                'Good game! A healthy mix of fun and exercise.',
                'Playing keeps the spirit young, no matter how old you get.',
                'Always good to take a break and just enjoy the moment.'
            ],
            elder: [
                'These old joints still have some play left in them!',
                'I may be slower, but I still know all the best tricks.',
                'Playing with you takes me back to my younger days. Cherished moments.'
            ]
        }
    },
    sleep: {
        default: [
            'So cozy! Best nap ever!',
            '*yawns and stretches* What a wonderful rest!',
            'Sweet dreams came and went... all good ones!',
            'Zzz... oh! I\'m awake! I feel fantastic!',
            'That sleep was like floating on clouds!',
            'Recharged and ready to go!',
            'The coziest snooze in all the land!',
            '*blinks sleepily* Five more min— oh wait, I feel great!',
            'Wrapped in warmth and comfort. Perfect rest.',
            'Dreamed of wonderful things. Feeling refreshed!'
        ],
        personality: {
            lazy: [
                'That was the BEST nap. Can I have another one?',
                '*still half asleep* I have perfected the art of sleeping.',
                'Sleep is my superpower and I am VERY powerful.'
            ],
            energetic: [
                '*springs awake* I\'M UP! LET\'S DO THINGS!',
                'Okay nap over FULLY CHARGED let\'s GOOO!',
                'Sleeping is hard when you have THIS much energy! But I tried!'
            ],
            curious: [
                'I had the most fascinating dream about faraway places!',
                'Did you know some animals sleep with one eye open? Amazing!',
                'I was dreaming about how stars are born. Beautiful.'
            ],
            shy: [
                '*curled up in the smallest ball* ...that was the safest I\'ve felt.',
                '*peeks out from blanket* Is it still quiet? Good... that was nice.',
                'I sleep best when I know you\'re nearby.'
            ],
            playful: [
                '*sleep-runs* I was chasing dream butterflies! Almost caught one!',
                'I dreamed I could fly! And there were TRAMPOLINES everywhere!',
                '*rolls out of bed* Nap\'s over! Fun time NOW!'
            ],
            grumpy: [
                'Don\'t talk to me yet. I need three more minutes of consciousness warm-up.',
                '*woke up on the wrong side of the bed ON PURPOSE*',
                'That nap was acceptable. The pillow was adequate. ...I liked the blanket.'
            ]
        },
        stage: {
            baby: [
                '*tiny snores* Zzzzz... *yawns* Baba...',
                '*snuggles into blanket* Cozy cozy...',
                '*sucks thumb in sleep* ...sweet baby dreams...'
            ],
            child: [
                'I dreamed I was a superhero! With LASER eyes!',
                'Do I HAVE to nap? ...Okay fine. ...That was actually really nice.',
                '*sleeptalks* No, the ice cream goes on TOP of the...'
            ],
            adult: [
                'A proper rest. I feel completely restored.',
                'Nothing like quality sleep to put things in perspective.',
                'Well-rested and ready for whatever comes next.'
            ],
            elder: [
                'These bones appreciate a good rest more than ever.',
                'I dreamed of old friends and warm memories.',
                'Sleep comes easier when you\'re at peace with the world.'
            ]
        }
    },
    medicine: {
        default: [
            'All better! Feeling good as new!',
            'That medicine worked wonders!',
            'The yucky taste is gone and I feel fantastic!',
            'Healthy and strong again! Thank you!',
            'Already feeling so much better!',
            'The healing warmth is spreading through me!',
            'From under the weather to on top of the world!',
            'That tingly medicine feeling means it\'s working!',
            'Bouncing back already! Nothing keeps me down!',
            'Thank you for taking care of me when I needed it most.'
        ],
        personality: {
            lazy: [
                '*takes medicine without moving from spot* At least I don\'t have to get up.',
                'Being healthy means I can nap in peace. Win-win.',
                '*medicine kicks in* Ohh... energy returning... nap energy, that is.'
            ],
            energetic: [
                '*medicine kicks in* WHOOO! I feel TURBO-CHARGED!',
                'HEALTH RESTORED! POWER LEVEL: MAXIMUM!',
                'Being sick was BORING! I\'m BACK, baby!'
            ],
            curious: [
                'What exactly IS in that medicine? The science of healing is fascinating!',
                'I can feel my cells regenerating! Probably. I read about that once.',
                'Did you know honey has natural healing properties? Nature is amazing!'
            ],
            shy: [
                '*takes medicine quietly* ...thank you for being gentle.',
                'I was scared, but you made it okay. I feel better now.',
                '*whispers* The medicine tastes bad but your kindness makes it better.'
            ],
            playful: [
                '*makes funny face at medicine taste* BLEH! ...but also YAY health!',
                'I turned taking medicine into a game! I won! And I\'m healthy!',
                'Quick, give me a treat to wash away the taste! ...please? Hehe!'
            ],
            grumpy: [
                'I didn\'t need medicine. I was FINE. ...okay maybe I needed it a little.',
                '*makes disgusted face* Awful taste. Acceptable results. Hmph.',
                'If being healthy means enduring that taste, I suppose it\'s... worth it.'
            ]
        },
        stage: {
            baby: [
                '*tiny whimper then brightens* Oh! All bettew!',
                '*sniffles then smiles* Mama-medicine! Yay!',
                '*was scared but now giggling* Not yucky! Well, a LITTLE yucky!'
            ],
            child: [
                'I was SO brave! Did you see? I didn\'t even cry! ...much.',
                'Does being brave about medicine mean I get a sticker?',
                'I held still the WHOLE time! I\'m like a medicine superhero!'
            ],
            adult: [
                'Preventive care is important. Thank you for looking after me.',
                'A little medicine now saves a lot of trouble later.',
                'I trust you to know what\'s best for my health.'
            ],
            elder: [
                'At my age, a little medicine is just part of the routine. I\'m grateful.',
                'This old body has weathered many storms. A bit of medicine and I\'m right again.',
                'Thank you for keeping this old soul in good health.'
            ]
        }
    },
    groom: {
        default: [
            'So fluffy and fabulous!',
            'Looking sharp! Feeling even sharper!',
            'Nice and tidy from head to tail!',
            'Is that a mirror? Because I look AMAZING!',
            'Freshly groomed and feeling fantastic!',
            'Every hair in its place! Magnificent!',
            'The brushing felt sooo nice on my fur!',
            'I feel like royalty after that grooming session!',
            'Soft, smooth, and absolutely gorgeous!',
            'That grooming was like a mini spa day!'
        ],
        personality: {
            lazy: [
                '*sits still effortlessly* See? Being lazy makes me the PERFECT grooming client.',
                'Grooming requires no effort on my part. My favorite kind of activity.',
                '*purrs during brushing* This is basically a massage. I approve.'
            ],
            energetic: [
                '*holds still for exactly 0.3 seconds* DONE? Can I go? CAN I GO?!',
                'I look FAST now! Aerodynamic! ZOOM-READY!',
                'Quick groom! Speed brush! Let\'s GO GO GO!'
            ],
            curious: [
                'Is this a natural-bristle brush? The texture is quite interesting!',
                'Did you know some animals groom each other to build social bonds?',
                '*examines loose fur* Fascinating. My fur has so many layers!'
            ],
            shy: [
                '*sits very still, enjoying the gentle touch* ...this is really nice.',
                'I like when you brush gently. It feels like you care.',
                '*quiet purr* The soft brushing makes me feel safe.'
            ],
            playful: [
                '*tries to catch the brush* It\'s a game! Brush tag!',
                'Make me look EXTRA cute! Wait — I\'m already extra cute!',
                '*poses dramatically after grooming* How do I look? Fabulous? I KNEW it!'
            ],
            grumpy: [
                'I look presentable now. That\'s the best compliment you\'re getting.',
                '*endures grooming stoically* ...I suppose I DO look better. Whatever.',
                'Don\'t make a fuss. I allow grooming because SOMEONE has to maintain standards.'
            ]
        },
        stage: {
            baby: [
                '*tiny paws bat at the brush* Ooh! Tickly!',
                '*giggles while being brushed* Dat feels funny!',
                '*the world\'s smallest floof* So pwetty!'
            ],
            child: [
                'I wanna look my best! Make me extra fluffy!',
                'Will I be even fluffier when I grow up?',
                'Grooming day is makeover day! I love it!'
            ],
            adult: [
                'Good grooming is self-respect. I look and feel great.',
                'A proper grooming routine makes all the difference.',
                'Clean and presentable — ready for anything!'
            ],
            elder: [
                'A gentle brush through old fur feels absolutely lovely.',
                'I may have a few grey hairs, but I still clean up nicely!',
                'Grooming has been a comfort since I was a baby. Some things never change.'
            ]
        }
    },
    exercise: {
        default: [
            'Great workout! Feeling the burn!',
            'Phew! What an amazing run!',
            'Heart pumping, muscles working — YES!',
            'That was one heck of a workout!',
            'Sweat, stretch, and smile! Perfect exercise!',
            'My legs feel like jelly but my heart is full!',
            'Runner\'s high activated! Everything is wonderful!',
            'Breathe in, breathe out — what a rush!',
            'Muscles I didn\'t know I had are saying hello!',
            'Exercise done! Endorphins flowing!'
        ],
        personality: {
            lazy: [
                '*walked to the mailbox and back* That counts as exercise, right?',
                'I stretched. In bed. That\'s basically yoga.',
                '*did one push-up* I\'m basically an athlete now. Nap time.'
            ],
            energetic: [
                'THAT WAS NOTHING! I could run a MARATHON! TWICE!',
                'CAN\'T STOP WON\'T STOP! MORE LAPS! MORE!',
                'I just set FIVE personal records and I\'m not even TIRED!'
            ],
            curious: [
                'Did you know exercise creates new brain cells? I can feel myself getting smarter!',
                'I tracked my steps! And my heart rate! The data is FASCINATING!',
                'What muscles does this work? I want to understand the biomechanics!'
            ],
            shy: [
                '*exercised in a quiet corner* I prefer working out alone... but with you nearby.',
                'I did it! I actually did it! *quiet pride*',
                '*soft panting* That was a lot... but I feel stronger.'
            ],
            playful: [
                '*turns exercise into a dance party* Who says workouts can\'t be FUN?!',
                'I invented a new exercise! It\'s called bouncy-spin-jump! TEN POINTS!',
                'Race you! On your mark, get set — I already started! Hahaha!'
            ],
            grumpy: [
                '*finished workout while complaining the entire time* There. Happy?',
                'Exercise is just moving around for no reason. ...But I do feel better. Hmph.',
                'I ran because I WANTED to, not because you asked. Coincidence.'
            ]
        },
        stage: {
            baby: [
                '*toddles around in circles* Wheee! Wobble wobble!',
                '*tiny legs going as fast as they can* Zoom zoom!',
                '*tumbles over, gets back up* Again! Again!'
            ],
            child: [
                'I can run SO fast now! Watch me! WATCH!',
                'I bet I\'m the fastest kid in the whole house!',
                'Exercise is how I\'m gonna get big and strong!'
            ],
            adult: [
                'Maintaining fitness feels like investing in the future.',
                'A good workout clears the mind and strengthens the body.',
                'Consistent exercise is the foundation of a healthy life.'
            ],
            elder: [
                'A gentle walk does wonders for these old legs.',
                'I may be slower these days, but I still enjoy the movement.',
                'At my age, every step is a celebration of what this body can still do.'
            ]
        }
    },
    treat: {
        default: [
            'Yummy treat! That was heavenly!',
            'Oh WOW! That was the most special snack EVER!',
            'Treat time is the best time!',
            'My taste buds are doing a happy dance!',
            '*closes eyes in pure bliss* Mmmmmmmm!',
            'That treat made my whole day!',
            'Can treats count as a food group? Asking for a friend.',
            'A little sweetness makes everything better!',
            'Treat received! Happiness levels: MAXIMUM!',
            'The crunch! The flavor! The JOY! Perfect treat!'
        ],
        personality: {
            lazy: [
                'Treats that come to me? Living the dream...',
                '*eats treat without lifting head from pillow* Efficiency.',
                'This is the only thing worth opening my eyes for.'
            ],
            energetic: [
                'TREAT?! TREAT TREAT TREAT TREAT! *ZOOM*',
                'Sugar rush incoming in 3... 2... 1... WHEEEEE!',
                'NOM! Can I have another?! And another?! AND ANOTHER?!'
            ],
            curious: [
                'What IS this flavor? It\'s complex with notes of... hmm, fascinating!',
                'I detect at least seven distinct flavors in this treat. Remarkable!',
                'Is this a new recipe? The texture is different from last time — in a good way!'
            ],
            shy: [
                '*takes treat gently* ...for me? You\'re too kind...',
                '*nibbles treat quietly in corner* ...this is really, really good.',
                '*blushes* I don\'t deserve such a nice treat... but thank you.'
            ],
            playful: [
                '*does a trick for the treat* TA-DA! Treat earned! NOM!',
                '*juggles treat before eating it* Dinner AND a show!',
                'I did a backflip for this treat! Okay, a TINY backflip! It counts!'
            ],
            grumpy: [
                '*takes treat* This changes nothing between us. *eats it instantly*',
                'I\'m only eating this because it would be rude to refuse. *scarfs it*',
                'Bribery will get you everywhere. ...I mean NOWHERE. Give me another one.'
            ]
        },
        stage: {
            baby: [
                '*teeny tiny nom nom* Tweeeeat! Yay!',
                '*eyes go wide, mouth drops open* OOOOH! Nummy!',
                '*sticky paws, sticky face, huge smile* Yummy tweat!'
            ],
            child: [
                'BEST TREAT EVER! Can I have one more? Just one? A tiny one?',
                'I\'m saving a tiny piece for later! ...okay I ate it. No regrets!',
                'Treats are proof that the world is a wonderful place!'
            ],
            adult: [
                'A well-earned treat. Sometimes you just need to indulge a little.',
                'Savoring this moment — a treat is best enjoyed slowly.',
                'Quality over quantity. And that was very high quality.'
            ],
            elder: [
                'A sweet treat to warm these old bones. Life\'s little luxuries.',
                'I\'ve had countless treats, but the joy never fades.',
                'At my age, every treat is a treasure to be savored.'
            ]
        }
    },
    cuddle: {
        default: [
            'So cozy! Snuggle heaven!',
            '*melts into your arms* This is where I belong.',
            'Warmth, safety, and love. Perfect cuddle!',
            'Heart-to-heart snuggles are the best medicine!',
            '*purrs contentedly* Don\'t let go just yet...',
            'Cuddles make everything better in the world!',
            'I could stay like this forever and ever!',
            'Your hugs are the coziest place in the universe!',
            '*nuzzles closer* Just a little longer, please.',
            'Love feels like warm sunshine wrapped in a hug!'
        ],
        personality: {
            lazy: [
                '*already asleep in your arms* Best. Cuddle. Position. Ever.',
                'Cuddling is basically napping with company. I approve wholeheartedly.',
                'If cuddling were a sport, I\'d be an Olympic champion.'
            ],
            energetic: [
                '*vibrating with happy energy* CUDDLE POWER UP! *bounces in your lap*',
                'Speed-cuddle! MAXIMUM affection in minimum time! I LOVE YOU!',
                '*can\'t sit still but refuses to leave your arms* WIGGLY CUDDLES!'
            ],
            curious: [
                'Did you know cuddling releases oxytocin? I can FEEL the bonding hormones!',
                'Your heartbeat is 72 beats per minute. I counted. It\'s comforting.',
                'I\'m studying the optimal cuddle position. For science. *snuggles closer*'
            ],
            shy: [
                '*inches closer, then a little more, then a LOT more* ...hi.',
                '*buries face in your chest* ...this is the safest place in the world.',
                'I know I\'m shy but... I really, really needed this. Thank you.'
            ],
            playful: [
                '*smooshes face against yours* BOOP! Cuddle boop! Boop boop!',
                'Cuddles are just two-player napping! And I\'m winning!',
                '*wraps around you like a koala* You\'re stuck with me now! FOREVER!'
            ],
            grumpy: [
                '*tense at first, then slowly relaxes* ...I\'m not cuddling. I\'m... resting near you.',
                'This means nothing. I just happen to be cold. *snuggles deeper*',
                'Tell anyone about this and I\'ll deny it. *reluctant purr*'
            ]
        },
        stage: {
            baby: [
                '*tiny paws grab your finger* Baba... cozy...',
                '*snuggles into the crook of your arm* *content baby sounds*',
                '*falls asleep in your arms instantly* ...so small, so warm.'
            ],
            child: [
                'You\'re the best hugger in the whole world! Don\'t tell anyone, it\'s our secret!',
                'Can we cuddle AND watch the stars? Double cozy!',
                'I love cuddle time because it means you love me!'
            ],
            adult: [
                'Nothing grounds me quite like a good cuddle.',
                'In a busy world, these quiet moments together mean everything.',
                'Comfort, connection, contentment — all in a single hug.'
            ],
            elder: [
                'After all these years, your warmth still means the world to me.',
                'Hold me close. These moments are what life is all about.',
                'The best thing about growing old is knowing who your people are.'
            ]
        }
    }
};

/**
 * Get an expanded feedback message for a care action.
 * Selection priority: personality-specific (35%), stage-specific (25%), default (40%).
 * Falls back to default pool if specific pools are unavailable.
 */
function getExpandedFeedbackMessage(action, personality, stage) {
    const pool = EXPANDED_FEEDBACK[action];
    if (!pool) {
        // Fallback to legacy pool
        const legacy = FEEDBACK_MESSAGES[action];
        return legacy ? legacy[Math.floor(Math.random() * legacy.length)] : '';
    }
    const persPool = (pool.personality && pool.personality[personality]) || [];
    const stagePool = (pool.stage && pool.stage[stage]) || [];
    const defaultPool = pool.default || [];
    const roll = Math.random();
    // 35% personality-specific, 25% stage-specific, 40% default
    if (roll < 0.35 && persPool.length > 0) {
        return persPool[Math.floor(Math.random() * persPool.length)];
    }
    if (roll < 0.60 && stagePool.length > 0) {
        return stagePool[Math.floor(Math.random() * stagePool.length)];
    }
    if (defaultPool.length > 0) {
        return defaultPool[Math.floor(Math.random() * defaultPool.length)];
    }
    // Final fallback to legacy
    const legacy = FEEDBACK_MESSAGES[action];
    return legacy ? legacy[Math.floor(Math.random() * legacy.length)] : '';
}

// ==================== CARE ACTION MICRO-EVENTS ====================
// ~10-15% of care actions trigger a one-line micro-event.
// Each event can optionally filter by room, season, or weather.
// {name} is replaced with the pet's name at runtime.

const CARE_MICRO_EVENTS = [
    // Universal events (no filters)
    { id: 'me1', text: 'While being cared for, {name} spotted a ladybug on the window!', action: 'feed' },
    { id: 'me2', text: '{name} found a shiny coin under their bed while stretching!', action: null },
    { id: 'me3', text: '{name} sneezed the cutest little sneeze mid-action!', action: null },
    { id: 'me4', text: 'A butterfly drifted past, and {name} froze to watch it.', action: null },
    { id: 'me5', text: '{name} yawned so wide their eyes watered. Adorable.', action: null },
    { id: 'me6', text: '{name} accidentally knocked over a small toy and looked very guilty.', action: null },
    { id: 'me7', text: 'A distant wind chime tinkled, and {name}\'s ears perked up.', action: null },
    { id: 'me8', text: '{name}\'s tummy made a funny rumbling sound. They looked surprised.', action: null },
    { id: 'me9', text: '{name} discovered a dust bunny and pounced on it heroically!', action: null },
    { id: 'me10', text: '{name} did a full-body wiggle for absolutely no reason. Pure joy.', action: null },
    { id: 'me11', text: '{name} heard a bird singing outside and tried to sing along!', action: null },
    { id: 'me12', text: 'A gentle breeze ruffled {name}\'s fur. They looked so peaceful.', action: null },
    { id: 'me13', text: '{name} found a lost feather and added it to their treasure collection.', action: null },
    { id: 'me14', text: '{name} stretched SO far that they tipped over. No regrets.', action: null },
    { id: 'me15', text: '{name}\'s shadow caught their attention. They tried to play with it!', action: null },
    // Feed-specific micro-events
    { id: 'me16', text: 'While eating, {name} got food on their nose and went cross-eyed looking at it!', action: 'feed' },
    { id: 'me17', text: '{name} was chewing so happily they accidentally bit their own tongue. Oops!', action: 'feed' },
    { id: 'me18', text: '{name} saved one tiny morsel "for later" and hid it under a cushion.', action: 'feed' },
    { id: 'me19', text: 'The sound of crunching was SO loud. {name} eats with enthusiasm!', action: 'feed' },
    // Wash-specific micro-events
    { id: 'me20', text: 'During bathtime, {name} made the most ridiculous soap-beard!', action: 'wash' },
    { id: 'me21', text: '{name} caught a bubble and stared at the rainbow swirling inside it.', action: 'wash' },
    { id: 'me22', text: 'A tiny splash from {name}\'s bath hit you right on the nose!', action: 'wash' },
    { id: 'me23', text: '{name} discovered that wet paws make the funniest squeaky sounds on tile!', action: 'wash' },
    // Play-specific micro-events
    { id: 'me24', text: '{name} invented a completely new game on the spot! Rules unclear, but fun!', action: 'play' },
    { id: 'me25', text: 'During play, {name} accidentally did a perfect somersault!', action: 'play' },
    { id: 'me26', text: '{name} got the giggles and couldn\'t stop for a full minute!', action: 'play' },
    { id: 'me27', text: '{name} challenged their own reflection to a staring contest. They lost.', action: 'play' },
    // Groom-specific micro-events
    { id: 'me28', text: 'While being groomed, {name} purred so loudly the brush vibrated!', action: 'groom' },
    { id: 'me29', text: 'The brush found a tangled knot. {name} was VERY brave about it.', action: 'groom' },
    { id: 'me30', text: '{name} admired their reflection after grooming and struck a pose.', action: 'groom' },
    // Exercise-specific micro-events
    { id: 'me31', text: '{name} ran so fast they slid on the floor and spun in a circle!', action: 'exercise' },
    { id: 'me32', text: 'During the workout, {name} spotted a stick and HAD to fetch it.', action: 'exercise' },
    { id: 'me33', text: '{name} attempted a cool jump move and... almost nailed it!', action: 'exercise' },
    // Cuddle-specific micro-events
    { id: 'me34', text: 'Mid-cuddle, {name} let out the most contented sigh ever heard.', action: 'cuddle' },
    { id: 'me35', text: '{name} nuzzled so hard they bumped noses with you! Boop!', action: 'cuddle' },
    { id: 'me36', text: '{name}\'s tail wagged so hard during cuddles it knocked over a pillow.', action: 'cuddle' },
    // Room-filtered events
    { id: 'me37', text: '{name} heard the fridge hum and tilted their head at it curiously.', action: null, room: 'kitchen' },
    { id: 'me38', text: 'Something in the oven smells delicious! {name} is drooling a little.', action: null, room: 'kitchen' },
    { id: 'me39', text: '{name} found a cozy spot between the pillows and claimed it as theirs.', action: null, room: 'bedroom' },
    { id: 'me40', text: 'The bedroom clock ticked softly. {name} finds the rhythm soothing.', action: null, room: 'bedroom' },
    { id: 'me41', text: '{name} drew a smiley face in the bathroom mirror steam!', action: null, room: 'bathroom' },
    { id: 'me42', text: 'The sound of dripping water echoes. {name} thinks it sounds like music.', action: null, room: 'bathroom' },
    { id: 'me43', text: '{name} spotted a worm in the garden and watched it with fascination!', action: null, room: 'garden' },
    { id: 'me44', text: 'A bee buzzed past {name}\'s nose. They went cross-eyed following it!', action: null, room: 'garden' },
    { id: 'me45', text: '{name} found a four-leaf clover in the park! Lucky day!', action: null, room: 'park' },
    { id: 'me46', text: 'A friendly squirrel waved at {name} from a park tree!', action: null, room: 'park' },
    { id: 'me47', text: '{name} chased their tail in the backyard and got dizzy!', action: null, room: 'backyard' },
    { id: 'me48', text: 'The grass tickled {name}\'s paws and they did a funny hop-walk!', action: null, room: 'backyard' },
    { id: 'me49', text: '{name} pulled a book off the library shelf and "read" it upside down.', action: null, room: 'library' },
    { id: 'me50', text: '{name} found a cozy reading nook in the library and curled up in it.', action: null, room: 'library' },
    { id: 'me51', text: 'An arcade machine made a funny jingle and {name} bopped along!', action: null, room: 'arcade' },
    { id: 'me52', text: '{name} pressed random arcade buttons and somehow got a high score!', action: null, room: 'arcade' },
    { id: 'me53', text: 'The spa steam made {name}\'s fur extra fluffy. Cloud-level fluffy!', action: null, room: 'spa' },
    { id: 'me54', text: '{name} wrapped themselves in a warm towel like a cozy burrito!', action: null, room: 'spa' },
    // Season-filtered events
    { id: 'me55', text: 'A cherry blossom petal drifted in through the window! {name} caught it!', action: null, season: 'spring' },
    { id: 'me56', text: '{name} heard baby birds chirping outside. Spring babies!', action: null, season: 'spring' },
    { id: 'me57', text: '{name} found a cool spot in the shade. Smart move in this heat!', action: null, season: 'summer' },
    { id: 'me58', text: 'A warm summer breeze carried the scent of flowers to {name}.', action: null, season: 'summer' },
    { id: 'me59', text: '{name} heard leaves crunching outside and wanted to join in!', action: null, season: 'autumn' },
    { id: 'me60', text: 'An acorn rolled across the floor! {name} batted it around.', action: null, season: 'autumn' },
    { id: 'me61', text: '{name} pressed their nose to the cold window and made a fog circle!', action: null, season: 'winter' },
    { id: 'me62', text: '{name} watched snowflakes fall and tried to count each one.', action: null, season: 'winter' },
    // Weather-filtered events
    { id: 'me63', text: 'The sound of rain on the roof made {name} feel cozy and safe.', action: null, weather: 'rainy' },
    { id: 'me64', text: '{name} watched raindrops race down the window. Go, little drop, go!', action: null, weather: 'rainy' },
    { id: 'me65', text: 'A patch of warm sunshine found {name}, and they melted into it.', action: null, weather: 'sunny' },
    { id: 'me66', text: '{name} squinted happily at a sunbeam dancing across the floor.', action: null, weather: 'sunny' },
    { id: 'me67', text: '{name} watched snowflakes swirl outside, mesmerized by the patterns.', action: null, weather: 'snowy' },
    { id: 'me68', text: 'The world outside is white and quiet. {name} finds it magical.', action: null, weather: 'snowy' },
    // More universal flavor
    { id: 'me69', text: '{name} made the tiniest, most polite little hiccup!', action: null },
    { id: 'me70', text: 'A sunbeam shifted and {name} shuffled to stay in its warm path.', action: null },
    { id: 'me71', text: '{name} scratched behind their ear and hit THE perfect spot!', action: null },
    { id: 'me72', text: 'Somewhere in the house, a clock chimed. {name} counted the bongs.', action: null },
    { id: 'me73', text: '{name} found a warm spot on the floor and absolutely refused to move.', action: null },
    { id: 'me74', text: '{name} blinked slowly at you. In pet language, that means "I love you."', action: null },
    { id: 'me75', text: 'A gentle hum from somewhere in the house lulled {name} into a happy daze.', action: null },
    // Seasonal micro-events — spring
    { id: 'me_sp1', text: 'A butterfly landed on {name}\'s nose mid-meal. Surprise guest!', action: 'feed', season: 'spring' },
    { id: 'me_sp2', text: '{name} spotted a robin building a nest outside the window during bath time.', action: 'bathe', season: 'spring' },
    { id: 'me_sp3', text: 'Spring rain tapped on the roof like tiny applause for {name}.', action: null, season: 'spring' },
    { id: 'me_sp4', text: '{name} sneezed from the flower pollen and then giggled about it.', action: null, season: 'spring' },
    // Seasonal micro-events — summer
    { id: 'me_su1', text: '{name} noticed their water bowl evaporating fast in the summer heat!', action: 'water', season: 'summer' },
    { id: 'me_su2', text: 'A cricket hopped right across {name}\'s play area. Bold little visitor!', action: 'play', season: 'summer' },
    { id: 'me_su3', text: '{name} found a ladybug on the windowsill and watched it fly away.', action: null, season: 'summer' },
    { id: 'me_su4', text: 'The afternoon heat made {name} extra drowsy. Perfect nap weather.', action: null, season: 'summer' },
    // Seasonal micro-events — autumn
    { id: 'me_au1', text: 'A leaf blew in through the window and landed on {name}\'s head like a hat!', action: null, season: 'autumn' },
    { id: 'me_au2', text: '{name} heard acorns dropping on the roof — nature\'s percussion!', action: null, season: 'autumn' },
    { id: 'me_au3', text: 'The smell of cinnamon drifted in. {name}\'s nose twitched with interest.', action: 'feed', season: 'autumn' },
    { id: 'me_au4', text: '{name} pressed against the window to watch the leaves spiral down.', action: null, season: 'autumn' },
    // Seasonal micro-events — winter
    { id: 'me_wi1', text: '{name} noticed frost flowers on the window and tried to touch them.', action: null, season: 'winter' },
    { id: 'me_wi2', text: 'The bath water steamed extra in the cold air. {name} looked like a cloud!', action: 'bathe', season: 'winter' },
    { id: 'me_wi3', text: '{name} burrowed deeper into the blankets. Winter hibernation mode: ON.', action: 'sleep', season: 'winter' },
    { id: 'me_wi4', text: 'A gust of cold wind rattled the window. {name} snuggled closer to you.', action: null, season: 'winter' }
];

// Trigger chance for micro-events (10-15%)
const MICRO_EVENT_CHANCE = 0.12;

/**
 * Get a micro-event for a care action, if one triggers.
 * Filters by action, room, season, weather. Tracks seen-history on pet object.
 * Returns { text } or null if no event triggers.
 */
function getMicroEvent(pet, action, room, season, weather) {
    if (!pet || Math.random() > MICRO_EVENT_CHANCE) return null;
    const name = pet.name || 'Your pet';
    // Initialize seen-history on pet
    if (!Array.isArray(pet._seenMicroEvents)) pet._seenMicroEvents = [];
    // Filter eligible events
    const eligible = CARE_MICRO_EVENTS.filter(ev => {
        // Already seen in current cycle?
        if (pet._seenMicroEvents.includes(ev.id)) return false;
        // Action filter: null matches any, otherwise must match
        if (ev.action && ev.action !== action) return false;
        // Room filter
        if (ev.room && ev.room !== room) return false;
        // Season filter
        if (ev.season && ev.season !== season) return false;
        // Weather filter
        if (ev.weather && ev.weather !== weather) return false;
        return true;
    });
    if (eligible.length === 0) {
        // Reset seen history when pool is exhausted
        pet._seenMicroEvents = [];
        return null;
    }
    const event = eligible[Math.floor(Math.random() * eligible.length)];
    pet._seenMicroEvents.push(event.id);
    return { text: event.text.replace(/\{name\}/g, name) };
}

// ==================== PERSONALITY IDLE MONOLOGUES ====================
// Triggered after 30-60 seconds of player inactivity. Longer and more
// characterful than standard speech bubbles. 25 per personality = 150 total.

const IDLE_MONOLOGUES = {
    lazy: [
        'You know what I love about doing nothing? You can\'t get it wrong.',
        'I\'ve been thinking about thinking about doing something. Maybe tomorrow.',
        'The pillow has the perfect indent from my head. Why would I move?',
        'I counted the ceiling tiles. Then I lost count. Then I napped.',
        'Some days are for doing. Today is for being. Being horizontal.',
        'I heard a sound outside. Decided it wasn\'t worth investigating. Good choice.',
        'Did you know that sloths sleep 20 hours a day? I admire their work ethic.',
        'I moved three inches to the left. I\'m exhausted. Worth it though — better sun angle.',
        'My blanket smells like warmth and dreams and a little bit like snacks.',
        'I have a to-do list. Item one: lie down. Item two: see item one.',
        'The gentle hum of the house is like a lullaby that never ends.',
        'I dreamed I was a cloud. Floating. Soft. No responsibilities. It was perfect.',
        'Sometimes the best adventures are the ones you take in your dreams.',
        'There\'s a warm spot on the floor and it has my name on it.',
        'I tried to count sheep but fell asleep before sheep number two.',
        'The art of relaxation is underappreciated. I\'m basically a master craftsperson.',
        'I can hear my pillow calling me. It misses me. I should go back.',
        'You know what\'s great about lying here? Everything is within not-reaching distance.',
        'I found the coziest position. I shall document it for future generations.',
        'My personal record for not moving is four hours. I think I can beat it today.',
        'The soft tick of the clock is my favorite song. Soothing.',
        'Being lazy isn\'t a flaw. It\'s energy conservation. I\'m basically an environmentalist.',
        'I watched a dust particle float for ten minutes. Riveting stuff.',
        'The warmth of this spot is the closest thing to a hug from the sun.',
        'Some say time you enjoy wasting isn\'t wasted time. I enjoy ALL the time.'
    ],
    energetic: [
        'I\'ve been sitting still for SO LONG! It\'s been like thirty seconds!',
        'What if we rearranged ALL the furniture?! Right now?! For fun?!',
        'I can feel the energy buzzing in my paws! It\'s like electricity!',
        'Okay I just had the BEST idea — what if we ran in circles really fast?!',
        'My tail is wagging SO hard right now and I don\'t even know why!',
        'You know what would be great? Everything! All at once! LET\'S GO!',
        'I wonder if I could jump to the top of that shelf. Only one way to find out!',
        'I just did seventeen laps of the room. In my head. Now I wanna do them for real!',
        'Every moment we\'re not playing is a moment that could be PLAYING!',
        'I have so much energy I think I might vibrate through the floor!',
        'The air smells like adventure and I want ALL of it!',
        'What\'s that sound? And that one? And THAT one? Everything is so exciting!',
        'I bet I could break my personal speed record today. I can FEEL it!',
        'Sitting still is my biggest challenge. Bigger than any obstacle course!',
        'My legs are literally bouncing. I can\'t help it. They have a mind of their own!',
        'Did something move? I SAW something move! Or maybe it was my shadow. STILL EXCITING!',
        'Fun fact: I have been awake for hours and I have MORE energy than when I started!',
        'I just want to RUN and JUMP and PLAY and EAT and RUN AGAIN!',
        'I think the world would be better if everyone bounced more. Just saying!',
        'If energy were currency, I\'d be the richest creature alive!',
        'I can hear birds outside. I bet I could outrun them. Wanna see?',
        'My heart is beating so fast because my body knows FUN is just around the corner!',
        'I tried to meditate once. Lasted two seconds. New personal best!',
        'Every single thing in this room could be a toy if you believe hard enough!',
        'Is it just me or does the air taste like POSSIBILITIES today?!'
    ],
    curious: [
        'I\'ve been wondering — why is the sky blue? I should research this.',
        'If I stare at this wall long enough, I start to see patterns. Faces, even.',
        'Did you know that some flowers only bloom at night? Nature is incredible.',
        'I found a crack in the floor. I\'ve been studying it. It looks like a tiny river.',
        'I wonder what\'s on the other side of that wall. Another room? Another world?',
        'The shadows in this room change shape every hour. I\'ve been tracking them.',
        'If I could read, I\'d read everything. Every book, every label, every sign.',
        'There\'s a spider web in the corner. The engineering is remarkable.',
        'I noticed the floorboards creak in a pattern. Fourth, seventh, twelfth.',
        'What makes dust float? It defies gravity so casually. Fascinating.',
        'I can smell seven different scents in this room. I\'m cataloging them all.',
        'The way light bends through the window makes tiny rainbows. Did you see?',
        'I wonder who lived here before us. What were their stories?',
        'I\'ve been watching an ant carry a crumb. It\'s inspiring, actually.',
        'How does the clock know what time it is? I have so many questions.',
        'The texture of the carpet is different in every spot. I checked.',
        'I can hear the house settling. Every creak tells a story.',
        'Did you know that your heartbeat changes speed throughout the day?',
        'I discovered that if I tilt my head exactly right, sounds get louder on one side.',
        'I wonder what clouds taste like. Probably not cotton candy, but maybe?',
        'The pattern on the curtains has 47 repeating elements. I counted twice.',
        'There\'s a whole ecosystem in the garden I haven\'t even explored yet.',
        'I wonder if fish know they\'re wet. These are the questions that matter.',
        'The smell of old books is caused by a chemical compound. I can smell it from here.',
        'If I could ask the moon one question, I\'d ask what Earth looks like from there.'
    ],
    shy: [
        'It\'s nice when it\'s quiet like this. Just us and the soft sounds of home.',
        'I know I\'m quiet, but I notice everything. The way the light shifts. Your breathing.',
        'Sometimes I want to say something but the words get shy too.',
        'This corner is my safe place. The walls feel like a hug.',
        'I like when you\'re close but not too close. This distance is just right.',
        'The shadows are my friends. They\'re quiet, like me.',
        'I practiced being brave today. I looked out the window for ten whole seconds.',
        'When the house is still, I can hear my own heartbeat. It\'s soothing.',
        'I wish I could tell you all the things I feel. But maybe you already know.',
        'Sometimes courage looks like staying in the room when you want to hide.',
        'I wrote a tiny poem in my head. It goes: "Home is warm. Home is safe. Home is you."',
        'The blanket knows all my secrets. It keeps them warm and safe.',
        'I peered around the corner today. There was nothing scary there. Progress!',
        'When I close my eyes, I can pretend the world is exactly as small as I need it to be.',
        'You make the scary things less scary. I hope you know that.',
        'I like the sound of rain because it means everyone stays inside. Cozy.',
        'I count my breaths when I feel nervous. In... two... three... out... two... three...',
        'The softest spot in the room is where I am right now. I chose wisely.',
        'I don\'t need to be brave every day. Some days, being here is enough.',
        'I trust you more today than yesterday. Tomorrow I\'ll trust you even more.',
        'My hiding spot has a perfect view of everything. I can watch without being seen.',
        'Gentle sounds are my favorite. Wind chimes. Purring. Your footsteps.',
        'I wanted to explore, but the couch was right here. The couch understood.',
        'You looked at me and smiled. I looked away. But inside, I smiled too.',
        'The world is big and loud. But right here, right now, it\'s perfect.'
    ],
    playful: [
        'I just realized that EVERYTHING in this room is a potential toy!',
        'I\'m plotting my next prank. Don\'t worry. It\'ll be hilarious. For me.',
        'What if — hear me out — what if socks are tiny sleeping bags for feet?',
        'I\'ve been practicing my victory dance. It involves seven spins and a boop.',
        'If life gives you lemons, JUGGLE THEM! That\'s my motto!',
        'I tried to balance a thing on my nose. Failed. Tried again. Almost. AGAIN!',
        'The floor is lava! The couch is safe! The table is BONUS POINTS!',
        'I wonder if I could make a fort out of all the pillows. BRB building.',
        'My reflection in the window is making faces at me. How dare they!',
        'I hid something somewhere and now I can\'t remember where. SURPRISE FUTURE ME!',
        'Every closed door is a mystery. Every open door is an invitation. I love doors!',
        'I just made up a new game. The rules change every time you play. I always win.',
        'If fun were a superpower, I\'d be the world\'s mightiest hero!',
        'I saw a bug and decided we\'re best friends now. I named them Boop.',
        'There\'s a shadow on the wall that looks like a bunny. I\'ve been having conversations.',
        'Why walk when you can skip? Why skip when you can CARTWHEEL?!',
        'I challenged the cushion to a wrestling match. I won. It didn\'t stand a chance.',
        'Imagination is free and I am SPENDING GENEROUSLY!',
        'I tried to teach myself a backflip. The score so far: floor 3, me 0.',
        'Every day is an adventure when you\'re determined to have fun!',
        'I just winked at a lamp. It didn\'t wink back. Very rude.',
        'Tag! You\'re it! Wait, you didn\'t notice? TAG! YOU\'RE IT!',
        'I invented a song. It goes "boop boop bee-boop bap." It\'s a hit.',
        'The best thing about today is that it\'s not over yet. More fun to be had!',
        'I wonder what would happen if I just... *pokes thing off the table* Heh heh heh.'
    ],
    grumpy: [
        'I\'m not grumpy. I\'m... selectively enthusiastic. Very selectively.',
        'This spot is adequate. Not good. Not bad. Adequate. ...Fine, it\'s good.',
        'I was going to complain about something but I forgot what. So I\'ll just complain about that.',
        'Everyone thinks I\'m grumpy. I prefer "discerning." Or "realistic."',
        'I have opinions. Strong ones. You wouldn\'t like them. But they\'re correct.',
        'The sun is too bright. The shade is too dark. Is there a medium option?',
        'I don\'t DISLIKE things. I\'m just very honest about my preferences.',
        'Silence is golden. Napping is platinum. Being left alone is diamond.',
        'I appreciate being fed. I won\'t SAY I appreciate it, but I do.',
        'My face says grumpy but my heart says... slightly less grumpy.',
        'You know what\'s annoying? Most things. But you\'re... tolerable.',
        'I tried smiling once. My face said no. We agreed to disagree.',
        'Happiness is overrated. Contentment is underrated. I\'m content. Don\'t make a fuss.',
        'I\'m going to sit here and judge everything silently. It\'s called having standards.',
        'If I had a diary it would say "Day 847: Still surrounded by nonsense. Snack was decent."',
        'The world is loud and chaotic. This corner is quiet and mine. I\'ll stay here.',
        'I was minding my own business when joy tried to sneak up on me. I caught it. Barely.',
        'Don\'t let the frown fool you. Deep down, I... also have a frown.',
        'I have exactly one comfort item and if anyone touches it, there will be consequences.',
        'Complaining is just caring really loudly about things. I care A LOT.',
        'I\'m not anti-social. I\'m pro-solitude. There\'s a difference.',
        'Today\'s mood: cautiously neutral. Don\'t push it.',
        'I secretly named the dust bunny in the corner. Its name is Gerald. We\'re acquaintances.',
        'Sometimes I growl to maintain my reputation. It\'s a lot of work.',
        'You... make this place less terrible. That\'s the nicest thing I\'ll say today.'
    ]
};

/**
 * Get an idle monologue for the pet based on personality.
 * Tracks seen-history to prevent repeats until full pool cycles.
 * Returns a monologue string or null if none available.
 */
function getIdleMonologue(pet) {
    if (!pet || !pet.personality) return null;
    const personality = pet.personality;
    const pool = IDLE_MONOLOGUES[personality];
    if (!pool || pool.length === 0) return null;
    // Initialize seen-history on pet
    if (!Array.isArray(pet._seenMonologues)) pet._seenMonologues = [];
    // Filter unseen
    const unseen = pool.filter((_, i) => !pet._seenMonologues.includes(i));
    if (unseen.length === 0) {
        // Reset cycle
        pet._seenMonologues = [];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    // Pick random unseen by finding its original index
    const pick = unseen[Math.floor(Math.random() * unseen.length)];
    const idx = pool.indexOf(pick);
    pet._seenMonologues.push(idx);
    return pick;
}

// ==================== ROOM-SPECIFIC INTERACTION FLAVOR TEXT ====================
// Keyed by [action][room]. Each entry is 1-2 contextual flavor lines.
// {name} is replaced at runtime. Supplements or overrides default feedback.

const ROOM_FLAVOR_TEXT = {
    feed: {
        bedroom: [
            '{name} sneaks crumbs into bed. Crumbs everywhere.',
            '{name} eats a midnight snack on the pillow. No regrets.'
        ],
        kitchen: [
            '{name} climbs up to the counter and eats properly at the table!',
            'The kitchen smells amazing and {name} is right in the middle of it.'
        ],
        bathroom: [
            '{name} munches next to the sink. A little odd, but clean!',
            'Eating in the bathroom? {name} calls it "efficient multitasking."'
        ],
        backyard: [
            '{name} has a little picnic on the grass. Nature dining!',
            '{name} eats outside and the breeze carries the delicious smell everywhere.'
        ],
        park: [
            '{name} has a little picnic under the big oak tree.',
            'Squirrels watch jealously as {name} enjoys park snacks.'
        ],
        garden: [
            '{name} eats surrounded by fresh herbs. Farm-to-table luxury!',
            '{name} nibbles next to the tomato plants. Garden-fresh vibes.'
        ],
        library: [
            '{name} eats quietly so as not to disturb the books.',
            'A few crumbs fall between the pages. {name} looks guilty.'
        ],
        arcade: [
            '{name} eats with one paw while gaming with the other.',
            'Snacks and high scores — {name} is living the dream.'
        ],
        spa: [
            '{name} enjoys a meal with spa-level relaxation.',
            'Eating in the spa feels very fancy. {name} approves.'
        ],
        observatory: [
            '{name} munches while stargazing. Cosmic dining experience!',
            'Dinner under the stars — {name} feels like royalty.'
        ],
        workshop: [
            '{name} takes a snack break between building projects.',
            '{name} eats carefully, keeping food away from the tools.'
        ]
    },
    wash: {
        bedroom: [
            '{name} gets a quick wipe-down on the bed. Towel duty!',
            'A gentle sponge bath right in the cozy bedroom.'
        ],
        kitchen: [
            '{name} gets a splash bath at the kitchen sink. Efficient!',
            'The kitchen faucet doubles as a pet shower today.'
        ],
        bathroom: [
            '{name} gets the full spa treatment — warm water and everything!',
            'Bubbles fill the tub and {name} is in bath heaven.'
        ],
        backyard: [
            '{name} gets a fun hose-down in the backyard! SPLASH!',
            'The sprinkler doubles as a bath. {name} runs through it laughing!'
        ],
        park: [
            '{name} splashes in the park fountain to get clean!',
            'A quick dip in the park creek — nature\'s bathtub!'
        ],
        garden: [
            'The garden hose gives {name} a gentle rinse among the flowers.',
            '{name} gets clean and comes out smelling like the garden.'
        ],
        library: [
            'A quick, careful wipe-down — can\'t splash near the books!',
            '{name} holds very still for a tidy cleanup. Good manners.'
        ],
        arcade: [
            'A quick cleanup between game rounds. Hygiene achievement unlocked!',
            '{name} towels off quickly — back to gaming!'
        ],
        spa: [
            'The spa bath is absolute luxury. Warm steam, gentle water, bliss.',
            '{name} melts into the spa waters. This is what pampering feels like.'
        ],
        observatory: [
            'A gentle wash under the dome. The stars seem to twinkle in approval.',
            '{name} gets clean while watching constellations. Magical.'
        ],
        workshop: [
            '{name} really needed this wash — workshop dust everywhere!',
            'Scrubbing off sawdust and metal shavings. {name} feels renewed.'
        ]
    },
    play: {
        bedroom: [
            '{name} bounces on the bed like a trampoline! Boing boing!',
            'Pillow fort! {name} defends the fortress with squeaky battle cries!'
        ],
        kitchen: [
            '{name} slides across the kitchen tiles! Wheeeee!',
            'Playing between the table legs — {name}\'s own obstacle course!'
        ],
        bathroom: [
            '{name} plays with the shower curtain like it\'s a cape!',
            'Splashing in tiny puddles — bathroom playtime!'
        ],
        backyard: [
            '{name} zooms around the backyard at full speed!',
            'The whole backyard is a playground and {name} owns it!'
        ],
        park: [
            '{name} runs through the grass, feeling the wind in their fur!',
            'The park is huge and {name} wants to play in EVERY corner!'
        ],
        garden: [
            '{name} plays hide and seek among the tall sunflowers!',
            'Chasing butterflies through the garden beds!'
        ],
        library: [
            '{name} plays quietly with a soft toy between bookshelves.',
            'A gentle game of peekaboo around the reading chairs!'
        ],
        arcade: [
            'The arcade is basically play paradise for {name}!',
            '{name} bounces between games, buzzing with excitement!'
        ],
        spa: [
            '{name} plays with bubbles floating through the steam.',
            'Splish splash — spa play is surprisingly fun!'
        ],
        observatory: [
            '{name} pretends to catch stars through the telescope!',
            'Playing astronaut — {name} floats in "zero gravity!"'
        ],
        workshop: [
            '{name} builds something amazing with workshop scraps!',
            'Playing inventor — {name} creates a wobbly masterpiece!'
        ]
    },
    sleep: {
        bedroom: [
            '{name} snuggles deep into the softest bed. Perfect sleep spot.',
            'The bedroom was MADE for sleeping and {name} agrees completely.'
        ],
        kitchen: [
            '{name} dozes off next to the warm oven. Toasty nap!',
            'A nap by the humming fridge — surprisingly soothing!'
        ],
        bathroom: [
            '{name} curls up on the bath mat. It\'s fluffy enough.',
            'The gentle sound of dripping water lulls {name} to sleep.'
        ],
        backyard: [
            '{name} naps in a warm patch of grass. Outdoor dreaming!',
            'A gentle breeze rocks {name} to sleep under the open sky.'
        ],
        park: [
            '{name} finds a shady tree and naps beneath it.',
            'The sounds of nature create the perfect sleep soundtrack for {name}.'
        ],
        garden: [
            '{name} sleeps among the flowers. They\'ll smell wonderful when they wake!',
            'A garden nap surrounded by buzzing bees and warm earth.'
        ],
        library: [
            '{name} falls asleep on a pile of soft books. Bookworm dreams!',
            'The quiet rustle of pages is the perfect lullaby for {name}.'
        ],
        arcade: [
            '{name} passes out mid-game. The high score will have to wait.',
            'Even gamers need rest. {name} snoozes to 8-bit dream music.'
        ],
        spa: [
            'A spa nap — the most luxurious rest {name} has ever had.',
            'Warm towels, soft light, and perfect silence. Spa sleep is unmatched.'
        ],
        observatory: [
            '{name} falls asleep watching the night sky. Dreaming among stars.',
            'The slow rotation of the cosmos lulls {name} into deep sleep.'
        ],
        workshop: [
            '{name} rests on a pile of soft rags. Earned that nap!',
            'The workshop hum fades as {name} drifts into well-deserved sleep.'
        ]
    },
    groom: {
        bedroom: [
            '{name} gets groomed on the bed. Loose fur everywhere!',
            'A cozy bedroom grooming session with the good brush.'
        ],
        kitchen: [
            '{name} gets a quick brush by the bright kitchen window.',
            'Great lighting in here for finding every loose hair!'
        ],
        bathroom: [
            'The bathroom mirror lets {name} admire the grooming progress!',
            'Full grooming station — brush, comb, and bathroom mirror!'
        ],
        backyard: [
            'Outdoor grooming! The breeze carries loose fur away like confetti.',
            '{name} gets brushed in the sunshine. Fur glowing!'
        ],
        park: [
            '{name} gets primped up for the park crowd. Looking good!',
            'Birds collect {name}\'s loose fur for their nests. Recycling!'
        ],
        garden: [
            '{name} sits patiently among the flowers for garden grooming.',
            'Grooming in the garden — {name} emerges smelling like roses.'
        ]
    },
    exercise: {
        bedroom: [
            '{name} does laps around the bed. Indoor training!',
            'Bedroom cardio: jump on bed, jump off bed, repeat!'
        ],
        backyard: [
            '{name} sprints across the backyard — full speed ahead!',
            'The backyard is the perfect training ground for {name}!'
        ],
        park: [
            '{name} runs the full park trail! What a champion!',
            'The open fields give {name} room to really stretch those legs!'
        ],
        garden: [
            '{name} weaves between garden rows like an agility course!',
            'Garden fitness — {name} does squats between the rows.'
        ],
        workshop: [
            '{name} lifts scraps like tiny weights. Workout improvisation!',
            'The workshop becomes a gym. {name} is getting creative!'
        ]
    },
    cuddle: {
        bedroom: [
            'The bed is the perfect cuddle zone. {name} melts into the pillows.',
            'Blanket-wrapped cuddles in the bedroom. Maximum coziness achieved.'
        ],
        kitchen: [
            '{name} gets warm kitchen hugs. Smells like home and cookies.',
            'Cuddling by the warm stove — {name} purrs with contentment.'
        ],
        backyard: [
            '{name} cuddles on the porch swing. Gentle rocking, gentle breeze.',
            'Outdoor cuddles with grass underfoot and sky overhead.'
        ],
        park: [
            'A cozy cuddle on the park bench. People smile as they walk by.',
            '{name} snuggles close on the picnic blanket. Park cuddle perfection.'
        ],
        library: [
            'Cuddling in a reading nook. {name} listens to your heartbeat like a story.',
            'The library is quiet and warm. Perfect for a long, peaceful cuddle.'
        ],
        spa: [
            'Spa cuddles in warm towels. {name} has never been more relaxed.',
            'The spa steam makes everything soft and dreamy for cuddle time.'
        ]
    },
    treat: {
        kitchen: [
            '{name} gets their treat right at the source — the kitchen counter!',
            'Kitchen treats taste extra special. {name} is convinced of this.'
        ],
        park: [
            '{name} enjoys their treat on a park bench. Outdoor indulgence!',
            'Eating treats in the park — {name} feels like a fancy diner.'
        ],
        bedroom: [
            'A secret treat in bed. {name} savors every crumb.',
            'Midnight treat in the bedroom — the best kind of snack.'
        ]
    },
    medicine: {
        bathroom: [
            'Medicine in the bathroom, just like a real doctor\'s office.',
            '{name} is brave at the bathroom medicine cabinet.'
        ],
        bedroom: [
            '{name} takes medicine tucked safely in bed. Getting better in comfort.',
            'Bed rest and medicine — the classic recovery combo.'
        ],
        spa: [
            'The spa makes medicine time feel more like a healing ritual.',
            'Warm steam helps the medicine work even better for {name}.'
        ]
    }
};

/**
 * Get room-specific flavor text for a care action.
 * Returns a string or null if no room-specific text exists.
 */
function getRoomFlavorText(action, room, petName) {
    const actionPool = ROOM_FLAVOR_TEXT[action];
    if (!actionPool) return null;
    const roomPool = actionPool[room];
    if (!roomPool || roomPool.length === 0) return null;
    const msg = roomPool[Math.floor(Math.random() * roomPool.length)];
    return msg.replace(/\{name\}/g, petName || 'Your pet');
}

// ==================== PET-TO-PET COMMENTARY ====================
// When 2+ pets are present, one pet comments about another.
// Organized by relationship tier (low/mid/high) and personality of the speaker.
// {speaker} = commenting pet, {target} = the other pet.

const PET_COMMENTARY = {
    // Low relationship (stranger, acquaintance)
    low: {
        lazy: [
            '{speaker} glances at {target} and yawns. "New friend... or nap-blocker?"',
            '{speaker} watches {target} from a distance. Too much effort to go say hi.',
            '{speaker} mutters: "That {target} is very... awake. Exhausting to watch."'
        ],
        energetic: [
            '{speaker} bounces over to {target}! "HI! You\'re NEW! Wanna PLAY?!"',
            '{speaker} runs circles around {target}! "I have SO much to show you!"',
            '{speaker} vibrates with excitement near {target}. Making a new friend!'
        ],
        curious: [
            '{speaker} sniffs {target} carefully. "Interesting. Very interesting."',
            '{speaker} tilts their head at {target}. "What are you? Where are you from?"',
            '{speaker} takes mental notes about {target}. Research purposes only.'
        ],
        shy: [
            '{speaker} peeks at {target} from behind a cushion. Not ready yet.',
            '{speaker} whispers: "Is... is {target} nice? They seem nice. Maybe."',
            '{speaker} hides but keeps one eye on {target}. Curious but cautious.'
        ],
        playful: [
            '{speaker} drops a toy at {target}\'s feet. "Play? PLAY? Please play!"',
            '{speaker} does a silly dance to get {target}\'s attention!',
            '{speaker} pokes {target} and runs away giggling. Tag!'
        ],
        grumpy: [
            '{speaker} eyes {target} suspiciously. "Don\'t touch my stuff."',
            '{speaker} grumbles: "Oh great. More company. Just what I needed."',
            '{speaker} turns their back on {target}. Playing it cool. Very cool.'
        ]
    },
    // Mid relationship (friend, closeFriend)
    mid: {
        lazy: [
            '{speaker} and {target} nap side by side. Synchronized napping!',
            '{speaker} nudges {target}: "Wanna lie here and do nothing together?"',
            '{speaker} shares their warm spot with {target}. That\'s real friendship.'
        ],
        energetic: [
            '{speaker} and {target} chase each other in joyful circles!',
            '{speaker} challenges {target} to a race! "Ready set GO!"',
            '{speaker} bounces: "{target}! You\'re the BEST adventure friend!"'
        ],
        curious: [
            '{speaker} and {target} investigate a sound together. Teamwork!',
            '{speaker} tells {target} a fun fact. {target} seems impressed!',
            '{speaker}: "Hey {target}, did you know that—" *enthusiastic explanation*'
        ],
        shy: [
            '{speaker} sits quietly next to {target}. Comfortable silence.',
            '{speaker} brushes against {target} gently. A small gesture of trust.',
            '{speaker} whispers a secret to {target}. They lean in to listen.'
        ],
        playful: [
            '{speaker} and {target} invent a brand new game together!',
            '{speaker} playfully steals {target}\'s toy then gives it right back!',
            '{speaker}: "Hey {target}, wanna build a pillow fort? I have a PLAN!"'
        ],
        grumpy: [
            '{speaker} pretends to be annoyed by {target}. Sits closer anyway.',
            '{speaker}: "I don\'t LIKE {target}. I just tolerate them. ...Really well."',
            '{speaker} shares food with {target} when they think no one is watching.'
        ]
    },
    // High relationship (bestFriend, family)
    high: {
        lazy: [
            '{speaker} and {target} are piled on top of each other napping. A cuddle puddle.',
            '{speaker} can\'t sleep without {target} nearby. They\'re a bonded pair now.',
            '{speaker} and {target} breathe in sync. That\'s how close they are.'
        ],
        energetic: [
            '{speaker} and {target} have their own secret celebration dance!',
            '{speaker}: "{target} is my FAVORITE! We do EVERYTHING together!"',
            '{speaker} and {target} zoom around in perfect formation. Dynamic duo!'
        ],
        curious: [
            '{speaker} and {target} explore every corner together. Best research team.',
            '{speaker} explains their latest discovery to {target} with great passion.',
            '{speaker}: "{target} asks the best questions. We make such a good team!"'
        ],
        shy: [
            '{speaker} nuzzles {target} openly. The shyness melts away with family.',
            '{speaker} feels brave enough to play — but only with {target}.',
            '{speaker} sighs happily next to {target}. "You make the world less scary."'
        ],
        playful: [
            '{speaker} and {target} have inside jokes no one else understands!',
            '{speaker}: "{target} is the ULTIMATE playmate! No one plays better!"',
            '{speaker} and {target} put on a show together. Standing ovation!'
        ],
        grumpy: [
            '{speaker} ACTUALLY smiles at {target}. Mark the calendar.',
            '{speaker} growls at everyone EXCEPT {target}. Soft spot detected.',
            '{speaker}: "If anyone messes with {target}, they answer to ME. Hmph."'
        ]
    }
};

/**
 * Get a pet-to-pet commentary line.
 * @param {Object} speaker - The pet making the comment
 * @param {Object} target - The pet being commented about
 * @param {string} relationshipLevel - One of the RELATIONSHIP_ORDER levels
 * @returns {string|null} Commentary text or null
 */
function getPetCommentary(speaker, target, relationshipLevel) {
    if (!speaker || !target) return null;
    const speakerName = speaker.name || 'Your pet';
    const targetName = target.name || 'Friend';
    const personality = speaker.personality || 'playful';
    // Map relationship level to tier
    let tier = 'low';
    if (['friend', 'closeFriend'].includes(relationshipLevel)) tier = 'mid';
    else if (['bestFriend', 'family'].includes(relationshipLevel)) tier = 'high';
    const tierPool = PET_COMMENTARY[tier];
    if (!tierPool) return null;
    const persPool = tierPool[personality];
    if (!persPool || persPool.length === 0) return null;
    const msg = persPool[Math.floor(Math.random() * persPool.length)];
    return msg.replace(/\{speaker\}/g, speakerName).replace(/\{target\}/g, targetName);
}

// ==================== EXPLORATION ENCOUNTER NARRATIVES ====================
// 5 narrative encounter lines per biome, displayed with expedition results.
// {name} = pet name. Evocative mini-stories describing what happened.

const EXPLORATION_NARRATIVES = {
    forest: [
        '{name} followed a trail of glowing mushrooms deep into the woods and found an ancient hollow tree humming with warmth.',
        'A friendly fox led {name} to a hidden clearing where the trees whispered secrets to the wind.',
        '{name} crossed a moss-covered bridge over a babbling brook and discovered carvings left by an old traveler.',
        'The forest canopy parted and golden light rained down. {name} sat in the glow and felt perfectly at peace.',
        'Deep in the forest, {name} heard a melody — an old wind chime tangled in the branches, still singing after all these years.'
    ],
    beach: [
        '{name} chased the tide out and back, finding treasures the ocean left behind in the wet sand.',
        'A hermit crab traded shells with {name}! Okay, it was more like {name} found an empty one. But still!',
        '{name} dug a hole so deep they found a layer of cool, smooth stones that hummed when tapped together.',
        'The sunset painted the waves gold and {name} stood in the foam, mesmerized by the shifting colors.',
        '{name} discovered a tide pool full of tiny starfish and anemones. A whole miniature world!'
    ],
    mountain: [
        '{name} climbed through swirling mist and emerged above the clouds. The whole world stretched below.',
        'At the summit, the wind carried a sound like distant bells. {name}\'s fur stood on end with wonder.',
        '{name} found a crystal embedded in the cliff face, warm to the touch despite the mountain cold.',
        'An eagle circled overhead, then dove past {name} so close they felt the rush of its wings.',
        '{name} discovered an old stone cairn left by previous explorers, each stone smooth from countless hands.'
    ],
    cave: [
        'The cave walls sparkled with minerals that cast tiny rainbows when {name}\'s light hit them.',
        '{name} followed the sound of dripping water deeper until they found an underground lake, still as glass.',
        'Glowing lichen lit {name}\'s path through a narrow passage that opened into a vast, echoing chamber.',
        '{name} found ancient drawings on the cave wall — stick figures of pets who explored here long ago.',
        'The cave hummed with a low frequency {name} could feel in their bones. Something ancient lived here once.'
    ],
    skyIsland: [
        '{name} leaped between floating islands, each one a garden suspended in endless blue sky.',
        'The clouds below swirled like ocean waves. {name} reached down and touched one — it was cool and soft.',
        'A stairway of crystallized light led {name} to a platform where the stars were close enough to hear.',
        '{name} found a sky garden where flowers grew upside down, their petals reaching toward the ground far below.',
        'The wind carried the scent of rain and starlight. {name} breathed it in and felt weightless.'
    ],
    underwater: [
        '{name} swam through a coral archway into a cathedral of color — fish of every hue swirled around them.',
        'Bioluminescent jellyfish drifted past {name} like living lanterns, painting the deep water in soft blue light.',
        '{name} found a sunken garden where sea anemones swayed in the current like flowers in a gentle breeze.',
        'An old ship lay on the seabed, its hull home to a thousand tiny creatures. {name} peered through a porthole.',
        'The ocean floor was carpeted with iridescent shells. {name} could hear the ocean singing through them.'
    ],
    skyZone: [
        '{name} rode an updraft so high they could see the curvature of the horizon. Breathtaking silence up here.',
        'Wind temples hung suspended in the air, their chimes creating harmonies that {name} felt in their chest.',
        '{name} discovered a feather shrine where thousands of feathers orbited a glowing crystal in perfect formation.',
        'The air was thin and crisp. {name} caught a thermal and glided — for a moment, they truly flew.',
        'Between the clouds, {name} found a pocket of absolute stillness. No wind. No sound. Just peace.'
    ]
};

/**
 * Get an exploration encounter narrative for a biome.
 * Returns a narrative string with {name} replaced.
 */
function getExplorationNarrative(biomeId, petName) {
    const pool = EXPLORATION_NARRATIVES[biomeId];
    if (!pool || pool.length === 0) return null;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    return msg.replace(/\{name\}/g, petName || 'Your pet');
}

// ==================== MILESTONE PERSONALITY REACTIONS ====================
// Personality-specific reactions when badges/trophies are earned.
// Keyed by badge ID, with per-personality lines. Generic fallback per personality.

const MILESTONE_REACTIONS = {
    // 15 most common badges with personality-specific reactions
    firstFeedBadge: {
        lazy: '{name} barely opens one eye. "Cool. Can we eat again now?"',
        energetic: '{name} EXPLODES with joy! "FIRST MEAL BADGE! YEAHHH!"',
        curious: '{name} examines the badge. "Fascinating craftsmanship!"',
        shy: '{name} blushes. "We... we did it together."',
        playful: '{name} wears the badge as a hat! "Look at meeeee!"',
        grumpy: '{name} sniffs. "About time we got recognition. Hmph."'
    },
    babySteps: {
        lazy: '{name} yawns at the badge. "Born tired, living the dream."',
        energetic: '{name} bounces! "I\'m HERE! I\'m REAL! Let\'s DO things!"',
        curious: '{name} studies their own paws in wonder. "I exist! Amazing!"',
        shy: '{name} peeks out nervously. "H-hello world..."',
        playful: '{name} immediately tries to play with the badge!',
        grumpy: '{name} grumbles. "Great, I\'m born. Now what?"'
    },
    growUp: {
        lazy: '{name}: "Growing up is exhausting. I need a nap to process this."',
        energetic: '{name}: "I\'m BIGGER now! I can run FASTER! WATCH ME!"',
        curious: '{name}: "Child stage! So much more I can reach and explore!"',
        shy: '{name} whispers: "I\'m growing up... I hope I\'m doing it right."',
        playful: '{name}: "I\'m a KID now! That means MORE games! Right?!"',
        grumpy: '{name}: "I grew up. Don\'t expect me to be MORE cheerful about it."'
    },
    fullyGrown: {
        lazy: '{name}: "Adult achievement unlocked. Time to professionally nap."',
        energetic: '{name}: "ADULT POWER! I feel UNSTOPPABLE!"',
        curious: '{name}: "Adulthood! A whole new chapter to study and understand!"',
        shy: '{name}: "I\'m... an adult now. That feels... big."',
        playful: '{name}: "Adult? ADULT?! I refuse to stop having fun though!"',
        grumpy: '{name}: "Adulthood means I can complain with authority now."'
    },
    cleanFreak: {
        lazy: '{name}: "I was clean this whole time? Without trying? Sweet."',
        energetic: '{name}: "SPARKLY CLEAN! I could GLOW IN THE DARK!"',
        curious: '{name}: "Maximum cleanliness! The molecular structure of clean!"',
        shy: '{name} admires their reflection quietly. Clean feels safe.',
        playful: '{name}: "I\'m so clean I SQUEAK! Listen! *squeak squeak*"',
        grumpy: '{name}: "Finally, proper hygiene standards. Was that so hard?"'
    },
    happyCamper: {
        lazy: '{name}: "Happiness is easy when you\'re horizontal."',
        energetic: '{name}: "MAXIMUM HAPPINESS! I might POP!"',
        curious: '{name}: "100% happiness! I should document what caused this!"',
        shy: '{name} smiles the biggest smile. Small but radiant.',
        playful: '{name} does a victory dance! "HAPPY HAPPY HAPPY!"',
        grumpy: '{name}: "I\'m... happy? This is suspicious. But nice."'
    },
    firstPlay: {
        lazy: '{name}: "Games are okay. As long as there\'s sitting involved."',
        energetic: '{name}: "GAME TIME! This is what I was BORN for!"',
        curious: '{name}: "Games teach hand-eye coordination! Scientifically proven!"',
        shy: '{name}: "That was fun... can we play again? Just us?"',
        playful: '{name} is VIBRATING. "MORE GAMES! ALL THE GAMES!"',
        grumpy: '{name}: "I didn\'t ENJOY it. I was just... participating. Strategically."'
    },
    streak3: {
        lazy: '{name}: "Three days in a row? That\'s basically a marathon for me."',
        energetic: '{name}: "THREE DAYS! We\'re on FIRE! Don\'t stop now!"',
        curious: '{name}: "Interesting pattern — consistency yields rewards!"',
        shy: '{name}: "You came back... three days. That means a lot."',
        playful: '{name}: "Streak! Streak! We\'re on a ROLL! Literally rolling!"',
        grumpy: '{name}: "Three days. Adequate dedication. ...Don\'t miss tomorrow."'
    },
    greenThumb: {
        lazy: '{name}: "Food that grows itself? My kind of agriculture."',
        energetic: '{name}: "WE GREW SOMETHING! FROM THE GROUND! AMAZING!"',
        curious: '{name}: "The miracle of photosynthesis, right before our eyes!"',
        shy: '{name} gently touches the harvested crop. "We made this..."',
        playful: '{name} pretends the crop is a trophy! "Award-winning gardener!"',
        grumpy: '{name}: "At least SOMETHING around here is productive."'
    },
    socialButterfly: {
        lazy: '{name}: "Two pets means someone else can do things while I nap."',
        energetic: '{name}: "A FRIEND! MORE energy in the house! YES!"',
        curious: '{name}: "A companion! Someone to share discoveries with!"',
        shy: '{name} peeks at the new friend nervously but hopefully.',
        playful: '{name}: "PLAYMATE! Everything is better with two!"',
        grumpy: '{name}: "Great. More noise. ...When are they coming over?"'
    },
    worldTraveler: {
        lazy: '{name}: "Visited everywhere. From the couch, mostly."',
        energetic: '{name}: "EVERY ROOM! I\'ve RUN through all of them!"',
        curious: '{name}: "Complete room survey! Each one has unique properties!"',
        shy: '{name}: "I explored... all the rooms. I\'m braver than I thought."',
        playful: '{name}: "Every room is a new playground! I love this house!"',
        grumpy: '{name}: "Inspected all rooms. Most are acceptable. Some even decent."'
    },
    firstBreed: {
        lazy: '{name}: "Matchmaking? Sure, as long as I can watch from here."',
        energetic: '{name}: "BABIES! There are going to be TINY ONES! AHHHH!"',
        curious: '{name}: "Genetics are FASCINATING! What traits will combine?!"',
        shy: '{name}: "A new little one? I\'ll be the gentlest big sibling."',
        playful: '{name}: "TINY PLAYMATE incoming! I can\'t WAIT!"',
        grumpy: '{name}: "More family members? ...Fine. But they better be quiet."'
    },
    elderWise: {
        lazy: '{name}: "Elder status means I\'m officially too old to move. Perfect."',
        energetic: '{name}: "Elder but NOT elderly! I\'ve still got MOVES!"',
        curious: '{name}: "The elder perspective reveals so much I didn\'t see before."',
        shy: '{name}: "All these years... and I finally feel at home."',
        playful: '{name}: "Old enough to know better, young enough to do it anyway!"',
        grumpy: '{name}: "Elder. Earned it. Now everyone has to listen to my opinions."'
    },
    nightExplorer: {
        lazy: '{name}: "Night time is just day time but sleepier. I approve."',
        energetic: '{name}: "NIGHTTIME! The energy doesn\'t STOP just because it\'s dark!"',
        curious: '{name}: "Nocturnal exploration reveals a whole different world!"',
        shy: '{name}: "The night is quiet. I like quiet. This is nice."',
        playful: '{name}: "Night games! Shadow play! Glow in the dark FUN!"',
        grumpy: '{name}: "At least it\'s quieter at night. Less commotion."'
    },
    fullBelly: {
        lazy: '{name}: "Maximum fullness. Cannot move. Will not move. Bliss."',
        energetic: '{name}: "FULL TANK! Maximum fuel! LET\'S GOOOOO!"',
        curious: '{name}: "100% satiation! The digestive process is remarkable!"',
        shy: '{name} pats their round tummy contentedly. "...so full."',
        playful: '{name}: "So full I might roll instead of walk! Wheee!"',
        grumpy: '{name}: "Acceptable meal quantity. Finally. Took long enough."'
    }
};

// Generic fallback reactions by personality (for badges not in the specific list)
const MILESTONE_GENERIC_REACTIONS = {
    lazy: [
        '{name} glances at the achievement and yawns. "Cool... *snore*"',
        '{name}: "Achievements are nice. Naps are nicer. But this is okay."',
        '{name} acknowledges the milestone without moving a single muscle.'
    ],
    energetic: [
        '{name} ZOOMS in a victory lap! "WE DID IT! YESSS!"',
        '{name} can\'t contain the excitement! Bouncing off EVERYTHING!',
        '{name}: "ACHIEVEMENT! More! I want MORE achievements!"'
    ],
    curious: [
        '{name} studies the new achievement carefully. "Interesting milestone!"',
        '{name}: "Another data point in our journey! Documenting this."',
        '{name} wonders what achievement comes NEXT. Always forward!'
    ],
    shy: [
        '{name} smiles quietly at the achievement. Pride, but private.',
        '{name}: "We did something... special. Together." *tiny happy sound*',
        '{name} holds the achievement close. It means more than words.'
    ],
    playful: [
        '{name} turns the achievement into a game! "How many can we get?!"',
        '{name} celebrates with a silly dance! Achievement PARTY!',
        '{name}: "SCORE! Do we get bonus points for style?!"'
    ],
    grumpy: [
        '{name}: "Achievement. Fine. I SUPPOSE that\'s worth acknowledging."',
        '{name} pretends not to care. Secretly adds it to their trophy shelf.',
        '{name}: "Don\'t make a fuss. It\'s just... an accomplishment. Whatever."'
    ]
};

/**
 * Get a personality-specific reaction to a milestone achievement.
 * Checks specific badge reactions first, then falls back to generic personality pool.
 */
function getMilestoneReaction(badgeId, personality, petName) {
    const name = petName || 'Your pet';
    const pers = personality || 'playful';
    // Check specific badge reactions
    if (MILESTONE_REACTIONS[badgeId] && MILESTONE_REACTIONS[badgeId][pers]) {
        return MILESTONE_REACTIONS[badgeId][pers].replace(/\{name\}/g, name);
    }
    // Generic fallback
    const generic = MILESTONE_GENERIC_REACTIONS[pers];
    if (generic && generic.length > 0) {
        return generic[Math.floor(Math.random() * generic.length)].replace(/\{name\}/g, name);
    }
    return null;
}

// ==================== COLLECTIBLE FLAVOR DESCRIPTIONS ====================
// 2-3 sentence descriptions for stickers. Whimsical, worldbuilding-rich, accessible.
// Describe textures, sounds, feelings, not just visuals.

const STICKER_FLAVOR_TEXT = {
    // Animal stickers
    happyPup: 'This sticker practically vibrates with tail-wagging energy. Press it and you can almost feel the soft thump-thump of an excited pup greeting you at the door. It smells faintly of warm fur and happiness.',
    sleepyKitty: 'A sticker so cozy it makes you want to curl up and nap. The printed fur looks impossibly soft, and if you run your finger across it, you swear you can hear a tiny, contented purr.',
    bouncyBunny: 'This sticker bounces with barely-contained joy. The bunny captured here mid-hop radiates a soft warmth, and the paper has a velvety texture like a rabbit\'s ear.',
    tinyTurtle: 'Smooth and cool to the touch, like a river stone. This tiny turtle sticker carries the patience of ages and the quiet wisdom of something that takes life one gentle step at a time.',
    goldenFish: 'Shimmering with an iridescent sheen that shifts from gold to orange as you tilt it. It feels like holding a piece of sunlit water — bright, warm, and perpetually in graceful motion.',
    sweetBird: 'Light as a feather — literally. This sticker seems to float on the page. Tilt your ear close and you might catch the echo of a dawn chorus, sweet and clear.',
    cuddlyPanda: 'Impossibly plush-looking, this sticker has a texture that\'s half velvet, half cloud. It radiates the gentle warmth of a panda hug — soft, round, and utterly comforting.',
    royalPenguin: 'This sticker stands with dignified poise. The penguin\'s tuxedo gleams with a cool sheen, and there\'s a faint crispness to it — like Antarctic air carried in ink.',
    fuzzyHamster: 'Round, warm, and irresistibly fuzzy. This sticker has a soft texture that invites you to touch it again and again. It carries the scent of cedar shavings and tiny happiness.',
    happyFrog: 'Smooth and slightly cool, like a lily pad after morning dew. This cheerful frog sticker makes a soft \"ribbit\" sound in your imagination every time you look at it.',
    spinyHedgehog: 'Surprisingly gentle despite its spiny appearance. Run a finger across it and feel the contrast of soft belly and textured spines. It smells like autumn leaves and earth.',
    magicUnicorn: 'This sticker shimmers with colors that shouldn\'t exist — swirling pastels that feel warm when you touch them. The air around it smells like wildflowers after rain, and dreams yet to be dreamed.',
    fierceDragon: 'The paper feels warm near this sticker, as if it radiates actual heat. The dragon\'s scales have a raised texture you can feel, and there\'s a faint sound — like a distant rumble — when you press your ear close.',
    // Nature stickers
    sproutSticker: 'Fresh, green, and full of potential. This sticker smells like turned earth and new rain. Touch it and you feel the tiny vibration of life beginning — the unstoppable force of growth.',
    sunflowerSticker: 'Bright and warm as the flower itself. This sticker follows the light wherever you place it, always turning to face the sun. It smells like summer fields and golden afternoons.',
    rainbowSticker: 'Seven bands of color that feel different under your finger — each one smooth but distinct. The sticker seems to glow faintly after rain, carrying the promise that storms always pass.',
    cherryBlossom: 'Delicate pink petals that seem to flutter even though they\'re printed flat. This sticker carries the sweet, ephemeral scent of spring and the gentle reminder that beautiful things are worth waiting for.',
    snowflakeSticker: 'Cool to the touch, each tiny crystal arm unique. This sticker has a soft sparkle that catches the light and a crisp freshness that makes you think of quiet winter mornings and the first footprints in snow.',
    // Fun stickers
    starSticker: 'This star radiates actual warmth and a gentle, pulsing glow. It feels like holding concentrated achievement in your hands. Close your eyes and you can hear the faint chime of success.',
    trophySticker: 'Heavy with the weight of accomplishment. The golden surface has a satisfying smoothness, and when the light hits it just right, you see your reflection looking proud.',
    partySticker: 'Pop! Confetti seems to burst from this sticker in every direction. It has a slight fizzy texture, and the joy it carries is contagious. It sounds like laughter captured in paper.',
    musicSticker: 'Press your ear close and you\'ll swear you hear a melody. This sticker vibrates faintly with rhythm, and its surface has the smooth, flowing feel of a song made tangible.',
    artSticker: 'Every color in existence seems to live in this tiny sticker. The surface has the bumpy texture of dried paint, and it smells like creativity — sharp, fresh, and full of possibility.',
    // Special stickers
    heartSticker: 'Warm. Always warm. This sticker pulses gently, like a heartbeat you can feel through the paper. It carries the comfortable weight of deep, lasting love — the kind that makes a house a home.',
    crownSticker: 'Regal and luminous, this crown sticker has a satisfying weight and a surface like polished gold. It hums with quiet authority and the unspoken promise that you\'ve earned your place.',
    sparkleSticker: 'Impossible to look at without smiling. This sticker catches light from angles that shouldn\'t work and throws it back as tiny rainbows. It tingles under your touch.',
    unicornSticker: 'Mythical and magnificent. This sticker shifts between colors like a soap bubble and feels silky-smooth. The air around it shimmers, and touching it fills you with wonder and gentle magic.',
    dragonSticker: 'Powerful and ancient. The texture of dragon scales is raised and detailed — you can feel each one. It radiates a deep warmth, and the faintest whiff of smoke and starfire lingers around it.',
    streakFlame: 'This flame never goes out. The sticker is warm to the touch, and the flickering pattern seems to dance when you move the page. It crackles with the energy of dedication and the heat of commitment.',
    breedingEgg: 'Smooth, warm, and full of potential. This egg sticker seems to vibrate faintly, as if something inside is getting ready to hatch. It smells like new beginnings and morning light.',
    dnaSticker: 'The double helix twists with hypnotic precision. Run your finger along it and feel the ridges of genetic code — the blueprint of uniqueness. It tingles with the electricity of creation.',
    mutantStar: 'This star burns brighter than any other. Its surface shifts between textures — smooth, rough, warm, cool — as if it can\'t decide what it wants to be. That\'s its superpower: it\'s everything at once.',
    familyTree: 'Deep roots and spreading branches. This sticker has the rough texture of bark and the green softness of leaves. It smells like earth and connection and the quiet strength of belonging.',
    elderSticker: 'This sticker has the gravitas of centuries. Its surface is smooth from time, like a river stone, and it carries the warmth of accumulated wisdom. It feels like a gentle hand on your shoulder.',
    memorialSticker: 'A rose that never wilts. This sticker is soft as real petals, and it carries a faint, sweet scent. It\'s a reminder that love doesn\'t end — it transforms into something permanent and beautiful.',
    wisdomSticker: 'Open this sticker-book and you can almost hear pages turning. The paper texture is rich and creamy, like an ancient manuscript. It smells like old libraries and the quiet joy of understanding.',
    legendRibbon: 'Silk-smooth and shimmering with achievement. This ribbon sticker flows across the page as if caught in a gentle breeze. It carries the satisfied hum of a journey completed with honor.',
    moonCrest: 'Cool, luminous, and serene. This crescent sticker glows with borrowed light — silver and blue and infinitely peaceful. Touch it during the quiet hours and feel the calm of a moonlit night.',
    sunCrest: 'Radiantly warm, this sticker is a tiny sun you can carry. Its golden surface is always bright, and it smells like dawn — fresh, hopeful, and full of the promise of a new day.',
    tideCrest: 'Fluid and ever-shifting. This ocean sticker has a wave-like texture that seems to move under your fingertip. It smells like salt air and sounds like the eternal rhythm of the sea.',
    bloomCrest: 'Soft petals unfurl in perpetual bloom. This sticker is velvety-smooth and carries the intoxicating sweetness of a garden in full flower. Spring, captured forever in delicate ink.'
};

/**
 * Get the flavor text for a collectible item (loot or sticker).
 * Checks loot flavorText property first, then STICKER_FLAVOR_TEXT lookup.
 */
function getCollectibleFlavorText(itemId, itemType) {
    if (itemType === 'loot' || itemType === 'exploration') {
        const loot = EXPLORATION_LOOT[itemId];
        return (loot && loot.flavorText) || null;
    }
    if (itemType === 'sticker') {
        return STICKER_FLAVOR_TEXT[itemId] || null;
    }
    // Try both
    const loot = EXPLORATION_LOOT[itemId];
    if (loot && loot.flavorText) return loot.flavorText;
    return STICKER_FLAVOR_TEXT[itemId] || null;
}

// ==================== PET DIARY / JOURNAL SYSTEM ====================
// Daily diary entries summarize the pet's day using template sentences.
// Each entry is assembled from modular sentence fragments based on
// what actually happened that day. Personality-specific closing
// observations add character.

const DIARY_OPENING_TEMPLATES = [
    'Dear Diary, today was {quality} day for {name}.',
    '{name} had a {quality} day today!',
    'Day {dayNum}: A {quality} day in the life of {name}.',
    'Another page in {name}\'s story — today was {quality}.',
    'Today\'s chapter: {name} had a {quality} time.',
    '{name}\'s daily report: overall, a {quality} day.',
    'If today had a rating, {name} would give it "{quality}."',
    '{name} looks back on a {quality} day.'
];

const DIARY_QUALITY_WORDS = {
    excellent: ['wonderful', 'fantastic', 'magnificent', 'splendid', 'glorious', 'truly special'],
    good: ['great', 'lovely', 'really nice', 'delightful', 'pleasant', 'cheerful'],
    average: ['decent', 'pretty okay', 'fine', 'normal', 'typical', 'solid'],
    poor: ['tough', 'challenging', 'rough', 'hard', 'difficult', 'not the best']
};

const DIARY_ACTIVITY_TEMPLATES = {
    feeding: [
        '{name} enjoyed {count} tasty meal{plural} today.',
        'Mealtime happened {count} time{plural} — every bite counted!',
        '{name} was fed {count} time{plural}. Tummy status: satisfied.',
        'The kitchen saw {count} visit{plural} from a hungry {name}.'
    ],
    care: [
        '{name} received {count} act{plural} of care and attention.',
        'With {count} care action{plural}, {name} felt well looked after.',
        '{name}\'s caretaker gave {count} loving attention{plural} today.',
        'Today brought {count} moment{plural} of dedicated care for {name}.'
    ],
    play: [
        '{name} played {count} mini-game{plural} — so much fun!',
        'Game time! {name} jumped into {count} mini-game{plural}.',
        '{count} mini-game{plural} kept {name} entertained today.',
        '{name} scored fun points across {count} mini-game session{plural}.'
    ],
    expedition: [
        '{name} went on {count} expedition{plural} to explore the world.',
        'Adventure called! {name} completed {count} expedition{plural}.',
        '{count} expedition{plural} brought new discoveries for {name}.',
        'The brave explorer {name} ventured out {count} time{plural}.'
    ],
    garden: [
        '{name} harvested {count} crop{plural} from the garden.',
        'Green thumbs! {count} harvest{plural} made the garden proud.',
        '{name}\'s garden yielded {count} beautiful crop{plural}.',
        'Gardening success: {count} crop{plural} harvested today.'
    ],
    park: [
        '{name} visited the park {count} time{plural} today.',
        'Fresh air! {name} made {count} trip{plural} to the park.',
        'The park welcomed {name} for {count} visit{plural}.',
        '{count} park visit{plural} gave {name} the outdoor time needed.'
    ],
    battle: [
        '{name} fought in {count} arena battle{plural}.',
        'The arena saw {name} compete {count} time{plural} — warrior spirit!',
        '{count} battle{plural} tested {name}\'s strength today.',
        '{name} stood brave through {count} arena challenge{plural}.'
    ]
};

const DIARY_MOOD_TEMPLATES = {
    high: [
        '{name} ended the day beaming with happiness.',
        'Smiles all around — {name} is in a wonderful mood.',
        '{name} feels loved and content tonight.',
        'What a mood! {name} is practically glowing.'
    ],
    medium: [
        '{name} seems comfortable and settled tonight.',
        'A calm, contented {name} is winding down.',
        '{name} is doing alright — not bad at all.',
        'Things are steady for {name} this evening.'
    ],
    low: [
        '{name} could use some extra love tomorrow.',
        'A quiet night for {name} — hopefully tomorrow is brighter.',
        '{name} looks a little worn out tonight.',
        '{name} needs a bit more attention. Tomorrow is a new chance!'
    ]
};

const DIARY_SEASON_SNIPPETS = {
    spring: [
        'Spring blossoms made the world colorful today.',
        'The fresh spring air was full of new beginnings.',
        'Birdsong and blooming flowers set the spring mood.'
    ],
    summer: [
        'The warm summer sun made everything feel golden.',
        'Long, lazy summer hours stretched out beautifully.',
        'Summer heat called for shade and cold drinks.'
    ],
    autumn: [
        'Falling leaves painted the world in warm autumn tones.',
        'The crisp autumn air made everything feel cozy.',
        'Autumn\'s golden light made the day feel magical.'
    ],
    winter: [
        'A hushed, frosty winter day wrapped the world in white.',
        'Winter\'s chill made cozy indoor moments extra special.',
        'The cold winter air made warm blankets essential.'
    ]
};

const DIARY_PERSONALITY_CLOSINGS = {
    lazy: [
        '{name} yawns and mumbles: "Best part was definitely the naps."',
        '"Can we do less tomorrow?" {name} asks, already dozing off.',
        '{name} rates today: three pillows out of five.',
        '"I conserved a LOT of energy today. Very productive." — {name}',
        '{name} is already asleep before the diary entry is finished.',
        '"Moving is overrated. Resting is an art form." — {name}',
        '{name} stretches once, flops down, and that\'s the review done.',
        '"Tomorrow I plan to do even less. If that\'s possible." — {name}',
        '{name} mumbles something about blanket quality and drifts off.',
        '"I\'d give today a review, but that sounds like effort." — {name}',
        '{name} curls up tighter: "Wake me when something truly amazing happens."',
        '"My goal tomorrow? Find an even comfier spot." — {name}'
    ],
    energetic: [
        '{name} bounces: "Was that enough? I feel like we could do MORE!"',
        '"Today was awesome! Tomorrow will be AWESOMER!" — {name}',
        '{name} is still vibrating with energy. Sleep is a suggestion.',
        '"I ran, jumped, played, and I\'m STILL not tired!" — {name}',
        '{name} does a tiny victory dance before bed. What a day!',
        '"Let\'s wake up extra early tomorrow! Adventures await!" — {name}',
        '{name} recaps the day at triple speed, barely pausing for breath.',
        '"Every day is the best day when you give it everything!" — {name}',
        '{name} already has seventeen plans for tomorrow morning.',
        '"I don\'t walk anywhere. I ZOOM." — {name}',
        '{name} tries to do one more lap before lights out.',
        '"Sleep is just charging up for more fun!" — {name}'
    ],
    curious: [
        '{name} wonders: "Why does the moon follow you when you walk?"',
        '"I learned three new things today. Or was it four?" — {name}',
        '{name} is still asking questions as the lights go out.',
        '"Do you think clouds have feelings?" {name} ponders thoughtfully.',
        '{name} mentally catalogs today\'s discoveries before sleeping.',
        '"I have a hypothesis about why puddles are shaped that way." — {name}',
        '{name} stares at a shadow for a long time, thinking deep thoughts.',
        '"The best days are the ones where you notice something new." — {name}',
        '{name} wonders if dust particles ever get lonely.',
        '"I read somewhere that stars are just far-away suns. Wild." — {name}',
        '{name} whispers a question to the ceiling and waits for an answer.',
        '"Tomorrow I\'m going to figure out what that sound was." — {name}'
    ],
    shy: [
        '{name} whispers: "Today was nice. Don\'t tell anyone I said that."',
        '"I didn\'t mind today... it was... okay." {name} blushes slightly.',
        '{name} hides under a blanket but peeks out with a tiny smile.',
        '"Maybe tomorrow we could do quiet things? Just us?" — {name}',
        '{name} writes a secret thank-you note and hides it under the pillow.',
        '"I liked the part where it was peaceful." {name} says softly.',
        '{name} clutches a favorite toy and whispers goodnight to it.',
        '"The best moments are the ones nobody else notices." — {name}',
        '{name} offers a tiny wave goodnight from under the covers.',
        '"I have feelings about today but they\'re private." — {name}',
        '{name} left a small doodle on the diary page. It\'s a heart.',
        '"Thank you for... being around." {name} whispers almost inaudibly.'
    ],
    playful: [
        '{name} giggles: "Today gets a smiley face sticker! 😄"',
        '"If today were a game, I\'d give it a high score!" — {name}',
        '{name} turned the diary page into a paper airplane. Oops.',
        '"Who writes in diaries? This is a FUN-ary!" — {name}',
        '{name} drew silly faces in the margins of the diary.',
        '"Plot twist: tomorrow is going to be even sillier!" — {name}',
        '{name} rates today: eleven out of ten rubber duckies.',
        '"I made at least three people smile today. Maybe four!" — {name}',
        '{name} attempts to juggle before bed. It doesn\'t go great.',
        '"Every day is an adventure if you make weird sound effects!" — {name}',
        '{name} hides a joke under the pillow for tomorrow morning.',
        '"What do you call a sleeping pet? A nap-kin! Goodnight!" — {name}'
    ],
    grumpy: [
        '{name} grumbles: "It was fine. I GUESS."',
        '"Could have been worse. Could have been better. Mostly worse." — {name}',
        '{name} gives today a firm 6 out of 10. Generous, honestly.',
        '"The food was acceptable. The company was... tolerable." — {name}',
        '{name} harrumphs and turns away. That means it was a good day.',
        '"I didn\'t complain THAT much today. That\'s growth." — {name}',
        '{name} crosses their arms: "I had fun and I\'m NOT happy about it."',
        '"Tomorrow better not be as annoyingly pleasant as today." — {name}',
        '{name} scowls at the diary, then secretly adds a tiny smiley.',
        '"Fine. ONE good thing happened. I refuse to say which." — {name}',
        '{name} pulls the blanket over their head: "This conversation is over."',
        '"If today were a sandwich, it would need more mustard." — {name}'
    ]
};

/**
 * Generate a diary entry for the pet's day.
 * @param {Object} pet - The pet object
 * @param {Object} dailyProgress - The daily checklist progress object
 * @param {string} season - Current season
 * @param {number} dayNum - Days since pet was born (approximate)
 * @returns {Object} { date, opening, activities, mood, seasonal, closing, fullText }
 */
function generateDiaryEntry(pet, dailyProgress, season, dayNum) {
    if (!pet) return null;
    const name = pet.name || 'Your pet';
    const personality = pet.personality || 'playful';
    const progress = dailyProgress || {};

    // Determine day quality from average stats
    const avgStat = ((pet.hunger || 0) + (pet.cleanliness || 0) + (pet.happiness || 0) + (pet.energy || 0)) / 4;
    let quality;
    if (avgStat >= 75) quality = 'excellent';
    else if (avgStat >= 50) quality = 'good';
    else if (avgStat >= 30) quality = 'average';
    else quality = 'poor';

    const qualityWord = randomFromArray(DIARY_QUALITY_WORDS[quality] || DIARY_QUALITY_WORDS.average);

    // Opening line
    const openingTemplate = randomFromArray(DIARY_OPENING_TEMPLATES);
    const opening = openingTemplate
        .replace(/\{name\}/g, name)
        .replace(/\{quality\}/g, qualityWord)
        .replace(/\{dayNum\}/g, String(dayNum || 1));

    // Activity sentences (only for activities that actually happened)
    const activities = [];
    const activityMap = [
        { key: 'feedCount', type: 'feeding' },
        { key: 'totalCareActions', type: 'care' },
        { key: 'minigameCount', type: 'play' },
        { key: 'expeditionCount', type: 'expedition' },
        { key: 'harvestCount', type: 'garden' },
        { key: 'parkVisits', type: 'park' },
        { key: 'battleCount', type: 'battle' }
    ];

    for (const { key, type } of activityMap) {
        const count = progress[key] || 0;
        if (count > 0 && DIARY_ACTIVITY_TEMPLATES[type]) {
            const template = randomFromArray(DIARY_ACTIVITY_TEMPLATES[type]);
            const plural = count === 1 ? '' : 's';
            activities.push(
                template.replace(/\{name\}/g, name).replace(/\{count\}/g, String(count)).replace(/\{plural\}/g, plural)
            );
        }
    }

    // Mood sentence
    let moodLevel;
    if (avgStat >= 65) moodLevel = 'high';
    else if (avgStat >= 35) moodLevel = 'medium';
    else moodLevel = 'low';
    const moodSentence = randomFromArray(DIARY_MOOD_TEMPLATES[moodLevel] || DIARY_MOOD_TEMPLATES.medium)
        .replace(/\{name\}/g, name);

    // Seasonal snippet
    const seasonSnippet = (DIARY_SEASON_SNIPPETS[season])
        ? randomFromArray(DIARY_SEASON_SNIPPETS[season])
        : '';

    // Personality closing
    const closings = DIARY_PERSONALITY_CLOSINGS[personality] || DIARY_PERSONALITY_CLOSINGS.playful;
    const closing = randomFromArray(closings).replace(/\{name\}/g, name);

    // Assemble full text
    const parts = [opening];
    if (seasonSnippet) parts.push(seasonSnippet);
    if (activities.length > 0) parts.push(...activities);
    parts.push(moodSentence);
    parts.push(closing);

    return {
        date: new Date().toISOString(),
        petName: name,
        personality: personality,
        quality: quality,
        opening: opening,
        activities: activities,
        mood: moodSentence,
        seasonal: seasonSnippet,
        closing: closing,
        fullText: parts.join(' ')
    };
}
