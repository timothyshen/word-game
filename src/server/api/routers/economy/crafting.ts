import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as craftingService from "../../services/crafting.service";

export const craftingRouter = createTRPCRouter({
  getRecipes: protectedProcedure.query(async ({ ctx }) => {
    return craftingService.getRecipes(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  getMyMaterials: protectedProcedure.query(async ({ ctx }) => {
    return craftingService.getMyMaterials(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  getRecipeDetail: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return craftingService.getRecipeDetail(ctx.db, ctx.engine.entities, ctx.session.user.id, input.recipeId);
    }),

  craft: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return craftingService.craft(ctx.db, ctx.engine.entities, ctx.session.user.id, input.recipeId);
    }),

  salvageMaterials: protectedProcedure
    .input(z.object({ materialTemplateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return craftingService.salvageMaterials(ctx.db, ctx.engine.entities, ctx.session.user.id, input.materialTemplateId);
    }),
});
