// 每日结算面板组件 - 使用 shadcn/ui

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { settlementData, dailyInfo } from "~/data/fixtures";

interface SettlementPanelProps {
  onClose: () => void;
  onCollectRewards: () => void;
}

export default function SettlementPanel({
  onClose,
  onCollectRewards,
}: SettlementPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { todayActions, scoreBreakdown, rewards, streakData, history } = settlementData;

  const rarityColors: Record<string, string> = {
    "普通": "#888",
    "精良": "#4a9",
    "稀有": "#9b59b6",
    "史诗": "#e67e22",
    "传说": "#c9a227",
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

  const grade = getScoreGrade(scoreBreakdown.total);

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
                <DialogTitle className="font-bold text-xl mt-1 text-[#e0dcd0]">第 {dailyInfo.day} 日</DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-2xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="text-[#e0dcd0]">
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
                  <div className="text-5xl font-bold text-[#c9a227]">{scoreBreakdown.total}</div>
                  <div className="text-sm text-[#888] mt-1">今日总分</div>
                  <div className="text-xs text-[#4a9] mt-1">
                    奖励区间: {rewards.scoreRange}
                  </div>
                </div>

                {/* 连续天数 */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#e67e22]">{streakData.currentStreak}</div>
                  <div className="text-xs text-[#888] mt-1">连续达标</div>
                  <div className="text-xs text-[#666]">最高: {streakData.bestStreak}天</div>
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
                <ScoreBar label="建造" icon="🏗️" score={scoreBreakdown.build} total={scoreBreakdown.total} color="#4a9" />
                <ScoreBar label="探索" icon="🧭" score={scoreBreakdown.explore} total={scoreBreakdown.total} color="#59b" />
                <ScoreBar label="战斗" icon="⚔️" score={scoreBreakdown.combat} total={scoreBreakdown.total} color="#e74c3c" />
                <ScoreBar label="升级" icon="⬆️" score={scoreBreakdown.upgrade} total={scoreBreakdown.total} color="#c9a227" />
                <ScoreBar label="生产" icon="📦" score={scoreBreakdown.production} total={scoreBreakdown.total} color="#8b6914" />
                <ScoreBar label="招募" icon="👤" score={scoreBreakdown.recruit} total={scoreBreakdown.total} color="#9b59b6" />
              </div>

              {/* 详细行动列表 */}
              {showDetails && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-[#888] mb-2">行动记录</div>
                  {todayActions.map((action, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20] text-sm">
                      <div className="flex items-center gap-2">
                        <span>{actionIcons[action.type]}</span>
                        <span>{action.description}</span>
                        <span className="text-xs text-[#666]">{action.time}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#4a9]">+{action.baseScore}</span>
                        {action.bonus > 0 && (
                          <span className="text-[#c9a227] ml-1" title={action.bonusReason}>
                            +{action.bonus}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 卡牌奖励 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>获得奖励</SectionTitle>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {rewards.cards.map((card, i) => (
                  <div
                    key={i}
                    className="relative p-3 bg-[#1a1a20] border-2 text-center"
                    style={{ borderColor: rarityColors[card.rarity] }}
                  >
                    {card.isNew && (
                      <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-[#e74c3c] text-[10px] text-white">
                        NEW
                      </div>
                    )}
                    <div className="text-2xl mb-1">
                      {card.type === "item" && "📦"}
                      {card.type === "recruit" && "📜"}
                      {card.type === "enhance" && "💎"}
                    </div>
                    <div className="text-sm font-bold">{card.name}</div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: rarityColors[card.rarity] }}
                    >
                      {card.rarity}
                    </div>
                  </div>
                ))}
              </div>

              {/* 连续奖励进度 */}
              {rewards.bonusRewards.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-[#888] mb-2">连续奖励进度</div>
                  {rewards.bonusRewards.map((bonus, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20] border-l-2 border-[#e67e22]">
                      <span className="text-sm">{bonus.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#888]">{bonus.reward}</span>
                        <span className="text-xs px-2 py-0.5 bg-[#2a2a30] text-[#c9a227]">
                          {bonus.progress}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7日趋势 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>近7日趋势</SectionTitle>
              <div className="mt-3 bg-[#1a1a20] p-3">
                <div className="flex items-end gap-2 h-24">
                  {history.map((day, i) => {
                    const maxScore = Math.max(...history.map(d => d.score));
                    const heightPercent = (day.score / maxScore) * 100;
                    const isToday = i === history.length - 1;
                    const dayGrade = getScoreGrade(day.score);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="text-[10px] text-[#888] mb-1">{day.score}</div>
                        <div
                          className={`w-full min-h-[8px] ${isToday ? "border-2 border-[#c9a227]" : ""}`}
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: dayGrade.color,
                          }}
                        />
                        <div className={`text-[10px] mt-1 ${isToday ? "text-[#c9a227]" : "text-[#666]"}`}>
                          {isToday ? "今日" : `D${day.day}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-4">
              <button
                onClick={onCollectRewards}
                className="w-full py-4 bg-gradient-to-r from-[#c9a227] to-[#e6b82a] text-[#000] font-bold text-lg hover:from-[#ddb52f] hover:to-[#f0c940] transition-all"
              >
                领取奖励
              </button>
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
