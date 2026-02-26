// ============================================================
// ui/exploration.js  --  Exploration UI
// Extracted from ui.js (lines 8271-8685)
// ============================================================

        // ==================== EXPLORATION MODAL ====================

        function formatCountdown(ms) {
            const totalSec = Math.max(0, Math.ceil((ms || 0) / 1000));
            const min = Math.floor(totalSec / 60);
            const sec = totalSec % 60;
            if (min > 0) return `${min}m ${sec}s`;
            return `${sec}s`;
        }

        function showExplorationModal() {
            const existing = document.querySelector('.exploration-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            if (typeof ensureExplorationState === 'function') ensureExplorationState();
            if (typeof updateExplorationUnlocks === 'function') updateExplorationUnlocks(true);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay exploration-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Exploration World Map');
            document.body.appendChild(overlay);

            let selectedDurationId = (Array.isArray(EXPEDITION_DURATIONS) && EXPEDITION_DURATIONS[0]) ? EXPEDITION_DURATIONS[0].id : 'scout';
            let expeditionCountdownTimer = null;
            let _expeditionTimerGeneration = 0;

            function clearExpeditionCountdownTimer() {
                _expeditionTimerGeneration++;
                if (expeditionCountdownTimer) {
                    clearTimeout(expeditionCountdownTimer);
                    expeditionCountdownTimer = null;
                }
            }

            function scheduleExpeditionCountdown() {
                clearExpeditionCountdownTimer();
                const myGeneration = _expeditionTimerGeneration;
                expeditionCountdownTimer = setTimeout(() => {
                    if (_expeditionTimerGeneration !== myGeneration) return; // stale, don't reschedule
                    if (!document.body.contains(overlay)) {
                        clearExpeditionCountdownTimer();
                        return;
                    }
                    const ex = (gameState.exploration && gameState.exploration.expedition) ? gameState.exploration.expedition : null;
                    if (!ex) {
                        clearExpeditionCountdownTimer();
                        return;
                    }
                    const remaining = Math.max(0, ex.endAt - Date.now());
                    if (remaining <= 0) {
                        renderExplorationModal();
                        return;
                    }
                    const timerEl = overlay.querySelector('#explore-expedition-time');
                    if (timerEl) timerEl.textContent = `Time left: ${formatCountdown(remaining)}`;
                    scheduleExpeditionCountdown();
                }, 1000);
            }

            function renderExplorationModal() {
                clearExpeditionCountdownTimer();
                if (typeof ensureExplorationState === 'function') ensureExplorationState();
                const ex = gameState.exploration || {};
                const expedition = ex.expedition || null;
                const expeditionReady = expedition && Date.now() >= expedition.endAt;
                const dungeon = ex.dungeon || { active: false, rooms: [], currentIndex: 0, log: [] };
                const dungeonCooldownRemaining = (dungeon && dungeon.active)
                    ? Math.max(0, (dungeon.nextRoomAt || 0) - Date.now())
                    : 0;
                const lootInventory = ex.lootInventory || {};
                const canAdopt = typeof canAdoptMore === 'function' ? canAdoptMore() : true;

                const biomeCards = Object.values(EXPLORATION_BIOMES).map((biome) => {
                    const unlocked = !!(ex.biomeUnlocks && ex.biomeUnlocks[biome.id]);
                    const discovered = !!(ex.discoveredBiomes && ex.discoveredBiomes[biome.id]);
                    const buttonDisabled = !unlocked || !!expedition || (dungeon && dungeon.active);
                    const buttonLabel = !unlocked ? 'Locked' : expedition ? 'Expedition Active' : (dungeon && dungeon.active) ? 'Dungeon Active' : 'Send Expedition';
                    return `
                        <article class="explore-biome-card ${unlocked ? 'unlocked' : 'locked'} ${discovered ? 'discovered' : ''}" aria-label="${biome.name} — ${unlocked ? 'Unlocked' : 'Locked'}${discovered ? ', Explored' : ''}">
                            <div class="explore-biome-top">
                                <span class="explore-biome-icon" aria-hidden="true">${biome.icon}</span>
                                <div>
                                    <h3 class="explore-biome-name">${biome.name}</h3>
                                    <p class="explore-biome-desc">${biome.description}</p>
                                </div>
                            </div>
                            <div class="explore-biome-meta">
                                ${unlocked ? `<span class="explore-status-tag">Unlocked</span>` : `<span class="explore-lock-hint">${biome.unlockHint}</span>`}
                                ${discovered ? '<span class="explore-discovered-tag">Explored</span>' : ''}
                            </div>
                            <button class="modal-btn ${buttonDisabled ? '' : 'confirm'}" data-start-expedition="${biome.id}" ${buttonDisabled ? 'disabled' : ''}>
                                ${buttonLabel}
                            </button>
                        </article>
                    `;
                }).join('');

                const durationOptions = (EXPEDITION_DURATIONS || []).map((d) => (
                    `<option value="${d.id}" ${d.id === selectedDurationId ? 'selected' : ''}>${d.label}</option>`
                )).join('');

                let expeditionPanel = '<p class="explore-subtext">No active expedition. Pick a biome and send your pet adventuring.</p>';
                if (expedition) {
                    const biome = EXPLORATION_BIOMES[expedition.biomeId] || { name: expedition.biomeId, icon: '🧭' };
                    const remaining = Math.max(0, expedition.endAt - Date.now());
                    expeditionPanel = `
                        <div class="explore-expedition-panel ${expeditionReady ? 'ready' : ''}">
                            <div class="explore-expedition-title">${biome.icon} ${biome.name}</div>
                            <div class="explore-expedition-meta">Pet: ${escapeHTML(expedition.petName || 'Pet')}</div>
                            <div class="explore-expedition-meta" id="explore-expedition-time">${expeditionReady ? 'Ready to collect rewards!' : `Time left: ${formatCountdown(remaining)}`}</div>
                            <button class="modal-btn confirm" id="expedition-collect-btn">${expeditionReady ? 'Collect Loot' : 'Force Return (No Loot)'}</button>
                        </div>
                    `;
                }

                const currentDungeonRoom = dungeon && dungeon.active ? dungeon.rooms[dungeon.currentIndex] : null;
                const dungeonPanel = dungeon && dungeon.active
                    ? `
                        <div class="explore-dungeon-panel active">
                            <div class="explore-expedition-title">🏰 Dungeon Crawl Active</div>
                            <div class="explore-expedition-meta">Room ${Math.min((dungeon.currentIndex || 0) + 1, dungeon.rooms.length)} of ${dungeon.rooms.length}</div>
                            ${currentDungeonRoom ? `<div class="explore-expedition-meta">Next: ${currentDungeonRoom.icon} ${currentDungeonRoom.name}</div>` : ''}
                            ${dungeonCooldownRemaining > 0 ? `<div class="explore-expedition-meta">Recovery: ${formatCountdown(dungeonCooldownRemaining)}</div>` : ''}
                            <button class="modal-btn confirm" id="dungeon-advance-btn" ${dungeonCooldownRemaining > 0 ? 'disabled' : ''}>${dungeonCooldownRemaining > 0 ? `Recovering (${formatCountdown(dungeonCooldownRemaining)})` : 'Advance Room'}</button>
                        </div>
                    `
                    : `
                        <div class="explore-dungeon-panel">
                            <div class="explore-expedition-title">🏰 Dungeon Crawl</div>
                            <div class="explore-expedition-meta">Procedurally generated rooms with escalating rewards.</div>
                            <button class="modal-btn confirm" id="dungeon-start-btn" ${expedition ? 'disabled' : ''}>Start Dungeon Crawl</button>
                        </div>
                    `;

                const dungeonLog = (dungeon.log || []).slice(0, 4).map((entry) => (
                    `<li><span aria-hidden="true">${entry.icon || '•'}</span> ${escapeHTML(entry.message || '')}</li>`
                )).join('');

                const npcCards = (ex.npcEncounters || []).slice(0, 8).map((npc) => {
                    const bond = clamp(npc.bond || 0, 0, 100);
                    const befriendDisabled = npc.status === 'adopted';
                    const adoptDisabled = npc.status === 'adopted' || !canAdopt || (!npc.adoptable && bond < 100);
                    return `
                        <article class="explore-npc-card ${npc.status === 'adopted' ? 'adopted' : ''}">
                            <div class="explore-npc-header">
                                <span class="explore-npc-icon" aria-hidden="true">${npc.icon || '🐾'}</span>
                                <div>
                                    <h4>${escapeHTML(npc.name || 'Wild Friend')}</h4>
                                    <p>${escapeHTML(npc.sourceLabel || 'Wilds')} · Bond ${bond}%</p>
                                </div>
                            </div>
                            <div class="explore-bond-bar"><span style="width:${bond}%"></span></div>
                            <div class="explore-npc-actions">
                                <button class="modal-btn" data-npc-befriend="${npc.id}" ${befriendDisabled ? 'disabled' : ''}>Befriend</button>
                                <button class="modal-btn confirm" data-npc-adopt="${npc.id}" ${adoptDisabled ? 'disabled' : ''}>Adopt</button>
                            </div>
                            ${npc.status === 'adopted' ? '<div class="explore-npc-status">Adopted</div>' : ''}
                        </article>
                    `;
                }).join('');

                const lootEntries = Object.entries(lootInventory)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([lootId, count]) => {
                        const loot = EXPLORATION_LOOT[lootId] || { emoji: '📦', name: lootId };
                        const flavor = (typeof getCollectibleFlavorText === 'function') ? getCollectibleFlavorText(lootId, 'loot') : null;
                        const titleAttr = flavor ? ` title="${escapeHTML(flavor)}" aria-label="${escapeHTML(loot.name)} x${count}. ${escapeHTML(flavor)}"` : '';
                        return `<li${titleAttr}><span aria-hidden="true">${loot.emoji}</span> ${loot.name} x${count}</li>`;
                    }).join('');

                const stats = ex.stats || {};
                const mastery = (typeof refreshMasteryTracks === 'function') ? refreshMasteryTracks() : (gameState.mastery || null);
                const biomeRanks = mastery && mastery.biomeRanks ? mastery.biomeRanks : {};
                const topBiome = Object.entries(biomeRanks).sort((a, b) => (b[1].rank || 0) - (a[1].rank || 0))[0];
                const topBiomeLabel = topBiome
                    ? `${(EXPLORATION_BIOMES[topBiome[0]] || {}).icon || '🗺️'} R${topBiome[1].rank || 1}`
                    : 'R1';

                overlay.innerHTML = `
                    <div class="exploration-modal">
                        <div class="explore-header">
                            <h2>🗺️ Exploration & World</h2>
                            <div class="explore-header-actions">
                                <button class="modal-btn" id="explore-refresh-btn">Refresh</button>
                                <button class="modal-btn" id="explore-close-btn" aria-label="Close exploration">Close</button>
                            </div>
                        </div>

                        <div class="explore-summary-grid">
                            <div class="explore-summary-card"><strong>${stats.expeditionsCompleted || 0}</strong><span>Expeditions</span></div>
                            <div class="explore-summary-card"><strong>${stats.treasuresFound || 0}</strong><span>Treasures</span></div>
                            <div class="explore-summary-card"><strong>${stats.dungeonsCleared || 0}</strong><span>Dungeons</span></div>
                            <div class="explore-summary-card"><strong>${stats.npcsAdopted || 0}</strong><span>NPC Adoptions</span></div>
                            <div class="explore-summary-card"><strong>${topBiomeLabel}</strong><span>Biome Mastery</span></div>
                        </div>

                        <section class="explore-section">
                            <h3>Expeditions</h3>
                            <label class="explore-duration-label" for="expedition-duration-select">Duration</label>
                            <select id="expedition-duration-select" class="explore-duration-select" ${expedition ? 'disabled' : ''}>
                                ${durationOptions}
                            </select>
                            ${expeditionPanel}
                        </section>

                        <section class="explore-section">
                            <h3>World Map</h3>
                            <div class="explore-biome-grid">${biomeCards}</div>
                        </section>

                        <section class="explore-section">
                            <h3>Dungeon Crawl</h3>
                            ${dungeonPanel}
                            ${dungeonLog ? `<ul class="explore-log-list">${dungeonLog}</ul>` : '<p class="explore-subtext">No dungeon log yet.</p>'}
                        </section>

                        <section class="explore-section">
                            <h3>Wild NPC Pets</h3>
                            ${npcCards || '<p class="explore-subtext">No wild friends discovered yet. Explore biomes and dungeon rooms to meet them.</p>'}
                        </section>

                        <section class="explore-section">
                            <h3>Loot Inventory</h3>
                            ${lootEntries ? `<ul class="explore-loot-list">${lootEntries}</ul>` : '<p class="explore-subtext">No loot collected yet.</p>'}
                        </section>
                    </div>
                `;

                const closeBtn = overlay.querySelector('#explore-close-btn');
                if (closeBtn) closeBtn.addEventListener('click', closeExplorationModal);
                const refreshBtn = overlay.querySelector('#explore-refresh-btn');
                if (refreshBtn) refreshBtn.addEventListener('click', renderExplorationModal);

                const durationSelect = overlay.querySelector('#expedition-duration-select');
                if (durationSelect) {
                    durationSelect.addEventListener('change', () => {
                        selectedDurationId = durationSelect.value;
                    });
                }

                overlay.querySelectorAll('[data-start-expedition]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof startExpedition !== 'function') return;
                        const biomeId = btn.getAttribute('data-start-expedition');
                        const res = startExpedition(biomeId, selectedDurationId);
                        if (!res || !res.ok) {
	                            const reasonMap = {
	                                'already-running': 'An expedition is already active.',
	                                'dungeon-active': 'Finish your dungeon crawl first.',
	                                'locked-biome': 'This biome is still locked.',
	                                'no-pet': 'You need an active pet to explore.',
	                                'insufficient-funds': 'Not enough coins for expedition upkeep.'
	                            };
                            showToast(`🧭 ${reasonMap[res.reason] || 'Could not start expedition.'}`, '#FFA726');
                            return;
                        }
                        showToast(`🧭 ${res.expedition.petName} departed for ${res.biome.name}!`, '#4ECDC4');
                        announce(`Expedition to ${res.biome.name} started.`);
                        renderExplorationModal();
                    });
                });

                const collectBtn = overlay.querySelector('#expedition-collect-btn');
                if (collectBtn) {
                    collectBtn.addEventListener('click', () => {
                        if (typeof resolveExpeditionIfReady !== 'function') return;
                        const res = resolveExpeditionIfReady(false, false);
                        if (res && !res.ok && res.reason === 'in-progress') {
                            if (typeof abandonExpedition !== 'function') {
                                showToast(`Expedition still in progress (${formatCountdown(res.remainingMs || 0)}).`, '#FFA726');
                                return;
                            }
                            const confirmAbandon = window.confirm('End this expedition early? You will receive no loot.');
                            if (!confirmAbandon) return;
                            const abandonRes = abandonExpedition(false);
                            if (!abandonRes || !abandonRes.ok) {
                                showToast('Could not end expedition right now.', '#FFA726');
                                return;
                            }
                            renderExplorationModal();
                            return;
                        }
                        if (!res || !res.ok) {
                            showToast('Expedition results are not ready yet.', '#FFA726');
                            return;
                        }
                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        renderExplorationModal();
                    });
                }

                const startDungeonBtn = overlay.querySelector('#dungeon-start-btn');
                if (startDungeonBtn) {
                    startDungeonBtn.addEventListener('click', () => {
                        if (typeof startDungeonCrawl !== 'function') return;
                        const res = startDungeonCrawl();
                        if (!res || !res.ok) {
                            const msg = res && res.reason === 'expedition-active'
                                ? 'Finish your expedition first.'
                                : 'A dungeon run is already active.';
                            showToast(`🏰 ${msg}`, '#FFA726');
                            return;
                        }
                        showToast('🏰 Dungeon crawl started!', '#4ECDC4');
                        renderExplorationModal();
                    });
                }

                const advanceDungeonBtn = overlay.querySelector('#dungeon-advance-btn');
                if (advanceDungeonBtn) {
                    advanceDungeonBtn.addEventListener('click', () => {
                        if (typeof advanceDungeonCrawl !== 'function') return;
                        const res = advanceDungeonCrawl();
                        if (!res || !res.ok) {
                            if (res && res.reason === 'cooldown') {
                                showToast(`Dungeon room recovery: ${formatCountdown(res.remainingMs || 0)}.`, '#FFA726');
                            } else if (res && res.reason === 'low-energy') {
                                showToast('Your pet is too tired. Let them rest before advancing.', '#FFA726');
                            } else {
                                showToast('Dungeon crawl is not active.', '#FFA726');
                            }
                            renderExplorationModal();
                            return;
                        }
                        showToast(`${res.message}`, '#4ECDC4');
                        // B15: Screen reader announcements for dungeon events
                        announce(`Room cleared. ${res.message}`);
                        if (res.rewards && res.rewards.length > 0) {
                            const rewardText = res.rewards.map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                            setTimeout(() => showToast(`🎁 Found ${rewardText}`, '#66BB6A'), 200);
                            const rewardNames = res.rewards.map((r) => `${r.data.name || r.data.emoji} times ${r.count}`).join(', ');
                            announce(`Found ${rewardNames}!`);
                        }
                        if (res.npc) {
                            setTimeout(() => showToast(`${res.npc.icon} Met ${res.npc.name}!`, '#FFD54F'), 350);
                            announce(`${res.npc.name} encountered.`);
                        }
                        if (res.cleared) {
                            setTimeout(() => showToast('🏆 Dungeon cleared!', '#FFD700'), 520);
                            announce('Dungeon cleared!');
                        }
                        updateNeedDisplays();
                        updatePetMood();
                        updateWellnessBar();
                        renderExplorationModal();
                    });
                }

                overlay.querySelectorAll('[data-npc-befriend]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof befriendNpc !== 'function') return;
                        const npcId = btn.getAttribute('data-npc-befriend');
                        const res = befriendNpc(npcId);
                        if (!res || !res.ok) {
                            if (res && res.reason === 'cooldown') {
                                showCooldownToast('npc-befriend', `🤝 Try again in ${formatCountdown(res.remainingMs || 0)}.`);
                            } else {
                                showToast('Could not befriend this NPC right now.', '#FFA726');
                            }
                            return;
                        }
                        showToast(`🤝 Bond +${res.gain}% with ${res.npc.name}!`, '#81C784');
                        if (res.gift) {
                            setTimeout(() => showToast(`🎁 ${res.npc.name} gifted ${res.gift.data.emoji} ${res.gift.data.name}!`, '#66BB6A'), 180);
                        }
                        renderExplorationModal();
                    });
                });

                overlay.querySelectorAll('[data-npc-adopt]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof adoptNpcPet !== 'function') return;
                        const npcId = btn.getAttribute('data-npc-adopt');
                        const res = adoptNpcPet(npcId);
                        if (!res || !res.ok) {
                            const reasonMap = {
                                'family-full': 'Your family is full. Free a slot before adopting.',
                                'bond-too-low': 'Build bond to 100% before adopting.'
                            };
                            showToast(`🏡 ${reasonMap[res.reason] || 'Could not adopt right now.'}`, '#FFA726');
                            return;
                        }
                        showToast(`🏡 ${res.pet.name} joined your family!`, '#4ECDC4');
                        if (typeof renderPetPhase === 'function') renderPetPhase();
                        renderExplorationModal();
                    });
                });

                if (expedition && !expeditionReady) {
                    scheduleExpeditionCountdown();
                } else if (dungeon && dungeon.active && dungeonCooldownRemaining > 0) {
                    const _dungeonGen = _expeditionTimerGeneration;
                    expeditionCountdownTimer = setTimeout(() => {
                        if (_expeditionTimerGeneration !== _dungeonGen) return;
                        if (!document.body.contains(overlay)) return;
                        renderExplorationModal();
                    }, 1000);
                }

            }

            function closeExplorationModal() {
                clearExpeditionCountdownTimer();
                popModalEscape(closeExplorationModal);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('explore-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeExplorationModal();
            });
            pushModalEscape(closeExplorationModal);
            overlay._closeOverlay = closeExplorationModal;
            trapFocus(overlay);
            renderExplorationModal();
            const closeBtn = overlay.querySelector('#explore-close-btn');
            if (closeBtn) closeBtn.focus();
        }
