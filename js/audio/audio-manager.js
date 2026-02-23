(function () {
    'use strict';

    const AUDIO_DEBUG_FLAG_KEY = 'mlfAudioDebug';
    const SETTINGS_KEY = 'mlf.audio.v2.settings';
    const MAX_ACTIVE_GLOBAL = 14;
    const MAX_ACTIVE_BY_CHANNEL = Object.freeze({ ui: 5, sfx: 8, music: 2, ambient: 2 });
    const DEFAULT_VOLUMES = Object.freeze({ master: 1, music: 0.6, ambient: 0.65, sfx: 0.85, ui: 0.8 });
    const DEFAULT_MUTED = Object.freeze({ master: false, music: false, ambient: false, sfx: false, ui: false });
    const CHANNELS = Object.freeze(['master', 'music', 'ambient', 'sfx', 'ui']);

    const FALLBACK_MANIFEST = {
        version: 1,
        preload: ['ui-tap-1', 'ui-confirm', 'ui-open-modal', 'ui-close-modal', 'ui-error'],
        sounds: {
            'ui-tap-1': { path: 'assets/audio/ui/ui-tap-1.ogg', channel: 'ui', category: 'ui', defaultVolume: 0.7, preload: true, throttleMs: 40 },
            'ui-confirm': { path: 'assets/audio/ui/ui-confirm.ogg', channel: 'ui', category: 'ui', defaultVolume: 0.8, preload: true, throttleMs: 40 },
            'ui-open-modal': { path: 'assets/audio/ui/ui-open-modal.ogg', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'ui-close-modal': { path: 'assets/audio/ui/ui-close-modal.ogg', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'ui-error': { path: 'assets/audio/ui/ui-error.ogg', channel: 'ui', category: 'ui', defaultVolume: 0.75, preload: true },
            'button-tap': { alias: 'ui-tap-1' },
            'menu-open': { alias: 'ui-open-modal' },
            'error-soft': { alias: 'ui-error' },
            'feed': { path: 'assets/audio/pet/pet-eating.ogg', channel: 'sfx', category: 'pet', defaultVolume: 0.7 },
            'wash': { path: 'assets/audio/pet/pet-bath-splash.ogg', channel: 'sfx', category: 'pet', defaultVolume: 0.7 },
            'play': { path: 'assets/audio/pet/pet-excited.ogg', channel: 'sfx', category: 'pet', defaultVolume: 0.8 },
            'sleep': { path: 'assets/audio/pet/pet-sleeping-zzz.ogg', channel: 'ambient', category: 'pet', defaultVolume: 0.45 },
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
        lowStatUrgency: { id: 'lowStatUrgency', label: 'Low stat urgency', description: 'Pet needs care now.', sound: 'ui-error' }
    });

    let manifest = null;
    let manifestPromise = null;
    let credits = [];
    let creditsPromise = null;
    let initPromise = null;
    let listenersBound = false;
    let unlocked = false;
    let destroyed = false;
    let audioSupported = true;
    let currentRoom = null;
    let currentAudioPreset = safeRead('myLittleFriend_audioPreset', 'standard');

    let audioCtx = null;
    let webAudioGains = null;

    const baseAudioCache = new Map();
    const activeVoices = new Set();
    const lastPlayedAt = new Map();
    const channelLoopPlayers = new Map();
    const captionChannelState = { lastCue: null, category: null, text: '', timestamp: 0 };

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

    function getLegacyKey(name, fallback) {
        try {
            if (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS && STORAGE_KEYS[name]) return STORAGE_KEYS[name];
        } catch (err) {}
        return fallback;
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
            warnDebug('Failed to parse audio settings, using defaults', err);
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

    function effectiveChannelVolume(channel) {
        const channelVolume = state.volumes[channel] == null ? 1 : state.volumes[channel];
        const masterVolume = state.volumes.master == null ? 1 : state.volumes.master;
        const masterMuted = !!state.muted.master;
        const channelMuted = !!state.muted[channel];
        if (masterMuted || channelMuted) return 0;
        return clamp01(masterVolume) * clamp01(channelVolume);
    }

    function applyRuntimeGains() {
        // Update HTMLAudio loops
        channelLoopPlayers.forEach((voice, channel) => {
            if (!voice || !voice.player) return;
            const gain = (voice.baseGain == null ? 1 : voice.baseGain) * effectiveChannelVolume(channel);
            voice.player.volume = clamp01(gain);
            voice.player.muted = gain <= 0;
        });
        // Update WebAudio graph for procedural tones
        applyWebAudioChannelGains();
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
            const ambient = audioCtx.createGain();
            const sfx = audioCtx.createGain();
            const ui = audioCtx.createGain();
            const gameplay = audioCtx.createGain();

            music.connect(master);
            ambient.connect(master);
            sfx.connect(master);
            ui.connect(master);
            gameplay.connect(sfx);
            master.connect(audioCtx.destination);

            webAudioGains = { master, music, ambient, sfx, ui, gameplay };
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
        const map = {
            master: effectiveChannelVolume('master'),
            music: effectiveChannelVolume('music') / Math.max(effectiveChannelVolume('master') || 1, 1e-6),
            ambient: effectiveChannelVolume('ambient') / Math.max(effectiveChannelVolume('master') || 1, 1e-6),
            sfx: effectiveChannelVolume('sfx') / Math.max(effectiveChannelVolume('master') || 1, 1e-6),
            ui: effectiveChannelVolume('ui') / Math.max(effectiveChannelVolume('master') || 1, 1e-6)
        };
        Object.keys(map).forEach((key) => {
            const node = webAudioGains[key];
            if (!node) return;
            const v = clamp01(map[key]);
            node.gain.cancelScheduledValues(now);
            node.gain.setTargetAtTime(v, now, 0.015);
        });
    }

    function bindUnlockListeners() {
        if (listenersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
        listenersBound = true;
        const onFirstInteraction = () => {
            unlock().catch(() => {});
        };
        const opts = { passive: true, capture: true };
        ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((evt) => {
            window.addEventListener(evt, onFirstInteraction, opts);
        });
    }

    async function unlock() {
        if (destroyed) return false;
        await ensureManifest();
        ensureAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
            try { await audioCtx.resume(); } catch (err) { warnDebug('AudioContext resume failed', err); }
        }
        unlocked = true;
        preloadConfiguredSounds();
        // Prime key audio elements (best-effort for mobile WebViews)
        baseAudioCache.forEach((audio) => {
            try { audio.load(); } catch (err) {}
        });
        if (currentRoom) startAmbientForRoom(currentRoom);
        logDebug('Audio unlocked');
        return true;
    }

    async function init() {
        if (destroyed) return false;
        if (!initPromise) {
            initPromise = Promise.allSettled([ensureManifest(), ensureCredits()]).then(() => {
                bindUnlockListeners();
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

    function canPlayChannel(channel, opts) {
        if (destroyed) return false;
        if (!state.samplePackEnabled && (channel === 'sfx' || channel === 'ui')) return false;
        if (opts && opts.ignoreMute) return true;
        return effectiveChannelVolume(channel) > 0;
    }

    function cleanupVoice(voice) {
        if (!voice) return;
        activeVoices.delete(voice);
        const player = voice.player;
        if (!player) return;
        try { player.pause(); } catch (err) {}
        try { player.src = ''; } catch (err) {}
    }

    function enforceVoiceLimits(channel) {
        if (activeVoices.size <= MAX_ACTIVE_GLOBAL && countActiveForChannel(channel) <= (MAX_ACTIVE_BY_CHANNEL[channel] || 6)) return;
        const candidates = Array.from(activeVoices)
            .filter((voice) => voice.channel === channel || activeVoices.size > MAX_ACTIVE_GLOBAL)
            .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
        while (activeVoices.size > MAX_ACTIVE_GLOBAL || countActiveForChannel(channel) > (MAX_ACTIVE_BY_CHANNEL[channel] || 6)) {
            const victim = candidates.shift();
            if (!victim) break;
            cleanupVoice(victim);
        }
    }

    function countActiveForChannel(channel) {
        let count = 0;
        activeVoices.forEach((voice) => {
            if (voice.channel === channel) count += 1;
        });
        return count;
    }

    async function playOneShot(soundName, opts) {
        await ensureManifest();
        const entry = resolveSound(soundName);
        if (!entry || !entry.path) {
            warnDebug('Missing sound', soundName);
            return null;
        }
        if (shouldSkipDueToThrottle(soundName, entry, opts)) return null;
        const channel = entry.channel || 'sfx';
        if (!canPlayChannel(channel, opts)) return null;
        if (!unlocked) await unlock();
        const base = getBaseAudioElement(entry.path);
        if (!base) return null;
        const player = createPlayerFromSource(base.currentSrc || entry.path);
        if (!player) return null;

        const baseGain = clamp01(entry.defaultVolume == null ? 1 : entry.defaultVolume);
        const optsGain = clamp01(opts && opts.gain != null ? opts.gain : 1);
        const vol = clamp01(baseGain * optsGain * effectiveChannelVolume(channel));
        player.volume = vol;
        player.loop = false;
        player.currentTime = 0;
        const voice = { name: soundName, channel, player, baseGain: baseGain * optsGain, startedAt: Date.now() };
        activeVoices.add(voice);
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
        await ensureManifest();
        const entry = resolveSound(soundName);
        if (!entry || !entry.path) {
            warnDebug('Missing loop sound', soundName);
            return null;
        }
        if (!canPlayChannel(channel, opts)) {
            stop(channel);
            return null;
        }
        if (!unlocked) await unlock();

        const current = channelLoopPlayers.get(channel);
        if (current && current.name === soundName && !opts?.restart) {
            current.baseGain = clamp01((entry.defaultVolume == null ? 1 : entry.defaultVolume) * (opts?.gain == null ? 1 : opts.gain));
            applyRuntimeGains();
            return current;
        }
        if (current) stop(channel);

        const player = createPlayerFromSource(entry.path);
        if (!player) return null;
        player.loop = opts && typeof opts.loop === 'boolean' ? opts.loop : !!entry.loop || true;
        player.currentTime = 0;
        const voice = {
            name: soundName,
            channel,
            player,
            baseGain: clamp01((entry.defaultVolume == null ? 1 : entry.defaultVolume) * (opts && opts.gain != null ? opts.gain : 1)),
            startedAt: Date.now(),
            loop: true
        };
        channelLoopPlayers.set(channel, voice);
        activeVoices.add(voice);
        applyRuntimeGains();

        const cleanup = () => {
            if (channelLoopPlayers.get(channel) === voice) channelLoopPlayers.delete(channel);
            cleanupVoice(voice);
        };
        player.addEventListener('error', cleanup, { once: true });

        try {
            const p = player.play();
            if (p && typeof p.catch === 'function') {
                p.catch((err) => {
                    cleanup();
                    warnDebug('Loop playback failed', soundName, err && err.message ? err.message : err);
                });
            }
            logDebug('playLoop', channel, soundName, entry.path);
            return voice;
        } catch (err) {
            cleanup();
            warnDebug('Loop playback exception', soundName, err);
            return null;
        }
    }

    function stop(target) {
        if (!target) return;
        const channel = String(target);
        if (CHANNELS.includes(channel)) {
            const loopVoice = channelLoopPlayers.get(channel);
            if (loopVoice) {
                channelLoopPlayers.delete(channel);
                cleanupVoice(loopVoice);
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
                cleanupVoice(voice);
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
        persistSettings();
    }

    function getMuted(channel) {
        if (!CHANNELS.includes(channel)) return false;
        return !!state.muted[channel];
    }

    function playSFX(nameOrToken, opts) {
        const soundName = extractSoundName(nameOrToken);
        return playOneShot(soundName, opts || {});
    }

    function playUI(nameOrAlias, opts) {
        const name = extractSoundName(nameOrAlias) || 'ui-tap-1';
        return playOneShot(name, Object.assign({ ui: true }, opts || {}));
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
        if (resolved) return playOneShot(name, opts || {});
        const fromFallback = extractSoundName(fallback);
        return playOneShot(fromFallback, opts || {});
    }

    function toggle() {
        setMuted('master', !state.muted.master);
        if (!state.muted.master && currentRoom) startAmbientForRoom(currentRoom);
        return !state.muted.master;
    }

    function getEnabled() {
        return !state.muted.master;
    }

    function toggleMusic() {
        setMuted('music', !state.muted.music);
        if (state.muted.music) stop('music');
        return !state.muted.music;
    }

    function getMusicEnabled() {
        return !state.muted.music;
    }

    function setSfxVolumeSetting(value) { setVolume('sfx', value); }
    function getSfxVolumeSetting() { return getVolume('sfx'); }
    function setAmbientVolumeSetting(value) { setVolume('ambient', value); if (!state.muted.ambient && currentRoom) startAmbientForRoom(currentRoom); }
    function getAmbientVolumeSetting() { return getVolume('ambient'); }
    function setMusicVolumeSetting(value) { setVolume('music', value); }
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
        playOneShot(soundName, { gain: opts.gain == null ? 0.8 : opts.gain });
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
        return playOneShot(map[kind] || 'ui-tap-1', options || {});
    }

    function playRewardCue(tier, options) {
        const normalized = String(tier || 'small').toLowerCase();
        if (normalized === 'big' || normalized === 'large') return playOneShot('achievement', options || {});
        if (normalized === 'medium') return playOneShot('reward-treasure', options || {});
        return playOneShot('coin-collect', options || {});
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
        osc.type = opts.type || 'sine';
        osc.frequency.value = Number(opts.frequency || 440);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(Math.max(0.02, Math.min(0.5, Number(opts.gain || 0.18))), now + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
        osc.connect(gain);
        const requestedBus = opts.bus || opts.channel;
        const dest = (requestedBus && getBusInputNode(requestedBus)) ||
            ((opts.channel === 'ui' && webAudioGains.ui) ? webAudioGains.ui : (webAudioGains.gameplay || webAudioGains.sfx || webAudioGains.master || ctx.destination));
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + duration);
        osc.onended = function () {
            try { osc.disconnect(); } catch (err) {}
            try { gain.disconnect(); } catch (err) {}
        };
        return { ok: true };
    }

    function chooseAmbientForRoom(roomId) {
        const id = String(roomId || '').toLowerCase();
        if (id.includes('garden') || id.includes('park') || id.includes('yard') || id.includes('outdoor')) return 'outdoor-garden-ambience';
        if (id.includes('bed') || id.includes('observatory') || id.includes('night') || isNightLocal()) return 'nighttime-ambience';
        return 'cozy-room-ambience';
    }

    function chooseMusicForRoom(roomId) {
        const id = String(roomId || '').toLowerCase();
        if (id.includes('bed') || id.includes('night') || isNightLocal()) return 'pet-theme-night';
        return 'pet-theme-day';
    }

    function isNightLocal() {
        const hour = new Date().getHours();
        return hour < 6 || hour >= 20;
    }

    function startAmbientForRoom(roomId) {
        if (!roomId) return;
        if (state.muted.ambient || state.muted.master) return;
        const ambientName = chooseAmbientForRoom(roomId);
        playAmbient(ambientName, { restart: false, gain: 1 });
    }

    function enterRoom(roomId) {
        currentRoom = roomId || currentRoom;
        if (!currentRoom) return;
        if (!unlocked) return;
        startAmbientForRoom(currentRoom);
        // Do not auto-play music by default to avoid stacking short loops; keep API available.
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
        if (!state.muted.master && currentRoom) startAmbientForRoom(currentRoom);
        return key;
    }

    function previewAudioPreset(presetKey) {
        const key = String(presetKey || '').toLowerCase();
        if (key === 'silent') return { ok: true, muted: true };
        if (key === 'calm') {
            playAmbient(currentRoom ? chooseAmbientForRoom(currentRoom) : 'cozy-room-ambience', { restart: true, gain: 0.7 });
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
        return playMusic(trackName || chooseMusicForRoom(currentRoom || ''), opts || {});
    }

    function stopMusic() {
        stop('music');
    }

    function destroy() {
        destroyed = true;
        stopAll();
        baseAudioCache.forEach((audio) => {
            try { audio.pause(); } catch (err) {}
            try { audio.src = ''; } catch (err) {}
        });
        baseAudioCache.clear();
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

    // Prime async loads early.
    init();

    if (typeof window !== 'undefined') {
        window.GameAudio = api;
        window.addEventListener('pagehide', function () {
            try { api.destroy(); } catch (err) {}
        });
    }
})();
