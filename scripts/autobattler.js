document.addEventListener('DOMContentLoaded', () => {
    // --- OO CARD SYSTEM ---

    class BaseCard {
        constructor(data) {
            Object.assign(this, data);
            this.id = this.id || `card-${Math.random().toString(36).substr(2, 9)}`;
            this.counters = Number(this.counters) || 0;
            this.damageTaken = Number(this.damageTaken) || 0;
            this.enchantments = this.enchantments || [];
            this.tempPower = Number(this.tempPower) || 0;
            this.tempToughness = Number(this.tempToughness) || 0;
            this.isLockedByChivalry = this.isLockedByChivalry || false;
        }

        // Returns base power/toughness from the 'pt' string
        getBasePT() {
            if (!this.pt) return { p: 0, t: 0 };
            const parts = this.pt.split('/');
            return { p: parseInt(parts[0]) || 0, t: parseInt(parts[1]) || 0 };
        }

        // The "Stable" stats: Base + Counters + Enchantments + Temp (Start of Combat)
        getStableStats() {
            const base = this.getBasePT();
            let p = (base.p || 0) + (this.counters || 0);
            let t = (base.t || 0) + (this.counters || 0);
            let maxT = t;

            if (this.enchantments) {
                this.enchantments.forEach(e => {
                    if (e.card_name === "Faith in Darkness") { p += 2; t += 2; maxT += 2; }
                    if (e.card_name === "To Battle") { p += 2; }
                });
            }

            p += (this.tempPower || 0);
            t += (this.tempToughness || 0);
            maxT += (this.tempToughness || 0);

            return { p, t: t - (this.damageTaken || 0), maxT };
        }

        // The "Final" stats: Stable + Dynamic Passives (Raven, Dowager, etc.)
        getDisplayStats(board) {
            const stable = this.getStableStats();
            const dynamic = this.getDynamicBuffs(board);
            return {
                p: stable.p + dynamic.p,
                t: stable.t + dynamic.t,
                maxT: stable.maxT + dynamic.t
            };
        }

        // Hook for dynamic board-state-based buffs (Raven, Dowager)
        getDynamicBuffs(board) {
            return { p: 0, t: 0 };
        }

        // Hook for ETB effects
        onETB(board) { }

        // Hook for Combat Start triggers (Ferocious, Chivalry)
        onCombatStart(board) { }

        // Hook for noncreature spells being cast
        onNoncreatureCast(isFoilCast, board) { }

        hasKeyword(keyword) {
            return this.rules_text?.toLowerCase().includes(keyword.toLowerCase());
        }

        clone() {
            const newCard = CardFactory.create(this);
            newCard.counters = this.counters;
            newCard.isFoil = this.isFoil;
            newCard.enchantments = [...this.enchantments];
            return newCard;
        }
    }

    // --- Specialized Card Subclasses ---

    class SoulsmokeAdept extends BaseCard {
        getDynamicBuffs(board) {
            return (this.counters > 0) ? { p: 1, t: 0 } : { p: 0, t: 0 };
        }
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'lifelink') return this.counters > 0;
            return super.hasKeyword(keyword);
        }
    }

    class GlumvaleRaven extends BaseCard {
        getDynamicBuffs(board) {
            const hasOtherFlyer = board?.some(c => c.id !== this.id && c.hasKeyword('Flying'));
            return hasOtherFlyer ? { p: 1, t: 0 } : { p: 0, t: 0 };
        }
    }

    class WarClanDowager extends BaseCard {
        getDynamicBuffs(board) {
            const hasOtherCentaur = board?.some(c => c.id !== this.id && c.type?.includes('Centaur'));
            return hasOtherCentaur ? { p: 1, t: 1 } : { p: 0, t: 0 };
        }
    }

    class SparringCampaigner extends BaseCard {
        onCombatStart(board) {
            const idx = board.indexOf(this);
            const right = (idx !== -1 && idx < board.length - 1) ? board[idx + 1] : null;
            if (right) {
                const baseP = right.getBasePT().p;
                if (baseP < 2) {
                    const multiplier = this.isFoil ? 2 : 1;
                    right.tempPower += (2 * multiplier);
                    right.tempToughness += (2 * multiplier);
                    this.isLockedByChivalry = true;
                }
            }
        }
    }

    class ImpressibleCub extends BaseCard {
        onCombatStart(board) {
            const hasStrong = board.some(c => c.getDisplayStats(board).p >= 4);
            if (hasStrong) {
                const multiplier = this.isFoil ? 2 : 1;
                this.tempPower += (1 * multiplier);
                this.tempToughness += (1 * multiplier);
            }
        }
    }

    class ClairvoyantKoi extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += (1 * multiplier);
            this.tempToughness += (1 * multiplier);
        }
    }

    class BlisteringLunatic extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += (2 * multiplier);
        }
    }

    class ApprenticeLancer extends BaseCard {
        onETB(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const hasCentaur = board.some(c => c !== this && c.type?.includes('Centaur'));
            if (hasCentaur) this.counters += (1 * multiplier);
        }
    }

    class DutifulCamel extends BaseCard {
        onETB(board) {
            // This triggers a UI targeting phase
            state.targetingEffect = { 
                sourceId: this.id, 
                effect: 'dutiful_camel_counter', 
                isDouble: this.isFoil 
            };
        }
    }

    const CardFactory = {
        create(data) {
            switch(data.card_name) {
                case 'Soulsmoke Adept': return new SoulsmokeAdept(data);
                case 'Glumvale Raven': return new GlumvaleRaven(data);
                case 'War-Clan Dowager': return new WarClanDowager(data);
                case 'Sparring Campaigner': return new SparringCampaigner(data);
                case 'Impressible Cub': return new ImpressibleCub(data);
                case 'Clairvoyant Koi': return new ClairvoyantKoi(data);
                case 'Blistering Lunatic': return new BlisteringLunatic(data);
                case 'Apprentice Lancer': return new ApprenticeLancer(data);
                case 'Dutiful Camel': return new DutifulCamel(data);
                default: return new BaseCard(data);
            }
        }
    };

    // --- GAME STATE ---
    let state = {
        player: {
            overallHp: 20,
            fightHp: 10,
            gold: 3,
            tier: 1,
            tierCostReduction: 0,
            hand: [],
            board: [],
            treasures: 0
        },
        opponents: [
            { id: 0, name: "Marketto", avatar: "sets/SHF-files/img/60.png", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [] },
            { id: 1, name: "Huitzil", avatar: "sets/ICH-files/img/62_Huitzil Skywatch.jpg", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [] },
            { id: 2, name: "Raven", avatar: "sets/TWB-files/img/19_Glumvale Raven.jpg", overallHp: 20, fightHp: 10, gold: 3, tier: 1, board: [] }
        ],
        currentOpponentId: 0,
        shop: {
            cards: []
        },
        turn: 1,
        phase: 'SHOP', // SHOP | BATTLE
        castingSpell: null,
        targetingEffect: null,
        scrying: null,
        nextShopBonusCards: [],
        battleBoards: null
    };

    function getOpponent() {
        return state.opponents[state.currentOpponentId];
    }

    let availableCards = [];
    const handLimit = 7;
    const boardLimit = 7;

    // DOM Elements
    const playerBoardEl = document.getElementById('player-board');
    const playerHandEl = document.getElementById('player-hand');
    const shopEl = document.getElementById('shop');
    const rerollBtn = document.getElementById('reroll-btn');
    const freezeBtn = document.getElementById('freeze-btn');
    const tierUpBtn = document.getElementById('tier-up-btn');
    const tierStarsEl = document.getElementById('tier-stars');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const cardTemplate = document.getElementById('card-template');

    // Stats and labels
    const playerHpEl = () => document.getElementById('player-hp');
    const playerFightHpEl = () => document.getElementById('player-fight-hp');
    const playerGoldEl = () => document.getElementById('player-gold');

    // Initialization
    async function init() {
        if (tierUpBtn) tierUpBtn.addEventListener('click', tierUp);
        if (freezeBtn) {
            freezeBtn.addEventListener('click', () => {
                state.shop.frozen = !state.shop.frozen;
                freezeBtn.classList.toggle('frozen', state.shop.frozen);
                const img = document.getElementById('freeze-img');
                if (img) {
                    img.src = state.shop.frozen ? 'img/locked.png' : 'img/unlocked.png';
                }
            });
        }
        updateTierButton();

        try {
            const response = await fetch('lists/autobattler-cards.json');
            const cardData = await response.json();
            availableCards = cardData.cards; 
            console.log("Auto-battler card data loaded successfully.", availableCards.length);
        } catch (error) {
            console.error("Error loading auto-battler card data:", error);
            shopEl.innerHTML = '<p style="color: red;">Error: Could not load card data. Is `lists/autobattler-cards.json` generated?</p>';
            return;
        }
        
        startShopTurn();
    }

    const tierCosts = [0, 5, 7, 9, 11]; // Base costs for 2, 3, 4, 5

    function updateTierButton() {
        const tierContainer = document.getElementById('tier-container');
        if (!tierUpBtn || !tierStarsEl || !tierContainer) return;
        
        // Update Stars
        tierStarsEl.innerHTML = '';
        for (let i = 0; i < state.player.tier; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.textContent = '★';
            tierStarsEl.appendChild(star);
        }

        if (state.player.tier >= 5) {
            tierUpBtn.style.opacity = "0.5";
            tierUpBtn.style.cursor = "default";
            tierUpBtn.disabled = true;
            tierContainer.setAttribute('data-cost', ""); // Hides pseudo-element via CSS
            return;
        }

        const baseCost = tierCosts[state.player.tier]; // Next tier's cost
        const currentCost = Math.max(0, baseCost - state.player.tierCostReduction);
        tierContainer.setAttribute('data-cost', currentCost);

        if (state.player.gold < currentCost) {
            tierUpBtn.style.background = "#555"; 
            tierUpBtn.style.cursor = "not-allowed";
        } else {
            tierUpBtn.style.background = "#ff5722"; 
            tierUpBtn.style.cursor = "pointer";
        }
    }

    function tierUp() {
        const nextTier = state.player.tier + 1;
        if (nextTier > 5) return;
        const baseCost = tierCosts[state.player.tier];
        const currentCost = Math.max(0, baseCost - state.player.tierCostReduction);

        if (state.player.gold >= currentCost) {
            state.player.gold -= currentCost;
            state.player.tier = nextTier;
            state.player.tierCostReduction = 0; // Reset on upgrade
            updateTierButton();
            render();
        }
    }

    // Game Loop
    function startShopTurn() {
        state.phase = 'SHOP';

        // Tier cost reduction: goes down by 1 each turn (EXCEPT turn 1)
        if (state.player.tier < 5 && state.turn > 1) {
            state.player.tierCostReduction++;
        }

        const turnBaseGold = Math.min(2 + state.turn, 10);
        state.player.gold = turnBaseGold + state.player.treasures;

        // TESTING OVERRIDE: 100 gold on Turn 1
        if (state.turn === 1) state.player.gold = 100;

        if (state.player.treasures > 0) {

            console.log(`Adding ${state.player.treasures} gold from treasures.`);
            state.player.treasures = 0;
        }

        populateShop();
        render();
    }
    
    // Legacy functions removed in favor of OO methods


    async function startBattleTurn() {
        state.phase = 'BATTLE';
        endTurnBtn.disabled = true;
        rerollBtn.disabled = true;
        
        // AI Phase: ALL opponents play their hidden turns
        state.opponents.forEach(opp => opponentPlayTurn(opp));

        // Off-screen battle simulation
        const offScreenOpp1 = state.opponents[(state.currentOpponentId + 1) % 3];
        const offScreenOpp2 = state.opponents[(state.currentOpponentId + 2) % 3];
        simulateAIShopBattle(offScreenOpp1, offScreenOpp2);

        const currentOpp = getOpponent();

        // 1. Ensure all cards are instances and run combat start hooks
        state.player.board = state.player.board.map(c => (c instanceof BaseCard ? c : CardFactory.create(c)));
        currentOpp.board = currentOpp.board.map(c => (c instanceof BaseCard ? c : CardFactory.create(c)));

        state.player.board.forEach(c => c.onCombatStart(state.player.board));
        currentOpp.board.forEach(c => c.onCombatStart(currentOpp.board));

        state.player.fightHp = 5 + (5 * state.player.tier);
        currentOpp.fightHp = 5 + (5 * currentOpp.tier);
        
        // Update UI for the current opponent
        const oppAvatarImgs = document.querySelectorAll('#opponent-zone .avatar-img, #shop-zone .avatar-img');
        oppAvatarImgs.forEach(img => img.src = currentOpp.avatar);

        // 2. Create Combat Snapshots
        const createBattleInstance = (card, owner) => {
            const instance = (card instanceof BaseCard ? card : CardFactory.create(card)).clone();
            instance.owner = owner;
            return instance;
        };

        state.battleBoards = {
            player: state.player.board.map(c => createBattleInstance(c, 'player')),
            opponent: currentOpp.board.map(c => createBattleInstance(c, 'opponent'))
        };
        
        render(); 
        console.log("Battle Begins!");
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        const performAttack = async (attacker, defender, isFirstStrike = false) => {
            const attackerBoard = (attacker.owner === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
            const attackerStats = attacker.getDisplayStats(attackerBoard);
            const damageDealt = attackerStats.p;
            
            const attackerEl = document.getElementById(`card-${attacker.id}`);
            if (!attackerEl) return;

            let deltaX = 0, deltaY = 0;

            if (defender) {
                const defenderEl = document.getElementById(`card-${defender.id}`);
                const rectA = attackerEl.getBoundingClientRect();
                const rectB = defenderEl.getBoundingClientRect();
                deltaX = (rectB.left + rectB.width/2) - (rectA.left + rectA.width/2);
                deltaY = (rectB.top + rectB.height/2) - (rectA.top + rectA.height/2);
            } else {
                const oppArea = document.getElementById(attacker.owner === 'player' ? 'opponent-zone' : 'player-zone');
                const rectA = attackerEl.getBoundingClientRect();
                const rectB = oppArea.getBoundingClientRect();
                deltaX = (rectB.left + rectB.width/2) - (rectA.left + rectA.width/2);
                deltaY = (rectB.top + rectB.height/2) - (rectA.top + rectA.height/2);
            }

            attackerEl.classList.add('attacking');
            
            // Phase 1: Wind up (Lift and scale)
            attackerEl.style.transition = "transform 0.45s ease-out";
            attackerEl.style.zIndex = "2000";
            attackerEl.style.transform = "scale(1.2) translateY(-15px)";
            await new Promise(r => setTimeout(r, 450));

            // Phase 2: Attack Strike (FASTER movement)
            attackerEl.style.transition = "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)";
            attackerEl.style.transform = `translate(${deltaX * 0.6}px, ${deltaY * 0.6}px) scale(1.3)`;
            await new Promise(r => setTimeout(r, 180));

            // Phase 3: Impact calculations
            let defenderDamageTaken = damageDealt;
            let attackerDamageTaken = 0;
            const currentOppAttack = getOpponent();

            if (defender) {
                defender.damageTaken += damageDealt;
                
                if (attacker.hasKeyword('Lifelink')) {
                    if (attacker.owner === 'player') state.player.fightHp += damageDealt;
                    else if (currentOppAttack) currentOppAttack.fightHp += damageDealt;
                }

                if (!isFirstStrike) {
                    const defenderBoard = (attacker.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    const defenderStats = defender.getDisplayStats(defenderBoard);
                    attackerDamageTaken = defenderStats.p;
                    attacker.damageTaken += attackerDamageTaken;
                }
            } else {
                 if (attacker.owner === 'player') {
                    if (currentOppAttack) currentOppAttack.fightHp -= damageDealt;
                 } else state.player.fightHp -= damageDealt;
            }

            render(); 
            
            // SHOW BUBBLES AND SHAKE AFTER RENDER
            if (defender) {
                const newDefenderEl = document.getElementById(`card-${defender.id}`);
                if (newDefenderEl) {
                    newDefenderEl.classList.add('shake');
                    setTimeout(() => newDefenderEl.classList.remove('shake'), 300);
                    showDamageBubble(newDefenderEl, defenderDamageTaken);
                }
            } else {
                const avatarId = attacker.owner === 'player' ? 'opponent-battle-avatar' : 'player-avatar';
                const avatarEl = document.getElementById(avatarId);
                showDamageBubble(avatarEl, defenderDamageTaken);
            }

            // AFTER RENDER: Re-fetch the attacker and restore its position
            const currentAttackerEl = document.getElementById(`card-${attacker.id}`);
            if (currentAttackerEl) {
                currentAttackerEl.style.transition = "none";
                currentAttackerEl.style.zIndex = "2000";
                currentAttackerEl.style.transform = `translate(${deltaX * 0.6}px, ${deltaY * 0.6}px) scale(1.3)`;
                currentAttackerEl.classList.add('attacking');
                
                if (attackerDamageTaken > 0) {
                    showDamageBubble(currentAttackerEl, attackerDamageTaken);
                }

                currentAttackerEl.offsetHeight; // Force reflow

                // Phase 4: Combined Speed Return & Shrink Settle (FASTER movement)
                currentAttackerEl.style.transition = "transform 0.22s ease-in-out";
                currentAttackerEl.style.transform = "translate(0, 0) scale(1)";
                
                await new Promise(r => setTimeout(r, 220));
                
                // Cleanup
                currentAttackerEl.style.transition = "";
                currentAttackerEl.style.zIndex = "";
                currentAttackerEl.classList.remove('attacking');
            }
        };

        function showDamageBubble(targetEl, amount) {
            if (!targetEl || amount <= 0) return;
            const cabinet = document.getElementById('game-cabinet');
            if (!cabinet) return;

            const bubble = document.createElement('div');
            bubble.className = 'damage-bubble';
            bubble.textContent = `-${amount}`;
            cabinet.appendChild(bubble);

            // Internal 1600x900 coordinates
            // We use getBoundingClientRect relative to cabinet rect to get the internal placement
            const startTime = Date.now();
            const duration = 1200;

            function updateBubblePosition() {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    bubble.remove();
                    return;
                }

                const rect = targetEl.getBoundingClientRect();
                const cabRect = cabinet.getBoundingClientRect();
                
                // Extract the scale factor from the cabinet's transform matrix
                const style = window.getComputedStyle(cabinet);
                const matrix = new WebKitCSSMatrix(style.transform);
                const currentScale = matrix.a || 1;

                // Viewport distance / scale = internal 1600x900 coordinate
                const x = ((rect.left + rect.width / 2) - cabRect.left) / currentScale;
                const y = ((rect.top + rect.height / 2) - cabRect.top) / currentScale;

                bubble.style.left = `${x}px`;
                bubble.style.top = `${y}px`;

                requestAnimationFrame(updateBubblePosition);
            }

            requestAnimationFrame(updateBubblePosition);
        }

        const createToken = (tokenName, owner) => {
            const tokenData = availableCards.find(c => c.card_name === tokenName && c.shape === 'token');
            if (tokenData) {
                const token = CardFactory.create(tokenData);
                token.id = `token-${Math.random()}`;
                token.owner = owner;
                if (tokenName === 'Construct') token.pt = "2/2";
                return token;
            }
            return null;
        };

        const resolveDeaths = async () => {
            const deadPlayerCards = state.battleBoards.player.filter(c => c.getDisplayStats(state.battleBoards.player).t <= 0);
            const deadOpponentCards = state.battleBoards.opponent.filter(c => c.getDisplayStats(state.battleBoards.opponent).t <= 0);

            if (deadPlayerCards.length === 0 && deadOpponentCards.length === 0) return;

            deadPlayerCards.concat(deadOpponentCards).forEach(c => document.getElementById(`card-${c.id}`)?.classList.add('dying'));
            await new Promise(r => setTimeout(r, 500)); 

            deadPlayerCards.forEach(deadCard => {
                const idx = state.battleBoards.player.indexOf(deadCard);
                if (idx === -1) return;

                const hasResurrection = deadCard.enchantments && deadCard.enchantments.some(e => e.card_name === 'By Blood and Venom');
                const isCarcass = deadCard.card_name === 'Rotten Carcass';
                let spawns = [];
                if (hasResurrection) {
                    const rawData = availableCards.find(c => c.card_name === deadCard.card_name && c.set === deadCard.set);
                    if (rawData) {
                        const spawned = CardFactory.create(rawData);
                        spawned.id = `returned-${Math.random()}`;
                        spawned.owner = 'player';
                        spawns.push(spawned);
                    }
                }
                if (isCarcass) spawns.push(createToken('Construct', 'player'));
                
                if (spawns.length > 0) state.battleBoards.player.splice(idx, 1, ...spawns.filter(Boolean));
                else state.battleBoards.player.splice(idx, 1);
                
                if (deadCard.card_name === 'Leech-Ridden Corpse') state.player.fightHp += 1;
                if (deadCard.card_name === 'Lake Cave Lurker') state.player.treasures += 1;
            });

            deadOpponentCards.forEach(deadCard => {
                const idx = state.battleBoards.opponent.indexOf(deadCard);
                if (idx > -1) {
                    if (deadCard.card_name === 'Rotten Carcass') {
                        state.battleBoards.opponent.splice(idx, 1, createToken('Construct', 'opponent'));
                    } else state.battleBoards.opponent.splice(idx, 1);
                }
            });

            render();
            await new Promise(r => setTimeout(r, 200)); 
        };

        const findTarget = (attacker, defendingBoard) => {
            if (attacker.hasKeyword('Flying')) {
                // Flying attackers priority 1: Defenders with Flying or Reach
                const airDefenders = defendingBoard.filter(c => c.hasKeyword('Defender') && (c.hasKeyword('Flying') || c.hasKeyword('Reach')));
                if (airDefenders.length > 0) return airDefenders[Math.floor(Math.random() * airDefenders.length)];
                
                // Flying attackers priority 2: ANY creature with Flying or Reach
                const airCreatures = defendingBoard.filter(c => c.hasKeyword('Flying') || c.hasKeyword('Reach'));
                if (airCreatures.length > 0) return airCreatures[Math.floor(Math.random() * airCreatures.length)];

                // Otherwise, they bypass ground creatures and attack FACE directly
                return null;
            } else { 
                // Ground attackers priority 1: ANY Defender (Taunt) first
                const tauntDefenders = defendingBoard.filter(c => c.hasKeyword('Defender'));
                if (tauntDefenders.length > 0) return tauntDefenders[Math.floor(Math.random() * tauntDefenders.length)];
                
                // Ground attackers priority 2: Ground creatures
                const groundCreatures = defendingBoard.filter(c => !c.hasKeyword('Flying'));
                if (groundCreatures.length > 0) return groundCreatures[Math.floor(Math.random() * groundCreatures.length)];
                
                // Ground attackers priority 3: Flying creatures (if only option)
                if (defendingBoard.length > 0) return defendingBoard[Math.floor(Math.random() * defendingBoard.length)];
                
                return null; // Face
            }
        };

        const executeCombatPhase = async (isFirstStrike) => {
            const currentOppCombat = getOpponent();
            if (!currentOppCombat) return;

            let pIdx = 0;
            let oIdx = 0;
            let playerTurn = true; 

            // COMBAT PERSISTENCE: Loop until someone is dead
            while (state.player.fightHp > 0 && currentOppCombat.fightHp > 0) {
                const getValidForPhase = (board) => board.filter(c => {
                    const isValidPhase = isFirstStrike ? c.hasKeyword('First strike') : !c.hasKeyword('First strike');
                    return isValidPhase && !c.hasKeyword('Defender') && !c.isLockedByChivalry;
                });

                let pValid = getValidForPhase(state.battleBoards.player);
                let oValid = getValidForPhase(state.battleBoards.opponent);

                // If BOTH sides have literally NO attackers for this phase, battle is over
                if (pValid.length === 0 && oValid.length === 0) break;

                // Find next candidates using independent pointers
                let pNext = (pValid.length > 0) ? pValid[pIdx % pValid.length] : null;
                let oNext = (oValid.length > 0) ? oValid[oIdx % oValid.length] : null;

                if (!pNext && !oNext) break;

                let attacker = null;
                // HASTE LOGIC: Check both next candidates. If only one has haste, it attacks first.
                if (pNext && oNext) {
                    if (pNext.hasKeyword('Haste') && !oNext.hasKeyword('Haste')) attacker = pNext;
                    else if (oNext.hasKeyword('Haste') && !pNext.hasKeyword('Haste')) attacker = oNext;
                    else attacker = playerTurn ? pNext : oNext;
                } else attacker = pNext || oNext;

                const isPlayerAction = (attacker.owner === 'player');
                const defenderBoard = isPlayerAction ? state.battleBoards.opponent : state.battleBoards.player;
                const defender = findTarget(attacker, defenderBoard);
                
                await performAttack(attacker, defender, isFirstStrike);
                await resolveDeaths();

                // Increment the specific pointer for whoever just acted
                if (isPlayerAction) {
                    const newValid = getValidForPhase(state.battleBoards.player);
                    pIdx = newValid.length > 0 ? (newValid.indexOf(attacker) + 1) % newValid.length : 0;
                } else {
                    const newValid = getValidForPhase(state.battleBoards.opponent);
                    oIdx = newValid.length > 0 ? (newValid.indexOf(attacker) + 1) % newValid.length : 0;
                }

                if (attacker === (playerTurn ? pNext : oNext)) playerTurn = !playerTurn;
            }
        };

        await executeCombatPhase(true);
        await executeCombatPhase(false);
        await new Promise(resolve => setTimeout(resolve, 500));

        let fightWinner = (currentOpp.fightHp <= 0 && state.player.fightHp > 0) ? 'player' : (state.player.fightHp <= 0 && currentOpp.fightHp > 0) ? 'opponent' : null;
        if (fightWinner === 'player') {
            currentOpp.overallHp -= state.player.tier;
            alert(`You won the fight! Opponent loses ${state.player.tier} HP.`);
        } else if (fightWinner === 'opponent') {
            state.player.overallHp -= currentOpp.tier;
            alert(`You lost the fight! You lose ${currentOpp.tier} HP.`);
        } else alert("The fight was a draw!");

        if (state.player.overallHp <= 0) {
            alert("Game Over! You lost.");
            document.location.reload();
            return; 
        }
        
        // Remove dead AI opponents from rotation or check for win
        state.opponents = state.opponents.filter(opp => opp.overallHp > 0);
        if (state.opponents.length === 0) {
            alert("Congratulations! You won the game!");
            document.location.reload();
            return;
        }

        // --- End of Combat Cleanup ---
        state.player.board.forEach(c => { 
            c.tempPower = 0; 
            c.tempToughness = 0; 
            c.isLockedByChivalry = false;
            c.damageTaken = 0;
            c.enchantments = []; 
        });
        state.opponents.forEach(opp => {
            opp.board.forEach(c => { 
                c.tempPower = 0; 
                c.tempToughness = 0; 
                c.isLockedByChivalry = false;
                c.damageTaken = 0;
                c.enchantments = []; 
            });
            opp.fightHp = 5 + (5 * opp.tier);
        });

        state.player.fightHp = 5 + (5 * state.player.tier);
        state.currentOpponentId = (state.currentOpponentId + 1) % state.opponents.length;
        state.battleBoards = null;
        state.turn++;
        endTurnBtn.disabled = false;
        rerollBtn.disabled = false;
        startShopTurn();
    }

    function simulateAIShopBattle(opp1, opp2) {
        if (!opp1 || !opp2) return;
        const s1 = opp1.board.reduce((acc, c) => {
            const instance = (c instanceof BaseCard) ? c : CardFactory.create(c);
            const stats = instance.getDisplayStats(opp1.board);
            return acc + stats.p + stats.t;
        }, 0);
        const s2 = opp2.board.reduce((acc, c) => {
            const instance = (c instanceof BaseCard) ? c : CardFactory.create(c);
            const stats = instance.getDisplayStats(opp2.board);
            return acc + stats.p + stats.t;
        }, 0);
        
        if (s1 > s2) opp2.overallHp -= opp1.tier;
        else if (s2 > s1) opp1.overallHp -= opp2.tier;
    }

    function populateShop() {
        if (state.shop.frozen) {
            state.shop.frozen = false;
            if (freezeBtn) freezeBtn.classList.remove('frozen');
            const img = document.getElementById('freeze-img');
            if (img) img.src = 'img/unlocked.png';
            
            // BACKFILL logic
            const targetCreatureCount = state.player.tier + 2;
            const currentCreatures = state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length;
            const creaturesToAdd = Math.max(0, targetCreatureCount - currentCreatures);
            
            const currentSpells = state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature')).length;
            const spellsToAdd = Math.max(0, 1 - currentSpells);

            const creaturePool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token');
            const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && c.shape !== 'token');

            for (let i = 0; i < creaturesToAdd; i++) {
                state.shop.cards.push(CardFactory.create(creaturePool[Math.floor(Math.random() * creaturePool.length)]));
            }
            for (let i = 0; i < spellsToAdd; i++) {
                state.shop.cards.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
            }
            return;
        }

        state.shop.cards = [];
        if (state.nextShopBonusCards.length > 0) {
            state.shop.cards.push(...state.nextShopBonusCards.map(c => CardFactory.create(c)));
            state.nextShopBonusCards = [];
        }

        const creatureCount = state.player.tier + 2;
        const creaturePool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token');
        const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && c.shape !== 'token');

        // Fill creatures
        const currentCreatures = state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length;
        for (let i = 0; i < (creatureCount - currentCreatures); i++) {
            state.shop.cards.push(CardFactory.create(creaturePool[Math.floor(Math.random() * creaturePool.length)]));
        }

        // Add 1 spell
        const currentSpells = state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature')).length;
        if (currentSpells < 1) {
            state.shop.cards.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
        }
    }

    function buyCard(cardId) {
        if (state.phase !== 'SHOP') return;
        const cardIndex = state.shop.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.shop.cards[cardIndex];
        const cost = card.type.toLowerCase().includes('creature') ? 3 : 1;
        if (state.player.gold < cost || state.player.hand.length >= handLimit) return;
        state.player.gold -= cost;
        state.player.hand.push(card);
        state.shop.cards.splice(cardIndex, 1);
        
        checkForTriples();
        render();
    }

    async function checkForTriples() {
        const counts = {};
        const allCreatures = [...state.player.hand, ...state.player.board].filter(c => c.type?.toLowerCase().includes('creature') && !c.isFoil);
        
        allCreatures.forEach(c => {
            counts[c.card_name] = (counts[c.card_name] || 0) + 1;
        });

        for (const name in counts) {
            if (counts[name] >= 3) {
                // 1. Identify copies
                const copies = [];
                [...state.player.hand, ...state.player.board].forEach(c => {
                    if (c.card_name === name && !c.isFoil && copies.length < 3) copies.push(c);
                });

                // 2. Visual Morph Effect
                copies.forEach(c => {
                    const el = document.getElementById(`card-${c.id}`);
                    if (el) el.classList.add('morphing');
                });

                await new Promise(r => setTimeout(r, 600));

                // 3. Consolidation Logic
                const finalCopies = [];
                for (let i = state.player.hand.length - 1; i >= 0; i--) {
                    if (state.player.hand[i].card_name === name && !state.player.hand[i].isFoil) {
                        finalCopies.push(state.player.hand.splice(i, 1)[0]);
                        if (finalCopies.length === 3) break;
                    }
                }
                if (finalCopies.length < 3) {
                    for (let i = state.player.board.length - 1; i >= 0; i--) {
                        if (state.player.board[i].card_name === name && !state.player.board[i].isFoil) {
                            finalCopies.push(state.player.board.splice(i, 1)[0]);
                            if (finalCopies.length === 3) break;
                        }
                    }
                }

                // 4. Create Foil Copy
                const foil = CardFactory.create(finalCopies[0]);
                foil.id = `foil-${Date.now()}-${Math.random()}`;
                foil.isFoil = true;
                const base = foil.getBasePT();
                foil.pt = `${(base.p || 0) * 2}/${(base.t || 0) * 2}`;
                foil.counters = finalCopies.reduce((sum, c) => sum + (Number(c.counters) || 0), 0);
                
                state.player.hand.push(foil);
                
                // Recurse
                checkForTriples();
                break;
            }
        }
        render();
    }

    function useCardFromHand(cardId, targetIndex = -1) {
        if (state.phase !== 'SHOP') return;
        const cardIndex = state.player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.player.hand[cardIndex];

        if (card.type.toLowerCase().includes('creature')) {
            if (state.player.board.length >= boardLimit) return;
            const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
            
            // Trigger 1 (Standard or First trigger of Foil)
            instance.onETB(state.player.board);
            // Trigger 2 if Foil
            if (instance.isFoil) instance.onETB(state.player.board);

            if (targetIndex !== -1) {
                state.player.board.splice(targetIndex, 0, instance);
            } else {
                state.player.board.push(instance);
            }
            
            state.player.hand.splice(cardIndex, 1);
        } else {
            if (['Divination', 'Scientific Inquiry'].includes(card.card_name)) {
                const times = card.isFoil ? 2 : 1;
                for(let i=0; i<times; i++) {
                    if (card.card_name === 'Divination') populateShop();
                    if (card.card_name === 'Scientific Inquiry') {
                        state.player.treasures++;
                        const creatures = availableCards.filter(c => c.type.toLowerCase().includes('creature') && c.shape !== 'token');
                        state.scrying = { count: 2, cards: [creatures[Math.floor(Math.random() * creatures.length)], creatures[Math.floor(Math.random() * creatures.length)]], choices: [] };
                    }
                }
                state.player.hand.splice(cardIndex, 1);
                state.player.board.forEach(c => c.onNoncreatureCast(card.isFoil, state.player.board));
            } else state.castingSpell = card;
        }
        render();
    }

    function applyTargetedEffect(targetId) {
        if (!state.targetingEffect) return;
        const target = state.player.board.find(c => c.id === targetId);
        if (target) {
            if (state.targetingEffect.effect === 'dutiful_camel_counter') {
                target.counters++;
                if (state.targetingEffect.isDouble) {
                    state.targetingEffect.isDouble = false;
                    // Stay in targeting mode
                } else {
                    state.targetingEffect = null;
                }
            }
        }
        render();
    }

    function reorderBoard(fromIndex, toIndex) {
        if (state.phase !== 'SHOP') return;
        const [moved] = state.player.board.splice(fromIndex, 1);
        state.player.board.splice(toIndex, 0, moved);
        render();
    }

    function applySpell(targetId) {
        if (!state.castingSpell) return;
        const target = state.player.board.find(c => c.id === targetId);
        if (!target) return;

        if (state.castingSpell.card_name === 'To Battle') target.counters = (target.counters || 0) + 1;
        else {
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push(state.castingSpell);
            if (state.castingSpell.card_name === 'Faith in Darkness') {
                const creatures = availableCards.filter(c => c.type.toLowerCase().includes('creature') && c.shape !== 'token');
                state.scrying = { count: 1, cards: [creatures[Math.floor(Math.random() * creatures.length)]], choices: [] };
            }
        }
        state.player.hand.splice(state.player.hand.findIndex(c => c.id === state.castingSpell.id), 1);
        const isFoil = state.castingSpell.isFoil;
        state.castingSpell = null;
        state.player.board.forEach(c => c.onNoncreatureCast(isFoil, state.player.board));
        render();
    }
    
    function rerollShop() {
        if (state.player.gold < 1) return;
        state.player.gold--;
        populateShop();
        render();
    }

    function opponentPlayTurn(opp) {
        if (!opp) opp = getOpponent();
        if (!opp) return;

        // 1. Setup Gold for the turn
        opp.gold = Math.min(2 + state.turn, 10);
        
        // 2. Ensure existing board is instances
        opp.board = opp.board.map(c => (c instanceof BaseCard) ? c : CardFactory.create(c));

        // 3. Generate a "Virtual Shop" for the AI
        const shopSize = opp.tier + 3;
        const availablePool = availableCards.filter(c => c.shape !== 'token'); 
        const virtualShop = [];
        for (let i = 0; i < shopSize; i++) {
            const raw = availablePool[Math.floor(Math.random() * availablePool.length)];
            const inst = CardFactory.create(raw);
            inst.id = `ai-shop-${i}-${Math.random()}`;
            virtualShop.push(inst);
        }

        // 4. Evaluation Loop
        while (opp.gold >= 1) {
            // Score all cards in the virtual shop
            const rankedShop = virtualShop
                .map(card => {
                    let score = scoreCardForAI(card, opp.board);
                    // AI heuristic: prioritize filling board with creatures before buying spells
                    if (!card.type.toLowerCase().includes('creature') && opp.board.length < boardLimit && opp.gold >= 3) {
                        score -= 5;
                    }
                    return { card, score };
                })
                .sort((a, b) => b.score - a.score);

            const best = rankedShop[0];
            if (!best || best.score <= 0) break; // Nothing worth buying

            const cardToBuy = best.card;
            const cost = cardToBuy.type.toLowerCase().includes('creature') ? 3 : 1;
            
            if (opp.gold >= cost) {
                if (cardToBuy.type.toLowerCase().includes('creature')) {
                    if (opp.board.length < boardLimit) {
                        // Buy and add
                        cardToBuy.owner = 'opponent';
                        opp.board.push(cardToBuy);
                        opp.gold -= cost;
                    } else {
                        // Board full: check if we should replace the weakest
                        const weakest = [...opp.board].sort((a, b) => a.getDisplayStats(opp.board).p - b.getDisplayStats(opp.board).p)[0];
                        if (best.score > scoreCardForAI(weakest, opp.board)) {
                            const idx = opp.board.indexOf(weakest);
                            cardToBuy.owner = 'opponent';
                            opp.board[idx] = cardToBuy;
                            opp.gold -= cost;
                        } else break; // Best shop card isn't better than our weakest
                    }
                } else {
                    // Spell logic for AI: apply to best target
                    const target = [...opp.board].sort((a, b) => b.getDisplayStats(opp.board).p - a.getDisplayStats(opp.board).p)[0];
                    if (target || ['Divination', 'Scientific Inquiry'].includes(cardToBuy.card_name)) {
                        if (cardToBuy.card_name === 'To Battle' && target) target.counters++;
                        else if (target) {
                            target.enchantments.push(cardToBuy);
                        }
                        
                        // AI-specific noncreature cast effects using OO hook
                        opp.board.forEach(c => c.onNoncreatureCast(false, opp.board));

                        opp.gold -= cost;
                    } else break;
                }
                // Remove bought card from virtual shop
                virtualShop.splice(virtualShop.indexOf(cardToBuy), 1);
            } else break;
        }
        
        // Final sort: AI puts biggest units on the left
        opp.board.sort((a, b) => {
            const sA = a.getDisplayStats(opp.board);
            const sB = b.getDisplayStats(opp.board);
            return (sB.p + sB.t) - (sA.p + sA.t);
        });
    }

    function scoreCardForAI(card, board) {
        const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
        let score = 0;
        const isCreature = instance.type?.toLowerCase().includes('creature');
        
        if (isCreature) {
            const stats = instance.getDisplayStats(board);
            score += (stats.p + stats.t) / 2;
            
            // Synergy: Ferocious
            const hasFerociousOnBoard = board.some(c => c.card_name === 'Impressible Cub');
            if (hasFerociousOnBoard && stats.p >= 4) score += 3;
            
            // Synergy: Keywords
            if (instance.hasKeyword('Flying')) score += 1.5;
            if (instance.hasKeyword('First strike')) score += 1;
            if (instance.hasKeyword('Defender')) score += 0.5;
            if (instance.hasKeyword('Lifelink')) score += 1;
        } else {
            // Spells
            score += 1; // Base spell utility
            const hasProwessOnBoard = board.some(c => c.card_name === 'Clairvoyant Koi' || c.card_name === 'Blistering Lunatic');
            if (hasProwessOnBoard) score += 4;
        }

        return score;
    }

    function hasKeyword(card, keyword) {
        return card.rules_text?.toLowerCase().includes(keyword.toLowerCase());
    }

    function resolveScry(choice) {
        if (!state.scrying) return;
        if (choice === 'approve') state.nextShopBonusCards.push(state.scrying.cards[state.scrying.choices.length]);
        state.scrying.choices.push(choice);
        if (state.scrying.choices.length >= state.scrying.count) state.scrying = null;
        render();
    }

    function render() {
        const rosterSidebar = document.getElementById('roster-sidebar');
        if (rosterSidebar) {
            rosterSidebar.innerHTML = '';
            // We show all starting opponents even if dead, but mark them
            state.opponents.forEach(opp => {
                const frame = document.createElement('div');
                frame.className = 'roster-frame';
                if (opp.overallHp <= 0) frame.classList.add('dead');
                if (state.currentOpponentId === state.opponents.indexOf(opp)) frame.classList.add('active');

                const img = document.createElement('img');
                img.src = opp.avatar;
                frame.appendChild(img);
                rosterSidebar.appendChild(frame);
            });
        }

        const currentOpp = getOpponent();

        if (state.phase === 'SHOP') {
            state.player.board = state.player.board.map(c => {
                const inst = (c instanceof BaseCard) ? c : CardFactory.create(c);
                inst.damageTaken = 0; // Reset damage in shop
                return inst;
            });
            const shopZone = document.getElementById('shop-zone');
            const opponentZone = document.getElementById('opponent-zone');
            shopZone.style.display = 'flex';
            shopZone.style.opacity = '1';
            shopZone.style.pointerEvents = 'auto';
            opponentZone.style.display = 'none';
            opponentZone.style.opacity = '0';
            opponentZone.style.pointerEvents = 'none';

            const shopEl = document.getElementById('shop');
            shopEl.innerHTML = '';
            state.shop.cards.forEach(card => shopEl.appendChild(createCardElement(card, true, -1, [])));
        } else {
            const shopZone = document.getElementById('shop-zone');
            const opponentZone = document.getElementById('opponent-zone');
            shopZone.style.display = 'none';
            shopZone.style.opacity = '0';
            shopZone.style.pointerEvents = 'none';
            opponentZone.style.display = 'flex';
            opponentZone.style.opacity = '1';
            opponentZone.style.pointerEvents = 'auto';
            const oppBoardEl = document.getElementById('opponent-board');
            oppBoardEl.innerHTML = "";
            const oppBoardToRender = state.battleBoards ? state.battleBoards.opponent : (currentOpp?.board || []);
            oppBoardToRender.forEach(card => oppBoardEl.appendChild(createCardElement(card, false, -1, oppBoardToRender)));
        }

        const playerHandEl = document.getElementById('player-hand');
        playerHandEl.innerHTML = '';
        state.player.hand.forEach((card, i) => {
            const cardEl = createCardElement(card, false, -1, []);
            const total = state.player.hand.length;
            const mid = (total - 1) / 2;
            const anglePerCard = 6; 
            const rotation = (i - mid) * anglePerCard;
            const yOffset = Math.abs(i - mid) * 8; 
            cardEl.style.transform = `rotate(${rotation}deg) translateY(${yOffset}px)`;
            playerHandEl.appendChild(cardEl);
        });

        const playerBoardEl = document.getElementById('player-board');
        playerBoardEl.innerHTML = '';
        const boardToRender = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
        boardToRender.forEach((card, index) => {
            const cardEl = createCardElement(card, false, index, boardToRender);
            playerBoardEl.appendChild(cardEl);
        });

        if (playerHpEl()) playerHpEl().textContent = state.player.overallHp;
        if (playerFightHpEl()) playerFightHpEl().textContent = state.player.fightHp;
        if (playerGoldEl()) playerGoldEl().textContent = state.player.gold;
        if (document.getElementById('opponent-hp')) document.getElementById('opponent-hp').textContent = currentOpp.overallHp;
        if (document.getElementById('opponent-fight-hp')) document.getElementById('opponent-fight-hp').textContent = currentOpp.fightHp;

        // Toggle Reroll button styling
        if (state.player.gold < 1) {
            rerollBtn.style.background = "#555";
            rerollBtn.style.cursor = "not-allowed";
        } else {
            rerollBtn.style.background = "linear-gradient(to bottom, #2e7d32, #1b5e20)";
            rerollBtn.style.cursor = "pointer";
        }

        // Toggle Fight HP visibility
        const fightLabels = document.querySelectorAll('.ui-label.fight-hp');
        fightLabels.forEach(el => {
            el.style.display = (state.phase === 'BATTLE') ? 'flex' : 'none';
        });

        updateTierButton();
        const oppTierEl = document.getElementById('opponent-tier');
        if (oppTierEl) oppTierEl.textContent = currentOpp.tier;

        if (state.castingSpell || state.targetingEffect) {
            endTurnBtn.textContent = 'CANCEL';
            endTurnBtn.style.background = 'linear-gradient(to bottom, #c62828, #b71c1c)';
            document.body.classList.add('overlay-active');
        } else {
            endTurnBtn.textContent = 'End Turn';
            endTurnBtn.style.background = '';
            document.body.classList.remove('overlay-active');
        }
        endTurnBtn.disabled = state.phase !== 'SHOP' && !state.castingSpell && !state.targetingEffect;

        // Board drop zone
        playerBoardEl.removeEventListener('dragover', handleDragOver);
        playerBoardEl.addEventListener('dragover', handleDragOver);
        playerBoardEl.removeEventListener('drop', handleBoardDrop);
        playerBoardEl.addEventListener('drop', handleBoardDrop);

        // Shop drop zone (for selling)
        const shopZone = document.getElementById('shop-zone');
        if (shopZone) {
            shopZone.removeEventListener('dragover', handleDragOver);
            shopZone.addEventListener('dragover', handleDragOver);
            shopZone.removeEventListener('drop', handleShopDrop);
            shopZone.addEventListener('drop', handleShopDrop);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleBoardDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'hand') {
            useCardFromHand(data.cardId);
        }
    }

    function handleShopDrop(e) {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'board') {
            sellCard(data.cardId);
        }
    }

    function sellCard(cardId) {
        if (state.phase !== 'SHOP') return;
        const boardIndex = state.player.board.findIndex(c => c.id === cardId);
        if (boardIndex === -1) return;

        state.player.board.splice(boardIndex, 1);
        state.player.gold += 1;
        render();
    }

    function createCardElement(card, isShop = false, index = -1, boardContext = []) {
        const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
        const cardEl = cardTemplate.content.cloneNode(true).firstElementChild;
        cardEl.id = `card-${instance.id}`;
        cardEl.querySelector('.card-name').textContent = instance.card_name;
        
        const tokenSuffix = (instance.shape?.includes('token')) ? "t" : "";
        const imageName = instance.position ? instance.position : `${instance.number}${tokenSuffix}_${instance.card_name}`;
        const doubleSuffix = (instance.shape?.includes('double')) ? "_front" : "";
        const extension = instance.image_type || instance.set_image_type || "jpg";
        cardEl.querySelector('.card-art').src = `sets/${instance.set}-files/img/${imageName}${doubleSuffix}.${extension}`;
        
        const costEl = cardEl.querySelector('.card-cost');
        if (isShop) {
            costEl.style.display = 'flex';
            costEl.textContent = instance.type.toLowerCase().includes('creature') ? 3 : 1;
        } else {
            costEl.style.display = 'none';
        }
        
        const counterEl = cardEl.querySelector('.card-counters');
        if (instance.counters > 0) counterEl.textContent = `+${instance.counters}`;
        else counterEl.textContent = '';
        
        if (instance.pt) {
            const stats = instance.getDisplayStats(boardContext);
            cardEl.querySelector('.card-p').textContent = stats.p;
            cardEl.querySelector('.card-t').textContent = stats.t;
            if (stats.t < stats.maxT) cardEl.querySelector('.card-t').classList.add('damaged');
            else cardEl.querySelector('.card-t').classList.remove('damaged');
        } else cardEl.querySelector('.card-pt').style.display = 'none';
        
        if (instance.isFoil) cardEl.classList.add('foil');
        
        // Events
        if (isShop) cardEl.addEventListener('click', () => buyCard(instance.id));
        else if (index !== -1) { // On player board
            if (state.phase === 'SHOP' && !state.castingSpell && !state.targetingEffect) {
                cardEl.draggable = true;
                cardEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'board', index: index, cardId: instance.id }));
                });
                cardEl.addEventListener('dragover', (e) => e.preventDefault());
                cardEl.addEventListener('drop', (e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.type === 'board') {
                        const [m] = state.player.board.splice(data.index, 1);
                        state.player.board.splice(index, 0, m);
                        render();
                    } else if (data.type === 'hand') {
                        useCardFromHand(data.cardId, index);
                    }
                });
            }
            if (state.castingSpell) { 
                cardEl.classList.add('targetable'); 
                cardEl.addEventListener('click', () => applySpell(instance.id)); 
            }
            if (state.targetingEffect) { 
                cardEl.classList.add('targetable'); 
                cardEl.addEventListener('click', () => applyTargetedEffect(instance.id)); 
            }
        } else if (state.player.hand.some(c => c.id === instance.id)) { // In hand
             cardEl.addEventListener('click', () => useCardFromHand(instance.id));
             cardEl.draggable = true;
             cardEl.addEventListener('dragstart', (e) => {
                 e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'hand', cardId: instance.id }));
             });
        }
        return cardEl;
    }

    rerollBtn.addEventListener('click', rerollShop);
    endTurnBtn.addEventListener('click', () => {
        if (state.castingSpell || state.targetingEffect) {
            // Cancel Action Logic
            if (state.targetingEffect && state.targetingEffect.sourceId) {
                const boardIndex = state.player.board.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (boardIndex !== -1) {
                    const card = state.player.board.splice(boardIndex, 1)[0];
                    state.player.hand.push(card);
                }
            }
            state.castingSpell = null;
            state.targetingEffect = null;
            render();
        } else {
            // End Turn Logic
            startBattleTurn();
        }
    });
    init();
});
