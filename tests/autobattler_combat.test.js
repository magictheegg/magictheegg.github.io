// Mock DOM before requiring autobattler.js
const mockElement = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    querySelectorAll: () => [],
    querySelector: () => mockElement(),
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    style: {},
    innerHTML: '',
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
    global.WebKitCSSMatrix = class { constructor() { this.a = 1; } };
}

const { 
    state, CardFactory, BaseCard, availableCards, findTarget, triggerLifeGain, resolveCombatImpact
} = require('../scripts/autobattler.js');
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
        spellGraveyard: []
    };
    state.opponents = [
        { id: 0, name: "Opponent", overallHp: 20, fightHp: 10, board: [] }
    ];
    state.currentOpponentId = 0;
    state.phase = 'BATTLE';
    state.battleBoards = null;
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

    // 4. Ground attacks -> can't target flyer if ground available
    const groundAttacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    const targetForGround = findTarget(groundAttacker, [ground, opponentFlyer]);
    assert.strictEqual(targetForGround.card_name, "Ground", "Ground attacker should prioritize ground creature");

    // 5. Ground attacks -> targets face if only flyer is present (engine specific behavior)
    const targetForGroundOnlyAir = findTarget(groundAttacker, [opponentFlyer]);
    assert.strictEqual(targetForGroundOnlyAir.card_name, "OppFlyer", "Ground attacker should hit flyer if it's the only creature");
}

function testVigilanceTargeting() {
    resetState();
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    const regular = CardFactory.create({ card_name: "Regular", pt: "2/2" });
    const taunt = CardFactory.create({ card_name: "Taunt", pt: "2/2", rules_text: "Vigilance" });

    // Ground taunt
    const target1 = findTarget(attacker, [regular, taunt]);
    assert.strictEqual(target1.card_name, "Taunt", "Must hit ground vigilance first");

    // Air taunt
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "2/2", rules_text: "Flying" });
    const oppFlyer = CardFactory.create({ card_name: "OppFlyer", pt: "2/2", rules_text: "Flying" });
    const oppTauntFlyer = CardFactory.create({ card_name: "OppTauntFlyer", pt: "2/2", rules_text: "Flying, Vigilance" });
    
    const target2 = findTarget(flyer, [oppFlyer, oppTauntFlyer]);
    assert.strictEqual(target2.card_name, "OppTauntFlyer", "Flyer must hit air vigilance first");
}

function testMenaceBypass() {
    resetState();
    const menaceAttacker = CardFactory.create({ card_name: "Menace", pt: "2/2", rules_text: "Menace" });
    const taunt = CardFactory.create({ card_name: "Taunt", pt: "2/2", rules_text: "Vigilance" });
    const regular = CardFactory.create({ card_name: "Regular", pt: "2/2" });

    const target = findTarget(menaceAttacker, [taunt, regular]);
    assert.strictEqual(target.card_name, "Regular", "Menace should bypass Taunt");
}

function testLifelink() {
    resetState();
    const lifelinker = CardFactory.create({ card_name: "Lifelinker", pt: "3/3", rules_text: "Lifelink" });
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "3/3" });
    
    lifelinker.owner = 'player';
    enemy.owner = 'opponent';
    state.player.fightHp = 10;
    state.battleBoards = { player: [lifelinker], opponent: [enemy] };

    // 1. Attacking (Honest call)
    resolveCombatImpact(lifelinker, enemy);
    assert.strictEqual(state.player.fightHp, 13, "Should gain 3 life on attack");

    // 2. Defending (Honest call)
    resetState();
    state.player.fightHp = 10;
    const lifelinkerDef = CardFactory.create({ card_name: "Lifelinker", pt: "3/3", rules_text: "Lifelink" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "3/3" });
    lifelinkerDef.owner = 'player';
    attacker.owner = 'opponent';
    state.battleBoards = { player: [lifelinkerDef], opponent: [attacker] };
    
    resolveCombatImpact(attacker, lifelinkerDef);
    assert.strictEqual(state.player.fightHp, 10, "Should gain NO life on defense");
}

function testTrample() {
    resetState();
    const trampler = CardFactory.create({ card_name: "Trampler", pt: "5/5", rules_text: "Trample" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "1/1" });
    const neighbor = CardFactory.create({ card_name: "Neighbor", pt: "2/2" });
    
    trampler.owner = 'player';
    defender.owner = 'opponent';
    neighbor.owner = 'opponent';
    state.battleBoards = { player: [trampler], opponent: [defender, neighbor] };
    
    // Splash logic (Honest call)
    resolveCombatImpact(trampler, defender);
    assert.strictEqual(neighbor.damageTaken, 4, "Trample should splash to neighbor");

    // Face logic (Honest call)
    resetState();
    const opp = state.opponents[0];
    opp.fightHp = 10;
    const trampler2 = CardFactory.create({ card_name: "Trampler", pt: "5/5", rules_text: "Trample" });
    const defender2 = CardFactory.create({ card_name: "Defender", pt: "1/1" });
    trampler2.owner = 'player';
    defender2.owner = 'opponent';
    state.battleBoards = { player: [trampler2], opponent: [defender2] };
    resolveCombatImpact(trampler2, defender2);
    assert.strictEqual(opp.fightHp, 6, "Trample should hit face if no neighbors");
}

function testIndestructible() {
    resetState();
    const ind = CardFactory.create({ card_name: "Indestructible", pt: "2/2", rules_text: "Indestructible" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "5/5" });
    ind.owner = 'player';
    attacker.owner = 'opponent';
    state.battleBoards = { player: [ind], opponent: [attacker] };
    
    // Lethal damage: 5 (Honest call)
    resolveCombatImpact(attacker, ind);
    assert.strictEqual(ind.damageTaken, 1, "Should be saved at 1 damage (1 HP)");
    assert.strictEqual(ind.indestructibleUsed, true);

    // 1 HP Save logic
    resetState();
    const ind2 = CardFactory.create({ card_name: "Indestructible", pt: "2/2", rules_text: "Indestructible" });
    const attacker2 = CardFactory.create({ card_name: "Attacker", pt: "5/5" });
    ind2.damageTaken = 1; // 1 HP left
    ind2.owner = 'player';
    attacker2.owner = 'opponent';
    state.battleBoards = { player: [ind2], opponent: [attacker2] };
    
    resolveCombatImpact(attacker2, ind2);
    assert.strictEqual(ind2.damageTaken, 1, "Should stay at 1 damage (1 HP left)");
}

function runTests() {
    const allTests = [
        { name: "Flying/Reach Targeting", fn: testFlyingReachTargeting },
        { name: "Vigilance (Taunt) Targeting", fn: testVigilanceTargeting },
        { name: "Menace Bypass", fn: testMenaceBypass },
        { name: "Lifelink (Attack/Defend)", fn: testLifelink },
        { name: "Trample Splash", fn: testTrample },
        { name: "Indestructible Save", fn: testIndestructible }
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
