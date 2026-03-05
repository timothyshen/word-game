import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as territoryService from "../../services/territory.service";

export const territoryRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return territoryService.getAll(ctx.db, ctx.session.user.id);
  }),

  getUnlockable: protectedProcedure.query(async ({ ctx }) => {
    return territoryService.getUnlockable(ctx.db, ctx.session.user.id);
  }),

  getUnlockCost: protectedProcedure
    .input(z.object({ positionX: z.number(), positionY: z.number() }))
    .query(async ({ ctx, input }) => {
      return territoryService.getUnlockCost(
        ctx.db,
        ctx.session.user.id,
        input.positionX,
        input.positionY,
      );
    }),

  unlock: protectedProcedure
    .input(z.object({ positionX: z.number(), positionY: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return territoryService.unlock(
        ctx.db,
        ctx.session.user.id,
        input.positionX,
        input.positionY,
      );
    }),

  getTileDetail: protectedProcedure
    .input(z.object({ positionX: z.number(), positionY: z.number() }))
    .query(async ({ ctx, input }) => {
      return territoryService.getTileDetail(
        ctx.db,
        ctx.session.user.id,
        input.positionX,
        input.positionY,
      );
    }),
});
