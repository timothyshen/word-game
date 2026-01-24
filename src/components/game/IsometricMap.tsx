// Isometric Pixel Map Component
// 等距像素地图组件 - 显示领地建筑的成长 + 战争迷雾

import { useState } from "react";

// 建筑数据类型
interface Building {
  id: number;
  name: string;
  level: number;
  icon: string;
  status: string;
  slot: string;
  gridX: number;
  gridY: number;
  assignedChar?: string;
}

// 地图格子类型
type TileType = "grass" | "dirt" | "water" | "road" | "empty";

// 迷雾状态
type FogState = "hidden" | "revealed" | "visible";

// 建筑像素艺术定义（按等级）
const BUILDING_PIXELS: Record<string, Record<number, string[][]>> = {
  "主城堡": {
    1: [
      ["  ", "🏠", "  "],
      ["🧱", "🚪", "🧱"],
    ],
    2: [
      ["  ", "🏰", "  "],
      ["🧱", "🚪", "🧱"],
      ["🧱", "🧱", "🧱"],
    ],
    3: [
      ["  ", "⚜️", "  "],
      ["🏰", "🏰", "🏰"],
      ["🧱", "🚪", "🧱"],
      ["🧱", "🧱", "🧱"],
    ],
  },
  "农田": {
    1: [["🌱", "🌱"]],
    2: [["🌾", "🌾"], ["🌱", "🌱"]],
    3: [["🌾", "🌾", "🌾"], ["🌾", "🌾", "🌾"]],
  },
  "铁匠铺": {
    1: [["🔨", "🏠"]],
    2: [["🔥", "🏠"], ["⚒️", "🧱"]],
    3: [["💨", "🔥", "💨"], ["⚒️", "🏠", "⚒️"]],
  },
  "兵营": {
    1: [["⚔️", "🏕️"]],
    2: [["🚩", "🏠"], ["⚔️", "🛡️"]],
    3: [["🚩", "🏰", "🚩"], ["⚔️", "🛡️", "⚔️"]],
  },
  "市场": {
    1: [["🏪"]],
    2: [["🏪", "📦"]],
    3: [["🏪", "📦", "🛒"]],
  },
  "传送门": {
    1: [["🌀"]],
    2: [["✨", "🌀", "✨"]],
    3: [["⭐", "🌀", "⭐"], ["✨", "✨", "✨"]],
  },
};

// 地面纹理
const TILE_STYLES: Record<TileType, string> = {
  grass: "bg-[#2d4a2d]",
  dirt: "bg-[#4a3d2d]",
  water: "bg-[#2d3d5a]",
  road: "bg-[#3d3529]",
  empty: "bg-[#1a1a1a]",
};

// 默认地图布局 (6x6)
const DEFAULT_MAP: TileType[][] = [
  ["grass", "grass", "road", "grass", "grass", "grass"],
  ["grass", "dirt", "road", "dirt", "grass", "water"],
  ["road", "road", "road", "road", "road", "water"],
  ["grass", "dirt", "road", "dirt", "grass", "grass"],
  ["grass", "grass", "road", "grass", "dirt", "grass"],
  ["grass", "grass", "road", "grass", "grass", "grass"],
];

// 建筑默认位置
const BUILDING_POSITIONS: Record<string, { x: number; y: number }> = {
  "主城堡": { x: 2, y: 2 },
  "农田": { x: 1, y: 1 },
  "铁匠铺": { x: 3, y: 1 },
  "兵营": { x: 1, y: 3 },
  "市场": { x: 3, y: 3 },
  "传送门": { x: 4, y: 4 },
};

// 初始迷雾状态 - 只有中心区域可见
const INITIAL_FOG: FogState[][] = [
  ["hidden", "hidden", "hidden", "hidden", "hidden", "hidden"],
  ["hidden", "revealed", "visible", "revealed", "hidden", "hidden"],
  ["hidden", "visible", "visible", "visible", "revealed", "hidden"],
  ["hidden", "revealed", "visible", "revealed", "hidden", "hidden"],
  ["hidden", "hidden", "revealed", "hidden", "hidden", "hidden"],
  ["hidden", "hidden", "hidden", "hidden", "hidden", "hidden"],
];

interface IsometricMapProps {
  buildings: Array<{
    id: number;
    name: string;
    level: number;
    icon: string;
    status: string;
    slot: string;
    assignedChar?: string;
  }>;
  onBuildingClick?: (building: Building) => void;
  upgradingBuildingId?: number | null;
  onExplore?: (x: number, y: number) => void;
}

export default function IsometricMap({
  buildings,
  onBuildingClick,
  upgradingBuildingId,
  onExplore
}: IsometricMapProps) {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [fogState, setFogState] = useState<FogState[][]>(INITIAL_FOG);
  const [exploringTile, setExploringTile] = useState<{ x: number; y: number } | null>(null);

  // 将建筑放置到地图上
  const buildingsWithPositions: Building[] = buildings.map((b) => ({
    ...b,
    gridX: BUILDING_POSITIONS[b.name]?.x ?? 0,
    gridY: BUILDING_POSITIONS[b.name]?.y ?? 0,
  }));

  // 探索格子
  const handleExplore = (x: number, y: number) => {
    const row = fogState[y];
    if (!row || row[x] !== "revealed") return;

    setExploringTile({ x, y });

    // 探索动画
    setTimeout(() => {
      setFogState(prev => {
        const newFog = prev.map(row => [...row]);
        // 揭示当前格子
        const targetRow = newFog[y];
        if (targetRow) targetRow[x] = "visible";
        // 周围格子变为已揭示
        const neighbors: [number, number][] = [
          [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1],
          [y - 1, x - 1], [y - 1, x + 1], [y + 1, x - 1], [y + 1, x + 1]
        ];
        neighbors.forEach(([ny, nx]) => {
          if (ny >= 0 && ny < 6 && nx >= 0 && nx < 6) {
            const neighborRow = newFog[ny];
            if (neighborRow && neighborRow[nx] === "hidden") {
              neighborRow[nx] = "revealed";
            }
          }
        });
        return newFog;
      });
      setExploringTile(null);
      onExplore?.(x, y);
    }, 800);
  };

  // 计算探索进度
  const totalTiles = 36;
  const exploredTiles = fogState.flat().filter(f => f === "visible").length;
  const revealedTiles = fogState.flat().filter(f => f === "revealed").length;

  return (
    <div className="relative w-full overflow-hidden bg-[#0a0a08] p-4">
      {/* 地图标题 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#c9a227] font-bold">领地地图</span>
          <span className="text-xs text-[#666]">
            探索: {exploredTiles}/{totalTiles}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {revealedTiles > 0 && (
            <span className="text-[#4a9] animate-pulse">
              ✨ {revealedTiles} 处可探索
            </span>
          )}
        </div>
      </div>

      {/* 等距地图容器 */}
      <div
        className="relative mx-auto"
        style={{
          width: "100%",
          maxWidth: "500px",
          aspectRatio: "1.5",
        }}
      >
        {/* 等距变换容器 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: "rotateX(60deg) rotateZ(-45deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* 地图网格 */}
          <div className="relative">
            {DEFAULT_MAP.map((row, y) => (
              <div key={y} className="flex">
                {row.map((tileType, x) => {
                  const building = buildingsWithPositions.find(
                    (b) => b.gridX === x && b.gridY === y
                  );
                  const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
                  const isUpgrading = building && building.id === upgradingBuildingId;
                  const fog = fogState[y]?.[x] ?? "hidden";
                  const isExploring = exploringTile?.x === x && exploringTile?.y === y;
                  const canExplore = fog === "revealed";

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`
                        relative w-12 h-12 border border-[#2a2520]/30
                        ${fog === "hidden" ? "bg-[#0a0a08]" : TILE_STYLES[tileType]}
                        ${isHovered && fog !== "hidden" ? "brightness-125" : ""}
                        ${(building && fog === "visible") || canExplore ? "cursor-pointer" : ""}
                        ${isExploring ? "animate-pulse" : ""}
                        transition-all duration-200
                      `}
                      onMouseEnter={() => setHoveredTile({ x, y })}
                      onMouseLeave={() => setHoveredTile(null)}
                      onClick={() => {
                        if (canExplore) {
                          handleExplore(x, y);
                        } else if (building && fog === "visible") {
                          onBuildingClick?.(building);
                        }
                      }}
                    >
                      {/* 迷雾效果 */}
                      {fog === "hidden" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FogPattern />
                        </div>
                      )}

                      {/* 已揭示但未探索 - 可点击探索 */}
                      {fog === "revealed" && (
                        <div className="absolute inset-0">
                          <div className="absolute inset-0 bg-[#0a0a08]/60" />
                          {isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <span className="text-[#4a9] text-lg animate-bounce">👆</span>
                            </div>
                          )}
                          {!isHovered && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[#4a9]/50 text-xs">?</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 探索动画 */}
                      {isExploring && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="absolute inset-0 bg-[#c9a227]/30 animate-ping" />
                          <span className="text-xl">✨</span>
                        </div>
                      )}

                      {/* 建筑渲染 - 只在可见时显示 */}
                      {building && fog === "visible" && (
                        <BuildingSprite
                          building={building}
                          isUpgrading={isUpgrading ?? false}
                        />
                      )}

                      {/* 空地提示 - 只在可见时显示 */}
                      {!building && tileType === "dirt" && isHovered && fog === "visible" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[#c9a227]/50 text-xl">+</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 非等距的UI覆盖层 */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-[#666]">
          <span>缩放: 1x</span>
          <span>🧭 N</span>
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
        <LegendItem color="#2d4a2d" label="草地" />
        <LegendItem color="#4a3d2d" label="可建造" />
        <LegendItem color="#3d3529" label="道路" />
        <LegendItem color="#2d3d5a" label="水域" />
        <LegendItem color="#0a0a08" label="迷雾" border />
        <LegendItem color="#4a9" label="可探索" glow />
      </div>

      {/* 探索提示 */}
      {revealedTiles > 0 && (
        <div className="mt-3 text-center text-xs text-[#666]">
          💡 点击发光的格子消耗 1 AP 探索
        </div>
      )}
    </div>
  );
}

// 迷雾纹理
function FogPattern() {
  return (
    <div className="w-full h-full flex items-center justify-center opacity-30">
      <svg width="100%" height="100%" className="text-[#1a1a1a]">
        <pattern id="fogPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="currentColor" />
          <rect x="2" y="2" width="1" height="1" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#fogPattern)" />
      </svg>
    </div>
  );
}

// 建筑精灵渲染
function BuildingSprite({
  building,
  isUpgrading
}: {
  building: Building;
  isUpgrading: boolean;
}) {
  const pixels = BUILDING_PIXELS[building.name]?.[building.level] ?? [["🏠"]];
  const statusColor = building.status === "working" ? "#4a9" : building.status === "ready" ? "#c9a227" : "#666";

  return (
    <div
      className={`
        absolute inset-0 flex flex-col items-center justify-center
        ${isUpgrading ? "animate-pulse" : ""}
      `}
      style={{
        transform: "rotateZ(45deg) rotateX(-60deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 建筑像素 */}
      <div className="flex flex-col items-center scale-75">
        {pixels.map((row, i) => (
          <div key={i} className="flex">
            {row.map((pixel, j) => (
              <span
                key={j}
                className={`text-xs leading-none ${isUpgrading ? "animate-bounce" : ""}`}
                style={{ animationDelay: `${(i + j) * 100}ms` }}
              >
                {pixel}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* 状态指示器 */}
      <div
        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />

      {/* 等级标签 */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-[#c9a227] bg-[#0a0a08]/80 px-1">
        Lv{building.level}
      </div>

      {/* 升级动画效果 */}
      {isUpgrading && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 animate-ping bg-[#c9a227]/20 rounded-full" />
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#c9a227] animate-bounce">
            ⬆️
          </div>
        </div>
      )}
    </div>
  );
}

// 图例项
function LegendItem({ color, label, border, glow }: {
  color: string;
  label: string;
  border?: boolean;
  glow?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-3 h-3 ${border ? "border border-[#3a3a40]" : ""} ${glow ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
