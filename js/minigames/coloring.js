        // ==================== COLORING MINI-GAME ====================

        const COLORING_PALETTE = [
            { name: 'Red', hex: '#FF4444' },
            { name: 'Orange', hex: '#FF9933' },
            { name: 'Yellow', hex: '#FFD700' },
            { name: 'Light Green', hex: '#8BC34A' },
            { name: 'Green', hex: '#4CAF50' },
            { name: 'Sky Blue', hex: '#64B5F6' },
            { name: 'Blue', hex: '#1E88E5' },
            { name: 'Purple', hex: '#9C27B0' },
            { name: 'Pink', hex: '#FF69B4' },
            { name: 'Brown', hex: '#795548' },
            { name: 'Tan', hex: '#D2B48C' },
            { name: 'White', hex: '#FFFFFF' }
        ];

        let coloringState = null;

        function startColoringGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.coloring-game-overlay');
            if (existing) existing.remove();
            const ruleModifier = getMinigameRuleModifier('coloring');
            const templatePool = getPackedColoringTemplatePool();
            const selectedTemplate = getMiniGameContentSelection('coloring', 'templates', templatePool, {
                recentWindow: 4,
                idKey: 'id'
            }) || { id: 'classic_meadow', name: 'Sunny Meadow', variant: 'meadow' };

            coloringState = {
                selectedColor: COLORING_PALETTE[0].hex,
                regionsColored: new Set(),
                totalRegions: 0,
                template: selectedTemplate,
                ruleModifier
            };

            renderColoringGame();
            announce(`Coloring time! Template: ${selectedTemplate.name || 'Classic Scene'}${ruleModifier && ruleModifier.name ? ` (${ruleModifier.name})` : ''}. Pick a color and click or tap parts of the picture to color them!`);
        }

        function renderColoringGame() {
            const overlay = document.createElement('div');
            overlay.className = 'coloring-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Coloring mini-game');

            const petType = gameState.pet.type;
            const scene = generateColoringScene(petType, coloringState && coloringState.template);

            let paletteHTML = '';
            COLORING_PALETTE.forEach((color) => {
                const selected = color.hex === coloringState.selectedColor ? 'selected' : '';
                paletteHTML += `<button class="coloring-swatch ${selected}"
                    data-color="${color.hex}"
                    aria-label="${color.name}"
                    style="background-color: ${color.hex}; ${color.hex === '#FFFFFF' ? 'border-color: #bbb;' : ''}"
                    title="${color.name}"></button>`;
            });

            overlay.innerHTML = `
                <div class="coloring-game">
                    <h2 class="coloring-game-title">🎨 Coloring Time${coloringState && coloringState.template && coloringState.template.name ? ` · ${escapeHTML(coloringState.template.name)}` : ''}${coloringState && coloringState.ruleModifier && coloringState.ruleModifier.name ? ` · ${escapeHTML(coloringState.ruleModifier.name)}` : ''}!</h2>
                    <p class="coloring-game-hint" id="coloring-hint" aria-live="polite">${coloringState && coloringState.template && coloringState.template.description ? `${escapeHTML(coloringState.template.description)} ` : ''}Pick a color, then click or tap to paint! Use Tab to move between regions.</p>
                    <div class="coloring-canvas-wrap">
                        ${scene}
                    </div>
                    <div class="coloring-palette" role="toolbar" aria-label="Color palette">
                        ${paletteHTML}
                    </div>
                    <div class="coloring-buttons">
                        <button class="coloring-clear-btn" id="coloring-clear" aria-label="Clear all colors">Clear</button>
                        <button class="coloring-done-btn" id="coloring-done" aria-label="Finish coloring">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Count total regions
            coloringState.totalRegions = overlay.querySelectorAll('.coloring-region').length;

            // Region click listeners
            overlay.querySelectorAll('.coloring-region').forEach(region => {
                // Make regions keyboard-accessible
                region.setAttribute('tabindex', '0');
                region.setAttribute('role', 'button');
                region.setAttribute('aria-label', 'Coloring region ' + (region.getAttribute('data-region') || ''));

                function applyColor() {
                    const regionId = region.getAttribute('data-region');
                    region.setAttribute('fill', coloringState.selectedColor);
                    region.style.fill = coloringState.selectedColor;
                    coloringState.regionsColored.add(regionId);

                    // B14: Screen reader announcement for coloring progress
                    const colored = coloringState.regionsColored.size;
                    const total = coloringState.totalRegions;
                    if (colored >= total) {
                        announce(`Coloring complete! Great job! All ${total} regions colored.`);
                    } else {
                        announce(`${colored} of ${total} regions colored.`);
                    }

                    // Feedback flash
                    region.style.transition = 'none';
                    region.style.opacity = '0.7';
                    setTimeout(() => {
                        region.style.transition = 'opacity 0.2s';
                        region.style.opacity = '1';
                    }, 50);
                }

                region.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyColor();
                });

                region.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        applyColor();
                    }
                });

                region.addEventListener('mouseenter', () => {
                    region.style.cursor = 'pointer';
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('mouseleave', () => {
                    region.style.strokeWidth = '2';
                });
                region.addEventListener('focus', () => {
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('blur', () => {
                    region.style.strokeWidth = '2';
                });
            });

            // Palette click/keyboard listeners (Item 2 - keyboard accessible)
            overlay.querySelectorAll('.coloring-swatch').forEach(swatch => {
                function selectSwatch() {
                    coloringState.selectedColor = swatch.getAttribute('data-color');
                    overlay.querySelectorAll('.coloring-swatch').forEach(s => s.classList.remove('selected'));
                    swatch.classList.add('selected');
                    announce('Selected color: ' + (swatch.getAttribute('aria-label') || 'color'));
                }
                swatch.addEventListener('click', selectSwatch);
                swatch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectSwatch();
                    }
                    // Arrow key navigation between swatches
                    const swatches = Array.from(overlay.querySelectorAll('.coloring-swatch'));
                    const idx = swatches.indexOf(swatch);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = swatches[(idx + 1) % swatches.length];
                        next.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = swatches[(idx - 1 + swatches.length) % swatches.length];
                        prev.focus();
                    }
                });
            });

            // Clear button
            overlay.querySelector('#coloring-clear').addEventListener('click', () => {
                overlay.querySelectorAll('.coloring-region').forEach(region => {
                    region.setAttribute('fill', '#F5F5F5');
                    region.style.fill = '#F5F5F5';
                });
                coloringState.regionsColored.clear();
                announce('Colors cleared!');
            });

            // Done button
            overlay.querySelector('#coloring-done').addEventListener('click', () => {
                endColoringGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const colored = coloringState ? coloringState.regionsColored.size : 0;
                    requestMiniGameExit(colored, () => endColoringGame());
                }
            });

            // Escape to close
            function coloringEscapeHandler() {
                const colored = coloringState ? coloringState.regionsColored.size : 0;
                requestMiniGameExit(colored, () => endColoringGame());
            }
            pushModalEscape(coloringEscapeHandler);
            coloringState._escapeHandler = coloringEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#coloring-done').focus();
        }

        function generateColoringScene(petType, template) {
            const petParts = getColoringPetParts(petType);
            const variant = (template && template.variant) ? String(template.variant) : 'meadow';

            let petPartsHTML = '';
            petParts.forEach(part => {
                petPartsHTML += part;
            });

            let extraSceneRegions = '';
            if (variant === 'moonlight') {
                extraSceneRegions = `
                    <circle class="coloring-region" data-region="moon" cx="245" cy="52" r="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="hill-back" d="M0 230 Q70 180 140 230 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="hill-front" d="M120 230 Q210 165 300 230 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                `;
            } else if (variant === 'pond') {
                extraSceneRegions = `
                    <ellipse class="coloring-region" data-region="pond" cx="165" cy="260" rx="62" ry="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="reeds-left" d="M110 250 Q108 235 113 220 Q118 235 116 250 Z" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <path class="coloring-region" data-region="reeds-right" d="M215 252 Q213 236 219 222 Q224 237 222 252 Z" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                `;
            } else if (variant === 'festival') {
                extraSceneRegions = `
                    <path class="coloring-region" data-region="banner" d="M70 85 Q150 40 230 85 L228 100 Q150 58 72 100 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="lantern-left" cx="92" cy="112" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="lantern-right" cx="208" cy="112" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                `;
            }

            return `
                <svg class="coloring-scene" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg">
                    <!-- Sky -->
                    <rect class="coloring-region" data-region="sky" x="0" y="0" width="300" height="230" fill="#F5F5F5" stroke="#555" stroke-width="2"/>
                    <!-- Ground -->
                    <rect class="coloring-region" data-region="ground" x="0" y="230" width="300" height="130" fill="#F5F5F5" stroke="#555" stroke-width="2"/>

                    <!-- Sun -->
                    <circle class="coloring-region" data-region="sun" cx="255" cy="50" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Sun rays -->
                    <g stroke="#333" stroke-width="1.5" stroke-linecap="round">
                        <line x1="255" y1="15" x2="255" y2="8"/>
                        <line x1="255" y1="85" x2="255" y2="92"/>
                        <line x1="220" y1="50" x2="213" y2="50"/>
                        <line x1="290" y1="50" x2="297" y2="50"/>
                        <line x1="230" y1="25" x2="225" y2="20"/>
                        <line x1="280" y1="25" x2="285" y2="20"/>
                        <line x1="230" y1="75" x2="225" y2="80"/>
                        <line x1="280" y1="75" x2="285" y2="80"/>
                    </g>

                    <!-- Cloud -->
                    <path class="coloring-region" data-region="cloud" d="M40 70 Q50 40 75 55 Q85 30 110 48 Q125 35 138 58 Q140 75 110 78 Q80 80 50 78 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    ${extraSceneRegions}

                    <!-- Tree trunk -->
                    <rect class="coloring-region" data-region="trunk" x="32" y="175" width="22" height="60" rx="3" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Tree canopy -->
                    <ellipse class="coloring-region" data-region="leaves" cx="43" cy="160" rx="38" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2"/>

                    <!-- Flower 1 -->
                    <rect class="coloring-region" data-region="stem1" x="98" y="305" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower1" cx="100" cy="298" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower1center" cx="100" cy="298" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Flower 2 -->
                    <rect class="coloring-region" data-region="stem2" x="228" y="310" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower2" cx="230" cy="303" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower2center" cx="230" cy="303" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Grass blades -->
                    <g stroke="#333" stroke-width="1" stroke-linecap="round" fill="none">
                        <path d="M15 233 Q18 220 20 233"/>
                        <path d="M55 232 Q58 218 61 232"/>
                        <path d="M135 233 Q138 222 141 233"/>
                        <path d="M195 232 Q198 220 201 232"/>
                        <path d="M265 233 Q268 221 271 233"/>
                    </g>

                    <!-- Pet -->
                    <g class="coloring-pet-group">
                        ${petPartsHTML}
                    </g>

                    <!-- Pet face details -->
                    ${getColoringPetFace(petType)}
                </svg>
            `;
        }

        function getColoringPetParts(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="38" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+35} ${cy+10} Q${cx+55} ${cy-15} ${cx+50} ${cy-25}" fill="none" stroke="#333" stroke-width="8" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-15 ${cx-22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(15 ${cx+22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-snout" cx="${cx}" cy="${cy-17}" rx="13" ry="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'cat':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="35" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+32} ${cy+20} Q${cx+60} ${cy+5} ${cx+50} ${cy-15} Q${cx+42} ${cy-30} ${cx+55} ${cy-35}" fill="none" stroke="#333" stroke-width="7" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-left" points="${cx-25},${cy-38} ${cx-12},${cy-60} ${cx-5},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-right" points="${cx+5},${cy-38} ${cx+12},${cy-60} ${cx+25},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                    ];
                case 'bunny':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="33" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-tail" cx="${cx+30}" cy="${cy+25}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-left" cx="${cx-12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-right" cx="${cx+12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                    ];
                case 'bird':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+10}" rx="30" ry="25" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-left" d="M${cx-28} ${cy+5} Q${cx-55} ${cy-5} ${cx-45} ${cy+25} Q${cx-35} ${cy+30} ${cx-25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-right" d="M${cx+28} ${cy+5} Q${cx+55} ${cy-5} ${cx+45} ${cy+25} Q${cx+35} ${cy+30} ${cx+25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail-feathers" d="M${cx-5} ${cy+33} L${cx-15} ${cy+55} L${cx} ${cy+48} L${cx+15} ${cy+55} L${cx+5} ${cy+33} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-belly" cx="${cx}" cy="${cy+12}" rx="18" ry="16" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'hamster':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+12}" rx="35" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-20}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-left" cx="${cx-24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-right" cx="${cx+24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-left" cx="${cx-20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-right" cx="${cx+20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                    ];
                case 'turtle':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-leg-left" cx="${cx-30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-leg-right" cx="${cx+30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+43} ${cy+15} L${cx+58} ${cy+20} L${cx+45} ${cy+22} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell" cx="${cx}" cy="${cy+5}" rx="45" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell-inner" cx="${cx}" cy="${cy+5}" rx="30" ry="22" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx-38}" cy="${cy-5}" r="18" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                default:
                    return getColoringPetParts('dog');
            }
        }

        function getColoringPetFace(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return `
                        <circle cx="${cx-10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-31}" r="1.5" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-31}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-20}" rx="5" ry="4" fill="#333"/>
                        <path d="M${cx-8} ${cy-13} Q${cx} ${cy-6} ${cx+8} ${cy-13}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'cat':
                    return `
                        <ellipse cx="${cx-9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx+9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx-8}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <ellipse cx="${cx+10}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <polygon points="${cx},${cy-19} ${cx-4},${cy-15} ${cx+4},${cy-15}" fill="#FFB6C1"/>
                        <g stroke="#333" stroke-width="1" stroke-linecap="round">
                            <line x1="${cx-25}" y1="${cy-18}" x2="${cx-10}" y2="${cy-16}"/>
                            <line x1="${cx-23}" y1="${cy-12}" x2="${cx-10}" y2="${cy-13}"/>
                            <line x1="${cx+25}" y1="${cy-18}" x2="${cx+10}" y2="${cy-16}"/>
                            <line x1="${cx+23}" y1="${cy-12}" x2="${cx+10}" y2="${cy-13}"/>
                        </g>
                        <path d="M${cx} ${cy-15} L${cx-5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'bunny':
                    return `
                        <circle cx="${cx-9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx+9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx-8}" cy="${cy-27}" r="1.5" fill="white"/>
                        <circle cx="${cx+10}" cy="${cy-27}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-18}" rx="4" ry="3" fill="#FFB6C1"/>
                        <path d="M${cx} ${cy-15} L${cx-4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <rect x="${cx-3}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                        <rect x="${cx}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                    `;
                case 'bird':
                    return `
                        <circle cx="${cx-8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx+8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx-7}" cy="${cy-27}" r="1.3" fill="white"/>
                        <circle cx="${cx+9}" cy="${cy-27}" r="1.3" fill="white"/>
                        <polygon points="${cx},${cy-18} ${cx-6},${cy-13} ${cx+6},${cy-13}" fill="#FF9800" stroke="#333" stroke-width="1.5"/>
                    `;
                case 'hamster':
                    return `
                        <circle cx="${cx-10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx}" cy="${cy-16}" r="3" fill="#FFB6C1"/>
                        <path d="M${cx-5} ${cy-12} Q${cx} ${cy-7} ${cx+5} ${cy-12}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'turtle':
                    return `
                        <circle cx="${cx-43}" cy="${cy-10}" r="3" fill="#333"/>
                        <circle cx="${cx-44}" cy="${cy-11}" r="1.2" fill="white"/>
                        <circle cx="${cx-33}" cy="${cy-10}" r="3" fill="#333"/>
                        <circle cx="${cx-32}" cy="${cy-11}" r="1.2" fill="white"/>
                        <path d="M${cx-48} ${cy} Q${cx-38} ${cy+4} ${cx-33} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <line x1="${cx-10}" y1="${cy-15}" x2="${cx-10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx+10}" y1="${cy-15}" x2="${cx+10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx-30}" y1="${cy+5}" x2="${cx+30}" y2="${cy+5}" stroke="#333" stroke-width="1"/>
                    `;
                default:
                    return getColoringPetFace('dog');
            }
        }

        function endColoringGame() {
            dismissMiniGameExitDialog();
            if (coloringState && coloringState._escapeHandler) {
                popModalEscape(coloringState._escapeHandler);
            }

            const overlay = document.querySelector('.coloring-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            // Apply rewards based on regions colored
            if (coloringState && coloringState.regionsColored.size > 0 && gameState.pet) {
                incrementMinigamePlayCount('coloring', coloringState ? coloringState.regionsColored.size : 0);
                const colored = coloringState.regionsColored.size;
                const total = coloringState.totalRegions;
                const ratio = colored / Math.max(total, 1);

                const happinessBonus = Math.min(Math.round(ratio * 30), 30);
                const energyCost = Math.min(Math.round(ratio * 8), 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('coloring', Math.round(ratio * 100)) : 0;
                const previousBest = Number((gameState.minigameHighScores || {}).coloring || 0);
                const isNewBest = updateMinigameHighScore('coloring', colored);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Coloring done! You colored ${colored} parts! Happiness +${happinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Coloring: ${colored} parts!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Coloring', colored);
                } else if (colored > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Coloring',
                    score: colored,
                    coinReward,
                    statChanges: [
                        { label: 'Coverage', value: Math.round(ratio * 100) },
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Energy', value: -energyCost }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(colored, previousBest) : null,
                    medal: getMiniGameMedal(Math.round(ratio * 100), { bronze: 35, silver: 60, gold: 90 })
                });
            } else {
                restorePostMiniGameState();
            }
            coloringState = null;
        }
