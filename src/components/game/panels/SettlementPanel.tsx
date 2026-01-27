// 每日结算面板组件 - 使用真实 API 数据

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { RARITY_COLORS } from "~/constants";

interface SettlementPanelProps {
  onClose: () => void;
}

export default function SettlementPanel({ onClose }: SettlementPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [settlementResult, setSettlementResult] = useState<{
    settled: boolean;
    grantedCards?: Array<{ name: string; rarity: string }>;
    newStreakDays?: number;
  } | null>(null);

  const utils = api.useUtils();

  // 获取结算预览
  const { data: preview, isLoading } = api.settlement.getSettlementPreview.useQuery();

  // 获取结算历史
  const { data: history } = api.settlement.getHistory.useQuery();

  // 领取建筑产出
  const collectOutputMutation = api.building.collectDailyOutput.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
      void utils.settlement.getSettlementPreview.invalidate();
    },
  });

  // 执行结算
  const settleMutation = api.settlement.executeSettlement.useMutation({
    onSuccess: (data) => {
      setSettlementResult(data);
      void utils.player.getStatus.invalidate();
      void utils.settlement.getSettlementPreview.invalidate();
      void utils.settlement.getHistory.invalidate();
    },
  });

  // 一键结算（先领取产出，再执行结算）
  const handleSettlement = async () => {
    try {
      // 先领取建筑产出
      await collectOutputMutation.mutateAsync();
      // 再执行结算
      settleMutation.mutate();
    } catch {
      // 如果领取产出失败，仍然尝试结算
      settleMutation.mutate();
    }
  };

  const actionIcons: Record<string, string> = {
    build: "🏗️",
    explore: "🧭",
    combat: "⚔️",
    upgrade: "⬆️",
    production: "📦",
    recruit: "👤",
  };

  const getScoreGrade = (score: number) => {
    if (score >= 500) return { grade: "S", color: "#c9a227" };
    if (score >= 400) return { grade: "A", color: "#4a9" };
    if (score >= 300) return { grade: "B", color: "#59b" };
    if (score >= 200) return { grade: "C", color: "#888" };
    return { grade: "D", color: "#666" };
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 当前日期的结果（如果有待结算的日期）
  const todayResult = preview?.dailyResults[preview.dailyResults.length - 1];
  const scoreBreakdown = todayResult?.breakdown ?? {
    build: 0, explore: 0, combat: 0, upgrade: 0, production: 0, recruit: 0,
  };
  const totalScore = todayResult?.totalScore ?? 0;
  const grade = getScoreGrade(totalScore);

  // 历史7天数据
  const last7Days = history?.slice(0, 7).reverse() ?? [];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1510] to-[#101014] border-b border-[#c9a227]/50 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-3xl rounded-lg shadow-lg">
                📊
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">每日结算</div>
                <DialogTitle className="font-bold text-xl mt-1 text-[#e0dcd0]">
                  {preview?.pendingDays ? `待结算 ${preview.pendingDays} 天` : "今日结算"}
                </DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-2xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="text-[#e0dcd0]">
            {/* 结算成功提示 */}
            {settlementResult?.settled && (
              <div className="p-4 bg-[#1a3a1a] border-b border-[#4a9]/30">
                <div className="text-[#4a9] font-bold mb-2">✨ 结算完成！</div>
                {settlementResult.grantedCards && settlementResult.grantedCards.length > 0 && (
                  <div className="text-sm">
                    获得卡牌: {settlementResult.grantedCards.map((c, i) => (
                      <span key={i} style={{ color: RARITY_COLORS[c.rarity] }} className="mr-2">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 总分展示 */}
            <div className="p-6 border-b border-[#2a2a30]">
              <div className="flex items-center justify-center gap-8">
                {/* 评级 */}
                <div className="text-center">
                  <div
                    className="w-20 h-20 flex items-center justify-center text-5xl font-bold rounded-lg border-4"
                    style={{ borderColor: grade.color, color: grade.color }}
                  >
                    {grade.grade}
                  </div>
                  <div className="text-xs text-[#888] mt-2">评级</div>
                </div>

                {/* 总分 */}
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#c9a227]">{totalScore}</div>
                  <div className="text-sm text-[#888] mt-1">今日总分</div>
                  <div className="text-xs text-[#4a9] mt-1">
                    {totalScore >= 500 ? "500+" : totalScore >= 400 ? "400-499" : totalScore >= 300 ? "300-399" : totalScore >= 200 ? "200-299" : totalScore >= 100 ? "100-199" : "0-99"}
                  </div>
                </div>

                {/* 连续天数 */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#e67e22]">
                    {settlementResult?.newStreakDays ?? preview?.currentStreakDays ?? 0}
                  </div>
                  <div className="text-xs text-[#888] mt-1">连续达标</div>
                </div>
              </div>
            </div>

            {/* 分数明细 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>分数构成</SectionTitle>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-[#c9a227] hover:underline"
                >
                  {showDetails ? "收起详情" : "查看详情"}
                </button>
              </div>

              {/* 分类统计条 */}
              <div className="space-y-2">
                <ScoreBar label="建造" icon="🏗️" score={scoreBreakdown.build} total={totalScore} color="#4a9" />
                <ScoreBar label="探索" icon="🧭" score={scoreBreakdown.explore} total={totalScore} color="#59b" />
                <ScoreBar label="战斗" icon="⚔️" score={scoreBreakdown.combat} total={totalScore} color="#e74c3c" />
                <ScoreBar label="升级" icon="⬆️" score={scoreBreakdown.upgrade} total={totalScore} color="#c9a227" />
                <ScoreBar label="生产" icon="📦" score={scoreBreakdown.production} total={totalScore} color="#8b6914" />
                <ScoreBar label="招募" icon="👤" score={scoreBreakdown.recruit} total={totalScore} color="#9b59b6" />
              </div>

              {/* 详细行动列表 */}
              {showDetails && todayResult?.actions && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-[#888] mb-2">行动记录</div>
                  {todayResult.actions.length === 0 ? (
                    <div className="text-center text-[#666] py-4">今日暂无行动记录</div>
                  ) : (
                    todayResult.actions.map((action, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20] text-sm">
                        <div className="flex items-center gap-2">
                          <span>{actionIcons[action.type] ?? "📝"}</span>
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
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>预计奖励</SectionTitle>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {todayResult?.rewards.cards.map((card, i) => (
                  <div
                    key={i}
                    className="relative p-3 bg-[#1a1a20] border-2 text-center"
                    style={{ borderColor: RARITY_COLORS[card.rarity] ?? "#888" }}
                  >
                    <div className="text-2xl mb-1">🃏</div>
                    <div className="text-sm font-bold">×{card.count}</div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: RARITY_COLORS[card.rarity] ?? "#888" }}
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

              {/* 连续奖励提示 */}
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
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>近7日趋势</SectionTitle>
              <div className="mt-3 bg-[#1a1a20] p-3">
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
            <div className="p-4">
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
                  onClick={onClose}
                  className="w-full py-4 bg-[#2a2a30] text-[#888] font-bold text-lg hover:bg-[#3a3a40]"
                >
                  {settlementResult?.settled ? "完成" : "今日已结算"}
                </button>
              )}
              <div className="text-center text-xs text-[#666] mt-2">
                奖励将添加到您的卡牌背包
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#3a3a40]">▸</span>
      {children}
    </div>
  );
}

function ScoreBar({ label, icon, score, total, color }: {
  label: string;
  icon: string;
  score: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (score / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 flex items-center gap-1 text-sm">
        <span>{icon}</span>
        <span className="text-[#888]">{label}</span>
      </div>
      <div className="flex-1 h-4 bg-[#1a1a20] relative">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-12 text-right text-sm" style={{ color }}>
        {score}
      </div>
    </div>
  );
}
