import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as dungeonService from "../../services/dungeon.service";

export const dungeonRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return dungeonService.getDungeonStatus(ctx.db, ctx.session.user.id);
  }),

  start: protectedProcedure
    .input(z.object({ dungeonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return dungeonService.startDungeon(
        ctx.db,
        ctx.engine.entities,
        ctx.session.user.id,
        input.dungeonId,
      );
    }),

  completeFloor: protectedProcedure
    .input(z.object({ dungeonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return dungeonService.completeDungeonFloor(
        ctx.db,
        ctx.engine.entities,
        ctx.session.user.id,
        input.dungeonId,
      );
    }),
});
