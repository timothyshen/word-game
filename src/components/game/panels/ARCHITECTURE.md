# panels — 游戏面板组件

## 概述

游戏所有面板组件，采用 Hub 容器 + 标签页模式组织。Hub 组件作为 Dialog 弹窗容器，内嵌多个标签页面板。
统一使用深色主题（#101014 背景, #c9a227 金色强调），基于 shadcn/ui 的 Dialog + ScrollArea。

## 文件清单

### Hub组件（弹窗容器）

| 文件 | 说明 |
|------|------|
| HubPanel.tsx | Hub基础容器，提供标签切换框架 |
| CharacterHub.tsx | 角色Hub（角色列表/详情/技能/装备/突破） |
| InventoryHub.tsx | 背包Hub（物品/祭坛/商店） |
| AdventureHub.tsx | 冒险Hub（Boss/传送门/剧情） |
| ProgressHub.tsx | 进阶Hub（职业/突破/成就） |
| LogHub.tsx | 记录Hub（结算/行动/战斗历史） |

### 独立面板

| 文件 | 说明 |
|------|------|
| CombatPanel.tsx | 回合制战斗界面（技能选择、战斗日志） |
| EconomyPanel.tsx | 经济总览（资源统计、产出） |
| BuildingDetailPanel.tsx | 建筑详情、升级、工人分配 |
| InnerCityPanel.tsx | 内城建筑管理 |
| ShopPanel.tsx | 独立商店面板 |
| GuidancePanel.tsx | 新手引导面板 |
| CharacterDetailPanel.tsx | 角色详情（旧版，保留兼容） |

### Hub内嵌标签页

| 文件 | 说明 |
|------|------|
| SettlementPanel.tsx | 每日结算与奖励领取 |
| AltarPanel.tsx | 卡牌祭坛（抽卡/合成/献祭） |
| EquipmentPanel.tsx | 装备管理（11槽位） |
| BackpackPanel.tsx | 背包物品管理 |
| BossPanel.tsx | Boss挑战界面 |
| PortalPanel.tsx | 传送门/位面选择 |
| StoryPanel.tsx | 剧情章节阅读与选择 |
| BreakthroughPanel.tsx | 职阶突破 |
| ProfessionPanel.tsx | 职业学习与加成 |
| AchievementPanel.tsx | 成就系统 |
| ActionHistoryPanel.tsx | 行动历史记录 |
| CombatHistoryPanel.tsx | 战斗历史记录 |
| character/ | 角色相关标签页子目录 |
| log/ | 日志相关标签页子目录 |
| index.ts | 统一导出 |

### character/ 子目录

| 文件 | 说明 |
|------|------|
| CharacterListTab.tsx | 角色列表标签页 |
| CharacterDetailTab.tsx | 角色详情标签页 |
| BreakthroughTab.tsx | 角色突破标签页 |
| EquipmentTab.tsx | 角色装备标签页 |
| helpers.tsx | 角色面板辅助函数 |
| index.ts | 导出 |

### log/ 子目录

| 文件 | 说明 |
|------|------|
| CombatHistoryTab.tsx | 战斗历史标签页 |
| ActionHistoryTab.tsx | 行动历史标签页 |
| SettlementTab.tsx | 结算记录标签页 |
| helpers.tsx | 日志面板辅助函数 |
| index.ts | 导出 |

## 组件关系

- 各 Hub 组件继承 `HubPanel` 的标签切换能力
- Hub 通过标签页渲染对应的内嵌面板
- `CombatPanel` 独立于 Hub 体系，由战斗触发时全屏覆盖
- 面板通过 tRPC mutations/queries 与后端路由器交互

## 依赖关系

- 依赖: `components/ui`（Dialog, ScrollArea, Button, Card）, `trpc/`, `constants/game-colors`
- 被依赖: `components/game/GameTabs.tsx`, `app/game/page.tsx`
