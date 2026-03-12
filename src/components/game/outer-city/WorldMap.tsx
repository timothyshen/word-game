"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { renderMap, canvasToWorld } from "./map-canvas-renderer";
import type { TileData, POIData, HeroData } from "./map-canvas-renderer";

interface WorldMapProps {
  onClose: () => void;
  initialCenter?: { x: number; y: number };
  selectedHeroId?: string | null;
}

const BIOME_NAMES: Record<string, string> = {
  grassland: "草原",
  forest: "森林",
  mountain: "山脉",
  desert: "沙漠",
  swamp: "沼泽",
};

export default function WorldMap({ onClose, initialCenter, selectedHeroId }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: status } = api.outerCity.getStatus.useQuery();
  const { data: mapData } = api.outerCity.getVisibleMap.useQuery();

  const selectedHero = selectedHeroId
    ? status?.heroes?.find((h) => h.id === selectedHeroId)
    : status?.heroes?.[0];
  const defaultCenter = initialCenter ?? (selectedHero ? { x: selectedHero.positionX, y: selectedHero.positionY } : { x: 0, y: 0 });

  const [panOffset, setPanOffset] = useState(defaultCenter);
  const [tileSize, setTileSize] = useState(12);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; biome: string; name?: string; poiName?: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Touch zoom state
  const touchDistRef = useRef<number | null>(null);
  const touchTileSizeRef = useRef(tileSize);

  const tiles: TileData[] = useMemo(() => {
    if (!mapData?.areas) return [];
    return mapData.areas.map((a) => ({
      x: a.positionX,
      y: a.positionY,
      biome: a.biome,
      explorationLevel: a.explorationLevel,
    }));
  }, [mapData?.areas]);

  const areaLookup = useMemo(() => {
    const m = new Map<string, { biome: string; name?: string }>();
    mapData?.areas.forEach((a) => m.set(`${a.positionX},${a.positionY}`, { biome: a.biome, name: a.name ?? undefined }));
    return m;
  }, [mapData?.areas]);

  const poiLookup = useMemo(() => {
    const m = new Map<string, { type: string; name: string }>();
    mapData?.pois.forEach((p) => m.set(`${p.positionX},${p.positionY}`, { type: p.type, name: p.name }));
    return m;
  }, [mapData?.pois]);

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
      isSelected: !!selectedHero && h.id === selectedHero.id,
    }));
  }, [status?.heroes, selectedHero]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || tiles.length === 0) return;

    renderMap({
      canvas,
      tiles,
      pois,
      heroes,
      viewportCenter: selectedHero ? { x: selectedHero.positionX, y: selectedHero.positionY } : { x: 0, y: 0 },
      viewportRadius: 5,
      panOffset,
      tileSize,
      autoFit: false,
      showViewportRect: true,
    });
  }, [tiles, pois, heroes, panOffset, tileSize, selectedHero]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  // Keyboard: Esc to close (M is handled by parent toggle)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanOffset({
        x: panStart.x - dx / tileSize,
        y: panStart.y - dy / tileSize,
      });
    } else {
      // Hover: find tile under cursor
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setMousePos({ x: e.clientX, y: e.clientY });

      const world = canvasToWorld(cx, cy, canvas.clientWidth, canvas.clientHeight, tileSize, panOffset);
      const area = areaLookup.get(`${world.x},${world.y}`);
      const poi = poiLookup.get(`${world.x},${world.y}`);

      if (area) {
        setHoveredTile({
          x: world.x,
          y: world.y,
          biome: area.biome,
          name: area.name,
          poiName: poi?.name,
        });
      } else {
        setHoveredTile(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scroll zoom — use native listener to avoid passive event issues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setTileSize((prev) => Math.max(4, Math.min(24, prev + (e.deltaY < 0 ? 1 : -1))));
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0]!.clientX, y: e.touches[0]!.clientY });
      setPanStart(panOffset);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      touchDistRef.current = Math.hypot(dx, dy);
      touchTileSizeRef.current = tileSize;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0]!.clientX - dragStart.x;
      const dy = e.touches[0]!.clientY - dragStart.y;
      setPanOffset({
        x: panStart.x - dx / tileSize,
        y: panStart.y - dy / tileSize,
      });
    } else if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / touchDistRef.current;
      setTileSize(Math.max(4, Math.min(24, Math.round(touchTileSizeRef.current * scale))));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#050810]/95 backdrop-blur-sm">
      {/* Header */}
      <div className="game-panel-header flex items-center justify-between px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg text-[#c9a227]">世界地图</h2>
        <button
          onClick={onClose}
          className="text-[#5a6a7a] hover:text-[#c9a227] transition-colors p-1"
          aria-label="关闭地图"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Hover tooltip */}
        {hoveredTile && !isDragging && (
          <div
            className="fixed z-50 pointer-events-none px-2 py-1 rounded text-xs bg-[#0a0a15]/95 border border-[var(--game-gold-dark)] text-[#e0dcd0]"
            style={{
              left: mousePos.x + 12,
              top: mousePos.y - 8,
            }}
          >
            <span className="text-[#c9a227]">({hoveredTile.x}, {hoveredTile.y})</span>
            {" "}
            {BIOME_NAMES[hoveredTile.biome] ?? hoveredTile.biome}
            {hoveredTile.poiName && (
              <span className="text-[#4a9eff] ml-1">· {hoveredTile.poiName}</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="game-panel-header flex items-center justify-between px-4 py-2 sm:px-6 gap-2 border-t border-[rgba(201,162,39,0.2)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTileSize((s) => Math.min(24, s + 2))}
            className="game-btn-secondary px-2.5 py-1.5 rounded text-sm"
            aria-label="放大"
          >
            +
          </button>
          <button
            onClick={() => setTileSize((s) => Math.max(4, s - 2))}
            className="game-btn-secondary px-2.5 py-1.5 rounded text-sm"
            aria-label="缩小"
          >
            −
          </button>
          <span className="text-[#5a6a7a] text-xs ml-1">{tileSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedHero) setPanOffset({ x: selectedHero.positionX, y: selectedHero.positionY });
            }}
            className="game-btn-secondary px-3 py-1.5 rounded text-xs"
          >
            定位英雄
          </button>
          <button
            onClick={() => setPanOffset({ x: 0, y: 0 })}
            className="game-btn-secondary px-3 py-1.5 rounded text-xs"
          >
            定位主城
          </button>
        </div>
      </div>
    </div>
  );
}
