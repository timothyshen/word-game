// 战斗历史面板 - 显示战斗记录和活动战斗

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface CombatHistoryPanelProps {
  onClose: () => void;
  onResumeCombat?: (combatId: string) => void;
}

export default function CombatHistoryPanel({ onClose, onResumeCombat }: CombatHistoryPanelProps) {
  // 获取活动战斗
  const { data: activeCombat } = api.combat.getActiveCombat.useQuery();

  // 获取战斗历史
  const { data: history, isLoading } = api.combat.getHistory.useQuery({ limit: 20 });

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    active: { label: "进行中", color: "#4a9eff", icon: "⚔️" },
    victory: { label: "胜利", color: "#4a9", icon: "🎉" },
    defeat: { label: "失败", color: "#e74c3c", icon: "💀" },
    fled: { label: "逃跑", color: "#c9a227", icon: "🏃" },
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#0a0a15]/95 border border-[#2a3a4a] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 统计数据
  const stats = {
    total: history?.length ?? 0,
    victories: history?.filter(c => c.status === "victory").length ?? 0,
    defeats: history?.filter(c => c.status === "defeat").length ?? 0,
    fled: history?.filter(c => c.status === "fled").length ?? 0,
  };
  const winRate = stats.total > 0 ? Math.round((stats.victories / stats.total) * 100) : 0;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#0a0a15]/95 border border-[#2a3a4a] p-0 max-w-lg max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-[#e0dcd0]">
              战斗记录
            </DialogTitle>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
          </div>
          <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-2" />
        </DialogHeader>

        {/* 统计概览 */}
        <div className="p-4 border-b border-[#2a3a4a] bg-[#050810]">
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
          <div className="p-4 bg-[#050810] border-b border-[#3d3529]">
            <div className="text-xs text-[#c9a227] mb-2">⚔️ 进行中的战斗</div>
            <div className="flex items-center justify-between p-3 bg-[#0a0a15] border border-[#c9a227]/20">
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
        <ScrollArea className="flex-1 min-h-0">
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
        <div className="p-3 bg-[#050810] border-t border-[#2a3a4a] text-xs text-[#5a6a7a] text-center">
          击败强敌可获得稀有卡牌奖励
        </div>
      </DialogContent>
    </Dialog>
  );
}
