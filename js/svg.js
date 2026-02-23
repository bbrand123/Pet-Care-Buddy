        // ==================== SVG GENERATION ====================

        // Unique SVG gradient IDs to avoid collisions when multiple SVGs coexist
        let _svgUidCounter = 0;
        function _svgUid() { return '_' + (++_svgUidCounter) + Math.random().toString(36).slice(2, 11); }

        // Helper function to adjust color brightness
        function adjustColorBrightness(hexColor, percent) {
            // Convert hex to RGB
            let hex = hexColor.replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            // Adjust brightness using additive approach so zero channels can be brightened
            const amt = Math.round(255 * percent / 100);
            const newR = clamp(r + amt, 0, 255);
            const newG = clamp(g + amt, 0, 255);
            const newB = clamp(b + amt, 0, 255);

            // Convert back to hex
            const toHex = (n) => {
                const hex = Math.round(n).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return '#' + toHex(newR) + toHex(newG) + toHex(newB);
        }

        // Helper function to adjust color saturation
        function adjustColorSaturation(hexColor, percent) {
            // Convert hex to RGB
            let hex = hexColor.replace('#', '');
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;

            // Convert RGB to HSL
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            // Adjust saturation
            s = clamp(s * (1 + percent / 100), 0, 1);

            // Convert HSL back to RGB
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            let nr, ng, nb;
            if (s === 0) {
                nr = ng = nb = l;
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                nr = hue2rgb(p, q, h + 1/3);
                ng = hue2rgb(p, q, h);
                nb = hue2rgb(p, q, h - 1/3);
            }

            // Convert back to hex
            const toHex = (n) => {
                const hex = Math.round(n * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };

            return '#' + toHex(nr) + toHex(ng) + toHex(nb);
        }

        // Sanitize color values to prevent XSS injection through SVG attributes
        function sanitizeColor(color) {
            if (!color || typeof color !== 'string') return '#888888';
            // Allow only valid hex colors, named CSS colors (letters only), and rgb/hsl functions with safe chars
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
            if (/^[a-zA-Z]{1,30}$/.test(color)) return color;
            if (/^(rgb|hsl)a?\(\s*[\d.,\s%]+\)$/.test(color)) return color;
            return '#888888';
        }

        // Apply care variant effects to color
        function applyCareVariant(color, variant, isEvolved) {
            if (!color) return color;
            // Only transform hex colors; return non-hex values (rgb, hsl, named) unchanged
            if (typeof color !== 'string' || !color.startsWith('#')) return color;

            switch (variant) {
                case 'dull':
                    // Reduce saturation and brightness for poor care
                    return adjustColorSaturation(adjustColorBrightness(color, -20), -40);
                case 'shiny':
                    // Increase brightness and saturation for excellent care
                    return adjustColorSaturation(adjustColorBrightness(color, 15), 20);
                case 'normal':
                default:
                    return color;
            }
        }

        // Generate sparkle effect for shiny/evolved pets
        function generateSparkleEffect(isShiny, isEvolved) {
            if (!isShiny && !isEvolved) return '';

            const sparkles = [];
            const positions = [
                { x: 20, y: 30, size: 3 },
                { x: 75, y: 25, size: 2 },
                { x: 85, y: 60, size: 4 },
                { x: 15, y: 70, size: 2 },
                { x: 50, y: 15, size: 3 }
            ];

            positions.forEach((pos, i) => {
                const delay = i * 0.3;
                sparkles.push(`
                    <g opacity="0.8">
                        <circle cx="${pos.x}" cy="${pos.y}" r="${pos.size}" fill="#FFD700">
                            <animate attributeName="opacity" values="0;1;0" dur="2s" begin="${delay}s" repeatCount="indefinite"/>
                        </circle>
                        <path d="M${pos.x} ${pos.y - pos.size - 2} L${pos.x} ${pos.y + pos.size + 2} M${pos.x - pos.size - 2} ${pos.y} L${pos.x + pos.size + 2} ${pos.y}"
                              stroke="#FFF" stroke-width="1" opacity="0.6">
                            <animate attributeName="opacity" values="0;0.8;0" dur="2s" begin="${delay}s" repeatCount="indefinite"/>
                        </path>
                    </g>
                `);
            });

            return `<g class="sparkle-effect">${sparkles.join('')}</g>`;
        }

        function generateEggSVG(crackLevel, eggType) {
            const eggData = EGG_TYPES[eggType] || EGG_TYPES['furry'];
            const colors = eggData.colors;

            const cracks = [];
            if (crackLevel >= 1) {
                cracks.push('<path class="egg-crack" style="opacity:1" d="M55 40 L60 55 L50 50 Z" fill="#8B7355" stroke="#5D4037" stroke-width="1"/>');
            }
            if (crackLevel >= 2) {
                cracks.push('<path class="egg-crack" style="opacity:1" d="M65 60 L75 75 L60 70 Z" fill="#8B7355" stroke="#5D4037" stroke-width="1"/>');
            }
            if (crackLevel >= 3) {
                cracks.push('<path class="egg-crack" style="opacity:1" d="M45 70 L40 85 L55 80 Z" fill="#8B7355" stroke="#5D4037" stroke-width="1"/>');
            }

            // Pattern-specific decorations
            let patternHTML = '';
            if (eggData.pattern === 'spots') {
                patternHTML = `
                    <circle cx="35" cy="50" r="8" fill="${colors.accent}" opacity="0.7"/>
                    <circle cx="65" cy="45" r="6" fill="${colors.accent}" opacity="0.7"/>
                    <circle cx="55" cy="80" r="7" fill="${colors.accent}" opacity="0.7"/>
                    <circle cx="30" cy="75" r="5" fill="${colors.accent}" opacity="0.7"/>
                    <circle cx="70" cy="70" r="6" fill="${colors.accent}" opacity="0.7"/>
                `;
            } else if (eggData.pattern === 'stripes') {
                patternHTML = `
                    <path d="M20 50 Q50 45 80 50" stroke="${colors.accent}" stroke-width="3" fill="none" opacity="0.6"/>
                    <path d="M20 65 Q50 60 80 65" stroke="${colors.accent}" stroke-width="3" fill="none" opacity="0.6"/>
                    <path d="M20 80 Q50 75 80 80" stroke="${colors.accent}" stroke-width="3" fill="none" opacity="0.6"/>
                `;
            } else if (eggData.pattern === 'scales') {
                patternHTML = `
                    <path d="M30 45 Q35 50 40 45 Q35 40 30 45" fill="${colors.accent}" opacity="0.5"/>
                    <path d="M50 45 Q55 50 60 45 Q55 40 50 45" fill="${colors.accent}" opacity="0.5"/>
                    <path d="M40 60 Q45 65 50 60 Q45 55 40 60" fill="${colors.accent}" opacity="0.5"/>
                    <path d="M60 60 Q65 65 70 60 Q65 55 60 60" fill="${colors.accent}" opacity="0.5"/>
                    <path d="M35 75 Q40 80 45 75 Q40 70 35 75" fill="${colors.accent}" opacity="0.5"/>
                    <path d="M55 75 Q60 80 65 75 Q60 70 55 75" fill="${colors.accent}" opacity="0.5"/>
                `;
            } else if (eggData.pattern === 'sparkles') {
                patternHTML = `
                    <path d="M35 50 L37 52 L35 54 L33 52 Z" fill="${colors.shine}" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
                    </path>
                    <path d="M60 45 L62 47 L60 49 L58 47 Z" fill="${colors.shine}" opacity="0.8">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
                    </path>
                    <path d="M45 70 L47 72 L45 74 L43 72 Z" fill="${colors.shine}" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
                    </path>
                    <path d="M65 75 L67 77 L65 79 L63 77 Z" fill="${colors.shine}" opacity="0.8">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
                    </path>
                `;
            }

            const uid = _svgUid();
            const eggGradId = 'eggGradient' + uid;
            const eggShineId = 'eggShine' + uid;
            return `
                <svg class="egg-svg" viewBox="0 0 100 130" role="img" aria-label="${eggData.description}. Tap to help it hatch!">
                    <defs>
                        <linearGradient id="${eggGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:${colors.shine}"/>
                            <stop offset="50%" style="stop-color:${colors.base}"/>
                            <stop offset="100%" style="stop-color:${colors.shine}"/>
                        </linearGradient>
                        <linearGradient id="${eggShineId}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.6"/>
                            <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0"/>
                        </linearGradient>
                    </defs>
                    <!-- Egg body -->
                    <ellipse cx="50" cy="70" rx="40" ry="50" fill="url(#${eggGradId})" stroke="${colors.accent}" stroke-width="3"/>
                    <!-- Pattern decorations -->
                    ${patternHTML}
                    <!-- Shine -->
                    <ellipse cx="35" cy="45" rx="15" ry="20" fill="url(#${eggShineId})"/>
                    <!-- Cracks -->
                    ${cracks.join('')}
                </svg>
            `;
        }

        function generatePatternOverlay(pattern, color) {
            if (!pattern || pattern === 'solid') return '';

            let darkerColor = 'rgba(0,0,0,0.2)';
            if (color) {
                let ch = color.replace('#', '');
                if (ch.length === 3) ch = ch[0]+ch[0]+ch[1]+ch[1]+ch[2]+ch[2];
                if (ch.length >= 6) ch = ch.substring(0, 6);
                darkerColor = `rgba(${parseInt(ch.substring(0,2),16)},${parseInt(ch.substring(2,4),16)},${parseInt(ch.substring(4,6),16)},0.53)`;
            }

            switch (pattern) {
                case 'spotted':
                    return `
                        <circle cx="35" cy="45" r="6" fill="${darkerColor}" opacity="0.6"/>
                        <circle cx="60" cy="50" r="5" fill="${darkerColor}" opacity="0.6"/>
                        <circle cx="45" cy="70" r="7" fill="${darkerColor}" opacity="0.6"/>
                        <circle cx="70" cy="65" r="4" fill="${darkerColor}" opacity="0.6"/>
                    `;
                case 'striped':
                    return `
                        <path d="M20 40 L80 40" stroke="${darkerColor}" stroke-width="4" opacity="0.5"/>
                        <path d="M20 55 L80 55" stroke="${darkerColor}" stroke-width="4" opacity="0.5"/>
                        <path d="M20 70 L80 70" stroke="${darkerColor}" stroke-width="4" opacity="0.5"/>
                    `;
                case 'patchy':
                    return `
                        <path d="M30 40 Q35 35 40 40 Q35 45 30 40" fill="${darkerColor}" opacity="0.5"/>
                        <path d="M60 50 Q65 45 70 50 Q65 55 60 50" fill="${darkerColor}" opacity="0.5"/>
                        <path d="M40 65 Q45 60 50 65 Q45 70 40 65" fill="${darkerColor}" opacity="0.5"/>
                    `;
                case 'galaxy':
                    return `
                        <circle cx="40" cy="48" r="4" fill="${darkerColor}" opacity="0.5"/>
                        <circle cx="55" cy="55" r="3" fill="${darkerColor}" opacity="0.4"/>
                        <circle cx="65" cy="45" r="5" fill="${darkerColor}" opacity="0.5"/>
                        <circle cx="48" cy="68" r="3.5" fill="${darkerColor}" opacity="0.45"/>
                        <path d="M35 50 Q50 42 65 52 Q55 60 40 58 Z" fill="${darkerColor}" opacity="0.2"/>
                    `;
                case 'crystalline':
                    return `
                        <polygon points="38,42 42,35 46,42" fill="${darkerColor}" opacity="0.5"/>
                        <polygon points="55,48 60,40 65,48" fill="${darkerColor}" opacity="0.5"/>
                        <polygon points="45,65 50,57 55,65" fill="${darkerColor}" opacity="0.45"/>
                        <polygon points="30,55 34,48 38,55" fill="${darkerColor}" opacity="0.4"/>
                    `;
                case 'flame':
                    return `
                        <path d="M35 70 Q37 60 40 65 Q43 55 45 70" fill="${darkerColor}" opacity="0.5"/>
                        <path d="M50 68 Q52 58 55 63 Q58 53 60 68" fill="${darkerColor}" opacity="0.5"/>
                        <path d="M65 70 Q67 62 70 66 Q72 58 74 70" fill="${darkerColor}" opacity="0.45"/>
                    `;
                case 'floral':
                    return `
                        <circle cx="38" cy="48" r="3" fill="${darkerColor}" opacity="0.4"/>
                        <circle cx="35" cy="45" r="2.5" fill="${darkerColor}" opacity="0.3"/>
                        <circle cx="41" cy="45" r="2.5" fill="${darkerColor}" opacity="0.3"/>
                        <circle cx="60" cy="60" r="3" fill="${darkerColor}" opacity="0.4"/>
                        <circle cx="57" cy="57" r="2.5" fill="${darkerColor}" opacity="0.3"/>
                        <circle cx="63" cy="57" r="2.5" fill="${darkerColor}" opacity="0.3"/>
                    `;
                default:
                    return '';
            }
        }

        function generateAccessoryOverlay(accessories) {
            if (!accessories || accessories.length === 0) return '';

            let accessoryHTML = '';

            accessories.forEach(accessoryId => {
                const accessory = ACCESSORIES[accessoryId];
                if (!accessory) return;

                switch (accessoryId) {
                    case 'partyHat':
                        accessoryHTML += `
                            <g transform="translate(50, 8)">
                                <polygon points="-8,0 8,0 0,-20" fill="#FF6B9D" stroke="#FF1493" stroke-width="1"/>
                                <circle cx="0" cy="-20" r="3" fill="#FFD700"/>
                            </g>
                        `;
                        break;
                    case 'crown':
                        accessoryHTML += `
                            <g transform="translate(50, 12)">
                                <path d="M-12,0 L-8,-8 L-4,0 L0,-8 L4,0 L8,-8 L12,0 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
                                <circle cx="-8" cy="-8" r="2" fill="#FF69B4"/>
                                <circle cx="0" cy="-8" r="2" fill="#FF69B4"/>
                                <circle cx="8" cy="-8" r="2" fill="#FF69B4"/>
                            </g>
                        `;
                        break;
                    case 'bow':
                        accessoryHTML += `
                            <g transform="translate(70, 20)">
                                <path d="M-8,-4 Q-12,0 -8,4 Q-10,0 -8,-4" fill="#FF69B4"/>
                                <path d="M8,-4 Q12,0 8,4 Q10,0 8,-4" fill="#FF69B4"/>
                                <circle cx="0" cy="0" r="3" fill="#FF1493"/>
                            </g>
                        `;
                        break;
                    case 'glasses':
                        accessoryHTML += `
                            <g transform="translate(50, 42)">
                                <circle cx="-12" cy="0" r="8" fill="none" stroke="#333" stroke-width="2" opacity="0.7"/>
                                <circle cx="12" cy="0" r="8" fill="none" stroke="#333" stroke-width="2" opacity="0.7"/>
                                <path d="M-4,0 L4,0" stroke="#333" stroke-width="2"/>
                            </g>
                        `;
                        break;
                    case 'sunglasses':
                        accessoryHTML += `
                            <g transform="translate(50, 42)">
                                <ellipse cx="-12" cy="0" rx="10" ry="6" fill="#333" opacity="0.8"/>
                                <ellipse cx="12" cy="0" rx="10" ry="6" fill="#333" opacity="0.8"/>
                                <path d="M-2,0 L2,0" stroke="#333" stroke-width="2"/>
                            </g>
                        `;
                        break;
                    case 'topHat':
                        accessoryHTML += `
                            <g transform="translate(50, 8)">
                                <rect x="-12" y="-18" width="24" height="18" rx="2" fill="#222" stroke="#111" stroke-width="1"/>
                                <rect x="-16" y="0" width="32" height="4" rx="2" fill="#222" stroke="#111" stroke-width="1"/>
                                <rect x="-10" y="-4" width="20" height="3" rx="1" fill="#8B0000"/>
                            </g>
                        `;
                        break;
                    case 'ribbonBow':
                        accessoryHTML += `
                            <g transform="translate(65, 18)">
                                <path d="M-10,-5 Q-14,0 -10,5 Q-12,0 -10,-5" fill="#FF85A2"/>
                                <path d="M10,-5 Q14,0 10,5 Q12,0 10,-5" fill="#FF85A2"/>
                                <circle cx="0" cy="0" r="3" fill="#FF1493"/>
                                <path d="M0,3 L-2,10" stroke="#FF85A2" stroke-width="1.5" fill="none"/>
                                <path d="M0,3 L2,10" stroke="#FF85A2" stroke-width="1.5" fill="none"/>
                            </g>
                        `;
                        break;
                    case 'collar':
                        accessoryHTML += `
                            <g transform="translate(50, 65)">
                                <ellipse cx="0" cy="0" rx="20" ry="5" fill="none" stroke="#CC3333" stroke-width="3"/>
                                <circle cx="0" cy="5" r="4" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
                            </g>
                        `;
                        break;
                    case 'bandana':
                        accessoryHTML += `
                            <g transform="translate(50, 62)">
                                <path d="M-22,0 L0,8 L22,0" fill="#E74C3C" stroke="#C0392B" stroke-width="1"/>
                                <path d="M-18,-2 L18,-2" stroke="#E74C3C" stroke-width="3"/>
                            </g>
                        `;
                        break;
                    case 'superhero':
                        accessoryHTML += `
                            <g transform="translate(50, 55)">
                                <path d="M-10,-10 L-25,10 L-15,5 L-10,15 L0,0 L10,15 L15,5 L25,10 L10,-10 Z" fill="#E53935" opacity="0.85"/>
                            </g>
                        `;
                        break;
                    case 'wizard':
                        accessoryHTML += `
                            <g transform="translate(50, 5)">
                                <polygon points="-14,0 14,0 0,-28" fill="#5C4D9A" stroke="#3E3570" stroke-width="1"/>
                                <circle cx="0" cy="-28" r="3" fill="#FFD700"/>
                                <circle cx="-5" cy="-10" r="2" fill="#FFD700" opacity="0.7"/>
                                <circle cx="6" cy="-16" r="1.5" fill="#FFD700" opacity="0.6"/>
                                <rect x="-16" y="0" width="32" height="4" rx="2" fill="#5C4D9A" stroke="#3E3570" stroke-width="1"/>
                            </g>
                        `;
                        break;
                }
            });

            return accessoryHTML;
        }

        function generatePetSVG(pet, mood) {
            const type = pet.type;
            let baseColor = sanitizeColor(pet.color);
            const growthStage = pet.growthStage || 'baby';

            // Apply care variant to color
            const careVariant = pet.careVariant || 'normal';
            const evolutionStage = pet.evolutionStage || 'base';
            const isEvolved = evolutionStage === 'evolved';
            const color = applyCareVariant(baseColor, careVariant, isEvolved);

            // Eye style based on mood
            let eyeStyle = '';

            switch (mood) {
                case 'happy':
                    eyeStyle = 'arc'; // Happy curved eyes
                    break;
                case 'neutral':
                    eyeStyle = 'normal';
                    break;
                case 'sad':
                    eyeStyle = 'sad';
                    break;
                case 'sleepy':
                    eyeStyle = 'sleepy'; // Half-closed droopy eyes
                    break;
                case 'energetic':
                    eyeStyle = 'energetic'; // Wide bright eyes
                    break;
                default:
                    eyeStyle = 'normal';
                    break;
            }

            // Mouth path is currently consumed by species with mouthPath support (dog/cat).
            const moodMouthPaths = {
                happy: 'M35 75 Q50 90 65 75',
                neutral: 'M40 78 L60 78',
                sad: 'M35 82 Q50 72 65 82',
                sleepy: 'M40 80 Q50 84 60 80',
                energetic: 'M35 75 Q50 92 65 75'
            };
            const mouthPath = moodMouthPaths[mood] || moodMouthPaths.neutral;

            const petGenerators = {
                dog: generateDogSVG,
                cat: generateCatSVG,
                bunny: generateBunnySVG,
                bird: generateBirdSVG,
                hamster: generateHamsterSVG,
                turtle: generateTurtleSVG,
                fish: generateFishSVG,
                frog: generateFrogSVG,
                hedgehog: generateHedgehogSVG,
                panda: generatePandaSVG,
                penguin: generatePenguinSVG,
                unicorn: generateUnicornSVG,
                dragon: generateDragonSVG,
                // Hybrid pet types
                pegasus: generatePegasusSVG,
                kirin: generateKirinSVG,
                catbird: generateCatbirdSVG,
                turtlefrog: generateTurtlefrogSVG,
                bundgehog: generateBundgehogSVG,
                pandapenguin: generatePandapenguinSVG,
                dogfish: generateDogfishSVG,
                hamsterbird: generateHamsterbirdSVG,
                dragonturtle: generateDragonturtleSVG
            };

            const generator = petGenerators[type] || generateDogSVG;
            let svg = generator.length >= 4 ? generator(color, eyeStyle, mouthPath, mood) : generator(color, eyeStyle, mood);

            // Apply growth stage class for size
            let classes = `pet-svg growth-${growthStage}`;
            if (careVariant === 'shiny') classes += ' care-shiny';
            if (careVariant === 'dull') classes += ' care-dull';
            if (isEvolved) classes += ' evolved';
            svg = svg.replace('class="pet-svg"', `class="${classes}"`);

            // Add idle breathing animation to body elements
            const breatheAnim = `<animate attributeName="transform" values="translate(0 0) scale(1 1);translate(-0.75 1.05) scale(1.015 0.985);translate(0 0) scale(1 1)" dur="3s" repeatCount="indefinite"/>`;
            // Insert breathing animation as a child of the first body ellipse/circle
            // Self-closing tags (/>)  need to become open tags with the animation inside
            const breatheRegex = /(<!-- Body -->\s*<(?:ellipse|circle)([^>]*))(\/?>)/;
            const breatheFallback = /(<(?:ellipse|circle)([^>]*class="[^"]*body[^"]*"[^>]*))(\/?>)/i;
            function insertBreathChild(match, prefix, attrs, close) {
                if (close === '/>') {
                    // Determine if it's an ellipse or circle
                    const tagMatch = prefix.match(/<(ellipse|circle)/);
                    const tag = tagMatch ? tagMatch[1] : 'ellipse';
                    return `${prefix}>${breatheAnim}</${tag}>`;
                }
                // Already has > closing, insert animation before the closing tag
                return `${prefix}>${breatheAnim}`;
            }
            if (breatheRegex.test(svg)) {
                svg = svg.replace(breatheRegex, insertBreathChild);
            } else if (breatheFallback.test(svg)) {
                svg = svg.replace(breatheFallback, insertBreathChild);
            }

            // Add eye blink animation (brief squash of eyes every ~5s)
            const blinkId = 'blinkAnim_' + Math.random().toString(36).slice(2, 8);
            // Inject blink animation into the first eye ellipse or circle
            const blinkRegex = /(<!-- Eyes(?:[^>]*)? -->\s*<(ellipse|circle)([^>]*))(\/?>)/i;
            if (blinkRegex.test(svg)) {
                svg = svg.replace(blinkRegex, (match, prefix, tag, attrs, close) => {
                    const radiusAttr = tag === 'circle' ? 'r' : 'ry';
                    const radiusMatch = attrs.match(new RegExp(`${radiusAttr}="([^"]+)"`));
                    const fallbackMatch = tag === 'ellipse' ? attrs.match(/rx="([^"]+)"/) : null;
                    const openRadius = parseFloat((radiusMatch && radiusMatch[1]) || (fallbackMatch && fallbackMatch[1]) || '3') || 3;
                    const closedRadius = Math.max(0.2, +(openRadius * 0.2).toFixed(2));
                    const blinkAnim = `<animate attributeName="${radiusAttr}" values="${openRadius};${closedRadius};${openRadius}" dur="0.15s" begin="0s;${blinkId}.end+${(4 + Math.random() * 3).toFixed(2)}s" id="${blinkId}"/>`;
                    if (close === '/>') {
                        return `${prefix}>${blinkAnim}</${tag}>`;
                    }
                    return `${prefix}>${blinkAnim}`;
                });
            }

            // Add sparkle effect for shiny/evolved pets
            const isShiny = careVariant === 'shiny';
            if (isShiny || isEvolved) {
                const sparkleEffect = generateSparkleEffect(isShiny, isEvolved);
                svg = svg.replace('</svg>', `${sparkleEffect}</svg>`);
            }

            // Add elder wisdom aura for elder-stage pets
            if (growthStage === 'elder') {
                const elderAura = `<g class="elder-aura" opacity="0.35">
                    <!-- Gentle wisdom glow -->
                    <ellipse cx="50" cy="50" rx="42" ry="38" fill="none" stroke="#B388FF" stroke-width="1.5" stroke-dasharray="4 3">
                        <animate attributeName="rx" values="42;44;42" dur="4s" repeatCount="indefinite"/>
                        <animate attributeName="ry" values="38;40;38" dur="4s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.35;0.15;0.35" dur="4s" repeatCount="indefinite"/>
                    </ellipse>
                    <!-- Wisdom stars -->
                    <text x="15" y="20" font-size="6" fill="#B388FF" opacity="0.6">
                        ✦
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite"/>
                    </text>
                    <text x="80" y="25" font-size="5" fill="#B388FF" opacity="0.4">
                        ✦
                        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3.5s" repeatCount="indefinite"/>
                    </text>
                    <text x="10" y="70" font-size="4" fill="#7C4DFF" opacity="0.5">
                        ✧
                        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.8s" repeatCount="indefinite"/>
                    </text>
                </g>`;
                svg = svg.replace('</svg>', `${elderAura}</svg>`);
            }

            // Add mood-specific visual overlays
            let moodOverlay = '';
            if (mood === 'sad') {
                // Teardrop on left eye
                moodOverlay = `<g class="mood-tears" opacity="0.7">
                    <ellipse cx="34" cy="48" rx="2" ry="3" fill="#64B5F6">
                        <animate attributeName="cy" values="48;58;48" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
                    </ellipse>
                </g>`;
            } else if (mood === 'happy') {
                // Rosy cheek glow
                moodOverlay = `<g class="mood-blush" opacity="0.3">
                    <circle cx="30" cy="50" r="6" fill="#FF8A80"/>
                    <circle cx="70" cy="50" r="6" fill="#FF8A80"/>
                </g>`;
            } else if (mood === 'energetic') {
                // Action lines
                moodOverlay = `<g class="mood-energy" opacity="0.4">
                    <line x1="10" y1="25" x2="18" y2="30" stroke="#FFD700" stroke-width="2" stroke-linecap="round">
                        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.8s" repeatCount="indefinite"/>
                    </line>
                    <line x1="85" y1="20" x2="90" y2="28" stroke="#FFD700" stroke-width="2" stroke-linecap="round">
                        <animate attributeName="opacity" values="0.1;0.4;0.1" dur="0.8s" repeatCount="indefinite"/>
                    </line>
                </g>`;
            }
            if (moodOverlay) {
                svg = svg.replace('</svg>', `${moodOverlay}</svg>`);
            }

            // Add lightweight stat overlays so state changes are visible even before mood updates settle
            let statOverlay = '';
            const hunger = Number(pet.hunger);
            const energy = Number(pet.energy);
            const cleanliness = Number(pet.cleanliness);
            const happiness = Number(pet.happiness);
            if (Number.isFinite(hunger) && hunger < 30) {
                statOverlay += `<text x="16" y="24" font-size="8" opacity="0.8">🍽️</text>`;
            }
            if (Number.isFinite(energy) && energy < 30) {
                statOverlay += `<text x="76" y="24" font-size="8" opacity="0.82">💤</text>`;
            }
            if (Number.isFinite(cleanliness) && cleanliness < 30) {
                statOverlay += `<text x="74" y="78" font-size="8" opacity="0.7">🫧</text>`;
            }
            if (Number.isFinite(happiness) && happiness > 78) {
                statOverlay += `<text x="18" y="78" font-size="8" opacity="0.75">💖</text>`;
            }
            if (statOverlay) {
                svg = svg.replace('</svg>', `<g class="pet-stat-overlay">${statOverlay}</g></svg>`);
            }

            // Add pattern overlay
            const pattern = pet.pattern || 'solid';
            if (pattern !== 'solid') {
                const patternOverlay = generatePatternOverlay(pattern, color);
                svg = svg.replace('</svg>', `${patternOverlay}</svg>`);
            }

            // Add accessories
            const accessories = pet.accessories || [];
            if (accessories.length > 0) {
                const accessoryOverlay = generateAccessoryOverlay(accessories);
                svg = svg.replace('</svg>', `${accessoryOverlay}</svg>`);
            }

            return svg;
        }

        function generateEyes(eyeStyle, leftX, rightX, y) {
            switch (eyeStyle) {
                case 'arc':
                    return `
                        <path d="M${leftX - 5} ${y} Q${leftX} ${y - 8} ${leftX + 5} ${y}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                        <path d="M${rightX - 5} ${y} Q${rightX} ${y - 8} ${rightX + 5} ${y}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                    `;
                case 'sad':
                    return `
                        <circle cx="${leftX}" cy="${y}" r="5" fill="#333"/>
                        <circle cx="${rightX}" cy="${y}" r="5" fill="#333"/>
                        <circle cx="${leftX + 1}" cy="${y - 1}" r="1.5" fill="white"/>
                        <circle cx="${rightX + 1}" cy="${y - 1}" r="1.5" fill="white"/>
                        <path d="M${leftX - 6} ${y - 8} L${leftX + 4} ${y - 5}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                        <path d="M${rightX + 6} ${y - 8} L${rightX - 4} ${y - 5}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                    `;
                case 'sleepy':
                    // Half-closed droopy eyes with eyelids
                    return `
                        <ellipse cx="${leftX}" cy="${y}" rx="5" ry="3" fill="#333"/>
                        <ellipse cx="${rightX}" cy="${y}" rx="5" ry="3" fill="#333"/>
                        <circle cx="${leftX + 1}" cy="${y}" r="1" fill="white" opacity="0.5"/>
                        <circle cx="${rightX + 1}" cy="${y}" r="1" fill="white" opacity="0.5"/>
                        <path d="M${leftX - 6} ${y - 4} Q${leftX} ${y - 6} ${leftX + 6} ${y - 4}" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                        <path d="M${rightX - 6} ${y - 4} Q${rightX} ${y - 6} ${rightX + 6} ${y - 4}" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'energetic':
                    // Wide, bright, sparkling eyes
                    return `
                        <circle cx="${leftX}" cy="${y}" r="7" fill="#333"/>
                        <circle cx="${rightX}" cy="${y}" r="7" fill="#333"/>
                        <circle cx="${leftX + 2}" cy="${y - 2}" r="3" fill="white"/>
                        <circle cx="${rightX + 2}" cy="${y - 2}" r="3" fill="white"/>
                        <circle cx="${leftX - 1}" cy="${y + 2}" r="1.5" fill="white" opacity="0.7"/>
                        <circle cx="${rightX - 1}" cy="${y + 2}" r="1.5" fill="white" opacity="0.7"/>
                    `;
                default:
                    return `
                        <circle cx="${leftX}" cy="${y}" r="6" fill="#333"/>
                        <circle cx="${rightX}" cy="${y}" r="6" fill="#333"/>
                        <circle cx="${leftX + 2}" cy="${y - 2}" r="2" fill="white"/>
                        <circle cx="${rightX + 2}" cy="${y - 2}" r="2" fill="white"/>
                    `;
            }
        }

        function generateSingleEye(eyeStyle, x, y) {
            switch (eyeStyle) {
                case 'arc':
                    return `
                        <path d="M${x - 5} ${y} Q${x} ${y - 8} ${x + 5} ${y}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                    `;
                case 'sad':
                    return `
                        <circle cx="${x}" cy="${y}" r="5" fill="#333"/>
                        <circle cx="${x + 1}" cy="${y - 1}" r="1.5" fill="white"/>
                        <path d="M${x - 6} ${y - 8} L${x + 4} ${y - 5}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                    `;
                case 'sleepy':
                    return `
                        <ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#333"/>
                        <circle cx="${x + 1}" cy="${y}" r="1" fill="white" opacity="0.5"/>
                        <path d="M${x - 6} ${y - 4} Q${x} ${y - 6} ${x + 6} ${y - 4}" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'energetic':
                    return `
                        <circle cx="${x}" cy="${y}" r="7" fill="#333"/>
                        <circle cx="${x + 2}" cy="${y - 2}" r="3" fill="white"/>
                        <circle cx="${x - 1}" cy="${y + 2}" r="1.5" fill="white" opacity="0.7"/>
                    `;
                default:
                    return `
                        <circle cx="${x}" cy="${y}" r="6" fill="#333"/>
                        <circle cx="${x + 2}" cy="${y - 2}" r="2" fill="white"/>
                    `;
            }
        }

        function generateDogSVG(color, eyeStyle, mouthPath, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy puppy wagging its tail' : mood === 'sad' ? 'A sad puppy who needs love' : mood === 'sleepy' ? 'A sleepy puppy ready for bed' : mood === 'energetic' ? 'An energetic puppy ready to play' : 'A calm puppy';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="70" rx="30" ry="25" fill="${color}"/>
                    <!-- Head -->
                    <circle cx="50" cy="40" r="25" fill="${color}"/>
                    <!-- Ears -->
                    <ellipse cx="25" cy="30" rx="10" ry="18" fill="${color}" transform="rotate(-20 25 30)"/>
                    <ellipse cx="75" cy="30" rx="10" ry="18" fill="${color}" transform="rotate(20 75 30)"/>
                    <!-- Inner ears -->
                    <ellipse cx="25" cy="32" rx="5" ry="10" fill="#FFB6C1" transform="rotate(-20 25 32)"/>
                    <ellipse cx="75" cy="32" rx="5" ry="10" fill="#FFB6C1" transform="rotate(20 75 32)"/>
                    <!-- Snout -->
                    <ellipse cx="50" cy="50" rx="12" ry="10" fill="#F5DEB3"/>
                    <!-- Nose -->
                    <ellipse cx="50" cy="48" rx="5" ry="4" fill="#333"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 38, 62, 38)}
                    <!-- Mouth -->
                    <path d="${mouthPath}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Tail -->
                    <path d="M80 70 Q95 ${isUp ? '50' : '65'} 85 ${isUp ? '45' : '60'}" stroke="${color}" stroke-width="8" fill="none" stroke-linecap="round"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="30" cy="48" r="5" fill="#FFB6C1" opacity="0.5"/><circle cx="70" cy="48" r="5" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="75" y="25" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="82" y="18" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="87" y="12" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateCatSVG(color, eyeStyle, mouthPath, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy kitty purring' : mood === 'sad' ? 'A sad kitty who needs love' : mood === 'sleepy' ? 'A sleepy kitty curling up' : mood === 'energetic' ? 'An energetic kitty ready to pounce' : 'A calm kitty';
            // Cat has custom eyes - handle sleepy/energetic
            let catEyes = '';
            if (eyeStyle === 'arc') {
                catEyes = `<path d="M33 38 Q38 30 43 38" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                     <path d="M57 38 Q62 30 67 38" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>`;
            } else if (eyeStyle === 'sad') {
                catEyes = `<ellipse cx="38" cy="38" rx="5" ry="7" fill="#90EE90"/>
                     <ellipse cx="62" cy="38" rx="5" ry="7" fill="#90EE90"/>
                     <ellipse cx="38" cy="39" rx="2" ry="5" fill="#333"/>
                     <ellipse cx="62" cy="39" rx="2" ry="5" fill="#333"/>
                     <path d="M32 32 L42 35" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                     <path d="M68 32 L58 35" stroke="#333" stroke-width="2" stroke-linecap="round"/>`;
            } else if (eyeStyle === 'sleepy') {
                catEyes = `<ellipse cx="38" cy="38" rx="5" ry="3" fill="#90EE90"/>
                     <ellipse cx="62" cy="38" rx="5" ry="3" fill="#90EE90"/>
                     <ellipse cx="38" cy="38" rx="2" ry="2" fill="#333"/>
                     <ellipse cx="62" cy="38" rx="2" ry="2" fill="#333"/>
                     <path d="M33 35 Q38 33 43 35" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                     <path d="M57 35 Q62 33 67 35" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>`;
            } else if (eyeStyle === 'energetic') {
                catEyes = `<ellipse cx="38" cy="38" rx="6" ry="8" fill="#90EE90"/>
                     <ellipse cx="62" cy="38" rx="6" ry="8" fill="#90EE90"/>
                     <ellipse cx="38" cy="38" rx="2" ry="6" fill="#333"/>
                     <ellipse cx="62" cy="38" rx="2" ry="6" fill="#333"/>
                     <circle cx="36" cy="35" r="2" fill="white" opacity="0.8"/>
                     <circle cx="60" cy="35" r="2" fill="white" opacity="0.8"/>`;
            } else {
                catEyes = `<ellipse cx="38" cy="38" rx="5" ry="7" fill="#90EE90"/>
                     <ellipse cx="62" cy="38" rx="5" ry="7" fill="#90EE90"/>
                     <ellipse cx="38" cy="39" rx="2" ry="5" fill="#333"/>
                     <ellipse cx="62" cy="39" rx="2" ry="5" fill="#333"/>`;
            }
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="72" rx="28" ry="23" fill="${color}"/>
                    <!-- Head -->
                    <circle cx="50" cy="40" r="24" fill="${color}"/>
                    <!-- Ears (triangles) -->
                    <polygon points="25,35 20,10 40,25" fill="${color}"/>
                    <polygon points="75,35 80,10 60,25" fill="${color}"/>
                    <!-- Inner ears -->
                    <polygon points="27,32 24,18 36,27" fill="#FFB6C1"/>
                    <polygon points="73,32 76,18 64,27" fill="#FFB6C1"/>
                    <!-- Eyes -->
                    ${catEyes}
                    <!-- Nose -->
                    <polygon points="50,48 46,44 54,44" fill="#FFB6C1"/>
                    <!-- Mouth -->
                    <path d="${mouthPath}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Whiskers -->
                    <line x1="20" y1="48" x2="35" y2="50" stroke="#333" stroke-width="1"/>
                    <line x1="20" y1="52" x2="35" y2="52" stroke="#333" stroke-width="1"/>
                    <line x1="65" y1="50" x2="80" y2="48" stroke="#333" stroke-width="1"/>
                    <line x1="65" y1="52" x2="80" y2="52" stroke="#333" stroke-width="1"/>
                    <!-- Tail -->
                    <path d="M78 72 Q100 60 95 ${isUp ? '40' : '55'}" stroke="${color}" stroke-width="8" fill="none" stroke-linecap="round"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="28" cy="48" r="5" fill="#FFB6C1" opacity="0.5"/><circle cx="72" cy="48" r="5" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="75" y="25" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="82" y="18" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="87" y="12" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateBunnySVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            // Bunny-specific mouth paths (adjusted for bunny face position)
            let bunnyMouth = '';
            if (mood === 'happy' || mood === 'energetic') {
                bunnyMouth = '<path d="M46 56 L50 62 L54 56" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>';
            } else if (mood === 'sad') {
                bunnyMouth = '<path d="M46 60 Q50 55 54 60" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>';
            } else if (mood === 'sleepy') {
                bunnyMouth = '<ellipse cx="50" cy="58" rx="3" ry="4" fill="#333" opacity="0.6"/>';  // Yawning mouth
            } else {
                bunnyMouth = '<path d="M46 58 L54 58" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>';
            }

            const ariaLabel = mood === 'happy' ? 'A happy bunny hopping with joy' : mood === 'sad' ? 'A sad bunny who needs love' : mood === 'sleepy' ? 'A sleepy bunny nesting down' : mood === 'energetic' ? 'An energetic bunny bouncing around' : 'A calm bunny';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="75" rx="25" ry="20" fill="${color}"/>
                    <!-- Head -->
                    <circle cx="50" cy="45" r="22" fill="${color}"/>
                    <!-- Ears (long) -->
                    <ellipse cx="35" cy="${mood === 'sleepy' ? '18' : '15'}" rx="8" ry="25" fill="${color}" ${mood === 'sleepy' ? 'transform="rotate(10 35 18)"' : ''}/>
                    <ellipse cx="65" cy="${mood === 'sleepy' ? '18' : '15'}" rx="8" ry="25" fill="${color}" ${mood === 'sleepy' ? 'transform="rotate(-10 65 18)"' : ''}/>
                    <!-- Inner ears -->
                    <ellipse cx="35" cy="${mood === 'sleepy' ? '18' : '15'}" rx="4" ry="18" fill="#FFB6C1" ${mood === 'sleepy' ? 'transform="rotate(10 35 18)"' : ''}/>
                    <ellipse cx="65" cy="${mood === 'sleepy' ? '18' : '15'}" rx="4" ry="18" fill="#FFB6C1" ${mood === 'sleepy' ? 'transform="rotate(-10 65 18)"' : ''}/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 40, 60, 42)}
                    <!-- Nose -->
                    <ellipse cx="50" cy="52" rx="4" ry="3" fill="#FFB6C1"/>
                    <!-- Mouth -->
                    ${bunnyMouth}
                    <!-- Cheeks -->
                    <circle cx="32" cy="52" r="6" fill="#FFB6C1" opacity="${isUp ? '0.7' : '0.5'}"/>
                    <circle cx="68" cy="52" r="6" fill="#FFB6C1" opacity="${isUp ? '0.7' : '0.5'}"/>
                    <!-- Feet -->
                    <ellipse cx="35" cy="92" rx="10" ry="6" fill="${color}"/>
                    <ellipse cx="65" cy="92" rx="10" ry="6" fill="${color}"/>
                    <!-- Tail (fluffy ball) -->
                    <circle cx="75" cy="80" r="8" fill="white"/>
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="75" y="30" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="82" y="23" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="87" y="17" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateBirdSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy bird singing' : mood === 'sad' ? 'A sad bird who needs love' : mood === 'sleepy' ? 'A sleepy bird tucking its head' : mood === 'energetic' ? 'An energetic bird chirping loudly' : 'A calm bird';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="65" rx="25" ry="28" fill="${color}"/>
                    <!-- Head -->
                    <circle cx="50" cy="32" r="20" fill="${color}"/>
                    <!-- Wing -->
                    <ellipse cx="30" cy="65" rx="15" ry="20" fill="${color}" opacity="0.8"/>
                    <ellipse cx="70" cy="65" rx="15" ry="20" fill="${color}" opacity="0.8"/>
                    <!-- Belly -->
                    <ellipse cx="50" cy="70" rx="15" ry="18" fill="#F5F5DC"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 42, 58, 30)}
                    <!-- Beak -->
                    <polygon points="50,38 42,45 50,48 58,45" fill="#FFA500"/>
                    <!-- Tuft -->
                    <ellipse cx="50" cy="14" rx="5" ry="8" fill="${color}"/>
                    <ellipse cx="45" cy="16" rx="4" ry="6" fill="${color}"/>
                    <ellipse cx="55" cy="16" rx="4" ry="6" fill="${color}"/>
                    <!-- Feet -->
                    <line x1="42" y1="90" x2="42" y2="98" stroke="#FFA500" stroke-width="3"/>
                    <line x1="50" y1="92" x2="50" y2="98" stroke="#FFA500" stroke-width="3"/>
                    <line x1="58" y1="90" x2="58" y2="98" stroke="#FFA500" stroke-width="3"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="35" cy="38" r="4" fill="#FFB6C1" opacity="0.6"/><circle cx="65" cy="38" r="4" fill="#FFB6C1" opacity="0.6"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="70" y="18" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="77" y="11" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="82" y="6" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateHamsterSVG(color, eyeStyle, mood) {
            const ariaLabel = mood === 'happy' ? 'A happy hamster running on its wheel' : mood === 'sad' ? 'A sad hamster who needs love' : mood === 'sleepy' ? 'A sleepy hamster curling up in its bedding' : mood === 'energetic' ? 'An energetic hamster zooming around' : 'A calm hamster';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="70" rx="30" ry="25" fill="${color}"/>
                    <!-- Head -->
                    <circle cx="50" cy="40" r="28" fill="${color}"/>
                    <!-- Ears -->
                    <circle cx="25" cy="22" r="10" fill="${color}"/>
                    <circle cx="75" cy="22" r="10" fill="${color}"/>
                    <!-- Inner ears -->
                    <circle cx="25" cy="22" r="5" fill="#FFB6C1"/>
                    <circle cx="75" cy="22" r="5" fill="#FFB6C1"/>
                    <!-- Belly (drawn before face so it doesn't obscure mouth) -->
                    <ellipse cx="50" cy="72" rx="18" ry="15" fill="#F5F5DC"/>
                    <!-- Cheeks (puffy) -->
                    <circle cx="28" cy="48" r="12" fill="#FFE4C4"/>
                    <circle cx="72" cy="48" r="12" fill="#FFE4C4"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 40, 60, 38)}
                    <!-- Nose -->
                    <circle cx="50" cy="50" r="4" fill="#333"/>
                    <!-- Mouth (coordinates fitted to hamster head geometry) -->
                    <path d="${mood === 'happy' ? 'M42 56 Q50 64 58 56' : mood === 'sad' ? 'M42 60 Q50 54 58 60' : mood === 'energetic' ? 'M42 56 Q50 66 58 56' : mood === 'sleepy' ? 'M45 58 Q50 62 55 58' : 'M44 58 L56 58'}" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Whiskers -->
                    <line x1="15" y1="48" x2="28" y2="50" stroke="#333" stroke-width="1"/>
                    <line x1="15" y1="52" x2="28" y2="52" stroke="#333" stroke-width="1"/>
                    <line x1="72" y1="50" x2="85" y2="48" stroke="#333" stroke-width="1"/>
                    <line x1="72" y1="52" x2="85" y2="52" stroke="#333" stroke-width="1"/>
                    <!-- Paws -->
                    <ellipse cx="30" cy="88" rx="8" ry="5" fill="${color}"/>
                    <ellipse cx="70" cy="88" rx="8" ry="5" fill="${color}"/>
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="78" y="25" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="85" y="18" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="90" y="12" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateTurtleSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy turtle basking in the sun' : mood === 'sad' ? 'A sad turtle hiding in its shell' : mood === 'sleepy' ? 'A sleepy turtle retreating into its shell' : mood === 'energetic' ? 'An energetic turtle stretching out' : 'A calm turtle';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <!-- Shell -->
                    <ellipse cx="50" cy="60" rx="38" ry="30" fill="${color}"/>
                    <!-- Shell pattern -->
                    <ellipse cx="50" cy="55" rx="25" ry="18" fill="none" stroke="#2E7D32" stroke-width="2"/>
                    <path d="M50 37 L50 73" stroke="#2E7D32" stroke-width="2"/>
                    <path d="M25 55 L75 55" stroke="#2E7D32" stroke-width="2"/>
                    <path d="M30 42 L70 68" stroke="#2E7D32" stroke-width="2"/>
                    <path d="M30 68 L70 42" stroke="#2E7D32" stroke-width="2"/>
                    <!-- Shell rim -->
                    <ellipse cx="50" cy="60" rx="38" ry="30" fill="none" stroke="#1B5E20" stroke-width="3"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="28" rx="15" ry="12" fill="#8FBC8F"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 44, 56, 26)}
                    <!-- Mouth -->
                    <path d="M45 33 Q50 ${isUp ? '38' : '35'} 55 33" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Legs -->
                    <ellipse cx="20" cy="55" rx="10" ry="8" fill="#8FBC8F"/>
                    <ellipse cx="80" cy="55" rx="10" ry="8" fill="#8FBC8F"/>
                    <ellipse cx="25" cy="80" rx="8" ry="10" fill="#8FBC8F"/>
                    <ellipse cx="75" cy="80" rx="8" ry="10" fill="#8FBC8F"/>
                    <!-- Tail -->
                    <ellipse cx="50" cy="92" rx="6" ry="4" fill="#8FBC8F"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="38" cy="30" r="3" fill="#FFB6C1" opacity="0.5"/><circle cx="62" cy="30" r="3" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="68" y="18" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="75" y="11" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="80" y="6" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        // ==================== NEW SPECIES SVG GENERATORS ====================

        function generateFishSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy fish blowing bubbles' : mood === 'sad' ? 'A sad fish who needs love' : mood === 'sleepy' ? 'A sleepy fish floating gently' : mood === 'energetic' ? 'An energetic fish splashing around' : 'A calm fish';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="50" rx="30" ry="22" fill="${color}"/>
                    <!-- Tail -->
                    <polygon points="80,50 98,35 98,65" fill="${color}" opacity="0.9"/>
                    <!-- Dorsal fin -->
                    <path d="M40 28 Q50 15 60 28" fill="${color}" opacity="0.8"/>
                    <!-- Bottom fin -->
                    <path d="M42 72 Q50 82 58 72" fill="${color}" opacity="0.8"/>
                    <!-- Side fin -->
                    <ellipse cx="35" cy="55" rx="8" ry="5" fill="${color}" opacity="0.7" transform="rotate(-20 35 55)"/>
                    <!-- Scales shimmer -->
                    <ellipse cx="45" cy="48" rx="18" ry="12" fill="white" opacity="0.15"/>
                    <!-- Eyes -->
                    ${generateSingleEye(eyeStyle, 35, 45)}
                    <!-- Mouth -->
                    <ellipse cx="22" cy="52" rx="3" ry="${isUp ? '4' : '2'}" fill="#333" opacity="0.6"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="28" cy="52" r="4" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Bubbles -->
                    ${isUp ? '<circle cx="15" cy="38" r="3" fill="none" stroke="#87CEEB" stroke-width="1" opacity="0.6"/><circle cx="12" cy="30" r="2" fill="none" stroke="#87CEEB" stroke-width="1" opacity="0.4"/><circle cx="18" cy="25" r="1.5" fill="none" stroke="#87CEEB" stroke-width="1" opacity="0.3"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="15" y="25" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="10" y="18" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="7" y="12" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateFrogSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy frog hopping with joy' : mood === 'sad' ? 'A sad frog who needs love' : mood === 'sleepy' ? 'A sleepy frog resting on a lily pad' : mood === 'energetic' ? 'An energetic frog leaping around' : 'A calm frog';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="68" rx="30" ry="22" fill="${color}"/>
                    <!-- Belly -->
                    <ellipse cx="50" cy="72" rx="20" ry="15" fill="#FFFACD"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="42" rx="26" ry="20" fill="${color}"/>
                    <!-- Eye bumps -->
                    <circle cx="34" cy="26" r="12" fill="${color}"/>
                    <circle cx="66" cy="26" r="12" fill="${color}"/>
                    <!-- Eyes -->
                    ${eyeStyle === 'arc' ? `
                        <circle cx="34" cy="24" r="9" fill="white"/>
                        <circle cx="66" cy="24" r="9" fill="white"/>
                        <path d="M29 24 Q34 18 39 24" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                        <path d="M61 24 Q66 18 71 24" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ` : eyeStyle === 'energetic' ? `
                        <circle cx="34" cy="24" r="9" fill="white"/>
                        <circle cx="66" cy="24" r="9" fill="white"/>
                        <circle cx="34" cy="23" r="6" fill="#333"/>
                        <circle cx="66" cy="23" r="6" fill="#333"/>
                        <circle cx="36" cy="21" r="2.5" fill="white"/>
                        <circle cx="68" cy="21" r="2.5" fill="white"/>
                    ` : eyeStyle === 'sad' ? `
                        <circle cx="34" cy="24" r="9" fill="white"/>
                        <circle cx="66" cy="24" r="9" fill="white"/>
                        <circle cx="34" cy="25" r="4" fill="#333"/>
                        <circle cx="66" cy="25" r="4" fill="#333"/>
                        <path d="M28 20 Q34 23 40 20" stroke="#333" stroke-width="2" fill="none"/>
                        <path d="M60 20 Q66 23 72 20" stroke="#333" stroke-width="2" fill="none"/>
                    ` : eyeStyle === 'sleepy' ? `
                        <circle cx="34" cy="24" r="9" fill="white"/>
                        <circle cx="66" cy="24" r="9" fill="white"/>
                        <ellipse cx="34" cy="24" rx="4" ry="2" fill="#333"/>
                        <ellipse cx="66" cy="24" rx="4" ry="2" fill="#333"/>
                        <path d="M25 21 Q34 18 43 21" stroke="#333" stroke-width="2.5" fill="none"/>
                        <path d="M57 21 Q66 18 75 21" stroke="#333" stroke-width="2.5" fill="none"/>
                    ` : `
                        <circle cx="34" cy="24" r="9" fill="white"/>
                        <circle cx="66" cy="24" r="9" fill="white"/>
                        <circle cx="34" cy="24" r="5" fill="#333"/>
                        <circle cx="66" cy="24" r="5" fill="#333"/>
                        <circle cx="36" cy="22" r="2" fill="white"/>
                        <circle cx="68" cy="22" r="2" fill="white"/>
                    `}
                    <!-- Wide mouth -->
                    <path d="M28 50 Q50 ${isUp ? '65' : '55'} 72 50" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    <!-- Front legs -->
                    <ellipse cx="25" cy="80" rx="12" ry="6" fill="${color}"/>
                    <ellipse cx="75" cy="80" rx="12" ry="6" fill="${color}"/>
                    <!-- Back legs (tucked) -->
                    <ellipse cx="22" cy="72" rx="8" ry="12" fill="${color}" transform="rotate(15 22 72)"/>
                    <ellipse cx="78" cy="72" rx="8" ry="12" fill="${color}" transform="rotate(-15 78 72)"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="28" cy="48" r="5" fill="#FFB6C1" opacity="0.4"/><circle cx="72" cy="48" r="5" fill="#FFB6C1" opacity="0.4"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="75" y="18" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="82" y="11" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="87" y="6" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateHedgehogSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const isCurled = mood === 'sad';
            const ariaLabel = mood === 'happy' ? 'A happy hedgehog with perky spines' : mood === 'sad' ? 'A sad hedgehog curling into a ball' : mood === 'sleepy' ? 'A sleepy hedgehog napping' : mood === 'energetic' ? 'An energetic hedgehog snuffling around' : 'A calm hedgehog';
            const spikeColor = '#8B7355';
            if (isCurled) {
                // Curled-up hedgehog: tight ball with spikes out, tiny face peeking
                return `
                    <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                        <!-- Spike ball (back) -->
                        <circle cx="50" cy="55" r="30" fill="${spikeColor}"/>
                        <!-- Spike details (radiating outward) -->
                        <path d="M25 38 L22 26 L32 36" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M35 30 L36 17 L44 31" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M48 26 L52 13 L58 27" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M62 30 L70 19 L72 34" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M73 40 L84 34 L80 47" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M77 54 L90 52 L82 62" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <path d="M74 66 L86 70 L76 76" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                        <!-- Small face peeking out from curl -->
                        <ellipse cx="28" cy="62" rx="12" ry="10" fill="${color}"/>
                        <!-- Tiny snout -->
                        <ellipse cx="19" cy="64" rx="5" ry="4" fill="#DEB887"/>
                        <!-- Nose -->
                        <circle cx="15" cy="63" r="2.5" fill="#333"/>
                        <!-- Sad eye (peeking) -->
                        ${generateSingleEye('sad', 27, 58)}
                        <!-- Mouth (frown) -->
                        <path d="M18 68 Q22 65 26 68" stroke="#333" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                    </svg>
                `;
            }
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Spikes (back) -->
                    <ellipse cx="55" cy="55" rx="32" ry="28" fill="${spikeColor}"/>
                    <!-- Spike details -->
                    <path d="M30 35 L35 25 L40 38" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <path d="M42 30 L48 18 L54 32" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <path d="M55 28 L62 16 L68 30" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <path d="M66 33 L74 22 L78 36" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <path d="M73 42 L84 34 L82 46" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <path d="M78 52 L90 48 L85 58" fill="${spikeColor}" stroke="#6B4E31" stroke-width="1"/>
                    <!-- Body -->
                    <ellipse cx="45" cy="65" rx="25" ry="22" fill="${color}"/>
                    <!-- Belly lighter area -->
                    <ellipse cx="42" cy="68" rx="15" ry="14" fill="#F5DEB3"/>
                    <!-- Head/face -->
                    <ellipse cx="28" cy="55" rx="18" ry="16" fill="${color}"/>
                    <!-- Snout -->
                    <ellipse cx="14" cy="58" rx="8" ry="6" fill="#DEB887"/>
                    <!-- Nose -->
                    <circle cx="8" cy="57" r="4" fill="#333"/>
                    <!-- Eyes -->
                    ${generateSingleEye(eyeStyle, 22, 50)}
                    <!-- Mouth -->
                    <path d="M10 62 Q14 ${isUp ? '67' : '64'} 18 62" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    <!-- Ears -->
                    <ellipse cx="32" cy="42" rx="6" ry="8" fill="${color}"/>
                    <ellipse cx="32" cy="42" rx="3" ry="5" fill="#FFB6C1"/>
                    <!-- Feet -->
                    <ellipse cx="30" cy="85" rx="8" ry="5" fill="${color}"/>
                    <ellipse cx="55" cy="85" rx="8" ry="5" fill="${color}"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="20" cy="60" r="4" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="8" y="38" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="4" y="30" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="2" y="24" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generatePandaSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy panda munching bamboo' : mood === 'sad' ? 'A sad panda who needs love' : mood === 'sleepy' ? 'A sleepy panda taking a nap' : mood === 'energetic' ? 'An energetic panda rolling around' : 'A calm panda';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="70" rx="30" ry="25" fill="${color}"/>
                    <!-- Belly -->
                    <ellipse cx="50" cy="72" rx="20" ry="17" fill="white"/>
                    <!-- Arms (black) -->
                    <ellipse cx="22" cy="65" rx="10" ry="14" fill="#333" transform="rotate(15 22 65)"/>
                    <ellipse cx="78" cy="65" rx="10" ry="14" fill="#333" transform="rotate(-15 78 65)"/>
                    <!-- Legs (black) -->
                    <ellipse cx="35" cy="90" rx="10" ry="8" fill="#333"/>
                    <ellipse cx="65" cy="90" rx="10" ry="8" fill="#333"/>
                    <!-- Head -->
                    <circle cx="50" cy="38" r="26" fill="${color}"/>
                    <!-- Ears (black) -->
                    <circle cx="27" cy="18" r="10" fill="#333"/>
                    <circle cx="73" cy="18" r="10" fill="#333"/>
                    <!-- Eye patches (black) -->
                    <ellipse cx="37" cy="38" rx="10" ry="9" fill="#333" transform="rotate(-10 37 38)"/>
                    <ellipse cx="63" cy="38" rx="10" ry="9" fill="#333" transform="rotate(10 63 38)"/>
                    <!-- Eyes (white in patches) -->
                    ${eyeStyle === 'arc' ? `
                        <path d="M32 37 Q37 31 42 37" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
                        <path d="M58 37 Q63 31 68 37" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ` : eyeStyle === 'energetic' ? `
                        <circle cx="37" cy="37" r="6" fill="white"/>
                        <circle cx="63" cy="37" r="6" fill="white"/>
                        <circle cx="37" cy="36" r="4" fill="#333"/>
                        <circle cx="63" cy="36" r="4" fill="#333"/>
                        <circle cx="38" cy="35" r="2" fill="white"/>
                        <circle cx="64" cy="35" r="2" fill="white"/>
                    ` : eyeStyle === 'sad' ? `
                        <circle cx="37" cy="38" r="4" fill="white"/>
                        <circle cx="63" cy="38" r="4" fill="white"/>
                        <circle cx="37" cy="38" r="2.5" fill="#333"/>
                        <circle cx="63" cy="38" r="2.5" fill="#333"/>
                        <path d="M32 34 Q37 37 42 34" stroke="white" stroke-width="2" fill="none"/>
                        <path d="M58 34 Q63 37 68 34" stroke="white" stroke-width="2" fill="none"/>
                    ` : eyeStyle === 'sleepy' ? `
                        <ellipse cx="37" cy="37" rx="4" ry="2" fill="white"/>
                        <ellipse cx="63" cy="37" rx="4" ry="2" fill="white"/>
                    ` : `
                        <circle cx="37" cy="37" r="5" fill="white"/>
                        <circle cx="63" cy="37" r="5" fill="white"/>
                        <circle cx="37" cy="37" r="3" fill="#333"/>
                        <circle cx="63" cy="37" r="3" fill="#333"/>
                        <circle cx="38" cy="36" r="1.5" fill="white"/>
                        <circle cx="64" cy="36" r="1.5" fill="white"/>
                    `}
                    <!-- Nose -->
                    <ellipse cx="50" cy="47" rx="5" ry="3" fill="#333"/>
                    <!-- Mouth -->
                    <path d="M44 52 Q50 ${isUp ? '58' : '54'} 56 52" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="32" cy="48" r="5" fill="#FFB6C1" opacity="0.4"/><circle cx="68" cy="48" r="5" fill="#FFB6C1" opacity="0.4"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="78" y="20" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="85" y="13" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="90" y="7" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generatePenguinSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy penguin waddling with joy' : mood === 'sad' ? 'A sad penguin who needs love' : mood === 'sleepy' ? 'A sleepy penguin huddling down' : mood === 'energetic' ? 'An energetic penguin sliding on its belly' : 'A calm penguin';
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <!-- Body (dark) -->
                    <ellipse cx="50" cy="60" rx="28" ry="35" fill="${color}"/>
                    <!-- Belly (white) -->
                    <ellipse cx="50" cy="65" rx="18" ry="25" fill="#FFFAF0"/>
                    <!-- Head -->
                    <circle cx="50" cy="28" r="22" fill="${color}"/>
                    <!-- Face (white patch) -->
                    <ellipse cx="50" cy="32" rx="15" ry="13" fill="#FFFAF0"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 42, 58, 28)}
                    <!-- Beak -->
                    <polygon points="50,36 44,42 50,44 56,42" fill="#FF8C00"/>
                    <!-- Wings -->
                    <ellipse cx="20" cy="58" rx="8" ry="22" fill="${color}" transform="rotate(${isUp ? '-15' : '5'} 20 58)"/>
                    <ellipse cx="80" cy="58" rx="8" ry="22" fill="${color}" transform="rotate(${isUp ? '15' : '-5'} 80 58)"/>
                    <!-- Feet -->
                    <ellipse cx="38" cy="94" rx="10" ry="5" fill="#FF8C00"/>
                    <ellipse cx="62" cy="94" rx="10" ry="5" fill="#FF8C00"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="35" cy="35" r="4" fill="#FFB6C1" opacity="0.5"/><circle cx="65" cy="35" r="4" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="72" y="15" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="79" y="8" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="84" y="3" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateUnicornSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A magical happy unicorn with sparkling horn' : mood === 'sad' ? 'A sad unicorn whose horn is dim' : mood === 'sleepy' ? 'A sleepy unicorn resting peacefully' : mood === 'energetic' ? 'An energetic unicorn galloping with rainbow trail' : 'A serene unicorn';
            const uid = _svgUid();
            const hornGradId = 'hornGrad' + uid;
            const maneGradId = 'maneGrad' + uid;
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <defs>
                        <linearGradient id="${hornGradId}" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stop-color="#FFD700"/>
                            <stop offset="50%" stop-color="#FFF8DC"/>
                            <stop offset="100%" stop-color="#FFD700"/>
                        </linearGradient>
                        <linearGradient id="${maneGradId}" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#FF69B4"/>
                            <stop offset="25%" stop-color="#DDA0DD"/>
                            <stop offset="50%" stop-color="#87CEEB"/>
                            <stop offset="75%" stop-color="#98FB98"/>
                            <stop offset="100%" stop-color="#FFD700"/>
                        </linearGradient>
                    </defs>
                    <!-- Body -->
                    <ellipse cx="50" cy="68" rx="30" ry="22" fill="${color}"/>
                    <!-- Legs -->
                    <rect x="28" y="82" width="8" height="16" rx="4" fill="${color}"/>
                    <rect x="40" y="84" width="8" height="14" rx="4" fill="${color}"/>
                    <rect x="54" y="84" width="8" height="14" rx="4" fill="${color}"/>
                    <rect x="66" y="82" width="8" height="16" rx="4" fill="${color}"/>
                    <!-- Hooves -->
                    <rect x="28" y="94" width="8" height="4" rx="2" fill="#DDA0DD"/>
                    <rect x="40" y="94" width="8" height="4" rx="2" fill="#DDA0DD"/>
                    <rect x="54" y="94" width="8" height="4" rx="2" fill="#DDA0DD"/>
                    <rect x="66" y="94" width="8" height="4" rx="2" fill="#DDA0DD"/>
                    <!-- Tail (rainbow) -->
                    <path d="M80 65 Q95 55 92 ${isUp ? '42' : '52'} Q98 ${isUp ? '35' : '48'} 90 ${isUp ? '32' : '45'}" stroke="url(#${maneGradId})" stroke-width="6" fill="none" stroke-linecap="round"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="35" rx="20" ry="22" fill="${color}"/>
                    <!-- Horn -->
                    <polygon points="50,2 44,20 56,20" fill="url(#${hornGradId})" stroke="#DAA520" stroke-width="1"/>
                    <!-- Horn spiral lines -->
                    <path d="M47 16 L53 14" stroke="#DAA520" stroke-width="0.8" opacity="0.6"/>
                    <path d="M48 12 L52 10" stroke="#DAA520" stroke-width="0.8" opacity="0.6"/>
                    <path d="M49 8 L51 6" stroke="#DAA520" stroke-width="0.8" opacity="0.6"/>
                    <!-- Mane (rainbow) -->
                    <path d="M32 22 Q25 30 28 40 Q22 45 26 52" stroke="url(#${maneGradId})" stroke-width="5" fill="none" stroke-linecap="round"/>
                    <path d="M35 20 Q28 28 30 36" stroke="url(#${maneGradId})" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>
                    <!-- Ears -->
                    <ellipse cx="38" cy="16" rx="5" ry="10" fill="${color}" transform="rotate(-15 38 16)"/>
                    <ellipse cx="62" cy="16" rx="5" ry="10" fill="${color}" transform="rotate(15 62 16)"/>
                    <ellipse cx="38" cy="16" rx="2.5" ry="6" fill="#FFB6C1" transform="rotate(-15 38 16)"/>
                    <ellipse cx="62" cy="16" rx="2.5" ry="6" fill="#FFB6C1" transform="rotate(15 62 16)"/>
                    <!-- Eyes -->
                    ${generateEyes(eyeStyle, 40, 60, 34)}
                    <!-- Snout -->
                    <ellipse cx="50" cy="44" rx="10" ry="8" fill="#FFF0F5"/>
                    <!-- Nostrils -->
                    <circle cx="46" cy="44" r="1.5" fill="#DDA0DD"/>
                    <circle cx="54" cy="44" r="1.5" fill="#DDA0DD"/>
                    <!-- Mouth -->
                    <path d="M44 48 Q50 ${isUp ? '54' : '50'} 56 48" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="32" cy="42" r="5" fill="#FFB6C1" opacity="0.5"/><circle cx="68" cy="42" r="5" fill="#FFB6C1" opacity="0.5"/>' : ''}
                    <!-- Magical sparkles -->
                    ${isUp ? '<circle cx="15" cy="20" r="2" fill="#FFD700" opacity="0.8"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="85" cy="15" r="1.5" fill="#FF69B4" opacity="0.6"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/></circle><circle cx="75" cy="30" r="1.5" fill="#87CEEB" opacity="0.7"><animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" repeatCount="indefinite"/></circle>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="70" y="12" font-size="12" fill="#9966cc" opacity="0.8">z</text><text x="77" y="7" font-size="9" fill="#9966cc" opacity="0.6">z</text><text x="82" y="3" font-size="7" fill="#9966cc" opacity="0.4">z</text>' : ''}
                </svg>
            `;
        }

        function generateDragonSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = mood === 'happy' ? 'A happy baby dragon puffing little flames' : mood === 'sad' ? 'A sad dragon with drooping wings' : mood === 'sleepy' ? 'A sleepy dragon curled up with its tail' : mood === 'energetic' ? 'An energetic dragon flapping its wings' : 'A calm dragon';
            const uid = _svgUid();
            const fireGradId = 'fireGrad' + uid;
            return `
                <svg class="pet-svg" viewBox="0 0 100 100" role="img" aria-label="${ariaLabel}">
                    <defs>
                        <linearGradient id="${fireGradId}" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stop-color="#FF4500"/>
                            <stop offset="40%" stop-color="#FF8C00"/>
                            <stop offset="100%" stop-color="#FFD700"/>
                        </linearGradient>
                    </defs>
                    <!-- Wings -->
                    <path d="M15 45 Q5 25 20 20 Q25 30 30 35 Q20 22 28 15 Q32 28 38 38" fill="${color}" opacity="0.7"/>
                    <path d="M85 45 Q95 25 80 20 Q75 30 70 35 Q80 22 72 15 Q68 28 62 38" fill="${color}" opacity="0.7"/>
                    <!-- Tail -->
                    <path d="M75 75 Q90 80 95 72 Q98 65 92 60" stroke="${color}" stroke-width="8" fill="none" stroke-linecap="round"/>
                    <!-- Tail spike -->
                    <polygon points="92,60 88,52 96,56" fill="${color}"/>
                    <!-- Body -->
                    <ellipse cx="50" cy="68" rx="28" ry="24" fill="${color}"/>
                    <!-- Belly (lighter) -->
                    <ellipse cx="50" cy="72" rx="18" ry="16" fill="#FFE4C4" opacity="0.5"/>
                    <!-- Belly scales -->
                    <path d="M38 65 Q50 62 62 65" stroke="#FFE4C4" stroke-width="1" fill="none" opacity="0.5"/>
                    <path d="M36 72 Q50 69 64 72" stroke="#FFE4C4" stroke-width="1" fill="none" opacity="0.5"/>
                    <path d="M38 79 Q50 76 62 79" stroke="#FFE4C4" stroke-width="1" fill="none" opacity="0.5"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="38" rx="22" ry="18" fill="${color}"/>
                    <!-- Horns -->
                    <path d="M33 24 Q28 12 35 18" stroke="${color}" stroke-width="4" fill="${color}"/>
                    <path d="M67 24 Q72 12 65 18" stroke="${color}" stroke-width="4" fill="${color}"/>
                    <!-- Snout -->
                    <ellipse cx="50" cy="46" rx="12" ry="8" fill="${color}"/>
                    <!-- Nostrils -->
                    <circle cx="44" cy="46" r="2" fill="#333"/>
                    <circle cx="56" cy="46" r="2" fill="#333"/>
                    <!-- Eyes (reptilian) -->
                    ${eyeStyle === 'arc' ? `
                        <path d="M35 35 Q40 29 45 35" stroke="#FFD700" stroke-width="3" fill="none" stroke-linecap="round"/>
                        <path d="M55 35 Q60 29 65 35" stroke="#FFD700" stroke-width="3" fill="none" stroke-linecap="round"/>
                    ` : eyeStyle === 'energetic' ? `
                        <ellipse cx="40" cy="35" rx="7" ry="8" fill="#FFD700"/>
                        <ellipse cx="60" cy="35" rx="7" ry="8" fill="#FFD700"/>
                        <ellipse cx="40" cy="34" rx="2.5" ry="6" fill="#333"/>
                        <ellipse cx="60" cy="34" rx="2.5" ry="6" fill="#333"/>
                        <circle cx="41" cy="32" r="2" fill="white" opacity="0.8"/>
                        <circle cx="61" cy="32" r="2" fill="white" opacity="0.8"/>
                    ` : eyeStyle === 'sad' ? `
                        <ellipse cx="40" cy="36" rx="5" ry="6" fill="#FFD700"/>
                        <ellipse cx="60" cy="36" rx="5" ry="6" fill="#FFD700"/>
                        <ellipse cx="40" cy="36" rx="2" ry="4" fill="#333"/>
                        <ellipse cx="60" cy="36" rx="2" ry="4" fill="#333"/>
                        <path d="M34 31 Q40 34 46 31" stroke="#333" stroke-width="2" fill="none"/>
                        <path d="M54 31 Q60 34 66 31" stroke="#333" stroke-width="2" fill="none"/>
                    ` : eyeStyle === 'sleepy' ? `
                        <ellipse cx="40" cy="35" rx="6" ry="4" fill="#FFD700"/>
                        <ellipse cx="60" cy="35" rx="6" ry="4" fill="#FFD700"/>
                        <ellipse cx="40" cy="35" rx="2" ry="3" fill="#333"/>
                        <ellipse cx="60" cy="35" rx="2" ry="3" fill="#333"/>
                        <path d="M34 32 Q40 30 46 32" stroke="#333" stroke-width="2" fill="none"/>
                        <path d="M54 32 Q60 30 66 32" stroke="#333" stroke-width="2" fill="none"/>
                    ` : `
                        <ellipse cx="40" cy="35" rx="6" ry="7" fill="#FFD700"/>
                        <ellipse cx="60" cy="35" rx="6" ry="7" fill="#FFD700"/>
                        <ellipse cx="40" cy="35" rx="2" ry="5" fill="#333"/>
                        <ellipse cx="60" cy="35" rx="2" ry="5" fill="#333"/>
                        <circle cx="41" cy="33" r="1.5" fill="white" opacity="0.7"/>
                        <circle cx="61" cy="33" r="1.5" fill="white" opacity="0.7"/>
                    `}
                    <!-- Mouth -->
                    <path d="M40 50 Q50 ${isUp ? '58' : '53'} 60 50" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <!-- Spikes along back -->
                    <polygon points="42,22 45,14 48,22" fill="#FF8C00" opacity="0.8"/>
                    <polygon points="48,20 50,10 52,20" fill="#FF8C00" opacity="0.8"/>
                    <polygon points="52,22 55,14 58,22" fill="#FF8C00" opacity="0.8"/>
                    <!-- Feet/claws -->
                    <ellipse cx="32" cy="88" rx="10" ry="6" fill="${color}"/>
                    <ellipse cx="68" cy="88" rx="10" ry="6" fill="${color}"/>
                    <!-- Fire breath when happy -->
                    ${isUp ? `<path d="M42 50 Q35 48 30 42 Q28 38 32 35 Q30 40 34 43 Q36 46 40 48" fill="url(#${fireGradId})" opacity="0.8"><animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite"/></path>` : ''}
                    <!-- Cheeks -->
                    ${isUp ? '<circle cx="30" cy="42" r="4" fill="#FF6347" opacity="0.3"/><circle cx="70" cy="42" r="4" fill="#FF6347" opacity="0.3"/>' : ''}
                    <!-- Sleepy Zzz -->
                    ${mood === 'sleepy' ? '<text x="72" y="18" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="79" y="11" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="84" y="6" font-size="7" fill="#6666aa" opacity="0.4">z</text>' : ''}
                    <!-- Smoke puffs -->
                    ${mood !== 'sleepy' && mood !== 'sad' ? '<circle cx="35" cy="40" r="2" fill="#999" opacity="0.3"><animate attributeName="cy" values="40;35;30" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.1;0" dur="2s" repeatCount="indefinite"/></circle>' : ''}
                </svg>
            `;
        }

        // ==================== HYBRID PET SVG GENERATORS ====================

        function generateHybridEyes(eyeStyle, cx1, cy1, cx2, cy2, r) {
            r = r || 3;
            switch (eyeStyle) {
                case 'arc':
                    return `<path d="M${cx1-r} ${cy1} Q${cx1} ${cy1-r*1.5} ${cx1+r} ${cy1}" stroke="#333" stroke-width="2" fill="none"/>
                            <path d="M${cx2-r} ${cy2} Q${cx2} ${cy2-r*1.5} ${cx2+r} ${cy2}" stroke="#333" stroke-width="2" fill="none"/>`;
                case 'sad':
                    return `<ellipse cx="${cx1}" cy="${cy1}" rx="${r}" ry="${r+1}" fill="#333"/>
                            <ellipse cx="${cx2}" cy="${cy2}" rx="${r}" ry="${r+1}" fill="#333"/>
                            <circle cx="${cx1+1}" cy="${cy1-1}" r="1" fill="white" opacity="0.6"/>
                            <circle cx="${cx2+1}" cy="${cy2-1}" r="1" fill="white" opacity="0.6"/>`;
                case 'sleepy':
                    return `<line x1="${cx1-r}" y1="${cy1}" x2="${cx1+r}" y2="${cy1}" stroke="#333" stroke-width="2" stroke-linecap="round"/>
                            <line x1="${cx2-r}" y1="${cy2}" x2="${cx2+r}" y2="${cy2}" stroke="#333" stroke-width="2" stroke-linecap="round"/>`;
                case 'energetic':
                    return `<circle cx="${cx1}" cy="${cy1}" r="${r+1}" fill="#333"/>
                            <circle cx="${cx2}" cy="${cy2}" r="${r+1}" fill="#333"/>
                            <circle cx="${cx1+1}" cy="${cy1-1}" r="1.5" fill="white"/>
                            <circle cx="${cx2+1}" cy="${cy2-1}" r="1.5" fill="white"/>`;
                default:
                    return `<circle cx="${cx1}" cy="${cy1}" r="${r}" fill="#333"/>
                            <circle cx="${cx2}" cy="${cy2}" r="${r}" fill="#333"/>
                            <circle cx="${cx1+1}" cy="${cy1-1}" r="1" fill="white" opacity="0.7"/>
                            <circle cx="${cx2+1}" cy="${cy2-1}" r="1" fill="white" opacity="0.7"/>`;
            }
        }

        function generateHybridMouth(mood, cx, cy) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const isDown = mood === 'sad';
            if (isUp) return `<path d="M${cx-8} ${cy} Q${cx} ${cy+10} ${cx+8} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
            if (isDown) return `<path d="M${cx-6} ${cy+3} Q${cx} ${cy-3} ${cx+6} ${cy+3}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
            return `<line x1="${cx-5}" y1="${cy}" x2="${cx+5}" y2="${cy}" stroke="#333" stroke-width="1.5" stroke-linecap="round"/>`;
        }

        function generateSleepyZzz() {
            return '<text x="72" y="18" font-size="12" fill="#6666aa" opacity="0.8">z</text><text x="79" y="11" font-size="9" fill="#6666aa" opacity="0.6">z</text><text x="84" y="6" font-size="7" fill="#6666aa" opacity="0.4">z</text>';
        }

        function getHybridAriaLabel(speciesName, mood) {
            const moodLabel = {
                happy: 'happy',
                energetic: 'energetic',
                sleepy: 'sleepy',
                sad: 'sad'
            }[mood] || 'calm';
            return `A ${moodLabel} ${speciesName} hybrid pet`;
        }

        // Pegasus - unicorn + bird (winged horse)
        function generatePegasusSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Pegasus', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="60" rx="28" ry="22" fill="${color}" class="body"/>
                    <!-- Legs -->
                    <rect x="30" y="76" width="8" height="16" rx="3" fill="${color}"/>
                    <rect x="62" y="76" width="8" height="16" rx="3" fill="${color}"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="35" rx="18" ry="16" fill="${color}"/>
                    <!-- Horn -->
                    <polygon points="50,10 46,26 54,26" fill="#FFD700"/>
                    <line x1="48" y1="16" x2="52" y2="22" stroke="#FFF" stroke-width="0.5" opacity="0.5"/>
                    <!-- Wings -->
                    <path d="M22 50 Q10 30 20 20 Q25 25 28 35 Q15 28 22 18 Q28 22 30 32 L28 48" fill="#E6E6FA" opacity="${isUp ? 0.9 : 0.7}">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="-5 28 50;10 28 50;-5 28 50" dur="1s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <path d="M78 50 Q90 30 80 20 Q75 25 72 35 Q85 28 78 18 Q72 22 70 32 L72 48" fill="#E6E6FA" opacity="${isUp ? 0.9 : 0.7}">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="5 72 50;-10 72 50;5 72 50" dur="1s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 42, 33, 58, 33)}
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 43)}
                    <!-- Mane -->
                    <path d="M38 22 Q35 15 40 12 Q42 18 44 22" fill="#DDA0DD" opacity="0.7"/>
                    <path d="M44 20 Q42 12 47 9 Q48 16 49 20" fill="#DDA0DD" opacity="0.7"/>
                    <!-- Tail -->
                    <path d="M22 58 Q10 55 8 65 Q12 62 18 60" fill="#DDA0DD" opacity="0.7"/>
                    ${isUp ? '<circle cx="30" cy="33" r="3" fill="#FFB6C1" opacity="0.4"/><circle cx="70" cy="33" r="3" fill="#FFB6C1" opacity="0.4"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Kirin - dragon + unicorn (fire-magic hybrid)
        function generateKirinSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Kirin', mood);
            const glowId = 'kirin-glow-' + Math.random().toString(36).slice(2, 6);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <defs>
                        <radialGradient id="${glowId}"><stop offset="0%" stop-color="#FFD700" stop-opacity="0.3"/><stop offset="100%" stop-color="#FFD700" stop-opacity="0"/></radialGradient>
                    </defs>
                    ${isUp ? `<circle cx="50" cy="50" r="45" fill="url(#${glowId})"/>` : ''}
                    <!-- Body -->
                    <ellipse cx="50" cy="60" rx="25" ry="20" fill="${color}" class="body"/>
                    <!-- Legs -->
                    <rect x="32" y="75" width="7" height="15" rx="3" fill="${color}"/>
                    <rect x="61" y="75" width="7" height="15" rx="3" fill="${color}"/>
                    <!-- Head -->
                    <ellipse cx="50" cy="35" rx="16" ry="14" fill="${color}"/>
                    <!-- Antlers -->
                    <path d="M40 22 Q36 10 30 8 Q34 14 38 18" fill="#8B4513" stroke="#8B4513" stroke-width="1"/>
                    <path d="M60 22 Q64 10 70 8 Q66 14 62 18" fill="#8B4513" stroke="#8B4513" stroke-width="1"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 43, 33, 57, 33)}
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 42)}
                    <!-- Flame mane -->
                    <path d="M36 26 Q30 18 35 12 Q38 20 40 24" fill="#FF4500" opacity="0.7"/>
                    <path d="M42 23 Q38 14 43 8 Q44 18 45 22" fill="#FF6347" opacity="0.6"/>
                    <!-- Scale pattern -->
                    <path d="M35 55 Q38 52 41 55 Q44 52 47 55" stroke="${color}" stroke-width="1" fill="none" opacity="0.3"/>
                    <!-- Sparkle tail -->
                    <circle cx="25" cy="60" r="3" fill="#FFD700" opacity="${isUp ? 0.8 : 0.4}">
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    ${isUp ? '<circle cx="32" cy="33" r="3" fill="#FF6347" opacity="0.3"/><circle cx="68" cy="33" r="3" fill="#FF6347" opacity="0.3"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Gryphkitten - cat + bird
        function generateCatbirdSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Gryphkitten', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="62" rx="22" ry="18" fill="${color}" class="body"/>
                    <!-- Small wings -->
                    <path d="M26 55 Q18 42 24 38 Q26 44 28 50" fill="#87CEEB" opacity="0.7">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="-3 28 55;8 28 55;-3 28 55" dur="0.8s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <path d="M74 55 Q82 42 76 38 Q74 44 72 50" fill="#87CEEB" opacity="0.7">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="3 72 55;-8 72 55;3 72 55" dur="0.8s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <!-- Head -->
                    <circle cx="50" cy="38" r="16" fill="${color}"/>
                    <!-- Cat ears -->
                    <polygon points="36,28 32,14 42,24" fill="${color}"/>
                    <polygon points="64,28 68,14 58,24" fill="${color}"/>
                    <polygon points="37,26 34,17 41,24" fill="#FFB6C1" opacity="0.5"/>
                    <polygon points="63,26 66,17 59,24" fill="#FFB6C1" opacity="0.5"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 43, 36, 57, 36)}
                    <!-- Whiskers -->
                    <line x1="30" y1="42" x2="40" y2="41" stroke="#999" stroke-width="0.5"/>
                    <line x1="30" y1="44" x2="40" y2="44" stroke="#999" stroke-width="0.5"/>
                    <line x1="60" y1="41" x2="70" y2="42" stroke="#999" stroke-width="0.5"/>
                    <line x1="60" y1="44" x2="70" y2="44" stroke="#999" stroke-width="0.5"/>
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 44)}
                    <!-- Tail feathers -->
                    <path d="M28 68 Q18 72 14 65 Q20 68 24 66" fill="#FFD700" opacity="0.6"/>
                    <path d="M26 70 Q16 76 12 68 Q18 72 22 70" fill="#FFD700" opacity="0.5"/>
                    <!-- Feet -->
                    <ellipse cx="40" cy="80" rx="7" ry="4" fill="${color}"/>
                    <ellipse cx="60" cy="80" rx="7" ry="4" fill="${color}"/>
                    ${isUp ? '<circle cx="34" cy="36" r="3" fill="#FFB6C1" opacity="0.3"/><circle cx="66" cy="36" r="3" fill="#FFB6C1" opacity="0.3"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Shellhopper - turtle + frog
        function generateTurtlefrogSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Shellhopper', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Shell -->
                    <ellipse cx="50" cy="58" rx="28" ry="20" fill="#556B2F"/>
                    <ellipse cx="50" cy="55" rx="25" ry="17" fill="#6B8E23" opacity="0.8"/>
                    <path d="M35 48 L50 42 L65 48 L58 58 L42 58 Z" fill="#556B2F" opacity="0.3"/>
                    <!-- Body/head (frog-like) -->
                    <ellipse cx="50" cy="62" rx="22" ry="15" fill="${color}" class="body"/>
                    <circle cx="50" cy="40" r="14" fill="${color}"/>
                    <!-- Big frog eyes -->
                    <circle cx="40" cy="32" r="7" fill="${color}"/>
                    <circle cx="60" cy="32" r="7" fill="${color}"/>
                    ${generateHybridEyes(eyeStyle, 40, 32, 60, 32, 4)}
                    <!-- Mouth (wide frog grin) -->
                    ${isUp ? '<path d="M36 46 Q50 56 64 46" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>' : generateHybridMouth(mood, 50, 46)}
                    <!-- Legs (frog legs) -->
                    <ellipse cx="28" cy="78" rx="10" ry="5" fill="${color}" transform="rotate(-10 28 78)"/>
                    <ellipse cx="72" cy="78" rx="10" ry="5" fill="${color}" transform="rotate(10 72 78)"/>
                    <!-- Shell pattern -->
                    <circle cx="42" cy="52" r="4" fill="#556B2F" opacity="0.2"/>
                    <circle cx="58" cy="52" r="4" fill="#556B2F" opacity="0.2"/>
                    <circle cx="50" cy="60" r="4" fill="#556B2F" opacity="0.2"/>
                    ${isUp ? '<circle cx="32" cy="36" r="3" fill="#90EE90" opacity="0.3"/><circle cx="68" cy="36" r="3" fill="#90EE90" opacity="0.3"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Fuzzspike - bunny + hedgehog
        function generateBundgehogSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Fuzzspike', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Spiky back -->
                    <polygon points="35,40 38,28 42,40" fill="#8B7355" opacity="0.6"/>
                    <polygon points="42,38 46,24 50,38" fill="#8B7355" opacity="0.6"/>
                    <polygon points="50,38 54,24 58,38" fill="#8B7355" opacity="0.6"/>
                    <polygon points="58,40 62,28 65,40" fill="#8B7355" opacity="0.6"/>
                    <!-- Body -->
                    <ellipse cx="50" cy="60" rx="24" ry="20" fill="${color}" class="body"/>
                    <!-- Head -->
                    <circle cx="50" cy="40" r="16" fill="${color}"/>
                    <!-- Bunny ears -->
                    <ellipse cx="38" cy="18" rx="5" ry="14" fill="${color}" transform="rotate(-10 38 18)"/>
                    <ellipse cx="62" cy="18" rx="5" ry="14" fill="${color}" transform="rotate(10 62 18)"/>
                    <ellipse cx="38" cy="18" rx="3" ry="10" fill="#FFB6C1" opacity="0.5" transform="rotate(-10 38 18)"/>
                    <ellipse cx="62" cy="18" rx="3" ry="10" fill="#FFB6C1" opacity="0.5" transform="rotate(10 62 18)"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 43, 38, 57, 38)}
                    <!-- Nose -->
                    <ellipse cx="50" cy="44" rx="3" ry="2" fill="#FFB6C1"/>
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 48)}
                    <!-- Feet -->
                    <ellipse cx="38" cy="80" rx="8" ry="5" fill="${color}"/>
                    <ellipse cx="62" cy="80" rx="8" ry="5" fill="${color}"/>
                    <!-- Fluffy tail -->
                    <circle cx="26" cy="62" r="6" fill="#FFFFFF" opacity="0.7"/>
                    ${isUp ? '<circle cx="34" cy="38" r="3" fill="#FFB6C1" opacity="0.3"/><circle cx="66" cy="38" r="3" fill="#FFB6C1" opacity="0.3"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Snowpanda - panda + penguin
        function generatePandapenguinSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Snowpanda', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="62" rx="24" ry="22" fill="${color}" class="body"/>
                    <!-- Belly (penguin-style) -->
                    <ellipse cx="50" cy="65" rx="16" ry="16" fill="#FFFFFF"/>
                    <!-- Head -->
                    <circle cx="50" cy="36" r="18" fill="${color}"/>
                    <!-- Panda eye patches -->
                    <ellipse cx="40" cy="35" rx="8" ry="6" fill="#333"/>
                    <ellipse cx="60" cy="35" rx="8" ry="6" fill="#333"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 40, 35, 60, 35)}
                    <!-- Ears (round panda ears) -->
                    <circle cx="34" cy="22" r="6" fill="#333"/>
                    <circle cx="66" cy="22" r="6" fill="#333"/>
                    <!-- Penguin beak/nose -->
                    <polygon points="47,42 53,42 50,46" fill="#FF8C00"/>
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 48)}
                    <!-- Flipper arms -->
                    <ellipse cx="26" cy="58" rx="6" ry="12" fill="#333" transform="rotate(15 26 58)"/>
                    <ellipse cx="74" cy="58" rx="6" ry="12" fill="#333" transform="rotate(-15 74 58)"/>
                    <!-- Feet -->
                    <ellipse cx="40" cy="84" rx="8" ry="4" fill="#FF8C00"/>
                    <ellipse cx="60" cy="84" rx="8" ry="4" fill="#FF8C00"/>
                    ${isUp ? '<circle cx="30" cy="35" r="3" fill="#FFB6C1" opacity="0.3"/><circle cx="70" cy="35" r="3" fill="#FFB6C1" opacity="0.3"/>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Splashpup - dog + fish
        function generateDogfishSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Splashpup', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Body -->
                    <ellipse cx="50" cy="58" rx="25" ry="18" fill="${color}" class="body"/>
                    <!-- Fin on back -->
                    <polygon points="50,38 45,44 55,44" fill="#4169E1" opacity="0.7"/>
                    <!-- Side fins -->
                    <ellipse cx="26" cy="56" rx="5" ry="10" fill="#4169E1" opacity="0.6" transform="rotate(20 26 56)"/>
                    <ellipse cx="74" cy="56" rx="5" ry="10" fill="#4169E1" opacity="0.6" transform="rotate(-20 74 56)"/>
                    <!-- Head (dog-like) -->
                    <circle cx="50" cy="38" r="16" fill="${color}"/>
                    <!-- Floppy ears -->
                    <ellipse cx="34" cy="32" rx="8" ry="12" fill="${color}" transform="rotate(15 34 32)"/>
                    <ellipse cx="66" cy="32" rx="8" ry="12" fill="${color}" transform="rotate(-15 66 32)"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 43, 36, 57, 36)}
                    <!-- Nose -->
                    <ellipse cx="50" cy="42" rx="4" ry="3" fill="#333"/>
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 47)}
                    <!-- Tail fin -->
                    <polygon points="22,60 12,52 12,68" fill="#4169E1" opacity="0.6">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="-5 22 60;5 22 60;-5 22 60" dur="0.6s" repeatCount="indefinite"/>' : ''}
                    </polygon>
                    <!-- Scales shimmer -->
                    <circle cx="42" cy="55" r="2" fill="#87CEEB" opacity="0.3"/>
                    <circle cx="50" cy="58" r="2" fill="#87CEEB" opacity="0.3"/>
                    <circle cx="58" cy="55" r="2" fill="#87CEEB" opacity="0.3"/>
                    <!-- Feet -->
                    <ellipse cx="40" cy="76" rx="7" ry="4" fill="${color}"/>
                    <ellipse cx="60" cy="76" rx="7" ry="4" fill="${color}"/>
                    <!-- Bubbles -->
                    ${isUp ? '<circle cx="62" cy="30" r="2" fill="#87CEEB" opacity="0.4"><animate attributeName="cy" values="30;22;14" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.2;0" dur="2s" repeatCount="indefinite"/></circle>' : ''}
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Fluffwing - hamster + bird
        function generateHamsterbirdSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Fluffwing', mood);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <!-- Body (round hamster) -->
                    <ellipse cx="50" cy="60" rx="22" ry="20" fill="${color}" class="body"/>
                    <!-- Belly -->
                    <ellipse cx="50" cy="64" rx="14" ry="14" fill="#FFFFFF" opacity="0.4"/>
                    <!-- Tiny wings -->
                    <path d="M28 52 Q18 40 24 35 Q26 42 28 48" fill="#87CEEB" opacity="0.6">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="-5 28 52;10 28 52;-5 28 52" dur="0.6s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <path d="M72 52 Q82 40 76 35 Q74 42 72 48" fill="#87CEEB" opacity="0.6">
                        ${isUp ? '<animateTransform attributeName="transform" type="rotate" values="5 72 52;-10 72 52;5 72 52" dur="0.6s" repeatCount="indefinite"/>' : ''}
                    </path>
                    <!-- Head -->
                    <circle cx="50" cy="38" r="15" fill="${color}"/>
                    <!-- Tiny round ears -->
                    <circle cx="37" cy="26" r="5" fill="${color}"/>
                    <circle cx="63" cy="26" r="5" fill="${color}"/>
                    <circle cx="37" cy="26" r="3" fill="#FFB6C1" opacity="0.4"/>
                    <circle cx="63" cy="26" r="3" fill="#FFB6C1" opacity="0.4"/>
                    <!-- Cheek pouches -->
                    <ellipse cx="36" cy="40" rx="5" ry="4" fill="#FFE4C4" opacity="0.6"/>
                    <ellipse cx="64" cy="40" rx="5" ry="4" fill="#FFE4C4" opacity="0.6"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 44, 36, 56, 36, 2.5)}
                    <!-- Beak-nose -->
                    <polygon points="48,42 52,42 50,45" fill="#FFD700"/>
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 47)}
                    <!-- Tail feathers -->
                    <path d="M28 65 Q20 68 18 62" fill="#FFD700" opacity="0.5"/>
                    <path d="M26 67 Q18 72 16 65" fill="#FFD700" opacity="0.4"/>
                    <!-- Feet -->
                    <ellipse cx="40" cy="80" rx="6" ry="3" fill="#FFD700"/>
                    <ellipse cx="60" cy="80" rx="6" ry="3" fill="#FFD700"/>
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        // Dracoturtle - dragon + turtle
        function generateDragonturtleSVG(color, eyeStyle, mood) {
            const isUp = mood === 'happy' || mood === 'energetic';
            const ariaLabel = getHybridAriaLabel('Dracoturtle', mood);
            const fireId = 'dt-fire-' + Math.random().toString(36).slice(2, 6);
            return `
                <svg viewBox="0 0 100 100" class="pet-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${ariaLabel}">
                    <defs>
                        <linearGradient id="${fireId}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#FF4500"/><stop offset="100%" stop-color="#FFD700"/>
                        </linearGradient>
                    </defs>
                    <!-- Shell (armored) -->
                    <ellipse cx="50" cy="58" rx="30" ry="22" fill="#556B2F"/>
                    <ellipse cx="50" cy="55" rx="27" ry="19" fill="#6B8E23" opacity="0.8"/>
                    <!-- Shell spikes -->
                    <polygon points="38,36 42,26 46,36" fill="#8B0000" opacity="0.6"/>
                    <polygon points="47,34 50,22 53,34" fill="#8B0000" opacity="0.6"/>
                    <polygon points="54,36 58,26 62,36" fill="#8B0000" opacity="0.6"/>
                    <!-- Body -->
                    <ellipse cx="50" cy="62" rx="22" ry="16" fill="${color}" class="body"/>
                    <!-- Head -->
                    <circle cx="50" cy="38" r="14" fill="${color}"/>
                    <!-- Horns -->
                    <polygon points="38,28 34,16 42,26" fill="#8B0000"/>
                    <polygon points="62,28 66,16 58,26" fill="#8B0000"/>
                    <!-- Eyes -->
                    ${generateHybridEyes(eyeStyle, 43, 36, 57, 36)}
                    <!-- Mouth -->
                    ${generateHybridMouth(mood, 50, 45)}
                    <!-- Fire breath when happy -->
                    ${isUp ? `<path d="M42 45 Q35 42 30 36 Q33 40 36 43" fill="url(#${fireId})" opacity="0.7"><animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite"/></path>` : ''}
                    <!-- Armored legs -->
                    <ellipse cx="30" cy="80" rx="10" ry="6" fill="${color}"/>
                    <ellipse cx="70" cy="80" rx="10" ry="6" fill="${color}"/>
                    <!-- Shell pattern -->
                    <circle cx="42" cy="52" r="5" fill="#556B2F" opacity="0.2"/>
                    <circle cx="58" cy="52" r="5" fill="#556B2F" opacity="0.2"/>
                    <circle cx="50" cy="60" r="5" fill="#556B2F" opacity="0.2"/>
                    <!-- Spiked tail -->
                    <path d="M20 60 Q12 58 10 62 Q14 60 16 58" fill="#8B0000" opacity="0.5"/>
                    ${mood === 'sleepy' ? generateSleepyZzz() : ''}
                </svg>
            `;
        }

        const PET_MICRO_REACTION_CONFIG = Object.freeze({
            feed: { durationMs: 360, classes: ['pet-react-yum', 'pet-react-blink'], overlay: 'yum-sparkle' },
            treat: { durationMs: 420, classes: ['pet-react-yum', 'pet-react-blink'], overlay: 'yum-sparkle' },
            cuddle: { durationMs: 520, classes: ['pet-react-lean'], overlay: 'heart-pulse' },
            groom: { durationMs: 420, classes: ['pet-react-fresh-shake', 'pet-react-blink'], overlay: 'sparkle-fresh' },
            sleep: { durationMs: 600, classes: ['pet-react-sleepy-curl', 'pet-react-slow-blink'], overlay: 'sleepy-zzz' },
            exercise: { durationMs: 440, classes: ['pet-react-bounce', 'pet-react-blink-fast'], overlay: 'energy-bolt' }
        });
        let _petMicroReactionCleanupTimer = null;

        function isPetMicroReactionReducedMotion() {
            try {
                if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return true;
                return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            } catch (e) {
                return false;
            }
        }

        function getPetMicroReactionOverlayHTML(kind) {
            switch (kind) {
                case 'heart-pulse':
                    return '<span class="pet-micro-burst pet-micro-heart" aria-hidden="true">💗</span><span class="pet-micro-burst pet-micro-heart alt" aria-hidden="true">💕</span>';
                case 'sparkle-fresh':
                    return '<span class="pet-micro-burst pet-micro-sparkle" aria-hidden="true">✨</span><span class="pet-micro-burst pet-micro-sparkle alt" aria-hidden="true">✦</span>';
                case 'sleepy-zzz':
                    return '<span class="pet-micro-burst pet-micro-zzz" aria-hidden="true">z</span><span class="pet-micro-burst pet-micro-zzz alt" aria-hidden="true">Z</span>';
                case 'energy-bolt':
                    return '<span class="pet-micro-burst pet-micro-bolt" aria-hidden="true">⚡</span><span class="pet-micro-burst pet-micro-bolt alt" aria-hidden="true">✨</span>';
                case 'yum-sparkle':
                default:
                    return '<span class="pet-micro-burst pet-micro-yum" aria-hidden="true">😋</span><span class="pet-micro-burst pet-micro-sparkle" aria-hidden="true">✨</span>';
            }
        }

        function triggerPetMicroReaction(action, options) {
            const config = PET_MICRO_REACTION_CONFIG[action];
            if (!config || typeof document === 'undefined') return false;
            const opts = options || {};
            const petContainer = opts.container || document.getElementById('pet-container');
            if (!petContainer) return false;
            const petSvg = petContainer.querySelector('.pet-svg');
            if (!petSvg) return false;

            const reduced = isPetMicroReactionReducedMotion();
            const reactionLayerClass = 'pet-micro-reaction-layer';
            const existingLayer = petContainer.querySelector('.' + reactionLayerClass);
            if (existingLayer) existingLayer.remove();
            petContainer.classList.remove(
                'pet-react-yum',
                'pet-react-blink',
                'pet-react-lean',
                'pet-react-fresh-shake',
                'pet-react-sleepy-curl',
                'pet-react-slow-blink',
                'pet-react-bounce',
                'pet-react-blink-fast'
            );
            // Force reflow so repeated taps retrigger the animation.
            void petSvg.getBoundingClientRect();
            config.classes.forEach((cls) => petContainer.classList.add(cls));

            const layer = document.createElement('div');
            layer.className = reactionLayerClass + (reduced ? ' reduced' : '');
            layer.setAttribute('aria-hidden', 'true');
            layer.innerHTML = getPetMicroReactionOverlayHTML(config.overlay);
            petContainer.appendChild(layer);

            if (_petMicroReactionCleanupTimer) clearTimeout(_petMicroReactionCleanupTimer);
            _petMicroReactionCleanupTimer = setTimeout(() => {
                petContainer.classList.remove(
                    'pet-react-yum',
                    'pet-react-blink',
                    'pet-react-lean',
                    'pet-react-fresh-shake',
                    'pet-react-sleepy-curl',
                    'pet-react-slow-blink',
                    'pet-react-bounce',
                    'pet-react-blink-fast'
                );
                const liveLayer = petContainer.querySelector('.' + reactionLayerClass);
                if (liveLayer) liveLayer.remove();
            }, reduced ? 120 : Math.max(200, Number(config.durationMs) || 360));
            return true;
        }
