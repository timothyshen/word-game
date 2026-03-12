# ui — shadcn/ui 组件库

## 概述

基于 shadcn/ui 的基础 UI 组件库，提供项目中通用的界面元素。
组件使用 Tailwind CSS 样式，支持深色主题变体。
`DialogContent` 已定制为游戏风格（`game-panel game-texture` + 角标装饰）。

## 文件清单

| 文件 | 说明 |
|------|------|
| button.tsx | 按钮组件（多种 variant: default, outline, ghost 等） |
| card.tsx | 卡片容器组件（Card, CardHeader, CardContent, CardFooter） |
| dialog.tsx | 弹窗对话框组件（所有 Hub/面板的容器，已集成 game-panel 样式） |
| scroll-area.tsx | 可滚动区域组件（面板内容滚动） |

## DialogContent 定制

`DialogContent` 基础样式包含：
- `game-panel game-texture` — 金色边框 + 渐变背景纹理
- `game-panel-corners` / `game-panel-corners-bottom` — 四角装饰
- `max-h-[90vh] overflow-y-auto` — 自适应屏幕高度，超高内容可滚动
- `fixed top-[50%] left-[50%] translate` — 屏幕居中定位
- 金色关闭按钮（可通过 `showCloseButton={false}` 隐藏）
- `DialogFooter` 支持 `showCloseButton` prop

## 组件关系

- `Dialog` 是游戏面板的核心容器，所有 Hub 组件基于此构建
- `ScrollArea` 用于面板内长内容的滚动显示
- `Button` 和 `Card` 在游戏面板和管理后台中广泛使用
- 所有组件遵循 shadcn/ui 的 composable 模式

## 依赖关系

- 依赖: `@radix-ui/react-dialog`, `@radix-ui/react-scroll-area`, `class-variance-authority`, `tailwind-merge`
- 被依赖: `components/game/`, `components/admin/`, `app/`（全项目使用）
