# API 架构

三层 tRPC 架构：路由器 -> 服务层 -> 数据访问层。

## 上下文

每个 tRPC 过程接收：

```typescript
{
  session: { user: { id, name, email }, expires } | null,
  db: PrismaClient,
  engine: GameEngine,      // EventBus, 公式, 规则, 实体, 模块, 状态
  ruleService: GameRuleService
}
```

Session 从 `dev-session` cookie 读取（7天过期）。`protectedProcedure` 强制认证。

## 路由器层

**位置**: `src/server/api/routers/`

路由器按领域分组：

```
routers/
├── core/           auth, player, settlement
├── combat/         combat, boss
├── economy/        altar, building, equipment, shop
├── progression/    card, breakthrough, profession, achievement
├── exploration/    exploration
├── territory/      innerCity, territory, portal
├── content/        story, character
├── world/          heroes, map, poi, events, combat
├── admin/          管理后台 CRUD
└── root.ts         合并所有路由器
```

**模式**: 路由器验证输入（Zod）、调用服务、可选发出事件、返回结果。

```typescript
export const someRouter = createTRPCRouter({
  action: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await service.doAction(ctx.db, ctx.session.user.id, input);
      void ctx.engine.events.emit("domain:action", payload, "router-name");
      return result;
    }),
});
```

## 服务层

**位置**: `src/server/api/services/`

服务层包含业务逻辑，与传输方式无关。依赖通过参数传入。

```typescript
export async function doAction(
  db: FullDbClient,           // Prisma 客户端或事务
  userId: string,
  input?: InputType,
): Promise<ResultType> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND" });
  // ... 业务逻辑
}
```

| 服务 | 职责 |
|------|------|
| `player.service.ts` | 升级、体力、属性、提示 |
| `combat.service.ts` | 内城回合制战斗 |
| `worldCombat.service.ts` | 外城英雄 vs POI 战斗 |
| `building.service.ts` | 建造、升级、工人 |
| `card.service.ts` | 卡牌效果处理 |
| `altar.service.ts` | 抽卡发现与挑战 |
| `exploration.service.ts` | 野外探索 |
| `settlement.service.ts` | 每日评分与奖励 |
| `innerCity.service.ts` | 建筑放置、领地 |
| `territory.service.ts` | 地块解锁 |
| `worldMap.service.ts` | 英雄移动、地图状态 |
| `worldHeroes.service.ts` | 英雄部署/召回/休息 |
| `worldPoi.service.ts` | 兴趣点交互 |
| `worldEvents.service.ts` | 随机事件生成/处理 |
| `portal.service.ts` | 位面传送 |
| `boss.service.ts` | 周Boss挑战 |
| `hint.service.ts` | 上下文提示 |
| `shop.service.ts` | 商店 |
| `achievement.service.ts` | 成就追踪 |
| `breakthrough.service.ts` | 职阶突破 |
| `profession.service.ts` | 职业学习 |
| `equipment.service.ts` | 装备/强化 |

## 数据访问层

**位置**: `src/server/api/repositories/`

封装 Prisma 操作的数据访问层。

```typescript
type FullDbClient = PrismaClient | Prisma.TransactionClient;
```

使用 `FullDbClient` 允许在事务中运行：

```typescript
await db.$transaction(async (tx) => {
  await playerRepo.updatePlayer(tx, id, { gold: 500 });
  await buildingRepo.updateBuilding(tx, id, { level: 2 });
});
```

| 数据访问层 | 领域 |
|-----------|------|
| `player.repo.ts` | 玩家查询、更新 |
| `building.repo.ts` | 建筑实体（通过 EntityManager） |
| `card.repo.ts` | 卡牌实体、解锁标记、技能 |
| `character.repo.ts` | 角色实体（通过 EntityManager） |
| `combat.repo.ts` | 战斗会话 |
| `admin.repo.ts` | 管理后台模板 CRUD |

## 工具

**位置**: `src/server/api/utils/`

| 文件 | 用途 |
|------|------|
| `character-utils.ts` | 解析角色实体状态、获取模板 ID |
| `hero-utils.ts` | 从实体系统解析英雄角色数据 |
| `card-utils.ts` | 按稀有度随机发放卡牌 |
| `player-utils.ts` | 玩家属性计算 |
| `building-utils.ts` | 建筑实体创建 |
| `game-time.ts` | 游戏日期计算 |
| `index.ts` | 共享工具（updatePlayer 等） |

## 错误处理

所有错误使用 `TRPCError`：
- `NOT_FOUND` - 玩家/实体未找到
- `BAD_REQUEST` - 无效操作（资源不足、状态错误）
- `FORBIDDEN` - 未授权访问
- `INTERNAL_SERVER_ERROR` - 意外错误

## 引擎单例

**文件**: `src/server/api/engine.ts`

```typescript
export const engine: GameEngine;       // 共享引擎实例
export const ruleService: GameRuleService;

// 模块加载时初始化一次
// 注册模块: core, combat, economy, exploration,
//   progression, content, territory, settlement
// engine.start() 即发即忘调用
```
