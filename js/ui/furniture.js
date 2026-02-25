// ============================================================
// ui/furniture.js  --  Furniture placement and room decoration
// Extracted from ui.js (lines 5442-5677)
// ============================================================

        // ==================== FURNITURE CUSTOMIZATION ====================

        function showFurnitureModal() {
            const currentRoom = gameState.currentRoom || 'bedroom';
            if (typeof ensureRoomSystemsState === 'function') ensureRoomSystemsState();
            const triggerBtn = document.getElementById('furniture-btn');
            const roomConfig = ROOMS[currentRoom];
            if (!roomConfig) return;
            const roomCustom = typeof getRoomCustomization === 'function'
                ? getRoomCustomization(currentRoom)
                : { wallpaper: 'classic', flooring: 'natural', furnitureSlots: ['none', 'none'], theme: 'auto' };
            const roomFurniture = (gameState.furniture && gameState.furniture[currentRoom]) ? gameState.furniture[currentRoom] : {};
            const roomUpgradeLevel = (gameState.roomUpgrades && Number.isFinite(gameState.roomUpgrades[currentRoom]))
                ? Math.floor(gameState.roomUpgrades[currentRoom])
                : 0;
            const canUpgrade = typeof ROOM_UPGRADE_COSTS !== 'undefined' && roomUpgradeLevel < ROOM_UPGRADE_COSTS.length;
            const upgradeCost = canUpgrade ? ROOM_UPGRADE_COSTS[roomUpgradeLevel] : null;
            const nextBonusPct = roomConfig.bonus
                ? Math.round(((roomConfig.bonus.multiplier + ((roomUpgradeLevel + 1) * 0.1)) - 1) * 100)
                : null;
            const petType = gameState.pet && gameState.pet.type ? gameState.pet.type : '';
            const canAquariumTheme = petType === 'fish';
            const canNestTheme = petType === 'bird' || petType === 'penguin';
            const roomThemeMode = roomCustom.theme || 'auto';

            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'furniture-title');

            let bedOptions = '';
            let decorOptions = '';
            let wallpaperOptions = '';
            let flooringOptions = '';
            let themeOptions = '';
            let furnitureSlotOptions = '';

            if (currentRoom === 'bedroom') {
                bedOptions = `
                    <div class="customization-section">
                        <h3 class="customization-title">Choose Bed</h3>
                        <div class="furniture-options">
                            ${Object.entries(FURNITURE.beds).map(([id, bed]) => `
                                <button class="furniture-option ${roomFurniture.bed === id ? 'selected' : ''}"
                                        data-type="bed" data-id="${id}">
                                    <span class="furniture-emoji">${bed.emoji}</span>
                                    <span class="furniture-name">${bed.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            decorOptions = `
                <div class="customization-section">
                    <h3 class="customization-title">Room Decoration</h3>
                    <div class="furniture-options">
                        ${Object.entries(FURNITURE.decorations).map(([id, decor]) => `
                            <button class="furniture-option ${roomFurniture.decoration === id ? 'selected' : ''}"
                                    data-type="decoration" data-id="${id}">
                                <span class="furniture-emoji">${decor.emoji || '❌'}</span>
                                <span class="furniture-name">${decor.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            wallpaperOptions = `
                <div class="customization-section">
                    <h3 class="customization-title">Wallpaper</h3>
                    <div class="furniture-options">
                        ${Object.entries(ROOM_WALLPAPERS).map(([id, data]) => `
                            <button class="furniture-option ${roomCustom.wallpaper === id ? 'selected' : ''}" data-room-custom-type="wallpaper" data-room-custom-value="${id}">
                                <span class="furniture-emoji">🧱</span>
                                <span class="furniture-name">${data.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            flooringOptions = `
                <div class="customization-section">
                    <h3 class="customization-title">Flooring</h3>
                    <div class="furniture-options">
                        ${Object.entries(ROOM_FLOORINGS).map(([id, data]) => `
                            <button class="furniture-option ${roomCustom.flooring === id ? 'selected' : ''}" data-room-custom-type="flooring" data-room-custom-value="${id}">
                                <span class="furniture-emoji">🧩</span>
                                <span class="furniture-name">${data.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            themeOptions = `
                <div class="customization-section">
                    <h3 class="customization-title">Pet Theme Mode</h3>
                    <div class="furniture-options">
                        ${Object.entries(ROOM_THEMES).map(([id, data]) => {
                            const disallowed = (id === 'aquarium' && !canAquariumTheme) || (id === 'nest' && !canNestTheme);
                            const selected = roomThemeMode === id;
                            return `
                                <button class="furniture-option ${selected ? 'selected' : ''}${disallowed ? ' disabled' : ''}" data-room-custom-type="theme" data-room-custom-value="${id}" ${disallowed ? 'disabled' : ''} title="${disallowed ? 'Requires matching pet type.' : data.name}">
                                    <span class="furniture-emoji">${id === 'aquarium' ? '🐠' : id === 'nest' ? '🪺' : id === 'auto' ? '🪄' : '🏠'}</span>
                                    <span class="furniture-name">${data.name}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            furnitureSlotOptions = [0, 1].map((slotIdx) => `
                <div class="customization-section">
                    <h3 class="customization-title">Furniture Slot ${slotIdx + 1}</h3>
                    <div class="furniture-options">
                        ${Object.entries(ROOM_FURNITURE_ITEMS).map(([id, data]) => `
                            <button class="furniture-option ${(roomCustom.furnitureSlots && roomCustom.furnitureSlots[slotIdx] === id) ? 'selected' : ''}" data-room-custom-type="slot-${slotIdx}" data-room-custom-value="${id}">
                                <span class="furniture-emoji">${data.emoji}</span>
                                <span class="furniture-name">${data.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            overlay.innerHTML = `
                <div class="naming-modal">
                    <h2 class="naming-modal-title" id="furniture-title">🛋️ Customize ${ROOMS[currentRoom].name}</h2>
                    <p class="naming-modal-subtitle">Make this room your own. Bonus now: ${typeof getRoomBonusLabel === 'function' ? getRoomBonusLabel(currentRoom) : (roomConfig.bonus ? roomConfig.bonus.label : 'No bonus')}</p>
                    <div class="customization-section">
                        <h3 class="customization-title">Room Upgrade</h3>
                        <p class="naming-modal-subtitle" style="margin-bottom:10px;">Level ${roomUpgradeLevel}${roomConfig.bonus ? ` · ${typeof getRoomBonusLabel === 'function' ? getRoomBonusLabel(currentRoom) : roomConfig.bonus.label}` : ''}</p>
                        ${canUpgrade ? `<button class="naming-submit-btn" id="room-upgrade-btn" type="button">Upgrade (${upgradeCost} coins) → +${nextBonusPct}%</button>` : '<button class="naming-submit-btn" type="button" disabled>Max upgrade reached</button>'}
                    </div>
                    ${bedOptions}
                    ${decorOptions}
                    ${wallpaperOptions}
                    ${flooringOptions}
                    ${themeOptions}
                    ${furnitureSlotOptions}
                    <button class="naming-submit-btn" id="furniture-done">Done</button>
                </div>
            `;

            document.body.appendChild(overlay);
            const doneBtn = document.getElementById('furniture-done');
            if (doneBtn) doneBtn.focus();

            trapFocus(overlay);

            // Handle furniture selection (scoped to overlay to avoid cross-modal interference)
            overlay.querySelectorAll('.furniture-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    const id = btn.dataset.id;

                    // Update selection UI
                    overlay.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');

                    // Update game state
                    if (!gameState.furniture) gameState.furniture = {};
                    if (!gameState.furniture[currentRoom]) {
                        gameState.furniture[currentRoom] = {};
                    }
                    gameState.furniture[currentRoom][type] = id;
                    saveGame();

                    showToast(`${type === 'bed' ? 'Bed' : 'Decoration'} updated!`, '#4ECDC4');
                });
            });

            overlay.querySelectorAll('[data-room-custom-type]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const type = btn.getAttribute('data-room-custom-type');
                    const value = btn.getAttribute('data-room-custom-value');
                    if (!type || !value) return;
                    if (!gameState.roomCustomizations) gameState.roomCustomizations = {};
                    if (!gameState.roomCustomizations[currentRoom]) gameState.roomCustomizations[currentRoom] = {};
                    const custom = gameState.roomCustomizations[currentRoom];
                    if (type === 'wallpaper') custom.wallpaper = value;
                    if (type === 'flooring') custom.flooring = value;
                    if (type === 'theme') custom.theme = value;
                    if (type.startsWith('slot-')) {
                        const idx = Number(type.replace('slot-', ''));
                        if (!Array.isArray(custom.furnitureSlots)) custom.furnitureSlots = ['none', 'none'];
                        custom.furnitureSlots[idx] = value;
                    }

                    overlay.querySelectorAll(`[data-room-custom-type="${type}"]`).forEach((opt) => opt.classList.remove('selected'));
                    btn.classList.add('selected');
                    saveGame();
                    renderPetPhase();
                });
            });

            const upgradeBtn = document.getElementById('room-upgrade-btn');
            if (upgradeBtn && canUpgrade) {
                upgradeBtn.addEventListener('click', () => {
                    if (typeof spendCoins !== 'function') return;
                    const spend = spendCoins(upgradeCost, `${roomConfig.name} upgrade`);
                    if (!spend || !spend.ok) {
                        showToast(`Need ${upgradeCost} coins to upgrade ${roomConfig.name}.`, '#FF7043');
                        return;
                    }
                    if (!gameState.roomUpgrades) gameState.roomUpgrades = {};
                    gameState.roomUpgrades[currentRoom] = roomUpgradeLevel + 1;
                    saveGame();
                    showToast(`⬆️ ${roomConfig.name} upgraded! Bonus increased.`, '#66BB6A');
                    overlay.remove();
                    showFurnitureModal();
                    renderPetPhase();
                });
            }

            function closeFurniture() {
                popModalEscape(closeFurniture);
                overlay.remove();
                renderPetPhase(); // Re-render to show changes
                setTimeout(() => {
                    const refreshedBtn = document.getElementById('furniture-btn');
                    if (refreshedBtn) refreshedBtn.focus();
                    else if (triggerBtn) triggerBtn.focus();
                }, 0);
            }

            if (doneBtn) doneBtn.addEventListener('click', () => {
                closeFurniture();
            });

            pushModalEscape(closeFurniture);
        }

