/**
 * Party Router — manage 3-character party composition
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as partyRepo from "../repositories/party.repo";

export const partyRouter = createTRPCRouter({
  getParty: protectedProcedure.query(async ({ ctx }) => {
    const party = await partyRepo.findParty(ctx.db, ctx.session.user.id);
    return partyRepo.parsePartyMembers(party);
  }),

  setParty: protectedProcedure
    .input(z.object({
      members: z.array(z.string()).min(1).max(3),
    }))
    .mutation(async ({ ctx, input }) => {
      await partyRepo.upsertParty(ctx.db, ctx.session.user.id, input.members);
      return { success: true };
    }),
});
