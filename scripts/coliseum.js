const KEYWORD_DATA = {
    'Flying': {
        icon: 'img/flying.png',
        description: 'Can only be blocked by creatures with flying or reach. Can only be attacked if you only control creatures with flying.'
    },
    'Reach': {
        icon: 'img/reach.png',
        description: 'Can block creatures with flying.'
    },
    'Vigilance': {
        icon: 'img/vigilance.png',
        description: 'If a creature attacks, it must target a creature with vigilance if possible.'
    },
    'Menace': {
        icon: 'img/menace.png',
        description: 'Can attack as though defending creatures don\'t have vigilance.'
    },
    'Trample': {
        icon: 'img/trample.png',
        description: 'When attacking a creature, any damage dealt beyond the defender\'s toughness is dealt to that creature\'s neighbor.'
    },
    'First strike': {
        icon: 'img/first-strike.png',
        description: 'When attacking, deals combat damage before creatures without first strike.'
    },
    'Double strike': {
        icon: 'img/double-strike.png',
        description: 'Attacks twice. Takes no damage after the first attack.'
    },
    'Deathtouch': {
        icon: 'img/skull.png',
        description: 'Any amount of damage this deals to a creature is enough to destroy it.'
    },
    'Lifelink': {
        icon: 'img/lifelink.png',
        description: 'Damage dealt by this creature also causes you to gain that much life.'
    },
    'Indestructible': {
        icon: 'img/indestructible.png',
        description: 'The first time this creature would be destroyed each combat, it survives at 1 toughness.'
    },
    'Hexproof': {
        icon: 'img/hexproof.png',
        description: 'Cannot be targeted by abilities of your opponent\'s attacking creatures.'
    },
    'Haste': {
        icon: 'img/haste.png',
        description: 'This creature always attacks first during its combat turn.'
    },
    'Shield': {
        icon: 'img/shield.png',
        description: 'If this creature would be dealt damage, remove a shield counter instead.'
    },
    'Decayed': {
        icon: 'img/decayed.png',
        description: 'This creature can\'t block. When it attacks, sacrifice it at end of combat. Worth 0 gold.'
    },
    'plus-one': {
        icon: null,
        description: 'Increases this creature\'s power and toughness.'
    },
    'Adaptive': {
        icon: 'img/adaptive.png',
        description: 'Whenever you cast a spell that targets only this creature, copy it.'
    },
    'Prowess': {
        icon: 'img/prowess.png',
        description: 'Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.'
    },
    'Chivalry': {
        icon: 'img/chivalry.png',
        description: 'If the creature directly to the right of this creature has less base power, buff it and this creature can\'t attack.'
    },
    'Battle cry': {
        icon: 'img/battle-cry.png',
        description: 'Whenever this creature attacks, each other creature you control gets +1/+0 until end of turn.'
    }
};

// --- OO CARD SYSTEM ---

const targetedNames = ['To Battle', 'Faith in Darkness', 'Might and Mane', 'Way of the Bygone', 'Fight Song', 'Lagoon Logistics', 'Artful Coercion', 'Touch of the Omen'];
const complexTargetedNames = ['Executioner\'s Madness', 'Warrior\'s Ways', 'Whispers of the Dead', 'Ceremony of Tribes', 'Up in Arms'];

class BaseCard {
        constructor(data) {
            Object.assign(this, data);
            this.id = this.id || `card-${Math.random().toString(36).substr(2, 9)}`;
            this.counters = Number(this.counters) || 0;
            this.flyingCounters = Number(this.flyingCounters) || 0;
            this.menaceCounters = Number(this.menaceCounters) || 0;
            this.firstStrikeCounters = Number(this.firstStrikeCounters) || 0;
            this.doubleStrikeCounters = Number(this.doubleStrikeCounters) || 0;
            this.vigilanceCounters = Number(this.vigilanceCounters) || 0;
            this.lifelinkCounters = Number(this.lifelinkCounters) || 0;
            this.deathtouchCounters = Number(this.deathtouchCounters) || 0;
            this.trampleCounters = Number(this.trampleCounters) || 0;
            this.reachCounters = Number(this.reachCounters) || 0;
            this.hexproofCounters = Number(this.hexproofCounters) || 0;
            this.shieldCounters = Number(this.shieldCounters) || 0;

            this.damageTaken = Number(this.damageTaken) || 0;
            this.enchantments = this.enchantments || [];
            this.tempPower = Number(this.tempPower) || 0;
            this.tempToughness = Number(this.tempToughness) || 0;
            this.isLockedByChivalry = this.isLockedByChivalry || false;
            this.isFoil = this.isFoil || false;
            this.isDecayed = this.isDecayed || false;
            this.isToken = this.isToken || (this.shape?.toLowerCase().includes('token')) || false;
            this.isDestroyed = false;
            this.equipment = this.equipment || null;

            // Visual state tracking for staggered animations - Assigned LAST after normalization
            this.displayedCounters = this.counters;
            this.displayedDamageTaken = this.damageTaken;
            this.displayedTempPower = this.tempPower;
            this.displayedTempToughness = this.tempToughness;
            this.displayedFlyingCounters = this.flyingCounters;
            this.displayedMenaceCounters = this.menaceCounters;
            this.displayedFirstStrikeCounters = this.firstStrikeCounters;
            this.displayedDoubleStrikeCounters = this.doubleStrikeCounters;
            this.displayedVigilanceCounters = this.vigilanceCounters;
            this.displayedLifelinkCounters = this.lifelinkCounters;
            this.displayedDeathtouchCounters = this.deathtouchCounters;
            this.displayedTrampleCounters = this.trampleCounters;
            this.displayedReachCounters = this.reachCounters;
            this.displayedHexproofCounters = this.hexproofCounters;
            this.displayedShieldCounters = this.shieldCounters;
            this.displayedEnchantments = [...this.enchantments];
        }

        get isChangeling() {
            return this.rules_text?.toLowerCase().includes('changeling') || false;
        }

        isType(typeName) {
            if (this.isChangeling) return true;
            const normalizedType = this.type?.replace(/[\u2013\u2014]/g, "-") || "";
            return normalizedType.includes(typeName);
        }

        get isEmbattled() {
            return (this.counters > 0) || (this.flyingCounters > 0) || 
                   (this.menaceCounters > 0) || (this.firstStrikeCounters > 0) ||
                   (this.vigilanceCounters > 0) || (this.lifelinkCounters > 0) ||
                   (this.trampleCounters > 0) || (this.reachCounters > 0) ||
                   (this.hexproofCounters > 0) || (this.shieldCounters > 0) ||
                   (this.equipment !== null);
        }

        // Returns base power/toughness from the 'pt' string
        getBasePT() {
            let p = 0, t = 0;
            if (this.temporarySphinx) {
                p = 3; t = 3;
            } else if (this.pt) {
                const parts = this.pt.split('/');
                p = parseInt(parts[0]) || 0;
                t = parseInt(parts[1]) || 0;
            }
            
            if (this.isFoil) {
                p *= 2;
                t *= 2;
            }
            return { p, t };
        }

        getEquipmentStats(target) {
            return { p: 0, t: 0 };
        }

        // The "Stable" stats: Base + Counters + Enchantments + Temp (Start of Combat)
        getStableStats(visualOnly = false) {
            const base = this.getBasePT();
            const countToUse = visualOnly ? (this.displayedCounters || 0) : (this.counters || 0);

            let p = (base.p || 0) + countToUse;
            let t = (base.t || 0) + countToUse;
            let maxT = t;

            if (this.equipment) {
                const eqStats = this.equipment.getEquipmentStats(this);
                p += eqStats.p;
                t += eqStats.t;
                maxT += eqStats.t;
            }

            p += visualOnly ? (this.displayedTempPower || 0) : (this.tempPower || 0);
            t += visualOnly ? (this.displayedTempToughness || 0) : (this.tempToughness || 0);
            maxT += visualOnly ? (this.displayedTempToughness || 0) : (this.tempToughness || 0);

            const damageToUse = visualOnly ? (this.displayedDamageTaken || 0) : (this.damageTaken || 0);
            return { p, t: t - damageToUse, maxT };
        }

        syncVisualState() {
            this.displayedCounters = this.counters;
            this.displayedDamageTaken = this.damageTaken;
            this.displayedTempPower = this.tempPower;
            this.displayedTempToughness = this.tempToughness;
            this.displayedFlyingCounters = this.flyingCounters;
            this.displayedMenaceCounters = this.menaceCounters;
            this.displayedFirstStrikeCounters = this.firstStrikeCounters;
            this.displayedDoubleStrikeCounters = this.doubleStrikeCounters;
            this.displayedVigilanceCounters = this.vigilanceCounters;
            this.displayedLifelinkCounters = this.lifelinkCounters;
            this.displayedDeathtouchCounters = this.deathtouchCounters;
            this.displayedTrampleCounters = this.trampleCounters;
            this.displayedReachCounters = this.reachCounters;
            this.displayedHexproofCounters = this.hexproofCounters;
            this.displayedShieldCounters = this.shieldCounters;
            this.displayedEnchantments = [...this.enchantments];
        }

        // The "Final" stats: Stable + Dynamic Passives (Raven, Dowager, etc.)
        getDisplayStats(board, visualOnly = false) {
            if (this.temporaryHumility) {
                const t = 1 - (this.damageTaken || 0);
                return { p: 1, t: t, maxT: 1 };
            }
            const stable = this.getStableStats(visualOnly);
            const dynamic = this.getDynamicBuffs(board, visualOnly);
            return {
                p: Math.max(0, stable.p + dynamic.p),
                t: stable.t + dynamic.t,
                maxT: stable.maxT + dynamic.t
            };
        }
        // Hook for dynamic board-state-based buffs (Raven, Dowager)
        getDynamicBuffs(board, visualOnly = false) {
            let p = 0;
            let t = 0;
            
            // TRIBAL LORD CHECK (Warband Lieutenant)
            if (this.isType('Centaur')) {
                board?.forEach(c => {
                    if (c.card_name === 'Warband Lieutenant' && !c.temporaryHumility && c.id !== this.id) {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += multiplier;
                        t += multiplier;
                    }
                });
            }

            // FLYING LORD CHECK (Windsong Apprentice)
            if (this.hasKeyword('Flying', visualOnly)) {
                board?.forEach(c => {
                    if (c.card_name === 'Windsong Apprentice' && !c.temporaryHumility) {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += multiplier;
                        t += multiplier;
                    }
                });
            }

            // BIRD LORD CHECK (Thunder Raptor)
            if (this.isType('Bird')) {
                board?.forEach(c => {
                    if (c.card_name === 'Thunder Raptor' && !c.temporaryHumility && c.id !== this.id) {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += (2 * multiplier);
                        t += (1 * multiplier);
                    }
                });
            }

            // ZOMBIE LORD CHECK (Faceless Faction)
            if (this.isType('Zombie')) {
                board?.forEach(c => {
                    if (c.card_name === 'Faceless Faction' && !c.temporaryHumility && c.id !== this.id) {
                        const multiplier = c.isFoil ? 2 : 1;
                        p += multiplier;
                        t += multiplier;
                    }
                });
            }

            // MAFUA HERO POWER CHECK
            const ownerHero = (this.owner === 'player') ? state.player.hero : getOpponent()?.hero;
            if (ownerHero?.name === 'Mafua') {
                const myTier = this.tier || 1;
                const sameTierCount = board?.filter(c => (c.tier || 1) === myTier).length || 0;
                if (sameTierCount >= 5) {
                    p += 5;
                    t += 5;
                }
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
            return []; 
        }

        // Hook for Life Gain triggers
        onLifeGain(board) { }

        // Hook for noncreature spells being cast
        onNoncreatureCast(spell, board, targets = []) { }

        // Hook for the start of the Shop Phase (Upkeep)
        onShopStart(board) { }

        // Hook for the "End of Shop Phase" (End Step)
        async onShopEndStep(board) { }

        takeSnapshot() {
            return {
                counters: this.counters,
                damageTaken: this.damageTaken,
                tempPower: this.tempPower,
                tempToughness: this.tempToughness,
                flyingCounters: this.flyingCounters,
                menaceCounters: this.menaceCounters,
                firstStrikeCounters: this.firstStrikeCounters,
                doubleStrikeCounters: this.doubleStrikeCounters,
                vigilanceCounters: this.vigilanceCounters,
                lifelinkCounters: this.lifelinkCounters,
                deathtouchCounters: this.deathtouchCounters,
                trampleCounters: this.trampleCounters,
                reachCounters: this.reachCounters,
                hexproofCounters: this.hexproofCounters,
                shieldCounters: this.shieldCounters,
                isTransforming: this.isTransforming,
                enchantments: [...(this.enchantments || [])]
            };
        }

        async pulse(board) {
            if (state.isAITurn) {
                this.syncVisualState();
                return;
            }
            this.pulseQueueCount = (this.pulseQueueCount || 0) + 1;
            this.isPulsing = true;
            const snapshot = this.takeSnapshot();
            
            if (state.phase === 'BATTLE') {
                await pulseCardElement(this, board, snapshot);
                this.pulseQueueCount--;
                if (this.pulseQueueCount <= 0) {
                    delete this.isPulsing;
                    delete this.pulseQueueCount;
                }
            } else {
                queueAnimation(async () => {
                    try {
                        await pulseCardElement(this, board, snapshot);
                    } finally {
                        this.pulseQueueCount--;
                        if (this.pulseQueueCount <= 0) {
                            delete this.isPulsing;
                            delete this.pulseQueueCount;
                        }
                    }
                });
            }
        }

        // Hook for death effects (returns an array of tokens/cards to spawn)
        onDeath(board, owner) { return []; }

        hasETB() {
            // Check if the current instance's onETB is different from the base prototype
            return this.onETB !== BaseCard.prototype.onETB;
        }

        // Hook for when another creature on the same board dies
        onOtherCreatureDeath(deadCard, board) { }

        // Hook for when a permanent is sacrificed
        onOtherPermanentSacrificed(sacrificedCard, board) { }

        // Hook for when a counter is placed on a creature
        onCounterPlaced(count, type, target, board) { }

        onTraverse(board) { }

        // Hook for when a spell is cast (for non-targeted spells like Divination)
        onCast(board) { }

        // Hook for when a spell is applied to a target (for enchantments/targeted spells)
        onApply(target, board) { }

        hasInherentKeyword(keyword) {
            if (!this.rules_text) return false;
            if (['Magnific Wilderkin', 'Bwema, the Ruthless'].includes(this.card_name)) return false;
            const kw = keyword.toLowerCase();
            
            // SPECIAL CASE KEYWORDS
            if (kw === 'adaptive') return this.rules_text.toLowerCase().includes('adaptive');
            if (kw === 'prowess') return this.rules_text.toLowerCase().includes('prowess');
            if (kw === 'chivalry') return this.rules_text.toLowerCase().includes('chivalry');
            if (kw === 'battle cry') return this.rules_text.toLowerCase().includes('battle cry');
            
            if (kw === 'first strike' && this.rules_text.toLowerCase().includes('agile')) return true;
            
            // Avoid matching "gains [kw]", "has [kw]", "teach [kw]", etc. as inherent keywords
            const lowerText = this.rules_text.toLowerCase();
            const regex = new RegExp(`(^|[\\n,\\s])\\s*${kw}(\\s*|[\\n,\\s]|$)`, 'i');
            const match = lowerText.match(regex);
            if (!match) return false;

            // Check the current sentence/block for action words
            const matchIndex = match.index + match[1].length;
            const precedingText = lowerText.substring(0, matchIndex);
            const lastBreak = Math.max(precedingText.lastIndexOf('.'), precedingText.lastIndexOf('\\n'), precedingText.lastIndexOf(':'));
            const currentSentence = precedingText.substring(lastBreak + 1);
            
            const exclusionWords = ['gains ', 'has ', 'have ', 'teach ', 'put ', 'with ', 'gain '];
            if (exclusionWords.some(word => currentSentence.includes(word))) return false;

            return true;
        }

        hasKeyword(keyword, visualOnly = false) {
            if (this.temporaryHumility) return false;
            const kw = keyword.toLowerCase();
            if (kw === 'flying' && this.temporarySphinx) return true;
            
            if (visualOnly) {
                if (kw === 'flying' && this.displayedFlyingCounters > 0) return true;
                if (kw === 'menace' && this.displayedMenaceCounters > 0) return true;
                if (kw === 'first strike' && this.displayedFirstStrikeCounters > 0) return true;
                if (kw === 'vigilance' && this.displayedVigilanceCounters > 0) return true;
                if (kw === 'lifelink' && this.displayedLifelinkCounters > 0) return true;
                if (kw === 'trample' && this.displayedTrampleCounters > 0) return true;
                if (kw === 'reach' && this.displayedReachCounters > 0) return true;
                if (kw === 'hexproof' && this.displayedHexproofCounters > 0) return true;
                if (kw === 'double strike' && this.displayedDoubleStrikeCounters > 0) return true;
                if (kw === 'deathtouch' && this.displayedDeathtouchCounters > 0) return true;
                if (kw === 'shield' && this.displayedShieldCounters > 0) return true;
                if (kw === 'indestructible' && this.displayedEnchantments?.some(e => e.rules_text?.toLowerCase().includes('indestructible'))) return true;
            } else {
                if (kw === 'flying' && this.flyingCounters > 0) return true;
                if (kw === 'menace' && this.menaceCounters > 0) return true;
                if (kw === 'first strike' && this.firstStrikeCounters > 0) return true;
                if (kw === 'vigilance' && this.vigilanceCounters > 0) return true;
                if (kw === 'lifelink' && this.lifelinkCounters > 0) return true;
                if (kw === 'trample' && this.trampleCounters > 0) return true;
                if (kw === 'reach' && this.reachCounters > 0) return true;
                if (kw === 'hexproof' && this.hexproofCounters > 0) return true;
                if (kw === 'double strike' && this.doubleStrikeCounters > 0) return true;
                if (kw === 'deathtouch' && this.deathtouchCounters > 0) return true;
                if (kw === 'shield' && this.shieldCounters > 0) return true;
                if (kw === 'indestructible' && this.enchantments?.some(e => e.rules_text?.toLowerCase().includes('indestructible'))) return true;
            }

            // GLOBAL EFFECTS
            const entity = getEntity(this.owner);
            if (kw === 'lifelink') {
                if (entity?.honorBegetsGloryBonus > 0) return true;
                // Patron of the Meek: Creatures you control with +1/+1 counters on them have lifelink.
                if (this.counters > 0) {
                    const board = (state.phase === 'BATTLE' && state.battleBoards) ? 
                                  (this.owner === 'player' ? state.battleBoards.player : state.battleBoards.opponent) : 
                                  (this.owner === 'player' ? state.player.board : (state.opponents.find(o => o.board.some(c => c.id === this.id))?.board || []));
                    if (board?.some(c => c.card_name === 'Patron of the Meek' && !c.isDying && !c.temporaryHumility)) return true;
                }
            }

            // SPECIAL CASE KEYWORDS
            if (kw === 'adaptive') {
                if (this.hasInherentKeyword('adaptive')) return true;
                if (this.enchantments?.some(e => e.rules_text?.toLowerCase().includes('adaptive'))) return true;
                if (this.equipment && this.equipment.rules_text?.toLowerCase().includes('adaptive')) return true;
                return false;
            }
            if (kw === 'prowess') {
                if (this.hasInherentKeyword('prowess')) return true;
                if (this.enchantments?.some(e => e.rules_text?.toLowerCase().includes('prowess'))) return true;
                return false;
            }
            if (kw === 'chivalry') {
                if (this.hasInherentKeyword('chivalry')) return true;
                if (this.enchantments?.some(e => e.rules_text?.toLowerCase().includes('chivalry'))) return true;
                return false;
            }
            if (kw === 'battle cry') {
                if (this.hasInherentKeyword('battle cry')) return true;
                if (this.enchantments?.some(e => e.rules_text?.toLowerCase().includes('battle cry'))) return true;
                return false;
            }
            
            // STATIC BOARD EFFECTS
            const board = (state.phase === 'BATTLE' && state.battleBoards) ? 
                          (this.owner === 'player' ? state.battleBoards.player : state.battleBoards.opponent) : 
                          state.player.board;

            // CHECK ENCHANTMENTS FIRST (Precise check)
            const enchantmentsToUse = visualOnly ? (this.displayedEnchantments || []) : (this.enchantments || []);
            if (enchantmentsToUse.some(e => {
                const text = e.rules_text?.toLowerCase() || "";
                const regex = new RegExp(`(^|[\\n,])\\s*${kw}(\\s*|[\\n,]|$)`, 'i');
                return regex.test(text);
            })) return true;

            // CHECK EQUIPMENT
            if (this.equipment) {
                const eqText = this.equipment.rules_text?.toLowerCase() || "";
                // Specifically look for "has [keyword]" or "gains [keyword]" or basic keyword lists to avoid false positives like "other creatures gain indestructible"
                const eqRegex = new RegExp(`(^|[\\n,])\\s*${kw}(\\s*|[\\n,]|$)`, 'i');
                const hasRegex = new RegExp(`has ${kw}`, 'i');
                const gainsRegex = new RegExp(`gains ${kw}`, 'i');
                
                if (eqRegex.test(eqText) || hasRegex.test(eqText) || gainsRegex.test(eqText)) {
                    // Safety check for The Exile Queen's Crown
                    if (this.equipment.card_name === "The Exile Queen's Crown" && kw === 'indestructible') {
                        return false; 
                    }
                    return true;
                }
                if (this.equipment.hasKeyword && this.equipment.hasKeyword(kw)) return true;
            }

            return this.hasInherentKeyword(kw);
        }

        isType(type) {
            if (this.isChangeling) return true;
            if (!this.type) return false;
            // Normalize dashes
            const normalizedType = this.type.replace(/[\u2013\u2014]/g, "-");
            return normalizedType.toLowerCase().includes(type.toLowerCase());
        }

        clone() {
            const newCard = new this.constructor(this);
            newCard.id = `card-${Math.random().toString(36).substr(2, 9)}`;
            newCard.counters = this.counters;
            newCard.flyingCounters = this.flyingCounters;
            newCard.menaceCounters = this.menaceCounters;
            newCard.firstStrikeCounters = this.firstStrikeCounters;
            newCard.doubleStrikeCounters = this.doubleStrikeCounters;
            newCard.vigilanceCounters = this.vigilanceCounters;
            newCard.lifelinkCounters = this.lifelinkCounters;
            newCard.deathtouchCounters = this.deathtouchCounters;
            newCard.trampleCounters = this.trampleCounters;
            newCard.reachCounters = this.reachCounters;
            newCard.shieldCounters = this.shieldCounters;
            
            // Sync visual state to the clone
            newCard.displayedCounters = this.displayedCounters;
            newCard.displayedFlyingCounters = this.displayedFlyingCounters;
            newCard.displayedMenaceCounters = this.displayedMenaceCounters;
            newCard.displayedFirstStrikeCounters = this.displayedFirstStrikeCounters;
            newCard.displayedDoubleStrikeCounters = this.displayedDoubleStrikeCounters;
            newCard.displayedVigilanceCounters = this.displayedVigilanceCounters;
            newCard.displayedLifelinkCounters = this.displayedLifelinkCounters;
            newCard.displayedDeathtouchCounters = this.displayedDeathtouchCounters;
            newCard.displayedTrampleCounters = this.displayedTrampleCounters;
            newCard.displayedReachCounters = this.displayedReachCounters;
            newCard.displayedHexproofCounters = this.displayedHexproofCounters;
            newCard.displayedShieldCounters = this.displayedShieldCounters;

            newCard.isFoil = this.isFoil;
            newCard.isDecayed = this.isDecayed;
            newCard.isToken = this.isToken;
            newCard.indestructibleUsed = this.indestructibleUsed;
            newCard.enchantments = this.enchantments.map(e => (e instanceof BaseCard ? e.clone() : CardFactory.create(e)));
            return newCard;
        }
    }

    function proliferate(board, owner, multiplier) {
        const modifiedCards = [];
        board.forEach(c => {
            if (c.owner === owner) {
                let modified = false;
                let addedCounters = 0;
                
                if (c.counters > 0) {
                    c.counters += multiplier;
                    addedCounters = multiplier;
                    modified = true;
                }
                if (c.flyingCounters > 0) { c.flyingCounters += multiplier; modified = true; }
                if (c.menaceCounters > 0) { c.menaceCounters += multiplier; modified = true; }
                if (c.firstStrikeCounters > 0) { c.firstStrikeCounters += multiplier; modified = true; }
                if (c.doubleStrikeCounters > 0) { c.doubleStrikeCounters += multiplier; modified = true; }
                if (c.vigilanceCounters > 0) { c.vigilanceCounters += multiplier; modified = true; }
                if (c.lifelinkCounters > 0) { c.lifelinkCounters += multiplier; modified = true; }
                if (c.deathtouchCounters > 0) { c.deathtouchCounters += multiplier; modified = true; }
                if (c.trampleCounters > 0) { c.trampleCounters += multiplier; modified = true; }
                if (c.reachCounters > 0) { c.reachCounters += multiplier; modified = true; }
                if (c.hexproofCounters > 0) { c.hexproofCounters += multiplier; modified = true; }
                
                if (modified) {
                    modifiedCards.push({ card: c, addedCounters: addedCounters });
                }
            }
        });

        if (modifiedCards.length > 0) {
            const snapshots = new Map();
            modifiedCards.forEach(mc => {
                const c = mc.card;
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                snapshots.set(c.id, c.takeSnapshot());
            });

            queueAnimation(async () => {
                const pulses = modifiedCards.map(mc => pulseCardElement(mc.card, board, snapshots.get(mc.card.id)));
                await Promise.all(pulses);
                modifiedCards.forEach(mc => {
                    const c = mc.card;
                    c.pulseQueueCount--;
                    if (c.pulseQueueCount <= 0) {
                        delete c.isPulsing;
                        delete c.pulseQueueCount;
                    }
                });
            });

            // 2. Then notify others (like Striding Cascade) so their animations come AFTER
            modifiedCards.forEach(mc => {
                if (mc.addedCounters > 0 && board) {
                    board.forEach(other => {
                        if (other.id !== mc.card.id) {
                            other.onCounterPlaced(mc.addedCounters, 'plus-one', mc.card, board);
                        }
                    });
                }
            });
        }
    }

    function broadcastTraverse(board) {
        board.forEach(c => c.onTraverse(board));
    }

    function traverseCirrusea(source, board) {
        const owner = source.owner || 'player';
        
        // Find the specific entity (player or opponent) to set the plane for
        let targetEntity = state.player;
        if (owner === 'opponent') {
            // Find which opponent owns this board
            targetEntity = state.opponents.find(opp => opp.board === board) || getOpponent();
        }

        let needsBroadcast = true;
        if (targetEntity.plane !== 'Cirrusea') {
            targetEntity.plane = 'Cirrusea';
            
            // Create 1/2 Bird Token with Flying
            if (board.length < boardLimit) {
                const bird = createToken('Bird', 'AEX', owner);
                if (bird) {
                    bird.pt = "1/2";
                    board.push(bird);
                    
                    // Trigger ETB for the bird
                    triggerETB(bird, board);
                    // Broadcast ETB to others
                    board.forEach(c => {
                        if (c.id !== bird.id) c.onOtherCreatureETB(bird, board);
                    });
                }
            }

            // Trigger visual update if dynamic traverse is enabled (or it's an opponent)
            const isPlayer = (targetEntity === state.player);
            if (!isPlayer || state.settings.dynamicTraverse) {
                render();
            }
        } else {
            // Already in Cirrusea: Trigger targeting for Flying or +1/+1
            needsBroadcast = false;
            queueTargetingEffect({
                sourceId: source.id,
                title: source.card_name,
                text: "Choose a creature to teach flying.",
                effect: 'traverse_cirrusea_grant',
                wasCast: true,
                owner: owner,
                isFoil: source.isFoil,
                cardInstance: source,
                needsTraverseBroadcast: true
            });
        }
        if (needsBroadcast) broadcastTraverse(board);
    }

    function traverseOnora(source, board) {
        const owner = source.owner || 'player';
        let targetEntity = state.player;
        if (owner === 'opponent') {
            targetEntity = state.opponents.find(opp => opp.board === board) || getOpponent();
        }

        let needsBroadcast = true;
        if (targetEntity.plane !== 'Onora') {
            targetEntity.plane = 'Onora';
            
            if (owner === 'player') {
                // EFFECT: Look at four creatures at or below your tier level, all with power 3 or less. Put one in your hand
                const pool = availableCards.filter(c => 
                    c.type?.toLowerCase().includes('creature') && 
                    (c.tier || 1) <= state.player.tier && 
                    c.shape !== 'token' &&
                    c.card_name !== 'Angora Paladin'
                );
                
                // Parse PT for power filter
                const filteredPool = pool.filter(c => {
                    if (!c.pt) return false;
                    const p = parseInt(c.pt.split('/')[0]);
                    return p <= 3;
                });

                const choices = [];
                const count = Math.min(4, filteredPool.length);
                for (let i = 0; i < count; i++) {
                    const idx = Math.floor(Math.random() * filteredPool.length);
                    choices.push(filteredPool.splice(idx, 1)[0]);
                }

                queueDiscovery({
                    cards: choices.map(c => CardFactory.create(c)),
                    title: source.card_name,
                    text: "Choose a creature with power 3 or less to add to your hand.",
                    count: 1,
                    sourceId: source.id
                });
            } else {
                // Opponent simple logic: add a random eligible creature to hand
                const pool = availableCards.filter(c => 
                    c.type?.toLowerCase().includes('creature') && 
                    (c.tier || 1) <= targetEntity.tier && 
                    c.shape !== 'token' &&
                    c.card_name !== 'Angora Paladin'
                );
                const filteredPool = pool.filter(c => {
                    if (!c.pt) return false;
                    const p = parseInt(c.pt.split('/')[0]);
                    return p <= 3;
                });
                if (filteredPool.length > 0) {
                    const chosen = filteredPool[Math.floor(Math.random() * filteredPool.length)];
                    if (targetEntity.hand.length < handLimit) {
                        targetEntity.hand.push(CardFactory.create(chosen));
                    }
                }
            }

            const isPlayer = (targetEntity === state.player);
            if (!isPlayer || state.settings.dynamicTraverse) render();
        } else {
            // Already in Onora: put a +1/+1 counter on each of up to two target creatures you control
            needsBroadcast = false;
            queueTargetingEffect({
                sourceId: source.id,
                title: source.card_name,
                text: "Choose up to two creatures to receive +1/+1 counters.",
                effect: 'traverse_onora_grant',
                count: 2,
                wasCast: true,
                owner: owner,
                isFoil: source.isFoil,
                cardInstance: source,
                needsTraverseBroadcast: true
            });
        }
        if (needsBroadcast) broadcastTraverse(board);
    }

    function traverseAlTabaq(source, board) {
        const owner = source.owner || 'player';
        let targetEntity = state.player;
        if (owner === 'opponent') {
            targetEntity = state.opponents.find(opp => opp.board === board) || getOpponent();
        }

        let needsBroadcast = true;
        if (targetEntity.plane !== 'Al Tabaq') {
            targetEntity.plane = 'Al Tabaq';
            
            // EFFECT: Create "Twin Shivs" Equipment token (AEX). 
            if (targetEntity.hand.length < handLimit) {
                const shivs = createToken('Twin Shivs', 'AEX', owner);
                if (shivs) {
                    targetEntity.hand.push(shivs);
                }
            }

            const isPlayer = (targetEntity === state.player);
            if (!isPlayer || state.settings.dynamicTraverse) render();
        } else {
            // Already in Al Tabaq: target creature gains double strike until end of turn
            needsBroadcast = false;
            queueTargetingEffect({
                sourceId: source.id,
                title: source.card_name,
                text: "Target creature gains double strike until end of turn.",
                effect: 'traverse_altabaq_grant',
                wasCast: true,
                owner: owner,
                isFoil: source.isFoil,
                cardInstance: source,
                needsTraverseBroadcast: true
            });
        }
        if (needsBroadcast) broadcastTraverse(board);
    }

    // --- Specialized Card Subclasses ---

    class SoulsmokeAdept extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            if (this.isEmbattled) {
                const multiplier = this.isFoil ? 2 : 1;
                base.p += multiplier;
            }
            return base;
        }
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'lifelink') return this.isEmbattled;
            return super.hasKeyword(keyword);
        }
    }

    class GlumvaleRaven extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            const hasOtherFlyer = board?.some(c => c.id !== this.id && c.hasKeyword('Flying'));
            if (hasOtherFlyer) {
                const multiplier = this.isFoil ? 2 : 1;
                base.p += multiplier;
            }
            return base;
        }
    }

    class WarClanDowager extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            const hasOtherCentaur = board?.some(c => c.id !== this.id && c.isType('Centaur'));
            if (hasOtherCentaur) {
                const multiplier = this.isFoil ? 2 : 1;
                base.p += multiplier;
                base.t += multiplier;
            }
            return base;
        }
    }

    class SparringCampaigner extends BaseCard {
        onCombatStart(board) {
            const idx = board.indexOf(this);
            const right = (idx !== -1 && idx < board.length - 1) ? board[idx + 1] : null;
            if (right) {
                if (right.getBasePT().p < this.getBasePT().p) {
                    const multiplier = this.isFoil ? 2 : 1;
                    right.tempPower += (2 * multiplier);
                    right.tempToughness += (2 * multiplier);
                    this.isLockedByChivalry = true;
                    return [right];
                }
            }
            return [];
        }
    }

    class ClairvoyantKoi extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += (1 * multiplier);
            this.tempToughness += (1 * multiplier);
            this.pulse(board);
        }
    }

    class BlisteringLunatic extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += (2 * multiplier);
            this.pulse(board);
        }
    }

    class DutifulCamel extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({ 
                sourceId: this.id, 
                title: this.card_name,
                text: "Choose a creature to get a +1/+1 counter.",
                effect: 'dutiful_camel_counter', 
                isDouble: false,
                wasCast: !isDouble, // Only "counts" as casting for bounce purposes on first trigger
                cardInstance: this,
                isMandatory: isDouble
            });
        }
    }

    class RottenCarcass extends BaseCard {
        onDeath(board, owner) {
            const count = this.isFoil ? 2 : 1;
            const tokens = [];
            for (let i = 0; i < count; i++) {
                const token = createToken('Construct', 'ACE', owner);
                if (token) {
                    token.pt = "2/2"; // Override the 1/1 to be 2/2
                    tokens.push(token);
                }
            }
            return tokens;
        }
    }

    class IntliAssaulter extends BaseCard {
        onAction() {
            queueTargetingEffect({ 
                sourceId: this.id, 
                title: this.card_name,
                text: "Choose a creature to sacrifice.",
                effect: 'intli_sacrifice',
                isMandatory: false
            });
        }
    }

    class RakkiriArcher extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            const multiplier = this.isFoil ? 2 : 1;
            return (this.isEmbattled) ? { p: base.p, t: base.t + multiplier } : base;
        }
        hasKeyword(keyword) {
            if (keyword.toLowerCase() === 'reach') {
                return this.isEmbattled;
            }
            return super.hasKeyword(keyword);
        }
    }

    class BjarndyrBruiser extends BaseCard {
        getDynamicBuffs(board) {
            const base = super.getDynamicBuffs(board);
            if (this.isEmbattled) {
                const multiplier = this.isFoil ? 2 : 1;
                base.p += (2 * multiplier);
                base.t += (2 * multiplier);
            }
            return base;
        }
    }

    class GoldGrubber extends BaseCard {
        onAttack(board) {
            if (this.owner === 'player') {
                const multiplier = this.isFoil ? 2 : 1;
                state.player.treasures += multiplier;
            }
            return [this];
        }
    }

    class HerdMatron extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a creature to get the first +1/+1 counter.",
                effect: 'herd_matron_counters',
                step: 1,
                wasCast: !isDouble,
                isMandatory: isDouble
            });
        }
    }

    class PatronOfTheMeek extends BaseCard {
        onETB(board) {
            traverseOnora(this, board);
        }
    }

    class HonorBegetsGlory extends BaseCard {
        async onCast(board) {
            traverseAlTabaq(this, board);
            const entity = getEntity(this.owner);
            if (entity) {
                entity.honorBegetsGloryBonus = (entity.honorBegetsGloryBonus || 0) + (this.isFoil ? 2 : 1);
            }
        }
    }

    class UnyieldingEnforcer extends BaseCard {
        onAttack(board) {
            const isAdorned = this.enchantments.length > 0 || this.equipment;
            if (isAdorned) {
                const opponentBoard = (this.owner === 'player') ? state.battleBoards?.opponent : state.battleBoards?.player;
                if (opponentBoard && opponentBoard.length > 0) {
                    const validTargets = opponentBoard.filter(c => !c.hasKeyword('Hexproof') && !c.isDying && !c.isDestroyed);
                    if (validTargets.length > 0) {
                        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
                        target.isDestroyed = true;
                        target.destroyedReason = 'exile';
                        return [target];
                    }
                }
            }
            return [this];
        }
    }

    class ThriceClawedTroika extends BaseCard {
        async onCombatStart(board) {
            if (this.isToken || board.length >= boardLimit) return [];
            
            const multiplier = this.isFoil ? 2 : 1;
            const newTokens = [];
            const count = 2 * multiplier;
            
            const idx = board.indexOf(this);
            for (let i = 0; i < count; i++) {
                if (board.length >= boardLimit) break;
                
                const token = this.clone();
                token.id = `troika-token-${Math.random()}`;
                token.owner = this.owner;
                token.isToken = true;
                token.isTemporary = true; // Mark for cleanup
                token.shape = this.shape;
                
                // clone() handles enchantments and equipment copying
                token.enchantments.push({ card_name: 'Troika Exile', rules_text: 'Exile at end of combat', isTemporary: true });
                
                board.splice(idx + 1 + i, 0, token);
                newTokens.push(token);

                if (state.phase === 'BATTLE' && state.battleQueues) {
                    state.battleQueues[this.owner].unshift(token);
                }
                
                board.forEach(c => {
                    if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                });

                if (typeof document !== 'undefined') {
                    token.isSpawning = true;
                }
            }

            if (typeof document !== 'undefined' && newTokens.length > 0) {
                render();
                await new Promise(r => setTimeout(r, 600));
                newTokens.forEach(t => delete t.isSpawning);
                render();
            }

            return newTokens;
        }
    }

    class LakeCaveLurker extends BaseCard {
        onDeath(board, owner) {
            if (owner === 'player') {
                const multiplier = this.isFoil ? 2 : 1;
                if (state.phase === 'SHOP') {
                    state.player.gold += multiplier;
                } else {
                    state.player.treasures += multiplier;
                }
            }
            return [];
        }
    }

    class Divination extends BaseCard {
        onCast(board) {
            if (board === state.player.board) {
                addCardsToShop(2, 'creature', 1);
            }
        }
    }

    class ScientificInquiry extends BaseCard {
        onCast(board) {
            if (board === state.player.board) {
                state.player.treasures += 1;
                addScry(2, null, this.card_name);
            }
        }
    }

    class ToBattle extends BaseCard {
        effect_text = 'Choose a creature to get a +1/+1 counter and gain haste until end of turn.';
        onApply(target, board) {
            target.isPulsing = true;
            addCounters(target, 1, board, true);
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'To Battle', rules_text: 'Haste', isTemporary: true });
            target.pulse(board);
        }
    }

    class FaithInDarkness extends BaseCard {
        effect_text = 'Choose a creature to get +2/+2 until end of turn.';
        onApply(target, board) {
            if (board === state.player.board) {
                addScry(1, null, this.card_name);
            }
            target.isPulsing = true;
            target.tempPower += 2;
            target.tempToughness += 2;
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Faith in Darkness', rules_text: '+2/+2', isTemporary: true });
            target.pulse(board);
        }
    }

    class MightAndMane extends BaseCard {
        effect_text = 'Choose a creature to gain menace until end of turn.';
        onApply(target, board) {
            target.isPulsing = true;
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Might and Mane', rules_text: 'Menace', isTemporary: true });
            if (board === state.player.board) {
                addCardsToShop(1, 'creature', 1);
            }
            target.pulse(board);
        }
    }

    class WayOfTheBygone extends BaseCard {
        effect_text = 'Choose a creature to get +3/+0 and gain first strike until end of turn.';
        onApply(target, board) {
            if (board === state.player.board) {
                addScry(1, null, this.card_name);
            }
            target.isPulsing = true;
            target.tempPower += 3;
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Way of the Bygone', rules_text: 'First strike', isTemporary: true });
            target.pulse(board);
        }
    }

    class ExoticGameHunter extends BaseCard {
        async onShopEndStep(board) {
            if (state.creaturesDiedThisShopPhase) {
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(this, multiplier, board);
            }
        }
    }

    class ShriekingPusbag extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a creature to sacrifice.",
                effect: 'pusbag_sacrifice',
                wasCast: !isDouble,
                isMandatory: isDouble
            });
        }
    }

    class ExecutionersMadness extends BaseCard { }

    class EarthrattleXali extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += multiplier;
            this.tempToughness += multiplier;
            this.pulse(board);
        }
    }

    class DynamicWyvern extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            if (!this.enchantments) this.enchantments = [];
            this.enchantments.push({ card_name: 'Dynamic Wyvern Grant', rules_text: 'Flying', isTemporary: true });
            this.pulse(board);
        }
    }

    class BristledDirebear extends BaseCard { }

    class ConsultTheDewdrops extends BaseCard {
        onCast(board) {
            const noncreatures = availableCards.filter(c =>
                c.type && !c.type.toLowerCase().includes('creature') &&
                !c.type.toLowerCase().includes('equipment') &&
                c.shape !== 'token' &&
                c.card_name !== 'Consult the Dewdrops' &&
                (c.tier || 1) <= 2
            );
            const selection = [];
            const count = 4;
            for (let i = 0; i < count; i++) {
                selection.push(CardFactory.create(noncreatures[Math.floor(Math.random() * noncreatures.length)]));
            }
            queueDiscovery({
                cards: selection,
                title: this.card_name,
                text: 'Choose a noncreature card.'
            });
        }
    }
    class EnvoyOfThePure extends BaseCard {
        onETB(board) {
            const targets = board.filter(c => c.id !== this.id);
            const multiplier = this.isFoil ? 2 : 1;
            
            const snapshots = new Map();
            targets.forEach(c => {
                c.tempPower += multiplier;
                c.tempToughness += multiplier;
                if (!c.enchantments) c.enchantments = [];
                c.enchantments.push({ card_name: 'Envoy Grant', rules_text: 'Vigilance', isTemporary: true });
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                snapshots.set(c.id, c.takeSnapshot());
            });

            if (targets.length > 0) {
                queueAnimation(async () => {
                    const pulses = targets.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    targets.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });
            }
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
            return super.getDynamicBuffs(board);
        }
        // Lord logic needs a way to buff OTHERS. 
        // We can check board for other Lords.
    }

    class WarriorsWays extends BaseCard {
        onApply(target, board) {
            // Step 1: Pick creature for +2/+2
            // Step 2: Pick Centaur for counter
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a Centaur to get a +1/+1 counter.",
                buffTargetId: target.id,
                effect: 'warrior_ways_step2',
                isFoil: false,
                owner: this.owner || 'player'
            });
        }
    }

    class StratusTraveler extends BaseCard {
        onETB(board) {
            traverseCirrusea(this, board);
        }
    }

    class BellowingGiant extends BaseCard { }

    class BwemaTheRuthless extends BaseCard {
        onETB(board, isDouble = false) {
            // Choice of two different counters
            const multiplier = this.isFoil ? 2 : 1;
            const options = [
                { card_name: 'Menace Counter', rules_text: 'Menace', type: 'Counter' },
                { card_name: 'First Strike Counter', rules_text: 'First strike', type: 'Counter' },
                { card_name: 'Vigilance Counter', rules_text: 'Vigilance', type: 'Counter' },
                { card_name: 'Lifelink Counter', rules_text: 'Lifelink', type: 'Counter' }
            ];

            queueDiscovery({
                cards: options.map(o => CardFactory.create(o)),
                isKeywordChoice: true,
                title: this.card_name,
                text: 'Choose two keyword counters to place on Bwema.',
                count: 1,
                remaining: 2,
                sourceId: this.id,
                effect: 'bwema_counters',
                chosen: [],
                isMandatory: isDouble
            });
        }
    }

    class SilverhornTactician extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a counter to remove.",
                effect: 'permutate_step1',
                wasCast: !isDouble,
                isFoil: this.isFoil,
                isMandatory: isDouble
            });
        }
    }

    class WindsongApprentice extends BaseCard {
        onETB(board) {
            traverseCirrusea(this, board);
        }
    }

    class CautherHellkite extends BaseCard { }

    class QinhanaCavalry extends BaseCard {
        onCombatStart(board) {
            const idx = board.indexOf(this);
            if (idx !== -1 && idx < board.length - 1) {
                const target = board[idx + 1];
                if (target.getBasePT().p < this.getBasePT().p) {
                    const bonus = this.isFoil ? 6 : 3;
                    target.tempPower += bonus;
                    target.tempToughness += bonus;
                    this.isLockedByChivalry = true;
                    return [target];
                }
            }
            return [];
        }
    }

    class MekiniEremite extends BaseCard {
        onETB(board) {
            this.shieldCounters = 1;
            this.pulse(board);
        }
    }

    class FrontierMarkswomen extends BaseCard { }

    class FestivalCelebrants extends BaseCard {
        onETB(board) {
            const targets = board.filter(c => c.owner === this.owner);
            const snapshots = new Map();
            targets.forEach(c => {
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                addCounters(c, 1, board, true, true); // Skip animation AND notification
                snapshots.set(c.id, c.takeSnapshot());
            });

            if (targets.length > 0) {
                queueAnimation(async () => {
                    const pulses = targets.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    targets.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });

                // Manual Notification AFTER queuing the pulse
                targets.forEach(c => {
                    board.forEach(other => {
                        if (other.id !== c.id) {
                            other.onCounterPlaced(1, 'plus-one', c, board);
                        }
                    });
                });
            }
        }
    }

    class SuitorOfDeath extends BaseCard {
        onDeath(board, owner) {
            if (this.temporaryHumility) return [];
            if (state.phase === 'BATTLE' && state.battleBoards) {
                const opponentOwner = (owner === 'player') ? 'opponent' : 'player';
                const opponentBoard = state.battleBoards[opponentOwner];

                // Michal check
                const hasMichal = opponentBoard.some(c => c.card_name === 'Michal, the Anointed' && !c.isDying && !c.isDestroyed);
                if (hasMichal) return [];

                // Only target "Healthy" creatures without Hexproof
                let validVictims = opponentBoard.filter(c =>
                    !c.isDying && !c.isDestroyed && c.getDisplayStats(opponentBoard).t > 0 && !c.hasKeyword('Hexproof')
                );

                if (validVictims.length > 0) {
                    // Flagbearer check
                    const flagbearers = validVictims.filter(c => c.isType('Flagbearer'));
                    const pool = flagbearers.length > 0 ? flagbearers : validVictims;
                    const victim = pool[Math.floor(Math.random() * pool.length)];
                    victim.isDestroyed = true;
                }
            }
            return [];
        }
    }

    class LumberingAncient extends BaseCard {
        onDeath(board, owner) {
            // Target random friendly creature (not dying) - matching Sporegraft Slime
            const friends = board.filter(c => c.id !== this.id && c.getDisplayStats(board).t > 0);
            if (friends.length > 0) {
                const target = friends[Math.floor(Math.random() * friends.length)];
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(target, 8 * multiplier, board);
            }
            return [];
        }
    }

    class ZaraxSupermajor extends BaseCard {
        onETB(board) {
            if (board.length < boardLimit) {
                const token = createToken('Beast', 'SHF', this.owner);
                if (token) {
                    board.push(token);
                    triggerETB(token, board);
                    board.forEach(c => {
                        if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                    });
                }
            }
        }
        onNoncreatureCast(spell, board, targets = []) {
            if (state.spellsCastThisTurn === 2) {
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(this, multiplier, board);
                board.forEach(c => {
                    if (!c.enchantments) c.enchantments = [];
                    c.enchantments.push({ card_name: 'Galaxian Flight', rules_text: 'Flying', isTemporary: true });
                });
            }
        }
    }

    class InfuseTheApparatus extends BaseCard {
        onCast(board) {
            const uniqueSpells = [];
            const names = new Set();
            state.player.spellGraveyard.forEach(s => {
                if (!names.has(s.card_name)) {
                    names.add(s.card_name);
                    uniqueSpells.push(s);
                }
            });
            state.player.spellGraveyard = []; // Exile all
            
            uniqueSpells.forEach(spell => {
                const name = spell.card_name;
                const isEquipment = spell.type?.toLowerCase().includes('equipment');
                
                if (name === 'Executioner\'s Madness') {
                    queueTargetingEffect({ sourceId: this.id, title: name, text: "Choose a creature to sacrifice.", effect: 'executioner_sacrifice_step1', wasCast: true, cardInstance: spell });
                } else if (name === 'Warrior\'s Ways') {
                    queueTargetingEffect({ sourceId: this.id, title: name, text: "Choose a creature to get +2/+2 until end of turn.", effect: 'warrior_ways_step1', wasCast: true, isFoil: false, cardInstance: spell });
                } else if (name === 'Whispers of the Dead') {
                    queueTargetingEffect({ sourceId: this.id, title: name, text: "Choose a creature to sacrifice.", effect: 'whispers_sacrifice', wasCast: true, cardInstance: spell });
                } else if (name === 'Ceremony of Tribes') {
                    queueTargetingEffect({ sourceId: this.id, title: name, text: "Choose the first creature to copy.", effect: 'ceremony_step1', wasCast: true, cardInstance: spell });
                } else if (name === 'Up in Arms') {
                    spell.onApply(null, board);
                } else if (isEquipment) {
                    queueTargetingEffect({ sourceId: this.id, title: name, text: "Choose a creature to equip.", effect: 'equip_creature', wasCast: true, cardInstance: spell });
                } else if (targetedNames.includes(name)) {
                    queueTargetingEffect({
                        sourceId: this.id,
                        cardInstance: spell,
                        title: name,
                        text: spell.effect_text || spell.rules_text,
                        effect: 'infuse_spell_resolution',
                        owner: 'player',
                        wasCast: true,
                        isFoil: false
                    });
                } else {
                    // Fallback for untargeted spells
                    spell.onCast(board);
                }
                
                // Trigger triggers
                board.forEach(c => c.onNoncreatureCast(spell, board, []));
            });
        }
    }

    class MichalTheAnointed extends BaseCard { }

    class LadriaWindwatcher extends BaseCard {
        onETB(board) {
            // Standard trigger: 2 birds. Foil trigger 2: 2 birds. Total 4.
            for (let i = 0; i < 2; i++) {
                const bird = createToken('Bird', 'AEX', this.owner);
                if (bird && board.length < boardLimit) {
                    bird.pt = "1/1";
                    board.push(bird);
                    triggerETB(bird, board);
                    // Trigger ETB for others
                    board.forEach(c => {
                        if (c.id !== bird.id) c.onOtherCreatureETB(bird, board);
                    });
                }
            }
        }
        onAttack(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const targets = board.filter(c => c.id !== this.id && !c.isDying && !c.isDestroyed);
            
            if (state.phase === 'BATTLE') {
                const snapshots = new Map();
                targets.forEach(c => {
                    c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                    c.isPulsing = true;
                    addCounters(c, multiplier, board, true, true);
                    snapshots.set(c.id, c.takeSnapshot());
                });

                queueAnimation(async () => {
                    const pulses = targets.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    targets.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });

                // Manual Notification AFTER queuing the pulse
                targets.forEach(c => {
                    board.forEach(other => {
                        if (other.id !== c.id) {
                            other.onCounterPlaced(multiplier, 'plus-one', c, board);
                        }
                    });
                });
            } else {
                targets.forEach(c => {
                    addCounters(c, multiplier, board);
                });
            }
            
            const result = [...targets];
            result.animationsHandled = true;
            return result;
        }
    }

    class ErinBeaconOfHumility extends BaseCard {
        onAttack(board) {
            if (state.phase !== 'BATTLE' || !state.battleBoards) return [];
            const opponentOwner = (this.owner === 'player') ? 'opponent' : 'player';
            const opponentBoard = state.battleBoards[opponentOwner];
            const validTargets = opponentBoard.filter(c => !c.isDying && !c.isDestroyed);
            
            if (validTargets.length > 0) {
                const victim = validTargets[Math.floor(Math.random() * validTargets.length)];
                victim.temporaryHumility = true;
                victim.damageTaken = 0;
                return [victim];
            }
            return [];
        }
    }

    class CitadelColossus extends BaseCard { }

    class VirulentCactaipan extends BaseCard { }

    class ServantsOfDydren extends BaseCard {
        onETB(board, isDouble = false) {
            const entity = getEntity(this.owner);
            if (entity && entity.deadServantsCount > 0) {
                const servantsData = availableCards.find(c => c.card_name === 'Servants of Dydren');
                while (entity.deadServantsCount > 0 && board.length < boardLimit) {
                    const s = CardFactory.create(servantsData);
                    s.owner = this.owner;
                    board.push(s);
                    entity.deadServantsCount--;
                }
            }
        }
        getDynamicBuffs(board) {
            let { p, t } = super.getDynamicBuffs(board);
            const others = board?.filter(c => c.card_name === 'Servants of Dydren' && c.id !== this.id).length || 0;
            const multiplier = this.isFoil ? 4 : 2;
            p += (others * multiplier);
            t += (others * multiplier);
            return { p, t };
        }
    }

    class HoltunBandElder extends BaseCard {
        onDeath(board, owner) {
            const multiplier = this.isFoil ? 2 : 1;
            const spawns = [];
            const count = 2 * multiplier;
            // board currently contains the dead card.
            const currentOtherCount = board.length - 1;
            const allowed = Math.max(0, boardLimit - currentOtherCount);
            
            for (let i = 0; i < Math.min(count, allowed); i++) {
                const token = createToken('Centaur Knight', 'GSC', owner);
                if (token) spawns.push(token);
            }
            return spawns;
        }
    }

    class WhispersOfTheDead extends BaseCard {
        onApply(target, board) {
            // This is handled in applyTargetedEffect via whispers_sacrifice effect
        }
    }

    class WaspbackBandit extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const entity = getEntity(this.owner);
            if (entity) {
                const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
                entity.treasures = (entity.treasures || 0) + multiplier;
            }
        }
    }

    class MurkbornMammoth extends BaseCard { }

    class HissingSunspitter extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const host = this;
            if (host.owner !== 'player' || !board) return;
            const multiplier = host.isFoil ? 2 : 1;
            
            const effectTargets = [];
            const spellCount = state.spellsCastThisTurn;

            // "if it's the second spell you cast this turn"
            if (spellCount === 2) {
                board.forEach(c => {
                    if (c.owner === 'player') {
                        c.tempPower += multiplier;
                        c.tempToughness += multiplier;
                        effectTargets.push(c);
                    }
                });
            } 
            // "if it's the third spell you cast this turn"
            else if (spellCount === 3) {
                board.forEach(c => {
                    if (c.owner === 'player') {
                        if (!c.enchantments) c.enchantments = [];
                        if (!c.enchantments.some(e => e.card_name === 'Sunspitter FS')) {
                            c.enchantments.push({ card_name: 'Sunspitter FS', rules_text: 'First strike', isTemporary: true });
                            effectTargets.push(c);
                        }
                    }
                });
            }

            if (effectTargets.length > 0) {
                const snapshots = new Map();
                effectTargets.forEach(t => {
                    t.pulseQueueCount = (t.pulseQueueCount || 0) + 1;
                    t.isPulsing = true;
                    snapshots.set(t.id, t.takeSnapshot());
                });

                queueAnimation(async () => {
                    const pulses = effectTargets.map(t => pulseCardElement(t, board, snapshots.get(t.id)));
                    await Promise.all(pulses);
                    effectTargets.forEach(t => {
                        t.pulseQueueCount--;
                        if (t.pulseQueueCount <= 0) {
                            delete t.isPulsing;
                            delete t.pulseQueueCount;
                        }
                    });
                });
            }
        }
    }

    class CeremonyOfTribes extends BaseCard {
        onApply(target, board) {
            // This is handled in applyTargetedEffect via ceremony_step1
        }
    }

    class ThunderRaptor extends BaseCard {
        onETB(board) {
            traverseCirrusea(this, board);
        }
    }

    class RestlessOppressor extends BaseCard {
        onOtherCreatureDeath(deadCard, board) {
            if (state.phase === 'SHOP' && this.owner === deadCard.owner) {
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(this, multiplier, board);
            }
        }
    }

    class StridingCascade extends BaseCard {
        onCounterPlaced(count, type, target, board) {
            if (type === 'plus-one' && !this.cascadeTriggeredThisTurn && this.owner === target.owner) {
                this.cascadeTriggeredThisTurn = true;
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(this, multiplier, board);
            }
        }
        onShopStart() { this.cascadeTriggeredThisTurn = false; }
    }

    class SongOfWindAndFire extends BaseCard {
        onCast(board) {
            if (board !== state.player.board) return;
            const dragon = createToken('Dragon', 'NJB', 'player');
            if (dragon && board.length < boardLimit) {
                board.push(dragon);
                triggerETB(dragon, board);
                board.forEach(c => { if (c.id !== dragon.id) c.onOtherCreatureETB(dragon, board); });
            }
            const bard = createToken('Bard', 'NJB', 'player');
            if (bard && board.length < boardLimit) {
                board.push(bard);
                triggerETB(bard, board);
                board.forEach(c => { if (c.id !== bard.id) c.onOtherCreatureETB(bard, board); });
            }
        }
    }

    class Bard extends BaseCard {
        async onAttack(board) {
            // 1. Increment spell cast count (counts as a spellcast trigger)
            state.spellsCastThisTurn++;

            // Snapshot stats to detect actual changes
            const snapshots = new Map();
            board.forEach(c => {
                const stats = c.getDisplayStats(board);
                snapshots.set(c.id, { p: stats.p, t: stats.t });
            });

            // 2. Trigger spellcasts for the board (Prowess etc)
            board.forEach(c => {
                if (c.id !== this.id) c.onNoncreatureCast(false, board, []);
            });

            // Identify creatures that actually changed stats
            const affected = board.filter(c => {
                if (c.id === this.id) return false;
                const old = snapshots.get(c.id);
                const current = c.getDisplayStats(board);
                return old && (old.p !== current.p || old.t !== current.t);
            });

            if (board.length >= boardLimit) {
                render();
                if (typeof document !== 'undefined') await new Promise(r => setTimeout(r, 600));
                return affected;
            }

            // 3. Create the 4/4 Dragon
            const dragon = createToken('Dragon', 'NJB', this.owner);
            if (!dragon) return affected;

            // 4. Position: Directly to the right
            const hostIdx = board.indexOf(this);
            if (hostIdx !== -1) {
                board.splice(hostIdx + 1, 0, dragon);
            } else {
                board.push(dragon);
            }

            // 5. Combat Queue: Move to front
            if (state.phase === 'BATTLE' && state.battleQueues) {
                const q = state.battleQueues[this.owner];
                const qIdx = q.indexOf(dragon);
                if (qIdx !== -1) {
                    q.splice(qIdx, 1);
                    q.unshift(dragon);
                }
            }

            // 6. Trigger ETB
            triggerETB(dragon, board);
            board.forEach(c => {
                if (c.id !== dragon.id) c.onOtherCreatureETB(dragon, board);
            });

            // 7. Animation Pause
            render();
            if (typeof document !== 'undefined') {
                await new Promise(r => setTimeout(r, 600));
            }

            return affected;
        }
    }

    class DecoratedWarrior extends BaseCard {
        async onAttack(board) {
            const multiplier = this.isFoil ? 2 : 1;
            await addCounters(this, multiplier, board);
            const res = [this];
            res.animationsHandled = true;
            return res;
        }
    }

    class CloudlineSovereign extends BaseCard {
        onETB(board) {
            addCounters(this, 1, board);
        }
        onShopStart(board) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a counter to remove.",
                effect: 'cloudline_sovereign_step1',
                isFoil: this.isFoil,
                isMandatory: false
            });
        }
    }

    class NightfallRaptor extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a creature to return to your hand.",
                effect: 'nightfall_raptor_bounce',
                isFoil: this.isFoil,
                wasCast: !isDouble,
                isMandatory: isDouble,
                needsETBBroadcast: true
            });
        }
    }

    class TriumphantTactics extends BaseCard {
        onCast(board) {
            const snapshots = new Map();
            board.forEach(c => {
                if (!c.enchantments) c.enchantments = [];
                c.enchantments.push({ card_name: 'Triumphant Tactics', rules_text: 'Double strike', isTemporary: true });
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                snapshots.set(c.id, c.takeSnapshot());
            });

            if (board.length > 0) {
                queueAnimation(async () => {
                    const pulses = board.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    board.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });
            }
        }
    }

    class SavageCongregation extends BaseCard {
        onCast(board) {
            const pool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && (c.tier || 1) <= 4 && c.shape !== 'token');
            
            const t1Pool = pool.filter(c => (c.tier || 1) === 1);
            const t4Pool = pool.filter(c => (c.tier || 1) === 4);
            
            const creatures = [];
            if (t1Pool.length > 0 && t4Pool.length > 0) {
                // Pick one T1
                const t1 = t1Pool[Math.floor(Math.random() * t1Pool.length)];
                creatures.push(t1);
                
                // Pick one T4
                const t4 = t4Pool[Math.floor(Math.random() * t4Pool.length)];
                creatures.push(t4);
                
                // Pick 4 more distinct from remaining
                const remaining = pool.filter(c => c.card_name !== t1.card_name && c.card_name !== t4.card_name);
                const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());
                for (let i = 0; i < 4 && i < shuffledRemaining.length; i++) {
                    creatures.push(shuffledRemaining[i]);
                }
                
                // Final shuffle so T1/T4 aren't predictably in slots 1 and 2
                creatures.sort(() => 0.5 - Math.random());
            } else {
                // Fallback to old logic
                const shuffled = [...pool].sort(() => 0.5 - Math.random());
                for (let i = 0; i < Math.min(6, shuffled.length); i++) {
                    creatures.push(shuffled[i]);
                }
            }

            queueDiscovery({
                cards: creatures.map(c => CardFactory.create(c)),
                title: 'SAVAGE CONGREGATION',
                text: 'Choose any number of creatures with total Tier 4 or less.',
                effect: 'savage_congregation',
                multiSelect: true,
                maxTier: 4,
                maxCount: 2,
                selected: [],
                sourceId: this.id
            });
        }
    }

    class NdengoBrutalizer extends BaseCard {
        onETB(board) {
            const others = board.filter(c => c.id !== this.id && c.owner === this.owner);
            if (others.length === 0) {
                // Solo choice
                const options = [
                    { card_name: 'First Strike', rules_text: 'First strike', type: 'Counter' },
                    { card_name: 'Trample', rules_text: 'Trample', type: 'Counter' }
                ];
                queueDiscovery({
                    cards: options.map(o => CardFactory.create(o)),
                    isKeywordChoice: true,
                    title: 'NDENGO BRUTALIZER',
                    text: 'Choose a keyword to teach to Ndengo Brutalizer.',
                    effect: 'ndengo_solo',
                    sourceId: this.id
                });
            } else {
                queueTargetingEffect({
                    sourceId: this.id,
                    title: this.card_name,
                    text: "Choose a creature to teach.",
                    effect: 'ndengo_target'
                });
            }
        }
    }

    class PyrewrightTrainee extends BaseCard {
        onAttack(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const others = board.filter(c => c.id !== this.id && c.owner === this.owner);
            others.forEach(c => {
                c.tempPower += multiplier;
            });
            return others;
        }
    }

    class DancingMirrorblade extends BaseCard {
        async onEquippedAttack(host, board) {
            if (board.length >= boardLimit) return;
            
            // Create copy
            const token = CardFactory.create(host);
            token.id = `mirror-token-${Math.random()}`;
            token.owner = host.owner;
            // DO NOT set shape='token' because that forces a "t" suffix in the image path
            // causing 404s for cards that don't have dedicated token artwork (like Trainee).
            token.shape = host.shape; 
            
            // Mirror rules: Copy counters/enchantments but NOT the mirrorblade itself
            token.counters = host.counters;
            token.flyingCounters = host.flyingCounters;
            token.menaceCounters = host.menaceCounters;
            token.firstStrikeCounters = host.firstStrikeCounters;
            token.doubleStrikeCounters = host.doubleStrikeCounters;
            token.vigilanceCounters = host.vigilanceCounters;
            token.lifelinkCounters = host.lifelinkCounters;
            token.trampleCounters = host.trampleCounters;
            token.reachCounters = host.reachCounters;
            token.hexproofCounters = host.hexproofCounters;
            token.shieldCounters = host.shieldCounters;
            token.tempPower = host.tempPower;
            token.tempToughness = host.tempToughness;
            token.enchantments = [...host.enchantments];
            token.equipment = null; 
            token.isTemporary = true; // Mark for cleanup
            
            // Marked for exile
            token.enchantments.push({ card_name: 'Mirrorblade Exile', rules_text: 'Exile at end of combat', isTemporary: true });

            // Spawn to the right of the attacker
            const idx = board.indexOf(host);
            if (board.length < boardLimit) {
                if (idx !== -1) {
                    board.splice(idx + 1, 0, token);
                } else {
                    board.push(token);
                }

                // Add to the middle of the battle queue (the very next turn for this owner)
                if (state.phase === 'BATTLE' && state.battleQueues) {
                    state.battleQueues[host.owner].unshift(token);
                }
                
                // Broadast entry for other effects (not ETB triggers for the token itself)
                board.forEach(c => {
                    if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                });
            }

            if (typeof document !== 'undefined') {
                token.isSpawning = true;
                // Wait for the wind-up animation to finish first so the token spawns right as the hit happens
                await new Promise(r => setTimeout(r, 100)); 
                render();
                
                await new Promise(r => setTimeout(r, 600));
                delete token.isSpawning;
                render(); // Final cleanup render
            }
        }
    }

    class WarhammerKreg extends BaseCard {
        getEquipmentStats(target) {
            return { p: 1, t: 1 };
        }
    }

    class TheExileQueensCrown extends BaseCard {
        async onEquippedAttack(host, board) {
            const targets = board.filter(c => c.id !== host.id);
            if (targets.length === 0) return;

            const snapshots = new Map();
            targets.forEach(c => {
                c.tempPower += 1;
                c.tempToughness += 1;
                if (!c.enchantments) c.enchantments = [];
                c.enchantments.push({ card_name: 'Crown Protection', rules_text: 'Indestructible', isTemporary: true });
                c.isPulsing = true;
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                snapshots.set(c.id, c.takeSnapshot());
            });

            queueAnimation(async () => {
                const pulses = targets.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                await Promise.all(pulses);
                targets.forEach(c => {
                    c.pulseQueueCount--;
                    if (c.pulseQueueCount <= 0) {
                        delete c.isPulsing;
                        delete c.pulseQueueCount;
                    }
                });
            });
            await resolveAnimations();
        }
    }

    class DragonlordsCarapace extends BaseCard {
        getEquipmentStats(target) {
            return { p: 8, t: 8 };
        }
    }

    class DjitusLithifiedMantle extends BaseCard {
        async onEquippedAttack(host, board) {
            const hasDjitu = board.some(c => c.card_name === 'Jwanga Djitu');
            if (hasDjitu || board.length >= boardLimit) return;

            const token = createToken('Jwanga Djitu', 'ACE', host.owner);
            if (!token) return;

            // Add to board to the right of host
            const hostIdx = board.indexOf(host);
            if (hostIdx !== -1) {
                board.splice(hostIdx + 1, 0, token);
            } else {
                board.push(token);
            }

            triggerETB(token, board);
            board.forEach(c => {
                if (c.id !== token.id) c.onOtherCreatureETB(token, board);
            });

            // Move to front of combat queue so it attacks next (after opponent)
            if (state.phase === 'BATTLE' && state.battleQueues) {
                const q = state.battleQueues[host.owner];
                const qIdx = q.indexOf(token);
                if (qIdx !== -1) {
                    q.splice(qIdx, 1);
                    q.unshift(token);
                }
            }

            // Animation
            if (typeof document !== 'undefined') {
                token.isSpawning = true;
                await new Promise(r => setTimeout(r, 100));
                render();
                await new Promise(r => setTimeout(r, 600));
                delete token.isSpawning;
                render();
            }

            // Broadast ETB
            board.forEach(c => {
                if (c.id !== token.id) c.onOtherCreatureETB(token, board);
            });
        }
    }

    class AshWitheredCloak extends BaseCard {
        getEquipmentStats(target) {
            return { p: 2, t: 2 };
        }
    }

    class SteelBarding extends BaseCard {
        getEquipmentStats(target) {
            return { p: 3, t: 3 };
        }
    }

    class RivhasBlessedBlade extends BaseCard {
        getEquipmentStats(target) {
            return { p: 1, t: 1 };
        }
        hasKeyword(kw) {
            if (kw.toLowerCase() === 'flying') return true;
            return super.hasKeyword(kw);
        }
    }

    class BlacksteelLoadout extends BaseCard {
        getEquipmentStats(target) {
            return { p: 4, t: 2 };
        }
        hasKeyword(kw) {
            const list = ['first strike', 'vigilance', 'trample'];
            if (list.includes(kw.toLowerCase())) return true;
            return super.hasKeyword(kw);
        }
    }

    class LagoonLogistics extends BaseCard {
        effect_text = 'Choose a creature to exile, then return to the battlefield.';
        onApply(target, board) {
            const raw = availableCards.find(c => c.card_name === target.card_name && (target.set ? c.set === target.set : true));
            if (!raw) return; // Safety: Don't blink if we can't recreate

            state.panharmoniconActive = true;
            
            // Remove from wherever it is (board or hand)
            const boardIdx = board.indexOf(target);
            const handIdx = state.player.hand.indexOf(target);
            
            // If it's not on the board (it's in hand) and the board is full, do nothing.
            if (boardIdx === -1 && board.length >= boardLimit) return;

            if (boardIdx !== -1) board.splice(boardIdx, 1);
            if (handIdx !== -1) state.player.hand.splice(handIdx, 1);

            if (target.equipment && state.player.hand.length < handLimit) {
                state.player.hand.push(target.equipment);
            }

            const fresh = CardFactory.create(raw);
            fresh.owner = 'player';
            fresh.isFoil = target.isFoil; // Keep foil status

            // Return to battlefield (at same index if was on board, else end)
            if (boardIdx !== -1) {
                board.splice(boardIdx, 0, fresh);
            } else {
                board.push(fresh);
            }
            
            // Trigger ETB (Doubled because we just set state.panharmoniconActive = true)
            triggerETB(fresh, board);
            
            // Broadcast to others
            board.forEach(c => {
                if (c.id !== fresh.id) c.onOtherCreatureETB(fresh, board);
            });
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

    class MagnificWilderkin extends BaseCard {
        onCombatStart(board, host = this) {
            const keywords = [
                'Flying', 'First strike', 'Double strike', 'Deathtouch', 'Haste',
                'Hexproof', 'Indestructible', 'Lifelink', 'Menace', 'Reach',
                'Trample', 'Vigilance'
            ];
            const others = board.filter(c => c.id !== host.id && c.owner === host.owner);
            let gained = false;
            
            const multiplier = host.isFoil ? 2 : 1;
            
            keywords.forEach(kw => {
                if (others.some(c => c.hasKeyword(kw))) {
                    host.tempPower += multiplier;
                    host.tempToughness += multiplier;
                    
                    // Grant temporary keyword via enchantment
                    if (!host.enchantments) host.enchantments = [];
                    host.enchantments.push({ 
                        card_name: 'Wilderkin Grant', 
                        rules_text: kw,
                        isTemporary: true 
                    });
                    gained = true;
                }
            });
            return gained ? [host] : [];
        }
    }

    class DwarvenPhalanx extends BaseCard {
        onCombatStart(board, host = this) {
            const others = board.filter(c => c.id !== host.id && c.owner === host.owner);
            if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                const multiplier = host.isFoil ? 2 : 1;
                addCounters(target, multiplier, board);
                if (!target.enchantments) target.enchantments = [];
                for (let i = 0; i < multiplier; i++) {
                    target.enchantments.push({ card_name: 'Phalanx Grant', rules_text: 'Indestructible', isTemporary: true });
                }
                return [target];
            }
            return [];
        }
    }

    class LairRecluse extends BaseCard {
        onETB(board) {
            this.vigilanceCounters += 1;
            this.reachCounters += 1; 
            this.pulse(board);
        }
        onShopStart(board) {
            // Only trigger if we have another creature to receive the counters
            if (board.length > 1) {
                queueTargetingEffect({
                    sourceId: this.id,
                    title: this.card_name,
                    text: "Choose a counter to remove.",
                    effect: 'permutate_step1',
                    isFoil: this.isFoil,
                    isMandatory: false
                });
            }
        }
    }

    class TunnelWebSpider extends BaseCard { }

    class HeroOfHedria extends BaseCard { }

    class HeroOfALostWar extends BaseCard {
        onCombatStart(board, host = this) {
            // "target Centaur you control has base power and toughness 4/4 and gains indestructible until end of turn"
            const myCentaurs = board.filter(c => c.owner === host.owner && c.isType('Centaur'));
            if (myCentaurs.length > 0) {
                const target = myCentaurs[Math.floor(Math.random() * myCentaurs.length)];
                
                // Set base P/T to 4/4 via temporary stats
                const base = target.getBasePT();
                const multiplier = host.isFoil ? 2 : 1;
                target.tempPower += ((4 - base.p) * multiplier);
                target.tempToughness += ((4 - base.t) * multiplier);

                if (!target.enchantments) target.enchantments = [];
                for (let i = 0; i < multiplier; i++) {
                    target.enchantments.push({ card_name: 'Lost War Grant', rules_text: 'Indestructible', isTemporary: true });
                }
                return [target];
            }
            return [];
        }
    }

    class GhessianMemories extends BaseCard {
        onCast(board) {
            if (board.length < boardLimit) {
                const token = createToken('Centaur Knight', 'GSC', 'player');
                if (token) {
                    token.pt = "3/3"; // Override 2/2
                    token.rules_text = ""; // Remove Vigilance
                    board.push(token);
                    triggerETB(token, board);
                    // Broadcast ETB
                    board.forEach(c => {
                        if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                    });
                }
            }
            
            const options = [
                { card_name: 'Hexproof', rules_text: 'Hexproof', type: 'Counter' },
                { card_name: 'Reach', rules_text: 'Reach', type: 'Counter' },
                { card_name: 'Trample', rules_text: 'Trample', type: 'Counter' }
            ];

            queueDiscovery({
                cards: options.map(o => CardFactory.create(o)),
                isKeywordChoice: true,
                title: 'GHESSIAN MEMORIES',
                text: 'Choose a keyword to grant each creature you control until end of turn.',
                effect: 'ghessian_buff',
                sourceId: this.id,
                remaining: 1,
                isFoil: false
            });
        }
    }

    class LingeringLunatic extends BaseCard {
        onETB(board) {
            proliferate(board, this.owner, 1);
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
                queueTargetingEffect({
                    sourceId: this.id,
                    title: this.card_name,
                    text: "Choose a creature to get the first +1/+1 counter.",
                    effect: 'up_in_arms_step1',
                    wasCast: true,
                    cardInstance: this,
                    owner: this.owner || 'player'
                });
                return;
            }
            
            // Step 2 initialization (this was the old onApply body)
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a creature to get the second +1/+1 counter.",
                target1Id: target.id,
                effect: 'up_in_arms_step2',
                isFoil: false,
                owner: this.owner || 'player'
            });
        }
    }

    class CabracansFamiliar extends BaseCard { }

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

    class Foresee extends BaseCard {
        onCast(board) {
            if (board === state.player.board) {
                addScry(4, () => {
                    // Add two creatures to shop divination-style (adds to current, uses scry queue)
                    addCardsToShop(2, 'creature', 1);
                    render();
                }, this.card_name);
            }
        }
    }

    class FightSong extends BaseCard {
        effect_text = 'Choose a creature to get a +1/+1 counter and gain indestructible until end of turn.';
        onApply(target, board) {
            target.isPulsing = true;
            addCounters(target, 1, board, true);
            if (!target.enchantments) target.enchantments = [];
            target.enchantments.push({ card_name: 'Fight Song Grant', rules_text: 'Indestructible', isTemporary: true });
            target.pulse(board);
        }
    }

    class EdgeOfTheSeats extends BaseCard {
        async onCast(board) {
            const lifeGain = board.length;
            const snapshots = new Map();
            
            board.forEach(c => {
                c.tempPower += 1;
                c.tempToughness += 1;
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                snapshots.set(c.id, c.takeSnapshot());
            });

            if (board.length > 0) {
                queueAnimation(async () => {
                    const pulses = board.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    board.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });
            }

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

    class RazorbackTrenchrunner extends BaseCard {
        onDeath(board, owner) {
            const tokens = [];
            const count = this.isFoil ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const token = createToken('Ox', 'KOD', owner);
                if (token) {
                    token.id = `ox-${Math.random()}`;
                    // CUSTOM: Trigger immediate attack logic for the spawn ONLY in battle
                    if (state.phase === 'BATTLE') {
                        token.isTrenchrunnerSpawn = true; 
                    }
                    tokens.push(token);
                }
            }
            return tokens;
        }
    }

    class SporegraftSlime extends BaseCard {
        async onDeath(board, owner) {
            // Both shop and combat: Target random friendly creature (not dying)
            const friends = board.filter(c => c.id !== this.id && c.getDisplayStats(board).t > 0);
            if (friends.length > 0) {
                const target = friends[Math.floor(Math.random() * friends.length)];
                const multiplier = this.isFoil ? 2 : 1;
                await addCounters(target, 2 * multiplier, board);
            }
            return [];
        }
    }

    class CovetousWechuge extends BaseCard {
        onAction() {
            queueTargetingEffect({ 
                sourceId: this.id, 
                title: this.card_name,
                text: "Choose a creature to sacrifice.",
                effect: 'wechuge_sacrifice',
                isMandatory: false
            });
        }
    }

    class ArroydPassShepherd extends BaseCard { }

    class WarbandRallier extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a Centaur to get two +1/+1 counters.",
                effect: 'warband_rallier_counters',
                wasCast: !isDouble,
                isFoil: this.isFoil,
                isMandatory: isDouble
            });
        }
    }

    class CybresBandRecruiter extends BaseCard {
        onETB(board) {
            if (board.length < boardLimit) {
                const token = createToken('Centaur Knight', 'GSC', 'player');
                if (token) {
                    const idx = board.indexOf(this);
                    if (idx !== -1) {
                        board.splice(idx + 1, 0, token);
                        triggerETB(token, board);
                        // Broadcast ETB
                        board.forEach(c => {
                            if (c.id !== token.id) c.onOtherCreatureETB(token, board);
                        });
                    }
                }
            }
        }
    }

    class CybresClanSquire extends BaseCard {
        onOtherCreatureETB(newCard, board) {
            if (newCard.isType('Centaur') && newCard.owner === this.owner) {
                const multiplier = this.isFoil ? 2 : 1;
                addCounters(this, multiplier, board);
            }
        }
    }

    class CybresBandLancer extends BaseCard {
        onAttack(board) {
            const otherCentaurs = board.filter(c => c.id !== this.id && c.isType('Centaur'));
            if (otherCentaurs.length > 0) {
                const target = otherCentaurs[Math.floor(Math.random() * otherCentaurs.length)];
                const multiplier = this.isFoil ? 2 : 1;
                target.tempPower += multiplier;
                target.tempToughness += multiplier;
                if (!target.enchantments) target.enchantments = [];
                if (!target.enchantments.some(e => e.card_name === 'Lancer First Strike')) {
                    target.enchantments.push({ card_name: 'Lancer First Strike', rules_text: 'First strike', isTemporary: true });
                }
                return [target];
            }
            return [];
        }
    }

    class FinwingDrake extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            this.tempPower += multiplier;
            this.tempToughness += multiplier;
            this.pulse(board);
        }
    }

    class ShrewdParliament extends BaseCard {
        onETB(board, isDouble = false) {
            queueTargetingEffect({
                sourceId: this.id,
                title: this.card_name,
                text: "Choose a card to discard.",
                effect: 'parliament_discard',
                wasCast: !isDouble,
                cardInstance: this,
                isFoil: this.isFoil,
                isMandatory: isDouble,
                owner: this.owner
            });
        }
    }

    class PaleDillettante extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            addCounters(this, multiplier, board);
        }
    }

    class AetherGuzzler extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            const snapshots = new Map();
            board.forEach(c => {
                c.tempPower += multiplier;
                c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                c.isPulsing = true;
                snapshots.set(c.id, c.takeSnapshot());
            });

            if (board.length > 0) {
                queueAnimation(async () => {
                    const pulses = board.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    board.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });
            }
        }
    }

    class DewdropOracle extends BaseCard {
        onETB(board) {
            const noncreatures = availableCards.filter(c =>
                c.type && !c.type.toLowerCase().includes('creature') &&
                !c.type.toLowerCase().includes('equipment') &&
                c.shape !== 'token' &&
                (c.tier || 1) <= 2
            );
            const selection = [];
            const multiplier = 1;
            for (let i = 0; i < 4 * multiplier; i++) {
                selection.push(CardFactory.create(noncreatures[Math.floor(Math.random() * noncreatures.length)]));
            }
            queueDiscovery({
                cards: selection,
                title: this.card_name,
                text: 'Choose a noncreature card.'
            });
        }
    }
    class ScourgeOfTheSun extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const isFoilCast = (typeof spell === 'object') ? spell.isFoil : spell;
            const multiplier = (this.isFoil ? 2 : 1) * (isFoilCast ? 2 : 1);
            let buff = 1 * multiplier;
            if (typeof spell === 'object' && spell.tier) {
                if (spell.tier >= 4) buff += (1 * multiplier);
            }
            this.tempPower += buff;
            this.pulse(board);
        }
    }

    class JiayinTheHarmonious extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const uniqueTargets = [...new Set(targets)];
            const validTargets = uniqueTargets.filter(t => t.id !== this.id && t.owner === this.owner && t.isType('Creature'));
            if (validTargets.length > 0) {
                const multiplier = this.isFoil ? 2 : 1;
                const snapshots = new Map();
                validTargets.forEach(t => {
                    t.tempPower += (3 * multiplier);
                    t.tempToughness += (3 * multiplier);
                    t.pulseQueueCount = (t.pulseQueueCount || 0) + 1;
                    t.isPulsing = true;
                    snapshots.set(t.id, t.takeSnapshot());
                });

                queueAnimation(async () => {
                    const pulses = validTargets.map(t => pulseCardElement(t, board, snapshots.get(t.id)));
                    await Promise.all(pulses);
                    validTargets.forEach(t => {
                        t.pulseQueueCount--;
                        if (t.pulseQueueCount <= 0) {
                            delete t.isPulsing;
                            delete t.pulseQueueCount;
                        }
                    });
                });
            }
        }
    }

    class NacreousHydra extends BaseCard {
        onETB(board) {
            addCounters(this, 4, board);
        }
        onNoncreatureCast(spell, board, targets = []) {
            proliferate(board, this.owner, 1);
        }
    }

    class AmAtambisWildkin extends BaseCard {
        async onDeath(board, owner) {
            const validTargets = board.filter(c => c.id !== this.id && c.owner === owner);
            if (validTargets.length > 0) {
                const target = validTargets[Math.floor(Math.random() * validTargets.length)];
                if (target.hasKeyword('Reach')) {
                    await addCounters(target, 1, board);
                } else {
                    await addKeywordCounter(target, 'Reach', 1, board);
                }
            }
            return [];
        }
    }

    class PestilentLeopardfly extends BaseCard {
        onOtherCreatureDeath(card, board) {
            const multiplier = this.isFoil ? 2 : 1;
            this.tempPower += (1 * multiplier);
            this.pulse(board);
        }
    }

    class TouchOfTheOmen extends BaseCard {
        effect_text = 'Gain control of target creature in the shop. Put a decayed counter on it.';
        onApply(target, board) {
            const idx = state.shop.cards.indexOf(target);
            if (idx !== -1 && state.player.board.length < boardLimit) {
                const [stolen] = state.shop.cards.splice(idx, 1);
                stolen.owner = 'player';
                if (!stolen.enchantments) stolen.enchantments = [];
                stolen.enchantments.push({ card_name: 'Touch of the Omen', rules_text: 'Decayed', isTemporary: false });
                stolen.isDecayed = true;
                state.player.board.push(stolen);
                triggerETB(stolen, state.player.board);
                state.player.board.forEach(c => {
                    if (c.id !== stolen.id) c.onOtherCreatureETB(stolen, state.player.board);
                });
            }
        }
    }

    class FacelessFaction extends BaseCard {
        async onShopEndStep(board) {
            if (state.creaturesDiedThisShopPhase) {
                const pool = availableCards.filter(c => c.card_name === 'Zombie' && c.shape === 'token');
                if (pool.length > 0 && state.player.board.length < boardLimit) {
                    const multiplier = this.isFoil ? 2 : 1;
                    const newTokens = [];
                    const myIdx = state.player.board.indexOf(this);
                    for (let i = 0; i < multiplier; i++) {
                        if (state.player.board.length < boardLimit) {
                            const zombie = CardFactory.create(pool[0]);
                            zombie.owner = 'player';
                            zombie.isDecayed = true;
                            zombie.isSpawning = true;
                            zombie.isJustChained = true; // Use the chain animation for spawn pop
                            if (!zombie.enchantments) zombie.enchantments = [];
                            zombie.enchantments.push({ card_name: 'Faceless Faction', rules_text: 'Decayed', isTemporary: false });
                            
                            // Insert to the right
                            if (myIdx !== -1) {
                                state.player.board.splice(myIdx + 1 + i, 0, zombie);
                            } else {
                                state.player.board.push(zombie);
                            }

                            newTokens.push(zombie);
                            triggerETB(zombie, state.player.board);
                            state.player.board.forEach(c => {
                                if (c.id !== zombie.id) c.onOtherCreatureETB(zombie, state.player.board);
                            });
                        }
                    }
                    if (newTokens.length > 0) {
                        render();
                        await new Promise(r => setTimeout(r, 600));
                        newTokens.forEach(t => {
                            delete t.isSpawning;
                            delete t.isJustChained;
                        });
                        render();
                    }
                }
            }
        }
    }

    class DuskbornHunter extends BaseCard {
        async onOtherCreatureDeath(card, board) {
            if (card.owner === this.owner) {
                if (!this.enchantments) this.enchantments = [];
                if (!this.enchantments.some(e => e.card_name === 'Duskborn Hunter' && e.rules_text === 'Deathtouch')) {
                    this.enchantments.push({ card_name: 'Duskborn Hunter', rules_text: 'Deathtouch', isTemporary: true });
                    await this.pulse(board);
                }
            }
        }
    }

    class NightmareHarpy extends BaseCard {
        constructor(data) {
            super(data);
            this.actionCost = 1;
        }
        onAction() {
            if (state.player.gold >= 1 && state.player.board.length > 1) {
                queueTargetingEffect({
                    sourceId: this.id,
                    title: "Cannibalize",
                    text: "Sacrifice another creature to put two +1/+1 counters on Nightmare Harpy and gain lifelink.",
                    effect: 'harpy_cannibalize',
                    isMandatory: true
                });
            }
        }
    }

    class SanguineAnaconda extends BaseCard {
        onOtherPermanentSacrificed(card, board) {
            const multiplier = this.isFoil ? 2 : 1;
            this.tempPower += (3 * multiplier);
            this.tempToughness += (3 * multiplier);
            this.pulse(board);
        }
    }

    class DuneSkirmisher extends BaseCard {
        constructor(data) {
            super(data);
            this.actionCost = 2;
        }
        onAction() {
            if (state.player.gold >= 2) {
                state.player.gold -= 2;
                const multiplier = this.isFoil ? 2 : 1;
                this.tempPower += (1 * multiplier);
                this.pulse(state.player.board);
                checkAutumnReward(this, this);
            }
        }
        hasKeyword(kw) {
            if (kw.toLowerCase() === 'first strike') return this.equipment !== null;
            return super.hasKeyword(kw);
        }
    }

    class AngoraPaladin extends BaseCard {
        onETB(board) {
            traverseOnora(this, board);
        }
    }

    class SmallWorld extends BaseCard {
        onCast(board) {
            traverseOnora(this, board);
        }
    }

    class RestlessMigrants extends BaseCard {
        onETB(board) {
            traverseAlTabaq(this, board);
        }
    }

    class SolemnPilgrimage extends BaseCard {
        onCast(board) {
            traverseAlTabaq(this, board);
        }
    }

    class JhalachScourge extends BaseCard {
        getStableStats(visualOnly = false) {
            const base = super.getStableStats(visualOnly);
            if (this.equipment !== null) {
                const multiplier = this.isFoil ? 2 : 1;
                base.p += (2 * multiplier);
                base.t += (2 * multiplier);
                base.maxT += (2 * multiplier);
            }
            return base;
        }
    }

    class AldmoreChaperone extends BaseCard {
        onTraverse(board) {
            const multiplier = this.isFoil ? 2 : 1;
            addCounters(this, 1 * multiplier, board);
        }
    }

    class TwinShivs extends BaseCard {
        getEquipmentStats(target) {
            const multiplier = this.isFoil ? 2 : 1;
            return { p: 2 * multiplier, t: 0 };
        }
    }

    class BattlefrontLancer extends BaseCard {
        onCombatStart(board) {
            const multiplier = this.isFoil ? 2 : 1;
            const myCreatures = board.filter(c => c.owner === this.owner);
            if (myCreatures.length > 0) {
                const target = myCreatures[Math.floor(Math.random() * myCreatures.length)];
                target.tempPower += (2 * multiplier);
                return [target];
            }
            return [];
        }
    }

    class GallantCentaur extends BaseCard { }

    class HoltunBandEmissary extends BaseCard {
        onNoncreatureCast(spell, board, targets = []) {
            const wasTargeted = targets.some(t => t.id === this.id);
            if (wasTargeted) {
                const centaurs = board.filter(c => c.id !== this.id && c.isType('Centaur'));
                if (centaurs.length > 0) {
                    const multiplier = this.isFoil ? 2 : 1;
                    const snapshots = new Map();
                    centaurs.forEach(c => {
                        if (!c.enchantments) c.enchantments = [];
                        c.enchantments.push({ card_name: 'Emissary Protection', rules_text: 'Indestructible', isTemporary: true });
                        c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                        c.isPulsing = true;
                        snapshots.set(c.id, c.takeSnapshot());
                    });

                    queueAnimation(async () => {
                        const pulses = centaurs.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                        await Promise.all(pulses);
                        centaurs.forEach(c => {
                            c.pulseQueueCount--;
                            if (c.pulseQueueCount <= 0) {
                                delete c.isPulsing;
                                delete c.pulseQueueCount;
                            }
                        });
                    });
                }
            }
        }
    }

    function resetTemporaryStats() {
        state.player.board = state.player.board.filter(c => !c.isCrainToken && !c.isTemporary);
        state.player.board.forEach(c => {
            c.tempPower = 0;
            c.tempToughness = 0;
            c.isLockedByChivalry = false;
            c.damageTaken = 0;
            c.isDestroyed = false;
            c.enchantments = (c.enchantments || []).filter(e => !e.isTemporary);
            });
            state.opponents.forEach(opp => {
            opp.board = opp.board.filter(c => !c.isCrainToken && !c.isTemporary);
            opp.board.forEach(c => {
                c.tempPower = 0;
                c.tempToughness = 0;
                c.isLockedByChivalry = false;
                c.damageTaken = 0;
                c.isDestroyed = false;
                c.enchantments = (c.enchantments || []).filter(e => !e.isTemporary);
            });
            opp.fightHp = 5 + (5 * opp.tier);
            opp.honorBegetsGloryBonus = 0;
            });
            state.player.honorBegetsGloryBonus = 0;
            }
    function showKeywordBubble(targetOrId, keyword) {
        if (!targetOrId || !keyword) return;
        const cabinet = document.getElementById('game-cabinet');
        if (!cabinet) return;

        let targetEl = (typeof targetOrId === 'string') ? document.getElementById(`card-${targetOrId}`) : targetOrId;
        if (!targetEl) return;

        const data = KEYWORD_DATA[keyword];
        if (!data) return;

        const bubble = document.createElement('div');
        const kwClass = keyword.toLowerCase().replace(' ', '-');
        bubble.className = `keyword-icon-bubble ${kwClass}`;
        
        const img = document.createElement('img');
        img.src = data.icon;
        img.alt = keyword;
        bubble.appendChild(img);
        
        cabinet.appendChild(bubble);

        const startTime = Date.now();
        const duration = 1200;

        function updateBubblePosition() {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                bubble.remove();
                return;
            }

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

    function addKeywordCounter(target, type, amount, board, skipAnimation = false, skipNotification = false) {
        if (!target || amount <= 0) return;
        
        let prop = type.toLowerCase().replace(' ', '') + 'Counters';
        if (type === 'First strike') prop = 'firstStrikeCounters';
        if (type === 'Double strike') prop = 'doubleStrikeCounters';

        if (target[prop] === undefined) target[prop] = 0;
        target[prop] += amount;

        if (!skipAnimation) {
            target.pulse(board);
        }

        if (board && !skipNotification) {
            board.forEach(c => {
                if (c.id !== target.id) {
                    c.onCounterPlaced(amount, type, target, board);
                }
            });
        }
    }

    async function addKeywordCounter(target, type, amount, board, skipAnimation = false, skipNotification = false) {
        if (!target || amount <= 0) return;
        
        let prop = type.toLowerCase().replace(' ', '') + 'Counters';
        if (type === 'First strike') prop = 'firstStrikeCounters';
        if (type === 'Double strike') prop = 'doubleStrikeCounters';

        if (target[prop] === undefined) target[prop] = 0;
        target[prop] += amount;

        if (!skipAnimation) {
            await target.pulse(board);
        }

        if (board && !skipNotification) {
            board.forEach(c => {
                if (c.id !== target.id) {
                    c.onCounterPlaced(amount, type, target, board);
                }
            });
        }
    }

    const CardFactory = {
        create(data) {
            if (!data) return null;
            const name = data.card_name;
            let card;
            switch(name) {
                case 'Soulsmoke Adept': card = new SoulsmokeAdept(data); break;
                case 'Glumvale Raven': card = new GlumvaleRaven(data); break;
                case 'War-Clan Dowager': card = new WarClanDowager(data); break;
                case 'Sparring Campaigner': card = new SparringCampaigner(data); break;
                case 'Clairvoyant Koi': card = new ClairvoyantKoi(data); break;
                case 'Blistering Lunatic': card = new BlisteringLunatic(data); break;
                case 'Earthrattle Xali': card = new EarthrattleXali(data); break;
                case 'Dynamic Wyvern': card = new DynamicWyvern(data); break;
                case 'Bristled Direbear': card = new BristledDirebear(data); break;
                case 'Consult the Dewdrops': card = new ConsultTheDewdrops(data); break;
                case 'Envoy of the Pure': card = new EnvoyOfThePure(data); break;
                case 'Centaur Wayfinder': card = new CentaurWayfinder(data); break;
                case 'Scourge of the Sun': card = new ScourgeOfTheSun(data); break;
                case 'Jiayin, the Harmonious': card = new JiayinTheHarmonious(data); break;
                case 'Marbled Aakriti': card = new BaseCard(data); break;
                case 'Nacreous Hydra': card = new NacreousHydra(data); break;
                case 'Am\'Atambi\'s Wildkin': card = new AmAtambisWildkin(data); break;
                case 'Pestilent Leopardfly': card = new PestilentLeopardfly(data); break;
                case 'Touch of the Omen': card = new TouchOfTheOmen(data); break;
                case 'Faceless Faction': card = new FacelessFaction(data); break;
                case 'Duskborn Hunter': card = new DuskbornHunter(data); break;
                case 'Nightmare Harpy': card = new NightmareHarpy(data); break;
                case 'Sanguine Anaconda': card = new SanguineAnaconda(data); break;
                case 'Battlefront Lancer': card = new BattlefrontLancer(data); break;
                case 'Gallant Centaur': card = new GallantCentaur(data); break;
                case 'Holtun-Band Emissary': card = new HoltunBandEmissary(data); break;
                case 'Warband Lieutenant': card = new WarbandLieutenant(data); break;
                case 'Warrior\'s Ways': card = new WarriorsWays(data); break;
                case 'Stratus Traveler': card = new StratusTraveler(data); break;
                case 'Rapacious Sprite': card = new RapaciousSprite(data); break;
                case 'Up in Arms': card = new UpInArms(data); break;
                case 'Cabracan\'s Familiar': card = new CabracansFamiliar(data); break;
                case 'Way of the Bygone': card = new WayOfTheBygone(data); break;
                case 'Moonlight Stag': card = new MoonlightStag(data); break;
                case 'Gnomish Skirmisher': card = new GnomishSkirmisher(data); break;
                case 'Foresee': card = new Foresee(data); break;
                case 'Fight Song': card = new FightSong(data); break;
                case 'Edge of Their Seats': card = new EdgeOfTheSeats(data); break;
                case 'Finwing Drake': card = new FinwingDrake(data); break;
                case 'Shrewd Parliament': card = new ShrewdParliament(data); break;
                case 'Pale Dillettante': card = new PaleDillettante(data); break;
                case 'Aether Guzzler': card = new AetherGuzzler(data); break;
                case 'Dewdrop Oracle': card = new DewdropOracle(data); break;
                case 'Arroyd Pass Shepherd': card = new ArroydPassShepherd(data); break;
                case 'Warband Rallier': card = new WarbandRallier(data); break;
                case 'Cybres-Band Recruiter': card = new CybresBandRecruiter(data); break;
                case 'Cybres-Clan Squire': card = new CybresClanSquire(data); break;
                case 'Cybres-Band Lancer': card = new CybresBandLancer(data); break;
                case 'Windsong Apprentice': card = new WindsongApprentice(data); break;
                case 'Cauther Hellkite': card = new CautherHellkite(data); break;
                case 'Lingering Lunatic': card = new LingeringLunatic(data); break;
                case 'Bellowing Giant': card = new BellowingGiant(data); break;
                case 'Bwema, the Ruthless': card = new BwemaTheRuthless(data); break;
                case 'Silverhorn Tactician': card = new SilverhornTactician(data); break;
                case 'Qinhana Cavalry': card = new QinhanaCavalry(data); break;
                case 'Mekini Eremite': card = new MekiniEremite(data); break;
                case 'Frontier Markswomen': card = new FrontierMarkswomen(data); break;
                case 'Festival Celebrants': card = new FestivalCelebrants(data); break;
                case 'Restless Oppressor': card = new RestlessOppressor(data); break;
                case 'Striding Cascade': card = new StridingCascade(data); break;
                case 'Suitor of Death': card = new SuitorOfDeath(data); break;
                case 'Lumbering Ancient': card = new LumberingAncient(data); break;
                case 'Zarax Supermajor': card = new ZaraxSupermajor(data); break;
                case 'Infuse the Apparatus': card = new InfuseTheApparatus(data); break;
                case 'Michal, the Anointed': card = new MichalTheAnointed(data); break;
                case 'Ladria, Windwatcher': card = new LadriaWindwatcher(data); break;
                case 'Erin, Beacon of Humility': card = new ErinBeaconOfHumility(data); break;
                case 'Citadel Colossus': card = new CitadelColossus(data); break;
                case 'Servants of Dydren': card = new ServantsOfDydren(data); break;
                case 'Holtun-Band Elder': card = new HoltunBandElder(data); break;
                case 'Whispers of the Dead': card = new WhispersOfTheDead(data); break;
                case 'Waspback Bandit': card = new WaspbackBandit(data); break;
                case 'Murkborn Mammoth': card = new MurkbornMammoth(data); break;
                case 'Hissing Sunspitter': card = new HissingSunspitter(data); break;
                case 'Ceremony of Tribes': card = new CeremonyOfTribes(data); break;
                case 'Hero of a Lost War': card = new HeroOfALostWar(data); break;
                case 'Hero of Hedria': card = new HeroOfHedria(data); break;
                case 'Savage Congregation': card = new SavageCongregation(data); break;
                case 'Ndengo Brutalizer': card = new NdengoBrutalizer(data); break;
                case 'Ghessian Memories': card = new GhessianMemories(data); break;
                case 'Thunder Raptor': card = new ThunderRaptor(data); break;
                case 'Cloudline Sovereign': card = new CloudlineSovereign(data); break;
                case 'Nightfall Raptor': card = new NightfallRaptor(data); break;
                case 'Triumphant Tactics': card = new TriumphantTactics(data); break;
                case 'Pyrewright Trainee': card = new PyrewrightTrainee(data); break;
                case 'Lagoon Logistics': card = new LagoonLogistics(data); break;
                case 'Flaunt Luxury': card = new FlauntLuxury(data); break;
                case 'Artful Coercion': card = new ArtfulCoercion(data); break;
                case 'Song of Wind and Fire': card = new SongOfWindAndFire(data); break;
                case 'Bard': card = new Bard(data); break;
                case 'Decorated Warrior': card = new DecoratedWarrior(data); break;
                case 'Dancing Mirrorblade': card = new DancingMirrorblade(data); break;
                case 'Warhammer Kreg': card = new WarhammerKreg(data); break;
                case 'The Exile Queen\'s Crown': card = new TheExileQueensCrown(data); break;
                case 'Dragonlord\'s Carapace': card = new DragonlordsCarapace(data); break;
                case 'Djitu\'s Lithified Mantle': card = new DjitusLithifiedMantle(data); break;
                case 'Ash-Withered Cloak': card = new AshWitheredCloak(data); break;
                case 'Steel Barding': card = new SteelBarding(data); break;
                case 'Rivha\'s Blessed Blade': card = new RivhasBlessedBlade(data); break;
                case 'Blacksteel Loadout': card = new BlacksteelLoadout(data); break;
                case 'Magnific Wilderkin': card = new MagnificWilderkin(data); break;
                case 'Dwarven Phalanx': card = new DwarvenPhalanx(data); break;
                case 'Lair Recluse': card = new LairRecluse(data); break;
                case 'Tunnel Web Spider': card = new TunnelWebSpider(data); break;
                case 'Razorback Trenchrunner': card = new RazorbackTrenchrunner(data); break;
                case 'Sporegraft Slime': card = new SporegraftSlime(data); break;
                case 'Covetous Wechuge': card = new CovetousWechuge(data); break;
                case 'Intli Assaulter': card = new IntliAssaulter(data); break;
                case 'Exotic Game Hunter': card = new ExoticGameHunter(data); break;
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
                case 'Might and Mane': card = new MightAndMane(data); break;
                case 'Dune Skirmisher': card = new DuneSkirmisher(data); break;
                case 'Angora Paladin': card = new AngoraPaladin(data); break;
                case 'Small World': card = new SmallWorld(data); break;
                case 'Restless Migrants': card = new RestlessMigrants(data); break;
                case 'Solemn Pilgrimage': card = new SolemnPilgrimage(data); break;
                case 'Jhalach Scourge': card = new JhalachScourge(data); break;
                case 'Aldmore Chaperone': card = new AldmoreChaperone(data); break;
                case 'Twin Shivs': card = new TwinShivs(data); break;
                case 'Bjarndyr Bruiser': card = new BjarndyrBruiser(data); break;
                case 'Gold Grubber': card = new GoldGrubber(data); break;
                case 'Herd Matron': card = new HerdMatron(data); break;
                case 'Patron of the Meek': card = new PatronOfTheMeek(data); break;
                case 'Honor Begets Glory': card = new HonorBegetsGlory(data); break;
                case 'Unyielding Enforcer': card = new UnyieldingEnforcer(data); break;
                case 'Thrice-Clawed Troika': card = new ThriceClawedTroika(data); break;
                default: card = new BaseCard(data); break;
            }
            return card;
        }
    };

    const HEROES = {
        XYLO: {
            name: "Xylo",
            fullName: "Xylo, the Starfallen",
            avatar: "sets/SHF-files/img/9.png",
            skins: [
                { name: "Star Sentinel", avatar: "https://provocativemtg.github.io/sets/VYI-files/img/282.png" }
            ],
            heroPower: {
                name: "Celestial Disturbance",
                icon: "sets/SHF-files/img/89.png",
                cost: 2,
                text: "Trigger abilities of target creature you control as though it entered the battlefield.",
                isPassive: false,
                effect: (owner, board) => {
                    queueTargetingEffect({
                        sourceId: 'hero-power',
                        title: "Celestial Disturbance",
                        text: "Trigger the 'enters' ability of target creature you control.",
                        effect: 'hero_power_xylo',
                        owner: owner,
                        isHeroPower: true,
                        heroPowerCost: 2,
                        isMandatory: false
                    });
                }
            }
        },
        XIONG_MAO: {
            name: "Xiong Mao",
            fullName: "Xiong Mao, Survivalist",
            avatar: "sets/GNJ-files/img/0_Xiong Mao, Survivalist.jpg",
            skins: [
                { name: "Xiong Mao, Restless Waif", avatar: "sets/KOD-files/img/242_Xiong Mao, Restless Waif.jpg" },
                { name: "Xiong Mao, the Intrepid", avatar: "sets/GHQ-files/img/225_Xiong Mao, the Intrepid.jpg" },
                { name: "Xiong Mao, the Survivor", avatar: "sets/TWB-files/img/187_Xiong Mao, the Survivor.jpg" }
            ],
            heroPower: {
                name: "Panda's Resourcefulness",
                icon: "sets/SHF-files/img/36.png",
                cost: 2,
                text: "Sacrifice a creature. Get a random creature of a star level one higher.",
                isPassive: false,
                effect: (owner, board) => {
                    queueTargetingEffect({
                        sourceId: 'hero-power',
                        title: "Panda's Resourcefulness",
                        text: "Sacrifice a creature to get a random creature of a star level one higher.",
                        effect: 'hero_power_xiong_mao',
                        owner: owner,
                        isHeroPower: true,
                        heroPowerCost: 2,
                        isMandatory: false
                    });
                }
            }
        },
        SETO_SAN: {
            name: "Seto San",
            fullName: "Seto San, Divine Heroine",
            avatar: "sets/NJB-files/img/17.png",
            skins: [
                { name: "Seto San, Dragonblade", avatar: "sets/DSS-files/img/32_Seto San, the Dragonblade.jpg" },
                { name: "Seto San, Forlorn Savior", avatar: "sets/GHQ-files/img/31_Seto San, Forlorn Savior.jpg" },
                { name: "Seto San, Glorious General", avatar: "sets/AEX-files/img/33_Seto San, Glorious General.png" },
                { name: "Seto San, Summer Blossom", avatar: "sets/ATB-files/img/31_Seto San, Summer Blossom.jpg" },
                { name: "Seto San, the Sacred Hand", avatar: "sets/SUR-files/img/25_Seto San, the Sacred Hand.jpg" }
            ],
            heroPower: {
                name: "Armament Exhibition",
                icon: "sets/NJB-files/img/180.png",
                cost: 2,
                text: "Put a +1/+1 counter on a random creature you control. (Then upgrade this ability.)",
                isPassive: false,
                effect: async (owner, board) => {
                    const entity = (owner === 'player') ? state.player : getOpponent();
                    entity.heroPowerActivations = (entity.heroPowerActivations || 0) + 1;
                    
                    if (owner === 'player') {
                        state.player.gold -= 2;
                        state.player.usedHeroPower = true;
                        render();
                    } else {
                        entity.usedHeroPower = true;
                    }

                    if (board.length > 0) {
                        const randomTarget = board[Math.floor(Math.random() * board.length)];
                        addCounters(randomTarget, entity.heroPowerActivations, board);
                    }
                }
            }
        },
        PANYA: {
            name: "Panya",
            fullName: "Prodigious Panya",
            avatar: "sets/KOD-files/img/42_Prodigious Panya.jpg",
            skins: [
                { name: "Panya, Minikin Hero", avatar: "sets/GSS-files/img/2.png" },
                { name: "Panya, Swift and Sure", avatar: "sets/ATR-files/img/1.png" },
                { name: "Panya, Who Dares to Dream", avatar: "sets/NJB-files/img/3.png" },
                { name: "Panya, the Sojourner", avatar: "sets/KND-files/img/66_Panya, the Sojourner.png" }
            ],
            heroPower: {
                name: "Untold Lands",
                icon: "sets/SGB-files/img/168_Untold Lands.jpg",
                cost: 0,
                text: "Skip your first turn. When you level up to tier 2, get an Aldmore Chaperone.",
                isPassive: true
            }
        },
        DAWSON: {
            name: "Dawson",
            fullName: "Dawson, Black-Hearted",
            avatar: "sets/AEX-files/img/198_Dawson, Black-Hearted.png",
            skins: [
                { name: "Dawson, Out for Blood", avatar: "https://schwa77.github.io/sets/KRK-files/img/74.png" }
            ],
            heroPower: {
                name: "Barter in Blood",
                icon: "sets/GSS-files/img/78.png",
                cost: 0,
                text: "Whenever you sacrifice a creature, create a Treasure token.",
                isPassive: true
            }
        },
        MAFUA: {
            name: "Mafua",
            fullName: "Mafua, Oathseeker",
            avatar: "sets/KND-files/img/19_Mafua, Oathseeker.png",
            skins: [
                { name: "All-Enduring Mafua", avatar: "sets/KOD-files/img/176_All-Enduring Mafua.jpg" }
            ],
            heroPower: {
                name: "Provincial Loyalty",
                icon: "sets/KOD-files/img/20_Provincial Loyalty.jpg",
                cost: 0,
                text: "If you control five or more creatures of the same tier, those creatures get +5/+5.",
                isPassive: true
            }
        },
        CRAIN: {
            name: "Crain",
            fullName: "Crain, Black-Blooded",
            avatar: "sets/AEX-files/img/196_Crain, Black-Blooded.png",
            skins: [
                { name: "Captain Crain", avatar: "sets/GSS-files/img/14.png" },
                { name: "Lord Ellison Crain", avatar: "sets/DSS-files/img/219_Lord Ellison Crain.jpg" }
            ],
            heroPower: {
                name: "Crain's Crony",
                icon: "sets/DSS-files/img/89_Crain's Crony.jpg",
                cost: 2,
                text: "At start of combat, create a token copy of your left-most creature with decayed.",
                isPassive: false,
                effect: (owner, board) => {
                    const entity = (owner === 'player') ? state.player : getOpponent();
                    if (owner === 'player') {
                        state.player.gold -= 2;
                        state.player.usedHeroPower = true;
                        state.player.crainActive = true;
                        render();
                    } else {
                        entity.usedHeroPower = true;
                        entity.crainActive = true;
                    }
                }
            }
        },
        ARIETTA: {
            name: "Arietta",
            fullName: "Arietta, the Blade Foretold",
            avatar: "sets/SGB-files/img/3_Arietta, the Blade Foretold.jpg",
            skins: [
                { name: "Arietta, Forsworn", avatar: "sets/WAS-files/img/185_Arietta, Forsworn_front.jpg" }
            ],
            heroPower: {
                name: "Study the Blade",
                icon: "sets/WAS-files/img/201_Patience, Forsworn Student.jpg",
                text: "When you level up to tier 4, seek an Equipment.",
                isPassive: true
            }
        },
        HERREA: {
            name: "Herrea",
            fullName: "Herrea, Celestial Queen",
            avatar: "sets/FAU-files/img/61_Herrea, Celestial Queen.jpg",
            skins: [
                { name: "Herrea of the Night Stars", avatar: "sets/FAE-files/img/60_Herrea of the Night Stars.jpg" },
                { name: "Herrea, the Star's Muse", avatar: "sets/AEX-files/img/57_Herrea, the Star's Muse.png" }
            ],
            heroPower: {
                name: "Connect the Dots",
                icon: "sets/FAU-files/img/54_Connect the Dots.jpg",
                text: "At start of game, seek a 5-star creature to get after you play your seventh blue card.",
                isPassive: true
            }
        },
        ADELAIDE: {
            name: "Adelaide",
            fullName: "Adelaide, the Soloist",
            avatar: "sets/SGB-files/img/36_Adelaide, the Soloist.jpg",
            skins: [
                { name: "Mama Kamili", avatar: "sets/WAS-files/img/198_Mama Kamili.jpg" }
            ],
            heroPower: {
                name: "Traveling Symphony",
                icon: "sets/SGB-files/img/41_Cajoling Chorus.jpg",
                text: "When you buy your fourth spell this game, get a Pale Dillettante.",
                isPassive: true
            }
        },
        HEPING: {
            name: "Heping",
            fullName: "Heping, Grand Pacifist",
            avatar: "sets/NJB-files/img/1.png",
            skins: [
                { name: "Heping, Master Arbitrator", avatar: "sets/GNJ-files/img/22_Heping, Master Arbitrator.jpg" },
                { name: "Heping, at War's End", avatar: "sets/ATR-files/img/0.png" }
            ],
            heroPower: {
                name: "Armistice Chains",
                icon: "sets/SUR-files/img/4_Cai Lan, the Chained.jpg",
                cost: 1,
                text: "Lock a creature in the shop and put a +1/+1 counter on it. It costs 1 less next turn.",
                isPassive: false,
                effect: (owner, board) => {
                    queueTargetingEffect({
                        sourceId: 'hero-power',
                        title: "Armistice Chains",
                        text: "Choose a creature to chain. It gets a +1/+1 counter and costs 1 less next turn.",
                        effect: 'hero_power_heping',
                        owner: owner,
                        isHeroPower: true,
                        heroPowerCost: 1,
                        isMandatory: false
                    });
                }
            }
        },
        JAKE: {
            name: "Jake",
            fullName: "Jake and the Gang",
            avatar: "sets/ACE-files/img/252_Jake and the Gang.jpg",
            skins: [],
            heroPower: {
                name: "Worldbraiding",
                icon: "sets/ATR-files/img/78.png",
                cost: 2,
                text: "For each color, put a +1/+1 counter on a random creature you control of that color.",
                isPassive: false,
                effect: async (owner, board) => {
                    const entity = (owner === 'player') ? state.player : getOpponent();
                    if (owner === 'player') {
                        state.player.gold -= 2;
                        state.player.usedHeroPower = true;
                        render();
                    } else {
                        entity.usedHeroPower = true;
                    }

                    const colors = ['W', 'U', 'B', 'R', 'G'];
                    for (const color of colors) {
                        const candidates = board.filter(c => c.color && c.color.includes(color));
                        if (candidates.length > 0) {
                            const target = candidates[Math.floor(Math.random() * candidates.length)];
                            addCounters(target, 1, board);
                        }
                    }
                    render();
                }
            }
        },
        KISM: {
            name: "Kism",
            fullName: "Kism, Daughter of Fates",
            avatar: "sets/SGB-files/img/154_Kism, Daughter of Fates.jpg",
            skins: [
                { name: "Kism, Threads of Destiny", avatar: "sets/ICO-files/img/19.png" },
                { name: "Kism, Wild Wunderkind", avatar: "sets/WAS-files/img/162_Kism, Wild Wunderkind.jpg" }
            ],
            heroPower: {
                name: "Untangle the Weald",
                icon: "sets/SGB-files/img/169_Weald Trappers.jpg",
                cost: 3,
                text: "Create a copy of target creature in the shop. (Three times per game)",
                isPassive: false,
                effect: (owner, board) => {
                    queueTargetingEffect({
                        sourceId: 'hero-power',
                        title: "Untangle the Weald",
                        text: "Choose a creature in the shop to copy.",
                        effect: 'hero_power_kism',
                        owner: owner,
                        isHeroPower: true,
                        heroPowerCost: 3,
                        isMandatory: false
                    });
                }
            }
        },
        ENOCH: {
            name: "Enoch",
            fullName: "Enoch, Elder Chronurgist",
            avatar: "sets/WAS-files/img/189_Enoch, Elder Chronurgist.jpg",
            skins: [],
            heroPower: {
                name: "Timestreaming",
                icon: "sets/ACE-files/img/108_Turn Back the Clock.jpg",
                text: "Every fourth reroll, Enoch augments the shop.",
                isPassive: true
            }
        },
        AUTUMN: {
            name: "Autumn",
            fullName: "Autumn, Wildwood Queen",
            avatar: "sets/ACE-files/img/286_Autumn, Wildwood Queen.jpg",
            skins: [],
            heroPower: {
                name: "Sound the Blauhorn",
                icon: "sets/GQC-files/img/211_Sound the Blauhorn.jpg",
                text: "Every third spell you cast that targets a Centaur, get a random Centaur.",
                isPassive: true
            }
        },
        MARKETTO: {
            name: "Marketto",
            fullName: "Marketto",
            avatar: "sets/SHF-files/img/60.png",
            skins: [],
            heroPower: null
        }
    };

    const HERO_POOL = Object.values(HEROES);
    const selectableHeroes = HERO_POOL.filter(h => h.name !== 'Marketto');
    const randomHero = selectableHeroes[Math.floor(Math.random() * selectableHeroes.length)];
    
    const availablePlaymats = ['ancient', 'bleak', 'coastal', 'desolate', 'majestic', 'primal', 'pristine', 'rugged', 'stalwart', 'verdant'];
    const randomPlaymat = `img/playmats/${availablePlaymats[Math.floor(Math.random() * availablePlaymats.length)]}.jpg`;

    function getInitialPlayerState() {
        return {
            overallHp: 20,
            fightHp: 10,
            gold: 3,
            tier: 1,
            tierCostReduction: 0,
            hand: [],
            board: [],
            treasures: 0,
            spellGraveyard: [],
            playmat: randomPlaymat,
            plane: null,
            hero: randomHero,
            isRandomHero: false,
            usedHeroPower: false,
            heroPowerActivations: 0,
            crainActive: false,
            spellsBoughtThisGame: 0,
            blueCardsPlayed: 0,
            herreaRewardCard: null,
            rerollCount: 0,
            autumnSpellCount: 0,
            deadServantsCount: 0
        };
    }

    function getInitialOpponents(playerHeroName) {
        const selectableHeroes = Object.values(HEROES).filter(h => h.name !== 'Marketto' && h.name !== playerHeroName);
        const shuffled = [...selectableHeroes].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 7);
        
        const availablePlaymats = ['ancient', 'bleak', 'coastal', 'desolate', 'majestic', 'primal', 'pristine', 'rugged', 'stalwart', 'verdant'];

        return selected.map((hero, index) => {
            const randomPlaymat = `img/playmats/${availablePlaymats[Math.floor(Math.random() * availablePlaymats.length)]}.jpg`;
            return { 
                id: index, 
                name: hero.name, 
                overallHp: 20, 
                fightHp: 10, 
                gold: 3, 
                tier: 1, 
                board: [], 
                hand: [], 
                spellGraveyard: [], 
                deadServantsCount: 0, 
                playmat: randomPlaymat, 
                plane: null, 
                hero: hero, 
                usedHeroPower: false, 
                heroPowerActivations: 0, 
                crainActive: false, 
                spellsBoughtThisGame: 0, 
                blueCardsPlayed: 0, 
                herreaRewardCard: null, 
                rerollCount: 0, 
                autumnSpellCount: 0 
            };
        });
    }

    // --- GAME STATE ---
    let state = {
        player: getInitialPlayerState(),
        opponents: [], // Initialized in reset/init
        currentOpponentId: 0,
        shop: {
            cards: [],
            frozen: false,
            justFroze: false
        },
        turn: 1,
        phase: 'SHOP', // SHOP | BATTLE
        castingSpell: null,
        targetingEffect: null,
        isTripling: false,
        targetingQueue: [],
        scrying: null,
        discovery: null,
        discoveryQueue: [],
        nextShopBonusCards: [],
        battleBoards: null,
        creaturesDiedThisShopPhase: false,
        shopDeathsCount: 0,
        overallHpReducedThisFight: false,
        spellsCastThisTurn: 0,
        currentSpellTargets: [],
        panharmoniconActive: false,
        animationQueue: [],
        isResolvingAnimations: false,
        activeAttackerId: null,
        combatParticipants: [],
        settings: {
            dynamicTraverse: true,
            heroSkins: {} // heroName: skinData
        }
    };

    function getOpponent() {
        return state.opponents[state.currentOpponentId];
    }

    function getEntity(owner) {
        if (owner === 'player') return state.player;
        if (owner === 'opponent') return getOpponent();
        return null;
    }

    async function addCounters(target, amount, board, skipAnimation = false, skipNotification = false) {
        if (!target || amount <= 0) return;
        target.counters += amount;

        // Animation
        if (!skipAnimation && !state.isAITurn) {
            await target.pulse(board);
        } else if (state.isAITurn) {
            target.syncVisualState();
        }

        // Notify other creatures on the board (e.g., Striding Cascade)
        if (board && !skipNotification) {
            board.forEach(c => {
                if (c.id !== target.id) {
                    c.onCounterPlaced(amount, 'plus-one', target, board);
                }
            });
        }
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
    const playerTreasureEl = () => document.getElementById('player-treasure');

    function toggleDiscoverySelection(card) {
        if (!state.discovery) return;
        const idx = state.discovery.selected.findIndex(c => c.id === card.id);
        if (idx !== -1) {
            state.discovery.selected.splice(idx, 1);
        } else {
            state.discovery.selected.push(card);
        }
        render();
    }

    async function confirmDiscovery() {
        if (!state.discovery) return;
        
        if (state.discovery.effect === 'savage_congregation') {
            const selected = state.discovery.selected;
            const newArrivals = [];
            selected.forEach(c => {
                if (state.player.board.length < boardLimit) {
                    c.owner = 'player';
                    state.player.board.push(c);
                    newArrivals.push(c);
                }
            });

            // Trigger ETBs for ALL new arrivals (including spawns)
            newArrivals.forEach(card => {
                triggerETB(card, state.player.board);
                state.player.board.forEach(c => {
                    if (c.id !== card.id) c.onOtherCreatureETB(card, state.player.board);
                });
            });

            // Ferocious: Check board for 4+ power AFTER all creatures and spawns are on board
            const hasFerocious = state.player.board.some(c => c.getDisplayStats(state.player.board).p >= 4);
            if (hasFerocious) {
                const snapshots = new Map();
                state.player.board.forEach(c => {
                    c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                    c.isPulsing = true;
                    addCounters(c, 1, state.player.board, true, true);
                    snapshots.set(c.id, c.takeSnapshot());
                });

                queueAnimation(async () => {
                    const pulses = state.player.board.map(c => pulseCardElement(c, state.player.board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    state.player.board.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });

                // Notifications AFTER queuing the pulse
                state.player.board.forEach(c => {
                    state.player.board.forEach(other => {
                        if (other.id !== c.id) {
                            other.onCounterPlaced(1, 'plus-one', c, state.player.board);
                        }
                    });
                });
            }

            // Cleanup
            const handIdx = state.player.hand.findIndex(c => c.id === state.discovery.sourceId);
            if (handIdx !== -1) {
                const [spell] = state.player.hand.splice(handIdx, 1);
                state.player.spellGraveyard.push(spell);
                const targets = [...state.currentSpellTargets];
                state.currentSpellTargets = [];
                state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));
            }
            processDiscoveryQueue();
            await resolveAnimations();
        }
    }

    async function queueDiscovery(discoveryObj) {
        state.discoveryQueue.push(discoveryObj);
        if (!state.discovery) {
            state.discovery = state.discoveryQueue[0];
            
            // AUTO-RESOLVE IN BATTLE (No interactive choices allowed)
            while (state.phase === 'BATTLE' && state.discovery) {
                const cards = state.discovery.cards;
                if (cards && cards.length > 0) {
                    const random = cards[Math.floor(Math.random() * cards.length)];
                    await resolveDiscovery(random);
                } else {
                    processDiscoveryQueue();
                }
            }

            render();
        }
    }

    function processDiscoveryQueue() {
        if (state.discoveryQueue.length > 0) {
            state.discoveryQueue.shift();
        }
        state.discovery = state.discoveryQueue.length > 0 ? state.discoveryQueue[0] : null;
        render();
    }

    async function resolveDiscovery(card) {
        if (!state.discovery || !card) return;

        const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;

        if (state.discovery.effect === 'ndengo_choice') {
            const source = board.find(c => c.id === state.discovery.sourceId);
            const target = board.find(c => c.id === state.discovery.targetId);
            if (source && target) {
                const teach = async (c, kw) => {
                    if (c.hasKeyword(kw)) await addCounters(c, 1, board);
                    else {
                        await addKeywordCounter(c, kw, 1, board);
                    }
                };
                if (card.card_name === 'Choice A') {
                    await teach(target, 'First strike');
                    await teach(source, 'Trample');
                } else {
                    await teach(target, 'Trample');
                    await teach(source, 'First strike');
                }
            }
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.effect === 'ndengo_solo') {
            const source = board.find(c => c.id === state.discovery.sourceId);
            if (source) {
                const kw = card.rules_text;
                if (source.hasKeyword(kw)) await addCounters(source, 1, board);
                else {
                    await addKeywordCounter(source, kw, 1, board);
                }
            }
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.effect === 'bwema_counters') {
            const source = board.find(c => c.id === state.discovery.sourceId);
            if (source) {
                const kw = card.rules_text.toLowerCase();
                if (kw === 'menace') source.menaceCounters++;
                if (kw === 'first strike') source.firstStrikeCounters++;
                if (kw === 'vigilance') source.vigilanceCounters++;
                if (kw === 'lifelink') source.lifelinkCounters++;
                source.pulse(board);
                state.discovery.remaining--;
                if (state.discovery.remaining > 0) {
                    state.discovery.cards = state.discovery.cards.filter(c => c.card_name !== card.card_name);
                    render();
                    await resolveAnimations();
                    return;
                }
            }
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.effect === 'whispers_pick1') {
            state.player.hand.push(card);
            state.discovery.remaining--;
            if (state.discovery.remaining > 0) {
                state.discovery.cards = state.discovery.cards.filter(c => c.id !== card.id);
                render();
                return;
            } else {
                const last = state.discovery.cards.find(c => c.id !== card.id);
                if (last && last.card_name === 'Servants of Dydren') {
                    const owner = state.discovery.owner || 'player';
                    const entity = getEntity(owner);
                    if (entity) entity.deadServantsCount++;
                }
                const handIdx = state.player.hand.findIndex(c => c.id === state.discovery.sourceId);
                if (handIdx !== -1) {
                    const [spell] = state.player.hand.splice(handIdx, 1);
                    state.player.spellGraveyard.push(spell);
                }
                processDiscoveryQueue();
                await resolveAnimations();
                return;
            }
        }

        if (state.discovery.effect === 'herrea_seek') {
            state.player.herreaRewardCard = card;
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.effect === 'arietta_seek') {
            if (state.player.hand.length < handLimit) {
                state.player.hand.push(card);
            } else if (state.player.board.length < boardLimit) {
                card.owner = 'player';
                state.player.board.push(card);
                triggerETB(card, state.player.board);
            }
            state.player.usedHeroPower = true;
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.effect === 'ghessian_buff') {
            const kw = card.card_name;
            const multiplier = state.discovery.isFoil ? 2 : 1;
            const snapshots = new Map();
            const affected = [];

            for (let i = 0; i < multiplier; i++) {
                board.forEach(c => {
                    if (!c.enchantments) c.enchantments = [];
                    if (!c.enchantments.some(e => e.rules_text === kw)) {
                        c.enchantments.push({ card_name: `Ghessian ${kw}`, rules_text: kw, isTemporary: true });
                        if (!affected.includes(c)) {
                            c.pulseQueueCount = (c.pulseQueueCount || 0) + 1;
                            c.isPulsing = true;
                            affected.push(c);
                        }
                    }
                });
            }

            if (affected.length > 0) {
                affected.forEach(c => snapshots.set(c.id, c.takeSnapshot()));
                queueAnimation(async () => {
                    const pulses = affected.map(c => pulseCardElement(c, board, snapshots.get(c.id)));
                    await Promise.all(pulses);
                    affected.forEach(c => {
                        c.pulseQueueCount--;
                        if (c.pulseQueueCount <= 0) {
                            delete c.isPulsing;
                            delete c.pulseQueueCount;
                        }
                    });
                });
            }

            const handIdx = state.player.hand.findIndex(c => c.id === state.discovery.sourceId);
            if (handIdx !== -1) {
                const [spell] = state.player.hand.splice(handIdx, 1);
                state.player.spellGraveyard.push(spell);
                board.forEach(c => c.onNoncreatureCast(spell, board, []));
            }
            processDiscoveryQueue();
            await resolveAnimations();
            return;
        }

        if (state.discovery.graveyard) {
            const owner = state.discovery.owner || 'player';
            const entity = getEntity(owner);
            if (entity) {
                const idx = entity.spellGraveyard.findIndex(s => s.id === card.id);
                if (idx !== -1) entity.spellGraveyard.splice(idx, 1);
            }
        }

        const owner = state.discovery.owner || 'player';
        const entity = getEntity(owner);
        if (entity) {
            entity.hand.push(card);
        }

        // HERO POWER: Herrea (Blue card tracking & Reward) - AFTER resolution
        if (state.discovery.wasCast) {
            checkHerreaReward(state.discovery.cardInstance);
        }

        processDiscoveryQueue();
        await resolveAnimations();
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

    function updateAvatarHealthBar(container, currentHp, maxHp = 20) {
        if (!container) return;

        let barContainer = container.querySelector('.health-bar-container');
        if (!barContainer) {
            barContainer = document.createElement('div');
            barContainer.className = 'health-bar-container';
            const barFill = document.createElement('div');
            barFill.className = 'health-bar-fill';
            barContainer.appendChild(barFill);
            container.appendChild(barContainer);
        }

        const barFill = barContainer.querySelector('.health-bar-fill');
        const percentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
        barFill.style.width = `${percentage}%`;

        // Also adjust saturation based on health percentage (follows player icon saturation logic)
        const saturation = 0.2 + (0.8 * (percentage / 100));
        barFill.style.filter = `saturate(${saturation})`;
    }

    function showDestroyBubble(targetOrId) {
        if (!targetOrId) return;
        const cabinet = document.getElementById('game-cabinet');
        if (!cabinet) return;

        let targetEl = (typeof targetOrId === 'string') ? document.getElementById(`card-${targetOrId}`) : document.getElementById(`card-${targetOrId.id}`);
        if (!targetEl || targetEl.classList.contains('has-destroy-bubble')) return;

        targetEl.classList.add('has-destroy-bubble');
        const bubble = document.createElement('div');
        bubble.className = 'destroy-bubble';

        const img = document.createElement('img');
        let icon = 'img/skull.png';
        if (typeof targetOrId === 'object' && targetOrId.destroyedReason === 'exile') {
            icon = 'img/exile.png';
            bubble.classList.add('exile-bubble');
        }
        img.src = icon;
        img.alt = 'Destroy';
        bubble.appendChild(img);        
        cabinet.appendChild(bubble);

        const startTime = Date.now();
        const duration = 800;

        function updateBubblePosition() {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                bubble.remove();
                if (targetEl) targetEl.classList.remove('has-destroy-bubble');
                return;
            }

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
    function showEndScreen(place) {
        const resultsScreen = document.getElementById('results-screen');
        const resultsPlace = document.getElementById('results-place');
        const resultsBoard = document.getElementById('results-board-cards');
        const resultsHeroImg = document.getElementById('results-hero-img');
        const resultsHeroName = document.getElementById('results-hero-name');
        
        if (!resultsScreen || !resultsPlace || !resultsBoard) return;

        // Set Background to chosen playmat
        if (state.player.playmat) {
            resultsScreen.style.backgroundImage = `url(${state.player.playmat})`;
        }

        // Set Hero Details
        if (resultsHeroImg && resultsHeroName) {
            const skin = state.settings.heroSkins[state.player.hero.name]?.avatar;
            resultsHeroImg.src = skin || state.player.hero.avatar;
            resultsHeroName.textContent = state.player.hero.name;
        }

        // Hide the entire game board to show the results clean
        const gameBoard = document.getElementById('game-board');
        const rosterSidebar = document.getElementById('roster-sidebar');
        if (gameBoard) gameBoard.style.display = 'none';
        if (rosterSidebar) rosterSidebar.style.display = 'none';

        // Set place text
        let suffix = 'th';
        const lastDigit = place % 10;
        const lastTwoDigits = place % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            suffix = 'th';
        } else if (lastDigit === 1) {
            suffix = 'st';
        } else if (lastDigit === 2) {
            suffix = 'nd';
        } else if (lastDigit === 3) {
            suffix = 'rd';
        }
        resultsPlace.textContent = `${place}${suffix} Place`;

        // Color based on placement
        if (place <= 2) {
            resultsPlace.classList.add('gold-placement');
        } else {
            resultsPlace.classList.remove('gold-placement');
        }

        // Render the final warband into the results screen
        resultsBoard.innerHTML = '';
        renderBoard(resultsBoard, state.player.board, false, state.player.board, true);

        // Show results screen
        resultsScreen.style.display = 'flex';
        setTimeout(() => {
            resultsScreen.style.opacity = '1';
        }, 10);
    }

    function resetGameState() {
        // 1. Snapshot settings (persistent) and Random Hero Flag
        const currentSkins = state.settings.heroSkins;
        const dynamicTraverse = state.settings.dynamicTraverse;
        const wasRandomHero = state.player.isRandomHero;
        const currentHero = state.player.hero;

        // 2. Full State Reset
        const newPlayer = getInitialPlayerState();
        
        // Pick new hero if they chose random, otherwise keep current
        if (wasRandomHero) {
            const selectableHeroes = Object.values(HEROES).filter(h => h.name !== 'Marketto');
            newPlayer.hero = selectableHeroes[Math.floor(Math.random() * selectableHeroes.length)];
            newPlayer.isRandomHero = true;
        } else {
            newPlayer.hero = currentHero; 
            newPlayer.isRandomHero = false;
        }

        const newOpponents = getInitialOpponents(newPlayer.hero.name);

        state.player = newPlayer;
        state.opponents = newOpponents;
        state.settings.heroSkins = currentSkins;
        state.settings.dynamicTraverse = dynamicTraverse;

        state.turn = 1;
        state.phase = 'SHOP';
        state.castingSpell = null;
        state.targetingEffect = null;
        state.targetingQueue = [];
        state.scrying = null;
        state.discovery = null;
        state.discoveryQueue = [];
        state.nextShopBonusCards = [];
        state.battleBoards = null;
        state.creaturesDiedThisShopPhase = false;
        state.shopDeathsCount = 0;
        state.overallHpReducedThisFight = false;
        state.spellsCastThisTurn = 0;
        state.panharmoniconActive = false;
        state.shop.frozen = false;

        // 3. Restore UI
        const gameBoard = document.getElementById('game-board');
        const rosterSidebar = document.getElementById('roster-sidebar');
        const shopZone = document.getElementById('shop-zone');
        const endTurnBtn = document.getElementById('end-turn-btn');
        const handZone = document.getElementById('hand-zone');
        const playerAvatar = document.getElementById('player-avatar');
        const playerZone = document.getElementById('player-zone');

        if (gameBoard) gameBoard.style.display = 'grid';
        if (rosterSidebar) rosterSidebar.style.display = 'flex';
        if (shopZone) shopZone.style.display = 'flex';
        if (endTurnBtn) {
            endTurnBtn.style.display = 'block';
            endTurnBtn.disabled = false;
            endTurnBtn.textContent = 'End Turn';
        }
        if (handZone) handZone.style.display = 'flex';
        if (playerAvatar) playerAvatar.style.display = 'flex';
        if (playerZone) {
            playerZone.style.height = ''; 
            playerZone.style.justifyContent = '';
            playerZone.style.paddingLeft = '';
        }

        updateTierButton();
        render();
    }

    async function playAgain() {
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) {
            resultsScreen.style.opacity = '0';
            setTimeout(() => resultsScreen.style.display = 'none', 800);
        }

        resetGameState();
        startGameLogic();
    }

    function goToMainMenu() {
        const resultsScreen = document.getElementById('results-screen');
        const gameCabinet = document.getElementById('game-cabinet');
        const frontPage = document.getElementById('front-page');

        if (resultsScreen) {
            resultsScreen.style.opacity = '0';
            setTimeout(() => resultsScreen.style.display = 'none', 800);
        }

        if (gameCabinet) {
            gameCabinet.style.opacity = '0';
            setTimeout(() => gameCabinet.style.display = 'none', 500);
        }

        if (frontPage) {
            frontPage.style.visibility = 'visible';
            frontPage.style.opacity = '1';
        }

        resetGameState();
        
        // Update front page UI with potentially new random hero or preserved hero
        const heroPreviewImg = document.getElementById('current-hero-img');
        const frontHeroName = document.getElementById('current-hero-name');
        const frontHeroPreview = document.getElementById('hero-select-preview');

        if (state.player.isRandomHero) {
            if (heroPreviewImg) heroPreviewImg.style.display = 'none';
            if (frontHeroName) frontHeroName.textContent = 'Random';
            let qMark = frontHeroPreview?.querySelector('.random-q');
            if (qMark) qMark.style.display = 'flex';
        } else {
            if (heroPreviewImg) {
                frontHeroPreview.dataset.heroName = state.player.hero.name;
                const skin = state.settings.heroSkins[state.player.hero.name]?.avatar;
                heroPreviewImg.src = skin || state.player.hero.avatar;
                heroPreviewImg.style.display = 'block';
            }
            if (frontHeroName) frontHeroName.textContent = state.player.hero.name;
            let qMark = frontHeroPreview?.querySelector('.random-q');
            if (qMark) qMark.style.display = 'none';
        }
    }

    function startGameLogic() {
        // HERO POWER: Herrea (Start of Game Seek 5-Star)
        if (state.player.hero.name === "Herrea") {
            const fiveStarPool = availableCards.filter(c => (c.tier === 5) && c.shape !== 'token' && c.type?.toLowerCase().includes('creature'));
            if (fiveStarPool.length > 0) {
                const selected = [];
                const poolCopy = [...fiveStarPool];
                for (let i = 0; i < 3; i++) {
                    if (poolCopy.length === 0) break;
                    const randIdx = Math.floor(Math.random() * poolCopy.length);
                    selected.push(CardFactory.create(poolCopy.splice(randIdx, 1)[0]));
                }

                queueDiscovery({
                    cards: selected,
                    title: "CONNECT THE DOTS",
                    text: "Choose a 5-star creature to get after playing seven blue cards.",
                    effect: 'herrea_seek'
                });
            }
        }
        
        startShopTurn();
    }

    async function init() {
        if (tierUpBtn) tierUpBtn.addEventListener('click', tierUp);
        if (rerollBtn) rerollBtn.addEventListener('click', rerollShop);
        if (endTurnBtn) endTurnBtn.addEventListener('click', async () => {
            if (state.castingSpell || state.targetingEffect) {
                // Cancel Action Logic
                if (state.targetingEffect && state.targetingEffect.sourceId && state.targetingEffect.wasCast && !state.targetingEffect.isHeroPower) {
                    // Exception: Nightfall Raptor stays on board even if cancelled
                    const isRaptor = (state.targetingEffect.effect === 'nightfall_raptor_bounce');
                    
                    if (!isRaptor) {
                        // 1. If it's a creature already on the board (like Pusbag or Camel), return it to hand
                        const boardIndex = state.player.board.findIndex(c => c.id === state.targetingEffect.sourceId);
                        if (boardIndex !== -1) {
                            const card = state.player.board.splice(boardIndex, 1)[0];
                            state.player.hand.push(card);

                            // Clear any other doubled triggers from this same creature
                            state.targetingQueue = state.targetingQueue.filter(q => q.sourceId !== state.targetingEffect.sourceId);
                        }
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
                            if (ct === 'plus-one') addCounters(source, 1, state.player.board);
                            else if (ct === 'flying') source.flyingCounters++;
                            else if (ct === 'menace') source.menaceCounters++;
                            else if (ct === 'first-strike') source.firstStrikeCounters++;
                            else if (ct === 'vigilance') source.vigilanceCounters++;
                            else if (ct === 'lifelink') source.lifelinkCounters++;
                            else if (ct === 'reach') source.reachCounters++;
                        }
                    }
                }
                state.castingSpell = null;
                clearTargetingEffect(false);
                render();
            } else {
                // End Turn Logic
                endTurnBtn.disabled = true;

                // End Shop Phase triggers
                for (const c of state.player.board) {
                    await c.onShopEndStep(state.player.board);
                }
                await resolveAnimations();
                await waitForBusyCards();

                state.creaturesDiedThisShopPhase = false; 
                state.shopDeathsCount = 0; // Reset for next shop turn

                // Transition to Battle
                startBattleTurn();
            }
        });

        if (freezeBtn) {
            freezeBtn.addEventListener('click', () => {
                const wasFrozen = !!state.shop.frozen;
                state.shop.frozen = !state.shop.frozen;
                
                if (state.shop.frozen && !wasFrozen) {
                    state.shop.justFroze = true;
                }
                
                freezeBtn.classList.toggle('frozen', state.shop.frozen);
                const img = document.getElementById('freeze-img');
                if (img) {
                    img.src = state.shop.frozen ? 'img/locked.png' : 'img/unlocked.png';
                }

                if (wasFrozen && !state.shop.frozen) {
                    // Start unfreezing animation
                    state.shop.cards.forEach(c => {
                        if (!c.isChained) c.isUnlocking = true;
                    });
                    render();
                    setTimeout(() => {
                        state.shop.cards.forEach(c => delete c.isUnlocking);
                        render();
                    }, 400);
                } else {
                    // Just a regular lock or re-render
                    state.shop.cards.forEach(c => {
                        if (!c.isChained) delete c.isUnlocking;
                    });
                    render();
                }
            });
        }
        
        const scryApproveBtn = document.getElementById('scry-approve-btn');
        const scryDenyBtn = document.getElementById('scry-deny-btn');
        if (scryApproveBtn) scryApproveBtn.addEventListener('click', () => resolveScry('approve'));
        if (scryDenyBtn) scryDenyBtn.addEventListener('click', () => resolveScry('deny'));

        const discoveryCancelBtn = document.getElementById('discovery-cancel-btn');
        if (discoveryCancelBtn) discoveryCancelBtn.addEventListener('click', () => {
            processDiscoveryQueue();
        });

        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) playAgainBtn.addEventListener('click', playAgain);

        const mainMenuBtn = document.getElementById('main-menu-btn');
        if (mainMenuBtn) mainMenuBtn.addEventListener('click', goToMainMenu);

        updateTierButton();

        // GLOSSARY FUNCTIONALITY
        const glossaryPage = document.getElementById('glossary-page');
        const glossaryBtn = document.getElementById('glossary-button');
        const glossaryCloseBtn = document.getElementById('glossary-close-btn');
        const glossaryGrid = document.getElementById('glossary-grid');
        const glossaryPreviewImg = document.getElementById('glossary-preview-img');
        const glossaryDescription = document.getElementById('glossary-description');
        const glossaryFilters = {
            creature: document.getElementById('filter-creature'),
            equipment: document.getElementById('filter-equipment'),
            spell: document.getElementById('filter-spell')
        };

        function updateGlossaryPreview(card) {
            if (!card) {
                glossaryPreviewImg.src = 'img/card_back.png';
                glossaryDescription.innerHTML = '<p style="text-align: center; font-style: italic; opacity: 0.7; font-size: 1.4em;">Hover over a card to see details</p>';
                return;
            }

            const tokenSuffix = (card.shape?.includes('token')) ? "t" : "";
            const imageName = card.position ? card.position : `${card.number}${tokenSuffix}_${card.card_name}`;
            const doubleSuffix = (card.shape?.includes('double')) ? "_front" : "";
            const extension = card.image_type || card.set_image_type || "jpg";
            const imgPath = `sets/${card.set}-files/img/${imageName}${doubleSuffix}.${extension}`;
            glossaryPreviewImg.src = imgPath;

            let html = `<h2>${card.card_name}</h2>`;
            
            // Find keywords in rules text
            const keywordsFound = Object.keys(KEYWORD_DATA).filter(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'i');
                return card.rules_text && regex.test(card.rules_text);
            });

            if (keywordsFound.length > 0) {
                keywordsFound.forEach(kw => {
                    const data = KEYWORD_DATA[kw];
                    const kwClass = kw.toLowerCase().replace(' ', '-');
                    html += `
                        <div class="keyword-info">
                            <div class="keyword-name">
                                <div class="keyword-icon-bubble ${kwClass}">
                                    <img src="${data.icon}" alt="${kw}">
                                </div>
                                <span>${kw}</span>
                            </div>
                            <div class="keyword-text">${data.description}</div>
                        </div>
                    `;
                });
            }
            // there is no 'else' block, no rendering for keyword-less cards

            glossaryDescription.innerHTML = html;
        }

        function populateGlossary() {
            if (!glossaryGrid) return;
            glossaryGrid.innerHTML = '';

            const showCreatures = glossaryFilters.creature.checked;
            const showEquipment = glossaryFilters.equipment.checked;
            const showSpells = glossaryFilters.spell.checked;

            const filtered = availableCards.filter(c => {
                if (c.shape === 'token') return false;
                const type = c.type?.toLowerCase() || '';
                if (type.includes('creature')) return showCreatures;
                if (type.includes('equipment')) return showEquipment;
                return showSpells; // Instant/Sorcery
            });

            // Group by Tier
            const tiers = [1, 2, 3, 4, 5];
            tiers.forEach(tier => {
                const tierCards = filtered.filter(c => c.tier === tier);
                if (tierCards.length === 0) return;

                // Sort by type then name
                tierCards.sort((a, b) => {
                    const typeA = a.type?.toLowerCase().includes('creature') ? 0 : (a.type?.toLowerCase().includes('equipment') ? 1 : 2);
                    const typeB = b.type?.toLowerCase().includes('creature') ? 0 : (b.type?.toLowerCase().includes('equipment') ? 1 : 2);
                    if (typeA !== typeB) return typeA - typeB;
                    return a.card_name.localeCompare(b.card_name);
                });

                const tierSection = document.createElement('div');
                tierSection.className = 'glossary-tier-section';
                tierSection.innerHTML = `<div class="glossary-tier-header">Tier ${tier}</div>`;

                const grid = document.createElement('div');
                grid.className = 'glossary-card-grid';

                tierCards.forEach(card => {
                    const item = document.createElement('div');
                    item.className = 'glossary-card-item';
                    const tokenSuffix = (card.shape?.includes('token')) ? "t" : "";
                    const imageName = card.position ? card.position : `${card.number}${tokenSuffix}_${card.card_name}`;
                    const doubleSuffix = (card.shape?.includes('double')) ? "_front" : "";
                    const extension = card.image_type || card.set_image_type || "jpg";
                    const imgPath = `sets/${card.set}-files/img/${imageName}${doubleSuffix}.${extension}`;
                    item.innerHTML = `<img src="${imgPath}" alt="${card.card_name}">`;
                    item.addEventListener('mouseenter', () => updateGlossaryPreview(card));
                    grid.appendChild(item);
                });

                tierSection.appendChild(grid);
                glossaryGrid.appendChild(tierSection);
            });
        }

        if (glossaryBtn) {
            glossaryBtn.addEventListener('click', () => {
                glossaryPage.style.display = 'flex';
                populateGlossary();
            });
        }

        if (glossaryCloseBtn) {
            glossaryCloseBtn.addEventListener('click', () => {
                glossaryPage.style.display = 'none';
                updateGlossaryPreview(null);
            });
        }

        Object.values(glossaryFilters).forEach(f => {
            if (f) f.addEventListener('change', populateGlossary);
        });

        // HERO SELECT FUNCTIONALITY
        const heroSelectPage = document.getElementById('hero-select-page');
        const heroSelectPreviewTrigger = document.getElementById('hero-select-preview');
        const heroSelectCloseBtn = document.getElementById('hero-select-close-btn');
        const heroGrid = document.getElementById('hero-grid');
        const heroPreviewLargeImg = document.getElementById('hero-preview-large-img');
        const heroPreviewName = document.getElementById('hero-preview-name');
        const heroPowerBox = document.getElementById('hero-power-preview-box');
        const heroConfirmBtn = document.getElementById('hero-confirm-btn');

        let pendingHero = null;
        let isRandomSelected = false;

        function updateHeroPreview(hero, isRandom = false) {
            isRandomSelected = isRandom;
            const randomPlaceholder = document.getElementById('hero-preview-random-placeholder');
            
            if (isRandom) {
                pendingHero = null;
                if (heroPreviewLargeImg) heroPreviewLargeImg.style.display = 'none';
                if (randomPlaceholder) randomPlaceholder.style.display = 'flex';
                if (heroPreviewName) heroPreviewName.textContent = 'Random Hero';
                if (heroPowerBox) heroPowerBox.style.display = 'none';
                if (heroConfirmBtn) {
                    heroConfirmBtn.style.display = 'block';
                }
                return;
            }

            if (!hero) {
                if (heroPreviewLargeImg) heroPreviewLargeImg.style.display = 'none';
                if (randomPlaceholder) randomPlaceholder.style.display = 'none';
                if (heroPreviewName) heroPreviewName.textContent = 'Select a Hero';
                if (heroPowerBox) heroPowerBox.style.display = 'none';
                if (heroConfirmBtn) heroConfirmBtn.style.display = 'none';
                return;
            }

            pendingHero = hero;
            if (heroPreviewLargeImg) {
                const skin = state.settings.heroSkins[hero.name]?.avatar;
                heroPreviewLargeImg.src = skin || hero.avatar;
                heroPreviewLargeImg.style.display = 'block';
                // Set data attribute for CSS-based framing
                heroPreviewLargeImg.parentElement.dataset.heroName = hero.name;
            }
            if (randomPlaceholder) randomPlaceholder.style.display = 'none';
            if (heroPreviewName) heroPreviewName.textContent = hero.name;
            
            if (hero.heroPower) {
                if (heroPowerBox) heroPowerBox.style.display = 'flex';
                const icon = document.getElementById('hero-power-preview-icon');
                const name = document.getElementById('hero-power-preview-name');
                const desc = document.getElementById('hero-power-preview-desc');
                if (icon) icon.src = hero.heroPower.icon;
                if (name) name.textContent = hero.heroPower.name;
                if (desc) desc.textContent = hero.heroPower.text;
            } else {
                if (heroPowerBox) heroPowerBox.style.display = 'none';
            }

            if (heroConfirmBtn) {
                heroConfirmBtn.style.display = 'block';
                heroConfirmBtn.textContent = 'CHOOSE CHAMPION';
            }
        }

        function populateHeroSelect() {
            if (!heroGrid) return;
            heroGrid.innerHTML = '';

            // Filter out Marketto (shopkeeper) and sort alphabetically
            const selectableHeroes = Object.values(HEROES)
                .filter(h => h.name !== 'Marketto')
                .sort((a, b) => a.name.localeCompare(b.name));

            selectableHeroes.forEach(hero => {
                const item = document.createElement('div');
                item.className = 'hero-grid-item';
                item.dataset.heroName = hero.name;
                
                // Use state.player.hero to determine initial selection
                if (!isRandomSelected && state.player.hero.name === hero.name) {
                    item.classList.add('selected');
                }
                
                const currentSkin = state.settings.heroSkins[hero.name]?.avatar || hero.avatar;
                item.innerHTML = `<img src="${currentSkin}" alt="${hero.name}">`;
                
                item.addEventListener('mouseenter', () => updateHeroPreview(hero));
                item.addEventListener('click', () => {
                    isRandomSelected = false;
                    pendingHero = hero;
                    // Update grid selection UI immediately
                    document.querySelectorAll('.hero-grid-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    confirmHeroSelection();
                });
                heroGrid.appendChild(item);
            });

            // Add RANDOM option at the end
            const randomItem = document.createElement('div');
            randomItem.className = 'hero-grid-item';
            randomItem.dataset.isRandom = 'true';
            if (isRandomSelected) randomItem.classList.add('selected');
            randomItem.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:130px; color:#e3e3e3; background:#111; font-family:'Beleren Small Caps'">?</div>`;
            randomItem.addEventListener('mouseenter', () => updateHeroPreview(null, true));
            randomItem.addEventListener('click', () => {
                isRandomSelected = true;
                pendingHero = null;
                // Update grid selection UI immediately
                document.querySelectorAll('.hero-grid-item').forEach(el => el.classList.remove('selected'));
                randomItem.classList.add('selected');
                confirmHeroSelection();
            });
            heroGrid.appendChild(randomItem);

            // Initialize preview with current state
            if (isRandomSelected) updateHeroPreview(null, true);
            else updateHeroPreview(state.player.hero);
        }

        function confirmHeroSelection() {
            const frontHeroImg = document.getElementById('current-hero-img');
            const frontHeroPreview = document.getElementById('hero-select-preview');
            const frontHeroName = document.getElementById('current-hero-name');

            if (isRandomSelected) {
                if (frontHeroImg) frontHeroImg.style.display = 'none';
                if (frontHeroName) frontHeroName.textContent = 'Random';
                // Add "?" to front page preview if it's not there
                let qMark = frontHeroPreview.querySelector('.random-q');
                if (!qMark) {
                    qMark = document.createElement('div');
                    qMark.className = 'random-q';
                    qMark.style.width = '100%';
                    qMark.style.height = '100%';
                    qMark.style.display = 'flex';
                    qMark.style.alignItems = 'center';
                    qMark.style.justifyContent = 'center';
                    qMark.style.fontSize = '100px';
                    qMark.style.color = '#e3e3e3';
                    qMark.style.background = '#111';
                    qMark.style.fontFamily = "'Beleren Small Caps'";
                    qMark.textContent = '?';
                    frontHeroPreview.appendChild(qMark);
                } else {
                    qMark.style.display = 'flex';
                }
                heroSelectPage.style.display = 'none';
            } else if (pendingHero) {
                state.player.hero = pendingHero;
                if (frontHeroImg) {
                    frontHeroPreview.dataset.heroName = state.player.hero.name;
                    const skin = state.settings.heroSkins[pendingHero.name]?.avatar;
                    frontHeroImg.src = skin || pendingHero.avatar;
                    frontHeroImg.style.display = 'block';
                }
                if (frontHeroName) frontHeroName.textContent = pendingHero.name;
                const qMark = frontHeroPreview.querySelector('.random-q');
                if (qMark) qMark.style.display = 'none';
                heroSelectPage.style.display = 'none';
            }
        }

        // COSMETICS FUNCTIONALITY
        const cosmeticsPage = document.getElementById('cosmetics-page');
        const cosmeticsBtn = document.getElementById('cosmetics-button');
        const cosmeticsCloseBtn = document.getElementById('cosmetics-close-btn');
        const heroSkinsContainer = document.getElementById('hero-skins-container');
        const playmatGrid = document.getElementById('playmat-grid');
        const dynamicTraverseCheckbox = document.getElementById('setting-dynamic-traverse');

        let activeCosmeticsBg = 1;
        function updateCosmeticsBackground(url, immediate = false) {
            const nextBg = activeCosmeticsBg === 1 ? 2 : 1;
            const elActive = document.getElementById(`cosmetics-bg-${activeCosmeticsBg}`);
            const elNext = document.getElementById(`cosmetics-bg-${nextBg}`);
            if (!elActive || !elNext) return;

            elNext.style.backgroundImage = `url(${url})`;
            
            if (immediate) {
                elNext.style.transition = 'none';
                elActive.style.transition = 'none';
                elNext.style.opacity = '1';
                elActive.style.opacity = '0';
                elNext.offsetHeight; // Force reflow
                elNext.style.transition = '';
                elActive.style.transition = '';
            } else {
                elNext.style.opacity = '1';
                elActive.style.opacity = '0';
            }
            activeCosmeticsBg = nextBg;
        }

        const EPITHET_OVERRIDES = {
            "Jake and the Gang": "The Gang",
            "Herrea of the Night Stars": "the Night Star",
            "All-Enduring Mafua": "All-Enduring"
        };

        function getEpithet(fullName) {
            if (EPITHET_OVERRIDES[fullName]) return EPITHET_OVERRIDES[fullName];
            if (fullName.includes(',')) {
                return fullName.split(',')[1].trim();
            }
            return fullName; // Fallback to name if no comma
        }

        function createSkinItem(hero, skinData, heroName) {
            const item = document.createElement('div');
            item.className = 'skin-item';
            const currentSkin = state.settings.heroSkins[heroName]?.avatar || hero.avatar;
            if (currentSkin === skinData.avatar) item.classList.add('selected');
            
            const epithet = getEpithet(skinData.name);

            item.innerHTML = `
                <div class="avatar-img-container" data-hero-name="${hero.name}">
                    <img class="avatar-img" src="${skinData.avatar}" alt="${skinData.name}" title="${skinData.name}">
                </div>
                <div class="skin-epithet">${epithet}</div>
            `;
            item.addEventListener('click', () => {
                state.settings.heroSkins[heroName] = skinData;
                // Update grid in this row
                item.parentElement.querySelectorAll('.skin-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                
                // If this is the active player hero, update the home screen and in-game UI
                if (state.player.hero.name === heroName) {
                    const frontHeroImg = document.getElementById('current-hero-img');
                    if (frontHeroImg) frontHeroImg.src = skinData.avatar;
                }
                render();
            });
            return item;
        }

        if (cosmeticsBtn) {
            cosmeticsBtn.addEventListener('click', () => {
                cosmeticsPage.style.display = 'flex';
                populateCosmetics();
            });
        }

        if (cosmeticsCloseBtn) {
            cosmeticsCloseBtn.addEventListener('click', () => {
                cosmeticsPage.style.display = 'none';
            });
        }

        if (dynamicTraverseCheckbox) {
            dynamicTraverseCheckbox.checked = state.settings.dynamicTraverse;
            dynamicTraverseCheckbox.addEventListener('change', (e) => {
                state.settings.dynamicTraverse = e.target.checked;
            });
        }

        // --- RESTORED HERO SELECT LISTENERS ---
        if (heroSelectPreviewTrigger) {
            heroSelectPreviewTrigger.addEventListener('click', () => {
                heroSelectPage.style.display = 'flex';
                populateHeroSelect();
            });
        }

        if (heroSelectCloseBtn) {
            heroSelectCloseBtn.addEventListener('click', () => {
                heroSelectPage.style.display = 'none';
            });
        }

        if (heroConfirmBtn) {
            heroConfirmBtn.addEventListener('click', confirmHeroSelection);
        }
        // --------------------------------------

        function populateCosmetics() {
            // Update page background to current playmat (immediate)
            updateCosmeticsBackground(state.player.playmat, true);

            // 1. POPULATE PLAYMATS
            if (playmatGrid) {
                playmatGrid.innerHTML = '';
                const playmats = ['ancient', 'bleak', 'coastal', 'desolate', 'majestic', 'primal', 'pristine', 'rugged', 'stalwart', 'verdant'];
                playmats.forEach(mat => {
                    const item = document.createElement('div');
                    item.className = 'playmat-item';
                    const fullPath = `img/playmats/${mat}.jpg`;
                    if (state.player.playmat === fullPath) item.classList.add('selected');
                    
                    item.innerHTML = `
                        <img src="${fullPath}" alt="${mat}">
                        <div class="playmat-label">${mat}</div>
                    `;
                    item.addEventListener('click', () => {
                        state.player.playmat = fullPath;
                        document.querySelectorAll('.playmat-item').forEach(el => el.classList.remove('selected'));
                        item.classList.add('selected');
                        // Update page background with fade
                        updateCosmeticsBackground(fullPath);
                        render();
                    });
                    playmatGrid.appendChild(item);
                });
            }

            // 2. POPULATE HERO SKINS
            if (heroSkinsContainer) {
                heroSkinsContainer.innerHTML = '';
                const heroes = Object.values(HEROES).filter(h => h.name !== 'Marketto').sort((a, b) => a.name.localeCompare(b.name));
                
                heroes.forEach(hero => {
                    const row = document.createElement('div');
                    row.className = 'hero-skin-row';
                    row.innerHTML = `<div class="hero-skin-row-header">${hero.name}</div>`;
                    
                    const grid = document.createElement('div');
                    grid.className = 'skin-grid';
                    
                    // Default skin (Original)
                    const defaultItem = createSkinItem(hero, { avatar: hero.avatar, name: hero.fullName || hero.name }, hero.name);
                    grid.appendChild(defaultItem);
                    
                    const skins = hero.skins || [];
                    skins.forEach(skin => {
                        let skinData = null;
                        if (typeof skin === 'string') {
                            const card = availableCards.find(c => c.card_name === skin || `${c.set}-${c.number}` === skin);
                            if (card) {
                                const imgPath = `sets/${card.set}-files/img/${card.position || card.number + (card.shape?.includes('token') ? 't' : '') + '_' + card.card_name}.${card.image_type || 'jpg'}`;
                                skinData = { avatar: imgPath, name: card.card_name };
                            }
                        } else {
                            skinData = skin;
                        }

                        if (skinData) {
                            const item = createSkinItem(hero, skinData, hero.name);
                            grid.appendChild(item);
                        }
                    });

                    row.appendChild(grid);
                    heroSkinsContainer.appendChild(row);
                });
            }
        }

        // FRONT PAGE SETUP
        const frontPage = document.getElementById('front-page');
        const playBtn = document.getElementById('play-button');
        const heroSelectPreview = document.getElementById('hero-select-preview');
        const heroPreviewImg = document.getElementById('current-hero-img');
        const frontHeroName = document.getElementById('current-hero-name');
        
        if (heroSelectPreview) {
            heroSelectPreview.dataset.heroName = state.player.hero.name;
        }
        if (heroPreviewImg) {
            const skin = state.settings.heroSkins[state.player.hero.name]?.avatar;
            heroPreviewImg.src = skin || state.player.hero.avatar;
        }
        if (frontHeroName) {
            frontHeroName.textContent = state.player.hero.name;
        }

        try {
            const response = await fetch('lists/coliseum-cards.json');
            const cardData = await response.json();
            availableCards = cardData.cards; 
            console.log("Coliseum card data loaded successfully.", availableCards.length);
        } catch (error) {
            console.error("Error loading coliseum card data:", error);
            if (shopEl) shopEl.innerHTML = '<p style="color: red;">Error: Could not load card data. Is `lists/coliseum-cards.json` generated?</p>';
            return;
        }

        if (playBtn && frontPage) {
            playBtn.addEventListener('click', () => {
                // If RANDOM was selected, pick one now
                if (isRandomSelected) {
                    const selectableHeroes = Object.values(HEROES).filter(h => h.name !== 'Marketto');
                    state.player.hero = selectableHeroes[Math.floor(Math.random() * selectableHeroes.length)];
                    state.player.isRandomHero = true;
                } else {
                    state.player.isRandomHero = false;
                }

                const cabinet = document.getElementById('game-cabinet');
                // Fade out menu
                frontPage.style.opacity = '0';
                if (cabinet) {
                    cabinet.style.display = 'flex';
                    // Trigger reflow for transition
                    cabinet.offsetHeight;
                    cabinet.style.opacity = '1';
                }
                
                setTimeout(() => {
                    frontPage.style.visibility = 'hidden';
                }, 500);

                state.opponents = getInitialOpponents(state.player.hero.name);
                startGameLogic();
            });
        }
    }

    const tierCosts = [0, 7, 8, 11, 13]; // Base costs for 2, 3, 4, 5

    function updateTierButton() {
        const tierContainer = document.getElementById('tier-container');
        if (!tierUpBtn || !tierStarsEl || !tierContainer) return;
        
        // Update Stars
        tierStarsEl.innerHTML = '';
        const starsDiv = document.createElement('div');
        starsDiv.className = 'star';
        if (state.player.tier === 3 || state.player.tier === 4) {
            starsDiv.innerHTML = '★★<br>' + '★'.repeat(state.player.tier - 2);
        } else {
            starsDiv.textContent = '★'.repeat(state.player.tier);
        }
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

            // HERO POWER: Arietta (Tier 4 Seek Equipment)
            if (state.player.hero.name === "Arietta" && state.player.tier === 4) {
                const equipPool = availableCards.filter(c => c.type?.toLowerCase().includes('equipment') && c.shape !== 'token');
                if (equipPool.length > 0) {
                    const selected = [];
                    const poolCopy = [...equipPool];
                    for (let i = 0; i < 3; i++) {
                        if (poolCopy.length === 0) break;
                        const randIdx = Math.floor(Math.random() * poolCopy.length);
                        selected.push(CardFactory.create(poolCopy.splice(randIdx, 1)[0]));
                    }

                    queueDiscovery({
                        cards: selected,
                        title: "STUDY THE BLADE",
                        text: "Choose an Equipment to add to your hand.",
                        effect: 'arietta_seek'
                    });
                }
            }

            // HERO POWER: Panya (Tier 2 get Aldmore Chaperone)
            if (state.player.hero.name === "Panya" && state.player.tier === 2) {
                const chaperoneData = availableCards.find(c => c.card_name === 'Aldmore Chaperone');
                if (chaperoneData) {
                    const inst = CardFactory.create(chaperoneData);
                    inst.owner = 'player';
                    if (state.player.hand.length < handLimit) {
                        state.player.hand.push(inst);
                    }
                }
            }

            render();
        }
    }

    function triggerETB(instance, board) {
        if (!instance) return;
        
        // FOIL + PANHARMONICON COORDINATION
        // Only the very first trigger of a sequence can be cancelled (bounced).
        instance.onETB(board, false); 

        if (instance.isFoil) {
            instance.onETB(board, true); 
        }

        if (state.panharmoniconActive && instance.owner === 'player') {
            instance.onETB(board, true); 
            if (instance.isFoil) {
                instance.onETB(board, true); 
            }
        }
    }

    // Game Loop
    function startShopTurn() {
        state.phase = 'SHOP';
        state.spellsCastThisTurn = 0;
        state.creaturesDiedThisShopPhase = false;
        state.shopDeathsCount = 0;
        state.panharmoniconActive = false;

        // Reset Hero Powers (Except for one-time or limited effects)
        const isArietta = state.player.hero.name === "Arietta";
        const isAdelaide = state.player.hero.name === "Adelaide";
        const isHerrea = state.player.hero.name === "Herrea";
        const isKism = state.player.hero.name === "Kism";
        const isAutumn = state.player.hero.name === "Autumn";

        if ((!isArietta || state.player.tier < 4) && 
            (!isAdelaide || state.player.spellsBoughtThisGame < 4) && 
            (!isHerrea || state.player.blueCardsPlayed < 7) &&
            (!isKism || (state.player.heroPowerActivations || 0) < 3) &&
            (!isAutumn)) {
            state.player.usedHeroPower = false;
        }

        state.opponents.forEach(opp => {
            const oppArietta = opp.hero && opp.hero.name === "Arietta";
            const oppAdelaide = opp.hero && opp.hero.name === "Adelaide";
            const oppHerrea = opp.hero && opp.hero.name === "Herrea";
            const oppKism = opp.hero && opp.hero.name === "Kism";
            const oppAutumn = opp.hero && opp.hero.name === "Autumn";

            if ((!oppArietta || opp.tier < 4) && 
                (!oppAdelaide || opp.spellsBoughtThisGame < 4) && 
                (!oppHerrea || opp.blueCardsPlayed < 7) &&
                (!oppKism || (opp.heroPowerActivations || 0) < 3) &&
                (!oppAutumn)) {
                opp.usedHeroPower = false;
            }
        });

        // Tier cost reduction: goes down by 1 each turn (EXCEPT turn 1)
        if (state.player.tier < 5 && state.turn > 1) {
            state.player.tierCostReduction++;
        }

        const turnBaseGold = Math.min(2 + state.turn, 10);
        state.player.gold = turnBaseGold + state.player.treasures;

        // TESTING OVERRIDE: 100 gold on Turn 1
        if (state.turn === 1) state.player.gold = 100;

        if (state.turn === 1 && state.player.hero.name === "Panya") {
            state.player.gold = 0;
        }

        if (state.player.treasures > 0) {

            console.log(`Adding ${state.player.treasures} gold from treasures.`);
            state.player.treasures = 0;
        }

        if (state.shop.frozen) {
            unfreezeShop();
            fillShopSlots();
        } else {
            populateShop();
        }

        // Apply Heping's unchaining and discounts AFTER shop population
        state.shop.cards.forEach(c => {
            if (c.isChained) {
                c.isChained = false;
                let baseCost = 3;
                if (c.type?.toLowerCase().includes('equipment')) baseCost = 5;
                else if (c.type && !c.type.toLowerCase().includes('creature')) baseCost = c.tier || 1;
                
                const currentReduction = c.costReduction || 0;
                c.costReduction = Math.min(baseCost, currentReduction + 1);
            }
        });
        state.player.board.forEach(c => {
            c.onShopStart(state.player.board);
            c.actionUsed = false;
        });
        render();
    }
    
    // Legacy functions removed in favor of OO methods

    async function performAttack(attacker, defender, isFirstStrike = false) {
        const attackerBoard = (attacker.owner === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
        const defenderBoard = (attacker.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
        const attackerEl = document.getElementById(`card-${attacker.id}`);
        if (!attackerEl) return;

        const attackerZone = (attacker.owner === 'player') ? document.getElementById('player-zone') : document.getElementById('opponent-zone');
        if (attackerZone) attackerZone.style.zIndex = "1000";

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

        state.activeAttackerId = attacker.id;
        attackerEl.classList.add('attacking');
        
        // Wait if still shaking from being hit
        if (attackerEl.classList.contains('shake')) {
            await new Promise(r => setTimeout(r, 100));
        }

        // Phase 1: Wind up (Lift and scale)
        attackerEl.style.transition = "transform 0.45s ease-out";
        attackerEl.style.zIndex = "2000";
        attackerEl.style.transform = "scale(1.2) translateY(-15px)";
        await new Promise(r => setTimeout(r, 450));

        // Phase 1.1: Equipment Attack Triggers (e.g., Dancing Mirrorblade)
        if (attacker.equipment && attacker.equipment.onEquippedAttack) {
            await attacker.equipment.onEquippedAttack(attacker, attackerBoard);
        }

        // Phase 1.5: Attack Triggers
        let attackTargets = await attacker.onAttack(attackerBoard);

        // GLOBAL ATTACK TRIGGERS: Honor Begets Glory
        const entity = getEntity(attacker.owner);
        if (entity?.honorBegetsGloryBonus > 0) {
            await addCounters(attacker, entity.honorBegetsGloryBonus, attackerBoard);
            if (!attackTargets) attackTargets = [];
            if (!attackTargets.includes(attacker)) attackTargets.push(attacker);
        }
        
        if (attackTargets && attackTargets.length > 0) {
            // Only queue automatic pulse if the card didn't handle its own animations
            // (Used for sequencing: Ladria wants to pulse BEFORE side effects like Cascade)
            if (!attackTargets.animationsHandled) {
                const snapshots = new Map();
                attackTargets.forEach(t => {
                    // Skip attacker if we already pulsed it for Honor Begets Glory
                    if (t.id === attacker.id && entity?.honorBegetsGloryBonus > 0) return;

                    t.isPulsing = true;
                    t.pulseQueueCount = (t.pulseQueueCount || 0) + 1;
                    snapshots.set(t.id, t.takeSnapshot());
                });

                if (snapshots.size > 0) {
                    queueAnimation(async () => {
                        const pulses = Array.from(snapshots.keys()).map(tid => {
                            const t = attackTargets.find(at => at.id === tid);
                            return pulseCardElement(t, attackerBoard, snapshots.get(tid));
                        });
                        await Promise.all(pulses);
                        attackTargets.forEach(t => {
                            if (snapshots.has(t.id)) {
                                t.pulseQueueCount--;
                                if (t.pulseQueueCount <= 0) {
                                    delete t.isPulsing;
                                    delete t.pulseQueueCount;
                                }
                            }
                        });
                    });
                }
            }

            // Now resolve any deaths (this plays the death animations and pauses)
            // This handles Xun Huang triggered kills correctly
            const deathsResolved = await resolveDeaths();

            // If we have targets, we MUST pause for the trigger animations (Battle Cry style)
            // even if someone died, to ensure pulses complete before the attack strike.
            if (attackTargets.length > 0) {
                await resolveAnimations(); // Staggered pulses for Cascade, etc.
            }

            // If the defender died to an ability (Xun Huang), stop the attack
            if (defender && (defender.isDestroyed || !defenderBoard.includes(defender))) {
                attackerEl.style.transform = "";
                attackerEl.classList.remove('attacking');
                if (attackerZone) attackerZone.style.zIndex = "";
                state.activeAttackerId = null;
                return;
            }
        }

        // Phase 1.6: Special Card Triggers (Decorated Warrior, Cabracan's Familiar)
        // DECORATED WARRIOR BLOCKING
        if (defender && defender.card_name === 'Decorated Warrior' && !defender.temporaryHumility) {
            const multiplier = defender.isFoil ? 2 : 1;
            // Awaiting addCounters ensures the pulse animation finishes before the attack continues
            await addCounters(defender, multiplier, defenderBoard);
        }

        // SPECIAL TRIGGER: Cabracan's Familiar (Pre-fight damage)
        if (attacker.card_name === 'Cabracan\'s Familiar' && !attacker.temporaryHumility && defender && !defender.hasKeyword('Hexproof')) {
            const multiplier = attacker.isFoil ? 2 : 1;
            let familiarDamage = 2 * multiplier;
            
            if (defender.shieldCounters > 0) {
                defender.shieldCounters--;
                familiarDamage = 0;
            } else {
                defender.damageTaken += familiarDamage;
            }

            // Animation for pre-fight damage
            if (familiarDamage > 0) {
                const defenderEl = document.getElementById(`card-${defender.id}`);
                if (defenderEl) showDamageBubble(defenderEl, familiarDamage);
            }
            
            // Pulsing both attacker and defender to show the source and result
            // This also provides the necessary pause for the pre-fight effect
            await Promise.all([
                attacker.pulse(attackerBoard),
                defender.pulse(defenderBoard)
            ]);

            // Now resolve any deaths (this handles Familiar kills correctly)
            const familiarKillResolved = await resolveDeaths();

            // If lethal, the Familiar attack is canceled (no fight)
            if (defender && (defender.isDestroyed || !defenderBoard.includes(defender))) {
                attackerEl.style.transform = "";
                attackerEl.classList.remove('attacking');
                if (attackerZone) attackerZone.style.zIndex = "";
                state.activeAttackerId = null;
                return; 
            }
        }

        // SPECIAL TRIGGER: Cauther Hellkite (Pre-fight board damage)
        if (attacker.card_name === 'Cauther Hellkite' && !attacker.temporaryHumility) {
            const multiplier = attacker.isFoil ? 2 : 1;
            const targets = defenderBoard.filter(c => !c.hasKeyword('Hexproof'));

            if (targets.length > 0) {
                targets.forEach(c => {
                    let damage = multiplier;
                    if (c.shieldCounters > 0) {
                        c.shieldCounters--;
                    } else {
                        c.damageTaken += multiplier;
                        const el = document.getElementById(`card-${c.id}`);
                        if (el) showDamageBubble(el, damage);
                    }
                });

                // Pulse the attacker to show source, and all targets for result
                const pulses = [attacker.pulse(attackerBoard)];
                targets.forEach(t => pulses.push(t.pulse(defenderBoard)));
                await Promise.all(pulses);

                // Resolve deaths from the board sweep
                await resolveDeaths();

                // If the specific defender died, cancel the strike
                if (defender && (defender.isDestroyed || !defenderBoard.includes(defender))) {
                    attackerEl.style.transform = "";
                    attackerEl.classList.remove('attacking');
                    if (attackerZone) attackerZone.style.zIndex = "";
                    state.activeAttackerId = null;
                    return;
                }
            }
        }

        const attackerStats = attacker.getDisplayStats(attackerBoard);
        const damageDealt = attackerStats.p;

        // Phase 2: Attack Strike (FASTER movement)
        attackerEl.style.transition = "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)";
        attackerEl.style.transform = `translate(${deltaX * 0.6}px, ${deltaY * 0.6}px) scale(1.3)`;
        await new Promise(r => setTimeout(r, 180));

        // Phase 3: Impact calculations
        let { defenderDamageTaken, attackerDamageTaken, trampleOverflow, trampleTarget } = resolveCombatImpact(attacker, defender, isFirstStrike);

        render(); 

        const triggerOverallHpLoss = (side) => {
            if (state.overallHpReducedThisFight) return;
            const currentOppCombat = getOpponent();
            let losingAvatarId = "";
            let amount = 0;

            if (side === 'opponent' && currentOppCombat.fightHp <= 0) {
                currentOppCombat.overallHp -= state.player.tier;
                losingAvatarId = 'opponent-battle-avatar';
                amount = state.player.tier;
                state.overallHpReducedThisFight = true;
            } else if (side === 'player' && state.player.fightHp <= 0) {
                state.player.overallHp -= currentOppCombat.tier;
                losingAvatarId = 'player-avatar';
                amount = currentOppCombat.tier;
                state.overallHpReducedThisFight = true;
            }

            if (losingAvatarId) {
                const avatarEl = document.getElementById(losingAvatarId);
                if (avatarEl) {
                    avatarEl.classList.add('shake');
                    setTimeout(() => avatarEl.classList.remove('shake'), 500);
                    
                    // Manually update health text to sync with shake
                    const hpSpan = (losingAvatarId === 'player-avatar') ? document.getElementById('player-hp') : document.getElementById('opponent-hp');
                    if (hpSpan) {
                        hpSpan.textContent = (losingAvatarId === 'player-avatar') ? state.player.overallHp : currentOppCombat.overallHp;
                    }

                    // Update health bar only on the sidebar roster frame
                    if (losingAvatarId !== 'player-avatar') {
                        const heroName = currentOppCombat.hero?.name;
                        const rosterFrame = document.querySelector(`.roster-frame[data-hero-name="${heroName}"]`);
                        if (rosterFrame) updateAvatarHealthBar(rosterFrame, currentOppCombat.overallHp, 20);
                    }
                }
            }
        };

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
                        triggerOverallHpLoss(attacker.owner === 'player' ? 'opponent' : 'player');
                    }, 100);
                }
            }
        } else {
            const avatarId = attacker.owner === 'player' ? 'opponent-battle-avatar' : 'player-avatar';
            const avatarEl = document.getElementById(avatarId);
            showDamageBubble(avatarEl, defenderDamageTaken);
            triggerOverallHpLoss(attacker.owner === 'player' ? 'opponent' : 'player');
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
            if (attackerZone) attackerZone.style.zIndex = "";

            if (attacker.isDecayed) {
                attacker.isDestroyed = true;
            }

            const hitPlayer = (!defender && defenderDamageTaken > 0) || (!trampleTarget && trampleOverflow > 0);
            if (hitPlayer && attacker.equipment && attacker.equipment.card_name === "Rivha's Blessed Blade") {
                triggerETB(attacker, attackerBoard);
                render(); 
                await resolveAnimations();
            }

            state.activeAttackerId = null;
        } else {
            const attackerZone = (attacker.owner === 'player') ? document.getElementById('player-zone') : document.getElementById('opponent-zone');
            if (attackerZone) attackerZone.style.zIndex = "";
            state.activeAttackerId = null;
        }
    }

    function createToken(tokenName, set, owner) {
        const tokenData = availableCards.find(c => c.card_name === tokenName && c.shape === 'token' && (set ? c.set === set : true));
        if (tokenData) {
            const token = CardFactory.create(tokenData);
            token.id = `token-${Math.random()}`;
            token.owner = owner;
            token.isToken = true;
            
            // Add to combat participant list for trigger/sync tracking
            if (state.phase === 'BATTLE' && state.combatParticipants) {
                state.combatParticipants.push(token);
            }

            // Add to combat queue if in battle
            if (state.phase === 'BATTLE' && state.battleQueues) {
                state.battleQueues[owner].push(token);
            }

            return token;
        }
        return null;
    }

    async function resolveStartOfCombatTriggers(currentOpp) {
        // Initial delay before animations start
        await new Promise(r => setTimeout(r, 800));

        let anyTriggers = false;

        // Hero Power: Lord Ellison Crain
        const processCrain = async (entity, board, owner) => {
            if (entity.crainActive && board.length > 0 && board.length < boardLimit) {
                const leftMost = board[0];
                const clone = leftMost.clone();
                
                // Only bake in stats that aren't automatically cloned.
                // counters and dynamic buffs are already handled by clone() and getDisplayStats().
                // equipment stats are NOT cloned, so we must add them to tempPower/Toughness.
                const eqStats = leftMost.equipment ? leftMost.equipment.getEquipmentStats(leftMost) : { p: 0, t: 0 };
                
                clone.tempPower = (leftMost.tempPower || 0) + eqStats.p;
                clone.tempToughness = (leftMost.tempToughness || 0) + eqStats.t;
                
                // Copy temporary keywords from equipment or enchantments into permanent-on-clone enchantments
                const keywordsToCheck = [
                    'Flying', 'First strike', 'Double strike', 'Deathtouch', 'Haste',
                    'Hexproof', 'Indestructible', 'Lifelink', 'Menace', 'Reach',
                    'Trample', 'Vigilance'
                ];
                
                keywordsToCheck.forEach(kw => {
                    if (leftMost.hasKeyword(kw) && !clone.hasKeyword(kw)) {
                        clone.enchantments.push({ card_name: 'Crain Phantom Grant', rules_text: kw, isTemporary: false });
                    }
                });

                clone.isDecayed = true;
                clone.isToken = true;
                clone.isCrainToken = true; // For post-combat cleanup
                clone.isSpawning = true;
                clone.owner = owner;
                clone.equipment = null; // Decayed clones do NOT copy equipment
                
                board.unshift(clone);
                entity.crainActive = false;
                anyTriggers = true;
                render();
                await new Promise(r => setTimeout(r, 600));
                delete clone.isSpawning;
                render();
            }
        };

        await processCrain(currentOpp, currentOpp.board, 'opponent');
        await processCrain(state.player, state.player.board, 'player');

        // Run opponent triggers first
        for (const card of currentOpp.board) {
            const targets = await card.onCombatStart(currentOpp.board);
            if (targets && targets.length > 0) {
                anyTriggers = true;
                await animateStartOfCombatTrigger(card, targets, currentOpp.board);
            }
        }

        // Run player triggers second
        for (const card of state.player.board) {
            const targets = await card.onCombatStart(state.player.board);
            if (targets && targets.length > 0) {
                anyTriggers = true;
                await animateStartOfCombatTrigger(card, targets, state.player.board);
            }
        }

        if (anyTriggers) {
            await resolveAnimations();
        }

        return anyTriggers;
    }

    async function pulseCardElement(target, board, snapshot = null) {
        const targetEl = document.getElementById(`card-${target.id}`);
        if (targetEl) {
            // 1. Capture old state for surgical pulsing
            const oldStats = target.getDisplayStats(board, true);
            const oldCounterStack = targetEl.querySelector('.card-counter-stack');
            const oldGhostStack = targetEl.querySelector('.ghost-indicator-container');
            
            // Capture semantic state to avoid brittle HTML comparison
            const oldCounterStates = (oldCounterStack && oldCounterStack.children) ? Array.from(oldCounterStack.children).map(c => ({
                type: c.dataset.type,
                value: c.dataset.value,
                text: c.textContent
            })) : [];
            const oldGhostKeywords = (oldGhostStack && oldGhostStack.children) ? Array.from(oldGhostStack.children).map(g => g.dataset.keyword) : [];

            // 2. Sync visual state to the snapshot (staged update)
            if (snapshot) {
                target.displayedCounters = snapshot.counters;
                target.displayedDamageTaken = snapshot.damageTaken;
                target.displayedTempPower = snapshot.tempPower;
                target.displayedTempToughness = snapshot.tempToughness;
                target.displayedFlyingCounters = snapshot.flyingCounters;
                target.displayedMenaceCounters = snapshot.menaceCounters;
                target.displayedFirstStrikeCounters = snapshot.firstStrikeCounters;
                target.displayedDoubleStrikeCounters = snapshot.doubleStrikeCounters;
                target.displayedVigilanceCounters = snapshot.vigilanceCounters;
                target.displayedLifelinkCounters = snapshot.lifelinkCounters;
                target.displayedDeathtouchCounters = snapshot.deathtouchCounters;
                target.displayedTrampleCounters = snapshot.trampleCounters;
                target.displayedReachCounters = snapshot.reachCounters;
                target.displayedHexproofCounters = snapshot.hexproofCounters;
                target.displayedShieldCounters = snapshot.shieldCounters;
                target.displayedIsTransforming = snapshot.isTransforming;
                target.displayedEnchantments = [...snapshot.enchantments];
            } else {
                target.syncVisualState();
            }

            // 3. Sync visual state to DOM (but don't pulse yet)
            const stats = target.getDisplayStats(board, true);
            const pEl = targetEl.querySelector('.card-p');
            const tEl = targetEl.querySelector('.card-t');
            if (pEl) pEl.textContent = stats.p;
            if (tEl) {
                tEl.textContent = stats.t;
                if (stats.t < stats.maxT) tEl.classList.add('damaged');
                else tEl.classList.remove('damaged');
            }

            // Create a fresh dummy element to steal updated UI from
            const dummy = createCardElement(target, false, -1, board);
            const counterStackEl = targetEl.querySelector('.card-counter-stack');
            const ghostContainer = targetEl.querySelector('.ghost-indicator-container');
            
            if (counterStackEl) {
                const newCounterStack = dummy.querySelector('.card-counter-stack');
                if (newCounterStack) counterStackEl.innerHTML = newCounterStack.innerHTML;
            }
            if (ghostContainer) {
                const newGhostContainer = dummy.querySelector('.ghost-indicator-container');
                if (newGhostContainer) ghostContainer.innerHTML = newGhostContainer.innerHTML;
            }

            // 4. IDENTIFY MODIFIED ELEMENTS
            const elementsToPulse = [];

            // P/T Box pulses if ANY stat changed OR if it's a transformation
            const statsChanged = (stats.p !== oldStats.p || stats.t !== oldStats.t || stats.maxT !== oldStats.maxT || target.displayedIsTransforming);
            const ptBox = targetEl.querySelector('.card-pt');
            if (ptBox && statsChanged) {
                elementsToPulse.push(ptBox);
            }
            
            // Clear the transformation flag once identified
            delete target.displayedIsTransforming;
            delete target.isTransforming;

            // Counters pulse if they are new or modified (Match by type, not index, to handle order shifts)
            if (counterStackEl && counterStackEl.children) {
                Array.from(counterStackEl.children).forEach((c) => {
                    const old = oldCounterStates.find(o => o.type === c.dataset.type);
                    const isModified = !old || c.dataset.value !== old.value || c.textContent !== old.text;
                    if (isModified) {
                        elementsToPulse.push(c);
                    }
                });
            }

            // Ghosts pulse if they are new or modified (Match by keyword, not index)
            if (ghostContainer && ghostContainer.children) {
                Array.from(ghostContainer.children).forEach((g) => {
                    if (!oldGhostKeywords.includes(g.dataset.keyword)) {
                        elementsToPulse.push(g);
                    }
                });
            }

            // 5. TRIGGER UNIFIED PULSE
            if (elementsToPulse.length > 0) {
                elementsToPulse.forEach(el => {
                    el.classList.remove('pulse-stats');
                    void el.offsetWidth; // Trigger reflow
                    el.classList.add('pulse-stats');
                });
                
                // Wait for animation to finish
                await new Promise(r => setTimeout(r, 600));
                elementsToPulse.forEach(el => el.classList.remove('pulse-stats'));
            }
        }
    }

    async function animateStartOfCombatTrigger(source, targets, board) {
        if (targets && targets.length > 0) {
            const snapshots = new Map();
            targets.forEach(t => snapshots.set(t.id, t.takeSnapshot()));
            const pulses = targets.map(target => pulseCardElement(target, board, snapshots.get(target.id)));
            await Promise.all(pulses);
        }
    }

    function queueAnimation(animationFn) {
        state.animationQueue.push(animationFn);
    }

    async function resolveAnimations() {
        if (state.isResolvingAnimations) return;
        state.isResolvingAnimations = true;
        try {
            while (state.animationQueue.length > 0) {
                const anim = state.animationQueue.shift();
                await anim();
                if (state.animationQueue.length > 0) {
                    await new Promise(r => setTimeout(r, 100)); // Stagger delay
                }
            }
        } finally {
            state.isResolvingAnimations = false;
        }
    }

    async function waitForBusyCards() {
        const startTime = Date.now();
        const timeout = 10000; // 10s safety timeout

        while (Date.now() - startTime < timeout) {
            const busyCards = [
                ...state.player.board,
                ...state.player.hand
            ].filter(c => c.isPulsing || c.isSpawning || c.isDying);

            if (busyCards.length === 0 && state.animationQueue.length === 0) break;
            
            await new Promise(r => setTimeout(r, 100));
        }
    }

    async function startBattleTurn() {
        state.phase = 'BATTLE';
        state.overallHpReducedThisFight = false;
        endTurnBtn.disabled = true;
        rerollBtn.disabled = true;
        
        // AI Phase: ALL opponents play their hidden turns
        state.opponents.forEach(opp => opponentPlayTurn(opp));

        // Off-screen battle simulation for the other opponents
        const otherOpponents = state.opponents.filter((_, idx) => idx !== state.currentOpponentId);
        for (let i = 0; i < otherOpponents.length - 1; i += 2) {
            simulateAIShopBattle(otherOpponents[i], otherOpponents[i+1]);
        }

        const currentOpp = getOpponent();

        state.player.fightHp = 5 + (5 * state.player.tier);
        currentOpp.fightHp = 5 + (5 * currentOpp.tier);

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

        render();
        // Wait a frame for elements to exist
        await new Promise(r => requestAnimationFrame(r));

        const triggersOccurred = await resolveStartOfCombatTriggers(currentOpp);

        state.combatParticipants = [];

        // 2. Create Combat Snapshots
        const createBattleInstance = (card, owner) => {
            const instance = (card instanceof BaseCard ? card : CardFactory.create(card)).clone();
            instance.owner = owner;
            instance.sourceId = card.id; // Track source for permanent counter syncing
            state.combatParticipants.push(instance);
            return instance;
        };

        state.battleBoards = {
            player: state.player.board.map(c => createBattleInstance(c, 'player')),
            opponent: currentOpp.board.map(c => createBattleInstance(c, 'opponent'))
        };
        
        render(); 
        console.log("Battle Begins!");

        // If no triggers occurred, we still need a small pause for the transition
        // If triggers DID occur, we want a 300ms breath before the first attack.
        if (!triggersOccurred) {
            await new Promise(resolve => setTimeout(resolve, 800)); 
        } else {
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // INITIALIZE QUEUES
        state.battleQueues = {
            player: state.battleBoards.player.filter(c => !c.isLockedByChivalry),
            opponent: state.battleBoards.opponent.filter(c => !c.isLockedByChivalry)
        };
        state.attackerSide = Math.random() < 0.5 ? 'player' : 'opponent';
        let turnsInCurrentRound = 0;

        // MAIN COMBAT LOOP
        while (state.player.fightHp > 0 && currentOpp.fightHp > 0 && 
              (state.battleQueues.player.length > 0 || state.battleQueues.opponent.length > 0)) {
            
            // Check for Haste priority at the start of each ROUND (every 2 loop cycles)
            if (turnsInCurrentRound === 0 || turnsInCurrentRound >= 2) {
                const pHasHaste = state.battleQueues.player.length > 0 && state.battleQueues.player[0].hasKeyword('Haste');
                const oHasHaste = state.battleQueues.opponent.length > 0 && state.battleQueues.opponent[0].hasKeyword('Haste');

                if (pHasHaste && !oHasHaste) {
                    state.attackerSide = 'player';
                } else if (oHasHaste && !pHasHaste) {
                    state.attackerSide = 'opponent';
                }
                turnsInCurrentRound = 0;
            }

            // Check for 0-power stall state
            const totalPower = [...state.battleBoards.player, ...state.battleBoards.opponent].reduce((sum, c) => {
                if (c.isDying || c.isDestroyed) return sum;
                const stats = c.getDisplayStats(c.owner === 'player' ? state.battleBoards.player : state.battleBoards.opponent);
                return sum + stats.p;
            }, 0);
            
            if (totalPower <= 0) {
                console.log("Combat stalled due to zero power on board. Forcing a draw.");
                break;
            }

            const currentQueue = state.battleQueues[state.attackerSide];
            if (currentQueue.length > 0) {
                const attacker = currentQueue.shift();
                
                // Verify attacker is still alive and on the board snapshot
                const attackerBoard = (state.attackerSide === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
                if (attackerBoard.includes(attacker) && !attacker.isDying) {
                    const defenderBoard = (state.attackerSide === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    let defender = findTarget(attacker, defenderBoard);
                    
                    const hasDoubleStrike = attacker.hasKeyword('Double strike');
                    
                    if (hasDoubleStrike) {
                        // HIT 1: First Strike
                        await performAttack(attacker, defender, true); // true = isFirstStrike
                        await resolveDeaths();
                        
                        // Abort if the game is over
                        if (state.player.fightHp <= 0 || currentOpp.fightHp <= 0) {
                            break; 
                        }
                        
                        // HIT 2: Regular Strike (if attacker survived)
                        if (attackerBoard.includes(attacker) && !attacker.isDying) {
                            // Check if the original defender died or was removed
                            const defenderDied = defender && (!defenderBoard.includes(defender) || defender.isDying || defender.isDestroyed);
                            
                            // Double Strike only hits a SECOND time if the target is still there
                            if (!defenderDied) {
                                await performAttack(attacker, defender, false);
                                await resolveDeaths();
                            }
                        }
                    } else {
                        // HIT 1: Normal or First Strike
                        const hasFirstStrike = attacker.hasKeyword('First strike');
                        await performAttack(attacker, defender, hasFirstStrike);
                        await resolveDeaths();
                    }

                    // If attacker survived, return to back of queue
                    if (attackerBoard.includes(attacker) && !attacker.isDying) {
                        currentQueue.push(attacker);
                    }
                }
            }

            turnsInCurrentRound++;
            // Flip side
            state.attackerSide = state.attackerSide === 'player' ? 'opponent' : 'player';
        }

        // Linger long enough to see the result, but not too long.
        await new Promise(resolve => setTimeout(resolve, 800));

        const aliveOpponents = state.opponents.filter(opp => opp.overallHp > 0);
        if (state.player.overallHp <= 0) {
            showEndScreen(aliveOpponents.length + 1);
            return; 
        }
        
        state.opponents = aliveOpponents;
        if (state.opponents.length === 0) {
            showEndScreen(1);
            return;
        }

        // Sync combat counters back to original cards
        if (state.combatParticipants) {
            state.combatParticipants.forEach(battleCard => {
                const ownerBoard = battleCard.owner === 'player' ? state.player.board : (state.opponents.find(o => o.board.some(c => c.id === battleCard.sourceId))?.board || []);
                const original = ownerBoard.find(c => c.id === battleCard.sourceId);
                if (original) {
                    original.counters = battleCard.counters;
                    original.flyingCounters = battleCard.flyingCounters;
                    original.menaceCounters = battleCard.menaceCounters;
                    original.firstStrikeCounters = battleCard.firstStrikeCounters;
                    original.doubleStrikeCounters = battleCard.doubleStrikeCounters;
                    original.vigilanceCounters = battleCard.vigilanceCounters;
                    original.lifelinkCounters = battleCard.lifelinkCounters;
                    original.deathtouchCounters = battleCard.deathtouchCounters;
                    original.trampleCounters = battleCard.trampleCounters;
                    original.reachCounters = battleCard.reachCounters;
                    original.hexproofCounters = battleCard.hexproofCounters;
                }
            });
        }

        // --- End of Combat Cleanup ---
        resetTemporaryStats();

        state.player.fightHp = 5 + (5 * state.player.tier);
        state.panharmoniconActive = false;
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
        // Progression: T1=3, T2=4, T3=4, T4=5, T5=6
        let creaturesTarget = 3;
        if (state.player.tier === 2) creaturesTarget = 4;
        else if (state.player.tier === 3) creaturesTarget = 4;
        else if (state.player.tier === 4) creaturesTarget = 5;
        else if (state.player.tier === 5) creaturesTarget = 6;
        
        creaturesTarget += creatureBonus;
        const spellsTarget = 1 + spellBonus;

        // 1. Fill from scry queue first
        let i = 0;
        while (i < state.nextShopBonusCards.length) {
            if (state.shop.cards.length >= 7) break;
            const card = state.nextShopBonusCards[i];
            const isMainSlot = card.type?.toLowerCase().includes('creature') || card.type?.toLowerCase().includes('equipment');
            if (isMainSlot && state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature') || c.type?.toLowerCase().includes('equipment')).length < creaturesTarget) {
                state.shop.cards.push(CardFactory.create(state.nextShopBonusCards.splice(i, 1)[0]));
            } else if (!isMainSlot && state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment')).length < spellsTarget) {
                state.shop.cards.push(CardFactory.create(state.nextShopBonusCards.splice(i, 1)[0]));
            } else {
                i++;
            }
        }

        const creaturePool = availableCards.filter(c => (c.type?.toLowerCase().includes('creature') || c.type?.toLowerCase().includes('equipment')) && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
        const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);

        // 2. Fill remaining slots
        while (state.shop.cards.length < 7 && state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature') || c.type?.toLowerCase().includes('equipment')).length < creaturesTarget) {
            const hasEquipment = state.shop.cards.some(c => c.type?.toLowerCase().includes('equipment'));
            let subPool = creaturePool;
            if (hasEquipment) {
                subPool = creaturePool.filter(c => !c.type?.toLowerCase().includes('equipment'));
            }
            if (subPool.length === 0) break;
            const instance = CardFactory.create(subPool[Math.floor(Math.random() * subPool.length)]);
            if (instance) state.shop.cards.push(instance);
        }
        while (state.shop.cards.length < 7 && state.shop.cards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment')).length < spellsTarget) {
            if (spellPool.length === 0) break;
            const instance = CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]);
            if (instance) state.shop.cards.push(instance);
        }
    }

    function unfreezeShop() {
        state.shop.frozen = false;
        if (freezeBtn) freezeBtn.classList.remove('frozen');
        const img = document.getElementById('freeze-img');
        if (img) img.src = 'img/unlocked.png';
    }

    function populateShop() {
        unfreezeShop();
        state.shop.cards = state.shop.cards.filter(c => c.isChained);
        fillShopSlots();
    }

    function populateSpecialShop() {
        unfreezeShop();
        state.shop.cards = state.shop.cards.filter(c => c.isChained);

        // Weighted shop selection
        const rand = Math.random();
        let chosenType = 'high_tier'; // Default (40%)
        if (rand < 0.1) chosenType = 'board_copy'; // 10%
        else if (rand < 0.3) chosenType = 'triples'; // 20%
        else if (rand < 0.6) chosenType = 'discounted'; // 30%

        // Refinement: board_copy only if board is 5+ NONTOKEN creatures
        const nontokenCount = state.player.board.filter(c => !c.isToken).length;
        if (chosenType === 'board_copy' && nontokenCount < 5) {
            // Re-roll without board_copy if not enough creatures
            const fallbackRand = Math.random();
            if (fallbackRand < 0.44) chosenType = 'high_tier'; // 4/9 (~44%)
            else if (fallbackRand < 0.77) chosenType = 'discounted'; // 3/9 (~33%)
            else chosenType = 'triples'; // 2/9 (~22%)
        }

        console.log("Enoch triggered special shop:", chosenType);

        if (chosenType === 'triples') {
            const creaturePool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
            if (creaturePool.length >= 2) {
                const c1 = creaturePool[Math.floor(Math.random() * creaturePool.length)];
                let c2 = creaturePool[Math.floor(Math.random() * creaturePool.length)];
                while (c2.card_name === c1.card_name) {
                    c2 = creaturePool[Math.floor(Math.random() * creaturePool.length)];
                }
                for (let i = 0; i < 3; i++) {
                    if (state.shop.cards.length < 7) state.shop.cards.push(CardFactory.create(c1));
                }
                for (let i = 0; i < 3; i++) {
                    if (state.shop.cards.length < 7) state.shop.cards.push(CardFactory.create(c2));
                }
            }
            // Add a spell
            if (state.shop.cards.length < 7) {
                const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
                if (spellPool.length > 0) state.shop.cards.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
            }

        } else if (chosenType === 'board_copy') {
            // "EXACT COPY" means we clear everything else first
            state.shop.cards = [];
            state.player.board.forEach(c => {
                if (c.isToken || state.shop.cards.length >= 7) return; // EXCLUDE TOKENS and respect limit

                const clone = c.clone();
                // Reset ALL dynamic stats and keywords to make it "vanilla"
                clone.counters = 0;
                clone.flyingCounters = 0;
                clone.menaceCounters = 0;
                clone.firstStrikeCounters = 0;
                clone.doubleStrikeCounters = 0;
                clone.vigilanceCounters = 0;
                clone.lifelinkCounters = 0;
                clone.deathtouchCounters = 0;
                clone.trampleCounters = 0;
                clone.reachCounters = 0;
                clone.shieldCounters = 0;
                clone.tempPower = 0;
                clone.tempToughness = 0;
                clone.damageTaken = 0;
                clone.isDestroyed = false;
                clone.isFoil = false;
                clone.actionUsed = false;
                clone.equipment = null;
                clone.enchantments = [];
                clone.costReduction = 0;
                state.shop.cards.push(clone);
            });

        } else if (chosenType === 'discounted') {
            fillShopSlots();
            state.shop.cards.forEach(c => {
                const isCreature = c.type?.toLowerCase().includes('creature');
                if (isCreature) {
                    c.costReduction = (c.costReduction || 0) + 2;
                }
            });

        } else if (chosenType === 'high_tier') {
            // Specifically creatures, no equipment
            const highTierPool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier === state.player.tier || c.tier === state.player.tier + 1));
            const spellPool = availableCards.filter(c => c.type && !c.type.toLowerCase().includes('creature') && !c.type.toLowerCase().includes('equipment') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
            
            // Progression logic for slot count
            let creaturesTarget = 3;
            if (state.player.tier === 2) creaturesTarget = 4;
            else if (state.player.tier === 3) creaturesTarget = 4;
            else if (state.player.tier === 4) creaturesTarget = 5;
            else if (state.player.tier === 5) creaturesTarget = 6;

            while (state.shop.cards.length < 7 && state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature')).length < creaturesTarget) {
                if (highTierPool.length === 0) break;
                state.shop.cards.push(CardFactory.create(highTierPool[Math.floor(Math.random() * highTierPool.length)]));
            }
            if (state.shop.cards.length < 7) {
                state.shop.cards.push(CardFactory.create(spellPool[Math.floor(Math.random() * spellPool.length)]));
            }
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

    function addCardsToShop(count, typeFilter = 'creature', costReduction = 0) {
        for (let i = 0; i < count; i++) {
            if (state.shop.cards.length >= 7) break;

            let instance;
            // If scry queue has a valid card, pull it.
            let scryIdx = state.nextShopBonusCards.findIndex(c => {
                if (typeFilter === 'all') return true;
                const isCreature = c.type?.toLowerCase().includes('creature');
                return typeFilter === 'creature' ? isCreature : !isCreature;
            });

            if (scryIdx !== -1) {
                instance = CardFactory.create(state.nextShopBonusCards.splice(scryIdx, 1)[0]);
            } else {
                // Otherwise pull random from pool
                const pool = availableCards.filter(c => {
                    const matchesTier = (c.tier || 1) <= state.player.tier;
                    if (typeFilter === 'all') return matchesTier && c.shape !== 'token';
                    const matchesType = c.type?.toLowerCase().includes('creature');
                    const desiredType = typeFilter === 'creature' ? matchesType : !matchesType;
                    return matchesTier && desiredType && c.shape !== 'token';
                });
                if (pool.length > 0) {
                    instance = CardFactory.create(pool[Math.floor(Math.random() * pool.length)]);
                }
            }

            if (instance) {
                if (costReduction > 0) {
                    instance.costReduction = (instance.costReduction || 0) + costReduction;
                }
                state.shop.cards.push(instance);
            }
        }
        render();
    }
    async function buyCard(cardId) {
        if (state.phase !== 'SHOP') return;
        const cardIndex = state.shop.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.shop.cards[cardIndex];

        if (card.isChained) return; // Cannot buy chained cards
        
        let cost = 3; // Default for creatures
        if (card.type.toLowerCase().includes('equipment')) {
            cost = 5;
        } else if (!card.type.toLowerCase().includes('creature')) {
            cost = card.tier || 1;
        }

        // Apply cost reduction
        if (card.costReduction) {
            cost = Math.max(0, cost - card.costReduction);
        }

        if (state.player.gold < cost || state.player.hand.length >= handLimit) return;
        state.player.gold -= cost;
        state.player.hand.push(card);
        state.shop.cards.splice(cardIndex, 1);
        
        // HERO POWER: Adelaide (4th Spell Reward)
        if (state.player.hero.name === "Adelaide" && !state.player.usedHeroPower) {
            const isCreature = card.type?.toLowerCase().includes('creature');
            if (!isCreature) {
                state.player.spellsBoughtThisGame++;
                if (state.player.spellsBoughtThisGame >= 4) {
                    const dillettanteData = availableCards.find(c => c.card_name === 'Pale Dillettante');
                    if (dillettanteData) {
                        const reward = CardFactory.create(dillettanteData);
                        reward.owner = 'player';
                        // If hand is full, it just fizzles!
                        if (state.player.hand.length < handLimit) {
                            state.player.hand.push(reward);
                        }
                        state.player.usedHeroPower = true;
                    }
                }
            }
        }

        render();
        await resolveAnimations();
        setTimeout(checkTriples, 100);
    }

    async function activateHeroPower() {
        const hp = state.player.hero.heroPower;
        if (state.player.gold >= hp.cost && !state.player.usedHeroPower) {
            await hp.effect('player', state.player.board);
            render();
            await resolveAnimations();
        }
    }

    function checkHerreaReward(card) {
        if (!card || state.player.hero.name !== "Herrea" || state.player.usedHeroPower) return;
        if (card.color && card.color.includes('U')) {
            state.player.blueCardsPlayed++;
            if (state.player.blueCardsPlayed >= 7 && state.player.herreaRewardCard) {
                if (state.player.hand.length < handLimit) {
                    state.player.hand.push(state.player.herreaRewardCard);
                    state.player.usedHeroPower = true;
                }
            }
        }
    }

    function checkAutumnReward(target, source) {
        if (!target || !source || state.player.hero.name !== "Autumn") return;
        // If this source already counted for Autumn, don't count it again (multi-phase spells)
        if (source.autumnTriggered) return;

        if (target.isType('Centaur')) {
            state.player.autumnSpellCount++;
            source.autumnTriggered = true; // Mark this specific play as already counted

            if (state.player.autumnSpellCount >= 3) {
                const centaurPool = availableCards.filter(c => {
                    const inst = (c instanceof BaseCard) ? c : CardFactory.create(c);
                    return inst.isType('Centaur') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier;
                });
                if (centaurPool.length > 0) {
                    const rand = centaurPool[Math.floor(Math.random() * centaurPool.length)];
                    const reward = CardFactory.create(rand);
                    reward.owner = 'player';
                    if (state.player.hand.length < handLimit) {
                        state.player.hand.push(reward);
                    } else if (state.player.board.length < boardLimit) {
                        state.player.board.push(reward);
                        triggerETB(reward, state.player.board);
                    }
                }
                state.player.autumnSpellCount = 0;
            }
        }
    }

    async function useCardFromHand(cardId, targetIndex = -1) {
        if (state.phase !== 'SHOP' || state.castingSpell || state.targetingEffect) return;
        state.currentSpellTargets = [];
        const cardIndex = state.player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const card = state.player.hand[cardIndex];

        if (card.type.toLowerCase().includes('creature')) {
            if (state.player.board.length >= boardLimit) return;
            
            // Remove from hand FIRST to prevent double-counting during tripling checks triggered by ETB
            state.player.hand.splice(cardIndex, 1);

            const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
            instance.owner = 'player';

            if (targetIndex !== -1) {
                state.player.board.splice(targetIndex, 0, instance);
            } else {
                state.player.board.push(instance);
            }

            // Trigger ETB (Now handles foils internally to coordinate with Panharmonicon)
            triggerETB(instance, state.player.board);

            // Defer broadcast if we just entered targeting mode
            if (state.targetingEffect && state.targetingEffect.sourceId === instance.id) {
                state.targetingEffect.needsETBBroadcast = true;
            } else {
                // Broadcast ETB to OTHERS
                state.player.board.forEach(c => {
                    if (c.id !== instance.id) c.onOtherCreatureETB(instance, state.player.board);
                });
            }

            // HERO POWER: Herrea (Blue card tracking & Reward) - ONLY if no targeting Modal was opened
            if (!state.targetingEffect && !state.discovery) {
                checkHerreaReward(instance);
            }
        } else {
            const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
            instance.owner = 'player';
            
            if (instance.card_name === 'Executioner\'s Madness') {
                state.spellsCastThisTurn++;
                queueTargetingEffect({ sourceId: instance.id, title: instance.card_name, text: "Choose a creature to sacrifice.", effect: 'executioner_sacrifice_step1', wasCast: true, cardInstance: instance, owner: 'player' });
            } else if (instance.card_name === 'Warrior\'s Ways') {
                state.spellsCastThisTurn++;
                queueTargetingEffect({ sourceId: instance.id, title: instance.card_name, text: "Choose a creature to get +2/+2 until end of turn.", effect: 'warrior_ways_step1', wasCast: true, isFoil: instance.isFoil, cardInstance: instance, owner: 'player' });
            } else if (instance.card_name === 'Whispers of the Dead') {
                state.spellsCastThisTurn++;
                queueTargetingEffect({ sourceId: instance.id, title: instance.card_name, text: "Choose a creature to sacrifice.", effect: 'whispers_sacrifice', wasCast: true, cardInstance: instance, owner: 'player' });
            } else if (instance.card_name === 'Ceremony of Tribes') {
                state.spellsCastThisTurn++;
                queueTargetingEffect({ sourceId: instance.id, title: instance.card_name, text: "Choose the first creature to copy.", effect: 'ceremony_step1', wasCast: true, cardInstance: instance, owner: 'player' });
            } else if (instance.card_name === 'Up in Arms') {
                state.spellsCastThisTurn++;
                instance.onApply(null, state.player.board);
                // Up in Arms step 1 will be handled in applyTargetedEffect
            } else if (instance.type?.toLowerCase().includes('equipment')) {
                if (state.player.board.length === 0) return;
                state.spellsCastThisTurn++;
                queueTargetingEffect({ sourceId: instance.id, title: instance.card_name, text: "Choose a creature to equip.", effect: 'equip_creature', wasCast: true, cardInstance: instance, owner: 'player' });
            } else if (targetedNames.includes(instance.card_name)) {
                if (instance.card_name === 'Artful Coercion' && state.player.board.length >= boardLimit) {
                    return; 
                }
                state.spellsCastThisTurn++;
                state.castingSpell = instance;
            } else {
                state.spellsCastThisTurn++;
                instance.onCast(state.player.board);
                state.player.hand.splice(cardIndex, 1);
                state.player.spellGraveyard.push(instance);
                const targets = [...state.currentSpellTargets];
                state.currentSpellTargets = [];
                state.player.board.forEach(c => c.onNoncreatureCast(instance, state.player.board, targets));
                
                // HERO POWER: Herrea (Blue card tracking & Reward) - NO TARGETING
                if (!state.targetingEffect && !state.discovery) {
                    checkHerreaReward(instance);
                }
            }
        }
        
        render();
        if (!state.targetingEffect && !state.discovery && state.discoveryQueue.length === 0) {
            await resolveAnimations();
        }
    }

    function queueTargetingEffect(effect) {
        if (effect.isMandatory === undefined) effect.isMandatory = true;
        
        // If we are currently resolving a hero power, propagate the flag and cost
        if (state.targetingEffect && state.targetingEffect.isHeroPower) {
            effect.isHeroPower = true;
            effect.heroPowerCost = state.targetingEffect.heroPowerCost;
            effect.owner = effect.owner || state.targetingEffect.owner;
        }

        state.targetingQueue.push(effect);
        if (!state.targetingEffect) {
            processTargetingQueue();
        }
    }

    function processTargetingQueue() {
        while (state.targetingQueue.length > 0) {
            const effect = state.targetingQueue.shift();
            let hasTargets = true;
            const currentBoard = (state.phase === 'BATTLE' && state.battleBoards) ? 
                                 (effect.owner === 'opponent' ? state.battleBoards.opponent : state.battleBoards.player) : 
                                 state.player.board;

            if (effect.effect === 'dutiful_camel_counter' || effect.effect === 'pusbag_sacrifice' || effect.effect === 'traverse_cirrusea_grant' || 
                effect.effect === 'traverse_onora_grant' || effect.effect === 'traverse_altabaq_grant' || 
                effect.effect === 'infuse_spell_resolution') {
                hasTargets = currentBoard.length > 0;
            } else if (effect.effect === 'architect_control') {
                hasTargets = state.shop.cards.some(c => {
                    const inst = (c instanceof BaseCard) ? c : CardFactory.create(c);
                    return inst.type?.toLowerCase().includes('creature');
                });
            } else if (effect.effect === 'nest_matriarch_buff') {

                hasTargets = currentBoard.length > 1; 
            } else if (effect.effect === 'warband_rallier_counters') {
                hasTargets = currentBoard.some(c => c.isType('Centaur'));
            } else if (effect.effect === 'permutate_step1') {
                hasTargets = currentBoard.some(c => c.counters > 0 || c.flyingCounters > 0 || c.menaceCounters > 0 || c.firstStrikeCounters > 0 || c.vigilanceCounters > 0 || c.lifelinkCounters > 0 || c.reachCounters > 0);
            } else if (effect.effect === 'nightfall_raptor_bounce') {
                hasTargets = currentBoard.some(c => !c.isType('Enchantment'));
            } else if (effect.effect === 'cloudline_sovereign_step1') {
                hasTargets = currentBoard.some(c => (c.counters > 0 || c.flyingCounters > 0 || c.menaceCounters > 0 || c.firstStrikeCounters > 0 || c.vigilanceCounters > 0 || c.lifelinkCounters > 0) && c.shieldCounters === 0);
            } else if (effect.effect === 'artful_coercion_gain_control') {
                // Find min power on battlefield (yours + opponent + SHOP)
                const currentOpp = getOpponent();
                const battlefield = [...state.player.board, ...currentOpp.board];
                const shopCreatures = state.shop.cards.filter(c => {
                    const inst = (c instanceof BaseCard) ? c : CardFactory.create(c);
                    return inst.type?.toLowerCase().includes('creature');
                }).map(c => (c instanceof BaseCard) ? c : CardFactory.create(c));
                
                const allMinPool = [...battlefield, ...shopCreatures];
                const minPower = allMinPool.length > 0 ? Math.min(...allMinPool.map(c => {
                    const board = c.owner === 'player' ? state.player.board : (c.owner === 'opponent' ? currentOpp.board : shopCreatures);
                    return c.getDisplayStats(board).p;
                })) : Infinity;
                
                // Targets are in the SHOP, and board must have space
                hasTargets = (state.player.board.length < boardLimit) && state.shop.cards.some(c => {
                    const inst = (c instanceof BaseCard) ? c : CardFactory.create(c);
                    return inst.type?.toLowerCase().includes('creature') && inst.getBasePT().p <= minPower;
                });
            } else if (effect.effect === 'parliament_discard') {
                const validHandCards = state.player.hand.filter(c => c.id !== effect.sourceId);
                hasTargets = state.player.spellGraveyard.length > 0 && validHandCards.length > 0;
            }

            if (hasTargets) {
                // AUTO-RESOLVE IN BATTLE (No interactive targeting allowed)
                if (state.phase === 'BATTLE') {
                    let validTargets = [];
                    if (effect.effect === 'artful_coercion_gain_control') {
                        // Artful Coercion targets the shop
                        const currentOpp = getOpponent();
                        const battlefield = [...state.player.board, ...currentOpp.board];
                        const shopCreatures = state.shop.cards.filter(c => c.type?.toLowerCase().includes('creature'));
                        const allMinPool = [...battlefield, ...shopCreatures];
                        const minPower = allMinPool.length > 0 ? Math.min(...allMinPool.map(c => {
                            const b = c.owner === 'player' ? state.player.board : (c.owner === 'opponent' ? currentOpp.board : shopCreatures);
                            return c.getDisplayStats(b).p;
                        })) : Infinity;
                        validTargets = shopCreatures.filter(c => c.getBasePT().p <= minPower);
                    } else if (effect.effect === 'parliament_discard') {
                        validTargets = state.player.hand.filter(c => c.id !== effect.sourceId);
                    } else if (effect.effect === 'warband_rallier_counters') {
                        const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                        validTargets = board.filter(c => c.isType('Centaur'));
                    } else if (effect.effect === 'nightfall_raptor_bounce') {
                        const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                        validTargets = board.filter(c => !c.isType('Enchantment'));
                    } else {
                        // Default: friendly board
                        validTargets = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                    }

                    if (validTargets.length > 0) {
                        const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                        state.targetingEffect = effect;
                        applyTargetedEffect(randomTarget.id);
                        continue; // Process next in queue
                    }
                }

                if (effect.isMandatory === true || effect.isMandatory === undefined) {
                    const nonMandatoryEffects = [
                        'nightfall_raptor_bounce', 'cloudline_sovereign_step1', 'permutate_step1', 'parliament_discard',
                        'intli_sacrifice', 'wechuge_sacrifice', 'wilderkin_zealot_trample',
                        'up_in_arms_step1', 'up_in_arms_step2',
                        'executioner_sacrifice_step1', 'executioner_sacrifice_step2',
                        'warrior_ways_step1', 'warrior_ways_step2',
                        'whispers_sacrifice', 'ceremony_step1', 'ceremony_step2',
                        'equip_creature'
                    ];
                    effect.isMandatory = !nonMandatoryEffects.includes(effect.effect) && !effect.isHeroPower;
                }
                state.targetingEffect = effect;
                render();
                return;
            }
        }
        state.targetingEffect = null;
        render();
    }

    function clearTargetingEffect(isSuccess = false) {
        if (state.targetingEffect && state.targetingEffect.needsTraverseBroadcast) {
            const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
            broadcastTraverse(board);
        }

        if (state.targetingEffect && state.targetingEffect.needsETBBroadcast) {
            const instance = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
            if (instance) {
                state.player.board.forEach(c => {
                    if (c.id !== instance.id) c.onOtherCreatureETB(instance, state.player.board);
                });
            }
        }

        // HERO POWER: Herrea (Blue card tracking & Reward) - AFTER resolution
        if (isSuccess && state.targetingEffect && state.targetingEffect.wasCast) {
            // ONLY check Herrea reward if we are NOT about to open another Modal (like discovery)
            // Cards that open a Discovery after targeting will set wasCast on the discovery object instead.
            if (!state.discoveryQueue.length) {
                checkHerreaReward(state.targetingEffect.cardInstance);
            }
        }

        state.targetingEffect = null;
        processTargetingQueue();
    }

    async function applyTargetedEffect(targetId, counterType = null) {
        if (!state.targetingEffect) return;
        
        // Find target in specific pools based on effect
        let target = null;
        if (state.targetingEffect.effect === 'artful_coercion_gain_control' || state.targetingEffect.effect === 'architect_control' || state.targetingEffect.effect === 'hero_power_heping' || state.targetingEffect.effect === 'hero_power_kism') {
            target = state.shop.cards.find(c => c.id === targetId);
        } else if (state.targetingEffect.effect === 'parliament_discard') {
            target = state.player.hand.find(c => c.id === targetId);
        } else {
            // Default: Most effects target the player's board
            const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
            target = board.find(c => c.id === targetId);
        }
        
        if (target) {
            // Track target for end-of-spell triggers
            state.currentSpellTargets.push(target);

            // Finalize Hero Power if applicable (Generic case)
            // Note: hero_power_xylo handles its own cost because it might defer to a nested effect
            if (state.targetingEffect.isHeroPower && state.targetingEffect.owner === 'player' && state.targetingEffect.heroPowerCost > 0 && state.targetingEffect.effect !== 'hero_power_xylo') {
                state.player.gold -= state.targetingEffect.heroPowerCost;
                state.player.usedHeroPower = true;
                // Important: clear the cost so subsequent steps (like Dutiful Camel's second counter) don't charge again
                state.targetingEffect.heroPowerCost = 0;
            }

            if (state.targetingEffect.effect === 'dutiful_camel_counter') {
                const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                addCounters(target, 1, board);
                if (state.targetingEffect.isDouble) {
                    state.targetingEffect.isDouble = false;
                    // Stay in targeting mode
                } else {
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'herd_matron_counters') {
                const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                addCounters(target, 1, board);
                if (state.targetingEffect.step === 1) {
                    state.targetingEffect.step = 2;
                    state.targetingEffect.text = "Choose a creature to get the second +1/+1 counter.";
                    // Stay in targeting mode
                } else {
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'artful_coercion_gain_control') {
                const shopIdx = state.shop.cards.indexOf(target);
                if (shopIdx !== -1) {
                    // Gain control from shop
                    state.shop.cards.splice(shopIdx, 1);
                    target.owner = 'player';
                    if (state.player.board.length < boardLimit) {
                        state.player.board.push(target);
                        // Artful Coercion does NOT trigger ETB
                    } else {
                        // Normally not castable if full, but as safety:
                        state.player.hand.push(target);
                    }

                    // INVIGORATE 2: random choice among your least power
                    const minPower = Math.min(...state.player.board.map(c => c.getDisplayStats(state.player.board).p));
                    const leastPowerCreatures = state.player.board.filter(c => c.getDisplayStats(state.player.board).p === minPower);
                    if (leastPowerCreatures.length > 0) {
                        const randomTarget = leastPowerCreatures[Math.floor(Math.random() * leastPowerCreatures.length)];
                        addCounters(randomTarget, 2, state.player.board);
                    }

                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'intli_sacrifice') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        resolveShopDeaths(idx, target, true);

                        const multiplier = source.isFoil ? 2 : 1;
                        source.tempPower += (2 * multiplier);
                        source.tempToughness += (2 * multiplier);
                        source.pulse(state.player.board);
                        clearTargetingEffect(true);
                    }
                }
            } else if (state.targetingEffect.effect === 'architect_control') {
                const shopIdx = state.shop.cards.findIndex(c => c.id === target.id);
                if (shopIdx !== -1) {
                    state.shop.cards.splice(shopIdx, 1);
                    target.owner = 'player';
                    target.temporarySphinx = true;
                    if (state.player.board.length < boardLimit) {
                        state.player.board.push(target);
                    }
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'erin_humility') {
                target.temporaryHumility = true;
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'hero_power_heping') {
                const isShopCard = state.shop.cards.includes(target);
                if (isShopCard) {
                    addCounters(target, 1, null); // Heping targets shop, so board is null (no triggers)
                    target.isChained = true;
                    target.isJustChained = true;
                    clearTargetingEffect(true);
                    // Clear the animation flag after it plays
                    setTimeout(() => {
                        delete target.isJustChained;
                        render();
                    }, 400);
                }
            } else if (state.targetingEffect.effect === 'hero_power_kism') {
                const isShopCard = state.shop.cards.includes(target);
                if (isShopCard) {
                    if (state.player.board.length < boardLimit) {
                        const clone = target.clone();
                        clone.owner = 'player';
                        state.player.board.push(clone);
                        
                        if (state.targetingEffect.owner === 'player') {
                            state.player.heroPowerActivations++;
                        } else {
                            getOpponent().heroPowerActivations++;
                        }
                    }

                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'pusbag_sacrifice') {
                const idx = state.player.board.indexOf(target);
                if (idx !== -1) {
                    resolveShopDeaths(idx, target, true);
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'harpy_cannibalize') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        state.player.gold -= 1;
                        resolveShopDeaths(idx, target, true);
                        
                        const multiplier = source.isFoil ? 2 : 1;
                        addCounters(source, 2 * multiplier, state.player.board);
                        if (!source.enchantments) source.enchantments = [];
                        source.enchantments.push({ card_name: 'Cannibalize', rules_text: 'Lifelink', isTemporary: true });
                        source.pulse(state.player.board);
                        clearTargetingEffect(true);
                    }
                }
            } else if (state.targetingEffect.effect === 'warband_rallier_counters') {

                if (target.isType('Centaur')) {
                    const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    addCounters(target, 2 * multiplier, board);
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'hero_power_xylo') {
                const board = (state.targetingEffect.owner === 'player') ? state.player.board : getOpponent().board;
                const oldQueueLen = state.targetingQueue.length;
                
                target.onETB(board);
                
                const queuedSomething = state.targetingQueue.length > oldQueueLen;

                if (!queuedSomething) {
                    // It didn't trigger more targeting, so spend the gold now
                    if (state.targetingEffect.owner === 'player' && state.targetingEffect.heroPowerCost > 0) {
                        state.player.gold -= state.targetingEffect.heroPowerCost;
                        state.player.usedHeroPower = true;
                    }
                }
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'hero_power_xiong_mao') {
                const board = (state.targetingEffect.owner === 'player') ? state.player.board : getOpponent().board;
                const idx = board.indexOf(target);
                if (idx !== -1) {
                    const targetTier = target.tier || 1;
                    const nextTier = Math.min(5, targetTier + 1);
                    
                    // Sacrifice
                    resolveShopDeaths(idx, target, true);
                    
                    // Get random creature of tier one higher
                    const pool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && (c.tier || 1) === nextTier && c.shape !== 'token');
                    if (pool.length > 0) {
                        const rewardData = pool[Math.floor(Math.random() * pool.length)];
                        const reward = CardFactory.create(rewardData);
                        if (state.targetingEffect.owner === 'player') {
                            if (state.player.hand.length < handLimit) {
                                state.player.hand.push(reward);
                            }
                            // Charge gold (Hero Power confirmation)
                            if (state.targetingEffect.heroPowerCost > 0) {
                                state.player.gold -= state.targetingEffect.heroPowerCost;
                                state.player.usedHeroPower = true;
                            }
                        } else {
                            // Opponent logic (simplified)
                            const currentOpp = getOpponent();
                            if (currentOpp.hand && currentOpp.hand.length < handLimit) {
                                currentOpp.hand.push(reward);
                            } else {
                                if (currentOpp.board.length < boardLimit) {
                                    currentOpp.board.push(reward);
                                }
                            }
                        }
                    }
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'wilderkin_zealot_trample') {
                if (state.player.gold >= 2) {
                    state.player.gold -= 2;
                    if (!target.enchantments) target.enchantments = [];
                    target.enchantments.push({ card_name: 'Zealot Trample', rules_text: 'Trample', isTemporary: true });
                    target.pulse(state.player.board);
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'whispers_sacrifice') {
                const idx = state.player.board.indexOf(target);
                if (idx !== -1) {
                    resolveShopDeaths(idx, target, true);
                    
                    // EFFECT: Look at 3 creatures at or below tier
                    const creatures = [];
                    // 1. Check queue (nextShopBonusCards)
                    const scried = state.nextShopBonusCards.filter(c => c.type?.toLowerCase().includes('creature') && (c.tier || 1) <= state.player.tier);
                    scried.forEach(c => { if (creatures.length < 3) creatures.push(c); });
                    
                    // 2. Fill from pool
                    const pool = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && (c.tier || 1) <= state.player.tier && c.shape !== 'token');
                    while (creatures.length < 3) {
                        creatures.push(pool[Math.floor(Math.random() * pool.length)]);
                    }

                    queueDiscovery({
                        cards: creatures.map(c => CardFactory.create(c)),
                        title: 'WHISPERS OF THE DEAD',
                        text: 'Choose two creatures to add to your hand.',
                        effect: 'whispers_pick1',
                        remaining: 2,
                        sourceId: state.targetingEffect.sourceId
                    });
                    
                    const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                    if (handIdx !== -1) {
                        const [spell] = state.player.hand.splice(handIdx, 1);
                        state.player.spellGraveyard.push(spell);
                        state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, []));
                    }

                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'nightfall_raptor_bounce') {
                if (!target.type?.toLowerCase().includes('enchantment')) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        state.player.board.splice(idx, 1);
                        // RESET CARD
                        target.counters = 0;
                        target.flyingCounters = 0;
                        target.menaceCounters = 0;
                        target.firstStrikeCounters = 0;
                        target.vigilanceCounters = 0;
                        target.lifelinkCounters = 0;
                        target.shieldCounters = 0;
                        target.tempPower = 0;
                        target.tempToughness = 0;
                        target.damageTaken = 0;
                        target.enchantments = [];
                        
                        if (target.equipment && state.player.hand.length < handLimit) {
                            state.player.hand.push(target.equipment);
                            target.equipment = null;
                        }

                        state.player.hand.push(target);
                        clearTargetingEffect(true);
                    }
                }
            } else if (state.targetingEffect.effect === 'cloudline_sovereign_step1') {
                if (counterType) {
                    // Remove the specific counter
                    if (counterType === 'plus-one') target.counters--;
                    else if (counterType === 'flying') target.flyingCounters--;
                    else if (counterType === 'menace') target.menaceCounters--;
                    else if (counterType === 'first-strike') target.firstStrikeCounters--;
                    else if (counterType === 'vigilance') target.vigilanceCounters--;
                    else if (counterType === 'lifelink') target.lifelinkCounters--;
                    else if (counterType === 'shield') target.shieldCounters--;

                    target.shieldCounters = 1;
                    target.pulse(state.player.board);
                    clearTargetingEffect(true);
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
                    else if (counterType === 'reach') target.reachCounters--;

                    target.pulse(state.player.board);
                    state.targetingEffect.sourceCreatureId = target.id;
                    state.targetingEffect.removedCounterType = counterType;
                    state.targetingEffect.effect = 'permutate_step2';
                    state.targetingEffect.text = "Choose another creature to get two +1/+1 counters.";
                    state.targetingEffect.isMandatory = true;
                    render();
                }
            } else if (state.targetingEffect.effect === 'permutate_step2') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceCreatureId);
                if (source && target.id !== source.id) {
                    // Add two +1/+1 counters to destination
                    const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                    addCounters(target, 2 * multiplier, state.player.board);
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'executioner_sacrifice_step1') {

                const idx = state.player.board.indexOf(target);
                if (idx !== -1) {
                    state.player.board.splice(idx, 1);
                    state.creaturesDiedThisShopPhase = true;
                    state.shopDeathsCount++;

                    // Move to Step 2: Buff Selection
                    state.targetingEffect.effect = 'executioner_buff_step2';
                    state.targetingEffect.text = "Choose a creature to get +5/+3 and gain trample until end of turn.";
                    state.targetingEffect.sacrificedCard = target;
                    state.targetingEffect.sacrificedIndex = idx;
                }
            } else if (state.targetingEffect.effect === 'executioner_buff_step2') {
                // 1. Apply the buff to the target of click 2
                const multiplier = state.targetingEffect.cardInstance.isFoil ? 2 : 1;
                
                const applyMadnessBuff = (t) => {
                    t.tempPower += (5 * multiplier);
                    t.tempToughness += (3 * multiplier);
                    if (!t.enchantments) t.enchantments = [];
                    t.enchantments.push({ card_name: 'Executioner\'s Madness', rules_text: 'Trample', isTemporary: true });
                    t.pulse(state.player.board);
                };

                applyMadnessBuff(target);
                checkAutumnReward(target, state.targetingEffect.cardInstance);
                
                // ADAPTIVE or Ash-Withered Cloak: Copy the spell effect
                const hasCloak = target.equipment && target.equipment.card_name === 'Ash-Withered Cloak';
                if (target.hasKeyword('Adaptive') || hasCloak) {
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
                if (handIdx !== -1) {
                    const [spell] = state.player.hand.splice(handIdx, 1);
                    state.player.spellGraveyard.push(spell);
                    
                    // TRIGGER NONCREATURE CAST
                    const targets = [...state.currentSpellTargets];
                    state.currentSpellTargets = [];
                    state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));
                }

                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'warrior_ways_step1') {
                state.targetingEffect.buffTargetId = target.id;
                checkAutumnReward(target, state.targetingEffect.cardInstance);
                
                // If there are NO Centaurs to target for Step 2, skip it!
                const centaurs = state.player.board.filter(c => c.isType('Centaur'));
                if (centaurs.length === 0) {
                    const isFoilCast = state.targetingEffect.isFoil || (state.targetingEffect.cardInstance && state.targetingEffect.cardInstance.isFoil);
                    const multiplier = isFoilCast ? 2 : 1;

                    // Manually trigger Step 1 buff application here and end
                    const buffTarget = state.player.board.find(c => c.id === state.targetingEffect.buffTargetId);
                    if (buffTarget) {
                        buffTarget.tempPower += (2 * multiplier);
                        buffTarget.tempToughness += (2 * multiplier);
                        const hasCloak = buffTarget.equipment && buffTarget.equipment.card_name === 'Ash-Withered Cloak';
                        if (buffTarget.hasKeyword('Adaptive') || hasCloak) {
                            buffTarget.tempPower += (2 * multiplier);
                            buffTarget.tempToughness += (2 * multiplier);
                        }
                        buffTarget.pulse(state.player.board);
                    }
                    const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                    if (handIdx !== -1) {
                        const [spell] = state.player.hand.splice(handIdx, 1);
                        state.player.spellGraveyard.push(spell);
                        
                        // TRIGGER NONCREATURE CAST
                        const targets = [...state.currentSpellTargets];
                        state.currentSpellTargets = [];
                        state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));
                    }

                    clearTargetingEffect(true);
                } else {
                    state.targetingEffect.effect = 'warrior_ways_step2';
                    state.targetingEffect.text = "Choose a Centaur to get a +1/+1 counter.";
                }
            } else if (state.targetingEffect.effect === 'warrior_ways_step2') {
                const isFoilCast = state.targetingEffect.isFoil || (state.targetingEffect.cardInstance && state.targetingEffect.cardInstance.isFoil);
                const multiplier = isFoilCast ? 2 : 1;
                
                const isOnlyTarget = (state.targetingEffect.buffTargetId === target.id);

                // Step 1: Apply initial buff to the click 1 target
                const buffTarget = state.player.board.find(c => c.id === state.targetingEffect.buffTargetId);
                if (buffTarget) {
                    buffTarget.tempPower += (2 * multiplier);
                    buffTarget.tempToughness += (2 * multiplier);
                    
                    // ADAPTIVE or Ash-Withered Cloak
                    const hasCloak = buffTarget.equipment && buffTarget.equipment.card_name === 'Ash-Withered Cloak';
                    if (isOnlyTarget && (buffTarget.hasKeyword('Adaptive') || hasCloak)) {
                        buffTarget.tempPower += (2 * multiplier);
                        buffTarget.tempToughness += (2 * multiplier);
                    }
                    buffTarget.pulse(state.player.board);
                }

                // Step 2: Apply counter to the click 2 target (Centaur)
                if (target.type?.includes('Centaur')) {
                    addCounters(target, multiplier, state.player.board);
                    checkAutumnReward(target, state.targetingEffect.cardInstance);

                    // ADAPTIVE or Ash-Withered Cloak
                    const hasCloak = target.equipment && target.equipment.card_name === 'Ash-Withered Cloak';
                    if (isOnlyTarget && (target.hasKeyword('Adaptive') || hasCloak)) {
                        addCounters(target, multiplier, state.player.board);
                    }
                }

                // Remove spell from hand
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (handIdx !== -1) {
                    const [spell] = state.player.hand.splice(handIdx, 1);
                    state.player.spellGraveyard.push(spell);
                    
                    // TRIGGER NONCREATURE CAST
                    const targets = [...state.currentSpellTargets];
                    state.currentSpellTargets = [];
                    state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));
                }

                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'ceremony_step1' || state.targetingEffect.effect === 'ceremony_step2') {
                const isStep1 = state.targetingEffect.effect === 'ceremony_step1';
                
                if (!isStep1 && target.id === state.targetingEffect.target1Id) {
                    return; // Invalid second target
                }

                if (isStep1) {
                    state.targetingEffect.target1Id = target.id;
                    checkAutumnReward(target, state.targetingEffect.cardInstance);
                    if (state.player.board.length > 1) {
                        state.targetingEffect.effect = 'ceremony_step2';
                        state.targetingEffect.text = "Choose the second creature to copy.";
                        render();
                        return;
                    }
                }

                // Resolution (Either Step 2, OR Step 1 if only 1 creature)
                const t1 = state.player.board.find(c => c.id === state.targetingEffect.target1Id);
                const t2 = isStep1 ? null : target;
                if (t2) checkAutumnReward(t2, state.targetingEffect.cardInstance);
                const multiplier = state.targetingEffect.cardInstance.isFoil ? 2 : 1;
                const isFoilCast = state.targetingEffect.cardInstance.isFoil;

                // Cleanup spell
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (handIdx !== -1) {
                    const [spell] = state.player.hand.splice(handIdx, 1);
                    state.player.spellGraveyard.push(spell);
                    
                    // TRIGGER NONCREATURE CAST
                    const targets = [...state.currentSpellTargets];
                    state.currentSpellTargets = [];
                    state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));
                }

                const createdTokens = [];
                const createCopy = (src) => {
                    if (state.player.board.length >= boardLimit) return;
                    // Find base data to ensure a "clean" copy (no counters, not foil, etc)
                    const baseData = availableCards.find(c => c.card_name === src.card_name && c.shape !== 'token') || src;
                    const token = CardFactory.create(baseData);
                    token.id = `token-${Date.now()}-${Math.random()}`;
                    token.owner = 'player';
                    token.counters = 0;
                    token.tempPower = 0;
                    token.tempToughness = 0;
                    token.damageTaken = 0;
                    token.enchantments = [];
                    token.isFoil = false;
                    token.equipment = null;
                    state.player.board.push(token);
                    createdTokens.push(token);
                };

                for (let i = 0; i < multiplier; i++) {
                    if (t1) createCopy(t1);
                    if (t2) createCopy(t2);
                }

                createdTokens.forEach(token => {
                    triggerETB(token, state.player.board);
                    state.player.board.forEach(c => {
                        if (c.id !== token.id) c.onOtherCreatureETB(token, state.player.board);
                    });
                });

                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'equip_creature') {
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                if (handIdx !== -1) {
                    const [equipment] = state.player.hand.splice(handIdx, 1);
                    target.equipment = equipment;
                }
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'traverse_cirrusea_grant') {
                if (target.hasKeyword('Flying')) {
                    addCounters(target, 1, state.player.board);
                } else {
                    target.flyingCounters++;
                }
                target.pulse(state.player.board);
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'traverse_onora_grant') {
                const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                addCounters(target, 1 * multiplier, state.player.board);

                // Move to Step 2 for the second counter
                const otherTargets = state.player.board.filter(c => c.id !== target.id);
                if (otherTargets.length > 0) {
                    state.targetingEffect.effect = 'traverse_onora_grant_step2';
                    state.targetingEffect.text = "Choose a second creature to receive a +1/+1 counter.";
                    state.targetingEffect.firstTargetId = target.id;
                    render();
                } else {
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'traverse_onora_grant_step2') {
                const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                addCounters(target, 1 * multiplier, state.player.board);
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'traverse_altabaq_grant') {
                if (!target.enchantments) target.enchantments = [];
                target.enchantments.push({ card_name: 'Al Tabaq Anomaly', rules_text: 'Double strike', isTemporary: true });
                target.pulse(state.player.board);
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'sporegraft_slime_counters') {                const multiplier = state.targetingEffect.isDouble ? 2 : 1;
                addCounters(target, 2 * multiplier, state.player.board);
                clearTargetingEffect(true);
                } else if (state.targetingEffect.effect === 'infuse_spell_resolution') {
                const spell = state.targetingEffect.cardInstance;
                const board = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
                
                spell.onApply(target, board);

                // ADAPTIVE or Ash-Withered Cloak: Copy the spell effect
                const hasCloak = target.equipment && target.equipment.card_name === 'Ash-Withered Cloak';
                const isDoubleable = !['Lagoon Logistics', 'Artful Coercion'].includes(spell.card_name);
                if (isDoubleable && (target.hasKeyword('Adaptive') || hasCloak)) {
                    spell.onApply(target, board);
                }
                clearTargetingEffect(true);
            } else if (state.targetingEffect.effect === 'wechuge_sacrifice') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const idx = state.player.board.indexOf(target);
                    if (idx !== -1) {
                        resolveShopDeaths(idx, target, true);

                        const multiplier = source.isFoil ? 2 : 1;
                        addCounters(source, multiplier, state.player.board);
                        clearTargetingEffect(true);
                    }
                }
            } else if (state.targetingEffect.effect === 'ndengo_target') {
                const source = state.player.board.find(c => c.id === state.targetingEffect.sourceId);
                if (source && target.id !== source.id) {
                    const options = [
                        { card_name: 'Choice A', rules_text: 'FS on Ndengo, TR on Target', type: 'Counter' },
                        { card_name: 'Choice B', rules_text: 'TR on Ndengo, FS on Target', type: 'Counter' }
                    ];
                    queueDiscovery({
                        cards: options.map(o => CardFactory.create(o)),
                        isKeywordChoice: true,
                        title: 'NDENGO BRUTALIZER',
                        text: 'Choose which keyword to teach to each creature.',
                        effect: 'ndengo_choice',
                        sourceId: source.id,
                        targetId: target.id
                    });
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'parliament_discard') {
                const owner = state.targetingEffect.owner || 'player';
                const entity = getEntity(owner);
                if (!entity) return;

                const cardIdx = entity.hand.findIndex(c => c.id === targetId);
                if (cardIdx !== -1) {
                    entity.hand.splice(cardIdx, 1);
                    // Trigger Discovery from Graveyard
                    queueDiscovery({
                        cards: entity.spellGraveyard.map(s => CardFactory.create(s)),
                        title: 'SHREWD PARLIAMENT',
                        text: 'Choose a noncreature card in your graveyard.',
                        graveyard: true,
                        wasCast: true,
                        cardInstance: state.targetingEffect.cardInstance,
                        owner: owner
                    });
                    clearTargetingEffect(true);
                }
            } else if (state.targetingEffect.effect === 'up_in_arms_step1') {
                state.targetingEffect.target1Id = target.id;
                state.targetingEffect.effect = 'up_in_arms_step2';
                state.targetingEffect.text = "Choose a creature to get the second +1/+1 counter.";
                checkAutumnReward(target, state.targetingEffect.cardInstance);
            } else if (state.targetingEffect.effect === 'up_in_arms_step2') {
                const t1 = state.player.board.find(c => c.id === state.targetingEffect.target1Id);
                const t2 = target;
                const multiplier = state.targetingEffect.isFoil ? 2 : 1;
                const isFoilCast = state.targetingEffect.isFoil;

                if (t1 && t2) {
                    const hasCloak = t1.equipment && t1.equipment.card_name === 'Ash-Withered Cloak';
                    if (t1.id === t2.id && (t1.hasKeyword('Adaptive') || hasCloak)) {
                        addCounters(t1, 4 * multiplier, state.player.board);
                    } else {
                        addCounters(t1, 1 * multiplier, state.player.board);
                        addCounters(t2, 1 * multiplier, state.player.board);
                    }
                }

                checkAutumnReward(t2, state.targetingEffect.cardInstance);

                // Remove spell from hand
                const handIdx = state.player.hand.findIndex(c => c.id === state.targetingEffect.sourceId);
                let spell = state.targetingEffect.cardInstance;
                if (handIdx !== -1) {
                    [spell] = state.player.hand.splice(handIdx, 1);
                    state.player.spellGraveyard.push(spell);
                }

                // TRIGGER NONCREATURE CAST ONLY ONCE AT END
                const targets = [...state.currentSpellTargets];
                state.currentSpellTargets = [];
                state.player.board.forEach(c => c.onNoncreatureCast(spell, state.player.board, targets));

                clearTargetingEffect(true);
            }
        }

        render();
        await resolveAnimations();
        render();
    }

    function resolveShopDeaths(idx, target, isSacrifice = false) {
        state.creaturesDiedThisShopPhase = true;
        state.shopDeathsCount++;

        if (isSacrifice && state.player.hero.name === 'Dawson') {
            if (state.phase === 'SHOP') {
                state.player.gold++;
            }
        }

        if (target.card_name === 'Servants of Dydren') {
            const entity = getEntity('player');
            if (entity) entity.deadServantsCount++;
        }

        state.player.board.splice(idx, 1);
        if (target.equipment && state.player.hand.length < handLimit) {
            state.player.hand.push(target.equipment);
        }

        // 1. Trigger survivor deaths
        state.player.board.forEach(c => {
            c.onOtherCreatureDeath(target, state.player.board);
            if (isSacrifice) c.onOtherPermanentSacrificed(target, state.player.board);
        });
        // 2. Trigger onDeath
        const spawns = target.onDeath(state.player.board, 'player');
        if (spawns.length > 0) {
            state.player.board.splice(idx, 0, ...spawns);
            // Broadcast ETB for all spawns
            spawns.forEach(s => {
                triggerETB(s, state.player.board);
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
        // UNBLOCKABLE CHECK
        let counterTypes = 0;
        if (attacker.counters > 0) counterTypes++;
        if (attacker.flyingCounters > 0) counterTypes++;
        if (attacker.menaceCounters > 0) counterTypes++;
        if (attacker.firstStrikeCounters > 0) counterTypes++;
        if (attacker.vigilanceCounters > 0) counterTypes++;
        if (attacker.lifelinkCounters > 0) counterTypes++;
        if (attacker.shieldCounters > 0) counterTypes++;

        const isUnblockable = (attacker.card_name === 'Mekini Eremite' && !attacker.temporaryHumility && counterTypes >= 2);
        if (isUnblockable) return null; // Goes straight to face

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

            // SHIELD COUNTER PROTECTION (Defender)
            if (defender.shieldCounters > 0 && defenderDamageTaken > 0) {
                defenderDamageTaken = 0;
                defender.shieldCounters--;
                // Note: trample overflow still happens based on original toughness
            } else if (defender.hasKeyword('Indestructible') && !defender.indestructibleUsed) {
                // INDESTRUCTIBLE PROTECTION (Defender)
                // Trigger if damage is lethal OR if attacker has Deathtouch and deals any damage
                if (defenderDamageTaken >= defenderStats.t || (attacker.hasKeyword('Deathtouch') && defenderDamageTaken > 0)) {
                    defenderDamageTaken = Math.max(0, defenderStats.t - 1);
                    defender.indestructibleUsed = true;
                }
            }

            defender.damageTaken += defenderDamageTaken;

            // DEATHTOUCH (Attacker)
            if (attacker.hasKeyword('Deathtouch') && defenderDamageTaken > 0) {
                if (!defender.isDestroyed && !defender.hasKeyword('Indestructible')) {
                    defender.isDestroyed = true;
                    showDestroyBubble(defender);
                }
            }

            // TRIUMPHANT TACTICS TRIGGER (Permanent +1/+1 on damage)
            if (attacker.enchantments?.some(e => e.card_name === 'Triumphant Tactics') && defenderDamageTaken > 0) {
                const attackerBoard = (attacker.owner === 'player') ? state.battleBoards.player : state.battleBoards.opponent;
                addCounters(attacker, 1, attackerBoard);
            }

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
                    // Check for shield on splash target
                    if (trampleTarget.shieldCounters > 0) {
                        trampleTarget.shieldCounters--;
                        trampleOverflow = 0; // Shield absorbs all splash
                    } else if (trampleTarget.hasKeyword('Indestructible') && !trampleTarget.indestructibleUsed) {
                        // INDESTRUCTIBLE PROTECTION (Splash Target)
                        const targetStats = trampleTarget.getDisplayStats(defenderBoard);
                        if (overflow >= targetStats.t || (attacker.hasKeyword('Deathtouch') && overflow > 0)) {
                            trampleTarget.damageTaken += Math.max(0, targetStats.t - 1);
                            trampleTarget.indestructibleUsed = true;
                        } else {
                            trampleTarget.damageTaken += overflow;
                        }
                    } else {
                        trampleTarget.damageTaken += overflow;
                        // DEATHTOUCH (Splash Target)
                        if (attacker.hasKeyword('Deathtouch') && overflow > 0) {
                            if (!trampleTarget.isDestroyed) {
                                trampleTarget.isDestroyed = true;
                                showDestroyBubble(trampleTarget);
                            }
                        }
                    }
                } else {
                    if (attacker.owner === 'player') {
                        if (currentOppAttack) currentOppAttack.fightHp -= overflow;
                        // TRIUMPHANT TACTICS TRIGGER
                        if (attacker.enchantments?.some(e => e.card_name === 'Triumphant Tactics') && overflow > 0) {
                            addCounters(attacker, 1, state.battleBoards.player);
                        }
                    } else state.player.fightHp -= overflow;
                }
            }

            // RETALIATION LOGIC
            const defStatsNow = defender.getDisplayStats(defenderBoard);
            const isDead = defender.isDestroyed || defStatsNow.t <= 0;

            let shouldRetaliate = false;
            if (!isFirstStrike) {
                shouldRetaliate = true; // Normal combat: simultaneous
            } else {
                // This is a "Fast" hit. 
                const attackerHasDS = attacker.hasKeyword('Double strike');
                
                if (attackerHasDS) {
                    // Double Strike first hit: Defender NEVER hits back in this specific step.
                    shouldRetaliate = false;
                } else {
                    // Normal First Strike keyword: Defender hits back IF they survived.
                    if (!isDead) {
                        shouldRetaliate = true;
                    }
                }
            }

            if (shouldRetaliate) {
                attackerDamageTaken = defStatsNow.p;

                // DEATHTOUCH (Defender Retaliation)
                if (defender.hasKeyword('Deathtouch') && attackerDamageTaken > 0) {
                    if (!attacker.isDestroyed && !attacker.hasKeyword('Indestructible')) {
                        attacker.isDestroyed = true;
                        showDestroyBubble(attacker);
                    }
                }

                // SHIELD COUNTER PROTECTION (Attacker)
                if (attacker.shieldCounters > 0 && attackerDamageTaken > 0) {
                    attackerDamageTaken = 0;
                    attacker.shieldCounters--;
                } else if (attacker.hasKeyword('Indestructible') && !attacker.indestructibleUsed) {
                    // INDESTRUCTIBLE PROTECTION (Attacker)
                    const attackerStats = attacker.getDisplayStats(attackerBoard);
                    // Trigger if damage is lethal OR if defender has Deathtouch and deals any damage
                    if (attackerDamageTaken >= attackerStats.t || (defender.hasKeyword('Deathtouch') && attackerDamageTaken > 0)) {
                        attackerDamageTaken = Math.max(0, attackerStats.t - 1);
                        attacker.indestructibleUsed = true;
                    }
                }

                // STEEL BARDING: Prevent all damage to attacker
                if (attacker.equipment && attacker.equipment.card_name === 'Steel Barding') {
                    attackerDamageTaken = 0;
                }

                attacker.damageTaken += attackerDamageTaken;
            }
        } else {
             const amount = damageDealt;
             if (attacker.owner === 'player') {
                if (currentOppAttack) currentOppAttack.fightHp -= amount;
                // TRIUMPHANT TACTICS TRIGGER
                if (attacker.enchantments?.some(e => e.card_name === 'Triumphant Tactics') && amount > 0) {
                    addCounters(attacker, 1, state.battleBoards.player);
                }
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

        // 1. Identify everyone who would die (Lethal damage OR Marked as Destroyed)
        const deadPlayerCards = state.battleBoards.player.filter(c => {
            if (c.isDying) return false;
            if (c.isDestroyed && c.shieldCounters > 0) return false; 
            return (c.getDisplayStats(state.battleBoards.player).t <= 0 && !isProtected(c, state.battleBoards.player)) || c.isDestroyed;
        });
        const deadOpponentCards = state.battleBoards.opponent.filter(c => {
            if (c.isDying) return false;
            if (c.isDestroyed && c.shieldCounters > 0) return false;
            return (c.getDisplayStats(state.battleBoards.opponent).t <= 0 && !isProtected(c, state.battleBoards.opponent)) || c.isDestroyed;
        });

        // 2. Handle Saves (Indestructible from damage, and Shields from isDestroyed)
        const savedPlayer = state.battleBoards.player.filter(c => 
            (c.getDisplayStats(state.battleBoards.player).t <= 0 && isProtected(c, state.battleBoards.player) && !c.isDestroyed) || 
            (c.isDestroyed && c.shieldCounters > 0)
        );
        const savedOpponent = state.battleBoards.opponent.filter(c => 
            (c.getDisplayStats(state.battleBoards.opponent).t <= 0 && isProtected(c, state.battleBoards.opponent) && !c.isDestroyed) || 
            (c.isDestroyed && c.shieldCounters > 0)
        );
        
        [...savedPlayer, ...savedOpponent].forEach(c => {
            if (c.isDestroyed && c.shieldCounters > 0) {
                c.shieldCounters--;
                c.isDestroyed = false;
            } else {
                c.indestructibleUsed = true;
                const board = savedPlayer.includes(c) ? state.battleBoards.player : state.battleBoards.opponent;
                const stats = c.getDisplayStats(board);
                const currentT = stats.t + c.damageTaken;
                c.damageTaken = currentT - 1;
            }
        });

        if (deadPlayerCards.length === 0 && deadOpponentCards.length === 0) {
            if (savedPlayer.length > 0 || savedOpponent.length > 0) render();
            return false;
        }

        // 3. Mark for death and play animation
        const allDead = deadPlayerCards.concat(deadOpponentCards);
        allDead.forEach(c => {
            const el = document.getElementById(`card-${c.id}`);
            c.isDying = true;
            if (el && !el.classList.contains('dying')) {
                if (c.isDestroyed) showDestroyBubble(c);
                el.classList.add('dying');
            }
        });
        
        await new Promise(r => setTimeout(r, 600)); 

        // 4. Actually remove them and trigger death effects
        const pSpawns = await processDeaths(state.battleBoards.player, 'player');
        const oSpawns = await processDeaths(state.battleBoards.opponent, 'opponent');
        const allNewSpawns = [...pSpawns, ...oSpawns];

        render();

        if (allNewSpawns.length > 0 && typeof document !== 'undefined') {
            await new Promise(r => setTimeout(r, 600)); // Wait for spawn animations
            
            // Protect upcoming spawn attackers from FLIP disruption
            const nextSpawnAttacker = allNewSpawns.find(s => s.isTrenchrunnerSpawn);
            if (nextSpawnAttacker) {
                state.activeAttackerId = nextSpawnAttacker.id;
            }

            allNewSpawns.forEach(s => delete s.isSpawning);
            render(); // Final cleanup render
        }

        // 5. Special Case: Trenchrunner spawns need to attack immediately
        if (state.phase === 'BATTLE') {
            const allBoardCards = state.battleBoards.player.concat(state.battleBoards.opponent);
            for (const spawn of allBoardCards) {
                if (spawn.isTrenchrunnerSpawn) {
                    delete spawn.isTrenchrunnerSpawn;
                    const defenderBoard = (spawn.owner === 'player') ? state.battleBoards.opponent : state.battleBoards.player;
                    const target = findTarget(spawn, defenderBoard);
                    
                    // Settle time for browser layout before the dash starts
                    if (typeof document !== 'undefined') {
                        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                    }

                    await performAttack(spawn, target, false);
                    await resolveDeaths(); 
                    break;
                }
            }
        }
        await new Promise(r => setTimeout(r, 200));

        // 6. Recurse if processDeaths created NEW dead creatures (e.g. Hog debuff or sacrifice)
        const anyDeadStill = state.battleBoards.player.some(c => {
            if (c.isDestroyed && c.shieldCounters > 0) return false;
            return (c.getDisplayStats(state.battleBoards.player).t <= 0 && !isProtected(c, state.battleBoards.player)) || c.isDestroyed;
        }) || state.battleBoards.opponent.some(c => {
            if (c.isDestroyed && c.shieldCounters > 0) return false;
            return (c.getDisplayStats(state.battleBoards.opponent).t <= 0 && !isProtected(c, state.battleBoards.opponent)) || c.isDestroyed;
        });
        
        if (anyDeadStill) {
            await resolveDeaths();
        }
        
        await resolveAnimations();
        return true;
    }

    async function processDeaths(board, owner) {
        // Only process creatures that were marked as dying in the previous step
        const dyingCards = board.filter(c => c.isDying);
        const newSpawns = [];
        
        // Broadcast to everyone in battle, or just this board if in shop
        const notifyPool = (state.phase === 'BATTLE' && state.battleBoards) ? 
                           state.battleBoards.player.concat(state.battleBoards.opponent) : 
                           board;

        for (const deadCard of dyingCards) {
            const idx = board.indexOf(deadCard);
            if (idx === -1) continue;

            if (deadCard.card_name === 'Servants of Dydren') {
                const entity = getEntity(owner);
                if (entity) entity.deadServantsCount++;
            }

            let spawns = await deadCard.onDeath(board, owner);
            
            for (const c of notifyPool) {
                if (c.id !== deadCard.id) {
                    await c.onOtherCreatureDeath(deadCard, board);
                }
            }
            if (spawns.length > 0) {
                // Limit spawns based on boardLimit
                const availableSpace = boardLimit - (board.length - 1);
                const validSpawns = spawns.filter(Boolean).slice(0, Math.max(0, availableSpace));
                board.splice(idx, 1, ...validSpawns);

                // Add to combat queue if in battle
                if (state.phase === 'BATTLE' && state.battleQueues) {
                    const queue = state.battleQueues[owner];
                    const qIdx = queue.indexOf(deadCard);
                    
                    if (qIdx !== -1) {
                        // Replace the dead card exactly at its position
                        // First remove them from the back if createToken auto-pushed them
                        validSpawns.forEach(s => {
                            const backIdx = queue.indexOf(s);
                            if (backIdx !== -1 && backIdx !== qIdx) queue.splice(backIdx, 1);
                        });
                        queue.splice(qIdx, 1, ...validSpawns);
                    } else {
                        // Parent already attacked (shifted out), put spawns at the front 
                        // so they are the next creatures to attack for this side.
                        const toUnshift = [];
                        validSpawns.forEach(s => {
                            const backIdx = queue.indexOf(s);
                            if (backIdx !== -1) queue.splice(backIdx, 1);
                            toUnshift.push(s);
                        });
                        queue.unshift(...toUnshift);
                    }
                }

                // Trigger ETB for new spawns and broadcast to others
                validSpawns.forEach(s => {
                    triggerETB(s, board);
                    notifyPool.forEach(c => {
                        if (c.id !== s.id) c.onOtherCreatureETB(s, board);
                    });
                });
                
                if (state.phase === 'BATTLE') {
                    validSpawns.forEach(s => s.isSpawning = true);
                    newSpawns.push(...validSpawns);
                }
            } else board.splice(idx, 1);
            
            // Remove from combat queue if in battle
            if (state.phase === 'BATTLE' && state.battleQueues) {
                state.battleQueues[owner] = state.battleQueues[owner].filter(c => c.id !== deadCard.id);
            }

            // Cleanup property
            delete deadCard.isDying;
        }
        return newSpawns;
    }

    async function applySpell(targetId) {
        if (!state.castingSpell) return;
        state.currentSpellTargets = [];
        const target = state.player.board.find(c => c.id === targetId) || 
                       state.player.hand.find(c => c.id === targetId) ||
                       state.shop.cards.find(c => c.id === targetId);
        if (!target) return;

        // Safety check for Lagoon Logistics
        if (state.castingSpell.card_name === 'Lagoon Logistics') {
            if (!target.isType('Creature') || target.id === state.castingSpell.id) {
                return;
            }
        }
        
        // Artful Coercion safety: Board must have space
        if ((state.castingSpell.card_name === 'Artful Coercion' || state.castingSpell.card_name === 'Touch of the Omen') && state.player.board.length >= boardLimit) {
            return;
        }
        // Track target for end-of-spell triggers
        state.currentSpellTargets.push(target);

        state.castingSpell.onApply(target, state.player.board);
        checkAutumnReward(target, state.castingSpell);
        
        // ADAPTIVE or Ash-Withered Cloak: Copy the spell effect (Exclude certain utility spells)
        const hasCloak = target.equipment && target.equipment.card_name === 'Ash-Withered Cloak';
        const isDoubleable = !['Lagoon Logistics', 'Artful Coercion'].includes(state.castingSpell.card_name);
        if (isDoubleable && (target.hasKeyword('Adaptive') || hasCloak)) {
            state.castingSpell.onApply(target, state.player.board);
        }
        
        state.player.hand.splice(state.player.hand.findIndex(c => c.id === state.castingSpell.id), 1);
        const isFoil = state.castingSpell.isFoil;
        state.player.spellGraveyard.push(state.castingSpell);

        // HERO POWER: Herrea (Blue card tracking & Reward)
        checkHerreaReward(state.castingSpell);

        const currentSpell = state.castingSpell;
        const targets = [...state.currentSpellTargets];
        state.castingSpell = null;
        state.currentSpellTargets = [];
        state.player.board.forEach(c => c.onNoncreatureCast(currentSpell, state.player.board, targets));
        render();
        if (!state.targetingEffect && !state.discovery && state.discoveryQueue.length === 0) {
            await resolveAnimations();
        }
    }
    
    function rerollShop() {
        if (state.player.gold < 1) return;
        state.player.gold--;

        if (state.player.hero.name === "Enoch") {
            state.player.rerollCount++;
            if (state.player.rerollCount % 4 === 0) {
                populateSpecialShop();
            } else {
                populateShop();
            }
        } else {
            populateShop();
        }
        render();
    }

    function opponentPlayTurn(opp) {
        if (!opp) opp = getOpponent();
        if (!opp) return;

        state.isAITurn = true;
        try {
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
                let cost = 3;
                if (cardToBuy.type?.toLowerCase().includes('equipment')) {
                    cost = 5;
                } else if (!cardToBuy.type?.toLowerCase().includes('creature')) {
                    cost = cardToBuy.tier || 1;
                }
                
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
                    } else if (cardToBuy.type?.toLowerCase().includes('equipment')) {
                        const target = [...opp.board].sort((a, b) => b.getDisplayStats(opp.board).p - a.getDisplayStats(opp.board).p)[0];
                        if (target) {
                            if (target.equipment) virtualShop.push(target.equipment); // AI tosses old equipment back
                            target.equipment = cardToBuy;
                            opp.gold -= cost;
                        } else break;
                    } else {
                        // Spell logic for AI: apply to best target
                        const target = [...opp.board].sort((a, b) => b.getDisplayStats(opp.board).p - a.getDisplayStats(opp.board).p)[0];
                        if (target || ['Divination', 'Scientific Inquiry'].includes(cardToBuy.card_name)) {
                            cardToBuy.onApply(target, opp.board);
                            
                            // AI-specific noncreature cast effects using OO hook
                            opp.board.forEach(c => c.onNoncreatureCast(false, opp.board, []));

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
        } finally {
            state.isAITurn = false;
        }
    }

    function scoreCardForAI(card, board) {
        const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
        let score = 0;
        const isCreature = instance.type?.toLowerCase().includes('creature');
        
        if (isCreature) {
            const stats = instance.getDisplayStats(board);
            score += (stats.p + stats.t) / 2;
            
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

    function addScry(count, callback = null, title = null, text = null) {
        const creatures = availableCards.filter(c => c.type?.toLowerCase().includes('creature') && c.shape !== 'token' && (c.tier || 1) <= state.player.tier);
        const newCards = [];
        for (let i = 0; i < count; i++) {
            newCards.push(creatures[Math.floor(Math.random() * creatures.length)]);
        }

        if (state.scrying) {
            state.scrying.count += count;
            state.scrying.cards.push(...newCards);
            if (title) state.scrying.title = title;
            if (text) state.scrying.text = text;
            // Chain callbacks if needed, though Foresee is the primary user
            const oldCallback = state.scrying.postScry;
            state.scrying.postScry = () => { if (oldCallback) oldCallback(); if (callback) callback(); };
        } else {
            state.scrying = {
                count: count,
                cards: newCards,
                choices: [],
                postScry: callback,
                title: title,
                text: text
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

    function renderHeroPower(container, entity, isPlayer) {
        if (!container) return;
        const isHovered = container.querySelector('.hero-power-circle')?.matches(':hover');
        container.innerHTML = '';
        if (!entity.hero || !entity.hero.heroPower) return;

        const hp = entity.hero.heroPower;
        const circle = document.createElement('div');
        circle.className = 'hero-power-circle';
        
        if (entity.usedHeroPower) circle.classList.add('used');
        if (hp.isPassive) circle.classList.add('passive');
        if (!isPlayer) circle.classList.add('opponent-hp-circle');
        if (state.phase === 'BATTLE') circle.classList.add('in-battle');

        const clipper = document.createElement('div');
        clipper.className = 'hero-power-icon-clipper';

        const icon = document.createElement('img');
        icon.className = 'hero-power-icon';
        icon.src = hp.icon;
        
        clipper.appendChild(icon);
        circle.appendChild(clipper);

        // CUSTOM TOOLTIP
        const tooltip = document.createElement('div');
        tooltip.className = 'hero-power-tooltip';
        if (isHovered) tooltip.style.animation = 'none';
        
        const tooltipName = document.createElement('div');
        tooltipName.className = 'hero-power-tooltip-name';
        tooltipName.textContent = hp.name;
        
        const tooltipText = document.createElement('div');
        tooltipText.className = 'hero-power-tooltip-text';
        tooltipText.innerHTML = hp.text; // InnerHTML to support potential formatting like [i] or line breaks
        
        tooltip.appendChild(tooltipName);
        tooltip.appendChild(tooltipText);
        circle.appendChild(tooltip);

        // Show gem if passive, OR if Arietta hasn't leveled up yet (locked indicator)
        const isAriettaLocked = entity.hero.name === "Arietta" && entity.tier < 4;
        const isAdelaideLocked = entity.hero.name === "Adelaide" && entity.spellsBoughtThisGame < 4;
        const isHerreaLocked = entity.hero.name === "Herrea" && entity.blueCardsPlayed < 7;
        const isEnochLocked = entity.hero.name === "Enoch" && (entity.rerollCount % 4 !== 3);
        const isAutumnLocked = entity.hero.name === "Autumn"; // Always show gem/count for Autumn as it repeats
        
        const isKismFinished = entity.hero.name === "Kism" && (entity.heroPowerActivations || 0) >= 3;
        
        if ((hp.isPassive || isAriettaLocked || isAdelaideLocked || isHerreaLocked || isEnochLocked || isAutumnLocked) && !entity.usedHeroPower) {
            const gem = document.createElement('div');
            gem.className = 'hero-power-passive-gem';
            
            if (entity.hero.name === "Herrea") {
                const count = document.createElement('div');
                count.className = 'hero-power-passive-gem-count';
                count.textContent = Math.max(0, 7 - entity.blueCardsPlayed);
                gem.appendChild(count);
            }

            if (entity.hero.name === "Adelaide") {
                const count = document.createElement('div');
                count.className = 'hero-power-passive-gem-count';
                count.textContent = Math.max(0, 4 - entity.spellsBoughtThisGame);
                gem.appendChild(count);
            }

            if (entity.hero.name === "Enoch") {
                const count = document.createElement('div');
                count.className = 'hero-power-passive-gem-count';
                // Show 4, 3, 2, 1 rerolls remaining (using % 4 logic)
                const remaining = 4 - (entity.rerollCount % 4);
                count.textContent = remaining;
                gem.appendChild(count);
            }

            if (entity.hero.name === "Autumn") {
                const count = document.createElement('div');
                count.className = 'hero-power-passive-gem-count';
                const remaining = 3 - (entity.autumnSpellCount % 3);
                count.textContent = remaining;
                gem.appendChild(count);
            }
            
            circle.appendChild(gem);
        } else if (!entity.usedHeroPower && !isKismFinished) {
            const cost = document.createElement('div');
            cost.className = 'hero-power-cost';
            cost.textContent = hp.cost;
            circle.appendChild(cost);

            if (entity.hero.name === "Kism") {
                const gem = document.createElement('div');
                gem.className = 'hero-power-passive-gem';
                const count = document.createElement('div');
                count.className = 'hero-power-passive-gem-count';
                count.textContent = 3 - (entity.heroPowerActivations || 0);
                gem.appendChild(count);
                circle.appendChild(gem);
            }
        }

        if (isPlayer && !entity.usedHeroPower && !hp.isPassive && state.phase === 'SHOP' && entity.gold >= hp.cost && !state.castingSpell && !state.targetingEffect) {
            circle.addEventListener('click', async () => await activateHeroPower());
        }

        container.appendChild(circle);
    }

    function renderBoard(container, cards, isShop = false, boardContext = [], skipIndicators = false) {
        if (!container) return;

        // 1. Capture "First" positions
        const firstPositions = new Map();
        if (container.children) {
            Array.from(container.children).forEach(child => {
                firstPositions.set(child.id, child.getBoundingClientRect());
            });
        }

        // 2. Reconciliation
        const existingMap = new Map();
        if (container.children) {
            Array.from(container.children).forEach(child => existingMap.set(child.id, child));
        }

        const instanceList = [];
        cards.forEach((card, index) => {
            const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
            if (!instance) return;
            instanceList.push(instance);
            const id = `card-${instance.id}`;
            let oldEl = existingMap.get(id);
            let newEl;

            const isBusy = (oldEl && (state.activeAttackerId === instance.id || instance.isSpawning || instance.isDying || instance.isPulsing));

            if (isBusy) {
                // Manually update busy cards to preserve their active animations
                const isHovered = oldEl.matches(':hover');
                const stats = instance.getDisplayStats(boardContext, true);
                const pEl = oldEl.querySelector('.card-p');
                const tEl = oldEl.querySelector('.card-t');
                if (pEl) pEl.textContent = stats.p;
                if (tEl) {
                    tEl.textContent = stats.t;
                    if (stats.t < stats.maxT) tEl.classList.add('damaged');
                    else tEl.classList.remove('damaged');
                }
                
                // NEW: Sync counter bubbles and equipment even when busy - Use Dummy with VISUAL state
                const counterStackEl = oldEl.querySelector('.card-counter-stack');
                if (counterStackEl) {
                    // Create dummy specifically to steal visual state indicators
                    const dummy = createCardElement(instance, isShop, index, boardContext);
                    const freshStack = dummy.querySelector('.card-counter-stack');
                    
                    if (counterStackEl.innerHTML !== freshStack.innerHTML) {
                        counterStackEl.innerHTML = freshStack.innerHTML;
                        if (isHovered) {
                            const tooltips = counterStackEl.querySelectorAll('.keyword-tooltip, .hero-power-tooltip');
                            tooltips.forEach(t => t.style.animation = 'none');
                        }
                    }

                    // Also sync equipment indicator
                    const oldEq = oldEl.querySelector('.equipment-indicator');
                    const newEq = dummy.querySelector('.equipment-indicator');
                    if (oldEq) oldEq.remove();
                    if (newEq) {
                        if (isHovered) {
                            const tooltips = newEq.querySelectorAll('.keyword-tooltip, .hero-power-tooltip');
                            tooltips.forEach(t => t.style.animation = 'none');
                        }
                        oldEl.appendChild(newEq);
                    }

                    // Sync ghost indicators
                    const oldGhost = oldEl.querySelector('.ghost-indicator-container');
                    const newGhost = dummy.querySelector('.ghost-indicator-container');
                    if (oldGhost) oldGhost.remove();
                    if (newGhost) {
                        if (isHovered) {
                            const tooltips = newGhost.querySelectorAll('.keyword-tooltip, .hero-power-tooltip');
                            tooltips.forEach(t => t.style.animation = 'none');
                        }
                        oldEl.appendChild(newGhost);
                    }

                    // Sync chain indicator
                    const oldChain = oldEl.querySelector('.chain-indicator');
                    const newChain = dummy.querySelector('.chain-indicator');
                    if (oldChain) oldChain.remove();
                    if (newChain) oldEl.appendChild(newChain);
                }

                // Sync classes even when busy
                if (instance.isSpawning) oldEl.classList.add('spawning');
                else oldEl.classList.remove('spawning');
                if (instance.isDying) oldEl.classList.add('dying');
                else oldEl.classList.remove('dying');
                if (instance.isChained) oldEl.classList.add('chained-card');
                else oldEl.classList.remove('chained-card');

                // ALWAYS update targeting and lock classes based on current creation logic
                const dummyCheck = createCardElement(instance, isShop, index, boardContext);
                const classesToSync = ['targetable', 'locked-shop-card', 'already-locked', 'unfreezing-shop-card', 'grayed-out', 'actionable-outline'];
                classesToSync.forEach(cls => {
                    if (dummyCheck.classList.contains(cls)) oldEl.classList.add(cls);
                    else oldEl.classList.remove(cls);
                });

                // Sync click and drag listeners even when busy to allow rapid-fire actions and targeting
                oldEl.onclick = dummyCheck.onclick;
                oldEl.draggable = dummyCheck.draggable;
                oldEl.ondragstart = dummyCheck.ondragstart;
                oldEl.ondragover = dummyCheck.ondragover;
                oldEl.ondrop = dummyCheck.ondrop;

                // Also sync the lock indicator element itself if it changed
                const oldLock = oldEl.querySelector('.card-lock-indicator');
                const newLock = dummyCheck.querySelector('.card-lock-indicator');
                if (oldLock && !newLock) oldLock.remove();
                if (!oldLock && newLock) oldEl.appendChild(newLock);

                newEl = oldEl;
            } else {
                // For everyone else, replace the node so we get fresh targeting listeners
                const isHovered = oldEl && oldEl.matches(':hover');
                newEl = createCardElement(instance, isShop, index, boardContext, skipIndicators);
                if (isHovered) {
                    const tooltips = newEl.querySelectorAll('.keyword-tooltip, .hero-power-tooltip');
                    tooltips.forEach(t => t.style.animation = 'none');
                }
                if (instance.isSpawning) newEl.classList.add('spawning');
                if (oldEl) oldEl.replaceWith(newEl);
            }

            if (container.children && container.children[index] !== newEl) {
                container.insertBefore(newEl, container.children[index]);
            }
        });

        // Remove old nodes
        const cardIds = instanceList.map(c => `card-${c.id}`);
        if (container.children) {
            Array.from(container.children).forEach(child => {
                if (!cardIds.includes(child.id)) child.remove();
            });
        }

        // 3. FLIP "Invert" (Synchronous to avoid snap)
        if (state.phase === 'BATTLE') {
            const invertedElements = [];
            instanceList.forEach(instance => {
                const id = `card-${instance.id}`;
                const el = document.getElementById(id);
                const firstRect = firstPositions.get(id);
                if (!el || !firstRect) return;

                const lastRect = el.getBoundingClientRect();
                const deltaX = firstRect.left - lastRect.left;
                const deltaY = firstRect.top - lastRect.top;

                if (deltaX !== 0 || deltaY !== 0) {
                    const isAttacker = (state.activeAttackerId === instance.id);
                    const originalTransform = el.style.transform;
                    const originalTransition = el.style.transition;
                    
                    el.style.transition = 'none';
                    if (isAttacker) {
                        // For the attacker, combine layout shift with its current visual state (lift/scale)
                        const style = window.getComputedStyle(el);
                        const matrix = style.transform === 'none' ? '' : style.transform;
                        el.style.transform = `translate(${deltaX}px, ${deltaY}px) ${matrix}`;
                    } else {
                        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                    }
                    invertedElements.push({ el, originalTransform, originalTransition, instance, deltaX, deltaY });
                }
            });

            // 4. FLIP "Play" (Next frame)
            if (invertedElements.length > 0) {
                // Force a reflow
                container.offsetHeight; 
                
                requestAnimationFrame(() => {
                    invertedElements.forEach(({ el, originalTransform, originalTransition, instance }) => {
                        // If someone else (like performAttack) has already started a new transition 
                        // on the attacker, do NOT clobber it with the old layout state.
                        if (state.activeAttackerId === instance.id && el.style.transition !== 'none' && el.style.transition !== '') {
                            return;
                        }

                        el.style.transition = originalTransition; 
                        el.style.transform = originalTransform;
                    });
                });
            }
        }
    }

    function render() {
        // SYNC VISUAL STATE FOR ALL CARDS NOT PULSING
        const allCards = [
            ...state.player.hand,
            ...state.player.board,
            ...(state.battleBoards ? [...state.battleBoards.player, ...state.battleBoards.opponent] : []),
            ...state.shop.cards,
            ...state.targetingQueue,
            ...state.discoveryQueue
        ];
        allCards.forEach(c => {
            if (c instanceof BaseCard && !c.isPulsing) {
                c.syncVisualState();
            }
        });

        const rosterSidebar = document.getElementById('roster-sidebar');
        if (rosterSidebar && rosterSidebar.children) {
            // Map existing frames by hero name for stable reuse
            const existingFrames = new Map();
            Array.from(rosterSidebar.children).forEach(child => {
                if (child.dataset.heroName) existingFrames.set(child.dataset.heroName, child);
            });

            state.opponents.forEach((opp, index) => {
                const heroName = opp.hero?.name || `opp-${opp.id}`;
                let frame = existingFrames.get(heroName);
                
                if (!frame) {
                    frame = document.createElement('div');
                    frame.className = 'roster-frame';
                    frame.dataset.heroName = heroName;
                    const img = document.createElement('img');
                    frame.appendChild(img);
                }
                
                // Ensure correct order in the sidebar
                if (rosterSidebar.children && rosterSidebar.children[index] !== frame) {
                    rosterSidebar.insertBefore(frame, rosterSidebar.children[index]);
                }

                // Update state-based classes
                if (opp.overallHp <= 0) frame.classList.add('dead');
                else frame.classList.remove('dead');
                
                // Highlight the opponent we are currently fighting/about to fight
                const isActive = (state.currentOpponentId === state.opponents.indexOf(opp));
                if (isActive) frame.classList.add('active');
                else frame.classList.remove('active');

                const img = frame.querySelector('img');
                const avatarUrl = opp.hero?.avatar || '';
                if (avatarUrl && !img.src.includes(avatarUrl)) {
                    img.src = avatarUrl;
                }

                // Health Bar for Roster Sidebar
                updateAvatarHealthBar(frame, opp.overallHp, 20);
            });

            // Remove any leftover frames
            while (rosterSidebar.children.length > state.opponents.length) {
                rosterSidebar.removeChild(rosterSidebar.lastChild);
            }
        }

        const currentOpp = getOpponent();

        // Render Hero Powers
        const playerHPEl = document.getElementById('player-hero-power');
        if (playerHPEl) renderHeroPower(playerHPEl, state.player, true);

        const oppHPEl = document.getElementById('opponent-hero-power');
        if (oppHPEl) renderHeroPower(oppHPEl, currentOpp, false);

        const playerBg = document.getElementById('player-bg');
        const playerPlaneBg = document.getElementById('player-plane-bg');
        if (playerBg && state.player.playmat) {
            playerBg.style.backgroundImage = `url(${state.player.playmat})`;
        }
        if (playerPlaneBg) {
            if (state.settings.dynamicTraverse && (state.player.plane === 'Cirrusea' || state.player.plane === 'Onora' || state.player.plane === 'Al Tabaq')) {
                const matName = state.player.plane === 'Al Tabaq' ? 'al-tabaq' : state.player.plane.toLowerCase();
                playerPlaneBg.style.backgroundImage = `url(img/playmats/${matName}.jpg)`;
                playerPlaneBg.style.opacity = '1';
            } else {
                playerPlaneBg.style.opacity = '0';
            }
        }

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

            // Ensure shop avatar is always Marketto
            const shopAvatarImg = document.querySelector('#shop-zone .avatar-img');
            if (shopAvatarImg) shopAvatarImg.src = HEROES.MARKETTO.avatar;

            const oppBg = document.getElementById('opponent-bg');
            const oppPlaneBg = document.getElementById('opponent-plane-bg');
            if (oppBg) {
                oppBg.style.backgroundImage = 'url(img/playmats/shop.jpg)';
            }
            if (oppPlaneBg) {
                oppPlaneBg.style.opacity = '0'; // Shop always shows shop
            }
            opponentZone.style.display = 'none';
            opponentZone.style.opacity = '0';
            opponentZone.style.pointerEvents = 'none';

            const shopEl = document.getElementById('shop');
            renderBoard(shopEl, state.shop.cards, true, []);
        } else {
            const shopZone = document.getElementById('shop-zone');
            const opponentZone = document.getElementById('opponent-zone');
            shopZone.style.display = 'none';
            shopZone.style.opacity = '0';
            shopZone.style.pointerEvents = 'none';
            opponentZone.style.display = 'flex';
            opponentZone.style.opacity = '1';
            opponentZone.style.pointerEvents = 'auto';

            // Ensure battle avatar matches current opponent's hero
            const opponentAvatarImg = document.querySelector('#opponent-zone .avatar-img');
            if (opponentAvatarImg && currentOpp.hero) opponentAvatarImg.src = currentOpp.hero.avatar;

            const oppBg = document.getElementById('opponent-bg');
            const oppPlaneBg = document.getElementById('opponent-plane-bg');
            if (oppBg) {
                oppBg.style.backgroundImage = `url(${currentOpp.playmat})`;
            }
            if (oppPlaneBg) {
                if (currentOpp.plane === 'Cirrusea' || currentOpp.plane === 'Onora' || currentOpp.plane === 'Al Tabaq') {
                    const matName = currentOpp.plane === 'Al Tabaq' ? 'al-tabaq' : currentOpp.plane.toLowerCase();
                    oppPlaneBg.style.backgroundImage = `url(img/playmats/${matName}.jpg)`;
                    oppPlaneBg.style.opacity = '1';
                } else {
                    oppPlaneBg.style.opacity = '0';
                }
            }
            const oppBoardEl = document.getElementById('opponent-board');
            const oppBoardToRender = state.battleBoards ? state.battleBoards.opponent : (currentOpp?.board || []);
            renderBoard(oppBoardEl, oppBoardToRender, false, oppBoardToRender);
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

        if (playerBoardEl) {
            const boardToRender = (state.phase === 'BATTLE' && state.battleBoards) ? state.battleBoards.player : state.player.board;
            renderBoard(playerBoardEl, boardToRender, false, boardToRender);
        }

        const playerAvatarEl = document.getElementById('player-avatar');
        
        const oppBattleAvatarEl = document.getElementById('opponent-battle-avatar');

        if (playerHpEl()) playerHpEl().textContent = state.player.overallHp;
        if (playerFightHpEl()) playerFightHpEl().textContent = state.player.fightHp;
        
        // TREASURE UI UPDATE
        if (playerTreasureEl()) playerTreasureEl().textContent = state.player.gold;
        const gemsContainer = document.getElementById('treasure-gems');
        if (gemsContainer) {
            gemsContainer.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const gem = document.createElement('div');
                gem.className = 'treasure-gem';
                // Active gems are filled from the LEFT
                // So if we have 6 gold, indices 0-5 are active, 6-9 are inactive
                if (i >= state.player.gold) {
                    gem.classList.add('inactive');
                }
                gemsContainer.appendChild(gem);
            }
        }

        if (document.getElementById('opponent-hp')) document.getElementById('opponent-hp').textContent = currentOpp.overallHp;
        if (document.getElementById('opponent-fight-hp')) document.getElementById('opponent-fight-hp').textContent = currentOpp.fightHp;

        // Toggle Reroll button styling
        const isEnochSpecial = state.player.hero.name === "Enoch" && (state.player.rerollCount % 4 === 3);
        rerollBtn.classList.toggle('special-reroll', isEnochSpecial);

        if (state.player.gold < 1) {
            rerollBtn.style.background = "#555";
            rerollBtn.style.cursor = "not-allowed";
        } else if (!isEnochSpecial) {
            rerollBtn.style.background = "linear-gradient(to bottom, #2e7d32, #1b5e20)";
            rerollBtn.style.cursor = "pointer";
        } else {
            // Background is handled by .special-reroll CSS
            rerollBtn.style.background = "";
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
        if (playerAvatarEl) {
            if (state.player.hero) playerAvatarEl.dataset.heroName = state.player.hero.name;
            const fHP = playerAvatarEl.querySelector('.fight-hp');
            if (fHP) fHP.classList.add('player-fight-hp');

            // Set Player Hero Avatar
            const playerAvatarImg = playerAvatarEl.querySelector('.avatar-img');
            if (playerAvatarImg && state.player.hero) {
                const skin = state.settings.heroSkins[state.player.hero.name]?.avatar;
                playerAvatarImg.src = skin || state.player.hero.avatar;
            }
        }

        if (oppBattleAvatarEl && currentOpp.hero) {
            oppBattleAvatarEl.dataset.heroName = currentOpp.hero.name;
        }

        updateTierButton();
        const oppTierEl = document.getElementById('opponent-tier');
        if (oppTierEl) oppTierEl.textContent = currentOpp.tier;

        // Scry Modal
        const scryModal = document.getElementById('scry-modal');
        if (scryModal) {
            if (state.scrying) {
                scryModal.style.display = 'flex';
                const scryTitleEl = document.getElementById('scry-title');
                const scrySubtitleEl = document.getElementById('scry-subtitle');
                if (scryTitleEl) scryTitleEl.textContent = state.scrying.title || "SCRY";
                if (scrySubtitleEl) scrySubtitleEl.textContent = state.scrying.text || "Scry this card to the top or bottom.";

                const container = document.getElementById('scry-card-container');
                container.innerHTML = '';
                const currentScryCard = state.scrying.cards[state.scrying.choices.length];
                if (currentScryCard) {
                    container.appendChild(createCardElement(currentScryCard, false, -1, [], true));
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

                const discoveryTitleEl = document.getElementById('discovery-title');
                const discoverySubtitleEl = document.getElementById('discovery-subtitle');
                if (discoveryTitleEl) discoveryTitleEl.textContent = state.discovery.title || "DISCOVER";
                if (discoverySubtitleEl) discoverySubtitleEl.textContent = state.discovery.text || "Choose a card.";

                const cancelBtn = document.getElementById('discovery-cancel-btn');
                const actionsContainer = document.getElementById('discovery-actions');

                // Savage Congregation is not mandatory (can pick up to two)
                if (cancelBtn) cancelBtn.style.display = 'none'; 

                if (actionsContainer) {
                    actionsContainer.innerHTML = '';
                    actionsContainer.style.display = state.discovery.multiSelect ? 'flex' : 'none';
                    if (state.discovery.multiSelect) {
                        const confirmBtn = document.createElement('button');
                        confirmBtn.id = 'discovery-confirm-btn';
                        confirmBtn.className = 'game-button';
                        confirmBtn.textContent = 'CONFIRM';

                        // Exact styling from #end-turn-btn
                        confirmBtn.style.width = '150px';
                        confirmBtn.style.height = '60px';
                        confirmBtn.style.background = 'linear-gradient(to bottom, #2e7d32, #1b5e20)';
                        confirmBtn.style.color = 'white';
                        confirmBtn.style.border = '3px solid #fff';
                        confirmBtn.style.borderRadius = '12px';
                        confirmBtn.style.cursor = 'pointer';
                        confirmBtn.style.fontWeight = 'bold';
                        confirmBtn.style.fontSize = '1.2em';
                        confirmBtn.style.textTransform = 'uppercase';
                        confirmBtn.style.boxShadow = '0 5px 20px rgba(0,0,0,0.8)';

                        confirmBtn.addEventListener('click', () => confirmDiscovery());
                        actionsContainer.appendChild(confirmBtn);
                    }
                }

                const container = document.getElementById('discovery-card-container');
                container.innerHTML = '';

                // Un-center if 5+ cards OR Savage Congregation
                const useSideAlign = (state.discovery.graveyard && state.discovery.cards.length >= 5) || state.discovery.effect === 'savage_congregation';
                if (useSideAlign) {
                    container.classList.add('graveyard-mode');
                } else {
                    container.classList.remove('graveyard-mode');
                }

                state.discovery.cards.forEach((card, i) => {
                    if (state.discovery.isKeywordChoice) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'discovery-item-wrapper';

                        if (state.discovery.effect === 'ndengo_choice') {
                            const isChoiceA = card.card_name === 'Choice A';
                            const backKw = isChoiceA ? 'first-strike' : 'trample';
                            const frontKw = isChoiceA ? 'trample' : 'first-strike';

                            const containerDiv = document.createElement('div');
                            containerDiv.className = 'double-bubble-container';

                            const backIcon = document.createElement('div');
                            backIcon.className = `counter-bubble ${backKw} bubble-back`;
                            const backImg = document.createElement('img');
                            backImg.src = `img/${backKw}.png`;
                            backIcon.appendChild(backImg);

                            const frontIcon = document.createElement('div');
                            frontIcon.className = `counter-bubble ${frontKw} bubble-front`;
                            const frontImg = document.createElement('img');
                            frontImg.src = `img/${frontKw}.png`;
                            frontIcon.appendChild(frontImg);

                            containerDiv.appendChild(backIcon);
                            containerDiv.appendChild(frontIcon);
                            wrapper.appendChild(containerDiv);

                            const label = document.createElement('div');
                            label.className = 'discovery-item-label';
                            label.style.fontSize = '2em';
                            label.style.whiteSpace = 'pre-line';
                            if (isChoiceA) {
                                label.textContent = "First strike: Target\nTrample: Ndengo Brutalizer";
                            } else {
                                label.textContent = "Trample: Target\nFirst strike: Ndengo Brutalizer";
                            }
                            wrapper.appendChild(label);
                        } else {
                            const kw = card.rules_text.toLowerCase();
                            const icon = document.createElement('div');
                            icon.className = `counter-bubble ${kw.replace(' ', '-')}`;
                            icon.style.width = '160px';
                            icon.style.height = '160px';
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
                        }

                        wrapper.addEventListener('click', () => resolveDiscovery(card));
                        container.appendChild(wrapper);
                    } else {
                        const cardEl = createCardElement(card, false, -1, [], true);
                        cardEl.style.padding = "20px";

                        // SPECIAL: Show Stars for Savage Congregation
                        if (state.discovery.effect === 'savage_congregation') {
                            const costEl = cardEl.querySelector('.card-cost');
                            if (costEl) {
                                costEl.style.display = 'flex';
                                costEl.classList.remove('spell-cost');
                                costEl.style.top = '10px';
                                costEl.style.right = '10px';
                                
                                let tier = card.tier || 1;
                                let starsStr = '★'.repeat(tier);
                                if (tier === 3 || tier === 4) {
                                    starsStr = '★★<br>' + '★'.repeat(tier - 2);
                                }
                                costEl.innerHTML = `<div class="star">${starsStr}</div>`;
                            }
                        }

                        if (state.discovery.multiSelect) {
                            const isSelected = state.discovery.selected.some(c => c.id === card.id);
                            if (isSelected) cardEl.classList.add('selected-blue');

                            const currentTierSum = state.discovery.selected.reduce((sum, c) => sum + (c.tier || 1), 0);
                            const currentCount = state.discovery.selected.length;

                            const wouldExceedTier = (currentTierSum + (card.tier || 1)) > (state.discovery.maxTier || 100);
                            const wouldExceedCount = (currentCount + 1) > (state.discovery.maxCount || 100);

                            if (!isSelected && (wouldExceedTier || wouldExceedCount)) {
                                cardEl.classList.add('grayed-out');
                                cardEl.style.pointerEvents = 'none';
                            } else {
                                cardEl.addEventListener('click', () => toggleDiscoverySelection(card));
                            }
                        } else {
                            cardEl.addEventListener('click', () => resolveDiscovery(card));
                        }
                        container.appendChild(cardEl);
                    }
                });

            } else {
                discoveryModal.style.display = 'none';
            }

        }

        const targetingTitleEl = document.getElementById('targeting-title');
        const targetingSubtitleEl = document.getElementById('targeting-subtitle');

        if (state.castingSpell || state.targetingEffect) {
            let title = "";
            let text = "";
            if (state.castingSpell) {
                title = state.castingSpell.card_name;
                text = state.castingSpell.effect_text || "Broken";
            } else if (state.targetingEffect) {
                title = state.targetingEffect.title || "Targeting";
                text = state.targetingEffect.text || "Choose a target.";
            }
            if (targetingTitleEl) targetingTitleEl.textContent = title;
            if (targetingSubtitleEl) targetingSubtitleEl.textContent = text;

            if (state.castingSpell || (state.targetingEffect && !state.targetingEffect.isMandatory)) {
                endTurnBtn.textContent = 'CANCEL';
                endTurnBtn.style.background = 'linear-gradient(to bottom, #c62828, #b71c1c)';
                document.body.classList.add('overlay-active');
                endTurnBtn.disabled = false;
            } else if (state.targetingEffect && state.targetingEffect.isMandatory) {
                endTurnBtn.textContent = 'MUST TARGET';
                endTurnBtn.style.background = '#555';
                document.body.classList.add('overlay-active');
                endTurnBtn.disabled = true;
            }
        } else {
            if (targetingTitleEl) targetingTitleEl.textContent = '';
            if (targetingSubtitleEl) targetingSubtitleEl.textContent = '';
            endTurnBtn.textContent = 'End Turn';
            endTurnBtn.style.background = '';
            document.body.classList.remove('overlay-active');
            endTurnBtn.disabled = state.phase !== 'SHOP';
        }

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

        // Player Avatar drop zone (for buying)
        const playerAvatar = document.getElementById('player-avatar');
        if (playerAvatar) {
            playerAvatar.removeEventListener('dragover', handleDragOver);
            playerAvatar.addEventListener('dragover', handleDragOver);
            playerAvatar.removeEventListener('drop', handlePlayerAvatarDrop);
            playerAvatar.addEventListener('drop', handlePlayerAvatarDrop);
        }

        // Hand drop zone (also for buying, since it overlaps avatar)
        const playerHand = document.getElementById('player-hand');
        if (playerHand) {
            playerHand.removeEventListener('dragover', handleDragOver);
            playerHand.addEventListener('dragover', handleDragOver);
            playerHand.removeEventListener('drop', handlePlayerAvatarDrop);
            playerHand.addEventListener('drop', handlePlayerAvatarDrop);
        }

        // Reset animation flags after render
        state.shop.justFroze = false;

        if (state.phase === 'SHOP' && !state.isTripling) {
            setTimeout(checkTriples, 50);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function getDropIndex(clientX) {
        const boardCards = Array.from(playerBoardEl.children);
        if (boardCards.length === 0) return 0;
        
        let targetIndex = boardCards.length;
        for (let i = 0; i < boardCards.length; i++) {
            const rect = boardCards[i].getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            if (clientX < center) {
                targetIndex = i;
                break;
            }
        }
        return targetIndex;
    }

    function handleBoardDrop(e) {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const targetIndex = getDropIndex(e.clientX);
            
            if (data.type === 'hand') {
                useCardFromHand(data.cardId, targetIndex);
            } else if (data.type === 'board') {
                const boardIndex = state.player.board.findIndex(c => c.id === data.cardId);
                if (boardIndex !== -1) {
                    const [m] = state.player.board.splice(boardIndex, 1);
                    // Adjust targetIndex if we removed a card from BEFORE it
                    let finalIndex = targetIndex;
                    if (boardIndex < targetIndex) finalIndex--;
                    state.player.board.splice(finalIndex, 0, m);
                    render();
                }
            }
        } catch (error) {
            // Swallow errors from non-card drops
        }
    }

    function handleShopDrop(e) {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'board') {
                sellCard(data.cardId);
            }
        } catch (error) {
            // Swallow errors from non-card drops
        }
    }

    function handlePlayerAvatarDrop(e) {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'shop') {
                buyCard(data.cardId);
            }
        } catch (error) {
            // Swallow errors from non-card drops
        }
    }

    function sellCard(cardId) {
        if (state.phase !== 'SHOP') return;
        const boardIndex = state.player.board.findIndex(c => c.id === cardId);
        if (boardIndex === -1) return;

        const [sold] = state.player.board.splice(boardIndex, 1);
        if (sold.equipment && state.player.hand.length < handLimit) {
            state.player.hand.push(sold.equipment);
        }
        if (!sold.isDecayed) {
            state.player.gold += 1;
        }
        render();
    }

    function createCardElement(card, isShop = false, index = -1, boardContext = [], skipIndicators = false) {
        const instance = (card instanceof BaseCard) ? card : CardFactory.create(card);
        const cardEl = cardTemplate.content.cloneNode(true).firstElementChild;
        cardEl.id = `card-${instance.id}`;
        if (instance.isDying) cardEl.classList.add('dying');
        if (instance.isSpawning) cardEl.classList.add('spawning');
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
            const tier = instance.tier || 1;
            let starsStr = '★'.repeat(tier);
            if (tier === 3 || tier === 4) {
                starsStr = '★★<br>' + '★'.repeat(tier - 2);
            }
            costEl.innerHTML = `<div class="star">${starsStr}</div>`;

            // Locked Shop visual
            if ((state.shop.frozen || instance.isUnlocking) && !instance.isChained) {
                if (state.shop.frozen) {
                    cardEl.classList.add('locked-shop-card');
                    if (!state.shop.justFroze) cardEl.classList.add('already-locked');
                }
                else cardEl.classList.add('unfreezing-shop-card');

                const lockIndicator = document.createElement('div');
                lockIndicator.className = 'card-lock-indicator';
                const lockImg = document.createElement('img');
                lockImg.src = 'img/locked.png';
                lockIndicator.appendChild(lockImg);
                cardEl.appendChild(lockIndicator);
            }
        } else if (!isCreature && isShop) {
            costEl.style.display = 'flex';
            costEl.classList.add('spell-cost');
            let cost = instance.tier || 1;
            if (instance.type?.toLowerCase().includes('equipment')) cost = 5;
            costEl.innerHTML = cost;

            // Locked Shop visual for non-creatures
            if ((state.shop.frozen || instance.isUnlocking) && !instance.isChained) {
                if (state.shop.frozen) {
                    cardEl.classList.add('locked-shop-card');
                    if (!state.shop.justFroze) cardEl.classList.add('already-locked');
                }
                else cardEl.classList.add('unfreezing-shop-card');

                const lockIndicator = document.createElement('div');
                lockIndicator.className = 'card-lock-indicator';
                const lockImg = document.createElement('img');
                lockImg.src = 'img/locked.png';
                lockIndicator.appendChild(lockImg);
                cardEl.appendChild(lockIndicator);
            }
        } else {
            costEl.style.display = 'none';
        }

        // ADD DISCOUNT INDICATOR (Small coin under tier)
        if (isShop && instance.costReduction > 0) {
            const discountEl = document.createElement('div');
            discountEl.className = 'discount-coin';
            discountEl.innerHTML = `-${instance.costReduction}`;
            if (costEl && costEl.parentElement) {
                costEl.parentElement.appendChild(discountEl);
            }
        }
        
        const counterStackEl = cardEl.querySelector('.card-counter-stack');
        counterStackEl.innerHTML = '';

        // Ghost Indicators for temporary keywords
        const ghostContainer = document.createElement('div');
        ghostContainer.className = 'ghost-indicator-container';
        if (skipIndicators) ghostContainer.style.display = 'none';
        cardEl.appendChild(ghostContainer);

        const addKeywordTooltip = (element, name) => {
            const data = KEYWORD_DATA[name];
            if (!data && name !== 'plus-one') return;

            const tooltip = document.createElement('div');
            tooltip.className = 'keyword-tooltip';
            
            const tooltipName = document.createElement('div');
            tooltipName.className = 'keyword-tooltip-name';
            tooltipName.textContent = name === 'plus-one' ? '+1/+1 Counter' : name;
            
            const tooltipText = document.createElement('div');
            tooltipText.className = 'keyword-tooltip-text';
            tooltipText.textContent = name === 'plus-one' ? KEYWORD_DATA['plus-one'].description : data.description;
            
            tooltip.appendChild(tooltipName);
            tooltip.appendChild(tooltipText);
            element.appendChild(tooltip);
        };

        const isCounterTargetingMode = state.targetingEffect?.effect === 'permutate_step1' || state.targetingEffect?.effect === 'cloudline_sovereign_step1';
        const isValidCounterTarget = isCounterTargetingMode && (state.targetingEffect.effect === 'permutate_step1' || (state.targetingEffect.effect === 'cloudline_sovereign_step1' && instance.shieldCounters === 0));

        const tempKeywords = new Set();
        if (isCreature && !skipIndicators) {
            const keywordMap = {
                'Flying': 'img/flying.png',
                'Menace': 'img/menace.png',
                'First strike': 'img/first-strike.png',
                'Double strike': 'img/double-strike.png',
                'Vigilance': 'img/vigilance.png',
                'Lifelink': 'img/lifelink.png',
                'Trample': 'img/trample.png',
                'Reach': 'img/reach.png',
                'Hexproof': 'img/hexproof.png',
                'Indestructible': 'img/indestructible.png',
                'Haste': 'img/haste.png',
                'Shield': 'img/shield.png',
                'Deathtouch': 'img/skull.png',
                'Decayed': 'img/decayed.png',
                'Adaptive': 'img/adaptive.png',
                'Prowess': 'img/prowess.png',
                'Chivalry': 'img/chivalry.png',
                'Battle cry': 'img/battle-cry.png'
            };

            Object.keys(keywordMap).forEach(kw => {
                // Special case for Decayed which isn't a "real" keyword checkable by hasKeyword the same way
                if (kw === 'Decayed') {
                    if (instance.isDecayed) tempKeywords.add(kw);
                    return;
                }

                // CHECK IF SHOWN VIA COUNTER BUBBLE
                let counterProp = kw.toLowerCase().replace(' ', '') + 'Counters';
                if (kw === 'First strike') counterProp = 'firstStrikeCounters';
                if (kw === 'Double strike') counterProp = 'doubleStrikeCounters';
                const hasSpecificCounter = instance[counterProp] > 0;
                
                // IF WE HAVE IT AND IT'S NOT A COUNTER -> SHOW AS GHOST
                if (!hasSpecificCounter && instance.hasKeyword(kw, true)) {
                    tempKeywords.add(kw);
                }
            });

            tempKeywords.forEach(kw => {
                const indicator = document.createElement('div');
                const keywordClass = kw.toLowerCase().replace(' ', '-');
                indicator.className = `ghost-indicator ${keywordClass}`;
                indicator.dataset.keyword = kw;
                
                // PERMUTATE GREYSCALE/DISABLE
                if (isCounterTargetingMode) {
                    indicator.classList.add('grayscale');
                    indicator.style.pointerEvents = 'none';
                }

                const img = document.createElement('img');
                img.src = keywordMap[kw];
                img.alt = kw;
                indicator.appendChild(img);
                
                addKeywordTooltip(indicator, kw);
                ghostContainer.appendChild(indicator);
            });
        }
        
        const addCounterBubble = (type, value, imgPath, rulesText) => {
            const bubble = document.createElement('div');
            bubble.className = `counter-bubble ${type}`;
            bubble.dataset.type = type;
            bubble.dataset.value = value;
            
            if (type === 'plus-one') {
                bubble.textContent = `+${instance.displayedCounters}`;
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
            
            if (isValidCounterTarget && instance.owner === 'player') {
                bubble.classList.add('counter-clickable');
                bubble.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Permutate specific resolution logic: we tell the engine which counter we picked
                    applyTargetedEffect(instance.id, type); 
                });
            } else if (isCounterTargetingMode) {
                // If it's counter mode but this specific card isn't a valid target, grey out its counters too
                bubble.classList.add('grayscale');
            }

            // Map counter type back to display name for description lookup
            let displayName = type;
            if (type === 'plus-one') displayName = 'plus-one';
            else if (type === 'first-strike') displayName = 'First strike';
            else if (type === 'double-strike') displayName = 'Double strike';
            else {
                // Capitalize first letter (flying -> Flying)
                displayName = type.charAt(0).toUpperCase() + type.slice(1);
            }

            addKeywordTooltip(bubble, displayName);
            counterStackEl.appendChild(bubble);
        };

        // 1. +1/+1 Counters
        if (instance.displayedCounters > 0) addCounterBubble('plus-one', instance.displayedCounters);
        // 2. Flying
        if (instance.displayedFlyingCounters > 0) addCounterBubble('flying', instance.displayedFlyingCounters, 'img/flying.png');
        // 3. Menace
        if (instance.displayedMenaceCounters > 0) addCounterBubble('menace', instance.displayedMenaceCounters, 'img/menace.png');
        // 4. First Strike
        if (instance.displayedFirstStrikeCounters > 0) addCounterBubble('first-strike', instance.displayedFirstStrikeCounters, 'img/first-strike.png');
        // 4b. Double Strike
        if (instance.displayedDoubleStrikeCounters > 0) addCounterBubble('double-strike', instance.displayedDoubleStrikeCounters, 'img/double-strike.png');
        // 5. Vigilance
        if (instance.displayedVigilanceCounters > 0) addCounterBubble('vigilance', instance.displayedVigilanceCounters, 'img/vigilance.png');
        // 6. Lifelink
        if (instance.displayedLifelinkCounters > 0) addCounterBubble('lifelink', instance.displayedLifelinkCounters, 'img/lifelink.png');
        // 6b. Deathtouch
        if (instance.displayedDeathtouchCounters > 0) addCounterBubble('deathtouch', instance.displayedDeathtouchCounters, 'img/skull.png');
        // 7. Trample
        if (instance.displayedTrampleCounters > 0) addCounterBubble('trample', instance.displayedTrampleCounters, 'img/trample.png');
        // 8. Reach
        if (instance.displayedReachCounters > 0) addCounterBubble('reach', instance.displayedReachCounters, 'img/reach.png');
        // 9. Hexproof
        if (instance.displayedHexproofCounters > 0) addCounterBubble('hexproof', instance.displayedHexproofCounters, 'img/hexproof.png');
        // 10. Shield
        if (instance.displayedShieldCounters > 0) addCounterBubble('shield', instance.displayedShieldCounters, 'img/shield.png');
        
        if (instance.pt) {
            const stats = instance.getDisplayStats(boardContext, true); // true = use visual state
            cardEl.querySelector('.card-p').textContent = stats.p;
            cardEl.querySelector('.card-t').textContent = stats.t;
            if (stats.t < stats.maxT) cardEl.querySelector('.card-t').classList.add('damaged');
            else cardEl.querySelector('.card-t').classList.remove('damaged');
        } else cardEl.querySelector('.card-pt').style.display = 'none';
        
        if (instance.isFoil) cardEl.classList.add('foil');
        
        // Render Equipment Indicator
        if (instance.equipment) {
            const eqContainer = document.createElement('div');
            eqContainer.className = 'equipment-indicator';
            
            const img = document.createElement('img');
            const eqTokenSuffix = (instance.equipment.shape?.includes('token')) ? "t" : "";
            const eqImageName = instance.equipment.position ? instance.equipment.position : `${instance.equipment.number}${eqTokenSuffix}_${instance.equipment.card_name}`;
            const eqDoubleSuffix = (instance.equipment.shape?.includes('double')) ? "_front" : "";
            const eqExt = instance.equipment.image_type || instance.equipment.set_image_type || "jpg";
            img.src = `sets/${instance.equipment.set}-files/img/${eqImageName}${eqDoubleSuffix}.${eqExt}`;
            
            eqContainer.appendChild(img);
            cardEl.appendChild(eqContainer);
        }

        // Render Showcase Indicator (Bard)
        if (instance.card_name === 'Bard' && instance.set === 'NJB') {
            const showcaseContainer = document.createElement('div');
            showcaseContainer.className = 'showcase-indicator';
            
            // Find Song of Wind and Fire for art
            const sourceSpell = availableCards.find(c => c.card_name === 'Song of Wind and Fire');
            if (sourceSpell) {
                const img = document.createElement('img');
                const sTokenSuffix = (sourceSpell.shape?.includes('token')) ? "t" : "";
                const sImageName = sourceSpell.position ? sourceSpell.position : `${sourceSpell.number}${sTokenSuffix}_${sourceSpell.card_name}`;
                const sDoubleSuffix = (sourceSpell.shape?.includes('double')) ? "_front" : "";
                const sExt = sourceSpell.image_type || sourceSpell.set_image_type || "jpg";
                img.src = `sets/${sourceSpell.set}-files/img/${sImageName}${sDoubleSuffix}.${sExt}`;
                showcaseContainer.appendChild(img);
                cardEl.appendChild(showcaseContainer);
            }
        }
        
        if (isCounterTargetingMode) cardEl.classList.add('grayed-out');

        // Events
        if (isShop) {
            cardEl.draggable = true;
            cardEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'shop', cardId: instance.id }));
            });

            if (instance.isChained) {
                cardEl.classList.add('chained-card');
                const chainIndicator = document.createElement('div');
                chainIndicator.className = 'chain-indicator';
                if (!instance.isJustChained) {
                    chainIndicator.classList.add('no-animation');
                }
                const chainImg = document.createElement('img');
                chainImg.src = 'img/chained.png';
                chainIndicator.appendChild(chainImg);
                cardEl.appendChild(chainIndicator);
            }

            cardEl.onclick = (e) => {
                e.stopPropagation();
                if (instance.isChained) return; // Uninteractable when chained

                if (state.castingSpell && (state.castingSpell.card_name === 'Artful Coercion' || state.castingSpell.card_name === 'Touch of the Omen')) {
                    const isCreature = instance.type?.toLowerCase().includes('creature');
                    if (!isCreature) return; // Cannot target non-creatures

                    if (state.castingSpell.card_name === 'Artful Coercion') {
                        // Check if valid power for Coercion
                        const currentOpp = getOpponent();
                        const battlefield = [...state.player.board, ...currentOpp.board];
                        const shopCreatures = state.shop.cards
                            .map(c => (c instanceof BaseCard) ? c : CardFactory.create(c))
                            .filter(c => c.type?.toLowerCase().includes('creature'));
                        
                        const allMinPool = [...battlefield, ...shopCreatures];
                        const minPower = allMinPool.length > 0 ? Math.min(...allMinPool.map(c => {
                            const b = c.owner === 'player' ? state.player.board : (c.owner === 'opponent' ? currentOpp.board : shopCreatures);
                            return c.getDisplayStats(b).p;
                        })) : Infinity;

                        if (instance.getBasePT().p <= minPower && state.player.board.length < boardLimit) {
                            applySpell(instance.id);
                        }
                    } else if (state.castingSpell.card_name === 'Touch of the Omen') {
                        // Omen targets any shop creature if board has space
                        if (state.player.board.length < boardLimit) {
                            applySpell(instance.id);
                        }
                    }
                } else if (state.targetingEffect && state.targetingEffect.effect === 'architect_control') {
                    const isCreature = instance.type?.toLowerCase().includes('creature');
                    if (isCreature) {
                        applyTargetedEffect(instance.id);
                    }
                } else if (state.targetingEffect && state.targetingEffect.effect === 'hero_power_heping') {
                    const isCreature = instance.type?.toLowerCase().includes('creature');
                    if (isCreature && !instance.isChained) {
                        applyTargetedEffect(instance.id);
                    }
                } else if (state.targetingEffect && state.targetingEffect.effect === 'hero_power_kism') {
                    const isCreature = instance.type?.toLowerCase().includes('creature');
                    if (isCreature && state.player.board.length < boardLimit) {
                        applyTargetedEffect(instance.id);
                    }
                } else {
                    // Standard shop click logic: only buy if NO targeting is active
                    if (!state.castingSpell && !state.targetingEffect) {
                        buyCard(instance.id);
                    }
                }
            };

            if (state.castingSpell && state.castingSpell.card_name === 'Artful Coercion') {
                const isCreature = instance.type?.toLowerCase().includes('creature');
                if (isCreature) {
                    const currentOpp = getOpponent();
                    const battlefield = [...state.player.board, ...currentOpp.board];
                    const shopCreatures = state.shop.cards
                        .map(c => (c instanceof BaseCard) ? c : CardFactory.create(c))
                        .filter(c => c.type?.toLowerCase().includes('creature'));
                    
                    const allMinPool = [...battlefield, ...shopCreatures];
                    const minPower = allMinPool.length > 0 ? Math.min(...allMinPool.map(c => {
                        const b = c.owner === 'player' ? state.player.board : (c.owner === 'opponent' ? currentOpp.board : shopCreatures);
                        return c.getDisplayStats(b).p;
                    })) : Infinity;

                    if (instance.getBasePT().p <= minPower && state.player.board.length < boardLimit) {
                        cardEl.classList.add('targetable');
                    }
                }
            } else if (state.castingSpell && state.castingSpell.card_name === 'Touch of the Omen') {
                const isCreature = instance.type?.toLowerCase().includes('creature');
                if (isCreature && state.player.board.length < boardLimit) {
                    cardEl.classList.add('targetable');
                }
            } else if (state.targetingEffect && state.targetingEffect.effect === 'architect_control') {
                const isCreature = instance.type?.toLowerCase().includes('creature');
                if (isCreature) {
                    cardEl.classList.add('targetable');
                }
            } else if (state.targetingEffect && state.targetingEffect.effect === 'hero_power_heping') {
                const isCreature = instance.type?.toLowerCase().includes('creature');
                if (isCreature && !instance.isChained) {
                    cardEl.classList.add('targetable');
                }
            } else if (state.targetingEffect && state.targetingEffect.effect === 'hero_power_kism') {
                const isCreature = instance.type?.toLowerCase().includes('creature');
                if (isCreature && state.player.board.length < boardLimit) {
                    cardEl.classList.add('targetable');
                }
            }
        }

        // Actionable check for Intli Assaulter, Covetous Wechuge
        const actionableNames = ['Intli Assaulter', 'Covetous Wechuge', 'Nightmare Harpy', 'Dune Skirmisher'];
        const hasEnoughGold = (instance.actionCost === undefined || state.player.gold >= instance.actionCost);
        const isCurrentlySource = (state.targetingEffect && state.targetingEffect.sourceId === instance.id);

        if (state.phase === 'SHOP' && !isShop && actionableNames.includes(instance.card_name) && index !== -1 && !state.castingSpell && !state.targetingEffect && !instance.actionUsed && hasEnoughGold && !isCurrentlySource) {
            cardEl.classList.add('actionable-outline');
            cardEl.onclick = async (e) => {
                e.stopPropagation();
                await instance.onAction();
                render();
                if (!state.targetingEffect && !state.discovery && state.discoveryQueue.length === 0) {
                    await resolveAnimations();
                }
            };
        }

        if (state.phase === 'SHOP' && !isShop && index !== -1 && !state.castingSpell && !state.targetingEffect) {
            cardEl.draggable = true;
            cardEl.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'board', index: index, cardId: instance.id }));
            };
            cardEl.ondragover = (e) => e.preventDefault();
            cardEl.ondrop = (e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const targetIndex = getDropIndex(e.clientX);
                    
                    if (data.type === 'board') {
                        const boardIndex = state.player.board.findIndex(c => c.id === data.cardId);
                        if (boardIndex !== -1) {
                            const [m] = state.player.board.splice(boardIndex, 1);
                            let finalIndex = targetIndex;
                            if (boardIndex < targetIndex) finalIndex--;
                            state.player.board.splice(finalIndex, 0, m);
                            render();
                        }
                    } else if (data.type === 'hand') {
                        useCardFromHand(data.cardId, targetIndex);
                    }
                } catch (err) {
                    // Swallow errors from non-card drops
                }
            };
        }
        
        if (index !== -1 && !isShop) {
            if (state.castingSpell) { 
                const isCreature = instance.type?.toLowerCase().includes('creature');
                const isLagoon = state.castingSpell.card_name === 'Lagoon Logistics';
                const isCoercion = state.castingSpell.card_name === 'Artful Coercion';
                const isOmen = state.castingSpell.card_name === 'Touch of the Omen';

                if (isLagoon && !isCreature) {
                    // Cannot target non-creatures with Lagoon
                } else if (isCoercion || isOmen) {
                    // Artful Coercion and Touch of the Omen target the SHOP, not the board
                } else {
                    cardEl.classList.add('targetable'); 
                    cardEl.onclick = () => applySpell(instance.id); 
                }
            }
            if (state.targetingEffect) { 
                // Special case: Parliament discard targeting is HAND ONLY
                if (state.targetingEffect.effect === 'parliament_discard') {
                    // Not targetable on board
                } else if (state.targetingEffect.effect === 'permutate_step1' || state.targetingEffect.effect === 'cloudline_sovereign_step1') {
                    // Not targetable as a card, only counters are clickable
                } else if (state.targetingEffect.effect === 'artful_coercion_gain_control' || state.targetingEffect.effect === 'architect_control' || state.targetingEffect.effect === 'hero_power_heping' || state.targetingEffect.effect === 'hero_power_kism') {
                    // Not targetable on board (targets shop)
                } else {
                    // Special case: Intli Assaulter, Wechuge, Matriarch, Brutalizer can't target themselves
                    const cannotTargetSelf = ['intli_sacrifice', 'wechuge_sacrifice', 'nest_matriarch_buff', 'ndengo_target'];
                    if (cannotTargetSelf.includes(state.targetingEffect.effect) && instance.id === state.targetingEffect.sourceId) {
                        // Not targetable
                    } else if (state.targetingEffect.effect === 'permutate_step2' && instance.id === state.targetingEffect.sourceCreatureId) {
                        // Not targetable (must be different creature)
                    } else if (state.targetingEffect.effect === 'warrior_ways_step2' && !instance.isType('Centaur')) {
                        // Not targetable if not a Centaur
                    } else if (state.targetingEffect.effect === 'warband_rallier_counters' && !instance.isType('Centaur')) {
                        // Not targetable if not a Centaur
                    } else if (state.targetingEffect.effect === 'ceremony_step2' || state.targetingEffect.effect === 'traverse_onora_grant_step2') {
                        if (instance.id === (state.targetingEffect.target1Id || state.targetingEffect.firstTargetId)) {
                             // Not targetable (cannot select same creature twice)
                        } else if ((state.targetingEffect.effect === 'ceremony_step2') && instance.isToken) {
                             // Not targetable (Ceremony cannot target tokens)
                        } else {
                            cardEl.classList.add('targetable');
                            cardEl.onclick = () => applyTargetedEffect(instance.id);
                        }
                    } else if (state.targetingEffect.effect === 'nightfall_raptor_bounce' && instance.isType('Enchantment')) {
                        // Not targetable if it's an enchantment creature
                    } else if (state.targetingEffect.effect === 'hero_power_xylo' && !instance.hasETB()) {
                        // Not targetable if it doesn't have an ETB
                    } else if (state.targetingEffect.effect === 'equip_creature' && instance.equipment) {
                        // Not targetable if already equipped
                    } else {
                        // Additional check for Ceremony Step 1
                        if (state.targetingEffect.effect === 'ceremony_step1' && instance.isToken) {
                            // Not targetable
                        } else {
                            cardEl.classList.add('targetable');
                            cardEl.onclick = () => applyTargetedEffect(instance.id);
                        }
                    }
                }
            }

        } else if (state.player.hand.some(c => c.id === instance.id)) { // In hand
             // SPELL TARGETING HAND
             if (state.castingSpell && [].includes(state.castingSpell.card_name)) {
                 const isCreature = instance.type?.toLowerCase().includes('creature');
                 const isNotSelf = instance.id !== state.castingSpell.id;

                 if (isCreature && isNotSelf) {
                     cardEl.classList.add('targetable');
                     cardEl.onclick = (e) => {
                         e.stopPropagation();
                         applySpell(instance.id);
                     };
                 }
             }
             // DISCARD TARGETING
             else if (state.targetingEffect && state.targetingEffect.effect === 'parliament_discard') {
                 cardEl.classList.add('discard-outline');
                 cardEl.onclick = () => applyTargetedEffect(instance.id);
             } else {
                 cardEl.onclick = () => useCardFromHand(instance.id);
                 cardEl.draggable = true;
                 cardEl.ondragstart = (e) => {
                     e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'hand', cardId: instance.id }));
                 };
                 // Allow buying from shop by dropping on hand cards
                 cardEl.ondragover = (e) => e.preventDefault();
                 cardEl.ondrop = (e) => {
                    try {
                        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (data.type === 'shop') {
                            buyCard(data.cardId);
                            e.stopPropagation();
                        }
                    } catch(err) {}
                 };
             }
        }
        return cardEl;
    }

    function setAvailableCards(cards) {
        availableCards = cards;
    }

    async function checkTriples() {
        if (state.phase !== 'SHOP' || state.isTripling) return;

        // Map current hand and board to source objects
        const eligibleCards = [
            ...state.player.hand.map((c, i) => ({ card: c, source: 'hand', index: i })),
            ...state.player.board.map((c, i) => ({ card: c, source: 'board', index: i }))
        ].filter(item => !item.card.isToken && !item.card.isFoil && item.card.type?.toLowerCase().includes('creature'));

        const groups = {};
        eligibleCards.forEach(item => {
            const name = item.card.card_name;
            if (!groups[name]) groups[name] = [];
            groups[name].push(item);
        });

        for (const name in groups) {
            if (groups[name].length >= 3) {
                state.isTripling = true;
                const triple = groups[name].slice(0, 3);
                await performTriplingAnimation(triple);
                state.isTripling = false;
                // Re-check for chain tripling
                setTimeout(checkTriples, 100);
                return;
            }
        }
    }

    async function performTriplingAnimation(tripleItems) {
        const cardName = tripleItems[0].card.card_name;
        
        // 1. Snapshot physical positions and clone elements BEFORE state change
        const ghosts = [];
        const container = document.body;
        
        tripleItems.forEach(item => {
            const el = document.getElementById(`card-${item.card.id}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const ghost = el.cloneNode(true);
                ghost.id = `ghost-${item.card.id}`;
                ghost.className += ' triple-ghost';
                ghost.style.top = `${rect.top}px`;
                ghost.style.left = `${rect.left}px`;
                ghost.style.width = `${rect.width}px`;
                ghost.style.height = `${rect.height}px`;
                ghost.style.margin = '0';
                ghost.style.transform = 'none'; // Clear relative transforms
                
                container.appendChild(ghost);
                ghosts.push(ghost);
                
                // Hide the real one
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            }
        });

        if (ghosts.length < 3) {
            ghosts.forEach(g => g.remove());
            return;
        }

        // 2. Update state: Remove originals, add foil
        const baseData = availableCards.find(c => c.card_name === cardName && c.shape !== 'token' && c.type?.toLowerCase().includes('creature'));
        if (!baseData) {
            ghosts.forEach(g => g.remove());
            return;
        }

        // Remove from hand/board
        tripleItems.forEach(item => {
            if (item.source === 'hand') {
                state.player.hand = state.player.hand.filter(c => c.id !== item.card.id);
            } else {
                state.player.board = state.player.board.filter(c => c.id !== item.card.id);
            }
        });

        const foil = CardFactory.create(baseData);
        foil.isFoil = true;
        foil.isToken = false; // Foils are never tokens
        
        // Sum counters and other persistent stats
        foil.counters = tripleItems.reduce((sum, item) => sum + (item.card.counters || 0), 0);
        foil.flyingCounters = tripleItems.reduce((sum, item) => sum + (item.card.flyingCounters || 0), 0);
        foil.menaceCounters = tripleItems.reduce((sum, item) => sum + (item.card.menaceCounters || 0), 0);
        foil.firstStrikeCounters = tripleItems.reduce((sum, item) => sum + (item.card.firstStrikeCounters || 0), 0);
        foil.doubleStrikeCounters = tripleItems.reduce((sum, item) => sum + (item.card.doubleStrikeCounters || 0), 0);
        foil.vigilanceCounters = tripleItems.reduce((sum, item) => sum + (item.card.vigilanceCounters || 0), 0);
        foil.lifelinkCounters = tripleItems.reduce((sum, item) => sum + (item.card.lifelinkCounters || 0), 0);
        foil.deathtouchCounters = tripleItems.reduce((sum, item) => sum + (item.card.deathtouchCounters || 0), 0);
        foil.trampleCounters = tripleItems.reduce((sum, item) => sum + (item.card.trampleCounters || 0), 0);
        foil.reachCounters = tripleItems.reduce((sum, item) => sum + (item.card.reachCounters || 0), 0);
        foil.hexproofCounters = tripleItems.reduce((sum, item) => sum + (item.card.hexproofCounters || 0), 0);
        foil.shieldCounters = tripleItems.reduce((sum, item) => sum + (item.card.shieldCounters || 0), 0);

        state.player.hand.push(foil);

        // 2.5 Collect Equipment to return to hand
        const equipmentToReturn = tripleItems
            .map(item => item.card.equipment)
            .filter(eq => eq && eq instanceof BaseCard);
        
        equipmentToReturn.forEach(eq => {
            if (state.player.hand.length < handLimit) {
                state.player.hand.push(eq);
            }
        });

        // 3. Render to position the new foil card in hand
        render();

        // 4. Find the target position (Center of the new card in hand)
        const targetEl = document.getElementById(`card-${foil.id}`);
        if (!targetEl) {
            ghosts.forEach(g => g.remove());
            return;
        }
        
        const targetRect = targetEl.getBoundingClientRect();
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        
        targetEl.style.opacity = '0'; // Keep it hidden during flight

        // 5. Trigger the flight!
        await new Promise(r => setTimeout(r, 50)); // Tiny breath for browser to settle
        
        ghosts.forEach(ghost => {
            const ghostRect = ghost.getBoundingClientRect();
            const targetLeft = targetCenterX - ghostRect.width / 2;
            const targetTop = targetCenterY - ghostRect.height / 2;
            
            ghost.style.left = `${targetLeft}px`;
            ghost.style.top = `${targetTop}px`;
            ghost.style.transform = 'scale(0.3)';
            ghost.style.opacity = '0.2';
        });

        // 6. Wait for ghosts to almost reach target, then trigger foil pop
        await new Promise(r => setTimeout(r, 400));

        // 7. Cleanup and Smooth Show
        ghosts.forEach(g => g.remove());
        
        // Determine natural opacity (0.5 for hand cards, 1.0 for board)
        const isInHand = state.player.hand.some(c => c.id === foil.id);
        const targetOpacity = isInHand ? '0.5' : '1';

        // Animate from 0 to natural opacity
        targetEl.style.transition = 'opacity 0.4s ease-out';
        targetEl.style.opacity = targetOpacity;

        // 8. Final fresh render to clear temporary animation states
        await new Promise(r => setTimeout(r, 450));
        if (targetEl) {
            targetEl.style.transition = '';
            targetEl.style.opacity = '';
        }
        render();
    }

    if (typeof document !== 'undefined' && typeof module === 'undefined') {
        init();
    }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        state, CardFactory, BaseCard, init, availableCards, HEROES,
        playerBoardEl, playerHandEl, shopEl, rerollBtn, freezeBtn, tierUpBtn, tierStarsEl, endTurnBtn, cardTemplate,
        resolveShopDeaths, triggerLifeGain, findTarget,
        resolveCombatImpact, resolveDeaths, processDeaths, performAttack, triggerETB,
        applyTargetedEffect, applySpell, useCardFromHand, activateHeroPower, clearTargetingEffect, queueTargetingEffect,
        resolveDiscovery, toggleDiscoverySelection, confirmDiscovery, queueDiscovery,
        startShopTurn, tierUp, setAvailableCards, buyCard, pulseCardElement, rerollShop,
        checkHerreaReward, checkAutumnReward, resetTemporaryStats, sellCard,
        traverseCirrusea, traverseOnora, traverseAlTabaq, processTargetingQueue, processDiscoveryQueue
    };
}

if (typeof document !== 'undefined' && typeof module === 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // All top-level code has run, but we might need a specific entry point if needed
        });
    }
}
