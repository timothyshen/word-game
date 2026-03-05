import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as settlementService from "../../services/settlement.service";

export const settlementRouter = createTRPCRouter({
  checkSettlement: protectedProcedure.query(async ({ ctx }) => {
    return settlementService.checkSettlement(ctx.db, ctx.session.user.id);
  }),

  getSettlementPreview: protectedProcedure.query(async ({ ctx }) => {
    return settlementService.getSettlementPreview(ctx.db, ctx.session.user.id);
  }),

  executeSettlement: protectedProcedure.mutation(async ({ ctx }) => {
    return settlementService.executeSettlement(ctx.db, ctx.session.user.id);
  }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return settlementService.getSettlementHistory(ctx.db, ctx.session.user.id);
  }),
});
