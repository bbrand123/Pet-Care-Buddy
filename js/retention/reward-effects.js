(function initMLFRetentionRewardEffects(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(root);
        return;
    }
    root.MLFRetentionRewardEffects = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionRewardEffects(root) {
    'use strict';

    const EFFECT_PRESETS = Object.freeze({
        rewardClaim: {
            haptics: [
                { at: 0, eventId: 'rewardClaim', nativeType: 'reward', strength: 'medium' },
                { at: 120, nativeType: 'confirm', strength: 'light' }
            ],
            animations: [
                { selector: '.journey-token-store', scale: [1, 1.02, 1], duration: 180 },
                { selector: '.journey-modal', scale: [1, 1.01, 1], duration: 220 }
            ]
        },
        comebackComplete: {
            haptics: [
                { at: 0, eventId: 'rewardClaim', nativeType: 'reward', strength: 'medium' },
                { at: 110, nativeType: 'reward', strength: 'light' }
            ],
            animations: [
                { selector: '.journey-status-panel', scale: [1, 1.02, 1], duration: 160 },
                { selector: '.retention-emotional-prompt', scale: [1, 1.03, 1], duration: 180 }
            ]
        },
        objectiveComplete: {
            haptics: [{ at: 0, nativeType: 'success', strength: 'light' }],
            animations: [{ selector: '.journey-status-panel', scale: [1, 1.015, 1], duration: 140 }]
        },
        careRoutine: {
            haptics: [{ at: 0, nativeType: 'confirm', strength: 'light' }],
            animations: [{ selector: '.pet-area > .pet-container', scale: [1, 1.01, 1], duration: 120 }]
        },
        careNotable: {
            haptics: [
                { at: 0, nativeType: 'success', strength: 'light' },
                { at: 90, nativeType: 'confirm', strength: 'light' }
            ],
            animations: [
                { selector: '.pet-area > .pet-container', scale: [1, 1.03, 1], duration: 180 },
                { selector: '.moment-summary-card', scale: [1, 1.02, 1], duration: 180 }
            ]
        },
        careMilestone: {
            haptics: [
                { at: 0, nativeType: 'reward', strength: 'medium' },
                { at: 120, nativeType: 'success', strength: 'light' }
            ],
            animations: [
                { selector: '.pet-area', scale: [1, 1.01, 1], duration: 220 },
                { selector: '.pet-area > .pet-container', scale: [1, 1.04, 1], duration: 240 },
                { selector: '.moment-summary-card', scale: [1, 1.03, 1], duration: 220 }
            ]
        },
        chapterComplete: {
            haptics: [
                { at: 0, nativeType: 'success', strength: 'medium' },
                { at: 140, nativeType: 'confirm', strength: 'light' }
            ],
            animations: [
                { selector: '.journey-status-panel', scale: [1, 1.025, 1], duration: 180 },
                { selector: '.journey-track-bar span', scaleX: [1, 1.04, 1], duration: 220 }
            ]
        }
    });

    function isFeatureEnabled() {
        if (typeof root.isRetentionFeatureFlagEnabled === 'function') {
            try { return !!root.isRetentionFeatureFlagEnabled('rewardMomentEffectsEnabled'); } catch (_) {}
        }
        return true;
    }

    function reducedMotion() {
        try {
            if (typeof root.isReducedMotionEnabled === 'function') return !!root.isReducedMotionEnabled();
            if (typeof window !== 'undefined' && window.matchMedia) return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {}
        return false;
    }

    function postNativeHaptic(type, strength) {
        try {
            if (typeof root.triggerUiHaptic === 'function' && (type === 'reward' || type === 'success' || type === 'confirm')) {
                if (type === 'reward' || type === 'success') return !!root.triggerUiHaptic('rewardClaim', { type, strength: strength || 'medium', throttleMs: 0 });
                return !!root.triggerUiHaptic('confirmPrimary', { type, strength: strength || 'light', throttleMs: 0 });
            }
        } catch (_) {}
        try {
            const bridge = root && root.webkit && root.webkit.messageHandlers && root.webkit.messageHandlers.haptics;
            if (bridge && typeof bridge.postMessage === 'function') {
                bridge.postMessage({ type: type || 'confirm', strength: strength || 'light' });
                return true;
            }
        } catch (_) {}
        return false;
    }

    function triggerHapticStep(step) {
        if (!step) return;
        if (step.eventId && typeof root.triggerUiHaptic === 'function') {
            try {
                root.triggerUiHaptic(step.eventId, { throttleMs: 0, type: step.nativeType || undefined, strength: step.strength || undefined });
                return;
            } catch (_) {}
        }
        postNativeHaptic(step.nativeType || 'confirm', step.strength || 'light');
    }

    function animateSelectorStep(step) {
        if (reducedMotion()) return;
        if (typeof document === 'undefined' || !step || !step.selector) return;
        const nodes = Array.from(document.querySelectorAll(step.selector)).slice(0, 2);
        nodes.forEach((el) => {
            if (!el || typeof el.animate !== 'function') return;
            try {
                const duration = Math.max(80, Math.min(260, Number(step.duration) || 160));
                if (Array.isArray(step.scaleX)) {
                    el.animate(
                        [
                            { transform: `scaleX(${step.scaleX[0] || 1})`, opacity: 1 },
                            { transform: `scaleX(${step.scaleX[1] || 1.03})`, opacity: 1 },
                            { transform: `scaleX(${step.scaleX[2] || 1})`, opacity: 1 }
                        ],
                        { duration, easing: 'ease-out', fill: 'none' }
                    );
                } else {
                    const scale = Array.isArray(step.scale) ? step.scale : [1, 1.02, 1];
                    el.animate(
                        [
                            { transform: `scale(${scale[0] || 1})` },
                            { transform: `scale(${scale[1] || 1.02})` },
                            { transform: `scale(${scale[2] || 1})` }
                        ],
                        { duration, easing: 'ease-out', fill: 'none' }
                    );
                }
            } catch (_) {}
        });
    }

    function playSequence(effectId, options) {
        if (!isFeatureEnabled()) return false;
        const preset = EFFECT_PRESETS[effectId];
        if (!preset) return false;
        const opts = (options && typeof options === 'object') ? options : {};
        const haptics = Array.isArray(preset.haptics) ? preset.haptics : [];
        const animations = Array.isArray(preset.animations) ? preset.animations : [];
        const timers = [];
        haptics.forEach((step) => {
            const at = Math.max(0, Number(step.at) || 0);
            timers.push(setTimeout(() => triggerHapticStep(step), at));
        });
        animations.forEach((step) => {
            const at = Math.max(0, Number(step.at) || 0);
            timers.push(setTimeout(() => animateSelectorStep(step), at));
        });
        if (opts.toast && typeof root.showToast === 'function') {
            try { root.showToast(String(opts.toast), opts.toastColor || '#81C784'); } catch (_) {}
        }
        return function cancel() { timers.forEach((id) => clearTimeout(id)); timers.length = 0; };
    }

    const api = Object.freeze({
        playSequence,
        playRewardMoment(effectId, options) {
            const result = playSequence(effectId, options);
            // Return true/false; cancel function is an internal implementation detail
            return typeof result === 'function' ? true : !!result;
        },
        getPresets() { return EFFECT_PRESETS; }
    });

    if (root && typeof root === 'object') {
        root.MLFRetentionRewardEffects = api;
        if (typeof root.playRetentionRewardMoment !== 'function') root.playRetentionRewardMoment = api.playRewardMoment;
    }

    return api;
});
