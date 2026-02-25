// ==================== EVENT BUS ====================
// Simple pub-sub system for decoupling game logic from UI.
// Eliminates direct cross-file function calls and typeof guards.

/**
 * Event name constants. Using a frozen object ensures consistent naming.
 * @type {Readonly<Object>}
 */
const EVENTS = Object.freeze({
    // Care actions
    PET_FED: 'pet:fed',
    PET_WASHED: 'pet:washed',
    PET_PLAYED: 'pet:played',
    PET_SLEPT: 'pet:slept',
    PET_MEDICATED: 'pet:medicated',
    PET_GROOMED: 'pet:groomed',
    PET_EXERCISED: 'pet:exercised',
    PET_TREATED: 'pet:treated',
    PET_CUDDLED: 'pet:cuddled',

    // Pet state changes
    PET_MOOD_CHANGED: 'pet:moodChanged',
    PET_GROWTH_STAGE_CHANGED: 'pet:growthStageChanged',
    PET_EVOLVED: 'pet:evolved',
    PET_CARE_QUALITY_CHANGED: 'pet:careQualityChanged',

    // Economy
    COINS_CHANGED: 'economy:coinsChanged',
    ITEM_PURCHASED: 'economy:itemPurchased',
    ITEM_SOLD: 'economy:itemSold',
    STATE_CHANGED: 'state:changed',
    STATE_REPLACED: 'state:replaced',

    // Achievements & rewards
    ACHIEVEMENT_UNLOCKED: 'reward:achievementUnlocked',
    BADGE_UNLOCKED: 'reward:badgeUnlocked',
    STICKER_COLLECTED: 'reward:stickerCollected',
    TROPHY_EARNED: 'reward:trophyEarned',
    STREAK_UPDATED: 'reward:streakUpdated',
    DAILY_TASK_COMPLETED: 'reward:dailyTaskCompleted',

    // UI notifications
    TOAST_REQUESTED: 'ui:toastRequested',
    ANNOUNCEMENT_REQUESTED: 'ui:announcementRequested',

    // Game events
    GAME_SAVED: 'game:saved',
    GAME_LOADED: 'game:loaded',
    ROOM_CHANGED: 'game:roomChanged',
    WEATHER_CHANGED: 'game:weatherChanged',
    TIME_OF_DAY_CHANGED: 'game:timeOfDayChanged',
    MINIGAME_COMPLETED: 'game:minigameCompleted',

    // Exploration
    EXPEDITION_COMPLETED: 'exploration:expeditionCompleted',
    BIOME_UNLOCKED: 'exploration:biomeUnlocked',
    NPC_ENCOUNTERED: 'exploration:npcEncountered',
    DUNGEON_CLEARED: 'exploration:dungeonCleared',

    // Breeding
    BREEDING_STARTED: 'breeding:started',
    BREEDING_EGG_HATCHED: 'breeding:eggHatched',

    // Competition
    BATTLE_WON: 'competition:battleWon',
    BATTLE_LOST: 'competition:battleLost',
    BOSS_DEFEATED: 'competition:bossDefeated',
    RIVAL_DEFEATED: 'competition:rivalDefeated',
    SHOW_COMPLETED: 'competition:showCompleted'
});

function createEventBus() {
    return {
        _listeners: {},

        on(event, callback) {
            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            const list = this._listeners[event];
            if (!list) return;
            const idx = list.indexOf(callback);
            if (idx !== -1) list.splice(idx, 1);
            if (list.length === 0) delete this._listeners[event];
        },

        emit(event, data) {
            const list = this._listeners[event];
            if (!list || list.length === 0) return;
            const snapshot = list.slice();
            for (let i = 0; i < snapshot.length; i++) {
                try {
                    snapshot[i](data);
                } catch (err) {
                    console.error('[EventBus] Error in listener for "' + event + '":', err);
                }
            }
        },

        clearAll() {
            this._listeners = {};
        }
    };
}

const EventBus = createEventBus();

if (typeof globalThis !== 'undefined') {
    globalThis.EVENTS = EVENTS;
    globalThis.EventBus = EventBus;
    globalThis.createEventBus = createEventBus;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EVENTS, EventBus, createEventBus };
}
