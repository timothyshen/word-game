# services/ — 服务层

## 概述

服务层承载核心业务逻辑，协调多个 Repository 的数据操作，处理事务编排和跨模块交互。Service 方法接收已校验的参数和数据库客户端，返回业务结果。

## 文件清单

| 文件 | 说明 |
|------|------|
| `player.service.ts` | 玩家状态管理、体力计算、资源操作 |
| `settlement.service.ts` | 每日结算、评级计算、奖励发放 |
| `combat.service.ts` | 回合制战斗逻辑、技能处理、Buff 系统 |
| `boss.service.ts` | 周 Boss 挑战、次数限制、Boss 奖励 |
| `altar.service.ts` | 抽卡逻辑、合成、献祭、保底机制 |
| `building.service.ts` | 建筑建造/升级、资源产出、工人分配 |
| `equipment.service.ts` | 装备穿戴/卸下、强化逻辑 |
| `shop.service.ts` | 商店购买/出售 |
| `card.service.ts` | 卡牌使用、背包管理 |
| `character.service.ts` | 角色管理、技能配置 |
| `story.service.ts` | 剧情推进、选择分支、奖励 |
| `exploration.service.ts` | 野外探索、随机事件 |
| `achievement.service.ts` | 成就检测与解锁 |
| `breakthrough.service.ts` | 职阶突破、等级上限提升 |
| `profession.service.ts` | 职业学习与加成 |
| `portal.service.ts` | 传送门/位面传送 |
| `territory.service.ts` | 领地管理 |
| `innerCity.service.ts` | 内城系统 |
| `admin.service.ts` | 管理后台 CRUD 操作 |
| `hint.service.ts` | 游戏提示系统 |
| `worldCombat.service.ts` | 外城世界战斗 |
| `worldEvents.service.ts` | 外城世界事件 |
| `worldHeroes.service.ts` | 外城世界英雄 |
| `worldMap.service.ts` | 外城世界地图 |
| `worldPoi.service.ts` | 外城世界兴趣点 |
| `worldHelpers.ts` | 外城世界共享辅助函数 |
| `index.ts` | 统一导出 |

## 数据流

```
Router 调用 → Service 方法（业务逻辑）
  → Repository（数据读写）
  → Utils（纯函数计算）
  ← 返回业务结果给 Router
```

## 依赖关系

- **依赖**: `repositories/`（数据访问）、`utils/`（工具函数）、`constants/`（游戏常量）
- **被依赖**: `routers/`（路由层调用）
