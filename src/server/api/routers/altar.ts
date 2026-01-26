import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 祭坛类型定义
interface AltarType {
  id: string;
  name: string;
  icon: string;
  description: string;
  cardRarityWeights: Record<string, number>;
  guardianBoss: {
    name: string;
    icon: string;
    level: number;
    hp: number;
    attack: number;
    defense: number;
  };
}

// 祭坛类型
const ALTAR_TYPES: AltarType[] = [
  {
    id: "basic_altar",
    name: "普通祭坛",
    icon: "🗿",
    description: "散发微弱光芒的古老祭坛",
    cardRarityWeights: { "普通": 60, "精良": 30, "稀有": 10 },
    guardianBoss: {
      name: "祭坛守卫",
      icon: "👻",
      level: 5,
      hp: 100,
      attack: 15,
      defense: 8,
    },
  },
  {
    id: "sacred_altar",
    name: "神圣祭坛",
    icon: "⛩️",
    description: "蕴含神圣力量的祭坛",
    cardRarityWeights: { "普通": 30, "精良": 40, "稀有": 25, "史诗": 5 },
    guardianBoss: {
      name: "神殿守护者",
      icon: "🗡️",
      level: 15,
      hp: 300,
      attack: 40,
      defense: 25,
    },
  },
  {
    id: "ancient_altar",
    name: "远古祭坛",
    icon: "🏛️",
    description: "远古文明遗留的神秘祭坛",
    cardRarityWeights: { "精良": 30, "稀有": 40, "史诗": 25, "传说": 5 },
    guardianBoss: {
      name: "远古守护者",
      icon: "🐲",
      level: 30,
      hp: 800,
      attack: 100,
      defense: 60,
    },
  },
];

// 根据权重随机选择稀有度
function rollRarity(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of Object.entries(weights)) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return "普通";
}

// 获取今天的日期字符串（用于每日重置）
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const altarRouter = createTRPCRouter({
  // 获取已发现的祭坛列表
  getDiscoveredAltars: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 获取所有已发现的祭坛类型设施
    const altars = await ctx.db.wildernessFacility.findMany({
      where: {
        playerId: player.id,
        type: "altar",
        isDiscovered: true,
      },
    });

    const today = getTodayString();

    return altars.map(altar => {
      const data = JSON.parse(altar.data) as {
        altarType: string;
        lastCollectedDate?: string;
        isDefeated?: boolean;
      };
      const altarType = ALTAR_TYPES.find(t => t.id === data.altarType) ?? ALTAR_TYPES[0]!;
      const canCollect = data.isDefeated && data.lastCollectedDate !== today;

      return {
        id: altar.id,
        name: altar.name,
        icon: altar.icon,
        description: altar.description,
        position: { x: altar.positionX, y: altar.positionY },
        worldId: altar.worldId,
        altarType: altarType.id,
        altarTypeName: altarType.name,
        isDefeated: data.isDefeated ?? false,
        canCollect,
        lastCollectedDate: data.lastCollectedDate,
        guardianBoss: !data.isDefeated ? altarType.guardianBoss : null,
      };
    });
  }),

  // 挑战祭坛守卫Boss
  challengeGuardian: protectedProcedure
    .input(z.object({ altarId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { characters: { include: { character: true } } },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const altar = await ctx.db.wildernessFacility.findFirst({
        where: { id: input.altarId, playerId: player.id, type: "altar" },
      });

      if (!altar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "祭坛不存在" });
      }

      const data = JSON.parse(altar.data) as {
        altarType: string;
        isDefeated?: boolean;
      };

      if (data.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "守卫已被击败" });
      }

      const altarType = ALTAR_TYPES.find(t => t.id === data.altarType);
      if (!altarType) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });
      }

      // 检查体力
      const staminaCost = 30;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 消耗体力
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      // 计算战斗力
      const boss = altarType.guardianBoss;
      const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
      const charactersPower = player.characters.reduce(
        (sum, c) => sum + c.attack + c.defense + c.speed,
        0
      );
      const totalPower = playerPower + charactersPower;
      const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;

      // 战斗判定
      const powerRatio = totalPower / bossPower;
      const baseWinChance = Math.min(0.85, Math.max(0.15, powerRatio * 0.5));
      const victory = Math.random() < baseWinChance;

      if (victory) {
        // 更新祭坛状态为已击败
        data.isDefeated = true;
        await ctx.db.wildernessFacility.update({
          where: { id: altar.id },
          data: { data: JSON.stringify(data) },
        });

        // 奖励
        const rewards = {
          gold: boss.level * 50,
          exp: boss.level * 30,
          crystals: Math.floor(boss.level / 5) + 1,
        };

        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            exp: player.exp + rewards.exp,
            crystals: player.crystals + rewards.crystals,
          },
        });

        return {
          victory: true,
          bossName: boss.name,
          message: `击败了${boss.name}！祭坛已被净化，现在可以每日收集卡牌了。`,
          rewards,
        };
      } else {
        return {
          victory: false,
          bossName: boss.name,
          message: `败给了${boss.name}...提升实力后再来挑战吧！`,
        };
      }
    }),

  // 从祭坛收集每日卡牌
  collectDailyCard: protectedProcedure
    .input(z.object({ altarId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const altar = await ctx.db.wildernessFacility.findFirst({
        where: { id: input.altarId, playerId: player.id, type: "altar" },
      });

      if (!altar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "祭坛不存在" });
      }

      const data = JSON.parse(altar.data) as {
        altarType: string;
        lastCollectedDate?: string;
        isDefeated?: boolean;
      };

      if (!data.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败祭坛守卫" });
      }

      const today = getTodayString();
      if (data.lastCollectedDate === today) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "今日已收集过卡牌" });
      }

      const altarType = ALTAR_TYPES.find(t => t.id === data.altarType);
      if (!altarType) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "祭坛类型无效" });
      }

      // 随机稀有度
      const rarity = rollRarity(altarType.cardRarityWeights);

      // 获取对应稀有度的卡牌
      const cards = await ctx.db.card.findMany({ where: { rarity } });
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

      // 更新收集日期
      data.lastCollectedDate = today;
      await ctx.db.wildernessFacility.update({
        where: { id: altar.id },
        data: { data: JSON.stringify(data) },
      });

      // Check if card unlocks breakthrough system (card name contains "突破")
      if (card.name.includes("突破")) {
        await ctx.db.unlockFlag.upsert({
          where: {
            playerId_flagName: {
              playerId: player.id,
              flagName: "breakthrough_system",
            },
          },
          update: {},
          create: {
            playerId: player.id,
            flagName: "breakthrough_system",
          },
        });
      }

      return {
        success: true,
        altarName: altar.name,
        card: {
          id: card.id,
          name: card.name,
          type: card.type,
          rarity: card.rarity,
          icon: card.icon,
          description: card.description,
        },
        isNew: !existing,
        message: `从${altar.name}获得了${card.rarity}卡牌：${card.name}`,
      };
    }),

  // 一键收集所有祭坛的每日卡牌
  collectAllDailyCards: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const altars = await ctx.db.wildernessFacility.findMany({
      where: {
        playerId: player.id,
        type: "altar",
        isDiscovered: true,
      },
    });

    const today = getTodayString();
    const collectedCards: Array<{
      altarName: string;
      card: { name: string; rarity: string; icon: string };
    }> = [];

    for (const altar of altars) {
      const data = JSON.parse(altar.data) as {
        altarType: string;
        lastCollectedDate?: string;
        isDefeated?: boolean;
      };

      // 跳过未击败或已收集的祭坛
      if (!data.isDefeated || data.lastCollectedDate === today) {
        continue;
      }

      const altarType = ALTAR_TYPES.find(t => t.id === data.altarType);
      if (!altarType) continue;

      // 随机稀有度
      const rarity = rollRarity(altarType.cardRarityWeights);

      // 获取对应稀有度的卡牌
      const cards = await ctx.db.card.findMany({ where: { rarity } });
      if (cards.length === 0) continue;

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

      // 更新收集日期
      data.lastCollectedDate = today;
      await ctx.db.wildernessFacility.update({
        where: { id: altar.id },
        data: { data: JSON.stringify(data) },
      });

      // Check if card unlocks breakthrough system (card name contains "突破")
      if (card.name.includes("突破")) {
        await ctx.db.unlockFlag.upsert({
          where: {
            playerId_flagName: {
              playerId: player.id,
              flagName: "breakthrough_system",
            },
          },
          update: {},
          create: {
            playerId: player.id,
            flagName: "breakthrough_system",
          },
        });
      }

      collectedCards.push({
        altarName: altar.name,
        card: { name: card.name, rarity: card.rarity, icon: card.icon },
      });
    }

    return {
      success: true,
      collectedCount: collectedCards.length,
      cards: collectedCards,
      message: collectedCards.length > 0
        ? `从${collectedCards.length}个祭坛收集了卡牌`
        : "没有可收集的祭坛",
    };
  }),

  // 获取祭坛类型列表（用于前端展示）
  getAltarTypes: protectedProcedure.query(() => {
    return ALTAR_TYPES.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      description: t.description,
      bossLevel: t.guardianBoss.level,
      bossName: t.guardianBoss.name,
    }));
  }),
});
