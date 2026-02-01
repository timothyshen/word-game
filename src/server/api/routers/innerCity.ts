import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  getBuildingRadius,
  getBuildingSize,
  wouldRadiusGrow,
  canPlaceBuilding,
  canUpgradeBuilding,
  snapToGrid,
  type BuildingForCollision,
} from "~/shared/building-radius";

export const innerCityRouter = createTRPCRouter({
  // 获取内城整体状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (!config) {
      return {
        initialized: false,
        territoryWidth: 0,
        territoryHeight: 0,
        cornerRadius: 0,
        buildingCount: 0,
        territoryArea: 0,
      };
    }

    const buildingCount = await ctx.db.innerCityBuilding.count({
      where: { playerId: player.id },
    });

    // 圆角矩形近似面积
    const w = config.territoryWidth * 2;
    const h = config.territoryHeight * 2;
    const r = config.cornerRadius;
    const territoryArea = w * h - (4 - Math.PI) * r * r;

    return {
      initialized: true,
      territoryWidth: config.territoryWidth,
      territoryHeight: config.territoryHeight,
      cornerRadius: config.cornerRadius,
      buildingCount,
      territoryArea: Math.round(territoryArea),
    };
  }),

  // 获取内城数据（领地 + 建筑）
  getCity: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (!config) {
      return {
        buildings: [],
        territory: { halfW: 0, halfH: 0, cornerR: 0 },
      };
    }

    const buildings = await ctx.db.innerCityBuilding.findMany({
      where: { playerId: player.id },
      include: { template: true },
    });

    return {
      territory: {
        halfW: config.territoryWidth,
        halfH: config.territoryHeight,
        cornerR: config.cornerRadius,
      },
      buildings: buildings.map((b) => {
        const size = getBuildingSize(b.template.name, b.level);
        return {
          id: b.id,
          x: b.positionX,
          y: b.positionY,
          level: b.level,
          radius: size.radius,
          visualW: size.visualW,
          visualH: size.visualH,
          height: size.height,
          templateId: b.templateId,
          name: b.template.name,
          icon: b.template.icon,
          slot: b.template.slot,
        };
      }),
    };
  }),

  // 初始化内城
  initialize: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const existingConfig = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (existingConfig) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "内城已初始化" });
    }

    // 创建领地配置
    await ctx.db.innerCityConfig.create({
      data: {
        playerId: player.id,
        territoryWidth: 4.0,
        territoryHeight: 4.0,
        cornerRadius: 1.5,
      },
    });

    // 在中心放置主城堡
    const castle = await ctx.db.building.findFirst({
      where: { name: "主城堡" },
    });

    if (castle) {
      await ctx.db.innerCityBuilding.create({
        data: {
          playerId: player.id,
          templateId: castle.id,
          positionX: 0,
          positionY: 0,
          level: 1,
        },
      });
    }

    return {
      success: true,
      message: "内城初始化完成",
      territory: { halfW: 4.0, halfH: 4.0, cornerR: 1.5 },
    };
  }),

  // 放置建筑（使用建筑卡）
  placeBuilding: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const config = await ctx.db.innerCityConfig.findUnique({
        where: { playerId: player.id },
      });

      if (!config) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId, quantity: { gt: 0 } },
        include: { card: true },
      });

      if (!playerCard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在或数量不足" });
      }

      if (playerCard.card.type !== "building") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只能使用建筑卡" });
      }

      // 解析卡牌效果
      let effects: { buildingId?: string };
      try {
        effects = JSON.parse(playerCard.card.effects) as { buildingId?: string };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "卡牌效果解析失败" });
      }

      if (!effects.buildingId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌缺少建筑ID" });
      }

      const buildingTemplate = await ctx.db.building.findUnique({
        where: { id: effects.buildingId },
      });

      if (!buildingTemplate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑模板不存在" });
      }

      // 吸附到 0.5 网格
      const x = snapToGrid(input.positionX);
      const y = snapToGrid(input.positionY);

      const buildingRadius = getBuildingRadius(buildingTemplate.name, 1);

      // 加载现有建筑进行碰撞检测
      const existingRaw = await ctx.db.innerCityBuilding.findMany({
        where: { playerId: player.id },
        include: { template: true },
      });
      const existingForCollision: BuildingForCollision[] = existingRaw.map((b) => ({
        x: b.positionX,
        y: b.positionY,
        radius: getBuildingRadius(b.template.name, b.level),
      }));

      const territory = {
        halfW: config.territoryWidth,
        halfH: config.territoryHeight,
        cornerR: config.cornerRadius,
      };

      if (!canPlaceBuilding(x, y, buildingRadius, existingForCollision, territory)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无法在此位置放置建筑：超出领地范围或与其他建筑冲突",
        });
      }

      // 创建建筑
      const building = await ctx.db.innerCityBuilding.create({
        data: {
          playerId: player.id,
          templateId: buildingTemplate.id,
          positionX: x,
          positionY: y,
          level: 1,
        },
        include: { template: true },
      });

      // 消耗卡牌
      if (playerCard.quantity > 1) {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: playerCard.quantity - 1 },
        });
      } else {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      }

      // 记录行动分数
      const gameDay = Math.floor(
        (Date.now() - new Date(player.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;

      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: gameDay,
          type: "build",
          description: `在内城建造了 ${buildingTemplate.name}`,
          baseScore: 50,
          bonus: 0,
        },
      });

      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + 50 },
      });

      const size = getBuildingSize(building.template.name, 1);
      return {
        success: true,
        building: {
          id: building.id,
          name: building.template.name,
          icon: building.template.icon,
          level: building.level,
          x,
          y,
          radius: size.radius,
        },
        message: `成功建造 ${buildingTemplate.name}`,
      };
    }),

  // 扩张领地（使用扩张卡）
  expandTerritory: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const config = await ctx.db.innerCityConfig.findUnique({
        where: { playerId: player.id },
      });

      if (!config) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId, quantity: { gt: 0 } },
        include: { card: true },
      });

      if (!playerCard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在或数量不足" });
      }

      if (playerCard.card.type !== "expansion") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只能使用扩张卡" });
      }

      let effects: { type?: string; amount?: number };
      try {
        effects = JSON.parse(playerCard.card.effects) as { type?: string; amount?: number };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "卡牌效果解析失败" });
      }

      const amount = effects.amount ?? 1;
      const widthIncrement = amount * 1.5;
      const cornerIncrement = amount * 0.5;

      const newWidth = config.territoryWidth + widthIncrement;
      const newHeight = config.territoryHeight + widthIncrement;
      const newCorner = config.cornerRadius + cornerIncrement;

      await ctx.db.innerCityConfig.update({
        where: { playerId: player.id },
        data: {
          territoryWidth: newWidth,
          territoryHeight: newHeight,
          cornerRadius: newCorner,
        },
      });

      // 消耗卡牌
      if (playerCard.quantity > 1) {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: playerCard.quantity - 1 },
        });
      } else {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      }

      return {
        success: true,
        territory: { halfW: newWidth, halfH: newHeight, cornerR: newCorner },
        message: `领地扩张完成！新范围: ${(newWidth * 2).toFixed(1)} x ${(newHeight * 2).toFixed(1)}`,
      };
    }),

  // 升级建筑
  upgradeBuilding: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const building = await ctx.db.innerCityBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { template: true },
      });

      if (!building) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      if (building.level >= building.template.maxLevel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "建筑已达最高等级" });
      }

      // 检查碰撞半径是否会增长
      if (wouldRadiusGrow(building.template.name, building.level)) {
        const config = await ctx.db.innerCityConfig.findUnique({
          where: { playerId: player.id },
        });

        if (!config) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
        }

        const newRadius = getBuildingRadius(building.template.name, building.level + 1);

        const allBuildings = await ctx.db.innerCityBuilding.findMany({
          where: { playerId: player.id },
          include: { template: true },
        });
        const allForCollision = allBuildings.map((b) => ({
          id: b.id,
          x: b.positionX,
          y: b.positionY,
          radius: getBuildingRadius(b.template.name, b.level),
        }));

        const territory = {
          halfW: config.territoryWidth,
          halfH: config.territoryHeight,
          cornerR: config.cornerRadius,
        };

        if (!canUpgradeBuilding(building.id, building.positionX, building.positionY, newRadius, allForCollision, territory)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "升级后建筑体积增大，与周围建筑冲突或超出领地范围",
          });
        }
      }

      // 计算升级费用
      const upgradeCost = {
        gold: 100 * building.level,
        wood: 50 * building.level,
        stone: 30 * building.level,
      };

      if (player.gold < upgradeCost.gold) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${upgradeCost.gold}` });
      }
      if (player.wood < upgradeCost.wood) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${upgradeCost.wood}` });
      }
      if (player.stone < upgradeCost.stone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${upgradeCost.stone}` });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: player.gold - upgradeCost.gold,
          wood: player.wood - upgradeCost.wood,
          stone: player.stone - upgradeCost.stone,
        },
      });

      const updatedBuilding = await ctx.db.innerCityBuilding.update({
        where: { id: building.id },
        data: { level: building.level + 1 },
        include: { template: true },
      });

      const newSize = getBuildingSize(updatedBuilding.template.name, updatedBuilding.level);
      return {
        success: true,
        building: {
          id: updatedBuilding.id,
          name: updatedBuilding.template.name,
          level: updatedBuilding.level,
          radius: newSize.radius,
        },
        cost: upgradeCost,
        message: `${building.template.name} 升级到 ${updatedBuilding.level} 级`,
      };
    }),

  // 拆除建筑
  demolish: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const building = await ctx.db.innerCityBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { template: true },
      });

      if (!building) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      if (building.template.name === "主城堡") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "主城堡不能拆除" });
      }

      const refund = {
        gold: Math.floor(50 * building.level * 0.5),
        wood: Math.floor(25 * building.level * 0.5),
        stone: Math.floor(15 * building.level * 0.5),
      };

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: player.gold + refund.gold,
          wood: player.wood + refund.wood,
          stone: player.stone + refund.stone,
        },
      });

      await ctx.db.innerCityBuilding.delete({ where: { id: building.id } });

      return {
        success: true,
        refund,
        message: `拆除了 ${building.template.name}，返还部分资源`,
      };
    }),
});
