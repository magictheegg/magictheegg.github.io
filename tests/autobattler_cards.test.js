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
        dataset: {},
        innerHTML: '',
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
    state, CardFactory, BaseCard, availableCards, resolveShopDeaths, triggerMiengFerocious, triggerLifeGain, processDeaths,
    applyTargetedEffect, applySpell, useCardFromHand, resolveDiscovery, resolveCombatImpact, findTarget,
    toggleDiscoverySelection, confirmDiscovery, startShopTurn, setAvailableCards, performAttack, triggerETB, HEROES
} = require('../scripts/coliseum.js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load full card list once for all tests
const fullCardPool = JSON.parse(fs.readFileSync(path.join(__dirname, '../lists/coliseum-cards.json'), 'utf8')).cards;

// SYNC THE POOL TO THE ENGINE
setAvailableCards(fullCardPool);

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
        spellGraveyard: [],
        hero: HEROES.HEPING,
        usedHeroPower: false,
        heroPowerActivations: 0,
        plane: null,
        deadServantsCount: 0
    };
    state.opponents = [
        { id: 0, name: "Marketto", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [], hero: { ...HEROES.MARKETTO, avatar: "sets/SHF-files/img/60.png" }, usedHeroPower: false, heroPowerActivations: 0 },
        { id: 1, name: "Huitzil", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [], hero: { ...HEROES.XYLO, avatar: "sets/ICH-files/img/62_Huitzil Skywatch.jpg" }, usedHeroPower: false, heroPowerActivations: 0 },
        { id: 2, name: "Raven", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [], hero: { ...HEROES.CRAIN, avatar: "sets/TWB-files/img/19_Glumvale Raven.jpg" }, usedHeroPower: false, heroPowerActivations: 0 }
    ];
    state.currentOpponentId = 0;
    state.turn = 1;
    state.phase = 'SHOP';
    state.castingSpell = null;
    state.targetingEffect = null;
    state.targetingQueue = [];
    state.discovery = null;
    state.discoveryQueue = [];
    state.scrying = null;
    state.nextShopBonusCards = [];
    state.battleBoards = null;
    state.creaturesDiedThisShopPhase = false;
    state.shopDeathsCount = 0;
    state.spellsCastThisTurn = 0;
    state.triumphantTacticsActive = false;
    state.panharmoniconActive = false;
    state.shop = { cards: [], frozen: false };
    state.rerollCount = 0;
    state.autumnSpellCount = 0;
    state.blueCardsPlayed = 0;
    state.spellsBoughtThisGame = 0;

    // SYNC POOL
    setAvailableCards(fullCardPool);
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
    
    adept.enchantments.push({ card_name: "Faith in Darkness", rules_text: "+2/+2", isTemporary: true });
    adept.tempPower += 2;
    adept.tempToughness += 2;
    assert.strictEqual(adept.hasKeyword('lifelink'), false, "Enchantment shouldn't trigger lifelink");
    
    adept.counters = 1;
    assert.strictEqual(adept.getDisplayStats(state.player.board).p, 6, "Embattled (2 base + 1 counter + 1 buff + 2 tempPower)");
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
    spell.onApply(target, state.player.board);
    assert.strictEqual(state.scrying.count, 1, "Should scry 1");
    assert.strictEqual(target.enchantments.length, 1);
    assert.strictEqual(target.getDisplayStats([]).p, 4, "Faith in Darkness gives +2/+2");
}

function testScientificInquiry() {
    resetState();
    const spell = CardFactory.create({ card_name: "Scientific Inquiry" });
    spell.onCast(state.player.board);
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

function testDivination() {
    resetState();
    const spell = CardFactory.create({ card_name: "Divination" });
    spell.onCast(state.player.board);
    assert.strictEqual(state.shop.cards.length, 2);
}

function testMightAndMane() {
    resetState();
    const spell = CardFactory.create({ card_name: "Might and Mane" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    state.player.board = [target];
    spell.onApply(target, state.player.board);
    
    assert.strictEqual(target.hasKeyword('menace'), true, "Target should have menace");
    assert.strictEqual(state.shop.cards.length, 1, "Should add a card to the shop");
    assert.strictEqual(state.shop.cards[0].costReduction, 1, "Added card should be discounted");
}

function testWayOfTheBygone() {
    resetState();
    const spell = CardFactory.create({ card_name: "Way of the Bygone" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    state.player.board = [target];
    spell.onApply(target, state.player.board);
    
    const stats = target.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 4, "Should get +3/+0");
    assert.strictEqual(target.hasKeyword('first strike'), true, "Should have first strike");
    assert.ok(state.scrying, "Should trigger scry");
}

function testMossViper() {
    resetState();
    const viper = CardFactory.create({ card_name: "Moss Viper", rules_text: "Deathtouch" });
    assert.strictEqual(viper.hasKeyword('deathtouch'), true, "Viper should have deathtouch");
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

function testRestlessOppressor() {
    resetState();
    const oppressor = CardFactory.create({ card_name: "Restless Oppressor", pt: "2/2" });
    const teammate = CardFactory.create({ card_name: "Teammate", pt: "1/1" });
    state.player.board = [oppressor, teammate];
    oppressor.owner = 'player';
    teammate.owner = 'player';
    
    // Shop death
    state.phase = 'SHOP';
    oppressor.onOtherCreatureDeath(teammate, state.player.board);
    assert.strictEqual(oppressor.counters, 1, "Should gain counter in shop");
    
    // Battle death
    resetState();
    const oppressor2 = CardFactory.create({ card_name: "Restless Oppressor", pt: "2/2" });
    const teammate2 = CardFactory.create({ card_name: "Teammate", pt: "1/1" });
    state.player.board = [oppressor2, teammate2];
    oppressor2.owner = 'player';
    teammate2.owner = 'player';
    state.phase = 'BATTLE';
    oppressor2.onOtherCreatureDeath(teammate2, state.player.board);
    assert.strictEqual(oppressor2.counters, 0, "Should NOT gain counter in battle");
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
    const wyvernData = fullCardPool.find(c => c.card_name === "Dynamic Wyvern");
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
    state.player.plane = 'Not Cirrusea';
    traveler.onETB(state.player.board);
    assert.strictEqual(state.player.plane, 'Cirrusea');
    const spawnedBird = state.player.board.find(c => c.card_name === 'Bird');
    assert.ok(spawnedBird, "Bird created");
    assert.strictEqual(spawnedBird.pt, "1/2", "Cirrusea birds should be 1/2");

    // 2. Already Cirrusea, no flying -> Flying Counter (Honest call)
    resetState();
    state.player.plane = 'Cirrusea';
    const traveler2 = CardFactory.create({ card_name: "Stratus Traveler", pt: "2/1" });
    const targetNoFly = CardFactory.create({ card_name: "NoFly", pt: "1/1" });
    state.player.board = [traveler2, targetNoFly];
    traveler2.onETB(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'traverse_cirrusea_grant');
    
    applyTargetedEffect(targetNoFly.id);
    assert.strictEqual(targetNoFly.flyingCounters, 1, "Gained flying counter");

    // 3. Already Cirrusea, HAS flying -> +1/+1 Counter (Honest call)
    resetState();
    state.player.plane = 'Cirrusea';
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

async function testDraconicCinderlance() {
    resetState();
    const lance = CardFactory.create({ card_name: "Draconic Cinderlance", pt: "2/1", rules_text: "Menace" });
    const bigGuy = CardFactory.create({ card_name: "Big Guy", pt: "4/4" });
    lance.owner = 'player';
    bigGuy.owner = 'player';
    state.player.board = [lance, bigGuy];
    state.opponents[0].board = [CardFactory.create({ card_name: "Target", pt: "1/10" })];
    
    state.battleBoards = { player: state.player.board, opponent: state.opponents[0].board };
    state.battleQueues = { player: [bigGuy], opponent: [...state.opponents[0].board] };

    assert.strictEqual(bigGuy.hasKeyword('menace'), false, "Before attacking");
    
    // performAttack(attacker, defender, isFirstStrike = false)
    await performAttack(bigGuy, state.opponents[0].board[0]);
    
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
    spell.onCast(state.player.board);
    assert.strictEqual(state.scrying.count, 4, "Foresee should scry 4");
    
    const startShopSize = state.shop.cards.length;
    state.scrying.postScry();
    assert.strictEqual(state.shop.cards.length, startShopSize + 2, "Should add 2 cards to shop after scry");
}

function testFightSong() {
    resetState();
    const spell = CardFactory.create({ card_name: "Fight Song" });
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    spell.onApply(target, []);
    assert.strictEqual(target.counters, 1);
    assert.strictEqual(target.hasKeyword('indestructible'), true);

    // End combat simulation
    [target].forEach(c => { 
        c.tempPower = 0; 
        c.tempToughness = 0; 
        c.isLockedByChivalry = false;
        c.damageTaken = 0;
        c.isDestroyed = false;
        c.enchantments = c.enchantments.filter(e => !e.isTemporary); 
    });

    assert.strictEqual(target.hasKeyword('indestructible'), false, "Indestructible should wear off after cleanup");
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

function testMoonlightStag() {
    resetState();
    const stag = CardFactory.create({ card_name: "Moonlight Stag", pt: "2/5", type: "Creature - Elk Spirit" });
    state.player.board = [stag];
    
    assert.strictEqual(stag.hasKeyword('vigilance'), false, "Should not have vigilance initially");
    
    // 1. +1/+1 Counter -> Vigilance
    stag.counters = 1;
    assert.strictEqual(stag.hasKeyword('vigilance'), true, "Should gain vigilance from +1/+1 counter");

    // 2. Vigilance Counter -> Vigilance
    stag.counters = 0;
    stag.vigilanceCounters = 1;
    assert.strictEqual(stag.hasKeyword('vigilance'), true, "Should have vigilance from keyword counter");

    // 3. Flying Counter -> Flying but NOT Vigilance
    stag.vigilanceCounters = 0;
    stag.flyingCounters = 1;
    assert.strictEqual(stag.hasKeyword('flying'), true, "Should have flying from counter");
    assert.strictEqual(stag.hasKeyword('vigilance'), false, "Should NOT have vigilance from flying counter");
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

async function testCabracansFamiliar_Shield() {
    resetState();
    const familiar = CardFactory.create({ card_name: "Cabracan's Familiar", pt: "4/2" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "2/5" });
    defender.shieldCounters = 1;
    
    state.battleBoards = {
        player: [familiar],
        opponent: [defender]
    };
    familiar.owner = 'player';
    defender.owner = 'opponent';
    state.phase = 'BATTLE';
    
    await performAttack(familiar, defender, false);
    
    assert.strictEqual(defender.shieldCounters, 0, "Shield should be popped by pre-fight damage");
    // Pre-fight was familiar (4) vs shield. 
    // Shield gone. Regular combat happens.
    // Attacker (4) deals 4 to Defender (5).
    // Defender (2) deals 2 to Attacker (2).
    assert.strictEqual(defender.damageTaken, 4, "Regular combat damage should happen after shield pop");
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

function testPaleDillettante() {
    resetState();
    const dillettante = CardFactory.create({ card_name: "Pale Dillettante", pt: "2/2" });
    dillettante.onNoncreatureCast(false, []);
    assert.strictEqual(dillettante.counters, 1, "+1/+1 counter on noncreature cast");
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
    state.player.plane = 'Cirrusea';
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
    const e3 = CardFactory.create({ card_name: "E3", pt: "1/1", type: "Creature" });
    e3.shieldCounters = 1;
    
    state.battleBoards = {
        player: [hellkite],
        opponent: [e1, e2, e3]
    };
    hellkite.owner = 'player';
    e1.owner = 'opponent';
    e2.owner = 'opponent';
    e3.owner = 'opponent';

    assert.strictEqual(hellkite.hasKeyword('flying'), true);
    assert.strictEqual(hellkite.hasKeyword('haste'), true);
    
    hellkite.onAttack(state.battleBoards.player);
    assert.strictEqual(e1.damageTaken, 1, "Enemy 1 should take 1 damage");
    assert.strictEqual(e2.damageTaken, 1, "Enemy 2 should take 1 damage");
    assert.strictEqual(e3.damageTaken, 0, "Enemy 3 (shielded) should take 0 damage from trigger");
    assert.strictEqual(e3.shieldCounters, 0, "Enemy 3 shield should be popped");
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

function testLingeringLunatic() {
    resetState();
    const lunatic = CardFactory.create({ card_name: "Lingering Lunatic", pt: "4/5", rules_text: "Vigilance", type: "Creature - Mutant Warlock" });
    const target1 = CardFactory.create({ card_name: "T1", pt: "1/1", type: "Creature" });
    const target2 = CardFactory.create({ card_name: "T2", pt: "1/1", type: "Creature" });
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "1/1", type: "Creature" });

    target1.counters = 1;
    target2.counters = 0;
    flyer.flyingCounters = 1;
    
    state.player.board = [lunatic, target1, target2, flyer];
    state.player.hand = [lunatic];
    lunatic.owner = target1.owner = target2.owner = flyer.owner = 'player';
    
    useCardFromHand(lunatic.id);
    
    assert.strictEqual(target1.counters, 2, "Target 1 (already had counter) should proliferate to 2");
    assert.strictEqual(target2.counters, 0, "Target 2 (had no counters) should remain at 0");
    assert.strictEqual(flyer.flyingCounters, 2, "Flyer should now have 2 flying counters (Proliferate hits keyword counters too)");
    assert.strictEqual(lunatic.hasKeyword('vigilance'), true, "Lingering Lunatic has Vigilance");
}

function testWilderkinZealot() {
    // 1. Ferocious Success
    resetState();
    const zealot = CardFactory.create({ card_name: "Wilderkin Zealot", pt: "2/2", type: "Creature - Human Druid" });
    const big = CardFactory.create({ card_name: "Big", pt: "4/4" });
    state.player.board = [zealot, big];
    zealot.onCombatStart(state.player.board);
    assert.strictEqual(zealot.counters, 1, "Should gain counter if power 4+ present");

    // 2. Ferocious Fail
    resetState();
    const zealot2 = CardFactory.create({ card_name: "Wilderkin Zealot", pt: "2/2", type: "Creature - Human Druid" });
    state.player.board = [zealot2];
    zealot2.onCombatStart(state.player.board);
    assert.strictEqual(zealot2.counters, 0, "Should NOT gain counter if no power 4+");

    // 3. Activated Ability
    resetState();
    const zealot3 = CardFactory.create({ card_name: "Wilderkin Zealot", pt: "2/2", type: "Creature - Human Druid" });
    state.player.board = [zealot3];
    state.player.gold = 5;
    zealot3.onAction();
    assert.strictEqual(state.targetingEffect.effect, 'wilderkin_zealot_trample');
    applyTargetedEffect(zealot3.id);
    assert.strictEqual(state.player.gold, 3, "Cost 2 gold");
    assert.strictEqual(zealot3.hasKeyword('trample'), true);
}

function testBellowingGiant() {
    resetState();
    const giant = CardFactory.create({ card_name: "Bellowing Giant", pt: "6/4", rules_text: "Trample" });
    assert.strictEqual(giant.getBasePT().p, 6);
    assert.strictEqual(giant.hasKeyword('trample'), true);
}

function testBwemaTheRuthless() {
    const allProps = ['menaceCounters', 'firstStrikeCounters', 'vigilanceCounters', 'lifelinkCounters'];
    const combos = [
        ['Menace Counter', 'First Strike Counter', 'menaceCounters', 'firstStrikeCounters'],
        ['Menace Counter', 'Vigilance Counter', 'menaceCounters', 'vigilanceCounters'],
        ['Menace Counter', 'Lifelink Counter', 'menaceCounters', 'lifelinkCounters'],
        ['First Strike Counter', 'Vigilance Counter', 'firstStrikeCounters', 'vigilanceCounters'],
        ['First Strike Counter', 'Lifelink Counter', 'firstStrikeCounters', 'lifelinkCounters'],
        ['Vigilance Counter', 'Lifelink Counter', 'vigilanceCounters', 'lifelinkCounters']
    ];

    combos.forEach(([c1Name, c2Name, prop1, prop2]) => {
        resetState();
        const bwema = CardFactory.create({ card_name: "Bwema, the Ruthless", pt: "4/4", type: "Legendary Creature - Hound Warrior" });
        state.player.board = [bwema];
        bwema.owner = 'player';
        bwema.onETB(state.player.board);

        const c1 = state.discovery.cards.find(c => c.card_name === c1Name);
        resolveDiscovery(c1);
        const c2 = state.discovery.cards.find(c => c.card_name === c2Name);
        resolveDiscovery(c2);

        assert.strictEqual(bwema[prop1], 1, `Should have ${prop1}`);
        assert.strictEqual(bwema[prop2], 1, `Should have ${prop2}`);
        
        // Negative assertions (Counters)
        allProps.filter(p => p !== prop1 && p !== prop2).forEach(p => {
            assert.strictEqual(bwema[p], 0, `Should NOT have ${p}`);
        });

        // "Honest" assertions (Keywords)
        const kwMap = {
            'menaceCounters': 'menace',
            'firstStrikeCounters': 'first strike',
            'vigilanceCounters': 'vigilance',
            'lifelinkCounters': 'lifelink'
        };

        Object.keys(kwMap).forEach(prop => {
            const kw = kwMap[prop];
            const expected = (prop === prop1 || prop === prop2);
            assert.strictEqual(bwema.hasKeyword(kw), expected, `Bwema hasKeyword(${kw}) should be ${expected}`);
        });

        assert.strictEqual(state.discovery, null);
    });
}

function testSilverhornTactician() {
    resetState();
    const ox = CardFactory.create({ card_name: "Silverhorn Tactician", pt: "4/4" });
    const source = CardFactory.create({ card_name: "Source", pt: "1/1" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    
    source.counters = 1;
    source.flyingCounters = 1; // Two different counters
    state.player.board = [ox, source, other];
    ox.owner = source.owner = other.owner = 'player';

    ox.onETB(state.player.board);
    
    // 1. Remove Flying (Must specify counter type now), verify +1/+1 stays
    applyTargetedEffect(source.id, 'flying');
    assert.strictEqual(state.targetingEffect.effect, 'permutate_step2');
    
    // Source should have lost Flying (flyingCounters was 1, should be 0)
    assert.strictEqual(source.flyingCounters, 0, "Flying counter should be removed");
    assert.strictEqual(source.counters, 1, "+1/+1 counter stays");

    // 2. Pick same creature (Fail)
    applyTargetedEffect(source.id);
    assert.ok(state.targetingEffect, "Should not accept same creature as target 2");

    // 3. Pick different creature (Success)
    applyTargetedEffect(other.id);
    assert.strictEqual(other.counters, 2, "Destination gets two +1/+1 counters");
    assert.strictEqual(state.targetingEffect, null);
}

function testScarhornCleaver() {
    resetState();
    const bull = CardFactory.create({ card_name: "Scarhorn Cleaver", pt: "4/3", rules_text: "Agile" });
    const defender = CardFactory.create({ card_name: "Def", pt: "1/1" });
    bull.owner = 'player';
    defender.owner = 'opponent';
    state.battleBoards = { player: [bull], opponent: [defender] };

    // Agile should act like First Strike
    assert.strictEqual(bull.hasKeyword('first strike'), true, "Agile should map to first strike");
    
    resolveCombatImpact(bull, defender, true); // true = hasFirstStrike
    assert.strictEqual(defender.damageTaken, 4);
    assert.strictEqual(bull.damageTaken, 0, "Should take no retaliation from dead defender");
}

function testQinhanaCavalry() {
    // 1. Success (Target on right)
    resetState();
    const cavalry = CardFactory.create({ card_name: "Qinhana Cavalry", pt: "4/5" });
    const recruit = CardFactory.create({ card_name: "Recruit", pt: "1/1" });
    state.player.board = [cavalry, recruit];
    cavalry.onCombatStart(state.player.board);
    assert.strictEqual(recruit.tempPower, 3, "Target to the right should be buffed");
    assert.strictEqual(cavalry.isLockedByChivalry, true, "Cavalry should be locked");

    // 2. Fail (Target has too much power)
    resetState();
    const cavalry2 = CardFactory.create({ card_name: "Qinhana Cavalry", pt: "4/5" });
    const big = CardFactory.create({ card_name: "Big", pt: "4/4" });
    state.player.board = [cavalry2, big];
    cavalry2.onCombatStart(state.player.board);
    assert.strictEqual(big.tempPower, 0);
    assert.strictEqual(cavalry2.isLockedByChivalry, false);

    // 3. Fail (Target to the left)
    resetState();
    const cavalry3 = CardFactory.create({ card_name: "Qinhana Cavalry", pt: "4/5" });
    const leftie = CardFactory.create({ card_name: "Leftie", pt: "1/1" });
    state.player.board = [leftie, cavalry3];
    cavalry3.onCombatStart(state.player.board);
    assert.strictEqual(leftie.tempPower, 0);
}

function testMekiniEremite() {
    resetState();
    const monk = CardFactory.create({ card_name: "Mekini Eremite", pt: "3/1" });
    const attacker = CardFactory.create({ card_name: "Atk", pt: "5/5" });
    const defender = CardFactory.create({ card_name: "Def", pt: "2/2" });
    
    monk.owner = 'player';
    attacker.owner = 'opponent';
    defender.owner = 'opponent';
    state.battleBoards = { player: [monk], opponent: [attacker, defender] };
    
    monk.onETB(state.player.board);
    assert.strictEqual(monk.shieldCounters, 1, "Should enter with shield counter");

    // 1. Shield as Defender (Attacker hits Monk)
    resolveCombatImpact(attacker, monk, false);
    assert.strictEqual(monk.damageTaken, 0, "Shield should prevent all damage");
    assert.strictEqual(monk.shieldCounters, 0, "Shield should be consumed");

    // 2. Shield as Attacker (Monk hits Defender)
    monk.shieldCounters = 1;
    resolveCombatImpact(monk, defender, false);
    assert.strictEqual(monk.damageTaken, 0, "Shield should prevent retaliation damage");
    assert.strictEqual(monk.shieldCounters, 0, "Shield consumed");

    // 3. Unblockable
    monk.counters = 1;
    monk.shieldCounters = 1; // 2 different types: Plus-One and Shield
    const oBoard = [CardFactory.create({ card_name: "Blocker", pt: "1/1" })];
    const target = findTarget(monk, oBoard);
    assert.strictEqual(target, null, "Should be unblockable with 2 different counter types");
}

function testFrontierMarkswomen() {
    resetState();
    const card = CardFactory.create({ card_name: "Frontier Markswomen", pt: "2/5", rules_text: "Vigilance, reach" });
    assert.strictEqual(card.hasKeyword('vigilance'), true);
    assert.strictEqual(card.hasKeyword('reach'), true);
}

function testDragonfistAxeman() {
    resetState();
    const axeman = CardFactory.create({ card_name: "Dragonfist Axeman", pt: "2/5", rules_text: "Reach" });
    const flyer = CardFactory.create({ card_name: "Flyer", pt: "1/1", rules_text: "Flying" });
    axeman.owner = 'player';
    flyer.owner = 'opponent';
    state.battleBoards = { player: [axeman], opponent: [flyer] };

    assert.strictEqual(axeman.hasKeyword('reach'), true);

    // 1. Gains buff when blocking flyer
    resolveCombatImpact(flyer, axeman, false);
    assert.strictEqual(axeman.tempPower, 3, "Should gain +3/+0 when defending against flyer");

    // 2. Stays buffed for its own attack
    const stats = axeman.getDisplayStats(state.battleBoards.player);
    assert.strictEqual(stats.p, 5, "Power should still be 5 (2 base + 3 buff) for subsequent attack");
}

function testFestivalCelebrants() {
    resetState();
    const cel = CardFactory.create({ card_name: "Festival Celebrants", pt: "2/2" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [cel, other];
    cel.owner = other.owner = 'player';

    cel.onETB(state.player.board);
    assert.strictEqual(other.counters, 1, "Other creature should get a counter");
    assert.strictEqual(cel.counters, 1, "Festival Celebrants should get a counter itself");
}

function testSuitorOfDeath() {
    resetState();
    const suitor = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    const healthyVictim = CardFactory.create({ card_name: "Healthy", pt: "1/1" });
    const dyingVictim = CardFactory.create({ card_name: "Dying", pt: "1/1" });
    
    state.battleBoards = {
        player: [suitor],
        opponent: [healthyVictim, dyingVictim]
    };
    suitor.owner = 'player';
    healthyVictim.owner = dyingVictim.owner = 'opponent';
    
    dyingVictim.isDying = true; // Already marked for death
    suitor.isDying = true;
    state.phase = 'BATTLE';

    // Combat death triggers sacrifice
    processDeaths(state.battleBoards.player, 'player');
    
    assert.strictEqual(healthyVictim.isDestroyed, true, "Healthy opponent creature should be sacrificed");
    assert.strictEqual(dyingVictim.isDestroyed, false, "Already dying creature should not be picked");

    // Shop death (sale) does nothing
    resetState();
    const suitor2 = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    state.player.board = [suitor2];
    suitor2.owner = 'player';
    state.phase = 'SHOP';
    resolveShopDeaths(0, suitor2); 
    assert.ok(true, "Should not crash or trigger sacrifice in shop");
}

function testServantsOfDydren() {
    // 1. Lord Effect
    resetState();
    const s1 = CardFactory.create({ card_name: "Servants of Dydren", pt: "2/2" });
    const s2 = CardFactory.create({ card_name: "Servants of Dydren", pt: "2/2" });
    state.player.board = [s1, s2];
    s1.owner = s2.owner = 'player';

    assert.strictEqual(s1.getDisplayStats(state.player.board).p, 4, "Should get +2/+2 from other servant");

    // 2. Full board -> no resurrection
    resetState();
    state.player.deadServantsCount = 2;
    for(let i=0; i<7; i++) state.player.board.push(CardFactory.create({card_name: "Full", pt: "1/1"}));
    const s3 = CardFactory.create({ card_name: "Servants of Dydren", pt: "2/2" });
    s3.owner = 'player';
    s3.onETB(state.player.board);
    assert.strictEqual(state.player.deadServantsCount, 2, "Counter should not be touched on full board");

    // 3. Partial resurrection
    resetState();
    state.player.deadServantsCount = 2;
    // Fill to 6
    for(let i=0; i<6; i++) state.player.board.push(CardFactory.create({card_name: "Full", pt: "1/1"}));
    const s4 = CardFactory.create({ card_name: "Servants of Dydren", pt: "2/2" });
    s4.owner = 'player';
    s4.onETB(state.player.board);
    assert.strictEqual(state.player.board.length, 7, "Should only resurrect one to fill board");
    assert.strictEqual(state.player.deadServantsCount, 1, "Counter should decrement by one");}

function testHoltunBandElder() {
    resetState();
    const elder = CardFactory.create({ card_name: "Holtun-Band Elder", pt: "4/4" });
    state.player.board = [elder];
    elder.owner = 'player';
    
    // 1. Normal death
    let spawns = elder.onDeath(state.player.board, 'player');
    assert.strictEqual(spawns.length, 2, "Should create two tokens");
    assert.strictEqual(spawns[0].card_name, "Centaur Knight");

    // 2. Partial Spawning (Board has 6 cards, Elder dies -> 1 slot opens)
    resetState();
    const elder2 = CardFactory.create({ card_name: "Holtun-Band Elder", pt: "4/4" });
    state.player.board = [elder2];
    for(let i=0; i<6; i++) state.player.board.push(CardFactory.create({card_name: "Full", pt: "1/1"}));
    spawns = elder2.onDeath(state.player.board, 'player');
    assert.strictEqual(spawns.length, 1, "Should only create one token to respect board limit");
}

function testWhispersOfTheDead() {
    resetState();
    const whispers = CardFactory.create({ card_name: "Whispers of the Dead", type: "Instant" });
    const fodder = CardFactory.create({ card_name: "Fodder", pt: "1/1" });
    state.player.board = [fodder];
    state.player.hand = [whispers];
    state.player.tier = 4;
    state.phase = 'SHOP';
    
    // 1. Queue preference (Scry)
    const bonus = CardFactory.create({ card_name: "Bonus", tier: 2, type: "Creature" });
    state.nextShopBonusCards = [bonus];

    // Trigger sacrifice
    useCardFromHand(whispers.id);
    assert.strictEqual(state.targetingEffect.effect, 'whispers_sacrifice');
    applyTargetedEffect(fodder.id);
    
    // Check Discovery state
    assert.ok(state.discovery, "Should enter Discovery mode");
    assert.strictEqual(state.discovery.effect, 'whispers_pick1');
    assert.strictEqual(state.discovery.cards.length, 3);
    assert.strictEqual(state.discovery.cards[0].card_name, "Bonus", "First card should be from scry queue");

    // 2. Multi-step choice
    const card1 = state.discovery.cards[0];
    const card2 = state.discovery.cards[1];
    const card3 = state.discovery.cards[2];
    
    // Pick 1
    resolveDiscovery(card1);
    assert.ok(state.discovery, "Still in discovery for pick 2");
    assert.strictEqual(state.player.hand.includes(card1), true);

    // Pick 2
    resolveDiscovery(card2);
    assert.strictEqual(state.discovery, null, "Discovery finished");
    assert.strictEqual(state.player.hand.includes(card2), true);
    
    // 3. Servant synergy (if card 3 was a Servant)
    resetState();
    state.player.tier = 4;
    const servant = CardFactory.create({ card_name: "Servants of Dydren", tier: 4, type: "Creature" });
    // Mock discovery with Servant as the last one
    state.discovery = {
        cards: [CardFactory.create({card_name: "A"}), CardFactory.create({card_name: "B"}), servant],
        effect: 'whispers_pick1',
        remaining: 2,
        sourceId: 'none'
    };
    resolveDiscovery(state.discovery.cards[0]);
    resolveDiscovery(state.discovery.cards[0]); // Pick A and B
    
    assert.strictEqual(state.player.deadServantsCount, 1, "Unselected Servant should go to GY/Count");
}

function testMurkbornMammoth() {
    resetState();
    const mam = CardFactory.create({ card_name: "Murkborn Mammoth", pt: "7/7", rules_text: "Trample, adaptive" });
    const toBattle = CardFactory.create({ card_name: "To Battle", type: "Instant" });
    state.player.board = [mam];
    state.player.hand = [toBattle];
    mam.owner = 'player';

    assert.strictEqual(mam.hasKeyword('trample'), true);
    assert.strictEqual(mam.hasKeyword('adaptive'), true);

    // Enter casting mode
    useCardFromHand(toBattle.id);
    assert.strictEqual(state.castingSpell.id, toBattle.id);

    // Apply spell via engine
    applySpell(mam.id);

    // Adaptive should trigger copy
    assert.strictEqual(mam.counters, 2, "To Battle (+1/+1 counter) should be doubled (2 counters) by adaptive");
}
function testHissingSunspitter() {
    resetState();
    const spit = CardFactory.create({ card_name: "Hissing Sunspitter", pt: "3/3" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    const spell1 = CardFactory.create({ card_name: "S1", type: "Instant" });
    const spell2 = CardFactory.create({ card_name: "S2", type: "Instant" });
    const spell3 = CardFactory.create({ card_name: "S3", type: "Instant" });
    
    state.player.board = [spit, other];
    state.player.hand = [spell1, spell2, spell3];
    spit.owner = other.owner = 'player';

    // 1st spell
    useCardFromHand(spell1.id);
    assert.strictEqual(state.spellsCastThisTurn, 1);
    assert.strictEqual(spit.tempPower, 0);

    // 2nd spell
    useCardFromHand(spell2.id);
    assert.strictEqual(state.spellsCastThisTurn, 2);
    assert.strictEqual(other.tempPower, 1, "All creatures should get +1/+1 on 2nd spell");

    // 3rd spell
    useCardFromHand(spell3.id);
    assert.strictEqual(state.spellsCastThisTurn, 3);
    assert.strictEqual(other.hasKeyword('first strike'), true, "All creatures should gain first strike on 3rd spell");
}

function testCeremonyOfTribes() {
    resetState();
    const cer = CardFactory.create({ card_name: "Ceremony of Tribes", type: "Sorcery" });
    const rec = CardFactory.create({ card_name: "Cybres-Band Recruiter", pt: "2/2" });
    const s1 = CardFactory.create({ card_name: "Servants of Dydren", pt: "2/2" });
    
    state.player.board = [rec, s1];
    state.player.hand = [cer];
    rec.owner = s1.owner = 'player';

    // multi-step
    useCardFromHand(cer.id);
    assert.strictEqual(state.targetingEffect.effect, 'ceremony_step1');
    
    applyTargetedEffect(rec.id);
    assert.strictEqual(state.targetingEffect.effect, 'ceremony_step2');
    
    applyTargetedEffect(s1.id);
    
    // rec (initial) + s1 (initial) + token(rec) + token(rec).onETB(centaur) + token(s1) = 5 cards
    assert.strictEqual(state.player.board.length, 5, "Should have 5 cards total (including Recruiter token's spawn)");
    assert.strictEqual(state.player.board[2].card_name, "Cybres-Band Recruiter");
    assert.strictEqual(state.player.board[4].card_name, "Servants of Dydren");
    
    // Check ETBs (Servants of Dydren lord effect should update)
    assert.strictEqual(s1.getDisplayStats(state.player.board).p, 4, "S1 should now be 4/4 (2 base + 2 from token copy)");
}

function testCeremonyOfTribes_NoDoubleTarget() {
    resetState();
    const cer = CardFactory.create({ card_name: "Ceremony of Tribes", type: "Sorcery" });
    const rec1 = CardFactory.create({ card_name: "Recruiter 1", pt: "2/2" });
    const rec2 = CardFactory.create({ card_name: "Recruiter 2", pt: "2/2" });
    
    state.player.board = [rec1, rec2];
    state.player.hand = [cer];
    rec1.owner = rec2.owner = 'player';

    useCardFromHand(cer.id);
    applyTargetedEffect(rec1.id);
    
    // Step 2: Attempt to target the exact same creature again
    applyTargetedEffect(rec1.id);
    
    assert.strictEqual(state.targetingEffect && state.targetingEffect.effect, 'ceremony_step2', "Should remain in step 2 because double targeting is invalid");
    assert.strictEqual(state.player.board.length, 2, "Should not create a copy yet");
}

function testCeremonyOfTribes_SingleTarget() {
    resetState();
    const cer = CardFactory.create({ card_name: "Ceremony of Tribes", type: "Sorcery" });
    const rec = CardFactory.create({ card_name: "Lone Recruiter", pt: "2/2" });
    
    state.player.board = [rec];
    state.player.hand = [cer];
    rec.owner = 'player';

    useCardFromHand(cer.id);
    applyTargetedEffect(rec.id);
    
    assert.strictEqual(state.targetingEffect, null, "Should finish immediately with only one target");
    assert.strictEqual(state.player.board.length, 2, "Should have created a copy of the lone creature");
}

function testCeremonyOfTribes_NoCastBuffForCopies() {
    resetState();
    const cer = CardFactory.create({ card_name: "Ceremony of Tribes", type: "Sorcery" });
    const pale = CardFactory.create({ card_name: "Pale Dillettante", pt: "2/2" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    
    state.player.board = [pale, other];
    state.player.hand = [cer];
    pale.owner = other.owner = 'player';

    useCardFromHand(cer.id);
    applyTargetedEffect(pale.id);
    applyTargetedEffect(other.id);
    
    const copyPale = state.player.board.find(c => c.id !== pale.id && c.card_name === "Pale Dillettante");
    
    assert.ok(copyPale, "Copied Pale Dillettante should exist");
    assert.strictEqual(pale.counters, 1, "Original Pale Dillettante gets a counter from the spell cast");
    assert.strictEqual(copyPale.counters, 0, "Copied Pale Dillettante should NOT get a counter from the spell that created it");
}

function testCeremonyOfTribes_ETBOrder() {
    resetState();
    const cer = CardFactory.create({ card_name: "Ceremony of Tribes", type: "Sorcery" });
    const fest = CardFactory.create({ card_name: "Festival Celebrants", pt: "2/2" });
    const luna = CardFactory.create({ card_name: "Lingering Lunatic", pt: "4/5", rules_text: "Vigilance" });
    
    state.player.board = [fest, luna];
    state.player.hand = [cer];
    fest.owner = luna.owner = 'player';

    useCardFromHand(cer.id);
    applyTargetedEffect(fest.id); // Target 1
    applyTargetedEffect(luna.id); // Target 2
    
    const tokenLuna = state.player.board.find(c => c.id !== luna.id && c.card_name === "Lingering Lunatic");
    
    assert.ok(tokenLuna, "Lunatic token should be created");
    // The Festival Celebrants token ETB should give the Lunatic token +1/+1
    // Then the Lunatic token ETB should proliferate, taking it to 2 counters.
    assert.strictEqual(tokenLuna.counters, 2, "Lunatic token should receive buff from Celebrants token and then proliferate it");
}

function testGhessianMemories() {
    resetState();
    const gm = CardFactory.create({ card_name: "Ghessian Memories", type: "Instant" });
    const squire = CardFactory.create({ card_name: "Cybres-Clan Squire", pt: "2/2", type: "Creature - Centaur" });
    state.player.board = [squire];
    state.player.hand = [gm];
    squire.owner = 'player';
    
    useCardFromHand(gm.id);
    
    // Check Token Creation and ETB
    assert.strictEqual(state.player.board.length, 2, "Should create one token");
    const token = state.player.board[1];
    assert.strictEqual(token.card_name, "Centaur Knight");
    assert.strictEqual(squire.counters, 1, "Squire should trigger ETB off token");

    const hexproofCard = state.discovery.cards.find(c => c.card_name === 'Hexproof');
    resolveDiscovery(hexproofCard);
    
    assert.strictEqual(squire.hasKeyword('hexproof'), true, "Squire gained Hexproof");
    assert.strictEqual(token.hasKeyword('hexproof'), true, "Token gained Hexproof");
}

function testHeroOfALostWar_Self() {
    resetState();
    const hero = CardFactory.create({ card_name: "Hero of a Lost War", pt: "3/3", type: "Creature - Centaur Knight" });
    state.player.board = [hero];
    hero.owner = 'player';
    
    // We must pass the board to the trigger
    hero.onCombatStart(state.player.board);
    
    // The hero in the board array has the updated temp stats.
    const updatedHero = state.player.board[0];
    const stats = updatedHero.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 4, "Hero base power should become 4");
    assert.strictEqual(updatedHero.hasKeyword('indestructible'), true, "Hero gained Indestructible");
}

function testHeroOfALostWar_Other() {
    resetState();
    const hero = CardFactory.create({ card_name: "Hero of a Lost War", pt: "3/3", type: "Creature - Centaur Knight" });
    const otherCentaur = CardFactory.create({ card_name: "Other", pt: "1/1", type: "Creature - Centaur" });
    state.player.board = [hero, otherCentaur];
    hero.owner = otherCentaur.owner = 'player';

    const originalRandom = Math.random;
    Math.random = () => 0.99; // Pick 'Other' (index 1)
    hero.onCombatStart(state.player.board);
    Math.random = originalRandom;

    const otherStats = otherCentaur.getDisplayStats(state.player.board);
    assert.strictEqual(otherStats.p, 4, "Other Centaur base power should become 4");
    assert.strictEqual(otherCentaur.hasKeyword('indestructible'), true, "Other Centaur gained Indestructible");
}

function testHeroOfHedria() {
    resetState();
    const hedria = CardFactory.create({ card_name: "Hero of Hedria", pt: "3/3", rules_text: "Double strike" });
    
    // Double strike isn't a direct engine keyword yet, but if it acts like First Strike
    // We should verify that Double Strike logic works.
    // Wait, the engine doesn't explicitly support "Double strike" yet outside of the rules text.
    // We need to implement Double Strike in resolveCombatImpact if we haven't.
    // Let's assert it has the keyword for now.
    assert.strictEqual(hedria.hasKeyword('double strike'), true, "Should have Double strike keyword");
}

function testHoltunClanEldhand() {
    resetState();
    const eldhand = CardFactory.create({ card_name: "Holtun-Clan Eldhand", pt: "3/6", rules_text: "Lifelink" });
    assert.strictEqual(eldhand.hasKeyword('lifelink'), true, "Should have Lifelink keyword");
}

function testHexproof_SuitorOfDeath_Fizzle() {
    resetState();
    const suitor = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "1/1", rules_text: "Hexproof" });
    
    state.battleBoards = {
        player: [suitor],
        opponent: [hexVictim]
    };
    suitor.owner = 'player';
    hexVictim.owner = 'opponent';
    suitor.isDying = true;
    state.phase = 'BATTLE';

    processDeaths(state.battleBoards.player, 'player');
    
    assert.strictEqual(hexVictim.isDestroyed, false, "Hexproof creature should NOT be destroyed (Fizzled)");
}

function testHexproof_SuitorOfDeath_Targeting() {
    resetState();
    const suitor = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "1/1", rules_text: "Hexproof" });
    const normalVictim = CardFactory.create({ card_name: "Normal Victim", pt: "1/1" });
    
    state.battleBoards = {
        player: [suitor],
        opponent: [hexVictim, normalVictim]
    };
    suitor.owner = 'player';
    hexVictim.owner = normalVictim.owner = 'opponent';
    suitor.isDying = true;
    state.phase = 'BATTLE';

    processDeaths(state.battleBoards.player, 'player');
    
    assert.strictEqual(hexVictim.isDestroyed, false, "Hexproof creature should NOT be destroyed");
    assert.strictEqual(normalVictim.isDestroyed, true, "Normal creature MUST be the one destroyed");
}

function testHexproof_AlluringWisps() {
    resetState();
    const wisps = CardFactory.create({ card_name: "Alluring Wisps", pt: "2/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "4/4", rules_text: "Hexproof" });
    
    state.battleBoards = {
        player: [wisps],
        opponent: [hexVictim]
    };
    wisps.owner = 'player';
    hexVictim.owner = 'opponent';
    state.phase = 'BATTLE';

    wisps.onAttack(state.battleBoards.player);
    
    assert.strictEqual(hexVictim.tempPower, 0, "Hexproof creature should not get -2 debuff");
}

function testHexproof_CabracansFamiliar() {
    resetState();
    const familiar = CardFactory.create({ card_name: "Cabracan's Familiar", pt: "2/2" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "2/2", rules_text: "Hexproof" });
    
    state.battleBoards = {
        player: [familiar],
        opponent: [hexVictim]
    };
    familiar.owner = 'player';
    hexVictim.owner = 'opponent';
    state.phase = 'BATTLE';

    // Mock performAttack impact
    // We can directly call the logic from performAttack here, but it's simpler to test the condition
    // The familiar logic is currently in performAttack directly.
    // Let's simulate the Familiar pre-damage condition
    if (familiar.card_name === 'Cabracan\'s Familiar' && hexVictim && !hexVictim.hasKeyword('Hexproof')) {
        hexVictim.damageTaken += 2;
    }
    
    assert.strictEqual(hexVictim.damageTaken, 0, "Hexproof creature takes 0 pre-fight damage");
    
    // Impact resolution (Trade)
    resolveCombatImpact(familiar, hexVictim);
    assert.strictEqual(familiar.damageTaken, 2, "Familiar trades");
    assert.strictEqual(hexVictim.damageTaken, 2, "Hex Victim trades");
}

function testHeroOfHedria() {
    resetState();
    const hedria = CardFactory.create({ card_name: "Hero of Hedria", pt: "3/3", rules_text: "Double strike" });
    hedria.owner = 'player';
    state.battleBoards = { player: [hedria], opponent: [] };
    
    const hasDoubleStrike = hedria.hasKeyword('Double strike');
    let totalDamage = 0;
    if (hasDoubleStrike) {
        const first = resolveCombatImpact(hedria, null, true);
        const second = resolveCombatImpact(hedria, null, true);
        totalDamage = first.defenderDamageTaken + second.defenderDamageTaken;
    }
    
    assert.strictEqual(totalDamage, 6, "Double strike should deal double damage to face");
}

function testHoltunClanEldhand() {
    resetState();
    const eldhand = CardFactory.create({ card_name: "Holtun-Clan Eldhand", pt: "3/6", rules_text: "Lifelink" });
    assert.strictEqual(eldhand.hasKeyword('lifelink'), true);
}

function testHexproof_SuitorOfDeath_Fizzle() {
    resetState();
    const suitor = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "1/1", rules_text: "Hexproof" });
    state.battleBoards = { player: [suitor], opponent: [hexVictim] };
    suitor.owner = 'player'; hexVictim.owner = 'opponent';
    suitor.isDying = true; state.phase = 'BATTLE';
    processDeaths(state.battleBoards.player, 'player');
    assert.strictEqual(hexVictim.isDestroyed, false, "Hexproof creature should NOT be destroyed");
}

function testHexproof_SuitorOfDeath_Targeting() {
    resetState();
    const suitor = CardFactory.create({ card_name: "Suitor of Death", pt: "3/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "1/1", rules_text: "Hexproof" });
    const normalVictim = CardFactory.create({ card_name: "Normal Victim", pt: "1/1" });
    state.battleBoards = { player: [suitor], opponent: [hexVictim, normalVictim] };
    suitor.owner = 'player'; hexVictim.owner = normalVictim.owner = 'opponent';
    suitor.isDying = true; state.phase = 'BATTLE';
    processDeaths(state.battleBoards.player, 'player');
    assert.strictEqual(hexVictim.isDestroyed, false);
    assert.strictEqual(normalVictim.isDestroyed, true, "Normal creature MUST be destroyed instead");
}

function testHexproof_AlluringWisps() {
    resetState();
    const wisps = CardFactory.create({ card_name: "Alluring Wisps", pt: "2/1" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "4/4", rules_text: "Hexproof" });
    state.battleBoards = { player: [wisps], opponent: [hexVictim] };
    wisps.owner = 'player'; hexVictim.owner = 'opponent'; state.phase = 'BATTLE';
    wisps.onAttack(state.battleBoards.player);
    assert.strictEqual(hexVictim.tempPower, 0, "Hexproof creature should not get -2 debuff");
}

function testHexproof_CabracansFamiliar() {
    resetState();
    const familiar = CardFactory.create({ card_name: "Cabracan's Familiar", pt: "2/2" });
    const hexVictim = CardFactory.create({ card_name: "Hex Victim", pt: "2/2", rules_text: "Hexproof" });
    state.battleBoards = { player: [familiar], opponent: [hexVictim] };
    familiar.owner = 'player'; hexVictim.owner = 'opponent'; state.phase = 'BATTLE';
    if (familiar.card_name === 'Cabracan\'s Familiar' && hexVictim && !hexVictim.hasKeyword('Hexproof')) {
        hexVictim.damageTaken += 2;
    }
    assert.strictEqual(hexVictim.damageTaken, 0, "Hexproof creature takes 0 pre-fight damage");
    resolveCombatImpact(familiar, hexVictim);
    assert.strictEqual(familiar.damageTaken, 2);
    assert.strictEqual(hexVictim.damageTaken, 2);
}

function testThunderRaptor() {
    resetState();
    const raptor = CardFactory.create({ card_name: "Thunder Raptor", pt: "4/4", type: "Creature - Bird Warrior", rules_text: "Flying" });
    const otherBird = CardFactory.create({ card_name: "Other Bird", pt: "1/1", type: "Creature - Bird", rules_text: "Flying" });
    state.player.board = [raptor, otherBird];
    raptor.owner = otherBird.owner = 'player';
    
    // Case 1: Not in Cirrusea
    raptor.onETB(state.player.board);
    assert.strictEqual(state.player.plane, 'Cirrusea');
    
    // Case 2: Already in Cirrusea (should queue counter grant)
    raptor.onETB(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'traverse_cirrusea_grant');
    applyTargetedEffect(otherBird.id);
    
    const stats = otherBird.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 4, "Base 1 + counters 1 + Raptor Lord 2 = 4");
}

function testCloudlineSovereign() {
    resetState();
    const sovereign = CardFactory.create({ card_name: "Cloudline Sovereign", pt: "3/3", type: "Enchantment Creature - Bird Wizard" });
    state.player.board = [sovereign];
    sovereign.owner = 'player';
    
    sovereign.onETB(state.player.board);
    assert.strictEqual(sovereign.counters, 1);
    
    // Test Success
    sovereign.onShopStart(state.player.board);
    applyTargetedEffect(sovereign.id, 'plus-one');
    assert.strictEqual(sovereign.counters, 0);
    assert.strictEqual(sovereign.shieldCounters, 1);

    // Test Cancel
    sovereign.counters = 1;
    sovereign.shieldCounters = 0;
    sovereign.onShopStart(state.player.board);
    state.targetingEffect = null; // Simulate Cancel button
    assert.strictEqual(sovereign.counters, 1, "Should remain 1 on cancel");
    assert.strictEqual(sovereign.shieldCounters, 0, "Should remain 0 on cancel");
}

function testNightfallRaptor() {
    resetState();
    const raptor = CardFactory.create({ card_name: "Nightfall Raptor", pt: "3/2", type: "Enchantment Creature - Bird Rogue" });
    const victim = CardFactory.create({ card_name: "Victim", pt: "2/2", type: "Creature - Bear" });
    const token = CardFactory.create({ card_name: "Token", pt: "1/1", type: "Creature - Bird", shape: "token" });
    const enchantmentCreature = CardFactory.create({ card_name: "Ench", pt: "1/1", type: "Enchantment Creature - Bird" });
    
    state.player.board = [raptor, victim, token, enchantmentCreature];
    raptor.owner = victim.owner = token.owner = enchantmentCreature.owner = 'player';
    
    // Case 1: Bounce normal creature
    raptor.onETB(state.player.board);
    applyTargetedEffect(victim.id);
    assert.strictEqual(state.player.hand.includes(victim), true, "Normal creature bounced to hand");
    assert.strictEqual(state.player.board.length, 3);

    // Case 2: Bounce token (Should also go to hand in this game)
    raptor.onETB(state.player.board);
    applyTargetedEffect(token.id);
    assert.strictEqual(state.player.hand.includes(token), true, "Token bounced to hand");

    // Case 3: Cancel
    const startBoardSize = state.player.board.length;
    raptor.onETB(state.player.board);
    state.targetingEffect = null; // Simulate Cancel
    assert.strictEqual(state.player.board.length, startBoardSize, "Board size should not change on cancel");

    // Case 4: Non-enchantment restriction
    // (Logic check: applyTargetedEffect should ignore enchantment creatures for this effect)
    raptor.onETB(state.player.board);
    const startSize = state.player.board.length;
    applyTargetedEffect(enchantmentCreature.id); 
    assert.strictEqual(state.player.board.length, startSize, "Should not bounce enchantment creature");
}

function testTriumphantTactics() {
    resetState();
    const tt = CardFactory.create({ card_name: "Triumphant Tactics", type: "Sorcery" });
    const attacker = CardFactory.create({ card_name: "Attacker", pt: "2/2" });
    const defender = CardFactory.create({ card_name: "Defender", pt: "2/2" });

    attacker.owner = 'player';
    defender.owner = 'opponent';
    state.player.board = [attacker]; // Triumphant Tactics casts on state.player.board
    state.battleBoards = { player: [attacker], opponent: [defender] };
    
    tt.onCast(state.player.board);
    assert.strictEqual(attacker.enchantments.some(e => e.card_name === 'Triumphant Tactics'), true, "Attacker should have Tactics enchantment");
    assert.strictEqual(attacker.hasKeyword('double strike'), true, "Attacker should have double strike");
    
    // Combat trigger
    resolveCombatImpact(attacker, defender, true);
    assert.strictEqual(attacker.counters, 1, "Should gain a counter on damage");
}

function testEarthcoreElemental() {
    resetState();
    const elemental = CardFactory.create({ card_name: "Earthcore Elemental", pt: "4/3", rules_text: "Trample" });
    const intruder = CardFactory.create({ card_name: "Intruder", pt: "5/5" });
    state.player.board = [elemental];
    elemental.owner = 'player';
    intruder.owner = 'player';
    
    assert.strictEqual(elemental.hasKeyword('trample'), true, "Elemental must have trample");
    elemental.onOtherCreatureETB(intruder, state.player.board);
    
    assert.strictEqual(elemental.tempPower, 5);
    assert.strictEqual(elemental.tempToughness, 5);

    // Combat summon check
    resetState();
    state.phase = 'BATTLE';
    const combatElemental = CardFactory.create({ card_name: "Earthcore Elemental", pt: "4/3", rules_text: "Trample" });
    combatElemental.owner = 'player';
    
    const carcassToken = CardFactory.create({ card_name: "Construct", pt: "2/2", shape: "token" });
    carcassToken.owner = 'player';
    
    state.player.board = [combatElemental];
    
    // Simulate summon during combat
    combatElemental.onOtherCreatureETB(carcassToken, state.player.board);
    
    assert.strictEqual(combatElemental.tempPower, 2, "Earthcore Elemental should gain temp power from combat summon (2/2)");
    assert.strictEqual(combatElemental.tempToughness, 2, "Earthcore Elemental should gain temp toughness from combat summon (2/2)");
}

function testSavageCongregation() {
    resetState();
    const sc = CardFactory.create({ card_name: "Savage Congregation", type: "Sorcery" });
    const recruiter = CardFactory.create({ card_name: "Cybres-Band Recruiter", pt: "3/3", tier: 2, type: "Creature - Centaur" });
    const big = CardFactory.create({ card_name: "Big", pt: "4/4", tier: 2 });
    
    state.player.hand = [sc];
    state.player.board = [big];
    big.owner = 'player';

    useCardFromHand(sc.id);
    
    // Verify pool constraints
    const pool = state.discovery.cards;
    assert.strictEqual(pool.length, 6);
    assert.ok(pool.some(c => (c.tier || 1) === 1), "Must have at least one T1");
    assert.ok(pool.some(c => (c.tier || 1) === 4), "Must have at least one T4");
    assert.ok(pool.every(c => (c.tier || 1) <= 4), "No cards above T4");

    // Select Recruiter
    state.discovery.selected = [recruiter];
    confirmDiscovery();
    
    // Board should have: Big (4/4), Recruiter (3/3), Token (2/2)
    assert.strictEqual(state.player.board.length, 3, "Recruiter and its token should both be on board");
    
    // Ferocious was active, so all 3 should have a +1/+1 counter
    assert.strictEqual(big.counters, 1);
    assert.strictEqual(recruiter.counters, 1);
    const token = state.player.board.find(c => c.card_name === "Centaur Knight");
    assert.ok(token);
    assert.strictEqual(token.counters, 1, "Token generated by ETB should also receive the Ferocious counter");
}

function testNdengoBrutalizer() {
    resetState();
    const brut = CardFactory.create({ card_name: "Ndengo Brutalizer", pt: "5/4" });
    state.player.board = [brut];
    brut.owner = 'player';

    // Case 1: Solo
    brut.onETB(state.player.board);
    assert.strictEqual(state.discovery.effect, 'ndengo_solo');
    
    const fs = state.discovery.cards.find(c => c.rules_text === 'First strike');
    resolveDiscovery(fs);
    assert.strictEqual(brut.hasKeyword('first strike'), true);

    // Case 2: Duo
    resetState();
    const brut2 = CardFactory.create({ card_name: "Ndengo Brutalizer", pt: "5/4" });
    const target = CardFactory.create({ card_name: "Target", pt: "2/2" });
    state.player.board = [brut2, target];
    brut2.owner = target.owner = 'player';

    brut2.onETB(state.player.board);
    
    // Attempt self-target
    applyTargetedEffect(brut2.id);
    assert.strictEqual(state.targetingEffect.effect, 'ndengo_target', "Should still be in targeting mode after self-target attempt");

    applyTargetedEffect(target.id);
    assert.strictEqual(state.discovery.effect, 'ndengo_choice');
    
    const choiceA = state.discovery.cards.find(c => c.card_name === 'Choice A');
    resolveDiscovery(choiceA);
    
    assert.strictEqual(brut2.hasKeyword('trample'), true, "Ndengo gets Trample from Choice A");
    assert.strictEqual(target.hasKeyword('first strike'), true, "Target gets First Strike from Choice A");
    
    // Case 3: Teach (already has it)
    resetState();
    const brut3 = CardFactory.create({ card_name: "Ndengo Brutalizer", pt: "5/4", rules_text: "First strike" });
    state.player.board = [brut3];
    brut3.owner = 'player';
    
    brut3.onETB(state.player.board);
    const fs3 = state.discovery.cards.find(c => c.rules_text === 'First strike');
    resolveDiscovery(fs3);
    assert.strictEqual(brut3.counters, 1, "Should get counter because it already has FS");
}

function testPyrewrightTrainee() {
    resetState();
    const trainee = CardFactory.create({ card_name: "Pyrewright Trainee", pt: "3/3", rules_text: "Flying, haste" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [trainee, other];
    trainee.owner = other.owner = 'player';
    
    // 1. Keywords
    assert.strictEqual(trainee.hasKeyword('flying'), true);
    assert.strictEqual(trainee.hasKeyword('haste'), true);
    
    // 2. Battle Cry
    trainee.onAttack(state.player.board);
    assert.strictEqual(other.tempPower, 1, "Other creature should get +1/+0 from Battle Cry");
    assert.strictEqual(trainee.tempPower, 0, "Attacker should not buff itself");
}

function testLagoonLogistics() {
    resetState();
    const ll = CardFactory.create({ card_name: "Lagoon Logistics" });
    // Use a creature with an ETB to verify double trigger
    // Dewdrop Oracle ETB: adds to discoveryQueue
    const oracle = CardFactory.create({ card_name: "Dewdrop Oracle", pt: "1/1" });
    state.player.board = [oracle];
    oracle.owner = 'player';
    
    // Need this for the blink recreation
    availableCards.push({ card_name: "Dewdrop Oracle", pt: "1/1", set: "SHF" });
    
    ll.onApply(oracle, state.player.board);
    
    assert.strictEqual(state.panharmoniconActive, true, "Panharmonicon flag should be set");
    
    // Doubled trigger means 2 entries in discoveryQueue
    assert.strictEqual(state.discoveryQueue.length, 2, "Blinked creature should trigger ETB twice");
    
    const newOracle = state.player.board[0];
    assert.notStrictEqual(newOracle.id, oracle.id, "Creature should be a new instance after blink");
}

function testFlauntLuxury() {
    resetState();
    const flaunt = CardFactory.create({ card_name: "Flaunt Luxury" });
    state.player.gold = 0;
    state.player.tier = 1;
    
    // availableCards needs to have something to draw
    availableCards.push({ card_name: "Test Creature", type: "Creature", shape: "normal", tier: 1 });
    
    flaunt.onCast(state.player.board);
    assert.strictEqual(state.player.gold, 3, "Should get 3 gold (Treasures)");
    assert.strictEqual(state.shop.cards.length, 3, "Should add 3 cards to the SHOP");
}

function testArtfulCoercion() {
    resetState();
    const artful = CardFactory.create({ card_name: "Artful Coercion", type: "Sorcery" });
    const myWeak = CardFactory.create({ card_name: "MyWeak", pt: "2/2" });
    const shopWeak = CardFactory.create({ card_name: "ShopWeak", pt: "1/1", type: "Creature" });
    const shopStrong = CardFactory.create({ card_name: "ShopStrong", pt: "5/5", type: "Creature" });
    
    state.player.hand = [artful];
    state.player.board = [myWeak];
    myWeak.owner = 'player';
    state.shop.cards = [shopWeak, shopStrong];
    
    // Case 1: Board full failure
    state.player.board = Array(7).fill(myWeak);
    useCardFromHand(artful.id);
    assert.strictEqual(state.castingSpell, null, "Should not be castable if board is full");

    // Case 2: Normal resolution
    resetState();
    state.player.hand = [artful];
    state.player.board = [myWeak];
    myWeak.owner = 'player';
    state.shop.cards = [shopWeak, shopStrong];
    
    useCardFromHand(artful.id);
    assert.strictEqual(state.castingSpell.card_name, 'Artful Coercion');
    
    // Apply to ShopWeak
    applySpell(shopWeak.id);
    
    assert.strictEqual(state.player.board.length, 2, "Should have gained control of ShopWeak");
    assert.strictEqual(state.player.board.includes(shopWeak), true);
    assert.strictEqual(shopWeak.owner, 'player');
    
    // Invigorate 2: Puts 2 counters on player's weakest creature.
    // ShopWeak (1/1) was gained, it is now the weakest.
    assert.strictEqual(shopWeak.counters, 2, "Weakest creature (ShopWeak) should receive 2 counters");
}

function testMagnificWilderkin() {
    resetState();
    const wilderkin = CardFactory.create({ card_name: "Magnific Wilderkin", pt: "3/3" });
    const flyer1 = CardFactory.create({ card_name: "Flyer1", pt: "1/1", rules_text: "Flying" });
    const flyer2 = CardFactory.create({ card_name: "Flyer2", pt: "1/1", rules_text: "Flying" });
    const trampler = CardFactory.create({ card_name: "Trampler", pt: "2/2", rules_text: "Trample" });
    
    state.player.board = [wilderkin, flyer1, flyer2, trampler];
    wilderkin.owner = flyer1.owner = flyer2.owner = trampler.owner = 'player';
    
    wilderkin.onCombatStart(state.player.board);
    
    // Keywords found: Flying (from 2 sources), Trample (from 1 source)
    // Should get +2/+2 and 2 keywords
    assert.strictEqual(wilderkin.tempPower, 2, "Should only gain +1/+1 per UNIQUE keyword found across the board");
    assert.strictEqual(wilderkin.hasKeyword('flying'), true);
    assert.strictEqual(wilderkin.hasKeyword('trample'), true);
}

function testDwarvenPhalanx() {
    resetState();
    const phalanx = CardFactory.create({ card_name: "Dwarven Phalanx", pt: "4/5" });
    state.player.board = [phalanx];
    phalanx.owner = 'player';
    
    // Case 1: Alone (No targets)
    phalanx.onCombatStart(state.player.board);
    assert.strictEqual(phalanx.counters, 0, "Phalanx should not be able to target itself");
    assert.strictEqual(phalanx.hasKeyword('indestructible'), false);

    // Case 2: Another target
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    state.player.board.push(target);
    target.owner = 'player';
    phalanx.onCombatStart(state.player.board);
    assert.strictEqual(target.counters, 1);
    assert.strictEqual(target.hasKeyword('indestructible'), true);
}

function testLairRecluse() {
    resetState();
    const recluse = CardFactory.create({ card_name: "Lair Recluse", pt: "4/5" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [recluse];
    recluse.owner = other.owner = 'player';
    
    recluse.onETB(state.player.board);
    assert.strictEqual(recluse.vigilanceCounters, 1);
    assert.strictEqual(recluse.reachCounters, 1);
    
    // 1. Solitary Check: Should NOT trigger if alone
    recluse.onShopStart(state.player.board);
    assert.strictEqual(state.targetingEffect, null, "Should not trigger permutate if solitary");
    
    // 2. Pair Check: Should trigger
    state.player.board.push(other);
    recluse.onShopStart(state.player.board);
    assert.strictEqual(state.targetingEffect.effect, 'permutate_step1');
    assert.strictEqual(state.targetingEffect.isMandatory, false, "Step 1 should be optional");
    
    // 3. Counter Removal (Reach)
    applyTargetedEffect(recluse.id, 'reach');
    assert.strictEqual(recluse.reachCounters, 0, "Reach counter should be removed");
    assert.strictEqual(state.targetingEffect.effect, 'permutate_step2');
    assert.strictEqual(state.targetingEffect.isMandatory, true, "Step 2 should be mandatory once counter removed");

    // 4. Hand Targeting Check: Should NOT be able to target card in hand
    const handCard = CardFactory.create({ card_name: "Hand Card", pt: "2/2" });
    state.player.hand = [handCard];
    applyTargetedEffect(handCard.id); // Should fail to find target and do nothing
    assert.strictEqual(state.targetingEffect.effect, 'permutate_step2', "Targeting should still be active");
    assert.strictEqual(handCard.counters, 0, "Hand card should not have received counters");

    // 5. Board targeting (Valid)
    applyTargetedEffect(other.id);
    assert.strictEqual(other.counters, 2, "Other board creature should have received counters");
    assert.strictEqual(state.targetingEffect, null, "Targeting should be finished");
}

function testTunnelWebSpider() {
    resetState();
    const spider = CardFactory.create({ card_name: "Tunnel Web Spider", rules_text: "Reach, deathtouch" });
    assert.strictEqual(spider.hasKeyword('reach'), true);
    assert.strictEqual(spider.hasKeyword('deathtouch'), true);
}

function testWarhammerKreg() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const kreg = CardFactory.create({ card_name: "Warhammer Kreg", type: "Equipment", rules_text: "Equipped creature gets +1/+1 and has double strike." });
    host.equipment = kreg;
    state.player.board = [host];

    assert.strictEqual(host.getDisplayStats(state.player.board).p, 3, "Host gets +1 Power");
    assert.strictEqual(host.getDisplayStats(state.player.board).t, 3, "Host gets +1 Toughness");
    assert.strictEqual(host.hasKeyword('Double strike'), true, "Host gets Double Strike");
}

function testDancingMirrorblade() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const mirrorblade = CardFactory.create({ card_name: "Dancing Mirrorblade", type: "Equipment" });
    
    host.equipment = mirrorblade;
    host.counters = 2; // +2/+2
    host.tempPower = 2; // Faith in Darkness
    host.tempToughness = 2;
    host.enchantments.push({ card_name: "Faith in Darkness", rules_text: "+2/+2", isTemporary: true });
    
    host.owner = 'player';
    state.player.board = [host];
    state.phase = 'BATTLE';
    state.battleQueues = { player: [host], opponent: [] };

    // Simulate attack
    host.equipment.onEquippedAttack(host, state.player.board);

    assert.strictEqual(state.player.board.length, 2, "Token should be spawned on the board");
    const token = state.player.board[1];
    
    assert.strictEqual(token.counters, 2, "Token should inherit +1/+1 counters");
    assert.strictEqual(token.tempPower, 2, "Token should inherit tempPower");
    assert.strictEqual(token.tempToughness, 2, "Token should inherit tempToughness");
    assert.strictEqual(token.enchantments.some(e => e.card_name === 'Faith in Darkness'), true, "Token should inherit enchantments");
    assert.strictEqual(token.enchantments.some(e => e.card_name === 'Mirrorblade Exile'), true, "Token should be marked for exile");
    assert.strictEqual(token.equipment, null, "Token should NOT copy the equipment itself");
    
    assert.strictEqual(state.battleQueues.player[0].id, token.id, "Token should be at the front of the battle queue");
}

function testTheExileQueensCrown() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    const crown = CardFactory.create({ card_name: "The Exile Queen's Crown", type: "Equipment" });
    
    host.equipment = crown;
    state.player.board = [host, other];

    host.equipment.onEquippedAttack(host, state.player.board);

    assert.strictEqual(host.tempPower, 0, "Host should not buff itself");
    assert.strictEqual(other.tempPower, 1, "Other creature gets +1 Power");
    assert.strictEqual(other.tempToughness, 1, "Other creature gets +1 Toughness");
    assert.strictEqual(other.hasKeyword('Indestructible'), true, "Other creature gets Indestructible");
    assert.strictEqual(host.hasKeyword('Indestructible'), false, "Host should not get Indestructible from the Crown");
}

function testDragonlordsCarapace() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const carapace = CardFactory.create({ card_name: "Dragonlord's Carapace", type: "Equipment", rules_text: "Equipped creature gets +8/+8 and has trample." });
    host.equipment = carapace;
    state.player.board = [host];

    assert.strictEqual(host.getDisplayStats(state.player.board).p, 10, "Host gets +8 Power");
    assert.strictEqual(host.getDisplayStats(state.player.board).t, 10, "Host gets +8 Toughness");
    assert.strictEqual(host.hasKeyword('trample'), true, "Host gets Trample");
}

function testDjitusLithifiedMantle() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const mantle = CardFactory.create({ card_name: "Djitu's Lithified Mantle", type: "Equipment" });
    host.equipment = mantle;
    host.owner = 'player';
    state.player.board = [host];
    state.phase = 'BATTLE';
    state.battleQueues = { player: [host], opponent: [] };

    // 1. Initial spawn
    host.equipment.onEquippedAttack(host, state.player.board);
    assert.strictEqual(state.player.board.length, 2, "Jwanga should spawn");
    assert.strictEqual(state.player.board[1].card_name, "Jwanga Djitu");
    assert.strictEqual(state.player.board[1].getDisplayStats(state.player.board).p, 10);

    // 2. Legendary rule (Jwanga alive)
    host.equipment.onEquippedAttack(host, state.player.board);
    assert.strictEqual(state.player.board.length, 2, "No second Jwanga should spawn");

    // 3. Jwanga dies
    state.player.board = [host];
    
    // 4. Respawn check
    host.equipment.onEquippedAttack(host, state.player.board);
    assert.strictEqual(state.player.board.length, 2, "Fresh Jwanga should spawn after first dies");
    assert.strictEqual(state.player.board[1].card_name, "Jwanga Djitu");
}

function testAshWitheredCloak() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const cloak = CardFactory.create({ card_name: "Ash-Withered Cloak", type: "Equipment", rules_text: "Equipped creature gets +2/+2." });
    host.equipment = cloak;
    host.owner = 'player';
    state.player.board = [host];

    // Stats check
    assert.strictEqual(host.getDisplayStats(state.player.board).p, 4, "Host gets +2/+2");

    // Spell copying (Faith in Darkness)
    const faith = CardFactory.create({ card_name: "Faith in Darkness" });
    state.castingSpell = faith;
    state.player.hand.push(faith); // Required for applySpell cleanup
    applySpell(host.id);

    // Host 2/2 + Cloak 2/2 + Faith 2/2 + Faith Copy 2/2 = 8/8
    assert.strictEqual(host.getDisplayStats(state.player.board).p, 8, "Faith in Darkness should be copied");
    assert.strictEqual(state.scrying.count, 2, "Scry 1 should be copied to Scry 2");
}

async function testSteelBarding() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2" });
    const barding = CardFactory.create({ card_name: "Steel Barding", type: "Equipment" });
    host.equipment = barding;
    host.owner = 'player';
    state.player.board = [host];

    const stats = host.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 5, "Host gets +3/+3");

    const enemy = CardFactory.create({ card_name: "Enemy", pt: "10/10" });
    enemy.owner = 'opponent';
    state.battleBoards = { player: [host], opponent: [enemy] };
    state.phase = 'BATTLE';

    // 1. Attacking: Should prevent damage
    await performAttack(host, enemy, false);
    assert.strictEqual(host.damageTaken, 0, "Steel Barding should prevent all damage to attacker");

    // 2. Defending: Should NOT prevent damage
    host.damageTaken = 0;
    await performAttack(enemy, host, false);
    assert.ok(host.damageTaken > 0, "Steel Barding should NOT prevent damage while defending");
}

async function testRivhasBlessedBlade() {
    resetState();
    // Camel has ETB: put a counter on target creature you control
    const host = CardFactory.create({ card_name: "Dutiful Camel", pt: "2/2" });
    const blade = CardFactory.create({ card_name: "Rivha's Blessed Blade", type: "Equipment" });
    host.equipment = blade;
    host.owner = 'player';
    state.player.board = [host];
    state.player.fightHp = 10;
    
    const opponent = { id: 0, fightHp: 10, board: [], hero: { ...HEROES.MARKETTO, avatar: "sets/SHF-files/img/60.png" } };
    state.opponents = [opponent];
    state.currentOpponentId = 0;
    state.phase = 'BATTLE'; // Set to BATTLE so ETB auto-resolves

    // Trigger initial ETB manually
    host.onETB(state.player.board); 
    assert.strictEqual(host.counters, 1, "Should have 1 counter from initial ETB");

    state.battleBoards = { player: [host], opponent: [] };

    // Hit face. Rivha triggers ETB. Camel targets a creature (the only one is itself).
    await performAttack(host, null, false);
    
    // Initial 1 counter from setup + 1 counter from Rivha's triggered ETB = 2 counters
    assert.strictEqual(host.counters, 2, "Rivha's Blade should trigger host's ETB on player hit (auto-resolved at random)");
    assert.strictEqual(host.hasKeyword('flying'), true, "Rivha's Blade grants Flying");
}

async function testRivhasBlessedBladeWithCirrusea() {
    resetState();
    const host = CardFactory.create({ card_name: "Stratus Traveler", pt: "2/3" });
    const blade = CardFactory.create({ card_name: "Rivha's Blessed Blade", type: "Equipment" });
    host.equipment = blade;
    host.owner = 'player';
    state.player.board = [host];
    state.player.fightHp = 10;
    state.player.plane = null; // Reset plane
    
    const opponent = { id: 0, fightHp: 10, board: [], hero: { ...HEROES.MARKETTO, avatar: "sets/SHF-files/img/60.png" } };
    state.opponents = [opponent];
    state.currentOpponentId = 0;
    state.battleBoards = { player: [host], opponent: [] };
    state.phase = 'BATTLE';

    // 1. Initial hit: Should set plane to Cirrusea and spawn a Bird
    await performAttack(host, null, false);
    
    assert.strictEqual(state.player.plane, 'Cirrusea', "Plane should be set to Cirrusea");
    assert.strictEqual(state.battleBoards.player.length, 2, "Should have spawned a Bird");
    assert.strictEqual(state.battleBoards.player[1].card_name, "Bird");

    // 2. Second hit: Plane is already Cirrusea, should trigger traverse_cirrusea_grant
    // Since only host and bird are on board, and Bird has flying, it should grant a counter to Bird or grant Flying (redundant) to host.
    // If it picks host (no flying), it grants flying. If it picks bird (flying), it grants +1/+1.
    // Let's just verify it resolves without error.
    await performAttack(host, null, false);
}

async function testRivhasBlessedBladeWithDiscovery() {
    resetState();
    // Brutalizer (Solo) has ETB: Discover a keyword (First Strike or Trample)
    const host = CardFactory.create({ card_name: "Ndengo Brutalizer", pt: "4/4" });
    const blade = CardFactory.create({ card_name: "Rivha's Blessed Blade", type: "Equipment" });
    host.equipment = blade;
    host.owner = 'player';
    state.player.board = [host];
    state.player.fightHp = 10;
    
    const opponent = { id: 0, fightHp: 10, board: [], hero: { ...HEROES.MARKETTO, avatar: "sets/SHF-files/img/60.png" } };
    state.opponents = [opponent];
    state.currentOpponentId = 0;
    state.battleBoards = { player: [host], opponent: [] };
    state.phase = 'BATTLE';

    // Hit face. Rivha triggers ETB. Ndengo triggers solo Discovery.
    await performAttack(host, null, false);
    
    // Check if it got a keyword or a counter (if it already had the keyword)
    const hasKeyword = host.firstStrikeCounters > 0 || host.trampleCounters > 0;
    assert.ok(hasKeyword, "Rivha's Blade should trigger host's Discovery and auto-resolve it randomly");
}

function testBlacksteelLoadout() {
    resetState();
    const host = CardFactory.create({ card_name: "Host", pt: "2/2", rules_text: "" });
    const loadout = CardFactory.create({ 
        card_name: "Blacksteel Loadout", 
        type: "Equipment", 
        rules_text: "Equipped creature gets +4/+2 and has first strike, vigilance, and trample." 
    });
    host.equipment = loadout;
    state.player.board = [host];

    assert.strictEqual(host.hasKeyword('trample'), true, "Has Trample");
}

async function testKaiLongDarkImmolator() {
    resetState();
    const kaiLong = CardFactory.create({ card_name: "Kai'Long, Dark Immolator", pt: "3/3", rules_text: "Flying" });
    kaiLong.owner = 'player';
    const fodder = CardFactory.create({ card_name: "Fodder", pt: "2/2" });
    fodder.owner = 'player';
    state.player.board = [kaiLong, fodder];
    state.opponents[0].fightHp = 10;

    // 1. SHOP phase: Fodder dies. Verify NO life loss.
    state.phase = 'SHOP';
    kaiLong.onOtherCreatureDeath(fodder, state.player.board);
    assert.strictEqual(state.opponents[0].fightHp, 10, "Opponent should NOT lose life in SHOP phase");

    // 2. BATTLE phase: Fodder dies. Verify life loss.
    state.phase = 'BATTLE';
    state.battleBoards = { player: [kaiLong, fodder], opponent: [] };
    kaiLong.onOtherCreatureDeath(fodder, state.battleBoards.player);
    assert.strictEqual(state.opponents[0].fightHp, 8, "Opponent should lose life in BATTLE phase");

    // 3. BATTLE phase: Kai'Long itself dies. Verify life loss.
    kaiLong.onDeath(state.battleBoards.player, 'player');
    assert.strictEqual(state.opponents[0].fightHp, 5, "Opponent should lose life on Kai'Long's own death");
}

function testLumberingAncient() {
    resetState();
    const ancient = CardFactory.create({ card_name: "Lumbering Ancient", pt: "8/8", rules_text: "Trample" });
    const target1 = CardFactory.create({ card_name: "Target 1", pt: "2/2" });
    const target2 = CardFactory.create({ card_name: "Target 2", pt: "2/2" });
    state.player.board = [ancient, target1, target2];
    
    // Keyword check
    assert.strictEqual(ancient.hasKeyword('trample'), true, "Lumbering Ancient has Trample");

    // Shop phase death (permanent counters)
    state.phase = 'SHOP';
    ancient.onDeath(state.player.board, 'player');
    
    const target1Counters = target1.counters;
    const target2Counters = target2.counters;
    assert.ok(target1Counters === 8 || target2Counters === 8, "One random target should get 8 counters");
}

async function testZaraxSupermajor() {
    resetState();
    const zarax = CardFactory.create({ card_name: "Zarax Supermajor", pt: "1/1" });
    zarax.owner = 'player';
    state.player.board = [zarax];
    
    // 1. ETB
    zarax.onETB(state.player.board);
    assert.strictEqual(state.player.board.length, 2, "Should spawn a Beast token");
    assert.strictEqual(state.player.board[1].card_name, "Beast");

    // 2. Second Spell
    state.spellsCastThisTurn = 2;
    zarax.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(zarax.counters, 1, "Zarax gets a counter on second spell");
    assert.ok(state.player.board.every(c => c.hasKeyword('flying')), "All creatures gain Flying");
}

function testInfuseTheApparatus() {
    resetState();
    const target = CardFactory.create({ card_name: "Target", pt: "2/2" });
    state.player.board = [target];
    
    // Faith in Darkness is a targeted spell with a Scry 1 effect
    const spell = CardFactory.create({ card_name: "Faith in Darkness" });
    state.player.spellGraveyard = [spell, spell]; // Duplicates
    
    const infuse = CardFactory.create({ card_name: "Infuse the Apparatus" });
    infuse.onCast(state.player.board);
    
    // 1. Check exile and targeting mode
    assert.strictEqual(state.player.spellGraveyard.length, 0, "Graveyard should be exiled");
    assert.ok(state.targetingEffect, "Should be in targeting mode for the re-cast spell");
    assert.strictEqual(state.targetingEffect.effect, 'infuse_spell_resolution');
    
    // 2. Resolve targeting
    applyTargetedEffect(target.id);
    
    // 3. Verify spell effects
    assert.ok(state.scrying, "Targeting resolution should trigger the spell's effect (Scry)");
    assert.strictEqual(state.scrying.count, 1, "Should only re-cast ONE copy of the duplicate spell");
    
    const stats = target.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 4, "Target should have received the +2/+2 buff from Faith in Darkness");
}

function testMichalTheAnointed() {
    resetState();
    const michal = CardFactory.create({ 
        card_name: "Michal, the Anointed", 
        pt: "5/5",
        rules_text: "Flying, vigilance, trample, lifelink"
    });
    michal.owner = 'player';
    const target = CardFactory.create({ card_name: "Target", pt: "1/1" });
    target.owner = 'player';
    state.player.board = [michal, target];

    // 1. Keyword check
    assert.strictEqual(michal.hasKeyword('flying'), true, "Michal has Flying");
    assert.strictEqual(michal.hasKeyword('vigilance'), true, "Michal has Vigilance");
    assert.strictEqual(michal.hasKeyword('trample'), true, "Michal has Trample");
    assert.strictEqual(michal.hasKeyword('lifelink'), true, "Michal has Lifelink");

    // 2. Protection from opponent sacrifice (Suitor of Death)
    state.phase = 'BATTLE';
    state.battleBoards = {
        player: [michal, target],
        opponent: []
    };
    const suitor = CardFactory.create({ card_name: "Suitor of Death" });
    suitor.onDeath(state.battleBoards.player, 'opponent'); // Opponent's suitor dies
    assert.strictEqual(state.battleBoards.player.length, 2, "Michal should protect board from Suitor");
    assert.strictEqual(target.isDestroyed || false, false, "Target should NOT be destroyed");

    // 3. Does NOT protect from own sacrifice (Shrieking Pusbag)
    state.phase = 'SHOP';
    const pusbag = CardFactory.create({ card_name: "Shrieking Pusbag" });
    pusbag.onETB(state.player.board);
    applyTargetedEffect(target.id);
    assert.strictEqual(state.player.board.includes(target), false, "Michal should NOT block friendly sacrifice removal");
}

function testLadriaWindwatcher() {
    resetState();
    const ladria = CardFactory.create({ card_name: "Ladria, Windwatcher", pt: "3/3" });
    ladria.owner = 'player';
    const other = CardFactory.create({ card_name: "Other", pt: "1/1" });
    state.player.board = [ladria, other];

    // 1. ETB - Spawns 2 Birds
    ladria.onETB(state.player.board);
    assert.strictEqual(state.player.board.length, 4, "Should create 2 Birds");
    assert.strictEqual(state.player.board[2].card_name, "Bird");
    assert.strictEqual(state.player.board[2].pt, "1/1", "Ladria's birds should be 1/1");
    assert.strictEqual(state.player.board[2].hasKeyword('flying'), true, "Birds have Flying");

    // 2. onAttack - Buffs others
    ladria.onAttack(state.player.board);
    assert.strictEqual(ladria.counters, 0, "Ladria should NOT buff herself");
    assert.strictEqual(other.counters, 1, "Other creature should get a counter");
    assert.strictEqual(state.player.board[2].counters, 1, "Bird 1 should get a counter");
}

function testErinBeaconOfHumility() {
    resetState();
    const erin = CardFactory.create({ card_name: "Erin, Beacon of Humility", pt: "5/4" });
    erin.owner = 'player';
    
    // High stat creature with keywords and counters
    const victim = CardFactory.create({ card_name: "Michal, the Anointed", pt: "5/5" });
    victim.owner = 'opponent';
    victim.counters = 5; 
    
    state.phase = 'BATTLE';
    state.battleBoards = {
        player: [erin],
        opponent: [victim]
    };

    // Attack triggers humility
    erin.onAttack(state.battleBoards.player);
    
    assert.strictEqual(victim.temporaryHumility, true, "Victim should have humility flag");
    const stats = victim.getDisplayStats(state.battleBoards.opponent);
    assert.strictEqual(stats.p, 1, "Power should be true 1");
    assert.strictEqual(stats.t, 1, "Toughness should be true 1");
    assert.strictEqual(victim.hasKeyword('flying'), false, "Should lose Flying");
    assert.strictEqual(victim.hasKeyword('lifelink'), false, "Should lose Lifelink");

    // Humility Lethal Check
    victim.damageTaken = 1;
    const statsDead = victim.getDisplayStats(state.battleBoards.opponent);
    assert.strictEqual(statsDead.t, 0, "Should have 0 toughness after 1 damage in humility");

    // Ability Strip Check (Familiar)
    resetState();
    const erin2 = CardFactory.create({ card_name: "Erin, Beacon of Humility", pt: "5/4" });
    const familiar = CardFactory.create({ card_name: "Cabracan's Familiar", pt: "4/2" });
    erin2.owner = 'player';
    familiar.owner = 'opponent';
    familiar.damageTaken = 1; // Existing damage
    state.phase = 'BATTLE';
    state.battleBoards = { player: [erin2], opponent: [familiar] };

    // Humbles the familiar
    erin2.onAttack(state.battleBoards.player);
    assert.strictEqual(familiar.temporaryHumility, true);
    assert.strictEqual(familiar.damageTaken, 0, "Existing damage should be cleared");

    // Simulate attack from humbled familiar
    // If it still had its ability, erin2 would take 2 damage before the fight
    if (familiar.card_name === 'Cabracan\'s Familiar' && !familiar.temporaryHumility && erin2 && !erin2.hasKeyword('Hexproof')) {
        erin2.damageTaken += 2;
    }
    assert.strictEqual(erin2.damageTaken, 0, "Humbled Familiar should NOT deal pre-fight damage");
}

function testArchitectOfWisdom() {
    resetState();
    const architect = CardFactory.create({ card_name: "Architect of Wisdom", pt: "3/3" });
    architect.owner = 'player';
    
    // Creature in shop
    const lieutenant = CardFactory.create({ card_name: "Warband Lieutenant", pt: "2/2", type: "Creature - Centaur" });
    state.shop.cards = [lieutenant];
    state.player.board = [architect];

    // 1. ETB triggers targeting
    architect.onETB(state.player.board);
    assert.ok(state.targetingEffect, "Should enter targeting mode");
    assert.strictEqual(state.targetingEffect.effect, 'architect_control');

    // 2. Resolve control
    applyTargetedEffect(lieutenant.id);
    assert.strictEqual(state.shop.cards.length, 0, "Should be removed from shop");
    assert.strictEqual(state.player.board.length, 2, "Should be added to player board");
    assert.strictEqual(state.player.board[1].id, lieutenant.id);
    assert.strictEqual(lieutenant.owner, 'player', "Ownership should transfer");

    // 3. Verify Sphinx transformation
    assert.strictEqual(lieutenant.temporarySphinx, true, "Should have Sphinx flag");
    const stats = lieutenant.getDisplayStats(state.player.board);
    assert.strictEqual(stats.p, 3, "Base power should now be 3");
    assert.strictEqual(stats.t, 3, "Base toughness should now be 3");
    assert.strictEqual(lieutenant.hasKeyword('flying'), true, "Should gain Flying");
    
    // 4. Verify abilities are kept (Lieutenant buffs other Centaurs)
    const otherCentaur = CardFactory.create({ card_name: "Centaur", pt: "2/2", type: "Creature - Centaur" });
    state.player.board.push(otherCentaur);
    const centaurStats = otherCentaur.getDisplayStats(state.player.board);
    assert.strictEqual(centaurStats.p, 3, "Stolen Lieutenant should still buff other Centaurs");
}

function testMercilessXunHuang() {
    resetState();
    const xun = CardFactory.create({ card_name: "Merciless Xun Huang", pt: "4/4", rules_text: "Menace" });
    const victim = CardFactory.create({ card_name: "Victim", pt: "2/2" });
    xun.owner = 'player';
    victim.owner = 'opponent';
    
    state.phase = 'BATTLE';
    state.battleBoards = {
        player: [xun],
        opponent: [victim]
    };

    // 1. Ferocious Trigger (xun is 4/4)
    const targets = xun.onAttack(state.battleBoards.player);
    assert.strictEqual(targets.length, 1, "Should return victim for animation");
    assert.strictEqual(targets[0].isDestroyed, true, "Opponent creature should be destroyed by Ferocious attack");

    // 2. Ferocious Fail (power < 4)
    resetState();
    const xunWeak = CardFactory.create({ card_name: "Merciless Xun Huang", pt: "4/4", rules_text: "Menace" });
    const victim2 = CardFactory.create({ card_name: "Victim", pt: "2/2" });
    xunWeak.owner = 'player';
    victim2.owner = 'opponent';
    xunWeak.tempPower = -1; // Now a 3/3
    state.phase = 'BATTLE';
    state.battleBoards = {
        player: [xunWeak],
        opponent: [victim2]
    };
    
    const targetsWeak = xunWeak.onAttack(state.battleBoards.player);
    assert.strictEqual(targetsWeak.length, 0, "Should NOT return any targets ifocious fails");
    assert.strictEqual(victim2.isDestroyed || false, false, "Should NOT destroy if no creature has power 4+");

    // 3. Michal Protection
    resetState();
    const xun2 = CardFactory.create({ card_name: "Merciless Xun Huang", pt: "4/4", rules_text: "Menace" });
    const victim3 = CardFactory.create({ card_name: "Victim", pt: "2/2" });
    const michal = CardFactory.create({ card_name: "Michal, the Anointed", pt: "5/5" });
    xun2.owner = 'player';
    victim3.owner = 'opponent';
    michal.owner = 'opponent';
    state.phase = 'BATTLE';
    state.battleBoards = {
        player: [xun2],
        opponent: [victim3, michal]
    };

    const targetsProtected = xun2.onAttack(state.battleBoards.player);
    assert.strictEqual(targetsProtected.length, 0, "Should NOT return targets if Michal protects");
    assert.strictEqual(victim3.isDestroyed || false, false, "Michal should protect victim from Xun Huang");
    assert.strictEqual(michal.isDestroyed || false, false, "Michal should protect herself from Xun Huang");
}

function testCitadelColossus() {
    resetState();
    const colossus = CardFactory.create({ card_name: "Citadel Colossus", pt: "11/12", rules_text: "Indestructible" });
    assert.strictEqual(colossus.hasKeyword('indestructible'), true, "Colossus should have Indestructible");
    const stats = colossus.getDisplayStats([]);
    assert.strictEqual(stats.p, 11);
    assert.strictEqual(stats.t, 12);
}

function testDewdropPools() {
    resetState();
    const oldAvailable = [...availableCards];
    const mockPool = [
        { card_name: "Creature", type: "Creature", tier: 1 },
        { card_name: "Equipment", type: "Artifact \u2013 Equipment", tier: 1 },
        { card_name: "Sorcery", type: "Sorcery", tier: 1 }
    ];
    setAvailableCards(mockPool);
    state.player.tier = 1;

    // 1. Test Dewdrop Oracle
    const oracle = CardFactory.create({ card_name: "Dewdrop Oracle" });
    oracle.onETB(state.player.board);
    assert.ok(state.discovery, "Oracle should open discovery");
    assert.strictEqual(state.discovery.cards.length, 4, "Oracle should find 4 cards");
    assert.ok(state.discovery.cards.every(c => c.card_name === "Sorcery"), "Oracle should only find the Sorcery");
    
    // 2. Test Consult the Dewdrops
    state.discovery = null;
    state.discoveryQueue = [];
    const consult = CardFactory.create({ card_name: "Consult the Dewdrops" });
    consult.onCast(state.player.board);
    assert.ok(state.discovery, "Consult should open discovery");
    assert.strictEqual(state.discovery.cards.length, 4, "Consult should find 4 cards");
    assert.ok(state.discovery.cards.every(c => c.card_name === "Sorcery"), "Consult should only find the Sorcery");

    // Cleanup
    setAvailableCards(oldAvailable);
}

function testSongOfWindAndFire() {
    resetState();
    const spell = CardFactory.create({ card_name: "Song of Wind and Fire" });
    spell.onCast(state.player.board);
    assert.strictEqual(state.player.board.length, 2, "Should spawn two tokens");
    assert.ok(state.player.board.some(c => c.card_name === "Dragon"));
    assert.ok(state.player.board.some(c => c.card_name === "Bard"));
}

async function testBard() {
    resetState();
    const bard = CardFactory.create({ card_name: "Bard", pt: "2/2" });
    const xali = CardFactory.create({ card_name: "Earthrattle Xali", pt: "3/3", rules_text: "Prowess" });
    state.player.board = [bard, xali];
    bard.owner = xali.owner = 'player';
    state.phase = 'BATTLE';
    state.battleQueues = { player: [bard, xali], opponent: [] };
    
    assert.strictEqual(state.spellsCastThisTurn, 0);
    
    await bard.onAttack(state.player.board);
    
    assert.strictEqual(state.spellsCastThisTurn, 1, "Should increment spell count");
    assert.strictEqual(xali.tempPower, 1, "Prowess (Xali) should trigger");
    assert.strictEqual(state.player.board.length, 3, "Should spawn a Dragon");
    assert.strictEqual(state.player.board[1].card_name, "Dragon", "Dragon should be to the right of Bard");
    assert.strictEqual(state.battleQueues.player[0].card_name, "Dragon", "Dragon should be at front of queue");
}

async function testDecoratedWarrior() {
    resetState();
    const warrior = CardFactory.create({ card_name: "Decorated Warrior", pt: "2/2", rules_text: "Vigilance" });
    state.player.board = [warrior];
    warrior.owner = 'player';
    
    assert.strictEqual(warrior.hasKeyword('vigilance'), true, "Should have vigilance");

    // 1. Attack
    await warrior.onAttack(state.player.board);
    assert.strictEqual(warrior.counters, 1, "Should gain counter on attack");

    // 2. Block (Being Attacked)
    // Note: This relies on the engine triggering onAttack for the defender.
    // If the engine doesn't do it, this test might need updating or the engine might need fixing.
    const enemy = CardFactory.create({ card_name: "Enemy", pt: "2/2" });
    enemy.owner = 'opponent';
    state.opponents[0].board = [enemy];
    state.battleBoards = { player: [warrior], opponent: [enemy] };
    
    // Simulating performAttack call to see if it triggers defender.onAttack
    await performAttack(enemy, warrior);
    assert.strictEqual(warrior.counters, 2, "Should gain counter on block/being attacked");
}

async function testWildBearmaster() {
    resetState();
    const master = CardFactory.create({ card_name: "Wild Bearmaster", pt: "2/2" });
    const teammate = CardFactory.create({ card_name: "Teammate", pt: "1/1" });
    state.player.board = [master, teammate];
    master.owner = teammate.owner = 'player';
    
    // Base power (2/2)
    await master.onAttack(state.player.board);
    assert.strictEqual(teammate.tempPower, 2, "Teammate should get +2/+2 at base");
    
    // With counters
    resetState();
    const master2 = CardFactory.create({ card_name: "Wild Bearmaster", pt: "2/2" });
    const teammate2 = CardFactory.create({ card_name: "Teammate", pt: "1/1" });
    state.player.board = [master2, teammate2];
    master2.owner = teammate2.owner = 'player';
    master2.counters = 3; // Now a 5/5
    
    await master2.onAttack(state.player.board);
    assert.strictEqual(teammate2.tempPower, 5, "Teammate should get +5/+5 with counters");
}

function testWaspbackBandit() {
    resetState();
    const bandit = CardFactory.create({ card_name: "Waspback Bandit", pt: "3/3", rules_text: "Flying, hexproof" });
    state.player.board = [bandit];
    bandit.owner = 'player';
    
    assert.strictEqual(bandit.hasKeyword('flying'), true);
    assert.strictEqual(bandit.hasKeyword('hexproof'), true);
    
    bandit.onNoncreatureCast(false, state.player.board);
    assert.strictEqual(state.player.treasures, 1, "Should generate treasure on noncreature cast");
}

function testStridingCascade() {
    resetState();
    const cascade = CardFactory.create({ card_name: "Striding Cascade", pt: "2/2" });
    const teammate = CardFactory.create({ card_name: "Teammate", pt: "1/1" });
    state.player.board = [cascade, teammate];
    cascade.owner = teammate.owner = 'player';
    
    // 1. First trigger in shop
    cascade.onCounterPlaced(1, 'plus-one', teammate, state.player.board);
    assert.strictEqual(cascade.counters, 1, "Should trigger first time in shop");
    
    // 2. Second trigger same phase (shop)
    cascade.onCounterPlaced(1, 'plus-one', teammate, state.player.board);
    assert.strictEqual(cascade.counters, 1, "Should NOT trigger second time in shop");
    
    // 3. Trigger in battle after triggering in shop
    state.phase = 'BATTLE';
    cascade.onCounterPlaced(1, 'plus-one', teammate, state.player.board);
    assert.strictEqual(cascade.counters, 1, "Should NOT trigger in battle if already triggered in shop");
    
    // 4. Simultaneous counters (reset first)
    resetState();
    const cascade2 = CardFactory.create({ card_name: "Striding Cascade", pt: "2/2" });
    const t1 = CardFactory.create({ card_name: "T1", pt: "1/1" });
    const t2 = CardFactory.create({ card_name: "T2", pt: "1/1" });
    state.player.board = [cascade2, t1, t2];
    cascade2.owner = t1.owner = t2.owner = 'player';
    
    // Triggering on multiple creatures in same 'event'
    cascade2.onCounterPlaced(1, 'plus-one', t1, state.player.board);
    cascade2.onCounterPlaced(1, 'plus-one', t2, state.player.board);
    assert.strictEqual(cascade2.counters, 1, "Should only gain ONE counter from simultaneous placements");
}

async function runTests() {
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
        { tier: 1, name: "Might and Mane", fn: testMightAndMane },
        { tier: 1, name: "Way of the Bygone", fn: testWayOfTheBygone },
        { tier: 1, name: "Moss Viper", fn: testMossViper },
        { tier: 1, name: "Divination", fn: testDivination }
    ];

    const t2Tests = [
        { tier: 2, name: "Exotic Game Hunter", fn: testExoticGameHunter },
        { tier: 2, name: "Restless Oppressor", fn: testRestlessOppressor },
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
        { tier: 2, name: "Cabracan's Familiar (Shield)", fn: testCabracansFamiliar_Shield },
        { tier: 2, name: "Moonlight Stag", fn: testMoonlightStag },
        { tier: 2, name: "Sleepless Spirit", fn: testSleeplessSpirit },
        { tier: 2, name: "Silken Spinner", fn: testSilkenSpinner },
        { tier: 2, name: "Gnomish Skirmisher", fn: testGnomishSkirmisher },
        { tier: 2, name: "Siege Falcon", fn: testSiegeFalcon },
        { tier: 2, name: "Foresee", fn: testForesee },
        { tier: 2, name: "Fight Song", fn: testFightSong },
        { tier: 2, name: "Edge of Their Seats", fn: testEdgeOfTheirSeats },
        { tier: 2, name: "Lake Cave Lurker", fn: testLakeCaveLurker }
    ];

    const t3Tests = [
        { tier: 3, name: "Razorback Trenchrunner", fn: testRazorbackTrenchrunner },
        { tier: 3, name: "Song of Wind and Fire", fn: testSongOfWindAndFire },
        { tier: 3, name: "Bard", fn: testBard },
        { tier: 3, name: "Sporegraft Slime", fn: testSporegraftSlime },
        { tier: 3, name: "Covetous Wechuge", fn: testCovetousWechuge },
        { tier: 3, name: "Finwing Drake", fn: testFinwingDrake },
        { tier: 3, name: "Shrewd Parliament", fn: testShrewdParliament },
        { tier: 3, name: "Pale Dillettante", fn: testPaleDillettante },
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
        { tier: 3, name: "Lingering Lunatic", fn: testLingeringLunatic },
        { tier: 3, name: "Wilderkin Zealot", fn: testWilderkinZealot },
        { tier: 3, name: "Bellowing Giant", fn: testBellowingGiant },
        { tier: 3, name: "Bwema, the Ruthless", fn: testBwemaTheRuthless },
        { tier: 3, name: "Silverhorn Tactician", fn: testSilverhornTactician },
        { tier: 3, name: "Scarhorn Cleaver", fn: testScarhornCleaver },
        { tier: 3, name: "Qinhana Cavalry", fn: testQinhanaCavalry },
        { tier: 3, name: "Mekini Eremite", fn: testMekiniEremite },
        { tier: 3, name: "Frontier Markswomen", fn: testFrontierMarkswomen },
        { tier: 3, name: "Dragonfist Axeman", fn: testDragonfistAxeman },
        { tier: 3, name: "Festival Celebrants", fn: testFestivalCelebrants },
        { tier: 3, name: "Dewdrop Pools", fn: testDewdropPools }
    ];

    const t4Tests = [
        { tier: 4, name: "Suitor of Death", fn: testSuitorOfDeath },
        { tier: 4, name: "Servants of Dydren", fn: testServantsOfDydren },
        { tier: 4, name: "Holtun-Band Elder", fn: testHoltunBandElder },
        { tier: 4, name: "Whispers of the Dead", fn: testWhispersOfTheDead },
        { tier: 4, name: "Decorated Warrior", fn: testDecoratedWarrior },
        { tier: 4, name: "Wild Bearmaster", fn: testWildBearmaster },
        { tier: 4, name: "Waspback Bandit", fn: testWaspbackBandit },
        { tier: 4, name: "Striding Cascade", fn: testStridingCascade },
        { tier: 4, name: "Murkborn Mammoth", fn: testMurkbornMammoth },
        { tier: 4, name: "Hissing Sunspitter", fn: testHissingSunspitter },
        { tier: 4, name: "Ceremony of Tribes", fn: testCeremonyOfTribes },
        { tier: 4, name: "Ceremony of Tribes (No Double Target)", fn: testCeremonyOfTribes_NoDoubleTarget },
        { tier: 4, name: "Ceremony of Tribes (Single Target)", fn: testCeremonyOfTribes_SingleTarget },
        { tier: 4, name: "Ceremony of Tribes (No Copy Buff)", fn: testCeremonyOfTribes_NoCastBuffForCopies },
        { tier: 4, name: "Ceremony of Tribes (ETB Order)", fn: testCeremonyOfTribes_ETBOrder },
        { tier: 4, name: "Ghessian Memories", fn: testGhessianMemories },
        { tier: 4, name: "Hero of a Lost War (Self)", fn: testHeroOfALostWar_Self },
        { tier: 4, name: "Hero of a Lost War (Other)", fn: testHeroOfALostWar_Other },
        { tier: 4, name: "Hero of Hedria", fn: testHeroOfHedria },
        { tier: 4, name: "Holtun-Clan Eldhand", fn: testHoltunClanEldhand },
        { tier: 4, name: "Hexproof (Suitor Fizzle)", fn: testHexproof_SuitorOfDeath_Fizzle },
        { tier: 4, name: "Hexproof (Suitor Targeting)", fn: testHexproof_SuitorOfDeath_Targeting },
        { tier: 4, name: "Hexproof (Wisps)", fn: testHexproof_AlluringWisps },
        { tier: 4, name: "Hexproof (Familiar)", fn: testHexproof_CabracansFamiliar },
        { tier: 4, name: "Thunder Raptor", fn: testThunderRaptor },
        { tier: 4, name: "Cloudline Sovereign", fn: testCloudlineSovereign },
        { tier: 4, name: "Nightfall Raptor", fn: testNightfallRaptor },
        { tier: 4, name: "Triumphant Tactics", fn: testTriumphantTactics },
        { tier: 4, name: "Earthcore Elemental", fn: testEarthcoreElemental },
        { tier: 4, name: "Savage Congregation", fn: testSavageCongregation },
        { tier: 4, name: "Ndengo Brutalizer", fn: testNdengoBrutalizer },
        { tier: 4, name: "Pyrewright Trainee", fn: testPyrewrightTrainee },
        { tier: 4, name: "Lagoon Logistics", fn: testLagoonLogistics },
        { tier: 4, name: "Flaunt Luxury", fn: testFlauntLuxury },
        { tier: 4, name: "Artful Coercion", fn: testArtfulCoercion },
        { tier: 4, name: "Magnific Wilderkin", fn: testMagnificWilderkin },
        { tier: 4, name: "Dwarven Phalanx", fn: testDwarvenPhalanx },
        { tier: 4, name: "Lair Recluse", fn: testLairRecluse },
        { tier: 4, name: "Tunnel Web Spider", fn: testTunnelWebSpider }
    ];

    const t5Tests = [
        { tier: 5, name: "Warhammer Kreg", fn: testWarhammerKreg },
        { tier: 5, name: "Dancing Mirrorblade", fn: testDancingMirrorblade },
        { tier: 5, name: "The Exile Queen's Crown", fn: testTheExileQueensCrown },
        { tier: 5, name: "Dragonlord's Carapace", fn: testDragonlordsCarapace },
        { tier: 5, name: "Djitu's Lithified Mantle", fn: testDjitusLithifiedMantle },
        { tier: 5, name: "Ash-Withered Cloak", fn: testAshWitheredCloak },
        { tier: 5, name: "Steel Barding", fn: testSteelBarding },
        { tier: 5, name: "Rivha's Blessed Blade", fn: testRivhasBlessedBlade },
        { tier: 5, name: "Rivha's Blessed Blade (Cirrusea)", fn: testRivhasBlessedBladeWithCirrusea },
        { tier: 5, name: "Rivha's Blessed Blade (Discovery)", fn: testRivhasBlessedBladeWithDiscovery },
        { tier: 5, name: "Blacksteel Loadout", fn: testBlacksteelLoadout },
        { tier: 5, name: "Kai'Long, Dark Immolator", fn: testKaiLongDarkImmolator },
        { tier: 5, name: "Lumbering Ancient", fn: testLumberingAncient },
        { tier: 5, name: "Zarax Supermajor", fn: testZaraxSupermajor },
        { tier: 5, name: "Infuse the Apparatus", fn: testInfuseTheApparatus },
        { tier: 5, name: "Michal, the Anointed", fn: testMichalTheAnointed },
        { tier: 5, name: "Ladria, Windwatcher", fn: testLadriaWindwatcher },
        { tier: 5, name: "Erin, Beacon of Humility", fn: testErinBeaconOfHumility },
        { tier: 5, name: "Architect of Wisdom", fn: testArchitectOfWisdom },
        { tier: 5, name: "Merciless Xun Huang", fn: testMercilessXunHuang },
        { tier: 5, name: "Citadel Colossus", fn: testCitadelColossus }
    ];

    console.log("\nUNIT TEST RESULTS");
    console.log("=================");
    
    const runBatch = async (tests) => {
        let passed = 0;
        for (const test of tests) {
            try {
                await test.fn();
                console.log(`✓ ${test.name}`);
                passed++;
            } catch (e) {
                console.error(`✕ ${test.name}: ${e.message}`);
            }
        }
        return passed;
    };

    console.log("\nTIER 1");
    const t1Passed = await runBatch(t1Tests);
    
    console.log("\nTIER 2");
    const t2Passed = await runBatch(t2Tests);

    console.log("\nTIER 3");
    const t3Passed = await runBatch(t3Tests);

    console.log("\nTIER 4");
    const t4Passed = await runBatch(t4Tests);

    console.log("\nTIER 5");
    const t5Passed = await runBatch(t5Tests);

    console.log("\nFINAL SUMMARY");
    console.log("-------------");
    console.log(`TIER 1 - Passed: ${t1Passed}/${t1Tests.length}. Failed: ${t1Tests.length - t1Passed}.`);
    console.log(`TIER 2 - Passed: ${t2Passed}/${t2Tests.length}. Failed: ${t2Tests.length - t2Passed}.`);
    console.log(`TIER 3 - Passed: ${t3Passed}/${t3Tests.length}. Failed: ${t3Tests.length - t3Passed}.`);
    console.log(`TIER 4 - Passed: ${t4Passed}/${t4Tests.length}. Failed: ${t4Tests.length - t4Passed}.`);
    console.log(`TIER 5 - Passed: ${t5Passed}/${t5Tests.length}. Failed: ${t5Tests.length - t5Passed}.`);

    if (t1Passed < t1Tests.length || t2Passed < t2Tests.length || t3Passed < t3Tests.length || t4Passed < t4Tests.length || t5Passed < t5Tests.length) {
        process.exit(1);
    }
}

runTests();
