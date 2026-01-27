// 英雄管理路由

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getInnerCityBonuses } from "./helpers";

export const heroesRouter = createTRPCRouter({
  // 派遣英雄到外城
  deploy: publicProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查角色是否属于玩家
      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { heroInstance: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (character.heroInstance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "角色已在外城" });
      }

      // 创建英雄实例，初始位置在城门 (0, 0)
      const hero = await ctx.db.heroInstance.create({
        data: {
          playerId: player.id,
          characterId: input.characterId,
          positionX: 0,
          positionY: 0,
          status: "idle",
          stamina: 100,
        },
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      // 确保起始位置已探索
      await ctx.db.exploredArea.upsert({
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
    }),

  // 召回英雄
  recall: publicProcedure
    .input(z.object({ heroId: z.string() }))
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
        throw new TRPCError({ code: "BAD_REQUEST", message: "战斗中无法召回" });
      }

      await ctx.db.heroInstance.delete({ where: { id: input.heroId } });

      return { success: true };
    }),

  // 恢复英雄体力
  rest: publicProcedure
    .input(z.object({ heroId: z.string() }))
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

      // 获取内城建筑加成
      const cityBonuses = await getInnerCityBonuses(ctx.db, player.id);

      // 恢复体力需要消耗食物
      const foodCost = 10;
      const baseStaminaRestore = 30;
      const staminaRestore = baseStaminaRestore + cityBonuses.staminaBonus;

      if (player.food < foodCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "食物不足" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: { food: player.food - foodCost },
      });

      const newStamina = Math.min(100, hero.stamina + staminaRestore);
      await ctx.db.heroInstance.update({
        where: { id: input.heroId },
        data: { stamina: newStamina },
      });

      const bonusText = cityBonuses.staminaBonus > 0 ? ` (农田加成+${cityBonuses.staminaBonus})` : "";
      return {
        success: true,
        newStamina,
        message: `消耗 ${foodCost} 食物，恢复 ${staminaRestore} 体力${bonusText}`,
      };
    }),
});
