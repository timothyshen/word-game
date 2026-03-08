import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as combatService from "../../services/combat.service";

export const combatRouter = createTRPCRouter({
  startCombat: protectedProcedure
    .input(z.object({
      monsterLevel: z.number().min(1).max(100).default(1),
      monsterType: z.string().optional(),
      monsterConfigJson: z.string().optional(),
      characterId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await combatService.startCombat(ctx.db, ctx.engine.entities, ctx.session.user.id, input);
      void ctx.engine.events.emit("combat:start", {
        userId: ctx.session.user.id,
        combatId: result.combatId,
        monsterLevel: input.monsterLevel,
      }, "combat-router");
      return result;
    }),

  getCombatStatus: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return combatService.getCombatStatus(ctx.db, ctx.session.user.id, input.combatId);
    }),

  getActiveCombat: protectedProcedure.query(async ({ ctx }) => {
    return combatService.getActiveCombat(ctx.db, ctx.session.user.id);
  }),

  getActions: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .query(async ({ ctx, input }) => {
      return combatService.getActions(ctx.db, ctx.session.user.id, input.combatId);
    }),

  executeAction: protectedProcedure
    .input(z.object({
      combatId: z.string(),
      actionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await combatService.executeAction(ctx.db, ctx.engine.entities, ctx.session.user.id, input.combatId, input.actionId);
      void ctx.engine.events.emit("combat:action", {
        userId: ctx.session.user.id,
        combatId: input.combatId,
        actionId: input.actionId,
        result: {
          status: result.status,
          rewards: result.rewards,
        },
      }, "combat-router");
      return result;
    }),

  endCombat: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return combatService.endCombat(ctx.db, ctx.session.user.id, input.combatId);
    }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return combatService.getHistory(ctx.db, ctx.session.user.id, input.limit);
    }),
});
