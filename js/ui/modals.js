// Changelog (Retention pass): Upgraded streak modal with freeze token controls/checkpoint messaging, added journey modal scaffolding hooks, and prepared return-memory recap modal support.
// ============================================================
// ui/modals.js  --  Celebration modals, milestone fireworks,
//                   pet journal, diary, memorial hall, retirement
//                   ceremony, memorial garden, pet codex, stats,
//                   new pet, adopt egg, pet switcher, interaction,
//                   social hub, achievements, daily checklist,
//                   badges, sticker book, trophy room, daily
//                   streak, rewards hub
// Extracted from ui.js (lines 4475-4875, 4889-5441, 5678-6241,
//                        6682-7628)
// ============================================================

        // ==================== CELEBRATION MODALS ====================

        function showBirthdayCelebration(growthStage, pet) {
            const rewardData = BIRTHDAY_REWARDS[growthStage];
            if (!rewardData) return;
            const returnFocusEl = (document.activeElement && typeof document.activeElement.focus === 'function')
                ? document.activeElement
                : null;

            // Enhanced celebration: flash + confetti + fireworks + size-up animation
            createCelebrationFlash();
            createConfetti();
            createConfetti(); // Double confetti for extra impact
            createMilestoneFireworks();
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.celebration);

            // Trigger pet size-up animation
            const petContainer = document.getElementById('pet-container');
            if (petContainer) {
                petContainer.classList.add('growth-size-up');
                setTimeout(() => petContainer.classList.remove('growth-size-up'), 1500);
            }

            // Unlock accessories as rewards
            if (rewardData.accessories && pet) {
                if (!pet.unlockedAccessories) pet.unlockedAccessories = [];
                rewardData.accessories.forEach(accessoryId => {
                    if (!pet.unlockedAccessories.includes(accessoryId)) {
                        pet.unlockedAccessories.push(accessoryId);
                    }
                });
            }

            // Create celebration modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay celebration-modal growth-celebration';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'celebration-title');

            const petName = pet ? (pet.name || (getAllPetTypeData(pet.type) || {}).name || 'Your pet') : 'Your pet';
            const safePetName = escapeHTML(petName);
            const stageLabel = GROWTH_STAGES[growthStage]?.label || growthStage;
            const stageEmoji = GROWTH_STAGES[growthStage]?.emoji || '🎉';

            // Personality-aware birthday message
            let personalityMessage = rewardData.message;
            if (pet && typeof getBirthdayPersonalityMessage === 'function') {
                const pMsg = getBirthdayPersonalityMessage(pet, growthStage);
                if (pMsg) personalityMessage = pMsg;
            }
            const safePersonalityMessage = escapeHTML(personalityMessage);

            // Retrospective stat
            let retrospectiveHTML = '';
            if (pet && typeof getBirthdayRetrospective === 'function') {
                const retro = getBirthdayRetrospective(pet);
                if (retro) retrospectiveHTML = `<p class="celebration-retrospective" style="font-size:0.82rem;color:#8D6E63;margin-top:8px;font-style:italic;">${escapeHTML(retro)}</p>`;
            }

            // Generate pet SVG for the celebration display
            const petSVGHTML = pet ? generatePetSVG(pet, 'happy') : '';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon">${rewardData.title}</div>
                    </div>
                    <div class="celebration-pet-display" aria-hidden="true">
                        ${petSVGHTML}
                    </div>
                    <h2 class="modal-title" id="celebration-title"><span aria-hidden="true">${stageEmoji}</span> ${safePetName} is now a ${stageLabel}! <span aria-hidden="true">${stageEmoji}</span></h2>
                    <p class="modal-message celebration-message">${safePersonalityMessage}</p>
                    ${retrospectiveHTML}
                    <div class="rewards-display">
                        <p class="reward-title"><span aria-hidden="true">🎁</span> ${rewardData.unlockMessage}</p>
                        <div class="reward-accessories">
                            ${(rewardData.accessories || []).map(accId => {
                                const acc = ACCESSORIES[accId];
                                return acc ? `<span class="reward-item">${acc.emoji} ${acc.name}</span>` : '';
                            }).join('')}
                        </div>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn" id="celebration-ok">
                            <span aria-hidden="true">🎊</span> Celebrate! <span aria-hidden="true">🎊</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('celebration-ok');
            okBtn.focus();

            function closeModal() {
                popModalEscape(closeModal);
                animateModalClose(modal, () => {
                    document.querySelectorAll('.confetti-container').forEach(c => c.remove());
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                    if (returnFocusEl && document.contains(returnFocusEl) && typeof returnFocusEl.focus === 'function') {
                        returnFocusEl.focus();
                    } else {
                        const fallback = document.getElementById('pet-btn') || document.getElementById('feed-btn');
                        if (fallback) fallback.focus();
                    }
                });
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            pushModalEscape(closeModal);
            trapFocus(modal);
        }

        function showEvolutionCelebration(pet, evolutionData) {
            if (!pet) return;
            const returnFocusEl = (document.activeElement && typeof document.activeElement.focus === 'function')
                ? document.activeElement
                : null;
            // Enhanced celebration: flash + double confetti + fireworks
            createCelebrationFlash();
            createConfetti();
            createConfetti();
            createMilestoneFireworks();
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.celebration);

            // Trigger pet size-up animation
            const petContainer = document.getElementById('pet-container');
            if (petContainer) {
                petContainer.classList.add('growth-size-up');
                setTimeout(() => petContainer.classList.remove('growth-size-up'), 1500);
            }

            // Create evolution modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay celebration-modal evolution-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'evolution-title');

            const petName = pet ? (pet.name || evolutionData.name) : evolutionData.name;
            const safePetName = escapeHTML(petName);
            const qualityLabel = CARE_QUALITY[pet.careQuality]?.label || 'Excellent';

            modal.innerHTML = `
                <div class="modal-content celebration-content">
                    <div class="celebration-header">
                        <div class="celebration-icon evolution-icon"><span aria-hidden="true">✨</span> EVOLUTION! <span aria-hidden="true">✨</span></div>
                    </div>
                    <h2 class="modal-title" id="evolution-title">${evolutionData.emoji} ${safePetName} ${evolutionData.emoji}</h2>
                    <p class="modal-message celebration-message">
                        Thanks to your ${qualityLabel.toLowerCase()} care, your pet has evolved into a special form!
                    </p>
                    <div class="evolution-display">
                        <div class="evolution-sparkle" aria-hidden="true">✨🌟⭐🌟✨</div>
                        <p class="evolution-subtitle">A rare and beautiful transformation!</p>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm celebration-btn evolution-btn" id="evolution-ok">
                            <span aria-hidden="true">⭐</span> Amazing! <span aria-hidden="true">⭐</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = document.getElementById('evolution-ok');
            okBtn.focus();

            function closeModal() {
                popModalEscape(closeModal);
                animateModalClose(modal, () => {
                    // Remove confetti before re-rendering
                    document.querySelectorAll('.confetti-container').forEach(c => c.remove());
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                    // Re-render to show evolved appearance
                    if (typeof renderPetPhase === 'function') {
                        renderPetPhase();
                    }
                    if (returnFocusEl && document.contains(returnFocusEl) && typeof returnFocusEl.focus === 'function') {
                        returnFocusEl.focus();
                    } else {
                        const fallback = document.getElementById('pet-btn') || document.getElementById('feed-btn');
                        if (fallback) fallback.focus();
                    }
                });
            }

            okBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            pushModalEscape(closeModal);
            trapFocus(modal);
        }

        function isReducedMotionEnabled() {
            const manual = document.documentElement.getAttribute('data-reduced-motion') === 'true';
            const system = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            return manual || system;
        }

        function createCelebrationFlash() {
            if (isReducedMotionEnabled()) return;
            const flash = document.createElement('div');
            flash.className = 'celebration-flash';
            flash.setAttribute('aria-hidden', 'true');
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
        }

        function triggerPetCelebrationPulse() {
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;
            petContainer.classList.add('celebration-pulse');
            petContainer.addEventListener('animationend', function handler() {
                petContainer.classList.remove('celebration-pulse');
                petContainer.removeEventListener('animationend', handler);
            });
            // Fallback removal
            setTimeout(() => petContainer.classList.remove('celebration-pulse'), 1500);
        }

        function createConfetti() {
            if (isReducedMotionEnabled()) return;
            const container = document.createElement('div');
            container.className = 'confetti-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                overflow: hidden;
            `;

            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
            const shapes = ['🎉', '🎊', '⭐', '✨', '🌟', '💫'];

            // Create 10 confetti pieces with individual random rotations
            for (let i = 0; i < 10; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-piece';

                const isEmoji = Math.random() > 0.5;
                if (isEmoji) {
                    confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
                    confetti.style.fontSize = (10 + Math.random() * 15) + 'px';
                } else {
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.width = (5 + Math.random() * 10) + 'px';
                    confetti.style.height = (5 + Math.random() * 10) + 'px';
                }

                const rotation = 360 + Math.random() * 720;
                const sway = (Math.random() - 0.5) * 60; // horizontal drift in px
                confetti.style.cssText += `
                    position: absolute;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    opacity: ${0.6 + Math.random() * 0.4};
                    --confetti-rotation: ${rotation}deg;
                    --confetti-sway: ${sway}px;
                    animation: confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s;
                    animation-fill-mode: forwards;
                `;

                container.appendChild(confetti);
            }

            // Add/update CSS animation using per-piece custom properties for variation
            let confettiStyle = document.getElementById('confetti-style');
            if (!confettiStyle || confettiStyle.tagName !== 'STYLE') {
                if (confettiStyle) confettiStyle.removeAttribute('id');
                confettiStyle = document.createElement('style');
                confettiStyle.id = 'confetti-style';
                document.head.appendChild(confettiStyle);
            }
            confettiStyle.textContent = `
                @keyframes confetti-fall {
                    to {
                        transform: translateY(100vh) translateX(var(--confetti-sway, 0px)) rotate(var(--confetti-rotation, 720deg));
                        opacity: 0;
                    }
                }
            `;

            document.body.appendChild(container);
            setTimeout(() => {
                if (container.parentNode) container.remove();
                if (!document.querySelector('.confetti-container')) {
                    const confettiStyleEl = document.getElementById('confetti-style');
                    if (confettiStyleEl) confettiStyleEl.remove();
                }
            }, 5200);
        }

        // ==================== MILESTONE FIREWORKS ====================
        function createMilestoneFireworks() {
            if (isReducedMotionEnabled()) return;
            const container = document.createElement('div');
            container.className = 'fireworks-container';
            container.setAttribute('aria-hidden', 'true');
            container.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 9999; overflow: hidden;
            `;

            const burstCount = 5;
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FF69B4', '#87CEEB'];

            for (let b = 0; b < burstCount; b++) {
                const burstX = 15 + Math.random() * 70;
                const burstY = 15 + Math.random() * 50;
                const burstDelay = b * 400 + Math.random() * 300;
                const particleCount = 12 + Math.floor(Math.random() * 8);

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'firework-particle';
                    const angle = (i / particleCount) * (Math.PI * 2);
                    const distance = 40 + Math.random() * 60;
                    const dx = Math.cos(angle) * distance;
                    const dy = Math.sin(angle) * distance;
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const size = 3 + Math.random() * 5;

                    particle.style.cssText = `
                        position: absolute;
                        left: ${burstX}%;
                        top: ${burstY}%;
                        width: ${size}px;
                        height: ${size}px;
                        background: ${color};
                        border-radius: 50%;
                        box-shadow: 0 0 ${size * 2}px ${color};
                        --fw-x: ${dx.toFixed(2)}px;
                        --fw-y: ${dy.toFixed(2)}px;
                        animation: fireworkBurst 1.2s ease-out ${burstDelay}ms forwards;
                    `;
                    container.appendChild(particle);
                }

                // Add emoji sparkles at burst center
                const sparkles = ['✨', '🌟', '⭐', '💫'];
                const sparkle = document.createElement('div');
                sparkle.className = 'firework-sparkle';
                sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
                sparkle.style.cssText = `
                    position: absolute;
                    left: ${burstX}%;
                    top: ${burstY}%;
                    font-size: ${18 + Math.random() * 14}px;
                    animation: fireworkSparkle 0.8s ease-out ${burstDelay + 100}ms forwards;
                    opacity: 0;
                `;
                container.appendChild(sparkle);
            }

            // Add/update CSS animation
            let fwStyle = document.getElementById('fireworks-style');
            if (!fwStyle || fwStyle.tagName !== 'STYLE') {
                if (fwStyle) fwStyle.removeAttribute('id');
                fwStyle = document.createElement('style');
                fwStyle.id = 'fireworks-style';
                document.head.appendChild(fwStyle);
            }
            fwStyle.textContent = `
                @keyframes fireworkBurst {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% {
                        transform: translate(var(--fw-x), var(--fw-y)) scale(0);
                        opacity: 0;
                    }
                }
                @keyframes fireworkSparkle {
                    0% { transform: scale(0); opacity: 0; }
                    30% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(0.5); opacity: 0; }
                }
            `;

            document.body.appendChild(container);
            setTimeout(() => {
                container.remove();
                const styleEl = document.getElementById('fireworks-style');
                if (styleEl) styleEl.remove();
            }, 4000);
        }


        // ==================== PET JOURNAL MODAL ====================

        function showJournalModal() {
            const existing = document.querySelector('.journal-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const journal = gameState.journal || [];
            const overlay = document.createElement('div');
            overlay.className = 'journal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Journal');

            let entriesHTML = '';
            if (journal.length === 0) {
                entriesHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📔</div>
                        <div class="empty-state-text">No journal entries yet. Keep caring for your pet to create memories!</div>
                    </div>
                `;
            } else {
                // Show newest first
                const reversed = [...journal].reverse();
                entriesHTML = reversed.map(entry => {
                    const date = new Date(entry.timestamp);
                    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="journal-entry">
                            <span class="journal-entry-icon" aria-hidden="true">${escapeHTML(entry.icon)}</span>
                            <div class="journal-entry-content">
                                <span class="journal-entry-text">${escapeHTML(entry.text)}</span>
                                <span class="journal-entry-time">${dateStr} ${timeStr}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            overlay.innerHTML = `
                <div class="journal-modal">
                    <h2 class="journal-title">📔 Pet Journal</h2>
                    <div class="journal-entries">${entriesHTML}</div>
                    <button class="journal-close" id="journal-close" aria-label="Close journal">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeJournal() {
                popModalEscape(closeJournal);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('journal-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelector('#journal-close').focus();
            overlay.querySelector('#journal-close').addEventListener('click', closeJournal);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeJournal(); });
            pushModalEscape(closeJournal);
            overlay._closeOverlay = closeJournal;
            trapFocus(overlay);
        }

        // ==================== PET DIARY ====================

        function showDiaryModal() {
            const existing = document.querySelector('.diary-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const entries = (typeof getDiaryEntries === 'function') ? getDiaryEntries() : (gameState.diary || []);
            const overlay = document.createElement('div');
            overlay.className = 'diary-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Diary');

            let entriesHTML = '';
            if (entries.length === 0) {
                entriesHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📖</div>
                        <div class="empty-state-text">No diary entries yet. Come back tomorrow to see your pet's first diary page!</div>
                    </div>
                `;
            } else {
                // Show newest first
                const reversed = [...entries].reverse();
                entriesHTML = reversed.map(entry => {
                    const dateStr = entry.isToday
                        ? 'Today (so far...)'
                        : formatDiaryDate(entry.date);
                    const qualityClass = 'diary-quality-' + (entry.quality || 'average');
                    const todayClass = entry.isToday ? ' diary-entry-today' : '';

                    // Build activity list
                    const activitiesHTML = (entry.activities && entry.activities.length > 0)
                        ? entry.activities.map(a => `<li>${escapeHTML(a)}</li>`).join('')
                        : '<li>A quiet day with no recorded activities.</li>';

                    return `
                        <article class="diary-entry${todayClass}" aria-label="Diary entry for ${escapeHTML(dateStr)}">
                            <div class="diary-entry-header">
                                <span class="diary-entry-date">${escapeHTML(dateStr)}</span>
                                <span class="diary-entry-quality ${qualityClass}">${escapeHTML(entry.quality || 'average')}</span>
                            </div>
                            <p class="diary-entry-opening">${escapeHTML(entry.opening || '')}</p>
                            ${entry.seasonal ? `<p class="diary-entry-seasonal">${escapeHTML(entry.seasonal)}</p>` : ''}
                            <ul class="diary-entry-activities" aria-label="Activities">${activitiesHTML}</ul>
                            <p class="diary-entry-mood">${escapeHTML(entry.mood || '')}</p>
                            <blockquote class="diary-entry-closing">${escapeHTML(entry.closing || '')}</blockquote>
                        </article>
                    `;
                }).join('');
            }

            overlay.innerHTML = `
                <div class="diary-modal">
                    <h2 class="diary-title">📖 ${escapeHTML((gameState.pet && gameState.pet.name) || 'Pet')}'s Diary</h2>
                    <div class="diary-entries" role="log" aria-label="Diary entries">${entriesHTML}</div>
                    <button class="diary-close" id="diary-close" aria-label="Close diary">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeDiary() {
                popModalEscape(closeDiary);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('diary-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelector('#diary-close').focus();
            overlay.querySelector('#diary-close').addEventListener('click', closeDiary);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDiary(); });
            pushModalEscape(closeDiary);
            overlay._closeOverlay = closeDiary;
            trapFocus(overlay);
        }

        function formatDiaryDate(dateStr) {
            if (!dateStr) return 'Unknown date';
            // Handle YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const parts = dateStr.split('-');
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            }
            // Handle ISO date string
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        }

        // ==================== PET MEMORIAL HALL ====================

        function showMemorialHall() {
            const existing = document.querySelector('.memorial-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const memorials = typeof getMemorials === 'function' ? getMemorials() : (gameState.memorials || []);
            const pet = gameState.pet;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay memorial-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Hall of Fame');

            // Memorial entries HTML
            let memorialsHTML = '';
            if (memorials.length === 0) {
                memorialsHTML = `<div class="memorial-empty">
                    <p>🏛️ The Hall of Fame is empty.</p>
                    <p class="memorial-empty-hint">Retire an adult or elder pet to honor them here forever.</p>
                </div>`;
            } else {
                memorialsHTML = memorials.map(m => {
                    const petTypeData = getAllPetTypeData(m.type);
                    const emoji = petTypeData ? petTypeData.emoji : '🐾';
                    const personalityData = m.personality && typeof PERSONALITY_TRAITS !== 'undefined' ? PERSONALITY_TRAITS[m.personality] : null;
                    const personalityLabel = personalityData ? `${personalityData.emoji} ${personalityData.label}` : '';
                    const retiredDate = new Date(m.retiredAt).toLocaleDateString();
                    const birthDate = new Date(m.birthdate).toLocaleDateString();
                    return `<div class="memorial-card ${m.growthStage === 'elder' ? 'elder-memorial' : ''} ${m.evolutionStage === 'evolved' ? 'evolved-memorial' : ''}">
                        <div class="memorial-header">
                            <span class="memorial-emoji">${emoji}</span>
                            <div class="memorial-name-wrap">
                                <span class="memorial-name">${escapeHTML(m.name)}</span>
                                <span class="memorial-title">${escapeHTML(m.title || '')}</span>
                            </div>
                        </div>
                        <div class="memorial-details">
                            <span class="memorial-detail">${personalityLabel}</span>
                            <span class="memorial-detail">📅 ${birthDate} — ${retiredDate}</span>
                            <span class="memorial-detail">⏰ ${m.ageHours}h lived</span>
                            <span class="memorial-detail">💝 ${m.careActions} care actions</span>
                            <span class="memorial-detail">${CARE_QUALITY[m.careQuality] ? CARE_QUALITY[m.careQuality].emoji : ''} ${m.careQuality} care</span>
                            ${m.isHybrid ? '<span class="memorial-detail">🧬 Hybrid</span>' : ''}
                            ${m.hasMutation ? '<span class="memorial-detail">🌈 Mutation</span>' : ''}
                            ${m.farewellMessage ? `<span class="memorial-detail memorial-farewell" style="font-style:italic;color:#8D6E63;display:block;margin-top:4px;">✉️ "${escapeHTML(m.farewellMessage)}"</span>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }

            // Retire current pet button (only if eligible)
            let retireHTML = '';
            if (pet && gameState.pets && gameState.pets.length > 1) {
                const allowedStages = Array.isArray(MEMORIAL_CONFIG.retirementAllowedStages) && MEMORIAL_CONFIG.retirementAllowedStages.length
                    ? MEMORIAL_CONFIG.retirementAllowedStages
                    : ['adult', 'elder'];
                const ageHours = typeof getPetAge === 'function' ? getPetAge(pet) : 0;
                const canRetire = allowedStages.includes(pet.growthStage) && ageHours >= MEMORIAL_CONFIG.retirementMinAge;
                const petName = escapeHTML(pet.name || 'Pet');
                if (canRetire) {
                    retireHTML = `<button class="memorial-retire-btn" id="memorial-retire-btn">🌅 Retire ${petName} to Hall of Fame</button>`;
                } else {
                    let reason = '';
                    if (!allowedStages.includes(pet.growthStage)) reason = `Must be ${allowedStages.join(' or ')} stage`;
                    else if (ageHours < MEMORIAL_CONFIG.retirementMinAge) reason = `Must be ${MEMORIAL_CONFIG.retirementMinAge}h+ old`;
                    retireHTML = `<p class="memorial-retire-hint">🌅 ${petName} can't retire yet: ${reason}</p>`;
                }
            } else if (pet && (!gameState.pets || gameState.pets.length <= 1)) {
                retireHTML = `<p class="memorial-retire-hint">🌅 Adopt another pet first — you need at least one pet remaining!</p>`;
            }

            // Mentor assignment UI (show if there's an elder and a non-elder)
            let mentorHTML = '';
            if (gameState.pets && gameState.pets.length > 1) {
                const elders = gameState.pets.filter(p => p && p.growthStage === 'elder');
                const youngPets = gameState.pets.filter(p => p && p.growthStage !== 'elder' && !p._mentorId);
                if (elders.length > 0 && youngPets.length > 0) {
                    mentorHTML = `<div style="margin-top:8px;padding:8px;background:#F3E5F5;border-radius:8px;">
                        <p style="font-size:0.82rem;font-weight:600;color:#6A1B9A;margin-bottom:6px;">🎓 Elder Mentoring</p>
                        <p style="font-size:0.75rem;color:#7B1FA2;margin-bottom:6px;">Elder pets can mentor younger pets, boosting their growth!</p>
                        ${elders.map(elder => {
                            const elderName = escapeHTML(elder.name || 'Elder');
                            return youngPets.map(young => {
                                const youngName = escapeHTML(young.name || 'Pet');
                                return `<button class="modal-btn confirm" style="font-size:0.75rem;padding:4px 8px;margin:2px;" data-mentor-elder="${elder.id}" data-mentor-young="${young.id}">🎓 ${elderName} → ${youngName}</button>`;
                            }).join('');
                        }).join('')}
                    </div>`;
                }
            }

            overlay.innerHTML = `
                <div class="modal-content memorial-content">
                    <h2 class="memorial-title-header">🏛️ Hall of Fame</h2>
                    <p class="memorial-subtitle">${memorials.length} ${memorials.length === 1 ? 'pet' : 'pets'} honored</p>
                    <div class="memorial-list">
                        ${memorialsHTML}
                    </div>
                    ${memorials.length > 0 ? `<button class="modal-btn" id="memorial-garden-btn" style="margin-top:8px;background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9;">🌿 Visit Memorial Garden</button>` : ''}
                    ${mentorHTML}
                    ${retireHTML}
                    <button class="modal-btn cancel" id="memorial-close" aria-label="Close memorial hall">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeMemorial() {
                popModalEscape(closeMemorial);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('memorial-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelector('#memorial-close').focus();
            overlay.querySelector('#memorial-close').addEventListener('click', closeMemorial);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMemorial(); });
            pushModalEscape(closeMemorial);
            overlay._closeOverlay = closeMemorial;
            trapFocus(overlay);

            // Memorial Garden button
            const gardenBtn = overlay.querySelector('#memorial-garden-btn');
            if (gardenBtn) {
                gardenBtn.addEventListener('click', () => {
                    if (typeof showMemorialGarden === 'function') showMemorialGarden();
                });
            }

            // Mentor assignment buttons
            overlay.querySelectorAll('[data-mentor-elder]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const elderId = parseInt(btn.getAttribute('data-mentor-elder'));
                    const youngId = parseInt(btn.getAttribute('data-mentor-young'));
                    if (typeof assignMentor === 'function') {
                        const success = assignMentor(elderId, youngId);
                        if (success) {
                            btn.textContent = '✅ Assigned!';
                            btn.disabled = true;
                        } else {
                            showToast('Could not assign mentor. Check requirements.', '#FF7043');
                        }
                    }
                });
            });

            // Retire button handler
            const retireBtn = overlay.querySelector('#memorial-retire-btn');
            if (retireBtn) {
                retireBtn.addEventListener('click', () => {
                    // Confirmation dialog
                    const confirmOverlay = document.createElement('div');
                    confirmOverlay.className = 'modal-overlay';
                    confirmOverlay.setAttribute('role', 'alertdialog');
                    confirmOverlay.setAttribute('aria-modal', 'true');
                    confirmOverlay.setAttribute('aria-label', 'Confirm retirement');
                    const petName = escapeHTML(gameState.pet.name || 'Pet');
                    confirmOverlay.innerHTML = `
                        <div class="modal-content">
                            <h2 class="modal-title">Retire ${petName}?</h2>
                            <div class="confirm-dialog-warning">
                                <span aria-hidden="true">🌅</span>
                                <span>${petName} will be honored in the Hall of Fame forever. This cannot be undone.</span>
                            </div>
                            <div class="modal-buttons modal-buttons-col">
                                <button class="modal-btn cancel" id="retire-cancel">Keep ${petName}</button>
                                <button class="modal-btn confirm" id="retire-confirm">🌅 Retire ${petName}</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(confirmOverlay);
                    const cancelRetire = confirmOverlay.querySelector('#retire-cancel');
                    const confirmRetire = confirmOverlay.querySelector('#retire-confirm');
                    cancelRetire.focus();
                    function closeConfirm() { confirmOverlay.remove(); popModalEscape(closeConfirm); }
                    cancelRetire.addEventListener('click', closeConfirm);
                    confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(); });
                    pushModalEscape(closeConfirm);
                    trapFocus(confirmOverlay);
                    confirmRetire.addEventListener('click', () => {
                        closeConfirm();
                        // Multi-step retirement ceremony
                        showRetirementCeremony(gameState.pet, gameState.activePetIndex, () => {
                            closeMemorial();
                            renderPetPhase();
                        });
                    });
                });
            }
        }

        // ==================== RETIREMENT CEREMONY ====================

        function showRetirementCeremony(pet, petIndex, onComplete) {
            if (!pet) return;
            const petName = escapeHTML(pet.name || 'Pet');
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
            const ageHours = typeof getPetAge === 'function' ? Math.round(getPetAge(pet)) : 0;
            const careActions = pet.careActions || 0;
            const stagesVisited = [];
            for (const stage of ['baby', 'child', 'adult', 'elder']) {
                if (GROWTH_ORDER.indexOf(stage) <= GROWTH_ORDER.indexOf(pet.growthStage)) {
                    stagesVisited.push(GROWTH_STAGES[stage] ? `${GROWTH_STAGES[stage].emoji} ${GROWTH_STAGES[stage].label}` : stage);
                }
            }
            const personalityLabel = pet.personality && PERSONALITY_TRAITS[pet.personality] ? `${PERSONALITY_TRAITS[pet.personality].emoji} ${PERSONALITY_TRAITS[pet.personality].label}` : '';
            const careQualityLabel = pet.careQuality && CARE_QUALITY[pet.careQuality] ? `${CARE_QUALITY[pet.careQuality].emoji} ${CARE_QUALITY[pet.careQuality].label}` : '';
            const petSVGHTML = typeof generatePetSVG === 'function' ? generatePetSVG(pet, 'happy') : '';

            // Step 1: Life montage
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay celebration-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Retirement ceremony');
            overlay.innerHTML = `
                <div class="modal-content celebration-content" style="max-width:380px;">
                    <h2 class="modal-title" style="margin-bottom:12px;">🌅 A Life Well Lived</h2>
                    <div style="width:80px;height:80px;margin:0 auto 12px;" aria-hidden="true">${petSVGHTML}</div>
                    <p style="font-size:1.05rem;font-weight:600;margin-bottom:8px;">${petName}'s Journey</p>
                    <div style="text-align:left;font-size:0.85rem;color:#5D4037;margin-bottom:12px;line-height:1.6;">
                        <div>🕐 ${ageHours} hours together</div>
                        <div>💝 ${careActions} moments of care</div>
                        <div>📖 Stages: ${stagesVisited.join(' → ')}</div>
                        ${personalityLabel ? `<div>🎭 ${personalityLabel}</div>` : ''}
                        ${careQualityLabel ? `<div>⭐ ${careQualityLabel} care quality</div>` : ''}
                    </div>
                    <p style="font-style:italic;color:#8D6E63;font-size:0.85rem;margin-bottom:16px;">Every moment mattered. Every care action was an act of love.</p>
                    <button class="modal-btn confirm" id="ceremony-next" style="width:100%;">Continue</button>
                </div>
            `;
            document.body.appendChild(overlay);
            if (typeof createConfetti === 'function') createConfetti();

            overlay.querySelector('#ceremony-next').focus();
            overlay.querySelector('#ceremony-next').addEventListener('click', () => {
                // Step 2: Farewell message
                overlay.querySelector('.modal-content').innerHTML = `
                    <h2 class="modal-title" style="margin-bottom:12px;">✉️ A Farewell Message</h2>
                    <p style="font-size:0.88rem;color:#5D4037;margin-bottom:12px;">Write a farewell message for ${petName}. It will be saved in their memorial forever.</p>
                    <textarea id="farewell-message" rows="3" maxlength="200" placeholder="Goodbye, ${petName}... I'll always remember you."
                        style="width:100%;border:2px solid #D7CCC8;border-radius:8px;padding:8px;font-size:0.88rem;font-family:inherit;resize:none;box-sizing:border-box;"
                        aria-label="Farewell message for ${petName}"></textarea>
                    <p style="font-size:0.72rem;color:#999;margin:4px 0 12px;"><span id="farewell-count">0</span>/200 characters</p>
                    <button class="modal-btn confirm" id="ceremony-farewell" style="width:100%;">🌅 Say Goodbye</button>
                `;

                const ta = overlay.querySelector('#farewell-message');
                const counter = overlay.querySelector('#farewell-count');
                ta.focus();
                ta.addEventListener('input', () => { counter.textContent = ta.value.length; });

                overlay.querySelector('#ceremony-farewell').addEventListener('click', () => {
                    const farewell = ta.value.trim();

                    // Save farewell message to pet before retirement
                    if (gameState.pet) gameState.pet._farewellMessage = farewell;

                    // Perform the actual retirement
                    const result = typeof retirePet === 'function' ? retirePet(petIndex) : null;
                    if (result && result.success) {
                        // Save farewell to the memorial
                        if (farewell && gameState.memorials && gameState.memorials.length > 0) {
                            const lastMemorial = gameState.memorials[gameState.memorials.length - 1];
                            if (lastMemorial && lastMemorial.id === result.memorial.id) {
                                lastMemorial.farewellMessage = farewell;
                            }
                        }

                        // Step 3: Final farewell screen
                        overlay.querySelector('.modal-content').innerHTML = `
                            <h2 class="modal-title" style="margin-bottom:8px;">🌅 Farewell, ${petName}</h2>
                            <div style="width:70px;height:70px;margin:0 auto 8px;opacity:0.7;" aria-hidden="true">${petSVGHTML}</div>
                            <p style="font-size:0.9rem;color:#5D4037;margin-bottom:8px;">${petName} has been honored in the Hall of Fame.</p>
                            ${farewell ? `<p style="font-style:italic;color:#8D6E63;font-size:0.85rem;margin-bottom:8px;border-left:3px solid #D7CCC8;padding-left:8px;">"${escapeHTML(farewell)}"</p>` : ''}
                            <p style="font-size:0.82rem;color:#A1887F;">You can visit ${petName} anytime in the Memorial Garden.</p>
                            <button class="modal-btn confirm" id="ceremony-done" style="width:100%;margin-top:12px;">🕊️ Rest well, ${petName}</button>
                        `;
                        if (typeof createConfetti === 'function') createConfetti();
                        if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.celebration);

                        overlay.querySelector('#ceremony-done').focus();
                        overlay.querySelector('#ceremony-done').addEventListener('click', () => {
                            animateModalClose(overlay, () => {});
                            showToast(`🌅 ${petName} has been retired to the Hall of Fame! ${result.memorial.title}`, '#DDA0DD');
                            if (typeof grantSticker === 'function') grantSticker('memorialSticker');
                            if (typeof checkAchievements === 'function') {
                                const newAch = checkAchievements();
                                newAch.forEach(ach => {
                                    setTimeout(() => {
                                        showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                        queueRewardCard('achievement', ach, '#FFD700');
                                    }, 500);
                                });
                            }
                            if (typeof saveGame === 'function') saveGame();
                            if (onComplete) onComplete();
                        });
                    } else {
                        overlay.remove();
                        if (result) showToast(`Cannot retire: ${result.reason}`, '#FF7043');
                        if (onComplete) onComplete();
                    }
                });
            });

            pushModalEscape(() => { overlay.remove(); });
            trapFocus(overlay);
        }

        // ==================== MEMORIAL GARDEN ====================

        function showMemorialGarden() {
            const memorials = gameState.memorials || [];
            const existing = document.querySelector('.memorial-garden-overlay');
            if (existing) { existing.remove(); }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay memorial-garden-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Memorial Garden');

            let gardenHTML = '';
            if (memorials.length === 0) {
                gardenHTML = `<p style="text-align:center;color:#A1887F;font-style:italic;padding:24px;">The garden is peaceful and quiet. No memorials yet.</p>`;
            } else {
                gardenHTML = `<div class="memorial-garden-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:12px;padding:12px;">
                    ${memorials.map(m => {
                        const typeData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(m.type) : null) || PET_TYPES[m.type] || { emoji: '🐾' };
                        const personalityData = m.personality && PERSONALITY_TRAITS[m.personality] ? PERSONALITY_TRAITS[m.personality] : null;
                        const farewellText = m.farewellMessage ? escapeHTML(m.farewellMessage) : '';
                        return `<div class="memorial-ghost-sprite" style="text-align:center;padding:12px 8px;background:rgba(255,255,255,0.5);border-radius:12px;border:1px solid rgba(0,0,0,0.06);cursor:pointer;" title="${farewellText || 'Click to remember'}" data-memorial-id="${m.id}">
                            <div style="font-size:2rem;opacity:0.6;filter:grayscale(30%) drop-shadow(0 0 6px rgba(186,148,222,0.5));" aria-hidden="true">${typeData.emoji}</div>
                            <div style="font-size:0.78rem;font-weight:600;color:#5D4037;margin-top:4px;">${escapeHTML(m.name)}</div>
                            ${personalityData ? `<div style="font-size:0.68rem;color:#8D6E63;">${personalityData.emoji} ${personalityData.label}</div>` : ''}
                            <div style="font-size:0.65rem;color:#A1887F;margin-top:2px;">${m.title || ''}</div>
                        </div>`;
                    }).join('')}
                </div>`;
            }

            overlay.innerHTML = `
                <div class="modal-content" style="max-width:420px;">
                    <h2 class="modal-title" style="margin-bottom:4px;">🌿 Memorial Garden</h2>
                    <p style="font-size:0.8rem;color:#A1887F;margin-bottom:12px;">A peaceful place to remember those who came before.</p>
                    ${gardenHTML}
                    <button class="modal-btn cancel" id="memorial-garden-close" style="margin-top:12px;">Return</button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Click on a memorial ghost to see their speech bubble
            overlay.querySelectorAll('.memorial-ghost-sprite').forEach(sprite => {
                sprite.addEventListener('click', () => {
                    const mid = parseInt(sprite.getAttribute('data-memorial-id'));
                    const memorial = memorials.find(m => m.id === mid);
                    if (!memorial) return;
                    const name = memorial.name || 'Pet';
                    const farewell = memorial.farewellMessage;
                    let speechText = farewell ? `"${farewell}"` : `${name} smiles gently at you from the garden.`;
                    // Add personality-based ghost speech
                    const personality = memorial.personality || 'playful';
                    if (!farewell && typeof ELDER_WISDOM_SPEECHES !== 'undefined' && ELDER_WISDOM_SPEECHES[personality]) {
                        const wisdomPool = ELDER_WISDOM_SPEECHES[personality];
                        speechText = wisdomPool[Math.floor(Math.random() * wisdomPool.length)];
                    }
                    showToast(`🕊️ ${name}: ${speechText}`, '#CE93D8');
                });
            });

            function closeGarden() {
                popModalEscape(closeGarden);
                animateModalClose(overlay, () => {});
            }
            overlay.querySelector('#memorial-garden-close').focus();
            overlay.querySelector('#memorial-garden-close').addEventListener('click', closeGarden);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGarden(); });
            pushModalEscape(closeGarden);
            trapFocus(overlay);
        }


        // ==================== PET CODEX ====================

	        function showPetCodex() {
	            if (typeof markCoachChecklistProgress === 'function') markCoachChecklistProgress('open_codex');
	            const adultsRaised = gameState.adultsRaised || 0;
            const allTypes = Object.keys(PET_TYPES);

            let cardsHTML = allTypes.map(type => {
                const data = PET_TYPES[type];
                const isUnlocked = !data.mythical || adultsRaised >= (data.unlockRequirement || 0);
                const isMythical = data.mythical;
                let cardClass = 'codex-card';
                let tagHTML = '';

                if (isMythical && isUnlocked) {
                    cardClass += ' mythical-unlocked';
                    tagHTML = '<span class="codex-card-tag mythical-tag">Mythical</span>';
                } else if (isMythical && !isUnlocked) {
                    cardClass += ' locked';
                    tagHTML = `<span class="codex-card-tag locked-tag">${data.unlockMessage || 'Locked'}</span>`;
                } else {
                    cardClass += ' unlocked';
                    tagHTML = '<span class="codex-card-tag unlocked-tag">Unlocked</span>';
                }

                return `
                    <div class="${cardClass}">
                        <span class="codex-card-emoji">${isUnlocked ? data.emoji : '❓'}</span>
                        <span class="codex-card-name">${isUnlocked ? data.name : '???'}</span>
                        ${tagHTML}
                    </div>
                `;
            }).join('');

            // Mythical unlock progress
            const mythicalTypes = allTypes.filter(t => PET_TYPES[t].mythical);
            let unlockHTML = mythicalTypes.map(type => {
                const data = PET_TYPES[type];
                const req = data.unlockRequirement || 0;
                const progress = req > 0 ? Math.min(100, Math.round((adultsRaised / req) * 100)) : 100;
                const isComplete = adultsRaised >= req;
                const progressLabel = req > 0 ? `${adultsRaised}/${req}` : 'Unlocked';
                return `
                    <div class="codex-unlock-item">
                        <span>${data.emoji} ${data.name}</span>
                        <span>${progressLabel}</span>
                        <div class="codex-unlock-bar">
                            <div class="codex-unlock-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${progress}%"></div>
                        </div>
                    </div>
                `;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'codex-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Codex');
            overlay.innerHTML = `
                <div class="codex-modal">
                    <h2 class="codex-title">Pet Codex</h2>
                    <p class="codex-subtitle">${allTypes.filter(t => !PET_TYPES[t].mythical || adultsRaised >= (PET_TYPES[t].unlockRequirement || 0)).length}/${allTypes.length} species discovered</p>
                    <div class="codex-grid">${cardsHTML}</div>
                    <div class="codex-unlock-section">
                        <div class="codex-unlock-title">Mythical Unlock Progress</div>
                        ${unlockHTML}
                        <p style="font-size: 0.65rem; color: #888; margin-top: 8px;">Raise pets to adult stage to unlock mythical species!</p>
                    </div>
                    <button class="codex-close-btn" id="codex-close" aria-label="Close codex">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeCodex() {
                popModalEscape(closeCodex);
                animateModalClose(overlay, () => {
                    const btn = document.getElementById('codex-btn');
                    if (btn) btn.focus();
                });
            }

            document.getElementById('codex-close').focus();
            document.getElementById('codex-close').addEventListener('click', () => closeCodex());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCodex(); });
            pushModalEscape(closeCodex);
            trapFocus(overlay);
        }

        // ==================== STATS SCREEN ====================

        function showStatsScreen() {
            const pet = gameState.pet;
            const petData = pet ? (getAllPetTypeData(pet.type) || PET_TYPES[pet.type]) : null;
            const adultsRaised = gameState.adultsRaised || 0;
            const careActions = pet ? (pet.careActions || 0) : 0;
            const growthStage = pet ? (pet.growthStage || 'baby') : 'baby';
            const stageData = GROWTH_STAGES[growthStage];
            const unlockedCount = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical || adultsRaised >= (PET_TYPES[t].unlockRequirement || 0)).length;
            const totalCount = Object.keys(PET_TYPES).length;

            // New metrics
            const ageInHours = pet ? getPetAge(pet) : 0;
            const ageDisplay = ageInHours < 24
                ? `${Math.floor(ageInHours)} hours`
                : `${Math.floor(ageInHours / 24)} days`;
            const careQuality = pet ? (pet.careQuality || 'average') : 'average';
            const qualityData = CARE_QUALITY[careQuality] || CARE_QUALITY.average;
            const neglectCount = pet ? (pet.neglectCount || 0) : 0;
            const evolutionStage = pet ? (pet.evolutionStage || 'base') : 'base';
            const isEvolved = evolutionStage === 'evolved';

            const careQualityTips = {
                poor: 'Keep stats above 35% and avoid letting any stat drop below 20% to improve care quality.',
                average: 'Keep stats above 60% and minimize neglect (stats below 20%) to reach Good care.',
                good: 'Maintain stats above 80% with minimal neglect to reach Excellent care!',
                excellent: 'Amazing care! Your pet can evolve once they reach adult stage.'
            };

            const roomBonusesHTML = Object.keys(ROOMS).map(key => {
                const room = ROOMS[key];
                const bonusLabel = room.bonus
                    ? (typeof getRoomBonusLabel === 'function' ? getRoomBonusLabel(key) : room.bonus.label)
                    : 'No bonus';
                const upgradeLevel = (gameState.roomUpgrades && Number.isFinite(gameState.roomUpgrades[key])) ? Math.floor(gameState.roomUpgrades[key]) : 0;
                return `<div class="stats-room-bonus"><span class="stats-room-bonus-icon">${room.icon}</span> ${room.name}: ${bonusLabel}${upgradeLevel > 0 ? ` (Lv.${upgradeLevel})` : ''}</div>`;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'stats-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Stats');
            overlay.innerHTML = `
                <div class="stats-modal">
                    <h2 class="stats-title">Stats & Progress</h2>
                    <p class="stats-subtitle">${pet && petData ? `${petData.emoji} ${escapeHTML(pet.name || petData.name)}${isEvolved ? ' ✨' : ''}` : 'No pet yet'}</p>

                    <div class="stats-tabs" role="tablist" aria-label="Stats sections">
                        <button class="stats-tab active" role="tab" aria-selected="true" aria-controls="stats-panel-overview" id="stats-tab-overview">Overview</button>
                        <button class="stats-tab" role="tab" aria-selected="false" aria-controls="stats-panel-history" id="stats-tab-history">History</button>
                        <button class="stats-tab" role="tab" aria-selected="false" aria-controls="stats-panel-collection" id="stats-tab-collection">Collection</button>
                    </div>

                    <div class="stats-panel active" id="stats-panel-overview" role="tabpanel" aria-labelledby="stats-tab-overview">
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">${stageData.emoji}</div>
                                <div class="stats-card-value">${stageData.label}</div>
                                <div class="stats-card-label">Growth Stage</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🎂</div>
                                <div class="stats-card-value">${ageDisplay}</div>
                                <div class="stats-card-label">Age</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">${qualityData.emoji}</div>
                                <div class="stats-card-value">${qualityData.label}</div>
                                <div class="stats-card-label">Care Quality</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">💝</div>
                                <div class="stats-card-value">${careActions}</div>
                                <div class="stats-card-label">Care Actions</div>
                            </div>
                        </div>
                        ${pet && pet.personality && typeof PERSONALITY_TRAITS !== 'undefined' && PERSONALITY_TRAITS[pet.personality] ? `
                        <div class="stats-personality-section">
                            <h3 class="stats-section-title">${PERSONALITY_TRAITS[pet.personality].emoji} Personality: ${PERSONALITY_TRAITS[pet.personality].label}</h3>
                            <p class="stats-personality-desc">${PERSONALITY_TRAITS[pet.personality].description}</p>
                        </div>` : ''}
                        ${pet && pet.type && typeof PET_PREFERENCES !== 'undefined' && PET_PREFERENCES[pet.type] ? (() => {
                            const prefs = PET_PREFERENCES[pet.type];
                            return `<div class="stats-prefs-section">
                                <h3 class="stats-section-title">💝 Favorites & Fears</h3>
                                <div class="stats-prefs-grid">
                                    <span class="stats-pref-item fav">💕 Food: ${prefs.favoriteFoodLabel}</span>
                                    <span class="stats-pref-item fav">💕 Activity: ${prefs.favoriteActivityLabel}</span>
                                    <span class="stats-pref-item fear">😨 Fear: ${prefs.fearLabel}</span>
                                    <span class="stats-pref-item fear">😨 Dislikes: ${prefs.dislikedFoodLabel}</span>
                                </div>
                            </div>`;
                        })() : ''}
                        ${(() => {
                            if (!pet || !pet.careHistory || pet.careHistory.length < 2) return '';
                            const history = pet.careHistory.slice(-100);
                            const min = Math.max(0, Math.min(...history.map(h => h.average)) - 5);
                            const max = Math.min(100, Math.max(...history.map(h => h.average)) + 5);
                            const range = max - min || 1;
                            const w = 200, h = 40;
                            const points = history.map((entry, i) => {
                                const x = (i / (history.length - 1)) * w;
                                const y = h - ((entry.average - min) / range) * h;
                                return `${x.toFixed(1)},${y.toFixed(1)}`;
                            }).join(' ');
                            const recent = history.slice(-5);
                            const older = history.slice(-10, -5);
                            const recentAvg = recent.reduce((s, e) => s + e.average, 0) / recent.length;
                            const olderAvg = older.length > 0 ? older.reduce((s, e) => s + e.average, 0) / older.length : recentAvg;
                            const trend = recentAvg > olderAvg + 2 ? 'Improving' : recentAvg < olderAvg - 2 ? 'Declining' : 'Steady';
                            const trendColor = trend === 'Improving' ? '#43A047' : trend === 'Declining' ? '#E53935' : '#FB8C00';
                            const lineColor = careQuality === 'excellent' ? '#43A047' : careQuality === 'good' ? '#66BB6A' : careQuality === 'average' ? '#FB8C00' : '#E53935';
                            return `<div class="care-trend-section">
                                <div class="care-trend-label" style="font-size:0.8rem;font-weight:700;margin-bottom:4px;">
                                    Care Trend: <span style="color:${trendColor}">${trend}</span>
                                </div>
                                <svg class="care-sparkline" viewBox="0 0 ${w} ${h}" role="img" aria-label="Care quality trend: ${trend.toLowerCase()} over the last ${history.length} sessions" style="width:100%;max-width:220px;height:44px;">
                                    <polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>`;
                        })()}
                        <div class="care-quality-tip">
                            💡 ${careQualityTips[careQuality] || careQualityTips.average}
                        </div>
                        ${pet ? `
                        <div class="stats-section-title">Current Wellness</div>
                        <div class="stats-grid">
                            <div class="stats-card"><div class="stats-card-icon">🍎</div><div class="stats-card-value">${pet.hunger}%</div><div class="stats-card-label">Food</div></div>
                            <div class="stats-card"><div class="stats-card-icon">🛁</div><div class="stats-card-value">${pet.cleanliness}%</div><div class="stats-card-label">Bath</div></div>
                            <div class="stats-card"><div class="stats-card-icon">💖</div><div class="stats-card-value">${pet.happiness}%</div><div class="stats-card-label">Happy</div></div>
                            <div class="stats-card"><div class="stats-card-icon">😴</div><div class="stats-card-value">${pet.energy}%</div><div class="stats-card-label">Energy</div></div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="stats-panel" id="stats-panel-history" role="tabpanel" aria-labelledby="stats-tab-history" hidden>
                        ${pet ? `
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">📊</div>
                                <div class="stats-card-value">${Math.round((pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4)}%</div>
                                <div class="stats-card-label">Avg Stats</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">⚠️</div>
                                <div class="stats-card-value">${neglectCount}</div>
                                <div class="stats-card-label">Neglect Count</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">${isEvolved ? '✨' : '⭐'}</div>
                                <div class="stats-card-value">${isEvolved ? 'Evolved' : 'Base'}</div>
                                <div class="stats-card-label">Form</div>
                            </div>
                        </div>
                        ` : '<p style="text-align:center;color:#888;">No pet data yet.</p>'}
                        <div class="stats-section-title">Room Bonuses</div>
                        <div class="stats-room-bonuses">${roomBonusesHTML}</div>
                    </div>

                    <div class="stats-panel" id="stats-panel-collection" role="tabpanel" aria-labelledby="stats-tab-collection" hidden>
                        <div class="stats-grid">
                            <div class="stats-card">
                                <div class="stats-card-icon">📖</div>
                                <div class="stats-card-value">${unlockedCount}/${totalCount}</div>
                                <div class="stats-card-label">Species Found</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🐾</div>
                                <div class="stats-card-value">${gameState.pets ? gameState.pets.length : (pet ? 1 : 0)}/${MAX_PETS}</div>
                                <div class="stats-card-label">Pet Family</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🤝</div>
                                <div class="stats-card-value">${Object.keys(gameState.relationships || {}).length}</div>
                                <div class="stats-card-label">Relationships</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-card-icon">🏆</div>
                                <div class="stats-card-value">${adultsRaised}</div>
                                <div class="stats-card-label">Adults Raised</div>
                            </div>
                        </div>
                    </div>

                    <button class="stats-close-btn" id="stats-close" aria-label="Close stats">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeStats() {
                popModalEscape(closeStats);
                animateModalClose(overlay, () => {
                    const btn = document.getElementById('stats-btn');
                    if (btn) btn.focus();
                });
            }

            document.getElementById('stats-close').focus();
            document.getElementById('stats-close').addEventListener('click', () => closeStats());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStats(); });
            pushModalEscape(closeStats);
            trapFocus(overlay);

            // Stats tab switching
            overlay.querySelectorAll('.stats-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    overlay.querySelectorAll('.stats-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                    overlay.querySelectorAll('.stats-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    const panel = document.getElementById(tab.getAttribute('aria-controls'));
                    if (panel) { panel.classList.add('active'); panel.hidden = false; }
                });
            });
        }

        // ==================== NEW PET ====================

        function startNewPet() {
            const pet = gameState.pet;
            const petData = pet ? (getAllPetTypeData(pet.type) || PET_TYPES[pet.type]) : null;
            const growthStage = pet ? (pet.growthStage || 'baby') : 'baby';
            const stageData = GROWTH_STAGES[growthStage];
            const careActions = pet ? (pet.careActions || 0) : 0;
            const adultsRaised = gameState.adultsRaised || 0;
            const petName = pet && petData ? escapeHTML(pet.name || petData.name) : pet ? escapeHTML(pet.name || 'Pet') : '';
            const petCount = getPetCount();
            const canAdopt = canAdoptMore();

            // Build pet summary for the modal
            let summaryHTML = '';
            if (pet && petData) {
                summaryHTML = `
                    <div class="new-pet-summary">
                        <div class="new-pet-summary-emoji">${petData.emoji}</div>
                        <div class="new-pet-summary-name">${petName}</div>
                        <div class="new-pet-summary-stats">
                            <span class="new-pet-summary-stat">${stageData.emoji} ${stageData.label}</span>
                            <span class="new-pet-summary-stat">💝 ${careActions} actions</span>
                            <span class="new-pet-summary-stat">🐾 ${petCount}/${MAX_PETS} pets</span>
                        </div>
                    </div>
                `;
            }

            // Remove existing new-pet modal only — avoid removing unrelated overlays
            // like the birthday celebration (.celebration-modal).
            const existingModal = document.querySelector('.modal-overlay.new-pet-modal');
            if (existingModal) {
                if (existingModal._closeOverlay) popModalEscape(existingModal._closeOverlay);
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay new-pet-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'modal-title');

            // Build buttons - show adopt option if room available
            let buttonsHTML = `<button class="modal-btn cancel" id="modal-cancel">Keep Playing</button>`;
            if (canAdopt) {
                buttonsHTML += `<button class="modal-btn confirm adopt-btn" id="modal-adopt">🥚 Adopt Egg</button>`;
            }
            buttonsHTML += `<button class="modal-btn confirm reset-btn" id="modal-confirm">Start Over</button>`;

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-icon" aria-hidden="true">🥚</div>
                    <h2 class="modal-title" id="modal-title">${canAdopt ? 'Grow Your Family!' : 'Start Fresh?'}</h2>
                    ${summaryHTML}
                    <p class="modal-message">${canAdopt ? `You can adopt another egg (${petCount}/${MAX_PETS} pets) or start completely fresh!` : `You have ${MAX_PETS} pets already. Start over for a fresh adventure?`}</p>
                    <div class="modal-buttons modal-buttons-col">
                        ${buttonsHTML}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');
            const adoptBtn = document.getElementById('modal-adopt');
            cancelBtn.focus();

            function closeModal() {
                popModalEscape(closeAndCancel);
                modal.remove();
            }
            function closeAndCancel() {
                closeModal();
                const newPetBtn = document.getElementById('new-pet-btn');
                if (newPetBtn) newPetBtn.focus();
            }

            pushModalEscape(closeAndCancel);
            modal._closeOverlay = closeAndCancel;

            // Adopt additional egg - keeps all existing pets
            if (adoptBtn) {
                adoptBtn.addEventListener('click', () => {
                    closeModal();
                    adoptNewEgg();
                });
            }

            // Start over - full reset with confirmation
            confirmBtn.addEventListener('click', () => {
                // Show confirmation dialog (Item 21)
                const confirmOverlay = document.createElement('div');
                confirmOverlay.className = 'modal-overlay';
                confirmOverlay.setAttribute('role', 'alertdialog');
                confirmOverlay.setAttribute('aria-modal', 'true');
                confirmOverlay.setAttribute('aria-label', 'Confirm start over');
                confirmOverlay.innerHTML = `
                    <div class="modal-content">
                        <h2 class="modal-title">Are you sure?</h2>
                        <div class="confirm-dialog-warning">
                            <span aria-hidden="true">⚠️</span>
                            <span>This will reset your pet and progress. Achievements, scores, and furniture are kept.</span>
                        </div>
                        <div class="modal-buttons modal-buttons-col">
                            <button class="modal-btn cancel" id="confirm-cancel">Go Back</button>
                            <button class="modal-btn confirm confirm-danger-btn" id="confirm-reset">Yes, Start Over</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmOverlay);
                const cancelConfirm = confirmOverlay.querySelector('#confirm-cancel');
                const resetConfirm = confirmOverlay.querySelector('#confirm-reset');
                cancelConfirm.focus();
                function closeConfirm() { confirmOverlay.remove(); popModalEscape(closeConfirm); }
                cancelConfirm.addEventListener('click', closeConfirm);
                confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirm(); });
                pushModalEscape(closeConfirm);
                trapFocus(confirmOverlay);
                resetConfirm.addEventListener('click', () => {
                    closeConfirm();
                    closeModal();
                    doStartOver();
                });
                return;
            });

            function doStartOver() {
                cleanupAllMiniGames();
                if (typeof cleanupMinigameTransientOverlays === 'function') cleanupMinigameTransientOverlays();
                stopDecayTimer();
                stopGardenGrowTimer();
                _petPhaseTimersRunning = false;
                _petPhaseLastRoom = null;
                if (typeof GameAudio !== 'undefined') GameAudio.stopAll();
                if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
                actionAnimating = false;
                actionCooldown = false;
                if (actionCooldownTimer) {
                    clearTimeout(actionCooldownTimer);
                    actionCooldownTimer = null;
                }
                if (_careToastTimer) {
                    clearTimeout(_careToastTimer);
                    _careToastTimer = null;
                }
                _careToastQueue = [];
                _previousMood = null;
                document.querySelectorAll('.confetti-container, .fireworks-container, .minigame-celebration, .new-highscore-banner').forEach((el) => el.remove());
                const confettiStyleEl = document.getElementById('confetti-style');
                if (confettiStyleEl) confettiStyleEl.remove();
                const fireworksStyleEl = document.getElementById('fireworks-style');
                if (fireworksStyleEl) fireworksStyleEl.remove();

                const preservedAdultsRaised = gameState.adultsRaised || 0;
                const preservedFurniture = gameState.furniture || {
                    bedroom: { bed: 'basic', decoration: 'none' },
                    kitchen: { decoration: 'none' },
                    bathroom: { decoration: 'none' }
                };
                const preservedRoomUnlocks = gameState.roomUnlocks || {};
                const preservedRoomUpgrades = gameState.roomUpgrades || {};
                const preservedRoomCustomizations = gameState.roomCustomizations || {};
                const preservedMinigameScoreHistory = gameState.minigameScoreHistory || {};
                const preservedMinigameHighScores = gameState.minigameHighScores || {};
                const preservedMinigamePlayCounts = gameState.minigamePlayCounts || {};
                const preservedAchievements = gameState.achievements || {};
                const preservedRoomsVisited = gameState.roomsVisited || {};
                const preservedWeatherSeen = gameState.weatherSeen || {};
                const preservedMemorials = gameState.memorials || [];
                const preservedPersonalitiesSeen = gameState.personalitiesSeen || {};
                const preservedEldersRaised = gameState.eldersRaised || 0;
                const preservedEconomy = gameState.economy || (typeof createDefaultEconomyState === 'function' ? createDefaultEconomyState() : null);
                const newTypes = getUnlockedPetTypes();
                const newPetType = randomFromArray(newTypes);
                const newEggType = getEggTypeForPet(newPetType);
                // Clear all existing properties and assign new ones on the same
                // object so that in-flight closures / timer callbacks that
                // captured the gameState reference keep working.
                Object.keys(gameState).forEach(k => delete gameState[k]);
                Object.assign(gameState, {
                    phase: 'egg',
                    pet: null,
                    eggTaps: 0,
                    eggType: newEggType,
                    pendingPetType: newPetType,
                    lastUpdate: Date.now(),
                    timeOfDay: getTimeOfDay(),
                    currentRoom: 'bedroom',
                    weather: getRandomWeather(),
                    lastWeatherChange: Date.now(),
                    season: getCurrentSeason(),
                    adultsRaised: preservedAdultsRaised,
                    furniture: preservedFurniture,
                    roomUnlocks: preservedRoomUnlocks,
                    roomUpgrades: preservedRoomUpgrades,
                    roomCustomizations: preservedRoomCustomizations,
                    minigamePlayCounts: preservedMinigamePlayCounts,
                    minigameHighScores: preservedMinigameHighScores,
                    minigameScoreHistory: preservedMinigameScoreHistory,
                    garden: {
                        plots: [],
                        inventory: {},
                        lastGrowTick: Date.now(),
                        totalHarvests: 0
                    },
                    pets: [],
                    activePetIndex: 0,
                    relationships: {},
                    household: {
                        activePetId: null,
                        petsById: {},
                        relationships: {},
                        lastSimulatedAt: Date.now(),
                        simVersion: (typeof MLFHouseholdSimulator !== 'undefined' && MLFHouseholdSimulator && Number.isInteger(MLFHouseholdSimulator.SIM_VERSION))
                            ? MLFHouseholdSimulator.SIM_VERSION
                            : 1
                    },
                    nextPetId: 1,
                    achievements: preservedAchievements,
                    roomsVisited: preservedRoomsVisited,
                    weatherSeen: preservedWeatherSeen,
                    dailyChecklist: null,
                    weeklyArc: null,
                    reminders: (typeof createDefaultReminderState === 'function') ? createDefaultReminderState() : { enabled: false, permission: 'default', lastSent: {} },
                    rewardModifiers: [],
                    mastery: (typeof createDefaultMasteryState === 'function') ? createDefaultMasteryState() : { competitionSeason: { points: 0, rank: 1, title: 'Bronze Circuit' }, biomeRanks: {}, familyLegacy: { points: 0, tier: 1, title: 'Founding Family' } },
                    goalLadder: null,
                    streak: { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [], prestige: { cycleMonth: '', cycleBest: 0, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' } },
                    exploration: (typeof createDefaultExplorationState === 'function')
                        ? createDefaultExplorationState()
                        : {
                            biomeUnlocks: { forest: true, beach: false, mountain: false, cave: false, skyIsland: false, underwater: false, skyZone: false },
                            discoveredBiomes: { forest: true },
                            lootInventory: {},
                            expedition: null,
                            expeditionHistory: [],
                            roomTreasureCooldowns: {},
                            npcEncounters: [],
                            dungeon: { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 },
                            stats: { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 }
                        },
                    memorials: preservedMemorials,
                    personalitiesSeen: preservedPersonalitiesSeen,
                    eldersRaised: preservedEldersRaised,
                    economy: preservedEconomy
                });
                saveGame();
                announce('Starting fresh with a new egg!', true);
                renderEggPhase();
            }

            cancelBtn.addEventListener('click', closeAndCancel);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeAndCancel(); });

            // Trap focus within modal
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = modal.querySelectorAll('button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            });
        }

        // ==================== ADOPT NEW EGG ====================

        function adoptNewEgg() {
            if (!canAdoptMore()) {
                showToast(`You already have ${MAX_PETS} pets! That's the maximum.`, '#FFA726');
                return;
            }

            // Save current pet back to array
            syncActivePetToArray();

            // Transition to egg phase while preserving all existing state
            gameState.adoptingAdditional = true;
            const newTypes = getUnlockedPetTypes();
            const newPetType = randomFromArray(newTypes);
            const newEggType = getEggTypeForPet(newPetType);
            gameState.phase = 'egg';
            gameState.eggTaps = 0;
            gameState.eggType = newEggType;
            gameState.pendingPetType = newPetType;

            // Stop timers during egg phase
            stopDecayTimer();
            _petPhaseTimersRunning = false;
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();

            saveGame();
            announce('Adopting a new egg! Tap to hatch your new family member!', true);
            renderEggPhase();
        }


        // ==================== PET SWITCHER ====================

        function getPetAlertStatus(pet) {
            if (!pet) return null;
            const avg = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            const anyCritical = pet.hunger < 20 || pet.cleanliness < 20 || pet.happiness < 20 || pet.energy < 20;
            if (anyCritical) return 'critical';
            if (avg < 35) return 'warning';
            return null;
        }

        function generatePetSwitcherHTML() {
            if (!gameState.pets || gameState.pets.length <= 1) return '';

            let tabs = '';
            gameState.pets.forEach((p, idx) => {
                if (!p) return;
                const petData = getAllPetTypeData(p.type) || PET_TYPES[p.type];
                if (!petData) return;
                const isActive = idx === gameState.activePetIndex;
                const name = escapeHTML(p.name || petData.name);
                const alertStatus = !isActive ? getPetAlertStatus(p) : null;
                const alertBadge = alertStatus === 'critical'
                    ? '<span class="pet-alert-badge critical" aria-label="Needs urgent attention!" title="Needs urgent attention!">!</span>'
                    : alertStatus === 'warning'
                    ? '<span class="pet-alert-badge warning" aria-label="Needs attention" title="Needs attention">!</span>'
                    : '';
                tabs += `
                    <button class="pet-tab ${isActive ? 'active' : ''} ${alertStatus ? 'pet-tab-' + alertStatus : ''}" data-pet-index="${idx}"
                            role="tab"
                            aria-label="${name}${isActive ? ' (active)' : ''}${alertStatus ? ' (needs attention)' : ''}"
                            aria-selected="${isActive}"
                            tabindex="${isActive ? '0' : '-1'}">
                        <span class="pet-tab-emoji">${petData.emoji}</span>
                        <span class="pet-tab-name" title="${name}">${name}</span>
                        ${alertBadge}
                    </button>
                `;
            });

            return `
                <nav class="pet-switcher" role="tablist" aria-label="Switch between your pets">
                    ${tabs}
                </nav>
            `;
        }

        function showHouseholdSummaryModal() {
            if (!Array.isArray(gameState.pets) || gameState.pets.length === 0) {
                showToast('No household pets to show yet.', '#90A4AE');
                return;
            }

            const existing = document.querySelector('.household-summary-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const petsById = {};
            gameState.pets.forEach((pet) => {
                if (pet && pet.id != null) petsById[String(pet.id)] = pet;
            });
            const householdRelationships = (gameState.household && gameState.household.relationships) ? gameState.household.relationships : {};
            const legacyRelationships = gameState.relationships || {};

            function getActivityLabelForPet(pet) {
                const activity = (pet && pet.currentActivity && typeof pet.currentActivity === 'object')
                    ? pet.currentActivity
                    : null;
                if (!activity || !activity.type) return 'Idle';
                const type = String(activity.type);
                const labels = {
                    eat: 'Eating',
                    sleep: 'Sleeping',
                    play: 'Playing',
                    socialize: 'Socializing',
                    idle: 'Idle',
                    exploreRoom: 'Exploring'
                };
                const label = labels[type] || (type.charAt(0).toUpperCase() + type.slice(1));
                if (type === 'socialize' && activity.targetPetId != null) {
                    const target = petsById[String(activity.targetPetId)];
                    const targetName = target ? (target.name || ((getAllPetTypeData(target.type) || {}).name) || 'pet') : 'another pet';
                    return `${label} with ${targetName}`;
                }
                return label;
            }

            function getRelationshipHighlightText(pet) {
                if (!pet || pet.id == null) return 'No relationship highlights yet';
                const petId = String(pet.id);
                if (typeof MLFSimRelationships !== 'undefined' && MLFSimRelationships && typeof MLFSimRelationships.getRelationshipHighlightsForPet === 'function' && householdRelationships && Object.keys(householdRelationships).length > 0) {
                    const highlights = MLFSimRelationships.getRelationshipHighlightsForPet(petId, householdRelationships);
                    const parts = [];
                    if (highlights.bestFriend && Array.isArray(highlights.bestFriend.tags) && highlights.bestFriend.tags.includes('friend')) {
                        const bf = petsById[String(highlights.bestFriend.petId)];
                        if (bf) parts.push(`Best friend: ${bf.name || 'Pet'}`);
                    }
                    if (highlights.rival && Array.isArray(highlights.rival.tags) && highlights.rival.tags.includes('rival')) {
                        const rv = petsById[String(highlights.rival.petId)];
                        if (rv) parts.push(`Rival: ${rv.name || 'Pet'}`);
                    }
                    if (parts.length > 0) return parts.join(' · ');
                }

                let bestLegacy = null;
                Object.keys(legacyRelationships).forEach((key) => {
                    if (String(key).split('-').indexOf(petId) === -1) return;
                    const rel = legacyRelationships[key];
                    const points = Number(rel && rel.points) || 0;
                    const otherId = String(key).split('-').find((part) => part !== petId);
                    if (!otherId) return;
                    if (!bestLegacy || points > bestLegacy.points) bestLegacy = { otherId, points };
                });
                if (bestLegacy && bestLegacy.points > 0) {
                    const other = petsById[String(bestLegacy.otherId)];
                    if (other) return `Closest bond: ${other.name || 'Pet'}`;
                }
                return 'No relationship highlights yet';
            }

            const petCardsHTML = gameState.pets.map((pet, idx) => {
                if (!pet) return '';
                const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
                const name = escapeHTML(pet.name || petData.name || 'Pet');
                const isActive = idx === gameState.activePetIndex;
                const activityLabel = escapeHTML(getActivityLabelForPet(pet));
                const relHighlight = escapeHTML(getRelationshipHighlightText(pet));
                return `
                    <article class="household-summary-card" role="listitem" aria-label="${name}${isActive ? ', active pet' : ''}">
                        <div class="household-summary-card-head">
                            <div>
                                <h3 class="household-summary-pet-name">${petData.emoji} ${name}${isActive ? ' (Active)' : ''}</h3>
                                <p class="household-summary-activity">Activity: ${activityLabel}</p>
                            </div>
                            ${isActive ? '<button class="modal-btn" type="button" data-household-switch-disabled="true" disabled aria-label="Already active">Active</button>' : `<button class="modal-btn confirm" type="button" data-household-switch="${idx}" aria-label="Switch to ${name}">Switch</button>`}
                        </div>
                        <div class="household-summary-stats" role="group" aria-label="${name} quick stats">
                            <span>Hunger ${Math.round(Number(pet.hunger) || 0)}%</span>
                            <span>Energy ${Math.round(Number(pet.energy) || 0)}%</span>
                            <span>Fun ${Math.round(Number(pet.happiness) || 0)}%</span>
                        </div>
                        <p class="household-summary-rel">${relHighlight}</p>
                    </article>
                `;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'household-summary-overlay modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Household Summary');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:680px;max-height:85vh;overflow:auto;">
                    <h2 class="modal-title">Household Summary</h2>
                    <p class="modal-message">All pets continue living in the background, even when they are not active.</p>
                    <div role="list" aria-label="Household pets" style="display:grid;gap:10px;margin:12px 0;">
                        ${petCardsHTML}
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn cancel" id="household-summary-close" type="button">Close</button>
                    </div>
                    <div class="sr-only" aria-live="polite" id="household-summary-live"></div>
                </div>
            `;
            document.body.appendChild(overlay);

            const closeBtn = overlay.querySelector('#household-summary-close');
            if (closeBtn) closeBtn.focus();

            function closeHouseholdSummary() {
                popModalEscape(closeHouseholdSummary);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('household-btn');
                    if (trigger) trigger.focus();
                });
            }

            overlay.querySelectorAll('[data-household-switch]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.getAttribute('data-household-switch'));
                    if (!Number.isInteger(idx)) return;
                    syncActivePetToArray();
                    if (switchActivePet(idx)) {
                        const live = overlay.querySelector('#household-summary-live');
                        if (live && gameState.pet) live.textContent = `Switched active pet to ${gameState.pet.name || 'pet'}.`;
                        closeHouseholdSummary();
                        renderPetPhase();
                    }
                });
            });

            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHouseholdSummary(); });
            if (closeBtn) closeBtn.addEventListener('click', closeHouseholdSummary);
            pushModalEscape(closeHouseholdSummary);
            overlay._closeOverlay = closeHouseholdSummary;
            trapFocus(overlay);
        }

        // ==================== PET INTERACTION SYSTEM ====================

        function showInteractionMenu() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('You need at least 2 pets for interactions! Adopt another egg!', '#FFA726');
                return;
            }

            const existing = document.querySelector('.interaction-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const activePet = gameState.pet;
            if (!activePet) {
                showToast('You need a pet for interactions!', '#FFA726');
                return;
            }
            const activePetData = getAllPetTypeData(activePet.type) || PET_TYPES[activePet.type];
            if (!activePetData) return;
            const activeName = escapeHTML(activePet.name || activePetData.name);

            // Build partner selection
            let partnerHTML = '';
            gameState.pets.forEach((p, idx) => {
                if (!p || idx === gameState.activePetIndex) return;
                const pd = getAllPetTypeData(p.type) || PET_TYPES[p.type];
                if (!pd) return;
                const name = escapeHTML(p.name || pd.name);
                const rel = getRelationship(activePet.id, p.id);
                const level = getRelationshipLevel(rel.points);
                const levelData = RELATIONSHIP_LEVELS[level];
                partnerHTML += `
                    <button class="interaction-partner" data-partner-index="${idx}">
                        <span class="interaction-partner-emoji">${pd.emoji}</span>
                        <span class="interaction-partner-name">${name}</span>
                        <span class="interaction-partner-rel">${levelData.emoji} ${levelData.label}</span>
                    </button>
                `;
            });

            // Build interaction options
            let actionsHTML = '';
            for (const [id, interaction] of Object.entries(PET_INTERACTIONS)) {
                actionsHTML += `
                    <button class="interaction-action" data-interaction="${id}">
                        <span class="interaction-action-emoji">${interaction.emoji}</span>
                        <div class="interaction-action-info">
                            <span class="interaction-action-name">${interaction.name}</span>
                            <span class="interaction-action-desc">${interaction.description}</span>
                        </div>
                    </button>
                `;
            }

            const overlay = document.createElement('div');
            overlay.className = 'interaction-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Interactions');

            overlay.innerHTML = `
                <div class="interaction-modal">
                    <h2 class="interaction-title">🐾 Pet Interactions</h2>
                    <p class="interaction-subtitle">Choose a partner for ${activeName}</p>

                    <div class="interaction-section">
                        <h3 class="interaction-section-title">Choose Partner</h3>
                        <div class="interaction-partners">${partnerHTML}</div>
                    </div>

                    <div class="interaction-section">
                        <h3 class="interaction-section-title">Choose Activity</h3>
                        <div class="interaction-actions">${actionsHTML}</div>
                    </div>

                    <button class="interaction-close" id="interaction-close" aria-label="Close interaction">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            let selectedPartnerIdx = null;
            let selectedInteraction = null;

            // Partner selection
            overlay.querySelectorAll('.interaction-partner').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.interaction-partner').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedPartnerIdx = parseInt(btn.dataset.partnerIndex);
                    tryPerformInteraction();
                });
            });

            // Action selection
            overlay.querySelectorAll('.interaction-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.interaction-action').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedInteraction = btn.dataset.interaction;
                    tryPerformInteraction();
                });
            });

            function tryPerformInteraction() {
                if (selectedPartnerIdx === null || !selectedInteraction) return;

                const result = performPetInteraction(selectedInteraction, gameState.activePetIndex, selectedPartnerIdx);
                if (!result) return;

                if (!result.success) {
                    if (result.reason === 'cooldown') {
                        showCooldownToast('pet-interaction', 'Pets need a short break before interacting again.');
                    }
                    return;
                }

                // Show result
                const interaction = result.interaction;

                // Show side-by-side pet interaction animation
                const pet1 = gameState.pets[gameState.activePetIndex];
                const pet2 = gameState.pets[selectedPartnerIdx];
                showPetInteractionAnimation(pet1, pet2, interaction);

                showToast(`${interaction.emoji} ${escapeHTML(result.message)}`, '#4ECDC4');

                // Show relationship level up
                if (result.relationshipChange && result.relationshipChange.changed && result.relationshipChange.improved) {
                    const newLevelData = RELATIONSHIP_LEVELS[result.relationshipChange.to];
                    const label = newLevelData.label;
                    const pluralLabel = label === 'Family' ? 'Family' : label + 's';
                    setTimeout(() => {
                        showToast(`${newLevelData.emoji} ${escapeHTML(result.pet1Name)} & ${escapeHTML(result.pet2Name)} are now ${pluralLabel}!`, '#FFD700');
                    }, 1500);
                }

                closeInteraction();
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();

                // Check growth milestones for both pets
                checkGrowthMilestone(gameState.pets[gameState.activePetIndex]);
                checkGrowthMilestone(gameState.pets[selectedPartnerIdx]);

                saveGame();
                renderPetPhase();
            }

            function closeInteraction() {
                popModalEscape(closeInteraction);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('interact-btn');
                    if (trigger) trigger.focus();
                });
            }

            document.getElementById('interaction-close').addEventListener('click', closeInteraction);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeInteraction(); });
            pushModalEscape(closeInteraction);
            overlay._closeOverlay = closeInteraction;
            trapFocus(overlay);

            // Focus first partner
            const firstPartner = overlay.querySelector('.interaction-partner');
            if (firstPartner) firstPartner.focus();
        }

        // ==================== PET INTERACTION ANIMATION ====================
        // Shows a brief side-by-side SVG display of both pets during interaction
        function showPetInteractionAnimation(pet1, pet2, interaction) {
            if (!pet1 || !pet2) return;

            // Remove any existing animation overlay
            const existing = document.querySelector('.pet-interaction-anim');
            if (existing) existing.remove();

            const pet1SVG = generatePetSVG(pet1, 'happy');
            const pet2SVG = generatePetSVG(pet2, 'happy');
            const pet1Name = escapeHTML(pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet');
            const pet2Name = escapeHTML(pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet');

            const animEl = document.createElement('div');
            animEl.className = 'pet-interaction-anim';
            animEl.setAttribute('role', 'img');
            animEl.setAttribute('aria-label', `${pet1Name} and ${pet2Name} ${interaction.name}`);
            animEl.innerHTML = `
                <div class="interaction-anim-content">
                    <div class="interaction-anim-pet pet-left">${pet1SVG}</div>
                    <div class="interaction-anim-emoji">${interaction.emoji}</div>
                    <div class="interaction-anim-pet pet-right">${pet2SVG}</div>
                </div>
                <div class="interaction-anim-label">${pet1Name} & ${pet2Name}</div>
            `;

            document.body.appendChild(animEl);
            // Trigger entrance animation
            requestAnimationFrame(() => animEl.classList.add('visible'));
            // Auto-dismiss after 2.5 seconds
            setTimeout(() => {
                animEl.classList.remove('visible');
                animEl.classList.add('fading');
                setTimeout(() => animEl.remove(), 500);
            }, 2500);
        }

        // ==================== SOCIAL HUB ====================

        function showSocialHub() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('Adopt more pets to see their relationships!', '#FFA726');
                return;
            }

            const existing = document.querySelector('.social-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'social-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Social Hub');

            // Build relationship cards for all pet pairs
            let relCardsHTML = '';
            for (let i = 0; i < gameState.pets.length; i++) {
                for (let j = i + 1; j < gameState.pets.length; j++) {
                    const p1 = gameState.pets[i];
                    const p2 = gameState.pets[j];
                    if (!p1 || !p2) continue;

                    const p1Data = getAllPetTypeData(p1.type) || PET_TYPES[p1.type];
                    const p2Data = getAllPetTypeData(p2.type) || PET_TYPES[p2.type];
                    if (!p1Data || !p2Data) continue;

                    const p1Name = escapeHTML(p1.name || p1Data.name);
                    const p2Name = escapeHTML(p2.name || p2Data.name);
                    const rel = getRelationship(p1.id, p2.id);
                    const level = getRelationshipLevel(rel.points);
                    const levelData = RELATIONSHIP_LEVELS[level];
                    const progress = getRelationshipProgress(rel.points);
                    const nextIdx = RELATIONSHIP_ORDER.indexOf(level) + 1;
                    const nextLevel = nextIdx < RELATIONSHIP_ORDER.length ? RELATIONSHIP_LEVELS[RELATIONSHIP_ORDER[nextIdx]] : null;

                    relCardsHTML += `
                        <div class="social-card">
                            <div class="social-card-pets">
                                <div class="social-card-pet">
                                    <span class="social-card-emoji">${p1Data.emoji}</span>
                                    <span class="social-card-name">${p1Name}</span>
                                </div>
                                <span class="social-card-heart">${levelData.emoji}</span>
                                <div class="social-card-pet">
                                    <span class="social-card-emoji">${p2Data.emoji}</span>
                                    <span class="social-card-name">${p2Name}</span>
                                </div>
                            </div>
                            <div class="social-card-level">
                                <span class="social-card-level-label">${levelData.label}</span>
                                <span class="social-card-level-desc">${levelData.description}</span>
                            </div>
                            <div class="social-card-progress">
                                <div class="social-card-bar">
                                    <div class="social-card-bar-fill" style="width: ${progress}%;"></div>
                                </div>
                                ${nextLevel ? `<span class="social-card-next">Next: ${nextLevel.emoji} ${nextLevel.label}</span>` : '<span class="social-card-next">Max level!</span>'}
                            </div>
                            <div class="social-card-stats">
                                <span>Interactions: ${rel.interactionCount || 0}</span>
                                <span>Points: ${Math.round(rel.points)}</span>
                            </div>
                        </div>
                    `;
                }
            }

            overlay.innerHTML = `
                <div class="social-modal">
                    <h2 class="social-title">🏠 Social Hub</h2>
                    <p class="social-subtitle">Your pet family & friendships</p>

                    <div class="social-section-title">Relationships</div>
                    <div class="social-cards">${relCardsHTML || '<p class="social-empty">Adopt more pets to build relationships!</p>'}</div>

                    <button class="social-close" id="social-close" aria-label="Close social hub">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeSocial() {
                popModalEscape(closeSocial);
                animateModalClose(overlay);
            }

            document.getElementById('social-close').focus();
            document.getElementById('social-close').addEventListener('click', closeSocial);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSocial(); });
            pushModalEscape(closeSocial);
            overlay._closeOverlay = closeSocial;
            trapFocus(overlay);
        }

        // ==================== ACHIEVEMENTS MODAL ====================

        function showAchievementsModal() {
            const existing = document.querySelector('.achievements-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const unlocked = gameState.achievements || {};
            const total = Object.keys(ACHIEVEMENTS).length;
            const unlockedCount = Object.values(unlocked).filter(a => a.unlocked).length;

            let cardsHTML = '';
            for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
                const isUnlocked = unlocked[id] && unlocked[id].unlocked;
                const unlockedDate = isUnlocked ? new Date(unlocked[id].unlockedAt).toLocaleDateString() : '';
                cardsHTML += `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" aria-label="${ach.name}: ${ach.description}${isUnlocked ? ', unlocked' : ', locked'}">
                        <div class="achievement-icon">${isUnlocked ? ach.icon : '🔒'}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${isUnlocked ? ach.name : '???'}</div>
                            <div class="achievement-desc">${ach.description}</div>
                            ${isUnlocked ? `<div class="achievement-date">${unlockedDate}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            const overlay = document.createElement('div');
            overlay.className = 'achievements-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Achievements');
            overlay.innerHTML = `
                <div class="achievements-modal">
                    <h2 class="achievements-title">🏆 Achievements</h2>
                    <p class="achievements-subtitle">${unlockedCount}/${total} unlocked</p>
                    <div class="achievements-progress-bar">
                        <div class="achievements-progress-fill" style="width: ${total > 0 ? (unlockedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="achievements-grid">${cardsHTML}</div>
                    <button class="achievements-close" id="achievements-close" aria-label="Close achievements">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeAch() {
                popModalEscape(closeAch);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('achievements-btn');
                    if (trigger) trigger.focus();
                });
            }

            document.getElementById('achievements-close').focus();
            document.getElementById('achievements-close').addEventListener('click', closeAch);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAch(); });
            pushModalEscape(closeAch);
            overlay._closeOverlay = closeAch;
            trapFocus(overlay);
        }

        // ==================== DAILY CHECKLIST MODAL ====================

        function showDailyChecklistModal() {
            const existing = document.querySelector('.daily-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const cl = initDailyChecklist();
            const completedCount = cl.tasks.filter(t => t.done).length;
            const totalTasks = cl.tasks.length;
            const weeklyArc = (typeof initWeeklyArc === 'function') ? initWeeklyArc() : null;

            let tasksHTML = '';
            (cl.tasks || []).forEach((task) => {
                if (!task) return;
                const isDone = !!task.done;
                const target = Number(task.target || 1);
                const taskName = task.name || 'Daily task';
                const current = cl.progress[task.trackKey] || 0;
                const progress = Math.min(current, target);
                tasksHTML += `
                    <div class="daily-task ${isDone ? 'done' : ''}" aria-label="${taskName}: ${isDone ? 'completed' : `${progress}/${target}`}">
                        <span class="daily-task-check">${isDone ? '✅' : '⬜'}</span>
                        <span class="daily-task-icon">${task.icon || '📌'}</span>
                        <span class="daily-task-name">${taskName}</span>
                        <span class="daily-task-progress">${progress}/${target}</span>
                    </div>
                `;
            });

            let weeklyArcHTML = '';
            if (weeklyArc && Array.isArray(weeklyArc.tasks) && weeklyArc.tasks.length > 0) {
                const taskRows = weeklyArc.tasks.map((task) => {
                    const target = Math.max(1, Number(task.target) || 1);
                    const progress = Math.min(target, (weeklyArc.progress && weeklyArc.progress[task.trackKey]) || 0);
                    return `<div class="daily-task ${task.done ? 'done' : ''}">
                        <span class="daily-task-check">${task.done ? '✅' : '⬜'}</span>
                        <span class="daily-task-icon">${task.icon || '🏅'}</span>
                        <span class="daily-task-name">${escapeHTML((typeof getDailyTaskName === 'function' ? getDailyTaskName(task, target) : task.nameTemplate || task.id || 'Arc task'))}</span>
                        <span class="daily-task-progress">${progress}/${target}</span>
                    </div>`;
                }).join('');
                weeklyArcHTML = `
                    <div class="daily-weekly-arc ${weeklyArc.completed ? 'completed' : ''}">
                        <h3 class="daily-weekly-title">${weeklyArc.icon || '🏅'} ${escapeHTML(weeklyArc.theme || 'Weekly Arc')}</h3>
                        <div class="daily-tasks-list">${taskRows}</div>
                        <p class="daily-weekly-reward">${weeklyArc.completed ? 'Finale reward unlocked!' : 'Complete all arc tasks for an exclusive finale reward.'}</p>
                    </div>
                `;
            }

            const overlay = document.createElement('div');
            overlay.className = 'daily-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Daily Tasks');
            overlay.innerHTML = `
                <div class="daily-modal">
                    <h2 class="daily-title">📋 Daily Tasks</h2>
                    <p class="daily-subtitle">${completedCount}/${totalTasks} complete today</p>
                    <div class="daily-progress-bar">
                        <div class="daily-progress-fill" style="width: ${totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}%;"></div>
                    </div>
                    <div class="daily-tasks-list">${tasksHTML}</div>
                    ${weeklyArcHTML}
                    ${completedCount === totalTasks ? '<div class="daily-all-done">All tasks complete! Great job today!</div>' : ''}
                    <button class="daily-close" id="daily-close" aria-label="Close daily checklist">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeDaily() {
                popModalEscape(closeDaily);
                animateModalClose(overlay);
            }

            document.getElementById('daily-close').focus();
            document.getElementById('daily-close').addEventListener('click', closeDaily);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDaily(); });
            pushModalEscape(closeDaily);
            overlay._closeOverlay = closeDaily;
            trapFocus(overlay);
        }

        // ==================== BADGES MODAL ====================

        function showBadgesModal() {
            const existing = document.querySelector('.badges-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const unlocked = gameState.badges || {};
            const total = Object.keys(BADGES).length;
            const unlockedCount = getBadgeCount();

            // Group by category
            const grouped = {};
            for (const [id, badge] of Object.entries(BADGES)) {
                if (!grouped[badge.category]) grouped[badge.category] = [];
                grouped[badge.category].push({ id, ...badge });
            }

            let contentHTML = '';
            for (const [catKey, catData] of Object.entries(BADGE_CATEGORIES)) {
                const badges = grouped[catKey] || [];
                if (badges.length === 0) continue;
                contentHTML += `<div class="badge-category-header">${catData.icon} ${catData.label}</div>`;
                contentHTML += '<div class="badges-grid">';
                badges.forEach(badge => {
                    const isUnlocked = unlocked[badge.id] && unlocked[badge.id].unlocked;
                    const tierData = BADGE_TIERS[badge.tier];
                    const unlockedDate = isUnlocked ? new Date(unlocked[badge.id].unlockedAt).toLocaleDateString() : '';
                    contentHTML += `
                        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'} tier-${badge.tier}" aria-label="${badge.name}: ${badge.description}${isUnlocked ? ', earned' : ', locked'}" style="${isUnlocked ? `--badge-glow: ${tierData.glow}; --badge-color: ${tierData.color}` : ''}">
                            <div class="badge-icon">${isUnlocked ? badge.icon : '🔒'}</div>
                            <div class="badge-info">
                                <div class="badge-name">${isUnlocked ? badge.name : '???'}</div>
                                <div class="badge-desc">${badge.description}</div>
                                ${isUnlocked ? `<div class="badge-tier" data-tier="${badge.tier}" style="color: ${tierData.color}">${tierData.label}</div>` : ''}
                                ${isUnlocked ? `<div class="badge-date">${unlockedDate}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                contentHTML += '</div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'badges-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Badges');
            overlay.innerHTML = `
                <div class="badges-modal">
                    <h2 class="badges-title">🎖️ Badges</h2>
                    <p class="badges-subtitle">${unlockedCount}/${total} earned</p>
                    <div class="badges-progress-bar">
                        <div class="badges-progress-fill" style="width: ${total > 0 ? (unlockedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="badges-content">${contentHTML}</div>
                    <button class="badges-close" id="badges-close" aria-label="Close badges">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeBadges() {
                popModalEscape(closeBadges);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('rewards-btn');
                    if (trigger) trigger.focus();
                });
            }

            document.getElementById('badges-close').focus();
            document.getElementById('badges-close').addEventListener('click', closeBadges);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBadges(); });
            pushModalEscape(closeBadges);
            overlay._closeOverlay = closeBadges;
            trapFocus(overlay);
        }

        // ==================== STICKER BOOK MODAL ====================

        function showStickerBookModal() {
            const existing = document.querySelector('.sticker-book-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const collected = gameState.stickers || {};
            const total = Object.keys(STICKERS).length;
            const collectedCount = getStickerCount();

            // Group by category
            const grouped = {};
            for (const [id, sticker] of Object.entries(STICKERS)) {
                if (!grouped[sticker.category]) grouped[sticker.category] = [];
                grouped[sticker.category].push({ id, ...sticker });
            }

            let pagesHTML = '';
            for (const [catKey, catData] of Object.entries(STICKER_CATEGORIES)) {
                const stickers = grouped[catKey] || [];
                if (stickers.length === 0) continue;
                pagesHTML += `<div class="sticker-page-header">${catData.icon} ${catData.label}</div>`;
                pagesHTML += '<div class="sticker-page-grid">';
                stickers.forEach(sticker => {
                    const isCollected = collected[sticker.id] && collected[sticker.id].collected;
                    const rarityData = STICKER_RARITIES[sticker.rarity];
                    const stars = isCollected ? Array(rarityData.stars).fill('⭐').join('') : '';
                    const flavor = (isCollected && typeof getCollectibleFlavorText === 'function') ? getCollectibleFlavorText(sticker.id, 'sticker') : null;
                    const flavorHTML = flavor ? `<div class="sticker-flavor">${escapeHTML(flavor)}</div>` : '';
                    const ariaFlavor = flavor ? ' ' + flavor : '';
                    pagesHTML += `
                        <div class="sticker-slot ${isCollected ? 'collected' : 'empty'} rarity-${sticker.rarity}" aria-label="${isCollected ? sticker.name : 'Empty slot'}: ${sticker.source}${ariaFlavor}">
                            <div class="sticker-emoji">${isCollected ? sticker.emoji : '?'}</div>
                            <div class="sticker-name">${isCollected ? sticker.name : '???'}</div>
                            ${isCollected ? `<div class="sticker-rarity" style="color: ${rarityData.color}">${stars}</div>` : ''}
                            <div class="sticker-source">${sticker.source}</div>
                            ${flavorHTML}
                        </div>
                    `;
                });
                pagesHTML += '</div>';
            }

            // Recommendation #3: Sticker progress pips
            let progressPipsHTML = '';
            if (typeof getStickerProgress === 'function') {
                const progressItems = getStickerProgress();
                if (progressItems.length > 0) {
                    progressPipsHTML = '<div class="sticker-page-header">📊 In Progress</div><div class="sticker-progress-grid">';
                    progressItems.forEach(p => {
                        const pct = p.target > 0 ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0;
                        progressPipsHTML += `
                            <div class="sticker-progress-pip" aria-label="${p.label}: ${p.current}/${p.target} ${p.unit}">
                                <span class="sticker-progress-emoji">${p.emoji}</span>
                                <span class="sticker-progress-label">${p.label}</span>
                                <div class="sticker-progress-bar-mini"><div class="sticker-progress-fill-mini" style="width:${pct}%"></div></div>
                                <span class="sticker-progress-text">${p.current}/${p.target}</span>
                            </div>`;
                    });
                    progressPipsHTML += '</div>';
                }
            }

            const overlay = document.createElement('div');
            overlay.className = 'sticker-book-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Sticker Collection Book');
            overlay.innerHTML = `
                <div class="sticker-book-modal">
                    <h2 class="sticker-book-title">📓 Sticker Book</h2>
                    <p class="sticker-book-subtitle">${collectedCount}/${total} collected</p>
                    <div class="sticker-book-progress-bar">
                        <div class="sticker-book-progress-fill" style="width: ${total > 0 ? (collectedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="sticker-book-pages">${pagesHTML}${progressPipsHTML}</div>
                    <button class="sticker-book-close" id="sticker-book-close" aria-label="Close sticker book">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeStickerBook() {
                popModalEscape(closeStickerBook);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('rewards-btn');
                    if (trigger) trigger.focus();
                });
            }

            document.getElementById('sticker-book-close').focus();
            document.getElementById('sticker-book-close').addEventListener('click', closeStickerBook);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStickerBook(); });
            pushModalEscape(closeStickerBook);
            overlay._closeOverlay = closeStickerBook;
            trapFocus(overlay);
        }

        // ==================== TROPHY ROOM MODAL ====================

        function showTrophyRoomModal() {
            const existing = document.querySelector('.trophy-room-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const earned = gameState.trophies || {};
            const total = Object.keys(TROPHIES).length;
            const earnedCount = getTrophyCount();

            // Group by shelf
            const grouped = {};
            for (const [id, trophy] of Object.entries(TROPHIES)) {
                if (!grouped[trophy.shelf]) grouped[trophy.shelf] = [];
                grouped[trophy.shelf].push({ id, ...trophy });
            }

            let shelvesHTML = '';
            for (const [shelfKey, shelfData] of Object.entries(TROPHY_SHELVES)) {
                const trophies = grouped[shelfKey] || [];
                if (trophies.length === 0) continue;
                shelvesHTML += `<div class="trophy-shelf">`;
                shelvesHTML += `<div class="trophy-shelf-label">${shelfData.icon} ${shelfData.label}</div>`;
                shelvesHTML += '<div class="trophy-shelf-items">';
                trophies.forEach(trophy => {
                    const isEarned = earned[trophy.id] && earned[trophy.id].earned;
                    const earnedDate = isEarned ? new Date(earned[trophy.id].earnedAt).toLocaleDateString() : '';
                    shelvesHTML += `
                        <div class="trophy-item ${isEarned ? 'earned' : 'locked'}" aria-label="${trophy.name}: ${trophy.description}${isEarned ? ', earned' : ', locked'}">
                            <div class="trophy-icon">${isEarned ? trophy.icon : '🔒'}</div>
                            <div class="trophy-plaque">
                                <div class="trophy-name">${isEarned ? trophy.name : '???'}</div>
                                <div class="trophy-desc">${trophy.description}</div>
                                ${isEarned ? `<div class="trophy-date">${earnedDate}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                shelvesHTML += '</div></div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'trophy-room-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Trophy Room');
            overlay.innerHTML = `
                <div class="trophy-room-modal">
                    <h2 class="trophy-room-title">🏆 Trophy Room</h2>
                    <p class="trophy-room-subtitle">${earnedCount}/${total} trophies</p>
                    <div class="trophy-room-progress-bar">
                        <div class="trophy-room-progress-fill" style="width: ${total > 0 ? (earnedCount / total) * 100 : 0}%;"></div>
                    </div>
                    <div class="trophy-shelves">${shelvesHTML}</div>
                    <button class="trophy-room-close" id="trophy-room-close" aria-label="Close trophy room">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function closeTrophyRoom() {
                popModalEscape(closeTrophyRoom);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('rewards-btn');
                    if (trigger) trigger.focus();
                });
            }

            document.getElementById('trophy-room-close').focus();
            document.getElementById('trophy-room-close').addEventListener('click', closeTrophyRoom);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeTrophyRoom(); });
            pushModalEscape(closeTrophyRoom);
            overlay._closeOverlay = closeTrophyRoom;
            trapFocus(overlay);
        }

        // ==================== DAILY STREAK MODAL ====================

	        function showStreakModal() {
            const existing = document.querySelector('.streak-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const streak = gameState.streak || { current: 0, longest: 0, todayBonusClaimed: false, claimedMilestones: [] };
            const bonus = getStreakBonus(streak.current);
            const canClaim = !streak.todayBonusClaimed && streak.current > 0 && gameState.pet;
            const prestige = streak.prestige || { lifetimeTier: 0, completedCycles: 0 };
            const streakStatus = (typeof getStreakProtectionStatus === 'function')
                ? getStreakProtectionStatus()
                : {
                    freezeTokens: 0,
                    autoUseFreeze: true,
                    checkpoint: 0,
                    checkpointFloor: 1,
                    nextMilestone: null,
                    daysToMilestone: 0,
                    lastOutcome: ''
                };
            const freezeCost = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.streakFreezeTokenCost))
                ? Math.max(1, Math.floor(ECONOMY_BALANCE.streakFreezeTokenCost))
                : 120;
            const checkpointCopy = streakStatus.checkpoint > 0
                ? `Checkpoint protection active at day ${streakStatus.checkpoint}. If you miss a day, your streak floors at day ${streakStatus.checkpointFloor}.`
                : 'No checkpoint yet. Reach day 7 to unlock your first checkpoint safeguard.';
            const nextMilestoneCopy = streakStatus.nextMilestone
                ? `${streakStatus.nextMilestone.label} in ${streakStatus.daysToMilestone} day${streakStatus.daysToMilestone === 1 ? '' : 's'}.`
                : 'You reached every listed milestone. Keep the chain alive.';

            // Build milestone timeline
            let milestonesHTML = '';
            STREAK_MILESTONES.forEach(milestone => {
                const reached = streak.current >= milestone.days;
                const claimed = streak.claimedMilestones && streak.claimedMilestones.includes(milestone.days);
                const bundle = milestone.bundleId && REWARD_BUNDLES ? REWARD_BUNDLES[milestone.bundleId] : null;
                const collectible = bundle && bundle.collectible ? bundle.collectible : null;
                const rewardLabel = collectible && collectible.type === 'sticker'
                    ? `${STICKERS[collectible.id] ? STICKERS[collectible.id].emoji : '🎁'} ${STICKERS[collectible.id] ? STICKERS[collectible.id].name : 'Collectible'} + ${bundle && bundle.coins ? `${bundle.coins} coins` : 'bundle'}`
                    : collectible && collectible.type === 'accessory'
                        ? `${ACCESSORIES[collectible.id] ? ACCESSORIES[collectible.id].emoji : '🎁'} ${ACCESSORIES[collectible.id] ? ACCESSORIES[collectible.id].name : 'Collectible'} + ${bundle && bundle.coins ? `${bundle.coins} coins` : 'bundle'}`
                        : `${bundle && bundle.coins ? `${bundle.coins} coins` : 'Bundle reward'}`;
                const freezeText = milestone.freezeTokens ? ` + ${milestone.freezeTokens} freeze token${milestone.freezeTokens === 1 ? '' : 's'}` : '';

                const milestoneBonus = getStreakBonus(milestone.days);
                milestonesHTML += `
                    <div class="streak-milestone ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}" aria-label="${milestone.label}: ${milestone.description}. Reward: ${rewardLabel}${freezeText}. Daily bonus: ${milestoneBonus.label}${reached ? '. Reached' : ''}">
                        <div class="streak-milestone-day">${milestone.label}</div>
                        <div class="streak-milestone-marker">${reached ? '🔥' : '⚪'}</div>
                        <div class="streak-milestone-reward">${rewardLabel}${freezeText}</div>
                        <div class="streak-milestone-desc">${milestone.description}</div>
                        <div class="streak-milestone-bonus">${milestoneBonus.label}</div>
                    </div>
                `;
            });

            // Build flame visualization
            let flameEmojis = '';
            if (streak.current >= 30) flameEmojis = '🔥🔥🔥🔥🔥';
            else if (streak.current >= 14) flameEmojis = '🔥🔥🔥🔥';
            else if (streak.current >= 7) flameEmojis = '🔥🔥🔥';
            else if (streak.current >= 3) flameEmojis = '🔥🔥';
            else if (streak.current >= 1) flameEmojis = '🔥';
            else flameEmojis = '💨';

            const overlay = document.createElement('div');
            overlay.className = 'streak-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Daily Streak');
            overlay.innerHTML = `
                <div class="streak-modal">
                    <h2 class="streak-title">🔥 Daily Streak</h2>
                    <div class="streak-flame-display">${flameEmojis}</div>
                    <div class="streak-count">${streak.current} day${streak.current !== 1 ? 's' : ''}</div>
                    <div class="streak-longest">Longest: ${streak.longest} day${streak.longest !== 1 ? 's' : ''}</div>
                    <div class="streak-longest">Prestige Tier: ${prestige.lifetimeTier || 0} · Cycles: ${prestige.completedCycles || 0}</div>
                    <div class="streak-longest">Freeze Tokens: ${streakStatus.freezeTokens}</div>
                    <div class="streak-bonus-info">
                        <div class="streak-bonus-label">Today's Bonus</div>
                        <div class="streak-bonus-value">${bonus.label}</div>
                    </div>
                    <div class="streak-protection-panel" role="group" aria-label="Streak protection controls">
                        <p class="streak-protection-copy">${escapeHTML(checkpointCopy)}</p>
                        <p class="streak-protection-copy">${escapeHTML(nextMilestoneCopy)}</p>
                        <label class="streak-protection-toggle">
                            <input id="streak-auto-freeze-toggle" type="checkbox" ${streakStatus.autoUseFreeze ? 'checked' : ''} aria-label="Automatically use streak freeze tokens">
                            Auto-use freeze tokens
                        </label>
                        <button class="streak-freeze-buy-btn" id="streak-freeze-buy-btn" type="button" aria-label="Buy one streak freeze token for ${freezeCost} coins">Buy Freeze Token (${freezeCost} coins)</button>
                        ${streakStatus.lastOutcome ? `<p class="streak-protection-outcome">${escapeHTML(streakStatus.lastOutcome)}</p>` : ''}
                    </div>
                    ${canClaim ? `
                        <button class="streak-claim-btn" id="streak-claim-btn">Claim Today's Bonus!</button>
                    ` : streak.todayBonusClaimed ? `
                        <div class="streak-claimed-msg">Today's bonus claimed!</div>
                    ` : ''}
                    <div class="streak-milestones-title">Milestones</div>
                    <div class="streak-milestones">${milestonesHTML}</div>
                    <button class="streak-close" id="streak-close" aria-label="Close daily streak">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Claim bonus handler
            const claimBtn = document.getElementById('streak-claim-btn');
            if (claimBtn) {
                claimBtn.addEventListener('click', () => {
                    const result = claimStreakBonus();
                    if (result) {
                        showToast(`🔥 Streak bonus: ${result.bonus.label}`, '#FF6D00');
                        // Recommendation #4: Show streak drip coins
                        if (result.streakDripCoins > 0) {
                            setTimeout(() => showToast(`🪙 Streak drip: +${result.streakDripCoins} coins`, '#FFD700'), 300);
                        }
                        result.milestones.forEach((m, idx) => {
                            const rewardCoins = m.bundle && m.bundle.earnedCoins ? ` +${m.bundle.earnedCoins} coins` : '';
                            const freezeCopy = m.freezeGranted ? ` +${m.freezeGranted} freeze token${m.freezeGranted === 1 ? '' : 's'}` : '';
                            setTimeout(() => showToast(`🎁 Streak reward: ${m.label}${rewardCoins}${freezeCopy}`, '#E040FB'), 500 + (idx * 180));
                        });
                        if (result.prestigeReward) {
                            setTimeout(() => showToast(`🌠 Prestige celebration: ${result.prestigeReward.icon} ${result.prestigeReward.label}!`, '#7C4DFF'), 900);
                        }
                        // Refresh displays
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                        // Refresh the modal
                        closeStreak();
                        showStreakModal();
                    }
                });
            }
            const autoFreezeToggle = document.getElementById('streak-auto-freeze-toggle');
            if (autoFreezeToggle) {
                autoFreezeToggle.addEventListener('change', () => {
                    if (typeof setStreakFreezeAutoUse === 'function') {
                        const enabled = setStreakFreezeAutoUse(autoFreezeToggle.checked);
                        showToast(enabled ? '🧊 Auto-use freeze tokens enabled.' : '🧊 Auto-use freeze tokens disabled.', '#90CAF9');
                    }
                });
            }
            const buyFreezeBtn = document.getElementById('streak-freeze-buy-btn');
            if (buyFreezeBtn) {
                buyFreezeBtn.addEventListener('click', () => {
                    if (typeof buyStreakFreezeToken !== 'function') return;
                    const result = buyStreakFreezeToken(1);
                    if (!result || !result.ok) {
                        showToast('Not enough coins for a freeze token yet.', '#FF8A65');
                        return;
                    }
                    showToast(`🧊 Freeze token purchased. You now have ${result.freezeTokens}.`, '#90CAF9');
                    closeStreak();
                    showStreakModal();
                });
            }

            function closeStreak() {
                popModalEscape(closeStreak);
                animateModalClose(overlay);
            }

            document.getElementById('streak-close').focus();
            document.getElementById('streak-close').addEventListener('click', closeStreak);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStreak(); });
            pushModalEscape(closeStreak);
            overlay._closeOverlay = closeStreak;
	            trapFocus(overlay);
	        }

	        function showJourneyModal() {
	            const existing = document.querySelector('.journey-overlay');
	            if (existing) {
	                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
	                existing.remove();
	            }
	            const status = (typeof getJourneyStatus === 'function')
                    ? getJourneyStatus()
                    : ((typeof Journey !== 'undefined' && Journey && typeof Journey.getJourneyModalStatus === 'function') ? Journey.getJourneyModalStatus() : null);
                if (!status) return;
	            const chapters = (typeof getJourneyChapterStates === 'function')
                    ? getJourneyChapterStates()
                    : ((typeof Journey !== 'undefined' && Journey && typeof Journey.getJourneyChapterStates === 'function') ? Journey.getJourneyChapterStates() : []);
                if (typeof Journey !== 'undefined' && Journey && typeof Journey.trackJourneyOpen === 'function') Journey.trackJourneyOpen();
	            const chapterObjectives = Array.isArray(status.chapterObjectives) ? status.chapterObjectives : [];
	            const objectivesHTML = chapterObjectives.length > 0
	                ? chapterObjectives.map((objective) => `
	                    <div class="journey-objective ${objective.done ? 'done' : ''}" aria-label="${escapeHTML(objective.label)} ${objective.value}/${objective.target}">
	                        <span class="journey-objective-icon" aria-hidden="true">${objective.done ? '✅' : '⬜'}</span>
	                        <span class="journey-objective-label">${escapeHTML(objective.label)}</span>
	                        <span class="journey-objective-progress">${objective.value}/${objective.target}</span>
	                    </div>
	                `).join('')
	                : '<p class="journey-empty">No chapter objectives available yet.</p>';
	            const chapterHTML = chapters.map((chapter) => `
	                <div class="journey-chapter-card ${chapter.complete ? 'complete' : ''} ${chapter.unlocked ? 'unlocked' : 'locked'}" aria-label="${escapeHTML(chapter.label)} ${chapter.completed}/${chapter.total}">
	                    <div class="journey-chapter-head">
	                        <strong>${escapeHTML(chapter.label)}</strong>
	                        <span>Days ${chapter.dayStart}-${chapter.dayEnd}</span>
	                    </div>
	                    <div class="journey-track-bar"><span style="width:${chapter.pct}%;"></span></div>
	                    <div class="journey-chapter-foot">${chapter.completed}/${chapter.total} objectives</div>
	                </div>
	            `).join('');
	            const track = status.trackProgress || {};
	            const bond = track.bond || { completed: 0, total: 0, pct: 0 };
	            const mastery = track.mastery || { completed: 0, total: 0, pct: 0 };
	            const collection = track.collection || { completed: 0, total: 0, pct: 0 };
                const comebackQuest = status.comebackQuest || (typeof getActiveComebackQuest === 'function' ? getActiveComebackQuest() : null);
                const retentionEmotionalStrings = (typeof MLFRetentionStrings !== 'undefined' && MLFRetentionStrings && MLFRetentionStrings.emotional)
                    ? MLFRetentionStrings.emotional
                    : { comebackCta: 'Resume comeback quest' };
                const comebackQuestHTML = (comebackQuest && comebackQuest.status !== 'completed')
                    ? `
                        <div class="journey-emotional-prompt" role="group" aria-label="Comeback quest">
                            <p><strong>✨ ${escapeHTML(comebackQuest.title || 'Comeback quest')}</strong></p>
                            <p>${escapeHTML(comebackQuest.body || '')}</p>
                            <p>${Math.floor(comebackQuest.progress || 0)}/${Math.floor(comebackQuest.target || 1)} complete</p>
                            <button type="button" data-journey-emotional-action="comeback">${escapeHTML(retentionEmotionalStrings.comebackCta || 'Resume comeback quest')}</button>
                        </div>
                    `
                    : '';
                const seasonalJourney = status.seasonalJourney || (typeof getCurrentSeasonalJourney === 'function' ? getCurrentSeasonalJourney() : null);
                const seasonalJourneyHTML = seasonalJourney
                    ? `
                        <div class="journey-emotional-prompt" role="group" aria-label="Seasonal journey">
                            <p><strong>${escapeHTML((seasonalJourney.icon || '✨') + ' ' + (seasonalJourney.title || 'Seasonal Journey'))}</strong></p>
                            <p>Week ${escapeHTML(seasonalJourney.weekKey || '')} · ${Math.floor(seasonalJourney.completedObjectives || 0)}/${Math.floor(seasonalJourney.totalObjectives || 0)} objectives</p>
                            ${Array.isArray(seasonalJourney.rewardTrack) && seasonalJourney.rewardTrack.length ? `<p>Reward track: ${escapeHTML(seasonalJourney.rewardTrack.map((r) => r && r.label ? r.label : 'Reward').join(' · '))}</p>` : ''}
                        </div>
                    `
                    : '';
                const playerProfile = status.playerProfile || (typeof getRetentionPlayerProfile === 'function' ? getRetentionPlayerProfile() : null);
                const playerProfileHTML = (playerProfile && playerProfile.style)
                    ? `<p class="journey-subtitle">Play style: ${escapeHTML(String(playerProfile.style))}${Number(playerProfile.confidence) > 0 ? ` (${Math.round(Number(playerProfile.confidence) * 100)}%)` : ''}</p>`
                    : '';
                const visibleRewards = status.visibleRewards || (typeof getRetentionVisibleRewardsSummary === 'function' ? getRetentionVisibleRewardsSummary() : null);
                const visibleRewardsHTML = (visibleRewards && Array.isArray(visibleRewards.rows))
                    ? `
                        <div class="journey-emotional-prompt" role="group" aria-label="Visible unlocks">
                            <p><strong>🪄 Permanent Visible Unlocks</strong></p>
                            <p>${(visibleRewards.rows || []).map((row) => `${escapeHTML(row.label)} ${Math.floor(row.count || 0)}`).join(' · ')}</p>
                            ${Array.isArray(visibleRewards.recent) && visibleRewards.recent.length ? `<p>Recent: ${escapeHTML(visibleRewards.recent.map((r) => `${r.icon || '✨'} ${r.title || r.id || 'unlock'}`).join(' · '))}</p>` : ''}
                        </div>
                    `
                    : '';
                const emotionalPrompt = (typeof getRetentionEmotionalPrompt === 'function') ? getRetentionEmotionalPrompt() : null;
                const emotionalPromptHTML = (emotionalPrompt && emotionalPrompt.title)
                    ? `
                        <div class="journey-emotional-prompt" role="group" aria-label="Suggested next action">
                            <p><strong>${escapeHTML(emotionalPrompt.title)}</strong></p>
                            <p>${escapeHTML(emotionalPrompt.body || '')}</p>
                            <button type="button" data-journey-emotional-action="${escapeHTML(emotionalPrompt.actionType || 'journey')}">${escapeHTML(emotionalPrompt.ctaLabel || 'Open Journey')}</button>
                        </div>
                    `
                    : '';
                const tokenStore = (typeof getJourneyTokenStoreInventory === 'function')
                    ? getJourneyTokenStoreInventory()
                    : (status.tokenStore || { items: [] });
                const tokenStoreHTML = (typeof redeemJourneyTokenReward === 'function')
                    ? `
                        <div class="journey-token-store" role="group" aria-label="Journey token rewards">
                            ${(Array.isArray(tokenStore.items) ? tokenStore.items : []).map((item) => {
                                const soldOut = !!item.soldOut;
                                const stockText = item.remaining == null ? '∞' : `${Math.max(0, Math.floor(item.remaining))} left`;
                                const limitedTag = item.limited ? ' · Limited' : '';
                                return `<button type="button" data-journey-redeem="${escapeHTML(item.id)}" ${soldOut ? 'disabled' : ''}>${escapeHTML((item.title || item.id) + ` (${Math.floor(item.cost || 0)})`)} <span aria-hidden="true">${escapeHTML(stockText + limitedTag)}</span></button>`;
                            }).join('')}
                        </div>
                    `
                    : '';

	            const overlay = document.createElement('div');
	            overlay.className = 'journey-overlay';
	            overlay.setAttribute('role', 'dialog');
	            overlay.setAttribute('aria-modal', 'true');
	            overlay.setAttribute('aria-labelledby', 'journey-title');
	            overlay.innerHTML = `
	                <div class="journey-modal">
	                    <h2 id="journey-title" class="journey-title">🧭 30-Day Journey</h2>
	                    <p class="journey-subtitle">Day ${status.day} · ${escapeHTML(status.chapter ? status.chapter.label : 'Journey')}</p>
	                    <p class="journey-subtitle">Journey Tokens: ${status.tokens} · Bond XP: ${status.bondXp} (Level ${status.bondLevel})</p>
                        ${playerProfileHTML}
                        ${comebackQuestHTML}
                        ${seasonalJourneyHTML}
                        ${visibleRewardsHTML}
                        ${emotionalPromptHTML}
	                    <div class="journey-track-list" role="list" aria-label="Journey tracks">
	                        <div class="journey-track" role="listitem" aria-label="Bond track ${bond.completed} of ${bond.total}">
	                            <span>💞 Bond</span>
	                            <div class="journey-track-bar"><span style="width:${bond.pct}%;"></span></div>
	                        </div>
	                        <div class="journey-track" role="listitem" aria-label="Mastery track ${mastery.completed} of ${mastery.total}">
	                            <span>🧠 Mastery</span>
	                            <div class="journey-track-bar"><span style="width:${mastery.pct}%;"></span></div>
	                        </div>
	                        <div class="journey-track" role="listitem" aria-label="Collection track ${collection.completed} of ${collection.total}">
	                            <span>📚 Collection</span>
	                            <div class="journey-track-bar"><span style="width:${collection.pct}%;"></span></div>
	                        </div>
	                    </div>
	                    <h3 class="journey-section-title">Current Chapter Objectives</h3>
	                    <div class="journey-objective-list" role="list">${objectivesHTML}</div>
	                    <h3 class="journey-section-title">Chapter Progress</h3>
	                    <div class="journey-chapter-list">${chapterHTML}</div>
	                    <h3 class="journey-section-title">Journey Token Rewards</h3>
	                    ${tokenStoreHTML}
	                    <button class="journey-close" id="journey-close" aria-label="Close journey">Close</button>
	                </div>
	            `;
	            document.body.appendChild(overlay);

	            function closeJourney() {
	                popModalEscape(closeJourney);
	                animateModalClose(overlay, () => {
	                    const trigger = document.getElementById('journey-btn');
	                    if (trigger) trigger.focus();
	                });
	            }

	            overlay.querySelectorAll('[data-journey-redeem]').forEach((button) => {
	                button.addEventListener('click', () => {
	                    if (typeof redeemJourneyTokenReward !== 'function') return;
	                    const rewardId = button.getAttribute('data-journey-redeem');
	                    const result = redeemJourneyTokenReward(rewardId);
	                    if (!result || !result.ok) {
	                        showToast('Not enough Journey Tokens for that reward yet.', '#EF9A9A');
	                        return;
	                    }
	                    showToast(`🧭 ${result.message}`, '#66BB6A');
	                    closeJourney();
	                    showJourneyModal();
	                });
	            });
                overlay.querySelectorAll('[data-journey-emotional-action]').forEach((button) => {
                    button.addEventListener('click', () => {
                        const actionType = button.getAttribute('data-journey-emotional-action') || 'journey';
                        if (typeof noteRetentionActivity === 'function') noteRetentionActivity(actionType);
                        if ((actionType === 'explore' || actionType === 'expedition') && typeof showExplorationModal === 'function') {
                            closeJourney();
                            showExplorationModal();
                            return;
                        }
                        if (actionType === 'streak' && typeof showStreakModal === 'function') {
                            closeJourney();
                            showStreakModal();
                            return;
                        }
                        if (actionType === 'comeback' && typeof openComebackQuest === 'function') {
                            closeJourney();
                            openComebackQuest();
                            return;
                        }
                        if (actionType === 'garden' && typeof switchRoom === 'function') {
                            closeJourney();
                            switchRoom('garden');
                            if (typeof renderPetPhase === 'function') renderPetPhase();
                            return;
                        }
                        if (actionType === 'social' && typeof showHouseholdSummaryModal === 'function') {
                            closeJourney();
                            showHouseholdSummaryModal();
                            return;
                        }
                    });
                });

	            document.getElementById('journey-close').focus();
	            document.getElementById('journey-close').addEventListener('click', closeJourney);
	            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeJourney(); });
	            pushModalEscape(closeJourney);
	            overlay._closeOverlay = closeJourney;
	            trapFocus(overlay);
	        }

	        function showReturnMemoryRecapModal(recap) {
	            if (!recap || typeof recap !== 'object') return;
	            const existing = document.querySelector('.return-recap-overlay');
	            if (existing) {
	                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
	                existing.remove();
	            }
	            const activityLabels = {
	                expedition: 'last expedition progress',
	                harvest: 'garden harvest rhythm',
	                minigame: 'mini-game momentum',
	                daily: 'daily routine',
	                care: 'care routine',
	                collection: 'collection progress'
	            };
	            const activityLabel = activityLabels[recap.lastActivity] || 'your recent progress';
                const emotionalPrompt = (typeof getRetentionEmotionalPrompt === 'function') ? getRetentionEmotionalPrompt() : null;
                const suggestionLine = emotionalPrompt && emotionalPrompt.body
                    ? `<p>${escapeHTML(emotionalPrompt.body)}</p>`
                    : '';
	            const overlay = document.createElement('div');
	            overlay.className = 'return-recap-overlay';
	            overlay.setAttribute('role', 'dialog');
	            overlay.setAttribute('aria-modal', 'true');
	            overlay.setAttribute('aria-labelledby', 'return-recap-title');
	            overlay.innerHTML = `
	                <div class="return-recap-modal">
	                    <h2 id="return-recap-title">📘 While You Were Away</h2>
	                    <p>You were away for ${Math.max(0, Math.floor(recap.awayDays || 0))} day${Math.floor(recap.awayDays || 0) === 1 ? '' : 's'}.</p>
	                    <p>Last focus: ${escapeHTML(activityLabel)}.</p>
	                    <p>Current streak: ${Math.max(0, Math.floor(recap.streak || 0))} · Bond level: ${Math.max(1, Math.floor(recap.bondLevel || 1))} · Journey day: ${Math.max(1, Math.floor(recap.journeyDay || 1))}.</p>
                        ${suggestionLine}
	                    <div class="return-recap-actions">
	                        <button id="return-recap-close" type="button">Continue</button>
	                        <button id="return-recap-skip" type="button">Skip</button>
	                    </div>
	                </div>
	            `;
	            document.body.appendChild(overlay);

	            function closeRecap() {
	                popModalEscape(closeRecap);
	                animateModalClose(overlay);
	            }

	            const closeBtn = document.getElementById('return-recap-close');
	            const skipBtn = document.getElementById('return-recap-skip');
	            if (closeBtn) closeBtn.addEventListener('click', closeRecap);
	            if (skipBtn) skipBtn.addEventListener('click', closeRecap);
	            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRecap(); });
	            pushModalEscape(closeRecap);
	            overlay._closeOverlay = closeRecap;
	            trapFocus(overlay);
	            if (closeBtn) closeBtn.focus();
	        }

	        // ==================== REWARDS HUB MODAL ====================

        function showRewardsHub() {
            const existing = document.querySelector('.rewards-hub-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const badgeCount = getBadgeCount();
            const badgeTotal = Object.keys(BADGES).length;
            const stickerCount = getStickerCount();
            const stickerTotal = Object.keys(STICKERS).length;
            const trophyCount = getTrophyCount();
            const trophyTotal = Object.keys(TROPHIES).length;
            const streak = gameState.streak || { current: 0, longest: 0 };
            const canClaimStreak = streak.current > 0 && !streak.todayBonusClaimed && gameState.pet;

            const overlay = document.createElement('div');
            overlay.className = 'rewards-hub-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Rewards');
            overlay.innerHTML = `
                <div class="rewards-hub-modal">
                    <h2 class="rewards-hub-title">🎁 Rewards</h2>
                    <div class="rewards-hub-grid">
                        <button class="rewards-hub-card" id="rh-badges" aria-label="Badges: ${badgeCount} of ${badgeTotal}">
                            <div class="rewards-hub-card-icon">🎖️</div>
                            <div class="rewards-hub-card-label">Badges</div>
                            <div class="rewards-hub-card-count">${badgeCount}/${badgeTotal}</div>
                        </button>
                        <button class="rewards-hub-card" id="rh-stickers" aria-label="Sticker Book: ${stickerCount} of ${stickerTotal}">
                            <div class="rewards-hub-card-icon">📓</div>
                            <div class="rewards-hub-card-label">Stickers</div>
                            <div class="rewards-hub-card-count">${stickerCount}/${stickerTotal}</div>
                        </button>
                        <button class="rewards-hub-card" id="rh-trophies" aria-label="Trophy Room: ${trophyCount} of ${trophyTotal}">
                            <div class="rewards-hub-card-icon">🏆</div>
                            <div class="rewards-hub-card-label">Trophies</div>
                            <div class="rewards-hub-card-count">${trophyCount}/${trophyTotal}</div>
                        </button>
                        <button class="rewards-hub-card ${canClaimStreak ? 'has-reward' : ''}" id="rh-streak" aria-label="Daily Streak: ${streak.current} day${streak.current !== 1 ? 's' : ''}">
                            <div class="rewards-hub-card-icon">🔥</div>
                            <div class="rewards-hub-card-label">Streak</div>
                            <div class="rewards-hub-card-count">${streak.current} day${streak.current !== 1 ? 's' : ''}</div>
                            ${canClaimStreak ? '<div class="rewards-hub-card-alert">!</div>' : ''}
                        </button>
                    </div>
                    <button class="rewards-hub-close" id="rewards-hub-close" aria-label="Close rewards hub">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            // Navigation to sub-modals
            document.getElementById('rh-badges').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showBadgesModal(), 0); });
            document.getElementById('rh-stickers').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showStickerBookModal(), 0); });
            document.getElementById('rh-trophies').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showTrophyRoomModal(), 0); });
            document.getElementById('rh-streak').addEventListener('click', () => { closeRewardsHub(); setTimeout(() => showStreakModal(), 0); });

            function closeRewardsHub() {
                popModalEscape(closeRewardsHub);
                animateModalClose(overlay);
            }

            document.getElementById('rewards-hub-close').focus();
            document.getElementById('rewards-hub-close').addEventListener('click', closeRewardsHub);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRewardsHub(); });
            pushModalEscape(closeRewardsHub);
            overlay._closeOverlay = closeRewardsHub;
            trapFocus(overlay);
        }

        // D33: Keyboard shortcuts reference modal
        function showKeyboardShortcutsModal() {
            const existing = document.querySelector('.keyboard-shortcuts-overlay');
            if (existing) { if (existing._closeOverlay) popModalEscape(existing._closeOverlay); existing.remove(); }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay keyboard-shortcuts-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Keyboard Shortcuts');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:380px;">
                    <h2 style="margin:0 0 12px;font-size:1.1rem;">Keyboard Shortcuts</h2>
                    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid #ddd;">Key</th><th style="text-align:left;padding:4px 8px;border-bottom:1px solid #ddd;">Action</th></tr></thead>
                        <tbody>
                            <tr><td style="padding:4px 8px;"><kbd>1</kbd></td><td style="padding:4px 8px;">Feed</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>2</kbd></td><td style="padding:4px 8px;">Wash</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>3</kbd></td><td style="padding:4px 8px;">Sleep</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>4</kbd></td><td style="padding:4px 8px;">Pet</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>5</kbd></td><td style="padding:4px 8px;">Play</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>6</kbd></td><td style="padding:4px 8px;">Treat</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>7</kbd></td><td style="padding:4px 8px;">Games</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>8</kbd></td><td style="padding:4px 8px;">Arena</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>9</kbd></td><td style="padding:4px 8px;">Treasure</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>N</kbd></td><td style="padding:4px 8px;">Notification history</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>Esc</kbd></td><td style="padding:4px 8px;">Close modal</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>Tab</kbd></td><td style="padding:4px 8px;">Navigate</td></tr>
                            <tr><td style="padding:4px 8px;"><kbd>Enter</kbd> / <kbd>Space</kbd></td><td style="padding:4px 8px;">Activate</td></tr>
                        </tbody>
                    </table>
                    <button class="modal-btn" id="kbd-shortcuts-close" aria-label="Close keyboard shortcuts" style="margin-top:12px;">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);
            function closeKbd() {
                popModalEscape(closeKbd);
                animateModalClose(overlay);
            }
            overlay._closeOverlay = closeKbd;
            document.getElementById('kbd-shortcuts-close').addEventListener('click', closeKbd);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeKbd(); });
            pushModalEscape(closeKbd);
            trapFocus(overlay);
            document.getElementById('kbd-shortcuts-close').focus();
        }
