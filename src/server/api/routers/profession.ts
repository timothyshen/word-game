import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const professionRouter = createTRPCRouter({
  // 获取所有可用职业
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const professions = await ctx.db.profession.findMany();

    return professions.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      bonuses: JSON.parse(p.bonuses) as Record<string, number>,
      unlockConditions: JSON.parse(p.unlockConditions) as Record<string, unknown>,
    }));
  }),

  // 获取玩家职业状态
  getPlayerProfession: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        profession: {
          include: { profession: true },
        },
      },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    if (!player.profession) {
      return { hasProfession: false, profession: null };
    }

    return {
      hasProfession: true,
      profession: {
        id: player.profession.profession.id,
        name: player.profession.profession.name,
        description: player.profession.profession.description,
        bonuses: JSON.parse(player.profession.profession.bonuses) as Record<string, number>,
        obtainedAt: player.profession.obtainedAt,
      },
    };
  }),

  // 获取角色职业
  getCharacterProfession: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: {
          character: true,
          profession: {
            include: { profession: true },
          },
        },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      return {
        characterId: character.id,
        characterName: character.character.name,
        baseClass: character.character.baseClass,
        hasProfession: !!character.profession,
        profession: character.profession ? {
          id: character.profession.profession.id,
          name: character.profession.profession.name,
          description: character.profession.profession.description,
          bonuses: JSON.parse(character.profession.profession.bonuses) as Record<string, number>,
          obtainedAt: character.profession.obtainedAt,
        } : null,
      };
    }),

  // 学习职业（玩家）
  learnPlayerProfession: protectedProcedure
    .input(z.object({ professionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { profession: true },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      if (player.profession) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已有职业，无法重复学习" });
      }

      const profession = await ctx.db.profession.findUnique({
        where: { id: input.professionId },
      });

      if (!profession) {
        throw new TRPCError({ code: "NOT_FOUND", message: "职业不存在" });
      }

      // 检查解锁条件
      const conditions = JSON.parse(profession.unlockConditions) as Record<string, unknown>;

      if (conditions.tier && player.tier < (conditions.tier as number)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `需要达到${conditions.tier}阶才能学习该职业`,
        });
      }

      if (conditions.level && player.level < (conditions.level as number)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `需要达到${conditions.level}级才能学习该职业`,
        });
      }

      // 创建职业记录
      await ctx.db.playerProfession.create({
        data: {
          playerId: player.id,
          professionId: input.professionId,
        },
      });

      return {
        success: true,
        professionName: profession.name,
        message: `成功习得${profession.name}职业！`,
      };
    }),

  // 学习职业（角色）
  learnCharacterProfession: protectedProcedure
    .input(z.object({
      characterId: z.string(),
      professionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { profession: true, character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (character.profession) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "角色已有职业" });
      }

      const profession = await ctx.db.profession.findUnique({
        where: { id: input.professionId },
      });

      if (!profession) {
        throw new TRPCError({ code: "NOT_FOUND", message: "职业不存在" });
      }

      // 检查条件
      const conditions = JSON.parse(profession.unlockConditions) as Record<string, unknown>;

      if (conditions.tier && character.tier < (conditions.tier as number)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `角色需要达到${conditions.tier}阶`,
        });
      }

      await ctx.db.characterProfession.create({
        data: {
          playerCharacterId: input.characterId,
          professionId: input.professionId,
        },
      });

      return {
        success: true,
        characterName: character.character.name,
        professionName: profession.name,
        message: `${character.character.name}习得${profession.name}职业！`,
      };
    }),
});
