(function initMLFRetentionPersonalization(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFRetentionPersonalization = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionPersonalization(root) {
    'use strict';

    const STYLE_KEYS = Object.freeze(['care-focused', 'collector', 'explorer', 'breeder']);
    const ACTION_WEIGHTS = Object.freeze({
        care: { 'care-focused': 3, collector: 0.5, explorer: 0.2, breeder: 0.4 },
        feed: { 'care-focused': 2.5, collector: 0.4, explorer: 0.2, breeder: 0.5 },
        wash: { 'care-focused': 2, collector: 0.2, explorer: 0.1, breeder: 0.2 },
        play: { 'care-focused': 1.6, collector: 0.3, explorer: 0.6, breeder: 0.4 },
        sleep: { 'care-focused': 1.2, collector: 0.1, explorer: 0.1, breeder: 0.2 },
        explore: { 'care-focused': 0.4, collector: 0.8, explorer: 3, breeder: 0.4 },
        expedition: { 'care-focused': 0.4, collector: 0.8, explorer: 3, breeder: 0.4 },
        garden: { 'care-focused': 1.1, collector: 0.9, explorer: 0.3, breeder: 0.8 },
        harvest: { 'care-focused': 0.9, collector: 1.2, explorer: 0.2, breeder: 0.7 },
        daily: { 'care-focused': 1.1, collector: 0.7, explorer: 0.5, breeder: 0.6 },
        journey: { 'care-focused': 0.8, collector: 1.1, explorer: 0.8, breeder: 0.5 },
        social: { 'care-focused': 1.2, collector: 0.3, explorer: 0.4, breeder: 1.5 },
        breeding: { 'care-focused': 0.5, collector: 0.8, explorer: 0.3, breeder: 3 },
        collection: { 'care-focused': 0.3, collector: 3, explorer: 0.7, breeder: 0.8 },
        reminder: { 'care-focused': 0.4, collector: 0.4, explorer: 0.4, breeder: 0.4 },
        comeback: { 'care-focused': 0.5, collector: 0.5, explorer: 0.5, breeder: 0.5 }
    });
    const STYLE_PRESENTATION = Object.freeze({
        'care-focused': {
            title: 'Steady Hearthkeeper',
            shortLabel: 'Hearthkeeper',
            emoji: '🕯️',
            description: 'Known for warm routines and gentle consistency.'
        },
        collector: {
            title: 'Keepsake Curator',
            shortLabel: 'Curator',
            emoji: '🧺',
            description: 'Known for turning little finds into a home full of stories.'
        },
        explorer: {
            title: 'Wonder Guide',
            shortLabel: 'Guide',
            emoji: '🧭',
            description: 'Known for leading pets toward new places and curious moments.'
        },
        breeder: {
            title: 'Household Gardener',
            shortLabel: 'Gardener',
            emoji: '🌿',
            description: 'Known for patient care and long-term family growth.'
        }
    });

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

    function isFeatureEnabled() {
        if (typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled('personalizationEnabled'); } catch (_) {}
        }
        return true;
    }

    function ensureProfile(state) {
        const gs = state || getState();
        if (!gs) return null;
        if (!isObject(gs.playerProfile)) gs.playerProfile = {};
        if (!isObject(gs.playerProfile.styleSignals)) {
            gs.playerProfile.styleSignals = {
                'care-focused': 0,
                collector: 0,
                explorer: 0,
                breeder: 0
            };
        }
        STYLE_KEYS.forEach((key) => {
            if (!Number.isFinite(Number(gs.playerProfile.styleSignals[key]))) gs.playerProfile.styleSignals[key] = 0;
        });
        if (typeof gs.playerProfile.style !== 'string' || !gs.playerProfile.style) gs.playerProfile.style = 'care-focused';
        if (!isObject(gs.playerProfile.styleMeta)) gs.playerProfile.styleMeta = { confidence: 0, updatedAt: 0, topSignals: [] };
        return gs.playerProfile;
    }

    function classify(profile) {
        const p = profile || ensureProfile();
        if (!p || !isObject(p.styleSignals)) return { style: 'care-focused', confidence: 0 };
        const rows = STYLE_KEYS.map((key) => ({ key, score: Number(p.styleSignals[key]) || 0 }))
            .sort((a, b) => b.score - a.score);
        const top = rows[0] || { key: 'care-focused', score: 0 };
        const second = rows[1] || { key: 'collector', score: 0 };
        const confidence = top.score > 0 ? Math.max(0, Math.min(1, (top.score - second.score) / Math.max(1, top.score))) : 0;
        p.style = top.key;
        p.styleMeta = {
            confidence: Number(confidence.toFixed(2)),
            updatedAt: Date.now(),
            topSignals: rows.slice(0, 3)
        };
        return { style: p.style, confidence: p.styleMeta.confidence, topSignals: rows.slice(0, 3) };
    }

    function recordAction(actionKey, amount) {
        if (!isFeatureEnabled()) return null;
        const profile = ensureProfile();
        if (!profile) return null;
        const normalized = String(actionKey || '').trim().toLowerCase();
        const weights = ACTION_WEIGHTS[normalized] || ACTION_WEIGHTS.journey;
        const delta = Math.max(1, Math.floor(Number(amount) || 1));
        STYLE_KEYS.forEach((style) => {
            profile.styleSignals[style] = (Number(profile.styleSignals[style]) || 0) + ((Number(weights[style]) || 0) * delta);
        });
        return classify(profile);
    }

    function getProfile() {
        if (!isFeatureEnabled()) return null;
        const profile = ensureProfile();
        if (!profile) return null;
        classify(profile);
        return {
            style: profile.style || 'care-focused',
            confidence: Number((profile.styleMeta && profile.styleMeta.confidence) || 0),
            styleSignals: Object.assign({}, profile.styleSignals || {}),
            topSignals: Array.isArray(profile.styleMeta && profile.styleMeta.topSignals) ? profile.styleMeta.topSignals.slice() : []
        };
    }

    function tailorPrompt(prompt) {
        const base = isObject(prompt) ? Object.assign({}, prompt) : null;
        if (!base) return null;
        const profile = getProfile();
        if (!profile || !profile.style) return base;
        const style = profile.style;
        base.playerStyle = style;
        if (style === 'collector') {
            base.body = 'Your pet notices how you fill the home with little treasures. A quick rewards check or collection moment will feel meaningful.';
            if (!base.ctaLabel || base.actionType === 'journey') base.ctaLabel = 'See keepsakes';
        } else if (style === 'explorer') {
            if (base.actionType === 'journey') base.actionType = 'explore';
            base.body = 'Your pet knows you for finding new corners of the world together. One short explore trip would fit today\'s mood.';
            if (!base.ctaLabel || base.ctaLabel === 'Open Journey') base.ctaLabel = 'Explore';
        } else if (style === 'breeder') {
            base.body = 'You tend the whole household with patience. A social check-in can help the home feel connected again.';
            if (base.actionType === 'journey') base.actionType = 'social';
        } else if (style === 'care-focused') {
            base.body = 'Your pet relaxes fastest when you start with a gentle care routine. One loving loop is enough to brighten the room.';
            if (base.actionType === 'journey') base.actionType = 'streak';
        }
        return base;
    }

    function getIdentityTitle(styleKey) {
        const key = (typeof styleKey === 'string' && styleKey) ? styleKey : ((getProfile() || {}).style || 'care-focused');
        const row = STYLE_PRESENTATION[key] || STYLE_PRESENTATION['care-focused'];
        return Object.assign({ key }, row);
    }

    function getIdentityLabel(options) {
        const opts = isObject(options) ? options : {};
        const profile = getProfile() || { style: 'care-focused', confidence: 0 };
        const title = getIdentityTitle(opts.style || profile.style);
        const petName = (typeof opts.petName === 'string' && opts.petName.trim()) ? opts.petName.trim() : 'Your pet';
        const roomName = (typeof opts.roomName === 'string' && opts.roomName.trim()) ? opts.roomName.trim() : '';
        const recentAction = (typeof opts.recentAction === 'string' && opts.recentAction.trim()) ? opts.recentAction.trim() : '';
        const actionLine = recentAction ? ` after all that ${recentAction}` : '';
        const homeLine = roomName ? ` in the ${roomName}` : '';
        return {
            key: title.key,
            emoji: title.emoji,
            title: title.title,
            shortLabel: title.shortLabel,
            confidence: Number(profile.confidence) || 0,
            description: title.description,
            headline: `${petName} knows you as the ${title.title}.`,
            reflection: `${petName} knows you for ${title.shortLabel.toLowerCase()} energy${homeLine}${actionLine}.`
        };
    }

    function getIdentityReflection(options) {
        const identity = getIdentityLabel(options);
        return `${identity.emoji} ${identity.headline}`;
    }

    const api = Object.freeze({
        STYLE_KEYS,
        ensureProfile,
        recordAction,
        classify,
        getProfile,
        tailorPrompt,
        getIdentityTitle,
        getIdentityLabel,
        getIdentityReflection
    });

    if (root && typeof root === 'object') {
        root.MLFRetentionPersonalization = api;
        if (typeof root.recordRetentionStyleAction !== 'function') root.recordRetentionStyleAction = api.recordAction;
        if (typeof root.getRetentionPlayerProfile !== 'function') root.getRetentionPlayerProfile = api.getProfile;
    }

    return api;
});
