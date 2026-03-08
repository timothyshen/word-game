import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as buildingService from "../../services/building.service";

export const buildingRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return buildingService.getAllBuildings(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return buildingService.getBuildingById(ctx.db, ctx.engine.entities, ctx.session.user.id, input.buildingId);
    }),

  upgrade: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await buildingService.upgradeBuilding(ctx.db, ctx.engine.entities, ctx.session.user.id, input.buildingId);
      void ctx.engine.events.emit("building:upgrade", {
        userId: ctx.session.user.id,
        buildingId: input.buildingId,
        newLevel: result.newLevel,
      }, "building-router");
      return result;
    }),

  assignCharacter: protectedProcedure
    .input(z.object({ buildingId: z.string(), characterId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      return buildingService.assignCharacter(ctx.db, ctx.engine.entities, ctx.session.user.id, input.buildingId, input.characterId);
    }),

  calculateDailyOutput: protectedProcedure.query(async ({ ctx }) => {
    return buildingService.calculateDailyOutput(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  collectDailyOutput: protectedProcedure.mutation(async ({ ctx }) => {
    return buildingService.collectDailyOutput(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),
});
