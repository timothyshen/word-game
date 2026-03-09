# 锻造系统设计

## 概述

玩家通过探索和战斗收集材料，在铁匠铺锻造装备。锻造产出有随机品质升级机制。

## 数据模型

### 材料 — Entity 系统

```
EntitySchema: "material"
  components: ["stackable"]
  defaults: { stackable: { count: 1, maxStack: 99 } }
```

材料模板（EntityTemplate）：

| 名称 | 稀有度 | 来源 |
|------|--------|------|
| 铁矿石 | 普通 | 低级怪/探索 |
| 灵木 | 普通 | 探索 |
| 兽皮 | 精良 | 中级怪 |
| 秘银矿 | 稀有 | 中级怪/探索 |
| 陨铁 | 史诗 | Boss/高级探索 |
| 龙鳞 | 传说 | Boss |

材料 Entity state: `{ materialId, count }`。同玩家同材料堆叠（update count）。

### 配方 — Prisma 模型

```prisma
model CraftingRecipe {
  id             String   @id @default(cuid())
  name           String   @unique
  description    String   @default("")
  category       String   @default("equipment")
  requiredLevel  Int      @default(1)
  materials      String   // JSON: [{ materialTemplateId, count }]
  goldCost       Int      @default(0)
  outputType     String   // "equipment"
  outputId       String   // Equipment template ID
  baseRarity     String   // 产出基础稀有度
  craftTime      Int      @default(0)
  unlockBuilding String?  // 需要哪个建筑
  unlockLevel    Int?     // 建筑等级要求
}
```

### 随机品质系统

```
基础品质 → 精工(+1级稀有度, 15%) → 大师(+2级, 3%)
升级概率公式: base_chance + craftingQuality * 0.02
```

品质判定结果分布：
- 普通: 1 - upgrade_chance
- 精工(+1): upgrade_chance * 0.85
- 大师(+2): upgrade_chance * 0.15

## 核心流程

```
玩家选择配方 → 校验(等级、建筑、材料、金币) → 扣除材料+金币
  → 随机品质判定 → 创建装备 Entity → emit crafting:completed
```

## 引擎插件

```typescript
CraftingModule implements GamePlugin<CraftingConfig>

manifest = {
  name: "crafting",
  version: "1.0.0",
  provides: ["crafting:completed", "crafting:qualityUpgrade", "crafting:materialDrop"],
  requires: ["exploration:complete", "combat:victory"],
}
```

- 监听 `exploration:complete` / `combat:victory` → 材料掉落判定
- 锻造完成 emit `crafting:completed` → ProgressionModule 追踪

## 材料掉落

```
探索: 40% 掉材料，稀有度按区域等级
战斗: 30% 掉材料，稀有度按怪物等级
规则: GameRule crafting_material_drop
```

集成点：
- `combat.service.ts` — `processVictoryRewards()` 末尾
- `exploration.service.ts` — `exploreArea()` 结果中

## API 接口

```typescript
// 查询
crafting.getRecipes        — 可用配方列表（按建筑等级过滤）
crafting.getMyMaterials    — 玩家材料背包
crafting.getRecipeDetail   — 单个配方详情（含材料是否足够）

// 变更
crafting.craft             — 执行锻造（recipeId）
```

## 事件

```typescript
"crafting:completed":      { userId, recipeId, equipmentId, rarity, qualityTier }
"crafting:qualityUpgrade": { userId, recipeId, fromRarity, toRarity }
"crafting:materialDrop":   { userId, materialId, count, source }
```

## 文件结构

```
src/server/api/
  services/crafting.service.ts
  repositories/crafting.repo.ts
  routers/economy/crafting.ts
src/engine/modules/crafting.module.ts
src/components/game/panels/CraftingPanel.tsx  (后续)
```

## Seed 数据

- 6 个材料模板
- 11 个配方（每槽位 1 个基础配方）
- GameRule: `crafting_material_drop`, `crafting_quality_upgrade`
