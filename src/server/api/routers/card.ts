import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cardRouter = createTRPCRouter({
  // 获取玩家所有卡牌
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const playerCards = await ctx.db.playerCard.findMany({
      where: { playerId: player.id },
      include: { card: true },
      orderBy: [{ card: { type: "asc" } }, { card: { rarity: "asc" } }],
    });

    return playerCards.map(pc => ({
      id: pc.id,
      quantity: pc.quantity,
      card: pc.card,
    }));
  }),

  // 按类型获取卡牌
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(["building", "recruit", "skill", "enhance", "item"]) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const playerCards = await ctx.db.playerCard.findMany({
        where: {
          playerId: player.id,
          card: { type: input.type },
        },
        include: { card: true },
      });

      return playerCards.map(pc => ({
        id: pc.id,
        quantity: pc.quantity,
        card: pc.card,
      }));
    }),

  // 使用卡牌
  useCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        quantity: z.number().min(1).default(1),
        targetId: z.string().optional(), // 目标ID（角色、建筑等）
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查玩家是否拥有该卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: {
          playerId: player.id,
          cardId: input.cardId,
        },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < input.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
      }

      // 减少卡牌数量
      if (playerCard.quantity === input.quantity) {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      } else {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: playerCard.quantity - input.quantity },
        });
      }

      // 根据卡牌类型执行效果
      const effects = JSON.parse(playerCard.card.effects) as Record<string, unknown>;

      return {
        used: true,
        cardType: playerCard.card.type,
        cardName: playerCard.card.name,
        effects,
        targetId: input.targetId,
      };
    }),

  // 添加卡牌（内部使用，如奖励发放）
  addCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查卡牌是否存在
      const card = await ctx.db.card.findUnique({ where: { id: input.cardId } });
      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在" });
      }

      // 更新或创建玩家卡牌记录
      const existingPlayerCard = await ctx.db.playerCard.findUnique({
        where: {
          playerId_cardId: {
            playerId: player.id,
            cardId: input.cardId,
          },
        },
      });

      if (existingPlayerCard) {
        await ctx.db.playerCard.update({
          where: { id: existingPlayerCard.id },
          data: { quantity: existingPlayerCard.quantity + input.quantity },
        });
      } else {
        await ctx.db.playerCard.create({
          data: {
            playerId: player.id,
            cardId: input.cardId,
            quantity: input.quantity,
          },
        });
      }

      return {
        added: true,
        cardName: card.name,
        quantity: input.quantity,
      };
    }),

  // 学习技能卡
  learnSkill: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        targetType: z.enum(["player", "character"]),
        targetId: z.string().optional(), // character时需要
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { learnedSkills: true },
      });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: {
          playerId: player.id,
          cardId: input.cardId,
        },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有该技能卡" });
      }

      if (playerCard.card.type !== "skill") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是技能卡" });
      }

      const effects = JSON.parse(playerCard.card.effects) as { skillId: string };
      const skillId = effects.skillId;

      if (!skillId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "技能卡数据错误" });
      }

      // 检查技能是否存在
      const skill = await ctx.db.skill.findUnique({ where: { id: skillId } });
      if (!skill) {
        throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });
      }

      if (input.targetType === "player") {
        // 玩家学习技能
        const skillSlots = player.tier * 6;
        const currentSkillCount = player.learnedSkills.length;

        // 检查是否已学习该技能
        const existingSkill = await ctx.db.playerSkill.findUnique({
          where: {
            playerId_skillId: {
              playerId: player.id,
              skillId,
            },
          },
        });

        if (existingSkill) {
          // 升级技能
          await ctx.db.playerSkill.update({
            where: { id: existingSkill.id },
            data: { level: existingSkill.level + 1 },
          });
        } else {
          // 检查槽位
          if (currentSkillCount >= skillSlots) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "技能槽已满" });
          }

          // 学习新技能
          await ctx.db.playerSkill.create({
            data: {
              playerId: player.id,
              skillId,
              level: 1,
            },
          });
        }
      } else {
        // 角色学习技能
        if (!input.targetId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "需要指定角色" });
        }

        const character = await ctx.db.playerCharacter.findFirst({
          where: {
            id: input.targetId,
            playerId: player.id,
          },
          include: { learnedSkills: true },
        });

        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
        }

        const skillSlots = character.tier * 6;
        const currentSkillCount = character.learnedSkills.length;

        // 检查是否已学习
        const existingSkill = await ctx.db.characterSkill.findUnique({
          where: {
            playerCharacterId_skillId: {
              playerCharacterId: character.id,
              skillId,
            },
          },
        });

        if (existingSkill) {
          // 升级
          await ctx.db.characterSkill.update({
            where: { id: existingSkill.id },
            data: { level: existingSkill.level + 1 },
          });
        } else {
          if (currentSkillCount >= skillSlots) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "角色技能槽已满" });
          }

          await ctx.db.characterSkill.create({
            data: {
              playerCharacterId: character.id,
              skillId,
              level: 1,
            },
          });
        }
      }

      // 消耗卡牌
      if (playerCard.quantity === 1) {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      } else {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: playerCard.quantity - 1 },
        });
      }

      return {
        learned: true,
        skillName: skill.name,
        targetType: input.targetType,
      };
    }),
});
