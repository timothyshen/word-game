# outer-city — 外城3D地图与2D地图系统

## 概述

基于 Three.js / React Three Fiber (R3F) 构建的外城3D地图系统，
以及基于 HTML Canvas 的2D迷你地图和世界地图系统。
提供地形渲染、建筑模型、POI交互、英雄管理、战斗覆盖层、小地图、世界地图和基地方向指示器等功能。

## 文件清单

### 3D地图

| 文件 | 说明 |
|------|------|
| OuterCityFullMap.tsx | 主地图组件，R3F Canvas 容器，管理相机与场景，集成小地图/世界地图/基地指示器 |
| TerrainTile.tsx | 地形瓦片渲染组件（草地、沙漠、水域等） |
| terrain.ts | 地形生成逻辑（噪声算法、地形类型分配） |
| MapMarkers.tsx | 地图标记组件（POI图标、事件点、迷雾边界） |
| CastleModel.tsx | 城堡3D模型组件 |
| ShrineModel.tsx | 神殿3D模型组件 |
| decorations.tsx | 装饰物组件（树木、岩石等环境物件） |
| POIInteractionPanel.tsx | POI交互面板（点击标记后显示详情与操作） |
| CombatOverlay.tsx | 战斗覆盖层（外城战斗时的UI叠加） |
| HeroSidebar.tsx | 英雄侧边栏（英雄列表、派遣管理） |
| index.ts | 统一导出 |

### 2D地图系统

| 文件 | 说明 |
|------|------|
| map-canvas-renderer.ts | 共享 Canvas 2D 渲染模块，供 Minimap 和 WorldMap 共用 |
| Minimap.tsx | 右下角常驻小地图（120/160px），显示所有已探索区域，点击打开世界地图 |
| WorldMap.tsx | 全屏2D世界地图（拖拽平移、滚轮/触摸缩放、悬浮提示、定位按钮） |
| BaseIndicator.tsx | 基地方向指示器（主城不在3D视野时显示金色箭头和距离） |

## 组件关系

- `OuterCityFullMap` 是顶层容器，内部渲染 `TerrainTile`、`MapMarkers`、模型组件
- `OuterCityFullMap` 同时挂载 `Minimap`、`WorldMap`、`BaseIndicator`（使用 fixed 定位跳出父级层叠上下文）
- `terrain.ts` 为 `TerrainTile` 提供地形数据
- `MapMarkers` 点击后触发 `POIInteractionPanel`
- `CombatOverlay` 在外城战斗时覆盖地图界面
- `HeroSidebar` 独立于地图，提供英雄派遣操作
- `map-canvas-renderer.ts` 是纯 TS 模块，被 `Minimap` 和 `WorldMap` 共享调用
- `Minimap` 点击或按 M 键打开 `WorldMap`

## 2D地图渲染 (map-canvas-renderer.ts)

共享的 Canvas 2D 渲染逻辑：
- `computeBounds(tiles)` — 计算已探索区域的边界
- `renderMap(options)` — 主渲染函数，支持自动缩放（小地图）和手动缩放（世界地图）
- `canvasToWorld(...)` — 画布像素坐标转世界坐标
- 绘制内容：地形色块、基地星标(0,0)、英雄三角形、POI圆点、视口矩形
- 支持 Retina 高清渲染（devicePixelRatio）

## 依赖关系

- 依赖: `three`, `@react-three/fiber`, `@react-three/drei`, `trpc/`（outerCity 路由器）, `constants/game-colors`
- 被依赖: `app/game/page.tsx`
