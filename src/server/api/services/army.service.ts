/**
 * Army Service — troop recruitment, management, and army composition
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import * as armyRepo from "../repositories/army.repo";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";

// ── Types ──

export interface FormationSlot {
  slotIndex: number;
  troopTypeId: string;
  troopTypeName: string;
  troopCategory: string;
  count: number;
  heroEntityId?: string;
  heroName?: string;
}

export interface TroopInfo {
  id: string;
  troopTypeId: string;
  name: string;
  category: string;
  tier: number;
  icon: string;
  count: number;
  maxCount: number;
  level: number;
  exp: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  counterInfo: { strong: string[]; weak: string[] };
}

// ── Cost table ──

const TIER_GOLD_COST: Record<number, number> = {
  1: 10,
  2: 25,
  3: 60,
  4: 150,
};

// ── Troop Types ──

/**
 * Get all troop types available for recruitment
 */
export async function getTroopTypes(db: FullDbClient): Promise<
  Array<{
    id: string;
    name: string;
    category: string;
    tier: number;
    icon: string;
    description: string;
    baseHp: number;
    baseAtk: number;
    baseDef: number;
    baseSpd: number;
    counterInfo: { strong: string[]; weak: string[] };
    requiredBuilding: string;
    goldCost: number;
  }>
> {
  const types = await armyRepo.getAllTroopTypes(db);
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    tier: t.tier,
    icon: t.icon,
    description: t.description,
    baseHp: t.baseHp,
    baseAtk: t.baseAtk,
    baseDef: t.baseDef,
    baseSpd: t.baseSpd,
    counterInfo: parseCounterInfo(t.counterInfo),
    requiredBuilding: t.requiredBuilding,
    goldCost: TIER_GOLD_COST[t.tier] ?? 10,
  }));
}

// ── Player Troops ──

/**
 * Get player's current troops with counts
 */
export async function getPlayerTroops(db: FullDbClient, userId: string): Promise<TroopInfo[]> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const troops = await armyRepo.getPlayerTroops(db, player.id);
  return troops.map((t) => ({
    id: t.id,
    troopTypeId: t.troopTypeId,
    name: t.troopType.name,
    category: t.troopType.category,
    tier: t.troopType.tier,
    icon: t.troopType.icon,
    count: t.count,
    maxCount: t.maxCount,
    level: t.level,
    exp: t.exp,
    baseHp: t.troopType.baseHp,
    baseAtk: t.troopType.baseAtk,
    baseDef: t.troopType.baseDef,
    baseSpd: t.troopType.baseSpd,
    counterInfo: parseCounterInfo(t.troopType.counterInfo),
  }));
}

// ── Recruitment ──

/**
 * Recruit troops — costs gold based on troop type tier
 */
export async function recruitTroops(
  db: FullDbClient,
  userId: string,
  troopTypeId: string,
  count: number,
): Promise<{ success: true; newCount: number }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const troopType = await armyRepo.getTroopTypeById(db, troopTypeId);
  if (!troopType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "兵种不存在" });
  }

  // Calculate cost
  const costPerUnit = TIER_GOLD_COST[troopType.tier] ?? 10;
  const totalCost = costPerUnit * count;

  if (player.gold < totalCost) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `金币不足，需要 ${totalCost} 金币（当前: ${player.gold}）`,
    });
  }

  // Check max count
  const existingTroop = await armyRepo.getPlayerTroop(db, player.id, troopTypeId);
  const currentCount = existingTroop?.count ?? 0;
  const maxCount = existingTroop?.maxCount ?? 50;
  if (currentCount + count > maxCount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `超出最大容量，当前 ${currentCount}/${maxCount}，无法再招募 ${count}`,
    });
  }

  // Transaction: deduct gold + upsert troop
  const result = await db.$transaction(async (tx) => {
    await updatePlayer(tx, player.id, { gold: { decrement: totalCost } });
    const troop = await armyRepo.upsertTroop(tx, player.id, troopTypeId, {
      count: currentCount + count,
    });
    return troop;
  });

  return { success: true, newCount: result.count };
}

// ── Formation ──

/**
 * Get army formation
 */
export async function getFormation(db: FullDbClient, userId: string): Promise<FormationSlot[]> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const army = await armyRepo.getArmy(db, player.id);
  if (!army) {
    return [];
  }

  const formation = JSON.parse(army.formation) as FormationSlot[];
  return formation;
}

/**
 * Set army formation — assign troops and heroes to slots
 */
export async function setFormation(
  db: FullDbClient,
  userId: string,
  slots: Array<{ slotIndex: number; troopTypeId: string; count: number; heroEntityId?: string }>,
): Promise<{ success: true }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Validate troop counts: aggregate by troopTypeId
  const troopCountMap = new Map<string, number>();
  for (const slot of slots) {
    const prev = troopCountMap.get(slot.troopTypeId) ?? 0;
    troopCountMap.set(slot.troopTypeId, prev + slot.count);
  }

  // Check each troop type has enough available
  const playerTroops = await armyRepo.getPlayerTroops(db, player.id);
  const troopMap = new Map(playerTroops.map((t) => [t.troopTypeId, t]));

  for (const [troopTypeId, neededCount] of troopCountMap) {
    const troop = troopMap.get(troopTypeId);
    if (!troop) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `未拥有兵种 ${troopTypeId}`,
      });
    }
    if (troop.count < neededCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${troop.troopType.name} 数量不足，需要 ${neededCount}（拥有 ${troop.count}）`,
      });
    }
  }

  // Build formation data with troop type info
  const formationData: FormationSlot[] = slots.map((slot) => {
    const troop = troopMap.get(slot.troopTypeId);
    return {
      slotIndex: slot.slotIndex,
      troopTypeId: slot.troopTypeId,
      troopTypeName: troop?.troopType.name ?? "",
      troopCategory: troop?.troopType.category ?? "",
      count: slot.count,
      heroEntityId: slot.heroEntityId,
    };
  });

  await armyRepo.upsertArmy(db, player.id, JSON.stringify(formationData));
  return { success: true };
}

// ── Helpers ──

function parseCounterInfo(raw: string): { strong: string[]; weak: string[] } {
  try {
    const parsed = JSON.parse(raw) as { strong?: string[]; weak?: string[] };
    return {
      strong: parsed.strong ?? [],
      weak: parsed.weak ?? [],
    };
  } catch {
    return { strong: [], weak: [] };
  }
}
