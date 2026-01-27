// POI交互和资源采集路由

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getInnerCityBonuses } from "./helpers";

export const poiRouter = createTRPCRouter({
  // 与POI互动
  interact: publicProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
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

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      // 检查英雄是否在POI位置
      if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
      }

      // 根据POI类型处理互动
      switch (poi.type) {
        case "resource": {
          // 资源点：直接获取资源
          if (poi.resourceType && poi.resourceAmount > 0) {
            await ctx.db.player.update({
              where: { id: player.id },
              data: {
                gold:
                  poi.resourceType === "gold"
                    ? player.gold + poi.resourceAmount
                    : player.gold,
                wood:
                  poi.resourceType === "wood"
                    ? player.wood + poi.resourceAmount
                    : player.wood,
                stone:
                  poi.resourceType === "stone"
                    ? player.stone + poi.resourceAmount
                    : player.stone,
                food:
                  poi.resourceType === "food"
                    ? player.food + poi.resourceAmount
                    : player.food,
              },
            });

            return {
              success: true,
              type: "resource",
              message: `获得 ${poi.resourceAmount} ${poi.resourceType}`,
            };
          }
          break;
        }
        case "garrison":
        case "lair": {
          // 驻军/巢穴：需要战斗
          if (poi.isDefeated) {
            return {
              success: false,
              type: "already_defeated",
              message: "该地点已被征服",
            };
          }
          return {
            success: true,
            type: "combat",
            message: "发现敌人，准备战斗！",
            difficulty: poi.difficulty,
          };
        }
        case "settlement": {
          // 定居点：可交易
          return {
            success: true,
            type: "settlement",
            message: "发现友好定居点",
          };
        }
      }

      return { success: true, type: "unknown", message: "未知互动" };
    }),

  // 采集资源
  harvest: publicProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
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
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      if (poi.type !== "resource" && poi.type !== "shrine" && poi.type !== "caravan") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该地点无法互动" });
      }

      if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
      }

      // ===== 神殿：祈祷获得buff =====
      if (poi.type === "shrine") {
        const staminaCost = 5;
        if (hero.stamina < staminaCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
        }

        // 消耗体力
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: hero.stamina - staminaCost },
        });

        // 根据神殿类型给予不同buff
        let message = "";
        if (poi.resourceType === "stamina") {
          // 恢复英雄体力
          const restoreAmount = poi.resourceAmount ?? 30;
          const newStamina = Math.min(100, hero.stamina - staminaCost + restoreAmount);
          await ctx.db.heroInstance.update({
            where: { id: hero.id },
            data: { stamina: newStamina },
          });
          message = `神殿祝福！恢复 ${restoreAmount} 体力`;
        } else if (poi.resourceType === "attack") {
          // 临时增加攻击力 - 更新角色基础攻击
          const boostAmount = poi.resourceAmount ?? 5;
          await ctx.db.playerCharacter.update({
            where: { id: hero.characterId },
            data: { attack: hero.character.attack + boostAmount },
          });
          message = `战神祝福！攻击力+${boostAmount}`;
        } else {
          message = "获得神殿祝福";
        }

        return {
          success: true,
          harvested: 0,
          resourceType: poi.resourceType,
          remaining: 0,
          message,
        };
      }

      // ===== 商队：随机交易 =====
      if (poi.type === "caravan") {
        const staminaCost = 5;
        if (hero.stamina < staminaCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
        }

        // 消耗体力
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: hero.stamina - staminaCost },
        });

        // 获取内城建筑加成
        const cityBonuses = await getInnerCityBonuses(ctx.db, player.id);

        // 随机交易 - 用金币换取其他资源
        const tradeOptions = [
          { give: "gold", giveAmount: 50, receive: "wood", receiveAmount: 30 },
          { give: "gold", giveAmount: 50, receive: "stone", receiveAmount: 25 },
          { give: "gold", giveAmount: 30, receive: "food", receiveAmount: 40 },
          { give: "wood", giveAmount: 40, receive: "gold", receiveAmount: 30 },
          { give: "stone", giveAmount: 30, receive: "gold", receiveAmount: 40 },
        ];

        const trade = tradeOptions[Math.floor(Math.random() * tradeOptions.length)]!;

        // 应用市场加成到交易收益
        const bonusReceive = Math.floor(trade.receiveAmount * cityBonuses.tradeBonus);
        const finalReceiveAmount = trade.receiveAmount + bonusReceive;

        // 检查玩家是否有足够资源
        const giveKey = trade.give as keyof typeof player;
        const playerResource = player[giveKey] as number;
        if (playerResource < trade.giveAmount) {
          return {
            success: false,
            harvested: 0,
            resourceType: "trade",
            remaining: 0,
            message: `商人想要 ${trade.giveAmount} ${trade.give}，但你没有足够资源`,
          };
        }

        // 执行交易
        const updates: Record<string, number> = {};
        updates[trade.give] = playerResource - trade.giveAmount;
        const receiveKey = trade.receive as keyof typeof player;
        updates[trade.receive] = (player[receiveKey] as number) + finalReceiveAmount;

        await ctx.db.player.update({
          where: { id: player.id },
          data: updates,
        });

        const bonusText = bonusReceive > 0 ? ` (市场加成+${bonusReceive})` : "";
        return {
          success: true,
          harvested: finalReceiveAmount,
          resourceType: trade.receive,
          remaining: 0,
          message: `交易完成！用 ${trade.giveAmount} ${trade.give} 换取 ${finalReceiveAmount} ${trade.receive}${bonusText}`,
        };
      }

      // ===== 资源点：采集资源 =====
      // 检查资源是否可采集
      if (poi.resourceAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "资源已耗尽" });
      }

      // 检查体力
      const staminaCost = 10;
      if (hero.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 采集资源
      const harvestAmount = Math.min(poi.resourceAmount, 10 + Math.floor(Math.random() * 10));

      // 更新玩家资源
      const resourceUpdates: Record<string, number> = {};
      if (poi.resourceType === "gold") resourceUpdates.gold = player.gold + harvestAmount;
      if (poi.resourceType === "wood") resourceUpdates.wood = player.wood + harvestAmount;
      if (poi.resourceType === "stone") resourceUpdates.stone = player.stone + harvestAmount;
      if (poi.resourceType === "food") resourceUpdates.food = player.food + harvestAmount;

      await ctx.db.player.update({
        where: { id: player.id },
        data: resourceUpdates,
      });

      // 减少POI资源量
      await ctx.db.outerCityPOI.update({
        where: { id: poi.id },
        data: {
          resourceAmount: poi.resourceAmount - harvestAmount,
        },
      });

      // 消耗英雄体力
      await ctx.db.heroInstance.update({
        where: { id: hero.id },
        data: { stamina: hero.stamina - staminaCost },
      });

      return {
        success: true,
        harvested: harvestAmount,
        resourceType: poi.resourceType,
        remaining: poi.resourceAmount - harvestAmount,
        message: `采集了 ${harvestAmount} ${poi.resourceType}`,
      };
    }),

  // 刷新资源（定时任务或手动触发）
  refreshResources: publicProcedure.mutation(async ({ ctx }) => {
    // 刷新所有资源点
    const resourcePOIs = await ctx.db.outerCityPOI.findMany({
      where: { type: "resource" },
    });

    let refreshed = 0;
    for (const poi of resourcePOIs) {
      // 基础刷新量
      const baseAmount = poi.difficulty * 20;
      if (poi.resourceAmount < baseAmount) {
        await ctx.db.outerCityPOI.update({
          where: { id: poi.id },
          data: { resourceAmount: baseAmount },
        });
        refreshed++;
      }
    }

    // 刷新已征服的驻军/巢穴
    const now = new Date();
    const defeatedPOIs = await ctx.db.outerCityPOI.findMany({
      where: {
        isDefeated: true,
        respawnsAt: { lte: now },
      },
    });

    for (const poi of defeatedPOIs) {
      await ctx.db.outerCityPOI.update({
        where: { id: poi.id },
        data: {
          isDefeated: false,
          defeatedAt: null,
          respawnsAt: null,
        },
      });
      refreshed++;
    }

    return { success: true, refreshed };
  }),
});
