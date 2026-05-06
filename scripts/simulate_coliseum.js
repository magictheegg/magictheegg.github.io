
const fs = require('fs');
const path = require('path');

// --- HEADLESS DOM MOCK ---
const elementCache = new Map();
const mockElement = (id) => {
    if (id && elementCache.has(id)) return elementCache.get(id);
    const el = { 
        id: id,
        appendChild: () => {}, 
        removeChild: () => {},
        insertBefore: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        getAttribute: () => null,
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
        remove: () => {},
        style: {}, 
        classList: { 
            add: () => {}, 
            remove: () => {}, 
            contains: () => false,
            toggle: () => {}
        },
        querySelector: () => mockElement(),
        querySelectorAll: () => [],
        matches: () => false,
        dataset: {},
        innerHTML: '',
        children: [],
        get lastChild() { return mockElement(); },
        get firstElementChild() { return mockElement(); },
        content: {
            cloneNode: () => ({
                firstElementChild: mockElement()
            })
        },
        cloneNode: () => mockElement(),
        src: '',
        offsetHeight: 0,
        onclick: null
    };
    if (id) elementCache.set(id, el);
    return el;
};

global.window = {
    getComputedStyle: () => ({ opacity: '1', display: 'block', transform: 'none' }),
    requestAnimationFrame: (cb) => { 
        // Only execute once to avoid recursion in bubbles
        if (!cb.name || !cb.name.includes('updateBubblePosition')) cb(); 
    }
};
global.requestAnimationFrame = (cb) => {
    if (!cb.name || !cb.name.includes('updateBubblePosition')) cb();
};
global.document = {
    getElementById: (id) => mockElement(id),
    querySelector: (selector) => {
        if (selector.startsWith('#')) return mockElement(selector.substring(1));
        return mockElement();
    },
    querySelectorAll: () => [],
    createElement: () => mockElement(),
    body: mockElement('body'),
    addEventListener: () => {}
};
global.Image = class {};
global.Audio = class { play() {} };
global.WebKitCSSMatrix = class {
    constructor() { this.m41 = 0; this.m42 = 0; }
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.navigator = { userAgent: 'node' };

// Override timeouts for immediate execution in simulation
global.setTimeout = (fn) => fn();
global.clearTimeout = () => {};
global.setInterval = () => {};
global.clearInterval = () => {};

// Injecting node-style exports for internal functions we need to override/access
const { 
    state, CardFactory, BaseCard, availableCards: initialAvailableCards, HEROES, 
    setAvailableCards, getAvailableCards, opponentPlayTurn, performAttack, resolveDeaths,
    resetTemporaryStats, triggerETB, findTarget, tierCosts, addCounters
} = require('./coliseum.js');

// Helper to load cards
const cardData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/coliseum-cards.json'), 'utf8'));
setAvailableCards(cardData.cards);
const currentCards = getAvailableCards();
console.log(`Loaded ${currentCards.length} cards into pool.`);

const aiWeights = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/ai_weights.json'), 'utf8'));

function getCardWeight(cardName) {
    return aiWeights[cardName] || { Tier: 1, Role: 'core', Base: 1, Play: 0, Keep: 1, Tags: '' };
}

function getCardScore(cardName, player, isBuying = true) {
    const w = getCardWeight(cardName);
    const cardData = initialAvailableCards.find(c => (c.card_name || c.name) === cardName);
    const isSpell = cardData && cardData.type && !cardData.type.toLowerCase().includes('creature') && !cardData.type.toLowerCase().includes('equipment');
    
    let baseValue = (w.Base || 0);
    let keepValue = (w.Keep || 0);
    let playValue = (w.Play || 0);

    const tagKeys = Object.keys(w).filter(k => k.includes(':payoff') || k.includes(':enabler'));

    let score = 0;
    if (isBuying) {
        if (w.Role === 'utility') {
            score = baseValue + playValue;
        } else {
            const hasTags = (w.Tags && w.Tags.length > 0) || tagKeys.length > 0;
            score = hasTags ? (baseValue + playValue) : (keepValue + playValue);
        }

        // --- SPELL PRIORITIZATION LOGIC ---
        if (isSpell) {
            // Check if spell is targeted (overrides BaseCard.onApply)
            const inst = CardFactory.create(cardData);
            const isTargeted = inst && inst.onApply !== BaseCard.prototype.onApply;

            if (player.board.length === 0 && isTargeted) {
                return 0; // Cannot use targeted spells on an empty board
            }

            if (player.board.length < 3) {
                score *= 0.5; // Prioritize building a baseline board over buying utility spells
            }
        } else if (player.board.length < 3) {
            score += 2; // Slight boost to creatures when board is thin
        }
    } else {
        score = keepValue;
    }

    // Archetype Synergy
    let tags = (w.Tags || '').split(',').map(t => t.trim()).filter(t => t);
    tags = tags.concat(tagKeys);

    // Implicit Spell Synergy: All spells enable the "spells" archetype
    if (isSpell && !tags.some(t => t.startsWith('spells:'))) {
        tags.push('spells:enabler');
    }

    if (tags.length > 0) {
        tags.forEach(tStr => {
            const [archetype, type] = tStr.split(':');
            if (!archetype) return;

            const hasPayoffOnBoard = player.board.some(c => {
                const cw = getCardWeight(c.card_name || c.name);
                return (cw.Tags && cw.Tags.includes(`${archetype}:payoff`)) || (cw[`${archetype}:payoff`] !== undefined);
            });
            const hasEnablerOnBoard = player.board.some(c => {
                const cw = getCardWeight(c.card_name || c.name);
                return (cw.Tags && cw.Tags.includes(`${archetype}:enabler`)) || (cw[`${archetype}:enabler`] !== undefined);
            });

            if (type === 'payoff') {
                if (hasEnablerOnBoard) {
                    score += (keepValue - baseValue);
                } else if (isBuying) {
                    score += (keepValue - baseValue) * 0.6;
                }
            }
            if (type === 'enabler') {
                if (hasPayoffOnBoard) {
                    score += 5;
                } else if (isBuying) {
                    score += 2;
                }
            }
        });
    }

    return score;
}

function castSpell(inst, player) {
    const isSpell = inst.type && !inst.type.toLowerCase().includes('creature') && !inst.type.toLowerCase().includes('equipment');
    if (!isSpell) return false;

    if (player.board.length > 0) {
        // Check if the spell is targeted (overrides BaseCard.onApply)
        const isTargeted = inst.onApply !== BaseCard.prototype.onApply;

        if (isTargeted) {
            // Pick the best target: the one with the highest Keep score
            let bestTarget = player.board[0];
            let maxKeep = -1;
            player.board.forEach(c => {
                const s = getCardScore(c.card_name || c.name, player, false);
                if (s > maxKeep) {
                    maxKeep = s;
                    bestTarget = c;
                }
            });
            inst.onApply(bestTarget, player.board);
        } else {
            inst.onCast(player.board);
        }
        player.board.forEach(c => c.onNoncreatureSpellCast(inst, player.board));
        return true;
    }
    return false;
}

// Statistics collection
const stats = {
    early: { rounds: 0, cardStats: {}, heroStats: {} },
    mid:   { rounds: 0, cardStats: {}, heroStats: {} },
    late:  { rounds: 0, cardStats: {}, heroStats: {} }
};

function getPhase(turn) {
    if (turn <= 5) return 'early';
    if (turn <= 10) return 'mid';
    return 'late';
}

function trackCard(cardName, result, turn, isPlay = false) {
    const phase = getPhase(turn);
    if (!cardName) return;

    if (!stats[phase].cardStats[cardName]) {
        stats[phase].cardStats[cardName] = { appearances: 0, wins: 0, losses: 0, draws: 0, plays: 0, playWins: 0, playLosses: 0, playDraws: 0 };
    }

    const cardStats = stats[phase].cardStats[cardName];

    if (isPlay) {
        cardStats.plays++;
        if (result === 'win') cardStats.playWins++;
        else if (result === 'loss') cardStats.playLosses++;
        else cardStats.playDraws++;
    } else {
        cardStats.appearances++;
        if (result === 'win') cardStats.wins++;
        else if (result === 'loss') cardStats.losses++;
        else cardStats.draws++;
    }
}

function trackHero(heroName, result, turn) {
    const phase = getPhase(turn);
    if (!heroName) return;

    if (!stats[phase].heroStats[heroName]) {
        stats[phase].heroStats[heroName] = { appearances: 0, wins: 0, losses: 0, draws: 0 };
    }
    stats[phase].heroStats[heroName].appearances++;
    if (result === 'win') stats[phase].heroStats[heroName].wins++;
    else if (result === 'loss') stats[phase].heroStats[heroName].losses++;
    else stats[phase].heroStats[heroName].draws++;
}

function resolveTargetingQueue(p) {
    while (state.targetingQueue && state.targetingQueue.length > 0) {
        const effect = state.targetingQueue.shift();
        const board = p.board;
        const source = board.find(c => c.id === effect.sourceId);
        
        if (!source) continue;

        // Find potential targets (other than source)
        const targets = board.filter(c => c.id !== source.id);
        if (targets.length === 0) continue;

        const target = targets[Math.floor(Math.random() * targets.length)];
        const targetIdx = board.indexOf(target);

        if (effect.effect === 'intli_sacrifice') {
            board.splice(targetIdx, 1);
            board.forEach(c => c.onOtherCreatureDeath(target, board));
            const multiplier = source.isFoil ? 2 : 1;
            source.tempPower += (2 * multiplier);
            source.tempToughness += (2 * multiplier);
        } else if (effect.effect === 'wechuge_sacrifice') {
            board.splice(targetIdx, 1);
            board.forEach(c => c.onOtherCreatureDeath(target, board));
            const multiplier = source.isFoil ? 2 : 1;
            addCounters(source, multiplier, board);
        } else if (effect.effect === 'harpy_cannibalize') {
            if (p.gold >= 1) {
                p.gold -= 1;
                board.splice(targetIdx, 1);
                board.forEach(c => c.onOtherCreatureDeath(target, board));
                const multiplier = source.isFoil ? 2 : 1;
                addCounters(source, 2 * multiplier, board);
                if (!source.enchantments) source.enchantments = [];
                source.enchantments.push({ card_name: 'Cannibalize', rules_text: 'Lifelink', isTemporary: true });
            }
        }
    }
}

async function simulateCombat(p1, p2) {
    state.phase = 'BATTLE';
    state.player = p1;
    state.opponents = [p2];
    state.currentOpponentId = 0;
    state.overallHpReducedThisFight = false;

    const currentOpp = p2;

    state.player.fightHp = 5 + (5 * p1.tier);
    currentOpp.fightHp = 5 + (5 * p2.tier);

    // 1. Create Combat Snapshots (Clones)
    state.battleBoards = {
        player: p1.board.map(c => {
            const inst = c.clone();
            inst.owner = 'player';
            inst.sourceId = c.id;
            return inst;
        }),
        opponent: p2.board.map(c => {
            const inst = c.clone();
            inst.owner = 'opponent';
            inst.sourceId = c.id;
            return inst;
        })
    };

    // 2. Initialize Queues
    state.battleQueues = {
        player: state.battleBoards.player.filter(c => !c.isLockedByChivalry),
        opponent: state.battleBoards.opponent.filter(c => !c.isLockedByChivalry)
    };
    
    state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';
    let turnsInCurrentRound = 0;

    // 3. MAIN COMBAT LOOP
    let maxTurns = 400; 
    while (state.player.fightHp > 0 && currentOpp.fightHp > 0 && 
          (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0) && maxTurns > 0) {
        
        maxTurns--;

        if (turnsInCurrentRound === 0 || turnsInCurrentRound >= 2) {
            const pHasHaste = state.battleQueues.player.length > 0 && state.battleQueues.player[0].hasKeyword('Haste');
            const oHasHaste = state.battleQueues.opponent.length > 0 && state.battleQueues.opponent[0].hasKeyword('Haste');

            if (pHasHaste && !oHasHaste) state.attackerSide = 'player';
            else if (oHasHaste && !pHasHaste) state.attackerSide = 'opponent';
            turnsInCurrentRound = 0;
        }

        const currentQueue = state.battleQueues[state.attackerSide];
        if (currentQueue.length > 0) {
            const attacker = currentQueue.shift();
            const attackerBoard = (state.attackerSide === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
            
            if (attackerBoard.includes(attacker) && !attacker.isDying) {
                const defenderBoard = (state.attackerSide === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                let defender = findTarget(attacker, defenderBoard);
                
                const hasDoubleStrike = attacker.hasKeyword('Double strike');
                
                if (hasDoubleStrike) {
                    await performAttack(attacker, defender, true);
                    await resolveDeaths();
                    
                    if (state.player.fightHp > 0 && currentOpp.fightHp > 0) {
                        if (attackerBoard.includes(attacker) && !attacker.isDying) {
                            const defenderDied = defender && (!defenderBoard.includes(defender) || defender.isDying || defender.isDestroyed);
                            if (!defenderDied) {
                                await performAttack(attacker, defender, false);
                                await resolveDeaths();
                            }
                        }
                    }
                } else {
                    const hasFirstStrike = attacker.hasKeyword('First strike');
                    await performAttack(attacker, defender, hasFirstStrike);
                    await resolveDeaths();
                }

                if (attackerBoard.includes(attacker) && !attacker.isDying) {
                    currentQueue.push(attacker);
                }
            }
        }

        turnsInCurrentRound++;
        state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
    }

    if (currentOpp.fightHp <= 0 && state.player.fightHp > 0) return 'player';
    if (state.player.fightHp <= 0 && currentOpp.fightHp > 0) return 'opponent';
    
    // Draw resolution: Most survivors win
    if (state.battleBoards.player.length > state.battleBoards.opponent.length) {
        return 'player';
    }
    if (state.battleBoards.opponent.length > state.battleBoards.player.length) {
        return 'opponent';
    }

    return 'draw';
}

async function runSimulation(iterations = 500, turnsPerGame = 15) {
    console.log(`Starting simulation: ${iterations} games, ${turnsPerGame} turns each.`);

    for (let g = 0; g < iterations; g++) {
        if (g % 10 === 0) {
            console.log(`Simulation Progress: Game ${g}/${iterations}...`);
        }
        // Initialize 8 AI Players
        const players = [];
        const heroPool = Object.values(HEROES).filter(h => h.name !== 'Marketto');
        for (let i = 0; i < 8; i++) {
            const hero = heroPool[Math.floor(Math.random() * heroPool.length)];
            players.push({
                id: i,
                hero: hero,
                name: hero.name,
                board: [],
                hand: [],
                gold: 3,
                tier: 1,
                overallHp: 20,
                spellGraveyard: []
            });
        }

        // Track how many turns each player has spent at each tier for cost reduction
        players.forEach(p => p.turnsAtCurrentTier = 0);

        for (let t = 1; t <= turnsPerGame; t++) {
            state.turn = t;
            state.phase = 'SHOP';

            // 1. Heuristic Shop Phase for everyone
            players.forEach(p => {
                if (p.overallHp <= 0) return;
                state.player = p;
                p.gold = Math.min(2 + state.turn, 10);

                // --- SMART TIERING with Reduction ---
                // Reduction: cost goes down by 1 for each turn spent at that tier
                const baseCost = tierCosts[p.tier];
                const currentCost = Math.max(0, baseCost - (p.turnsAtCurrentTier || 0));

                if (p.tier < 5 && p.gold >= currentCost) {
                    // Turn 1 & 2: Always prioritize building a board over tiering
                    // Turn 3+: Tier if we have enough gold or a decent board
                    let shouldTier = false;
                    if (state.turn === 1 || state.turn === 2) {
                        shouldTier = false; 
                    } else if (state.turn === 3) {
                        shouldTier = true; // Tiering on T3 is the standard baseline
                    } else {
                        shouldTier = (p.board.length >= 5) || (p.gold >= currentCost + 3) || (currentCost === 0);
                    }

                    if (shouldTier) {
                        p.gold -= currentCost;
                        p.tier++;
                        p.turnsAtCurrentTier = 0;
                    } else {
                        p.turnsAtCurrentTier++;
                    }
                } else {
                    p.turnsAtCurrentTier++;
                }

                
                // --- HEURISTIC BUYING & SELLING ---
                const allCards = getAvailableCards();
                const pool = allCards.filter(c => c.shape !== 'token' && (c.tier || 1) <= p.tier);
                
                if (!p.cardsPlayedThisTurn) p.cardsPlayedThisTurn = [];

                let buyAttempts = 0;
                while (p.gold >= 3 && buyAttempts < 10) {
                    buyAttempts++;
                    // Simulate a shop of 5 cards
                    const shopOptions = [];
                    for (let i = 0; i < 5; i++) {
                        shopOptions.push(pool[Math.floor(Math.random() * pool.length)]);
                    }

                    // Score options
                    const scoredOptions = shopOptions.map(data => ({
                        data,
                        score: getCardScore(data.card_name || data.name, p, true)
                    })).sort((a, b) => b.score - a.score);

                    const best = scoredOptions[0];
                    if (!best || best.score <= 0) break;

                    const weight = getCardWeight(best.data.card_name || best.data.name);
                    const inst = CardFactory.create(best.data);
                    if (!inst) continue;

                    inst.owner = 'player';
                    const isSpell = inst.type && !inst.type.toLowerCase().includes('creature') && !inst.type.toLowerCase().includes('equipment');
                    
                    // Track that this card was "played" this turn for Play Rate stats
                    p.cardsPlayedThisTurn.push(inst.card_name || inst.name);

                    if (isSpell) {
                        p.gold -= 3;
                        if (!castSpell(inst, p)) {
                            p.gold += 3; // Refund if no targets
                            p.cardsPlayedThisTurn.pop();
                        }
                    } else if (weight.Role === 'utility') {
                        // BUY, PLAY, SELL
                        p.gold -= 3;
                        p.board.push(inst);
                        inst.onETB(p.board);
                        p.board.forEach(c => { if (c.id !== inst.id) c.onOtherCreatureETB(inst, p.board); });
                        
                        // Sell immediately
                        const soldIdx = p.board.indexOf(inst);
                        p.board.splice(soldIdx, 1);
                        p.gold += 1;
                        p.board.forEach(c => c.onOtherCreatureDeath(inst, p.board));
                    } else {
                        // CORE / ENGINE
                        if (p.board.length < 7) {
                            p.gold -= 3;
                            p.board.push(inst);
                            inst.onETB(p.board);
                            p.board.forEach(c => { if (c.id !== inst.id) c.onOtherCreatureETB(inst, p.board); });
                        } else {
                            // Find weakest on board
                            let weakestIdx = -1;
                            let minBoardScore = Infinity;
                            p.board.forEach((c, idx) => {
                                const s = getCardScore(c.card_name || c.name, p, false); // isBuying = false
                                if (s < minBoardScore) {
                                    minBoardScore = s;
                                    weakestIdx = idx;
                                }
                            });

                            if (best.score > minBoardScore) {
                                const sold = p.board.splice(weakestIdx, 1)[0];
                                p.gold += 1;
                                p.board.forEach(c => c.onOtherCreatureDeath(sold, p.board));

                                p.gold -= 3;
                                p.board.push(inst);
                                inst.onETB(p.board);
                                p.board.forEach(c => { if (c.id !== inst.id) c.onOtherCreatureETB(inst, p.board); });
                            } else {
                                break; 
                            }
                        }
                    }
                }

                // Randomize board order
                p.board.sort(() => Math.random() - 0.5);

                // --- Randomized Action Phase ---
                // Each creature gets one chance to use its action if it has one
                p.board.forEach(c => {
                    if (c.onAction && Math.random() < 0.5) {
                        const oldGold = p.gold;
                        c.onAction();
                        // If it cost gold, it happened
                        if (c.actionCost && p.gold < oldGold) {
                            // Already handled in coliseum.js usually, but we need to resolve the queue
                        }
                        resolveTargetingQueue(p);
                    }
                });
            });

            // 2. Battle Phase (Round Robin with Ghost)
            let activePlayers = players.filter(p => p.overallHp > 0);
            if (activePlayers.length < 2) break;

            // Handle odd player count with a ghost
            if (activePlayers.length % 2 !== 0) {
                // Find a player who was recently eliminated to be the ghost
                const ghostSource = players.find(p => p.overallHp <= 0) || players[Math.floor(Math.random() * players.length)];
                const ghostPlayer = JSON.parse(JSON.stringify(ghostSource)); // Deep clone to get a plain object
                ghostPlayer.isGhost = true;
                // CRITICAL: Convert plain objects back into card instances
                ghostPlayer.board = ghostSource.board.map(c => CardFactory.create(c));
                activePlayers.push(ghostPlayer);
            }

            const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i += 2) {
                const p1 = shuffled[i];
                const p2 = shuffled[i+1];
                if (!p1 || !p2) continue;
                
                const result = await simulateCombat(p1, p2);
                const phase = getPhase(t);
                stats[phase].rounds++;

                if (result === 'player') {
                    // p1 wins, p2 loses
                    p1.board.forEach(c => trackCard(c.card_name || c.name, 'win', t, false));
                    (p1.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'win', t, true));

                    p2.board.forEach(c => trackCard(c.card_name || c.name, 'loss', t, false));
                    (p2.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'loss', t, true));

                    trackHero(p1.hero.name, 'win', t);
                    trackHero(p2.hero.name, 'loss', t);
                    if (!state.overallHpReducedThisFight) {
                        p2.overallHp -= p1.tier;
                    }
                } else if (result === 'opponent') {
                    // p2 wins, p1 loses
                    p1.board.forEach(c => trackCard(c.card_name || c.name, 'loss', t, false));
                    (p1.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'loss', t, true));

                    p2.board.forEach(c => trackCard(c.card_name || c.name, 'win', t, false));
                    (p2.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'win', t, true));

                    trackHero(p1.hero.name, 'loss', t);
                    trackHero(p2.hero.name, 'win', t);
                    if (!state.overallHpReducedThisFight) {
                        p1.overallHp -= p2.tier;
                    }
                } else {
                    p1.board.forEach(c => trackCard(c.card_name || c.name, 'draw', t, false));
                    (p1.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'draw', t, true));

                    p2.board.forEach(c => trackCard(c.card_name || c.name, 'draw', t, false));
                    (p2.cardsPlayedThisTurn || []).forEach(name => trackCard(name, 'draw', t, true));

                    trackHero(p1.hero.name, 'draw', t);
                    trackHero(p2.hero.name, 'draw', t);
                }
            }
            
            // Post-combat cleanup
            players.forEach(p => {
                p.cardsPlayedThisTurn = []; // Clear for next turn
                state.player = p;
                resetTemporaryStats();
            });
        }
    }

    // Output Results
    const phases = ['early', 'mid', 'late'];
    const finalResults = {};

    phases.forEach(phase => {
        const sortedCardsByAppearance = Object.entries(stats[phase].cardStats)
            .map(([name, s]) => ({ name, winRate: ((s.wins + s.draws * 0.5) / s.appearances * 100).toFixed(2), appearances: s.appearances }))
            .sort((a, b) => b.winRate - a.winRate);
        
        const sortedCardsByPlay = Object.entries(stats[phase].cardStats)
            .filter(([name, s]) => s.plays > 0)
            .map(([name, s]) => ({ name, playWinRate: ((s.playWins + s.playDraws * 0.5) / s.plays * 100).toFixed(2), plays: s.plays }))
            .sort((a, b) => b.playWinRate - a.playWinRate);

        const sortedHeroes = Object.entries(stats[phase].heroStats)
            .map(([name, s]) => ({ name, winRate: ((s.wins + s.draws * 0.5) / s.appearances * 100).toFixed(2), appearances: s.appearances }))
            .sort((a, b) => b.winRate - a.winRate);

        console.log(`\n--- RESULTS FOR PHASE: ${phase.toUpperCase()} (Turns ${phase === 'early' ? '1-5' : (phase === 'mid' ? '6-10' : '11-15')}) ---`);
        console.log("Top 10 Cards by Play Impact:");
        console.log(sortedCardsByPlay.slice(0, 10));
        console.log("\nTop 10 Cards by On-Board Win Rate:");
        console.log(sortedCardsByAppearance.slice(0, 10));
        console.log("\nHero Performance:");
        console.log(sortedHeroes);

        finalResults[phase] = {
            summary: { rounds: stats[phase].rounds },
            byPlay: sortedCardsByPlay,
            byAppearance: sortedCardsByAppearance,
            heroes: sortedHeroes
        };
    });

    fs.writeFileSync('simulation_results.json', JSON.stringify(finalResults, null, 4));
    
    process.exit(0);
}

runSimulation(500, 15);
