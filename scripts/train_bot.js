const fs = require('fs');
const path = require('path');

// --- HEADLESS DOM & ENVIRONMENT MOCK ---
const mockElement = (id) => {
    return { 
        id: id, appendChild: () => {}, removeChild: () => {}, insertBefore: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {},
        removeAttribute: () => {}, getAttribute: () => null,
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
        remove: () => {}, style: {}, 
        classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
        querySelector: () => mockElement(), querySelectorAll: () => [], matches: () => false,
        dataset: {}, innerHTML: '', children: [],
        get lastChild() { return mockElement(); }, get firstElementChild() { return mockElement(); },
        content: { cloneNode: () => ({ firstElementChild: mockElement() }) },
        cloneNode: () => mockElement(), src: '', offsetHeight: 0, onclick: null
    };
};

global.window = {
    getComputedStyle: () => ({ opacity: '1', display: 'block', transform: 'none' }),
    requestAnimationFrame: (cb) => { if (!cb.name || !cb.name.includes('updateBubblePosition')) cb(); },
    location: { search: '' },
    IS_TRAINING_GROUNDS: true
};
global.requestAnimationFrame = (cb) => { if (!cb.name || !cb.name.includes('updateBubblePosition')) cb(); };
global.document = {
    getElementById: (id) => mockElement(id),
    querySelector: (selector) => mockElement(selector),
    querySelectorAll: () => [],
    createElement: () => mockElement(),
    body: mockElement('body'),
    addEventListener: () => {}
};
global.pulseCardElement = () => {};
global.Image = class {};
global.Audio = class { play() {} };
global.WebKitCSSMatrix = class { constructor() { this.a = 1; this.m41 = 0; this.m42 = 0; } };
global.setTimeout = (fn) => fn();
global.clearTimeout = () => {};
global.setInterval = () => {};
global.clearInterval = () => {};

// Import Coliseum Engine
const coliseum = require('./coliseum.js');
const { 
    state, CardFactory, BaseCard, HEROES, setAvailableCards, getAvailableCards,
    performAttack, resolveDeaths, findTarget, resolveStartOfCombatTriggers, getOpponent,
    triggerETB, addCounters, tierCosts
} = coliseum;

// Enable headless simulation mode
state.isSimulating = true;
coliseum.render = () => {};

const cardData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/coliseum-cards.json'), 'utf8'));
setAvailableCards(cardData.cards);
const ALL_CARDS = getAvailableCards();

const HERO_NAMES = [
    "Xylo", "Xiong Mao", "Seto San", "Panya", "Dawson", "Mafua", "Crain", 
    "Arietta", "Herrea", "Adelaide", "Heping", "Jake", "Kism", "Enoch", "Autumn"
];

// --- GAUNTLET POOL (EMPIRICAL BENCHMARK BOARDS) ---
const GAUNTLET = {};
for (let t = 1; t <= 20; t++) GAUNTLET[t] = [];

function loadGauntlet() {
    const archiveDir = path.join(__dirname, '../resources/training-data/Archive');
    if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json') && !f.includes('_old'));
        files.forEach(file => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(archiveDir, file), 'utf8'));
                data.forEach(entry => {
                    if (entry.turn && entry.preCombatBoard && entry.preCombatBoard.length > 0) {
                        GAUNTLET[entry.turn].push(entry);
                    }
                });
            } catch (e) {}
        });
    }

    const trainingDir = path.join(__dirname, '../resources/training-data');
    if (fs.existsSync(trainingDir)) {
        const files = fs.readdirSync(trainingDir).filter(f => f.startsWith('training_') && f.endsWith('.json') && !f.includes('_old'));
        files.forEach(file => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(trainingDir, file), 'utf8'));
                data.forEach(entry => {
                    if (entry.turn && entry.preCombatBoard && entry.preCombatBoard.length > 0) {
                        GAUNTLET[entry.turn].push(entry);
                    }
                });
            } catch (e) {}
        });
    }
}
loadGauntlet();

function buildBoardFromSnapshot(snapshot) {
    return (snapshot || []).map(c => {
        const raw = ALL_CARDS.find(ac => ac.card_name === c.card_name);
        const inst = CardFactory.create({ ...raw, ...c });
        if (c.equipment) {
            const eqRaw = ALL_CARDS.find(ac => ac.card_name === c.equipment.card_name);
            inst.equipment = CardFactory.create({ ...eqRaw, ...c.equipment });
        }
        return inst;
    });
}

function getGauntletSample(turn, count = 4) {
    const pool = GAUNTLET[turn];
    if (!pool || pool.length === 0) {
        const tier = Math.min(5, Math.ceil(turn / 3));
        return [{
            hero: HEROES.xylo,
            tier: tier,
            fightHp: 5 + (5 * tier),
            board: []
        }];
    }
    const sample = [];
    const countToPick = Math.min(count, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < countToPick; i++) {
        const entry = shuffled[i];
        const hKey = Object.keys(HEROES).find(k => HEROES[k].name === entry.hero) || 'xylo';
        sample.push({
            hero: HEROES[hKey],
            tier: entry.tier || 1,
            fightHp: 5 + (5 * (entry.tier || 1)),
            board: buildBoardFromSnapshot(entry.preCombatBoard)
        });
    }
    return sample;
}

function addBoardToGauntlet(turn, heroName, tier, board) {
    if (!GAUNTLET[turn]) GAUNTLET[turn] = [];
    GAUNTLET[turn].push({
        hero: heroName,
        turn: turn,
        tier: tier,
        preCombatBoard: serializeBoard(board)
    });
}

// --- FAST HEADLESS COMBAT SIMULATOR ---
async function simulateCombatQuick(p1, p2) {
    state.phase = 'BATTLE';
    state.overallHpReducedThisFight = false;
    
    state.battleBoards = {
        player: p1.board.map(c => { const cl = c.clone(); cl.owner = 'player'; return cl; }),
        opponent: p2.board.map(c => { const cl = c.clone(); cl.owner = 'opponent'; return cl; })
    };

    state.battleQueues = {
        player: [...state.battleBoards.player].filter(c => !c.isLockedByChivalry),
        opponent: [...state.battleBoards.opponent].filter(c => !c.isLockedByChivalry)
    };

    const simP1 = { ...p1, hand: p1.hand || [], spellGraveyard: p1.spellGraveyard || [], board: state.battleBoards.player };
    const simP2 = { ...p2, hand: p2.hand || [], spellGraveyard: p2.spellGraveyard || [], board: state.battleBoards.opponent };
    state.player = simP1;
    state.opponents = [simP2];
    state.currentOpponentId = 0;

    const opp = getOpponent();
    state.player.firstFaceDamageSourceId = null;
    state.player.mercyExhausted = false;
    if (opp) {
        opp.firstFaceDamageSourceId = null;
        opp.mercyExhausted = false;
    }

    await resolveStartOfCombatTriggers(simP2);

    // Refresh battleQueues after triggers (e.g. Crain's start of combat clone, Troika clones)
    state.battleQueues = {
        player: [...state.battleBoards.player].filter(c => !c.isLockedByChivalry),
        opponent: [...state.battleBoards.opponent].filter(c => !c.isLockedByChivalry)
    };

    state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';
    let turnsInCurrentRound = 0;
    let maxTurns = 200;

    while (state.player.fightHp > 0 && opp.fightHp > 0 && (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0) && maxTurns > 0) {
        maxTurns--;
        if (turnsInCurrentRound === 0 || turnsInCurrentRound >= 2) {
            const pHasHaste = state.battleQueues.player.length > 0 && state.battleQueues.player[0].hasKeyword('Haste');
            const oHasHaste = state.battleQueues.opponent.length > 0 && state.battleQueues.opponent[0].hasKeyword('Haste');
            if (pHasHaste && !oHasHaste) state.attackerSide = 'player';
            else if (oHasHaste && !pHasHaste) state.attackerSide = 'opponent';
            turnsInCurrentRound = 0;
        }

        const side = state.attackerSide;
        const currentQueue = state.battleQueues[side];
        if (currentQueue.length > 0) {
            const attacker = currentQueue.shift();
            const attackerBoard = state.battleBoards[side];
            if (attackerBoard.includes(attacker) && !attacker.isDying) {
                const defenderBoard = state.battleBoards[side === 'player' ? 'opponent' : 'player'];
                const defender = findTarget(attacker, defenderBoard);
                
                if (attacker.hasKeyword('Double strike')) {
                    await performAttack(attacker, defender, true);
                    await resolveDeaths();
                    if (state.player.fightHp > 0 && opp.fightHp > 0 && attackerBoard.includes(attacker) && !attacker.isDying) {
                        if (defender && defenderBoard.includes(defender) && !defender.isDying && !defender.isDestroyed) {
                            await performAttack(attacker, defender, false);
                            await resolveDeaths();
                        }
                    }
                } else {
                    await performAttack(attacker, defender, attacker.hasKeyword('First strike'));
                    await resolveDeaths();
                }

                const enemy = (side === 'player') ? opp : state.player;
                if (enemy && enemy.firstFaceDamageSourceId === attacker.id) {
                    enemy.mercyExhausted = true;
                }

                if (attackerBoard.includes(attacker) && !attacker.isDying) currentQueue.push(attacker);
            }
        }
        turnsInCurrentRound++;
        state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
    }

    const pFightHp = state.player.fightHp;
    const oFightHp = opp.fightHp;
    return {
        win: pFightHp > oFightHp,
        tie: pFightHp === oFightHp,
        hpDelta: pFightHp - oFightHp
    };
}

// --- EMPIRICAL BOARD EVALUATOR ---
async function evaluateBoard(board, pHero, pTier, gauntletSample, reps = 1) {
    if (!board || board.length === 0) return -50;
    let totalScore = 0;
    let count = 0;
    const testP = { hero: pHero, tier: pTier, fightHp: 5 + (5 * pTier), board: board };

    for (const opp of gauntletSample) {
        for (let r = 0; r < reps; r++) {
            const res = await simulateCombatQuick(testP, opp);
            totalScore += (res.win ? 40 : (res.tie ? 15 : 0)) + res.hpDelta;
            count++;
        }
    }
    return count > 0 ? totalScore / count : 0;
}

// --- ZERO-ASSUMPTION BOARD POSITIONING OPTIMIZER ---
async function optimizeBoardPositioning(board, pHero, pTier, gauntletSample) {
    if (!board || board.length <= 1) return board;

    let currentBoard = [...board];
    let currentScore = await evaluateBoard(currentBoard, pHero, pTier, gauntletSample, 1);
    const len = currentBoard.length;

    // 1. If small board (<= 4 creatures), test ALL permutations!
    if (len <= 4) {
        const perms = [];
        function permute(arr, m = []) {
            if (arr.length === 0) perms.push(m);
            else {
                for (let i = 0; i < arr.length; i++) {
                    const curr = arr.slice();
                    const next = curr.splice(i, 1);
                    permute(curr.slice(), m.concat(next));
                }
            }
        }
        permute(currentBoard);

        let bestPerm = currentBoard;
        let bestScore = currentScore;
        for (const p of perms) {
            const sc = await evaluateBoard(p, pHero, pTier, gauntletSample, 1);
            if (sc > bestScore) {
                bestScore = sc;
                bestPerm = p;
            }
        }
        return bestPerm;
    }

    // 2. For len >= 5: Hill-climbing pairwise swap search across all pairs
    for (let pass = 0; pass < 2; pass++) {
        let bestSwap = null;
        let bestSwapScore = currentScore;

        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                const candidate = [...currentBoard];
                const tmp = candidate[i];
                candidate[i] = candidate[j];
                candidate[j] = tmp;

                const sc = await evaluateBoard(candidate, pHero, pTier, gauntletSample, 1);
                if (sc > bestSwapScore) {
                    bestSwapScore = sc;
                    bestSwap = candidate;
                }
            }
        }

        if (bestSwap && bestSwapScore > currentScore) {
            currentBoard = bestSwap;
            currentScore = bestSwapScore;
        } else {
            break;
        }
    }

    // 3. Test a few candidate shuffles to ensure no local traps
    for (let s = 0; s < 3; s++) {
        const candidate = [...currentBoard].sort(() => Math.random() - 0.5);
        const sc = await evaluateBoard(candidate, pHero, pTier, gauntletSample, 1);
        if (sc > currentScore) {
            currentBoard = candidate;
            currentScore = sc;
        }
    }

    return currentBoard;
}

// --- CONSOLIDATE TRIPLES ---
function consolidateTriples(board) {
    const counts = {};
    board.forEach(c => {
        if (!c.isFoil) counts[c.card_name] = (counts[c.card_name] || 0) + 1;
    });

    Object.entries(counts).forEach(([name, count]) => {
        if (count >= 3) {
            const matches = board.filter(c => c.card_name === name && !c.isFoil);
            const keep = matches[0];
            const toRemove = matches.slice(1, 3);
            toRemove.forEach(rem => {
                keep.counters = (keep.counters || 0) + (rem.counters || 0);
                keep.tempPower = (keep.tempPower || 0) + (rem.tempPower || 0);
                keep.tempToughness = (keep.tempToughness || 0) + (rem.tempToughness || 0);
                keep.flyingCounters = (keep.flyingCounters || 0) + (rem.flyingCounters || 0);
                keep.shieldCounters = Math.max(keep.shieldCounters || 0, rem.shieldCounters || 0);
                if (rem.equipment && !keep.equipment) keep.equipment = rem.equipment;
                const idx = board.indexOf(rem);
                if (idx !== -1) board.splice(idx, 1);
            });
            keep.isFoil = true;
            keep.tempPower += 2;
            keep.tempToughness += 2;
        }
    });
}

// --- POPULATE SHOP ---
function populateShop(playerTier, availableCards, isAugmented = false) {
    let creaturesTarget = 3;
    if (playerTier === 2 || playerTier === 3) creaturesTarget = 4;
    else if (playerTier === 4) creaturesTarget = 5;
    else if (playerTier === 5) creaturesTarget = 6;
    const spellsTarget = 1;

    const maxPoolTier = isAugmented ? Math.min(5, playerTier + 1) : playerTier;
    const creaturePool = availableCards.filter(c => (c.type?.toLowerCase().includes('creature') || c.type?.toLowerCase().includes('equipment')) && c.shape !== 'token' && (c.tier || 1) <= maxPoolTier);
    const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment') && c.shape !== 'token' && (c.tier || 1) <= maxPoolTier);

    const shop = [];
    while (shop.length < 7 && shop.filter(c => c.type?.toLowerCase().includes('creature') || c.type?.toLowerCase().includes('equipment')).length < creaturesTarget) {
        const hasEquip = shop.some(c => c.type?.toLowerCase().includes('equipment'));
        let subPool = hasEquip ? creaturePool.filter(c => !c.type?.toLowerCase().includes('equipment')) : creaturePool;
        if (subPool.length === 0) break;
        shop.push(CardFactory.create(subPool[Math.floor(Math.random() * subPool.length)]));
    }
    while (shop.length < 7 && shop.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment')).length < spellsTarget) {
        if (spellPool.length === 0) break;
        shop.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
    }
    return shop;
}

// --- SIMULATION-DRIVEN SHOP SEARCH (ZERO ASSUMPTIONS) ---
async function playSimulationShopTurn(player, turn) {
    state.phase = 'SHOP';
    state.turn = turn;
    state.player = player;
    player.hand = player.hand || [];
    player.spellGraveyard = player.spellGraveyard || [];

    const gauntletSample = getGauntletSample(turn, 4);

    // 1. Tier cost reduction
    if (player.tier < 5 && turn > 1) {
        player.tierCostReduction = (player.tierCostReduction || 0) + 1;
    }

    // 2. Gold calculation
    let gold = Math.min(2 + turn, 10) + (player.treasures || 0);
    player.treasures = 0;
    if (player.hero.name === 'Panya' && turn <= 2) gold = 0;
    player.gold = gold;

    // 3. Shop Level-Up Check via Curve Milestones
    const nextTier = player.tier + 1;
    if (nextTier <= 5) {
        const baseCost = tierCosts[player.tier] || 5;
        const currentCost = Math.max(0, baseCost - (player.tierCostReduction || 0));
        const targetTurns = [0, 0, 2, 5, 8, 10];
        const shouldLevel = (turn >= targetTurns[nextTier] && player.gold >= currentCost) || 
                            (player.board.length >= 6 && player.gold >= currentCost) ||
                            (player.gold >= currentCost + 3);
        if (shouldLevel && player.gold >= currentCost) {
            player.gold -= currentCost;
            player.tier = nextTier;
            player.tierCostReduction = 0;

            // Arietta Hero Power: Tier 4 Seek Equipment
            if (player.hero.name === 'Arietta' && player.tier === 4) {
                const eqPool = ALL_CARDS.filter(c => c.type?.toLowerCase().includes('equipment') && c.shape !== 'token');
                if (eqPool.length > 0 && player.board.length > 0) {
                    const eq = CardFactory.create(eqPool[Math.floor(Math.random() * eqPool.length)]);
                    player.board[0].equipment = eq;
                }
            }
        }
    }

    // 4. Populate Shop
    let shop = populateShop(player.tier, ALL_CARDS);
    let rerollsUsed = 0;
    const maxRerolls = 2;

    // 5. BEAM SEARCH FOR SHOP ACTIONS
    let beam = [{
        board: player.board.map(c => c.clone()),
        gold: player.gold,
        shop: shop.map(c => c.clone()),
        rerollsLeft: maxRerolls,
        score: await evaluateBoard(player.board, player.hero, player.tier, gauntletSample, 1)
    }];

    const BEAM_WIDTH = 5;
    let maxSteps = 4;

    while (maxSteps > 0) {
        maxSteps--;
        state.phase = 'SHOP';
        state.player = player;
        player.hand = player.hand || [];
        player.spellGraveyard = player.spellGraveyard || [];

        const candidates = [];

        for (const s of beam) {
            // ALWAYS allow standing pat / holding current board and gold!
            candidates.push({
                board: s.board.map(c => c.clone()),
                gold: s.gold,
                shop: s.shop.map(c => c.clone()),
                rerollsLeft: s.rerollsLeft,
                score: s.score
            });

            if (s.gold < 1) continue;

            const boardCap = (player.hero.name === 'Crain') ? 6 : 7;

            // Generate Action Branches from Shop
            for (const item of s.shop) {
                const isCreature = item.type?.toLowerCase().includes('creature');
                const isEquipment = item.type?.toLowerCase().includes('equipment');
                const isSpell = !isCreature && !isEquipment;

                if (isCreature) {
                    const cost = 3;
                    if (s.gold >= cost) {
                        if (s.board.length < boardCap) {
                            // Direct Buy Branch
                            const newBoard = s.board.map(c => c.clone());
                            const bought = item.clone();
                            bought.owner = 'player';
                            newBoard.push(bought);
                            triggerETB(bought, newBoard);
                            consolidateTriples(newBoard);

                            const newShop = s.shop.filter(c => c !== item);
                            candidates.push({
                                board: newBoard,
                                gold: s.gold - cost,
                                shop: newShop,
                                rerollsLeft: s.rerollsLeft,
                                score: 0
                            });
                        } else {
                            // Board is FULL -> Filter rational sell targets!
                            const isCompletingTriple = s.board.filter(b => b.card_name === item.card_name && !b.isFoil).length === 2;
                            const sellRanks = [];
                            s.board.forEach((c, idx) => {
                                let protectScore = (c.tier || 1) * 3 + (c.counters || 0) * 4 + (c.isFoil ? 20 : 0) + (c.equipment ? 10 : 0);
                                if (c.isToken || c.isDecayed) protectScore -= 15;
                                sellRanks.push({ idx, protectScore });
                            });
                            sellRanks.sort((a, b) => a.protectScore - b.protectScore);

                            // Test selling only the weakest 2 units (or any if completing triple)
                            const targetsToTest = isCompletingTriple ? sellRanks : sellRanks.slice(0, 2);
                            for (const { idx: sellIdx } of targetsToTest) {
                                const newBoard = s.board.map(c => c.clone());
                                const [sold] = newBoard.splice(sellIdx, 1);
                                const goldRefund = sold.isDecayed ? 0 : 1;

                                const bought = item.clone();
                                bought.owner = 'player';
                                if (sold.equipment && !bought.equipment) bought.equipment = sold.equipment;
                                newBoard.push(bought);
                                triggerETB(bought, newBoard);
                                consolidateTriples(newBoard);

                                const newShop = s.shop.filter(c => c !== item);
                                candidates.push({
                                    board: newBoard,
                                    gold: s.gold - cost + goldRefund,
                                    shop: newShop,
                                    rerollsLeft: s.rerollsLeft,
                                    score: 0
                                });
                            }
                        }
                    }
                } else if (isEquipment && s.board.length > 0) {
                    const cost = 5;
                    if (s.gold >= cost) {
                        for (let targetIdx = 0; targetIdx < s.board.length; targetIdx++) {
                            const newBoard = s.board.map(c => c.clone());
                            newBoard[targetIdx].equipment = item.clone();

                            const newShop = s.shop.filter(c => c !== item);
                            candidates.push({
                                board: newBoard,
                                gold: s.gold - cost,
                                shop: newShop,
                                rerollsLeft: s.rerollsLeft,
                                score: 0
                            });
                        }
                    }
                } else if (isSpell && s.board.length > 0) {
                    const cost = item.tier || 1;
                    if (s.gold >= cost) {
                        for (let targetIdx = 0; targetIdx < s.board.length; targetIdx++) {
                            const newBoard = s.board.map(c => c.clone());
                            const match = (item.rules_text || '').match(/\+(\d+)\/\+(\d+)/);
                            if (match) {
                                newBoard[targetIdx].tempPower += parseInt(match[1], 10);
                                newBoard[targetIdx].tempToughness += parseInt(match[2], 10);
                            } else {
                                addCounters(newBoard[targetIdx], 1, newBoard);
                            }
                            const newShop = s.shop.filter(c => c !== item);
                            candidates.push({
                                board: newBoard,
                                gold: s.gold - cost,
                                shop: newShop,
                                rerollsLeft: s.rerollsLeft,
                                score: 0
                            });
                        }
                    }
                }
            }

            // Reroll Branch
            if (s.gold >= 1 && s.rerollsLeft > 0) {
                let isAugmented = false;
                if (player.hero.name === 'Enoch') {
                    player.rerollCount = (player.rerollCount || 0) + 1;
                    if (player.rerollCount % 4 === 0) isAugmented = true;
                }
                const newShop = populateShop(player.tier, ALL_CARDS, isAugmented);
                candidates.push({
                    board: s.board.map(c => c.clone()),
                    gold: s.gold - 1,
                    shop: newShop,
                    rerollsLeft: s.rerollsLeft - 1,
                    score: s.score - 1.5
                });
            }
        }

        if (candidates.length === 0) break;

        // In-depth evaluation against gauntlet sample with 2 reps
        for (const cand of candidates) {
            if (cand.score === 0) {
                const combatScore = await evaluateBoard(cand.board, player.hero, player.tier, gauntletSample, 2);
                cand.score = combatScore + (cand.gold * 2.0);
            }
        }
        candidates.sort((a, b) => b.score - a.score);
        beam = candidates.slice(0, BEAM_WIDTH);
    }

    // Apply winning board from the search
    if (beam.length > 0 && beam[0].score > -100) {
        player.board = beam[0].board;
        player.gold = beam[0].gold;
    }

    // 6. Hero Power Activations
    if (player.hero.name === 'Crain') {
        player.crainActive = true;
    } else if (player.hero.name === 'Seto San' && player.board.length > 0 && player.gold >= 2) {
        player.gold -= 2;
        player.heroPowerActivations = (player.heroPowerActivations || 0) + 1;
        const target = player.board[Math.floor(Math.random() * player.board.length)];
        addCounters(target, player.heroPowerActivations, player.board);
    }

    // 7. Crain Board Cap Enforcement (leave slot open for start-of-combat clone)
    if (player.hero.name === 'Crain') {
        while (player.board.length > 6) {
            player.board.pop();
        }
    }

    // 8. Zero-Assumption Positioning Search for the Final Board
    player.board = await optimizeBoardPositioning(player.board, player.hero, player.tier, gauntletSample);
}

// --- BOARD SERIALIZER (MATCHES TRAINING GROUNDS EXACTLY) ---
function serializeBoard(board) {
    return (board || []).map(c => ({
        card_name: c.card_name,
        avatar: c.avatar || null,
        set: c.set,
        number: c.number,
        image_type: c.image_type || 'jpg',
        isFoil: !!c.isFoil,
        counters: c.counters || 0,
        tempPower: c.tempPower || 0,
        tempToughness: c.tempToughness || 0,
        damageTaken: c.damageTaken || 0,
        flyingCounters: c.flyingCounters || 0,
        menaceCounters: c.menaceCounters || 0,
        firstStrikeCounters: c.firstStrikeCounters || 0,
        doubleStrikeCounters: c.doubleStrikeCounters || 0,
        vigilanceCounters: c.vigilanceCounters || 0,
        lifelinkCounters: c.lifelinkCounters || 0,
        deathtouchCounters: c.deathtouchCounters || 0,
        trampleCounters: c.trampleCounters || 0,
        reachCounters: c.reachCounters || 0,
        hexproofCounters: c.hexproofCounters || 0,
        shieldCounters: c.shieldCounters || 0,
        isDecayed: !!c.isDecayed,
        isToken: !!c.isToken,
        isLockedByChivalry: !!c.isLockedByChivalry,
        temporaryHumility: !!c.temporaryHumility,
        temporarySphinx: !!c.temporarySphinx,
        indestructibleUsed: !!c.indestructibleUsed,
        isDestroyed: !!c.isDestroyed,
        equipment: c.equipment ? {
            card_name: c.equipment.card_name,
            avatar: c.equipment.avatar || null,
            set: c.equipment.set
        } : null,
        enchantments: (c.enchantments || []).map(e => ({
            card_name: e.card_name,
            avatar: e.avatar || null,
            set: e.set,
            rules_text: e.rules_text || '',
            isTemporary: !!e.isTemporary
        }))
    }));
}

// --- GENERATE TRAINING FOR A HERO (TURNS 1-20 x INSTANCES) ---
async function generateHeroTraining(heroKey, instanceCount = 4) {
    const hero = HEROES[heroKey];
    if (!hero) throw new Error(`Hero ${heroKey} not found in HEROES.`);

    console.log(`\n======================================================================`);
    console.log(`🧠 Training Deep Simulation Model: ${hero.name} (${instanceCount} instances x 20 turns)`);
    console.log(`======================================================================`);

    const logs = [];

    for (let inst = 1; inst <= instanceCount; inst++) {
        const instStart = Date.now();
        const player = {
            id: `bot-${hero.name}-${inst}`,
            name: hero.name,
            hero: hero,
            tier: 1,
            overallHp: 100,
            fightHp: 10,
            gold: 3,
            board: [],
            hand: [],
            spellGraveyard: [],
            treasures: 0,
            crainActive: false,
            heroPowerActivations: 0,
            spellsBoughtThisGame: 0,
            blueCardsPlayed: 0
        };

        // Hero Init Specials
        if (hero.name === 'Panya') {
            const aldmore = ALL_CARDS.find(c => c.card_name === 'Aldmore Chaperone');
            if (aldmore) player.board.push(CardFactory.create(aldmore));
        }
        if (hero.name === 'Herrea') {
            const t5Pool = ALL_CARDS.filter(c => c.shape !== 'token' && (c.tier || 1) === 5 && c.type?.toLowerCase().includes('creature'));
            if (t5Pool.length > 0) {
                player.herreaRewardCard = CardFactory.create(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                player.herreaRewardCard.owner = 'player';
            }
        }

        for (let turn = 1; turn <= 20; turn++) {
            await playSimulationShopTurn(player, turn);

            const boardSnapshot = serializeBoard(player.board);
            logs.push({
                instance: inst,
                hero: hero.name,
                turn: turn,
                tier: player.tier,
                honorBegetsGloryBonus: player.honorBegetsGloryBonus || 0,
                crainActive: !!player.crainActive,
                preCombatBoard: boardSnapshot,
                resultFightHp: 5 + (5 * player.tier),
                opponentResultFightHp: 5 + (5 * player.tier),
                resultOverallHp: player.overallHp,
                opponentResultOverallHp: 20
            });

            // Dynamically add this board to the in-memory gauntlet so subsequent instances learn from it!
            addBoardToGauntlet(turn, hero.name, player.tier, player.board);
        }

        const instElapsed = ((Date.now() - instStart) / 1000).toFixed(1);
        console.log(`  ✓ Completed instance #${inst} in ${instElapsed}s (Final board: ${player.board.map(c => `${c.card_name}${c.isFoil ? '(F)' : ''}${c.equipment ? `[+${c.equipment.card_name}]` : ''}`).join(', ') || 'Empty'})`);
    }

    const filename = `training_${hero.name.replace(/\s+/g, '_')}.json`;
    const outPath = path.join(__dirname, '../resources/training-data', filename);

    // Backup previous file if exists
    if (fs.existsSync(outPath)) {
        const backupPath = outPath.replace('.json', '_old.json');
        fs.copyFileSync(outPath, backupPath);
    }

    fs.writeFileSync(outPath, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`📁 Saved ${logs.length} board snapshots to ${outPath}\n`);
    return logs;
}

// --- CLI DISPATCHER ---
async function main() {
    const args = process.argv.slice(2);
    const targetHero = args[0];

    if (!targetHero || targetHero === '--help') {
        console.log("Usage: node scripts/train_bot.js <HeroName | --all>");
        console.log("Available heroes:", HERO_NAMES.join(', '));
        process.exit(0);
    }

    const startTime = Date.now();

    if (targetHero === '--all') {
        console.log(`🚀 Starting full training generation for ALL ${HERO_NAMES.length} heroes...`);
        for (const name of HERO_NAMES) {
            const heroKey = Object.keys(HEROES).find(k => HEROES[k].name.toLowerCase() === name.toLowerCase());
            if (heroKey) {
                await generateHeroTraining(heroKey, 4);
            }
        }
    } else {
        const cleanName = targetHero.replace(/_/g, ' ').toLowerCase();
        const heroKey = Object.keys(HEROES).find(k => HEROES[k].name.toLowerCase() === cleanName);
        if (!heroKey) {
            console.error(`Error: Could not find hero matching '${targetHero}'.`);
            console.log("Available:", HERO_NAMES.join(', '));
            process.exit(1);
        }
        await generateHeroTraining(heroKey, 4);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Training generation complete in ${elapsed}s!`);
}

main().catch(err => {
    console.error("Training error:", err);
    process.exit(1);
});
