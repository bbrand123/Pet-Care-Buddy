(function initMLFRetentionStrings(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFRetentionStrings = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRetentionStrings() {
    'use strict';

    return Object.freeze({
        hud: Object.freeze({
            journeyTitle: '30-Day Journey',
            journeyOpen: 'Open',
            nextObjectiveLabel: 'Current objective',
            nextRewardLabel: 'Next reward',
            chapterComplete: 'Chapter complete! Open Journey to review rewards.',
            beginnerMoreSummary: 'More panels',
            beginnerMoreHint: 'Goal ladder, tips, and debug tools',
            backlogDripLabel: 'Comeback drip',
            emotionalPromptTitle: 'With your pet',
            comebackQuestLabel: 'Comeback quest',
            seasonalJourneyLabel: 'Seasonal loop',
            playerStyleLabel: 'Caretaker title',
            visibleRewardsLabel: 'Visible rewards'
        }),
        streak: Object.freeze({
            quickClaimCta: 'Claim',
            quickClaimDone: 'Claimed',
            quickClaimSuccess: 'Streak bonus claimed.',
            quickClaimUnavailable: 'Streak bonus already claimed for today.',
            quickClaimError: 'Streak claim is not available right now.'
        }),
        reminders: Object.freeze({
            enabledToast: 'Reminders enabled.',
            laterToast: 'Using in-game reminders only for now.',
            openLabel: 'Open',
            dismissLabel: 'Dismiss'
        }),
        emotional: Object.freeze({
            defaultCta: 'Open Journey',
            comebackCta: 'Resume comeback quest'
        }),
        telemetry: Object.freeze({
            debugTitle: 'Retention Debug',
            funnelTitle: 'Retention funnels'
        }),
        personalization: Object.freeze({
            styleTitle: 'Caretaker title'
        })
    });
});
