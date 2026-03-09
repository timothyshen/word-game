// 行动历史标签页

import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { ACTION_ICONS } from "~/constants";
import { ACTION_LABELS } from "./helpers";

export default function ActionHistoryTab() {
  const { data: todayData, isLoading } = api.player.getTodayActions.useQuery();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  const actions = todayData?.actions ?? [];
  const totalScore = todayData?.totalScore ?? 0;
  const day = todayData?.day ?? 0;

  const typeStats = actions.reduce((acc, action) => {
    acc[action.type] = (acc[action.type] ?? 0) + action.baseScore + action.bonus;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full flex flex-col">
      {/* 分数概览 */}
      <div className="flex-shrink-0 p-4 border-b border-[#2a2a30] bg-[#0a0a0c]">
        <div className="text-center">
          <div className="text-xs text-[#888] mb-1">DAY {day}</div>
          <div className="text-4xl font-bold text-[#c9a227]">{totalScore}</div>
          <div className="text-sm text-[#888] mt-1">今日总分</div>
        </div>

        {Object.keys(typeStats).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
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
      <ScrollArea className="flex-1">
        <div className="p-4">
          {actions.length === 0 ? (
            <div className="text-center py-12">
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
      <div className="flex-shrink-0 p-3 bg-[#0a0a0c] border-t border-[#2a2a30] text-xs text-[#666] text-center">
        每日达到200分即可获得奖励卡牌
      </div>
    </div>
  );
}
