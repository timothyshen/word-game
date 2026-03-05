"use client";

import type { HintItem } from "~/server/api/services/hint.service";

interface HintBarProps {
  hints: HintItem[];
  onHintClick: (action: string) => void;
  onShowAll: () => void;
}

export function HintBar({ hints, onHintClick, onShowAll }: HintBarProps) {
  if (hints.length === 0) return null;

  const topHints = hints.slice(0, 2);

  return (
    <div className="flex flex-col gap-1.5 w-64">
      {topHints.map(hint => (
        <button
          key={hint.id}
          onClick={() => hint.action && onHintClick(hint.action)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all hover:scale-[1.02] ${
            hint.priority === "high"
              ? "bg-[#c9a227]/15 border border-[#c9a227]/40 text-[#c9a227]"
              : hint.type === "tutorial"
                ? "bg-[#4a9eff]/10 border border-[#4a9eff]/30 text-[#4a9eff]"
                : "bg-[#0a0a15]/80 border border-[#2a3a4a] text-[#8a8a8a]"
          }`}
        >
          <span className="text-base shrink-0">{hint.icon}</span>
          <span className="truncate">{hint.message}</span>
        </button>
      ))}
      {hints.length > 2 && (
        <button
          onClick={onShowAll}
          className="text-[10px] text-[#5a6a7a] hover:text-[#c9a227] transition-colors text-center py-1"
        >
          查看全部({hints.length})
        </button>
      )}
    </div>
  );
}
