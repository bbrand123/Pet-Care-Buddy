// ============================================================
// core.js  –  Game initialization and core loop
//   Includes: Game state, haptic feedback, utility functions,
//   UI helpers (wellness, announce), save/load, save export/import,
//   pet creation, multi-pet helpers, visibility handling,
//   initialization, and offline indicator
// Extracted from game.js (multiple sections)
// ============================================================

        // ==================== GAME STATE ====================

        // Cross-file flags (also declared in ui.js) — redeclare here for load-order safety
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;

        function generatePlayerId() {
            return 'pid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        }

        function createDefaultEconomyState() {
            return {
                coins: GAME_BALANCE.economy.startingCoins,
                starterSeedGranted: true,
                // Rec 2: Persistent player ID for cross-slot self-trade prevention
                playerId: generatePlayerId(),
                inventory: {
                    food: {},
                    toys: {},
                    medicine: {},
                    seeds: { carrot: 4, tomato: 3, strawberry: 2 },
                    accessories: {},
                    decorations: {},
                    crafted: {}
                },
                market: { dayKey: '', stock: [] },
	                mysteryEggsOpened: 0,
	                pity: {
	                    mysteryEggRareMisses: 0
	                },
	                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 },
	                totalEarned: 0,
	                totalSpent: 0,
	                wealthPressure: {
	                    lastAppliedDate: '',
	                    lastFee: 0,
	                    lastBreakdown: null,
	                    unpaidFeeDebt: 0
	                }
	            };
	        }

        function createDefaultMiniGameExpansionState() {
            return {
                specialFoodStock: 0,
                tournament: {
                    season: 1,
                    round: 0,
                    wins: 0,
                    championships: 0,
                    lastBracket: [],
                    leaderboard: []
                },
                coop: {
                    sessions: 0,
                    bestScore: 0
                }
            };
        }

        function createDefaultReminderState() {
            return {
                enabled: false,
                permission: 'default',
                lastSent: {}
            };
        }

        function createDefaultMasteryState() {
            return {
                competitionSeason: { points: 0, rank: 1, title: 'Bronze Circuit' },
                biomeRanks: {},
                familyLegacy: { points: 0, tier: 1, title: 'Founding Family' }
            };
        }

	        let gameState = {
	            saveSchemaVersion: (typeof MLFSaveSchema !== 'undefined' && MLFSaveSchema && MLFSaveSchema.CURRENT_SCHEMA_VERSION) ? MLFSaveSchema.CURRENT_SCHEMA_VERSION : 1,
	            phase: 'egg', // 'egg', 'hatching', 'pet'
            pet: null,
            eggTaps: 0,
            eggType: null, // Type of egg (furry, feathery, scaly, magical)
            pendingPetType: null, // Pre-determined pet type for the egg
            lastUpdate: Date.now(),
            timeOfDay: 'day', // 'day', 'sunset', 'night', 'sunrise'
            currentRoom: 'bedroom', // 'bedroom', 'kitchen', 'bathroom', 'backyard', 'park', 'garden'
	            exploration: {
	                biomeUnlocks: { forest: true, beach: false, mountain: false, cave: false, skyIsland: false, underwater: false, skyZone: false },
	                discoveredBiomes: { forest: true },
	                lootInventory: {},
	                lootInventoryStacks: {},
	                expedition: null,
	                expeditionHistory: [],
	                roomTreasureCooldowns: {},
	                treasureHunt: { globalCooldownEndsAt: 0, lastRunAt: 0, lastRoomId: null, recentRuns: [], roomSwitchCount: 0, repeatCount: 0 },
	                npcEncounters: [],
                dungeon: { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 },
                stats: { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 }
            },
            weather: 'sunny', // 'sunny', 'rainy', 'snowy'
            lastWeatherChange: Date.now(),
            season: getCurrentSeason(),
            adultsRaised: 0, // Track how many pets reached adult stage (for mythical unlocks)
            furniture: {
                bedroom: { bed: 'basic', decoration: 'none' },
                kitchen: { decoration: 'none' },
                bathroom: { decoration: 'none' }
            },
            roomUnlocks: {
                bedroom: true,
                kitchen: true,
                bathroom: true,
                backyard: true,
                park: true,
                garden: true
            },
            roomUpgrades: {},
            roomCustomizations: {},
	            garden: {
	                plots: [], // { cropId, stage, growTicks, watered }
	                inventory: {}, // { cropId: count }
	                lastGrowTick: Date.now(),
	                totalHarvests: 0,
	                expansionTier: 0
	            },
            minigamePlayCounts: {}, // { gameId: playCount } — tracks replays for difficulty scaling
            minigameHighScores: {}, // { gameId: bestScore } — persisted best scores
            minigameScoreHistory: {}, // { gameId: [score, score, score] } — last 3 scores per game
            minigameExpansion: createDefaultMiniGameExpansionState(),
            // Multi-pet system
            pets: [], // Array of all pet objects
            activePetIndex: 0, // Index of the currently active/displayed pet
            relationships: {}, // { "petId1-petId2": { points, lastInteraction, interactionHistory } }
            household: {
                activePetId: null,
                petsById: {},
                relationships: {},
                lastSimulatedAt: Date.now(),
                simVersion: 1
            }, // Persistent background household simulation state
            adoptingAdditional: false, // True when adopting an additional egg (don't reset state)
            nextPetId: 1, // Auto-incrementing ID for unique pet identification
            // Achievement & daily systems
            achievements: {}, // { achievementId: { unlocked: true, unlockedAt: timestamp } }
            roomsVisited: {}, // { roomId: true } — tracks which rooms have been visited
            weatherSeen: {}, // { sunny: true, rainy: true, snowy: true }
            dailyChecklist: null, // { date: 'YYYY-MM-DD', tasks: [...], progress: {...} }
            // Rewards systems
            badges: {}, // { badgeId: { unlocked: true, unlockedAt: timestamp } }
            stickers: {}, // { stickerId: { collected: true, collectedAt: timestamp } }
            trophies: {}, // { trophyId: { earned: true, earnedAt: timestamp } }
            streak: {
                current: 0,
                longest: 0,
                lastPlayDate: null,
                todayBonusClaimed: false,
                claimedMilestones: [],
                prestige: {
                    cycleMonth: '',
                    cycleBest: 0,
                    lifetimeTier: 0,
                    completedCycles: 0,
                    claimedMonthlyReward: ''
                }
            },
            totalMedicineUses: 0,
            totalGroomCount: 0,
            totalDailyCompletions: 0,
            weeklyArc: null,
            reminders: createDefaultReminderState(),
            rewardModifiers: [],
            mastery: createDefaultMasteryState(),
            goalLadder: null,
            journeyRetention: {
                version: 1,
                startedAtDate: null,
                currentChapterId: 'chapter1',
                lastUpdatedAt: 0,
                chapterProgress: {},
                streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 } },
                bond: { xp: 0, level: 1 },
                tokens: 0,
                features: { seasonalEnabled: false }
            },
            // Competition system
            competition: {
                battlesWon: 0, battlesLost: 0, bossesDefeated: {},
                showsEntered: 0, bestShowRank: '', bestShowScore: 0,
                obstacleBestScore: 0, obstacleCompletions: 0,
                rivalsDefeated: [], currentRivalIndex: 0
            },
            // Breeding system
            breedingEggs: [],           // Array of incubating breeding eggs
            lastBreedingIncubationTick: Date.now(), // Timestamp of last incubation minute tick
            totalBreedings: 0,          // Total successful breedings
            totalBreedingHatches: 0,    // Total breeding eggs hatched
            totalHybridsCreated: 0,     // Total hybrid pets created
            totalMutations: 0,          // Total mutations occurred
            hybridsDiscovered: {},       // { hybridType: true }
            journal: [],                 // Array of { timestamp, icon, text } entries
            diary: [],                   // Array of daily diary entries from generateDiaryEntry()
            totalFeedCount: 0,           // Lifetime feed count for badges/achievements
            memorials: [],               // Hall of fame for retired pets
            personalitiesSeen: {},       // Track unique personalities for badges
            eldersRaised: 0,             // Track elder pets raised
            totalFavoriteFoodFed: 0,      // Track favorite food feeds for achievements
            economy: createDefaultEconomyState(),
            // Caretaker progression system
            caretakerTitle: 'newcomer',
            caretakerActionCounts: { feed: 0, wash: 0, play: 0, sleep: 0, medicine: 0, groom: 0, exercise: 0, treat: 0, cuddle: 0 },
            lastCaretakerTitle: 'newcomer',
            // Weather tracking for micro-stories
            previousWeather: 'sunny',
            // Seasonal event tracking
            lastSeasonalEventCheck: 0
        };

        // Initialize StateManager with the gameState reference
        if (typeof StateManager !== 'undefined') {
            const proxiedState = StateManager.init(gameState, {
                eventBus: (typeof EventBus !== 'undefined') ? EventBus : null
            });
            if (proxiedState) gameState = proxiedState;
        }

        function createDefaultCompetitionState() {
            return {
                battlesWon: 0,
                battlesLost: 0,
                bossesDefeated: {},
                showsEntered: 0,
                bestShowRank: '',
                bestShowScore: 0,
                obstacleBestScore: 0,
                obstacleCompletions: 0,
                rivalsDefeated: [],
                currentRivalIndex: 0
            };
        }

        function normalizeCompetitionState(competition) {
            const state = (competition && typeof competition === 'object' && !Array.isArray(competition))
                ? competition
                : createDefaultCompetitionState();
            if (typeof state.battlesWon !== 'number' || !Number.isFinite(state.battlesWon)) state.battlesWon = 0;
            if (typeof state.battlesLost !== 'number' || !Number.isFinite(state.battlesLost)) state.battlesLost = 0;
            if (!state.bossesDefeated || typeof state.bossesDefeated !== 'object' || Array.isArray(state.bossesDefeated)) state.bossesDefeated = {};
            if (typeof state.showsEntered !== 'number' || !Number.isFinite(state.showsEntered)) state.showsEntered = 0;
            if (typeof state.bestShowRank !== 'string') state.bestShowRank = '';
            if (typeof state.bestShowScore !== 'number' || !Number.isFinite(state.bestShowScore)) state.bestShowScore = 0;
            if (typeof state.obstacleBestScore !== 'number' || !Number.isFinite(state.obstacleBestScore)) state.obstacleBestScore = 0;
            if (typeof state.obstacleCompletions !== 'number' || !Number.isFinite(state.obstacleCompletions)) state.obstacleCompletions = 0;
            if (!Array.isArray(state.rivalsDefeated)) state.rivalsDefeated = [];
            const rivalCount = (typeof RIVAL_TRAINERS !== 'undefined' && Array.isArray(RIVAL_TRAINERS)) ? RIVAL_TRAINERS.length : 0;
            state.rivalsDefeated = [...new Set(state.rivalsDefeated
                .map((idx) => Number(idx))
                .filter((idx) => Number.isInteger(idx) && idx >= 0 && (rivalCount === 0 || idx < rivalCount)))];
            if (!Number.isInteger(state.currentRivalIndex) || state.currentRivalIndex < 0) state.currentRivalIndex = 0;
            if (state.rivalsDefeated.length > 0) {
                const furthestDefeated = Math.max(...state.rivalsDefeated);
                state.currentRivalIndex = Math.max(state.currentRivalIndex, furthestDefeated + 1);
            }
            if (rivalCount > 0) {
                state.currentRivalIndex = Math.min(state.currentRivalIndex, rivalCount);
            }
            return state;
        }

        function normalizeMiniGameExpansionState(expansion) {
            const defaults = createDefaultMiniGameExpansionState();
            const state = (expansion && typeof expansion === 'object' && !Array.isArray(expansion))
                ? expansion
                : defaults;

            if (typeof state.specialFoodStock !== 'number' || !Number.isFinite(state.specialFoodStock)) state.specialFoodStock = 0;
            state.specialFoodStock = Math.max(0, Math.floor(state.specialFoodStock));

            if (!state.tournament || typeof state.tournament !== 'object' || Array.isArray(state.tournament)) state.tournament = defaults.tournament;
            if (typeof state.tournament.season !== 'number' || !Number.isFinite(state.tournament.season)) state.tournament.season = 1;
            if (typeof state.tournament.round !== 'number' || !Number.isFinite(state.tournament.round)) state.tournament.round = 0;
            if (typeof state.tournament.wins !== 'number' || !Number.isFinite(state.tournament.wins)) state.tournament.wins = 0;
            if (typeof state.tournament.championships !== 'number' || !Number.isFinite(state.tournament.championships)) state.tournament.championships = 0;
            if (!Array.isArray(state.tournament.lastBracket)) state.tournament.lastBracket = [];
            if (!Array.isArray(state.tournament.leaderboard)) state.tournament.leaderboard = [];

            if (!state.coop || typeof state.coop !== 'object' || Array.isArray(state.coop)) state.coop = defaults.coop;
            if (typeof state.coop.sessions !== 'number' || !Number.isFinite(state.coop.sessions)) state.coop.sessions = 0;
            if (typeof state.coop.bestScore !== 'number' || !Number.isFinite(state.coop.bestScore)) state.coop.bestScore = 0;
            state.coop.sessions = Math.max(0, Math.floor(state.coop.sessions));
            state.coop.bestScore = Math.max(0, Math.floor(state.coop.bestScore));

            return state;
        }

        function ensureMiniGameExpansionState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            state.minigameExpansion = normalizeMiniGameExpansionState(state.minigameExpansion);
            return state.minigameExpansion;
        }

        function ensureReminderState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const defaults = createDefaultReminderState();
            if (!state.reminders || typeof state.reminders !== 'object' || Array.isArray(state.reminders)) {
                state.reminders = defaults;
                return state.reminders;
            }
            if (typeof state.reminders.enabled !== 'boolean') state.reminders.enabled = defaults.enabled;
            if (typeof state.reminders.permission !== 'string') state.reminders.permission = defaults.permission;
            if (!state.reminders.lastSent || typeof state.reminders.lastSent !== 'object' || Array.isArray(state.reminders.lastSent)) {
                state.reminders.lastSent = {};
            }
            return state.reminders;
        }

        function ensureMasteryState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const defaults = createDefaultMasteryState();
            if (!state.mastery || typeof state.mastery !== 'object' || Array.isArray(state.mastery)) {
                state.mastery = defaults;
                return state.mastery;
            }
            if (!state.mastery.competitionSeason || typeof state.mastery.competitionSeason !== 'object') {
                state.mastery.competitionSeason = defaults.competitionSeason;
            }
            if (typeof state.mastery.competitionSeason.points !== 'number' || !Number.isFinite(state.mastery.competitionSeason.points)) state.mastery.competitionSeason.points = 0;
            if (typeof state.mastery.competitionSeason.rank !== 'number' || !Number.isFinite(state.mastery.competitionSeason.rank)) state.mastery.competitionSeason.rank = 1;
            if (typeof state.mastery.competitionSeason.title !== 'string') state.mastery.competitionSeason.title = defaults.competitionSeason.title;
            if (!state.mastery.biomeRanks || typeof state.mastery.biomeRanks !== 'object' || Array.isArray(state.mastery.biomeRanks)) {
                state.mastery.biomeRanks = {};
            }
            if (!state.mastery.familyLegacy || typeof state.mastery.familyLegacy !== 'object') {
                state.mastery.familyLegacy = defaults.familyLegacy;
            }
            if (typeof state.mastery.familyLegacy.points !== 'number' || !Number.isFinite(state.mastery.familyLegacy.points)) state.mastery.familyLegacy.points = 0;
            if (typeof state.mastery.familyLegacy.tier !== 'number' || !Number.isFinite(state.mastery.familyLegacy.tier)) state.mastery.familyLegacy.tier = 1;
            if (typeof state.mastery.familyLegacy.title !== 'string') state.mastery.familyLegacy.title = defaults.familyLegacy.title;
            return state.mastery;
        }

        // Holds the garden growth interval ID. Timer is started from renderPetPhase() in ui.js
        // via startGardenGrowTimer(), and stopped during cleanup/reset.
        let gardenGrowInterval = null;
        let localReminderInterval = null;

        // Track room bonus toast per session — only show bonus detail the first few times
        const roomBonusToastCount = {};
        const MAX_ROOM_BONUS_TOASTS = 3;

        // Track neglect tick counters per pet (keyed by pet id) — kept out of
        // the pet object so they don't get serialized into the save file.
        const _neglectTickCounters = {};
        let _lastAnnouncedTimeOfDay = null;

        // ==================== HAPTIC FEEDBACK ====================
        // Short vibration on supported mobile devices for tactile satisfaction
        function isHapticsEnabled() {
            try {
                return localStorage.getItem(STORAGE_KEYS.hapticOff) !== 'true';
            } catch (e) {
                return true;
            }
        }

        function hapticBuzz(ms) {
            try {
                if (!isHapticsEnabled()) return;
                if (navigator.vibrate) navigator.vibrate(ms || 50);
            } catch (e) { /* unsupported — silently ignore */ }
        }

        // Distinct haptic patterns for different actions
        const HAPTIC_PATTERNS = {
            feed: [30, 20, 30],           // double-tap feel
            wash: [40, 30, 40, 30, 40],   // scrubbing rhythm
            play: [20, 10, 20, 10, 50],   // bouncy
            sleep: [80],                    // single long press
            medicine: [20, 40, 20],         // gentle
            groom: [15, 15, 15, 15, 15],   // brushing strokes
            exercise: [30, 10, 30, 10, 30, 10, 30], // rapid bursts
            treat: [40, 20, 60],           // reward feel
            cuddle: [50, 30, 80],          // warm embrace
            achievement: [30, 20, 30, 20, 80], // celebration
            critical: [100, 50, 100],       // urgent warning
            highscore: [40, 20, 40, 20, 40, 20, 100] // big celebration
        };

        const HAPTIC_DESIGN_MAP = Object.freeze({
            roomSwitch: { type: 'confirm', strength: 'light', throttleMs: 140, vibrate: [24] },
            modalOpen: { type: 'confirm', strength: 'light', throttleMs: 110, vibrate: [16] },
            modalClose: { type: 'confirm', strength: 'light', throttleMs: 110, vibrate: [12] },
            dailyComplete: { type: 'success', strength: 'medium', throttleMs: 800, vibrate: [24, 18, 46] },
            rewardClaim: { type: 'reward', strength: 'medium', throttleMs: 300, vibrate: [18, 12, 36] },
            confirmPrimary: { type: 'confirm', strength: 'medium', throttleMs: 150, vibrate: [22] },
            propTap: { type: 'confirm', strength: 'light', throttleMs: 120, vibrate: [12] }
        });
        const _hapticEventLastAt = {};
        let _hapticGlobalLastAt = 0;
        let _globalUiHapticsBound = false;
        let _modalHapticObserver = null;

        function postNativeHaptic(payload) {
            try {
                if (!isHapticsEnabled()) return false;
                const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptics;
                if (!bridge || typeof bridge.postMessage !== 'function') return false;
                bridge.postMessage(payload || { type: 'confirm', strength: 'light' });
                return true;
            } catch (e) {
                return false;
            }
        }

        function getHapticDesign(eventId) {
            return HAPTIC_DESIGN_MAP[eventId] || null;
        }

        function triggerUiHaptic(eventId, overrides) {
            try {
                if (!isHapticsEnabled()) return false;
                const base = getHapticDesign(eventId);
                if (!base && !overrides) return false;
                const cfg = Object.assign({}, base || {}, overrides || {});
                const now = Date.now();
                const eventThrottle = Math.max(0, Number(cfg.throttleMs) || 0);
                const lastEventAt = _hapticEventLastAt[eventId] || 0;
                if (eventThrottle && now - lastEventAt < eventThrottle) return false;
                if (now - _hapticGlobalLastAt < 55) return false; // anti-spam floor
                _hapticEventLastAt[eventId] = now;
                _hapticGlobalLastAt = now;
                postNativeHaptic({
                    type: String(cfg.type || 'confirm'),
                    strength: cfg.strength ? String(cfg.strength) : undefined
                });
                if (navigator.vibrate && cfg.vibrate && Array.isArray(cfg.vibrate)) {
                    navigator.vibrate(cfg.vibrate);
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        function countOpenModalLikeOverlays() {
            try {
                return document.querySelectorAll(
                    '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"], .settings-overlay, .daily-overlay, .rewards-hub-overlay, .minigame-menu-overlay'
                ).length;
            } catch (e) {
                return 0;
            }
        }

        function setupGlobalUiHapticCoverage() {
            if (_globalUiHapticsBound || typeof document === 'undefined') return;
            _globalUiHapticsBound = true;

            document.addEventListener('click', function (event) {
                const target = event && event.target && event.target.closest ? event.target.closest('button, [role="button"]') : null;
                if (!target) return;

                if (target.matches('[aria-haspopup="dialog"], #minigames-btn, #settings-btn, #daily-btn, #rewards-btn, #explore-btn, #journey-btn')) {
                    triggerUiHaptic('modalOpen');
                    return;
                }
                if (target.matches('.settings-close, .daily-close, .rewards-hub-close, .minigame-close-btn, [data-summary-close], [id$=\"-close\"], [aria-label^=\"Close \"]')) {
                    triggerUiHaptic('modalClose');
                    return;
                }
                if (target.matches('.streak-claim-btn, [data-journey-redeem], #expedition-collect-btn, [id*=\"claim\"]')) {
                    triggerUiHaptic('rewardClaim');
                    return;
                }
                if (target.matches('.modal-btn.confirm, .confirm-danger-btn, #exit-confirm, .minigame-summary-btn.primary')) {
                    triggerUiHaptic('confirmPrimary');
                }
            }, true);

            if (typeof MutationObserver === 'function' && document.body) {
                let lastCount = countOpenModalLikeOverlays();
                _modalHapticObserver = new MutationObserver(function () {
                    const nextCount = countOpenModalLikeOverlays();
                    if (nextCount > lastCount) triggerUiHaptic('modalOpen');
                    else if (nextCount < lastCount) triggerUiHaptic('modalClose');
                    lastCount = nextCount;
                });
                _modalHapticObserver.observe(document.body, { childList: true, subtree: true });
            }
        }

        function hapticPattern(action) {
            try {
                if (!isHapticsEnabled()) return;
                if (action === 'achievement' || action === 'highscore') {
                    postNativeHaptic({ type: 'success', strength: 'medium' });
                } else if (action === 'critical') {
                    postNativeHaptic({ type: 'warning', strength: 'heavy' });
                } else if (HAPTIC_PATTERNS[action]) {
                    postNativeHaptic({ type: 'confirm', strength: action === 'exercise' ? 'medium' : 'light' });
                }
                if (navigator.vibrate && HAPTIC_PATTERNS[action]) {
                    navigator.vibrate(HAPTIC_PATTERNS[action]);
                }
            } catch (e) { /* unsupported — silently ignore */ }
        }

        // ==================== SCREEN SHAKE ====================

        function screenShake(intensity, duration) {
            // Skip entirely if user prefers reduced motion
            if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return;
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const container = document.querySelector('.game-container');
            if (!container) return;
            const px = Math.min(intensity || 2, 4);
            const ms = Math.min(duration || 250, 400);
            container.style.setProperty('--shake-intensity', px + 'px');
            container.style.animationDuration = ms + 'ms';
            container.classList.remove('screen-shake');
            void container.offsetWidth;
            container.classList.add('screen-shake');
            setTimeout(() => container.classList.remove('screen-shake'), ms);
        }

        // ==================== UTILITY FUNCTIONS ====================

        // Get difficulty multiplier for a minigame based on how many times it's been played
        // Each replay bumps difficulty by 10%, capped at 2x (10 replays)
        function getMinigameDifficulty(gameId) {
            const plays = (gameState.minigamePlayCounts && gameState.minigamePlayCounts[gameId]) || 0;
            // So replaying keeps challenge fresh without becoming punishingly steep.
            const replayDifficulty = 1 + Math.min(plays, GAME_BALANCE.minigames.maxReplayDifficultyPlays) * GAME_BALANCE.minigames.replayDifficultyStep;
            const easeMultiplier = getMiniGameEaseMultiplier(gameState.pet);
            return Math.max(GAME_BALANCE.minigames.difficultyMin, Math.min(GAME_BALANCE.minigames.difficultyMax, Number((replayDifficulty * easeMultiplier).toFixed(2))));
        }

        function getPetMiniGameStrength(pet) {
            if (!pet || typeof pet !== 'object') return 0.5;
            const hunger = clamp(Number(pet.hunger) || 0, 0, 100);
            const cleanliness = clamp(Number(pet.cleanliness) || 0, 0, 100);
            const happiness = clamp(Number(pet.happiness) || 0, 0, 100);
            const energy = clamp(Number(pet.energy) || 0, 0, 100);
            return (hunger + cleanliness + happiness + energy) / 400;
        }

        function getMiniGameEaseMultiplier(pet) {
            const strength = getPetMiniGameStrength(pet);
            return Math.max(GAME_BALANCE.minigames.easeMultMin, Math.min(GAME_BALANCE.minigames.easeMultMax, GAME_BALANCE.minigames.easeMultMin + (strength * GAME_BALANCE.minigames.easeMultRange)));
        }

        // Increment play count for a minigame
        function incrementMinigamePlayCount(gameId, scoreValue) {
            const score = Math.max(0, Number(scoreValue) || 0);
            if (score <= 0) return false;
            if (!gameState.minigamePlayCounts) gameState.minigamePlayCounts = {};
            gameState.minigamePlayCounts[gameId] = (gameState.minigamePlayCounts[gameId] || 0) + 1;
            // Track daily checklist progress for minigames
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = incrementDailyProgress('minigameCount');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after minigame play
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }
            // Check badges, stickers, trophies after minigame play
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, BADGE_TIERS[badge.tier].color), 500);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), 900);
                });
            }
            return true;
        }

        // Update high score for a minigame, returns true if it's a new best
        function updateMinigameHighScore(gameId, score) {
            if (!gameState.minigameHighScores) gameState.minigameHighScores = {};
            const current = gameState.minigameHighScores[gameId] || 0;
            const isNewBest = score > current;
            if (isNewBest) {
                gameState.minigameHighScores[gameId] = score;
            }

            // Record in score history (keep last 3)
            if (!gameState.minigameScoreHistory) gameState.minigameScoreHistory = {};
            if (!gameState.minigameScoreHistory[gameId]) gameState.minigameScoreHistory[gameId] = [];
            gameState.minigameScoreHistory[gameId].push(score);
            if (gameState.minigameScoreHistory[gameId].length > 3) {
                gameState.minigameScoreHistory[gameId].shift();
            }

            return isNewBest;
        }

        function randomFromArray(arr) {
            if (!arr || arr.length === 0) return undefined;
            return arr[Math.floor(Math.random() * arr.length)];
        }

        // clamp() is now defined in utils.js

        function applyProbabilisticDelta(value, amount, direction) {
            const safeAmount = Math.max(0, Number(amount) || 0);
            const whole = Math.floor(safeAmount);
            const fractional = safeAmount - whole;
            let delta = whole;
            if (Math.random() < fractional) delta += 1;
            if (direction === 'up') return clamp(value + delta, 0, 100);
            return clamp(value - delta, 0, 100);
        }

        function adjustNeglectCount(currentValue, amount, direction) {
            const safeAmount = Math.max(0, Number(amount) || 0);
            const whole = Math.floor(safeAmount);
            const fractional = safeAmount - whole;
            let delta = whole;
            if (Math.random() < fractional) delta += 1;
            if (direction === 'up') return Math.max(0, (Number(currentValue) || 0) + delta);
            return Math.max(0, (Number(currentValue) || 0) - delta);
        }

        function getPetNeedSnapshot(pet) {
            if (!pet) return null;
            return {
                hunger: normalizePetNeedValue(pet.hunger, 70),
                cleanliness: normalizePetNeedValue(pet.cleanliness, 70),
                happiness: normalizePetNeedValue(pet.happiness, 70),
                energy: normalizePetNeedValue(pet.energy, 70)
            };
        }

        function getLowestNeedStatKey(pet, snapshot) {
            const stats = snapshot || getPetNeedSnapshot(pet);
            if (!stats) return 'hunger';
            return Object.entries(stats)
                .sort((a, b) => a[1] - b[1])[0][0];
        }

        function getCareActionPrimaryNeed(action) {
            const map = {
                feed: 'hunger',
                wash: 'cleanliness',
                play: 'happiness',
                sleep: 'energy',
                groom: 'cleanliness',
                exercise: 'happiness',
                cuddle: 'happiness',
                treat: 'hunger'
            };
            return map[action] || null;
        }

        function getCareFocusMultiplier(action, pet, snapshot) {
            const primaryNeed = getCareActionPrimaryNeed(action);
            if (!primaryNeed || !pet) return 1;
            const lowestNeed = getLowestNeedStatKey(pet, snapshot);
            if (lowestNeed !== primaryNeed) return 1;
            const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const focusedBonus = getStageBalance(stage).focusedCareBonus || 0;
            return 1 + focusedBonus;
        }

        function isFiniteNumber(value) {
            return typeof value === 'number' && Number.isFinite(value);
        }

        function isValidPetType(type) {
            return !!(type && (PET_TYPES[type] || (typeof HYBRID_PET_TYPES !== 'undefined' && HYBRID_PET_TYPES[type])));
        }

        function normalizePetNeedValue(value, fallback) {
            if (!isFiniteNumber(value)) return fallback;
            return clamp(Math.round(value), 0, 100);
        }

        function hasValidPetCoreData(pet) {
            const energyOk = pet && (typeof pet.energy === 'undefined' || isFiniteNumber(pet.energy));
            return !!(pet &&
                typeof pet === 'object' &&
                isFiniteNumber(pet.hunger) &&
                isFiniteNumber(pet.cleanliness) &&
                isFiniteNumber(pet.happiness) &&
                energyOk &&
                isValidPetType(pet.type));
        }

        function normalizePetDataForSave(pet, markDirty) {
            if (!pet || typeof pet !== 'object') return;

            pet.hunger = normalizePetNeedValue(pet.hunger, 70);
            pet.cleanliness = normalizePetNeedValue(pet.cleanliness, 70);
            pet.happiness = normalizePetNeedValue(pet.happiness, 70);
            pet.energy = normalizePetNeedValue(pet.energy, 70);
            if (typeof pet.careActions !== 'number' || !Number.isFinite(pet.careActions)) pet.careActions = 0;
            if (!pet.birthdate || !Number.isFinite(pet.birthdate)) {
                const estimatedAgeMs = Math.max(
                    pet.careActions * 5 * 60 * 1000,
                    2 * 60 * 60 * 1000
                );
                pet.birthdate = Date.now() - estimatedAgeMs;
            }
            const ageInHours = (Date.now() - pet.birthdate) / (1000 * 60 * 60);
            if (!pet.growthStage) pet.growthStage = getGrowthStage(pet.careActions, ageInHours, pet.careQuality || 'average');
            if (!pet.careHistory) pet.careHistory = [];
            if (typeof pet.neglectCount !== 'number' || !Number.isFinite(pet.neglectCount)) pet.neglectCount = 0;
            if (!pet.careQuality) pet.careQuality = 'average';
            if (!pet.careVariant) pet.careVariant = 'normal';
            if (!pet.evolutionStage) pet.evolutionStage = 'base';
            if (!pet.lastGrowthStage) pet.lastGrowthStage = pet.growthStage || 'baby';
            if (!pet.unlockedAccessories) pet.unlockedAccessories = [];
            if (!pet.personality) {
                pet.personality = getRandomPersonality();
                if (typeof markDirty === 'function') markDirty();
            }
            if (!pet.personalityWarmth) pet.personalityWarmth = {};
            // Ensure new narrative tracking fields exist
            if (!pet._seenMemoryMoments) pet._seenMemoryMoments = {};
            if (!pet._seenSeasonalEvents) pet._seenSeasonalEvents = {};
            if (!pet._weatherSeen) pet._weatherSeen = {};
            if (!pet._roomActionCounts) pet._roomActionCounts = { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 };
            if (typeof pet._neglectRecoveryStep !== 'number') pet._neglectRecoveryStep = 0;
            if (typeof pet._isNeglected !== 'boolean') pet._isNeglected = false;
        }

        function repairPetIdsAndNextId(state) {
            if (!state || !Array.isArray(state.pets)) return;
            let maxId = 0;
            const usedIds = {};
            state.pets.forEach((p) => {
                if (!p) return;
                const id = p.id;
                if (Number.isInteger(id) && id > 0 && !usedIds[id]) {
                    usedIds[id] = true;
                    if (id > maxId) maxId = id;
                    return;
                }
                do {
                    maxId++;
                } while (usedIds[maxId]);
                p.id = maxId;
                usedIds[maxId] = true;
            });

            const candidateNext = Number.isInteger(state.nextPetId) && state.nextPetId > 0 ? state.nextPetId : 1;
            state.nextPetId = Math.max(candidateNext, maxId + 1);
        }

        function ensureHouseholdStateForRuntime(targetState, nowMs) {
            if (!targetState || typeof targetState !== 'object') return;
            if (typeof MLFHouseholdState === 'undefined' || !MLFHouseholdState || typeof MLFHouseholdState.ensureHouseholdState !== 'function') return;
            try {
                MLFHouseholdState.ensureHouseholdState(targetState, nowMs);
            } catch (err) {
                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.warn === 'function') {
                    MLFDiagnostics.warn('HOUSEHOLD', 'Failed to ensure household state.', {
                        error: String(err && err.message ? err.message : err)
                    });
                }
            }
        }

        function simulateHouseholdToNowForRuntime(targetState, nowMs, options) {
            if (!targetState || typeof targetState !== 'object') return null;
            if (typeof MLFHouseholdState === 'undefined' || !MLFHouseholdState || typeof MLFHouseholdState.simulateHouseholdToNowOnState !== 'function') {
                ensureHouseholdStateForRuntime(targetState, nowMs);
                return null;
            }
            try {
                return MLFHouseholdState.simulateHouseholdToNowOnState(targetState, nowMs, options);
            } catch (err) {
                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.warn === 'function') {
                    MLFDiagnostics.warn('HOUSEHOLD', 'Household catch-up simulation failed; continuing with legacy state.', {
                        error: String(err && err.message ? err.message : err)
                    });
                }
                return null;
            }
        }

        const _escapeDiv = document.createElement('div');
        function escapeHTML(str) {
            _escapeDiv.textContent = str;
            return _escapeDiv.innerHTML;
        }

        // Strip HTML tags and control characters from pet names so they are
        // safe for TTS (SpeechSynthesisUtterance) and future display paths.
        function sanitizePetName(raw) {
            // Remove HTML tags
            let name = raw.replace(/<[^>]*>/g, '');
            // Remove control characters (keep printable + common unicode)
            name = name.replace(/[\x00-\x1F\x7F]/g, '');
            name = name.trim().slice(0, 14);
            // Return null if the sanitized name is empty so callers can fall back
            return name.length > 0 ? name : null;
        }


        // Dynamic color for need rings: green when high, yellow, orange, red when low
        function getNeedColor(value) {
            if (value > 65) return '#66BB6A'; // Green — matches --color-happy-bar
            if (value > 45) return '#FFD54F'; // Yellow — matches --color-energy
            if (value > 25) return '#FF8A5C'; // Orange — matches --color-hunger
            return '#EF5350';                 // Red
        }

        // Returns a secondary icon indicator for colorblind accessibility
        // Used alongside getNeedColor to provide non-color status cues
        function getNeedStatusIcon(value) {
            if (value > 65) return '';         // Good — no indicator needed
            if (value > 45) return '';         // Fine — no indicator
            if (value > 25) return '!';        // Warning — single exclamation
            return '!!';                       // Critical — double exclamation
        }

        // Wellness bar helpers
        function getWellnessPercent(pet) {
            const h = Number(pet.hunger) || 0;
            const c = Number(pet.cleanliness) || 0;
            const hp = Number(pet.happiness) || 0;
            const e = Number(pet.energy) || 0;
            return Math.round((h + c + hp + e) / 4);
        }

        function getWellnessClass(pet) {
            const w = getWellnessPercent(pet);
            if (w >= 60) return 'good';
            if (w >= 35) return 'okay';
            return 'low';
        }

        function getWellnessLabel(pet) {
            const w = getWellnessPercent(pet);
            if (w >= 80) return `${w}% Great!`;
            if (w >= 60) return `${w}% Good`;
            if (w >= 35) return `${w}% Okay`;
            return `${w}% Needs care`;
        }

        // Consolidated floating stat change indicator (visual only — hidden
        // from screen readers).  Shows a single summary bubble over the pet
        // area instead of separate per-stat bubbles.
        // `changes` is an array of {label, amount} objects,
        // e.g. [{label:'Hunger', amount:10}, {label:'Energy', amount:-5}]
        function showStatChangeSummary(changes, options = {}) {
            if (!changes || changes.length === 0) return;
            const anchor = document.getElementById('pet-container');
            if (!anchor) return;

            // Limit simultaneous floating indicators to prevent DOM bloat
            const existing = anchor.querySelectorAll('.stat-change-summary');
            if (existing.length >= 3) existing[0].remove();

            const el = document.createElement('div');
            el.className = 'stat-change-summary';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = changes.filter(c => !isNaN(c.amount)).map(c => {
                const sign = c.amount >= 0 ? '+' : '';
                const cls = c.amount >= 0 ? 'positive' : 'negative';
                return `<span class="${cls}">${escapeHTML(c.label)} ${sign}${c.amount}</span>`;
            }).join('');
            anchor.appendChild(el);
            setTimeout(() => el.remove(), 2000);

            // Announce one compact update to reduce live-region traffic.
            const parts = changes
                .filter(c => Number.isFinite(c.amount) && c.amount !== 0)
                .map((c) => `${c.label} ${c.amount >= 0 ? '+' : ''}${c.amount}`);
            if (parts.length > 0) {
                const action = options && options.action ? String(options.action) : '';
                const actionPrefix = action
                    ? `${action.charAt(0).toUpperCase()}${action.slice(1)}: `
                    : 'Stat update: ';
                announce(`${actionPrefix}${parts.join(', ')}.`, { source: 'care', dedupeMs: 900 });
            }
        }

        // Update wellness bar display
        function updateWellnessBar() {
            const pet = gameState.pet;
            if (!pet) return;
            const fill = document.getElementById('wellness-fill');
            const val = document.getElementById('wellness-value');
            if (!fill || !val) return;
            const w = getWellnessPercent(pet);
            const statusClass = w >= 60 ? 'status-good' : w >= 35 ? 'status-okay' : 'status-needs-care';
            fill.style.width = w + '%';
            fill.className = `wellness-bar-fill ${getWellnessClass(pet)}`;
            val.textContent = getWellnessLabel(pet);
            val.classList.remove('status-good', 'status-okay', 'status-needs-care');
            val.classList.add('wellness-status-text', statusClass);
            // Keep aria-valuenow in sync so screen readers report current wellness
            const bar = fill.parentElement;
            if (bar) {
                bar.setAttribute('aria-label', 'Overall wellness');
                bar.setAttribute('aria-valuenow', w);
                bar.setAttribute('aria-valuetext', `Overall wellness ${w} percent, ${getWellnessLabel(pet)}`);
            }
            // Update numeric percentage (Item 20)
            const pctEl = document.getElementById('wellness-pct');
            if (pctEl) {
                pctEl.textContent = w + '%';
                pctEl.classList.remove('status-good', 'status-okay', 'status-needs-care');
                pctEl.classList.add('wellness-status-text', statusClass);
            }
        }

        let _announceQueue = [];
        let _announceTimer = null;
        let _assertiveQueue = [];
        let _assertiveTimer = null;
        const _announceRecentByKey = new Map();
        let _announceBatchTimer = null;
        let _announceBatchBucket = [];
        const _announceBatchableSources = new Set(['care', 'toast', 'status', 'focus-return', 'coach']);
        const _announceCriticalPatterns = [
            /warning/i,
            /critical/i,
            /error/i,
            /failed/i,
            /can(?:not|n't)/i,
            /unavailable/i,
            /\bneed\b/i,
            /corrupt/i,
            /offline/i
        ];
        const _announceCompletionPatterns = [
            /complete/i,
            /completed/i,
            /\bready\b/i,
            /hatched/i,
            /joined your family/i,
            /unlocked/i,
            /achievement/i,
            /badge/i,
            /trophy/i
        ];

        function getAnnouncementVerbosity() {
            try {
                return localStorage.getItem(STORAGE_KEYS.srVerbosity) === 'detailed' ? 'detailed' : 'brief';
            } catch (e) {
                return 'brief';
            }
        }

        function isRoutineAnnouncement(message) {
            const txt = String(message || '').toLowerCase();
            return /score:|growth progress|now feeling|cooling down|throw again|running to get it|got it|bringing it back/.test(txt);
        }

        function normalizeAnnounceOptions(assertiveOrOptions) {
            if (typeof assertiveOrOptions === 'object' && assertiveOrOptions !== null) {
                return {
                    assertive: !!assertiveOrOptions.assertive,
                    source: assertiveOrOptions.source || 'app',
                    dedupeMs: Number.isFinite(assertiveOrOptions.dedupeMs) ? Math.max(0, assertiveOrOptions.dedupeMs) : 1800,
                    batch: assertiveOrOptions.batch !== false,
                    batchMs: Number.isFinite(assertiveOrOptions.batchMs) ? Math.max(80, assertiveOrOptions.batchMs) : 220,
                    allowEmoji: !!assertiveOrOptions.allowEmoji
                };
            }
            return { assertive: !!assertiveOrOptions, source: 'app', dedupeMs: 1800, batch: true, batchMs: 220, allowEmoji: false };
        }

        function normalizeAnnouncementSpeechText(text, options) {
            const raw = String(text || '');
            const keepEmoji = !!(options && options.allowEmoji);
            if (keepEmoji) return raw.replace(/\s+/g, ' ').trim();
            if (typeof normalizeSpeechLabelText === 'function') {
                return normalizeSpeechLabelText(raw);
            }
            return raw.replace(/\s+/g, ' ').trim();
        }

        function shouldKeepAssertive(message) {
            const txt = String(message || '');
            return _announceCriticalPatterns.some((p) => p.test(txt)) || _announceCompletionPatterns.some((p) => p.test(txt));
        }

        function enqueuePoliteAnnouncement(message, options) {
            const canBatch = !!options.batch
                && _announceBatchableSources.has(options.source)
                && message.length <= 180;
            if (!canBatch) {
                _announceQueue.push(message);
                if (_announceQueue.length > 6) {
                    _announceQueue = _announceQueue.slice(-5);
                    _announceQueue.unshift('Multiple updates available.');
                }
                if (!_announceTimer) _announceTimer = setTimeout(flushAnnouncementQueue, 40);
                return;
            }
            _announceBatchBucket.push({ message, source: options.source });
            if (_announceBatchTimer) return;
            _announceBatchTimer = setTimeout(() => {
                _announceBatchTimer = null;
                const batch = _announceBatchBucket.splice(0);
                if (batch.length === 0) return;
                const unique = [];
                const seen = new Set();
                batch.forEach((entry) => {
                    const key = String(entry.message || '').toLowerCase();
                    if (!key || seen.has(key)) return;
                    seen.add(key);
                    unique.push(entry.message);
                });
                if (unique.length === 0) return;
                const batchedMessage = unique.length === 1
                    ? unique[0]
                    : `Updates: ${unique.slice(0, 3).join(' • ')}${unique.length > 3 ? ` (+${unique.length - 3} more)` : ''}`;
                _announceQueue.push(batchedMessage);
                if (_announceQueue.length > 6) {
                    _announceQueue = _announceQueue.slice(-5);
                    _announceQueue.unshift('Multiple updates available.');
                }
                if (!_announceTimer) _announceTimer = setTimeout(flushAnnouncementQueue, 40);
            }, options.batchMs);
        }

        function flushAnnouncementQueue() {
            if (_announceQueue.length > 4) {
                const kept = _announceQueue.splice(0, 3);
                const remainder = _announceQueue.length;
                _announceQueue = [`${kept.join(' • ')}${remainder > 0 ? ` (+${remainder} more)` : ''}`];
            }
            const next = _announceQueue.shift();
            if (!next) {
                _announceTimer = null;
                return;
            }
            const announcer = document.getElementById('live-announcer');
            if (!announcer) {
                _announceQueue = [];
                _announceTimer = null;
                return;
            }
            announcer.textContent = '';
            setTimeout(() => { announcer.textContent = next; }, 60);
            _announceTimer = setTimeout(flushAnnouncementQueue, 340);
        }

        function getAssertiveAnnouncementDurationMs(message) {
            const words = String(message || '').trim().split(/\s+/).filter(Boolean).length;
            // Approximate spoken pacing so longer messages are not interrupted.
            const estimated = Math.round((words / 2.6) * 1000) + 1100;
            return Math.max(2200, Math.min(11000, estimated));
        }

        function flushAssertiveQueue() {
            const announcer = document.getElementById('live-announcer-assertive');
            if (!announcer) {
                _assertiveQueue = [];
                _assertiveTimer = null;
                return;
            }
            const next = _assertiveQueue.shift();
            if (!next) {
                _assertiveTimer = null;
                return;
            }
            announcer.textContent = '';
            setTimeout(() => { announcer.textContent = next.message; }, 90);
            _assertiveTimer = setTimeout(() => {
                if (next.shouldClear && _assertiveQueue.length === 0) {
                    announcer.textContent = '';
                }
                flushAssertiveQueue();
            }, next.durationMs);
        }

        function announce(message, assertiveOrOptions = false) {
            const options = normalizeAnnounceOptions(assertiveOrOptions);
            let assertive = options.assertive;
            const plainMessage = normalizeAnnouncementSpeechText(message, options);
            if (!plainMessage) return;
            if (assertive && !shouldKeepAssertive(plainMessage)) {
                assertive = false;
            }
            const verbosity = getAnnouncementVerbosity();
            if (!assertive && verbosity === 'brief' && isRoutineAnnouncement(plainMessage)) return;
            if (!assertive && options.source === 'coach') {
                const assertiveAnnouncer = document.getElementById('live-announcer-assertive');
                if ((_announceQueue && _announceQueue.length > 0) || (assertiveAnnouncer && assertiveAnnouncer.textContent)) return;
            }
            const key = plainMessage.toLowerCase();
            const now = Date.now();
            const recent = _announceRecentByKey.get(key) || 0;
            if (now - recent < options.dedupeMs) return;
            _announceRecentByKey.set(key, now);
            if (assertive) {
                _assertiveQueue.push({
                    message: plainMessage,
                    durationMs: getAssertiveAnnouncementDurationMs(plainMessage),
                    // Prefer not clearing long messages; next announcement will replace naturally.
                    shouldClear: plainMessage.length <= 60
                });
                if (_assertiveTimer) return;
                _assertiveTimer = setTimeout(flushAssertiveQueue, 40);
                return;
            }

            // Queue polite messages and batch rapid updates to avoid a speech backlog.
            enqueuePoliteAnnouncement(plainMessage, options);
        }


        // ==================== SAVE/LOAD ====================

        // ==================== PET JOURNAL ====================
        function addJournalEntry(icon, text) {
            if (!gameState.journal) gameState.journal = [];
            gameState.journal.push({
                timestamp: Date.now(),
                icon: icon || '📝',
                text: text || ''
            });
            // Keep journal to a reasonable size (last 100 entries)
            if (gameState.journal.length > 100) {
                gameState.journal = gameState.journal.slice(-100);
            }
        }

        /**
         * Get the full diary including a live entry for today (if applicable).
         * Past entries come from gameState.diary; today's entry is generated on the fly.
         */
        function getDiaryEntries() {
            const entries = Array.isArray(gameState.diary) ? [...gameState.diary] : [];
            // Generate a live entry for today
            if (gameState.pet && gameState.dailyChecklist && typeof generateDiaryEntry === 'function') {
                try {
                    const pet = gameState.pet;
                    const progress = gameState.dailyChecklist.progress || {};
                    const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
                    const dayNum = pet.birthdate ? Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000)) : 1;
                    const todayEntry = generateDiaryEntry(pet, progress, season, dayNum);
                    if (todayEntry) {
                        todayEntry.date = gameState.dailyChecklist.date || new Date().toISOString().slice(0, 10);
                        todayEntry.isToday = true;
                        entries.push(todayEntry);
                    }
                } catch (e) {
                    // Diary generation failure should not break the UI
                }
            }
            return entries;
        }

        let _lastSavedStorageSnapshot = null;
        let _suppressUnloadAutosave = false;

        function suppressUnloadAutosaveForReload() {
            _suppressUnloadAutosave = true;
        }

        function hasExternalSaveChangeSinceLastSave() {
            try {
                const current = localStorage.getItem(STORAGE_KEYS.gameSave);
                return current !== _lastSavedStorageSnapshot;
            } catch (e) {
                return false;
            }
        }

        function shouldRunUnloadAutosave() {
            if (_suppressUnloadAutosave) return false;
            if (hasExternalSaveChangeSinceLastSave()) return false;
            return true;
        }

	        function saveGame(options) {
	            try {
	                const saveOptions = (options && typeof options === 'object') ? options : null;
                    const nowMs = Date.now();
	                ensureExplorationState();
	                ensureEconomyState();
	                ensureMiniGameExpansionState();
                    if (typeof Journey !== 'undefined' && Journey && typeof Journey.ensureJourneyState === 'function') {
                        Journey.ensureJourneyState(gameState);
                    }
                // Sync active pet to pets array before saving
                syncActivePetToArray();
                if (gameState.phase === 'pet') {
                    simulateHouseholdToNowForRuntime(gameState, nowMs, {
                        tickOptions: {
                            skipActivePetNeeds: true
                        }
                    });
                    ensureHouseholdStateForRuntime(gameState, nowMs);
                    if (gameState.household && typeof gameState.household === 'object') {
                        gameState.household.lastSimulatedAt = nowMs;
                    }
                }
                gameState.lastUpdate = nowMs;
	                if (typeof StateManager === 'undefined' || !StateManager || typeof StateManager.serialize !== 'function') {
	                    throw new Error('StateManager.serialize is required for the canonical save path.');
	                }
	                const snapshot = StateManager.serialize();
	                const serialized = snapshot && typeof snapshot.serialized === 'string' ? snapshot.serialized : '{}';
	                const schemaVersion = (snapshot && Number.isInteger(snapshot.schemaVersion)) ? snapshot.schemaVersion : 1;
	                gameState.saveSchemaVersion = schemaVersion;
	                localStorage.setItem(STORAGE_KEYS.gameSave, serialized);
	                _lastSavedStorageSnapshot = serialized;
	                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.log === 'function' && saveOptions && saveOptions.source === 'lifecycle') {
	                    MLFDiagnostics.log('SAVE', 'Lifecycle save wrote local storage.', {
	                        reason: saveOptions.reason || 'native-lifecycle',
	                        bytes: serialized.length
	                    });
	                }
	                // Show save indicator (Item 22)
	                if (!saveOptions || !saveOptions.silentIndicator) {
	                    showSaveIndicator();
	                }
	                return {
	                    ok: true,
	                    savedAt: gameState.lastUpdate,
	                    schemaVersion: schemaVersion,
	                    source: saveOptions && saveOptions.source ? saveOptions.source : 'runtime'
	                };
	            } catch (e) {
	                console.log('Could not save game:', e);
	                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.error === 'function') {
	                    MLFDiagnostics.error('SAVE', 'Could not save game.', {
	                        error: String(e && e.message ? e.message : e),
	                        reason: options && options.reason ? options.reason : null,
	                        source: options && options.source ? options.source : 'runtime'
	                    });
	                }
	                if (e.name === 'QuotaExceededError' || e.code === 22) {
	                    showToast('Storage full! Progress may not be saved.', '#EF5350');
	                    announce('Warning: Storage full. Your progress may not be saved.', true);
	                    showSaveIndicator(true);
	                }
	                return {
	                    ok: false,
	                    error: {
	                        code: e && e.code ? String(e.code) : (e && e.name ? String(e.name) : 'SAVE_ERROR'),
	                        message: e && e.message ? String(e.message) : String(e)
	                    },
	                    source: options && options.source ? options.source : 'runtime'
	                };
	            }
	        }

	        if (typeof MLFSaveLifecycleBridge !== 'undefined' && MLFSaveLifecycleBridge && typeof MLFSaveLifecycleBridge.setSaveHandler === 'function') {
	            MLFSaveLifecycleBridge.setSaveHandler(function lifecycleSaveHandler(meta) {
	                return saveGame({
	                    source: (meta && meta.source) || 'lifecycle',
	                    reason: (meta && meta.reason) || 'native-lifecycle',
	                    silentIndicator: true
	                });
	            });
	        }

        // Visual save indicator (Item 22)
        let _saveIndicatorTimer = null;
        function showSaveIndicator(isError) {
            let indicator = document.getElementById('save-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'save-indicator';
                indicator.className = 'save-indicator';
                indicator.setAttribute('role', 'status');
                indicator.setAttribute('aria-live', 'polite');
                document.body.appendChild(indicator);
            }
            indicator.textContent = isError ? '⚠ Save failed' : '✓ Saved';
            indicator.classList.toggle('error', !!isError);
            indicator.classList.add('visible');
            if (_saveIndicatorTimer) clearTimeout(_saveIndicatorTimer);
            _saveIndicatorTimer = setTimeout(() => {
                indicator.classList.remove('visible');
            }, 1500);
        }

	        function loadGame() {
	            let _needsSaveAfterLoad = false;
	            try {
	                const saved = localStorage.getItem(STORAGE_KEYS.gameSave);
	                if (saved) {
	                    let parsed = JSON.parse(saved);

	                    if (typeof MLFSaveMigrations !== 'undefined' && MLFSaveMigrations && typeof MLFSaveMigrations.migrateSavePayload === 'function') {
	                        const migrationResult = MLFSaveMigrations.migrateSavePayload(parsed);
	                        parsed = migrationResult.payload;
	                        if (migrationResult && migrationResult.report) {
	                            if (migrationResult.report.changed || migrationResult.report.toVersion !== migrationResult.report.fromVersion) {
	                                _needsSaveAfterLoad = true;
	                            }
	                            if (migrationResult.report.appliedMigrations && migrationResult.report.appliedMigrations.length > 0) {
	                                console.info('[MLF][MIGRATE] Applied save migrations:', migrationResult.report);
	                                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.log === 'function') {
	                                    MLFDiagnostics.log('MIGRATE', 'Applied save migrations during load.', {
	                                        fromVersion: migrationResult.report.fromVersion,
	                                        toVersion: migrationResult.report.toVersion,
	                                        appliedMigrations: migrationResult.report.appliedMigrations,
	                                        changeCount: migrationResult.report.changes ? migrationResult.report.changes.length : 0
	                                    });
	                                }
	                            }
	                        }
	                    } else {
	                        // Minimal fallback validation if save migration modules are unavailable.
	                        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
	                            return null;
	                        }
	                    }

	                    // Schema migration handles legacy hatching-phase repair, but keep a defensive fallback.
	                    if (parsed.phase === 'hatching') {
	                        parsed.phase = 'egg';
	                        parsed.eggTaps = 0;
	                        _needsSaveAfterLoad = true;
	                    }

                    // Validate pet data if in pet phase
                    if (parsed.phase === 'pet') {
                        const hasPetObject = parsed.pet && typeof parsed.pet === 'object';
                        const hasPetArray = Array.isArray(parsed.pets) && parsed.pets.some((p) => p && typeof p === 'object');
                        if (!hasPetObject && !hasPetArray) {
                            return null;
                        }
                        if (!Array.isArray(parsed.pets)) {
                            parsed.pets = hasPetObject ? [parsed.pet] : [];
                        } else if (!hasPetObject) {
                            const idx = Number.isInteger(parsed.activePetIndex) ? parsed.activePetIndex : 0;
                            parsed.pet = parsed.pets[idx] || parsed.pets.find((p) => p && typeof p === 'object') || null;
                        }
                        if (!hasValidPetCoreData(parsed.pet)) {
                            const fallbackPet = (parsed.pets || []).find((p) => hasValidPetCoreData(p));
                            if (!fallbackPet) {
                                return null;
                            }
                            parsed.pet = fallbackPet;
                        }

                        normalizePetDataForSave(parsed.pet, () => { _needsSaveAfterLoad = true; });
                        // Re-check growth stage to detect elder
                        const currentAge = (Date.now() - parsed.pet.birthdate) / (1000 * 60 * 60);
                        const detectedStage = getGrowthStage(parsed.pet.careActions, currentAge, parsed.pet.careQuality || 'average');
                        if (detectedStage !== parsed.pet.growthStage) {
                            parsed.pet.growthStage = detectedStage;
                        }
                        // Add adultsRaised if missing
                        if (typeof parsed.adultsRaised !== 'number') {
                            parsed.adultsRaised = 0;
                        }
                        // Add memorials if missing
                        if (!parsed.memorials) {
                            parsed.memorials = [];
                        }
                        // Add personality tracking if missing
                        if (!parsed.personalitiesSeen) {
                            parsed.personalitiesSeen = {};
                            if (parsed.pet.personality) {
                                parsed.personalitiesSeen[parsed.pet.personality] = true;
                            }
                        }
                    }

                    // Add currentRoom if missing (for existing saves)
                    if (!parsed.currentRoom || !ROOMS[parsed.currentRoom]) {
                        parsed.currentRoom = 'bedroom';
                    }
                    if (!parsed.roomUnlocks || typeof parsed.roomUnlocks !== 'object') parsed.roomUnlocks = {};
                    if (!parsed.roomUpgrades || typeof parsed.roomUpgrades !== 'object') parsed.roomUpgrades = {};
                    if (!parsed.roomCustomizations || typeof parsed.roomCustomizations !== 'object') parsed.roomCustomizations = {};
                    ROOM_IDS.forEach((roomId) => {
                        const room = ROOMS[roomId];
                        if (!room) return;
                        if (typeof parsed.roomUnlocks[roomId] !== 'boolean') {
                            parsed.roomUnlocks[roomId] = room.unlockRule && room.unlockRule.type === 'default';
                        }
                        if (!Number.isFinite(parsed.roomUpgrades[roomId])) parsed.roomUpgrades[roomId] = 0;
                        if (!parsed.roomCustomizations[roomId] || typeof parsed.roomCustomizations[roomId] !== 'object') {
                            parsed.roomCustomizations[roomId] = {};
                        }
                        const custom = parsed.roomCustomizations[roomId];
                        if (!custom.wallpaper || !ROOM_WALLPAPERS[custom.wallpaper]) custom.wallpaper = 'classic';
                        if (!custom.flooring || !ROOM_FLOORINGS[custom.flooring]) custom.flooring = 'natural';
                        if (!custom.theme || !ROOM_THEMES[custom.theme]) custom.theme = 'auto';
                        if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                        while (custom.furnitureSlots.length < 2) custom.furnitureSlots.push('none');
                        custom.furnitureSlots = custom.furnitureSlots.slice(0, 2).map((id) => ROOM_FURNITURE_ITEMS[id] ? id : 'none');
                    });
                    if (!parsed.roomUnlocks[parsed.currentRoom]) {
                        parsed.currentRoom = 'bedroom';
                    }

                    // Add weather if missing (for existing saves)
                    if (!parsed.weather || !WEATHER_TYPES[parsed.weather]) {
                        parsed.weather = 'sunny';
                    }
                    if (!parsed.lastWeatherChange) {
                        parsed.lastWeatherChange = Date.now();
                    }

                    // Add season if missing (for existing saves)
                    if (!parsed.season) {
                        parsed.season = getCurrentSeason();
                    }

                    // Add minigame tracking if missing (for existing saves)
                    if (!parsed.minigamePlayCounts || typeof parsed.minigamePlayCounts !== 'object') {
                        parsed.minigamePlayCounts = {};
                    }
                    if (!parsed.minigameHighScores || typeof parsed.minigameHighScores !== 'object') {
                        parsed.minigameHighScores = {};
                    }
                    if (!parsed.minigameScoreHistory || typeof parsed.minigameScoreHistory !== 'object') {
                        parsed.minigameScoreHistory = {};
                    }
                    ensureMiniGameExpansionState(parsed);
                    if (typeof MLFStateMigrations !== 'undefined' && MLFStateMigrations && typeof MLFStateMigrations.normalizeJourneyRetentionState === 'function') {
                        MLFStateMigrations.normalizeJourneyRetentionState(parsed, { now: Date.now() });
                    } else if (!parsed.journeyRetention || typeof parsed.journeyRetention !== 'object') {
                        parsed.journeyRetention = {
                            version: 1,
                            startedAtDate: null,
                            currentChapterId: 'chapter1',
                            lastUpdatedAt: Date.now(),
                            chapterProgress: {},
                            streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 } },
                            bond: { xp: 0, level: 1 },
                            tokens: 0,
                            features: { seasonalEnabled: false }
                        };
                    }

                    // Add garden if missing (for existing saves)
                    if (!parsed.garden || typeof parsed.garden !== 'object') {
	                        parsed.garden = {
	                            plots: [],
	                            inventory: {},
	                            lastGrowTick: Date.now(),
	                            totalHarvests: 0,
	                            expansionTier: 0
	                        };
	                    }
	                    if (!parsed.garden.plots) parsed.garden.plots = [];
	                    if (!parsed.garden.inventory) parsed.garden.inventory = {};
	                    if (!parsed.garden.lastGrowTick) parsed.garden.lastGrowTick = Date.now();
                    if (typeof parsed.garden.totalHarvests !== 'number') {
                        // Infer minimum harvests from existing state to keep used plots unlocked
                        let inferredHarvests = 0;
                        const invTotal = Object.values(parsed.garden.inventory || {}).reduce((s, c) => s + c, 0);
                        const highestUsedPlot = parsed.garden.plots.reduce((max, p, i) => p ? i : max, -1);
                        if (highestUsedPlot >= 0 || invTotal > 0) {
                            // Ensure enough harvests to unlock all plots that have crops
                            for (let pi = 0; pi <= highestUsedPlot && pi < GARDEN_PLOT_UNLOCK_THRESHOLDS.length; pi++) {
                                inferredHarvests = Math.max(inferredHarvests, GARDEN_PLOT_UNLOCK_THRESHOLDS[pi]);
                            }
                            inferredHarvests = Math.max(inferredHarvests, invTotal);
	                        }
	                        parsed.garden.totalHarvests = inferredHarvests;
	                    }
	                    if (typeof parsed.garden.expansionTier !== 'number' || !Number.isFinite(parsed.garden.expansionTier)) {
	                        parsed.garden.expansionTier = 0;
	                    }
	                    parsed.garden.expansionTier = Math.max(0, Math.min(
	                        Array.isArray(GARDEN_EXPANSION_TIERS) ? GARDEN_EXPANSION_TIERS.length : 0,
	                        Math.floor(parsed.garden.expansionTier)
	                    ));
	                    const highestOccupiedPlotIndex = Array.isArray(parsed.garden.plots)
	                        ? parsed.garden.plots.reduce((max, p, i) => p ? i : max, -1)
	                        : -1;
	                    if (highestOccupiedPlotIndex >= 0) {
	                        while (parsed.garden.expansionTier < (Array.isArray(GARDEN_EXPANSION_TIERS) ? GARDEN_EXPANSION_TIERS.length : 0)
	                            && getGardenPlotCapacity(parsed.garden.expansionTier) <= highestOccupiedPlotIndex) {
	                            parsed.garden.expansionTier++;
	                        }
	                    }

                    // Add multi-pet system fields if missing (for existing saves)
                    if (!Array.isArray(parsed.pets)) {
                        parsed.pets = parsed.pet ? [parsed.pet] : [];
                    }
                    if (!Number.isInteger(parsed.activePetIndex) || parsed.activePetIndex < 0) {
                        parsed.activePetIndex = 0;
                    }
                    if (!parsed.relationships || typeof parsed.relationships !== 'object') {
                        parsed.relationships = {};
                    }
                    parsed.pets = parsed.pets.filter((p) => p && typeof p === 'object' && isValidPetType(p.type));
                    if (parsed.phase === 'pet' && parsed.pet && parsed.pets.length === 0) {
                        parsed.pets = [parsed.pet];
                    }
                    parsed.pets.forEach((p) => normalizePetDataForSave(p, () => { _needsSaveAfterLoad = true; }));
                    repairPetIdsAndNextId(parsed);
                    // Add achievement/daily systems if missing (for existing saves)
                    if (!parsed.achievements || typeof parsed.achievements !== 'object') parsed.achievements = {};
                    if (!parsed.roomsVisited || typeof parsed.roomsVisited !== 'object') parsed.roomsVisited = {};
                    if (!parsed.weatherSeen || typeof parsed.weatherSeen !== 'object') parsed.weatherSeen = {};

                    // Add rewards system fields if missing (for existing saves)
                    if (!parsed.badges || typeof parsed.badges !== 'object') parsed.badges = {};
                    if (!parsed.stickers || typeof parsed.stickers !== 'object') parsed.stickers = {};
                    if (!parsed.trophies || typeof parsed.trophies !== 'object') parsed.trophies = {};
                    if (!parsed.streak || typeof parsed.streak !== 'object') {
                        parsed.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
                    }
                    if (!Array.isArray(parsed.streak.claimedMilestones)) parsed.streak.claimedMilestones = [];
                    if (typeof parsed.totalMedicineUses !== 'number') parsed.totalMedicineUses = 0;
                    if (typeof parsed.totalGroomCount !== 'number') parsed.totalGroomCount = 0;
                    if (typeof parsed.totalDailyCompletions !== 'number') parsed.totalDailyCompletions = 0;
                    if (typeof parsed.totalFeedCount !== 'number') parsed.totalFeedCount = 0;

                    // Add competition state if missing or partial (for existing saves)
                    parsed.competition = normalizeCompetitionState(parsed.competition);

                    // Add breeding system fields if missing (for existing saves)
                    if (!Array.isArray(parsed.breedingEggs)) parsed.breedingEggs = [];
                    parsed.breedingEggs = parsed.breedingEggs
                        .filter((egg) => egg && typeof egg === 'object')
                        .map((egg) => {
                            ensureBreedingEggData(egg);
                            return egg;
                        });
                    if (typeof parsed.lastBreedingIncubationTick !== 'number') parsed.lastBreedingIncubationTick = Date.now();
                    if (typeof parsed.totalBreedings !== 'number') parsed.totalBreedings = 0;
                    if (typeof parsed.totalBreedingHatches !== 'number') parsed.totalBreedingHatches = 0;
                    if (typeof parsed.totalHybridsCreated !== 'number') parsed.totalHybridsCreated = 0;
                    if (typeof parsed.totalMutations !== 'number') parsed.totalMutations = 0;
                    if (!parsed.hybridsDiscovered || typeof parsed.hybridsDiscovered !== 'object') parsed.hybridsDiscovered = {};
                    if (!Array.isArray(parsed.journal)) parsed.journal = [];
                    ensureExplorationState(parsed);
                    ensureEconomyState(parsed);
                    updateExplorationUnlocks(true, parsed);

                    // Strip transient _neglectTickCounter from pet objects (old saves)
                    // and migrate personality to existing pets
                    parsed.pets.forEach(p => {
                        if (p) {
                            delete p._neglectTickCounter;
                            normalizePetDataForSave(p, () => { _needsSaveAfterLoad = true; });
                        }
                    });

                    // Ensure active pet is in sync with pets array
                    if (parsed.pets.length > 0) {
                        if (parsed.activePetIndex >= parsed.pets.length) {
                            parsed.activePetIndex = 0;
                        }
                        parsed.pet = parsed.pets[parsed.activePetIndex];
                    }

                    const nowMs = Date.now();
                    const activeBeforeHouseholdSim = parsed.pet ? {
                        hunger: parsed.pet.hunger,
                        cleanliness: parsed.pet.cleanliness,
                        happiness: parsed.pet.happiness,
                        energy: parsed.pet.energy
                    } : null;

                    ensureHouseholdStateForRuntime(parsed, nowMs);

                    const hasHouseholdSim = (typeof MLFHouseholdState !== 'undefined' && MLFHouseholdState && typeof MLFHouseholdState.simulateHouseholdToNowOnState === 'function');
                    if (hasHouseholdSim) {
                        try {
                            if (typeof MLFSaveOfflineSimulation !== 'undefined' && MLFSaveOfflineSimulation && typeof MLFSaveOfflineSimulation.applyGardenOfflineGrowth === 'function') {
                                MLFSaveOfflineSimulation.applyGardenOfflineGrowth(parsed, {
                                    now: nowMs,
                                    getCurrentSeason,
                                    seasons: SEASONS,
                                    gardenCrops: GARDEN_CROPS
                                });
                            }
                            const simResult = simulateHouseholdToNowForRuntime(parsed, nowMs) || {};
                            parsed.timeOfDay = getTimeOfDay();
                            if (activeBeforeHouseholdSim && parsed.pet && parsed.lastUpdate) {
                                const minutesPassed = Math.max(0, Math.round((nowMs - parsed.lastUpdate) / 60000));
                                if (minutesPassed >= 5) {
                                    parsed._offlineChanges = {
                                        minutes: minutesPassed,
                                        hunger: (parsed.pet.hunger || 0) - (activeBeforeHouseholdSim.hunger || 0),
                                        cleanliness: (parsed.pet.cleanliness || 0) - (activeBeforeHouseholdSim.cleanliness || 0),
                                        happiness: (parsed.pet.happiness || 0) - (activeBeforeHouseholdSim.happiness || 0),
                                        energy: (parsed.pet.energy || 0) - (activeBeforeHouseholdSim.energy || 0)
                                    };
                                }
                            }
                            if (simResult && simResult.meta && simResult.meta.catchUpClamped && typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.log === 'function') {
                                MLFDiagnostics.log('HOUSEHOLD', 'Household offline catch-up was clamped.', simResult.meta);
                            }
                        } catch (offlineSimulationError) {
                            if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.warn === 'function') {
                                MLFDiagnostics.warn('LOAD', 'Household offline simulation failed; continuing with loaded state.', {
                                    error: String(offlineSimulationError && offlineSimulationError.message ? offlineSimulationError.message : offlineSimulationError)
                                });
                            }
                            parsed.timeOfDay = getTimeOfDay();
                        }
                    } else if (typeof MLFSaveOfflineSimulation !== 'undefined' && MLFSaveOfflineSimulation && typeof MLFSaveOfflineSimulation.applyOfflineSimulation === 'function') {
                        try {
                            MLFSaveOfflineSimulation.applyOfflineSimulation(parsed, {
                                getCurrentSeason,
                                getTimeOfDay,
                                seasons: SEASONS,
                                gardenCrops: GARDEN_CROPS,
                                clamp,
                                personalityTraits: PERSONALITY_TRAITS,
                                elderConfig: ELDER_CONFIG
                            });
                        } catch (offlineSimulationError) {
                            if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.warn === 'function') {
                                MLFDiagnostics.warn('LOAD', 'Offline save simulation failed; continuing with loaded state.', {
                                    error: String(offlineSimulationError && offlineSimulationError.message ? offlineSimulationError.message : offlineSimulationError)
                                });
                            }
                            parsed.timeOfDay = getTimeOfDay();
                        }
                    } else {
                        parsed.timeOfDay = getTimeOfDay();
                    }
                    // Persist any migrations (e.g. random personality) so they're stable
                    if (parsed.phase === 'pet') {
                        const hasStaleEggData = !!(parsed.eggTaps || parsed.eggType || parsed.pendingPetType);
                        if (hasStaleEggData) {
                            parsed.eggTaps = 0;
                            parsed.eggType = null;
                            parsed.pendingPetType = null;
                            _needsSaveAfterLoad = true;
                        }
                    }
                    if (_needsSaveAfterLoad) {
                        try {
                            const migrated = JSON.stringify(parsed);
                            localStorage.setItem(STORAGE_KEYS.gameSave, migrated);
                            _lastSavedStorageSnapshot = migrated;
	                        } catch (e) {
	                            if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.warn === 'function') {
	                                MLFDiagnostics.warn('LOAD', 'Failed to persist migrated save immediately after load.', {
	                                    error: String(e && e.message ? e.message : e)
	                                });
	                            }
	                        }
	                    } else {
	                        _lastSavedStorageSnapshot = saved;
	                    }
	                    // Reset session-local transient state (Recommendations #1, #2)
	                    parsed._sessionMinigameCount = 0;
	                    parsed._minigameRewardSession = null;
	                    parsed._careActionTimestamps = [];
	                    if (parsed.security && parsed.security.coinGainSession) parsed.security.coinGainSession.earned = 0;
	                    if (parsed.security && parsed.security.coinGainMinute) {
	                        parsed.security.coinGainMinute.windowStart = 0;
	                        parsed.security.coinGainMinute.earned = 0;
	                    }

                    return parsed;
                }
            } catch (e) {
	                console.log('Failed to load game:', e);
	                if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.error === 'function') {
	                    MLFDiagnostics.error('LOAD', 'Failed to load game save.', {
	                        error: String(e && e.message ? e.message : e),
	                        stack: e && e.stack ? String(e.stack) : null
	                    });
	                }
	                // Show recovery dialog instead of silently failing
	                _loadError = e;
	            }
            return null;
        }

        let _loadError = null;
	        function showSaveRecoveryDialog() {
	            if (!_loadError) return;
	            const recoveryError = _loadError;
	            _loadError = null;
	            if (typeof MLFSaveRecoveryUI !== 'undefined' && MLFSaveRecoveryUI && typeof MLFSaveRecoveryUI.showSaveRecoveryDialog === 'function') {
	                MLFSaveRecoveryUI.showSaveRecoveryDialog({
	                    error: recoveryError,
	                    storageKey: STORAGE_KEYS.gameSave,
	                    localStorageRef: localStorage,
	                    reloadLocation: location,
	                    diagnostics: (typeof MLFDiagnostics !== 'undefined') ? MLFDiagnostics : null,
	                    diagnosticsUI: (typeof MLFDiagnosticsUI !== 'undefined') ? MLFDiagnosticsUI : null,
	                    openDiagnosticsReport: (typeof openDiagnosticsReport === 'function') ? openDiagnosticsReport : null,
	                    suppressUnloadAutosaveForReload,
	                    onStartFreshReset: function onStartFreshReset() {
	                        _lastSavedStorageSnapshot = null;
	                    },
	                    announce
	                });
	                return;
	            }
	            if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics && typeof MLFDiagnostics.error === 'function') {
	                MLFDiagnostics.error('UI', 'Save recovery dialog UI module missing; could not display recovery dialog.', {
	                    error: String(recoveryError && recoveryError.message ? recoveryError.message : recoveryError)
	                });
	            }
	        }

        // ==================== SAVE EXPORT/IMPORT (Item 47) ====================
        function exportSaveData() {
            try {
                syncActivePetToArray();
                const exportState = JSON.parse(JSON.stringify(gameState));
                delete exportState._offlineChanges;
                const data = JSON.stringify(exportState, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `my-little-friend-save-${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Save data exported!', '#66BB6A');
                announce('Save data exported successfully.');
            } catch (e) {
                showToast('Export failed: ' + e.message, '#EF5350');
            }
        }

        function importSaveData() {
            function isValidImport(data) {
                function isFiniteNum(value) {
                    return typeof value === 'number' && Number.isFinite(value);
                }
                function hasValidCorePet(pet) {
                    const energyOk = pet && (typeof pet.energy === 'undefined' || isFiniteNum(pet.energy));
                    return !!(pet &&
                        typeof pet === 'object' &&
                        isFiniteNum(pet.hunger) &&
                        isFiniteNum(pet.cleanliness) &&
                        isFiniteNum(pet.happiness) &&
                        energyOk &&
                        isValidPetType(pet.type));
                }
                if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
                if (!['egg', 'hatching', 'pet'].includes(data.phase)) return false;
                if (data.phase === 'pet') {
                    const hasValidPetObject = hasValidCorePet(data.pet);
                    const hasValidPetArray = Array.isArray(data.pets) && data.pets.some((p) => hasValidCorePet(p));
                    if (!hasValidPetObject && !hasValidPetArray) return false;
                }
                if (data.pet && typeof data.pet !== 'object') return false;
                if (data.pets && !Array.isArray(data.pets)) return false;
                if (data.activePetIndex != null && (!Number.isInteger(data.activePetIndex) || data.activePetIndex < 0)) return false;
                return true;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const data = JSON.parse(evt.target.result);
                        if (!isValidImport(data)) {
                            showToast('Invalid save file!', '#EF5350');
                            return;
                        }
                        const imported = JSON.stringify(data);
                        localStorage.setItem(STORAGE_KEYS.gameSave, imported);
                        _lastSavedStorageSnapshot = imported;
                        suppressUnloadAutosaveForReload();
                        showToast('Save data imported! Reloading...', '#66BB6A');
                        announce('Save data imported. The game will reload.', true);
                        setTimeout(() => location.reload(), 1500);
                    } catch (err) {
                        showToast('Failed to import: invalid file format', '#EF5350');
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        }

        // ==================== PET CREATION ====================

        function getUnlockedPetTypes() {
            const adultsRaised = gameState.adultsRaised || 0;
            return Object.keys(PET_TYPES).filter(type => {
                const data = PET_TYPES[type];
                if (!data.mythical) return true;
                return adultsRaised >= (data.unlockRequirement || 0);
            });
        }

        function isMythicalUnlocked(type) {
            const data = PET_TYPES[type];
            if (!data || !data.mythical) return true;
            return (gameState.adultsRaised || 0) >= (data.unlockRequirement || 0);
        }

        function getEggTypeForPet(petType) {
            for (const [eggType, eggData] of Object.entries(EGG_TYPES)) {
                if (eggData.petTypes.includes(petType)) {
                    return eggType;
                }
            }
            return 'furry'; // Default fallback
        }

        function initializeNewEgg() {
            const types = getUnlockedPetTypes();
            const petType = randomFromArray(types);
            const eggType = getEggTypeForPet(petType);

            gameState.phase = 'egg';
            gameState.eggTaps = 0;
            gameState.eggType = eggType;
            gameState.pendingPetType = petType;
            gameState.pet = null;
            // Clear stale pets on full reset (not when adopting additional)
            if (!gameState.adoptingAdditional) {
                gameState.pets = [];
                gameState.activePetIndex = 0;
                gameState.relationships = {};
                gameState.household = {
                    activePetId: null,
                    petsById: {},
                    relationships: {},
                    lastSimulatedAt: Date.now(),
                    simVersion: (typeof MLFHouseholdSimulator !== 'undefined' && MLFHouseholdSimulator && Number.isInteger(MLFHouseholdSimulator.SIM_VERSION))
                        ? MLFHouseholdSimulator.SIM_VERSION
                        : 1
                };
            }
            saveGame();
        }

        function createPet(specificType) {
            let type = specificType || gameState.pendingPetType || randomFromArray(getUnlockedPetTypes());
            if (!getAllPetTypeData(type)) {
                const unlocked = getUnlockedPetTypes();
                type = unlocked.find(t => getAllPetTypeData(t)) || Object.keys(PET_TYPES)[0];
            }
            const petData = getAllPetTypeData(type);
            const color = randomFromArray(petData.colors);

            // Assign a unique ID to each pet
            if (typeof gameState.nextPetId !== 'number' || isNaN(gameState.nextPetId)) {
                let maxId = 0;
                if (gameState.pets) gameState.pets.forEach(p => { if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id; });
                gameState.nextPetId = maxId + 1;
            }
            const petId = gameState.nextPetId;
            gameState.nextPetId = petId + 1;

            // Assign a random personality trait
            const personality = getRandomPersonality();

            // Track personality for badges
            if (!gameState.personalitiesSeen) gameState.personalitiesSeen = {};
            gameState.personalitiesSeen[personality] = true;

            return {
                id: petId,
                type: type,
                name: petData.name,
                color: color,
                pattern: 'solid', // Default pattern
                accessories: [], // Array of accessory IDs
                hunger: 70,
                cleanliness: 70,
                happiness: 70,
                energy: 70,
                careActions: 0,
                growthStage: 'baby',
                birthdate: Date.now(), // Timestamp of when pet was born
                careHistory: [], // Track stats over time for care quality
                neglectCount: 0, // Track how many times stats dropped critically low
                careQuality: 'average', // Current care quality level
                careVariant: 'normal', // Appearance variant based on care
                evolutionStage: 'base', // 'base' or 'evolved'
                lastGrowthStage: 'baby', // Track last stage for birthday celebrations
                unlockedAccessories: [], // Accessories unlocked through milestones
                personality: personality, // Personality trait (lazy, energetic, curious, shy, playful, grumpy)
                personalityWarmth: {}, // Track warmth/bond with other pets for shy personality
                // New narrative tracking fields
                _seenMemoryMoments: {},    // Track which memory moments have been shown
                _seenSeasonalEvents: {},   // Track one-time seasonal events
                _weatherSeen: {},          // Track first-time weather encounters
                _roomActionCounts: { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 },
                _neglectRecoveryStep: 0,   // Track recovery arc after neglect
                _isNeglected: false,       // Whether pet is currently in neglected state
                _mentorId: null,           // ID of elder pet mentoring this one
                _farewellMessage: ''       // Player's farewell message on retirement
            };
        }

        // ==================== MULTI-PET HELPERS ====================

        function getActivePet() {
            return gameState.pet;
        }

        function getPetCount() {
            return gameState.pets ? gameState.pets.length : (gameState.pet ? 1 : 0);
        }

        function canAdoptMore() {
            return getPetCount() < MAX_PETS;
        }

        function switchActivePet(index) {
            if (!gameState.pets || index < 0 || index >= gameState.pets.length) return false;
            // Save current pet stats back to pets array
            if (gameState.pet && gameState.activePetIndex < gameState.pets.length) {
                gameState.pets[gameState.activePetIndex] = gameState.pet;
            }
            gameState.activePetIndex = index;
            gameState.pet = gameState.pets[index];
            saveGame();
            return true;
        }

        function syncActivePetToArray() {
            if (gameState.pet && gameState.pets && gameState.activePetIndex >= 0 && gameState.activePetIndex < gameState.pets.length) {
                gameState.pets[gameState.activePetIndex] = gameState.pet;
            }
        }

        function addPetToFamily(pet) {
            if (!gameState.pets) gameState.pets = [];
            gameState.pets.push(pet);
            // Initialize relationships with all existing pets
            if (!gameState.relationships) gameState.relationships = {};
            for (let i = 0; i < gameState.pets.length - 1; i++) {
                const existingPet = gameState.pets[i];
                const key = getRelationshipKey(existingPet.id, pet.id);
                if (!gameState.relationships[key]) {
                    gameState.relationships[key] = {
                        points: 0,
                        lastInteraction: 0,
                        interactionCount: 0
                    };
                }
            }
        }

        function getRelationshipKey(id1, id2) {
            return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        }

        function getRelationship(pet1Id, pet2Id) {
            if (!gameState.relationships) gameState.relationships = {};
            const key = getRelationshipKey(pet1Id, pet2Id);
            if (!gameState.relationships[key]) {
                gameState.relationships[key] = {
                    points: 0,
                    lastInteraction: 0,
                    interactionCount: 0
                };
            }
            return gameState.relationships[key];
        }

        function addRelationshipPoints(pet1Id, pet2Id, points) {
            const rel = getRelationship(pet1Id, pet2Id);
            const prevLevel = getRelationshipLevel(rel.points);
            // Apply personality and elder modifiers to relationship gains
            let adjustedPoints = points;
            if (gameState.pets) {
                const p1 = gameState.pets.find(p => p && p.id === pet1Id);
                const p2 = gameState.pets.find(p => p && p.id === pet2Id);
                if (p1) {
                    adjustedPoints *= getPersonalityRelationshipModifier(p1);
                    if (p1.growthStage === 'elder') adjustedPoints *= ELDER_CONFIG.wisdomRelationshipBonus;
                }
                if (p2) {
                    adjustedPoints *= getPersonalityRelationshipModifier(p2);
                    if (p2.growthStage === 'elder') adjustedPoints *= ELDER_CONFIG.wisdomRelationshipBonus;
                }
                // Average the two modifiers if both applied, preserving elder bonus
                if (p1 && p2) {
                    const avgPersonalityMod = (getPersonalityRelationshipModifier(p1) + getPersonalityRelationshipModifier(p2)) / 2;
                    let elderMod = 1;
                    if (p1.growthStage === 'elder') elderMod *= ELDER_CONFIG.wisdomRelationshipBonus;
                    if (p2.growthStage === 'elder') elderMod *= ELDER_CONFIG.wisdomRelationshipBonus;
                    adjustedPoints = points * avgPersonalityMod * elderMod;
                }
            }
            rel.points = clamp(rel.points + Math.round(adjustedPoints), 0, 300);
            const newLevel = getRelationshipLevel(rel.points);
            rel.lastInteraction = Date.now();

            // Return level change info
            if (prevLevel !== newLevel) {
                const prevIdx = RELATIONSHIP_ORDER.indexOf(prevLevel);
                const newIdx = RELATIONSHIP_ORDER.indexOf(newLevel);
                return {
                    changed: true,
                    from: prevLevel,
                    to: newLevel,
                    improved: newIdx > prevIdx
                };
            }
            return { changed: false };
        }

        // Perform an interaction between two pets
        function performPetInteraction(interactionId, pet1Index, pet2Index) {
            const interaction = PET_INTERACTIONS[interactionId];
            if (!interaction) return null;

            if (pet1Index === pet2Index) return null; // Prevent self-interaction

            const pet1 = gameState.pets[pet1Index];
            const pet2 = gameState.pets[pet2Index];
            if (!pet1 || !pet2) return null;

            // Check per-interaction-type cooldown
            const rel = getRelationship(pet1.id, pet2.id);
            const now = Date.now();
            if (!rel.lastInteractionByType) rel.lastInteractionByType = {};
            const lastTime = rel.lastInteractionByType[interactionId] || 0;
            if (now - lastTime < interaction.cooldown) {
                return { success: false, reason: 'cooldown' };
            }

            // Get relationship bonus
            const levelData = RELATIONSHIP_LEVELS[getRelationshipLevel(rel.points)];
            const bonus = levelData ? levelData.interactionBonus : 1.0;

            // Apply effects to both pets
            for (const [stat, amount] of Object.entries(interaction.effects)) {
                const boosted = Math.round(amount * bonus);
                if (pet1[stat] !== undefined) pet1[stat] = clamp(pet1[stat] + boosted, 0, 100);
                if (pet2[stat] !== undefined) pet2[stat] = clamp(pet2[stat] + boosted, 0, 100);
            }

            // Increment care actions for both
            pet1.careActions = (pet1.careActions || 0) + 1;
            pet2.careActions = (pet2.careActions || 0) + 1;

            // Record per-type cooldown timestamp and count this interaction once
            rel.lastInteractionByType[interactionId] = now;
            rel.interactionCount = (rel.interactionCount || 0) + 1;

            // Add relationship points
            const relationshipRewardMult = typeof getRewardRelationshipMultiplier === 'function' ? getRewardRelationshipMultiplier() : 1;
            const relGain = Math.max(1, Math.round(interaction.relationshipGain * relationshipRewardMult));
            const relChange = addRelationshipPoints(pet1.id, pet2.id, relGain);
            if (typeof incrementDailyProgress === 'function') {
                incrementDailyProgress('bondEvents', 1);
                incrementDailyProgress('masteryPoints', 2);
            }

            // Sync active pet — the active pet could be either participant
            gameState.pet = gameState.pets[gameState.activePetIndex];

            // Pick a random message
            const message = randomFromArray(interaction.messages);
            const pet1Name = pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet';
            const pet2Name = pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet';
            if (relChange && relChange.changed && relChange.improved) {
                const levelData = RELATIONSHIP_LEVELS[relChange.to];
                if (levelData) addJournalEntry('💞', `${pet1Name} and ${pet2Name} reached ${levelData.label} relationship.`);
            }

            saveGame();

            return {
                success: true,
                message: `${pet1Name} & ${pet2Name} ${message}`,
                interaction: interaction,
                relationshipChange: relChange,
                pet1Name: pet1Name,
                pet2Name: pet2Name
            };
        }


        // ==================== VISIBILITY HANDLING ====================

        // Handle page visibility changes
	        document.addEventListener('visibilitychange', () => {
	            if (document.hidden) {
	                if (typeof resetMinigameRewardSession === 'function') resetMinigameRewardSession('background');
	                // Page is hidden, save current state
	                saveGame();
	            } else {
                // Page is visible again, apply any decay that occurred while away
                if (gameState.phase === 'pet' && gameState.pet) {
                    // Pause the decay timer while we overwrite pet stats to avoid
                    // the timer firing during or right after the load, which could
                    // double-apply decay or have its changes overwritten.
                    stopDecayTimer();
                    _petPhaseTimersRunning = false;

                    const saved = loadGame();
                    if (saved && saved.pet) {
                        // Restore all pets (decay was applied to all in loadGame)
                        if (saved.pets && saved.pets.length > 0) {
                            gameState.pets = saved.pets;
                            gameState.activePetIndex = saved.activePetIndex || 0;
                            if (gameState.activePetIndex < 0 || gameState.activePetIndex >= gameState.pets.length) {
                                gameState.activePetIndex = 0;
                            }
                            gameState.pet = gameState.pets[gameState.activePetIndex] || saved.pet;
                        } else {
                            // Restore all pet fields from the loaded save to avoid
                            // losing careActions, neglectCount, careQuality, etc.
                            Object.assign(gameState.pet, saved.pet);
                        }

                        // Restore garden state (growth may have happened while away)
                        if (saved.garden) {
                            gameState.garden = saved.garden;
                        }

                        // Restore fields that may have changed in another tab
                        if (saved.minigamePlayCounts) gameState.minigamePlayCounts = saved.minigamePlayCounts;
                        if (saved.minigameHighScores) gameState.minigameHighScores = saved.minigameHighScores;
                        if (saved.minigameScoreHistory) gameState.minigameScoreHistory = saved.minigameScoreHistory;
                        if (saved.relationships) gameState.relationships = saved.relationships;
                        if (saved.household) gameState.household = saved.household;
                        if (saved.furniture) gameState.furniture = saved.furniture;
                        if (saved.roomUnlocks) gameState.roomUnlocks = saved.roomUnlocks;
                        if (saved.roomUpgrades) gameState.roomUpgrades = saved.roomUpgrades;
                        if (saved.roomCustomizations) gameState.roomCustomizations = saved.roomCustomizations;
                        if (saved.badges) gameState.badges = saved.badges;
                        if (saved.stickers) gameState.stickers = saved.stickers;
                        if (saved.trophies) gameState.trophies = saved.trophies;
                        if (saved.streak) gameState.streak = saved.streak;
                        if (saved.dailyChecklist) gameState.dailyChecklist = saved.dailyChecklist;
                        if (saved.competition) gameState.competition = normalizeCompetitionState(saved.competition);
                        if (saved.exploration) gameState.exploration = saved.exploration;
                        if (saved.economy) gameState.economy = saved.economy;
                        ensureEconomyState();
                        if (saved.breedingEggs) {
                            gameState.breedingEggs = saved.breedingEggs.filter((egg) => egg && typeof egg === 'object');
                            gameState.breedingEggs.forEach((egg) => ensureBreedingEggData(egg));
                        }
                        if (saved.hatchedBreedingEggs) gameState.hatchedBreedingEggs = saved.hatchedBreedingEggs;
                        if (typeof saved.totalFeedCount === 'number') gameState.totalFeedCount = saved.totalFeedCount;
                        if (typeof saved.adultsRaised === 'number') gameState.adultsRaised = saved.adultsRaised;
                        ensureRoomSystemsState();

                        // Update time of day (may have changed while tab was hidden)
                        const newTimeOfDay = getTimeOfDay();
                        if (gameState.timeOfDay !== newTimeOfDay) {
                            gameState.timeOfDay = newTimeOfDay;
                            updateDayNightDisplay();
                        }

                        // Update season
                        gameState.season = getCurrentSeason();
                        ensureExplorationState();
                        updateExplorationUnlocks(true);
                        resolveExpeditionIfReady(false, true);

                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        if (typeof updateRoomNavBadge === 'function') updateRoomNavBadge();

                        // Re-render garden if currently viewing it
                        if (gameState.currentRoom === 'garden') {
                            renderGardenUI();
                        }

                        saveGame();
                    }

                    // Restart the decay timer now that stats are settled
                    startDecayTimer();
                    _petPhaseTimersRunning = true;
                }
            }
        });

        // showPetCodex(), showStatsScreen(), and startNewPet() are defined in ui.js

        // ==================== INITIALIZATION ====================

        function init() {
            // Initialize dark mode from saved preference
            try {
                const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
                if (savedTheme) {
                    document.documentElement.setAttribute('data-theme', savedTheme);
                    const meta = document.querySelector('meta[name="theme-color"]');
                    if (meta) meta.content = savedTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
                }
            } catch (e) {}

            // Stop any existing timers
            stopDecayTimer();
            stopGardenGrowTimer();
            if (localReminderInterval) {
                clearInterval(localReminderInterval);
                localReminderInterval = null;
            }
            _petPhaseTimersRunning = false;
            _petPhaseLastRoom = null;

            const saved = loadGame();
            if (saved) {
                if (typeof StateManager === 'undefined' || !StateManager || typeof StateManager.hydrate !== 'function') {
                    throw new Error('StateManager.hydrate is required for the canonical load path.');
                }
                const hydratedRoot = StateManager.hydrate(saved, { reason: 'init-load' });
                if (hydratedRoot) gameState = hydratedRoot;
            }
            ensureHouseholdStateForRuntime(gameState, Date.now());
            if (!saved && _loadError) {
                showSaveRecoveryDialog();
            }

            // Ensure weather state exists
            if (!gameState.weather || !WEATHER_TYPES[gameState.weather]) {
                gameState.weather = 'sunny';
            }
            if (!gameState.lastWeatherChange) {
                gameState.lastWeatherChange = Date.now();
            }

            // Ensure season is current
            gameState.season = getCurrentSeason();

            // Ensure garden state exists
	            if (!gameState.garden || typeof gameState.garden !== 'object') {
	                gameState.garden = { plots: [], inventory: {}, lastGrowTick: Date.now(), totalHarvests: 0, expansionTier: 0 };
	            }
	            if (typeof gameState.garden.expansionTier !== 'number' || !Number.isFinite(gameState.garden.expansionTier)) {
	                gameState.garden.expansionTier = 0;
	            }

            // Ensure adultsRaised exists
            if (typeof gameState.adultsRaised !== 'number') {
                gameState.adultsRaised = 0;
            }
            ensureRoomSystemsState();
            ensureExplorationState();
            ensureEconomyState();
            ensureMiniGameExpansionState();
            ensureReminderState();
            ensureMasteryState();
            updateExplorationUnlocks(true);
            resolveExpeditionIfReady(false, true);

            // Initialize achievement/daily systems
            if (!gameState.achievements) gameState.achievements = {};
            if (!gameState.roomsVisited) gameState.roomsVisited = {};
            if (!gameState.weatherSeen) gameState.weatherSeen = {};
            trackWeather();
            trackRoomVisit(gameState.currentRoom || 'bedroom');
            initDailyChecklist();
            initWeeklyArc();

            // Initialize rewards systems
            if (!gameState.badges) gameState.badges = {};
            if (!gameState.stickers) gameState.stickers = {};
            if (!gameState.trophies) gameState.trophies = {};
            if (!gameState.streak || typeof gameState.streak !== 'object') {
                gameState.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
            }
            if (!Array.isArray(gameState.streak.claimedMilestones)) gameState.streak.claimedMilestones = [];
            if (typeof gameState.totalMedicineUses !== 'number') gameState.totalMedicineUses = 0;
            if (typeof gameState.totalGroomCount !== 'number') gameState.totalGroomCount = 0;
            if (typeof gameState.totalDailyCompletions !== 'number') gameState.totalDailyCompletions = 0;

            // Ensure caretaker system state
            if (!gameState.caretakerActionCounts) {
                gameState.caretakerActionCounts = { feed: 0, wash: 0, play: 0, sleep: 0, medicine: 0, groom: 0, exercise: 0, treat: 0, cuddle: 0 };
            }
            if (!gameState.caretakerTitle) gameState.caretakerTitle = 'newcomer';
            if (!gameState.lastCaretakerTitle) gameState.lastCaretakerTitle = gameState.caretakerTitle;
            if (!gameState.previousWeather) gameState.previousWeather = 'sunny';
            if (typeof gameState.lastSeasonalEventCheck !== 'number') gameState.lastSeasonalEventCheck = 0;

            // Update daily streak
            updateStreak();
            refreshMasteryTracks();
            getGoalLadder();
            runLoginMemoryHooks();
            checkReminderSignals();
            startReminderMonitor();
            // Run initial unlock checks and surface newly-qualified items.
            const startupAchievements = checkAchievements() || [];
            const startupBadges = checkBadges() || [];
            const startupTrophies = checkTrophies() || [];
            const startupStickers = checkStickers() || [];
            // Save after streak/unlock initialization
            saveGame();
            let startupToastDelay = 900;
            startupAchievements.forEach((ach) => {
                setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), startupToastDelay);
                startupToastDelay += 220;
            });
            startupBadges.forEach((badge) => {
                const badgeColor = (typeof BADGE_TIERS !== 'undefined' && BADGE_TIERS[badge.tier]) ? BADGE_TIERS[badge.tier].color : '#FFD700';
                setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor), startupToastDelay);
                startupToastDelay += 220;
            });
            startupStickers.forEach((sticker) => {
                setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), startupToastDelay);
                startupToastDelay += 220;
            });
            startupTrophies.forEach((trophy) => {
                setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), startupToastDelay);
                startupToastDelay += 220;
            });

            // Ensure multi-pet fields exist
            if (!Array.isArray(gameState.pets)) {
                gameState.pets = gameState.pet ? [gameState.pet] : [];
            }
            if (!Number.isInteger(gameState.activePetIndex) || gameState.activePetIndex < 0) {
                gameState.activePetIndex = 0;
            }
            if (!gameState.relationships) {
                gameState.relationships = {};
            }
            repairPetIdsAndNextId(gameState);

            if (gameState.phase === 'pet' && gameState.pet) {
                renderPetPhase();
                // Ensure garden timer is running even if renderPetPhase() skipped
                // its timer-start logic (e.g. _petPhaseTimersRunning was stale).
                if (!gardenGrowInterval) {
                    startGardenGrowTimer();
                }
                const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];
                if (petData) {
                    const mood = getMood(gameState.pet);
                    const weatherData = WEATHER_TYPES[gameState.weather];
                    const seasonData = SEASONS[gameState.season];
                    const moodGreeting = mood === 'happy' ? 'is so happy to see you!' :
                                         mood === 'sad' ? 'missed you and needs some care!' :
                                         'is glad you\'re back!';
                    announce(`Welcome back! Your ${petData.name} ${moodGreeting}`);
                }
                const asyncReadiness = (typeof getAsyncLoopReadinessSummary === 'function')
                    ? getAsyncLoopReadinessSummary()
                    : { items: [], top: null };
                if (asyncReadiness && asyncReadiness.top && typeof showToast === 'function') {
                    setTimeout(() => {
                        showToast(`${asyncReadiness.top.icon} ${asyncReadiness.top.text}`, '#4ECDC4');
                    }, 700);
                }
                if (gameState.goalLadder && gameState.goalLadder.now && gameState.goalLadder.next) {
                    setTimeout(() => {
                        showToast(`🧭 Now: ${gameState.goalLadder.now.label} · Next: ${gameState.goalLadder.next.label}`, '#42A5F5');
                    }, (asyncReadiness && asyncReadiness.top) ? 1300 : 900);
                }
                // Show welcome-back summary modal if pet was away for a while (Feature 7)
                if (gameState._offlineChanges) {
                    const oc = gameState._offlineChanges;
                    const hadOfflineChanges = true;
                    if (typeof showWelcomeBackModal === 'function') {
                        setTimeout(() => {
                            showWelcomeBackModal(oc, gameState.pet);
                        }, 600);
                    } else {
                        // Fallback to toast if modal function not loaded yet
                        const hrs = Math.floor(oc.minutes / 60);
                        const mins = oc.minutes % 60;
                        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                        const parts = [];
                        if (oc.hunger !== 0) parts.push(`Hunger ${oc.hunger > 0 ? '+' : ''}${oc.hunger}`);
                        if (oc.energy !== 0) parts.push(`Energy ${oc.energy > 0 ? '+' : ''}${oc.energy}`);
                        if (oc.happiness !== 0) parts.push(`Happiness ${oc.happiness > 0 ? '+' : ''}${oc.happiness}`);
                        if (oc.cleanliness !== 0) parts.push(`Clean ${oc.cleanliness > 0 ? '+' : ''}${oc.cleanliness}`);
                        if (parts.length > 0) {
                            setTimeout(() => {
                                showToast(`Away ${timeStr}: ${parts.join(', ')}`, '#7C6BFF');
                            }, 800);
                        }
                    }
                    delete gameState._offlineChanges;
                    saveGame();
                    gameState._hadOfflineChangesOnLoad = hadOfflineChanges;
                } else {
                    gameState._hadOfflineChangesOnLoad = false;
                }
                // Show streak notification if bonus available (only if no welcome-back modal shown)
                if (gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed && !gameState._hadOfflineChangesOnLoad) {
                    setTimeout(() => {
                        showToast(`🔥 ${gameState.streak.current}-day streak! Tap Rewards to claim bonus!`, '#FF6D00');
                    }, (asyncReadiness && asyncReadiness.top) ? 2100 : 1500);
                }
                delete gameState._hadOfflineChangesOnLoad;
                checkReminderSignals();
            } else {
                // Reset to egg phase if not in pet phase
                gameState.phase = 'egg';
                gameState.eggTaps = gameState.eggTaps || 0;
                renderEggPhase();
                announce('Welcome to My Little Friend! Tap the egg to hatch your new pet!');

                // Show tutorial on first visit
                try {
                    const tutorialSeen = localStorage.getItem(STORAGE_KEYS.tutorialDone);
                    if (!tutorialSeen && !saved) {
                        setTimeout(showTutorial, 500);
                    }
                } catch (e) {
                    // Ignore storage errors
                }
            }
        }

        // Dismiss the splash/loading screen after init completes
        function dismissSplash() {
            const splash = document.getElementById('splash-screen');
            if (!splash) return;
            const minShowTime = 800;
            const elapsed = performance.now();
            const remaining = Math.max(0, minShowTime - elapsed);
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 300);
            }, remaining);
        }

        // Start the game when page loads (or immediately if loaded after DOMContentLoaded).
        let _coreBootStarted = false;
        function bootCoreRuntime() {
            if (_coreBootStarted) return;
            if (typeof window !== 'undefined' && window.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ === false) return;
            _coreBootStarted = true;
            init();
            setupGlobalUiHapticCoverage();
            dismissSplash();
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('mlf:runtime-scripts-loaded', bootCoreRuntime, { once: true });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootCoreRuntime, { once: true });
        } else {
            bootCoreRuntime();
        }

        // ==================== OFFLINE INDICATOR (Item 42) ====================
        function updateOnlineStatus() {
            let indicator = document.getElementById('offline-indicator');
            if (!navigator.onLine) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'offline-indicator';
                    indicator.className = 'offline-indicator';
                    indicator.setAttribute('role', 'status');
                    indicator.setAttribute('aria-live', 'assertive');
                    indicator.textContent = 'You are offline — progress is saved locally';
                    document.body.appendChild(indicator);
                }
                announce('You are now offline. Progress will be saved locally.', true);
            } else if (indicator) {
                indicator.classList.add('online');
                indicator.textContent = 'Back online!';
                announce('You are back online.');
                setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 2500);
            }
        }
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
