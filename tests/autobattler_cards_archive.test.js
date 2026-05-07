// Archived Coliseum card tests - Moved from tests/autobattler_cards.test.js

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

function testGoreSwine() {
    resetState();
    const swine = CardFactory.create({ card_name: "Gore Swine", pt: "4/1" });
    const stats = swine.getDisplayStats([]);
    assert.strictEqual(stats.p, 4);
    assert.strictEqual(stats.t, 1);
}

function testMossViper() {
    resetState();
    const viper = CardFactory.create({ card_name: "Moss Viper", rules_text: "Deathtouch" });
    assert.strictEqual(viper.hasKeyword('deathtouch'), true, "Viper should have deathtouch");
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

function testSleeplessSpirit() {
    resetState();
    const spirit = CardFactory.create({ card_name: "Sleepless Spirit", pt: "2/2", rules_text: "Flying, vigilance" });
    assert.strictEqual(spirit.hasKeyword('flying'), true);
    assert.strictEqual(spirit.hasKeyword('vigilance'), true);
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

function testHoltunClanEldhand() {
    resetState();
    const eldhand = CardFactory.create({ card_name: "Holtun-Clan Eldhand", pt: "3/6", rules_text: "Lifelink" });
    assert.strictEqual(eldhand.hasKeyword('lifelink'), true, "Should have Lifelink keyword");
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
