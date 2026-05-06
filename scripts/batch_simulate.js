const fs = require('fs');
const path = require('path');

// --- HEADLESS DOM MOCK ---
const mockElement = (id) => ({ 
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
});

global.requestAnimationFrame = (cb) => {
    if (!cb.name || !cb.name.includes('updateBubblePosition')) cb();
};
global.window = {
    getComputedStyle: () => ({ opacity: '1', display: 'block', transform: 'none' }),
    requestAnimationFrame: (cb) => {
        if (!cb.name || !cb.name.includes('updateBubblePosition')) cb();
    },
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
    performAttack, resolveDeaths, findTarget, resolveStartOfCombatTriggers
} = require('./coliseum.js');

// Load card data
const cardData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/coliseum-cards.json'), 'utf8'));
setAvailableCards(cardData.cards);

async function simulateCombat(p1Data, p2Data) {
    // Reset state for battle
    state.phase = 'BATTLE';
    state.overallHpReducedThisFight = false;

    // Helper to setup a player object from the JSON data
    const setupPlayer = (data, isPlayer = true) => {
        const player = {
            id: isPlayer ? 1 : 2,
            name: data.hero,
            tier: data.tier,
            overallHp: 100,
            fightHp: 5 + (5 * data.tier),
            board: data.preCombatBoard.map(c => CardFactory.create(c)),
            hand: [],
            spellGraveyard: [],
            treasures: 0,
            usedHeroPower: false,
            heroPowerActivations: 0,
            blueCardsPlayed: 0,
            spellsBoughtThisGame: 0,
            hero: HEROES[data.hero.toUpperCase().replace(/\s/g, '_')] || HEROES.HEPING,
            honorBegetsGloryBonus: data.honorBegetsGloryBonus || 0,
            crainActive: data.crainActive || false
        };
        player.board.forEach(c => { 
            c.owner = isPlayer ? 'player' : 'opponent'; 
            if (c.equipment && !(c.equipment instanceof BaseCard)) {
                c.equipment = CardFactory.create(c.equipment);
            }
        });
        return player;
    };

    const p1 = setupPlayer(p1Data, true);
    const p2 = setupPlayer(p2Data, false);

    state.player = p1;
    state.opponents = [p2];
    state.currentOpponentId = 0;

    // Trigger Start of Combat
    await resolveStartOfCombatTriggers(p2);

    // Create clones for combat logic
    state.battleBoards = {
        player: p1.board.map(c => {
            const clone = c.clone();
            clone.owner = 'player';
            return clone;
        }),
        opponent: p2.board.map(c => {
            const clone = c.clone();
            clone.owner = 'opponent';
            return clone;
        })
    };

    state.battleQueues = {
        player: [...state.battleBoards.player].filter(c => !c.isLockedByChivalry),
        opponent: [...state.battleBoards.opponent].filter(c => !c.isLockedByChivalry)
    };

    state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';
    let turnsInCurrentRound = 0;
    let maxTurns = 400;

    while (p1.fightHp > 0 && p2.fightHp > 0 && 
          (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0) && maxTurns > 0) {
        
        maxTurns--;

        // Haste logic
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
            const attackerBoard = state.battleBoards[state.attackerSide];
            
            if (attackerBoard.includes(attacker) && !attacker.isDying) {
                const defenderSide = state.attackerSide === 'player' ? 'opponent' : 'player';
                const defenderBoard = state.battleBoards[defenderSide];
                const defender = findTarget(attacker, defenderBoard);
                
                const hasDoubleStrike = attacker.hasKeyword('Double strike');
                const hasFirstStrike = attacker.hasKeyword('First strike');

                if (hasDoubleStrike) {
                    await performAttack(attacker, defender, true);
                    await resolveDeaths();
                    if (p1.fightHp > 0 && p2.fightHp > 0 && attackerBoard.includes(attacker) && !attacker.isDying) {
                        const defAlive = defender && defenderBoard.includes(defender) && !defender.isDying && !defender.isDestroyed;
                        if (defAlive) {
                            await performAttack(attacker, defender, false);
                            await resolveDeaths();
                        }
                    }
                } else {
                    await performAttack(attacker, defender, hasFirstStrike);
                    await resolveDeaths();
                }

                if (attackerBoard.includes(attacker) && !attacker.isDying) {
                    currentQueue.push(attacker);
                }
            }
        }
        turnsInCurrentRound++;
        state.attackerSide = (state.attackerSide === 'player' ? 'opponent' : 'player');
    }

    if (p1.fightHp > 0 && p2.fightHp <= 0) return 'player';
    if (p2.fightHp > 0 && p1.fightHp <= 0) return 'opponent';
    return 'draw';
}

async function runBatch() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node batch_simulate.js <file1.json> <file2.json>");
        process.exit(1);
    }

    const data1 = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const data2 = JSON.parse(fs.readFileSync(args[1], 'utf8'));

    const hero1 = data1[0].hero;
    const hero2 = data2[0].hero;
    const outputFilename = `resources/training-data/sim_${hero1}_vs_${hero2}.txt`;
    const outStream = fs.createWriteStream(outputFilename);

    console.log(`Simulating: ${hero1} vs ${hero2}`);
    console.log(`Writing detailed log to ${outputFilename}...`);
    
    outStream.write(`SIMULATION RESULTS: ${hero1} vs ${hero2}\n`);
    outStream.write(`Date: ${new Date().toLocaleString()}\n\n`);

    const groupByTurn = (data) => data.reduce((acc, item) => {
        if (!acc[item.turn]) acc[item.turn] = [];
        acc[item.turn].push(item);
        return acc;
    }, {});

    const turns1 = groupByTurn(data1);
    const turns2 = groupByTurn(data2);

    const totalResults = { h1: 0, h2: 0, draws: 0 };

    for (let turn = 1; turn <= 20; turn++) {
        if (!turns1[turn] || !turns2[turn]) continue;
        
        let h1Wins = 0;
        let h2Wins = 0;
        let draws = 0;
        
        outStream.write(`--- TURN ${turn} ---\n`);

        const h1BoardStats = {};
        const h2BoardStats = {};

        for (let i = 0; i < turns1[turn].length; i++) {
            for (let j = 0; j < turns2[turn].length; j++) {
                const p1 = turns1[turn][i];
                const p2 = turns2[turn][j];
                
                const p1Id = p1.instance !== undefined ? p1.instance : i + 1;
                const p2Id = p2.instance !== undefined ? p2.instance : j + 1;

                if (!h1BoardStats[p1Id]) h1BoardStats[p1Id] = { w: 0, l: 0, d: 0 };
                if (!h2BoardStats[p2Id]) h2BoardStats[p2Id] = { w: 0, l: 0, d: 0 };

                let matchH1 = 0;
                let matchH2 = 0;
                let matchDraws = 0;

                for (let k = 0; k < 10; k++) {
                    const res = await simulateCombat(p1, p2);
                    if (res === 'player') matchH1++;
                    else if (res === 'opponent') matchH2++;
                    else matchDraws++;
                }

                h1Wins += matchH1;
                h2Wins += matchH2;
                draws += matchDraws;

                h1BoardStats[p1Id].w += matchH1;
                h1BoardStats[p1Id].l += matchH2;
                h1BoardStats[p1Id].d += matchDraws;

                h2BoardStats[p2Id].w += matchH2;
                h2BoardStats[p2Id].l += matchH1;
                h2BoardStats[p2Id].d += matchDraws;

                const p1BoardDesc = p1.preCombatBoard.map(c => c.card_name).join(', ') || 'Empty';
                const p2BoardDesc = p2.preCombatBoard.map(c => c.card_name).join(', ') || 'Empty';
                outStream.write(`Matchup: ${hero1} #${p1Id} [${p1BoardDesc}] vs ${hero2} #${p2Id} [${p2BoardDesc}]\n`);
                outStream.write(`  Record: ${hero1} ${matchH1} - ${matchH2} ${hero2} (${matchDraws} draws)\n`);
            }
        }

        outStream.write(`\n--- TURN ${turn} PER-BOARD RECORDS ---\n`);
        outStream.write(`${hero1} Individual Records:\n`);
        Object.keys(h1BoardStats).forEach(id => {
            const s = h1BoardStats[id];
            outStream.write(`  #${id}: ${s.w} wins, ${s.l} losses, ${s.d} draws\n`);
        });
        outStream.write(`${hero2} Individual Records:\n`);
        Object.keys(h2BoardStats).forEach(id => {
            const s = h2BoardStats[id];
            outStream.write(`  #${id}: ${s.w} wins, ${s.l} losses, ${s.d} draws\n`);
        });
        outStream.write(`\n`);

        const h1Summary = `${hero1} ${h1Wins}`;
        const h2Summary = `${hero2} ${h2Wins}`;
        const summaryText = h1Wins >= h2Wins ? `${h1Summary} - ${h2Summary}` : `${h2Summary} - ${h1Summary}`;
        
        outStream.write(`Turn ${turn} Summary: ${summaryText} (${draws} draws)\n\n`);
        console.log(`Turn ${turn}: ${summaryText} (${draws} draws)`);
        
        totalResults.h1 += h1Wins;
        totalResults.h2 += h2Wins;
        totalResults.draws += draws;
    }

    const summary = `
FINAL SUMMARY:
${hero1}: ${totalResults.h1} total wins
${hero2}: ${totalResults.h2} total wins
Draws: ${totalResults.draws}
`;
    outStream.write(summary);
    outStream.end();
    console.log(summary);
}

runBatch();
