(function () {
    'use strict';

    const AUDIO_DEBUG_FLAG_KEY = 'mlfAudioDebug';
    const SETTINGS_KEY = 'mlf.audio.v2.settings';
    const MAX_ACTIVE_GLOBAL = 20;
    const MAX_ACTIVE_BY_CHANNEL = Object.freeze({ ui: 6, sfx: 10, music: 6, ambient: 6 });
    const DEFAULT_VOLUMES = Object.freeze({ master: 0.94, music: 0.52, ambient: 0.56, sfx: 0.9, ui: 0.88 });
    const DEFAULT_MUTED = Object.freeze({ master: false, music: false, ambient: false, sfx: false, ui: false });
    const CHANNELS = Object.freeze(['master', 'music', 'ambient', 'sfx', 'ui']);
    const LOOP_TRANSITION_DEFAULT_MS = 320;
    const LOOP_TRANSITION_ROOM_MS = 520;
    const LOOP_TRANSITION_STOP_MS = 180;
    const LOOP_TRANSITION_FAST_MS = 120;
    const SCENE_LOOP_SLOT_KEYS = Object.freeze([
        'ambient:base',
        'ambient:detail',
        'music:base',
        'music:detail'
    ]);
    const MIX_DUCK_PRESETS = Object.freeze({
        ui: { music: 0.82, ambient: 0.76, holdMs: 120, releaseMs: 180 },
        error: { music: 0.72, ambient: 0.62, holdMs: 180, releaseMs: 240 },
        reward: { music: 0.78, ambient: 0.7, holdMs: 160, releaseMs: 260 },
        critical: { music: 0.64, ambient: 0.56, holdMs: 240, releaseMs: 320 }
    });

    const FALLBACK_MANIFEST = {
        version: 1,
        preload: ['ui-tap-1', 'ui-confirm', 'ui-open-modal', 'ui-close-modal', 'ui-error'],
        sounds: {
            'ui-tap-1': { path: 'assets/audio/ui/ui-tap-1.m4a', channel: 'ui', category: 'ui', defaultVolume: 0.7, preload: true, throttleMs: 40 },
            'ui-confirm': { path: 'assets/audio/ui/ui-confirm.m4a', channel: 'ui', category: 'ui', defaultVolume: 0.8, preload: true, throttleMs: 40 },
            'ui-open-modal': { path: 'assets/audio/ui/ui-open-modal.m4a', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'ui-close-modal': { path: 'assets/audio/ui/ui-close-modal.m4a', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'ui-error': { path: 'assets/audio/ui/ui-error.m4a', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'button-tap': { alias: 'ui-tap-1' },
            'menu-open': { alias: 'ui-open-modal' },
            'error-soft': { alias: 'ui-error' },
            'feed': { path: 'assets/audio/pet/pet-eating.m4a', channel: 'sfx', category: 'pet', defaultVolume: 0.7 },
            'wash': { path: 'assets/audio/pet/pet-bath-splash.m4a', channel: 'sfx', category: 'pet', defaultVolume: 0.7 },
            'play': { path: 'assets/audio/pet/pet-excited.m4a', channel: 'sfx', category: 'pet', defaultVolume: 0.8 },
            'sleep': { path: 'assets/audio/ui/ui-toggle.m4a', channel: 'sfx', category: 'pet', defaultVolume: 0.48 },
            'bathroom-tub-loop': { path: 'assets/audio/ambient/bathroom-tub-loop.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.48, loop: true },
            'kitchen-fridge-hum': { path: 'assets/audio/ambient/kitchen-fridge-hum.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.42, loop: true },
            'bedroom-aircon-hum': { path: 'assets/audio/ambient/bedroom-aircon-hum.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.4, loop: true },
            'cozy-room-ambience': { path: 'assets/audio/ambient/cozy-room-ambience.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.55, loop: true },
            'outdoor-garden-ambience': { path: 'assets/audio/ambient/outdoor-garden-ambience.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.5, loop: true },
            'nighttime-ambience': { path: 'assets/audio/ambient/nighttime-ambience.mp3', channel: 'ambient', category: 'ambient', defaultVolume: 0.52, loop: true }
        }
    };

    const ACCESSIBILITY_CUES = Object.freeze({
        room: { id: 'room', label: 'Room chime', description: 'Plays when entering a room.', sound: 'roomTransition' },
        error: { id: 'error', label: 'Error', description: 'Plays when an action is unavailable.', sound: 'error-soft' },
        reward: { id: 'reward', label: 'Reward', description: 'Plays when you earn something.', sound: 'reward-pop' },
        objectiveStart: { id: 'objectiveStart', label: 'Objective start', description: 'Mini-game started.', sound: 'minigame-start-stinger' },
        objectiveEnd: { id: 'objectiveEnd', label: 'Objective end', description: 'Mini-game ended.', sound: 'minigame-end-stinger' },
        focusPlayfield: { id: 'focusPlayfield', label: 'Focus playfield', description: 'Focus the mini-game play area.', sound: 'ui-focus' },
        comboRise: { id: 'comboRise', label: 'Combo rise', description: 'Combo is increasing.', sound: 'combo-rise' },
        countdownDanger: { id: 'countdownDanger', label: 'Countdown danger', description: 'Time is running out.', sound: 'ui-error' },
        cooldownComplete: { id: 'cooldownComplete', label: 'Cooldown complete', description: 'Actions are ready again.', sound: 'ui-confirm' },
        lowStatUrgency: { id: 'lowStatUrgency', label: 'Low stat urgency', description: 'Pet needs care now.', sound: 'ui-error' },
        actionAvailable: { id: 'actionAvailable', label: 'Action available', description: 'Important action is now available.', sound: 'ui-confirm' },
        statusImportant: { id: 'statusImportant', label: 'Important status', description: 'Important pet or gameplay status changed.', sound: 'achievement' },
        simonPad: { id: 'simonPad', label: 'Simon pad cue', description: 'Simon pad playback cue.', sound: 'ui-focus' },
        rhythmBeatAccent: { id: 'rhythmBeatAccent', label: 'Rhythm accent beat', description: 'Strong rhythm beat cue.', sound: 'match-success' }
    });

    let manifest = null;
    let manifestPromise = null;
    let credits = [];
    let creditsPromise = null;
    let initPromise = null;
    let listenersBound = false;
    let lifecycleListenersBound = false;
    let _visibilityChangeHandler = null;
    let unlocked = false;
    let destroyed = false;
    let audioSupported = true;
    let currentRoom = null;
    let currentAudioPreset = safeRead('myLittleFriend_audioPreset', 'standard');
    let pausedForBackground = false;
    let unlockInFlightPromise = null;
    let unlockListenerHandler = null;
    const UNLOCK_LISTENER_CAPTURE = true;

    let audioCtx = null;
    let webAudioGains = null;

    const baseAudioCache = new Map();
    const decodedBufferCache = new Map();
    const decodedBufferPromises = new Map();
    const activeVoices = new Set();
    const lastPlayedAt = new Map();
    const channelLoopPlayers = new Map();
    const sceneLoopPlayers = new Map();
    const captionChannelState = { lastCue: null, category: null, text: '', timestamp: 0 };
    const sfxVariantBags = new Map();
    const sfxVariantLastPick = new Map();
    const loopTransitions = new Map();
    const mixDuckTimers = new Map();
    const duckState = {
        music: { multiplier: 1, restoreAt: 0, restoreMs: 0 },
        ambient: { multiplier: 1, restoreAt: 0, restoreMs: 0 }
    };
    const sceneAudioState = {
        roomId: null,
        timeOfDay: null,
        activity: 'pet',
        minigame: null,
        intensity: 0,
        rewardPulseUntil: 0,
        roomChangeAt: 0,
        enabled: true
    };
    let sceneRefreshTimer = null;

    const SFX_VARIANT_GROUPS = Object.freeze({
        uiTap: Object.freeze([
            { name: 'ui-tap-1', gain: 1 },
            { name: 'ui-tap-2', gain: 0.95 },
            { name: 'ui-toggle', gain: 0.78 }
        ]),
        confirm: Object.freeze([
            { name: 'ui-confirm', gain: 1 },
            { name: 'match-success', gain: 0.72 },
            { name: 'ui-focus', gain: 0.82 }
        ]),
        uiBack: Object.freeze([
            { name: 'ui-back', gain: 1 },
            { name: 'ui-close-modal', gain: 0.88 },
            { name: 'ui-toggle', gain: 0.72 }
        ]),
        uiError: Object.freeze([
            { name: 'ui-error', gain: 1 },
            { name: 'fail-gentle', gain: 0.82 },
            { name: 'pet-sad-whimper', gain: 0.58 }
        ]),
        feed: Object.freeze([
            { name: 'feed', gain: 1 },
            { name: 'pet-eating', gain: 0.9 },
            { name: 'happy-chirp', gain: 0.48 }
        ]),
        wash: Object.freeze([
            { name: 'wash', gain: 1 },
            { name: 'pet-bath-splash', gain: 0.95 },
            { name: 'bubble-pop', gain: 0.6 }
        ]),
        play: Object.freeze([
            { name: 'play', gain: 1 },
            { name: 'pet-excited', gain: 0.92 },
            { name: 'match-success', gain: 0.65 }
        ]),
        sleep: Object.freeze([
            { name: 'sleep', gain: 1 },
            { name: 'pet-sleeping-zzz', gain: 0.78 },
            { name: 'ui-toggle', gain: 0.62 }
        ]),
        medicine: Object.freeze([
            { name: 'medicine', gain: 1 },
            { name: 'medicine-soft', gain: 0.92 },
            { name: 'ui-focus', gain: 0.66 }
        ]),
        groom: Object.freeze([
            { name: 'groom', gain: 1 },
            { name: 'groom-soft', gain: 0.92 },
            { name: 'ui-focus', gain: 0.7 }
        ]),
        exercise: Object.freeze([
            { name: 'exercise', gain: 1 },
            { name: 'hit-soft', gain: 0.95 },
            { name: 'pet-excited', gain: 0.6 }
        ]),
        treat: Object.freeze([
            { name: 'treat', gain: 1 },
            { name: 'pet-eating', gain: 0.88 },
            { name: 'coin-collect', gain: 0.56 }
        ]),
        cuddle: Object.freeze([
            { name: 'cuddle', gain: 1 },
            { name: 'affection-heart', gain: 0.86 },
            { name: 'pet-affection-heart', gain: 0.84 }
        ]),
        rewardSmall: Object.freeze([
            { name: 'coin-collect', gain: 1 },
            { name: 'match-success', gain: 0.72 }
        ]),
        rewardMedium: Object.freeze([
            { name: 'reward-treasure', gain: 1 },
            { name: 'coin-collect', gain: 0.66 }
        ]),
        rewardBig: Object.freeze([
            { name: 'achievement', gain: 1 },
            { name: 'reward-treasure', gain: 0.7 }
        ])
    });
    const SFX_VARIANT_NAME_TO_GROUP = Object.freeze({
        'button-tap': 'uiTap',
        'ui-tap-1': 'uiTap',
        'ui-tap-2': 'uiTap',
        tap: 'uiTap',
        'tap-1': 'uiTap',
        'tap-2': 'uiTap',
        'ui-confirm': 'confirm',
        confirm: 'confirm',
        success: 'confirm',
        'ui-back': 'uiBack',
        back: 'uiBack',
        'ui-error': 'uiError',
        error: 'uiError',
        feed: 'feed',
        wash: 'wash',
        play: 'play',
        sleep: 'sleep',
        medicine: 'medicine',
        groom: 'groom',
        exercise: 'exercise',
        treat: 'treat',
        cuddle: 'cuddle',
        'coin-collect': 'rewardSmall',
        'reward-treasure': 'rewardMedium',
        achievement: 'rewardBig'
    });

    const state = {
        volumes: Object.assign({}, DEFAULT_VOLUMES),
        muted: Object.assign({}, DEFAULT_MUTED),
        samplePackEnabled: true,
        soundCueCaptionsEnabled: safeReadBoolean('soundCueCaptionsEnabled', false)
    };
    loadPersistedSettings();
    syncLegacyMirrors();

    function isDebugEnabled() {
        try {
            if (typeof window !== 'undefined' && window.__MLF_AUDIO_DEBUG__) return true;
            return localStorage.getItem(AUDIO_DEBUG_FLAG_KEY) === 'true';
        } catch (err) {
            return false;
        }
    }

    function logDebug() {
        if (!isDebugEnabled()) return;
        try { console.debug('[GameAudio]', ...arguments); } catch (err) {}
    }

    function warnDebug() {
        if (!isDebugEnabled()) return;
        try { console.warn('[GameAudio]', ...arguments); } catch (err) {}
    }

    function safeRead(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value == null ? fallback : value;
        } catch (err) {
            return fallback;
        }
    }

    function safeReadBoolean(key, fallback) {
        const raw = safeRead(key, null);
        if (raw == null) return fallback;
        return raw === 'true';
    }

    function clamp01(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    }

    function clamp(value, min, max) {
        const n = Number(value);
        if (!Number.isFinite(n)) return min;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    function nowMs() {
        return Date.now();
    }

    function getSceneLoopSlotKey(channel, layer) {
        return `${channel}:${layer}`;
    }

    function clearTimer(timerId) {
        if (!timerId) return null;
        try { clearTimeout(timerId); } catch (err) {}
        return null;
    }

    function readGlobalGameStateAudioContext() {
        try {
            if (typeof gameState === 'undefined' || !gameState) return null;
            return {
                roomId: gameState.currentRoom || currentRoom || null,
                timeOfDay: gameState.timeOfDay || null,
                weather: gameState.weather || null
            };
        } catch (err) {
            return null;
        }
    }

    function getChannelBaseVolume(channel) {
        const channelVolume = state.volumes[channel] == null ? 1 : state.volumes[channel];
        const masterVolume = state.volumes.master == null ? 1 : state.volumes.master;
        const masterMuted = !!state.muted.master;
        const channelMuted = !!state.muted[channel];
        if (masterMuted || channelMuted) return 0;
        return clamp01(masterVolume) * clamp01(channelVolume);
    }

    function getRuntimeChannelMixMultiplier(channel) {
        if (channel === 'music' || channel === 'ambient') {
            const ds = duckState[channel];
            return clamp01(ds && Number.isFinite(ds.multiplier) ? ds.multiplier : 1);
        }
        return 1;
    }

    function scheduleSceneRefresh(delayMs) {
        if (destroyed) return;
        if (sceneRefreshTimer) sceneRefreshTimer = clearTimer(sceneRefreshTimer);
        const delay = Math.max(0, Number(delayMs) || 0);
        sceneRefreshTimer = setTimeout(() => {
            sceneRefreshTimer = null;
            refreshSceneAudio({ reason: 'scheduled' });
        }, delay);
    }

    function clearSceneRefreshTimer() {
        sceneRefreshTimer = clearTimer(sceneRefreshTimer);
    }

    function getLegacyKey(name, fallback) {
        try {
            if (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS && STORAGE_KEYS[name]) return STORAGE_KEYS[name];
        } catch (err) {}
        return fallback;
    }

    function applyDefaultAudioSettings() {
        CHANNELS.forEach((channel) => {
            if (DEFAULT_VOLUMES[channel] != null) state.volumes[channel] = DEFAULT_VOLUMES[channel];
            if (DEFAULT_MUTED[channel] != null) state.muted[channel] = DEFAULT_MUTED[channel];
        });
    }

    function loadPersistedSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.volumes && typeof parsed.volumes === 'object') {
                        CHANNELS.forEach((channel) => {
                            if (parsed.volumes[channel] != null) state.volumes[channel] = clamp01(parsed.volumes[channel]);
                        });
                    }
                    if (parsed.muted && typeof parsed.muted === 'object') {
                        CHANNELS.forEach((channel) => {
                            if (typeof parsed.muted[channel] === 'boolean') state.muted[channel] = parsed.muted[channel];
                        });
                    }
                    if (typeof parsed.samplePackEnabled === 'boolean') state.samplePackEnabled = parsed.samplePackEnabled;
                    if (typeof parsed.soundCueCaptionsEnabled === 'boolean') state.soundCueCaptionsEnabled = parsed.soundCueCaptionsEnabled;
                }
            }
        } catch (err) {
            warnDebug('[AudioManager] Could not load persisted settings, using defaults:', err);
            applyDefaultAudioSettings();
        }

        // Migrate legacy per-channel volumes if present.
        const legacyVolumeMap = [
            ['sfx', getLegacyKey('sfxVolume', 'myLittleFriend_sfxVolume')],
            ['ambient', getLegacyKey('ambientVolume', 'myLittleFriend_ambientVolume')],
            ['music', getLegacyKey('musicVolume', 'myLittleFriend_musicVolume')]
        ];
        legacyVolumeMap.forEach(([channel, key]) => {
            try {
                const raw = localStorage.getItem(key);
                if (raw != null && raw !== '') state.volumes[channel] = clamp01(parseFloat(raw));
            } catch (err) {}
        });

        try {
            const enabledRaw = localStorage.getItem(getLegacyKey('soundEnabled', 'myLittleFriend_soundEnabled'));
            if (enabledRaw === 'false') state.muted.master = true;
        } catch (err) {}
        try {
            const musicEnabledRaw = localStorage.getItem(getLegacyKey('musicEnabled', 'myLittleFriend_musicEnabled'));
            if (musicEnabledRaw === 'false') state.muted.music = true;
        } catch (err) {}
        try {
            const samplePackRaw = localStorage.getItem(getLegacyKey('samplePackEnabled', 'myLittleFriend_samplePackEnabled'));
            if (samplePackRaw != null) state.samplePackEnabled = samplePackRaw !== 'false';
        } catch (err) {}
        try {
            const captionsRaw = localStorage.getItem(getLegacyKey('soundCueCaptions', 'myLittleFriend_soundCueCaptions'));
            if (captionsRaw != null) state.soundCueCaptionsEnabled = captionsRaw === 'true';
        } catch (err) {}
    }

    function persistSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                volumes: state.volumes,
                muted: state.muted,
                samplePackEnabled: state.samplePackEnabled,
                soundCueCaptionsEnabled: state.soundCueCaptionsEnabled
            }));
        } catch (err) {
            warnDebug('Failed to persist audio settings', err);
        }
        syncLegacyMirrors();
        applyRuntimeGains();
    }

    function syncLegacyMirrors() {
        try { localStorage.setItem(getLegacyKey('soundEnabled', 'myLittleFriend_soundEnabled'), state.muted.master ? 'false' : 'true'); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('musicEnabled', 'myLittleFriend_musicEnabled'), state.muted.music ? 'false' : 'true'); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('sfxVolume', 'myLittleFriend_sfxVolume'), String(state.volumes.sfx)); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('ambientVolume', 'myLittleFriend_ambientVolume'), String(state.volumes.ambient)); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('musicVolume', 'myLittleFriend_musicVolume'), String(state.volumes.music)); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('samplePackEnabled', 'myLittleFriend_samplePackEnabled'), state.samplePackEnabled ? 'true' : 'false'); } catch (err) {}
        try { localStorage.setItem(getLegacyKey('soundCueCaptions', 'myLittleFriend_soundCueCaptions'), state.soundCueCaptionsEnabled ? 'true' : 'false'); } catch (err) {}
        try { localStorage.setItem('myLittleFriend_audioPreset', currentAudioPreset || 'standard'); } catch (err) {}
    }

    function fetchJson(pathname, fallback) {
        return fetch(pathname, { credentials: 'same-origin' })
            .then((res) => {
                if (!res.ok) throw new Error(`${pathname} ${res.status}`);
                return res.json();
            })
            .catch((err) => {
                warnDebug(`Failed to load ${pathname}, using fallback`, err && err.message ? err.message : err);
                return fallback;
            });
    }

    function ensureManifest() {
        if (manifest) return Promise.resolve(manifest);
        if (!manifestPromise) {
            manifestPromise = fetchJson('assets/audio/audio-manifest.json', FALLBACK_MANIFEST).then((data) => {
                manifest = (data && data.sounds) ? data : FALLBACK_MANIFEST;
                preloadConfiguredSounds();
                return manifest;
            });
        }
        return manifestPromise;
    }

    function ensureCredits() {
        if (credits.length) return Promise.resolve(credits);
        if (!creditsPromise) {
            creditsPromise = fetchJson('assets/audio/audio-credits.json', { items: [] }).then((data) => {
                credits = Array.isArray(data && data.items) ? data.items : [];
                return credits;
            });
        }
        return creditsPromise;
    }

    function preloadConfiguredSounds() {
        if (!manifest || !manifest.preload || !Array.isArray(manifest.preload)) return;
        manifest.preload.forEach((name) => {
            const resolved = resolveSound(name);
            if (resolved && resolved.path) getBaseAudioElement(resolved.path);
        });
    }

    function getBaseAudioElement(src) {
        if (!src || typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
        const key = src;
        let audio = baseAudioCache.get(key);
        if (audio) return audio;
        audio = new window.Audio(src);
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.crossOrigin = 'anonymous';
        try { audio.load(); } catch (err) {}
        baseAudioCache.set(key, audio);
        return audio;
    }

    function createPlayerFromSource(src) {
        if (typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
        const player = new window.Audio(src);
        player.preload = 'auto';
        player.setAttribute('playsinline', '');
        player.setAttribute('webkit-playsinline', '');
        return player;
    }

    function decodeAudioDataCompat(ctx, arrayBuffer) {
        try {
            const maybePromise = ctx.decodeAudioData(arrayBuffer.slice(0));
            if (maybePromise && typeof maybePromise.then === 'function') return maybePromise;
        } catch (err) {
            // Fall through to callback API.
        }
        return new Promise((resolve, reject) => {
            try {
                ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
            } catch (err) {
                reject(err);
            }
        });
    }

    async function getDecodedBuffer(src) {
        if (!src) return null;
        if (!audioCtx) return null;
        if (decodedBufferCache.has(src)) return decodedBufferCache.get(src);
        if (!decodedBufferPromises.has(src)) {
            decodedBufferPromises.set(src, (async () => {
                try {
                    const res = await fetch(src, { credentials: 'same-origin' });
                    if (!res.ok) throw new Error(`fetch ${res.status}`);
                    const bytes = await res.arrayBuffer();
                    const buffer = await decodeAudioDataCompat(audioCtx, bytes);
                    decodedBufferCache.set(src, buffer || null);
                    return buffer || null;
                } catch (err) {
                    warnDebug('decode failed for', src, err && err.message ? err.message : err);
                    decodedBufferCache.set(src, null);
                    return null;
                } finally {
                    decodedBufferPromises.delete(src);
                }
            })());
        }
        return decodedBufferPromises.get(src);
    }

    function getChannelOutputNode(channel) {
        if (!audioCtx) return null;
        if (channel === 'ui' && webAudioGains && webAudioGains.ui) return webAudioGains.ui;
        if (channel === 'ambient' && webAudioGains && webAudioGains.ambient) return webAudioGains.ambient;
        if (channel === 'music' && webAudioGains && webAudioGains.music) return webAudioGains.music;
        if ((channel === 'sfx' || channel === 'gameplay') && getBusInputNode) {
            return getBusInputNode(channel === 'gameplay' ? 'gameplay' : 'sfx');
        }
        return (webAudioGains && (webAudioGains.sfx || webAudioGains.master)) || (audioCtx && audioCtx.destination) || null;
    }

    function effectiveChannelVolume(channel) {
        return clamp01(getChannelBaseVolume(channel) * getRuntimeChannelMixMultiplier(channel));
    }

    function applyRuntimeGains() {
        activeVoices.forEach((voice) => applyVoiceOutputGain(voice));
        // Update WebAudio graph for procedural tones
        applyWebAudioChannelGains();
    }

    function applyVoiceOutputGain(voice) {
        if (!voice) return;
        const channel = voice.channel || 'sfx';
        const baseGain = (voice.baseGain == null ? 1 : voice.baseGain);
        const runtimeMultiplier = voice.gainNode ? 1 : getRuntimeChannelMixMultiplier(channel);
        const gain = baseGain * getChannelBaseVolume(channel) * runtimeMultiplier;
        if (voice.gainNode && audioCtx) {
            try {
                const now = audioCtx.currentTime;
                voice.gainNode.gain.cancelScheduledValues(now);
                voice.gainNode.gain.setTargetAtTime(Math.max(0.00001, clamp(voice._manualGainMultiplier == null ? clamp01(gain) : (gain * clamp01(voice._manualGainMultiplier)), 0, 1)), now, 0.01);
            } catch (err) {}
            return;
        }
        if (voice.player) {
            voice.player.volume = clamp01((voice._manualGainMultiplier == null ? 1 : clamp01(voice._manualGainMultiplier)) * gain);
            voice.player.muted = gain <= 0;
        }
    }

    function ensureAudioContext() {
        if (!audioSupported || typeof window === 'undefined') return null;
        if (audioCtx) return audioCtx;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            audioSupported = false;
            return null;
        }
        try {
            audioCtx = new Ctx();
            const master = audioCtx.createGain();
            const music = audioCtx.createGain();
            const musicDuck = audioCtx.createGain();
            const ambient = audioCtx.createGain();
            const ambientDuck = audioCtx.createGain();
            const sfx = audioCtx.createGain();
            const ui = audioCtx.createGain();
            const gameplay = audioCtx.createGain();
            const headroom = audioCtx.createGain();
            let compressor = null;
            if (typeof audioCtx.createDynamicsCompressor === 'function') {
                compressor = audioCtx.createDynamicsCompressor();
                try {
                    compressor.threshold.value = -20;
                    compressor.knee.value = 24;
                    compressor.ratio.value = 6;
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.18;
                } catch (err) {}
            }

            music.connect(musicDuck);
            ambient.connect(ambientDuck);
            musicDuck.connect(master);
            ambientDuck.connect(master);
            sfx.connect(master);
            ui.connect(master);
            gameplay.connect(sfx);
            if (compressor) {
                master.connect(compressor);
                compressor.connect(headroom);
            } else {
                master.connect(headroom);
            }
            headroom.connect(audioCtx.destination);

            webAudioGains = { master, music, musicDuck, ambient, ambientDuck, sfx, ui, gameplay, headroom, compressor };
            applyWebAudioChannelGains();
            return audioCtx;
        } catch (err) {
            audioSupported = false;
            warnDebug('AudioContext unavailable', err);
            return null;
        }
    }

    function applyWebAudioChannelGains() {
        if (!audioCtx || !webAudioGains) return;
        const now = audioCtx.currentTime;
        const masterVolume = getChannelBaseVolume('master');
        const masterBase = masterVolume > 0 ? masterVolume : 1e-6;
        const map = {
            master: masterVolume,
            music: masterVolume > 0 ? getChannelBaseVolume('music') / masterBase : 0,
            ambient: masterVolume > 0 ? getChannelBaseVolume('ambient') / masterBase : 0,
            sfx: masterVolume > 0 ? getChannelBaseVolume('sfx') / masterBase : 0,
            ui: masterVolume > 0 ? getChannelBaseVolume('ui') / masterBase : 0
        };
        Object.keys(map).forEach((key) => {
            const node = webAudioGains[key];
            if (!node) return;
            const effective = map[key];
            const v = Number.isFinite(effective) ? clamp01(effective) : 0;
            node.gain.cancelScheduledValues(now);
            node.gain.setTargetAtTime(v, now, 0.015);
        });
        if (webAudioGains.musicDuck && webAudioGains.musicDuck.gain) {
            webAudioGains.musicDuck.gain.cancelScheduledValues(now);
            webAudioGains.musicDuck.gain.setTargetAtTime(getRuntimeChannelMixMultiplier('music'), now, 0.03);
        }
        if (webAudioGains.ambientDuck && webAudioGains.ambientDuck.gain) {
            webAudioGains.ambientDuck.gain.cancelScheduledValues(now);
            webAudioGains.ambientDuck.gain.setTargetAtTime(getRuntimeChannelMixMultiplier('ambient'), now, 0.03);
        }
        if (webAudioGains.headroom && webAudioGains.headroom.gain) {
            webAudioGains.headroom.gain.cancelScheduledValues(now);
            webAudioGains.headroom.gain.setTargetAtTime(0.92, now, 0.04);
        }
    }

    function bindUnlockListeners() {
        if (listenersBound || unlocked || typeof window === 'undefined' || typeof document === 'undefined') return;
        listenersBound = true;
        const onFirstInteraction = () => {
            if (destroyed || unlocked || unlockInFlightPromise) return;
            unlock().catch(() => {});
        };
        unlockListenerHandler = onFirstInteraction;
        const opts = { passive: true, capture: UNLOCK_LISTENER_CAPTURE };
        // Include click for VoiceOver/Switch Control activations that may not
        // emit pointer/touch events in WKWebView.
        ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((evt) => {
            window.addEventListener(evt, onFirstInteraction, opts);
        });
    }

    function unbindUnlockListeners() {
        if (!listenersBound || typeof window === 'undefined' || !unlockListenerHandler) {
            listenersBound = false;
            unlockListenerHandler = null;
            return;
        }
        ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach((evt) => {
            try { window.removeEventListener(evt, unlockListenerHandler, UNLOCK_LISTENER_CAPTURE); } catch (err) {}
        });
        listenersBound = false;
        unlockListenerHandler = null;
    }

    function bindLifecycleListeners() {
        if (lifecycleListenersBound || typeof document === 'undefined' || typeof window === 'undefined') return;
        lifecycleListenersBound = true;
        _visibilityChangeHandler = () => {
            if (destroyed) return;
            if (document.hidden) {
                pausedForBackground = true;
                SCENE_LOOP_SLOT_KEYS.forEach((slotKey) => {
                    const channel = slotKey.split(':')[0];
                    const voice = sceneLoopPlayers.get(slotKey);
                    if (voice) {
                        sceneLoopPlayers.delete(slotKey);
                        stopVoiceSmooth(voice, { fadeMs: LOOP_TRANSITION_FAST_MS });
                    }
                });
                const manualMusic = channelLoopPlayers.get('music');
                const manualAmbient = channelLoopPlayers.get('ambient');
                if (manualMusic) { channelLoopPlayers.delete('music'); stopVoiceSmooth(manualMusic, { fadeMs: LOOP_TRANSITION_FAST_MS }); }
                if (manualAmbient) { channelLoopPlayers.delete('ambient'); stopVoiceSmooth(manualAmbient, { fadeMs: LOOP_TRANSITION_FAST_MS }); }
                if (audioCtx && audioCtx.state === 'running') {
                    audioCtx.suspend().catch(() => {});
                }
                return;
            }
            if (!pausedForBackground) return;
            pausedForBackground = false;
            if (audioCtx && audioCtx.state === 'suspended' && unlocked) {
                audioCtx.resume().catch(() => {});
            }
            if (unlocked && getEnabled() && currentRoom) {
                refreshSceneAudio({ reason: 'foreground', restartLoops: true });
            }
        };
        document.addEventListener('visibilitychange', _visibilityChangeHandler, true);
        window.addEventListener('pageshow', _visibilityChangeHandler, true);
    }

    async function unlock() {
        if (destroyed) return false;
        if (unlocked) {
            ensureAudioContext();
            if (audioCtx && audioCtx.state === 'suspended') {
                try { await audioCtx.resume(); } catch (err) { warnDebug('AudioContext resume failed', err); }
            }
            return true;
        }
        if (unlockInFlightPromise) return unlockInFlightPromise;
        unlockInFlightPromise = (async () => {
            // Critical for iOS/WKWebView: create/resume the AudioContext inside
            // the user-gesture call stack before any awaited fetch/work.
            ensureAudioContext();
            if (audioCtx && audioCtx.state === 'suspended') {
                try { await audioCtx.resume(); } catch (err) { warnDebug('AudioContext resume failed', err); }
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                // Keep listeners active so a subsequent direct interaction can retry.
                warnDebug('AudioContext still suspended after unlock attempt; deferring unlock completion');
                return false;
            }
            await ensureManifest();
            if (unlocked) return true;
            unlocked = true;
            preloadConfiguredSounds();
            // Prime key audio elements (best-effort for mobile WebViews)
            baseAudioCache.forEach((audio) => {
                try { audio.load(); } catch (err) {}
            });
            unbindUnlockListeners();
            if (currentRoom) enterRoom(currentRoom);
            logDebug('Audio unlocked');
            return true;
        })();
        try {
            return await unlockInFlightPromise;
        } finally {
            unlockInFlightPromise = null;
        }
    }

    async function init() {
        if (destroyed) return false;
        if (!initPromise) {
            initPromise = Promise.allSettled([ensureManifest(), ensureCredits()]).then(() => {
                bindUnlockListeners();
                bindLifecycleListeners();
                return true;
            });
        }
        return initPromise;
    }

    function resolveSound(name, depth) {
        if (!name) return null;
        const currentDepth = depth || 0;
        if (currentDepth > 8) return null;
        const sounds = (manifest && manifest.sounds) || FALLBACK_MANIFEST.sounds || {};
        const entry = sounds[name];
        if (!entry) return null;
        if (entry.alias) return resolveSound(entry.alias, currentDepth + 1);
        return Object.assign({ name }, entry);
    }

    function getThrottleMs(entry, opts) {
        if (opts && typeof opts.throttleMs === 'number') return Math.max(0, opts.throttleMs);
        if (entry && typeof entry.throttleMs === 'number') return Math.max(0, entry.throttleMs);
        if (entry && entry.channel === 'ui') return 35;
        return 0;
    }

    function shouldSkipDueToThrottle(soundName, entry, opts) {
        if (!soundName) return false;
        if (opts && opts.noThrottle) return false;
        const throttleMs = getThrottleMs(entry, opts);
        if (!throttleMs) return false;
        const now = Date.now();
        const last = lastPlayedAt.get(soundName) || 0;
        if (now - last < throttleMs) return true;
        lastPlayedAt.set(soundName, now);
        return false;
    }

    function extractSoundName(input) {
        if (!input) return null;
        if (typeof input === 'string') return input;
        if (typeof input === 'function') {
            if (typeof input.audioName === 'string') return input.audioName;
            try {
                const maybe = input(audioCtx || ensureAudioContext());
                if (typeof maybe === 'string') return maybe;
                if (maybe && typeof maybe.audioName === 'string') return maybe.audioName;
            } catch (err) {
                warnDebug('Failed to evaluate legacy token callback', err);
            }
            return null;
        }
        if (typeof input === 'object' && typeof input.name === 'string') return input.name;
        return null;
    }

    function shuffleVariants(list) {
        const arr = list.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function pickVariantGroupEntry(groupId) {
        const group = SFX_VARIANT_GROUPS[groupId];
        if (!Array.isArray(group) || group.length === 0) return null;
        let bag = sfxVariantBags.get(groupId);
        if (!Array.isArray(bag) || bag.length === 0) {
            bag = shuffleVariants(group);
            const lastPick = sfxVariantLastPick.get(groupId);
            if (bag.length > 1 && lastPick && bag[0] && bag[0].name === lastPick.name) {
                bag.push(bag.shift());
            }
        }
        const next = bag.shift() || group[0];
        sfxVariantBags.set(groupId, bag);
        sfxVariantLastPick.set(groupId, next);
        return next;
    }

    function resolveVariantPlayback(name, opts) {
        const soundName = String(name || '');
        const options = Object.assign({}, opts || {});
        if (options.disableVariants) return { soundName, options };
        const groupId = SFX_VARIANT_NAME_TO_GROUP[soundName];
        if (!groupId) return { soundName, options };
        const pick = pickVariantGroupEntry(groupId);
        if (!pick || !pick.name) return { soundName, options };
        const baseGain = Number.isFinite(options.gain) ? Number(options.gain) : 1;
        options.gain = Math.max(0, Math.min(1, baseGain * (Number(pick.gain) || 1)));
        options.variantGroup = groupId;
        return { soundName: pick.name, options };
    }

    function canPlayChannel(channel, opts) {
        if (destroyed) return false;
        if (opts && opts.ignoreMute) return true;
        return effectiveChannelVolume(channel) > 0;
    }

    function cleanupVoice(voice) {
        if (!voice) return;
        if (voice._cleaned) return;
        voice._cleaned = true;
        if (voice._fadeTimer) {
            try { clearTimeout(voice._fadeTimer); } catch (err) {}
            voice._fadeTimer = null;
        }
        cleanupLoopSlotMapsForVoice(voice);
        activeVoices.delete(voice);
        if (voice.sourceNode) {
            try { voice.sourceNode.onended = null; } catch (err) {}
            try { voice.sourceNode.stop(0); } catch (err) {}
            try { voice.sourceNode.disconnect(); } catch (err) {}
        }
        if (voice.mediaSourceNode) {
            try { voice.mediaSourceNode.disconnect(); } catch (err) {}
        }
        if (voice.gainNode) {
            try { voice.gainNode.disconnect(); } catch (err) {}
        }
        const player = voice.player;
        if (player) {
            try { player.pause(); } catch (err) {}
            try { player.src = ''; } catch (err) {}
        }
    }

    function enforceVoiceLimits(channel) {
        if (activeVoices.size <= MAX_ACTIVE_GLOBAL && countActiveForChannel(channel) <= (MAX_ACTIVE_BY_CHANNEL[channel] || 6)) return;
        const candidates = Array.from(activeVoices)
            .filter((voice) => voice.channel === channel || activeVoices.size > MAX_ACTIVE_GLOBAL)
            .sort((a, b) => {
                const pa = Number(a && a.priority) || 0;
                const pb = Number(b && b.priority) || 0;
                if (pa !== pb) return pa - pb;
                const aloop = a && a.loop ? 1 : 0;
                const bloop = b && b.loop ? 1 : 0;
                if (aloop !== bloop) return aloop - bloop;
                return (a.startedAt || 0) - (b.startedAt || 0);
            });
        while (activeVoices.size > MAX_ACTIVE_GLOBAL || countActiveForChannel(channel) > (MAX_ACTIVE_BY_CHANNEL[channel] || 6)) {
            const victim = candidates.shift();
            if (!victim) break;
            if (victim.loop || victim.priority >= 60) stopVoiceSmooth(victim, { fadeMs: 70 });
            else stopVoiceSmooth(victim, { fadeMs: 35 });
        }
    }

    function countActiveForChannel(channel) {
        let count = 0;
        activeVoices.forEach((voice) => {
            if (voice.channel === channel) count += 1;
        });
        return count;
    }

    function applyMixDuckProfile(profileName, overrideOptions) {
        const preset = MIX_DUCK_PRESETS[profileName];
        if (!preset) return;
        const opts = overrideOptions || {};
        const holdMs = Math.max(0, Number(opts.holdMs != null ? opts.holdMs : preset.holdMs) || 0);
        const releaseMs = Math.max(40, Number(opts.releaseMs != null ? opts.releaseMs : preset.releaseMs) || 180);
        const targets = {
            music: clamp01(opts.music != null ? opts.music : preset.music),
            ambient: clamp01(opts.ambient != null ? opts.ambient : preset.ambient)
        };
        Object.keys(targets).forEach((channel) => {
            const stateForChannel = duckState[channel];
            if (!stateForChannel) return;
            stateForChannel.multiplier = Math.min(stateForChannel.multiplier || 1, targets[channel]);
            stateForChannel.restoreAt = nowMs() + holdMs;
            stateForChannel.restoreMs = releaseMs;
            const timerKey = `duck:${channel}`;
            const prior = mixDuckTimers.get(timerKey);
            if (prior) clearTimeout(prior);
            const timerId = setTimeout(() => {
                mixDuckTimers.delete(timerKey);
                stateForChannel.multiplier = 1;
                stateForChannel.restoreAt = 0;
                stateForChannel.restoreMs = 0;
                applyRuntimeGains();
            }, holdMs + releaseMs);
            mixDuckTimers.set(timerKey, timerId);
        });
        applyRuntimeGains();
    }

    function inferMixDuckProfile(soundName, entry, opts) {
        if (opts && typeof opts.mixDuck === 'string') return opts.mixDuck;
        const name = String(soundName || '').toLowerCase();
        if (opts && opts.critical) return 'critical';
        if (name.includes('reward') || name.includes('achievement') || name.includes('coin') || name.includes('combo')) return 'reward';
        if (name.includes('error') || name.includes('fail') || name.includes('miss') || (opts && opts.error)) return 'error';
        if ((entry && entry.channel === 'ui') || (opts && opts.ui)) return 'ui';
        return null;
    }

    function computeVoicePriority(channel, entry, opts, isLoop) {
        const baseByChannel = { music: 60, ambient: 50, ui: 35, sfx: 30, gameplay: 34 };
        let priority = baseByChannel[channel] || 20;
        if (isLoop) priority += 20;
        if (opts && opts.persistent) priority += 20;
        if (opts && opts.critical) priority += 25;
        if (opts && opts.ui) priority += 8;
        if (opts && opts.error) priority += 10;
        if (entry && entry.category === 'music') priority += 8;
        if (entry && entry.category === 'ambient') priority += 6;
        return priority;
    }

    function fadeVoiceGain(voice, targetMultiplier, durationMs, stopAfterFade) {
        if (!voice || voice._cleaned) return;
        const duration = Math.max(0, Number(durationMs) || 0);
        const clampedTarget = clamp01(targetMultiplier);
        voice._manualGainMultiplier = clampedTarget;
        if (voice._fadeTimer) {
            try { clearTimeout(voice._fadeTimer); } catch (err) {}
            voice._fadeTimer = null;
        }
        if (voice.gainNode && audioCtx) {
            try {
                const now = audioCtx.currentTime;
                const current = clamp(Math.max(0.00001, Number(voice.gainNode.gain.value) || 0.00001), 0.00001, 1);
                voice.gainNode.gain.cancelScheduledValues(now);
                voice.gainNode.gain.setValueAtTime(current, now);
                if (duration <= 0) {
                    voice.gainNode.gain.setValueAtTime(Math.max(0.00001, clampedTarget), now);
                } else {
                    voice.gainNode.gain.linearRampToValueAtTime(Math.max(0.00001, clampedTarget), now + (duration / 1000));
                }
            } catch (err) {}
        } else if (voice.player) {
            applyVoiceOutputGain(voice);
        }
        if (stopAfterFade) {
            voice._fadeTimer = setTimeout(() => {
                voice._fadeTimer = null;
                cleanupVoice(voice);
            }, duration + 20);
        }
    }

    function stopVoiceSmooth(voice, opts) {
        if (!voice || voice._cleaned) return;
        const options = opts || {};
        const fadeMs = Math.max(0, Number(options.fadeMs) || LOOP_TRANSITION_STOP_MS);
        fadeVoiceGain(voice, 0, fadeMs, true);
    }

    function cleanupLoopSlotMapsForVoice(voice) {
        if (!voice) return;
        if (voice._loopStore === 'scene' && voice._loopSlotKey && sceneLoopPlayers.get(voice._loopSlotKey) === voice) {
            sceneLoopPlayers.delete(voice._loopSlotKey);
        }
        if (voice._loopStore === 'channel' && voice._loopSlotKey && channelLoopPlayers.get(voice._loopSlotKey) === voice) {
            channelLoopPlayers.delete(voice._loopSlotKey);
        }
    }

    async function createLoopVoice(channel, soundName, entry, options) {
        const opts = options || {};
        const baseGain = clamp01((entry.defaultVolume == null ? 1 : entry.defaultVolume) * (opts.gain != null ? opts.gain : 1));
        const shouldLoop = opts && typeof opts.loop === 'boolean' ? opts.loop : true;
        const initialGainMultiplier = clamp01(opts.initialGainMultiplier == null ? 1 : opts.initialGainMultiplier);
        const loopPriority = computeVoicePriority(channel, entry, opts, true);
        const ctx = ensureAudioContext();
        if (ctx && webAudioGains) {
            try {
                if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
                const buffer = await getDecodedBuffer(entry.path);
                if (buffer) {
                    const sourceNode = ctx.createBufferSource();
                    const gainNode = ctx.createGain();
                    sourceNode.buffer = buffer;
                    sourceNode.loop = shouldLoop;
                    sourceNode.connect(gainNode);
                    const outNode = getChannelOutputNode(channel);
                    if (outNode) gainNode.connect(outNode);
                    const voice = {
                        name: soundName,
                        channel,
                        sourceNode,
                        gainNode,
                        baseGain,
                        startedAt: Date.now(),
                        loop: true,
                        priority: loopPriority,
                        _manualGainMultiplier: initialGainMultiplier
                    };
                    sourceNode.onended = () => {
                        cleanupLoopSlotMapsForVoice(voice);
                        cleanupVoice(voice);
                    };
                    activeVoices.add(voice);
                    applyVoiceOutputGain(voice);
                    const startOffsetSec = clamp(Number(opts.startOffsetSec || 0), 0, Math.max(0, (buffer.duration || 0) - 0.02));
                    sourceNode.start(ctx.currentTime, startOffsetSec || 0);
                    enforceVoiceLimits(channel);
                    return voice;
                }
            } catch (err) {
                warnDebug('WebAudio loop failed; falling back to HTMLAudio', soundName, err && err.message ? err.message : err);
            }
        }

        const player = createPlayerFromSource(entry.path);
        if (!player) return null;
        let mediaSourceNode = null;
        let gainNode = null;
        if (ctx && webAudioGains) {
            try {
                mediaSourceNode = ctx.createMediaElementSource(player);
                gainNode = ctx.createGain();
                mediaSourceNode.connect(gainNode);
                const outNode = getChannelOutputNode(channel);
                if (outNode) gainNode.connect(outNode);
                player.volume = 1;
            } catch (err) {
                mediaSourceNode = null;
                gainNode = null;
            }
        }
        player.loop = shouldLoop;
        player.currentTime = 0;
        const voice = {
            name: soundName,
            channel,
            player,
            mediaSourceNode,
            gainNode,
            baseGain,
            startedAt: Date.now(),
            loop: true,
            priority: loopPriority,
            _manualGainMultiplier: initialGainMultiplier
        };
        activeVoices.add(voice);
        applyVoiceOutputGain(voice);
        enforceVoiceLimits(channel);
        player.addEventListener('error', () => {
            cleanupLoopSlotMapsForVoice(voice);
            cleanupVoice(voice);
        }, { once: true });
        const p = player.play();
        if (p && typeof p.catch === 'function') {
            p.catch((err) => {
                cleanupLoopSlotMapsForVoice(voice);
                cleanupVoice(voice);
                warnDebug('Loop playback failed', soundName, err && err.message ? err.message : err);
            });
        }
        return voice;
    }

    async function transitionLoopSlot(storeKind, slotKey, channel, soundName, opts) {
        const options = Object.assign({}, opts || {});
        const store = storeKind === 'scene' ? sceneLoopPlayers : channelLoopPlayers;
        const current = store.get(slotKey);
        const fadeMs = Math.max(0, Number(options.fadeMs != null ? options.fadeMs : LOOP_TRANSITION_DEFAULT_MS) || LOOP_TRANSITION_DEFAULT_MS);
        if (!soundName) {
            if (current) {
                store.delete(slotKey);
                stopVoiceSmooth(current, { fadeMs: options.stopFadeMs || LOOP_TRANSITION_STOP_MS });
            }
            return null;
        }

        if (!unlocked) await unlock();
        await ensureManifest();
        const entry = resolveSound(soundName);
        if (!entry || !entry.path) {
            warnDebug('Missing loop sound', soundName);
            return null;
        }
        if (!canPlayChannel(channel, options)) {
            if (current) {
                store.delete(slotKey);
                stopVoiceSmooth(current, { fadeMs: LOOP_TRANSITION_FAST_MS });
            }
            return null;
        }
        if (current && current.name === soundName && !options.restart) {
            current.baseGain = clamp01((entry.defaultVolume == null ? 1 : entry.defaultVolume) * (options.gain != null ? options.gain : 1));
            current._manualGainMultiplier = 1;
            applyVoiceOutputGain(current);
            return current;
        }

        const nextVoice = await createLoopVoice(channel, soundName, entry, Object.assign({}, options, {
            initialGainMultiplier: current ? 0 : 1,
            startOffsetSec: options.startOffsetSec != null
                ? Number(options.startOffsetSec)
                : (options.randomStartOffset ? Math.random() * 6 : 0)
        }));
        if (!nextVoice) return null;
        nextVoice._loopStore = storeKind;
        nextVoice._loopSlotKey = slotKey;
        store.set(slotKey, nextVoice);
        if (current) {
            cleanupLoopSlotMapsForVoice(current);
            stopVoiceSmooth(current, { fadeMs });
            fadeVoiceGain(nextVoice, 1, fadeMs, false);
        } else if (fadeMs > 0 && options.fadeIn !== false) {
            nextVoice._manualGainMultiplier = 0;
            applyVoiceOutputGain(nextVoice);
            fadeVoiceGain(nextVoice, 1, Math.min(fadeMs, 220), false);
        } else {
            nextVoice._manualGainMultiplier = 1;
            applyVoiceOutputGain(nextVoice);
        }
        return nextVoice;
    }

    async function playOneShot(soundName, opts) {
        if (!unlocked) await unlock();
        await ensureManifest();
        const entry = resolveSound(soundName);
        if (!entry || !entry.path) {
            warnDebug('Missing sound', soundName);
            return null;
        }
        if (shouldSkipDueToThrottle(soundName, entry, opts)) return null;
        const channel = entry.channel || 'sfx';
        if (!canPlayChannel(channel, opts)) return null;
        const mixDuckProfile = inferMixDuckProfile(soundName, entry, opts);
        if (mixDuckProfile) applyMixDuckProfile(mixDuckProfile, opts && opts.mixDuckOptions);
        const voicePriority = computeVoicePriority(channel, entry, opts, false);

        // Prefer Web Audio sample playback so per-channel volume works on iOS/WKWebView.
        const ctx = ensureAudioContext();
        if (ctx && webAudioGains) {
            try {
                if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
                const buffer = await getDecodedBuffer(entry.path);
                if (buffer) {
                    const sourceNode = ctx.createBufferSource();
                    const gainNode = ctx.createGain();
                    sourceNode.buffer = buffer;
                    sourceNode.loop = false;
                    sourceNode.connect(gainNode);
                    const outNode = getChannelOutputNode(channel);
                    if (outNode) gainNode.connect(outNode);
                    const baseGain = clamp01(entry.defaultVolume == null ? 1 : entry.defaultVolume);
                    const optsGain = clamp01(opts && opts.gain != null ? opts.gain : 1);
                    const voice = {
                        name: soundName,
                        channel,
                        sourceNode,
                        gainNode,
                        baseGain: baseGain * optsGain,
                        startedAt: Date.now(),
                        priority: voicePriority,
                        _manualGainMultiplier: 1
                    };
                    activeVoices.add(voice);
                    applyVoiceOutputGain(voice);
                    enforceVoiceLimits(channel);
                    sourceNode.onended = () => cleanupVoice(voice);
                    sourceNode.start(ctx.currentTime);
                    logDebug('playOneShot(webAudio)', soundName, entry.path, { channel });
                    return voice;
                }
            } catch (err) {
                warnDebug('WebAudio one-shot failed; falling back to HTMLAudio', soundName, err && err.message ? err.message : err);
            }
        }

        const base = getBaseAudioElement(entry.path);
        if (!base) return null;
        const player = createPlayerFromSource(base.currentSrc || entry.path);
        if (!player) return null;

        const baseGain = clamp01(entry.defaultVolume == null ? 1 : entry.defaultVolume);
        const optsGain = clamp01(opts && opts.gain != null ? opts.gain : 1);
        const vol = clamp01(baseGain * optsGain * effectiveChannelVolume(channel));
        let mediaSourceNode = null;
        let gainNode = null;
        if (ctx && webAudioGains) {
            try {
                mediaSourceNode = ctx.createMediaElementSource(player);
                gainNode = ctx.createGain();
                mediaSourceNode.connect(gainNode);
                const outNode = getChannelOutputNode(channel);
                if (outNode) gainNode.connect(outNode);
                player.volume = 1;
            } catch (err) {
                mediaSourceNode = null;
                gainNode = null;
                player.volume = vol;
            }
        } else {
            player.volume = vol;
        }
        player.loop = false;
        player.currentTime = 0;
        const voice = {
            name: soundName,
            channel,
            player,
            mediaSourceNode,
            gainNode,
            baseGain: baseGain * optsGain,
            startedAt: Date.now(),
            priority: voicePriority,
            _manualGainMultiplier: 1
        };
        activeVoices.add(voice);
        if (gainNode) applyVoiceOutputGain(voice);
        enforceVoiceLimits(channel);

        const cleanup = () => cleanupVoice(voice);
        player.addEventListener('ended', cleanup, { once: true });
        player.addEventListener('error', cleanup, { once: true });

        try {
            const playPromise = player.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch((err) => {
                    cleanup();
                    warnDebug('Playback failed', soundName, err && err.message ? err.message : err);
                });
            }
            logDebug('playOneShot', soundName, entry.path, { channel, vol });
            return voice;
        } catch (err) {
            cleanup();
            warnDebug('Playback exception', soundName, err);
            return null;
        }
    }

    async function playLoop(channel, soundName, opts) {
        const options = Object.assign({}, opts || {});
        return transitionLoopSlot('channel', channel, channel, soundName, Object.assign({
            fadeMs: options.fadeMs == null ? LOOP_TRANSITION_DEFAULT_MS : options.fadeMs
        }, options));
    }

    function stop(target) {
        if (!target) return;
        const channel = String(target);
        if (CHANNELS.includes(channel)) {
            const loopVoice = channelLoopPlayers.get(channel);
            if (loopVoice) {
                channelLoopPlayers.delete(channel);
                stopVoiceSmooth(loopVoice, { fadeMs: LOOP_TRANSITION_STOP_MS });
            }
            SCENE_LOOP_SLOT_KEYS
                .filter((slotKey) => slotKey.indexOf(`${channel}:`) === 0)
                .forEach((slotKey) => {
                    const sceneVoice = sceneLoopPlayers.get(slotKey);
                    if (!sceneVoice) return;
                    sceneLoopPlayers.delete(slotKey);
                    stopVoiceSmooth(sceneVoice, { fadeMs: LOOP_TRANSITION_STOP_MS });
                });
            if (channel === 'music' || channel === 'ambient') {
                clearLoopTransitionsForChannel(channel);
            }
            Array.from(activeVoices).forEach((voice) => {
                if (voice.channel === channel && !voice.loop) cleanupVoice(voice);
            });
            return;
        }

        Array.from(activeVoices).forEach((voice) => {
            if (voice.name === target) cleanupVoice(voice);
        });
        CHANNELS.forEach((ch) => {
            const voice = channelLoopPlayers.get(ch);
            if (voice && voice.name === target) {
                channelLoopPlayers.delete(ch);
                stopVoiceSmooth(voice, { fadeMs: LOOP_TRANSITION_STOP_MS });
            }
        });
        Array.from(sceneLoopPlayers.entries()).forEach(([slotKey, voice]) => {
            if (voice && voice.name === target) {
                sceneLoopPlayers.delete(slotKey);
                stopVoiceSmooth(voice, { fadeMs: LOOP_TRANSITION_STOP_MS });
            }
        });
    }

    function stopAll() {
        CHANNELS.forEach((channel) => stop(channel));
    }

    function setVolume(channel, value) {
        if (!CHANNELS.includes(channel)) return;
        state.volumes[channel] = clamp01(value);
        persistSettings();
    }

    function getVolume(channel) {
        if (!CHANNELS.includes(channel)) return 1;
        return clamp01(state.volumes[channel]);
    }

    function setMuted(channel, muted) {
        if (!CHANNELS.includes(channel)) return;
        state.muted[channel] = !!muted;
        if (channel === 'ambient' && state.muted.ambient) stop('ambient');
        if (channel === 'music' && state.muted.music) stop('music');
        persistSettings();
        if (!state.muted.master && (channel === 'ambient' || channel === 'music' || channel === 'master')) {
            refreshSceneAudio({ reason: 'mute-change' });
        }
    }

    function getMuted(channel) {
        if (!CHANNELS.includes(channel)) return false;
        return !!state.muted[channel];
    }

    function playSFX(nameOrToken, opts) {
        const soundName = extractSoundName(nameOrToken);
        const request = resolveVariantPlayback(soundName, opts || {});
        return playOneShot(request.soundName, request.options);
    }

    function playUI(nameOrAlias, opts) {
        const name = extractSoundName(nameOrAlias) || 'ui-tap-1';
        const request = resolveVariantPlayback(name, Object.assign({ ui: true }, opts || {}));
        return playOneShot(request.soundName, request.options);
    }

    function playMusic(trackName, opts) {
        const name = extractSoundName(trackName);
        return playLoop('music', name, opts || {});
    }

    function playAmbient(loopName, opts) {
        const name = extractSoundName(loopName);
        return playLoop('ambient', name, opts || {});
    }

    function playSFXByName(name, fallback, opts) {
        const resolved = resolveSound(name);
        if (resolved) {
            const request = resolveVariantPlayback(name, opts || {});
            return playOneShot(request.soundName, request.options);
        }
        const fromFallback = extractSoundName(fallback);
        const request = resolveVariantPlayback(fromFallback, opts || {});
        return playOneShot(request.soundName, request.options);
    }

    function toggle() {
        setMuted('master', !state.muted.master);
        if (!state.muted.master && currentRoom) enterRoom(currentRoom);
        return !state.muted.master;
    }

    function getEnabled() {
        return !state.muted.master;
    }

    function toggleMusic() {
        setMuted('music', !state.muted.music);
        if (state.muted.music) stop('music');
        else refreshSceneAudio({ reason: 'music-toggle-on' });
        return !state.muted.music;
    }

    function getMusicEnabled() {
        return !state.muted.music;
    }

    function setSfxVolumeSetting(value) { setVolume('sfx', value); }
    function getSfxVolumeSetting() { return getVolume('sfx'); }
    function setAmbientVolumeSetting(value) { setVolume('ambient', value); if (!state.muted.ambient && currentRoom) refreshSceneAudio({ reason: 'ambient-volume' }); }
    function getAmbientVolumeSetting() { return getVolume('ambient'); }
    function setMusicVolumeSetting(value) { setVolume('music', value); if (!state.muted.music && currentRoom) refreshSceneAudio({ reason: 'music-volume' }); }
    function getMusicVolumeSetting() { return getVolume('music'); }
    function setMasterVolumeSetting(value) { setVolume('master', value); }
    function getMasterVolumeSetting() { return getVolume('master'); }
    function setUiVolumeSetting(value) { setVolume('ui', value); }
    function getUiVolumeSetting() { return getVolume('ui'); }

    function toggleSamplePack() {
        state.samplePackEnabled = !state.samplePackEnabled;
        persistSettings();
        if (!state.samplePackEnabled) {
            Array.from(activeVoices).forEach((voice) => {
                if (voice.channel === 'ui' || voice.channel === 'sfx') cleanupVoice(voice);
            });
        }
        return state.samplePackEnabled;
    }

    function getSamplePackEnabled() {
        return !!state.samplePackEnabled;
    }

    function getAccessibilityCueLegend() {
        return Object.values(ACCESSIBILITY_CUES).map((cue) => ({ id: cue.id, label: cue.label, description: cue.description }));
    }

    function dispatchCaption(cueId, category, text) {
        captionChannelState.lastCue = cueId || null;
        captionChannelState.category = category || null;
        captionChannelState.text = text || '';
        captionChannelState.timestamp = Date.now();
        try {
            window.dispatchEvent(new CustomEvent('mlf-audio-caption', { detail: Object.assign({}, captionChannelState) }));
        } catch (err) {}
    }

    function getCaptionChannelState() {
        return Object.assign({}, captionChannelState);
    }

    function getSoundCueCaptionsEnabled() {
        return !!state.soundCueCaptionsEnabled;
    }

    function setSoundCueCaptionsEnabled(enabled) {
        state.soundCueCaptionsEnabled = !!enabled;
        persistSettings();
        return state.soundCueCaptionsEnabled;
    }

    function playAccessibilityCue(cueId, options) {
        const cue = ACCESSIBILITY_CUES[cueId];
        const opts = options || {};
        if (!cue) return { ok: false, reason: 'unknown-cue' };
        if (opts.playSound === false) {
            if (state.soundCueCaptionsEnabled) dispatchCaption(cueId, 'accessibility', opts.caption || cue.label);
            return { ok: true, label: cue.label, captionOnly: true };
        }
        if (!getEnabled()) return { ok: false, reason: 'sound-disabled', label: cue.label };
        const soundName = cue.sound || 'ui-confirm';
        const isCritical = cueId === 'error' || cueId === 'countdownDanger' || cueId === 'lowStatUrgency' || cueId === 'statusImportant';
        playOneShot(soundName, {
            gain: opts.gain == null ? (isCritical ? 0.9 : 0.8) : opts.gain,
            mixDuck: isCritical ? 'critical' : 'ui',
            error: isCritical
        });
        if (state.soundCueCaptionsEnabled || opts.forceCaption) dispatchCaption(cueId, 'accessibility', opts.caption || cue.label);
        return { ok: true, label: cue.label };
    }

    function emitAccessibilityCue(cueId, options) {
        const opts = options || {};
        if (opts.caption) dispatchCaption(cueId, 'accessibility', opts.caption);
        if (opts.playSound === false) return { ok: true, captionOnly: true };
        return playAccessibilityCue(cueId, opts);
    }

    function playUiCue(kind, options) {
        const map = {
            open: 'ui-open-modal',
            close: 'ui-close-modal',
            confirm: 'ui-confirm',
            back: 'ui-back',
            error: 'ui-error',
            disabled: 'ui-error',
            focus: 'ui-focus',
            toggle: 'ui-toggle'
        };
        const normalizedKind = String(kind || '').toLowerCase();
        const merged = Object.assign({
            ui: true,
            mixDuck: (normalizedKind === 'error' || normalizedKind === 'disabled') ? 'error' : 'ui',
            error: normalizedKind === 'error' || normalizedKind === 'disabled'
        }, options || {});
        const request = resolveVariantPlayback(map[kind] || 'ui-tap-1', merged);
        return playOneShot(request.soundName, request.options);
    }

    function playRewardCue(tier, options) {
        const normalized = String(tier || 'small').toLowerCase();
        const opts = Object.assign({}, options || {});
        const tierKey = (normalized === 'large') ? 'big' : normalized;
        pulseRewardSceneMix(tierKey, opts);
        if (tierKey === 'milestone' || tierKey === 'rare') {
            playOneShot('achievement', Object.assign({ gain: 0.96, mixDuck: 'critical', critical: true }, opts));
            setTimeout(() => playOneShot('reward-treasure', Object.assign({ gain: 0.7, mixDuck: 'reward' }, opts)), 90);
            return { ok: true, tier: tierKey };
        }
        if (tierKey === 'streak') {
            playOneShot('combo-rise', Object.assign({ gain: 0.9, mixDuck: 'reward' }, opts));
            setTimeout(() => playOneShot('coin-collect', Object.assign({ gain: 0.62, mixDuck: 'reward' }, opts)), 60);
            return { ok: true, tier: tierKey };
        }
        if (tierKey === 'big') {
            playOneShot('achievement', Object.assign({ gain: 0.88, mixDuck: 'reward' }, opts));
            setTimeout(() => playOneShot('reward-treasure', Object.assign({ gain: 0.64, mixDuck: 'reward' }, opts)), 70);
            return { ok: true, tier: tierKey };
        }
        if (tierKey === 'medium') {
            playOneShot('reward-treasure', Object.assign({ gain: 0.82, mixDuck: 'reward' }, opts));
            if (!opts.skipAccent) setTimeout(() => playOneShot('coin-collect', Object.assign({ gain: 0.5, mixDuck: 'reward' }, opts)), 55);
            return { ok: true, tier: tierKey };
        }
        playOneShot('coin-collect', Object.assign({ gain: 0.78, mixDuck: 'reward' }, opts));
        return { ok: true, tier: tierKey };
    }

    function playStatusCue(kind, options) {
        const normalized = String(kind || '').toLowerCase();
        const opts = Object.assign({}, options || {});
        if (normalized === 'cooldownready' || normalized === 'cooldown-ready' || normalized === 'actionavailable' || normalized === 'action-available') {
            if (normalized !== 'cooldownready' && normalized !== 'cooldown-ready') {
                pulseRewardSceneMix('small', { skipDuck: true });
            }
            return playAccessibilityCue(normalized.includes('cooldown') ? 'cooldownComplete' : 'actionAvailable', Object.assign({ gain: 0.78 }, opts));
        }
        if (normalized === 'important' || normalized === 'important-state') {
            return playAccessibilityCue('statusImportant', Object.assign({ gain: 0.88 }, opts));
        }
        if (normalized === 'error' || normalized === 'warning') {
            return playUiCue('error', Object.assign({ error: true }, opts));
        }
        return playUiCue('confirm', Object.assign({ ui: true }, opts));
    }

    function playCareActionCue(action, options) {
        const act = String(action || '').toLowerCase();
        const opts = Object.assign({}, options || {});
        const gain = clamp(opts.gain == null ? 0.88 : opts.gain, 0, 1);
        const affinity = String(opts.affinity || '').toLowerCase();
        const isDislike = affinity === 'dislike' || affinity === 'bad';
        const isLove = affinity === 'love' || affinity === 'great' || affinity === 'favorite';
        const mapping = {
            feed: 'feed',
            wash: 'wash',
            play: 'play',
            sleep: 'sleep',
            medicine: 'medicine',
            groom: 'groom',
            exercise: 'exercise',
            treat: 'treat',
            cuddle: 'cuddle'
        };
        const soundName = mapping[act] || 'ui-confirm';
        const mixDuck = (act === 'sleep') ? 'ui' : 'reward';
        if (isDislike) {
            playOneShot(act === 'medicine' ? 'medicine-soft' : 'fail-gentle', { gain: Math.max(0.45, gain * 0.76), mixDuck: 'error', error: true });
            setTimeout(() => playOneShot(soundName, { gain: Math.max(0.35, gain * 0.55), mixDuck: 'ui' }), 36);
            return { ok: true, action: act, mood: 'dislike' };
        }
        playOneShot(soundName, { gain, mixDuck });
        if (isLove || opts.firstTime || opts.favoriteTreat) {
            setTimeout(() => playOneShot((act === 'cuddle' || act === 'treat') ? 'affection-heart' : 'happy-chirp', {
                gain: clamp(gain * 0.55, 0.18, 0.6),
                mixDuck: 'reward'
            }), 42);
        }
        return { ok: true, action: act };
    }

    function playMiniGameTone(options) {
        if (!getEnabled()) return null;
        const ctx = ensureAudioContext();
        if (!ctx || !webAudioGains) return null;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const opts = options || {};
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const rawDurationSeconds = (typeof opts.durationMs === 'number')
            ? (opts.durationMs / 1000)
            : (typeof opts.duration === 'number' ? (opts.duration > 10 ? (opts.duration / 1000) : opts.duration) : 0.12);
        const duration = Math.max(0.03, Number(rawDurationSeconds || 0.12));
        const attack = Math.max(0.001, Math.min(0.03, duration * 0.2));
        const release = Math.max(0.01, Math.min(0.2, duration * 0.7));
        const now = ctx.currentTime;
        const freqStart = Math.max(40, Number(opts.frequency || 440));
        const freqEnd = Math.max(40, Number(opts.frequencyEnd || freqStart));
        osc.type = opts.type || 'sine';
        osc.frequency.setValueAtTime(freqStart, now);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, now + Math.max(0.01, duration));
        }
        gain.gain.setValueAtTime(0.0001, now);
        const peakGain = Math.max(0.02, Math.min(0.5, Number(opts.gain || 0.18)));
        const sustain = clamp01(opts.sustain == null ? 0 : opts.sustain);
        gain.gain.linearRampToValueAtTime(peakGain, now + attack);
        if (sustain > 0) gain.gain.setValueAtTime(Math.max(0.0001, peakGain * sustain), now + Math.max(attack + 0.001, duration - release));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + release, duration));
        osc.connect(gain);
        const requestedBus = opts.bus || opts.channel;
        const dest = (requestedBus && getBusInputNode(requestedBus)) ||
            ((opts.channel === 'ui' && webAudioGains.ui) ? webAudioGains.ui : (webAudioGains.gameplay || webAudioGains.sfx || webAudioGains.master || ctx.destination));
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + duration);
        if (opts.harmonic && Number(opts.harmonic.frequency || 0) > 0 && !(opts._harmonicDepth >= 1)) {
            try {
                playMiniGameTone(Object.assign({}, opts.harmonic, {
                    bus: requestedBus || 'gameplay',
                    duration,
                    gain: peakGain * clamp(Number(opts.harmonic.gainMultiplier) || 0.45, 0.05, 1),
                    caption: null,
                    _harmonicDepth: (opts._harmonicDepth || 0) + 1
                }));
            } catch (err) {}
        }
        osc.onended = function () {
            try { osc.disconnect(); } catch (err) {}
            try { gain.disconnect(); } catch (err) {}
        };
        return { ok: true };
    }

    function setGameplayAudioState(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const active = opts.active !== false;
        if (!active) {
            sceneAudioState.activity = 'pet';
            sceneAudioState.minigame = null;
            sceneAudioState.intensity = 0;
            refreshSceneAudio({ reason: 'gameplay-clear' });
            return Object.assign({}, sceneAudioState);
        }
        sceneAudioState.activity = 'minigame';
        sceneAudioState.minigame = opts.minigame ? String(opts.minigame) : (sceneAudioState.minigame || 'minigame');
        sceneAudioState.intensity = clamp01(opts.intensity == null ? sceneAudioState.intensity : opts.intensity);
        if (opts.timeOfDay != null) sceneAudioState.timeOfDay = String(opts.timeOfDay);
        refreshSceneAudio({ reason: 'gameplay-state' });
        return Object.assign({}, sceneAudioState);
    }

    function clearGameplayAudioState() {
        return setGameplayAudioState({ active: false });
    }

    function setGameplayAudioIntensity(intensity) {
        if (sceneAudioState.activity !== 'minigame') return Object.assign({}, sceneAudioState);
        sceneAudioState.intensity = clamp01(intensity);
        refreshSceneAudio({ reason: 'gameplay-intensity' });
        return Object.assign({}, sceneAudioState);
    }

    function getSceneAudioState() {
        return Object.assign({}, sceneAudioState);
    }

    function clearLoopTransitionsForChannel(channel) {
        const key = `scene-refresh:${channel}`;
        const timerId = loopTransitions.get(key);
        if (timerId) {
            try { clearTimeout(timerId); } catch (err) {}
            loopTransitions.delete(key);
        }
    }

    function isNightLocal() {
        const hour = new Date().getHours();
        return hour < 6 || hour >= 20;
    }

    function getSceneTimeOfDay() {
        const fromState = sceneAudioState.timeOfDay;
        if (fromState) return String(fromState).toLowerCase();
        const gs = readGlobalGameStateAudioContext();
        if (gs && gs.timeOfDay) return String(gs.timeOfDay).toLowerCase();
        return isNightLocal() ? 'night' : 'day';
    }

    function chooseAmbientForRoom(roomId) {
        const id = String(roomId || '').toLowerCase();
        if (id.includes('garden') || id.includes('park') || id.includes('yard') || id.includes('outdoor')) return 'outdoor-garden-ambience';
        if (id.includes('bath') || id.includes('spa')) return 'bathroom-tub-loop';
        if (id.includes('kitchen')) return 'kitchen-fridge-hum';
        if (id.includes('bedroom')) return 'bedroom-aircon-hum';
        if (id.includes('observatory')) return 'nighttime-ambience';
        return 'cozy-room-ambience';
    }

    function chooseAmbientDetailForScene(context) {
        const ctx = context || sceneAudioState;
        const roomId = String((ctx && ctx.roomId) || currentRoom || '').toLowerCase();
        const timeOfDay = String((ctx && ctx.timeOfDay) || getSceneTimeOfDay()).toLowerCase();
        const intensity = clamp01((ctx && ctx.intensity) || 0);
        const isOutdoor = /garden|park|yard|outdoor/.test(roomId);
        if (ctx && ctx.activity === 'minigame') {
            if (ctx.minigame === 'rhythm') return intensity > 0.35 ? 'outdoor-garden-ambience' : 'cozy-room-ambience';
            if (ctx.minigame === 'simonsays') return 'cozy-room-ambience';
        }
        if (timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'sunrise') {
            if (isOutdoor) return 'nighttime-ambience';
            if (!roomId.includes('bedroom') && !roomId.includes('bath') && intensity < 0.5) return 'nighttime-ambience';
            return null;
        }
        if (roomId.includes('bedroom') || roomId.includes('kitchen')) return 'cozy-room-ambience';
        if (roomId.includes('bath') || roomId.includes('spa')) return 'cozy-room-ambience';
        return isOutdoor ? null : 'cozy-room-ambience';
    }

    function chooseMusicForRoom(roomId) {
        const id = String(roomId || '').toLowerCase();
        const timeOfDay = getSceneTimeOfDay();
        if (id.includes('bed') || id.includes('observatory') || id.includes('night') || timeOfDay === 'night') return 'pet-theme-night';
        return 'pet-theme-day';
    }

    function chooseMusicBaseForScene(context) {
        const ctx = context || sceneAudioState;
        const roomId = (ctx && ctx.roomId) || currentRoom || '';
        const timeOfDay = String((ctx && ctx.timeOfDay) || getSceneTimeOfDay()).toLowerCase();
        const activity = (ctx && ctx.activity) || 'pet';
        const minigame = (ctx && ctx.minigame) || '';
        if (activity === 'minigame') {
            if (minigame === 'rhythm') return timeOfDay === 'night' ? 'pet-theme-night-pulse' : 'pet-theme-day-playful';
            if (minigame === 'simonsays') return timeOfDay === 'night' ? 'pet-theme-night-focus' : 'pet-theme-day-focus';
        }
        if (timeOfDay === 'night' || timeOfDay === 'sunset' || /bed|observatory/.test(String(roomId).toLowerCase())) {
            return /reward/i.test(activity) ? 'pet-theme-night-warm' : 'pet-theme-night';
        }
        if (/garden|park|yard|outdoor/.test(String(roomId).toLowerCase())) return 'pet-theme-day-outdoor';
        if (/kitchen/.test(String(roomId).toLowerCase())) return 'pet-theme-day-home';
        return 'pet-theme-day';
    }

    function chooseMusicDetailForScene(context, baseTrack) {
        const ctx = context || sceneAudioState;
        const timeOfDay = String((ctx && ctx.timeOfDay) || getSceneTimeOfDay()).toLowerCase();
        const activity = (ctx && ctx.activity) || 'pet';
        const minigame = (ctx && ctx.minigame) || '';
        const intensity = clamp01((ctx && ctx.intensity) || 0);
        if (activity === 'minigame') {
            if (minigame === 'rhythm' && intensity >= 0.35) return timeOfDay === 'night' ? 'pet-theme-night-accent' : 'pet-theme-day-accent';
            if (minigame === 'simonsays' && intensity >= 0.25) return timeOfDay === 'night' ? 'pet-theme-night-focus-accent' : 'pet-theme-day-focus-accent';
        }
        if ((ctx && ctx.rewardPulseUntil && ctx.rewardPulseUntil > nowMs()) || activity === 'reward') {
            return timeOfDay === 'night' ? 'pet-theme-night-accent' : 'pet-theme-day-accent';
        }
        return null;
    }

    function getSceneLayerPlan() {
        const merged = Object.assign({}, readGlobalGameStateAudioContext() || {}, sceneAudioState || {});
        if (!merged.roomId) merged.roomId = currentRoom || null;
        if (!merged.timeOfDay) merged.timeOfDay = getSceneTimeOfDay();
        const intensity = clamp01(merged.intensity || 0);
        const ambientBase = chooseAmbientForRoom(merged.roomId || '');
        const ambientDetail = chooseAmbientDetailForScene(merged);
        const musicBase = chooseMusicBaseForScene(merged);
        const musicDetail = chooseMusicDetailForScene(merged, musicBase);
        const roomChangedRecently = (nowMs() - (merged.roomChangeAt || 0)) < 1400;
        const ambientDetailGain = merged.activity === 'minigame'
            ? clamp(0.14 + (intensity * 0.18), 0.12, 0.34)
            : clamp(((merged.timeOfDay === 'night' || merged.timeOfDay === 'sunset') ? 0.2 : 0.12) + (roomChangedRecently ? 0.05 : 0), 0.1, 0.34);
        const musicBaseGain = merged.activity === 'minigame'
            ? clamp(0.62 + (intensity * 0.16), 0.58, 0.82)
            : clamp((merged.timeOfDay === 'night' ? 0.68 : 0.74) + ((merged.rewardPulseUntil || 0) > nowMs() ? 0.08 : 0), 0.5, 0.9);
        const musicDetailGain = merged.activity === 'minigame'
            ? clamp(0.18 + (intensity * 0.2), 0.14, 0.42)
            : clamp(((merged.rewardPulseUntil || 0) > nowMs()) ? 0.24 : 0.16, 0.12, 0.34);

        return {
            ambient: [
                { slotKey: getSceneLoopSlotKey('ambient', 'base'), channel: 'ambient', sound: ambientBase, gain: 1, fadeMs: roomChangedRecently ? LOOP_TRANSITION_ROOM_MS : LOOP_TRANSITION_DEFAULT_MS, randomStartOffset: !!roomChangedRecently },
                { slotKey: getSceneLoopSlotKey('ambient', 'detail'), channel: 'ambient', sound: (ambientDetail && ambientDetail !== ambientBase) ? ambientDetail : null, gain: ambientDetailGain, fadeMs: roomChangedRecently ? LOOP_TRANSITION_ROOM_MS : LOOP_TRANSITION_DEFAULT_MS, randomStartOffset: true }
            ],
            music: [
                { slotKey: getSceneLoopSlotKey('music', 'base'), channel: 'music', sound: musicBase, gain: musicBaseGain, fadeMs: roomChangedRecently ? LOOP_TRANSITION_ROOM_MS : LOOP_TRANSITION_DEFAULT_MS, randomStartOffset: false },
                { slotKey: getSceneLoopSlotKey('music', 'detail'), channel: 'music', sound: (musicDetail && musicDetail !== musicBase) ? musicDetail : null, gain: musicDetailGain, fadeMs: roomChangedRecently ? LOOP_TRANSITION_ROOM_MS : LOOP_TRANSITION_DEFAULT_MS, randomStartOffset: true }
            ]
        };
    }

    function refreshSceneAudio(options) {
        const opts = options || {};
        if (destroyed) return;
        if (!sceneAudioState.enabled) return;
        if (!unlocked) return;
        if (sceneAudioState.activity === 'reward' && (!sceneAudioState.rewardPulseUntil || sceneAudioState.rewardPulseUntil <= nowMs())) {
            sceneAudioState.activity = 'pet';
            sceneAudioState.intensity = Math.min(sceneAudioState.intensity || 0, 0.25);
        }
        clearSceneRefreshTimer();
        if (!getEnabled()) {
            SCENE_LOOP_SLOT_KEYS.forEach((slotKey) => transitionLoopSlot('scene', slotKey, slotKey.split(':')[0], null, { fadeMs: LOOP_TRANSITION_FAST_MS }));
            return;
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        const plan = getSceneLayerPlan();
        if (!state.muted.ambient) {
            plan.ambient.forEach((layer) => {
                transitionLoopSlot('scene', layer.slotKey, layer.channel, layer.sound, Object.assign({}, layer, { restart: !!opts.restartLoops }));
            });
        } else {
            ['ambient:base', 'ambient:detail'].forEach((slotKey) => transitionLoopSlot('scene', slotKey, 'ambient', null, { fadeMs: LOOP_TRANSITION_FAST_MS }));
        }
        if (!state.muted.music) {
            plan.music.forEach((layer) => {
                transitionLoopSlot('scene', layer.slotKey, layer.channel, layer.sound, Object.assign({}, layer, { restart: !!opts.restartLoops }));
            });
        } else {
            ['music:base', 'music:detail'].forEach((slotKey) => transitionLoopSlot('scene', slotKey, 'music', null, { fadeMs: LOOP_TRANSITION_FAST_MS }));
        }
        if (sceneAudioState.rewardPulseUntil && sceneAudioState.rewardPulseUntil > nowMs()) {
            scheduleSceneRefresh(Math.max(100, sceneAudioState.rewardPulseUntil - nowMs() + 60));
        }
    }

    function updateSceneAudioContext(partial, options) {
        const patch = (partial && typeof partial === 'object') ? partial : {};
        const before = JSON.stringify({
            roomId: sceneAudioState.roomId,
            timeOfDay: sceneAudioState.timeOfDay,
            activity: sceneAudioState.activity,
            minigame: sceneAudioState.minigame,
            intensity: Number(sceneAudioState.intensity || 0).toFixed(2)
        });
        Object.keys(patch).forEach((key) => {
            if (patch[key] === undefined) return;
            sceneAudioState[key] = patch[key];
        });
        sceneAudioState.intensity = clamp01(sceneAudioState.intensity || 0);
        const after = JSON.stringify({
            roomId: sceneAudioState.roomId,
            timeOfDay: sceneAudioState.timeOfDay,
            activity: sceneAudioState.activity,
            minigame: sceneAudioState.minigame,
            intensity: Number(sceneAudioState.intensity || 0).toFixed(2)
        });
        if (before !== after || (options && options.forceRefresh)) {
            refreshSceneAudio(Object.assign({ reason: 'scene-context' }, options || {}));
        }
        return Object.assign({}, sceneAudioState);
    }

    function pulseRewardSceneMix(tier, options) {
        const normalized = String(tier || 'small').toLowerCase();
        const durationByTier = { small: 700, medium: 1000, big: 1300, large: 1300, milestone: 1600, streak: 1300, rare: 1800 };
        const intensityByTier = { small: 0.2, medium: 0.35, big: 0.52, large: 0.52, milestone: 0.65, streak: 0.6, rare: 0.72 };
        sceneAudioState.rewardPulseUntil = nowMs() + (durationByTier[normalized] || 900);
        sceneAudioState.activity = sceneAudioState.activity === 'minigame' ? 'minigame' : 'reward';
        sceneAudioState.intensity = Math.max(clamp01(sceneAudioState.intensity || 0), intensityByTier[normalized] || 0.2);
        refreshSceneAudio({ reason: 'reward-pulse' });
        scheduleSceneRefresh((durationByTier[normalized] || 900) + 40);
        if (!options || !options.skipDuck) applyMixDuckProfile('reward');
    }

    function startAmbientForRoom(roomId) {
        if (!roomId) return;
        currentRoom = roomId || currentRoom;
        sceneAudioState.roomId = currentRoom;
        sceneAudioState.timeOfDay = (readGlobalGameStateAudioContext() || {}).timeOfDay || sceneAudioState.timeOfDay || null;
        sceneAudioState.roomChangeAt = nowMs();
        if (!unlocked) return;
        refreshSceneAudio({ reason: 'room-ambient' });
    }

    function enterRoom(roomId) {
        currentRoom = roomId || currentRoom;
        if (!currentRoom) return;
        sceneAudioState.roomId = currentRoom;
        sceneAudioState.timeOfDay = (readGlobalGameStateAudioContext() || {}).timeOfDay || sceneAudioState.timeOfDay || null;
        sceneAudioState.activity = (sceneAudioState.activity === 'minigame') ? 'minigame' : 'pet';
        sceneAudioState.roomChangeAt = nowMs();
        if (!unlocked) return;
        refreshSceneAudio({ reason: 'enter-room' });
    }

    function hasUserInteracted() {
        return !!unlocked;
    }

    function initOnInteraction() {
        init();
        bindUnlockListeners();
        return true;
    }

    function getContext() {
        return ensureAudioContext();
    }

    function getMasterGain() {
        ensureAudioContext();
        return (webAudioGains && webAudioGains.master) || null;
    }

    function getBusInputNode(name) {
        ensureAudioContext();
        if (!webAudioGains) return null;
        if (name === 'gameplay') return webAudioGains.gameplay || webAudioGains.sfx;
        if (name && webAudioGains[name]) return webAudioGains[name];
        return webAudioGains.sfx || webAudioGains.master;
    }

    function applyAudioPreset(presetKey, options) {
        const key = String(presetKey || 'standard').toLowerCase();
        currentAudioPreset = key;
        if (key === 'silent') {
            state.muted.master = true;
            state.muted.music = true;
            state.muted.ambient = true;
            state.volumes.sfx = 0.4;
            state.volumes.ui = 0.4;
        } else if (key === 'calm') {
            state.muted.master = false;
            state.muted.music = false;
            state.muted.ambient = false;
            state.volumes.music = 0.32;
            state.volumes.ambient = 0.45;
            state.volumes.sfx = 0.55;
            state.volumes.ui = 0.6;
        } else {
            state.muted.master = false;
            state.muted.music = false;
            state.muted.ambient = false;
            state.volumes.master = DEFAULT_VOLUMES.master;
            state.volumes.music = DEFAULT_VOLUMES.music;
            state.volumes.ambient = DEFAULT_VOLUMES.ambient;
            state.volumes.sfx = DEFAULT_VOLUMES.sfx;
            state.volumes.ui = DEFAULT_VOLUMES.ui;
        }
        persistSettings();
        if (!state.muted.master && currentRoom) refreshSceneAudio({ reason: 'preset-change' });
        return key;
    }

    function previewAudioPreset(presetKey) {
        const key = String(presetKey || '').toLowerCase();
        if (key === 'silent') return { ok: true, muted: true };
        if (key === 'calm') {
            sceneAudioState.intensity = 0.1;
            refreshSceneAudio({ reason: 'preset-preview', restartLoops: true });
            return { ok: true };
        }
        playUiCue('confirm', { gain: 0.9 });
        playRewardCue('small', { gain: 0.75 });
        return { ok: true };
    }

    function getAudioPreset() {
        return currentAudioPreset || 'standard';
    }

    function startMusic(trackName, opts) {
        if (!trackName) {
            sceneAudioState.activity = sceneAudioState.activity === 'minigame' ? 'minigame' : 'pet';
            refreshSceneAudio({ reason: 'start-music' });
            return { ok: true, sceneDriven: true };
        }
        return playMusic(trackName || chooseMusicForRoom(currentRoom || ''), Object.assign({ fadeMs: LOOP_TRANSITION_DEFAULT_MS }, opts || {}));
    }

    function stopMusic() {
        ['music:base', 'music:detail'].forEach((slotKey) => transitionLoopSlot('scene', slotKey, 'music', null, { fadeMs: LOOP_TRANSITION_STOP_MS }));
        stop('music');
    }

    function destroy() {
        destroyed = true;
        unlockInFlightPromise = null;
        unbindUnlockListeners();
        if (typeof document !== 'undefined' && _visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', _visibilityChangeHandler, true);
            if (typeof window !== 'undefined') window.removeEventListener('pageshow', _visibilityChangeHandler, true);
            _visibilityChangeHandler = null;
        }
        lifecycleListenersBound = false;
        clearSceneRefreshTimer();
        Array.from(mixDuckTimers.values()).forEach((timerId) => { try { clearTimeout(timerId); } catch (err) {} });
        mixDuckTimers.clear();
        Array.from(loopTransitions.values()).forEach((timerId) => { try { clearTimeout(timerId); } catch (err) {} });
        loopTransitions.clear();
        sceneLoopPlayers.clear();
        stopAll();
        baseAudioCache.forEach((audio) => {
            try { audio.pause(); } catch (err) {}
            try { audio.src = ''; } catch (err) {}
        });
        baseAudioCache.clear();
        decodedBufferCache.clear();
        decodedBufferPromises.clear();
        if (audioCtx) {
            try { audioCtx.close(); } catch (err) {}
            audioCtx = null;
            webAudioGains = null;
        }
    }

    function getAudioCredits() {
        return ensureCredits();
    }

    function getAudioCreditsSync() {
        return credits.slice();
    }

    function getManifest() {
        return ensureManifest();
    }

    function makeToken(name) {
        const fn = function () { return name; };
        fn.audioName = name;
        return fn;
    }

    const sfx = {
        feed: makeToken('feed'),
        wash: makeToken('wash'),
        play: makeToken('play'),
        sleep: makeToken('sleep'),
        cuddle: makeToken('cuddle'),
        medicine: makeToken('medicine'),
        groom: makeToken('groom'),
        exercise: makeToken('exercise'),
        treat: makeToken('treat'),
        hit: makeToken('hit'),
        miss: makeToken('miss'),
        celebration: makeToken('celebration'),
        bubblePop: makeToken('bubblePop'),
        match: makeToken('match'),
        catch: makeToken('catch'),
        throw: makeToken('throw'),
        roomTransition: makeToken('roomTransition'),
        petHappy: makeToken('petHappy'),
        petSad: makeToken('petSad'),
        petExcited: makeToken('petExcited'),
        achievement: makeToken('achievement'),
        menuOpen: makeToken('menu-open'),
        buttonTap: makeToken('button-tap'),
        rewardPop: makeToken('reward-pop'),
        errorSoft: makeToken('error-soft'),
        coinJingle: makeToken('coin-jingle'),
        uiFocus: makeToken('ui-focus'),
        uiConfirm: makeToken('ui-confirm'),
        uiBack: makeToken('ui-back'),
        uiOpen: makeToken('ui-open-modal'),
        uiClose: makeToken('ui-close-modal'),
        uiDisabled: makeToken('ui-error'),
        uiWarning: makeToken('ui-error'),
        uiTabSwitch: makeToken('ui-toggle')
    };

    const api = {
        init,
        initOnInteraction,
        unlock,
        hasUserInteracted,
        playSFX,
        playUI,
        playUiCue,
        playMusic,
        playAmbient,
        playSFXByName,
        playRewardCue,
        playCareActionCue,
        playStatusCue,
        playMiniGameTone,
        playAccessibilityCue,
        emitAccessibilityCue,
        getAccessibilityCueLegend,
        getCaptionChannelState,
        getSoundCueCaptionsEnabled,
        setSoundCueCaptionsEnabled,
        setVolume,
        getVolume,
        setMuted,
        getMuted,
        stop,
        stopAll,
        toggle,
        getEnabled,
        toggleMusic,
        getMusicEnabled,
        toggleSamplePack,
        getSamplePackEnabled,
        setSfxVolumeSetting,
        getSfxVolumeSetting,
        setAmbientVolumeSetting,
        getAmbientVolumeSetting,
        setMusicVolumeSetting,
        getMusicVolumeSetting,
        setMasterVolumeSetting,
        getMasterVolumeSetting,
        setUiVolumeSetting,
        getUiVolumeSetting,
        enterRoom,
        getContext,
        getMasterGain,
        getBusInputNode,
        updateSceneAudioContext,
        getSceneAudioState,
        setGameplayAudioState,
        clearGameplayAudioState,
        setGameplayAudioIntensity,
        applyAudioPreset,
        previewAudioPreset,
        getAudioPreset,
        startMusic,
        stopMusic,
        destroy,
        getAudioCredits,
        getAudioCreditsSync,
        getManifest,
        sfx
    };

    api.__debug = {
        chooseAmbientForRoom,
        chooseMusicForRoom,
        chooseMusicBaseForScene,
        chooseMusicDetailForScene,
        chooseAmbientDetailForScene,
        getSceneLayerPlan,
        getRuntimeChannelMixMultiplier,
        applyMixDuckProfile
    };

    // Prime async loads early.
    init();

    if (typeof window !== 'undefined') {
        window.GameAudio = api;
        window.addEventListener('unload', function () {
            try { api.destroy(); } catch (err) {}
        });
    }
})();
