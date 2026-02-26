(function initMLFStateMigrations(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFStateMigrations = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFStateMigrations() {
    'use strict';

    const DEFAULT_JOURNEY_CHAPTERS = Object.freeze([
        { id: 'chapter1', dayStart: 1, dayEnd: 7, objectives: [] },
        { id: 'chapter2', dayStart: 8, dayEnd: 14, objectives: [] },
        { id: 'chapter3', dayStart: 15, dayEnd: 21, objectives: [] },
        { id: 'chapter4', dayStart: 22, dayEnd: 30, objectives: [] }
    ]);

    const METRIC_PATHS = Object.freeze({
        totalFeedCount: ['totalFeedCount'],
        totalCareActions: ['pet.careActions'],
        totalDailyCompletions: ['totalDailyCompletions'],
        totalMinigamePlays: ['minigamePlayCounts.*sum'],
        expeditionsCompleted: ['exploration.stats.expeditionsCompleted'],
        totalHarvests: ['garden.totalHarvests'],
        codexUnlockedCount: ['codex.unlocked.*countTrue', 'codex.discovered.*countTrue'],
        badgeCount: ['badges.*countTruthy'],
        stickerCount: ['stickers.*countTruthy'],
        achievementCount: ['achievements.*countTruthy'],
        trophyCount: ['trophies.*countTruthy'],
        streakCurrent: ['streak.current'],
        maxRelationshipPoints: ['relationships.*maxPoints', 'household.relationships.*maxAffinity'],
        discoveredBiomesCount: ['exploration.discoveredBiomes.*countTrue'],
        battleCount: ['competition.battlesWon', 'competition.battlesLost'],
        bondXp: ['retentionJourney.bond.xp']
    });

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function toDateString(input) {
        const date = input instanceof Date ? input : new Date(Number.isFinite(input) ? input : Date.now());
        if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function parseDateString(dateStr) {
        if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
        const dt = new Date(dateStr + 'T12:00:00Z');
        if (Number.isNaN(dt.getTime())) return null;
        return dt;
    }

    function diffDaysInclusive(startDateStr, nowDateStr) {
        const a = parseDateString(startDateStr);
        const b = parseDateString(nowDateStr);
        if (!a || !b) return 1;
        const ms = b.getTime() - a.getTime();
        const diff = Math.floor(ms / 86400000) + 1;
        return Math.max(1, diff);
    }

    function readPath(rootObj, path) {
        const parts = String(path || '').split('.').filter(Boolean);
        let cursor = rootObj;
        for (let i = 0; i < parts.length; i++) {
            if (!isObject(cursor)) return undefined;
            cursor = cursor[parts[i]];
        }
        return cursor;
    }

    function countTruthyEntries(obj) {
        if (!isObject(obj)) return 0;
        let count = 0;
        for (const value of Object.values(obj)) {
            if (value === true) count++;
            else if (isObject(value)) {
                if (value.unlocked || value.collected || value.earned) count++;
            }
        }
        return count;
    }

    function maxPointsFromRelationshipMap(obj) {
        if (!isObject(obj)) return 0;
        let max = 0;
        for (const value of Object.values(obj)) {
            if (!value) continue;
            if (isObject(value) && Number.isFinite(value.points)) max = Math.max(max, Math.floor(value.points));
            if (isObject(value) && Number.isFinite(value.affinity)) max = Math.max(max, Math.floor(value.affinity));
        }
        return max;
    }

    function evaluateMetricPath(payload, token) {
        if (token.endsWith('.*sum')) {
            const base = readPath(payload, token.slice(0, -5));
            if (!isObject(base)) return 0;
            return Object.values(base).reduce((sum, value) => sum + (Number(value) || 0), 0);
        }
        if (token.endsWith('.*countTrue')) {
            const base = readPath(payload, token.slice(0, -11));
            return countTruthyEntries(base);
        }
        if (token.endsWith('.*countTruthy')) {
            const base = readPath(payload, token.slice(0, -13));
            return countTruthyEntries(base);
        }
        if (token.endsWith('.*maxPoints') || token.endsWith('.*maxAffinity')) {
            const basePath = token.slice(0, token.lastIndexOf('.*'));
            const base = readPath(payload, basePath);
            return maxPointsFromRelationshipMap(base);
        }
        const value = readPath(payload, token);
        return Number(value) || 0;
    }

    function getMetricValue(payload, metricKey) {
        const paths = METRIC_PATHS[metricKey];
        if (!Array.isArray(paths) || paths.length === 0) return 0;
        if (metricKey === 'battleCount') {
            return paths.reduce((sum, p) => sum + (Number(evaluateMetricPath(payload, p)) || 0), 0);
        }
        return Math.max(0, ...paths.map((p) => Number(evaluateMetricPath(payload, p)) || 0));
    }

    function getJourneyChapters(options) {
        const chapters = options && Array.isArray(options.journeyChapters) ? options.journeyChapters : null;
        return chapters && chapters.length ? chapters : DEFAULT_JOURNEY_CHAPTERS;
    }

    function getCurrentJourneyChapterForDate(chapters, startedAtDate, nowDateStr) {
        const day = diffDaysInclusive(startedAtDate, nowDateStr);
        const list = Array.isArray(chapters) && chapters.length ? chapters : DEFAULT_JOURNEY_CHAPTERS;
        const chapter = list.find((item) => day >= (item.dayStart || 1) && day <= (item.dayEnd || 30)) || list[list.length - 1] || DEFAULT_JOURNEY_CHAPTERS[0];
        return { day, chapter };
    }

    function collectChapterMetrics(chapter) {
        const set = new Set();
        const objectives = Array.isArray(chapter && chapter.objectives) ? chapter.objectives : [];
        for (const objective of objectives) {
            if (!objective || typeof objective.metric !== 'string') continue;
            set.add(objective.metric);
        }
        return Array.from(set.values()).sort();
    }

    function createChapterEntry(payload, chapter, nowTs) {
        const metrics = collectChapterMetrics(chapter);
        const baselines = {};
        for (const metricKey of metrics) {
            baselines[metricKey] = Math.max(0, Math.floor(getMetricValue(payload, metricKey)));
        }
        return {
            enteredAt: Number.isFinite(nowTs) ? nowTs : Date.now(),
            baselines,
            deltas: {},
            completedObjectives: {},
            claimedRewards: {},
            chapterCompletedAt: 0
        };
    }

    function normalizeJourneyRetentionState(payload, options) {
        const target = (payload && typeof payload === 'object' && !Array.isArray(payload)) ? payload : {};
        const chapters = getJourneyChapters(options);
        const nowTs = Number.isFinite(options && options.now) ? options.now : (Number(target.lastUpdate) || Date.now());
        const nowDateStr = toDateString(nowTs);
        const existing = isObject(target.journeyRetention) ? target.journeyRetention : {};
        const legacyStartedAt = readPath(target, 'meta.journey.startedAtDate');
        const startedAtDate = (typeof existing.startedAtDate === 'string' && existing.startedAtDate)
            ? existing.startedAtDate
            : (typeof legacyStartedAt === 'string' && legacyStartedAt ? legacyStartedAt : nowDateStr);
        const currentInfo = getCurrentJourneyChapterForDate(chapters, startedAtDate, nowDateStr);

        const state = {
            version: 1,
            startedAtDate,
            currentChapterId: (typeof existing.currentChapterId === 'string' && existing.currentChapterId) || (currentInfo.chapter && currentInfo.chapter.id) || 'chapter1',
            lastUpdatedAt: Number.isFinite(existing.lastUpdatedAt) ? existing.lastUpdatedAt : nowTs,
            chapterProgress: isObject(existing.chapterProgress) ? existing.chapterProgress : {},
            streak: isObject(existing.streak) ? existing.streak : {
                lastClaimDate: null,
                backlog: { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 }
            },
            bond: isObject(existing.bond) ? existing.bond : { xp: 0, level: 1 },
            tokens: Number.isFinite(existing.tokens) ? Math.max(0, Math.floor(existing.tokens)) : 0,
            features: isObject(existing.features) ? existing.features : { seasonalEnabled: false }
        };

        if (!isObject(state.streak.backlog)) {
            state.streak.backlog = { pending: [], pendingValue: 0, dripLoginsRemaining: 0, lastDripAt: 0 };
        }
        if (isObject(existing.tokenStore)) state.tokenStore = existing.tokenStore;
        if (isObject(existing.seasonal)) state.seasonal = existing.seasonal;
        if (!Array.isArray(state.streak.backlog.pending)) state.streak.backlog.pending = [];
        state.streak.backlog.pendingValue = Math.max(0, Math.floor(Number(state.streak.backlog.pendingValue) || 0));
        state.streak.backlog.dripLoginsRemaining = Math.max(0, Math.floor(Number(state.streak.backlog.dripLoginsRemaining) || 0));

        const currentChapterId = currentInfo.chapter && currentInfo.chapter.id ? currentInfo.chapter.id : state.currentChapterId;
        if (!isObject(state.chapterProgress[currentChapterId])) {
            state.chapterProgress[currentChapterId] = createChapterEntry(target, currentInfo.chapter, nowTs);
        } else {
            const entry = state.chapterProgress[currentChapterId];
            if (!isObject(entry.baselines)) entry.baselines = {};
            if (!isObject(entry.deltas)) entry.deltas = {};
            if (!isObject(entry.completedObjectives)) entry.completedObjectives = {};
            if (!isObject(entry.claimedRewards)) entry.claimedRewards = {};
            if (!Number.isFinite(entry.enteredAt)) entry.enteredAt = nowTs;
            if (!Number.isFinite(entry.chapterCompletedAt)) entry.chapterCompletedAt = 0;
            const metrics = collectChapterMetrics(currentInfo.chapter);
            for (const metricKey of metrics) {
                if (!Number.isFinite(entry.baselines[metricKey])) {
                    entry.baselines[metricKey] = Math.max(0, Math.floor(getMetricValue(target, metricKey)));
                }
            }
        }

        target.journeyRetention = state;
        return state;
    }

    function buildJourneyRetentionStateFromLegacy(payload, options) {
        const clone = isObject(payload) ? payload : {};
        return normalizeJourneyRetentionState(clone, options);
    }

    return Object.freeze({
        toDateString,
        diffDaysInclusive,
        getMetricValue,
        getCurrentJourneyChapterForDate,
        normalizeJourneyRetentionState,
        buildJourneyRetentionStateFromLegacy
    });
});
