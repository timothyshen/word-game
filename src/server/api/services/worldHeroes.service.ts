// 英雄管理服务

import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { TRPCError } from "@trpc/server";
import { getInnerCityBonuses } from "./worldHelpers";
import { type CharacterEntity } from "../utils/character-utils";

const FOOD_COST = 10;
const BASE_STAMINA_RESTORE = 30;

export async function deploy(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // 检查角色是否属于玩家 (via Entity system)
  const charEntity = (await entities.getEntity(characterId)) as CharacterEntity | null;
  if (!charEntity || charEntity.ownerId !== player.id || charEntity.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  // Check if character already has a hero instance
  const existingHero = await db.heroInstance.findFirst({
    where: { characterId, playerId: player.id },
  });
  if (existingHero) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "角色已在外城" });
  }

  // 创建英雄实例，初始位置在城门 (0, 0)
  const hero = await db.heroInstance.create({
    data: {
      playerId: player.id,
      characterId,
      positionX: 0,
      positionY: 0,
      status: "idle",
      stamina: 100,
    },
  });

  // 确保起始位置已探索
  await db.exploredArea.upsert({
    where: {
      playerId_worldId_positionX_positionY: {
        playerId: player.id,
        worldId: "main",
        positionX: 0,
        positionY: 0,
      },
    },
    update: { explorationLevel: 2 },
    create: {
      playerId: player.id,
      worldId: "main",
      positionX: 0,
      positionY: 0,
      name: "城门",
      biome: "grassland",
      explorationLevel: 2,
    },
  });

  return { success: true, hero };
}

export async function recall(db: FullDbClient, userId: string, heroId: string) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const hero = await db.heroInstance.findFirst({
    where: { id: heroId, playerId: player.id },
  });

  if (!hero) {
    throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
  }

  if (hero.status === "fighting") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗中无法召回" });
  }

  await db.heroInstance.delete({ where: { id: heroId } });

  return { success: true };
}

export async function rest(db: FullDbClient, userId: string, heroId: string) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const hero = await db.heroInstance.findFirst({
    where: { id: heroId, playerId: player.id },
  });

  if (!hero) {
    throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
  }

  // 获取内城建筑加成
  const cityBonuses = await getInnerCityBonuses(db, player.id);

  // 恢复体力需要消耗食物
  const staminaRestore = BASE_STAMINA_RESTORE + cityBonuses.staminaBonus;

  if (player.food < FOOD_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "食物不足" });
  }

  await db.player.update({
    where: { id: player.id },
    data: { food: { decrement: FOOD_COST } },
  });

  const newStamina = Math.min(100, hero.stamina + staminaRestore);
  await db.heroInstance.update({
    where: { id: heroId },
    data: { stamina: newStamina },
  });

  const bonusText = cityBonuses.staminaBonus > 0 ? ` (农田加成+${cityBonuses.staminaBonus})` : "";
  return {
    success: true,
    newStamina,
    message: `消耗 ${FOOD_COST} 食物，恢复 ${staminaRestore} 体力${bonusText}`,
  };
}
