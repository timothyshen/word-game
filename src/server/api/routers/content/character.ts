import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as characterService from "../../services/character.service";

export const characterRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return characterService.getAllCharacters(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return characterService.getCharacterById(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
    }),

  levelUp: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await characterService.levelUp(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId);
      void ctx.engine.events.emit("character:levelUp", {
        userId: ctx.session.user.id,
        characterId: input.characterId,
        newLevel: result.newLevel,
      }, "character-router");
      return result;
    }),

  addExp: protectedProcedure
    .input(z.object({ characterId: z.string(), amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await characterService.addExp(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId, input.amount);
      void ctx.engine.events.emit("character:expGain", {
        userId: ctx.session.user.id,
        characterId: input.characterId,
        amount: input.amount,
      }, "character-router");
      return result;
    }),

  heal: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        type: z.enum(["hp", "mp", "both"]),
        amount: z.number().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return characterService.heal(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId, input.type, input.amount);
    }),

  assignToBuilding: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        buildingId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return characterService.assignToBuilding(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId, input.buildingId);
    }),

  getIdle: protectedProcedure.query(async ({ ctx }) => {
    return characterService.getIdleCharacters(ctx.db, ctx.engine.entities, ctx.session.user.id);
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        status: z.enum(["idle", "working", "exploring", "combat", "resting"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return characterService.updateStatus(ctx.db, ctx.engine.entities, ctx.session.user.id, input.characterId, input.status);
    }),
});
