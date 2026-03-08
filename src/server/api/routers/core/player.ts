import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as playerService from "../../services/player.service";
import { upsertUnlockFlag } from "../../repositories/card.repo";
import { findPlayerByUserId } from "../../repositories/player.repo";

export const playerRouter = createTRPCRouter({
  getOrCreate: protectedProcedure.query(async ({ ctx }) => {
    return playerService.getOrCreatePlayer(ctx.db, ctx.engine.entities, ctx.session.user.id, ctx.session.user.name ?? "旅行者");
  }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return playerService.getPlayerStatus(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  consumeStamina: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return playerService.consumeStamina(ctx.db, ctx.session.user.id, input.amount);
    }),

  getTodayActions: protectedProcedure.query(async ({ ctx }) => {
    return playerService.getTodayActions(ctx.db, ctx.session.user.id);
  }),

  levelUp: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await playerService.levelUp(ctx.db, ctx.session.user.id);
    void ctx.engine.events.emit("player:expGain", {
      userId: ctx.session.user.id,
      amount: result.expUsed,
    }, "player-router");
    void ctx.engine.events.emit("player:levelUp", {
      userId: ctx.session.user.id,
      newLevel: result.newLevel,
    }, "player-router");
    return result;
  }),

  updateStats: protectedProcedure
    .input(z.object({
      strength: z.number().optional(),
      agility: z.number().optional(),
      intellect: z.number().optional(),
      charisma: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return playerService.updateStats(ctx.db, ctx.session.user.id, input);
    }),

  getLevelUpInfo: protectedProcedure.query(async ({ ctx }) => {
    return playerService.getLevelUpInfo(ctx.db, ctx.session.user.id);
  }),

  recordCombatWin: protectedProcedure
    .input(z.object({ isBoss: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      return playerService.recordCombatWin(ctx.db, ctx.session.user.id, input.isBoss);
    }),

  recordGoldEarned: protectedProcedure
    .input(z.object({ amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return playerService.recordGoldEarned(ctx.db, ctx.session.user.id, input.amount);
    }),

  dismissTutorial: protectedProcedure
    .input(z.object({ flag: z.string().regex(/^tutorial_\w+_read$/) }))
    .mutation(async ({ ctx, input }) => {
      const player = await findPlayerByUserId(ctx.db, ctx.session.user.id);
      if (!player) return { success: false };
      await upsertUnlockFlag(ctx.db, player.id, input.flag);
      return { success: true };
    }),
});
