// Archived Coliseum cards - Moved from scripts/coliseum.js
const archivedCards = {};

class GoreSwine extends BaseCard { }
class SleeplessSpirit extends BaseCard { }

class ImpressibleCub extends BaseCard {
    onCombatStart(board) {
        const hasStrong = board.some(c => c.getDisplayStats(board).p >= 4);
        if (hasStrong) {
            const multiplier = this.isFoil ? 2 : 1;
            this.tempPower += (1 * multiplier);
            this.tempToughness += (1 * multiplier);
            return [this];
        }
        return [];
    }
}

class CankerousHog extends BaseCard {
    onDeath(board, owner) {
        if (!state.battleBoards) return []; // Fizzle if not in combat
        const opponentBoard = (owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
        const validTargets = opponentBoard.filter(c => c.getDisplayStats(opponentBoard).t > 0 && !c.hasKeyword('Hexproof'));
        
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

class WilderkinZealot extends BaseCard {
    actionCost = 2;
    onCombatStart(board) {
        const stats = this.getDisplayStats(board);
        const hasFerocious = board?.some(c => c.getDisplayStats(board).p >= 4);
        if (hasFerocious) {
            const multiplier = this.isFoil ? 2 : 1;
            addCounters(this, multiplier, board);
            return [this];
        }
        return [];
    }
    onAction() {
        if (state.player.gold >= 2) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a creature to gain trample until end of turn.",
                effect: 'wilderkin_zealot_trample',
                cost: 2,
                isFoil: this.isFoil,
                isMandatory: false
            });
        }
    }
}

class ScarhornCleaver extends BaseCard { }

class DragonfistAxeman extends BaseCard {
    // Triggered via resolveCombatImpact logic if needed, 
    // or we can handle it in the class if we add a hook for defending.
    onCombatStart(board) {
        // Placeholder for reach if needed (Reach is a keyword check)
    }
}

class KaiLongDarkImmolator extends BaseCard {
    onOtherCreatureDeath(deadCard, board) {
        if (state.phase !== 'BATTLE') return;
        if (this.owner !== deadCard.owner) return;
        const stats = deadCard.getDisplayStats(board);
        const multiplier = this.isFoil ? 2 : 1;
        const power = stats.p * multiplier;
        if (power <= 0) return;
        
        const targetSide = (this.owner === 'player') ? 'opponent' : 'player';
        const currentOpp = getOpponent();

        if (this.owner === 'player') {
            if (currentOpp) currentOpp.fightHp -= power;
        } else {
            state.player.fightHp -= power;
        }

        // Animation (Matching Cankerous Hog style)
        const avatarId = (targetSide === 'opponent') ? 'opponent-battle-avatar' : 'player-avatar';
        setTimeout(() => {
            const avatarEl = document.getElementById(avatarId);
            if (avatarEl) {
                avatarEl.classList.add('shake');
                setTimeout(() => avatarEl.classList.remove('shake'), 300);
                showDamageBubble(avatarEl, power, 'debuff-bubble');
            }
            const hpEl = document.getElementById(targetSide === 'opponent' ? 'opponent-fight-hp' : 'player-fight-hp');
            if (hpEl) {
                hpEl.textContent = (targetSide === 'opponent' ? currentOpp.fightHp : state.player.fightHp);
            }
        }, 100);
    }
    onDeath(board, owner) {
        if (state.phase !== 'BATTLE') return [];
        // "Whenever a creature you control dies" - includes self
        const stats = this.getDisplayStats(board);
        const multiplier = this.isFoil ? 2 : 1;
        const power = stats.p * multiplier;
        const targetSide = (owner === 'player') ? 'opponent' : 'player';
        const currentOpp = getOpponent();

        if (owner === 'player') {
            if (currentOpp) currentOpp.fightHp -= power;
        } else {
            state.player.fightHp -= power;
        }

        // Animation (Matching Cankerous Hog style)
        const avatarId = (targetSide === 'opponent') ? 'opponent-battle-avatar' : 'player-avatar';
        setTimeout(() => {
            const avatarEl = document.getElementById(avatarId);
            if (avatarEl) {
                avatarEl.classList.add('shake');
                setTimeout(() => avatarEl.classList.remove('shake'), 300);
                showDamageBubble(avatarEl, power, 'debuff-bubble');
            }
            const hpEl = document.getElementById(targetSide === 'opponent' ? 'opponent-fight-hp' : 'player-fight-hp');
            if (hpEl) {
                hpEl.textContent = (targetSide === 'opponent' ? currentOpp.fightHp : state.player.fightHp);
            }
        }, 100);

        return [];
    }
}

class ArchitectOfWisdom extends BaseCard {
    onETB(board, isDouble = false) {
        if (this.owner === 'player') {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Gain control of target creature from the shop.",
                effect: 'architect_control',
                isMandatory: isDouble,
                wasCast: !isDouble
            });
        }
    }
}

class MercilessXunHuang extends BaseCard {
    onAttack(board) {
        const hasFerocious = board?.some(c => c.getDisplayStats(board).p >= 4);
        if (hasFerocious && state.phase === 'BATTLE' && state.battleBoards) {
            const opponentOwner = (this.owner === 'player') ? 'opponent' : 'player';
            const opponentBoard = state.battleBoards[opponentOwner];

            // Michal check
            const hasMichal = opponentBoard.some(c => c.card_name === 'Michal, the Anointed' && !c.isDying && !c.isDestroyed);
            if (hasMichal) return [];

            // Only target "Healthy" creatures without Hexproof
            const validVictims = opponentBoard.filter(c =>
                !c.isDying && !c.isDestroyed && c.getDisplayStats(opponentBoard).t > 0 && !c.hasKeyword('Hexproof')
            );

            if (validVictims.length > 0) {
                const victim = validVictims[Math.floor(Math.random() * validVictims.length)];
                victim.isDestroyed = true;
                return [victim];
            }
        }
        return [];
    }
}

class MossViper extends BaseCard { }

class WildBearmaster extends BaseCard {
    async onAttack(board) {
        const stats = this.getDisplayStats(board);
        const multiplier = this.isFoil ? 2 : 1;
        board.forEach(c => {
            if (c.id !== this.id) {
                c.tempPower += (stats.p * multiplier);
                c.tempToughness += (stats.p * multiplier);
            }
        });
        return board.filter(c => c.id !== this.id);
    }
}

class EarthcoreElemental extends BaseCard {
    onOtherCreatureETB(newCard, board) {
        if (newCard.owner === this.owner) {
            const stats = newCard.getDisplayStats(board);
            const multiplier = this.isFoil ? 2 : 1;
            this.tempPower += (stats.p * multiplier);
            this.tempToughness += (stats.p * multiplier);
            this.pulse(board);
        }
    }
}

class HoltunClanEldhand extends BaseCard { }

class VividGriffin extends BaseCard {
    onCombatStart(board) {
        const stats = this.getDisplayStats(board);
        const base = this.getBasePT();
        if (stats.p > base.p) {
            if (!this.enchantments) this.enchantments = [];
            this.enchantments.push({ card_name: 'Resolute Lifelink', rules_text: 'Lifelink', isTemporary: true });
            return [this];
        }
        return [];
    }
}

class NestMatriarch extends BaseCard {
    onETB(board, isDouble = false) {
        queueTargetingEffect({
            sourceId: this.id,
            title: this.card_name,
            text: "Choose a creature to get a +1/+1 counter and lifelink until end of turn.",
            effect: 'nest_matriarch_buff',
            wasCast: !isDouble,
            isFoil: this.isFoil,
            isMandatory: isDouble
        });
    }
}

class AlluringWisps extends BaseCard {
    onAttack(board, host = this) {
        if (!state.battleBoards) return [];
        const opponentBoard = (host.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
        const validTargets = opponentBoard.filter(c => !c.hasKeyword('Hexproof'));
        if (validTargets.length > 0) {
            const target = validTargets[Math.floor(Math.random() * validTargets.length)];
            const multiplier = host.isFoil ? 2 : 1;
            target.tempPower -= (2 * multiplier);

            // For the animation sequence, return the target
            return [target];
        }
        return [];
    }
}

class MiengWhoDancesWithDragons extends BaseCard {
    transform() {
        // Becomes 4/4 Dragon with Flying
        this.isTransforming = true;
        const base = this.getBasePT();
        const targetStat = this.isFoil ? 8 : 4;
        this.tempPower += (targetStat - base.p);
        this.tempToughness += (targetStat - base.t);
        if (!this.enchantments) this.enchantments = [];
        this.enchantments.push({ card_name: 'Mieng Transformation', rules_text: 'Flying', isTemporary: true });
    }
}

class DraconicCinderlance extends BaseCard { }

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

class CeremonyOfTribes extends BaseCard {
    onApply(target, board) {
        // This is handled in applyTargetedEffect via ceremony_step1
    }
}

class DragonlordsCarapace extends BaseCard {
    getEquipmentStats(target) {
        return { p: 8, t: 8 };
    }
}

class FlauntLuxury extends BaseCard {
    onCast(board) {
        state.player.gold += 3;
        
        // Draw 3 creatures to the shop
        for (let i = 0; i < 3; i++) {
            if (state.shop.cards.length < 7) {
                addCardsToShop(1, 'creature', 1);
            }
        }

    }
}

class ArtfulCoercion extends BaseCard {
    effect_text = 'Choose a creature of which to gain control.';
    onApply(target, board) {
        // Target is from the shop
        const shopIdx = state.shop.cards.indexOf(target);
        if (shopIdx !== -1) {
            if (board.length < boardLimit) {
                state.shop.cards.splice(shopIdx, 1);
                target.owner = 'player';
                board.push(target);
                
                // Artful Coercion does NOT trigger ETB
                // But we still broadcast the arrival to others
                board.forEach(c => {
                    if (c.id !== target.id) c.onOtherCreatureETB(target, board);
                });

                // INVIGORATE 2: random choice among your least power
                const minPower = Math.min(...board.map(c => c.getDisplayStats(board).p));
                const leastPowerCreatures = board.filter(c => c.getDisplayStats(board).p === minPower);
                if (leastPowerCreatures.length > 0) {
                    const randomTarget = leastPowerCreatures[Math.floor(Math.random() * leastPowerCreatures.length)];
                    addCounters(randomTarget, 2, board);
                }
            }
        }
    }
}

class BjarndyrMender extends BaseCard {
    onETB(board) {
        const multiplier = this.isFoil ? 2 : 1;
        const others = board.filter(c => c.id !== this.id);
        
        const snapshots = new Map();
        others.forEach(c => {
            c.tempPower += multiplier;
            c.tempToughness += multiplier;
            if (!c.enchantments) c.enchantments = [];
            c.enchantments.push({ card_name: 'Bjarndyr Protection', rules_text: 'Indestructible', isTemporary: true });
            
            c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
            c.isPulsing = true;
            snapshots.set(c.id, c.takeSnapshot());
        });

        if (others.length > 0) {
            queueAnimation(async () => {
                const pulses = others.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                await Promise.all(pulses);
                others.forEach(c => {
                    c.pulseQueueCount--;
                    if (c.pulseQueueCount <= 0) {
                        delete c.isPulsing;
                        delete c.pulseQueueCount;
                    }
                });
            });
        }
        return others;
    }
}
