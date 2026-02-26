// ============================================================
// ui/pet-relationships.js  —  Pet-to-pet relationship panel
// Bond types: friend, rival, sibling, mentor
// Duo bonuses affect moods and activity multipliers
// ============================================================

        // ==================== BOND TYPE DEFINITIONS ====================

        const _BOND_DEFS = {
            sibling:     { label: 'Siblings',     icon: '\u{1F46B}', color: '#B39DDB', desc: 'Born together — always there for each other' },
            mentor:      { label: 'Mentoring',    icon: '\u{1F4DA}', color: '#80CBC4', desc: 'Wisdom and guidance passed on' },
            friend:      { label: 'Best Friends', icon: '\u{1F49B}', color: '#FFD54F', desc: 'True companions through and through' },
            rival:       { label: 'Rivals',       icon: '\u2694\uFE0F',  color: '#FFAB91', desc: 'Push each other to be better' },
            acquaintance:{ label: 'Acquaintances',icon: '\u{1F91D}', color: '#B0BEC5', desc: 'Getting to know each other' }
        };

        // ==================== HELPERS ====================

        function _relModule() {
            return (typeof MLFSimRelationships !== 'undefined') ? MLFSimRelationships : null;
        }

        function _getHouseholdRels() {
            if (typeof gameState !== 'undefined' && gameState && gameState.household) {
                return gameState.household.relationships || {};
            }
            return {};
        }

        function _getHouseholdPets() {
            if (typeof gameState !== 'undefined' && gameState && gameState.household) {
                return gameState.household.petsById || {};
            }
            return {};
        }

        function _getActivePetId() {
            if (typeof gameState !== 'undefined' && gameState) {
                if (gameState.pet && gameState.pet.id != null) return String(gameState.pet.id);
                if (gameState.household && gameState.household.activePetId != null) return String(gameState.household.activePetId);
            }
            return null;
        }

        function _getPetEmoji(pet) {
            if (!pet) return '\u{1F43E}';
            if (typeof getAllPetTypeData === 'function') {
                const d = getAllPetTypeData(pet.type);
                if (d && d.emoji) return d.emoji;
            }
            if (typeof PET_TYPES !== 'undefined' && PET_TYPES && pet && pet.type && PET_TYPES[pet.type]) {
                return PET_TYPES[pet.type].emoji || '\u{1F43E}';
            }
            return '\u{1F43E}';
        }

        function _escapeRelHTML(s) {
            return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function _getBondDef(tags) {
            if (!Array.isArray(tags)) return _BOND_DEFS.acquaintance;
            if (tags.indexOf('sibling') !== -1) return _BOND_DEFS.sibling;
            if (tags.indexOf('mentor') !== -1)  return _BOND_DEFS.mentor;
            if (tags.indexOf('friend') !== -1)  return _BOND_DEFS.friend;
            if (tags.indexOf('rival') !== -1)   return _BOND_DEFS.rival;
            return _BOND_DEFS.acquaintance;
        }

        // ==================== RENDERING ====================

        function _renderAffinityBar(affinity) {
            const pct = Math.round(((clamp(affinity, -100, 100) + 100) / 200) * 100);
            let fillColor;
            if (affinity >= 60) fillColor = '#FFD54F';
            else if (affinity >= 40) fillColor = '#A5D6A7';
            else if (affinity <= -60) fillColor = '#FFAB91';
            else if (affinity <= -40) fillColor = '#FFCC80';
            else fillColor = '#B0BEC5';
            const label = affinity > 0 ? '+' + affinity : String(affinity);
            return `<div class="rel-bar-track" role="progressbar" aria-valuenow="${affinity}" aria-valuemin="-100" aria-valuemax="100" aria-label="Affinity ${label}">
                <div class="rel-bar-fill" style="width:${pct}%;background:${fillColor};"></div>
            </div>`;
        }

        function _renderFamiliarityBar(familiarity) {
            const pct = clamp(Math.round(familiarity), 0, 100);
            return `<div class="rel-bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Familiarity ${pct}%">
                <div class="rel-bar-fill rel-bar-fill--fam" style="width:${pct}%;"></div>
            </div>`;
        }

        function _renderRelCard(activePetId, otherPetId, rel, otherPet) {
            const Rel = _relModule();
            const normalized = (Rel && Rel.normalizeRelationship) ? Rel.normalizeRelationship(rel) : (rel || { affinity: 0, familiarity: 0, tags: [], bondType: null });
            const bondDef = _getBondDef(normalized.tags);
            const duoBonus = (Rel && Rel.getDuoBonus) ? Rel.getDuoBonus(normalized) : null;
            const petName = _escapeRelHTML((otherPet && otherPet.name) || 'Pet');
            const petEmoji = _escapeRelHTML(_getPetEmoji(otherPet));
            const affinity = normalized.affinity || 0;
            const familiarity = normalized.familiarity || 0;
            const affinityLabel = affinity > 0 ? '+' + affinity : String(affinity);

            let duoBonusHTML = '';
            if (duoBonus) {
                const pct = Math.round((duoBonus.careMultiplier - 1) * 100);
                duoBonusHTML = `<div class="rel-duo-bonus" title="${_escapeRelHTML(bondDef.desc)}">
                    <span class="rel-duo-icon" aria-hidden="true">${duoBonus.icon}</span>
                    <span class="rel-duo-label">${_escapeRelHTML(duoBonus.label)}</span>
                    <span class="rel-duo-desc">+${pct}% when socializing together</span>
                </div>`;
            }

            let assignBondHTML = '';
            if (!normalized.bondType) {
                assignBondHTML = `<div class="rel-assign-bond">
                    <span class="rel-assign-label">Assign bond:</span>
                    <button class="rel-bond-assign-btn" type="button" data-pet-a="${_escapeRelHTML(activePetId)}" data-pet-b="${_escapeRelHTML(otherPetId)}" data-bond="sibling" aria-label="Mark as siblings">${_BOND_DEFS.sibling.icon} Siblings</button>
                    <button class="rel-bond-assign-btn" type="button" data-pet-a="${_escapeRelHTML(activePetId)}" data-pet-b="${_escapeRelHTML(otherPetId)}" data-bond="mentor" aria-label="Mark as mentor relationship">${_BOND_DEFS.mentor.icon} Mentor</button>
                </div>`;
            } else {
                assignBondHTML = `<div class="rel-assign-bond">
                    <button class="rel-bond-assign-btn rel-bond-assign-btn--remove" type="button" data-pet-a="${_escapeRelHTML(activePetId)}" data-pet-b="${_escapeRelHTML(otherPetId)}" data-bond="null" aria-label="Remove bond assignment">\u2715 Remove bond</button>
                </div>`;
            }

            return `<div class="rel-card" data-other-pet-id="${_escapeRelHTML(otherPetId)}">
                <div class="rel-card-header">
                    <span class="rel-card-emoji" aria-hidden="true">${petEmoji}</span>
                    <span class="rel-card-name">${petName}</span>
                    <span class="rel-bond-badge" style="background:${bondDef.color}">${bondDef.icon} ${_escapeRelHTML(bondDef.label)}</span>
                </div>
                <div class="rel-card-stats">
                    <div class="rel-stat-row">
                        <span class="rel-stat-label">Affinity</span>
                        ${_renderAffinityBar(affinity)}
                        <span class="rel-stat-val">${affinityLabel}</span>
                    </div>
                    <div class="rel-stat-row">
                        <span class="rel-stat-label">Familiarity</span>
                        ${_renderFamiliarityBar(familiarity)}
                        <span class="rel-stat-val">${familiarity}</span>
                    </div>
                </div>
                ${duoBonusHTML}
                ${assignBondHTML}
                <div class="rel-card-actions">
                    <button class="rel-socialize-btn" type="button" data-pet-a="${_escapeRelHTML(activePetId)}" data-pet-b="${_escapeRelHTML(otherPetId)}" aria-label="Socialize with ${petName}">
                        \u{1F4AC} Socialize
                    </button>
                </div>
            </div>`;
        }

        // ==================== PANEL OPEN/CLOSE ====================

        function openRelationshipPanel() {
            const existing = document.querySelector('.rel-panel-overlay');
            if (existing) {
                if (typeof animateModalClose === 'function') animateModalClose(existing, () => existing.remove());
                else existing.remove();
                return;
            }

            const activePetId = _getActivePetId();
            if (!activePetId) {
                if (typeof showToast === 'function') showToast('No active pet found.', '#999');
                return;
            }

            const relationships = _getHouseholdRels();
            const petsById = _getHouseholdPets();
            const otherPetIds = Object.keys(petsById).filter(id => id !== activePetId);

            const activePet = petsById[activePetId] || (typeof gameState !== 'undefined' && gameState && gameState.pet) || {};
            const activePetName = _escapeRelHTML((activePet && activePet.name) || 'Your Pet');
            const activePetEmoji = _getPetEmoji(activePet);
            const Rel = _relModule();

            // R2: When only 1 pet, show teaser card instead of toast
            if (otherPetIds.length === 0) {
                const hasPendingEgg = typeof gameState !== 'undefined' && gameState && Array.isArray(gameState.hatchedBreedingEggs) && gameState.hatchedBreedingEggs.length > 0;
                const teaserCardHTML = `
                    <div class="rel-solo-teaser" role="status">
                        <div class="rel-solo-teaser-emoji" aria-hidden="true">🥚</div>
                        <p class="rel-solo-teaser-text">Your pet is ready to make a friend. Hatch a second pet to unlock bonds!</p>
                        ${hasPendingEgg
                            ? `<button class="rel-solo-teaser-btn" id="rel-hatch-egg-btn" type="button">Hatch Your Egg</button>`
                            : `<button class="rel-solo-teaser-btn" id="rel-get-egg-btn" type="button">Get an Egg</button>`}
                    </div>`;
                const overlay = document.createElement('div');
                overlay.className = 'rel-panel-overlay';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.setAttribute('aria-label', activePetName + '\'s Bonds');
                overlay.innerHTML = `<div class="rel-panel">
                    <div class="rel-panel-header">
                        <span class="rel-panel-emoji" aria-hidden="true">${activePetEmoji}</span>
                        <h2 class="rel-panel-title">${activePetName}'s Bonds</h2>
                        <button class="rel-panel-close" type="button" id="rel-panel-close" aria-label="Close relationships">\u2715</button>
                    </div>
                    <div class="rel-panel-body">${teaserCardHTML}</div>
                </div>`;
                document.body.appendChild(overlay);
                function closeSoloPanel() {
                    if (typeof popModalEscape === 'function') popModalEscape(closeSoloPanel);
                    if (typeof animateModalClose === 'function') animateModalClose(overlay, () => overlay.remove());
                    else overlay.remove();
                }
                overlay.querySelector('#rel-panel-close').addEventListener('click', closeSoloPanel);
                overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSoloPanel(); });
                if (typeof pushModalEscape === 'function') pushModalEscape(closeSoloPanel);
                if (typeof trapFocus === 'function') trapFocus(overlay);
                const hatchBtn = overlay.querySelector('#rel-hatch-egg-btn');
                const getEggBtn = overlay.querySelector('#rel-get-egg-btn');
                if (hatchBtn) {
                    hatchBtn.addEventListener('click', function() {
                        closeSoloPanel();
                        if (typeof openBreedingUI === 'function') openBreedingUI();
                        else if (typeof showToast === 'function') showToast('Go to the Breeding section to hatch your egg!', '#CE93D8');
                    });
                }
                if (getEggBtn) {
                    getEggBtn.addEventListener('click', function() {
                        closeSoloPanel();
                        if (typeof openShopModal === 'function') openShopModal('eggs');
                        else if (typeof showToast === 'function') showToast('Visit the Shop to get an egg!', '#CE93D8');
                    });
                }
                overlay.querySelector('#rel-panel-close').focus();
                return;
            }

            let cardsHTML = '';
            otherPetIds.forEach(otherId => {
                const key = Rel ? Rel.relationshipKey(activePetId, otherId) : [activePetId, otherId].sort().join('|');
                const rel = relationships[key] || (Rel ? Rel.createRelationship(Date.now()) : { affinity: 0, familiarity: 0, tags: [], bondType: null });
                cardsHTML += _renderRelCard(activePetId, otherId, rel, petsById[otherId]);
            });

            const overlay = document.createElement('div');
            overlay.className = 'rel-panel-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', activePetName + '\'s Bonds');

            overlay.innerHTML = `<div class="rel-panel">
                <div class="rel-panel-header">
                    <span class="rel-panel-emoji" aria-hidden="true">${activePetEmoji}</span>
                    <h2 class="rel-panel-title">${activePetName}'s Bonds</h2>
                    <button class="rel-panel-close" type="button" id="rel-panel-close" aria-label="Close relationships">\u2715</button>
                </div>
                <div class="rel-panel-body">
                    ${cardsHTML}
                </div>
            </div>`;

            document.body.appendChild(overlay);

            function closePanel() {
                if (typeof popModalEscape === 'function') popModalEscape(closePanel);
                if (typeof animateModalClose === 'function') animateModalClose(overlay, () => overlay.remove());
                else overlay.remove();
            }

            overlay.querySelector('#rel-panel-close').addEventListener('click', closePanel);
            overlay.addEventListener('click', function(e) { if (e.target === overlay) closePanel(); });
            if (typeof pushModalEscape === 'function') pushModalEscape(closePanel);
            if (typeof trapFocus === 'function') trapFocus(overlay);
            overlay.querySelector('#rel-panel-close').focus();

            _wireRelPanelButtons(overlay, activePetId);
        }

        function _wireRelPanelButtons(overlay, activePetId) {
            overlay.querySelectorAll('.rel-socialize-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    _triggerSocialize(btn.getAttribute('data-pet-a'), btn.getAttribute('data-pet-b'), btn, overlay);
                });
            });
            overlay.querySelectorAll('.rel-bond-assign-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const petA = btn.getAttribute('data-pet-a');
                    const petB = btn.getAttribute('data-pet-b');
                    const bond = btn.getAttribute('data-bond');
                    _assignBondAndRefreshCard(petA, petB, bond === 'null' ? null : bond, overlay);
                });
            });
        }

        // ==================== SOCIALIZE ACTION ====================

        function _triggerSocialize(petAId, petBId, btnEl, overlay) {
            const Rel = _relModule();
            if (!Rel) return;
            if (typeof gameState === 'undefined' || !gameState || !gameState.household) return;

            const relationships = gameState.household.relationships = gameState.household.relationships || {};
            const petsById = gameState.household.petsById || {};
            const petA = petsById[String(petAId)] || (typeof gameState !== 'undefined' && gameState && gameState.pet);
            const petB = petsById[String(petBId)];
            if (!petA || !petB) return;

            const key = Rel.relationshipKey(String(petAId), String(petBId));
            const current = relationships[key] || Rel.createRelationship(Date.now());
            const result = Rel.applySocialInteraction(current, petA, petB, Date.now(), { baseAffinityDelta: 3, baseFamiliarityDelta: 3 });
            relationships[key] = result.relationship;

            const beats = (typeof Rel.detectRetentionBeats === 'function')
                ? Rel.detectRetentionBeats(current, result.relationship, petA, petB)
                : [];
            beats.forEach(function(beat) { _handleRelationshipBeat(beat, petsById); });

            // R6: Affinity milestone coin grants
            {
                const _prevAffinity = Number((current && current.affinity) || 0);
                const _newAffinity = Number((result.relationship && result.relationship.affinity) || 0);
                const _rel = relationships[key];
                if (!Array.isArray(_rel.milestonesGranted)) _rel.milestonesGranted = [];
                const _petAName = (petA && petA.name) ? petA.name : 'Pet A';
                const _petBName = (petB && petB.name) ? petB.name : 'Pet B';
                const _affinityMilestones = [
                    { threshold: 60, id: 'affinity_60', coins: 30, toast: '\uD83D\uDCDB ' + _petAName + ' & ' + _petBName + ' are friends! +30 coins' },
                    { threshold: 120, id: 'affinity_120', coins: 60, toast: '\uD83D\uDC9A Strong bond formed! +60 coins' }
                ];
                _affinityMilestones.forEach(function(m) {
                    if (_prevAffinity < m.threshold && _newAffinity >= m.threshold && !_rel.milestonesGranted.includes(m.id)) {
                        _rel.milestonesGranted.push(m.id);
                        if (typeof applyCoinGainRateLimits === 'function') {
                            const _mCoins = applyCoinGainRateLimits(m.coins, 'affinityMilestone');
                            if (_mCoins > 0) gameState.coins = (gameState.coins || 0) + _mCoins;
                        }
                        if (typeof showToast === 'function') showToast(m.toast, '#81C784');
                        if (typeof addJournalEntry === 'function') addJournalEntry('\uD83D\uDCDB', _petAName + ' and ' + _petBName + ' reached a new bond level!');
                    }
                });
            }

            if (typeof saveGame === 'function') saveGame();

            const petBName = (petB && petB.name) ? petB.name : 'Pet';
            const sign = result.deltaAffinity >= 0 ? '+' : '';
            if (typeof showToast === 'function') {
                showToast('\u{1F4AC} Socialized with ' + petBName + '! Affinity ' + sign + result.deltaAffinity, '#81C784', { duration: 2000 });
            }

            if (btnEl) {
                btnEl.textContent = '\u2713 Done!';
                btnEl.disabled = true;
                setTimeout(function() {
                    _refreshRelCard(String(petAId), String(petBId), overlay);
                }, 1200);
            }
        }

        // ==================== BOND ASSIGNMENT ====================

        function _assignBondAndRefreshCard(petAId, petBId, bondType, overlay) {
            const Rel = _relModule();
            if (!Rel || typeof Rel.assignBond !== 'function') return;
            if (typeof gameState === 'undefined' || !gameState || !gameState.household) return;

            const relationships = gameState.household.relationships = gameState.household.relationships || {};
            const petsById = gameState.household.petsById || {};
            const petA = petsById[String(petAId)] || (typeof gameState !== 'undefined' && gameState && gameState.pet);
            const petB = petsById[String(petBId)];

            const key = Rel.relationshipKey(String(petAId), String(petBId));
            const current = relationships[key] || Rel.createRelationship(Date.now());
            const previous = Object.assign({}, current);
            relationships[key] = Rel.assignBond(current, bondType);

            const beats = (typeof Rel.detectRetentionBeats === 'function')
                ? Rel.detectRetentionBeats(previous, relationships[key], petA, petB)
                : [];
            beats.forEach(function(beat) { _handleRelationshipBeat(beat, petsById); });

            if (typeof saveGame === 'function') saveGame();

            const petBName = (petB && petB.name) ? petB.name : 'Pet';
            if (bondType && typeof showToast === 'function') {
                const def = _BOND_DEFS[bondType] || {};
                showToast((def.icon || '') + ' ' + petBName + ' & you: ' + (def.label || bondType) + ' bond set!', def.color || '#81C784', { duration: 2500 });
            } else if (!bondType && typeof showToast === 'function') {
                showToast('\u{1F4AD} Bond removed.', '#B0BEC5', { duration: 1800 });
            }

            _refreshRelCard(String(petAId), String(petBId), overlay);
        }

        function _refreshRelCard(petAId, petBId, overlay) {
            if (!overlay) return;
            const card = overlay.querySelector('.rel-card[data-other-pet-id="' + petBId + '"]');
            if (!card) return;
            const Rel = _relModule();
            const relationships = _getHouseholdRels();
            const petsById = _getHouseholdPets();
            const key = Rel ? Rel.relationshipKey(petAId, petBId) : [petAId, petBId].sort().join('|');
            const rel = relationships[key] || (Rel ? Rel.createRelationship(Date.now()) : { affinity: 0, familiarity: 0, tags: [], bondType: null });
            const tmp = document.createElement('div');
            tmp.innerHTML = _renderRelCard(petAId, petBId, rel, petsById[petBId]);
            const newCard = tmp.firstElementChild;
            if (newCard) {
                card.parentNode.replaceChild(newCard, card);
                newCard.querySelectorAll('.rel-socialize-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        _triggerSocialize(btn.getAttribute('data-pet-a'), btn.getAttribute('data-pet-b'), btn, overlay);
                    });
                });
                newCard.querySelectorAll('.rel-bond-assign-btn').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        const pA = btn.getAttribute('data-pet-a');
                        const pB = btn.getAttribute('data-pet-b');
                        const b = btn.getAttribute('data-bond');
                        _assignBondAndRefreshCard(pA, pB, b === 'null' ? null : b, overlay);
                    });
                });
            }
        }

        // ==================== RETENTION BEAT HANDLER ====================

        function _handleRelationshipBeat(beat, petsById) {
            if (!beat || typeof showToast !== 'function') return;
            const nameA = (petsById && petsById[beat.petAId] && petsById[beat.petAId].name) || beat.petAName || 'Pet';
            const nameB = (petsById && petsById[beat.petBId] && petsById[beat.petBId].name) || beat.petBName || 'Pet';
            const beatToasts = {
                relationship_friend_unlocked:    { msg: '\u{1F49B} ' + nameA + ' & ' + nameB + ' are now Best Friends!', color: '#FFD54F' },
                relationship_rival_unlocked:     { msg: '\u2694\uFE0F ' + nameA + ' & ' + nameB + ' have become Rivals!', color: '#FFAB91' },
                relationship_sibling_bond:       { msg: '\u{1F46B} ' + nameA + ' & ' + nameB + ' share a Sibling Bond!', color: '#B39DDB' },
                relationship_mentor_bond:        { msg: '\u{1F4DA} ' + nameA + ' is mentoring ' + nameB + '!', color: '#80CBC4' },
                relationship_familiarity_milestone: { msg: '\u{1F91D} ' + nameA + ' & ' + nameB + ' know each other well!', color: '#A5D6A7' }
            };
            const entry = beatToasts[beat.type];
            if (entry) showToast(entry.msg, entry.color, { duration: 3000 });
        }

        // ==================== PUBLIC API ====================

        window.openRelationshipPanel = openRelationshipPanel;
        window._handleRelationshipBeat = _handleRelationshipBeat;
