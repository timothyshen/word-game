import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as shopService from "../../services/shop.service";

export const shopRouter = createTRPCRouter({
  getItems: protectedProcedure
    .input(z.object({ category: z.enum(["all", "card", "resource", "special"]).default("all") }))
    .query(async ({ ctx, input }) => {
      return shopService.getItems(ctx.db, ctx.session.user.id, input.category);
    }),

  buy: protectedProcedure
    .input(z.object({ itemId: z.string(), quantity: z.number().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      return shopService.buyItem(ctx.db, ctx.engine.entities, ctx.session.user.id, input.itemId, input.quantity);
    }),

  sell: protectedProcedure
    .input(z.object({ cardId: z.string(), quantity: z.number().min(1).default(1) }))
    .mutation(async ({ ctx, input }) => {
      return shopService.sellCard(ctx.db, ctx.engine.entities, ctx.session.user.id, input.cardId, input.quantity);
    }),

  getSellPrice: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .query(async ({ ctx, input }) => {
      return shopService.getSellPrice(ctx.db, ctx.engine.entities, ctx.session.user.id, input.cardId);
    }),
});
