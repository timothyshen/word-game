# 诸天领域 - 项目文档

> **必须使用 Bun** - 本项目强制使用 bun 作为包管理器和运行时，禁止使用 npm/yarn/pnpm。所有命令都应使用 `bun` 而非 `npm`。

## 项目概述

这是一个基于 T3 Stack 的领主养成类文字游戏，玩家作为领主管理领地、招募角色、探索世界、挑战Boss。

### 技术栈
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (Prisma ORM)
- **API**: tRPC
- **认证**: 简易邮箱认证 (dev-session cookie)
- **测试**: Vitest
- **UI组件**: shadcn/ui
- **包管理**: Bun (必须使用 bun，不要使用 npm/yarn/pnpm)

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理后台
│   ├── game/              # 游戏主页面
│   └── login/             # 登录/注册页面
├── components/
│   ├── game/              # 游戏组件
│   │   ├── panels/        # 各类面板组件
│   │   └── IsometricMap.tsx
│   └── ui/                # shadcn/ui 组件
├── server/
│   └── api/
│       ├── routers/       # tRPC 路由器
│       ├── __tests__/     # 单元测试
│       └── trpc.ts        # tRPC 配置
└── trpc/                  # tRPC 客户端配置
```

## 认证系统

### 测试账号
- **邮箱**: `test@test.com`
- **用户名**: 测试玩家
- **角色名**: 测试领主
- **等级**: 5

### 认证路由 (`auth.ts`)
- `register` - 注册新用户（邮箱、用户名、角色名）
- `login` - 邮箱登录
- `me` - 获取当前用户信息
- `logout` - 登出

认证使用 `dev-session` cookie 存储用户ID，有效期7天。

## 管理后台

访问 `/admin` 可管理游戏数据：

| 功能 | 路径 | 说明 |
|------|------|------|
| 卡牌管理 | `/admin/cards` | CRUD 卡牌模板 |
| 剧情管理 | `/admin/stories` | 管理章节和节点 |
| 冒险事件 | `/admin/adventures` | 管理探索事件 |
| 统计概览 | `/admin` | 查看数据统计 |

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

### 14. 管理系统 (`admin.ts`)
- 卡牌CRUD（创建、查询、更新、删除）
- 剧情章节/节点管理
- 冒险事件管理
- 数据统计

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
| 战斗面板 | `CombatPanel.tsx` | 回合制战斗界面 |
| 祭坛面板 | `AltarPanel.tsx` | 抽卡、合成、献祭 |
| 装备面板 | `EquipmentPanel.tsx` | 11槽位装备管理 |
| 角色详情 | `CharacterDetailPanel.tsx` | 角色信息 |
| 建筑详情 | `BuildingDetailPanel.tsx` | 建筑升级、工人分配 |

## 开发命令

**重要：本项目必须使用 bun，禁止使用 npm/yarn/pnpm**

```bash
# 开发
bun dev

# 构建
bun run build

# 数据库迁移
bun prisma db push

# 数据库可视化
bun prisma studio

# 类型检查
bun run typecheck

# 运行测试
bun test

# 运行测试并生成覆盖率报告
bun run test:coverage

# 数据库初始化（含测试账号）
bun prisma db seed

# 安装依赖
bun install
```

## 稀有度颜色

| 稀有度 | 颜色代码 |
|--------|----------|
| 普通 | `#888` |
| 精良 | `#4a9` |
| 稀有 | `#59b` |
| 史诗 | `#e67e22` |
| 传说 | `#c9a227` |

## 测试

使用 Vitest 进行单元测试，测试文件位于 `src/server/api/__tests__/`。

| 测试文件 | 覆盖范围 |
|----------|----------|
| `admin.test.ts` | 管理后台 CRUD 操作 |
| `story.test.ts` | 剧情系统 |
| `exploration.test.ts` | 探索系统 |

测试使用 Mock Prisma Client，详见 `helpers.ts`。

## 注意事项

1. **包管理器**: 必须使用 bun，禁止使用 npm/yarn/pnpm
2. **体力系统**: 体力基于时间自动回复，`calculateCurrentStamina` 函数在 `player.ts` 中
3. **结算系统**: 需要玩家手动领取奖励，不是自动发放
4. **战斗系统**: 使用内存存储战斗状态，生产环境应改用 Redis
5. **Boss系统**: 每周一重置挑战次数
6. **API调用**: 使用 tRPC hooks (`useQuery`, `useMutation`)
7. **认证**: 使用简易邮箱认证，cookie名为 `dev-session`

## 待优化项

- [ ] 战斗状态持久化（当前使用内存Map）
- [ ] 添加更多剧情章节
- [ ] 添加更多Boss
- [ ] 添加更多职业
- [ ] 完善装备掉落系统
- [ ] 添加公会系统
- [ ] 添加PVP系统
