"use client";

interface BaseIndicatorProps {
  heroPosition: { x: number; y: number } | null;
  viewportRadius: number;
}

export default function BaseIndicator({ heroPosition, viewportRadius }: BaseIndicatorProps) {
  if (!heroPosition) return null;

  // Check if base (0,0) is within visible tiles
  const isVisible = Math.abs(heroPosition.x) <= viewportRadius && Math.abs(heroPosition.y) <= viewportRadius;
  if (isVisible) return null;

  // Compute direction from hero to base
  const dx = 0 - heroPosition.x;
  const dy = 0 - heroPosition.y;

  // Manhattan distance
  const distance = Math.abs(heroPosition.x) + Math.abs(heroPosition.y);

  // Angle from hero to base (screen space: x=right, y=down in the 3D isometric view)
  // In the 3D view, world +x goes screen-right, world +y goes screen-down (roughly)
  const angle = Math.atan2(dy, dx);

  // Position the indicator at the screen edge
  // Use a margin from edges (percentage-based for responsiveness)
  const margin = 48;
  const maxX = 50; // percent from center
  const maxY = 40;

  // Normalize direction to fit within screen bounds
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));

  let px: number;
  let py: number;

  if (absCos * maxY > absSin * maxX) {
    // Hit horizontal edge
    px = Math.sign(Math.cos(angle)) * maxX;
    py = Math.sign(Math.sin(angle)) * maxX * (absSin / absCos);
  } else {
    // Hit vertical edge
    px = Math.sign(Math.cos(angle)) * maxY * (absCos / absSin);
    py = Math.sign(Math.sin(angle)) * maxY;
  }

  const left = `calc(50% + ${px}% - ${margin / 2}px)`;
  const top = `calc(50% + ${py}% - ${margin / 2}px)`;

  // Arrow rotation (CSS degrees, 0 = pointing right)
  const arrowDeg = (angle * 180) / Math.PI;

  return (
    <div
      className="fixed z-30 pointer-events-none flex items-center gap-1"
      style={{ left, top, width: margin, height: margin }}
    >
      <div
        className="flex items-center gap-1"
        style={{ transform: `rotate(${arrowDeg}deg)` }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#c9a227" className="shrink-0">
          <path d="M5 12h14M13 5l7 7-7 7" stroke="#c9a227" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-[#c9a227] font-bold bg-[#0a0a0c]/70 px-1 rounded">
        主城 {distance}格
      </div>
    </div>
  );
}
