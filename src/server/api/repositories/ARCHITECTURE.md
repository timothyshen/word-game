# repositories/ — 仓储层

## 概述

仓储层封装所有 Prisma 数据库操作，为 Service 层提供类型安全的数据访问接口。每个 Repository 对应一个业务领域，接收 Prisma 客户端（或事务客户端）作为参数，支持事务组合。

## 文件清单

| 文件 | 说明 |
|------|------|
| `types.ts` | 定义 `FullDbClient` 类型（Prisma Client / Transaction Client） |
| `player.repo.ts` | 玩家数据查询与更新（状态、资源、体力） |
| `building.repo.ts` | 建筑数据操作（创建、升级、查询） |
| `card.repo.ts` | 卡牌数据操作（发放、消耗、查询） |
| `character.repo.ts` | 角色数据操作（招募、属性、技能） |
| `combat.repo.ts` | 战斗相关数据（日志、奖励记录） |
| `exploration.repo.ts` | 探索数据操作（事件记录、进度） |
| `innerCity.repo.ts` | 内城数据操作 |
| `settlement.repo.ts` | 结算数据操作（行动日志、结算记录） |
| `admin.repo.ts` | 管理后台数据操作（模板 CRUD） |
| `index.ts` | 统一导出所有 Repository |

## 数据流

```
Service 调用 → Repository 方法（Prisma 查询）→ SQLite 数据库
                                              ← 返回类型化数据
```

Repository 方法签名统一接收 `db: FullDbClient` 作为第一个参数，使同一方法可在普通查询和事务中复用。

## 依赖关系

- **依赖**: Prisma Client、`types.ts`（类型定义）
- **被依赖**: `services/`（服务层调用）
