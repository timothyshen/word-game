"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// 地形颜色映射
const biomeColors: Record<string, string> = {
  grassland: "#4a7c59",
  forest: "#2d5a27",
  mountain: "#6b6b6b",
  desert: "#c9a227",
  swamp: "#3d5a47",
};

// 地形图标映射
const biomeIcons: Record<string, string> = {
  grassland: "🌿",
  forest: "🌲",
  mountain: "⛰️",
  desert: "🏜️",
  swamp: "🌊",
};

// POI图标映射
const poiIcons: Record<string, string> = {
  resource: "💎",
  garrison: "⚔️",
  lair: "🐉",
  settlement: "🏘️",
};

interface OuterCityPanelProps {
  onClose?: () => void;
}

export default function OuterCityPanel({ onClose }: OuterCityPanelProps) {
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });

  const utils = api.useUtils();

  const { data: status, isLoading } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const deployHero = api.outerCity.deployHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
    },
  });

  const recallHero = api.outerCity.recallHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
    },
  });

  const moveHero = api.outerCity.moveHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
      void utils.outerCity.getVisibleMap.invalidate();
    },
  });

  const restHero = api.outerCity.restHero.useMutation({
    onSuccess: () => {
      void utils.outerCity.getStatus.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[#aaa]">加载中...</p>
      </div>
    );
  }

  const currentHero = status?.heroes.find((h) => h.id === selectedHero);
  const gridSize = 40;
  const mapWidth = 11;
  const mapHeight = 9;

  // 计算地图范围
  const minX = -Math.floor(mapWidth / 2) + mapOffset.x;
  const maxX = Math.floor(mapWidth / 2) + mapOffset.x;
  const minY = -Math.floor(mapHeight / 2) + mapOffset.y;
  const maxY = Math.floor(mapHeight / 2) + mapOffset.y;

  const handleTileClick = (x: number, y: number) => {
    if (!currentHero) return;

    // 检查是否是相邻格子
    const dx = Math.abs(x - currentHero.positionX);
    const dy = Math.abs(y - currentHero.positionY);

    if (dx + dy === 1) {
      moveHero.mutate({ heroId: currentHero.id, targetX: x, targetY: y });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#c9a227]">外城探索</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded bg-[#3a3a42] px-3 py-1 text-sm hover:bg-[#4a4a52]"
          >
            返回内城
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-4">
        {/* 左侧：英雄列表 */}
        <div className="w-48 flex-shrink-0 rounded-lg border border-[#3a3a42] bg-[#1a1a1e] p-3">
          <h3 className="mb-2 text-sm font-semibold text-[#c9a227]">派遣英雄</h3>

          {/* 已派遣的英雄 */}
          {status?.heroes && status.heroes.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-[#888]">已派遣</p>
              {status.heroes.map((hero) => (
                <div
                  key={hero.id}
                  onClick={() => setSelectedHero(hero.id)}
                  className={`mb-1 cursor-pointer rounded p-2 ${
                    selectedHero === hero.id
                      ? "bg-[#c9a227]/20 border border-[#c9a227]"
                      : "bg-[#2a2a30] hover:bg-[#3a3a42]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{hero.character.character.portrait}</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm">
                        {hero.character.character.name}
                      </p>
                      <p className="text-xs text-[#888]">
                        体力: {hero.stamina}/100
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restHero.mutate({ heroId: hero.id });
                      }}
                      className="flex-1 rounded bg-[#4a7c59] px-1 py-0.5 text-xs hover:bg-[#5a8c69]"
                      disabled={restHero.isPending}
                    >
                      休息
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        recallHero.mutate({ heroId: hero.id });
                      }}
                      className="flex-1 rounded bg-[#7c4a4a] px-1 py-0.5 text-xs hover:bg-[#8c5a5a]"
                      disabled={recallHero.isPending}
                    >
                      召回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 可派遣的角色 */}
          {status?.availableCharacters && status.availableCharacters.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-[#888]">可派遣</p>
              {status.availableCharacters.map((char) => (
                <div
                  key={char.id}
                  className="mb-1 flex items-center gap-2 rounded bg-[#2a2a30] p-2"
                >
                  <span>{char.character.portrait}</span>
                  <p className="flex-1 truncate text-sm">
                    {char.character.name}
                  </p>
                  <button
                    onClick={() => deployHero.mutate({ characterId: char.id })}
                    className="rounded bg-[#4a7c59] px-2 py-0.5 text-xs hover:bg-[#5a8c69]"
                    disabled={deployHero.isPending}
                  >
                    派遣
                  </button>
                </div>
              ))}
            </div>
          )}

          {!status?.heroes?.length && !status?.availableCharacters?.length && (
            <p className="text-center text-sm text-[#888]">暂无可派遣角色</p>
          )}
        </div>

        {/* 右侧：地图 */}
        <div className="flex-1 overflow-hidden rounded-lg border border-[#3a3a42] bg-[#1a1a1e]">
          {/* 地图控制 */}
          <div className="flex items-center justify-between border-b border-[#3a3a42] px-3 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setMapOffset((o) => ({ ...o, y: o.y - 1 }))}
                className="rounded bg-[#2a2a30] px-2 py-1 text-sm hover:bg-[#3a3a42]"
              >
                ↑
              </button>
              <button
                onClick={() => setMapOffset((o) => ({ ...o, y: o.y + 1 }))}
                className="rounded bg-[#2a2a30] px-2 py-1 text-sm hover:bg-[#3a3a42]"
              >
                ↓
              </button>
              <button
                onClick={() => setMapOffset((o) => ({ ...o, x: o.x - 1 }))}
                className="rounded bg-[#2a2a30] px-2 py-1 text-sm hover:bg-[#3a3a42]"
              >
                ←
              </button>
              <button
                onClick={() => setMapOffset((o) => ({ ...o, x: o.x + 1 }))}
                className="rounded bg-[#2a2a30] px-2 py-1 text-sm hover:bg-[#3a3a42]"
              >
                →
              </button>
            </div>
            <button
              onClick={() => setMapOffset({ x: 0, y: 0 })}
              className="rounded bg-[#2a2a30] px-2 py-1 text-sm hover:bg-[#3a3a42]"
            >
              回到城门
            </button>
          </div>

          {/* 地图网格 */}
          <div className="flex items-center justify-center p-4">
            <div
              className="relative"
              style={{
                width: mapWidth * gridSize,
                height: mapHeight * gridSize,
              }}
            >
              {/* 渲染格子 */}
              {Array.from({ length: mapHeight }).map((_, row) =>
                Array.from({ length: mapWidth }).map((_, col) => {
                  const x = minX + col;
                  const y = minY + row;

                  // 查找该位置的探索数据
                  const area = mapData?.areas.find(
                    (a) => a.positionX === x && a.positionY === y
                  );
                  const poi = mapData?.pois.find(
                    (p) => p.positionX === x && p.positionY === y
                  );
                  const hero = status?.heroes.find(
                    (h) => h.positionX === x && h.positionY === y
                  );

                  // 检查是否可移动
                  const canMove =
                    currentHero &&
                    Math.abs(x - currentHero.positionX) +
                      Math.abs(y - currentHero.positionY) ===
                      1;

                  const isSelected =
                    hero && selectedHero && hero.id === selectedHero;

                  return (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleTileClick(x, y)}
                      className={`absolute flex items-center justify-center border transition-all ${
                        area
                          ? area.explorationLevel === 2
                            ? "border-[#3a3a42]"
                            : "border-[#2a2a30] opacity-50"
                          : "border-[#1a1a1e] opacity-20"
                      } ${canMove ? "cursor-pointer ring-2 ring-[#c9a227]" : ""} ${
                        isSelected ? "ring-2 ring-[#4a9]" : ""
                      }`}
                      style={{
                        left: col * gridSize,
                        top: row * gridSize,
                        width: gridSize,
                        height: gridSize,
                        backgroundColor: area
                          ? biomeColors[area.biome] ?? "#333"
                          : "#111",
                      }}
                      title={
                        area
                          ? `${area.name} (${x}, ${y})`
                          : `未探索 (${x}, ${y})`
                      }
                    >
                      {/* 地形图标 */}
                      {area && area.explorationLevel === 2 && !poi && !hero && (
                        <span className="text-xs opacity-30">
                          {biomeIcons[area.biome]}
                        </span>
                      )}

                      {/* POI */}
                      {poi && (
                        <span className="text-lg">
                          {poiIcons[poi.type] ?? poi.icon}
                        </span>
                      )}

                      {/* 英雄 */}
                      {hero && (
                        <span className="text-lg">
                          {hero.character.character.portrait}
                        </span>
                      )}

                      {/* 城门标记 */}
                      {x === 0 && y === 0 && !hero && (
                        <span className="text-lg">🏰</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 当前英雄信息 */}
      {currentHero && (
        <div className="rounded-lg border border-[#3a3a42] bg-[#1a1a1e] p-3">
          <div className="flex items-center gap-4">
            <span className="text-2xl">
              {currentHero.character.character.portrait}
            </span>
            <div>
              <p className="font-semibold">
                {currentHero.character.character.name}
              </p>
              <p className="text-sm text-[#888]">
                位置: ({currentHero.positionX}, {currentHero.positionY}) | 体力:{" "}
                {currentHero.stamina}/100 | 状态: {currentHero.status}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
