const fs = require('fs');
const path = require('path');

// --- HEADLESS DOM MOCK ---
const elementCache = new Map();
const mockElement = (id) => {
    if (id && elementCache.has(id)) return elementCache.get(id);
    const el = { 
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
    if (id) elementCache.set(id, el);
    return el;
};
global.requestAnimationFrame = (cb) => { if (!cb.name || !cb.name.includes('updateBubblePosition')) cb(); };
global.window = {
    getComputedStyle: () => ({ opacity: '1', display: 'block', transform: 'none' }),
    requestAnimationFrame: (cb) => { if (!cb.name || !cb.name.includes('updateBubblePosition')) cb(); },
    location: { search: '' }
};
global.document = {
    getElementById: (id) => mockElement(id),
    querySelector: () => mockElement(),
    querySelectorAll: () => [],
    createElement: () => mockElement(),
    body: mockElement('body'),
    addEventListener: () => {}
};
global.pulseCardElement = () => {};
global.Image = class {};
global.Audio = class { play() {} };
global.WebKitCSSMatrix = class { constructor() { this.a = 1; } };
global.setTimeout = (fn) => fn();

const { 
    state, CardFactory, BaseCard, HEROES, setAvailableCards,
    performAttack, resolveDeaths, findTarget, resolveStartOfCombatTriggers, getOpponent
} = require('./coliseum.js');

const coliseum = require('./coliseum.js');
coliseum.render = () => {}; 

const cardData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/coliseum-cards.json'), 'utf8'));
setAvailableCards(cardData.cards);

async function simulateCombat(p1, p2) {
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

    const simP1 = { ...p1, board: state.battleBoards.player };
    const simP2 = { ...p2, board: state.battleBoards.opponent };
    state.player = simP1;
    state.opponents = [simP2];
    state.currentOpponentId = 0;

    await resolveStartOfCombatTriggers(simP2);

    state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';
    let turnsInCurrentRound = 0;
    let maxTurns = 400;
    const opp = getOpponent();

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
                if (attackerBoard.includes(attacker) && !attacker.isDying) currentQueue.push(attacker);
            }
        }
        turnsInCurrentRound++;
        state.attackerSide = (side === 'player' ? 'opponent' : 'player');
    }

    if (opp.fightHp <= 0 && state.player.fightHp > 0) {
        const survivors = state.battleBoards.player.filter(c => !c.isDying).length;
        const damage = simP1.tier + 1;
        return { winner: 'player', tier: damage };
    }
    if (state.player.fightHp <= 0 && opp.fightHp > 0) {
        const survivors = state.battleBoards.opponent.filter(c => !c.isDying).length;
        const damage = simP2.tier + 1;
        return { winner: 'opponent', tier: damage };
    }
    return { winner: 'draw', tier: 0 };
}

function getCombinations(array, k) {
    const results = [];
    function backtrack(start, curr) {
        if (curr.length === k) { results.push([...curr]); return; }
        for (let i = start; i < array.length; i++) {
            curr.push(array[i]);
            backtrack(i + 1, curr);
            curr.pop();
        }
    }
    backtrack(0, []);
    return results;
}

async function runLobby(playerConfigs, collector = null) {
    elementCache.clear();
    Object.keys(state).forEach(key => {
        if (Array.isArray(state[key])) state[key] = [];
        else if (typeof state[key] === 'object' && state[key] !== null) {
            if (key === 'shop') state[key] = { cards: [], frozen: false };
            else if (key === 'settings') return; 
            else state[key] = null;
        } else if (typeof state[key] === 'number') state[key] = (key === 'turn') ? 1 : 0;
    });
    state.phase = 'SHOP';
    state.player = { overallHp: 100, hand: [], spellGraveyard: [], treasures: 0 };
    state.isSimulating = true;

    const players = playerConfigs.map(config => ({
        id: config.id,
        heroName: config.heroName,
        instanceId: config.instanceId,
        overallHp: 20,
        data: config.data,
        hero: HEROES[config.heroName.toUpperCase()]
    }));

    let turn = 1;
    let deadPlayers = [];
    let consecutiveDraws = 0;

    while (players.filter(p => p.overallHp > 0).length > 1) {
        const active = players.filter(p => p.overallHp > 0);
        const shuffled = [...active].sort(() => Math.random() - 0.5);
        const pairs = [];
        let roundHasWinner = false;

        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) pairs.push([shuffled[i], shuffled[i+1]]);
            else pairs.push([shuffled[i], { ...deadPlayers[deadPlayers.length - 1] || shuffled[0], isGhost: true }]);
        }

        for (const [p1, p2] of pairs) {
            const b1Data = p1.data[turn] || p1.data[p1.data.maxTurn];
            const b2Data = p2.data[turn] || p2.data[p2.data.maxTurn];

            const simP1 = { ...p1, tier: b1Data.tier, fightHp: 5 + (5 * b1Data.tier), board: b1Data.preCombatBoard, crainActive: b1Data.crainActive, turn: turn };
            const simP2 = { ...p2, tier: b2Data.tier, fightHp: 5 + (5 * b2Data.tier), board: b2Data.preCombatBoard, crainActive: b2Data.crainActive, turn: turn };
            
            const result = await simulateCombat(simP1, simP2);
            if (result.winner !== 'draw') roundHasWinner = true;

            if (collector) {
                const turnRange = turn <= 5 ? '1-5' : (turn <= 10 ? '6-10' : '11+');
                
                // Matchup Analysis
                if (!p1.isGhost && !p2.isGhost) {
                    if (!collector.matchups[p1.heroName]) collector.matchups[p1.heroName] = {};
                    if (!collector.matchups[p1.heroName][p2.heroName]) collector.matchups[p1.heroName][p2.heroName] = { wins: 0, total: 0 };
                    if (!collector.matchups[p2.heroName]) collector.matchups[p2.heroName] = {};
                    if (!collector.matchups[p2.heroName][p1.heroName]) collector.matchups[p2.heroName][p1.heroName] = { wins: 0, total: 0 };
                    
                    collector.matchups[p1.heroName][p2.heroName].total++;
                    collector.matchups[p2.heroName][p1.heroName].total++;
                    if (result.winner === 'player') collector.matchups[p1.heroName][p2.heroName].wins++;
                    else if (result.winner === 'opponent') collector.matchups[p2.heroName][p1.heroName].wins++;
                }

                const updateCollector = (board, isWinner, playerConfig, turn) => {
                    const uniqueNames = [...new Set(board.map(c => c.card_name))].sort();
                    const boardTurnKey = `${playerConfig.id}-T${turn}`;

                    uniqueNames.forEach(name => {
                        if (!collector.creatures[name]) {
                            collector.creatures[name] = { 
                                '1-5': { wins: 0, total: 0 }, '6-10': { wins: 0, total: 0 }, '11+': { wins: 0, total: 0 },
                                uniqueBoards: new Set()
                            };
                        }
                        collector.creatures[name][turnRange].total++;
                        if (isWinner) collector.creatures[name][turnRange].wins++;
                        collector.creatures[name].uniqueBoards.add(boardTurnKey);

                        // Equipment Tracking
                        const cardInst = board.find(c => c.card_name === name);
                        if (cardInst && cardInst.equipment) {
                            const eqName = cardInst.equipment.card_name;
                            if (!collector.equipment[eqName]) {
                                collector.equipment[eqName] = { 
                                    '1-5': { wins: 0, total: 0 }, '6-10': { wins: 0, total: 0 }, '11+': { wins: 0, total: 0 },
                                    uniqueBoards: new Set()
                                };
                            }
                            collector.equipment[eqName][turnRange].total++;
                            if (isWinner) collector.equipment[eqName][turnRange].wins++;
                            collector.equipment[eqName].uniqueBoards.add(boardTurnKey);
                        }
                    });
                    for (let i = 0; i < uniqueNames.length; i++) {
                        for (let j = i + 1; j < uniqueNames.length; j++) {
                            const pairKey = `${uniqueNames[i]}|${uniqueNames[j]}`;
                            if (!collector.pairs[pairKey]) {
                                collector.pairs[pairKey] = { 
                                    '1-5': { wins: 0, total: 0 }, '6-10': { wins: 0, total: 0 }, '11+': { wins: 0, total: 0 },
                                    uniqueBoards: new Set()
                                };
                            }
                            collector.pairs[pairKey][turnRange].total++;
                            if (isWinner) collector.pairs[pairKey][turnRange].wins++;
                            collector.pairs[pairKey].uniqueBoards.add(boardTurnKey);
                        }
                    }
                };
                if (!p1.isGhost) updateCollector(simP1.board, result.winner === 'player', p1, turn);
                if (!p2.isGhost) updateCollector(simP2.board, result.winner === 'opponent', p2, turn);
            }

            if (result.winner === 'player') {
                if (!p2.isGhost) p2.overallHp -= result.tier;
            } else if (result.winner === 'opponent') {
                if (!p1.isGhost) p1.overallHp -= result.tier;
            }
        }
        if (!roundHasWinner) consecutiveDraws++; else consecutiveDraws = 0;
        if (consecutiveDraws >= 3 || turn > 100) return { placements: [], winnerHero: 'Draw', turnCount: turn };
        active.forEach(p => { if (p.overallHp <= 0 && !deadPlayers.includes(p)) deadPlayers.push(p); });
        turn++;
    }
    const finalPlacements = players.sort((a,b) => b.overallHp - a.overallHp);
    const winner = finalPlacements.find(p => p.overallHp > 0);
    return { placements: finalPlacements, winnerHero: winner ? winner.heroName : 'Draw', turnCount: turn };
}

async function run() {
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    let heroNames = args;
    
    if (args.length === 0) {
        const trainingDir = path.join(__dirname, '../resources/training-data');
        heroNames = fs.readdirSync(trainingDir)
            .filter(f => f.startsWith('training_') && f.endsWith('.json') && !f.includes('_old'))
            .map(f => f.replace('training_', '').replace('.json', ''));
        console.log(`No arguments provided. Detected ${heroNames.length} heroes: ${heroNames.join(', ')}`);
    } else if (args.length !== 2 && args.length !== 4 && args.length !== 8) {
        console.log("Usage: node lobby_simulate.js [hero1 hero2 ...] (supports 0, 2, 4, or 8 heroes)");
        process.exit(1);
    }

    const allHeroesData = [];
    const organize = (data) => {
        const allCards = coliseum.getAvailableCards();
        const obj = {};
        data.forEach(d => {
            if (!obj[d.instance]) obj[d.instance] = { maxTurn: 0 };
            const board = d.preCombatBoard.map(c => {
                const base = allCards.find(bc => bc.card_name === c.card_name);
                const inst = CardFactory.create({ ...base, ...c });
                if (c.equipment) {
                    const eqBase = allCards.find(bc => bc.card_name === c.equipment.card_name);
                    inst.equipment = CardFactory.create({ ...eqBase, ...c.equipment });
                }
                return inst;
            });
            obj[d.instance][d.turn] = { ...d, preCombatBoard: board, crainActive: !!d.crainActive };
            if (d.turn > obj[d.instance].maxTurn) obj[d.instance].maxTurn = d.turn;
        });
        return obj;
    };

    console.log("Preparing board instances...");
    let totalBoardsCount = 0;
    for (const name of heroNames) {
        const file = path.join(__dirname, `../resources/training-data/training_${name}.json`);
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const boards = organize(data);
        const instances = Object.keys(boards).filter(k => k !== 'maxTurn').map(Number);
        allHeroesData.push({ name, boards, instances });
        totalBoardsCount += instances.length;
    }

    const placementStats = {};
    allHeroesData.forEach(h => {
        h.instances.forEach(id => placementStats[`${h.name}-${id}`] = Array(8).fill(0));
    });

    const gameLengthDistribution = {};
    const heroWins = {};
    heroNames.forEach(name => heroWins[name] = 0);

    const isDetailed = process.argv.includes('--detailed');
    const creatureStats = {}; 
    const creaturePairs = {}; 
    const equipmentStats = {};
    const heroMatchups = {};
    const boardGamePlacements = {}; 
    
    let totalCombatTime = 0;
    let iterations = 0;
    const startTime = process.hrtime();

    const targetGamesPerBoard = args.length === 0 ? 800 : (heroNames.length === 8 ? 500 : 1000); 
    const numSimulations = args.length === 0 ? (totalBoardsCount * targetGamesPerBoard) / 8 : 
                          (heroNames.length === 8 ? 4000 : 1000);

    console.log(`Simulation Mode: ${args.length === 0 ? 'Full Registry' : heroNames.length + '-Hero Lobby'}`);
    console.log(`Total boards: ${totalBoardsCount}. Targeting ~${targetGamesPerBoard} games per board.`);
    console.log(`Total Simulations: ${numSimulations}`);

    const boardQueues = allHeroesData.map(h => {
        const queue = [];
        const gamesForThisHero = (args.length === 0) ? targetGamesPerBoard : Math.ceil(numSimulations * 8 / heroNames.length / h.instances.length);
        for (let i = 0; i < gamesForThisHero; i++) {
            queue.push(...h.instances);
        }
        return queue.sort(() => Math.random() - 0.5);
    });

    for (let i = 0; i < numSimulations; i++) {
        const availableHeroIndices = boardQueues
            .map((q, idx) => ({ idx, len: q.length }))
            .filter(item => item.len > 0)
            .sort((a, b) => b.len - a.len);

        if (availableHeroIndices.length < 8) break;
        const selectedHeroIndices = availableHeroIndices.slice(0, 8).map(h => h.idx);
        const playerConfigs = selectedHeroIndices.map(heroIdx => {
            const hData = allHeroesData[heroIdx];
            const instanceId = boardQueues[heroIdx].shift();
            return {
                id: `${hData.name}-${instanceId}`,
                heroName: hData.name,
                instanceId: instanceId,
                data: hData.boards[instanceId]
            };
        });

        const lobbyStart = process.hrtime();
        const res = await runLobby(playerConfigs, isDetailed ? { creatures: creatureStats, pairs: creaturePairs, equipment: equipmentStats, matchups: heroMatchups } : null);
        const lobbyDiff = process.hrtime(lobbyStart);
        totalCombatTime += (lobbyDiff[0] * 1e9 + lobbyDiff[1]) / 1e6;

        if (res.winnerHero !== 'Draw') {
            heroWins[res.winnerHero]++;
            gameLengthDistribution[res.turnCount] = (gameLengthDistribution[res.turnCount] || 0) + 1;
            res.placements.forEach((p, idx) => {
                if(placementStats[p.id]) placementStats[p.id][idx]++;
                if(isDetailed) {
                    if(!boardGamePlacements[p.id]) boardGamePlacements[p.id] = [];
                    boardGamePlacements[p.id].push(idx + 1);
                }
            });
        }
        iterations++;
        if (iterations % (isDetailed ? 20 : 100) === 0) reportProgress(iterations, numSimulations, startTime, totalCombatTime);
    }

    if (isDetailed) {
        reportDetailedResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime, creatureStats, creaturePairs, boardGamePlacements, equipmentStats, heroMatchups);
    } else {
        reportFinalResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime);
    }
}

function reportProgress(iterations, total, startTime, totalCombatTime) {
    const elapsed = process.hrtime(startTime);
    const elapsedSec = (elapsed[0] + elapsed[1] / 1e9).toFixed(1);
    const avgMs = (totalCombatTime / iterations).toFixed(2);
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    console.log(`Progress: ${iterations}/${total}... [${elapsedSec}s, avg ${avgMs}ms, mem ${mem}MB]`);
}

function reportDetailedResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime, creatureStats, creaturePairs, boardGamePlacements, equipmentStats, heroMatchups) {
    const totalElapsed = process.hrtime(startTime);
    const totalSec = (totalElapsed[0] + totalElapsed[1] / 1e9).toFixed(2);
    let output = "";
    const log = (msg) => { output += msg + "\n"; };

    log("\n==========================================");
    log("       DETAILED SIMULATION REPORT");
    log("==========================================");
    log(`Total Time: ${totalSec}s | Games: ${iterations}`);

    log("\n--- 1. HERO POWER RANKINGS (OUTLIER RESISTANT) ---");
    const heroMetrics = heroNames.map(name => {
        const allPlacements = [];
        Object.keys(placementStats).filter(k => k.startsWith(name)).forEach(k => {
            placementStats[k].forEach((count, i) => {
                for(let c=0; c<count; c++) allPlacements.push(i + 1);
            });
        });
        allPlacements.sort((a, b) => a - b);
        const median = allPlacements.length > 0 ? allPlacements[Math.floor(allPlacements.length / 2)] : 8;
        const trimCount = Math.floor(allPlacements.length * 0.1);
        const trimmed = allPlacements.slice(trimCount, allPlacements.length - trimCount);
        const trimmedAvg = trimmed.length > 0 ? (trimmed.reduce((a, b) => a + b, 0) / trimmed.length) : 8;
        const top4Rate = ((allPlacements.filter(p => p <= 4).length / allPlacements.length) * 100).toFixed(1);
        const winRate = ((allPlacements.filter(p => p === 1).length / allPlacements.length) * 100).toFixed(1);
        return { name, median, trimmedAvg, top4Rate, winRate, totalGames: allPlacements.length };
    }).sort((a, b) => a.trimmedAvg - b.trimmedAvg);

    const avgOfTrimmed = heroMetrics.reduce((a, b) => a + b.trimmedAvg, 0) / heroMetrics.length;
    const stdDevTrimmed = Math.sqrt(heroMetrics.reduce((a, b) => a + Math.pow(b.trimmedAvg - avgOfTrimmed, 2), 0) / heroMetrics.length);
    heroMetrics.forEach(h => {
        let status = "";
        if (h.trimmedAvg < avgOfTrimmed - stdDevTrimmed) status = " [DANGER: TOO STRONG]";
        else if (h.trimmedAvg > avgOfTrimmed + stdDevTrimmed) status = " [DANGER: TOO WEAK]";
        log(`${h.name.padEnd(12)} | Avg(Trim): ${h.trimmedAvg.toFixed(2)} | Median: ${h.median} | Top4: ${h.top4Rate}% | Win: ${h.winRate}%${status}`);
    });

    log("\n--- 2. NEMESIS MATRIX (BEST/WORST MATCHUPS) ---");
    heroNames.forEach(h => {
        const matchups = heroMatchups[h];
        if (!matchups) return;
        const sorted = Object.entries(matchups).map(([opp, data]) => ({ opp, wr: (data.wins / data.total) * 100, total: data.total }))
            .sort((a, b) => b.wr - a.wr);
        log(`Hero: ${h}`);
        log(`  Best Matchup: ${sorted[0].opp} (${sorted[0].wr.toFixed(1)}% win rate over ${sorted[0].total} rounds)`);
        log(`  Worst Matchup: ${sorted[sorted.length-1].opp} (${sorted[sorted.length-1].wr.toFixed(1)}% win rate over ${sorted[sorted.length-1].total} rounds)`);
    });

    log("\n--- 3. EQUIPMENT POWER RANKINGS ---");
    const eqList = Object.entries(equipmentStats).map(([name, ranges]) => ({
        name, ranges, 
        totalWins: ranges['1-5'].wins + ranges['6-10'].wins + ranges['11+'].wins,
        totalGames: ranges['1-5'].total + ranges['6-10'].total + ranges['11+'].total,
        uniqueBoards: ranges.uniqueBoards.size
    })).sort((a, b) => (b.totalWins / b.totalGames) - (a.totalWins / a.totalGames));

    eqList.forEach(e => {
        const wr = ((e.totalWins / e.totalGames) * 100).toFixed(1);
        log(`  ${e.name.padEnd(25)} | WR: ${wr}% | Boards: ${e.uniqueBoards} | Rounds: ${e.totalGames}`);
    });

    log("\n--- 4. ALL BOARD PERFORMANCE ---");
    Object.entries(boardGamePlacements).map(([id, placements]) => ({ id, avg: placements.reduce((a, b) => a + b, 0) / placements.length, count: placements.length }))
        .sort((a, b) => a.avg - b.avg)
        .forEach(b => log(`  ${b.id.padEnd(25)} | Avg Pos: ${b.avg.toFixed(2)} (${b.count} games)`));

    log("\n--- 5. VALUE STARS (LOW TIER OVERPERFORMERS IN TURN 11+) ---");
    const creatureList = Object.entries(creatureStats).map(([name, ranges]) => {
        const card = cardData.cards.find(c => c.card_name === name);
        return { name, ranges, tier: card ? card.tier : 0, uniqueBoards: ranges.uniqueBoards.size };
    });
    creatureList.filter(c => c.tier <= 2 && c.ranges['11+'].total > (iterations / 100))
        .sort((a, b) => (b.ranges['11+'].wins / b.ranges['11+'].total) - (a.ranges['11+'].wins / a.ranges['11+'].total))
        .forEach(c => {
            const wr = ((c.ranges['11+'].wins / c.ranges['11+'].total) * 100).toFixed(1);
            if (parseFloat(wr) > 45) log(`  ${c.name.padEnd(25)} | Tier ${c.tier} | Late WR: ${wr}% | Boards: ${c.uniqueBoards}`);
        });

    log("\n--- 6. CREATURE PERFORMANCE BY TURN RANGE ---");
    ['1-5', '6-10', '11+'].forEach(range => {
        log(`\nCreature Performance (Turn ${range}):`);
        creatureList.filter(c => c.ranges[range].total > (iterations / 100))
            .sort((a, b) => (b.ranges[range].wins / b.ranges[range].total) - (a.ranges[range].wins / a.ranges[range].total))
            .forEach(c => {
                const wr = ((c.ranges[range].wins / c.ranges[range].total) * 100).toFixed(1);
                log(`  ${c.name.padEnd(25)} | WR: ${wr}% | Boards: ${c.uniqueBoards} | Rounds: ${c.ranges[range].total}`);
            });
    });

    log("\n--- 7. CREATURE SYNERGY (PAIRS) BY TURN RANGE ---");
    ['1-5', '6-10', '11+'].forEach(range => {
        log(`\nTop Performing Pairs (Turn ${range}):`);
        Object.entries(creaturePairs)
            .filter(([key, ranges]) => ranges[range].total > (iterations / 50))
            .sort((a, b) => (b[1][range].wins / b[1][range].total) - (a[1][range].wins / a[1][range].total))
            .forEach(([pairKey, ranges]) => {
                const [c1, c2] = pairKey.split('|');
                const wr = ((ranges[range].wins / ranges[range].total) * 100).toFixed(1);
                log(`  ${(c1 + " + " + c2).padEnd(45)} | WR: ${wr}% | Boards: ${ranges.uniqueBoards.size} | Rounds: ${ranges[range].total}`);
            });
    });

    log("\n==========================================");
    fs.writeFileSync('simulation_report.txt', output);
    console.log("\nFull report saved to simulation_report.txt");
}

function reportFinalResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime) {
    const totalElapsed = process.hrtime(startTime);
    const totalSec = (totalElapsed[0] + totalElapsed[1] / 1e9).toFixed(2);
    console.log("\n--- LOBBY SIMULATION SUMMARY ---");
    console.log(`Total Time: ${totalSec}s | Avg: ${(totalCombatTime / iterations).toFixed(2)}ms`);
    heroNames.map(name => {
        const placements = Object.keys(placementStats).filter(k => k.startsWith(name)).map(k => placementStats[k]);
        let totalSum = 0, totalCount = 0;
        placements.forEach(p => p.forEach((count, i) => { totalSum += count * (i + 1); totalCount += count; }));
        return { name, wins: heroWins[name], avg: (totalCount > 0 ? (totalSum / totalCount) : 8.00).toFixed(2) };
    }).sort((a, b) => a.avg - b.avg).forEach(h => {
        console.log(`${h.name} lobby wins: ${h.wins}`);
        console.log(`${h.name} avg pos: ${h.avg}`);
    });
}

run();
