// 记录Hub - 整合结算、行动历史、战斗历史

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import HubPanel, { type HubTab } from "./HubPanel";

interface LogHubProps {
  onClose: () => void;
  initialTab?: string;
  onResumeCombat?: (combatId: string) => void;
}

export default function LogHub({
  onClose,
  initialTab = "settlement",
  onResumeCombat,
}: LogHubProps) {
  const tabs: HubTab[] = [
    {
      id: "settlement",
      label: "今日结算",
      icon: "🎴",
      content: <SettlementTab />,
    },
    {
      id: "action",
      label: "行动记录",
      icon: "📋",
      content: <ActionHistoryTab />,
    },
    {
      id: "combat",
      label: "战斗历史",
      icon: "📖",
      content: <CombatHistoryTab onResumeCombat={onResumeCombat} />,
    },
  ];

  return (
    <HubPanel
      title="记录系统"
      icon="📜"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}

// 结算标签页
function SettlementTab() {
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

  const rarityColors: Record<string, string> = {
    "普通": "#888",
    "精良": "#4a9",
    "稀有": "#9b59b6",
    "史诗": "#e67e22",
    "传说": "#c9a227",
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

// 行动历史标签页
function ActionHistoryTab() {
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
      <div className="flex-shrink-0 p-3 bg-[#0a0a0c] border-t border-[#2a2a30] text-xs text-[#666] text-center">
        💡 每日达到200分即可获得奖励卡牌
      </div>
    </div>
  );
}

// 战斗历史标签页
function CombatHistoryTab({ onResumeCombat }: { onResumeCombat?: (combatId: string) => void }) {
  const { data: activeCombat } = api.combat.getActiveCombat.useQuery();
  const { data: history, isLoading } = api.combat.getHistory.useQuery({ limit: 20 });

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    active: { label: "进行中", color: "#4a9eff", icon: "⚔️" },
    victory: { label: "胜利", color: "#4a9", icon: "🎉" },
    defeat: { label: "失败", color: "#e74c3c", icon: "💀" },
    fled: { label: "逃跑", color: "#c9a227", icon: "🏃" },
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  const stats = {
    total: history?.length ?? 0,
    victories: history?.filter(c => c.status === "victory").length ?? 0,
    defeats: history?.filter(c => c.status === "defeat").length ?? 0,
    fled: history?.filter(c => c.status === "fled").length ?? 0,
  };
  const winRate = stats.total > 0 ? Math.round((stats.victories / stats.total) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* 统计概览 */}
      <div className="flex-shrink-0 p-4 border-b border-[#2a2a30] bg-[#0a0a0c]">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-[#e0dcd0]">{stats.total}</div>
            <div className="text-xs text-[#666]">总战斗</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#4a9]">{stats.victories}</div>
            <div className="text-xs text-[#666]">胜利</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#e74c3c]">{stats.defeats}</div>
            <div className="text-xs text-[#666]">失败</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#c9a227]">{winRate}%</div>
            <div className="text-xs text-[#666]">胜率</div>
          </div>
        </div>
      </div>

      {/* 活动战斗 */}
      {activeCombat && (
        <div className="flex-shrink-0 p-4 bg-[#1a1810] border-b border-[#c9a227]/30">
          <div className="text-xs text-[#c9a227] mb-2">⚔️ 进行中的战斗</div>
          <div className="flex items-center justify-between p-3 bg-[#101014] border border-[#c9a227]">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{activeCombat.monster.icon}</div>
              <div>
                <div className="font-bold">{activeCombat.monster.name}</div>
                <div className="text-xs text-[#888]">
                  Lv.{activeCombat.monster.level} · 回合 {activeCombat.turn}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-[#e74c3c]">HP {activeCombat.playerHp}/{activeCombat.playerMaxHp}</span>
              </div>
              {onResumeCombat && (
                <button
                  onClick={() => onResumeCombat(activeCombat.combatId)}
                  className="px-3 py-1.5 bg-[#c9a227] text-[#08080a] text-sm font-bold hover:bg-[#ddb52f]"
                >
                  继续
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 战斗历史列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!history || history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚔️</div>
              <div className="text-[#888]">暂无战斗记录</div>
              <div className="text-xs text-[#666] mt-1">去战斗吧！</div>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((combat) => {
                const statusInfo = statusLabels[combat.status] ?? statusLabels.defeat!;
                const date = new Date(combat.createdAt);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                return (
                  <div
                    key={combat.id}
                    className={`p-3 border transition-colors ${
                      combat.status === "victory"
                        ? "border-[#4a9]/30 bg-[#1a3a1a]/20"
                        : combat.status === "defeat"
                        ? "border-[#e74c3c]/30 bg-[#3a1a1a]/20"
                        : "border-[#2a2a30] bg-[#1a1a20]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{statusInfo.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{combat.monsterName}</span>
                            <span className="text-xs text-[#888]">Lv.{combat.monsterLevel}</span>
                          </div>
                          <div className="text-xs text-[#666] mt-0.5">
                            {combat.turns} 回合 · {dateStr}
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-sm px-2 py-0.5"
                        style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}20` }}
                      >
                        {statusInfo.label}
                      </span>
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
        💡 击败强敌可获得稀有卡牌奖励
      </div>
    </div>
  );
}

// 辅助组件
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

// 常量
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
