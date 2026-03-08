# 进阶系统

结算、突破、职业和成就系统，驱动玩家进阶。

## 每日结算

**文件**: `src/server/api/services/settlement.service.ts`

玩家全天积累行动积分，在结算时领取奖励。

### 评分

行动记录在 `ActionLog` 中，基础分数：
- 探索: 40 分
- 建筑升级: 30 * 等级 分
- 战斗胜利: 根据难度浮动
- 建筑产出: floor(totalOutput / 10)

### 评级

阈值来自 `ruleService.getConfig("settlement_grade_thresholds")`：

| 评级 | 最低分数 |
|------|----------|
| S | 500 |
| A | 400 |
| B | 300 |
| C | 200 |
| D | 0 |

### 连续达标系统

连续天数达到阈值可获得额外奖励：
- 阈值来自 `ruleService.getConfig("settlement_streak_threshold")`
- 3天连续奖励来自 `ruleService.getConfig("settlement_streak_3_reward")`
- 7天连续奖励来自 `ruleService.getConfig("settlement_streak_7_reward")`

### 评级奖励

卡牌宝箱按评级发放，来自 `ruleService.getConfig("settlement_grade_chests")`。评级越高，稀有概率越高。

### 流程

```
1. 玩家请求当天结算
2. 汇总当天所有 ActionLog 条目
3. 根据总分计算评级
4. 检查连续达标天数（连续超过阈值的天数）
5. 分发奖励（金币、经验、卡牌）
6. 记录到 SettlementLog
7. 玩家需手动领取
```

## 职阶突破

**文件**: `src/server/api/services/breakthrough.service.ts`

职阶提升增加等级上限和技能槽位。

### 玩家突破

```
需求来自 ruleService.getConfig("breakthrough_tier_${currentTier}"):
  - 金币、水晶、经验消耗
  - 最低等级要求

效果:
  - tier += 1
  - maxLevel += ruleService.getConfig("breakthrough_level_cap_increase")
  - skillSlots = ruleService.getFormula("player_skill_slots") 使用新 tier 计算
```

### 角色突破

相同模式但应用于角色实体。使用新职阶和派生属性更新角色实体状态。

## 职业系统

**文件**: `src/server/api/services/profession.service.ts`

玩家和角色可以学习职业以获得属性加成。

### 学习

- 检查解锁条件（等级、职阶等）
- 创建 `PlayerProfession` 或 `CharacterProfession` 记录
- 角色职业通过 `playerCharacterId` 引用实体 ID

### 加成

每个职业提供属性倍率：
```json
{
  "bonuses": {
    "attack": 1.1,    // +10% 攻击
    "defense": 1.05,  // +5% 防御
    "speed": 1.0      // 无变化
  }
}
```

## 成就系统

**文件**: `src/server/api/services/achievement.service.ts`

追踪里程碑和奖励领取。

### 成就分类

| 分类 | 示例 |
|------|------|
| building | 第一个建筑、5个建筑、10个建筑、最高等级5 |
| combat | 首次胜利、10胜、50胜、Boss击杀 |
| exploration | 5个区域、20个区域、世界旅行者 |
| collection | 10张卡牌、30张卡牌、5个角色 |
| special | 赚取1000金、等级10、职阶2、7天连续 |

### 进度追踪

进度从玩家状态和实体查询实时计算：
- `buildings_count` -> 统计建筑实体数量
- `max_building_level` -> 建筑实体状态中的最高等级
- `characters_count` -> 统计角色实体数量
- `unique_cards` -> 统计卡牌实体数量
- `combat_wins` -> player.combatWins
- `boss_kills` -> player.bossKills
- `total_gold_earned` -> player.totalGoldEarned

### 领取流程

```
1. 验证成就存在且尚未领取
2. 计算当前进度
3. 检查进度 >= 目标值
4. 记录 PlayerAchievement
5. 发放奖励（金币、水晶、经验、按稀有度的卡牌）
```

## 装备系统

**文件**: `src/server/api/services/equipment.service.ts`

11槽位装备系统，支持强化。

### 槽位

主手、副手、头盔、胸甲、腰带、手套、腿甲、鞋子、项链、戒指1、戒指2

### 强化

- 最大等级来自 `ruleService.getConfig("equipment_max_enhance")`
- 成功率来自 `ruleService.getFormula("equipment_enhance_success")`（随等级递减）
- 费用来自 `ruleService.getFormula("equipment_enhance_cost")`（随等级递增）
- 稀有度倍率来自 `ruleService.getConfig("equipment_rarity_multipliers")`

### 装备实体状态

```typescript
{
  enhanceLevel: number,
  equippedBy: string | null,  // 角色实体 ID
  slot: string | null          // 占据的槽位
}
```

## 传送门系统

**文件**: `src/server/api/services/portal.service.ts`

在位面世界之间旅行。

### 位面

| 位面 | 解锁条件 |
|------|----------|
| 主位面 | 默认 |
| 火焰位面 | 击败火焰守护者 |
| 寒冰位面 | 击败寒冰守护者 |
| 暗影位面 | 击败暗影守护者 |
| 天界 | 击败天界守护者 |

### 传送门守护者挑战

传送门以野外设施的形式出现。玩家必须击败守护者（基于战力计算，使用实体系统中的玩家 + 角色属性）才能解锁到该位面的旅行。
