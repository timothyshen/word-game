// Shared 2D canvas rendering for minimap and world map

import { getBiomeColor, POI_COLORS } from "~/constants/game-colors";

export interface TileData {
  x: number;
  y: number;
  biome: string;
  explorationLevel: number; // 0=hidden, 1=fog, 2=visible
}

export interface POIData {
  x: number;
  y: number;
  type: string;
  name?: string;
}

export interface HeroData {
  x: number;
  y: number;
  isSelected: boolean;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapRenderOptions {
  canvas: HTMLCanvasElement;
  tiles: TileData[];
  pois: POIData[];
  heroes: HeroData[];
  viewportCenter: { x: number; y: number };
  viewportRadius: number;
  panOffset?: { x: number; y: number };
  tileSize?: number;
  showViewportRect?: boolean;
  autoFit?: boolean;
  padding?: number;
}

export function computeBounds(tiles: TileData[]): MapBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    if (tile.explorationLevel <= 0) continue;
    if (tile.x < minX) minX = tile.x;
    if (tile.x > maxX) maxX = tile.x;
    if (tile.y < minY) minY = tile.y;
    if (tile.y > maxY) maxY = tile.y;
  }

  // Include base (0,0) in bounds
  if (0 < minX) minX = 0;
  if (0 > maxX) maxX = 0;
  if (0 < minY) minY = 0;
  if (0 > maxY) maxY = 0;

  // Add 1-tile padding
  return { minX: minX - 1, maxX: maxX + 1, minY: minY - 1, maxY: maxY + 1 };
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
): void {
  const innerR = outerR * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    if (i === 0) {
      ctx.moveTo(cx + outerR * Math.cos(outerAngle), cy + outerR * Math.sin(outerAngle));
    } else {
      ctx.lineTo(cx + outerR * Math.cos(outerAngle), cy + outerR * Math.sin(outerAngle));
    }
    ctx.lineTo(cx + innerR * Math.cos(innerAngle), cy + innerR * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fillStyle = "#c9a227";
  ctx.fill();
  ctx.strokeStyle = "#8b6914";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  selected: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size * 0.7, cy + size * 0.5);
  ctx.lineTo(cx + size * 0.7, cy + size * 0.5);
  ctx.closePath();
  ctx.fillStyle = selected ? "#ffffff" : "#c9a227";
  ctx.fill();
  ctx.strokeStyle = selected ? "#c9a227" : "#8b6914";
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

export function renderMap(options: MapRenderOptions): void {
  const {
    canvas,
    tiles,
    pois,
    heroes,
    viewportCenter,
    viewportRadius,
    panOffset,
    showViewportRect = true,
    autoFit = false,
    padding = 8,
  } = options;

  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;

  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayW, displayH);

  // Compute bounds and tile size
  const bounds = computeBounds(tiles);
  const worldW = bounds.maxX - bounds.minX + 1;
  const worldH = bounds.maxY - bounds.minY + 1;

  let tileSize: number;
  let offsetX: number;
  let offsetY: number;

  if (autoFit) {
    const availW = displayW - padding * 2;
    const availH = displayH - padding * 2;
    tileSize = Math.max(2, Math.min(availW / worldW, availH / worldH));
    // Center the map in the canvas
    offsetX = (displayW - worldW * tileSize) / 2 - bounds.minX * tileSize;
    offsetY = (displayH - worldH * tileSize) / 2 - bounds.minY * tileSize;
  } else {
    tileSize = options.tileSize ?? 10;
    const pan = panOffset ?? viewportCenter;
    offsetX = displayW / 2 - pan.x * tileSize - tileSize / 2;
    offsetY = displayH / 2 - pan.y * tileSize - tileSize / 2;
  }

  // Draw tiles
  const gap = tileSize > 6 ? 1 : 0;
  for (const tile of tiles) {
    if (tile.explorationLevel <= 0) continue;

    const px = offsetX + tile.x * tileSize;
    const py = offsetY + tile.y * tileSize;

    // Skip tiles outside canvas
    if (px + tileSize < 0 || px > displayW || py + tileSize < 0 || py > displayH) continue;

    ctx.globalAlpha = tile.explorationLevel === 1 ? 0.45 : 1;
    ctx.fillStyle = getBiomeColor(tile.biome);
    ctx.fillRect(px + gap, py + gap, tileSize - gap, tileSize - gap);
  }
  ctx.globalAlpha = 1;

  // Draw POI dots
  const poiDotR = Math.max(1.5, tileSize * 0.2);
  for (const poi of pois) {
    const px = offsetX + poi.x * tileSize + tileSize / 2;
    const py = offsetY + poi.y * tileSize + tileSize / 2;
    if (px < -10 || px > displayW + 10 || py < -10 || py > displayH + 10) continue;

    ctx.beginPath();
    ctx.arc(px, py, poiDotR, 0, Math.PI * 2);
    ctx.fillStyle = (POI_COLORS as Record<string, string>)[poi.type] ?? "#888";
    ctx.fill();
  }

  // Draw viewport rectangle
  if (showViewportRect) {
    const vx = offsetX + (viewportCenter.x - viewportRadius) * tileSize;
    const vy = offsetY + (viewportCenter.y - viewportRadius) * tileSize;
    const vs = (viewportRadius * 2 + 1) * tileSize;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(vx, vy, vs, vs);
    ctx.setLineDash([]);
  }

  // Draw base marker at (0,0)
  const baseX = offsetX + 0 * tileSize + tileSize / 2;
  const baseY = offsetY + 0 * tileSize + tileSize / 2;
  const starR = Math.max(3, tileSize * 0.4);
  drawStar(ctx, baseX, baseY, starR);

  // Draw hero markers
  const heroSize = Math.max(2.5, tileSize * 0.3);
  for (const hero of heroes) {
    const hx = offsetX + hero.x * tileSize + tileSize / 2;
    const hy = offsetY + hero.y * tileSize + tileSize / 2;
    if (hx < -10 || hx > displayW + 10 || hy < -10 || hy > displayH + 10) continue;
    drawTriangle(ctx, hx, hy, heroSize, hero.isSelected);
  }
}

/** Convert canvas pixel position to world tile coordinates */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  displayW: number,
  displayH: number,
  tileSize: number,
  panOffset: { x: number; y: number },
): { x: number; y: number } {
  const offsetX = displayW / 2 - panOffset.x * tileSize - tileSize / 2;
  const offsetY = displayH / 2 - panOffset.y * tileSize - tileSize / 2;
  return {
    x: Math.floor((canvasX - offsetX) / tileSize),
    y: Math.floor((canvasY - offsetY) / tileSize),
  };
}
