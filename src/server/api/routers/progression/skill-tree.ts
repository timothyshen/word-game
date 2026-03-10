import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as skillTreeService from "../../services/skill-tree.service";

export const skillTreeRouter = createTRPCRouter({
  getTree: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return skillTreeService.getCharacterSkillTree(
        ctx.db,
        ctx.engine.entities,
        ctx.session.user.id,
        input.characterId,
      );
    }),

  learnSkill: protectedProcedure
    .input(z.object({ characterId: z.string(), skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return skillTreeService.learnSkillTreeSkill(
        ctx.db,
        ctx.engine.entities,
        ctx.session.user.id,
        input.characterId,
        input.skillId,
      );
    }),

  upgradeSkill: protectedProcedure
    .input(z.object({ characterId: z.string(), skillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return skillTreeService.upgradeSkillTreeSkill(
        ctx.db,
        ctx.session.user.id,
        input.characterId,
        input.skillId,
      );
    }),
});
