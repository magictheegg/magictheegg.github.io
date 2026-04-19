// --- OO CARD SYSTEM ---

class BaseCard {
        constructor(data) {
            Object.assign(this, data);
            this.id = this.id || `card-${Math.random().toString(36).substr(2, 9)}`;
            this.counters = Number(this.counters) || 0;
            this.flyingCounters = Number(this.flyingCounters) || 0;
            this.menaceCounters = Number(this.menaceCounters) || 0;
            this.firstStrikeCounters = Number(this.firstStrikeCounters) || 0;
            this.vigilanceCounters = Number(this.vigilanceCounters) || 0;
            this.lifelinkCounters = Number(this.lifelinkCounters) || 0;
            this.damageTaken = Number(this.damageTaken) || 0;
            this.enchantments = this.enchantments || [];
            this.tempPower = Number(this.tempPower) || 0;
            this.tempToughness = Number(this.tempToughness) || 0;
            this.isLockedByChivalry = this.isLockedByChivalry || false;
            this.isFoil = this.isFoil || false;
        }

        get isEmbattled() {
            return (this.counters > 0) || (this.flyingCounters > 0) || 
                   (this.menaceCounters > 0) || (this.firstStrikeCounters > 0) ||
                   (this.vigilanceCounters > 0) || (this.lifelinkCounters > 0);
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
                p: Math.max(0, stable.p + dynamic.p),
                t: stable.t + dynamic.t,
                maxT: stable.maxT + dynamic.t
            };
        }

        // Hook for dynamic board-state-based buffs (Raven, Dowager)
        getDynamicBuffs(board) {
            let p = 0;
            let t = 0;
            
            // TRIBAL LORD CHECK (Warband Lieutenant)
            if (this.type?.includes('Centaur')) {
                board?.forEach(c => {
                    if (c.card_name === 'Warband Lieutenant' && c.id !== this.id) {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += multiplier;
                        t += multiplier;
                    }
                });
            }

            // FLYING LORD CHECK (Windsong Apprentice)
            if (this.hasKeyword('Flying')) {
                board?.forEach(c => {
                    if (c.card_name === 'Windsong Apprentice') {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += multiplier;
                        t += multiplier;
                    }
                });
            }
            
            return { p, t };
        }

        // Hook for ETB effects
        onETB(board) { }

        // Hook for other creatures entering the battlefield
        onOtherCreatureETB(newCard, board) { }

        // Hook for Combat Start triggers (Ferocious, Chivalry)
        onCombatStart(board) { }

        // Hook for Attack triggers
        onAttack(board) { 
            // Draconic Cinderlance Logic
            const hasCinderlance = board?.some(c => c.card_name === 'Draconic Cinderlance');
            if (hasCinderlance) {
                const stats = this.getDisplayStats(board);
                if (stats.p >= 4) {
                    if (!this.enchantments) this.enchantments = [];
                    if (!this.enchantments.some(e => e.card_name === 'Cinderlance Menace')) {
                        this.enchantments.push({ card_name: 'Cinderlance Menace', rules_text: 'Menace' });
                    }
                }
            }
            return []; 
        }

        // Hook for Life Gain triggers
        onLifeGain(board) { }

        // Hook for noncreature spells being cast
        onNoncreatureCast(isFoilCast, board) { }

        // Hook for the "End of Shop Phase" (End Step)
        onShopEndStep(board) { }

        // Hook for death effects (returns an array of tokens/cards to spawn)
        onDeath(board, owner) { return []; }

        // Hook for when another creature on the same board dies
        onOtherCreatureDeath(board) { }

        // Hook for when a spell is cast (for non-targeted spells like Divination)
        onCast(board) { }

        // Hook for when a spell is applied to a target (for enchantments/targeted spells)
        onApply(target, board) { }

        hasKeyword(keyword) {
            const kw = keyword.toLowerCase();
            if (kw === 'first strike' && this.rules_text?.toLowerCase().includes('agile')) return true;
            if (kw === 'flying' && this.flyingCounters > 0) return true;
            if (kw === 'menace' && this.menaceCounters > 0) return true;
            if (kw === 'first strike' && this.firstStrikeCounters > 0) return true;
            if (kw === 'vigilance' && this.vigilanceCounters > 0) return true;
            if (kw === 'lifelink' && this.lifelinkCounters > 0) return true;
            
            // STATIC BOARD EFFECTS
            const board = (state.phase === 'BATTLE' && state.battleBoards) ? 
                          (this.owner === 'player' ? state.battleBoards.player : state.battleBoards.opponent) : 
                          state.player.board;

            // CHECK ENCHANTMENTS FIRST (Precise check)
            if (this.enchantments?.some(e => {
                const text = e.rules_text?.toLowerCase() || "";
                const regex = new RegExp(`(^|[\\n,])\\s*${kw}(\\s*|[\\n,]|$)`, 'i');
                return regex.test(text);
            })) return true;

            if (!this.rules_text) return false;
            const regex = new RegExp(`(^|[\\n,])\\s*${kw}(\\s*|[\\n,]|$)`, 'i');
            return regex.test(this.rules_text);
        }

        clone() {
            const newCard = CardFactory.create(this);
            newCard.counters = this.counters;
            newCard.flyingCounters = this.flyingCounters;
            newCard.menaceCounters = this.menaceCounters;
            newCard.firstStrikeCounters = this.firstStrikeCounters;
            newCard.vigilanceCounters = this.vigilanceCounters;
            newCard.lifelinkCounters = this.lifelinkCounters;
            newCard.isFoil = this.isFoil;
            newCard.indestructibleUsed = this.indestructibleUsed;
            newCard.enchantments = this.enchantments.map(e => (e instanceof BaseCard ? e.clone() : CardFactory.create(e)));
            return newCard;
        }
    }

    function proliferate(board, owner, multiplier) {
        board.forEach(c => {
            if (c.owner === owner) {
                if (c.counters > 0) c.counters += multiplier;
                if (c.flyingCounters > 0) c.flyingCounters += multiplier;
                if (c.menaceCounters > 0) c.menaceCounters += multiplier;
                if (c.firstStrikeCounters > 0) c.firstStrikeCounters += multiplier;
                if (c.vigilanceCounters > 0) c.vigilanceCounters += multiplier;
                if (c.lifelinkCounters > 0) c.lifelinkCounters += multiplier;
            }
        });
    }

    function traverseCirrusea(source, board) {
        const multiplier = source.isFoil ? 2 : 1;
        for (let i = 0; i < multiplier; i++) {
            if (state.plane !== 'Cirrusea') {
                state.plane = 'Cirrusea';
                // Create 1/2 Bird Token with Flying
                if (board.length < boardLimit) {
                    const bird = createToken('Bird', 'AEX', 'player');
                    if (bird) board.push(bird);
                }
            } else {
                // Already in Cirrusea: Trigger targeting for Flying or +1/+1
                state.targetingEffect = {
                    sourceId: source.id,
                    effect: 'traverse_cirrusea_grant',
                    wasCast: true,
                    isFoil: source.isFoil
                };
            }
        }
    }

    // --- Specialized Card Subclasses ---

    class SoulsmokeAdept extends BaseCard {
        getDynamicBuffs(board) {
            return (this.isEmbattled) ? { p: 1, t: 0 } : { p: 0, t: 0 };
        }
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'lifelink') return this.isEmbattled;
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

    class DutifulCamel extends BaseCard {
        onETB(board) {
            // This triggers a UI targeting phase
            state.targetingEffect = { 
                sourceId: this.id, 
                effect: 'dutiful_camel_counter', 
                isDouble: this.isFoil,
                wasCast: true
            };
        }
    }

    class RottenCarcass extends BaseCard {
        onDeath(board, owner) {
            const token = createToken('Construct', 'ACE', owner);
            if (token) token.pt = "2/2"; // Override the 1/1 to be 2/2
            return token ? [token] : [];
        }
    }

    class IntliAssaulter extends BaseCard {
        onAction() {
            state.targetingEffect = { 
                sourceId: this.id, 
                effect: 'intli_sacrifice'
            };
        }
    }

    class RakkiriArcher extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            return (this.isEmbattled) ? { p: base.p, t: base.t + 1 } : base;
        }
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'reach') {
                return this.isEmbattled;
            }
            return super.hasKeyword(keyword);
        }
    }

    class LakeCaveLurker extends BaseCard {
        onDeath(board, owner) {
            if (owner === 'player') {
                if (state.phase === 'SHOP') {
                    state.player.gold += 1;
                } else {
                    state.player.treasures += 1;
                }
            }
            return [];
        }
    }

    class Divination extends BaseCard {
        onCast(board) {
            const times = this.isFoil ? 2 : 1;
            addCardsToShop(2 * times, 'creature');
        }
    }

    class ScientificInquiry extends BaseCard {
        onCast(board) {
            const multiplier = this.isFoil ? 2 : 1;
            state.player.treasures += multiplier;
            addScry(2 * multiplier);
        }
    }

    class ToBattle extends BaseCard {
        onApply(target, board) {
            const multiplier = this.isFoil ? 2 : 1;
            target.counters += multiplier;
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'To Battle', rules_text: 'Haste' });
        }
    }

    class FaithInDarkness extends BaseCard {
        onApply(target, board) {
            const multiplier = this.isFoil ? 2 : 1;
            addScry(1 * multiplier);
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push(this);
        }
    }

    class ByBloodAndVenom extends BaseCard {
        onApply(target, board) {
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push(this);
        }
    }

    class ExoticGameHunter extends BaseCard {
        onShopEndStep(board) {
            if (state.creaturesDiedThisShopPhase) {
                const multiplier = this.isFoil ? 2 : 1;
                this.counters += multiplier;
            }
        }
    }

    class CankerousHog extends BaseCard {
        onDeath(board, owner) {
            if (!state.battleBoards) return []; // Fizzle if not in combat
            const opponentBoard = (owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
            const validTargets = opponentBoard.filter(c => c.getDisplayStats(opponentBoard).t > 0);
            
            if (validTargets.length > 0) {
                const target = validTargets[Math.floor(Math.random() * validTargets.length)];
                const multiplier = this.isFoil ? 2 : 1;
                target.tempPower -= (2 * multiplier);
                target.tempToughness -= (2 * multiplier);
                
                setTimeout(() => {
                    const el = document.getElementById(`card-${target.id}`);
                    if (el) {
                        el.classList.add('shake');
                        setTimeout(() => el.classList.remove('shake'), 300);
                        showDamageBubble(target.id, 2 * multiplier, 'debuff-bubble');
                    }
                }, 100);
            }
            return [];
        }
    }

    class ShriekingPusbag extends BaseCard {
        onETB(board) {
            state.targetingEffect = {
                sourceId: this.id,
                effect: 'pusbag_sacrifice',
                wasCast: true
            };
        }
    }

    class ExecutionersMadness extends BaseCard { }

    class EarthrattleXali extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += multiplier;
            this.tempToughness += multiplier;
        }
    }

    class DynamicWyvern extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            if (!this.enchantments) this.enchantments = [];
            this.enchantments.push({ card_name: 'Dynamic Wyvern Grant', rules_text: 'Flying' });
        }
    }

    class BristledDirebear extends BaseCard { }

    class ConsultTheDewdrops extends BaseCard {
        onCast(board) {
            const noncreatures = availableCards.filter(c => 
                c.type && !c.type.toLowerCase().includes('creature') && 
                c.shape !== 'token' && 
                c.card_name !== 'Consult the Dewdrops' &&
                (c.tier || 1) <= state.player.tier
            );
            const selection = [];
            const count = this.isFoil ? 8 : 4;
            for (let i = 0; i < count; i++) {
                selection.push(CardFactory.create(noncreatures[Math.floor(Math.random() * noncreatures.length)]));
            }
            state.discovery = {
                cards: selection,
                title: 'DISCOVER',
                text: 'Choose a noncreature card to add to your hand.'
            };
        }
    }

    class EnvoyOfThePure extends BaseCard {
        onETB(board) {
            const multiplier = this.isFoil ? 2 : 1;
            board.forEach(c => {
                if (c.id !== this.id) {
                    c.tempPower += multiplier;
                    c.tempToughness += multiplier;
                    if (!c.enchantments) c.enchantments = [];
                    c.enchantments.push({ card_name: 'Envoy Grant', rules_text: 'Vigilance' });
                }
            });
        }
    }

    class CentaurWayfinder extends BaseCard {
        onAttack(board) {
            const centaurs = board.filter(c => c.type?.includes('Centaur'));
            // Shuffle to pick random
            for (let i = centaurs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [centaurs[i], centaurs[j]] = [centaurs[j], centaurs[i]];
            }
            const multiplier = this.isFoil ? 2 : 1;
            const targets = centaurs.slice(0, 2);
            targets.forEach(c => {
                c.tempPower += multiplier;
                c.tempToughness += multiplier;
            });
            return targets;
        }
    }

    class WarbandLieutenant extends BaseCard {
        getDynamicBuffs(board) {
            const multiplier = this.isFoil ? 2 : 1;
            return { p: 0, t: 0 }; // Buff is GIVEN to others, not received by self usually in these lords
        }
        // Lord logic needs a way to buff OTHERS. 
        // We can check board for other Lords.
    }

    class WarriorsWays extends BaseCard {
        onApply(target, board) {
            // Step 1: Pick creature for +2/+2
            // Step 2: Pick Centaur for counter
            state.targetingEffect = {
                sourceId: this.id,
                buffTargetId: target.id,
                effect: 'warrior_ways_step2',
                isFoil: this.isFoil
            };
        }
    }

    class StratusTraveler extends BaseCard {
        onETB(board) {
            traverseCirrusea(this, board);
        }
    }

    class WilderkinZealot extends BaseCard {
        onCombatStart(board) {
            const stats = this.getDisplayStats(board);
            const hasFerocious = board?.some(c => c.getDisplayStats(board).p >= 4);
            if (hasFerocious) {
                const multiplier = this.isFoil ? 2 : 1;
                this.counters += multiplier;
            }
        }
        onAction() {
            if (state.player.gold >= 2) {
                state.targetingEffect = {
                    sourceId: this.id,
                    effect: 'wilderkin_zealot_trample',
                    cost: 2,
                    isFoil: this.isFoil
                };
            }
        }
    }

    class BellowingGiant extends BaseCard { }

    class BwemaTheRuthless extends BaseCard {
        onETB(board) {
            // Choice of two different counters
            const multiplier = this.isFoil ? 2 : 1;
            const options = [
                { card_name: 'Menace Counter', rules_text: 'Menace', type: 'Counter' },
                { card_name: 'First Strike Counter', rules_text: 'First strike', type: 'Counter' },
                { card_name: 'Vigilance Counter', rules_text: 'Vigilance', type: 'Counter' },
                { card_name: 'Lifelink Counter', rules_text: 'Lifelink', type: 'Counter' }
            ];

            state.discovery = {
                cards: options.map(o => CardFactory.create(o)),
                isBwema: true,
                count: 1,
                remaining: multiplier * 2,
                sourceId: this.id,
                chosen: []
            };
        }
    }

    class SilverhornTactician extends BaseCard {
        onETB(board) {
            const hasAnyCounter = board?.some(c => (c.counters > 0 || c.flyingCounters > 0 || 
                                                 c.menaceCounters > 0 || c.firstStrikeCounters > 0 || 
                                                 c.vigilanceCounters > 0 || c.lifelinkCounters > 0) &&
                                                 c.owner === this.owner);
            if (hasAnyCounter) {
                state.targetingEffect = {
                    sourceId: this.id,
                    effect: 'permutate_step1',
                    wasCast: true,
                    isFoil: this.isFoil
                };
            }
        }
    }

    class ScarhornCleaver extends BaseCard { }

    class WindsongApprentice extends BaseCard {
        onETB(board) {
            traverseCirrusea(this, board);
        }
    }

    class CautherHellkite extends BaseCard {
        onAttack(board) {
            if (!state.battleBoards) return [];
            const opponentBoard = (this.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
            const multiplier = this.isFoil ? 2 : 1;
            
            opponentBoard.forEach(c => {
                c.damageTaken += multiplier;
                // Animation
                setTimeout(() => {
                    const el = document.getElementById(`card-${c.id}`);
                    if (el) {
                        el.classList.add('shake');
                        setTimeout(() => el.classList.remove('shake'), 300);
                        showDamageBubble(c.id, multiplier);
                    }
                }, 100);
            });
            return [];
        }
    }

    class VividGriffin extends BaseCard {
        onCombatStart(board) {
            const stats = this.getDisplayStats(board);
            const base = this.getBasePT();
            if (stats.p > base.p) {
                if (!this.enchantments) this.enchantments = [];
                this.enchantments.push({ card_name: 'Resolute Lifelink', rules_text: 'Lifelink' });
            }
        }
    }

    class NestMatriarch extends BaseCard {
        onETB(board) {
            state.targetingEffect = {
                sourceId: this.id,
                effect: 'nest_matriarch_buff',
                wasCast: true,
                isFoil: this.isFoil
            };
        }
    }

    class LingeringLunatic extends BaseCard {
        onETB(board) {
            const multiplier = this.isFoil ? 2 : 1;
            proliferate(board, this.owner, multiplier);
        }
    }

    class AlluringWisps extends BaseCard {
        onAttack(board) {
            if (!state.battleBoards) return [];
            const opponentBoard = (this.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
            if (opponentBoard.length > 0) {
                const target = opponentBoard[Math.floor(Math.random() * opponentBoard.length)];
                const multiplier = this.isFoil ? 2 : 1;
                target.tempPower -= (2 * multiplier);

                // For the animation sequence, return the target
                return [target];
            }
            return [];
        }
    }
    class RapaciousSprite extends BaseCard {
        onETB(board) {
            const multiplier = this.isFoil ? 2 : 1;
            state.player.treasures += multiplier;
        }
    }

    class UpInArms extends BaseCard {
        onApply(target, board) {
            // Step 1: Pick creature for +1/+1 counter
            // If target is null, we are initializing the first step
            if (!target) {
                state.targetingEffect = {
                    sourceId: this.id,
                    effect: 'up_in_arms_step1',
                    wasCast: true,
                    spellInstance: this
                };
                return;
            }
            
            // Step 2 initialization (this was the old onApply body)
            state.targetingEffect = {
                sourceId: this.id,
                target1Id: target.id,
                effect: 'up_in_arms_step2',
                isFoil: this.isFoil
            };
        }
    }

    class MiengWhoDancesWithDragons extends BaseCard {
        transform() {
            // Becomes 4/4 Dragon with Flying
            const base = this.getBasePT();
            this.tempPower += (4 - base.p);
            this.tempToughness += (4 - base.t);
            if (!this.enchantments) this.enchantments = [];
            this.enchantments.push({ card_name: 'Mieng Transformation', rules_text: 'Flying' });
        }
    }

    class DraconicCinderlance extends BaseCard { }

    class CabracansFamiliar extends BaseCard { }

    class Bushwhack extends BaseCard {
        onApply(target, board) {
            const multiplier = this.isFoil ? 2 : 1;
            target.tempPower += (4 * multiplier);
            target.tempToughness += (2 * multiplier);
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Bushwhack Grant', rules_text: 'Trample' });
        }
    }

    class MoonlightStag extends BaseCard {
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'vigilance') {
                return this.counters > 0 || this.vigilanceCounters > 0;
            }
            return super.hasKeyword(keyword);
        }
    }

    class GnomishSkirmisher extends BaseCard {
        onAttack(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const others = board.filter(c => c.id !== this.id);
            others.forEach(c => {
                c.tempPower += multiplier;
            });
            return others;
        }
    }

    class SiegeFalcon extends BaseCard {
        onAttack(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const others = board.filter(c => c.id !== this.id);
            others.forEach(c => {
                c.tempPower += multiplier;
            });
            return others;
        }
    }

    class Foresee extends BaseCard {
        onCast(board) {
            const multiplier = this.isFoil ? 2 : 1;
            addScry(4 * multiplier, () => {
                // Add two creatures to shop divination-style (adds to current, uses scry queue)
                addCardsToShop(2 * multiplier, 'creature');
                render();
            });
        }
    }

    class FightSong extends BaseCard {
        onApply(target, board) {
            const multiplier = this.isFoil ? 2 : 1;
            target.counters += multiplier;
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Fight Song Grant', rules_text: 'Indestructible' });
        }
    }

    class EdgeOfTheSeats extends BaseCard {
        async onCast(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const lifeGain = board.length * multiplier;
            
            board.forEach(c => {
                c.tempPower += multiplier;
                c.tempToughness += multiplier;
            });

            if (lifeGain > 0) {
                state.player.fightHp += lifeGain;
                triggerLifeGain('player');
                
                // Lifegain Animation
                const fightHpEl = document.querySelector('.player-fight-hp');
                if (fightHpEl) {
                    fightHpEl.style.display = 'flex';
                    fightHpEl.classList.add('lifegain-pulse');
                    setTimeout(() => {
                        fightHpEl.classList.remove('lifegain-pulse');
                        if (state.phase !== 'BATTLE') fightHpEl.style.display = 'none';
                    }, 1000);
                }
            }
        }
    }

    class PungentBeetle extends BaseCard {
        onETB(board) {
            const multiplier = this.isFoil ? 2 : 1;
            this.counters += (state.shopDeathsCount * multiplier);
        }
    }

    class DevilsChild extends BaseCard {
        onOtherCreatureDeath(board) {
            const multiplier = this.isFoil ? 2 : 1;
            this.counters += multiplier;
        }
    }

    class RazorbackTrenchrunner extends BaseCard {
        onDeath(board, owner) {
            const token = createToken('Ox', 'KOD', owner);
            if (token) {
                token.id = `ox-${Math.random()}`;
                // CUSTOM: Trigger immediate attack logic for the spawn ONLY in battle
                if (state.phase === 'BATTLE') {
                    token.isTrenchrunnerSpawn = true; 
                }
                return [token];
            }
            return [];
        }
    }

    class SporegraftSlime extends BaseCard {
        onDeath(board, owner) {
            // Both shop and combat: Target random friendly creature (not dying)
            const friends = board.filter(c => c.id !== this.id && c.getDisplayStats(board).t > 0);
            if (friends.length > 0) {
                const target = friends[Math.floor(Math.random() * friends.length)];
                const multiplier = this.isFoil ? 2 : 1;
                target.counters += (2 * multiplier);
                
                // Pulsing feedback if in combat
                if (state.phase === 'BATTLE') {
                    const el = document.getElementById(`card-${target.id}`);
                    if (el) {
                        const ptBox = el.querySelector('.card-pt');
                        if (ptBox) {
                            ptBox.classList.add('pulse-stats');
                            setTimeout(() => ptBox.classList.remove('pulse-stats'), 500);
                        }
                    }
                }
            }
            return [];
        }
    }

    class CovetousWechuge extends BaseCard {
        onAction() {
            state.targetingEffect = { 
                sourceId: this.id, 
                effect: 'wechuge_sacrifice'
            };
        }
    }

    class ArroydPassShepherd extends BaseCard { }

    class WarbandRallier extends BaseCard {
        onETB(board) {
            state.targetingEffect = {
                sourceId: this.id,
                effect: 'warband_rallier_counters',
                wasCast: true,
                isFoil: this.isFoil
            };
        }
    }

    class CybresBandRecruiter extends BaseCard {
        onETB(board) {
            const token = createToken('Centaur Knight', 'GSC', 'player');
            if (token) {
                const idx = board.indexOf(this);
                if (idx !== -1) {
                    board.splice(idx + 1, 0, token);
                    // Broadcast ETB
                    board.forEach(c => {
                        if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                    });
                }
            }
            if (this.isFoil) {
                const token2 = createToken('Centaur Knight', 'GSC', 'player');
                if (token2) {
                    const idx = board.indexOf(this);
                    if (idx !== -1) {
                        board.splice(idx + 1, 0, token2);
                        // Broadcast ETB
                        board.forEach(c => {
                            if (c.id !== token2.id) c.onOtherCreatureETB(token2, board);
                        });
                    }
                }
            }
        }
    }

    class CybresClanSquire extends BaseCard {
        onOtherCreatureETB(newCard, board) {
            if (newCard.type?.includes('Centaur') && newCard.owner === this.owner) {
                const multiplier = this.isFoil ? 2 : 1;
                this.counters += multiplier;
            }
        }
    }

    class CybresBandLancer extends BaseCard {
        onAttack(board) {
            const otherCentaurs = board.filter(c => c.id !== this.id && c.type?.includes('Centaur'));
            if (otherCentaurs.length > 0) {
                const target = otherCentaurs[Math.floor(Math.random() * otherCentaurs.length)];
                const multiplier = this.isFoil ? 2 : 1;
                target.tempPower += multiplier;
                target.tempToughness += multiplier;
                if (!target.enchantments) target.enchantments = [];
                if (!target.enchantments.some(e => e.card_name === 'Lancer First Strike')) {
                    target.enchantments.push({ card_name: 'Lancer First Strike', rules_text: 'First strike' });
                }
                return [target];
            }
            return [];
        }
    }

    class FinwingDrake extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += multiplier;
            this.tempToughness += multiplier;
        }
    }

    class ShrewdParliament extends BaseCard {
        onETB(board) {
            // Must have a graveyard and at least ONE OTHER card in hand (Parliament is still in hand during ETB)
            if (state.player.spellGraveyard.length > 0 && state.player.hand.length > 1) {
                state.targetingEffect = {
                    sourceId: this.id,
                    effect: 'parliament_discard',
                    wasCast: true,
                    isFoil: this.isFoil
                };
            }
        }
    }

    class CoralhideWurm extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.counters += multiplier;
        }
    }

    class AetherGuzzler extends BaseCard {
        onNoncreatureCast(isFoilCast, board) {
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            board.forEach(c => {
                c.tempPower += multiplier;
            });
        }
    }

    class DewdropOracle extends BaseCard {
        onETB(board) {
            const noncreatures = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
            const selection = [];
            const multiplier = this.isFoil ? 2 : 1;
            for (let i = 0; i < 4 * multiplier; i++) {
                selection.push(CardFactory.create(noncreatures[Math.floor(Math.random() * noncreatures.length)]));
            }
            state.discovery = {
                cards: selection,
                title: 'DISCOVER',
                text: 'Choose a noncreature card to add to your hand.'
            };
        }
    }

    const CardFactory = {
        create(data) {
            const name = data.card_name;
            let card;
            switch(name) {
                case 'Soulsmoke Adept': card = new SoulsmokeAdept(data); break;
                case 'Glumvale Raven': card = new GlumvaleRaven(data); break;
                case 'War-Clan Dowager': card = new WarClanDowager(data); break;
                case 'Sparring Campaigner': card = new SparringCampaigner(data); break;
                case 'Impressible Cub': card = new ImpressibleCub(data); break;
                case 'Clairvoyant Koi': card = new ClairvoyantKoi(data); break;
                case 'Blistering Lunatic': card = new BlisteringLunatic(data); break;
                case 'Earthrattle Xali': card = new EarthrattleXali(data); break;
                case 'Dynamic Wyvern': card = new DynamicWyvern(data); break;
                case 'Bristled Direbear': card = new BristledDirebear(data); break;
                case 'Consult the Dewdrops': card = new ConsultTheDewdrops(data); break;
                case 'Envoy of the Pure': card = new EnvoyOfThePure(data); break;
                case 'Centaur Wayfinder': card = new CentaurWayfinder(data); break;
                case 'Warband Lieutenant': card = new WarbandLieutenant(data); break;
                case 'Warrior\'s Ways': card = new WarriorsWays(data); break;
                case 'Stratus Traveler': card = new StratusTraveler(data); break;
                case 'Alluring Wisps': card = new AlluringWisps(data); break;
                case 'Rapacious Sprite': card = new RapaciousSprite(data); break;
                case 'Up in Arms': card = new UpInArms(data); break;
                case 'Mieng, Who Dances With Dragons': card = new MiengWhoDancesWithDragons(data); break;
                case 'Draconic Cinderlance': card = new DraconicCinderlance(data); break;
                case 'Cabracan\'s Familiar': card = new CabracansFamiliar(data); break;
                case 'Bushwhack': card = new Bushwhack(data); break;
                case 'Moonlight Stag': card = new MoonlightStag(data); break;
                case 'Gnomish Skirmisher': card = new GnomishSkirmisher(data); break;
                case 'Siege Falcon': card = new SiegeFalcon(data); break;
                case 'Foresee': card = new Foresee(data); break;
                case 'Fight Song': card = new FightSong(data); break;
                case 'Edge of Their Seats': card = new EdgeOfTheSeats(data); break;
                case 'Finwing Drake': card = new FinwingDrake(data); break;
                case 'Shrewd Parliament': card = new ShrewdParliament(data); break;
                case 'Coralhide Wurm': card = new CoralhideWurm(data); break;
                case 'Aether Guzzler': card = new AetherGuzzler(data); break;
                case 'Dewdrop Oracle': card = new DewdropOracle(data); break;
                case 'Arroyd Pass Shepherd': card = new ArroydPassShepherd(data); break;
                case 'Warband Rallier': card = new WarbandRallier(data); break;
                case 'Cybres-Band Recruiter': card = new CybresBandRecruiter(data); break;
                case 'Cybres-Clan Squire': card = new CybresClanSquire(data); break;
                case 'Cybres-Band Lancer': card = new CybresBandLancer(data); break;
                case 'Windsong Apprentice': card = new WindsongApprentice(data); break;
                case 'Cauther Hellkite': card = new CautherHellkite(data); break;
                case 'Vivid Griffin': card = new VividGriffin(data); break;
                case 'Nest Matriarch': card = new NestMatriarch(data); break;
                case 'Lingering Lunatic': card = new LingeringLunatic(data); break;
                case 'Wilderkin Zealot': card = new WilderkinZealot(data); break;
                case 'Bellowing Giant': card = new BellowingGiant(data); break;
                case 'Bwema, the Ruthless': card = new BwemaTheRuthless(data); break;
                case 'Silverhorn Tactician': card = new SilverhornTactician(data); break;
                case 'Scarhorn Cleaver': card = new ScarhornCleaver(data); break;
                case 'Devil\'s Child': card = new DevilsChild(data); break;
                case 'Razorback Trenchrunner': card = new RazorbackTrenchrunner(data); break;
                case 'Sporegraft Slime': card = new SporegraftSlime(data); break;
                case 'Pungent Beetle': card = new PungentBeetle(data); break;
                case 'Covetous Wechuge': card = new CovetousWechuge(data); break;
                case 'Intli Assaulter': card = new IntliAssaulter(data); break;
                case 'Exotic Game Hunter': card = new ExoticGameHunter(data); break;
                case 'Cankerous Hog': card = new CankerousHog(data); break;
                case 'Shrieking Pusbag': card = new ShriekingPusbag(data); break;
                case 'Executioner\'s Madness': card = new ExecutionersMadness(data); break;
                case 'Rakkiri Archer': card = new RakkiriArcher(data); break;
                case 'Dutiful Camel': card = new DutifulCamel(data); break;
                case 'Rotten Carcass': card = new RottenCarcass(data); break;
                case 'Lake Cave Lurker': card = new LakeCaveLurker(data); break;
                case 'Divination': card = new Divination(data); break;
                case 'Scientific Inquiry': card = new ScientificInquiry(data); break;
                case 'To Battle': card = new ToBattle(data); break;
                case 'Faith in Darkness': card = new FaithInDarkness(data); break;
                case 'By Blood and Venom': card = new ByBloodAndVenom(data); break;
                default: card = new BaseCard(data);
            }
            return card;
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
            treasures: 0,
            spellGraveyard: []
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
        discovery: null,
        nextShopBonusCards: [],
        battleBoards: null,
        creaturesDiedThisShopPhase: false,
        shopDeathsCount: 0,
        plane: null
    };

    function getOpponent() {
        return state.opponents[state.currentOpponentId];
    }

    let availableCards = [];
    const handLimit = 7;
    const boardLimit = 7;

    // DOM Elements
    let playerBoardEl = (typeof document !== 'undefined') ? document.getElementById('player-board') : null;
    let playerHandEl = (typeof document !== 'undefined') ? document.getElementById('player-hand') : null;
    let shopEl = (typeof document !== 'undefined') ? document.getElementById('shop') : null;
    let rerollBtn = (typeof document !== 'undefined') ? document.getElementById('reroll-btn') : null;
    let freezeBtn = (typeof document !== 'undefined') ? document.getElementById('freeze-btn') : null;
    let tierUpBtn = (typeof document !== 'undefined') ? document.getElementById('tier-up-btn') : null;
    let tierStarsEl = (typeof document !== 'undefined') ? document.getElementById('tier-stars') : null;
    let endTurnBtn = (typeof document !== 'undefined') ? document.getElementById('end-turn-btn') : null;
    let cardTemplate = (typeof document !== 'undefined') ? document.getElementById('card-template') : null;

    // Stats and labels
    const playerHpEl = () => document.getElementById('player-hp');
    const playerFightHpEl = () => document.getElementById('player-fight-hp');
    const playerGoldEl = () => document.getElementById('player-gold');

    function resolveDiscovery(card) {
        if (!state.discovery) return;

        if (state.discovery.isBwema) {
            const source = state.player.board.find(c => c.id === state.discovery.sourceId);
            if (source) {
                // Apply the counter
                const kw = card.rules_text.toLowerCase();
                if (kw === 'menace') source.menaceCounters++;
                if (kw === 'first strike') source.firstStrikeCounters++;
                if (kw === 'vigilance') source.vigilanceCounters++;
                if (kw === 'lifelink') source.lifelinkCounters++;

                state.discovery.remaining--;
                if (state.discovery.remaining > 0) {
                    // Filter out chosen card and continue
                    state.discovery.cards = state.discovery.cards.filter(c => c.card_name !== card.card_name);
                    render();
                    return;
                }
            }
            state.discovery = null;
            render();
            return;
        }

        if (state.discovery.graveyard) {
            const idx = state.player.spellGraveyard.findIndex(s => s.id === card.id);
            if (idx !== -1) state.player.spellGraveyard.splice(idx, 1);
        }

        state.player.hand.push(card);
        state.discovery = null;
        render();
    }
    function showDamageBubble(targetOrId, amount, className = 'damage-bubble') {
        if (!targetOrId || amount <= 0) return;
        const cabinet = document.getElementById('game-cabinet');
        if (!cabinet) return;

        // If targetOrId is a string, it's an ID (without the card- prefix)
        let targetEl = (typeof targetOrId === 'string') ? document.getElementById(`card-${targetOrId}`) : targetOrId;
        if (!targetEl) return;

        const bubble = document.createElement('div');
        bubble.className = className;
        bubble.textContent = `-${amount}`;
        cabinet.appendChild(bubble);

        const startTime = Date.now();
        const duration = 1200;

        function updateBubblePosition() {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                bubble.remove();
                return;
            }

            // Re-fetch element by ID if we started with an ID to survive re-renders
            if (typeof targetOrId === 'string') {
                targetEl = document.getElementById(`card-${targetOrId}`);
            }
            if (!targetEl) {
                bubble.remove();
                return;
            }

            const rect = targetEl.getBoundingClientRect();
            const cabRect = cabinet.getBoundingClientRect();

            const style = window.getComputedStyle(cabinet);
            const matrix = new WebKitCSSMatrix(style.transform);
            const currentScale = matrix.a || 1;

            const x = ((rect.left + rect.width / 2) - cabRect.left) / currentScale;
            const y = ((rect.top + rect.height / 2) - cabRect.top) / currentScale;

            bubble.style.left = `${x}px`;
            bubble.style.top = `${y}px`;

            requestAnimationFrame(updateBubblePosition);
        }

        requestAnimationFrame(updateBubblePosition);
    }

    // Initialization
    async function init() {
        if (tierUpBtn) tierUpBtn.addEventListener('click', tierUp);
        if (rerollBtn) rerollBtn.addEventListener('click', rerollShop);
        if (endTurnBtn) endTurnBtn.addEventListener('click', () => {
            if (state.castingSpell || state.targetingEffect) {
                // Cancel Action Logic
                if (state.targetingEffect && state.targetingEffect.sourceId && state.targetingEffect.wasCast) {
                    // 1. If it's a creature already on the board (like Pusbag or Camel), return it to hand
                    const boardIndex = state.player.board.findIndex(c => c.id === state.targetingEffect.sourceId);
                    if (boardIndex !== -1) {
                        const card = state.player.board.splice(boardIndex, 1)[0];
                        state.player.hand.push(card);
                    }

                    // 2. RESTORE FOR EXECUTIONER'S MADNESS (If Step 1 happened)
                    if (state.targetingEffect.effect === 'executioner_buff_step2') {
                        if (state.targetingEffect.sacrificedCard) {
                            state.player.board.splice(state.targetingEffect.sacrificedIndex, 0, state.targetingEffect.sacrificedCard);
                        }
                    }

                    // 3. RESTORE FOR PERMUTATE (If Step 1 happened)
                    if (state.targetingEffect.effect === 'permutate_step2') {
                        const source = state.player.board.find(c => c.id === state.targetingEffect.sourceCreatureId);
                        if (source) {
                            const ct = state.targetingEffect.removedCounterType;
                            if (ct === 'plus-one') source.counters++;
                            else if (ct === 'flying') source.flyingCounters++;
                            else if (ct === 'menace') source.menaceCounters++;
                            else if (ct === 'first-strike') source.firstStrikeCounters++;
                            else if (ct === 'vigilance') source.vigilanceCounters++;
                            else if (ct === 'lifelink') source.lifelinkCounters++;
                        }
                    }
                }
                state.castingSpell = null;
                clearTargetingEffect();
                render();
            } else {
                // End Shop Phase triggers
                state.player.board.forEach(c => c.onShopEndStep(state.player.board));
                state.creaturesDiedThisShopPhase = false; 
                state.shopDeathsCount = 0; // Reset for next shop turn

                // End Turn Logic
                startBattleTurn();
            }
        });

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
        
        const scryApproveBtn = document.getElementById('scry-approve-btn');
        const scryDenyBtn = document.getElementById('scry-deny-btn');
        if (scryApproveBtn) scryApproveBtn.addEventListener('click', () => resolveScry('approve'));
        if (scryDenyBtn) scryDenyBtn.addEventListener('click', () => resolveScry('deny'));

        const discoveryCancelBtn = document.getElementById('discovery-cancel-btn');
        if (discoveryCancelBtn) discoveryCancelBtn.addEventListener('click', () => {
            state.discovery = null;
            render();
        });

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
        const starsDiv = document.createElement('div');
        starsDiv.className = 'star';
        starsDiv.textContent = '★'.repeat(state.player.tier);
        tierStarsEl.appendChild(starsDiv);

        if (state.player.tier >= 5) {
            tierUpBtn.style.background = "#555";
            tierUpBtn.style.cursor = "default";
            tierUpBtn.disabled = true;
            tierContainer.setAttribute('data-cost', ""); 
            return;
        }

        const baseCost = tierCosts[state.player.tier]; // Next tier's cost
        const currentCost = Math.max(0, baseCost - state.player.tierCostReduction);
        tierContainer.setAttribute('data-cost', currentCost);

        if (state.player.gold < currentCost) {
            tierUpBtn.style.background = "#555";
            tierUpBtn.style.cursor = "not-allowed";
            tierUpBtn.disabled = true;
        } else {
            tierUpBtn.style.background = "#bf360c";
            tierUpBtn.style.cursor = "pointer";
            tierUpBtn.disabled = false;
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
        state.player.board = state.player.board.map(c => {
            const inst = (c instanceof BaseCard ? c : CardFactory.create(c));
            inst.owner = 'player';
            return inst;
        });
        currentOpp.board = currentOpp.board.map(c => {
            const inst = (c instanceof BaseCard ? c : CardFactory.create(c));
            inst.owner = 'opponent';
            return inst;
        });

        state.player.board.forEach(c => {
            c.onCombatStart(state.player.board);
            c.indestructibleUsed = false;
        });
        currentOpp.board.forEach(c => {
            c.onCombatStart(currentOpp.board);
            c.indestructibleUsed = false;
        });

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

            // Phase 1.5: Attack Triggers
            const attackTargets = attacker.onAttack(attackerBoard);

            // SPECIAL TRIGGER: Cabracan's Familiar (Pre-fight damage)
            if (attacker.card_name === 'Cabracan\'s Familiar' && defender) {
                const multiplier = attacker.isFoil ? 2 : 1;
                const familiarDamage = 2 * multiplier;
                defender.damageTaken += familiarDamage;
                
                // Animation for pre-fight damage
                const defenderEl = document.getElementById(`card-${defender.id}`);
                if (defenderEl) {
                    const ptBox = defenderEl.querySelector('.card-pt');
                    if (ptBox) {
                        ptBox.classList.add('pulse-stats');
                        setTimeout(() => ptBox.classList.remove('pulse-stats'), 500);
                        showDamageBubble(defenderEl, familiarDamage);
                    }
                    
                    // UPDATE UI TO SHOW TOUGHNESS DROP
                    const defenderBoard = (attacker.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    const stats = defender.getDisplayStats(defenderBoard);
                    const tEl = defenderEl.querySelector('.card-t');
                    if (tEl) {
                        tEl.textContent = stats.t;
                        if (stats.t < stats.maxT) tEl.classList.add('damaged');
                    }
                }
                
                // Pause to let player see the damage result
                await new Promise(r => setTimeout(r, 600));

                // If lethal, the Familiar attack is canceled (no fight)
                const currentDefStats = defender.getDisplayStats(attackerBoard === state.battleBoards.player ? state.battleBoards.opponent : state.battleBoards.player);
                if (currentDefStats.t <= 0) {
                    attackerEl.style.transform = "";
                    attackerEl.classList.remove('attacking');
                    return; 
                }
            }

            if (attackTargets && attackTargets.length > 0) {
                // Instead of calling render() (which resets the attacker's position),
                // we manually update the P/T text of the targets.
                attackTargets.forEach(target => {
                    const targetEl = document.getElementById(`card-${target.id}`);
                    if (targetEl) {
                        const stats = target.getDisplayStats(attackerBoard);
                        const pEl = targetEl.querySelector('.card-p');
                        const tEl = targetEl.querySelector('.card-t');
                        if (pEl) pEl.textContent = stats.p;
                        if (tEl) {
                            tEl.textContent = stats.t;
                            if (stats.t < stats.maxT) tEl.classList.add('damaged');
                            else tEl.classList.remove('damaged');
                        }

                        const ptBox = targetEl.querySelector('.card-pt');
                        if (ptBox) {
                            ptBox.classList.add('pulse-stats');
                            setTimeout(() => ptBox.classList.remove('pulse-stats'), 500);
                        }
                    }
                });
                await new Promise(r => setTimeout(r, 600)); // Pause for animation
            }

            const attackerStats = attacker.getDisplayStats(attackerBoard);
            const damageDealt = attackerStats.p;

            // Phase 2: Attack Strike (FASTER movement)
            attackerEl.style.transition = "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)";
            attackerEl.style.transform = `translate(${deltaX * 0.6}px, ${deltaY * 0.6}px) scale(1.3)`;
            await new Promise(r => setTimeout(r, 180));

            // Phase 3: Impact calculations
            const hasFirstStrike = attacker.hasKeyword('First strike');
            let { defenderDamageTaken, attackerDamageTaken, trampleOverflow, trampleTarget } = resolveCombatImpact(attacker, defender, hasFirstStrike);

            // RETALIATION LOGIC: If Attacker has FS, we check if defender survived. 
            // If Attacker DOES NOT have FS, damage was already handled simultaneously in resolveCombatImpact.
            if (hasFirstStrike && defender && !trampleTarget) {
                const defenderBoard = (attacker.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                const currentDefStats = defender.getDisplayStats(defenderBoard);
                if (currentDefStats.t > 0) {
                    // Defender survived FS, hits back
                    attackerDamageTaken = currentDefStats.p;
                    attacker.damageTaken += attackerDamageTaken;
                }
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

                // TRAMPLE ANIMATIONS
                if (trampleOverflow > 0) {
                    if (trampleTarget) {
                        // Splash to neighbor
                        setTimeout(() => {
                            const trampleEl = document.getElementById(`card-${trampleTarget.id}`);
                            if (trampleEl) {
                                trampleEl.classList.add('shake');
                                setTimeout(() => trampleEl.classList.remove('shake'), 300);
                                showDamageBubble(trampleEl, trampleOverflow);
                            }
                        }, 100);
                    } else {
                        // Go to face
                        setTimeout(() => {
                            const avatarId = attacker.owner === 'player' ? 'opponent-battle-avatar' : 'player-avatar';
                            const avatarEl = document.getElementById(avatarId);
                            showDamageBubble(avatarEl, trampleOverflow);
                        }, 100);
                    }
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

        const createToken = (tokenName, set, owner) => {
            const tokenData = availableCards.find(c => c.card_name === tokenName && c.shape === 'token' && (set ? c.set === set : true));
            if (tokenData) {
                const token = CardFactory.create(tokenData);
                token.id = `token-${Math.random()}`;
                token.owner = owner;
                
                // Add to combat queue if in battle
                if (state.phase === 'BATTLE' && state.battleQueues) {
                    state.battleQueues[owner].push(token);
                }

                // Trigger Mieng if it's player board
                if (owner === 'player') {
                    triggerMiengFerocious(token.getDisplayStats(state.player.board).p, state.player.board);
                }

                return token;
            }
            return null;
        };

        await new Promise(r => setTimeout(r, 200));

        // INITIALIZE QUEUES
        state.battleQueues = {
            player: state.battleBoards.player.filter(c => !c.isLockedByChivalry),
            opponent: state.battleBoards.opponent.filter(c => !c.isLockedByChivalry)
        };
        state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';

        // MAIN COMBAT LOOP
        while (state.player.fightHp > 0 && currentOpp.fightHp > 0 && 
              (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0)) {
            
            const currentQueue = state.battleQueues[state.attackerSide];
            if (currentQueue.length > 0) {
                const attacker = currentQueue.shift();
                
                // Verify attacker is still alive and on the board snapshot
                const attackerBoard = (state.attackerSide === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
                if (attackerBoard.includes(attacker) && !attacker.isDying) {
                    const defenderBoard = (state.attackerSide === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    const defender = findTarget(attacker, defenderBoard);
                    
                    await performAttack(attacker, defender);
                    await resolveDeaths();

                    // If attacker survived, return to back of queue
                    if (attackerBoard.includes(attacker) && !attacker.isDying) {
                        currentQueue.push(attacker);
                    }
                }
            }

            // Flip side
            state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
            await new Promise(r => setTimeout(r, 100));
        }

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

    function fillShopSlots(creatureBonus = 0, spellBonus = 0) {
        const creaturesTarget = state.player.tier + 2 + creatureBonus;
        const spellsTarget = 1 + spellBonus;

        // 1. Fill from scry queue first
        let i = 0;
        while (i < state.nextShopBonusCards.length) {
            const card = state.nextShopBonusCards[i];
            const isCreature = card.type?.toLowerCase().includes('creature');
            if (isCreature && state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length < creaturesTarget) {
                state.shop.cards.push(CardFactory.create(state.nextShopBonusCards.splice(i, 1)[0]));
            } else if (!isCreature && state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature')).length < spellsTarget) {
                state.shop.cards.push(CardFactory.create(state.nextShopBonusCards.splice(i, 1)[0]));
            } else {
                i++;
            }
        }

        const creaturePool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
        const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);

        // 2. Fill remaining slots
        while (state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length < creaturesTarget) {
            state.shop.cards.push(CardFactory.create(creaturePool[Math.floor(Math.random() * creaturePool.length)]));
        }
        while (state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature')).length < spellsTarget) {
            state.shop.cards.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
        }
    }

    function populateShop() {
        if (state.shop.frozen) {
            state.shop.frozen = false;
            if (freezeBtn) freezeBtn.classList.remove('frozen');
            const img = document.getElementById('freeze-img');
            if (img) img.src = 'img/unlocked.png';
            fillShopSlots();
            return;
        }

        state.shop.cards = [];
        fillShopSlots();
    }

    function triggerMiengFerocious(power, board) {
        if (power >= 4) {
            board.forEach(c => {
                if (c.card_name === 'Mieng, Who Dances With Dragons') {
                    c.transform();
                }
            });
        }
    }

    function triggerLifeGain(owner) {
        const board = (state.phase === 'BATTLE' && state.battleBoards) ? 
                      (owner === 'player' ? state.battleBoards.player : state.battleBoards.opponent) : 
                      state.player.board;
        if (board) {
            board.forEach(c => c.onLifeGain(board));
        }

        // Animation
        const avatarId = (owner === 'player') ? 'player-avatar' : 'opponent-battle-avatar';
        const avatarEl = document.getElementById(avatarId);
        if (avatarEl) {
            const fightHpEl = avatarEl.querySelector('.fight-hp');
            if (fightHpEl) {
                fightHpEl.style.display = 'flex';
                fightHpEl.classList.add('lifegain-pulse');
                setTimeout(() => {
                    fightHpEl.classList.remove('lifegain-pulse');
                    // Only hide if we're not in battle phase
                    if (state.phase !== 'BATTLE') fightHpEl.style.display = 'none';
                }, 800);
            }
        }
    }

    function addCardsToShop(count, typeFilter = 'creature') {
        for (let i = 0; i < count; i++) {
            if (state.shop.cards.length >= 7) break; 

            // If scry queue has a creature, pull it.
            let scryIdx = state.nextShopBonusCards.findIndex(c => c.type?.toLowerCase().includes('creature'));
            if (scryIdx !== -1) {
                state.shop.cards.push(CardFactory.create(state.nextShopBonusCards.splice(scryIdx, 1)[0]));
            } else {
                // Otherwise pull random creature from pool
                const pool = availableCards.filter(c => {
                    const matchesTier = (c.tier || 1) <= state.player.tier;
                    const matchesType = c.type?.toLowerCase().includes('creature');
                    return matchesTier && matchesType && c.shape !== 'token';
                });
                if (pool.length > 0) {
                    state.shop.cards.push(CardFactory.create(pool[Math.floor(Math.random() * pool.length)]));
                }
            }
        }
        render();
    }

    function buyCard(cardId) {
        if (state.phase !== 'SHOP') return;
        const cardIndex = state.shop.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.shop.cards[cardIndex];
        
        let cost = 3; // Default for creatures
        if (!card.type.toLowerCase().includes('creature')) {
            cost = card.tier || 1;
        }

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
            instance.owner = 'player';

            if (targetIndex !== -1) {
                state.player.board.splice(targetIndex, 0, instance);
            } else {
                state.player.board.push(instance);
            }

            // Trigger 1 (Standard or First trigger of Foil)
            instance.onETB(state.player.board);
            // Trigger 2 if Foil
            if (instance.isFoil) instance.onETB(state.player.board);

            // Defer broadcast if we just entered targeting mode
            if (state.targetingEffect && state.targetingEffect.sourceId === instance.id) {
                state.targetingEffect.needsETBBroadcast = true;
            } else {
                // Broadcast ETB to OTHERS
                state.player.board.forEach(c => {
                    if (c.id !== instance.id) c.onOtherCreatureETB(instance, state.player.board);
                });
            }
            // Mieng Trigger
            triggerMiengFerocious(instance.getDisplayStats(state.player.board).p, state.player.board);

            state.player.hand.splice(cardIndex, 1);
        }
 else {
            const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
            const targetedNames = ['To Battle', 'Faith in Darkness', 'By Blood and Venom', 'Bushwhack', 'Fight Song'];
            
            if (instance.card_name === 'Executioner\'s Madness') {
                state.targetingEffect = {
                    sourceId: instance.id,
                    effect: 'executioner_sacrifice_step1',
                    wasCast: true,
                    spellInstance: instance
                };
            } else if (instance.card_name === 'Warrior\'s Ways') {
                state.targetingEffect = {
                    sourceId: instance.id,
                    effect: 'warrior_ways_step1', 
                    wasCast: true,
                    isFoil: instance.isFoil
                };
            } else if (instance.card_name === 'Warrior\'s Ways') {
                state.targetingEffect = {
                    sourceId: instance.id,
                    effect: 'warrior_ways_step1',
                    wasCast: true,
                    spellInstance: instance
                };
            } else if (instance.card_name === 'Up in Arms') {
                instance.onApply(null, state.player.board); // onApply handles the state initialization
            } else if (targetedNames.includes(instance.card_name)) {

                state.castingSpell = instance;
            } else {
                instance.onCast(state.player.board);
                state.player.hand.splice(cardIndex, 1);
                state.player.spellGraveyard.push(instance);
                state.player.board.forEach(c => c.onNoncreatureCast(instance.isFoil, state.player.board));
            }
        }
        render();
    }

    function clearTargetingEffect() {
        if (state.targetingEffect && state.targetingEffect.needsETBBroadcast) {
            const instance = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
            if (instance) {
                state.player.board.forEach(c => {
                    if (c.id !== instance.id) c.onOtherCreatureETB(instance, state.player.board);
                });
            }
        }
        state.targetingEffect = null;
    }

    function applyTargetedEffect(targetId, counterType = null) {
        if (!state.targetingEffect) return;
        // Search BOTH board and hand for the target
        const target = state.player.board.find(c => c.id === targetId) || state.player.hand.find(c => c.id === targetId);
        if (target) {
            if (state.targetingEffect.effect === 'dutiful_camel_counter') {
                target.counters++;
                if (state.targetingEffect.isDouble) {
                    state.targetingEffect.isDouble = false;
                    // Stay in targeting mode
                } else {
                    clearTargetingEffect();
                }
            } else if (state.targetingEffect.effect === 'intli_sacrifice') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        resolveShopDeaths(idx, target);

                        const multiplier = source.isFoil ? 2 : 1;
                        source.tempPower += (2 * multiplier);
                        source.tempToughness += (2 * multiplier);
                        clearTargetingEffect();
                    }
                }
            } else if (state.targetingEffect.effect === 'pusbag_sacrifice') {
                const idx = state.player.board.indexOf(target);
                if (idx !== -1) {
                    resolveShopDeaths(idx, target);
                    clearTargetingEffect();
                }
                } else if (state.targetingEffect.effect === 'warband_rallier_counters') {
                if (target.type?.includes('Centaur')) {
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    target.counters += (2 * multiplier);
                    clearTargetingEffect();
                }
            } else if (state.targetingEffect.effect === 'wilderkin_zealot_trample') {
                if (state.player.gold >= 2) {
                    state.player.gold -= 2;
                    if (!target.enchantments) target.enchantments = [];
                    target.enchantments.push({ card_name: 'Zealot Trample', rules_text: 'Trample' });
                    clearTargetingEffect();
                }
            } else if (state.targetingEffect.effect === 'permutate_step1') {
                if (counterType) {
                    // Remove the specific counter
                    if (counterType === 'plus-one') target.counters--;
                    else if (counterType === 'flying') target.flyingCounters--;
                    else if (counterType === 'menace') target.menaceCounters--;
                    else if (counterType === 'first-strike') target.firstStrikeCounters--;
                    else if (counterType === 'vigilance') target.vigilanceCounters--;
                    else if (counterType === 'lifelink') target.lifelinkCounters--;

                    state.targetingEffect.sourceCreatureId = target.id;
                    state.targetingEffect.removedCounterType = counterType;
                    state.targetingEffect.effect = 'permutate_step2';
                    render();
                }
            } else if (state.targetingEffect.effect === 'permutate_step2') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceCreatureId);
                if (source && target.id !== source.id) {
                    // Add two +1/+1 counters to destination
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    target.counters += (2 * multiplier);
                    clearTargetingEffect();
                }
            } else if (state.targetingEffect.effect === 'nest_matriarch_buff') {

                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const multiplier = source.isFoil ? 2 : 1;
                    target.counters += multiplier;
                    if (!target.enchantments) target.enchantments = [];
                    target.enchantments.push({ card_name: 'Nest Matriarch Grant', rules_text: 'Lifelink' });
                    clearTargetingEffect();
                    }
                    } else if (state.targetingEffect.effect === 'executioner_sacrifice_step1') {

                const idx = state.player.board.indexOf(target);
                if (idx !== -1) {
                    state.player.board.splice(idx, 1);
                    state.creaturesDiedThisShopPhase = true;
                    state.shopDeathsCount++;

                    // Move to Step 2: Buff Selection
                    state.targetingEffect.effect = 'executioner_buff_step2';
                    state.targetingEffect.sacrificedCard = target;
                    state.targetingEffect.sacrificedIndex = idx;
                }
            } else if (state.targetingEffect.effect === 'executioner_buff_step2') {
                // 1. Apply the buff to the target of click 2
                const multiplier = state.targetingEffect.spellInstance.isFoil ? 2 : 1;
                
                const applyMadnessBuff = (t) => {
                    t.tempPower += (5 * multiplier);
                    t.tempToughness += (3 * multiplier);
                    if (!t.enchantments) t.enchantments = [];
                    t.enchantments.push({ card_name: 'Executioner\'s Madness', rules_text: 'Trample' });
                };

                applyMadnessBuff(target);
                
                // ADAPTIVE: Copy the spell effect
                if (target.hasKeyword('Adaptive')) {
                    applyMadnessBuff(target);
                }

                // 2. NOW process the death triggers of the card from click 1
                const sacrificedCard = state.targetingEffect.sacrificedCard;
                const spawns = sacrificedCard.onDeath(state.player.board, 'player');
                if (spawns.length > 0) {
                    // Try to put them back where the original died, or just end of board
                    state.player.board.splice(state.targetingEffect.sacrificedIndex, 0, ...spawns);
                }

                // 3. Remove spell from hand
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                const isFoilCast = state.targetingEffect.spellInstance.isFoil;
                if (handIdx !== -1) state.player.hand.splice(handIdx, 1);
                
                // TRIGGER NONCREATURE CAST
                state.player.board.forEach(c => c.onNoncreatureCast(isFoilCast, state.player.board));

                clearTargetingEffect();
            } else if (state.targetingEffect.effect === 'warrior_ways_step1') {
                state.targetingEffect.buffTargetId = target.id;
                
                // If there are NO Centaurs to target for Step 2, skip it!
                const centaurs = state.player.board.filter(c => c.type?.includes('Centaur'));
                if (centaurs.length === 0) {
                    // Manually trigger Step 1 buff application here and end
                    const buffTarget = state.player.board.find(c => c.id === state.targetingEffect.buffTargetId);
                    if (buffTarget) {
                        const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                        buffTarget.tempPower += (2 * multiplier);
                        buffTarget.tempToughness += (2 * multiplier);
                        if (buffTarget.hasKeyword('Adaptive')) {
                            buffTarget.tempPower += (2 * multiplier);
                            buffTarget.tempToughness += (2 * multiplier);
                        }
                    }
                    const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                    const isFoilCast = state.targetingEffect.isFoil;
                    if (handIdx !== -1) state.player.hand.splice(handIdx, 1);
                    
                    // TRIGGER NONCREATURE CAST
                    state.player.board.forEach(c => c.onNoncreatureCast(isFoilCast, state.player.board));

                    clearTargetingEffect();
                } else {
                    state.targetingEffect.effect = 'warrior_ways_step2';
                }
            } else if (state.targetingEffect.effect === 'warrior_ways_step2') {
                // ... Existing warrior_ways_step2 logic ...
                // Step 1: Apply initial buff to the click 1 target
                const buffTarget = state.player.board.find(c => c.id === state.targetingEffect.buffTargetId);
                if (buffTarget) {
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    buffTarget.tempPower += (2 * multiplier);
                    buffTarget.tempToughness += (2 * multiplier);
                    
                    // ADAPTIVE
                    if (buffTarget.hasKeyword('Adaptive')) {
                        buffTarget.tempPower += (2 * multiplier);
                        buffTarget.tempToughness += (2 * multiplier);
                    }
                }

                // Step 2: Apply counter to the click 2 target (Centaur)
                if (target.type?.includes('Centaur')) {
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    target.counters += multiplier;
                }

                // Remove spell from hand
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (handIdx !== -1) state.player.hand.splice(handIdx, 1);

                clearTargetingEffect();
                } else if (state.targetingEffect.effect === 'traverse_cirrusea_grant') {

                const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                for (let i = 0; i < multiplier; i++) {
                    if (target.hasKeyword('Flying')) {
                        target.counters++;
                    } else {
                        target.flyingCounters++;
                    }
                }
                clearTargetingEffect();
                } else if (state.targetingEffect.effect === 'sporegraft_slime_counters') {
                const multiplier = state.targetingEffect.isDouble ? 2 : 1;
                target.counters += (2 * multiplier);
                clearTargetingEffect();
                } else if (state.targetingEffect.effect === 'wechuge_sacrifice') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        resolveShopDeaths(idx, target);

                        const multiplier = source.isFoil ? 2 : 1;
                        source.counters += multiplier;
                        clearTargetingEffect();
                    }
                }
            } else if (state.targetingEffect.effect === 'parliament_discard') {
                console.log("Discarding card with ID:", targetId);
                const cardIdx = state.player.hand.findIndex(c => c.id === targetId);
                if (cardIdx !== -1) {
                    state.player.hand.splice(cardIdx, 1);
                    // Trigger Discovery from Graveyard
                    state.discovery = {
                        cards: state.player.spellGraveyard.map(s => CardFactory.create(s)),
                        graveyard: true
                    };
                    clearTargetingEffect();
                }
            }
 else if (state.targetingEffect.effect === 'up_in_arms_step1') {
                state.targetingEffect.target1Id = target.id;
                state.targetingEffect.effect = 'up_in_arms_step2';
            } else if (state.targetingEffect.effect === 'up_in_arms_step2') {
                const t1 = state.player.board.find(c => c.id === state.targetingEffect.target1Id);
                const t2 = target;
                const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                const isFoilCast = state.targetingEffect.isFoil;

                if (t1 && t2) {
                    if (t1.id === t2.id && t1.hasKeyword('Adaptive')) {
                        t1.counters += (4 * multiplier);
                    } else {
                        t1.counters += (1 * multiplier);
                        t2.counters += (1 * multiplier);
                    }
                }

                // Remove spell from hand
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (handIdx !== -1) state.player.hand.splice(handIdx, 1);

                // TRIGGER NONCREATURE CAST ONLY ONCE AT END
                state.player.board.forEach(c => c.onNoncreatureCast(isFoilCast, state.player.board));

                clearTargetingEffect();
            }

                }

        render();
    }

    function resolveShopDeaths(idx, target) {
        state.player.board.splice(idx, 1);
        state.creaturesDiedThisShopPhase = true;
        state.shopDeathsCount++;

        // 1. Trigger survivor deaths
        state.player.board.forEach(c => c.onOtherCreatureDeath(state.player.board));
        // 2. Trigger onDeath
        const spawns = target.onDeath(state.player.board, 'player');
        if (spawns.length > 0) {
            state.player.board.splice(idx, 0, ...spawns);
            // Broadcast ETB for all spawns
            spawns.forEach(s => {
                state.player.board.forEach(c => {
                    if (c.id !== s.id) c.onOtherCreatureETB(s, state.player.board);
                });
            });
        }
    }

    function reorderBoard(fromIndex, toIndex) {
        if (state.phase !== 'SHOP') return;
        const [moved] = state.player.board.splice(fromIndex, 1);
        state.player.board.splice(toIndex, 0, moved);
        render();
    }

    function findTarget(attacker, defendingBoard) {
        const hasMenace = attacker.hasKeyword('Menace');

        if (attacker.hasKeyword('Flying')) {
            // Flying attackers priority 1: Vigilance with Flying or Reach (Ignored if Menace)
            if (!hasMenace) {
                const airVigilance = defendingBoard.filter(c => c.hasKeyword('Vigilance') && (c.hasKeyword('Flying') || c.hasKeyword('Reach')));
                if (airVigilance.length > 0) return airVigilance[Math.floor(Math.random() * airVigilance.length)];
            }
            
            // Flying attackers priority 2: ANY creature with Flying or Reach (Excluding Vigilance if Menace)
            const airCreatures = defendingBoard.filter(c => (c.hasKeyword('Flying') || c.hasKeyword('Reach')) && (!hasMenace || !c.hasKeyword('Vigilance')));
            if (airCreatures.length > 0) return airCreatures[Math.floor(Math.random() * airCreatures.length)];

            // Otherwise, they bypass ground creatures and attack FACE directly
            return null;
        } else { 
            // Ground attackers priority 1: Ground Vigilance (Taunt) first (Ignored if Menace)
            if (!hasMenace) {
                const groundVigilance = defendingBoard.filter(c => c.hasKeyword('Vigilance') && !c.hasKeyword('Flying'));
                if (groundVigilance.length > 0) return groundVigilance[Math.floor(Math.random() * groundVigilance.length)];
            }
            
            // Ground attackers priority 2: Ground creatures without Vigilance
            const groundCreatures = defendingBoard.filter(c => !c.hasKeyword('Flying') && (!hasMenace || !c.hasKeyword('Vigilance')));
            if (groundCreatures.length > 0) return groundCreatures[Math.floor(Math.random() * groundCreatures.length)];
            
            // Ground attackers priority 3: Flying creatures (if ONLY option left)
            if (defendingBoard.length > 0) {
                // Even if hitting air, hit the one with Vigilance first if available
                if (!hasMenace) {
                    const airVigilance = defendingBoard.filter(c => c.hasKeyword('Vigilance'));
                    if (airVigilance.length > 0) return airVigilance[Math.floor(Math.random() * airVigilance.length)];
                }
                const validBlockers = defendingBoard.filter(c => !hasMenace || !c.hasKeyword('Vigilance'));
                if (validBlockers.length > 0) return validBlockers[Math.floor(Math.random() * validBlockers.length)];
            }
            
            return null; // Face
        }
    }

    function resolveCombatImpact(attacker, defender, isFirstStrike = false) {
        const attackerBoard = (attacker.owner === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
        const attackerStats = attacker.getDisplayStats(attackerBoard);
        const damageDealt = attackerStats.p;

        let defenderDamageTaken = damageDealt;
        let attackerDamageTaken = 0;
        let trampleOverflow = 0;
        let trampleTarget = null;
        const currentOppAttack = getOpponent();

        if (defender) {
            const defenderBoard = (attacker.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
            const defenderStats = defender.getDisplayStats(defenderBoard);

            const hasTrample = attacker.hasKeyword('Trample');
            const overflow = Math.max(0, damageDealt - defenderStats.t);

            // Cap defender damage for bubbles/assignments if Trample is present
            if (hasTrample && overflow > 0) {
                defenderDamageTaken = defenderStats.t;
            }

            // INDESTRUCTIBLE PROTECTION (Defender)
            if (defender.hasKeyword('Indestructible') && !defender.indestructibleUsed) {
                if (defenderDamageTaken >= defenderStats.t) {
                    defenderDamageTaken = Math.max(0, defenderStats.t - 1);
                    defender.indestructibleUsed = true;
                }
            }

            defender.damageTaken += defenderDamageTaken;

            if (attacker.hasKeyword('Lifelink')) {
                if (attacker.owner === 'player') {
                    state.player.fightHp += defenderDamageTaken;
                    triggerLifeGain('player');
                } else if (currentOppAttack) {
                    currentOppAttack.fightHp += defenderDamageTaken;
                    triggerLifeGain('opponent');
                }
            }

            // Trample Logic (Adjacent Splash)
            if (overflow > 0 && hasTrample) {
                trampleOverflow = overflow;
                const idx = defenderBoard.indexOf(defender);
                const adjacents = [];
                if (idx > 0) adjacents.push(defenderBoard[idx - 1]);
                if (idx < defenderBoard.length - 1) adjacents.push(defenderBoard[idx + 1]);

                if (adjacents.length > 0) {
                    trampleTarget = adjacents[Math.floor(Math.random() * adjacents.length)];
                    trampleTarget.damageTaken += overflow;
                } else {
                    if (attacker.owner === 'player') {
                        if (currentOppAttack) currentOppAttack.fightHp -= overflow;
                    } else state.player.fightHp -= overflow;
                }
            }

            if (!isFirstStrike) {
                attackerDamageTaken = defenderStats.p;

                // INDESTRUCTIBLE PROTECTION (Attacker)
                const attackerStats = attacker.getDisplayStats(attackerBoard);
                if (attacker.hasKeyword('Indestructible') && !attacker.indestructibleUsed) {
                    if (attackerDamageTaken >= attackerStats.t) {
                        attackerDamageTaken = Math.max(0, attackerStats.t - 1);
                        attacker.indestructibleUsed = true;
                    }
                }
                attacker.damageTaken += attackerDamageTaken;
            }
        } else {
             const amount = damageDealt;
             if (attacker.owner === 'player') {
                if (currentOppAttack) currentOppAttack.fightHp -= amount;
             } else state.player.fightHp -= amount;
             
             if (attacker.hasKeyword('Lifelink')) {
                if (attacker.owner === 'player') {
                    state.player.fightHp += amount;
                    triggerLifeGain('player');
                } else if (currentOppAttack) {
                    currentOppAttack.fightHp += amount;
                    triggerLifeGain('opponent');
                }
             }
             
             defenderDamageTaken = amount;
        }

        return { defenderDamageTaken, attackerDamageTaken, trampleOverflow, trampleTarget };
    }

    async function resolveDeaths() {
        const isProtected = (c, board) => c.hasKeyword('Indestructible') && !c.indestructibleUsed;

        // 1. Identify everyone who is dead right now
        const deadPlayerCards = state.battleBoards.player.filter(c => 
            c.getDisplayStats(state.battleBoards.player).t <= 0 && !isProtected(c, state.battleBoards.player)
        );
        const deadOpponentCards = state.battleBoards.opponent.filter(c => 
            c.getDisplayStats(state.battleBoards.opponent).t <= 0 && !isProtected(c, state.battleBoards.opponent)
        );

        // 2. Handle Indestructible saves
        const protectedPlayer = state.battleBoards.player.filter(c => c.getDisplayStats(state.battleBoards.player).t <= 0 && isProtected(c, state.battleBoards.player));
        const protectedOpponent = state.battleBoards.opponent.filter(c => c.getDisplayStats(state.battleBoards.opponent).t <= 0 && isProtected(c, state.battleBoards.opponent));
        
        [...protectedPlayer, ...protectedOpponent].forEach(c => {
            c.indestructibleUsed = true;
            const board = protectedPlayer.includes(c) ? state.battleBoards.player : state.battleBoards.opponent;
            const stats = c.getDisplayStats(board);
            const currentT = stats.t + c.damageTaken;
            c.damageTaken = currentT - 1;
        });

        if (deadPlayerCards.length === 0 && deadOpponentCards.length === 0) {
            if (protectedPlayer.length > 0 || protectedOpponent.length > 0) render();
            return;
        }

        // 3. Mark for death and play animation
        const allDead = deadPlayerCards.concat(deadOpponentCards);
        allDead.forEach(c => {
            c.isDying = true;
            document.getElementById(`card-${c.id}`)?.classList.add('dying');
        });
        
        await new Promise(r => setTimeout(r, 500)); 

        // 4. Actually remove them and trigger death effects
        await processDeaths(state.battleBoards.player, 'player');
        await processDeaths(state.battleBoards.opponent, 'opponent');
        render();

        // 5. Special Case: Trenchrunner spawns need to attack immediately
        if (state.phase === 'BATTLE') {
            const allBoardCards = state.battleBoards.player.concat(state.battleBoards.opponent);
            for (const spawn of allBoardCards) {
                if (spawn.isTrenchrunnerSpawn) {
                    delete spawn.isTrenchrunnerSpawn;
                    const defenderBoard = (spawn.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    const target = findTarget(spawn, defenderBoard);
                    await performAttack(spawn, target, false);
                    await resolveDeaths(); 
                    break;
                }
            }
        }
        await new Promise(r => setTimeout(r, 200));

        // 6. Recurse if processDeaths created NEW dead creatures (e.g. Hog debuff)
        const anyDeadStill = state.battleBoards.player.some(c => c.getDisplayStats(state.battleBoards.player).t <= 0) ||
                           state.battleBoards.opponent.some(c => c.getDisplayStats(state.battleBoards.opponent).t <= 0);
        
        if (anyDeadStill) {
            await resolveDeaths();
        }
    }

    async function processDeaths(board, owner) {
        // Only process creatures that were marked as dying in the previous step
        const dyingCards = board.filter(c => c.isDying);
        
        // Broadcast to everyone in battle, or just this board if in shop
        const notifyPool = (state.phase === 'BATTLE' && state.battleBoards) ? 
                           state.battleBoards.player.concat(state.battleBoards.opponent) : 
                           board;

        for (const deadCard of dyingCards) {
            const idx = board.indexOf(deadCard);
            if (idx === -1) continue;

            notifyPool.forEach(c => {
                if (c.id !== deadCard.id) c.onOtherCreatureDeath(board);
            });

            let spawns = deadCard.onDeath(board, owner);
            const hasResurrection = deadCard.enchantments && deadCard.enchantments.some(e => e.card_name === 'By Blood and Venom');
            if (hasResurrection) {
                const rawData = availableCards.find(c => c.card_name === deadCard.card_name && c.set === deadCard.set);
                if (rawData) {
                    const spawned = CardFactory.create(rawData);
                    spawned.id = `returned-${Math.random()}`;
                    spawned.owner = owner;
                    spawns.push(spawned);
                }
            }
            if (spawns.length > 0) {
                const validSpawns = spawns.filter(Boolean);
                board.splice(idx, 1, ...validSpawns);

                // Add to combat queue if in battle
                if (state.phase === 'BATTLE' && state.battleQueues) {
                    validSpawns.forEach(s => state.battleQueues[owner].push(s));
                }

                // Broadcast ETB for all spawns
                validSpawns.forEach(s => {
                    notifyPool.forEach(c => {
                        if (c.id !== s.id) c.onOtherCreatureETB(s, board);
                    });
                });
            } else board.splice(idx, 1);
            
            // Remove from combat queue if in battle
            if (state.phase === 'BATTLE' && state.battleQueues) {
                state.battleQueues[owner] = state.battleQueues[owner].filter(c => c.id !== deadCard.id);
            }

            // Cleanup property
            delete deadCard.isDying;
        }
    }

    function createToken(name, set, owner) {
        const raw = availableCards.find(c => c.card_name === name && c.shape === 'token' && (set ? c.set === set : true));
        if (raw) {
            const token = CardFactory.create(raw);
            token.id = `token-${Math.random()}`;
            token.owner = owner;

            // Trigger Mieng if it's player board
            if (owner === 'player') {
                triggerMiengFerocious(token.getDisplayStats(state.player.board).p, state.player.board);
            }

            return token;
        }
        return null;
    }

    function applySpell(targetId) {
        if (!state.castingSpell) return;
        const target = state.player.board.find(c => c.id === targetId);
        if (!target) return;

        state.castingSpell.onApply(target, state.player.board);
        
        // ADAPTIVE: Copy the spell effect
        if (target.hasKeyword('Adaptive')) {
            state.castingSpell.onApply(target, state.player.board);
        }
        
        state.player.hand.splice(state.player.hand.findIndex(c => c.id === state.castingSpell.id), 1);
        const isFoil = state.castingSpell.isFoil;
        state.player.spellGraveyard.push(state.castingSpell);
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
        let gold = Math.min(2 + state.turn, 10);
        
        // 2. AI TIER UP Logic
        const nextTier = opp.tier + 1;
        if (nextTier <= 5) {
            const cost = tierCosts[opp.tier];
            const targetTurns = [0, 0, 2, 6, 10, 14]; // Turn schedule for AI Tiers
            if (state.turn >= targetTurns[nextTier] && gold >= cost) {
                gold -= cost;
                opp.tier = nextTier;
            }
        }
        opp.gold = gold;

        // 3. Ensure existing board is instances
        opp.board = opp.board.map(c => (c instanceof BaseCard) ? c : CardFactory.create(c));

        // 4. Generate a "Virtual Shop" for the AI
        const shopSize = opp.tier + 3;
        const availablePool = availableCards.filter(c => c.shape !== 'token' && (c.tier || 1) <= opp.tier); 
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

    function addScry(count, callback = null) {
        const creatures = availableCards.filter(c => c.type.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
        const newCards = [];
        for (let i = 0; i < count; i++) {
            newCards.push(creatures[Math.floor(Math.random() * creatures.length)]);
        }

        if (state.scrying) {
            state.scrying.count += count;
            state.scrying.cards.push(...newCards);
            // Chain callbacks if needed, though Foresee is the primary user
            const oldCallback = state.scrying.postScry;
            state.scrying.postScry = () => { if (oldCallback) oldCallback(); if (callback) callback(); };
        } else {
            state.scrying = {
                count: count,
                cards: newCards,
                choices: [],
                postScry: callback
            };
        }
    }

    function resolveScry(choice) {
        if (!state.scrying) return;
        if (choice === 'approve') state.nextShopBonusCards.push(state.scrying.cards[state.scrying.choices.length]);
        state.scrying.choices.push(choice);
        
        if (state.scrying.choices.length >= state.scrying.count) {
            const callback = state.scrying.postScry;
            state.scrying = null;
            if (callback) callback();
        }
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
            if (!el.classList.contains('lifegain-pulse')) {
                el.style.display = (state.phase === 'BATTLE') ? 'flex' : 'none';
            }
        });

        // Specific class for the player's fight HP to enable targeting for animations
        const playerAvatarEl = document.getElementById('player-avatar');
        if (playerAvatarEl) {
            const fHP = playerAvatarEl.querySelector('.fight-hp');
            if (fHP) fHP.classList.add('player-fight-hp');
        }

        updateTierButton();
        const oppTierEl = document.getElementById('opponent-tier');
        if (oppTierEl) oppTierEl.textContent = currentOpp.tier;

        // Scry Modal
        const scryModal = document.getElementById('scry-modal');
        if (scryModal) {
            if (state.scrying) {
                scryModal.style.display = 'flex';
                const container = document.getElementById('scry-card-container');
                container.innerHTML = '';
                const currentScryCard = state.scrying.cards[state.scrying.choices.length];
                if (currentScryCard) {
                    container.appendChild(createCardElement(currentScryCard, false, -1, []));
                }
            } else {
                scryModal.style.display = 'none';
            }
        }

        // Discovery Modal
        const discoveryModal = document.getElementById('discovery-modal');
        if (discoveryModal) {
            if (state.discovery) {
                discoveryModal.style.display = 'flex';

                const cancelBtn = document.getElementById('discovery-cancel-btn');

                const actionsContainer = document.getElementById('discovery-actions');
                if (cancelBtn) cancelBtn.style.display = 'none'; 
                if (actionsContainer) actionsContainer.style.display = 'none'; // Discovery cannot be cancelled

                const container = document.getElementById('discovery-card-container');
                container.innerHTML = '';
                if (state.discovery.graveyard) {
                    container.classList.add('graveyard-mode');
                } else {
                    container.classList.remove('graveyard-mode');
                }
                state.discovery.cards.forEach(card => {
                    if (state.discovery.isBwema) {
                        // Special Bwema UI: Circular icons with labels
                        const wrapper = document.createElement('div');
                        wrapper.className = 'discovery-item-wrapper';
                        wrapper.style.display = 'flex';
                        wrapper.style.flexDirection = 'column';
                        wrapper.style.alignItems = 'center';
                        wrapper.style.cursor = 'pointer';

                        const kw = card.rules_text.toLowerCase();
                        const icon = document.createElement('div');
                        icon.className = `counter-bubble ${kw.replace(' ', '-')}`;
                        icon.style.width = '60px';
                        icon.style.height = '60px';
                        icon.style.fontSize = '1.5em';
                        
                        const img = document.createElement('img');
                        img.src = `img/${kw.replace(' ', '-')}.png`;
                        img.alt = kw;
                        icon.appendChild(img);

                        const label = document.createElement('div');
                        label.className = 'discovery-item-label';
                        label.textContent = card.rules_text;

                        wrapper.appendChild(icon);
                        wrapper.appendChild(label);
                        wrapper.addEventListener('click', () => resolveDiscovery(card));
                        container.appendChild(wrapper);
                    } else {
                        const cardEl = createCardElement(card, false, -1, []);
                        cardEl.addEventListener('click', () => resolveDiscovery(card));
                        container.appendChild(cardEl);
                    }
                });
            } else {
                discoveryModal.style.display = 'none';
            }
        }

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
        if (instance.isDying) cardEl.classList.add('dying');
        cardEl.querySelector('.card-name').textContent = instance.card_name;
        
        const tokenSuffix = (instance.shape?.includes('token')) ? "t" : "";
        const imageName = instance.position ? instance.position : `${instance.number}${tokenSuffix}_${instance.card_name}`;
        const doubleSuffix = (instance.shape?.includes('double')) ? "_front" : "";
        const extension = instance.image_type || instance.set_image_type || "jpg";
        cardEl.querySelector('.card-art').src = `sets/${instance.set}-files/img/${imageName}${doubleSuffix}.${extension}`;
        
        const costEl = cardEl.querySelector('.card-cost');
        const isCreature = instance.type?.toLowerCase().includes('creature');
        
        if (isCreature && isShop) {
            costEl.style.display = 'flex';
            costEl.classList.remove('spell-cost');
            costEl.innerHTML = `<div class="star">${'★'.repeat(instance.tier || 1)}</div>`;
        } else if (!isCreature && isShop) {
            costEl.style.display = 'flex';
            costEl.classList.add('spell-cost');
            costEl.innerHTML = instance.tier || 1;
        } else {
            costEl.style.display = 'none';
        }
        
        const counterStackEl = cardEl.querySelector('.card-counter-stack');
        counterStackEl.innerHTML = '';
        
        const isPermutate1 = state.targetingEffect?.effect === 'permutate_step1';

        const addCounterBubble = (type, value, imgPath, rulesText) => {
            const bubble = document.createElement('div');
            bubble.className = `counter-bubble ${type}`;
            
            if (type === 'plus-one') {
                bubble.textContent = `+${value}`;
            } else {
                if (imgPath) {
                    const img = document.createElement('img');
                    img.src = imgPath;
                    img.alt = type;
                    bubble.appendChild(img);
                }
                // Overlay count if > 1
                if (value > 1) {
                    const overlay = document.createElement('div');
                    overlay.className = 'counter-count-overlay';
                    overlay.textContent = value;
                    bubble.appendChild(overlay);
                }
            }
            
            if (isPermutate1 && instance.owner === 'player') {
                bubble.classList.add('counter-clickable');
                bubble.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Permutate specific resolution logic: we tell the engine which counter we picked
                    applyTargetedEffect(instance.id, type); 
                });
            }

            counterStackEl.appendChild(bubble);
        };

        // 1. +1/+1 Counters
        if (instance.counters > 0) addCounterBubble('plus-one', instance.counters);
        // 2. Flying
        if (instance.flyingCounters > 0) addCounterBubble('flying', instance.flyingCounters, 'img/flying.png');
        // 3. Menace
        if (instance.menaceCounters > 0) addCounterBubble('menace', instance.menaceCounters, 'img/menace.png');
        // 4. First Strike
        if (instance.firstStrikeCounters > 0) addCounterBubble('first-strike', instance.firstStrikeCounters, 'img/first-strike.png');
        // 5. Vigilance
        if (instance.vigilanceCounters > 0) addCounterBubble('vigilance', instance.vigilanceCounters, 'img/vigilance.png');
        // 6. Lifelink
        if (instance.lifelinkCounters > 0) addCounterBubble('lifelink', instance.lifelinkCounters, 'img/lifelink.png');
        
        if (instance.pt) {
            const stats = instance.getDisplayStats(boardContext);
            cardEl.querySelector('.card-p').textContent = stats.p;
            cardEl.querySelector('.card-t').textContent = stats.t;
            if (stats.t < stats.maxT) cardEl.querySelector('.card-t').classList.add('damaged');
            else cardEl.querySelector('.card-t').classList.remove('damaged');
        } else cardEl.querySelector('.card-pt').style.display = 'none';
        
        if (instance.isFoil) cardEl.classList.add('foil');
        
        if (isPermutate1) cardEl.classList.add('grayed-out');

        // Events
        if (isShop) cardEl.addEventListener('click', () => buyCard(instance.id));

        // Actionable check for Intli Assaulter, Covetous Wechuge, Wilderkin Zealot (Only on board, during SHOP)
        const actionableNames = ['Intli Assaulter', 'Covetous Wechuge', 'Wilderkin Zealot'];
        if (state.phase === 'SHOP' && actionableNames.includes(instance.card_name) && index !== -1 && !state.castingSpell && !state.targetingEffect) {
            cardEl.classList.add('actionable-outline');
            cardEl.addEventListener('click', (e) => {
                e.stopPropagation();
                instance.onAction();
                render();
            });
        }

        if (state.phase === 'SHOP' && index !== -1 && !state.castingSpell && !state.targetingEffect) {
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
        
        if (index !== -1) {
            if (state.castingSpell) { 
                cardEl.classList.add('targetable'); 
                cardEl.addEventListener('click', () => applySpell(instance.id)); 
            }
            if (state.targetingEffect) { 
                // Special case: Parliament discard targeting is HAND ONLY
                if (state.targetingEffect.effect === 'parliament_discard') {
                    // Not targetable on board
                } else if (state.targetingEffect.effect === 'permutate_step1') {
                    // Not targetable as a card, only counters are clickable
                } else {
                    // Special case: Intli Assaulter, Wechuge, Matriarch can't target themselves
                    const cannotTargetSelf = ['intli_sacrifice', 'wechuge_sacrifice', 'nest_matriarch_buff'];
                    if (cannotTargetSelf.includes(state.targetingEffect.effect) && instance.id === state.targetingEffect.sourceId) {
                        // Not targetable
                    } else if (state.targetingEffect.effect === 'permutate_step2' && instance.id === state.targetingEffect.sourceCreatureId) {
                        // Not targetable (must be different creature)
                    } else if (state.targetingEffect.effect === 'warrior_ways_step2' && !instance.type?.includes('Centaur')) {
                        // Not targetable if not a Centaur
                    } else if (state.targetingEffect.effect === 'warband_rallier_counters' && !instance.type?.includes('Centaur')) {
                        // Not targetable if not a Centaur
                    } else {
                        cardEl.classList.add('targetable');
                        cardEl.addEventListener('click', () => applyTargetedEffect(instance.id));
                    }
                }
            }

        } else if (state.player.hand.some(c => c.id === instance.id)) { // In hand
             // DISCARD TARGETING
             if (state.targetingEffect && state.targetingEffect.effect === 'parliament_discard') {
                 cardEl.classList.add('discard-outline');
                 cardEl.addEventListener('click', () => applyTargetedEffect(instance.id));
             } else {
                 cardEl.addEventListener('click', () => useCardFromHand(instance.id));
                 cardEl.draggable = true;
                 cardEl.addEventListener('dragstart', (e) => {
                     e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'hand', cardId: instance.id }));
                 });
             }
        }
        return cardEl;
    }

    if (typeof document !== 'undefined' && typeof module === 'undefined') {
        init();
    }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        state, CardFactory, BaseCard, init, availableCards,
        playerBoardEl, playerHandEl, shopEl, rerollBtn, freezeBtn, tierUpBtn, tierStarsEl, endTurnBtn, cardTemplate,
        resolveShopDeaths, triggerMiengFerocious, triggerLifeGain, findTarget,
        resolveCombatImpact, resolveDeaths, processDeaths,
        applyTargetedEffect, applySpell, useCardFromHand,
        resolveDiscovery
    };
}

if (typeof document !== 'undefined' && typeof module === 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // All top-level code has run, but we might need a specific entry point if needed
        });
    }
}
