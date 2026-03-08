import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as innerCityService from "../../services/innerCity.service";

export const innerCityRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return innerCityService.getStatus(ctx.db, ctx.session.user.id);
  }),

  getCity: protectedProcedure.query(async ({ ctx }) => {
    return innerCityService.getCity(ctx.db, ctx.session.user.id);
  }),

  initialize: protectedProcedure.mutation(async ({ ctx }) => {
    return innerCityService.initialize(ctx.db, ctx.session.user.id);
  }),

  placeBuilding: protectedProcedure
    .input(
      z.object({
        cardId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return innerCityService.placeBuilding(
        ctx.db,
        ctx.engine.entities,
        ctx.session.user.id,
        input.cardId,
        input.positionX,
        input.positionY,
      );
    }),

  expandTerritory: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return innerCityService.expandTerritory(ctx.db, ctx.engine.entities, ctx.session.user.id, input.cardId);
    }),

  upgradeBuilding: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return innerCityService.upgradeBuilding(ctx.db, ctx.session.user.id, input.buildingId);
    }),

  demolish: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return innerCityService.demolish(ctx.db, ctx.session.user.id, input.buildingId);
    }),
});
