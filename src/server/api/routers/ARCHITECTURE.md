# routers/ — 路由层

## 概述

路由层是 API 的入口，负责定义 tRPC 端点、使用 Zod 校验输入参数，并将业务逻辑委托给 Service 层。路由按功能域分组为子目录，每个子目录通过 `index.ts` 导出合并后的路由。

## 路由分组

| 目录 | 说明 | 包含文件 |
|------|------|----------|
| `admin/` | 管理后台 | `admin.ts`, `index.ts` |
| `combat/` | 战斗系统 | `boss.ts`, `combat.ts`, `index.ts` |
| `content/` | 内容系统 | `character.ts`, `story.ts`, `index.ts` |
| `core/` | 核心系统 | `auth.ts`, `player.ts`, `settlement.ts`, `index.ts` |
| `economy/` | 经济系统 | `altar.ts`, `building.ts`, `equipment.ts`, `shop.ts`, `index.ts` |
| `exploration/` | 探索系统 | `exploration.ts`, `index.ts` |
| `progression/` | 进阶系统 | `achievement.ts`, `breakthrough.ts`, `card.ts`, `profession.ts`, `index.ts` |
| `territory/` | 领地系统 | `innerCity.ts`, `portal.ts`, `territory.ts`, `index.ts` |
| `world/` | 外城世界 | `combat.ts`, `events.ts`, `heroes.ts`, `map.ts`, `poi.ts`, `helpers.ts`, `index.ts` |

## 数据流

```
tRPC 请求 → Router（Zod 校验） → Service（业务逻辑） → 返回响应
```

每个路由端点通常包含：输入 Schema 定义、认证中间件检查、调用对应 Service 方法、返回结果。

## 依赖关系

- **依赖**: `services/`（业务逻辑）、`trpc.ts`（procedure 定义）、Zod（输入校验）
- **被依赖**: `root.ts`（合并所有路由）→ 客户端 tRPC 调用
