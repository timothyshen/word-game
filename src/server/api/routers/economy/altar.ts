import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as altarService from "../../services/altar.service";

export const altarRouter = createTRPCRouter({
  getDiscoveredAltars: protectedProcedure.query(async ({ ctx }) => {
    return altarService.getDiscoveredAltars(ctx.db, ctx.session.user.id);
  }),

  challengeGuardian: protectedProcedure
    .input(z.object({ altarId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return altarService.challengeGuardian(ctx.db, ctx.session.user.id, input.altarId);
    }),

  collectDailyCard: protectedProcedure
    .input(z.object({ altarId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return altarService.collectDailyCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input.altarId);
    }),

  collectAllDailyCards: protectedProcedure.mutation(async ({ ctx }) => {
    return altarService.collectAllDailyCards(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  getAltarTypes: protectedProcedure.query(() => {
    return altarService.getAltarTypes();
  }),
});
