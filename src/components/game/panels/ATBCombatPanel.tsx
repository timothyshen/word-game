"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import type { ATBCombatState, PartyMember, EnemyUnit, CombatActionV2 } from "~/shared/effects/types";

interface ATBCombatPanelProps {
  onClose: () => void;
  monsterLevel?: number;
  combatType?: "normal" | "elite" | "boss";
}

// Element display config
const ELEMENT_COLORS: Record<string, string> = {
  physical: "#888",
  fire: "#e74c3c",
  ice: "#4a9eff",
  thunder: "#f1c40f",
  light: "#f5e6c8",
  dark: "#9b59b6",
};

const ELEMENT_LABELS: Record<string, string> = {
  physical: "物理",
  fire: "火",
  ice: "冰",
  thunder: "雷",
  light: "光",
  dark: "暗",
};

// Log type colors
const LOG_COLORS: Record<string, string> = {
  action: "var(--game-text)",
  damage: "#e74c3c",
  heal: "#44aa99",
  buff: "#4a9eff",
  system: "var(--game-gold)",
  critical: "#f1c40f",
  weakness: "#e67e22",
  combo: "#9b59b6",
};

export default function ATBCombatPanel({ onClose, monsterLevel = 1, combatType = "normal" }: ATBCombatPanelProps) {
  const [combatId, setCombatId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CombatActionV2 | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Start combat
  const startMutation = api.combat.startATBCombat.useMutation({
    onSuccess: (data) => {
      setCombatId(data.combatId);
    },
  });

  // Get combat status
  const { data: state, refetch: refetchState } = api.combat.getATBStatus.useQuery(
    { combatId: combatId! },
    { enabled: !!combatId, refetchInterval: false },
  );

  // Get actions
  const { data: actionsData } = api.combat.getATBActions.useQuery(
    { combatId: combatId! },
    { enabled: !!combatId && state?.status === "active" && !!state?.currentActorId },
  );

  // Execute action
  const actionMutation = api.combat.executeATBAction.useMutation({
    onSuccess: () => {
      setIsActing(false);
      setSelectedAction(null);
      setSelectingTarget(false);
      void refetchState();
    },
    onError: () => {
      setIsActing(false);
    },
  });

  // Abandon combat
  const abandonMutation = api.combat.abandonCombat.useMutation({
    onSuccess: () => onClose(),
  });

  // Auto-start on mount
  useEffect(() => {
    if (!combatId) {
      startMutation.mutate({ monsterLevel, combatType });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state?.logs]);

  const handleActionClick = useCallback((action: CombatActionV2) => {
    if (!combatId || isActing) return;

    if (action.targetType === "self" || action.targetType === "all_enemies" || action.targetType === "all_allies") {
      // No target selection needed
      setIsActing(true);
      const targetIds = action.targetType === "self"
        ? [state?.currentActorId ?? ""]
        : action.targetType === "all_enemies"
          ? (state?.enemies.filter(e => e.isAlive).map(e => e.id) ?? [])
          : (state?.party.filter(p => p.isAlive).map(p => p.id) ?? []);
      actionMutation.mutate({ combatId, actionId: action.id, targetIds });
    } else {
      // Need target selection
      setSelectedAction(action);
      setSelectingTarget(true);
    }
  }, [combatId, isActing, state, actionMutation]);

  const handleTargetSelect = useCallback((targetId: string) => {
    if (!combatId || !selectedAction || isActing) return;
    setIsActing(true);
    setSelectingTarget(false);
    actionMutation.mutate({ combatId, actionId: selectedAction.id, targetIds: [targetId] });
  }, [combatId, selectedAction, isActing, actionMutation]);

  const cancelTargetSelection = useCallback(() => {
    setSelectedAction(null);
    setSelectingTarget(false);
  }, []);

  // Loading state
  if (!combatId || startMutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-2xl mx-4 p-8 bg-[#0a0a15]/95 border border-[#2a3a4a] text-center">
          <h2 className="font-display text-2xl text-[var(--game-gold)] mb-4">准备战斗</h2>
          <p className="text-[var(--game-text-muted)]">编排队伍中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (startMutation.isError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-2xl mx-4 p-8 bg-[#0a0a15]/95 border border-[#2a3a4a] text-center">
          <h2 className="font-display text-2xl text-[var(--game-red)] mb-4">战斗准备失败</h2>
          <p className="text-[var(--game-text-muted)] mb-4">{startMutation.error.message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => startMutation.mutate({ monsterLevel, combatType })} className="px-4 py-2 border border-[var(--game-gold)] text-[var(--game-gold)] hover:bg-[var(--game-gold)]/10">
              重试
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-[var(--game-border-warm)] text-[var(--game-text-muted)] hover:text-[var(--game-text)]">
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-2xl mx-4 p-8 bg-[#0a0a15]/95 border border-[#2a3a4a] text-center">
          <p className="text-[var(--game-text-muted)]">加载战斗状态...</p>
        </div>
      </div>
    );
  }

  const currentActor = state.party.find(p => p.id === state.currentActorId);
  const isFinished = state.status !== "active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-2xl mx-4 flex flex-col bg-[#0a0a15]/95 border border-[#2a3a4a] max-h-[90vh]">

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2a3a4a] flex items-center justify-between"
          style={{ background: "linear-gradient(180deg, rgba(201,162,39,0.08) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl text-[var(--game-gold)]">
              {combatType === "boss" ? "Boss战" : combatType === "elite" ? "精英战" : "战斗"}
            </h2>
            <span className="text-xs text-[var(--game-text-dim)]">回合 {state.turnCount}</span>
          </div>
          {currentActor && !isFinished && (
            <span className="text-sm text-[var(--game-gold)]">{currentActor.name} 的回合</span>
          )}
        </div>

        {/* Enemy Area */}
        <div className="px-4 py-3 border-b border-[#2a3a4a]/50">
          <div className="flex flex-wrap gap-3 justify-center">
            {state.enemies.map((enemy) => (
              <EnemyCard
                key={enemy.id}
                enemy={enemy}
                isTargetable={selectingTarget && selectedAction?.targetType === "single_enemy"}
                onSelect={() => handleTargetSelect(enemy.id)}
              />
            ))}
          </div>
        </div>

        {/* Combat Log */}
        <div
          ref={logRef}
          className="flex-1 min-h-[120px] max-h-[200px] overflow-y-auto px-4 py-2 space-y-0.5 text-sm border-b border-[#2a3a4a]/50"
          style={{ scrollbarWidth: "none" }}
        >
          {state.logs.slice(-20).map((log, i) => (
            <div key={i} className="leading-relaxed" style={{ color: LOG_COLORS[log.type] ?? "var(--game-text)" }}>
              <span className="text-[var(--game-text-dim)] text-xs mr-1">[{log.turn}]</span>
              {log.message}
            </div>
          ))}
        </div>

        {/* Party Area */}
        <div className="px-4 py-3 border-b border-[#2a3a4a]/50">
          <div className="flex gap-3 justify-center">
            {state.party.map((member) => (
              <PartyCard
                key={member.id}
                member={member}
                isActive={member.id === state.currentActorId}
                isTargetable={selectingTarget && selectedAction?.targetType === "single_ally"}
                onSelect={() => handleTargetSelect(member.id)}
              />
            ))}
          </div>
        </div>

        {/* Action Area */}
        <div className="px-4 py-3">
          {isFinished ? (
            <CombatEndView state={state} onClose={onClose} />
          ) : selectingTarget ? (
            <div className="text-center">
              <p className="text-sm text-[var(--game-text-muted)] mb-2">
                选择{selectedAction?.targetType === "single_enemy" ? "敌方" : "己方"}目标
              </p>
              <button onClick={cancelTargetSelection} className="text-xs text-[var(--game-text-dim)] hover:text-[var(--game-text)] underline">
                取消
              </button>
            </div>
          ) : actionsData?.actions && currentActor ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {actionsData.actions.map((action: CombatActionV2) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={isActing || action.currentCooldown > 0}
                  className="px-3 py-2 border border-[var(--game-border-warm)] text-sm text-[var(--game-text-muted)] hover:border-[var(--game-gold)] hover:text-[var(--game-gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title={`${action.description}${action.mpCost > 0 ? ` (${action.mpCost} MP)` : ""}`}
                >
                  <span className="block">{action.name}</span>
                  {action.mpCost > 0 && (
                    <span className="text-xs text-[var(--game-text-dim)]">{action.mpCost}MP</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-[var(--game-text-dim)]">等待行动...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function EnemyCard({ enemy, isTargetable, onSelect }: {
  enemy: EnemyUnit;
  isTargetable: boolean;
  onSelect: () => void;
}) {
  const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const hpColor = hpPercent > 50 ? "var(--game-red)" : hpPercent > 25 ? "#e67e22" : "#c0392b";

  return (
    <button
      onClick={isTargetable && enemy.isAlive ? onSelect : undefined}
      disabled={!isTargetable || !enemy.isAlive}
      className={`
        w-36 p-2 border text-left transition-all
        ${!enemy.isAlive ? "opacity-30 border-[#2a2a30]" : ""}
        ${isTargetable && enemy.isAlive ? "border-[var(--game-red)] cursor-pointer hover:bg-[var(--game-red)]/10" : "border-[#2a3a4a]"}
        ${enemy.tier === "elite" ? "border-l-2 border-l-[#e67e22]" : ""}
        ${enemy.tier === "boss" ? "border-l-2 border-l-[var(--game-red)]" : ""}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[var(--game-text)]">{enemy.name}</span>
        {enemy.element && (
          <span className="text-xs px-1" style={{ color: ELEMENT_COLORS[enemy.element] }}>
            {ELEMENT_LABELS[enemy.element]}
          </span>
        )}
      </div>
      {/* HP Bar */}
      <div className="h-1.5 bg-[#2a2a30] mb-1">
        <div className="h-full transition-all duration-300" style={{ width: `${hpPercent}%`, backgroundColor: hpColor }} />
      </div>
      <div className="text-xs text-[var(--game-text-dim)]">
        {enemy.hp}/{enemy.maxHp}
      </div>
      {/* Buffs */}
      {enemy.buffs.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {enemy.buffs.map((b, i) => (
            <span key={i} className="text-[10px] px-1 bg-[#2a3a4a] text-[var(--game-blue)]" title={b.name}>
              {b.turnsRemaining}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function PartyCard({ member, isActive, isTargetable, onSelect }: {
  member: PartyMember;
  isActive: boolean;
  isTargetable: boolean;
  onSelect: () => void;
}) {
  const hpPercent = Math.max(0, (member.hp / member.maxHp) * 100);
  const mpPercent = Math.max(0, (member.mp / member.maxMp) * 100);
  const atbPercent = Math.min(100, member.atb);

  return (
    <button
      onClick={isTargetable && member.isAlive ? onSelect : undefined}
      disabled={!isTargetable || !member.isAlive}
      className={`
        w-40 p-2 border text-left transition-all
        ${!member.isAlive ? "opacity-30 border-[#2a2a30]" : ""}
        ${isActive ? "border-[var(--game-gold)] bg-[var(--game-gold)]/5" : "border-[#2a3a4a]"}
        ${isTargetable && member.isAlive ? "cursor-pointer hover:bg-[var(--game-green)]/10 border-[var(--game-green)]" : ""}
      `}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{member.portrait}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-[var(--game-text)] truncate">{member.name}</div>
          <div className="text-[10px] text-[var(--game-text-dim)]">{member.baseClass}</div>
        </div>
      </div>

      {/* HP */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[10px] text-[var(--game-red)] w-5">HP</span>
        <div className="flex-1 h-1.5 bg-[#2a2a30]">
          <div className="h-full bg-[var(--game-red)] transition-all duration-300" style={{ width: `${hpPercent}%` }} />
        </div>
        <span className="text-[10px] text-[var(--game-text-dim)] w-14 text-right">{member.hp}/{member.maxHp}</span>
      </div>

      {/* MP */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[10px] text-[var(--game-blue)] w-5">MP</span>
        <div className="flex-1 h-1.5 bg-[#2a2a30]">
          <div className="h-full bg-[var(--game-blue)] transition-all duration-300" style={{ width: `${mpPercent}%` }} />
        </div>
        <span className="text-[10px] text-[var(--game-text-dim)] w-14 text-right">{member.mp}/{member.maxMp}</span>
      </div>

      {/* ATB */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[var(--game-gold)] w-5">AT</span>
        <div className="flex-1 h-1 bg-[var(--game-gold)]/10">
          <div
            className={`h-full transition-all duration-300 ${atbPercent >= 100 ? "bg-[var(--game-gold)]" : "bg-[var(--game-gold)]/50"}`}
            style={{ width: `${atbPercent}%` }}
          />
        </div>
      </div>

      {/* Buffs */}
      {member.buffs.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {member.buffs.map((b, i) => (
            <span key={i} className="text-[10px] px-1 bg-[#2a3a4a] text-[var(--game-green)]" title={b.name}>
              {b.turnsRemaining}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function CombatEndView({ state, onClose }: { state: ATBCombatState; onClose: () => void }) {
  const isVictory = state.status === "victory";
  const isFled = state.status === "fled";

  return (
    <div className="text-center space-y-3">
      <h3 className={`font-display text-2xl ${isVictory ? "text-[var(--game-gold)]" : isFled ? "text-[var(--game-text-muted)]" : "text-[var(--game-red)]"}`}>
        {isVictory ? "战斗胜利" : isFled ? "成功撤退" : "战斗失败"}
      </h3>

      {state.rating && (
        <div className="space-y-1">
          <div className="text-3xl font-display" style={{ color: state.rating.grade === "S" ? "var(--game-gold)" : state.rating.grade === "A" ? "#44aa99" : state.rating.grade === "B" ? "var(--game-text)" : "var(--game-text-dim)" }}>
            {state.rating.grade}
          </div>
          <div className="flex gap-4 justify-center text-xs text-[var(--game-text-dim)]">
            <span>回合: {state.rating.turnsUsed}</span>
            <span>存活: {state.rating.survivorCount}/{state.party.length}</span>
            <span>弱点: {state.rating.weaknessHits}</span>
            <span>倍率: {state.rating.multiplier}x</span>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="px-6 py-2 bg-[var(--game-gold)] text-[var(--game-bg)] font-bold hover:bg-[var(--game-gold-hover)] transition-colors"
      >
        确认
      </button>
    </div>
  );
}
