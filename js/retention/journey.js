(function initMLFJourney(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        let StateMigrations = null;
        let Telemetry = null;
        try { StateMigrations = require('../state/migrations.js'); } catch (_) {}
        try { Telemetry = require('./telemetry.js'); } catch (_) {}
        module.exports = factory(root, StateMigrations, Telemetry);
        return;
    }
    root.MLFJourney = factory(root, root.MLFStateMigrations, root.MLFRetentionTelemetry);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFJourney(root, StateMigrations, Telemetry) {
    'use strict';

    const DEFAULT_CHAPTERS = Object.freeze([
        { id: 'chapter1', label: 'Week 1: Settle In', dayStart: 1, dayEnd: 7, objectives: [{ id: 'feed_6', metric: 'totalFeedCount', target: 6, label: 'Feed your pet 6 times', tokenReward: 2 }], chapterReward: { tokens: 4 } },
        { id: 'chapter2', label: 'Week 2: Build Momentum', dayStart: 8, dayEnd: 14, objectives: [{ id: 'daily_3', metric: 'totalDailyCompletions', target: 3, label: 'Complete 3 Daily checklists', tokenReward: 3 }], chapterReward: { tokens: 5 } },
        { id: 'chapter3', label: 'Week 3: Deepen Mastery', dayStart: 15, dayEnd: 21, objectives: [{ id: 'games_10', metric: 'totalMinigamePlays', target: 10, label: 'Play 10 mini-games', tokenReward: 2 }], chapterReward: { tokens: 6 } },
        { id: 'chapter4', label: 'Week 4: Legacy Rhythm', dayStart: 22, dayEnd: 30, objectives: [{ id: 'streak_30', metric: 'streakCurrent', target: 30, label: 'Reach a 30-day streak', tokenReward: 4 }], chapterReward: { tokens: 8 } }
    ]);
    const NON_DELTA_METRICS = new Set(['streakCurrent', 'maxRelationshipPoints']);
    const DEFAULT_TOKEN_STORE = Object.freeze({
        story: { cost: 5, type: 'story' },
        cosmetic: { cost: 8, type: 'cosmetic' },
        bond: { cost: 6, type: 'bond' },
        codex: { cost: 7, type: 'codex' }
    });

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function clampInt(value, min) {
        const n = Math.floor(Number(value) || 0);
        return n < min ? min : n;
    }

    function getRetentionPacing() {
        if (typeof root.getRetentionP1Tuning === 'function') {
            try { return root.getRetentionP1Tuning(); } catch (_) {}
        }
        return null;
    }

    function getJourneyRewardPacing() {
        if (typeof root.getJourneyRewardPacingTable === 'function') {
            try { return root.getJourneyRewardPacingTable(); } catch (_) {}
        }
        return (typeof root.JOURNEY_TOKEN_REWARD_TABLE !== 'undefined' && root.JOURNEY_TOKEN_REWARD_TABLE)
            ? root.JOURNEY_TOKEN_REWARD_TABLE
            : { chapterComplete: 4, objectiveComplete: 2, dailyComplete: 2, noveltyUnlock: 2 };
    }

    function getTodayString() {
        if (typeof root.getTodayString === 'function') {
            try { return root.getTodayString(); } catch (_) {}
        }
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getState() {
        if (typeof root.gameState !== 'undefined' && root.gameState) return root.gameState;
        if (root.StateManager && typeof root.StateManager.getRawState === 'function') {
            try { return root.StateManager.getRawState(); } catch (_) {}
        }
        return null;
    }

    function getPlayerId(state) {
        const gs = state || getState() || {};
        const econ = gs.economy || {};
        if (typeof econ.playerId === 'string' && econ.playerId) return econ.playerId;
        return 'unknown-player';
    }

    function getChapters() {
        if (typeof root.JOURNEY_CHAPTERS !== 'undefined' && Array.isArray(root.JOURNEY_CHAPTERS) && root.JOURNEY_CHAPTERS.length) {
            return root.JOURNEY_CHAPTERS;
        }
        return DEFAULT_CHAPTERS;
    }

    function ensureJourneyState(state) {
        const gs = state || getState();
        if (!gs) return null;
        if (StateMigrations && typeof StateMigrations.normalizeJourneyRetentionState === 'function') {
            return StateMigrations.normalizeJourneyRetentionState(gs, { journeyChapters: getChapters(), now: Date.now() });
        }
        if (!isObject(gs.journeyRetention)) {
            gs.journeyRetention = {
                version: 1,
                startedAtDate: getTodayString(),
                currentChapterId: 'chapter1',
                lastUpdatedAt: Date.now(),
                chapterProgress: {},
                streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0, lastLoginDate: null, lastDripDate: null } },
                bond: { xp: 0, level: 1 },
                tokens: 0,
                features: { seasonalEnabled: false }
            };
        }
        if (!isObject(gs.journeyRetention.streak)) gs.journeyRetention.streak = { lastClaimDate: null, backlog: {} };
        if (!isObject(gs.journeyRetention.streak.backlog)) gs.journeyRetention.streak.backlog = {};
        const backlog = gs.journeyRetention.streak.backlog;
        if (!Array.isArray(backlog.pending)) backlog.pending = [];
        if (!Number.isFinite(backlog.pendingValue)) backlog.pendingValue = 0;
        if (!Number.isFinite(backlog.dripLoginsRemaining)) backlog.dripLoginsRemaining = 0;
        if (!Number.isFinite(backlog.lastDripAt)) backlog.lastDripAt = 0;
        if (typeof backlog.lastLoginDate !== 'string' && backlog.lastLoginDate !== null) backlog.lastLoginDate = null;
        if (typeof backlog.lastDripDate !== 'string' && backlog.lastDripDate !== null) backlog.lastDripDate = null;
        return gs.journeyRetention;
    }

    function parseDateOnly(dateStr) {
        if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
        const dt = new Date(dateStr + 'T00:00:00');
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    function diffDays(dateA, dateB) {
        const a = parseDateOnly(dateA);
        const b = parseDateOnly(dateB);
        if (!a || !b) return 0;
        return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
    }

    function addJourneyTokensRaw(journeyState, amount, reason) {
        const add = clampInt(amount, 0);
        if (!journeyState || add <= 0) return 0;
        journeyState.tokens = clampInt(journeyState.tokens, 0) + add;
        journeyState.lastUpdatedAt = Date.now();
        return add;
    }

    function applyBacklogDripOnLogin(record) {
        if (!record || !record.journeyState || !isObject(record.journeyState.streak)) return { applied: 0, pending: 0 };
        const backlog = record.journeyState.streak.backlog;
        const today = getTodayString();
        const pacing = getRetentionPacing();
        const backlogCfg = pacing && pacing.journeyRewardPacing && pacing.journeyRewardPacing.backlog
            ? pacing.journeyRewardPacing.backlog
            : { tokenPerMissedDay: 2, dripLogins: 3, maxBufferedMissedDays: 10, minAwayDaysForBacklog: 1 };

        if (backlog.lastLoginDate && backlog.lastLoginDate !== today) {
            const awayDays = diffDays(backlog.lastLoginDate, today);
            const missedDays = Math.max(0, awayDays - 1);
            if (missedDays >= clampInt(backlogCfg.minAwayDaysForBacklog, 1)) {
                const countedMissedDays = Math.min(missedDays, clampInt(backlogCfg.maxBufferedMissedDays, 1));
                backlog.pendingValue = clampInt(backlog.pendingValue, 0) + (countedMissedDays * Math.max(1, clampInt(backlogCfg.tokenPerMissedDay, 1)));
                backlog.dripLoginsRemaining = Math.max(
                    clampInt(backlog.dripLoginsRemaining, 0),
                    Math.max(1, clampInt(backlogCfg.dripLogins, 1))
                );
                backlog.pending.push({ type: 'absence', missedDays: countedMissedDays, queuedAt: Date.now() });
            }
        }

        let applied = 0;
        if (backlog.lastDripDate !== today && clampInt(backlog.pendingValue, 0) > 0) {
            const remaining = Math.max(1, clampInt(backlog.dripLoginsRemaining, 1));
            applied = Math.max(1, Math.ceil(clampInt(backlog.pendingValue, 0) / remaining));
            applied = Math.min(applied, clampInt(backlog.pendingValue, 0));
            addJourneyTokensRaw(record.journeyState, applied, 'backlog-drip');
            backlog.pendingValue = Math.max(0, clampInt(backlog.pendingValue, 0) - applied);
            backlog.dripLoginsRemaining = Math.max(0, remaining - 1);
            backlog.lastDripAt = Date.now();
            backlog.lastDripDate = today;
            record._journeyMutated = true;
        }
        backlog.lastLoginDate = today;
        return {
            applied,
            pending: clampInt(backlog.pendingValue, 0),
            remainingLogins: clampInt(backlog.dripLoginsRemaining, 0)
        };
    }

    function getMetricValue(gs, metricKey) {
        if (StateMigrations && typeof StateMigrations.getMetricValue === 'function') {
            return clampInt(StateMigrations.getMetricValue(gs, metricKey), 0);
        }
        if (!gs) return 0;
        if (metricKey === 'totalFeedCount') return clampInt(gs.totalFeedCount, 0);
        if (metricKey === 'totalDailyCompletions') return clampInt(gs.totalDailyCompletions, 0);
        if (metricKey === 'streakCurrent') return clampInt(gs.streak && gs.streak.current, 0);
        return 0;
    }

    function getCurrentChapterRecord(gs) {
        const state = gs || getState();
        if (!state) return null;
        const chapters = getChapters();
        const journeyState = ensureJourneyState(state);
        const today = getTodayString();
        const info = (StateMigrations && typeof StateMigrations.getCurrentJourneyChapterForDate === 'function')
            ? StateMigrations.getCurrentJourneyChapterForDate(chapters, journeyState.startedAtDate || today, today)
            : { day: 1, chapter: chapters[0] };
        const chapter = info.chapter || chapters[0] || null;
        if (!chapter) return null;
        journeyState.currentChapterId = chapter.id;
        if (!isObject(journeyState.chapterProgress)) journeyState.chapterProgress = {};
        let entry = journeyState.chapterProgress[chapter.id];
        if (!isObject(entry)) {
            if (StateMigrations && typeof StateMigrations.normalizeJourneyRetentionState === 'function') {
                StateMigrations.normalizeJourneyRetentionState(state, { journeyChapters: chapters, now: Date.now() });
                entry = journeyState.chapterProgress[chapter.id];
            } else {
                entry = { enteredAt: Date.now(), baselines: {}, deltas: {}, completedObjectives: {}, claimedRewards: {}, chapterCompletedAt: 0 };
                journeyState.chapterProgress[chapter.id] = entry;
            }
        }
        if (!isObject(entry.baselines)) entry.baselines = {};
        if (!isObject(entry.deltas)) entry.deltas = {};
        if (!isObject(entry.completedObjectives)) entry.completedObjectives = {};
        if (!isObject(entry.claimedRewards)) entry.claimedRewards = {};
        return { day: clampInt(info.day, 1), chapter, entry, journeyState, state };
    }

    function computeObjectiveProgress(gs, chapterEntry, objective) {
        const metric = typeof objective.metric === 'string' ? objective.metric : '';
        const target = clampInt(objective.target, 0);
        const baseline = clampInt(chapterEntry.baselines && chapterEntry.baselines[metric], 0);
        const metricValue = clampInt(getMetricValue(gs, metric), 0);
        const deltaProgress = NON_DELTA_METRICS.has(metric)
            ? metricValue
            : Math.max(0, metricValue - baseline);
        const manualProgress = clampInt(chapterEntry.deltas && chapterEntry.deltas[metric], 0);
        const value = Math.min(target, Math.max(deltaProgress, manualProgress));
        return {
            id: objective.id,
            metric,
            label: objective.label || objective.id,
            target,
            value,
            done: value >= target,
            tokenReward: clampInt(objective.tokenReward, 0)
        };
    }

    function markObjectiveCompletions(record) {
        const { chapter, entry, state } = record;
        let completedNow = [];
        const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
        const rewardPacing = getJourneyRewardPacing();
        for (const objective of objectives) {
            const progress = computeObjectiveProgress(state, entry, objective);
            if (!progress.done) continue;
            if (!entry.completedObjectives[objective.id]) {
                entry.completedObjectives[objective.id] = { at: Date.now(), value: progress.value };
                completedNow.push(progress);
                const objectiveRewardKey = 'objective:' + objective.id;
                if (!entry.claimedRewards[objectiveRewardKey]) {
                    const award = Math.max(1, clampInt(progress.tokenReward || rewardPacing.objectiveComplete, 1));
                    addJourneyTokensRaw(record.journeyState, award, objectiveRewardKey);
                    record._journeyMutated = true;
                    entry.claimedRewards[objectiveRewardKey] = { at: Date.now(), tokens: award };
                }
                if (Telemetry && typeof Telemetry.emit === 'function') {
                    Telemetry.emit('journey_objective_complete', {
                        chapterId: chapter.id,
                        objectiveId: objective.id
                    });
                }
            }
        }
        if (objectives.length > 0 && objectives.every((obj) => !!entry.completedObjectives[obj.id])) {
            if (!Number.isFinite(entry.chapterCompletedAt) || entry.chapterCompletedAt <= 0) {
                entry.chapterCompletedAt = Date.now();
            }
            if (!entry.claimedRewards.chapter) {
                const chapterReward = summarizeChapterReward(chapter).reward || {};
                const chapterTokens = Math.max(1, clampInt(chapterReward.tokens || rewardPacing.chapterComplete, 1));
                addJourneyTokensRaw(record.journeyState, chapterTokens, 'chapter:' + chapter.id);
                record._journeyMutated = true;
                entry.claimedRewards.chapter = { at: Date.now(), tokens: chapterTokens };
            }
        }
        return completedNow;
    }

    function getCurrentChapter(playerId) {
        if (Telemetry && typeof Telemetry.getRuntimeFlags === 'function') {
            const flags = Telemetry.getRuntimeFlags();
            if (flags && flags.journeyEnabled === false) return null;
        }
        const record = getCurrentChapterRecord();
        if (!record) return null;
        const { day, chapter, entry, journeyState, state } = record;
        const backlogDrip = applyBacklogDripOnLogin(record);
        const objectives = (Array.isArray(chapter.objectives) ? chapter.objectives : []).map((objective) => computeObjectiveProgress(state, entry, objective));
        const completeCount = objectives.filter((item) => item.done).length;
        const nextObjective = objectives.find((item) => !item.done) || null;
        const nextReward = nextObjective
            ? { type: 'objective', label: '+' + (nextObjective.tokenReward || 0) + ' Journey Tokens', tokens: nextObjective.tokenReward || 0 }
            : summarizeChapterReward(chapter);
        markObjectiveCompletions(record);
        if (record._journeyMutated && typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-journey-auto' }); } catch (_) {}
        }
        return {
            playerId: playerId || getPlayerId(state),
            day,
            chapterId: chapter.id,
            chapter,
            chapterEntry: entry,
            objectives,
            nextObjective,
            nextReward,
            completedObjectives: completeCount,
            totalObjectives: objectives.length,
            chapterComplete: objectives.length > 0 && completeCount >= objectives.length,
            chapterPct: objectives.length > 0 ? Math.round((completeCount / objectives.length) * 100) : 0,
            tokens: clampInt(journeyState.tokens, 0),
            bondXp: clampInt(journeyState.bond && journeyState.bond.xp, 0),
            bondLevel: Math.max(1, clampInt(journeyState.bond && journeyState.bond.level, 1)),
            backlogDrip,
            chapterObjectives: objectives.map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
                target: item.target,
                done: item.done
            }))
        };
    }

    function summarizeChapterReward(chapter) {
        const reward = (chapter && isObject(chapter.chapterReward)) ? chapter.chapterReward : {};
        const parts = [];
        if (Number.isFinite(reward.tokens) && reward.tokens > 0) parts.push('+' + Math.floor(reward.tokens) + ' Journey Tokens');
        if (reward.collectible && reward.collectible.id) parts.push('Unlock reward');
        if (typeof reward.story === 'string' && reward.story) parts.push('Story memory');
        return {
            type: 'chapter',
            label: parts.length ? parts.join(' · ') : 'Chapter reward',
            reward
        };
    }

    function incrementChapterProgress(playerId, key, amount) {
        const record = getCurrentChapterRecord();
        if (!record) return null;
        const deltaKey = typeof key === 'string' ? key : '';
        if (!deltaKey) return null;
        const add = clampInt(amount, 0);
        if (add <= 0) return getCurrentChapter(playerId);
        record.entry.deltas[deltaKey] = clampInt(record.entry.deltas[deltaKey], 0) + add;
        record.journeyState.lastUpdatedAt = Date.now();
        markObjectiveCompletions(record);
        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-journey' }); } catch (_) {}
        }
        return getCurrentChapter(playerId);
    }

    function claimStreak(playerId) {
        const gs = getState();
        if (!gs) return { ok: false, reason: 'state-unavailable' };
        let result = null;
        if (typeof root.claimStreakBonus === 'function') {
            result = root.claimStreakBonus();
            if (!result) {
                return { ok: false, reason: 'already-claimed' };
            }
        } else {
            if (!gs.streak || gs.streak.todayBonusClaimed) return { ok: false, reason: 'already-claimed' };
            gs.streak.todayBonusClaimed = true;
            if (typeof root.saveGame === 'function') {
                try { root.saveGame({ silentIndicator: true, source: 'retention-streak' }); } catch (_) {}
            }
            result = { bonus: { label: 'Daily streak' }, milestones: [], streakDripCoins: 0 };
        }
        const journeyState = ensureJourneyState(gs);
        if (journeyState && isObject(journeyState.streak)) {
            journeyState.streak.lastClaimDate = getTodayString();
        }
        incrementChapterProgress(playerId || getPlayerId(gs), 'streakClaims', 1);
        if (Telemetry && typeof Telemetry.emit === 'function') {
            Telemetry.emit('streak_claim', {
                day: clampInt(gs.streak && gs.streak.current, 0),
                chapterId: (getCurrentChapter(playerId) || {}).chapterId || ''
            });
        }
        return Object.assign({ ok: true }, result);
    }

    function spendJourneyTokens(cost) {
        const gs = getState();
        if (!gs) return { ok: false, reason: 'state-unavailable', balance: 0 };
        const journeyState = ensureJourneyState(gs);
        const amount = Math.max(0, clampInt(cost, 0));
        if (amount <= 0) return { ok: true, spent: 0, balance: clampInt(journeyState.tokens, 0) };
        if (clampInt(journeyState.tokens, 0) < amount) {
            return { ok: false, reason: 'insufficient-tokens', balance: clampInt(journeyState.tokens, 0) };
        }
        journeyState.tokens = clampInt(journeyState.tokens, 0) - amount;
        return { ok: true, spent: amount, balance: clampInt(journeyState.tokens, 0) };
    }

    function addCoinsFallback(amount, reason) {
        const coins = Math.max(0, clampInt(amount, 0));
        if (coins <= 0) return 0;
        if (typeof root.addCoins === 'function') {
            try { return clampInt(root.addCoins(coins, reason || 'Journey Fallback', true), 0); } catch (_) {}
        }
        const gs = getState();
        if (gs && gs.economy) {
            gs.economy.coins = clampInt(gs.economy.coins, 0) + coins;
            return coins;
        }
        return 0;
    }

    function grantStickerOrFallback(stickerId, fallbackCoins) {
        if (typeof root.grantSticker === 'function' && stickerId) {
            try {
                if (root.grantSticker(stickerId)) return { granted: true, duplicate: false, kind: 'sticker', id: stickerId, fallbackCoins: 0 };
            } catch (_) {}
            const coins = addCoinsFallback(fallbackCoins || 15, 'Journey duplicate sticker');
            return { granted: false, duplicate: true, kind: 'sticker', id: stickerId, fallbackCoins: coins };
        }
        const coins = addCoinsFallback(fallbackCoins || 15, 'Journey cosmetic fallback');
        return { granted: false, duplicate: false, kind: 'sticker', id: stickerId || '', fallbackCoins: coins };
    }

    function grantAccessoryOrFallback(accessoryId, fallbackCoins) {
        const gs = getState();
        if (gs && gs.pet && accessoryId) {
            if (!Array.isArray(gs.pet.unlockedAccessories)) gs.pet.unlockedAccessories = [];
            if (!gs.pet.unlockedAccessories.includes(accessoryId)) {
                gs.pet.unlockedAccessories.push(accessoryId);
                return { granted: true, duplicate: false, kind: 'accessory', id: accessoryId, fallbackCoins: 0 };
            }
            const coins = addCoinsFallback(fallbackCoins || 20, 'Journey duplicate accessory');
            return { granted: false, duplicate: true, kind: 'accessory', id: accessoryId, fallbackCoins: coins };
        }
        const coins = addCoinsFallback(fallbackCoins || 20, 'Journey accessory fallback');
        return { granted: false, duplicate: false, kind: 'accessory', id: accessoryId || '', fallbackCoins: coins };
    }

    function pickJourneyCosmeticReward() {
        const gs = getState() || {};
        const stickerPool = (typeof root.STICKERS !== 'undefined' && root.STICKERS) ? Object.keys(root.STICKERS) : [];
        const accessoryPool = (typeof root.ACCESSORIES !== 'undefined' && root.ACCESSORIES) ? Object.keys(root.ACCESSORIES) : [];
        const ownedStickers = isObject(gs.stickers) ? new Set(Object.keys(gs.stickers)) : new Set();
        const ownedAccessories = (gs.pet && Array.isArray(gs.pet.unlockedAccessories)) ? new Set(gs.pet.unlockedAccessories) : new Set();
        const availableStickers = stickerPool.filter((id) => !ownedStickers.has(id));
        const availableAccessories = accessoryPool.filter((id) => !ownedAccessories.has(id));
        if (availableAccessories.length > 0) {
            return { type: 'accessory', id: availableAccessories[Math.floor(Math.random() * availableAccessories.length)] };
        }
        if (availableStickers.length > 0) {
            return { type: 'sticker', id: availableStickers[Math.floor(Math.random() * availableStickers.length)] };
        }
        if (accessoryPool.length > 0) {
            return { type: 'accessory', id: accessoryPool[Math.floor(Math.random() * accessoryPool.length)] };
        }
        if (stickerPool.length > 0) {
            return { type: 'sticker', id: stickerPool[Math.floor(Math.random() * stickerPool.length)] };
        }
        return null;
    }

    function addBondReward(xpAmount) {
        const gs = getState();
        if (!gs) return { xp: 0 };
        const journeyState = ensureJourneyState(gs);
        if (!isObject(journeyState.bond)) journeyState.bond = { xp: 0, level: 1 };
        const addXp = Math.max(0, clampInt(xpAmount, 0));
        journeyState.bond.xp = clampInt(journeyState.bond.xp, 0) + addXp;
        journeyState.bond.level = Math.max(1, 1 + Math.floor(journeyState.bond.xp / 45));
        if (gs.pet) {
            gs.pet.happiness = Math.min(100, clampInt(gs.pet.happiness, 0) + Math.max(2, Math.floor(addXp / 2)));
        }
        return { xp: addXp, level: journeyState.bond.level };
    }

    function addJournalStoryEntry(text) {
        if (typeof root.addJournalEntry === 'function') {
            try {
                root.addJournalEntry('📘', text || 'Journey story unlocked.');
                return true;
            } catch (_) {}
        }
        return false;
    }

    function redeemJourneyTokenReward(rewardId) {
        const reward = DEFAULT_TOKEN_STORE[rewardId];
        if (!reward) return { ok: false, reason: 'unknown-reward' };
        const spend = spendJourneyTokens(reward.cost);
        if (!spend.ok) return { ok: false, reason: spend.reason, balance: spend.balance };

        let message = 'Reward redeemed.';
        let fallbackCoins = 0;
        if (reward.type === 'story') {
            addJournalStoryEntry('Journey token memory unlocked: your pet remembers your steady return.');
            const bonusTokens = 0;
            message = 'A new story memory was added.';
            if (bonusTokens > 0) message += ` (+${bonusTokens} tokens)`;
        } else if (reward.type === 'cosmetic') {
            const pick = pickJourneyCosmeticReward();
            if (!pick) {
                fallbackCoins = addCoinsFallback(30, 'Journey cosmetic no-pool fallback');
                message = `No cosmetic pool available. Converted to ${fallbackCoins} coins.`;
            } else if (pick.type === 'sticker') {
                const grant = grantStickerOrFallback(pick.id, 18);
                fallbackCoins = grant.fallbackCoins || 0;
                message = grant.granted ? 'Cosmetic reward unlocked.' : `Duplicate sticker converted to ${fallbackCoins} coins.`;
            } else {
                const grant = grantAccessoryOrFallback(pick.id, 22);
                fallbackCoins = grant.fallbackCoins || 0;
                message = grant.granted ? 'Cosmetic reward unlocked.' : `Duplicate cosmetic converted to ${fallbackCoins} coins.`;
            }
        } else if (reward.type === 'bond') {
            const bond = addBondReward(12);
            message = `Bond boost applied (+${bond.xp} XP, Lv ${bond.level}).`;
        } else if (reward.type === 'codex') {
            const coins = addCoinsFallback(20, 'Journey codex fallback');
            fallbackCoins = coins;
            addJournalStoryEntry('Codex insight: your pet noticed patterns in your routines.');
            message = `Codex insight granted${coins > 0 ? ` and converted extra value to ${coins} coins` : ''}.`;
        }

        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'journey-token-redeem' }); } catch (_) {}
        }
        return {
            ok: true,
            rewardId,
            spent: reward.cost,
            balance: spend.balance,
            fallbackCoins,
            message
        };
    }

    function getJourneyModalStatus() {
        const current = getCurrentChapter();
        if (!current) return null;
        const chapters = getChapters();
        const states = getJourneyChapterStates();
        const byTrack = {};
        for (const chapter of chapters) {
            const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
            for (const objective of objectives) {
                const track = String(objective.track || 'bond');
                if (!byTrack[track]) byTrack[track] = { completed: 0, total: 0, pct: 0 };
                byTrack[track].total += 1;
            }
        }
        for (const chapterState of states) {
            const chapter = chapters.find((c) => c.id === chapterState.id);
            if (!chapter) continue;
            const record = getCurrentChapterRecord();
            if (!record) continue;
            const entry = record.journeyState.chapterProgress[chapter.id];
            if (!entry) continue;
            const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
            for (const objective of objectives) {
                const track = String(objective.track || 'bond');
                if (entry.completedObjectives && entry.completedObjectives[objective.id]) {
                    byTrack[track].completed += 1;
                }
            }
        }
        Object.keys(byTrack).forEach((key) => {
            const row = byTrack[key];
            row.pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
        });
        return {
            day: current.day,
            chapter: current.chapter,
            tokens: current.tokens,
            bondXp: current.bondXp,
            bondLevel: current.bondLevel,
            nextObjective: current.nextObjective,
            nextReward: current.nextReward,
            backlogDrip: current.backlogDrip,
            chapterObjectives: current.chapterObjectives,
            trackProgress: {
                bond: byTrack.bond || { completed: 0, total: 0, pct: 0 },
                mastery: byTrack.mastery || { completed: 0, total: 0, pct: 0 },
                collection: byTrack.collection || { completed: 0, total: 0, pct: 0 }
            }
        };
    }

    function getJourneyChapterStates() {
        const chapters = getChapters();
        const gs = getState();
        const current = getCurrentChapter();
        if (!gs || !current) return [];
        const journeyState = ensureJourneyState(gs);
        return chapters.map((chapter) => {
            let completed = 0;
            const objectives = Array.isArray(chapter.objectives) ? chapter.objectives : [];
            const entry = isObject(journeyState.chapterProgress && journeyState.chapterProgress[chapter.id]) ? journeyState.chapterProgress[chapter.id] : null;
            if (entry && isObject(entry.completedObjectives)) {
                completed = objectives.filter((objective) => !!entry.completedObjectives[objective.id]).length;
            }
            const total = objectives.length;
            return {
                id: chapter.id,
                label: chapter.label || chapter.id,
                dayStart: clampInt(chapter.dayStart, 1),
                dayEnd: clampInt(chapter.dayEnd, 1),
                completed,
                total,
                pct: total > 0 ? Math.round((completed / total) * 100) : 0,
                unlocked: current.day >= clampInt(chapter.dayStart, 1),
                complete: !!(entry && Number(entry.chapterCompletedAt) > 0)
            };
        });
    }

    function trackJourneyOpen() {
        const current = getCurrentChapter();
        if (Telemetry && typeof Telemetry.recordJourneyOpen === 'function') {
            Telemetry.recordJourneyOpen(current && current.chapterId ? current.chapterId : '');
        }
        return current;
    }

    const api = Object.freeze({
        ensureJourneyState,
        getCurrentChapter,
        getJourneyModalStatus,
        getJourneyChapterStates,
        claimStreak,
        incrementChapterProgress,
        trackJourneyOpen,
        redeemJourneyTokenReward
    });

    if (root && typeof root === 'object') {
        root.Journey = api;
        if (typeof root.getJourneyStatus !== 'function') {
            root.getJourneyStatus = function getJourneyStatusCompat() {
                return api.getJourneyModalStatus();
            };
        }
        if (typeof root.getJourneyChapterStates !== 'function') {
            root.getJourneyChapterStates = function getJourneyChapterStatesCompat() {
                return api.getJourneyChapterStates();
            };
        }
        if (typeof root.redeemJourneyTokenReward !== 'function') {
            root.redeemJourneyTokenReward = function redeemJourneyTokenRewardCompat(rewardId) {
                return api.redeemJourneyTokenReward(rewardId);
            };
        }
    }

    return api;
});
