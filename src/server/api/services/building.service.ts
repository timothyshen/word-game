/**
 * Building Service — building management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import {
  findPlayerBuildings,
  findPlayerBuildingById,
  updatePlayerBuildingLevel,
  updatePlayerBuildingAssignment,
  findAssignedCharacter,
  findCharacterWithTemplate,
  findAllPlayerCharacters,
  updateCharacterStatus,
  upsertEconomyLog,
} from "../repositories/building.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { engine, ruleService } from "~/server/api/engine";
import {
  parseBuildingEffects,
  calculateBuildingOutput as calcOutput,
  getUpgradeCost as calcUpgradeCost,
} from "~/shared/effects";

async function calcFormula(ruleName: string, vars: Record<string, number>): Promise<number> {
  const formula = await ruleService.getFormula(ruleName);
  return engine.formulas.calculate(formula, vars);
}

function getUpgradeCost(baseEffectsJson: string, slot: string, currentLevel: number) {
  return calcUpgradeCost(parseBuildingEffects(baseEffectsJson), slot, currentLevel);
}

function calculateBuildingOutput(baseEffectsJson: string, level: number, hasWorker: boolean) {
  return calcOutput(parseBuildingEffects(baseEffectsJson), level, hasWorker);
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllBuildings(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const buildings = await findPlayerBuildings(db, player.id);

  return buildings.map((pb) => ({
    ...pb,
    upgradeCost: getUpgradeCost(pb.building.baseEffects, pb.building.slot, pb.level),
    canUpgrade: pb.level < pb.building.maxLevel,
    dailyOutput: calculateBuildingOutput(pb.building.baseEffects, pb.level, !!pb.assignedCharId),
  }));
}

export async function getBuildingById(db: FullDbClient, userId: string, buildingId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const building = await findPlayerBuildingById(db, buildingId, player.id);
  if (!building) throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });

  let assignedCharacter = null;
  if (building.assignedCharId) {
    assignedCharacter = await findAssignedCharacter(db, building.assignedCharId);
  }

  return {
    ...building,
    upgradeCost: getUpgradeCost(building.building.baseEffects, building.building.slot, building.level),
    canUpgrade: building.level < building.building.maxLevel,
    dailyOutput: calculateBuildingOutput(building.building.baseEffects, building.level, !!building.assignedCharId),
    assignedCharacter,
  };
}

export async function upgradeBuilding(db: FullDbClient, userId: string, buildingId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const playerBuilding = await findPlayerBuildingById(db, buildingId, player.id);
  if (!playerBuilding) throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
  if (playerBuilding.level >= playerBuilding.building.maxLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "建筑已达最高等级" });
  }

  const cost = getUpgradeCost(playerBuilding.building.baseEffects, playerBuilding.building.slot, playerBuilding.level);
  if (player.gold < cost.gold) throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${cost.gold}` });
  if (player.wood < cost.wood) throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${cost.wood}` });
  if (player.stone < cost.stone) throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${cost.stone}` });

  await updatePlayer(db, player.id, {
    gold: { decrement: cost.gold },
    wood: { decrement: cost.wood },
    stone: { decrement: cost.stone },
  });

  const newLevel = playerBuilding.level + 1;
  const updated = await updatePlayerBuildingLevel(db, playerBuilding.id, newLevel);

  const baseScore = await calcFormula("building_upgrade_score", { level: newLevel });
  await createActionLog(db, {
    playerId: player.id,
    day: getCurrentGameDay(),
    type: "upgrade",
    description: `将${playerBuilding.building.name}升级到${newLevel}级`,
    baseScore,
    bonus: 0,
    bonusReason: null,
  });
  await updatePlayer(db, player.id, { currentDayScore: { increment: baseScore } });

  return {
    upgraded: true,
    buildingName: playerBuilding.building.name,
    newLevel,
    cost,
    newOutput: calculateBuildingOutput(updated.building.baseEffects, newLevel, !!updated.assignedCharId),
  };
}

export async function assignCharacter(
  db: FullDbClient,
  userId: string,
  buildingId: string,
  characterId: string | null,
) {
  const player = await getPlayerOrThrow(db, userId);

  const playerBuilding = await findPlayerBuildingById(db, buildingId, player.id);
  if (!playerBuilding) throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });

  if (characterId === null) {
    if (playerBuilding.assignedCharId) {
      await updateCharacterStatus(db, playerBuilding.assignedCharId, "idle", null);
    }
    await updatePlayerBuildingAssignment(db, playerBuilding.id, { assignedCharId: null, status: "idle" });
    return { assigned: false, message: "已取消角色分配" };
  }

  const character = await findCharacterWithTemplate(db, characterId, player.id);
  if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  if (character.status === "working") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "角色正在其他地方工作" });
  }

  if (playerBuilding.assignedCharId && playerBuilding.assignedCharId !== characterId) {
    await updateCharacterStatus(db, playerBuilding.assignedCharId, "idle", null);
  }

  await updatePlayerBuildingAssignment(db, playerBuilding.id, { assignedCharId: characterId, status: "working" });
  await updateCharacterStatus(db, character.id, "working", playerBuilding.building.name);

  return { assigned: true, characterName: character.character.name, buildingName: playerBuilding.building.name };
}

export async function calculateDailyOutput(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const buildings = await findPlayerBuildings(db, player.id);

  const totalOutput: Record<string, number> = { gold: 0, wood: 0, stone: 0, food: 0, crystals: 0 };
  const breakdown: Array<{ buildingName: string; icon: string; level: number; hasWorker: boolean; output: Record<string, number> }> = [];

  for (const pb of buildings) {
    const output = calculateBuildingOutput(pb.building.baseEffects, pb.level, !!pb.assignedCharId);
    if (Object.keys(output).length > 0) {
      breakdown.push({ buildingName: pb.building.name, icon: pb.building.icon, level: pb.level, hasWorker: !!pb.assignedCharId, output });
      for (const [resource, amount] of Object.entries(output)) {
        totalOutput[resource] = (totalOutput[resource] ?? 0) + amount;
      }
    }
  }

  const characters = await findAllPlayerCharacters(db, player.id);
  const foodConfig = await ruleService.getConfig<{ value: number }>("building_food_consumption");
  const consumption: Record<string, number> = { food: characters.length * foodConfig.value };
  const netOutput: Record<string, number> = {};
  for (const resource of Object.keys(totalOutput)) {
    netOutput[resource] = (totalOutput[resource] ?? 0) - (consumption[resource] ?? 0);
  }

  return { totalOutput, consumption, netOutput, breakdown };
}

export async function collectDailyOutput(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const buildings = await findPlayerBuildings(db, player.id);

  const totalOutput: Record<string, number> = { gold: 0, wood: 0, stone: 0, food: 0 };
  for (const pb of buildings) {
    const output = calculateBuildingOutput(pb.building.baseEffects, pb.level, !!pb.assignedCharId);
    for (const [resource, amount] of Object.entries(output)) {
      totalOutput[resource] = (totalOutput[resource] ?? 0) + amount;
    }
  }

  const characters = await findAllPlayerCharacters(db, player.id);
  const foodConfig = await ruleService.getConfig<{ value: number }>("building_food_consumption");
  const foodConsumption = characters.length * foodConfig.value;

  await updatePlayer(db, player.id, {
    gold: { increment: totalOutput.gold ?? 0 },
    wood: { increment: totalOutput.wood ?? 0 },
    stone: { increment: totalOutput.stone ?? 0 },
    food: Math.max(0, player.food + (totalOutput.food ?? 0) - foodConsumption),
  });

  const currentDay = getCurrentGameDay();
  await upsertEconomyLog(db, player.id, currentDay, {
    goldIncome: totalOutput.gold ?? 0,
    woodIncome: totalOutput.wood ?? 0,
    stoneIncome: totalOutput.stone ?? 0,
    foodIncome: totalOutput.food ?? 0,
    foodExpense: foodConsumption,
  });

  let productionScore = 0;
  for (const v of Object.values(totalOutput)) {
    productionScore += await calcFormula("building_production_score", { totalOutput: v });
  }
  if (productionScore > 0) {
    await createActionLog(db, {
      playerId: player.id,
      day: currentDay,
      type: "production",
      description: "建筑每日产出",
      baseScore: productionScore,
      bonus: 0,
      bonusReason: null,
    });
    await updatePlayer(db, player.id, { currentDayScore: { increment: productionScore } });
  }

  return { collected: true, output: totalOutput, consumption: { food: foodConsumption } };
}
