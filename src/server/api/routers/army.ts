import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as armyService from "../services/army.service";
import * as armyCombatService from "../services/army-combat.service";

export const armyRouter = createTRPCRouter({
  // ── Troop management ──

  getTroopTypes: protectedProcedure.query(({ ctx }) =>
    armyService.getTroopTypes(ctx.db),
  ),

  getMyTroops: protectedProcedure.query(({ ctx }) =>
    armyService.getPlayerTroops(ctx.db, ctx.session.user.id),
  ),

  recruit: protectedProcedure
    .input(
      z.object({
        troopTypeId: z.string(),
        count: z.number().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await armyService.recruitTroops(ctx.db, ctx.session.user.id, input.troopTypeId, input.count);
      void ctx.engine.events.emit("army:recruit", {
        userId: ctx.session.user.id,
        troopTypeId: input.troopTypeId,
        count: input.count,
      }, "army-router");
      return result;
    }),

  // ── Formation ──

  getFormation: protectedProcedure.query(({ ctx }) =>
    armyService.getFormation(ctx.db, ctx.session.user.id),
  ),

  setFormation: protectedProcedure
    .input(
      z.object({
        slots: z.array(
          z.object({
            slotIndex: z.number(),
            troopTypeId: z.string(),
            count: z.number().min(1),
            heroEntityId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(({ ctx, input }) =>
      armyService.setFormation(ctx.db, ctx.session.user.id, input.slots),
    ),

  // ── Army combat ──

  startCombat: protectedProcedure
    .input(
      z.object({
        enemyLevel: z.number().min(1).max(100).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await armyCombatService.startArmyCombat(ctx.db, ctx.session.user.id, input.enemyLevel);
      void ctx.engine.events.emit("army:combat_start", {
        userId: ctx.session.user.id,
        combatId: result.combatId,
      }, "army-router");
      return result;
    }),

  issueCommands: protectedProcedure
    .input(
      z.object({
        combatId: z.string(),
        commands: z.array(
          z.object({
            unitId: z.string(),
            command: z.enum(["attack", "defend", "charge", "flank", "retreat"]),
            targetId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await armyCombatService.issueCommands(
        ctx.db,
        ctx.session.user.id,
        input.combatId,
        input.commands,
      );
      void ctx.engine.events.emit("army:turn_resolved", {
        userId: ctx.session.user.id,
        combatId: input.combatId,
        status: result.state.status,
      }, "army-router");
      return result;
    }),

  useHeroSkill: protectedProcedure
    .input(
      z.object({
        combatId: z.string(),
        heroId: z.string(),
        skillName: z.string(),
      }),
    )
    .mutation(({ ctx, input }) =>
      armyCombatService.useHeroSkill(
        ctx.db,
        ctx.session.user.id,
        input.combatId,
        input.heroId,
        input.skillName,
      ),
    ),

  getCombatState: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { userId: ctx.session.user.id },
      });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }
      const combat = await ctx.db.armyCombat.findFirst({
        where: { id: input.combatId, playerId: player.id },
      });
      if (!combat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }
      return JSON.parse(combat.combatState) as armyCombatService.ArmyCombatState;
    }),
});
