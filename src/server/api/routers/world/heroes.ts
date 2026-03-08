// 英雄管理路由

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as heroesService from "../../services/worldHeroes.service";

export const heroesRouter = createTRPCRouter({
  // 派遣英雄到外城
  deploy: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return heroesService.deploy(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
    }),

  // 召回英雄
  recall: protectedProcedure
    .input(z.object({ heroId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return heroesService.recall(ctx.db, ctx.session.user.id, input.heroId);
    }),

  // 恢复英雄体力
  rest: protectedProcedure
    .input(z.object({ heroId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return heroesService.rest(ctx.db, ctx.session.user.id, input.heroId);
    }),
});
