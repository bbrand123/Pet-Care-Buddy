// ==================== GAME BALANCE & CONFIGURATION ====================
// Centralizes magic numbers and configuration constants scattered across the codebase.
// Loaded after utils.js but before other game files.

/**
 * All game balance tuning values organized by system.
 * @type {Readonly<Object>}
 */
const GAME_BALANCE = Object.freeze({
    economy: {
        startingCoins: 240,
        starterSeeds: { carrot: 4, tomato: 3, strawberry: 2 }
    },
    timing: {
        /** Dungeon room cooldown in ms */
        dungeonRoomCooldownMs: 18000,
        /** Weather change check interval in ms (5 minutes) */
        weatherChangeIntervalMs: 300000,
        /** Treasure search cooldown in ms */
        treasureCooldownMs: 90000,
        /** NPC befriend cooldown in ms */
        npcBefriendCooldownMs: 8000,
        /** Care action button cooldown in ms */
        actionCooldownMs: 600,
        /** Save indicator display duration in ms */
        saveIndicatorMs: 1500,
        /** Confetti display duration in ms */
        confettiDurationMs: 3000,
        /** High score banner duration in ms */
        highScoreBannerMs: 2500,
        /** Room bonus toast limit per session per room */
        maxRoomBonusToasts: 3
    },
    combat: {
        /** Power normalization divisor */
        powerNormDivisor: 72,
        /** Power norm min clamp */
        powerNormMin: 0.45,
        /** Power norm max clamp */
        powerNormMax: 1.6,
        /** Power dampening base */
        powerDampBase: 1.08,
        /** Power dampening factor */
        powerDampFactor: 0.24,
        /** Power dampening minimum */
        powerDampMin: 0.85,
        /** Difficulty weight base */
        difficultyWeightBase: 0.92,
        /** Difficulty weight factor */
        difficultyWeightFactor: 0.22,
        /** Difficulty weight min clamp */
        difficultyWeightMin: 0.88,
        /** Difficulty weight max clamp */
        difficultyWeightMax: 1.24,
        /** Reward multiplier min clamp */
        rewardMultMin: 0.8,
        /** Reward multiplier max clamp */
        rewardMultMax: 1.3,
        /** Damage variance minimum (0.85 = -15%) */
        damageVarianceMin: 0.85,
        /** Damage variance range (0.3 gives +15%) */
        damageVarianceRange: 0.3,
        /** Type advantage damage multiplier */
        typeAdvantageMultiplier: 1.3,
        /** AI heal threshold (fraction of max HP) */
        aiHealThreshold: 0.3,
        /** AI heal probability */
        aiHealProbability: 0.6
    },
    petCare: {
        /** Base stat gain from care actions (before modifiers) */
        baseCareBonus: 17,
        /** NPC encounter probability during expedition */
        npcEncounterChance: 0.32,
        /** Max NPC encounters stored */
        maxNpcEncounters: 12,
        /** Max expedition history entries */
        maxExpeditionHistory: 15,
        /** Happiness gain from completed expedition */
        expeditionHappinessGain: 10,
        /** Energy cost from completed expedition */
        expeditionEnergyCost: 6,
        /** Minimum energy required for dungeon */
        dungeonMinEnergy: 8,
        /** Score history entries kept per minigame */
        scoreHistoryLength: 3,
        /** Needs attention threshold (stat value below this triggers warning dot) */
        needsAttentionThreshold: 30,
        /** Pet name max length */
        petNameMaxLength: 14,
        /** NPC bond threshold for adoption */
        npcBondAdoptionThreshold: 100,
        /** Max friend bond points */
        maxRelationshipPoints: 300
    },
    minigames: {
        /** Difficulty increase per replay (10% = 0.08 now) */
        replayDifficultyStep: 0.08,
        /** Max replays that affect difficulty */
        maxReplayDifficultyPlays: 8,
        /** Overall difficulty min cap */
        difficultyMin: 0.65,
        /** Overall difficulty max cap */
        difficultyMax: 1.85,
        /** Ease multiplier min */
        easeMultMin: 0.82,
        /** Ease multiplier max */
        easeMultMax: 1.12,
        /** Ease multiplier range */
        easeMultRange: 0.3,
        /** Emoji burst particle count (normal) */
        emojiBurstCount: 6,
        /** Emoji burst particle count (busy UI) */
        emojiBurstCountBusy: 4,
        /** Emoji burst particle lifetime in ms */
        emojiBurstLifetimeMs: 1200,
        /** Confetti piece count */
        confettiPieceCount: 30,
        /** Racing lane count (0-indexed) */
        racingMaxLane: 2
    },
    sound: {
        /** Bathroom bubble delay base in ms */
        bubbleDelayBase: 200,
        /** Bathroom bubble delay variance in ms */
        bubbleDelayVariance: 500,
        /** Garden chime delay base in ms */
        chimeDelayBase: 800,
        /** Garden chime delay variance in ms */
        chimeDelayVariance: 1500,
        /** Earcon volume (30% to not interfere with screen readers) */
        earconVolume: 0.3,
        /** Fade duration in seconds */
        fadeDuration: 0.8,
        /** Loop duration in seconds */
        loopDuration: 2.5
    },
    growth: {
        /** Quality boost base for growth calculations */
        qualityBoostBase: 0.92,
        /** Quality boost factor */
        qualityBoostFactor: 0.24,
        /** Time weighting base */
        timeWeightBase: 0.96,
        /** Time weighting factor */
        timeWeightFactor: 0.45
    }
});

/**
 * All localStorage and sessionStorage keys used by the app.
 * @type {Readonly<Object>}
 */
const STORAGE_KEYS = Object.freeze({
    /** Main game save data */
    gameSave: 'myLittleFriend',
    /** Sound enabled toggle */
    soundEnabled: 'myLittleFriend_soundEnabled',
    /** Music enabled toggle */
    musicEnabled: 'myLittleFriend_musicEnabled',
    /** SFX volume (0-1) */
    sfxVolume: 'myLittleFriend_sfxVolume',
    /** Ambient volume (0-1) */
    ambientVolume: 'myLittleFriend_ambientVolume',
    /** Music volume (0-1) */
    musicVolume: 'myLittleFriend_musicVolume',
    /** Sample pack enabled toggle */
    samplePackEnabled: 'myLittleFriend_samplePackEnabled',
    /** UI theme (light/dark) */
    theme: 'myLittleFriend_theme',
    /** Cosmetic theme pack (default/cozy/seasonal) */
    cosmeticTheme: 'myLittleFriend_cosmeticTheme',
    /** Tutorial completed flag */
    tutorialDone: 'myLittleFriend_tutorialDone',
    /** Haptic feedback disabled flag */
    hapticOff: 'myLittleFriend_hapticOff',
    /** TTS disabled flag */
    ttsOff: 'myLittleFriend_ttsOff',
    /** Text size preference */
    textSize: 'myLittleFriend_textSize',
    /** Reduced motion preference */
    reducedMotion: 'myLittleFriend_reducedMotion',
    /** Screen reader verbosity mode */
    srVerbosity: 'myLittleFriend_srVerbosity',
    /** Favorite quick actions */
    favorites: 'myLittleFriend_favorites',
    /** More actions expanded preference */
    moreActionsExpanded: 'myLittleFriend_moreActionsExpanded',
    /** Cross-device auction house data */
    auctionHouse: 'myLittleFriend_auctionHouse',
    /** Current auction slot ID */
    auctionSlotId: 'myLittleFriend_auctionSlotId',
    /** Balance profile (NORMAL or QUICK_ITERATION_BUILD) */
    balanceProfile: 'myLittleFriend_balanceProfile',
    /** Onboarding tooltips shown state */
    onboardingShown: 'myLittleFriend_onboardingShown',
    /** Progressive onboarding disclosure milestones */
    progressiveOnboarding: 'myLittleFriend_progressiveOnboarding',
    /** Roving keyboard hint dismissed */
    rovingHintDismissed: 'myLittleFriend_rovingHintDismissed',
    /** Coach checklist minimized state */
    coachChecklistMinimized: 'myLittleFriend_coachChecklistMinimized',
    /** Coach checklist data */
    coachChecklist: 'myLittleFriend_coachChecklist',
    /** Pet session counter */
    petSessions: 'myLittleFriend_petSessions',
    /** First-run accessibility defaults applied flag */
    firstRunA11yDefaults: 'myLittleFriend_firstRunA11yDefaultsV1',
    /** Calm mode preference */
    calmMode: 'myLittleFriend_calmMode',
    /** Sound cue captions preference */
    soundCueCaptions: 'myLittleFriend_soundCueCaptions',
    /** Session-scoped: pet session seen this session */
    petSessionSeen: 'myLittleFriend_petSessionSeen'
});

/**
 * Preserve existing players by migrating legacy "petCareBuddy*" keys.
 * This runs once at startup and only copies values when the new key is missing.
 */
function migrateLegacyStorageKeys() {
    try {
        Object.keys(STORAGE_KEYS).forEach((name) => {
            const newKey = STORAGE_KEYS[name];
            const legacyKey = newKey === 'myLittleFriend'
                ? 'petCareBuddy'
                : newKey.replace(/^myLittleFriend/, 'petCareBuddy');

            if (!legacyKey || legacyKey === newKey) return;

            if (localStorage.getItem(newKey) === null) {
                const legacyValue = localStorage.getItem(legacyKey);
                if (legacyValue !== null) {
                    localStorage.setItem(newKey, legacyValue);
                }
            }

            if (name === 'petSessionSeen' && sessionStorage.getItem(newKey) === null) {
                const legacySessionValue = sessionStorage.getItem(legacyKey);
                if (legacySessionValue !== null) {
                    sessionStorage.setItem(newKey, legacySessionValue);
                }
            }
        });
    } catch (e) {
        // Ignore storage errors (private browsing, quota, blocked storage).
    }
}

migrateLegacyStorageKeys();
