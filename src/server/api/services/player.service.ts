/**
 * Player Service — business logic for player management
 */
import { TRPCError } from "@trpc/server";
import type { Player } from "../../../../generated/prisma";
import type { FullDbClient } from "../repositories/types";
import {
  findPlayerByUserId,
  findPlayerWithProfession,
  findPlayerWithFullDetails,
  createPlayer,
  updatePlayer,
  findBuildingTemplateByName,
  createPlayerBuilding,
  findCharacterTemplateByName,
  createPlayerCharacter,
  findCardsByNames,
  createPlayerCard,
  findActionLogs,
  createActionLog,
} from "../repositories/player.repo";
import { getCurrentGameDay } from "../utils/game-time";

// ── Stamina ──

export function calculateCurrentStamina(
  lastStamina: number,
  maxStamina: number,
  staminaPerMin: number,
  lastUpdate: Date,
): { stamina: number; shouldUpdate: boolean } {
  const now = new Date();
  const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  const regenerated = Math.floor(minutesPassed * staminaPerMin);
  if (regenerated <= 0) return { stamina: lastStamina, shouldUpdate: false };
  const newStamina = Math.min(lastStamina + regenerated, maxStamina);
  return { stamina: newStamina, shouldUpdate: newStamina !== lastStamina };
}

// ── Player CRUD ──

export async function getPlayerOrThrow(db: FullDbClient, userId: string): Promise<Player> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getOrCreatePlayer(db: FullDbClient, userId: string, name: string) {
  let player = await findPlayerWithProfession(db, userId);

  if (!player) {
    player = await createPlayer(db, {
      userId,
      name,
      title: "领主",
      lastSettlementDay: getCurrentGameDay() - 1,
      gold: 500,
      wood: 200,
      stone: 100,
      food: 300,
      stamina: 100,
      maxStamina: 100,
      strength: 10,
      agility: 10,
      intellect: 10,
      charisma: 14,
    });

    await initializePlayerBuildings(db, player.id);
    await initializePlayerCharacter(db, player.id);
    await initializePlayerCards(db, player.id);
  }

  // Calculate real-time stamina
  const { stamina, shouldUpdate } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );
  if (shouldUpdate) {
    await updatePlayer(db, player.id, { stamina, lastStaminaUpdate: new Date() });
    player.stamina = stamina;
  }

  return { ...player, skillSlots: player.tier * 6, currentGameDay: getCurrentGameDay() };
}

async function initializePlayerBuildings(db: FullDbClient, playerId: string) {
  const mainCastle = await findBuildingTemplateByName(db, "主城堡");
  if (mainCastle) {
    await createPlayerBuilding(db, { playerId, buildingId: mainCastle.id, level: 1, positionX: 0, positionY: 0 });
  }
  const farmland = await findBuildingTemplateByName(db, "农田");
  if (farmland) {
    await createPlayerBuilding(db, { playerId, buildingId: farmland.id, level: 1, positionX: 1, positionY: 0 });
  }
}

async function initializePlayerCharacter(db: FullDbClient, playerId: string) {
  const lordCharacter = await findCharacterTemplateByName(db, "流浪剑士");
  if (lordCharacter) {
    await createPlayerCharacter(db, {
      playerId,
      characterId: lordCharacter.id,
      level: 1,
      tier: 1,
      hp: lordCharacter.baseHp,
      maxHp: lordCharacter.baseHp,
      mp: lordCharacter.baseMp,
      maxMp: lordCharacter.baseMp,
      attack: lordCharacter.baseAttack,
      defense: lordCharacter.baseDefense,
      speed: lordCharacter.baseSpeed,
      luck: lordCharacter.baseLuck,
    });
  }
}

async function initializePlayerCards(db: FullDbClient, playerId: string) {
  const starterCards = await findCardsByNames(db, ["回复药水", "经验书"]);
  for (const card of starterCards) {
    await createPlayerCard(db, { playerId, cardId: card.id, quantity: 3 });
  }
}

// ── Status ──

export async function getPlayerStatus(db: FullDbClient, userId: string) {
  const player = await findPlayerWithFullDetails(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const { stamina } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );

  return { ...player, stamina, skillSlots: player.tier * 6, currentGameDay: getCurrentGameDay() };
}

// ── Stamina consumption ──

export async function consumeStamina(db: FullDbClient, userId: string, amount: number) {
  const player = await getPlayerOrThrow(db, userId);
  const { stamina: currentStamina } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );
  if (currentStamina < amount) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }
  const newStamina = currentStamina - amount;
  await updatePlayer(db, player.id, { stamina: newStamina, lastStaminaUpdate: new Date() });
  return { stamina: newStamina, consumed: amount };
}

// ── Today's actions ──

export async function getTodayActions(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const currentDay = getCurrentGameDay();
  const actions = await findActionLogs(db, player.id, { day: currentDay });
  return { day: currentDay, actions, totalScore: player.currentDayScore };
}

// ── Level up ──

export async function levelUp(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
  if (player.exp < expNeeded) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `经验不足，需要 ${expNeeded}，当前 ${player.exp}` });
  }

  const maxLevelForTier = player.tier * 20;
  if (player.level >= maxLevelForTier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已达当前职阶等级上限，请先突破" });
  }

  const statGrowth = Math.floor(player.level * 0.5) + 1;
  const newMaxStamina = player.maxStamina + 5;
  const newLevel = player.level + 1;

  await updatePlayer(db, player.id, {
    level: { increment: 1 },
    exp: { decrement: expNeeded },
    strength: { increment: statGrowth },
    agility: { increment: statGrowth },
    intellect: { increment: statGrowth },
    charisma: { increment: Math.ceil(statGrowth * 0.5) },
    maxStamina: { increment: 5 },
    stamina: newMaxStamina,
    lastStaminaUpdate: new Date(),
  });

  return {
    success: true,
    newLevel,
    expUsed: expNeeded,
    remainingExp: player.exp - expNeeded,
    newStats: {
      strength: player.strength + statGrowth,
      agility: player.agility + statGrowth,
      intellect: player.intellect + statGrowth,
      charisma: player.charisma + Math.ceil(statGrowth * 0.5),
      maxStamina: newMaxStamina,
    },
    message: `升级成功！达到 ${newLevel} 级`,
  };
}

// ── Update stats ──

export async function updateStats(
  db: FullDbClient,
  userId: string,
  input: { strength?: number; agility?: number; intellect?: number; charisma?: number },
) {
  const player = await getPlayerOrThrow(db, userId);
  const updates: Record<string, number> = {};

  if (input.strength !== undefined) updates.strength = Math.max(1, player.strength + input.strength);
  if (input.agility !== undefined) updates.agility = Math.max(1, player.agility + input.agility);
  if (input.intellect !== undefined) updates.intellect = Math.max(1, player.intellect + input.intellect);
  if (input.charisma !== undefined) updates.charisma = Math.max(1, player.charisma + input.charisma);

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "没有要更新的属性" };
  }

  const updated = await updatePlayer(db, player.id, updates);
  return {
    success: true,
    stats: {
      strength: updated.strength,
      agility: updated.agility,
      intellect: updated.intellect,
      charisma: updated.charisma,
    },
  };
}

// ── Level up info ──

export async function getLevelUpInfo(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
  const maxLevelForTier = player.tier * 20;

  return {
    currentLevel: player.level,
    currentExp: player.exp,
    expNeeded,
    progress: Math.min(100, Math.floor((player.exp / expNeeded) * 100)),
    canLevelUp: player.exp >= expNeeded && player.level < maxLevelForTier,
    maxLevelForTier,
    isAtMaxLevel: player.level >= maxLevelForTier,
    tier: player.tier,
  };
}

// ── Combat/gold tracking ──

export async function recordCombatWin(db: FullDbClient, userId: string, isBoss: boolean) {
  const player = await getPlayerOrThrow(db, userId);
  const updates: Record<string, { increment: number }> = { combatWins: { increment: 1 } };
  if (isBoss) updates.bossKills = { increment: 1 };
  const updated = await updatePlayer(db, player.id, updates);
  return { success: true, combatWins: updated.combatWins, bossKills: updated.bossKills };
}

export async function recordGoldEarned(db: FullDbClient, userId: string, amount: number) {
  const player = await getPlayerOrThrow(db, userId);
  const updated = await updatePlayer(db, player.id, { totalGoldEarned: { increment: amount } });
  return { success: true, totalGoldEarned: updated.totalGoldEarned };
}

// ── Action logging (internal use) ──

export type ActionType = "build" | "explore" | "combat" | "upgrade" | "production" | "recruit";

export async function logAction(
  db: FullDbClient,
  playerId: string,
  type: ActionType,
  description: string,
  baseScore: number,
  bonus = 0,
  bonusReason?: string,
) {
  const currentDay = getCurrentGameDay();
  await createActionLog(db, {
    playerId,
    day: currentDay,
    type,
    description,
    baseScore,
    bonus,
    bonusReason: bonusReason ?? null,
  });
  await updatePlayer(db, playerId, { currentDayScore: { increment: baseScore + bonus } });
}
