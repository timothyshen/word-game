import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as breakthroughService from "../../services/breakthrough.service";

export const breakthroughRouter = createTRPCRouter({
  getPlayerStatus: protectedProcedure.query(async ({ ctx }) => {
    return breakthroughService.getPlayerStatus(ctx.db, ctx.session.user.id);
  }),

  breakthroughPlayer: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await breakthroughService.breakthroughPlayer(ctx.db, ctx.session.user.id);
    void ctx.engine.events.emit("breakthrough:complete", {
      userId: ctx.session.user.id,
      target: "player",
      newTier: result.newTier,
    }, "breakthrough-router");
    return result;
  }),

  getCharacterStatus: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return breakthroughService.getCharacterStatus(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
    }),

  breakthroughCharacter: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await breakthroughService.breakthroughCharacter(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
      void ctx.engine.events.emit("breakthrough:complete", {
        userId: ctx.session.user.id,
        target: "character",
        characterId: input.characterId,
        newTier: result.newTier,
      }, "breakthrough-router");
      return result;
    }),
});
