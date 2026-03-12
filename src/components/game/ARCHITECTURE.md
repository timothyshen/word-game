# components/game — 游戏核心组件

## 概述

游戏客户端的核心组件目录，包含玩家HUD、地图渲染、游戏面板等所有游戏界面元素。
采用 Cinematic HUD 设计风格，深色主题配合金色强调色。
所有面板使用 `game-panel` CSS 类提供统一的金色边框、装饰角标和阴影效果。

## 文件清单

| 文件/目录 | 说明 |
|-----------|------|
| panels/ | 游戏面板组件目录（Hub容器、独立面板、内嵌标签页） |
| outer-city/ | 外城地图组件目录（3D地图 + 2D小地图/世界地图） |
| PlayerHUD.tsx | 玩家状态栏（等级、资源、体力等） |
| GameTabs.tsx | 游戏底部标签页导航（经济/军事/探索等） |
| IsometricMap.tsx | 内城等距视角地图组件 |
| OuterCityMiniMap.tsx | 外城缩略小地图（旧版，已被 outer-city/Minimap 替代） |
| MapEventModal.tsx | 地图事件弹窗（探索/战斗触发） |
| WildernessPanel.tsx | 荒野探索面板 |
| CharacterPanel.tsx | 旧版角色面板（已被 CharacterHub 替代） |
| SkillPanel.tsx | 旧版技能面板（已被 character/SkillTab 替代） |
| CardInventory.tsx | 卡牌背包组件 |
| InnerCity3D.tsx | 内城3D视图 |
| TerritoryPanel.tsx | 领地管理面板 |
| UnlockToast.tsx | 系统解锁通知提示 |
| HintBar.tsx | 游戏提示条 |
| ErrorBoundary.tsx | 游戏错误边界组件 |

## 组件关系

- `GameTabs` 作为主导航，切换显示不同的 Hub/面板
- `PlayerHUD` 常驻顶部，显示玩家状态
- `IsometricMap` / `OuterCityMiniMap` 提供地图交互，点击触发 `MapEventModal`
- 各面板通过 tRPC hooks 与后端通信

## 样式系统

全局游戏样式类定义在 `src/styles/globals.css`（`@layer components` 中）：
- `.game-panel` — 金色边框面板（渐变背景、多层阴影、装饰金线）
- `.game-panel-corners` / `.game-panel-corners-bottom` — 四角 L 形装饰
- `.game-panel-header` — 标题金色渐变头
- `.game-btn-primary` / `.game-btn-secondary` — 游戏风格按钮
- `.game-divider` — 金色渐变分割线
- `.game-texture` — 微妙径向渐变纹理

**注意**: `.game-panel` 在 `@layer components` 中定义，使 Tailwind 的 `fixed`、`absolute` 等定位类可以覆盖其 `position: relative`。

## 依赖关系

- 依赖: `components/ui`（Dialog, ScrollArea, Button）, `hooks/use-unlocks`, `constants/`, `trpc/`
- 被依赖: `app/game/page.tsx`
