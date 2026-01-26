import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 计算当前体力（基于上次更新时间）
function calculateCurrentStamina(
  lastStamina: number,
  maxStamina: number,
  staminaPerMin: number,
  lastUpdate: Date
): { stamina: number; shouldUpdate: boolean } {
  const now = new Date();
  const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  const regenerated = Math.floor(minutesPassed * staminaPerMin);

  if (regenerated <= 0) {
    return { stamina: lastStamina, shouldUpdate: false };
  }

  const newStamina = Math.min(lastStamina + regenerated, maxStamina);
  return { stamina: newStamina, shouldUpdate: newStamina !== lastStamina };
}

// 获取当前游戏日（基于服务器时间，0点结算）
function getCurrentGameDay(): number {
  const now = new Date();
  // 以2024-01-01为游戏第1天
  const gameStart = new Date("2024-01-01T00:00:00Z");
  const daysPassed = Math.floor((now.getTime() - gameStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysPassed + 1;
}

export const playerRouter = createTRPCRouter({
  // 获取或创建玩家存档
  getOrCreate: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    let player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        profession: { include: { profession: true } },
        learnedSkills: { include: { skill: true } },
      },
    });

    if (!player) {
      // 创建新玩家
      player = await ctx.db.player.create({
        data: {
          userId,
          name: ctx.session.user.name ?? "旅行者",
          title: "领主",
          lastSettlementDay: getCurrentGameDay() - 1, // 确保首次登录不会立即触发结算
          gold: 500,
          wood: 200,
          stone: 100,
          food: 300,
          stamina: 100,
          maxStamina: 100,
          strength: 10,
          agility: 10,
          intellect: 10,
          charisma: 14,
        },
        include: {
          profession: { include: { profession: true } },
          learnedSkills: { include: { skill: true } },
        },
      });

      // 初始化主城堡
      const mainCastle = await ctx.db.building.findFirst({
        where: { name: "主城堡" },
      });
      if (mainCastle) {
        await ctx.db.playerBuilding.create({
          data: {
            playerId: player.id,
            buildingId: mainCastle.id,
            level: 1,
            positionX: 0,
            positionY: 0,
          },
        });
      }

      // 初始化农田
      const farmland = await ctx.db.building.findFirst({
        where: { name: "农田" },
      });
      if (farmland) {
        await ctx.db.playerBuilding.create({
          data: {
            playerId: player.id,
            buildingId: farmland.id,
            level: 1,
            positionX: 1,
            positionY: 0,
          },
        });
      }

      // 创建玩家初始角色（领主本人）
      const lordCharacter = await ctx.db.character.findFirst({
        where: { name: "流浪剑士" },
      });
      if (lordCharacter) {
        await ctx.db.playerCharacter.create({
          data: {
            playerId: player.id,
            characterId: lordCharacter.id,
            level: 1,
            tier: 1,
            hp: lordCharacter.baseHp,
            maxHp: lordCharacter.baseHp,
            mp: lordCharacter.baseMp,
            maxMp: lordCharacter.baseMp,
            attack: lordCharacter.baseAttack,
            defense: lordCharacter.baseDefense,
            speed: lordCharacter.baseSpeed,
            luck: lordCharacter.baseLuck,
          },
        });
      }

      // 给玩家一些初始卡牌
      const starterCards = await ctx.db.card.findMany({
        where: {
          OR: [
            { name: "回复药水" },
            { name: "经验书" },
          ],
        },
      });
      for (const card of starterCards) {
        await ctx.db.playerCard.create({
          data: {
            playerId: player.id,
            cardId: card.id,
            quantity: 3,
          },
        });
      }
    }

    // 计算实时体力
    const { stamina, shouldUpdate } = calculateCurrentStamina(
      player.stamina,
      player.maxStamina,
      player.staminaPerMin,
      player.lastStaminaUpdate
    );

    // 更新体力（如果有变化）
    if (shouldUpdate) {
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina,
          lastStaminaUpdate: new Date(),
        },
      });
      player.stamina = stamina;
    }

    // 计算技能槽上限
    const skillSlots = player.tier * 6;

    return {
      ...player,
      skillSlots,
      currentGameDay: getCurrentGameDay(),
    };
  }),

  // 获取玩家详细状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        profession: { include: { profession: true } },
        characters: {
          include: {
            character: true,
            profession: { include: { profession: true } },
            learnedSkills: { include: { skill: true } },
          },
        },
        cards: { include: { card: true } },
        buildings: { include: { building: true } },
        learnedSkills: { include: { skill: true } },
      },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 计算实时体力
    const { stamina } = calculateCurrentStamina(
      player.stamina,
      player.maxStamina,
      player.staminaPerMin,
      player.lastStaminaUpdate
    );

    return {
      ...player,
      stamina,
      skillSlots: player.tier * 6,
      currentGameDay: getCurrentGameDay(),
    };
  }),

  // 消耗体力
  consumeStamina: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 计算当前体力
      const { stamina: currentStamina } = calculateCurrentStamina(
        player.stamina,
        player.maxStamina,
        player.staminaPerMin,
        player.lastStaminaUpdate
      );

      if (currentStamina < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      const newStamina = currentStamina - input.amount;

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: newStamina,
          lastStaminaUpdate: new Date(),
        },
      });

      return { stamina: newStamina, consumed: input.amount };
    }),

  // 更新资源
  updateResources: protectedProcedure
    .input(
      z.object({
        gold: z.number().optional(),
        wood: z.number().optional(),
        stone: z.number().optional(),
        food: z.number().optional(),
        crystals: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 计算新资源值（不能为负）
      const newGold = Math.max(0, player.gold + (input.gold ?? 0));
      const newWood = Math.max(0, player.wood + (input.wood ?? 0));
      const newStone = Math.max(0, player.stone + (input.stone ?? 0));
      const newFood = Math.max(0, player.food + (input.food ?? 0));
      const newCrystals = Math.max(0, player.crystals + (input.crystals ?? 0));

      const updated = await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: newGold,
          wood: newWood,
          stone: newStone,
          food: newFood,
          crystals: newCrystals,
        },
      });

      return {
        gold: updated.gold,
        wood: updated.wood,
        stone: updated.stone,
        food: updated.food,
        crystals: updated.crystals,
      };
    }),

  // 记录行动（用于结算分数）
  logAction: protectedProcedure
    .input(
      z.object({
        type: z.enum(["build", "explore", "combat", "upgrade", "production", "recruit"]),
        description: z.string(),
        baseScore: z.number(),
        bonus: z.number().optional(),
        bonusReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const currentDay = getCurrentGameDay();
      const totalScore = input.baseScore + (input.bonus ?? 0);

      // 创建行动记录
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: currentDay,
          type: input.type,
          description: input.description,
          baseScore: input.baseScore,
          bonus: input.bonus ?? 0,
          bonusReason: input.bonusReason,
        },
      });

      // 更新当日分数
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          currentDayScore: player.currentDayScore + totalScore,
        },
      });

      return { logged: true, totalScore };
    }),

  // 获取当日行动记录
  getTodayActions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const currentDay = getCurrentGameDay();

    const actions = await ctx.db.actionLog.findMany({
      where: {
        playerId: player.id,
        day: currentDay,
      },
      orderBy: { timestamp: "desc" },
    });

    return {
      day: currentDay,
      actions,
      totalScore: player.currentDayScore,
    };
  }),

  // 玩家升级
  levelUp: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 计算升级所需经验
    const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));

    if (player.exp < expNeeded) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `经验不足，需要 ${expNeeded}，当前 ${player.exp}`,
      });
    }

    // 检查是否达到当前阶位等级上限
    const maxLevelForTier = player.tier * 20;
    if (player.level >= maxLevelForTier) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "已达当前职阶等级上限，请先突破",
      });
    }

    const newLevel = player.level + 1;

    // 属性成长
    const statGrowth = Math.floor(player.level * 0.5) + 1;
    const newStrength = player.strength + statGrowth;
    const newAgility = player.agility + statGrowth;
    const newIntellect = player.intellect + statGrowth;
    const newCharisma = player.charisma + Math.ceil(statGrowth * 0.5);

    // 体力上限增加
    const newMaxStamina = player.maxStamina + 5;

    await ctx.db.player.update({
      where: { id: player.id },
      data: {
        level: newLevel,
        exp: player.exp - expNeeded,
        strength: newStrength,
        agility: newAgility,
        intellect: newIntellect,
        charisma: newCharisma,
        maxStamina: newMaxStamina,
        stamina: newMaxStamina, // 升级回满体力
        lastStaminaUpdate: new Date(),
      },
    });

    return {
      success: true,
      newLevel,
      expUsed: expNeeded,
      remainingExp: player.exp - expNeeded,
      newStats: {
        strength: newStrength,
        agility: newAgility,
        intellect: newIntellect,
        charisma: newCharisma,
        maxStamina: newMaxStamina,
      },
      message: `升级成功！达到 ${newLevel} 级`,
    };
  }),

  // 增加经验值
  addExp: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const newExp = player.exp + input.amount;
      const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
      const maxLevelForTier = player.tier * 20;

      await ctx.db.player.update({
        where: { id: player.id },
        data: { exp: newExp },
      });

      return {
        success: true,
        expAdded: input.amount,
        totalExp: newExp,
        expToNext: expNeeded,
        canLevelUp: newExp >= expNeeded && player.level < maxLevelForTier,
      };
    }),

  // 更新玩家属性
  updateStats: protectedProcedure
    .input(
      z.object({
        strength: z.number().optional(),
        agility: z.number().optional(),
        intellect: z.number().optional(),
        charisma: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const updates: Record<string, number> = {};

      if (input.strength !== undefined) {
        updates.strength = Math.max(1, player.strength + input.strength);
      }
      if (input.agility !== undefined) {
        updates.agility = Math.max(1, player.agility + input.agility);
      }
      if (input.intellect !== undefined) {
        updates.intellect = Math.max(1, player.intellect + input.intellect);
      }
      if (input.charisma !== undefined) {
        updates.charisma = Math.max(1, player.charisma + input.charisma);
      }

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: "没有要更新的属性",
        };
      }

      const updated = await ctx.db.player.update({
        where: { id: player.id },
        data: updates,
      });

      return {
        success: true,
        stats: {
          strength: updated.strength,
          agility: updated.agility,
          intellect: updated.intellect,
          charisma: updated.charisma,
        },
      };
    }),

  // 获取升级信息
  getLevelUpInfo: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const expNeeded = Math.floor(100 * Math.pow(1.15, player.level - 1));
    const maxLevelForTier = player.tier * 20;

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
  }),

  // 记录战斗胜利（用于成就统计）
  recordCombatWin: protectedProcedure
    .input(z.object({ isBoss: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const updates: { combatWins: number; bossKills?: number } = {
        combatWins: player.combatWins + 1,
      };

      if (input.isBoss) {
        updates.bossKills = player.bossKills + 1;
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: updates,
      });

      return {
        success: true,
        combatWins: updates.combatWins,
        bossKills: updates.bossKills ?? player.bossKills,
      };
    }),

  // 记录金币获取（用于成就统计）
  recordGoldEarned: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          totalGoldEarned: player.totalGoldEarned + input.amount,
        },
      });

      return {
        success: true,
        totalGoldEarned: player.totalGoldEarned + input.amount,
      };
    }),
});
