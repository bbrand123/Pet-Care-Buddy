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

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function clampInt(value, min) {
        const n = Math.floor(Number(value) || 0);
        return n < min ? min : n;
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
                streak: { lastClaimDate: null, backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 } },
                bond: { xp: 0, level: 1 },
                tokens: 0,
                features: { seasonalEnabled: false }
            };
        }
        return gs.journeyRetention;
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
        for (const objective of objectives) {
            const progress = computeObjectiveProgress(state, entry, objective);
            if (!progress.done) continue;
            if (!entry.completedObjectives[objective.id]) {
                entry.completedObjectives[objective.id] = { at: Date.now(), value: progress.value };
                completedNow.push(progress);
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
        const objectives = (Array.isArray(chapter.objectives) ? chapter.objectives : []).map((objective) => computeObjectiveProgress(state, entry, objective));
        const completeCount = objectives.filter((item) => item.done).length;
        const nextObjective = objectives.find((item) => !item.done) || null;
        const nextReward = nextObjective
            ? { type: 'objective', label: '+' + (nextObjective.tokenReward || 0) + ' Journey Tokens', tokens: nextObjective.tokenReward || 0 }
            : summarizeChapterReward(chapter);
        markObjectiveCompletions(record);
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
        trackJourneyOpen
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
    }

    return api;
});
