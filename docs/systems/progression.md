# Progression Systems

Settlement, breakthrough, profession, and achievement systems that drive player advancement.

## Daily Settlement

**File**: `src/server/api/services/settlement.service.ts`

Players earn action points throughout the day and claim rewards during settlement.

### Scoring

Actions recorded in `ActionLog` with base scores:
- Exploration: 40 points
- Building upgrade: 30 * level points
- Combat victory: varies by difficulty
- Building production: floor(totalOutput / 10)

### Grades

Thresholds from `ruleService.getConfig("settlement_grade_thresholds")`:

| Grade | Min Score |
|-------|-----------|
| S | 500 |
| A | 400 |
| B | 300 |
| C | 200 |
| D | 0 |

### Streak System

Consecutive days reaching the streak threshold earn bonus rewards:
- Threshold from `ruleService.getConfig("settlement_streak_threshold")`
- 3-day streak reward from `ruleService.getConfig("settlement_streak_3_reward")`
- 7-day streak reward from `ruleService.getConfig("settlement_streak_7_reward")`

### Grade Rewards

Card chests awarded by grade from `ruleService.getConfig("settlement_grade_chests")`. Higher grades give better rarity chances.

### Flow

```
1. Player requests settlement for current day
2. Sum all ActionLog entries for that day
3. Calculate grade from total score
4. Check streak (consecutive days above threshold)
5. Distribute rewards (gold, EXP, cards)
6. Record in SettlementLog
7. Player must manually claim
```

## Tier Breakthrough

**File**: `src/server/api/services/breakthrough.service.ts`

Tier advancement increases level cap and skill slots.

### Player Breakthrough

```
Requirements from ruleService.getConfig("breakthrough_tier_${currentTier}"):
  - Gold, crystals, exp costs
  - Minimum level requirement

Effects:
  - tier += 1
  - maxLevel += ruleService.getConfig("breakthrough_level_cap_increase")
  - skillSlots = ruleService.getFormula("player_skill_slots") evaluated with new tier
```

### Character Breakthrough

Same pattern but applied to character entities. Updates character entity state with new tier and derived stats.

## Profession System

**File**: `src/server/api/services/profession.service.ts`

Players and characters can learn professions for stat bonuses.

### Learning

- Check unlock conditions (level, tier, etc.)
- Create `PlayerProfession` or `CharacterProfession` record
- Character professions reference Entity ID via `playerCharacterId`

### Bonuses

Each profession provides stat multipliers:
```json
{
  "bonuses": {
    "attack": 1.1,    // +10% attack
    "defense": 1.05,  // +5% defense
    "speed": 1.0      // no change
  }
}
```

## Achievement System

**File**: `src/server/api/services/achievement.service.ts`

Track milestones and reward claims.

### Achievement Categories

| Category | Examples |
|----------|---------|
| building | First building, 5 buildings, 10 buildings, max level 5 |
| combat | First win, 10 wins, 50 wins, boss kill |
| exploration | 5 areas, 20 areas, world traveler |
| collection | 10 cards, 30 cards, 5 characters |
| special | 1000 gold earned, level 10, tier 2, 7-day streak |

### Progress Tracking

Progress is computed on-the-fly from player state and Entity queries:
- `buildings_count` -> count building entities
- `max_building_level` -> max level from building entity states
- `characters_count` -> count character entities
- `unique_cards` -> count card entities
- `combat_wins` -> player.combatWins
- `boss_kills` -> player.bossKills
- `total_gold_earned` -> player.totalGoldEarned

### Claim Flow

```
1. Verify achievement exists and is not yet claimed
2. Compute current progress
3. Check if progress >= target value
4. Record PlayerAchievement
5. Grant rewards (gold, crystals, EXP, card by rarity)
```

## Equipment System

**File**: `src/server/api/services/equipment.service.ts`

11-slot equipment with enhancement.

### Slots

mainHand, offHand, helmet, chest, belt, gloves, pants, boots, necklace, ring1, ring2

### Enhancement

- Max level from `ruleService.getConfig("equipment_max_enhance")`
- Success rate from `ruleService.getFormula("equipment_enhance_success")` (decreases with level)
- Cost from `ruleService.getFormula("equipment_enhance_cost")` (increases with level)
- Rarity multipliers from `ruleService.getConfig("equipment_rarity_multipliers")`

### Equipment Entity State

```typescript
{
  enhanceLevel: number,
  equippedBy: string | null,  // Character entity ID
  slot: string | null          // Which slot it occupies
}
```

## Portal System

**File**: `src/server/api/services/portal.service.ts`

Travel between realm worlds.

### Realms

| Realm | Unlock Condition |
|-------|-----------------|
| Main (主位面) | Default |
| Fire (火焰位面) | Defeat fire guardian |
| Ice (寒冰位面) | Defeat ice guardian |
| Shadow (暗影位面) | Defeat shadow guardian |
| Celestial (天界) | Defeat celestial guardian |

### Portal Guardian Challenge

Portals appear as wilderness facilities. Players must defeat the guardian (power-based calculation using player + character stats from Entity system) to unlock travel to that realm.
