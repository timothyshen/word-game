// 每日结算弹窗 - 连接后端
import { useState } from "react";
import { api } from "~/utils/api";

interface SettlementModalProps {
  onClose: () => void;
}

const rarityColors: Record<string, string> = {
  普通: "#888888",
  精良: "#4a9eff",
  稀有: "#9966cc",
  史诗: "#ff9900",
  传说: "#ff4444",
};

const actionIcons: Record<string, string> = {
  build: "🏗️",
  explore: "🧭",
  combat: "⚔️",
  upgrade: "⬆️",
  production: "📦",
  recruit: "👤",
};

function getScoreGrade(score: number) {
  if (score >= 500) return { grade: "S", color: "#c9a227" };
  if (score >= 400) return { grade: "A", color: "#4a9eff" };
  if (score >= 300) return { grade: "B", color: "#5588bb" };
  if (score >= 200) return { grade: "C", color: "#888888" };
  return { grade: "D", color: "#666666" };
}

export default function SettlementModal({ onClose }: SettlementModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [settled, setSettled] = useState(false);

  const { data: preview, isLoading: previewLoading } = api.settlement.getSettlementPreview.useQuery();
  const { data: history } = api.settlement.getHistory.useQuery();
  const utils = api.useUtils();

  const executeSettlement = api.settlement.executeSettlement.useMutation({
    onSuccess: (result) => {
      if (result.settled) {
        setSettled(true);
        void utils.player.getOrCreate.invalidate();
        void utils.settlement.checkSettlement.invalidate();
        void utils.card.getAll.invalidate();
      }
    },
  });

  if (previewLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-[#12110d] border-2 border-[#c9a227] p-8 text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <div className="text-[#888]">加载中...</div>
        </div>
      </div>
    );
  }

  if (!preview || preview.dailyResults.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-[#12110d] border-2 border-[#c9a227] p-8 text-center max-w-md">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-[#c9a227] text-lg mb-2">今日已结算</div>
          <div className="text-[#888] text-sm mb-4">明日0点将开放新的结算</div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#3d3529] text-[#e0dcd0] hover:bg-[#4d4539]"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  // 取第一天的结果展示（支持多日结算）
  const todayResult = preview.dailyResults[preview.dailyResults.length - 1]!;
  const totalScore = todayResult.totalScore;
  const grade = getScoreGrade(totalScore);
  const breakdown = todayResult.breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#12110d] border-2 border-[#c9a227] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-[#1a1510] to-[#12110d] border-b border-[#c9a227]/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-3xl rounded-lg shadow-lg">
                📊
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">每日结算</div>
                <div className="font-bold text-xl text-[#e0dcd0] mt-1">
                  第 {todayResult.day} 日
                  {preview.pendingDays > 1 && (
                    <span className="text-sm text-[#888] ml-2">
                      (共{preview.pendingDays}日待结算)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* 总分展示 */}
        <div className="p-6 border-b border-[#3d3529]">
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
            </div>

            {/* 连续天数 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-[#ff9900]">
                {preview.currentStreakDays}
              </div>
              <div className="text-xs text-[#888] mt-1">连续达标</div>
            </div>
          </div>
        </div>

        {/* 分数明细 */}
        <div className="p-4 border-b border-[#3d3529]">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>分数构成</SectionTitle>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-[#c9a227] hover:underline"
            >
              {showDetails ? "收起详情" : "查看详情"}
            </button>
          </div>

          <div className="space-y-2">
            <ScoreBar label="建造" icon="🏗️" score={breakdown.build} total={totalScore} color="#4a9eff" />
            <ScoreBar label="探索" icon="🧭" score={breakdown.explore} total={totalScore} color="#5588bb" />
            <ScoreBar label="战斗" icon="⚔️" score={breakdown.combat} total={totalScore} color="#ff6b6b" />
            <ScoreBar label="升级" icon="⬆️" score={breakdown.upgrade} total={totalScore} color="#c9a227" />
            <ScoreBar label="生产" icon="📦" score={breakdown.production} total={totalScore} color="#8b6914" />
            <ScoreBar label="招募" icon="👤" score={breakdown.recruit} total={totalScore} color="#9966cc" />
          </div>

          {/* 详细行动列表 */}
          {showDetails && todayResult.actions.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-[#888] mb-2">行动记录</div>
              {todayResult.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 bg-[#1a1a20] text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{actionIcons[action.type]}</span>
                    <span className="text-[#e0dcd0]">{action.description}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#4a9eff]">+{action.baseScore}</span>
                    {action.bonus > 0 && (
                      <span className="text-[#c9a227] ml-1" title={action.bonusReason ?? ""}>
                        +{action.bonus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 卡牌奖励预览 */}
        <div className="p-4 border-b border-[#3d3529]">
          <SectionTitle>预计奖励</SectionTitle>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {todayResult.rewards.cards.map((card, i) => (
              <div
                key={i}
                className="relative p-3 bg-[#1a1a20] border-2 text-center"
                style={{ borderColor: rarityColors[card.rarity] }}
              >
                <div className="text-2xl mb-1">🎴</div>
                <div className="text-sm text-[#e0dcd0]">{card.rarity}卡</div>
                <div className="text-xs mt-1" style={{ color: rarityColors[card.rarity] }}>
                  ×{card.count}
                </div>
              </div>
            ))}
          </div>

          {todayResult.rewards.bonus.length > 0 && (
            <div className="mt-3 space-y-1">
              {todayResult.rewards.bonus.map((bonus, i) => (
                <div key={i} className="text-xs text-[#c9a227] flex items-center gap-1">
                  <span>★</span>
                  <span>{bonus}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 近7日趋势 */}
        {history && history.length > 0 && (
          <div className="p-4 border-b border-[#3d3529]">
            <SectionTitle>近期趋势</SectionTitle>
            <div className="mt-3 bg-[#1a1a20] p-3">
              <div className="flex items-end gap-2 h-24">
                {history.slice(0, 7).reverse().map((day, i) => {
                  const maxScore = Math.max(...history.map((d) => d.totalScore), 1);
                  const heightPercent = (day.totalScore / maxScore) * 100;
                  const dayGrade = getScoreGrade(day.totalScore);

                  return (
                    <div key={day.id} className="flex-1 flex flex-col items-center">
                      <div className="text-[10px] text-[#888] mb-1">{day.totalScore}</div>
                      <div
                        className="w-full min-h-[8px]"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: dayGrade.color,
                        }}
                      />
                      <div className="text-[10px] mt-1 text-[#666]">D{day.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="p-4">
          {settled ? (
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-[#c9a227] text-lg mb-4">结算完成！</div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-[#3d3529] text-[#e0dcd0] hover:bg-[#4d4539]"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => executeSettlement.mutate()}
                disabled={executeSettlement.isPending}
                className="w-full py-4 bg-gradient-to-r from-[#c9a227] to-[#e6b82a] text-[#000] font-bold text-lg hover:from-[#ddb52f] hover:to-[#f0c940] transition-all disabled:opacity-50"
              >
                {executeSettlement.isPending ? "结算中..." : "领取奖励"}
              </button>
              <div className="text-center text-xs text-[#666] mt-2">
                奖励将添加到您的卡牌背包
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#3d3529]">▸</span>
      {children}
    </div>
  );
}

function ScoreBar({
  label,
  icon,
  score,
  total,
  color,
}: {
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
