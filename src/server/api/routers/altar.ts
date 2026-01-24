import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 稀有度权重
const RARITY_WEIGHTS: Record<string, { weight: number; crystalCost: number }> = {
  "普通": { weight: 50, crystalCost: 0 },
  "精良": { weight: 30, crystalCost: 1 },
  "稀有": { weight: 15, crystalCost: 3 },
  "史诗": { weight: 4, crystalCost: 10 },
  "传说": { weight: 1, crystalCost: 30 },
};

// 根据权重随机选择稀有度
function rollRarity(boosted: boolean = false): string {
  const weights = { ...RARITY_WEIGHTS };
  if (boosted) {
    // 提升抽卡提高稀有度权重
    weights["普通"]!.weight = 30;
    weights["精良"]!.weight = 35;
    weights["稀有"]!.weight = 25;
    weights["史诗"]!.weight = 8;
    weights["传说"]!.weight = 2;
  }

  const total = Object.values(weights).reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, { weight }] of Object.entries(weights)) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return "普通";
}

// 合成配方
interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: Array<{ rarity: string; count: number }>;
  resultRarity: string;
  resultType?: string; // 可选：指定产出类型
}

const RECIPES: Recipe[] = [
  {
    id: "basic_upgrade",
    name: "品质提升",
    description: "3张同稀有度卡牌合成1张更高品质卡牌",
    materials: [{ rarity: "same", count: 3 }],
    resultRarity: "next",
  },
  {
    id: "crystal_extraction",
    name: "水晶提取",
    description: "5张任意卡牌分解为水晶",
    materials: [{ rarity: "any", count: 5 }],
    resultRarity: "crystals",
  },
];

export const altarRouter = createTRPCRouter({
  // 获取祭坛状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 统计卡牌数量
    const cardStats: Record<string, number> = {
      "普通": 0,
      "精良": 0,
      "稀有": 0,
      "史诗": 0,
      "传说": 0,
    };

    for (const pc of player.cards) {
      const rarity = pc.card.rarity;
      cardStats[rarity] = (cardStats[rarity] ?? 0) + pc.quantity;
    }

    return {
      crystals: player.crystals,
      gold: player.gold,
      cardStats,
      recipes: RECIPES,
      drawCost: {
        normal: { crystals: 5 },
        boosted: { crystals: 15 },
        tenPull: { crystals: 45 }, // 10连抽有折扣
      },
    };
  }),

  // 单抽
  drawSingle: protectedProcedure
    .input(z.object({ boosted: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const cost = input.boosted ? 15 : 5;
      if (player.crystals < cost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });
      }

      // 扣除水晶
      await ctx.db.player.update({
        where: { id: player.id },
        data: { crystals: player.crystals - cost },
      });

      // 随机稀有度
      const rarity = rollRarity(input.boosted);

      // 获取对应稀有度的卡牌
      const cards = await ctx.db.card.findMany({
        where: { rarity },
      });

      if (cards.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "没有可用卡牌" });
      }

      const card = cards[Math.floor(Math.random() * cards.length)]!;

      // 添加到玩家背包
      const existing = await ctx.db.playerCard.findUnique({
        where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
      });

      if (existing) {
        await ctx.db.playerCard.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + 1 },
        });
      } else {
        await ctx.db.playerCard.create({
          data: { playerId: player.id, cardId: card.id, quantity: 1 },
        });
      }

      return {
        card: {
          id: card.id,
          name: card.name,
          type: card.type,
          rarity: card.rarity,
          icon: card.icon,
          description: card.description,
        },
        isNew: !existing,
        cost,
      };
    }),

  // 十连抽
  drawTen: protectedProcedure
    .input(z.object({ boosted: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const cost = input.boosted ? 135 : 45; // 10连抽折扣
      if (player.crystals < cost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });
      }

      // 扣除水晶
      await ctx.db.player.update({
        where: { id: player.id },
        data: { crystals: player.crystals - cost },
      });

      const results: Array<{
        id: string;
        name: string;
        type: string;
        rarity: string;
        icon: string;
        description: string;
        isNew: boolean;
      }> = [];

      // 十连抽保底机制：至少1张精良
      let hasGoodCard = false;

      for (let i = 0; i < 10; i++) {
        let rarity = rollRarity(input.boosted);

        // 最后一抽保底
        if (i === 9 && !hasGoodCard) {
          rarity = "精良";
        }

        if (rarity !== "普通") {
          hasGoodCard = true;
        }

        const cards = await ctx.db.card.findMany({ where: { rarity } });
        if (cards.length === 0) continue;

        const card = cards[Math.floor(Math.random() * cards.length)]!;

        const existing = await ctx.db.playerCard.findUnique({
          where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
        });

        if (existing) {
          await ctx.db.playerCard.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + 1 },
          });
        } else {
          await ctx.db.playerCard.create({
            data: { playerId: player.id, cardId: card.id, quantity: 1 },
          });
        }

        results.push({
          id: card.id,
          name: card.name,
          type: card.type,
          rarity: card.rarity,
          icon: card.icon,
          description: card.description,
          isNew: !existing,
        });
      }

      return { cards: results, cost };
    }),

  // 献祭卡牌（获得水晶/金币）
  sacrifice: protectedProcedure
    .input(z.object({
      cardIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: {
          cards: {
            where: { cardId: { in: input.cardIds } },
            include: { card: true },
          },
        },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      let totalCrystals = 0;
      let totalGold = 0;
      const sacrificedCards: string[] = [];

      for (const cardId of input.cardIds) {
        const playerCard = player.cards.find(pc => pc.cardId === cardId);
        if (!playerCard || playerCard.quantity <= 0) continue;

        // 计算献祭奖励
        const rarityRewards: Record<string, { crystals: number; gold: number }> = {
          "普通": { crystals: 1, gold: 10 },
          "精良": { crystals: 2, gold: 25 },
          "稀有": { crystals: 5, gold: 50 },
          "史诗": { crystals: 15, gold: 100 },
          "传说": { crystals: 50, gold: 250 },
        };

        const reward = rarityRewards[playerCard.card.rarity] ?? rarityRewards["普通"]!;
        totalCrystals += reward.crystals;
        totalGold += reward.gold;
        sacrificedCards.push(playerCard.card.name);

        // 减少卡牌数量
        if (playerCard.quantity === 1) {
          await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
        } else {
          await ctx.db.playerCard.update({
            where: { id: playerCard.id },
            data: { quantity: playerCard.quantity - 1 },
          });
        }
      }

      // 增加玩家资源
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          crystals: player.crystals + totalCrystals,
          gold: player.gold + totalGold,
        },
      });

      return {
        sacrificedCards,
        rewards: {
          crystals: totalCrystals,
          gold: totalGold,
        },
      };
    }),

  // 合成卡牌
  synthesize: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      materialCardIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: {
          cards: {
            include: { card: true },
          },
        },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const recipe = RECIPES.find(r => r.id === input.recipeId);
      if (!recipe) {
        throw new TRPCError({ code: "NOT_FOUND", message: "配方不存在" });
      }

      // 验证材料
      const materialCards = input.materialCardIds.map(id => {
        const pc = player.cards.find(c => c.cardId === id);
        if (!pc || pc.quantity <= 0) return null;
        return pc;
      }).filter(Boolean);

      if (materialCards.length !== input.materialCardIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "材料卡牌不足" });
      }

      // 品质提升配方
      if (recipe.id === "basic_upgrade") {
        if (materialCards.length !== 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "需要3张卡牌" });
        }

        const firstRarity = materialCards[0]!.card.rarity;
        const allSameRarity = materialCards.every(pc => pc!.card.rarity === firstRarity);
        if (!allSameRarity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "需要3张相同稀有度的卡牌" });
        }

        // 确定产出稀有度
        const rarityOrder = ["普通", "精良", "稀有", "史诗", "传说"];
        const currentIndex = rarityOrder.indexOf(firstRarity);
        if (currentIndex >= rarityOrder.length - 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "传说卡牌无法再合成" });
        }
        const nextRarity = rarityOrder[currentIndex + 1]!;

        // 消耗材料
        for (const pc of materialCards) {
          if (pc!.quantity === 1) {
            await ctx.db.playerCard.delete({ where: { id: pc!.id } });
          } else {
            await ctx.db.playerCard.update({
              where: { id: pc!.id },
              data: { quantity: pc!.quantity - 1 },
            });
          }
        }

        // 随机获得新卡
        const cards = await ctx.db.card.findMany({ where: { rarity: nextRarity } });
        if (cards.length === 0) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "没有可用卡牌" });
        }

        const newCard = cards[Math.floor(Math.random() * cards.length)]!;

        const existing = await ctx.db.playerCard.findUnique({
          where: { playerId_cardId: { playerId: player.id, cardId: newCard.id } },
        });

        if (existing) {
          await ctx.db.playerCard.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + 1 },
          });
        } else {
          await ctx.db.playerCard.create({
            data: { playerId: player.id, cardId: newCard.id, quantity: 1 },
          });
        }

        return {
          success: true,
          recipe: recipe.name,
          consumedCount: 3,
          result: {
            id: newCard.id,
            name: newCard.name,
            type: newCard.type,
            rarity: newCard.rarity,
            icon: newCard.icon,
            description: newCard.description,
          },
          isNew: !existing,
        };
      }

      // 水晶提取配方
      if (recipe.id === "crystal_extraction") {
        if (materialCards.length !== 5) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "需要5张卡牌" });
        }

        let totalCrystals = 0;
        const rarityRewards: Record<string, number> = {
          "普通": 2,
          "精良": 4,
          "稀有": 8,
          "史诗": 20,
          "传说": 60,
        };

        for (const pc of materialCards) {
          totalCrystals += rarityRewards[pc!.card.rarity] ?? 2;

          if (pc!.quantity === 1) {
            await ctx.db.playerCard.delete({ where: { id: pc!.id } });
          } else {
            await ctx.db.playerCard.update({
              where: { id: pc!.id },
              data: { quantity: pc!.quantity - 1 },
            });
          }
        }

        await ctx.db.player.update({
          where: { id: player.id },
          data: { crystals: player.crystals + totalCrystals },
        });

        return {
          success: true,
          recipe: recipe.name,
          consumedCount: 5,
          crystalsGained: totalCrystals,
        };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "未知配方" });
    }),
});
