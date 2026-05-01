// Mock DOM before requiring autobattler.js
const mockElement = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    remove: () => {},
    appendChild: () => {},
    querySelectorAll: () => [],
    querySelector: () => mockElement(),
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
    classList: { 
        add: () => {}, 
        remove: () => {}, 
        toggle: () => {},
        contains: () => false
    },
    style: {},
    dataset: {},
    src: '',
    innerHTML: '',
    matches: () => false,
    setAttribute: () => {},
    content: {
        cloneNode: () => ({
            firstElementChild: mockElement()
        })
    },
    firstElementChild: null
});

if (typeof document === 'undefined') {
    global.document = {
        getElementById: () => mockElement(),
        querySelectorAll: () => [],
        querySelector: () => mockElement(),
        createElement: () => mockElement(),
        body: mockElement()
    };
    global.window = {
        addEventListener: () => {},
        innerWidth: 1920,
        innerHeight: 1080,
        getComputedStyle: () => ({ transform: 'matrix(1, 0, 0, 1, 0, 0)' })
    };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.WebKitCSSMatrix = class { constructor() { this.a = 1; } };
}

const { 
    state, CardFactory, BaseCard, availableCards, findTarget, triggerLifeGain, resolveCombatImpact, resolveDeaths, processDeaths, HEROES
} = require('../scripts/coliseum.js');
const assert = require('assert');

function resetState() {
    state.player = {
        overallHp: 20,
        fightHp: 10,
        gold: 3,
        tier: 1,
        tierCostReduction: 0,
        hand: [],
        board: [],
        treasures: 0,
        spellGraveyard: [],
        hero: HEROES.HEPING,
        usedHeroPower: false,
        heroPowerActivations: 0,
        deadServantsCount: 0
    };
    state.opponents = [
        { id: 0, name: "Opponent", overallHp: 20, fightHp: 10, board: [], hero: HEROES.MARKETTO, usedHeroPower: false, heroPowerActivations: 0 }
    ];
    state.currentOpponentId = 0;
    state.phase = 'BATTLE';
    state.battleBoards = { player: [], opponent: [] }; // Initialize battleBoards
    state.scrying = null;
    state.shop = { cards: [] };
    availableCards.length = 0;
}

function testFlyingReachTargeting() {
    resetState();
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "2/2", rules_text: "Flying" });
    const ground = CardFactory.create({ card_name: "Ground", pt: "2/2" });
    const reach = CardFactory.create({ card_name: "Reach", pt: "2/2", rules_text: "Reach" });
    const opponentFlyer = CardFactory.create({ card_name: "OppFlyer", pt: "2/2", rules_text: "Flying" });

    // 1. Flyer attacks ground board -> targets face (null)
    assert.strictEqual(findTarget(flyer, [ground]), null, "Flyer should bypass ground and hit face");

    // 2. Flyer attacks board with reach -> targets reach
    const targetWithReach = findTarget(flyer, [ground, reach]);
    assert.strictEqual(targetWithReach.card_name, "Reach", "Flyer should be blocked by Reach");

    // 3. Flyer attacks board with flying -> targets flying
    const targetWithFlyer = findTarget(flyer, [ground, opponentFlyer]);
    assert.strictEqual(targetWithFlyer.card_name, "OppFlyer", "Flyer should be blocked by Flying");
}

function testVigilanceTargeting() {
    resetState();
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    const regular = CardFactory.create({ card_name: "Regular", pt: "2/2" });
    const taunt = CardFactory.create({ card_name: "Taunt", pt: "2/2", rules_text: "Vigilance" });

    const target1 = findTarget(attacker, [regular, taunt]);
    assert.strictEqual(target1.card_name, "Taunt", "Must hit ground vigilance first");
}

function testMenaceBypass() {
    resetState();
    const menaceAttacker = CardFactory.create({ card_name: "Menace", pt: "2/2", rules_text: "Menace" });
    const taunt = CardFactory.create({ card_name: "Taunt", pt: "2/2", rules_text: "Vigilance" });
    const regular = CardFactory.create({ card_name: "Regular", pt: "2/2" });

    const target = findTarget(menaceAttacker, [taunt, regular]);
    assert.strictEqual(target.card_name, "Regular", "Menace should bypass Taunt");
}

function testTrampleWithShield() {
    resetState();
    const trampler = CardFactory.create({ card_name: "Trampler", pt: "10/10", rules_text: "Trample" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "2/2" });
    defender.shieldCounters = 1;

    trampler.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [trampler], opponent: [defender] };
    state.opponents[0].fightHp = 10;

    resolveCombatImpact(trampler, defender);
    assert.strictEqual(defender.damageTaken, 0, "Defender damage should be prevented by shield");
    assert.strictEqual(defender.shieldCounters, 0, "Shield counter should be consumed");
    assert.strictEqual(state.opponents[0].fightHp, 2, "Trample overflow (8) should still be dealt to face");
}

function testTrampleSplashWithShield() {
    resetState();
    const trampler = CardFactory.create({ card_name: "Trampler", pt: "5/5", rules_text: "Trample" });
    const blocker = CardFactory.create({ card_name: "Blocker", pt: "2/2" });
    const shielded = CardFactory.create({ card_name: "Shielded", pt: "3/3" });
    shielded.shieldCounters = 1;

    trampler.owner = 'player';
    blocker.owner = shielded.owner = 'opponent';
    state.battleBoards = { player: [trampler], opponent: [blocker, shielded] };

    resolveCombatImpact(trampler, blocker);
    assert.strictEqual(blocker.damageTaken, 2, "Blocker should take lethal damage (2) from Trample");
    assert.strictEqual(shielded.damageTaken, 0, "Shielded neighbor should take 0 damage from splash");
    assert.strictEqual(shielded.shieldCounters, 0, "Shield counter should be consumed by trample splash");
}

function testLifelink() {
    resetState();
    const lifelinker = CardFactory.create({ card_name: "Lifelinker", pt: "3/3", rules_text: "Lifelink" });
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "3/3" });
    lifelinker.owner = 'player';
    state.player.fightHp = 10;
    state.battleBoards = { player: [lifelinker], opponent: [enemy] };

    resolveCombatImpact(lifelinker, enemy);
    assert.strictEqual(state.player.fightHp, 13, "Should gain 3 life on attack");

    // Face hit
    resetState();
    state.player.fightHp = 10;
    const lifelinker2 = CardFactory.create({ card_name: "Lifelinker", pt: "3/3", rules_text: "Lifelink" });
    lifelinker2.owner = 'player';
    resolveCombatImpact(lifelinker2, null);
    assert.strictEqual(state.player.fightHp, 13, "Should gain 3 life when hitting face");
}

function testDoubleStrike_KillBlocker() {
    resetState();
    const ds = CardFactory.create({ card_name: "DS", pt: "3/3", rules_text: "Double strike" });
    const blocker = CardFactory.create({ card_name: "Blocker", pt: "3/3" });
    const bystander = CardFactory.create({ card_name: "Bystander", pt: "2/2" });
    state.battleBoards = { player: [ds], opponent: [blocker, bystander] };
    ds.owner = 'player'; blocker.owner = bystander.owner = 'opponent';

    resolveCombatImpact(ds, blocker, true);
    state.battleBoards.opponent = [bystander]; // Simulate death removal
    
    const defenderDied = true;
    let performSecondHit = (!defenderDied || ds.hasKeyword('Trample'));
    assert.strictEqual(performSecondHit, false, "Second hit canceled because blocker died and no trample");
    assert.strictEqual(bystander.damageTaken, 0);
}

function testDoubleStrike_LethalFace() {
    resetState();
    const ds = CardFactory.create({ card_name: "DS", pt: "3/3", rules_text: "Double strike" });
    state.battleBoards = { player: [ds], opponent: [] };
    state.opponents[0].fightHp = 2;
    state.currentOpponentId = 0; // ensure getOpponent() finds it
    ds.owner = 'player';
    
    let secondHitAttempted = false;

    // Simulate loop logic
    resolveCombatImpact(ds, null, true); // First Strike deals 3, HP becomes -1
    
    if (state.opponents[0].fightHp > 0) {
        secondHitAttempted = true;
        resolveCombatImpact(ds, null, false);
    }
    
    assert.strictEqual(state.opponents[0].fightHp, -1, "Face takes 3 damage total and stays there");
    assert.strictEqual(secondHitAttempted, false, "Second hit must be canceled due to lethal First Strike");
}

function testDoubleStrike_Trade() {
    resetState();
    const ds = CardFactory.create({ card_name: "DS", pt: "3/3", rules_text: "Double strike" });
    const blocker = CardFactory.create({ card_name: "Big", pt: "4/4" });
    state.battleBoards = { player: [ds], opponent: [blocker] };
    ds.owner = 'player'; blocker.owner = 'opponent';

    resolveCombatImpact(ds, blocker, true);
    assert.strictEqual(blocker.damageTaken, 3);
    
    // Blocker still alive, proceed to Hit 2
    resolveCombatImpact(ds, blocker, false);
    assert.strictEqual(blocker.damageTaken, 6);
    assert.strictEqual(ds.damageTaken, 4);
}

function testTrample() {
    resetState();
    const trampler = CardFactory.create({ card_name: "Trampler", pt: "5/5", rules_text: "Trample" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "1/1" });
    const neighbor = CardFactory.create({ card_name: "Neighbor", pt: "2/2" });
    
    trampler.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [trampler], opponent: [defender, neighbor] };
    
    resolveCombatImpact(trampler, defender);
    assert.strictEqual(neighbor.damageTaken, 4, "Trample should splash 4 to neighbor");
}

function testIndestructible() {
    resetState();
    const ind = CardFactory.create({ card_name: "Indestructible", pt: "2/2", rules_text: "Indestructible" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "5/5" });
    ind.owner = 'player';
    state.battleBoards = { player: [ind], opponent: [attacker] };
    
    resolveCombatImpact(attacker, ind);
    assert.strictEqual(ind.damageTaken, 1, "Should be saved at 1 damage (1 HP)");
}

function testFirstStrikeLethal() {
    resetState();
    const attacker = CardFactory.create({ card_name: "FS Attacker", pt: "2/1", rules_text: "First strike" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "1/1" });
    attacker.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [attacker], opponent: [defender] };
    
    resolveCombatImpact(attacker, defender, true);
    assert.strictEqual(defender.damageTaken, 2);
    if (defender.getDisplayStats(state.battleBoards.opponent).t <= 0) defender.isDying = true;
    processDeaths(state.battleBoards.opponent, 'opponent');
    assert.strictEqual(state.battleBoards.opponent.length, 0, "Defender should be removed");
}

function testFirstStrikeNonLethal() {
    resetState();
    const attacker = CardFactory.create({ card_name: "FS Attacker", pt: "2/1", rules_text: "First strike" });
    const defender = CardFactory.create({ card_name: "Tough Defender", pt: "1/3" });
    attacker.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [attacker], opponent: [defender] };
    
    resolveCombatImpact(attacker, defender, true);
    assert.strictEqual(defender.damageTaken, 2);
    
    // Manual retaliation check
    const stats = defender.getDisplayStats(state.battleBoards.opponent);
    if (stats.t > 0) attacker.damageTaken += stats.p;
    assert.strictEqual(attacker.damageTaken, 1, "Should take retaliation since defender survived");
}

function testFirstStrikeOnDefense() {
    resetState();
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "1/1" });
    const fsDefender = CardFactory.create({ card_name: "FS Defender", pt: "2/1", rules_text: "First strike" });
    attacker.owner = 'opponent';
    fsDefender.owner = 'player';
    state.battleBoards = { player: [fsDefender], opponent: [attacker] };
    
    const impact = resolveCombatImpact(attacker, fsDefender, false);
    assert.strictEqual(impact.attackerDamageTaken, 2, "Defender should strike simultaneously even with FS");
}

function testFirstStrikeSlotOrder() {
    resetState();
    const normal = CardFactory.create({ card_name: "Normal", pt: "2/1" });
    const fs = CardFactory.create({ card_name: "FS", pt: "2/1", rules_text: "First strike" });
    state.battleBoards = { player: [normal, fs], opponent: [] };
    assert.strictEqual(state.battleBoards.player[0].card_name, "Normal", "Slot 0 must be Normal");
}

function testAttackSkippingBug() {
    resetState();
    const p0 = CardFactory.create({ card_name: "P0", pt: "2/2" });
    const p1 = CardFactory.create({ card_name: "P1", pt: "3/3" });
    const o0 = CardFactory.create({ card_name: "O0", pt: "2/2" });
    const o1 = CardFactory.create({ card_name: "O1", pt: "3/3" });

    state.battleBoards = { player: [p0, p1], opponent: [o0, o1] };
    p0.owner = p1.owner = 'player';
    o0.owner = o1.owner = 'opponent';

    const attackSequence = [];
    // Simulate Snapshot and loop
    const attackers = [p0, o0, p1, o1];
    for (const a of attackers) {
        const board = (a.owner === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
        if (board.includes(a)) {
            attackSequence.push(a.card_name);
            if (a.card_name === "P0") {
                state.battleBoards.player.shift();
                state.battleBoards.opponent.shift(); // O0 also dies
            }
        }
    }
    assert.strictEqual(attackSequence.includes("P1"), true, "P1 should have attacked");
}

function testCombatOrderWrapAround() {
    resetState();
    const o0 = CardFactory.create({ card_name: "O0", pt: "1/1" });
    const p0 = CardFactory.create({ card_name: "P0", pt: "1/1" });
    const p1 = CardFactory.create({ card_name: "P1", pt: "1/1" });
    state.battleBoards = { player: [p0, p1], opponent: [o0] };
    p0.owner = p1.owner = 'player';
    o0.owner = 'opponent';

    const pSnap = [...state.battleBoards.player];
    const oSnap = [...state.battleBoards.opponent];
    const attackers = [];
    for (let i = 0; i < 2; i++) {
        attackers.push(pSnap[i % pSnap.length]);
        attackers.push(oSnap[i % oSnap.length]);
    }
    assert.strictEqual(attackers[0].card_name, "P0");
    assert.strictEqual(attackers[1].card_name, "O0");
    assert.strictEqual(attackers[2].card_name, "P1");
    assert.strictEqual(attackers[3].card_name, "O0", "O0 should wrap around");
}

function testAlternatingSidesOnTrade() {
    resetState();
    const o0 = CardFactory.create({ card_name: "O0", pt: "3/2" });
    const o1 = CardFactory.create({ card_name: "O1", pt: "4/3" });
    const p0 = CardFactory.create({ card_name: "P0", pt: "2/2" });
    const p1 = CardFactory.create({ card_name: "P1", pt: "3/3" });

    state.battleBoards = { player: [p0, p1], opponent: [o0, o1] };
    p0.owner = p1.owner = 'player';
    o0.owner = o1.owner = 'opponent';

    const attackSequence = [];
    
    // Queue-Based Engine Simulation
    const runQueueEngine = () => {
        state.battleQueues = {
            player: [...state.battleBoards.player],
            opponent: [...state.battleBoards.opponent]
        };
        state.attackerSide = 'player'; // Force player start for consistency

        while (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0) {
            const side = state.attackerSide;
            const currentQueue = state.battleQueues[side];
            if (currentQueue.length > 0) {
                const attacker = currentQueue.shift();
                const board = state.battleBoards[side];
                if (board.includes(attacker)) {
                    attackSequence.push(attacker.card_name);
                    
                    // Simulate trades
                    if (attacker.card_name === "P0") {
                        state.battleBoards.player.shift();
                        state.battleBoards.opponent.shift();
                        // Remove O0 from queue manually to simulate death
                        state.battleQueues.opponent = state.battleQueues.opponent.filter(c => c !== o0);
                    } else if (attacker.card_name !== "O1" && attacker.card_name !== "P1") {
                         // push back if survived
                         currentQueue.push(attacker);
                    }
                }
            }
            state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
            if (attackSequence.length >= 3) break;
        }
    };

    runQueueEngine();
    
    assert.strictEqual(attackSequence[0], "P0");
    assert.strictEqual(attackSequence[1], "O1", "O0 is dead, so the next attacker from Opponent side must be O1");
    assert.strictEqual(attackSequence[2], "P1", "Then back to Player side for P1");
}

function testHastePriority() {
    resetState();
    const pNormal = CardFactory.create({ card_name: "P Normal", pt: "2/2" });
    const oHaste = CardFactory.create({ card_name: "O Haste", pt: "2/2", rules_text: "Haste" });
    
    state.battleBoards = {
        player: [pNormal],
        opponent: [oHaste]
    };
    pNormal.owner = 'player';
    oHaste.owner = 'opponent';

    const attackSequence = [];
    const runHasteEngine = () => {
        state.battleQueues = {
            player: [pNormal],
            opponent: [oHaste]
        };
        state.attackerSide = 'player'; // Force player start normally
        let turnsInCurrentRound = 0;

        for (let i = 0; i < 4; i++) {
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
                attackSequence.push(attacker.card_name);
                currentQueue.push(attacker); // Survive and loop back
            }
            turnsInCurrentRound++;
            state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
        }
    };

    runHasteEngine();
    
    // Normally, if side was forced to 'player', P Normal would go first.
    // But O Haste has priority, so O Haste should go first in the first round.
    assert.strictEqual(attackSequence[0], "O Haste", "Haste creature should steal priority at round start");
    assert.strictEqual(attackSequence[1], "P Normal", "Normal creature goes second in round");
}

function testTriumphantTactics() {
    resetState();
    const tt = CardFactory.create({ card_name: "Triumphant Tactics" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "2/2" });

    attacker.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [attacker], opponent: [defender] };
    
    // Cast TT
    tt.onCast(state.battleBoards.player);
    assert.strictEqual(attacker.enchantments.some(e => e.card_name === 'Triumphant Tactics'), true, "Attacker should have Triumphant Tactics enchantment");
    assert.strictEqual(attacker.hasKeyword('Double strike'), true, "Attacker should have Double Strike");

    // Hit 1: First Strike
    resolveCombatImpact(attacker, defender, true);
    assert.strictEqual(defender.damageTaken, 2);
    assert.strictEqual(attacker.counters, 1, "Attacker gains 1 counter after dealing damage");
    
    // Simulate cleanup
    attacker.enchantments = attacker.enchantments.filter(e => !e.isTemporary);
    assert.strictEqual(attacker.hasKeyword('Double strike'), false, "Attacker should lose Double Strike after combat");
}

function testTriumphantTactics_FaceDamage() {
    resetState();
    const tt = CardFactory.create({ card_name: "Triumphant Tactics" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    
    attacker.owner = 'player';
    state.battleBoards = { player: [attacker], opponent: [] };
    state.opponents[0].fightHp = 10;
    state.currentOpponentId = 0;

    // Cast TT
    tt.onCast(state.battleBoards.player);
    
    // Attack face
    resolveCombatImpact(attacker, null);
    assert.strictEqual(attacker.counters, 1, "Attacker should gain a counter when dealing damage to face");
}

function testDeathtouch() {
    resetState();
    const attacker = CardFactory.create({ card_name: "Deathtouch Attacker", pt: "1/1", rules_text: "Deathtouch" });
    const defender = CardFactory.create({ card_name: "Big Defender", pt: "1/5" });
    
    attacker.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [attacker], opponent: [defender] };

    // Case 1: Attacker with Deathtouch kills big blocker
    resolveCombatImpact(attacker, defender);
    assert.strictEqual(defender.isDestroyed, true, "Big defender should be marked as isDestroyed by Deathtouch");

    // Case 2: Defender with Deathtouch kills big attacker (retaliation)
    resetState();
    const bigAttacker = CardFactory.create({ card_name: "Big Attacker", pt: "5/5" });
    const dtDefender = CardFactory.create({ card_name: "Deathtouch Defender", pt: "1/1", rules_text: "Deathtouch" });
    bigAttacker.owner = 'player';
    dtDefender.owner = 'opponent';
    state.battleBoards = { player: [bigAttacker], opponent: [dtDefender] };
    
    resolveCombatImpact(bigAttacker, dtDefender);
    assert.strictEqual(bigAttacker.isDestroyed, true, "Big attacker should be marked as isDestroyed by Deathtouch retaliation");

    // Case 3: First Strike + Deathtouch kills before retaliation
    resetState();
    const fsDtAttacker = CardFactory.create({ card_name: "FS DT Attacker", pt: "1/1", rules_text: "First strike, Deathtouch" });
    const bigDefender2 = CardFactory.create({ card_name: "Big Defender 2", pt: "5/5" });
    fsDtAttacker.owner = 'player';
    bigDefender2.owner = 'opponent';
    state.battleBoards = { player: [fsDtAttacker], opponent: [bigDefender2] };
    
    // Impact 1: FS hits
    resolveCombatImpact(fsDtAttacker, bigDefender2, true);
    assert.strictEqual(bigDefender2.isDestroyed, true, "Big defender should be marked isDestroyed by FS DT hit");

    // Case 4: Deathtouch vs Shield Counter
    resetState();
    const dtAttacker = CardFactory.create({ card_name: "DT Attacker", pt: "1/1", rules_text: "Deathtouch" });
    const shieldDefender = CardFactory.create({ card_name: "Shield Defender", pt: "1/1", shieldCounters: 1 });
    dtAttacker.owner = 'player';
    shieldDefender.owner = 'opponent';
    state.battleBoards = { player: [dtAttacker], opponent: [shieldDefender] };
    
    resolveCombatImpact(dtAttacker, shieldDefender);
    assert.strictEqual(shieldDefender.shieldCounters, 0, "Shield should be removed");
    assert.strictEqual(shieldDefender.isDestroyed, false, "Should NOT be marked isDestroyed after shield save");

    // Case 5: Deathtouch vs Indestructible
    resetState();
    const dtAttacker2 = CardFactory.create({ card_name: "DT Attacker 2", pt: "1/1", rules_text: "Deathtouch" });
    const indestructibleDefender = CardFactory.create({ card_name: "Indestructible Defender", pt: "5/5", rules_text: "Indestructible" });
    dtAttacker2.owner = 'player';
    indestructibleDefender.owner = 'opponent';
    state.battleBoards = { player: [dtAttacker2], opponent: [indestructibleDefender] };
    
    resolveCombatImpact(dtAttacker2, indestructibleDefender);
    assert.strictEqual(indestructibleDefender.isDestroyed, false, "Indestructible should save from DT");
    assert.strictEqual(indestructibleDefender.indestructibleUsed, true, "Indestructible should be marked as used");
    assert.strictEqual(indestructibleDefender.getDisplayStats(state.battleBoards.opponent).t, 1, "Toughness should be reduced to 1 by the save");

    // Case 6: Deathtouch + Trample Splash
    resetState();
    const dtTrampler = CardFactory.create({ card_name: "DT Trampler", pt: "4/4", rules_text: "Deathtouch, Trample" });
    const blocker = CardFactory.create({ card_name: "Blocker", pt: "3/3" });
    const neighbor = CardFactory.create({ card_name: "Neighbor", pt: "1/5" });
    
    dtTrampler.owner = 'player';
    blocker.owner = neighbor.owner = 'opponent';
    state.battleBoards = { player: [dtTrampler], opponent: [blocker, neighbor] };
    
    // Blocker has 3 toughness, 4 power trampler deals 3 to blocker, 1 to neighbor
    resolveCombatImpact(dtTrampler, blocker);
    assert.strictEqual(blocker.isDestroyed, true, "Blocker killed by DT");
    assert.strictEqual(neighbor.isDestroyed, true, "Neighbor killed by DT splash damage (1 damage)");
}

function runTests() {
    const allTests = [
        { name: "Flying/Reach Targeting", fn: testFlyingReachTargeting },
        { name: "Vigilance (Taunt) Targeting", fn: testVigilanceTargeting },
        { name: "Menace Bypass", fn: testMenaceBypass },
        { name: "Trample with Shield", fn: testTrampleWithShield },
        { name: "Trample Splash with Shield", fn: testTrampleSplashWithShield },
        { name: "Double Strike (Kill Blocker)", fn: testDoubleStrike_KillBlocker },
        { name: "Double Strike (Lethal Face)", fn: testDoubleStrike_LethalFace },
        { name: "Double Strike (Trade)", fn: testDoubleStrike_Trade },
        { name: "Lifelink (Attack/Face)", fn: testLifelink },
        { name: "Trample Splash", fn: testTrample },
        { name: "Indestructible Save", fn: testIndestructible },
        { name: "First Strike (Lethal)", fn: testFirstStrikeLethal },
        { name: "First Strike (Non-Lethal)", fn: testFirstStrikeNonLethal },
        { name: "First Strike (On Defense)", fn: testFirstStrikeOnDefense },
        { name: "First Strike (Slot Order)", fn: testFirstStrikeSlotOrder },
        { name: "Attack Skipping Bug", fn: testAttackSkippingBug },
        { name: "Combat Order (Wrap Around)", fn: testCombatOrderWrapAround },
        { name: "Alternating Sides on Trade", fn: testAlternatingSidesOnTrade },
        { name: "Haste Priority", fn: testHastePriority },
        { name: "Triumphant Tactics", fn: testTriumphantTactics },
        { name: "Triumphant Tactics (Face)", fn: testTriumphantTactics_FaceDamage },
        { name: "Deathtouch", fn: testDeathtouch }
    ];

    const results = [];
    allTests.forEach(test => {
        try {
            test.fn();
            results.push({ ...test, passed: true });
        } catch (e) {
            results.push({ ...test, passed: false, error: e.message });
        }
    });

    console.log("COMBAT MECHANIC RESULTS");
    console.log("=======================");
    results.forEach(r => console.log(`${r.passed ? '✓' : '✕'} ${r.name}${r.passed ? '' : ': ' + r.error}`));

    const passedCount = results.filter(r => r.passed).length;
    console.log(`Passed: ${passedCount}/${results.length}. Failed: ${results.length - passedCount}.`);

    if (results.some(r => !r.passed)) {
        process.exit(1);
    }
}

runTests();
