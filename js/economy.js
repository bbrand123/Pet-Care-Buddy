// ============================================================
// economy.js  –  Economy & trading system
// Extracted from game.js (lines 1280-2423)
// ============================================================

        // ==================== ECONOMY & TRADING ====================

        function getAuctionHouseStorageKey() {
            return STORAGE_KEYS.auctionHouse;
        }

        function getAuctionSlotStorageKey() {
            return STORAGE_KEYS.auctionSlotId;
        }

        function getAuctionSlotLabel(slotId) {
            const map = { slotA: 'Slot A', slotB: 'Slot B', slotC: 'Slot C' };
            return map[slotId] || String(slotId || 'Slot');
        }

	        function hashStringToUint(value) {
            let hash = 2166136261;
            const str = String(value || '');
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
	            return hash >>> 0;
	        }

	        function getHardeningCfg(path, fallbackValue) {
	            const root = (typeof ECONOMY_HARDENING_BALANCE !== 'undefined' && ECONOMY_HARDENING_BALANCE) ? ECONOMY_HARDENING_BALANCE : null;
	            if (!root || !path) return fallbackValue;
	            const parts = String(path).split('.');
	            let cur = root;
	            for (let i = 0; i < parts.length; i++) {
	                if (!cur || typeof cur !== 'object' || !(parts[i] in cur)) return fallbackValue;
	                cur = cur[parts[i]];
	            }
	            return cur === undefined ? fallbackValue : cur;
	        }

	        function ensureEconomySecurityState(stateObj) {
	            const state = stateObj || gameState;
	            if (!state.security || typeof state.security !== 'object' || Array.isArray(state.security)) state.security = {};
	            const sec = state.security;
	            if (typeof sec.suspicious !== 'boolean') sec.suspicious = false;
	            if (typeof sec.suspiciousReason !== 'string') sec.suspiciousReason = '';
	            if (!sec.coinGainMinute || typeof sec.coinGainMinute !== 'object') {
	                sec.coinGainMinute = { windowStart: 0, earned: 0 };
	            }
	            if (!sec.coinGainSession || typeof sec.coinGainSession !== 'object') {
	                sec.coinGainSession = { earned: 0 };
	            }
	            if (!Number.isFinite(sec.coinGainMinute.windowStart)) sec.coinGainMinute.windowStart = 0;
	            if (!Number.isFinite(sec.coinGainMinute.earned)) sec.coinGainMinute.earned = 0;
	            if (!Number.isFinite(sec.coinGainSession.earned)) sec.coinGainSession.earned = 0;
	            return sec;
	        }

	        function isSuspiciousEconomyState(targetState) {
	            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
	            return !!(ensureEconomySecurityState(state).suspicious);
	        }

	        function getSuspiciousRewardMultiplier() {
	            return Math.max(0.02, Math.min(1, Number(getHardeningCfg('tamperPenaltyMultiplier', 0.12)) || 0.12));
	        }

	        function shouldApplySuspiciousRewardPenalty(reason) {
	            const text = String(reason || '').toLowerCase();
	            if (!text) return false;
	            return text.includes('competition')
	                || text.includes('auction payout')
	                || text.includes('harvest')
	                || text.includes('mini-game')
	                || text.includes('mystery egg bonus')
	                || text.includes('loot sold');
	        }

	        function showEconomyHardeningToast(key, message, color) {
	            if (typeof showToast !== 'function' || !key || !message) return;
	            if (!gameState._economyHardeningToastAt || typeof gameState._economyHardeningToastAt !== 'object') {
	                gameState._economyHardeningToastAt = {};
	            }
	            const now = Date.now();
	            const lastAt = Number(gameState._economyHardeningToastAt[key]) || 0;
	            if ((now - lastAt) < 45000) return;
	            gameState._economyHardeningToastAt[key] = now;
	            showToast(message, color || '#90A4AE');
	        }

	        function applyCoinGainRateLimits(rawAmount, reason, targetState) {
	            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
	            const sec = ensureEconomySecurityState(state);
	            const cfg = getHardeningCfg('coinGainRateLimit', {}) || {};
	            const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
	            if (amount <= 0) return { amount: 0, minuteMult: 1, sessionMult: 1, suspiciousMult: 1 };
	            const now = Date.now();
	            const minuteSoftCap = Math.max(100, Number(cfg.minuteSoftCap) || 1400);
	            const minuteFalloff = Math.max(0.0001, Number(cfg.minuteFalloffPerCoin) || 0.01);
	            const minuteMin = Math.max(0.02, Math.min(1, Number(cfg.minuteMinMultiplier) || 0.08));
	            const sessionSoftCap = Math.max(500, Number(cfg.sessionSoftCap) || 18000);
	            const sessionFalloff = Math.max(0.00001, Number(cfg.sessionFalloffPerCoin) || 0.0015);
	            const sessionMin = Math.max(0.05, Math.min(1, Number(cfg.sessionMinMultiplier) || 0.2));
	            if (!Number.isFinite(sec.coinGainMinute.windowStart) || (now - sec.coinGainMinute.windowStart) >= 60000 || sec.coinGainMinute.windowStart <= 0) {
	                sec.coinGainMinute.windowStart = now;
	                sec.coinGainMinute.earned = 0;
	            }
	            const minuteOver = Math.max(0, sec.coinGainMinute.earned - minuteSoftCap);
	            const sessionOver = Math.max(0, sec.coinGainSession.earned - sessionSoftCap);
	            const minuteMult = minuteOver > 0 ? Math.max(minuteMin, 1 / (1 + (minuteOver * minuteFalloff))) : 1;
	            const sessionMult = sessionOver > 0 ? Math.max(sessionMin, 1 / (1 + (sessionOver * sessionFalloff))) : 1;
	            const suspiciousMult = (isSuspiciousEconomyState(state) && shouldApplySuspiciousRewardPenalty(reason)) ? getSuspiciousRewardMultiplier() : 1;
	            let finalAmount = Math.max(0, Math.floor(amount * minuteMult * sessionMult * suspiciousMult));
	            if (amount > 0 && finalAmount <= 0 && (minuteMult < 1 || sessionMult < 1 || suspiciousMult < 1)) finalAmount = 1;
	            sec.coinGainMinute.earned += amount;
	            sec.coinGainSession.earned += amount;
	            if (minuteMult < 0.999 || sessionMult < 0.999) {
	                showEconomyHardeningToast('rate-limit', 'High coin gain rate detected: rewards are in diminishing mode.', '#90A4AE');
	            }
	            if (suspiciousMult < 1) {
	                showEconomyHardeningToast('suspicious', 'Save integrity warning: some rewards are limited.', '#EF5350');
	            }
	            return { amount: finalAmount, minuteMult, sessionMult, suspiciousMult };
	        }

	        function ensureBalanceTelemetryState() {
	            if (!gameState._balanceTelemetry || typeof gameState._balanceTelemetry !== 'object') {
	                gameState._balanceTelemetry = { coinBySource: {}, recentCoinEvents: [] };
	            }
	            if (!gameState._balanceTelemetry.coinBySource || typeof gameState._balanceTelemetry.coinBySource !== 'object') {
	                gameState._balanceTelemetry.coinBySource = {};
	            }
	            if (!Array.isArray(gameState._balanceTelemetry.recentCoinEvents)) {
	                gameState._balanceTelemetry.recentCoinEvents = [];
	            }
	            return gameState._balanceTelemetry;
	        }

	        function recordCoinTelemetry(sourceReason, amount) {
	            const cfg = (typeof BALANCE_TELEMETRY !== 'undefined' && BALANCE_TELEMETRY) ? BALANCE_TELEMETRY : null;
	            if (cfg && cfg.enabled === false) return;
	            const credited = Math.max(0, Math.floor(Number(amount) || 0));
	            if (credited <= 0) return;
	            const key = String(sourceReason || 'Unknown');
	            const telemetry = ensureBalanceTelemetryState();
	            telemetry.coinBySource[key] = Math.max(0, Math.floor(Number(telemetry.coinBySource[key]) || 0)) + credited;
	            const now = Date.now();
	            telemetry.recentCoinEvents.push({ at: now, amount: credited, source: key });
	            const windowMs = Math.max(60000, Number((cfg && cfg.rollingWindowMs) || (60 * 60 * 1000)));
	            telemetry.recentCoinEvents = telemetry.recentCoinEvents
	                .filter((evt) => evt && (now - (Number(evt.at) || 0)) <= windowMs);
	            const maxEvents = Math.max(50, Math.floor(Number((cfg && cfg.maxRecentEvents) || 500)));
	            if (telemetry.recentCoinEvents.length > maxEvents) {
	                telemetry.recentCoinEvents = telemetry.recentCoinEvents.slice(-maxEvents);
	            }
	        }

	        function getBalanceTelemetrySnapshot() {
	            const telemetry = ensureBalanceTelemetryState();
	            const cfg = (typeof BALANCE_TELEMETRY !== 'undefined' && BALANCE_TELEMETRY) ? BALANCE_TELEMETRY : {};
	            const windowMs = Math.max(60000, Number(cfg.rollingWindowMs) || (60 * 60 * 1000));
	            const now = Date.now();
	            const recent = telemetry.recentCoinEvents.filter((evt) => evt && (now - (Number(evt.at) || 0)) <= windowMs);
	            const totalRecentCoins = recent.reduce((sum, evt) => sum + Math.max(0, Number(evt.amount) || 0), 0);
	            return {
	                windowMs,
	                coinBySource: Object.assign({}, telemetry.coinBySource),
	                recentCoinEvents: recent.slice(),
	                rewardsPerHourEstimate: Math.round((totalRecentCoins * 3600000) / Math.max(1, windowMs))
	            };
	        }

        function createDefaultAuctionHouseData() {
            return { listings: [], wallets: {}, profileWallets: {} };
        }

        function normalizeAuctionListingRecord(listing) {
            if (!listing || typeof listing !== 'object') return null;
            return {
                id: String(listing.id || ''),
                sellerSlot: String(listing.sellerSlot || 'slotA'),
                // Stable seller identity for cross-slot self-trade protection (legacy aliases preserved).
                sellerProfileId: listing.sellerProfileId ? String(listing.sellerProfileId) : null,
                sellerPlayerId: listing.sellerPlayerId ? String(listing.sellerPlayerId) : null,
                itemType: String(listing.itemType || ''),
                itemId: String(listing.itemId || ''),
                quantity: Math.max(1, Math.floor(Number(listing.quantity) || 1)),
                price: Math.max(1, Math.floor(Number(listing.price) || 1)),
                createdAt: Number(listing.createdAt) || Date.now(),
                expiresAt: Number.isFinite(Number(listing.expiresAt)) ? Math.floor(Number(listing.expiresAt)) : 0,
                expiredAt: Number.isFinite(Number(listing.expiredAt)) ? Math.floor(Number(listing.expiredAt)) : 0,
                status: String(listing.status || ''),
                listingFee: Math.max(0, Math.floor(Number(listing.listingFee) || 0)),
                legacyOwnerSlot: listing.legacyOwnerSlot ? String(listing.legacyOwnerSlot) : null,
                relistKey: listing.relistKey ? String(listing.relistKey) : '',
                relistCount: Math.max(0, Math.floor(Number(listing.relistCount) || 0))
            };
        }

        function loadAuctionHouseData() {
            try {
                const raw = localStorage.getItem(getAuctionHouseStorageKey());
                if (!raw) return createDefaultAuctionHouseData();
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return createDefaultAuctionHouseData();
                if (!Array.isArray(parsed.listings)) parsed.listings = [];
                if (!parsed.wallets || typeof parsed.wallets !== 'object') parsed.wallets = {};
                if (!parsed.profileWallets || typeof parsed.profileWallets !== 'object') parsed.profileWallets = {};
                parsed.listings = parsed.listings
                    .map(normalizeAuctionListingRecord)
                    .filter((l) => l.id && l.itemType && l.itemId);
                return parsed;
            } catch (e) {
                return createDefaultAuctionHouseData();
            }
        }

        function saveAuctionHouseData(data) {
            try {
                const clean = data && typeof data === 'object' ? data : createDefaultAuctionHouseData();
                if (!Array.isArray(clean.listings)) clean.listings = [];
                if (!clean.wallets || typeof clean.wallets !== 'object') clean.wallets = {};
                if (!clean.profileWallets || typeof clean.profileWallets !== 'object') clean.profileWallets = {};
                localStorage.setItem(getAuctionHouseStorageKey(), JSON.stringify(clean));
            } catch (e) {
                // ignore storage errors
            }
        }

        function migrateAuctionIdentityForPlayer(playerId, activeSlotId) {
            if (!playerId) return;
            const data = loadAuctionHouseData();
            let changed = false;
            (data.listings || []).forEach((listing) => {
                if (!listing || listing.sellerProfileId) return;
                if (listing.sellerPlayerId) {
                    listing.sellerProfileId = String(listing.sellerPlayerId);
                    changed = true;
                    return;
                }
                // Best-effort migration for legacy slot-owned listings only for the active slot.
                if (listing.sellerSlot === activeSlotId) {
                    listing.sellerProfileId = String(playerId);
                    listing.sellerPlayerId = String(playerId);
                    changed = true;
                } else {
                    listing.legacyOwnerSlot = listing.sellerSlot || 'slotA';
                }
            });
            const legacyWallet = Math.max(0, Math.floor((data.wallets && data.wallets[activeSlotId]) || 0));
            if (legacyWallet > 0) {
                data.profileWallets[playerId] = Math.max(0, Math.floor((data.profileWallets[playerId] || 0))) + legacyWallet;
                data.wallets[activeSlotId] = 0;
                changed = true;
            }
            if (changed) saveAuctionHouseData(data);
        }

        function createDefaultEconomyInventory() {
            return {
                food: {},
                toys: {},
                medicine: {},
                seeds: {},
                accessories: {},
                decorations: {},
                crafted: {}
            };
        }

        function ensureEconomyState(stateObj) {
            const state = stateObj || gameState;
            if (!state.economy || typeof state.economy !== 'object') {
                state.economy = createDefaultEconomyState();
            }
            const eco = state.economy;
            if (typeof eco.coins !== 'number' || !Number.isFinite(eco.coins)) eco.coins = 240;
            eco.coins = Math.max(0, Math.floor(eco.coins));
            if (!eco.inventory || typeof eco.inventory !== 'object') eco.inventory = createDefaultEconomyInventory();
            ['food', 'toys', 'medicine', 'seeds', 'accessories', 'decorations', 'crafted'].forEach((bucket) => {
                if (!eco.inventory[bucket] || typeof eco.inventory[bucket] !== 'object' || Array.isArray(eco.inventory[bucket])) {
                    eco.inventory[bucket] = {};
                }
            });
            if (!eco.market || typeof eco.market !== 'object') eco.market = { dayKey: '', stock: [] };
            if (typeof eco.market.dayKey !== 'string') eco.market.dayKey = '';
            if (!Array.isArray(eco.market.stock)) eco.market.stock = [];
            if (!eco.market.rare || typeof eco.market.rare !== 'object' || Array.isArray(eco.market.rare)) {
                eco.market.rare = { marketDayKey: '', generatedForDay: false, offers: [], lastTrustedDayKey: '' };
            }
            if (typeof eco.market.rare.marketDayKey !== 'string') eco.market.rare.marketDayKey = '';
            if (typeof eco.market.rare.generatedForDay !== 'boolean') eco.market.rare.generatedForDay = false;
            if (!Array.isArray(eco.market.rare.offers)) eco.market.rare.offers = [];
            if (typeof eco.market.rare.lastTrustedDayKey !== 'string') eco.market.rare.lastTrustedDayKey = '';
            if (!eco.auction || typeof eco.auction !== 'object') eco.auction = { slotId: 'slotA', soldCount: 0, boughtCount: 0, postedCount: 0 };
            if (!ECONOMY_AUCTION_SLOTS.includes(eco.auction.slotId)) eco.auction.slotId = 'slotA';
            if (typeof eco.auction.soldCount !== 'number') eco.auction.soldCount = 0;
            if (typeof eco.auction.boughtCount !== 'number') eco.auction.boughtCount = 0;
            if (typeof eco.auction.postedCount !== 'number') eco.auction.postedCount = 0;
            if (!eco.auction.relistTracker || typeof eco.auction.relistTracker !== 'object' || Array.isArray(eco.auction.relistTracker)) eco.auction.relistTracker = {};
            if (!Number.isFinite(eco.auction.auctionEarningsPending)) eco.auction.auctionEarningsPending = 0;
            if (!Number.isFinite(eco.auction.auctionEarningsWithheld)) eco.auction.auctionEarningsWithheld = 0;
            eco.auction.auctionEarningsPending = Math.max(0, Math.floor(eco.auction.auctionEarningsPending));
            eco.auction.auctionEarningsWithheld = Math.max(0, Math.floor(eco.auction.auctionEarningsWithheld));
            if (!eco.auction.auctionEarningsLastClaimResult || typeof eco.auction.auctionEarningsLastClaimResult !== 'object') eco.auction.auctionEarningsLastClaimResult = null;
            if (!Number.isFinite(eco.auction.lastTrustedNowMs)) eco.auction.lastTrustedNowMs = 0;
            if (typeof eco.totalEarned !== 'number') eco.totalEarned = 0;
	            if (typeof eco.totalSpent !== 'number') eco.totalSpent = 0;
	            if (typeof eco.mysteryEggsOpened !== 'number') eco.mysteryEggsOpened = 0;
	            if (!eco.pity || typeof eco.pity !== 'object' || Array.isArray(eco.pity)) eco.pity = { mysteryEggRareMisses: 0 };
	            if (!Number.isFinite(eco.pity.mysteryEggRareMisses)) eco.pity.mysteryEggRareMisses = 0;
	            eco.pity.mysteryEggRareMisses = Math.max(0, Math.floor(eco.pity.mysteryEggRareMisses));
	            if (!eco.wealthPressure || typeof eco.wealthPressure !== 'object' || Array.isArray(eco.wealthPressure)) {
	                eco.wealthPressure = { lastAppliedDate: '', lastFee: 0, lastBreakdown: null, unpaidFeeDebt: 0 };
	            }
	            if (typeof eco.wealthPressure.lastAppliedDate !== 'string') eco.wealthPressure.lastAppliedDate = '';
	            if (!Number.isFinite(eco.wealthPressure.lastFee)) eco.wealthPressure.lastFee = 0;
	            if (!Number.isFinite(eco.wealthPressure.unpaidFeeDebt)) eco.wealthPressure.unpaidFeeDebt = 0;
	            if (eco.wealthPressure.lastBreakdown !== null && typeof eco.wealthPressure.lastBreakdown !== 'object') eco.wealthPressure.lastBreakdown = null;
            if (!eco.recurringSinks || typeof eco.recurringSinks !== 'object' || Array.isArray(eco.recurringSinks)) {
                eco.recurringSinks = { lastAppliedDayKey: '', lastChargeTotal: 0, unpaidDebt: 0, lastBreakdown: null };
            }
            if (typeof eco.recurringSinks.lastAppliedDayKey !== 'string') eco.recurringSinks.lastAppliedDayKey = '';
            if (!Number.isFinite(eco.recurringSinks.lastChargeTotal)) eco.recurringSinks.lastChargeTotal = 0;
            if (!Number.isFinite(eco.recurringSinks.unpaidDebt)) eco.recurringSinks.unpaidDebt = 0;
            if (eco.recurringSinks.lastBreakdown !== null && typeof eco.recurringSinks.lastBreakdown !== 'object') eco.recurringSinks.lastBreakdown = null;
	            ensureEconomySecurityState(state);
	            // Rec 2: Ensure persistent playerId exists for auction self-trade prevention
            if (!eco.playerId || typeof eco.playerId !== 'string') eco.playerId = generatePlayerId();
            if (typeof eco.auctionIdentityMigrationDone !== 'boolean') eco.auctionIdentityMigrationDone = false;
            if (eco.starterSeedGranted !== true) {
                eco.inventory.seeds.carrot = (eco.inventory.seeds.carrot || 0) + 4;
                eco.inventory.seeds.tomato = (eco.inventory.seeds.tomato || 0) + 3;
                eco.inventory.seeds.strawberry = (eco.inventory.seeds.strawberry || 0) + 2;
                eco.starterSeedGranted = true;
            }
            const preferredSlot = (() => {
                try {
                    return localStorage.getItem(getAuctionSlotStorageKey());
                } catch (e) {
                    return null;
                }
            })();
            if (preferredSlot && ECONOMY_AUCTION_SLOTS.includes(preferredSlot)) eco.auction.slotId = preferredSlot;
            if (!eco.auctionIdentityMigrationDone) {
                migrateAuctionIdentityForPlayer(eco.playerId, eco.auction.slotId);
                eco.auctionIdentityMigrationDone = true;
            }
            return eco;
        }

        function getTodayStringFallback() {
            if (typeof getTodayString === 'function') return getTodayString();
            return new Date().toISOString().slice(0, 10);
        }

        function isAuctionInteractionLocked(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            if (!getHardeningCfg('suspiciousAuctionLock', true)) return false;
            return isSuspiciousEconomyState(state);
        }

        function showAuctionLockToast() {
            showEconomyHardeningToast('auction-locked', 'Save integrity warning: auction interactions are temporarily locked.', '#EF5350');
        }

        function getHardenedEconomyNowMs(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            const eco = ensureEconomyState(state);
            const now = Date.now();
            if (isSuspiciousEconomyState(state)) {
                if (Number.isFinite(eco.auction.lastTrustedNowMs) && eco.auction.lastTrustedNowMs > 0) {
                    return eco.auction.lastTrustedNowMs;
                }
                eco.auction.lastTrustedNowMs = now;
                return now;
            }
            eco.auction.lastTrustedNowMs = now;
            return now;
        }

        function getHardenedEconomyDayKey(targetState) {
            const state = (targetState && typeof targetState === 'object') ? targetState : gameState;
            if (typeof getTodayStringWithTimeHardening === 'function') {
                return String(getTodayStringWithTimeHardening(state) || getTodayStringFallback());
            }
            const eco = ensureEconomyState(state);
            const rawDayKey = String(getTodayStringFallback());
            const rareState = eco.market && eco.market.rare ? eco.market.rare : null;
            if (isSuspiciousEconomyState(state) && rareState && rareState.lastTrustedDayKey) {
                return String(rareState.lastTrustedDayKey);
            }
            if (rareState) rareState.lastTrustedDayKey = rawDayKey;
            return rawDayKey;
        }

        function getAuctionListingExpiryMs() {
            const auctionCfg = getHardeningCfg('auction', {}) || {};
            return Math.max(60 * 60 * 1000, Math.floor(Number(auctionCfg.listingExpiryMs) || (48 * 60 * 60 * 1000)));
        }

        function markExpiredAuctionListings(data, nowMs) {
            if (!data || !Array.isArray(data.listings)) return false;
            const now = Number.isFinite(nowMs) ? nowMs : getHardenedEconomyNowMs();
            let changed = false;
            data.listings.forEach((listing) => {
                if (!listing || typeof listing !== 'object') return;
                if (!Number.isFinite(listing.expiresAt) || listing.expiresAt <= 0) {
                    const createdAt = Math.max(0, Number(listing.createdAt) || now);
                    listing.expiresAt = createdAt + getAuctionListingExpiryMs();
                    changed = true;
                }
                if (listing.status !== 'expired' && listing.expiresAt > 0 && listing.expiresAt <= now) {
                    listing.status = 'expired';
                    listing.expiredAt = now;
                    changed = true;
                }
            });
            return changed;
        }

        function getCoinBalance() {
            return (ensureEconomyState().coins || 0);
        }

        function formatCoins(amount) {
            return Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString();
        }

	        function addCoinsDetailed(amount, reason, options) {
	            const eco = ensureEconomyState();
	            const opts = options && typeof options === 'object' ? options : {};
	            const rawRequested = Math.max(0, Math.floor(Number(amount) || 0));
	            if (rawRequested <= 0) {
	                return {
	                    requested: 0,
	                    limitedAmount: 0,
	                    credited: 0,
	                    repaidDebt: 0,
	                    withheldByGuards: 0,
	                    rateLimit: { amount: 0, minuteMult: 1, sessionMult: 1, suspiciousMult: 1 }
	                };
	            }
	            const limited = applyCoinGainRateLimits(rawRequested, reason, gameState);
	            let add = Math.max(0, Math.floor(Number(limited.amount) || 0));
	            const withheldByGuards = Math.max(0, rawRequested - add);
	            const skipDebtRepayment = !!opts.skipWealthPressureDebtRepayment;
	            const repayment = skipDebtRepayment ? { credited: add, repaid: 0 } : applyWealthPressureDebtRepayment(add, gameState);
	            add = Math.max(0, Math.floor(Number(repayment.credited) || 0));
	            if (add > 0) eco.coins += add;
	            eco.totalEarned = (eco.totalEarned || 0) + add;
	            recordCoinTelemetry(reason, add);
	            if (!opts.silent && typeof showToast === 'function') {
	                let msg = `🪙 +${add} coins${reason ? ` (${reason})` : ''}`;
	                if ((repayment.repaid || 0) > 0) msg += ` • ${repayment.repaid} paid toward storage fee debt`;
	                if (withheldByGuards > 0) msg += ` • ${withheldByGuards} withheld`;
	                showToast(msg, '#FFD700');
	            } else if (!opts.silent && (repayment.repaid || 0) > 0 && typeof showToast === 'function') {
	                showToast(`🧾 ${repayment.repaid} coins auto-paid toward storage fee debt.`, '#90A4AE');
	            }
	            return {
	                requested: rawRequested,
	                limitedAmount: Math.max(0, Math.floor(Number(limited.amount) || 0)),
	                credited: add,
	                repaidDebt: Math.max(0, Math.floor(Number(repayment.repaid) || 0)),
	                withheldByGuards,
	                rateLimit: limited
	            };
	        }

	        function addCoins(amount, reason, silent) {
	            return addCoinsDetailed(amount, reason, { silent: !!silent }).credited;
	        }

	        function estimateTradableInventoryValue(targetState) {
	            const state = targetState || gameState;
	            if (typeof ensureExplorationState === 'function') ensureExplorationState(state);
	            ensureEconomyState(state);
	            const ex = state.exploration || {};
	            const eco = state.economy || {};
	            let total = 0;
            const conservativeFactor = 0.45;
            const resaleFactorByBucket = {
                food: 0.4,
                toys: 0.4,
                medicine: 0.45,
                seeds: 0.4,
                crafted: 0.45,
                accessories: 0.55,
                decorations: 0.55
            };
            function estimateBucketItemValue(bucket, itemId) {
                if (bucket === 'seeds') {
                    const seedEntry = Object.values((ECONOMY_SHOP_ITEMS && ECONOMY_SHOP_ITEMS.seeds) || {})
                        .find((seed) => seed && seed.cropId === itemId);
                    if (!seedEntry) return 2;
                    const packPrice = Math.max(1, Math.floor(Number(seedEntry.basePrice) || 1));
                    const qtyPerPack = Math.max(1, Math.floor(Number(seedEntry.quantity) || 1));
                    const perUnit = packPrice / qtyPerPack;
                    return Math.max(1, Math.round(perUnit * resaleFactorByBucket.seeds));
                }
                if (bucket === 'crafted') {
                    const craftedDef = (typeof CRAFTED_ITEMS !== 'undefined' && CRAFTED_ITEMS) ? CRAFTED_ITEMS[itemId] : null;
                    const craftCost = craftedDef ? Math.max(0, Math.floor(Number(craftedDef.craftCost) || 0)) : 0;
                    if (craftCost > 0) return Math.max(1, Math.round(craftCost * resaleFactorByBucket.crafted));
                    return 10;
                }
                const shopBucket = bucket === 'accessories' ? 'accessories'
                    : bucket === 'decorations' ? 'decorations'
                    : bucket;
                const shopDef = (ECONOMY_SHOP_ITEMS && ECONOMY_SHOP_ITEMS[shopBucket]) ? ECONOMY_SHOP_ITEMS[shopBucket][itemId] : null;
                const baseValue = shopDef ? Math.max(1, Math.floor(Number(shopDef.basePrice) || 1)) : 10;
                const factor = resaleFactorByBucket[bucket] || conservativeFactor;
                return Math.max(1, Math.round(baseValue * factor));
            }
	            Object.entries(ex.lootInventory || {}).forEach(([lootId, qty]) => {
	                const count = Math.max(0, Math.floor(Number(qty) || 0));
	                if (count <= 0) return;
	                total += (getLootSellPrice(lootId, { skipSecurityPenalty: true }) || 0) * count;
	            });
	            Object.entries((((state.garden || {}).inventory) || {})).forEach(([itemId, qty]) => {
	                const count = Math.max(0, Math.floor(Number(qty) || 0));
	                if (count <= 0) return;
	                const crop = GARDEN_CROPS[itemId];
	                if (!crop) return;
	                const base = 3 + Math.round((crop.hungerValue || 0) / 4) + Math.round((crop.happinessValue || 0) / 6) + Math.round((crop.energyValue || 0) / 6);
	                total += Math.max(1, base) * count;
	            });
	            ['food', 'toys', 'medicine', 'seeds', 'crafted', 'accessories', 'decorations'].forEach((bucket) => {
	                Object.entries((((eco.inventory || {})[bucket]) || {})).forEach(([itemId, qty]) => {
	                    const count = Math.max(0, Math.floor(Number(qty) || 0));
	                    if (count <= 0) return;
	                    total += estimateBucketItemValue(bucket, itemId) * count;
	                });
	            });
            try {
                const auctionData = loadAuctionHouseData();
                const currentSlot = (eco.auction && eco.auction.slotId) ? eco.auction.slotId : 'slotA';
                const playerId = (typeof eco.playerId === 'string' && eco.playerId) ? eco.playerId : '';
                const slotWallet = Math.max(0, Math.floor(((auctionData.wallets || {})[currentSlot]) || 0));
                const profileWallet = playerId ? Math.max(0, Math.floor(((auctionData.profileWallets || {})[playerId]) || 0)) : 0;
                total += slotWallet + profileWallet;
            } catch (e) {
                // Ignore storage read failures for valuation.
            }
	            return Math.max(0, Math.floor(total));
	        }

	        function applyWealthPressureDebtRepayment(earnedCoins, targetState) {
	            const state = targetState || gameState;
	            const eco = ensureEconomyState(state);
	            const debt = Math.max(0, Number((((eco || {}).wealthPressure) || {}).unpaidFeeDebt) || 0);
	            const credited = Math.max(0, Math.floor(Number(earnedCoins) || 0));
	            if (debt <= 0 || credited <= 0) return { credited, repaid: 0 };
	            const repay = Math.min(debt, Math.max(1, Math.floor(credited * 0.25)));
	            eco.wealthPressure.unpaidFeeDebt = Math.max(0, Math.ceil(debt - repay));
	            return { credited: Math.max(0, credited - repay), repaid: repay };
	        }

	        function getWealthPressureDebtPenaltyMultiplier(targetState) {
	            const state = targetState || gameState;
	            const eco = ensureEconomyState(state);
	            const debt = Math.max(0, Number((((eco || {}).wealthPressure) || {}).unpaidFeeDebt) || 0);
	            if (debt <= 0) return 1;
	            const per100 = Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureDebtResalePenaltyPer100Coins) || getHardeningCfg('wealthPressure.debtResalePenaltyPer100Coins', 0.03)) || 0.03;
	            const maxPenalty = Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureDebtResalePenaltyMax) || getHardeningCfg('wealthPressure.debtResalePenaltyMax', 0.35)) || 0.35;
	            const penalty = Math.min(Math.max(0, maxPenalty), Math.max(0, (debt / 100) * per100));
	            return Math.max(0.5, 1 - penalty);
	        }

	        function computeWealthPressureFeeBreakdown(targetState) {
	            const state = targetState || gameState;
	            const eco = ensureEconomyState(state);
	            const hpCfg = getHardeningCfg('wealthPressure', {}) || {};
	            if (hpCfg.enabled === false) return { enabled: false, fee: 0, debt: 0, weightedWealth: 0, tradableValue: 0 };
	            const tradableValue = estimateTradableInventoryValue(state);
	            const protectedWealth = Math.max(0, Math.floor(Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureThreshold) || hpCfg.protectedWealth || 1600)));
	            const tradableWeight = Math.max(0, Math.min(1, Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureTradableWeight) || hpCfg.tradableValueWeight || 0.35)));
	            const rate = Math.max(0, Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureRate) || hpCfg.dailyRate || 0.0035));
	            const minFee = Math.max(0, Math.floor(Number((typeof ECONOMY_BALANCE !== 'undefined' && ECONOMY_BALANCE.wealthPressureMinFee) || hpCfg.minFee || 2)));
	            const weightedWealth = Math.floor(Math.max(0, eco.coins) + (tradableValue * tradableWeight));
	            const taxableWealth = Math.max(0, weightedWealth - protectedWealth);
	            if (taxableWealth <= 0) {
	                return { enabled: true, fee: 0, debt: Math.max(0, Number((eco.wealthPressure || {}).unpaidFeeDebt) || 0), weightedWealth, tradableValue, tradableWeight, protectedWealth };
	            }
	            const fee = Math.max(minFee, Math.floor(taxableWealth * rate));
	            return { enabled: true, fee, debt: Math.max(0, Number((eco.wealthPressure || {}).unpaidFeeDebt) || 0), weightedWealth, tradableValue, tradableWeight, protectedWealth };
	        }

	        function applyWealthPressureFee(targetState) {
	            const state = targetState || gameState;
	            const eco = ensureEconomyState(state);
	            const today = typeof getTodayString === 'function' ? getTodayString() : new Date().toISOString().slice(0, 10);
	            if (eco.wealthPressure.lastAppliedDate === today) {
	                return { applied: false, feePaid: 0, debtAdded: 0, repeated: true, breakdown: eco.wealthPressure.lastBreakdown || null };
	            }
	            const breakdown = computeWealthPressureFeeBreakdown(state);
	            let feePaid = 0;
	            let debtAdded = 0;
	            if (breakdown.enabled && breakdown.fee > 0) {
	                feePaid = Math.min(Math.max(0, eco.coins), breakdown.fee);
	                eco.coins = Math.max(0, eco.coins - feePaid);
	                eco.totalSpent = (eco.totalSpent || 0) + feePaid;
	                debtAdded = Math.max(0, breakdown.fee - feePaid);
	                if (debtAdded > 0) eco.wealthPressure.unpaidFeeDebt = Math.max(0, Number(eco.wealthPressure.unpaidFeeDebt) || 0) + debtAdded;
	            }
	            eco.wealthPressure.lastAppliedDate = today;
	            eco.wealthPressure.lastFee = feePaid + debtAdded;
	            eco.wealthPressure.lastBreakdown = Object.assign({}, breakdown, { feePaid, debtAdded, appliedAt: Date.now() });
	            if ((feePaid + debtAdded) > 0 && typeof showToast === 'function') {
	                const debtMsg = debtAdded > 0 ? ` ${debtAdded} added as resale-penalty debt.` : '';
	                showToast(`📦 Storage fee: ${feePaid + debtAdded} coins (coins + stored goods value).${debtMsg}`, '#90A4AE');
	            }
	            return { applied: true, feePaid, debtAdded, breakdown: eco.wealthPressure.lastBreakdown };
	        }

        function spendCoins(amount, reason, silent) {
            const eco = ensureEconomyState();
            const cost = Math.max(0, Math.floor(Number(amount) || 0));
            if (cost <= 0) return { ok: true, spent: 0, balance: eco.coins };
            if (eco.coins < cost) {
                return { ok: false, reason: 'insufficient-funds', needed: cost, balance: eco.coins };
            }
            eco.coins -= cost;
            eco.totalSpent = (eco.totalSpent || 0) + cost;
            if (!silent && typeof showToast === 'function') {
                showToast(`🪙 -${cost} coins${reason ? ` (${reason})` : ''}`, '#FFB74D');
            }
            return { ok: true, spent: cost, balance: eco.coins };
        }

        function getEconomyCategoryMultiplier(category) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonalMultipliers = {
                spring: { seeds: 0.9, food: 0.96, toys: 1.02, medicine: 0.95, decorations: 0.98, mysteryEgg: 1.0, loot: 1.0 },
                summer: { seeds: 0.95, food: 1.05, toys: 1.1, medicine: 1.02, decorations: 1.03, mysteryEgg: 1.08, loot: 1.02 },
                autumn: { seeds: 1.05, food: 1.02, toys: 0.98, medicine: 0.96, decorations: 1.04, mysteryEgg: 1.04, loot: 1.04 },
                winter: { seeds: 1.18, food: 1.06, toys: 0.96, medicine: 1.14, decorations: 1.01, mysteryEgg: 1.06, loot: 1.08 }
            };
            const weatherMultipliers = {
                sunny: { seeds: 0.92, food: 0.97, toys: 1.06, medicine: 0.97, decorations: 1.0, mysteryEgg: 1.02, loot: 0.98 },
                rainy: { seeds: 1.05, food: 1.03, toys: 0.95, medicine: 1.1, decorations: 1.01, mysteryEgg: 1.0, loot: 1.04 },
                snowy: { seeds: 1.12, food: 1.04, toys: 0.94, medicine: 1.12, decorations: 1.02, mysteryEgg: 1.03, loot: 1.06 }
            };
            const seasonMult = (seasonalMultipliers[season] && seasonalMultipliers[season][category]) || 1;
            const weatherMult = (weatherMultipliers[weather] && weatherMultipliers[weather][category]) || 1;
            return seasonMult * weatherMult;
        }

        function getEconomyVolatility(itemKey) {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = getHardenedEconomyDayKey();
            const hash = hashStringToUint(`${day}:${season}:${weather}:${itemKey || ''}`);
            // Rec 7: Narrowed volatility window from 86%-119% to 92%-108%
            const volMin = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityMin === 'number')
                ? ECONOMY_BALANCE.volatilityMin : 0.92;
            const volRange = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.volatilityRange === 'number')
                ? ECONOMY_BALANCE.volatilityRange : 16;
            return volMin + ((hash % (volRange + 1)) / 100);
        }

        function getDynamicEconomyPrice(basePrice, category, itemKey, rarity) {
            const base = Math.max(1, Math.floor(Number(basePrice) || 1));
            const rarityMult = rarity === 'rare' ? 1.12 : rarity === 'legendary' ? 1.22 : 1;
            const globalMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.shopPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.shopPriceMultiplier
                : 1;
            const dynamic = base * getEconomyCategoryMultiplier(category) * getEconomyVolatility(itemKey) * rarityMult * globalMult;
            return Math.max(1, Math.round(dynamic));
        }

        function getEconomyPriceContext() {
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const seasonLabel = SEASONS[season] ? `${SEASONS[season].icon} ${SEASONS[season].name}` : season;
            const weatherLabel = WEATHER_TYPES[weather] ? `${WEATHER_TYPES[weather].icon} ${WEATHER_TYPES[weather].name}` : weather;
            return `${seasonLabel} · ${weatherLabel}`;
        }

        function getEconomyItemCount(category, itemId) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return 0;
            return Math.max(0, Math.floor(eco.inventory[category][itemId] || 0));
        }

        function addEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) eco.inventory[category] = {};
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            eco.inventory[category][itemId] = (eco.inventory[category][itemId] || 0) + qty;
            return eco.inventory[category][itemId];
        }

        function consumeEconomyInventoryItem(category, itemId, count) {
            const eco = ensureEconomyState();
            if (!eco.inventory[category]) return false;
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            const current = eco.inventory[category][itemId] || 0;
            if (current < qty) return false;
            eco.inventory[category][itemId] = current - qty;
            if (eco.inventory[category][itemId] <= 0) delete eco.inventory[category][itemId];
            return true;
        }

        function getSeedInventoryCount(cropId) {
            const eco = ensureEconomyState();
            return Math.max(0, Math.floor((eco.inventory.seeds && eco.inventory.seeds[cropId]) || 0));
        }

        function consumeSeedForCrop(cropId, count) {
            return consumeEconomyInventoryItem('seeds', cropId, count || 1);
        }

        function getShopItemData(category, itemId) {
            if (!ECONOMY_SHOP_ITEMS[category]) return null;
            return ECONOMY_SHOP_ITEMS[category][itemId] || null;
        }

        function getCraftedItemData(itemId) {
            return CRAFTED_ITEMS[itemId] || null;
        }

        function getShopItemPrice(category, itemId) {
            const item = getShopItemData(category, itemId);
            if (!item) return 0;
            return getDynamicEconomyPrice(item.basePrice, category, `${category}:${itemId}`, item.rarity);
        }

        function getMysteryEggPrice() {
            const base = getDynamicEconomyPrice(120, 'mysteryEgg', 'mysteryEgg', 'rare');
            const mult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.mysteryEggPriceMultiplier === 'number')
                ? ECONOMY_BALANCE.mysteryEggPriceMultiplier
                : 1;
            return Math.max(1, Math.round(base * mult));
        }

        function grantAccessoryToActivePet(accessoryId) {
            const pet = gameState.pet;
            if (!pet || !ACCESSORIES[accessoryId]) return false;
            if (!Array.isArray(pet.unlockedAccessories)) pet.unlockedAccessories = [];
            if (!pet.unlockedAccessories.includes(accessoryId)) {
                pet.unlockedAccessories.push(accessoryId);
                return true;
            }
            return false;
        }

        function applyDecorationToCurrentRoom(decorationId) {
            if (!FURNITURE.decorations[decorationId]) return false;
            const room = gameState.currentRoom || 'bedroom';
            const validRooms = ROOM_IDS;
            const targetRoom = validRooms.includes(room) ? room : 'bedroom';
            if (!gameState.furniture[targetRoom]) gameState.furniture[targetRoom] = {};
            gameState.furniture[targetRoom].decoration = decorationId;
            return true;
        }

        function buyPetShopItem(category, itemId, amount) {
            const item = getShopItemData(category, itemId);
            if (!item) return { ok: false, reason: 'invalid-item' };
            // Rec 10: Check seasonal availability
            if (typeof isShopItemAvailable === 'function' && !isShopItemAvailable(itemId)) {
                return { ok: false, reason: 'out-of-season' };
            }
            const qty = Math.max(1, Math.floor(Number(amount) || 1));
            const unitPrice = getShopItemPrice(category, itemId);
            const totalPrice = unitPrice * qty;
            const spend = spendCoins(totalPrice, 'Shop', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: totalPrice, balance: spend.balance };

            if (category === 'seeds') {
                const cropId = item.cropId;
                addEconomyInventoryItem('seeds', cropId, (item.quantity || 1) * qty);
            } else if (category === 'accessories') {
                for (let i = 0; i < qty; i++) {
                    const unlocked = grantAccessoryToActivePet(item.accessoryId);
                    if (!unlocked) {
                        addEconomyInventoryItem('accessories', item.accessoryId, 1);
                    }
                }
            } else if (category === 'decorations') {
                addEconomyInventoryItem('decorations', item.decorationId, qty);
            } else if (category === 'food' || category === 'toys' || category === 'medicine') {
                addEconomyInventoryItem(category, itemId, qty);
            } else {
                addEconomyInventoryItem(category, itemId, qty);
            }

            saveGame();
            return { ok: true, item, quantity: qty, totalPrice, balance: getCoinBalance() };
        }

        function applyStatEffectsToPet(effects) {
            const pet = gameState.pet;
            if (!pet) return null;
            const before = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            const keys = ['hunger', 'cleanliness', 'happiness', 'energy'];
            keys.forEach((key) => {
                const delta = Number((effects && effects[key]) || 0);
                if (!Number.isFinite(delta) || delta === 0) return;
                pet[key] = clamp(pet[key] + delta, 0, 100);
            });
            const after = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            return {
                hunger: after.hunger - before.hunger,
                cleanliness: after.cleanliness - before.cleanliness,
                happiness: after.happiness - before.happiness,
                energy: after.energy - before.energy
            };
        }

        // Rec 5: Item durability tracking for toys and accessories
        function getItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            return gameState._itemDurability[key] || null;
        }

        function initItemDurability(category, itemId) {
            if (!gameState._itemDurability) gameState._itemDurability = {};
            const key = `${category}:${itemId}`;
            if (gameState._itemDurability[key] && gameState._itemDurability[key].current > 0) return gameState._itemDurability[key];
            let maxDur = 0;
            if (category === 'toys') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.toyDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.toyDurabilityMax : 10;
            } else if (category === 'accessories') {
                maxDur = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.accessoryDurabilityMax === 'number')
                    ? ECONOMY_BALANCE.accessoryDurabilityMax : 15;
            }
            if (maxDur <= 0) return null;
            gameState._itemDurability[key] = { current: maxDur, max: maxDur };
            return gameState._itemDurability[key];
        }

        function degradeItemDurability(category, itemId) {
            const dur = getItemDurability(category, itemId);
            if (!dur) return null;
            dur.current = Math.max(0, dur.current - 1);
            return dur;
        }

        function repairItem(category, itemId) {
            if (!gameState._itemDurability) return { ok: false, reason: 'no-durability-data' };
            const key = `${category}:${itemId}`;
            const dur = gameState._itemDurability[key];
            if (!dur) return { ok: false, reason: 'no-durability-data' };
            if (dur.current >= dur.max) return { ok: false, reason: 'already-full' };
            const baseCost = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.durabilityRepairCostBase === 'number')
                ? ECONOMY_BALANCE.durabilityRepairCostBase : 8;
            const missing = dur.max - dur.current;
            const cost = Math.max(1, Math.floor(baseCost * missing * 0.6));
            const spend = spendCoins(cost, 'Repair', true);
            if (!spend.ok) return { ok: false, reason: 'insufficient-funds', needed: cost, balance: spend.balance };
            dur.current = dur.max;
            saveGame();
            return { ok: true, cost, durability: dur };
        }

        function useOwnedEconomyItem(category, itemId) {
            if (!gameState.pet) return { ok: false, reason: 'no-pet' };
            const isCrafted = category === 'crafted';
            const def = isCrafted ? getCraftedItemData(itemId) : getShopItemData(category, itemId);
            if (!def) return { ok: false, reason: 'invalid-item' };
            const sourceCategory = isCrafted ? 'crafted' : category;
            const sourceId = category === 'decorations'
                ? def.decorationId
                : category === 'accessories'
                    ? def.accessoryId
                    : itemId;

            // Rec 5: Durability system for toys and accessories
            const hasDurability = (category === 'toys' || (isCrafted && def.category === 'toys'));
            if (hasDurability) {
                const dur = initItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0) {
                    return { ok: false, reason: 'broken', durability: dur };
                }
            }

            if (!consumeEconomyInventoryItem(sourceCategory, sourceId, 1)) {
                return { ok: false, reason: 'not-owned' };
            }

            if ((category === 'food' || (isCrafted && def.category === 'food')) && typeof gameState.totalFeedCount === 'number') {
                gameState.totalFeedCount++;
            }
            if (category === 'medicine' || (isCrafted && def.category === 'medicine')) {
                gameState.totalMedicineUses = (gameState.totalMedicineUses || 0) + 1;
            }

            let deltas = null;
            if (def.effects) {
                deltas = applyStatEffectsToPet(def.effects);
                if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
                gameState.pet.careActions++;
            } else if (category === 'accessories') {
                grantAccessoryToActivePet(def.accessoryId || itemId);
                // Init durability for newly equipped accessories
                initItemDurability('accessories', def.accessoryId || itemId);
            } else if (category === 'decorations') {
                applyDecorationToCurrentRoom(def.decorationId || itemId);
            }

            // Rec 5: Degrade durability on use for toys
            if (hasDurability) {
                const dur = degradeItemDurability(category === 'toys' ? 'toys' : 'crafted', sourceId);
                if (dur && dur.current <= 0 && typeof showToast === 'function') {
                    showToast(`${def.emoji || '🧸'} ${def.name} is worn out! Repair it to use again.`, '#FFA726');
                }
                // Re-add item to inventory since toys with durability aren't single-use
                addEconomyInventoryItem(sourceCategory, sourceId, 1);
            }

            saveGame();
            return { ok: true, def, deltas };
        }

        // Rec 6: Prestige purchase system — high-value late-game sinks
        function getPrestigePurchases() {
            if (typeof PRESTIGE_PURCHASES === 'undefined') return {};
            return PRESTIGE_PURCHASES;
        }

        function getOwnedPrestige() {
            if (!gameState._prestigeOwned) gameState._prestigeOwned = {};
            return gameState._prestigeOwned;
        }

        function hasPrestigePurchase(purchaseId) {
            const owned = getOwnedPrestige();
            return !!owned[purchaseId];
        }

        function hasPrestigeCompletionProgress() {
            const owned = getOwnedPrestige();
            const anyPrestigePurchase = Object.values(owned || {}).some((count) => Math.max(0, Math.floor(Number(count) || 0)) > 0);
            if (anyPrestigePurchase) return true;
            const streakPrestige = (((gameState || {}).streak || {}).prestige) || {};
            return Math.max(0, Math.floor(Number(streakPrestige.completedCycles) || 0)) > 0;
        }

        function getRecurringPrestigeSinkConfig() {
            const cfg = getHardeningCfg('recurringSinks', {}) || {};
            return {
                enabled: cfg.enabled !== false,
                requirePrestige: cfg.requirePrestige !== false,
                roomUpkeepBase: Math.max(0, Math.floor(Number(cfg.roomUpkeepBase) || 6)),
                roomUpkeepPerDecoratedRoom: Math.max(0, Math.floor(Number(cfg.roomUpkeepPerDecoratedRoom) || 2)),
                breedingPermitPerEgg: Math.max(0, Math.floor(Number(cfg.breedingPermitPerEgg) || 4)),
                auctionListingUpkeepPerActiveListing: Math.max(0, Math.floor(Number(cfg.auctionListingUpkeepPerActiveListing) || 2)),
                maxDailyTotal: Math.max(0, Math.floor(Number(cfg.maxDailyTotal) || 36))
            };
        }

        function countDecoratedRoomsForUpkeep() {
            const furniture = (gameState && gameState.furniture && typeof gameState.furniture === 'object') ? gameState.furniture : {};
            let count = 0;
            Object.keys(furniture).forEach((roomId) => {
                const room = furniture[roomId];
                if (!room || typeof room !== 'object') return;
                if ((room.bed && room.bed !== 'basic') || (room.decoration && room.decoration !== 'none')) count++;
            });
            return count;
        }

        function countOwnedActiveAuctionListingsForUpkeep() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            markExpiredAuctionListings(data);
            const playerId = eco.playerId || '';
            return (data.listings || []).filter((listing) => {
                if (!listing || listing.status === 'expired') return false;
                const sellerIdentity = listing.sellerProfileId || listing.sellerPlayerId || '';
                return !!playerId && sellerIdentity === playerId;
            }).length;
        }

        function applyRecurringPrestigeSinks(targetState) {
            const state = targetState || gameState;
            const eco = ensureEconomyState(state);
            const cfg = getRecurringPrestigeSinkConfig();
            if (!cfg.enabled) return { applied: false, reason: 'disabled', totalCharged: 0, debtAdded: 0 };
            if (cfg.requirePrestige && !hasPrestigeCompletionProgress()) return { applied: false, reason: 'not-prestige', totalCharged: 0, debtAdded: 0 };
            const dayKey = getHardenedEconomyDayKey(state);
            if (eco.recurringSinks.lastAppliedDayKey === dayKey) {
                return { applied: false, reason: 'already-applied', totalCharged: 0, debtAdded: 0, breakdown: eco.recurringSinks.lastBreakdown || null };
            }
            const decoratedRooms = countDecoratedRoomsForUpkeep();
            const breedingEggs = Array.isArray(state.breedingEggs) ? state.breedingEggs.length : 0;
            const auctionListings = countOwnedActiveAuctionListingsForUpkeep();
            const roomUpkeep = cfg.roomUpkeepBase + (decoratedRooms * cfg.roomUpkeepPerDecoratedRoom);
            const breedingPermit = breedingEggs * cfg.breedingPermitPerEgg;
            const auctionUpkeep = auctionListings * cfg.auctionListingUpkeepPerActiveListing;
            let total = Math.max(0, roomUpkeep + breedingPermit + auctionUpkeep);
            if (cfg.maxDailyTotal > 0) total = Math.min(total, cfg.maxDailyTotal);
            const paid = Math.min(Math.max(0, eco.coins), total);
            const debtAdded = Math.max(0, total - paid);
            if (paid > 0) {
                eco.coins -= paid;
                eco.totalSpent = (eco.totalSpent || 0) + paid;
            }
            if (debtAdded > 0) eco.recurringSinks.unpaidDebt = Math.max(0, Math.floor(Number(eco.recurringSinks.unpaidDebt) || 0)) + debtAdded;
            const breakdown = {
                dayKey,
                roomUpkeep,
                decoratedRooms,
                breedingPermit,
                breedingEggs,
                auctionUpkeep,
                auctionListings,
                total,
                paid,
                debtAdded,
                appliedAt: getHardenedEconomyNowMs(state)
            };
            eco.recurringSinks.lastAppliedDayKey = dayKey;
            eco.recurringSinks.lastChargeTotal = total;
            eco.recurringSinks.lastBreakdown = breakdown;
            if (total > 0 && typeof showToast === 'function') {
                const debtText = debtAdded > 0 ? ` (${debtAdded} deferred)` : '';
                showToast(`🧾 Prestige upkeep: -${paid}/${total} coins${debtText}`, '#90A4AE');
            }
            return { applied: true, totalCharged: paid, debtAdded, breakdown };
        }

        function buyPrestigePurchase(purchaseId) {
            const purchases = getPrestigePurchases();
            const item = purchases[purchaseId];
            if (!item) return { ok: false, reason: 'invalid-prestige' };
            const owned = getOwnedPrestige();
            if (owned[purchaseId] && (owned[purchaseId] >= (item.maxOwned || 1))) {
                return { ok: false, reason: 'already-owned' };
            }
            const spend = spendCoins(item.cost, 'Prestige', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: item.cost, balance: spend.balance };
            owned[purchaseId] = (owned[purchaseId] || 0) + 1;
            gameState._prestigeOwned = owned;
            saveGame();
            return { ok: true, item, balance: getCoinBalance() };
        }

        // Rec 11: Coin decay system — daily tax on hoarded coins above threshold
	        function applyCoinDecay() {
	            const eco = ensureEconomyState();
	            const threshold = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayThreshold === 'number')
	                ? ECONOMY_BALANCE.coinDecayThreshold : 1000;
	            const rate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.coinDecayRate === 'number')
	                ? ECONOMY_BALANCE.coinDecayRate : 0.005;
	            const protectedWallet = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayProtectedWallet))
	                ? Math.max(0, Math.floor(ECONOMY_BALANCE.coinDecayProtectedWallet))
	                : Math.floor(threshold * 0.45);
	            const decayFloor = Math.max(threshold, protectedWallet);
	            if (eco.coins <= decayFloor) {
	                applyWealthPressureFee();
                applyRecurringPrestigeSinks();
	                return 0;
	            }
	            const previousChecklist = gameState.dailyChecklist || null;
	            const progress = previousChecklist && previousChecklist.progress ? previousChecklist.progress : {};
	            const engagedActions = Math.max(0,
	                Math.floor(progress.feedCount || 0) +
	                Math.floor(progress.totalCareActions || 0) +
	                Math.floor(progress.minigameCount || 0) +
	                Math.floor(progress.harvestCount || 0) +
	                Math.floor(progress.expeditionCount || 0)
	            );
	            const completedDaily = !!(previousChecklist && Array.isArray(previousChecklist.tasks) && previousChecklist.tasks.length > 0 && previousChecklist.tasks.every((task) => task.done));
	            let finalRate = rate;
	            if (completedDaily) {
	                const dailyReduction = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayDailyCompleteReduction))
	                    ? ECONOMY_BALANCE.coinDecayDailyCompleteReduction
	                    : 0.4;
	                finalRate *= Math.max(0.1, Math.min(1, dailyReduction));
	            } else if (engagedActions >= 8) {
	                const engagedReduction = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayEngagedReduction))
	                    ? ECONOMY_BALANCE.coinDecayEngagedReduction
	                    : 0.65;
	                finalRate *= Math.max(0.1, Math.min(1, engagedReduction));
	            }
	            const excess = eco.coins - decayFloor;
	            const minTax = (typeof ECONOMY_BALANCE !== 'undefined' && Number.isFinite(ECONOMY_BALANCE.coinDecayMinTax))
	                ? Math.max(1, Math.floor(ECONOMY_BALANCE.coinDecayMinTax))
	                : 1;
	            const tax = Math.max(minTax, Math.floor(excess * finalRate));
	            eco.coins -= tax;
	            eco.totalSpent = (eco.totalSpent || 0) + tax;
	            if (typeof showToast === 'function') {
	                const engagedText = completedDaily ? 'daily complete bonus applied' : (engagedActions >= 8 ? 'active day reduction applied' : null);
	                showToast(`🏦 Coin maintenance: -${tax} coins${engagedText ? ` (${engagedText})` : ''}`, '#90A4AE');
	            }
	            applyWealthPressureFee();
            applyRecurringPrestigeSinks();
	            return tax;
	        }

        // Rec 10: Check if a shop item is available in the current season
        function isShopItemAvailable(itemId) {
            if (typeof SEASONAL_SHOP_AVAILABILITY === 'undefined') return true;
            const seasons = SEASONAL_SHOP_AVAILABILITY[itemId];
            if (!seasons) return true; // Not in the rotation table = always available
            const currentSeason = gameState.season || (typeof getCurrentSeason === 'function' ? getCurrentSeason() : 'spring');
            return seasons.includes(currentSeason);
        }

        const LOOT_SELL_VALUE_BANDS = {
            // Same-rarity items can vary modestly in base sell value to reduce value compression.
            ancientCoin: 0.92,
            shell: 0.88,
            shinyPebble: 0.95,
            emberStone: 1.06,
            stardust: 1.12,
            runeFragment: 1.08,
            mysteryMap: 1.04,
            tidePearl: 0.98
        };

        function getLootSellBasePrice(lootId) {
            const loot = EXPLORATION_LOOT[lootId];
            if (!loot) return 0;
            const rarity = loot.rarity || 'common';
            const rarityBase = (rarity === 'rare') ? 34 : (rarity === 'uncommon' ? 18 : 10);
            const bandMult = Math.max(0.7, Math.min(1.35, Number(LOOT_SELL_VALUE_BANDS[lootId]) || 1));
            return Math.max(1, Math.round(rarityBase * bandMult));
        }

	        function getLootSellPrice(lootIdOrStack, options) {
	            let lootId = lootIdOrStack;
	            let opts = options && typeof options === 'object' ? Object.assign({}, options) : null;
	            if (lootIdOrStack && typeof lootIdOrStack === 'object') {
	                if (lootIdOrStack.id) lootId = lootIdOrStack.id;
	                else if (lootIdOrStack.lootId) lootId = lootIdOrStack.lootId;
	                if (!opts) opts = {};
	                if (lootIdOrStack.meta && typeof lootIdOrStack.meta === 'object') {
	                    opts = Object.assign({}, lootIdOrStack.meta, opts);
	                }
	            }
	            const base = getLootSellBasePrice(lootId);
	            if (!base) return 0;
	            const sellMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.sellPriceMultiplier === 'number')
	                ? ECONOMY_BALANCE.sellPriceMultiplier
	                : 0.8;
	            const expeditionSellMult = (opts && opts.source === 'expedition')
	                ? ((typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.expeditionSellPriceMultiplier === 'number')
	                    ? ECONOMY_BALANCE.expeditionSellPriceMultiplier
	                    : 0.78)
	                : 1;
	            // Recommendation #7: Mastery biome rank loot sell bonus (+5% for biome rank 3+)
	            // Determine which biome this loot is associated with
	            let biomeSellBonus = 0;
            if (typeof getMasteryLootSellBonus === 'function' && typeof BIOME_LOOT_POOLS !== 'undefined') {
                for (const [biomeId, pool] of Object.entries(BIOME_LOOT_POOLS)) {
                    if (Array.isArray(pool) && pool.includes(lootId)) {
                        biomeSellBonus = Math.max(biomeSellBonus, getMasteryLootSellBonus(biomeId));
	                    }
	                }
	            }
	            const wealthDebtPenaltyMult = getWealthPressureDebtPenaltyMultiplier();
	            const suspiciousPenaltyMult = (isSuspiciousEconomyState() && !(opts && opts.skipSecurityPenalty))
	                ? getSuspiciousRewardMultiplier()
	                : 1;
	            return Math.max(1, Math.round(
	                getDynamicEconomyPrice(base, 'loot', `loot:${lootId}`)
	                * sellMult
	                * expeditionSellMult
	                * (1 + biomeSellBonus)
	                * wealthDebtPenaltyMult
	                * suspiciousPenaltyMult
	            ));
	        }

	        function sellExplorationLoot(lootId, count) {
	            const ex = ensureExplorationState();
	            if (typeof ensureLootInventoryStacks === 'function') ensureLootInventoryStacks(ex);
	            const current = Math.max(0, Math.floor((ex.lootInventory && ex.lootInventory[lootId]) || 0));
	            const qty = Math.max(1, Math.floor(Number(count) || 1));
	            if (current < qty) return { ok: false, reason: 'not-enough-loot' };
	            const stacks = Array.isArray(ex.lootInventoryStacks && ex.lootInventoryStacks[lootId]) ? ex.lootInventoryStacks[lootId] : [];
	            let remaining = qty;
	            let grossTotal = 0;
	            let weightedPriceSum = 0;
	            const soldBreakdown = [];
	            if (stacks.length > 0) {
	                while (remaining > 0 && stacks.length > 0) {
	                    const stack = stacks[0];
	                    const stackQty = Math.max(0, Math.floor(Number((stack || {}).qty) || 0));
	                    if (stackQty <= 0) {
	                        stacks.shift();
	                        continue;
	                    }
	                    const take = Math.min(remaining, stackQty);
	                    const priceEach = getLootSellPrice({ id: lootId, meta: (stack && stack.meta) || {} });
	                    if (priceEach <= 0) return { ok: false, reason: 'invalid-loot' };
	                    grossTotal += priceEach * take;
	                    weightedPriceSum += priceEach * take;
	                    soldBreakdown.push({ qty: take, priceEach, source: ((((stack || {}).meta) || {}).source || 'generic') });
	                    stack.qty = stackQty - take;
	                    if (stack.qty <= 0) stacks.shift();
	                    remaining -= take;
	                }
	                if (remaining > 0) {
	                    if (typeof ensureLootInventoryStacks === 'function') ensureLootInventoryStacks(ex);
	                    return { ok: false, reason: 'loot-stack-sync-error' };
	                }
	            } else {
	                const priceEach = getLootSellPrice(lootId);
	                if (priceEach <= 0) return { ok: false, reason: 'invalid-loot' };
	                grossTotal = priceEach * qty;
	                weightedPriceSum = priceEach * qty;
	            }
	            ex.lootInventory[lootId] = current - qty;
	            if (ex.lootInventory[lootId] <= 0) {
	                delete ex.lootInventory[lootId];
	                if (ex.lootInventoryStacks) delete ex.lootInventoryStacks[lootId];
	            }
	            const credited = addCoins(grossTotal, 'Loot Sold', true);
	            if (credited < grossTotal && typeof showToast === 'function') {
	                showToast('Loot sale payout was reduced by economy safeguards.', '#90A4AE');
	            }
	            saveGame();
	            return {
	                ok: true,
	                loot: EXPLORATION_LOOT[lootId],
	                quantity: qty,
	                total: credited,
	                grossTotal,
	                priceEach: qty > 0 ? Math.round(weightedPriceSum / qty) : 0,
	                breakdown: soldBreakdown
	            };
	        }

        function getOwnedEconomySnapshot() {
            ensureEconomyState();
            ensureExplorationState();
            const eco = gameState.economy;
            const ex = gameState.exploration;
            return {
                coins: eco.coins || 0,
                inventory: {
                    food: Object.assign({}, eco.inventory.food || {}),
                    toys: Object.assign({}, eco.inventory.toys || {}),
                    medicine: Object.assign({}, eco.inventory.medicine || {}),
                    seeds: Object.assign({}, eco.inventory.seeds || {}),
                    decorations: Object.assign({}, eco.inventory.decorations || {}),
                    accessories: Object.assign({}, eco.inventory.accessories || {}),
                    crafted: Object.assign({}, eco.inventory.crafted || {})
                },
                loot: Object.assign({}, ex.lootInventory || {}),
                crops: Object.assign({}, (gameState.garden && gameState.garden.inventory) || {})
            };
        }

        function refreshRareMarketplace(forceRefresh) {
            const eco = ensureEconomyState();
            const season = gameState.season || getCurrentSeason();
            const weather = gameState.weather || 'sunny';
            const day = getHardenedEconomyDayKey();
            const key = `${day}:${season}:${weather}`;
            const rareState = eco.market.rare || (eco.market.rare = { marketDayKey: '', generatedForDay: false, offers: [], lastTrustedDayKey: day });
            if (!Array.isArray(rareState.offers)) rareState.offers = [];
            if (typeof rareState.generatedForDay !== 'boolean') rareState.generatedForDay = false;
            if (typeof rareState.marketDayKey !== 'string') rareState.marketDayKey = '';
            rareState.lastTrustedDayKey = String(day || rareState.lastTrustedDayKey || '');

            if (!forceRefresh && rareState.marketDayKey === key && rareState.generatedForDay) {
                eco.market.dayKey = key;
                eco.market.stock = rareState.offers.filter((offer) => offer && offer.purchased !== true);
                return eco.market.stock;
            }

            const rand = createSeededRng(hashStringToUint(`market:${key}`));
            const pool = [...ECONOMY_RARE_MARKET_POOL];
            const picks = [];
            const count = Math.min(4, pool.length);
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(rand() * pool.length);
                picks.push(pool.splice(idx, 1)[0]);
            }
            const generatedOffers = picks.map((entry, idx) => {
                const categoryMap = {
                    food: 'food',
                    toys: 'toys',
                    medicine: 'medicine',
                    accessory: 'accessories',
                    seed: 'seeds',
                    decoration: 'decorations',
                    loot: 'loot'
                };
                const category = categoryMap[entry.kind] || entry.kind;
                const rareMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.rareMarketPriceMultiplier === 'number')
                    ? ECONOMY_BALANCE.rareMarketPriceMultiplier
                    : 1;
                const price = Math.max(1, Math.round(getDynamicEconomyPrice(entry.basePrice, category, `rare:${entry.id}`, entry.rarity || 'rare') * rareMult));
                return {
                    offerId: `${key}:${idx}:${entry.id}`,
                    itemRef: entry.id,
                    kind: entry.kind,
                    itemId: entry.itemId,
                    quantity: entry.quantity || 1,
                    price,
                    purchased: false
                };
            });
            rareState.marketDayKey = key;
            rareState.generatedForDay = true;
            rareState.offers = generatedOffers;
            eco.market.stock = generatedOffers.filter((offer) => offer && offer.purchased !== true);
            eco.market.dayKey = key;
            saveGame();
            return eco.market.stock;
        }

        function getRareMarketplaceStock() {
            refreshRareMarketplace(false);
            const eco = ensureEconomyState();
            const offers = (((eco.market || {}).rare || {}).offers) || [];
            return offers.filter((offer) => offer && offer.purchased !== true).map((offer) => Object.assign({}, offer));
        }

        function buyRareMarketOffer(offerId) {
            const eco = ensureEconomyState();
            refreshRareMarketplace(false);
            const rareState = eco.market.rare || { offers: [] };
            const offers = Array.isArray(rareState.offers) ? rareState.offers : [];
            const idx = offers.findIndex((offer) => offer && offer.offerId === offerId && offer.purchased !== true);
            if (idx === -1) return { ok: false, reason: 'offer-missing' };
            const offer = offers[idx];
            const spend = spendCoins(offer.price, 'Rare Market', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: offer.price, balance: spend.balance };

            let itemLabel = '';
            let itemEmoji = '🎁';
            if (offer.kind === 'loot') {
                addLootToInventory(offer.itemId, offer.quantity || 1);
                const loot = EXPLORATION_LOOT[offer.itemId];
                itemLabel = loot ? loot.name : offer.itemId;
                itemEmoji = loot ? loot.emoji : itemEmoji;
            } else if (offer.kind === 'food' || offer.kind === 'toys' || offer.kind === 'medicine') {
                addEconomyInventoryItem(offer.kind, offer.itemId, offer.quantity || 1);
                const item = getShopItemData(offer.kind, offer.itemId);
                itemLabel = item ? item.name : offer.itemId;
                itemEmoji = item ? item.emoji : itemEmoji;
            } else if (offer.kind === 'seed') {
                const seedDef = getShopItemData('seeds', offer.itemId);
                const cropId = seedDef ? seedDef.cropId : offer.itemId;
                addEconomyInventoryItem('seeds', cropId, offer.quantity || 1);
                itemLabel = seedDef ? seedDef.name : `${cropId} seeds`;
                itemEmoji = seedDef ? seedDef.emoji : '🌱';
            } else if (offer.kind === 'accessory') {
                const item = getShopItemData('accessories', offer.itemId);
                const accessoryId = item ? item.accessoryId : offer.itemId;
                if (!grantAccessoryToActivePet(accessoryId)) {
                    addEconomyInventoryItem('accessories', accessoryId, 1);
                }
                itemLabel = item ? item.name : accessoryId;
                itemEmoji = item ? item.emoji : '🎀';
            } else if (offer.kind === 'decoration') {
                const item = getShopItemData('decorations', offer.itemId);
                const decorationId = item ? item.decorationId : offer.itemId;
                addEconomyInventoryItem('decorations', decorationId, offer.quantity || 1);
                itemLabel = item ? item.name : decorationId;
                itemEmoji = item ? item.emoji : '🛋️';
            }

            offers[idx].purchased = true;
            eco.market.stock = offers.filter((row) => row && row.purchased !== true);
            saveGame();
            return { ok: true, offer, itemLabel, itemEmoji, balance: eco.coins };
        }

        function getIngredientCount(source, id) {
            ensureEconomyState();
            ensureExplorationState();
            if (source === 'crop') {
                return Math.max(0, Math.floor(((gameState.garden && gameState.garden.inventory && gameState.garden.inventory[id]) || 0)));
            }
            if (source === 'loot') {
                return Math.max(0, Math.floor(((gameState.exploration && gameState.exploration.lootInventory && gameState.exploration.lootInventory[id]) || 0)));
            }
            if (source === 'crafted') {
                return getEconomyItemCount('crafted', id);
            }
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    const c = getEconomyItemCount(cat, id);
                    if (c > 0) return c;
                }
            }
            return 0;
        }

        function consumeIngredient(source, id, count) {
            const qty = Math.max(1, Math.floor(Number(count) || 1));
            if (source === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'loot') {
                const inv = gameState.exploration && gameState.exploration.lootInventory;
                if (!inv || (inv[id] || 0) < qty) return false;
                inv[id] -= qty;
                if (inv[id] <= 0) delete inv[id];
                return true;
            }
            if (source === 'crafted') return consumeEconomyInventoryItem('crafted', id, qty);
            if (source === 'shop') {
                const categories = ['food', 'toys', 'medicine', 'seeds'];
                for (const cat of categories) {
                    if (consumeEconomyInventoryItem(cat, id, qty)) return true;
                }
            }
            return false;
        }

        function getCraftingRecipeStates() {
            ensureEconomyState();
            return Object.values(CRAFTING_RECIPES).map((recipe) => {
                const ingredientStatus = (recipe.ingredients || []).map((ing) => {
                    const owned = getIngredientCount(ing.source, ing.id);
                    return Object.assign({}, ing, { owned, missing: Math.max(0, ing.count - owned) });
                });
                const canCraftIngredients = ingredientStatus.every((ing) => ing.missing <= 0);
                const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
                const canCraft = canCraftIngredients && getCoinBalance() >= cost;
                return Object.assign({}, recipe, { ingredientStatus, canCraft, craftCost: cost });
            });
        }

        function craftRecipe(recipeId) {
            const recipe = CRAFTING_RECIPES[recipeId];
            if (!recipe) return { ok: false, reason: 'invalid-recipe' };
            const cost = Math.max(0, Math.floor(Number(recipe.craftCost) || 0));
            for (const ing of (recipe.ingredients || [])) {
                if (getIngredientCount(ing.source, ing.id) < ing.count) {
                    return { ok: false, reason: 'missing-ingredients' };
                }
            }
            // P1-23: Validate coin balance before touching any ingredients; then
            // consume ingredients first and deduct coins last so a partial failure
            // cannot silently drop coins without any rollback.
            if (cost > 0 && (ensureEconomyState().coins || 0) < cost) {
                return { ok: false, reason: 'insufficient-funds', needed: cost, balance: ensureEconomyState().coins || 0 };
            }

            for (const ing of (recipe.ingredients || [])) {
                consumeIngredient(ing.source, ing.id, ing.count);
            }

            const spend = spendCoins(cost, 'Crafting', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: cost, balance: spend.balance };

            let craftedLabel = recipe.name;
            let craftedEmoji = recipe.emoji || '🛠️';
            if (recipe.outputType === 'crafted') {
                const def = getCraftedItemData(recipe.outputId);
                const itemKey = def ? def.id : recipe.outputId;
                addEconomyInventoryItem('crafted', itemKey, recipe.outputCount || 1);
                if (def) {
                    craftedLabel = def.name;
                    craftedEmoji = def.emoji;
                }
            } else if (recipe.outputType === 'accessory') {
                if (!grantAccessoryToActivePet(recipe.outputId)) {
                    addEconomyInventoryItem('accessories', recipe.outputId, recipe.outputCount || 1);
                }
                const acc = ACCESSORIES[recipe.outputId];
                if (acc) {
                    craftedLabel = acc.name;
                    craftedEmoji = acc.emoji;
                }
            }

            saveGame();
            return { ok: true, recipe, craftedLabel, craftedEmoji };
        }

        function getMinigameTaskTrackLabel(trackKey) {
            const labels = {
                expeditionCount: 'expedition',
                battleCount: 'arena battle',
                harvestCount: 'harvest',
                parkVisits: 'park visit'
            };
            return labels[trackKey] || 'activity';
        }

        function getMinigameDiminishingRedirectHint() {
            const supportedTracks = new Set(['expeditionCount', 'battleCount', 'harvestCount']);
            if (typeof initDailyChecklist === 'function') {
                try {
                    const checklist = initDailyChecklist();
                    const progress = (checklist && checklist.progress) || {};
                    const tasks = Array.isArray(checklist && checklist.tasks) ? checklist.tasks : [];
                    const pending = tasks.filter((task) => task && !task.done && supportedTracks.has(task.trackKey));
                    pending.sort((a, b) => {
                        const aTarget = Math.max(1, Number(a.target) || 1);
                        const bTarget = Math.max(1, Number(b.target) || 1);
                        const aProg = Math.min(aTarget, Number(progress[a.trackKey]) || 0);
                        const bProg = Math.min(bTarget, Number(progress[b.trackKey]) || 0);
                        const aRatio = aProg / aTarget;
                        const bRatio = bProg / bTarget;
                        return aRatio - bRatio;
                    });
                    const next = pending[0];
                    if (next) {
                        const target = Math.max(1, Number(next.target) || 1);
                        const done = Math.min(target, Number(progress[next.trackKey]) || 0);
                        return {
                            short: `Try ${getMinigameTaskTrackLabel(next.trackKey)} (${done}/${target})`,
                            detail: `Daily task: ${next.name} (${done}/${target})`
                        };
                    }
                } catch (e) {
                    // Do not block rewards on checklist issues.
                }
            }
            if (typeof getGoalLadder === 'function') {
                try {
                    const ladder = getGoalLadder();
                    const next = ladder && ladder.next;
                    if (next && typeof next.label === 'string') {
                        const label = next.label.toLowerCase();
                        if (/(expedition|arena|battle|harvest|garden|competition)/.test(label)) {
                            return {
                                short: 'Check your Goal Ladder',
                                detail: `Goal Ladder next: ${next.label}${next.progress ? ` (${next.progress})` : ''}`
                            };
                        }
                    }
                } catch (e) {
                    // Safe fallback below.
                }
            }
            return {
                short: 'Rotate to expedition, garden, or arena',
                detail: 'Try an expedition, harvest, or arena battle to keep momentum.'
            };
        }

	        function resetMinigameRewardSession(reason) {
	            gameState._sessionMinigameCount = 0;
	            gameState._minigameRewardSession = {
	                startedAt: Date.now(),
	                lastActivityAt: Date.now(),
	                resetReason: reason || 'manual'
	            };
	            return gameState._minigameRewardSession;
	        }

	        function ensureMinigameRewardSession() {
	            const now = Date.now();
	            const idleResetMs = 8 * 60 * 1000;
	            const maxSessionMs = 30 * 60 * 1000;
	            if (!gameState._minigameRewardSession || typeof gameState._minigameRewardSession !== 'object') {
	                resetMinigameRewardSession('init');
	            }
	            const session = gameState._minigameRewardSession;
	            const lastActivityAt = Number(session.lastActivityAt) || 0;
	            const startedAt = Number(session.startedAt) || now;
	            if ((lastActivityAt > 0 && (now - lastActivityAt) > idleResetMs) || (now - startedAt) > maxSessionMs) {
	                resetMinigameRewardSession((now - lastActivityAt) > idleResetMs ? 'idle-timeout' : 'session-max');
	            }
	            gameState._minigameRewardSession.lastActivityAt = now;
	            if (!Number.isFinite(gameState._minigameRewardSession.startedAt)) gameState._minigameRewardSession.startedAt = now;
	            if (typeof gameState._sessionMinigameCount !== 'number') gameState._sessionMinigameCount = 0;
	            return gameState._minigameRewardSession;
	        }

	        function awardMiniGameCoins(gameId, scoreValue) {
            const score = Math.max(0, Number(scoreValue) || 0);
            if (score <= 0) return 0;
            const gameBonus = {
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
            };
            const multiplier = gameBonus[gameId] || 1;
	            const difficulty = typeof getMinigameDifficulty === 'function' ? getMinigameDifficulty(gameId) : 1;
	            const rewardDifficulty = gameId === 'fetch' ? 1 : difficulty;
	            const difficultyRewardMult = Math.max(0.92, Math.min(1.52, 0.96 + ((rewardDifficulty - 1) * 0.52)));
	            const payout = (typeof EconomyCalculations !== 'undefined' && EconomyCalculations && typeof EconomyCalculations.computeMinigameCoinPayout === 'function')
	                ? EconomyCalculations.computeMinigameCoinPayout({
	                    gameId,
	                    score,
	                    difficulty: rewardDifficulty,
	                    economyMultiplier: 1,
	                    petStrength: 0.5,
	                    sessionCount: 1,
	                    cap: Number.POSITIVE_INFINITY,
	                    // Keep helper aligned with live base payout (pre eco/pet/session/streak caps).
	                    mode: 'baseOnly'
	                })
	                : Math.max(3, Math.round((6 + Math.pow(score, 0.52) * 4.3) * multiplier * difficultyRewardMult));
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.minigameRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.minigameRewardMultiplier
                : 1;
            // Keep a slight stat link without heavily penalizing weaker pets.
            const petStrength = getPetMiniGameStrength(gameState.pet);
            const petStatRewardMult = Math.max(0.96, Math.min(1.04, 1 + ((petStrength - 0.5) * 0.08)));

	            // Escalating mini-game session multiplier (resets on explicit session boundaries / idle timeout).
	            ensureMinigameRewardSession();
	            gameState._sessionMinigameCount++;
	            const sessionMult = Math.min(1.15, 1 + (Math.max(0, gameState._sessionMinigameCount - 1) * 0.05));
            const today = typeof getTodayString === 'function' ? getTodayString() : '';
            if (!gameState._dailyMinigameEarnings || gameState._dailyMinigameEarningsDay !== today) {
                gameState._dailyMinigameEarnings = 0;
                gameState._dailyMinigameEarningsDay = today;
                gameState._minigameWinStreak = 0;
            }

            const stage = (gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby';
            const prestigeRunMult = (typeof getPrestigeEffectValue === 'function')
                ? (Number(getPrestigeEffectValue('cosmeticChest', 'minigameCoinMultiplier', 1)) || 1)
                : 1;
            const streakBonusPerRun = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusPerRun) || 0.045);
            const streakBonusMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.streakBonusMax) || 0.38);
            gameState._minigameWinStreak = Math.max(0, Number(gameState._minigameWinStreak) || 0) + 1;
            const streakMult = 1 + Math.min(streakBonusMax, Math.max(0, gameState._minigameWinStreak - 1) * streakBonusPerRun);
            const highSkillThreshold = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillThreshold) || 82);
            const highSkillPerPoint = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillPerPoint) || 0.011);
            const highSkillMax = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.highSkillMaxBonus) || 0.35);
            const highSkillBonus = score >= highSkillThreshold
                ? Math.min(highSkillMax, (score - highSkillThreshold) * highSkillPerPoint)
                : 0;
            const capBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapBase) || 94);
            const capStage = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.perRunCapByStage && MINIGAME_BALANCE.perRunCapByStage[stage]) || capBase);
            const cap = Math.max(3, Math.floor(capStage));
	            const rawTuned = (typeof EconomyCalculations !== 'undefined' && EconomyCalculations && typeof EconomyCalculations.computeMinigameCoinPayout === 'function')
	                ? EconomyCalculations.computeMinigameCoinPayout({
	                    gameId,
	                    score,
	                    difficulty: rewardDifficulty,
	                    economyMultiplier: ecoMult,
	                    petStrength,
	                    sessionCount: Math.max(1, Number(gameState._sessionMinigameCount) || 1),
	                    streakMult,
	                    highSkillBonus,
	                    prestigeMultiplier: prestigeRunMult,
	                    cap: Number.POSITIVE_INFINITY,
	                    diminishingMultiplier: 1
	                })
	                : Math.max(3, Math.round(payout * ecoMult * petStatRewardMult * sessionMult * streakMult * (1 + highSkillBonus) * prestigeRunMult));
            let tuned = Math.max(3, Math.min(cap, rawTuned));
            const perRunCapHit = tuned < rawTuned;

            const stageSoftCapBase = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapBase) || 380);
            const stageSoftCap = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.dailySoftCapByStage && MINIGAME_BALANCE.dailySoftCapByStage[stage]) || stageSoftCapBase);
            const prestigeSoftCap = (typeof getPrestigeEffectValue === 'function')
                ? (Number(getPrestigeEffectValue('cosmeticChest', 'minigameDailySoftCapBonus', 0)) || 0)
                : 0;
            const dailySoftCap = Math.max(50, Math.floor(stageSoftCap + prestigeSoftCap));
            const earnedBefore = Math.max(0, Number(gameState._dailyMinigameEarnings) || 0);
            const overCap = Math.max(0, earnedBefore - dailySoftCap);
            let diminishingMult = 1;
            let inDiminishingRewards = false;
            if (overCap > 0) {
                const falloff = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapFalloffPerCoin) || 0.0042);
                const minMult = Number((MINIGAME_BALANCE && MINIGAME_BALANCE.softCapMinMultiplier) || 0.2);
                diminishingMult = Math.max(minMult, 1 / (1 + (overCap * falloff)));
                tuned = Math.max(1, Math.round(tuned * diminishingMult));
                inDiminishingRewards = true;
            }
            gameState._dailyMinigameEarnings += tuned;

            const redirectHint = inDiminishingRewards ? getMinigameDiminishingRedirectHint() : null;
            gameState._lastMinigameRewardContext = {
                at: Date.now(),
                source: 'minigame',
                gameId,
                score,
                tuned,
                payoutBase: payout,
                perRunCap: cap,
                perRunCapHit,
                dailySoftCap,
                dailyEarnedBefore: earnedBefore,
                dailyEarnedAfter: gameState._dailyMinigameEarnings,
                overCap,
                inDiminishingRewards,
                diminishingMult,
                summaryHint: inDiminishingRewards
                    ? `Diminishing rewards active (${Math.round(diminishingMult * 100)}% payout). ${redirectHint && redirectHint.detail ? redirectHint.detail : 'Rotate to expedition, harvest, or arena.'}`
                    : ''
            };

            if (inDiminishingRewards && typeof showToast === 'function') {
                const now = Date.now();
                if ((now - (Number(gameState._lastMinigameSoftCapToastAt) || 0)) > 45000) {
                    gameState._lastMinigameSoftCapToastAt = now;
                    const redirectText = redirectHint && redirectHint.short ? ` ${redirectHint.short}.` : '';
                    showToast(`🎮 Diminishing rewards active (${Math.round(diminishingMult * 100)}% payout).${redirectText}`, '#90A4AE');
                }
            }

            if (typeof balanceDebugLog === 'function') {
	                balanceDebugLog('MinigameReward', {
                    gameId,
                    score,
	                    difficulty,
	                    rewardDifficulty,
                    payoutBase: payout,
                    tuned,
                    rawTuned,
                    perRunCap: cap,
                    perRunCapHit,
                    dailySoftCap,
                    dailyEarned: gameState._dailyMinigameEarnings,
                    overCap,
                    inDiminishingRewards,
                    diminishingMult,
                    streak: gameState._minigameWinStreak,
                    highSkillBonus
                });
                if (perRunCapHit || inDiminishingRewards) {
                    balanceDebugLog('MinigameCapEncounter', {
                        gameId,
                        perRunCapHit,
                        inDiminishingRewards,
                        perRunCap: cap,
                        dailySoftCap,
                        earnedBefore,
                        earnedAfter: gameState._dailyMinigameEarnings
                    });
                }
	            }

	            addCoins(tuned, 'Mini-game', true);
	            if (typeof claimFirstOfDayModeBonus === 'function') {
	                claimFirstOfDayModeBonus('minigame', 'First Mini-game Bonus');
	            }
	            return tuned;
	        }

        function awardHarvestCoins(cropId) {
            const crop = GARDEN_CROPS[cropId];
            if (!crop) return 0;
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.harvestRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.harvestRewardMultiplier
                : 1;
            const currentSeason = gameState.season || getCurrentSeason();
            const payout = (typeof EconomyCalculations !== 'undefined' && EconomyCalculations && typeof EconomyCalculations.computeHarvestCoinPayout === 'function')
                ? EconomyCalculations.computeHarvestCoinPayout({
                    crop,
                    currentSeason,
                    economyMultiplier: ecoMult
                })
                : Math.max(2, Math.round((3 + Math.round((crop.hungerValue || 0) / 4) + Math.round((crop.happinessValue || 0) / 6) + Math.round((crop.energyValue || 0) / 6)) * ((crop.seasonBonus || []).includes(currentSeason) ? 1.2 : 1.0) * ecoMult));
            addCoins(payout, 'Harvest', true);
            return payout;
        }

        function getPityThresholdValue(key, fallbackValue) {
            const tuning = (typeof PROGRESSION_REWARD_TUNING === 'object' && PROGRESSION_REWARD_TUNING) ? PROGRESSION_REWARD_TUNING : null;
            const pity = tuning && typeof tuning.pity === 'object' ? tuning.pity : null;
            const val = Number(pity && pity[key]);
            return Math.max(1, Math.floor(Number.isFinite(val) ? val : fallbackValue));
        }

        function grantMysteryEggAccessoryReward() {
            const accId = randomFromArray(Object.keys(ACCESSORIES || {}));
            if (!accId || !ACCESSORIES[accId]) return null;
            if (!grantAccessoryToActivePet(accId)) {
                addEconomyInventoryItem('accessories', accId, 1);
            }
            const acc = ACCESSORIES[accId];
            return { type: 'accessory', itemId: accId, label: acc.name, emoji: acc.emoji, rarity: 'rare' };
        }

        function mysteryEggRewardIsRare(reward) {
            if (!reward || typeof reward !== 'object') return false;
            if (reward.type === 'accessory') return true;
            if (reward.type === 'loot' && reward.itemId && EXPLORATION_LOOT[reward.itemId]) {
                return (EXPLORATION_LOOT[reward.itemId].rarity || 'common') === 'rare';
            }
            return reward.rarity === 'rare';
        }

        function openMysteryEgg() {
            const price = getMysteryEggPrice();
            const spend = spendCoins(price, 'Mystery Egg', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: price, balance: spend.balance };
            const eco = ensureEconomyState();
            let reward = null;
            const pityThreshold = getPityThresholdValue('mysteryEggRareMisses', 9);
            const forceRare = Math.max(0, Number((eco.pity || {}).mysteryEggRareMisses) || 0) >= pityThreshold;
            if (forceRare) {
                reward = grantMysteryEggAccessoryReward();
                if (reward) {
                    reward.pityGuaranteed = true;
                } else {
                    const coinReward = 20 + Math.floor(Math.random() * 31);
                    addCoins(coinReward, 'Mystery Egg Bonus', true);
                    reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙', pityGuaranteed: true };
                }
            }
            const roll = reward ? 1 : Math.random();
            if (!reward && roll < 0.2) {
                // Rec 12: Reduced coin range from 40-80 to 20-50 for slightly negative EV
                const coinReward = 20 + Math.floor(Math.random() * 31);
                addCoins(coinReward, 'Mystery Egg Bonus', true);
                reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙' };
            } else if (!reward && roll < 0.45) {
                const foodKeys = Object.keys(ECONOMY_SHOP_ITEMS.food || {});
                const itemId = randomFromArray(foodKeys);
                addEconomyInventoryItem('food', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.food[itemId];
                reward = { type: 'food', itemId, label: item.name, emoji: item.emoji };
            } else if (!reward && roll < 0.63) {
                const toyKeys = Object.keys(ECONOMY_SHOP_ITEMS.toys || {});
                const itemId = randomFromArray(toyKeys);
                addEconomyInventoryItem('toys', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.toys[itemId];
                reward = { type: 'toys', itemId, label: item.name, emoji: item.emoji };
            } else if (!reward && roll < 0.79) {
                const medKeys = Object.keys(ECONOMY_SHOP_ITEMS.medicine || {});
                const itemId = randomFromArray(medKeys);
                addEconomyInventoryItem('medicine', itemId, 1);
                const item = ECONOMY_SHOP_ITEMS.medicine[itemId];
                reward = { type: 'medicine', itemId, label: item.name, emoji: item.emoji };
            } else if (!reward && roll < 0.93) {
                const lootId = randomFromArray(Object.keys(EXPLORATION_LOOT));
                addLootToInventory(lootId, 1);
                const loot = EXPLORATION_LOOT[lootId];
                reward = { type: 'loot', itemId: lootId, label: loot.name, emoji: loot.emoji, rarity: loot.rarity || 'common' };
            } else {
                reward = grantMysteryEggAccessoryReward();
                if (!reward) {
                    const coinReward = 20 + Math.floor(Math.random() * 31);
                    addCoins(coinReward, 'Mystery Egg Bonus', true);
                    reward = { type: 'coins', amount: coinReward, label: `${coinReward} coins`, emoji: '🪙' };
                }
            }
            const rareHit = mysteryEggRewardIsRare(reward);
            if (!eco.pity || typeof eco.pity !== 'object') eco.pity = { mysteryEggRareMisses: 0 };
            eco.pity.mysteryEggRareMisses = rareHit ? 0 : (Math.max(0, Math.floor(Number(eco.pity.mysteryEggRareMisses) || 0)) + 1);
            if (rareHit && reward && reward.pityGuaranteed && typeof recordRewardRecapEvent === 'function') {
                recordRewardRecapEvent('mid', 'Mystery egg pity rare', { itemId: reward.itemId || null });
            }
            eco.mysteryEggsOpened = (eco.mysteryEggsOpened || 0) + 1;
            saveGame();
            return { ok: true, price, reward, balance: eco.coins };
        }

        function getAuctionHouseSnapshot() {
            const eco = ensureEconomyState();
            const data = loadAuctionHouseData();
            if (markExpiredAuctionListings(data)) saveAuctionHouseData(data);
            const slotId = eco.auction.slotId;
            const legacySlotWallet = Math.max(0, Math.floor((data.wallets && data.wallets[slotId]) || 0));
            const profileWallet = Math.max(0, Math.floor((data.profileWallets && data.profileWallets[eco.playerId]) || 0));
            const myWallet = legacySlotWallet + profileWallet;
            const listings = (data.listings || [])
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((listing) => {
                    const label = getAuctionItemLabel(listing.itemType, listing.itemId);
                    const sellerIdentity = listing.sellerProfileId || listing.sellerPlayerId || null;
                    const isMine = !!(sellerIdentity && sellerIdentity === eco.playerId);
                    const isExpired = listing.status === 'expired';
                    return Object.assign({}, listing, label, { isMine, isExpired });
                });
            return {
                slotId,
                slotLabel: getAuctionSlotLabel(slotId),
                wallets: Object.assign({}, data.wallets || {}),
                profileWallets: Object.assign({}, data.profileWallets || {}),
                myWallet,
                legacySlotWallet,
                profileWallet,
                auctionEarningsPending: Math.max(0, Math.floor(eco.auction.auctionEarningsPending || 0)),
                auctionEarningsWithheld: Math.max(0, Math.floor(eco.auction.auctionEarningsWithheld || 0)),
                auctionEarningsLastClaimResult: eco.auction.auctionEarningsLastClaimResult || null,
                locked: isAuctionInteractionLocked(),
                lockReason: isAuctionInteractionLocked() ? 'save-integrity-warning' : null,
                listings
            };
        }

        function setAuctionSlot(slotId) {
            if (!ECONOMY_AUCTION_SLOTS.includes(slotId)) return false;
            const eco = ensureEconomyState();
            eco.auction.slotId = slotId;
            try {
                localStorage.setItem(getAuctionSlotStorageKey(), slotId);
            } catch (e) {
                // ignore storage errors
            }
            saveGame();
            return true;
        }

        function getAuctionItemLabel(itemType, itemId) {
            if (itemType === 'loot' && EXPLORATION_LOOT[itemId]) {
                return { name: EXPLORATION_LOOT[itemId].name, emoji: EXPLORATION_LOOT[itemId].emoji };
            }
            if (itemType === 'crop' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Crop`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if (itemType === 'seed' && GARDEN_CROPS[itemId]) {
                return { name: `${GARDEN_CROPS[itemId].name} Seeds`, emoji: GARDEN_CROPS[itemId].seedEmoji };
            }
            if ((itemType === 'food' || itemType === 'toys' || itemType === 'medicine') && ECONOMY_SHOP_ITEMS[itemType] && ECONOMY_SHOP_ITEMS[itemType][itemId]) {
                return { name: ECONOMY_SHOP_ITEMS[itemType][itemId].name, emoji: ECONOMY_SHOP_ITEMS[itemType][itemId].emoji };
            }
            if (itemType === 'crafted' && CRAFTED_ITEMS[itemId]) {
                return { name: CRAFTED_ITEMS[itemId].name, emoji: CRAFTED_ITEMS[itemId].emoji };
            }
            if (itemType === 'accessory' && ACCESSORIES[itemId]) {
                return { name: ACCESSORIES[itemId].name, emoji: ACCESSORIES[itemId].emoji };
            }
            if (itemType === 'decoration' && FURNITURE.decorations[itemId]) {
                return { name: FURNITURE.decorations[itemId].name, emoji: FURNITURE.decorations[itemId].emoji || '🛋️' };
            }
            return { name: itemId, emoji: '📦' };
        }

        function getAuctionOwnedCount(itemType, itemId) {
            ensureEconomyState();
            ensureExplorationState();
            if (itemType === 'loot') return Math.max(0, Math.floor((gameState.exploration.lootInventory[itemId] || 0)));
            if (itemType === 'crop') return Math.max(0, Math.floor((((gameState.garden || {}).inventory || {})[itemId] || 0)));
            if (itemType === 'seed') return getSeedInventoryCount(itemId);
            if (itemType === 'crafted') return getEconomyItemCount('crafted', itemId);
            if (itemType === 'accessory') return getEconomyItemCount('accessories', itemId);
            if (itemType === 'decoration') return getEconomyItemCount('decorations', itemId);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return getEconomyItemCount(itemType, itemId);
            return 0;
        }

        function consumeAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                const ex = ensureExplorationState();
                const inv = ex.lootInventory;
                if ((inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'crop') {
                const inv = gameState.garden && gameState.garden.inventory;
                if (!inv || (inv[itemId] || 0) < count) return false;
                inv[itemId] -= count;
                if (inv[itemId] <= 0) delete inv[itemId];
                return true;
            }
            if (itemType === 'seed') return consumeEconomyInventoryItem('seeds', itemId, count);
            if (itemType === 'crafted') return consumeEconomyInventoryItem('crafted', itemId, count);
            if (itemType === 'accessory') return consumeEconomyInventoryItem('accessories', itemId, count);
            if (itemType === 'decoration') return consumeEconomyInventoryItem('decorations', itemId, count);
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') return consumeEconomyInventoryItem(itemType, itemId, count);
            return false;
        }

        function addAuctionItem(itemType, itemId, qty) {
            const count = Math.max(1, Math.floor(Number(qty) || 1));
            if (itemType === 'loot') {
                addLootToInventory(itemId, count);
                return;
            }
            if (itemType === 'crop') {
                if (!gameState.garden) gameState.garden = {};
                if (!gameState.garden.inventory) gameState.garden.inventory = {};
                if (!gameState.garden.inventory[itemId]) gameState.garden.inventory[itemId] = 0;
                gameState.garden.inventory[itemId] += count;
                return;
            }
            if (itemType === 'seed') {
                addEconomyInventoryItem('seeds', itemId, count);
                return;
            }
            if (itemType === 'crafted') {
                addEconomyInventoryItem('crafted', itemId, count);
                return;
            }
            if (itemType === 'accessory') {
                addEconomyInventoryItem('accessories', itemId, count);
                return;
            }
            if (itemType === 'decoration') {
                addEconomyInventoryItem('decorations', itemId, count);
                return;
            }
            if (itemType === 'food' || itemType === 'toys' || itemType === 'medicine') {
                addEconomyInventoryItem(itemType, itemId, count);
            }
        }

        function createAuctionListing(itemType, itemId, quantity, price) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showAuctionLockToast();
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const qty = Math.max(1, Math.floor(Number(quantity) || 1));
            const ask = Math.max(1, Math.floor(Number(price) || 1));
            const owned = getAuctionOwnedCount(itemType, itemId);
            if (owned < qty) return { ok: false, reason: 'not-enough-items', owned };

            // Rec 8: Enforce per-slot listing cap
            const perSlotCap = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionPerSlotListingCap === 'number')
                ? ECONOMY_BALANCE.auctionPerSlotListingCap : 12;
            const existingData = loadAuctionHouseData();
            if (markExpiredAuctionListings(existingData)) saveAuctionHouseData(existingData);
            const mySlotListings = (existingData.listings || []).filter((l) => l && l.status !== 'expired' && l.sellerSlot === eco.auction.slotId && ((l.sellerProfileId || l.sellerPlayerId || '') === eco.playerId));
            if (mySlotListings.length >= perSlotCap) {
                return { ok: false, reason: 'slot-listing-cap', cap: perSlotCap };
            }

            // Rec 4: Charge non-refundable listing fee upfront
            const feeRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionListingFeeRate === 'number')
                ? ECONOMY_BALANCE.auctionListingFeeRate : 0.03;
            const relistKey = `${itemType}:${itemId}`;
            const auctionHardeningCfg = getHardeningCfg('auction', {}) || {};
            const relistEscalationCfg = (auctionHardeningCfg.relistFeeEscalation && typeof auctionHardeningCfg.relistFeeEscalation === 'object')
                ? auctionHardeningCfg.relistFeeEscalation
                : auctionHardeningCfg;
            const relistWindowMs = Math.max(60000, Number(relistEscalationCfg.windowMs || relistEscalationCfg.relistWindowMs) || (3 * 24 * 60 * 60 * 1000));
            const relistStepRate = Math.max(0, Number(relistEscalationCfg.stepRate || relistEscalationCfg.relistFeeStepRate) || 0.02);
            const relistMaxExtraRate = Math.max(0, Number(relistEscalationCfg.maxExtraRate || relistEscalationCfg.relistFeeMaxExtraRate) || 0.12);
            const tracker = eco.auction.relistTracker || (eco.auction.relistTracker = {});
            const trackerEntry = (tracker[relistKey] && typeof tracker[relistKey] === 'object') ? tracker[relistKey] : { lastAt: 0, count: 0 };
            const nowMs = getHardenedEconomyNowMs();
            const withinRelistWindow = trackerEntry.lastAt > 0 && (nowMs - trackerEntry.lastAt) <= relistWindowMs;
            const relistCount = withinRelistWindow ? Math.max(0, Math.floor(Number(trackerEntry.count) || 0)) : 0;
            const relistExtraRate = Math.min(relistMaxExtraRate, relistCount * relistStepRate);
            const listingFee = Math.max(1, Math.floor(ask * (feeRate + relistExtraRate)));
            const feeSpend = spendCoins(listingFee, 'Listing Fee', true);
            if (!feeSpend.ok) return { ok: false, reason: 'insufficient-funds-fee', needed: listingFee, balance: feeSpend.balance };

            if (!consumeAuctionItem(itemType, itemId, qty)) {
                // Refund listing fee if consume fails
                addCoins(listingFee, 'Listing Fee Refund', true);
                return { ok: false, reason: 'consume-failed' };
            }

            const data = loadAuctionHouseData();
            markExpiredAuctionListings(data);
            const listing = {
                id: `auc_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
                sellerSlot: eco.auction.slotId,
                // Rec 2: Embed persistent playerId for cross-slot self-trade prevention
                sellerProfileId: eco.playerId || '',
                sellerPlayerId: eco.playerId || '',
                itemType,
                itemId,
                quantity: qty,
                price: ask,
                listingFee: listingFee,
                createdAt: nowMs,
                expiresAt: nowMs + getAuctionListingExpiryMs(),
                status: 'active',
                relistKey,
                relistCount
            };
            data.listings.unshift(listing);
            if (data.listings.length > 80) data.listings = data.listings.slice(0, 80);
            saveAuctionHouseData(data);
            eco.auction.postedCount = (eco.auction.postedCount || 0) + 1;
            tracker[relistKey] = { lastAt: nowMs, count: relistCount + 1 };
            saveGame();
            return {
                ok: true,
                listing: Object.assign({}, listing, getAuctionItemLabel(itemType, itemId)),
                listingFee,
                relistFeeExtraRate: relistExtraRate
            };
        }

        function cancelAuctionListing(listingId) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showAuctionLockToast();
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            if (markExpiredAuctionListings(data)) saveAuctionHouseData(data);
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            const sellerIdentity = listing.sellerProfileId || listing.sellerPlayerId || null;
            if (!sellerIdentity) return { ok: false, reason: 'legacy-owner-unknown' };
            if (sellerIdentity !== eco.playerId) return { ok: false, reason: 'not-owner' };
            data.listings.splice(idx, 1);
            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);
            saveAuctionHouseData(data);
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)) };
        }

        function buyAuctionListing(listingId) {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showAuctionLockToast();
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            if (markExpiredAuctionListings(data)) saveAuctionHouseData(data);
            const idx = data.listings.findIndex((l) => l && l.id === listingId);
            if (idx === -1) return { ok: false, reason: 'listing-not-found' };
            const listing = data.listings[idx];
            if (listing.status === 'expired') return { ok: false, reason: 'listing-expired' };
            // Rec 2: Block self-purchase by playerId (cross-slot exploit fix) + legacy slotId check
            if (!listing.sellerProfileId && !listing.sellerPlayerId && listing.sellerSlot === eco.auction.slotId) return { ok: false, reason: 'own-listing' };
            if (listing.sellerSlot === eco.auction.slotId && (listing.sellerProfileId || listing.sellerPlayerId || '') === eco.playerId) return { ok: false, reason: 'own-listing' };
            if (listing.sellerProfileId && listing.sellerProfileId === eco.playerId) return { ok: false, reason: 'own-listing' };
            if (listing.sellerPlayerId && listing.sellerPlayerId === eco.playerId) return { ok: false, reason: 'own-listing' };

            const spend = spendCoins(listing.price, 'Auction Buy', true);
            if (!spend.ok) return { ok: false, reason: spend.reason, needed: listing.price, balance: spend.balance };

            addAuctionItem(listing.itemType, listing.itemId, listing.quantity);

            // Rec 3: Apply transaction tax — seller receives price minus tax
            const taxRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionTransactionTaxRate === 'number')
                ? ECONOMY_BALANCE.auctionTransactionTaxRate : 0.08;
            const taxAmount = Math.max(0, Math.floor(listing.price * taxRate));
            const sellerProceeds = listing.price - taxAmount;
            if (listing.sellerProfileId) {
                data.profileWallets[listing.sellerProfileId] = Math.max(0, Math.floor((data.profileWallets[listing.sellerProfileId] || 0))) + sellerProceeds;
            } else {
                data.wallets[listing.sellerSlot] = Math.max(0, Math.floor((data.wallets[listing.sellerSlot] || 0))) + sellerProceeds;
            }
            data.listings.splice(idx, 1);
            saveAuctionHouseData(data);
            eco.auction.boughtCount = (eco.auction.boughtCount || 0) + 1;
            saveGame();
            return { ok: true, listing: Object.assign({}, listing, getAuctionItemLabel(listing.itemType, listing.itemId)), balance: eco.coins, taxAmount };
        }

        function claimAuctionEarnings() {
            const eco = ensureEconomyState();
            if (isAuctionInteractionLocked()) {
                showAuctionLockToast();
                return { ok: false, reason: 'auction-locked-suspicious' };
            }
            const data = loadAuctionHouseData();
            const slotId = eco.auction.slotId;
            const legacyWallet = Math.max(0, Math.floor((data.wallets[slotId] || 0)));
            const profileWallet = Math.max(0, Math.floor(((data.profileWallets || {})[eco.playerId]) || 0));
            const pending = Math.max(0, Math.floor(eco.auction.auctionEarningsPending || 0));
            const withheld = Math.max(0, Math.floor(eco.auction.auctionEarningsWithheld || 0));
            const claimPool = legacyWallet + profileWallet + pending + withheld;
            if (claimPool <= 0) return { ok: false, reason: 'nothing-to-claim' };

            eco.auction.auctionEarningsPending = claimPool;
            const credit = addCoinsDetailed(claimPool, 'Auction Payout', {
                silent: true,
                // Auction escrow claims should not silently disappear into debt repayment.
                skipWealthPressureDebtRepayment: true
            });
            const nextWithheld = Math.max(0, Math.floor(credit.withheldByGuards || 0));
            eco.auction.auctionEarningsWithheld = nextWithheld;
            eco.auction.auctionEarningsPending = 0;
            eco.auction.auctionEarningsLastClaimResult = {
                at: getHardenedEconomyNowMs(),
                requested: claimPool,
                credited: Math.max(0, Math.floor(credit.credited || 0)),
                withheld: nextWithheld,
                limitedAmount: Math.max(0, Math.floor(credit.limitedAmount || 0)),
                suspiciousMultiplier: Number((((credit || {}).rateLimit) || {}).suspiciousMult || 1),
                minuteMultiplier: Number((((credit || {}).rateLimit) || {}).minuteMult || 1),
                sessionMultiplier: Number((((credit || {}).rateLimit) || {}).sessionMult || 1)
            };

            // Clear auction wallets only after value has been accounted into coin credit/withheld state.
            data.wallets[slotId] = 0;
            if (data.profileWallets && eco.playerId) data.profileWallets[eco.playerId] = 0;
            saveAuctionHouseData(data);
            eco.auction.soldCount = (eco.auction.soldCount || 0) + 1;
            saveGame();
            return {
                ok: true,
                amount: Math.max(0, Math.floor(credit.credited || 0)),
                claimedGross: claimPool,
                withheld: nextWithheld,
                balance: eco.coins,
                claimResult: eco.auction.auctionEarningsLastClaimResult
            };
        }
