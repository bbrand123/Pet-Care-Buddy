(function initMLFOfflineProgressionConfig(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFOfflineProgressionConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFOfflineProgressionConfig() {
    'use strict';

    const MINUTE_MS = 60 * 1000;
    const HOUR_MS = 60 * MINUTE_MS;

    return Object.freeze({
        GARDEN_TICK_MS: MINUTE_MS,
        LEGACY_NEEDS_DECAY_MINUTES_PER_STEP: 2,
        LEGACY_NEEDS_DECAY_MAX_POINTS: 80,
        OFFLINE_SUMMARY_MINUTES_THRESHOLD: 5,
        HOUSEHOLD_FIXED_STEP_MS: MINUTE_MS,
        HOUSEHOLD_MAX_CATCHUP_MS: 72 * HOUR_MS
    });
});
