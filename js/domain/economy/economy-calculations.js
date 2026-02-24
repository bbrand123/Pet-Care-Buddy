(function initEconomyCalculations(global) {
    'use strict';

    const MINIGAME_GAME_BONUS = Object.freeze({
        fetch: 1.0,
        hideseek: 1.1,
        bubblepop: 1.0,
        matching: 1.2,
        simonsays: 1.35,
        coloring: 0.95,
        racing: 1.12,
        cooking: 1.02,
        fishing: 1.08,
        rhythm: 1.1,
        slider: 1.08,
        trivia: 1.0,
        runner: 1.16,
        tournament: 1.2,
        coop: 1.08
    });

    function clamp(value, min, max) {
        const num = Number(value);
        if (!Number.isFinite(num)) return min;
        return Math.max(min, Math.min(max, num));
    }

	    function computeMinigameCoinPayout(input) {
	        const cfg = input || {};
	        const gameId = String(cfg.gameId || '');
	        const score = Math.max(0, Number(cfg.score) || 0);
	        if (score <= 0) return 0;
	        const multiplier = MINIGAME_GAME_BONUS[gameId] || 1;
	        const difficulty = Number.isFinite(Number(cfg.difficulty)) ? Number(cfg.difficulty) : 1;
	        const difficultyRewardMult = clamp(0.96 + ((difficulty - 1) * 0.52), 0.92, 1.52);
	        const payout = Math.max(3, Math.round((6 + Math.pow(score, 0.52) * 4.3) * multiplier * difficultyRewardMult));
	        if (cfg.mode === 'baseOnly') return payout;
	        const ecoMult = Number.isFinite(Number(cfg.economyMultiplier)) ? Number(cfg.economyMultiplier) : 1;
	        const petStrength = Number.isFinite(Number(cfg.petStrength)) ? Number(cfg.petStrength) : 0.5;
	        const petStatRewardMult = clamp(1 + ((petStrength - 0.5) * 0.08), 0.96, 1.04);
	        const sessionCount = Math.max(1, Math.floor(Number(cfg.sessionCount) || 1));
	        const sessionMult = Math.min(1.15, 1 + (Math.max(0, sessionCount - 1) * 0.05));
	        const streakMult = Number.isFinite(Number(cfg.streakMult)) ? Number(cfg.streakMult) : 1;
	        const highSkillBonus = Number.isFinite(Number(cfg.highSkillBonus)) ? Number(cfg.highSkillBonus) : 0;
	        const prestigeMultiplier = Number.isFinite(Number(cfg.prestigeMultiplier)) ? Number(cfg.prestigeMultiplier) : 1;
	        const diminishingMultiplier = Number.isFinite(Number(cfg.diminishingMultiplier)) ? Number(cfg.diminishingMultiplier) : 1;
	        const raw = Math.round(payout * ecoMult * petStatRewardMult * sessionMult * streakMult * (1 + Math.max(0, highSkillBonus)) * prestigeMultiplier);
	        const diminished = Math.max(1, Math.round(raw * Math.max(0, diminishingMultiplier)));
	        const capInput = Number(cfg.cap);
	        const cap = Number.isFinite(capInput) ? Math.max(3, Math.floor(capInput)) : Number.POSITIVE_INFINITY;
	        return Math.max(3, Math.min(cap, diminished));
	    }

    function computeHarvestCoinPayout(input) {
        const cfg = input || {};
        const crop = cfg.crop || null;
        if (!crop) return 0;
        const base = 3
            + Math.round((Number(crop.hungerValue) || 0) / 4)
            + Math.round((Number(crop.happinessValue) || 0) / 6)
            + Math.round((Number(crop.energyValue) || 0) / 6);
        const season = String(cfg.currentSeason || '');
        const seasonalBoost = Array.isArray(crop.seasonBonus) && crop.seasonBonus.includes(season) ? 1.2 : 1.0;
        const ecoMult = Number.isFinite(Number(cfg.economyMultiplier)) ? Number(cfg.economyMultiplier) : 1;
        return Math.max(2, Math.round(base * seasonalBoost * ecoMult));
    }

    const api = {
        MINIGAME_GAME_BONUS,
        computeMinigameCoinPayout,
        computeHarvestCoinPayout
    };

    global.EconomyCalculations = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
