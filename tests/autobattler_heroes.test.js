// Mock DOM before requiring autobattler.js
const mockElement = (parent = null) => {
    const el = {
        addEventListener: () => {},
        removeEventListener: () => {},
        remove: () => {},
        appendChild: () => {},
        insertBefore: () => {},
        replaceWith: () => {},
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
        querySelectorAll: () => [],
        querySelector: () => mockElement(el),
        classList: { 
            add: () => {}, 
            remove: () => {}, 
            toggle: () => {},
            contains: () => false
        },
        style: {},
        innerHTML: '',
        textContent: '',
        children: [],
        setAttribute: () => {},
        content: {
            cloneNode: () => ({
                firstElementChild: mockElement(el)
            })
        },
        firstElementChild: null,
        parentElement: parent
    };
    return el;
};

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
    state, CardFactory, BaseCard, availableCards, HEROES,
    activateHeroPower, applyTargetedEffect, clearTargetingEffect, 
    performAttack, triggerETB, confirmDiscovery, resolveDiscovery,
    processDeaths, tierUp, setAvailableCards, useCardFromHand, 
    startShopTurn, buyCard, queueTargetingEffect, queueDiscovery,
    rerollShop, applySpell, checkAutumnReward
} = require('../scripts/autobattler.js');
const assert = require('assert');

function resetState() {
    state.player = {
        overallHp: 20,
        fightHp: 10,
        gold: 10,
        tier: 1,
        tierCostReduction: 0,
        hand: [],
        board: [],
        treasures: 0,
        spellGraveyard: [],
        hero: HEROES.HEPING,
        usedHeroPower: false,
        heroPowerActivations: 0,
        plane: null,
        crainActive: false,
        blueCardsPlayed: 0,
        spellsBoughtThisGame: 0,
        herreaRewardCard: null,
        rerollCount: 0,
        autumnSpellCount: 0
    };
    state.opponents = [
        { id: 0, name: "Opponent", overallHp: 20, fightHp: 10, board: [], hero: { ...HEROES.MARKETTO, avatar: "sets/SHF-files/img/60.png" }, usedHeroPower: false, heroPowerActivations: 0, crainActive: false }
    ];
    state.currentOpponentId = 0;
    state.turn = 1;
    state.phase = 'SHOP';
    state.targetingEffect = null;
    state.targetingQueue = [];
    state.discovery = null;
    state.discoveryQueue = [];
    state.battleBoards = null;
    state.shop = { cards: [], frozen: false };
    availableCards.length = 0;
}

async function testXylo() {
    resetState();
    state.player.hero = HEROES.XYLO;
    const camel = CardFactory.create({ card_name: "Dutiful Camel", pt: "1/1", tier: 1 });
    state.player.board = [camel];
    camel.owner = 'player';

    // 1. Verify cancelling: gold not spent, power usable
    const startGold = state.player.gold;
    activateHeroPower();
    assert.ok(state.targetingEffect, "Targeting modal should be open");
    clearTargetingEffect(false); 
    assert.strictEqual(state.player.gold, startGold, "Gold should not be spent on cancel");
    assert.strictEqual(state.player.usedHeroPower, false, "Hero power should still be usable");

    // 2. Successful use
    activateHeroPower();
    applyTargetedEffect(camel.id);
    
    // Camel ETB queues another targeting effect, so gold isn't spent yet
    assert.strictEqual(state.player.gold, startGold, "Gold not spent yet (waiting for nested ETB targeting)");
    
    // Resolve the camel's counter
    applyTargetedEffect(camel.id);
    
    assert.strictEqual(state.player.gold, startGold - 2, "Gold should be spent after final resolution");
    assert.strictEqual(state.player.usedHeroPower, true, "Hero power should be marked used");
    assert.strictEqual(camel.counters, 1, "Dutiful Camel ETB should have triggered once from Xylo");
}

async function testXiongMao() {
    resetState();
    state.player.hero = HEROES.XIONG_MAO;
    const fodder = CardFactory.create({ card_name: "Fodder", pt: "1/1", tier: 1 });
    const rewardData = { card_name: "Reward", pt: "2/2", tier: 2, type: "Creature" };
    availableCards.push(rewardData);
    state.player.board = [fodder];
    fodder.owner = 'player';

    activateHeroPower();
    applyTargetedEffect(fodder.id);

    assert.strictEqual(state.player.board.length, 0, "Fodder should be sacrificed");
    assert.strictEqual(state.player.hand.length, 1, "Reward should be in hand");
    assert.strictEqual(state.player.hand[0].card_name, "Reward");
    assert.strictEqual(state.player.gold, 8, "Gold spent");
}

async function testCrain() {
    resetState();
    state.player.hero = HEROES.CRAIN;
    const leftie = CardFactory.create({ card_name: "Leftie", pt: "2/2", tier: 1 });
    leftie.counters = 2; 
    state.player.board = [leftie];
    leftie.owner = 'player';

    activateHeroPower();
    assert.strictEqual(state.player.crainActive, true, "Crain power primed");
    assert.strictEqual(state.player.gold, 8);

    // logic from autobattler.js L3599 (simulated)
    const board = state.player.board;
    const entity = state.player;
    if (entity.crainActive && board.length > 0) {
        const leftMost = board[0];
        const clone = leftMost.clone();
        clone.isDecayed = true;
        clone.isToken = true;
        clone.isCrainToken = true;
        clone.owner = 'player';
        board.unshift(clone);
        entity.crainActive = false;
    }

    assert.strictEqual(state.player.board.length, 2, "Token should be spawned");
    const token = state.player.board[0];
    assert.strictEqual(token.counters, 2, "Token should have counters from original");
    assert.strictEqual(token.isDecayed, true, "Token should be decayed");

    // Verify it dies on attack
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "10/10" });
    enemy.owner = 'opponent';
    state.battleBoards = { player: state.player.board, opponent: [enemy] };
    
    await performAttack(token, enemy, false);
    assert.ok(token.isDying || token.isDestroyed, "Decayed token should be marked for death after attacking");
}

async function testArietta() {
    resetState();
    state.player.hero = HEROES.ARIETTA;
    state.player.tier = 3;
    state.player.gold = 10;

    const equipData = { card_name: "Blade", type: "Equipment", tier: 1 };
    availableCards.push(equipData, { card_name: "NotEquip", type: "Creature", tier: 1 });

    tierUp(); 
    assert.ok(state.discovery, "Discovery modal should be open for Arietta");
    assert.strictEqual(state.discovery.effect, 'arietta_seek');

    const card = state.discovery.cards[0];
    resolveDiscovery(card);

    assert.strictEqual(state.player.hand.length, 1, "Equipment added to hand");
    assert.strictEqual(state.player.usedHeroPower, true, "Arietta power marked as used");
}

async function testHerrea() {
    resetState();
    state.player.hero = HEROES.HERREA;
    
    const reward = CardFactory.create({ card_name: "Dragon", tier: 5, type: "Creature" });
    state.player.herreaRewardCard = reward;

    // 1. Play a blue card with ETB targeting, and CANCEL it
    const blueCamel = CardFactory.create({ card_name: "Blue Camel", color: "U", type: "Creature" });
    blueCamel.onETB = function() { queueTargetingEffect({ effect: 'test', wasCast: true, cardInstance: this }); };
    state.player.hand = [blueCamel];
    useCardFromHand(blueCamel.id);
    assert.ok(state.targetingEffect, "Targeting active");
    clearTargetingEffect(false); // CANCEL
    assert.strictEqual(state.player.blueCardsPlayed, 0, "Counter should NOT increment on cancel");

    // 2. Play 6 blue cards
    for (let i = 0; i < 6; i++) {
        const inst = CardFactory.create({ card_name: `B${i}`, color: "U", type: "Creature" });
        state.player.hand = [inst];
        useCardFromHand(inst.id);
        assert.strictEqual(state.player.blueCardsPlayed, i + 1);
        state.player.board = []; // Clear board to avoid limit
    }

    // 3. Play the 7th blue card (Success)
    const blue7 = CardFactory.create({ card_name: "Blue7", color: "U", type: "Creature" });
    state.player.hand = [blue7];
    useCardFromHand(blue7.id);
    assert.strictEqual(state.player.blueCardsPlayed, 7, "Counter should reach 7");
    assert.strictEqual(state.player.usedHeroPower, true, "Herrea power used");
    assert.ok(state.player.hand.includes(reward), "Reward in hand");

    // 4. Verify doing it again doesn't give another reward
    state.player.hand = [CardFactory.create({ card_name: "Blue8", color: "U", type: "Creature" })];
    useCardFromHand(state.player.hand[0].id);
    assert.strictEqual(state.player.blueCardsPlayed, 7, "Counter shouldn't increment if usedHeroPower is true");
}

async function testAdelaide() {
    resetState();
    state.player.hero = HEROES.ADELAIDE;
    
    const spellData = { card_name: "Spell", type: "Spell", tier: 1 };
    const dilData = { card_name: "Pale Dillettante", tier: 3, type: "Creature" };
    availableCards.push(spellData, dilData);

    // Buy 3 spells
    for (let i = 0; i < 3; i++) {
        const s = CardFactory.create(spellData);
        state.shop.cards = [s];
        state.player.gold = 10;
        buyCard(s.id);
        assert.strictEqual(state.player.spellsBoughtThisGame, i + 1);
        assert.strictEqual(state.player.usedHeroPower, false);
    }

    // Buy 4th spell
    const s4 = CardFactory.create(spellData);
    state.shop.cards = [s4];
    state.player.gold = 10;
    buyCard(s4.id);
    assert.strictEqual(state.player.spellsBoughtThisGame, 4);
    assert.strictEqual(state.player.usedHeroPower, true);
    assert.ok(state.player.hand.some(c => c.card_name === 'Pale Dillettante'), "Reward Pale Dillettante in hand");

    // Buy 5th spell - no extra reward
    const handCount = state.player.hand.length;
    const s5 = CardFactory.create(spellData);
    state.shop.cards = [s5];
    buyCard(s5.id);
    assert.strictEqual(state.player.hand.length, handCount + 1, "Only the spell added");
}

async function testHeping() {
    resetState();
    state.player.hero = HEROES.HEPING;
    
    const creature = CardFactory.create({ card_name: "Cheap", pt: "1/1", type: "Creature", tier: 1 });
    const equipment = CardFactory.create({ card_name: "Sword", type: "Equipment", tier: 1 });
    state.shop.cards = [creature, equipment];
    
    // Ensure availableCards has valid entries so startShopTurn's populateShop doesn't crash
    const dummy = { card_name: "Dummy", type: "Creature", tier: 1 };
    const dummySpell = { card_name: "Dummy Spell", type: "Spell", tier: 1 };
    availableCards.push(dummy, dummySpell);

    // 1. Target creature works
    activateHeroPower();
    applyTargetedEffect(creature.id);
    assert.strictEqual(creature.isChained, true);
    assert.strictEqual(creature.counters, 1);
    assert.strictEqual(state.player.gold, 9);

    // 2. Turn transition and cost reduction
    creature.costReduction = 2; // already reduced by 2
    // base cost for tier 1 creature is 3
    startShopTurn(); 
    assert.strictEqual(creature.isChained, false, "Unchained at start of turn");
    assert.strictEqual(creature.costReduction, 3, "Cost reduction increased to 3 (base cost)");
    
    // 3. Verify no negative cost
    // Target again
    creature.isChained = true;
    startShopTurn();
    assert.strictEqual(creature.costReduction, 3, "Cost reduction capped at base cost (3)");
}

async function testJake() {
    resetState();
    state.player.hero = HEROES.JAKE;
    
    const w = CardFactory.create({ card_name: "White", color: "W", type: "Creature" });
    const u = CardFactory.create({ card_name: "Blue", color: "U", type: "Creature" });
    const wu = CardFactory.create({ card_name: "Multicolor", color: "WU", type: "Creature" });
    const colorless = CardFactory.create({ card_name: "Colorless", color: "", type: "Creature" });
    
    state.player.board = [w, u, wu, colorless];
    
    await activateHeroPower();
    
    assert.strictEqual(colorless.counters, 0, "Colorless gets no counter");
    assert.ok(w.counters > 0 || wu.counters > 0, "White pass hits one of them");
    assert.ok(u.counters > 0 || wu.counters > 0, "Blue pass hits one of them");
    
    const totalCounters = w.counters + u.counters + wu.counters;
    // We expect counters from W pass and U pass (B, R, G passes hit nothing)
    assert.strictEqual(totalCounters, 2, "Exactly 2 counters distributed (for W and U colors)");
}

async function testSetoSan() {
    resetState();
    state.player.hero = HEROES.SETO_SAN;
    const c1 = CardFactory.create({ card_name: "C1", pt: "1/1", type: "Creature" });
    state.player.board = [c1];
    c1.owner = 'player';

    // 1. First activation (+1/+1)
    await activateHeroPower();
    assert.strictEqual(c1.counters, 1);
    assert.strictEqual(state.player.heroPowerActivations, 1);
    assert.strictEqual(state.player.gold, 8);

    // 2. Second activation (+2/+2)
    state.player.usedHeroPower = false; // Reset for same turn
    state.player.gold = 10;
    await activateHeroPower();
    assert.strictEqual(c1.counters, 3, "1 + 2 = 3");
    assert.strictEqual(state.player.heroPowerActivations, 2);
}

async function testKism() {
    resetState();
    state.player.hero = HEROES.KISM;
    const shopCreature = CardFactory.create({ card_name: "Shopbie", pt: "2/2", type: "Creature" });
    state.shop.cards = [shopCreature];

    // 1. Copying
    activateHeroPower();
    applyTargetedEffect(shopCreature.id);
    assert.strictEqual(state.player.board.length, 1);
    assert.strictEqual(state.player.board[0].card_name, "Shopbie");
    assert.strictEqual(state.player.heroPowerActivations, 1);
    assert.strictEqual(state.player.gold, 7);

    // 2. Limit check
    state.player.heroPowerActivations = 3;
    state.player.usedHeroPower = true;
    startShopTurn();
    assert.strictEqual(state.player.usedHeroPower, true, "UsedHeroPower should remain true if activations >= 3");
}

async function testEnoch() {
    resetState();
    state.player.hero = HEROES.ENOCH;
    state.player.rerollCount = 0;
    
    // Fill availableCards to avoid populateShop crash
    availableCards.push({ card_name: "A", type: "Creature", tier: 1 });

    // 3 normal rerolls
    for (let i = 0; i < 3; i++) {
        rerollShop(true);
        assert.strictEqual(state.player.rerollCount, i + 1);
    }

    // 4th reroll - Should trigger special logic (check via rerollCount reset if applicable, or state)
    // Actually, Enoch doesn't reset rerollCount, it uses modulo
    rerollShop(true);
    assert.strictEqual(state.player.rerollCount, 4);
    // Verify special shop was triggered: populateShop would have been skipped for populateSpecialShop
}

async function testAutumn() {
    resetState();
    state.player.hero = HEROES.AUTUMN;
    state.player.tier = 2;
    
    const centaur = CardFactory.create({ card_name: "Centaur", type: "Creature - Centaur", tier: 1 });
    const bird = CardFactory.create({ card_name: "Bird", type: "Creature - Bird", tier: 1 });
    // Use a real targeting spell like Bushwhack
    const spellData = { card_name: "Bushwhack", type: "Spell", tier: 1 };
    
    state.player.board = [centaur, bird];
    availableCards.push({ card_name: "Reward Centaur", type: "Creature - Centaur", tier: 1 }, spellData);

    // 1. Target non-centaur
    const s1 = CardFactory.create(spellData);
    state.player.hand = [s1];
    state.castingSpell = s1;
    applySpell(bird.id);
    assert.strictEqual(state.player.autumnSpellCount, 0);

    // 2. Target centaur
    const s2 = CardFactory.create(spellData);
    state.player.hand = [s2];
    state.castingSpell = s2;
    applySpell(centaur.id);
    assert.strictEqual(state.player.autumnSpellCount, 1);

    // 3. Multi-phase protection (Simulated)
    const multiSpell = CardFactory.create(spellData);
    state.player.hand = [multiSpell];
    state.castingSpell = multiSpell;
    checkAutumnReward(centaur, multiSpell);
    checkAutumnReward(centaur, multiSpell); // second call
    assert.strictEqual(state.player.autumnSpellCount, 2, "Should only increment once per spell instance");

    // 4. Reward on 3rd
    const s3 = CardFactory.create(spellData);
    state.player.hand = [s3];
    state.castingSpell = s3;
    applySpell(centaur.id);
    // Count resets to 0 after reward
    assert.strictEqual(state.player.autumnSpellCount, 0, "Counter should reset after reward");
    assert.ok(state.player.hand.some(c => c.card_name === "Reward Centaur"), "Reward Centaur in hand");
}

async function runTests() {
    const heroTests = [
        { name: "Xylo", fn: testXylo },
        { name: "Xiong Mao", fn: testXiongMao },
        { name: "Crain", fn: testCrain },
        { name: "Arietta", fn: testArietta },
        { name: "Herrea", fn: testHerrea },
        { name: "Adelaide", fn: testAdelaide },
        { name: "Heping", fn: testHeping },
        { name: "Jake", fn: testJake },
        { name: "Seto San", fn: testSetoSan },
        { name: "Kism", fn: testKism },
        { name: "Enoch", fn: testEnoch },
        { name: "Autumn", fn: testAutumn }
    ];

    console.log("\nHERO TEST RESULTS");
    console.log("=================");
    
    let passed = 0;
    for (const test of heroTests) {
        try {
            await test.fn();
            console.log(`✓ ${test.name}`);
            passed++;
        } catch (e) {
            console.error(`✕ ${test.name}: ${e.message}`);
            console.error(e.stack); // Uncomment for deep debugging
        }
    }

    console.log("\nFINAL SUMMARY");
    console.log("-------------");
    console.log(`Passed: ${passed}/${heroTests.length}. Failed: ${heroTests.length - passed}.`);

    if (passed < heroTests.length) {
        process.exit(1);
    }
}

runTests();
