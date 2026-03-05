import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as professionService from "../../services/profession.service";

export const professionRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return professionService.getAllProfessions(ctx.db);
  }),

  getPlayerProfession: protectedProcedure.query(async ({ ctx }) => {
    return professionService.getPlayerProfession(ctx.db, ctx.session.user.id);
  }),

  getCharacterProfession: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return professionService.getCharacterProfession(ctx.db, ctx.session.user.id, input.characterId);
    }),

  learnPlayerProfession: protectedProcedure
    .input(z.object({ professionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return professionService.learnPlayerProfession(ctx.db, ctx.session.user.id, input.professionId);
    }),

  learnCharacterProfession: protectedProcedure
    .input(z.object({
      characterId: z.string(),
      professionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return professionService.learnCharacterProfession(
        ctx.db, ctx.session.user.id, input.characterId, input.professionId,
      );
    }),
});
