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

async function runLobby(h1Instances, h2Instances, hero1Name, hero2Name, allBoards1, allBoards2, verbose = false) {
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

    const players = [];
    h1Instances.forEach(id => {
        players.push({ id: `H1-${id}`, heroName: hero1Name, instanceId: id, overallHp: 20, isH1: true, data: allBoards1[id] });
    });
    h2Instances.forEach(id => {
        players.push({ id: `H2-${id}`, heroName: hero2Name, instanceId: id, overallHp: 20, isH1: false, data: allBoards2[id] });
    });

    let turn = 2;
    let deadPlayers = [];
    let consecutiveDraws = 0;

    while (players.filter(p => p.overallHp > 0).length > 1) {
        if (verbose) console.log(`\n--- TURN ${turn - 1} (Active: ${players.filter(p => p.overallHp > 0).length}) ---`);
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

            const simP1 = { ...p1, hero: HEROES[p1.heroName.toUpperCase()], tier: b1Data.tier, fightHp: 5 + (5 * b1Data.tier), board: b1Data.preCombatBoard };
            const simP2 = { ...p2, hero: HEROES[p2.heroName.toUpperCase()], tier: b2Data.tier, fightHp: 5 + (5 * b2Data.tier), board: b2Data.preCombatBoard };
            
            const result = await simulateCombat(simP1, simP2);
            if (result.winner !== 'draw') roundHasWinner = true;

            if (result.winner === 'player') {
                if (!p2.isGhost) {
                    p2.overallHp -= result.tier;
                    if (verbose) console.log(`  ${p1.id} beat ${p2.id} (Dealt ${result.tier} damage)`);
                }
            } else if (result.winner === 'opponent') {
                if (!p1.isGhost) {
                    p1.overallHp -= result.tier;
                    if (verbose) console.log(`  ${p2.id} beat ${p1.id} (Dealt ${result.tier} damage)`);
                }
            } else if (verbose) console.log(`  ${p1.id} and ${p2.id} Drew`);
        }

        if (verbose) {
            const hpLog = players.map(p => `${p.id}:${p.overallHp}`).join(', ');
            console.log(`  Lobby HP: ${hpLog}`);
        }
        if (!roundHasWinner) consecutiveDraws++; else consecutiveDraws = 0;
        if (consecutiveDraws >= 3 || turn > 100) return { placements: [], hero: 'Draw', turnCount: turn };

        active.forEach(p => { if (p.overallHp <= 0 && !deadPlayers.includes(p)) deadPlayers.push(p); });
        turn++;
    }

    const finalPlacements = players.sort((a,b) => b.overallHp - a.overallHp);
    const winner = finalPlacements.find(p => p.overallHp > 0);
    return { placements: finalPlacements, hero: winner ? (winner.isH1 ? hero1Name : hero2Name) : 'Draw', turnCount: turn };
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 2) { console.log("Usage: node lobby_simulate.js <h1.json> <h2.json>"); process.exit(1); }

    const data1 = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const data2 = JSON.parse(fs.readFileSync(args[1], 'utf8'));

    const hero1Name = data1[0].hero;
    const hero2Name = data2[0].hero;

    const organize = (data) => {
        const obj = {};
        data.forEach(d => {
            if (!obj[d.instance]) obj[d.instance] = { maxTurn: 0 };
            const board = d.preCombatBoard.map(c => {
                const inst = CardFactory.create(c);
                if (c.equipment) inst.equipment = CardFactory.create(c.equipment);
                return inst;
            });
            obj[d.instance][d.turn] = { ...d, preCombatBoard: board };
            if (d.turn > obj[d.instance].maxTurn) obj[d.instance].maxTurn = d.turn;
        });
        return obj;
    };

    console.log("Preparing board instances...");
    const allBoards1 = organize(data1);
    const allBoards2 = organize(data2);
    const instances = Object.keys(allBoards1).filter(k => k !== 'maxTurn').map(Number);
    const combos = getCombinations(instances, 4);

    state.isSimulating = true;
    console.log(`Simulating 4900 games: ${hero1Name} vs ${hero2Name}`);
    
    const placementStats = {};
    instances.forEach(i => {
        placementStats[`H1-${i}`] = Array(8).fill(0);
        placementStats[`H2-${i}`] = Array(8).fill(0);
    });
    const gameLengthDistribution = {};
    let successfulGames = 0;
    const startTime = process.hrtime();
    let totalCombatTime = 0;

    for (let i = 0; i < combos.length; i++) {
        for (let j = 0; j < combos.length; j++) {
            const isFirst = (i === 0 && j === 0);
            const lobbyStart = process.hrtime();
            const res = await runLobby(combos[i], combos[j], hero1Name, hero2Name, allBoards1, allBoards2, isFirst);
            const lobbyDiff = process.hrtime(lobbyStart);
            const lobbyMs = (lobbyDiff[0] * 1e9 + lobbyDiff[1]) / 1e6;
            totalCombatTime += lobbyMs;
            
            if (res.hero !== 'Draw' && res.placements.length > 0) {
                successfulGames++;
                gameLengthDistribution[res.turnCount] = (gameLengthDistribution[res.turnCount] || 0) + 1;
                res.placements.forEach((p, idx) => {
                    if(placementStats[p.id]) placementStats[p.id][idx]++;
                });
            }
            
            const total = (i * combos.length) + j + 1;
            if (total % 100 === 0) {
                const elapsed = process.hrtime(startTime);
                const elapsedSec = (elapsed[0] + elapsed[1] / 1e9).toFixed(1);
                const avgMs = (totalCombatTime / total).toFixed(2);
                const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
                console.log(`Progress: ${total}/4900... [${elapsedSec}s, avg ${avgMs}ms, mem ${mem}MB]`);
            }
        }
    }

    const totalElapsed = process.hrtime(startTime);
    const totalSec = (totalElapsed[0] + totalElapsed[1] / 1e9).toFixed(2);
    const h1Wins = Object.keys(placementStats).filter(k => k.startsWith('H1')).reduce((sum, k) => sum + placementStats[k][0], 0);
    const h2Wins = Object.keys(placementStats).filter(k => k.startsWith('H2')).reduce((sum, k) => sum + placementStats[k][0], 0);
    const totalTurns = Object.entries(gameLengthDistribution).reduce((sum, [len, count]) => sum + (Number(len) * count), 0);
    
    console.log("\n--- LOBBY SIMULATION SUMMARY ---");
    console.log(`Total Time: ${totalSec}s | Avg: ${(totalCombatTime / successfulGames).toFixed(2)}ms`);
    console.log(`${hero1Name} lobby wins: ${h1Wins}`);
    console.log(`${hero2Name} lobby wins: ${h2Wins}`);
    
    console.log("\nGame Length Distribution:");
    Object.entries(gameLengthDistribution).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([len, count]) => {
        console.log(`  ${len - 1} turns: ${count} games`);
    });
    console.log(`Average Game Length: ${(totalTurns / successfulGames - 1).toFixed(1)} turns`);
    
    function getOrdinalSuffix(i) {
        const j = i % 10, k = i % 100;
        if (j == 1 && k != 11) return "st";
        if (j == 2 && k != 12) return "nd";
        if (j == 3 && k != 13) return "rd";
        return "th";
    }

    console.log("\nIndividual Board Placements (Sorted by Avg Placement):");
    const sortedBoards = Object.entries(placementStats).sort((a,b) => {
        const aTotalGames = a[1].reduce((s, c) => s + c, 0);
        const bTotalGames = b[1].reduce((s, c) => s + c, 0);
        const aAvg = a[1].reduce((s, c, i) => s + c * (i + 1), 0) / aTotalGames;
        const bAvg = b[1].reduce((s, c, i) => s + c * (i + 1), 0) / bTotalGames;
        return aAvg - bAvg;
    });

    sortedBoards.forEach(([id, placements]) => {
        const hero = id.startsWith('H1') ? hero1Name : hero2Name;
        const instance = id.split('-')[1];
        const totalGames = placements.reduce((s, c) => s + c, 0);
        const avgPlacement = (placements.reduce((s, c, i) => s + c * (i + 1), 0) / totalGames).toFixed(2);

        console.log(`\n${hero} #${instance}:`);
        console.log(`  Average Placement: ${avgPlacement}`);
        const placementsStr = placements.map((count, i) => `${i+1}${getOrdinalSuffix(i+1)}: ${count}`).join(', ');
        console.log(`  ${placementsStr}`);
    });
}

run();
