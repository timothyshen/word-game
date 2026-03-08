# 战斗系统

两套战斗系统：内城回合制 RPG 战斗和外城英雄 vs POI 战斗。

## 内城战斗

**文件**: `src/server/api/services/combat.service.ts`

带技能、Buff 和奖励的回合制文字 RPG 战斗。

### 流程

```
1. initiateCombat(characterId, monsterLevel)
   -> 根据等级生成怪物
   -> 将战斗状态存入 engine.state
   -> 返回初始状态

2. resolveTurn(combatId, actionId)
   -> 处理玩家动作（伤害/治疗/Buff）
   -> 怪物回合（AI 动作）
   -> 应用 Buff/Debuff
   -> 检查胜利/失败

3. 胜利: 经验 + 金币 + 卡牌掉落概率
   失败: 无惩罚（返回空闲状态）
```

### 战斗单位

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

### 动作

| 动作 | MP消耗 | 效果 |
|------|--------|------|
| 攻击 | 0 | 1.0倍物理伤害 |
| 重击 | 10 | 1.5倍伤害，下回合防御-30% |
| 防御 | 0 | 减伤50%，+10 MP |
| 火焰术 | 20 | 1.0倍魔法伤害 |
| 治疗术 | 25 | 恢复30%最大HP |
| 逃跑 | 0 | 逃跑概率 = min(0.9, 0.5 + speed * 0.01) |

### 伤害公式

```
基础伤害 = max(1, atk - def * 0.5)
浮动     = 0.9 + random * 0.2
暴击概率 = 0.1 + luck * 0.005
暴击倍率 = 1.5
```

### 怪物生成

```typescript
const MONSTERS = ["野狼", "哥布林", "骷髅兵", "石头人", "暗影刺客", "火焰元素"];

// 属性随等级缩放:
hp      = baseHp + level * 10
attack  = baseAtk + level * 1.5
defense = baseDef + level * 0.5
```

### 奖励

- 经验: `15 * monsterLevel`
- 金币: `10 * monsterLevel`
- 卡牌掉落: 概率 `0.1 + level * 0.03`

## 外城战斗

**文件**: `src/server/api/services/worldCombat.service.ts`

英雄在世界地图上对抗 POI 守卫的战斗。

### 与内城战斗的区别

| 方面 | 内城 | 外城 |
|------|------|------|
| 单位 | 玩家角色 | 部署的英雄 |
| 敌人 | 随机怪物 | POI 守卫 |
| 地点 | 战斗画面 | 世界地图格子 |
| 体力 | 玩家体力 | 英雄体力 |
| 奖励 | 经验、金币、卡牌 | 领地征服、战利品 |

### POI 战斗流程

```
1. 英雄移动到可战斗的 POI（驻军、巢穴、遗迹）
2. startCombat(heroId, poiId)
   -> 验证英雄在 POI 位置
   -> 设置英雄状态 = "fighting"
   -> 根据 POI 难度生成敌人
   -> 返回包含英雄/敌人属性的战斗状态

3. performAction(heroId, poiId, action, heroHp, enemyHp, turn)
   -> 应用内城加成到英雄属性
   -> 处理动作（攻击/防御/技能/逃跑）
   -> 敌人反击
   -> 检查胜利/失败

4. 胜利:
   -> POI 标记为已击败（24小时后刷新）
   -> 金币 + 经验奖励
   -> 角色实体经验更新
   -> 英雄状态 = "idle"

5. 失败:
   -> 英雄体力降低
   -> 角色 HP 设为最大值的 30%
   -> 英雄状态 = "idle"
```

### 敌人属性来源

```typescript
enemyLevel = poi.guardianLevel || poi.difficulty
hp  = 50 + level * 20
atk = 8 + level * 3
def = 3 + level * 2
```

### 内城加成

战斗时应用内城建筑加成：
- 攻击加成: `heroAtk * (1 + cityBonuses.attackBonus)`
- 防御加成: `heroDef * (1 + cityBonuses.defenseBonus)`

### 英雄角色解析

由于 HeroInstance 引用 Entity（非 PlayerCharacter），英雄属性通过以下方式解析：

```typescript
// src/server/api/utils/hero-utils.ts
const { state, template } = await resolveHeroCharacter(db, entities, hero.characterId);
// state: { hp, maxHp, attack, defense, speed, ... }
// template: { name, portrait }
```

## Boss 战斗

**文件**: `src/server/api/services/boss.service.ts`

有次数限制的每周 Boss 挑战。

### 流程

```
1. 检查解锁条件（职阶、等级、世界）
2. 检查每周次数限制（周一重置）
3. 消耗体力（30）
4. 计算战力:
   playerPower = strength*3 + agility*2 + intellect*2
   charactersPower = sum(char.attack + char.defense + char.speed) 全角色
   bossPower = boss.attack + boss.defense*0.5 + boss.hp*0.01
5. 胜率 = min(0.9, max(0.1, powerRatio * 0.5))
6. 胜利: 金币、水晶、经验、宝箱、装备掉落
```

### 每周重置

当 `weekStartDate < getWeekStartDate()` 时重置 Boss 挑战次数（周一 00:00）。
