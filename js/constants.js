// Changelog (Retention pass): Added streak protection constants (freeze tokens, checkpoints, soft decay), journey scaffolding hooks, novelty schedule hooks, and reminder trigger config.
// ==================== GROWTH STAGES ====================

const GROWTH_STAGES = {
    baby: {
        label: 'Baby',
        emoji: '🍼',
        scale: 0.6,
        actionsNeeded: 0,
        hoursNeeded: 0,
        sizeLabel: 'Tiny'
    },
    child: {
        label: 'Child',
        emoji: '🌱',
        scale: 0.8,
        actionsNeeded: 15,
        hoursNeeded: 2, // 2 hours for testing/faster gameplay
        sizeLabel: 'Small'
    },
    adult: {
        label: 'Adult',
        emoji: '⭐',
        scale: 1.0,
        actionsNeeded: 40,
        hoursNeeded: 6, // 6 hours total for more balanced gameplay
        sizeLabel: 'Full'
    },
    elder: {
        label: 'Elder',
        emoji: '🏛️',
        scale: 0.95,
        actionsNeeded: 90,
        hoursNeeded: 18, // 18 hours total
        sizeLabel: 'Wise'
    }
};

const GROWTH_ORDER = ['baby', 'child', 'adult', 'elder'];

// Stage-based balance tuning for decay pressure, neglect impact, focused care reward,
// daily target scaling, and growth progression weighting.
const STAGE_BALANCE = {
    baby: {
        needDecayMultiplier: 0.95,
        neglectThreshold: 18,
        neglectGainMultiplier: 1.0,
        neglectRecoveryMultiplier: 1.0,
        focusedCareBonus: 0.12,
        dailyTaskMultiplier: 1.0,
        growthCareWeight: 0.95
    },
    child: {
        needDecayMultiplier: 1.1,
        neglectThreshold: 22,
        neglectGainMultiplier: 1.18,
        neglectRecoveryMultiplier: 0.94,
        focusedCareBonus: 0.2,
        dailyTaskMultiplier: 1.1,
        growthCareWeight: 1.0
    },
    adult: {
        needDecayMultiplier: 1.24,
        neglectThreshold: 26,
        neglectGainMultiplier: 1.38,
        neglectRecoveryMultiplier: 0.84,
        focusedCareBonus: 0.3,
        dailyTaskMultiplier: 1.22,
        growthCareWeight: 1.1
    },
    elder: {
        needDecayMultiplier: 1.32,
        neglectThreshold: 30,
        neglectGainMultiplier: 1.48,
        neglectRecoveryMultiplier: 0.78,
        focusedCareBonus: 0.38,
        dailyTaskMultiplier: 1.35,
        growthCareWeight: 1.18
    }
};

function getStageBalance(stage) {
    return STAGE_BALANCE[stage] || STAGE_BALANCE.baby;
}

// ==================== GAMEPLAY TUNING PROFILES ====================
// Report #10: Runtime-selectable balance profile with player-safe default.
const BALANCE_DEBUG = false;
const BALANCE_PROFILE_STORAGE_KEY = (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.balanceProfile) ? STORAGE_KEYS.balanceProfile : 'myLittleFriend_balanceProfile';
const ACTIVE_GAMEPLAY_TUNING_PROFILE = 'NORMAL';

function balanceDebugLog(topic, payload) {
    // Report #10: Lightweight debug gate for EV/payout instrumentation.
    if (!BALANCE_DEBUG || typeof console === 'undefined' || typeof console.log !== 'function') return;
    console.log(`[BALANCE_DEBUG] ${topic}`, payload);
}

const GAMEPLAY_TUNING_PROFILES = {
    NORMAL: {
        careLoop: {
            repeatWindowMs: 14000,
            repeatBasePenalty: 0.14,
            repeatStepPenalty: 0.09,
            repeatMaxStack: 4,
            repeatMinMultiplier: 0.52,
            focusStageWeight: 0.9,
            extraFocusedBonus: 0.12,
            offTargetMultiplier: 0.88,
            minTotalMultiplier: 0.5,
            maxTotalMultiplier: 1.6,
            hintCooldownMs: 18000
        },
        rooms: {
            actionSpreadScale: 1.38,
            careUpgradeScale: 1.55,
            systemUpgradeStep: 0.035
        },
        decay: {
            stageVariance: {
                baby: { extraEveryTicks: 0, extraNeedDecay: 0 },
                child: { extraEveryTicks: 6, extraNeedDecay: 1 },
                adult: { extraEveryTicks: 5, extraNeedDecay: 1 },
                elder: { extraEveryTicks: 4, extraNeedDecay: 1 }
            },
            neglectPressure: {
                baby: { graceTicks: 6, pulseEveryTicks: 5, lowestNeedPenalty: 1, happinessPenalty: 0, multiNeedPenalty: 0 },
                child: { graceTicks: 5, pulseEveryTicks: 4, lowestNeedPenalty: 1, happinessPenalty: 1, multiNeedPenalty: 0 },
                adult: { graceTicks: 4, pulseEveryTicks: 3, lowestNeedPenalty: 2, happinessPenalty: 1, multiNeedPenalty: 1 },
                elder: { graceTicks: 3, pulseEveryTicks: 3, lowestNeedPenalty: 2, happinessPenalty: 2, multiNeedPenalty: 1 }
            },
            neglectCount: {
                baby: { gainScale: 1.0, recoveryScale: 1.0 },
                child: { gainScale: 1.08, recoveryScale: 0.93 },
                adult: { gainScale: 1.16, recoveryScale: 0.88 },
                elder: { gainScale: 1.24, recoveryScale: 0.82 }
            }
        },
        minigames: {
            replayDifficultyBoostPerPlay: 0.02,
            replayDifficultyBoostMaxPlays: 6,
            difficultyCap: 2.2,
            difficultyBands: [
                { id: 'steady', maxDifficulty: 1.15, rewardScoreMultiplier: 1.0 },
                { id: 'challenging', maxDifficulty: 1.45, rewardScoreMultiplier: 1.12 },
                { id: 'hard', maxDifficulty: 1.8, rewardScoreMultiplier: 1.27 },
                { id: 'expert', maxDifficulty: 99, rewardScoreMultiplier: 1.45 }
            ]
        },
        asyncLoops: {
            expeditionStage: {
                baby: { durationMultiplier: 0.9, lootMultiplier: 0.94, energyCostMultiplier: 0.92, happinessMultiplier: 1.0 },
                child: { durationMultiplier: 1.0, lootMultiplier: 1.0, energyCostMultiplier: 1.0, happinessMultiplier: 1.0 },
                adult: { durationMultiplier: 1.08, lootMultiplier: 1.05, energyCostMultiplier: 1.08, happinessMultiplier: 0.98 },
                elder: { durationMultiplier: 1.14, lootMultiplier: 1.08, energyCostMultiplier: 1.12, happinessMultiplier: 0.96 }
            },
            expeditionProgressionSlowdown: [
                { completedAtLeast: 6, durationMultiplier: 1.05 },
                { completedAtLeast: 14, durationMultiplier: 1.1 }
            ]
        },
        rewards: {
            dailyModifierByStage: { baby: 'careRush', child: 'careRush', adult: 'luckyPaws', elder: 'focusedTraining' },
            weeklyModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'focusedTraining', elder: 'focusedTraining' },
            achievementModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'luckyPaws', elder: 'focusedTraining' },
            prestigeWeightsByStage: {
                baby: { careRush: 4, luckyPaws: 2, focusedTraining: 1 },
                child: { careRush: 3, luckyPaws: 3, focusedTraining: 2 },
                adult: { careRush: 2, luckyPaws: 3, focusedTraining: 4 },
                elder: { careRush: 1, luckyPaws: 2, focusedTraining: 5 }
            },
            mastery: {
                careByStage: { baby: 0.02, child: 0.03, adult: 0.02, elder: 0.015 },
                expeditionRollBonusByStage: { baby: 0, child: 0, adult: 1, elder: 1 },
                competitionByStage: { baby: 0.0, child: 0.02, adult: 0.04, elder: 0.06 }
            }
        }
    },
    QUICK_ITERATION_BUILD: {
        careLoop: {
            repeatWindowMs: 12000,
            repeatBasePenalty: 0.12,
            repeatStepPenalty: 0.08,
            repeatMaxStack: 4,
            repeatMinMultiplier: 0.56,
            focusStageWeight: 0.75,
            extraFocusedBonus: 0.08,
            offTargetMultiplier: 0.9,
            minTotalMultiplier: 0.55,
            maxTotalMultiplier: 1.65,
            hintCooldownMs: 20000
        },
        rooms: {
            actionSpreadScale: 1.28,
            careUpgradeScale: 1.45,
            systemUpgradeStep: 0.03
        },
        decay: {
            stageVariance: {
                baby: { extraEveryTicks: 0, extraNeedDecay: 0 },
                child: { extraEveryTicks: 6, extraNeedDecay: 1 },
                adult: { extraEveryTicks: 5, extraNeedDecay: 1 },
                elder: { extraEveryTicks: 4, extraNeedDecay: 1 }
            },
            neglectPressure: {
                baby: { graceTicks: 6, pulseEveryTicks: 5, lowestNeedPenalty: 1, happinessPenalty: 0, multiNeedPenalty: 0 },
                child: { graceTicks: 5, pulseEveryTicks: 4, lowestNeedPenalty: 1, happinessPenalty: 1, multiNeedPenalty: 0 },
                adult: { graceTicks: 4, pulseEveryTicks: 3, lowestNeedPenalty: 2, happinessPenalty: 1, multiNeedPenalty: 1 },
                elder: { graceTicks: 3, pulseEveryTicks: 3, lowestNeedPenalty: 2, happinessPenalty: 2, multiNeedPenalty: 1 }
            },
            neglectCount: {
                baby: { gainScale: 1.0, recoveryScale: 1.0 },
                child: { gainScale: 1.05, recoveryScale: 0.95 },
                adult: { gainScale: 1.12, recoveryScale: 0.9 },
                elder: { gainScale: 1.2, recoveryScale: 0.85 }
            }
        },
        minigames: {
            replayDifficultyBoostPerPlay: 0.02,
            replayDifficultyBoostMaxPlays: 6,
            difficultyCap: 2.1,
            difficultyBands: [
                { id: 'steady', maxDifficulty: 1.15, rewardScoreMultiplier: 1.0 },
                { id: 'challenging', maxDifficulty: 1.45, rewardScoreMultiplier: 1.12 },
                { id: 'hard', maxDifficulty: 1.8, rewardScoreMultiplier: 1.3 },
                { id: 'expert', maxDifficulty: 99, rewardScoreMultiplier: 1.48 }
            ]
        },
        asyncLoops: {
            expeditionStage: {
                baby: { durationMultiplier: 0.86, lootMultiplier: 0.92, energyCostMultiplier: 0.92, happinessMultiplier: 1.0 },
                child: { durationMultiplier: 0.96, lootMultiplier: 1.0, energyCostMultiplier: 1.0, happinessMultiplier: 1.0 },
                adult: { durationMultiplier: 1.08, lootMultiplier: 1.08, energyCostMultiplier: 1.08, happinessMultiplier: 0.98 },
                elder: { durationMultiplier: 1.14, lootMultiplier: 1.12, energyCostMultiplier: 1.12, happinessMultiplier: 0.96 }
            },
            expeditionProgressionSlowdown: [
                { completedAtLeast: 6, durationMultiplier: 1.06 },
                { completedAtLeast: 14, durationMultiplier: 1.12 }
            ]
        },
        rewards: {
            dailyModifierByStage: { baby: 'careRush', child: 'careRush', adult: 'luckyPaws', elder: 'focusedTraining' },
            weeklyModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'focusedTraining', elder: 'focusedTraining' },
            achievementModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'luckyPaws', elder: 'focusedTraining' },
            prestigeWeightsByStage: {
                baby: { careRush: 5, luckyPaws: 2, focusedTraining: 1 },
                child: { careRush: 3, luckyPaws: 3, focusedTraining: 2 },
                adult: { careRush: 2, luckyPaws: 3, focusedTraining: 4 },
                elder: { careRush: 1, luckyPaws: 2, focusedTraining: 5 }
            },
            mastery: {
                careByStage: { baby: 0.02, child: 0.03, adult: 0.02, elder: 0.015 },
                expeditionRollBonusByStage: { baby: 0, child: 0, adult: 1, elder: 1 },
                competitionByStage: { baby: 0.0, child: 0.02, adult: 0.04, elder: 0.06 }
            }
        }
    },
    AGGRESSIVE_ESCALATION_BUILD: {
        careLoop: {
            repeatWindowMs: 16000,
            repeatBasePenalty: 0.18,
            repeatStepPenalty: 0.12,
            repeatMaxStack: 5,
            repeatMinMultiplier: 0.42,
            focusStageWeight: 1.0,
            extraFocusedBonus: 0.12,
            offTargetMultiplier: 0.82,
            minTotalMultiplier: 0.45,
            maxTotalMultiplier: 1.8,
            hintCooldownMs: 17000
        },
        rooms: {
            actionSpreadScale: 1.55,
            careUpgradeScale: 1.8,
            systemUpgradeStep: 0.045
        },
        decay: {
            stageVariance: {
                baby: { extraEveryTicks: 0, extraNeedDecay: 0 },
                child: { extraEveryTicks: 5, extraNeedDecay: 1 },
                adult: { extraEveryTicks: 4, extraNeedDecay: 2 },
                elder: { extraEveryTicks: 3, extraNeedDecay: 2 }
            },
            neglectPressure: {
                baby: { graceTicks: 5, pulseEveryTicks: 4, lowestNeedPenalty: 1, happinessPenalty: 1, multiNeedPenalty: 0 },
                child: { graceTicks: 4, pulseEveryTicks: 3, lowestNeedPenalty: 2, happinessPenalty: 1, multiNeedPenalty: 1 },
                adult: { graceTicks: 3, pulseEveryTicks: 2, lowestNeedPenalty: 2, happinessPenalty: 2, multiNeedPenalty: 1 },
                elder: { graceTicks: 2, pulseEveryTicks: 2, lowestNeedPenalty: 3, happinessPenalty: 2, multiNeedPenalty: 1 }
            },
            neglectCount: {
                baby: { gainScale: 1.05, recoveryScale: 0.95 },
                child: { gainScale: 1.15, recoveryScale: 0.86 },
                adult: { gainScale: 1.3, recoveryScale: 0.78 },
                elder: { gainScale: 1.42, recoveryScale: 0.72 }
            }
        },
        minigames: {
            replayDifficultyBoostPerPlay: 0.028,
            replayDifficultyBoostMaxPlays: 8,
            difficultyCap: 2.35,
            difficultyBands: [
                { id: 'steady', maxDifficulty: 1.15, rewardScoreMultiplier: 1.0 },
                { id: 'challenging', maxDifficulty: 1.5, rewardScoreMultiplier: 1.14 },
                { id: 'hard', maxDifficulty: 1.9, rewardScoreMultiplier: 1.32 },
                { id: 'expert', maxDifficulty: 99, rewardScoreMultiplier: 1.52 }
            ]
        },
        asyncLoops: {
            expeditionStage: {
                baby: { durationMultiplier: 0.82, lootMultiplier: 0.9, energyCostMultiplier: 0.95, happinessMultiplier: 1.0 },
                child: { durationMultiplier: 0.94, lootMultiplier: 1.0, energyCostMultiplier: 1.05, happinessMultiplier: 0.98 },
                adult: { durationMultiplier: 1.12, lootMultiplier: 1.12, energyCostMultiplier: 1.16, happinessMultiplier: 0.95 },
                elder: { durationMultiplier: 1.22, lootMultiplier: 1.18, energyCostMultiplier: 1.22, happinessMultiplier: 0.92 }
            },
            expeditionProgressionSlowdown: [
                { completedAtLeast: 5, durationMultiplier: 1.08 },
                { completedAtLeast: 12, durationMultiplier: 1.18 },
                { completedAtLeast: 24, durationMultiplier: 1.26 }
            ]
        },
        rewards: {
            dailyModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'focusedTraining', elder: 'focusedTraining' },
            weeklyModifierByStage: { baby: 'luckyPaws', child: 'luckyPaws', adult: 'focusedTraining', elder: 'focusedTraining' },
            achievementModifierByStage: { baby: 'careRush', child: 'luckyPaws', adult: 'focusedTraining', elder: 'focusedTraining' },
            prestigeWeightsByStage: {
                baby: { careRush: 4, luckyPaws: 3, focusedTraining: 1 },
                child: { careRush: 2, luckyPaws: 4, focusedTraining: 2 },
                adult: { careRush: 1, luckyPaws: 3, focusedTraining: 5 },
                elder: { careRush: 1, luckyPaws: 2, focusedTraining: 6 }
            },
            mastery: {
                careByStage: { baby: 0.025, child: 0.03, adult: 0.018, elder: 0.012 },
                expeditionRollBonusByStage: { baby: 0, child: 1, adult: 1, elder: 2 },
                competitionByStage: { baby: 0.01, child: 0.03, adult: 0.06, elder: 0.08 }
            }
        }
    }
};

function getGameplayTuning() {
    let selected = ACTIVE_GAMEPLAY_TUNING_PROFILE;
    try {
        const stored = localStorage.getItem(BALANCE_PROFILE_STORAGE_KEY);
        if (stored && GAMEPLAY_TUNING_PROFILES[stored]) selected = stored;
    } catch (e) {
        // localStorage unavailable (privacy mode, test harness, etc.)
    }
    return GAMEPLAY_TUNING_PROFILES[selected] || GAMEPLAY_TUNING_PROFILES.NORMAL || GAMEPLAY_TUNING_PROFILES.QUICK_ITERATION_BUILD;
}

function getBalanceProfileId() {
    let selected = ACTIVE_GAMEPLAY_TUNING_PROFILE;
    try {
        const stored = localStorage.getItem(BALANCE_PROFILE_STORAGE_KEY);
        if (stored && GAMEPLAY_TUNING_PROFILES[stored]) selected = stored;
    } catch (e) {
        // ignore storage read errors
    }
    return selected;
}

function setBalanceProfileId(profileId) {
    const safe = GAMEPLAY_TUNING_PROFILES[profileId] ? profileId : ACTIVE_GAMEPLAY_TUNING_PROFILE;
    try {
        localStorage.setItem(BALANCE_PROFILE_STORAGE_KEY, safe);
    } catch (e) {
        // ignore storage write errors
    }
    return safe;
}

function getBalanceProfileConfig() {
    const profileId = getBalanceProfileId();
    if (profileId === 'QUICK_ITERATION_BUILD') {
        return {
            profileId,
            label: 'Quick Iteration',
            liveDecayMultiplier: 0.55,
            offlineDecayMultiplier: 0.28,
            offlineNeglectMultiplier: 0.35,
            decayTickMs: 45000
        };
    }
    return {
        profileId,
        label: 'Normal',
        liveDecayMultiplier: 1,
        offlineDecayMultiplier: 1,
        offlineNeglectMultiplier: 1,
        decayTickMs: 30000
    };
}

function getCareLoopTuning() {
    return getGameplayTuning().careLoop || GAMEPLAY_TUNING_PROFILES.NORMAL.careLoop;
}

function getRoomTuning() {
    return getGameplayTuning().rooms || GAMEPLAY_TUNING_PROFILES.NORMAL.rooms;
}

function getDecayTuning() {
    return getGameplayTuning().decay || GAMEPLAY_TUNING_PROFILES.NORMAL.decay;
}

function getMinigameEscalationTuning() {
    return getGameplayTuning().minigames || GAMEPLAY_TUNING_PROFILES.NORMAL.minigames;
}

function getAsyncLoopTuning() {
    return getGameplayTuning().asyncLoops || GAMEPLAY_TUNING_PROFILES.NORMAL.asyncLoops;
}

function getPhaseRewardTuning() {
    return getGameplayTuning().rewards || GAMEPLAY_TUNING_PROFILES.NORMAL.rewards;
}

// Care quality levels and their thresholds
const CARE_QUALITY = {
    poor: {
        label: 'Poor',
        emoji: '😢',
        minAverage: 0,
        maxNeglect: 999, // No limit on neglect
        variant: 'dull',
        description: 'Needs more attention'
    },
    average: {
        label: 'Average',
        emoji: '😊',
        minAverage: 35,
        maxNeglect: 10,
        variant: 'normal',
        description: 'Doing okay'
    },
    good: {
        label: 'Good',
        emoji: '😄',
        minAverage: 60,
        maxNeglect: 5,
        variant: 'normal',
        description: 'Well cared for'
    },
    excellent: {
        label: 'Excellent',
        emoji: '🌟',
        minAverage: 80,
        maxNeglect: 2,
        variant: 'shiny',
        description: 'Exceptionally loved',
        canEvolve: true
    }
};

// Evolution forms for each pet type (unlocked with excellent care at adult stage)
const PET_EVOLUTIONS = {
    dog: { name: 'Royal Hound', emoji: '👑🐕', colorShift: 20, sparkle: true },
    cat: { name: 'Mystic Cat', emoji: '✨🐱', colorShift: 15, sparkle: true },
    bunny: { name: 'Spring Guardian', emoji: '🌸🐰', colorShift: 10, sparkle: true },
    bird: { name: 'Phoenix Chick', emoji: '🔥🐦', colorShift: 25, sparkle: true },
    hamster: { name: 'Golden Hamster', emoji: '⭐🐹', colorShift: 30, sparkle: true },
    turtle: { name: 'Ancient Turtle', emoji: '🌊🐢', colorShift: 15, sparkle: true },
    fish: { name: 'Celestial Fish', emoji: '🌟🐟', colorShift: 20, sparkle: true },
    frog: { name: 'Jade Frog', emoji: '💎🐸', colorShift: 25, sparkle: true },
    hedgehog: { name: 'Crystal Hedgehog', emoji: '🔮🦔', colorShift: 20, sparkle: true },
    panda: { name: 'Zen Master', emoji: '☯️🐼', colorShift: 10, sparkle: true },
    penguin: { name: 'Emperor Penguin', emoji: '👑🐧', colorShift: 15, sparkle: true },
    unicorn: { name: 'Alicorn', emoji: '🦄✨', colorShift: 30, sparkle: true },
    dragon: { name: 'Ancient Dragon', emoji: '🐉👑', colorShift: 35, sparkle: true },
    pegasus: { name: 'Sky Sovereign', emoji: '🌤️🪽', colorShift: 24, sparkle: true },
    kirin: { name: 'Celestial Kirin', emoji: '🔥🦌', colorShift: 28, sparkle: true },
    catbird: { name: 'Aero Gryphkitten', emoji: '🪶🐱', colorShift: 18, sparkle: true },
    turtlefrog: { name: 'Ancient Shellhopper', emoji: '🏛️🐸', colorShift: 18, sparkle: true },
    bundgehog: { name: 'Moon Fuzzspike', emoji: '🌙🦔', colorShift: 17, sparkle: true },
    pandapenguin: { name: 'Aurora Snowpanda', emoji: '🌌🐼', colorShift: 20, sparkle: true },
    dogfish: { name: 'Tidal Splashpup', emoji: '🌊🐕', colorShift: 19, sparkle: true },
    hamsterbird: { name: 'Starlight Fluffwing', emoji: '✨🐹', colorShift: 17, sparkle: true },
    dragonturtle: { name: 'Elder Dracoturtle', emoji: '🛡️🐉', colorShift: 30, sparkle: true }
};

// Birthday milestone rewards based on growth stage
const BIRTHDAY_REWARDS = {
    child: {
        title: '🎉 First Birthday! 🎉',
        message: 'Your pet has grown into a child!',
        accessories: ['bow', 'ribbonBow'],
        unlockMessage: 'Unlocked cute accessories!'
    },
    adult: {
        title: '🎊 Coming of Age! 🎊',
        message: 'Your pet is now fully grown!',
        accessories: ['crown', 'partyHat'],
        unlockMessage: 'Unlocked special accessories!'
    },
    elder: {
        title: '🏛️ Wisdom of Ages! 🏛️',
        message: 'Your pet has become a wise elder! Stat gains are boosted by wisdom.',
        accessories: ['glasses', 'topHat'],
        unlockMessage: 'Unlocked elder accessories!'
    }
};

// Personality-aware and care-quality-aware birthday messages
const BIRTHDAY_PERSONALITY_MESSAGES = {
    child: {
        lazy: {
            excellent: '{name} stretches awake, a little bigger now. All those cozy naps together built real trust.',
            good: '{name} yawns and blinks sleepily. Growing up is exhausting, but worth it.',
            average: '{name} rolls over lazily — wait, they\'re bigger! Growth happens, even between naps.',
            poor: '{name} has grown, though they seem a bit listless. Maybe more attention would help.'
        },
        energetic: {
            excellent: '{name} ZOOMS around the room — they\'re bigger AND faster! Your energy together is electric!',
            good: '{name} bounces excitedly — look how much they\'ve grown! All that play paid off.',
            average: '{name} can\'t sit still long enough to notice they\'ve grown. Classic.',
            poor: '{name} has grown, but their bounce seems a bit dimmer than usual.'
        },
        curious: {
            excellent: '{name} examines their own paws in wonder — they\'re bigger! Every discovery you shared led here.',
            good: '{name} tilts their head, noticing something\'s different. They\'ve grown! New things to explore!',
            average: '{name} discovers they can reach higher shelves now. Growth is its own adventure.',
            poor: '{name} has grown, but their curiosity seems a bit subdued lately.'
        },
        shy: {
            excellent: '{name} peeks out from behind you, a little bigger now. Those quiet moments of trust have paid off.',
            good: '{name} shyly shows off their new size. You can tell they feel safe with you.',
            average: '{name} notices they\'re bigger and hides behind you. Change is scary, but they\'ll be okay.',
            poor: '{name} has grown, but they seem to hide more than usual. They need more gentle care.'
        },
        playful: {
            excellent: '{name} does a victory dance — they\'re BIGGER! All those games together built something special.',
            good: '{name} spins around showing off their new size. Look at them go!',
            average: '{name} accidentally knocks something over. Oops — they didn\'t realize they\'d grown!',
            poor: '{name} has grown, but their playful spark seems a bit faded.'
        },
        grumpy: {
            excellent: '{name} grumbles at the fuss, but you catch a tiny smile. Growing up is hard — but you\'ve been there.',
            good: '{name} huffs at the attention, but secretly stands a little taller. They appreciate you.',
            average: '{name} glares at the birthday decorations. "I didn\'t ask for this." ...But they kept the hat.',
            poor: '{name} has grown, but their grumbles sound more tired than usual.'
        }
    },
    adult: {
        lazy: {
            excellent: '{name} lounges with the confidence of a fully grown pet. Your patient care made this cozy soul.',
            good: '{name} is all grown up and already looking for the perfect nap spot.',
            average: '{name} is fully grown now. They celebrate by immediately falling asleep.',
            poor: '{name} has reached adulthood, though they seem rather lethargic.'
        },
        energetic: {
            excellent: '{name} is FULLY GROWN and absolutely unstoppable! The bond you\'ve built is incredible!',
            good: '{name} has grown into a powerhouse of energy! Ready for anything!',
            average: '{name} is all grown up and has even MORE energy somehow.',
            poor: '{name} is fully grown, but their energy feels unfocused.'
        },
        curious: {
            excellent: '{name} gazes at the world with wise, curious eyes. Your adventures together shaped a true explorer.',
            good: '{name} is all grown up and the world is their laboratory!',
            average: '{name} is fully grown and already investigating something new.',
            poor: '{name} has reached adulthood, but their spark of curiosity has dimmed.'
        },
        shy: {
            excellent: '{name} gently nuzzles your hand. They\'re all grown up, and you\'re their safe place.',
            good: '{name} has grown up beautifully. They still stay close, but with quiet confidence now.',
            average: '{name} is fully grown but still hides during parties. Some things never change.',
            poor: '{name} has reached adulthood, but they seem withdrawn. They need more reassurance.'
        },
        playful: {
            excellent: '{name} throws confetti everywhere! Fully grown and fully FUN! You built this together.',
            good: '{name} is all grown up and the party is just getting started!',
            average: '{name} celebrates being fully grown by pranking everyone. Naturally.',
            poor: '{name} is fully grown, but their tricks lack their usual sparkle.'
        },
        grumpy: {
            excellent: '{name} crosses their arms but their eyes are misty. "I\'m not emotional. YOU\'RE emotional." ...They love you.',
            good: '{name} is fully grown and fully opinionated. Wouldn\'t have it any other way.',
            average: '{name} is all grown up. They\'d like everyone to stop making a big deal about it.',
            poor: '{name} has reached adulthood, but their grumbles sound more weary than feisty.'
        }
    },
    elder: {
        lazy: {
            excellent: '{name} has earned every nap in their long, well-loved life. A true master of relaxation.',
            good: '{name} has reached elder status. Their napping technique is now legendary.',
            average: '{name} is an elder now. They were probably asleep when it happened.',
            poor: '{name} has reached elder age, but they seem more tired than peaceful.'
        },
        energetic: {
            excellent: '{name} may be an elder, but they still have more energy than anyone! A lifetime of love shows.',
            good: '{name} is an elder who still won\'t sit still. Age is just a number!',
            average: '{name} has reached elder status and is somehow STILL bouncing around.',
            poor: '{name} is an elder now. Their energy isn\'t what it used to be.'
        },
        curious: {
            excellent: '{name} has seen it all and still asks "What\'s that?" Your shared journey of discovery was beautiful.',
            good: '{name} is a wise elder with an endless sense of wonder.',
            average: '{name} has reached elder status. They\'re already investigating what that means.',
            poor: '{name} is an elder now, but their curiosity seems diminished.'
        },
        shy: {
            excellent: '{name} quietly leans against you. No words needed. A lifetime of trust speaks for itself.',
            good: '{name} is a gentle elder who still finds comfort in your presence.',
            average: '{name} has reached elder status. They mark the occasion with a quiet nod.',
            poor: '{name} is an elder now, but they seem more isolated than peaceful.'
        },
        playful: {
            excellent: '{name} is the eldest and the silliest! A lifetime of joy, built game by game.',
            good: '{name} is an elder who still knows how to have fun!',
            average: '{name} has reached elder status. They celebrate with one last prank.',
            poor: '{name} is an elder now, but their playful spirit has faded.'
        },
        grumpy: {
            excellent: '"I\'m old, not soft." But {name}\'s eyes tell a different story. You\'ve been their person all along.',
            good: '{name} is a grumpy elder who secretly loves being fussed over.',
            average: '{name} has reached elder status. "Big deal." (It is, and they know it.)',
            poor: '{name} is an elder now. Their grumbles carry a weight of loneliness.'
        }
    }
};

function getBirthdayPersonalityMessage(pet, stage) {
    const name = pet.name || 'Your pet';
    const personality = pet.personality || 'playful';
    const quality = pet.careQuality || 'average';
    const stageMessages = BIRTHDAY_PERSONALITY_MESSAGES[stage];
    if (!stageMessages) return null;
    const personalityMessages = stageMessages[personality];
    if (!personalityMessages) return null;
    const message = personalityMessages[quality] || personalityMessages['average'];
    return message ? message.replace(/\{name\}/g, name) : null;
}

function getBirthdayRetrospective(pet) {
    const actions = pet.careActions || 0;
    const ageHours = typeof getPetAge === 'function' ? getPetAge(pet) : 0;
    const playHours = Math.round(ageHours * 10) / 10;
    const name = pet.name || 'Your pet';
    return `You've cared for ${name} ${actions} times over ${playHours > 1 ? playHours.toFixed(1) + ' hours' : Math.round(playHours * 60) + ' minutes'} together.`;
}

function getGrowthStage(careActions, ageInHours, stageOrCareQuality) {
    // Growth still requires BOTH time and actions, but high-quality care shifts
    // progression toward active play quality over passive waiting.
    const stageHint = GROWTH_STAGES[stageOrCareQuality] ? stageOrCareQuality : 'baby';
    const stageBalance = getStageBalance(stageHint);
    const hasCareQuality = !!(stageOrCareQuality && CARE_QUALITY[stageOrCareQuality] && typeof CARE_QUALITY[stageOrCareQuality].minAverage === 'number');
    const qualityBoost = hasCareQuality
        ? (0.92 + (CARE_QUALITY[stageOrCareQuality].minAverage / 100) * 0.24)
        : 1.0;
    const growthWeight = hasCareQuality ? stageBalance.growthCareWeight : 1.0;
    const weightedActions = careActions * qualityBoost * growthWeight;
    const weightedHours = ageInHours * (0.96 + (qualityBoost - 1.0) * 0.45);

    const elderThresholds = getGrowthThresholdsForStage('elder');
    const adultThresholds = getGrowthThresholdsForStage('adult');
    const childThresholds = getGrowthThresholdsForStage('child');
    const hasElderTime = weightedHours >= elderThresholds.hoursNeeded;
    const hasElderActions = weightedActions >= elderThresholds.actionsNeeded;
    const hasAdultTime = weightedHours >= adultThresholds.hoursNeeded;
    const hasAdultActions = weightedActions >= adultThresholds.actionsNeeded;
    const hasChildTime = weightedHours >= childThresholds.hoursNeeded;
    const hasChildActions = weightedActions >= childThresholds.actionsNeeded;

    if (hasElderTime && hasElderActions) return 'elder';
    if (hasAdultTime && hasAdultActions) return 'adult';
    if (hasChildTime && hasChildActions) return 'child';
    return 'baby';
}

function getNextGrowthStage(currentStage) {
    const idx = GROWTH_ORDER.indexOf(currentStage);
    if (idx === -1) return null;
    if (idx < GROWTH_ORDER.length - 1) return GROWTH_ORDER[idx + 1];
    return null;
}

function getGrowthProgress(careActions, ageInHours, currentStage, careQuality) {
    const nextStage = getNextGrowthStage(currentStage);
    if (!nextStage) return 100;

    const stageBalance = getStageBalance(currentStage);
    const hasCareQuality = !!(careQuality && CARE_QUALITY[careQuality] && typeof CARE_QUALITY[careQuality].minAverage === 'number');
    const qualityBoost = hasCareQuality
        ? (0.92 + (CARE_QUALITY[careQuality].minAverage / 100) * 0.24)
        : 1.0;
    const growthWeight = hasCareQuality ? stageBalance.growthCareWeight : 1.0;
    const weightedActions = careActions * qualityBoost * growthWeight;
    const weightedHours = ageInHours * (0.96 + (qualityBoost - 1.0) * 0.45);

    const currentThresholds = getGrowthThresholdsForStage(currentStage);
    const nextThresholds = getGrowthThresholdsForStage(nextStage);
    const currentActionsThreshold = currentThresholds.actionsNeeded;
    const nextActionsThreshold = nextThresholds.actionsNeeded;
    const currentHoursThreshold = currentThresholds.hoursNeeded;
    const nextHoursThreshold = nextThresholds.hoursNeeded;

    // Progress is the minimum of time-based and action-based progress
    const actionDiff = nextActionsThreshold - currentActionsThreshold;
    const timeDiff = nextHoursThreshold - currentHoursThreshold;
    const actionProgress = actionDiff > 0 ? ((weightedActions - currentActionsThreshold) / actionDiff) * 100 : 100;
    const timeProgress = timeDiff > 0 ? ((weightedHours - currentHoursThreshold) / timeDiff) * 100 : 100;

    return Math.min(100, Math.max(0, Math.min(actionProgress, timeProgress)));
}

// Explicit best-to-worst ordering for getCareQuality iteration
const CARE_QUALITY_ORDER = ['excellent', 'good', 'average', 'poor'];

function getCareQuality(averageStats, neglectCount) {
    // Check from best to worst - only check minAverage (no maxAverage ceiling)
    // so that high-stat pets with too much neglect fall to the next tier gracefully
    for (const level of CARE_QUALITY_ORDER) {
        const data = CARE_QUALITY[level];
        if (averageStats >= data.minAverage &&
            neglectCount <= data.maxNeglect) {
            return level;
        }
    }
    return CARE_QUALITY_ORDER[CARE_QUALITY_ORDER.length - 1] || 'poor';
}

// ==================== EGG TYPES ====================

const EGG_TYPES = {
    furry: {
        name: 'Furry Egg',
        description: 'A soft, fuzzy egg',
        colors: { base: '#D4A574', accent: '#8B7355', shine: '#FFE4C4' },
        pattern: 'spots',
        petTypes: ['dog', 'cat', 'bunny', 'hamster', 'hedgehog', 'panda']
    },
    feathery: {
        name: 'Feathery Egg',
        description: 'A light egg with feather patterns',
        colors: { base: '#87CEEB', accent: '#FFD700', shine: '#E0F6FF' },
        pattern: 'stripes',
        petTypes: ['bird', 'penguin']
    },
    scaly: {
        name: 'Scaly Egg',
        description: 'An egg with scales and shimmer',
        colors: { base: '#32CD32', accent: '#228B22', shine: '#98FB98' },
        pattern: 'scales',
        petTypes: ['turtle', 'fish', 'frog']
    },
    magical: {
        name: 'Magical Egg',
        description: 'A glowing, mystical egg',
        colors: { base: '#DDA0DD', accent: '#FFB6C1', shine: '#F0E68C' },
        pattern: 'sparkles',
        petTypes: ['unicorn', 'dragon']
    }
};

// ==================== PET PATTERNS ====================

const PET_PATTERNS = {
    solid: { name: 'Solid', description: 'Solid color' },
    spotted: { name: 'Spotted', description: 'Cute spots' },
    striped: { name: 'Striped', description: 'Bold stripes' },
    patchy: { name: 'Patchy', description: 'Color patches' }
};

// ==================== PET ACCESSORIES ====================

const ACCESSORIES = {
    // Hats
    partyHat: { name: 'Party Hat', emoji: '🎉', type: 'hat', position: 'top' },
    crown: { name: 'Crown', emoji: '👑', type: 'hat', position: 'top' },
    topHat: { name: 'Top Hat', emoji: '🎩', type: 'hat', position: 'top' },
    // Bows
    bow: { name: 'Bow', emoji: '🎀', type: 'bow', position: 'head' },
    ribbonBow: { name: 'Ribbon Bow', emoji: '🎗️', type: 'bow', position: 'head' },
    // Collars
    collar: { name: 'Collar', emoji: '⭕', type: 'collar', position: 'neck' },
    bandana: { name: 'Bandana', emoji: '🔺', type: 'collar', position: 'neck' },
    // Glasses
    glasses: { name: 'Glasses', emoji: '👓', type: 'glasses', position: 'eyes' },
    sunglasses: { name: 'Sunglasses', emoji: '🕶️', type: 'glasses', position: 'eyes' },
    // Costumes
    superhero: { name: 'Superhero Cape', emoji: '🦸', type: 'costume', position: 'body' },
    wizard: { name: 'Wizard Hat', emoji: '🧙', type: 'costume', position: 'top' }
};

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

// ==================== PET TYPES ====================

const PET_TYPES = {
    dog: {
        name: 'Puppy',
        emoji: '🐕',
        colors: ['#D4A574', '#8B7355', '#F5DEB3', '#A0522D', '#FFE4C4'],
        sounds: ['Woof!', 'Bark!', 'Arf!'],
        happySounds: ['Happy bark!', 'Tail wagging!', 'Playful woof!'],
        sadSounds: ['Whimper...', 'Sad whine...'],
        mythical: false
    },
    cat: {
        name: 'Kitty',
        emoji: '🐱',
        colors: ['#FFA500', '#808080', '#FFFFFF', '#000000', '#DEB887'],
        sounds: ['Meow!', 'Purr!', 'Mew!'],
        happySounds: ['Loud purring!', 'Happy meow!', 'Content purr!'],
        sadSounds: ['Sad meow...', 'Quiet mew...'],
        mythical: false
    },
    bunny: {
        name: 'Bunny',
        emoji: '🐰',
        colors: ['#FFFFFF', '#D4A574', '#808080', '#F5DEB3', '#FFB6C1'],
        sounds: ['Hop hop!', 'Sniff sniff!', 'Thump!'],
        happySounds: ['Binky jump!', 'Happy hop!', 'Excited thump!'],
        sadSounds: ['Quiet sniff...', 'Slow hop...'],
        mythical: false
    },
    bird: {
        name: 'Birdie',
        emoji: '🐦',
        colors: ['#FFD700', '#87CEEB', '#98FB98', '#FF6347', '#DDA0DD'],
        sounds: ['Tweet!', 'Chirp!', 'Whistle!'],
        happySounds: ['Happy song!', 'Joyful chirp!', 'Cheerful tweet!'],
        sadSounds: ['Quiet chirp...', 'Soft tweet...'],
        mythical: false
    },
    hamster: {
        name: 'Hammy',
        emoji: '🐹',
        colors: ['#D4A574', '#F5DEB3', '#FFFFFF', '#DEB887', '#FFE4C4'],
        sounds: ['Squeak!', 'Nibble nibble!', 'Scurry!'],
        happySounds: ['Happy squeak!', 'Wheel spinning!', 'Excited nibble!'],
        sadSounds: ['Soft squeak...', 'Quiet nibble...'],
        mythical: false
    },
    turtle: {
        name: 'Shelly',
        emoji: '🐢',
        colors: ['#228B22', '#556B2F', '#6B8E23', '#8FBC8F', '#2E8B57'],
        sounds: ['*slow blink*', '*head bob*', '*shell tap*'],
        happySounds: ['Happy waddle!', 'Excited stretch!', 'Shell shimmy!'],
        sadSounds: ['Hiding in shell...', 'Slow retreat...'],
        mythical: false
    },
    fish: {
        name: 'Bubbles',
        emoji: '🐟',
        colors: ['#FF6347', '#4169E1', '#FFD700', '#FF69B4', '#00CED1'],
        sounds: ['Blub!', 'Splash!', 'Bubble!'],
        happySounds: ['Happy splashing!', 'Joyful bubbles!', 'Excited swim!'],
        sadSounds: ['Slow swim...', 'Quiet blub...'],
        mythical: false
    },
    frog: {
        name: 'Hoppy',
        emoji: '🐸',
        colors: ['#32CD32', '#228B22', '#9ACD32', '#6B8E23', '#00FA9A'],
        sounds: ['Ribbit!', 'Croak!', 'Hop!'],
        happySounds: ['Happy croak!', 'Joyful ribbit!', 'Bouncy hop!'],
        sadSounds: ['Quiet ribbit...', 'Slow croak...'],
        mythical: false
    },
    hedgehog: {
        name: 'Spike',
        emoji: '🦔',
        colors: ['#8B7355', '#D2B48C', '#A0522D', '#DEB887', '#C4A882'],
        sounds: ['Snuffle!', '*nose twitch*', 'Squeak!'],
        happySounds: ['Happy snuffle!', 'Excited wiggle!', 'Joyful squeak!'],
        sadSounds: ['Curling up...', 'Quiet snuffle...'],
        mythical: false
    },
    panda: {
        name: 'Bamboo',
        emoji: '🐼',
        colors: ['#FFFFFF', '#F5F5F5', '#FFFAF0', '#FFF8DC', '#FAEBD7'],
        sounds: ['*munch munch*', '*happy roll*', 'Squeak!'],
        happySounds: ['Rolling around!', 'Happy munching!', 'Playful tumble!'],
        sadSounds: ['Sad eyes...', 'Slow munch...'],
        mythical: false
    },
    penguin: {
        name: 'Waddles',
        emoji: '🐧',
        colors: ['#2F4F4F', '#36454F', '#1C1C1C', '#4A4A4A', '#333333'],
        sounds: ['Honk!', 'Squawk!', '*waddle waddle*'],
        happySounds: ['Happy slide!', 'Joyful honk!', 'Belly slide!'],
        sadSounds: ['Sad honk...', 'Slow waddle...'],
        mythical: false
    },
    unicorn: {
        name: 'Sparkle',
        emoji: '🦄',
        colors: ['#FFB6C1', '#DDA0DD', '#E6E6FA', '#F0E68C', '#B0E0E6'],
        sounds: ['*magical neigh*', '*sparkle*', '*whinny*'],
        happySounds: ['Rainbow sparkles!', 'Magical gallop!', 'Joyful neigh!'],
        sadSounds: ['Dim sparkles...', 'Quiet whinny...'],
        mythical: true,
        unlockRequirement: 2,
        unlockMessage: 'Raise 2 pets to adult to unlock!'
    },
    dragon: {
        name: 'Ember',
        emoji: '🐉',
        colors: ['#DC143C', '#8B0000', '#FF4500', '#B22222', '#FF6347'],
        sounds: ['*tiny roar*', '*puff of smoke*', 'Rawr!'],
        happySounds: ['Fire breath!', 'Happy roar!', 'Wing flutter!'],
        sadSounds: ['Sad smoke puff...', 'Quiet growl...'],
        mythical: true,
        unlockRequirement: 3,
        unlockMessage: 'Raise 3 pets to adult to unlock!'
    }
};

const TREAT_TYPES = [
    { name: 'Cookie', emoji: '🍪' },
    { name: 'Cupcake', emoji: '🧁' },
    { name: 'Ice Cream', emoji: '🍦' },
    { name: 'Candy', emoji: '🍬' },
    { name: 'Donut', emoji: '🍩' },
    { name: 'Honey', emoji: '🍯' }
];

const FEEDBACK_MESSAGES = {
    feed: ['Yummy!', 'Delicious!', 'So tasty!', 'Nom nom!', 'Thank you!'],
    wash: ['So clean!', 'Sparkly!', 'Fresh!', 'Squeaky clean!', 'Shiny!'],
    play: ['So fun!', 'Wheee!', 'Again!', 'Yay!', 'Love it!'],
    sleep: ['So cozy!', 'Sweet dreams!', 'Zzz...', 'Night night!', 'Sleepy time!'],
    medicine: ['All better!', 'Feeling great!', 'So much better!', 'Healthy!', 'Happy again!'],
    groom: ['So fluffy!', 'Looking good!', 'Nice and tidy!', 'Beautiful!', 'Well groomed!'],
    exercise: ['Great run!', 'I fetched it!', 'So much fun!', 'Let\'s go again!', 'What a workout!'],
    treat: ['Yummy treat!', 'So special!', 'Best snack ever!', 'More please!', 'What a delight!'],
    cuddle: ['So cozy!', 'Loves cuddles!', 'Purr purr!', 'Snuggle time!', 'More pets please!']
};

const MOOD_MESSAGES = {
    happy: ['is super happy!', 'is feeling great!', 'is full of joy!', 'loves you!'],
    neutral: ['is doing okay.', 'is content.', 'is relaxed.'],
    sad: ['needs some love.', 'misses you.', 'wants attention.'],
    sleepy: ['is getting sleepy...', 'is yawning!', 'can barely keep eyes open...', 'is ready for bed!'],
    energetic: ['is full of energy!', 'is bright-eyed and bushy-tailed!', 'is raring to go!', 'had a great sleep!']
};

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
        unlockRule: { type: 'default' },
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
        unlockRule: { type: 'default' },
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
const ROOM_SYSTEM_ACTIVITY_MULTIPLIERS = {
    bedroom: { minigame: 0.94, exploration: 0.9, competition: 0.96, care: 1.0 },
    kitchen: { minigame: 0.96, exploration: 0.92, competition: 0.95, care: 1.06 },
    bathroom: { minigame: 0.95, exploration: 0.9, competition: 0.97, care: 1.05 },
    backyard: { minigame: 1.02, exploration: 1.03, competition: 0.98, care: 1.02 },
    park: { minigame: 1.12, exploration: 1.02, competition: 0.96, care: 1.04 },
    garden: { minigame: 0.94, exploration: 1.16, competition: 0.92, care: 1.05 },
    library: { minigame: 1.03, exploration: 1.04, competition: 0.97, care: 1.08 },
    arcade: { minigame: 1.2, exploration: 0.92, competition: 1.04, care: 1.03 },
    spa: { minigame: 0.96, exploration: 0.95, competition: 1.02, care: 1.1 },
    observatory: { minigame: 1.04, exploration: 1.18, competition: 1.05, care: 1.06 },
    workshop: { minigame: 1.05, exploration: 1.0, competition: 1.18, care: 1.06 }
};

function getRoomStageLabel(stage) {
    return GROWTH_STAGES[stage] ? stage : 'baby';
}

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
    const roomTuning = getRoomTuning();
    const roomProfile = ROOM_SYSTEM_ACTIVITY_MULTIPLIERS[roomId] || {};
    const baseScale = Math.max(0.6, Number(roomTuning.actionSpreadScale) || 1);
    const careScale = Math.max(0.8, Number(roomProfile.care) || 1);
    const baseDelta = Math.max(0, Number(room.bonus.multiplier || 1) - 1);
    const tunedBase = 1 + (baseDelta * baseScale * careScale);
    const rawStep = ROOM_UPGRADE_BONUS_STEPS[Math.max(0, Math.min(upgradeLevel, ROOM_UPGRADE_BONUS_STEPS.length - 1))] || 0;
    const step = rawStep * Math.max(1, Number(roomTuning.careUpgradeScale) || 1);
    return Math.max(1, tunedBase + step);
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

function getRoomSystemMultiplier(systemKey, roomId) {
    const key = systemKey || 'minigame';
    const resolvedRoom = ROOMS[roomId] ? roomId : (((typeof gameState !== 'undefined' && gameState && ROOMS[gameState.currentRoom]) ? gameState.currentRoom : 'bedroom'));
    const profile = ROOM_SYSTEM_ACTIVITY_MULTIPLIERS[resolvedRoom] || {};
    const base = Math.max(0.75, Number(profile[key]) || 1);
    const roomTuning = getRoomTuning();
    const upgradeLevel = getRoomUpgradeLevel(resolvedRoom);
    const step = Math.max(0, Number(roomTuning.systemUpgradeStep) || 0) * Math.max(0, upgradeLevel);
    let mult = Math.max(0.75, Math.min(1.45, base + step));
    // Report #8: Luxury room prestige scales all room-system multipliers.
    if (typeof gameState !== 'undefined' && gameState && gameState._prestigeOwned && gameState._prestigeOwned.luxuryRoomUpgrade > 0 && PRESTIGE_EFFECTS.luxuryRoomUpgrade) {
        mult *= Math.max(1, Number(PRESTIGE_EFFECTS.luxuryRoomUpgrade.roomSystemMultiplier) || 1);
    }
    if (typeof getPackedRoomCosmeticSystemBonusMultiplier === 'function') {
        mult *= Math.max(0.9, Number(getPackedRoomCosmeticSystemBonusMultiplier(key, resolvedRoom)) || 1);
    }
    return Math.max(0.75, Math.min(1.75, mult));
}

function getRoomSystemBonusPercent(systemKey, roomId) {
    return Math.round((getRoomSystemMultiplier(systemKey, roomId) - 1) * 100);
}

function getRoomStrategicLabel(roomId) {
    const mini = getRoomSystemBonusPercent('minigame', roomId);
    const explore = getRoomSystemBonusPercent('exploration', roomId);
    const compete = getRoomSystemBonusPercent('competition', roomId);
    return `Mini ${mini >= 0 ? '+' : ''}${mini}%, Explore ${explore >= 0 ? '+' : ''}${explore}%, Compete ${compete >= 0 ? '+' : ''}${compete}%`;
}

const ROOM_IDS = Object.keys(ROOMS);

// ==================== EXPLORATION & WORLD ====================

const EXPLORATION_BIOMES = {
    forest: {
        id: 'forest',
        name: 'Forest',
        icon: '🌲',
        description: 'A lush woodland filled with friendly critters and hidden relics.',
        unlockHint: 'Unlocked by default.',
        unlockRule: { type: 'default' },
        npcTypes: ['bunny', 'hedgehog', 'frog']
    },
    beach: {
        id: 'beach',
        name: 'Beach',
        icon: '🏖️',
        description: 'Sunny shores with drift treasures and curious sea friends.',
        unlockHint: 'Unlock by completing 1 expedition.',
        unlockRule: { type: 'expeditionsCompleted', count: 1 },
        npcTypes: ['dog', 'cat', 'penguin']
    },
    mountain: {
        id: 'mountain',
        name: 'Mountain',
        icon: '⛰️',
        description: 'Windy peaks and cliff paths with rare crystals.',
        unlockHint: 'Unlock by completing 3 expeditions.',
        unlockRule: { type: 'expeditionsCompleted', count: 3 },
        npcTypes: ['bird', 'cat', 'dragon']
    },
    cave: {
        id: 'cave',
        name: 'Cave',
        icon: '🕳️',
        description: 'Echoing caverns with glowing stones and dungeon entrances.',
        unlockHint: 'Unlock by clearing 1 dungeon crawl.',
        unlockRule: { type: 'dungeonsCleared', count: 1 },
        npcTypes: ['frog', 'turtle', 'dragon']
    },
    skyIsland: {
        id: 'skyIsland',
        name: 'Sky Island',
        icon: '🏝️☁️',
        description: 'Floating islands above the clouds packed with starlight loot.',
        unlockHint: 'Unlocked by owning a bird-type pet.',
        unlockRule: { type: 'birdPet' },
        npcTypes: ['bird', 'penguin', 'unicorn']
    },
    underwater: {
        id: 'underwater',
        name: 'Underwater Zone',
        icon: '🌊',
        description: 'An underwater world full of coral caches and bubble ruins.',
        unlockHint: 'Unlocked by owning a fish-type pet.',
        unlockRule: { type: 'fishPet' },
        npcTypes: ['fish', 'frog', 'turtle']
    },
    skyZone: {
        id: 'skyZone',
        name: 'Sky Zone',
        icon: '🪽',
        description: 'High-altitude air currents with wind temples and feather shrines.',
        unlockHint: 'Unlocked by owning a bird-type pet.',
        unlockRule: { type: 'birdPet' },
        npcTypes: ['bird', 'penguin', 'dragon']
    }
};

const EXPLORATION_LOOT = {
    forestCharm: { id: 'forestCharm', name: 'Forest Charm', emoji: '🍃', rarity: 'common', flavorText: 'A leaf pressed between two smooth stones, warm to the touch even in winter. The forest remembers every creature who walks beneath its canopy, and this charm carries that memory.' },
    mossStone: { id: 'mossStone', name: 'Moss Stone', emoji: '🪨', rarity: 'common', flavorText: 'Velvety green moss clings to a perfectly round stone. It feels like holding a tiny piece of the forest floor. If you listen closely, you can almost hear the creak of ancient trees.' },
    berryBundle: { id: 'berryBundle', name: 'Berry Bundle', emoji: '🫐', rarity: 'common', flavorText: 'A cluster of sweet, jewel-bright berries wrapped in a broad leaf. They smell like sunshine and taste like a lazy summer afternoon in the woods.' },
    sunShell: { id: 'sunShell', name: 'Sun Shell', emoji: '🐚', rarity: 'common', flavorText: 'A spiral shell bleached golden by countless days in the sun. Hold it to your ear and you\'ll hear the ocean humming a lullaby it learned from the tide.' },
    seaGlass: { id: 'seaGlass', name: 'Sea Glass', emoji: '🔹', rarity: 'uncommon', flavorText: 'Once a sharp shard, now smoothed by decades of tumbling waves into something beautiful. Cool and silky to the touch, it catches the light like a frozen piece of the ocean.' },
    tidePearl: { id: 'tidePearl', name: 'Tide Pearl', emoji: '🫧', rarity: 'rare', flavorText: 'Born in the deepest part of the reef, this pearl pulses with a soft inner glow. Legend says each one contains a wish made by the sea itself, waiting to be heard.' },
    summitCrystal: { id: 'summitCrystal', name: 'Summit Crystal', emoji: '💎', rarity: 'rare', flavorText: 'Formed under immense pressure at the mountain\'s heart, this crystal sings when the wind hits it at just the right angle. It\'s cold to the touch but fills you with warmth.' },
    eagleFeather: { id: 'eagleFeather', name: 'Eagle Feather', emoji: '🪶', rarity: 'uncommon', flavorText: 'Light as a whisper, strong as a promise. This feather drifted down from the highest peak where eagles dance with the clouds. It smells like high altitude and freedom.' },
    emberOre: { id: 'emberOre', name: 'Ember Ore', emoji: '🔥', rarity: 'uncommon', flavorText: 'A chunk of rust-red ore that stays perpetually warm, as if it remembers the volcanic forge where it was born. Hold it close on cold nights — it never quite goes out.' },
    caveLantern: { id: 'caveLantern', name: 'Cave Lantern', emoji: '🏮', rarity: 'uncommon', flavorText: 'A small lantern left by cave explorers long ago, still flickering with a mysterious amber light. It hums softly in dark places, as if it\'s happy to be useful again.' },
    glowMushroom: { id: 'glowMushroom', name: 'Glow Mushroom', emoji: '🍄', rarity: 'common', flavorText: 'A soft, spongy mushroom that emits a gentle blue-green glow. It smells like damp earth and ancient things. In the dark, it turns any room into a fairy grotto.' },
    runeFragment: { id: 'runeFragment', name: 'Rune Fragment', emoji: '🧩', rarity: 'rare', flavorText: 'A piece of something much larger — carved with symbols no one can read anymore. It tingles when touched, as if the knowledge it carries is trying to jump into your mind.' },
    cloudRibbon: { id: 'cloudRibbon', name: 'Cloud Ribbon', emoji: '🎐', rarity: 'uncommon', flavorText: 'A wisp of cloud caught and woven into a silky ribbon. It\'s impossibly soft, slightly damp, and smells like rain that hasn\'t fallen yet. It drifts gently even in still air.' },
    stardust: { id: 'stardust', name: 'Stardust', emoji: '✨', rarity: 'rare', flavorText: 'Tiny particles that shimmer with their own light, collected from where the sky meets the highest peaks. It feels like holding pure possibility in your paws — warm, tingly, and full of wonder.' },
    bubbleGem: { id: 'bubbleGem', name: 'Bubble Gem', emoji: '🔮', rarity: 'rare', flavorText: 'A perfectly spherical gem that seems to contain a tiny ocean. Tilt it and you see waves; shake it gently and you hear the distant crash of surf. The sea, captured in crystal.' },
    coralCrown: { id: 'coralCrown', name: 'Coral Crown', emoji: '🪸', rarity: 'uncommon', flavorText: 'A delicate circlet of branching coral in sunset hues. It\'s lighter than it looks and feels slightly textured, like running your paw over tiny ridges of underwater architecture.' },
    windCompass: { id: 'windCompass', name: 'Wind Compass', emoji: '🧭', rarity: 'uncommon', flavorText: 'Instead of pointing north, this compass needle follows the wind. It spins lazily on calm days and whirls excitedly before storms. A navigator\'s curiosity made real.' },
    skyLantern: { id: 'skyLantern', name: 'Sky Lantern', emoji: '🏮', rarity: 'rare', flavorText: 'A paper lantern that glows with captured starlight. It floats slightly upward when released, as if it remembers being part of the sky. Its light is warm and whisper-quiet.' },
    ancientCoin: { id: 'ancientCoin', name: 'Ancient Coin', emoji: '🪙', rarity: 'uncommon', flavorText: 'Worn smooth by countless paws, this coin bears the face of a pet king from a forgotten era. It\'s heavy for its size and always feels warm, as if it carries the memory of every hand that held it.' },
    mysteryMap: { id: 'mysteryMap', name: 'Mystery Map', emoji: '🗺️', rarity: 'rare', flavorText: 'The ink on this map seems to shift when you\'re not looking directly at it. New paths appear, old ones vanish. It smells like adventure and old parchment, and it crinkles with each unfolding.' }
};

const BIOME_LOOT_POOLS = {
    forest: ['forestCharm', 'mossStone', 'berryBundle', 'ancientCoin'],
    beach: ['sunShell', 'seaGlass', 'tidePearl', 'ancientCoin'],
    mountain: ['summitCrystal', 'eagleFeather', 'emberOre', 'mysteryMap'],
    cave: ['caveLantern', 'glowMushroom', 'runeFragment', 'ancientCoin'],
    skyIsland: ['cloudRibbon', 'stardust', 'windCompass', 'skyLantern'],
    underwater: ['bubbleGem', 'coralCrown', 'tidePearl', 'seaGlass'],
    skyZone: ['windCompass', 'skyLantern', 'stardust', 'cloudRibbon']
};

const ROOM_TREASURE_POOLS = {
    bedroom: ['mysteryMap', 'forestCharm', 'ancientCoin'],
    kitchen: ['berryBundle', 'sunShell', 'ancientCoin'],
    bathroom: ['bubbleGem', 'seaGlass', 'ancientCoin'],
    backyard: ['forestCharm', 'mossStone', 'berryBundle'],
    park: ['eagleFeather', 'cloudRibbon', 'ancientCoin'],
    garden: ['glowMushroom', 'forestCharm', 'berryBundle']
};

const TREASURE_HUNT_BALANCE = {
    // Report #1: Shared cooldown + anti-farm + low-friction resource cost.
    globalCooldownMs: 70 * 1000,
    energyCost: 5,
    successChanceBase: 0.48,
    successChanceMin: 0.2,
    extraRollChanceBase: 0.22,
    antiFarmWindowMs: 3 * 60 * 1000,
    penaltyResetMs: 4 * 60 * 1000,
    roomSwapPenaltyStep: 0.07,
    repeatPenaltyStep: 0.05,
    maxPenaltyStacks: 6
};

const EXPEDITION_DURATIONS = [
    { id: 'scout', name: 'Scout Run', label: '40s Scout Run', ms: 40000, lootMultiplier: 0.95 },
    { id: 'journey', name: 'Journey', label: '1m 35s Journey', ms: 95000, lootMultiplier: 1.85 },
    { id: 'odyssey', name: 'Grand Odyssey', label: '3m 40s Grand Odyssey', ms: 220000, lootMultiplier: 3.25 }
];

const EXPEDITION_BALANCE = {
    // Report #2: EV control levers (diminishing scaling, rarity smoothing, upkeep).
    durationDiminishingThreshold: 2.15,
    durationDiminishingExponent: 0.82,
    biomeRarityWeightMultiplier: {
        forest: 1.0,
        beach: 0.98,
        mountain: 0.94,
        cave: 0.93,
        skyIsland: 0.9,
        underwater: 0.9,
        skyZone: 0.88
    },
    upkeepBaseCoins: 7,
    upkeepPerMinute: 6,
    biomeUpkeepMultiplier: {
        forest: 1.0,
        beach: 1.03,
        mountain: 1.08,
        cave: 1.1,
        skyIsland: 1.15,
        underwater: 1.17,
        skyZone: 1.19
    }
};

const MINIGAME_BALANCE = {
    // Active source of truth for mini-game rewards/caps. (ECONOMY_BALANCE minigame cap knobs are deprecated.)
    // Report #3/#4: Soft cap and skill/streak reward scaling.
    perRunCapBase: 92,
    perRunCapByStage: { baby: 88, child: 94, adult: 102, elder: 110 },
    dailySoftCapBase: 370,
    dailySoftCapByStage: { baby: 350, child: 390, adult: 450, elder: 510 },
    dailyCapFromPrestigeStep: 40,
    softCapFalloffPerCoin: 0.005,
    softCapMinMultiplier: 0.24,
    highSkillThreshold: 82,
    highSkillPerPoint: 0.011,
    highSkillMaxBonus: 0.28,
    streakBonusPerRun: 0.04,
    streakBonusMax: 0.32
};

const COMPETITION_ECONOMY_BALANCE = {
    // Report #5: Coin rewards by mode, tuned below expedition dominance.
    battleWinBaseCoins: 15,
    battleLoseConsolationCoins: 4,
    bossWinBaseCoins: 42,
    showBaseCoins: 19,
    obstacleBaseCoins: 17,
    rivalWinBaseCoins: 23,
    rankStepCoins: 4,
    difficultyCoinScale: 0.24,
    maxCoinMultiplier: 2.4,
    victoryLootDropChance: 0.18,
    // Exploit hardening: competition reward controls (shared cap + repeat DR + repeat clear reductions).
    dailySoftCapCoins: 230,
    dailySoftCapFalloffPerCoin: 0.0068,
    dailySoftCapMinMultiplier: 0.18,
    repeatWindowMs: 15 * 60 * 1000,
    repeatPenaltyPerStack: 0.18,
    repeatMinMultiplier: 0.35,
    repeatCountResetMs: 25 * 60 * 1000,
    bossRepeatCoinMultiplier: 0.2,
    rivalRepeatCoinMultiplier: 0.35,
    battleLossConsolationDailyCap: 12,
    earlyGameFeeWaiverRank: 2,
    freeEntriesPerDay: 3,
    entryFeeBase: 6,
    entryFeeRankStep: 2,
    entryFeeModeMultiplier: {
        battle: 1.0,
        show: 1.0,
        obstacle: 1.1,
        rival: 1.25,
        boss: 1.8
    }
};

// Active economy hardening knobs (source of truth for exploit controls / sinks / local integrity checks).
// Tuning guidance:
// - Raise minute/session caps slowly; lowering too far will make legitimate bursts feel bad.
// - Time thresholds should tolerate device sleep/backgrounding but catch obvious clock edits.
// - Wealth pressure should be small early and noticeable only for hoarded late-game value.
const ECONOMY_HARDENING_BALANCE = {
    saveSchemaVersion: 3,
    tamperPenaltyMultiplier: 0.12,
    suspiciousAuctionLock: true,
    coinGainRateLimit: {
        minuteSoftCap: 1400,
        minuteFalloffPerCoin: 0.01,
        minuteMinMultiplier: 0.08,
        sessionSoftCap: 18000,
        sessionFalloffPerCoin: 0.0015,
        sessionMinMultiplier: 0.2
    },
    timeHardening: {
        backwardJumpThresholdMs: 2 * 60 * 1000,
        forwardJumpThresholdMs: 4 * 60 * 60 * 1000,
        stabilizationWindowMs: 10 * 60 * 1000,
        maxGardenOfflineAdvanceMs: 8 * 60 * 60 * 1000,
        maxNeedsOfflineAdvanceMs: 12 * 60 * 60 * 1000,
        maxExpeditionForwardGrantMs: 20 * 60 * 1000
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
        relistWindowMs: 3 * 24 * 60 * 60 * 1000,
        relistFeeStepRate: 0.02,
        relistFeeMaxExtraRate: 0.12
    }
};

const BALANCE_TELEMETRY = {
    enabled: true,
    rollingWindowMs: 60 * 60 * 1000,
    maxRecentEvents: 500
};

const DUNGEON_ROOM_TYPES = [
    { id: 'combat', name: 'Battle Room', icon: '⚔️' },
    { id: 'treasure', name: 'Treasure Room', icon: '💰' },
    { id: 'trap', name: 'Trap Room', icon: '🪤' },
    { id: 'rest', name: 'Rest Room', icon: '🔥' },
    { id: 'npc', name: 'Lost Friend Room', icon: '🐾' }
];

// ==================== SEASONS SYSTEM ====================

const SEASONS = {
    spring: {
        name: 'Spring',
        icon: '🌸',
        months: [2, 3, 4], // March, April, May
        decorEmoji: '🌸 🌷 🐝',
        nightDecorEmoji: '🌸 🌙 🌷',
        weatherBias: { sunny: 0.5, rainy: 0.35, snowy: 0.15 },
        moodBonus: 3,
        gardenGrowthMultiplier: 1.2,
        activityName: 'Flower Pick',
        activityIcon: '🌷',
        activityMessages: ['found a beautiful flower!', 'made a flower crown!', 'loves the spring blossoms!', 'is chasing butterflies!'],
        activityEffects: { happiness: 15, energy: -5 },
        ambientMessages: [
            'The flowers are blooming!', 'Spring is in the air!', 'What a lovely spring day!', 'The butterflies are out!',
            'A warm breeze carries the scent of fresh blossoms.',
            'Bees are buzzing happily from flower to flower.',
            'The garden soil is soft and ready for planting.',
            'Birdsong fills the air — spring\'s own orchestra.',
            'Tiny green shoots are pushing through the earth!',
            'The days are getting longer and warmer.',
            'Dandelion fluff drifts by on the gentle breeze.',
            'A robin is building a nest nearby — new beginnings!',
            'The world smells of rain-washed earth and new growth.',
            'Puddles from last night\'s rain reflect a blue sky.',
            'Everything feels fresh, clean, and full of possibility.',
            'Crocuses and daffodils dot the ground like little jewels.'
        ]
    },
    summer: {
        name: 'Summer',
        icon: '☀️',
        months: [5, 6, 7], // June, July, August
        decorEmoji: '🌻 🦋 🍉',
        nightDecorEmoji: '🌻 🌟 🦗',
        weatherBias: { sunny: 0.8, rainy: 0.2, snowy: 0.0 },
        moodBonus: 5,
        gardenGrowthMultiplier: 1.5,
        activityName: 'Splash Play',
        activityIcon: '💦',
        activityMessages: ['is splashing in water!', 'loves the summer fun!', 'had a water play session!', 'is cooling off in the sprinkler!'],
        activityEffects: { happiness: 20, cleanliness: 10, energy: -10 },
        ambientMessages: [
            'The sun is shining bright!', 'What a hot summer day!', 'Perfect for outdoor fun!', 'Summer vibes!',
            'Cicadas sing their buzzing summer song all afternoon.',
            'The grass is warm underfoot — perfect for barefoot walking.',
            'A sprinkler hisses in the distance. Splash time!',
            'The air smells of sun-warmed earth and ripe berries.',
            'Fireflies will be out tonight — living sparkles!',
            'Ice cream weather! The best kind of weather!',
            'Lazy clouds drift across an endless blue sky.',
            'The shade of a big tree is the most valuable real estate.',
            'Watermelon slices and cold drinks — summer essentials.',
            'Long golden evenings stretch out like a warm blanket.',
            'The sound of distant laughter carries on the warm air.',
            'Everything moves a little slower in the summer heat.'
        ]
    },
    autumn: {
        name: 'Autumn',
        icon: '🍂',
        months: [8, 9, 10], // September, October, November
        decorEmoji: '🍂 🎃 🍁',
        nightDecorEmoji: '🍂 🌙 🦉',
        weatherBias: { sunny: 0.4, rainy: 0.4, snowy: 0.2 },
        moodBonus: 2,
        gardenGrowthMultiplier: 0.8,
        activityName: 'Leaf Pile',
        activityIcon: '🍁',
        activityMessages: ['jumped in the leaf pile!', 'is crunching autumn leaves!', 'loves the fall colors!', 'found a cool pinecone!'],
        activityEffects: { happiness: 15, energy: -5 },
        ambientMessages: [
            'The leaves are changing colors!', 'Autumn is so cozy!', 'Crisp fall air!', 'Pumpkin season!',
            'Crunchy leaves crackle underfoot like nature\'s bubble wrap.',
            'The air smells of wood smoke and cinnamon.',
            'Acorns drop from the oak tree — squirrels are busy today!',
            'Golden light filters through amber and crimson canopies.',
            'A cool breeze carries the scent of ripe apples.',
            'The harvest moon hangs low and orange in the evening sky.',
            'Geese honk overhead, flying in a wobbly V formation.',
            'Warm scarves and crunchy leaves — the best combo.',
            'Mushrooms pop up in the damp grass like tiny umbrellas.',
            'The world is painting itself in warm golds and reds.',
            'Misty mornings give everything a soft, dreamy glow.',
            'Hot cider steams in the cool air — autumn perfection.'
        ]
    },
    winter: {
        name: 'Winter',
        icon: '❄️',
        months: [11, 0, 1], // December, January, February
        decorEmoji: '❄️ ⛄ 🎄',
        nightDecorEmoji: '❄️ 🌙 ✨',
        weatherBias: { sunny: 0.25, rainy: 0.15, snowy: 0.6 },
        moodBonus: 1,
        gardenGrowthMultiplier: 0.5,
        activityName: 'Snowplay',
        activityIcon: '⛄',
        activityMessages: ['built a tiny snowman!', 'is catching snowflakes!', 'loves playing in the snow!', 'made a snow angel!'],
        activityEffects: { happiness: 15, cleanliness: -5, energy: -10 },
        ambientMessages: [
            'It\'s a winter wonderland!', 'So cozy and cold!', 'Hot cocoa weather!', 'Winter magic!',
            'Frost paints delicate feather patterns on the windowpane.',
            'Snowflakes drift down like tiny frozen ballet dancers.',
            'The world is hushed under a thick blanket of white.',
            'Icicles hang from the eaves like crystal chandeliers.',
            'Warm breath makes little clouds in the crisp, cold air.',
            'Bare tree branches trace intricate patterns against the grey sky.',
            'The crunch of fresh snow underfoot is deeply satisfying.',
            'Cozy blankets and warm socks — winter survival essentials.',
            'A robin perches on the fence, puffed up against the cold.',
            'Candlelight flickers warmly in the early evening darkness.',
            'The kettle whistles — time for something warm to drink.',
            'Stars shine extra bright in the cold, clear winter sky.'
        ]
    }
};

function getCurrentSeason() {
    const month = new Date().getMonth();
    for (const [id, season] of Object.entries(SEASONS)) {
        if (season.months.includes(month)) return id;
    }
    return 'spring';
}

function getSeasonalDecor(season, timeOfDay) {
    const seasonData = SEASONS[season];
    if (!seasonData) return '';
    return timeOfDay === 'night' ? seasonData.nightDecorEmoji : seasonData.decorEmoji;
}

function getSeasonalWeather(season) {
    const seasonData = SEASONS[season];
    if (!seasonData) return 'sunny';
    const rand = Math.random();
    const bias = seasonData.weatherBias;
    if (rand < bias.sunny) return 'sunny';
    if (rand < bias.sunny + bias.rainy) return 'rainy';
    return 'snowy';
}

// ==================== GARDEN SYSTEM ====================

const GARDEN_CROPS = {
    carrot: {
        id: 'carrot',
        name: 'Carrot',
        seedEmoji: '🥕',
        stages: ['🟫', '🌱', '🌿', '🥕'],
        growTime: 2, // grow ticks needed per stage
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 15,
        happinessValue: 5,
        energyValue: 0,
        seasonBonus: ['spring', 'autumn'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.08,
        compostYield: 1
    },
    tomato: {
        id: 'tomato',
        name: 'Tomato',
        seedEmoji: '🍅',
        stages: ['🟫', '🌱', '🌿', '🍅'],
        growTime: 3,
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 18,
        happinessValue: 8,
        energyValue: 0,
        seasonBonus: ['summer'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.09,
        compostYield: 1
    },
    strawberry: {
        id: 'strawberry',
        name: 'Strawberry',
        seedEmoji: '🍓',
        stages: ['🟫', '🌱', '🌿', '🍓'],
        growTime: 4,
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 20,
        happinessValue: 12,
        energyValue: 0,
        seasonBonus: ['spring', 'summer'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.1,
        compostYield: 1
    },
    pumpkin: {
        id: 'pumpkin',
        name: 'Pumpkin',
        seedEmoji: '🎃',
        stages: ['🟫', '🌱', '🌿', '🎃'],
        growTime: 5,
        plantType: 'crop',
        harvestYield: 2,
        hungerValue: 25,
        happinessValue: 10,
        energyValue: 0,
        seasonBonus: ['autumn'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.11,
        compostYield: 2
    },
    sunflower: {
        id: 'sunflower',
        name: 'Sunflower',
        seedEmoji: '🌻',
        stages: ['🟫', '🌱', '🌿', '🌻'],
        growTime: 3,
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 5,
        happinessValue: 20,
        energyValue: 0,
        seasonBonus: ['summer', 'spring'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.07,
        compostYield: 1
    },
    apple: {
        id: 'apple',
        name: 'Apple',
        seedEmoji: '🍎',
        stages: ['🟫', '🌱', '🌳', '🍎'],
        growTime: 7,
        plantType: 'fruitTree',
        firstMatureMinutes: 30,
        harvestCooldownMinutes: 360,
        harvestYield: 2,
        hungerValue: 10,
        happinessValue: 0,
        energyValue: 15,
        seasonBonus: ['autumn'],
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.06,
        compostYield: 2
    },
    candyCorn: {
        id: 'candyCorn',
        name: 'Candy Corn',
        seedEmoji: '🍬',
        stages: ['🟫', '🌱', '🌾', '🍬'],
        growTime: 4,
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 12,
        happinessValue: 16,
        energyValue: 4,
        seasonBonus: ['autumn'],
        seasons: ['autumn'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.1,
        compostYield: 1
    },
    snowberry: {
        id: 'snowberry',
        name: 'Snowberry',
        seedEmoji: '🫐',
        stages: ['🟫', '🌱', '❄️', '🫐'],
        growTime: 5,
        plantType: 'crop',
        harvestYield: 1,
        hungerValue: 14,
        happinessValue: 10,
        energyValue: 10,
        seasonBonus: ['winter'],
        seasons: ['winter'],
        defaultUnlocked: true,
        pestRiskPerDay: 0.05,
        compostYield: 1
    },
    sunblush: {
        id: 'sunblush',
        name: 'Sunblush Melon',
        seedEmoji: '🍈',
        stages: ['🟫', '🌱', '🍃', '🍈'],
        growTime: 6,
        plantType: 'crop',
        harvestYield: 2,
        hungerValue: 24,
        happinessValue: 12,
        energyValue: 8,
        seasonBonus: ['summer', 'autumn'],
        seasons: ['summer', 'autumn'],
        defaultUnlocked: false,
        pestRiskPerDay: 0.09,
        compostYield: 2,
        discoveryRecipe: 'cross_recipe_sunblush'
    }
};

const FLOWER_GARDEN_PLANTS = {
    rose: {
        id: 'rose',
        name: 'Rose',
        emoji: '🌹',
        plantType: 'flower',
        stages: ['🟫', '🌱', '🌿', '🌹'],
        firstMatureMinutes: 18,
        moodPerMinute: 0.012,
        trimItem: 'petals',
        trimYield: 1,
        compostYield: 1,
        seasons: ['spring', 'summer', 'autumn'],
        defaultUnlocked: true
    },
    tulip: {
        id: 'tulip',
        name: 'Tulip',
        emoji: '🌷',
        plantType: 'flower',
        stages: ['🟫', '🌱', '🌿', '🌷'],
        firstMatureMinutes: 14,
        moodPerMinute: 0.01,
        trimItem: 'petals',
        trimYield: 1,
        compostYield: 1,
        seasons: ['spring'],
        defaultUnlocked: true
    },
    lavender: {
        id: 'lavender',
        name: 'Lavender',
        emoji: '🪻',
        plantType: 'flower',
        stages: ['🟫', '🌱', '🌿', '🪻'],
        firstMatureMinutes: 16,
        moodPerMinute: 0.011,
        trimItem: 'petals',
        trimYield: 1,
        compostYield: 1,
        seasons: ['spring', 'summer'],
        defaultUnlocked: true
    }
};

const MUSHROOM_CAVE_PLANTS = {
    glowcap: {
        id: 'glowcap',
        name: 'Glowcap Mushroom',
        emoji: '🍄',
        plantType: 'fungi',
        stages: ['🪨', '🌫️', '🍄', '🍄'],
        firstMatureMinutes: 40,
        harvestYield: 1,
        hungerValue: 0,
        happinessValue: 8,
        energyValue: 12,
        seasons: ['autumn', 'winter'],
        defaultUnlocked: true,
        requiresDampness: true,
        requiresFertilizer: false,
        compostYield: 2,
        pestRiskPerDay: 0.03
    },
    moonmorel: {
        id: 'moonmorel',
        name: 'Moonmorel',
        emoji: '🌘',
        plantType: 'fungi',
        stages: ['🪨', '🌫️', '🌘', '🌘'],
        firstMatureMinutes: 55,
        harvestYield: 2,
        hungerValue: 0,
        happinessValue: 14,
        energyValue: 18,
        seasons: ['winter'],
        defaultUnlocked: true,
        requiresDampness: true,
        requiresFertilizer: true,
        compostYield: 3,
        pestRiskPerDay: 0.02
    }
};

const GARDEN_CROSSBREED_RECIPES = [
    {
        id: 'cross_recipe_sunblush',
        parentA: 'carrot',
        parentB: 'strawberry',
        result: 'sunblush',
        chance: 0.22
    }
];

const GARDEN_SYSTEM_BALANCE = {
    debugLogging: false,
    offSeasonGrowthMultiplier: 0.35,
    offSeasonYieldMultiplier: 0.75,
    fertilizerGrowthBoost: 0.2,
    fertilizerYieldBonus: 1,
    maxFertilizerChargesPerPlot: 2,
    wateredDurationMs: 2 * 60 * 60 * 1000,
    sprinklerIntervalMs: 6 * 60 * 60 * 1000,
    sprinklerRadius: 2,
    scarecrowRadius: 2,
    scarecrowRiskReduction: 0.65,
    pestDurationMs: 6 * 60 * 60 * 1000,
    flowerMood: {
        maxMoodPerDay: 24,
        diminishingRate: 0.76
    },
    compost: {
        queueLimit: 8,
        baseDurationMs: 30 * 60 * 1000
    },
    beehive: {
        baseHoneyPerHour: 0.5,
        flowerBoostPerFlower: 0.12,
        maxFlowerBoost: 1.0,
        capacity: 20
    }
};

// ==================== ECONOMY & TRADING ====================

const ECONOMY_BALANCE = {
    // Price side
    shopPriceMultiplier: 0.92,
    rareMarketPriceMultiplier: 0.9,
    mysteryEggPriceMultiplier: 0.85,
    sellPriceMultiplier: 0.88,
    expeditionSellPriceMultiplier: 0.78, // Report #2
    // Reward side
    minigameRewardMultiplier: 0.88,
    harvestRewardMultiplier: 0.82,
    competitionCoinRewardMultiplier: 0.9, // Report #5
    dailyCompletionReward: 55,
    // Deprecated: mini-game caps now come from MINIGAME_BALANCE (soft cap system). Kept for save/backward compatibility.
    minigameRewardCap: 94,
    // Deprecated: live mini-game daily soft cap uses MINIGAME_BALANCE.dailySoftCap* knobs.
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
    coinDecayThreshold: 1000,
    coinDecayRate: 0.005,
    // Retention: Keep a protected wallet and reduce decay for active players.
    coinDecayProtectedWallet: 450,
    coinDecayEngagedReduction: 0.65,
    coinDecayDailyCompleteReduction: 0.4,
    coinDecayMinTax: 1,
    // Wealth pressure/storage fee (soft commodity tax; no item deletion)
    wealthPressureThreshold: 1600,
    wealthPressureTradableWeight: 0.35,
    wealthPressureRate: 0.0035,
    wealthPressureMinFee: 2,
    wealthPressureDebtResalePenaltyPer100Coins: 0.03,
    wealthPressureDebtResalePenaltyMax: 0.35,
    // Retention: Optional streak freeze token sink
    streakFreezeTokenCost: 120
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
            basePrice: 28,
            cropId: 'strawberry',
            quantity: 2,
            description: 'Sweet crop with strong happiness boost.'
        },
        pumpkinSeeds: {
            id: 'pumpkinSeeds',
            name: 'Pumpkin Seeds',
            emoji: '🎃',
            basePrice: 38,
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
            basePrice: 46,
            cropId: 'apple',
            quantity: 2,
            description: 'Slow but high-value tree seeds.'
        },
        candyCornSeeds: {
            id: 'candyCornSeeds',
            name: 'Candy Corn Seeds',
            emoji: '🍬',
            basePrice: 30,
            cropId: 'candyCorn',
            quantity: 2,
            description: 'Autumn-only sweet crop seeds.'
        },
        snowberrySeeds: {
            id: 'snowberrySeeds',
            name: 'Snowberry Seeds',
            emoji: '🫐',
            basePrice: 34,
            cropId: 'snowberry',
            quantity: 2,
            description: 'Winter-only cold climate berries.'
        },
        sunblushSeeds: {
            id: 'sunblushSeeds',
            name: 'Sunblush Seeds',
            emoji: '🍈',
            basePrice: 42,
            cropId: 'sunblush',
            quantity: 1,
            description: 'A mysterious hybrid variety.',
            requiresDiscovery: true
        },
        roseBulbs: {
            id: 'roseBulbs',
            name: 'Rose Bulbs',
            emoji: '🌹',
            cropId: 'rose',
            basePrice: 22,
            quantity: 2,
            description: 'Decorative flower garden bulbs.'
        },
        tulipBulbs: {
            id: 'tulipBulbs',
            name: 'Tulip Bulbs',
            emoji: '🌷',
            cropId: 'tulip',
            basePrice: 20,
            quantity: 2,
            description: 'Spring flower bulbs for mood boosts.'
        },
        lavenderSeeds: {
            id: 'lavenderSeeds',
            name: 'Lavender Seeds',
            emoji: '🪻',
            cropId: 'lavender',
            basePrice: 24,
            quantity: 2,
            description: 'Calming decorative flower seeds.'
        },
        glowcapSpores: {
            id: 'glowcapSpores',
            name: 'Glowcap Spores',
            emoji: '🍄',
            cropId: 'glowcap',
            basePrice: 46,
            quantity: 1,
            description: 'Spores for the Mushroom Cave.'
        },
        moonmorelSpores: {
            id: 'moonmorelSpores',
            name: 'Moonmorel Spores',
            emoji: '🌘',
            cropId: 'moonmorel',
            basePrice: 60,
            quantity: 1,
            description: 'Rare fungal spores that need fertilizer.'
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
        effects: { hunger: 10, cleanliness: 16, happiness: 14, energy: 12 },
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
        // Rec 9: Rebalanced from 16 to 34 (closer to 45% of Pet Med Kit's 76 value)
        craftCost: 34,
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
        description: 'Unlock 2 additional garden plots and +10% harvest coin rewards.',
        cost: 800,
        maxOwned: 1,
        category: 'garden'
    },
    premiumNursery: {
        id: 'premiumNursery',
        name: 'Premium Nursery',
        emoji: '🏠',
        description: 'Increase max pet capacity by 1 and +8% competition coin rewards.',
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
        description: 'Room bonuses scale +12% higher and treasure hunts gain +4% success.',
        cost: 1500,
        maxOwned: 1,
        category: 'rooms'
    },
    petSpa: {
        id: 'petSpa',
        name: 'Pet Spa Pass',
        emoji: '💆',
        description: 'Passive cleanliness decay reduced by 20% and care gains +6%.',
        cost: 700,
        maxOwned: 1,
        category: 'boost'
    },
    expeditionGuild: {
        id: 'expeditionGuild',
        name: 'Expedition Guild Card',
        emoji: '🗺️',
        description: 'Expeditions gain better loot quality and 12% lower upkeep.',
        cost: 900,
        maxOwned: 1,
        category: 'exploration'
    },
    cosmeticChest: {
        id: 'cosmeticChest',
        name: 'Rare Cosmetic Chest',
        emoji: '👑',
        description: 'Unlock cosmetics plus +12% minigame coins and +40 soft daily cap.',
        cost: 2000,
        maxOwned: 1,
        category: 'cosmetic'
    }
};

const PRESTIGE_EFFECTS = {
    // Report #8: Every prestige purchase maps to live gameplay modifiers.
    gardenExpansion: { extraGardenPlots: 2, harvestCoinMultiplier: 1.1 },
    premiumNursery: { extraPetCapacity: 1, competitionCoinMultiplier: 1.08 },
    goldenFeeder: { foodEffectMultiplier: 1.15 },
    masterCrafterBench: { craftingCostMultiplier: 0.75 },
    luxuryRoomUpgrade: { roomSystemMultiplier: 1.12, treasureSuccessBonus: 0.04 },
    petSpa: { cleanlinessDecayMultiplier: 0.8, careGainMultiplier: 1.06 },
    expeditionGuild: { expeditionLootQualityMultiplier: 1.1, expeditionUpkeepMultiplier: 0.88 },
    cosmeticChest: { minigameCoinMultiplier: 1.12, minigameDailySoftCapBonus: 40 }
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
    candyCornSeeds: ['autumn'],
    snowberrySeeds: ['winter'],
    sunblushSeeds: ['summer', 'autumn'],
    roseBulbs: ['spring', 'summer', 'autumn'],
    tulipBulbs: ['spring'],
    lavenderSeeds: ['spring', 'summer'],
    glowcapSpores: ['autumn', 'winter'],
    moonmorelSpores: ['winter'],
    // Accessories — always available
    ribbonBow: ['spring', 'summer', 'autumn', 'winter'],
    sunglasses: ['spring', 'summer'],
    wizardHat: ['autumn', 'winter'],
    // Decorations
    plantDecor: ['spring', 'summer'],
    balloonDecor: ['spring', 'summer', 'autumn', 'winter'],
    lightDecor: ['autumn', 'winter'],
    toyDecor: ['spring', 'summer', 'autumn', 'winter']
};

const GARDEN_BASE_PLOTS = 6;
const MAX_GARDEN_PLOTS = 16;
const GARDEN_EXPANSION_TIERS = [
    {
        id: 'expansionTier1',
        name: 'Orchard Row',
        additionalPlots: 4,
        costCoins: 850,
        requiredHarvests: 30
    },
    {
        id: 'expansionTier2',
        name: 'Greenhouse Annex',
        additionalPlots: 6,
        costCoins: 1800,
        requiredHarvests: 80
    }
];

// Progressive plot unlocking thresholds (harvests needed for each plot).
// New plots unlock naturally after each expansion tier is purchased.
const GARDEN_PLOT_UNLOCK_THRESHOLDS = [0, 2, 5, 10, 16, 24, 32, 40, 50, 60, 72, 84, 98, 112, 128, 144];

// ==================== MULTI-PET SYSTEM ====================

const MAX_PETS = 4; // Maximum number of pets a player can have at once

// ==================== PET INTERACTIONS ====================

const PET_INTERACTIONS = {
    playTogether: {
        name: 'Play Together',
        emoji: '⚽',
        description: 'Pets play and have fun together!',
        effects: { happiness: 15, energy: -8 },
        relationshipGain: 8,
        cooldown: 60000, // 1 minute
        messages: [
            'are chasing each other around!',
            'are playing tag together!',
            'are having a blast together!',
            'are tumbling around happily!',
            'are bouncing and playing!'
        ]
    },
    shareFood: {
        name: 'Share Meal',
        emoji: '🍽️',
        description: 'Pets share a meal together!',
        effects: { hunger: 12, happiness: 8 },
        relationshipGain: 6,
        cooldown: 60000,
        messages: [
            'are sharing a yummy meal!',
            'are eating side by side!',
            'are munching together happily!',
            'are enjoying lunch together!',
            'are sharing snacks!'
        ]
    },
    groomEachOther: {
        name: 'Groom Each Other',
        emoji: '✨',
        description: 'Pets groom and clean each other!',
        effects: { cleanliness: 12, happiness: 10 },
        relationshipGain: 7,
        cooldown: 60000,
        messages: [
            'are grooming each other so sweetly!',
            'are helping each other look their best!',
            'are taking care of each other!',
            'are making each other sparkly clean!',
            'are brushing each other gently!'
        ]
    },
    napTogether: {
        name: 'Nap Together',
        emoji: '💤',
        description: 'Pets cuddle up for a cozy nap!',
        effects: { energy: 18, happiness: 8 },
        relationshipGain: 10,
        cooldown: 90000,
        messages: [
            'are cuddling up for a cozy nap!',
            'are sleeping side by side!',
            'are snuggling together peacefully!',
            'are dozing off together!',
            'are sharing a warm nap!'
        ]
    },
    explore: {
        name: 'Explore Together',
        emoji: '🗺️',
        description: 'Pets go on a little adventure!',
        effects: { happiness: 18, energy: -10, hunger: -5 },
        relationshipGain: 12,
        cooldown: 120000, // 2 minutes
        messages: [
            'went on an adventure and found something cool!',
            'explored the area and had a great time!',
            'discovered a secret spot together!',
            'went exploring and made wonderful memories!',
            'had an exciting little expedition!'
        ]
    }
};

// ==================== RELATIONSHIP SYSTEM ====================

const RELATIONSHIP_LEVELS = {
    stranger: {
        label: 'Stranger',
        emoji: '🤝',
        minPoints: 0,
        description: 'Just met! Time to get to know each other.',
        interactionBonus: 1.0
    },
    acquaintance: {
        label: 'Acquaintance',
        emoji: '👋',
        minPoints: 20,
        description: 'Starting to warm up to each other!',
        interactionBonus: 1.1
    },
    friend: {
        label: 'Friend',
        emoji: '😊',
        minPoints: 50,
        description: 'Good pals who enjoy hanging out!',
        interactionBonus: 1.2
    },
    closeFriend: {
        label: 'Close Friend',
        emoji: '💛',
        minPoints: 100,
        description: 'Best buddies who love being together!',
        interactionBonus: 1.3
    },
    bestFriend: {
        label: 'Best Friend',
        emoji: '💖',
        minPoints: 180,
        description: 'Inseparable! The closest bond possible!',
        interactionBonus: 1.5
    },
    family: {
        label: 'Family',
        emoji: '🏠',
        minPoints: 250,
        description: 'A true family bond! They consider each other family!',
        interactionBonus: 1.7
    }
};

const RELATIONSHIP_ORDER = ['stranger', 'acquaintance', 'friend', 'closeFriend', 'bestFriend', 'family'];

function getRelationshipLevel(points) {
    // Iterate from highest level to lowest; return first match
    for (let i = RELATIONSHIP_ORDER.length - 1; i >= 0; i--) {
        const key = RELATIONSHIP_ORDER[i];
        if (points >= RELATIONSHIP_LEVELS[key].minPoints) {
            return key;
        }
    }
    return 'stranger';
}

function getRelationshipProgress(points) {
    const currentLevel = getRelationshipLevel(points);
    const currentIdx = RELATIONSHIP_ORDER.indexOf(currentLevel);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= RELATIONSHIP_ORDER.length) return 100;
    const currentMin = RELATIONSHIP_LEVELS[currentLevel].minPoints;
    const nextMin = RELATIONSHIP_LEVELS[RELATIONSHIP_ORDER[nextIdx]].minPoints;
    const range = nextMin - currentMin;
    return Math.min(100, Math.max(0, ((points - currentMin) / range) * 100));
}

// ==================== FOCUS SNAPSHOT + RESTORE HELPERS ====================
function _canUseUnicodeProps() {
    try { return !!new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { return false; }
}

const _emojiSpeechRegex = _canUseUnicodeProps()
    ? /[\p{Extended_Pictographic}\uFE0F\u200D]+/gu
    : /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu;

function normalizeSpeechLabelText(text) {
    return String(text || '')
        .replace(_emojiSpeechRegex, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getElementFocusKey(el) {
    if (!el || !el.getAttribute) return '';
    return el.getAttribute('data-focus-key')
        || el.getAttribute('data-room')
        || el.getAttribute('data-tool-action')
        || el.getAttribute('data-sound-cue')
        || el.getAttribute('data-quality-mode')
        || el.getAttribute('data-pet-index')
        || '';
}

function _escapeSelectorValue(value) {
    const str = String(value || '');
    if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(str);
    return str.replace(/["\\]/g, '\\$&');
}

function isElementActuallyHidden(el) {
    if (!el || !(el instanceof Element)) return true;
    if (el.hidden) return true;
    if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return true;
    if (el.closest('.duplicate-core-action')) return true;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0 && style && style.position !== 'fixed') return true;
    return false;
}

function isFocusableRestoreCandidate(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (!document.contains(el)) return false;
    if (isElementActuallyHidden(el)) return false;
    if (el.disabled) return false;
    if (el.getAttribute && el.getAttribute('aria-disabled') === 'true') return false;
    return typeof el.focus === 'function';
}

function createFocusSnapshot(activeElement, options = {}) {
    const active = activeElement || (typeof document !== 'undefined' ? document.activeElement : null);
    const scope = options.scope && options.scope instanceof Element ? options.scope : null;
    const validActive = active && active !== document.body && active !== document.documentElement && (!scope || scope.contains(active));
    const el = validActive ? active : null;
    const descriptor = el ? {
        id: el.id || '',
        focusKey: getElementFocusKey(el),
        role: (el.getAttribute && el.getAttribute('role')) || '',
        ariaLabel: (el.getAttribute && el.getAttribute('aria-label')) || '',
        name: normalizeSpeechLabelText(el.textContent || ''),
        tag: (el.tagName || '').toLowerCase(),
        room: (el.getAttribute && el.getAttribute('data-room')) || '',
        toolAction: (el.getAttribute && el.getAttribute('data-tool-action')) || '',
        soundCue: (el.getAttribute && el.getAttribute('data-sound-cue')) || '',
        qualityMode: (el.getAttribute && el.getAttribute('data-quality-mode')) || '',
        petIndex: (el.getAttribute && el.getAttribute('data-pet-index')) || '',
        classes: (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/).filter(Boolean).slice(0, 4)
            : []
    } : null;
    return {
        at: Date.now(),
        context: options.context || '',
        scopeSelector: scope ? (scope.id ? `#${scope.id}` : '') : '',
        scopeScrollTop: (scope && 'scrollTop' in scope) ? scope.scrollTop : null,
        scopeScrollLeft: (scope && 'scrollLeft' in scope) ? scope.scrollLeft : null,
        windowScrollX: typeof window !== 'undefined' ? window.scrollX : 0,
        windowScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
        descriptor
    };
}

function _findFocusCandidateFromDescriptor(snapshot, options = {}) {
    const desc = snapshot && snapshot.descriptor;
    if (!desc) return null;
    const scope = options.scope && options.scope instanceof Element ? options.scope : null;
    const root = scope || document;
    const tryCandidate = (el) => {
        if (!el) return null;
        if (scope && !scope.contains(el)) return null;
        return isFocusableRestoreCandidate(el) ? el : null;
    };

    if (desc.id) {
        const byId = tryCandidate(document.getElementById(desc.id));
        if (byId) return byId;
    }
    if (desc.focusKey) {
        const byKey = tryCandidate(root.querySelector(`[data-focus-key="${_escapeSelectorValue(desc.focusKey)}"]`));
        if (byKey) return byKey;
        if (desc.room) {
            const byRoom = tryCandidate(root.querySelector(`[data-room="${_escapeSelectorValue(desc.room)}"]`));
            if (byRoom) return byRoom;
        }
        if (desc.toolAction) {
            const byTool = tryCandidate(root.querySelector(`[data-tool-action="${_escapeSelectorValue(desc.toolAction)}"]`));
            if (byTool) return byTool;
        }
        if (desc.soundCue) {
            const byCue = tryCandidate(root.querySelector(`[data-sound-cue="${_escapeSelectorValue(desc.soundCue)}"]`));
            if (byCue) return byCue;
        }
        if (desc.qualityMode) {
            const byQuality = tryCandidate(root.querySelector(`[data-quality-mode="${_escapeSelectorValue(desc.qualityMode)}"]`));
            if (byQuality) return byQuality;
        }
        if (desc.petIndex) {
            const byPetIndex = tryCandidate(root.querySelector(`[data-pet-index="${_escapeSelectorValue(desc.petIndex)}"]`));
            if (byPetIndex) return byPetIndex;
        }
    }
    if (desc.ariaLabel) {
        const escaped = _escapeSelectorValue(desc.ariaLabel);
        const byAria = tryCandidate(root.querySelector(`[aria-label="${escaped}"]`));
        if (byAria) return byAria;
    }
    if (desc.tag && desc.classes && desc.classes.length > 0) {
        const selector = `${desc.tag}.${desc.classes.map((c) => _escapeSelectorValue(c)).join('.')}`;
        const byClass = tryCandidate(root.querySelector(selector));
        if (byClass) return byClass;
    }
    return null;
}

function _findFocusFallbackCandidate(options = {}) {
    const scope = options.scope && options.scope instanceof Element ? options.scope : document.getElementById('game-content');
    const root = scope || document;
    const selectors = [
        '[data-focus-fallback]',
        '.region-heading',
        'h1, h2, h3',
        '.more-actions-toggle',
        '#settings-btn',
        '.top-action-btn',
        '.core-care-btn',
        'button:not([disabled])'
    ];
    for (const selector of selectors) {
        const candidates = root.querySelectorAll(selector);
        for (const el of candidates) {
            if (!(el instanceof HTMLElement)) continue;
            if (!el.hasAttribute('tabindex') && /^h[1-6]$/i.test(el.tagName)) el.setAttribute('tabindex', '-1');
            if (isFocusableRestoreCandidate(el)) return el;
        }
    }
    return null;
}

function restoreFocusFromSnapshot(snapshot, options = {}) {
    if (!snapshot || typeof document === 'undefined') return false;
    const scope = options.scope && options.scope instanceof Element ? options.scope : null;
    const candidate = _findFocusCandidateFromDescriptor(snapshot, { scope })
        || _findFocusFallbackCandidate({ scope });
    if (!candidate) return false;
    const shouldRestoreScroll = options.restoreScroll !== false;
    const focusNow = () => {
        if (shouldRestoreScroll && scope && Number.isFinite(snapshot.scopeScrollTop) && Number.isFinite(snapshot.scopeScrollLeft)) {
            scope.scrollTop = snapshot.scopeScrollTop;
            scope.scrollLeft = snapshot.scopeScrollLeft;
        }
        if (shouldRestoreScroll && !scope && Number.isFinite(snapshot.windowScrollX) && Number.isFinite(snapshot.windowScrollY)) {
            window.scrollTo(snapshot.windowScrollX, snapshot.windowScrollY);
        }
        candidate.focus({ preventScroll: true });
        if (shouldRestoreScroll && !scope && Number.isFinite(snapshot.windowScrollX) && Number.isFinite(snapshot.windowScrollY)) {
            window.scrollTo(snapshot.windowScrollX, snapshot.windowScrollY);
        }
    };
    // Two RAFs helps VoiceOver stay on the intended node after large innerHTML swaps.
    requestAnimationFrame(() => requestAnimationFrame(focusNow));
    return true;
}

function captureUiFocusSnapshot(options = {}) {
    return createFocusSnapshot(document.activeElement, options);
}

window.captureUiFocusSnapshot = captureUiFocusSnapshot;
window.restoreFocusFromSnapshot = restoreFocusFromSnapshot;
window.normalizeSpeechLabelText = normalizeSpeechLabelText;

// ==================== MODAL ESCAPE KEY STACK ====================
// Ensures only the topmost modal/overlay responds to the Escape key.
const _modalEscapeStack = [];
let _modalLastReturnAnnounceAt = 0;
const _modalFocusRestoreByCloseFn = new WeakMap();

function isBriefScreenReaderMode() {
    try {
        return localStorage.getItem(STORAGE_KEYS.srVerbosity) !== 'detailed';
    } catch (e) {
        return true;
    }
}

function updateBackgroundInertState() {
    if (typeof document === 'undefined') return;
    const appRoot = document.querySelector('main.game-container');
    if (!appRoot) return;
    const hasModal = _modalEscapeStack.length > 0;
    if (hasModal) {
        const active = document.activeElement;
        if (active && appRoot.contains(active) && typeof active.blur === 'function') {
            active.blur();
        }
        appRoot.setAttribute('aria-hidden', 'true');
        appRoot.setAttribute('inert', '');
        document.body.classList.add('modal-open');
    } else {
        appRoot.removeAttribute('aria-hidden');
        appRoot.removeAttribute('inert');
        document.body.classList.remove('modal-open');
        document.body.classList.remove('minigame-menu-open');
    }
    if (typeof window !== 'undefined' && typeof window.setUiBusyState === 'function') {
        window.setUiBusyState();
    }
}

function pushModalEscape(closeFn) {
    if (typeof document !== 'undefined' && typeof closeFn === 'function') {
        const active = document.activeElement;
        if (active && active !== document.body && typeof active.focus === 'function') {
            _modalFocusRestoreByCloseFn.set(closeFn, createFocusSnapshot(active, { context: 'modal-opener' }));
        }
    }
    _modalEscapeStack.push(closeFn);
    updateBackgroundInertState();
}

function popModalEscape(closeFn) {
    const idx = _modalEscapeStack.lastIndexOf(closeFn);
    if (idx !== -1) _modalEscapeStack.splice(idx, 1);
    updateBackgroundInertState();
    setTimeout(() => {
        const snapshot = (typeof closeFn === 'function' && _modalFocusRestoreByCloseFn.get(closeFn)) || null;
        if (snapshot) restoreFocusFromSnapshot(snapshot);
        if (_modalEscapeStack.length !== 0) return;
        const active = document.activeElement;
        if (!active || typeof announce !== 'function' || isBriefScreenReaderMode()) return;
        const label = normalizeSpeechLabelText(active.getAttribute('aria-label') || active.textContent || '');
        const compact = String(label).slice(0, 48);
        if (!compact) return;
        const now = Date.now();
        if (now - _modalLastReturnAnnounceAt < 1200) return;
        _modalLastReturnAnnounceAt = now;
        announce(`Returned to ${compact}.`, { source: 'focus-return', dedupeMs: 1000 });
    }, 60);
}

if (typeof document !== 'undefined' && !window.__modalEscapeListenerRegistered) {
    window.__modalEscapeListenerRegistered = true;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _modalEscapeStack.length > 0) {
            e.stopImmediatePropagation();
            const topHandler = _modalEscapeStack[_modalEscapeStack.length - 1];
            topHandler();
        }
    });
}

// Trap Tab focus within a modal overlay element
function trapFocus(overlay) {
    if (!overlay || !(overlay instanceof HTMLElement)) return;
    const ensureOverlayFocusable = () => {
        if (!overlay.hasAttribute('tabindex')) overlay.setAttribute('tabindex', '-1');
    };
    const getFocusable = () => Array.from(overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]:not([disabled]), [role="link"], [role="tab"], [role="switch"]:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'))
        .filter((el) => (el instanceof HTMLElement) && (!el.hasAttribute('tabindex') || el.getAttribute('tabindex') !== '-1'))
        .filter((el) => isFocusableRestoreCandidate(el));
    const getDialogTitle = () => overlay.querySelector('[data-dialog-title], h1, h2, h3, legend');
    const focusModalEntry = () => {
        const title = getDialogTitle();
        if (title instanceof HTMLElement && !isElementActuallyHidden(title)) {
            if (!overlay.hasAttribute('aria-labelledby') && title.id) {
                overlay.setAttribute('aria-labelledby', title.id);
            }
            if (!title.id && !overlay.hasAttribute('aria-labelledby')) {
                title.id = `dialog-title-${Math.random().toString(36).slice(2, 9)}`;
                overlay.setAttribute('aria-labelledby', title.id);
            }
            if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
            title.focus({ preventScroll: true });
            if (typeof announce === 'function' && overlay.dataset.modalTitleAnnounced !== 'true') {
                const label = normalizeSpeechLabelText(title.textContent || overlay.getAttribute('aria-label') || 'Dialog');
                if (label) {
                    overlay.dataset.modalTitleAnnounced = 'true';
                    announce(label, { source: 'modal-title', dedupeMs: 900 });
                }
            }
            return true;
        }
        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus({ preventScroll: true });
            return true;
        }
        overlay.focus({ preventScroll: true });
        return false;
    };
    ensureOverlayFocusable();
    const focusableNow = getFocusable();
    if (!overlay.contains(document.activeElement)) {
        focusModalEntry();
    }
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const focusable = getFocusable();
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

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
    visitAllRooms: { id: 'visitAllRooms', name: 'Explorer', icon: '🗺️', description: 'Visit all 6 rooms', check: (gs) => { const visited = gs.roomsVisited || {}; return ROOM_IDS.every(r => visited[r]); } },
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
    dailyFinishCare: { id: 'dailyFinishCare', coins: 96, modifierId: 'careRush', collectible: { type: 'sticker', id: 'partySticker' } },
    dailyFinishExplore: { id: 'dailyFinishExplore', coins: 102, modifierId: 'luckyPaws', collectible: { type: 'sticker', id: 'partySticker' } },
    dailyFinishCompete: { id: 'dailyFinishCompete', coins: 104, modifierId: 'focusedTraining', collectible: { type: 'sticker', id: 'partySticker' } },
    streakDay1: { id: 'streakDay1', coins: 40, modifierId: 'happyHour', collectible: { type: 'sticker', id: 'starSticker' } },
    streakDay3: { id: 'streakDay3', coins: 55, modifierId: 'careRush', collectible: { type: 'sticker', id: 'partySticker' } },
    streakDay5: { id: 'streakDay5', coins: 75, modifierId: 'careRush', collectible: { type: 'accessory', id: 'bandana' } },
    streakDay7: { id: 'streakDay7', coins: 90, modifierId: 'happyHour', collectible: { type: 'sticker', id: 'streakFlame' } },
    streakDay10: { id: 'streakDay10', coins: 110, modifierId: 'focusedTraining', collectible: { type: 'accessory', id: 'sunglasses' } },
    streakDay14: { id: 'streakDay14', coins: 135, modifierId: 'familyAura', collectible: { type: 'sticker', id: 'heartSticker' } },
    streakDay21: { id: 'streakDay21', coins: 180, modifierId: 'luckyPaws', collectible: { type: 'accessory', id: 'crown' } },
    streakDay30: { id: 'streakDay30', coins: 240, modifierId: 'focusedTraining', collectible: { type: 'sticker', id: 'crownSticker' } },
    weeklyArcFinale: { id: 'weeklyArcFinale', coins: 320, modifierId: 'familyAura', collectible: { type: 'sticker', id: 'legendRibbon' } },
    weeklyArcCare: { id: 'weeklyArcCare', coins: 300, modifierId: 'careRush', collectible: { type: 'sticker', id: 'legendRibbon' } },
    weeklyArcExplore: { id: 'weeklyArcExplore', coins: 308, modifierId: 'luckyPaws', collectible: { type: 'sticker', id: 'legendRibbon' } },
    weeklyArcCompete: { id: 'weeklyArcCompete', coins: 314, modifierId: 'focusedTraining', collectible: { type: 'sticker', id: 'legendRibbon' } },
    // Recommendation #9: Sticker set completion bonuses
    stickerSetAnimals: { id: 'stickerSetAnimals', coins: 150, modifierId: 'luckyPaws' },
    stickerSetNature: { id: 'stickerSetNature', coins: 100, modifierId: 'careRush' },
    stickerSetFun: { id: 'stickerSetFun', coins: 120, modifierId: 'happyHour' },
    stickerSetSpecial: { id: 'stickerSetSpecial', coins: 200, modifierId: 'focusedTraining' },
    // Garden milestone rewards
    gardenPlotUnlockMinor: { id: 'gardenPlotUnlockMinor', coins: 20, modifierId: null },
    gardenPlotUnlockMajor: { id: 'gardenPlotUnlockMajor', coins: 42, modifierId: 'careRush' },
    gardenExpansionTier1Reward: { id: 'gardenExpansionTier1Reward', coins: 85, modifierId: 'careRush' },
    gardenExpansionTier2Reward: { id: 'gardenExpansionTier2Reward', coins: 130, modifierId: 'familyAura' },
    // Breeding discovery milestone rewards
    breedingDiscoveryBreed: { id: 'breedingDiscoveryBreed', coins: 36, modifierId: 'happyHour' },
    breedingDiscoveryHybrid: { id: 'breedingDiscoveryHybrid', coins: 70, modifierId: 'familyAura' },
    breedingDiscoveryMutation: { id: 'breedingDiscoveryMutation', coins: 80, modifierId: 'luckyPaws' },
    // Competition collection milestone rewards
    competitionCollectionRival: { id: 'competitionCollectionRival', coins: 55, modifierId: 'focusedTraining' },
    competitionCollectionBoss: { id: 'competitionCollectionBoss', coins: 95, modifierId: 'focusedTraining' }
};

// Small incremental rewards to reduce "silent progress" on longer tasks/arcs.
// Values are intentionally modest and can be tuned without changing runtime logic.
const PROGRESSION_REWARD_TUNING = {
    dailyTaskPartial: {
        minTarget: 2,
        thresholds: [
            {
                id: 'half',
                ratio: 0.5,
                coinsByLane: {
                    fixed: 8,
                    mode: 10,
                    wildcard: 12,
                    seasonal: 9,
                    default: 9
                }
            }
        ]
    },
    weeklyArcStep: {
        coinsByTrackKey: {
            totalCareActions: 14,
            feedCount: 14,
            harvestCount: 16,
            parkVisits: 18,
            minigameCount: 16,
            expeditionCount: 22,
            battleCount: 20,
            bondEvents: 18,
            hatchCount: 24,
            discoveryEvents: 18,
            default: 16
        }
    },
    firstOfDayModeBonus: {
        minigame: { coins: 16, modifierId: 'happyHour', label: 'First Mini-game' },
        harvest: { coins: 14, modifierId: 'careRush', label: 'First Harvest' },
        expedition: { coins: 20, modifierId: 'luckyPaws', label: 'First Expedition' },
        arena: { coins: 18, modifierId: 'focusedTraining', label: 'First Arena' }
    },
    stickerSetPartial: {
        thresholds: [
            { id: 'half', ratio: 0.5, coinScale: 0.45, grantModifier: false },
            { id: 'threeQuarter', ratio: 0.75, coinScale: 0.7, grantModifier: true }
        ]
    },
    pity: {
        mysteryEggRareMisses: 9,
        expeditionRareMisses: 4
    },
    gardenMilestones: {
        plotUnlockMajorPlots: [8, 12, 16],
        plotUnlockMinorBundleId: 'gardenPlotUnlockMinor',
        plotUnlockMajorBundleId: 'gardenPlotUnlockMajor',
        expansionTierBundleIds: {
            1: 'gardenExpansionTier1Reward',
            2: 'gardenExpansionTier2Reward'
        }
    },
    breedingDiscoveryMilestones: {
        totalBreedings: [
            { value: 1, bundleId: 'breedingDiscoveryBreed' },
            { value: 5, bundleId: 'breedingDiscoveryBreed' },
            { value: 12, bundleId: 'breedingDiscoveryHybrid' }
        ],
        totalHybridsCreated: [
            { value: 1, bundleId: 'breedingDiscoveryHybrid' },
            { value: 3, bundleId: 'breedingDiscoveryHybrid' }
        ],
        totalMutations: [
            { value: 1, bundleId: 'breedingDiscoveryMutation' },
            { value: 3, bundleId: 'breedingDiscoveryMutation' }
        ]
    },
    competitionFirstClearCollections: {
        rivalMilestones: [3, 6, 9],
        bossMilestones: [1, 2, 3],
        rivalBundleId: 'competitionCollectionRival',
        bossBundleId: 'competitionCollectionBoss'
    }
};

const PHASE_REWARD_BUNDLE_TABLE = {
    daily: {
        baby: 'dailyFinishCare',
        child: 'dailyFinishCare',
        adult: 'dailyFinishExplore',
        elder: 'dailyFinishCompete'
    },
    weekly: {
        baby: 'weeklyArcCare',
        child: 'weeklyArcExplore',
        adult: 'weeklyArcCompete',
        elder: 'weeklyArcCompete'
    },
    achievement: {
        baby: 'stickerSetNature',
        child: 'stickerSetAnimals',
        adult: 'stickerSetAnimals',
        elder: 'stickerSetSpecial'
    }
};

function getRewardBundleForPhase(phaseKey, stage, fallbackBundleId) {
    const lane = PHASE_REWARD_BUNDLE_TABLE[phaseKey];
    if (!lane) return fallbackBundleId || null;
    const stageKey = GROWTH_STAGES[stage] ? stage : 'baby';
    const bundleId = lane[stageKey] || fallbackBundleId;
    if (!bundleId || !REWARD_BUNDLES[bundleId]) return fallbackBundleId || null;
    return bundleId;
}

function getPhaseModifierForLane(stage, laneKey) {
    const tuning = getPhaseRewardTuning();
    const stageKey = GROWTH_STAGES[stage] ? stage : 'baby';
    if (laneKey === 'daily') return (tuning.dailyModifierByStage || {})[stageKey] || null;
    if (laneKey === 'weekly') return (tuning.weeklyModifierByStage || {})[stageKey] || null;
    if (laneKey === 'achievement') return (tuning.achievementModifierByStage || {})[stageKey] || null;
    return null;
}

function getMasteryPhaseBonus(stage, bonusKey) {
    const stageKey = GROWTH_STAGES[stage] ? stage : 'baby';
    const mastery = (getPhaseRewardTuning().mastery || {});
    if (bonusKey === 'care') return (mastery.careByStage || {})[stageKey] || 0;
    if (bonusKey === 'expeditionRolls') return (mastery.expeditionRollBonusByStage || {})[stageKey] || 0;
    if (bonusKey === 'competition') return (mastery.competitionByStage || {})[stageKey] || 0;
    return 0;
}

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
    worldTraveler: { id: 'worldTraveler', name: 'World Traveler', icon: '🗺️', description: 'Visit all 6 rooms', category: 'exploration', tier: 'silver', check: (gs) => { const v = gs.roomsVisited || {}; return ROOM_IDS.every(r => v[r]); } },
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
    fullGarden: { id: 'fullGarden', name: 'Full Garden', icon: '🏡', description: 'Unlock all 16 garden plots', shelf: 'garden', check: (gs) => gs.garden && getUnlockedPlotCount(gs.garden.totalHarvests, gs.garden.expansionTier) >= MAX_GARDEN_PLOTS },
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
    { days: 3, bundleId: 'streakDay3', label: '3-Day Streak', description: 'On a roll!', freezeTokens: 1 },
    { days: 5, bundleId: 'streakDay5', label: '5-Day Streak', description: 'Dedicated caretaker!' },
    { days: 7, bundleId: 'streakDay7', label: 'Week Streak', description: 'A whole week!', freezeTokens: 1 },
    { days: 10, bundleId: 'streakDay10', label: '10-Day Streak', description: 'Super dedicated!' },
    { days: 14, bundleId: 'streakDay14', label: '2-Week Streak', description: 'True devotion!', freezeTokens: 1 },
    { days: 21, bundleId: 'streakDay21', label: '3-Week Streak', description: 'Incredible commitment!', freezeTokens: 1 },
    { days: 30, bundleId: 'streakDay30', label: 'Monthly Streak', description: 'Legendary caretaker!', freezeTokens: 2 }
];

const STREAK_PROTECTION_CONFIG = {
    freezeMilestoneDays: [3, 7, 14, 21, 30],
    checkpointDays: [7, 14, 30],
    checkpointFallbackOffset: 1, // Falls back to checkpoint minus one day.
    softDecayPerMissedDay: 2,
    maxSoftDecayPerLogin: 8
};

const RETENTION_DEV_FLAGS = {
    enabled: false,
    showDebugPanel: false
};

const RETENTION_FEATURE_FLAGS = {
    journeyEnabled: true,
    seasonalJourneyEnabled: false,
    telemetryCaptureEnabled: true,
    telemetryUploadEnabled: false,
    telemetryEndpoint: '',
    pacingV2Enabled: false,
    reminderPrioritizationV2Enabled: false,
    comebackQuestsEnabled: true,
    journeyTokenStoreRotationEnabled: true,
    householdRetentionBeatsEnabled: true,
    personalizationEnabled: true,
    rewardMomentEffectsEnabled: true,
    experimentsEnabled: false
};

const RETENTION_P1_TUNING = {
    growthThresholds: {
        child: { actionsNeeded: 12, hoursNeeded: 1.5 },
        adult: { actionsNeeded: 34, hoursNeeded: 5 },
        elder: { actionsNeeded: 100, hoursNeeded: 22 }
    },
    journeyRewardPacing: {
        objectiveComplete: 2,
        chapterComplete: 5,
        dailyComplete: 2,
        noveltyUnlock: 3,
        backlog: {
            tokenPerMissedDay: 2,
            dripLogins: 3,
            maxBufferedMissedDays: 10,
            minAwayDaysForBacklog: 1
        }
    },
    noveltyUnlockCadence: {
        earlyUnlockSpacingDays: 2,
        weeklySpikeWeightBoost: 0.2
    },
    reminderCenter: {
        lowValueDemoteAgeHours: 18,
        maxHighPriorityPinned: 3
    }
};

function isRetentionFeatureFlagEnabled(flagName) {
    if (!flagName) return false;
    try {
        if (typeof MLFRetentionTelemetry !== 'undefined'
            && MLFRetentionTelemetry
            && typeof MLFRetentionTelemetry.getRuntimeFlags === 'function') {
            const flags = MLFRetentionTelemetry.getRuntimeFlags();
            return !!(flags && flags[flagName] === true);
        }
    } catch (e) {}
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('mlf_retention_flags_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                return !!(parsed && parsed[flagName] === true);
            }
        }
    } catch (e) {}
    return !!(RETENTION_FEATURE_FLAGS && RETENTION_FEATURE_FLAGS[flagName] === true);
}

function getRetentionP1Tuning() {
    if (!isRetentionFeatureFlagEnabled('pacingV2Enabled')) return null;
    let tuning = RETENTION_P1_TUNING;
    if (typeof applyRetentionExperimentTuningOverrides === 'function') {
        try {
            const overridden = applyRetentionExperimentTuningOverrides(tuning);
            if (overridden) tuning = overridden;
        } catch (e) {}
    } else if (typeof MLFRetentionExperiments !== 'undefined' && MLFRetentionExperiments && typeof MLFRetentionExperiments.applyTuningOverrides === 'function') {
        try {
            const overridden = MLFRetentionExperiments.applyTuningOverrides(tuning);
            if (overridden) tuning = overridden;
        } catch (e) {}
    }
    return tuning;
}

function getGrowthThresholdsForStage(stage) {
    const stageKey = GROWTH_STAGES[stage] ? stage : 'baby';
    const base = GROWTH_STAGES[stageKey];
    const tuning = getRetentionP1Tuning();
    const override = tuning && tuning.growthThresholds ? tuning.growthThresholds[stageKey] : null;
    return {
        actionsNeeded: Number.isFinite(override && override.actionsNeeded) ? Math.max(0, Number(override.actionsNeeded)) : base.actionsNeeded,
        hoursNeeded: Number.isFinite(override && override.hoursNeeded) ? Math.max(0, Number(override.hoursNeeded)) : base.hoursNeeded
    };
}

function getJourneyRewardPacingTable() {
    const base = JOURNEY_TOKEN_REWARD_TABLE || { chapterComplete: 4, objectiveComplete: 2, dailyComplete: 2, noveltyUnlock: 2 };
    const tuning = getRetentionP1Tuning();
    if (!tuning || !tuning.journeyRewardPacing) return base;
    return Object.assign({}, base, tuning.journeyRewardPacing);
}

const JOURNEY_TRACKS = {
    bond: { id: 'bond', label: 'Bond', icon: '💞' },
    mastery: { id: 'mastery', label: 'Mastery', icon: '🧠' },
    collection: { id: 'collection', label: 'Collection', icon: '📚' }
};

const JOURNEY_CHAPTERS = [
    {
        id: 'chapter1',
        label: 'Week 1: Settle In',
        dayStart: 1,
        dayEnd: 7,
        objectives: [
            { id: 'j_bond_1_feed', track: 'bond', metric: 'totalFeedCount', target: 6, tokenReward: 2, label: 'Feed your pet 6 times' },
            { id: 'j_bond_1_care', track: 'bond', metric: 'totalCareActions', target: 16, tokenReward: 2, label: 'Do 16 care actions' },
            { id: 'j_bond_1_daily', track: 'bond', metric: 'totalDailyCompletions', target: 1, tokenReward: 3, label: 'Complete 1 Daily checklist' },
            { id: 'j_mastery_1_games', track: 'mastery', metric: 'totalMinigamePlays', target: 4, tokenReward: 2, label: 'Play 4 mini-games' },
            { id: 'j_mastery_1_explore', track: 'mastery', metric: 'expeditionsCompleted', target: 1, tokenReward: 3, label: 'Complete 1 expedition' },
            { id: 'j_mastery_1_harvest', track: 'mastery', metric: 'totalHarvests', target: 1, tokenReward: 2, label: 'Harvest 1 crop' },
            { id: 'j_collection_1_codex', track: 'collection', metric: 'codexUnlockedCount', target: 2, tokenReward: 2, label: 'Unlock 2 codex species' },
            { id: 'j_collection_1_badge', track: 'collection', metric: 'badgeCount', target: 1, tokenReward: 2, label: 'Earn 1 badge' },
            { id: 'j_collection_1_sticker', track: 'collection', metric: 'stickerCount', target: 1, tokenReward: 2, label: 'Collect 1 sticker' }
        ],
        chapterReward: {
            tokens: 4,
            collectible: { type: 'sticker', id: 'sproutSticker' },
            story: 'Chapter complete: your pet now trusts your daily rhythm.'
        }
    },
    {
        id: 'chapter2',
        label: 'Week 2: Build Momentum',
        dayStart: 8,
        dayEnd: 14,
        objectives: [
            { id: 'j_bond_2_streak', track: 'bond', metric: 'streakCurrent', target: 7, tokenReward: 3, label: 'Reach a 7-day streak' },
            { id: 'j_bond_2_relation', track: 'bond', metric: 'maxRelationshipPoints', target: 70, tokenReward: 3, label: 'Reach 70 relationship points' },
            { id: 'j_bond_2_daily', track: 'bond', metric: 'totalDailyCompletions', target: 3, tokenReward: 3, label: 'Complete 3 Daily checklists' },
            { id: 'j_mastery_2_games', track: 'mastery', metric: 'totalMinigamePlays', target: 10, tokenReward: 2, label: 'Play 10 mini-games' },
            { id: 'j_mastery_2_explore', track: 'mastery', metric: 'expeditionsCompleted', target: 3, tokenReward: 3, label: 'Complete 3 expeditions' },
            { id: 'j_mastery_2_discovery', track: 'mastery', metric: 'discoveredBiomesCount', target: 3, tokenReward: 3, label: 'Discover 3 biomes' },
            { id: 'j_collection_2_badges', track: 'collection', metric: 'badgeCount', target: 3, tokenReward: 2, label: 'Earn 3 badges' },
            { id: 'j_collection_2_achievements', track: 'collection', metric: 'achievementCount', target: 4, tokenReward: 2, label: 'Unlock 4 achievements' },
            { id: 'j_collection_2_stickers', track: 'collection', metric: 'stickerCount', target: 3, tokenReward: 2, label: 'Collect 3 stickers' }
        ],
        chapterReward: {
            tokens: 5,
            collectible: { type: 'sticker', id: 'heartSticker' },
            story: 'Chapter complete: your pet starts anticipating your return.'
        }
    },
    {
        id: 'chapter3',
        label: 'Week 3: Deepen Mastery',
        dayStart: 15,
        dayEnd: 21,
        objectives: [
            { id: 'j_bond_3_actions', track: 'bond', metric: 'totalCareActions', target: 40, tokenReward: 3, label: 'Do 40 care actions' },
            { id: 'j_bond_3_xp', track: 'bond', metric: 'bondXp', target: 80, tokenReward: 3, label: 'Reach 80 Bond XP' },
            { id: 'j_bond_3_streak', track: 'bond', metric: 'streakCurrent', target: 14, tokenReward: 3, label: 'Reach a 14-day streak' },
            { id: 'j_mastery_3_harvest', track: 'mastery', metric: 'totalHarvests', target: 6, tokenReward: 2, label: 'Harvest 6 crops' },
            { id: 'j_mastery_3_expeditions', track: 'mastery', metric: 'expeditionsCompleted', target: 5, tokenReward: 3, label: 'Complete 5 expeditions' },
            { id: 'j_mastery_3_battles', track: 'mastery', metric: 'battleCount', target: 3, tokenReward: 3, label: 'Finish 3 arena battles' },
            { id: 'j_collection_3_badges', track: 'collection', metric: 'badgeCount', target: 5, tokenReward: 2, label: 'Earn 5 badges' },
            { id: 'j_collection_3_trophies', track: 'collection', metric: 'trophyCount', target: 2, tokenReward: 3, label: 'Earn 2 trophies' },
            { id: 'j_collection_3_species', track: 'collection', metric: 'codexUnlockedCount', target: 4, tokenReward: 3, label: 'Unlock 4 codex species' }
        ],
        chapterReward: {
            tokens: 6,
            collectible: { type: 'sticker', id: 'legendRibbon' },
            story: 'Chapter complete: your shared routines now feel like tradition.'
        }
    },
    {
        id: 'chapter4',
        label: 'Week 4: Legacy',
        dayStart: 22,
        dayEnd: 30,
        objectives: [
            { id: 'j_bond_4_daily', track: 'bond', metric: 'totalDailyCompletions', target: 7, tokenReward: 3, label: 'Complete 7 Daily checklists' },
            { id: 'j_bond_4_xp', track: 'bond', metric: 'bondXp', target: 140, tokenReward: 4, label: 'Reach 140 Bond XP' },
            { id: 'j_bond_4_streak', track: 'bond', metric: 'streakCurrent', target: 21, tokenReward: 4, label: 'Reach a 21-day streak' },
            { id: 'j_mastery_4_games', track: 'mastery', metric: 'totalMinigamePlays', target: 20, tokenReward: 3, label: 'Play 20 mini-games' },
            { id: 'j_mastery_4_expedition', track: 'mastery', metric: 'expeditionsCompleted', target: 8, tokenReward: 3, label: 'Complete 8 expeditions' },
            { id: 'j_mastery_4_discovery', track: 'mastery', metric: 'discoveredBiomesCount', target: 5, tokenReward: 3, label: 'Discover 5 biomes' },
            { id: 'j_collection_4_ach', track: 'collection', metric: 'achievementCount', target: 8, tokenReward: 3, label: 'Unlock 8 achievements' },
            { id: 'j_collection_4_badges', track: 'collection', metric: 'badgeCount', target: 7, tokenReward: 3, label: 'Earn 7 badges' },
            { id: 'j_collection_4_stickers', track: 'collection', metric: 'stickerCount', target: 6, tokenReward: 3, label: 'Collect 6 stickers' }
        ],
        chapterReward: {
            tokens: 8,
            collectible: { type: 'sticker', id: 'bloomCrest' },
            story: 'Chapter complete: your 30-day bond has become a lasting legacy.'
        }
    }
];

const JOURNEY_TOKEN_REWARD_TABLE = {
    chapterComplete: 4,
    objectiveComplete: 2,
    dailyComplete: 2,
    noveltyUnlock: 2
};

const BOND_XP_MILESTONES = [
    { level: 1, xp: 0, label: 'Acquainted', reward: { type: 'journal', text: 'Your pet begins recognizing your routine.' } },
    { level: 2, xp: 45, label: 'Trusted Friend', reward: { type: 'sticker', id: 'heartSticker' } },
    { level: 3, xp: 95, label: 'Steady Companion', reward: { type: 'journal', text: 'Your pet waits by the door when you are away.' } },
    { level: 4, xp: 160, label: 'Soul Partner', reward: { type: 'sticker', id: 'crownSticker' } }
];

const NOVELTY_SCHEDULE = {
    earlyUnlocks: [
        { id: 'novelty_day2', day: 2, title: 'Pet Dialogue Pack', subtitle: 'New playful dialogue lines unlocked.', reward: { type: 'journal', text: 'Your pet learned new ways to express affection.' } },
        { id: 'novelty_day4', day: 4, title: 'Story Snippet', subtitle: 'A memory page appears in your journal.', reward: { type: 'journal', text: 'You found a handwritten memory tucked into the diary.' } },
        { id: 'novelty_day6', day: 6, title: 'Cosmetic Drop', subtitle: 'A special sticker joins your collection.', reward: { type: 'sticker', id: 'sparkleSticker' } },
        { id: 'novelty_day8', day: 8, title: 'Codex Note', subtitle: 'A new codex hint appears.', reward: { type: 'journal', text: 'Codex update: hidden species clues were added.' } },
        { id: 'novelty_day10', day: 10, title: 'Biome Teaser', subtitle: 'A distant biome signal has appeared.', reward: { type: 'unlockBiome', biomeId: 'mountain' } },
        { id: 'novelty_day12', day: 12, title: 'Cosmetic Drop', subtitle: 'An event ribbon has arrived.', reward: { type: 'sticker', id: 'legendRibbon' } },
        { id: 'novelty_day14', day: 14, title: 'Dialogue Set', subtitle: 'Your pet unlocks comeback voice lines.', reward: { type: 'journal', text: 'Your pet now reacts more personally when you return.' } }
    ],
    weeklySpikes: [
        { id: 'spike_starlight', label: 'Starlight Week', icon: '🌌', reward: { type: 'sticker', id: 'moonCrest' } },
        { id: 'spike_blossom', label: 'Bloom Surge', icon: '🌸', reward: { type: 'sticker', id: 'bloomCrest' } },
        { id: 'spike_tidal', label: 'Tidal Echo', icon: '🌊', reward: { type: 'sticker', id: 'tideCrest' } }
    ]
};

const REACTIVATION_DIALOGUE = {
    generic: [
        'I missed our routine, but I saved your spot.',
        'You came back. I knew you would.',
        'Welcome home. We can pick up right where we left off.'
    ],
    awayBuckets: [
        { minDays: 1, lines: ['I noticed you were away yesterday. I am happy you are back.'] },
        { minDays: 3, lines: ['It felt quiet without you for a few days. Thank you for coming back.'] },
        { minDays: 7, lines: ['A whole week felt long. I held onto our memories for you.'] }
    ],
    byActivity: {
        expedition: 'The expedition gear is still packed. Want to head out again?',
        harvest: 'Your garden waited patiently. The crops look ready for us.',
        minigame: 'I kept thinking about our game streak. One more round?',
        daily: 'I saved your checklist rhythm. We can restart gently.',
        care: 'I missed our little care routine. It always made me feel safe.'
    }
};

const REMINDER_CENTER_CONFIG = {
    maxItems: 12,
    streakRiskHourLocal: 20,
    dedupePerDay: true
};

const STREAK_PRESTIGE_REWARDS = [
    { id: 'auroraLoop', label: 'Aurora Loop', icon: '🌌', collectible: { type: 'sticker', id: 'moonCrest' }, coins: 280, modifierId: 'luckyPaws' },
    { id: 'solarRelay', label: 'Solar Relay', icon: '🌞', collectible: { type: 'sticker', id: 'sunCrest' }, coins: 280, modifierId: 'careRush' },
    { id: 'tideRelay', label: 'Tide Relay', icon: '🌊', collectible: { type: 'sticker', id: 'tideCrest' }, coins: 280, modifierId: 'happyHour' },
    { id: 'springRelay', label: 'Spring Relay', icon: '🌸', collectible: { type: 'sticker', id: 'bloomCrest' }, coins: 280, modifierId: 'familyAura' }
];

function getStageWeightedPrestigeWeights(stage) {
    const stageKey = GROWTH_STAGES[stage] ? stage : 'baby';
    const tuning = getPhaseRewardTuning();
    return (tuning.prestigeWeightsByStage && tuning.prestigeWeightsByStage[stageKey]) || {};
}

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
        finaleReward: { bundleId: 'weeklyArcCare', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
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
        finaleReward: { bundleId: 'weeklyArcExplore', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
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
        finaleReward: { bundleId: 'weeklyArcExplore', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
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
        finaleReward: { bundleId: 'weeklyArcCompete', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
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
        finaleReward: { bundleId: 'weeklyArcCare', collectible: { type: 'sticker', id: 'legendRibbon' }, title: 'Arc Finale Prize' }
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

// ==================== PET COMPETITION SYSTEM ====================

// Battle moves available to all pets - damage scales with pet stats
const BATTLE_MOVES = {
    tackle: { name: 'Tackle', emoji: '💥', stat: 'energy', basePower: 12, description: 'A physical charge!' },
    charm: { name: 'Charm', emoji: '💖', stat: 'happiness', basePower: 10, description: 'Win them over with cuteness!' },
    splash: { name: 'Splash', emoji: '💦', stat: 'cleanliness', basePower: 8, description: 'A sparkling splash attack!' },
    snack: { name: 'Snack Attack', emoji: '🍪', stat: 'hunger', basePower: 14, description: 'Throw a tasty distraction!' },
    rest: { name: 'Rest', emoji: '💤', stat: 'energy', basePower: 0, heal: 15, description: 'Recover some HP!' }
};

// Pet type advantages for battles (rock-paper-scissors style bonuses)
const PET_TYPE_ADVANTAGES = {
    dog: ['cat', 'hamster'], cat: ['bird', 'fish'], bunny: ['frog', 'hedgehog'],
    bird: ['frog', 'bunny'], hamster: ['bunny', 'turtle'], turtle: ['hedgehog', 'hamster'],
    fish: ['turtle', 'frog'], frog: ['hamster', 'hedgehog'], hedgehog: ['cat', 'bird'],
    panda: ['dog', 'turtle'], penguin: ['fish', 'bird'],
    unicorn: ['dragon', 'panda'], dragon: ['penguin', 'hedgehog']
};

// Boss encounters - seasonal and special event bosses
const BOSS_ENCOUNTERS = {
    springBlossom: {
        name: 'Blossom Beast', emoji: '🌸👹', season: 'spring',
        type: 'frog',
        maxHP: 100, attack: 8, defense: 4,
        moves: [
            { name: 'Petal Storm', emoji: '🌸', power: 12, description: 'A flurry of petals!' },
            { name: 'Vine Whip', emoji: '🌿', power: 15, description: 'Tangling vines strike!' },
            { name: 'Pollen Cloud', emoji: '☁️', power: 8, healSelf: 10, description: 'Heals with pollen!' }
        ],
        rewards: { happiness: 20, sticker: 'cherryBlossom' },
        victoryMessage: 'The Blossom Beast scatters into flower petals!'
    },
    summerInferno: {
        name: 'Sun Scorcher', emoji: '☀️🔥', season: 'summer',
        type: 'dragon',
        maxHP: 120, attack: 10, defense: 3,
        moves: [
            { name: 'Heat Wave', emoji: '🔥', power: 14, description: 'Scorching heat!' },
            { name: 'Solar Beam', emoji: '☀️', power: 18, description: 'A concentrated beam of light!' },
            { name: 'Mirage', emoji: '🌊', power: 6, healSelf: 12, description: 'Confuses with illusions!' }
        ],
        rewards: { happiness: 25, energy: 15 },
        victoryMessage: 'The Sun Scorcher fizzles out like a sunset!'
    },
    autumnPhantom: {
        name: 'Harvest Phantom', emoji: '🎃👻', season: 'autumn',
        type: 'hedgehog',
        maxHP: 110, attack: 9, defense: 5,
        moves: [
            { name: 'Spooky Howl', emoji: '👻', power: 13, description: 'A chilling howl!' },
            { name: 'Pumpkin Bomb', emoji: '🎃', power: 16, description: 'Exploding pumpkins!' },
            { name: 'Shadow Mend', emoji: '🌑', power: 5, healSelf: 14, description: 'Heals in darkness!' }
        ],
        rewards: { happiness: 22, hunger: 20 },
        victoryMessage: 'The Harvest Phantom dissolves into autumn leaves!'
    },
    winterFrost: {
        name: 'Frost Giant', emoji: '❄️🧊', season: 'winter',
        type: 'penguin',
        maxHP: 130, attack: 7, defense: 7,
        moves: [
            { name: 'Blizzard', emoji: '🌨️', power: 12, description: 'A freezing storm!' },
            { name: 'Ice Crush', emoji: '🧊', power: 17, description: 'Massive ice blocks!' },
            { name: 'Snowfort', emoji: '⛄', power: 4, healSelf: 16, description: 'Builds icy defenses!' }
        ],
        rewards: { happiness: 22, energy: 20 },
        victoryMessage: 'The Frost Giant melts away into snowflakes!'
    },
    cosmicBeast: {
        name: 'Cosmic Beast', emoji: '🌟👾', season: null, // Special event boss (any season)
        type: 'unicorn',
        maxHP: 150, attack: 11, defense: 6,
        moves: [
            { name: 'Star Shower', emoji: '⭐', power: 15, description: 'Stars rain down!' },
            { name: 'Nebula Blast', emoji: '🌌', power: 20, description: 'A cosmic explosion!' },
            { name: 'Warp Heal', emoji: '🌀', power: 3, healSelf: 18, description: 'Warps space to heal!' }
        ],
        rewards: { happiness: 30, energy: 20, hunger: 15 },
        victoryMessage: 'The Cosmic Beast returns to the stars!'
    }
};

// Pet show categories for judging
const PET_SHOW_CATEGORIES = {
    care: { name: 'Care Quality', emoji: '💝', weight: 30, description: 'How well-cared-for is your pet?' },
    appearance: { name: 'Appearance', emoji: '✨', weight: 25, description: 'Style, pattern, and accessories!' },
    happiness: { name: 'Happiness', emoji: '😊', weight: 20, description: 'Is your pet happy and healthy?' },
    tricks: { name: 'Tricks', emoji: '🎪', weight: 15, description: 'Show off your pet\'s skills!' },
    bond: { name: 'Bond', emoji: '💖', weight: 10, description: 'The bond between you and your pet!' }
};

const PET_SHOW_RANKS = [
    { name: 'Participant', emoji: '🎗️', minScore: 0 },
    { name: 'Bronze', emoji: '🥉', minScore: 30 },
    { name: 'Silver', emoji: '🥈', minScore: 55 },
    { name: 'Gold', emoji: '🥇', minScore: 75 },
    { name: 'Champion', emoji: '🏆', minScore: 90 }
];

// Obstacle course stage definitions
const OBSTACLE_COURSE_STAGES = [
    { name: 'Hurdle Jump', emoji: '🏃', stat: 'energy', threshold: 40, points: 15, description: 'Jump over the hurdles!' },
    { name: 'Mud Pit', emoji: '🟫', stat: 'cleanliness', threshold: 35, points: 10, description: 'Splash through the mud!' },
    { name: 'Treat Trail', emoji: '🍖', stat: 'hunger', threshold: 30, points: 12, description: 'Follow the treat trail!' },
    { name: 'Tunnel Crawl', emoji: '🕳️', stat: 'energy', threshold: 50, points: 18, description: 'Crawl through the tunnel!' },
    { name: 'Balance Beam', emoji: '🤸', stat: 'happiness', threshold: 45, points: 20, description: 'Walk the balance beam!' },
    { name: 'Water Splash', emoji: '💦', stat: 'cleanliness', threshold: 40, points: 15, description: 'Swim through the water!' },
    { name: 'Cheer Crowd', emoji: '👏', stat: 'happiness', threshold: 55, points: 22, description: 'Win the crowd\'s cheers!' },
    { name: 'Sprint Finish', emoji: '🏁', stat: 'energy', threshold: 60, points: 25, description: 'Race to the finish!' }
];

// Rival pet trainers with escalating difficulty
const RIVAL_TRAINERS = [
    {
        name: 'Timmy', emoji: '👦', title: 'Beginner Trainer',
        petType: 'hamster', petName: 'Nibbles',
        stats: { hunger: 50, cleanliness: 45, happiness: 55, energy: 50 },
        difficulty: 1, battleHP: 40,
        winMessage: 'Wow, you\'re really good!', loseMessage: 'Nibbles is the best!'
    },
    {
        name: 'Lily', emoji: '👧', title: 'Junior Trainer',
        petType: 'bunny', petName: 'Cotton',
        stats: { hunger: 55, cleanliness: 55, happiness: 60, energy: 55 },
        difficulty: 2, battleHP: 50,
        winMessage: 'Cotton did great, but you were better!', loseMessage: 'Cotton hops to victory!'
    },
    {
        name: 'Max', emoji: '🧑', title: 'Skilled Trainer',
        petType: 'dog', petName: 'Rex',
        stats: { hunger: 65, cleanliness: 60, happiness: 65, energy: 70 },
        difficulty: 3, battleHP: 60,
        winMessage: 'Impressive skills! Rex respects you.', loseMessage: 'Rex is unstoppable!'
    },
    {
        name: 'Sara', emoji: '👩', title: 'Expert Trainer',
        petType: 'cat', petName: 'Shadow',
        stats: { hunger: 70, cleanliness: 70, happiness: 75, energy: 65 },
        difficulty: 4, battleHP: 70,
        winMessage: 'Shadow acknowledges your skill!', loseMessage: 'Shadow was too sly!'
    },
    {
        name: 'Prof. Oak', emoji: '🧓', title: 'Veteran Trainer',
        petType: 'turtle', petName: 'Ancient',
        stats: { hunger: 75, cleanliness: 75, happiness: 70, energy: 75 },
        difficulty: 5, battleHP: 80,
        winMessage: 'Magnificent! Ancient bows to you.', loseMessage: 'Ancient is unshakable!'
    },
    {
        name: 'Luna', emoji: '🧙‍♀️', title: 'Mystic Trainer',
        petType: 'unicorn', petName: 'Starlight',
        stats: { hunger: 80, cleanliness: 85, happiness: 85, energy: 80 },
        difficulty: 6, battleHP: 90,
        winMessage: 'The stars align for you!', loseMessage: 'Starlight shines too bright!'
    },
    {
        name: 'Drake', emoji: '🐲', title: 'Champion Trainer',
        petType: 'dragon', petName: 'Inferno',
        stats: { hunger: 90, cleanliness: 80, happiness: 90, energy: 90 },
        difficulty: 7, battleHP: 100,
        winMessage: 'You are the true champion!', loseMessage: 'Inferno reigns supreme!'
    }
];

function getGardenPlotCapacity(expansionTier) {
    const tiers = Array.isArray(GARDEN_EXPANSION_TIERS) ? GARDEN_EXPANSION_TIERS : [];
    const tier = Math.max(0, Math.floor(typeof expansionTier === 'number' ? expansionTier : 0));
    let capacity = GARDEN_BASE_PLOTS;
    for (let i = 0; i < tier && i < tiers.length; i++) {
        capacity += Math.max(0, Number(tiers[i].additionalPlots) || 0);
    }
    // Report #8: Prestige garden expansion adds permanent plot capacity.
    const owned = (typeof gameState !== 'undefined' && gameState && gameState._prestigeOwned) ? gameState._prestigeOwned : null;
    if (owned && owned.gardenExpansion > 0 && PRESTIGE_EFFECTS.gardenExpansion) {
        capacity += Math.max(0, Number(PRESTIGE_EFFECTS.gardenExpansion.extraGardenPlots) || 0);
    }
    return Math.min(MAX_GARDEN_PLOTS, capacity);
}

function getUnlockedPlotCount(totalHarvests, expansionTier) {
    const harvests = typeof totalHarvests === 'number' ? totalHarvests : 0;
    let resolvedExpansionTier = expansionTier;
    if (typeof resolvedExpansionTier !== 'number' && typeof gameState !== 'undefined' && gameState && gameState.garden) {
        resolvedExpansionTier = gameState.garden.expansionTier;
    }
    const plotCapacity = getGardenPlotCapacity(typeof resolvedExpansionTier === 'number' ? resolvedExpansionTier : 0);
    let unlocked = 0;
    for (let i = 0; i < GARDEN_PLOT_UNLOCK_THRESHOLDS.length; i++) {
        if (i >= plotCapacity) break;
        if (harvests >= GARDEN_PLOT_UNLOCK_THRESHOLDS[i]) {
            unlocked = i + 1;
        } else {
            break;
        }
    }
    return Math.min(unlocked, plotCapacity);
}

// ==================== BREEDING & GENETICS SYSTEM ====================

const BREEDING_CONFIG = {
    minAge: 'adult',                // Both pets must be adult stage
    minRelationship: 'friend',      // Minimum relationship level between parents
    cooldownMs: 30 * 60 * 1000,     // 30-minute cooldown between breedings per pet
    maxBreedingEggs: 2,             // Maximum incubating eggs at once
    mutationChance: 0.08,           // 8% chance of a mutation per breeding
    hybridChance: 0.35,             // 35% chance of hybrid when different species breed
    incubationBaseTicks: 20,        // Base ticks needed to hatch (1 tick per minute)
    statInheritanceNoise: 10,       // +/- random noise when inheriting hidden stats
    colorBlendChance: 0.6,          // 60% chance of color blending vs picking one parent's color
    patternInheritChance: 0.5       // 50/50 chance of inheriting either parent's pattern
};

// Hidden genetic stats that pass from parent to offspring
// These affect growth speed, care sensitivity, and competition potential
const GENETIC_STATS = {
    vigor: { label: 'Vigor', emoji: '💪', description: 'Growth speed and energy recovery', min: 1, max: 20, default: 10 },
    charm: { label: 'Charm', emoji: '💫', description: 'Happiness gain and show appeal', min: 1, max: 20, default: 10 },
    resilience: { label: 'Resilience', emoji: '🛡️', description: 'Slower stat decay and neglect resistance', min: 1, max: 20, default: 10 },
    appetite: { label: 'Appetite', emoji: '🍽️', description: 'Food efficiency and hunger decay rate', min: 1, max: 20, default: 10 }
};

// Mutation color palettes - rare colors not normally available
const MUTATION_COLORS = {
    prismatic: { name: 'Prismatic', hex: '#FF69B4', description: 'A shimmering rainbow hue' },
    ghostly: { name: 'Ghostly', hex: '#E8E8FF', description: 'An ethereal pale glow' },
    golden: { name: 'Golden', hex: '#FFD700', description: 'A radiant golden sheen' },
    obsidian: { name: 'Obsidian', hex: '#1C1C2E', description: 'Deep dark with purple undertones' },
    celestial: { name: 'Celestial', hex: '#7B68EE', description: 'A starry purple shimmer' },
    ember: { name: 'Ember', hex: '#FF4500', description: 'Glowing orange-red like hot coals' },
    frosted: { name: 'Frosted', hex: '#B0E0E6', description: 'Icy blue with white accents' },
    jade: { name: 'Jade', hex: '#00A86B', description: 'A deep polished green' }
};

// Mutation patterns - rare patterns not normally available
const MUTATION_PATTERNS = {
    galaxy: { name: 'Galaxy', description: 'Swirling cosmic patterns' },
    crystalline: { name: 'Crystalline', description: 'Geometric crystal facets' },
    flame: { name: 'Flame', description: 'Flickering fire-like markings' },
    floral: { name: 'Floral', description: 'Delicate flower patterns' }
};

// Hybrid pet types - created by breeding two different species
const HYBRID_PET_TYPES = {
    pegasus: {
        name: 'Pegasus',
        emoji: '🪽',
        parents: ['unicorn', 'bird'],
        colors: ['#E6E6FA', '#FFB6C1', '#87CEEB', '#F0E68C', '#DDA0DD'],
        sounds: ['*majestic whinny*', '*wing flutter*', '*magical chirp*'],
        happySounds: ['Soaring high!', 'Rainbow flight!', 'Magical wings!'],
        sadSounds: ['Drooping wings...', 'Quiet whinny...'],
        mythical: true,
        hybrid: true,
        description: 'A magical winged horse born from unicorn and bird'
    },
    kirin: {
        name: 'Kirin',
        emoji: '🦌',
        parents: ['dragon', 'unicorn'],
        colors: ['#FFD700', '#DC143C', '#DDA0DD', '#FF6347', '#E6E6FA'],
        sounds: ['*mystical roar*', '*ethereal bell*', '*gentle flame*'],
        happySounds: ['Blazing sparkles!', 'Mystical dance!', 'Radiant glow!'],
        sadSounds: ['Fading glow...', 'Quiet chime...'],
        mythical: true,
        hybrid: true,
        description: 'A mythical creature of fire and magic'
    },
    catbird: {
        name: 'Gryphkitten',
        emoji: '🐱',
        parents: ['cat', 'bird'],
        colors: ['#FFA500', '#FFD700', '#808080', '#87CEEB', '#DEB887'],
        sounds: ['Meow-tweet!', '*purring chirp*', 'Mew-whistle!'],
        happySounds: ['Pounce-flutter!', 'Happy soaring purr!', 'Feathered bounce!'],
        sadSounds: ['Quiet mew-chirp...', 'Droopy feathers...'],
        mythical: false,
        hybrid: true,
        description: 'A fluffy feline with tiny wings'
    },
    turtlefrog: {
        name: 'Shellhopper',
        emoji: '🐸',
        parents: ['turtle', 'frog'],
        colors: ['#228B22', '#32CD32', '#6B8E23', '#8FBC8F', '#00FA9A'],
        sounds: ['Ribbit-bonk!', '*shell hop*', 'Croak-clonk!'],
        happySounds: ['Armored hop!', 'Shell spin!', 'Bouncy shell!'],
        sadSounds: ['Slow shell drag...', 'Quiet croak...'],
        mythical: false,
        hybrid: true,
        description: 'A hopping amphibian with a protective shell'
    },
    bundgehog: {
        name: 'Fuzzspike',
        emoji: '🦔',
        parents: ['bunny', 'hedgehog'],
        colors: ['#FFFFFF', '#D4A574', '#8B7355', '#FFB6C1', '#D2B48C'],
        sounds: ['Hop-snuffle!', '*wiggle bounce*', 'Squeak-thump!'],
        happySounds: ['Spiky binky!', 'Fuzzy roll!', 'Bouncy snuffle!'],
        sadSounds: ['Curled and quiet...', 'Slow hop-snuffle...'],
        mythical: false,
        hybrid: true,
        description: 'A fluffy bunny with tiny protective spikes'
    },
    pandapenguin: {
        name: 'Snowpanda',
        emoji: '🐼',
        parents: ['panda', 'penguin'],
        colors: ['#FFFFFF', '#2F4F4F', '#F5F5F5', '#333333', '#FAEBD7'],
        sounds: ['*waddle munch*', '*slide and roll*', 'Honk-squeak!'],
        happySounds: ['Belly slide!', 'Snow roll!', 'Bamboo dance!'],
        sadSounds: ['Slow waddle...', 'Quiet munch...'],
        mythical: false,
        hybrid: true,
        description: 'A roly-poly bear that loves ice and bamboo'
    },
    dogfish: {
        name: 'Splashpup',
        emoji: '🐕',
        parents: ['dog', 'fish'],
        colors: ['#D4A574', '#4169E1', '#FFD700', '#87CEEB', '#00CED1'],
        sounds: ['Bark-blub!', '*splash woof*', 'Woof-bubble!'],
        happySounds: ['Splashing fetch!', 'Wave riding!', 'Bubble bark!'],
        sadSounds: ['Slow paddle...', 'Quiet blub-whimper...'],
        mythical: false,
        hybrid: true,
        description: 'An aquatic puppy with fins and a wagging tail'
    },
    hamsterbird: {
        name: 'Fluffwing',
        emoji: '🐹',
        parents: ['hamster', 'bird'],
        colors: ['#D4A574', '#FFD700', '#F5DEB3', '#87CEEB', '#FFE4C4'],
        sounds: ['Squeak-tweet!', '*flutter nibble*', 'Chirp-scurry!'],
        happySounds: ['Wheel-flight!', 'Seed shower!', 'Tiny soar!'],
        sadSounds: ['Quiet flutter...', 'Slow nibble...'],
        mythical: false,
        hybrid: true,
        description: 'A tiny hamster with delicate feathered wings'
    },
    dragonturtle: {
        name: 'Dracoturtle',
        emoji: '🐉',
        parents: ['dragon', 'turtle'],
        colors: ['#DC143C', '#228B22', '#8B0000', '#556B2F', '#FF4500'],
        sounds: ['*fire hiss*', '*shell rumble*', 'Rawr-bonk!'],
        happySounds: ['Flame shell!', 'Lava waddle!', 'Fire fortress!'],
        sadSounds: ['Smoke sigh...', 'Shell retreat...'],
        mythical: true,
        hybrid: true,
        description: 'An armored dragon with a fire-proof shell'
    }
};

// Map of parent type pairs to their hybrid result
// Both orderings map to the same hybrid
const HYBRID_LOOKUP = {};
(function buildHybridLookup() {
    for (const [hybridId, data] of Object.entries(HYBRID_PET_TYPES)) {
        const [p1, p2] = data.parents;
        HYBRID_LOOKUP[`${p1}-${p2}`] = hybridId;
        HYBRID_LOOKUP[`${p2}-${p1}`] = hybridId;
    }
})();

// Hybrids inherit combined type advantages from their parent species.
(function applyHybridTypeAdvantages() {
    for (const [hybridId, data] of Object.entries(HYBRID_PET_TYPES)) {
        const combined = new Set();
        (data.parents || []).forEach((parentType) => {
            (PET_TYPE_ADVANTAGES[parentType] || []).forEach((targetType) => combined.add(targetType));
        });
        PET_TYPE_ADVANTAGES[hybridId] = [...combined];
    }
})();

// Incubation room bonuses - certain rooms speed up or add benefits
const INCUBATION_ROOM_BONUSES = {
    bedroom: { speedMultiplier: 1.3, bonusStat: 'vigor', label: 'Cozy warmth (+30% speed, +Vigor)' },
    kitchen: { speedMultiplier: 1.1, bonusStat: 'appetite', label: 'Warm kitchen (+10% speed, +Appetite)' },
    bathroom: { speedMultiplier: 1.0, bonusStat: 'resilience', label: 'Humid air (+Resilience)' },
    backyard: { speedMultiplier: 1.2, bonusStat: 'vigor', label: 'Fresh air (+20% speed, +Vigor)' },
    park: { speedMultiplier: 1.0, bonusStat: 'charm', label: 'Natural setting (+Charm)' },
    garden: { speedMultiplier: 1.15, bonusStat: 'resilience', label: 'Garden warmth (+15% speed, +Resilience)' }
};

// Care actions that benefit incubating eggs
const INCUBATION_CARE_BONUSES = {
    cuddle: { tickBonus: 2, description: 'Cuddling the egg warms it up!' },
    sleep: { tickBonus: 1, description: 'Resting near the egg is soothing.' },
    play: { tickBonus: 1, description: 'The egg responds to playful energy!' }
};

// Get the hybrid type for two parent types, or null if no hybrid exists
function getHybridForParents(type1, type2) {
    return HYBRID_LOOKUP[`${type1}-${type2}`] || null;
}

// Check if a pet type is a hybrid
function isHybridType(type) {
    return !!HYBRID_PET_TYPES[type];
}

// Get all pet type data (including hybrids)
function getAllPetTypeData(type) {
    return PET_TYPES[type] || HYBRID_PET_TYPES[type] || null;
}

// ==================== PERSONALITY SYSTEM ====================

const PERSONALITY_TRAITS = {
    lazy: {
        label: 'Lazy',
        emoji: '😴',
        description: 'Loves napping and prefers slow activities',
        statModifiers: {
            energyDecayMultiplier: 0.7,      // Energy decays slower (conserves it)
            happinessDecayMultiplier: 0.9,
            hungerDecayMultiplier: 1.2,       // Gets hungry faster (snacking)
            cleanlinessDecayMultiplier: 1.1
        },
        careModifiers: {
            sleep: 1.4,    // Sleeps more effectively
            cuddle: 1.2,
            exercise: 0.7, // Doesn't enjoy exercise as much
            play: 0.8
        },
        relationshipModifier: 1.0,
        speechMessages: [
            "*yawns*", "Five more minutes...", "Too comfy to move...",
            "Nap time?", "I'll do it later...", "Zzz... oh, hi!",
            "*stretches lazily*", "This spot is perfect..."
        ],
        thoughtMessages: [
            "wants to nap...", "is feeling sleepy...", "dreams of a cozy bed..."
        ],
        idleBehavior: 'yawn'
    },
    energetic: {
        label: 'Energetic',
        emoji: '⚡',
        description: 'Always on the go, needs lots of activity',
        statModifiers: {
            energyDecayMultiplier: 1.3,       // Burns energy faster
            happinessDecayMultiplier: 1.2,     // Gets bored faster
            hungerDecayMultiplier: 1.3,        // Needs more food
            cleanlinessDecayMultiplier: 1.2
        },
        careModifiers: {
            exercise: 1.5,  // Loves exercise!
            play: 1.4,
            sleep: 0.7,     // Too wired to sleep well
            cuddle: 0.8
        },
        relationshipModifier: 1.2,
        speechMessages: [
            "LET'S GO!", "Can't sit still!", "ZOOM ZOOM!",
            "Race you!", "More! More! More!", "I have SO much energy!",
            "*bouncing around*", "What's next?!"
        ],
        thoughtMessages: [
            "wants to run!", "needs to play!", "is bursting with energy!"
        ],
        idleBehavior: 'bounce'
    },
    curious: {
        label: 'Curious',
        emoji: '🔍',
        description: 'Loves exploring and discovering new things',
        statModifiers: {
            energyDecayMultiplier: 1.1,
            happinessDecayMultiplier: 1.1,
            hungerDecayMultiplier: 1.0,
            cleanlinessDecayMultiplier: 1.2    // Gets dirty from exploring
        },
        careModifiers: {
            play: 1.3,
            exercise: 1.2,
            groom: 0.9,
            wash: 0.9
        },
        relationshipModifier: 1.3,             // Curious pets bond faster
        speechMessages: [
            "What's that?!", "Ooh, shiny!", "Let me see!",
            "*sniffs everything*", "I wonder...", "There's something over there!",
            "*investigates*", "What does this do?"
        ],
        thoughtMessages: [
            "sees something interesting!", "wants to explore!", "is investigating..."
        ],
        idleBehavior: 'sniff'
    },
    shy: {
        label: 'Shy',
        emoji: '🙈',
        description: 'Takes time to warm up but forms deep bonds',
        statModifiers: {
            energyDecayMultiplier: 0.9,
            happinessDecayMultiplier: 1.1,
            hungerDecayMultiplier: 0.9,
            cleanlinessDecayMultiplier: 0.9
        },
        careModifiers: {
            cuddle: 1.4,     // Loves gentle affection
            sleep: 1.2,
            play: 0.8,       // Overwhelmed by play
            exercise: 0.7    // Too many stimuli
        },
        relationshipModifier: 0.6,              // Takes longer to warm up
        speechMessages: [
            "*peeks out*", "H-hi...", "*hides behind you*",
            "Is it safe?", "*quiet squeak*", "Stay close, okay?",
            "*timid wave*", "I trust you..."
        ],
        thoughtMessages: [
            "is feeling nervous...", "wants to hide...", "needs comfort..."
        ],
        idleBehavior: 'hide'
    },
    playful: {
        label: 'Playful',
        emoji: '🎪',
        description: 'Everything is a game! Mischievous and fun-loving',
        statModifiers: {
            energyDecayMultiplier: 1.2,
            happinessDecayMultiplier: 1.3,     // Needs constant stimulation
            hungerDecayMultiplier: 1.1,
            cleanlinessDecayMultiplier: 1.2
        },
        careModifiers: {
            play: 1.5,       // Play is life!
            treat: 1.3,      // Loves treats
            exercise: 1.2,
            groom: 0.7       // Can't sit still for grooming
        },
        relationshipModifier: 1.4,
        speechMessages: [
            "Catch me!", "Tag, you're it!", "*mischievous grin*",
            "Play play play!", "Wheee!", "Again again!",
            "*does a trick*", "Watch this!"
        ],
        thoughtMessages: [
            "wants to play!", "needs a game!", "is feeling mischievous..."
        ],
        idleBehavior: 'wiggle'
    },
    grumpy: {
        label: 'Grumpy',
        emoji: '😤',
        description: 'Has a tough exterior but secretly loves attention',
        statModifiers: {
            energyDecayMultiplier: 0.8,
            happinessDecayMultiplier: 1.3,     // Hard to keep happy
            hungerDecayMultiplier: 1.0,
            cleanlinessDecayMultiplier: 0.8
        },
        careModifiers: {
            feed: 1.3,       // Food is the way to a grumpy pet's heart
            treat: 1.5,      // REALLY loves treats
            cuddle: 0.6,     // Acts like it doesn't want cuddles
            play: 0.8,
            sleep: 1.2
        },
        relationshipModifier: 0.7,
        speechMessages: [
            "Hmph!", "*grumbles*", "Leave me alone... (but not really)",
            "Whatever.", "*side-eye*", "I guess that's okay...",
            "*reluctant purr*", "Don't touch my stuff."
        ],
        thoughtMessages: [
            "is being grumpy...", "wants to be left alone (maybe)...", "secretly wants attention..."
        ],
        idleBehavior: 'grumble'
    }
};

const PERSONALITY_LIST = Object.keys(PERSONALITY_TRAITS);

function getRandomPersonality() {
    return PERSONALITY_LIST[Math.floor(Math.random() * PERSONALITY_LIST.length)];
}

// ==================== PET FAVORITES & FEARS ====================

// Each pet type has favorite foods, activities, and things they fear/dislike
const PET_PREFERENCES = {
    dog: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Cookie',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    cat: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Ice Cream',
        fear: 'exercise',
        fearLabel: '🏃 Exercise',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bunny: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Honey',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bird: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cookie',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hamster: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Wheel!)',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    turtle: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    fish: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Candy',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    frog: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Hopping!)',
        favoriteTreat: 'Candy',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'carrot',
        dislikedFoodLabel: '🥕 Carrots',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hedgehog: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    panda: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    penguin: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Sliding!)',
        favoriteTreat: 'Ice Cream',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    unicorn: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cupcake',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dragon: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Donut',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'strawberry',
        dislikedFoodLabel: '🍓 Strawberries',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    // Hybrid types — inherit preferences from parent types
    pegasus: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cupcake',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    kirin: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Cupcake',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'strawberry',
        dislikedFoodLabel: '🍓 Strawberries',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    catbird: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Cookie',
        fear: 'exercise',
        fearLabel: '🏃 Exercise',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    turtlefrog: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bundgehog: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Honey',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    pandapenguin: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Sliding!)',
        favoriteTreat: 'Ice Cream',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dogfish: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hamsterbird: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Wheel!)',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dragonturtle: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Donut',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    }
};

// Get preference modifiers for a care action
function getPreferenceModifier(pet, action, cropId) {
    const prefs = PET_PREFERENCES[pet.type];
    if (!prefs) return 1.0;

    // Check if this is a favorite activity
    if (action === prefs.favoriteActivity) {
        return prefs.bonusMultiplier;
    }

    // Check if this is a feared activity
    if (action === prefs.fear) {
        return prefs.penaltyMultiplier;
    }

    // Check food preferences for feed actions
    if (action === 'feed' && cropId) {
        if (cropId === prefs.favoriteFood) {
            return prefs.bonusMultiplier;
        }
        if (cropId === prefs.dislikedFood) {
            return prefs.penaltyMultiplier;
        }
    }

    // Check treat preferences
    if (action === 'treat') {
        // Treat name is checked elsewhere
        return 1.0;
    }

    return 1.0;
}

// ==================== ELDER GROWTH STAGE ====================

const ELDER_CONFIG = {
    hoursNeeded: getGrowthThresholdsForStage('elder').hoursNeeded,
    actionsNeeded: getGrowthThresholdsForStage('elder').actionsNeeded,
    wisdomBonusBase: 10,     // Base wisdom bonus for stat gains
    wisdomDecayReduction: 0.8, // 20% slower stat decay
    wisdomRelationshipBonus: 1.5, // 50% faster relationship building
    elderAccessories: ['glasses', 'topHat'] // Accessories unlocked at elder
};

// ==================== PET MEMORIAL SYSTEM ====================

const MEMORIAL_CONFIG = {
    maxMemorials: 20,      // Maximum memorials stored
    retirementMinAge: 12,  // Minimum 12 hours old to retire honorably
    retirementAllowedStages: ['adult', 'elder']
};

const MEMORIAL_TITLES = {
    elder: '🏛️ Wise Elder',
    evolved: '✨ Transcended',
    excellent: '🌟 Beloved',
    adult: '⭐ Cherished',
    child: '🌱 Young Heart',
    baby: '🍼 Little Angel'
};

function getMemorialTitle(pet) {
    if (pet.growthStage === 'elder') return MEMORIAL_TITLES.elder;
    if (pet.evolutionStage === 'evolved') return MEMORIAL_TITLES.evolved;
    if (pet.careQuality === 'excellent') return MEMORIAL_TITLES.excellent;
    if (pet.growthStage === 'adult') return MEMORIAL_TITLES.adult;
    if (pet.growthStage === 'child') return MEMORIAL_TITLES.child;
    return MEMORIAL_TITLES.baby;
}

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
    const basePool = Array.isArray(pool) ? pool.map((text, idx) => ({ id: `base_${biomeId}_${idx + 1}`, text })) : [];
    let combinedPool = basePool;
    if (typeof getPackedBiomeEvents === 'function') {
        const packedEvents = getPackedBiomeEvents('event', biomeId)
            .map((entry, idx) => ({ id: entry.id || `pack_${biomeId}_${idx + 1}`, text: entry.text || entry.message || '' }))
            .filter((entry) => entry.text);
        if (packedEvents.length > 0) combinedPool = basePool.concat(packedEvents);
    }
    if (!combinedPool || combinedPool.length === 0) return null;
    const picked = (typeof chooseRotatingContentWithHistory === 'function')
        ? chooseRotatingContentWithHistory(combinedPool, {
            scope: 'exploration',
            key: `narrative:${biomeId}`,
            idKey: 'id',
            recentWindow: 6,
            state: (typeof gameState !== 'undefined' ? gameState : null)
        })
        : combinedPool[Math.floor(Math.random() * combinedPool.length)];
    const msg = (picked && picked.text) ? picked.text : (combinedPool[0] && combinedPool[0].text) || '';
    return String(msg).replace(/\{name\}/g, petName || 'Your pet');
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

// Pack bridge: expose core mutable content tables on `window` so additive pack data
// can merge into the existing runtime without refactoring legacy constants modules.
if (typeof window !== "undefined") {
    Object.assign(window, {
        PET_TYPES,
        ROOMS,
        FURNITURE,
        ROOM_THEMES,
        ROOM_FURNITURE_ITEMS,
        EXPLORATION_BIOMES,
        BIOME_LOOT_POOLS,
        EXPLORATION_LOOT,
        DAILY_FIXED_TASKS,
        DAILY_MODE_TASKS,
        DAILY_WILDCARD_TASKS,
        DAILY_TASKS,
        REWARD_MODIFIERS,
        REWARD_BUNDLES,
        PROGRESSION_REWARD_TUNING,
        BADGES,
        STICKERS,
        TROPHIES,
        WEEKLY_THEMED_ARCS,
        PET_TYPE_ADVANTAGES,
        BOSS_ENCOUNTERS,
        RIVAL_TRAINERS,
        MUTATION_COLORS,
        MUTATION_PATTERNS,
        HYBRID_PET_TYPES,
        HYBRID_LOOKUP
    });
}
