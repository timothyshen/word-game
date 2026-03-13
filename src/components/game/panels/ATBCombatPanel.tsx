"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import type { ATBCombatState, PartyMember, EnemyUnit, CombatActionV2, CombatLog } from "~/shared/effects/types";

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

// ── Floating number types ──
interface FloatingNumber {
  id: string;
  amount: number;
  type: "damage" | "critical" | "heal";
  key: number;
}

let floatingKeyCounter = 0;

export default function ATBCombatPanel({ onClose, monsterLevel = 1, combatType = "normal" }: ATBCombatPanelProps) {
  const [combatId, setCombatId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CombatActionV2 | null>(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showDamageVignette, setShowDamageVignette] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track previous HP for all characters to detect changes
  const prevHpRef = useRef<Map<string, number>>(new Map());
  // Track previous buff counts for buff-pop animation
  const prevBuffCountRef = useRef<Map<string, number>>(new Map());
  // Floating numbers per character id
  const [floatingNumbers, setFloatingNumbers] = useState<Map<string, FloatingNumber[]>>(new Map());

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

  // ── Detect HP changes and spawn floating numbers ──
  useEffect(() => {
    if (!state) return;

    const allUnits = [...state.party, ...state.enemies];
    const newFloats = new Map<string, FloatingNumber[]>();
    const latestLog = state.logs[state.logs.length - 1] as CombatLog | undefined;
    let partyTookDamage = false;

    for (const unit of allUnits) {
      const prevHp = prevHpRef.current.get(unit.id);
      if (prevHp !== undefined && prevHp !== unit.hp) {
        const diff = unit.hp - prevHp;
        if (diff < 0) {
          // Damage taken
          const isCritical = latestLog?.type === "critical";
          const floatEntry: FloatingNumber = {
            id: unit.id,
            amount: Math.abs(diff),
            type: isCritical ? "critical" : "damage",
            key: ++floatingKeyCounter,
          };
          const existing = newFloats.get(unit.id) ?? [];
          existing.push(floatEntry);
          newFloats.set(unit.id, existing);

          // Check if a party member took damage for vignette
          if (state.party.some(p => p.id === unit.id)) {
            partyTookDamage = true;
          }
        } else if (diff > 0) {
          // Heal
          const floatEntry: FloatingNumber = {
            id: unit.id,
            amount: diff,
            type: "heal",
            key: ++floatingKeyCounter,
          };
          const existing = newFloats.get(unit.id) ?? [];
          existing.push(floatEntry);
          newFloats.set(unit.id, existing);
        }
      }
      prevHpRef.current.set(unit.id, unit.hp);
    }

    if (newFloats.size > 0) {
      setFloatingNumbers(prev => {
        const merged = new Map(prev);
        for (const [id, entries] of newFloats) {
          const existing = merged.get(id) ?? [];
          merged.set(id, [...existing, ...entries]);
        }
        return merged;
      });

      // Clean up floating numbers after animation
      const maxDuration = 700;
      setTimeout(() => {
        setFloatingNumbers(prev => {
          const cleaned = new Map(prev);
          for (const [id, entries] of newFloats) {
            const current = cleaned.get(id) ?? [];
            const keys = new Set(entries.map(e => e.key));
            cleaned.set(id, current.filter(e => !keys.has(e.key)));
          }
          return cleaned;
        });
      }, maxDuration);
    }

    // Damage vignette for party damage
    if (partyTookDamage) {
      setShowDamageVignette(true);
      setTimeout(() => setShowDamageVignette(false), 400);
    }
  }, [state?.party, state?.enemies, state?.logs]);

  // ── Track buff counts for buff-pop ──
  useEffect(() => {
    if (!state) return;
    const allUnits = [...state.party, ...state.enemies];
    for (const unit of allUnits) {
      prevBuffCountRef.current.set(unit.id, unit.buffs.length);
    }
  }, [state?.party, state?.enemies]);

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

  // ── Animated close handler ──
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  // Loading state
  if (!combatId || startMutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 combat-backdrop-enter">
        <div className="w-full max-w-2xl mx-4 p-8 game-panel text-center combat-panel-enter">
          <h2 className="font-display text-2xl text-[var(--game-gold)] mb-4">准备战斗</h2>
          <p className="text-[var(--game-text-muted)]">编排队伍中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (startMutation.isError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 combat-backdrop-enter">
        <div className="w-full max-w-2xl mx-4 p-8 game-panel text-center combat-panel-enter">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 combat-backdrop-enter">
        <div className="w-full max-w-2xl mx-4 p-8 game-panel text-center combat-panel-enter">
          <p className="text-[var(--game-text-muted)]">加载战斗状态...</p>
        </div>
      </div>
    );
  }

  const currentActor = state.party.find(p => p.id === state.currentActorId);
  const isFinished = state.status !== "active";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 combat-backdrop-enter ${showDamageVignette ? "damage-vignette" : ""}`}>
      <div
        ref={panelRef}
        className={`w-full max-w-2xl mx-4 flex flex-col game-panel max-h-[90vh] ${isExiting ? "combat-panel-exit" : "combat-panel-enter"}`}
      >

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
                floatingNumbers={floatingNumbers.get(enemy.id) ?? []}
                prevBuffCount={prevBuffCountRef.current.get(enemy.id) ?? 0}
              />
            ))}
          </div>
        </div>

        {/* Combat Log */}
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="战斗记录"
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
                floatingNumbers={floatingNumbers.get(member.id) ?? []}
                prevBuffCount={prevBuffCountRef.current.get(member.id) ?? 0}
              />
            ))}
          </div>
        </div>

        {/* Action Area */}
        <div className="px-4 py-3">
          {isFinished ? (
            <CombatEndView state={state} onClose={handleClose} />
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
            <div className={`flex flex-wrap gap-2 justify-center ${isActing ? "animate-pulse opacity-60" : ""}`}>
              {actionsData.actions.map((action: CombatActionV2) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={isActing || action.currentCooldown > 0}
                  className="px-3 py-2 border border-[var(--game-border-warm)] text-sm text-[var(--game-text-muted)] hover:border-[var(--game-gold)] hover:text-[var(--game-gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
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

function EnemyCard({ enemy, isTargetable, onSelect, floatingNumbers, prevBuffCount }: {
  enemy: EnemyUnit;
  isTargetable: boolean;
  onSelect: () => void;
  floatingNumbers: FloatingNumber[];
  prevBuffCount: number;
}) {
  const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const hpColor = hpPercent > 50 ? "var(--game-red)" : hpPercent > 25 ? "#e67e22" : "#c0392b";
  const [shakeClass, setShakeClass] = useState("");
  const [flashClass, setFlashClass] = useState("");

  // Trigger shake + flash when taking damage
  useEffect(() => {
    if (floatingNumbers.some(f => f.type === "damage" || f.type === "critical")) {
      const isCrit = floatingNumbers.some(f => f.type === "critical");
      setShakeClass(isCrit ? "card-shake-heavy" : "card-shake");
      setFlashClass("hit-flash");
      const duration = isCrit ? 300 : 150;
      setTimeout(() => { setShakeClass(""); setFlashClass(""); }, duration);
    }
  }, [floatingNumbers]);

  const isDefeated = !enemy.isAlive;
  const hasNewBuffs = enemy.buffs.length > prevBuffCount;

  return (
    <button
      onClick={isTargetable && enemy.isAlive ? onSelect : undefined}
      disabled={!isTargetable || !enemy.isAlive}
      className={`
        w-36 p-2 border text-left transition-all relative
        ${isDefeated ? "char-defeated border-[#2a2a30]" : ""}
        ${isTargetable && enemy.isAlive ? "border-[var(--game-red)] cursor-pointer hover:bg-[var(--game-red)]/10" : "border-[#2a3a4a]"}
        ${enemy.tier === "elite" ? "border-l-2 border-l-[#e67e22]" : ""}
        ${enemy.tier === "boss" ? "border-l-2 border-l-[var(--game-red)]" : ""}
        ${shakeClass} ${flashClass}
      `}
    >
      {/* Floating numbers */}
      {floatingNumbers.map((fn) => (
        <span
          key={fn.key}
          className={
            fn.type === "critical" ? "damage-number-critical" :
            fn.type === "heal" ? "heal-number" :
            "damage-number"
          }
        >
          {fn.type === "heal" ? "+" : "-"}{fn.amount}
        </span>
      ))}

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
            <span
              key={i}
              className={`text-[10px] px-1 bg-[#2a3a4a] text-[var(--game-blue)] ${hasNewBuffs && i >= prevBuffCount ? "buff-pop" : ""}`}
              title={b.name}
            >
              {b.turnsRemaining}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function PartyCard({ member, isActive, isTargetable, onSelect, floatingNumbers, prevBuffCount }: {
  member: PartyMember;
  isActive: boolean;
  isTargetable: boolean;
  onSelect: () => void;
  floatingNumbers: FloatingNumber[];
  prevBuffCount: number;
}) {
  const hpPercent = Math.max(0, (member.hp / member.maxHp) * 100);
  const mpPercent = Math.max(0, (member.mp / member.maxMp) * 100);
  const atbPercent = Math.min(100, member.atb);
  const [shakeClass, setShakeClass] = useState("");
  const [flashClass, setFlashClass] = useState("");

  // Trigger shake + flash when taking damage
  useEffect(() => {
    if (floatingNumbers.some(f => f.type === "damage" || f.type === "critical")) {
      const isCrit = floatingNumbers.some(f => f.type === "critical");
      setShakeClass(isCrit ? "card-shake-heavy" : "card-shake");
      setFlashClass("hit-flash");
      const duration = isCrit ? 300 : 150;
      setTimeout(() => { setShakeClass(""); setFlashClass(""); }, duration);
    }
  }, [floatingNumbers]);

  const isDefeated = !member.isAlive;
  const hasNewBuffs = member.buffs.length > prevBuffCount;
  const atbReady = atbPercent >= 100;

  return (
    <button
      onClick={isTargetable && member.isAlive ? onSelect : undefined}
      disabled={!isTargetable || !member.isAlive}
      className={`
        w-40 p-2 border text-left transition-all relative
        ${isDefeated ? "char-defeated border-[#2a2a30]" : ""}
        ${isActive && !isDefeated ? "border-[var(--game-gold)] bg-[var(--game-gold)]/5" : !isDefeated ? "border-[#2a3a4a]" : ""}
        ${isTargetable && member.isAlive ? "cursor-pointer hover:bg-[var(--game-green)]/10 border-[var(--game-green)]" : ""}
        ${shakeClass} ${flashClass}
      `}
    >
      {/* Floating numbers */}
      {floatingNumbers.map((fn) => (
        <span
          key={fn.key}
          className={
            fn.type === "critical" ? "damage-number-critical" :
            fn.type === "heal" ? "heal-number" :
            "damage-number"
          }
        >
          {fn.type === "heal" ? "+" : "-"}{fn.amount}
        </span>
      ))}

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
            className={`h-full transition-all duration-300 ${atbReady ? "atb-bar-ready" : ""}`}
            style={{
              width: `${atbPercent}%`,
              backgroundColor: atbReady ? "var(--game-gold)" : undefined,
              background: atbReady
                ? "linear-gradient(90deg, var(--game-gold), #f1c40f, var(--game-gold))"
                : "rgba(201,162,39,0.5)",
              backgroundSize: atbReady ? "200% 100%" : undefined,
              animation: atbReady ? "atb-ready-pulse 1s ease-in-out infinite, atb-shimmer 2s linear infinite" : undefined,
            }}
          />
        </div>
      </div>

      {/* Buffs */}
      {member.buffs.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {member.buffs.map((b, i) => (
            <span
              key={i}
              className={`text-[10px] px-1 bg-[#2a3a4a] text-[var(--game-green)] ${hasNewBuffs && i >= prevBuffCount ? "buff-pop" : ""}`}
              title={b.name}
            >
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
  const isDefeat = state.status === "defeat";

  return (
    <div className={`text-center space-y-3 ${isDefeat ? "defeat-panel" : ""}`}>
      <h3 className={`font-display text-2xl ${isVictory ? "text-[var(--game-gold)]" : isFled ? "text-[var(--game-text-muted)]" : "text-[var(--game-red)]"}`}>
        {isVictory ? "战斗胜利" : isFled ? "成功撤退" : "战斗失败"}
      </h3>

      {state.rating && (
        <div className="space-y-1">
          <div
            className="text-3xl font-display grade-reveal"
            style={{ color: state.rating.grade === "S" ? "var(--game-gold)" : state.rating.grade === "A" ? "#44aa99" : state.rating.grade === "B" ? "var(--game-text)" : "var(--game-text-dim)" }}
          >
            {state.rating.grade}
          </div>
          <div className="flex gap-4 justify-center text-xs text-[var(--game-text-dim)]">
            <span style={{ animation: "combat-enter 300ms ease-out 500ms both" }}>回合: {state.rating.turnsUsed}</span>
            <span style={{ animation: "combat-enter 300ms ease-out 600ms both" }}>存活: {state.rating.survivorCount}/{state.party.length}</span>
            <span style={{ animation: "combat-enter 300ms ease-out 700ms both" }}>弱点: {state.rating.weaknessHits}</span>
            <span style={{ animation: "combat-enter 300ms ease-out 800ms both" }}>倍率: {state.rating.multiplier}x</span>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="px-6 py-2 bg-[var(--game-gold)] text-[var(--game-bg)] font-bold hover:bg-[var(--game-gold-hover)] transition-all active:scale-95"
        style={{ animation: "combat-enter 300ms ease-out 900ms both" }}
      >
        确认
      </button>
    </div>
  );
}
