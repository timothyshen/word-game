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
    .mutation(({ ctx, input }) =>
      armyService.recruitTroops(ctx.db, ctx.session.user.id, input.troopTypeId, input.count),
    ),

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
    .mutation(({ ctx, input }) =>
      armyCombatService.startArmyCombat(ctx.db, ctx.session.user.id, input.enemyLevel),
    ),

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
    .mutation(({ ctx, input }) =>
      armyCombatService.issueCommands(
        ctx.db,
        ctx.session.user.id,
        input.combatId,
        input.commands,
      ),
    ),

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
