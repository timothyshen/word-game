// 地图和移动路由

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as mapService from "../../services/worldMap.service";

export const mapRouter = createTRPCRouter({
  // 获取外城状态
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return mapService.getStatus(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  // 移动英雄
  moveHero: protectedProcedure
    .input(
      z.object({
        heroId: z.string(),
        targetX: z.number(),
        targetY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return mapService.moveHero(ctx.db, ctx.session.user.id, input);
    }),

  // 获取可见地图
  getVisibleMap: protectedProcedure.query(async ({ ctx }) => {
    return mapService.getVisibleMap(ctx.db, ctx.session.user.id);
  }),
});
