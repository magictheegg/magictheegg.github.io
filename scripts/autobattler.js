document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let state = {
        player: {
            overallHp: 20,
            fightHp: 10,
            gold: 3,
            tier: 1,
            hand: [],
            board: [],
            treasures: 0
        },
        opponent: {
            overallHp: 20,
            fightHp: 10,
            tier: 1,
            board: []
        },
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

    let availableCards = [];
    const handLimit = 7;
    const boardLimit = 7;

    // DOM Elements
    const playerBoardEl = document.getElementById('player-board');
    const playerHandEl = document.getElementById('player-hand');
    const shopEl = document.getElementById('shop');
    const rerollBtn = document.getElementById('reroll-btn');
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

    const tierCosts = [0, 5, 7, 8, 9, 10]; // Costs to go TO that tier

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

        if (state.player.tier >= 6) {
            tierUpBtn.style.opacity = "0.5";
            tierUpBtn.style.cursor = "default";
            tierUpBtn.disabled = true;
            tierContainer.setAttribute('data-cost', ""); // Hides pseudo-element via CSS
            return;
        }

        const cost = tierCosts[state.player.tier + 1];
        tierContainer.setAttribute('data-cost', cost);

        if (state.player.gold < cost) {
            tierUpBtn.style.background = "#555"; 
            tierUpBtn.style.cursor = "not-allowed";
        } else {
            tierUpBtn.style.background = "#ff5722"; 
            tierUpBtn.style.cursor = "pointer";
        }
    }

    function tierUp() {
        const nextTier = state.player.tier + 1;
        if (nextTier > 6) return;
        const cost = tierCosts[nextTier];
        if (state.player.gold >= cost) {
            state.player.gold -= cost;
            state.player.tier = nextTier;
            updateTierButton();
            render();
        }
    }

    // Game Loop
    function startShopTurn() {
        state.phase = 'SHOP';
        
        const turnBaseGold = Math.min(2 + state.turn, 10);
        state.player.gold = turnBaseGold + state.player.treasures;
        
        if (state.player.treasures > 0) {
            console.log(`Adding ${state.player.treasures} gold from treasures.`);
            state.player.treasures = 0;
        }

        populateShop();
        render();
    }
    
    function getDisplayStats(card, board) {
        if (!card.pt) return { p: 0, t: 0 };

        const [basePower, baseToughness] = card.pt.split('/').map(Number);
        let p = basePower + (card.counters || 0);
        let t = baseToughness + (card.counters || 0);
        
        // Passive abilities only apply if the card is on a board
        if (board.some(c => c.id === card.id)) {
            const hasOtherFlying = board.some(other => other.id !== card.id && hasKeyword(other, 'Flying'));
            const hasOtherCentaur = board.some(other => other.id !== card.id && (other.type && other.type.includes('Centaur')));

            if (card.card_name === 'Soulsmoke Adept' && (card.counters > 0)) p += 1;
            if (card.card_name === 'Glumvale Raven' && hasOtherFlying) p += 1;
            if (card.card_name === 'War-Clan Dowager' && hasOtherCentaur) { p += 1; t += 1; }
        }

        if (card.enchantments) {
            card.enchantments.forEach(e => {
                if (e.card_name === "Faith in Darkness") { p += 2; t += 2; }
                if (e.card_name === "To Battle") { p += 2; }
            });
        }
        if (card.tempPower) p += card.tempPower;
        if (card.tempToughness) t += card.tempToughness;

        return {p, t};
    }

    function recalculateBoardStats(board, phase) {
        return board.map(card => {
            const stats = getDisplayStats(card, board);
            return {
                ...card,
                currentPower: stats.p,
                maxToughness: stats.t,
                currentToughness: (phase === 'SHOP') ? stats.t : (card.currentToughness ?? stats.t)
            };
        });
    }


    async function startBattleTurn() {
        state.phase = 'BATTLE';
        endTurnBtn.disabled = true;
        rerollBtn.disabled = true;
        
        // Impressible Cub "Ferocious" Trigger
        const hasFerocious = state.player.board.some(c => c.card_name === 'Impressible Cub');
        if (hasFerocious) {
            const hasStrongCreature = state.player.board.some(c => {
                const stats = getDisplayStats(c, state.player.board);
                return stats.p >= 4;
            });
            if (hasStrongCreature) {
                state.player.board.forEach(c => {
                    if (c.card_name === 'Impressible Cub') {
                        c.tempPower = (c.tempPower || 0) + 1;
                        c.tempToughness = (c.tempToughness || 0) + 1;
                    }
                });
            }
        }

        state.player.fightHp = 5 + (5 * state.player.tier);
        state.opponent.fightHp = 5 + (5 * state.opponent.tier);

        state.opponent.board = populateOpponentBoard();
        
        const createCombatant = (card, owner, board) => {
            const stats = getDisplayStats(card, board);
            return {
                ...card,
                owner: owner,
                currentPower: stats.p,
                maxToughness: stats.t,
                currentToughness: stats.t,
                isFlying: hasKeyword(card, 'Flying'),
                isDefender: hasKeyword(card, 'Defender'),
                isFirstStriker: hasKeyword(card, 'First strike'),
                isHaste: hasKeyword(card, 'Haste'),
                hasLifelink: (card.card_name === 'Soulsmoke Adept' && card.counters > 0)
            };
        };

        state.battleBoards = {
            player: state.player.board.map(c => createCombatant(c, 'player', state.player.board)),
            opponent: state.opponent.board.map(c => createCombatant(c, 'opponent', state.opponent.board))
        };
        
        render(); 
        console.log("Battle Begins!");
        await new Promise(resolve => setTimeout(resolve, 1000)); 

        const performAttack = async (attacker, defender, isFirstStrike = false) => {
            const damageDealt = attacker.currentPower;
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

            if (defender) {
                defender.currentToughness -= damageDealt;
                
                if (attacker.hasLifelink) {
                    if (attacker.owner === 'player') state.player.fightHp += damageDealt;
                    else state.opponent.fightHp += damageDealt;
                }

                if (!isFirstStrike) {
                    attackerDamageTaken = defender.currentPower;
                    attacker.currentToughness -= defender.currentPower;
                }
            } else {
                 if (attacker.owner === 'player') state.opponent.fightHp -= damageDealt;
                 else state.player.fightHp -= damageDealt;
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
                const heroEl = document.getElementById(attacker.owner === 'player' ? 'opponent-info' : 'player-info');
                showDamageBubble(heroEl, defenderDamageTaken);
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
            const bubble = document.createElement('div');
            bubble.className = 'damage-bubble';
            bubble.textContent = `-${amount}`;
            bubble.style.position = 'fixed';
            bubble.style.zIndex = "9999";
            document.body.appendChild(bubble);

            // Tracking loop to keep bubble following the card as it moves
            const startTime = Date.now();
            const duration = 1200;

            function updateBubblePosition() {
                const elapsed = Date.now() - startTime;
                if (elapsed >= duration) {
                    bubble.remove();
                    return;
                }

                const rect = targetEl.getBoundingClientRect();
                bubble.style.left = `${rect.left + rect.width / 2}px`;
                bubble.style.top = `${rect.top + rect.height / 2}px`;

                requestAnimationFrame(updateBubblePosition);
            }

            requestAnimationFrame(updateBubblePosition);
        }

        const createToken = (tokenName, owner) => {
            const tokenData = availableCards.find(c => c.card_name === tokenName && c.shape === 'token');
            if (tokenData) {
                let [power, toughness] = tokenData.pt ? tokenData.pt.split('/').map(Number) : [1, 1];
                if (tokenName === 'Construct') { power = 2; toughness = 2; }
                
                return { 
                    ...tokenData, 
                    pt: `${power}/${toughness}`, id: `token-${Math.random()}`, owner: owner,
                    currentPower: power, maxToughness: toughness, currentToughness: toughness,
                    isFlying: hasKeyword(tokenData, 'Flying'), isDefender: hasKeyword(tokenData, 'Defender'),
                    isFirstStriker: hasKeyword(tokenData, 'First strike'), isHaste: hasKeyword(tokenData, 'Haste')
                };
            }
            return null;
        };

        const resolveDeaths = async () => {
            const deadPlayerCards = state.battleBoards.player.filter(c => c.currentToughness <= 0);
            const deadOpponentCards = state.battleBoards.opponent.filter(c => c.currentToughness <= 0);

            if (deadPlayerCards.length === 0 && deadOpponentCards.length === 0) return;

            deadPlayerCards.concat(deadOpponentCards).forEach(c => document.getElementById(`card-${c.id}`)?.classList.add('dying'));
            await new Promise(r => setTimeout(r, 500)); 

            deadPlayerCards.forEach(deadCard => {
                const idx = state.battleBoards.player.findIndex(c => c.id === deadCard.id);
                if (idx === -1) return;

                const hasResurrection = deadCard.enchantments && deadCard.enchantments.some(e => e.card_name === 'By Blood and Venom');
                const isCarcass = deadCard.card_name === 'Rotten Carcass';
                let spawns = [];
                if (hasResurrection) {
                    const stats = getDisplayStats(deadCard, state.player.board);
                    spawns.push({ ...deadCard, id: `returned-${Math.random()}`, currentPower: stats.p, maxToughness: stats.t, currentToughness: stats.t, enchantments: [], hasAttacked: false });
                }
                if (isCarcass) spawns.push(createToken('Construct', 'player'));
                if (spawns.length === 2 && state.battleBoards.player.length >= boardLimit) spawns.pop();
                
                if (spawns.length > 0) state.battleBoards.player.splice(idx, 1, ...spawns.filter(Boolean));
                else state.battleBoards.player.splice(idx, 1);
                
                if (deadCard.card_name === 'Leech-Ridden Corpse') state.player.fightHp += 1;
                if (deadCard.card_name === 'Lake Cave Lurker') state.player.treasures += 1;
            });

            deadOpponentCards.forEach(deadCard => {
                const idx = state.battleBoards.opponent.findIndex(c => c.id === deadCard.id);
                if (idx > -1) {
                    if (deadCard.card_name === 'Rotten Carcass') state.battleBoards.opponent.splice(idx, 1, createToken('Construct', 'opponent'));
                    else state.battleBoards.opponent.splice(idx, 1);
                }
            });

            render();
            await new Promise(r => setTimeout(r, 200)); 
        };

        const findTarget = (attacker, defendingBoard) => {
            if (attacker.isFlying) {
                // Flying attackers priority 1: Defenders with Flying or Reach
                const airDefenders = defendingBoard.filter(c => c.isDefender && (c.isFlying || hasKeyword(c, 'Reach')));
                if (airDefenders.length > 0) return airDefenders[Math.floor(Math.random() * airDefenders.length)];
                
                // Flying attackers priority 2: ANY creature with Flying or Reach
                const airCreatures = defendingBoard.filter(c => c.isFlying || hasKeyword(c, 'Reach'));
                if (airCreatures.length > 0) return airCreatures[Math.floor(Math.random() * airCreatures.length)];

                // Otherwise, they bypass ground creatures and attack FACE directly
                return null;
            } else { 
                // Ground attackers priority 1: ANY Defender (Taunt) first
                const tauntDefenders = defendingBoard.filter(c => c.isDefender);
                if (tauntDefenders.length > 0) return tauntDefenders[Math.floor(Math.random() * tauntDefenders.length)];
                
                // Ground attackers priority 2: Ground creatures
                const groundCreatures = defendingBoard.filter(c => !c.isFlying);
                if (groundCreatures.length > 0) return groundCreatures[Math.floor(Math.random() * groundCreatures.length)];
                
                // Ground attackers priority 3: Flying creatures (if only option)
                if (defendingBoard.length > 0) return defendingBoard[Math.floor(Math.random() * defendingBoard.length)];
                
                return null; // Face
            }
        };

        const executeCombatPhase = async (isFirstStrike) => {
            let playerIdx = 0;
            let opponentIdx = 0;
            let playerTurn = true; 

            while (true) {
                if (state.player.fightHp <= 0 || state.opponent.fightHp <= 0) break;

                // Find next valid attackers (skipping defenders and cannot-attacks)
                const getNextAttacker = (board, startIdx) => {
                    if (board.length === 0) return { card: null, index: startIdx };
                    for (let i = 0; i < board.length; i++) {
                        const idx = (startIdx + i) % board.length;
                        const card = board[idx];
                        const isValidPhase = isFirstStrike ? card.isFirstStriker : !card.isFirstStriker;
                        if (isValidPhase && !card.isDefender && !card.cannotAttack) {
                            return { card, index: idx };
                        }
                    }
                    return { card: null, index: startIdx };
                };

                const pResult = getNextAttacker(state.battleBoards.player, playerIdx);
                const oResult = getNextAttacker(state.battleBoards.opponent, opponentIdx);

                if (!pResult.card && !oResult.card) break; // Phase complete

                let attacker = null;
                
                // HASTE LOGIC: Compare next two creatures. If one has haste and other doesn't, haste goes first.
                if (pResult.card && oResult.card) {
                    if (pResult.card.isHaste && !oResult.card.isHaste) {
                        attacker = pResult.card;
                    } else if (oResult.card.isHaste && !pResult.card.isHaste) {
                        attacker = oResult.card;
                    } else {
                        // Both have it or neither have it, follow alternating turns
                        attacker = playerTurn ? pResult.card : oResult.card;
                    }
                } else {
                    attacker = pResult.card || oResult.card;
                }

                const isPlayerAction = (attacker.owner === 'player');
                const defenderBoard = isPlayerAction ? state.battleBoards.opponent : state.battleBoards.player;
                const defender = findTarget(attacker, defenderBoard);
                
                await performAttack(attacker, defender, isFirstStrike);
                await resolveDeaths();

                // Increment index of whoever just attacked
                if (isPlayerAction) {
                    playerIdx = (pResult.index + 1) % (state.battleBoards.player.length || 1);
                } else {
                    opponentIdx = (oResult.index + 1) % (state.battleBoards.opponent.length || 1);
                }

                // Alternate turn for next time if both sides have attackers
                playerTurn = !playerTurn;
                
                // If one side just got wiped out during that attack, end phase
                if (state.player.fightHp <= 0 || state.opponent.fightHp <= 0) break;
            }
        };

        await executeCombatPhase(true);
        await executeCombatPhase(false);
        await new Promise(resolve => setTimeout(resolve, 500));

        let fightWinner = (state.opponent.fightHp <= 0 && state.player.fightHp > 0) ? 'player' : (state.player.fightHp <= 0 && state.opponent.fightHp > 0) ? 'opponent' : null;
        if (fightWinner === 'player') {
            state.opponent.overallHp -= state.player.tier;
            alert(`You won the fight! Opponent loses ${state.player.tier} HP.`);
        } else if (fightWinner === 'opponent') {
            state.player.overallHp -= state.opponent.tier;
            alert(`You lost the fight! You lose ${state.player.tier} HP.`);
        } else alert("The fight was a draw!");

        if (state.player.overallHp <= 0) {
            alert("Game Over! You lost.");
            document.location.reload();
            return; 
        }
         if (state.opponent.overallHp <= 0) {
            alert("Congratulations! You won the game!");
            document.location.reload();
            return;
        }

        // --- End of Combat Cleanup ---
        state.player.board.forEach(c => { delete c.tempPower; delete c.tempToughness; c.enchantments = []; });
        state.player.fightHp = 5 + (5 * state.player.tier);
        state.opponent.fightHp = 5 + (5 * state.opponent.tier);
        state.battleBoards = null;
        state.turn++;
        endTurnBtn.disabled = false;
        rerollBtn.disabled = false;
        startShopTurn();
    }

    function populateShop() {
        state.shop.cards = [];
        if (state.nextShopBonusCards.length > 0) {
            state.shop.cards.push(...state.nextShopBonusCards);
            state.nextShopBonusCards = [];
        }
        const creatureShopSize = state.player.tier + 2;
        const creatures = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token');
        const spells = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && c.shape !== 'token');
        const currentCreatureCount = state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length;
        for (let i = 0; i < (creatureShopSize - currentCreatureCount); i++) {
            if (creatures.length === 0) break;
            state.shop.cards.push({ ...creatures[Math.floor(Math.random() * creatures.length)], id: `shop-${state.turn}-${i}-${Math.random()}` });
        }
        if (!state.shop.cards.some(c => !c.type?.toLowerCase().includes('creature')) && spells.length > 0) {
            state.shop.cards.push({ ...spells[Math.floor(Math.random() * spells.length)], id: `shop-${state.turn}-spell-${Math.random()}` });
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
        render();
    }

    function useCardFromHand(cardId, targetIndex = -1) {
        if (state.phase !== 'SHOP') return;
        const cardIndex = state.player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.player.hand[cardIndex];

        if (card.type.toLowerCase().includes('creature')) {
            if (state.player.board.length >= boardLimit) return;
            const creature = { ...card, counters: (card.counters || 0) };
            if (creature.card_name === 'Apprentice Lancer' && state.player.board.some(c => c.type?.includes('Centaur'))) creature.counters++;
            
            if (targetIndex !== -1) {
                state.player.board.splice(targetIndex, 0, creature);
            } else {
                state.player.board.push(creature);
            }
            
            state.player.hand.splice(cardIndex, 1);
            if (card.card_name === 'Dutiful Camel') state.targetingEffect = { sourceId: creature.id, effect: 'dutiful_camel_counter' };
        } else {
            if (['Divination', 'Scientific Inquiry'].includes(card.card_name)) {
                if (card.card_name === 'Divination') addRandomCardsToShop(2);
                if (card.card_name === 'Scientific Inquiry') {
                    state.player.treasures++;
                    const creatures = availableCards.filter(c => c.type.toLowerCase().includes('creature') && c.shape !== 'token');
                    state.scrying = { count: 2, cards: [creatures[Math.floor(Math.random() * creatures.length)], creatures[Math.floor(Math.random() * creatures.length)]], choices: [] };
                }
                state.player.hand.splice(cardIndex, 1);
                triggerNoncreatureCastEffects();
            } else state.castingSpell = card;
        }
        render();
    }

    function triggerNoncreatureCastEffects() {
        state.player.board.forEach(c => {
            if (c.card_name === 'Clairvoyant Koi') { 
                c.tempPower = (c.tempPower || 0) + 1; 
                c.tempToughness = (c.tempToughness || 0) + 1; 
            }
            if (c.card_name === 'Blistering Lunatic') {
                c.tempPower = (c.tempPower || 0) + 2;
            }
        });
    }

    function addRandomCardsToShop(count) {
        const creatures = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token');
        for (let i = 0; i < count; i++) {
            if (creatures.length > 0) state.shop.cards.push({ ...creatures[Math.floor(Math.random() * creatures.length)], id: `drawn-${Math.random()}` });
        }
    }

    function applyTargetedEffect(targetId) {
        if (!state.targetingEffect) return;
        const target = state.player.board.find(c => c.id === targetId);
        if (target && state.targetingEffect.effect === 'dutiful_camel_counter') target.counters = (target.counters || 0) + 1;
        state.targetingEffect = null;
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
        state.castingSpell = null;
        triggerNoncreatureCastEffects();
        render();
    }
    
    function rerollShop() {
        if (state.player.gold < 1) return;
        state.player.gold--;
        populateShop();
        render();
    }

    function populateOpponentBoard() {
        const board = [];
        const numCreatures = Math.min(state.turn, boardLimit); 
        const creatures = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token');
        for (let i = 0; i < numCreatures; i++) {
            if (creatures.length > 0) board.push({ ...creatures[Math.floor(Math.random() * creatures.length)], id: `opp-${Math.random()}`});
        }
        return board;
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
        if (state.phase === 'SHOP') {
            state.player.board = recalculateBoardStats(state.player.board, 'SHOP');
        }

        const scryModal = document.getElementById('scry-modal');
        const shopZone = document.getElementById('shop-zone');
        const opponentZone = document.getElementById('opponent-zone');
        const playerHandEl = document.getElementById('player-hand');
        const shopEl = document.getElementById('shop');

        if (state.scrying) {
            scryModal.style.display = 'flex';
            const scryCardContainer = document.getElementById('scry-card-container');
            const currentCardIndex = state.scrying.choices.length;
            const cardToScry = state.scrying.cards[currentCardIndex];
            scryCardContainer.innerHTML = '';
            scryCardContainer.appendChild(createCardElement(cardToScry, false)); 
            document.getElementById('scry-approve-btn').onclick = () => resolveScry('approve');
            document.getElementById('scry-deny-btn').onclick = () => resolveScry('deny');
        } else {
            scryModal.style.display = 'none';
        }

        if (state.castingSpell || state.targetingEffect || state.scrying) {
            document.body.classList.add('overlay-active');
        } else {
            document.body.classList.remove('overlay-active');
        }

        if (playerHpEl()) playerHpEl().textContent = state.player.overallHp;
        if (playerFightHpEl()) playerFightHpEl().textContent = state.player.fightHp;
        if (playerGoldEl()) playerGoldEl().textContent = state.player.gold;
        
        const oppHpEl = document.getElementById('opponent-hp');
        const oppFightHpEl = document.getElementById('opponent-fight-hp');
        
        if (oppHpEl) oppHpEl.textContent = state.opponent.overallHp;
        if (oppFightHpEl) oppFightHpEl.textContent = state.opponent.fightHp;

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
        if (oppTierEl) oppTierEl.textContent = state.opponent.tier;

        // Handle End Turn vs Cancel Action button styling only
        if (state.castingSpell || state.targetingEffect) {
            endTurnBtn.textContent = 'CANCEL';
            endTurnBtn.style.background = 'linear-gradient(to bottom, #c62828, #b71c1c)';
            endTurnBtn.style.borderColor = '#ffcdd2';
            endTurnBtn.disabled = false;
        } else {
            endTurnBtn.textContent = 'End Turn';
            endTurnBtn.style.background = ''; // Revert to CSS default
            endTurnBtn.style.borderColor = '';
            endTurnBtn.disabled = (state.phase !== 'SHOP');
        }

        if (state.phase === 'SHOP') {
            shopZone.style.display = 'flex';
            shopZone.style.opacity = '1';
            shopZone.style.pointerEvents = 'auto';
            opponentZone.style.display = 'none';
            opponentZone.style.opacity = '0';
            opponentZone.style.pointerEvents = 'none';
            shopEl.innerHTML = '';
            state.shop.cards.forEach(card => shopEl.appendChild(createCardElement(card, true)));
        } else {
            shopZone.style.display = 'none';
            shopZone.style.opacity = '0';
            shopZone.style.pointerEvents = 'none';
            opponentZone.style.display = 'flex';
            opponentZone.style.opacity = '1';
            opponentZone.style.pointerEvents = 'auto';
            const oppBoardEl = document.getElementById('opponent-board');
            oppBoardEl.innerHTML = "";
            const oppBoardToRender = state.battleBoards ? state.battleBoards.opponent : state.opponent.board;
            oppBoardToRender.forEach(card => oppBoardEl.appendChild(createCardElement(card, false)));
        }

        playerHandEl.innerHTML = '';
        state.player.hand.forEach((card, i) => {
            const cardEl = createCardElement(card, false);
            const total = state.player.hand.length;
            const mid = (total - 1) / 2;
            const anglePerCard = 6; 
            const rotation = (i - mid) * anglePerCard;
            const yOffset = Math.abs(i - mid) * 8; 
            cardEl.style.transform = `rotate(${rotation}deg) translateY(${yOffset}px)`;
            playerHandEl.appendChild(cardEl);
        });

        playerBoardEl.innerHTML = '';
        const boardToRender = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
        boardToRender.forEach((card, index) => {
            const cardEl = createCardElement(card, false, index);
            playerBoardEl.appendChild(cardEl);
        });

        // Board drop zone
        playerBoardEl.removeEventListener('dragover', handleDragOver);
        playerBoardEl.addEventListener('dragover', handleDragOver);
        playerBoardEl.removeEventListener('drop', handleBoardDrop);
        playerBoardEl.addEventListener('drop', handleBoardDrop);
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

    function createCardElement(card, isShop = false, index = -1) {
        const cardEl = cardTemplate.content.cloneNode(true).firstElementChild;
        cardEl.dataset.cardId = card.id;
        cardEl.querySelector('.card-name').textContent = card.card_name;
        
        const tokenSuffix = (card.shape?.includes('token')) ? "t" : "";
        const imageName = card.position ? card.position : `${card.number}${tokenSuffix}_${card.card_name}`;
        const doubleSuffix = (card.shape?.includes('double')) ? "_front" : "";
        const extension = card.image_type || card.set_image_type || "jpg";
        cardEl.querySelector('.card-art').src = `sets/${card.set}-files/img/${imageName}${doubleSuffix}.${extension}`;
        
        const costEl = cardEl.querySelector('.card-cost');
        if (isShop) {
            costEl.style.display = 'flex';
            costEl.textContent = card.type.toLowerCase().includes('creature') ? 3 : 1;
        } else {
            costEl.style.display = 'none';
        }
        
        const counterEl = cardEl.querySelector('.card-counters');
        if (card.counters > 0) counterEl.textContent = `+${card.counters}`;
        else counterEl.textContent = '';
        
        if (card.pt) {
            const ptEl = cardEl.querySelector('.card-pt');
            const pEl = cardEl.querySelector('.card-p');
            const tEl = cardEl.querySelector('.card-t');
            let p, t, maxT;

            const isBattleBoardCard = state.battleBoards && (state.battleBoards.player.some(c => c.id === card.id) || state.battleBoards.opponent.some(c => c.id === card.id));
            if (isBattleBoardCard) {
                p = card.currentPower;
                t = card.currentToughness;
                maxT = card.maxToughness;
            } else {
                const stats = getDisplayStats(card, (index !== -1 ? state.player.board : []));
                p = stats.p;
                t = stats.t;
                maxT = stats.t;
            }

            pEl.textContent = p ?? 0;
            tEl.textContent = t ?? 0;
            
            if (t < maxT) tEl.classList.add('damaged');
            else tEl.classList.remove('damaged');
            
        } else cardEl.querySelector('.card-pt').style.display = 'none';
        
        cardEl.id = `card-${card.id}`;
        if (isShop) cardEl.addEventListener('click', () => buyCard(card.id));
        else if (index !== -1) { // On player board
            if (state.phase === 'SHOP' && !state.castingSpell && !state.targetingEffect) {
                cardEl.draggable = true;
                cardEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'board', index: index }));
                });
                cardEl.addEventListener('dragover', (e) => e.preventDefault());
                cardEl.addEventListener('drop', (e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.type === 'board') {
                        reorderBoard(data.index, index);
                    } else if (data.type === 'hand') {
                        useCardFromHand(data.cardId, index);
                    }
                });
            }
            if (state.castingSpell) { 
                cardEl.classList.add('targetable'); 
                cardEl.addEventListener('click', () => applySpell(card.id)); 
            }
            if (state.targetingEffect) { 
                cardEl.classList.add('targetable'); 
                cardEl.addEventListener('click', () => applyTargetedEffect(card.id)); 
            }
        } else if (state.player.hand.some(c => c.id === card.id)) { // In hand
             cardEl.addEventListener('click', () => useCardFromHand(card.id));
             cardEl.draggable = true;
             cardEl.addEventListener('dragstart', (e) => {
                 e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'hand', cardId: card.id }));
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
