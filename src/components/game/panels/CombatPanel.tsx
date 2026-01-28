// 战斗面板组件 - 回合制文字选择战斗

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface CombatPanelProps {
  onClose: () => void;
  monsterLevel?: number;
  monsterType?: string;
  characterId?: string;
}

export default function CombatPanel({
  onClose,
  monsterLevel = 1,
  monsterType,
  characterId,
}: CombatPanelProps) {
  const [combatId, setCombatId] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isActing, setIsActing] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  // 开始战斗
  const startMutation = api.combat.startCombat.useMutation({
    onSuccess: (data) => {
      setCombatId(data.combatId);
      setCombatLog(data.log);
    },
  });

  // 获取战斗状态
  const { data: combatStatus, refetch: refetchStatus } = api.combat.getCombatStatus.useQuery(
    { combatId: combatId! },
    { enabled: !!combatId, refetchInterval: false }
  );

  // 获取可用行动
  const { data: actionsData } = api.combat.getActions.useQuery(
    { combatId: combatId! },
    { enabled: !!combatId && combatStatus?.status === "ongoing" }
  );

  // 执行行动
  const actionMutation = api.combat.executeAction.useMutation({
    onSuccess: (data) => {
      setCombatLog(prev => [...prev, ...data.log]);
      void refetchStatus();
      setIsActing(false);

      if (data.status !== "ongoing") {
        void utils.player.getStatus.invalidate();
      }
    },
    onError: () => {
      setIsActing(false);
    },
  });

  // 结束战斗
  const endMutation = api.combat.endCombat.useMutation({
    onSuccess: () => {
      void utils.player.getStatus.invalidate();
      onClose();
    },
  });

  // 自动开始战斗
  useEffect(() => {
    if (!combatId && !startMutation.isPending) {
      startMutation.mutate({ monsterLevel, monsterType, characterId });
    }
  }, [combatId, monsterLevel, monsterType, characterId, startMutation]);

  // 自动滚动日志
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [combatLog]);

  const handleAction = (actionId: string) => {
    if (!combatId || isActing) return;
    setIsActing(true);
    actionMutation.mutate({ combatId, actionId });
  };

  const handleClose = () => {
    if (combatId) {
      endMutation.mutate({ combatId });
    } else {
      onClose();
    }
  };

  if (startMutation.isPending) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">进入战斗...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (startMutation.isError) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#e74c3c]">
            {startMutation.error.message}
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 border border-[#666] text-[#888] hover:border-[#c9a227]"
          >
            返回
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  const status = combatStatus?.status ?? "ongoing";
  const monster = combatStatus?.monster ?? startMutation.data?.monster;
  const playerHp = combatStatus?.playerHp ?? startMutation.data?.playerHp ?? 100;
  const playerMaxHp = combatStatus?.playerMaxHp ?? startMutation.data?.playerMaxHp ?? 100;
  const playerMp = combatStatus?.playerMp ?? startMutation.data?.playerMp ?? 50;
  const playerMaxMp = combatStatus?.playerMaxMp ?? startMutation.data?.playerMaxMp ?? 50;
  const monsterHp = monster?.hp ?? 0;
  const monsterMaxHp = monster?.maxHp ?? 100;
  const turn = combatStatus?.turn ?? 1;

  const hpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
  const mpPercent = Math.max(0, (playerMp / playerMaxMp) * 100);
  const monsterHpPercent = Math.max(0, (monsterHp / monsterMaxHp) * 100);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#e74c3c] p-0 max-w-4xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1010] to-[#101014] border-b border-[#e74c3c]/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#e74c3c] flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <div>
                <div className="text-[#e74c3c] text-xs uppercase tracking-wider">战斗</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  回合 {turn}
                </DialogTitle>
              </div>
            </div>
            {status !== "ongoing" && (
              <button onClick={handleClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
            )}
          </div>
        </DialogHeader>

        {/* 战斗区域 */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* 怪物状态 */}
          <div className="p-4 border-b border-[#2a2a30] bg-[#151518]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#1a1a20] border-2 border-[#e74c3c] flex items-center justify-center text-4xl">
                  {monster?.icon ?? "👹"}
                </div>
                <div>
                  <div className="font-bold text-lg text-[#e0dcd0]">{monster?.name ?? "怪物"}</div>
                  <div className="text-xs text-[#888]">Lv.{monster?.level ?? 1}</div>
                </div>
              </div>
              <div className="w-40">
                <div className="text-xs text-[#888] mb-1 text-right">HP {monsterHp}/{monsterMaxHp}</div>
                <div className="h-3 bg-[#2a2a30] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e74c3c] to-[#c0392b] transition-all duration-300"
                    style={{ width: `${monsterHpPercent}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* 战斗日志 */}
          <ScrollArea className="flex-1 min-h-[200px]" ref={logRef}>
            <div className="p-4 space-y-1">
              {combatLog.map((log, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    log.includes("胜利") || log.includes("获得")
                      ? "text-[#4a9]"
                      : log.includes("失败") || log.includes("击败")
                      ? "text-[#e74c3c]"
                      : "text-[#888]"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* 玩家状态 */}
          <div className="p-4 border-t border-[#2a2a30] bg-[#151518]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#4a9] flex items-center justify-center text-2xl">
                  🧙
                </div>
                <div>
                  <div className="font-bold text-[#e0dcd0]">玩家</div>
                  {combatStatus?.playerBuffs && combatStatus.playerBuffs.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {combatStatus.playerBuffs.map((buff, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-[#c9a227]/20 text-[#c9a227] rounded">
                          {buff.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-48 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#e74c3c] w-8">HP</span>
                  <div className="flex-1 h-2.5 bg-[#2a2a30] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e74c3c] to-[#c0392b] transition-all duration-300"
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#888] w-16 text-right">{playerHp}/{playerMaxHp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3498db] w-8">MP</span>
                  <div className="flex-1 h-2.5 bg-[#2a2a30] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3498db] to-[#2980b9] transition-all duration-300"
                      style={{ width: `${mpPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#888] w-16 text-right">{playerMp}/{playerMaxMp}</span>
                </div>
              </div>
            </div>

            {/* 行动按钮 */}
            {status === "ongoing" ? (
              <div className="grid grid-cols-3 gap-2">
                {actionsData?.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={isActing || action.disabled}
                    className={`p-3 border text-left transition-all ${
                      action.disabled
                        ? "border-[#2a2a30] text-[#444] cursor-not-allowed"
                        : isActing
                        ? "border-[#2a2a30] text-[#666]"
                        : "border-[#3a3a40] text-[#e0dcd0] hover:border-[#c9a227] hover:bg-[#1a1a20]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{action.icon}</span>
                      <div>
                        <div className="font-bold text-sm">{action.name}</div>
                        <div className="text-xs text-[#666]">
                          {action.mpCost > 0 ? `MP ${action.mpCost}` : action.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`text-center py-4 text-lg font-bold ${
                    status === "victory" ? "text-[#4a9]" : status === "fled" ? "text-[#c9a227]" : "text-[#e74c3c]"
                  }`}
                >
                  {status === "victory" && "🎉 战斗胜利！"}
                  {status === "defeat" && "💀 战斗失败..."}
                  {status === "fled" && "🏃 成功逃跑"}
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-[#c9a227] text-[#000] font-bold hover:bg-[#ddb52f]"
                >
                  {status === "victory" ? "收取奖励" : "返回"}
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
