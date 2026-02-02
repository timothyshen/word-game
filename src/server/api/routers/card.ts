import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCurrentGameDay } from "../utils";
import { parseCardEffect } from "~/shared/effects";
import type { CardEffect } from "~/shared/effects";

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
    .input(z.object({ type: z.enum(["building", "recruit", "skill", "enhance", "item", "expansion"]) }))
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
      const typedEffect = parseCardEffect(playerCard.card.effects);
      const effects = typedEffect ?? (JSON.parse(playerCard.card.effects) as Record<string, unknown>);

      // Handle unlock effects automatically
      if (typedEffect?.type === "unlock") {
        await ctx.db.unlockFlag.upsert({
          where: { playerId_flagName: { playerId: player.id, flagName: typedEffect.flagName } },
          update: {},
          create: { playerId: player.id, flagName: typedEffect.flagName },
        });
      }

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

      // Check if card has unlock effect
      const typedEffect = parseCardEffect(card.effects);
      if (typedEffect?.type === "unlock") {
        await ctx.db.unlockFlag.upsert({
          where: { playerId_flagName: { playerId: player.id, flagName: typedEffect.flagName } },
          update: {},
          create: { playerId: player.id, flagName: typedEffect.flagName },
        });
      }
      // Legacy fallback: card name contains "突破"
      if (card.name.includes("突破")) {
        await ctx.db.unlockFlag.upsert({
          where: { playerId_flagName: { playerId: player.id, flagName: "breakthrough_system" } },
          update: {},
          create: { playerId: player.id, flagName: "breakthrough_system" },
        });
      }

      return {
        added: true,
        cardName: card.name,
        quantity: input.quantity,
      };
    }),

  // 使用建筑卡建造建筑
  useBuildingCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { buildings: true },
      });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有该建筑卡" });
      }

      if (playerCard.card.type !== "building") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是建筑卡" });
      }

      const effects = JSON.parse(playerCard.card.effects) as { buildingId: string };
      const buildingId = effects.buildingId;

      // 检查建筑模板
      const building = await ctx.db.building.findUnique({ where: { id: buildingId } });
      if (!building) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑模板不存在" });
      }

      // 检查位置是否已有建筑
      const existingBuilding = await ctx.db.playerBuilding.findUnique({
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

      // 检查是否已有同类型建筑（特殊建筑只能建一个）
      if (building.slot === "special" || building.slot === "core") {
        const sameBuilding = player.buildings.find(b => b.buildingId === buildingId);
        if (sameBuilding) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "已有该建筑，无法重复建造" });
        }
      }

      // 创建建筑
      const newBuilding = await ctx.db.playerBuilding.create({
        data: {
          playerId: player.id,
          buildingId,
          level: 1,
          positionX: input.positionX,
          positionY: input.positionY,
        },
        include: { building: true },
      });

      // Check if building unlocks profession system (building name contains "职业")
      if (building.name.includes("职业")) {
        await ctx.db.unlockFlag.upsert({
          where: {
            playerId_flagName: {
              playerId: player.id,
              flagName: "profession_system",
            },
          },
          update: {},
          create: {
            playerId: player.id,
            flagName: "profession_system",
          },
        });
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

      // 记录行动分数
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: getCurrentGameDay(),
          type: "build",
          description: `建造了${building.name}`,
          baseScore: 50,
          bonus: 20, // 首次建造奖励
          bonusReason: "首次建造",
        },
      });

      // 更新当日分数
      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + 70 },
      });

      return {
        built: true,
        buildingName: building.name,
        position: { x: input.positionX, y: input.positionY },
        playerBuilding: newBuilding,
      };
    }),

  // 使用招募卡招募角色
  useRecruitCard: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { characters: true },
      });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有该招募卡" });
      }

      if (playerCard.card.type !== "recruit") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是招募卡" });
      }

      const effects = JSON.parse(playerCard.card.effects) as { characterId: string };
      const characterId = effects.characterId;

      // 检查角色模板
      const character = await ctx.db.character.findUnique({ where: { id: characterId } });
      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色模板不存在" });
      }

      // 创建角色实例
      const newCharacter = await ctx.db.playerCharacter.create({
        data: {
          playerId: player.id,
          characterId,
          level: 1,
          tier: 1,
          hp: character.baseHp,
          maxHp: character.baseHp,
          mp: character.baseMp,
          maxMp: character.baseMp,
          attack: character.baseAttack,
          defense: character.baseDefense,
          speed: character.baseSpeed,
          luck: character.baseLuck,
        },
        include: { character: true },
      });

      // 消耗卡牌
      if (playerCard.quantity === 1) {
        await ctx.db.playerCard.delete({ where: { id: playerCard.id } });
      } else {
        await ctx.db.playerCard.update({
          where: { id: playerCard.id },
          data: { quantity: playerCard.quantity - 1 },
        });
      }

      // 计算稀有度加成
      const rarityBonus: Record<string, number> = {
        "普通": 0,
        "精英": 20,
        "稀有": 40,
        "史诗": 60,
        "传说": 100,
      };

      // 记录行动分数
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: getCurrentGameDay(),
          type: "recruit",
          description: `招募了${character.name}`,
          baseScore: 60,
          bonus: rarityBonus[character.rarity] ?? 0,
          bonusReason: `${character.rarity}角色`,
        },
      });

      // 更新当日分数
      const totalScore = 60 + (rarityBonus[character.rarity] ?? 0);
      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + totalScore },
      });

      return {
        recruited: true,
        characterName: character.name,
        rarity: character.rarity,
        playerCharacter: newCharacter,
      };
    }),

  // 使用道具卡
  useItemCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        targetType: z.enum(["player", "character"]),
        targetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取卡牌
      const playerCard = await ctx.db.playerCard.findFirst({
        where: { playerId: player.id, cardId: input.cardId },
        include: { card: true },
      });

      if (!playerCard || playerCard.quantity < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有该道具卡" });
      }

      if (playerCard.card.type !== "item") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是道具卡" });
      }

      const typedEffect = parseCardEffect(playerCard.card.effects);
      let result: Record<string, unknown> = {};

      if (typedEffect?.type === "heal") {
        // Typed heal effect
        if (input.targetType === "character" && input.targetId) {
          const character = await ctx.db.playerCharacter.findFirst({
            where: { id: input.targetId, playerId: player.id },
          });
          if (!character) {
            throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
          }

          if (typedEffect.healType === "hp") {
            const newHp = Math.min(character.hp + typedEffect.amount, character.maxHp);
            await ctx.db.playerCharacter.update({
              where: { id: character.id },
              data: { hp: newHp },
            });
            result = { healed: typedEffect.amount, newHp };
          } else {
            const newMp = Math.min(character.mp + typedEffect.amount, character.maxMp);
            await ctx.db.playerCharacter.update({
              where: { id: character.id },
              data: { mp: newMp },
            });
            result = { restored: typedEffect.amount, newMp };
          }
        } else {
          result = { message: "需要指定目标角色" };
        }
      } else if (typedEffect?.type === "buff") {
        result = { message: "增益效果已应用", modifiers: typedEffect.modifiers, duration: typedEffect.duration };
      } else if (typedEffect?.type === "escape") {
        result = { message: "逃脱道具已激活", successRate: typedEffect.successRate };
      } else if (typedEffect?.type === "exp") {
        await ctx.db.player.update({
          where: { id: player.id },
          data: { exp: player.exp + typedEffect.amount },
        });
        result = { message: `获得了 ${typedEffect.amount} 经验值` };
      } else if (typedEffect?.type === "unlock") {
        await ctx.db.unlockFlag.upsert({
          where: { playerId_flagName: { playerId: player.id, flagName: typedEffect.flagName } },
          update: {},
          create: { playerId: player.id, flagName: typedEffect.flagName },
        });
        result = { message: `解锁了 ${typedEffect.flagName}` };
      } else {
        // Legacy fallback for old-format effects
        const legacyEffects = JSON.parse(playerCard.card.effects) as Record<string, unknown>;

        if (input.targetType === "character" && input.targetId) {
          const character = await ctx.db.playerCharacter.findFirst({
            where: { id: input.targetId, playerId: player.id },
          });
          if (!character) {
            throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
          }

          const heal = legacyEffects.heal as number | undefined;
          const type = legacyEffects.type as string | undefined;
          if (heal && type === "hp") {
            const newHp = Math.min(character.hp + heal, character.maxHp);
            await ctx.db.playerCharacter.update({ where: { id: character.id }, data: { hp: newHp } });
            result = { healed: heal, newHp };
          } else if (heal && type === "mp") {
            const newMp = Math.min(character.mp + heal, character.maxMp);
            await ctx.db.playerCharacter.update({ where: { id: character.id }, data: { mp: newMp } });
            result = { restored: heal, newMp };
          } else {
            result = { message: "道具效果已应用", effects: legacyEffects };
          }
        } else {
          result = { message: "道具效果已应用", effects: legacyEffects };
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
        used: true,
        itemName: playerCard.card.name,
        ...result,
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
