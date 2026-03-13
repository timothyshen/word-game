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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [battleResult, setBattleResult] = useState<any>(null);

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
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#3d3529] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-lg text-[#e0dcd0]">
                挑战强敌
              </DialogTitle>
              <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-1" />
            </div>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 战斗结果弹窗 */}
        {battleResult && (
          <div className={`p-4 ${battleResult.victory ? "bg-[#1a3a1a]/50" : "bg-[#3a1a1a]/50"} border-b border-[#2a3a4a]`}>
            <div className={`text-center text-lg font-bold mb-2 ${battleResult.victory ? "text-[#4a9]" : "text-[#e74c3c]"}`}>
              {battleResult.victory ? "胜利!" : "失败"}
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
                    ? "border-[#2a3a4a]/50 bg-[#050810] opacity-50"
                    : selectedBossId === boss.id
                    ? "border-[#c9a227]/30 bg-[#0a0a15]"
                    : "border-[#2a3a4a] bg-[#0a0a15] hover:border-[#3d3529]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Boss图标 */}
                  <div
                    className={`w-16 h-16 flex items-center justify-center text-4xl border ${
                      boss.isUnlocked ? "border-[#c9a227]/30 bg-[#0a0a15]" : "border-[#2a3a4a]/50 bg-[#050810]"
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
                          ? "bg-[#0a0a15] border border-[#2a3a4a] text-[#888] hover:text-[#e0dcd0]"
                          : "bg-[#050810] text-[#444] cursor-not-allowed"
                      }`}
                    >
                      详情
                    </button>
                    <button
                      onClick={() => challengeMutation.mutate({ bossId: boss.id })}
                      disabled={!boss.canChallenge || challengeMutation.isPending}
                      className={`px-4 py-2 font-bold ${
                        boss.canChallenge
                          ? "bg-[#e74c3c] text-[#fff] hover:bg-[#c0392b] border border-[#e74c3c]/30"
                          : "bg-[#050810] text-[#444] cursor-not-allowed border border-[#2a3a4a]"
                      } disabled:opacity-50`}
                    >
                      {challengeMutation.isPending ? "战斗中..." : "挑战"}
                    </button>
                  </div>
                </div>

                {/* Boss详情展开 */}
                {selectedBossId === boss.id && bossDetail && (
                  <div className="mt-4 pt-4 border-t border-[#2a3a4a]">
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
        <div className="p-3 bg-[#050810] border-t border-[#2a3a4a] text-xs text-[#5a6a7a] text-center">
          Boss挑战每周重置，消耗30体力
        </div>
      </DialogContent>
    </Dialog>
  );
}
