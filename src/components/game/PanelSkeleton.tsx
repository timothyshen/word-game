/**
 * PanelSkeleton - Shimmer loading placeholder for game panels.
 * Replaces bare "加载中..." text with animated skeleton rows.
 */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded skeleton-shimmer"
          style={{ width: `${80 - i * 12}%`, opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
