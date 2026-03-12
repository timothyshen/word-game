// 传送门面板 - 位面旅行系统

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface PortalPanelProps {
  onClose: () => void;
}

export default function PortalPanel({ onClose }: PortalPanelProps) {
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    message: string;
    rewards?: { gold: number; exp: number; crystals: number };
  } | null>(null);

  const utils = api.useUtils();

  // 获取当前世界
  const { data: currentWorld } = api.portal.getCurrentWorld.useQuery();

  // 获取所有世界
  const { data: worlds, isLoading } = api.portal.getWorlds.useQuery();

  // 获取已发现的传送门
  const { data: portals } = api.portal.getDiscoveredPortals.useQuery();

  // 获取当前世界的资源点
  const { data: worldResources } = api.portal.getWorldResources.useQuery(
    { worldId: currentWorld?.id ?? "main" },
    { enabled: !!currentWorld }
  );

  // 传送到世界
  const travelMutation = api.portal.travel.useMutation({
    onSuccess: () => {
      void utils.portal.getCurrentWorld.invalidate();
      void utils.portal.getWorlds.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 挑战传送门守护者
  const challengeMutation = api.portal.challengePortalGuardian.useMutation({
    onSuccess: (data) => {
      setBattleResult(data);
      void utils.portal.getDiscoveredPortals.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 使用传送门
  const usePortalMutation = api.portal.usePortal.useMutation({
    onSuccess: () => {
      void utils.portal.getCurrentWorld.invalidate();
      void utils.portal.getWorlds.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-xl text-[#e0dcd0]">
                位面旅行
              </DialogTitle>
              <div className="font-game-serif text-[#4a9eff] text-xs tracking-wider mt-1">传送门</div>
            </div>
            <div className="flex items-center gap-4">
              {currentWorld && (
                <div className="text-sm font-game-serif">
                  当前位面: <span className="text-[#4a9eff]">{currentWorld.icon} {currentWorld.name}</span>
                </div>
              )}
              <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-[#4a9eff]/40 to-transparent mt-3" />
        </DialogHeader>

        {/* 战斗结果 */}
        {battleResult && (
          <div className={`p-4 ${battleResult.victory ? "bg-[#1a3a1a]" : "bg-[#3a1a1a]"} border-b border-[#2a3a4a]`}>
            <div className={`text-center text-lg font-bold mb-2 ${battleResult.victory ? "text-[#4a9]" : "text-[#e74c3c]"}`}>
              {battleResult.victory ? "胜利!" : "失败"}
            </div>
            <div className="text-sm text-center text-[#888]">{battleResult.message}</div>
            {battleResult.victory && battleResult.rewards && (
              <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                <span className="text-[#c9a227]">🪙 {battleResult.rewards.gold}</span>
                <span className="text-[#9b59b6]">💎 {battleResult.rewards.crystals}</span>
                <span className="text-[#4a9eff]">⭐ {battleResult.rewards.exp} EXP</span>
              </div>
            )}
            <button
              onClick={() => setBattleResult(null)}
              className="mt-3 w-full py-2 bg-[#1a2030] text-[#888] hover:text-[#e0dcd0]"
            >
              确定
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* 世界列表 */}
            <div className="mb-6">
              <div className="text-[#c9a227] text-sm font-bold mb-3">已知位面</div>
              <div className="grid grid-cols-2 gap-3">
                {worlds?.map((world) => (
                  <div
                    key={world.id}
                    className={`p-4 border transition-colors ${
                      !world.isUnlocked
                        ? "border-[#2a3a4a] bg-[#050810] opacity-50"
                        : world.isCurrent
                        ? "border-[#4a9eff] bg-[#4a9eff]/10"
                        : selectedWorldId === world.id
                        ? "border-[#c9a227] bg-[#c9a227]/10"
                        : "border-[#2a3a4a] bg-[#0a0f18] hover:border-[#3d4a5a] cursor-pointer"
                    }`}
                    onClick={() => {
                      if (world.isUnlocked && !world.isCurrent) {
                        setSelectedWorldId(selectedWorldId === world.id ? null : world.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{world.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{world.name}</span>
                          {world.isCurrent && (
                            <span className="text-xs px-1.5 py-0.5 bg-[#4a9eff]/20 text-[#4a9eff]">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#888] mt-1">推荐等级: Lv.{world.level}</div>
                      </div>
                    </div>
                    <div className="text-sm text-[#888] mt-2">{world.description}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {world.features.map((feature, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-[#1a2030] text-[#5a6a7a]">
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* 解锁条件 */}
                    {!world.isUnlocked && world.unlockCondition && (
                      <div className="mt-2 text-xs text-[#e74c3c]">
                        需要:
                        {world.unlockCondition.tier && ` ${world.unlockCondition.tier}阶`}
                        {world.unlockCondition.level && ` Lv.${world.unlockCondition.level}`}
                      </div>
                    )}

                    {/* 传送按钮 */}
                    {selectedWorldId === world.id && !world.isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          travelMutation.mutate({ worldId: world.id });
                        }}
                        disabled={travelMutation.isPending}
                        className="mt-3 w-full py-2 bg-[#4a9eff] text-[#08080a] font-bold hover:bg-[#6ab0ff] disabled:opacity-50"
                      >
                        {travelMutation.isPending ? "传送中..." : "传送 (消耗20体力)"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 当前世界资源点 */}
            {worldResources && worldResources.length > 0 && (
              <div className="mb-6">
                <div className="text-[#c9a227] text-sm font-bold mb-3">
                  {currentWorld?.name ?? "当前世界"} 的资源点
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {worldResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="p-3 border border-[#2a3a4a] bg-[#0a0f18]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xl">{resource.icon}</div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{resource.name}</div>
                          <div className="text-xs text-[#888]">{resource.type}</div>
                        </div>
                        {resource.remainingUses !== null && (
                          <div className="text-xs text-[#5a6a7a]">
                            剩余 {resource.remainingUses}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#5a6a7a] mt-1">{resource.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 已发现的传送门 */}
            {portals && portals.length > 0 && (
              <div>
                <div className="text-[#c9a227] text-sm font-bold mb-3">已发现的传送门</div>
                <div className="space-y-3">
                  {portals.map((portal) => (
                    <div
                      key={portal.id}
                      className="p-4 border border-[#2a3a4a] bg-[#0a0f18]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{portal.icon}</div>
                          <div>
                            <div className="font-bold">{portal.name}</div>
                            <div className="text-xs text-[#888]">
                              通往: {portal.targetWorldName}
                            </div>
                          </div>
                        </div>

                        {portal.canUse ? (
                          <button
                            onClick={() => usePortalMutation.mutate({ portalId: portal.id })}
                            disabled={usePortalMutation.isPending}
                            className="px-4 py-2 bg-[#4a9eff] text-[#08080a] font-bold hover:bg-[#6ab0ff] disabled:opacity-50"
                          >
                            {usePortalMutation.isPending ? "传送中..." : "使用"}
                          </button>
                        ) : portal.guardian ? (
                          <div className="text-right">
                            <div className="text-xs text-[#888] mb-1">
                              守护者: {portal.guardian.icon} {portal.guardian.name} Lv.{portal.guardian.level}
                            </div>
                            <button
                              onClick={() => challengeMutation.mutate({ portalId: portal.id })}
                              disabled={challengeMutation.isPending}
                              className="px-4 py-2 bg-[#e74c3c] text-[#fff] font-bold hover:bg-[#c0392b] disabled:opacity-50"
                            >
                              {challengeMutation.isPending ? "战斗中..." : "挑战"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-sm text-[#888] mt-2">{portal.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无传送门时的提示 */}
            {(!portals || portals.length === 0) && (
              <div className="text-center py-8 text-[#5a6a7a]">
                <div>尚未发现传送门</div>
                <div className="text-xs mt-1">在探索中可能发现传送门</div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 操作反馈 */}
        {travelMutation.isSuccess && (
          <div className="p-3 bg-[#1a3a1a] border-t border-[#4a9]/30 text-sm text-[#4a9] text-center">
            传送成功！
          </div>
        )}
        {usePortalMutation.isSuccess && (
          <div className="p-3 bg-[#1a3a1a] border-t border-[#4a9]/30 text-sm text-[#4a9] text-center">
            通过传送门进入了新的位面！
          </div>
        )}
        {(travelMutation.error ?? usePortalMutation.error ?? challengeMutation.error) && (
          <div className="p-3 bg-[#3a1a1a] border-t border-[#e74c3c]/30 text-sm text-[#e74c3c] text-center">
            {travelMutation.error?.message ?? usePortalMutation.error?.message ?? challengeMutation.error?.message}
          </div>
        )}

        {/* 底部提示 */}
        <div className="p-3 bg-[#050810] border-t border-[#2a3a4a] text-xs text-[#5a6a7a] text-center">
          不同位面有独特的资源和怪物
        </div>
      </DialogContent>
    </Dialog>
  );
}
