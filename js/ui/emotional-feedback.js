(function initMLFEmotionalFeedback(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFEmotionalFeedback = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFEmotionalFeedback(root) {
    'use strict';

    const MOMENT_UPDATE_DEBOUNCE_MS = 280;
    const LEGACY_CAPTURE_WINDOW_MS = 2000;
    const DEFAULT_QUIET_BEAT_MS = 220;
    const SESSION_REFLECTION_KEY = '__mlf_emotional_reflection_shown__';

    // P3-38: Safe sessionStorage helpers to handle unavailable/full storage
    function safeSessionGet(key) {
        try { return sessionStorage.getItem(key); } catch (_) { return null; }
    }
    function safeSessionSet(key, value) {
        try { sessionStorage.setItem(key, value); } catch (_) {}
    }

    const ACTION_RESULT_TEXT = Object.freeze({
        feed: 'Hunger restored.',
        wash: 'Cleanliness restored.',
        play: 'Happiness lifted.',
        sleep: 'Energy restored.',
        medicine: 'They are feeling steadier.',
        groom: 'They look well cared for.',
        exercise: 'That gave them a good stretch.',
        treat: 'A little comfort snack landed well.',
        cuddle: 'They settled into your affection.'
    });

    const ACTION_REACTION_EMOTE = Object.freeze({
        feed: '😋',
        wash: '✨',
        play: '😄',
        sleep: '😴',
        medicine: '💊',
        groom: '💇',
        exercise: '💪',
        treat: '🍪',
        cuddle: '🥰'
    });

    const ACTION_STAT_LABELS = Object.freeze({
        hunger: 'Hunger',
        cleanliness: 'Cleanliness',
        happiness: 'Happiness',
        energy: 'Energy'
    });

    const FIRST_TIME_COPY = Object.freeze({
        feed: 'That first shared meal made them feel at home.',
        wash: 'They trusted you with their first wash.',
        play: 'Your first play moment set the tone for the day.',
        sleep: 'They felt safe enough to rest with you nearby.',
        medicine: 'They let you help when they needed comfort.',
        groom: 'They let you fuss over every detail.',
        exercise: 'They followed your lead and found a rhythm with you.',
        treat: 'A little treat became a tiny bond ritual.',
        cuddle: 'They leaned into you without hesitation.'
    });

    const CARE_VERB_ING = Object.freeze({
        feed: 'meal',
        wash: 'wash',
        play: 'playtime',
        sleep: 'rest',
        medicine: 'care',
        groom: 'pampering',
        exercise: 'workout',
        treat: 'treat',
        cuddle: 'cuddle'
    });

    let _activeCareMoment = null;
    let _momentSeq = 0;
    let _sceneMoodCue = null;
    let _debugConfig = {
        forcedTier: '',
        simulateMetaBurst: false,
        pacingCareLoops: null
    };

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function reducedMotion() {
        try {
            if (typeof root.isReducedMotionEnabled === 'function') return !!root.isReducedMotionEnabled();
            if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-reduced-motion') === 'true') return true;
            if (typeof window !== 'undefined' && window.matchMedia) return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {}
        return false;
    }

    function nowMs() {
        return Date.now();
    }

    function compactText(input) {
        return String(input || '').replace(/\s+/g, ' ').trim();
    }

    function stripLeadingEmoji(text) {
        return compactText(String(text || '').replace(/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+/u, ''));
    }

    function normalizeMetaEntry(entry) {
        if (!entry) return null;
        if (typeof entry === 'string') {
            const txt = compactText(entry);
            return txt ? { text: txt, type: 'meta' } : null;
        }
        if (!isObject(entry)) return null;
        const text = compactText(entry.text || entry.message || '');
        if (!text) return null;
        return {
            text,
            type: compactText(entry.type || 'meta') || 'meta',
            priority: compactText(entry.priority || '') || '',
            source: compactText(entry.source || '') || ''
        };
    }

    function dedupeMeta(entries) {
        const out = [];
        const seen = new Set();
        (Array.isArray(entries) ? entries : []).forEach((entry) => {
            const row = normalizeMetaEntry(entry);
            if (!row) return;
            const key = row.text.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(row);
        });
        return out;
    }

    function summarizeStatChanges(statDeltas) {
        if (!isObject(statDeltas)) return [];
        return Object.keys(statDeltas)
            .map((key) => ({ key, amount: Number(statDeltas[key]) || 0 }))
            .filter((row) => row.amount !== 0)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
            .map((row) => ({
                key: row.key,
                amount: row.amount,
                label: ACTION_STAT_LABELS[row.key] || row.key
            }));
    }

    function buildPetReactionText(payload) {
        const petName = compactText(payload && payload.petName) || 'Your pet';
        const action = compactText(payload && payload.action) || 'care';
        const noun = CARE_VERB_ING[action] || 'care';
        const affinity = compactText(payload && payload.affinity) || '';
        const firstTime = !!(payload && payload.firstTimeAction);
        if (firstTime && FIRST_TIME_COPY[action]) {
            return FIRST_TIME_COPY[action].replace(/^They/, petName);
        }
        if (affinity === 'love') return `${petName} loved that ${noun}.`;
        if (affinity === 'dislike') return `${petName} took that ${noun} gently, but needed reassurance.`;
        if (affinity === 'tired') return `${petName} relaxed into that ${noun}.`;
        return `${petName} felt cared for.`;
    }

    function buildMainResultText(payload) {
        if (!payload) return 'Care completed.';
        const base = ACTION_RESULT_TEXT[payload.action] || 'Care completed.';
        const stats = summarizeStatChanges(payload.statDeltas);
        if (stats.length === 0) return base;
        if (stats.length === 1) {
            const s = stats[0];
            if (s.amount > 0) return `${s.label} +${s.amount}.`;
            return `${s.label} ${s.amount}.`;
        }
        const positives = stats.filter((s) => s.amount > 0).slice(0, 2);
        if (positives.length > 0) {
            return positives.map((s) => `${s.label} +${s.amount}`).join(' · ');
        }
        return base;
    }

    function inferTier(payload, meta) {
        if (_debugConfig && _debugConfig.forcedTier) return _debugConfig.forcedTier;
        const p = payload || {};
        const rows = Array.isArray(meta) ? meta : [];
        if (p.growthMilestone || p.chapterComplete || p.roomUnlock || rows.some((r) => /trophy|chapter|growth|milestone/i.test(String(r.type || '') + ' ' + String(r.text || '')))) {
            return 'Milestone';
        }
        if (p.firstTimeAction || rows.some((r) => /achievement|badge|reward|unlock|title|room/i.test(String(r.type || '') + ' ' + String(r.text || '')))) {
            return 'Notable';
        }
        return 'Routine';
    }

    function tierUiMode(tier) {
        if (tier === 'Milestone') return 'ceremony';
        if (tier === 'Notable') return 'banner';
        return 'inline';
    }

    function tierEffects(tier, action) {
        if (tier === 'Milestone') {
            return { hapticPreset: 'achievement', sfxId: 'reward-pop', animationPreset: `care-${action || 'generic'}-ceremony` };
        }
        if (tier === 'Notable') {
            return { hapticPreset: 'confirm', sfxId: 'ui-focus', animationPreset: `care-${action || 'generic'}-focus` };
        }
        return { hapticPreset: 'tap', sfxId: 'ui-tap-2', animationPreset: `care-${action || 'generic'}-soft` };
    }

    function buildPresentationPlan(actionResult) {
        const payload = isObject(actionResult) ? Object.assign({}, actionResult) : {};
        const meta = dedupeMeta(payload.meta);
        const tier = inferTier(payload, meta);
        const reactionText = compactText(payload.petReactionText) || buildPetReactionText(payload);
        const mainText = compactText(payload.mainResultText) || buildMainResultText(payload);
        return {
            petReaction: {
                text: reactionText,
                emote: compactText(payload.reactionEmote) || ACTION_REACTION_EMOTE[payload.action] || '💛',
                intensity: tier === 'Milestone' ? 'high' : tier === 'Notable' ? 'medium' : 'low'
            },
            mainResult: {
                text: mainText,
                statChanges: summarizeStatChanges(payload.statDeltas)
            },
            meta,
            tier,
            uiMode: tierUiMode(tier),
            effects: tierEffects(tier, payload.action)
        };
    }

    function announceLineForPlan(plan) {
        if (!plan) return '';
        const parts = [];
        if (plan.petReaction && plan.petReaction.text) parts.push(plan.petReaction.text);
        if (plan.mainResult && plan.mainResult.text) parts.push(plan.mainResult.text);
        if (Array.isArray(plan.meta) && plan.meta.length > 0) {
            parts.push(plan.meta.slice(0, 2).map((m) => m.text).join(' '));
        }
        return compactText(parts.join(' '));
    }

    function pushSceneMoodCue(cue) {
        if (!cue) return false;
        const text = compactText(typeof cue === 'string' ? cue : cue.text);
        if (!text) return false;
        _sceneMoodCue = {
            id: `mood-${nowMs()}`,
            text,
            kind: compactText(cue.kind || cue.type || 'ambient') || 'ambient',
            roomId: compactText(cue.roomId || ''),
            createdAt: nowMs(),
            expiresAt: nowMs() + Math.max(5000, Number(cue.ttlMs) || 14000)
        };
        return true;
    }

    function getSceneMoodCue() {
        if (!_sceneMoodCue) return null;
        if (_sceneMoodCue.expiresAt && _sceneMoodCue.expiresAt < nowMs()) {
            _sceneMoodCue = null;
            return null;
        }
        return Object.assign({}, _sceneMoodCue);
    }

    function classifyLegacyToast(toast) {
        const plain = compactText(toast && toast.message);
        if (!plain) return null;
        const text = stripLeadingEmoji(plain);
        if (!text) return null;
        if (/Action undone/i.test(text)) return null;
        if (/^(Fed|Washed|Played with|Put to sleep|Groomed|Exercised|Treated|Cuddled)\b/i.test(text)) return null;
        if (/Daily task done:/i.test(text)) return { text: text.replace(/^Daily task done:\s*/i, 'Daily task progress +1.'), type: 'daily' };
        if (/Achievement/i.test(text)) return { text, type: 'achievement' };
        if (/Badge:/i.test(text)) return { text, type: 'badge' };
        if (/Sticker:/i.test(text)) return { text, type: 'sticker' };
        if (/Trophy:/i.test(text)) return { text, type: 'trophy' };
        if (/Title upgraded:/i.test(text)) return { text: text.replace(/^Title upgraded:/i, 'Caretaker title:'), type: 'title' };
        if (/Care Rush!/i.test(text)) return { text: 'A gentle rhythm bonus kicked in.', type: 'bonus' };
        if (/Focus bonus|Repeat penalty|No focus bonus/i.test(text)) return { text, type: 'coach' };
        if (/joined your family|warning|critical|error|failed/i.test(text)) return null;
        return { text, type: 'meta' };
    }

    function currentMoment() {
        return _activeCareMoment;
    }

    function scheduleMomentRender() {
        const session = _activeCareMoment;
        if (!session) return;
        if (session.renderTimer) clearTimeout(session.renderTimer);
        session.renderTimer = setTimeout(() => {
            if (!_activeCareMoment || _activeCareMoment.id !== session.id) return;
            renderCurrentMoment();
        }, MOMENT_UPDATE_DEBOUNCE_MS);
    }

    function renderCurrentMoment(forceFinal) {
        const session = _activeCareMoment;
        if (!session) return null;
        const quietBeatMs = reducedMotion() ? 80 : DEFAULT_QUIET_BEAT_MS;
        if (!forceFinal && !session.initialShown && (nowMs() - session.startedAt) < quietBeatMs) {
            scheduleMomentRender();
            return null;
        }
        const payload = Object.assign({}, session.payload, { meta: dedupeMeta(session.meta) });
        if (_debugConfig.simulateMetaBurst) {
            payload.meta = dedupeMeta((payload.meta || []).concat([
                { text: 'Daily task progress +1.', type: 'daily' },
                { text: 'A new badge brightened the room.', type: 'badge' },
                { text: 'Journey chapter progress moved forward.', type: 'journey' }
            ]));
        }
        const plan = buildPresentationPlan(payload);
        const shouldAnnounceMoment = !session.initialShown;
        try {
            if (typeof root.showMomentSummary === 'function') {
                root.showMomentSummary(plan, {
                    key: session.id,
                    replace: session.initialShown,
                    announce: shouldAnnounceMoment,
                    announceText: announceLineForPlan(plan)
                });
            } else if (typeof root.showToast === 'function') {
                root.showToast(announceLineForPlan(plan) || 'Care moment', '#90A4AE', {
                    announce: shouldAnnounceMoment,
                    bypassMomentCapture: true
                });
            }
        } catch (_) {}
        if (!session.effectsApplied) {
            session.effectsApplied = true;
            playTierEffects(plan);
        }
        session.initialShown = true;
        if ((plan.tier === 'Notable' || plan.tier === 'Milestone') && Array.isArray(plan.meta) && plan.meta.length > 0) {
            maybeReflectCaretakerIdentity(session, plan);
        }
        if (plan.tier !== 'Routine') {
            const sceneLine = session.payload && session.payload.sceneMoodText ? session.payload.sceneMoodText : '';
            if (sceneLine) pushSceneMoodCue({ text: sceneLine, kind: 'event', roomId: session.payload.roomId, ttlMs: 18000 });
        }
        return plan;
    }

    function maybeReflectCaretakerIdentity(session, plan) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const existing = safeSessionGet(SESSION_REFLECTION_KEY);
                if (existing === 'true') return;
            }
        } catch (_) {}
        const payload = session && session.payload ? session.payload : {};
        const petName = compactText(payload.petName) || 'Your pet';
        const action = compactText(payload.action) || 'care';
        let line = '';
        if (root.MLFRetentionPersonalization && typeof root.MLFRetentionPersonalization.getIdentityReflection === 'function') {
            line = compactText(root.MLFRetentionPersonalization.getIdentityReflection({
                petName,
                recentAction: action,
                tier: plan && plan.tier,
                roomId: payload.roomId
            }));
        } else {
            line = `${petName} knows you for steady care and a warm home.`;
        }
        if (!line) return;
        _activeCareMoment.meta.push({ text: line, type: 'identity' });
        safeSessionSet(SESSION_REFLECTION_KEY, 'true'); // P3-38: use safe helper
    }

    function playTierEffects(plan) {
        if (!plan) return;
        const petArea = (typeof document !== 'undefined') ? document.querySelector('.pet-area') : null;
        if (petArea) {
            petArea.classList.add('pet-focus-mode');
            setTimeout(() => petArea.classList.remove('pet-focus-mode'), reducedMotion() ? 300 : 900);
            if (plan.effects && plan.effects.animationPreset) {
                const token = String(plan.effects.animationPreset).includes('ceremony') ? 'fx-confetti-lite' : 'fx-sparkle';
                petArea.classList.add(token);
                setTimeout(() => petArea.classList.remove(token), reducedMotion() ? 500 : 1400);
            }
        }
        if (root.MLFRetentionRewardEffects && typeof root.MLFRetentionRewardEffects.playRewardMoment === 'function') {
            const effectId = plan.tier === 'Milestone' ? 'careMilestone' : plan.tier === 'Notable' ? 'careNotable' : 'careRoutine';
            try {
                root.MLFRetentionRewardEffects.playRewardMoment(effectId);
                return;
            } catch (_) {}
        }
        if (typeof root.hapticPattern === 'function') {
            try { root.hapticPattern(plan.tier === 'Milestone' ? 'achievement' : 'confirm'); } catch (_) {}
        }
    }

    function startCareMoment(payload) {
        endCareMoment({ flush: true });
        _momentSeq = (_momentSeq + 1) & 0xFFFFFF; // P3-37: wrap at 16M to prevent unbounded growth
        const id = `care-moment-${_momentSeq}`;
        _activeCareMoment = {
            id,
            startedAt: nowMs(),
            payload: isObject(payload) ? Object.assign({}, payload) : {},
            meta: dedupeMeta(payload && payload.meta),
            renderTimer: null,
            endTimer: null,
            initialShown: false,
            effectsApplied: false
        };
        scheduleMomentRender();
        _activeCareMoment.endTimer = setTimeout(() => endCareMoment({ flush: true }), LEGACY_CAPTURE_WINDOW_MS);
        return id;
    }

    function pushCareMeta(entry) {
        const session = _activeCareMoment;
        if (!session) return false;
        const normalized = normalizeMetaEntry(entry);
        if (!normalized) return false;
        session.meta.push(normalized);
        scheduleMomentRender();
        return true;
    }

    function updateCarePayload(partial) {
        const session = _activeCareMoment;
        if (!session || !isObject(partial)) return false;
        Object.assign(session.payload, partial);
        scheduleMomentRender();
        return true;
    }

    function captureLegacyToast(toastMeta) {
        const session = _activeCareMoment;
        if (!session) return false;
        const options = toastMeta && toastMeta.options ? toastMeta.options : {};
        if (options && options.bypassMomentCapture) return false;
        const priority = options && options.priority ? String(options.priority) : '';
        if (priority === 'critical') return false;
        const classified = classifyLegacyToast(toastMeta);
        if (!classified) return false;
        session.meta.push(classified);
        scheduleMomentRender();
        return true;
    }

    function endCareMoment(options) {
        const session = _activeCareMoment;
        if (!session) return null;
        const opts = isObject(options) ? options : {};
        if (session.renderTimer) {
            clearTimeout(session.renderTimer);
            session.renderTimer = null;
        }
        if (session.endTimer) {
            clearTimeout(session.endTimer);
            session.endTimer = null;
        }
        const plan = opts.flush ? renderCurrentMoment(true) : null;
        _activeCareMoment = null;
        return plan;
    }

    function getDebugConfig() {
        return Object.assign({}, _debugConfig);
    }

    function setDebugConfig(next) {
        if (isObject(next)) _debugConfig = Object.assign({}, _debugConfig, next);
        return getDebugConfig();
    }

    function triggerDebugDemo() {
        const petName = (root.gameState && root.gameState.pet && root.gameState.pet.name) || 'Waddles';
        const action = 'feed';
        startCareMoment({
            action,
            petName,
            roomId: (root.gameState && root.gameState.currentRoom) || 'kitchen',
            affinity: 'love',
            firstTimeAction: false,
            statDeltas: { hunger: 16, happiness: 4 },
            reactionEmote: '😋',
            sceneMoodText: `${petName}'s home feels warmer after that little moment.`
        });
        pushCareMeta({ text: 'Daily task progress +1.', type: 'daily' });
        pushCareMeta({ text: 'A new badge brightened the room.', type: 'badge' });
        scheduleMomentRender();
    }

    const api = Object.freeze({
        buildPresentationPlan,
        announceLineForPlan,
        startCareMoment,
        updateCarePayload,
        pushCareMeta,
        captureLegacyToast,
        endCareMoment,
        pushSceneMoodCue,
        getSceneMoodCue,
        getDebugConfig,
        setDebugConfig,
        triggerDebugDemo
    });

    if (root && typeof root === 'object') {
        root.MLFEmotionalFeedback = api;
    }

    return api;
});
