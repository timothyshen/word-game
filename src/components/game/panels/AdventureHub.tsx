// 冒险Hub - Boss、传送、剧情（探索已整合到外城地图）

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import HubPanel, { type HubTab } from "./HubPanel";
import { PanelSkeleton } from "~/components/game/PanelSkeleton";

interface AdventureHubProps {
  onClose: () => void;
  initialTab?: string;
  onOpenCombat?: (level: number, type: "normal" | "elite" | "boss", combatId: string) => void;
}

export default function AdventureHub({
  onClose,
  initialTab = "boss",
  onOpenCombat,
}: AdventureHubProps) {
  const tabs: HubTab[] = [
    {
      id: "boss",
      label: "首领挑战",
      icon: "🐉",
      content: <BossTab onClose={onClose} onOpenCombat={onOpenCombat} />,
    },
    {
      id: "portal",
      label: "位面传送",
      icon: "🌀",
      content: <PortalTab />,
    },
    {
      id: "story",
      label: "主线剧情",
      icon: "📜",
      content: <StoryTab />,
    },
  ];

  return (
    <HubPanel
      title="冒险系统"
      icon="🗺️"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}

// Boss标签页
function BossTab({ onClose, onOpenCombat }: { onClose: () => void; onOpenCombat?: (level: number, type: "normal" | "elite" | "boss", combatId: string) => void }) {
  const { data: bosses, isLoading } = api.boss.getAll.useQuery();
  const utils = api.useUtils();

  const challengeMutation = api.boss.challenge.useMutation({
    onSuccess: (data) => {
      void utils.boss.getAll.invalidate();
      void utils.player.getStatus.invalidate();
      // 关闭冒险Hub，打开ATB战斗面板
      onClose();
      onOpenCombat?.(1, "boss", data.combatId);
    },
  });

  if (isLoading) {
    return (
      <PanelSkeleton />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {(!bosses || bosses.length === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🐲</div>
            <div className="text-[#888]">暂无可挑战的Boss</div>
            <div className="text-xs text-[#666] mt-1">提升等级和职阶以解锁更多Boss</div>
          </div>
        )}
        {bosses?.map((boss) => (
          <div
            key={boss.id}
            className={`p-4 border ${
              boss.canChallenge
                ? "border-[#e67e22] bg-[#3a2a1a]/30"
                : boss.isUnlocked
                ? "border-[#2a2a30] bg-[#1a1a20]"
                : "border-[#1a1a20] bg-[#0a0a0c] opacity-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{boss.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{boss.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-[#2a2a30] text-[#888]">
                    Lv.{boss.level}
                  </span>
                </div>
                <div className="text-sm text-[#888] mt-1">{boss.description}</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#666]">
                  <span>HP: {boss.hp}</span>
                  <span>本周: {boss.weeklyAttempts}/{boss.weeklyAttemptLimit}</span>
                </div>
                {boss.rewards && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-[#c9a227]">🪙 {boss.rewards.gold}</span>
                    <span className="text-[#9b59b6]">💎 {boss.rewards.crystals}</span>
                    <span className="text-[#4a9eff]">⭐ {boss.rewards.exp}</span>
                  </div>
                )}
              </div>
              <div>
                {boss.canChallenge ? (
                  <button
                    onClick={() => challengeMutation.mutate({ bossId: boss.id })}
                    disabled={challengeMutation.isPending}
                    className="px-4 py-2 bg-[#e67e22] text-[#08080a] font-bold hover:bg-[#f39c12] disabled:opacity-50"
                  >
                    挑战
                  </button>
                ) : !boss.isUnlocked ? (
                  <span className="text-xs text-[#666]">未解锁</span>
                ) : (
                  <span className="text-xs text-[#666]">次数已用完</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* 战斗已启动提示 */}
        {challengeMutation.isSuccess && challengeMutation.data && (
          <div className="p-3 border text-sm bg-[#1a2a3a] border-[#4a9eff]/30 text-[#4a9eff]">
            已发起对{challengeMutation.data.bossName}的挑战，战斗进行中...
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 传送标签页
function PortalTab() {
  const { data: player } = api.player.getStatus.useQuery();
  const utils = api.useUtils();

  const travelMutation = api.portal.travel.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
    },
  });

  const worlds = [
    { id: "main", name: "主位面", icon: "🌍", description: "你的家园世界" },
    { id: "fire_realm", name: "火焰位面", icon: "🔥", description: "炎热的火焰世界" },
    { id: "ice_realm", name: "寒冰位面", icon: "❄️", description: "冰封的寒冷世界" },
    { id: "shadow_realm", name: "暗影位面", icon: "🌑", description: "黑暗笼罩的世界" },
    { id: "celestial_realm", name: "天界", icon: "✨", description: "神圣的天空之境" },
  ];

  const currentWorld = player?.currentWorld ?? "main";

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="text-center mb-4">
          <div className="text-sm text-[#888]">当前位置</div>
          <div className="text-xl font-bold text-[#c9a227]">
            {worlds.find((w) => w.id === currentWorld)?.icon}{" "}
            {worlds.find((w) => w.id === currentWorld)?.name}
          </div>
        </div>

        <div className="space-y-2">
          {worlds.map((world) => (
            <div
              key={world.id}
              className={`p-4 border ${
                world.id === currentWorld
                  ? "border-[#c9a227] bg-[#1a1810]"
                  : "border-[#2a2a30] bg-[#1a1a20]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{world.icon}</div>
                  <div>
                    <div className="font-bold">{world.name}</div>
                    <div className="text-xs text-[#888]">{world.description}</div>
                  </div>
                </div>
                {world.id !== currentWorld && (
                  <button
                    onClick={() => travelMutation.mutate({ worldId: world.id })}
                    disabled={travelMutation.isPending}
                    className="px-4 py-2 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad] disabled:opacity-50"
                  >
                    传送
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {travelMutation.isSuccess && (
          <div className="mt-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm text-[#4a9]">
            🌀 传送成功！
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 剧情标签页
function StoryTab() {
  const { data: chapters, isLoading } = api.story.getChapters.useQuery();
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PanelSkeleton />
    );
  }

  // 计算章节解锁状态：第一章默认解锁，后续章节需要前一章完成
  const getChapterUnlockStatus = (index: number) => {
    if (index === 0) return true;
    const prevChapter = chapters?.[index - 1];
    return prevChapter?.isCompleted ?? false;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {!chapters || chapters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📜</div>
            <div className="text-[#888]">暂无剧情章节</div>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter, index) => {
              const isUnlocked = getChapterUnlockStatus(index);
              return (
                <div
                  key={chapter.id}
                  className={`p-4 border cursor-pointer transition-colors ${
                    chapter.isCompleted
                      ? "border-[#4a9] bg-[#1a3a1a]/30"
                      : isUnlocked
                      ? "border-[#c9a227] bg-[#1a1810] hover:bg-[#222218]"
                      : "border-[#2a2a30] bg-[#1a1a20] opacity-50"
                  }`}
                  onClick={() => isUnlocked && setSelectedChapter(chapter.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">第{index + 1}章</span>
                        <span className="text-[#888]">{chapter.title}</span>
                        {chapter.isCompleted && (
                          <span className="text-xs text-[#4a9]">✓ 已完成</span>
                        )}
                      </div>
                      <div className="text-xs text-[#666] mt-1">{chapter.description}</div>
                    </div>
                    {!isUnlocked && (
                      <span className="text-xs text-[#666]">🔒 未解锁</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
