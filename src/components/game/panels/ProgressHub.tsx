// 进阶Hub - 整合职业、成就

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import HubPanel, { type HubTab } from "./HubPanel";

interface ProgressHubProps {
  onClose: () => void;
  initialTab?: string;
}

export default function ProgressHub({
  onClose,
  initialTab = "profession",
}: ProgressHubProps) {
  const tabs: HubTab[] = [
    {
      id: "profession",
      label: "职业系统",
      icon: "📚",
      content: <ProfessionTab />,
    },
    {
      id: "achievement",
      label: "成就系统",
      icon: "🏆",
      content: <AchievementTab />,
    },
  ];

  return (
    <HubPanel
      title="进阶系统"
      icon="⬆️"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}

// 职业标签页
function ProfessionTab() {
  const { data: professions, isLoading: loadingProfessions } = api.profession.getAll.useQuery();
  const { data: playerProfession } = api.profession.getPlayerProfession.useQuery();

  const utils = api.useUtils();

  const learnMutation = api.profession.learnPlayerProfession.useMutation({
    onSuccess: () => {
      void utils.profession.getPlayerProfession.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  if (loadingProfessions) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* 当前职业 */}
        <div className="p-4 bg-[#0a0a15] border border-[#2a3a4a] mb-4">
          <div className="text-sm text-[#c9a227] mb-2">▸ 当前职业</div>
          {playerProfession?.hasProfession ? (
            <div>
              <div className="font-bold text-lg">{playerProfession.profession?.name}</div>
              <div className="text-sm text-[#888] mt-1">
                {playerProfession.profession?.description}
              </div>
              {playerProfession.profession?.bonuses && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(playerProfession.profession.bonuses).map(([stat, bonus]) => (
                    <span
                      key={stat}
                      className="text-xs px-2 py-1 bg-[#050810] text-[#4a9]"
                    >
                      {stat} +{bonus as number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#888]">尚未选择职业</div>
          )}
        </div>

        {/* 可用职业列表 */}
        {!playerProfession?.hasProfession && (
          <div>
            <div className="text-sm text-[#c9a227] mb-2">▸ 可学习职业</div>
            {!professions || professions.length === 0 ? (
              <div className="text-center py-8 text-[#888]">暂无可学习职业</div>
            ) : (
              <div className="space-y-2">
                {professions.map((prof) => (
                  <div
                    key={prof.id}
                    className="p-4 bg-[#0a0a15] border border-[#2a3a4a]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{prof.name}</div>
                        <div className="text-xs text-[#888] mt-1">{prof.description}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(prof.bonuses).map(([stat, bonus]) => (
                            <span
                              key={stat}
                              className="text-xs px-2 py-0.5 bg-[#050810] text-[#4a9]"
                            >
                              {stat} +{bonus as number}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => learnMutation.mutate({ professionId: prof.id })}
                        disabled={learnMutation.isPending}
                        className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                      >
                        学习
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 操作反馈 */}
        {learnMutation.isSuccess && (
          <div className="mt-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm text-[#4a9]">
            🎉 {learnMutation.data.message}
          </div>
        )}
        {learnMutation.error && (
          <div className="mt-4 p-3 bg-[#3a1a1a] border border-[#e74c3c]/30 text-sm text-[#e74c3c]">
            {learnMutation.error.message}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 成就标签页
function AchievementTab() {
  const [category, setCategory] = useState<string>("all");
  const { data: achievements, isLoading } = api.achievement.getAll.useQuery();
  const { data: stats } = api.achievement.getStats.useQuery();

  const utils = api.useUtils();

  const claimMutation = api.achievement.claim.useMutation({
    onSuccess: () => {
      void utils.achievement.getAll.invalidate();
      void utils.achievement.getStats.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  const categories = [
    { id: "all", label: "全部", icon: "📋" },
    { id: "building", label: "建筑", icon: "🏗️" },
    { id: "combat", label: "战斗", icon: "⚔️" },
    { id: "exploration", label: "探索", icon: "🗺️" },
    { id: "collection", label: "收集", icon: "🎴" },
    { id: "special", label: "特殊", icon: "⭐" },
  ];

  const filteredAchievements = achievements?.filter(
    (a) => category === "all" || a.category === category
  ) ?? [];

  const claimableCount = achievements?.filter((a) => a.canClaim).length ?? 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 统计 */}
      {stats && (
        <div className="flex-shrink-0 p-3 bg-[#050810] border-b border-[#2a3a4a] text-center">
          <span className="text-sm text-[#888]">
            完成度: <span className="text-[#c9a227] font-bold">{stats.completionRate}%</span>
            <span className="mx-2">·</span>
            {stats.claimedCount}/{stats.totalAchievements}
          </span>
        </div>
      )}

      {/* 分类筛选 */}
      <div className="flex-shrink-0 flex gap-1 p-3 border-b border-[#2a3a4a] overflow-x-auto hide-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
              category === cat.id
                ? "bg-[#c9a227]/20 text-[#c9a227]"
                : "bg-[#0a0a15] text-[#5a6a7a] hover:text-[#e0dcd0]"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* 可领取提示 */}
      {claimableCount > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-[#1a3a1a] border-b border-[#4a9]/30 text-sm text-[#4a9] animate-attention">
          🎉 有 {claimableCount} 个成就可领取奖励！
        </div>
      )}

      {/* 成就列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
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
                    : "border-[#2a3a4a] bg-[#0a0a15]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 flex items-center justify-center text-2xl border-2 ${
                      achievement.isClaimed
                        ? "border-[#c9a227] bg-[#c9a227]/20"
                        : achievement.isCompleted
                        ? "border-[#4a9] bg-[#4a9]/20"
                        : "border-[#2a3a4a] bg-[#0a0a15]"
                    }`}
                  >
                    {achievement.icon}
                  </div>
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
                      <div className="h-2 bg-[#2a3a4a] rounded-full overflow-hidden">
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
                    </div>
                  </div>

                  {/* 领取按钮 */}
                  {achievement.canClaim && (
                    <button
                      onClick={() => claimMutation.mutate({ achievementId: achievement.id })}
                      disabled={claimMutation.isPending}
                      className="px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba] disabled:opacity-50 animate-attention"
                    >
                      领取
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
