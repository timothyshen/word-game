import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as explorationService from "../../services/exploration.service";

export const explorationRouter = createTRPCRouter({
  // 获取已探索区域
  getExploredAreas: protectedProcedure
    .input(z.object({ worldId: z.string().default("main") }))
    .query(async ({ ctx, input }) => {
      return explorationService.getExploredAreas(ctx.db, ctx.session.user.id, input);
    }),

  // 获取野外设施
  getWildernessFacilities: protectedProcedure
    .input(z.object({ worldId: z.string().default("main") }))
    .query(async ({ ctx, input }) => {
      return explorationService.getWildernessFacilities(ctx.db, ctx.session.user.id, input);
    }),

  // 探索新区域
  exploreArea: protectedProcedure
    .input(
      z.object({
        worldId: z.string().default("main"),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await explorationService.exploreArea(ctx.db, ctx.session.user.id, input);
      void ctx.engine.events.emit("exploration:start", {
        userId: ctx.session.user.id,
        result: { areaName: result.areaName },
      }, "exploration-router");
      return result;
    }),

  // 触发探索事件（进入已探索区域）
  triggerEvent: protectedProcedure
    .input(
      z.object({
        worldId: z.string().default("main"),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return explorationService.triggerEvent(ctx.db, ctx.session.user.id, input);
    }),

  // 处理事件选择
  handleEventChoice: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
        action: z.string(),
        eventData: z.string().optional(),
        worldId: z.string().default("main"),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await explorationService.handleEventChoice(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("exploration:start", {
        userId: ctx.session.user.id,
        result: { type: "event", rewards: result.rewards },
      }, "exploration-router");
      return result;
    }),

  // 使用野外设施
  useFacility: protectedProcedure
    .input(z.object({ facilityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return explorationService.useFacility(ctx.db, ctx.session.user.id, input);
    }),
});
