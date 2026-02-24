// Example integration script (manual/dev harness) for iOS retention P0 validation.
// This is not part of `npm test`; it documents a repeatable validation flow.
//
// Usage idea:
// 1) Open the iOS app with a debug build.
// 2) Use Safari Web Inspector on the WKWebView.
// 3) Paste/adapt these snippets in the console to simulate retention flows.

/* global gameState, saveGame, renderPetPhase, MLFNativeNotifications, Journey */

function simulateSevenDayAbsence() {
  if (!gameState) throw new Error('gameState unavailable');
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  gameState.lastUpdate = sevenDaysAgo;
  if (gameState.streak) {
    const d = new Date(sevenDaysAgo);
    gameState.streak.lastPlayDate = d.toISOString().slice(0, 10);
    gameState.streak.todayBonusClaimed = false;
  }
  saveGame?.({ source: 'integration-example', silentIndicator: true });
  console.log('Simulated 7-day absence. Relaunch app to validate comeback handling + offline catch-up.');
}

async function scheduleJourneyReminderDeepLink() {
  if (!MLFNativeNotifications) throw new Error('MLFNativeNotifications bridge unavailable');
  const permission = await MLFNativeNotifications.requestPermission();
  console.log('Permission:', permission);
  const result = await MLFNativeNotifications.scheduleReminder({
    id: 'integration.journey',
    title: 'Journey check-in',
    body: 'Your next Journey reward is ready.',
    route: 'journey',
    reminderType: 'integration',
    delaySeconds: 5
  });
  console.log('Scheduled:', result);
}

function openJourneyAndClaimStreak() {
  const current = Journey?.getCurrentChapter?.();
  console.log('Current Journey chapter:', current);
  const claimResult = Journey?.claimStreak?.(gameState?.economy?.playerId);
  console.log('Streak claim result:', claimResult);
  renderPetPhase?.();
}

module.exports = {
  simulateSevenDayAbsence,
  scheduleJourneyReminderDeepLink,
  openJourneyAndClaimStreak
};
