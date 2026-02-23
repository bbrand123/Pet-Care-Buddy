// ============================================================
// rooms.js  –  Room functions
// Extracted from game.js (lines 5525-5901)
// ============================================================

        // ==================== ROOM FUNCTIONS ====================

        function ensureRoomSystemsState() {
            if (!gameState.roomUnlocks || typeof gameState.roomUnlocks !== 'object') gameState.roomUnlocks = {};
            if (!gameState.roomUpgrades || typeof gameState.roomUpgrades !== 'object') gameState.roomUpgrades = {};
            if (!gameState.roomCustomizations || typeof gameState.roomCustomizations !== 'object') gameState.roomCustomizations = {};
            ROOM_IDS.forEach((roomId) => {
                const room = ROOMS[roomId];
                if (!room) return;
                if (typeof gameState.roomUnlocks[roomId] !== 'boolean') {
                    gameState.roomUnlocks[roomId] = room.unlockRule && room.unlockRule.type === 'default';
                }
                if (!Number.isFinite(gameState.roomUpgrades[roomId])) gameState.roomUpgrades[roomId] = 0;
                if (!gameState.roomCustomizations[roomId] || typeof gameState.roomCustomizations[roomId] !== 'object') {
                    gameState.roomCustomizations[roomId] = {};
                }
                const custom = gameState.roomCustomizations[roomId];
                if (!custom.wallpaper || !ROOM_WALLPAPERS[custom.wallpaper]) custom.wallpaper = 'classic';
                if (!custom.flooring || !ROOM_FLOORINGS[custom.flooring]) custom.flooring = 'natural';
                if (!custom.theme || !ROOM_THEMES[custom.theme]) custom.theme = 'auto';
                if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                while (custom.furnitureSlots.length < 2) custom.furnitureSlots.push('none');
                custom.furnitureSlots = custom.furnitureSlots.slice(0, 2).map((id) => ROOM_FURNITURE_ITEMS[id] ? id : 'none');
            });
        }

        function getRoomCustomization(roomId) {
            ensureRoomSystemsState();
            return gameState.roomCustomizations[roomId] || { wallpaper: 'classic', flooring: 'natural', theme: 'auto', furnitureSlots: ['none', 'none'] };
        }

        function getRoomThemeMode(roomId, pet) {
            const custom = getRoomCustomization(roomId);
            const theme = custom.theme || 'auto';
            const petType = pet && pet.type;
            if (theme === 'default') return 'default';
            if (theme === 'aquarium') return 'aquarium';
            if (theme === 'nest') return 'nest';
            if (petType === 'fish') return 'aquarium';
            if (petType === 'bird' || petType === 'penguin') return 'nest';
            return 'default';
        }

        function getRoomUnlockStatus(roomId) {
            const room = ROOMS[roomId];
            if (!room) return { unlocked: false, reason: 'Unknown room.' };
            ensureRoomSystemsState();
            if (gameState.roomUnlocks[roomId]) return { unlocked: true, met: true, reason: '' };
            const rule = room.unlockRule || { type: 'default' };
            if (rule.type === 'default') return { unlocked: true, met: true, reason: '' };
            if (rule.type === 'careActions') {
                const care = Array.isArray(gameState.pets) && gameState.pets.length > 0
                    ? Math.max(...gameState.pets.map((p) => (p && Number.isFinite(p.careActions)) ? p.careActions : 0))
                    : (gameState.pet && Number.isFinite(gameState.pet.careActions) ? gameState.pet.careActions : 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: care >= count,
                    reason: `Need ${count} care actions (${care}/${count}).`
                };
            }
            if (rule.type === 'adultsRaised') {
                const adults = Number(gameState.adultsRaised || 0);
                const count = Math.max(0, Number(rule.count) || 0);
                return {
                    unlocked: false,
                    met: adults >= count,
                    reason: `Need ${count} adult pets raised (${adults}/${count}).`
                };
            }
            return { unlocked: false, met: false, reason: room.unlockRule && room.unlockRule.text ? room.unlockRule.text : 'Locked.' };
        }

        function unlockRoom(roomId) {
            const status = getRoomUnlockStatus(roomId);
            if (status.unlocked) return { ok: true, already: true };
            if (!status.met) return { ok: false, reason: status.reason || 'Requirement not met.' };
            gameState.roomUnlocks[roomId] = true;
            saveGame();
            return { ok: true };
        }

        function getRoomBackground(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return ROOMS.bedroom.bgDay;
            switch (timeOfDay) {
                case 'night': return room.bgNight;
                case 'sunset': return room.bgSunset;
                case 'sunrise': return room.bgSunrise;
                default: return room.bgDay;
            }
        }

        const ROOM_PROP_ASSETS = {
            bedroom: ['assets/props/toy-bin.svg', 'assets/props/framed-photo.svg'],
            kitchen: ['assets/props/wall-plant.svg', 'assets/props/tea-shelf.svg'],
            bathroom: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            backyard: ['assets/props/kite-rack.svg', 'assets/props/flower-pot.svg'],
            park: ['assets/props/picnic-basket.svg', 'assets/props/bench-plaque.svg'],
            garden: ['assets/props/watering-can.svg', 'assets/props/garden-lantern.svg'],
            library: ['assets/props/framed-photo.svg', 'assets/props/tea-shelf.svg'],
            arcade: ['assets/props/toy-bin.svg', 'assets/props/bench-plaque.svg'],
            spa: ['assets/props/soap-stack.svg', 'assets/props/towel-rack.svg'],
            observatory: ['assets/props/garden-lantern.svg', 'assets/props/bench-plaque.svg'],
            workshop: ['assets/props/watering-can.svg', 'assets/props/wall-plant.svg']
        };

        function getRoomPropTier() {
            const pet = gameState.pet;
            const careActions = pet && Number.isFinite(pet.careActions) ? pet.careActions : 0;
            if (careActions >= 90) return 2;
            if (careActions >= 35) return 1;
            return 0;
        }

        function getRoomDecor(roomId, timeOfDay) {
            const room = ROOMS[roomId];
            if (!room) return '<span class="room-decor-inline">🌸 🌼 🌷</span>';
            const emojiDecor = timeOfDay === 'night' ? room.nightDecorEmoji : room.decorEmoji;
            const custom = getRoomCustomization(roomId);
            const themed = getRoomThemeMode(roomId, gameState.pet);
            let themeDecor = '';
            if (themed === 'aquarium') themeDecor = '<span class="room-theme-badge">🐠 Aquarium</span>';
            if (themed === 'nest') themeDecor = '<span class="room-theme-badge">🪺 Nest</span>';
            const tier = getRoomPropTier();
            const slotDecor = (custom.furnitureSlots || [])
                .map((id, idx) => ROOM_FURNITURE_ITEMS[id] ? `<span class="room-furniture-slot room-furniture-slot-${idx + 1}">${ROOM_FURNITURE_ITEMS[id].emoji}</span>` : '')
                .join('');
            if (tier <= 0) return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}`;
            const assets = ROOM_PROP_ASSETS[roomId] || [];
            const maxProps = Math.min(tier, assets.length);
            const props = [];
            for (let i = 0; i < maxProps; i++) {
                props.push(`<span class="room-prop room-prop-tier-${i + 1}" aria-hidden="true"><img src="${assets[i]}" alt="" loading="lazy" decoding="async"></span>`);
            }
            return `<span class="room-decor-inline">${emojiDecor}</span>${themeDecor}${slotDecor}${props.join('')}`;
        }

        function getReadyCropCount() {
            const garden = gameState.garden;
            if (!garden || !garden.plots) return 0;
            return garden.plots.filter(p => p && p.stage >= 3).length;
        }

        function useBeginnerRoomNav() {
            const pet = gameState.pet;
            if (!pet) return false;
            const careActions = Number(pet.careActions) || 0;
            if (careActions >= 24) return false;
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.petSessions);
                const sessions = Number.parseInt(raw || '0', 10);
                return (Number.isFinite(sessions) ? sessions : 0) < 3;
            } catch (e) {
                return false;
            }
        }

        function generateRoomNavHTML(currentRoom) {
            ensureRoomSystemsState();
            const readyCrops = getReadyCropCount();
            const beginnerMode = useBeginnerRoomNav();
            let html = '<nav class="room-nav" id="room-nav" role="navigation" aria-label="Room navigation">';
            const lockedRooms = [];
            for (const id of ROOM_IDS) {
                const room = ROOMS[id];
                const status = getRoomUnlockStatus(id);
                const unlocked = !!status.unlocked;
                const isActive = id === currentRoom;
                if (beginnerMode && !unlocked) {
                    lockedRooms.push({ id, room, status });
                    continue;
                }
                const badge = (id === 'garden' && readyCrops > 0) ? `<span class="garden-ready-badge" aria-label="${readyCrops} crops ready">${readyCrops}</span>` : '';
                const bonusHint = room.bonus ? ` (Bonus: ${getRoomBonusLabel(id)})` : '';
                const lockBadge = unlocked ? '' : '<span class="room-lock-badge" aria-hidden="true">🔒</span>';
                const lockRequirement = status.reason || (room.unlockRule && room.unlockRule.text) || 'Locked';
                const lockHint = unlocked ? '' : ` ${lockRequirement}`;
                const lockA11y = unlocked ? '' : `. Locked. Requirement: ${lockRequirement}.`;
                html += `<button class="room-btn${isActive ? ' active' : ''}${unlocked ? '' : ' locked'}" type="button" data-room="${id}"
                    aria-label="Go to ${room.name}${lockA11y}" aria-pressed="${isActive}" aria-disabled="${unlocked ? 'false' : 'true'}"
                    ${isActive ? 'aria-current="page"' : ''} tabindex="${unlocked ? '0' : '-1'}" style="position:relative;"
                    title="${room.name}${bonusHint}${lockHint}">
                    <span class="room-btn-icon" aria-hidden="true">${room.icon}</span>
                    <span class="room-btn-label">${room.name}</span>
                    ${badge}
                    ${lockBadge}
                </button>`;
            }
            html += '</nav>';
            if (beginnerMode && lockedRooms.length > 0) {
                const lockedHTML = lockedRooms.map(({ id, room, status }) => {
                    const lockRequirement = status.reason || (room.unlockRule && room.unlockRule.text) || 'Locked';
                    return `<div class="room-btn locked room-coming-item" data-room="${id}" role="listitem" aria-disabled="true"
                        aria-label="${room.name}. Locked. Requirement: ${lockRequirement}."
                        title="${room.name} ${lockRequirement}">
                        <span class="room-coming-icon" aria-hidden="true">${room.icon}</span>
                        <span class="room-coming-copy"><strong>${room.name}</strong><span>${lockRequirement}</span></span>
                    </div>`;
                }).join('');
                html += `<section class="room-coming-wrap" aria-label="Locked rooms">
                    <button class="room-coming-toggle" id="room-coming-toggle" type="button" aria-expanded="false" aria-controls="room-coming-panel">Coming Soon (${lockedRooms.length})</button>
                    <div class="room-coming-panel" id="room-coming-panel" hidden role="list">${lockedHTML}</div>
                </section>`;
            }
            return html;
        }

        function updateRoomNavBadge() {
            const gardenBtn = document.querySelector('.room-btn[data-room="garden"]');
            if (!gardenBtn) return;
            const readyCrops = getReadyCropCount();
            const existingBadge = gardenBtn.querySelector('.garden-ready-badge');
            if (readyCrops > 0) {
                if (existingBadge) {
                    existingBadge.textContent = readyCrops;
                    existingBadge.setAttribute('aria-label', `${readyCrops} crops ready`);
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'garden-ready-badge';
                    badge.setAttribute('aria-label', `${readyCrops} crops ready`);
                    badge.textContent = readyCrops;
                    gardenBtn.appendChild(badge);
                }
            } else if (existingBadge) {
                existingBadge.remove();
            }
        }

        function getRoomStrategyText(roomId) {
            if (typeof getRoomStrategicLabel !== 'function') return '';
            const text = getRoomStrategicLabel(roomId);
            return text ? ` • ${text}` : '';
        }

        function switchRoom(roomId) {
            if (!ROOMS[roomId] || roomId === gameState.currentRoom) return;
            ensureRoomSystemsState();
            const unlockResult = unlockRoom(roomId);
            if (!unlockResult.ok) {
                showToast(`🔒 ${unlockResult.reason}`, '#FFA726');
                if (typeof GameAudio !== 'undefined' && GameAudio.playSFXByName) {
                    GameAudio.playSFXByName('error-soft', GameAudio.sfx.miss);
                }
                return;
            }
            if (!unlockResult.already) {
                showToast(`🔓 Unlocked ${ROOMS[roomId].name}!`, '#66BB6A');
            }

            const previousRoom = gameState.currentRoom;
            gameState.currentRoom = roomId;

            // Disable room-switch buttons during transition to prevent double-taps
            const roomBtns = document.querySelectorAll('.room-btn');
            roomBtns.forEach(btn => { btn.disabled = true; });
            setTimeout(() => {
                document.querySelectorAll('.room-btn').forEach(btn => { btn.disabled = false; });
            }, 600);

            // Announce room change to screen readers
            const targetRoom = ROOMS[roomId];
            if (typeof announce === 'function' && targetRoom) {
                announce(`Moved to ${targetRoom.name}`);
            }

            // Track room visit for achievements and daily checklist
            trackRoomVisit(roomId);
            if (roomId === 'park') {
                const dailyCompleted = incrementDailyProgress('parkVisits');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after room tracking
            const newAchievements = checkAchievements();
            newAchievements.forEach(ach => {
                setTimeout(() => showToast(`${ach.icon} Achievement unlocked: ${ach.name}!`, '#FFD700'), 500);
            });

            saveGame();

            // Play room transition whoosh/chime then start room-specific earcon
            if (typeof GameAudio !== 'undefined') {
                GameAudio.playSFX(GameAudio.sfx.roomTransition);
                GameAudio.enterRoom(roomId);
            }

            const room = ROOMS[roomId];

            // Re-render when switching to/from garden (garden section needs DOM update)
            if (roomId === 'garden' || previousRoom === 'garden') {
                renderPetPhase();
            } else {
                const petArea = document.querySelector('.pet-area');

                if (petArea) {
                    // Enhanced slide transition (Feature 6)
                    petArea.classList.add('room-slide-out');
                    setTimeout(() => {
                        petArea.classList.remove('room-slide-out');

                        // Update season class
                        const season = gameState.season || getCurrentSeason();
                        ['spring', 'summer', 'autumn', 'winter'].forEach(s => petArea.classList.remove('season-' + s));
                        petArea.classList.add('season-' + season);

                        // Update room class
                        ROOM_IDS.forEach(id => petArea.classList.remove('room-' + id));
                        petArea.classList.add('room-' + roomId);

                        // Update background
                        petArea.style.background = getRoomBackground(roomId, gameState.timeOfDay);
                        const roomCustom = getRoomCustomization(roomId);
                        const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
                        const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
                        petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
                        petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
                        const themeMode = getRoomThemeMode(roomId, gameState.pet);
                        petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
                        petArea.classList.add(`pet-theme-${themeMode}`);
                        petArea.setAttribute('data-current-room', roomId);
                        const activePet = gameState.pet;
                        const activePetData = activePet ? ((typeof getAllPetTypeData === 'function' ? getAllPetTypeData(activePet.type) : null) || PET_TYPES[activePet.type]) : null;
                        const petLabel = (activePet && activePet.name) || (activePetData && activePetData.name) || 'pet';
                        petArea.setAttribute('aria-label', `Your pet ${petLabel} in the ${room.name}`);

                        // Update room decor
                        const decor = petArea.querySelector('.room-decor');
                        if (decor) {
                            decor.innerHTML = getRoomDecor(roomId, gameState.timeOfDay);
                        }

                        // Update ambient layer (Feature 2)
                        const oldAmbient = petArea.querySelector('.ambient-layer');
                        if (oldAmbient) oldAmbient.remove();
                        const oldWeatherP = petArea.querySelector('.weather-particles-layer');
                        if (oldWeatherP) oldWeatherP.remove();
                        const isOutdoor = room.isOutdoor;
                        if (typeof generateAmbientLayerHTML === 'function') {
                            const weather = gameState.weather || 'sunny';
                            const ambHTML = generateAmbientLayerHTML(roomId, gameState.timeOfDay, weather, isOutdoor);
                            if (ambHTML) petArea.insertAdjacentHTML('afterbegin', ambHTML);
                            const wpHTML = typeof generateWeatherParticlesHTML === 'function' ? generateWeatherParticlesHTML(weather, isOutdoor) : '';
                            if (wpHTML) petArea.insertAdjacentHTML('afterbegin', wpHTML);
                        }

                        // Show/hide outdoor elements based on room type
                        petArea.querySelectorAll('.cloud').forEach(c => c.style.display = isOutdoor ? '' : 'none');
                        const sun = petArea.querySelector('.sun');
                        if (sun) sun.style.display = isOutdoor ? '' : 'none';
                        const starsOverlay = petArea.querySelector('.stars-overlay');
                        if (starsOverlay) starsOverlay.style.display = isOutdoor ? '' : 'none';
                        const moon = petArea.querySelector('.moon');
                        if (moon) moon.style.display = isOutdoor ? '' : 'none';

                        // Update weather display for the new room
                        updateWeatherDisplay();

                        // Slide in
                        petArea.classList.add('room-slide-in');
                        setTimeout(() => petArea.classList.remove('room-slide-in'), 350);
                    }, 250);
                }
            }

            // Update mood display since weather affects mood differently indoors/outdoors
            updatePetMood();

            // Update nav buttons
            document.querySelectorAll('.room-btn').forEach(btn => {
                const isActive = btn.dataset.room === roomId;
                const status = getRoomUnlockStatus(btn.dataset.room);
                const unlocked = !!(status && status.unlocked);
                btn.classList.toggle('active', isActive);
                btn.classList.toggle('locked', !unlocked);
                btn.setAttribute('aria-pressed', isActive);
                btn.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
                if (isActive) {
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.removeAttribute('aria-current');
                }
            });

            // Show room change notification — limit bonus toasts to first few per session
            if (room.bonus) {
                roomBonusToastCount[roomId] = (roomBonusToastCount[roomId] || 0) + 1;
                const strategyText = getRoomStrategyText(roomId);
                if (roomBonusToastCount[roomId] <= MAX_ROOM_BONUS_TOASTS) {
                    showToast(`${room.icon} ${room.name}: ${getRoomBonusLabel(roomId)}!${strategyText}`, '#4ECDC4');
                } else {
                    announce(`Moved to ${room.name}. Room bonus still active: ${getRoomBonusLabel(roomId)}.${strategyText ? ` ${strategyText.replace(' • ', '')}.` : ''}`);
                }
            } else {
                const strategyText = getRoomStrategyText(roomId);
                showToast(`${room.icon} Moved to ${room.name}${strategyText}`, '#4ECDC4');
            }
        }
