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
      return bossService.challengeBoss(ctx.db, ctx.session.user.id, input.bossId);
    }),

  getDetail: protectedProcedure
    .input(z.object({ bossId: z.string() }))
    .query(({ input }) => {
      return bossService.getBossDetail(input.bossId);
    }),
});
