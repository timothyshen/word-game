import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as achievementService from "../../services/achievement.service";

export const achievementRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return achievementService.getAllAchievements(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  claim: protectedProcedure
    .input(z.object({ achievementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await achievementService.claimAchievement(ctx.db, ctx.engine.entities, ctx.session.user.id, input.achievementId);
      void ctx.engine.events.emit("achievement:claimed", {
        userId: ctx.session.user.id,
        achievementId: input.achievementId,
      }, "achievement-router");
      return result;
    }),

  getByCategory: protectedProcedure
    .input(z.object({ category: z.enum(["building", "combat", "exploration", "collection", "special"]) }))
    .query(async ({ ctx, input }) => {
      return achievementService.getByCategory(ctx.db, ctx.engine.entities, ctx.session.user.id, input.category);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    return achievementService.getStats(ctx.db, ctx.session.user.id);
  }),
});
