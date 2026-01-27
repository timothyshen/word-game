import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCurrentGameDay, getWeekStartDate } from "../utils";

// Boss定义
interface BossDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  skills: Array<{
    name: string;
    damage: number;
    effect?: string;
  }>;
  weeklyAttemptLimit: number;
  unlockCondition: {
    tier?: number;
    level?: number;
    world?: string;
  };
  rewards: {
    gold: number;
    crystals: number;
    exp: number;
    cardRarity: string;
    cardChance: number;
  };
}

const BOSSES: BossDefinition[] = [
  {
    id: "goblin_king",
    name: "哥布林王",
    icon: "👺",
    description: "统领哥布林部落的凶残首领",
    level: 10,
    hp: 500,
    attack: 30,
    defense: 15,
    skills: [
      { name: "王者重击", damage: 1.8 },
      { name: "召唤小弟", damage: 0, effect: "summon" },
    ],
    weeklyAttemptLimit: 3,
    unlockCondition: { level: 5 },
    rewards: { gold: 500, crystals: 20, exp: 200, cardRarity: "精良", cardChance: 0.3 },
  },
  {
    id: "fire_dragon",
    name: "炎龙",
    icon: "🐉",
    description: "居住在火焰位面的远古巨龙",
    level: 25,
    hp: 2000,
    attack: 80,
    defense: 40,
    skills: [
      { name: "龙息", damage: 2.0, effect: "burn" },
      { name: "龙爪撕裂", damage: 1.5 },
      { name: "火焰风暴", damage: 2.5, effect: "aoe" },
    ],
    weeklyAttemptLimit: 2,
    unlockCondition: { tier: 2, level: 15, world: "fire_realm" },
    rewards: { gold: 1500, crystals: 50, exp: 500, cardRarity: "稀有", cardChance: 0.4 },
  },
  {
    id: "shadow_lord",
    name: "暗影领主",
    icon: "👤",
    description: "暗影位面的统治者，掌控黑暗力量",
    level: 40,
    hp: 5000,
    attack: 150,
    defense: 80,
    skills: [
      { name: "暗影吞噬", damage: 2.0, effect: "drain" },
      { name: "黑暗降临", damage: 1.5, effect: "blind" },
      { name: "灵魂收割", damage: 3.0 },
    ],
    weeklyAttemptLimit: 1,
    unlockCondition: { tier: 3, level: 30, world: "shadow_realm" },
    rewards: { gold: 3000, crystals: 100, exp: 1000, cardRarity: "史诗", cardChance: 0.5 },
  },
  {
    id: "celestial_guardian",
    name: "天界守护者",
    icon: "👼",
    description: "守护天界入口的神圣存在",
    level: 60,
    hp: 10000,
    attack: 250,
    defense: 150,
    skills: [
      { name: "神圣裁决", damage: 2.5 },
      { name: "天使之翼", damage: 0, effect: "heal" },
      { name: "天堂之怒", damage: 4.0, effect: "holy" },
    ],
    weeklyAttemptLimit: 1,
    unlockCondition: { tier: 5, level: 50, world: "celestial_realm" },
    rewards: { gold: 10000, crystals: 300, exp: 3000, cardRarity: "传说", cardChance: 0.3 },
  },
];

export const bossRouter = createTRPCRouter({
  // 获取所有Boss
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const weekStart = getWeekStartDate();

    // 获取本周挑战记录
    const bossStatuses = await ctx.db.bossStatus.findMany({
      where: {
        playerId: player.id,
        weekStartDate: { gte: weekStart },
      },
    });

    const statusMap = new Map(bossStatuses.map(s => [s.bossId, s]));

    return BOSSES.map(boss => {
      const isUnlocked =
        (!boss.unlockCondition.tier || player.tier >= boss.unlockCondition.tier) &&
        (!boss.unlockCondition.level || player.level >= boss.unlockCondition.level) &&
        (!boss.unlockCondition.world || player.currentWorld === boss.unlockCondition.world);

      const status = statusMap.get(boss.id);
      const weeklyAttempts = status?.weeklyAttempts ?? 0;
      const canChallenge = isUnlocked && weeklyAttempts < boss.weeklyAttemptLimit;

      return {
        id: boss.id,
        name: boss.name,
        icon: boss.icon,
        description: boss.description,
        level: boss.level,
        hp: boss.hp,
        isUnlocked,
        canChallenge,
        weeklyAttempts,
        weeklyAttemptLimit: boss.weeklyAttemptLimit,
        lastDefeat: status?.lastDefeat,
        rewards: boss.rewards,
        unlockCondition: boss.unlockCondition,
      };
    });
  }),

  // 挑战Boss
  challenge: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { characters: { include: { character: true } } },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const boss = BOSSES.find(b => b.id === input.bossId);
      if (!boss) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
      }

      // 检查解锁条件
      if (boss.unlockCondition.tier && player.tier < boss.unlockCondition.tier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.unlockCondition.tier}阶` });
      }
      if (boss.unlockCondition.level && player.level < boss.unlockCondition.level) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.unlockCondition.level}级` });
      }

      // 检查本周挑战次数
      const weekStart = getWeekStartDate();
      let bossStatus = await ctx.db.bossStatus.findUnique({
        where: { playerId_bossId: { playerId: player.id, bossId: input.bossId } },
      });

      if (bossStatus && bossStatus.weekStartDate >= weekStart) {
        if (bossStatus.weeklyAttempts >= boss.weeklyAttemptLimit) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "本周挑战次数已用完" });
        }
      } else {
        // 新的一周，重置计数
        if (bossStatus) {
          await ctx.db.bossStatus.update({
            where: { id: bossStatus.id },
            data: { weeklyAttempts: 0, weekStartDate: weekStart },
          });
          bossStatus.weeklyAttempts = 0;
        }
      }

      // 消耗体力
      const staminaCost = 30;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      // 计算战斗力
      const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
      const charactersPower = player.characters.reduce(
        (sum, c) => sum + c.attack + c.defense + c.speed,
        0
      );
      const totalPower = playerPower + charactersPower;

      // Boss战斗力
      const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;

      // 简化的战斗判定
      const powerRatio = totalPower / bossPower;
      const baseWinChance = Math.min(0.9, Math.max(0.1, powerRatio * 0.5));
      const victory = Math.random() < baseWinChance;

      // 更新挑战次数
      if (bossStatus) {
        await ctx.db.bossStatus.update({
          where: { id: bossStatus.id },
          data: {
            weeklyAttempts: (bossStatus.weeklyAttempts ?? 0) + 1,
            lastAttempt: new Date(),
            lastDefeat: victory ? new Date() : bossStatus.lastDefeat,
          },
        });
      } else {
        await ctx.db.bossStatus.create({
          data: {
            playerId: player.id,
            bossId: input.bossId,
            weeklyAttempts: 1,
            lastAttempt: new Date(),
            lastDefeat: victory ? new Date() : null,
            weekStartDate: weekStart,
          },
        });

        // First boss challenge - unlock boss system
        await ctx.db.unlockFlag.upsert({
          where: {
            playerId_flagName: {
              playerId: player.id,
              flagName: "boss_system",
            },
          },
          update: {},
          create: {
            playerId: player.id,
            flagName: "boss_system",
          },
        });
      }

      if (victory) {
        const rewards = boss.rewards;

        // 发放奖励
        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            crystals: player.crystals + rewards.crystals,
            exp: player.exp + rewards.exp,
          },
        });

        // 记录行动分数
        await ctx.db.actionLog.create({
          data: {
            playerId: player.id,
            day: getCurrentGameDay(),
            type: "combat",
            description: `击败了Boss：${boss.name}`,
            baseScore: 50 * boss.level,
            bonus: 100,
            bonusReason: "Boss战胜利",
          },
        });

        // 卡牌掉落
        let droppedCard = null;
        if (Math.random() < rewards.cardChance) {
          const cards = await ctx.db.card.findMany({
            where: { rarity: rewards.cardRarity },
          });
          if (cards.length > 0) {
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
            droppedCard = { name: card.name, rarity: card.rarity };

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
          }
        }

        return {
          victory: true,
          bossName: boss.name,
          rewards: {
            gold: rewards.gold,
            crystals: rewards.crystals,
            exp: rewards.exp,
            card: droppedCard,
          },
          message: `击败了${boss.name}！`,
        };
      } else {
        return {
          victory: false,
          bossName: boss.name,
          message: `挑战${boss.name}失败，下次再来！`,
          remainingAttempts: boss.weeklyAttemptLimit - ((bossStatus?.weeklyAttempts ?? 0) + 1),
        };
      }
    }),

  // 获取Boss详情
  getDetail: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .query(async ({ ctx, input }) => {
      const boss = BOSSES.find(b => b.id === input.bossId);
      if (!boss) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
      }

      return {
        ...boss,
        skills: boss.skills.map(s => ({
          name: s.name,
          description: s.effect ?? "普通攻击",
        })),
      };
    }),
});
