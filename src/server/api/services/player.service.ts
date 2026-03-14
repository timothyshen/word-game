/**
 * Player Service — business logic for player management
 */
import { TRPCError } from "@trpc/server";
import type { Player } from "../../../../generated/prisma";
import { engine, ruleService } from "~/server/api/engine";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import {
  findPlayerByUserId,
  findPlayerWithProfession,
  findPlayerWithFullDetails,
  createPlayer,
  updatePlayer,
  findBuildingTemplateByName,
  findCharacterTemplateByName,
  findCardsByNames,
  findActionLogs,
  createActionLog,
} from "../repositories/player.repo";
import { addCardEntity } from "../utils/card-entity-utils";
import { createBuildingEntity } from "../utils/building-utils";
import { findPlayerCards } from "../repositories/card.repo";
import { findPlayerCharacters } from "../repositories/character.repo";
import { findPlayerBuildings } from "../repositories/building.repo";
import { upsertUnlockFlag } from "../repositories/card.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { getCharacterTemplateId } from "../utils/character-utils";
import { computeHints } from "./hint.service";

// ── Formula helper ──

async function calcFormula(ruleName: string, vars: Record<string, number>): Promise<number> {
  const formula = await ruleService.getFormula(ruleName);
  return engine.formulas.calculate(formula, vars);
}

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

export async function getOrCreatePlayer(db: FullDbClient, entities: IEntityManager, userId: string, name: string) {
  let player = await findPlayerWithProfession(db, userId);

  if (!player) {
    player = await createPlayer(db, {
      userId,
      name,
      title: "领主",
      lastSettlementDay: getCurrentGameDay(),
      gold: 500,
      wood: 200,
      stone: 100,
      food: 300,
      stamina: 100,
      maxStamina: 100,
      staminaPerMin: 0.2,
      strength: 10,
      agility: 10,
      intellect: 10,
      charisma: 14,
    });

    await initializePlayerBuildings(db, entities, player.id);
    await initializePlayerCharacter(db, entities, player.id);
    await initializePlayerCards(db, entities, player.id);

    await upsertUnlockFlag(db, player.id, "building_system");
    await upsertUnlockFlag(db, player.id, "card_system");
  }

  // Calculate real-time stamina
  const { stamina, shouldUpdate } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );
  if (shouldUpdate) {
    await updatePlayer(db, player.id, { stamina, lastStaminaUpdate: new Date() });
    player.stamina = stamina;
  }

  const skillSlots = await calcFormula("player_skill_slots", { tier: player.tier });
  return { ...player, skillSlots, currentGameDay: getCurrentGameDay() };
}

async function initializePlayerBuildings(db: FullDbClient, entities: IEntityManager, playerId: string) {
  const mainCastle = await findBuildingTemplateByName(db, "主城堡");
  if (mainCastle) {
    await createBuildingEntity(db, entities, playerId, { buildingId: mainCastle.id, level: 1, positionX: 0, positionY: 0 });
  }
  const farmland = await findBuildingTemplateByName(db, "农田");
  if (farmland) {
    await createBuildingEntity(db, entities, playerId, { buildingId: farmland.id, level: 1, positionX: 1, positionY: 0 });
  }
}

async function initializePlayerCharacter(db: FullDbClient, entities: IEntityManager, playerId: string) {
  const lordCharacter = await findCharacterTemplateByName(db, "流浪剑士");
  if (lordCharacter) {
    const templateId = await getCharacterTemplateId(db, entities);
    await entities.createEntity(templateId, playerId, {
      characterId: lordCharacter.id,
      level: 1,
      exp: 0,
      maxLevel: 10,
      tier: 1,
      hp: lordCharacter.baseHp,
      maxHp: lordCharacter.baseHp,
      mp: lordCharacter.baseMp,
      maxMp: lordCharacter.baseMp,
      attack: lordCharacter.baseAttack,
      defense: lordCharacter.baseDefense,
      speed: lordCharacter.baseSpeed,
      luck: lordCharacter.baseLuck,
      status: "idle",
      workingAt: null,
    });
  }
}

async function initializePlayerCards(db: FullDbClient, entities: IEntityManager, playerId: string) {
  const starterCards = await findCardsByNames(db, ["回复药水", "经验书"]);
  for (const card of starterCards) {
    await addCardEntity(db, entities, playerId, card.id, 3);
  }
}

// ── Status ──

export async function getPlayerStatus(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await findPlayerWithFullDetails(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const { stamina } = calculateCurrentStamina(
    player.stamina, player.maxStamina, player.staminaPerMin, player.lastStaminaUpdate,
  );

  const currentGameDay = getCurrentGameDay();

  // Load buildings from entity system
  const buildingEntities = await findPlayerBuildings(db, entities, player.id);
  const buildings = buildingEntities.map(b => ({
    id: b.id,
    buildingId: b.buildingId,
    level: b.level,
    positionX: b.positionX,
    positionY: b.positionY,
    assignedCharId: b.assignedCharId,
    building: b.building,
  }));

  // Load characters and cards from entity system
  const characters = await findPlayerCharacters(db, entities, player.id);
  const playerCards = await findPlayerCards(db, entities, player.id);
  const buildingCardCount = playerCards.filter(c => c.card.type === "building" && c.quantity > 0).length;
  const recruitCardCount = playerCards.filter(c => c.card.type === "recruit" && c.quantity > 0).length;
  const idleBuildingCount = buildings.filter(b => !b.assignedCharId).length;

  const skillSlots = await calcFormula("player_skill_slots", { tier: player.tier });
  return {
    ...player,
    buildings,
    characters,
    cards: playerCards,
    stamina,
    skillSlots,
    currentGameDay,
    unlockedSystems: player.unlockFlags.map(f => f.flagName),
    hints: computeHints({
      ...player,
      characterCount: characters.length,
      buildingCardCount,
      recruitCardCount,
      idleBuildingCount,
    }, currentGameDay),
  };
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

  const expNeeded = Math.floor(await calcFormula("player_exp_required", { level: player.level }));
  if (player.exp < expNeeded) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `经验不足，需要 ${expNeeded}，当前 ${player.exp}` });
  }

  const maxLevelForTier = await calcFormula("player_max_level", { tier: player.tier });
  if (player.level >= maxLevelForTier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已达当前职阶等级上限，请先突破" });
  }

  const statGrowth = await calcFormula("player_stat_growth", { level: player.level });
  const staminaConfig = await ruleService.getConfig<{ value: number }>("player_stamina_per_level");
  const staminaPerLevel = staminaConfig.value;
  const newMaxStamina = player.maxStamina + staminaPerLevel;
  const newLevel = player.level + 1;
  const charismaGrowth = await calcFormula("player_charisma_growth", { statGrowth });

  await updatePlayer(db, player.id, {
    level: { increment: 1 },
    exp: { decrement: expNeeded },
    strength: { increment: statGrowth },
    agility: { increment: statGrowth },
    intellect: { increment: statGrowth },
    charisma: { increment: charismaGrowth },
    maxStamina: { increment: staminaPerLevel },
    stamina: newMaxStamina,
    lastStaminaUpdate: new Date(),
  });

  if (newLevel >= 5) {
    await upsertUnlockFlag(db, player.id, "progression_system");
  }

  return {
    success: true,
    newLevel,
    expUsed: expNeeded,
    remainingExp: player.exp - expNeeded,
    newStats: {
      strength: player.strength + statGrowth,
      agility: player.agility + statGrowth,
      intellect: player.intellect + statGrowth,
      charisma: player.charisma + charismaGrowth,
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
  const expNeeded = Math.floor(await calcFormula("player_exp_required", { level: player.level }));
  const maxLevelForTier = await calcFormula("player_max_level", { tier: player.tier });

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
