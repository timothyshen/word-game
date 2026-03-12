"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { renderMap } from "./map-canvas-renderer";
import type { TileData, POIData, HeroData } from "./map-canvas-renderer";

interface MinimapProps {
  heroPosition: { x: number; y: number } | null;
  viewportCenter: { x: number; y: number };
  viewportRadius: number;
  onOpenWorldMap: () => void;
}

export default function Minimap({
  heroPosition,
  viewportCenter,
  viewportRadius,
  onOpenWorldMap,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: status } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const tiles: TileData[] = useMemo(() => {
    if (!mapData?.areas) return [];
    return mapData.areas.map((a) => ({
      x: a.positionX,
      y: a.positionY,
      biome: a.biome,
      explorationLevel: a.explorationLevel,
    }));
  }, [mapData?.areas]);

  const pois: POIData[] = useMemo(() => {
    if (!mapData?.pois) return [];
    return mapData.pois.map((p) => ({
      x: p.positionX,
      y: p.positionY,
      type: p.type,
      name: p.name,
    }));
  }, [mapData?.pois]);

  const heroes: HeroData[] = useMemo(() => {
    if (!status?.heroes) return [];
    return status.heroes.map((h) => ({
      x: h.positionX,
      y: h.positionY,
      isSelected: heroPosition ? h.positionX === heroPosition.x && h.positionY === heroPosition.y : false,
    }));
  }, [status?.heroes, heroPosition]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || tiles.length === 0) return;

    renderMap({
      canvas,
      tiles,
      pois,
      heroes,
      viewportCenter,
      viewportRadius,
      autoFit: true,
      showViewportRect: true,
      padding: 6,
    });
  }, [tiles, pois, heroes, viewportCenter, viewportRadius]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    const canvas = canvasRef.current;
    if (canvas?.parentElement) {
      observer.observe(canvas.parentElement);
    }
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div
      className="game-panel fixed bottom-[4.5rem] right-3 z-30 cursor-pointer pointer-events-auto sm:bottom-20 sm:right-6"
      onClick={onOpenWorldMap}
      title="点击打开世界地图 (M)"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenWorldMap(); }}
    >
      <canvas
        ref={canvasRef}
        className="block w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded"
      />
    </div>
  );
}
