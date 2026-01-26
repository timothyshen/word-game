import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 商店物品定义
interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "card" | "resource" | "special";
  price: {
    gold?: number;
    crystals?: number;
  };
  stock?: number; // 每日限购数量，undefined 为无限
  cardId?: string; // 如果是卡牌类型
  effect?: {
    type: string;
    value: number;
  };
}

// 商店配置
const SHOP_ITEMS: ShopItem[] = [
  // 资源类
  {
    id: "wood_pack_s",
    name: "木材包（小）",
    icon: "🪵",
    description: "获得100木材",
    category: "resource",
    price: { gold: 50 },
    effect: { type: "wood", value: 100 },
  },
  {
    id: "wood_pack_m",
    name: "木材包（中）",
    icon: "🪵",
    description: "获得500木材",
    category: "resource",
    price: { gold: 200 },
    effect: { type: "wood", value: 500 },
  },
  {
    id: "stone_pack_s",
    name: "石材包（小）",
    icon: "🪨",
    description: "获得100石材",
    category: "resource",
    price: { gold: 60 },
    effect: { type: "stone", value: 100 },
  },
  {
    id: "stone_pack_m",
    name: "石材包（中）",
    icon: "🪨",
    description: "获得500石材",
    category: "resource",
    price: { gold: 250 },
    effect: { type: "stone", value: 500 },
  },
  {
    id: "food_pack_s",
    name: "粮食包（小）",
    icon: "🌾",
    description: "获得100粮食",
    category: "resource",
    price: { gold: 40 },
    effect: { type: "food", value: 100 },
  },
  {
    id: "food_pack_m",
    name: "粮食包（中）",
    icon: "🌾",
    description: "获得500粮食",
    category: "resource",
    price: { gold: 160 },
    effect: { type: "food", value: 500 },
  },

  // 特殊物品
  {
    id: "stamina_potion",
    name: "体力药水",
    icon: "⚡",
    description: "恢复50点体力",
    category: "special",
    price: { gold: 100 },
    stock: 5,
    effect: { type: "stamina", value: 50 },
  },
  {
    id: "crystal_pack",
    name: "水晶包",
    icon: "💎",
    description: "获得10水晶",
    category: "special",
    price: { gold: 500 },
    stock: 3,
    effect: { type: "crystals", value: 10 },
  },
  {
    id: "exp_book_s",
    name: "经验书（小）",
    icon: "📕",
    description: "获得100经验值",
    category: "special",
    price: { gold: 150 },
    effect: { type: "exp", value: 100 },
  },
  {
    id: "exp_book_m",
    name: "经验书（中）",
    icon: "📗",
    description: "获得500经验值",
    category: "special",
    price: { gold: 600 },
    effect: { type: "exp", value: 500 },
  },

  // 高级物品（水晶购买）
  {
    id: "rare_card_pack",
    name: "稀有卡包",
    icon: "🎴",
    description: "随机获得一张稀有卡牌",
    category: "card",
    price: { crystals: 50 },
    stock: 1,
  },
  {
    id: "epic_card_pack",
    name: "史诗卡包",
    icon: "🃏",
    description: "随机获得一张史诗卡牌",
    category: "card",
    price: { crystals: 150 },
    stock: 1,
  },
];

// 获取今天的日期字符串
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const shopRouter = createTRPCRouter({
  // 获取商店物品列表
  getItems: protectedProcedure
    .input(z.object({ category: z.enum(["all", "card", "resource", "special"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const today = getTodayString();

      // 获取今日购买记录
      const purchases = await ctx.db.shopPurchase.findMany({
        where: { playerId: player.id, date: today },
      });

      const purchaseMap = new Map(purchases.map((p) => [p.itemId, p.quantity]));

      // 过滤和处理物品列表
      const items = SHOP_ITEMS.filter(
        (item) => input.category === "all" || item.category === input.category
      ).map((item) => {
        const purchased = purchaseMap.get(item.id) ?? 0;
        const remaining = item.stock !== undefined ? item.stock - purchased : undefined;

        return {
          ...item,
          purchased,
          remaining,
          canBuy:
            (remaining === undefined || remaining > 0) &&
            ((item.price.gold ?? 0) <= player.gold) &&
            ((item.price.crystals ?? 0) <= player.crystals),
        };
      });

      return {
        items,
        playerResources: {
          gold: player.gold,
          crystals: player.crystals,
        },
      };
    }),

  // 购买物品
  buy: protectedProcedure
    .input(z.object({ itemId: z.string(), quantity: z.number().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const item = SHOP_ITEMS.find((i) => i.id === input.itemId);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "物品不存在" });
      }

      const today = getTodayString();

      // 检查限购
      if (item.stock !== undefined) {
        const todayPurchase = await ctx.db.shopPurchase.findUnique({
          where: { playerId_itemId_date: { playerId: player.id, itemId: input.itemId, date: today } },
        });

        const alreadyPurchased = todayPurchase?.quantity ?? 0;
        if (alreadyPurchased + input.quantity > item.stock) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `该物品今日限购${item.stock}个，已购买${alreadyPurchased}个`,
          });
        }
      }

      // 计算总价
      const totalGold = (item.price.gold ?? 0) * input.quantity;
      const totalCrystals = (item.price.crystals ?? 0) * input.quantity;

      // 检查资源
      if (player.gold < totalGold) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
      }
      if (player.crystals < totalCrystals) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });
      }

      // 扣除资源
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: player.gold - totalGold,
          crystals: player.crystals - totalCrystals,
        },
      });

      // 记录购买
      if (item.stock !== undefined) {
        await ctx.db.shopPurchase.upsert({
          where: { playerId_itemId_date: { playerId: player.id, itemId: input.itemId, date: today } },
          update: { quantity: { increment: input.quantity } },
          create: { playerId: player.id, itemId: input.itemId, date: today, quantity: input.quantity },
        });
      }

      // 发放物品效果
      let result: Record<string, unknown> = {};

      if (item.effect) {
        const totalEffect = item.effect.value * input.quantity;

        switch (item.effect.type) {
          case "wood":
            await ctx.db.player.update({
              where: { id: player.id },
              data: { wood: { increment: totalEffect } },
            });
            result = { resourceGained: { wood: totalEffect } };
            break;
          case "stone":
            await ctx.db.player.update({
              where: { id: player.id },
              data: { stone: { increment: totalEffect } },
            });
            result = { resourceGained: { stone: totalEffect } };
            break;
          case "food":
            await ctx.db.player.update({
              where: { id: player.id },
              data: { food: { increment: totalEffect } },
            });
            result = { resourceGained: { food: totalEffect } };
            break;
          case "crystals":
            await ctx.db.player.update({
              where: { id: player.id },
              data: { crystals: { increment: totalEffect } },
            });
            result = { resourceGained: { crystals: totalEffect } };
            break;
          case "stamina":
            const newStamina = Math.min(player.stamina + totalEffect, player.maxStamina);
            await ctx.db.player.update({
              where: { id: player.id },
              data: { stamina: newStamina, lastStaminaUpdate: new Date() },
            });
            result = { staminaRestored: newStamina - player.stamina };
            break;
          case "exp":
            await ctx.db.player.update({
              where: { id: player.id },
              data: { exp: { increment: totalEffect } },
            });
            result = { expGained: totalEffect };
            break;
        }
      }

      // 处理卡包
      if (item.category === "card") {
        const rarity = item.id === "epic_card_pack" ? "史诗" : "稀有";
        const cards = await ctx.db.card.findMany({ where: { rarity } });

        if (cards.length > 0) {
          const grantedCards: Array<{ name: string; rarity: string }> = [];

          for (let i = 0; i < input.quantity; i++) {
            const card = cards[Math.floor(Math.random() * cards.length)]!;
            const existing = await ctx.db.playerCard.findUnique({
              where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
            });

            if (existing) {
              await ctx.db.playerCard.update({
                where: { id: existing.id },
                data: { quantity: { increment: 1 } },
              });
            } else {
              await ctx.db.playerCard.create({
                data: { playerId: player.id, cardId: card.id, quantity: 1 },
              });
            }

            grantedCards.push({ name: card.name, rarity: card.rarity });
          }

          result = { cardsGranted: grantedCards };
        }
      }

      return {
        success: true,
        itemName: item.name,
        quantity: input.quantity,
        cost: { gold: totalGold, crystals: totalCrystals },
        ...result,
      };
    }),

  // 出售物品（卡牌分解）
  sell: protectedProcedure
    .input(z.object({ cardId: z.string(), quantity: z.number().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取玩家卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < input.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
      }

      // 根据稀有度计算回收价格
      const rarityPrices: Record<string, { gold: number; crystals: number }> = {
        "普通": { gold: 10, crystals: 0 },
        "精良": { gold: 30, crystals: 1 },
        "稀有": { gold: 80, crystals: 3 },
        "史诗": { gold: 200, crystals: 10 },
        "传说": { gold: 500, crystals: 30 },
      };

      const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;
      const totalGold = price.gold * input.quantity;
      const totalCrystals = price.crystals * input.quantity;

      // 减少卡牌数量
      if (playerCard.quantity === input.quantity) {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      } else {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: { decrement: input.quantity } },
        });
      }

      // 增加资源
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          gold: { increment: totalGold },
          crystals: { increment: totalCrystals },
        },
      });

      return {
        success: true,
        cardName: playerCard.card.name,
        cardRarity: playerCard.card.rarity,
        quantity: input.quantity,
        gained: { gold: totalGold, crystals: totalCrystals },
      };
    }),

  // 获取出售价格预览
  getSellPrice: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId },
        include: { card: true },
      });

      if (!playerCard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "未拥有该卡牌" });
      }

      const rarityPrices: Record<string, { gold: number; crystals: number }> = {
        "普通": { gold: 10, crystals: 0 },
        "精良": { gold: 30, crystals: 1 },
        "稀有": { gold: 80, crystals: 3 },
        "史诗": { gold: 200, crystals: 10 },
        "传说": { gold: 500, crystals: 30 },
      };

      const price = rarityPrices[playerCard.card.rarity] ?? rarityPrices["普通"]!;

      return {
        cardName: playerCard.card.name,
        cardRarity: playerCard.card.rarity,
        quantity: playerCard.quantity,
        pricePerUnit: price,
        totalPrice: {
          gold: price.gold * playerCard.quantity,
          crystals: price.crystals * playerCard.quantity,
        },
      };
    }),
});
