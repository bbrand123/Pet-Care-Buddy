        // ==================== TOURNAMENT + LEADERBOARD MINI-GAME ====================

        const TOURNAMENT_RIVALS = [
            'Milo', 'Luna', 'Nova', 'Clover', 'Sprout', 'Sunny', 'Shadow', 'Poppy', 'Jasper', 'Nori'
        ];

        let tournamentState = null;

        function pickTournamentRivalNames(count) {
            const targetCount = Math.max(1, Math.floor(Number(count) || 7));
            const pool = getPackedTournamentRivalNames(TOURNAMENT_RIVALS).map((name, idx) => ({ id: `tour_name_${idx}_${name}`, name }));
            const available = pool.slice();
            const picked = [];
            while (available.length > 0 && picked.length < targetCount) {
                const next = getMiniGameContentSelection('tournament', 'rivalNames', available, {
                    recentWindow: 6,
                    idKey: 'id'
                }) || available[0];
                if (!next) break;
                picked.push(next.name);
                const idx = available.findIndex((entry) => entry.id === next.id);
                if (idx >= 0) available.splice(idx, 1);
                else available.shift();
            }
            return picked;
        }

        function getTournamentState() {
            const expansion = ensureMiniGameExpansionMeta();
            if (!expansion.tournament || typeof expansion.tournament !== 'object') {
                expansion.tournament = { season: 1, round: 0, wins: 0, championships: 0, lastBracket: [], leaderboard: [] };
            }
            if (!Array.isArray(expansion.tournament.leaderboard)) expansion.tournament.leaderboard = [];
            if (!Array.isArray(expansion.tournament.lastBracket)) expansion.tournament.lastBracket = [];
            if (!expansion.tournament.lastBracket.length) startNewTournamentSeason(expansion.tournament);
            return expansion.tournament;
        }

        function startNewTournamentSeason(tournament) {
            const entrants = ['You', ...pickTournamentRivalNames(7)];
            // P1-20: Ensure entrant count is even; pad with a generic rival if needed
            // so the bracket loop never creates a match with an undefined opponent.
            if (entrants.length % 2 !== 0) entrants.push('Rival');
            const quarter = [];
            for (let i = 0; i + 1 < entrants.length; i += 2) {
                quarter.push({ a: entrants[i], b: entrants[i + 1], winner: '', aScore: 0, bScore: 0 });
            }
            tournament.lastBracket = [
                { name: 'Quarterfinals', matches: quarter },
                { name: 'Semifinals', matches: [] },
                { name: 'Final', matches: [] }
            ];
            tournament.round = 0;
            tournament.wins = 0;
            tournament.seasonComplete = false;
            const allNames = [...new Set(entrants)];
            allNames.forEach((name) => ensureTournamentLeaderboardEntry(tournament, name));
        }

        function ensureTournamentLeaderboardEntry(tournament, name) {
            let entry = tournament.leaderboard.find((item) => item && item.name === name);
            if (!entry) {
                entry = { name, wins: 0, played: 0, points: 0 };
                tournament.leaderboard.push(entry);
            }
            return entry;
        }

        function simulateTournamentMatch(match) {
            const petStrength = typeof getPetMiniGameStrength === 'function' ? getPetMiniGameStrength(gameState.pet) : 0.5;
            const ruleModifier = tournamentState && tournamentState.ruleModifier ? tournamentState.ruleModifier : getMinigameRuleModifier('tournament');
            const scoreBias = Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.playerScoreBonus) || 0;
            const varianceMult = Math.max(0.5, Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.scoreVarianceMultiplier) || 1);
            const scoreFor = (name) => {
                const base = 52 + (Math.random() * 42 * varianceMult);
                const playerBoost = name === 'You'
                    ? ((petStrength - 0.45) * 36) + scoreBias
                    : ((Math.random() * 8 - 4) - ((petStrength - 0.5) * 8));
                return Math.max(18, Math.round(base + playerBoost + Math.random() * 18));
            };
            match.aScore = scoreFor(match.a);
            match.bScore = scoreFor(match.b);
            if (match.aScore === match.bScore) {
                if (Math.random() > 0.5) match.aScore += 1;
                else match.bScore += 1;
            }
            match.winner = match.aScore > match.bScore ? match.a : match.b;
            return match.winner;
        }

        function resolveTournamentRound() {
            const tournament = getTournamentState();
            if (tournament.seasonComplete) {
                tournament.season += 1;
                startNewTournamentSeason(tournament);
                saveGame();
                updateTournamentUI();
                return;
            }
            const roundIndex = tournament.round;
            const round = tournament.lastBracket[roundIndex];
            if (!round || !Array.isArray(round.matches) || round.matches.length === 0) return;

            const winners = [];
            round.matches.forEach((match) => {
                const winner = simulateTournamentMatch(match);
                winners.push(winner);
                const winnerEntry = ensureTournamentLeaderboardEntry(tournament, winner);
                winnerEntry.wins += 1;
                winnerEntry.played += 1;
                winnerEntry.points += 3;

                const loser = winner === match.a ? match.b : match.a;
                const loserEntry = ensureTournamentLeaderboardEntry(tournament, loser);
                loserEntry.played += 1;
                loserEntry.points += 1;

                if (winner === 'You') tournament.wins += 1;
            });

            if (roundIndex < tournament.lastBracket.length - 1) {
                const nextMatches = [];
                for (let i = 0; i < winners.length; i += 2) {
                    nextMatches.push({ a: winners[i], b: winners[i + 1], winner: '', aScore: 0, bScore: 0 });
                }
                tournament.lastBracket[roundIndex + 1].matches = nextMatches;
                tournament.round += 1;
            } else {
                tournament.seasonComplete = true;
                const champion = winners[0];
                if (champion === 'You') tournament.championships = (tournament.championships || 0) + 1;
                finalizeTournamentSeason(champion);
                return;
            }
            saveGame();
            updateTournamentUI();
        }

        function finalizeTournamentSeason(champion) {
            const tournament = getTournamentState();
            const wins = tournament.wins || 0;
            const championBonus = champion === 'You' ? 2 : 0;
            const score = wins + championBonus;
            const overlay = document.querySelector('.tournament-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            // P2-49: Escape handler is popped via safeTournamentPopEscape in exit paths; direct pop only if handler still active
            if (tournamentState && tournamentState._escapeHandler && typeof popModalEscape === 'function') {
                popModalEscape(tournamentState._escapeHandler);
                tournamentState._escapeHandler = null;
            }

            finalizeExpandedMiniGame({
                gameId: 'tournament',
                gameName: 'Tournament Cup',
                score,
                coinScore: Math.round((wins * 9 + championBonus * 6) * Math.max(0.5, Number((tournamentState && tournamentState.ruleModifier && tournamentState.ruleModifier.effect && tournamentState.ruleModifier.effect.coinMultiplier) || 1))),
                statDelta: {
                    happiness: Math.min(30, 8 + wins * 4 + championBonus * 3),
                    energy: -Math.min(14, 6 + wins * 2),
                    hunger: -Math.min(8, 3 + wins)
                },
                summaryStats: [
                    { label: 'Season Wins', value: wins },
                    { label: 'Champion', value: champion === 'You' ? 1 : 0 },
                    { label: 'Championships', value: tournament.championships || 0 }
                ],
                medalThresholds: { bronze: 2, silver: 3, gold: 5 },
                onAfterRewards: () => {
                    showToast(`Tournament complete. Champion: ${champion}`, champion === 'You' ? '#66BB6A' : '#FFA726');
                    tournament.seasonComplete = true;
                    saveGame();
                }
            });
            tournamentState = null;
        }

        function renderTournamentBracket(rounds) {
            return rounds.map((round, rIdx) => {
                const matchesHTML = (round.matches || []).map((match) => {
                    const winner = match.winner || '-';
                    return `<div class="tournament-match">
                        <div>${escapeHTML(match.a || '?')} <span>${match.aScore || 0}</span></div>
                        <div>${escapeHTML(match.b || '?')} <span>${match.bScore || 0}</span></div>
                        <div class="tournament-winner">Winner: ${escapeHTML(winner)}</div>
                    </div>`;
                }).join('');
                return `<div class="tournament-round ${tournamentState && tournamentState.round === rIdx ? 'active' : ''}">
                    <h4>${escapeHTML(round.name || `Round ${rIdx + 1}`)}</h4>
                    ${matchesHTML || '<p class="exp-game-note">Pending...</p>'}
                </div>`;
            }).join('');
        }

        function renderTournamentLeaderboard(leaderboard) {
            const sorted = [...leaderboard].sort((a, b) => b.points - a.points || b.wins - a.wins);
            return sorted.slice(0, 8).map((entry, idx) => (
                `<tr>
                    <td>${idx + 1}</td>
                    <td>${escapeHTML(entry.name)}</td>
                    <td>${entry.wins}</td>
                    <td>${entry.points}</td>
                </tr>`
            )).join('');
        }

        function startTournamentGame() {
            if (!gameState.pet) {
                showToast('You need a pet to enter tournaments.', '#FFA726');
                return;
            }
            // P2-48: Work on a local copy during the active session so transient fields
            // (ruleModifier, UI state) are not written to persistent storage mid-round.
            const _persistedTournament = getTournamentState();
            tournamentState = Object.assign({}, _persistedTournament, {
                lastBracket: JSON.parse(JSON.stringify(_persistedTournament.lastBracket || [])),
                leaderboard: JSON.parse(JSON.stringify(_persistedTournament.leaderboard || []))
            });
            tournamentState.ruleModifier = getMinigameRuleModifier('tournament');
            const existing = document.querySelector('.tournament-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'tournament-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Mini game tournament');
            overlay.innerHTML = `
                <div class="exp-game-shell tournament-shell">
                    <h2 class="exp-game-title">🏆 Tournament Cup${tournamentState.ruleModifier && tournamentState.ruleModifier.name ? ` · ${escapeHTML(tournamentState.ruleModifier.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="tour-season">Season ${tournamentState.season || 1}</span>
                        <span id="tour-round">Round: ${tournamentState.round + 1}</span>
                        <span id="tour-champs">Titles: ${tournamentState.championships || 0}</span>
                    </div>
                    <div class="tournament-layout">
                        <div>
                            <h3>Bracket</h3>
                            <div id="tour-bracket" class="tournament-bracket"></div>
                        </div>
                        <div>
                            <h3>Leaderboard</h3>
                            <table class="tournament-leaderboard">
                                <thead><tr><th>#</th><th>Pet</th><th>W</th><th>Pts</th></tr></thead>
                                <tbody id="tour-leaderboard"></tbody>
                            </table>
                        </div>
                    </div>
                    <p class="exp-game-note" id="tour-note">${tournamentState.ruleModifier && tournamentState.ruleModifier.description ? escapeHTML(tournamentState.ruleModifier.description) : 'Advance the bracket one round at a time.'}</p>
                    <div class="exp-game-controls">
                        <button type="button" id="tour-next">Play Next Round</button>
                        <button type="button" id="tour-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // P2-49: Guard against double popModalEscape across multiple exit paths
            let _tournamentEscapePopped = false;
            function safeTournamentPopEscape() {
                if (_tournamentEscapePopped) return;
                _tournamentEscapePopped = true;
                if (tournamentState && tournamentState._escapeHandler && typeof popModalEscape === 'function') {
                    popModalEscape(tournamentState._escapeHandler);
                }
            }
            overlay.querySelector('#tour-next').addEventListener('click', resolveTournamentRound);
            overlay.querySelector('#tour-done').addEventListener('click', () => {
                safeTournamentPopEscape();
                const root = document.querySelector('.tournament-game-overlay');
                if (root) { root.innerHTML = ''; root.remove(); }
                tournamentState = null;
                restorePostMiniGameState();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    safeTournamentPopEscape();
                    const root = document.querySelector('.tournament-game-overlay');
                    if (root) { root.innerHTML = ''; root.remove(); }
                    tournamentState = null;
                    restorePostMiniGameState();
                }
            });
            function tournamentEscapeHandler() {
                safeTournamentPopEscape();
                const root = document.querySelector('.tournament-game-overlay');
                if (root) { root.innerHTML = ''; root.remove(); }
                tournamentState = null;
                restorePostMiniGameState();
            }
            pushModalEscape(tournamentEscapeHandler);
            tournamentState._escapeHandler = tournamentEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#tour-next').focus();
            updateTournamentUI();
        }

        function updateTournamentUI() {
            if (!tournamentState) return;
            const bracket = document.getElementById('tour-bracket');
            const leaderboardBody = document.getElementById('tour-leaderboard');
            const season = document.getElementById('tour-season');
            const round = document.getElementById('tour-round');
            const champs = document.getElementById('tour-champs');
            const nextBtn = document.getElementById('tour-next');
            const note = document.getElementById('tour-note');
            if (season) season.textContent = `Season ${tournamentState.season || 1}`;
            if (round) round.textContent = tournamentState.seasonComplete ? 'Round: Completed' : `Round: ${tournamentState.round + 1}`;
            if (champs) champs.textContent = `Titles: ${tournamentState.championships || 0}`;
            if (bracket) bracket.innerHTML = renderTournamentBracket(tournamentState.lastBracket || []);
            if (leaderboardBody) leaderboardBody.innerHTML = renderTournamentLeaderboard(tournamentState.leaderboard || []);
            if (nextBtn) nextBtn.textContent = tournamentState.seasonComplete ? 'Start Next Season' : 'Play Next Round';
            if (note) note.textContent = tournamentState.seasonComplete
                ? 'Season complete. Start the next bracket when ready.'
                : 'Each round resolves all matches and updates leaderboard points.';
        }
