# 规则引擎

集中式游戏平衡系统，支持公式、配置、加权随机和条件。所有游戏常量存储为数据库中的 `GameRule` 记录。

**位置**: `src/engine/rules/`, `src/engine/core/`

## 架构

```
GameRule（数据库记录）
    |-- name, category, ruleType, definition (JSON)
    v
GameRuleService（检索 + 缓存）
    |-- getFormula(), getConfig(), getWeights(), getCondition()
    v
FormulaEngine / RuleEngine（求值）
    |-- calculate(), evaluate(), weightedRandom()
```

## 规则类型

### 公式 (Formula)
使用 mathjs 进行带变量的数学表达式求值。

```typescript
// 数据库: { ruleType: "formula", definition: '{"formula":"100 * pow(1.15, level - 1)"}' }
const formula = await ruleService.getFormula("player_exp_required");
const exp = engine.formulas.calculate(formula, { level: 5 }); // ~610
```

### 配置 (Config)
用于查找和常量的静态 JSON 值。

```typescript
// 数据库: { ruleType: "config", definition: '{"value":5}' }
const config = await ruleService.getConfig<{ value: number }>("altar_stamina_cost");
// config.value === 5
```

### 加权随机 (Weighted Random)
用于抽卡/掉落的概率分布。

```typescript
// 数据库: { ruleType: "weighted_random", definition: '[{"value":"Common","weight":60},...]' }
const weights = await ruleService.getWeights("altar_basic_weights");
const rarity = engine.rules.weightedRandom(weights); // 60% 概率为 "Common"
```

### 条件 (Condition)
用于解锁检查的逻辑谓词（支持 AND/OR/NOT/formula）。

```typescript
const condition = await ruleService.getCondition("unlock_fire_realm");
const canUnlock = engine.rules.evaluate(condition, { level: 10, tier: 2 });
```

## GameRuleService

**文件**: `src/engine/rules/GameRuleService.ts`

- 每条规则 5 分钟 TTL 缓存
- 首次访问时从数据库延迟加载
- `invalidateCache()` 强制刷新

```typescript
const ruleService = new GameRuleService(db, stateManager);

await ruleService.getRule(name)              // 完整记录
await ruleService.getRulesByCategory(cat)    // 某分类下所有规则
await ruleService.getFormula(name)           // 返回公式字符串
await ruleService.getConfig<T>(name)         // 返回解析后的 JSON
await ruleService.getWeights(name)           // 返回 WeightedItem[]
await ruleService.getCondition(name)         // 返回 Condition 对象
```

## FormulaEngine

**文件**: `src/engine/core/FormulaEngine.ts`

使用 mathjs 进行安全的表达式求值。

```typescript
engine.formulas.calculate(formula, variables)
// 支持: +, -, *, /, pow, floor, ceil, max, min, sqrt, random
```

## RuleEngine

**文件**: `src/engine/core/RuleEngine.ts`

执行条件判断和加权随机选择。

**条件类型**: `gte`, `lte`, `eq`, `has`, `and`, `or`, `not`, `formula`

```typescript
engine.rules.evaluate(condition, context)    // 布尔结果
engine.rules.weightedRandom(weights)         // 选中的值字符串
```

## 种子规则

**文件**: `src/engine/rules/seed-rules.ts`

数据库初始化时加载的预定义规则。

| 分类 | 示例 |
|------|------|
| player | exp_required, max_level, skill_slots, stat_growth, initial_resources |
| combat | base_damage, crit_chance, monster_scaling, reward_exp |
| altar | basic/sacred/ancient_weights, stamina_cost |
| economy | building_output_multiplier, worker_bonus |
| exploration | stamina_cost, resource_scaling, monster_level |
| settlement | grade_thresholds, streak_threshold, reward_multiplier |
| equipment | max_enhance, rarity_multipliers, enhance_success, enhance_cost |
| breakthrough | tier 需求, level_cap_increase, skill_slots 公式 |
| shop | items 目录, sell_prices |
| innercity | initial_territory, expand_multipliers, upgrade_cost, demolish_refund |

## 集成模式

服务通过单例 `ruleService` 访问规则：

```typescript
import { engine, ruleService } from "~/server/api/engine";

// 在服务函数中:
const formula = await ruleService.getFormula("combat_base_damage");
const damage = engine.formulas.calculate(formula, { atk: 20, def: 8 });
```
