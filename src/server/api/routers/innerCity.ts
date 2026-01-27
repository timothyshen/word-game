import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 根据 gridRadius 生成格子坐标
// gridRadius=1 -> 3x3 (-1 to 1)
// gridRadius=2 -> 5x5 (-2 to 2)
function getGridPositions(radius: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      positions.push({ x, y });
    }
  }
  return positions;
}

// 检查位置是否在当前网格范围内
function isInGrid(x: number, y: number, radius: number): boolean {
  return Math.abs(x) <= radius && Math.abs(y) <= radius;
}

// 获取边界外可扩张的位置
function getExpandablePositions(
  radius: number,
  existingTiles: Array<{ positionX: number; positionY: number }>
): Array<{ x: number; y: number }> {
  const newRadius = radius + 1;
  const expandable: Array<{ x: number; y: number }> = [];

  // 新的边界格子
  for (let x = -newRadius; x <= newRadius; x++) {
    for (let y = -newRadius; y <= newRadius; y++) {
      // 只要在新半径边界上
      if (Math.abs(x) === newRadius || Math.abs(y) === newRadius) {
        // 检查是否与已有格子相邻
        const adjacent = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 },
        ];
        const hasAdjacentTile = adjacent.some(
          (pos) =>
            existingTiles.some(
              (t) => t.positionX === pos.x && t.positionY === pos.y
            )
        );
        if (hasAdjacentTile) {
          expandable.push({ x, y });
        }
      }
    }
  }

  return expandable;
}

export const innerCityRouter = createTRPCRouter({
  // 获取内城整体状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 获取内城配置
    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    // 如果没有配置，说明未初始化
    if (!config) {
      return {
        initialized: false,
        gridRadius: 0,
        gridSize: 0,
        tileCount: 0,
        buildingCount: 0,
        spaceCapacity: 0,
        spaceUsed: 0,
      };
    }

    // 获取格子和建筑数量
    const tileCount = await ctx.db.innerCityTile.count({
      where: { playerId: player.id },
    });

    const buildings = await ctx.db.innerCityBuilding.findMany({
      where: { playerId: player.id },
      include: { template: true },
    });

    // 计算空间使用（建筑高度总和）
    const spaceUsed = buildings.reduce((sum, b) => {
      // 高度 = 基础高度(1) + (等级-1) * 0.5
      return sum + 1 + (b.level - 1) * 0.5;
    }, 0);

    return {
      initialized: true,
      gridRadius: config.gridRadius,
      gridSize: (config.gridRadius * 2 + 1) ** 2,
      tileCount,
      buildingCount: buildings.length,
      spaceCapacity: config.spaceCapacity,
      spaceUsed: Math.round(spaceUsed * 10) / 10,
    };
  }),

  // 获取网格信息（所有格子和建筑）
  getGrid: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (!config) {
      return { tiles: [], buildings: [], gridRadius: 0 };
    }

    const tiles = await ctx.db.innerCityTile.findMany({
      where: { playerId: player.id },
      orderBy: [{ positionY: "asc" }, { positionX: "asc" }],
    });

    const buildings = await ctx.db.innerCityBuilding.findMany({
      where: { playerId: player.id },
      include: { template: true },
    });

    return {
      tiles: tiles.map((t) => ({
        x: t.positionX,
        y: t.positionY,
        unlocked: t.unlocked,
      })),
      buildings: buildings.map((b) => ({
        id: b.id,
        x: b.positionX,
        y: b.positionY,
        level: b.level,
        templateId: b.templateId,
        name: b.template.name,
        icon: b.template.icon,
        slot: b.template.slot,
      })),
      gridRadius: config.gridRadius,
    };
  }),

  // 获取可放置建筑的位置
  getAvailable: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (!config) {
      return { available: [] };
    }

    // 获取所有已解锁的格子
    const tiles = await ctx.db.innerCityTile.findMany({
      where: { playerId: player.id, unlocked: true },
    });

    // 获取所有已放置建筑的位置
    const buildings = await ctx.db.innerCityBuilding.findMany({
      where: { playerId: player.id },
      select: { positionX: true, positionY: true },
    });

    const buildingPositions = new Set(
      buildings.map((b) => `${b.positionX},${b.positionY}`)
    );

    // 可放置 = 已解锁且无建筑
    const available = tiles
      .filter((t) => !buildingPositions.has(`${t.positionX},${t.positionY}`))
      .map((t) => ({ x: t.positionX, y: t.positionY }));

    return { available };
  }),

  // 获取可扩张的位置
  getExpandable: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const config = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (!config) {
      return { expandable: [], currentRadius: 0 };
    }

    const tiles = await ctx.db.innerCityTile.findMany({
      where: { playerId: player.id },
    });

    const expandable = getExpandablePositions(config.gridRadius, tiles);

    return {
      expandable,
      currentRadius: config.gridRadius,
      nextRadius: config.gridRadius + 1,
    };
  }),

  // 初始化内城（首次进入时调用）
  initialize: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 检查是否已初始化
    const existingConfig = await ctx.db.innerCityConfig.findUnique({
      where: { playerId: player.id },
    });

    if (existingConfig) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "内城已初始化" });
    }

    // 创建配置
    await ctx.db.innerCityConfig.create({
      data: {
        playerId: player.id,
        gridRadius: 1, // 3x3
        spaceCapacity: 20,
      },
    });

    // 创建 3x3 格子
    const positions = getGridPositions(1);
    await ctx.db.innerCityTile.createMany({
      data: positions.map((pos) => ({
        playerId: player.id,
        positionX: pos.x,
        positionY: pos.y,
        unlocked: true,
      })),
    });

    // 在中心(0,0)放置主城堡
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
      gridRadius: 1,
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

      // 检查位置是否在网格范围内
      if (!isInGrid(input.positionX, input.positionY, config.gridRadius)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "位置超出网格范围" });
      }

      // 检查格子是否已解锁
      const tile = await ctx.db.innerCityTile.findUnique({
        where: {
          playerId_positionX_positionY: {
            playerId: player.id,
            positionX: input.positionX,
            positionY: input.positionY,
          },
        },
      });

      if (!tile || !tile.unlocked) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该格子未解锁" });
      }

      // 检查是否已有建筑
      const existingBuilding = await ctx.db.innerCityBuilding.findUnique({
        where: {
          playerId_positionX_positionY: {
            playerId: player.id,
            positionX: input.positionX,
            positionY: input.positionY,
          },
        },
      });

      if (existingBuilding) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该位置已有建筑" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId, quantity: { gt: 0 } },
        include: { card: true },
      });

      if (!playerCard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在或数量不足" });
      }

      // 验证是建筑卡
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

      // 获取建筑模板
      const buildingTemplate = await ctx.db.building.findUnique({
        where: { id: effects.buildingId },
      });

      if (!buildingTemplate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑模板不存在" });
      }

      // 创建建筑
      const building = await ctx.db.innerCityBuilding.create({
        data: {
          playerId: player.id,
          templateId: buildingTemplate.id,
          positionX: input.positionX,
          positionY: input.positionY,
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

      // 更新当日分数
      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + 50 },
      });

      return {
        success: true,
        building: {
          id: building.id,
          name: building.template.name,
          icon: building.template.icon,
          level: building.level,
          x: building.positionX,
          y: building.positionY,
        },
        message: `成功建造 ${buildingTemplate.name}`,
      };
    }),

  // 扩张面积（使用扩张卡）
  expandArea: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        positions: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
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

      // 验证是扩张卡
      if (playerCard.card.type !== "expansion") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只能使用扩张卡" });
      }

      // 解析卡牌效果
      let effects: { type?: string; amount?: number };
      try {
        effects = JSON.parse(playerCard.card.effects) as { type?: string; amount?: number };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "卡牌效果解析失败" });
      }

      // 处理空间扩张卡
      if (effects.type === "space") {
        const amount = effects.amount ?? 10;

        await ctx.db.innerCityConfig.update({
          where: { playerId: player.id },
          data: { spaceCapacity: config.spaceCapacity + amount },
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
          newCapacity: config.spaceCapacity + amount,
          message: `空间容量增加 ${amount}，当前容量: ${config.spaceCapacity + amount}`,
        };
      }

      // 处理面积扩张卡
      if (effects.type !== "area") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "未知的扩张卡类型" });
      }

      const amount = effects.amount ?? 1;

      // 获取现有格子
      const existingTiles = await ctx.db.innerCityTile.findMany({
        where: { playerId: player.id },
      });

      // 获取可扩张位置
      const expandable = getExpandablePositions(config.gridRadius, existingTiles);

      if (expandable.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有可扩张的位置" });
      }

      // 确定要解锁的位置
      let positionsToUnlock: Array<{ x: number; y: number }>;
      if (input.positions && input.positions.length > 0) {
        // 验证指定的位置是否有效
        positionsToUnlock = input.positions.filter((pos) =>
          expandable.some((e) => e.x === pos.x && e.y === pos.y)
        );
        if (positionsToUnlock.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "指定的位置无法扩张" });
        }
      } else {
        // 默认扩张 amount 个格子
        positionsToUnlock = expandable.slice(0, amount);
      }

      // 创建新格子
      await ctx.db.innerCityTile.createMany({
        data: positionsToUnlock.map((pos) => ({
          playerId: player.id,
          positionX: pos.x,
          positionY: pos.y,
          unlocked: true,
        })),
      });

      // 更新 gridRadius（如果需要）
      const maxDistance = Math.max(
        ...positionsToUnlock.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))
      );
      if (maxDistance > config.gridRadius) {
        await ctx.db.innerCityConfig.update({
          where: { playerId: player.id },
          data: { gridRadius: maxDistance },
        });
      }

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
        newTiles: positionsToUnlock,
        newGridRadius: Math.max(config.gridRadius, maxDistance),
        message: `成功扩张 ${positionsToUnlock.length} 个格子`,
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

      // 计算升级费用
      const upgradeCost = {
        gold: 100 * building.level,
        wood: 50 * building.level,
        stone: 30 * building.level,
      };

      // 检查资源
      if (player.gold < upgradeCost.gold) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${upgradeCost.gold}` });
      }
      if (player.wood < upgradeCost.wood) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${upgradeCost.wood}` });
      }
      if (player.stone < upgradeCost.stone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${upgradeCost.stone}` });
      }

      // 扣除资源并升级
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

      return {
        success: true,
        building: {
          id: updatedBuilding.id,
          name: updatedBuilding.template.name,
          level: updatedBuilding.level,
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

      // 主城堡不能拆除
      if (building.template.name === "主城堡") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "主城堡不能拆除" });
      }

      // 返还部分资源（50%）
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

      // 删除建筑
      await ctx.db.innerCityBuilding.delete({ where: { id: building.id } });

      return {
        success: true,
        refund,
        message: `拆除了 ${building.template.name}，返还部分资源`,
      };
    }),
});
