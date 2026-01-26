// 成就面板 - 显示和领取成就

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface AchievementPanelProps {
  onClose: () => void;
}

type CategoryType = "all" | "building" | "combat" | "exploration" | "collection" | "special";

const CATEGORY_LABELS: Record<CategoryType, { label: string; icon: string }> = {
  all: { label: "全部", icon: "📋" },
  building: { label: "建筑", icon: "🏗️" },
  combat: { label: "战斗", icon: "⚔️" },
  exploration: { label: "探索", icon: "🗺️" },
  collection: { label: "收集", icon: "🎴" },
  special: { label: "特殊", icon: "⭐" },
};

export default function AchievementPanel({ onClose }: AchievementPanelProps) {
  const [category, setCategory] = useState<CategoryType>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取成就列表
  const { data: achievements, isLoading } = api.achievement.getAll.useQuery();

  // 获取成就统计
  const { data: stats } = api.achievement.getStats.useQuery();

  // 领取成就
  const claimMutation = api.achievement.claim.useMutation({
    onSuccess: () => {
      void utils.achievement.getAll.invalidate();
      void utils.achievement.getStats.invalidate();
      void utils.player.getStatus.invalidate();
      setClaimingId(null);
    },
    onError: () => {
      setClaimingId(null);
    },
  });

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 过滤成就
  const filteredAchievements = achievements?.filter(
    (a) => category === "all" || a.category === category
  ) ?? [];

  // 可领取的成就数量
  const claimableCount = achievements?.filter((a) => a.canClaim).length ?? 0;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1810] to-[#101014] border-b border-[#c9a227]/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#c9a227] flex items-center justify-center text-3xl">
                🏆
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">成就</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  荣誉殿堂
                </DialogTitle>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {stats && (
                <div className="text-sm text-[#888]">
                  完成度: <span className="text-[#c9a227] font-bold">{stats.completionRate}%</span>
                  <span className="mx-1">·</span>
                  {stats.claimedCount}/{stats.totalAchievements}
                </div>
              )}
              <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 分类筛选 */}
        <div className="flex gap-1 p-3 border-b border-[#2a2a30] overflow-x-auto hide-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map((cat) => {
            const info = CATEGORY_LABELS[cat];
            const count = cat === "all"
              ? achievements?.length ?? 0
              : achievements?.filter((a) => a.category === cat).length ?? 0;

            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
                  category === cat
                    ? "bg-[#c9a227] text-[#08080a]"
                    : "bg-[#1a1a20] text-[#888] hover:text-[#e0dcd0]"
                }`}
              >
                {info.icon} {info.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 可领取提示 */}
        {claimableCount > 0 && (
          <div className="px-4 py-2 bg-[#1a3a1a] border-b border-[#4a9]/30 text-sm text-[#4a9] animate-pulse">
            🎉 有 {claimableCount} 个成就可领取奖励！
          </div>
        )}

        {/* 成就列表 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📭</div>
                <div className="text-[#888]">暂无成就</div>
              </div>
            ) : (
              filteredAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 border transition-colors ${
                    achievement.canClaim
                      ? "border-[#4a9] bg-[#1a3a1a]/30"
                      : achievement.isClaimed
                      ? "border-[#c9a227]/50 bg-[#1a1810]/30"
                      : "border-[#2a2a30] bg-[#1a1a20]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div
                      className={`w-12 h-12 flex items-center justify-center text-2xl border-2 ${
                        achievement.isClaimed
                          ? "border-[#c9a227] bg-[#c9a227]/20"
                          : achievement.isCompleted
                          ? "border-[#4a9] bg-[#4a9]/20"
                          : "border-[#3a3a40] bg-[#1a1a20]"
                      }`}
                    >
                      {achievement.icon}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{achievement.name}</span>
                        {achievement.isClaimed && (
                          <span className="text-xs px-2 py-0.5 bg-[#c9a227]/20 text-[#c9a227]">
                            已领取
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#888] mt-1">{achievement.description}</div>

                      {/* 进度条 */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#666]">进度</span>
                          <span className={achievement.isCompleted ? "text-[#4a9]" : "text-[#888]"}>
                            {achievement.progress}/{achievement.target}
                          </span>
                        </div>
                        <div className="h-2 bg-[#2a2a30] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              achievement.isCompleted ? "bg-[#4a9]" : "bg-[#c9a227]"
                            }`}
                            style={{
                              width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* 奖励 */}
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        <span className="text-[#666]">奖励:</span>
                        {achievement.rewards.gold && (
                          <span className="text-[#c9a227]">🪙 {achievement.rewards.gold}</span>
                        )}
                        {achievement.rewards.crystals && (
                          <span className="text-[#9b59b6]">💎 {achievement.rewards.crystals}</span>
                        )}
                        {achievement.rewards.exp && (
                          <span className="text-[#4a9eff]">⭐ {achievement.rewards.exp} EXP</span>
                        )}
                        {achievement.rewards.cardRarity && (
                          <span className="text-[#e67e22]">🎴 {achievement.rewards.cardRarity}卡牌</span>
                        )}
                      </div>
                    </div>

                    {/* 领取按钮 */}
                    {achievement.canClaim && (
                      <button
                        onClick={() => {
                          setClaimingId(achievement.id);
                          claimMutation.mutate({ achievementId: achievement.id });
                        }}
                        disabled={claimingId === achievement.id}
                        className="px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba] disabled:opacity-50 animate-pulse"
                      >
                        {claimingId === achievement.id ? "领取中..." : "领取"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* 操作反馈 */}
        {claimMutation.isSuccess && (
          <div className="p-3 bg-[#1a3a1a] border-t border-[#4a9]/30 text-sm text-[#4a9]">
            🎉 成就奖励已领取！
          </div>
        )}
        {claimMutation.error && (
          <div className="p-3 bg-[#3a1a1a] border-t border-[#e74c3c]/30 text-sm text-[#e74c3c]">
            {claimMutation.error.message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
