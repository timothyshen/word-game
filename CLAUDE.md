# 诸天领域 - 项目文档

## 项目概述

这是一个基于 T3 Stack 的领主养成类文字游戏，玩家作为领主管理领地、招募角色、探索世界、挑战Boss。

### 技术栈
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (Prisma ORM)
- **API**: tRPC
- **认证**: NextAuth.js
- **UI组件**: shadcn/ui

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── game/              # 游戏主页面
│   └── login/             # 登录页面
├── components/
│   ├── game/              # 游戏组件
│   │   ├── panels/        # 各类面板组件
│   │   └── IsometricMap.tsx
│   └── ui/                # shadcn/ui 组件
├── server/
│   └── api/
│       ├── routers/       # tRPC 路由器
│       └── trpc.ts        # tRPC 配置
└── trpc/                  # tRPC 客户端配置
```

## 核心系统

### 1. 玩家系统 (`player.ts`)
- 玩家状态管理（等级、资源、属性）
- 体力自动回复（基于时间计算）
- 角色管理、技能管理

### 2. 结算系统 (`settlement.ts`)
- 每日结算（行动分数 → 评级 → 奖励）
- 连续达标奖励机制
- 卡牌实际发放

### 3. 战斗系统 (`combat.ts`)
- 回合制文字选择战斗
- 技能系统（攻击、重击、防御、火焰术、治疗术、逃跑）
- Buff/Debuff 机制
- 战斗奖励（经验、金币、卡牌掉落）

### 4. 卡牌祭坛 (`altar.ts`)
- 抽卡（单抽/十连抽，普通/高级）
- 卡牌合成（品质提升）
- 卡牌献祭（获得水晶/金币）
- 保底机制

### 5. 装备系统 (`equipment.ts`)
- 11槽位装备（主手、副手、头盔、胸甲、腰带、手套、腿甲、鞋子、项链、戒指×2）
- 装备穿戴/卸下
- 装备强化（成功率递减）

### 6. 职阶突破 (`breakthrough.ts`)
- 玩家/角色职阶提升
- 技能槽位增加（tier × 6）
- 等级上限提升

### 7. 职业系统 (`profession.ts`)
- 职业学习与加成
- 玩家职业、角色职业

### 8. 传送门系统 (`portal.ts`)
- 诸天世界（主位面、火焰位面、寒冰位面、暗影位面、天界）
- 世界传送
- 解锁条件检查

### 9. 剧情系统 (`story.ts`)
- 章节式剧情
- 选择分支
- 剧情奖励

### 10. Boss系统 (`boss.ts`)
- 周Boss挑战
- 次数限制
- 丰厚奖励

### 11. 探索系统 (`exploration.ts`)
- 野外探索
- 随机事件
- 野外设施

### 12. 建筑系统 (`building.ts`)
- 建筑建造/升级
- 资源产出计算
- 工人分配

### 13. 卡牌系统 (`card.ts`)
- 卡牌使用（建筑卡、招募卡、技能卡、道具卡）
- 卡牌背包管理

## 数据库模型

### 核心模型
- `Player` - 玩家存档
- `PlayerCharacter` - 角色实例
- `PlayerCard` - 玩家卡牌
- `PlayerBuilding` - 玩家建筑
- `PlayerEquipment` - 玩家装备

### 模板模型
- `Character` - 角色模板
- `Card` - 卡牌模板
- `Building` - 建筑模板
- `Equipment` - 装备模板
- `Skill` - 技能模板
- `Profession` - 职业模板

### 进度模型
- `StoryProgress` - 剧情进度
- `ActionLog` - 行动记录
- `SettlementLog` - 结算记录
- `BossStatus` - Boss状态

## 前端面板

| 面板 | 文件 | 功能 |
|------|------|------|
| 结算面板 | `SettlementPanel.tsx` | 每日结算、奖励领取 |
| 经济面板 | `EconomyPanel.tsx` | 资源总览、产出统计 |
| 军事面板 | `MilitaryPanel.tsx` | 战力统计、角色管理 |
| 战斗面板 | `CombatPanel.tsx` | 回合制战斗界面 |
| 祭坛面板 | `AltarPanel.tsx` | 抽卡、合成、献祭 |
| 装备面板 | `EquipmentPanel.tsx` | 11槽位装备管理 |
| 探索面板 | `ExplorationPanel.tsx` | 野外探索 |
| 角色详情 | `CharacterDetailPanel.tsx` | 角色信息 |
| 建筑详情 | `BuildingDetailPanel.tsx` | 建筑升级、工人分配 |

## 开发命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 数据库迁移
npx prisma db push

# 数据库可视化
npx prisma studio

# 类型检查
npm run typecheck
```

## 稀有度颜色

| 稀有度 | 颜色代码 |
|--------|----------|
| 普通 | `#888` |
| 精良 | `#4a9` |
| 稀有 | `#59b` |
| 史诗 | `#e67e22` |
| 传说 | `#c9a227` |

## 注意事项

1. **体力系统**: 体力基于时间自动回复，`calculateCurrentStamina` 函数在 `player.ts` 中
2. **结算系统**: 需要玩家手动领取奖励，不是自动发放
3. **战斗系统**: 使用内存存储战斗状态，生产环境应改用 Redis
4. **Boss系统**: 每周一重置挑战次数
5. **API调用**: 使用 tRPC hooks (`useQuery`, `useMutation`)

## 待优化项

- [ ] 战斗状态持久化（当前使用内存Map）
- [ ] 添加更多剧情章节
- [ ] 添加更多Boss
- [ ] 添加更多职业
- [ ] 完善装备掉落系统
- [ ] 添加公会系统
- [ ] 添加PVP系统
