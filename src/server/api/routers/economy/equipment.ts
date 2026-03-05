import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as equipmentService from "../../services/equipment.service";
import { EQUIPMENT_SLOTS } from "../../services/equipment.service";

export const equipmentRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return equipmentService.getAllEquipment(ctx.db, ctx.session.user.id);
  }),

  getCharacterEquipment: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return equipmentService.getCharacterEquipment(ctx.db, ctx.session.user.id, input.characterId);
    }),

  equip: protectedProcedure
    .input(z.object({ equipmentId: z.string(), characterId: z.string(), slot: z.enum(EQUIPMENT_SLOTS) }))
    .mutation(async ({ ctx, input }) => {
      return equipmentService.equipItem(ctx.db, ctx.session.user.id, input.equipmentId, input.characterId, input.slot);
    }),

  unequip: protectedProcedure
    .input(z.object({ characterId: z.string(), slot: z.enum(EQUIPMENT_SLOTS) }))
    .mutation(async ({ ctx, input }) => {
      return equipmentService.unequipItem(ctx.db, ctx.session.user.id, input.characterId, input.slot);
    }),

  enhance: protectedProcedure
    .input(z.object({ equipmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return equipmentService.enhanceEquipment(ctx.db, ctx.session.user.id, input.equipmentId);
    }),

  getAvailable: protectedProcedure
    .input(z.object({ slot: z.enum(EQUIPMENT_SLOTS).optional() }))
    .query(async ({ ctx, input }) => {
      return equipmentService.getAvailableEquipment(ctx.db, ctx.session.user.id, input.slot);
    }),
});
