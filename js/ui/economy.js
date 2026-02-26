// ============================================================
// ui/economy.js  --  Economy and trading UI
// Extracted from ui.js (lines 7629-8270)
// ============================================================

        // ==================== ECONOMY & TRADING MODAL ====================

        function syncEconomyHudDisplay() {
            const balance = (typeof getCoinBalance === 'function') ? getCoinBalance() : 0;
            const economyBadge = document.querySelector('#economy-btn .explore-alert-badge');
            if (economyBadge) economyBadge.textContent = String(Math.min(999, balance));
            const economyMeta = document.getElementById('top-meta-economy');
            if (economyMeta) economyMeta.textContent = `${typeof formatCoins === 'function' ? formatCoins(balance) : balance} coins available.`;
        }

        function showEconomyModal() {
            const existing = document.querySelector('.economy-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            if (typeof ensureEconomyState === 'function') ensureEconomyState();
            if (typeof ensureExplorationState === 'function') ensureExplorationState();
            if (typeof refreshRareMarketplace === 'function') refreshRareMarketplace(false);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay economy-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Economy and Trading');
            document.body.appendChild(overlay);

            function getIngredientLabel(ingredient) {
                if (!ingredient) return 'Ingredient';
                if (ingredient.source === 'crop' && GARDEN_CROPS[ingredient.id]) return `${GARDEN_CROPS[ingredient.id].seedEmoji} ${GARDEN_CROPS[ingredient.id].name}`;
                if (ingredient.source === 'loot' && EXPLORATION_LOOT[ingredient.id]) return `${EXPLORATION_LOOT[ingredient.id].emoji} ${EXPLORATION_LOOT[ingredient.id].name}`;
                if (ingredient.source === 'crafted' && CRAFTED_ITEMS[ingredient.id]) return `${CRAFTED_ITEMS[ingredient.id].emoji} ${CRAFTED_ITEMS[ingredient.id].name}`;
                if (ingredient.source === 'shop') {
                    const categories = ['food', 'toys', 'medicine', 'seeds'];
                    for (const cat of categories) {
                        const item = ECONOMY_SHOP_ITEMS[cat] && ECONOMY_SHOP_ITEMS[cat][ingredient.id];
                        if (item) return `${item.emoji} ${item.name}`;
                    }
                }
                return ingredient.id;
            }

            function getAuctionPostables(snapshot) {
                const items = [];
                Object.entries(snapshot.loot || {}).forEach(([id, count]) => {
                    if (count > 0 && EXPLORATION_LOOT[id]) {
                        items.push({
                            key: `loot:${id}`,
                            type: 'loot',
                            id,
                            name: EXPLORATION_LOOT[id].name,
                            emoji: EXPLORATION_LOOT[id].emoji,
                            count,
                            suggestedPrice: Math.max(1, (typeof getLootSellPrice === 'function' ? getLootSellPrice(id) : 15) * 2)
                        });
                    }
                });
                Object.entries(snapshot.crops || {}).forEach(([id, count]) => {
                    if (count > 0 && GARDEN_CROPS[id]) {
                        items.push({
                            key: `crop:${id}`,
                            type: 'crop',
                            id,
                            name: `${GARDEN_CROPS[id].name} Crop`,
                            emoji: GARDEN_CROPS[id].seedEmoji,
                            count,
                            suggestedPrice: 18
                        });
                    }
                });
                const inv = snapshot.inventory || {};
                Object.entries(inv.food || {}).forEach(([id, count]) => {
                    if (count > 0 && ECONOMY_SHOP_ITEMS.food[id]) {
                        items.push({
                            key: `food:${id}`,
                            type: 'food',
                            id,
                            name: ECONOMY_SHOP_ITEMS.food[id].name,
                            emoji: ECONOMY_SHOP_ITEMS.food[id].emoji,
                            count,
                            suggestedPrice: Math.max(1, Math.round((typeof getShopItemPrice === 'function' ? getShopItemPrice('food', id) : 20) * 0.7))
                        });
                    }
                });
                Object.entries(inv.toys || {}).forEach(([id, count]) => {
                    if (count > 0 && ECONOMY_SHOP_ITEMS.toys[id]) {
                        items.push({
                            key: `toys:${id}`,
                            type: 'toys',
                            id,
                            name: ECONOMY_SHOP_ITEMS.toys[id].name,
                            emoji: ECONOMY_SHOP_ITEMS.toys[id].emoji,
                            count,
                            suggestedPrice: Math.max(1, Math.round((typeof getShopItemPrice === 'function' ? getShopItemPrice('toys', id) : 25) * 0.7))
                        });
                    }
                });
                Object.entries(inv.medicine || {}).forEach(([id, count]) => {
                    if (count > 0 && ECONOMY_SHOP_ITEMS.medicine[id]) {
                        items.push({
                            key: `medicine:${id}`,
                            type: 'medicine',
                            id,
                            name: ECONOMY_SHOP_ITEMS.medicine[id].name,
                            emoji: ECONOMY_SHOP_ITEMS.medicine[id].emoji,
                            count,
                            suggestedPrice: Math.max(1, Math.round((typeof getShopItemPrice === 'function' ? getShopItemPrice('medicine', id) : 30) * 0.7))
                        });
                    }
                });
                Object.entries(inv.seeds || {}).forEach(([id, count]) => {
                    if (count > 0 && GARDEN_CROPS[id]) {
                        items.push({
                            key: `seed:${id}`,
                            type: 'seed',
                            id,
                            name: `${GARDEN_CROPS[id].name} Seeds`,
                            emoji: GARDEN_CROPS[id].seedEmoji,
                            count,
                            suggestedPrice: 12
                        });
                    }
                });
                Object.entries(inv.crafted || {}).forEach(([id, count]) => {
                    if (count > 0 && CRAFTED_ITEMS[id]) {
                        items.push({
                            key: `crafted:${id}`,
                            type: 'crafted',
                            id,
                            name: CRAFTED_ITEMS[id].name,
                            emoji: CRAFTED_ITEMS[id].emoji,
                            count,
                            suggestedPrice: 55
                        });
                    }
                });
                return items.slice(0, 16);
            }

            function renderEconomyModal() {
                const _getAuctionSlotLabel = typeof getAuctionSlotLabel === 'function'
                    ? getAuctionSlotLabel
                    : (slotId) => ({ slotA: 'Slot A', slotB: 'Slot B', slotC: 'Slot C' }[slotId] || String(slotId || 'Slot'));
                if (typeof ensureEconomyState === 'function') ensureEconomyState();
                const balance = (typeof getCoinBalance === 'function') ? getCoinBalance() : 0;
                syncEconomyHudDisplay();
                const priceContext = (typeof getEconomyPriceContext === 'function') ? getEconomyPriceContext() : '';
                const marketOffers = (typeof getRareMarketplaceStock === 'function') ? getRareMarketplaceStock() : [];
                const crafting = (typeof getCraftingRecipeStates === 'function') ? getCraftingRecipeStates() : [];
                const auction = (typeof getAuctionHouseSnapshot === 'function') ? getAuctionHouseSnapshot() : { slotId: 'slotA', myWallet: 0, listings: [] };
                const snapshot = (typeof getOwnedEconomySnapshot === 'function') ? getOwnedEconomySnapshot() : { inventory: {}, loot: {}, crops: {} };
                const postables = getAuctionPostables(snapshot);
                const mysteryPrice = (typeof getMysteryEggPrice === 'function') ? getMysteryEggPrice() : 120;

                let shopSections = '';
                const shopCategories = [
                    { key: 'food', title: 'Food', icon: '🍽️' },
                    { key: 'toys', title: 'Toys', icon: '🧸' },
                    { key: 'medicine', title: 'Medicine', icon: '🩺' },
                    { key: 'seeds', title: 'Seeds', icon: '🌱' },
                    { key: 'accessories', title: 'Accessories', icon: '🎀' },
                    { key: 'decorations', title: 'Decor', icon: '🛋️' }
                ];
                shopCategories.forEach((category) => {
                    const entries = Object.values(ECONOMY_SHOP_ITEMS[category.key] || {});
                    const cards = entries.map((item) => {
                        // Rec 10: Seasonal availability check
                        const available = (typeof isShopItemAvailable === 'function') ? isShopItemAvailable(item.id) : true;
                        if (!available) return `
                            <div class="economy-card" style="opacity:0.5;">
                                <div><strong>${item.emoji} ${item.name}</strong></div>
                                <div class="explore-subtext" style="color:#FFA726;">Out of season</div>
                            </div>
                        `;
                        const price = (typeof getShopItemPrice === 'function') ? getShopItemPrice(category.key, item.id) : (item.basePrice || 0);
                        const ownedId = category.key === 'seeds' ? item.cropId
                            : category.key === 'accessories' ? item.accessoryId
                                : category.key === 'decorations' ? item.decorationId
                                    : item.id;
                        const useActionId = (category.key === 'accessories' || category.key === 'decorations') ? item.id : ownedId;
                        const ownedCount = (typeof getEconomyItemCount === 'function') ? getEconomyItemCount(
                            category.key === 'accessories' ? 'accessories'
                                : category.key === 'decorations' ? 'decorations'
                                    : category.key === 'seeds' ? 'seeds'
                                        : category.key,
                            ownedId
                        ) : 0;
                        const useable = ['food', 'toys', 'medicine'].includes(category.key) || category.key === 'decorations' || category.key === 'accessories';
                        // Rec 5: Durability display for toys
                        let durabilityHTML = '';
                        if (category.key === 'toys' && typeof getItemDurability === 'function') {
                            const dur = getItemDurability('toys', ownedId);
                            if (dur) {
                                const pct = Math.round((dur.current / dur.max) * 100);
                                const color = pct > 50 ? '#66BB6A' : pct > 20 ? '#FFD54F' : '#EF5350';
                                durabilityHTML = `<div class="explore-subtext" style="color:${color};">Durability: ${dur.current}/${dur.max}${dur.current <= 0 ? ' (Broken!)' : ''}</div>`;
                                if (dur.current < dur.max) {
                                    durabilityHTML += `<button class="modal-btn" data-repair-item="toys:${ownedId}" style="font-size:0.75rem;">Repair</button>`;
                                }
                            }
                        }
                        return `
                            <div class="economy-card">
                                <div><strong>${item.emoji} ${item.name}</strong></div>
                                <div class="explore-subtext">${item.description || ''}</div>
                                <div class="explore-subtext">Owned: ${ownedCount}</div>
                                ${durabilityHTML}
                                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                                    <button class="modal-btn confirm" data-shop-buy="${category.key}:${item.id}">Buy (${price}🪙)</button>
                                    ${useable ? `<button class="modal-btn" data-shop-use="${category.key}:${useActionId}">Use</button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');
                    shopSections += `
                        <section class="explore-section">
                            <h3>${category.icon} Pet Shop: ${category.title}</h3>
                            <div class="explore-biome-grid">${cards || '<p class="explore-subtext">No items.</p>'}</div>
                        </section>
                    `;
                });
                const craftedUseCards = Object.entries(snapshot.inventory.crafted || {})
                    .filter(([, count]) => count > 0)
                    .map(([itemId, count]) => {
                        const item = CRAFTED_ITEMS[itemId];
                        if (!item) return '';
                        return `
                            <div class="economy-card">
                                <div><strong>${item.emoji} ${item.name}</strong></div>
                                <div class="explore-subtext">${item.description || ''}</div>
                                <div class="explore-subtext">Owned: ${count}</div>
                                <button class="modal-btn confirm" data-shop-use="crafted:${itemId}">Use</button>
                            </div>
                        `;
                    }).join('');
                shopSections += `
                    <section class="explore-section">
                        <h3>🧪 Crafted Items</h3>
                        <div class="explore-biome-grid">${craftedUseCards || '<p class="explore-subtext">No crafted items yet. Use recipes below.</p>'}</div>
                    </section>
                `;

                // Rec 6: Prestige shop section
                let prestigeHTML = '';
                if (typeof PRESTIGE_PURCHASES !== 'undefined') {
                    const prestigeCards = Object.values(PRESTIGE_PURCHASES).map((item) => {
                        const owned = (typeof hasPrestigePurchase === 'function') ? hasPrestigePurchase(item.id) : false;
                        return `
                            <div class="economy-card" ${owned ? 'style="opacity:0.6;"' : ''}>
                                <div><strong>${item.emoji} ${item.name}</strong></div>
                                <div class="explore-subtext">${item.description || ''}</div>
                                ${owned ? '<div class="explore-subtext" style="color:#66BB6A;">Owned</div>'
                                    : `<button class="modal-btn confirm" data-prestige-buy="${item.id}">Buy (${item.cost}🪙)</button>`}
                            </div>
                        `;
                    }).join('');
                    shopSections += `
                        <section class="explore-section">
                            <h3>🏆 Prestige Shop</h3>
                            <p class="explore-subtext">High-value upgrades for veteran players.</p>
                            <div class="explore-biome-grid">${prestigeCards}</div>
                        </section>
                    `;
                }

                const marketHTML = marketOffers.length > 0
                    ? marketOffers.map((offer) => {
                        let name = offer.itemId;
                        let emoji = '🎁';
                        if (offer.kind === 'loot' && EXPLORATION_LOOT[offer.itemId]) {
                            name = EXPLORATION_LOOT[offer.itemId].name;
                            emoji = EXPLORATION_LOOT[offer.itemId].emoji;
                        } else if (offer.kind === 'seed' && GARDEN_CROPS[(ECONOMY_SHOP_ITEMS.seeds[offer.itemId] || {}).cropId || offer.itemId]) {
                            const cropId = (ECONOMY_SHOP_ITEMS.seeds[offer.itemId] || {}).cropId || offer.itemId;
                            name = `${GARDEN_CROPS[cropId].name} Seeds`;
                            emoji = GARDEN_CROPS[cropId].seedEmoji;
                        } else {
                            const lookup = offer.kind === 'accessory' ? (ECONOMY_SHOP_ITEMS.accessories[offer.itemId] || ACCESSORIES[offer.itemId]) :
                                offer.kind === 'decoration' ? ECONOMY_SHOP_ITEMS.decorations[offer.itemId] :
                                    offer.kind === 'food' ? ECONOMY_SHOP_ITEMS.food[offer.itemId] :
                                        offer.kind === 'toys' ? ECONOMY_SHOP_ITEMS.toys[offer.itemId] :
                                            offer.kind === 'medicine' ? ECONOMY_SHOP_ITEMS.medicine[offer.itemId] : null;
                            if (lookup) {
                                name = lookup.name;
                                emoji = lookup.emoji || emoji;
                            }
                        }
                        return `
                            <div class="economy-card">
                                <div><strong>${emoji} ${name}</strong></div>
                                <div class="explore-subtext">Qty: ${offer.quantity}</div>
                                <button class="modal-btn confirm" data-rare-buy="${offer.offerId}">Buy (${offer.price}🪙)</button>
                            </div>
                        `;
                    }).join('')
                    : '<p class="explore-subtext">No rare offers right now. Check back after weather/season shifts.</p>';

                const craftingHTML = crafting.length > 0
                    ? crafting.map((recipe) => {
                        const ingredients = (recipe.ingredientStatus || []).map((ing) => {
                            const warn = ing.missing > 0 ? 'color:#EF5350;' : '';
                            return `<span style="${warn}">${getIngredientLabel(ing)} ${ing.owned}/${ing.count}</span>`;
                        }).join(' · ');
                        return `
                            <div class="economy-card">
                                <div><strong>${recipe.emoji} ${recipe.name}</strong></div>
                                <div class="explore-subtext">${ingredients}</div>
                                <button class="modal-btn ${recipe.canCraft ? 'confirm' : ''}" data-craft-recipe="${recipe.id}" ${recipe.canCraft ? '' : 'disabled'}>Craft (${recipe.craftCost}🪙)</button>
                            </div>
                        `;
                    }).join('')
                    : '<p class="explore-subtext">No recipes available.</p>';

                const sellLootHTML = Object.entries(snapshot.loot || {})
                    .filter(([, count]) => count > 0)
                    .map(([lootId, count]) => {
                        const loot = EXPLORATION_LOOT[lootId];
                        if (!loot) return '';
                        const price = (typeof getLootSellPrice === 'function') ? getLootSellPrice(lootId) : 0;
                        return `
                            <div class="economy-card">
                                <div><strong>${loot.emoji} ${loot.name}</strong></div>
                                <div class="explore-subtext">Owned: ${count} · Sell: ${price}🪙 each</div>
                                <button class="modal-btn confirm" data-sell-loot="${lootId}">Sell 1</button>
                                <button class="modal-btn" data-sell-loot-bulk="${lootId}">Sell All</button>
                            </div>
                        `;
                    }).join('') || '<p class="explore-subtext">No exploration loot to sell yet.</p>';

                // Rec 3/4: Calculate tax and fee rates for display
                const taxRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionTransactionTaxRate === 'number')
                    ? Math.round(ECONOMY_BALANCE.auctionTransactionTaxRate * 100) : 8;
                const feeRate = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.auctionListingFeeRate === 'number')
                    ? Math.round(ECONOMY_BALANCE.auctionListingFeeRate * 100) : 3;

                const auctionListingHTML = (auction.listings || []).slice(0, 16).map((listing) => {
                    const mine = listing.sellerSlot === auction.slotId;
                    return `
                        <li>
                            <span>${listing.emoji} ${escapeHTML(listing.name)} x${listing.quantity} · ${listing.price}🪙 · ${_getAuctionSlotLabel(listing.sellerSlot)}</span>
                            <button class="modal-btn ${mine ? '' : 'confirm'}" data-auction-action="${mine ? 'cancel' : 'buy'}:${listing.id}">${mine ? 'Cancel' : 'Buy'}</button>
                        </li>
                    `;
                }).join('') || '<li>No active listings.</li>';

                const auctionPostHTML = postables.length > 0
                    ? postables.map((item) => {
                        const listFee = Math.max(1, Math.floor(item.suggestedPrice * (feeRate / 100)));
                        return `
                            <div class="economy-card">
                                <div><strong>${item.emoji} ${escapeHTML(item.name)}</strong></div>
                                <div class="explore-subtext">Owned: ${item.count}</div>
                                <div class="explore-subtext" style="font-size:0.7rem;color:#90A4AE;">Listing fee: ${listFee}🪙 | Buyer pays ${taxRate}% tax</div>
                                <button class="modal-btn" data-auction-post="${item.type}:${item.id}:${item.suggestedPrice}">Post (1 for ${item.suggestedPrice}🪙)</button>
                            </div>
                        `;
                    }).join('')
                    : '<p class="explore-subtext">No items available to list.</p>';

                overlay.innerHTML = `
                    <div class="exploration-modal" style="max-width:980px;">
                        <div class="explore-header">
                            <h2>🪙 Economy & Trading</h2>
                            <div class="explore-header-actions">
                                <button class="modal-btn" id="economy-refresh-btn">Refresh</button>
                                <button class="modal-btn" id="economy-close-btn" aria-label="Close economy">Close</button>
                            </div>
                        </div>

                        <div class="explore-summary-grid">
                            <div class="explore-summary-card"><strong>${typeof formatCoins === 'function' ? formatCoins(balance) : balance}</strong><span>Coins</span></div>
                            <div class="explore-summary-card"><strong>${priceContext}</strong><span>Price Context</span></div>
                            <div class="explore-summary-card"><strong>${auction.slotLabel || 'Slot A'}</strong><span>Auction Slot</span></div>
                            <div class="explore-summary-card"><strong>${auction.myWallet || 0}🪙</strong><span>Pending Auction</span></div>
                        </div>

                        <section class="explore-section">
                            <h3>🎁 Mystery Egg Loot Box</h3>
                            <p class="explore-subtext">Open a mystery egg for random rewards. Price fluctuates with season/weather.</p>
                            <button class="modal-btn confirm" id="buy-mystery-egg-btn">Buy & Open (${mysteryPrice}🪙)</button>
                        </section>

                        ${shopSections}

                        <section class="explore-section">
                            <h3>✨ Rare Marketplace (Rotating)</h3>
                            <div class="explore-biome-grid">${marketHTML}</div>
                        </section>

                        <section class="explore-section">
                            <h3>🛠️ Crafting</h3>
                            <div class="explore-biome-grid">${craftingHTML}</div>
                        </section>

                        <section class="explore-section">
                            <h3>💰 Sell Exploration Loot</h3>
                            <div class="explore-biome-grid">${sellLootHTML}</div>
                        </section>

                        <section class="explore-section">
                            <h3>🏦 Auction House (Local Save Slots)</h3>
                            <p class="explore-subtext" style="font-size:0.75rem;color:#90A4AE;">Listing fee: ${feeRate}% | Transaction tax: ${taxRate}% on sales | Max ${typeof ECONOMY_BALANCE !== 'undefined' ? ECONOMY_BALANCE.auctionPerSlotListingCap : 12} listings/slot</p>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
                                <label for="auction-slot-select">Active Slot</label>
                                <select id="auction-slot-select" class="explore-duration-select">
                                    ${ECONOMY_AUCTION_SLOTS.map((slotId) => `<option value="${slotId}" ${slotId === auction.slotId ? 'selected' : ''}>${_getAuctionSlotLabel(slotId)}</option>`).join('')}
                                </select>
                                <button class="modal-btn confirm" id="auction-claim-btn">Claim ${auction.myWallet || 0}🪙</button>
                            </div>
                            <ul class="explore-log-list">${auctionListingHTML}</ul>
                            <h4 style="margin-top:10px;">Post Listing</h4>
                            <div class="explore-biome-grid">${auctionPostHTML}</div>
                        </section>
                    </div>
                `;

                const closeBtn = overlay.querySelector('#economy-close-btn');
                if (closeBtn) closeBtn.addEventListener('click', closeEconomyModal);
                const refreshBtn = overlay.querySelector('#economy-refresh-btn');
                if (refreshBtn) refreshBtn.addEventListener('click', renderEconomyModal);

                const mysteryBtn = overlay.querySelector('#buy-mystery-egg-btn');
                if (mysteryBtn) {
                    mysteryBtn.addEventListener('click', () => {
                        if (typeof openMysteryEgg !== 'function') return;
                        const result = openMysteryEgg();
                        if (!result.ok) {
                            showToast('Not enough coins for a mystery egg.', '#FFA726');
                            return;
                        }
                        showToast(`🥚 Mystery Egg opened! ${result.reward.emoji} ${result.reward.label}`, '#FFD54F');
                        renderEconomyModal();
                    });
                }

                overlay.querySelectorAll('[data-shop-buy]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof buyPetShopItem !== 'function') return;
                        const [category, itemId] = String(btn.getAttribute('data-shop-buy') || '').split(':');
                        const result = buyPetShopItem(category, itemId, 1);
                        if (!result.ok) {
                            showToast('Not enough coins for that purchase.', '#FFA726');
                            return;
                        }
                        showToast(`🛍️ Purchased ${result.item.emoji} ${result.item.name}!`, '#66BB6A');
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-shop-use]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof useOwnedEconomyItem !== 'function') return;
                        const [category, itemId] = String(btn.getAttribute('data-shop-use') || '').split(':');
                        const result = useOwnedEconomyItem(category, itemId);
                        if (!result.ok) {
                            showToast('You do not own that item yet.', '#FFA726');
                            return;
                        }
                        showToast(`✅ Used ${result.def.emoji || '🎁'} ${result.def.name}!`, '#66BB6A');
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updatePetMood === 'function') updatePetMood();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                        if (typeof renderPetPhase === 'function' && (category === 'decorations' || category === 'accessories')) {
                            renderPetPhase();
                        } else {
                            renderEconomyModal();
                        }
                    });
                });

                // Rec 6: Prestige shop buy handlers
                overlay.querySelectorAll('[data-prestige-buy]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof buyPrestigePurchase !== 'function') return;
                        const purchaseId = btn.getAttribute('data-prestige-buy');
                        const result = buyPrestigePurchase(purchaseId);
                        if (!result.ok) {
                            if (result.reason === 'already-owned') showToast('You already own this upgrade!', '#90A4AE');
                            else showToast('Not enough coins for this prestige purchase.', '#FFA726');
                            return;
                        }
                        showToast(`🏆 Unlocked ${result.item.emoji} ${result.item.name}!`, '#FFD700');
                        renderEconomyModal();
                    });
                });

                // Rec 5: Repair item handlers
                overlay.querySelectorAll('[data-repair-item]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof repairItem !== 'function') return;
                        const [category, itemId] = String(btn.getAttribute('data-repair-item') || '').split(':');
                        const result = repairItem(category, itemId);
                        if (!result.ok) {
                            if (result.reason === 'insufficient-funds') showToast(`Not enough coins to repair (${result.needed}🪙 needed).`, '#FFA726');
                            else showToast('Item is already in perfect condition!', '#90A4AE');
                            return;
                        }
                        showToast(`🔧 Repaired for ${result.cost}🪙! Durability: ${result.durability.current}/${result.durability.max}`, '#66BB6A');
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-rare-buy]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof buyRareMarketOffer !== 'function') return;
                        const offerId = btn.getAttribute('data-rare-buy');
                        const result = buyRareMarketOffer(offerId);
                        if (!result.ok) {
                            showToast('Could not complete rare market purchase.', '#FFA726');
                            return;
                        }
                        showToast(`✨ Bought ${result.itemEmoji} ${result.itemLabel}!`, '#4ECDC4');
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-craft-recipe]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof craftRecipe !== 'function') return;
                        const recipeId = btn.getAttribute('data-craft-recipe');
                        const result = craftRecipe(recipeId);
                        if (!result.ok) {
                            showToast('Missing ingredients or coins for crafting.', '#FFA726');
                            return;
                        }
                        showToast(`🛠️ Crafted ${result.craftedEmoji} ${result.craftedLabel}!`, '#81C784');
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-sell-loot]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof sellExplorationLoot !== 'function') return;
                        const lootId = btn.getAttribute('data-sell-loot');
                        const result = sellExplorationLoot(lootId, 1);
                        if (!result.ok) {
                            showToast('Could not sell loot item.', '#FFA726');
                            return;
                        }
                        showToast(`💰 Sold ${result.loot.emoji} ${result.loot.name} for ${result.total} coins!`, '#FFD700');
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-sell-loot-bulk]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof sellExplorationLoot !== 'function') return;
                        const lootId = btn.getAttribute('data-sell-loot-bulk');
                        const owned = (snapshot.loot && snapshot.loot[lootId]) || 0;
                        if (owned <= 0) return;
                        const result = sellExplorationLoot(lootId, owned);
                        if (!result.ok) {
                            showToast('Could not sell all loot for this item.', '#FFA726');
                            return;
                        }
                        showToast(`💰 Sold ${result.quantity}x ${result.loot.emoji} ${result.loot.name} for ${result.total} coins!`, '#FFD700');
                        renderEconomyModal();
                    });
                });

                const auctionSlotSelect = overlay.querySelector('#auction-slot-select');
                if (auctionSlotSelect) {
                    auctionSlotSelect.addEventListener('change', () => {
                        if (typeof setAuctionSlot !== 'function') return;
                        setAuctionSlot(auctionSlotSelect.value);
                        renderEconomyModal();
                    });
                }

                const claimBtn = overlay.querySelector('#auction-claim-btn');
                if (claimBtn) {
                    claimBtn.addEventListener('click', () => {
                        if (typeof claimAuctionEarnings !== 'function') return;
                        const result = claimAuctionEarnings();
                        if (!result.ok) {
                            showToast('No auction earnings to claim yet.', '#90A4AE');
                            return;
                        }
                        showToast(`🏦 Claimed ${result.amount} coins from auction sales!`, '#FFD700');
                        renderEconomyModal();
                    });
                }

                overlay.querySelectorAll('[data-auction-action]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const [action, listingId] = String(btn.getAttribute('data-auction-action') || '').split(':');
                        if (action === 'buy' && typeof buyAuctionListing === 'function') {
                            const result = buyAuctionListing(listingId);
                            if (!result.ok) {
                                const reasonMap = {
                                    'own-listing': 'You cannot buy your own listing.',
                                    'insufficient-funds': 'Not enough coins.',
                                    'listing-not-found': 'Listing is no longer available.'
                                };
                                showToast(reasonMap[result.reason] || 'Could not buy listing.', '#FFA726');
                                return;
                            }
                            showToast(`🛒 Bought ${result.listing.emoji} ${result.listing.name}!`, '#4ECDC4');
                        } else if (action === 'cancel' && typeof cancelAuctionListing === 'function') {
                            const result = cancelAuctionListing(listingId);
                            if (!result.ok) {
                                showToast('Could not cancel listing.', '#FFA726');
                                return;
                            }
                            showToast(`↩️ Cancelled listing for ${result.listing.emoji} ${result.listing.name}.`, '#90A4AE');
                        }
                        renderEconomyModal();
                    });
                });

                overlay.querySelectorAll('[data-auction-post]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        if (typeof createAuctionListing !== 'function') return;
                        const [type, id, suggestedPrice] = String(btn.getAttribute('data-auction-post') || '').split(':');
                        const price = Math.max(1, parseInt(suggestedPrice, 10) || 1);
                        const result = createAuctionListing(type, id, 1, price);
                        if (!result.ok) {
                            showToast('Could not create auction listing.', '#FFA726');
                            return;
                        }
                        showToast(`📌 Listed ${result.listing.emoji} ${result.listing.name} for ${price} coins.`, '#81C784');
                        renderEconomyModal();
                    });
                });
            }

            function closeEconomyModal() {
                popModalEscape(closeEconomyModal);
                overlay.remove();
                syncEconomyHudDisplay();
                const trigger = document.getElementById('economy-btn');
                if (trigger) trigger.focus();
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeEconomyModal();
            });
            pushModalEscape(closeEconomyModal);
            overlay._closeOverlay = closeEconomyModal;
            trapFocus(overlay);
            renderEconomyModal();
            const closeBtn = overlay.querySelector('#economy-close-btn');
            if (closeBtn) closeBtn.focus();
        }

