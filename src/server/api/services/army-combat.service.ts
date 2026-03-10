/**
 * Army Combat Service — turn-based army battles with troop command
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import * as armyRepo from "../repositories/army.repo";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import type { FormationSlot } from "./army.service";

// ── Types ──

export interface ArmyUnit {
  id: string;
  troopTypeId: string;
  name: string;
  category: string;
  tier: number;
  icon: string;
  count: number;
  maxCount: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  level: number;
  heroId?: string;
  heroName?: string;
  heroSkills?: string[];
  side: "player" | "enemy";
  order?: ArmyCommand;
}

export type ArmyCommand = "attack" | "defend" | "charge" | "flank" | "retreat";

export interface ArmyCombatState {
  playerUnits: ArmyUnit[];
  enemyUnits: ArmyUnit[];
  turn: number;
  phase: "command" | "resolution" | "finished";
  status: "active" | "victory" | "defeat";
  logs: ArmyCombatLog[];
}

export interface ArmyCombatLog {
  turn: number;
  message: string;
  type: "command" | "combat" | "casualty" | "hero" | "system";
}

// ── Command Effects ──
// attack: normal damage
// defend: -50% damage dealt, +50% defense
// charge: +80% damage, -50% defense (risky)
// flank: ignores 50% defense, but takes +30% from others
// retreat: unit withdraws, takes no damage but deals none

const COMMAND_MODIFIERS: Record<ArmyCommand, { atkMult: number; defMult: number; special: string }> = {
  attack:  { atkMult: 1.0, defMult: 1.0, special: "" },
  defend:  { atkMult: 0.5, defMult: 1.5, special: "counter" },
  charge:  { atkMult: 1.8, defMult: 0.5, special: "" },
  flank:   { atkMult: 1.3, defMult: 0.7, special: "ignore_def" },
  retreat: { atkMult: 0.0, defMult: 999, special: "retreat" },
};

// ── Enemy Templates ──

interface EnemyTemplate {
  name: string;
  category: string;
  icon: string;
  tier: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
}

const ENEMY_TEMPLATES: EnemyTemplate[] = [
  { name: "野狼群", category: "cavalry", icon: "🐺", tier: 1, baseHp: 80, baseAtk: 12, baseDef: 3, baseSpd: 8 },
  { name: "流寇弓手", category: "archer", icon: "🏹", tier: 1, baseHp: 60, baseAtk: 15, baseDef: 2, baseSpd: 6 },
  { name: "山贼步兵", category: "infantry", icon: "⚔️", tier: 1, baseHp: 100, baseAtk: 10, baseDef: 8, baseSpd: 4 },
  { name: "暗影法师", category: "mage", icon: "🧙", tier: 2, baseHp: 70, baseAtk: 20, baseDef: 3, baseSpd: 5 },
  { name: "攻城车", category: "siege", icon: "🏗️", tier: 2, baseHp: 200, baseAtk: 25, baseDef: 15, baseSpd: 2 },
  { name: "精锐骑兵", category: "cavalry", icon: "🐴", tier: 2, baseHp: 120, baseAtk: 18, baseDef: 6, baseSpd: 10 },
  { name: "皇家卫队", category: "infantry", icon: "🛡️", tier: 3, baseHp: 150, baseAtk: 16, baseDef: 14, baseSpd: 5 },
  { name: "龙骑士", category: "cavalry", icon: "🐉", tier: 4, baseHp: 200, baseAtk: 30, baseDef: 12, baseSpd: 12 },
];

// ── Start Combat ──

/**
 * Start army combat
 */
export async function startArmyCombat(
  db: FullDbClient,
  userId: string,
  enemyLevel: number,
): Promise<{ combatId: string; state: ArmyCombatState }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Check for existing active combat
  const activeCombat = await armyRepo.getActiveArmyCombat(db, player.id);
  if (activeCombat) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "已有进行中的军团战斗，请先完成当前战斗",
    });
  }

  // Load player formation
  const army = await armyRepo.getArmy(db, player.id);
  if (!army) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "尚未编制军团，请先设置编队",
    });
  }

  const formation = JSON.parse(army.formation) as FormationSlot[];
  if (formation.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "编队为空，请先配置部队",
    });
  }

  // Load troop data to build player units
  const playerTroops = await armyRepo.getPlayerTroops(db, player.id);
  const troopMap = new Map(playerTroops.map((t) => [t.troopTypeId, t]));

  const playerUnits: ArmyUnit[] = formation.map((slot, idx) => {
    const troop = troopMap.get(slot.troopTypeId);
    const tt = troop?.troopType;
    const level = troop?.level ?? 1;
    const levelMult = 1 + (level - 1) * 0.1;
    return {
      id: `player_${idx}`,
      troopTypeId: slot.troopTypeId,
      name: slot.troopTypeName || tt?.name || "未知部队",
      category: slot.troopCategory || tt?.category || "infantry",
      tier: tt?.tier ?? 1,
      icon: tt?.icon ?? "⚔️",
      count: Math.min(slot.count, troop?.count ?? 0),
      maxCount: Math.min(slot.count, troop?.count ?? 0),
      hp: Math.floor((tt?.baseHp ?? 100) * levelMult),
      atk: Math.floor((tt?.baseAtk ?? 10) * levelMult),
      def: Math.floor((tt?.baseDef ?? 5) * levelMult),
      spd: Math.floor((tt?.baseSpd ?? 5) * levelMult),
      level,
      heroId: slot.heroEntityId,
      side: "player" as const,
    };
  });

  // Validate at least one unit has troops
  if (playerUnits.every((u) => u.count <= 0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "编队中没有可用部队",
    });
  }

  // Generate enemy army
  const enemyUnits = generateEnemyArmy(enemyLevel);

  const state: ArmyCombatState = {
    playerUnits,
    enemyUnits,
    turn: 1,
    phase: "command",
    status: "active",
    logs: [
      {
        turn: 0,
        message: `军团战斗开始！敌方等级 ${enemyLevel}`,
        type: "system",
      },
    ],
  };

  const combat = await armyRepo.createArmyCombat(db, {
    playerId: player.id,
    combatType: "field",
    combatState: JSON.stringify(state),
    logs: JSON.stringify(state.logs),
  });

  return { combatId: combat.id, state };
}

// ── Issue Commands ──

/**
 * Issue commands for a turn
 */
export async function issueCommands(
  db: FullDbClient,
  userId: string,
  combatId: string,
  commands: Array<{ unitId: string; command: ArmyCommand; targetId?: string }>,
): Promise<{ state: ArmyCombatState }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const combat = await armyRepo.getActiveArmyCombat(db, player.id);
  if (!combat || combat.id !== combatId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在或已结束" });
  }

  const state = JSON.parse(combat.combatState) as ArmyCombatState;
  if (state.status !== "active") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });
  }
  if (state.phase !== "command") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "当前不是指令阶段" });
  }

  // Assign commands to player units
  const commandMap = new Map(commands.map((c) => [c.unitId, c]));
  for (const unit of state.playerUnits) {
    if (unit.count <= 0) continue;
    const cmd = commandMap.get(unit.id);
    unit.order = cmd?.command ?? "attack";
  }

  // Generate enemy AI commands
  generateEnemyCommands(state);

  // Resolve turn
  state.phase = "resolution";
  resolveArmyTurn(state);

  // Check win/lose
  const playerAlive = state.playerUnits.some((u) => u.count > 0);
  const enemyAlive = state.enemyUnits.some((u) => u.count > 0);

  if (!enemyAlive) {
    state.status = "victory";
    state.phase = "finished";
    state.logs.push({
      turn: state.turn,
      message: "战斗胜利！敌军全灭！",
      type: "system",
    });
  } else if (!playerAlive) {
    state.status = "defeat";
    state.phase = "finished";
    state.logs.push({
      turn: state.turn,
      message: "战斗失败，我军全灭...",
      type: "system",
    });
  } else {
    // Next turn
    state.turn += 1;
    state.phase = "command";
    // Reset orders
    for (const unit of [...state.playerUnits, ...state.enemyUnits]) {
      unit.order = undefined;
    }
  }

  // Determine final status string for DB
  const dbStatus = state.status === "active" ? "active" : state.status;

  await armyRepo.updateArmyCombat(db, combatId, {
    combatState: JSON.stringify(state),
    logs: JSON.stringify(state.logs),
    status: dbStatus,
  });

  // If victory, grant rewards
  if (state.status === "victory") {
    await grantVictoryRewards(db, player.id, state);
  }

  return { state };
}

// ── Hero Skill ──

/**
 * Use hero skill during army combat
 */
export async function useHeroSkill(
  db: FullDbClient,
  userId: string,
  combatId: string,
  heroId: string,
  skillName: string,
): Promise<{ state: ArmyCombatState }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const combat = await armyRepo.getActiveArmyCombat(db, player.id);
  if (!combat || combat.id !== combatId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在或已结束" });
  }

  const state = JSON.parse(combat.combatState) as ArmyCombatState;
  if (state.status !== "active") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });
  }

  // Find the unit led by this hero
  const unit = state.playerUnits.find((u) => u.heroId === heroId && u.count > 0);
  if (!unit) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "未找到该英雄所率领的部队" });
  }

  // Apply hero skill effects
  switch (skillName) {
    case "rally": {
      // Rally: restore 20% of lost troops
      const lost = unit.maxCount - unit.count;
      const restored = Math.max(1, Math.floor(lost * 0.2));
      unit.count = Math.min(unit.maxCount, unit.count + restored);
      state.logs.push({
        turn: state.turn,
        message: `${unit.heroName ?? "英雄"} 发动鼓舞，恢复 ${restored} 名士兵`,
        type: "hero",
      });
      break;
    }
    case "inspire": {
      // Inspire: +50% ATK for this turn
      unit.atk = Math.floor(unit.atk * 1.5);
      state.logs.push({
        turn: state.turn,
        message: `${unit.heroName ?? "英雄"} 激励部队，攻击力大幅提升！`,
        type: "hero",
      });
      break;
    }
    case "fortify": {
      // Fortify: +80% DEF for this turn
      unit.def = Math.floor(unit.def * 1.8);
      state.logs.push({
        turn: state.turn,
        message: `${unit.heroName ?? "英雄"} 加固防御，防御力大幅提升！`,
        type: "hero",
      });
      break;
    }
    default: {
      throw new TRPCError({ code: "BAD_REQUEST", message: `未知技能: ${skillName}` });
    }
  }

  await armyRepo.updateArmyCombat(db, combatId, {
    combatState: JSON.stringify(state),
    logs: JSON.stringify(state.logs),
  });

  return { state };
}

// ── Combat Resolution ──

function resolveArmyTurn(state: ArmyCombatState): void {
  // Sort all units by speed (descending)
  const allUnits = [...state.playerUnits, ...state.enemyUnits].filter((u) => u.count > 0);
  allUnits.sort((a, b) => b.spd - a.spd);

  for (const unit of allUnits) {
    if (unit.count <= 0) continue;
    const command = unit.order ?? "attack";
    const mods = COMMAND_MODIFIERS[command];

    if (mods.special === "retreat") {
      state.logs.push({ turn: state.turn, message: `${unit.name} 部队撤退`, type: "command" });
      continue;
    }

    // Find target (enemy side, first alive unit)
    const enemies = unit.side === "player" ? state.enemyUnits : state.playerUnits;
    const target = enemies.find((e) => e.count > 0);
    if (!target) continue;

    const targetCommand = target.order ?? "attack";
    const targetMods = COMMAND_MODIFIERS[targetCommand];

    // Calculate damage
    let effectiveAtk = unit.atk * unit.count * mods.atkMult;
    let effectiveDef = target.def * target.count * targetMods.defMult;

    // Counter system
    const counter = getCounterMultiplier(unit.category, target.category);
    effectiveAtk *= counter;

    // Flank ignores 50% defense
    if (mods.special === "ignore_def") effectiveDef *= 0.5;

    const damage = Math.max(1, Math.floor(effectiveAtk - effectiveDef * 0.3));
    const casualties = Math.min(target.count, Math.max(1, Math.floor(damage / target.hp)));

    target.count -= casualties;
    state.logs.push({
      turn: state.turn,
      message: `${unit.name}(${translateCommand(command)}) → ${target.name}: 造成 ${damage} 伤害，歼灭 ${casualties} 人`,
      type: "combat",
    });

    if (target.count <= 0) {
      target.count = 0;
      state.logs.push({ turn: state.turn, message: `${target.name} 部队全灭！`, type: "casualty" });
    }
  }
}

function getCounterMultiplier(attackerCat: string, defenderCat: string): number {
  const counters: Record<string, string[]> = {
    infantry: ["archer"],
    archer: ["cavalry"],
    cavalry: ["infantry", "siege"],
    mage: ["infantry"],
    siege: ["fortification"],
  };
  if (counters[attackerCat]?.includes(defenderCat)) return 1.5;
  if (counters[defenderCat]?.includes(attackerCat)) return 0.7;
  return 1.0;
}

function translateCommand(command: ArmyCommand): string {
  const map: Record<ArmyCommand, string> = {
    attack: "进攻",
    defend: "防御",
    charge: "冲锋",
    flank: "迂回",
    retreat: "撤退",
  };
  return map[command];
}

// ── Enemy Generation ──

function generateEnemyArmy(level: number): ArmyUnit[] {
  // Number of units scales with level: 2 at low levels, up to 4 at high levels
  const unitCount = Math.min(4, 2 + Math.floor(level / 20));
  const levelMult = 1 + (level - 1) * 0.15;

  // Select templates based on level (higher level = higher tier allowed)
  const maxTier = Math.min(4, 1 + Math.floor(level / 15));
  const available = ENEMY_TEMPLATES.filter((t) => t.tier <= maxTier);

  const units: ArmyUnit[] = [];
  for (let i = 0; i < unitCount; i++) {
    const template = available[i % available.length]!;
    const troopCount = Math.max(5, Math.floor((10 + level * 2) * (0.8 + Math.random() * 0.4)));

    units.push({
      id: `enemy_${i}`,
      troopTypeId: `enemy_type_${i}`,
      name: template.name,
      category: template.category,
      tier: template.tier,
      icon: template.icon,
      count: troopCount,
      maxCount: troopCount,
      hp: Math.floor(template.baseHp * levelMult),
      atk: Math.floor(template.baseAtk * levelMult),
      def: Math.floor(template.baseDef * levelMult),
      spd: Math.floor(template.baseSpd * levelMult),
      level,
      side: "enemy" as const,
    });
  }

  return units;
}

function generateEnemyCommands(state: ArmyCombatState): void {
  const totalPlayerCount = state.playerUnits.reduce((s, u) => s + u.count, 0);
  const totalEnemyCount = state.enemyUnits.reduce((s, u) => s + u.count, 0);

  for (const unit of state.enemyUnits.filter((u) => u.count > 0)) {
    if (totalEnemyCount > totalPlayerCount * 1.3) {
      unit.order = "charge";
    } else if (totalEnemyCount < totalPlayerCount * 0.5) {
      unit.order = "defend";
    } else {
      unit.order = "attack";
    }
  }
}

// ── Victory Rewards ──

async function grantVictoryRewards(
  db: FullDbClient,
  playerId: string,
  state: ArmyCombatState,
): Promise<void> {
  // Calculate rewards based on enemies defeated
  const totalEnemyMaxCount = state.enemyUnits.reduce((s, u) => s + u.maxCount, 0);
  const avgTier = state.enemyUnits.length > 0
    ? state.enemyUnits.reduce((s, u) => s + u.tier, 0) / state.enemyUnits.length
    : 1;

  const goldReward = Math.floor(totalEnemyMaxCount * avgTier * 2);
  const expReward = Math.floor(totalEnemyMaxCount * avgTier * 1.5);

  await updatePlayer(db, playerId, {
    gold: { increment: goldReward },
    exp: { increment: expReward },
  });

  state.logs.push({
    turn: state.turn,
    message: `获得奖励: ${goldReward} 金币, ${expReward} 经验`,
    type: "system",
  });
}
