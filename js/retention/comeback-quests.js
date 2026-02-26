(function initMLFComebackQuests(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFComebackQuests = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFComebackQuests(root) {
    'use strict';

    const QUEST_TEMPLATES = Object.freeze({
        streak: { id: 'streak', title: 'Warm up your streak', body: 'Claim your streak reward to restart momentum.', metric: 'streak', target: 1, actionType: 'streak', reward: { tokens: 4, bondXp: 6 } },
        expedition: { id: 'expedition', title: 'Return to exploration', body: 'Run a quick expedition to reconnect with your adventure loop.', metric: 'explore', target: 1, actionType: 'explore', reward: { tokens: 5, coins: 25 } },
        garden: { id: 'garden', title: 'Tend the garden again', body: 'Visit the garden and complete a harvest or planting action.', metric: 'garden', target: 1, actionType: 'garden', reward: { tokens: 4, coins: 20 } },
        care: { id: 'care', title: 'Rebuild the care routine', body: 'Do a few care actions to re-establish the bond rhythm.', metric: 'care', target: 3, actionType: 'journey', reward: { tokens: 4, bondXp: 8 } },
        social: { id: 'social', title: 'Check in on the household', body: 'Open household social time and trigger one relationship moment.', metric: 'social', target: 1, actionType: 'social', reward: { tokens: 5, bondXp: 4 } }
    });
    const ACTIVITY_ALIASES = Object.freeze({
        expedition: 'explore',
        explore: 'explore',
        garden: 'garden',
        harvest: 'garden',
        plant: 'garden',
        feed: 'care',
        wash: 'care',
        play: 'care',
        sleep: 'care',
        medicine: 'care',
        groom: 'care',
        exercise: 'care',
        care: 'care',
        streak: 'streak',
        journey: 'journey',
        social: 'social',
        household: 'social'
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

    function getTodayString() {
        if (typeof root.getTodayString === 'function') {
            try { return root.getTodayString(); } catch (_) {}
        }
        return new Date().toISOString().slice(0, 10);
    }

    function isFeatureEnabled() {
        if (typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled('comebackQuestsEnabled'); } catch (_) {}
        }
        return true;
    }

    function ensureMetaState() {
        if (typeof root.ensureRetentionMetaState === 'function') {
            try { return root.ensureRetentionMetaState(); } catch (_) {}
        }
        const gs = getState();
        if (!gs) return null;
        if (!isObject(gs.meta)) gs.meta = {};
        if (!isObject(gs.meta.reactivation)) {
            gs.meta.reactivation = {
                lastSeenDate: null,
                awayDays: 0,
                lastActivity: '',
                pendingRecap: null,
                lastDialogueDate: '',
                lastRecapShownDate: '',
                comebackQuest: null
            };
        }
        if (!isObject(gs.meta.reactivation)) return null;
        return gs.meta;
    }

    function hashString(input) {
        const str = String(input || '');
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    function normalizeMetric(activityKey) {
        const key = String(activityKey || '').trim().toLowerCase();
        return ACTIVITY_ALIASES[key] || key || 'care';
    }

    function chooseQuestTemplate(awayDays, lastActivity, playerId) {
        const away = clampInt(awayDays, 0);
        const primary = normalizeMetric(lastActivity);
        const weighted = [];
        if (away >= 7) weighted.push('streak');
        if (away >= 3) weighted.push('care');
        if (primary === 'explore') weighted.push('expedition');
        if (primary === 'garden') weighted.push('garden');
        if (primary === 'social') weighted.push('social');
        if (weighted.length === 0) weighted.push('care', 'streak', 'expedition');
        const pick = weighted[hashString(`${playerId || 'unknown'}:${away}:${primary}:${getTodayString()}`) % weighted.length];
        return QUEST_TEMPLATES[pick] || QUEST_TEMPLATES.care;
    }

    function createComebackQuest(input) {
        const awayDays = clampInt(input && input.awayDays, 0);
        if (awayDays < 1) return null;
        const lastActivity = String(input && input.lastActivity || '').toLowerCase();
        const playerId = String(input && input.playerId || 'unknown-player');
        const base = chooseQuestTemplate(awayDays, lastActivity, playerId);
        const quest = {
            id: `cbq_${base.id}_${getTodayString()}`,
            templateId: base.id,
            title: base.title,
            body: awayDays >= 7 ? `${base.body} (Welcome-back bonus active.)` : base.body,
            metric: base.metric,
            target: awayDays >= 7 && base.metric === 'care' ? Math.max(3, base.target + 1) : base.target,
            progress: 0,
            actionType: base.actionType,
            reward: Object.assign({}, base.reward || {}, awayDays >= 7 ? { tokens: clampInt((base.reward && base.reward.tokens) || 0, 0) + 2 } : null),
            awayDays,
            sourceActivity: lastActivity || '',
            createdAt: Date.now(),
            createdOn: getTodayString(),
            completedAt: 0,
            claimedAt: 0,
            status: 'active'
        };
        return quest;
    }

    function getActiveComebackQuest() {
        if (!isFeatureEnabled()) return null;
        const meta = ensureMetaState();
        if (!meta || !meta.reactivation) return null;
        const quest = isObject(meta.reactivation.comebackQuest) ? meta.reactivation.comebackQuest : null;
        if (!quest) return null;
        if (quest.status === 'completed' && Number(quest.claimedAt) > 0) return null;
        return quest;
    }

    function grantQuestReward(quest) {
        if (!isObject(quest)) return { granted: false };
        let grantedTokens = 0;
        let grantedCoins = 0;
        let bondXp = 0;
        if (quest.reward && Number.isFinite(Number(quest.reward.tokens))) {
            if (root.Journey && typeof root.Journey.ensureJourneyState === 'function') {
                const gs = getState();
                const journey = root.Journey.ensureJourneyState(gs);
                if (journey) {
                    journey.tokens = clampInt(journey.tokens, 0) + clampInt(quest.reward.tokens, 0);
                    grantedTokens = clampInt(quest.reward.tokens, 0);
                }
            }
        }
        if (quest.reward && Number.isFinite(Number(quest.reward.coins))) {
            if (typeof root.addCoins === 'function') {
                try { root.addCoins(clampInt(quest.reward.coins, 0), 'Comeback Quest', true); } catch (_) {}
            } else {
                const gs = getState();
                if (gs && isObject(gs.economy)) gs.economy.coins = clampInt(gs.economy.coins, 0) + clampInt(quest.reward.coins, 0);
            }
            grantedCoins = clampInt(quest.reward.coins, 0);
        }
        if (quest.reward && Number.isFinite(Number(quest.reward.bondXp)) && root.Journey && typeof root.Journey.getCurrentChapter === 'function') {
            const gs = getState();
            if (gs && isObject(gs.journeyRetention)) {
                if (!isObject(gs.journeyRetention.bond)) gs.journeyRetention.bond = { xp: 0, level: 1 };
                gs.journeyRetention.bond.xp = clampInt(gs.journeyRetention.bond.xp, 0) + clampInt(quest.reward.bondXp, 0);
                gs.journeyRetention.bond.level = Math.max(1, 1 + Math.floor(clampInt(gs.journeyRetention.bond.xp, 0) / 45));
                bondXp = clampInt(quest.reward.bondXp, 0);
            }
        }
        return { granted: true, tokens: grantedTokens, coins: grantedCoins, bondXp };
    }

    function ensureComebackQuestForCurrentPlayer(input) {
        if (!isFeatureEnabled()) return null;
        const gs = getState();
        const meta = ensureMetaState();
        if (!gs || !meta || !meta.reactivation) return null;
        const awayDays = clampInt((input && input.awayDays) != null ? input.awayDays : meta.reactivation.awayDays, 0);
        if (awayDays < 1) {
            meta.reactivation.comebackQuest = null;
            return null;
        }
        const today = getTodayString();
        const existing = getActiveComebackQuest();
        if (existing && String(existing.createdOn || '') === today) return existing;
        const playerId = (gs.economy && gs.economy.playerId) ? gs.economy.playerId : 'unknown-player';
        const lastActivity = (input && input.lastActivity) || meta.reactivation.lastActivity || '';
        const quest = createComebackQuest({ awayDays, lastActivity, playerId });
        meta.reactivation.comebackQuest = quest;
        if (quest && typeof root.addReminderCenterItem === 'function') {
            try {
                root.addReminderCenterItem('comeback', `✨ ${quest.title}`, quest.body, { type: 'comeback' });
            } catch (_) {}
        }
        return quest;
    }

    function updateComebackQuestProgress(metric, amount) {
        if (!isFeatureEnabled()) return null;
        const meta = ensureMetaState();
        if (!meta || !meta.reactivation) return null;
        const quest = getActiveComebackQuest();
        if (!quest || quest.status !== 'active') return null;
        const normalized = normalizeMetric(metric);
        if (!normalized) return quest;
        if (normalized !== String(quest.metric || '').toLowerCase()) return quest;
        const add = Math.max(1, clampInt(amount, 1));
        quest.progress = Math.min(clampInt(quest.target, 1), clampInt(quest.progress, 0) + add);
        if (quest.progress >= clampInt(quest.target, 1)) {
            quest.status = 'completed';
            if (!quest.readyToClaim) {
                quest.readyToClaim = true;
                quest.completedAt = Date.now();
                // Don't auto-claim; let the user claim from the UI
                if (typeof root.showToast === 'function') {
                    try { root.showToast('Comeback quest complete! Claim your reward!', '#4CAF50'); } catch (_) {}
                }
            }
        }
        if (typeof root.saveGame === 'function') {
            try { root.saveGame({ silentIndicator: true, source: 'comeback-quest' }); } catch (_) {}
        }
        return quest;
    }

    function recordActivity(activityKey, amount) {
        const normalized = normalizeMetric(activityKey);
        return updateComebackQuestProgress(normalized, amount || 1);
    }

    function openComebackQuest() {
        const quest = getActiveComebackQuest();
        if (!quest) return false;
        if (root.MLFRetentionTelemetry && typeof root.MLFRetentionTelemetry.recordComebackOpen === 'function') {
            try { root.MLFRetentionTelemetry.recordComebackOpen(quest.awayDays || 0); } catch (_) {}
        }
        if (typeof root.noteRetentionActivity === 'function') {
            try { root.noteRetentionActivity('comeback'); } catch (_) {}
        }
        if (quest.actionType === 'streak' && typeof root.showStreakModal === 'function') return !!root.showStreakModal();
        if (quest.actionType === 'explore' && typeof root.showExplorationModal === 'function') return !!root.showExplorationModal();
        if (quest.actionType === 'garden') {
            if (typeof root.switchRoom === 'function') root.switchRoom('garden');
            if (typeof root.renderPetPhase === 'function') root.renderPetPhase();
            return true;
        }
        if (quest.actionType === 'social' && typeof root.showHouseholdSummaryModal === 'function') return !!root.showHouseholdSummaryModal();
        if (typeof root.showJourneyModal === 'function') return !!root.showJourneyModal();
        return false;
    }

    const api = Object.freeze({
        createComebackQuest,
        ensureComebackQuestForCurrentPlayer,
        getActiveComebackQuest,
        updateComebackQuestProgress,
        recordActivity,
        openComebackQuest
    });

    if (root && typeof root === 'object') {
        root.MLFComebackQuests = api;
        if (typeof root.ensureComebackQuestForCurrentPlayer !== 'function') root.ensureComebackQuestForCurrentPlayer = api.ensureComebackQuestForCurrentPlayer;
        if (typeof root.getActiveComebackQuest !== 'function') root.getActiveComebackQuest = api.getActiveComebackQuest;
        if (typeof root.recordComebackQuestActivity !== 'function') root.recordComebackQuestActivity = api.recordActivity;
        if (typeof root.openComebackQuest !== 'function') root.openComebackQuest = api.openComebackQuest;
    }

    return api;
});
