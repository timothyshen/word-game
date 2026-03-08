# 世界探索系统

外城是基于网格的世界地图，英雄在此探索、战斗、收集资源。

## 英雄系统

**文件**: `src/server/api/services/worldHeroes.service.ts`

英雄是部署到外部世界的角色实体。

### HeroInstance 模型

```typescript
{
  id: string,
  playerId: string,
  characterId: string,  // 引用角色 Entity
  positionX: number,
  positionY: number,
  status: "idle" | "moving" | "exploring" | "fighting",
  stamina: number       // 0-100
}
```

### 操作

| 动作 | 说明 |
|------|------|
| 部署 | 从角色实体创建 HeroInstance，位置在 (0,0) |
| 召回 | 删除 HeroInstance，角色返回内城 |
| 休息 | 消耗食物，恢复体力（基础 30 + 城市加成） |

### 角色数据解析

由于 HeroInstance.characterId 引用 Entity，角色属性通过以下方式解析：
```typescript
import { resolveHeroCharacter } from "../utils/hero-utils";
const { state, template } = await resolveHeroCharacter(db, entities, hero.characterId);
// state: CharacterEntityState (hp, attack, defense, speed, ...)
// template: { name, portrait }
```

## 世界地图

**文件**: `src/server/api/services/worldMap.service.ts`

### 地图状态

返回：
- `heroes` - 所有已部署的 HeroInstance 记录
- `exploredAreas` - 已发现的地块及探索等级
- `availableCharacters` - 尚未部署为英雄的角色实体
- `pois` - 地图上的兴趣点

### 移动

```
1. 英雄必须处于 "idle" 状态（非战斗中）
2. 目标必须相邻（曼哈顿距离 = 1）
3. 消耗英雄体力（每次移动 5 点）
4. 更新英雄位置
5. 发现目标地块（explorationLevel = 2）
6. 设置相邻地块为迷雾（explorationLevel = 1）
7. 检查目标位置是否有 POI
8. 若无 POI: 触发随机事件的概率（新地块 50%, 已探索 30%）
```

### 探索等级

| 等级 | 状态 | 含义 |
|------|------|------|
| 0 | 隐藏 | 尚未发现 |
| 1 | 迷雾 | 与已探索地块相邻，无详情 |
| 2 | 可见 | 完全探索，详情可见 |

## 兴趣点 (POI)

**文件**: `src/server/api/services/worldPoi.service.ts`

### POI 类型

| 类型 | 交互方式 | 战斗? |
|------|----------|-------|
| `resource` | 直接采集资源 | 否 |
| `garrison` | 驻军哨所 | 是 |
| `lair` | 怪物巢穴 | 是 |
| `ruin` | 带宝藏的古代遗迹 | 是 |
| `shrine` | 祝福/增益地点 | 否 |
| `caravan` | 贸易遭遇 | 否 |

### POI 交互流程

```
英雄在 POI 位置 -> interactWithPOI()
  -> resource: 发放金币/木材/石材/食物
  -> garrison/lair/ruin: 开始战斗（见 combat.md）
  -> shrine: 恢复体力或属性增益
  -> caravan: 随机交易（金币换其他资源）
```

### 资源采集

```typescript
// 资源 POI
{
  resourceType: "wood" | "stone" | "food" | "gold",
  resourceAmount: 50,
  remainingUses: 3  // null = 无限
}
```

每次采集消耗英雄体力，获得 `resourceAmount` 数量的对应资源。

### 神殿增益

- `stamina` 类型: 恢复英雄体力
- `attack` 类型: 通过实体状态更新永久增加角色攻击力

## 随机事件

**文件**: `src/server/api/services/worldEvents.service.ts`

探索新地块时随机触发的事件。

### 事件生成

```typescript
function generateRandomEvent(areaLevel: number): ExplorationEvent
```

区域等级根据到原点的距离计算: `max(1, floor(distance / 3))`

### 事件类型与权重

| 类型 | 权重 | 说明 |
|------|------|------|
| resource | 25 | 发现可采集材料 |
| monster | 20 | 战斗遭遇 |
| nothing | 20 | 空旷区域 |
| merchant | 15 | NPC 商人 |
| treasure | 10 | 宝箱战利品 |
| trap | 10 | 受伤或闪避 |

### 事件结构

```typescript
interface ExplorationEvent {
  type: string;
  title: string;
  description: string;
  icon: string;
  options: Array<{
    id: string;
    text: string;
    action: "collect" | "fight" | "flee" | "open" | "trade" |
            "take_damage" | "dodge" | "continue" | "leave";
  }>;
  rewards?: { gold?, wood?, stone?, food?, exp? };
  monster?: { name, hp, attack, defense, rewards };
}
```

### 选择处理

```typescript
handleChoice(db, entities, userId, { heroId, action, eventData })
```

| 动作 | 效果 |
|------|------|
| `collect` | 将事件奖励发放给玩家 |
| `fight` | 比较英雄战力 vs 怪物 -> 胜/败 |
| `flee` | 70% 成功率，失败消耗 10 体力 |
| `open` | 打开宝箱获得金币 |
| `take_damage` | 失去 15 英雄体力 |
| `dodge` | 50% 成功率，失败消耗 10 体力 |
| `trade` | 花费金币换取其他资源 |
| `continue`/`leave` | 无效果，继续前进 |
