# 领地与建筑系统

两套领地系统：内城（建筑放置）和外城（地块解锁）。

## 内城

**文件**: `src/server/api/services/innerCity.service.ts`

玩家在圆角矩形领地内放置建筑，带碰撞检测。

### 领地配置

```typescript
// InnerCityConfig 模型
{
  territoryWidth: 4.0,   // 从中心到边缘的半宽
  territoryHeight: 4.0,  // 从中心到边缘的半高
  cornerRadius: 1.5      // 圆角半径
}
// 尺寸来自 ruleService.getConfig("innercity_initial_territory")
```

### 建筑放置

1. 检查建筑卡是否存在且为建筑类型
2. 验证位置在领地范围内（圆角矩形检查）
3. 检查与现有建筑的碰撞（基于半径）
4. 创建 `InnerCityBuilding` 记录
5. 消耗卡牌实体
6. 发出 `territory:build` 事件

**碰撞检测**: `src/shared/building-radius.ts`
```typescript
getBuildingSize(name, level)  // 返回 { radius, visualW, visualH, height }
canPlaceBuilding(building, territory, existingBuildings)  // 布尔值
```

### 领地扩张

玩家可以使用扩张卡扩大领地尺寸：
- 倍率来自 `ruleService.getConfig("innercity_expand_multipliers")`
- 宽度和高度按倍率增加

### 建筑升级

- 费用来自 `ruleService.getConfig("innercity_upgrade_base_cost")` 按等级缩放
- 递增建筑等级

### 拆除

- 退还比例来自 `ruleService.getConfig("innercity_demolish_refund")`
- 移除 `InnerCityBuilding` 记录

### 建造评分

每次放置获得的分数来自 `ruleService.getConfig("innercity_build_score")`，记录在 `ActionLog` 中用于每日结算。

## 外城领地

**文件**: `src/server/api/services/territory.service.ts`

基于网格的领地地块，玩家通过探索解锁。

### 地块模型

```typescript
// TerritoryTile
{
  playerId, positionX, positionY,
  terrain: "grass" | "dirt" | "water" | "road",
  unlocked: boolean,
  unlockedAt?: DateTime,
  unlockCost?: string  // JSON: {gold, wood, stone}
}
```

### 解锁机制

- 必须与已解锁地块相邻（或中心点 0,0）
- 费用随距离和已解锁总数缩放：

```typescript
distance = abs(x) + abs(y)
distanceMultiplier = 1 + distance * 0.3
countMultiplier = 1 + floor(unlockedCount / 5) * 0.2
cost = baseCost * distanceMultiplier * countMultiplier
```

## 建筑系统

**文件**: `src/server/api/services/building.service.ts`

管理建筑实体（存储在实体系统中）和资源产出。

### 产出计算

```
output = baseOutput * levelMultiplier * workerBonus

levelMultiplier = 1 + (level - 1) * 0.3
workerBonus = hasWorker ? 1.5 : 1.0
```

建筑在其模板 `baseEffects` JSON 中定义产出：
```json
{
  "production": { "gold": 10, "wood": 5, "stone": 3 },
  "slot": "production"
}
```

### 工人分配

角色可以被分配到建筑以提升50%产出。角色实体的 `workingAt` 状态会被更新，建筑实体的 `assignedCharId` 状态记录被分配的角色。
