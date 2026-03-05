/**
 * Building Repository — pure data access for PlayerBuilding, EconomyLog
 */
import type { DbClient } from "./types";

// ── PlayerBuilding queries ──

export function findPlayerBuildings(db: DbClient, playerId: string) {
  return db.playerBuilding.findMany({
    where: { playerId },
    include: { building: true },
    orderBy: { createdAt: "asc" },
  });
}

export function findPlayerBuildingById(db: DbClient, id: string, playerId: string) {
  return db.playerBuilding.findFirst({
    where: { id, playerId },
    include: { building: true },
  });
}

export function updatePlayerBuildingLevel(db: DbClient, id: string, level: number) {
  return db.playerBuilding.update({
    where: { id },
    data: { level },
    include: { building: true },
  });
}

export function updatePlayerBuildingAssignment(
  db: DbClient,
  id: string,
  data: { assignedCharId: string | null; status: string },
) {
  return db.playerBuilding.update({ where: { id }, data });
}

// ── PlayerCharacter queries (building-related) ──

export function findAssignedCharacter(db: DbClient, id: string) {
  return db.playerCharacter.findUnique({
    where: { id },
    include: { character: true },
  });
}

export function findCharacterWithTemplate(db: DbClient, id: string, playerId: string) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: { character: true },
  });
}

export function findAllPlayerCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({ where: { playerId } });
}

export function updateCharacterStatus(db: DbClient, id: string, status: string, workingAt: string | null) {
  return db.playerCharacter.update({
    where: { id },
    data: { status, workingAt },
  });
}

// ── EconomyLog queries ──

export function upsertEconomyLog(
  db: DbClient,
  playerId: string,
  day: number,
  data: {
    goldIncome: number;
    woodIncome: number;
    stoneIncome: number;
    foodIncome: number;
    foodExpense: number;
  },
) {
  return db.economyLog.upsert({
    where: { playerId_day: { playerId, day } },
    update: data,
    create: { playerId, day, ...data },
  });
}
