import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as breakthroughService from "../../services/breakthrough.service";

export const breakthroughRouter = createTRPCRouter({
  getPlayerStatus: protectedProcedure.query(async ({ ctx }) => {
    return breakthroughService.getPlayerStatus(ctx.db, ctx.session.user.id);
  }),

  breakthroughPlayer: protectedProcedure.mutation(async ({ ctx }) => {
    return breakthroughService.breakthroughPlayer(ctx.db, ctx.session.user.id);
  }),

  getCharacterStatus: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return breakthroughService.getCharacterStatus(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
    }),

  breakthroughCharacter: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return breakthroughService.breakthroughCharacter(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
    }),
});
