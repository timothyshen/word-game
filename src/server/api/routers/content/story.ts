import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as storyService from "../../services/story.service";

export const storyRouter = createTRPCRouter({
  getChapters: protectedProcedure.query(async ({ ctx }) => {
    return storyService.getChapters(ctx.db, ctx.session.user.id);
  }),

  getCurrentNode: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return storyService.getCurrentNode(ctx.db, ctx.session.user.id, input.chapterId);
    }),

  advanceStory: protectedProcedure
    .input(z.object({
      chapterId: z.string(),
      choiceIndex: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return storyService.advanceStory(ctx.db, ctx.session.user.id, input.chapterId, input.choiceIndex);
    }),
});
