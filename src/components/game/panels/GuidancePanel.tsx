"use client";

import { api } from "~/trpc/react";
import type { HintItem } from "~/server/api/services/hint.service";

interface GuidancePanelProps {
  hints: HintItem[];
  onClose: () => void;
  onHintClick: (action: string) => void;
}

const PRIORITY_CONFIG = {
  high: { label: "紧急事项", color: "#c9a227", borderColor: "#c9a227" },
  medium: { label: "系统教学", color: "#4a9eff", borderColor: "#4a9eff" },
  low: { label: "效率建议", color: "#5a6a7a", borderColor: "#3a4a5a" },
} as const;

export function GuidancePanel({ hints, onClose, onHintClick }: GuidancePanelProps) {
  const utils = api.useUtils();
  const dismissMutation = api.player.dismissTutorial.useMutation({
    onSuccess: () => void utils.player.getStatus.invalidate(),
  });

  const grouped = {
    high: hints.filter(h => h.priority === "high"),
    medium: hints.filter(h => h.priority === "medium"),
    low: hints.filter(h => h.priority === "low"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
      <div className="w-[480px] max-h-[80vh] bg-[#0a0a15]/95 border border-[#2a3a4a] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a3a4a] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display text-[#e0dcd0]">引导</h2>
            <p className="text-xs font-game-serif text-[#5a6a7a]">当前可以做的事情</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a6a7a] hover:text-[#e0dcd0] text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {(["high", "medium", "low"] as const).map(priority => {
            const items = grouped[priority];
            if (items.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];

            return (
              <div key={priority}>
                <div className="text-xs font-medium mb-2" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map(hint => (
                    <div
                      key={hint.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
                      style={{ borderColor: `${config.borderColor}40`, backgroundColor: `${config.borderColor}08` }}
                    >
                      <span className="text-xl shrink-0">{hint.icon}</span>
                      <span className="flex-1 text-sm text-[#e0dcd0]">{hint.message}</span>
                      <div className="flex gap-2 shrink-0">
                        {hint.type === "tutorial" && (
                          <button
                            onClick={() => {
                              const systemFlag = hint.id.replace("tutorial_", "");
                              dismissMutation.mutate({ flag: `tutorial_${systemFlag}_read` });
                            }}
                            className="px-2 py-1 text-[10px] text-[#5a6a7a] hover:text-[#e0dcd0] border border-[#2a3a4a] rounded transition-colors"
                          >
                            知道了
                          </button>
                        )}
                        {hint.action && hint.action !== "levelUp" && (
                          <button
                            onClick={() => {
                              onHintClick(hint.action!);
                              onClose();
                            }}
                            className="px-2 py-1 text-[10px] border rounded transition-colors"
                            style={{ color: config.color, borderColor: `${config.borderColor}60` }}
                          >
                            前往
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {hints.length === 0 && (
            <div className="text-center py-12 text-[#5a6a7a]">
              <div className="text-sm">一切就绪，自由探索吧！</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
