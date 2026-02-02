import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  parseStatModifiers,
  parseConditions,
  checkConditions,
} from "~/shared/effects";
import type { Condition, StatModifier } from "~/shared/effects";
import type { ConditionContext } from "~/shared/effects/condition-checker";

/** Convert StatModifier[] to Record<string,number> for API compatibility */
function modifiersToRecord(modifiers: StatModifier[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const m of modifiers) r[m.stat] = (r[m.stat] ?? 0) + m.value;
  return r;
}

/** Parse bonuses — typed format first, fallback to legacy Record<string,number> */
function parseBonuses(json: string): Record<string, number> {
  const typed = parseStatModifiers(json);
  if (typed.length > 0) return modifiersToRecord(typed);
  try { return JSON.parse(json) as Record<string, number>; } catch { return {}; }
}

/** Parse conditions — typed Condition[] first, fallback to legacy { tier, level } */
function parseUnlockConditions(json: string): Condition[] {
  const typed = parseConditions(json);
  if (typed.length > 0) return typed;
  try {
    const legacy = JSON.parse(json) as Record<string, unknown>;
    const conds: Condition[] = [];
    if (typeof legacy.tier === "number") conds.push({ type: "tier", min: legacy.tier });
    if (typeof legacy.level === "number") conds.push({ type: "level", min: legacy.level });
    return conds;
  } catch { return []; }
}

/** Build a minimal ConditionContext for a player or character */
function buildConditionContext(entity: {
  level: number;
  tier: number;
  strength?: number;
  agility?: number;
  intellect?: number;
  luck?: number;
}): ConditionContext {
  return {
    level: entity.level,
    tier: entity.tier,
    stats: {
      strength: entity.strength ?? 0,
      agility: entity.agility ?? 0,
      intellect: entity.intellect ?? 0,
      luck: entity.luck ?? 0,
    },
    skills: [],
    flags: [],
    items: [],
  };
}

export const professionRouter = createTRPCRouter({
  // 获取所有可用职业
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const professions = await ctx.db.profession.findMany();

    return professions.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      bonuses: parseBonuses(p.bonuses),
      unlockConditions: parseUnlockConditions(p.unlockConditions),
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
        bonuses: parseBonuses(player.profession.profession.bonuses),
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
          bonuses: parseBonuses(character.profession.profession.bonuses),
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
      const conditions = parseUnlockConditions(profession.unlockConditions);
      const condCtx = buildConditionContext(player);
      const check = checkConditions(conditions, condCtx);

      if (!check.met) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: check.reason ?? "不满足解锁条件",
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
      const conditions = parseUnlockConditions(profession.unlockConditions);
      const condCtx = buildConditionContext(character);
      const check = checkConditions(conditions, condCtx);

      if (!check.met) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: check.reason ?? "角色不满足解锁条件",
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
