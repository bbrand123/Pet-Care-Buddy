(function initMLFSeasonalJourney(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFSeasonalJourney = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSeasonalJourney(root) {
    'use strict';

    const DEFAULT_SEASONAL_DEFS = Object.freeze({
        spring: { id: 'spring', label: 'Spring Bloom Loop', icon: '🌸', tracks: ['bond', 'garden', 'explore'] },
        summer: { id: 'summer', label: 'Summer Adventure Loop', icon: '☀️', tracks: ['explore', 'mastery', 'bond'] },
        autumn: { id: 'autumn', label: 'Autumn Harvest Loop', icon: '🍂', tracks: ['garden', 'collection', 'bond'] },
        winter: { id: 'winter', label: 'Winter Cozy Loop', icon: '❄️', tracks: ['bond', 'collection', 'mastery'] }
    });
    const TRACK_OBJECTIVE_LIBRARY = Object.freeze({
        bond: [
            { key: 'care', metric: 'totalCareActions', target: 8, label: 'Do {target} care actions', reward: { tokens: 3 } },
            { key: 'feed', metric: 'totalFeedCount', target: 5, label: 'Feed {target} times', reward: { tokens: 2 } },
            { key: 'streak', metric: 'streakClaims', target: 2, label: 'Claim streak bonus {target} times', reward: { tokens: 3 } }
        ],
        garden: [
            { key: 'harvest', metric: 'harvestCount', target: 3, label: 'Harvest {target} crops', reward: { tokens: 3 } },
            { key: 'plant', metric: 'gardenPlantCount', target: 3, label: 'Plant {target} seeds', reward: { tokens: 2 } }
        ],
        explore: [
            { key: 'expedition', metric: 'expeditionsCompleted', target: 2, label: 'Complete {target} expeditions', reward: { tokens: 3 } },
            { key: 'discover', metric: 'discoveredBiomesCount', target: 1, label: 'Discover {target} new biome', reward: { tokens: 4 } }
        ],
        mastery: [
            { key: 'minigame', metric: 'totalMinigamePlays', target: 6, label: 'Play {target} mini-games', reward: { tokens: 2 } },
            { key: 'daily', metric: 'totalDailyCompletions', target: 2, label: 'Complete {target} Daily checklists', reward: { tokens: 3 } }
        ],
        collection: [
            { key: 'badge', metric: 'badgeCount', target: 2, label: 'Earn {target} badges', reward: { tokens: 3 } },
            { key: 'sticker', metric: 'stickerCount', target: 2, label: 'Collect {target} stickers', reward: { tokens: 3 } }
        ]
    });

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function clampInt(value, min) {
        const n = Math.floor(Number(value) || 0);
        return n < min ? min : n;
    }

    function getState() {
        if (root && root.gameState) return root.gameState;
        if (root && root.StateManager && typeof root.StateManager.getRawState === 'function') {
            try { return root.StateManager.getRawState(); } catch (_) {}
        }
        return null;
    }

    function isFeatureEnabled() {
        if (typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled('seasonalJourneyEnabled'); } catch (_) {}
        }
        return !!(root && root.RETENTION_FEATURE_FLAGS && root.RETENTION_FEATURE_FLAGS.seasonalJourneyEnabled === true);
    }

    function getTodayString() {
        if (typeof root.getTodayString === 'function') {
            try { return root.getTodayString(); } catch (_) {}
        }
        return new Date().toISOString().slice(0, 10);
    }

    function parseDateOnly(dateStr) {
        if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
        const dt = new Date(dateStr + 'T00:00:00');
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    function toDateOnlyString(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getWeekKey(nowValue) {
        const date = nowValue != null ? new Date(nowValue) : new Date();
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const day = d.getUTCDay();
        const offsetToMonday = (day + 6) % 7;
        d.setUTCDate(d.getUTCDate() - offsetToMonday);
        return toDateOnlyString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    function getCurrentSeasonId(nowValue) {
        if (typeof root.getCurrentSeason === 'function') {
            try {
                const season = String(root.getCurrentSeason()).toLowerCase();
                if (DEFAULT_SEASONAL_DEFS[season]) return season;
            } catch (_) {}
        }
        const d = nowValue != null ? new Date(nowValue) : new Date();
        const month = d.getMonth() + 1;
        if ([12, 1, 2].includes(month)) return 'winter';
        if ([3, 4, 5].includes(month)) return 'spring';
        if ([6, 7, 8].includes(month)) return 'summer';
        return 'autumn';
    }

    function ensureJourneyRetentionState(gs) {
        const state = gs || getState();
        if (!state) return null;
        if (!isObject(state.journeyRetention)) state.journeyRetention = {};
        if (!isObject(state.journeyRetention.seasonal)) {
            state.journeyRetention.seasonal = {
                version: 1,
                currentWeekKey: '',
                currentSeasonId: '',
                chapterByWeek: {},
                progressByWeek: {},
                adminWeeklyStock: {},
                adminLimitedRewards: [],
                lastUpdatedAt: 0
            };
        }
        const seasonal = state.journeyRetention.seasonal;
        if (!isObject(seasonal.chapterByWeek)) seasonal.chapterByWeek = {};
        if (!isObject(seasonal.progressByWeek)) seasonal.progressByWeek = {};
        if (!isObject(seasonal.adminWeeklyStock)) seasonal.adminWeeklyStock = {};
        if (!Array.isArray(seasonal.adminLimitedRewards)) seasonal.adminLimitedRewards = [];
        return seasonal;
    }

    function hashString(input) {
        const str = String(input || '');
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function pickDeterministic(arr, seed, count) {
        const source = Array.isArray(arr) ? arr.slice() : [];
        const out = [];
        let h = hashString(seed);
        while (source.length > 0 && out.length < count) {
            h = Math.imul((h ^ 0x9e3779b9) >>> 0, 1664525) + 1013904223;
            const index = Math.abs(h >>> 0) % source.length;
            out.push(source.splice(index, 1)[0]);
        }
        return out;
    }

    function materializeObjective(trackKey, template, seed) {
        const baseTarget = clampInt(template && template.target, 1);
        const variance = (hashString(seed + ':' + (template && template.key)) % 2);
        const target = baseTarget + variance;
        const labelTemplate = String(template && template.label || '{target}');
        return {
            id: `seasonal_${trackKey}_${template.key}`,
            track: trackKey,
            metric: String(template && template.metric || ''),
            target,
            label: labelTemplate.replace('{target}', String(target)).replace('{plural}', target === 1 ? '' : 's'),
            reward: isObject(template && template.reward) ? Object.assign({}, template.reward) : { tokens: 2 }
        };
    }

    function buildSeasonalChapterForWeek(weekKey, seasonId) {
        const season = DEFAULT_SEASONAL_DEFS[seasonId] || DEFAULT_SEASONAL_DEFS.spring;
        const trackKeys = pickDeterministic(season.tracks, `${seasonId}:${weekKey}:tracks`, Math.min(3, season.tracks.length));
        const objectives = [];
        trackKeys.forEach((trackKey) => {
            const library = TRACK_OBJECTIVE_LIBRARY[trackKey] || [];
            const picks = pickDeterministic(library, `${seasonId}:${weekKey}:${trackKey}`, 1);
            picks.forEach((template) => objectives.push(materializeObjective(trackKey, template, `${weekKey}:${seasonId}`)));
        });
        const weekStart = parseDateOnly(weekKey) || new Date();
        const weekEnd = new Date(weekStart.getTime());
        weekEnd.setDate(weekEnd.getDate() + 6);
        return {
            id: `seasonal_${seasonId}_${weekKey}`,
            weekKey,
            seasonId,
            title: `${season.icon} ${season.label}`,
            icon: season.icon,
            tracks: trackKeys,
            startsOn: weekKey,
            endsOn: toDateOnlyString(weekEnd),
            objectives,
            rewardTrack: [
                { id: 'seasonal_tokens', type: 'tokens', amount: 8, label: 'Journey Tokens x8' },
                { id: `seasonal_${seasonId}_cosmetic`, type: 'seasonalCosmetic', seasonId, label: `${season.label} keepsake` }
            ]
        };
    }

    function pruneSeasonalState(seasonal) {
        if (!seasonal) return;
        const weekKeys = Object.keys(seasonal.chapterByWeek || {}).sort();
        const keep = new Set(weekKeys.slice(-8));
        Object.keys(seasonal.chapterByWeek || {}).forEach((key) => { if (!keep.has(key)) delete seasonal.chapterByWeek[key]; });
        Object.keys(seasonal.progressByWeek || {}).forEach((key) => { if (!keep.has(key)) delete seasonal.progressByWeek[key]; });
        Object.keys(seasonal.adminWeeklyStock || {}).forEach((key) => { if (!keep.has(key)) delete seasonal.adminWeeklyStock[key]; });
        seasonal.adminLimitedRewards = (seasonal.adminLimitedRewards || []).filter((entry) => {
            if (!entry || entry.expiresOn == null) return true;
            const expires = parseDateOnly(entry.expiresOn);
            return !!expires && expires.getTime() >= (Date.now() - 86400000);
        });
    }

    function ensureSeasonalWeekState(gs, nowValue) {
        if (!isFeatureEnabled()) return null;
        const state = gs || getState();
        const seasonal = ensureJourneyRetentionState(state);
        if (!seasonal) return null;
        const weekKey = getWeekKey(nowValue);
        const seasonId = getCurrentSeasonId(nowValue);
        if (!seasonal.chapterByWeek[weekKey]) {
            seasonal.chapterByWeek[weekKey] = buildSeasonalChapterForWeek(weekKey, seasonId);
        }
        if (!isObject(seasonal.progressByWeek[weekKey])) {
            seasonal.progressByWeek[weekKey] = { progress: {}, completedObjectives: {}, claimedRewards: {}, createdAt: Date.now(), updatedAt: Date.now() };
        }
        seasonal.currentWeekKey = weekKey;
        seasonal.currentSeasonId = seasonId;
        seasonal.lastUpdatedAt = Date.now();
        pruneSeasonalState(seasonal);
        return { seasonal, weekKey, seasonId, chapter: seasonal.chapterByWeek[weekKey], progress: seasonal.progressByWeek[weekKey] };
    }

    function getCurrentSeasonalJourney() {
        const ctx = ensureSeasonalWeekState();
        if (!ctx) return null;
        const chapter = ctx.chapter;
        const progress = ctx.progress;
        const objectives = (Array.isArray(chapter.objectives) ? chapter.objectives : []).map((objective) => {
            const value = clampInt(progress.progress && progress.progress[objective.id], 0);
            const target = clampInt(objective.target, 1);
            return {
                id: objective.id,
                label: objective.label,
                track: objective.track,
                value: Math.min(target, value),
                target,
                done: !!(progress.completedObjectives && progress.completedObjectives[objective.id]),
                reward: objective.reward || null
            };
        });
        const doneCount = objectives.filter((o) => o.done).length;
        return {
            weekKey: ctx.weekKey,
            seasonId: ctx.seasonId,
            chapterId: chapter.id,
            title: chapter.title,
            icon: chapter.icon,
            startsOn: chapter.startsOn,
            endsOn: chapter.endsOn,
            tracks: Array.isArray(chapter.tracks) ? chapter.tracks.slice() : [],
            objectives,
            rewardTrack: Array.isArray(chapter.rewardTrack) ? chapter.rewardTrack.slice() : [],
            progressPct: objectives.length ? Math.round((doneCount / objectives.length) * 100) : 0,
            completedObjectives: doneCount,
            totalObjectives: objectives.length,
            adminWeeklyStock: (ctx.seasonal.adminWeeklyStock && ctx.seasonal.adminWeeklyStock[ctx.weekKey]) || null,
            limitedRewards: getActiveLimitedRewards(ctx.weekKey)
        };
    }

    function incrementSeasonalObjectiveProgress(objectiveId, amount) {
        const ctx = ensureSeasonalWeekState();
        if (!ctx || !objectiveId) return null;
        const add = clampInt(amount, 0);
        if (add <= 0) return getCurrentSeasonalJourney();
        const chapter = ctx.chapter;
        const objective = (chapter.objectives || []).find((o) => o && o.id === objectiveId);
        if (!objective) return getCurrentSeasonalJourney();
        if (!isObject(ctx.progress.progress)) ctx.progress.progress = {};
        ctx.progress.progress[objectiveId] = clampInt(ctx.progress.progress[objectiveId], 0) + add;
        if (clampInt(ctx.progress.progress[objectiveId], 0) >= clampInt(objective.target, 1)) {
            ctx.progress.completedObjectives[objectiveId] = { at: Date.now() };
        }
        ctx.progress.updatedAt = Date.now();
        return getCurrentSeasonalJourney();
    }

    function recordActivity(activityKey, amount) {
        const ctx = ensureSeasonalWeekState();
        if (!ctx) return null;
        const normalized = String(activityKey || '').toLowerCase();
        const metricAliases = {
            streak: ['streakClaims'],
            explore: ['expeditionsCompleted'],
            expedition: ['expeditionsCompleted'],
            garden: ['harvestCount', 'gardenPlantCount'],
            harvest: ['harvestCount'],
            plant: ['gardenPlantCount'],
            care: ['totalCareActions', 'totalFeedCount'],
            feed: ['totalFeedCount', 'totalCareActions'],
            daily: ['totalDailyCompletions'],
            social: ['bondEvents']
        };
        const metrics = metricAliases[normalized] || [normalized];
        const objectives = Array.isArray(ctx.chapter && ctx.chapter.objectives) ? ctx.chapter.objectives : [];
        let changed = false;
        objectives.forEach((objective) => {
            if (!objective || metrics.indexOf(String(objective.metric || '')) === -1) return;
            incrementSeasonalObjectiveProgress(objective.id, amount || 1);
            changed = true;
        });
        return changed ? getCurrentSeasonalJourney() : getCurrentSeasonalJourney();
    }

    function getActiveLimitedRewards(weekKey) {
        const state = getState();
        const seasonal = ensureJourneyRetentionState(state);
        const today = parseDateOnly(getTodayString()) || new Date();
        const list = Array.isArray(seasonal && seasonal.adminLimitedRewards) ? seasonal.adminLimitedRewards : [];
        return list
            .filter((entry) => {
                if (!isObject(entry)) return false;
                if (entry.weekKey && weekKey && String(entry.weekKey) !== String(weekKey)) return false;
                const starts = entry.startsOn ? parseDateOnly(entry.startsOn) : null;
                const ends = entry.expiresOn ? parseDateOnly(entry.expiresOn) : null;
                if (starts && starts.getTime() > today.getTime()) return false;
                if (ends && ends.getTime() < today.getTime()) return false;
                return true;
            })
            .map((entry) => Object.assign({}, entry));
    }

    function adminSeedWeeklyStock(weekKey, stockItems) {
        const seasonal = ensureJourneyRetentionState();
        if (!seasonal) return { ok: false, reason: 'state-unavailable' };
        const key = typeof weekKey === 'string' && weekKey ? weekKey : getWeekKey();
        seasonal.adminWeeklyStock[key] = Array.isArray(stockItems) ? stockItems.filter(Boolean).map((item) => Object.assign({}, item)) : [];
        seasonal.lastUpdatedAt = Date.now();
        return { ok: true, weekKey: key, count: seasonal.adminWeeklyStock[key].length };
    }

    function adminSeedLimitedRewards(rewardEntries) {
        const seasonal = ensureJourneyRetentionState();
        if (!seasonal) return { ok: false, reason: 'state-unavailable' };
        seasonal.adminLimitedRewards = Array.isArray(rewardEntries)
            ? rewardEntries.filter(Boolean).map((entry) => Object.assign({}, entry))
            : [];
        seasonal.lastUpdatedAt = Date.now();
        return { ok: true, count: seasonal.adminLimitedRewards.length };
    }

    function getAdminWeeklyStockSeed(weekKey) {
        const seasonal = ensureJourneyRetentionState();
        if (!seasonal) return [];
        return Array.isArray(seasonal.adminWeeklyStock && seasonal.adminWeeklyStock[weekKey]) ? seasonal.adminWeeklyStock[weekKey].map((i) => Object.assign({}, i)) : [];
    }

    const api = Object.freeze({
        getWeekKey,
        getCurrentSeasonalJourney,
        incrementSeasonalObjectiveProgress,
        recordActivity,
        ensureSeasonalWeekState,
        adminSeedWeeklyStock,
        adminSeedLimitedRewards,
        getAdminWeeklyStockSeed,
        getActiveLimitedRewards
    });

    if (root && typeof root === 'object') {
        root.MLFSeasonalJourney = api;
        if (typeof root.getCurrentSeasonalJourney !== 'function') root.getCurrentSeasonalJourney = api.getCurrentSeasonalJourney;
        if (typeof root.incrementSeasonalObjectiveProgress !== 'function') root.incrementSeasonalObjectiveProgress = api.incrementSeasonalObjectiveProgress;
        if (typeof root.recordSeasonalJourneyActivity !== 'function') root.recordSeasonalJourneyActivity = api.recordActivity;
        if (typeof root.adminSeedSeasonalWeeklyStock !== 'function') root.adminSeedSeasonalWeeklyStock = api.adminSeedWeeklyStock;
        if (typeof root.adminSeedSeasonalLimitedRewards !== 'function') root.adminSeedSeasonalLimitedRewards = api.adminSeedLimitedRewards;
    }

    return api;
});
