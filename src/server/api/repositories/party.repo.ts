/**
 * Party Repository — data access for PlayerParty
 */
import type { DbClient } from "./types";

export function findParty(db: DbClient, playerId: string) {
  return db.playerParty.findUnique({ where: { playerId } });
}

export function upsertParty(db: DbClient, playerId: string, members: string[]) {
  return db.playerParty.upsert({
    where: { playerId },
    create: { playerId, members: JSON.stringify(members) },
    update: { members: JSON.stringify(members) },
  });
}

export function parsePartyMembers(party: { members: string } | null): string[] {
  if (!party) return [];
  try {
    return JSON.parse(party.members) as string[];
  } catch {
    return [];
  }
}
