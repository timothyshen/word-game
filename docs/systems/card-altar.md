# 卡牌与祭坛系统

卡牌是主要的进阶机制。玩家通过抽卡（祭坛）、探索奖励和结算获得卡牌，然后用于招募角色、建造建筑、学习技能或消耗换取资源。

## 卡牌系统

**文件**: `src/server/api/services/card.service.ts`

### 卡牌类型

| 类型 | 效果 | 示例 |
|------|------|------|
| `recruit` | 招募角色 | 创建角色 Entity |
| `building` | 放置建筑 | 创建 InnerCityBuilding |
| `skill` | 学习技能 | 创建 CharacterSkill 记录 |
| `enhance` | 增益属性 | 临时或永久属性提升 |
| `item` | 消耗品 | 获得资源、开启宝箱 |

### 卡牌实体状态

卡牌存储为 Entity 记录：
```typescript
{ quantity: number }  // 该卡牌的持有数量
```

每个（玩家, 卡牌模板）对应一个 Entity，通过 quantity 追踪数量。

### 卡牌操作

- **添加卡牌**: 查找现有实体 -> 有则 +quantity，无则创建新实体
- **消耗卡牌**: quantity-1 -> 若为 0 则删除实体
- **使用卡牌**: 分发到类型特定的处理器，然后消耗

### 类型处理器

**招募卡**: 根据 Character 模板的属性创建角色 Entity。

**建筑卡**: 在指定位置创建 InnerCityBuilding（调用方提供坐标）。

**技能卡**: 添加 CharacterSkill 关联记录，链接角色 Entity 到 Skill。

**道具卡**: 发放资源（金币、木材、石材、食物、水晶）或打开包含随机奖励的宝箱。

## 祭坛系统

**文件**: `src/server/api/services/altar.service.ts`

抽卡/召唤系统，玩家在野外发现祭坛、击败守卫、收集卡牌。

### 祭坛类型

| 类型 | 守卫 | 稀有度权重 |
|------|------|------------|
| 基础 | Lv5, 100 HP | 普通 60%, 精良 30%, 稀有 10% |
| 神圣 | Lv15, 300 HP | 普通 30%, 精良 40%, 稀有 25%, 史诗 5% |
| 远古 | Lv30, 800 HP | 精良 30%, 稀有 40%, 史诗 25%, 传说 5% |

权重从规则加载: `altar_basic_weights`, `altar_sacred_weights`, `altar_ancient_weights`。

### 守卫挑战流程

```
1. 验证祭坛存在且守卫未被击败
2. 检查体力（来自 ruleService.getConfig("altar_stamina_cost")）
3. 消耗体力
4. 计算战力:
   playerPower = strength*3 + agility*2 + intellect*2
   charactersPower = sum(attack + defense + speed) 从实体系统获取
5. 胜率来自 ruleService.getFormula("altar_victory_formula")
6. 胜利: 标记祭坛已击败，根据权重抽取卡牌稀有度
7. 失败: 仅消耗体力
```

### 每日收集

击败祭坛守卫后，玩家每天可以从该祭坛收集一张卡牌。卡牌稀有度使用祭坛的加权随机分布抽取。

### 卡牌稀有度颜色

| 稀有度 | 颜色 | 中文 |
|--------|------|------|
| Common | `#888` | 普通 |
| Fine | `#4a9` | 精良 |
| Rare | `#59b` | 稀有 |
| Epic | `#e67e22` | 史诗 |
| Legendary | `#c9a227` | 传说 |
