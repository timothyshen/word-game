// 祭坛面板 - 管理已发现的祭坛，收集每日卡牌

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { RARITY_COLORS, getRarityStars } from "~/constants";

interface AltarPanelProps {
  onClose: () => void;
}

export default function AltarPanel({ onClose }: AltarPanelProps) {
  const [selectedAltarId, setSelectedAltarId] = useState<string | null>(null);
  const [collectResult, setCollectResult] = useState<{
    altarName: string;
    card: { name: string; rarity: string; icon: string };
  } | null>(null);
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    bossName: string;
    message: string;
    rewards?: { gold: number; exp: number; crystals: number };
  } | null>(null);

  const utils = api.useUtils();

  // 获取已发现的祭坛
  const { data: altars, isLoading } = api.altar.getDiscoveredAltars.useQuery();

  // 挑战守护者
  const challengeMutation = api.altar.challengeGuardian.useMutation({
    onSuccess: (data) => {
      setBattleResult(data);
      void utils.altar.getDiscoveredAltars.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 收集每日卡牌
  const collectMutation = api.altar.collectDailyCard.useMutation({
    onSuccess: (data) => {
      setCollectResult({
        altarName: data.altarName,
        card: data.card,
      });
      void utils.altar.getDiscoveredAltars.invalidate();
      void utils.card.getAll.invalidate();
    },
  });

  // 一键收集所有
  const collectAllMutation = api.altar.collectAllDailyCards.useMutation({
    onSuccess: () => {
      void utils.altar.getDiscoveredAltars.invalidate();
      void utils.card.getAll.invalidate();
    },
  });

  const selectedAltar = altars?.find((a) => a.id === selectedAltarId);
  const collectableCount = altars?.filter((a) => a.canCollect).length ?? 0;

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 战斗结果展示
  if (battleResult) {
    return (
      <Dialog open={true} onOpenChange={() => setBattleResult(null)}>
        <DialogContent className="p-0 max-w-md" showCloseButton={false}>
          <DialogHeader className={`p-6 ${battleResult.victory ? "bg-gradient-to-r from-[#0a1510] to-[#050810]" : "bg-gradient-to-r from-[#150a0a] to-[#050810]"}`}>
            <DialogTitle className={`text-xl font-bold text-center ${battleResult.victory ? "text-[#4a9]" : "text-[#e74c3c]"}`}>
              {battleResult.victory ? "战斗胜利!" : "战斗失败"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 text-center">
            <p className="text-[#e0dcd0] mb-4">{battleResult.message}</p>

            {battleResult.victory && battleResult.rewards && (
              <div className="bg-[#050810] p-4 mb-4">
                <div className="text-sm text-[#888] mb-2">战利品</div>
                <div className="flex justify-center gap-4">
                  <span className="text-[#c9a227]">🪙 {battleResult.rewards.gold}</span>
                  <span className="text-[#9b59b6]">💎 {battleResult.rewards.crystals}</span>
                  <span className="text-[#4a9]">✨ {battleResult.rewards.exp} EXP</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setBattleResult(null)}
              className="w-full py-3 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad]"
            >
              确定
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 收集结果展示
  if (collectResult) {
    return (
      <Dialog open={true} onOpenChange={() => setCollectResult(null)}>
        <DialogContent className="p-0 max-w-md" showCloseButton={false}>
          <DialogHeader className="bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-6">
            <DialogTitle className="text-[#9b59b6] text-xl font-bold text-center">
              获得卡牌!
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 text-center">
            <div className="text-sm text-[#888] mb-2">来自 {collectResult.altarName}</div>
            <div
              className="relative p-6 bg-[#0a0a15] border inline-block"
              style={{ borderColor: RARITY_COLORS[collectResult.card.rarity] }}
            >
              <div className="text-5xl mb-3">{collectResult.card.icon}</div>
              <div className="font-bold text-lg">{collectResult.card.name}</div>
              <div
                className="text-sm mt-1"
                style={{ color: RARITY_COLORS[collectResult.card.rarity] }}
              >
                {collectResult.card.rarity} {getRarityStars(collectResult.card.rarity)}
              </div>
            </div>

            <button
              onClick={() => setCollectResult(null)}
              className="w-full mt-6 py-3 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad]"
            >
              确定
            </button>
          </div>
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
            <div className="flex items-center gap-4">
              <div>
                <DialogTitle className="font-display text-xl text-[#e0dcd0]">
                  祭坛管理
                </DialogTitle>
                <div className="font-game-serif text-[#5a6a7a] text-xs tracking-wider">野外祭坛</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {collectableCount > 0 && (
                <button
                  onClick={() => collectAllMutation.mutate()}
                  disabled={collectAllMutation.isPending}
                  className="px-3 py-1.5 bg-[#4a9] text-white text-sm font-bold hover:bg-[#3a8] disabled:opacity-50"
                >
                  一键收集 ({collectableCount})
                </button>
              )}
              <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {(!altars || altars.length === 0) ? (
              <div className="text-center py-12">
                <div className="text-[#888]">尚未发现任何祭坛</div>
                <div className="text-sm text-[#666] mt-2">
                  探索地图时有机会发现祭坛
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {altars.map((altar) => (
                  <div
                    key={altar.id}
                    className={`bg-[#0a0a15] border p-4 transition-all ${
                      altar.isDefeated
                        ? altar.canCollect
                          ? "border-[#4a9] hover:border-[#5ba]"
                          : "border-[#3a3a40]"
                        : "border-[#e74c3c] hover:border-[#f55]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2a2a30] flex items-center justify-center text-2xl shrink-0">
                        {altar.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#e0dcd0]">{altar.name}</div>
                        <div className="text-xs text-[#888] mb-2">{altar.description}</div>
                        <div className="text-xs text-[#666]">
                          位置: ({altar.position.x}, {altar.position.y})
                        </div>
                      </div>
                    </div>

                    {/* 状态和操作 */}
                    <div className="mt-3 pt-3 border-t border-[#2a2a30]">
                      {!altar.isDefeated ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#e74c3c]">⚔️</span>
                            <span className="text-sm text-[#e74c3c]">
                              守护者: {altar.guardianBoss?.name} (Lv.{altar.guardianBoss?.level})
                            </span>
                          </div>
                          <button
                            onClick={() => challengeMutation.mutate({ altarId: altar.id })}
                            disabled={challengeMutation.isPending}
                            className="w-full py-2 bg-[#e74c3c] text-white text-sm font-bold hover:bg-[#c0392b] disabled:opacity-50"
                          >
                            {challengeMutation.isPending ? "战斗中..." : "挑战守护者 (30体力)"}
                          </button>
                        </>
                      ) : altar.canCollect ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#4a9]">✨</span>
                            <span className="text-sm text-[#4a9]">可收集每日卡牌</span>
                          </div>
                          <button
                            onClick={() => collectMutation.mutate({ altarId: altar.id })}
                            disabled={collectMutation.isPending}
                            className="w-full py-2 bg-[#4a9] text-white text-sm font-bold hover:bg-[#3a8] disabled:opacity-50"
                          >
                            {collectMutation.isPending ? "收集中..." : "收集卡牌"}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[#666]">⏳</span>
                          <span className="text-sm text-[#666]">今日已收集</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 说明 */}
            <div className="mt-6 p-4 bg-[#1a1a20] border border-[#2a2a30]">
              <div className="text-sm font-bold text-[#9b59b6] mb-2">关于祭坛</div>
              <ul className="text-xs text-[#888] space-y-1">
                <li>· 祭坛通过探索地图发现</li>
                <li>· 每个祭坛都有守护者Boss需要击败</li>
                <li>· 击败守护者后，祭坛每天可以生成一张卡牌</li>
                <li>· 不同等级的祭坛产出不同稀有度的卡牌</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
