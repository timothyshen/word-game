// Isometric Pixel Map Component
// 等距像素地图组件 - 显示领地建筑的成长 + 战争迷雾

import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "~/trpc/react";

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

// 建筑默认位置（祭坛和传送门需要探索发现，不在此列）
const BUILDING_POSITIONS: Record<string, { x: number; y: number }> = {
  "主城堡": { x: 2, y: 2 },
  "农田": { x: 1, y: 1 },
  "铁匠铺": { x: 3, y: 1 },
  "兵营": { x: 1, y: 3 },
  "市场": { x: 3, y: 3 },
};

// 地图中心偏移（将grid坐标转换为territory坐标）
const MAP_CENTER_X = 2;
const MAP_CENTER_Y = 2;

// 将grid坐标转换为territory坐标
function gridToTerritory(gridX: number, gridY: number): { x: number; y: number } {
  return { x: gridX - MAP_CENTER_X, y: gridY - MAP_CENTER_Y };
}

// 将territory坐标转换为grid坐标
function territoryToGrid(terrX: number, terrY: number): { x: number; y: number } {
  return { x: terrX + MAP_CENTER_X, y: terrY + MAP_CENTER_Y };
}

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
  onExpand?: (x: number, y: number) => void; // 扩建领地
  isExpanding?: boolean; // 是否正在扩建中
}

export default function IsometricMap({
  buildings,
  onBuildingClick,
  upgradingBuildingId,
  onExpand,
  isExpanding = false,
}: IsometricMapProps) {
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [fogState, setFogState] = useState<FogState[][]>(() =>
    Array(6).fill(null).map(() => Array(6).fill("hidden") as FogState[])
  );
  const [exploringTile, setExploringTile] = useState<{ x: number; y: number } | null>(null);

  const utils = api.useUtils();

  // 获取已解锁的领地
  const { data: territoryData } = api.territory.getAll.useQuery();

  // 获取可解锁的格子
  const { data: unlockableData } = api.territory.getUnlockable.useQuery();

  // 解锁领地mutation
  const unlockMutation = api.territory.unlock.useMutation({
    onSuccess: () => {
      void utils.territory.getAll.invalidate();
      void utils.territory.getUnlockable.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 根据API数据更新fog状态
  useEffect(() => {
    if (!territoryData || !unlockableData) return;

    const newFog: FogState[][] = Array(6).fill(null).map(() =>
      Array(6).fill("hidden") as FogState[]
    );

    // 标记已解锁的格子为visible
    for (const tile of territoryData) {
      const { x, y } = territoryToGrid(tile.positionX, tile.positionY);
      if (x >= 0 && x < 6 && y >= 0 && y < 6) {
        const row = newFog[y];
        if (row) row[x] = "visible";
      }
    }

    // 标记可解锁的格子为revealed
    for (const pos of unlockableData.unlockable) {
      const { x, y } = territoryToGrid(pos.positionX, pos.positionY);
      if (x >= 0 && x < 6 && y >= 0 && y < 6) {
        const row = newFog[y];
        if (row && row[x] === "hidden") row[x] = "revealed";
      }
    }

    setFogState(newFog);
  }, [territoryData, unlockableData]);

  // 地图拖动状态
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // 缩放状态
  const [scale, setScale] = useState(1);

  // 开始拖动
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: clientX, y: clientY };
    offsetStartRef.current = { ...mapOffset };
  }, [mapOffset]);

  // 拖动中
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    // 如果移动超过5px，标记为已拖动（防止误触点击）
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }

    setMapOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  }, [isDragging]);

  // 结束拖动
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只响应左键
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    handleDragEnd();
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (touch) {
        handleDragStart(touch.clientX, touch.clientY);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (touch) {
        handleDragMove(touch.clientX, touch.clientY);
      }
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(2, Math.max(0.5, prev + delta)));
  };

  // 重置视图
  const resetView = () => {
    setMapOffset({ x: 0, y: 0 });
    setScale(1);
  };

  // 将建筑放置到地图上
  const buildingsWithPositions: Building[] = buildings.map((b) => ({
    ...b,
    gridX: BUILDING_POSITIONS[b.name]?.x ?? 0,
    gridY: BUILDING_POSITIONS[b.name]?.y ?? 0,
  }));

  // 扩建领地格子
  const handleExpandTile = (gridX: number, gridY: number) => {
    const row = fogState[gridY];
    if (!row || row[gridX] !== "revealed") return;
    if (isExpanding || unlockMutation.isPending) return; // 防止重复点击

    setExploringTile({ x: gridX, y: gridY });

    // 转换为territory坐标
    const { x: terrX, y: terrY } = gridToTerritory(gridX, gridY);

    // 调用API解锁
    unlockMutation.mutate(
      { positionX: terrX, positionY: terrY },
      {
        onSuccess: () => {
          setExploringTile(null);
          onExpand?.(gridX, gridY);
        },
        onError: () => {
          setExploringTile(null);
        },
      }
    );
  };

  // 计算扩建进度
  const totalTiles = 36;
  const expandedTiles = territoryData?.length ?? 0;
  const revealedTiles = unlockableData?.unlockable.length ?? 0;

  return (
    <div className="relative w-full overflow-hidden bg-[#0a0a08] p-4">
      {/* 地图标题 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#c9a227] font-bold">领地地图</span>
          <span className="text-xs text-[#666]">
            领地: {expandedTiles}/{totalTiles}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {revealedTiles > 0 && (
            <span className="text-[#4a9] animate-pulse">
              ✨ {revealedTiles} 处可扩建
            </span>
          )}
        </div>
      </div>

      {/* 等距地图容器 */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "500px",
          aspectRatio: "1.5",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* 等距变换容器 */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform"
          style={{
            transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${scale}) rotateX(60deg) rotateZ(-45deg)`,
            transformStyle: "preserve-3d",
            transitionDuration: isDragging ? "0ms" : "150ms",
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
                  const isExpandingTile = exploringTile?.x === x && exploringTile?.y === y;
                  const canExpand = fog === "revealed";

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`
                        relative w-12 h-12 border border-[#2a2520]/30
                        ${fog === "hidden" ? "bg-[#0a0a08]" : TILE_STYLES[tileType]}
                        ${isHovered && fog !== "hidden" ? "brightness-125" : ""}
                        ${(building && fog === "visible") || canExpand ? "cursor-pointer" : ""}
                        ${isExpandingTile ? "animate-pulse" : ""}
                        transition-all duration-200
                      `}
                      onMouseEnter={() => setHoveredTile({ x, y })}
                      onMouseLeave={() => setHoveredTile(null)}
                      onClick={() => {
                        // 如果刚刚拖动过，不触发点击
                        if (hasDraggedRef.current) return;

                        if (canExpand) {
                          handleExpandTile(x, y);
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

                      {/* 扩建动画 */}
                      {isExpandingTile && (
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
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-xs text-[#666]">
          <span>缩放: {scale.toFixed(1)}x</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetView();
              }}
              className="px-2 py-0.5 bg-[#2a2520] hover:bg-[#3a3530] rounded text-[#999] transition-colors"
            >
              重置
            </button>
            <span>🧭 N</span>
          </div>
        </div>

        {/* 拖动提示 */}
        {!isDragging && mapOffset.x === 0 && mapOffset.y === 0 && scale === 1 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-[#666] bg-[#0a0a08]/80 px-2 py-1 rounded pointer-events-none">
            拖动移动 · 滚轮缩放
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
        <LegendItem color="#2d4a2d" label="草地" />
        <LegendItem color="#4a3d2d" label="可建造" />
        <LegendItem color="#3d3529" label="道路" />
        <LegendItem color="#2d3d5a" label="水域" />
        <LegendItem color="#0a0a08" label="未开发" border />
        <LegendItem color="#4a9" label="可扩建" glow />
      </div>

      {/* 扩建提示 */}
      {revealedTiles > 0 && (
        <div className="mt-3 text-center text-xs text-[#666]">
          💡 点击发光的格子扩建领地
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
