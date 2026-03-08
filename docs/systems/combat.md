# Combat System

Two combat systems: inner city turn-based RPG combat and outer city hero-vs-POI combat.

## Inner City Combat

**File**: `src/server/api/services/combat.service.ts`

Turn-based text RPG combat with skills, buffs, and rewards.

### Flow

```
1. initiateCombat(characterId, monsterLevel)
   -> Generate monster from level
   -> Store combat state in engine.state
   -> Return initial state

2. resolveTurn(combatId, actionId)
   -> Resolve player action (damage/heal/buff)
   -> Monster turn (AI action)
   -> Apply buffs/debuffs
   -> Check victory/defeat

3. Victory: EXP + gold + card drop chance
   Defeat: No penalty (return to idle)
```

### Combat Unit

```typescript
interface CombatUnit {
  id: string;
  name: string;
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  attack: number; defense: number;
  speed: number; luck: number;
  buffs: CombatBuff[];
}
```

### Actions

| Action | MP Cost | Effect |
|--------|---------|--------|
| Attack | 0 | 1.0x physical damage |
| Heavy Strike | 10 | 1.5x damage, -30% DEF next turn |
| Defend | 0 | 50% damage reduction, +10 MP |
| Fireball | 20 | 1.0x magic damage |
| Heal | 25 | Restore 30% max HP |
| Flee | 0 | Escape chance = min(0.9, 0.5 + speed * 0.01) |

### Damage Formula

```
baseDamage = max(1, atk - def * 0.5)
variance   = 0.9 + random * 0.2
critChance = 0.1 + luck * 0.005
critMult   = 1.5
```

### Monster Generation

```typescript
const MONSTERS = ["野狼", "哥布林", "骷髅兵", "石头人", "暗影刺客", "火焰元素"];

// Stats scale with level:
hp      = baseHp + level * 10
attack  = baseAtk + level * 1.5
defense = baseDef + level * 0.5
```

### Rewards

- EXP: `15 * monsterLevel`
- Gold: `10 * monsterLevel`
- Card drop: probability `0.1 + level * 0.03`

## Outer City Combat

**File**: `src/server/api/services/worldCombat.service.ts`

Hero-based combat against POI guardians on the world map.

### Differences from Inner Combat

| Aspect | Inner City | Outer City |
|--------|-----------|-----------|
| Unit | Player character | Deployed hero |
| Enemy | Random monster | POI guardian |
| Location | Combat screen | World map tile |
| Stamina | Player stamina | Hero stamina |
| Rewards | EXP, gold, cards | Territory conquest, loot |

### POI Combat Flow

```
1. Hero moves to combatable POI (garrison, lair, ruin)
2. startCombat(heroId, poiId)
   -> Verify hero is at POI position
   -> Set hero status = "fighting"
   -> Generate enemy from POI difficulty
   -> Return combat state with hero/enemy stats

3. performAction(heroId, poiId, action, heroHp, enemyHp, turn)
   -> Apply inner city bonuses to hero stats
   -> Resolve action (attack/defend/skill/flee)
   -> Enemy counterattack
   -> Check victory/defeat

4. Victory:
   -> POI marked as defeated (respawns in 24h)
   -> Gold + EXP rewards
   -> Character entity EXP updated
   -> Hero status = "idle"

5. Defeat:
   -> Hero stamina reduced
   -> Character HP set to 30% max
   -> Hero status = "idle"
```

### Enemy Stats from POI

```typescript
enemyLevel = poi.guardianLevel || poi.difficulty
hp  = 50 + level * 20
atk = 8 + level * 3
def = 3 + level * 2
```

### Inner City Bonuses

Combat applies bonuses from inner city buildings:
- Attack bonus: `heroAtk * (1 + cityBonuses.attackBonus)`
- Defense bonus: `heroDef * (1 + cityBonuses.defenseBonus)`

### Hero Character Resolution

Since HeroInstance references Entity (not PlayerCharacter), hero stats are resolved via:

```typescript
// src/server/api/utils/hero-utils.ts
const { state, template } = await resolveHeroCharacter(db, entities, hero.characterId);
// state: { hp, maxHp, attack, defense, speed, ... }
// template: { name, portrait }
```

## Boss Combat

**File**: `src/server/api/services/boss.service.ts`

Weekly boss challenges with attempt limits.

### Flow

```
1. Check unlock conditions (tier, level, world)
2. Check weekly attempt limit (resets Monday)
3. Consume stamina (30)
4. Calculate power:
   playerPower = strength*3 + agility*2 + intellect*2
   charactersPower = sum(char.attack + char.defense + char.speed) for all chars
   bossPower = boss.attack + boss.defense*0.5 + boss.hp*0.01
5. Win chance = min(0.9, max(0.1, powerRatio * 0.5))
6. Victory: gold, crystals, EXP, chest, equipment drop
```

### Weekly Reset

Boss attempts reset when `weekStartDate < getWeekStartDate()` (Monday 00:00).
