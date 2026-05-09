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
        const damage = Math.min(simP1.tier + survivors, simP1.tier * 2);
        return { winner: 'player', tier: damage };
    }
    if (state.player.fightHp <= 0 && opp.fightHp > 0) {
        const survivors = state.battleBoards.opponent.filter(c => !c.isDying).length;
        const damage = Math.min(simP2.tier + survivors, simP2.tier * 2);
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

async function runLobby(playerConfigs, verbose = false) {
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

            if (result.winner === 'player') {
                if (!p2.isGhost) {
                    p2.overallHp -= result.tier;
                }
            } else if (result.winner === 'opponent') {
                if (!p1.isGhost) {
                    p1.overallHp -= result.tier;
                }
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
    const args = process.argv.slice(2);
    if (args.length !== 2 && args.length !== 4) {
        console.log("Usage: node lobby_simulate.js <hero1> <hero2> [hero3 hero4]");
        process.exit(1);
    }

    const heroNames = args;
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
    for (const name of heroNames) {
        const file = path.join(__dirname, `../resources/training-data/training_${name}.json`);
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const boards = organize(data);
        const instances = Object.keys(boards).filter(k => k !== 'maxTurn').map(Number);
        allHeroesData.push({ name, boards, instances });
    }

    const placementStats = {};
    allHeroesData.forEach(h => {
        h.instances.forEach(id => placementStats[`${h.name}-${id}`] = Array(8).fill(0));
    });

    const gameLengthDistribution = {};
    const heroWins = {};
    heroNames.forEach(name => heroWins[name] = 0);
    
    let totalCombatTime = 0;
    let iterations = 0;
    const startTime = process.hrtime();

    if (heroNames.length === 2) {
        const numSimulations = 1000;
        console.log(`Simulating ${numSimulations} games: ${heroNames[0]} vs ${heroNames[1]} (8-player lobby)`);
        
        for (let i = 0; i < numSimulations; i++) {
            const lobbyStart = process.hrtime();
            const playerConfigs = [];
            allHeroesData[0].instances.forEach(id => {
                playerConfigs.push({ id: `${heroNames[0]}-${id}`, heroName: heroNames[0], instanceId: id, data: allHeroesData[0].boards[id] });
            });
            allHeroesData[1].instances.forEach(id => {
                playerConfigs.push({ id: `${heroNames[1]}-${id}`, heroName: heroNames[1], instanceId: id, data: allHeroesData[1].boards[id] });
            });

            const res = await runLobby(playerConfigs, false);
            const lobbyDiff = process.hrtime(lobbyStart);
            totalCombatTime += (lobbyDiff[0] * 1e9 + lobbyDiff[1]) / 1e6;
            
            if (res.winnerHero !== 'Draw') {
                heroWins[res.winnerHero]++;
                gameLengthDistribution[res.turnCount] = (gameLengthDistribution[res.turnCount] || 0) + 1;
                res.placements.forEach((p, idx) => {
                    if(placementStats[p.id]) placementStats[p.id][idx]++;
                });
            }
            iterations++;
            if (iterations % 100 === 0) reportProgress(iterations, numSimulations, startTime, totalCombatTime);
        }
    } else if (heroNames.length === 4) {
        const pairs1 = getCombinations(allHeroesData[0].instances, 2);
        const pairs2 = getCombinations(allHeroesData[1].instances, 2);
        const pairs3 = getCombinations(allHeroesData[2].instances, 2);
        const pairs4 = getCombinations(allHeroesData[3].instances, 2);

        const totalCombinations = pairs1.length * pairs2.length * pairs3.length * pairs4.length;
        console.log(`Simulating 4-hero lobby: ${heroNames.join(', ')}`);
        console.log(`Total combinations: ${totalCombinations}. Running each twice for ${totalCombinations * 2} games.`);

        for (const p1 of pairs1) {
            for (const p2 of pairs2) {
                for (const p3 of pairs3) {
                    for (const p4 of pairs4) {
                        for (let n = 0; n < 2; n++) {
                            const playerConfigs = [];
                            p1.forEach(id => playerConfigs.push({ id: `${heroNames[0]}-${id}`, heroName: heroNames[0], instanceId: id, data: allHeroesData[0].boards[id] }));
                            p2.forEach(id => playerConfigs.push({ id: `${heroNames[1]}-${id}`, heroName: heroNames[1], instanceId: id, data: allHeroesData[1].boards[id] }));
                            p3.forEach(id => playerConfigs.push({ id: `${heroNames[2]}-${id}`, heroName: heroNames[2], instanceId: id, data: allHeroesData[2].boards[id] }));
                            p4.forEach(id => playerConfigs.push({ id: `${heroNames[3]}-${id}`, heroName: heroNames[3], instanceId: id, data: allHeroesData[3].boards[id] }));

                            const lobbyStart = process.hrtime();
                            const res = await runLobby(playerConfigs, false);
                            const lobbyDiff = process.hrtime(lobbyStart);
                            totalCombatTime += (lobbyDiff[0] * 1e9 + lobbyDiff[1]) / 1e6;

                            if (res.winnerHero !== 'Draw') {
                                heroWins[res.winnerHero]++;
                                gameLengthDistribution[res.turnCount] = (gameLengthDistribution[res.turnCount] || 0) + 1;
                                res.placements.forEach((p, idx) => {
                                    if(placementStats[p.id]) placementStats[p.id][idx]++;
                                });
                            }
                            iterations++;
                            if (iterations % 100 === 0) reportProgress(iterations, totalCombinations * 2, startTime, totalCombatTime);
                        }
                    }
                }
            }
        }
    }

    reportFinalResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime);
}

function reportProgress(iterations, total, startTime, totalCombatTime) {
    const elapsed = process.hrtime(startTime);
    const elapsedSec = (elapsed[0] + elapsed[1] / 1e9).toFixed(1);
    const avgMs = (totalCombatTime / iterations).toFixed(2);
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    console.log(`Progress: ${iterations}/${total}... [${elapsedSec}s, avg ${avgMs}ms, mem ${mem}MB]`);
}

function reportFinalResults(heroNames, placementStats, heroWins, gameLengthDistribution, iterations, totalCombatTime, startTime) {
    const totalElapsed = process.hrtime(startTime);
    const totalSec = (totalElapsed[0] + totalElapsed[1] / 1e9).toFixed(2);
    const totalSuccessfulGames = Object.values(gameLengthDistribution).reduce((a, b) => a + b, 0);
    const totalTurns = Object.entries(gameLengthDistribution).reduce((sum, [len, count]) => sum + (Number(len) * count), 0);

    console.log("\n--- LOBBY SIMULATION SUMMARY ---");
    console.log(`Total Time: ${totalSec}s | Avg: ${(totalCombatTime / iterations).toFixed(2)}ms`);

    const heroStats = heroNames.map(name => {
        const placements = Object.keys(placementStats).filter(k => k.startsWith(name)).map(k => placementStats[k]);
        let totalSum = 0;
        let totalCount = 0;
        placements.forEach(p => {
            p.forEach((count, i) => {
                totalSum += count * (i + 1);
                totalCount += count;
            });
        });
        const avg = totalCount > 0 ? (totalSum / totalCount) : 8.00;
        return { name, wins: heroWins[name], avg: avg.toFixed(2), rawAvg: avg };
    }).sort((a, b) => a.rawAvg - b.rawAvg);

    heroStats.forEach(h => {
        console.log(`${h.name} lobby wins: ${h.wins}`);
        console.log(`${h.name} avg pos: ${h.avg}`);
    });

    console.log("\nGame Length Distribution:");
    Object.entries(gameLengthDistribution).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([len, count]) => {
        console.log(`  ${len - 1} turns: ${count} games`);
    });
    console.log(`Average Game Length: ${(totalTurns / totalSuccessfulGames - 1).toFixed(1)} turns`);

    console.log("\nIndividual Board Placements (Sorted by Avg Placement):");
    const sortedBoards = Object.entries(placementStats).filter(([id, placements]) => placements.reduce((s, c) => s + c, 0) > 0).sort((a,b) => {
        const aTotalGames = a[1].reduce((s, c) => s + c, 0);
        const bTotalGames = b[1].reduce((s, c) => s + c, 0);
        const aAvg = a[1].reduce((s, c, i) => s + c * (i + 1), 0) / aTotalGames;
        const bAvg = b[1].reduce((s, c, i) => s + c * (i + 1), 0) / bTotalGames;
        return aAvg - bAvg;
    });

    sortedBoards.forEach(([id, placements]) => {
        const totalGames = placements.reduce((s, c) => s + c, 0);
        const avgPlacement = (placements.reduce((s, c, i) => s + c * (i + 1), 0) / totalGames).toFixed(2);
        console.log(`\n${id}:`);
        console.log(`  Average Placement: ${avgPlacement}`);
        const placementsStr = placements.map((count, i) => `${i+1}: ${count}`).join(', ');
        console.log(`  ${placementsStr}`);
    });
}

run();
