(function initMLFRetentionReminders(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFRetentionReminders = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionReminders(root) {
    'use strict';

    const DEFAULT_CFG = Object.freeze({
        maxItems: 12,
        dedupePerDay: true,
        lowValueDemoteAgeHours: 18
    });
    const HIGH_VALUE_TYPES = new Set(['streakRisk', 'expeditionReady', 'hatchReady', 'eggNearHatch', 'comeback', 'household']);
    const MID_VALUE_TYPES = new Set(['journey', 'daily', 'garden', 'explore']);
    const LOW_VALUE_TYPES = new Set(['novelty', 'eventSpike', 'tip']);

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function getState() {
        if (root && root.gameState) return root.gameState;
        if (root && root.StateManager && typeof root.StateManager.getRawState === 'function') {
            try { return root.StateManager.getRawState(); } catch (_) {}
        }
        return null;
    }

    function getTodayString() {
        if (typeof root.getTodayString === 'function') {
            try { return root.getTodayString(); } catch (_) {}
        }
        return new Date().toISOString().slice(0, 10);
    }

    function getReminderConfig() {
        const cfg = (typeof root.REMINDER_CENTER_CONFIG !== 'undefined' && root.REMINDER_CENTER_CONFIG) ? root.REMINDER_CENTER_CONFIG : {};
        const p1 = (typeof root.getRetentionP1Tuning === 'function') ? root.getRetentionP1Tuning() : null;
        const p1Reminder = p1 && p1.reminderCenter ? p1.reminderCenter : {};
        return Object.assign({}, DEFAULT_CFG, cfg, p1Reminder);
    }

    function ensureRetentionMetaStateCompat(targetState) {
        if (typeof root.ensureRetentionMetaState === 'function') {
            try { return root.ensureRetentionMetaState(targetState); } catch (_) {}
        }
        const state = (targetState && typeof targetState === 'object') ? targetState : getState();
        if (!state) return null;
        if (!isObject(state.meta)) state.meta = {};
        if (!isObject(state.meta.reminderCenter)) {
            state.meta.reminderCenter = {
                items: [],
                promptDismissed: false,
                lastPromptSession: 0,
                lastDigestDate: ''
            };
        }
        if (!Array.isArray(state.meta.reminderCenter.items)) state.meta.reminderCenter.items = [];
        if (!isObject(state.meta.reactivation)) {
            state.meta.reactivation = {
                lastSeenDate: null,
                awayDays: 0,
                lastActivity: '',
                pendingRecap: null,
                lastDialogueDate: '',
                lastRecapShownDate: ''
            };
        }
        if (!isObject(state.meta.onboarding)) {
            state.meta.onboarding = { sessionGuideSkipped: false, reminderPromptSeen: false };
        }
        return state.meta;
    }

    function getReminderTypePriority(type) {
        if (HIGH_VALUE_TYPES.has(type)) return 100;
        if (MID_VALUE_TYPES.has(type)) return 60;
        if (LOW_VALUE_TYPES.has(type)) return 25;
        return 40;
    }

    function getReminderAgeHours(item) {
        const createdAt = Number(item && item.createdAt) || 0;
        if (!createdAt) return 0;
        return Math.max(0, (Date.now() - createdAt) / 3600000);
    }

    function computePriorityScore(item) {
        const cfg = getReminderConfig();
        const type = String(item && item.type || '');
        let score = getReminderTypePriority(type);
        const ageHours = getReminderAgeHours(item);
        if (LOW_VALUE_TYPES.has(type) && ageHours >= Number(cfg.lowValueDemoteAgeHours || DEFAULT_CFG.lowValueDemoteAgeHours)) {
            score -= Math.min(20, Math.floor((ageHours - cfg.lowValueDemoteAgeHours) / 6) * 5 + 10);
        }
        if (HIGH_VALUE_TYPES.has(type)) {
            score -= Math.min(15, Math.floor(ageHours / 24) * 2);
        } else {
            score -= Math.min(18, Math.floor(ageHours / 12) * 3);
        }
        return score;
    }

    function sortReminderItems(items) {
        return (Array.isArray(items) ? items.slice() : [])
            .filter(Boolean)
            .map((item) => Object.assign({}, item, { priorityScore: computePriorityScore(item) }))
            .sort((a, b) => {
                const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
                if (scoreDiff !== 0) return scoreDiff;
                return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
            });
    }

    function dedupeKeyForItem(type, title, body) {
        return [type || '', title || '', body || '', getTodayString()].join('|').toLowerCase();
    }

    function addReminderCenterItem(type, title, body, action) {
        const state = getState();
        const meta = ensureRetentionMetaStateCompat(state);
        if (!meta) return null;
        const cfg = getReminderConfig();
        const list = meta.reminderCenter.items;
        const safeType = String(type || 'tip');
        const safeTitle = String(title || '').trim();
        const safeBody = String(body || '').trim();
        const safeAction = isObject(action) ? Object.assign({}, action) : (action ? { type: String(action) } : null);
        if (!safeTitle) return null;

        if (cfg.dedupePerDay) {
            const key = dedupeKeyForItem(safeType, safeTitle, safeBody);
            const existing = list.find((item) => item && item.dedupeKey === key);
            if (existing) {
                existing.updatedAt = Date.now();
                existing.action = safeAction || existing.action || null;
                existing.priorityScore = computePriorityScore(existing);
                return existing;
            }
        }

        const item = {
            id: `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            type: safeType,
            title: safeTitle,
            body: safeBody,
            action: safeAction,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            dedupeKey: cfg.dedupePerDay ? dedupeKeyForItem(safeType, safeTitle, safeBody) : null
        };
        list.push(item);
        const sorted = sortReminderItems(list);
        meta.reminderCenter.items = sorted.slice(0, Math.max(1, Number(cfg.maxItems) || DEFAULT_CFG.maxItems));
        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-reminder' }); } catch (_) {}
        }
        return item;
    }

    function getReminderCenterItems() {
        const state = getState();
        const meta = ensureRetentionMetaStateCompat(state);
        if (!meta) return [];
        meta.reminderCenter.items = sortReminderItems(meta.reminderCenter.items);
        return meta.reminderCenter.items.slice();
    }

    function dismissReminderCenterItem(itemId) {
        const state = getState();
        const meta = ensureRetentionMetaStateCompat(state);
        if (!meta || !itemId) return false;
        const before = meta.reminderCenter.items.length;
        meta.reminderCenter.items = meta.reminderCenter.items.filter((item) => item && item.id !== itemId);
        const changed = meta.reminderCenter.items.length !== before;
        if (changed && typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-reminder-dismiss' }); } catch (_) {}
        }
        return changed;
    }

    function runReminderAction(action) {
        const a = isObject(action) ? action : { type: String(action || '') };
        const type = String(a.type || '').toLowerCase();
        if (type === 'journey' && typeof root.showJourneyModal === 'function') {
            root.showJourneyModal();
            return true;
        }
        if ((type === 'explore' || type === 'expedition') && typeof root.showExplorationModal === 'function') {
            root.showExplorationModal();
            return true;
        }
        if (type === 'streak' && typeof root.showStreakModal === 'function') {
            root.showStreakModal();
            return true;
        }
        if (type === 'garden') {
            if (typeof root.switchRoom === 'function') root.switchRoom('garden');
            if (typeof root.renderPetPhase === 'function') root.renderPetPhase();
            return true;
        }
        if (type === 'daily' && typeof root.showDailyChecklistModal === 'function') {
            root.showDailyChecklistModal();
            return true;
        }
        return false;
    }

    function openReminderCenterAction(itemId) {
        const items = getReminderCenterItems();
        const item = items.find((entry) => entry && entry.id === itemId);
        if (!item) return false;
        return runReminderAction(item.action);
    }

    function dismissReminderPrompt() {
        const meta = ensureRetentionMetaStateCompat();
        if (!meta) return false;
        meta.reminderCenter.promptDismissed = true;
        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-reminder-prompt-dismiss' }); } catch (_) {}
        }
        return true;
    }

    function markReminderPromptSeen() {
        const meta = ensureRetentionMetaStateCompat();
        if (!meta) return false;
        meta.onboarding.reminderPromptSeen = true;
        meta.reminderCenter.lastPromptSession = Date.now();
        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'retention-reminder-prompt-seen' }); } catch (_) {}
        }
        return true;
    }

    function shouldShowReminderPrompt() {
        const state = getState();
        if (!state) return false;
        const meta = ensureRetentionMetaStateCompat(state);
        if (!meta) return false;
        if (meta.reminderCenter.promptDismissed || meta.onboarding.reminderPromptSeen) return false;
        if (state.reminders && state.reminders.permission === 'denied') return false;
        return !(state.reminders && state.reminders.enabled === true);
    }

    function noteRetentionActivity(activityKey) {
        const meta = ensureRetentionMetaStateCompat();
        if (!meta) return false;
        meta.reactivation.lastActivity = String(activityKey || '').trim() || meta.reactivation.lastActivity || '';
        meta.reactivation.lastSeenDate = getTodayString();
        return true;
    }

    function getMaxRelationshipPoints(state) {
        const gs = state || getState();
        if (!gs || !isObject(gs.relationships)) return 0;
        let max = 0;
        Object.values(gs.relationships).forEach((rel) => {
            if (rel && Number.isFinite(rel.points)) max = Math.max(max, Math.floor(rel.points));
        });
        return max;
    }

    function getRetentionEmotionalPrompt() {
        const gs = getState();
        const meta = ensureRetentionMetaStateCompat(gs);
        if (!gs || !meta) return null;
        const lastActivity = String(meta.reactivation.lastActivity || '').toLowerCase();
        const streak = gs.streak || {};
        const relationshipPoints = getMaxRelationshipPoints(gs);
        const bondLevel = Math.max(
            1,
            Number((gs.journeyRetention && gs.journeyRetention.bond && gs.journeyRetention.bond.level) || (meta.bond && meta.bond.level) || 1) || 1
        );
        const awayDays = Math.max(0, Number(meta.reactivation.awayDays) || 0);

        if (streak.current > 0 && !streak.todayBonusClaimed) {
            return {
                title: 'Keep your streak warm',
                body: `Your ${streak.current}-day streak bonus is ready. One tap now keeps the routine easy.`,
                ctaLabel: 'Claim streak',
                actionType: 'streak'
            };
        }
        if (awayDays >= 2) {
            return {
                title: 'Ease back into the routine',
                body: 'Start with one familiar activity to rebuild momentum. Your Journey can drip catch-up rewards over the next few logins.',
                ctaLabel: 'Open Journey',
                actionType: 'journey'
            };
        }
        if (relationshipPoints >= 80 && Array.isArray(gs.pets) && gs.pets.length >= 2) {
            return {
                title: 'Your household bond is growing',
                body: 'A quick social interaction can turn this relationship progress into a visible memory beat.',
                ctaLabel: 'Open Social',
                actionType: 'social'
            };
        }
        if (lastActivity === 'expedition' || lastActivity === 'explore') {
            return {
                title: 'Resume your last adventure',
                body: bondLevel >= 3 ? 'Your pet remembers the last expedition. A short explore run will feel rewarding right away.' : 'A quick expedition is a strong momentum-builder for this session.',
                ctaLabel: 'Explore',
                actionType: 'explore'
            };
        }
        if (lastActivity === 'harvest' || (gs.garden && Number(gs.garden.totalHarvests) > 0)) {
            return {
                title: 'Your garden can pay off now',
                body: 'A short garden check-in often converts into instant rewards and a calmer care loop.',
                ctaLabel: 'Go to Garden',
                actionType: 'garden'
            };
        }
        return {
            title: bondLevel >= 3 ? 'Your pet notices your routine' : 'Build today’s bond',
            body: bondLevel >= 3
                ? 'A short care session plus one activity keeps the emotional momentum strong.'
                : 'Feed, play, and finish one small objective to strengthen your Journey chapter.',
            ctaLabel: 'Open Journey',
            actionType: 'journey'
        };
    }

    const api = Object.freeze({
        addReminderCenterItem,
        getReminderCenterItems,
        dismissReminderCenterItem,
        openReminderCenterAction,
        shouldShowReminderPrompt,
        markReminderPromptSeen,
        dismissReminderPrompt,
        noteRetentionActivity,
        getRetentionEmotionalPrompt
    });

    if (root && typeof root === 'object') {
        root.MLFRetentionReminders = api;
        if (typeof root.addReminderCenterItem !== 'function') root.addReminderCenterItem = api.addReminderCenterItem;
        if (typeof root.getReminderCenterItems !== 'function') root.getReminderCenterItems = api.getReminderCenterItems;
        if (typeof root.dismissReminderCenterItem !== 'function') root.dismissReminderCenterItem = api.dismissReminderCenterItem;
        if (typeof root.openReminderCenterAction !== 'function') root.openReminderCenterAction = api.openReminderCenterAction;
        if (typeof root.shouldShowReminderPrompt !== 'function') root.shouldShowReminderPrompt = api.shouldShowReminderPrompt;
        if (typeof root.markReminderPromptSeen !== 'function') root.markReminderPromptSeen = api.markReminderPromptSeen;
        if (typeof root.dismissReminderPrompt !== 'function') root.dismissReminderPrompt = api.dismissReminderPrompt;
        if (typeof root.noteRetentionActivity !== 'function') root.noteRetentionActivity = api.noteRetentionActivity;
        if (typeof root.getRetentionEmotionalPrompt !== 'function') root.getRetentionEmotionalPrompt = api.getRetentionEmotionalPrompt;
    }

    return api;
});
