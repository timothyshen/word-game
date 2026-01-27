// 结算标签页

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { ACTION_ICONS } from "~/constants";
import { ScoreBar } from "./helpers";

// 结算用稀有度颜色（略有不同的紫色调）
const rarityColors: Record<string, string> = {
  "普通": "#888",
  "精良": "#4a9",
  "稀有": "#9b59b6",
  "史诗": "#e67e22",
  "传说": "#c9a227",
};

function getScoreGrade(score: number) {
  if (score >= 500) return { grade: "S", color: "#c9a227" };
  if (score >= 400) return { grade: "A", color: "#4a9" };
  if (score >= 300) return { grade: "B", color: "#59b" };
  if (score >= 200) return { grade: "C", color: "#888" };
  return { grade: "D", color: "#666" };
}

export default function SettlementTab() {
  const [showDetails, setShowDetails] = useState(false);
  const [settlementResult, setSettlementResult] = useState<{
    settled: boolean;
    grantedCards?: Array<{ name: string; rarity: string }>;
    newStreakDays?: number;
  } | null>(null);

  const utils = api.useUtils();

  const { data: preview, isLoading } = api.settlement.getSettlementPreview.useQuery();
  const { data: history } = api.settlement.getHistory.useQuery();

  const collectOutputMutation = api.building.collectDailyOutput.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
      void utils.settlement.getSettlementPreview.invalidate();
    },
  });

  const settleMutation = api.settlement.executeSettlement.useMutation({
    onSuccess: (data) => {
      setSettlementResult(data);
      void utils.player.getStatus.invalidate();
      void utils.settlement.getSettlementPreview.invalidate();
      void utils.settlement.getHistory.invalidate();
    },
  });

  const handleSettlement = async () => {
    try {
      await collectOutputMutation.mutateAsync();
      settleMutation.mutate();
    } catch {
      settleMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  const todayResult = preview?.dailyResults[preview.dailyResults.length - 1];
  const scoreBreakdown = todayResult?.breakdown ?? {
    build: 0, explore: 0, combat: 0, upgrade: 0, production: 0, recruit: 0,
  };
  const totalScore = todayResult?.totalScore ?? 0;
  const grade = getScoreGrade(totalScore);
  const last7Days = history?.slice(0, 7).reverse() ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* 结算成功提示 */}
      {settlementResult?.settled && (
        <div className="flex-shrink-0 p-4 bg-[#1a3a1a] border-b border-[#4a9]/30">
          <div className="text-[#4a9] font-bold mb-2">✨ 结算完成！</div>
          {settlementResult.grantedCards && settlementResult.grantedCards.length > 0 && (
            <div className="text-sm">
              获得卡牌: {settlementResult.grantedCards.map((c, i) => (
                <span key={i} style={{ color: rarityColors[c.rarity] }} className="mr-2">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 text-[#e0dcd0]">
          {/* 总分展示 */}
          <div className="pb-4 border-b border-[#2a2a30]">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div
                  className="w-16 h-16 flex items-center justify-center text-4xl font-bold border-4"
                  style={{ borderColor: grade.color, color: grade.color }}
                >
                  {grade.grade}
                </div>
                <div className="text-xs text-[#888] mt-2">评级</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#c9a227]">{totalScore}</div>
                <div className="text-sm text-[#888] mt-1">今日总分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#e67e22]">
                  {settlementResult?.newStreakDays ?? preview?.currentStreakDays ?? 0}
                </div>
                <div className="text-xs text-[#888] mt-1">连续达标</div>
              </div>
            </div>
          </div>

          {/* 分数明细 */}
          <div className="py-4 border-b border-[#2a2a30]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[#c9a227] text-sm font-bold">▸ 分数构成</div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#c9a227] hover:underline"
              >
                {showDetails ? "收起详情" : "查看详情"}
              </button>
            </div>

            <div className="space-y-2">
              <ScoreBar label="建造" icon="🏗️" score={scoreBreakdown.build} total={totalScore} color="#4a9" />
              <ScoreBar label="探索" icon="🧭" score={scoreBreakdown.explore} total={totalScore} color="#59b" />
              <ScoreBar label="战斗" icon="⚔️" score={scoreBreakdown.combat} total={totalScore} color="#e74c3c" />
              <ScoreBar label="升级" icon="⬆️" score={scoreBreakdown.upgrade} total={totalScore} color="#c9a227" />
              <ScoreBar label="生产" icon="📦" score={scoreBreakdown.production} total={totalScore} color="#8b6914" />
              <ScoreBar label="招募" icon="👤" score={scoreBreakdown.recruit} total={totalScore} color="#9b59b6" />
            </div>

            {showDetails && todayResult?.actions && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-[#888] mb-2">行动记录</div>
                {todayResult.actions.length === 0 ? (
                  <div className="text-center text-[#666] py-4">今日暂无行动记录</div>
                ) : (
                  todayResult.actions.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20] text-sm">
                      <div className="flex items-center gap-2">
                        <span>{ACTION_ICONS[action.type] ?? "📝"}</span>
                        <span>{action.description}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#4a9]">+{action.baseScore}</span>
                        {action.bonus > 0 && (
                          <span className="text-[#c9a227] ml-1">+{action.bonus}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 预计奖励 */}
          <div className="py-4 border-b border-[#2a2a30]">
            <div className="text-[#c9a227] text-sm font-bold mb-3">▸ 预计奖励</div>
            <div className="grid grid-cols-3 gap-3">
              {todayResult?.rewards.cards.map((card, i) => (
                <div
                  key={i}
                  className="relative p-3 bg-[#1a1a20] border-2 text-center"
                  style={{ borderColor: rarityColors[card.rarity] ?? "#888" }}
                >
                  <div className="text-2xl mb-1">🃏</div>
                  <div className="text-sm font-bold">×{card.count}</div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: rarityColors[card.rarity] ?? "#888" }}
                  >
                    {card.rarity}卡牌
                  </div>
                </div>
              ))}
              {(!todayResult?.rewards.cards || todayResult.rewards.cards.length === 0) && (
                <div className="col-span-3 text-center text-[#666] py-4">
                  暂无奖励数据
                </div>
              )}
            </div>

            {preview && preview.currentStreakDays > 0 && (
              <div className="mt-4 p-2 bg-[#1a1a20] border-l-2 border-[#e67e22]">
                <span className="text-sm text-[#e67e22]">
                  🔥 连续达标 {preview.currentStreakDays} 天
                  {preview.currentStreakDays >= 3 && preview.currentStreakDays < 7 && " - 下次连续7日奖励!"}
                  {preview.currentStreakDays >= 7 && " - 史诗卡牌奖励!"}
                </span>
              </div>
            )}
          </div>

          {/* 7日趋势 */}
          <div className="py-4 border-b border-[#2a2a30]">
            <div className="text-[#c9a227] text-sm font-bold mb-3">▸ 近7日趋势</div>
            <div className="bg-[#1a1a20] p-3">
              {last7Days.length === 0 ? (
                <div className="text-center text-[#666] py-4">暂无历史数据</div>
              ) : (
                <div className="flex items-end gap-2 h-24">
                  {last7Days.map((day, i) => {
                    const maxScore = Math.max(...last7Days.map(d => d.totalScore), 100);
                    const heightPercent = Math.max((day.totalScore / maxScore) * 100, 5);
                    const isLast = i === last7Days.length - 1;
                    const dayGrade = getScoreGrade(day.totalScore);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="text-[10px] text-[#888] mb-1">{day.totalScore}</div>
                        <div
                          className={`w-full min-h-[8px] ${isLast ? "border-2 border-[#c9a227]" : ""}`}
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: dayGrade.color,
                          }}
                        />
                        <div className={`text-[10px] mt-1 ${isLast ? "text-[#c9a227]" : "text-[#666]"}`}>
                          D{day.day}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="py-4">
            {preview?.pendingDays && preview.pendingDays > 0 && !settlementResult?.settled ? (
              <button
                onClick={() => void handleSettlement()}
                disabled={settleMutation.isPending || collectOutputMutation.isPending}
                className="w-full py-4 bg-gradient-to-r from-[#c9a227] to-[#e6b82a] text-[#000] font-bold text-lg hover:from-[#ddb52f] hover:to-[#f0c940] transition-all disabled:opacity-50"
              >
                {collectOutputMutation.isPending ? "领取产出中..." : settleMutation.isPending ? "结算中..." : "领取奖励"}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-4 bg-[#2a2a30] text-[#888] font-bold text-lg"
              >
                {settlementResult?.settled ? "已结算" : "今日已结算"}
              </button>
            )}
            <div className="text-center text-xs text-[#666] mt-2">
              奖励将添加到您的卡牌背包
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
