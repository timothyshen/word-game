import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as portalService from "../../services/portal.service";

export const portalRouter = createTRPCRouter({
  getWorlds: protectedProcedure.query(async ({ ctx }) => {
    return portalService.getWorlds(ctx.db, ctx.session.user.id);
  }),

  getDiscoveredPortals: protectedProcedure.query(async ({ ctx }) => {
    return portalService.getDiscoveredPortals(ctx.db, ctx.session.user.id);
  }),

  challengePortalGuardian: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return portalService.challengePortalGuardian(ctx.db, ctx.session.user.id, input.portalId);
    }),

  usePortal: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return portalService.usePortal(ctx.db, ctx.session.user.id, input.portalId);
    }),

  getCurrentWorld: protectedProcedure.query(async ({ ctx }) => {
    return portalService.getCurrentWorld(ctx.db, ctx.session.user.id);
  }),

  travel: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return portalService.travel(ctx.db, ctx.session.user.id, input.worldId);
    }),

  getWorldResources: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .query(async ({ ctx, input }) => {
      return portalService.getWorldResources(ctx.db, ctx.session.user.id, input.worldId);
    }),
});
