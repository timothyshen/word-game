# 游戏引擎架构设计

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前硬编码的游戏系统重构为数据驱动、模块可插拔、支持多游戏复用的游戏引擎

**Architecture:** 在现有 Router → Service → Repository 三层架构中插入 Engine Core 层，通过 EventBus 实现模块间通信，RuleEngine/FormulaEngine 实现数据驱动

**Tech Stack:** TypeScript, Prisma, tRPC, math.js (公式计算)

---

## Part 1: Engine Core — 引擎核心架构

### 当前架构 vs 引擎架构

```
当前:  Router → Service → Repository (Prisma)
引擎:  Router → Service → Engine Core → Repository

Engine Core:
  ├── EventBus        — 模块间异步通信
  ├── RuleEngine      — 条件判断 & 规则评估
  ├── FormulaEngine   — 数值计算 & 公式求值
  ├── ModuleRegistry  — 模块生命周期管理
  └── StateManager    — 运行时状态 & 缓存
```

### 核心组件职责

#### EventBus — 事件总线

模块间通过事件通信，彻底解耦：

```typescript
interface GameEvent {
  type: string;           // "combat:victory", "exploration:complete"
  payload: unknown;
  timestamp: number;
  source: string;         // 发射模块名
}

class EventBus {
  private listeners: Map<string, Set<EventHandler>>;

  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, payload: unknown): Promise<void>;

  // 支持通配符: "combat:*" 监听所有战斗事件
  // 支持优先级: 高优先级 handler 先执行
}
```

事件流示例：
```
combat:victory → achievement.check → player.addExp → ui.showReward
exploration:complete → card.drop → inventory.add → ui.notify
building:upgrade → economy.recalculate → ui.refresh
```

#### RuleEngine — 规则引擎

所有游戏逻辑条件从代码迁移到数据库：

```typescript
class RuleEngine {
  // 评估条件（从 GameRule 表读取）
  evaluate(ruleName: string, context: Record<string, unknown>): boolean;

  // 加权随机（掉落表、事件触发等）
  weightedRandom(tableName: string, context: Record<string, unknown>): string;

  // 批量规则匹配
  findMatchingRules(category: string, context: Record<string, unknown>): GameRule[];
}
```

#### FormulaEngine — 公式引擎

所有数值计算公式可配置：

```typescript
class FormulaEngine {
  // 计算公式（安全的数学表达式，不用 eval）
  calculate(formulaName: string, variables: Record<string, number>): number;

  // 示例公式（存在 GameRule 表中）:
  // "stamina_recovery": "floor((now - lastUpdate) / 300) * (1 + recoveryBonus)"
  // "building_output": "baseOutput * level * (1 + workerBonus * 0.5)"
  // "combat_damage": "atk * skillMultiplier - def * 0.5"
}
```

#### ModuleRegistry — 模块注册中心

```typescript
class ModuleRegistry {
  register(module: GameModule): void;
  get(name: string): GameModule;
  getAll(): GameModule[];

  // 按依赖顺序初始化所有模块
  initAll(engine: GameEngine): Promise<void>;
  // 按逆序销毁
  destroyAll(): Promise<void>;
}
```

#### StateManager — 状态管理器

```typescript
class StateManager {
  // 运行时缓存（战斗状态等，替代当前的 Map）
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;

  // 规则缓存（避免每次查数据库）
  getRuleCached(ruleName: string): GameRule;
  invalidateRuleCache(): void;
}
```

---

## Part 2: Module System — 模块系统设计

### GameModule 接口

```typescript
interface GameModule {
  name: string;
  dependencies?: string[];  // 依赖的其他模块

  init(engine: GameEngine): Promise<void>;
  handleEvent?(event: GameEvent): Promise<void>;
  destroy?(): Promise<void>;
}

interface GameEngine {
  events: EventBus;
  rules: RuleEngine;
  formulas: FormulaEngine;
  modules: ModuleRegistry;
  state: StateManager;
  db: PrismaClient;
}
```

### 8个游戏模块

| 模块 | 当前文件 | 职责 | 监听事件 | 发射事件 |
|------|----------|------|----------|----------|
| `core` | player, auth | 玩家基础、认证 | `*:expGain` | `player:levelUp` |
| `combat` | combat, boss | 战斗系统 | `exploration:encounter` | `combat:victory`, `combat:defeat` |
| `exploration` | exploration | 探索系统 | `player:staminaUse` | `exploration:complete`, `exploration:encounter` |
| `economy` | building, shop | 建筑、商店、资源 | `settlement:daily` | `economy:output`, `economy:transaction` |
| `progression` | card, altar, equipment, breakthrough, profession, achievement | 卡牌、装备、成长 | `combat:victory`, `exploration:complete` | `card:acquired`, `equipment:changed` |
| `content` | story, character | 剧情、角色 | `player:levelUp` | `story:completed`, `character:recruited` |
| `territory` | territory, innerCity, portal | 领地、传送 | `building:built` | `territory:expanded` |
| `settlement` | settlement | 每日结算 | `system:dailyReset` | `settlement:daily` |

### 模块间事件流示例

```
玩家探索 → exploration 模块
  → emit("exploration:encounter", { monsterType: "dragon" })
  → combat 模块收到 → 开始战斗
    → emit("combat:victory", { rewards: [...], bossId: null })
    → progression 模块收到 → 检查成就、发放卡牌
      → emit("card:acquired", { cardId: "fire_sword" })
    → core 模块收到 → 增加经验
      → emit("player:levelUp", { newLevel: 10 })
      → content 模块收到 → 解锁新剧情章节
```

### 模块注册

```typescript
// src/engine/modules/index.ts
export function registerAllModules(engine: GameEngine) {
  engine.modules.register(new CoreModule());
  engine.modules.register(new CombatModule());
  engine.modules.register(new ExplorationModule());
  engine.modules.register(new EconomyModule());
  engine.modules.register(new ProgressionModule());
  engine.modules.register(new ContentModule());
  engine.modules.register(new TerritoryModule());
  engine.modules.register(new SettlementModule());
}
```

### 新游戏复用

创建新游戏时，只需选择需要的模块：

```typescript
// 新游戏只用战斗和卡牌
const engine = createEngine({
  modules: [CoreModule, CombatModule, ProgressionModule],
  rules: "sci-fi-game-rules",  // 加载不同的规则集
});
```

---

## Part 3: Rule & Formula Engine — 规则与公式引擎

### 规则 DSL（JSON 格式）

所有游戏条件逻辑用 JSON 定义，存在数据库：

```typescript
// 条件类型
type Condition =
  | { type: "gte"; field: string; value: number }      // >= 比较
  | { type: "lte"; field: string; value: number }      // <= 比较
  | { type: "eq"; field: string; value: unknown }       // == 比较
  | { type: "has"; field: string }                       // 存在检查
  | { type: "and"; conditions: Condition[] }             // 逻辑与
  | { type: "or"; conditions: Condition[] }              // 逻辑或
  | { type: "not"; condition: Condition }                // 逻辑非
  | { type: "formula"; expression: string; operator: string; value: number }
  | { type: "weighted_random"; weights: Array<{ value: string; weight: number }> };
```

### 规则示例

**Boss 解锁条件**（当前硬编码在 boss.service.ts）：
```json
{
  "name": "boss_unlock_fire_dragon",
  "category": "boss",
  "ruleType": "condition",
  "definition": {
    "type": "and",
    "conditions": [
      { "type": "gte", "field": "player.level", "value": 10 },
      { "type": "gte", "field": "player.tier", "value": 2 },
      { "type": "eq", "field": "player.currentWorld", "value": "fire_realm" }
    ]
  }
}
```

**卡牌掉落概率**（当前硬编码在 altar.service.ts）：
```json
{
  "name": "altar_normal_rates",
  "category": "altar",
  "ruleType": "weighted_random",
  "definition": {
    "type": "weighted_random",
    "weights": [
      { "value": "普通", "weight": 60 },
      { "value": "精良", "weight": 25 },
      { "value": "稀有", "weight": 10 },
      { "value": "史诗", "weight": 4 },
      { "value": "传说", "weight": 1 }
    ]
  }
}
```

### 公式示例

**体力恢复**（当前在 player-utils.ts 硬编码）：
```json
{
  "name": "stamina_recovery",
  "category": "player",
  "ruleType": "formula",
  "definition": {
    "expression": "floor((now - lastUpdate) / interval) * rate",
    "variables": {
      "interval": 300,
      "rate": 1
    },
    "description": "每5分钟恢复1点体力"
  }
}
```

**建筑产出**（当前在 shared/effects.ts）：
```json
{
  "name": "building_output",
  "category": "economy",
  "ruleType": "formula",
  "definition": {
    "expression": "baseOutput * level * (1 + workerBonus * 0.5)",
    "variables": {
      "workerBonus": "hasWorker ? 1 : 0"
    }
  }
}
```

**战斗伤害**（当前在 combat.service.ts）：
```json
{
  "name": "combat_damage",
  "category": "combat",
  "ruleType": "formula",
  "definition": {
    "expression": "max(1, atk * skillMultiplier - def * 0.5 + random(-variance, variance))",
    "variables": {
      "variance": 5
    }
  }
}
```

### FormulaEngine 实现

使用安全的数学表达式解析器（math.js 或自定义），**绝不使用 eval**：

```typescript
import { evaluate } from "mathjs";

class FormulaEngine {
  private cache: Map<string, string> = new Map();

  async calculate(
    formulaName: string,
    variables: Record<string, number>,
  ): Promise<number> {
    const formula = this.cache.get(formulaName)
      ?? await this.loadFormula(formulaName);

    // math.js 安全求值，只支持数学运算
    return evaluate(formula, variables) as number;
  }

  private async loadFormula(name: string): Promise<string> {
    const rule = await db.gameRule.findUnique({ where: { name } });
    if (!rule) throw new Error(`Formula not found: ${name}`);
    const def = JSON.parse(rule.definition) as { expression: string };
    this.cache.set(name, def.expression);
    return def.expression;
  }
}
```

### GameRule Prisma 模型

```prisma
model GameRule {
  id          String   @id @default(cuid())
  name        String   @unique      // "stamina_recovery", "boss_unlock_fire_dragon"
  category    String                // "player", "combat", "altar", "boss", "economy"
  ruleType    String                // "formula", "condition", "weighted_random", "config"
  definition  String                // JSON DSL
  description String   @default("") // 管理后台显示的说明
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
}
```

### 需要迁移的硬编码规则（约50条）

| 类别 | 数量 | 示例 |
|------|------|------|
| 玩家数值 | ~8 | 体力恢复、经验曲线、等级上限 |
| 战斗公式 | ~10 | 伤害计算、暴击率、防御减伤 |
| 掉落概率 | ~8 | 祭坛抽卡、探索掉落、Boss奖励 |
| 经济平衡 | ~10 | 建筑产出、升级成本、商店价格 |
| 解锁条件 | ~8 | Boss解锁、剧情解锁、传送解锁 |
| 其他配置 | ~6 | 结算评级、职阶要求、保底计数 |

---

## Part 4: Entity/Data Model — 数据层演进

### 数据架构变化

```
当前:  Player → PlayerCharacter → Character (模板)
引擎:  Game → GameInstance → Entity → EntityTemplate → EntitySchema
```

### 三层分离：Schema + Template + Entity

**EntitySchema** — 定义实体类型的结构（类似 class）：
```typescript
{
  name: "character",
  components: ["stats", "equipment", "skills", "position"],
  defaultValues: { "stats.hp": "{formula:base_hp}", "stats.mp": "{formula:base_mp}" }
}
```

**EntityTemplate** — 具体模板（类似 preset）：
```typescript
// 当前的 Character 表 → 变成 EntityTemplate
{ schema: "character", name: "火焰法师", data: { stats: { atk: 50 }, skills: ["fireball"] } }
```

**Entity** — 运行时实例（类似 object）：
```typescript
// 当前的 PlayerCharacter → 变成 Entity
{ templateId: "火焰法师", ownerId: player.id, state: { hp: 100, level: 5 } }
```

### 组件化存储（ECS-lite）

不用完整 ECS，但借鉴组件思想。每个实体的数据按组件分组存储在 JSON 字段中：

| 组件 | 数据 | 适用于 |
|------|------|--------|
| `stats` | hp, mp, atk, def | character, monster, boss |
| `inventory` | items[], capacity | player, chest |
| `position` | x, y, worldId | player, npc |
| `production` | output, interval | building |
| `equipment` | slots{} | character |

### Prisma 模型演进

```prisma
model Game {
  id       String         @id @default(cuid())
  name     String         @unique
  config   String         // JSON: 游戏全局配置
  schemas  EntitySchema[]
  rules    GameRule[]
}

model EntitySchema {
  id         String           @id @default(cuid())
  gameId     String
  name       String           // "character", "building", "item"
  components String           // JSON: 组件定义列表
  game       Game             @relation(fields: [gameId], references: [id])
  templates  EntityTemplate[]

  @@unique([gameId, name])
}

model EntityTemplate {
  id       String       @id @default(cuid())
  schemaId String
  name     String
  data     String       // JSON: 默认组件数据
  icon     String       @default("")
  rarity   String?
  schema   EntitySchema @relation(fields: [schemaId], references: [id])
  entities Entity[]
}

model Entity {
  id         String         @id @default(cuid())
  templateId String
  ownerId    String         // 归属玩家
  state      String         // JSON: 运行时状态
  template   EntityTemplate @relation(fields: [templateId], references: [id])
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([ownerId])
  @@index([templateId])
}
```

### 迁移兼容

关键原则：**现有表保留，新系统并行运行**。

1. 新功能用 EntitySchema/Template/Entity
2. 旧表通过适配器包装成组件接口
3. 逐步迁移，一个模块一个模块来

当前所有 `Character`、`Building`、`Card` 等表在迁移期间继续工作。

---

## Part 5: 迁移策略 — 渐进式引擎化

核心原则：**不停机、不重写，逐层渐进**。

### Phase 1: 基础设施层（1-2周）

搭建引擎骨架，不改动任何现有功能：

```
新增文件:
src/engine/
  ├── core/
  │   ├── EventBus.ts
  │   ├── RuleEngine.ts
  │   ├── FormulaEngine.ts
  │   ├── ModuleRegistry.ts
  │   └── StateManager.ts
  ├── types.ts
  └── index.ts
```

验证方式：写单元测试覆盖所有核心组件，不影响游戏运行。

### Phase 2: 规则外置化（2-3周）

把散落在代码中的魔法数字迁移到 `GameRule` 表：

1. 添加 `GameRule` Prisma 模型，`bun prisma db push`
2. 种子数据写入当前所有硬编码规则（~50条）
3. Service 层逐个替换：`STAMINA_RECOVERY_RATE` → `ruleEngine.getFormula("stamina_recovery_rate")`
4. 每替换一个，跑测试确认行为不变

阶段成果：管理后台可以直接调整游戏数值，不需要改代码重新部署。

### Phase 3: 模块化封装（3-4周）

把现有 Service 包装成 GameModule：

```typescript
class CombatModule implements GameModule {
  name = "combat";

  init(engine: GameEngine) {
    engine.events.on("combat:start", this.handleStart);
    engine.events.on("combat:action", this.handleAction);
  }

  handleStart = async (data) => {
    const result = await startCombat(engine.db, data);
    engine.events.emit("combat:started", result);
  };
}
```

关键：现有 service 函数不删除，Module 只是包装层。Router 可以选择直接调 service 或通过 engine。

### Phase 4: 实体系统（4-6周，可选）

仅在需要支持多游戏时才做：

1. 添加 `Game`、`EntitySchema`、`EntityTemplate`、`Entity` 模型
2. 新功能用实体系统开发
3. 旧模型通过适配器兼容
4. 逐步迁移，优先迁移变动少的（如 Card、Building）

### 风险控制

| 风险 | 对策 |
|------|------|
| 性能退化 | FormulaEngine 结果缓存，热路径跳过规则查询 |
| 功能回归 | 每个替换点前后跑完整测试 |
| 过度抽象 | 只抽象已重复3次以上的模式 |
| 团队认知 | 每个 Phase 写 ARCHITECTURE.md 更新 |

---

## 文件结构预览

```
src/engine/
  ├── core/
  │   ├── EventBus.ts
  │   ├── RuleEngine.ts
  │   ├── FormulaEngine.ts
  │   ├── ModuleRegistry.ts
  │   ├── StateManager.ts
  │   └── __tests__/
  ├── modules/
  │   ├── core.module.ts
  │   ├── combat.module.ts
  │   ├── exploration.module.ts
  │   ├── economy.module.ts
  │   ├── progression.module.ts
  │   ├── content.module.ts
  │   ├── territory.module.ts
  │   └── settlement.module.ts
  ├── types.ts
  └── index.ts
```
