        // ==================== SOUND MANAGER ====================
        // Global SoundManager for room-specific earcons (ambient audio cues)
        // Uses Web Audio API to generate procedural sounds - no external files needed

        const SoundManager = (() => {
            let audioCtx = null;
            let masterGain = null; // Legacy default SFX route target (defaults to gameplay bus after mixer init)
            let masterBusGain = null;
            let busNodes = null;
            let duckNodes = null;
            let _duckReleaseTimer = null;
            let currentEarcon = null;
            let ambientEngine = null;
            let currentRoom = null;
            let hasInteracted = false;
            let isEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.soundEnabled); return v !== 'false'; } catch (e) { return true; } })();
            let _audioSupported = true; // Item 39: Track Web Audio API support
            let _dynamicSceneTimer = null;
            let _lastResolvedAudioSceneKey = '';
            let _lastResolvedAmbientSceneKey = '';
            let _currentAudioPreset = (() => {
                try { return localStorage.getItem('myLittleFriend_audioPreset') || 'silent'; } catch (e) { return 'silent'; }
            })();
            let _previewRestoreTimer = null;
            let _previewBypassMaster = false;
            const _sampleBufferCache = new Map();
            const _sampleBufferPromises = new Map();
            const _sampleHtmlPool = new Map();
            const _cueRoundRobinIndex = new Map();
            const _cueConcurrency = new Map();
            const _captionChannelState = {
                lastCue: null,
                category: null,
                text: '',
                timestamp: 0
            };

            // Audio upgrade tuning/config (2026 audio pass)
            const AUDIO_UPGRADE_CONFIG = Object.freeze({
                ducking: {
                    ui: { music: 0.86, ambient: 0.8, releaseMs: 280 },
                    accessibility: { music: 0.78, ambient: 0.72, releaseMs: 450 },
                    rewardBig: { music: 0.68, ambient: 0.62, releaseMs: 700 }
                },
                buses: {
                    ui: 0.95,
                    gameplay: 0.92,
                    pet: 0.85,
                    accessibility: 0.95
                },
                samplePlayback: {
                    defaultPitchJitter: 0.025,
                    preloadCues: ['button-tap', 'confirm', 'reward-small', 'reward-medium', 'reward-big', 'error-soft', 'match', 'miss', 'hit', 'coin-jingle'],
                    concurrencyDefault: 4
                },
                ambient: {
                    fadeSeconds: 0.65,
                    densityFloor: 0.35
                },
                music: {
                    barBeats: 4,
                    sceneFadeMs: 420,
                    changePollMs: 3000
                }
            });

            // Item 37: Per-category volume controls (0.0 to 1.0)
            let sfxVolume = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.sfxVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let ambientVolume = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.ambientVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let musicVolumeSetting = (() => { try { const v = parseFloat(localStorage.getItem(STORAGE_KEYS.musicVolume)); return isNaN(v) ? 1.0 : clamp(v, 0, 1); } catch (e) { return 1.0; } })();
            let samplePackEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.samplePackEnabled); return v !== 'false'; } catch (e) { return true; } })();

            const EARCON_VOLUME = GAME_BALANCE.sound.earconVolume; // 30% volume to not interfere with screen readers
            const FADE_DURATION = GAME_BALANCE.sound.fadeDuration; // seconds for fade in/out
            const LOOP_DURATION = GAME_BALANCE.sound.loopDuration; // seconds per loop

            // Optional lightweight sample pack (bundled local assets)
            const SAMPLE_SFX_FILES = {
                feed: 'assets/audio/sfx/feed.wav',
                wash: 'assets/audio/sfx/wash.wav',
                play: 'assets/audio/sfx/play.wav',
                sleep: 'assets/audio/sfx/sleep.wav',
                cuddle: 'assets/audio/sfx/cuddle.wav',
                medicine: 'assets/audio/sfx/medicine.wav',
                groom: 'assets/audio/sfx/groom.wav',
                exercise: 'assets/audio/sfx/exercise.wav',
                treat: 'assets/audio/sfx/treat.wav',
                hit: 'assets/audio/sfx/hit.wav',
                miss: 'assets/audio/sfx/miss.wav',
                celebration: 'assets/audio/sfx/celebration.wav',
                bubblePop: 'assets/audio/sfx/bubblePop.wav',
                match: 'assets/audio/sfx/match.wav',
                catch: 'assets/audio/sfx/catch.wav',
                throw: 'assets/audio/sfx/throw.wav',
                roomTransition: 'assets/audio/sfx/roomTransition.wav',
                petHappy: 'assets/audio/sfx/petHappy.wav',
                petSad: 'assets/audio/sfx/petSad.wav',
                petExcited: 'assets/audio/sfx/petExcited.wav',
                achievement: 'assets/audio/sfx/achievement.wav',
                'menu-open': 'assets/audio/sfx/roomTransition.wav',
                'button-tap': 'assets/audio/sfx/play.wav',
                'reward-pop': 'assets/audio/sfx/achievement.wav',
                'error-soft': 'assets/audio/sfx/miss.wav',
                'coin-jingle': 'assets/audio/sfx/celebration.wav'
            };

            const SAMPLE_MUSIC_TRACKS = {
                day: 'assets/audio/music/cozy_day_loop.wav',
                night: 'assets/audio/music/cozy_night_loop.wav'
            };

            const ACCESSIBILITY_CUES = {
                room: {
                    label: 'Room chime',
                    description: 'Plays when entering a room.',
                    category: 'navigation',
                    sampleName: 'roomTransition',
                    generator: sfxRoomTransition
                },
                error: {
                    label: 'Error',
                    description: 'Plays when an action is unavailable.',
                    category: 'status',
                    sampleName: 'error-soft',
                    generator: sfxMiss
                },
                reward: {
                    label: 'Reward',
                    description: 'Plays when you earn something.',
                    category: 'reward',
                    sampleName: 'reward-pop',
                    generator: sfxCelebration
                },
                countdownDanger: {
                    label: 'Countdown danger',
                    description: 'Warns when time is almost out.',
                    category: 'warning',
                    sampleName: 'warning',
                    generator: sfxUiWarning
                },
                cooldownComplete: {
                    label: 'Cooldown complete',
                    description: 'Signals an action is ready again.',
                    category: 'status',
                    sampleName: 'confirm',
                    generator: sfxUiConfirm
                },
                comboRise: {
                    label: 'Combo rising',
                    description: 'Signals a combo streak is increasing.',
                    category: 'reward',
                    sampleName: 'combo-rise',
                    generator: sfxUiTabSwitch
                },
                objectiveStart: {
                    label: 'Objective start',
                    description: 'Indicates a mini-game or challenge has started.',
                    category: 'objective',
                    sampleName: 'open',
                    generator: sfxUiOpen
                },
                objectiveEnd: {
                    label: 'Objective end',
                    description: 'Indicates a mini-game or challenge has ended.',
                    category: 'objective',
                    sampleName: 'close',
                    generator: sfxUiClose
                },
                focusPlayfield: {
                    label: 'Playfield focus',
                    description: 'Signals focus moved into a gameplay area.',
                    category: 'navigation',
                    sampleName: 'focus',
                    generator: sfxUiFocus
                },
                lowStatUrgency: {
                    label: 'Low-stat urgency',
                    description: 'Warns when your pet needs care soon.',
                    category: 'warning',
                    sampleName: 'warning',
                    generator: sfxUiWarning
                }
            };
            const _captionLastByCue = new Map();

            function getSoundCueCaptionsEnabled() {
                try {
                    return localStorage.getItem(STORAGE_KEYS.soundCueCaptions) === 'true';
                } catch (e) {
                    return false;
                }
            }

            function setSoundCueCaptionsEnabled(enabled) {
                const next = !!enabled;
                try {
                    localStorage.setItem(STORAGE_KEYS.soundCueCaptions, next ? 'true' : 'false');
                } catch (e) {}
                return next;
            }

            function getCaptionChannelState() {
                return {
                    lastCue: _captionChannelState.lastCue,
                    category: _captionChannelState.category,
                    text: _captionChannelState.text,
                    timestamp: _captionChannelState.timestamp
                };
            }

            function emitSoundCueCaption(cueId, force = false, customText) {
                const cue = ACCESSIBILITY_CUES[String(cueId || '').trim()];
                if (!cue) return;
                if (!getSoundCueCaptionsEnabled() && !force) return;
                const now = Date.now();
                const last = _captionLastByCue.get(cueId) || 0;
                if (!force && now - last < 1400) return;
                _captionLastByCue.set(cueId, now);
                const captionText = String(customText || cue.label || '').trim() || 'Sound cue';
                _captionChannelState.lastCue = cueId;
                _captionChannelState.category = cue.category || 'general';
                _captionChannelState.text = captionText;
                _captionChannelState.timestamp = now;
                try {
                    window.dispatchEvent(new CustomEvent('petcare:sound-cue-caption', {
                        detail: {
                            id: cueId,
                            label: cue.label,
                            description: cue.description,
                            category: cue.category || 'general',
                            caption: captionText
                        }
                    }));
                } catch (e) {}
            }

            function inferCueIdFromSfxName(name) {
                const key = String(name || '').trim().toLowerCase();
                if (!key) return null;
                if (key === 'roomtransition' || key === 'menu-open' || key === 'menuopen') return 'room';
                if (key === 'error-soft' || key === 'errorsoft' || key === 'miss' || key === 'disabled') return 'error';
                if (key === 'reward-pop' || key === 'rewardpop' || key === 'celebration' || key === 'achievement' || key === 'coin-jingle' || key === 'coinjingle' || key === 'reward-small' || key === 'reward-medium' || key === 'reward-big' || key === 'reward-milestone') return 'reward';
                if (key === 'warning') return 'countdownDanger';
                if (key === 'combo-rise' || key === 'comborise') return 'comboRise';
                if (key === 'open' || key === 'modal-open') return 'objectiveStart';
                if (key === 'close' || key === 'modal-close') return 'objectiveEnd';
                if (key === 'focus') return 'focusPlayfield';
                return null;
            }

            function createStereoPannerIfSupported(ctx, panValue = 0) {
                if (!ctx || typeof ctx.createStereoPanner !== 'function') return null;
                const panner = ctx.createStereoPanner();
                panner.pan.value = clamp(panValue, -1, 1);
                return panner;
            }

            function initMixerGraph(ctx) {
                if (!ctx || busNodes) return;
                const master = ctx.createGain();
                const masterLimiterInput = ctx.createGain();
                const masterCompressor = ctx.createDynamicsCompressor();
                const masterTrim = ctx.createGain();
                master.gain.value = 1;
                masterLimiterInput.gain.value = 1;
                masterTrim.gain.value = 0.95;

                // Gentle limiter/compressor for clustered UI + reward bursts.
                masterCompressor.threshold.value = -18;
                masterCompressor.knee.value = 18;
                masterCompressor.ratio.value = 2.2;
                masterCompressor.attack.value = 0.006;
                masterCompressor.release.value = 0.18;

                const music = ctx.createGain();
                const ambient = ctx.createGain();
                const sfx = ctx.createGain();
                const ui = ctx.createGain();
                const gameplay = ctx.createGain();
                const pet = ctx.createGain();
                const accessibility = ctx.createGain();

                const musicDuck = ctx.createGain();
                const ambientDuck = ctx.createGain();
                musicDuck.gain.value = 1;
                ambientDuck.gain.value = 1;

                music.connect(musicDuck);
                ambient.connect(ambientDuck);
                musicDuck.connect(master);
                ambientDuck.connect(master);
                sfx.connect(master);

                ui.connect(sfx);
                gameplay.connect(sfx);
                pet.connect(sfx);
                accessibility.connect(sfx);

                master.connect(masterLimiterInput);
                masterLimiterInput.connect(masterCompressor);
                masterCompressor.connect(masterTrim);
                masterTrim.connect(ctx.destination);

                busNodes = { master, music, ambient, sfx, ui, gameplay, pet, accessibility, _trim: masterTrim, _compressor: masterCompressor };
                duckNodes = { music: musicDuck, ambient: ambientDuck };
                masterBusGain = master;
                masterGain = gameplay; // Legacy default route for procedural gameplay SFX
                applyBusGainTargets(true);
            }

            function getBusInputNode(name) {
                const key = String(name || '').trim().toLowerCase();
                if (!busNodes) return null;
                if (!key) return busNodes.gameplay || masterGain;
                if (key === 'master') return busNodes.master;
                if (key === 'music') return busNodes.music;
                if (key === 'ambient') return busNodes.ambient;
                if (key === 'sfx') return busNodes.sfx;
                if (key === 'ui') return busNodes.ui;
                if (key === 'pet') return busNodes.pet;
                if (key === 'accessibility' || key === 'a11y') return busNodes.accessibility;
                return busNodes.gameplay;
            }

            function scheduleGain(node, target, timeConstant = 0.05, immediate = false) {
                if (!audioCtx || !node || !node.gain) return;
                const t = audioCtx.currentTime;
                node.gain.cancelScheduledValues(t);
                if (immediate) {
                    node.gain.setValueAtTime(target, t);
                    return;
                }
                node.gain.setValueAtTime(node.gain.value, t);
                node.gain.setTargetAtTime(target, t, Math.max(0.001, timeConstant));
            }

            function applyBusGainTargets(immediate = false) {
                if (!busNodes) return;
                const masterTarget = (isEnabled || _previewBypassMaster) ? 1 : 0;
                const sfxTarget = (isEnabled || _previewBypassMaster) ? clamp(sfxVolume, 0, 1) : 0;
                const ambientTarget = (isEnabled || _previewBypassMaster) ? clamp(EARCON_VOLUME * ambientVolume, 0, 1) : 0;
                const musicOn = (typeof musicEnabled === 'undefined') ? false : !!musicEnabled;
                const musicTarget = (isEnabled || _previewBypassMaster) && musicOn ? clamp((typeof MUSIC_VOLUME === 'number' ? MUSIC_VOLUME : 0.08) * musicVolumeSetting * 1.45, 0, 1) : 0;
                scheduleGain(busNodes.master, masterTarget, 0.03, immediate);
                scheduleGain(busNodes.sfx, sfxTarget, 0.03, immediate);
                scheduleGain(busNodes.music, musicTarget, 0.08, immediate);
                scheduleGain(busNodes.ambient, ambientTarget, 0.08, immediate);
                scheduleGain(busNodes.ui, AUDIO_UPGRADE_CONFIG.buses.ui, 0.03, immediate);
                scheduleGain(busNodes.gameplay, AUDIO_UPGRADE_CONFIG.buses.gameplay, 0.03, immediate);
                scheduleGain(busNodes.pet, AUDIO_UPGRADE_CONFIG.buses.pet, 0.03, immediate);
                scheduleGain(busNodes.accessibility, AUDIO_UPGRADE_CONFIG.buses.accessibility, 0.03, immediate);
            }

            function applyDuckingProfile(kind) {
                if (!duckNodes || !audioCtx) return;
                const profile = AUDIO_UPGRADE_CONFIG.ducking[kind];
                if (!profile) return;
                const t = audioCtx.currentTime;
                duckNodes.music.gain.cancelScheduledValues(t);
                duckNodes.ambient.gain.cancelScheduledValues(t);
                duckNodes.music.gain.setTargetAtTime(profile.music, t, 0.02);
                duckNodes.ambient.gain.setTargetAtTime(profile.ambient, t, 0.02);
                if (_duckReleaseTimer) clearTimeout(_duckReleaseTimer);
                _duckReleaseTimer = setTimeout(() => {
                    if (!duckNodes || !audioCtx) return;
                    const now = audioCtx.currentTime;
                    duckNodes.music.gain.cancelScheduledValues(now);
                    duckNodes.ambient.gain.cancelScheduledValues(now);
                    duckNodes.music.gain.setTargetAtTime(1, now, 0.09);
                    duckNodes.ambient.gain.setTargetAtTime(1, now, 0.12);
                    _duckReleaseTimer = null;
                }, profile.releaseMs);
            }

            function withLegacySfxRoute(busName, fn) {
                if (typeof fn !== 'function') return;
                const prev = masterGain;
                const target = getBusInputNode(busName) || prev;
                masterGain = target || prev;
                try {
                    return fn();
                } finally {
                    masterGain = prev;
                }
            }

            function startDynamicAudioPolling() {
                if (_dynamicSceneTimer) return;
                _dynamicSceneTimer = setInterval(() => {
                    if (!audioCtx || (!isEnabled && !_previewBypassMaster)) return;
                    refreshAdaptiveAudioScene('poll');
                    refreshAmbientScene('poll');
                }, AUDIO_UPGRADE_CONFIG.music.changePollMs);
            }

            function getContext() {
                if (!_audioSupported) return null;
                if (!audioCtx) {
                    try {
                        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        initMixerGraph(audioCtx);
                        startDynamicAudioPolling();
                        queueFrequentSamplePreload();
                    } catch (e) {
                        console.log('Web Audio API not supported');
                        _audioSupported = false;
                        // Item 39: Show visible message that sound isn't available
                        if (typeof showToast === 'function') {
                            showToast('Sound unavailable: your browser does not support Web Audio.', '#FFA726');
                        }
                        return null;
                    }
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
                if (!busNodes) initMixerGraph(audioCtx);
                return audioCtx;
            }

            // Bathroom: Soft bubbling/water sound
            function createBathroomEarcon(ctx) {
                const loopDuration = LOOP_DURATION;
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let timerId = null;

                function playBubble() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const bubbleGain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    filter.type = 'bandpass';
                    filter.frequency.value = 300 + Math.random() * 400;
                    filter.Q.value = 8;

                    osc.type = 'sine';
                    const baseFreq = 200 + Math.random() * 300;
                    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);

                    bubbleGain.gain.setValueAtTime(0.3, ctx.currentTime);
                    bubbleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc.connect(filter);
                    filter.connect(bubbleGain);
                    bubbleGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    osc.onended = () => { osc.disconnect(); filter.disconnect(); bubbleGain.disconnect(); };

                    if (!stopped) {
                        timerId = setTimeout(playBubble, GAME_BALANCE.sound.bubbleDelayBase + Math.random() * GAME_BALANCE.sound.bubbleDelayVariance);
                    }
                }

                playBubble();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            // Garden: Gentle wind-chime
            function createGardenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let timerId = null;
                const chimeFreqs = [523.25, 587.33, 659.25, 783.99, 880]; // C5, D5, E5, G5, A5

                function playChime() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const chimeGain = ctx.createGain();

                    osc.type = 'sine';
                    const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
                    osc.frequency.value = freq;

                    chimeGain.gain.setValueAtTime(0.2, ctx.currentTime);
                    chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

                    osc.connect(chimeGain);
                    chimeGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 1.3);
                    osc.onended = () => { osc.disconnect(); chimeGain.disconnect(); };

                    if (!stopped) {
                        timerId = setTimeout(playChime, GAME_BALANCE.sound.chimeDelayBase + Math.random() * GAME_BALANCE.sound.chimeDelayVariance);
                    }
                }

                playChime();

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (timerId) { clearTimeout(timerId); timerId = null; }
                    }
                };
            }

            // Kitchen: Subtle ceramic clinking / stove hum
            function createKitchenEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let clinkTimerId = null;
                let initTimerId = null;

                // Constant low stove hum
                const humOsc = ctx.createOscillator();
                const humGain = ctx.createGain();
                const humFilter = ctx.createBiquadFilter();
                humOsc.type = 'sawtooth';
                humOsc.frequency.value = 60;
                humFilter.type = 'lowpass';
                humFilter.frequency.value = 120;
                humGain.gain.value = 0.08;
                humOsc.connect(humFilter);
                humFilter.connect(humGain);
                humGain.connect(gainNode);
                humOsc.start();

                // Occasional ceramic clink
                function playClink() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const clinkGain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();

                    osc.type = 'triangle';
                    const freq = 1800 + Math.random() * 600;
                    osc.frequency.value = freq;

                    filter.type = 'highpass';
                    filter.frequency.value = 1200;

                    clinkGain.gain.setValueAtTime(0.15, ctx.currentTime);
                    clinkGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

                    osc.connect(filter);
                    filter.connect(clinkGain);
                    clinkGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    osc.onended = () => { osc.disconnect(); filter.disconnect(); clinkGain.disconnect(); };

                    if (!stopped) {
                        clinkTimerId = setTimeout(playClink, 2000 + Math.random() * 3000);
                    }
                }

                initTimerId = setTimeout(() => { if (!stopped) playClink(); }, 1000);

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (clinkTimerId) { clearTimeout(clinkTimerId); clinkTimerId = null; }
                        if (initTimerId) { clearTimeout(initTimerId); initTimerId = null; }
                        try { humOsc.stop(); } catch (e) { /* already stopped */ }
                        humOsc.disconnect(); humFilter.disconnect(); humGain.disconnect();
                    }
                };
            }

            // Bedroom: Gentle piano-like ambient with soft pad
            function createBedroomEarcon(ctx) {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let noteTimerId = null;

                // Soft pad drone
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const oscGain = ctx.createGain();

                osc1.type = 'sine';
                osc1.frequency.value = 110;
                osc2.type = 'sine';
                osc2.frequency.value = 165;

                filter.type = 'lowpass';
                filter.frequency.value = 200;

                oscGain.gain.value = 0.04;

                osc1.connect(filter);
                osc2.connect(filter);
                filter.connect(oscGain);
                oscGain.connect(gainNode);

                osc1.start();
                osc2.start();

                // Gentle piano-like notes at random intervals
                const pianoNotes = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3]; // C4-C5 pentatonic
                function playNote() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const noteGain = ctx.createGain();
                    const noteFilter = ctx.createBiquadFilter();

                    osc.type = 'sine';
                    osc.frequency.value = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];

                    noteFilter.type = 'lowpass';
                    noteFilter.frequency.value = 800;

                    noteGain.gain.setValueAtTime(0.06, ctx.currentTime);
                    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);

                    osc.connect(noteFilter);
                    noteFilter.connect(noteGain);
                    noteGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 2.2);
                    osc.onended = () => { osc.disconnect(); noteFilter.disconnect(); noteGain.disconnect(); };

                    if (!stopped) {
                        noteTimerId = setTimeout(playNote, 3000 + Math.random() * 5000);
                    }
                }

                noteTimerId = setTimeout(playNote, 2000);

                return {
                    gainNode,
                    stop() {
                        if (stopped) return;
                        stopped = true;
                        if (noteTimerId) { clearTimeout(noteTimerId); noteTimerId = null; }
                        try { osc1.stop(); osc2.stop(); } catch (e) { /* already stopped */ }
                        osc1.disconnect(); osc2.disconnect(); filter.disconnect(); oscGain.disconnect();
                    }
                };
            }

            // Backyard / Park: Nature sounds - birdsong chirps + gentle wind
            function createOutdoorEarcon(ctx, variant = 'backyard') {
                const gainNode = ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(masterGain);

                let stopped = false;
                let chirpTimerId = null;
                let rustleTimerId = null;

                // Soft wind noise base layer
                const windBuffer = ctx.createBufferSource();
                const windGain = ctx.createGain();
                const windFilter = ctx.createBiquadFilter();
                const bufferSize = ctx.sampleRate * 2;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
                windBuffer.buffer = buffer;
                windBuffer.loop = true;
                windFilter.type = 'lowpass';
                windFilter.frequency.value = 400;
                windGain.gain.value = 0.03;
                windBuffer.connect(windFilter);
                windFilter.connect(windGain);
                windGain.connect(gainNode);
                windBuffer.start();

                // Birdsong chirps
                function playChirp() {
                    if (stopped) return;
                    const osc = ctx.createOscillator();
                    const chirpGain = ctx.createGain();

                    osc.type = 'sine';
                    const baseFreq = variant === 'park'
                        ? (900 + Math.random() * 520)
                        : (1200 + Math.random() * 800);
                    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, ctx.currentTime + 0.12);

                    chirpGain.gain.setValueAtTime(variant === 'park' ? 0.09 : 0.12, ctx.currentTime);
                    chirpGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

                    osc.connect(chirpGain);
                    chirpGain.connect(gainNode);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    osc.onended = () => { osc.disconnect(); chirpGain.disconnect(); };

                    if (!stopped) {
                        const baseGap = variant === 'park' ? 2300 : 1500;
                        const variance = variant === 'park' ? 3600 : 3000;
                        chirpTimerId = setTimeout(playChirp, baseGap + Math.random() * variance);
                    }
                }

                // Occasional leaf rustle
                function playRustle() {
                    if (stopped) return;
                    const rustleBuf = ctx.createBufferSource();
                    const rustleGain = ctx.createGain();
                    const rustleFilter = ctx.createBiquadFilter();
                    const rBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                    const rData = rBuf.getChannelData(0);
                    for (let i = 0; i < rData.length; i++) rData[i] = (Math.random() * 2 - 1);
                    rustleBuf.buffer = rBuf;
                    rustleFilter.type = 'bandpass';
                    rustleFilter.frequency.value = 2000 + Math.random() * 2000;
                    rustleFilter.Q.value = 1;
                    rustleGain.gain.setValueAtTime(0.04, ctx.currentTime);
                    rustleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                    rustleBuf.connect(rustleFilter);
                    rustleFilter.connect(rustleGain);
                    rustleGain.connect(gainNode);
                    rustleBuf.start();
                    rustleBuf.onended = () => { rustleBuf.disconnect(); rustleFilter.disconnect(); rustleGain.disconnect(); };

                    if (!stopped) {
                        const baseGap = variant === 'park' ? 5200 : 4000;
                        const variance = variant === 'park' ? 7000 : 6000;
                        rustleTimerId = setTimeout(playRustle, baseGap + Math.random() * variance);
                    }
                }

                playChirp();
                rustleTimerId = setTimeout(playRustle, 2000);

                return {
                    gainNode,
                    stop() {
                        stopped = true;
                        if (chirpTimerId) { clearTimeout(chirpTimerId); chirpTimerId = null; }
                        if (rustleTimerId) { clearTimeout(rustleTimerId); rustleTimerId = null; }
                        try { windBuffer.stop(); } catch (e) {}
                        windBuffer.disconnect(); windFilter.disconnect(); windGain.disconnect();
                    }
                };
            }

            const earconFactories = {
                bathroom: createBathroomEarcon,
                garden: createGardenEarcon,
                kitchen: createKitchenEarcon,
                bedroom: createBedroomEarcon,
                backyard: (ctx) => createOutdoorEarcon(ctx, 'backyard'),
                park: (ctx) => createOutdoorEarcon(ctx, 'park')
            };

            function playRoomStinger(ctx, roomId) {
                const tones = {
                    bedroom: [329.63, 392.0],
                    kitchen: [440.0, 523.25],
                    bathroom: [523.25, 659.25],
                    backyard: [392.0, 493.88],
                    park: [349.23, 440.0],
                    garden: [493.88, 587.33]
                };
                const seq = tones[roomId];
                if (!seq || !masterGain) return;
                applyDuckingProfile('accessibility');
                withLegacySfxRoute('accessibility', () => {
                    const t0 = ctx.currentTime;
                    seq.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const g = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.value = freq;
                        const st = t0 + idx * 0.08;
                        g.gain.setValueAtTime(0.08, st);
                        g.gain.exponentialRampToValueAtTime(0.01, st + 0.18);
                        osc.connect(g);
                        g.connect(masterGain);
                        osc.start(st);
                        osc.stop(st + 0.2);
                        osc.onended = () => { osc.disconnect(); g.disconnect(); };
                    });
                });
                emitSoundCueCaption('room');
            }

            function fadeIn(gainNode, ctx) {
                gainNode.gain.cancelScheduledValues(ctx.currentTime);
                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(EARCON_VOLUME * ambientVolume, ctx.currentTime + FADE_DURATION);
            }

            function fadeOut(gainNode, ctx) {
                return new Promise(resolve => {
                    gainNode.gain.cancelScheduledValues(ctx.currentTime);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_DURATION);
                    setTimeout(resolve, FADE_DURATION * 1000 + 50);
                });
            }

            function getPetAudioStateProfile() {
                const pet = (typeof gameState !== 'undefined' && gameState && gameState.pet) ? gameState.pet : null;
                if (!pet) {
                    return { mood: 'neutral', distress: 0, recovery: 0.5, lowStats: 0, warmth: 0.5 };
                }
                const stats = ['hunger', 'cleanliness', 'happiness', 'energy'];
                const values = stats.map((k) => clamp(Number(pet[k]) || 0, 0, 100));
                const lowStats = values.filter((v) => v < 28).length;
                const avg = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
                const happiness = clamp(Number(pet.happiness) || avg, 0, 100);
                const distress = clamp((lowStats * 0.22) + ((45 - avg) / 100), 0, 1);
                const recovery = clamp((avg / 100) * 0.75 + (happiness / 100) * 0.25, 0, 1);
                const warmth = clamp((happiness / 100) * 0.7 + recovery * 0.3, 0, 1);
                let mood = 'neutral';
                if (distress > 0.58) mood = 'distressed';
                else if (recovery > 0.72) mood = 'happy';
                else if (recovery < 0.35) mood = 'tired';
                return { mood, distress, recovery, lowStats, warmth };
            }

            function createLoopedNoiseSource(ctx, durationSec = 2) {
                const frames = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
                const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1);
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                src.loop = true;
                return src;
            }

            function ensureAmbientEngine(ctx) {
                if (ambientEngine || !ctx) return ambientEngine;
                const rootGain = ctx.createGain();
                rootGain.gain.value = 1;
                rootGain.connect(getBusInputNode('ambient') || masterGain);

                const baseGain = ctx.createGain();
                const weatherGain = ctx.createGain();
                const timeGain = ctx.createGain();
                const lifeGain = ctx.createGain();
                const tintGain = ctx.createGain();
                [baseGain, weatherGain, timeGain, lifeGain, tintGain].forEach((g) => {
                    g.gain.value = 0;
                    g.connect(rootGain);
                });

                const baseNoise = createLoopedNoiseSource(ctx, 3);
                const baseFilter = ctx.createBiquadFilter();
                baseFilter.type = 'lowpass';
                baseFilter.frequency.value = 380;
                baseNoise.connect(baseFilter);
                baseFilter.connect(baseGain);
                baseNoise.start();

                const weatherNoise = createLoopedNoiseSource(ctx, 2.2);
                const weatherFilter = ctx.createBiquadFilter();
                weatherFilter.type = 'bandpass';
                weatherFilter.frequency.value = 900;
                weatherFilter.Q.value = 0.8;
                const weatherPan = createStereoPannerIfSupported(ctx, -0.08);
                weatherNoise.connect(weatherFilter);
                if (weatherPan) {
                    weatherFilter.connect(weatherPan);
                    weatherPan.connect(weatherGain);
                } else {
                    weatherFilter.connect(weatherGain);
                }
                weatherNoise.start();

                const lifeNoise = createLoopedNoiseSource(ctx, 2.8);
                const lifeFilter = ctx.createBiquadFilter();
                lifeFilter.type = 'bandpass';
                lifeFilter.frequency.value = 1200;
                lifeFilter.Q.value = 0.45;
                const lifePan = createStereoPannerIfSupported(ctx, 0.12);
                lifeNoise.connect(lifeFilter);
                if (lifePan) {
                    lifeFilter.connect(lifePan);
                    lifePan.connect(lifeGain);
                } else {
                    lifeFilter.connect(lifeGain);
                }
                lifeNoise.start();

                const tintOsc = ctx.createOscillator();
                const tintFilter = ctx.createBiquadFilter();
                tintFilter.type = 'lowpass';
                tintFilter.frequency.value = 340;
                tintOsc.type = 'sine';
                tintOsc.frequency.value = 110;
                tintOsc.connect(tintFilter);
                tintFilter.connect(tintGain);
                tintOsc.start();

                ambientEngine = {
                    gainNode: rootGain,
                    layers: { baseGain, weatherGain, timeGain, lifeGain, tintGain },
                    nodes: { baseNoise, baseFilter, weatherNoise, weatherFilter, weatherPan, lifeNoise, lifeFilter, lifePan, tintOsc, tintFilter },
                    scene: null,
                    timers: { time: null, life: null },
                    stop() {
                        Object.values(this.timers || {}).forEach((id) => { if (id) clearTimeout(id); });
                        this.timers = { time: null, life: null };
                        try { baseNoise.stop(); } catch (e) {}
                        try { weatherNoise.stop(); } catch (e) {}
                        try { lifeNoise.stop(); } catch (e) {}
                        try { tintOsc.stop(); } catch (e) {}
                        disconnectNodes(baseNoise, baseFilter, weatherNoise, weatherFilter, weatherPan, lifeNoise, lifeFilter, lifePan, tintOsc, tintFilter, baseGain, weatherGain, timeGain, lifeGain, tintGain, rootGain);
                    }
                };

                function emitTimeAccent() {
                    if (!ambientEngine || !ambientEngine.scene) return;
                    const scene = ambientEngine.scene;
                    const now = ctx.currentTime;
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = scene.timeOfDay === 'night' ? 'triangle' : 'sine';
                    const base = scene.timeOfDay === 'night' ? 740 : 1240;
                    osc.frequency.setValueAtTime(base * (0.94 + Math.random() * 0.12), now);
                    if (scene.timeOfDay === 'night') {
                        osc.frequency.exponentialRampToValueAtTime(base * 0.78, now + 0.18);
                    } else {
                        osc.frequency.exponentialRampToValueAtTime(base * 1.12, now + 0.08);
                    }
                    g.gain.setValueAtTime(0.04 * scene.density, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + (scene.timeOfDay === 'night' ? 0.28 : 0.12));
                    osc.connect(g);
                    g.connect(timeGain);
                    osc.start(now);
                    osc.stop(now + 0.32);
                    cleanupOnEnded(osc, g);
                    const baseGap = scene.timeOfDay === 'night' ? 3400 : 2200;
                    const variance = scene.timeOfDay === 'night' ? 4200 : 2600;
                    ambientEngine.timers.time = setTimeout(emitTimeAccent, baseGap + Math.random() * variance);
                }

                function emitLifeAccent() {
                    if (!ambientEngine || !ambientEngine.scene) return;
                    const scene = ambientEngine.scene;
                    if (!scene.isOutdoor || scene.life <= 0.01) {
                        ambientEngine.timers.life = setTimeout(emitLifeAccent, 3000);
                        return;
                    }
                    const now = ctx.currentTime;
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = 180 + Math.random() * 90;
                    g.gain.setValueAtTime(0.02 * scene.life, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
                    osc.connect(g);
                    g.connect(lifeGain);
                    osc.start(now);
                    osc.stop(now + 0.36);
                    cleanupOnEnded(osc, g);
                    ambientEngine.timers.life = setTimeout(emitLifeAccent, 2400 + Math.random() * 4400);
                }

                emitTimeAccent();
                emitLifeAccent();
                return ambientEngine;
            }

            function resolveAmbientScene(roomId) {
                const gs = (typeof gameState !== 'undefined' && gameState) ? gameState : {};
                const timeOfDay = (gs.timeOfDay || (typeof getTimeOfDay === 'function' ? getTimeOfDay() : 'day') || 'day');
                const weather = gs.weather || 'sunny';
                const season = gs.season || (typeof getCurrentSeason === 'function' ? getCurrentSeason() : 'spring');
                const isOutdoor = ['backyard', 'park', 'garden'].includes(roomId);
                const petAudio = getPetAudioStateProfile();
                const density = clamp(Math.max(AUDIO_UPGRADE_CONFIG.ambient.densityFloor, petAudio.recovery - petAudio.distress * 0.35), 0.2, 1);
                const weatherLevel = weather === 'rainy' ? 0.3 : (weather === 'snowy' ? 0.18 : 0.08);
                const timeLevel = (timeOfDay === 'night') ? 0.17 : ((timeOfDay === 'sunrise') ? 0.12 : 0.1);
                const life = isOutdoor ? clamp((0.12 + petAudio.warmth * 0.18) * density, 0, 0.35) : 0;
                return {
                    roomId,
                    weather,
                    season,
                    timeOfDay,
                    isOutdoor,
                    density,
                    warmth: petAudio.warmth,
                    base: isOutdoor ? 0.16 * density : 0.11 * density,
                    weatherLevel,
                    timeLevel,
                    life
                };
            }

            function refreshAmbientScene(reason) {
                if (!audioCtx || !currentRoom) return;
                const ctx = getContext();
                if (!ctx) return;
                const engine = ensureAmbientEngine(ctx);
                if (!engine) return;
                const scene = resolveAmbientScene(currentRoom);
                const sceneKey = [scene.roomId, scene.weather, scene.timeOfDay, scene.season, Math.round(scene.density * 10)].join('|');
                if (reason !== 'room-change' && sceneKey === _lastResolvedAmbientSceneKey) return;
                _lastResolvedAmbientSceneKey = sceneKey;
                engine.scene = scene;

                const t = ctx.currentTime;
                const fade = AUDIO_UPGRADE_CONFIG.ambient.fadeSeconds;
                const ramps = [
                    [engine.layers.baseGain, scene.base],
                    [engine.layers.weatherGain, scene.weatherLevel * (scene.isOutdoor ? 1 : 0.35)],
                    [engine.layers.timeGain, scene.timeLevel * scene.density],
                    [engine.layers.lifeGain, scene.life],
                    [engine.layers.tintGain, (0.018 + scene.warmth * 0.028) * (scene.isOutdoor ? 0.9 : 1)]
                ];
                ramps.forEach(([node, target]) => {
                    node.gain.cancelScheduledValues(t);
                    node.gain.setValueAtTime(node.gain.value, t);
                    node.gain.linearRampToValueAtTime(target, t + fade);
                });

                if (engine.nodes.baseFilter) {
                    const indoor = !scene.isOutdoor;
                    engine.nodes.baseFilter.frequency.setTargetAtTime(indoor ? (220 + scene.warmth * 200) : (320 + scene.warmth * 280), t, 0.18);
                }
                if (engine.nodes.weatherFilter) {
                    const freq = scene.weather === 'rainy' ? 1400 : (scene.weather === 'snowy' ? 2200 : 900);
                    engine.nodes.weatherFilter.frequency.setTargetAtTime(freq, t, 0.18);
                }
                if (engine.nodes.lifeFilter) {
                    engine.nodes.lifeFilter.frequency.setTargetAtTime(scene.timeOfDay === 'night' ? 750 : 1250, t, 0.2);
                }
                if (engine.nodes.tintOsc) {
                    const roomBase = ({ bedroom: 98, kitchen: 124, bathroom: 156, backyard: 110, park: 92, garden: 132 })[scene.roomId] || 110;
                    engine.nodes.tintOsc.frequency.setTargetAtTime(roomBase + (scene.warmth * 18) - (scene.weather === 'snowy' ? 8 : 0), t, 0.2);
                }
            }

            let _enterRoomSeq = 0;

            async function enterRoom(roomId) {
                if (roomId === currentRoom) return;
                if (!hasInteracted) {
                    currentRoom = roomId;
                    return;
                }

                const ctx = getContext();
                if (!ctx) return;

                const seq = ++_enterRoomSeq;
                // If another enterRoom call arrived while a microtask ran, bail.
                await Promise.resolve();
                if (seq !== _enterRoomSeq) return;
                currentRoom = roomId;
                try {
                    if (!ambientEngine) {
                        ambientEngine = ensureAmbientEngine(ctx);
                        currentEarcon = ambientEngine; // Backward compatibility for existing volume fade hooks
                    }
                    refreshAmbientScene('room-change');
                    playRoomStinger(ctx, roomId);
                } catch (e) {
                    currentEarcon = null;
                    ambientEngine = null;
                    currentRoom = null;
                }
            }

            function stopAll() {
                if (ambientEngine) {
                    const ctx = audioCtx;
                    if (ctx && ambientEngine.gainNode) {
                        ambientEngine.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                        ambientEngine.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                    }
                    ambientEngine.stop();
                    try { ambientEngine.gainNode.disconnect(); } catch (e) {}
                    ambientEngine = null;
                    currentEarcon = null;
                } else if (currentEarcon) {
                    const ctx = audioCtx;
                    if (ctx) {
                        currentEarcon.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                        currentEarcon.gainNode.gain.setValueAtTime(0, ctx.currentTime);
                    }
                    currentEarcon.stop();
                    try { currentEarcon.gainNode.disconnect(); } catch (e) {}
                    currentEarcon = null;
                }
                currentRoom = null;
            }

            let _lastRoomBeforeDisable = null;
            function toggle() {
                isEnabled = !isEnabled;
                if (!isEnabled) {
                    _lastRoomBeforeDisable = currentRoom;
                    stopAll();
                    applyBusGainTargets();
                } else {
                    // Re-enter the current room to restore earcons after re-enabling
                    const roomToRestore = currentRoom || _lastRoomBeforeDisable || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                    _lastRoomBeforeDisable = null;
                    applyBusGainTargets();
                    if (roomToRestore) {
                        currentRoom = null;
                        enterRoom(roomToRestore);
                    }
                }
                try { localStorage.setItem(STORAGE_KEYS.soundEnabled, isEnabled ? 'true' : 'false'); } catch (e) {}
                return isEnabled;
            }

            function getEnabled() {
                return isEnabled;
            }

            function clampVolumeSetting(value) {
                const n = parseFloat(value);
                if (isNaN(n)) return 1.0;
                return clamp(n, 0, 1);
            }

            function setSfxVolumeSetting(value) {
                sfxVolume = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.sfxVolume, String(sfxVolume)); } catch (e) {}
                applyBusGainTargets();
                return sfxVolume;
            }

            function getSfxVolumeSetting() {
                return sfxVolume;
            }

            function setAmbientVolumeSetting(value) {
                ambientVolume = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.ambientVolume, String(ambientVolume)); } catch (e) {}
                applyBusGainTargets();
                if (audioCtx && currentEarcon && currentEarcon.gainNode && currentEarcon !== ambientEngine) {
                    const target = EARCON_VOLUME * ambientVolume;
                    currentEarcon.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                    currentEarcon.gainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.08);
                }
                return ambientVolume;
            }

            function getAmbientVolumeSetting() {
                return ambientVolume;
            }

            function setMusicVolumeSetting(value) {
                musicVolumeSetting = clampVolumeSetting(value);
                try { localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolumeSetting)); } catch (e) {}
                applyBusGainTargets();
                if (currentSampleMusic) {
                    currentSampleMusic.volume = clamp(MUSIC_VOLUME * musicVolumeSetting * 2.8, 0, 1);
                }
                if (audioCtx && currentMusicLoop && currentMusicLoop.gainNode && currentMusicLoop !== musicEngine) {
                    const target = MUSIC_VOLUME * musicVolumeSetting;
                    currentMusicLoop.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                    currentMusicLoop.gainNode.gain.setTargetAtTime(target, audioCtx.currentTime, 0.12);
                }
                return musicVolumeSetting;
            }

            function getMusicVolumeSetting() {
                return musicVolumeSetting;
            }

            // Initialize audio context on first user interaction
            function initOnInteraction() {
                const handler = () => {
                    document.removeEventListener('click', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', handler);
                    hasInteracted = true;
                    getContext();
                    if (isEnabled && currentRoom) {
                        const roomToRestore = currentRoom;
                        currentRoom = null;
                        enterRoom(roomToRestore);
                    }
                };
                document.addEventListener('click', handler);
                document.addEventListener('touchstart', handler);
                document.addEventListener('keydown', handler);
            }

            function hasUserInteracted() {
                return hasInteracted;
            }

            // ==================== ACTION SOUND EFFECTS ====================
            // Short procedural tones for gameplay interactions

            // Item 37: SFX volume respects per-category setting
            const SFX_BASE_VOLUME = 0.3;
            function getSfxVolume() { return SFX_BASE_VOLUME * sfxVolume; }

            function getSfxNameFromGenerator(generator) {
                if (generator === sfxFeed) return 'feed';
                if (generator === sfxWash) return 'wash';
                if (generator === sfxPlay) return 'play';
                if (generator === sfxSleep) return 'sleep';
                if (generator === sfxCuddle) return 'cuddle';
                if (generator === sfxMedicine) return 'medicine';
                if (generator === sfxGroom) return 'groom';
                if (generator === sfxExercise) return 'exercise';
                if (generator === sfxTreat) return 'treat';
                if (generator === sfxHit) return 'hit';
                if (generator === sfxMiss) return 'miss';
                if (generator === sfxCelebration) return 'celebration';
                if (generator === sfxBubblePop) return 'bubblePop';
                if (generator === sfxMatch) return 'match';
                if (generator === sfxCatch) return 'catch';
                if (generator === sfxThrow) return 'throw';
                if (generator === sfxRoomTransition) return 'roomTransition';
                if (generator === sfxAchievement) return 'achievement';
                return null;
            }

            function normalizeCueKey(name) {
                return String(name || '').trim();
            }

            function inferSfxBusByName(name) {
                const key = String(name || '').trim().toLowerCase();
                if (!key) return 'gameplay';
                if (['button-tap', 'menu-open', 'confirm', 'back', 'open', 'close', 'disabled', 'warning', 'tab-switch', 'modal-open', 'modal-close', 'focus'].includes(key)) return 'ui';
                if (key.startsWith('pet')) return 'pet';
                if (['roomtransition', 'room', 'accessibility', 'combo-rise'].includes(key)) return 'accessibility';
                return 'gameplay';
            }

            function resolveCuePlaybackSpec(name, proceduralFallback) {
                const key = normalizeCueKey(name);
                const lower = key.toLowerCase();
                const base = {
                    key,
                    bus: inferSfxBusByName(lower),
                    variants: [],
                    pitchJitter: AUDIO_UPGRADE_CONFIG.samplePlayback.defaultPitchJitter,
                    concurrency: AUDIO_UPGRADE_CONFIG.samplePlayback.concurrencyDefault,
                    duckKind: null,
                    cueId: inferCueIdFromSfxName(lower),
                    proceduralFallback: proceduralFallback || null
                };

                const alias = {
                    'confirm': ['play', 'treat'],
                    'back': ['sleep'],
                    'open': ['roomTransition'],
                    'close': ['sleep'],
                    'disabled': ['miss'],
                    'warning': ['miss'],
                    'tab-switch': ['match', 'play'],
                    'modal-open': ['roomTransition'],
                    'modal-close': ['sleep'],
                    'focus': ['play'],
                    'reward-small': ['bubblePop', 'match', 'treat'],
                    'reward-medium': ['celebration', 'match', 'play'],
                    'reward-big': ['achievement', 'celebration'],
                    'reward-milestone': ['achievement'],
                    'combo-rise': ['match', 'play'],
                    'combo-resolve': ['celebration'],
                    'reward-pop': ['bubblePop', 'achievement', 'celebration'],
                    'coin-jingle': ['celebration', 'match']
                };
                const aliasVariants = alias[lower];
                if (aliasVariants) {
                    base.variants = aliasVariants.map((variantKey) => SAMPLE_SFX_FILES[variantKey]).filter(Boolean);
                } else if (SAMPLE_SFX_FILES[key]) {
                    base.variants = [SAMPLE_SFX_FILES[key]];
                } else if (SAMPLE_SFX_FILES[lower]) {
                    base.variants = [SAMPLE_SFX_FILES[lower]];
                }

                if (lower.startsWith('reward-') || lower === 'achievement' || lower === 'celebration' || lower === 'coin-jingle') {
                    base.bus = 'gameplay';
                    if (lower === 'reward-big' || lower === 'reward-milestone' || lower === 'achievement') base.duckKind = 'rewardBig';
                    if (lower === 'reward-small') base.concurrency = 6;
                    if (lower === 'reward-medium') base.concurrency = 4;
                    if (lower === 'reward-big' || lower === 'reward-milestone') base.concurrency = 2;
                } else if (base.bus === 'ui') {
                    base.duckKind = 'ui';
                    base.concurrency = 5;
                } else if (base.bus === 'accessibility') {
                    base.duckKind = 'accessibility';
                    base.concurrency = 2;
                }

                return base;
            }

            function getNextVariantForCue(cueKey, variants) {
                if (!Array.isArray(variants) || variants.length === 0) return null;
                const idx = _cueRoundRobinIndex.get(cueKey) || 0;
                _cueRoundRobinIndex.set(cueKey, (idx + 1) % variants.length);
                return variants[idx % variants.length];
            }

            function canPlayCueByConcurrency(cueKey, limit) {
                const count = _cueConcurrency.get(cueKey) || 0;
                if (count >= Math.max(1, limit || 1)) return false;
                _cueConcurrency.set(cueKey, count + 1);
                return true;
            }

            function releaseCueConcurrencyLater(cueKey, releaseMs = 220) {
                setTimeout(() => {
                    const next = Math.max(0, (_cueConcurrency.get(cueKey) || 0) - 1);
                    if (next <= 0) _cueConcurrency.delete(cueKey);
                    else _cueConcurrency.set(cueKey, next);
                }, releaseMs);
            }

            function getHtmlAudioPoolEntry(src) {
                let pool = _sampleHtmlPool.get(src);
                if (!pool) {
                    pool = [];
                    _sampleHtmlPool.set(src, pool);
                }
                const available = pool.find((el) => el.paused || el.ended);
                if (available) {
                    try { available.currentTime = 0; } catch (e) {}
                    return available;
                }
                const el = new Audio(src);
                el.preload = 'auto';
                pool.push(el);
                return el;
            }

            function loadSampleBuffer(src) {
                if (!src) return Promise.resolve(null);
                if (_sampleBufferCache.has(src)) return Promise.resolve(_sampleBufferCache.get(src));
                if (_sampleBufferPromises.has(src)) return _sampleBufferPromises.get(src);
                const ctx = getContext();
                if (!ctx) return Promise.resolve(null);
                const promise = fetch(src)
                    .then((res) => (res && res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res && res.status}`))))
                    .then((arr) => new Promise((resolve, reject) => {
                        ctx.decodeAudioData(arr.slice(0), (buf) => resolve(buf), (err) => reject(err || new Error('decode-failed')));
                    }))
                    .then((buffer) => {
                        _sampleBufferCache.set(src, buffer);
                        _sampleBufferPromises.delete(src);
                        return buffer;
                    })
                    .catch(() => {
                        _sampleBufferPromises.delete(src);
                        return null;
                    });
                _sampleBufferPromises.set(src, promise);
                return promise;
            }

            function queueFrequentSamplePreload() {
                if (!samplePackEnabled) return;
                const ctx = getContext();
                if (!ctx) return;
                AUDIO_UPGRADE_CONFIG.samplePlayback.preloadCues.forEach((cue) => {
                    const spec = resolveCuePlaybackSpec(cue, null);
                    (spec.variants || []).slice(0, 2).forEach((src) => { loadSampleBuffer(src); });
                });
            }

            function playBufferOnBus(buffer, spec) {
                const ctx = getContext();
                if (!ctx || !buffer || !spec) return false;
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const gain = ctx.createGain();
                const targetBus = getBusInputNode(spec.bus) || masterGain;
                gain.gain.value = clamp(spec.gain || 1, 0, 1);
                source.playbackRate.value = Math.max(0.88, Math.min(1.16, 1 + ((Math.random() - 0.5) * 2 * (spec.pitchJitter || 0))));
                source.connect(gain);
                gain.connect(targetBus);
                cleanupOnEnded(source, gain);
                try {
                    source.start();
                    return true;
                } catch (e) {
                    disconnectNodes(source, gain);
                    return false;
                }
            }

            function playPooledHtmlSample(src, spec) {
                if (!src) return false;
                try {
                    const el = getHtmlAudioPoolEntry(src);
                    el.volume = clamp((spec && spec.gain ? spec.gain : 1) * getSfxVolume(), 0, 1);
                    el.playbackRate = Math.max(0.9, Math.min(1.1, 1 + ((Math.random() - 0.5) * 0.04)));
                    const maybePromise = el.play();
                    if (maybePromise && typeof maybePromise.catch === 'function') maybePromise.catch(() => {});
                    return true;
                } catch (e) {
                    return false;
                }
            }

            function playSampleSFXByName(name, proceduralFallback, options = {}) {
                const spec = resolveCuePlaybackSpec(name, proceduralFallback);
                const cueKey = spec.key || String(name || 'unknown');
                if (!samplePackEnabled || (!isEnabled && !_previewBypassMaster)) return false;
                if (!spec.variants || spec.variants.length === 0) return false;
                if (!canPlayCueByConcurrency(cueKey, spec.concurrency)) return false;

                const selectedSrc = getNextVariantForCue(cueKey, spec.variants);
                const targetGain = clamp(options.gain || 1, 0, 1);
                if (spec.duckKind) applyDuckingProfile(spec.duckKind);
                releaseCueConcurrencyLater(cueKey, 260);

                const ctx = getContext();
                if (!ctx) {
                    return playPooledHtmlSample(selectedSrc, { gain: targetGain });
                }
                const cached = _sampleBufferCache.get(selectedSrc);
                if (cached) {
                    return playBufferOnBus(cached, { ...spec, gain: targetGain });
                }
                loadSampleBuffer(selectedSrc).then((buffer) => {
                    if (!buffer) {
                        if (typeof proceduralFallback === 'function') proceduralFallback();
                        return;
                    }
                    playBufferOnBus(buffer, { ...spec, gain: targetGain });
                });
                // Loading is async; report queued playback as handled to avoid extra fallback spam.
                return true;
            }

            function playProceduralSFX(generator, options = {}) {
                if (typeof generator !== 'function') return;
                const allowPreview = !!options.allowPreview;
                if (!isEnabled && !allowPreview && !_previewBypassMaster) return;
                if (!_audioSupported) return;
                const ctx = getContext();
                if (!ctx) return;
                const bus = options.bus || 'gameplay';
                if (options.duckKind) applyDuckingProfile(options.duckKind);
                const invoke = () => withLegacySfxRoute(bus, () => {
                    try { generator(ctx); } catch (e) {}
                });
                if (ctx.state === 'suspended') {
                    ctx.resume().then(invoke).catch(() => {});
                    return;
                }
                invoke();
            }

            function playRewardCue(tier = 'small', options = {}) {
                const normalized = String(tier || 'small').toLowerCase();
                let cueName = 'reward-small';
                if (normalized === 'medium') cueName = 'reward-medium';
                else if (normalized === 'big') cueName = 'reward-big';
                else if (normalized === 'milestone' || normalized === 'achievement') cueName = 'reward-milestone';
                if (normalized === 'big') applyDuckingProfile('rewardBig');
                if (normalized === 'milestone' || normalized === 'achievement') applyDuckingProfile('rewardBig');
                playSFXByName(cueName, (normalized === 'small') ? sfxBubblePop : (normalized === 'medium' ? sfxCelebration : sfxAchievement), options);
                if (normalized === 'medium') triggerMusicRewardLayer(1);
                if (normalized === 'big') triggerMusicRewardLayer(2);
                if (normalized === 'milestone' || normalized === 'achievement') triggerMusicRewardLayer(3);
                const comboCount = Math.max(0, Number(options.comboCount) || 0);
                if (comboCount >= 3 && comboCount % 3 === 0) {
                    playSFXByName('combo-rise', sfxUiTabSwitch, { gain: 0.7 });
                    emitSoundCueCaption('comboRise');
                    if (comboCount >= 9) applyDuckingProfile('rewardBig');
                }
            }

            function playUiCue(name, options = {}) {
                const map = {
                    confirm: sfxUiConfirm,
                    back: sfxUiBack,
                    open: sfxUiOpen,
                    close: sfxUiClose,
                    disabled: sfxUiDisabled,
                    error: sfxUiDisabled,
                    warning: sfxUiWarning,
                    focus: sfxUiFocus,
                    'tab-switch': sfxUiTabSwitch
                };
                const key = String(name || 'confirm');
                const fallback = map[key] || sfxUiConfirm;
                playSFXByName(key, fallback, options);
            }

            function playSFX(generator) {
                const sfxName = getSfxNameFromGenerator(generator);
                const spec = resolveCuePlaybackSpec(sfxName, generator);
                if (sfxName && playSampleSFXByName(sfxName, () => playProceduralSFX(generator, { bus: spec.bus, duckKind: spec.duckKind }), { gain: 1 })) {
                    if (spec.cueId) emitSoundCueCaption(spec.cueId);
                    return;
                }
                playProceduralSFX(generator, { bus: spec.bus, duckKind: spec.duckKind });
                if (spec.cueId) emitSoundCueCaption(spec.cueId);
            }

            function playSFXByName(name, generator, options = {}) {
                const key = normalizeCueKey(name);
                const lower = key.toLowerCase();
                if (lower === 'reward-pop') return playRewardCue('small', options);
                if (lower === 'coin-jingle') return playRewardCue('medium', options);
                if (lower === 'achievement') return playRewardCue('milestone', options);
                if (lower === 'button-tap') return playUiCue('confirm', { gain: 0.8, ...options });
                if (lower === 'menu-open') return playUiCue('open', { gain: 0.9, ...options });

                const spec = resolveCuePlaybackSpec(key || getSfxNameFromGenerator(generator), generator);
                const proceduralFallback = () => playProceduralSFX(generator, { bus: spec.bus, duckKind: spec.duckKind, allowPreview: !!options.allowPreview });
                if (key && playSampleSFXByName(key, proceduralFallback, { gain: options.gain || 1 })) {
                    if (spec.cueId) emitSoundCueCaption(spec.cueId);
                    return;
                }
                proceduralFallback();
                if (spec.cueId) emitSoundCueCaption(spec.cueId);
            }

            function emitAccessibilityCue(cueId, options = {}) {
                const id = String(cueId || '').trim();
                const cue = ACCESSIBILITY_CUES[id];
                if (!cue) return { ok: false, reason: 'unknown-cue' };
                emitSoundCueCaption(id, !!options.forceCaption, options.caption);
                if (options.playSound === false) return { ok: true, label: cue.label, captionOnly: true };
                if (!isEnabled && !_previewBypassMaster) return { ok: true, label: cue.label, silent: true };
                playSFXByName(cue.sampleName, cue.generator, { gain: options.gain || 1 });
                return { ok: true, label: cue.label };
            }

            function getAccessibilityCueLegend() {
                return Object.entries(ACCESSIBILITY_CUES).map(([id, cue]) => ({
                    id,
                    label: cue.label,
                    description: cue.description,
                    category: cue.category || 'general'
                }));
            }

            function playAccessibilityCue(cueId) {
                const normalizedCueId = String(cueId || '').trim();
                const cue = ACCESSIBILITY_CUES[normalizedCueId];
                if (!cue) return { ok: false, reason: 'unknown-cue' };
                hasInteracted = true;
                const ctx = getContext();
                if (!ctx) {
                    emitSoundCueCaption(normalizedCueId, true);
                    return { ok: false, reason: 'audio-unavailable', label: cue.label };
                }
                if (!isEnabled) {
                    emitSoundCueCaption(normalizedCueId, true);
                    return { ok: false, reason: 'sound-disabled', label: cue.label };
                }
                emitAccessibilityCue(normalizedCueId, { playSound: true, forceCaption: true });
                return { ok: true, label: cue.label };
            }

            // Pitch variation helper: randomize frequency by +/- 5%
            function varyPitch(freq) {
                return freq * (1 + (Math.random() - 0.5) * 0.1);
            }

            // Timing variation helper: randomize timing by +/- 10%
            function varyTiming(t) {
                return t * (1 + (Math.random() - 0.5) * 0.2);
            }

            function disconnectNodes(...nodes) {
                nodes.forEach((node) => {
                    if (!node || typeof node.disconnect !== 'function') return;
                    try { node.disconnect(); } catch (e) {}
                });
            }

            function cleanupOnEnded(sourceNode, ...nodes) {
                if (!sourceNode) return;
                sourceNode.onended = () => disconnectNodes(sourceNode, ...nodes);
            }

            // Dedicated UI earcon palette (routes to ui bus via playSFXByName/playUiCue)
            function sfxUiFocus(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(720, t);
                osc.frequency.exponentialRampToValueAtTime(920, t + 0.05);
                g.gain.setValueAtTime(getSfxVolume() * 0.18, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.connect(g); g.connect(masterGain);
                osc.start(t); osc.stop(t + 0.1);
                cleanupOnEnded(osc, g);
            }

            function sfxUiConfirm(ctx) {
                const t = ctx.currentTime;
                [660, 990].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.18, t + i * 0.05);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.11);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t + i * 0.05);
                    osc.stop(t + i * 0.13);
                    cleanupOnEnded(osc, g);
                });
            }

            function sfxUiBack(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(780, t);
                osc.frequency.exponentialRampToValueAtTime(430, t + 0.12);
                g.gain.setValueAtTime(getSfxVolume() * 0.16, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.connect(g); g.connect(masterGain);
                osc.start(t); osc.stop(t + 0.16);
                cleanupOnEnded(osc, g);
            }

            function sfxUiOpen(ctx) {
                const t = ctx.currentTime;
                [420, 620, 840].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.14, t + i * 0.04);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.04 + 0.14);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t + i * 0.04);
                    osc.stop(t + i * 0.17);
                    cleanupOnEnded(osc, g);
                });
            }

            function sfxUiClose(ctx) {
                const t = ctx.currentTime;
                [840, 560, 360].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.12, t + i * 0.03);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.03 + 0.1);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t + i * 0.03);
                    osc.stop(t + i * 0.12);
                    cleanupOnEnded(osc, g);
                });
            }

            function sfxUiDisabled(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = 180;
                g.gain.setValueAtTime(getSfxVolume() * 0.12, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                osc.connect(g); g.connect(masterGain);
                osc.start(t); osc.stop(t + 0.14);
                cleanupOnEnded(osc, g);
            }

            function sfxUiWarning(ctx) {
                const t = ctx.currentTime;
                [560, 440].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.14, t + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.12);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.16);
                    cleanupOnEnded(osc, g);
                });
            }

            function sfxUiTabSwitch(ctx) {
                const t = ctx.currentTime;
                [520, 780].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = varyPitch(freq);
                    g.gain.setValueAtTime(getSfxVolume() * 0.15, t + i * 0.035);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.035 + 0.1);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t + i * 0.035);
                    osc.stop(t + i * 0.12);
                    cleanupOnEnded(osc, g);
                });
            }

            // Feed: warm ascending "nom nom" two-note
            function sfxFeed(ctx) {
                const t = ctx.currentTime;
                [330, 440].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.12);
                    g.gain.setValueAtTime(getSfxVolume(), t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.1);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.12);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Wash: bubbly swish — fast frequency sweep
            function sfxWash(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(varyPitch(300), t);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(800), t + 0.15);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(400), t + 0.3);
                filter.type = 'bandpass';
                filter.frequency.value = varyPitch(600);
                filter.Q.value = 2;
                g.gain.setValueAtTime(getSfxVolume(), t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
                osc.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.4);
                osc.onended = () => { osc.disconnect(); filter.disconnect(); g.disconnect(); };
            }

            // Play: happy bouncy three-note arpeggio
            function sfxPlay(ctx) {
                const t = ctx.currentTime;
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.08);
                    g.gain.setValueAtTime(getSfxVolume() * 0.8, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.12);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.15);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Sleep: gentle descending lullaby tone
            function sfxSleep(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(varyPitch(440), t);
                osc.frequency.exponentialRampToValueAtTime(varyPitch(220), t + 0.5);
                g.gain.setValueAtTime(getSfxVolume() * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.65);
                osc.onended = () => { osc.disconnect(); g.disconnect(); };
            }

            // Cuddle/Pet: soft warm purr-like tone
            function sfxCuddle(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = varyPitch(260);
                lfo.type = 'sine';
                lfo.frequency.value = varyPitch(20);
                lfoGain.gain.value = 15;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                g.gain.setValueAtTime(getSfxVolume() * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.connect(g);
                g.connect(masterGain);
                lfo.start(t);
                osc.start(t);
                osc.stop(t + 0.45);
                lfo.stop(t + 0.45);
                osc.onended = () => { osc.disconnect(); g.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
            }

            // Medicine: healing chime
            function sfxMedicine(ctx) {
                const t = ctx.currentTime;
                [660, 880, 1100].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    g.gain.setValueAtTime(getSfxVolume() * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.25);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.3);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Groom: gentle brush strokes — filtered noise bursts
            function sfxGroom(ctx) {
                const t = ctx.currentTime;
                for (let i = 0; i < 3; i++) {
                    const bufferSize = ctx.sampleRate * 0.08;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = varyPitch(2000 + i * 500);
                    filter.Q.value = 1;
                    const g = ctx.createGain();
                    const offset = varyTiming(0.1);
                    g.gain.setValueAtTime(getSfxVolume() * 0.4, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.08);
                    src.connect(filter);
                    filter.connect(g);
                    g.connect(masterGain);
                    src.start(t + i * offset);
                    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
                }
            }

            // Exercise: energetic quick burst
            function sfxExercise(ctx) {
                const t = ctx.currentTime;
                [392, 494, 587, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.06);
                    g.gain.setValueAtTime(getSfxVolume() * 0.3, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.08);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.1);
                    osc.onended = () => { osc.disconnect(); g.disconnect(); };
                });
            }

            // Treat: delightful sparkle tone
            function sfxTreat(ctx) {
                const t = ctx.currentTime;
                [880, 1100, 1320, 1760].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = varyPitch(freq);
                    const offset = varyTiming(0.06);
                    g.gain.setValueAtTime(getSfxVolume() * 0.5, t + i * offset);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * offset + 0.15);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * offset);
                    osc.stop(t + i * offset + 0.2);
                    cleanupOnEnded(osc, g);
                });
            }

            // Minigame hit/success: quick bright ping
            function sfxHit(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
                g.gain.setValueAtTime(getSfxVolume(), t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.15);
                cleanupOnEnded(osc, g);
            }

            // Minigame miss: short low buzz
            function sfxMiss(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 180;
                g.gain.setValueAtTime(getSfxVolume() * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
                cleanupOnEnded(osc, g);
            }

            // Celebration: triumphant fanfare
            function sfxCelebration(ctx) {
                const t = ctx.currentTime;
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.7, t + i * 0.12);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.3);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.12);
                    osc.stop(t + i * 0.12 + 0.35);
                    cleanupOnEnded(osc, g);
                });
                // Final sustained chord
                [1047, 1320, 1568].forEach(freq => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.4, t + 0.48);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + 0.48);
                    osc.stop(t + 1.3);
                    cleanupOnEnded(osc, g);
                });
            }

            // Bubble pop: short bubbly pop
            function sfxBubblePop(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                const freq = 400 + Math.random() * 300;
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.04);
                g.gain.setValueAtTime(getSfxVolume() * 0.6, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.1);
                cleanupOnEnded(osc, g);
            }

            // Match found: satisfying pair chime
            function sfxMatch(ctx) {
                const t = ctx.currentTime;
                [660, 880].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.6, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.25);
                    cleanupOnEnded(osc, g);
                });
            }

            // Fetch catch: bouncy catch sound
            function sfxCatch(ctx) {
                const t = ctx.currentTime;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
                osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
                g.gain.setValueAtTime(getSfxVolume() * 0.7, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
                cleanupOnEnded(osc, g);
            }

            // Room transition: soft whoosh/chime cue when switching rooms
            function sfxRoomTransition(ctx) {
                const t = ctx.currentTime;
                // Soft filtered noise whoosh
                const bufferSize = ctx.sampleRate * 0.25;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
                filter.frequency.exponentialRampToValueAtTime(600, t + 0.25);
                filter.Q.value = 1.5;
                const g = ctx.createGain();
                g.gain.setValueAtTime(getSfxVolume() * 0.25, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
                cleanupOnEnded(src, filter, g);
                // Soft chime overtone
                const osc = ctx.createOscillator();
                const og = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                og.gain.setValueAtTime(getSfxVolume() * 0.15, t + 0.05);
                og.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.connect(og);
                og.connect(masterGain);
                osc.start(t + 0.05);
                osc.stop(t + 0.35);
                cleanupOnEnded(osc, og);
            }

            // Pet voice: happy chirp (varies by pet type category)
            function sfxPetHappy(ctx, petType) {
                const t = ctx.currentTime;
                const petMood = getPetAudioStateProfile();
                const pitchMult = petMood.mood === 'happy' ? 1.06 : (petMood.mood === 'distressed' ? 0.94 : 1);
                const energyMult = clamp(0.8 + petMood.recovery * 0.4, 0.65, 1.15);
                const typeConfig = {
                    dog: { freqs: [400, 550, 650], wave: 'sawtooth', duration: 0.12 },
                    cat: { freqs: [500, 650], wave: 'sine', duration: 0.2 },
                    bunny: { freqs: [600, 800, 700], wave: 'sine', duration: 0.1 },
                    bird: { freqs: [1000, 1300, 1200, 1400], wave: 'sine', duration: 0.08 },
                    hamster: { freqs: [800, 1000, 900], wave: 'triangle', duration: 0.08 },
                    turtle: { freqs: [200, 250], wave: 'sine', duration: 0.25 },
                    fish: { freqs: [300, 500, 400], wave: 'sine', duration: 0.1 },
                    frog: { freqs: [250, 400, 250], wave: 'square', duration: 0.1 },
                    hedgehog: { freqs: [600, 750, 650], wave: 'triangle', duration: 0.1 },
                    panda: { freqs: [300, 400, 350], wave: 'sine', duration: 0.15 },
                    penguin: { freqs: [450, 600, 500], wave: 'triangle', duration: 0.12 },
                    unicorn: { freqs: [700, 900, 1100, 900], wave: 'sine', duration: 0.12 },
                    dragon: { freqs: [200, 300, 250], wave: 'sawtooth', duration: 0.15 }
                };
                const config = typeConfig[petType] || typeConfig.dog;
                config.freqs.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = config.wave;
                    osc.frequency.value = freq * pitchMult * (0.95 + Math.random() * 0.1);
                    g.gain.setValueAtTime(getSfxVolume() * 0.28 * energyMult, t + i * config.duration);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * config.duration + config.duration * 0.9);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * config.duration);
                    osc.stop(t + i * config.duration + config.duration);
                    cleanupOnEnded(osc, g);
                });
            }

            // Pet voice: sad whimper
            function sfxPetSad(ctx, petType) {
                const t = ctx.currentTime;
                const petMood = getPetAudioStateProfile();
                const baseFreq = (petType === 'bird' ? 600 : petType === 'dragon' ? 150 : 300) * (petMood.distress > 0.5 ? 0.9 : 1);
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoG = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, t);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.4);
                lfo.type = 'sine';
                lfo.frequency.value = 5 + petMood.distress * 2;
                lfoG.gain.value = 20;
                lfo.connect(lfoG);
                lfoG.connect(osc.frequency);
                g.gain.setValueAtTime(getSfxVolume() * (0.2 + petMood.distress * 0.14), t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                osc.connect(g);
                g.connect(masterGain);
                lfo.start(t);
                osc.start(t);
                osc.stop(t + 0.55);
                lfo.stop(t + 0.55);
                cleanupOnEnded(osc, g, lfo, lfoG);
            }

            // Pet voice: excited playful sound
            function sfxPetExcited(ctx, petType) {
                const t = ctx.currentTime;
                const petMood = getPetAudioStateProfile();
                const base = (petType === 'bird' ? 900 : petType === 'dragon' ? 250 : petType === 'cat' ? 500 : 400) * (1 + petMood.recovery * 0.08);
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'triangle';
                    const freq = base + i * (base * 0.15);
                    osc.frequency.setValueAtTime(freq, t + i * 0.08);
                    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + i * 0.08 + 0.06);
                    g.gain.setValueAtTime(getSfxVolume() * (0.24 + petMood.recovery * 0.12), t + i * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.08);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.1);
                    cleanupOnEnded(osc, g);
                }
            }

            // Achievement unlock fanfare
            function sfxAchievement(ctx) {
                const t = ctx.currentTime;
                const notes = [659, 784, 988, 1319];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    g.gain.setValueAtTime(getSfxVolume() * 0.5, t + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t + i * 0.1);
                    osc.stop(t + i * 0.1 + 0.35);
                    cleanupOnEnded(osc, g);
                });
            }

            // Throw: whoosh sound
            function sfxThrow(ctx) {
                const t = ctx.currentTime;
                const bufferSize = ctx.sampleRate * 0.2;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(500, t);
                filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
                filter.Q.value = 2;
                const g = ctx.createGain();
                g.gain.setValueAtTime(getSfxVolume() * 0.4, t);
                g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                src.connect(filter);
                filter.connect(g);
                g.connect(masterGain);
                src.start(t);
                cleanupOnEnded(src, filter, g);
            }

            // ==================== BACKGROUND MUSIC ====================
            // Procedural pentatonic melody via Web Audio API
            // Adapts to room and time of day for ambient atmosphere

            const MUSIC_VOLUME = 0.08; // Base music bus trim; final level is controlled by music bus + scene layers
            let musicEnabled = (() => { try { const v = localStorage.getItem(STORAGE_KEYS.musicEnabled); return v !== 'false'; } catch (e) { return true; } })();
            let currentMusicLoop = null; // legacy alias now points at musicEngine
            let currentSampleMusic = null;
            let musicEngine = null;

            // Pentatonic scales (mood-matched)
            const MUSIC_SCALES = {
                calm:      [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3], // C major pentatonic + octave
                cozy:      [220.0, 246.9, 293.7, 329.6, 392.0, 440.0, 493.9], // A minor pentatonic
                bright:    [329.6, 370.0, 440.0, 493.9, 587.3, 659.3],         // E major pentatonic
                dreamy:    [196.0, 220.0, 261.6, 293.7, 329.6, 392.0]          // G major pentatonic lower
            };

            const ROOM_MUSIC_MOOD = {
                bedroom: 'cozy', kitchen: 'bright', bathroom: 'calm',
                backyard: 'bright', park: 'bright', garden: 'calm'
            };

            const TIME_MUSIC_MOOD = {
                day: null, night: 'dreamy', sunset: 'cozy', sunrise: 'calm'
            };

            function getMusicScale(roomId, timeOfDay) {
                const timeMood = TIME_MUSIC_MOOD[timeOfDay];
                if (timeMood) return MUSIC_SCALES[timeMood];
                const roomMood = ROOM_MUSIC_MOOD[roomId] || 'calm';
                return MUSIC_SCALES[roomMood];
            }

            function getMusicTempo(timeOfDay) {
                if (timeOfDay === 'night' || timeOfDay === 'sunset') return 2200; // ms between notes (slower)
                if (timeOfDay === 'sunrise') return 1800;
                return 1600; // day
            }

            function getSampleMusicTrack(roomId, timeOfDay) {
                if (timeOfDay === 'night' || timeOfDay === 'sunset') return SAMPLE_MUSIC_TRACKS.night;
                return SAMPLE_MUSIC_TRACKS.day;
            }

            function stopSampleMusic() {
                if (!currentSampleMusic) return;
                const el = currentSampleMusic;
                currentSampleMusic = null;
                try {
                    el.pause();
                    el.currentTime = 0;
                    el.src = '';
                } catch (e) {}
            }

            function startSampleMusic(roomId, timeOfDay) {
                if (!samplePackEnabled || !musicEnabled || !isEnabled) return false;
                const src = getSampleMusicTrack(roomId, timeOfDay);
                if (!src) return false;

                stopSampleMusic();
                try {
                    const el = new Audio(src);
                    el.loop = true;
                    el.preload = 'auto';
                    el.volume = clamp(MUSIC_VOLUME * musicVolumeSetting * 2.8, 0, 1);
                    currentSampleMusic = el;
                    const maybePromise = el.play();
                    if (maybePromise && typeof maybePromise.catch === 'function') {
                        maybePromise.catch(() => {
                            if (currentSampleMusic === el) currentSampleMusic = null;
                        });
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            }

            function detectAudioMode() {
                if (document.querySelector('.settings-overlay') || document.querySelector('.minigame-menu-overlay')) return 'menu';
                if (document.querySelector('.rhythm-game-overlay, .simonsays-game-overlay, .exp-game-shell, .minigame-menu-overlay')) return 'minigame';
                return 'idle';
            }

            function resolveMusicScene(roomId, explicitTimeOfDay) {
                const gs = (typeof gameState !== 'undefined' && gameState) ? gameState : {};
                const timeOfDay = explicitTimeOfDay || gs.timeOfDay || (typeof getTimeOfDay === 'function' ? getTimeOfDay() : 'day') || 'day';
                const weather = gs.weather || 'sunny';
                const season = gs.season || (typeof getCurrentSeason === 'function' ? getCurrentSeason() : 'spring');
                const petState = getPetAudioStateProfile();
                const mode = detectAudioMode();
                const urgency = clamp(petState.lowStats * 0.2 + petState.distress * 0.6, 0, 1);
                const scale = getMusicScale(roomId, timeOfDay);
                const baseBpm = (timeOfDay === 'night') ? 64 : ((timeOfDay === 'sunset' || timeOfDay === 'sunrise') ? 70 : 78);
                const bpm = clamp(baseBpm + (mode === 'minigame' ? 12 : 0) + (urgency > 0.5 ? 4 : 0), 56, 108);
                const brightness = clamp(
                    (timeOfDay === 'night' ? 0.35 : 0.65) +
                    (weather === 'snowy' ? 0.12 : 0) -
                    (weather === 'rainy' ? 0.1 : 0) +
                    (petState.warmth - 0.5) * 0.3,
                    0.2,
                    0.95
                );
                const melodyGain = clamp((mode === 'menu' ? 0.1 : 0.2) + petState.recovery * 0.35 - petState.distress * 0.2, 0.04, 0.55);
                const pulseGain = clamp((mode === 'minigame' ? 0.28 : 0.12) + urgency * 0.18, 0.06, 0.42);
                const rewardBedGain = clamp(0.02 + petState.recovery * 0.08, 0.01, 0.14);
                const tintFreq = ({ bedroom: 220, kitchen: 277, bathroom: 196, backyard: 247, park: 174, garden: 233 })[roomId] || 220;
                return {
                    roomId,
                    timeOfDay,
                    weather,
                    season,
                    mode,
                    petMood: petState.mood,
                    urgency,
                    bpm,
                    scale,
                    brightness,
                    layerTargets: {
                        base: clamp(0.16 + (weather === 'rainy' ? 0.03 : 0) - urgency * 0.04, 0.08, 0.24),
                        pulse: pulseGain,
                        melody: melodyGain,
                        reward: rewardBedGain
                    },
                    tintFreq: tintFreq + (weather === 'snowy' ? 8 : 0) - (weather === 'rainy' ? 12 : 0),
                    key: [roomId, timeOfDay, weather, season, mode, petState.mood, Math.round(urgency * 10)].join('|')
                };
            }

            function ensureMusicEngine(ctx) {
                if (musicEngine || !ctx) return musicEngine;
                const rootGain = ctx.createGain();
                rootGain.gain.value = 1;
                rootGain.connect(getBusInputNode('music') || masterGain);

                const baseGain = ctx.createGain();
                const pulseGain = ctx.createGain();
                const melodyGain = ctx.createGain();
                const rewardGain = ctx.createGain();
                const tintGain = ctx.createGain();
                [baseGain, pulseGain, melodyGain, rewardGain, tintGain].forEach((g) => {
                    g.gain.value = 0;
                    g.connect(rootGain);
                });

                const baseFilter = ctx.createBiquadFilter();
                baseFilter.type = 'lowpass';
                baseFilter.frequency.value = 520;
                const baseOscA = ctx.createOscillator();
                const baseOscB = ctx.createOscillator();
                baseOscA.type = 'sine';
                baseOscB.type = 'triangle';
                baseOscA.frequency.value = 110;
                baseOscB.frequency.value = 165;
                baseOscA.connect(baseFilter);
                baseOscB.connect(baseFilter);
                baseFilter.connect(baseGain);
                baseOscA.start();
                baseOscB.start();

                const tintOsc = ctx.createOscillator();
                const tintFilter = ctx.createBiquadFilter();
                tintFilter.type = 'lowpass';
                tintFilter.frequency.value = 420;
                tintOsc.type = 'sine';
                tintOsc.frequency.value = 220;
                tintOsc.connect(tintFilter);
                tintFilter.connect(tintGain);
                tintOsc.start();

                musicEngine = {
                    gainNode: rootGain,
                    layers: { baseGain, pulseGain, melodyGain, rewardGain, tintGain },
                    nodes: { baseFilter, baseOscA, baseOscB, tintOsc, tintFilter },
                    scene: null,
                    pulseTimer: null,
                    melodyTimer: null,
                    sceneTimer: null,
                    anchorMs: performance.now(),
                    lastMelodyIndex: -1,
                    stop() {
                        if (this.pulseTimer) clearTimeout(this.pulseTimer);
                        if (this.melodyTimer) clearTimeout(this.melodyTimer);
                        if (this.sceneTimer) clearTimeout(this.sceneTimer);
                        try { baseOscA.stop(); } catch (e) {}
                        try { baseOscB.stop(); } catch (e) {}
                        try { tintOsc.stop(); } catch (e) {}
                        disconnectNodes(baseOscA, baseOscB, baseFilter, tintOsc, tintFilter, baseGain, pulseGain, melodyGain, rewardGain, tintGain, rootGain);
                    }
                };

                function schedulePulse() {
                    if (!musicEngine) return;
                    const scene = musicEngine.scene;
                    const bpm = scene ? scene.bpm : 72;
                    const beatMs = 60000 / Math.max(40, bpm);
                    const beatIndex = Math.floor((performance.now() - musicEngine.anchorMs) / beatMs);
                    const accent = beatIndex % AUDIO_UPGRADE_CONFIG.music.barBeats === 0;
                    if (scene && scene.layerTargets && scene.layerTargets.pulse > 0.001) {
                        const t = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const g = ctx.createGain();
                        osc.type = accent ? 'triangle' : 'sine';
                        osc.frequency.value = accent ? 92 : 82;
                        g.gain.setValueAtTime((accent ? 0.07 : 0.045), t);
                        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                        osc.connect(g);
                        g.connect(pulseGain);
                        osc.start(t);
                        osc.stop(t + 0.13);
                        cleanupOnEnded(osc, g);
                    }
                    musicEngine.pulseTimer = setTimeout(schedulePulse, beatMs);
                }

                function scheduleMelody() {
                    if (!musicEngine) return;
                    const scene = musicEngine.scene;
                    const bpm = scene ? scene.bpm : 72;
                    const beatMs = 60000 / Math.max(40, bpm);
                    const intervalMs = Math.round(beatMs * (Math.random() < 0.65 ? 2 : 1));
                    if (scene && scene.scale && scene.layerTargets && scene.layerTargets.melody > 0.01 && Math.random() > (0.2 + scene.urgency * 0.15)) {
                        let noteIdx = Math.floor(Math.random() * scene.scale.length);
                        if (musicEngine.lastMelodyIndex >= 0 && Math.random() < 0.72) {
                            const dir = Math.random() < 0.5 ? -1 : 1;
                            noteIdx = clamp(musicEngine.lastMelodyIndex + dir, 0, scene.scale.length - 1);
                        }
                        musicEngine.lastMelodyIndex = noteIdx;
                        const baseFreq = scene.scale[noteIdx];
                        const t = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const g = ctx.createGain();
                        const f = ctx.createBiquadFilter();
                        osc.type = (scene.timeOfDay === 'night') ? 'sine' : 'triangle';
                        osc.frequency.value = baseFreq * (0.99 + Math.random() * 0.02);
                        f.type = 'lowpass';
                        f.frequency.value = 500 + scene.brightness * 900;
                        g.gain.setValueAtTime(0.06 + scene.brightness * 0.03, t);
                        g.gain.exponentialRampToValueAtTime(0.001, t + (intervalMs / 1000) * 0.55);
                        osc.connect(f); f.connect(g); g.connect(melodyGain);
                        osc.start(t);
                        osc.stop(t + (intervalMs / 1000) * 0.6);
                        cleanupOnEnded(osc, g, f);
                        if (Math.random() < 0.2 && noteIdx + 2 < scene.scale.length) {
                            const h = ctx.createOscillator();
                            const hg = ctx.createGain();
                            h.type = 'sine';
                            h.frequency.value = scene.scale[noteIdx + 2];
                            hg.gain.setValueAtTime(0.02, t + 0.02);
                            hg.gain.exponentialRampToValueAtTime(0.001, t + (intervalMs / 1000) * 0.45);
                            h.connect(hg); hg.connect(melodyGain);
                            h.start(t + 0.02);
                            h.stop(t + (intervalMs / 1000) * 0.48);
                            cleanupOnEnded(h, hg);
                        }
                    }
                    musicEngine.melodyTimer = setTimeout(scheduleMelody, intervalMs);
                }

                schedulePulse();
                scheduleMelody();
                currentMusicLoop = musicEngine;
                return musicEngine;
            }

            function applyMusicSceneNow(scene) {
                if (!musicEngine || !audioCtx || !scene) return;
                musicEngine.scene = scene;
                const t = audioCtx.currentTime;
                const fadeSec = Math.max(0.15, AUDIO_UPGRADE_CONFIG.music.sceneFadeMs / 1000);
                const layerMap = [
                    [musicEngine.layers.baseGain, scene.layerTargets.base],
                    [musicEngine.layers.pulseGain, scene.layerTargets.pulse],
                    [musicEngine.layers.melodyGain, scene.layerTargets.melody],
                    [musicEngine.layers.rewardGain, scene.layerTargets.reward],
                    [musicEngine.layers.tintGain, 0.018 + scene.brightness * 0.024]
                ];
                layerMap.forEach(([node, target]) => {
                    node.gain.cancelScheduledValues(t);
                    node.gain.setValueAtTime(node.gain.value, t);
                    node.gain.linearRampToValueAtTime(target, t + fadeSec);
                });
                musicEngine.nodes.baseFilter.frequency.setTargetAtTime(240 + scene.brightness * 980, t, 0.22);
                musicEngine.nodes.tintOsc.frequency.setTargetAtTime(scene.tintFreq, t, 0.25);
                musicEngine.nodes.tintFilter.frequency.setTargetAtTime(240 + scene.brightness * 420, t, 0.25);
                musicEngine.nodes.baseOscA.frequency.setTargetAtTime(scene.scale[0] / 2, t, 0.25);
                musicEngine.nodes.baseOscB.frequency.setTargetAtTime((scene.scale[2] || scene.scale[1] || scene.scale[0]) / 2, t, 0.25);
            }

            function scheduleMusicSceneApply(scene, reason) {
                if (!musicEngine || !scene) return;
                if (musicEngine.sceneTimer) {
                    clearTimeout(musicEngine.sceneTimer);
                    musicEngine.sceneTimer = null;
                }
                const bpm = scene.bpm || 72;
                const beatMs = 60000 / Math.max(40, bpm);
                const barMs = beatMs * AUDIO_UPGRADE_CONFIG.music.barBeats;
                const now = performance.now();
                const elapsed = now - musicEngine.anchorMs;
                const nextBarIn = Math.max(24, barMs - (elapsed % barMs));
                const delay = (reason === 'immediate' || !musicEngine.scene) ? 0 : Math.min(nextBarIn, 850);
                musicEngine.sceneTimer = setTimeout(() => {
                    if (!musicEngine) return;
                    applyMusicSceneNow(scene);
                    musicEngine.sceneTimer = null;
                }, delay);
            }

            function refreshAdaptiveAudioScene(reason = 'manual', roomIdOverride, timeOverride) {
                const roomId = roomIdOverride || currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                if (!roomId) return;
                if (!musicEnabled) return;
                if (!_audioSupported) {
                    startSampleMusic(roomId, timeOverride || ((typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day'));
                    return;
                }
                const ctx = getContext();
                if (!ctx) return;
                stopSampleMusic();
                ensureMusicEngine(ctx);
                if (musicEngine && musicEngine.gainNode) {
                    musicEngine.gainNode.gain.cancelScheduledValues(ctx.currentTime);
                    musicEngine.gainNode.gain.setValueAtTime(musicEngine.gainNode.gain.value, ctx.currentTime);
                    musicEngine.gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.2);
                }
                const scene = resolveMusicScene(roomId, timeOverride);
                if (!scene) return;
                if (reason !== 'room-change' && scene.key === _lastResolvedAudioSceneKey) return;
                _lastResolvedAudioSceneKey = scene.key;
                scheduleMusicSceneApply(scene, reason === 'room-change' ? 'bar' : reason);
                applyBusGainTargets();
            }

            function triggerMusicRewardLayer(level = 1) {
                if (!musicEngine || !audioCtx) return;
                const t = audioCtx.currentTime;
                const rewardGain = musicEngine.layers.rewardGain;
                const burst = clamp(0.05 + (Number(level) || 1) * 0.03, 0.05, 0.18);
                rewardGain.gain.cancelScheduledValues(t);
                rewardGain.gain.setValueAtTime(Math.max(rewardGain.gain.value, burst), t);
                rewardGain.gain.exponentialRampToValueAtTime((musicEngine.scene && musicEngine.scene.layerTargets ? musicEngine.scene.layerTargets.reward : 0.02), t + 1.2);
                const notes = (musicEngine.scene && musicEngine.scene.scale ? musicEngine.scene.scale : MUSIC_SCALES.calm).slice(2, 6);
                [0, 0.08, 0.16].forEach((offset, idx) => {
                    const osc = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = notes[(idx + Math.floor(Math.random() * Math.max(1, notes.length))) % notes.length];
                    g.gain.setValueAtTime(0.04 + burst * 0.2, t + offset);
                    g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.22);
                    osc.connect(g); g.connect(rewardGain);
                    osc.start(t + offset); osc.stop(t + offset + 0.24);
                    cleanupOnEnded(osc, g);
                });
            }

            function startMusic(roomId, timeOfDay) {
                if (!musicEnabled) return;
                refreshAdaptiveAudioScene('manual', roomId, timeOfDay);
            }

            function stopMusic() {
                stopSampleMusic();
                if (musicEngine && audioCtx) {
                    const t = audioCtx.currentTime;
                    musicEngine.gainNode.gain.cancelScheduledValues(t);
                    musicEngine.gainNode.gain.setValueAtTime(musicEngine.gainNode.gain.value, t);
                    musicEngine.gainNode.gain.linearRampToValueAtTime(0, t + 0.5);
                }
                applyBusGainTargets();
            }

            function toggleMusic() {
                musicEnabled = !musicEnabled;
                if (!musicEnabled) {
                    stopMusic();
                } else {
                    // Use gameState.currentRoom as fallback since currentRoom may be null if sound is off
                    const room = currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom) || null;
                    if (room) {
                        const timeOfDay = (typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day';
                        startMusic(room, timeOfDay);
                    }
                }
                applyBusGainTargets();
                try { localStorage.setItem(STORAGE_KEYS.musicEnabled, musicEnabled ? 'true' : 'false'); } catch (e) {}
                return musicEnabled;
            }

            function getMusicEnabled() { return musicEnabled; }

            function setSamplePackEnabled(enabled) {
                const next = !!enabled;
                if (samplePackEnabled === next) return samplePackEnabled;
                samplePackEnabled = next;
                try { localStorage.setItem(STORAGE_KEYS.samplePackEnabled, samplePackEnabled ? 'true' : 'false'); } catch (e) {}

                if (!samplePackEnabled) {
                    stopSampleMusic();
                }
                queueFrequentSamplePreload();
                return samplePackEnabled;
            }

            function toggleSamplePack() {
                return setSamplePackEnabled(!samplePackEnabled);
            }

            function getSamplePackEnabled() {
                return samplePackEnabled;
            }

            // Extend enterRoom to refresh adaptive music scene without hard restarts
            const _origEnterRoom = enterRoom;
            async function enterRoomWithMusic(roomId) {
                await _origEnterRoom(roomId);
                if (currentRoom !== roomId) return;
                if (musicEnabled && roomId) {
                    const timeOfDay = (typeof getTimeOfDay === 'function') ? getTimeOfDay() : 'day';
                    refreshAdaptiveAudioScene('room-change', roomId, timeOfDay);
                }
            }

            function destroy() {
                stopAll();
                stopMusic();
                if (_dynamicSceneTimer) { clearInterval(_dynamicSceneTimer); _dynamicSceneTimer = null; }
                if (_duckReleaseTimer) { clearTimeout(_duckReleaseTimer); _duckReleaseTimer = null; }
                if (_previewRestoreTimer) { clearTimeout(_previewRestoreTimer); _previewRestoreTimer = null; }
                if (musicEngine) {
                    musicEngine.stop();
                    musicEngine = null;
                    currentMusicLoop = null;
                }
                if (audioCtx) {
                    audioCtx.close().catch(() => {});
                    audioCtx = null;
                    masterGain = null;
                    masterBusGain = null;
                    busNodes = null;
                    duckNodes = null;
                }
            }

            function playMiniGameTone(options = {}) {
                const ctx = getContext();
                if (!ctx) return false;
                if (!isEnabled && !_previewBypassMaster) return false;
                const bus = getBusInputNode(options.bus || 'gameplay') || masterGain;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const type = String(options.type || 'sine');
                const durationSec = clamp((Number(options.durationMs) || 120) / 1000, 0.03, 1.2);
                const now = ctx.currentTime;
                osc.type = ['sine', 'triangle', 'square', 'sawtooth'].includes(type) ? type : 'sine';
                osc.frequency.setValueAtTime(Math.max(40, Number(options.frequency) || 440), now);
                if (Number.isFinite(options.frequencyEnd)) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(40, Number(options.frequencyEnd)), now + Math.max(0.01, durationSec * 0.85));
                }
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(clamp(Number(options.gain) || 0.18, 0.01, 0.9), now + Math.min(0.02, durationSec * 0.2));
                gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
                osc.connect(gain);
                gain.connect(bus);
                osc.start(now);
                osc.stop(now + durationSec + 0.02);
                cleanupOnEnded(osc, gain);
                if (options.duckKind) applyDuckingProfile(options.duckKind);
                return true;
            }

            function getAudioPresetConfig(id) {
                const presets = {
                    silent: { soundEnabled: false, musicEnabled: false, samplePackEnabled: false, sfx: 0.35, ambient: 0.25, music: 0.25, label: 'Silent' },
                    calm: { soundEnabled: true, musicEnabled: true, samplePackEnabled: true, sfx: 0.32, ambient: 0.34, music: 0.28, label: 'Calm' },
                    standard: { soundEnabled: true, musicEnabled: true, samplePackEnabled: true, sfx: 0.7, ambient: 0.62, music: 0.58, label: 'Standard' }
                };
                return presets[String(id || '').toLowerCase()] || presets.silent;
            }

            function applyAudioPreset(presetId, options = {}) {
                const presetKey = String(presetId || 'silent').toLowerCase();
                const preset = getAudioPresetConfig(presetKey);
                const persist = options.persist !== false;
                isEnabled = !!preset.soundEnabled;
                musicEnabled = !!preset.musicEnabled;
                samplePackEnabled = !!preset.samplePackEnabled;
                sfxVolume = clamp(Number(preset.sfx), 0, 1);
                ambientVolume = clamp(Number(preset.ambient), 0, 1);
                musicVolumeSetting = clamp(Number(preset.music), 0, 1);
                _currentAudioPreset = presetKey;

                if (persist) {
                    try { localStorage.setItem(STORAGE_KEYS.soundEnabled, isEnabled ? 'true' : 'false'); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.musicEnabled, musicEnabled ? 'true' : 'false'); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.samplePackEnabled, samplePackEnabled ? 'true' : 'false'); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.sfxVolume, String(sfxVolume)); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.ambientVolume, String(ambientVolume)); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolumeSetting)); } catch (e) {}
                    try { localStorage.setItem('myLittleFriend_audioPreset', presetKey); } catch (e) {}
                }

                hasInteracted = hasInteracted || !!options.preview;
                applyBusGainTargets();
                if (!isEnabled || !musicEnabled) {
                    stopSampleMusic();
                    if (musicEngine && audioCtx) {
                        musicEngine.gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                    }
                }
                if (isEnabled && currentRoom) {
                    refreshAmbientScene('preset');
                }
                if (musicEnabled && (currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom))) {
                    refreshAdaptiveAudioScene('preset');
                }
                return { id: presetKey, label: preset.label };
            }

            function previewAudioPreset(presetId) {
                const snapshot = {
                    isEnabled,
                    musicEnabled,
                    samplePackEnabled,
                    sfxVolume,
                    ambientVolume,
                    musicVolumeSetting,
                    preset: _currentAudioPreset,
                    previewBypass: _previewBypassMaster
                };
                if (_previewRestoreTimer) clearTimeout(_previewRestoreTimer);
                _previewBypassMaster = true;
                const result = applyAudioPreset(presetId, { persist: false, preview: true });
                const ctx = getContext();
                if (!ctx) return { ok: false, reason: 'audio-unavailable' };
                const room = currentRoom || (typeof gameState !== 'undefined' && gameState.currentRoom) || 'bedroom';
                currentRoom = room;
                refreshAmbientScene('preview');
                refreshAdaptiveAudioScene('preview', room);
                setTimeout(() => {
                    playUiCue('confirm', { gain: 0.75, allowPreview: true });
                    playMiniGameTone({ bus: 'ui', type: 'sine', frequency: 660, frequencyEnd: 880, durationMs: 120, gain: 0.12, duckKind: 'ui' });
                }, 20);
                setTimeout(() => {
                    playRewardCue(presetId === 'silent' ? 'small' : (presetId === 'calm' ? 'medium' : 'big'));
                }, 280);
                _previewRestoreTimer = setTimeout(() => {
                    isEnabled = snapshot.isEnabled;
                    musicEnabled = snapshot.musicEnabled;
                    samplePackEnabled = snapshot.samplePackEnabled;
                    sfxVolume = snapshot.sfxVolume;
                    ambientVolume = snapshot.ambientVolume;
                    musicVolumeSetting = snapshot.musicVolumeSetting;
                    _currentAudioPreset = snapshot.preset;
                    _previewBypassMaster = snapshot.previewBypass;
                    applyBusGainTargets();
                    if (currentRoom) {
                        refreshAmbientScene('restore');
                        refreshAdaptiveAudioScene('restore', currentRoom);
                    }
                    _previewRestoreTimer = null;
                }, 1500);
                return { ok: true, preset: result };
            }

            function getAudioPreset() {
                return _currentAudioPreset;
            }

            function getMasterGain() {
                return masterBusGain || masterGain;
            }

            return {
                enterRoom: enterRoomWithMusic,
                stopAll,
                toggle,
                getEnabled,
                getContext,
                getMasterGain,
                getBusInputNode,
                hasUserInteracted,
                initOnInteraction,
                setSfxVolumeSetting,
                getSfxVolumeSetting,
                setAmbientVolumeSetting,
                getAmbientVolumeSetting,
                setMusicVolumeSetting,
                getMusicVolumeSetting,
                playSFX,
                playSFXByName,
                playUiCue,
                playRewardCue,
                playMiniGameTone,
                destroy,
                startMusic,
                stopMusic,
                toggleMusic,
                getMusicEnabled,
                toggleSamplePack,
                getSamplePackEnabled,
                getAccessibilityCueLegend,
                playAccessibilityCue,
                emitAccessibilityCue,
                getCaptionChannelState,
                getSoundCueCaptionsEnabled,
                setSoundCueCaptionsEnabled,
                applyAudioPreset,
                previewAudioPreset,
                getAudioPreset,
                sfx: {
                    feed: sfxFeed,
                    wash: sfxWash,
                    play: sfxPlay,
                    sleep: sfxSleep,
                    cuddle: sfxCuddle,
                    medicine: sfxMedicine,
                    groom: sfxGroom,
                    exercise: sfxExercise,
                    treat: sfxTreat,
                    hit: sfxHit,
                    miss: sfxMiss,
                    celebration: sfxCelebration,
                    bubblePop: sfxBubblePop,
                    match: sfxMatch,
                    catch: sfxCatch,
                    throw: sfxThrow,
                    roomTransition: sfxRoomTransition,
                    petHappy: sfxPetHappy,
                    petSad: sfxPetSad,
                    petExcited: sfxPetExcited,
                    achievement: sfxAchievement,
                    menuOpen: sfxUiOpen,
                    buttonTap: sfxUiConfirm,
                    rewardPop: sfxBubblePop,
                    errorSoft: sfxUiDisabled,
                    coinJingle: sfxCelebration,
                    uiFocus: sfxUiFocus,
                    uiConfirm: sfxUiConfirm,
                    uiBack: sfxUiBack,
                    uiOpen: sfxUiOpen,
                    uiClose: sfxUiClose,
                    uiDisabled: sfxUiDisabled,
                    uiWarning: sfxUiWarning,
                    uiTabSwitch: sfxUiTabSwitch
                }
            };
        })();

        // Initialize sound on first interaction
        SoundManager.initOnInteraction();

        // Clean up AudioContext on page unload to prevent context leak on hot reload
        window.addEventListener('pagehide', () => { SoundManager.destroy(); });
