// Changelog (Retention pass): Added auto-use streak freeze setting, reminder opt-in copy, and updated Quick Start checklist to Daily/Codex/Expedition onboarding.
// ============================================================
// ui/settings.js  --  Settings panel, accessibility, low stat
//                     warnings, keyboard shortcuts, button press
//                     feedback, text size restore, loading
//                     indicator, coach checklist
// Extracted from ui.js (lines 8686-9340)
// ============================================================

	        // ==================== SETTINGS MODAL ====================
	        let _settingsModalUiRestore = null;
            const COSMETIC_THEME_DEFINITIONS = Object.freeze({
                default: { id: 'default', label: 'Default', emoji: '🎨' },
                cozy: { id: 'cozy', label: 'Cozy', emoji: '🧣' },
                seasonal: { id: 'seasonal', label: 'Seasonal', emoji: '🍂' }
            });

        function captureSettingsPreferenceSnapshot() {
            const getStorage = (key) => {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            };
	            return {
	                theme: document.documentElement.getAttribute('data-theme') || '',
                    cosmeticTheme: document.documentElement.getAttribute('data-cosmetic-theme') || 'default',
	                textSize: document.documentElement.getAttribute('data-text-size') || '',
                reducedMotion: document.documentElement.getAttribute('data-reduced-motion') === 'true',
                calmMode: document.documentElement.getAttribute('data-calm-mode') === 'true' || (document.body && document.body.classList.contains('calm-mode')),
                highContrast: document.documentElement.getAttribute('data-high-contrast') === 'true',
                srVerbosity: getStorage(STORAGE_KEYS.srVerbosity) || 'brief',
                hapticOff: getStorage(STORAGE_KEYS.hapticOff) === 'true',
                ttsOff: getStorage(STORAGE_KEYS.ttsOff) === 'true',
                soundCueCaptions: getStorage(STORAGE_KEYS.soundCueCaptions) === 'true',
                soundEnabled: (typeof GameAudio !== 'undefined' && typeof GameAudio.getEnabled === 'function') ? !!GameAudio.getEnabled() : getStorage(STORAGE_KEYS.soundEnabled) !== 'false',
                musicEnabled: (typeof GameAudio !== 'undefined' && typeof GameAudio.getMusicEnabled === 'function') ? !!GameAudio.getMusicEnabled() : getStorage(STORAGE_KEYS.musicEnabled) !== 'false',
                sfxVolume: (typeof GameAudio !== 'undefined' && typeof GameAudio.getSfxVolumeSetting === 'function') ? GameAudio.getSfxVolumeSetting() : Number(getStorage(STORAGE_KEYS.sfxVolume) || 1),
                ambientVolume: (typeof GameAudio !== 'undefined' && typeof GameAudio.getAmbientVolumeSetting === 'function') ? GameAudio.getAmbientVolumeSetting() : Number(getStorage(STORAGE_KEYS.ambientVolume) || 1),
                musicVolume: (typeof GameAudio !== 'undefined' && typeof GameAudio.getMusicVolumeSetting === 'function') ? GameAudio.getMusicVolumeSetting() : Number(getStorage(STORAGE_KEYS.musicVolume) || 1)
            };
        }

        function applySettingsPreferenceSnapshot(snapshot) {
            if (!snapshot || typeof snapshot !== 'object') return false;
            const html = document.documentElement;
	            if (snapshot.theme) html.setAttribute('data-theme', snapshot.theme);
	            else html.removeAttribute('data-theme');
                if (snapshot.cosmeticTheme && snapshot.cosmeticTheme !== 'default') html.setAttribute('data-cosmetic-theme', snapshot.cosmeticTheme);
                else html.removeAttribute('data-cosmetic-theme');
	            if (snapshot.textSize === 'large') html.setAttribute('data-text-size', 'large');
            else html.removeAttribute('data-text-size');
            html.setAttribute('data-reduced-motion', snapshot.reducedMotion ? 'true' : 'false');
            html.setAttribute('data-calm-mode', snapshot.calmMode ? 'true' : 'false');
            html.setAttribute('data-high-contrast', snapshot.highContrast ? 'true' : 'false');
            if (document.body) document.body.classList.toggle('calm-mode', !!snapshot.calmMode);
            try {
	                if (snapshot.theme) localStorage.setItem(STORAGE_KEYS.theme, snapshot.theme);
	                else localStorage.removeItem(STORAGE_KEYS.theme);
                    if (snapshot.cosmeticTheme && snapshot.cosmeticTheme !== 'default') localStorage.setItem(STORAGE_KEYS.cosmeticTheme, snapshot.cosmeticTheme);
                    else localStorage.removeItem(STORAGE_KEYS.cosmeticTheme);
	                if (snapshot.textSize) localStorage.setItem(STORAGE_KEYS.textSize, snapshot.textSize);
                else localStorage.removeItem(STORAGE_KEYS.textSize);
                localStorage.setItem(STORAGE_KEYS.reducedMotion, snapshot.reducedMotion ? 'true' : 'false');
                localStorage.setItem(STORAGE_KEYS.calmMode, snapshot.calmMode ? 'true' : 'false');
                localStorage.setItem('petcare_highContrast', snapshot.highContrast ? 'true' : 'false');
                localStorage.setItem(STORAGE_KEYS.srVerbosity, snapshot.srVerbosity || 'brief');
                localStorage.setItem(STORAGE_KEYS.hapticOff, snapshot.hapticOff ? 'true' : 'false');
                localStorage.setItem(STORAGE_KEYS.ttsOff, snapshot.ttsOff ? 'true' : 'false');
                localStorage.setItem(STORAGE_KEYS.soundCueCaptions, snapshot.soundCueCaptions ? 'true' : 'false');
            } catch (e) {}
            if (typeof GameAudio !== 'undefined') {
                try {
                    if (typeof GameAudio.getEnabled === 'function' && typeof GameAudio.toggle === 'function' && !!GameAudio.getEnabled() !== !!snapshot.soundEnabled) GameAudio.toggle();
                    if (typeof GameAudio.getMusicEnabled === 'function' && typeof GameAudio.toggleMusic === 'function' && !!GameAudio.getMusicEnabled() !== !!snapshot.musicEnabled) GameAudio.toggleMusic();
                    if (typeof GameAudio.setSfxVolumeSetting === 'function' && Number.isFinite(snapshot.sfxVolume)) GameAudio.setSfxVolumeSetting(Math.max(0, Math.min(1, Number(snapshot.sfxVolume))));
                    if (typeof GameAudio.setAmbientVolumeSetting === 'function' && Number.isFinite(snapshot.ambientVolume)) GameAudio.setAmbientVolumeSetting(Math.max(0, Math.min(1, Number(snapshot.ambientVolume))));
                    if (typeof GameAudio.setMusicVolumeSetting === 'function' && Number.isFinite(snapshot.musicVolume)) GameAudio.setMusicVolumeSetting(Math.max(0, Math.min(1, Number(snapshot.musicVolume))));
                    if (typeof GameAudio.setSoundCueCaptionsEnabled === 'function') GameAudio.setSoundCueCaptionsEnabled(!!snapshot.soundCueCaptions);
                } catch (e) {}
            }
            return true;
        }

        function showSettingsUndoToast(actionLabel, previousSnapshot) {
            if (!previousSnapshot || !document) return;
            const container = document.getElementById('toast-container') || document.body;
            const toast = document.createElement('div');
            toast.className = 'toast settings-undo-toast';
            toast.innerHTML = `
                <span class="toast-icon" aria-hidden="true">↩️</span>
                <span class="toast-text">${escapeHTML(actionLabel)} applied.</span>
                <button type="button" class="undo-toast-btn" aria-label="Restore previous settings">Undo</button>
            `;
            const btn = toast.querySelector('.undo-toast-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (applySettingsPreferenceSnapshot(previousSnapshot)) {
                        if (typeof showToast === 'function') showToast('Previous settings restored.', '#66BB6A', { announce: true });
                        toast.remove();
                    }
                });
            }
            container.appendChild(toast);
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.classList.add('toast-exiting');
                    setTimeout(() => toast.remove(), 260);
                }
            }, 6500);
        }

	        function showSettingsModal() {
            const existing = document.querySelector('.settings-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const soundEnabled = typeof GameAudio !== 'undefined' && GameAudio.getEnabled();
            const samplePackEnabled = typeof GameAudio !== 'undefined' && typeof GameAudio.getSamplePackEnabled === 'function'
                ? GameAudio.getSamplePackEnabled()
                : true;
            const sfxVolumeSetting = typeof GameAudio !== 'undefined' && typeof GameAudio.getSfxVolumeSetting === 'function'
                ? GameAudio.getSfxVolumeSetting()
                : 1;
            const ambientVolumeSetting = typeof GameAudio !== 'undefined' && typeof GameAudio.getAmbientVolumeSetting === 'function'
                ? GameAudio.getAmbientVolumeSetting()
                : 1;
            const musicVolumeSetting = typeof GameAudio !== 'undefined' && typeof GameAudio.getMusicVolumeSetting === 'function'
                ? GameAudio.getMusicVolumeSetting()
                : 1;
	            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
	                (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                const cosmeticTheme = (() => {
                    const raw = document.documentElement.getAttribute('data-cosmetic-theme') || 'default';
                    return COSMETIC_THEME_DEFINITIONS[raw] ? raw : 'default';
                })();
            const hapticEnabled = !(localStorage.getItem(STORAGE_KEYS.hapticOff) === 'true');
            const ttsEnabled = !(localStorage.getItem(STORAGE_KEYS.ttsOff) === 'true');
            const reducedMotionEnabled = document.documentElement.getAttribute('data-reduced-motion') === 'true';
            const calmModeEnabled = document.body.classList.contains('calm-mode') || localStorage.getItem(STORAGE_KEYS.calmMode) === 'true';
            const soundCueCaptionsEnabled = (typeof GameAudio !== 'undefined' && typeof GameAudio.getSoundCueCaptionsEnabled === 'function')
                ? GameAudio.getSoundCueCaptionsEnabled()
                : localStorage.getItem(STORAGE_KEYS.soundCueCaptions) === 'true';
            const soundCueLegend = (typeof GameAudio !== 'undefined' && typeof GameAudio.getAccessibilityCueLegend === 'function')
                ? GameAudio.getAccessibilityCueLegend()
                : [
                    { id: 'room', label: 'Room chime', description: 'Plays when entering a room.' },
                    { id: 'error', label: 'Error', description: 'Plays when an action is unavailable.' },
                    { id: 'reward', label: 'Reward', description: 'Plays when you earn something.' }
                ];
            const srVerbosityDetailed = (localStorage.getItem(STORAGE_KEYS.srVerbosity) === 'detailed');
	            const remindersEnabled = !!(gameState.reminders && gameState.reminders.enabled);
	            const autoFreezeEnabled = (typeof getStreakProtectionStatus === 'function')
	                ? !!getStreakProtectionStatus().autoUseFreeze
	                : true;
	            const highContrastEnabled = document.documentElement.getAttribute('data-high-contrast') === 'true';
                const emotionalDevVisible = !!(
                    (typeof MLFRetentionTelemetry !== 'undefined' && MLFRetentionTelemetry && typeof MLFRetentionTelemetry.isDevAdminEnabled === 'function' && MLFRetentionTelemetry.isDevAdminEnabled())
                    || (typeof isRetentionDebugEnabled === 'function' && isRetentionDebugEnabled())
                );
                const emotionalDebugConfig = (typeof window !== 'undefined' && window.MLFEmotionalFeedback && typeof window.MLFEmotionalFeedback.getDebugConfig === 'function')
                    ? window.MLFEmotionalFeedback.getDebugConfig()
                    : { forcedTier: '', pacingCareLoops: null };
                const emotionalDevSection = emotionalDevVisible ? `
                        <fieldset class="settings-group"><legend class="settings-group-heading">Emotional Read (DEV)</legend>
                            <div class="settings-row settings-row-verbosity">
                                <span class="settings-row-label">🎚️ Force Celebration Tier</span>
                                <button class="settings-choice ${(emotionalDebugConfig.forcedTier || '') === '' ? 'active' : ''}" id="setting-emotional-tier-auto" type="button" data-emotional-tier="" aria-pressed="${(emotionalDebugConfig.forcedTier || '') === '' ? 'true' : 'false'}">Auto</button>
                                <button class="settings-choice ${emotionalDebugConfig.forcedTier === 'Routine' ? 'active' : ''}" id="setting-emotional-tier-routine" type="button" data-emotional-tier="Routine" aria-pressed="${emotionalDebugConfig.forcedTier === 'Routine' ? 'true' : 'false'}">Routine</button>
                                <button class="settings-choice ${emotionalDebugConfig.forcedTier === 'Notable' ? 'active' : ''}" id="setting-emotional-tier-notable" type="button" data-emotional-tier="Notable" aria-pressed="${emotionalDebugConfig.forcedTier === 'Notable' ? 'true' : 'false'}">Notable</button>
                                <button class="settings-choice ${emotionalDebugConfig.forcedTier === 'Milestone' ? 'active' : ''}" id="setting-emotional-tier-milestone" type="button" data-emotional-tier="Milestone" aria-pressed="${emotionalDebugConfig.forcedTier === 'Milestone' ? 'true' : 'false'}">Milestone</button>
                            </div>
                            <div class="settings-row settings-row-verbosity">
                                <span class="settings-row-label">🧪 Simulate Rewards</span>
                                <button class="settings-preset-btn" id="setting-emotional-dev-burst" type="button">Show bundled moment</button>
                            </div>
                            <div class="settings-row settings-row-verbosity">
                                <span class="settings-row-label">⏱️ First-Session Pacing</span>
                                <button class="settings-choice ${(emotionalDebugConfig.pacingCareLoops == null) ? 'active' : ''}" id="setting-emotional-pacing-live" type="button" data-emotional-pacing="live" aria-pressed="${(emotionalDebugConfig.pacingCareLoops == null) ? 'true' : 'false'}">Live</button>
                                <button class="settings-choice ${Number(emotionalDebugConfig.pacingCareLoops) === 0 ? 'active' : ''}" id="setting-emotional-pacing-0" type="button" data-emotional-pacing="0" aria-pressed="${Number(emotionalDebugConfig.pacingCareLoops) === 0 ? 'true' : 'false'}">0 loops</button>
                                <button class="settings-choice ${Number(emotionalDebugConfig.pacingCareLoops) === 2 ? 'active' : ''}" id="setting-emotional-pacing-2" type="button" data-emotional-pacing="2" aria-pressed="${Number(emotionalDebugConfig.pacingCareLoops) === 2 ? 'true' : 'false'}">2 loops</button>
                                <button class="settings-choice ${Number(emotionalDebugConfig.pacingCareLoops) === 3 ? 'active' : ''}" id="setting-emotional-pacing-3" type="button" data-emotional-pacing="3" aria-pressed="${Number(emotionalDebugConfig.pacingCareLoops) === 3 ? 'true' : 'false'}">3 loops</button>
                            </div>
                        </fieldset>
                ` : '';

	            const overlay = document.createElement('div');
	            overlay.className = 'settings-overlay';
	            overlay.setAttribute('role', 'dialog');
	            overlay.setAttribute('aria-modal', 'true');
	            overlay.setAttribute('aria-labelledby', 'settings-title');
            const soundCueSummary = soundCueLegend.map((cue) => `${cue.label}: ${cue.description}`).join(' ');
            const soundCueButtons = soundCueLegend.map((cue) => `
                <button class="settings-choice settings-sound-cue-test" type="button" data-sound-cue="${cue.id}" aria-label="Test ${escapeHTML(cue.label)} cue">${escapeHTML(cue.label)}</button>
            `).join('');
            overlay.innerHTML = `
                <div class="settings-modal">
                    <h2 class="settings-title" id="settings-title">⚙️ Settings</h2>
                    <div class="settings-list">

                        <fieldset class="settings-group"><legend class="settings-group-heading">Audio</legend>
                        <div class="settings-row">
                            <span class="settings-row-label">🔊 Sound</span>
                            <button class="settings-toggle ${soundEnabled ? 'on' : ''}" id="setting-sound" role="switch" aria-checked="${soundEnabled}" aria-label="Sound">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-sound">${soundEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎵 Music</span>
                            <button class="settings-toggle ${typeof GameAudio !== 'undefined' && GameAudio.getMusicEnabled() ? 'on' : ''}" id="setting-music" role="switch" aria-checked="${typeof GameAudio !== 'undefined' && GameAudio.getMusicEnabled()}" aria-label="Background Music">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-music">${(typeof GameAudio !== 'undefined' && GameAudio.getMusicEnabled()) ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🎧 Sample Audio Pack</span>
                            <button class="settings-toggle ${samplePackEnabled ? 'on' : ''}" id="setting-sample-pack" role="switch" aria-checked="${samplePackEnabled}" aria-label="Sample Audio Pack">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-sample-pack">${samplePackEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row settings-sound-cue-row">
                            <div class="settings-sound-cue-meta">
                                <span class="settings-row-label">🧪 Test Sound Cues</span>
                                <small class="settings-row-help" id="settings-sound-cue-legend">${escapeHTML(soundCueSummary)}</small>
                            </div>
                            <div class="settings-sound-cue-buttons" role="group" aria-label="Sound cue legend and tests">
                                ${soundCueButtons}
                            </div>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">📝 Sound Cue Captions</span>
                            <button class="settings-toggle ${soundCueCaptionsEnabled ? 'on' : ''}" id="setting-sound-captions" role="switch" aria-checked="${soundCueCaptionsEnabled}" aria-label="Sound cue captions">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-sound-captions">${soundCueCaptionsEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🔈 Sound Effects Volume</span>
                                <span class="settings-volume-value" id="setting-sfx-volume-value">${Math.round(sfxVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-sfx-volume" min="0" max="100" step="5" value="${Math.round(sfxVolumeSetting * 100)}" aria-label="Sound effects volume">
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🌿 Ambient Volume</span>
                                <span class="settings-volume-value" id="setting-ambient-volume-value">${Math.round(ambientVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-ambient-volume" min="0" max="100" step="5" value="${Math.round(ambientVolumeSetting * 100)}" aria-label="Ambient volume">
                        </div>
                        <div class="settings-row settings-volume-row">
                            <div class="settings-volume-head">
                                <span class="settings-row-label">🎼 Music Volume</span>
                                <span class="settings-volume-value" id="setting-music-volume-value">${Math.round(musicVolumeSetting * 100)}%</span>
                            </div>
                            <input type="range" class="settings-volume-slider" id="setting-music-volume" min="0" max="100" step="5" value="${Math.round(musicVolumeSetting * 100)}" aria-label="Music volume">
                        </div>
                        </fieldset>

                        <fieldset class="settings-group"><legend class="settings-group-heading">Display</legend>
                        <div class="settings-row">
                            <span class="settings-row-label">${isDark ? '🌙' : '☀️'} Dark Mode</span>
                            <button class="settings-toggle ${isDark ? 'on' : ''}" id="setting-darkmode" role="switch" aria-checked="${isDark}" aria-label="Dark Mode">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-darkmode">${isDark ? 'On' : 'Off'}</span>
                        </div>
	                        <div class="settings-row">
	                            <span class="settings-row-label">🔤 Large Text</span>
	                            <button class="settings-toggle ${document.documentElement.getAttribute('data-text-size') === 'large' ? 'on' : ''}" id="setting-textsize" role="switch" aria-checked="${document.documentElement.getAttribute('data-text-size') === 'large'}" aria-label="Large Text">
	                                <span class="settings-toggle-knob"></span>
	                            </button>
	                            <span class="settings-toggle-state" id="state-setting-textsize">${document.documentElement.getAttribute('data-text-size') === 'large' ? 'On' : 'Off'}</span>
	                        </div>
                            <div class="settings-row settings-row-theme-pack">
                                <span class="settings-row-label">🪄 Theme Pack</span>
                                <button class="settings-choice ${cosmeticTheme === 'default' ? 'active' : ''}" id="setting-cosmetic-default" type="button" aria-pressed="${cosmeticTheme === 'default' ? 'true' : 'false'}">Default</button>
                                <button class="settings-choice ${cosmeticTheme === 'cozy' ? 'active' : ''}" id="setting-cosmetic-cozy" type="button" aria-pressed="${cosmeticTheme === 'cozy' ? 'true' : 'false'}">Cozy</button>
                                <button class="settings-choice ${cosmeticTheme === 'seasonal' ? 'active' : ''}" id="setting-cosmetic-seasonal" type="button" aria-pressed="${cosmeticTheme === 'seasonal' ? 'true' : 'false'}">Seasonal</button>
                                <small class="settings-verbosity-desc" style="display:block;width:100%;font-size:0.78rem;color:var(--color-text-secondary);margin-top:4px;">Cosmetic-only skins for buttons, room accents, and reward art polish.</small>
                            </div>
	                        </fieldset>

                        <fieldset class="settings-group"><legend class="settings-group-heading">Accessibility</legend>
                        <div class="settings-row">
                            <span class="settings-row-label">🔲 High Contrast</span>
                            <button class="settings-toggle ${highContrastEnabled ? 'on' : ''}" id="setting-high-contrast" role="switch" aria-checked="${highContrastEnabled}" aria-label="High Contrast">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-high-contrast">${highContrastEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🌀 Reduced Motion</span>
                            <button class="settings-toggle ${reducedMotionEnabled ? 'on' : ''}" id="setting-reduced-motion" role="switch" aria-checked="${reducedMotionEnabled}" aria-label="Reduced Motion">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-reduced-motion">${reducedMotionEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🌙 Calm Mode</span>
                            <button class="settings-toggle ${calmModeEnabled ? 'on' : ''}" id="setting-calm-mode" role="switch" aria-checked="${calmModeEnabled}" aria-label="Calm mode">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-calm-mode">${calmModeEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row settings-row-verbosity">
                            <span class="settings-row-label">🧏 Screen Reader Verbosity</span>
                            <button class="settings-choice ${srVerbosityDetailed ? '' : 'active'}" id="setting-sr-brief" type="button" aria-pressed="${srVerbosityDetailed ? 'false' : 'true'}">Brief</button>
                            <button class="settings-choice ${srVerbosityDetailed ? 'active' : ''}" id="setting-sr-detailed" type="button" aria-pressed="${srVerbosityDetailed ? 'true' : 'false'}">Detailed</button>
                            <small class="settings-verbosity-desc" style="display:block;width:100%;font-size:0.78rem;color:var(--color-text-secondary);margin-top:4px;">Brief: Short announcements for actions and events. Detailed: Longer descriptions including stat values and tips.</small>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🗣️ Text-to-Speech</span>
                            <button class="settings-toggle ${ttsEnabled ? 'on' : ''}" id="setting-tts" role="switch" aria-checked="${ttsEnabled}" aria-label="Text-to-Speech">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-tts">${ttsEnabled ? 'On' : 'Off'}</span>
                        </div>
                        <div class="settings-row">
                            <span class="settings-row-label">🌿 Low Stimulation</span>
                            <button class="settings-preset-btn" id="setting-low-stim">Apply Preset</button>
                        </div>
                        </fieldset>

                        <fieldset class="settings-group"><legend class="settings-group-heading">General</legend>
                        <div class="settings-row">
                            <span class="settings-row-label">📳 Haptic Feedback</span>
                            <button class="settings-toggle ${hapticEnabled ? 'on' : ''}" id="setting-haptic" role="switch" aria-checked="${hapticEnabled}" aria-label="Haptic Feedback">
                                <span class="settings-toggle-knob"></span>
                            </button>
                            <span class="settings-toggle-state" id="state-setting-haptic">${hapticEnabled ? 'On' : 'Off'}</span>
                        </div>
	                        <div class="settings-row">
	                            <span class="settings-row-label">🔔 Local Reactivation Reminders</span>
	                            <button class="settings-toggle ${remindersEnabled ? 'on' : ''}" id="setting-reminders" role="switch" aria-checked="${remindersEnabled}" aria-label="Local reminders">
	                                <span class="settings-toggle-knob"></span>
	                            </button>
	                            <span class="settings-toggle-state" id="state-setting-reminders">${remindersEnabled ? 'On' : 'Off'}</span>
	                        </div>
	                        <div class="settings-row">
	                            <span class="settings-row-label">🧊 Auto-use Streak Freeze</span>
	                            <button class="settings-toggle ${autoFreezeEnabled ? 'on' : ''}" id="setting-streak-freeze-auto" role="switch" aria-checked="${autoFreezeEnabled}" aria-label="Automatically use streak freeze tokens">
	                                <span class="settings-toggle-knob"></span>
	                            </button>
	                            <span class="settings-toggle-state" id="state-setting-streak-freeze-auto">${autoFreezeEnabled ? 'On' : 'Off'}</span>
	                        </div>
	                        <div class="settings-row">
	                            <button class="settings-preset-btn settings-reset-btn" id="setting-reset-defaults" style="color:#D32F2F;border-color:#D32F2F;">Reset All Settings to Defaults</button>
	                        </div>
                        </fieldset>
                        ${emotionalDevSection}

                    </div>
                    <div class="settings-keyboard-hints">
                        <h3 class="settings-hints-title">Keyboard Shortcuts</h3>
                        <div class="settings-hint-row"><kbd>1</kbd> Feed &nbsp; <kbd>2</kbd> Wash &nbsp; <kbd>3</kbd> Sleep &nbsp; <kbd>4</kbd> Pet</div>
                        <div class="settings-hint-row"><kbd>5</kbd> Play &nbsp; <kbd>6</kbd> Treat &nbsp; <kbd>7</kbd> Games &nbsp; <kbd>8</kbd> Arena</div>
                        <div class="settings-hint-row"><kbd>N</kbd> Notification history</div>
                        <div class="settings-hint-row"><kbd>Tab</kbd> Navigate &nbsp; <kbd>Enter</kbd> / <kbd>Space</kbd> Activate</div>
                        <div class="settings-hint-row"><kbd>Escape</kbd> Close current dialog</div>
                    </div>
                    <button class="settings-close" id="settings-close" aria-label="Close settings">Close</button>
                </div>
            `;
	            document.body.appendChild(overlay);

                const settingsListEl = overlay.querySelector('.settings-list');
                const titleEl = overlay.querySelector('#settings-title');
                if (titleEl && !overlay.querySelector('.settings-preview-note')) {
                    const previewNote = document.createElement('p');
                    previewNote.className = 'settings-preview-note settings-row-help';
                    previewNote.id = 'settings-preview-note';
                    previewNote.textContent = 'Changes preview live while this dialog is open.';
                    titleEl.insertAdjacentElement('afterend', previewNote);
                }

                // Add stable focus keys + visible/screen-reader descriptions without rewriting the template.
                const settingsHelpByControlId = {
                    'setting-sound': 'Turns all game audio on or off.',
                    'setting-music': 'Background music only.',
                    'setting-sample-pack': 'Uses the alternate sample audio set.',
                    'setting-sound-captions': 'Shows short captions when sound cues play.',
	                    'setting-darkmode': 'Switches between light and dark color themes.',
	                    'setting-textsize': 'Increases text size across the game UI.',
                        'setting-cosmetic-default': 'Uses the default cosmetic art pack.',
                        'setting-cosmetic-cozy': 'Warm cozy cosmetics for buttons and room accents.',
                        'setting-cosmetic-seasonal': 'Seasonal cosmetic accents and badge styling.',
	                    'setting-high-contrast': 'Boosts contrast for text, controls, and badges.',
                    'setting-reduced-motion': 'Reduces animations and screen movement.',
                    'setting-calm-mode': 'Uses a calmer, lower-stimulation presentation.',
                    'setting-sr-brief': 'Shorter spoken announcements.',
                    'setting-sr-detailed': 'More detailed spoken announcements.',
                    'setting-tts': 'Reads some messages out loud using device speech.',
                    'setting-low-stim': 'Preset: turns on calmer visual and speech settings in one tap.',
                    'setting-haptic': 'Vibration feedback for taps and alerts.',
                    'setting-reminders': 'Local reminders for hatch, harvest, expedition, and streak risks.',
                    'setting-streak-freeze-auto': 'Automatically spends a freeze token to protect your streak.',
                    'setting-reset-defaults': 'Restores default display, accessibility, and audio settings.',
                    'setting-emotional-tier-auto': 'Use automatic celebration routing.',
                    'setting-emotional-tier-routine': 'Force routine-tier presentation.',
                    'setting-emotional-tier-notable': 'Force notable-tier presentation.',
                    'setting-emotional-tier-milestone': 'Force milestone-tier presentation.',
                    'setting-emotional-dev-burst': 'Show a test care moment with bundled rewards.',
                    'setting-emotional-pacing-live': 'Use actual first-session pacing state.',
                    'setting-emotional-pacing-0': 'Simulate zero care loops completed.',
                    'setting-emotional-pacing-2': 'Simulate pre-meta pacing state (2 loops).',
                    'setting-emotional-pacing-3': 'Simulate meta systems unlocked (3 loops).'
                };
                Object.keys(settingsHelpByControlId).forEach((id) => {
                    const control = overlay.querySelector(`#${id}`);
                    if (!control) return;
                    if (!control.getAttribute('data-focus-key')) control.setAttribute('data-focus-key', id);
                    const row = control.closest('.settings-row');
                    if (!row || row.querySelector(`[data-settings-help-for="${id}"]`)) return;
                    const help = document.createElement('small');
                    help.className = 'settings-row-help';
                    help.setAttribute('data-settings-help-for', id);
                    help.id = `${id}-desc`;
                    help.textContent = settingsHelpByControlId[id];
                    row.appendChild(help);
                    const describedBy = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
                    if (!describedBy.includes(help.id)) describedBy.push(help.id);
                    control.setAttribute('aria-describedby', describedBy.join(' '));
                });

                // Lightweight subgroup labels inside large fieldsets for scanning/rotor context.
                const addSubgroupLabel = (fieldsetSelector, targetControlId, labelText) => {
                    const fieldset = overlay.querySelector(fieldsetSelector);
                    const targetRow = overlay.querySelector(`#${targetControlId}`)?.closest('.settings-row');
                    if (!fieldset || !targetRow) return;
                    const prev = targetRow.previousElementSibling;
                    if (prev && prev.classList && prev.classList.contains('settings-subgroup-label')) return;
                    const label = document.createElement('div');
                    label.className = 'settings-subgroup-label';
                    label.textContent = labelText;
                    label.setAttribute('role', 'heading');
                    label.setAttribute('aria-level', '3');
                    targetRow.parentNode.insertBefore(label, targetRow);
                };
                addSubgroupLabel('.settings-group:nth-of-type(2)', 'setting-darkmode', 'Vision');
                addSubgroupLabel('.settings-group:nth-of-type(3)', 'setting-reduced-motion', 'Motion');
                addSubgroupLabel('.settings-group:nth-of-type(3)', 'setting-sr-brief', 'Speech');
                addSubgroupLabel('.settings-group:nth-of-type(4)', 'setting-haptic', 'Touch & Device');

                const saveSettingsUiRestore = () => {
                    if (!settingsListEl) return;
                    _settingsModalUiRestore = {
                        focus: (typeof captureUiFocusSnapshot === 'function') ? captureUiFocusSnapshot({ scope: overlay, context: 'settings-modal' }) : null,
                        scrollTop: settingsListEl.scrollTop
                    };
                };
                overlay.addEventListener('focusin', saveSettingsUiRestore);
                if (settingsListEl) settingsListEl.addEventListener('scroll', saveSettingsUiRestore, { passive: true });

	            function setSwitchStateText(id, isOn) {
	                const stateEl = document.getElementById(`state-${id}`);
                if (stateEl) stateEl.textContent = isOn ? 'On' : 'Off';
            }

            function updateVolumeLabel(id, value) {
                const output = document.getElementById(`${id}-value`);
                if (output) output.textContent = `${Math.round(value)}%`;
            }

	            function setCalmModeEnabled(enabled) {
                const next = !!enabled;
                document.documentElement.setAttribute('data-calm-mode', next ? 'true' : 'false');
                if (document.body) document.body.classList.toggle('calm-mode', next);
                try { localStorage.setItem(STORAGE_KEYS.calmMode, next ? 'true' : 'false'); } catch (e) {}
	                return next;
	            }

                function notifyPreview(message) {
                    const note = overlay.querySelector('#settings-preview-note');
                    if (note) note.textContent = message;
                }

	            function bindVolumeSlider(sliderId, setter) {
	                const slider = document.getElementById(sliderId);
	                if (!slider) return;
                    const labelText = ((slider.closest('.settings-row') && slider.closest('.settings-row').querySelector('.settings-row-label')) || {}).textContent || 'Volume';
                    let lastAnnouncedVolume = null;
	                const onInput = () => {
	                    const raw = Number(slider.value);
	                    const value = Number.isFinite(raw) ? raw : 100;
	                    updateVolumeLabel(sliderId, value);
                        slider.setAttribute('aria-valuetext', `${Math.round(value)} percent`);
	                    if (typeof setter === 'function') setter(value / 100);
	                };
                    const onChangeAnnounce = () => {
                        const value = Math.round(Number(slider.value) || 0);
                        if (value === lastAnnouncedVolume) return;
                        lastAnnouncedVolume = value;
                        if (typeof announce === 'function') {
                            announce(`${String(labelText).replace(/[^\w\s]/g, '').trim()} ${value} percent`, {
                                source: 'settings',
                                dedupeMs: 600,
                                batch: false
                            });
                        }
                    };
	                slider.addEventListener('input', onInput);
	                slider.addEventListener('change', onInput);
                    slider.addEventListener('change', onChangeAnnounce);
	            }

            function syncVolumeControlAvailability() {
                const soundOn = typeof GameAudio !== 'undefined' ? GameAudio.getEnabled() : false;
                const musicOn = typeof GameAudio !== 'undefined' ? GameAudio.getMusicEnabled() : false;
                const sfxSlider = document.getElementById('setting-sfx-volume');
                const ambientSlider = document.getElementById('setting-ambient-volume');
                const musicSlider = document.getElementById('setting-music-volume');
                if (sfxSlider) sfxSlider.disabled = !soundOn;
                if (ambientSlider) ambientSlider.disabled = !soundOn;
                if (musicSlider) musicSlider.disabled = !(soundOn && musicOn);
            }

            // Sound toggle
            document.getElementById('setting-sound').addEventListener('click', function() {
                if (typeof GameAudio !== 'undefined') {
                    const enabled = GameAudio.toggle();
                    if (typeof GameAudio.playUiCue === 'function') GameAudio.playUiCue(enabled ? 'confirm' : 'close', { gain: 0.72 });
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-sound', enabled);
                    syncVolumeControlAvailability();
                    if (enabled && gameState.currentRoom) GameAudio.enterRoom(gameState.currentRoom);
                }
            });

            // Music toggle
            document.getElementById('setting-music').addEventListener('click', function() {
                if (typeof GameAudio !== 'undefined') {
                    const enabled = GameAudio.toggleMusic();
                    if (typeof GameAudio.playUiCue === 'function') GameAudio.playUiCue(enabled ? 'toggle' : 'back', { gain: 0.68 });
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-music', enabled);
                    syncVolumeControlAvailability();
                }
            });

            // Sample-pack toggle
            document.getElementById('setting-sample-pack').addEventListener('click', function() {
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.toggleSamplePack === 'function') {
                    const enabled = GameAudio.toggleSamplePack();
                    this.classList.toggle('on', enabled);
                    this.setAttribute('aria-checked', String(enabled));
                    setSwitchStateText('setting-sample-pack', enabled);
                    showToast(enabled ? '🎧 Sample audio pack enabled' : '🎛️ Sample audio pack disabled', '#A8D8EA');
                }
            });

            const soundCueCaptionBtn = document.getElementById('setting-sound-captions');
            if (soundCueCaptionBtn) {
                soundCueCaptionBtn.addEventListener('click', function() {
                    const isOn = this.classList.toggle('on');
                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.playUiCue === 'function') {
                        GameAudio.playUiCue(isOn ? 'confirm' : 'toggle', { gain: 0.64 });
                    }
                    this.setAttribute('aria-checked', String(isOn));
                    setSwitchStateText('setting-sound-captions', isOn);
                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.setSoundCueCaptionsEnabled === 'function') {
                        GameAudio.setSoundCueCaptionsEnabled(isOn);
                    } else {
                        try { localStorage.setItem(STORAGE_KEYS.soundCueCaptions, isOn ? 'true' : 'false'); } catch (e) {}
                    }
                    showToast(`Sound cue captions ${isOn ? 'enabled' : 'disabled'}.`, '#90A4AE', { announce: true });
                });
            }

            const soundCueLegendById = soundCueLegend.reduce((acc, cue) => {
                acc[cue.id] = cue;
                return acc;
            }, {});
            overlay.querySelectorAll('[data-sound-cue]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const cueId = btn.getAttribute('data-sound-cue');
                    const cue = soundCueLegendById[cueId] || { label: 'Sound cue', description: '' };
                    if (typeof GameAudio === 'undefined' || typeof GameAudio.playAccessibilityCue !== 'function') {
                        showToast('Sound testing is unavailable in this build.', '#FFA726', { announce: true });
                        return;
                    }
                    const result = GameAudio.playAccessibilityCue(cueId);
                    if (!result || !result.ok) {
                        const reason = result && result.reason ? result.reason : 'unavailable';
                        if (reason === 'sound-disabled') {
                            showToast('Turn on Sound to test cue playback.', '#FFA726', { announce: true });
                            return;
                        }
                        if (reason === 'audio-unavailable') {
                            showToast('Audio is unavailable in this browser.', '#FFA726', { announce: true });
                            return;
                        }
                        showToast('Could not play that cue right now.', '#FFA726', { announce: true });
                        return;
                    }
                    const captionsOn = (typeof GameAudio.getSoundCueCaptionsEnabled === 'function')
                        ? GameAudio.getSoundCueCaptionsEnabled()
                        : localStorage.getItem(STORAGE_KEYS.soundCueCaptions) === 'true';
                    const label = result.label || cue.label || 'Sound cue';
                    if (!captionsOn) {
                        showToast(`${label} cue played.`, '#4ECDC4', { announce: true });
                    }
                });
            });
            // D30: Volume slider audio preview (debounced)
            let _sfxPreviewTimer = null;
            bindVolumeSlider(
                'setting-sfx-volume',
                (value) => {
                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.setSfxVolumeSetting === 'function') GameAudio.setSfxVolumeSetting(value);
                    if (_sfxPreviewTimer) clearTimeout(_sfxPreviewTimer);
                    _sfxPreviewTimer = setTimeout(() => {
                        if (typeof GameAudio !== 'undefined' && GameAudio.getEnabled() && GameAudio.playSFX) {
                            if (typeof GameAudio.playStatusCue === 'function') GameAudio.playStatusCue('action-available', { gain: 0.55 });
                            GameAudio.playSFX(GameAudio.sfx.bubblePop || GameAudio.sfx.feed);
                        }
                    }, 300);
                }
            );
            bindVolumeSlider(
                'setting-ambient-volume',
                (value) => { if (typeof GameAudio !== 'undefined' && typeof GameAudio.setAmbientVolumeSetting === 'function') GameAudio.setAmbientVolumeSetting(value); }
            );
            bindVolumeSlider(
                'setting-music-volume',
                (value) => { if (typeof GameAudio !== 'undefined' && typeof GameAudio.setMusicVolumeSetting === 'function') GameAudio.setMusicVolumeSetting(value); }
            );
            syncVolumeControlAvailability();

            // Dark mode toggle
	            document.getElementById('setting-darkmode').addEventListener('click', function() {
                const html = document.documentElement;
                const current = html.getAttribute('data-theme');
                const wasDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
                const newTheme = wasDark ? 'light' : 'dark';
                html.setAttribute('data-theme', newTheme);
                try { localStorage.setItem(STORAGE_KEYS.theme, newTheme); } catch (e) {}
                this.classList.toggle('on', newTheme === 'dark');
                this.setAttribute('aria-checked', String(newTheme === 'dark'));
                setSwitchStateText('setting-darkmode', newTheme === 'dark');
                const label = this.parentElement.querySelector('.settings-row-label');
                if (label) label.textContent = (newTheme === 'dark' ? '🌙' : '☀️') + ' Dark Mode';
	                const meta = document.querySelector('meta[name="theme-color"]');
	                if (meta) meta.content = newTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
                    notifyPreview(`Preview: ${newTheme === 'dark' ? 'Dark' : 'Light'} mode applied.`);
	            });

            // Haptic toggle
            document.getElementById('setting-haptic').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-haptic', isOn);
                try { localStorage.setItem(STORAGE_KEYS.hapticOff, isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && navigator.vibrate) navigator.vibrate(0);
            });

            // TTS toggle
            document.getElementById('setting-tts').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-tts', isOn);
                try { localStorage.setItem(STORAGE_KEYS.ttsOff, isOn ? 'false' : 'true'); } catch (e) {}
                if (!isOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            });

            // Text size toggle (Item 30)
	            document.getElementById('setting-textsize').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-textsize', isOn);
	                document.documentElement.setAttribute('data-text-size', isOn ? 'large' : 'normal');
	                try { localStorage.setItem(STORAGE_KEYS.textSize, isOn ? 'large' : 'normal'); } catch (e) {}
                    notifyPreview(`Preview: text size ${isOn ? 'large' : 'normal'}.`);
	            });

	            document.getElementById('setting-reduced-motion').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-reduced-motion', isOn);
	                document.documentElement.setAttribute('data-reduced-motion', isOn ? 'true' : 'false');
	                try { localStorage.setItem(STORAGE_KEYS.reducedMotion, isOn ? 'true' : 'false'); } catch (e) {}
                    notifyPreview(`Preview: motion ${isOn ? 'reduced' : 'standard'}.`);
	            });

            const calmModeBtn = document.getElementById('setting-calm-mode');
            if (calmModeBtn) {
                calmModeBtn.addEventListener('click', function() {
                    const isOn = this.classList.toggle('on');
                    this.setAttribute('aria-checked', String(isOn));
                    setSwitchStateText('setting-calm-mode', isOn);
                    setCalmModeEnabled(isOn);
                    showToast(`Calm mode ${isOn ? 'enabled' : 'disabled'}.`, '#90A4AE', { announce: true });
                });
            }

	            document.getElementById('setting-reminders').addEventListener('click', function() {
                const isOn = this.classList.toggle('on');
                this.setAttribute('aria-checked', String(isOn));
                setSwitchStateText('setting-reminders', isOn);
                if (!gameState.reminders || typeof gameState.reminders !== 'object') {
                    gameState.reminders = { enabled: false, permission: 'default', lastSent: {} };
                }
                gameState.reminders.enabled = isOn;
                if (isOn && typeof requestLocalReminderPermission === 'function') {
	                    requestLocalReminderPermission().then((permission) => {
	                        gameState.reminders.permission = permission;
	                        if (permission === 'denied') {
	                            showToast('Browser notification permission denied. In-app reminders still available while open.', '#FFA726');
	                        } else {
	                            showToast('Local reminders enabled for streak risk, expedition, hatch, and harvest readiness.', '#66BB6A');
	                        }
	                        if (typeof markReminderPromptSeen === 'function') markReminderPromptSeen();
	                        saveGame();
	                    });
	                } else {
	                    saveGame();
	                }
	            });

	            const autoFreezeBtn = document.getElementById('setting-streak-freeze-auto');
	            if (autoFreezeBtn) {
	                autoFreezeBtn.addEventListener('click', function() {
	                    const isOn = this.classList.toggle('on');
	                    this.setAttribute('aria-checked', String(isOn));
	                    setSwitchStateText('setting-streak-freeze-auto', isOn);
	                    if (typeof setStreakFreezeAutoUse === 'function') {
	                        setStreakFreezeAutoUse(isOn);
	                    }
	                });
	            }

            const srBrief = document.getElementById('setting-sr-brief');
            const srDetailed = document.getElementById('setting-sr-detailed');
	            if (srBrief && srDetailed) {
	                const setSrVerbosity = (mode) => {
                    srBrief.classList.toggle('active', mode === 'brief');
                    srDetailed.classList.toggle('active', mode === 'detailed');
                    srBrief.setAttribute('aria-pressed', mode === 'brief' ? 'true' : 'false');
                    srDetailed.setAttribute('aria-pressed', mode === 'detailed' ? 'true' : 'false');
                    try { localStorage.setItem(STORAGE_KEYS.srVerbosity, mode); } catch (e) {}
                };
	                srBrief.addEventListener('click', () => setSrVerbosity('brief'));
	                srDetailed.addEventListener('click', () => setSrVerbosity('detailed'));
	            }

                const cosmeticThemeButtons = ['default', 'cozy', 'seasonal']
                    .map((id) => document.getElementById(`setting-cosmetic-${id}`))
                    .filter(Boolean);
                if (cosmeticThemeButtons.length > 0) {
                    const setCosmeticTheme = (themeId) => {
                        const safeTheme = COSMETIC_THEME_DEFINITIONS[themeId] ? themeId : 'default';
                        cosmeticThemeButtons.forEach((btn) => {
                            const active = btn.id === `setting-cosmetic-${safeTheme}`;
                            btn.classList.toggle('active', active);
                            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
                        });
                        if (safeTheme === 'default') document.documentElement.removeAttribute('data-cosmetic-theme');
                        else document.documentElement.setAttribute('data-cosmetic-theme', safeTheme);
                        try {
                            if (safeTheme === 'default') localStorage.removeItem(STORAGE_KEYS.cosmeticTheme);
                            else localStorage.setItem(STORAGE_KEYS.cosmeticTheme, safeTheme);
                        } catch (e) {}
                        notifyPreview(`Preview: ${COSMETIC_THEME_DEFINITIONS[safeTheme].label} theme pack.`);
                    };
                    cosmeticThemeButtons.forEach((btn) => {
                        btn.addEventListener('click', () => setCosmeticTheme((btn.id || '').replace('setting-cosmetic-', '')));
                    });
                }

		            const lowStim = document.getElementById('setting-low-stim');
	            if (lowStim) {
	                lowStim.addEventListener('click', () => {
                        const previousSettings = captureSettingsPreferenceSnapshot();
	                    document.documentElement.setAttribute('data-reduced-motion', 'true');
                    try { localStorage.setItem(STORAGE_KEYS.reducedMotion, 'true'); } catch (e) {}
                    try { localStorage.setItem(STORAGE_KEYS.srVerbosity, 'brief'); } catch (e) {}
                    const ttsBtn = document.getElementById('setting-tts');
                    if (ttsBtn && ttsBtn.classList.contains('on')) ttsBtn.click();
                    const soundBtn = document.getElementById('setting-sound');
                    if (soundBtn && soundBtn.classList.contains('on')) soundBtn.click();
                    const reducedBtn = document.getElementById('setting-reduced-motion');
                    if (reducedBtn && !reducedBtn.classList.contains('on')) reducedBtn.click();
                    const calmBtn = document.getElementById('setting-calm-mode');
                    if (calmBtn && !calmBtn.classList.contains('on')) calmBtn.click();
                    if (srBrief) srBrief.click();
	                    const presetSummary = 'Low stimulation preset applied: sound off, text-to-speech off, reduced motion on, calm mode on, screen reader verbosity set to brief.';
	                    showToast(presetSummary, '#66BB6A');
                        showSettingsUndoToast('Low stimulation preset', previousSettings);
	                    if (typeof announce === 'function') {
	                        announce(presetSummary, { source: 'settings', dedupeMs: 1200 });
	                    }
	                });
	            }

            // D29: High Contrast toggle
            const hcBtn = document.getElementById('setting-high-contrast');
            if (hcBtn) {
                hcBtn.addEventListener('click', function() {
                    const isOn = document.documentElement.getAttribute('data-high-contrast') === 'true';
                    const newVal = !isOn;
	                    document.documentElement.setAttribute('data-high-contrast', String(newVal));
	                    try { localStorage.setItem('petcare_highContrast', String(newVal)); } catch (e) {}
	                    this.classList.toggle('on', newVal);
	                    this.setAttribute('aria-checked', String(newVal));
	                    setSwitchStateText('setting-high-contrast', newVal);
                        notifyPreview(`Preview: contrast ${newVal ? 'high' : 'standard'}.`);
	                });
	            }

            // D32: Reset all settings to defaults
	            const resetBtn = document.getElementById('setting-reset-defaults');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                        const previousSettings = captureSettingsPreferenceSnapshot();
	                    if (!window.confirm('Reset all settings to defaults? You can undo from the next toast for a few seconds.')) return;
                    // Reset theme
                    document.documentElement.removeAttribute('data-theme');
                    document.documentElement.removeAttribute('data-cosmetic-theme');
                    document.documentElement.removeAttribute('data-text-size');
                    document.documentElement.setAttribute('data-reduced-motion', 'false');
                    document.documentElement.setAttribute('data-calm-mode', 'false');
                    document.documentElement.setAttribute('data-high-contrast', 'false');
                    if (document.body) document.body.classList.remove('calm-mode');
                    try {
                        localStorage.removeItem(STORAGE_KEYS.theme);
                        localStorage.removeItem(STORAGE_KEYS.cosmeticTheme);
                        localStorage.removeItem(STORAGE_KEYS.reducedMotion);
                        localStorage.removeItem(STORAGE_KEYS.srVerbosity);
                        localStorage.removeItem(STORAGE_KEYS.hapticOff);
                        localStorage.removeItem(STORAGE_KEYS.ttsOff);
                        localStorage.removeItem(STORAGE_KEYS.calmMode);
                        localStorage.removeItem(STORAGE_KEYS.soundCueCaptions);
                        localStorage.removeItem('petcare_highContrast');
                        localStorage.removeItem(STORAGE_KEYS.textSize);
                    } catch (e) {}
	                    if (typeof GameAudio !== 'undefined') {
	                        if (!GameAudio.getEnabled()) GameAudio.toggle();
	                        if (!GameAudio.getMusicEnabled()) GameAudio.toggleMusic();
	                        if (typeof GameAudio.setSfxVolumeSetting === 'function') GameAudio.setSfxVolumeSetting(1);
	                        if (typeof GameAudio.setAmbientVolumeSetting === 'function') GameAudio.setAmbientVolumeSetting(1);
	                        if (typeof GameAudio.setMusicVolumeSetting === 'function') GameAudio.setMusicVolumeSetting(1);
                            if (typeof GameAudio.setSoundCueCaptionsEnabled === 'function') GameAudio.setSoundCueCaptionsEnabled(false);
	                    }
	                    if (typeof setStreakFreezeAutoUse === 'function') setStreakFreezeAutoUse(true);
		                    showToast('Settings reset to defaults.', '#66BB6A');
                            showSettingsUndoToast('Settings reset', previousSettings);
		                    closeSettings();
                    // Re-open to reflect changes
                    setTimeout(() => showSettingsModal(), 300);
                });
            }

            overlay.querySelectorAll('[data-emotional-tier]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const forcedTier = btn.getAttribute('data-emotional-tier') || '';
                    if (!(typeof window !== 'undefined' && window.MLFEmotionalFeedback && typeof window.MLFEmotionalFeedback.setDebugConfig === 'function')) return;
                    try {
                        window.MLFEmotionalFeedback.setDebugConfig({ forcedTier });
                        overlay.querySelectorAll('[data-emotional-tier]').forEach((peer) => {
                            const active = (peer.getAttribute('data-emotional-tier') || '') === forcedTier;
                            peer.classList.toggle('active', active);
                            peer.setAttribute('aria-pressed', active ? 'true' : 'false');
                        });
                        notifyPreview(`Emotional tier: ${forcedTier || 'Auto'}.`);
                    } catch (e) {}
                });
            });

            const emotionalBurstBtn = document.getElementById('setting-emotional-dev-burst');
            if (emotionalBurstBtn) {
                emotionalBurstBtn.addEventListener('click', () => {
                    if (typeof window !== 'undefined' && window.MLFEmotionalFeedback && typeof window.MLFEmotionalFeedback.triggerDebugDemo === 'function') {
                        window.MLFEmotionalFeedback.triggerDebugDemo();
                        showToast('Emotional moment test triggered.', '#90CAF9', { announce: true, bypassMomentCapture: true });
                    }
                });
            }

            overlay.querySelectorAll('[data-emotional-pacing]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const raw = btn.getAttribute('data-emotional-pacing');
                    const pacingCareLoops = raw === 'live' ? null : Math.max(0, Math.floor(Number(raw) || 0));
                    if (!(typeof window !== 'undefined' && window.MLFEmotionalFeedback && typeof window.MLFEmotionalFeedback.setDebugConfig === 'function')) return;
                    window.MLFEmotionalFeedback.setDebugConfig({ pacingCareLoops });
                    overlay.querySelectorAll('[data-emotional-pacing]').forEach((peer) => {
                        const peerRaw = peer.getAttribute('data-emotional-pacing');
                        const active = (raw === 'live' && peerRaw === 'live') || (peerRaw !== 'live' && pacingCareLoops != null && Number(peerRaw) === pacingCareLoops);
                        peer.classList.toggle('active', active);
                        peer.setAttribute('aria-pressed', active ? 'true' : 'false');
                    });
                    notifyPreview(`First-session pacing: ${pacingCareLoops == null ? 'Live state' : `${pacingCareLoops} care loops`}.`);
                    if (typeof renderPetPhase === 'function') renderPetPhase();
                });
            });

	            function closeSettings() {
                    saveSettingsUiRestore();
	                popModalEscape(closeSettings);
	                animateModalClose(overlay, () => {
	                    const trigger = document.getElementById('settings-btn');
	                    if (trigger) trigger.focus();
	                });
            }

	            document.getElementById('settings-close').addEventListener('click', closeSettings);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });
	            pushModalEscape(closeSettings);
	            overlay._closeOverlay = closeSettings;
	            trapFocus(overlay);
                if (_settingsModalUiRestore) {
                    const restore = _settingsModalUiRestore;
                    requestAnimationFrame(() => {
                        if (settingsListEl && Number.isFinite(restore.scrollTop)) settingsListEl.scrollTop = restore.scrollTop;
                        if (restore.focus && restore.focus.descriptor && typeof restoreFocusFromSnapshot === 'function') {
                            restoreFocusFromSnapshot(restore.focus, { scope: overlay });
                        }
                    });
                }
	        }

        // ==================== LOW STAT WARNINGS ON ROOM NAV ====================

        function updateLowStatWarnings() {
            const pet = gameState.pet;
            if (!pet) return;
            const lowThreshold = 20;
            const hasLowStat = pet.hunger < lowThreshold || pet.cleanliness < lowThreshold ||
                               pet.happiness < lowThreshold || pet.energy < lowThreshold;

            // Add/remove warning indicator on room nav
            const roomNav = document.querySelector('.room-nav');
            if (!roomNav) return;

            let indicator = roomNav.querySelector('.low-stat-indicator');
            if (hasLowStat && !indicator) {
                indicator = document.createElement('div');
                indicator.className = 'low-stat-indicator';
                indicator.setAttribute('aria-label', 'Your pet needs attention!');
                indicator.setAttribute('role', 'status');

                const lowStats = [];
                if (pet.hunger < lowThreshold) lowStats.push('🍎');
                if (pet.cleanliness < lowThreshold) lowStats.push('🛁');
                if (pet.happiness < lowThreshold) lowStats.push('💖');
                if (pet.energy < lowThreshold) lowStats.push('😴');
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care now</span>`;
                roomNav.appendChild(indicator);
            } else if (!hasLowStat && indicator) {
                indicator.remove();
            } else if (hasLowStat && indicator) {
                const lowStats = [];
                if (pet.hunger < lowThreshold) lowStats.push('🍎');
                if (pet.cleanliness < lowThreshold) lowStats.push('🛁');
                if (pet.happiness < lowThreshold) lowStats.push('💖');
                if (pet.energy < lowThreshold) lowStats.push('😴');
                indicator.innerHTML = `<span class="low-stat-pulse">${lowStats.join('')} Needs care now</span>`;
            }
        }

        // Ensure activation delegates are active even if render binding fails
        setupGlobalActivateDelegates();
        setupSkipLinkFocusFlow();

        // ==================== KEYBOARD SHORTCUTS (Item 24) ====================
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in an input or when a modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (document.querySelector('.modal-overlay, [role="dialog"], [role="alertdialog"]')) return;
            if (gameState.phase !== 'pet') return;

            const shortcuts = {
                '1': 'core-feed-btn',
                '2': 'core-wash-btn',
                '3': 'core-sleep-btn',
                '4': 'pet-btn',
                '5': 'core-play-btn',
                '6': 'treat-btn',
                '7': 'minigames-btn',
                '8': 'competition-btn',
                '9': 'treasure-btn'
            };

            if (shortcuts[e.key]) {
                e.preventDefault();
                const btn = document.getElementById(shortcuts[e.key]);
                if (btn && !btn.disabled) btn.click();
            }

            // B19: N key opens notification history
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (typeof showNotificationHistory === 'function') {
                    showNotificationHistory();
                }
            }
        });

        // ==================== E35: SCROLL FADE INDICATORS ====================
        function updateScrollFadeIndicators() {
            const wrap = document.querySelector('.actions-scroll-wrap');
            if (!wrap) return;
            const scrollable = wrap.querySelector('.actions-row') || wrap;
            const atStart = scrollable.scrollLeft <= 2;
            const atEnd = scrollable.scrollLeft + scrollable.clientWidth >= scrollable.scrollWidth - 2;
            wrap.classList.toggle('scrolled-start', !atStart);
            wrap.classList.toggle('scrolled-end', atEnd);
        }
        document.addEventListener('scroll', (e) => {
            if (e.target && e.target.closest && e.target.closest('.actions-scroll-wrap, .actions-row')) {
                updateScrollFadeIndicators();
            }
        }, true);
        if (typeof MutationObserver === 'function' && document.body) {
            let _scrollFadeRefreshQueued = false;
            const queueScrollFadeRefresh = () => {
                if (_scrollFadeRefreshQueued) return;
                _scrollFadeRefreshQueued = true;
                requestAnimationFrame(() => {
                    _scrollFadeRefreshQueued = false;
                    updateScrollFadeIndicators();
                });
            };
            const _scrollFadeObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations || []) {
                    const added = mutation && mutation.addedNodes ? mutation.addedNodes : [];
                    const removed = mutation && mutation.removedNodes ? mutation.removedNodes : [];
                    for (const node of added) {
                        if (node && node.nodeType === 1 && node.querySelector && (node.matches('.actions-scroll-wrap, .actions-row') || node.querySelector('.actions-scroll-wrap, .actions-row'))) {
                            queueScrollFadeRefresh();
                            return;
                        }
                    }
                    for (const node of removed) {
                        if (node && node.nodeType === 1 && node.querySelector && (node.matches('.actions-scroll-wrap, .actions-row') || node.querySelector('.actions-scroll-wrap, .actions-row'))) {
                            queueScrollFadeRefresh();
                            return;
                        }
                    }
                }
            });
            _scrollFadeObserver.observe(document.body, { childList: true, subtree: true });
        }

        // ==================== C28: TOOLTIP VIEWPORT CLAMPING ====================
        document.addEventListener('mouseover', (e) => {
            const btn = e.target.closest('.action-btn');
            if (!btn) return;
            const tooltip = btn.querySelector('.action-btn-tooltip');
            if (!tooltip) return;
            // Reset position
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translateX(-50%) scale(1)';
            requestAnimationFrame(() => {
                const rect = tooltip.getBoundingClientRect();
                if (rect.right > window.innerWidth - 4) {
                    tooltip.style.left = 'auto';
                    tooltip.style.right = '0';
                    tooltip.style.transform = 'scale(1)';
                } else if (rect.left < 4) {
                    tooltip.style.left = '0';
                    tooltip.style.transform = 'scale(1)';
                }
            });
        }, true);

        // ==================== BUTTON PRESS FEEDBACK (Item 29) ====================
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('.action-btn, .core-care-btn');
            if (btn && !btn.disabled && !btn.classList.contains('cooldown')) {
                btn.classList.add('btn-pressed');
            }
        });
        document.addEventListener('pointerup', () => {
            document.querySelectorAll('.action-btn.btn-pressed, .core-care-btn.btn-pressed').forEach(b => b.classList.remove('btn-pressed'));
        });
        document.addEventListener('pointercancel', () => {
            document.querySelectorAll('.action-btn.btn-pressed, .core-care-btn.btn-pressed').forEach(b => b.classList.remove('btn-pressed'));
        });

        // ==================== TEXT SIZE RESTORE (Item 30) ====================
        (function restoreTextSize() {
            try {
                const firstRunDefaultsKey = STORAGE_KEYS.firstRunA11yDefaults;
                const firstRunAudioRepairKey = 'myLittleFriend_firstRunAudioDefaultsRepairV2';
                const hasSaveData = !!localStorage.getItem(STORAGE_KEYS.gameSave);
                const shouldApplyFirstRunDefaults = !hasSaveData && localStorage.getItem(firstRunDefaultsKey) !== 'true';
                if (shouldApplyFirstRunDefaults) {
                    if (localStorage.getItem(STORAGE_KEYS.reducedMotion) === null) localStorage.setItem(STORAGE_KEYS.reducedMotion, 'true');
                    if (localStorage.getItem(STORAGE_KEYS.srVerbosity) === null) localStorage.setItem(STORAGE_KEYS.srVerbosity, 'brief');
                    // Keep audio on by default; autoplay/unlock is still gated by first interaction.
                    if (localStorage.getItem(STORAGE_KEYS.soundEnabled) === null) localStorage.setItem(STORAGE_KEYS.soundEnabled, 'true');
                    if (localStorage.getItem(STORAGE_KEYS.musicEnabled) === null) localStorage.setItem(STORAGE_KEYS.musicEnabled, 'true');
                    if (localStorage.getItem(STORAGE_KEYS.samplePackEnabled) === null) localStorage.setItem(STORAGE_KEYS.samplePackEnabled, 'false');
                    if (localStorage.getItem(STORAGE_KEYS.calmMode) === null) localStorage.setItem(STORAGE_KEYS.calmMode, 'true');
                    if (localStorage.getItem(STORAGE_KEYS.coachChecklistMinimized) === null) localStorage.setItem(STORAGE_KEYS.coachChecklistMinimized, 'true');
                    localStorage.setItem(firstRunDefaultsKey, 'true');
                }
                // Repair installs that were auto-muted by the previous first-run defaults rollout.
                // This tries to match the default-applied signature and runs once.
                const shouldRepairFirstRunMutedAudio =
                    localStorage.getItem(firstRunAudioRepairKey) !== 'true'
                    && localStorage.getItem(firstRunDefaultsKey) === 'true'
                    && localStorage.getItem(STORAGE_KEYS.soundEnabled) === 'false'
                    && localStorage.getItem(STORAGE_KEYS.musicEnabled) === 'false'
                    // Old first-run defaults also disabled sample pack; use that as
                    // a stronger signature than user-facing accessibility prefs.
                    && localStorage.getItem(STORAGE_KEYS.samplePackEnabled) === 'false';
                if (shouldRepairFirstRunMutedAudio) {
                    localStorage.setItem(STORAGE_KEYS.soundEnabled, 'true');
                    localStorage.setItem(STORAGE_KEYS.musicEnabled, 'true');
                    localStorage.setItem(firstRunAudioRepairKey, 'true');
                }
	                const size = localStorage.getItem(STORAGE_KEYS.textSize);
	                if (size === 'large') document.documentElement.setAttribute('data-text-size', 'large');
                    const cosmeticTheme = localStorage.getItem(STORAGE_KEYS.cosmeticTheme);
                    if (cosmeticTheme === 'cozy' || cosmeticTheme === 'seasonal') {
                        document.documentElement.setAttribute('data-cosmetic-theme', cosmeticTheme);
                    }
	                const reducedMotion = localStorage.getItem(STORAGE_KEYS.reducedMotion);
                if (reducedMotion === 'true') document.documentElement.setAttribute('data-reduced-motion', 'true');
                const calmMode = localStorage.getItem(STORAGE_KEYS.calmMode) === 'true';
                document.documentElement.setAttribute('data-calm-mode', calmMode ? 'true' : 'false');
                if (document.body) document.body.classList.toggle('calm-mode', calmMode);
                // D29: Restore high-contrast mode
                const hc = localStorage.getItem('petcare_highContrast');
                if (hc === 'true') document.documentElement.setAttribute('data-high-contrast', 'true');
                if ((shouldApplyFirstRunDefaults || shouldRepairFirstRunMutedAudio) && typeof GameAudio !== 'undefined') {
                    if (typeof GameAudio.getEnabled === 'function' && typeof GameAudio.toggle === 'function' && !GameAudio.getEnabled()) GameAudio.toggle();
                    if (typeof GameAudio.getMusicEnabled === 'function' && typeof GameAudio.toggleMusic === 'function' && !GameAudio.getMusicEnabled()) GameAudio.toggleMusic();
                    if (typeof GameAudio.getSamplePackEnabled === 'function' && typeof GameAudio.toggleSamplePack === 'function' && GameAudio.getSamplePackEnabled()) GameAudio.toggleSamplePack();
                }
            } catch (e) {}
        })();

        // ==================== LOADING INDICATOR (Item 18) ====================
        function showLoadingOverlay(message) {
            const existing = document.querySelector('.loading-overlay-wrap');
            if (existing) existing.remove();
            const wrap = document.createElement('div');
            wrap.className = 'loading-overlay-wrap';
            wrap.setAttribute('role', 'status');
            wrap.setAttribute('aria-live', 'polite');
            wrap.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div><span>${escapeHTML(message || 'Loading...')}</span></div>`;
            document.body.appendChild(wrap);
            return wrap;
        }
        function hideLoadingOverlay() {
            const el = document.querySelector('.loading-overlay-wrap');
            if (el) el.remove();
        }

        // ==================== NON-BLOCKING COACH CHECKLIST ====================
	        const COACH_CHECKLIST_STORAGE_KEY = STORAGE_KEYS.coachChecklist;
	        const COACH_CHECKLIST_STEPS = [
	            { id: 'complete_daily', label: 'Do one Daily', icon: '📋' },
	            { id: 'open_codex', label: 'Open Codex and claim first badge', icon: '📖' },
	            { id: 'start_expedition', label: 'Start an expedition', icon: '🧭' }
	        ];

	        function getCoachChecklistState() {
	            const defaults = { complete_daily: false, open_codex: false, start_expedition: false };
	            try {
	                const raw = localStorage.getItem(COACH_CHECKLIST_STORAGE_KEY);
	                if (!raw) return defaults;
	                const parsed = JSON.parse(raw);
	                return {
	                    complete_daily: !!parsed.complete_daily,
	                    open_codex: !!parsed.open_codex,
	                    start_expedition: !!parsed.start_expedition
	                };
	            } catch (e) {
	                return defaults;
            }
        }

        function saveCoachChecklistState(state) {
            try { localStorage.setItem(COACH_CHECKLIST_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
        }

        function isCoachChecklistComplete(state) {
            return COACH_CHECKLIST_STEPS.every((step) => !!state[step.id]);
        }

        function removeCoachChecklist() {
            const existing = document.querySelector('.coach-checklist');
            if (existing) {
                existing.remove();
                setUiBusyState();
            }
        }

	        function markCoachChecklistProgress(stepOrAction) {
            try {
                if (localStorage.getItem(STORAGE_KEYS.tutorialDone) === 'true') return;
            } catch (e) {}
            const state = getCoachChecklistState();
            let changed = false;

	            if ((stepOrAction === 'complete_daily' || stepOrAction === 'daily') && !state.complete_daily) {
	                state.complete_daily = true;
	                changed = true;
	            }
	            if ((stepOrAction === 'open_codex' || stepOrAction === 'codex') && !state.open_codex) {
	                state.open_codex = true;
	                changed = true;
	            }
	            if ((stepOrAction === 'start_expedition' || stepOrAction === 'expedition') && !state.start_expedition) {
	                state.start_expedition = true;
	                changed = true;
	            }
	            if (!changed) return;
	            const stepLabels = {
	                complete_daily: 'Daily complete',
	                open_codex: 'Codex opened',
	                start_expedition: 'Expedition started'
	            };
	            const changedStep = stepOrAction === 'daily' ? 'complete_daily'
	                : stepOrAction === 'codex' ? 'open_codex'
	                : stepOrAction === 'expedition' ? 'start_expedition'
	                : stepOrAction;
            if (typeof announce === 'function' && stepLabels[changedStep]) {
                announce(`Quick Start updated: ${stepLabels[changedStep]}.`, { source: 'coach', dedupeMs: 2200 });
            }

            saveCoachChecklistState(state);
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                removeCoachChecklist();
                showToast('✅ Coach checklist complete!', '#66BB6A', { announce: false });
                if (typeof announce === 'function') announce('Quick Start complete.', { source: 'coach', dedupeMs: 2200 });
                return;
            }
            const completedCount = COACH_CHECKLIST_STEPS.filter((step) => !!state[step.id]).length;
            if (completedCount > 0) {
                setCoachChecklistMinimizedPref(true);
            }
            if (isNarrowViewport()) {
                setCoachChecklistMinimizedPref(true);
            }
            renderCoachChecklist(true);
            if (completedCount > 0) {
                setCoachChecklistMinimized(true, 'manual');
            }
        }

        function renderCoachChecklist(forceVisible = false) {
            if (!gameState || gameState.phase !== 'pet') {
                removeCoachChecklist();
                return;
            }
            try {
                if (localStorage.getItem(STORAGE_KEYS.tutorialDone) === 'true') {
                    removeCoachChecklist();
                    return;
                }
            } catch (e) {}

            const state = getCoachChecklistState();
            if (isCoachChecklistComplete(state)) {
                try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                removeCoachChecklist();
                return;
            }

            if (!forceVisible && document.querySelector('.modal-overlay, [role="dialog"]')) return;

            let panel = document.querySelector('.coach-checklist');
            if (!panel) {
                panel = document.createElement('aside');
                panel.className = 'coach-checklist';
                panel.setAttribute('aria-label', 'Quick Start');
                document.body.appendChild(panel);
            }
            panel.removeAttribute('aria-live');

            const itemsHTML = COACH_CHECKLIST_STEPS.map((step) => `
                <li class="coach-checklist-item ${state[step.id] ? 'done' : ''}">
                    <span class="coach-check-icon" aria-hidden="true">${state[step.id] ? '✓' : step.icon}</span>
                    <span>${escapeHTML(step.label)}</span>
                </li>
            `).join('');

            panel.innerHTML = `
                <div class="coach-checklist-head">
                    <div class="coach-checklist-title">Quick Start</div>
                    <div class="coach-checklist-head-actions">
                        <button class="coach-checklist-toggle" type="button" data-coach-toggle aria-pressed="false">Hide</button>
                        <button class="coach-checklist-skip" type="button" data-coach-skip>Skip</button>
                    </div>
                </div>
                <ul class="coach-checklist-list">${itemsHTML}</ul>
            `;

            const toggleBtn = panel.querySelector('[data-coach-toggle]');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const nextMinimized = !panel.classList.contains('minimized');
                    setCoachChecklistMinimized(nextMinimized, 'manual');
                    if (typeof announce === 'function') {
                        announce(`Quick Start ${nextMinimized ? 'collapsed' : 'expanded'}.`, { source: 'coach', dedupeMs: 2200 });
                    }
                });
            }
            const skipBtn = panel.querySelector('[data-coach-skip]');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    try { localStorage.setItem(STORAGE_KEYS.tutorialDone, 'true'); } catch (e) {}
                    removeCoachChecklist();
                    if (typeof announce === 'function') announce('Quick Start skipped.', { source: 'coach', dedupeMs: 2200 });
                });
            }
            setCoachChecklistMinimized(getCoachChecklistMinimizedPref(), 'manual');
        }

        function showTutorial() {
            renderCoachChecklist(true);
        }

        // Show tutorial on first pet phase render if not already shown
        const _origRenderPetPhase = typeof renderPetPhase === 'function' ? renderPetPhase : null;
        if (_origRenderPetPhase) {
            // Defer tutorial check to after first render
            setTimeout(() => {
                if (gameState.phase === 'pet' && !localStorage.getItem(STORAGE_KEYS.tutorialDone)) {
                    showTutorial();
                }
            }, 2000);
        }
