// 事件系统路由 - 从 exploration.ts 移植

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Re-export types and functions used by other modules
export type { EventType, ExplorationEvent } from "../../services/worldEvents.service";
export { generateRandomEvent } from "../../services/worldEvents.service";

import * as worldEventsService from "../../services/worldEvents.service";

// 事件路由
export const eventsRouter = createTRPCRouter({
  // 处理事件选择
  handleChoice: protectedProcedure
    .input(
      z.object({
        heroId: z.string(),
        eventType: z.string(),
        action: z.string(),
        eventData: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return worldEventsService.handleChoice(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
    }),
});
