import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as bossService from "../../services/boss.service";

export const bossRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return bossService.getAllBosses(ctx.db, ctx.session.user.id);
  }),

  challenge: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await bossService.challengeBoss(ctx.db, ctx.engine.entities, ctx.session.user.id, input.bossId);
      void ctx.engine.events.emit("boss:challenge", {
        userId: ctx.session.user.id,
        bossId: input.bossId,
        combatId: result.combatId,
      }, "boss-router");
      return result;
    }),

  getDetail: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .query(({ ctx, input }) => {
      return bossService.getBossDetail(ctx.db, input.bossId);
    }),
});
