"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";

interface ArmyCombatPanelProps {
  onClose: () => void;
  enemyLevel?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  infantry: "🗡️",
  archer: "🏹",
  cavalry: "🐴",
  mage: "🔮",
  siege: "💣",
};

const CATEGORY_COLORS: Record<string, string> = {
  infantry: "#e74c3c",
  archer: "#44aa99",
  cavalry: "#e67e22",
  mage: "#9b59b6",
  siege: "#4a9eff",
};

const COMMAND_OPTIONS = [
  { id: "attack", label: "进攻" },
  { id: "defend", label: "防御" },
  { id: "charge", label: "冲锋" },
  { id: "flank", label: "包抄" },
  { id: "retreat", label: "撤退" },
] as const;

type CommandId = (typeof COMMAND_OPTIONS)[number]["id"];

const LOG_COLORS: Record<string, string> = {
  combat: "#e74c3c",
  casualty: "#e67e22",
  hero: "var(--game-gold)",
  system: "var(--game-text-muted)",
  morale: "#9b59b6",
  victory: "var(--game-green)",
};

interface ArmyUnit {
  id: string;
  name: string;
  category: string;
  count: number;
  maxCount: number;
  attack: number;
  defense: number;
  isAlive: boolean;
  heroName?: string;
}

interface ArmyCombatLog {
  turn: number;
  type: string;
  message: string;
}

interface ArmyCombatState {
  combatId: string;
  status: "active" | "victory" | "defeat" | "retreat";
  turnCount: number;
  playerUnits: ArmyUnit[];
  enemyUnits: ArmyUnit[];
  logs: ArmyCombatLog[];
  rewards?: {
    gold?: number;
    exp?: number;
    items?: string[];
  };
}

export default function ArmyCombatPanel({ onClose, enemyLevel = 1 }: ArmyCombatPanelProps) {
  const [combatId, setCombatId] = useState<string | null>(null);
  const [commands, setCommands] = useState<Record<string, CommandId>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Start army combat
  const startMutation =
    (api as unknown as { army: { startCombat: { useMutation: (opts: { onSuccess: (data: { combatId: string }) => void }) => { mutate: (args: { enemyLevel: number }) => void; isPending: boolean; isError: boolean; error: { message: string } | null } } } }).army.startCombat.useMutation({
      onSuccess: (data) => {
        setCombatId(data.combatId);
      },
    });

  // Get combat state
  const { data: state, refetch: refetchState } =
    (api as unknown as { army: { getCombatStatus: { useQuery: (args: { combatId: string }, opts: { enabled: boolean; refetchInterval: false }) => { data: ArmyCombatState | undefined; refetch: () => Promise<unknown> } } } }).army.getCombatStatus.useQuery(
      { combatId: combatId! },
      { enabled: !!combatId, refetchInterval: false },
    );

  // Execute turn
  const executeMutation =
    (api as unknown as { army: { executeTurn: { useMutation: (opts: { onSuccess: () => void; onError: () => void }) => { mutate: (args: { combatId: string; commands: Record<string, string> }) => void; isPending: boolean } } } }).army.executeTurn.useMutation({
      onSuccess: () => {
        setIsExecuting(false);
        setCommands({});
        void refetchState();
      },
      onError: () => {
        setIsExecuting(false);
      },
    });

  // Retreat
  const retreatMutation =
    (api as unknown as { army: { retreat: { useMutation: (opts: { onSuccess: () => void }) => { mutate: (args: { combatId: string }) => void; isPending: boolean } } } }).army.retreat.useMutation({
      onSuccess: () => {
        void refetchState();
      },
    });

  // Auto-start on mount
  useEffect(() => {
    if (!combatId) {
      startMutation.mutate({ enemyLevel });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state?.logs]);

  // Initialize default commands for alive units
  useEffect(() => {
    if (state?.playerUnits && Object.keys(commands).length === 0) {
      const defaultCmds: Record<string, CommandId> = {};
      state.playerUnits.filter((u) => u.isAlive).forEach((u) => {
        defaultCmds[u.id] = "attack";
      });
      setCommands(defaultCmds);
    }
  }, [state?.playerUnits]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCommandChange = useCallback((unitId: string, command: CommandId) => {
    setCommands((prev) => ({ ...prev, [unitId]: command }));
  }, []);

  const handleExecuteTurn = useCallback(() => {
    if (!combatId || isExecuting) return;
    setIsExecuting(true);
    executeMutation.mutate({ combatId, commands });
  }, [combatId, isExecuting, commands, executeMutation]);

  const handleRetreat = useCallback(() => {
    if (!combatId) return;
    retreatMutation.mutate({ combatId });
  }, [combatId, retreatMutation]);

  // Loading state
  if (!combatId || startMutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-2xl mx-4 p-8 bg-[#0a0a15]/95 border border-[#2a3a4a] text-center">
          <h2 className="font-display text-2xl text-[var(--game-gold)] mb-4">集结军队</h2>
          <p className="text-[var(--game-text-muted)]">部署中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (startMutation.isError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-2xl mx-4 p-8 bg-[#0a0a15]/95 border border-[#2a3a4a] text-center">
          <h2 className="font-display text-2xl text-[var(--game-red)] mb-4">部署失败</h2>
          <p className="text-[var(--game-text-muted)] mb-4">{startMutation.error?.message ?? "未知错误"}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startMutation.mutate({ enemyLevel })}
              className="px-4 py-2 border border-[var(--game-gold)] text-[var(--game-gold)] hover:bg-[var(--game-gold)]/10"
            >
              重试
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#2a3a4a] text-[var(--game-text-muted)] hover:text-[var(--game-text)]"
            >
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
          <p className="text-[var(--game-text-muted)]">加载战场状态...</p>
        </div>
      </div>
    );
  }

  const isFinished = state.status !== "active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-2xl mx-4 flex flex-col bg-[#0a0a15]/95 border border-[#2a3a4a] max-h-[90vh]">

        {/* Header */}
        <div
          className="px-4 py-3 border-b border-[#2a3a4a] flex items-center justify-between"
          style={{ background: "linear-gradient(180deg, rgba(201,162,39,0.08) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl text-[var(--game-gold)]">军团战</h2>
            <span className="text-xs text-[var(--game-text-dim)]">回合 {state.turnCount}</span>
            <span className="text-xs text-[var(--game-text-dim)]">敌方Lv.{enemyLevel}</span>
          </div>
          {!isFinished && (
            <button
              onClick={handleRetreat}
              disabled={retreatMutation.isPending}
              className="text-xs px-2 py-1 border border-[var(--game-text-dim)] text-[var(--game-text-dim)] hover:border-[var(--game-red)] hover:text-[var(--game-red)] transition-colors"
            >
              撤退
            </button>
          )}
        </div>

        {/* Enemy Army */}
        <div className="px-4 py-3 border-b border-[#2a3a4a]/50">
          <div className="text-xs text-[var(--game-text-dim)] mb-2 tracking-wider uppercase">敌方军团</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {state.enemyUnits.map((unit) => (
              <ArmyUnitCard key={unit.id} unit={unit} isPlayer={false} />
            ))}
          </div>
        </div>

        {/* Combat Log */}
        <div
          ref={logRef}
          className="flex-1 min-h-[120px] max-h-[200px] overflow-y-auto px-4 py-2 space-y-0.5 text-sm border-b border-[#2a3a4a]/50"
          style={{ scrollbarWidth: "none" }}
        >
          {state.logs.slice(-30).map((log, i) => (
            <div
              key={i}
              className="leading-relaxed"
              style={{ color: LOG_COLORS[log.type] ?? "var(--game-text)" }}
            >
              <span className="text-[var(--game-text-dim)] text-xs mr-1">[{log.turn}]</span>
              {log.message}
            </div>
          ))}
          {state.logs.length === 0 && (
            <div className="text-[var(--game-text-dim)] text-center py-4">战斗即将开始...</div>
          )}
        </div>

        {/* Player Army */}
        <div className="px-4 py-3 border-b border-[#2a3a4a]/50">
          <div className="text-xs text-[var(--game-text-dim)] mb-2 tracking-wider uppercase">我方军团</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {state.playerUnits.map((unit) => (
              <ArmyUnitCard
                key={unit.id}
                unit={unit}
                isPlayer={true}
                command={commands[unit.id]}
                onCommandChange={
                  !isFinished && unit.isAlive
                    ? (cmd) => handleCommandChange(unit.id, cmd)
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Action Area */}
        <div className="px-4 py-3">
          {isFinished ? (
            <CombatEndView state={state} onClose={onClose} />
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-xs text-[var(--game-text-dim)]">
                为每支部队选择指令后执行回合
              </div>
              <button
                onClick={handleExecuteTurn}
                disabled={isExecuting}
                className="px-6 py-2 bg-[var(--game-gold)] text-[#0a0a08] font-bold hover:bg-[#ddb52f] disabled:opacity-50 transition-colors"
              >
                {isExecuting ? "执行中..." : "执行回合"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function ArmyUnitCard({
  unit,
  isPlayer,
  command,
  onCommandChange,
}: {
  unit: ArmyUnit;
  isPlayer: boolean;
  command?: CommandId;
  onCommandChange?: (cmd: CommandId) => void;
}) {
  const countPercent = Math.max(0, (unit.count / unit.maxCount) * 100);
  const countColor = countPercent > 50 ? "var(--game-green)" : countPercent > 25 ? "#e67e22" : "var(--game-red)";

  return (
    <div
      className={`w-40 p-2 border text-left transition-all ${
        !unit.isAlive
          ? "opacity-30 border-[#2a2a30]"
          : isPlayer
            ? "border-[#2a3a4a] hover:border-[var(--game-gold)]/50"
            : "border-[#2a3a4a]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="text-sm">{CATEGORY_ICONS[unit.category]}</span>
          <span className="text-xs font-bold text-[var(--game-text)]">{unit.name}</span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5"
          style={{
            color: CATEGORY_COLORS[unit.category],
            backgroundColor: `${CATEGORY_COLORS[unit.category]}15`,
          }}
        >
          {unit.category === "infantry" ? "步" : unit.category === "archer" ? "弓" : unit.category === "cavalry" ? "骑" : unit.category === "mage" ? "法" : "攻"}
        </span>
      </div>

      {/* Hero name */}
      {unit.heroName && (
        <div className="text-[10px] text-[var(--game-gold)] mb-1">
          统帅: {unit.heroName}
        </div>
      )}

      {/* Count bar */}
      <div className="h-1.5 bg-[#2a2a30] mb-1">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${countPercent}%`, backgroundColor: countColor }}
        />
      </div>
      <div className="text-xs text-[var(--game-text-dim)] mb-1">
        {unit.count}/{unit.maxCount}
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-[10px] text-[var(--game-text-dim)]">
        <span className="text-[var(--game-red)]">攻{unit.attack}</span>
        <span className="text-[var(--game-blue)]">防{unit.defense}</span>
      </div>

      {/* Command selector for player units */}
      {isPlayer && onCommandChange && unit.isAlive && (
        <div className="mt-1.5 pt-1.5 border-t border-[#2a3a4a]/50">
          <select
            value={command ?? "attack"}
            onChange={(e) => onCommandChange(e.target.value as CommandId)}
            className="w-full bg-[#0a0a15] border border-[#2a3a4a] text-[var(--game-text)] text-xs px-1.5 py-1 focus:border-[var(--game-gold)] outline-none"
          >
            {COMMAND_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function CombatEndView({ state, onClose }: { state: ArmyCombatState; onClose: () => void }) {
  const isVictory = state.status === "victory";
  const isRetreat = state.status === "retreat";

  return (
    <div className="text-center space-y-3">
      <h3
        className={`font-display text-2xl ${
          isVictory
            ? "text-[var(--game-gold)]"
            : isRetreat
              ? "text-[var(--game-text-muted)]"
              : "text-[var(--game-red)]"
        }`}
      >
        {isVictory ? "战斗胜利" : isRetreat ? "成功撤退" : "战斗失败"}
      </h3>

      {/* Rewards */}
      {isVictory && state.rewards && (
        <div className="space-y-1">
          <div className="flex gap-4 justify-center text-sm">
            {state.rewards.gold && (
              <span className="text-[var(--game-gold)]">🪙 +{state.rewards.gold}</span>
            )}
            {state.rewards.exp && (
              <span className="text-[#9b59b6]">✨ +{state.rewards.exp} EXP</span>
            )}
          </div>
          {state.rewards.items && state.rewards.items.length > 0 && (
            <div className="text-xs text-[var(--game-text-dim)]">
              获得: {state.rewards.items.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Casualty summary */}
      <div className="flex gap-4 justify-center text-xs text-[var(--game-text-dim)]">
        {state.playerUnits.map((unit) => (
          <span key={unit.id}>
            {unit.name}: {unit.count}/{unit.maxCount}
          </span>
        ))}
      </div>

      <button
        onClick={onClose}
        className="px-6 py-2 bg-[var(--game-gold)] text-[var(--game-bg)] font-bold hover:bg-[#ddb52f] transition-colors"
      >
        确认
      </button>
    </div>
  );
}
