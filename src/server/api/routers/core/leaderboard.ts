import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as leaderboardService from "../../services/leaderboard.service";

export const leaderboardRouter = createTRPCRouter({
  getWeeklyLeaderboard: protectedProcedure.query(async ({ ctx }) => {
    return leaderboardService.getWeeklyLeaderboard(ctx.db);
  }),

  getPlayerRank: protectedProcedure.query(async ({ ctx }) => {
    return leaderboardService.getPlayerRank(ctx.db, ctx.session.user.id);
  }),
});
