import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCurrentGameDay } from "../utils";

// 根据分数计算评级
function getGrade(score: number): string {
  if (score >= 500) return "S";
  if (score >= 400) return "A";
  if (score >= 300) return "B";
  if (score >= 200) return "C";
  return "D";
}

// 根据分数计算卡牌奖励
function calculateRewards(score: number): { cards: Array<{ rarity: string; count: number }>; bonus: string[] } {
  const cards: Array<{ rarity: string; count: number }> = [];
  const bonus: string[] = [];

  if (score >= 500) {
    cards.push({ rarity: "精良", count: 3 });
    cards.push({ rarity: "稀有", count: 1 });
    bonus.push("随机奖励");
  } else if (score >= 400) {
    cards.push({ rarity: "精良", count: 2 });
    cards.push({ rarity: "稀有", count: 1 });
  } else if (score >= 300) {
    cards.push({ rarity: "普通", count: 3 });
    cards.push({ rarity: "精良", count: 1 });
  } else if (score >= 200) {
    cards.push({ rarity: "普通", count: 2 });
    cards.push({ rarity: "精良", count: 1 });
  } else if (score >= 100) {
    cards.push({ rarity: "普通", count: 2 });
  } else {
    cards.push({ rarity: "普通", count: 1 });
  }

  return { cards, bonus };
}

export const settlementRouter = createTRPCRouter({
  // 检查是否需要结算
  checkSettlement: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const currentDay = getCurrentGameDay();
    const needsSettlement = player.lastSettlementDay < currentDay;

    return {
      needsSettlement,
      currentDay,
      lastSettlementDay: player.lastSettlementDay,
      pendingDays: needsSettlement ? currentDay - player.lastSettlementDay : 0,
    };
  }),

  // 获取结算预览（不实际执行）
  getSettlementPreview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const currentDay = getCurrentGameDay();

    // 获取待结算日期的行动记录
    const actions = await ctx.db.actionLog.findMany({
      where: {
        playerId: player.id,
        day: { gt: player.lastSettlementDay, lte: currentDay },
      },
      orderBy: { timestamp: "asc" },
    });

    // 按日期分组
    const actionsByDay = actions.reduce((acc, action) => {
      const dayActions = acc[action.day] ?? [];
      dayActions.push(action);
      acc[action.day] = dayActions;
      return acc;
    }, {} as Record<number, typeof actions>);

    // 计算每日分数和奖励
    const dailyResults = Object.entries(actionsByDay).map(([day, dayActions]) => {
      const totalScore = dayActions.reduce((sum, a) => sum + a.baseScore + a.bonus, 0);
      const grade = getGrade(totalScore);
      const rewards = calculateRewards(totalScore);

      // 分数明细
      const breakdown = {
        build: dayActions.filter(a => a.type === "build").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        explore: dayActions.filter(a => a.type === "explore").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        combat: dayActions.filter(a => a.type === "combat").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        upgrade: dayActions.filter(a => a.type === "upgrade").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        production: dayActions.filter(a => a.type === "production").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        recruit: dayActions.filter(a => a.type === "recruit").reduce((s, a) => s + a.baseScore + a.bonus, 0),
      };

      return {
        day: parseInt(day),
        totalScore,
        grade,
        rewards,
        breakdown,
        actions: dayActions,
      };
    });

    return {
      pendingDays: currentDay - player.lastSettlementDay,
      dailyResults,
      currentStreakDays: player.streakDays,
    };
  }),

  // 执行结算
  executeSettlement: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const currentDay = getCurrentGameDay();

    if (player.lastSettlementDay >= currentDay) {
      return { settled: false, message: "今日已结算" };
    }

    // 获取待结算的行动记录
    const actions = await ctx.db.actionLog.findMany({
      where: {
        playerId: player.id,
        day: { gt: player.lastSettlementDay, lte: currentDay },
      },
    });

    // 按日期分组计算
    const actionsByDay = actions.reduce((acc, action) => {
      const dayActions = acc[action.day] ?? [];
      dayActions.push(action);
      acc[action.day] = dayActions;
      return acc;
    }, {} as Record<number, typeof actions>);

    const settlementResults = [];
    let newStreakDays = player.streakDays;
    const totalRewardCards: Array<{ rarity: string; count: number }> = [];

    // 处理每一天
    for (let day = player.lastSettlementDay + 1; day <= currentDay; day++) {
      const dayActions = actionsByDay[day] ?? [];
      const totalScore = dayActions.reduce((sum, a) => sum + a.baseScore + a.bonus, 0);
      const grade = getGrade(totalScore);
      const rewards = calculateRewards(totalScore);

      // 分数明细
      const breakdown = {
        build: dayActions.filter(a => a.type === "build").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        explore: dayActions.filter(a => a.type === "explore").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        combat: dayActions.filter(a => a.type === "combat").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        upgrade: dayActions.filter(a => a.type === "upgrade").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        production: dayActions.filter(a => a.type === "production").reduce((s, a) => s + a.baseScore + a.bonus, 0),
        recruit: dayActions.filter(a => a.type === "recruit").reduce((s, a) => s + a.baseScore + a.bonus, 0),
      };

      // 更新连续天数
      if (totalScore >= 200) {
        newStreakDays++;
      } else {
        newStreakDays = 0;
      }

      // 连续奖励
      if (newStreakDays === 3) {
        rewards.cards.push({ rarity: "稀有", count: 1 });
        rewards.bonus.push("连续3日达标奖励");
      }
      if (newStreakDays === 7) {
        rewards.cards.push({ rarity: "史诗", count: 1 });
        rewards.bonus.push("连续7日达标奖励");
      }

      // 累计卡牌奖励
      for (const card of rewards.cards) {
        const existing = totalRewardCards.find(c => c.rarity === card.rarity);
        if (existing) {
          existing.count += card.count;
        } else {
          totalRewardCards.push({ ...card });
        }
      }

      // 创建结算记录
      await ctx.db.settlementLog.create({
        data: {
          playerId: player.id,
          day,
          totalScore,
          grade,
          rewards: JSON.stringify(rewards),
          breakdown: JSON.stringify(breakdown),
        },
      });

      settlementResults.push({
        day,
        totalScore,
        grade,
        rewards,
      });
    }

    // 更新玩家状态
    await ctx.db.player.update({
      where: { id: player.id },
      data: {
        lastSettlementDay: currentDay,
        currentDayScore: 0,
        streakDays: newStreakDays,
      },
    });

    // 实际发放卡牌奖励
    const grantedCards: Array<{ name: string; rarity: string }> = [];

    for (const reward of totalRewardCards) {
      // 获取对应稀有度的卡牌
      const availableCards = await ctx.db.card.findMany({
        where: { rarity: reward.rarity },
      });

      if (availableCards.length === 0) continue;

      // 随机选取卡牌
      for (let i = 0; i < reward.count; i++) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)]!;

        // 检查玩家是否已有此卡
        const existingCard = await ctx.db.playerCard.findUnique({
          where: {
            playerId_cardId: {
              playerId: player.id,
              cardId: randomCard.id,
            },
          },
        });

        if (existingCard) {
          // 增加数量
          await ctx.db.playerCard.update({
            where: { id: existingCard.id },
            data: { quantity: existingCard.quantity + 1 },
          });
        } else {
          // 创建新记录
          await ctx.db.playerCard.create({
            data: {
              playerId: player.id,
              cardId: randomCard.id,
              quantity: 1,
            },
          });
        }

        grantedCards.push({ name: randomCard.name, rarity: randomCard.rarity });
      }
    }

    return {
      settled: true,
      daysSettled: currentDay - player.lastSettlementDay,
      results: settlementResults,
      totalRewardCards,
      grantedCards,
      newStreakDays,
    };
  }),

  // 获取结算历史
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const history = await ctx.db.settlementLog.findMany({
      where: { playerId: player.id },
      orderBy: { day: "desc" },
      take: 30, // 最近30天
    });

    return history.map(log => ({
      ...log,
      rewards: JSON.parse(log.rewards) as { cards: Array<{ rarity: string; count: number }>; bonus: string[] },
      breakdown: JSON.parse(log.breakdown) as Record<string, number>,
    }));
  }),
});
