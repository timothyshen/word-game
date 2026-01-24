import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 获取当前游戏日
function getCurrentGameDay(): number {
  const now = new Date();
  const gameStart = new Date("2024-01-01T00:00:00Z");
  const daysPassed = Math.floor((now.getTime() - gameStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysPassed + 1;
}

// 升级费用计算
function getUpgradeCost(buildingSlot: string, currentLevel: number): { gold: number; wood: number; stone: number } {
  const baseCosts: Record<string, { gold: number; wood: number; stone: number }> = {
    core: { gold: 500, wood: 200, stone: 200 },
    production: { gold: 100, wood: 50, stone: 30 },
    military: { gold: 200, wood: 80, stone: 100 },
    commerce: { gold: 300, wood: 40, stone: 20 },
    special: { gold: 400, wood: 100, stone: 100 },
  };

  const base = baseCosts[buildingSlot] ?? baseCosts.production!;
  const multiplier = currentLevel;

  return {
    gold: base!.gold * multiplier,
    wood: base!.wood * multiplier,
    stone: base!.stone * multiplier,
  };
}

// 计算建筑产出
function calculateBuildingOutput(
  buildingName: string,
  level: number,
  hasWorker: boolean,
  workerSkillBonus: number = 0
): Record<string, number> {
  const baseOutputs: Record<string, Record<string, number>> = {
    "农田": { food: 20 },
    "矿场": { stone: 15 },
    "伐木场": { wood: 20 },
    "市场": { gold: 30 },
  };

  const base = baseOutputs[buildingName];
  if (!base) return {};

  const output: Record<string, number> = {};
  const levelMultiplier = 1 + (level - 1) * 0.3; // 每级+30%
  const workerMultiplier = hasWorker ? 1.5 + workerSkillBonus : 1;

  for (const [resource, amount] of Object.entries(base)) {
    output[resource] = Math.floor(amount * levelMultiplier * workerMultiplier);
  }

  return output;
}

export const buildingRouter = createTRPCRouter({
  // 获取所有建筑
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const buildings = await ctx.db.playerBuilding.findMany({
      where: { playerId: player.id },
      include: { building: true },
      orderBy: { createdAt: "asc" },
    });

    return buildings.map(pb => ({
      ...pb,
      upgradeCost: getUpgradeCost(pb.building.slot, pb.level),
      canUpgrade: pb.level < pb.building.maxLevel,
      dailyOutput: calculateBuildingOutput(pb.building.name, pb.level, !!pb.assignedCharId),
    }));
  }),

  // 获取单个建筑详情
  getById: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const building = await ctx.db.playerBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { building: true },
      });

      if (!building) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      // 获取分配的角色信息
      let assignedCharacter = null;
      if (building.assignedCharId) {
        assignedCharacter = await ctx.db.playerCharacter.findUnique({
          where: { id: building.assignedCharId },
          include: { character: true },
        });
      }

      return {
        ...building,
        upgradeCost: getUpgradeCost(building.building.slot, building.level),
        canUpgrade: building.level < building.building.maxLevel,
        dailyOutput: calculateBuildingOutput(building.building.name, building.level, !!building.assignedCharId),
        assignedCharacter,
      };
    }),

  // 升级建筑
  upgrade: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const playerBuilding = await ctx.db.playerBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { building: true },
      });

      if (!playerBuilding) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      if (playerBuilding.level >= playerBuilding.building.maxLevel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "建筑已达最高等级" });
      }

      // 检查资源
      const cost = getUpgradeCost(playerBuilding.building.slot, playerBuilding.level);

      if (player.gold < cost.gold) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${cost.gold}` });
      }
      if (player.wood < cost.wood) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${cost.wood}` });
      }
      if (player.stone < cost.stone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${cost.stone}` });
      }

      // 扣除资源
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: player.gold - cost.gold,
          wood: player.wood - cost.wood,
          stone: player.stone - cost.stone,
        },
      });

      // 升级建筑
      const newLevel = playerBuilding.level + 1;
      const updated = await ctx.db.playerBuilding.update({
        where: { id: playerBuilding.id },
        data: { level: newLevel },
        include: { building: true },
      });

      // 记录行动分数
      const baseScore = 30 * newLevel;
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: getCurrentGameDay(),
          type: "upgrade",
          description: `将${playerBuilding.building.name}升级到${newLevel}级`,
          baseScore,
          bonus: 0,
        },
      });

      // 更新当日分数
      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + baseScore },
      });

      return {
        upgraded: true,
        buildingName: playerBuilding.building.name,
        newLevel,
        cost,
        newOutput: calculateBuildingOutput(updated.building.name, newLevel, !!updated.assignedCharId),
      };
    }),

  // 分配角色到建筑
  assignCharacter: protectedProcedure
    .input(
      z.object({
        buildingId: z.string(),
        characterId: z.string().nullable(), // null 表示取消分配
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const playerBuilding = await ctx.db.playerBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { building: true },
      });

      if (!playerBuilding) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      if (input.characterId === null) {
        // 取消分配
        if (playerBuilding.assignedCharId) {
          // 更新角色状态
          await ctx.db.playerCharacter.update({
            where: { id: playerBuilding.assignedCharId },
            data: { status: "idle", workingAt: null },
          });
        }

        await ctx.db.playerBuilding.update({
          where: { id: playerBuilding.id },
          data: { assignedCharId: null, status: "idle" },
        });

        return { assigned: false, message: "已取消角色分配" };
      }

      // 分配角色
      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (character.status === "working") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "角色正在其他地方工作" });
      }

      // 如果建筑已有其他角色，先取消
      if (playerBuilding.assignedCharId && playerBuilding.assignedCharId !== input.characterId) {
        await ctx.db.playerCharacter.update({
          where: { id: playerBuilding.assignedCharId },
          data: { status: "idle", workingAt: null },
        });
      }

      // 更新建筑
      await ctx.db.playerBuilding.update({
        where: { id: playerBuilding.id },
        data: { assignedCharId: input.characterId, status: "working" },
      });

      // 更新角色
      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: { status: "working", workingAt: playerBuilding.building.name },
      });

      return {
        assigned: true,
        characterName: character.character.name,
        buildingName: playerBuilding.building.name,
      };
    }),

  // 计算每日总产出（用于结算）
  calculateDailyOutput: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const buildings = await ctx.db.playerBuilding.findMany({
      where: { playerId: player.id },
      include: { building: true },
    });

    const totalOutput: Record<string, number> = {
      gold: 0,
      wood: 0,
      stone: 0,
      food: 0,
      crystals: 0,
    };

    const breakdown: Array<{
      buildingName: string;
      level: number;
      hasWorker: boolean;
      output: Record<string, number>;
    }> = [];

    for (const pb of buildings) {
      const output = calculateBuildingOutput(pb.building.name, pb.level, !!pb.assignedCharId);

      if (Object.keys(output).length > 0) {
        breakdown.push({
          buildingName: pb.building.name,
          level: pb.level,
          hasWorker: !!pb.assignedCharId,
          output,
        });

        for (const [resource, amount] of Object.entries(output)) {
          totalOutput[resource] = (totalOutput[resource] ?? 0) + amount;
        }
      }
    }

    // 计算消耗（人口消耗粮食等）
    const characters = await ctx.db.playerCharacter.findMany({
      where: { playerId: player.id },
    });

    const consumption: Record<string, number> = {
      food: characters.length * 5, // 每个角色每日消耗5粮食
    };

    // 净收入
    const netOutput: Record<string, number> = {};
    for (const resource of Object.keys(totalOutput)) {
      netOutput[resource] = (totalOutput[resource] ?? 0) - (consumption[resource] ?? 0);
    }

    return {
      totalOutput,
      consumption,
      netOutput,
      breakdown,
    };
  }),

  // 领取每日产出（结算时调用）
  collectDailyOutput: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const buildings = await ctx.db.playerBuilding.findMany({
      where: { playerId: player.id },
      include: { building: true },
    });

    const totalOutput: Record<string, number> = {
      gold: 0,
      wood: 0,
      stone: 0,
      food: 0,
    };

    for (const pb of buildings) {
      const output = calculateBuildingOutput(pb.building.name, pb.level, !!pb.assignedCharId);
      for (const [resource, amount] of Object.entries(output)) {
        totalOutput[resource] = (totalOutput[resource] ?? 0) + amount;
      }
    }

    // 计算消耗
    const characters = await ctx.db.playerCharacter.findMany({
      where: { playerId: player.id },
    });
    const foodConsumption = characters.length * 5;

    // 更新资源
    await ctx.db.player.update({
      where: { id: player.id },
      data: {
        gold: player.gold + (totalOutput.gold ?? 0),
        wood: player.wood + (totalOutput.wood ?? 0),
        stone: player.stone + (totalOutput.stone ?? 0),
        food: Math.max(0, player.food + (totalOutput.food ?? 0) - foodConsumption),
      },
    });

    // 记录经济日志
    const currentDay = getCurrentGameDay();
    await ctx.db.economyLog.upsert({
      where: {
        playerId_day: { playerId: player.id, day: currentDay },
      },
      update: {
        goldIncome: totalOutput.gold ?? 0,
        woodIncome: totalOutput.wood ?? 0,
        stoneIncome: totalOutput.stone ?? 0,
        foodIncome: totalOutput.food ?? 0,
        foodExpense: foodConsumption,
      },
      create: {
        playerId: player.id,
        day: currentDay,
        goldIncome: totalOutput.gold ?? 0,
        woodIncome: totalOutput.wood ?? 0,
        stoneIncome: totalOutput.stone ?? 0,
        foodIncome: totalOutput.food ?? 0,
        foodExpense: foodConsumption,
      },
    });

    // 记录生产分数
    const productionScore = Object.values(totalOutput).reduce((sum, v) => sum + Math.floor(v / 10), 0);
    if (productionScore > 0) {
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: currentDay,
          type: "production",
          description: "建筑每日产出",
          baseScore: productionScore,
        },
      });

      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + productionScore },
      });
    }

    return {
      collected: true,
      output: totalOutput,
      consumption: { food: foodConsumption },
    };
  }),
});
