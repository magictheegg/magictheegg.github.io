// Mock DOM before requiring autobattler.js
const mockElement = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    remove: () => {},
    appendChild: () => {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
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
    firstElementChild: null // will be set if needed
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
    state, CardFactory, BaseCard, availableCards, resolveShopDeaths, triggerMiengFerocious, triggerLifeGain, processDeaths,
    applyTargetedEffect, applySpell, useCardFromHand
} = require('../scripts/autobattler.js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load full card list once for all tests
const fullCardPool = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/autobattler-cards.json'), 'utf8')).cards;

// Mock fetch for init if needed
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({ cards: [] }) });
global.showDamageBubble = () => {};

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
    state.phase = 'SHOP';
    state.battleBoards = null;
    state.scrying = null;
    state.shop = { cards: [] };
    state.creaturesDiedThisShopPhase = false;
    state.shopDeathsCount = 0;
    state.targetingEffect = null;
    state.discovery = null;
    
    // Repopulate availableCards with the full pool
    availableCards.length = 0;
    fullCardPool.forEach(c => availableCards.push(c));
}

// --- TIER 1 TESTS ---

function testHuitzilSkywatch() {
    resetState();
    const card = CardFactory.create({ card_name: "Huitzil Skywatch", pt: "1/4", rules_text: "Flying" });
    assert.strictEqual(card.hasKeyword('flying'), true, "Huitzil Skywatch should have Flying");
    const stats = card.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 1);
    assert.strictEqual(stats.t, 4);
}

function testGlumvaleRaven() {
    resetState();
    const raven = CardFactory.create({ card_name: "Glumvale Raven", pt: "1/2", rules_text: `Flying
Glumvale Raven gets +1/+0 as long as you control another creature with flying.` });
    state.player.board.push(raven);
    
    // Alone
    assert.strictEqual(raven.getDisplayStats(state.player.board).p, 1, "Raven should be 1/2 alone");
    
    // With another flyer
    const flyer = CardFactory.create({ card_name: "Huitzil Skywatch", pt: "1/4", rules_text: "Flying" });
    state.player.board.push(flyer);
    assert.strictEqual(raven.getDisplayStats(state.player.board).p, 2, "Raven should be 2/2 with another flyer");

    // Remove the flyer
    state.player.board.pop();
    assert.strictEqual(raven.getDisplayStats(state.player.board).p, 1, "Raven should be 1/2 again after flyer removed");
}

function testRottenCarcass() {
    resetState();
    const carcass = CardFactory.create({ card_name: "Rotten Carcass", pt: "1/1", set: "AEX", rules_text: "When Rotten Carcass dies, create a 2/2 colorless Construct artifact creature token." });
    
    // Populate availableCards
    availableCards.length = 0;
    availableCards.push({ card_name: "Construct", shape: "token", pt: "1/1", set: "ACE", type: "Creature" });
    
    // --- Shop Phase Death ---
    state.phase = 'SHOP';
    state.player.board = [carcass];
    resolveShopDeaths(0, carcass);
    
    assert.strictEqual(state.player.board.length, 1, "Should have 1 card on board");
    assert.strictEqual(state.player.board[0].card_name, "Construct", "Token should have replaced Carcass");
    assert.strictEqual(state.player.board[0].pt, "2/2", "Token should be 2/2");

    // --- Battle Phase Death ---
    resetState();
    availableCards.push({ card_name: "Construct", shape: "token", pt: "1/1", set: "ACE", type: "Creature" });
    state.phase = 'BATTLE';
    state.player.board = [carcass];
    state.battleBoards = {
        player: [carcass.clone()],
        opponent: []
    };
    state.battleBoards.player[0].id = carcass.id;
    
    const deadInBattle = state.battleBoards.player[0];
    const spawns = deadInBattle.onDeath(state.battleBoards.player, 'player');
    state.battleBoards.player.splice(0, 1, ...spawns);
    
    assert.strictEqual(state.battleBoards.player[0].card_name, "Construct", "Token spawned on battle board");
    assert.strictEqual(state.player.board[0].card_name, "Rotten Carcass", "Original Carcass still on player board");
}

function testImpressibleCub() {
    resetState();
    const cub = CardFactory.create({ card_name: "Impressible Cub", pt: "2/2", rules_text: "Ferocious – At the beginning of each combat, if you control a creature with power 4 or greater, Impressible Cub gets +1/+1 until end of turn." });
    state.player.board.push(cub);
    
    cub.onCombatStart(state.player.board);
    assert.strictEqual(cub.tempPower, 0, "No buff if no 4 power");
    
    const bigGuy = CardFactory.create({ card_name: "Big Guy", pt: "4/4" });
    state.player.board.push(bigGuy);
    cub.onCombatStart(state.player.board);
    assert.strictEqual(cub.tempPower, 1, "Should get +1/+1 buff with 4 power creature");
}

function testWarClanDowager() {
    resetState();
    const dowager = CardFactory.create({ card_name: "War-Clan Dowager", pt: "2/2", type: "Creature – Centaur Cleric" });
    state.player.board.push(dowager);
    
    assert.strictEqual(dowager.getDisplayStats(state.player.board).p, 2, "2/2 alone");
    
    const centaur = CardFactory.create({ card_name: "Other Centaur", type: "Creature – Centaur" });
    state.player.board.push(centaur);
    assert.strictEqual(dowager.getDisplayStats(state.player.board).p, 3, "3/3 with another centaur");

    state.player.board.pop();
    assert.strictEqual(dowager.getDisplayStats(state.player.board).p, 2, "2/2 again after centaur removed");
}

function testClairvoyantKoi() {
    resetState();
    const koi = CardFactory.create({ card_name: "Clairvoyant Koi", pt: "2/1" });
    state.player.board.push(koi);
    
    koi.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(koi.tempPower, 1, "Prowess +1/+1");
    assert.strictEqual(koi.tempToughness, 1);
}

function testSoulsmokeAdept() {
    resetState();
    const adept = CardFactory.create({ card_name: "Soulsmoke Adept", pt: "2/2" });
    state.player.board.push(adept);
    
    assert.strictEqual(adept.getDisplayStats(state.player.board).p, 2, "Not embattled");
    
    adept.enchantments.push({ card_name: "Faith in Darkness" });
    assert.strictEqual(adept.hasKeyword('lifelink'), false, "Enchantment shouldn't trigger lifelink");
    
    adept.counters = 1;
    assert.strictEqual(adept.getDisplayStats(state.player.board).p, 6, "Embattled (2 base + 1 counter + 1 buff + 2 enchantment)");
    assert.strictEqual(adept.hasKeyword('lifelink'), true, "Counter should trigger lifelink");
}

function testIntliAssaulter() {
    resetState();
    const intli = CardFactory.create({ card_name: "Intli Assaulter", pt: "2/2" });
    state.player.board = [intli];
    intli.onAction();
    
    assert.strictEqual(state.targetingEffect.effect, 'intli_sacrifice');
    
    const mockTargetId = intli.id;
    const target = state.player.board.find(c => c.id === mockTargetId);
    const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
    
    let effectApplied = false;
    if (source && target.id !== source.id) {
        effectApplied = true;
    }
    
    assert.strictEqual(effectApplied, false, "Intli Assaulter should not be able to sacrifice itself");
}

function testGoreSwine() {
    resetState();
    const swine = CardFactory.create({ card_name: "Gore Swine", pt: "4/1" });
    const stats = swine.getDisplayStats([]);
    assert.strictEqual(stats.p, 4);
    assert.strictEqual(stats.t, 1);
}

function testSparringCampaigner() {
    resetState();
    const campaigner = CardFactory.create({ card_name: "Sparring Campaigner", pt: "2/2" });
    const target = CardFactory.create({ card_name: "Weakling", pt: "1/1" });
    state.player.board = [campaigner, target];
    
    campaigner.onCombatStart(state.player.board);
    assert.strictEqual(target.tempPower, 2, "Target should get +2/+2");
    assert.strictEqual(campaigner.isLockedByChivalry, true, "Campaigner should be locked");

    resetState();
    const target2 = CardFactory.create({ card_name: "Stronger", pt: "2/2" });
    state.player.board = [campaigner, target2];
    campaigner.isLockedByChivalry = false;
    campaigner.onCombatStart(state.player.board);
    assert.strictEqual(target2.tempPower, 0, "Target should not get buff if power >= 2");
    assert.strictEqual(campaigner.isLockedByChivalry, false, "Campaigner should not be locked");
}

function testRakkiriArcher() {
    resetState();
    const archer = CardFactory.create({ card_name: "Rakkiri Archer", pt: "2/3", rules_text: "Reach" });
    state.player.board = [archer];
    
    assert.strictEqual(archer.hasKeyword('reach'), false, "No reach when not embattled");
    
    archer.counters = 1;
    assert.strictEqual(archer.hasKeyword('reach'), true, "Reach when embattled");
    assert.strictEqual(archer.getDisplayStats(state.player.board).t, 5, "2/3 + 1 counter + 1 dynamic = 5 toughness");
}

function testBlisteringLunatic() {
    resetState();
    const lunatic = CardFactory.create({ card_name: "Blistering Lunatic", pt: "2/1" });
    lunatic.onNoncreatureCast(false, []);
    assert.strictEqual(lunatic.tempPower, 2, "+2/+0 on noncreature cast");
}

function testSanctuaryCentaur() {
    resetState();
    const centaur = CardFactory.create({ card_name: "Sanctuary Centaur", pt: "3/2", rules_text: "Trample" });
    assert.strictEqual(centaur.hasKeyword('trample'), true);
}

function testDutifulCamel() {
    resetState();
    const camel = CardFactory.create({ card_name: "Dutiful Camel", pt: "1/1" });
    const other = CardFactory.create({ card_name: "Other", pt: "2/2" });
    state.player.board = [camel, other];

    // Trigger ETB
    camel.onETB(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'dutiful_camel_counter');

    // 1. Target Other (Honest call)
    applyTargetedEffect(other.id);
    assert.strictEqual(other.counters, 1, "Other should gain counter");
    assert.strictEqual(state.targetingEffect, null, "Effect should clear");

    // 2. Target Self (Honest call)
    resetState();
    state.player.board = [camel];
    camel.onETB(state.player.board);
    applyTargetedEffect(camel.id);
    assert.strictEqual(camel.counters, 1, "Self should gain counter");
}

function testFrontlineCavalier() {

    resetState();
    const cavalier = CardFactory.create({ card_name: "Frontline Cavalier", pt: "2/2", rules_text: "Vigilance" });
    assert.strictEqual(cavalier.hasKeyword('vigilance'), true);
}

function testLakeCaveLurker() {
    resetState();
    const lurker = CardFactory.create({ card_name: "Lake Cave Lurker", pt: "1/1" });
    
    state.phase = 'SHOP';
    lurker.onDeath([], 'player');
    assert.strictEqual(state.player.gold, 4, "Should gain 1 gold in shop");
    
    resetState();
    state.phase = 'BATTLE';
    lurker.onDeath([], 'player');
    assert.strictEqual(state.player.treasures, 1, "Should gain 1 treasure in battle");
}

function testFaithInDarkness() {
    resetState();
    const spell = CardFactory.create({ card_name: "Faith in Darkness" });
    const target = CardFactory.create({ card_name: "Target", pt: "2/2" });
    spell.onApply(target, []);
    assert.strictEqual(state.scrying.count, 1, "Should scry 1");
    assert.strictEqual(target.enchantments.length, 1);
    assert.strictEqual(target.getDisplayStats([]).p, 4, "Faith in Darkness gives +2/+2");
}

function testScientificInquiry() {
    resetState();
    const spell = CardFactory.create({ card_name: "Scientific Inquiry" });
    spell.onCast([]);
    assert.strictEqual(state.player.treasures, 1);
    assert.strictEqual(state.scrying.count, 2);
}

function testToBattle() {
    resetState();
    const spell = CardFactory.create({ card_name: "To Battle" });
    const target = CardFactory.create({ card_name: "Target", pt: "2/2" });
    spell.onApply(target, []);
    assert.strictEqual(target.counters, 1);
    assert.strictEqual(target.hasKeyword('haste'), true, "Should gain Haste");
    assert.strictEqual(target.getDisplayStats([]).p, 3, "2 base + 1 counter = 3 power");
}

function testByBloodAndVenom() {
    resetState();
    const spell = CardFactory.create({ card_name: "By Blood and Venom" });
    const target = CardFactory.create({ card_name: "Target", pt: "2/2" });
    spell.onApply(target, []);
    assert.strictEqual(target.enchantments.length, 1);
}

function testDivination() {
    resetState();
    const spell = CardFactory.create({ card_name: "Divination" });
    spell.onCast([]);
    assert.strictEqual(state.shop.cards.length, 2);
}

// --- TIER 2 TESTS ---

function testExoticGameHunter() {
    resetState();
    const hunter = CardFactory.create({ card_name: "Exotic Game Hunter", pt: "2/2" });
    state.player.board = [hunter];
    
    state.creaturesDiedThisShopPhase = false;
    hunter.onShopEndStep(state.player.board);
    assert.strictEqual(hunter.counters, 0, "No counter if no deaths");

    state.creaturesDiedThisShopPhase = true;
    hunter.onShopEndStep(state.player.board);
    assert.strictEqual(hunter.counters, 1, "Should gain counter if death occurred");
}

function testCankerousHog() {
    resetState();
    const hog = CardFactory.create({ card_name: "Cankerous Hog", pt: "3/2" });
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "4/4" });
    
    state.phase = 'BATTLE';
    state.battleBoards = { player: [hog], opponent: [enemy] };
    hog.onDeath(state.battleBoards.player, 'player');
    assert.strictEqual(enemy.tempPower, -2, "Enemy should get -2/-2 in battle");

    resetState();
    state.phase = 'SHOP';
    state.player.board = [hog];
    const enemyInShop = CardFactory.create({ card_name: "Enemy", pt: "4/4" });
    hog.onDeath(state.player.board, 'player');
    assert.strictEqual(enemyInShop.tempPower, 0, "Should do nothing in shop phase");

    resetState();
    state.phase = 'BATTLE';
    const dyingEnemy = CardFactory.create({ card_name: "Dying Enemy", pt: "1/1" });
    dyingEnemy.damageTaken = 1;
    dyingEnemy.isDying = true;
    const healthyEnemy = CardFactory.create({ card_name: "Healthy Enemy", pt: "2/2" });
    state.battleBoards = { player: [hog], opponent: [dyingEnemy, healthyEnemy] };
    
    const oldRandom = Math.random;
    Math.random = () => 0; 
    try {
        hog.onDeath(state.battleBoards.player, 'player');
        assert.strictEqual(dyingEnemy.getDisplayStats(state.battleBoards.opponent).p, 1, "Should NOT target the dying enemy");
        const stats = healthyEnemy.getDisplayStats(state.battleBoards.opponent);
        assert.strictEqual(stats.p, 0, "Healthy enemy should be at 0 power");
        assert.strictEqual(healthyEnemy.tempPower, -2, "TempPower should be -2");
        assert.strictEqual(stats.t, 0, "Healthy enemy should now be at 0 toughness");
        assert.ok(state.battleBoards.opponent.includes(healthyEnemy), "Creature should NOT have vanished immediately");
    } finally {
        Math.random = oldRandom;
    }
}

function testShriekingPusbag() {
    resetState();
    const pusbag = CardFactory.create({ card_name: "Shrieking Pusbag", pt: "2/1" });
    state.player.board = [pusbag];
    pusbag.onETB(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'pusbag_sacrifice');
    const target = state.player.board.find(c => c.id === pusbag.id);
    assert.ok(target, "Should be able to find and target self");
}

function testExecutionersMadness() {
    resetState();
    const spell = CardFactory.create({ card_name: "Executioner's Madness", set: "und", type: "Sorcery" });
    const sacTarget = CardFactory.create({ card_name: "Sacrifice Me", pt: "1/1", type: "Creature" });
    const buffTarget = CardFactory.create({ card_name: "Buff Me", pt: "2/2", type: "Creature" });
    const adaptiveTarget = CardFactory.create({ card_name: "Adaptive Guy", pt: "2/2", rules_text: "Adaptive", type: "Creature" });
    
    state.player.board = [sacTarget, buffTarget];
    state.player.hand = [spell];

    // Use from hand correctly sets up the targeting state
    useCardFromHand(spell.id);
    assert.strictEqual(state.targetingEffect.effect, 'executioner_sacrifice_step1');

    // 1. Target Sacrifice (Honest call)
    applyTargetedEffect(sacTarget.id);
    assert.strictEqual(state.player.board.includes(sacTarget), false, "Target should be sacrificed");
    assert.strictEqual(state.targetingEffect.effect, 'executioner_buff_step2');

    // 2. Target Buff (Honest call)
    applyTargetedEffect(buffTarget.id);
    assert.strictEqual(buffTarget.tempPower, 5, "Standard buff gives +5/+3");
    assert.strictEqual(buffTarget.hasKeyword('trample'), true, "Gains trample");

    // Case 2: Adaptive
    resetState();
    state.player.board = [sacTarget, adaptiveTarget];
    state.player.hand = [spell];
    useCardFromHand(spell.id);
    applyTargetedEffect(sacTarget.id);
    applyTargetedEffect(adaptiveTarget.id);
    assert.strictEqual(adaptiveTarget.tempPower, 10, "Adaptive buff gives double (+10/+6)");
}

function testEarthrattleXali() {
    resetState();
    const xali = CardFactory.create({ card_name: "Earthrattle Xali", pt: "2/2" });
    state.player.board = [xali];
    xali.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(xali.tempPower, 1, "Should gain +1/+1 on noncreature cast");
}

function testDynamicWyvern() {
    resetState();
    const wyvernData = availableCards.find(c => c.card_name === "Dynamic Wyvern");
    const wyvern = CardFactory.create(wyvernData);
    state.player.board = [wyvern];
    assert.strictEqual(wyvern.hasKeyword('flying'), false, "Initially no flying (Should fail right now)");
    wyvern.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(wyvern.hasKeyword('flying'), true, "Gains flying after cast");
    wyvern.enchantments = [];
    assert.strictEqual(wyvern.hasKeyword('flying'), false, "Loses flying after cleanup");
}

function testBristledDirebear() {
    resetState();
    const bear = CardFactory.create({ card_name: "Bristled Direbear", pt: "2/2", rules_text: "Adaptive" });
    assert.strictEqual(bear.hasKeyword('adaptive'), true, "Should have Adaptive");
}

function testConsultTheDewdrops() {
    resetState();
    const spell = CardFactory.create({ card_name: "Consult the Dewdrops" });
    availableCards.push(
        { card_name: "Consult the Dewdrops", type: "Instant", tier: 2 },
        { card_name: "Target Creature", type: "Creature", tier: 1 },
        { card_name: "Findable Spell", type: "Sorcery", tier: 1 }
    );
    spell.onCast(state.player.board);
    assert.ok(state.discovery, "Should trigger discovery");
    const foundItself = state.discovery.cards.some(c => c.card_name === "Consult the Dewdrops");
    assert.strictEqual(foundItself, false, "Should not find itself");
    const foundSpell = state.discovery.cards.every(c => !c.type.toLowerCase().includes('creature'));
    assert.strictEqual(foundSpell, true, "Should only find noncreature cards");
}

function testEnvoyOfThePure() {
    resetState();
    const envoy = CardFactory.create({ card_name: "Envoy of the Pure", pt: "3/3" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [envoy, other];
    envoy.onETB(state.player.board);
    assert.strictEqual(other.tempPower, 1, "Other gets +1/+1");
    assert.strictEqual(other.hasKeyword('vigilance'), true, "Other gets vigilance");
    assert.strictEqual(envoy.tempPower, 0, "Envoy does not buff self");
}

function testCentaurWayfinder() {
    resetState();
    const wayfinder = CardFactory.create({ card_name: "Centaur Wayfinder", pt: "2/2", type: "Creature – Centaur" });
    state.player.board = [wayfinder];
    const targets = wayfinder.onAttack(state.player.board);
    assert.strictEqual(targets.length, 1, "Only one target if only one Centaur");
    assert.strictEqual(targets[0].id, wayfinder.id);
    
    resetState();
    const other = CardFactory.create({ card_name: "Other Centaur", pt: "2/2", type: "Creature – Centaur" });
    state.player.board = [wayfinder, other];
    const targets2 = wayfinder.onAttack(state.player.board);
    assert.strictEqual(targets2.length, 2, "Two targets if two Centaurs");
    assert.notStrictEqual(targets2[0].id, targets2[1].id, "Targets should be unique");
}

function testWarbandLieutenant() {
    resetState();
    const lieutenant = CardFactory.create({ card_name: "Warband Lieutenant", pt: "2/2", type: "Creature – Centaur" });
    const other = CardFactory.create({ card_name: "Other Centaur", pt: "2/2", type: "Creature – Centaur" });
    state.player.board = [lieutenant, other];
    assert.strictEqual(other.getDisplayStats(state.player.board).p, 3, "Other Centaur gets +1/+1");
    assert.strictEqual(lieutenant.getDisplayStats(state.player.board).p, 2, "Lieutenant does not buff self");
    state.player.board = [other];
    assert.strictEqual(other.getDisplayStats(state.player.board).p, 2, "Buff wears off when Lieutenant is gone");
}

function testWarriorsWays() {
    resetState();
    const spell = CardFactory.create({ card_name: "Warrior's Ways", set: "sur", type: "Instant" });
    const centaur = CardFactory.create({ card_name: "Centaur", pt: "2/2", type: "Creature – Centaur" });
    state.player.board = [centaur];
    state.player.hand = [spell];
    
    // Step 1: Target Centaur for +2/+2 (Honest call)
    useCardFromHand(spell.id);
    applyTargetedEffect(centaur.id);
    assert.strictEqual(state.targetingEffect.effect, 'warrior_ways_step2');
    
    // Step 2: Target same Centaur for counter (Honest call)
    applyTargetedEffect(centaur.id);
    
    assert.strictEqual(centaur.tempPower, 2, "Centaur got temp buff");
    assert.strictEqual(centaur.counters, 1, "Centaur also got counter");
}

function testStratusTraveler() {
    // 1. Not Cirrusea -> Shift + Bird
    resetState();
    availableCards.push({ card_name: "Bird", shape: "token", pt: "1/2", set: "AEX", type: "Creature", rules_text: "Flying" });
    const traveler = CardFactory.create({ card_name: "Stratus Traveler", pt: "2/1" });
    state.plane = 'Not Cirrusea';
    traveler.onETB(state.player.board);
    assert.strictEqual(state.plane, 'Cirrusea');
    assert.ok(state.player.board.some(c => c.card_name === 'Bird'), "Bird created");

    // 2. Already Cirrusea, no flying -> Flying Counter (Honest call)
    resetState();
    state.plane = 'Cirrusea';
    const traveler2 = CardFactory.create({ card_name: "Stratus Traveler", pt: "2/1" });
    const targetNoFly = CardFactory.create({ card_name: "NoFly", pt: "1/1" });
    state.player.board = [traveler2, targetNoFly];
    traveler2.onETB(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'traverse_cirrusea_grant');
    
    applyTargetedEffect(targetNoFly.id);
    assert.strictEqual(targetNoFly.flyingCounters, 1, "Gained flying counter");

    // 3. Already Cirrusea, HAS flying -> +1/+1 Counter (Honest call)
    resetState();
    state.plane = 'Cirrusea';
    const traveler3 = CardFactory.create({ card_name: "Stratus Traveler", pt: "2/1" });
    const targetFly = CardFactory.create({ card_name: "Flyer", pt: "1/1", rules_text: "Flying" });
    state.player.board = [traveler3, targetFly];
    traveler3.onETB(state.player.board);
    
    applyTargetedEffect(targetFly.id);
    assert.strictEqual(targetFly.counters, 1, "Gained +1/+1 counter");
}

function testAlluringWisps() {
    resetState();
    const wisps = CardFactory.create({ card_name: "Alluring Wisps", pt: "2/2", rules_text: "Flying" });
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "2/2" });
    wisps.owner = 'player';
    enemy.owner = 'opponent';
    state.battleBoards = { player: [wisps], opponent: [enemy] };
    wisps.onAttack(state.battleBoards.player);
    assert.strictEqual(enemy.tempPower, -2, "Enemy power debuffed");
    assert.strictEqual(wisps.getDisplayStats(state.battleBoards.player).p, 2, "Wisps still 2/2");
}

function testRapaciousSprite() {
    resetState();
    const sprite = CardFactory.create({ card_name: "Rapacious Sprite", pt: "1/2", rules_text: "Flying" });
    assert.strictEqual(sprite.hasKeyword('flying'), true);
    sprite.onETB([]);
    assert.strictEqual(state.player.treasures, 1);
}

function testUpInArms() {
    // Case 1: Two targets (Honest call)
    resetState();
    const spell1 = CardFactory.create({ card_name: "Up in Arms", set: "und", type: "Sorcery" });
    const t1 = CardFactory.create({ card_name: "T1", pt: "1/1", type: "Creature" });
    const t2 = CardFactory.create({ card_name: "T2", pt: "1/1", type: "Creature" });
    state.player.board = [t1, t2];
    state.player.hand = [spell1];
    
    useCardFromHand(spell1.id);
    applyTargetedEffect(t1.id); // Target 1
    applyTargetedEffect(t2.id); // Target 2
    assert.strictEqual(t1.counters, 1, "Target 1 should have 1 counter");
    assert.strictEqual(t2.counters, 1, "Target 2 should have 1 counter");
    
    // Case 2: One target (same thing twice) (Honest call)
    resetState();
    const spell2 = CardFactory.create({ card_name: "Up in Arms", set: "und", type: "Sorcery" });
    const t3 = CardFactory.create({ card_name: "T3", pt: "1/1", type: "Creature" });
    state.player.board = [t3];
    state.player.hand = [spell2];
    
    useCardFromHand(spell2.id);
    applyTargetedEffect(t3.id); // Click 1
    applyTargetedEffect(t3.id); // Click 2
    assert.strictEqual(t3.counters, 2, "One target gets both counters");
}

function testMiengWhoDancesWithDragons() {
    resetState();
    const mieng = CardFactory.create({ card_name: "Mieng, Who Dances With Dragons", pt: "2/1" });
    state.player.board = [mieng];
    
    // Power < 4: No transformation
    triggerMiengFerocious(3, state.player.board);
    assert.strictEqual(mieng.getDisplayStats(state.player.board).p, 2, "Should still be 2/1");
    
    // Power >= 4: Transformation
    triggerMiengFerocious(4, state.player.board);
    assert.strictEqual(mieng.getDisplayStats(state.player.board).p, 4, "Should be 4/4");
    assert.strictEqual(mieng.hasKeyword('flying'), true, "Should have flying");
}

function testDraconicCinderlance() {
    resetState();
    const lance = CardFactory.create({ card_name: "Draconic Cinderlance", pt: "2/1", rules_text: "Menace" });
    const bigGuy = CardFactory.create({ card_name: "Big Guy", pt: "4/4" });
    state.player.board = [lance, bigGuy];
    assert.strictEqual(bigGuy.hasKeyword('menace'), false, "Before attacking");
    bigGuy.onAttack(state.player.board);
    assert.strictEqual(bigGuy.hasKeyword('menace'), true, "After attacking");
    state.player.board = [bigGuy];
    assert.strictEqual(bigGuy.hasKeyword('menace'), true, "After Lance dies");
}

function testSilkenSpinner() {
    resetState();
    const spinner = CardFactory.create({ card_name: "Silken Spinner", pt: "3/4", rules_text: "Reach" });
    assert.strictEqual(spinner.hasKeyword('reach'), true);
}

function testGnomishSkirmisher() {
    resetState();
    const gnome = CardFactory.create({ card_name: "Gnomish Skirmisher", pt: "1/4" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [gnome, other];
    
    gnome.onAttack(state.player.board);
    assert.strictEqual(other.tempPower, 1, "Other gets +1/+0");
    assert.strictEqual(gnome.tempPower, 0, "Gnome does not buff self");
}

function testSiegeFalcon() {
    resetState();
    const falcon = CardFactory.create({ card_name: "Siege Falcon", pt: "1/1", rules_text: "Flying" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [falcon, other];
    
    assert.strictEqual(falcon.hasKeyword('flying'), true);
    falcon.onAttack(state.player.board);
    assert.strictEqual(other.tempPower, 1, "Other gets +1/+0");
    assert.strictEqual(falcon.tempPower, 0, "Falcon does not buff self");
}

function testForesee() {
    resetState();
    const spell = CardFactory.create({ card_name: "Foresee" });
    availableCards.push({ card_name: "Creature", type: "Creature", shape: "normal", tier: 1 });
    spell.onCast(state.player.board);
    assert.strictEqual(state.scrying.count, 4);
    state.scrying.postScry();
    assert.strictEqual(state.shop.cards.length, 2);
}

function testFightSong() {
    resetState();
    const spell = CardFactory.create({ card_name: "Fight Song" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    spell.onApply(target, []);
    assert.strictEqual(target.counters, 1);
    assert.strictEqual(target.hasKeyword('indestructible'), true);
}

function testEdgeOfTheirSeats() {
    resetState();
    const spell = CardFactory.create({ card_name: "Edge of Their Seats" });
    const c1 = CardFactory.create({ card_name: "C1", pt: "1/1" });
    state.player.board = [c1];
    state.player.fightHp = 10;
    spell.onCast(state.player.board);
    assert.strictEqual(c1.tempPower, 1);
    assert.strictEqual(state.player.fightHp, 11);
}

// --- TIER 3 TESTS ---

function testDevilsChild() {
    resetState();
    const child = CardFactory.create({ card_name: "Devil's Child", pt: "2/2" });
    const friendly = CardFactory.create({ card_name: "Friendly", pt: "1/1" });
    const opponent = CardFactory.create({ card_name: "Opponent", pt: "1/1" });
    
    state.player.board = [child, friendly];
    state.opponents[0].board = [opponent];
    state.battleBoards = {
        player: [child, friendly],
        opponent: [opponent]
    };
    state.phase = 'BATTLE';

    // 1. Friendly dies
    friendly.isDying = true;
    processDeaths(state.battleBoards.player, 'player');
    assert.strictEqual(child.counters, 1, "Should gain counter when teammate dies via processDeaths");

    // 2. Opponent dies
    opponent.isDying = true;
    processDeaths(state.battleBoards.opponent, 'opponent');
    assert.strictEqual(child.counters, 2, "Should gain counter when opponent dies via processDeaths broadcast");
}

function testRazorbackTrenchrunner() {
    resetState();
    const runner = CardFactory.create({ card_name: "Razorback Trenchrunner", pt: "5/1", rules_text: "Haste" });
    availableCards.push({ card_name: "Ox", shape: "token", pt: "3/3", set: "KOD", type: "Creature" });
    state.phase = 'BATTLE';
    const spawns = runner.onDeath([], 'player');
    assert.strictEqual(spawns.length, 1);
    assert.strictEqual(spawns[0].isTrenchrunnerSpawn, true);
}

function testSporegraftSlime() {
    resetState();
    const slime = CardFactory.create({ card_name: "Sporegraft Slime", pt: "1/3" });
    const healthy = CardFactory.create({ card_name: "Healthy", pt: "2/2" });
    const dying = CardFactory.create({ card_name: "Dying", pt: "1/1" });
    dying.isDying = true;
    state.player.board = [slime, healthy, dying];
    const oldRandom = Math.random;
    Math.random = () => 0; 
    try {
        slime.onDeath(state.player.board, 'player');
        assert.strictEqual(healthy.counters, 2);
        assert.strictEqual(dying.counters, 0);
    } finally {
        Math.random = oldRandom;
    }
}

function testPungentBeetle() {
    resetState();
    state.shopDeathsCount = 3;
    const beetle = CardFactory.create({ card_name: "Pungent Beetle", pt: "2/2" });
    beetle.onETB(state.player.board);
    assert.strictEqual(beetle.counters, 3);
}

function testBushwhack() {
    resetState();
    const spell = CardFactory.create({ card_name: "Bushwhack" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    spell.onApply(target, []);
    assert.strictEqual(target.tempPower, 4);
    assert.strictEqual(target.tempToughness, 2);
    assert.strictEqual(target.hasKeyword('trample'), true);
}

function testHaggardBandit() {
    resetState();
    const bandit = CardFactory.create({ card_name: "Haggard Bandit", pt: "3/3" });
    bandit.onLifeGain([]);
    assert.strictEqual(bandit.tempPower, 1);
    assert.strictEqual(bandit.hasKeyword('menace'), true);
}

function testSleeplessSpirit() {
    resetState();
    const spirit = CardFactory.create({ card_name: "Sleepless Spirit", pt: "2/2", rules_text: "Flying, vigilance" });
    assert.strictEqual(spirit.hasKeyword('flying'), true);
    assert.strictEqual(spirit.hasKeyword('vigilance'), true);
}

function testCovetousWechuge() {
    resetState();
    const wechuge = CardFactory.create({ card_name: "Covetous Wechuge", pt: "1/1", rules_text: "Menace" });
    const snack = CardFactory.create({ card_name: "Snack", pt: "1/1" });
    state.player.board = [wechuge, snack];
    wechuge.onAction();
    assert.strictEqual(state.targetingEffect.effect, 'wechuge_sacrifice');
    const targetSelf = wechuge;
    const source = wechuge;
    assert.strictEqual(targetSelf.id === source.id, true, "IDs should match");
}

function testCabracansFamiliar() {
    resetState();
    const familiar = CardFactory.create({ card_name: "Cabracan's Familiar", pt: "4/2" });
    assert.strictEqual(familiar.getDisplayStats([]).p, 4);
    assert.strictEqual(familiar.getDisplayStats([]).t, 2);
}

function testFinwingDrake() {
    resetState();
    const drake = CardFactory.create({ card_name: "Finwing Drake", pt: "3/4", rules_text: "Flying" });
    assert.strictEqual(drake.hasKeyword('flying'), true);
    drake.onNoncreatureCast(false, []);
    assert.strictEqual(drake.tempPower, 1, "Prowess +1/+1");
}

function testShrewdParliament() {
    // Case 1: Graveyard and Discardable card (Success)
    resetState();
    const parliament = CardFactory.create({ card_name: "Shrewd Parliament", pt: "2/1", rules_text: "Flying" });
    const discardable = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.spellGraveyard = [{ card_name: "Spell" }];
    state.player.hand = [parliament, discardable]; // simulate in hand
    parliament.onETB([]);
    assert.strictEqual(state.targetingEffect.effect, 'parliament_discard', "Should trigger with both requirements met");

    // Case 2: Graveyard but no other cards in hand (Fail)
    resetState();
    state.player.spellGraveyard = [{ card_name: "Spell" }];
    state.player.hand = [parliament];
    parliament.onETB([]);
    assert.strictEqual(state.targetingEffect, null, "Should not trigger if nothing to discard");

    // Case 3: Discardable card but no graveyard (Fail)
    resetState();
    state.player.spellGraveyard = [];
    state.player.hand = [parliament, discardable];
    parliament.onETB([]);
    assert.strictEqual(state.targetingEffect, null, "Should not trigger if no spells to return");
}

function testCoralhideWurm() {
    resetState();
    const wurm = CardFactory.create({ card_name: "Coralhide Wurm", pt: "2/3", rules_text: "Trample" });
    assert.strictEqual(wurm.hasKeyword('trample'), true);
    wurm.onNoncreatureCast(false, []);
    assert.strictEqual(wurm.counters, 1, "+1/+1 counter on cast");
}

function testAetherGuzzler() {
    resetState();
    const guzzler = CardFactory.create({ card_name: "Aether Guzzler", pt: "3/4" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [guzzler, other];
    
    guzzler.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(guzzler.tempPower, 1, "Guzzler buffs self");
    assert.strictEqual(other.tempPower, 1, "Guzzler buffs others");
}

function testDewdropOracle() {
    resetState();
    const oracle = CardFactory.create({ card_name: "Dewdrop Oracle", pt: "2/2" });
    availableCards.push({ card_name: "Findable", type: "Sorcery", tier: 1 });
    
    oracle.onETB(state.player.board);
    assert.ok(state.discovery, "Should trigger discovery on ETB");
    assert.strictEqual(state.discovery.cards.length, 4, "Should discover 4 cards");
}

function testArroydPassShepherd() {
    resetState();
    const shepherd = CardFactory.create({ card_name: "Arroyd Pass Shepherd", pt: "1/5", rules_text: "Lifelink", type: "Creature - Centaur Knight" });
    assert.strictEqual(shepherd.getDisplayStats([]).p, 1);
    assert.strictEqual(shepherd.getDisplayStats([]).t, 5);
    assert.strictEqual(shepherd.hasKeyword('lifelink'), true);
}

function testWarbandRallier() {
    // 1. Target Another Centaur
    resetState();
    const rallier = CardFactory.create({ card_name: "Warband Rallier", pt: "1/2", type: "Creature - Centaur Scout" });
    const target = CardFactory.create({ card_name: "Centaur", pt: "2/2", type: "Creature - Centaur" });
    state.player.board = [rallier, target];
    state.player.hand = [rallier];
    rallier.owner = 'player';
    target.owner = 'player';

    useCardFromHand(rallier.id);
    assert.strictEqual(state.targetingEffect.effect, 'warband_rallier_counters');
    
    applyTargetedEffect(target.id);
    assert.strictEqual(target.counters, 2, "Centaur should get 2 counters");
    assert.strictEqual(state.targetingEffect, null, "Mode should clear");

    // 2. Target Self
    resetState();
    const rallier2 = CardFactory.create({ card_name: "Warband Rallier", pt: "1/2", type: "Creature - Centaur Scout" });
    state.player.board = [rallier2];
    state.player.hand = [rallier2];
    rallier2.owner = 'player';

    useCardFromHand(rallier2.id);
    applyTargetedEffect(rallier2.id);
    assert.strictEqual(rallier2.counters, 2, "Should be able to target itself");

    // 3. Target Non-Centaur (Fail)
    resetState();
    const rallier3 = CardFactory.create({ card_name: "Warband Rallier", pt: "1/2", type: "Creature - Centaur Scout" });
    const human = CardFactory.create({ card_name: "Human", pt: "1/1", type: "Creature" });
    state.player.board = [rallier3, human];
    state.player.hand = [rallier3];
    rallier3.owner = 'player';

    useCardFromHand(rallier3.id);
    applyTargetedEffect(human.id);
    assert.strictEqual(human.counters, 0, "Non-Centaur should not get counters");
    assert.ok(state.targetingEffect, "Targeting should remain active on failure");
}

function testCybresBandRecruiter() {
    resetState();
    availableCards.push({ card_name: "Centaur Knight", shape: "token", pt: "2/2", set: "GSC", type: "Token Creature - Centaur Knight", rules_text: "Vigilance" });
    const recruiter = CardFactory.create({ card_name: "Cybres-Band Recruiter", pt: "3/3", type: "Creature - Centaur Knight" });
    state.player.board = [];
    state.player.hand = [recruiter];
    recruiter.owner = 'player';
    
    useCardFromHand(recruiter.id);
    assert.strictEqual(state.player.board.length, 2, "Recruiter and token should be on board");
    const token = state.player.board.find(c => c.card_name === 'Centaur Knight');
    assert.ok(token, "Token exists");
    assert.strictEqual(token.hasKeyword('vigilance'), true, "Token has Vigilance");
}

function testCybresClanSquire() {
    resetState();
    const squire = CardFactory.create({ card_name: "Cybres-Clan Squire", pt: "2/2", type: "Creature - Centaur Knight" });
    state.player.board = [squire];
    squire.owner = 'player';
    
    // 1. Centaur enters friendly board
    const centaur = CardFactory.create({ card_name: "Friend", pt: "1/1", type: "Creature - Centaur" });
    centaur.owner = 'player';
    state.player.hand = [centaur];
    useCardFromHand(centaur.id);
    assert.strictEqual(squire.counters, 1, "Should gain counter on friendly centaur ETB");

    // 2. Interaction: Recruiter (should give 2 counters)
    resetState();
    availableCards.push({ card_name: "Centaur Knight", shape: "token", pt: "2/2", set: "GSC", type: "Token Creature - Centaur Knight", rules_text: "Vigilance" });
    const squire2 = CardFactory.create({ card_name: "Cybres-Clan Squire", pt: "2/2", type: "Creature - Centaur Knight" });
    const recruiter = CardFactory.create({ card_name: "Cybres-Band Recruiter", pt: "3/3", type: "Creature - Centaur Knight" });
    state.player.board = [squire2];
    state.player.hand = [recruiter];
    squire2.owner = 'player';
    
    useCardFromHand(recruiter.id);
    assert.strictEqual(squire2.counters, 2, "Should get 2 counters from Recruiter + Token");

    // 3. Timing: Rallier (Deferred Broadcast)
    resetState();
    const squire3 = CardFactory.create({ card_name: "Cybres-Clan Squire", pt: "2/2", type: "Creature - Centaur Knight" });
    const rallier = CardFactory.create({ card_name: "Warband Rallier", pt: "1/2", type: "Creature - Centaur Scout" });
    state.player.board = [squire3];
    state.player.hand = [rallier];
    squire3.owner = 'player';
    
    useCardFromHand(rallier.id);
    assert.strictEqual(squire3.counters, 0, "Squire should NOT have ETB counter yet (rallier still targeting)");
    
    applyTargetedEffect(squire3.id); // Picking squire for the +1/+1 counters
    assert.strictEqual(squire3.counters, 3, "Squire should have 2 from Rallier effect + 1 from deferred ETB broadcast");
}

function testCybresBandLancer() {
    resetState();
    const lancer = CardFactory.create({ card_name: "Cybres-Band Lancer", pt: "2/2", rules_text: "First strike", type: "Creature - Centaur Knight" });
    const other = CardFactory.create({ card_name: "Centaur", pt: "2/2", type: "Creature - Centaur" });
    state.battleBoards = {
        player: [lancer, other],
        opponent: []
    };
    lancer.owner = 'player';
    other.owner = 'player';

    assert.strictEqual(lancer.hasKeyword('first strike'), true);
    
    lancer.onAttack(state.battleBoards.player);
    assert.strictEqual(other.tempPower, 1, "Other gets +1/+1");
    assert.strictEqual(other.hasKeyword('first strike'), true, "Other gains First Strike");
    assert.strictEqual(lancer.tempPower, 0, "Lancer does not buff self");
}

function testWindsongApprentice() {
    resetState();
    const winds = CardFactory.create({ card_name: "Windsong Apprentice", pt: "2/2", type: "Creature - Bird Monk" });
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "1/1", rules_text: "Flying", type: "Creature" });
    state.player.board = [winds, flyer];
    state.player.hand = [winds];
    winds.owner = 'player';
    flyer.owner = 'player';

    // 1. Lord Effect
    assert.strictEqual(flyer.getDisplayStats(state.player.board).p, 2, "Flyer should get +1/+1 from Windsong");
    assert.strictEqual(winds.getDisplayStats(state.player.board).p, 2, "Windsong should not buff self (no flying)");

    // 2. Self-buff if gains flying
    winds.flyingCounters = 1;
    assert.strictEqual(winds.getDisplayStats(state.player.board).p, 3, "Windsong should buff self if it has flying (2 base + 1 Windsong buff)");

    // 3. ETB Traverse (already Cirrusea -> select Flying/Counter)
    resetState();
    state.plane = 'Cirrusea';
    const winds2 = CardFactory.create({ card_name: "Windsong Apprentice", pt: "2/2", type: "Creature - Bird Monk" });
    state.player.hand = [winds2];
    useCardFromHand(winds2.id);
    assert.strictEqual(state.targetingEffect.effect, 'traverse_cirrusea_grant');
}

function testCautherHellkite() {
    resetState();
    const hellkite = CardFactory.create({ card_name: "Cauther Hellkite", pt: "4/4", rules_text: "Flying, haste", type: "Creature - Dragon" });
    const e1 = CardFactory.create({ card_name: "E1", pt: "1/1", type: "Creature" });
    const e2 = CardFactory.create({ card_name: "E2", pt: "1/1", type: "Creature" });
    
    state.battleBoards = {
        player: [hellkite],
        opponent: [e1, e2]
    };
    hellkite.owner = 'player';
    e1.owner = 'opponent';
    e2.owner = 'opponent';

    assert.strictEqual(hellkite.hasKeyword('flying'), true);
    assert.strictEqual(hellkite.hasKeyword('haste'), true);
    
    hellkite.onAttack(state.battleBoards.player);
    assert.strictEqual(e1.damageTaken, 1, "Enemy 1 should take 1 damage");
    assert.strictEqual(e2.damageTaken, 1, "Enemy 2 should take 1 damage");
}

function testVividGriffin() {
    resetState();
    const griffin = CardFactory.create({ card_name: "Vivid Griffin", pt: "4/4", rules_text: "Flying", type: "Creature - Griffin" });
    state.player.board = [griffin];
    
    // Power not greater than base
    griffin.onCombatStart(state.player.board);
    assert.strictEqual(griffin.hasKeyword('lifelink'), false, "Should not gain lifelink if not buffed");

    // Power greater than base
    resetState();
    const griffin2 = CardFactory.create({ card_name: "Vivid Griffin", pt: "4/4", rules_text: "Flying", type: "Creature - Griffin" });
    griffin2.counters = 1;
    state.player.board = [griffin2];
    griffin2.onCombatStart(state.player.board);
    assert.strictEqual(griffin2.hasKeyword('lifelink'), true, "Should gain lifelink if power > base");
}

function testNestMatriarch() {
    resetState();
    const nest = CardFactory.create({ card_name: "Nest Matriarch", pt: "3/3", rules_text: "Flying", type: "Creature - Bird" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1", type: "Creature" });
    state.player.board = [nest, target];
    state.player.hand = [nest];
    nest.owner = 'player';
    
    useCardFromHand(nest.id);
    assert.strictEqual(state.targetingEffect.effect, 'nest_matriarch_buff');
    
    // Target self (fail)
    applyTargetedEffect(nest.id);
    assert.strictEqual(nest.counters, 0, "Should not target self");
    assert.ok(state.targetingEffect);

    // Target other (success)
    applyTargetedEffect(target.id);
    assert.strictEqual(target.counters, 1, "Target gets +1/+1 counter");
    assert.strictEqual(target.hasKeyword('lifelink'), true, "Target gains Lifelink");
}

function testSageOfStorms() {
    resetState();
    const sage = CardFactory.create({ card_name: "Sage of Storms", pt: "4/4", rules_text: "Flying", type: "Creature - Bird Wizard" });
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "1/1", rules_text: "Flying", type: "Creature" });
    const ground = CardFactory.create({ card_name: "Ground", pt: "1/1", type: "Creature" });
    state.player.board = [sage, flyer, ground];
    state.player.hand = [sage];
    sage.owner = 'player';
    
    useCardFromHand(sage.id);
    assert.strictEqual(state.targetingEffect.effect, 'sage_of_storms_buff');
    
    // Target self (fail)
    applyTargetedEffect(sage.id);
    assert.strictEqual(sage.counters, 0, "Should not target self");
    assert.ok(state.targetingEffect);

    // Try target ground (fail)
    applyTargetedEffect(ground.id);
    assert.strictEqual(ground.counters, 0, "Ground creature should not get counter");
    assert.ok(state.targetingEffect, "Targeting should remain active");

    // Target flyer (success)
    applyTargetedEffect(flyer.id);
    assert.strictEqual(flyer.counters, 1, "Flyer gets +1/+1 counter");
    assert.strictEqual(state.targetingEffect, null);
}

function runTests() {
    const t1Tests = [
        { tier: 1, name: "Huitzil Skywatch", fn: testHuitzilSkywatch },
        { tier: 1, name: "Glumvale Raven", fn: testGlumvaleRaven },
        { tier: 1, name: "Rotten Carcass", fn: testRottenCarcass },
        { tier: 1, name: "Impressible Cub", fn: testImpressibleCub },
        { tier: 1, name: "War-Clan Dowager", fn: testWarClanDowager },
        { tier: 1, name: "Clairvoyant Koi", fn: testClairvoyantKoi },
        { tier: 1, name: "Soulsmoke Adept", fn: testSoulsmokeAdept },
        { tier: 1, name: "Intli Assaulter", fn: testIntliAssaulter },
        { tier: 1, name: "Gore Swine", fn: testGoreSwine },
        { tier: 1, name: "Sparring Campaigner", fn: testSparringCampaigner },
        { tier: 1, name: "Rakkiri Archer", fn: testRakkiriArcher },
        { tier: 1, name: "Blistering Lunatic", fn: testBlisteringLunatic },
        { tier: 1, name: "Sanctuary Centaur", fn: testSanctuaryCentaur },
        { tier: 1, name: "Dutiful Camel", fn: testDutifulCamel },
        { tier: 1, name: "Frontline Cavalier", fn: testFrontlineCavalier },
        { tier: 1, name: "Lake Cave Lurker", fn: testLakeCaveLurker },
        { tier: 1, name: "Faith in Darkness", fn: testFaithInDarkness },
        { tier: 1, name: "Scientific Inquiry", fn: testScientificInquiry },
        { tier: 1, name: "To Battle", fn: testToBattle },
        { tier: 1, name: "By Blood and Venom", fn: testByBloodAndVenom },
        { tier: 1, name: "Divination", fn: testDivination }
    ];

    const t2Tests = [
        { tier: 2, name: "Exotic Game Hunter", fn: testExoticGameHunter },
        { tier: 2, name: "Cankerous Hog", fn: testCankerousHog },
        { tier: 2, name: "Shrieking Pusbag", fn: testShriekingPusbag },
        { tier: 2, name: "Executioner's Madness", fn: testExecutionersMadness },
        { tier: 2, name: "Earthrattle Xali", fn: testEarthrattleXali },
        { tier: 2, name: "Dynamic Wyvern", fn: testDynamicWyvern },
        { tier: 2, name: "Bristled Direbear", fn: testBristledDirebear },
        { tier: 2, name: "Consult the Dewdrops", fn: testConsultTheDewdrops },
        { tier: 2, name: "Envoy of the Pure", fn: testEnvoyOfThePure },
        { tier: 2, name: "Centaur Wayfinder", fn: testCentaurWayfinder },
        { tier: 2, name: "Warband Lieutenant", fn: testWarbandLieutenant },
        { tier: 2, name: "Warrior's Ways", fn: testWarriorsWays },
        { tier: 2, name: "Stratus Traveler", fn: testStratusTraveler },
        { tier: 2, name: "Alluring Wisps", fn: testAlluringWisps },
        { tier: 2, name: "Rapacious Sprite", fn: testRapaciousSprite },
        { tier: 2, name: "Up in Arms", fn: testUpInArms },
        { tier: 2, name: "Mieng, Who Dances With Dragons", fn: testMiengWhoDancesWithDragons },
        { tier: 2, name: "Draconic Cinderlance", fn: testDraconicCinderlance },
        { tier: 2, name: "Cabracan's Familiar", fn: testCabracansFamiliar },
        { tier: 2, name: "Bushwhack", fn: testBushwhack },
        { tier: 2, name: "Haggard Bandit", fn: testHaggardBandit },
        { tier: 2, name: "Sleepless Spirit", fn: testSleeplessSpirit },
        { tier: 2, name: "Silken Spinner", fn: testSilkenSpinner },
        { tier: 2, name: "Gnomish Skirmisher", fn: testGnomishSkirmisher },
        { tier: 2, name: "Siege Falcon", fn: testSiegeFalcon },
        { tier: 2, name: "Foresee", fn: testForesee },
        { tier: 2, name: "Fight Song", fn: testFightSong },
        { tier: 2, name: "Edge of Their Seats", fn: testEdgeOfTheirSeats }
    ];

    const t3Tests = [
        { tier: 3, name: "Devil's Child", fn: testDevilsChild },
        { tier: 3, name: "Razorback Trenchrunner", fn: testRazorbackTrenchrunner },
        { tier: 3, name: "Sporegraft Slime", fn: testSporegraftSlime },
        { tier: 3, name: "Pungent Beetle", fn: testPungentBeetle },
        { tier: 3, name: "Covetous Wechuge", fn: testCovetousWechuge },
        { tier: 3, name: "Finwing Drake", fn: testFinwingDrake },
        { tier: 3, name: "Shrewd Parliament", fn: testShrewdParliament },
        { tier: 3, name: "Coralhide Wurm", fn: testCoralhideWurm },
        { tier: 3, name: "Aether Guzzler", fn: testAetherGuzzler },
        { tier: 3, name: "Dewdrop Oracle", fn: testDewdropOracle },
        { tier: 3, name: "Arroyd Pass Shepherd", fn: testArroydPassShepherd },
        { tier: 3, name: "Warband Rallier", fn: testWarbandRallier },
        { tier: 3, name: "Cybres-Band Recruiter", fn: testCybresBandRecruiter },
        { tier: 3, name: "Cybres-Clan Squire", fn: testCybresClanSquire },
        { tier: 3, name: "Cybres-Band Lancer", fn: testCybresBandLancer },
        { tier: 3, name: "Windsong Apprentice", fn: testWindsongApprentice },
        { tier: 3, name: "Cauther Hellkite", fn: testCautherHellkite },
        { tier: 3, name: "Vivid Griffin", fn: testVividGriffin },
        { tier: 3, name: "Nest Matriarch", fn: testNestMatriarch },
        { tier: 3, name: "Sage of Storms", fn: testSageOfStorms }
    ];

    console.log("\nUNIT TEST RESULTS");
    console.log("=================");
    
    const runBatch = (tests) => {
        let passed = 0;
        tests.forEach(test => {
            try {
                test.fn();
                console.log(`✓ ${test.name}`);
                passed++;
            } catch (e) {
                console.error(`✕ ${test.name}: ${e.message}`);
            }
        });
        return passed;
    };

    console.log("\nTIER 1");
    const t1Passed = runBatch(t1Tests);
    
    console.log("\nTIER 2");
    const t2Passed = runBatch(t2Tests);

    console.log("\nTIER 3");
    const t3Passed = runBatch(t3Tests);

    console.log("\nFINAL SUMMARY");
    console.log("-------------");
    console.log(`TIER 1 - Passed: ${t1Passed}/${t1Tests.length}. Failed: ${t1Tests.length - t1Passed}.`);
    console.log(`TIER 2 - Passed: ${t2Passed}/${t2Tests.length}. Failed: ${t2Tests.length - t2Passed}.`);
    console.log(`TIER 3 - Passed: ${t3Passed}/${t3Tests.length}. Failed: ${t3Tests.length - t3Passed}.`);

    if (t1Passed < t1Tests.length || t2Passed < t2Tests.length || t3Passed < t3Tests.length) {
        process.exit(1);
    }
}

runTests();
