# Rule Engine

Centralized game balance system supporting formulas, configs, weighted random, and conditions. All game constants are stored as `GameRule` records in the database.

**Location**: `src/engine/rules/`, `src/engine/core/`

## Architecture

```
GameRule (DB record)
    |-- name, category, ruleType, definition (JSON)
    v
GameRuleService (retrieval + caching)
    |-- getFormula(), getConfig(), getWeights(), getCondition()
    v
FormulaEngine / RuleEngine (evaluation)
    |-- calculate(), evaluate(), weightedRandom()
```

## Rule Types

### Formula
Mathematical expressions evaluated with variables using mathjs.

```typescript
// DB: { ruleType: "formula", definition: '{"formula":"100 * pow(1.15, level - 1)"}' }
const formula = await ruleService.getFormula("player_exp_required");
const exp = engine.formulas.calculate(formula, { level: 5 }); // ~610
```

### Config
Static JSON values for lookups and constants.

```typescript
// DB: { ruleType: "config", definition: '{"value":5}' }
const config = await ruleService.getConfig<{ value: number }>("altar_stamina_cost");
// config.value === 5
```

### Weighted Random
Probability distributions for gacha/loot.

```typescript
// DB: { ruleType: "weighted_random", definition: '[{"value":"Common","weight":60},...]' }
const weights = await ruleService.getWeights("altar_basic_weights");
const rarity = engine.rules.weightedRandom(weights); // "Common" 60% of the time
```

### Condition
Logical predicates for unlock checks (supports AND/OR/NOT/formula).

```typescript
const condition = await ruleService.getCondition("unlock_fire_realm");
const canUnlock = engine.rules.evaluate(condition, { level: 10, tier: 2 });
```

## GameRuleService

**File**: `src/engine/rules/GameRuleService.ts`

- 5-minute TTL cache per rule
- Lazy-loads from DB on first access
- `invalidateCache()` to force refresh

```typescript
const ruleService = new GameRuleService(db, stateManager);

await ruleService.getRule(name)              // Full record
await ruleService.getRulesByCategory(cat)    // All rules in category
await ruleService.getFormula(name)           // Returns formula string
await ruleService.getConfig<T>(name)         // Returns parsed JSON
await ruleService.getWeights(name)           // Returns WeightedItem[]
await ruleService.getCondition(name)         // Returns Condition object
```

## FormulaEngine

**File**: `src/engine/core/FormulaEngine.ts`

Uses mathjs for safe expression evaluation.

```typescript
engine.formulas.calculate(formula, variables)
// Supports: +, -, *, /, pow, floor, ceil, max, min, sqrt, random
```

## RuleEngine

**File**: `src/engine/core/RuleEngine.ts`

Evaluates conditions and performs weighted random selection.

**Condition Types**: `gte`, `lte`, `eq`, `has`, `and`, `or`, `not`, `formula`

```typescript
engine.rules.evaluate(condition, context)    // Boolean result
engine.rules.weightedRandom(weights)         // Selected value string
```

## Seed Rules

**File**: `src/engine/rules/seed-rules.ts`

Pre-defined rules loaded during database seeding.

| Category | Examples |
|----------|----------|
| player | exp_required, max_level, skill_slots, stat_growth, initial_resources |
| combat | base_damage, crit_chance, monster_scaling, reward_exp |
| altar | basic/sacred/ancient_weights, stamina_cost |
| economy | building_output_multiplier, worker_bonus |
| exploration | stamina_cost, resource_scaling, monster_level |
| settlement | grade_thresholds, streak_threshold, reward_multiplier |
| equipment | max_enhance, rarity_multipliers, enhance_success, enhance_cost |
| breakthrough | tier requirements, level_cap_increase, skill_slots formula |
| shop | items catalog, sell_prices |
| innercity | initial_territory, expand_multipliers, upgrade_cost, demolish_refund |

## Integration Pattern

Services access rules via the singleton `ruleService`:

```typescript
import { engine, ruleService } from "~/server/api/engine";

// In a service function:
const formula = await ruleService.getFormula("combat_base_damage");
const damage = engine.formulas.calculate(formula, { atk: 20, def: 8 });
```
