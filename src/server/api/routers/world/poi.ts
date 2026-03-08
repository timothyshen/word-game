// POI交互和资源采集路由 (thin router)

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as poiService from "../../services/worldPoi.service";

export const poiRouter = createTRPCRouter({
  // 与POI互动
  interact: protectedProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return poiService.interact(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
    }),

  // 采集资源
  harvest: protectedProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return poiService.harvest(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
    }),

  // 刷新资源（定时任务或手动触发）
  refreshResources: protectedProcedure.mutation(async ({ ctx }) => {
    return poiService.refreshResources(ctx.db);
  }),
});
