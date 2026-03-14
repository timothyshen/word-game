// 地图和移动服务

import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { TRPCError } from "@trpc/server";
import { generateRandomEvent, type ExplorationEvent } from "../routers/world/events";
import { parseCharacterState } from "../utils/character-utils";
import { resolveHeroCharacter } from "../utils/hero-utils";

const BIOMES = ["grassland", "forest", "mountain", "desert", "swamp"];
const STAMINA_COST = 5;

function randomBiome(): string {
  return BIOMES[Math.floor(Math.random() * BIOMES.length)]!;
}

export async function getStatus(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await db.player.findFirst({
    where: { userId },
    include: {
      heroInstances: true,
      exploredAreas: {
        where: { worldId: "main" },
      },
    },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Get character entities for available characters
  const charEntities = await entities.getEntitiesByOwner(player.id, "character") as Array<{ id: string; state: string }>;
  const heroCharIds = new Set(player.heroInstances.map(h => h.characterId));

  // Parse entity states and get template info for available characters
  const availableChars = [];
  for (const entity of charEntities) {
    if (!heroCharIds.has(entity.id)) {
      const state = parseCharacterState(entity);
      const charTemplate = await db.character.findUnique({ where: { id: state.characterId } });
      availableChars.push({
        id: entity.id,
        name: charTemplate?.name ?? "未知",
        portrait: charTemplate?.portrait ?? "👤",
        level: state.level,
      });
    }
  }

  // Enrich heroes with character data
  const enrichedHeroes = [];
  for (const hero of player.heroInstances) {
    const charData = await resolveHeroCharacter(db, entities, hero.characterId);
    enrichedHeroes.push({
      ...hero,
      character: {
        ...charData.state,
        character: charData.template,
      },
    });
  }

  // 获取全局POI列表
  const pois = await db.outerCityPOI.findMany();

  return {
    heroes: enrichedHeroes,
    exploredAreas: player.exploredAreas,
    availableCharacters: availableChars,
    pois,
  };
}

export async function moveHero(
  db: FullDbClient,
  userId: string,
  input: { heroId: string; targetX: number; targetY: number },
) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const hero = await db.heroInstance.findFirst({
    where: { id: input.heroId, playerId: player.id },
  });

  if (!hero) {
    throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
  }

  if (hero.status === "fighting") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗中无法移动" });
  }

  // 计算移动距离（只能移动到相邻格子）
  const dx = Math.abs(input.targetX - hero.positionX);
  const dy = Math.abs(input.targetY - hero.positionY);

  if (dx + dy !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "只能移动到相邻格子",
    });
  }

  // 检查体力
  if (hero.stamina < STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // 移动英雄
  await db.heroInstance.update({
    where: { id: input.heroId },
    data: {
      positionX: input.targetX,
      positionY: input.targetY,
      stamina: hero.stamina - STAMINA_COST,
    },
  });

  // 探索新区域
  await db.exploredArea.upsert({
    where: {
      playerId_worldId_positionX_positionY: {
        playerId: player.id,
        worldId: "main",
        positionX: input.targetX,
        positionY: input.targetY,
      },
    },
    update: { explorationLevel: 2 },
    create: {
      playerId: player.id,
      worldId: "main",
      positionX: input.targetX,
      positionY: input.targetY,
      name: `区域 (${input.targetX}, ${input.targetY})`,
      biome: randomBiome(),
      explorationLevel: 2,
    },
  });

  // 同时让相邻区域变为迷雾状态 (explorationLevel = 1)
  const neighbors = [
    [input.targetX - 1, input.targetY],
    [input.targetX + 1, input.targetY],
    [input.targetX, input.targetY - 1],
    [input.targetX, input.targetY + 1],
  ];

  for (const [nx, ny] of neighbors) {
    const existing = await db.exploredArea.findUnique({
      where: {
        playerId_worldId_positionX_positionY: {
          playerId: player.id,
          worldId: "main",
          positionX: nx!,
          positionY: ny!,
        },
      },
    });

    if (!existing) {
      await db.exploredArea.create({
        data: {
          playerId: player.id,
          worldId: "main",
          positionX: nx!,
          positionY: ny!,
          name: `未知区域`,
          biome: randomBiome(),
          explorationLevel: 1, // 迷雾状态
        },
      });
    }
  }

  // 检查目标位置是否有POI
  const poi = await db.outerCityPOI.findFirst({
    where: {
      positionX: input.targetX,
      positionY: input.targetY,
    },
  });

  // 如果有POI，不触发随机事件
  if (poi) {
    return {
      success: true,
      newPosition: { x: input.targetX, y: input.targetY },
      event: null,
    };
  }

  // 检查是否是新发现的区域
  const existingArea = await db.exploredArea.findUnique({
    where: {
      playerId_worldId_positionX_positionY: {
        playerId: player.id,
        worldId: "main",
        positionX: input.targetX,
        positionY: input.targetY,
      },
    },
  });

  // 事件触发概率: 新区域50%, 已探索30%
  const eventChance = !existingArea || existingArea.explorationLevel < 2 ? 0.5 : 0.3;
  const shouldTriggerEvent = Math.random() < eventChance;

  let event: ExplorationEvent | null = null;
  if (shouldTriggerEvent) {
    // 根据距离计算区域等级
    const distance = Math.sqrt(input.targetX ** 2 + input.targetY ** 2);
    const areaLevel = Math.max(1, Math.floor(distance / 2));
    event = generateRandomEvent(areaLevel);
  }

  return {
    success: true,
    newPosition: { x: input.targetX, y: input.targetY },
    event,
  };
}

export async function getVisibleMap(db: FullDbClient, userId: string) {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const exploredAreas = await db.exploredArea.findMany({
    where: { playerId: player.id, worldId: "main" },
  });

  const pois = await db.outerCityPOI.findMany();

  // 只返回已探索区域内的POI
  const visiblePois = pois.filter((poi) =>
    exploredAreas.some(
      (area) =>
        area.positionX === poi.positionX &&
        area.positionY === poi.positionY &&
        area.explorationLevel === 2
    )
  );

  return {
    areas: exploredAreas,
    pois: visiblePois,
  };
}
