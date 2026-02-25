// ============================================================
// ui/animations.js  --  Particle effects, idle micro-animations,
//                       need-based idle, species-specific idle
// Extracted from ui.js (lines 3866-4254)
// ============================================================

        // ==================== PARTICLE EFFECTS ====================

        // Global particle cap — limits simultaneous particles to reduce DOM clutter
        const MAX_PARTICLES = 4;

        function enforceParticleLimit(container) {
            const particles = container.children;
            let safetyLimit = particles.length;
            while (particles.length > MAX_PARTICLES && safetyLimit-- > 0) {
                particles[0].remove();
            }
        }

        function addParticle(container, element, duration) {
            if (!container) return;
            enforceParticleLimit(container);
            container.appendChild(element);
            setTimeout(() => element.remove(), duration);
        }

        function primeFxParticle(element, variant, shape, options = {}) {
            if (!element) return element;
            element.classList.add('ui-glyph-particle');
            if (variant) element.dataset.fxVariant = variant;
            if (shape) element.dataset.fxShape = shape;
            if (options.text) {
                element.textContent = options.text;
                element.dataset.fxText = 'true';
            } else {
                element.textContent = '';
                delete element.dataset.fxText;
            }
            if (options.color) element.style.setProperty('--fx-color', options.color);
            if (options.size) element.style.setProperty('--fx-size', options.size);
            return element;
        }

        function createSparkles(container, count) {
            const n = Math.min(count, 2);
            for (let i = 0; i < n; i++) {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle-particle';
                primeFxParticle(
                    sparkle,
                    'sparkle',
                    (i % 2 === 0 ? 'spark' : 'diamond'),
                    {
                        color: ['#ffd54f', '#8fd3ff', '#9de7b5'][Math.floor(Math.random() * 3)],
                        size: `${10 + Math.round(Math.random() * 6)}px`
                    }
                );
                sparkle.style.left = `${30 + Math.random() * 40}%`;
                sparkle.style.top = `${30 + Math.random() * 40}%`;
                addParticle(container, sparkle, 1000);
            }
        }

        function createFoodParticles(container) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'sparkle-particle';
                primeFxParticle(
                    particle,
                    'feed',
                    (i % 2 === 0 ? 'seed' : 'leaf'),
                    { color: i % 2 === 0 ? '#ffb74d' : '#81c784', size: `${11 + i * 3}px` }
                );
                particle.style.left = `${30 + Math.random() * 40}%`;
                particle.style.top = `${40 + Math.random() * 30}%`;
                addParticle(container, particle, 1000);
            }
        }

        function createBubbles(container) {
            for (let i = 0; i < 2; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'bubble-particle';
                bubble.style.left = `${20 + Math.random() * 60}%`;
                bubble.style.top = `${30 + Math.random() * 40}%`;
                bubble.style.animationDelay = `${Math.random() * 0.3}s`;
                addParticle(container, bubble, 1500);
            }
        }

        function createHearts(container) {
            for (let i = 0; i < 2; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart-particle';
                primeFxParticle(heart, 'cuddle', 'heart', { color: i % 2 === 0 ? '#ff8fa7' : '#f48fb1', size: `${12 + i * 2}px` });
                heart.style.left = `${25 + Math.random() * 50}%`;
                heart.style.top = `${35 + Math.random() * 30}%`;
                heart.style.animationDelay = `${Math.random() * 0.3}s`;
                addParticle(container, heart, 1200);
            }
        }

        function createZzz(container) {
            // Single Z particle
            const zzz = document.createElement('div');
            zzz.className = 'zzz-particle';
            primeFxParticle(zzz, 'sleep', 'none', { text: 'Z', color: '#a9b7d8', size: '15px' });
            zzz.style.left = '45%';
            zzz.style.top = '30%';
            addParticle(container, zzz, 1800);
            // Single star particle
            const star = document.createElement('div');
            star.className = 'star-particle';
            primeFxParticle(star, 'sleep', 'spark', { color: '#ffe082', size: '12px' });
            star.style.left = `${20 + Math.random() * 60}%`;
            star.style.top = `${25 + Math.random() * 40}%`;
            star.style.animationDelay = `${Math.random() * 0.5}s`;
            addParticle(container, star, 1500);
        }

        function createMedicineParticles(container) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'medicine-particle';
                primeFxParticle(
                    particle,
                    'medicine',
                    (i === 0 ? 'cross' : 'ring'),
                    { color: i === 0 ? '#7ec8ff' : '#b39ddb', size: `${11 + i * 2}px` }
                );
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createGroomParticles(container) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'groom-particle';
                primeFxParticle(
                    particle,
                    'groom',
                    (i === 0 ? 'slash' : 'spark'),
                    { color: i === 0 ? '#90caf9' : '#ffd54f', size: `${10 + i * 2}px` }
                );
                particle.style.left = `${20 + Math.random() * 60}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.15}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createExerciseParticles(container) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'exercise-particle';
                primeFxParticle(
                    particle,
                    'exercise',
                    (i === 0 ? 'orbit' : 'chip'),
                    { color: i === 0 ? '#ffcc80' : '#81d4fa', size: `${12 + i}px` }
                );
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${25 + Math.random() * 40}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                addParticle(container, particle, 1600);
            }
        }

        function createTreatParticles(container, treatEmoji) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'treat-particle';
                primeFxParticle(
                    particle,
                    'treat',
                    (i === 0 ? 'drop' : 'spark'),
                    {
                        color: i === 0 ? '#ffab91' : '#ffe082',
                        size: `${11 + i * 2}px`
                    }
                );
                if (treatEmoji && i === 0) particle.title = `${treatEmoji} treat`;
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.12}s`;
                addParticle(container, particle, 1700);
            }
        }

        function createCuddleParticles(container) {
            for (let i = 0; i < 2; i++) {
                const particle = document.createElement('div');
                particle.className = 'cuddle-particle';
                primeFxParticle(
                    particle,
                    'cuddle',
                    (i === 0 ? 'heart' : 'dot'),
                    { color: i === 0 ? '#f48fb1' : '#f8bbd0', size: `${12 + i * 2}px` }
                );
                particle.style.left = `${15 + Math.random() * 70}%`;
                particle.style.top = `${20 + Math.random() * 45}%`;
                particle.style.animationDelay = `${i * 0.1}s`;
                addParticle(container, particle, 1700);
            }
        }

        // ==================== IDLE MICRO-ANIMATIONS ====================
        // Replaces static pet with subtle living animations

        let idleAnimTimers = [];

        function removeIdleTimer(id) {
            const idx = idleAnimTimers.indexOf(id);
            if (idx !== -1) idleAnimTimers.splice(idx, 1);
            // Prevent unbounded growth from stale entries
            if (idleAnimTimers.length > 50) {
                idleAnimTimers = idleAnimTimers.slice(-20);
            }
        }

        function stopIdleAnimations() {
            idleAnimTimers.forEach(id => clearTimeout(id));
            idleAnimTimers = [];
            stopSpeechBubble();
            // Remove any existing idle animation elements
            document.querySelectorAll('.idle-blink-overlay, .idle-twitch-overlay, .idle-zzz-float, .sleep-nudge-icon, .idle-need-hint, .speech-bubble, .species-idle-effect').forEach(el => el.remove());
        }

        function startIdleAnimations() {
            stopIdleAnimations();
            if (gameState.phase !== 'pet' || !gameState.pet) return;

            scheduleBlink();
            scheduleTwitch();
            checkLowEnergyAnim();
            checkNightSleepNudge();
            scheduleNeedBasedAnim();
            scheduleSpeechBubble();
            scheduleSpeciesIdleAnim();
            schedulePetCommentary();
        }

        // Blink: random interval between 8-15 seconds (slowed to reduce visual noise)
        function scheduleBlink() {
            const delay = 8000 + Math.random() * 7000;
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet') return;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) return;

                // Skip if an action animation is playing to avoid flash
                if (actionAnimating) { scheduleBlink(); return; }

                petContainer.classList.add('idle-blink');
                setTimeout(() => {
                    petContainer.classList.remove('idle-blink');
                    scheduleBlink();
                }, 200);
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // Twitch (nose movement): every 12-20 seconds (slowed to reduce visual noise)
        function scheduleTwitch() {
            const delay = 12000 + Math.random() * 8000;
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet') return;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) return;

                // Skip if an action animation is playing to avoid flash
                if (actionAnimating) { scheduleTwitch(); return; }

                petContainer.classList.add('idle-twitch');
                setTimeout(() => {
                    petContainer.classList.remove('idle-twitch');
                    scheduleTwitch();
                }, 400);
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // Low Energy (< 20%): droopy/tumble animation
        function checkLowEnergyAnim() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            if (gameState.pet.energy < 20) {
                petContainer.classList.add('idle-low-energy');
            } else {
                petContainer.classList.remove('idle-low-energy');
            }

            // Re-check every 5 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                checkLowEnergyAnim();
            }, 5000);
            idleAnimTimers.push(timerId);
        }

        // Night mode sleep nudge: show Zzz icon briefly once when energy is low at night
        function checkNightSleepNudge() {
            if (gameState.phase !== 'pet' || !gameState.pet) return;
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;

            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const energy = gameState.pet.energy;
            const shouldShow = timeOfDay === 'night' && energy <= 50;
            const existingNudge = document.querySelector('.sleep-nudge-icon');

            if (shouldShow && !existingNudge) {
                const nudge = document.createElement('div');
                nudge.className = 'sleep-nudge-icon';
                nudge.setAttribute('aria-label', 'Your pet is tired. Consider putting them to sleep.');
                nudge.setAttribute('role', 'img');
                nudge.innerHTML = '<span class="sleep-nudge-z z1">Z</span><span class="sleep-nudge-z z2">z</span><span class="sleep-nudge-z z3">z</span>';
                petContainer.appendChild(nudge);
                // Show briefly then remove — don't loop continuously
                setTimeout(() => nudge.remove(), 4000);
            }

            // Re-check after 2 minutes instead of 30s to avoid frequent nudges
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                checkNightSleepNudge();
            }, 120000);
            idleAnimTimers.push(timerId);
        }

        // ==================== NEED-BASED IDLE ANIMATIONS ====================
        // Pet shows visual cues reflecting its most urgent need
        function scheduleNeedBasedAnim() {
            const delay = 15000 + Math.random() * 10000; // Every 15-25 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet' || !gameState.pet) return;
                if (actionAnimating) { scheduleNeedBasedAnim(); return; }

                const pet = gameState.pet;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) { scheduleNeedBasedAnim(); return; }

                // Determine dominant need
                const threshold = 40;
                let animClass = '';
                let animEmoji = '';
                if (pet.hunger < threshold && pet.hunger <= pet.energy && pet.hunger <= pet.cleanliness && pet.hunger <= pet.happiness) {
                    animClass = 'idle-need-hungry';
                    animEmoji = '🍎';
                } else if (pet.energy < threshold && pet.energy <= pet.hunger && pet.energy <= pet.cleanliness && pet.energy <= pet.happiness) {
                    animClass = 'idle-need-tired';
                    animEmoji = '💤';
                } else if (pet.cleanliness < threshold && pet.cleanliness <= pet.hunger && pet.cleanliness <= pet.energy && pet.cleanliness <= pet.happiness) {
                    animClass = 'idle-need-dirty';
                    animEmoji = '💧';
                } else if (pet.happiness < threshold && pet.happiness <= pet.hunger && pet.happiness <= pet.energy && pet.happiness <= pet.cleanliness) {
                    animClass = 'idle-need-bored';
                    animEmoji = '⚽';
                }

                if (animClass) {
                    petContainer.classList.add(animClass);
                    // Show a small floating need icon
                    const needHint = document.createElement('div');
                    needHint.className = 'idle-need-hint';
                    needHint.setAttribute('aria-hidden', 'true');
                    needHint.textContent = animEmoji;
                    petContainer.appendChild(needHint);
                    setTimeout(() => {
                        petContainer.classList.remove(animClass);
                        needHint.remove();
                    }, 2000);
                }

                scheduleNeedBasedAnim();
            }, delay);
            idleAnimTimers.push(timerId);
        }

        // ==================== SPECIES-SPECIFIC IDLE ANIMATIONS ====================
        const SPECIES_IDLE_BEHAVIORS = {
            dog: { emoji: '🦴', text: '*tail wag*', cssClass: 'idle-species-wag' },
            cat: { emoji: '🐾', text: '*grooming*', cssClass: 'idle-species-groom' },
            bunny: { emoji: '🥕', text: '*nose wiggle*', cssClass: 'idle-species-hop' },
            bird: { emoji: '🎵', text: '*hop hop*', cssClass: 'idle-species-hop' },
            hamster: { emoji: '🌻', text: '*wheel spin*', cssClass: 'idle-species-spin' },
            turtle: { emoji: '🌿', text: '*slow stretch*', cssClass: 'idle-species-stretch' },
            fish: { emoji: '💧', text: '*bubble*', cssClass: 'idle-species-swim' },
            frog: { emoji: '🪰', text: '*tongue flick*', cssClass: 'idle-species-hop' },
            hedgehog: { emoji: '🍂', text: '*snuffle*', cssClass: 'idle-species-snuffle' },
            panda: { emoji: '🎋', text: '*munch*', cssClass: 'idle-species-munch' },
            penguin: { emoji: '🐟', text: '*waddle*', cssClass: 'idle-species-waddle' },
            unicorn: { emoji: '✨', text: '*sparkle*', cssClass: 'idle-species-sparkle' },
            dragon: { emoji: '🔥', text: '*puff*', cssClass: 'idle-species-puff' }
        };

        function scheduleSpeciesIdleAnim() {
            const delay = 18000 + Math.random() * 15000; // Every 18-33 seconds
            const timerId = setTimeout(() => {
                removeIdleTimer(timerId);
                if (gameState.phase !== 'pet' || !gameState.pet) return;
                if (actionAnimating) { scheduleSpeciesIdleAnim(); return; }

                const pet = gameState.pet;
                const petContainer = document.getElementById('pet-container');
                if (!petContainer) { scheduleSpeciesIdleAnim(); return; }

                // Don't overlap with speech or need bubbles
                if (petContainer.querySelector('.speech-bubble') || petContainer.querySelector('.idle-need-hint')) {
                    scheduleSpeciesIdleAnim();
                    return;
                }

                const behavior = SPECIES_IDLE_BEHAVIORS[pet.type];
                if (!behavior) { scheduleSpeciesIdleAnim(); return; }

                // Apply CSS class for the animation
                petContainer.classList.add(behavior.cssClass);

                // Show a small floating species-specific emoji
                const effect = document.createElement('div');
                effect.className = 'species-idle-effect';
                effect.setAttribute('aria-hidden', 'true');
                effect.textContent = behavior.emoji;
                petContainer.appendChild(effect);

                setTimeout(() => {
                    petContainer.classList.remove(behavior.cssClass);
                    effect.remove();
                }, 2500);

                scheduleSpeciesIdleAnim();
            }, delay);
            idleAnimTimers.push(timerId);
        }
