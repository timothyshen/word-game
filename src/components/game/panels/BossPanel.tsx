// Boss挑战面板 - 每周Boss战

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface BossPanelProps {
  onClose: () => void;
}

export default function BossPanel({ onClose }: BossPanelProps) {
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    victory: boolean;
    message: string;
    rewards?: {
      gold: number;
      crystals: number;
      exp: number;
      chest?: { name: string; rarity: string; icon: string } | null;
      equipment?: { name: string; rarity: string; icon: string } | null;
    };
  } | null>(null);

  const utils = api.useUtils();

  // 获取Boss列表
  const { data: bosses, isLoading } = api.boss.getAll.useQuery();

  // 获取Boss详情
  const { data: bossDetail } = api.boss.getDetail.useQuery(
    { bossId: selectedBossId! },
    { enabled: !!selectedBossId }
  );

  // 挑战Boss
  const challengeMutation = api.boss.challenge.useMutation({
    onSuccess: (data) => {
      setBattleResult(data);
      void utils.boss.getAll.invalidate();
      void utils.player.getStatus.invalidate();
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#e74c3c] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1010] to-[#101014] border-b border-[#e74c3c]/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#e74c3c] flex items-center justify-center text-3xl">
                👹
              </div>
              <div>
                <div className="text-[#e74c3c] text-xs uppercase tracking-wider">Boss战</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  挑战强敌
                </DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 战斗结果弹窗 */}
        {battleResult && (
          <div className={`p-4 ${battleResult.victory ? "bg-[#1a3a1a]" : "bg-[#3a1a1a]"} border-b border-[#2a2a30]`}>
            <div className={`text-center text-lg font-bold mb-2 ${battleResult.victory ? "text-[#4a9]" : "text-[#e74c3c]"}`}>
              {battleResult.victory ? "🎉 胜利!" : "💀 失败"}
            </div>
            <div className="text-sm text-center text-[#888]">{battleResult.message}</div>
            {battleResult.victory && battleResult.rewards && (
              <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                <span className="text-[#c9a227]">🪙 {battleResult.rewards.gold}</span>
                <span className="text-[#9b59b6]">💎 {battleResult.rewards.crystals}</span>
                <span className="text-[#4a9eff]">⭐ {battleResult.rewards.exp} EXP</span>
                {battleResult.rewards.chest && (
                  <span className="text-[#e67e22]">{battleResult.rewards.chest.icon} {battleResult.rewards.chest.name}</span>
                )}
                {battleResult.rewards.equipment && (
                  <span className="text-[#e67e22]">⚔️ {battleResult.rewards.equipment.name}</span>
                )}
              </div>
            )}
            <button
              onClick={() => setBattleResult(null)}
              className="mt-3 w-full py-2 bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
            >
              确定
            </button>
          </div>
        )}

        {/* Boss列表 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {bosses?.map((boss) => (
              <div
                key={boss.id}
                className={`p-4 border transition-colors ${
                  !boss.isUnlocked
                    ? "border-[#2a2a30] bg-[#0a0a0c] opacity-50"
                    : selectedBossId === boss.id
                    ? "border-[#e74c3c] bg-[#1a1010]"
                    : "border-[#2a2a30] bg-[#1a1a20] hover:border-[#3a3a40]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Boss图标 */}
                  <div
                    className={`w-16 h-16 flex items-center justify-center text-4xl border-2 ${
                      boss.isUnlocked ? "border-[#e74c3c] bg-[#1a1a20]" : "border-[#2a2a30] bg-[#0a0a0c]"
                    }`}
                  >
                    {boss.icon}
                  </div>

                  {/* Boss信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{boss.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#e74c3c]/20 text-[#e74c3c]">
                        Lv.{boss.level}
                      </span>
                    </div>
                    <div className="text-sm text-[#888] mt-1">{boss.description}</div>

                    {/* 状态信息 */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-[#666]">
                        HP: <span className="text-[#e74c3c]">{boss.hp}</span>
                      </span>
                      <span className="text-[#666]">
                        本周挑战: <span className={boss.weeklyAttempts >= boss.weeklyAttemptLimit ? "text-[#e74c3c]" : "text-[#4a9]"}>
                          {boss.weeklyAttempts}/{boss.weeklyAttemptLimit}
                        </span>
                      </span>
                      {boss.lastDefeat && (
                        <span className="text-[#4a9]">✓ 已击败</span>
                      )}
                    </div>

                    {/* 解锁条件 */}
                    {!boss.isUnlocked && boss.unlockCondition && (
                      <div className="mt-2 text-xs text-[#666]">
                        解锁条件:
                        {boss.unlockCondition.tier && ` ${boss.unlockCondition.tier}阶`}
                        {boss.unlockCondition.level && ` Lv.${boss.unlockCondition.level}`}
                        {boss.unlockCondition.world && ` ${boss.unlockCondition.world}`}
                      </div>
                    )}

                    {/* 奖励预览 */}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-[#666]">奖励:</span>
                      <span className="text-[#c9a227]">🪙 {boss.rewards.gold}</span>
                      <span className="text-[#9b59b6]">💎 {boss.rewards.crystals}</span>
                      <span className="text-[#4a9eff]">⭐ {boss.rewards.exp}</span>
                      <span className="text-[#e67e22]">📦 {boss.rewards.cardRarity}宝箱</span>
                    </div>
                  </div>

                  {/* 挑战按钮 */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => setSelectedBossId(selectedBossId === boss.id ? null : boss.id)}
                      disabled={!boss.isUnlocked}
                      className={`px-3 py-1 text-sm ${
                        boss.isUnlocked
                          ? "bg-[#2a2a30] text-[#888] hover:text-[#e0dcd0]"
                          : "bg-[#1a1a20] text-[#444] cursor-not-allowed"
                      }`}
                    >
                      详情
                    </button>
                    <button
                      onClick={() => challengeMutation.mutate({ bossId: boss.id })}
                      disabled={!boss.canChallenge || challengeMutation.isPending}
                      className={`px-4 py-2 font-bold ${
                        boss.canChallenge
                          ? "bg-[#e74c3c] text-[#fff] hover:bg-[#c0392b]"
                          : "bg-[#2a2a30] text-[#444] cursor-not-allowed"
                      } disabled:opacity-50`}
                    >
                      {challengeMutation.isPending ? "战斗中..." : "挑战"}
                    </button>
                  </div>
                </div>

                {/* Boss详情展开 */}
                {selectedBossId === boss.id && bossDetail && (
                  <div className="mt-4 pt-4 border-t border-[#2a2a30]">
                    <div className="text-sm text-[#c9a227] mb-2">技能列表</div>
                    <div className="space-y-2">
                      {bossDetail.skills.map((skill, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-[#e74c3c]">⚔️</span>
                          <span className="text-[#e0dcd0]">{skill.name}</span>
                          <span className="text-[#666]">- {skill.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 底部提示 */}
        <div className="p-3 bg-[#151518] border-t border-[#2a2a30] text-xs text-[#666] text-center">
          💡 Boss挑战每周重置，消耗30体力
        </div>
      </DialogContent>
    </Dialog>
  );
}
