// 行动历史面板 - 显示今日行动记录

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface ActionHistoryPanelProps {
  onClose: () => void;
}

const ACTION_ICONS: Record<string, string> = {
  build: "🏗️",
  explore: "🧭",
  combat: "⚔️",
  upgrade: "⬆️",
  production: "📦",
  recruit: "👤",
};

const ACTION_LABELS: Record<string, string> = {
  build: "建造",
  explore: "探索",
  combat: "战斗",
  upgrade: "升级",
  production: "生产",
  recruit: "招募",
};

export default function ActionHistoryPanel({ onClose }: ActionHistoryPanelProps) {
  // 获取今日行动记录
  const { data: todayData, isLoading } = api.player.getTodayActions.useQuery();

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const actions = todayData?.actions ?? [];
  const totalScore = todayData?.totalScore ?? 0;
  const day = todayData?.day ?? 0;

  // 按类型统计
  const typeStats = actions.reduce((acc, action) => {
    acc[action.type] = (acc[action.type] ?? 0) + action.baseScore + action.bonus;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-lg max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1810] to-[#101014] border-b border-[#c9a227]/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#c9a227] flex items-center justify-center text-3xl">
                📋
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">行动</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  今日记录 · DAY {day}
                </DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 分数概览 */}
        <div className="p-4 border-b border-[#2a2a30] bg-[#151518]">
          <div className="text-center">
            <div className="text-4xl font-bold text-[#c9a227]">{totalScore}</div>
            <div className="text-sm text-[#888] mt-1">今日总分</div>
          </div>

          {/* 分类统计 */}
          {Object.keys(typeStats).length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {Object.entries(typeStats).map(([type, score]) => (
                <div key={type} className="flex items-center gap-1 px-2 py-1 bg-[#1a1a20] text-sm">
                  <span>{ACTION_ICONS[type] ?? "📝"}</span>
                  <span className="text-[#888]">{ACTION_LABELS[type] ?? type}</span>
                  <span className="text-[#4a9]">+{score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 行动列表 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {actions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📭</div>
                <div className="text-[#888]">今日暂无行动记录</div>
                <div className="text-xs text-[#666] mt-1">去探索、战斗或建设吧！</div>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action, i) => {
                  const time = new Date(action.timestamp);
                  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={action.id ?? i}
                      className="p-3 border border-[#2a2a30] bg-[#1a1a20]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xl">{ACTION_ICONS[action.type] ?? "📝"}</div>
                          <div>
                            <div className="text-sm">{action.description}</div>
                            <div className="text-xs text-[#666] mt-0.5">{timeStr}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#4a9]">+{action.baseScore}</div>
                          {action.bonus > 0 && (
                            <div className="text-xs text-[#c9a227]">
                              +{action.bonus} {action.bonusReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部提示 */}
        <div className="p-3 bg-[#151518] border-t border-[#2a2a30] text-xs text-[#666] text-center">
          💡 每日达到200分即可获得奖励卡牌
        </div>
      </DialogContent>
    </Dialog>
  );
}
