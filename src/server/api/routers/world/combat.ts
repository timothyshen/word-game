// 外城战斗系统路由

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as worldCombatService from "../../services/worldCombat.service";

export const combatRouter = createTRPCRouter({
  // 开始战斗
  start: protectedProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await worldCombatService.startCombat(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("combat:start", {
        userId: ctx.session.user.id,
        heroId: input.heroId,
        poiId: input.poiId,
      }, "world-combat-router");
      return result;
    }),

  // 战斗行动
  action: protectedProcedure
    .input(
      z.object({
        heroId: z.string(),
        poiId: z.string(),
        action: z.enum(["attack", "defend", "skill", "flee"]),
        heroHp: z.number(),
        enemyHp: z.number(),
        turn: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return worldCombatService.performAction(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
    }),
});
