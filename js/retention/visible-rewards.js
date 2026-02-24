(function initMLFRetentionVisibleRewards(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFRetentionVisibleRewards = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionVisibleRewards(root) {
    'use strict';

    const CATALOG = Object.freeze({
        roomProp: Object.freeze([
            { id: 'prop_lantern_blossom', title: 'Blossom Lantern', icon: '🏮' },
            { id: 'prop_cloud_mobile', title: 'Cloud Mobile', icon: '☁️' },
            { id: 'prop_tiny_fountain', title: 'Tiny Fountain', icon: '⛲' },
            { id: 'prop_music_box', title: 'Music Box', icon: '🎼' }
        ]),
        ambient: Object.freeze([
            { id: 'ambient_fireflies', title: 'Fireflies', icon: '✨' },
            { id: 'ambient_sunbeams', title: 'Sunbeams', icon: '🌤️' },
            { id: 'ambient_snowglow', title: 'Snowglow', icon: '❄️' }
        ]),
        emote: Object.freeze([
            { id: 'emote_pack_cozy', title: 'Cozy Emotes', icon: '🫶' },
            { id: 'emote_pack_spark', title: 'Spark Emotes', icon: '⚡' },
            { id: 'emote_pack_playful', title: 'Playful Emotes', icon: '🎉' }
        ]),
        photoFrame: Object.freeze([
            { id: 'frame_blossom', title: 'Blossom Frame', icon: '🌸' },
            { id: 'frame_starlight', title: 'Starlight Frame', icon: '🌌' },
            { id: 'frame_polaroid', title: 'Polaroid Frame', icon: '🖼️' }
        ]),
        idleAnimation: Object.freeze([
            { id: 'idle_spin', title: 'Happy Spin Idle', icon: '🌀' },
            { id: 'idle_peek', title: 'Peek Idle', icon: '👀' },
            { id: 'idle_stretch', title: 'Stretch Idle', icon: '🤸' }
        ])
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

    function ensureState() {
        const gs = getState();
        if (!gs) return null;
        if (!isObject(gs.meta)) gs.meta = {};
        if (!isObject(gs.meta.retentionUnlocks)) {
            gs.meta.retentionUnlocks = {
                roomProps: [],
                ambientVariants: [],
                emotePacks: [],
                photoFrames: [],
                idleAnimations: [],
                recentVisibleRewards: []
            };
        }
        const u = gs.meta.retentionUnlocks;
        if (!Array.isArray(u.roomProps)) u.roomProps = [];
        if (!Array.isArray(u.ambientVariants)) u.ambientVariants = [];
        if (!Array.isArray(u.emotePacks)) u.emotePacks = [];
        if (!Array.isArray(u.photoFrames)) u.photoFrames = [];
        if (!Array.isArray(u.idleAnimations)) u.idleAnimations = [];
        if (!Array.isArray(u.recentVisibleRewards)) u.recentVisibleRewards = [];
        return u;
    }

    function kindMap(kind) {
        const k = String(kind || '');
        if (k === 'roomProp') return { key: 'roomProps', catalogKey: 'roomProp', label: 'Room Props' };
        if (k === 'ambient') return { key: 'ambientVariants', catalogKey: 'ambient', label: 'Ambient Variants' };
        if (k === 'emote') return { key: 'emotePacks', catalogKey: 'emote', label: 'Emote Packs' };
        if (k === 'photoFrame') return { key: 'photoFrames', catalogKey: 'photoFrame', label: 'Photo Frames' };
        if (k === 'idleAnimation') return { key: 'idleAnimations', catalogKey: 'idleAnimation', label: 'Idle Animations' };
        return null;
    }

    function hashString(input) {
        const s = String(input || '');
        let h = 0;
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        return Math.abs(h);
    }

    function pickUnlock(kind, preferredId) {
        const map = kindMap(kind);
        if (!map) return null;
        const catalog = CATALOG[map.catalogKey] || [];
        if (!catalog.length) return null;
        if (preferredId) {
            const exact = catalog.find((item) => item.id === preferredId);
            if (exact) return exact;
        }
        const state = ensureState();
        const owned = new Set((state && state[map.key]) || []);
        const unowned = catalog.filter((item) => !owned.has(item.id));
        const pool = unowned.length ? unowned : catalog;
        const seed = `${kind}:${Date.now()}:${(state && state[map.key] && state[map.key].length) || 0}`;
        return pool[hashString(seed) % pool.length] || pool[0] || null;
    }

    function grantVisibleReward(kind, preferredId) {
        const state = ensureState();
        const map = kindMap(kind);
        if (!state || !map) return { ok: false, reason: 'unsupported-kind' };
        const pick = pickUnlock(kind, preferredId);
        if (!pick) return { ok: false, reason: 'no-catalog' };
        const list = state[map.key];
        const duplicate = list.includes(pick.id);
        if (!duplicate) list.push(pick.id);
        state.recentVisibleRewards.push({
            kind,
            id: pick.id,
            title: pick.title,
            icon: pick.icon,
            at: Date.now()
        });
        if (state.recentVisibleRewards.length > 12) state.recentVisibleRewards = state.recentVisibleRewards.slice(-12);
        return {
            ok: true,
            duplicate,
            reward: Object.assign({ kind }, pick)
        };
    }

    function getVisibleRewardsSummary() {
        const state = ensureState();
        if (!state) return null;
        const rows = [
            { kind: 'roomProp', label: 'Props', count: state.roomProps.length, icon: '🛋️' },
            { kind: 'ambient', label: 'Ambient', count: state.ambientVariants.length, icon: '🌤️' },
            { kind: 'emote', label: 'Emotes', count: state.emotePacks.length, icon: '😄' },
            { kind: 'photoFrame', label: 'Frames', count: state.photoFrames.length, icon: '🖼️' },
            { kind: 'idleAnimation', label: 'Idle', count: state.idleAnimations.length, icon: '💫' }
        ];
        return {
            total: rows.reduce((sum, row) => sum + row.count, 0),
            rows,
            recent: state.recentVisibleRewards.slice(-4).reverse()
        };
    }

    function getCatalogByKind(kind) {
        const map = kindMap(kind);
        if (!map) return [];
        return (CATALOG[map.catalogKey] || []).slice();
    }

    const api = Object.freeze({
        CATALOG,
        ensureState,
        grantVisibleReward,
        getVisibleRewardsSummary,
        getCatalogByKind
    });

    if (root && typeof root === 'object') {
        root.MLFRetentionVisibleRewards = api;
        if (typeof root.getRetentionVisibleRewardsSummary !== 'function') root.getRetentionVisibleRewardsSummary = api.getVisibleRewardsSummary;
    }

    return api;
});
