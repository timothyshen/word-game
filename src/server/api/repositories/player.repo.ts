/**
 * Player Repository — pure data access for Player, ActionLog
 */
import type { Prisma } from "../../../../generated/prisma";
import type { DbClient } from "./types";

// ── Player queries ──

export function findPlayerByUserId(db: DbClient, userId: string) {
  return db.player.findUnique({ where: { userId } });
}

export function findPlayerWithProfession(db: DbClient, userId: string) {
  return db.player.findUnique({
    where: { userId },
    include: {
      profession: { include: { profession: true } },
      learnedSkills: { include: { skill: true } },
    },
  });
}

export function findPlayerWithFullDetails(db: DbClient, userId: string) {
  return db.player.findUnique({
    where: { userId },
    include: {
      profession: { include: { profession: true } },
      learnedSkills: { include: { skill: true } },
      unlockFlags: true,
    },
  });
}

export function createPlayer(db: DbClient, data: Prisma.PlayerUncheckedCreateInput) {
  return db.player.create({
    data,
    include: {
      profession: { include: { profession: true } },
      learnedSkills: { include: { skill: true } },
    },
  });
}

export function updatePlayer(db: DbClient, playerId: string, data: Prisma.PlayerUpdateInput) {
  return db.player.update({ where: { id: playerId }, data });
}

// ── Building template queries ──

export function findBuildingTemplateByName(db: DbClient, name: string) {
  return db.building.findFirst({ where: { name } });
}

// ── Character template queries ──

export function findCharacterTemplateByName(db: DbClient, name: string) {
  return db.character.findFirst({ where: { name } });
}

// ── Card queries ──

export function findCardsByNames(db: DbClient, names: string[]) {
  return db.card.findMany({
    where: { OR: names.map((name) => ({ name })) },
  });
}

// ── ActionLog queries ──

export function findActionLogs(
  db: DbClient,
  playerId: string,
  filters: { day?: number; dayGt?: number; dayLte?: number },
) {
  const where: Prisma.ActionLogWhereInput = { playerId };
  if (filters.day !== undefined) {
    where.day = filters.day;
  } else if (filters.dayGt !== undefined || filters.dayLte !== undefined) {
    where.day = {};
    if (filters.dayGt !== undefined) (where.day as Record<string, number>).gt = filters.dayGt;
    if (filters.dayLte !== undefined) (where.day as Record<string, number>).lte = filters.dayLte;
  }
  return db.actionLog.findMany({ where, orderBy: { timestamp: "desc" } });
}

export function createActionLog(
  db: DbClient,
  data: {
    playerId: string;
    day: number;
    type: string;
    description: string;
    baseScore: number;
    bonus: number;
    bonusReason: string | null;
  },
) {
  return db.actionLog.create({ data });
}
