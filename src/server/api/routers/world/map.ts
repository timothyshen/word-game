// 地图和移动路由

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { generateRandomEvent, type ExplorationEvent } from "./events";

export const mapRouter = createTRPCRouter({
  // 获取外城状态
  getStatus: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
    }

    const player = await ctx.db.player.findFirst({
      where: { userId },
      include: {
        heroInstances: {
          include: {
            character: {
              include: {
                character: true,
              },
            },
          },
        },
        exploredAreas: {
          where: { worldId: "main" },
        },
        characters: {
          include: {
            character: true,
            heroInstance: true,
          },
        },
      },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 获取全局POI列表
    const pois = await ctx.db.outerCityPOI.findMany();

    return {
      heroes: player.heroInstances,
      exploredAreas: player.exploredAreas,
      availableCharacters: player.characters.filter((c) => !c.heroInstance),
      pois,
    };
  }),

  // 移动英雄
  moveHero: publicProcedure
    .input(
      z.object({
        heroId: z.string(),
        targetX: z.number(),
        targetY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
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
      const staminaCost = 5;
      if (hero.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 移动英雄
      await ctx.db.heroInstance.update({
        where: { id: input.heroId },
        data: {
          positionX: input.targetX,
          positionY: input.targetY,
          stamina: hero.stamina - staminaCost,
        },
      });

      // 探索新区域
      const biomes = ["grassland", "forest", "mountain", "desert", "swamp"];
      const randomBiome = biomes[Math.floor(Math.random() * biomes.length)]!;

      await ctx.db.exploredArea.upsert({
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
          biome: randomBiome,
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
        // 检查是否已存在
        const existing = await ctx.db.exploredArea.findUnique({
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
          const neighborBiome =
            biomes[Math.floor(Math.random() * biomes.length)]!;
          await ctx.db.exploredArea.create({
            data: {
              playerId: player.id,
              worldId: "main",
              positionX: nx!,
              positionY: ny!,
              name: `未知区域`,
              biome: neighborBiome,
              explorationLevel: 1, // 迷雾状态
            },
          });
        }
      }

      // 检查目标位置是否有POI
      const poi = await ctx.db.outerCityPOI.findFirst({
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
      const existingArea = await ctx.db.exploredArea.findUnique({
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
        const areaLevel = Math.max(1, Math.floor(distance / 3));
        event = generateRandomEvent(areaLevel);
      }

      return {
        success: true,
        newPosition: { x: input.targetX, y: input.targetY },
        event,
      };
    }),

  // 获取可见地图
  getVisibleMap: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
    }

    const player = await ctx.db.player.findFirst({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const exploredAreas = await ctx.db.exploredArea.findMany({
      where: { playerId: player.id, worldId: "main" },
    });

    const pois = await ctx.db.outerCityPOI.findMany();

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
  }),
});
