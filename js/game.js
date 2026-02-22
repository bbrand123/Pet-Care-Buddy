	        // Changelog (Retention pass): Added streak protection + optional prestige celebration, Journey/Bond/novelty systems, softer economy decay, reactivation memory hooks, and local reminder-center triggers.
        // ==================== GAME STATE ====================

        // Cross-file flags (also declared in ui.js) — redeclare here for load-order safety
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;

        function generatePlayerId() {
            return 'pid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        }

        const SAVE_SCHEMA_VERSION = (typeof ECONOMY_HARDENING_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_HARDENING_BALANCE.saveSchemaVersion))
            ? Math.max(1, Math.floor(ECONOMY_HARDENING_BALANCE.saveSchemaVersion))
            : 3;
        const SAVE_INTEGRITY_PEPPER = 'mlf_local_econ_pepper_v1'; // TODO: Server authority required for real anti-cheat.
        let _sessionCoinGainTotal = 0;
        let _lastEconomyRateLimitToastAt = 0;
        let _lastSuspiciousToastAt = 0;
        let _lastTimeJumpToastAt = 0;
        let _timeSessionPerfAnchor = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : null;
        let _timeSessionWallAnchor = Date.now();

        function getHardeningCfg(path, fallback) {
            const root = (typeof ECONOMY_HARDENING_BALANCE !== 'undefined' && ECONOMY_HARDENING_BALANCE) || null;
            if (!root || !path) return fallback;
            const parts = String(path).split('.');
            let cur = root;
            for (let i = 0; i < parts.length; i++) {
                if (!cur || typeof cur !== 'object') return fallback;
                cur = cur[parts[i]];
            }
            return cur == null ? fallback : cur;
        }

        function createDefaultSecurityState() {
            return {
                suspicious: false,
                suspiciousReason: '',
                integrityMismatchCount: 0,
                lastIntegrityCheckAt: 0,
                lastIntegrityHash: '',
                coinGainMinute: { windowStart: 0, earned: 0 },
                coinGainSession: { earned: 0 },
                lastWarningAt: 0
            };
        }

        function ensureSecurityState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            if (!state.security || typeof state.security !== 'object' || Array.isArray(state.security)) {
                state.security = createDefaultSecurityState();
            }
            const sec = state.security;
            if (typeof sec.suspicious !== 'boolean') sec.suspicious = false;
            if (typeof sec.suspiciousReason !== 'string') sec.suspiciousReason = '';
            if (!Number.isFinite(sec.integrityMismatchCount)) sec.integrityMismatchCount = 0;
            if (!Number.isFinite(sec.lastIntegrityCheckAt)) sec.lastIntegrityCheckAt = 0;
            if (typeof sec.lastIntegrityHash !== 'string') sec.lastIntegrityHash = '';
            if (!sec.coinGainMinute || typeof sec.coinGainMinute !== 'object') sec.coinGainMinute = { windowStart: 0, earned: 0 };
            if (!Number.isFinite(sec.coinGainMinute.windowStart)) sec.coinGainMinute.windowStart = 0;
            if (!Number.isFinite(sec.coinGainMinute.earned)) sec.coinGainMinute.earned = 0;
            if (!sec.coinGainSession || typeof sec.coinGainSession !== 'object') sec.coinGainSession = { earned: 0 };
            if (!Number.isFinite(sec.coinGainSession.earned)) sec.coinGainSession.earned = 0;
            if (!Number.isFinite(sec.lastWarningAt)) sec.lastWarningAt = 0;
            return sec;
        }

        function createDefaultTimeHardeningState() {
            return {
                lastSeenWallClock: 0,
                lastSeenPerf: 0,
                lastSeenSessionWallClock: 0,
                jumpDetectedAt: 0,
                jumpWallDeltaMs: 0,
                jumpPerfDriftMs: 0,
                stabilizeUntil: 0,
                lastNotifiedAt: 0,
                suppressedDailyResetUntil: 0,
                lastHandledJumpAt: 0
            };
        }

        function ensureTimeHardeningState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            if (!state.timeHardening || typeof state.timeHardening !== 'object' || Array.isArray(state.timeHardening)) {
                state.timeHardening = createDefaultTimeHardeningState();
            }
            const t = state.timeHardening;
            Object.keys(createDefaultTimeHardeningState()).forEach((key) => {
                if (!Number.isFinite(t[key])) t[key] = 0;
            });
            return t;
        }

        function showHardeningToast(type, message, color) {
            const now = Date.now();
            if (type === 'time') {
                if ((now - _lastTimeJumpToastAt) < 45000) return;
                _lastTimeJumpToastAt = now;
            } else if (type === 'suspicious') {
                if ((now - _lastSuspiciousToastAt) < 45000) return;
                _lastSuspiciousToastAt = now;
            } else if (type === 'rate-limit') {
                if ((now - _lastEconomyRateLimitToastAt) < 30000) return;
                _lastEconomyRateLimitToastAt = now;
            }
            if (typeof showToast === 'function') showToast(message, color || '#FFA726');
            if (typeof announce === 'function') announce(message, true);
        }

        function isTimeStabilizationActive(targetState, nowMs) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const timeState = ensureTimeHardeningState(state);
            const now = Number.isFinite(nowMs) ? nowMs : Date.now();
            return Number.isFinite(timeState.stabilizeUntil) && timeState.stabilizeUntil > now;
        }

        function checkAndRecordTimeJump(targetState, label, opts) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const timeState = ensureTimeHardeningState(state);
            const cfg = getHardeningCfg('timeHardening', {}) || {};
            const now = Number.isFinite(opts && opts.now) ? opts.now : Date.now();
            const perfNow = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : 0;
            const backwardThreshold = Math.max(30000, Number(cfg.backwardJumpThresholdMs) || (2 * 60 * 1000));
            const forwardThreshold = Math.max(30000, Number(cfg.forwardJumpThresholdMs) || (4 * 60 * 60 * 1000));
            const stabilizationWindowMs = Math.max(60000, Number(cfg.stabilizationWindowMs) || (10 * 60 * 1000));

            let detected = false;
            let wallDelta = 0;
            let perfDrift = 0;

            if (Number.isFinite(timeState.lastSeenWallClock) && timeState.lastSeenWallClock > 0) {
                wallDelta = now - timeState.lastSeenWallClock;
                if (wallDelta < -backwardThreshold || wallDelta > forwardThreshold) {
                    detected = true;
                }
            }

            if (!detected && Number.isFinite(_timeSessionPerfAnchor) && Number.isFinite(_timeSessionWallAnchor) && perfNow > 0) {
                const expectedWall = _timeSessionWallAnchor + (perfNow - _timeSessionPerfAnchor);
                perfDrift = now - expectedWall;
                const perfThreshold = Math.max(backwardThreshold, Math.min(forwardThreshold, 3 * 60 * 1000));
                if (Math.abs(perfDrift) > perfThreshold) {
                    detected = true;
                }
            }

            if (detected) {
                timeState.jumpDetectedAt = now;
                timeState.jumpWallDeltaMs = wallDelta;
                timeState.jumpPerfDriftMs = perfDrift;
                timeState.stabilizeUntil = now + stabilizationWindowMs;
                timeState.suppressedDailyResetUntil = Math.max(timeState.suppressedDailyResetUntil || 0, now + stabilizationWindowMs);
                timeState.lastHandledJumpAt = now;
                showHardeningToast('time', 'Time changed; progression is temporarily paused/clamped for fairness.', '#FFA726');
                balanceDebugLog('TimeJumpDetected', { label: label || 'unknown', wallDelta, perfDrift, stabilizeUntil: timeState.stabilizeUntil });
                // Reset session anchors after a detected jump so repeated checks do not re-fire.
                _timeSessionPerfAnchor = perfNow > 0 ? perfNow : null;
                _timeSessionWallAnchor = now;
            } else if (perfNow > 0 && (!Number.isFinite(_timeSessionPerfAnchor) || _timeSessionPerfAnchor === null)) {
                _timeSessionPerfAnchor = perfNow;
                _timeSessionWallAnchor = now;
            }

            timeState.lastSeenWallClock = now;
            if (perfNow > 0) timeState.lastSeenPerf = perfNow;
            timeState.lastSeenSessionWallClock = now;
            return { detected, wallDeltaMs: wallDelta, perfDriftMs: perfDrift, stabilizationActive: isTimeStabilizationActive(state, now) };
        }

        function clampElapsedForHardening(elapsedMs, channel) {
            const cfg = getHardeningCfg('timeHardening', {}) || {};
            const elapsed = Math.max(0, Number(elapsedMs) || 0);
            if (channel === 'garden') {
                const cap = Math.max(5 * 60 * 1000, Number(cfg.maxGardenOfflineAdvanceMs) || (8 * 60 * 60 * 1000));
                return Math.min(elapsed, cap);
            }
            if (channel === 'needs') {
                const cap = Math.max(10 * 60 * 1000, Number(cfg.maxNeedsOfflineAdvanceMs) || (12 * 60 * 60 * 1000));
                return Math.min(elapsed, cap);
            }
            if (channel === 'expedition') {
                const cap = Math.max(60 * 1000, Number(cfg.maxExpeditionForwardGrantMs) || (20 * 60 * 1000));
                return Math.min(elapsed, cap);
            }
            return elapsed;
        }

        function getIntegrityCriticalSnapshot(stateObj) {
            const state = (stateObj && typeof stateObj === 'object') ? stateObj : gameState;
            const eco = (state.economy && typeof state.economy === 'object') ? state.economy : {};
            const ex = (state.exploration && typeof state.exploration === 'object') ? state.exploration : {};
            let auctionHash = '';
            try {
                auctionHash = String(hashStringToUint(JSON.stringify(loadAuctionHouseData())));
            } catch (e) {}
            return {
                saveVersion: Math.max(1, Math.floor(Number(state.saveVersion) || 1)),
                coins: Math.max(0, Math.floor(Number(eco.coins) || 0)),
                inventory: eco.inventory || {},
                explorationLootInventory: ex.lootInventory || {},
                explorationLootStacks: ex.lootInventoryStacks || {},
                expedition: ex.expedition || null,
                competition: state.competition || {},
                auction: {
                    localSlot: eco.auction || {},
                    auctionHash: auctionHash
                },
                dailyChecklist: state.dailyChecklist || null,
                lastUpdate: Math.floor(Number(state.lastUpdate) || 0)
            };
        }

        function computeIntegrityHashForState(stateObj) {
            try {
                const payload = JSON.stringify(getIntegrityCriticalSnapshot(stateObj));
                return String(hashStringToUint(`${SAVE_INTEGRITY_PEPPER}|${payload}`));
            } catch (e) {
                return '';
            }
        }

        function writeSaveIntegrity(stateObj) {
            const state = (stateObj && typeof stateObj === 'object') ? stateObj : gameState;
            const sec = ensureSecurityState(state);
            const hash = computeIntegrityHashForState(state);
            state.saveVersion = SAVE_SCHEMA_VERSION;
            if (!state.saveIntegrity || typeof state.saveIntegrity !== 'object' || Array.isArray(state.saveIntegrity)) state.saveIntegrity = {};
            state.saveIntegrity.hash = hash;
            state.saveIntegrity.schemaVersion = SAVE_SCHEMA_VERSION;
            state.saveIntegrity.checkedAt = Date.now();
            sec.lastIntegrityHash = hash;
            return hash;
        }

        function verifyLoadedSaveIntegrity(parsedState) {
            const state = parsedState;
            if (!state || typeof state !== 'object') return { ok: true, missing: true };
            const sec = ensureSecurityState(state);
            const expected = state.saveIntegrity && typeof state.saveIntegrity === 'object' ? String(state.saveIntegrity.hash || '') : '';
            const actual = computeIntegrityHashForState(state);
            sec.lastIntegrityCheckAt = Date.now();
            sec.lastIntegrityHash = actual;
            if (!expected) {
                return { ok: true, missing: true, actual };
            }
            if (expected !== actual) {
                sec.suspicious = true;
                sec.suspiciousReason = 'save-integrity-mismatch';
                sec.integrityMismatchCount = (sec.integrityMismatchCount || 0) + 1;
                return { ok: false, expected, actual };
            }
            return { ok: true, actual };
        }

        function isSuspiciousEconomyState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const sec = ensureSecurityState(state);
            return !!sec.suspicious;
        }

        function isAuctionInteractionLocked() {
            const lockEnabled = !!getHardeningCfg('suspiciousAuctionLock', true);
            return lockEnabled && isSuspiciousEconomyState();
        }

        function getSuspiciousRewardMultiplier() {
            return Math.max(0.02, Math.min(1, Number(getHardeningCfg('tamperPenaltyMultiplier', 0.12)) || 0.12));
        }

        function shouldApplySuspiciousRewardPenalty(reason) {
            const text = String(reason || '').toLowerCase();
            if (!text) return false;
            return text.includes('competition')
                || text.includes('auction payout')
                || text.includes('harvest')
                || text.includes('mini-game')
                || text.includes('mystery egg bonus');
        }

        function applyCoinGainRateLimits(rawAmount, reason, targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const sec = ensureSecurityState(state);
            const cfg = getHardeningCfg('coinGainRateLimit', {}) || {};
            const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
            if (amount <= 0) return { amount: 0, minuteMult: 1, sessionMult: 1, suspiciousMult: 1 };
            const now = Date.now();
            const minuteSoftCap = Math.max(100, Number(cfg.minuteSoftCap) || 1400);
            const minuteFalloff = Math.max(0.0001, Number(cfg.minuteFalloffPerCoin) || 0.01);
            const minuteMin = Math.max(0.02, Math.min(1, Number(cfg.minuteMinMultiplier) || 0.08));
            const sessionSoftCap = Math.max(500, Number(cfg.sessionSoftCap) || 18000);
            const sessionFalloff = Math.max(0.00001, Number(cfg.sessionFalloffPerCoin) || 0.0015);
            const sessionMin = Math.max(0.05, Math.min(1, Number(cfg.sessionMinMultiplier) || 0.2));

            if (!Number.isFinite(sec.coinGainMinute.windowStart) || (now - sec.coinGainMinute.windowStart) >= 60000 || sec.coinGainMinute.windowStart <= 0) {
                sec.coinGainMinute.windowStart = now;
                sec.coinGainMinute.earned = 0;
            }
            if (!Number.isFinite(sec.coinGainSession.earned)) sec.coinGainSession.earned = 0;

            const minuteOver = Math.max(0, sec.coinGainMinute.earned - minuteSoftCap);
            const sessionOver = Math.max(0, sec.coinGainSession.earned - sessionSoftCap);
            const minuteMult = minuteOver > 0 ? Math.max(minuteMin, 1 / (1 + (minuteOver * minuteFalloff))) : 1;
            const sessionMult = sessionOver > 0 ? Math.max(sessionMin, 1 / (1 + (sessionOver * sessionFalloff))) : 1;
            const suspiciousMult = (isSuspiciousEconomyState(state) && shouldApplySuspiciousRewardPenalty(reason)) ? getSuspiciousRewardMultiplier() : 1;
            let finalAmount = Math.max(0, Math.floor(amount * minuteMult * sessionMult * suspiciousMult));
            if (amount > 0 && finalAmount <= 0 && (minuteMult < 1 || sessionMult < 1 || suspiciousMult < 1)) finalAmount = 1;

            sec.coinGainMinute.earned += finalAmount;
            sec.coinGainSession.earned += finalAmount;
            _sessionCoinGainTotal += finalAmount;

            if ((minuteMult < 0.999 || sessionMult < 0.999) && typeof showToast === 'function') {
                showHardeningToast('rate-limit', 'High coin gain rate detected: rewards are in diminishing mode.', '#90A4AE');
            }
            if (suspiciousMult < 1) {
                showHardeningToast('suspicious', 'Save integrity warning: some rewards and auction features are limited.', '#EF5350');
            }
            return { amount: finalAmount, minuteMult, sessionMult, suspiciousMult };
        }

        function getTodayStringWithTimeHardening(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const today = typeof getTodayString === 'function'
                ? getTodayString()
                : new Date().toISOString().slice(0, 10);
            const timeState = ensureTimeHardeningState(state);
            if (!isTimeStabilizationActive(state)) return today;
            const currentChecklistDate = state.dailyChecklist && state.dailyChecklist.date ? state.dailyChecklist.date : '';
            if (currentChecklistDate && currentChecklistDate !== today && (timeState.suppressedDailyResetUntil || 0) > Date.now()) {
                showHardeningToast('time', 'Time changed; daily reset is temporarily delayed until time stabilizes.', '#FFA726');
                return currentChecklistDate;
            }
            return today;
        }

        function getWealthPressureDebtPenaltyMultiplier(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const eco = ensureEconomyState(state);
            if (!eco.wealthPressure || typeof eco.wealthPressure !== 'object') return 1;
            const debt = Math.max(0, Number(eco.wealthPressure.unpaidFeeDebt) || 0);
            if (debt <= 0) return 1;
            const per100 = Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureDebtResalePenaltyPer100Coins) || getHardeningCfg('wealthPressure.debtResalePenaltyPer100Coins', 0.03)) || 0.03;
            const maxPenalty = Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureDebtResalePenaltyMax) || getHardeningCfg('wealthPressure.debtResalePenaltyMax', 0.35)) || 0.35;
            const penalty = Math.min(Math.max(0, maxPenalty), Math.max(0, (debt / 100) * per100));
            return Math.max(0.5, 1 - penalty);
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
                auction: { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0, relistTracker: {} },
                totalEarned: 0,
                totalSpent: 0,
                auctionIdentityMigrationDone: false,
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

	        function createDefaultRetentionMetaState() {
	            return {
	                version: 2,
	                streakProtection: {
	                    freezeTokens: 0,
	                    autoUseFreeze: true,
                    lastOutcome: '',
                    lastMissedDays: 0,
                    lastFreezeUsed: 0,
                    lastCheckpointFloor: 0,
                    lastProcessedDate: ''
                },
	                journey: {
	                    tokens: 0,
	                    startedAtDate: null,
	                    objectiveProgress: {},
	                    completedObjectives: {},
	                    chapterCompletions: {},
	                    trackCompletions: {},
	                    claimedRewards: {},
	                    lastProgressAt: 0
	                },
                bond: {
                    xp: 0,
                    level: 1,
                    claimedMilestones: []
                },
	                novelty: {
	                    claimedSchedule: {},
	                    lastWeeklyEventKey: '',
	                    lastClaimedJourneyDay: 0
	                },
	                reminderCenter: {
	                    items: [],
	                    promptDismissed: false,
	                    lastPromptSession: 0,
	                    lastDigestDate: ''
	                },
	                reactivation: {
	                    lastSeenDate: null,
	                    awayDays: 0,
	                    lastActivity: '',
	                    pendingRecap: null,
	                    lastDialogueDate: '',
	                    lastRecapShownDate: ''
	                },
	                onboarding: {
	                    sessionGuideSkipped: false,
	                    reminderPromptSeen: false
	                },
	                debug: {
	                    enabled: false,
	                    panelOpen: false
	                }
	            };
	        }

        function createDefaultGardenState(now) {
            const ts = Number.isFinite(now) ? now : Date.now();
            const mushroomPlots = Array(4).fill(null);
            const flowerPlots = Array(4).fill(null);
            const compostDefaults = (typeof GardenFeaturesCore !== 'undefined' && GardenFeaturesCore.createDefaultCompostState)
                ? GardenFeaturesCore.createDefaultCompostState(ts)
                : { queue: [], active: null, readyFertilizer: 0, maxQueue: 8, lastUpdatedAt: ts };
            const beehiveDefaults = (typeof GardenFeaturesCore !== 'undefined' && GardenFeaturesCore.createDefaultBeehiveState)
                ? GardenFeaturesCore.createDefaultBeehiveState(ts)
                : { placed: false, storedHoney: 0, capacity: 20, progress: 0, lastUpdatedAt: ts };
            return {
                plots: [],
                inventory: {},
                lastGrowTick: ts,
                totalHarvests: 0,
                expansionTier: 0,
                discoveredSeeds: { carrot: true, tomato: true, strawberry: true, pumpkin: true, sunflower: true, apple: true, candyCorn: true, snowberry: true },
                sprinklers: [],
                scarecrows: [],
                beehive: beehiveDefaults,
                flowerGarden: {
                    plots: flowerPlots,
                    lastMoodTick: ts,
                    trimInventory: { petals: 0 },
                    selectedTab: 'flowers'
                },
                compostBin: compostDefaults,
                mushroomCave: {
                    plots: mushroomPlots,
                    inventory: {}
                },
                crossbreeding: {
                    discoveries: {},
                    logs: [],
                    learnedHints: {}
                },
                lastPestCheckAt: ts
            };
        }

        let gameState = {
            saveVersion: SAVE_SCHEMA_VERSION,
            phase: 'egg', // 'egg', 'hatching', 'pet'
            pet: null,
            eggTaps: 0,
            eggType: null, // Type of egg (furry, feathery, scaly, magical)
            pendingPetType: null, // Pre-determined pet type for the egg
            lastUpdate: Date.now(),
            security: createDefaultSecurityState(),
            timeHardening: createDefaultTimeHardeningState(),
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
                park: false,
                garden: false
            },
            roomUpgrades: {},
            roomCustomizations: {},
            roomArtifacts: {},
            roomHistory: {},
            garden: createDefaultGardenState(),
            minigamePlayCounts: {}, // { gameId: playCount } — tracks replays for difficulty scaling
            minigameHighScores: {}, // { gameId: bestScore } — persisted best scores
            minigameScoreHistory: {}, // { gameId: [score, score, score] } — last 3 scores per game
            minigameExpansion: createDefaultMiniGameExpansionState(),
            // Multi-pet system
            pets: [], // Array of all pet objects
            activePetIndex: 0, // Index of the currently active/displayed pet
            relationships: {}, // { "petId1-petId2": { points, lastInteraction, interactionHistory } }
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
            meta: createDefaultRetentionMetaState(),
            goalLadder: null,
            // Competition system
            competition: createDefaultCompetitionState(),
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
            caretakerIdentity: { style: 'comfort-focused', voice: 'gentle', trustStyle: 'steady', lastUpdatedAt: 0 },
            ambientState: { current: 'settled', target: 'settled', transitionStartedAt: Date.now(), transitionDurationMs: 15000, reason: 'init' },
            sessionPhase: { state: 'check-in', sessionStartedAt: Date.now(), phaseStartedAt: Date.now(), checkInShown: false, cooldownUntil: 0, lastCeremonyAt: 0 },
            // Weather tracking for micro-stories
            previousWeather: 'sunny',
            // Seasonal event tracking
            lastSeasonalEventCheck: 0
        };

        // Initialize StateManager with the gameState reference
        if (typeof StateManager !== 'undefined') {
            StateManager.init(gameState);
        }

        function createDefaultCompetitionState() {
            return {
                battlesWon: 0,
                battlesLost: 0,
                rivalBattlesWon: 0,
                rivalBattlesLost: 0,
                bossesDefeated: {},
                showsEntered: 0,
                bestShowRank: '',
                bestShowScore: 0,
                obstacleBestScore: 0,
                obstacleCompletions: 0,
                rivalsDefeated: [],
                currentRivalIndex: 0,
                rewardControl: {
                    daily: { dayKey: '', earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 },
                    perMode: {},
                    bossFirstClearPaid: {},
                    rivalFirstClearPaid: {},
                    lastCapToastAt: 0
                }
            };
        }

        function normalizeCompetitionState(competition) {
            const state = (competition && typeof competition === 'object' && !Array.isArray(competition))
                ? competition
                : createDefaultCompetitionState();
            if (typeof state.battlesWon !== 'number' || !Number.isFinite(state.battlesWon)) state.battlesWon = 0;
            if (typeof state.battlesLost !== 'number' || !Number.isFinite(state.battlesLost)) state.battlesLost = 0;
            if (typeof state.rivalBattlesWon !== 'number' || !Number.isFinite(state.rivalBattlesWon)) state.rivalBattlesWon = 0;
            if (typeof state.rivalBattlesLost !== 'number' || !Number.isFinite(state.rivalBattlesLost)) state.rivalBattlesLost = 0;
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
            if (!state.rewardControl || typeof state.rewardControl !== 'object' || Array.isArray(state.rewardControl)) {
                state.rewardControl = createDefaultCompetitionState().rewardControl;
            }
            if (!state.rewardControl.daily || typeof state.rewardControl.daily !== 'object') {
                state.rewardControl.daily = { dayKey: '', earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 };
            }
            if (typeof state.rewardControl.daily.dayKey !== 'string') state.rewardControl.daily.dayKey = '';
            ['earnedCoins', 'lossConsolationCoins', 'entryFeesPaid', 'entriesUsed'].forEach((k) => {
                if (!Number.isFinite(state.rewardControl.daily[k])) state.rewardControl.daily[k] = 0;
                state.rewardControl.daily[k] = Math.max(0, Math.floor(state.rewardControl.daily[k]));
            });
            if (!state.rewardControl.perMode || typeof state.rewardControl.perMode !== 'object' || Array.isArray(state.rewardControl.perMode)) state.rewardControl.perMode = {};
            Object.keys(state.rewardControl.perMode).forEach((modeId) => {
                const entry = state.rewardControl.perMode[modeId];
                if (!entry || typeof entry !== 'object') {
                    state.rewardControl.perMode[modeId] = { lastAt: 0, repeatCount: 0 };
                    return;
                }
                if (!Number.isFinite(entry.lastAt)) entry.lastAt = 0;
                if (!Number.isFinite(entry.repeatCount)) entry.repeatCount = 0;
            });
            if (!state.rewardControl.bossFirstClearPaid || typeof state.rewardControl.bossFirstClearPaid !== 'object' || Array.isArray(state.rewardControl.bossFirstClearPaid)) state.rewardControl.bossFirstClearPaid = {};
            if (!state.rewardControl.rivalFirstClearPaid || typeof state.rewardControl.rivalFirstClearPaid !== 'object' || Array.isArray(state.rewardControl.rivalFirstClearPaid)) state.rewardControl.rivalFirstClearPaid = {};
            if (!Number.isFinite(state.rewardControl.lastCapToastAt)) state.rewardControl.lastCapToastAt = 0;
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

        function ensureRetentionMetaState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const defaults = createDefaultRetentionMetaState();
            if (!state.meta || typeof state.meta !== 'object' || Array.isArray(state.meta)) {
                state.meta = defaults;
                return state.meta;
            }
            if (typeof state.meta.version !== 'number') state.meta.version = defaults.version;
            if (!state.meta.streakProtection || typeof state.meta.streakProtection !== 'object') state.meta.streakProtection = defaults.streakProtection;
            if (!Number.isFinite(state.meta.streakProtection.freezeTokens)) state.meta.streakProtection.freezeTokens = 0;
            state.meta.streakProtection.freezeTokens = Math.max(0, Math.floor(state.meta.streakProtection.freezeTokens));
            if (typeof state.meta.streakProtection.autoUseFreeze !== 'boolean') state.meta.streakProtection.autoUseFreeze = true;
            if (typeof state.meta.streakProtection.lastOutcome !== 'string') state.meta.streakProtection.lastOutcome = '';
            if (!Number.isFinite(state.meta.streakProtection.lastMissedDays)) state.meta.streakProtection.lastMissedDays = 0;
            if (!Number.isFinite(state.meta.streakProtection.lastFreezeUsed)) state.meta.streakProtection.lastFreezeUsed = 0;
            if (!Number.isFinite(state.meta.streakProtection.lastCheckpointFloor)) state.meta.streakProtection.lastCheckpointFloor = 0;
            if (typeof state.meta.streakProtection.lastProcessedDate !== 'string') state.meta.streakProtection.lastProcessedDate = '';

	            if (!state.meta.journey || typeof state.meta.journey !== 'object') state.meta.journey = defaults.journey;
	            if (!Number.isFinite(state.meta.journey.tokens)) state.meta.journey.tokens = 0;
	            state.meta.journey.tokens = Math.max(0, Math.floor(state.meta.journey.tokens));
	            if (typeof state.meta.journey.startedAtDate !== 'string' && state.meta.journey.startedAtDate !== null) state.meta.journey.startedAtDate = null;
	            if (!state.meta.journey.objectiveProgress || typeof state.meta.journey.objectiveProgress !== 'object') state.meta.journey.objectiveProgress = {};
	            if (!state.meta.journey.completedObjectives || typeof state.meta.journey.completedObjectives !== 'object') state.meta.journey.completedObjectives = {};
	            if (!state.meta.journey.chapterCompletions || typeof state.meta.journey.chapterCompletions !== 'object') state.meta.journey.chapterCompletions = {};
	            if (!state.meta.journey.trackCompletions || typeof state.meta.journey.trackCompletions !== 'object') state.meta.journey.trackCompletions = {};
	            if (!state.meta.journey.claimedRewards || typeof state.meta.journey.claimedRewards !== 'object') state.meta.journey.claimedRewards = {};
	            if (!Number.isFinite(state.meta.journey.lastProgressAt)) state.meta.journey.lastProgressAt = 0;

            if (!state.meta.bond || typeof state.meta.bond !== 'object') state.meta.bond = defaults.bond;
            if (!Number.isFinite(state.meta.bond.xp)) state.meta.bond.xp = 0;
            if (!Number.isFinite(state.meta.bond.level)) state.meta.bond.level = 1;
            state.meta.bond.level = Math.max(1, Math.floor(state.meta.bond.level));
            if (!Array.isArray(state.meta.bond.claimedMilestones)) state.meta.bond.claimedMilestones = [];

	            if (!state.meta.novelty || typeof state.meta.novelty !== 'object') state.meta.novelty = defaults.novelty;
	            if (!state.meta.novelty.claimedSchedule || typeof state.meta.novelty.claimedSchedule !== 'object') state.meta.novelty.claimedSchedule = {};
	            if (typeof state.meta.novelty.lastWeeklyEventKey !== 'string') state.meta.novelty.lastWeeklyEventKey = '';
	            if (!Number.isFinite(state.meta.novelty.lastClaimedJourneyDay)) state.meta.novelty.lastClaimedJourneyDay = 0;

	            if (!state.meta.reminderCenter || typeof state.meta.reminderCenter !== 'object') state.meta.reminderCenter = defaults.reminderCenter;
	            if (!Array.isArray(state.meta.reminderCenter.items)) state.meta.reminderCenter.items = [];
	            if (typeof state.meta.reminderCenter.promptDismissed !== 'boolean') state.meta.reminderCenter.promptDismissed = false;
	            if (!Number.isFinite(state.meta.reminderCenter.lastPromptSession)) state.meta.reminderCenter.lastPromptSession = 0;
	            if (typeof state.meta.reminderCenter.lastDigestDate !== 'string') state.meta.reminderCenter.lastDigestDate = '';

	            if (!state.meta.reactivation || typeof state.meta.reactivation !== 'object') state.meta.reactivation = defaults.reactivation;
	            if (typeof state.meta.reactivation.lastSeenDate !== 'string' && state.meta.reactivation.lastSeenDate !== null) state.meta.reactivation.lastSeenDate = null;
	            if (!Number.isFinite(state.meta.reactivation.awayDays)) state.meta.reactivation.awayDays = 0;
	            if (typeof state.meta.reactivation.lastActivity !== 'string') state.meta.reactivation.lastActivity = '';
	            if (typeof state.meta.reactivation.lastDialogueDate !== 'string') state.meta.reactivation.lastDialogueDate = '';
	            if (typeof state.meta.reactivation.lastRecapShownDate !== 'string') state.meta.reactivation.lastRecapShownDate = '';
	            if (state.meta.reactivation.pendingRecap !== null && typeof state.meta.reactivation.pendingRecap !== 'object') state.meta.reactivation.pendingRecap = null;

	            if (!state.meta.onboarding || typeof state.meta.onboarding !== 'object') state.meta.onboarding = defaults.onboarding;
	            if (typeof state.meta.onboarding.sessionGuideSkipped !== 'boolean') state.meta.onboarding.sessionGuideSkipped = false;
	            if (typeof state.meta.onboarding.reminderPromptSeen !== 'boolean') state.meta.onboarding.reminderPromptSeen = false;

	            if (!state.meta.debug || typeof state.meta.debug !== 'object') state.meta.debug = defaults.debug;
	            if (typeof state.meta.debug.enabled !== 'boolean') state.meta.debug.enabled = false;
	            if (typeof state.meta.debug.panelOpen !== 'boolean') state.meta.debug.panelOpen = false;
	            return state.meta;
	        }

        function isRetentionDebugEnabled() {
            const meta = ensureRetentionMetaState();
            if (meta.debug && meta.debug.enabled) return true;
            return !!(typeof RETENTION_DEV_FLAGS !== 'undefined' && RETENTION_DEV_FLAGS && RETENTION_DEV_FLAGS.enabled === true);
        }

	        function retentionDebugLog(message, data) {
	            if (!isRetentionDebugEnabled()) return;
	            if (data === undefined) {
	                console.log('[RetentionDebug]', message);
	            } else {
	                console.log('[RetentionDebug]', message, data);
	            }
	        }

	        function setRetentionDebugEnabled(enabled) {
	            const meta = ensureRetentionMetaState();
	            meta.debug.enabled = !!enabled;
	            saveGame();
	            return meta.debug.enabled;
	        }

	        function getRetentionDebugSnapshot() {
	            const status = getStreakProtectionStatus();
	            const journey = getJourneyStatus();
	            const reminderItems = getReminderCenterItems();
	            const meta = ensureRetentionMetaState();
	            return {
	                streak: status,
	                journey: {
	                    day: journey.day,
	                    chapter: journey.chapter ? journey.chapter.id : '',
	                    chapterPct: journey.chapterPct,
	                    tokens: journey.tokens
	                },
	                reminderItems: reminderItems.length,
	                noveltyLastDay: meta.novelty.lastClaimedJourneyDay || 0,
	                awayDays: meta.reactivation.awayDays || 0
	            };
	        }

        function isGardenDebugEnabled() {
            return !!(typeof GARDEN_SYSTEM_BALANCE !== 'undefined' && GARDEN_SYSTEM_BALANCE.debugLogging);
        }

        function gardenDebugLog(message, data) {
            if (!isGardenDebugEnabled()) return;
            if (data === undefined) {
                console.log('[GardenDebug]', message);
            } else {
                console.log('[GardenDebug]', message, data);
            }
        }

        function ensureGardenSystemsState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const now = Date.now();
            if (!state.garden || typeof state.garden !== 'object') {
                state.garden = createDefaultGardenState(now);
                return state.garden;
            }
            const defaultGarden = createDefaultGardenState(now);
            const garden = state.garden;
            if (!Array.isArray(garden.plots)) garden.plots = [];
            if (!garden.inventory || typeof garden.inventory !== 'object') garden.inventory = {};
            if (!Number.isFinite(garden.lastGrowTick)) garden.lastGrowTick = now;
            if (!Number.isFinite(garden.totalHarvests)) garden.totalHarvests = 0;
            if (!Number.isFinite(garden.expansionTier)) garden.expansionTier = 0;
            if (!garden.discoveredSeeds || typeof garden.discoveredSeeds !== 'object') garden.discoveredSeeds = defaultGarden.discoveredSeeds;
            if (!Array.isArray(garden.sprinklers)) garden.sprinklers = [];
            if (!Array.isArray(garden.scarecrows)) garden.scarecrows = [];
            if (!garden.beehive || typeof garden.beehive !== 'object') garden.beehive = defaultGarden.beehive;
            if (!garden.flowerGarden || typeof garden.flowerGarden !== 'object') garden.flowerGarden = defaultGarden.flowerGarden;
            if (!Array.isArray(garden.flowerGarden.plots)) garden.flowerGarden.plots = defaultGarden.flowerGarden.plots.slice();
            if (!Number.isFinite(garden.flowerGarden.lastMoodTick)) garden.flowerGarden.lastMoodTick = now;
            if (!garden.flowerGarden.trimInventory || typeof garden.flowerGarden.trimInventory !== 'object') {
                garden.flowerGarden.trimInventory = { petals: 0 };
            }
            if (!garden.compostBin || typeof garden.compostBin !== 'object') garden.compostBin = defaultGarden.compostBin;
            if (!Array.isArray(garden.compostBin.queue)) garden.compostBin.queue = [];
            if (!garden.mushroomCave || typeof garden.mushroomCave !== 'object') garden.mushroomCave = defaultGarden.mushroomCave;
            if (!Array.isArray(garden.mushroomCave.plots)) garden.mushroomCave.plots = defaultGarden.mushroomCave.plots.slice();
            if (!garden.mushroomCave.inventory || typeof garden.mushroomCave.inventory !== 'object') garden.mushroomCave.inventory = {};
            if (!garden.crossbreeding || typeof garden.crossbreeding !== 'object') garden.crossbreeding = defaultGarden.crossbreeding;
            if (!Array.isArray(garden.crossbreeding.logs)) garden.crossbreeding.logs = [];
            if (!garden.crossbreeding.discoveries || typeof garden.crossbreeding.discoveries !== 'object') garden.crossbreeding.discoveries = {};
            if (!garden.crossbreeding.learnedHints || typeof garden.crossbreeding.learnedHints !== 'object') garden.crossbreeding.learnedHints = {};
            if (!Number.isFinite(garden.lastPestCheckAt)) garden.lastPestCheckAt = now;
            return garden;
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
        const SESSION_PHASES = {
            checkin: 'check-in',
            activity: 'activity',
            cooldown: 'cooldown'
        };
        const SESSION_CHECKIN_MIN_MS = 60000;
        const SESSION_CHECKIN_MAX_MS = 120000;
        const SESSION_ACTIVITY_TO_COOLDOWN_MS = 8 * 60 * 1000;
        const SESSION_COOLDOWN_MIN_MS = 2 * 60 * 1000;
        const NEGLECT_RECOVERY_ARC_STAGES = [
            { id: 'wounded', minCare: 0, minElapsedMs: 0, minVariety: 1, tone: 'fragile', color: '#EF9A9A', cue: 'Wounded: your pet needs steady reassurance.' },
            { id: 'healing', minCare: 4, minElapsedMs: 5 * 60 * 1000, minVariety: 2, tone: 'softening', color: '#CE93D8', cue: 'Healing: gentle variety is helping.' },
            { id: 'stabilizing', minCare: 10, minElapsedMs: 25 * 60 * 1000, minVariety: 4, tone: 'steady', color: '#81C784', cue: 'Stabilizing: trust is rebuilding.' },
            { id: 'thriving', minCare: 18, minElapsedMs: 60 * 60 * 1000, minVariety: 5, tone: 'bright', color: '#66BB6A', cue: 'Thriving: the emotional bond feels secure again.' }
        ];

        function ensureSessionPhaseState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const now = Date.now();
            if (!state.sessionPhase || typeof state.sessionPhase !== 'object') {
                state.sessionPhase = {
                    state: SESSION_PHASES.checkin,
                    sessionStartedAt: now,
                    phaseStartedAt: now,
                    checkInShown: false,
                    cooldownUntil: 0,
                    lastCeremonyAt: 0
                };
            }
            const phase = state.sessionPhase;
            if (!Object.values(SESSION_PHASES).includes(phase.state)) phase.state = SESSION_PHASES.checkin;
            if (!Number.isFinite(phase.sessionStartedAt)) phase.sessionStartedAt = now;
            if (!Number.isFinite(phase.phaseStartedAt)) phase.phaseStartedAt = now;
            if (!Number.isFinite(phase.cooldownUntil)) phase.cooldownUntil = 0;
            if (!Number.isFinite(phase.lastCeremonyAt)) phase.lastCeremonyAt = 0;
            if (typeof phase.checkInShown !== 'boolean') phase.checkInShown = false;
            if (!Number.isFinite(state._sessionCheckInWindowMs) || state._sessionCheckInWindowMs < SESSION_CHECKIN_MIN_MS || state._sessionCheckInWindowMs > SESSION_CHECKIN_MAX_MS) {
                state._sessionCheckInWindowMs = SESSION_CHECKIN_MIN_MS + Math.floor(Math.random() * (SESSION_CHECKIN_MAX_MS - SESSION_CHECKIN_MIN_MS + 1));
            }
            return phase;
        }

        function setSessionPhase(nextPhase, options = {}) {
            const phase = ensureSessionPhaseState();
            if (!nextPhase || phase.state === nextPhase) return;
            const now = Date.now();
            phase.state = nextPhase;
            phase.phaseStartedAt = now;
            if (nextPhase === SESSION_PHASES.cooldown) {
                const cooldownMs = Math.max(SESSION_COOLDOWN_MIN_MS, Number(options.cooldownMs) || SESSION_COOLDOWN_MIN_MS);
                phase.cooldownUntil = now + cooldownMs;
            }
            if (nextPhase === SESSION_PHASES.checkin) {
                phase.checkInShown = false;
                phase.sessionStartedAt = now;
                gameState._sessionCheckInWindowMs = SESSION_CHECKIN_MIN_MS + Math.floor(Math.random() * (SESSION_CHECKIN_MAX_MS - SESSION_CHECKIN_MIN_MS + 1));
            }
        }

        function refreshSessionPhase() {
            const phase = ensureSessionPhaseState();
            const now = Date.now();
            if (phase.state === SESSION_PHASES.checkin) {
                const checkinWindow = Math.max(SESSION_CHECKIN_MIN_MS, Math.min(SESSION_CHECKIN_MAX_MS, Number(gameState._sessionCheckInWindowMs) || SESSION_CHECKIN_MIN_MS));
                if (now - phase.sessionStartedAt >= checkinWindow) {
                    setSessionPhase(SESSION_PHASES.activity);
                }
            } else if (phase.state === SESSION_PHASES.activity) {
                if (now - phase.sessionStartedAt >= SESSION_ACTIVITY_TO_COOLDOWN_MS) {
                    setSessionPhase(SESSION_PHASES.cooldown, { cooldownMs: SESSION_COOLDOWN_MIN_MS });
                }
            } else if (phase.state === SESSION_PHASES.cooldown && phase.cooldownUntil > 0 && now >= phase.cooldownUntil) {
                setSessionPhase(SESSION_PHASES.activity);
            }
            return phase.state;
        }

        function noteSessionCeremony(cooldownMs) {
            const phase = ensureSessionPhaseState();
            phase.lastCeremonyAt = Date.now();
            setSessionPhase(SESSION_PHASES.cooldown, { cooldownMs: cooldownMs || (90 * 1000) });
        }

        function startSessionCycle() {
            const phase = ensureSessionPhaseState();
            const now = Date.now();
            phase.state = SESSION_PHASES.checkin;
            phase.sessionStartedAt = now;
            phase.phaseStartedAt = now;
            phase.cooldownUntil = 0;
            phase.checkInShown = false;
            gameState._sessionCheckInWindowMs = SESSION_CHECKIN_MIN_MS + Math.floor(Math.random() * (SESSION_CHECKIN_MAX_MS - SESSION_CHECKIN_MIN_MS + 1));
        }

        function ensureAmbientState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const now = Date.now();
            if (!state.ambientState || typeof state.ambientState !== 'object') {
                state.ambientState = { current: 'settled', target: 'settled', transitionStartedAt: now, transitionDurationMs: 15000, reason: 'init' };
            }
            const ambient = state.ambientState;
            if (!ambient.current) ambient.current = 'settled';
            if (!ambient.target) ambient.target = ambient.current;
            if (!Number.isFinite(ambient.transitionStartedAt)) ambient.transitionStartedAt = now;
            if (!Number.isFinite(ambient.transitionDurationMs)) ambient.transitionDurationMs = 15000;
            if (!ambient.reason) ambient.reason = 'init';
            return ambient;
        }

        function setAmbientTone(targetTone, reason, durationMs) {
            const ambient = ensureAmbientState();
            const nextTone = targetTone || 'settled';
            if (ambient.target === nextTone) return;
            ambient.current = ambient.target || ambient.current || 'settled';
            ambient.target = nextTone;
            ambient.transitionStartedAt = Date.now();
            ambient.transitionDurationMs = Math.max(10000, Math.min(20000, Number(durationMs) || 15000));
            ambient.reason = reason || 'state-change';
            if (typeof SoundManager !== 'undefined' && SoundManager.enterRoom && gameState.currentRoom) {
                // Existing sound system crossfades room earcons; spacing this call helps transitions feel less abrupt.
                setTimeout(() => {
                    if (gameState.currentRoom) SoundManager.enterRoom(gameState.currentRoom);
                }, 120);
            }
        }

        function getAmbientTransitionProgress() {
            const ambient = ensureAmbientState();
            const elapsed = Date.now() - ambient.transitionStartedAt;
            const duration = Math.max(1, Number(ambient.transitionDurationMs) || 15000);
            return clamp(elapsed / duration, 0, 1);
        }

        function maybeFinishAmbientTransition() {
            const ambient = ensureAmbientState();
            if (ambient.current !== ambient.target && getAmbientTransitionProgress() >= 1) {
                ambient.current = ambient.target;
            }
        }

        function ensureRoomHistoryState(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            if (!state.roomArtifacts || typeof state.roomArtifacts !== 'object') state.roomArtifacts = {};
            if (!state.roomHistory || typeof state.roomHistory !== 'object') state.roomHistory = {};
            if (!state._roomHintMeta || typeof state._roomHintMeta !== 'object') state._roomHintMeta = {};
            ROOM_IDS.forEach((roomId) => {
                if (!Array.isArray(state.roomArtifacts[roomId])) state.roomArtifacts[roomId] = [];
                if (!state.roomHistory[roomId] || typeof state.roomHistory[roomId] !== 'object') {
                    state.roomHistory[roomId] = {
                        careActions: 0,
                        sessions: 0,
                        lastVisitedAt: 0,
                        weatherMarks: {},
                        seasonMarks: {},
                        recoveryMarks: {},
                        milestoneMarks: {}
                    };
                } else {
                    const history = state.roomHistory[roomId];
                    if (!Number.isFinite(history.careActions)) history.careActions = 0;
                    if (!Number.isFinite(history.sessions)) history.sessions = 0;
                    if (!Number.isFinite(history.lastVisitedAt)) history.lastVisitedAt = 0;
                    if (!history.weatherMarks || typeof history.weatherMarks !== 'object') history.weatherMarks = {};
                    if (!history.seasonMarks || typeof history.seasonMarks !== 'object') history.seasonMarks = {};
                    if (!history.recoveryMarks || typeof history.recoveryMarks !== 'object') history.recoveryMarks = {};
                    if (!history.milestoneMarks || typeof history.milestoneMarks !== 'object') history.milestoneMarks = {};
                }
            });
            return state.roomHistory;
        }

        function getRoomArtifactBlueprints(roomId) {
            if (typeof ROOM_ARTIFACT_BLUEPRINTS === 'undefined' || !ROOM_ARTIFACT_BLUEPRINTS) return [];
            return ROOM_ARTIFACT_BLUEPRINTS[roomId] || [];
        }

        function hasRoomArtifact(roomId, artifactId) {
            ensureRoomHistoryState();
            const list = gameState.roomArtifacts[roomId] || [];
            return list.some((entry) => entry && entry.id === artifactId);
        }

        function addRoomArtifact(roomId, blueprint, context = {}) {
            if (!roomId || !blueprint || !blueprint.id) return false;
            ensureRoomHistoryState();
            if (!ROOMS[roomId]) return false;
            if (hasRoomArtifact(roomId, blueprint.id)) return false;
            const artifact = {
                id: blueprint.id,
                label: blueprint.label || 'Memory',
                description: blueprint.description || '',
                appearedAt: Date.now(),
                conditions: {
                    trigger: blueprint.trigger || context.trigger || 'manual',
                    sourceRoom: context.sourceRoom || gameState.currentRoom || roomId,
                    season: gameState.season || getCurrentSeason(),
                    weather: gameState.weather || 'sunny'
                },
                render: Object.assign({ emoji: '✨', layer: 'front' }, blueprint.render || {})
            };
            gameState.roomArtifacts[roomId].push(artifact);
            return true;
        }

        function applyRoomArtifactTrigger(trigger, context = {}) {
            if (!trigger) return 0;
            ensureRoomHistoryState();
            let added = 0;
            let marksChanged = false;
            ROOM_IDS.forEach((roomId) => {
                const blueprints = getRoomArtifactBlueprints(roomId);
                let addedForRoom = false;
                blueprints.forEach((bp) => {
                    if (!bp || bp.trigger !== trigger) return;
                    if (addRoomArtifact(roomId, bp, Object.assign({}, context, { trigger }))) {
                        added++;
                        addedForRoom = true;
                    }
                });
                const fromSourceRoom = !!(context && context.sourceRoom && context.sourceRoom === roomId);
                if ((addedForRoom || fromSourceRoom) && gameState.roomHistory[roomId]) {
                    const history = gameState.roomHistory[roomId];
                    if (trigger.indexOf('weather:') === 0) {
                        const weatherKey = trigger.split(':')[1] || 'unknown';
                        history.weatherMarks[weatherKey] = (history.weatherMarks[weatherKey] || 0) + 1;
                        marksChanged = true;
                    } else if (trigger.indexOf('season:') === 0) {
                        const seasonKey = trigger.split(':')[1] || 'unknown';
                        history.seasonMarks[seasonKey] = (history.seasonMarks[seasonKey] || 0) + 1;
                        marksChanged = true;
                    } else if (trigger.indexOf('recovery:') === 0) {
                        const recoveryKey = trigger.split(':')[1] || 'unknown';
                        history.recoveryMarks[recoveryKey] = (history.recoveryMarks[recoveryKey] || 0) + 1;
                        marksChanged = true;
                    } else if (trigger.indexOf('milestone:') === 0) {
                        const milestoneKey = trigger.split(':')[1] || 'unknown';
                        history.milestoneMarks[milestoneKey] = (history.milestoneMarks[milestoneKey] || 0) + 1;
                        marksChanged = true;
                    }
                }
            });
            if (added > 0 || marksChanged) saveGame();
            return added;
        }

        function renderRoomArtifactsHTML(roomId) {
            ensureRoomHistoryState();
            const artifacts = (gameState.roomArtifacts && gameState.roomArtifacts[roomId]) ? gameState.roomArtifacts[roomId] : [];
            if (!artifacts || artifacts.length === 0) return '';
            const visible = artifacts.slice(-6);
            const chips = visible.map((artifact) => {
                const emoji = (artifact.render && artifact.render.emoji) ? artifact.render.emoji : '✨';
                const label = artifact.label || 'Artifact';
                const desc = artifact.description || '';
                return `<button class="room-artifact-chip" type="button" tabindex="0" aria-label="${escapeHTML(label)}. ${escapeHTML(desc)}" title="${escapeHTML(label)} — ${escapeHTML(desc)}">${emoji}</button>`;
            }).join('');
            return `<div class="room-history-layer" role="group" aria-label="Room history artifacts" style="position:absolute;left:8px;bottom:8px;display:flex;gap:6px;flex-wrap:wrap;z-index:2;">${chips}</div>`;
        }

        function getRoomArtifactDecor(roomId) {
            ensureRoomHistoryState();
            const artifacts = (gameState.roomArtifacts && gameState.roomArtifacts[roomId]) ? gameState.roomArtifacts[roomId] : [];
            if (!artifacts || artifacts.length === 0) return '';
            const visuals = artifacts.slice(-2).map((artifact, idx) => {
                const emoji = (artifact.render && artifact.render.emoji) ? artifact.render.emoji : '✨';
                return `<span class="room-artifact-decor room-artifact-${idx + 1}" aria-hidden="true">${emoji}</span>`;
            }).join('');
            return visuals;
        }

        function renderRoomHistorySummaryHTML(roomId) {
            ensureRoomHistoryState();
            const history = gameState.roomHistory[roomId];
            if (!history) return '';
            const visits = Number(history.sessions || 0);
            const careActions = Number(history.careActions || 0);
            const artifacts = (gameState.roomArtifacts && gameState.roomArtifacts[roomId]) ? gameState.roomArtifacts[roomId].length : 0;
            const summary = `${ROOMS[roomId] ? ROOMS[roomId].name : 'Room'} history: ${careActions} care actions, ${visits} visits, ${artifacts} lasting artifacts.`;
            return `<p class="room-history-summary" role="note" style="margin:6px 0 0 0;font-size:0.72rem;color:#5D4037;">${escapeHTML(summary)}</p>`;
        }

        function recordRoomCareAction(roomId, actionType) {
            ensureRoomHistoryState();
            const room = roomId || gameState.currentRoom || 'bedroom';
            if (!gameState.roomHistory[room]) return;
            const history = gameState.roomHistory[room];
            history.careActions = (history.careActions || 0) + 1;
            history.lastVisitedAt = Date.now();
            if (actionType === 'wash' || actionType === 'groom') {
                history.recoveryMarks.cleanliness = (history.recoveryMarks.cleanliness || 0) + 1;
            }
            if (actionType === 'cuddle' || actionType === 'sleep') {
                history.recoveryMarks.comfort = (history.recoveryMarks.comfort || 0) + 1;
            }
        }

        function updateCaretakerIdentityProfile() {
            if (!gameState.caretakerIdentity || typeof gameState.caretakerIdentity !== 'object') {
                gameState.caretakerIdentity = { style: 'comfort-focused', voice: 'gentle', trustStyle: 'steady', lastUpdatedAt: 0 };
            }
            const counts = gameState.caretakerActionCounts || {};
            const comfort = (counts.cuddle || 0) + (counts.sleep || 0) + (counts.wash || 0) + (counts.groom || 0);
            const routine = (counts.feed || 0) + (counts.medicine || 0);
            const explore = Object.keys(gameState.roomsVisited || {}).length + ((gameState.exploration && gameState.exploration.stats && gameState.exploration.stats.expeditionsCompleted) || 0);
            let style = 'comfort-focused';
            if (routine >= comfort && routine >= explore) style = 'routine-focused';
            else if (explore > comfort && explore > routine) style = 'explorer';
            const voice = style === 'routine-focused' ? 'steady' : (style === 'explorer' ? 'adventurous' : 'gentle');
            const trustStyle = style === 'comfort-focused' ? 'warm' : (style === 'routine-focused' ? 'reliable' : 'curious');
            gameState.caretakerIdentity.style = style;
            gameState.caretakerIdentity.voice = voice;
            gameState.caretakerIdentity.trustStyle = trustStyle;
            gameState.caretakerIdentity.lastUpdatedAt = Date.now();
            return gameState.caretakerIdentity;
        }

        function getDiaryVoicePrefix() {
            updateCaretakerIdentityProfile();
            const voice = (gameState.caretakerIdentity && gameState.caretakerIdentity.voice) || 'gentle';
            if (voice === 'steady') return 'Steady voice';
            if (voice === 'adventurous') return 'Explorer voice';
            return 'Gentle voice';
        }

        function applyDiaryVoice(entry) {
            if (!entry || typeof entry !== 'object') return entry;
            const prefix = getDiaryVoicePrefix();
            if (!entry.voice) entry.voice = prefix;
            if (entry.opening && entry.opening.indexOf(prefix + ':') !== 0) {
                entry.opening = `${prefix}: ${entry.opening}`;
            }
            return entry;
        }

        function ensureNeglectRecoveryArcState(pet) {
            if (!pet || typeof pet !== 'object') return null;
            if (!pet.neglectArc || typeof pet.neglectArc !== 'object') {
                pet.neglectArc = {
                    active: !!pet._isNeglected,
                    stage: pet._isNeglected ? 'wounded' : 'thriving',
                    startedAt: pet._isNeglected ? Date.now() : 0,
                    progressCare: Number(pet._neglectRecoveryStep) || 0,
                    variety: {},
                    uniqueActions: 0,
                    lastAdvancedAt: 0,
                    lastToneAt: 0
                };
            }
            if (typeof pet.neglectArc.active !== 'boolean') pet.neglectArc.active = false;
            if (!pet.neglectArc.stage) pet.neglectArc.stage = pet.neglectArc.active ? 'wounded' : 'thriving';
            if (!Number.isFinite(pet.neglectArc.startedAt)) pet.neglectArc.startedAt = pet.neglectArc.active ? Date.now() : 0;
            if (!Number.isFinite(pet.neglectArc.progressCare)) pet.neglectArc.progressCare = 0;
            if (!pet.neglectArc.variety || typeof pet.neglectArc.variety !== 'object') pet.neglectArc.variety = {};
            if (!Number.isFinite(pet.neglectArc.uniqueActions)) pet.neglectArc.uniqueActions = 0;
            if (!Number.isFinite(pet.neglectArc.lastAdvancedAt)) pet.neglectArc.lastAdvancedAt = 0;
            if (!Number.isFinite(pet.neglectArc.lastToneAt)) pet.neglectArc.lastToneAt = 0;
            return pet.neglectArc;
        }

        function getNeglectStageData(stageId) {
            return NEGLECT_RECOVERY_ARC_STAGES.find((stage) => stage.id === stageId) || NEGLECT_RECOVERY_ARC_STAGES[0];
        }

        function beginNeglectRecoveryArc(pet, reason) {
            const arc = ensureNeglectRecoveryArcState(pet);
            if (!arc) return null;
            arc.active = true;
            arc.stage = 'wounded';
            arc.startedAt = Date.now();
            arc.progressCare = 0;
            arc.variety = {};
            arc.uniqueActions = 0;
            arc.lastAdvancedAt = 0;
            pet._isNeglected = true;
            pet._neglectRecoveryStep = 0;
            const stageData = getNeglectStageData('wounded');
            setAmbientTone(stageData.tone, reason || 'neglect-start');
            return arc;
        }

        function advanceNeglectRecoveryArc(pet, actionType) {
            const arc = ensureNeglectRecoveryArcState(pet);
            if (!arc || !arc.active) return { changed: false, completed: false, stage: arc ? arc.stage : 'thriving' };
            const now = Date.now();
            arc.progressCare += 1;
            arc.variety[actionType] = (arc.variety[actionType] || 0) + 1;
            arc.uniqueActions = Object.keys(arc.variety).length;
            pet._neglectRecoveryStep = arc.progressCare;

            let stageChanged = false;
            let nextStage = arc.stage;
            NEGLECT_RECOVERY_ARC_STAGES.forEach((stage) => {
                const elapsed = now - (arc.startedAt || now);
                if (arc.progressCare >= stage.minCare && elapsed >= stage.minElapsedMs && arc.uniqueActions >= stage.minVariety) {
                    nextStage = stage.id;
                }
            });
            if (nextStage !== arc.stage) {
                arc.stage = nextStage;
                arc.lastAdvancedAt = now;
                stageChanged = true;
                const stageData = getNeglectStageData(nextStage);
                setAmbientTone(stageData.tone, `recovery:${nextStage}`);
                applyRoomArtifactTrigger(`recovery:${nextStage}`, { sourceRoom: gameState.currentRoom || 'bedroom' });
            }

            if (arc.stage === 'thriving') {
                arc.active = false;
                pet._isNeglected = false;
                pet._neglectRecoveryStep = 0;
                return { changed: stageChanged, completed: true, stage: arc.stage };
            }
            return { changed: stageChanged, completed: false, stage: arc.stage };
        }

        function getNeglectRecoveryVisualTone(pet) {
            const arc = ensureNeglectRecoveryArcState(pet);
            if (!arc || !arc.active) return 'recovery-thriving';
            return `recovery-${arc.stage || 'wounded'}`;
        }

        function maybeShowRoomUnlockForeshadow(actionType) {
            ensureRoomHistoryState();
            if (!gameState._roomHintMeta) gameState._roomHintMeta = {};
            const now = Date.now();
            ['park', 'garden'].forEach((roomId) => {
                const room = ROOMS[roomId];
                if (!room || !room.unlockRule || room.unlockRule.type !== 'careActions') return;
                if (gameState.roomUnlocks && gameState.roomUnlocks[roomId]) return;
                const threshold = Number(room.unlockRule.count) || 0;
                const careActions = (gameState.pet && Number(gameState.pet.careActions)) || 0;
                const remaining = threshold - careActions;
                const meta = gameState._roomHintMeta[roomId] || { lastHintAt: 0, hintedNear: false };
                if (remaining <= 3 && remaining > 0 && !meta.hintedNear && (now - meta.lastHintAt > 45000)) {
                    const cue = room.unlockCue && room.unlockCue.behaviorHint ? room.unlockCue.behaviorHint : `You are close to unlocking ${room.name}.`;
                    showToast(`${room.icon} ${cue} (${Math.max(1, remaining)} care actions left)`, '#90A4AE', { tier: 'moment', announce: false });
                    meta.hintedNear = true;
                    meta.lastHintAt = now;
                } else if (remaining > 3) {
                    meta.hintedNear = false;
                }
                if (remaining <= 0 && now - meta.lastHintAt > 4000) {
                    const cue = room.unlockCue && room.unlockCue.roomCue ? room.unlockCue.roomCue : `${room.name} feels ready to discover.`;
                    showToast(`${room.icon} ${cue}`, '#81C784', { tier: 'moment', announce: true });
                    meta.lastHintAt = now;
                }
                gameState._roomHintMeta[roomId] = meta;
            });
        }

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

        function hapticPattern(action) {
            try {
                if (!isHapticsEnabled()) return;
                if (navigator.vibrate && HAPTIC_PATTERNS[action]) {
                    navigator.vibrate(HAPTIC_PATTERNS[action]);
                }
            } catch (e) { /* unsupported — silently ignore */ }
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
            ensureNeglectRecoveryArcState(pet);
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

        // ==================== EXPLORATION SYSTEM ====================

        const EXPLORATION_DEFAULT_UNLOCKS = {
            forest: true,
            beach: false,
            mountain: false,
            cave: false,
            skyIsland: false,
            underwater: false,
            skyZone: false
        };

        function createDefaultExplorationState() {
            return {
                biomeUnlocks: Object.assign({}, EXPLORATION_DEFAULT_UNLOCKS),
                discoveredBiomes: { forest: true },
                lootInventory: {},
                lootInventoryStacks: {},
                expedition: null,
                expeditionHistory: [],
                roomTreasureCooldowns: {},
                treasureHunt: {
                    // Report #1: Global cooldown + anti-farm runtime state.
                    globalCooldownEndsAt: 0,
                    lastRunAt: 0,
                    lastRoomId: null,
                    recentRuns: [],
                    roomSwitchCount: 0,
                    repeatCount: 0
                },
                npcEncounters: [],
                dungeon: {
                    active: false,
                    seed: 0,
                    rooms: [],
                    currentIndex: 0,
                    log: [],
                    rewards: [],
                    startedAt: 0
                },
                stats: {
                    expeditionsCompleted: 0,
                    treasuresFound: 0,
                    dungeonsCleared: 0,
                    npcsBefriended: 0,
                    npcsAdopted: 0
                }
            };
        }

        function ensureExplorationState(stateObj) {
            const state = stateObj || gameState;
            if (!state.exploration || typeof state.exploration !== 'object') {
                state.exploration = createDefaultExplorationState();
            }
            const ex = state.exploration;
            if (!ex.biomeUnlocks || typeof ex.biomeUnlocks !== 'object') ex.biomeUnlocks = {};
            Object.keys(EXPLORATION_DEFAULT_UNLOCKS).forEach((id) => {
                if (typeof ex.biomeUnlocks[id] !== 'boolean') ex.biomeUnlocks[id] = EXPLORATION_DEFAULT_UNLOCKS[id];
            });
            if (!ex.discoveredBiomes || typeof ex.discoveredBiomes !== 'object') ex.discoveredBiomes = { forest: true };
            if (typeof ex.discoveredBiomes.forest !== 'boolean') ex.discoveredBiomes.forest = true;
            if (!ex.lootInventory || typeof ex.lootInventory !== 'object') ex.lootInventory = {};
            if (!ex.lootInventoryStacks || typeof ex.lootInventoryStacks !== 'object' || Array.isArray(ex.lootInventoryStacks)) ex.lootInventoryStacks = {};
            if (!Array.isArray(ex.expeditionHistory)) ex.expeditionHistory = [];
            if (!ex.roomTreasureCooldowns || typeof ex.roomTreasureCooldowns !== 'object') ex.roomTreasureCooldowns = {};
            if (!ex.treasureHunt || typeof ex.treasureHunt !== 'object') {
                ex.treasureHunt = { globalCooldownEndsAt: 0, lastRunAt: 0, lastRoomId: null, recentRuns: [], roomSwitchCount: 0, repeatCount: 0 };
            }
            if (typeof ex.treasureHunt.globalCooldownEndsAt !== 'number') ex.treasureHunt.globalCooldownEndsAt = 0;
            if (typeof ex.treasureHunt.lastRunAt !== 'number') ex.treasureHunt.lastRunAt = 0;
            if (typeof ex.treasureHunt.lastRoomId !== 'string' && ex.treasureHunt.lastRoomId !== null) ex.treasureHunt.lastRoomId = null;
            if (!Array.isArray(ex.treasureHunt.recentRuns)) ex.treasureHunt.recentRuns = [];
            if (typeof ex.treasureHunt.roomSwitchCount !== 'number') ex.treasureHunt.roomSwitchCount = 0;
            if (typeof ex.treasureHunt.repeatCount !== 'number') ex.treasureHunt.repeatCount = 0;
            if (!Array.isArray(ex.npcEncounters)) ex.npcEncounters = [];
            if (!ex.dungeon || typeof ex.dungeon !== 'object') {
                ex.dungeon = { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 };
            }
            if (!Array.isArray(ex.dungeon.rooms)) ex.dungeon.rooms = [];
            if (!Array.isArray(ex.dungeon.log)) ex.dungeon.log = [];
            if (!Array.isArray(ex.dungeon.rewards)) ex.dungeon.rewards = [];
            if (typeof ex.dungeon.currentIndex !== 'number') ex.dungeon.currentIndex = 0;
            if (typeof ex.dungeon.active !== 'boolean') ex.dungeon.active = false;
            if (typeof ex.dungeon.seed !== 'number') ex.dungeon.seed = 0;
            if (typeof ex.dungeon.startedAt !== 'number') ex.dungeon.startedAt = 0;

            if (!ex.stats || typeof ex.stats !== 'object') {
                ex.stats = { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 };
            }
            ['expeditionsCompleted', 'treasuresFound', 'dungeonsCleared', 'npcsBefriended', 'npcsAdopted'].forEach((k) => {
                if (typeof ex.stats[k] !== 'number') ex.stats[k] = 0;
            });

            if (ex.expedition && typeof ex.expedition === 'object') {
                if (typeof ex.expedition.startedAt !== 'number') ex.expedition.startedAt = Date.now();
                if (typeof ex.expedition.endAt !== 'number') ex.expedition.endAt = ex.expedition.startedAt;
                if (typeof ex.expedition.lootMultiplier !== 'number') ex.expedition.lootMultiplier = 1;
                if (!ex.expedition.durationId) ex.expedition.durationId = 'scout';
            }

            ensureLootInventoryStacks(ex);

            return ex;
        }

        function normalizeLootStackMeta(meta) {
            const input = (meta && typeof meta === 'object') ? meta : {};
            return {
                source: typeof input.source === 'string' ? input.source : 'generic',
                createdAt: Number.isFinite(input.createdAt) ? Math.floor(input.createdAt) : Date.now(),
                biomeId: typeof input.biomeId === 'string' ? input.biomeId : null
            };
        }

        function ensureLootInventoryStacks(explorationState) {
            const ex = explorationState || ensureExplorationState();
            if (!ex || typeof ex !== 'object') return;
            if (!ex.lootInventory || typeof ex.lootInventory !== 'object') ex.lootInventory = {};
            if (!ex.lootInventoryStacks || typeof ex.lootInventoryStacks !== 'object' || Array.isArray(ex.lootInventoryStacks)) ex.lootInventoryStacks = {};

            Object.keys(ex.lootInventory).forEach((lootId) => {
                const totalQty = Math.max(0, Math.floor(Number(ex.lootInventory[lootId]) || 0));
                if (totalQty <= 0) {
                    delete ex.lootInventory[lootId];
                    delete ex.lootInventoryStacks[lootId];
                    return;
                }
                const rawStacks = Array.isArray(ex.lootInventoryStacks[lootId]) ? ex.lootInventoryStacks[lootId] : [];
                const cleanStacks = [];
                let runningQty = 0;
                rawStacks.forEach((stack) => {
                    if (!stack || typeof stack !== 'object') return;
                    const qty = Math.max(0, Math.floor(Number(stack.qty) || 0));
                    if (qty <= 0) return;
                    const nextQty = Math.min(qty, Math.max(0, totalQty - runningQty));
                    if (nextQty <= 0) return;
                    cleanStacks.push({ qty: nextQty, meta: normalizeLootStackMeta(stack.meta) });
                    runningQty += nextQty;
                });
                if (runningQty < totalQty) {
                    cleanStacks.push({ qty: totalQty - runningQty, meta: normalizeLootStackMeta({ source: 'generic' }) });
                    runningQty = totalQty;
                }
                if (runningQty > totalQty) {
                    let overflow = runningQty - totalQty;
                    while (overflow > 0 && cleanStacks.length > 0) {
                        const last = cleanStacks[cleanStacks.length - 1];
                        const take = Math.min(overflow, last.qty);
                        last.qty -= take;
                        overflow -= take;
                        if (last.qty <= 0) cleanStacks.pop();
                    }
                }
                ex.lootInventoryStacks[lootId] = cleanStacks;
            });

            Object.keys(ex.lootInventoryStacks).forEach((lootId) => {
                if (!ex.lootInventory[lootId] || ex.lootInventory[lootId] <= 0) delete ex.lootInventoryStacks[lootId];
            });
        }

        function isFishTypePetType(type) {
            if (!type) return false;
            if (type === 'fish') return true;
            return String(type).toLowerCase().includes('fish');
        }

        function isBirdTypePetType(type) {
            if (!type) return false;
            const t = String(type).toLowerCase();
            if (t === 'bird' || t === 'penguin' || t === 'pegasus') return true;
            return t.includes('bird');
        }

        function hasPetTypeMatch(matchFn, stateObj) {
            const state = stateObj || gameState;
            const pets = (state.pets && state.pets.length > 0) ? state.pets : (state.pet ? [state.pet] : []);
            return pets.some((pet) => pet && matchFn(pet.type));
        }

        function updateExplorationUnlocks(silent, stateObj) {
            const state = stateObj || gameState;
            const ex = ensureExplorationState(state);
            const stats = ex.stats || {};
            const hasBirdType = hasPetTypeMatch(isBirdTypePetType, state);
            const hasFishType = hasPetTypeMatch(isFishTypePetType, state);

            const shouldUnlock = {
                forest: true,
                beach: (stats.expeditionsCompleted || 0) >= 1,
                mountain: (stats.expeditionsCompleted || 0) >= 3,
                cave: (stats.dungeonsCleared || 0) >= 1,
                skyIsland: hasBirdType,
                underwater: hasFishType,
                skyZone: hasBirdType
            };

            const newlyUnlocked = [];
            Object.keys(shouldUnlock).forEach((biomeId) => {
                if (shouldUnlock[biomeId] && !ex.biomeUnlocks[biomeId]) {
                    ex.biomeUnlocks[biomeId] = true;
                    newlyUnlocked.push(biomeId);
                }
            });

            if (newlyUnlocked.length > 0 && !silent) {
                newlyUnlocked.forEach((biomeId, idx) => {
                    const biome = EXPLORATION_BIOMES[biomeId];
                    if (!biome) return;
                    setTimeout(() => showToast(`${biome.icon} New biome unlocked: ${biome.name}!`, '#4ECDC4'), idx * 220);
                });
                const names = newlyUnlocked
                    .map((id) => (EXPLORATION_BIOMES[id] ? EXPLORATION_BIOMES[id].name : id))
                    .join(', ');
                announce(`New exploration areas unlocked: ${names}.`);
            }

            return newlyUnlocked;
        }

        function isBiomeUnlocked(biomeId) {
            const ex = ensureExplorationState();
            return !!(ex.biomeUnlocks && ex.biomeUnlocks[biomeId]);
        }

        function getExplorationAlertCount() {
            const ex = ensureExplorationState();
            let count = 0;
            if (ex.expedition && Date.now() >= ex.expedition.endAt) count++;
            count += (ex.npcEncounters || []).filter((n) => n && n.status !== 'adopted' && n.adoptable).length;
            return count;
        }

        function getBiomeLootPool(biomeId) {
            return BIOME_LOOT_POOLS[biomeId] || BIOME_LOOT_POOLS.forest || ['ancientCoin'];
        }

        function addLootToInventory(lootId, count, meta) {
            const ex = ensureExplorationState();
            if (!EXPLORATION_LOOT[lootId]) return;
            const safeCount = Math.max(1, Math.floor(Number(count) || 1));
            ex.lootInventory[lootId] = (ex.lootInventory[lootId] || 0) + safeCount;
            ensureLootInventoryStacks(ex);
            const normalizedMeta = normalizeLootStackMeta(meta);
            if (!Array.isArray(ex.lootInventoryStacks[lootId])) ex.lootInventoryStacks[lootId] = [];
            const stacks = ex.lootInventoryStacks[lootId];
            const last = stacks.length > 0 ? stacks[stacks.length - 1] : null;
            if (last && last.meta && last.meta.source === normalizedMeta.source && last.meta.biomeId === normalizedMeta.biomeId) {
                last.qty = Math.max(0, Math.floor(Number(last.qty) || 0)) + safeCount;
                if (!Number.isFinite(last.meta.createdAt)) last.meta.createdAt = normalizedMeta.createdAt;
            } else {
                stacks.push({ qty: safeCount, meta: normalizedMeta });
            }
        }

        function getLootDropWeight(lootId, options) {
            const loot = EXPLORATION_LOOT[lootId];
            const rarity = loot && loot.rarity ? loot.rarity : 'common';
            let weight = 1;
            if (rarity === 'rare') weight = 0.3;
            else if (rarity === 'uncommon') weight = 0.65;

            const ctx = options && typeof options === 'object' ? options : null;
            if (ctx && ctx.source === 'expedition' && rarity !== 'common') {
                // Report #2: Late-biome expedition rarity odds are slightly less favorable.
                const biomeId = ctx.biomeId || 'forest';
                const biomeMult = (EXPEDITION_BALANCE && EXPEDITION_BALANCE.biomeRarityWeightMultiplier && Number(EXPEDITION_BALANCE.biomeRarityWeightMultiplier[biomeId])) || 1;
                let prestigeQualityMult = 1;
                if (typeof getPrestigeEffectValue === 'function') {
                    prestigeQualityMult = Math.max(1, Number(getPrestigeEffectValue('expeditionGuild', 'expeditionLootQualityMultiplier', 1)) || 1);
                }
                weight *= Math.max(0.65, Math.min(1.2, biomeMult * prestigeQualityMult));
            }
            return Math.max(0.05, weight);
        }

        function pickWeightedLootId(pool, options) {
            const candidates = (Array.isArray(pool) ? pool : [])
                .filter((lootId) => !!EXPLORATION_LOOT[lootId]);
            if (candidates.length === 0) return null;
            let total = 0;
            candidates.forEach((lootId) => {
                total += getLootDropWeight(lootId, options);
            });
            if (total <= 0) return randomFromArray(candidates);
            let roll = Math.random() * total;
            for (const lootId of candidates) {
                roll -= getLootDropWeight(lootId, options);
                if (roll <= 0) return lootId;
            }
            return candidates[candidates.length - 1];
        }

        function generateLootBundle(lootPool, rolls, options) {
            const pool = Array.isArray(lootPool) && lootPool.length > 0 ? lootPool : ['ancientCoin'];
            const rewardMap = {};
            const totalRolls = Math.max(1, Math.floor(rolls || 1));
            for (let i = 0; i < totalRolls; i++) {
                const lootId = pickWeightedLootId(pool, options);
                if (!lootId || !EXPLORATION_LOOT[lootId]) continue;
                const rarity = EXPLORATION_LOOT[lootId].rarity || 'common';
                let amount = 1;
                if (rarity === 'common' && Math.random() < 0.18) amount++;
                if (rarity === 'uncommon' && Math.random() < 0.08) amount++;
                if (rarity === 'rare' && Math.random() < 0.04) amount++;
                rewardMap[lootId] = (rewardMap[lootId] || 0) + amount;
            }
            const rewards = Object.entries(rewardMap).map(([id, count]) => ({
                id,
                count,
                data: EXPLORATION_LOOT[id]
            }));
            const rewardMeta = (options && typeof options === 'object')
                ? { source: options.source || 'generic', biomeId: options.biomeId || null, createdAt: Date.now() }
                : { source: 'generic', createdAt: Date.now() };
            rewards.forEach((reward) => addLootToInventory(reward.id, reward.count, rewardMeta));
            return rewards;
        }

        function getTreasureActionLabel(roomId) {
            const room = ROOMS[roomId];
            return room && room.isOutdoor ? 'Dig' : 'Search';
        }

        function getTreasureHuntEnergyCost() {
            const base = Math.max(1, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.energyCost) || 5));
            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
            const stage = pet && pet.growthStage ? pet.growthStage : 'baby';
            if (stage === 'baby') return Math.max(1, base - 1);
            return base;
        }

        function clampTreasureSuccessChance(value) {
            const min = Math.max(0.05, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.successChanceMin) || 0.2));
            return Math.max(min, Math.min(0.9, Number(value) || min));
        }

        function getTreasureHuntPreview(roomId) {
            const ex = ensureExplorationState();
            const now = Date.now();
            const t = ex.treasureHunt || {};
            const antiFarmWindowMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.antiFarmWindowMs) || (3 * 60 * 1000)));
            const penaltyResetMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.penaltyResetMs) || (4 * 60 * 1000)));
            const roomSwapPenaltyStep = Math.max(0, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.roomSwapPenaltyStep) || 0.07));
            const repeatPenaltyStep = Math.max(0, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.repeatPenaltyStep) || 0.05));
            const maxPenaltyStacks = Math.max(1, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.maxPenaltyStacks) || 6));
            const cooldownMs = Math.max(1000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.globalCooldownMs) || GAME_BALANCE.timing.treasureCooldownMs));
            const successChanceBase = Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.successChanceBase) || 0.48);
            const extraRollChanceBase = Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.extraRollChanceBase) || 0.22);

            const lastRunAt = Number(t.lastRunAt) || 0;
            const inActiveWindow = (now - lastRunAt) <= antiFarmWindowMs;
            const resetPenalty = (now - lastRunAt) > penaltyResetMs;

            let roomSwitchCount = resetPenalty ? 0 : (Number(t.roomSwitchCount) || 0);
            let repeatCount = resetPenalty ? 0 : (Number(t.repeatCount) || 0);
            const lastRoomId = typeof t.lastRoomId === 'string' ? t.lastRoomId : null;
            if (inActiveWindow && lastRoomId) {
                if (lastRoomId !== roomId) roomSwitchCount += 1;
                else repeatCount += 1;
            } else if (!inActiveWindow) {
                roomSwitchCount = 0;
                repeatCount = 0;
            }

            const penaltyStacks = Math.min(maxPenaltyStacks, Math.max(0, roomSwitchCount + repeatCount));
            let successChance = successChanceBase - (roomSwitchCount * roomSwapPenaltyStep) - (repeatCount * repeatPenaltyStep);
            // Report #8: Luxury room prestige bonus improves treasure odds slightly.
            successChance += Number(getPrestigeEffectValue('luxuryRoomUpgrade', 'treasureSuccessBonus', 0)) || 0;
            successChance = clampTreasureSuccessChance(successChance);
            const extraRollChance = Math.max(0, Math.min(0.9, extraRollChanceBase - (penaltyStacks * 0.08)));

            return {
                cooldownRemainingMs: Math.max(0, (Number(t.globalCooldownEndsAt) || 0) - now),
                cooldownMs,
                energyCost: getTreasureHuntEnergyCost(),
                penaltyStacks,
                roomSwitchCount,
                repeatCount,
                successChance,
                extraRollChance
            };
        }

        function getTreasureCooldownRemaining(roomId) {
            const preview = getTreasureHuntPreview(roomId);
            return Math.max(0, Number(preview.cooldownRemainingMs) || 0);
        }

        function resolvePetTypeForNpc(type) {
            if ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(type)) || PET_TYPES[type]) {
                return type;
            }
            const fallback = Object.keys(PET_TYPES).find((id) => !PET_TYPES[id].mythical);
            return fallback || 'dog';
        }

        function registerNpcEncounter(type, sourceBiome, sourceLabel) {
            const ex = ensureExplorationState();
            const resolvedType = resolvePetTypeForNpc(type);
            const existing = ex.npcEncounters.find((npc) =>
                npc && npc.status !== 'adopted' && npc.type === resolvedType && npc.sourceBiome === sourceBiome && (npc.bond || 0) >= 60
            );
            if (existing) return existing;

            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(resolvedType) : null) || PET_TYPES[resolvedType];
            const prefixes = ['Curious', 'Gentle', 'Brave', 'Swift', 'Misty', 'Sunny', 'Starry'];
            const suffixes = ['Scout', 'Pal', 'Wanderer', 'Paws', 'Fluff', 'Companion', 'Friend'];
            const npcName = `${randomFromArray(prefixes)} ${randomFromArray(suffixes)}`;
            const npc = {
                id: `npc_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                type: resolvedType,
                displayType: petData ? petData.name : resolvedType,
                icon: petData ? petData.emoji : '🐾',
                name: npcName,
                sourceBiome: sourceBiome || 'forest',
                sourceLabel: sourceLabel || ((EXPLORATION_BIOMES[sourceBiome] || {}).name || 'Wild'),
                bond: 0,
                adoptable: false,
                status: 'wild',
                befriended: false,
                discoveredAt: Date.now(),
                lastBefriendAt: 0
            };
            ex.npcEncounters.unshift(npc);
            if (ex.npcEncounters.length > 12) ex.npcEncounters = ex.npcEncounters.slice(0, 12);
            return npc;
        }

        function getRoomBiomeForTreasure(roomId) {
            switch (roomId) {
                case 'kitchen':
                case 'bathroom':
                    return 'beach';
                case 'park':
                    return 'mountain';
                case 'garden':
                    return 'forest';
                default:
                    return 'forest';
            }
        }

        function abandonExpedition(silent) {
            const ex = ensureExplorationState();
            if (!ex.expedition) return { ok: false, reason: 'no-expedition' };
            const abandoned = ex.expedition;
            ex.expedition = null;
            saveGame();
            if (!silent) {
                showToast('🧭 Expedition ended early. No rewards were collected.', '#FFA726');
            }
            return { ok: true, abandoned };
        }

        function getExpeditionUpkeepCost(biomeId, duration) {
            const safeDuration = duration || EXPEDITION_DURATIONS[0] || { ms: 40000 };
            const mins = Math.max(0.5, Number(safeDuration.ms || 0) / 60000);
            const baseCost = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.upkeepBaseCoins) || 0);
            const perMinute = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.upkeepPerMinute) || 0);
            const biomeMult = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.biomeUpkeepMultiplier && EXPEDITION_BALANCE.biomeUpkeepMultiplier[biomeId]) || 1);
            const prestigeMult = Number(getPrestigeEffectValue('expeditionGuild', 'expeditionUpkeepMultiplier', 1)) || 1;
            return Math.max(0, Math.round((baseCost + (mins * perMinute)) * biomeMult * prestigeMult));
        }

        function getExpeditionLootRollCount(baseRolls, lootMultiplier, bonusRolls) {
            const threshold = Math.max(1, Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.durationDiminishingThreshold) || 1.9));
            const exponent = Math.max(0.3, Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.durationDiminishingExponent) || 0.68));
            const rawMult = Math.max(0.2, Number(lootMultiplier) || 1);
            // Report #2: Diminishing returns after threshold keeps long runs better but smoother.
            const diminishedMult = rawMult <= threshold
                ? rawMult
                : threshold + Math.pow(Math.max(0, rawMult - threshold), exponent);
            const stageRollBonus = Number(getMasteryPhaseBonus((gameState.pet && gameState.pet.growthStage) || 'baby', 'expeditionRolls')) || 0;
            const total = Math.round((Math.max(1, baseRolls) * diminishedMult) + Math.max(0, Number(bonusRolls) || 0) + Math.max(0, stageRollBonus));
            return Math.max(2, total);
        }

        function getExpeditionPreview(biomeId, durationId) {
            const duration = EXPEDITION_DURATIONS.find((d) => d.id === durationId) || EXPEDITION_DURATIONS[0];
            const upkeepCost = getExpeditionUpkeepCost(biomeId, duration);
            const projectedRolls = getExpeditionLootRollCount(2.5, duration.lootMultiplier || 1, 0);
            return { upkeepCost, projectedRolls, duration };
        }

	        function startExpedition(biomeId, durationId) {
            const ex = ensureExplorationState();
            updateExplorationUnlocks(true);
            if (ex.expedition) return { ok: false, reason: 'already-running' };
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'dungeon-active' };
            if (!EXPLORATION_BIOMES[biomeId]) return { ok: false, reason: 'invalid-biome' };
            if (!isBiomeUnlocked(biomeId)) return { ok: false, reason: 'locked-biome' };

            const duration = EXPEDITION_DURATIONS.find((d) => d.id === durationId) || EXPEDITION_DURATIONS[0];
            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
            if (!pet) return { ok: false, reason: 'no-pet' };
            const upkeepCost = getExpeditionUpkeepCost(biomeId, duration);
            if (upkeepCost > 0) {
                // Report #2: Upkeep scales by biome and duration.
                const spend = spendCoins(upkeepCost, 'Expedition Upkeep', true);
                if (!spend.ok) {
                    return { ok: false, reason: spend.reason, needed: upkeepCost, balance: spend.balance };
                }
            }

            const now = Date.now();
	            ex.expedition = {
                biomeId,
                petId: pet.id,
                petName: pet.name || ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(pet.type) ? getAllPetTypeData(pet.type).name : 'Pet')),
                durationId: duration.id,
                startedAt: now,
                endAt: now + duration.ms,
	                lootMultiplier: duration.lootMultiplier,
                upkeepCost: upkeepCost
	            };
            balanceDebugLog('ExpeditionStart', { biomeId, durationId: duration.id, upkeepCost, lootMultiplier: duration.lootMultiplier }); // Report #2
	            recordRetentionActivity('expedition');
	            if (typeof markCoachChecklistProgress === 'function') markCoachChecklistProgress('start_expedition');
	            saveGame();
	            return { ok: true, expedition: ex.expedition, biome: EXPLORATION_BIOMES[biomeId], duration, upkeepCost };
	        }

        function resolveExpeditionIfReady(forceResolve, silent) {
            const ex = ensureExplorationState();
            if (!ex.expedition) return { ok: false, reason: 'no-expedition' };
            const expedition = ex.expedition;
            const now = Date.now();
            const priorWallClock = Math.max(0, Number((gameState.timeHardening && gameState.timeHardening.lastSeenWallClock) || 0));
            const jumpInfo = checkAndRecordTimeJump(gameState, 'expedition-resolve', { now });
            let effectiveNow = now;
            if (jumpInfo && jumpInfo.detected) {
                const elapsedSinceStart = Math.max(0, now - (Number(expedition.startedAt) || now));
                const clampedAdvance = clampElapsedForHardening(elapsedSinceStart, 'expedition');
                effectiveNow = Math.max(priorWallClock || 0, (Number(expedition.startedAt) || now) + clampedAdvance);
            }
            const wasAlreadyDueBeforeJump = priorWallClock > 0 && priorWallClock >= (expedition.endAt || 0);
            if ((jumpInfo && jumpInfo.detected) && !wasAlreadyDueBeforeJump && isTimeStabilizationActive(gameState) && !forceResolve) {
                if (!silent && typeof showToast === 'function') {
                    showToast('⏱️ Time changed; expedition rewards are paused until time stabilizes.', '#FFA726');
                }
                return { ok: false, reason: 'time-paused', remainingMs: Math.max(0, (expedition.endAt || 0) - Math.min(effectiveNow, now)) };
            }
            if (isTimeStabilizationActive(gameState) && effectiveNow < (expedition.endAt || 0) && !forceResolve) {
                if (!silent && typeof showToast === 'function') {
                    showToast('⏱️ Time changed; expedition rewards are paused until time stabilizes.', '#FFA726');
                }
                return { ok: false, reason: 'time-paused', remainingMs: Math.max(0, (expedition.endAt || 0) - effectiveNow) };
            }
            if (effectiveNow < expedition.endAt) {
                return { ok: false, reason: 'in-progress', remainingMs: expedition.endAt - effectiveNow };
            }

            const biome = EXPLORATION_BIOMES[expedition.biomeId] || EXPLORATION_BIOMES.forest;
            const duration = EXPEDITION_DURATIONS.find((d) => d.id === expedition.durationId) || EXPEDITION_DURATIONS[0];
            const baseRolls = 2 + Math.floor(Math.random() * 2);
            const bonusRolls = typeof consumeExpeditionRewardBonusRolls === 'function' ? consumeExpeditionRewardBonusRolls() : 0;
            const totalRolls = getExpeditionLootRollCount(baseRolls, (expedition.lootMultiplier || duration.lootMultiplier || 1), bonusRolls);
            const rewards = generateLootBundle(getBiomeLootPool(expedition.biomeId), totalRolls, { source: 'expedition', biomeId: expedition.biomeId });
            ex.discoveredBiomes[expedition.biomeId] = true;
            ex.stats.expeditionsCompleted++;

            const targetPet = (gameState.pets || []).find((p) => p && p.id === expedition.petId) || gameState.pet;
            if (targetPet) {
                targetPet.happiness = clamp(targetPet.happiness + GAME_BALANCE.petCare.expeditionHappinessGain, 0, 100);
                targetPet.energy = clamp(targetPet.energy - GAME_BALANCE.petCare.expeditionEnergyCost, 0, 100);
            }

            let npc = null;
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : null;
            if (npcCandidates && npcCandidates.length > 0 && Math.random() < 0.32) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biome.id, biome.name);
            }

            const historyEntry = {
                at: now,
                biomeId: expedition.biomeId,
                biomeName: biome.name,
                petName: expedition.petName || 'Pet',
                rewards: rewards.map((r) => ({ id: r.id, count: r.count })),
                npcId: npc ? npc.id : null,
                rolls: totalRolls,
                upkeepCost: expedition.upkeepCost || 0
            };
            ex.expeditionHistory.unshift(historyEntry);
            if (ex.expeditionHistory.length > 15) ex.expeditionHistory = ex.expeditionHistory.slice(0, 15);
            ex.expedition = null;

	            if (typeof incrementDailyProgress === 'function') {
	                incrementDailyProgress('expeditionCount');
	                incrementDailyProgress('discoveryEvents');
	                incrementDailyProgress('masteryPoints', 2);
	            }
	            addBondXp(2, 'Expedition complete');
	            recordRetentionActivity('expedition');
	            evaluateJourneyProgress('expedition-complete');

	            const newlyUnlocked = updateExplorationUnlocks(true);
            refreshMasteryTracks();
            saveGame();

            const estimatedSellValue = rewards.reduce((sum, reward) => {
                return sum + ((getLootSellPrice(reward.id, { source: 'expedition' }) || 0) * (reward.count || 0));
            }, 0);
            balanceDebugLog('ExpeditionResolve', { // Report #2
                biomeId: expedition.biomeId,
                durationId: expedition.durationId,
                totalRolls,
                upkeepCost: expedition.upkeepCost || 0,
                estimatedSellValue,
                rewardCount: rewards.length
            });

            if (!silent) {
                const rewardPreview = rewards.slice(0, 3).map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                showToast(`🧭 Expedition complete in ${biome.icon} ${biome.name}! ${rewardPreview}`, '#4ECDC4');
                // Show encounter narrative for this biome
                if (typeof getExplorationNarrative === 'function') {
                    const narrative = getExplorationNarrative(expedition.biomeId, expedition.petName || 'Your pet');
                    if (narrative) {
                        setTimeout(() => showToast(narrative, '#90CAF9'), 400);
                    }
                }
                if (npc) {
                    setTimeout(() => showToast(`${npc.icon} You discovered ${npc.name} in the wild!`, '#FFD54F'), 620);
                }
                if (newlyUnlocked.length > 0) {
                    newlyUnlocked.forEach((id, idx) => {
                        const b = EXPLORATION_BIOMES[id];
                        if (b) setTimeout(() => showToast(`${b.icon} ${b.name} unlocked!`, '#81C784'), 820 + idx * 200);
                    });
                }
            }

            return { ok: true, rewards, npc, biome, newlyUnlocked, totalRolls, estimatedSellValue, upkeepCost: expedition.upkeepCost || 0 };
        }

        function runTreasureHunt(roomId) {
            const ex = ensureExplorationState();
            const room = ROOMS[roomId];
            if (!room) return { ok: false, reason: 'invalid-room' };
            const preview = getTreasureHuntPreview(roomId);
            const remaining = Math.max(0, preview.cooldownRemainingMs || 0);
            if (remaining > 0) return { ok: false, reason: 'cooldown', remainingMs: remaining, preview };

            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
            const energyCost = Math.max(0, preview.energyCost || 0);
            if (!pet || Number(pet.energy || 0) < energyCost) {
                return { ok: false, reason: 'insufficient-energy', needed: energyCost, current: pet ? Number(pet.energy || 0) : 0, preview };
            }
            // Report #1: Small recurring cost keeps hunts supplemental, not dominant.
            pet.energy = clamp((Number(pet.energy) || 0) - energyCost, 0, 100);

            const now = Date.now();
            const t = ex.treasureHunt;
            const antiFarmWindowMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.antiFarmWindowMs) || (3 * 60 * 1000)));
            const penaltyResetMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.penaltyResetMs) || (4 * 60 * 1000)));
            const elapsed = now - (Number(t.lastRunAt) || 0);
            if (elapsed > penaltyResetMs) {
                t.roomSwitchCount = 0;
                t.repeatCount = 0;
            }
            if (elapsed <= antiFarmWindowMs && t.lastRoomId) {
                if (t.lastRoomId !== roomId) t.roomSwitchCount = Math.max(0, Number(t.roomSwitchCount || 0) + 1);
                else t.repeatCount = Math.max(0, Number(t.repeatCount || 0) + 1);
            } else {
                t.roomSwitchCount = 0;
                t.repeatCount = 0;
            }
            t.lastRoomId = roomId;
            t.lastRunAt = now;
            t.globalCooldownEndsAt = now + Math.max(1000, Number(preview.cooldownMs) || 0);
            t.recentRuns.push({ at: now, roomId });
            t.recentRuns = t.recentRuns.filter((entry) => entry && (now - Number(entry.at || 0)) <= antiFarmWindowMs);

            ex.roomTreasureCooldowns[roomId] = now;
            const foundTreasure = Math.random() < Math.max(0, Math.min(1, preview.successChance || 0.2));
            const action = getTreasureActionLabel(roomId);
            const lootPool = ROOM_TREASURE_POOLS[roomId] || ['ancientCoin'];
            const rolls = 1 + ((Math.random() < Math.max(0, Math.min(1, preview.extraRollChance || 0))) ? 1 : 0);
            const rewards = foundTreasure ? generateLootBundle(lootPool, rolls, { source: 'treasure', roomId }) : [];

            if (foundTreasure) {
                ex.stats.treasuresFound++;
                if (gameState.pet) {
                    gameState.pet.happiness = clamp(gameState.pet.happiness + 6, 0, 100);
                }
            }

            let npc = null;
            const biomeId = getRoomBiomeForTreasure(roomId);
            const biome = EXPLORATION_BIOMES[biomeId];
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : ['dog', 'cat'];
            const npcChance = room.isOutdoor ? 0.18 : 0.1;
            if (Math.random() < npcChance) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biomeId, room.name);
            }

            balanceDebugLog('TreasureHunt', { // Report #1
                roomId,
                penaltyStacks: preview.penaltyStacks,
                successChance: preview.successChance,
                foundTreasure,
                rolls,
                energyCost
            });

            saveGame();
            return {
                ok: true,
                action,
                foundTreasure,
                rewards,
                npc,
                room,
                energyCost,
                cooldownMs: preview.cooldownMs,
                penaltyStacks: preview.penaltyStacks,
                successChance: preview.successChance
            };
        }

        function createSeededRng(seed) {
            let s = (seed >>> 0) || 123456789;
            return function nextRandom() {
                s = (1664525 * s + 1013904223) >>> 0;
                return s / 4294967296;
            };
        }

        function generateDungeonRooms(seed, depth) {
            const rand = createSeededRng(seed);
            const weightedTypes = ['combat', 'treasure', 'combat', 'trap', 'npc', 'rest'];
            const count = Math.max(4, depth || 6);
            const rooms = [];
            for (let i = 0; i < count; i++) {
                let type = weightedTypes[Math.floor(rand() * weightedTypes.length)];
                if (i === 0) type = 'combat';
                if (i === count - 1) type = 'treasure';
                const roomType = DUNGEON_ROOM_TYPES.find((r) => r.id === type) || DUNGEON_ROOM_TYPES[0];
                rooms.push({
                    id: `${seed}_${i}`,
                    index: i,
                    type,
                    name: roomType.name,
                    icon: roomType.icon,
                    danger: 1 + Math.floor(rand() * 4) + Math.floor(i / 2)
                });
            }
            return rooms;
        }

        function startDungeonCrawl() {
            const ex = ensureExplorationState();
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'already-running' };
            if (ex.expedition) return { ok: false, reason: 'expedition-active' };
            const seed = Math.floor(Date.now() % 2147483647);
            const depth = 6 + Math.floor(Math.random() * 3);
            ex.dungeon = {
                active: true,
                seed,
                rooms: generateDungeonRooms(seed, depth),
                currentIndex: 0,
                log: [],
                rewards: [],
                startedAt: Date.now(),
                roomCooldownMs: GAME_BALANCE.timing.dungeonRoomCooldownMs,
                nextRoomAt: Date.now()
            };
            saveGame();
            return { ok: true, dungeon: ex.dungeon };
        }

        function advanceDungeonCrawl() {
            const ex = ensureExplorationState();
            if (!ex.dungeon || !ex.dungeon.active) return { ok: false, reason: 'no-dungeon' };
            const dungeon = ex.dungeon;
            const now = Date.now();
            const remainingMs = Math.max(0, (dungeon.nextRoomAt || 0) - now);
            if (remainingMs > 0) return { ok: false, reason: 'cooldown', remainingMs };
            const room = dungeon.rooms[dungeon.currentIndex];
            if (!room) {
                dungeon.active = false;
                saveGame();
                return { ok: false, reason: 'invalid-room' };
            }

            const pet = gameState.pet;
            const floorLootPool = getBiomeLootPool('cave').concat(getBiomeLootPool('mountain'));
            let message = '';
            let rewards = [];
            let npc = null;
            const danger = Math.max(1, Number(room.danger) || 1);
            const dangerTier = Math.max(0, danger - 1);

            if (pet) {
                if ((pet.energy || 0) < 8) {
                    return { ok: false, reason: 'low-energy', neededEnergy: 8, currentEnergy: pet.energy || 0 };
                }
                const baselineCost = 3 + Math.floor(Math.random() * 3) + Math.floor(dangerTier / 2);
                pet.energy = clamp(pet.energy - baselineCost, 0, 100);
            }

            switch (room.type) {
                case 'combat': {
                    if (pet) {
                        pet.happiness = clamp(pet.happiness + 3 + Math.min(3, Math.floor(dangerTier / 2)), 0, 100);
                        pet.hunger = clamp(pet.hunger - (3 + Math.floor(dangerTier / 2)), 0, 100);
                    }
                    if (Math.random() < Math.min(0.85, 0.42 + (dangerTier * 0.06))) {
                        rewards = generateLootBundle(floorLootPool, 1 + (dangerTier >= 5 ? 1 : 0));
                    }
                    message = `${room.icon} You fought through a danger ${danger} room.`;
                    break;
                }
                case 'treasure': {
                    rewards = generateLootBundle(floorLootPool.concat(['runeFragment', 'mysteryMap']), 2 + Math.floor(dangerTier / 3));
                    if (pet) pet.happiness = clamp(pet.happiness + 8, 0, 100);
                    message = `${room.icon} You found a hidden treasure chamber!`;
                    break;
                }
                case 'trap': {
                    if (pet) {
                        pet.cleanliness = clamp(pet.cleanliness - (6 + dangerTier), 0, 100);
                        pet.happiness = clamp(pet.happiness - (3 + Math.floor(dangerTier / 2)), 0, 100);
                    }
                    message = `${room.icon} A trap slowed you down, but you pushed on.`;
                    break;
                }
                case 'rest': {
                    if (pet) {
                        pet.energy = clamp(pet.energy + 15, 0, 100);
                        pet.happiness = clamp(pet.happiness + 5, 0, 100);
                    }
                    message = `${room.icon} You found a safe campfire and recovered.`;
                    break;
                }
                case 'npc': {
                    const npcs = (EXPLORATION_BIOMES.cave && EXPLORATION_BIOMES.cave.npcTypes) ? EXPLORATION_BIOMES.cave.npcTypes : ['frog'];
                    npc = registerNpcEncounter(randomFromArray(npcs), 'cave', 'Dungeon');
                    message = `${room.icon} You met ${npc.name}, a wild pet in need of a friend.`;
                    break;
                }
                default: {
                    message = `${room.icon} You moved deeper into the dungeon.`;
                    break;
                }
            }

            dungeon.rewards.push(...rewards.map((r) => ({ id: r.id, count: r.count })));
            dungeon.log.unshift({
                at: Date.now(),
                roomType: room.type,
                icon: room.icon,
                message
            });
            if (dungeon.log.length > 15) dungeon.log = dungeon.log.slice(0, 15);

            dungeon.currentIndex++;
            dungeon.nextRoomAt = Date.now() + Math.max(12000, dungeon.roomCooldownMs || GAME_BALANCE.timing.dungeonRoomCooldownMs);
            let cleared = false;
            let clearRewards = [];
            if (dungeon.currentIndex >= dungeon.rooms.length) {
                cleared = true;
                const averageDanger = dungeon.rooms.length > 0
                    ? dungeon.rooms.reduce((sum, r) => sum + Math.max(1, Number(r.danger) || 1), 0) / dungeon.rooms.length
                    : 1;
                const clearRolls = 2 + Math.max(1, Math.round(averageDanger / 2));
                clearRewards = generateLootBundle(getBiomeLootPool('cave').concat(['runeFragment', 'stardust', 'mysteryMap']), clearRolls);
                dungeon.rewards.push(...clearRewards.map((r) => ({ id: r.id, count: r.count })));
                ex.stats.dungeonsCleared++;
                dungeon.active = false;
            }

            const newlyUnlocked = updateExplorationUnlocks(true);
            saveGame();

            return {
                ok: true,
                room,
                message,
                rewards,
                npc,
                cleared,
                clearRewards,
                progress: `${Math.min(dungeon.currentIndex, dungeon.rooms.length)}/${dungeon.rooms.length}`,
                newlyUnlocked
            };
        }

        function befriendNpc(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };

            const now = Date.now();
            const cooldownMs = GAME_BALANCE.timing.npcBefriendCooldownMs;
            if (npc.lastBefriendAt && now - npc.lastBefriendAt < cooldownMs) {
                return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - (now - npc.lastBefriendAt) };
            }

            const gain = 20 + Math.floor(Math.random() * 16);
            npc.bond = clamp((npc.bond || 0) + gain, 0, 100);
            npc.lastBefriendAt = now;
            if (!npc.befriended) {
                npc.befriended = true;
                ex.stats.npcsBefriended++;
            }
            if (npc.bond >= 100) {
                npc.adoptable = true;
            }

            let gift = null;
            if (Math.random() < 0.3) {
                const pool = getBiomeLootPool(npc.sourceBiome || 'forest');
                const gifts = generateLootBundle(pool, 1);
                gift = gifts[0] || null;
            }

            saveGame();
            return { ok: true, npc, gain, gift };
        }

        function adoptNpcPet(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };
            if (!npc.adoptable && (npc.bond || 0) < 100) return { ok: false, reason: 'bond-too-low' };
            if (typeof canAdoptMore === 'function' && !canAdoptMore()) return { ok: false, reason: 'family-full' };

            const newPet = createPet(npc.type);
            const safeName = sanitizePetName(npc.name);
            if (safeName) newPet.name = safeName;
            addPetToFamily(newPet);
            gameState.activePetIndex = gameState.pets.length - 1;
            gameState.pet = gameState.pets[gameState.activePetIndex];

            npc.status = 'adopted';
            npc.adoptedAt = Date.now();
            ex.stats.npcsAdopted++;

            saveGame();
            return { ok: true, pet: newPet, npc };
        }

        // ==================== ECONOMY & TRADING ====================

        function getAuctionHouseStorageKey() {
            return STORAGE_KEYS.auctionHouse;
        }

        function getAuctionSlotStorageKey() {
            return STORAGE_KEYS.auctionSlotId;
        }

        function getAuctionSlotLabel(slotId) {
            const map = { slotA: 'Slot A', slotB: 'Slot B', slotC: 'Slot C' };
            return map[slotId] || String(slotId || 'Slot');
        }

        function hashStringToUint(value) {
            let hash = 2166136261;
            const str = String(value || '');
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        }

        function createDefaultAuctionHouseData() {
            return { listings: [], wallets: {}, profileWallets: {} };
        }

        function loadAuctionHouseData() {
            try {
                const raw = localStorage.getItem(getAuctionHouseStorageKey());
                if (!raw) return createDefaultAuctionHouseData();
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return createDefaultAuctionHouseData();
                if (!Array.isArray(parsed.listings)) parsed.listings = [];
                if (!parsed.wallets || typeof parsed.wallets !== 'object') parsed.wallets = {};
                if (!parsed.profileWallets || typeof parsed.profileWallets !== 'object') parsed.profileWallets = {};
                parsed.listings = parsed.listings
                    .filter((l) => l && typeof l === 'object')
                    .map((listing) => ({
                        id: String(listing.id || ''),
                        sellerSlot: String(listing.sellerSlot || 'slotA'),
                        // Report #6: Stable identity stored on listing ownership.
                        sellerProfileId: listing.sellerProfileId ? String(listing.sellerProfileId) : null,
                        sellerPlayerId: listing.sellerPlayerId ? String(listing.sellerPlayerId) : null,
                        itemType: String(listing.itemType || ''),
                        itemId: String(listing.itemId || ''),
                        quantity: Math.max(1, Math.floor(Number(listing.quantity) || 1)),
                        price: Math.max(1, Math.floor(Number(listing.price) || 1)),
                        createdAt: Number(listing.createdAt) || Date.now(),
                        legacyOwnerSlot: listing.legacyOwnerSlot ? String(listing.legacyOwnerSlot) : null,
                        relistKey: listing.relistKey ? String(listing.relistKey) : '',
                        relistCount: Math.max(0, Math.floor(Number(listing.relistCount) || 0))
                    }))
                    .filter((l) => l.id && l.itemType && l.itemId);
                return parsed;
            } catch (e) {
                return createDefaultAuctionHouseData();
            }
        }

        function saveAuctionHouseData(data) {
            try {
                const clean = data && typeof data === 'object' ? data : createDefaultAuctionHouseData();
                if (!Array.isArray(clean.listings)) clean.listings = [];
                if (!clean.wallets || typeof clean.wallets !== 'object') clean.wallets = {};
                if (!clean.profileWallets || typeof clean.profileWallets !== 'object') clean.profileWallets = {};
                localStorage.setItem(getAuctionHouseStorageKey(), JSON.stringify(clean));
            } catch (e) {
                // ignore storage errors
            }
        }

        function migrateAuctionIdentityForPlayer(playerId, activeSlotId) {
            if (!playerId) return;
            const data = loadAuctionHouseData();
            let changed = false;
            (data.listings || []).forEach((listing) => {
                if (!listing || listing.sellerProfileId) return;
                if (listing.sellerPlayerId) {
                    listing.sellerProfileId = listing.sellerPlayerId;
                    changed = true;
                    return;
                }
                // Report #6: Best-effort migration for legacy slot-owned listings.
                if (listing.sellerSlot === activeSlotId) {
                    listing.sellerProfileId = playerId;
                    changed = true;
                } else {
                    listing.legacyOwnerSlot = listing.sellerSlot;
                }
            });

            const legacyWallet = Math.max(0, Math.floor((data.wallets && data.wallets[activeSlotId]) || 0));
            if (legacyWallet > 0) {
                data.profileWallets[playerId] = Math.max(0, Math.floor((data.profileWallets[playerId] || 0))) + legacyWallet;
                data.wallets[activeSlotId] = 0;
                changed = true;
            }
            if (changed) saveAuctionHouseData(data);
        }

        function createDefaultEconomyInventory() {
            return {
                food: {},
                toys: {},
                medicine: {},
                seeds: {},
                accessories: {},
                decorations: {},
                crafted: {}
            };
        }

        function ensureEconomyState(stateObj) {
            const state = stateObj || gameState;
            if (!state.economy || typeof state.economy !== 'object') {
                state.economy = createDefaultEconomyState();
            }
            const eco = state.economy;
            if (!Number.isFinite(state.saveVersion)) state.saveVersion = 1;
            ensureSecurityState(state);
            ensureTimeHardeningState(state);
            if (typeof eco.coins !== 'number' || !Number.isFinite(eco.coins)) eco.coins = 240;
            eco.coins = Math.max(0, Math.floor(eco.coins));
            if (!eco.inventory || typeof eco.inventory !== 'object') eco.inventory = createDefaultEconomyInventory();
            ['food', 'toys', 'medicine', 'seeds', 'accessories', 'decorations', 'crafted'].forEach((bucket) => {
                if (!eco.inventory[bucket] || typeof eco.inventory[bucket] !== 'object' || Array.isArray(eco.inventory[bucket])) {
                    eco.inventory[bucket] = {};
                }
            });
            if (!eco.market || typeof eco.market !== 'object') eco.market = { dayKey: '', stock: [] };
            if (typeof eco.market.dayKey !== 'string') eco.market.dayKey = '';
            if (!Array.isArray(eco.market.stock)) eco.market.stock = [];
            if (!eco.auction || typeof eco.auction !== 'object') eco.auction = { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0, relistTracker: {} };
            if (!ECONOMY_AUCTION_SLOTS.includes(eco.auction.slotId)) eco.auction.slotId = 'slotA';
            if (typeof eco.auction.soldCount !== 'number') eco.auction.soldCount = 0;
            if (typeof eco.auction.boughtCount !== 'number') eco.auction.boughtCount = 0;
            if (typeof eco.auction.postedCount !== 'number') eco.auction.postedCount = 0;
            if (!eco.auction.relistTracker || typeof eco.auction.relistTracker !== 'object' || Array.isArray(eco.auction.relistTracker)) eco.auction.relistTracker = {};
            if (typeof eco.totalEarned !== 'number') eco.totalEarned = 0;
            if (typeof eco.totalSpent !== 'number') eco.totalSpent = 0;
            if (typeof eco.mysteryEggsOpened !== 'number') eco.mysteryEggsOpened = 0;
            if (!eco.wealthPressure || typeof eco.wealthPressure !== 'object' || Array.isArray(eco.wealthPressure)) {
                eco.wealthPressure = createDefaultEconomyState().wealthPressure;
            }
            if (typeof eco.wealthPressure.lastAppliedDate !== 'string') eco.wealthPressure.lastAppliedDate = '';
            if (!Number.isFinite(eco.wealthPressure.lastFee)) eco.wealthPressure.lastFee = 0;
            if (!Number.isFinite(eco.wealthPressure.unpaidFeeDebt)) eco.wealthPressure.unpaidFeeDebt = 0;
            if (eco.wealthPressure.lastBreakdown !== null && typeof eco.wealthPressure.lastBreakdown !== 'object') eco.wealthPressure.lastBreakdown = null;
            // Rec 2: Ensure persistent playerId exists for auction self-trade prevention
            if (!eco.playerId || typeof eco.playerId !== 'string') eco.playerId = generatePlayerId();
            if (typeof eco.auctionIdentityMigrationDone !== 'boolean') eco.auctionIdentityMigrationDone = false;
            if (eco.starterSeedGranted !== true) {
                eco.inventory.seeds.carrot = (eco.inventory.seeds.carrot || 0) + 4;
                eco.inventory.seeds.tomato = (eco.inventory.seeds.tomato || 0) + 3;
                eco.inventory.seeds.strawberry = (eco.inventory.seeds.strawberry || 0) + 2;
                eco.starterSeedGranted = true;
            }
            const preferredSlot = (() => {
                try {
                    return localStorage.getItem(getAuctionSlotStorageKey());
                } catch (e) {
                    return null;
                }
            })();
            if (preferredSlot && ECONOMY_AUCTION_SLOTS.includes(preferredSlot)) eco.auction.slotId = preferredSlot;
            if (!eco.auctionIdentityMigrationDone) {
                migrateAuctionIdentityForPlayer(eco.playerId, eco.auction.slotId);
                eco.auctionIdentityMigrationDone = true;
            }
            return eco;
        }

        function getCoinBalance() {
            return (ensureEconomyState().coins || 0);
        }

        function formatCoins(amount) {
            return Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString();
        }

        function estimateTradableInventoryValue(targetState) {
            const state = targetState || gameState;
            ensureExplorationState(state);
            ensureEconomyState(state);
            const ex = state.exploration || {};
            const eco = state.economy || {};
            let total = 0;

            Object.entries(ex.lootInventory || {}).forEach(([lootId, qty]) => {
                const count = Math.max(0, Math.floor(Number(qty) || 0));
                if (count <= 0) return;
                total += getLootSellPrice(lootId, { skipSecurityPenalty: true }) * count;
            });

            const gardenInv = (((state.garden || {}).inventory) || {});
            Object.entries(gardenInv).forEach(([itemId, qty]) => {
                const count = Math.max(0, Math.floor(Number(qty) || 0));
                if (count <= 0) return;
                const crop = GARDEN_CROPS[itemId] || FLOWER_GARDEN_PLANTS[itemId] || MUSHROOM_CAVE_PLANTS[itemId];
                if (!crop) return;
                const base = 3 + Math.round((crop.hungerValue || 0) / 4) + Math.round((crop.happinessValue || 0) / 6) + Math.round((crop.energyValue || 0) / 6);
                total += Math.max(1, base) * count;
            });

            ['crafted', 'accessories', 'decorations'].forEach((bucket) => {
                Object.entries(((eco.inventory || {})[bucket]) || {}).forEach(([itemId, qty]) => {
                    const count = Math.max(0, Math.floor(Number(qty) || 0));
                    if (count <= 0) return;
                    const shopBucket = bucket === 'crafted' ? null : (bucket === 'decorations' ? 'decorations' : 'accessories');
                    const shopDef = (shopBucket && ECONOMY_SHOP_ITEMS && ECONOMY_SHOP_ITEMS[shopBucket]) ? ECONOMY_SHOP_ITEMS[shopBucket][itemId] : null;
                    const baseValue = shopDef ? Math.max(1, Math.floor(Number(shopDef.price) || 1)) : 10;
                    total += Math.max(1, Math.round(baseValue * 0.55)) * count;
                });
            });

            return Math.max(0, Math.floor(total));
        }

        function applyWealthPressureDebtRepayment(earnedCoins, targetState) {
            const state = targetState || gameState;
            const eco = ensureEconomyState(state);
            const debt = Math.max(0, Number((((eco || {}).wealthPressure) || {}).unpaidFeeDebt) || 0);
            if (debt <= 0 || earnedCoins <= 0) return { credited: earnedCoins, repaid: 0 };
            const repay = Math.min(debt, Math.max(1, Math.floor(earnedCoins * 0.25)));
            eco.wealthPressure.unpaidFeeDebt = Math.max(0, Math.ceil(debt - repay));
            return { credited: Math.max(0, earnedCoins - repay), repaid: repay };
        }

        function addCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const rawAdd = Math.max(0, Math.floor(Number(amount) || 0));
            if (rawAdd <= 0) return 0;
            const limited = applyCoinGainRateLimits(rawAdd, reason, gameState);
            let add = Math.max(0, Math.floor(Number(limited.amount) || 0));
            const repayment = applyWealthPressureDebtRepayment(add, gameState);
            add = repayment.credited;
            if (add > 0) eco.coins += add;
            eco.totalEarned = (eco.totalEarned || 0) + add;
            if (!silent && typeof showToast === 'function') {
                let msg = `🪙 +${add} coins${reason ? ` (${reason})` : ''}`;
                if (repayment.repaid > 0) msg += ` • ${repayment.repaid} paid toward storage fee debt`;
                showToast(msg, '#FFD700');
            } else if (repayment.repaid > 0 && typeof showToast === 'function') {
                showToast(`🧾 ${repayment.repaid} coins auto-paid toward storage fee debt.`, '#90A4AE');
            }
            return add;
        }

        function spendCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const cost = Math.max(0, Math.floor(Number(amount) || 0));
            if (cost <= 0) return { ok: true, spent: 0, balance: eco.coins };
            if (eco.coins < cost) {
                return { ok: false, reason: 'insufficient-funds', needed: cost, balance: eco.coins };
            }
            eco.coins -= cost;
            eco.totalSpent = (eco.totalSpent || 0) + cost;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 -${cost} coins${reason ? ` (${reason})` : ''}`, '#FFB74D');
            }
            return { ok: true, spent: cost, balance: eco.coins };
        }

        function getEconomyCategoryMultiplier(category) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonalMultipliers = {
                spring: { seeds: 0.9, food: 0.96, toys: 1.02, medicine: 0.95, decorations: 0.98, mysteryEgg: 1.0, loot: 1.0 },
                summer: { seeds: 0.95, food: 1.05, toys: 1.1, medicine: 1.02, decorations: 1.03, mysteryEgg: 1.08, loot: 1.02 },
                autumn: { seeds: 1.05, food: 1.02, toys: 0.98, medicine: 0.96, decorations: 1.04, mysteryEgg: 1.04, loot: 1.04 },
                winter: { seeds: 1.18, food: 1.06, toys: 0.96, medicine: 1.14, decorations: 1.01, mysteryEgg: 1.06, loot: 1.08 }
            };
            const weatherMultipliers = {
                sunny: { seeds: 0.92, food: 0.97, toys: 1.06, medicine: 0.97, decorations: 1.0, mysteryEgg: 1.02, loot: 0.98 },
                rainy: { seeds: 1.05, food: 1.03, toys: 0.95, medicine: 1.1, decorations: 1.01, mysteryEgg: 1.0, loot: 1.04 },
                snowy: { seeds: 1.12, food: 1.04, toys: 0.94, medicine: 1.12, decorations: 1.02, mysteryEgg: 1.03, loot: 1.06 }
            };
            const seasonMult = (seasonalMultipliers[season] && seasonalMultipliers[season][category]) || 1;
            const weatherMult = (weatherMultipliers[weather] && weatherMultipliers[weather][category]) || 1;
            return seasonMult * weatherMult;
        }

        function getEconomyVolatility(itemKey) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const hash = hashStringToUint(`${day}:${season}:${weather}:${itemKey || ''}`);
            // Rec 7: Narrowed volatility window from 86%-119% to 92%-108%
            const volMin = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityMin === 'number')
                ? ECONOMY_BALANCE.volatilityMin : 0.92;
            const volRange = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityRange === 'number')
                ? ECONOMY_BALANCE.volatilityRange : 16;
            return volMin + ((hash % (volRange + 1)) / 100);
        }

        function getDynamicEconomyPrice(basePrice, category, itemKey, rarity) {
            const base = Math.max(1, Math.floor(Number(basePrice) || 1));
            const rarityMult = rarity === 'rare' ? 1.12 : rarity === 'legendary' ? 1.22 : 1;
            const globalMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.shopPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.shopPriceMultiplier
                : 1;
            const dynamic = base * getEconomyCategoryMultiplier(category) * getEconomyVolatility(itemKey) * rarityMult * globalMult;
            return Math.max(1, Math.round(dynamic));
        }

        function getEconomyPriceContext() {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonLabel = SEASONS[season] ? `${SEASONS[season].icon} ${SEASONS[season].name}` : season;
            const weatherLabel = WEATHER_TYPES[weather] ? `${WEATHER_TYPES[weather].icon} ${WEATHER_TYPES[weather].name}` : weather;
            return `${seasonLabel} · ${weatherLabel}`;
        }

        function getEconomyItemCount(category, itemId) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return 0;
            return Math.max(0, Math.floor(eco.inventory[category][itemId] || 0));
        }

        function addEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) eco.inventory[category] = {};
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            eco.inventory[category][itemId] = (eco.inventory[category][itemId] || 0) + qty;
            return eco.inventory[category][itemId];
        }

        function consumeEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return false;
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            const current = eco.inventory[category][itemId] || 0;
            if (current < qty) return false;
            eco.inventory[category][itemId] = current - qty;
            if (eco.inventory[category][itemId] <= 0) delete eco.inventory[category][itemId];
            return true;
        }

        function getSeedInventoryCount(cropId) {
            const eco = ensureEconomyState();
            return Math.max(0, Math.floor((eco.inventory.seeds && eco.inventory.seeds[cropId]) || 0));
        }

        function consumeSeedForCrop(cropId, count) {
            return consumeEconomyInventoryItem('seeds', cropId, count || 1);
        }

        function getShopItemData(category, itemId) {
            if (!ECONOMY_SHOP_ITEMS[category]) return null;
            return ECONOMY_SHOP_ITEMS[category][itemId] || null;
        }

        function getCraftedItemData(itemId) {
            return CRAFTED_ITEMS[itemId] || null;
        }

        function getShopItemPrice(category, itemId) {
            const item = getShopItemData(category, itemId);
            if (!item) return 0;
            return getDynamicEconomyPrice(item.basePrice, category, `${category}:${itemId}`, item.rarity);
        }

        function getMysteryEggPrice() {
            const base = getDynamicEconomyPrice(120, 'mysteryEgg', 'mysteryEgg', 'rare');
            const mult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.mysteryEggPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.mysteryEggPriceMultiplier
                : 1;
            return Math.max(1, Math.round(base * mult));
        }

        function grantAccessoryToActivePet(accessoryId) {
            const pet = gameState.pet;
            if (!pet || !ACCESSORIES[accessoryId]) return false;
            if (!Array.isArray(pet.unlockedAccessories)) pet.unlockedAccessories = [];
            if (!pet.unlockedAccessories.includes(accessoryId)) {
                pet.unlockedAccessories.push(accessoryId);
                return true;
            }
            return false;
        }

        function applyDecorationToCurrentRoom(decorationId) {
            if (!FURNITURE.decorations[decorationId]) return false;
            const room = gameState.currentRoom || 'bedroom';
            const validRooms = ROOM_IDS;
            const targetRoom = validRooms.includes(room) ? room : 'bedroom';
            if (!gameState.furniture[targetRoom]) gameState.furniture[targetRoom] = {};
            gameState.furniture[targetRoom].decoration = decorationId;
            return true;
        }

        function buyPetShopItem(category, itemId, amount) {
            const item = getShopItemData(category, itemId);
            if (!item) return { ok: false, reason: 'invalid-item' };
            // Rec 10: Check seasonal availability
            if (typeof isShopItemAvailable === 'function' && !isShopItemAvailable(itemId)) {
                const reason = (category === 'seeds' && typeof getSeedPurchaseLockReason === 'function')
                    ? (getSeedPurchaseLockReason(itemId) || 'out-of-season')
                    : 'out-of-season';
                return { ok: false, reason: reason };
            }
            const qty = Math.max(1, Math.floor(Number(amount) || 1));
            const unitPrice = getShopItemPrice(category, itemId);
            const totalPrice = unitPrice * qty;
            const spend = spendCoins(totalPrice, 'Shop', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: totalPrice, balance: spend.balance };

            if (category === 'seeds') {
                const cropId = item.cropId;
                addEconomyInventoryItem('seeds', cropId, (item.quantity || 1) * qty);
            } else if (category === 'accessories') {
                for (let i = 0; i < qty; i++) {
                    const unlocked = grantAccessoryToActivePet(item.accessoryId);
                    if (!unlocked) {
                        addEconomyInventoryItem('accessories', item.accessoryId, 1);
                    }
                }
            } else if (category === 'decorations') {
                addEconomyInventoryItem('decorations', item.decorationId, qty);
            } else if (category === 'food' || category === 'toys' || category === 'medicine') {
                addEconomyInventoryItem(category, itemId, qty);
            } else {
                addEconomyInventoryItem(category, itemId, qty);
            }

            saveGame();
            return { ok: true, item, quantity: qty, totalPrice, balance: getCoinBalance() };
        }

        function applyStatEffectsToPet(effects) {
            const pet = gameState.pet;
            if (!pet) return null;
            const before = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            const keys = ['hunger', 'cleanliness', 'happiness', 'energy'];
            keys.forEach((key) => {
                const delta = Number((effects && effects[key]) || 0);
                if (!Number.isFinite(delta) || delta === 0) return;
                pet[key] = clamp(pet[key] + delta, 0, 100);
            });
            const after = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            return {
                hunger: after.hunger - before.hunger,
                cleanliness: after.cleanliness - before.cleanliness,
                happiness: after.happiness - before.happiness,
                energy: after.energy - before.energy
            };
        }

        // Rec 5: Item durability tracking for toys and accessories
        function getItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            return gameState._itemDurability[key] || null;
        }

        function initItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            if (gameState._itemDurability[key] && gameState._itemDurability[key].current > 0) return gameState._itemDurability[key];
            let maxDur = 0;
            if (category === 'toys') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.toyDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.toyDurabilityMax : 10;
            } else if (category === 'accessories') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.accessoryDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.accessoryDurabilityMax : 15;
            }
            if (maxDur <= 0) return null;
            gameState._itemDurability[key] = { current: maxDur, max: maxDur };
            return gameState._itemDurability[key];
        }

        function degradeItemDurability(category, itemId) {
            const dur = getItemDurability(category, itemId);
            if (!dur) return null;
            dur.current = Math.max(0, dur.current - 1);
            return dur;
        }

        function repairItem(category, itemId) {
            if (!gameState._itemDurability) return { ok: false, reason: 'no-durability-data' };
            const key = `${category}:${itemId}`;
            const dur = gameState._itemDurability[key];
            if (!dur) return { ok: false, reason: 'no-durability-data' };
            if (dur.current >= dur.max) return { ok: false, reason: 'already-full' };
            const baseCost = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.durabilityRepairCostBase === 'number')
                ? ECONOMY_BALANCE.durabilityRepairCostBase : 8;
            const missing = dur.max - dur.current;
            const cost = Math.max(1, Math.floor(baseCost * missing * 0.6));
            const spend = spendCoins(cost, 'Repair', true);
            if (!spend.ok) return { ok: false, reason: 'insufficient-funds', needed: cost, balance: spend.balance };
            dur.current = dur.max;
            saveGame();
            return { ok: true, cost, durability: dur };
        }

        function useOwnedEconomyItem(category, itemId) {
            if (!gameState.pet) return { ok: false, reason: 'no-pet' };
            const isCrafted = category === 'crafted';
            const def = isCrafted ? getCraftedItemData(itemId) : getShopItemData(category, itemId);
            if (!def) return { ok: false, reason: 'invalid-item' };
            const sourceCategory = isCrafted ? 'crafted' : category;
            const sourceId = category === 'decorations'
                ? def.decorationId
                : category === 'accessories'
                    ? def.accessoryId
                    : itemId;

            // Rec 5: Durability system for toys and accessories
            const hasDurability = (category === 'toys' || (isCrafted && def.category === 'toys'));
            if (hasDurability) {
                const dur = initItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0) {
                    return { ok: false, reason: 'broken', durability: dur };
                }
            }

            if (!consumeEconomyInventoryItem(sourceCategory, sourceId, 1)) {
                return { ok: false, reason: 'not-owned' };
            }

            if ((category === 'food' || (isCrafted && def.category === 'food')) && typeof gameState.totalFeedCount === 'number') {
                gameState.totalFeedCount++;
            }
            if (category === 'medicine' || (isCrafted && def.category === 'medicine')) {
                gameState.totalMedicineUses = (gameState.totalMedicineUses || 0) + 1;
            }

            let deltas = null;
            if (def.effects) {
                let effectsToApply = def.effects;
                const isFoodUse = (category === 'food' || (isCrafted && def.category === 'food'));
                if (isFoodUse) {
                    // Report #8: Golden Feeder permanently boosts food stat effects.
                    const foodMult = Number(getPrestigeEffectValue('goldenFeeder', 'foodEffectMultiplier', 1)) || 1;
                    if (foodMult !== 1) {
                        effectsToApply = Object.assign({}, def.effects);
                        Object.keys(effectsToApply).forEach((key) => {
                            const val = Number(effectsToApply[key]) || 0;
                            effectsToApply[key] = Math.round(val * foodMult);
                        });
                    }
                }
                deltas = applyStatEffectsToPet(effectsToApply);
                if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
                gameState.pet.careActions++;
            } else if (category === 'accessories') {
                grantAccessoryToActivePet(def.accessoryId || itemId);
                // Init durability for newly equipped accessories
                initItemDurability('accessories', def.accessoryId || itemId);
            } else if (category === 'decorations') {
                applyDecorationToCurrentRoom(def.decorationId || itemId);
            }

            // Rec 5: Degrade durability on use for toys
            if (hasDurability) {
                const dur = degradeItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0 && typeof showToast === 'function') {
                    showToast(`${def.emoji || '🧸'} ${def.name} is worn out! Repair it to use again.`, '#FFA726');
                }
                // Re-add item to inventory since toys with durability aren't single-use
                addEconomyInventoryItem(sourceCategory, sourceId, 1);
            }

            saveGame();
            return { ok: true, def, deltas };
        }

        // Rec 6: Prestige purchase system — high-value late-game sinks
        function getPrestigePurchases() {
            if (typeof PRESTIGE_PURCHASES === 'undefined') return {};
            return PRESTIGE_PURCHASES;
        }

        function getOwnedPrestige() {
            if (!gameState._prestigeOwned) gameState._prestigeOwned = {};
            return gameState._prestigeOwned;
        }

        function getPrestigeEffectValue(purchaseId, effectKey, fallbackValue) {
            if (!purchaseId || !effectKey || typeof PRESTIGE_EFFECTS === 'undefined') return fallbackValue;
            if (!hasPrestigePurchase(purchaseId)) return fallbackValue;
            const effectSet = PRESTIGE_EFFECTS[purchaseId];
            if (!effectSet || typeof effectSet !== 'object') return fallbackValue;
            const value = effectSet[effectKey];
            return value === undefined ? fallbackValue : value;
        }

        function getPrestigeEffectSummary() {
            const purchases = getPrestigePurchases();
            const lines = [];
            Object.values(purchases).forEach((item) => {
                if (!item || !item.id || !hasPrestigePurchase(item.id)) return;
                const effect = (typeof PRESTIGE_EFFECTS !== 'undefined' && PRESTIGE_EFFECTS[item.id]) ? PRESTIGE_EFFECTS[item.id] : null;
                if (!effect) return;
                const parts = [];
                if (effect.extraGardenPlots) parts.push(`+${effect.extraGardenPlots} garden plots`);
                if (effect.harvestCoinMultiplier && effect.harvestCoinMultiplier !== 1) parts.push(`+${Math.round((effect.harvestCoinMultiplier - 1) * 100)}% harvest coins`);
                if (effect.extraPetCapacity) parts.push(`+${effect.extraPetCapacity} pet capacity`);
                if (effect.competitionCoinMultiplier && effect.competitionCoinMultiplier !== 1) parts.push(`+${Math.round((effect.competitionCoinMultiplier - 1) * 100)}% competition coins`);
                if (effect.foodEffectMultiplier && effect.foodEffectMultiplier !== 1) parts.push(`+${Math.round((effect.foodEffectMultiplier - 1) * 100)}% food effects`);
                if (effect.craftingCostMultiplier && effect.craftingCostMultiplier !== 1) parts.push(`${Math.round((1 - effect.craftingCostMultiplier) * 100)}% crafting discount`);
                if (effect.roomSystemMultiplier && effect.roomSystemMultiplier !== 1) parts.push(`+${Math.round((effect.roomSystemMultiplier - 1) * 100)}% room systems`);
                if (effect.treasureSuccessBonus) parts.push(`+${Math.round(effect.treasureSuccessBonus * 100)}% treasure success`);
                if (effect.cleanlinessDecayMultiplier && effect.cleanlinessDecayMultiplier !== 1) parts.push(`${Math.round((1 - effect.cleanlinessDecayMultiplier) * 100)}% cleanliness decay`);
                if (effect.careGainMultiplier && effect.careGainMultiplier !== 1) parts.push(`+${Math.round((effect.careGainMultiplier - 1) * 100)}% care gains`);
                if (effect.expeditionLootQualityMultiplier && effect.expeditionLootQualityMultiplier !== 1) parts.push(`+${Math.round((effect.expeditionLootQualityMultiplier - 1) * 100)}% expedition loot quality`);
                if (effect.expeditionUpkeepMultiplier && effect.expeditionUpkeepMultiplier !== 1) parts.push(`${Math.round((1 - effect.expeditionUpkeepMultiplier) * 100)}% expedition upkeep`);
                if (effect.minigameCoinMultiplier && effect.minigameCoinMultiplier !== 1) parts.push(`+${Math.round((effect.minigameCoinMultiplier - 1) * 100)}% minigame coins`);
                if (effect.minigameDailySoftCapBonus) parts.push(`+${effect.minigameDailySoftCapBonus} minigame daily soft cap`);
                lines.push({ id: item.id, name: item.name, emoji: item.emoji, effects: parts });
            });
            return lines;
        }

        function hasPrestigePurchase(purchaseId) {
            const owned = getOwnedPrestige();
            return !!owned[purchaseId];
        }

        function buyPrestigePurchase(purchaseId) {
            const purchases = getPrestigePurchases();
            const item = purchases[purchaseId];
            if (!item) return { ok: false, reason: 'invalid-prestige' };
            const owned = getOwnedPrestige();
            if (owned[purchaseId] && (owned[purchaseId] >= (item.maxOwned || 1))) {
                return { ok: false, reason: 'already-owned' };
            }
            const spend = spendCoins(item.cost, 'Prestige', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: item.cost, balance: spend.balance };
            owned[purchaseId] = (owned[purchaseId] || 0) + 1;
            gameState._prestigeOwned = owned;
            // Report #8: Cosmetic chest grants immediate accessory unlocks.
            if (purchaseId === 'cosmeticChest' && Array.isArray(gameState.pets)) {
                const cosmeticIds = ['crown', 'sunglasses', 'wizardHat'];
                gameState.pets.forEach((pet) => {
                    if (!pet) return;
                    if (!Array.isArray(pet.unlockedAccessories)) pet.unlockedAccessories = [];
                    cosmeticIds.forEach((accId) => {
                        if (!pet.unlockedAccessories.includes(accId)) pet.unlockedAccessories.push(accId);
                    });
                });
            }
            saveGame();
            return { ok: true, item, balance: getCoinBalance() };
        }

        function computeWealthPressureFeeBreakdown(targetState) {
            const state = targetState || gameState;
            const eco = ensureEconomyState(state);
            const hpCfg = getHardeningCfg('wealthPressure', {}) || {};
            const enabled = hpCfg.enabled !== false;
            if (!enabled) return { enabled: false, fee: 0, debt: 0, weightedWealth: 0, tradableValue: 0 };
            const tradableValue = estimateTradableInventoryValue(state);
            const protectedWealth = Math.max(0, Math.floor(
                Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureThreshold) || hpCfg.protectedWealth || 1600)
            ));
            const tradableWeight = Math.max(0, Math.min(1, Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureTradableWeight) || hpCfg.tradableValueWeight || 0.35)));
            const rate = Math.max(0, Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureRate) || hpCfg.dailyRate || 0.0035));
            const minFee = Math.max(0, Math.floor(Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureMinFee) || hpCfg.minFee || 2)));
            const weightedWealth = Math.floor(Math.max(0, eco.coins) + (tradableValue * tradableWeight));
            const taxableWealth = Math.max(0, weightedWealth - protectedWealth);
            if (taxableWealth <= 0) {
                return { enabled: true, fee: 0, debt: Math.max(0, Number((eco.wealthPressure || {}).unpaidFeeDebt) || 0), weightedWealth, tradableValue, tradableWeight, protectedWealth };
            }
            const fee = Math.max(minFee, Math.floor(taxableWealth * rate));
            return {
                enabled: true,
                fee,
                debt: Math.max(0, Number((eco.wealthPressure || {}).unpaidFeeDebt) || 0),
                weightedWealth,
                tradableValue,
                tradableWeight,
                protectedWealth
            };
        }

        function applyWealthPressureFee(targetState) {
            const state = targetState || gameState;
            const eco = ensureEconomyState(state);
            const today = typeof getTodayString === 'function' ? getTodayString() : new Date().toISOString().slice(0, 10);
            if (!eco.wealthPressure || typeof eco.wealthPressure !== 'object') eco.wealthPressure = createDefaultEconomyState().wealthPressure;
            if (eco.wealthPressure.lastAppliedDate === today) {
                return { applied: false, feePaid: 0, debtAdded: 0, repeated: true, breakdown: eco.wealthPressure.lastBreakdown || null };
            }
            const breakdown = computeWealthPressureFeeBreakdown(state);
            let feePaid = 0;
            let debtAdded = 0;
            if (breakdown.enabled && breakdown.fee > 0) {
                feePaid = Math.min(Math.max(0, eco.coins), breakdown.fee);
                eco.coins = Math.max(0, eco.coins - feePaid);
                eco.totalSpent = (eco.totalSpent || 0) + feePaid;
                debtAdded = Math.max(0, breakdown.fee - feePaid);
                if (debtAdded > 0) {
                    eco.wealthPressure.unpaidFeeDebt = Math.max(0, Number(eco.wealthPressure.unpaidFeeDebt) || 0) + debtAdded;
                }
            }
            eco.wealthPressure.lastAppliedDate = today;
            eco.wealthPressure.lastFee = feePaid + debtAdded;
            eco.wealthPressure.lastBreakdown = Object.assign({}, breakdown, { feePaid, debtAdded, appliedAt: Date.now() });
            if ((feePaid + debtAdded) > 0 && typeof showToast === 'function') {
                const debtMsg = debtAdded > 0 ? ` ${debtAdded} added as resale-penalty debt.` : '';
                showToast(`📦 Storage fee: ${feePaid + debtAdded} coins (coins + stored goods value).${debtMsg}`, '#90A4AE');
            }
            return { applied: true, feePaid, debtAdded, breakdown: eco.wealthPressure.lastBreakdown };
        }

	        // Rec 11: Coin decay system — daily tax on hoarded coins above threshold
	        function applyCoinDecay() {
	            const eco = ensureEconomyState();
	            const threshold = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayThreshold === 'number')
	                ? ECONOMY_BALANCE.coinDecayThreshold : 1000;
	            const rate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayRate === 'number')
	                ? ECONOMY_BALANCE.coinDecayRate : 0.005;
	            const protectedWallet = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayProtectedWallet))
	                ? Math.max(0, Math.floor(ECONOMY_BALANCE.coinDecayProtectedWallet))
	                : Math.floor(threshold * 0.45);
	            const decayFloor = Math.max(threshold, protectedWallet);
	            if (eco.coins <= decayFloor) {
                    applyWealthPressureFee();
                    return 0;
                }
	            const previousChecklist = gameState.dailyChecklist || null;
	            const progress = previousChecklist && previousChecklist.progress ? previousChecklist.progress : {};
	            const engagedActions = Math.max(0,
	                Math.floor(progress.feedCount || 0) +
	                Math.floor(progress.totalCareActions || 0) +
	                Math.floor(progress.minigameCount || 0) +
	                Math.floor(progress.harvestCount || 0) +
	                Math.floor(progress.expeditionCount || 0)
	            );
	            const completedDaily = !!(previousChecklist && Array.isArray(previousChecklist.tasks) && previousChecklist.tasks.length > 0 && previousChecklist.tasks.every((task) => task.done));
	            let finalRate = rate;
	            if (completedDaily) {
	                const dailyReduction = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayDailyCompleteReduction))
	                    ? ECONOMY_BALANCE.coinDecayDailyCompleteReduction
	                    : 0.4;
	                finalRate *= Math.max(0.1, Math.min(1, dailyReduction));
	            } else if (engagedActions >= 8) {
	                const engagedReduction = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayEngagedReduction))
	                    ? ECONOMY_BALANCE.coinDecayEngagedReduction
	                    : 0.65;
	                finalRate *= Math.max(0.15, Math.min(1, engagedReduction));
	            }
            // Report #10: Quick iteration mode softens daily coin decay pressure.
            const profileDecayScale = Math.max(0.2, Number((typeof getBalanceProfileConfig === 'function' ? getBalanceProfileConfig().offlineDecayMultiplier : 1)) || 1);
            finalRate *= profileDecayScale;
	            const minTax = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayMinTax))
	                ? Math.max(0, Math.floor(ECONOMY_BALANCE.coinDecayMinTax))
	                : 1;
	            const excess = eco.coins - decayFloor;
	            const tax = Math.max(minTax, Math.floor(excess * finalRate));
	            if (tax <= 0) return 0;
	            eco.coins -= tax;
	            eco.totalSpent = (eco.totalSpent || 0) + tax;
	            if (completedDaily || engagedActions >= 8) {
	                addJourneyTokens(1, 'Daily economy protection');
	                addBondXp(1, 'Consistent daily care');
	            }
	            if (typeof showToast === 'function') {
	                const modeCopy = completedDaily
	                    ? 'Daily complete discount active.'
	                    : (engagedActions >= 8 ? 'Active-care discount active.' : 'Hoarding maintenance applied.');
	                showToast(`🏦 Coin maintenance: -${tax} coins. ${modeCopy}`, '#90A4AE');
	            }
                applyWealthPressureFee();
	            return tax;
	        }

        // Rec 10: Check if a shop item is available in the current season
        function isShopItemAvailable(itemId) {
            if (typeof SEASONAL_SHOP_AVAILABILITY === 'undefined') return true;
            if (ECONOMY_SHOP_ITEMS && ECONOMY_SHOP_ITEMS.seeds && ECONOMY_SHOP_ITEMS.seeds[itemId]) {
                const reason = getSeedPurchaseLockReason(itemId);
                return !reason;
            }
            const seasons = SEASONAL_SHOP_AVAILABILITY[itemId];
            if (!seasons) return true; // Not in the rotation table = always available
            const currentSeason = gameState.season || (typeof getCurrentSeason === 'function' ? getCurrentSeason() : 'spring');
            return seasons.includes(currentSeason);
        }

        function getLootSellBasePrice(lootId) {
            const loot = EXPLORATION_LOOT[lootId];
            if (!loot) return 0;
            const rarity = loot.rarity || 'common';
            if (rarity === 'rare') return 34;
            if (rarity === 'uncommon') return 18;
            return 10;
        }

        function getLootSellPrice(lootIdOrStack, options) {
            let lootId = lootIdOrStack;
            let opts = options && typeof options === 'object' ? Object.assign({}, options) : null;
            if (lootIdOrStack && typeof lootIdOrStack === 'object') {
                if (lootIdOrStack.id) lootId = lootIdOrStack.id;
                else if (lootIdOrStack.lootId) lootId = lootIdOrStack.lootId;
                if (!opts) opts = {};
                if (lootIdOrStack.meta && typeof lootIdOrStack.meta === 'object') {
                    opts = Object.assign({}, lootIdOrStack.meta, opts);
                }
            }
            const base = getLootSellBasePrice(lootId);
            if (!base) return 0;
            const sellMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.sellPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.sellPriceMultiplier
                : 0.8;
            const expeditionSellMult = (opts && opts.source === 'expedition')
                ? ((typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.expeditionSellPriceMultiplier === 'number')
                    ? ECONOMY_BALANCE.expeditionSellPriceMultiplier
                    : 0.78)
                : 1;
            // Recommendation #7: Mastery biome rank loot sell bonus (+5% for biome rank 3+)
            // Determine which biome this loot is associated with
            let biomeSellBonus = 0;
            if (typeof getMasteryLootSellBonus === 'function' && typeof BIOME_LOOT_POOLS !== 'undefined') {
                for (const [biomeId, pool] of Object.entries(BIOME_LOOT_POOLS)) {
                    if (Array.isArray(pool) && pool.includes(lootId)) {
                        biomeSellBonus = Math.max(biomeSellBonus, getMasteryLootSellBonus(biomeId));
                    }
                }
            }
            const wealthDebtPenaltyMult = getWealthPressureDebtPenaltyMultiplier();
            const suspiciousPenaltyMult = (isSuspiciousEconomyState() && !(opts && opts.skipSecurityPenalty))
                ? getSuspiciousRewardMultiplier()
                : 1;
            return Math.max(1, Math.round(getDynamicEconomyPrice(base, 'loot', `loot:${lootId}`) * sellMult * expeditionSellMult * (1 + biomeSellBonus) * wealthDebtPenaltyMult * suspiciousPenaltyMult));
        }

        function sellExplorationLoot(lootId, count) {
            const ex = ensureExplorationState();
            ensureLootInventoryStacks(ex);
            const current = Math.max(0, Math.floor((ex.lootInventory && ex.lootInventory[lootId]) || 0));
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (current < qty) return { ok: false, reason: 'not-enough-loot' };
            const stacks = Array.isArray(ex.lootInventoryStacks[lootId]) ? ex.lootInventoryStacks[lootId] : [];
            let remaining = qty;
            let grossTotal = 0;
            let weightedPriceSum = 0;
            const soldBreakdown = [];
            while (remaining > 0 && stacks.length > 0) {
                const stack = stacks[0];
                const stackQty = Math.max(0, Math.floor(Number(stack.qty) || 0));
                if (stackQty <= 0) {
                    stacks.shift();
                    continue;
                }
                const take = Math.min(remaining, stackQty);
                const priceEach = getLootSellPrice({ id: lootId, meta: stack.meta || {} });
                if (priceEach <= 0) return { ok: false, reason: 'invalid-loot' };
                grossTotal += priceEach * take;
                weightedPriceSum += priceEach * take;
                soldBreakdown.push({ qty: take, priceEach, source: ((stack.meta || {}).source || 'generic') });
                stack.qty = stackQty - take;
                if (stack.qty <= 0) stacks.shift();
                remaining -= take;
            }
            if (remaining > 0) {
                // Repair stack metadata if a legacy save drifted out of sync.
                ensureLootInventoryStacks(ex);
                return { ok: false, reason: 'loot-stack-sync-error' };
            }
            ex.lootInventory[lootId] = current - qty;
            if (ex.lootInventory[lootId] <= 0) {
                delete ex.lootInventory[lootId];
                delete ex.lootInventoryStacks[lootId];
            }
            const credited = addCoins(grossTotal, 'Loot Sold', true);
            if (credited < grossTotal && typeof showToast === 'function') {
                showToast('Loot sale payout was reduced by economy safeguards.', '#90A4AE');
            }
            saveGame();
            return {
                ok: true,
                loot: EXPLORATION_LOOT[lootId],
                quantity: qty,
                total: credited,
                grossTotal,
                priceEach: qty > 0 ? Math.round(weightedPriceSum / qty) : 0,
                breakdown: soldBreakdown
            };
        }

        function getOwnedEconomySnapshot() {
            ensureEconomyState();
            ensureExplorationState();
            const eco = gameState.economy;
            const ex = gameState.exploration;
            return {
                coins: eco.coins || 0,
                inventory: {
                    food: Object.assign({}, eco.inventory.food || {}),
                    toys: Object.assign({}, eco.inventory.toys || {}),
                    medicine: Object.assign({}, eco.inventory.medicine || {}),
                    seeds: Object.assign({}, eco.inventory.seeds || {}),
                    decorations: Object.assign({}, eco.inventory.decorations || {}),
                    accessories: Object.assign({}, eco.inventory.accessories || {}),
                    crafted: Object.assign({}, eco.inventory.crafted || {})
                },
                loot: Object.assign({}, ex.lootInventory || {}),
                crops: Object.assign({}, (gameState.garden && gameState.garden.inventory) || {}),
                wealthPressure: (eco.wealthPressure && typeof eco.wealthPressure === 'object') ? Object.assign({}, eco.wealthPressure) : null,
                suspiciousEconomy: isSuspiciousEconomyState()
            };
        }

        function refreshRareMarketplace(forceRefresh) {
            const eco = ensureEconomyState();
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = typeof getTodayString === 'function'
                ? getTodayString()
                : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
            const key = `${day}:${season}:${weather}`;
            if (!forceRefresh && eco.market.dayKey === key && Array.isArray(eco.market.stock) && eco.market.stock.length > 0) {
                return eco.market.stock;
            }

            const rand = createSeededRng(hashStringToUint(`market:${key}`));
            const pool = [...ECONOMY_RARE_MARKET_POOL];
            const picks = [];
            const count = Math.min(4, pool.length);
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(rand() * pool.length);
                picks.push(pool.splice(idx, 1)[0]);
            }
            eco.market.stock = picks.map((entry, idx) => {
                const categoryMap = {
                    food: 'food',
                    toys: 'toys',
                    medicine: 'medicine',
                    accessory: 'accessories',
                    seed: 'seeds',
                    decoration: 'decorations',
                    loot: 'loot'
                };
                const category = categoryMap[entry.kind] || entry.kind;
                const rareMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.rareMarketPriceMultiplier === 'number')
                    ? ECONOMY_BALANCE.rareMarketPriceMultiplier
                    : 1;
                const price = Math.max(1, Math.round(getDynamicEconomyPrice(entry.basePrice, category, `rare:${entry.id}`, entry.rarity || 'rare') * rareMult));
                return {
                    offerId: `${key}:${idx}:${entry.id}`,
                    itemRef: entry.id,
                    kind: entry.kind,
                    itemId: entry.itemId,
                    quantity: entry.quantity || 1,
                    price
                };
            });
            eco.market.dayKey = key;
            saveGame();
            return eco.market.stock;
        }

        function getRareMarketplaceStock() {
            refreshRareMarketplace(false);
            return (ensureEconomyState().market.stock || []).slice();
        }

        function buyRareMarketOffer(offerId) {
            const eco = ensureEconomyState();
            refreshRareMarketplace(false);
            const stock = eco.market.stock || [];
            const idx = stock.findIndex((offer) => offer && offer.offerId === offerId);
            if (idx === -1) return { ok: false, reason: 'offer-missing' };
            const offer = stock[idx];
            const spend = spendCoins(offer.price, 'Rare Market', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: offer.price, balance: spend.balance };

            let itemLabel = '';
            let itemEmoji = '🎁';
            if (offer.kind === 'loot') {
                addLootToInventory(offer.itemId, offer.quantity || 1, { source: 'rareMarket', createdAt: Date.now() });
                const loot = EXPLORATION_LOOT[offer.itemId];
                itemLabel = loot ? loot.name : offer.itemId;
                itemEmoji = loot ? loot.emoji : itemEmoji;
            } else if (offer.kind === 'food' || offer.kind === 'toys' || offer.kind === 'medicine') {
                addEconomyInventoryItem(offer.kind, offer.itemId, offer.quantity || 1);
                const item = getShopItemData(offer.kind, offer.itemId);
                itemLabel = item ? item.name : offer.itemId;
                itemEmoji = item ? item.emoji : itemEmoji;
            } else if (offer.kind === 'seed') {
                const seedDef = getShopItemData('seeds', offer.itemId);
                const cropId = seedDef ? seedDef.cropId : offer.itemId;
                addEconomyInventoryItem('seeds', cropId, offer.quantity || 1);
                itemLabel = seedDef ? seedDef.name : `${cropId} seeds`;
                itemEmoji = seedDef ? seedDef.emoji : '🌱';
            } else if (offer.kind === 'accessory') {
                const item = getShopItemData('accessories', offer.itemId);
                const accessoryId = item ? item.accessoryId : offer.itemId;
                if (!grantAccessoryToActivePet(accessoryId)) {
                    addEconomyInventoryItem('accessories', accessoryId, 1);
                }
                itemLabel = item ? item.name : accessoryId;
                itemEmoji = item ? item.emoji : '🎀';
            } else if (offer.kind === 'decoration') {
                const item = getShopItemData('decorations', offer.itemId);
                const decorationId = item ? item.decorationId : offer.itemId;
                addEconomyInventoryItem('decorations', decorationId, offer.quantity || 1);
                itemLabel = item ? item.name : decorationId;
                itemEmoji = item ? item.emoji : '🛋️';
            }

            stock.splice(idx, 1);
            eco.market.stock = stock;
            saveGame();
            return { ok: true, offer, itemLabel, itemEmoji, balance: eco.coins };
        }

        function getIngredientCount(source, id) {
            ensureEconomyState();
            ensureExplorationState();
            if (source === 'crop') {
                return Math.max(0, Math.floor(((gameState.garden && gameState.garden.inventory && gameState.garden.inventory[id]) || 0)));
            }
            if (source === 'loot') {
                return Math.max(0, Math.floor(((gameState.exploration && gameState.exploration.lootInventory && gameState.exploration.lootInventory[id]) || 0)));
            }
            if (source === 'crafted') {
                return getEconomyItemCount('crafted', id);
            }
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    const c = getEconomyItemCount(cat, id);
                    if (c > 0) return c;
                }
            }
            return 0;
        }

        function consumeIngredient(source, id, count) {
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (source === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'loot') {
                const inv = gameState.exploration && gameState.exploration.lootInventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'crafted') return consumeEconomyInventoryItem('crafted', id, qty);
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    if (consumeEconomyInventoryItem(cat, id, qty)) return true;
                }
            }
            return false;
        }

        function getCraftingRecipeStates() {
            ensureEconomyState();
            return Object.values(CRAFTING_RECIPES).map((recipe) => {
                const ingredientStatus = (recipe.ingredients || []).map((ing) => {
                    const owned = getIngredientCount(ing.source, ing.id);
                    return Object.assign({}, ing, { owned, missing: Math.max(0, ing.count - owned) });
                });
                const canCraftIngredients = ingredientStatus.every((ing) => ing.missing <= 0);
                const baseCost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
                // Report #8: Master Crafter Bench reduces crafting coin cost.
                const craftMult = Number(getPrestigeEffectValue('masterCrafterBench', 'craftingCostMultiplier', 1)) || 1;
                const cost = Math.max(0, Math.round(baseCost * craftMult));
                const canCraft = canCraftIngredients && getCoinBalance() >= cost;
                return Object.assign({}, recipe, { ingredientStatus, canCraft, craftCost: cost });
            });
        }

        function craftRecipe(recipeId) {
            const recipe = CRAFTING_RECIPES[recipeId];
            if (!recipe) return { ok: false, reason: 'invalid-recipe' };
            const baseCost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
            // Report #8
            const craftMult = Number(getPrestigeEffectValue('masterCrafterBench', 'craftingCostMultiplier', 1)) || 1;
            const cost = Math.max(0, Math.round(baseCost * craftMult));
            for (const ing of (recipe.ingredients || [])) {
                if (getIngredientCount(ing.source, ing.id) < ing.count) {
                    return { ok: false, reason: 'missing-ingredients' };
                }
            }
            const spend = spendCoins(cost, 'Crafting', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: cost, balance: spend.balance };

            for (const ing of (recipe.ingredients || [])) {
                consumeIngredient(ing.source, ing.id, ing.count);
            }

            let craftedLabel = recipe.name;
            let craftedEmoji = recipe.emoji || '🛠️';
            if (recipe.outputType === 'crafted') {
                const def = getCraftedItemData(recipe.outputId);
                const itemKey = def ? def.id : recipe.outputId;
                addEconomyInventoryItem('crafted', itemKey, recipe.outputCount || 1);
                if (def) {
                    craftedLabel = def.name;
                    craftedEmoji = def.emoji;
                }
            } else if (recipe.outputType === 'accessory') {
                if (!grantAccessoryToActivePet(recipe.outputId)) {
                    addEconomyInventoryItem('accessories', recipe.outputId, recipe.outputCount || 1);
                }
                const acc = ACCESSORIES[recipe.outputId];
                if (acc) {
                    craftedLabel = acc.name;
                    craftedEmoji = acc.emoji;
                }
            }

            saveGame();
            return { ok: true, recipe, craftedLabel, craftedEmoji };
        }

        function awardMiniGameCoins(gameId, scoreValue) {
            const score = Math.max(0, Number(scoreValue) || 0);
            if (score <= 0) return 0;
            const gameBonus = {
                fetch: 1.0,
                hideseek: 1.1,
                bubblepop: 1.0,
                matching: 1.2,
                simonsays: 1.35,
                coloring: 0.95,
                racing: 1.12,
                cooking: 1.02,
                fishing: 1.08,
                rhythm: 1.1,
                slider: 1.08,
                trivia: 1.0,
                runner: 1.16,
                tournament: 1.2,
                coop: 1.08
            };
            const multiplier = gameBonus[gameId] || 1;
            const difficulty = typeof getMinigameDifficulty === 'function' ? getMinigameDifficulty(gameId) : 1;
            // Report #4: Reward growth now tracks remaining replay difficulty curve.
            const difficultyRewardMult = Math.max(0.92, Math.min(1.52, 0.96 + ((difficulty - 1) * 0.52)));
            const payout = Math.max(3, Math.round((6 + Math.pow(score, 0.52) * 4.3) * multiplier * difficultyRewardMult));
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.minigameRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.minigameRewardMultiplier
                : 1;
            // Keep a slight stat link without heavily penalizing weaker pets.
            const petStrength = getPetMiniGameStrength(gameState.pet);
            const petStatRewardMult = Math.max(0.96, Math.min(1.04, 1 + ((petStrength - 0.5) * 0.08)));

            // Escalating mini-game session multiplier
            // 1st game = 1.0x, 2nd = 1.05x, 3rd = 1.1x, cap at 1.15x. Resets on session end.
            if (typeof gameState._sessionMinigameCount !== 'number') gameState._sessionMinigameCount = 0;
            gameState._sessionMinigameCount++;
            const sessionMult = Math.min(1.15, 1 + (Math.max(0, gameState._sessionMinigameCount - 1) * 0.05));

            const stage = (gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby';
            const prestigeRunMult = Number(getPrestigeEffectValue('cosmeticChest', 'minigameCoinMultiplier', 1)) || 1;
            const streakBonusPerRun = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusPerRun) || 0.045);
            const streakBonusMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusMax) || 0.38);
            gameState._minigameWinStreak = Math.max(0, Number(gameState._minigameWinStreak) || 0) + 1;
            const streakMult = 1 + Math.min(streakBonusMax, Math.max(0, gameState._minigameWinStreak - 1) * streakBonusPerRun);
            const highSkillThreshold = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillThreshold) || 82);
            const highSkillPerPoint = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillPerPoint) || 0.011);
            const highSkillMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillMaxBonus) || 0.35);
            const highSkillBonus = score >= highSkillThreshold
                ? Math.min(highSkillMax, (score - highSkillThreshold) * highSkillPerPoint)
                : 0;
            const capBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapBase) || 94);
            const capStage = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapByStage && MINIGAME_BALANCE.perRunCapByStage[stage]) || capBase);
            const cap = Math.max(3, Math.floor(capStage));
            let tuned = Math.max(3, Math.min(cap, Math.round(payout * ecoMult * petStatRewardMult * sessionMult * streakMult * (1 + highSkillBonus) * prestigeRunMult)));

            // Report #3: Daily cap is now soft-diminishing instead of hard stop.
            const stageSoftCapBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapBase) || 380);
            const stageSoftCap = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapByStage && MINIGAME_BALANCE.dailySoftCapByStage[stage]) || stageSoftCapBase);
            const prestigeSoftCap = Number(getPrestigeEffectValue('cosmeticChest', 'minigameDailySoftCapBonus', 0)) || 0;
            const dailySoftCap = Math.max(50, Math.floor(stageSoftCap + prestigeSoftCap));
            const today = typeof getTodayString === 'function' ? getTodayString() : '';
            if (!gameState._dailyMinigameEarnings || gameState._dailyMinigameEarningsDay !== today) {
                gameState._dailyMinigameEarnings = 0;
                gameState._dailyMinigameEarningsDay = today;
                gameState._minigameWinStreak = 1;
            }
            const overCap = Math.max(0, gameState._dailyMinigameEarnings - dailySoftCap);
            if (overCap > 0) {
                const falloff = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapFalloffPerCoin) || 0.0042);
                const minMult = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapMinMultiplier) || 0.2);
                const diminishingMult = Math.max(minMult, 1 / (1 + (overCap * falloff)));
                tuned = Math.max(1, Math.round(tuned * diminishingMult));
                const now = Date.now();
                if ((now - (Number(gameState._lastMinigameSoftCapToastAt) || 0)) > 45000 && typeof showToast === 'function') {
                    gameState._lastMinigameSoftCapToastAt = now;
                    showToast('Mini-game rewards are in soft-cap mode: gains are reduced, not stopped.', '#90A4AE');
                }
            }

            gameState._dailyMinigameEarnings += tuned;
            balanceDebugLog('MinigameReward', { // Report #3/#4
                gameId,
                score,
                difficulty,
                payoutBase: payout,
                tuned,
                dailySoftCap,
                dailyEarned: gameState._dailyMinigameEarnings,
                streak: gameState._minigameWinStreak,
                highSkillBonus
            });

            addCoins(tuned, 'Mini-game', true);
            return tuned;
        }

        function awardHarvestCoins(cropId) {
            const crop = GARDEN_CROPS[cropId];
            if (!crop) return 0;
            const base = 3 + Math.round((crop.hungerValue || 0) / 4) + Math.round((crop.happinessValue || 0) / 6) + Math.round((crop.energyValue || 0) / 6);
            const seasonalBoost = (crop.seasonBonus || []).includes(gameState.season || getCurrentSeason()) ? 1.2 : 1.0;
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.harvestRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.harvestRewardMultiplier
                : 1;
            // Report #8: Garden expansion includes a harvest coin bonus.
            const prestigeHarvestMult = Number(getPrestigeEffectValue('gardenExpansion', 'harvestCoinMultiplier', 1)) || 1;
            const payout = Math.max(2, Math.round(base * seasonalBoost * ecoMult * prestigeHarvestMult));
            addCoins(payout, 'Harvest', true);
            return payout;
        }

        function openMysteryEgg() {
            const price = getMysteryEggPrice();
            const spend = spendCoins(price, 'Mystery Egg', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: price, balance: spend.balance };
            const eco = ensureEconomyState();
            const roll = Math.random();
            let reward = null;
            if (roll < 0.2) {
                // Rec 12: Reduced coin range from 40-80 to 20-50 for slightly negative EV
                const coinReward = 20 + Math.floor(Math.random() * 31);
                addCoins(coinReward, 'Mystery Egg Bonus', true);
                reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙' };
            } else if (roll < 0.45) {
                const foodKeys = Object.keys(ECONOMY_SHOP_ITEMS.food || {});
                const itemId = randomFromArray(foodKeys);
                addEconomyInventoryItem('food', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.food[itemId];
                reward = { type: 'food', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.63) {
                const toyKeys = Object.keys(ECONOMY_SHOP_ITEMS.toys || {});
                const itemId = randomFromArray(toyKeys);
                addEconomyInventoryItem('toys', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.toys[itemId];
                reward = { type: 'toys', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.79) {
                const medKeys = Object.keys(ECONOMY_SHOP_ITEMS.medicine || {});
                const itemId = randomFromArray(medKeys);
                addEconomyInventoryItem('medicine', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.medicine[itemId];
                reward = { type: 'medicine', itemId, label: item.name, emoji: item.emoji };
            } else if (roll < 0.93) {
                const lootId = randomFromArray(Object.keys(EXPLORATION_LOOT));
                addLootToInventory(lootId, 1, { source: 'mysteryEgg', createdAt: Date.now() });
                const loot = EXPLORATION_LOOT[lootId];
                reward = { type: 'loot', itemId: lootId, label: loot.name, emoji: loot.emoji };
            } else {
                const accId = randomFromArray(Object.keys(ACCESSORIES));
                if (!grantAccessoryToActivePet(accId)) {
                    addEconomyInventoryItem('accessories', accId, 1);
                }
                const acc = ACCESSORIES[accId];
                reward = { type: 'accessory', itemId: accId, label: acc.name, emoji: acc.emoji };
            }
            eco.mysteryEggsOpened = (eco.mysteryEggsOpened || 0) + 1;
            saveGame();
            return { ok: true, price, reward, balance: eco.coins };
        }

        function getAuctionHouseSnapshot() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const myWallet = Math.max(0, Math.floor((data.profileWallets && data.profileWallets[eco.playerId]) || 0));
            const listings = (data.listings || [])
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((listing) => {
                    const label = getAuctionItemLabel(listing.itemType, listing.itemId);
                    const isMine = !!(listing.sellerProfileId && listing.sellerProfileId === eco.playerId);
                    return Object.assign({}, listing, label, { isMine });
                });
            return {
                slotId,
                slotLabel: getAuctionSlotLabel(slotId),
                wallets: Object.assign({}, data.wallets || {}),
                myWallet,
                listings,
                locked: isAuctionInteractionLocked(),
                lockReason: isAuctionInteractionLocked() ? 'save-integrity-warning' : null
            };
        }

        function setAuctionSlot(slotId) {
            if (!ECONOMY_AUCTION_SLOTS.includes(slotId)) return false;
            const eco = ensureEconomyState();
            eco.auction.slotId = slotId;
            try {
                localStorage.setItem(getAuctionSlotStorageKey(), slotId);
            } catch (e) {
                // ignore storage errors
            }
            saveGame();
            return true;
        }

        function getAuctionItemLabel(itemType, itemId) {
            if (itemType === 'loot' && EXPLORATION_LOOT[itemId]) {
                return { name: EXPLORATION_LOOT[itemId].name, emoji: EXPLORATION_LOOT[itemId].emoji };
            }
            if (itemType === 'crop' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Crop`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if (itemType === 'seed' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Seeds`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if (itemType === 'seed' && FLOWER_GARDEN_PLANTS[itemId]) {
                return { name: `${FLOWER_GARDEN_PLANTS[itemId].name} Seeds`, emoji: FLOWER_GARDEN_PLANTS[itemId].emoji };
            }
            if (itemType === 'seed' && MUSHROOM_CAVE_PLANTS[itemId]) {
                return { name: `${MUSHROOM_CAVE_PLANTS[itemId].name} Spores`, emoji: MUSHROOM_CAVE_PLANTS[itemId].emoji };
            }
            if ((itemType === 'food' || itemType === 'toys' || itemType === 'medicine') && ECONOMY_SHOP_ITEMS[itemType] && ECONOMY_SHOP_ITEMS[itemType][itemId]) {
                return { name: ECONOMY_SHOP_ITEMS[itemType][itemId].name, emoji: ECONOMY_SHOP_ITEMS[itemType][itemId].emoji };
            }
            if (itemType === 'crafted' && CRAFTED_ITEMS[itemId]) {
                return { name: CRAFTED_ITEMS[itemId].name, emoji: CRAFTED_ITEMS[itemId].emoji };
            }
            if (itemType === 'accessory' && ACCESSORIES[itemId]) {
                return { name: ACCESSORIES[itemId].name, emoji: ACCESSORIES[itemId].emoji };
            }
            if (itemType === 'decoration' && FURNITURE.decorations[itemId]) {
                return { name: FURNITURE.decorations[itemId].name, emoji: FURNITURE.decorations[itemId].emoji || '🛋️' };
            }
            return { name: itemId, emoji: '📦' };
        }

        function getAuctionOwnedCount(itemType, itemId) {
            ensureEconomyState();
            ensureExplorationState();
            if (itemType === 'loot') return Math.max(0, Math.floor((gameState.exploration.lootInventory[itemId] || 0)));
            if (itemType === 'crop') return Math.max(0, Math.floor((((gameState.garden || {}).inventory || {})[itemId] || 0)));
            if (itemType === 'seed') return getSeedInventoryCount(itemId);
            if (itemType === 'crafted') return getEconomyItemCount('crafted', itemId);
            if (itemType === 'accessory') return getEconomyItemCount('accessories', itemId);
            if (itemType === 'decoration') return getEconomyItemCount('decorations', itemId);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return getEconomyItemCount(itemType, itemId);
            return 0;
        }

        function consumeAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                const ex = ensureExplorationState();
                ensureLootInventoryStacks(ex);
                const inv = ex.lootInventory;
                if ((inv[itemId] || 0) < count) return false;
                let remaining = count;
                const stacks = Array.isArray(ex.lootInventoryStacks[itemId]) ? ex.lootInventoryStacks[itemId] : [];
                while (remaining > 0 && stacks.length > 0) {
                    const stack = stacks[0];
                    const stackQty = Math.max(0, Math.floor(Number(stack.qty) || 0));
                    if (stackQty <= 0) { stacks.shift(); continue; }
                    const take = Math.min(remaining, stackQty);
                    stack.qty = stackQty - take;
                    if (stack.qty <= 0) stacks.shift();
                    remaining -= take;
                }
                if (remaining > 0) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) {
                    delete inv[itemId];
                    delete ex.lootInventoryStacks[itemId];
                }
                return true;
            }
            if (itemType === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'seed') return consumeEconomyInventoryItem('seeds', itemId, count);
            if (itemType === 'crafted') return consumeEconomyInventoryItem('crafted', itemId, count);
            if (itemType === 'accessory') return consumeEconomyInventoryItem('accessories', itemId, count);
            if (itemType === 'decoration') return consumeEconomyInventoryItem('decorations', itemId, count);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return consumeEconomyInventoryItem(itemType, itemId, count);
            return false;
        }

        function addAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                addLootToInventory(itemId, count, { source: 'auction', createdAt: Date.now() });
                return;
            }
            if (itemType === 'crop') {
                if (!gameState.garden.inventory[itemId]) gameState.garden.inventory[itemId] = 0;
                gameState.garden.inventory[itemId] += count;
                return;
            }
            if (itemType === 'seed') {
                addEconomyInventoryItem('seeds', itemId, count);
                return;
            }
            if (itemType === 'crafted') {
                addEconomyInventoryItem('crafted', itemId, count);
                return;
            }
            if (itemType === 'accessory') {
                addEconomyInventoryItem('accessories', itemId, count);
                return;
            }
            if (itemType === 'decoration') {
                addEconomyInventoryItem('decorations', itemId, count);
                return;
            }
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') {
                addEconomyInventoryItem(itemType, itemId, count);
            }
        }

        function createAuctionListing(itemType, itemId, quantity, price) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showHardeningToast('suspicious', 'Save integrity warning: auction interactions are temporarily locked.', '#EF5350');
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const qty = Math.max(1, Math.floor(Number(quantity) || 1));
            const ask = Math.max(1, Math.floor(Number(price) || 1));
            const owned = getAuctionOwnedCount(itemType, itemId);
            if (owned < qty) return { ok: false, reason: 'not-enough-items', owned };

            // Rec 8: Enforce per-slot listing cap
            const perSlotCap = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionPerSlotListingCap === 'number')
                ? ECONOMY_BALANCE.auctionPerSlotListingCap : 12;
            const existingData = loadAuctionHouseData();
            const mySlotListings = (existingData.listings || []).filter((l) => l && l.sellerSlot === eco.auction.slotId && l.sellerProfileId === eco.playerId);
            if (mySlotListings.length >= perSlotCap) {
                return { ok: false, reason: 'slot-listing-cap', cap: perSlotCap };
            }

            // Rec 4: Charge non-refundable listing fee upfront
            const feeRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionListingFeeRate === 'number')
                ? ECONOMY_BALANCE.auctionListingFeeRate : 0.03;
            const relistKey = `${itemType}:${itemId}`;
            const relistCfg = getHardeningCfg('auction', {}) || {};
            const relistWindowMs = Math.max(60000, Number(relistCfg.relistWindowMs) || (3 * 24 * 60 * 60 * 1000));
            const relistStepRate = Math.max(0, Number(relistCfg.relistFeeStepRate) || 0.02);
            const relistMaxExtraRate = Math.max(0, Number(relistCfg.relistFeeMaxExtraRate) || 0.12);
            const tracker = eco.auction.relistTracker || (eco.auction.relistTracker = {});
            const trackerEntry = (tracker[relistKey] && typeof tracker[relistKey] === 'object') ? tracker[relistKey] : { lastAt: 0, count: 0 };
            const withinRelistWindow = trackerEntry.lastAt > 0 && (Date.now() - trackerEntry.lastAt) <= relistWindowMs;
            const relistCount = withinRelistWindow ? Math.max(0, Math.floor(Number(trackerEntry.count) || 0)) : 0;
            const relistExtraRate = Math.min(relistMaxExtraRate, relistCount * relistStepRate);
            const listingFee = Math.max(1, Math.floor(ask * (feeRate + relistExtraRate)));
            const feeSpend = spendCoins(listingFee, 'Listing Fee', true);
            if (!feeSpend.ok) return { ok: false, reason: 'insufficient-funds-fee', needed: listingFee, balance: feeSpend.balance };

            if (!consumeAuctionItem(itemType, itemId, qty)) {
                // Refund listing fee if consume fails
                addCoins(listingFee, 'Listing Fee Refund', true);
                return { ok: false, reason: 'consume-failed' };
            }

            const data = loadAuctionHouseData();
            const listing = {
                id: `auc_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
                sellerSlot: eco.auction.slotId,
                // Report #6: Stable profile identity prevents slot-switch ownership bypass.
                sellerProfileId: eco.playerId || '',
                sellerPlayerId: eco.playerId || '',
                itemType,
                itemId,
                quantity: qty,
                price: ask,
                listingFee: listingFee,
                createdAt: Date.now(),
                relistKey: relistKey,
                relistCount: relistCount
            };
            data.listings.unshift(listing);
            if (data.listings.length > 80) data.listings = data.listings.slice(0, 80);
            saveAuctionHouseData(data);
            eco.auction.postedCount = (eco.auction.postedCount || 0) + 1;
            tracker[relistKey] = { lastAt: Date.now(), count: relistCount + 1 };
            if (relistExtraRate > 0 && typeof showToast === 'function') {
                showToast(`📈 Relist fee escalation applied (+${Math.round(relistExtraRate * 100)}%).`, '#90A4AE');
            }
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(itemType, itemId)), listingFee };
        }

        function cancelAuctionListing(listingId) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showHardeningToast('suspicious', 'Save integrity warning: auction interactions are temporarily locked.', '#EF5350');
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            if (!listing.sellerProfileId) return { ok: false, reason: 'legacy-owner-unknown' };
            if (listing.sellerProfileId !== eco.playerId) return { ok: false, reason: 'not-owner' };
            data.listings.splice(idx, 1);
            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);
            saveAuctionHouseData(data);
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)) };
        }

        function buyAuctionListing(listingId) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showHardeningToast('suspicious', 'Save integrity warning: auction interactions are temporarily locked.', '#EF5350');
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            // Report #6: Ownership checks use stable profile identity.
            if (listing.sellerProfileId && listing.sellerProfileId === eco.playerId) return { ok: false, reason: 'own-listing' };
            if (listing.sellerPlayerId && listing.sellerPlayerId === eco.playerId) return { ok: false, reason: 'own-listing' };
            if (!listing.sellerProfileId && listing.sellerSlot === eco.auction.slotId) return { ok: false, reason: 'own-listing' };

            const spend = spendCoins(listing.price, 'Auction Buy', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: listing.price, balance: spend.balance };

            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);

            // Rec 3: Apply transaction tax — seller receives price minus tax
            const taxRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionTransactionTaxRate === 'number')
                ? ECONOMY_BALANCE.auctionTransactionTaxRate : 0.08;
            const taxAmount = Math.max(0, Math.floor(listing.price * taxRate));
            const sellerProceeds = listing.price - taxAmount;
            if (listing.sellerProfileId) {
                data.profileWallets[listing.sellerProfileId] = Math.max(0, Math.floor((data.profileWallets[listing.sellerProfileId] || 0))) + sellerProceeds;
            } else {
                const legacySlot = listing.sellerSlot || 'slotA';
                data.wallets[legacySlot] = Math.max(0, Math.floor((data.wallets[legacySlot] || 0))) + sellerProceeds;
            }
            data.listings.splice(idx, 1);
            saveAuctionHouseData(data);
            eco.auction.boughtCount = (eco.auction.boughtCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)), balance: eco.coins, taxAmount };
        }

        function claimAuctionEarnings() {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showHardeningToast('suspicious', 'Save integrity warning: auction interactions are temporarily locked.', '#EF5350');
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            // Report #6: Claim path is tied to immutable profile identity.
            const profileId = eco.playerId;
            const amount = Math.max(0, Math.floor((data.profileWallets[profileId] || 0)));
            if (amount <= 0) return { ok: false, reason: 'nothing-to-claim' };
            data.profileWallets[profileId] = 0;
            saveAuctionHouseData(data);
            addCoins(amount, 'Auction Payout', true);
            eco.auction.soldCount = (eco.auction.soldCount || 0) + 1;
            saveGame();
            return { ok: true, amount, balance: eco.coins };
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
                    dedupeMs: Number.isFinite(assertiveOrOptions.dedupeMs) ? Math.max(0, assertiveOrOptions.dedupeMs) : 1800
                };
            }
            return { assertive: !!assertiveOrOptions, source: 'app', dedupeMs: 1800 };
        }

        function flushAnnouncementQueue() {
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
            const assertive = options.assertive;
            const plainMessage = String(message || '').trim();
            if (!plainMessage) return;
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
                    shouldClear: plainMessage.length <= 60
                });
                if (_assertiveTimer) return;
                _assertiveTimer = setTimeout(flushAssertiveQueue, 40);
                return;
            }

            // Queue polite messages and flush one at a time to keep announcements atomic.
            _announceQueue.push(plainMessage);
            if (_announceTimer) return;
            _announceTimer = setTimeout(flushAnnouncementQueue, 40);
        }

        // ==================== ACHIEVEMENT SYSTEM ====================

	        function checkAchievements() {
            if (!gameState.achievements) gameState.achievements = {};
            const newUnlocks = [];
	            for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
                if (gameState.achievements[id]) continue; // Already unlocked
                try {
                    if (ach.check(gameState)) {
                        gameState.achievements[id] = { unlocked: true, unlockedAt: Date.now() };
                        newUnlocks.push(ach);
                        addJournalEntry('🏆', `Achievement unlocked: ${ach.name}!`);
                    }
	                } catch (e) { /* safe guard */ }
	            }
	            if (newUnlocks.length > 0) {
	                evaluateJourneyProgress('achievements');
	                recordRetentionActivity('collection');
	            }
	            return newUnlocks;
	        }

        function getAchievementCount() {
            if (!gameState.achievements) return 0;
            return Object.values(gameState.achievements).filter(a => a.unlocked).length;
        }

        // ==================== DAILY CHECKLIST ====================

        function getTodayString() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function getCurrentMonthKey() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }

        function getWeekKey() {
            const d = new Date();
            const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const day = utc.getUTCDay() || 7;
            utc.setUTCDate(utc.getUTCDate() + 4 - day);
            const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
            return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        }

        function parseLocalDateString(dateStr) {
            if (!dateStr || typeof dateStr !== 'string') return null;
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
            if (!m) return null;
            const y = Number(m[1]);
            const mon = Number(m[2]) - 1;
            const d = Number(m[3]);
            const dt = new Date(y, mon, d);
            if (Number.isNaN(dt.getTime())) return null;
            return dt;
        }

        function getCalendarDayDiff(fromDateStr, toDateStr) {
            const from = parseLocalDateString(fromDateStr);
            const to = parseLocalDateString(toDateStr);
            if (!from || !to) return 0;
            const fromMid = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
            const toMid = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
            return Math.max(0, Math.floor((toMid - fromMid) / 86400000));
        }

        function getStreakCheckpoints() {
            const cfg = (typeof STREAK_PROTECTION_CONFIG !== 'undefined' && STREAK_PROTECTION_CONFIG) ? STREAK_PROTECTION_CONFIG : null;
            const checkpoints = cfg && Array.isArray(cfg.checkpointDays) ? cfg.checkpointDays : [7, 14, 30];
            return checkpoints.filter((d) => Number.isFinite(d) && d > 0).sort((a, b) => a - b);
        }

        function getLastReachedCheckpoint(streakDays) {
            const safe = Math.max(0, Number(streakDays) || 0);
            const checkpoints = getStreakCheckpoints();
            let last = 0;
            checkpoints.forEach((cp) => {
                if (safe >= cp) last = cp;
            });
            return last;
        }

        function getStreakCheckpointFloor(streakDays) {
            const lastCheckpoint = getLastReachedCheckpoint(streakDays);
            if (lastCheckpoint <= 0) return 1;
            const cfg = (typeof STREAK_PROTECTION_CONFIG !== 'undefined' && STREAK_PROTECTION_CONFIG) ? STREAK_PROTECTION_CONFIG : null;
            const offset = Number.isFinite(cfg && cfg.checkpointFallbackOffset) ? Math.max(0, Math.floor(cfg.checkpointFallbackOffset)) : 1;
            return Math.max(1, lastCheckpoint - offset);
        }

	        function addStreakFreezeTokens(amount, reason) {
	            const meta = ensureRetentionMetaState();
	            const grant = Math.max(0, Math.floor(Number(amount) || 0));
	            if (grant <= 0) return 0;
            meta.streakProtection.freezeTokens = Math.max(0, Math.floor(meta.streakProtection.freezeTokens || 0)) + grant;
            if (typeof addJournalEntry === 'function') {
                addJournalEntry('🧊', `Earned ${grant} Streak Freeze token${grant === 1 ? '' : 's'}${reason ? ` (${reason})` : ''}.`);
            }
	            retentionDebugLog('Streak freeze tokens granted', { grant, reason, total: meta.streakProtection.freezeTokens });
	            return grant;
	        }

	        function getCodexUnlockedCount() {
	            const adultsRaised = Math.max(0, Math.floor(gameState.adultsRaised || 0));
	            const allTypes = Object.keys(PET_TYPES || {});
	            return allTypes.filter((typeId) => {
	                const data = PET_TYPES[typeId];
	                if (!data) return false;
	                if (!data.mythical) return true;
	                return adultsRaised >= Math.max(0, Math.floor(data.unlockRequirement || 0));
	            }).length;
	        }

	        function getJourneyStartDate() {
	            const meta = ensureRetentionMetaState();
	            if (typeof meta.journey.startedAtDate === 'string' && meta.journey.startedAtDate) {
	                return meta.journey.startedAtDate;
	            }
	            let fallback = getTodayString();
	            if (gameState.pet && Number.isFinite(gameState.pet.birthdate)) {
	                const birth = new Date(gameState.pet.birthdate);
	                if (!Number.isNaN(birth.getTime())) {
	                    fallback = `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, '0')}-${String(birth.getDate()).padStart(2, '0')}`;
	                }
	            }
	            meta.journey.startedAtDate = fallback;
	            return fallback;
	        }

	        function getJourneyDay() {
	            const start = getJourneyStartDate();
	            const today = getTodayString();
	            const diff = getCalendarDayDiff(start, today);
	            return Math.max(1, diff + 1);
	        }

	        function getJourneyChapterForDay(day) {
	            const safeDay = Math.max(1, Math.floor(Number(day) || 1));
	            const chapters = Array.isArray(JOURNEY_CHAPTERS) ? JOURNEY_CHAPTERS : [];
	            return chapters.find((chapter) => chapter && safeDay >= chapter.dayStart && safeDay <= chapter.dayEnd) || chapters[chapters.length - 1] || null;
	        }

	        function getJourneyChapterById(chapterId) {
	            const chapters = Array.isArray(JOURNEY_CHAPTERS) ? JOURNEY_CHAPTERS : [];
	            return chapters.find((chapter) => chapter && chapter.id === chapterId) || null;
	        }

	        function getJourneyMetricSnapshot() {
	            const meta = ensureRetentionMetaState();
	            const pets = Array.isArray(gameState.pets) && gameState.pets.length > 0
	                ? gameState.pets.filter(Boolean)
	                : (gameState.pet ? [gameState.pet] : []);
	            const totalCareActions = pets.reduce((sum, pet) => sum + Math.max(0, Math.floor(pet.careActions || 0)), 0);
	            const playCounts = gameState.minigamePlayCounts || {};
	            const totalMinigamePlays = Object.values(playCounts).reduce((sum, value) => sum + Math.max(0, Math.floor(value || 0)), 0);
	            const ex = ensureExplorationState();
	            const mastery = ensureMasteryState();
	            const discoveredBiomesCount = Object.values(ex.discoveredBiomes || {}).filter(Boolean).length;
	            const relationships = gameState.relationships || {};
	            const maxRelationshipPoints = Object.values(relationships).reduce((max, rel) => Math.max(max, Math.max(0, Math.floor((rel && rel.points) || 0))), 0);
	            return {
	                totalFeedCount: Math.max(0, Math.floor(gameState.totalFeedCount || 0)),
	                totalCareActions,
	                totalDailyCompletions: Math.max(0, Math.floor(gameState.totalDailyCompletions || 0)),
	                streakCurrent: Math.max(0, Math.floor((gameState.streak && gameState.streak.current) || 0)),
	                maxRelationshipPoints,
	                totalMinigamePlays,
	                expeditionsCompleted: Math.max(0, Math.floor((ex.stats && ex.stats.expeditionsCompleted) || 0)),
	                totalHarvests: Math.max(0, Math.floor((gameState.garden && gameState.garden.totalHarvests) || 0)),
	                discoveredBiomesCount,
	                battleCount: Math.max(0, Math.floor(gameState.totalBattles || Math.floor(((mastery.competitionSeason && mastery.competitionSeason.points) || 0) / 20))),
	                codexUnlockedCount: getCodexUnlockedCount(),
	                badgeCount: getBadgeCount(),
	                achievementCount: getAchievementCount(),
	                stickerCount: getStickerCount(),
	                trophyCount: getTrophyCount(),
	                bondXp: Math.max(0, Math.floor((meta.bond && meta.bond.xp) || 0))
	            };
	        }

	        function grantJourneyRewardPayload(reward, sourceLabel) {
	            if (!reward || typeof reward !== 'object') return;
	            if (reward.tokens) addJourneyTokens(reward.tokens, sourceLabel || 'Journey');
	            if (reward.collectible && typeof grantBundleCollectible === 'function') {
	                grantBundleCollectible(reward.collectible);
	            }
	            if (reward.type === 'sticker' && reward.id && typeof grantSticker === 'function') {
	                grantSticker(reward.id);
	            }
	            if (reward.type === 'unlockBiome' && reward.biomeId) {
	                ensureExplorationState();
	                if (gameState.exploration && gameState.exploration.biomeUnlocks && Object.prototype.hasOwnProperty.call(gameState.exploration.biomeUnlocks, reward.biomeId)) {
	                    gameState.exploration.biomeUnlocks[reward.biomeId] = true;
	                    gameState.exploration.discoveredBiomes[reward.biomeId] = true;
	                }
	            }
	            if (reward.story && typeof addJournalEntry === 'function') {
	                addJournalEntry('📖', reward.story);
	            }
	            if (reward.type === 'journal' && reward.text && typeof addJournalEntry === 'function') {
	                addJournalEntry('📝', reward.text);
	            }
	        }

	        function addJourneyTokens(amount, reason) {
	            const meta = ensureRetentionMetaState();
	            const add = Math.max(0, Math.floor(Number(amount) || 0));
	            if (add <= 0) return 0;
	            meta.journey.tokens = Math.max(0, Math.floor(meta.journey.tokens || 0)) + add;
	            meta.journey.lastProgressAt = Date.now();
	            retentionDebugLog('Journey tokens granted', { add, reason, total: meta.journey.tokens });
	            return add;
	        }

	        function spendJourneyTokens(amount) {
	            const meta = ensureRetentionMetaState();
	            const cost = Math.max(0, Math.floor(Number(amount) || 0));
	            if (cost <= 0) return { ok: true, spent: 0, balance: meta.journey.tokens || 0 };
	            if ((meta.journey.tokens || 0) < cost) {
	                return { ok: false, reason: 'insufficient-tokens', balance: meta.journey.tokens || 0 };
	            }
	            meta.journey.tokens -= cost;
	            return { ok: true, spent: cost, balance: meta.journey.tokens };
	        }

	        function redeemJourneyTokenReward(rewardId) {
	            const id = String(rewardId || '');
	            if (!id) return { ok: false, reason: 'invalid-reward' };
	            if (id === 'story') {
	                const spend = spendJourneyTokens(5);
	                if (!spend.ok) return { ok: false, reason: spend.reason, needed: 5, balance: spend.balance };
	                if (typeof addJournalEntry === 'function') {
	                    addJournalEntry('📚', 'Journey token memory unlocked: your pet remembers your quiet routines.');
	                }
	                saveGame();
	                return { ok: true, rewardId: id, message: 'Story memory unlocked.', balance: spend.balance };
	            }
	            if (id === 'cosmetic') {
	                const spend = spendJourneyTokens(8);
	                if (!spend.ok) return { ok: false, reason: spend.reason, needed: 8, balance: spend.balance };
	                const cosmeticPool = ['sparkleSticker', 'heartSticker', 'legendRibbon', 'moonCrest', 'sunCrest', 'bloomCrest'];
	                const choice = cosmeticPool.find((stickerId) => !(gameState.stickers && gameState.stickers[stickerId] && gameState.stickers[stickerId].collected))
	                    || cosmeticPool[hashDailySeed(`journey-cosmetic:${getTodayString()}`) % cosmeticPool.length];
	                if (typeof grantSticker === 'function') grantSticker(choice);
	                saveGame();
	                return { ok: true, rewardId: id, stickerId: choice, message: `${STICKERS[choice].emoji} ${STICKERS[choice].name} unlocked.`, balance: spend.balance };
	            }
	            if (id === 'bond') {
	                const spend = spendJourneyTokens(6);
	                if (!spend.ok) return { ok: false, reason: spend.reason, needed: 6, balance: spend.balance };
	                addBondXp(12, 'Journey token bond reward');
	                saveGame();
	                return { ok: true, rewardId: id, message: 'Bond XP increased.', balance: spend.balance };
	            }
	            if (id === 'codex') {
	                const spend = spendJourneyTokens(7);
	                if (!spend.ok) return { ok: false, reason: spend.reason, needed: 7, balance: spend.balance };
	                const locked = Object.entries(PET_TYPES || {})
	                    .filter(([typeId, data]) => data && data.mythical && !isPetTypeUnlocked(typeId))
	                    .map(([typeId]) => typeId);
	                if (locked.length > 0) {
	                    const unlockType = locked[hashDailySeed(`journey-codex:${getTodayString()}`) % locked.length];
	                    const req = Math.max(0, Math.floor((PET_TYPES[unlockType] && PET_TYPES[unlockType].unlockRequirement) || 0));
	                    gameState.adultsRaised = Math.max(gameState.adultsRaised || 0, req);
	                    if (typeof addJournalEntry === 'function') {
	                        addJournalEntry('📖', `Codex insight unlocked: ${PET_TYPES[unlockType].name} is now discoverable.`);
	                    }
	                }
	                saveGame();
	                return { ok: true, rewardId: id, message: 'Codex insight unlocked.', balance: spend.balance };
	            }
	            return { ok: false, reason: 'invalid-reward' };
	        }

	        function getBondLevelForXp(xpValue) {
	            const milestones = Array.isArray(BOND_XP_MILESTONES) ? BOND_XP_MILESTONES : [];
	            const safeXp = Math.max(0, Math.floor(Number(xpValue) || 0));
	            let level = 1;
	            milestones.forEach((milestone) => {
	                if (safeXp >= Math.max(0, Math.floor(milestone.xp || 0))) {
	                    level = Math.max(level, Math.floor(milestone.level || level));
	                }
	            });
	            return level;
	        }

	        function addBondXp(amount, reason) {
	            const meta = ensureRetentionMetaState();
	            const add = Math.max(0, Math.floor(Number(amount) || 0));
	            if (add <= 0) return { added: 0, xp: meta.bond.xp || 0, level: meta.bond.level || 1, leveledUp: false };
	            const previousLevel = Math.max(1, Math.floor(meta.bond.level || 1));
	            meta.bond.xp = Math.max(0, Math.floor(meta.bond.xp || 0)) + add;
	            meta.bond.level = getBondLevelForXp(meta.bond.xp);
	            const leveledUp = meta.bond.level > previousLevel;
	            if (leveledUp) {
	                const milestones = Array.isArray(BOND_XP_MILESTONES) ? BOND_XP_MILESTONES : [];
	                milestones
	                    .filter((milestone) => milestone.level > previousLevel && milestone.level <= meta.bond.level)
	                    .forEach((milestone) => {
	                        const key = `bond_${milestone.level}`;
	                        if (!meta.bond.claimedMilestones.includes(key)) {
	                            meta.bond.claimedMilestones.push(key);
	                            grantJourneyRewardPayload(milestone.reward, `Bond Level ${milestone.level}`);
	                        }
	                    });
	                if (typeof showToast === 'function') {
	                    showToast(`💞 Bond Level ${meta.bond.level} reached!`, '#EC407A');
	                }
	            }
	            retentionDebugLog('Bond XP updated', { add, reason, xp: meta.bond.xp, level: meta.bond.level });
	            return { added: add, xp: meta.bond.xp, level: meta.bond.level, leveledUp };
	        }

	        function evaluateJourneyProgress(triggerSource) {
	            const meta = ensureRetentionMetaState();
	            const chapters = Array.isArray(JOURNEY_CHAPTERS) ? JOURNEY_CHAPTERS : [];
	            if (chapters.length === 0) return { completedObjectives: [], completedChapters: [] };
	            const currentDay = getJourneyDay();
	            const snapshot = getJourneyMetricSnapshot();
	            const completedObjectives = [];
	            const completedChapters = [];
	            chapters.forEach((chapter) => {
	                if (currentDay < Math.max(1, Math.floor(chapter.dayStart || 1))) return;
	                const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
	                objectives.forEach((objective) => {
	                    const metricValue = Math.max(0, Math.floor(snapshot[objective.metric] || 0));
	                    meta.journey.objectiveProgress[objective.id] = metricValue;
	                    if (metricValue >= (objective.target || 0) && !meta.journey.completedObjectives[objective.id]) {
	                        meta.journey.completedObjectives[objective.id] = {
	                            at: Date.now(),
	                            source: triggerSource || 'progress'
	                        };
	                        const rewardTokens = Math.max(1, Math.floor(objective.tokenReward || (JOURNEY_TOKEN_REWARD_TABLE && JOURNEY_TOKEN_REWARD_TABLE.objectiveComplete) || 2));
	                        addJourneyTokens(rewardTokens, objective.label || objective.id);
	                        if (objective.track === 'bond') addBondXp(3, objective.id);
	                        completedObjectives.push(objective);
	                    }
	                });
	                const chapterDone = objectives.length > 0 && objectives.every((objective) => !!meta.journey.completedObjectives[objective.id]);
	                if (chapterDone && !meta.journey.chapterCompletions[chapter.id]) {
	                    meta.journey.chapterCompletions[chapter.id] = { at: Date.now() };
	                    const chapterReward = chapter.chapterReward || {};
	                    const fallbackTokens = (JOURNEY_TOKEN_REWARD_TABLE && JOURNEY_TOKEN_REWARD_TABLE.chapterComplete) || 4;
	                    addJourneyTokens(Math.max(1, Math.floor(chapterReward.tokens || fallbackTokens)), `${chapter.label} complete`);
	                    grantJourneyRewardPayload(chapterReward, chapter.label || chapter.id);
	                    if (typeof addJournalEntry === 'function') {
	                        addJournalEntry('🧭', `${chapter.label} complete.`);
	                    }
	                    completedChapters.push(chapter);
	                }
	                ['bond', 'mastery', 'collection'].forEach((trackId) => {
	                    const trackObjectives = objectives.filter((objective) => objective.track === trackId);
	                    if (trackObjectives.length === 0) return;
	                    const key = `${chapter.id}:${trackId}`;
	                    const trackDone = trackObjectives.every((objective) => !!meta.journey.completedObjectives[objective.id]);
	                    if (trackDone && !meta.journey.trackCompletions[key]) {
	                        meta.journey.trackCompletions[key] = { at: Date.now() };
	                        addJourneyTokens(1, `${trackId} track complete`);
	                    }
	                });
	            });
	            if (completedObjectives.length > 0 || completedChapters.length > 0) {
	                meta.journey.lastProgressAt = Date.now();
	                saveGame();
	            }
	            return { completedObjectives, completedChapters };
	        }

	        function getJourneyStatus() {
	            const meta = ensureRetentionMetaState();
	            const day = getJourneyDay();
	            const chapter = getJourneyChapterForDay(day);
	            const chapters = Array.isArray(JOURNEY_CHAPTERS) ? JOURNEY_CHAPTERS : [];
	            const tracks = ['bond', 'mastery', 'collection'];
	            const trackProgress = {};
	            tracks.forEach((trackId) => {
	                const allTrackObjectives = chapters.flatMap((entry) => (entry.objectives || []).filter((objective) => objective.track === trackId));
	                const completed = allTrackObjectives.filter((objective) => !!meta.journey.completedObjectives[objective.id]).length;
	                trackProgress[trackId] = {
	                    completed,
	                    total: allTrackObjectives.length,
	                    pct: allTrackObjectives.length > 0 ? Math.round((completed / allTrackObjectives.length) * 100) : 0
	                };
	            });
	            const chapterObjectives = chapter ? (chapter.objectives || []) : [];
	            const chapterCompleted = chapterObjectives.filter((objective) => !!meta.journey.completedObjectives[objective.id]).length;
	            const chapterPct = chapterObjectives.length > 0 ? Math.round((chapterCompleted / chapterObjectives.length) * 100) : 0;
	            const nextObjective = chapterObjectives.find((objective) => !meta.journey.completedObjectives[objective.id]) || null;
	            const novelty = getNextNoveltyUnlock(day);
	            const snapshot = getJourneyMetricSnapshot();
	            const chapterObjectiveStates = chapterObjectives.map((objective) => {
	                const value = Math.max(0, Math.floor(snapshot[objective.metric] || 0));
	                const target = Math.max(1, Math.floor(objective.target || 1));
	                return {
	                    ...objective,
	                    value: Math.min(value, target),
	                    target,
	                    done: !!meta.journey.completedObjectives[objective.id]
	                };
	            });
	            return {
	                day,
	                chapter,
	                chapterCompleted,
	                chapterTotal: chapterObjectives.length,
	                chapterPct,
	                nextObjective,
	                chapterObjectives: chapterObjectiveStates,
	                tokens: Math.max(0, Math.floor(meta.journey.tokens || 0)),
	                bondXp: Math.max(0, Math.floor(meta.bond.xp || 0)),
	                bondLevel: Math.max(1, Math.floor(meta.bond.level || 1)),
	                trackProgress,
	                novelty
	            };
	        }

	        function getJourneyChapterStates() {
	            const meta = ensureRetentionMetaState();
	            const day = getJourneyDay();
	            const chapters = Array.isArray(JOURNEY_CHAPTERS) ? JOURNEY_CHAPTERS : [];
	            return chapters.map((chapter) => {
	                const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
	                const completed = objectives.filter((objective) => !!meta.journey.completedObjectives[objective.id]).length;
	                return {
	                    id: chapter.id,
	                    label: chapter.label,
	                    dayStart: chapter.dayStart,
	                    dayEnd: chapter.dayEnd,
	                    unlocked: day >= Math.max(1, Math.floor(chapter.dayStart || 1)),
	                    complete: !!meta.journey.chapterCompletions[chapter.id],
	                    completed,
	                    total: objectives.length,
	                    pct: objectives.length > 0 ? Math.round((completed / objectives.length) * 100) : 0
	                };
	            });
	        }

	        function getNextNoveltyUnlock(day) {
	            const schedule = (typeof NOVELTY_SCHEDULE !== 'undefined' && NOVELTY_SCHEDULE && Array.isArray(NOVELTY_SCHEDULE.earlyUnlocks))
	                ? NOVELTY_SCHEDULE.earlyUnlocks
	                : [];
	            const safeDay = Math.max(1, Math.floor(Number(day) || getJourneyDay()));
	            const meta = ensureRetentionMetaState();
	            return schedule.find((entry) => entry.day >= safeDay && !meta.novelty.claimedSchedule[entry.id]) || null;
	        }

	        function recordRetentionActivity(activityKey) {
	            const meta = ensureRetentionMetaState();
	            const key = typeof activityKey === 'string' ? activityKey : '';
	            if (!key) return;
	            meta.reactivation.lastActivity = key;
	        }

	        function addReminderCenterItem(type, title, body, action) {
	            const meta = ensureRetentionMetaState();
	            const list = meta.reminderCenter.items;
	            const today = getTodayString();
	            const dedupeKey = `${type}:${today}`;
	            if (list.some((item) => item && item.dedupeKey === dedupeKey)) return null;
	            const entry = {
	                id: `rem_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
	                type: type || 'general',
	                title: title || 'Reminder',
	                body: body || '',
	                action: action || null,
	                createdAt: Date.now(),
	                date: today,
	                dedupeKey
	            };
	            list.unshift(entry);
	            const maxItems = (typeof REMINDER_CENTER_CONFIG !== 'undefined' && Number.isFinite(REMINDER_CENTER_CONFIG.maxItems))
	                ? Math.max(5, Math.floor(REMINDER_CENTER_CONFIG.maxItems))
	                : 12;
	            if (list.length > maxItems) list.splice(maxItems);
	            return entry;
	        }

	        function getReminderCenterItems() {
	            const meta = ensureRetentionMetaState();
	            return Array.isArray(meta.reminderCenter.items) ? [...meta.reminderCenter.items] : [];
	        }

	        function dismissReminderCenterItem(itemId) {
	            const meta = ensureRetentionMetaState();
	            const before = meta.reminderCenter.items.length;
	            meta.reminderCenter.items = meta.reminderCenter.items.filter((item) => item && item.id !== itemId);
	            if (meta.reminderCenter.items.length !== before) saveGame();
	        }

	        function openReminderCenterAction(itemId) {
	            const meta = ensureRetentionMetaState();
	            const item = (meta.reminderCenter.items || []).find((entry) => entry && entry.id === itemId);
	            if (!item || !item.action) return false;
	            const actionType = item.action.type;
	            if (actionType === 'streak' && typeof showStreakModal === 'function') {
	                showStreakModal();
	                return true;
	            }
	            if (actionType === 'explore' && typeof showExplorationModal === 'function') {
	                showExplorationModal();
	                return true;
	            }
	            if (actionType === 'garden' && typeof switchRoom === 'function') {
	                switchRoom('garden');
	                return true;
	            }
	            if (actionType === 'breeding' && typeof showToolsMenu === 'function') {
	                const trigger = document.getElementById('tools-btn') || document.body;
	                showToolsMenu(trigger);
	                return true;
	            }
	            if (actionType === 'journey' && typeof showJourneyModal === 'function') {
	                showJourneyModal();
	                return true;
	            }
	            return false;
	        }

	        function dismissReminderPrompt() {
	            const meta = ensureRetentionMetaState();
	            meta.reminderCenter.promptDismissed = true;
	            meta.onboarding.reminderPromptSeen = true;
	            saveGame();
	        }

	        function shouldShowReminderPrompt() {
	            const meta = ensureRetentionMetaState();
	            const reminders = ensureReminderState();
	            if (reminders.enabled) return false;
	            if (meta.reminderCenter.promptDismissed || meta.onboarding.reminderPromptSeen) return false;
	            try {
	                const raw = localStorage.getItem(STORAGE_KEYS.petSessions);
	                const sessions = Number.parseInt(raw || '0', 10);
	                return Number.isFinite(sessions) && sessions > 0 && sessions <= 2;
	            } catch (e) {
	                return false;
	            }
	        }

	        function markReminderPromptSeen() {
	            const meta = ensureRetentionMetaState();
	            meta.onboarding.reminderPromptSeen = true;
	            meta.reminderCenter.lastPromptSession = Date.now();
	            saveGame();
	        }

	        function applyNoveltyReward(entry) {
	            if (!entry || !entry.reward) return;
	            const reward = entry.reward;
	            if (reward.type === 'sticker' && reward.id && typeof grantSticker === 'function') {
	                grantSticker(reward.id);
	            } else if (reward.type === 'journal' && reward.text && typeof addJournalEntry === 'function') {
	                addJournalEntry('📜', reward.text);
	            } else if (reward.type === 'unlockBiome' && reward.biomeId) {
	                ensureExplorationState();
	                if (gameState.exploration.biomeUnlocks && Object.prototype.hasOwnProperty.call(gameState.exploration.biomeUnlocks, reward.biomeId)) {
	                    gameState.exploration.biomeUnlocks[reward.biomeId] = true;
	                    gameState.exploration.discoveredBiomes[reward.biomeId] = true;
	                }
	            }
	            addJourneyTokens((JOURNEY_TOKEN_REWARD_TABLE && JOURNEY_TOKEN_REWARD_TABLE.noveltyUnlock) || 2, entry.title || 'Novelty unlock');
	        }

	        function evaluateNoveltyScheduler(triggerSource) {
	            const meta = ensureRetentionMetaState();
	            const noveltyCfg = (typeof NOVELTY_SCHEDULE !== 'undefined' && NOVELTY_SCHEDULE) ? NOVELTY_SCHEDULE : {};
	            const day = getJourneyDay();
	            const unlocked = [];
	            const earlyUnlocks = Array.isArray(noveltyCfg.earlyUnlocks) ? noveltyCfg.earlyUnlocks : [];
	            earlyUnlocks.forEach((entry) => {
	                if (!entry || !entry.id || day < Math.max(1, Math.floor(entry.day || 1))) return;
	                if (meta.novelty.claimedSchedule[entry.id]) return;
	                meta.novelty.claimedSchedule[entry.id] = { at: Date.now(), source: triggerSource || 'scheduler' };
	                applyNoveltyReward(entry);
	                addReminderCenterItem('novelty', entry.title || 'New unlock', entry.subtitle || 'A new reward is ready.', { type: 'journey' });
	                unlocked.push(entry);
	            });
	            if (day > 14) {
	                const weekIndex = Math.max(0, Math.floor((day - 15) / 7));
	                const weekKey = `day${day}:w${weekIndex + 1}`;
	                if (meta.novelty.lastWeeklyEventKey !== weekKey) {
	                    const spikes = Array.isArray(noveltyCfg.weeklySpikes) ? noveltyCfg.weeklySpikes : [];
	                    if (spikes.length > 0) {
	                        const selected = spikes[hashDailySeed(`novelty:${weekKey}`) % spikes.length];
	                        const eventId = `${selected.id}:${weekKey}`;
	                        if (!meta.novelty.claimedSchedule[eventId]) {
	                            meta.novelty.claimedSchedule[eventId] = { at: Date.now(), source: triggerSource || 'weekly-spike' };
	                            if (selected.reward) {
	                                if (selected.reward.type === 'sticker' && selected.reward.id && typeof grantSticker === 'function') {
	                                    grantSticker(selected.reward.id);
	                                }
	                                addJourneyTokens(3, `${selected.label} event`);
	                            }
	                            addReminderCenterItem('eventSpike', `${selected.icon || '✨'} ${selected.label}`, 'Weekly event rewards are active this week.', { type: 'journey' });
	                            unlocked.push(selected);
	                        }
	                    }
	                    meta.novelty.lastWeeklyEventKey = weekKey;
	                }
	            }
	            meta.novelty.lastClaimedJourneyDay = Math.max(meta.novelty.lastClaimedJourneyDay || 0, day);
	            if (unlocked.length > 0) saveGame();
	            return unlocked;
	        }

	        function updateReactivationStateOnLogin() {
	            const meta = ensureRetentionMetaState();
	            const today = getTodayString();
	            const lastSeen = meta.reactivation.lastSeenDate;
	            const awayDays = lastSeen ? getCalendarDayDiff(lastSeen, today) : 0;
	            meta.reactivation.awayDays = Math.max(0, awayDays);
	            if (awayDays > 0) {
	                meta.reactivation.pendingRecap = {
	                    at: Date.now(),
	                    awayDays,
	                    lastActivity: meta.reactivation.lastActivity || '',
	                    streak: (gameState.streak && gameState.streak.current) || 0,
	                    bondLevel: (meta.bond && meta.bond.level) || 1,
	                    journeyDay: getJourneyDay()
	                };
	            }
	            meta.reactivation.lastSeenDate = today;
	            return awayDays;
	        }

	        function getReactiveReturnDialogue() {
	            const meta = ensureRetentionMetaState();
	            const awayDays = Math.max(0, Math.floor(meta.reactivation.awayDays || 0));
	            if (awayDays <= 0) return '';
	            const today = getTodayString();
	            if (meta.reactivation.lastDialogueDate === today) return '';
	            const cfg = (typeof REACTIVATION_DIALOGUE !== 'undefined' && REACTIVATION_DIALOGUE) ? REACTIVATION_DIALOGUE : {};
	            const buckets = Array.isArray(cfg.awayBuckets) ? cfg.awayBuckets : [];
	            const sorted = [...buckets].sort((a, b) => (a.minDays || 0) - (b.minDays || 0));
	            let line = '';
	            sorted.forEach((bucket) => {
	                if (awayDays >= (bucket.minDays || 0) && Array.isArray(bucket.lines) && bucket.lines.length > 0) {
	                    line = bucket.lines[hashDailySeed(`react:${today}:${bucket.minDays}`) % bucket.lines.length];
	                }
	            });
	            if (!line) {
	                const generic = Array.isArray(cfg.generic) ? cfg.generic : [];
	                if (generic.length > 0) line = generic[hashDailySeed(`react-generic:${today}`) % generic.length];
	            }
	            const lastActivity = meta.reactivation.lastActivity || '';
	            const activityLine = (cfg.byActivity && cfg.byActivity[lastActivity]) ? cfg.byActivity[lastActivity] : '';
	            const bondLevel = Math.max(1, Math.floor((meta.bond && meta.bond.level) || 1));
	            const bondLine = bondLevel >= 3 ? 'Our bond still feels strong.' : '';
	            const fullLine = [line, activityLine, bondLine].filter(Boolean).join(' ');
	            meta.reactivation.lastDialogueDate = today;
	            return fullLine;
	        }

	        function consumeReturnRecap() {
	            const meta = ensureRetentionMetaState();
	            const recap = meta.reactivation.pendingRecap;
	            meta.reactivation.pendingRecap = null;
	            meta.reactivation.lastRecapShownDate = getTodayString();
	            return recap;
	        }

        function getStageRank(stage) {
            const order = ['baby', 'child', 'adult', 'elder'];
            const idx = order.indexOf(stage);
            return idx === -1 ? 0 : idx;
        }

        function canUseWildcardTask(task, stage) {
            if (!task || !task.minStage) return true;
            return getStageRank(stage) >= getStageRank(task.minStage);
        }

        function hashDailySeed(seed) {
            if (typeof hashStringToUint === 'function') return hashStringToUint(seed);
            let h = 2166136261 >>> 0;
            const s = String(seed || '');
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        }

        function pickDailyModeTasks(dateKey) {
            const pool = Array.isArray(DAILY_MODE_TASKS) ? [...DAILY_MODE_TASKS] : [];
            if (pool.length <= 2) return pool;
            const selected = [];
            let seed = hashDailySeed(`mode:${dateKey}`);
            while (pool.length > 0 && selected.length < 2) {
                const idx = seed % pool.length;
                selected.push(pool.splice(idx, 1)[0]);
                seed = Math.imul(seed ^ 0x9E3779B9, 1664525) >>> 0;
            }
            return selected;
        }

        function pickDailyWildcardTask(stage, dateKey) {
            const pool = (Array.isArray(DAILY_WILDCARD_TASKS) ? DAILY_WILDCARD_TASKS : []).filter((task) => canUseWildcardTask(task, stage));
            if (pool.length === 0) return null;
            const idx = hashDailySeed(`wild:${dateKey}:${stage}`) % pool.length;
            return pool[idx];
        }

        function buildDailyTaskEntry(task, stage) {
            const source = task || {};
            const target = typeof getDailyTaskTarget === 'function' ? getDailyTaskTarget(source, stage) : (source.target || 1);
            return {
                id: source.id || `task_${Date.now()}`,
                icon: source.icon || '📌',
                lane: source.lane || 'mode',
                trackKey: source.trackKey || 'totalCareActions',
                target,
                done: false,
                name: typeof getDailyTaskName === 'function' ? getDailyTaskName(source, target) : (source.name || 'Daily task')
            };
        }

        function addGameplayModifier(modifierId, source) {
            if (!modifierId || !REWARD_MODIFIERS || !REWARD_MODIFIERS[modifierId]) return null;
            if (!Array.isArray(gameState.rewardModifiers)) gameState.rewardModifiers = [];
            const now = Date.now();
            gameState.rewardModifiers = gameState.rewardModifiers.filter((m) => !m.expiresAt || m.expiresAt > now);
            const def = REWARD_MODIFIERS[modifierId];
            const effect = def.effect || {};
            const modifier = {
                id: `${modifierId}:${now}`,
                typeId: modifierId,
                name: def.name,
                emoji: def.emoji,
                source: source || 'Reward',
                createdAt: now,
                expiresAt: effect.durationMs ? (now + effect.durationMs) : null,
                remainingActions: Number.isFinite(effect.remainingActions) ? Math.max(0, effect.remainingActions) : null,
                remainingMatches: Number.isFinite(effect.remainingMatches) ? Math.max(0, effect.remainingMatches) : null,
                nextExpeditionBonusRolls: Number.isFinite(effect.rolls) ? Math.max(0, effect.rolls) : 0
            };
            gameState.rewardModifiers.push(modifier);
            return modifier;
        }

        function cleanupRewardModifiers() {
            if (!Array.isArray(gameState.rewardModifiers)) {
                gameState.rewardModifiers = [];
                return [];
            }
            const now = Date.now();

            // Recommendation #6: Modifier expiry coin conversion
            // When a modifier expires with unused actions/duration, convert leftovers into coins
            let expiryCoins = 0;
            gameState.rewardModifiers.forEach((modifier) => {
                if (!modifier.expiresAt || modifier.expiresAt > now) return; // not expired
                // Convert unused remaining actions: 1 coin per unused action (careRush-style)
                if (typeof modifier.remainingActions === 'number' && modifier.remainingActions > 0) {
                    expiryCoins += modifier.remainingActions;
                }
                // Convert unused remaining time: 1 coin per 5 min remaining (happyHour-style)
                if (modifier.expiresAt && modifier.expiresAt > now) {
                    const remainingMs = modifier.expiresAt - now;
                    expiryCoins += Math.floor(remainingMs / (5 * 60 * 1000));
                }
            });
            if (expiryCoins > 0) {
                addCoins(expiryCoins, 'Modifier Expiry', true);
                if (typeof showToast === 'function') showToast(`🪙 +${expiryCoins} coins from expired modifiers`, '#FFD700');
            }

            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => !modifier.expiresAt || modifier.expiresAt > now);
            return gameState.rewardModifiers;
        }

        function getModifierEffect(modifier) {
            if (!modifier || !modifier.typeId || !REWARD_MODIFIERS || !REWARD_MODIFIERS[modifier.typeId]) return null;
            return REWARD_MODIFIERS[modifier.typeId].effect || null;
        }

        function getRewardCareGainMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'careGainMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            return mult;
        }

        function getRewardHappinessFlatBonus() {
            let total = 0;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'happinessFlatBonus') return;
                total += Math.max(0, Number(effect.value) || 0);
            });
            return total;
        }

        function consumeCareActionRewardModifiers() {
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.remainingActions !== 'number') return;
                modifier.remainingActions = Math.max(0, modifier.remainingActions - 1);
            });
            // Recommendation #6: Convert remaining time on action-exhausted modifiers
            let expiryCoins = 0;
            gameState.rewardModifiers.forEach((modifier) => {
                if (modifier.remainingActions !== null && modifier.remainingActions <= 0 && modifier.expiresAt) {
                    const now = Date.now();
                    if (modifier.expiresAt > now) {
                        expiryCoins += Math.floor((modifier.expiresAt - now) / (5 * 60 * 1000));
                    }
                }
            });
            if (expiryCoins > 0) {
                addCoins(expiryCoins, 'Modifier Expiry', true);
            }
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => modifier.remainingActions === null || modifier.remainingActions > 0);
        }

        function consumeExpeditionRewardBonusRolls() {
            let rolls = 0;
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.nextExpeditionBonusRolls !== 'number' || modifier.nextExpeditionBonusRolls <= 0) return;
                rolls += modifier.nextExpeditionBonusRolls;
                modifier.nextExpeditionBonusRolls = 0;
            });
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => !(typeof modifier.nextExpeditionBonusRolls === 'number' && modifier.nextExpeditionBonusRolls <= 0 && !modifier.expiresAt && modifier.remainingActions === null && modifier.remainingMatches === null));
            return rolls;
        }

        function getRewardCompetitionMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'competitionRewardMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            return mult;
        }

        function consumeCompetitionRewardModifiers() {
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.remainingMatches !== 'number') return;
                modifier.remainingMatches = Math.max(0, modifier.remainingMatches - 1);
            });
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => modifier.remainingMatches === null || modifier.remainingMatches > 0);
        }

        function getRewardRelationshipMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'relationshipMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            return mult;
        }

        function grantBundleCollectible(collectible) {
            if (!collectible || typeof collectible !== 'object') return false;
            if (collectible.type === 'sticker') return grantSticker(collectible.id);
            if (collectible.type === 'accessory' && gameState.pet) {
                if (!Array.isArray(gameState.pet.unlockedAccessories)) gameState.pet.unlockedAccessories = [];
                if (!gameState.pet.unlockedAccessories.includes(collectible.id)) {
                    gameState.pet.unlockedAccessories.push(collectible.id);
                    return true;
                }
            }
            return false;
        }

        function applyRewardBundle(bundleId, sourceLabel) {
            if (!bundleId || !REWARD_BUNDLES || !REWARD_BUNDLES[bundleId]) return null;
            const bundle = REWARD_BUNDLES[bundleId];
            const source = sourceLabel || 'Bundle Reward';
            const earnedCoins = Number(bundle.coins) > 0 ? addCoins(bundle.coins, source, true) : 0;
            const modifier = bundle.modifierId ? addGameplayModifier(bundle.modifierId, source) : null;
            const collectibleGranted = bundle.collectible ? grantBundleCollectible(bundle.collectible) : false;
            return { bundle, earnedCoins, modifier, collectibleGranted };
        }

        function getDailyTaskTemplateMap() {
            const map = {};
            (Array.isArray(DAILY_TASKS) ? DAILY_TASKS : []).forEach((task) => { if (task && task.id) map[task.id] = task; });
            return map;
        }

        function initWeeklyArc() {
            const weekKey = getWeekKey();
            if (!gameState.weeklyArc || gameState.weeklyArc.weekKey !== weekKey) {
                const arcs = Array.isArray(WEEKLY_THEMED_ARCS) ? WEEKLY_THEMED_ARCS : [];
                if (arcs.length === 0) return null;
                const arc = arcs[hashDailySeed(`arc:${weekKey}`) % arcs.length];
                gameState.weeklyArc = {
                    weekKey,
                    arcId: arc.id,
                    theme: arc.theme,
                    icon: arc.icon,
                    tasks: (arc.tasks || []).map((task) => ({ ...task, done: false })),
                    progress: {},
                    completed: false,
                    rewardClaimed: false,
                    reward: arc.finaleReward || null
                };
            }
            return gameState.weeklyArc;
        }

        function incrementWeeklyArcProgress(key, amount) {
            const arc = initWeeklyArc();
            if (!arc || !key) return [];
            if (!arc.progress || typeof arc.progress !== 'object') arc.progress = {};
            arc.progress[key] = (arc.progress[key] || 0) + (amount ?? 1);
            const completed = [];
            (arc.tasks || []).forEach((task) => {
                if (!task || task.done || task.trackKey !== key) return;
                const target = Math.max(1, Number(task.target) || 1);
                if ((arc.progress[key] || 0) >= target) {
                    task.done = true;
                    completed.push(task);
                }
            });
            if (!arc.completed && (arc.tasks || []).length > 0 && arc.tasks.every((task) => task.done)) {
                arc.completed = true;
                if (!arc.rewardClaimed) {
                    arc.rewardClaimed = true;
                    if (arc.reward && arc.reward.bundleId) applyRewardBundle(arc.reward.bundleId, `${arc.icon || '🏅'} ${arc.theme || 'Weekly Arc'}`);
                    if (arc.reward && arc.reward.collectible) grantBundleCollectible(arc.reward.collectible);
                    addJournalEntry('🏅', `${arc.theme || 'Weekly arc'} completed! Exclusive finale reward unlocked.`);
                }
            }
            return completed;
        }

	        function initDailyChecklist() {
                checkAndRecordTimeJump(gameState, 'daily-checklist');
	            const today = getTodayStringWithTimeHardening();
	            let resetToday = false;
	            if (!gameState.dailyChecklist || gameState.dailyChecklist.date !== today) {
	                resetToday = true;
	                // Generate diary entry for previous day before resetting
                if (gameState.dailyChecklist && gameState.dailyChecklist.date && gameState.pet) {
                    if (typeof generateDiaryEntry === 'function') {
                        try {
                            const prevProgress = gameState.dailyChecklist.progress || {};
                            const pet = gameState.pet;
                            const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
                            const dayNum = pet.birthdate ? Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000)) : 1;
                            const entry = generateDiaryEntry(pet, prevProgress, season, dayNum);
                            if (entry) {
                                entry.date = gameState.dailyChecklist.date; // Use the actual day being summarized
                                applyDiaryVoice(entry);
                                if (!Array.isArray(gameState.diary)) gameState.diary = [];
                                gameState.diary.push(entry);
                                // Keep last 30 diary entries
                                if (gameState.diary.length > 30) {
                                    gameState.diary = gameState.diary.slice(-30);
                                }
                            }
                        } catch (e) {
                            // Diary generation should never block daily reset
                        }
                    }
                }
                // Rec 11: Apply coin decay on new day (before daily tasks reset)
                if (gameState.dailyChecklist && gameState.dailyChecklist.date) {
                    if (typeof applyCoinDecay === 'function') applyCoinDecay();
                }
                // Rec 1: Reset daily minigame earnings counter
                gameState._dailyMinigameEarnings = 0;
                gameState._dailyMinigameEarningsDay = today;
                gameState._minigameWinStreak = 0;

                const stage = (gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby';
                const fixedTasks = (Array.isArray(DAILY_FIXED_TASKS) ? DAILY_FIXED_TASKS : []).slice(0, 2);
                const modeTasks = pickDailyModeTasks(today);
                const wildcard = pickDailyWildcardTask(stage, today);
                const taskList = [...fixedTasks, ...modeTasks];
                if (wildcard) taskList.push(wildcard);
                // Add seasonal daily task if available
                if (typeof DAILY_SEASONAL_TASKS === 'object' && typeof getCurrentSeason === 'function') {
                    const seasonTask = DAILY_SEASONAL_TASKS[getCurrentSeason()];
                    if (seasonTask) taskList.push(seasonTask);
                }
                gameState.dailyChecklist = {
                    date: today,
                    stage,
                    progress: { feedCount: 0, minigameCount: 0, harvestCount: 0, parkVisits: 0, totalCareActions: 0, expeditionCount: 0, battleCount: 0, hatchCount: 0, masteryPoints: 0, bondEvents: 0, discoveryEvents: 0 },
                    tasks: taskList.map((t) => buildDailyTaskEntry(t, stage)),
	                    _completionCounted: false,
	                    _rewardGranted: false
	                };
	            }
	            initWeeklyArc();
	            if (resetToday) {
	                evaluateJourneyProgress('daily-reset');
	                evaluateNoveltyScheduler('daily-reset');
	            }
	            return gameState.dailyChecklist;
	        }

	        function incrementDailyProgress(key, amount) {
	            const cl = initDailyChecklist();
	            if (!cl.progress[key]) cl.progress[key] = 0;
	            cl.progress[key] += (amount ?? 1);
	            const activityMap = {
	                feedCount: 'care',
	                totalCareActions: 'care',
	                minigameCount: 'minigame',
	                harvestCount: 'harvest',
	                expeditionCount: 'expedition',
	                battleCount: 'battle',
	                hatchCount: 'daily',
	                discoveryEvents: 'expedition'
	            };
	            if (activityMap[key]) recordRetentionActivity(activityMap[key]);
	            // Check completions
	            const templates = getDailyTaskTemplateMap();
	            const newlyCompleted = [];
	            cl.tasks.forEach((task) => {
	                if (!task || task.done || task.trackKey !== key) return;
	                const scaledTarget = Number(task.target || 1);
	                if ((cl.progress[key] || 0) >= scaledTarget) {
	                    task.done = true;
	                    newlyCompleted.push({
	                        ...(templates[task.id] || task),
	                        icon: task.icon || (templates[task.id] && templates[task.id].icon) || '✅',
	                        target: scaledTarget,
	                        name: task.name
	                    });
	                }
	            });
	            incrementWeeklyArcProgress(key, amount);
	            evaluateJourneyProgress(`daily:${key}`);
	            // Track daily completion count for trophies
	            if (typeof trackDailyCompletion === 'function') trackDailyCompletion();
	            return newlyCompleted;
	        }

	        function isDailyComplete() {
	            const cl = initDailyChecklist();
	            return cl.tasks.every(t => t.done);
	        }

        function getTodayDailyRewardPreview() {
            const cl = initDailyChecklist();
            const stage = (cl && cl.stage && GROWTH_STAGES[cl.stage]) ? cl.stage : ((gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby');
            // Report #9: Stage-table reward routing replaces hardcoded dailyFinish.
            const bundleId = (typeof getRewardBundleForPhase === 'function')
                ? getRewardBundleForPhase('daily', stage, 'dailyFinish')
                : 'dailyFinish';
            const bundle = (typeof REWARD_BUNDLES !== 'undefined' && REWARD_BUNDLES[bundleId]) ? REWARD_BUNDLES[bundleId] : null;
            return { stage, bundleId, bundle };
        }

	        // Track daily completions count (for trophies)
	        function trackDailyCompletion() {
	            if (isDailyComplete()) {
	                // Only count once per day
	                const cl = gameState.dailyChecklist;
	                if (cl && !cl._completionCounted) {
	                    cl._completionCounted = true;
	                    if (typeof gameState.totalDailyCompletions !== 'number') gameState.totalDailyCompletions = 0;
	                    gameState.totalDailyCompletions++;
	                    if (typeof markCoachChecklistProgress === 'function') markCoachChecklistProgress('complete_daily');
	                    if (!cl._rewardGranted) {
	                        cl._rewardGranted = true;
	                        const preview = getTodayDailyRewardPreview();
	                        const bundled = applyRewardBundle(preview.bundleId, 'Daily Tasks');
	                        // Recommendation #7: Mastery rank daily bonus (+1 coin if Family Legacy tier 2+)
	                        const masteryDailyBonus = typeof getMasteryDailyBonus === 'function' ? getMasteryDailyBonus() : 0;
	                        // Recommendation #10: Elder legacy passive income
	                        // Each retired elder pet adds +2 coins/day, non-elder retired pets add +1 coin/day
	                        let elderLegacyBonus = 0;
	                        if (Array.isArray(gameState.memorials)) {
	                            gameState.memorials.forEach(m => {
	                                elderLegacyBonus += (m.growthStage === 'elder') ? 2 : 1;
	                            });
	                        }
	                        const totalBonusCoins = masteryDailyBonus + elderLegacyBonus;
	                        if (totalBonusCoins > 0) {
	                            addCoins(totalBonusCoins, 'Daily Tasks (Mastery + Legacy Bonus)', true);
	                        }
	                        if (bundled && typeof showToast === 'function') {
	                            const modifierText = bundled.modifier ? ` + ${bundled.modifier.emoji} ${bundled.modifier.name}` : '';
	                            const bonusText = (masteryDailyBonus > 0 || elderLegacyBonus > 0) ? ` + ${masteryDailyBonus + elderLegacyBonus} bonus` : '';
	                            showToast(`📋 Daily tasks complete! +${bundled.earnedCoins} coins${bonusText}${modifierText}`, '#FFD700');
	                        } else {
	                            const dailyRewardBase = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.dailyCompletionReward === 'number')
	                                ? ECONOMY_BALANCE.dailyCompletionReward
	                                : 85;
	                            const dailyReward = dailyRewardBase + totalBonusCoins;
	                            const payout = addCoins(dailyReward, 'Daily Tasks', true);
	                            if (payout > 0 && typeof showToast === 'function') {
	                                showToast(`📋 Daily tasks complete! Earned ${payout} coins.`, '#FFD700');
	                            }
	                        }
	                        addJourneyTokens((JOURNEY_TOKEN_REWARD_TABLE && JOURNEY_TOKEN_REWARD_TABLE.dailyComplete) || 2, 'Daily completion');
	                        addBondXp(4, 'Daily completion');
	                        if (typeof grantSticker === 'function') {
	                            const dropPool = ['partySticker', 'musicSticker', 'artSticker'];
	                            const dropId = dropPool[hashDailySeed(`daily-drop:${getTodayString()}`) % dropPool.length];
	                            if (Math.random() < 0.25 && grantSticker(dropId) && typeof showToast === 'function') {
	                                showToast(`🎨 Bonus drop: ${STICKERS[dropId].emoji} ${STICKERS[dropId].name}`, '#BA68C8');
	                            }
	                        }
	                        if (typeof addJournalEntry === 'function' && Math.random() < 0.4) {
	                            addJournalEntry('📘', 'Daily reflection: your consistency strengthened your bond today.');
	                        }
	                    }
	                    evaluateJourneyProgress('daily-complete');
	                }
	            }
	        }

        // Track room visits for achievements
        function trackRoomVisit(roomId) {
            if (!gameState.roomsVisited) gameState.roomsVisited = {};
            gameState.roomsVisited[roomId] = true;
            ensureRoomHistoryState();
            if (gameState.roomHistory[roomId]) {
                gameState.roomHistory[roomId].sessions = (gameState.roomHistory[roomId].sessions || 0) + 1;
                gameState.roomHistory[roomId].lastVisitedAt = Date.now();
            }
            updateCaretakerIdentityProfile();
        }

        // Track weather for achievements
        function trackWeather() {
            if (!gameState.weatherSeen) gameState.weatherSeen = {};
            gameState.weatherSeen[gameState.weather] = true;
        }

        // ==================== POST-CAP MASTERY ====================

        function getCompetitionSeasonTitle(rank) {
            if (rank >= 10) return 'Mythic League';
            if (rank >= 7) return 'Diamond Circuit';
            if (rank >= 5) return 'Gold Circuit';
            if (rank >= 3) return 'Silver Circuit';
            return 'Bronze Circuit';
        }

        function getBiomeRankTitle(rank) {
            if (rank >= 10) return 'Biome Sovereign';
            if (rank >= 7) return 'Master Ranger';
            if (rank >= 5) return 'Senior Scout';
            if (rank >= 3) return 'Trail Keeper';
            return 'Field Explorer';
        }

        function getLegacyTitle(tier) {
            if (tier >= 8) return 'Eternal Lineage';
            if (tier >= 6) return 'Heritage Dynasty';
            if (tier >= 4) return 'Ancestral House';
            if (tier >= 2) return 'Growing Legacy';
            return 'Founding Family';
        }

        function refreshMasteryTracks() {
            const mastery = ensureMasteryState();
            const comp = normalizeCompetitionState(gameState.competition);
            const compPoints = (comp.battlesWon || 0) + ((comp.showsEntered || 0) * 2) + ((comp.obstacleCompletions || 0) * 2) + ((comp.rivalsDefeated || []).length * 4);
            mastery.competitionSeason.points = compPoints;
            mastery.competitionSeason.rank = Math.max(1, Math.floor(compPoints / 12) + 1);
            mastery.competitionSeason.title = getCompetitionSeasonTitle(mastery.competitionSeason.rank);

            const history = (((gameState.exploration || {}).expeditionHistory) || []);
            const biomeCounts = {};
            history.forEach((entry) => {
                if (!entry || !entry.biomeId) return;
                biomeCounts[entry.biomeId] = (biomeCounts[entry.biomeId] || 0) + 1;
            });
            Object.entries(biomeCounts).forEach(([biomeId, count]) => {
                const rank = Math.max(1, Math.floor(count / 3) + 1);
                mastery.biomeRanks[biomeId] = {
                    points: count,
                    rank,
                    title: getBiomeRankTitle(rank)
                };
            });

            const legacyPoints = ((gameState.memorials || []).length * 8) + ((gameState.eldersRaised || 0) * 5) + ((gameState.totalBreedingHatches || 0) * 2);
            mastery.familyLegacy.points = legacyPoints;
            mastery.familyLegacy.tier = Math.max(1, Math.floor(legacyPoints / 20) + 1);
            mastery.familyLegacy.title = getLegacyTitle(mastery.familyLegacy.tier);
            return mastery;
        }

        // ==================== MASTERY RANK PERKS (Recommendation #7) ====================

        // Competition rank 3+: +2% battle happiness gain
        function getMasteryBattleHappinessBonus() {
            const mastery = ensureMasteryState();
            if (mastery.competitionSeason && mastery.competitionSeason.rank >= 3) return 0.02;
            return 0;
        }

        // Biome rank 3+: +5% loot sell price for that biome
        function getMasteryLootSellBonus(biomeId) {
            const mastery = ensureMasteryState();
            if (biomeId && mastery.biomeRanks && mastery.biomeRanks[biomeId] && mastery.biomeRanks[biomeId].rank >= 3) return 0.05;
            return 0;
        }

        // Family Legacy rank 2+: +1 base coin on daily completion
        function getMasteryDailyBonus() {
            const mastery = ensureMasteryState();
            if (mastery.familyLegacy && mastery.familyLegacy.tier >= 2) return 1;
            return 0;
        }

        // ==================== GOAL LADDER ====================

	        function getGoalLadder() {
	            const cl = initDailyChecklist();
	            const arc = initWeeklyArc();
	            const mastery = refreshMasteryTracks();
	            const journey = getJourneyStatus();
	            const nowTask = (cl.tasks || []).find((task) => !task.done) || null;
            const nowProgress = nowTask ? `${Math.min(cl.progress[nowTask.trackKey] || 0, nowTask.target)}/${nowTask.target}` : 'Done';
            const modeTasks = (cl.tasks || []).filter((task) => task.lane === 'mode');
            const pendingMode = modeTasks.find((task) => !task.done);
            const nextTask = pendingMode || nowTask;
            const nextProgress = nextTask ? `${Math.min(cl.progress[nextTask.trackKey] || 0, nextTask.target)}/${nextTask.target}` : 'Done';
	            const longTerm = journey && journey.chapter
	                ? `🧭 ${journey.chapter.label}: ${journey.chapterCompleted}/${journey.chapterTotal}`
	                : (arc && !arc.completed
	                    ? `${arc.icon || '🏅'} ${arc.theme}: ${((arc.tasks || []).filter((t) => t.done).length)}/${(arc.tasks || []).length}`
	                    : `🏛️ Legacy Tier ${mastery.familyLegacy.tier}: ${mastery.familyLegacy.title}`);

            gameState.goalLadder = {
                generatedAt: Date.now(),
                now: nowTask ? { label: nowTask.name, progress: nowProgress, window: '5 min' } : { label: 'Claim your streak bonus', progress: 'Ready', window: '5 min' },
                next: nextTask ? { label: nextTask.name, progress: nextProgress, window: '20 min' } : { label: 'Run one expedition', progress: '0/1', window: '20 min' },
                longTerm: { label: longTerm, progress: '', window: 'Milestone' }
            };
            return gameState.goalLadder;
        }

        // ==================== MEMORY HOOKS ====================

        function runLoginMemoryHooks() {
            if (!gameState.pet) return;
            const pet = gameState.pet;
            const today = getTodayString();
            const monthDay = today.slice(5);
            if (!gameState.memoryHooks || typeof gameState.memoryHooks !== 'object') gameState.memoryHooks = {};
            if (!gameState.memoryHooks.anniversaries || typeof gameState.memoryHooks.anniversaries !== 'object') gameState.memoryHooks.anniversaries = {};

            if (pet.birthdate) {
                const b = new Date(pet.birthdate);
                const petMonthDay = `${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')}`;
                const key = `${pet.id}:${today}`;
                if (petMonthDay === monthDay && !gameState.memoryHooks.anniversaries[key]) {
                    const ageDays = Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000));
                    addJournalEntry('🎂', `${pet.name || 'Pet'} anniversary day! ${ageDays} days together.`);
                    gameState.memoryHooks.anniversaries[key] = true;
                }
            }

            const journal = Array.isArray(gameState.journal) ? gameState.journal : [];
            if (journal.length > 4) {
                const callback = journal[Math.max(0, journal.length - 1 - (hashDailySeed(today) % Math.min(10, journal.length)))];
                if (callback && callback.text) {
                    gameState.goalLadderMemory = `Remember: ${callback.text}`;
                }
            }
        }

        // ==================== LOCAL REMINDERS ====================

        function requestLocalReminderPermission() {
            ensureReminderState();
            if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
            if (Notification.permission === 'granted') {
                gameState.reminders.permission = 'granted';
                return Promise.resolve('granted');
            }
            return Notification.requestPermission().then((permission) => {
                gameState.reminders.permission = permission;
                saveGame();
                return permission;
            }).catch(() => 'denied');
        }

	        function maybeSendLocalReminder(key, title, body) {
	            const reminders = ensureReminderState();
	            if (!reminders.enabled) return false;
	            const today = getTodayString();
	            if (reminders.lastSent && reminders.lastSent[key] === today) return false;
	            reminders.lastSent[key] = today;
	            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
	                try { new Notification(title, { body, icon: 'icon-192.png' }); } catch (e) {}
	            } else if (typeof showToast === 'function') {
	                showToast(`${title} ${body}`, '#FFA726');
	            }
	            return true;
	        }

	        function queueReminderSignal(key, title, body, action) {
	            addReminderCenterItem(key, title, body, action || null);
	            maybeSendLocalReminder(key, title, body);
	        }

	        function checkReminderSignals() {
	            const streak = gameState.streak || {};
	            const lastPlay = streak.lastPlayDate;
	            const today = getTodayString();
	            const now = new Date();
	            const riskHour = (typeof REMINDER_CENTER_CONFIG !== 'undefined' && Number.isFinite(REMINDER_CENTER_CONFIG.streakRiskHourLocal))
	                ? Math.max(0, Math.min(23, Math.floor(REMINDER_CENTER_CONFIG.streakRiskHourLocal)))
	                : 20;
	            if ((streak.current || 0) > 0 && lastPlay && lastPlay !== today && now.getHours() >= riskHour) {
	                queueReminderSignal('streakRisk', '🔥 Streak at risk', 'Today is your last chance to protect your streak.', { type: 'streak' });
	            }
	            const expedition = ((gameState.exploration || {}).expedition) || null;
	            if (expedition && Date.now() >= (expedition.endAt || 0)) {
	                queueReminderSignal('expeditionReady', '🧭 Expedition complete', 'Collect your expedition rewards.', { type: 'explore' });
	            }
	            const hatched = Array.isArray(gameState.hatchedBreedingEggs) ? gameState.hatchedBreedingEggs.length : 0;
	            if (hatched > 0) {
	                queueReminderSignal('hatchReady', '🥚 Egg hatch ready', 'A new family member is ready to hatch.', { type: 'breeding' });
	            }
	            if (typeof getReadyCropCount === 'function' && getReadyCropCount() > 0) {
	                queueReminderSignal('harvestReady', '🌾 Harvest ready', 'Crops or honey are ready to collect.', { type: 'garden' });
	            }
	        }

        function startReminderMonitor() {
            if (localReminderInterval) clearInterval(localReminderInterval);
            localReminderInterval = setInterval(() => {
                try { checkReminderSignals(); } catch (e) {}
            }, 60 * 1000);
        }

	        // ==================== BADGES ====================

	        function checkBadges() {
	            if (!gameState.badges) gameState.badges = {};
	            const newUnlocks = [];
	            for (const [id, badge] of Object.entries(BADGES)) {
	                if (gameState.badges[id]) continue;
	                try {
	                    if (badge.check(gameState)) {
	                        gameState.badges[id] = { unlocked: true, unlockedAt: Date.now() };
	                        newUnlocks.push(badge);
	                    }
	                } catch (e) { /* safe guard */ }
	            }
	            if (newUnlocks.length > 0) {
	                evaluateJourneyProgress('badges');
	                recordRetentionActivity('collection');
	            }
	            return newUnlocks;
	        }

        function getBadgeCount() {
            if (!gameState.badges) return 0;
            return Object.values(gameState.badges).filter(b => b.unlocked).length;
        }

        // ==================== STICKER COLLECTION ====================

        function grantSticker(stickerId) {
            if (!gameState.stickers) gameState.stickers = {};
            if (gameState.stickers[stickerId]) return false; // Already collected
            if (!STICKERS[stickerId]) return false; // Invalid sticker
            gameState.stickers[stickerId] = { collected: true, collectedAt: Date.now() };
            // Recommendation #9: Check for sticker set completion after each grant
            const setRewards = checkStickerSetCompletions();
            if (setRewards.length > 0 && typeof showToast === 'function') {
                setRewards.forEach(r => {
                    const catLabel = (STICKER_CATEGORIES[r.category] || {}).label || r.category;
                    const coins = r.earnedCoins || 0;
                    showToast(`📓 ${catLabel} set complete! +${coins} coins`, '#E040FB');
                });
            }
            return true;
        }

        function getStickerCount() {
            if (!gameState.stickers) return 0;
            return Object.values(gameState.stickers).filter(s => s.collected).length;
        }

        // Recommendation #9: Sticker set completion bonuses
        // When all stickers in a category are collected, grant a one-time bundle
        function checkStickerSetCompletions() {
            if (!gameState.stickers) return [];
            if (!gameState._claimedStickerSets) gameState._claimedStickerSets = {};
            const collected = gameState.stickers;
            const rewards = [];
            const setBundles = {
                animals: 'stickerSetAnimals',
                nature: 'stickerSetNature',
                fun: 'stickerSetFun',
                special: 'stickerSetSpecial'
            };
            for (const [catKey, bundleId] of Object.entries(setBundles)) {
                if (gameState._claimedStickerSets[catKey]) continue;
                const stickersInCategory = Object.entries(STICKERS).filter(([, s]) => s.category === catKey);
                if (stickersInCategory.length === 0) continue;
                const allCollected = stickersInCategory.every(([id]) => collected[id] && collected[id].collected);
                if (allCollected) {
                    gameState._claimedStickerSets[catKey] = true;
                    const result = applyRewardBundle(bundleId, `${STICKER_CATEGORIES[catKey].icon} ${STICKER_CATEGORIES[catKey].label} Set Complete`);
                    if (result) rewards.push({ category: catKey, ...result });
                    if (typeof addJournalEntry === 'function') {
                        addJournalEntry(STICKER_CATEGORIES[catKey].icon, `Completed the ${STICKER_CATEGORIES[catKey].label} sticker set! Bonus reward unlocked.`);
                    }
                }
            }
            return rewards;
        }

	        function checkStickers() {
            if (!gameState.stickers) gameState.stickers = {};
            const newStickers = [];

            // Check condition-based stickers
            const gs = gameState;
            const pet = gs.pet;

            // Weather stickers
            const ws = gs.weatherSeen || {};
            if (ws.sunny && ws.rainy && ws.snowy && grantSticker('rainbowSticker')) {
                newStickers.push(STICKERS.rainbowSticker);
            }
            if (gs.weather === 'snowy' && grantSticker('snowflakeSticker')) {
                newStickers.push(STICKERS.snowflakeSticker);
            }

            // Season stickers
            if (gs.season === 'spring' && grantSticker('cherryBlossom')) {
                newStickers.push(STICKERS.cherryBlossom);
            }

            // Garden stickers
            if (gs.garden && gs.garden.totalHarvests >= 1 && grantSticker('sproutSticker')) {
                newStickers.push(STICKERS.sproutSticker);
            }
            if (gs.garden && gs.garden.inventory && gs.garden.inventory.sunflower > 0 && grantSticker('sunflowerSticker')) {
                newStickers.push(STICKERS.sunflowerSticker);
            }

            // Mini-game stickers
            const scores = gs.minigameHighScores || {};
            if (Object.values(scores).some(s => s >= 25) && grantSticker('starSticker')) {
                newStickers.push(STICKERS.starSticker);
            }
            if (Object.values(scores).some(s => s >= 50) && grantSticker('trophySticker')) {
                newStickers.push(STICKERS.trophySticker);
            }
            const counts = gs.minigamePlayCounts || {};
            if (counts.simonsays > 0 && grantSticker('musicSticker')) {
                newStickers.push(STICKERS.musicSticker);
            }
            if (counts.coloring > 0 && grantSticker('artSticker')) {
                newStickers.push(STICKERS.artSticker);
            }

            // Daily completion sticker
            if (gs.dailyChecklist && gs.dailyChecklist.tasks && gs.dailyChecklist.tasks.every(t => t.done) && grantSticker('partySticker')) {
                newStickers.push(STICKERS.partySticker);
            }

            // Special milestone stickers
            if (pet && pet.evolutionStage === 'evolved' && grantSticker('crownSticker')) {
                newStickers.push(STICKERS.crownSticker);
            }
            if (pet && pet.careQuality === 'excellent' && grantSticker('sparkleSticker')) {
                newStickers.push(STICKERS.sparkleSticker);
            }
            if ((gs.adultsRaised || 0) >= 2 && grantSticker('unicornSticker')) {
                newStickers.push(STICKERS.unicornSticker);
            }
            if ((gs.adultsRaised || 0) >= 3 && grantSticker('dragonSticker')) {
                newStickers.push(STICKERS.dragonSticker);
            }
            const rels = gs.relationships || {};
            if (Object.values(rels).some(r => r.points >= 180) && grantSticker('heartSticker')) {
                newStickers.push(STICKERS.heartSticker);
            }

            // Streak stickers
            if (gs.streak && gs.streak.current >= 7 && grantSticker('streakFlame')) {
                newStickers.push(STICKERS.streakFlame);
            }

            return newStickers;
        }

        // Recommendation #3: Sticker progress pips — expose partial progress toward existing stickers
        function getStickerProgress() {
            const gs = gameState;
            const progress = [];
            const owned = gs.stickers || {};

            // Mini-game score stickers
            const scores = gs.minigameHighScores || {};
            const bestScore = Math.max(0, ...Object.values(scores));
            if (!owned.starSticker) progress.push({ stickerId: 'starSticker', label: 'Gold Star', emoji: '⭐', current: Math.min(bestScore, 25), target: 25, unit: 'best score' });
            if (!owned.trophySticker) progress.push({ stickerId: 'trophySticker', label: 'Trophy', emoji: '🏆', current: Math.min(bestScore, 50), target: 50, unit: 'best score' });

            // Weather stickers
            const ws = gs.weatherSeen || {};
            const weatherCount = (ws.sunny ? 1 : 0) + (ws.rainy ? 1 : 0) + (ws.snowy ? 1 : 0);
            if (!owned.rainbowSticker) progress.push({ stickerId: 'rainbowSticker', label: 'Rainbow', emoji: '🌈', current: weatherCount, target: 3, unit: 'weather types seen' });

            // Garden stickers
            const harvests = (gs.garden && gs.garden.totalHarvests) || 0;
            if (!owned.sproutSticker) progress.push({ stickerId: 'sproutSticker', label: 'Little Sprout', emoji: '🌱', current: Math.min(harvests, 1), target: 1, unit: 'harvests' });

            // Streak sticker
            const streakDays = (gs.streak && gs.streak.current) || 0;
            if (!owned.streakFlame) progress.push({ stickerId: 'streakFlame', label: 'Eternal Flame', emoji: '🔥', current: Math.min(streakDays, 7), target: 7, unit: 'day streak' });

            // Relationship sticker
            const rels = gs.relationships || {};
            const bestRel = Math.max(0, ...Object.values(rels).map(r => r.points || 0));
            if (!owned.heartSticker) progress.push({ stickerId: 'heartSticker', label: 'Big Heart', emoji: '💖', current: Math.min(bestRel, 180), target: 180, unit: 'relationship points' });

            // Adults raised stickers
            const adults = gs.adultsRaised || 0;
            if (!owned.unicornSticker) progress.push({ stickerId: 'unicornSticker', label: 'Unicorn', emoji: '🦄', current: Math.min(adults, 2), target: 2, unit: 'adults raised' });
            if (!owned.dragonSticker) progress.push({ stickerId: 'dragonSticker', label: 'Dragon', emoji: '🐉', current: Math.min(adults, 3), target: 3, unit: 'adults raised' });

            // Breeding stickers
            const breeds = gs.totalBreedings || 0;
            if (!owned.breedingEgg) progress.push({ stickerId: 'breedingEgg', label: 'Love Egg', emoji: '🥚', current: Math.min(breeds, 1), target: 1, unit: 'breedings' });
            if (!owned.familyTree) progress.push({ stickerId: 'familyTree', label: 'Family Tree', emoji: '🌳', current: Math.min(breeds, 3), target: 3, unit: 'breedings' });

            // Memorial stickers
            const memCount = (gs.memorials || []).length;
            if (!owned.wisdomSticker) progress.push({ stickerId: 'wisdomSticker', label: 'Book of Wisdom', emoji: '📖', current: Math.min(memCount, 5), target: 5, unit: 'memorials' });

            return progress;
        }

        // Grant pet-type-specific stickers based on care actions
        function checkPetActionSticker(action) {
            const pet = gameState.pet;
            if (!pet) return [];
            const newStickers = [];
            const type = pet.type;

            const stickerMap = {
                dog: { action: 'feed', stickerId: 'happyPup' },
                cat: { action: 'cuddle', stickerId: 'sleepyKitty' },
                bunny: { action: 'play', stickerId: 'bouncyBunny' },
                turtle: { action: 'wash', stickerId: 'tinyTurtle' },
                fish: { action: 'feed', stickerId: 'goldenFish' },
                bird: { action: 'play', stickerId: 'sweetBird' },
                panda: { action: 'cuddle', stickerId: 'cuddlyPanda' },
                penguin: { action: 'exercise', stickerId: 'royalPenguin' },
                hamster: { action: 'feed', stickerId: 'fuzzyHamster' },
                frog: { action: 'play', stickerId: 'happyFrog' },
                hedgehog: { action: 'cuddle', stickerId: 'spinyHedgehog' },
                unicorn: { action: 'play', stickerId: 'magicUnicorn' },
                dragon: { action: 'feed', stickerId: 'fierceDragon' }
            };

	            const mapping = stickerMap[type];
	            if (mapping && mapping.action === action && STICKERS[mapping.stickerId]) {
	                if (grantSticker(mapping.stickerId)) {
	                    newStickers.push(STICKERS[mapping.stickerId]);
	                }
	            }
	            if (newStickers.length > 0) {
	                evaluateJourneyProgress('stickers');
	                recordRetentionActivity('collection');
	            }
	            return newStickers;
	        }

        // ==================== TROPHIES ====================

	        function checkTrophies() {
            if (!gameState.trophies) gameState.trophies = {};
            const newTrophies = [];
	            for (const [id, trophy] of Object.entries(TROPHIES)) {
                if (gameState.trophies[id]) continue;
                try {
                    if (trophy.check(gameState)) {
                        gameState.trophies[id] = { earned: true, earnedAt: Date.now() };
                        newTrophies.push(trophy);
                    }
	                } catch (e) { /* safe guard */ }
	            }
	            if (newTrophies.length > 0) {
	                evaluateJourneyProgress('trophies');
	                recordRetentionActivity('collection');
	            }
	            return newTrophies;
	        }

        function getTrophyCount() {
            if (!gameState.trophies) return 0;
            return Object.values(gameState.trophies).filter(t => t.earned).length;
        }

        // ==================== DAILY STREAKS ====================

        function getNextStreakMilestone(streakDays) {
            const safe = Math.max(0, Math.floor(Number(streakDays) || 0));
            const milestones = Array.isArray(STREAK_MILESTONES) ? STREAK_MILESTONES : [];
            return milestones.find((milestone) => milestone && safe < (milestone.days || 0)) || null;
        }

        function getStreakProtectionStatus() {
            const streak = gameState.streak || { current: 0, longest: 0 };
            const meta = ensureRetentionMetaState();
            const protection = meta.streakProtection || {};
            const current = Math.max(0, Math.floor(streak.current || 0));
            const nextMilestone = getNextStreakMilestone(current);
            const lastCheckpoint = getLastReachedCheckpoint(current);
            const checkpointFloor = getStreakCheckpointFloor(current);
            return {
                current,
                longest: Math.max(current, Math.floor(streak.longest || 0)),
                freezeTokens: Math.max(0, Math.floor(protection.freezeTokens || 0)),
                autoUseFreeze: protection.autoUseFreeze !== false,
                checkpoint: lastCheckpoint,
                checkpointFloor,
                nextMilestone: nextMilestone ? { days: nextMilestone.days, label: nextMilestone.label } : null,
                daysToMilestone: nextMilestone ? Math.max(0, nextMilestone.days - current) : 0,
                lastOutcome: protection.lastOutcome || '',
                lastMissedDays: Math.max(0, Math.floor(protection.lastMissedDays || 0)),
                lastFreezeUsed: Math.max(0, Math.floor(protection.lastFreezeUsed || 0))
            };
        }

        function setStreakFreezeAutoUse(enabled) {
            const meta = ensureRetentionMetaState();
            const next = !!enabled;
            meta.streakProtection.autoUseFreeze = next;
            saveGame();
            return next;
        }

        function buyStreakFreezeToken(quantity) {
            const qty = Math.max(1, Math.floor(Number(quantity) || 1));
            const unitCost = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.streakFreezeTokenCost))
                ? Math.max(1, Math.floor(ECONOMY_BALANCE.streakFreezeTokenCost))
                : 120;
            const totalCost = unitCost * qty;
            const spend = spendCoins(totalCost, 'Streak Freeze', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: totalCost, balance: spend.balance };
            const granted = addStreakFreezeTokens(qty, 'Shop purchase');
            saveGame();
            return { ok: true, quantity: granted, cost: totalCost, balance: getCoinBalance(), freezeTokens: getStreakProtectionStatus().freezeTokens };
        }

        function updateStreak() {
            if (!gameState.streak) {
                gameState.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
            }
            const streak = gameState.streak;
            const meta = ensureRetentionMetaState();
            const protection = meta.streakProtection;
            if (!streak.prestige || typeof streak.prestige !== 'object') {
                streak.prestige = { cycleMonth: '', cycleBest: 0, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
            }
            const today = getTodayString();
            const monthKey = getCurrentMonthKey();

            // Monthly prestige celebration after day 30: rewards rotate monthly with no streak wipe.
            if (streak.prestige.cycleMonth && streak.prestige.cycleMonth !== monthKey && (streak.current || 0) >= 30) {
                streak.prestige.completedCycles = (streak.prestige.completedCycles || 0) + 1;
                streak.prestige.lifetimeTier = Math.max(streak.prestige.lifetimeTier || 0, Math.floor((streak.prestige.completedCycles || 0) / 2));
                streak.prestige.claimedMonthlyReward = '';
                protection.lastOutcome = 'Monthly prestige celebration is ready. Your streak progress stayed intact.';
            }
            if (!streak.prestige.cycleMonth) streak.prestige.cycleMonth = monthKey;
            if (streak.prestige.cycleMonth !== monthKey) streak.prestige.cycleMonth = monthKey;

            if (streak.lastPlayDate === today) {
                // Already updated today
                protection.lastProcessedDate = today;
                return getStreakProtectionStatus();
            }

            let outcome = '';
            let missedDays = 0;
            let freezeUsed = 0;
            let checkpointFloor = getStreakCheckpointFloor(streak.current || 0);

            if (streak.lastPlayDate === null) {
                streak.current = 1;
                outcome = 'Welcome in. Your first streak day is active.';
            } else {
                const elapsedDays = getCalendarDayDiff(streak.lastPlayDate, today);
                if (elapsedDays <= 1) {
                    streak.current = Math.max(1, (streak.current || 0) + 1);
                    outcome = 'Streak continued. Nice consistency.';
                } else {
                    missedDays = Math.max(1, elapsedDays - 1);
                    let remainingMissed = missedDays;
                    if (protection.autoUseFreeze && protection.freezeTokens > 0) {
                        freezeUsed = Math.min(remainingMissed, Math.floor(protection.freezeTokens));
                        protection.freezeTokens = Math.max(0, Math.floor(protection.freezeTokens) - freezeUsed);
                        remainingMissed -= freezeUsed;
                    }
                    if (remainingMissed <= 0) {
                        streak.current = Math.max(1, (streak.current || 0) + 1);
                        outcome = `Streak protected with ${freezeUsed} freeze token${freezeUsed === 1 ? '' : 's'} — you kept your momentum.`;
                    } else {
                        const cfg = (typeof STREAK_PROTECTION_CONFIG !== 'undefined' && STREAK_PROTECTION_CONFIG) ? STREAK_PROTECTION_CONFIG : {};
                        const decayPerDay = Number.isFinite(cfg.softDecayPerMissedDay) ? Math.max(1, Math.floor(cfg.softDecayPerMissedDay)) : 2;
                        const maxDecay = Number.isFinite(cfg.maxSoftDecayPerLogin) ? Math.max(decayPerDay, Math.floor(cfg.maxSoftDecayPerLogin)) : decayPerDay * 4;
                        const softDecay = Math.min(maxDecay, decayPerDay * remainingMissed);
                        checkpointFloor = getStreakCheckpointFloor(streak.current || 0);
                        streak.current = Math.max(checkpointFloor, Math.max(1, (streak.current || 0) - softDecay));
                        if (freezeUsed > 0) {
                            outcome = `Used ${freezeUsed} freeze token${freezeUsed === 1 ? '' : 's'}. Soft decay applied, but your checkpoint protected most progress.`;
                        } else {
                            outcome = 'Soft decay applied after missed days. Your checkpoint kept your streak alive.';
                        }
                    }
                }
            }

            streak.lastPlayDate = today;
            streak.todayBonusClaimed = false;
            if (streak.current > streak.longest) {
                streak.longest = streak.current;
            }
            streak.prestige.cycleBest = Math.max(streak.prestige.cycleBest || 0, streak.current || 0);
            protection.lastOutcome = outcome;
            protection.lastMissedDays = missedDays;
            protection.lastFreezeUsed = freezeUsed;
            protection.lastCheckpointFloor = checkpointFloor;
            protection.lastProcessedDate = today;
            retentionDebugLog('Streak updated', {
                current: streak.current,
                missedDays,
                freezeUsed,
                checkpointFloor,
                freezeTokens: protection.freezeTokens,
                outcome
            });
            return getStreakProtectionStatus();
        }

        function claimStreakBonus() {
            const streak = gameState.streak;
            if (!streak || streak.todayBonusClaimed) return null;
            const meta = ensureRetentionMetaState();
            const protection = meta.streakProtection;

            const bonus = getStreakBonus(streak.current);
            if (bonus.happiness === 0 && bonus.energy === 0) return null;

            const pet = gameState.pet;
            if (pet) {
                pet.happiness = clamp(pet.happiness + bonus.happiness, 0, 100);
                pet.energy = clamp(pet.energy + bonus.energy, 0, 100);
            }

	            streak.todayBonusClaimed = true;
	            addBondXp(2, 'Streak bonus');
	            addJourneyTokens(1, 'Streak claim');

            // Check for unclaimed milestone rewards
            const unclaimedMilestones = [];
            if (!Array.isArray(streak.claimedMilestones)) streak.claimedMilestones = [];
            let hitMilestoneToday = false;
            let freezeTokensAwarded = 0;
            for (const milestone of STREAK_MILESTONES) {
                if (streak.current >= milestone.days && !streak.claimedMilestones.includes(milestone.days)) {
                    streak.claimedMilestones.push(milestone.days);
                    const bundle = milestone.bundleId ? applyRewardBundle(milestone.bundleId, `Streak ${milestone.days}`) : null;
                    const freezeGranted = addStreakFreezeTokens(milestone.freezeTokens || 0, milestone.label || `Day ${milestone.days}`);
                    freezeTokensAwarded += freezeGranted;
                    unclaimedMilestones.push({
                        ...milestone,
                        bundle,
                        freezeGranted
                    });
                    hitMilestoneToday = true;
                }
            }

            // Recommendation #4: Streak gap coin drip
            // Between major milestones (dead zones), grant streakDays × 2 coins daily as a fallback
            let streakDripCoins = 0;
            if (!hitMilestoneToday && streak.current > 1) {
                streakDripCoins = streak.current * 2;
                addCoins(streakDripCoins, 'Streak Drip', true);
            }

            let prestigeReward = null;
            if (streak.current >= 30) {
                if (!streak.prestige || typeof streak.prestige !== 'object') {
                    streak.prestige = { cycleMonth: getCurrentMonthKey(), cycleBest: streak.current, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
                }
                const monthKey = getCurrentMonthKey();
                const rewards = Array.isArray(STREAK_PRESTIGE_REWARDS) ? STREAK_PRESTIGE_REWARDS : [];
                if (rewards.length > 0 && streak.prestige.claimedMonthlyReward !== monthKey) {
                    const idx = hashDailySeed(`prestige:${monthKey}`) % rewards.length;
                    prestigeReward = rewards[idx];
                    // Optional monthly celebration reward with streak-safe progression.
                    const prestigeBaseCoins = prestigeReward.coins || 280;
                    const prestigeEscalation = Math.min(400, prestigeBaseCoins + ((streak.prestige.completedCycles || 0) * 20));
                    if (prestigeEscalation > 0) addCoins(prestigeEscalation, `${prestigeReward.icon} Prestige`, true);
                    if (prestigeReward.modifierId) addGameplayModifier(prestigeReward.modifierId, `${prestigeReward.icon} Prestige`);
                    if (prestigeReward.collectible) grantBundleCollectible(prestigeReward.collectible);
                    streak.prestige.claimedMonthlyReward = monthKey;
                    if (typeof addJournalEntry === 'function') {
                        addJournalEntry('🌠', `Prestige celebration claimed: ${prestigeReward.icon} ${prestigeReward.label}.`);
                    }
                }
            }
	            if (freezeTokensAwarded > 0) {
	                protection.lastOutcome = `Earned ${freezeTokensAwarded} Streak Freeze token${freezeTokensAwarded === 1 ? '' : 's'} from milestones.`;
	            }
	            evaluateJourneyProgress('streak-claim');

	            saveGame();
            return {
                bonus,
                milestones: unclaimedMilestones,
                prestigeReward,
                streakDripCoins: streakDripCoins || 0,
                freezeTokensAwarded,
                freezeTokens: Math.max(0, Math.floor(protection.freezeTokens || 0)),
                status: getStreakProtectionStatus()
            };
        }

        // ==================== PET MEMORIAL SYSTEM ====================

        function retirePet(petIndex) {
            if (!gameState.pets || petIndex < 0 || petIndex >= gameState.pets.length) return null;
            const pet = gameState.pets[petIndex];
            if (!pet) return null;

            // Check minimum requirements
            const ageInHours = getPetAge(pet);
            const allowedStages = Array.isArray(MEMORIAL_CONFIG.retirementAllowedStages) && MEMORIAL_CONFIG.retirementAllowedStages.length
                ? MEMORIAL_CONFIG.retirementAllowedStages
                : ['adult', 'elder'];
            if (!allowedStages.includes(pet.growthStage)) {
                return { success: false, reason: `Pet must be ${allowedStages.join(' or ')} stage to retire` };
            }
            if (ageInHours < MEMORIAL_CONFIG.retirementMinAge) {
                return { success: false, reason: `Pet must be at least ${MEMORIAL_CONFIG.retirementMinAge} hours old to retire` };
            }

            // Can't retire if it's the only pet
            if (gameState.pets.length <= 1) {
                return { success: false, reason: 'You need at least one pet! Adopt another before retiring this one.' };
            }

            // Create memorial entry
            const memorial = createMemorial(pet);

            // Add to memorials
            if (!gameState.memorials) gameState.memorials = [];
            gameState.memorials.push(memorial);
            if (gameState.memorials.length > MEMORIAL_CONFIG.maxMemorials) {
                gameState.memorials = gameState.memorials.slice(-MEMORIAL_CONFIG.maxMemorials);
            }

            // Remove pet from family
            const previousActiveIndex = gameState.activePetIndex;
            gameState.pets.splice(petIndex, 1);
            // Adjust active pet index exactly once after removal.
            if (gameState.pets.length === 0) {
                gameState.activePetIndex = 0;
            } else if (previousActiveIndex === petIndex) {
                gameState.activePetIndex = Math.min(petIndex, gameState.pets.length - 1);
            } else if (petIndex < previousActiveIndex) {
                gameState.activePetIndex = previousActiveIndex - 1;
            } else {
                gameState.activePetIndex = Math.min(previousActiveIndex, gameState.pets.length - 1);
            }
            gameState.pet = gameState.pets[gameState.activePetIndex] || null;

            // Remove relationships involving this pet
            if (gameState.relationships) {
                const keysToRemove = Object.keys(gameState.relationships).filter(k => {
                    const parts = k.split('-');
                    return parts.includes(String(pet.id));
                });
                keysToRemove.forEach(k => delete gameState.relationships[k]);
            }

            addJournalEntry('🌅', `${pet.name || 'Pet'} retired to the Hall of Fame. ${getMemorialTitle(pet)}`);
            refreshMasteryTracks();
            saveGame();

            announce(`${pet.name || 'Pet'} has been retired to the Hall of Fame. Thank you for the memories!`, true);

            return { success: true, memorial: memorial };
        }

        function createMemorial(pet) {
            const petData = getAllPetTypeData(pet.type);
            return {
                id: pet.id,
                name: pet.name || (petData ? petData.name : 'Pet'),
                type: pet.type,
                color: pet.color,
                pattern: pet.pattern,
                personality: pet.personality || 'playful',
                growthStage: pet.growthStage,
                evolutionStage: pet.evolutionStage,
                careQuality: pet.careQuality,
                careActions: pet.careActions,
                birthdate: pet.birthdate,
                retiredAt: Date.now(),
                ageHours: Math.round(getPetAge(pet)),
                title: getMemorialTitle(pet),
                accessories: pet.accessories ? [...pet.accessories] : [],
                isHybrid: !!pet.isHybrid,
                hasMutation: !!pet.hasMutation,
                farewellMessage: pet._farewellMessage || ''
            };
        }

        function getMemorials() {
            return gameState.memorials || [];
        }

        // ==================== PERSONALITY HELPERS ====================

        // Get personality-adjusted care modifier for an action
        function getPersonalityCareModifier(pet, action) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            if (!trait || !trait.careModifiers) return 1.0;
            return trait.careModifiers[action] || 1.0;
        }

        // Get elder wisdom bonus for stat gains
        function getElderWisdomBonus(pet) {
            if (!pet || pet.growthStage !== 'elder') return 0;
            return ELDER_CONFIG.wisdomBonusBase;
        }

        // Apply personality modifier to relationship gain for shy pets
        function getPersonalityRelationshipModifier(pet) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            return trait ? trait.relationshipModifier : 1.0;
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
                        applyDiaryVoice(todayEntry);
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

        function saveGame() {
            try {
                ensureExplorationState();
                ensureEconomyState();
                ensureMiniGameExpansionState();
                ensureGardenSystemsState();
                ensureRetentionMetaState();
                checkAndRecordTimeJump(gameState, 'save');
                // Sync active pet to pets array before saving
                syncActivePetToArray();
                gameState.lastUpdate = Date.now();
                gameState.saveVersion = SAVE_SCHEMA_VERSION;
                writeSaveIntegrity(gameState);
                // Strip transient data that shouldn't persist
                const offlineChanges = gameState._offlineChanges;
                const hadOfflineChanges = Object.prototype.hasOwnProperty.call(gameState, '_offlineChanges');
                if (hadOfflineChanges) delete gameState._offlineChanges;
                try {
                    const serialized = JSON.stringify(gameState);
                    localStorage.setItem(STORAGE_KEYS.gameSave, serialized);
                    _lastSavedStorageSnapshot = serialized;
                } finally {
                    if (hadOfflineChanges) gameState._offlineChanges = offlineChanges;
                }
                // Show save indicator (Item 22)
                showSaveIndicator();
            } catch (e) {
                console.log('Could not save game:', e);
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    showToast('Storage full! Progress may not be saved.', '#EF5350');
                    announce('Warning: Storage full. Your progress may not be saved.', true);
                    showSaveIndicator(true);
                }
            }
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

        function migrateSaveSchema(parsed) {
            if (!parsed || typeof parsed !== 'object') return { migrated: false, from: 0, to: SAVE_SCHEMA_VERSION };
            const fromVersion = Math.max(1, Math.floor(Number(parsed.saveVersion) || 1));
            let migrated = false;

            if (!Number.isFinite(parsed.saveVersion)) {
                parsed.saveVersion = fromVersion;
                migrated = true;
            }

            ensureExplorationState(parsed);
            ensureEconomyState(parsed);
            ensureSecurityState(parsed);
            ensureTimeHardeningState(parsed);

            // v3: provenance-aware loot stacks + economy hardening state + competition reward control state.
            if (fromVersion < 3) {
                ensureLootInventoryStacks(parsed.exploration);
                parsed.competition = normalizeCompetitionState(parsed.competition);
                parsed.saveVersion = 3;
                migrated = true;
            }

            parsed.saveVersion = SAVE_SCHEMA_VERSION;
            return { migrated, from: fromVersion, to: SAVE_SCHEMA_VERSION };
        }

        function markSuspiciousSaveState(reason) {
            const sec = ensureSecurityState();
            sec.suspicious = true;
            if (typeof reason === 'string' && reason) sec.suspiciousReason = reason;
            showHardeningToast('suspicious', 'Save integrity warning: some features are limited to protect balance.', '#EF5350');
        }

        function loadGame() {
            let _needsSaveAfterLoad = false;
            let _integrityCheck = null;
            try {
                const saved = localStorage.getItem(STORAGE_KEYS.gameSave);
                if (saved) {
                    const parsed = JSON.parse(saved);

                    // Validate saved data structure
                    if (!parsed || typeof parsed !== 'object') {
                        return null;
                    }

                    if (!Number.isFinite(parsed.saveVersion)) parsed.saveVersion = 1;
                    ensureSecurityState(parsed);
                    ensureTimeHardeningState(parsed);
                    _integrityCheck = verifyLoadedSaveIntegrity(parsed);

                    // Handle stuck 'hatching' phase - reset to egg
                    if (parsed.phase === 'hatching') {
                        parsed.phase = 'egg';
                        parsed.eggTaps = 0;
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
                            const rule = room.unlockRule || { type: 'default' };
                            if (rule.type === 'default') {
                                parsed.roomUnlocks[roomId] = true;
                            } else if (rule.type === 'careActions') {
                                const care = Array.isArray(parsed.pets) && parsed.pets.length > 0
                                    ? Math.max(...parsed.pets.map((p) => (p && Number.isFinite(p.careActions)) ? p.careActions : 0))
                                    : (parsed.pet && Number.isFinite(parsed.pet.careActions) ? parsed.pet.careActions : 0);
                                const visited = !!(parsed.roomsVisited && parsed.roomsVisited[roomId]);
                                parsed.roomUnlocks[roomId] = visited || care >= (Number(rule.count) || 0);
                            } else if (rule.type === 'adultsRaised') {
                                const adults = Number(parsed.adultsRaised || 0);
                                const visited = !!(parsed.roomsVisited && parsed.roomsVisited[roomId]);
                                parsed.roomUnlocks[roomId] = visited || adults >= (Number(rule.count) || 0);
                            } else {
                                parsed.roomUnlocks[roomId] = false;
                            }
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

                    // Add garden if missing (for existing saves)
                    if (!parsed.garden || typeof parsed.garden !== 'object') {
                        parsed.garden = createDefaultGardenState(Date.now());
                    }
                    const parsedGarden = ensureGardenSystemsState(parsed);
                    if (typeof parsedGarden.totalHarvests !== 'number') {
                        // Infer minimum harvests from existing state to keep used plots unlocked
                        let inferredHarvests = 0;
                        const invTotal = Object.values(parsedGarden.inventory || {}).reduce((s, c) => s + c, 0);
                        const highestUsedPlot = parsedGarden.plots.reduce((max, p, i) => p ? i : max, -1);
                        if (highestUsedPlot >= 0 || invTotal > 0) {
                            // Ensure enough harvests to unlock all plots that have crops
                            for (let pi = 0; pi <= highestUsedPlot && pi < GARDEN_PLOT_UNLOCK_THRESHOLDS.length; pi++) {
                                inferredHarvests = Math.max(inferredHarvests, GARDEN_PLOT_UNLOCK_THRESHOLDS[pi]);
                            }
                            inferredHarvests = Math.max(inferredHarvests, invTotal);
                        }
                        parsedGarden.totalHarvests = inferredHarvests;
                    }
                    parsedGarden.plots = parsedGarden.plots.map((plot) => {
                        if (!plot || typeof plot !== 'object' || !plot.cropId) return null;
                        const normalized = Object.assign({}, plot);
                        if (!Number.isFinite(normalized.plantedAt)) normalized.plantedAt = Date.now();
                        if (!Number.isFinite(normalized.lastUpdatedAt)) normalized.lastUpdatedAt = parsedGarden.lastGrowTick || normalized.plantedAt || Date.now();
                        if (!Number.isFinite(normalized.growthProgressMs)) {
                            const growTicks = Number.isFinite(normalized.growTicks) ? normalized.growTicks : 0;
                            normalized.growthProgressMs = Math.max(0, growTicks * 60000);
                        }
                        if (!Number.isFinite(normalized.stage)) normalized.stage = 0;
                        if (normalized.watered === true && !Number.isFinite(normalized.wateredUntil)) {
                            normalized.wateredUntil = Date.now() + ((GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.wateredDurationMs) || (2 * 60 * 60 * 1000));
                        }
                        if (!Number.isFinite(normalized.wateredUntil)) normalized.wateredUntil = 0;
                        if (!Number.isFinite(normalized.fertilizerCharges)) normalized.fertilizerCharges = 0;
                        if (!Number.isFinite(normalized.pestUntil)) normalized.pestUntil = 0;
                        const cropDef = GARDEN_CROPS[normalized.cropId];
                        if (cropDef && cropDef.plantType === 'fruitTree') {
                            if (!Number.isFinite(normalized.nextHarvestAt)) normalized.nextHarvestAt = Date.now();
                            normalized.harvestReady = Date.now() >= normalized.nextHarvestAt;
                        }
                        delete normalized.growTicks;
                        delete normalized.watered;
                        return normalized;
                    });
                    parsedGarden.flowerGarden.plots = parsedGarden.flowerGarden.plots.map((plot) => {
                        if (!plot || typeof plot !== 'object') return null;
                        const out = Object.assign({}, plot);
                        if (!Number.isFinite(out.plantedAt)) out.plantedAt = Date.now();
                        if (!Number.isFinite(out.lastUpdatedAt)) out.lastUpdatedAt = out.plantedAt;
                        if (!Number.isFinite(out.growthProgressMs)) out.growthProgressMs = 0;
                        if (!Number.isFinite(out.stage)) out.stage = 0;
                        return out;
                    });
                    parsedGarden.mushroomCave.plots = parsedGarden.mushroomCave.plots.map((plot) => {
                        if (!plot || typeof plot !== 'object') return null;
                        const out = Object.assign({}, plot);
                        if (!Number.isFinite(out.plantedAt)) out.plantedAt = Date.now();
                        if (!Number.isFinite(out.lastUpdatedAt)) out.lastUpdatedAt = out.plantedAt;
                        if (!Number.isFinite(out.growthProgressMs)) out.growthProgressMs = 0;
                        if (!Number.isFinite(out.stage)) out.stage = 0;
                        if (!Number.isFinite(out.fertilizerCharges)) out.fertilizerCharges = 0;
                        return out;
                    });
                    if (!parsedGarden.discoveredSeeds || typeof parsedGarden.discoveredSeeds !== 'object') {
                        parsedGarden.discoveredSeeds = {};
                    }
                    Object.entries(GARDEN_CROPS).forEach(([cropId, crop]) => {
                        if (!crop || crop.defaultUnlocked === false) return;
                        if (typeof parsedGarden.discoveredSeeds[cropId] !== 'boolean') parsedGarden.discoveredSeeds[cropId] = true;
                    });
                    if (!parsedGarden.crossbreeding || typeof parsedGarden.crossbreeding !== 'object') {
                        parsedGarden.crossbreeding = { discoveries: {}, logs: [], learnedHints: {} };
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
                    if (!parsed.streak.prestige || typeof parsed.streak.prestige !== 'object') {
                        parsed.streak.prestige = { cycleMonth: '', cycleBest: 0, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
                    }
                    if (typeof parsed.streak.prestige.cycleMonth !== 'string') parsed.streak.prestige.cycleMonth = '';
                    if (!Number.isFinite(parsed.streak.prestige.cycleBest)) parsed.streak.prestige.cycleBest = 0;
                    if (!Number.isFinite(parsed.streak.prestige.lifetimeTier)) parsed.streak.prestige.lifetimeTier = 0;
                    if (!Number.isFinite(parsed.streak.prestige.completedCycles)) parsed.streak.prestige.completedCycles = 0;
                    if (typeof parsed.streak.prestige.claimedMonthlyReward !== 'string') parsed.streak.prestige.claimedMonthlyReward = '';
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
                    ensureReminderState(parsed);
                    ensureMasteryState(parsed);
                    ensureRetentionMetaState(parsed);
                    const schemaMigration = migrateSaveSchema(parsed);
                    if (schemaMigration.migrated) _needsSaveAfterLoad = true;
                    updateExplorationUnlocks(true, parsed);
                    const loadTimeJump = checkAndRecordTimeJump(parsed, 'load');
                    if (loadTimeJump && loadTimeJump.detected) _needsSaveAfterLoad = true;

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

                    // Apply timestamp-based garden progression for elapsed time.
                    if (typeof advanceGardenSystems === 'function') {
                        try {
                            const gardenNow = (() => {
                                const rawNow = Date.now();
                                const lastGrow = Math.max(0, Number((((parsed || {}).garden) || {}).lastGrowTick) || rawNow);
                                return lastGrow + clampElapsedForHardening(Math.max(0, rawNow - lastGrow), 'garden');
                            })();
                            advanceGardenSystems(parsed, { now: gardenNow, silent: true, skipRandom: true });
                        } catch (e) {
                            gardenDebugLog('Failed to advance migrated garden state', e);
                        }
                    }

                    // Update time of day
                    parsed.timeOfDay = getTimeOfDay();

                    // Apply time-based changes for needs (offline time simulation)
                    // Apply to ALL pets, not just the active one
                    if (parsed.lastUpdate) {
                        const rawTimePassed = Date.now() - parsed.lastUpdate;
                        const timePassed = clampElapsedForHardening(rawTimePassed, 'needs');
                        const minutesPassed = Math.max(0, timePassed / 60000);
                        const profileCfg = (typeof getBalanceProfileConfig === 'function') ? getBalanceProfileConfig() : { offlineDecayMultiplier: 1, offlineNeglectMultiplier: 1 };
                        const offlineDecayScale = Math.max(0, Number(profileCfg.offlineDecayMultiplier) || 1);
                        const offlineNeglectScale = Math.max(0, Number(profileCfg.offlineNeglectMultiplier) || 1);
                        // Keep offline progression meaningful so long absences cannot fully reset pressure.
                        // Report #10: Quick iteration profile softens offline penalties.
                        const decay = Math.min(Math.floor((minutesPassed / 2) * offlineDecayScale), 80);
                        if (decay > 0) {
                            const petsToDecay = parsed.pets && parsed.pets.length > 0 ? parsed.pets : (parsed.pet ? [parsed.pet] : []);
                            let activeOldStats = null;
                            petsToDecay.forEach((p, idx) => {
                                if (!p) return;
                                const oldStats = {
                                    hunger: p.hunger,
                                    cleanliness: p.cleanliness,
                                    happiness: p.happiness,
                                    energy: p.energy
                                };
                                if (idx === parsed.activePetIndex) activeOldStats = oldStats;

                                const isActive = idx === parsed.activePetIndex;
                                // Non-active pets get gentler decay (0.5x rate) matching live gameplay
                                const rateMult = isActive ? 1 : 0.5;

                                // Personality-driven offline decay multipliers
                                const pTrait = p.personality && PERSONALITY_TRAITS[p.personality];
                                const pMods = pTrait ? pTrait.statModifiers : null;
                                const hungerM = pMods ? pMods.hungerDecayMultiplier : 1;
                                const cleanM = pMods ? pMods.cleanlinessDecayMultiplier : 1;
                                const happyM = pMods ? pMods.happinessDecayMultiplier : 1;
                                const energyM = pMods ? pMods.energyDecayMultiplier : 1;
                                // Decay multipliers > 1 should not also increase passive recovery.
                                const energyRecoveryM = energyM > 0 ? (1 / energyM) : 1;
                                // Elder wisdom offline reduction
                                const elderR = p.growthStage === 'elder' ? ELDER_CONFIG.wisdomDecayReduction : 1;
                                // Report #8: Pet spa mitigates cleanliness decay while offline.
                                const spaCleanMult = Number(getPrestigeEffectValue('petSpa', 'cleanlinessDecayMultiplier', 1)) || 1;

                                // Hunger decays faster while away (pet gets hungry)
                                p.hunger = clamp(p.hunger - Math.floor(decay * 1.5 * rateMult * hungerM * elderR), 0, 100);
                                // Cleanliness decays slower (pet isn't doing much)
                                p.cleanliness = clamp(p.cleanliness - Math.floor(decay * 0.5 * rateMult * cleanM * elderR * spaCleanMult), 0, 100);
                                // Happiness decays at normal rate
                                p.happiness = clamp(p.happiness - Math.floor(decay * rateMult * happyM * elderR), 0, 100);
                                // Energy recovers only partially while away.
                                p.energy = clamp(p.energy + Math.floor(decay * 0.2 * rateMult * energyRecoveryM), 0, 100);

                                // Pets with friends get a happiness bonus while away (scaled by relationship quality)
                                if (parsed.pets.length > 1 && parsed.relationships) {
                                    let bestRelPoints = 0;
                                    const pid = p.id;
                                    Object.entries(parsed.relationships).forEach(([key, rel]) => {
                                        if (!rel || typeof rel.points !== 'number') return;
                                        // Only consider relationships involving this pet
                                        if (pid != null && key.split('-').indexOf(String(pid)) === -1) return;
                                        if (rel.points > bestRelPoints) {
                                            bestRelPoints = rel.points;
                                        }
                                    });
                                    if (bestRelPoints > 0) {
                                        const relScale = Math.min(1, bestRelPoints / 180);
                                        const friendBonus = Math.min(5, Math.floor(decay * 0.2 * relScale));
                                        p.happiness = clamp(p.happiness + friendBonus, 0, 100);
                                    }
                                }
                            });

                            // Track neglect for offline decay — if stats dropped below 20, increment neglectCount
                            petsToDecay.forEach(p => {
                                if (!p) return;
                                const isNeglected = p.hunger < 20 || p.cleanliness < 20 || p.happiness < 20 || p.energy < 20;
                                if (isNeglected) {
                                    // Scale neglect count by offline time (1 per ~10 minutes of neglect), capped at 10
                                    const neglectIncrements = Math.min(10, Math.floor((minutesPassed / 10) * offlineNeglectScale));
                                    if (neglectIncrements > 0) {
                                        p.neglectCount = (p.neglectCount || 0) + neglectIncrements;
                                    }
                                }
                            });

                            // Sync active pet reference
                            if (parsed.pets.length > 0) {
                                parsed.pet = parsed.pets[parsed.activePetIndex];
                            }

                            // Store offline changes for welcome-back summary (active pet only)
                            if (minutesPassed >= 5 && parsed.pet && activeOldStats) {
                                parsed._offlineChanges = {
                                    minutes: Math.round(minutesPassed),
                                    hunger: parsed.pet.hunger - activeOldStats.hunger,
                                    cleanliness: parsed.pet.cleanliness - activeOldStats.cleanliness,
                                    happiness: parsed.pet.happiness - activeOldStats.happiness,
                                    energy: parsed.pet.energy - activeOldStats.energy
                                };
                            }
                        }
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
                            writeSaveIntegrity(parsed);
                            const migrated = JSON.stringify(parsed);
                            localStorage.setItem(STORAGE_KEYS.gameSave, migrated);
                            _lastSavedStorageSnapshot = migrated;
                        } catch (e) {}
                    } else {
                        _lastSavedStorageSnapshot = saved;
                    }
                    const integrity = _integrityCheck || { ok: true, missing: true };
                    if (!integrity.ok) {
                        ensureSecurityState(parsed).suspicious = true;
                        ensureSecurityState(parsed).suspiciousReason = 'save-integrity-mismatch';
                        showHardeningToast('suspicious', 'Save integrity warning: some rewards and auction features are limited.', '#EF5350');
                    } else if (integrity.missing && parsed.saveVersion < SAVE_SCHEMA_VERSION) {
                        // Legacy saves are allowed; checksum will be written on next save.
                    }
                    if (isSuspiciousEconomyState(parsed)) {
                        showHardeningToast('suspicious', 'Save integrity warning: some rewards and auction features are limited.', '#EF5350');
                    }
                    // Reset session-local transient state (Recommendations #1, #2)
                    parsed._sessionMinigameCount = 0;
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
                // Show recovery dialog instead of silently failing
                _loadError = e;
            }
            return null;
        }

        let _loadError = null;
        function showSaveRecoveryDialog() {
            if (!_loadError) return;
            if (document.getElementById('save-recovery-overlay')) return;
            _loadError = null;
            const overlay = document.createElement('div');
            overlay.id = 'save-recovery-overlay';
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Save data corrupted');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:320px;text-align:center;">
                    <h2 style="margin-bottom:12px;">Save Data Issue</h2>
                    <p style="margin-bottom:16px;font-size:0.9rem;">Your save data appears to be corrupted. You can try to start fresh or attempt to keep playing.</p>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button id="recovery-fresh" style="padding:10px 18px;border:none;border-radius:8px;background:#EF5350;color:white;cursor:pointer;font-weight:600;font-family:inherit;">Start Fresh</button>
                        <button id="recovery-dismiss" style="padding:10px 18px;border:1px solid #ccc;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-family:inherit;">Dismiss</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('recovery-fresh').addEventListener('click', () => {
                try { localStorage.removeItem(STORAGE_KEYS.gameSave); } catch(e) {}
                _lastSavedStorageSnapshot = null;
                suppressUnloadAutosaveForReload();
                overlay.remove();
                location.reload();
            });
            document.getElementById('recovery-dismiss').addEventListener('click', () => {
                overlay.remove();
            });
            announce('Save data may be corrupted. A recovery dialog is available.', true);
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
                neglectArc: { active: false, stage: 'thriving', startedAt: 0, progressCare: 0, variety: {}, uniqueActions: 0, lastAdvancedAt: 0, lastToneAt: 0 },
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

        function getMaxPetCapacity() {
            const base = Number(typeof MAX_PETS !== 'undefined' ? MAX_PETS : 4) || 4;
            // Report #8: Premium Nursery increases family capacity.
            const extra = Number(getPrestigeEffectValue('premiumNursery', 'extraPetCapacity', 0)) || 0;
            return Math.max(1, base + extra);
        }

        function canAdoptMore() {
            return getPetCount() < getMaxPetCapacity();
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
            if (getPetCount() >= getMaxPetCapacity()) return false;
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
            return true;
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

        // ==================== BREEDING & GENETICS SYSTEM ====================

        function canBreed(pet) {
            if (!pet) return { eligible: false, reason: 'No pet selected' };
            const stageOrder = GROWTH_ORDER;
            const petStageIdx = stageOrder.indexOf(pet.growthStage);
            const minStageIdx = stageOrder.indexOf(BREEDING_CONFIG.minAge);
            if (petStageIdx < minStageIdx) return { eligible: false, reason: 'Pet must be adult or elder' };
            const now = Date.now();
            if (pet.lastBreedTime && (now - pet.lastBreedTime) < BREEDING_CONFIG.cooldownMs) {
                const remaining = Math.ceil((BREEDING_CONFIG.cooldownMs - (now - pet.lastBreedTime)) / 60000);
                return { eligible: false, reason: `Cooldown: ${remaining}m remaining` };
            }
            return { eligible: true };
        }

        function ensureBreedingEggData(egg) {
            if (!egg || typeof egg !== 'object') return false;
            if (typeof egg.incubationTicks !== 'number' || !Number.isFinite(egg.incubationTicks) || egg.incubationTicks < 0) {
                egg.incubationTicks = 0;
            }
            if (typeof egg.incubationTarget !== 'number' || !Number.isFinite(egg.incubationTarget) || egg.incubationTarget <= 0) {
                egg.incubationTarget = BREEDING_CONFIG.incubationBaseTicks;
            }
            if (!egg.roomBonuses || typeof egg.roomBonuses !== 'object' || Array.isArray(egg.roomBonuses)) {
                egg.roomBonuses = {};
            }
            if (typeof egg.careBonuses !== 'number' || !Number.isFinite(egg.careBonuses)) {
                egg.careBonuses = 0;
            }
            if (!egg.genetics || typeof egg.genetics !== 'object' || Array.isArray(egg.genetics)) {
                egg.genetics = {};
            }
            return true;
        }

        function canBreedPair(pet1, pet2) {
            if (!pet1 || !pet2) {
                return { eligible: false, reason: 'Both pets must be selected' };
            }
            const check1 = canBreed(pet1);
            const pet1Name = pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet 1';
            const pet2Name = pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet 2';
            if (!check1.eligible) return { eligible: false, reason: `${pet1Name}: ${check1.reason}` };
            const check2 = canBreed(pet2);
            if (!check2.eligible) return { eligible: false, reason: `${pet2Name}: ${check2.reason}` };
            if (pet1.id === pet2.id) return { eligible: false, reason: 'Cannot breed a pet with itself' };
            // Check relationship level
            const rel = getRelationship(pet1.id, pet2.id);
            const level = getRelationshipLevel(rel.points);
            const levelIdx = RELATIONSHIP_ORDER.indexOf(level);
            const minIdx = RELATIONSHIP_ORDER.indexOf(BREEDING_CONFIG.minRelationship);
            if (levelIdx < minIdx) {
                return { eligible: false, reason: `Pets need to be at least ${RELATIONSHIP_LEVELS[BREEDING_CONFIG.minRelationship].label} level` };
            }
            // Check max breeding eggs
            const eggs = gameState.breedingEggs || [];
            if (eggs.length >= BREEDING_CONFIG.maxBreedingEggs) {
                return { eligible: false, reason: `Maximum ${BREEDING_CONFIG.maxBreedingEggs} breeding eggs at once` };
            }
            return { eligible: true };
        }

        // Generate hidden genetic stats for a pet (used on first-gen pets)
        function generateBaseGenetics() {
            const genetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                genetics[stat] = data.default + Math.floor(Math.random() * 7) - 3; // 7-13 range
                genetics[stat] = clamp(genetics[stat], data.min, data.max);
            }
            return genetics;
        }

        // Ensure a pet has genetics (for legacy pets without them)
        function ensureGenetics(pet) {
            if (!pet.genetics) {
                pet.genetics = generateBaseGenetics();
            }
            return pet.genetics;
        }

        // Inherit genetics from two parents with noise
        function inheritGenetics(parent1, parent2) {
            const g1 = ensureGenetics(parent1);
            const g2 = ensureGenetics(parent2);
            const childGenetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                // Pick from parent1 or parent2 with slight bias toward higher stat
                const avg = (g1[stat] + g2[stat]) / 2;
                const noise = Math.floor(Math.random() * (BREEDING_CONFIG.statInheritanceNoise * 2 + 1)) - BREEDING_CONFIG.statInheritanceNoise;
                childGenetics[stat] = clamp(Math.round(avg + noise), data.min, data.max);
            }
            return childGenetics;
        }

        // Normalize shorthand hex (#F00) to full form (#FF0000)
        function normalizeHex(hex) {
            if (typeof hex !== 'string') return '#D4A574'; // fallback color
            if (hex.length === 4) {
                return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            return hex;
        }

        // Blend two hex colors
        function blendColors(hex1, hex2, ratio) {
            hex1 = normalizeHex(hex1);
            hex2 = normalizeHex(hex2);
            const r1 = parseInt(hex1.slice(1, 3), 16);
            const g1 = parseInt(hex1.slice(3, 5), 16);
            const b1 = parseInt(hex1.slice(5, 7), 16);
            const r2 = parseInt(hex2.slice(1, 3), 16);
            const g2 = parseInt(hex2.slice(3, 5), 16);
            const b2 = parseInt(hex2.slice(5, 7), 16);
            const r = Math.round(r1 * ratio + r2 * (1 - ratio));
            const g = Math.round(g1 * ratio + g2 * (1 - ratio));
            const b = Math.round(b1 * ratio + b2 * (1 - ratio));
            return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        }

        // Determine offspring color from parents
        function inheritColor(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutationKeys = Object.keys(MUTATION_COLORS);
                const mutColor = MUTATION_COLORS[mutationKeys[Math.floor(Math.random() * mutationKeys.length)]];
                return { color: mutColor.hex, mutationColor: mutColor.name, isMutated: true };
            }
            if (Math.random() < BREEDING_CONFIG.colorBlendChance) {
                // Blend the two parent colors
                const ratio = 0.3 + Math.random() * 0.4; // 30%-70% blend
                return { color: blendColors(parent1.color, parent2.color, ratio), isMutated: false };
            }
            // Pick one parent's color
            return { color: Math.random() < 0.5 ? parent1.color : parent2.color, isMutated: false };
        }

        // Determine offspring pattern
        function inheritPattern(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutPatternKeys = Object.keys(MUTATION_PATTERNS);
                const mutPattern = mutPatternKeys[Math.floor(Math.random() * mutPatternKeys.length)];
                return { pattern: mutPattern, mutationPattern: MUTATION_PATTERNS[mutPattern].name, isMutated: true };
            }
            // Inherit from one parent
            if (Math.random() < BREEDING_CONFIG.patternInheritChance) {
                return { pattern: parent1.pattern || 'solid', isMutated: false };
            }
            return { pattern: parent2.pattern || 'solid', isMutated: false };
        }

        // Determine offspring type (same species, or hybrid)
        function determineOffspringType(parent1, parent2) {
            if (parent1.type === parent2.type) {
                return { type: parent1.type, isHybrid: false };
            }
            // Check if a hybrid exists for this combination
            const hybridId = getHybridForParents(parent1.type, parent2.type);
            if (hybridId && Math.random() < BREEDING_CONFIG.hybridChance) {
                return { type: hybridId, isHybrid: true };
            }
            // No hybrid — offspring is randomly one of the parent types
            return { type: Math.random() < 0.5 ? parent1.type : parent2.type, isHybrid: false };
        }

        // Core breeding function — creates a breeding egg
        function breedPets(pet1Index, pet2Index) {
            const pet1 = gameState.pets[pet1Index];
            const pet2 = gameState.pets[pet2Index];
            if (!pet1 || !pet2) return null;

            const check = canBreedPair(pet1, pet2);
            if (!check.eligible) return { success: false, reason: check.reason };

            // Check for mutation
            const hasMutation = Math.random() < BREEDING_CONFIG.mutationChance;

            // Determine offspring type
            const typeResult = determineOffspringType(pet1, pet2);

            // Inherit color
            const colorResult = inheritColor(pet1, pet2, hasMutation && Math.random() < 0.5);

            // Inherit pattern
            const patternResult = inheritPattern(pet1, pet2, hasMutation && !colorResult.isMutated);

            // Inherit genetics
            const childGenetics = inheritGenetics(pet1, pet2);

            // If mutation, boost a random genetic stat
            let geneticMutationApplied = false;
            let mutationStat = null;
            if (hasMutation) {
                const statKeys = Object.keys(GENETIC_STATS);
                const boostStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                const beforeBoost = childGenetics[boostStat];
                const boosted = clamp(beforeBoost + 3, GENETIC_STATS[boostStat].min, GENETIC_STATS[boostStat].max);
                childGenetics[boostStat] = boosted;
                if (boosted !== beforeBoost) {
                    geneticMutationApplied = true;
                    mutationStat = boostStat;
                }
            }

            // Determine if any mutation actually applied (color or pattern or genetic boost)
            const actuallyMutated = hasMutation && (colorResult.isMutated || patternResult.isMutated || geneticMutationApplied);

            // Create the breeding egg
            const breedingEgg = {
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                parent1Id: pet1.id,
                parent2Id: pet2.id,
                parent1Type: pet1.type,
                parent2Type: pet2.type,
                parent1Name: pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Unknown',
                parent2Name: pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Unknown',
                offspringType: typeResult.type,
                isHybrid: typeResult.isHybrid,
                color: colorResult.color,
                mutationColor: colorResult.mutationColor || null,
                pattern: patternResult.pattern,
                mutationPattern: patternResult.mutationPattern || null,
                mutationStat: mutationStat,
                hasMutation: actuallyMutated,
                genetics: childGenetics,
                incubationTicks: 0,
                incubationTarget: BREEDING_CONFIG.incubationBaseTicks,
                roomBonuses: {},  // Track accumulated room bonuses
                careBonuses: 0,   // Extra ticks from care actions
                createdAt: Date.now(),
                currentRoom: gameState.currentRoom || 'bedroom'
            };

            // Set cooldowns on parents
            pet1.lastBreedTime = Date.now();
            pet2.lastBreedTime = Date.now();

            // Add to breeding eggs
            if (!gameState.breedingEggs) gameState.breedingEggs = [];
            if (gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = Date.now();
            }
            gameState.breedingEggs.push(breedingEgg);

            // Track breeding stats
            gameState.totalBreedings = (gameState.totalBreedings || 0) + 1;
            const p1Name = pet1.name || 'Pet';
            const p2Name = pet2.name || 'Pet';
            addJournalEntry('🥚', `${p1Name} and ${p2Name} are expecting! A breeding egg has appeared!`);
            if (actuallyMutated) gameState.totalMutations = (gameState.totalMutations || 0) + 1;
            if (typeResult.isHybrid) {
                gameState.totalHybridsCreated = (gameState.totalHybridsCreated || 0) + 1;
                if (!gameState.hybridsDiscovered) gameState.hybridsDiscovered = {};
                gameState.hybridsDiscovered[typeResult.type] = true;
            }

            // Add relationship points for breeding
            addRelationshipPoints(pet1.id, pet2.id, 15);

            // Sync active pet to array first (preserves any stat changes), then re-read
            syncActivePetToArray();
            gameState.pet = gameState.pets[gameState.activePetIndex];
            saveGame();

            return {
                success: true,
                egg: breedingEgg,
                hasMutation: actuallyMutated,
                isHybrid: typeResult.isHybrid,
                offspringType: typeResult.type
            };
        }

        // Advance incubation for all breeding eggs (called from decay timer)
        function tickBreedingEggs() {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return [];

            const hatched = [];
            const currentRoom = gameState.currentRoom || 'bedroom';
            const roomBonus = INCUBATION_ROOM_BONUSES[currentRoom] || { speedMultiplier: 1.0 };

            for (let i = gameState.breedingEggs.length - 1; i >= 0; i--) {
                const egg = gameState.breedingEggs[i];
                if (!ensureBreedingEggData(egg)) continue;
                // Apply room speed multiplier
                egg.incubationTicks += roomBonus.speedMultiplier;
                egg.currentRoom = currentRoom;

                // Track room bonus for genetics
                if (roomBonus.bonusStat) {
                    if (!egg.roomBonuses[roomBonus.bonusStat]) egg.roomBonuses[roomBonus.bonusStat] = 0;
                    egg.roomBonuses[roomBonus.bonusStat] += 0.1;
                }

                // Check if hatched
                if (egg.incubationTicks >= egg.incubationTarget) {
                    hatched.push(egg);
                    gameState.breedingEggs.splice(i, 1);
                    announce('A breeding egg is ready to hatch!', true);
                }
            }

            return hatched;
        }

        function consumeBreedingIncubationTicks(nowMs) {
            const now = typeof nowMs === 'number' ? nowMs : Date.now();
            const intervalMs = 60 * 1000; // 1 tick per minute

            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }
            if (typeof gameState.lastBreedingIncubationTick !== 'number') {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }

            const elapsed = Math.max(0, now - gameState.lastBreedingIncubationTick);
            const ticksDue = Math.floor(elapsed / intervalMs);
            if (ticksDue > 0) {
                gameState.lastBreedingIncubationTick += ticksDue * intervalMs;
            }
            return ticksDue;
        }

        // Apply care action bonus to breeding eggs
        function applyBreedingEggCareBonus(action) {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return;
            const bonus = INCUBATION_CARE_BONUSES[action];
            if (!bonus) return;
            for (const egg of gameState.breedingEggs) {
                if (!ensureBreedingEggData(egg)) continue;
                egg.incubationTicks += bonus.tickBonus;
                egg.careBonuses += bonus.tickBonus;
            }
        }

        // Hatch a breeding egg into an actual pet
        function hatchBreedingEgg(egg) {
            if (!ensureBreedingEggData(egg)) return null;
            const typeData = getAllPetTypeData(egg.offspringType);
            if (!typeData) return null;

            // Generate unique ID
            if (typeof gameState.nextPetId !== 'number' || isNaN(gameState.nextPetId)) {
                let maxId = 0;
                if (gameState.pets) gameState.pets.forEach(p => { if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id; });
                gameState.nextPetId = maxId + 1;
            }
            const petId = gameState.nextPetId;
            gameState.nextPetId = petId + 1;

            // Apply room bonuses to genetics
            const genetics = { ...egg.genetics };
            for (const [stat, bonus] of Object.entries(egg.roomBonuses)) {
                if (genetics[stat] !== undefined && GENETIC_STATS[stat]) {
                    genetics[stat] = clamp(Math.round(genetics[stat] + bonus), GENETIC_STATS[stat].min, GENETIC_STATS[stat].max);
                }
            }

            const newPet = {
                id: petId,
                type: egg.offspringType,
                name: typeData.name,
                color: egg.color,
                pattern: egg.pattern,
                accessories: [],
                hunger: 70,
                cleanliness: 70,
                happiness: 80,
                energy: 70,
                careActions: 0,
                growthStage: 'baby',
                birthdate: Date.now(),
                careHistory: [],
                neglectCount: 0,
                careQuality: 'average',
                careVariant: 'normal',
                evolutionStage: 'base',
                lastGrowthStage: 'baby',
                unlockedAccessories: [],
                // Breeding-specific data
                genetics: genetics,
                parentIds: [egg.parent1Id, egg.parent2Id],
                parentTypes: [egg.parent1Type, egg.parent2Type],
                parentNames: [egg.parent1Name, egg.parent2Name],
                isHybrid: egg.isHybrid,
                hasMutation: egg.hasMutation,
                mutationColor: egg.mutationColor || null,
                mutationPattern: egg.mutationPattern || null,
                generation: 1 // Track generation depth
            };

            newPet.personality = getRandomPersonality();
            newPet.personalityWarmth = {};
            if (!gameState.personalitiesSeen) gameState.personalitiesSeen = {};
            gameState.personalitiesSeen[newPet.personality] = true;

            // Calculate generation from parents
            const parent1 = gameState.pets.find(p => p && p.id === egg.parent1Id);
            const parent2 = gameState.pets.find(p => p && p.id === egg.parent2Id);
            if (parent1 && parent2) {
                newPet.generation = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;
            }

            return newPet;
        }

        // Get incubation progress as a percentage
        function getIncubationProgress(egg) {
            if (!ensureBreedingEggData(egg)) return 0;
            return Math.min(100, (egg.incubationTicks / egg.incubationTarget) * 100);
        }

        // Get all adult pets eligible for breeding
        function getBreedablePets() {
            if (!gameState.pets) return [];
            const result = [];
            gameState.pets.forEach((p, idx) => {
                if (p && canBreed(p).eligible) {
                    result.push({ pet: p, index: idx });
                }
            });
            return result;
        }

        function getMood(pet) {
            const average = ((pet.hunger || 0) + (pet.cleanliness || 0) + (pet.happiness || 0) + (pet.energy || 0)) / 4;
            // Weather affects mood thresholds when pet is outdoors
            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const room = ROOMS[gameState.currentRoom || 'bedroom'];
            const isOutdoor = room ? room.isOutdoor : false;
            const weatherBonus = isOutdoor ? weatherData.moodBonus : 0;
            const season = gameState.season || getCurrentSeason();
            const seasonBonus = SEASONS[season] ? SEASONS[season].moodBonus : 0;
            const adjusted = average + weatherBonus + seasonBonus;

            // Day/Night cycle mood overrides
            const timeOfDay = gameState.timeOfDay || 'day';
            const isNightTime = (timeOfDay === 'night' || timeOfDay === 'sunset');
            const isMorning = (timeOfDay === 'sunrise');

            // Personality-driven mood biases
            const personality = pet.personality;
            if (personality === 'lazy') {
                // Lazy pets get sleepy easier
                if (pet.energy < 60) return 'sleepy';
            } else if (personality === 'energetic') {
                // Energetic pets are almost always energetic unless stats are low
                if (adjusted >= 40 && pet.energy >= 40) return 'energetic';
            } else if (personality === 'grumpy') {
                // Grumpy pets need higher stats to be happy
                if (adjusted < 70 && adjusted >= 30) return 'neutral';
            }

            // Sleepy at night when energy is low-ish
            if (isNightTime && pet.energy < 50) return 'sleepy';

            // Energetic in the morning when energy is decent
            if (isMorning && pet.energy >= 50) return 'energetic';

            if (adjusted >= 60) return 'happy';
            if (adjusted >= 30) return 'neutral';
            return 'sad';
        }

        // Get mood face emoji for the mood indicator
        function getMoodFaceEmoji(mood, pet) {
            const avg = pet ? (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4 : 50;
            if (mood === 'sleepy') return '😴';
            if (mood === 'energetic') return '🤩';
            if (avg >= 80) return '😁';
            if (mood === 'happy') return '😊';
            if (mood === 'neutral') return '😐';
            if (avg < 20) return '😰';
            return '😢';
        }

        // Get time of day based on real time
        // Sunrise: 5:00 AM - 5:59 AM | Day: 6:00 AM - 6:00 PM | Sunset: 6:00 PM - 8:00 PM | Night: 8:00 PM - 4:59 AM
        function getTimeOfDay() {
            const now = new Date();
            const hour = now.getHours();
            // Sunrise window at dawn (full hour so players can experience it)
            if (hour === 5) return 'sunrise';
            if (hour >= 6 && hour < 18) return 'day';
            if (hour >= 18 && hour < 20) return 'sunset';
            return 'night';
        }

        // ==================== GROWTH & CARE QUALITY FUNCTIONS ====================

        function getPetAge(pet) {
            if (!pet || !pet.birthdate) return 0;
            const ageInMs = Date.now() - pet.birthdate;
            return ageInMs / (1000 * 60 * 60); // Convert to hours
        }

        function updateCareHistory(pet) {
            if (!pet) return null;
            pet.hunger = normalizePetNeedValue(pet.hunger, 70);
            pet.cleanliness = normalizePetNeedValue(pet.cleanliness, 70);
            pet.happiness = normalizePetNeedValue(pet.happiness, 70);
            pet.energy = normalizePetNeedValue(pet.energy, 70);

            // Initialize care history if missing
            if (!pet.careHistory) pet.careHistory = [];

            // Track previous care quality for change detection
            const previousQuality = pet.careQuality || 'average';

            // Track current stats
            const currentAverage = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            const timestamp = Date.now();

            // Add to history (keep last 100 entries to calculate trends)
            pet.careHistory.push({ average: currentAverage, timestamp });
            if (pet.careHistory.length > 100) {
                pet.careHistory.shift();
            }

            // Check for neglect (any stat below 20)
            // Only update neglectCount every 5 minutes (10 ticks at 30s) to prevent
            // rapid inflation from the 30-second update cycle
            let petId = pet.id;
            if (!Number.isInteger(petId) || petId <= 0) {
                if (!pet._runtimeNeglectKey) {
                    Object.defineProperty(pet, '_runtimeNeglectKey', {
                        value: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        writable: false,
                        configurable: true,
                        enumerable: false
                    });
                }
                petId = pet._runtimeNeglectKey;
            }
            if (!_neglectTickCounters[petId]) _neglectTickCounters[petId] = 0;
            _neglectTickCounters[petId]++;
            const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageBalance = getStageBalance(stage);
            const neglectThreshold = stageBalance.neglectThreshold || 20;
            const isNeglected = pet.hunger < neglectThreshold || pet.cleanliness < neglectThreshold || pet.happiness < neglectThreshold || pet.energy < neglectThreshold;
            if (_neglectTickCounters[petId] >= 10) {
                _neglectTickCounters[petId] = 0;
                if (isNeglected) {
                    pet.neglectCount = adjustNeglectCount(pet.neglectCount, stageBalance.neglectGainMultiplier || 1, 'up');
                } else if ((pet.neglectCount || 0) > 0) {
                    // Later stages recover neglect more slowly.
                    pet.neglectCount = adjustNeglectCount(pet.neglectCount, stageBalance.neglectRecoveryMultiplier || 1, 'down');
                }
            }

            // Calculate overall care quality
            const recentHistory = pet.careHistory.slice(-20); // Last 20 measurements
            const averageStats = recentHistory.reduce((sum, entry) => sum + entry.average, 0) / recentHistory.length;
            const neglectCount = pet.neglectCount || 0;

            // Update care quality
            const newQuality = getCareQuality(averageStats, neglectCount);
            pet.careQuality = newQuality;

            // Update care variant based on quality
            const qualityData = CARE_QUALITY[newQuality];
            if (qualityData) {
                pet.careVariant = qualityData.variant;
            }

            // Return quality change info for notifications
            if (previousQuality !== newQuality) {
                return {
                    changed: true,
                    from: previousQuality,
                    to: newQuality,
                    improved: getCareQualityLevel(newQuality) > getCareQualityLevel(previousQuality)
                };
            }

            return { changed: false };
        }

        // Helper to get numeric level for care quality comparison
        function getCareQualityLevel(quality) {
            const levels = { poor: 0, average: 1, good: 2, excellent: 3 };
            return levels[quality] || 0;
        }

        const _milestoneCheckInProgress = {};
        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours, pet.careQuality || 'average');
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                // Guard against duplicate celebration if called multiple times
                const milestoneKey = pet.id != null ? String(pet.id) : '__active__';
                if (_milestoneCheckInProgress[milestoneKey]) return false;
                _milestoneCheckInProgress[milestoneKey] = true;
                setTimeout(() => { delete _milestoneCheckInProgress[milestoneKey]; }, 100);
                pet.growthStage = currentStage;
                pet.lastGrowthStage = currentStage;
                const milestoneTrigger = `milestone:${currentStage}`;
                const artifactCount = applyRoomArtifactTrigger(milestoneTrigger, { sourceRoom: gameState.currentRoom || 'bedroom' });
                if (artifactCount > 0) {
                    showToast(`🏡 ${artifactCount} lasting room change${artifactCount === 1 ? '' : 's'} appeared after this milestone.`, '#81C784', { tier: 'ceremony' });
                }
                if (currentStage === 'adult' || currentStage === 'elder') {
                    setAmbientTone('bright', `growth:${currentStage}`, 16000);
                } else if (currentStage === 'child') {
                    setAmbientTone('softening', `growth:${currentStage}`, 14000);
                }

                // Show birthday celebration
                if (currentStage !== 'baby') {
                    hapticBuzz(100);
                    showBirthdayCelebration(currentStage, pet);
                    const petName = getPetDisplayName(pet);
                    const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                    addJournalEntry('🎉', `${petName} grew to ${stageLabel} stage!`);
                }

                // Announce growth stage transition (Item 25)
                const petName = getPetDisplayName(pet);
                const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                announce(`${petName} has grown to the ${stageLabel} stage!`, true);

                // Update adults raised counter
                if (currentStage === 'adult') {
                    gameState.adultsRaised = (gameState.adultsRaised || 0) + 1;

                    // Notify if pet can now evolve (adult + excellent care)
                    if (canEvolve(pet)) {
                        setTimeout(() => {
                            showToast('⭐ Your pet can now evolve! Look for the Evolve button.', '#FFD700');
                        }, 2000);
                    }

                    // Check if any mythical pets just got unlocked
                    Object.keys(PET_TYPES).forEach(typeKey => {
                        const typeData = PET_TYPES[typeKey];
                        if (typeData.mythical && gameState.adultsRaised === typeData.unlockRequirement) {
                            setTimeout(() => {
                                showToast(`${typeData.emoji} ${typeData.name} unlocked! A mythical pet is now available!`, '#DDA0DD');
                            }, 1500);
                        }
                    });
                }

                // Track elders raised
                if (currentStage === 'elder') {
                    if (typeof gameState.eldersRaised !== 'number') gameState.eldersRaised = 0;
                    gameState.eldersRaised++;
                    // Grant elder sticker
                    if (typeof grantSticker === 'function') grantSticker('elderSticker');
                }

                saveGame();
                return true;
            }

            return false;
        }

        function canEvolve(pet) {
            if (!pet) return false;
            if (pet.evolutionStage === 'evolved') return false;
            if (pet.growthStage !== 'adult' && pet.growthStage !== 'elder') return false;

            const qualityData = CARE_QUALITY[pet.careQuality];
            if (!qualityData || !qualityData.canEvolve) return false;

            const recentHistory = Array.isArray(pet.careHistory) ? pet.careHistory.slice(-20) : [];
            const historyAvg = recentHistory.length > 0
                ? recentHistory.reduce((sum, entry) => sum + (Number(entry.average) || 0), 0) / recentHistory.length
                : ((Number(pet.hunger) || 0) + (Number(pet.cleanliness) || 0) + (Number(pet.happiness) || 0) + (Number(pet.energy) || 0)) / 4;
            const neglectCount = Number(pet.neglectCount) || 0;
            const performanceScore = historyAvg - (neglectCount * 3.5);

            // Keep evolution tied to excellent, active care performance instead of passive waiting.
            return performanceScore >= 78 && neglectCount <= 4;
        }

        function evolvePet(pet) {
            if (!canEvolve(pet)) return false;

            const evolutionData = PET_EVOLUTIONS[pet.type];
            if (!evolutionData) return false;

            pet.evolutionStage = 'evolved';

            // Store evolution title separately so the user-chosen name is preserved
            pet.evolutionTitle = evolutionData.name;

            // Show evolution celebration
            showEvolutionCelebration(pet, evolutionData);
            addJournalEntry('✨', `${pet.name || 'Pet'} evolved into ${evolutionData.name}!`);

            saveGame();
            return true;
        }

        // Get time icon based on time of day
        function getTimeIcon(timeOfDay) {
            switch (timeOfDay) {
                case 'sunrise': return '🌅';
                case 'day': return '☀️';
                case 'sunset': return '🌇';
                case 'night': return '🌙';
                default: return '☀️';
            }
        }

        // ==================== WEATHER FUNCTIONS ====================

        function getRandomWeather() {
            // Use seasonal weather bias if season is set
            const season = gameState.season || getCurrentSeason();
            return getSeasonalWeather(season);
        }

        function checkWeatherChange() {
            const now = Date.now();
            // Guard against future timestamps (e.g. system clock was wrong when saved)
            if (gameState.lastWeatherChange > now) {
                gameState.lastWeatherChange = now;
            }
            if (now - gameState.lastWeatherChange >= WEATHER_CHANGE_INTERVAL) {
                const newWeather = getRandomWeather();
                if (newWeather !== gameState.weather) {
                    const previousWeather = gameState.weather;
                    gameState.weather = newWeather;
                    gameState.previousWeather = previousWeather;
                    trackWeather();
                    const activeRoom = gameState.currentRoom || 'bedroom';
                    applyRoomArtifactTrigger(`weather:${newWeather}`, { sourceRoom: activeRoom });
                    const weatherTone = newWeather === 'rainy' ? 'softening' : (newWeather === 'snowy' ? 'steady' : 'bright');
                    setAmbientTone(weatherTone, `weather:${newWeather}`, 15000);
                    const weatherData = WEATHER_TYPES[newWeather];
                    showToast(`${weatherData.icon} Weather changed to ${weatherData.name}!`, newWeather === 'sunny' ? '#FFD700' : newWeather === 'rainy' ? '#64B5F6' : '#B0BEC5');
                    announce(`Weather changed to ${weatherData.name}.`);
                    updateWeatherDisplay();
                    updatePetMood();

                    // Weather micro-stories
                    if (gameState.pet && typeof getWeatherStory === 'function') {
                        const story = getWeatherStory(gameState.pet, newWeather, previousWeather);
                        if (story) {
                            if (!gameState.pet._weatherSeen) gameState.pet._weatherSeen = {};
                            gameState.pet._weatherSeen[newWeather] = true;
                            setTimeout(() => showToast(story, '#B39DDB'), 1500);
                        }
                    }
                }
                gameState.lastWeatherChange = now;
                saveGame();
            }
        }

        function generateWeatherHTML(weather) {
            if (weather === 'rainy') {
                let drops = '';
                for (let i = 0; i < 30; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 2;
                    const duration = 0.6 + Math.random() * 0.4;
                    const height = 15 + Math.random() * 15;
                    drops += `<div class="rain-drop" style="left:${left}%;height:${height}px;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
                }
                return `<div class="weather-overlay" aria-hidden="true">${drops}</div>`;
            }
            if (weather === 'snowy') {
                let flakes = '';
                const snowChars = ['❄', '❆', '✦'];
                for (let i = 0; i < 20; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 3;
                    const duration = 2 + Math.random() * 2;
                    const char = snowChars[Math.floor(Math.random() * snowChars.length)];
                    flakes += `<div class="snowflake" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;">${char}</div>`;
                }
                return `<div class="weather-overlay" aria-hidden="true">${flakes}</div>`;
            }
            return '';
        }

        // Seasonal ambient particles for the pet area background
        // Subtle CSS-animated overlays: snowflakes (winter), falling leaves (autumn),
        // sun rays (summer), floating petals (spring)
        function generateSeasonalAmbientHTML(season) {
            if (season === 'winter') {
                let flakes = '';
                for (let i = 0; i < 12; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 6;
                    const duration = 4 + Math.random() * 4;
                    const size = 0.5 + Math.random() * 0.6;
                    flakes += `<div class="seasonal-particle winter-flake" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;font-size:${size}rem;opacity:${0.3 + Math.random() * 0.4};">❄</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${flakes}</div>`;
            }
            if (season === 'autumn') {
                let leaves = '';
                const leafChars = ['🍂', '🍁', '🍃'];
                for (let i = 0; i < 8; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 8;
                    const duration = 5 + Math.random() * 5;
                    const char = leafChars[Math.floor(Math.random() * leafChars.length)];
                    leaves += `<div class="seasonal-particle autumn-leaf" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;opacity:${0.35 + Math.random() * 0.35};">${char}</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${leaves}</div>`;
            }
            if (season === 'summer') {
                let rays = '';
                for (let i = 0; i < 4; i++) {
                    const left = 10 + Math.random() * 80;
                    const delay = Math.random() * 4;
                    const duration = 3 + Math.random() * 3;
                    rays += `<div class="seasonal-particle summer-ray" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;"></div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${rays}</div>`;
            }
            if (season === 'spring') {
                let petals = '';
                const petalChars = ['🌸', '🌷', '✿'];
                for (let i = 0; i < 8; i++) {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 8;
                    const duration = 5 + Math.random() * 5;
                    const char = petalChars[Math.floor(Math.random() * petalChars.length)];
                    petals += `<div class="seasonal-particle spring-petal" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;opacity:${0.3 + Math.random() * 0.35};">${char}</div>`;
                }
                return `<div class="seasonal-ambient-overlay" aria-hidden="true">${petals}</div>`;
            }
            return '';
        }

        function getTimeMoodMessage(pet) {
            const timeOfDay = gameState.timeOfDay || 'day';
            if (timeOfDay === 'night' && pet.energy < 50) {
                return randomFromArray(['is getting very sleepy...', 'could really use some sleep!', 'keeps nodding off...']);
            }
            if (timeOfDay === 'night' && pet.energy >= 50) {
                return 'is staying up late!';
            }
            if (timeOfDay === 'sunset' && pet.energy < 40) {
                return 'is winding down for the evening.';
            }
            if (timeOfDay === 'sunrise' && pet.energy >= 50) {
                return randomFromArray(['is bright-eyed this morning!', 'woke up ready for fun!', 'is greeting the sunrise!']);
            }
            return '';
        }

        function getWeatherMoodMessage(pet, weather) {
            if (weather === 'sunny') return '';
            const weatherData = WEATHER_TYPES[weather];
            const room = ROOMS[gameState.currentRoom] || ROOMS['bedroom'];
            if (!room) return '';
            if (room.isOutdoor) {
                return randomFromArray(weatherData.messages);
            }
            if (weather === 'rainy') return 'can hear the rain outside.';
            if (weather === 'snowy') return 'is cozy inside while it snows.';
            return '';
        }

        // Weather changes are checked inside startDecayTimer() via checkWeatherChange(),
        // so no separate weather timer is needed.

        // Generate stars for nighttime
        function generateStarsHTML() {
            let stars = '';
            for (let i = 0; i < 15; i++) {
                const left = Math.random() * 90 + 5;
                const top = Math.random() * 60 + 5;
                const delay = Math.random() * 2;
                const size = Math.random() * 3 + 2;
                stars += `<div class="star" style="left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; animation-delay: ${delay}s;"></div>`;
            }
            return stars;
        }

        // ==================== ROOM FUNCTIONS ====================

        function ensureRoomSystemsState() {
            if (!gameState.roomUnlocks || typeof gameState.roomUnlocks !== 'object') gameState.roomUnlocks = {};
            if (!gameState.roomUpgrades || typeof gameState.roomUpgrades !== 'object') gameState.roomUpgrades = {};
            if (!gameState.roomCustomizations || typeof gameState.roomCustomizations !== 'object') gameState.roomCustomizations = {};
            ensureRoomHistoryState();
            ROOM_IDS.forEach((roomId) => {
                const room = ROOMS[roomId];
                if (!room) return;
                if (typeof gameState.roomUnlocks[roomId] !== 'boolean') {
                    const rule = room.unlockRule || { type: 'default' };
                    if (rule.type === 'default') {
                        gameState.roomUnlocks[roomId] = true;
                    } else if (rule.type === 'careActions') {
                        const care = Array.isArray(gameState.pets) && gameState.pets.length > 0
                            ? Math.max(...gameState.pets.map((p) => (p && Number.isFinite(p.careActions)) ? p.careActions : 0))
                            : (gameState.pet && Number.isFinite(gameState.pet.careActions) ? gameState.pet.careActions : 0);
                        const visited = !!(gameState.roomsVisited && gameState.roomsVisited[roomId]);
                        gameState.roomUnlocks[roomId] = visited || care >= (Number(rule.count) || 0);
                    } else if (rule.type === 'adultsRaised') {
                        const adults = Number(gameState.adultsRaised || 0);
                        const visited = !!(gameState.roomsVisited && gameState.roomsVisited[roomId]);
                        gameState.roomUnlocks[roomId] = visited || adults >= (Number(rule.count) || 0);
                    } else {
                        gameState.roomUnlocks[roomId] = false;
                    }
                }
                if (!Number.isFinite(gameState.roomUpgrades[roomId])) gameState.roomUpgrades[roomId] = 0;
                if (!gameState.roomCustomizations[roomId] || typeof gameState.roomCustomizations[roomId] !== 'object') {
                    gameState.roomCustomizations[roomId] = {};
                }
                const custom = gameState.roomCustomizations[roomId];
                if (!custom.wallpaper || !ROOM_WALLPAPERS[custom.wallpaper]) custom.wallpaper = 'classic';
                if (!custom.flooring || !ROOM_FLOORINGS[custom.flooring]) custom.flooring = 'natural';
                if (!custom.theme || !ROOM_THEMES[custom.theme]) custom.theme = 'auto';
                if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                while (custom.furnitureSlots.length < 2) custom.furnitureSlots.push('none');
                custom.furnitureSlots = custom.furnitureSlots.slice(0, 2).map((id) => ROOM_FURNITURE_ITEMS[id] ? id : 'none');
            });
        }

        function getRoomCustomization(roomId) {
            ensureRoomSystemsState();
            return gameState.roomCustomizations[roomId] || { wallpaper: 'classic', flooring: 'natural', theme: 'auto', furnitureSlots: ['none', 'none'] };
        }

        function getRoomThemeMode(roomId, pet) {
            const custom = getRoomCustomization(roomId);
            const theme = custom.theme || 'auto';
            const petType = pet && pet.type;
            if (theme === 'default') return 'default';
            if (theme === 'aquarium') return 'aquarium';
            if (theme === 'nest') return 'nest';
            if (petType === 'fish') return 'aquarium';
            if (petType === 'bird' || petType === 'penguin') return 'nest';
            return 'default';
        }

        function getRoomUnlockStatus(roomId) {
            const room = ROOMS[roomId];
            if (!room) return { unlocked: false, reason: 'Unknown room.' };
            ensureRoomSystemsState();
            if (gameState.roomUnlocks[roomId]) return { unlocked: true, met: true, reason: '' };
            const rule = room.unlockRule || { type: 'default' };
            if (rule.type === 'default') return { unlocked: true, met: true, reason: '' };
            if (rule.type === 'careActions') {
                const care = Array.isArray(gameState.pets) && gameState.pets.length > 0
                    ? Math.max(...gameState.pets.map((p) => (p && Number.isFinite(p.careActions)) ? p.careActions : 0))
                    : (gameState.pet && Number.isFinite(gameState.pet.careActions) ? gameState.pet.careActions : 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: care >= count,
                    reason: `Need ${count} care actions (${care}/${count}).`
                };
            }
            if (rule.type === 'adultsRaised') {
                const adults = Number(gameState.adultsRaised || 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: adults >= count,
                    reason: `Need ${count} adult pets raised (${adults}/${count}).`
                };
            }
            return { unlocked: false, met: false, reason: room.unlockRule && room.unlockRule.text ? room.unlockRule.text : 'Locked.' };
        }

        function unlockRoom(roomId) {
            const status = getRoomUnlockStatus(roomId);
            if (status.unlocked) return { ok: true, already: true };
            if (!status.met) return { ok: false, reason: status.reason || 'Requirement not met.' };
            gameState.roomUnlocks[roomId] = true;
            saveGame();
            return { ok: true };
        }

        function getRoomBackground(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return ROOMS.bedroom.bgDay;
            switch (timeOfDay) {
                case 'night': return room.bgNight;
                case 'sunset': return room.bgSunset;
                case 'sunrise': return room.bgSunrise;
                default: return room.bgDay;
            }
        }

        const ROOM_PROP_ASSETS = {
            bedroom: ['assets/props/toy-bin.svg', 'assets/props/framed-photo.svg'],
            kitchen: ['assets/props/wall-plant.svg', 'assets/props/tea-shelf.svg'],
            bathroom: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            backyard: ['assets/props/kite-rack.svg', 'assets/props/flower-pot.svg'],
            park: ['assets/props/picnic-basket.svg', 'assets/props/bench-plaque.svg'],
            garden: ['assets/props/watering-can.svg', 'assets/props/garden-lantern.svg'],
            library: ['assets/props/framed-photo.svg', 'assets/props/tea-shelf.svg'],
            arcade: ['assets/props/toy-bin.svg', 'assets/props/bench-plaque.svg'],
            spa: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            observatory: ['assets/props/garden-lantern.svg', 'assets/props/bench-plaque.svg'],
            workshop: ['assets/props/watering-can.svg', 'assets/props/wall-plant.svg']
        };

        function getRoomPropTier() {
            const pet = gameState.pet;
            const careActions = pet && Number.isFinite(pet.careActions) ? pet.careActions : 0;
            if (careActions >= 90) return 2;
            if (careActions >= 35) return 1;
            return 0;
        }

        function getRoomDecor(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return '<span class="room-decor-inline">🌸 🌼 🌷</span>';
            const emojiDecor = timeOfDay === 'night' ? room.nightDecorEmoji : room.decorEmoji;
            const custom = getRoomCustomization(roomId);
            const themed = getRoomThemeMode(roomId, gameState.pet);
            const artifactDecor = getRoomArtifactDecor(roomId);
            let themeDecor = '';
            if (themed === 'aquarium') themeDecor = '<span class="room-theme-badge">🐠 Aquarium</span>';
            if (themed === 'nest') themeDecor = '<span class="room-theme-badge">🪺 Nest</span>';
            const tier = getRoomPropTier();
            const slotDecor = (custom.furnitureSlots || [])
                .map((id, idx) => ROOM_FURNITURE_ITEMS[id] ? `<span class="room-furniture-slot room-furniture-slot-${idx + 1}">${ROOM_FURNITURE_ITEMS[id].emoji}</span>` : '')
                .join('');
            if (tier <= 0) return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}${artifactDecor}`;
            const assets = ROOM_PROP_ASSETS[roomId] || [];
            const maxProps = Math.min(tier, assets.length);
            const props = [];
            for (let i = 0; i < maxProps; i++) {
                props.push(`<span class="room-prop room-prop-tier-${i + 1}" aria-hidden="true"><img src="${assets[i]}" alt="" loading="lazy" decoding="async"></span>`);
            }
            return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}${props.join('')}${artifactDecor}`;
        }

        function getReadyCropCount() {
            const garden = ensureGardenSystemsState();
            if (!garden || !garden.plots) return 0;
            const plotReady = garden.plots.filter((plot) => {
                if (!plot || !plot.cropId) return false;
                const crop = GARDEN_CROPS[plot.cropId];
                if (!crop) return false;
                return crop.plantType === 'fruitTree' ? !!plot.harvestReady : plot.stage >= 3;
            }).length;
            const mushroomReady = (garden.mushroomCave && Array.isArray(garden.mushroomCave.plots))
                ? garden.mushroomCave.plots.filter((plot) => plot && plot.stage >= 3).length
                : 0;
            const beehiveReady = (garden.beehive && garden.beehive.placed && (garden.beehive.storedHoney || 0) > 0) ? 1 : 0;
            return plotReady + mushroomReady + beehiveReady;
        }

        function useBeginnerRoomNav() {
            const pet = gameState.pet;
            if (!pet) return false;
            const careActions = Number(pet.careActions) || 0;
            if (careActions >= 24) return false;
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.petSessions);
                const sessions = Number.parseInt(raw || '0', 10);
                return (Number.isFinite(sessions) ? sessions : 0) < 3;
            } catch (e) {
                return false;
            }
        }

        function generateRoomNavHTML(currentRoom) {
            ensureRoomSystemsState();
            const readyCrops = getReadyCropCount();
            const beginnerMode = useBeginnerRoomNav();
            let html = '<nav class="room-nav" id="room-nav" role="navigation" aria-label="Room navigation">';
            const lockedRooms = [];
            for (const id of ROOM_IDS) {
                const room = ROOMS[id];
                const status = getRoomUnlockStatus(id);
                const unlocked = !!status.unlocked;
                const isActive = id === currentRoom;
                if (beginnerMode && !unlocked) {
                    lockedRooms.push({ id, room, status });
                    continue;
                }
                const badge = (id === 'garden' && readyCrops > 0) ? `<span class="garden-ready-badge" aria-label="${readyCrops} garden items ready">${readyCrops}</span>` : '';
                const bonusHint = room.bonus ? ` (Bonus: ${getRoomBonusLabel(id)})` : '';
                const lockBadge = unlocked ? '' : '<span class="room-lock-badge" aria-hidden="true">🔒</span>';
                const lockRequirement = status.reason || (room.unlockRule && room.unlockRule.text) || 'Locked';
                const lockForeshadow = (!unlocked && room.unlockCue && room.unlockCue.behaviorHint) ? ` Hint: ${room.unlockCue.behaviorHint}` : '';
                const lockHint = unlocked ? '' : ` ${lockRequirement}`;
                const lockA11y = unlocked ? '' : `. Locked. Requirement: ${lockRequirement}.${lockForeshadow}`;
                html += `<button class="room-btn${isActive ? ' active' : ''}${unlocked ? '' : ' locked'}" type="button" data-room="${id}"
                    aria-label="Go to ${room.name}${lockA11y}" aria-pressed="${isActive}" aria-disabled="${unlocked ? 'false' : 'true'}"
                    ${isActive ? 'aria-current="page"' : ''} tabindex="${unlocked ? '0' : '-1'}" style="position:relative;"
                    title="${room.name}${bonusHint}${lockHint}${lockForeshadow}">
                    <span class="room-btn-icon" aria-hidden="true">${room.icon}</span>
                    <span class="room-btn-label">${room.name}</span>
                    ${badge}
                    ${lockBadge}
                </button>`;
            }
            html += '</nav>';
            if (beginnerMode && lockedRooms.length > 0) {
                const lockedHTML = lockedRooms.map(({ id, room, status }) => {
                    const lockRequirement = status.reason || (room.unlockRule && room.unlockRule.text) || 'Locked';
                    const lockForeshadow = room.unlockCue && room.unlockCue.roomCue ? room.unlockCue.roomCue : '';
                    return `<div class="room-btn locked room-coming-item" data-room="${id}" role="listitem" aria-disabled="true"
                        aria-label="${room.name}. Locked. Requirement: ${lockRequirement}.${lockForeshadow ? ` ${lockForeshadow}` : ''}"
                        title="${room.name} ${lockRequirement}${lockForeshadow ? ` — ${lockForeshadow}` : ''}">
                        <span class="room-coming-icon" aria-hidden="true">${room.icon}</span>
                        <span class="room-coming-copy"><strong>${room.name}</strong><span>${lockRequirement}${lockForeshadow ? ` · ${lockForeshadow}` : ''}</span></span>
                    </div>`;
                }).join('');
                html += `<section class="room-coming-wrap" aria-label="Locked rooms">
                    <button class="room-coming-toggle" id="room-coming-toggle" type="button" aria-expanded="false" aria-controls="room-coming-panel">Coming Soon (${lockedRooms.length})</button>
                    <div class="room-coming-panel" id="room-coming-panel" hidden role="list">${lockedHTML}</div>
                </section>`;
            }
            return html;
        }

        function updateRoomNavBadge() {
            const gardenBtn = document.querySelector('.room-btn[data-room="garden"]');
            if (!gardenBtn) return;
            const readyCrops = getReadyCropCount();
            const existingBadge = gardenBtn.querySelector('.garden-ready-badge');
            if (readyCrops > 0) {
                if (existingBadge) {
                    existingBadge.textContent = readyCrops;
                    existingBadge.setAttribute('aria-label', `${readyCrops} garden items ready`);
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'garden-ready-badge';
                    badge.setAttribute('aria-label', `${readyCrops} garden items ready`);
                    badge.textContent = readyCrops;
                    gardenBtn.appendChild(badge);
                }
            } else if (existingBadge) {
                existingBadge.remove();
            }
        }

        function switchRoom(roomId) {
            if (!ROOMS[roomId] || roomId === gameState.currentRoom) return;
            if (typeof beginFeedbackActionWindow === 'function') beginFeedbackActionWindow(`room:${roomId}`);
            ensureRoomSystemsState();
            const unlockResult = unlockRoom(roomId);
            if (!unlockResult.ok) {
                const room = ROOMS[roomId];
                const cue = room && room.unlockCue && room.unlockCue.uiHint ? ` ${room.unlockCue.uiHint}` : '';
                showToast(`🔒 ${unlockResult.reason}${cue}`, '#FFA726', { tier: 'moment' });
                if (typeof SoundManager !== 'undefined' && SoundManager.playSFXByName) {
                    SoundManager.playSFXByName('error-soft', SoundManager.sfx.miss);
                }
                return;
            }
            if (!unlockResult.already) {
                const unlockedRoom = ROOMS[roomId];
                showToast(`🎉 ${unlockedRoom.icon} ${unlockedRoom.name} is now open!`, '#66BB6A', { tier: 'ceremony', assertive: true });
                applyRoomArtifactTrigger(`roomUnlock:${roomId}`, { sourceRoom: roomId });
                noteSessionCeremony(90000);
            }

            const previousRoom = gameState.currentRoom;
            gameState.currentRoom = roomId;

            // Track room visit for achievements and daily checklist
            trackRoomVisit(roomId);
            if (roomId === 'park') {
                const dailyCompleted = incrementDailyProgress('parkVisits');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after room tracking
            const newAchievements = checkAchievements();
            newAchievements.forEach(ach => {
                setTimeout(() => showToast(`${ach.icon} Achievement unlocked: ${ach.name}!`, '#FFD700'), 500);
            });

            saveGame();

            // Play room transition whoosh/chime then start room-specific earcon
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFX(SoundManager.sfx.roomTransition);
                SoundManager.enterRoom(roomId);
            }

            const room = ROOMS[roomId];
            setAmbientTone(room && room.isOutdoor ? 'bright' : 'steady', `room:${roomId}`, 15000);

            // Re-render when switching to/from garden (garden section needs DOM update)
            if (roomId === 'garden' || previousRoom === 'garden') {
                renderPetPhase();
            } else {
                const petArea = document.querySelector('.pet-area');

                if (petArea) {
                    // Enhanced slide transition (Feature 6)
                    petArea.classList.add('room-slide-out');
                    setTimeout(() => {
                        petArea.classList.remove('room-slide-out');

                        // Update season class
                        const season = gameState.season || getCurrentSeason();
                        ['spring', 'summer', 'autumn', 'winter'].forEach(s => petArea.classList.remove('season-' + s));
                        petArea.classList.add('season-' + season);

                        // Update room class
                        ROOM_IDS.forEach(id => petArea.classList.remove('room-' + id));
                        petArea.classList.add('room-' + roomId);

                        // Update background
                        petArea.style.background = getRoomBackground(roomId, gameState.timeOfDay);
                        const roomCustom = getRoomCustomization(roomId);
                        const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
                        const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
                        petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
                        petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
                        const themeMode = getRoomThemeMode(roomId, gameState.pet);
                        petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
                        petArea.classList.add(`pet-theme-${themeMode}`);
                        petArea.setAttribute('data-current-room', roomId);
                        const activePet = gameState.pet;
                        const activePetData = activePet ? ((typeof getAllPetTypeData === 'function' ? getAllPetTypeData(activePet.type) : null) || PET_TYPES[activePet.type]) : null;
                        const petLabel = (activePet && activePet.name) || (activePetData && activePetData.name) || 'pet';
                        petArea.setAttribute('aria-label', `Your pet ${petLabel} in the ${room.name}`);

                        // Update room decor
                        const decor = petArea.querySelector('.room-decor');
                        if (decor) {
                            decor.innerHTML = getRoomDecor(roomId, gameState.timeOfDay);
                        }

                        // Update ambient layer (Feature 2)
                        const oldAmbient = petArea.querySelector('.ambient-layer');
                        if (oldAmbient) oldAmbient.remove();
                        const oldWeatherP = petArea.querySelector('.weather-particles-layer');
                        if (oldWeatherP) oldWeatherP.remove();
                        const isOutdoor = room.isOutdoor;
                        if (typeof generateAmbientLayerHTML === 'function') {
                            const weather = gameState.weather || 'sunny';
                            const ambHTML = generateAmbientLayerHTML(roomId, gameState.timeOfDay, weather, isOutdoor);
                            if (ambHTML) petArea.insertAdjacentHTML('afterbegin', ambHTML);
                            const wpHTML = typeof generateWeatherParticlesHTML === 'function' ? generateWeatherParticlesHTML(weather, isOutdoor) : '';
                            if (wpHTML) petArea.insertAdjacentHTML('afterbegin', wpHTML);
                        }

                        // Show/hide outdoor elements based on room type
                        petArea.querySelectorAll('.cloud').forEach(c => c.style.display = isOutdoor ? '' : 'none');
                        const sun = petArea.querySelector('.sun');
                        if (sun) sun.style.display = isOutdoor ? '' : 'none';
                        const starsOverlay = petArea.querySelector('.stars-overlay');
                        if (starsOverlay) starsOverlay.style.display = isOutdoor ? '' : 'none';
                        const moon = petArea.querySelector('.moon');
                        if (moon) moon.style.display = isOutdoor ? '' : 'none';

                        // Update weather display for the new room
                        updateWeatherDisplay();

                        // Slide in
                        petArea.classList.add('room-slide-in');
                        setTimeout(() => petArea.classList.remove('room-slide-in'), 350);
                    }, 250);
                }
            }

            // Update mood display since weather affects mood differently indoors/outdoors
            updatePetMood();

            // Update nav buttons
            document.querySelectorAll('.room-btn').forEach(btn => {
                const isActive = btn.dataset.room === roomId;
                const status = getRoomUnlockStatus(btn.dataset.room);
                const unlocked = !!(status && status.unlocked);
                btn.classList.toggle('active', isActive);
                btn.classList.toggle('locked', !unlocked);
                btn.setAttribute('aria-pressed', isActive);
                btn.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
                if (isActive) {
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });

            // Show room change notification — limit bonus toasts to first few per session
            if (room.bonus) {
                roomBonusToastCount[roomId] = (roomBonusToastCount[roomId] || 0) + 1;
                if (roomBonusToastCount[roomId] <= MAX_ROOM_BONUS_TOASTS) {
                    showToast(`${room.icon} ${room.name}: ${getRoomBonusLabel(roomId)}!`, '#4ECDC4');
                } else {
                    announce(`Moved to ${room.name}. Room bonus still active: ${getRoomBonusLabel(roomId)}.`);
                }
            } else {
                showToast(`${room.icon} Moved to ${room.name}`, '#4ECDC4');
            }
        }

        // ==================== GARDEN FUNCTIONS ====================

        function getGardenCore() {
            return (typeof GardenFeaturesCore !== 'undefined') ? GardenFeaturesCore : null;
        }

        function getGardenPlantById(plantId, area) {
            if (!plantId) return null;
            if (area === 'flowerGarden') return FLOWER_GARDEN_PLANTS[plantId] || null;
            if (area === 'mushroomCave') return MUSHROOM_CAVE_PLANTS[plantId] || null;
            return GARDEN_CROPS[plantId] || null;
        }

        function getAllMainGardenSeeds() {
            return Object.entries(GARDEN_CROPS).map(([id, def]) => Object.assign({ id: id }, def));
        }

        function getSeasonGrowthMultiplier(season) {
            const seasonData = SEASONS[season];
            return seasonData ? seasonData.gardenGrowthMultiplier : 1;
        }

        function getScarecrowCoverageForPlot(plotIndex, targetState) {
            const state = targetState || gameState;
            const garden = ensureGardenSystemsState(state);
            const radius = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.scarecrowRadius)) ? GARDEN_SYSTEM_BALANCE.scarecrowRadius : 2;
            return garden.scarecrows.some((scarecrow) => {
                const center = Number.isFinite(scarecrow.plotIndex) ? scarecrow.plotIndex : 0;
                const r = Number.isFinite(scarecrow.radius) ? scarecrow.radius : radius;
                return Math.abs(center - plotIndex) <= r;
            });
        }

        function getSprinklerCoverageForPlot(plotIndex, targetState) {
            const state = targetState || gameState;
            const garden = ensureGardenSystemsState(state);
            const radius = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.sprinklerRadius)) ? GARDEN_SYSTEM_BALANCE.sprinklerRadius : 2;
            return garden.sprinklers.some((sprinkler) => {
                const center = Number.isFinite(sprinkler.plotIndex) ? sprinkler.plotIndex : 0;
                const r = Number.isFinite(sprinkler.radius) ? sprinkler.radius : radius;
                return Math.abs(center - plotIndex) <= r;
            });
        }

        function getFriendlyGardenTime(ms) {
            const core = getGardenCore();
            if (core && typeof core.formatFriendlyDuration === 'function') {
                return core.formatFriendlyDuration(ms);
            }
            const remaining = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
            if (remaining <= 0) return 'Ready now';
            if (remaining < 60) return `Ready in ${remaining} minute${remaining === 1 ? '' : 's'}`;
            const hours = Math.floor(remaining / 60);
            const mins = remaining % 60;
            return mins > 0 ? `Ready in ${hours}h ${mins}m` : `Ready in ${hours} hour${hours === 1 ? '' : 's'}`;
        }

        function isSeedUnlocked(cropId, targetState) {
            const state = targetState || gameState;
            const garden = ensureGardenSystemsState(state);
            const crop = GARDEN_CROPS[cropId];
            if (!crop) return false;
            if (crop.defaultUnlocked !== false) return true;
            return !!garden.discoveredSeeds[cropId];
        }

        function getSeedPurchaseLockReason(seedItemId, targetState) {
            const state = targetState || gameState;
            const currentSeason = state.season || getCurrentSeason();
            const item = ECONOMY_SHOP_ITEMS.seeds[seedItemId];
            if (!item) return 'unknown';
            const cropId = item.cropId;
            if (cropId && GARDEN_CROPS[cropId] && !isSeedUnlocked(cropId, state)) return 'undiscovered';
            const allowed = SEASONAL_SHOP_AVAILABILITY[seedItemId];
            if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(currentSeason)) return 'out-of-season';
            return null;
        }

        function createGardenPlotInstance(cropId, now) {
            const ts = Number.isFinite(now) ? now : Date.now();
            return {
                cropId: cropId,
                stage: 0,
                plantedAt: ts,
                lastUpdatedAt: ts,
                growthProgressMs: 0,
                wateredUntil: 0,
                fertilizerCharges: 0,
                pestUntil: 0,
                harvestReady: false,
                nextHarvestAt: 0
            };
        }

        function createSubGardenPlotInstance(plantId, now) {
            const ts = Number.isFinite(now) ? now : Date.now();
            return {
                cropId: plantId,
                stage: 0,
                plantedAt: ts,
                lastUpdatedAt: ts,
                growthProgressMs: 0,
                wateredUntil: 0,
                fertilizerCharges: 0,
                pestUntil: 0,
                harvestReady: false
            };
        }

        function consumeGardenInventoryItem(itemId, count, targetState) {
            const state = targetState || gameState;
            const garden = ensureGardenSystemsState(state);
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (!garden.inventory[itemId] || garden.inventory[itemId] < qty) return false;
            garden.inventory[itemId] -= qty;
            if (garden.inventory[itemId] <= 0) delete garden.inventory[itemId];
            return true;
        }

        function addGardenInventoryItem(itemId, count, targetState) {
            const state = targetState || gameState;
            const garden = ensureGardenSystemsState(state);
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            garden.inventory[itemId] = (garden.inventory[itemId] || 0) + qty;
            return garden.inventory[itemId];
        }

        function advanceGardenSystems(targetState, options) {
            const state = targetState || gameState;
            const opts = options || {};
            const silent = !!opts.silent;
            const skipRandom = !!opts.skipRandom;
            let now = Number.isFinite(opts.now) ? opts.now : Date.now();
            const garden = ensureGardenSystemsState(state);
            checkAndRecordTimeJump(state, 'garden-advance', { now });
            const lastGrow = Number.isFinite(garden.lastGrowTick) ? garden.lastGrowTick : now;
            const rawElapsed = Math.max(0, now - lastGrow);
            const clampedElapsed = clampElapsedForHardening(rawElapsed, 'garden');
            if (clampedElapsed < rawElapsed) {
                now = lastGrow + clampedElapsed;
                if (!silent && typeof showToast === 'function') {
                    showToast('⏱️ Time changed; garden offline growth was capped for fairness.', '#FFA726');
                }
            }
            const core = getGardenCore();
            const season = state.season || getCurrentSeason();
            const seasonMultiplier = getSeasonGrowthMultiplier(season);
            const waterDurationMs = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.wateredDurationMs))
                ? GARDEN_SYSTEM_BALANCE.wateredDurationMs
                : (2 * 60 * 60 * 1000);
            const offSeasonGrowthMultiplier = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.offSeasonGrowthMultiplier))
                ? GARDEN_SYSTEM_BALANCE.offSeasonGrowthMultiplier
                : 0.35;
            const fertilizerGrowthBoost = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.fertilizerGrowthBoost))
                ? GARDEN_SYSTEM_BALANCE.fertilizerGrowthBoost
                : 0.2;

            if (core && typeof core.runSprinklers === 'function') {
                core.runSprinklers(garden.sprinklers, garden.plots, now, {
                    defaultIntervalMs: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.sprinklerIntervalMs) || (6 * 60 * 60 * 1000),
                    waterDurationMs: waterDurationMs
                });
            }

            let newlyReady = 0;
            garden.plots = garden.plots.map((plot, index) => {
                if (!plot || !plot.cropId) return null;
                const plantDef = getGardenPlantById(plot.cropId, 'garden');
                if (!plantDef) return null;
                const offSeason = Array.isArray(plantDef.seasons) && plantDef.seasons.length > 0 && !plantDef.seasons.includes(season);
                const prevStage = plot.stage || 0;
                if (core && typeof core.advancePlantPlot === 'function') {
                    core.advancePlantPlot(plot, plantDef, {
                        now: now,
                        seasonMultiplier: seasonMultiplier,
                        offSeason: offSeason,
                        offSeasonGrowthMultiplier: offSeasonGrowthMultiplier,
                        waterGrowthMultiplier: 1.22,
                        fertilizerGrowthBoost: fertilizerGrowthBoost,
                        pestSlowMultiplier: 0.7
                    });
                }
                if (!skipRandom && plot.stage < 3 && (!Number.isFinite(plot.pestUntil) || plot.pestUntil < now)) {
                    const covered = getScarecrowCoverageForPlot(index, state);
                    const dailyRisk = core && typeof core.computePestRisk === 'function'
                        ? core.computePestRisk(plantDef, covered, { scarecrowReduction: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.scarecrowRiskReduction) || 0.65 })
                        : (plantDef.pestRiskPerDay || 0.08) * (covered ? 0.35 : 1);
                    const elapsedMinutes = Math.max(1, Math.floor((now - (plot.lastPestRollAt || plot.lastUpdatedAt || now)) / 60000));
                    const pestHit = core && typeof core.rollPestEvent === 'function'
                        ? core.rollPestEvent(dailyRisk, elapsedMinutes, Math.random())
                        : (Math.random() < (dailyRisk / 1440));
                    if (pestHit) {
                        plot.pestUntil = now + ((GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.pestDurationMs) || (6 * 60 * 60 * 1000));
                        gardenDebugLog(`Pest event on plot ${index + 1}`, { cropId: plot.cropId, until: plot.pestUntil });
                        if (!silent) showToast(`🐛 Pests found on plot ${index + 1}! Growth slowed.`, '#FF7043');
                    }
                    plot.lastPestRollAt = now;
                }
                if (plot.stage >= 3 && prevStage < 3) {
                    newlyReady++;
                    if (!silent) {
                        const icon = plantDef.seedEmoji || '🌱';
                        showToast(`${icon} ${plantDef.name} is ready!`, '#66BB6A');
                    }
                }
                return plot;
            });

            // Flower garden passive mood.
            const flowerArea = garden.flowerGarden;
            const flowerElapsedMs = Math.max(0, now - (flowerArea.lastMoodTick || now));
            flowerArea.lastMoodTick = now;
            flowerArea.plots = flowerArea.plots.map((plot) => {
                if (!plot || !plot.cropId) return null;
                const plantDef = getGardenPlantById(plot.cropId, 'flowerGarden');
                if (!plantDef) return null;
                if (core && typeof core.advancePlantPlot === 'function') {
                    core.advancePlantPlot(plot, plantDef, {
                        now: now,
                        seasonMultiplier: 1,
                        offSeason: false,
                        offSeasonGrowthMultiplier: 1,
                        waterGrowthMultiplier: 1.08,
                        fertilizerGrowthBoost: 0.05,
                        pestSlowMultiplier: 1
                    });
                }
                return plot;
            });
            if (flowerElapsedMs > 0 && state.pet) {
                const matureFlowerIds = flowerArea.plots
                    .filter((plot) => plot && plot.stage >= 3 && plot.cropId)
                    .map((plot) => plot.cropId);
                if (core && typeof core.computeFlowerMoodBonus === 'function') {
                    const moodInfo = core.computeFlowerMoodBonus(matureFlowerIds, FLOWER_GARDEN_PLANTS, (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.flowerMood) || {});
                    const moodGain = moodInfo.perMinute * (flowerElapsedMs / 60000);
                    if (moodGain > 0) {
                        state.pet.happiness = clamp(state.pet.happiness + moodGain, 0, 100);
                    }
                }
            }

            // Composting.
            if (core && typeof core.tickCompostState === 'function') {
                core.tickCompostState(garden.compostBin, now);
            }

            // Beehive.
            const matureFlowerCount = flowerArea.plots.filter((plot) => plot && plot.stage >= 3).length;
            if (core && typeof core.tickBeehive === 'function') {
                core.tickBeehive(garden.beehive, now, {
                    flowerCount: matureFlowerCount,
                    baseHoneyPerHour: (((GARDEN_SYSTEM_BALANCE || {}).beehive || {}).baseHoneyPerHour) || 0.5,
                    flowerBoostPerFlower: (((GARDEN_SYSTEM_BALANCE || {}).beehive || {}).flowerBoostPerFlower) || 0.12,
                    maxFlowerBoost: (((GARDEN_SYSTEM_BALANCE || {}).beehive || {}).maxFlowerBoost) || 1.0
                });
            }

            // Mushroom cave.
            garden.mushroomCave.plots = garden.mushroomCave.plots.map((plot) => {
                if (!plot || !plot.cropId) return null;
                const plantDef = getGardenPlantById(plot.cropId, 'mushroomCave');
                if (!plantDef) return null;
                const offSeason = Array.isArray(plantDef.seasons) && plantDef.seasons.length > 0 && !plantDef.seasons.includes(season);
                if (core && typeof core.advancePlantPlot === 'function') {
                    core.advancePlantPlot(plot, plantDef, {
                        now: now,
                        seasonMultiplier: 0.9,
                        offSeason: offSeason,
                        offSeasonGrowthMultiplier: 0.5,
                        waterGrowthMultiplier: 1.1,
                        fertilizerGrowthBoost: fertilizerGrowthBoost,
                        pestSlowMultiplier: 0.8
                    });
                }
                return plot;
            });

            garden.lastGrowTick = now;
            return { newlyReady: newlyReady };
        }

        function attemptCrossbreedingAt(plotIndex) {
            const garden = ensureGardenSystemsState();
            if (!Array.isArray(garden.plots) || garden.plots.length < 2) return;
            const leftIdx = Math.max(0, plotIndex - 1);
            const rightIdx = Math.min(garden.plots.length - 2, plotIndex);
            const pairs = [];
            if (garden.plots[leftIdx] && garden.plots[leftIdx + 1]) pairs.push(garden.plots[leftIdx], garden.plots[leftIdx + 1]);
            if (rightIdx !== leftIdx && garden.plots[rightIdx] && garden.plots[rightIdx + 1]) pairs.push(garden.plots[rightIdx], garden.plots[rightIdx + 1]);
            if (pairs.length === 0) return;
            const windowPlots = [];
            for (let i = Math.max(0, plotIndex - 1); i <= Math.min(garden.plots.length - 1, plotIndex + 1); i++) {
                windowPlots.push(garden.plots[i] || null);
            }
            const core = getGardenCore();
            if (!core || typeof core.runCrossbreeding !== 'function') return;
            const result = core.runCrossbreeding(windowPlots, GARDEN_CROSSBREED_RECIPES, {
                discovered: garden.discoveredSeeds,
                rng: Math.random
            });
            if (!Array.isArray(garden.crossbreeding.logs)) garden.crossbreeding.logs = [];
            (result.logs || []).forEach((log) => {
                garden.crossbreeding.logs.unshift(`${new Date().toLocaleTimeString()} ${log}`);
                gardenDebugLog('Crossbreeding roll', log);
            });
            garden.crossbreeding.logs = garden.crossbreeding.logs.slice(0, 20);
            (result.unlocks || []).forEach((cropId) => {
                garden.discoveredSeeds[cropId] = true;
                garden.crossbreeding.discoveries[cropId] = Date.now();
                addEconomyInventoryItem('seeds', cropId, 2);
                const crop = GARDEN_CROPS[cropId];
                if (crop) {
                    showToast(`🧬 Crossbreeding discovered ${crop.name}! +2 seeds unlocked.`, '#AB47BC');
                    announce(`Crossbreeding discovery: ${crop.name} seeds unlocked!`);
                }
            });
        }

        function applyFertilizerToGardenPlot(plotIndex, area) {
            const garden = ensureGardenSystemsState();
            const targetArea = area || 'garden';
            const collection = targetArea === 'mushroomCave' ? garden.mushroomCave.plots : garden.plots;
            const plot = collection[plotIndex];
            if (!plot) return false;
            if (!consumeGardenInventoryItem('fertilizer', 1)) {
                showToast('🧪 No fertilizer available yet.', '#FFA726');
                return false;
            }
            const maxCharges = (GARDEN_SYSTEM_BALANCE && Number.isFinite(GARDEN_SYSTEM_BALANCE.maxFertilizerChargesPerPlot))
                ? GARDEN_SYSTEM_BALANCE.maxFertilizerChargesPerPlot
                : 2;
            plot.fertilizerCharges = Math.min(maxCharges, (plot.fertilizerCharges || 0) + 1);
            showToast('🧪 Fertilizer applied. Growth boosted!', '#8BC34A');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
            return true;
        }

        function addInventoryItemToCompost(itemId) {
            const garden = ensureGardenSystemsState();
            if (itemId === 'fertilizer') return { ok: false, reason: 'not-compostable' };
            if (!consumeGardenInventoryItem(itemId, 1)) return { ok: false, reason: 'missing-item' };
            const compost = garden.compostBin;
            const cropDef = GARDEN_CROPS[itemId] || FLOWER_GARDEN_PLANTS[itemId] || MUSHROOM_CAVE_PLANTS[itemId];
            const compostYield = cropDef && Number.isFinite(cropDef.compostYield) ? cropDef.compostYield : 1;
            const durationMs = (((GARDEN_SYSTEM_BALANCE || {}).compost || {}).baseDurationMs) || (30 * 60 * 1000);
            const core = getGardenCore();
            const enqueueResult = core && typeof core.enqueueCompostItem === 'function'
                ? core.enqueueCompostItem(compost, { itemId: itemId, amount: 1, durationMs: durationMs, fertilizerYield: compostYield, enqueuedAt: Date.now() })
                : { ok: false, reason: 'core-missing' };
            if (!enqueueResult.ok) {
                addGardenInventoryItem(itemId, 1);
                return enqueueResult;
            }
            saveGame();
            return { ok: true };
        }

        function collectCompostOutput() {
            const garden = ensureGardenSystemsState();
            const core = getGardenCore();
            const qty = core && typeof core.collectCompostFertilizer === 'function'
                ? core.collectCompostFertilizer(garden.compostBin)
                : 0;
            if (qty <= 0) {
                showToast('♻️ Compost is still processing.', '#90A4AE');
                return;
            }
            addGardenInventoryItem('fertilizer', qty);
            showToast(`♻️ Collected ${qty} fertilizer!`, '#8BC34A');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function collectBeehiveOutput() {
            const garden = ensureGardenSystemsState();
            const core = getGardenCore();
            const amount = core && typeof core.collectBeehiveHoney === 'function'
                ? core.collectBeehiveHoney(garden.beehive)
                : 0;
            if (amount <= 0) {
                showToast('🍯 Beehive is empty.', '#90A4AE');
                return;
            }
            addGardenInventoryItem('honey', amount);
            showToast(`🍯 Collected ${amount} honey!`, '#F9A825');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function unlockNextGardenExpansionTier() {
            const garden = ensureGardenSystemsState();
            const tierIndex = garden.expansionTier || 0;
            if (tierIndex >= GARDEN_EXPANSION_TIERS.length) {
                showToast('🏡 Garden is fully expanded!', '#66BB6A');
                return;
            }
            const tier = GARDEN_EXPANSION_TIERS[tierIndex];
            if ((garden.totalHarvests || 0) < (tier.requiredHarvests || 0)) {
                showToast(`🌾 Need ${tier.requiredHarvests} total harvests for ${tier.name}.`, '#FFA726');
                return;
            }
            const spend = spendCoins(tier.costCoins || 0, 'Garden Expansion', true);
            if (!spend.ok) {
                showToast(`🪙 Need ${tier.costCoins} coins for ${tier.name}.`, '#FFA726');
                return;
            }
            garden.expansionTier = tierIndex + 1;
            showToast(`🏡 Expanded garden: ${tier.name} unlocked!`, '#66BB6A');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function placeScarecrow() {
            const garden = ensureGardenSystemsState();
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0, garden.expansionTier || 0);
            if (unlockedPlots <= 0) return;
            const center = Math.max(0, Math.floor((unlockedPlots - 1) / 2));
            garden.scarecrows.push({
                id: `scarecrow_${Date.now()}`,
                plotIndex: center,
                radius: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.scarecrowRadius) || 2
            });
            showToast('🪧 Scarecrow placed. Pest risk reduced nearby.', '#8D6E63');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function placeSprinkler() {
            const garden = ensureGardenSystemsState();
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0, garden.expansionTier || 0);
            if (unlockedPlots <= 0) return;
            const center = Math.max(0, Math.floor((unlockedPlots - 1) / 2));
            const now = Date.now();
            garden.sprinklers.push({
                id: `sprinkler_${now}`,
                plotIndex: center,
                radius: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.sprinklerRadius) || 2,
                intervalMs: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.sprinklerIntervalMs) || (6 * 60 * 60 * 1000),
                nextWaterAt: now + (((GARDEN_SYSTEM_BALANCE || {}).sprinklerIntervalMs) || (6 * 60 * 60 * 1000))
            });
            showToast('🚿 Sprinkler placed. Auto-watering started.', '#4FC3F7');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function placeBeehive() {
            const garden = ensureGardenSystemsState();
            if (garden.beehive.placed) {
                showToast('🍯 Beehive already placed.', '#90A4AE');
                return;
            }
            garden.beehive.placed = true;
            garden.beehive.capacity = (((GARDEN_SYSTEM_BALANCE || {}).beehive || {}).capacity) || 20;
            garden.beehive.lastUpdatedAt = Date.now();
            showToast('🐝 Beehive placed! Honey production started.', '#F9A825');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function plantFlower(plotIndex, flowerId) {
            const garden = ensureGardenSystemsState();
            const plotList = garden.flowerGarden.plots;
            if (plotIndex < 0 || plotIndex >= plotList.length) return;
            if (plotList[plotIndex]) return;
            const flower = FLOWER_GARDEN_PLANTS[flowerId];
            if (!flower) return;
            if (!consumeSeedForCrop(flowerId, 1)) {
                showToast(`🌸 Need ${flower.name} seeds.`, '#FFA726');
                return;
            }
            plotList[plotIndex] = createSubGardenPlotInstance(flowerId, Date.now());
            showToast(`🌸 Planted ${flower.name} in Flower Garden.`, '#66BB6A');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function trimFlower(plotIndex) {
            const garden = ensureGardenSystemsState();
            const plot = garden.flowerGarden.plots[plotIndex];
            if (!plot || plot.stage < 3) return;
            const flower = FLOWER_GARDEN_PLANTS[plot.cropId];
            if (!flower) return;
            const trimItem = flower.trimItem || 'petals';
            const trimYield = flower.trimYield || 1;
            addGardenInventoryItem(trimItem, trimYield);
            showToast(`✂️ Trimmed ${flower.name}. +${trimYield} ${trimItem}.`, '#CE93D8');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function plantMushroom(plotIndex, plantId) {
            const garden = ensureGardenSystemsState();
            const plots = garden.mushroomCave.plots;
            if (plotIndex < 0 || plotIndex >= plots.length) return;
            if (plots[plotIndex]) return;
            const plant = MUSHROOM_CAVE_PLANTS[plantId];
            if (!plant) return;
            if (!consumeSeedForCrop(plantId, 1)) {
                showToast(`🍄 Need ${plant.name} spores.`, '#FFA726');
                return;
            }
            if (plant.requiresFertilizer && !consumeGardenInventoryItem('fertilizer', 1)) {
                addEconomyInventoryItem('seeds', plantId, 1);
                showToast('🧪 This fungus requires fertilizer to plant.', '#FFA726');
                return;
            }
            plots[plotIndex] = createSubGardenPlotInstance(plantId, Date.now());
            showToast(`🍄 Planted ${plant.name}.`, '#66BB6A');
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function harvestMushroom(plotIndex) {
            const garden = ensureGardenSystemsState();
            const plots = garden.mushroomCave.plots;
            const plot = plots[plotIndex];
            if (!plot || plot.stage < 3) return;
            const plant = MUSHROOM_CAVE_PLANTS[plot.cropId];
            if (!plant) return;
            const core = getGardenCore();
            const season = gameState.season || getCurrentSeason();
            const offSeason = Array.isArray(plant.seasons) && plant.seasons.length > 0 && !plant.seasons.includes(season);
            const yieldCount = core && typeof core.getHarvestYield === 'function'
                ? core.getHarvestYield(plot, plant, {
                    now: Date.now(),
                    offSeason: offSeason,
                    offSeasonYieldMultiplier: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.offSeasonYieldMultiplier) || 0.75,
                    fertilizerYieldBonus: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.fertilizerYieldBonus) || 1
                })
                : (plant.harvestYield || 1);
            addGardenInventoryItem(plant.id, yieldCount);
            const coinReward = addCoins(12 * yieldCount, 'Mushroom Harvest', true);
            showToast(`🍄 Harvested ${yieldCount} ${plant.name}! +${coinReward} coins.`, '#8BC34A');
            plots[plotIndex] = null;
            saveGame();
            if (gameState.currentRoom === 'garden') renderGardenUI();
        }

        function startGardenGrowTimer() {
            if (gardenGrowInterval) clearInterval(gardenGrowInterval);
            gardenGrowInterval = setInterval(() => {
                try {
                    if (gameState.phase === 'pet' && !document.hidden) {
                        tickGardenGrowth();
                    }
                } catch (e) {
                    // Reset interval on error to allow clean restart
                    clearInterval(gardenGrowInterval);
                    gardenGrowInterval = null;
                }
            }, 60000); // Grow tick every 60 seconds
        }

        function stopGardenGrowTimer() {
            if (gardenGrowInterval) {
                clearInterval(gardenGrowInterval);
                gardenGrowInterval = null;
            }
        }

        function tickGardenGrowth() {
            const garden = ensureGardenSystemsState();
            if (!garden) return;
            const result = advanceGardenSystems(gameState, { now: Date.now(), silent: false });
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
            // Update room nav badge when crops become harvestable
            if (result && result.newlyReady > 0 && typeof updateRoomNavBadge === 'function') {
                updateRoomNavBadge();
            }
            saveGame();
        }

        function plantSeed(plotIndex, cropId) {
            const garden = ensureGardenSystemsState();
            if (plotIndex >= MAX_GARDEN_PLOTS) return;
            // Prevent planting in locked plots
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0, garden.expansionTier || 0);
            if (plotIndex >= unlockedPlots) return;

            // Extend plots array if needed
            while (garden.plots.length <= plotIndex) {
                garden.plots.push(null);
            }

            if (garden.plots[plotIndex] !== null) return; // Plot occupied

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return;
            if (!isSeedUnlocked(cropId)) {
                showToast('🧬 This seed is not unlocked yet.', '#FFA726');
                return;
            }
            const season = gameState.season || getCurrentSeason();
            if (Array.isArray(crop.seasons) && crop.seasons.length > 0 && !crop.seasons.includes(season)) {
                showToast(`🍂 ${crop.name} cannot be planted this season.`, '#FFA726');
                return;
            }
            if (!consumeSeedForCrop(cropId, 1)) {
                showToast(`🌱 You need ${crop.name} seeds. Buy more in the Economy shop.`, '#FFA726');
                return;
            }

            garden.plots[plotIndex] = createGardenPlotInstance(cropId, Date.now());

            showToast(`🌱 Planted ${crop.name}!`, '#66BB6A');
            attemptCrossbreedingAt(plotIndex);

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 5, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function waterPlot(plotIndex) {
            const garden = ensureGardenSystemsState();
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Already ready
            if (Number.isFinite(plot.wateredUntil) && plot.wateredUntil > Date.now()) {
                showToast('💧 Already watered!', '#64B5F6');
                return;
            }

            plot.wateredUntil = Date.now() + ((GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.wateredDurationMs) || (2 * 60 * 60 * 1000));
            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return; // Guard against corrupted save data
            showToast(`💧 Watered the ${crop.name}!`, '#64B5F6');

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function harvestPlot(plotIndex) {
            const garden = ensureGardenSystemsState();
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return;
            if (crop.plantType === 'fruitTree') {
                if (!(plot.harvestReady || plot.stage >= 3)) return;
            } else if (plot.stage < 3) {
                return;
            }

            const core = getGardenCore();
            const season = gameState.season || getCurrentSeason();
            const offSeason = Array.isArray(crop.seasons) && crop.seasons.length > 0 && !crop.seasons.includes(season);
            const harvestYield = core && typeof core.getHarvestYield === 'function'
                ? core.getHarvestYield(plot, crop, {
                    now: Date.now(),
                    offSeason: offSeason,
                    offSeasonYieldMultiplier: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.offSeasonYieldMultiplier) || 0.75,
                    fertilizerYieldBonus: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.fertilizerYieldBonus) || 1,
                    pestYieldMultiplier: 0.7
                })
                : 1;

            if (!garden.inventory[plot.cropId]) garden.inventory[plot.cropId] = 0;
            garden.inventory[plot.cropId] += harvestYield;
            let coinReward = 0;
            for (let i = 0; i < harvestYield; i++) {
                coinReward += awardHarvestCoins(plot.cropId);
            }

            // Track total harvests for progressive plot unlocking
            if (typeof garden.totalHarvests !== 'number') garden.totalHarvests = 0;
            garden.totalHarvests += harvestYield;
            if (typeof trackHarvest === 'function') trackHarvest();
            if (garden.totalHarvests === 1) {
                addJournalEntry('🌱', `Harvested first ${crop.name}!`);
            } else if (garden.totalHarvests % 10 === 0) {
                addJournalEntry('🌾', `Total harvests reached ${garden.totalHarvests}!`);
            }

            // Track daily checklist progress for harvests
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = incrementDailyProgress('harvestCount');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after harvest
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check badges, stickers, trophies after harvest
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

            // Check if a new plot was unlocked
            const prevUnlocked = getUnlockedPlotCount(garden.totalHarvests - harvestYield, garden.expansionTier || 0);
            const newUnlocked = getUnlockedPlotCount(garden.totalHarvests, garden.expansionTier || 0);
            if (newUnlocked > prevUnlocked) {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins. New garden plot unlocked!`, '#FF8C42');
            } else {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins.`, '#FF8C42');
            }

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 8, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            const harvestOutcome = core && typeof core.afterHarvest === 'function'
                ? core.afterHarvest(plot, crop, { now: Date.now() })
                : { keepPlot: false };
            if (!harvestOutcome.keepPlot) {
                garden.plots[plotIndex] = null;
            } else {
                garden.plots[plotIndex] = plot;
            }

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function removeCrop(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Ready crops should be harvested, not removed

            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) {
                // Invalid crop data — just clear the plot silently
                garden.plots[plotIndex] = null;
                saveGame();
                if (gameState.currentRoom === 'garden') renderGardenUI();
                return;
            }

            const existing = document.querySelector('.remove-crop-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'remove-crop-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'remove-crop-heading');

            overlay.innerHTML = `
                <div class="remove-crop-dialog">
                    <p class="remove-crop-message" id="remove-crop-heading"><span aria-hidden="true">${crop.seedEmoji}</span> Remove this ${crop.name}?</p>
                    <div class="remove-crop-buttons">
                        <button class="remove-crop-btn cancel" id="remove-crop-cancel">Keep</button>
                        <button class="remove-crop-btn confirm" id="remove-crop-confirm">Remove</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cancelBtn = document.getElementById('remove-crop-cancel');
            const confirmBtn = document.getElementById('remove-crop-confirm');
            cancelBtn.focus();

            function closeOverlay() {
                popModalEscape(closeOverlay);
                overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            pushModalEscape(closeOverlay);

            confirmBtn.addEventListener('click', () => {
                closeOverlay();
                garden.plots[plotIndex] = null;
                showToast(`Removed ${crop.name}.`, '#EF5350');
                saveGame();
                if (gameState.currentRoom === 'garden') {
                    renderGardenUI();
                }
            });

            cancelBtn.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
        }

        function feedFromGarden(cropId, options) {
            const garden = gameState.garden;
            const opts = options || {};
            if (!garden.inventory[cropId] || garden.inventory[cropId] <= 0) return false;
            if (!gameState.pet) return false;

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return false;
            if (opts.enforceCooldown !== false && typeof isActionCooldownActive === 'function' && isActionCooldownActive()) {
                if (typeof announceCooldownOnce === 'function') announceCooldownOnce();
                return false;
            }
            if (opts.enforceCooldown !== false && typeof startActionCooldownWindow === 'function') {
                startActionCooldownWindow();
            }
            const beforeStats = {
                hunger: gameState.pet.hunger,
                happiness: gameState.pet.happiness,
                energy: gameState.pet.energy
            };
            const focusSnapshot = getPetNeedSnapshot(gameState.pet);
            garden.inventory[cropId]--;
            if (garden.inventory[cropId] <= 0) {
                delete garden.inventory[cropId];
            }

            // Apply room bonus, preference modifier, and personality modifier
            const feedMultiplier = typeof getRoomBonus === 'function' ? getRoomBonus('feed') : 1.0;
            const feedPrefMod = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(gameState.pet, 'feed', cropId) : 1.0;
            const feedPersonalityMod = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(gameState.pet, 'feed') : 1.0;
            const feedWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(gameState.pet) : 0;
            const focusMult = typeof getCareFocusMultiplier === 'function' ? getCareFocusMultiplier('feed', gameState.pet, focusSnapshot) : 1.0;
            const rewardCareMult = typeof getRewardCareGainMultiplier === 'function' ? getRewardCareGainMultiplier() : 1;
            const feedTotalMod = feedMultiplier * feedPrefMod * feedPersonalityMod * focusMult * rewardCareMult;
            const flatTuning = 0.92;

            // Track favorite food feeds
            if (feedPrefMod > 1) {
                if (typeof gameState.totalFavoriteFoodFed !== 'number') gameState.totalFavoriteFoodFed = 0;
                gameState.totalFavoriteFoodFed++;
            }

            gameState.pet.hunger = clamp(gameState.pet.hunger + Math.round((crop.hungerValue + feedWisdom) * flatTuning * feedTotalMod), 0, 100);
            if (crop.happinessValue) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + Math.round(crop.happinessValue * flatTuning * feedTotalMod), 0, 100);
            }
            if (crop.energyValue) {
                gameState.pet.energy = clamp(gameState.pet.energy + Math.round(crop.energyValue * flatTuning * feedTotalMod), 0, 100);
            }
            if (typeof getRewardHappinessFlatBonus === 'function') {
                const happyFlat = Math.max(0, Number(getRewardHappinessFlatBonus()) || 0);
                if (happyFlat > 0) gameState.pet.happiness = clamp(gameState.pet.happiness + happyFlat, 0, 100);
            }

            // Track care actions for growth
            if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
            gameState.pet.careActions++;

            // Track caretaker action counts and room action counts
            trackCareAction('feed');

            // Track lifetime feed count for feed-specific badges/achievements
            if (typeof gameState.totalFeedCount !== 'number') gameState.totalFeedCount = 0;
            gameState.totalFeedCount++;

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('feed');

            // Check pet-type-specific feeding stickers
            if (typeof checkPetActionSticker === 'function') {
                const actionStickers = checkPetActionSticker('feed');
                if (actionStickers) actionStickers.forEach(s => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'));
            }

            const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];

            // Play pet voice sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFXByName('petHappy', (ctx) => SoundManager.sfx.petHappy(ctx, gameState.pet.type));
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                dailyCompleted.push(...incrementDailyProgress('feedCount'));
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.push(...incrementDailyProgress('masteryPoints', 1));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            if (typeof consumeCareActionRewardModifiers === 'function') consumeCareActionRewardModifiers();

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.achievement);
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check for memory moments at growth milestones
            checkAndShowMemoryMoment(gameState.pet);

            // Check for growth stage transition
            if (checkGrowthMilestone(gameState.pet)) {
                showToast(`${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}!`, '#FF8C42');
                saveGame();
                renderPetPhase();
                return true;
            }

            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            if (petContainer) petContainer.classList.add('bounce');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.feed);

            // Build stat change description
            let statChanges = [];
            const hungerDelta = Math.max(0, Math.round(gameState.pet.hunger - beforeStats.hunger));
            const happinessDelta = Math.max(0, Math.round(gameState.pet.happiness - beforeStats.happiness));
            const energyDelta = Math.max(0, Math.round(gameState.pet.energy - beforeStats.energy));
            if (hungerDelta > 0) statChanges.push(`Hunger +${hungerDelta}`);
            if (happinessDelta > 0) statChanges.push(`Happiness +${happinessDelta}`);
            if (energyDelta > 0) statChanges.push(`Energy +${energyDelta}`);
            const statDesc = statChanges.join(', ');

            // Show preference-aware feedback
            let feedFeedback = `${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}! ${statDesc}`;
            if (feedPrefMod > 1) {
                feedFeedback = `💕 ${escapeHTML(gameState.pet.name || petData.name)} LOVES ${crop.name}! Bonus stats! ${statDesc}`;
            } else if (feedPrefMod < 1) {
                feedFeedback = `😨 ${escapeHTML(gameState.pet.name || petData.name)} doesn't like ${crop.name}... Reduced stats. ${statDesc}`;
            }
            showToast(feedFeedback, feedPrefMod > 1 ? '#E040FB' : feedPrefMod < 1 ? '#FF7043' : '#FF8C42');

            if (petContainer) {
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); }, 1200);
            }

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();

            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
            return true;
        }

        function openSeedPicker(plotIndex) {
            const existing = document.querySelector('.seed-picker-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'seed-picker-heading');

            let seedsHTML = '';
            for (const [id, crop] of Object.entries(GARDEN_CROPS)) {
                if (!isSeedUnlocked(id)) {
                    seedsHTML += `
                        <div class="seed-option seed-option-locked" role="note" aria-label="Unknown seed. Discover by crossbreeding compatible crops.">
                            <span class="seed-option-emoji" aria-hidden="true">❔</span>
                            <span class="seed-option-name">Unknown Seed</span>
                            <span class="seed-option-time">Discover via crossbreeding</span>
                        </div>
                    `;
                    continue;
                }
                const isBonus = crop.seasonBonus.includes(season);
                const bonusLabel = isBonus ? ' (in season!)' : '';
                const inSeason = !Array.isArray(crop.seasons) || crop.seasons.length === 0 || crop.seasons.includes(season);
                const firstMatureMinutes = Number.isFinite(crop.firstMatureMinutes) ? crop.firstMatureMinutes : ((crop.growTime || 3) * 3);
                const displayTime = firstMatureMinutes >= 60
                    ? `${Math.round((firstMatureMinutes / 60) * 10) / 10}h`
                    : `${Math.round(firstMatureMinutes)}m`;
                const ownedSeeds = getSeedInventoryCount(id);
                const disabled = ownedSeeds <= 0 || !inSeason;
                const seasonTag = inSeason ? '' : ' • Out of season';
                seedsHTML += `
                    <button class="seed-option" data-crop="${id}" aria-label="Plant ${crop.name}${bonusLabel}${!inSeason ? ', out of season' : ''}" ${disabled ? 'disabled' : ''}>
                        <span class="seed-option-emoji" aria-hidden="true">${crop.seedEmoji}</span>
                        <span class="seed-option-name">${crop.name}${isBonus ? ' ⭐' : ''}${crop.plantType === 'fruitTree' ? ' 🌳' : ''}</span>
                        <span class="seed-option-time">${displayTime} to first harvest · Seeds: ${ownedSeeds}${seasonTag}</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title" id="seed-picker-heading"><span aria-hidden="true">🌱</span> Pick a Seed to Plant!</h3>
                    <div class="seed-list">
                        ${seedsHTML}
                    </div>
                    <button class="seed-picker-close" id="seed-picker-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeOverlay() {
                popModalEscape(closeOverlay);
                if (overlay && overlay.parentNode) overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            overlay.querySelectorAll('.seed-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-crop');
                    closeOverlay();
                    plantSeed(plotIndex, cropId);
                });
            });

            overlay.querySelector('#seed-picker-close').addEventListener('click', () => closeOverlay());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });

            pushModalEscape(closeOverlay);

            // Focus trap for Tab key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = overlay.querySelectorAll('button');
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

            const firstSeed = overlay.querySelector('.seed-option:not([disabled])') || overlay.querySelector('#seed-picker-close');
            if (firstSeed) firstSeed.focus();
        }

        function openFlowerPicker(plotIndex) {
            const existing = document.querySelector('.seed-picker-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }
            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'flower-picker-heading');

            let optionsHTML = '';
            Object.entries(FLOWER_GARDEN_PLANTS).forEach(([id, flower]) => {
                const inSeason = !Array.isArray(flower.seasons) || flower.seasons.length === 0 || flower.seasons.includes(season);
                const owned = getSeedInventoryCount(id);
                const disabled = owned <= 0 || !inSeason;
                const seasonTag = inSeason ? '' : ' · Out of season';
                optionsHTML += `
                    <button class="seed-option" data-flower-id="${id}" aria-label="Plant ${flower.name}${!inSeason ? ', out of season' : ''}" ${disabled ? 'disabled' : ''}>
                        <span class="seed-option-emoji" aria-hidden="true">${flower.emoji}</span>
                        <span class="seed-option-name">${flower.name}</span>
                        <span class="seed-option-time">${Math.round(flower.firstMatureMinutes || 15)}m to bloom · Seeds: ${owned}${seasonTag}</span>
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title" id="flower-picker-heading"><span aria-hidden="true">🌸</span> Flower Garden Planting</h3>
                    <div class="seed-list">${optionsHTML}</div>
                    <button class="seed-picker-close" id="flower-picker-close">Cancel</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeOverlay() {
                popModalEscape(closeOverlay);
                if (overlay.parentNode) overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;
            pushModalEscape(closeOverlay);

            overlay.querySelectorAll('[data-flower-id]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const flowerId = btn.getAttribute('data-flower-id');
                    closeOverlay();
                    plantFlower(plotIndex, flowerId);
                });
            });
            const closeBtn = overlay.querySelector('#flower-picker-close');
            if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
            overlay.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab') return;
                const focusable = overlay.querySelectorAll('button');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (!first || !last) return;
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });
            const firstBtn = overlay.querySelector('[data-flower-id]:not([disabled])') || closeBtn;
            if (firstBtn) firstBtn.focus();
        }

        function openMushroomPicker(plotIndex) {
            const existing = document.querySelector('.seed-picker-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }
            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'mushroom-picker-heading');

            let optionsHTML = '';
            Object.entries(MUSHROOM_CAVE_PLANTS).forEach(([id, fungi]) => {
                const inSeason = !Array.isArray(fungi.seasons) || fungi.seasons.length === 0 || fungi.seasons.includes(season);
                const owned = getSeedInventoryCount(id);
                const disabled = owned <= 0 || !inSeason;
                const fertTag = fungi.requiresFertilizer ? ' · Needs fertilizer' : '';
                const seasonTag = inSeason ? '' : ' · Out of season';
                optionsHTML += `
                    <button class="seed-option" data-fungi-id="${id}" aria-label="Plant ${fungi.name}${!inSeason ? ', out of season' : ''}" ${disabled ? 'disabled' : ''}>
                        <span class="seed-option-emoji" aria-hidden="true">${fungi.emoji}</span>
                        <span class="seed-option-name">${fungi.name}</span>
                        <span class="seed-option-time">${Math.round(fungi.firstMatureMinutes || 40)}m growth · Spores: ${owned}${fertTag}${seasonTag}</span>
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title" id="mushroom-picker-heading"><span aria-hidden="true">🍄</span> Mushroom Cave Planting</h3>
                    <div class="seed-list">${optionsHTML}</div>
                    <button class="seed-picker-close" id="mushroom-picker-close">Cancel</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeOverlay() {
                popModalEscape(closeOverlay);
                if (overlay.parentNode) overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;
            pushModalEscape(closeOverlay);

            overlay.querySelectorAll('[data-fungi-id]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const fungiId = btn.getAttribute('data-fungi-id');
                    closeOverlay();
                    plantMushroom(plotIndex, fungiId);
                });
            });
            const closeBtn = overlay.querySelector('#mushroom-picker-close');
            if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
            overlay.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab') return;
                const focusable = overlay.querySelectorAll('button');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (!first || !last) return;
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });
            const firstBtn = overlay.querySelector('[data-fungi-id]:not([disabled])') || closeBtn;
            if (firstBtn) firstBtn.focus();
        }

        // Generate SVG illustrations for garden crop stages
        function generateCropSVG(cropId, stage) {
            const colors = {
                carrot:     { stem: '#4CAF50', fruit: '#FF6D00', ground: '#8D6E63' },
                tomato:     { stem: '#388E3C', fruit: '#F44336', ground: '#8D6E63' },
                strawberry: { stem: '#388E3C', fruit: '#E91E63', ground: '#8D6E63' },
                pumpkin:    { stem: '#388E3C', fruit: '#FF9800', ground: '#8D6E63' },
                sunflower:  { stem: '#388E3C', fruit: '#FFD600', ground: '#8D6E63' },
                apple:      { stem: '#5D4037', fruit: '#F44336', ground: '#8D6E63' },
                candyCorn:  { stem: '#8BC34A', fruit: '#FFCA28', ground: '#8D6E63' },
                snowberry:  { stem: '#90CAF9', fruit: '#5C6BC0', ground: '#8D6E63' },
                sunblush:   { stem: '#66BB6A', fruit: '#FFB74D', ground: '#8D6E63' }
            };
            const c = colors[cropId] || colors.carrot;

            if (stage === 0) {
                // Seed/soil
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <ellipse cx="20" cy="28" rx="4" ry="2" fill="#5D4037"/>
                    <ellipse cx="20" cy="28" rx="2" ry="1" fill="#795548"/>
                </svg>`;
            } else if (stage === 1) {
                // Sprout
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="18" stroke="${c.stem}" stroke-width="2.5" stroke-linecap="round"/>
                    <ellipse cx="16" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(-20 16 18)"/>
                    <ellipse cx="24" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(20 24 18)"/>
                </svg>`;
            } else if (stage === 2) {
                // Growing plant
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="12" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    <ellipse cx="14" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(-25 14 14)"/>
                    <ellipse cx="26" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(25 26 14)"/>
                    <ellipse cx="13" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(-15 13 20)"/>
                    <ellipse cx="27" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(15 27 20)"/>
                </svg>`;
            } else {
                // Harvest-ready with fruit
                const fruitShapes = {
                    carrot: `<rect x="17" y="20" width="6" height="12" rx="3" fill="${c.fruit}"/><polygon points="20,16 17,20 23,20" fill="${c.stem}"/>`,
                    tomato: `<circle cx="20" cy="22" r="7" fill="${c.fruit}"/><ellipse cx="20" cy="16" rx="4" ry="2" fill="${c.stem}"/>`,
                    strawberry: `<path d="M20 14 Q14 20 16 26 Q20 30 24 26 Q26 20 20 14Z" fill="${c.fruit}"/><ellipse cx="20" cy="14" rx="4" ry="2" fill="${c.stem}"/><circle cx="18" cy="22" r="0.8" fill="#FFD600"/><circle cx="22" cy="24" r="0.8" fill="#FFD600"/><circle cx="20" cy="20" r="0.8" fill="#FFD600"/>`,
                    pumpkin: `<ellipse cx="20" cy="24" rx="9" ry="7" fill="${c.fruit}"/><path d="M20 17 Q22 14 20 12" stroke="${c.stem}" stroke-width="2" fill="none"/><ellipse cx="20" cy="24" rx="3" ry="7" fill="rgba(0,0,0,0.08)"/>`,
                    sunflower: `<circle cx="20" cy="18" r="5" fill="#5D4037"/><circle cx="14" cy="16" r="4" fill="${c.fruit}"/><circle cx="26" cy="16" r="4" fill="${c.fruit}"/><circle cx="14" cy="22" r="4" fill="${c.fruit}"/><circle cx="26" cy="22" r="4" fill="${c.fruit}"/><circle cx="20" cy="13" r="4" fill="${c.fruit}"/><circle cx="20" cy="24" r="4" fill="${c.fruit}"/>`,
                    apple: `<circle cx="20" cy="20" r="7" fill="${c.fruit}"/><line x1="20" y1="13" x2="20" y2="10" stroke="${c.stem}" stroke-width="2" stroke-linecap="round"/><ellipse cx="22" cy="12" rx="3" ry="2" fill="${c.stem}"/>`,
                    candyCorn: `<path d="M20 14 C13 17 13 26 20 29 C27 26 27 17 20 14Z" fill="${c.fruit}"/><path d="M20 18 C17 20 17 24 20 26 C23 24 23 20 20 18Z" fill="#FF7043"/><path d="M20 22 C19 23 19 24 20 25 C21 24 21 23 20 22Z" fill="#FFF8E1"/>`,
                    snowberry: `<circle cx="16" cy="21" r="4" fill="${c.fruit}"/><circle cx="22" cy="24" r="4" fill="${c.fruit}"/><circle cx="24" cy="18" r="3.5" fill="#9FA8DA"/>`,
                    sunblush: `<ellipse cx="20" cy="22" rx="8" ry="6" fill="${c.fruit}"/><path d="M13 22 Q20 15 27 22" stroke="#F57C00" stroke-width="1.6" fill="none"/>`
                };
                const fruit = fruitShapes[cropId] || fruitShapes.carrot;
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="14" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    ${fruit}
                </svg>`;
            }
        }

        function renderGardenUI() {
            const gardenSection = document.getElementById('garden-section');
            if (!gardenSection) return;

            const now = Date.now();
            const garden = ensureGardenSystemsState();
            advanceGardenSystems(gameState, { now: now, silent: true });
            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            const core = getGardenCore();
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0, garden.expansionTier || 0);

            function findNextSprinklerAt(plotIndex) {
                let nextAt = null;
                garden.sprinklers.forEach((sprinkler) => {
                    const radius = Number.isFinite(sprinkler.radius) ? sprinkler.radius : ((GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.sprinklerRadius) || 2);
                    const center = Number.isFinite(sprinkler.plotIndex) ? sprinkler.plotIndex : 0;
                    if (Math.abs(center - plotIndex) > radius) return;
                    if (!Number.isFinite(sprinkler.nextWaterAt)) return;
                    if (!nextAt || sprinkler.nextWaterAt < nextAt) nextAt = sprinkler.nextWaterAt;
                });
                return nextAt;
            }

            // Render plots
            let plotsHTML = '';
            for (let i = 0; i < MAX_GARDEN_PLOTS; i++) {
                const plot = garden.plots[i] || null;
                const isLocked = i >= unlockedPlots;
                if (isLocked) {
                    const threshold = GARDEN_PLOT_UNLOCK_THRESHOLDS[i] || 0;
                    const remaining = threshold - (garden.totalHarvests || 0);
                    plotsHTML += `
                        <div class="garden-plot locked" aria-label="Locked plot. Harvest ${remaining} more crop${remaining !== 1 ? 's' : ''} to unlock.">
                            <span class="garden-plot-emoji" aria-hidden="true">🔒</span>
                            <span class="garden-plot-label">${remaining} harvest${remaining !== 1 ? 's' : ''} to unlock</span>
                        </div>
                    `;
                } else if (!plot) {
                    plotsHTML += `
                        <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                            <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                            <span class="garden-plot-label">Plant</span>
                        </div>
                    `;
                } else {
                    const crop = GARDEN_CROPS[plot.cropId];
                    if (!crop) {
                        // Corrupted plot data — treat as empty
                        garden.plots[i] = null;
                        plotsHTML += `
                            <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                                <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                                <span class="garden-plot-label">Plant</span>
                            </div>
                        `;
                        continue;
                    }
                    const cropSVG = generateCropSVG(plot.cropId, plot.stage);
                    const firstMatureMs = core && typeof core.getPlantFirstMatureMs === 'function'
                        ? core.getPlantFirstMatureMs(crop)
                        : ((crop.growTime || 3) * 3 * 60000);
                    const progressMs = Number.isFinite(plot.growthProgressMs) ? plot.growthProgressMs : ((Number(plot.growTicks) || 0) * 60000);
                    const matured = !!plot.firstMatureAt || progressMs >= firstMatureMs;
                    const isFruitTree = crop.plantType === 'fruitTree';
                    const isReady = isFruitTree ? !!plot.harvestReady : plot.stage >= 3;
                    const progress = isReady ? 100 : Math.min(100, Math.round((progressMs / firstMatureMs) * 100));
                    const inSeason = !Array.isArray(crop.seasons) || crop.seasons.length === 0 || crop.seasons.includes(season);
                    const offSeasonTag = inSeason ? '' : ' · Out of season';
                    let timerLine = '';
                    if (isFruitTree && matured) {
                        const nextHarvestMs = Math.max(0, (plot.nextHarvestAt || now) - now);
                        timerLine = isReady ? 'Harvest ready now' : getFriendlyGardenTime(nextHarvestMs);
                    } else {
                        const remainingMs = Math.max(0, firstMatureMs - progressMs);
                        timerLine = isReady ? 'Harvest ready now' : getFriendlyGardenTime(remainingMs);
                    }
                    const scarecrowCovered = getScarecrowCoverageForPlot(i);
                    const pestRisk = core && typeof core.computePestRisk === 'function'
                        ? core.computePestRisk(crop, scarecrowCovered, { scarecrowReduction: (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.scarecrowRiskReduction) || 0.65 })
                        : (crop.pestRiskPerDay || 0.08);
                    const pestLabel = Number.isFinite(plot.pestUntil) && plot.pestUntil > now
                        ? 'Pests active'
                        : `Pest risk ${(pestRisk * 100).toFixed(1)}%/day${scarecrowCovered ? ' (covered)' : ''}`;
                    const sprinklerCoverage = getSprinklerCoverageForPlot(i);
                    const nextSprinklerAt = sprinklerCoverage ? findNextSprinklerAt(i) : null;
                    const sprinklerLine = sprinklerCoverage
                        ? `Auto-water ${nextSprinklerAt ? `(${getFriendlyGardenTime(nextSprinklerAt - now).replace('Ready in ', 'in ')})` : '(active)'}`
                        : 'Manual water only';
                    const statusLabel = isReady ? 'Ready to harvest!' : `Growing... ${progress}%${offSeasonTag}`;
                    const plotClass = isReady ? 'ready' : 'growing';
                    const statusLine = isReady ? 'Harvest!' : `${progress}%`;
                    const wateredNow = Number.isFinite(plot.wateredUntil) && plot.wateredUntil > now;
                    const plotActionLabel = isReady ? `Harvest ${crop.name}` : (wateredNow ? `${crop.name} growing` : `Water ${crop.name}`);
                    plotsHTML += `
                        <div class="garden-plot ${plotClass}" data-plot="${i}" role="group"
                             aria-label="Plot ${i + 1}: ${crop.name} - ${statusLabel}">
                            <button class="garden-plot-action" data-plot-action="${i}" aria-label="${plotActionLabel}">
                                ${cropSVG}
                                ${!isReady ? `<div class="garden-plot-progress" role="progressbar" aria-label="${crop.name} growth" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="garden-plot-progress-fill" style="width:${progress}%"></div></div>` : ''}
                                <span class="garden-plot-status">${statusLine}</span>
                                <span class="garden-plot-status">${escapeHTML(timerLine)}</span>
                                <span class="garden-plot-status">${escapeHTML(pestLabel)}</span>
                                <span class="garden-plot-status">${escapeHTML(sprinklerLine)}</span>
                            </button>
                            ${!isReady ? `<button class="garden-plot-remove" data-remove-plot="${i}" aria-label="Remove ${crop.name}"><span aria-hidden="true">✕</span></button>` : ''}
                            ${!isReady ? `<button class="garden-plot-remove" style="top:26px;" data-fertilize-plot="${i}" aria-label="Apply fertilizer to ${crop.name}"><span aria-hidden="true">🧪</span></button>` : ''}
                        </div>
                    `;
                }
            }

            // Render inventory
            let inventoryHTML = '';
            const invKeys = Object.keys(garden.inventory).filter(k => garden.inventory[k] > 0);
            if (invKeys.length > 0) {
                let itemsHTML = '';
                invKeys.forEach(cropId => {
                    const crop = GARDEN_CROPS[cropId];
                    if (crop) {
                        itemsHTML += `<button class="garden-inventory-item" data-feed-crop="${cropId}" aria-label="Feed ${crop.name} to pet (${garden.inventory[cropId]} left)">${crop.seedEmoji} ${crop.name} x${garden.inventory[cropId]}</button>`;
                    } else {
                        itemsHTML += `<span class="garden-inventory-item">${escapeHTML(cropId)} x${garden.inventory[cropId]}</span>`;
                    }
                });
                inventoryHTML = `
                    <div class="garden-inventory">
                        <strong><span aria-hidden="true">🧺</span> Harvested Food:</strong> <span style="font-size:0.75rem;color:#888;">(tap to feed pet)</span>
                        <div class="garden-inventory-items">${itemsHTML}</div>
                    </div>
                `;
            }

            // Flower garden section.
            let flowerPlotsHTML = '';
            garden.flowerGarden.plots.forEach((plot, idx) => {
                if (!plot) {
                    flowerPlotsHTML += `
                        <div class="garden-plot empty" data-flower-plot="${idx}" role="button" tabindex="0" aria-label="Flower plot ${idx + 1}: empty. Press Enter to plant flower.">
                            <span class="garden-plot-emoji" aria-hidden="true">🌸</span>
                            <span class="garden-plot-label">Plant Flower</span>
                        </div>
                    `;
                    return;
                }
                const flower = FLOWER_GARDEN_PLANTS[plot.cropId];
                if (!flower) return;
                const firstMatureMs = core && typeof core.getPlantFirstMatureMs === 'function'
                    ? core.getPlantFirstMatureMs(flower)
                    : ((flower.firstMatureMinutes || 15) * 60000);
                const progressMs = Number.isFinite(plot.growthProgressMs) ? plot.growthProgressMs : 0;
                const progress = plot.stage >= 3 ? 100 : Math.min(100, Math.round((progressMs / firstMatureMs) * 100));
                const timerLine = plot.stage >= 3 ? 'Blooming' : getFriendlyGardenTime(firstMatureMs - progressMs);
                flowerPlotsHTML += `
                    <div class="garden-plot ${plot.stage >= 3 ? 'ready' : 'growing'}" role="group" aria-label="Flower plot ${idx + 1}: ${flower.name}. ${timerLine}">
                        <button class="garden-plot-action" aria-label="${plot.stage >= 3 ? `Trim ${flower.name}` : `${flower.name} growing`}" data-trim-flower="${idx}">
                            <span class="garden-plot-emoji" aria-hidden="true">${flower.emoji}</span>
                            <span class="garden-plot-status">${escapeHTML(flower.name)}</span>
                            <span class="garden-plot-status">${escapeHTML(timerLine)}</span>
                            <span class="garden-plot-status">${plot.stage >= 3 ? `Mood +${Math.round((flower.moodPerMinute || 0) * 1440)}/day` : `${progress}%`}</span>
                        </button>
                    </div>
                `;
            });

            const matureFlowerIds = garden.flowerGarden.plots.filter((plot) => plot && plot.stage >= 3).map((plot) => plot.cropId);
            const moodInfo = core && typeof core.computeFlowerMoodBonus === 'function'
                ? core.computeFlowerMoodBonus(matureFlowerIds, FLOWER_GARDEN_PLANTS, (GARDEN_SYSTEM_BALANCE && GARDEN_SYSTEM_BALANCE.flowerMood) || {})
                : { perDay: 0 };

            // Compost UI.
            const compost = garden.compostBin;
            const compostProgress = compost.active
                ? Math.max(0, Math.min(100, Math.round(((now - compost.active.startedAt) / Math.max(1, compost.active.completeAt - compost.active.startedAt)) * 100)))
                : 0;
            const compostableItems = Object.entries(garden.inventory).filter(([id, count]) => count > 0 && id !== 'fertilizer');
            const compostButtons = compostableItems.map(([id, count]) => {
                const emoji = (GARDEN_CROPS[id] && GARDEN_CROPS[id].seedEmoji) || (FLOWER_GARDEN_PLANTS[id] && FLOWER_GARDEN_PLANTS[id].emoji) || '♻️';
                return `<button class="garden-inventory-item" data-compost-item="${id}" aria-label="Add ${id} to compost">${emoji} ${escapeHTML(id)} x${count}</button>`;
            }).join('');

            // Beehive UI.
            const beehive = garden.beehive;
            const beehiveCap = Number.isFinite(beehive.capacity) ? beehive.capacity : ((((GARDEN_SYSTEM_BALANCE || {}).beehive || {}).capacity) || 20);
            const beePercent = beehiveCap > 0 ? Math.round((Math.max(0, beehive.storedHoney || 0) / beehiveCap) * 100) : 0;

            // Mushroom cave UI.
            let mushroomHTML = '';
            garden.mushroomCave.plots.forEach((plot, idx) => {
                if (!plot) {
                    mushroomHTML += `
                        <div class="garden-plot empty" data-mushroom-plot="${idx}" role="button" tabindex="0" aria-label="Mushroom cave plot ${idx + 1}: empty. Press Enter to plant fungus.">
                            <span class="garden-plot-emoji" aria-hidden="true">🍄</span>
                            <span class="garden-plot-label">Plant Fungus</span>
                        </div>
                    `;
                    return;
                }
                const fungi = MUSHROOM_CAVE_PLANTS[plot.cropId];
                if (!fungi) return;
                const firstMatureMs = core && typeof core.getPlantFirstMatureMs === 'function'
                    ? core.getPlantFirstMatureMs(fungi)
                    : ((fungi.firstMatureMinutes || 40) * 60000);
                const progressMs = Number.isFinite(plot.growthProgressMs) ? plot.growthProgressMs : 0;
                const progress = plot.stage >= 3 ? 100 : Math.min(100, Math.round((progressMs / firstMatureMs) * 100));
                const timerLine = plot.stage >= 3 ? 'Ready' : getFriendlyGardenTime(firstMatureMs - progressMs);
                mushroomHTML += `
                    <div class="garden-plot ${plot.stage >= 3 ? 'ready' : 'growing'}" role="group" aria-label="Mushroom plot ${idx + 1}: ${fungi.name}. ${timerLine}">
                        <button class="garden-plot-action" data-harvest-mushroom="${idx}" aria-label="${plot.stage >= 3 ? `Harvest ${fungi.name}` : `${fungi.name} growing`}">
                            <span class="garden-plot-emoji" aria-hidden="true">${fungi.emoji}</span>
                            <span class="garden-plot-status">${escapeHTML(fungi.name)}</span>
                            <span class="garden-plot-status">${plot.stage >= 3 ? 'Harvest' : `${progress}%`}</span>
                            <span class="garden-plot-status">${escapeHTML(timerLine)}</span>
                        </button>
                        ${plot.stage < 3 ? `<button class="garden-plot-remove" data-fertilize-mushroom="${idx}" aria-label="Apply fertilizer to ${fungi.name}"><span aria-hidden="true">🧪</span></button>` : ''}
                    </div>
                `;
            });

            const expansionTier = garden.expansionTier || 0;
            const nextExpansion = GARDEN_EXPANSION_TIERS[expansionTier] || null;
            const expansionHint = nextExpansion
                ? `${nextExpansion.name}: ${nextExpansion.additionalPlots} plots for ${nextExpansion.costCoins} coins (needs ${nextExpansion.requiredHarvests} harvests)`
                : 'All expansions unlocked';

            const discoveries = Object.keys(garden.crossbreeding.discoveries || {}).map((cropId) => GARDEN_CROPS[cropId]).filter(Boolean);
            const discoveryHintHTML = discoveries.length > 0
                ? discoveries.map((crop) => `<span class="garden-inventory-item">${crop.seedEmoji} ${escapeHTML(crop.name)} discovered</span>`).join('')
                : '<span class="garden-inventory-item">Unknown combinations await discovery.</span>';
            const debugCrossLogs = Array.isArray(garden.crossbreeding.logs) ? garden.crossbreeding.logs.slice(0, 8) : [];
            const crossLogHTML = (isGardenDebugEnabled() && debugCrossLogs.length > 0)
                ? `<details><summary>Debug crossbreeding logs</summary><div class="garden-plot-status">${debugCrossLogs.map((entry) => escapeHTML(entry)).join('<br>')}</div></details>`
                : '';

            gardenSection.innerHTML = `
                <div class="garden-title"><span aria-hidden="true">🌱 ${seasonData ? seasonData.icon : ''}</span> My Garden</div>
                <div class="garden-subtitle" style="font-size:0.82rem;color:#6d4c41;margin-bottom:8px;">Seed stock: ${Object.entries((gameState.economy && gameState.economy.inventory && gameState.economy.inventory.seeds) || {}).filter(([, c]) => c > 0).map(([cropId, count]) => `${(GARDEN_CROPS[cropId] ? GARDEN_CROPS[cropId].seedEmoji : '🌱')}x${count}`).join(' · ') || 'None'}</div>
                <div class="garden-plots">${plotsHTML}</div>
                ${inventoryHTML}
                <div class="garden-inventory">
                    <strong>🏡 Expansion:</strong> ${escapeHTML(expansionHint)}
                    <div class="garden-inventory-items">
                        <button class="garden-inventory-item" data-expand-garden aria-label="Unlock next garden expansion tier">Unlock Expansion</button>
                        <button class="garden-inventory-item" data-place-scarecrow aria-label="Place scarecrow">Place Scarecrow</button>
                        <button class="garden-inventory-item" data-place-sprinkler aria-label="Place sprinkler">Place Sprinkler</button>
                    </div>
                </div>
                <div class="garden-inventory">
                    <strong>🌸 Flower Garden bonus:</strong> +${Math.round(moodInfo.perDay || 0)} mood/day
                    <div class="garden-plots">${flowerPlotsHTML}</div>
                </div>
                <div class="garden-inventory">
                    <strong>♻️ Compost Bin</strong>
                    <div class="garden-plot-status">${compost.active ? `Processing ${escapeHTML(compost.active.itemId)} (${compostProgress}%)` : 'Idle'}</div>
                    <div class="garden-plot-status">${compost.queue.length} item${compost.queue.length === 1 ? '' : 's'} queued • Ready fertilizer: ${compost.readyFertilizer || 0}</div>
                    <div class="garden-inventory-items">
                        ${compostButtons || '<span class="garden-inventory-item">No compostable items</span>'}
                        <button class="garden-inventory-item" data-collect-compost aria-label="Collect fertilizer">Collect Fertilizer</button>
                    </div>
                </div>
                <div class="garden-inventory">
                    <strong>🧬 Crossbreeding</strong>
                    <div class="garden-plot-status">Plant compatible crops side by side to discover hidden seeds.</div>
                    <div class="garden-inventory-items">${discoveryHintHTML}</div>
                    ${crossLogHTML}
                </div>
                <div class="garden-inventory">
                    <strong>🐝 Beehive</strong>
                    <div class="garden-plot-status">${beehive.placed ? `Honey ${beehive.storedHoney || 0}/${beehiveCap}` : 'No beehive placed'}</div>
                    ${beehive.placed ? `<div class="garden-plot-progress" role="progressbar" aria-label="Beehive storage" aria-valuenow="${beePercent}" aria-valuemin="0" aria-valuemax="100"><div class="garden-plot-progress-fill" style="width:${beePercent}%"></div></div>` : ''}
                    <div class="garden-inventory-items">
                        <button class="garden-inventory-item" data-place-beehive aria-label="Place beehive">${beehive.placed ? 'Beehive placed' : 'Place Beehive'}</button>
                        <button class="garden-inventory-item" data-collect-honey aria-label="Collect honey">Collect Honey</button>
                    </div>
                </div>
                <div class="garden-inventory">
                    <strong>🕳️ Mushroom Cave</strong>
                    <div class="garden-plot-status">Shaded, damp plots. Rare fungi grow slowly but sell high.</div>
                    <div class="garden-plots">${mushroomHTML}</div>
                </div>
            `;

            // Add event listeners to empty plots (role="button" divs)
            gardenSection.querySelectorAll('.garden-plot.empty').forEach(plotEl => {
                const plotIdx = parseInt(plotEl.getAttribute('data-plot'));
                if (isNaN(plotIdx)) return;
                plotEl.addEventListener('click', () => {
                    openSeedPicker(plotIdx);
                });
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        plotEl.click();
                    }
                });
            });

            // Add event listeners to plot action buttons (growing/ready plots)
            gardenSection.querySelectorAll('[data-plot-action]').forEach(btn => {
                const plotIdx = parseInt(btn.getAttribute('data-plot-action'));
                if (isNaN(plotIdx)) return;
                btn.addEventListener('click', () => {
                    const plot = garden.plots[plotIdx] || null;
                    if (!plot) return;
                    if (plot.stage >= 3) {
                        harvestPlot(plotIdx);
                    } else if (!Number.isFinite(plot.wateredUntil) || plot.wateredUntil <= Date.now()) {
                        waterPlot(plotIdx);
                    } else {
                        const crop = GARDEN_CROPS[plot.cropId];
                        showToast(`${crop.seedEmoji} ${escapeHTML(crop.name)} is growing... be patient!`, '#81C784');
                    }
                });
            });

            // Add event listeners to remove buttons
            gardenSection.querySelectorAll('[data-remove-plot]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the plot click handler
                    const plotIdx = parseInt(btn.getAttribute('data-remove-plot'));
                    removeCrop(plotIdx);
                });
            });

            gardenSection.querySelectorAll('[data-fertilize-plot]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const plotIdx = parseInt(btn.getAttribute('data-fertilize-plot'));
                    if (Number.isInteger(plotIdx)) applyFertilizerToGardenPlot(plotIdx, 'garden');
                });
            });

            // Add event listeners to inventory items (feed pet)
            gardenSection.querySelectorAll('[data-feed-crop]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-feed-crop');
                    feedFromGarden(cropId);
                });
            });

            gardenSection.querySelectorAll('[data-expand-garden]').forEach((btn) => {
                btn.addEventListener('click', () => unlockNextGardenExpansionTier());
            });
            gardenSection.querySelectorAll('[data-place-scarecrow]').forEach((btn) => {
                btn.addEventListener('click', () => placeScarecrow());
            });
            gardenSection.querySelectorAll('[data-place-sprinkler]').forEach((btn) => {
                btn.addEventListener('click', () => placeSprinkler());
            });
            gardenSection.querySelectorAll('[data-place-beehive]').forEach((btn) => {
                btn.addEventListener('click', () => placeBeehive());
            });
            gardenSection.querySelectorAll('[data-collect-honey]').forEach((btn) => {
                btn.addEventListener('click', () => collectBeehiveOutput());
            });
            gardenSection.querySelectorAll('[data-compost-item]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const itemId = btn.getAttribute('data-compost-item');
                    const result = addInventoryItemToCompost(itemId);
                    if (!result.ok) {
                        if (result.reason === 'queue-full') showToast('♻️ Compost queue is full.', '#FFA726');
                        else if (result.reason === 'missing-item') showToast('♻️ Item not available.', '#FFA726');
                    } else {
                        showToast(`♻️ Added ${itemId} to compost.`, '#66BB6A');
                        renderGardenUI();
                    }
                });
            });
            gardenSection.querySelectorAll('[data-collect-compost]').forEach((btn) => {
                btn.addEventListener('click', () => collectCompostOutput());
            });

            gardenSection.querySelectorAll('[data-flower-plot]').forEach((plotEl) => {
                const plotIdx = parseInt(plotEl.getAttribute('data-flower-plot'));
                if (!Number.isInteger(plotIdx)) return;
                plotEl.addEventListener('click', () => openFlowerPicker(plotIdx));
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openFlowerPicker(plotIdx);
                    }
                });
            });
            gardenSection.querySelectorAll('[data-trim-flower]').forEach((btn) => {
                const plotIdx = parseInt(btn.getAttribute('data-trim-flower'));
                if (!Number.isInteger(plotIdx)) return;
                btn.addEventListener('click', () => trimFlower(plotIdx));
            });

            gardenSection.querySelectorAll('[data-mushroom-plot]').forEach((plotEl) => {
                const plotIdx = parseInt(plotEl.getAttribute('data-mushroom-plot'));
                if (!Number.isInteger(plotIdx)) return;
                plotEl.addEventListener('click', () => openMushroomPicker(plotIdx));
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openMushroomPicker(plotIdx);
                    }
                });
            });
            gardenSection.querySelectorAll('[data-harvest-mushroom]').forEach((btn) => {
                const plotIdx = parseInt(btn.getAttribute('data-harvest-mushroom'));
                if (!Number.isInteger(plotIdx)) return;
                btn.addEventListener('click', () => harvestMushroom(plotIdx));
            });
            gardenSection.querySelectorAll('[data-fertilize-mushroom]').forEach((btn) => {
                const plotIdx = parseInt(btn.getAttribute('data-fertilize-mushroom'));
                if (!Number.isInteger(plotIdx)) return;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyFertilizerToGardenPlot(plotIdx, 'mushroomCave');
                });
            });
        }

        // ==================== SEASONAL ACTIVITY ====================

        function performSeasonalActivity() {
            if (!gameState.pet) return;

            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            if (!seasonData) return;

            const pet = gameState.pet;
            const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            // Apply effects
            for (const [stat, value] of Object.entries(seasonData.activityEffects)) {
                if (pet[stat] !== undefined) {
                    pet[stat] = clamp(pet[stat] + value, 0, 100);
                }
            }

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;

            // Track caretaker action counts
            trackCareAction('play');

            // Play pet voice sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.playSFXByName('petExcited', (ctx) => SoundManager.sfx.petExcited(ctx, pet.type));
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('play');

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof SoundManager !== 'undefined') SoundManager.playSFX(SoundManager.sfx.achievement);
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }
            if (typeof checkBadges === 'function') {
                const nb = checkBadges();
                nb.forEach(b => setTimeout(() => showToast(`${b.icon} Badge: ${b.name}!`, typeof BADGE_TIERS !== 'undefined' && BADGE_TIERS[b.tier] ? BADGE_TIERS[b.tier].color : '#FFD700'), 500));
            }
            if (typeof checkStickers === 'function') {
                const ns = checkStickers();
                ns.forEach(s => setTimeout(() => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'), 700));
            }
            if (typeof checkTrophies === 'function') {
                const nt = checkTrophies();
                nt.forEach(t => setTimeout(() => showToast(`${t.icon} Trophy: ${t.name}!`, '#FFD700'), 900));
            }

            const message = `${petData.emoji} ${escapeHTML(pet.name || petData.name)} ${randomFromArray(seasonData.activityMessages)}`;
            showToast(message, '#FFB74D');

            // Check for memory moments
            checkAndShowMemoryMoment(pet);

            // Check for growth stage transition
            if (checkGrowthMilestone(pet)) {
                saveGame();
                renderPetPhase();
                return;
            }

            if (petContainer) {
                petContainer.classList.add('wiggle');
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); }, 1200);
            }
            if (sparkles) createHearts(sparkles);

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();
        }

        // ==================== DECAY TIMER ====================

        let decayInterval = null;
        let lastDecayAnnouncement = 0;
        let pendingRenderTimer = null;

        function startDecayTimer() {
            if (decayInterval) clearInterval(decayInterval);
            lastDecayAnnouncement = 0;
            const profileConfig = (typeof getBalanceProfileConfig === 'function') ? getBalanceProfileConfig() : { liveDecayMultiplier: 1, decayTickMs: 30000 };
            const decayTickMs = Math.max(10000, Number(profileConfig.decayTickMs) || 30000);

            // Decrease needs every 30 seconds (gentle for young children)
            decayInterval = setInterval(() => {
                if (gameState.phase === 'pet' && gameState.pet && !document.hidden) {
                    ensureExplorationState();
                    updateExplorationUnlocks(true);
                    const expeditionResult = resolveExpeditionIfReady(false, false);
                    if (expeditionResult && expeditionResult.ok) {
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                    }

                    const pet = gameState.pet;
                    const weather = gameState.weather || 'sunny';
                    const weatherData = WEATHER_TYPES[weather] || WEATHER_TYPES['sunny'];
                    const room = ROOMS[gameState.currentRoom || 'bedroom'];
                    const isOutdoor = room ? room.isOutdoor : false;

                    // Snapshot stats before decay to detect low-stat threshold crossing
                    const prevHunger = pet.hunger;
                    const prevClean = pet.cleanliness;
                    const prevHappy = pet.happiness;
                    const prevEnergy = pet.energy;

                    // Day/Night cycle energy modifiers
                    const timeOfDay = gameState.timeOfDay || 'day';
                    let energyDecayBonus = 0;
                    let energyRegenBonus = 0;
                    if (timeOfDay === 'day') {
                        energyDecayBonus = 1; // Pet is active during the day — energy decays faster
                    } else if (timeOfDay === 'night') {
                        energyRegenBonus = 2; // Pet rests at night — energy recovers
                    } else if (timeOfDay === 'sunset') {
                        energyRegenBonus = 1; // Pet starts winding down, slight recovery
                    } else if (timeOfDay === 'sunrise') {
                        energyRegenBonus = 1; // Energy recovers slightly in the morning
                    }

                    // Personality-driven decay multipliers
                    const pTrait = pet.personality && PERSONALITY_TRAITS[pet.personality];
                    const pMods = pTrait ? pTrait.statModifiers : null;
                    const hungerMult = pMods ? pMods.hungerDecayMultiplier : 1;
                    const cleanMult = pMods ? pMods.cleanlinessDecayMultiplier : 1;
                    const happyMult = pMods ? pMods.happinessDecayMultiplier : 1;
                    const energyMult = pMods ? pMods.energyDecayMultiplier : 1;
                    const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
                    const stageBalance = getStageBalance(stage);
                    const stageDecayMult = stageBalance.needDecayMultiplier || 1;
                    const profileLiveDecayMult = Math.max(0, Number((typeof getBalanceProfileConfig === 'function' ? getBalanceProfileConfig().liveDecayMultiplier : 1)) || 1);
                    // Report #8: Pet Spa specifically softens cleanliness decay.
                    const petSpaCleanMult = Number(getPrestigeEffectValue('petSpa', 'cleanlinessDecayMultiplier', 1)) || 1;

                    // Elder wisdom reduces decay
                    const elderReduction = pet.growthStage === 'elder' ? ELDER_CONFIG.wisdomDecayReduction : 1;

                    // Stage-aware base decay with probabilistic fractional handling.
                    pet.hunger = applyProbabilisticDelta(pet.hunger, 1 * hungerMult * elderReduction * stageDecayMult * profileLiveDecayMult, 'down');
                    pet.cleanliness = applyProbabilisticDelta(pet.cleanliness, 1 * cleanMult * elderReduction * stageDecayMult * profileLiveDecayMult * petSpaCleanMult, 'down');
                    pet.happiness = applyProbabilisticDelta(pet.happiness, 1 * happyMult * elderReduction * stageDecayMult * profileLiveDecayMult, 'down');
                    const baseEnergyDelta = (1 + energyDecayBonus - energyRegenBonus);
                    if (baseEnergyDelta >= 0) {
                        pet.energy = applyProbabilisticDelta(pet.energy, baseEnergyDelta * energyMult * elderReduction * stageDecayMult * profileLiveDecayMult, 'down');
                    } else {
                        const energyRecoveryMult = energyMult > 0 ? (1 / energyMult) : 1;
                        const recoveryStageMod = Math.max(0.7, 1 - ((stageDecayMult - 1) * 0.25));
                        pet.energy = applyProbabilisticDelta(pet.energy, Math.abs(baseEnergyDelta) * energyRecoveryMult * recoveryStageMod, 'up');
                    }

                    // Extra weather-based decay when outdoors
                    if (isOutdoor) {
                        pet.happiness = applyProbabilisticDelta(pet.happiness, weatherData.happinessDecayModifier * stageDecayMult * profileLiveDecayMult, 'down');
                        pet.energy = applyProbabilisticDelta(pet.energy, weatherData.energyDecayModifier * stageDecayMult * profileLiveDecayMult, 'down');
                        pet.cleanliness = applyProbabilisticDelta(pet.cleanliness, weatherData.cleanlinessDecayModifier * stageDecayMult * profileLiveDecayMult * petSpaCleanMult, 'down');
                    }

                    // Neglect pressure scales up by stage and targets the weakest need.
                    const neglectThreshold = stageBalance.neglectThreshold || 20;
                    const isNeglectingNow = pet.hunger < neglectThreshold || pet.cleanliness < neglectThreshold || pet.happiness < neglectThreshold || pet.energy < neglectThreshold;
                    if (isNeglectingNow) {
                        const lowestNeed = getLowestNeedStatKey(pet);
                        if (lowestNeed) {
                            pet[lowestNeed] = applyProbabilisticDelta(pet[lowestNeed], 0.45 * stageDecayMult, 'down');
                        }
                        pet.happiness = applyProbabilisticDelta(pet.happiness, 0.2 * stageDecayMult, 'down');
                    }

                    // Announce when any stat drops below 20% (threshold crossing)
                    const lowThreshold = neglectThreshold;
                    const petName = getPetDisplayName(pet);
                    const lowStats = [];
                    if (pet.hunger < lowThreshold && prevHunger >= lowThreshold) lowStats.push('hunger');
                    if (pet.cleanliness < lowThreshold && prevClean >= lowThreshold) lowStats.push('cleanliness');
                    if (pet.happiness < lowThreshold && prevHappy >= lowThreshold) lowStats.push('happiness');
                    if (pet.energy < lowThreshold && prevEnergy >= lowThreshold) lowStats.push('energy');
                    if (lowStats.length > 0) {
                        announce(`Warning: ${petName}'s ${lowStats.join(' and ')} ${lowStats.length === 1 ? 'is' : 'are'} critically low!`, true);
                        // Play sad pet whimper when stats drop critically
                        if (typeof SoundManager !== 'undefined' && pet.type) {
                            SoundManager.playSFXByName('petSad', (ctx) => SoundManager.sfx.petSad(ctx, pet.type));
                        }
                        // Haptic alert for critical stat drop
                        hapticPattern('critical');

                        // Show personality-specific low stat reaction
                        if (typeof getLowStatReaction === 'function') {
                            const reactionStat = lowStats[0];
                            const reaction = getLowStatReaction(pet, reactionStat);
                            if (reaction) {
                                setTimeout(() => showToast(reaction, '#FF7043'), 500);
                            }
                        }

                        // Mark pet as neglected for recovery arc
                        if (!pet._isNeglected && typeof beginNeglectRecoveryArc === 'function') {
                            beginNeglectRecoveryArc(pet, 'critical-need-drop');
                        } else {
                            pet._isNeglected = true;
                            pet._neglectRecoveryStep = 0;
                        }
                    }

                    // Apply passive decay to non-active pets (gentler rate)
                    if (gameState.pets && gameState.pets.length > 1) {
                        // Sync active pet to array first so its decayed stats are preserved
                        syncActivePetToArray();
                        gameState.pets.forEach((p, idx) => {
                            if (!p || idx === gameState.activePetIndex) return;
                            const pStage = p.growthStage && GROWTH_STAGES[p.growthStage] ? p.growthStage : 'baby';
                            const pStageBalance = getStageBalance(pStage);
                            const pDecayMult = pStageBalance.needDecayMultiplier || 1;
                            const pProfileMult = Math.max(0, Number((typeof getBalanceProfileConfig === 'function' ? getBalanceProfileConfig().liveDecayMultiplier : 1)) || 1);
                            const pSpaCleanMult = Number(getPrestigeEffectValue('petSpa', 'cleanlinessDecayMultiplier', 1)) || 1;
                            p.hunger = normalizePetNeedValue(p.hunger, 70);
                            p.cleanliness = normalizePetNeedValue(p.cleanliness, 70);
                            p.happiness = normalizePetNeedValue(p.happiness, 70);
                            p.energy = normalizePetNeedValue(p.energy, 70);
                            p.hunger = applyProbabilisticDelta(p.hunger, 0.5 * pDecayMult * pProfileMult, 'down');
                            p.cleanliness = applyProbabilisticDelta(p.cleanliness, 0.5 * pDecayMult * pProfileMult * pSpaCleanMult, 'down');
                            // Net happiness: -0.5 decay + companion bonus (dynamically calculated)
                            const companionBonus = (gameState.pets.length > 1) ? 0.3 : 0;
                            p.happiness = applyProbabilisticDelta(p.happiness, Math.max(0, (0.5 - companionBonus) * pDecayMult * pProfileMult), 'down');
                            p.energy = applyProbabilisticDelta(p.energy, 0.5 * pDecayMult * pProfileMult, 'down');

                            // Track neglect for non-active pets (reuse per-pet tick counter)
                            const pid = p.id;
                            if (pid != null) {
                                if (!_neglectTickCounters[pid]) _neglectTickCounters[pid] = 0;
                                _neglectTickCounters[pid]++;
                                if (_neglectTickCounters[pid] >= 10) {
                                    _neglectTickCounters[pid] = 0;
                                    const neglectThreshold = pStageBalance.neglectThreshold || 20;
                                    const neglected = p.hunger < neglectThreshold || p.cleanliness < neglectThreshold || p.happiness < neglectThreshold || p.energy < neglectThreshold;
                                    if (neglected) {
                                        p.neglectCount = adjustNeglectCount(p.neglectCount, pStageBalance.neglectGainMultiplier || 1, 'up');
                                    } else if ((p.neglectCount || 0) > 0) {
                                        p.neglectCount = adjustNeglectCount(p.neglectCount, pStageBalance.neglectRecoveryMultiplier || 1, 'down');
                                    }
                                }
                            }

                            // Keep care quality current for inactive pets as their stats drift.
                            updateCareHistory(p);
                        });
                    }

                    // Check for weather changes
                    checkWeatherChange();

                    // Check seasonal narrative events periodically
                    if (typeof checkSeasonalNarrativeEvent === 'function') {
                        checkSeasonalNarrativeEvent();
                    }

                    // Update time of day and refresh display if changed
                    const newTimeOfDay = getTimeOfDay();
                    if (gameState.timeOfDay !== newTimeOfDay) {
                        const previousTime = gameState.timeOfDay;
                        gameState.timeOfDay = newTimeOfDay;
                        updateDayNightDisplay();

                        // Announce time-of-day changes (Item 24)
                        if (_lastAnnouncedTimeOfDay && gameState.timeOfDay !== _lastAnnouncedTimeOfDay) {
                            const timeLabels = { day: 'Daytime', sunset: 'Evening', night: 'Nighttime', sunrise: 'Sunrise' };
                            announce(`Time changed to ${timeLabels[gameState.timeOfDay] || gameState.timeOfDay}.`);
                        }
                        _lastAnnouncedTimeOfDay = gameState.timeOfDay;

                        // Morning energy boost when transitioning to sunrise
                        if (newTimeOfDay === 'sunrise' && previousTime === 'night') {
                            pet.energy = clamp(pet.energy + 15, 0, 100);
                            const morningPetName = getPetDisplayName(pet);
                            announce(`Good morning! ${morningPetName} wakes up feeling refreshed!`);
                        }
                        // Nighttime sleepiness notification
                        if (newTimeOfDay === 'night') {
                            announce(`It's getting late! ${getPetDisplayName(pet)} is getting sleepy...`);
                        }
                        // Sunset wind-down notification
                        if (newTimeOfDay === 'sunset') {
                            announce(`The sun is setting. ${getPetDisplayName(pet)} is starting to wind down.`);
                        }
                    }

                    // Check for season changes
                    const newSeason = getCurrentSeason();
                    if (gameState.season !== newSeason) {
                        gameState.season = newSeason;
                        const activeRoom = gameState.currentRoom || 'bedroom';
                        applyRoomArtifactTrigger(`season:${newSeason}`, { sourceRoom: activeRoom });
                        setAmbientTone(newSeason === 'winter' ? 'steady' : (newSeason === 'autumn' ? 'softening' : 'bright'), `season:${newSeason}`, 16000);
                        const seasonData = SEASONS[newSeason];
                        showToast(`${seasonData.icon} ${seasonData.name} has arrived!`, '#FFB74D');
                        // Cancel any deferred render from a previous tick's care-quality change
                        if (pendingRenderTimer) {
                            clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = null;
                        }
                        // Re-render to update seasonal decorations
                        renderPetPhase();
                        return; // renderPetPhase will handle the rest
                    }

                    // Tick breeding eggs once per minute, independent of the 30s decay loop
                    const ticksDue = consumeBreedingIncubationTicks(Date.now());
                    const hatchedEggs = [];
                    for (let t = 0; t < ticksDue; t++) {
                        const newlyHatched = tickBreedingEggs();
                        if (newlyHatched.length > 0) hatchedEggs.push(...newlyHatched);
                    }
                    if (hatchedEggs.length > 0) {
                        for (const egg of hatchedEggs) {
                            const typeData = getAllPetTypeData(egg.offspringType);
                            const typeName = typeData ? typeData.name : egg.offspringType;
                            let msg = `🥚 A breeding egg has hatched into a ${typeName}!`;
                            if (egg.hasMutation) msg += ' It has a rare mutation!';
                            if (egg.isHybrid) msg += ' It\'s a hybrid!';
                            showToast(msg, '#E040FB');
                            announce(msg, true);
                            hapticPattern('achievement');
                            // Store hatched egg for player to collect
                            if (!gameState.hatchedBreedingEggs) gameState.hatchedBreedingEggs = [];
                            gameState.hatchedBreedingEggs.push(egg);
                        }
                        // Update breeding egg display if visible
                        if (typeof updateBreedingEggDisplay === 'function') {
                            updateBreedingEggDisplay();
                        }
                    }

                    // Update care quality tracking
                    const careQualityChange = updateCareHistory(pet);

                    // Check for growth milestones
                    checkGrowthMilestone(pet);

                    updateNeedDisplays(true);
                    updatePetMood();
                    updateWellnessBar();
                    saveGame();

                    // Notify user of care quality changes (after updates to avoid issues)
                    if (careQualityChange && careQualityChange.changed) {
                        const toData = CARE_QUALITY[careQualityChange.to];
                        const petName = getPetDisplayName(pet);

                        if (careQualityChange.improved) {
                            // Combine quality + evolution into a single toast when applicable
                            if (careQualityChange.to === 'excellent' && pet.growthStage === 'adult') {
                                showToast(`${toData.emoji} Care quality: Excellent! Your pet can now evolve!`, '#FFD700');
                            } else {
                                showToast(`${toData.emoji} Care quality improved to ${toData.label}!`, '#66BB6A');
                            }
                        } else {
                            showToast(`${toData.emoji} Care quality changed to ${toData.label}`, '#FFB74D');
                        }

                        // Re-render to show appearance changes (debounced to avoid rapid re-renders).
                        // Track the timer so a synchronous renderPetPhase() (e.g. from a
                        // season change in a later tick) can cancel it to prevent a double render.
                        if (typeof renderPetPhase === 'function' && !careQualityChange.skipRender) {
                            if (pendingRenderTimer) clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = setTimeout(() => {
                                pendingRenderTimer = null;
                                renderPetPhase();
                            }, 100);
                        }
                    }

                    // Gentle reminders at low levels (no negative messages)
                    // But don't spam - only announce every 2 minutes max
                    const now = Date.now();
                    if (now - lastDecayAnnouncement > 120000) {
                        const mood = getMood(pet);
                        if (mood === 'sad') {
                            const lowNeeds = [];
                            if (pet.hunger <= 20) lowNeeds.push('hungry');
                            if (pet.cleanliness <= 20) lowNeeds.push('needs a bath');
                            if (pet.energy <= 20) lowNeeds.push('tired');
                            if (pet.happiness <= 20) lowNeeds.push('wants to play');
                            if (lowNeeds.length > 0) {
                                announce(`Your pet is ${lowNeeds.join(' and ')}! Can you help?`);
                                lastDecayAnnouncement = now;
                            }
                        }
                    }
                } else if (document.hidden && gameState.phase === 'pet') {
                    // Keep incubation aligned to visible playtime only.
                    gameState.lastBreedingIncubationTick = Date.now();
                }
            }, decayTickMs); // Report #10: Balance-profile-controlled tick rate.
        }

        function updateContextIndicator() {
            const el = document.getElementById('context-indicator');
            if (!el) return;
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
            const timeIcon = getTimeIcon(timeOfDay);
            const season = SEASONS[gameState.season] ? gameState.season : getCurrentSeason();
            const seasonData = SEASONS[season];
            const contextLabel = `${weatherData.name}, ${timeLabel}, ${seasonData.name}`;
            el.innerHTML = `<span aria-hidden="true">${weatherData.icon}</span><span aria-hidden="true">${timeIcon}</span><span aria-hidden="true">${seasonData.icon}</span><span class="status-text" aria-hidden="true">${contextLabel}</span>`;
            el.setAttribute('aria-label', contextLabel);
        }

        function updateDayNightDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;
            refreshSessionPhase();

            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Update class
            petArea.classList.remove('daytime', 'nighttime', 'sunset', 'sunrise');
            petArea.classList.add(timeClass);
            const toneFromTime = timeOfDay === 'night' ? 'steady' : (timeOfDay === 'sunset' ? 'softening' : 'bright');
            setAmbientTone(toneFromTime, `timeofday:${timeOfDay}`, 15000);
            maybeFinishAmbientTransition();
            const ambient = ensureAmbientState();
            const ambientProgress = getAmbientTransitionProgress();
            petArea.setAttribute('data-ambient-tone', ambient.target || 'settled');
            petArea.setAttribute('data-ambient-progress', ambientProgress.toFixed(2));
            petArea.style.setProperty('--ambient-transition-progress', ambientProgress.toFixed(2));
            petArea.classList.remove('ambient-tone-settled', 'ambient-tone-fragile', 'ambient-tone-softening', 'ambient-tone-steady', 'ambient-tone-bright');
            petArea.classList.add(`ambient-tone-${ambient.target || 'settled'}`);

            // Update room background for new time of day
            petArea.style.background = getRoomBackground(currentRoom, timeOfDay);
            const roomCustom = getRoomCustomization(currentRoom);
            const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
            const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
            petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
            petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
            const themeMode = getRoomThemeMode(currentRoom, gameState.pet);
            petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
            petArea.classList.add(`pet-theme-${themeMode}`);

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();

            // Update room decor for time of day
            const decor = petArea.querySelector('.room-decor');
            if (decor) {
                decor.innerHTML = getRoomDecor(currentRoom, timeOfDay);
            }

            // Update celestial elements - remove all existing ones first
            const existingStars = petArea.querySelector('.stars-overlay');
            const existingMoon = petArea.querySelector('.moon');
            const existingSun = petArea.querySelector('.sun');
            petArea.querySelectorAll('.cloud').forEach(c => c.remove());

            if (existingStars) existingStars.remove();
            if (existingMoon) existingMoon.remove();
            if (existingSun) existingSun.remove();

            // Only add celestial elements for outdoor rooms
            if (isOutdoor) {
                if (timeOfDay === 'night') {
                    const starsOverlay = document.createElement('div');
                    starsOverlay.className = 'stars-overlay';
                    starsOverlay.innerHTML = generateStarsHTML();
                    petArea.insertBefore(starsOverlay, petArea.firstChild);

                    const moon = document.createElement('div');
                    moon.className = 'moon';
                    petArea.insertBefore(moon, petArea.children[1]);
                } else if (timeOfDay === 'day') {
                    const sun = document.createElement('div');
                    sun.className = 'sun';
                    petArea.insertBefore(sun, petArea.firstChild);

                    const cloud1 = document.createElement('div');
                    cloud1.className = 'cloud';
                    cloud1.style.cssText = 'top:12px;left:-30px;';
                    cloud1.textContent = '☁️';
                    petArea.appendChild(cloud1);

                    const cloud2 = document.createElement('div');
                    cloud2.className = 'cloud';
                    cloud2.style.cssText = 'top:35px;left:20%;';
                    cloud2.textContent = '☁️';
                    petArea.appendChild(cloud2);
                } else if (timeOfDay === 'sunrise' || timeOfDay === 'sunset') {
                    const cloud = document.createElement('div');
                    cloud.className = 'cloud';
                    cloud.style.cssText = 'top:18px;left:10%;';
                    cloud.textContent = '☁️';
                    petArea.appendChild(cloud);
                }
            }

            // Update weather visuals
            updateWeatherDisplay();
        }

        function updateWeatherDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            const weatherData = WEATHER_TYPES[weather];
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;
            maybeFinishAmbientTransition();
            const ambient = ensureAmbientState();
            petArea.setAttribute('data-ambient-tone', ambient.target || 'settled');
            petArea.setAttribute('data-ambient-progress', getAmbientTransitionProgress().toFixed(2));

            // Remove all old weather overlays (querySelectorAll to catch duplicates)
            petArea.querySelectorAll('.weather-overlay').forEach(el => el.remove());

            // Remove old weather classes
            petArea.classList.remove('weather-rainy', 'weather-snowy');

            // Add new weather effects for outdoor rooms
            if (isOutdoor && weather !== 'sunny') {
                petArea.classList.add(`weather-${weather}`);
                const weatherEl = document.createElement('div');
                weatherEl.innerHTML = generateWeatherHTML(weather);
                const overlay = weatherEl.firstChild;
                if (overlay) petArea.appendChild(overlay);
            }

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();
        }

        function stopDecayTimer() {
            if (decayInterval) {
                clearInterval(decayInterval);
                decayInterval = null;
            }
            if (pendingRenderTimer) {
                clearTimeout(pendingRenderTimer);
                pendingRenderTimer = null;
            }
        }

        // ==================== VISIBILITY HANDLING ====================

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
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
                // Mutate in-place so closures that captured the gameState
                // reference (e.g. timer callbacks) keep working.
                // Assign first, then delete stale keys, to avoid a window
                // where properties are undefined if a timer callback fires.
                const oldKeys = new Set(Object.keys(gameState));
                Object.assign(gameState, saved);
                const newKeys = new Set(Object.keys(saved));
                for (const k of oldKeys) {
                    if (!newKeys.has(k)) delete gameState[k];
                }
            }
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
                gameState.garden = createDefaultGardenState(Date.now());
            }

            // Ensure adultsRaised exists
            if (typeof gameState.adultsRaised !== 'number') {
                gameState.adultsRaised = 0;
            }
            ensureRoomSystemsState();
            ensureSessionPhaseState();
            startSessionCycle();
            ensureAmbientState();
            ensureExplorationState();
            ensureEconomyState();
            ensureMiniGameExpansionState();
            ensureGardenSystemsState();
	            ensureReminderState();
	            ensureMasteryState();
	            ensureRetentionMetaState();
	            getJourneyStartDate();
	            const awayDays = updateReactivationStateOnLogin();
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
            if (!gameState.streak.prestige || typeof gameState.streak.prestige !== 'object') {
                gameState.streak.prestige = { cycleMonth: '', cycleBest: 0, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
            }
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
	            const streakStatus = updateStreak();
	            evaluateJourneyProgress('login');
	            const noveltyUnlocks = evaluateNoveltyScheduler('login');
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
            if (streakStatus && streakStatus.lastOutcome && (streakStatus.lastMissedDays > 0 || streakStatus.lastFreezeUsed > 0)) {
                setTimeout(() => {
                    const tokenHint = streakStatus.freezeTokens > 0
                        ? ` You have ${streakStatus.freezeTokens} freeze token${streakStatus.freezeTokens === 1 ? '' : 's'} left.`
                        : '';
                    showToast(`💛 ${streakStatus.lastOutcome}${tokenHint}`, '#66BB6A');
                }, 520);
            }
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
	                if (awayDays > 0) {
	                    const reactiveLine = getReactiveReturnDialogue();
	                    if (reactiveLine) {
	                        setTimeout(() => {
	                            showToast(`🐾 ${reactiveLine}`, '#8BC34A');
	                        }, 420);
	                    }
	                }
	                if (Array.isArray(noveltyUnlocks) && noveltyUnlocks.length > 0) {
	                    noveltyUnlocks.slice(0, 2).forEach((unlock, idx) => {
	                        setTimeout(() => {
	                            showToast(`✨ New unlock: ${unlock.title || unlock.label || 'Journey novelty'}`, '#7E57C2');
	                        }, 700 + (idx * 220));
	                    });
	                }
	                if (gameState.goalLadder && gameState.goalLadder.now && gameState.goalLadder.next) {
	                    setTimeout(() => {
	                        showToast(`🧭 Now: ${gameState.goalLadder.now.label} · Next: ${gameState.goalLadder.next.label}`, '#42A5F5');
	                    }, 900);
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
	                const returnRecap = consumeReturnRecap();
	                if (returnRecap && typeof showReturnMemoryRecapModal === 'function') {
	                    setTimeout(() => showReturnMemoryRecapModal(returnRecap), 640);
	                } else if (returnRecap && awayDays > 1) {
	                    setTimeout(() => {
	                        showToast(`📘 While you were away: ${returnRecap.awayDays} days passed. Journey day ${returnRecap.journeyDay}.`, '#5C6BC0');
	                    }, 640);
	                }
	                // Show streak notification if bonus available (only if no welcome-back modal shown)
	                if (gameState.streak && gameState.streak.current > 0 && !gameState.streak.todayBonusClaimed && !gameState._hadOfflineChangesOnLoad) {
                    setTimeout(() => {
                        showToast(`🔥 ${gameState.streak.current}-day streak! Tap Rewards to claim bonus!`, '#FF6D00');
                    }, 1500);
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

        // Dismiss the splash/loading screen after init completes (or fails)
        function dismissSplash() {
            if (typeof window !== 'undefined' && typeof window.dismissSplashScreen === 'function') {
                window.dismissSplashScreen();
                return;
            }
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

        // Start the game when page loads
        document.addEventListener('DOMContentLoaded', () => {
            try {
                init();
            } finally {
                // Never leave users trapped behind a permanent loading overlay.
                dismissSplash();
            }
        });

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

        // ==================== CARETAKER & NARRATIVE SYSTEMS ====================

        // Track care actions for caretaker title/style and room memory counts
        function trackCareAction(actionType) {
            if (!gameState.caretakerActionCounts) {
                gameState.caretakerActionCounts = { feed: 0, wash: 0, play: 0, sleep: 0, medicine: 0, groom: 0, exercise: 0, treat: 0, cuddle: 0 };
            }
            if (gameState.caretakerActionCounts[actionType] !== undefined) {
                gameState.caretakerActionCounts[actionType]++;
            }

            // Recommendation #1: Care momentum bonus
            // Track recent care action timestamps; grant careRush when 3+ actions in 5 minutes
            if (!Array.isArray(gameState._careActionTimestamps)) gameState._careActionTimestamps = [];
            const now = Date.now();
            gameState._careActionTimestamps.push(now);
            const fiveMinAgo = now - 5 * 60 * 1000;
            gameState._careActionTimestamps = gameState._careActionTimestamps.filter(t => t > fiveMinAgo);
            if (gameState._careActionTimestamps.length >= 3) {
                const alreadyActive = Array.isArray(gameState.rewardModifiers) && gameState.rewardModifiers.some(m => m.typeId === 'careRush' && (!m.expiresAt || m.expiresAt > now) && (m.remainingActions === null || m.remainingActions > 0));
                if (!alreadyActive && typeof addGameplayModifier === 'function') {
                    addGameplayModifier('careRush', 'Care Momentum');
                    if (typeof showToast === 'function') showToast('⚡ Care Rush! 3+ actions in 5 min — bonus activated!', '#FF9800');
                    gameState._careActionTimestamps = [];
                }
            }

            // Track room-specific action counts on the pet
            const pet = gameState.pet;
            if (pet) {
                if (!pet._roomActionCounts) {
                    pet._roomActionCounts = { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 };
                }
                const room = gameState.currentRoom || 'bedroom';
                if (actionType === 'feed' || actionType === 'treat') pet._roomActionCounts.feedCount++;
                if (actionType === 'sleep') pet._roomActionCounts.sleepCount++;
                if (actionType === 'wash' || actionType === 'groom') pet._roomActionCounts.washCount++;
                if (actionType === 'play' || actionType === 'exercise') pet._roomActionCounts.playCount++;
                if (room === 'park') pet._roomActionCounts.parkVisits++;
                recordRoomCareAction(room, actionType);
                maybeShowRoomUnlockForeshadow(actionType);

                // Multi-session neglect recovery arc.
                const arc = ensureNeglectRecoveryArcState(pet);
                if (arc && arc.active) {
                    const arcBefore = arc.stage;
                    const recovery = advanceNeglectRecoveryArc(pet, actionType);
                    if (recovery.changed || recovery.completed) {
                        const stageData = getNeglectStageData(recovery.stage);
                        const recoveryMsg = (typeof getNeglectRecoveryMessage === 'function')
                            ? getNeglectRecoveryMessage(pet, Math.max(1, arc.progressCare))
                            : stageData.cue;
                        if (recoveryMsg) {
                            setTimeout(() => showToast(recoveryMsg, stageData.color || '#CE93D8', { tier: recovery.completed ? 'ceremony' : 'moment' }), 700);
                        }
                        if (recovery.completed) {
                            showToast(`🌤️ ${getPetDisplayName(pet)} is thriving again. The healing arc is complete.`, '#66BB6A', { tier: 'ceremony', assertive: true });
                            addJournalEntry('🌤️', `${getPetDisplayName(pet)} fully recovered after a long care arc.`);
                            noteSessionCeremony(90000);
                        } else if (arcBefore !== recovery.stage) {
                            showToast(`💗 Recovery stage: ${stageData.id.charAt(0).toUpperCase()}${stageData.id.slice(1)} (${arc.progressCare} care actions, ${arc.uniqueActions} unique).`, '#81C784', { tier: 'moment', announce: false });
                        }
                    } else if (arc.progressCare > 0 && arc.progressCare % 5 === 0) {
                        const stageData = getNeglectStageData(arc.stage);
                        showToast(`🧭 Healing arc progress: ${arc.progressCare} supportive actions, ${arc.uniqueActions} unique care types.`, stageData.color || '#B39DDB', { tier: 'micro', announce: false });
                    }
                }
            }

            refreshSessionPhase();
            updateCaretakerIdentityProfile();

            // Check caretaker title upgrade
            const totalActions = Object.values(gameState.caretakerActionCounts).reduce((s, v) => s + v, 0);
            if (typeof getCaretakerTitle === 'function') {
                const newTitle = getCaretakerTitle(totalActions);
                if (!gameState.lastCaretakerTitle) gameState.lastCaretakerTitle = 'newcomer';
                if (newTitle !== gameState.lastCaretakerTitle) {
                    gameState.caretakerTitle = newTitle;
                    const titleData = typeof getCaretakerTitleData === 'function' ? getCaretakerTitleData(totalActions) : null;
                    if (titleData) {
                        showToast(`${titleData.emoji} Title upgraded: ${titleData.label}! ${titleData.description}`, '#FFD700');
                        addJournalEntry(titleData.emoji, `Earned the title: ${titleData.label}!`);
                    }
                    gameState.lastCaretakerTitle = newTitle;
                }
            }
        }

        // Track garden harvest for room memories
        function trackHarvest() {
            const pet = gameState.pet;
            if (pet) {
                if (!pet._roomActionCounts) {
                    pet._roomActionCounts = { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 };
                }
                pet._roomActionCounts.harvestCount++;
            }
        }

        // Check and show memory moments
        function checkAndShowMemoryMoment(pet) {
            if (!pet || typeof getMemoryMoment !== 'function') return;
            const moment = getMemoryMoment(pet);
            if (moment) {
                setTimeout(() => {
                    showToast(`📸 ${moment}`, '#B39DDB');
                    addJournalEntry('📸', moment);
                }, 1200);
            }
        }

        // Check for seasonal narrative events (called from decay timer periodically)
        function checkSeasonalNarrativeEvent() {
            if (!gameState.pet) return;
            const now = Date.now();
            const lastCheck = gameState.lastSeasonalEventCheck || 0;
            // Only check once per hour
            if (now - lastCheck < 3600000) return;
            gameState.lastSeasonalEventCheck = now;

            const season = gameState.season || getCurrentSeason();
            if (typeof getSeasonalEvent !== 'function') return;
            const event = getSeasonalEvent(gameState.pet, season);
            if (event) {
                if (!gameState.pet._seenSeasonalEvents) gameState.pet._seenSeasonalEvents = {};
                gameState.pet._seenSeasonalEvents[event.id] = true;
                showToast(`${event.title} ${event.message}`, '#A5D6A7');
                addJournalEntry('🌿', event.message);
            }
        }

        // Get mentor bonus for a pet (returns multiplier if pet has an elder mentor)
        function getMentorBonus(pet) {
            if (!pet || !pet._mentorId) return 1.0;
            const mentor = gameState.pets ? gameState.pets.find(p => p && p.id === pet._mentorId) : null;
            if (!mentor || mentor.growthStage !== 'elder') {
                pet._mentorId = null;
                return 1.0;
            }
            return typeof MENTOR_CONFIG !== 'undefined' ? MENTOR_CONFIG.mentorBonusCareGain : 1.15;
        }

        // Assign a mentor to a younger pet
        function assignMentor(elderPetId, youngPetId) {
            if (!gameState.pets) return false;
            const elder = gameState.pets.find(p => p && p.id === elderPetId);
            const young = gameState.pets.find(p => p && p.id === youngPetId);
            if (!elder || !young) return false;
            if (elder.growthStage !== 'elder') return false;
            if (young.growthStage === 'elder') return false;
            const ageHours = typeof getPetAge === 'function' ? getPetAge(elder) : 0;
            if (ageHours < (MENTOR_CONFIG ? MENTOR_CONFIG.minElderAge : 20)) return false;

            young._mentorId = elderPetId;
            const elderName = elder.name || 'Elder';
            const youngName = young.name || 'Pet';
            const personality = elder.personality || 'playful';
            const messages = MENTOR_CONFIG && MENTOR_CONFIG.mentorWisdomMessages ? MENTOR_CONFIG.mentorWisdomMessages[personality] : null;
            if (messages && messages.length > 0) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                    .replace(/\{elder\}/g, elderName)
                    .replace(/\{young\}/g, youngName);
                showToast(msg, '#CE93D8');
            }
            addJournalEntry('🎓', `${elderName} began mentoring ${youngName}!`);
            saveGame();
            return true;
        }

        function installEconomyDebugHooks() {
            if (typeof window === 'undefined') return;
            if (!window.__debugEconomy || typeof window.__debugEconomy !== 'object') window.__debugEconomy = {};
            window.__debugEconomy.enabled = !!(typeof BALANCE_DEBUG !== 'undefined' ? BALANCE_DEBUG : true);
            window.__debugEconomy.testExpeditionSale = function testExpeditionSale() {
                try {
                    const lootId = Object.keys(EXPLORATION_LOOT || {}).find((id) => (EXPLORATION_LOOT[id] || {}).rarity === 'common') || Object.keys(EXPLORATION_LOOT || {})[0];
                    if (!lootId) return { ok: false, reason: 'no-loot-definitions' };
                    const genericPrice = getLootSellPrice(lootId, { source: 'generic', skipSecurityPenalty: true });
                    const expeditionPrice = getLootSellPrice(lootId, { source: 'expedition', skipSecurityPenalty: true });
                    const nerfApplied = expeditionPrice < genericPrice;
                    const sampleStacks = [
                        { id: lootId, qty: 1, meta: { source: 'generic' } },
                        { id: lootId, qty: 1, meta: { source: 'expedition' } }
                    ];
                    const breakdown = sampleStacks.map((stack) => ({
                        source: stack.meta.source,
                        qty: stack.qty,
                        priceEach: getLootSellPrice(stack, { skipSecurityPenalty: true })
                    }));
                    const total = breakdown.reduce((sum, row) => sum + (row.qty * row.priceEach), 0);
                    const result = { ok: true, lootId, genericPrice, expeditionPrice, nerfApplied, breakdown, total };
                    console.log('[DEBUG_ECONOMY] testExpeditionSale', result);
                    return result;
                } catch (e) {
                    console.error('[DEBUG_ECONOMY] testExpeditionSale failed', e);
                    return { ok: false, error: String(e && e.message || e) };
                }
            };
            window.__debugEconomy.testTimeJump = function testTimeJump() {
                try {
                    ensureTimeHardeningState();
                    const state = gameState.timeHardening;
                    const now = Date.now();
                    state.lastSeenWallClock = now - (10 * 60 * 60 * 1000); // simulate large forward jump on next check
                    const jump = checkAndRecordTimeJump(gameState, 'debug-time-jump', { now });
                    const gardenClamp = clampElapsedForHardening(48 * 60 * 60 * 1000, 'garden');
                    const needsClamp = clampElapsedForHardening(72 * 60 * 60 * 1000, 'needs');
                    const result = {
                        ok: true,
                        jumpDetected: !!(jump && jump.detected),
                        stabilizationActive: isTimeStabilizationActive(),
                        gardenClampMs: gardenClamp,
                        needsClampMs: needsClamp,
                        stabilizeUntil: state.stabilizeUntil || 0
                    };
                    console.log('[DEBUG_ECONOMY] testTimeJump', result);
                    return result;
                } catch (e) {
                    console.error('[DEBUG_ECONOMY] testTimeJump failed', e);
                    return { ok: false, error: String(e && e.message || e) };
                }
            };
            if (typeof window.__debugEconomy.testCompetitionCaps !== 'function') {
                window.__debugEconomy.testCompetitionCaps = function pendingCompetitionDebugHook() {
                    return { ok: false, reason: 'competition-debug-hook-not-installed-yet' };
                };
            }
        }

        installEconomyDebugHooks();

        // Save and cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
        });

        // Also handle page hide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
            stopDecayTimer();
            stopGardenGrowTimer();
            if (typeof SoundManager !== 'undefined') SoundManager.stopAll();
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        });
