(function initMLFSaveOfflineSimulation(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFSaveOfflineSimulation = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveOfflineSimulation() {
    'use strict';

    function clampFallback(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function applyGardenOfflineGrowth(save, deps) {
        if (!isObject(save) || !isObject(save.garden)) {
            return { changed: false, gardenTicksPassed: 0 };
        }
        if (!Array.isArray(save.garden.plots) || !save.garden.lastGrowTick) {
            return { changed: false, gardenTicksPassed: 0 };
        }

        const now = Number.isFinite(deps.now) ? deps.now : Date.now();
        const timePassed = now - save.garden.lastGrowTick;
        const gardenTicksPassed = Math.floor(timePassed / 60000);
        if (gardenTicksPassed <= 0) {
            return { changed: false, gardenTicksPassed: 0 };
        }

        const getCurrentSeason = typeof deps.getCurrentSeason === 'function'
            ? deps.getCurrentSeason
            : function getCurrentSeasonFallback() { return 'spring'; };
        const seasons = deps.seasons || {};
        const gardenCrops = deps.gardenCrops || {};

        const season = save.season || getCurrentSeason();
        const growthMult = seasons[season] ? seasons[season].gardenGrowthMultiplier : 1;

        for (let i = 0; i < save.garden.plots.length; i++) {
            const plot = save.garden.plots[i];
            if (!plot || !plot.cropId || plot.stage >= 3) continue;
            const crop = gardenCrops[plot.cropId];
            if (!crop) continue;
            const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growthMult));
            const firstTickValue = plot.watered ? 2 : 1;
            plot.growTicks += firstTickValue + (gardenTicksPassed - 1);
            plot.watered = false;
            const newStage = Math.min(3, Math.floor(plot.growTicks / effectiveGrowTime));
            plot.stage = Math.max(plot.stage, newStage);
        }

        save.garden.lastGrowTick = now;
        return { changed: true, gardenTicksPassed };
    }

    function applyNeedsOfflineSimulation(save, deps) {
        if (!isObject(save) || !save.lastUpdate) {
            return { changed: false, minutesPassed: 0, decay: 0 };
        }

        const now = Number.isFinite(deps.now) ? deps.now : Date.now();
        const clamp = typeof deps.clamp === 'function' ? deps.clamp : clampFallback;
        const personalityTraits = deps.personalityTraits || {};
        const elderConfig = deps.elderConfig || { wisdomDecayReduction: 1 };
        const timePassed = now - save.lastUpdate;
        const minutesPassed = Math.max(0, timePassed / 60000);
        const decay = Math.min(Math.floor(minutesPassed / 2), 80);
        if (decay <= 0) {
            return { changed: false, minutesPassed, decay };
        }

        const petsToDecay = Array.isArray(save.pets) && save.pets.length > 0
            ? save.pets
            : (save.pet ? [save.pet] : []);
        let activeOldStats = null;

        petsToDecay.forEach(function decayPet(p, idx) {
            if (!p) return;
            const oldStats = {
                hunger: p.hunger,
                cleanliness: p.cleanliness,
                happiness: p.happiness,
                energy: p.energy
            };
            if (idx === save.activePetIndex) activeOldStats = oldStats;

            const isActive = idx === save.activePetIndex;
            const rateMult = isActive ? 1 : 0.5;

            const trait = p.personality && personalityTraits[p.personality];
            const pMods = trait ? trait.statModifiers : null;
            const hungerM = pMods ? pMods.hungerDecayMultiplier : 1;
            const cleanM = pMods ? pMods.cleanlinessDecayMultiplier : 1;
            const happyM = pMods ? pMods.happinessDecayMultiplier : 1;
            const energyM = pMods ? pMods.energyDecayMultiplier : 1;
            const energyRecoveryM = energyM > 0 ? (1 / energyM) : 1;
            const elderR = p.growthStage === 'elder' ? elderConfig.wisdomDecayReduction : 1;

            p.hunger = clamp(p.hunger - Math.floor(decay * 1.5 * rateMult * hungerM * elderR), 0, 100);
            p.cleanliness = clamp(p.cleanliness - Math.floor(decay * 0.5 * rateMult * cleanM * elderR), 0, 100);
            p.happiness = clamp(p.happiness - Math.floor(decay * rateMult * happyM * elderR), 0, 100);
            p.energy = clamp(p.energy + Math.floor(decay * 0.2 * rateMult * energyRecoveryM), 0, 100);

            if (Array.isArray(save.pets) && save.pets.length > 1 && isObject(save.relationships)) {
                let bestRelPoints = 0;
                const pid = p.id;
                Object.entries(save.relationships).forEach(function inspectRelationship(entry) {
                    const key = entry[0];
                    const rel = entry[1];
                    if (!rel || typeof rel.points !== 'number') return;
                    if (pid != null && key.split('-').indexOf(String(pid)) === -1) return;
                    if (rel.points > bestRelPoints) bestRelPoints = rel.points;
                });
                if (bestRelPoints > 0) {
                    const relScale = Math.min(1, bestRelPoints / 180);
                    const friendBonus = Math.min(5, Math.floor(decay * 0.2 * relScale));
                    p.happiness = clamp(p.happiness + friendBonus, 0, 100);
                }
            }
        });

        petsToDecay.forEach(function trackNeglect(p) {
            if (!p) return;
            const isNeglected = p.hunger < 20 || p.cleanliness < 20 || p.happiness < 20 || p.energy < 20;
            if (!isNeglected) return;
            const neglectIncrements = Math.min(10, Math.floor(minutesPassed / 10));
            if (neglectIncrements > 0) {
                p.neglectCount = (p.neglectCount || 0) + neglectIncrements;
            }
        });

        if (Array.isArray(save.pets) && save.pets.length > 0) {
            save.pet = save.pets[save.activePetIndex] || save.pets[0] || save.pet;
        }

        if (minutesPassed >= 5 && save.pet && activeOldStats) {
            save._offlineChanges = {
                minutes: Math.round(minutesPassed),
                hunger: save.pet.hunger - activeOldStats.hunger,
                cleanliness: save.pet.cleanliness - activeOldStats.cleanliness,
                happiness: save.pet.happiness - activeOldStats.happiness,
                energy: save.pet.energy - activeOldStats.energy
            };
        }

        return { changed: true, minutesPassed, decay };
    }

    function applyOfflineSimulation(save, deps) {
        const options = deps && typeof deps === 'object' ? deps : {};
        const now = Number.isFinite(options.now) ? options.now : Date.now();
        const gardenResult = applyGardenOfflineGrowth(save, Object.assign({}, options, { now }));
        const needsResult = applyNeedsOfflineSimulation(save, Object.assign({}, options, { now }));

        if (typeof options.getTimeOfDay === 'function' && isObject(save)) {
            save.timeOfDay = options.getTimeOfDay();
        }

        return {
            changed: !!(gardenResult.changed || needsResult.changed),
            now,
            garden: gardenResult,
            needs: needsResult
        };
    }

    return Object.freeze({
        applyGardenOfflineGrowth,
        applyNeedsOfflineSimulation,
        applyOfflineSimulation
    });
});
