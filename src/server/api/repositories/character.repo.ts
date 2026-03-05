/**
 * Character Repository — pure data access for PlayerCharacter
 */
import type { Prisma } from "../../../../generated/prisma";
import type { DbClient } from "./types";

const CHARACTER_INCLUDE = {
  character: true,
  profession: { include: { profession: true } },
  learnedSkills: { include: { skill: true } },
} as const;

export function findPlayerCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({
    where: { playerId },
    include: CHARACTER_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export function findPlayerCharacterById(
  db: DbClient,
  id: string,
  playerId: string,
) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: CHARACTER_INCLUDE,
  });
}

export function findPlayerCharacterWithTemplate(
  db: DbClient,
  id: string,
  playerId: string,
) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
    include: { character: true },
  });
}

export function findPlayerCharacterBasic(
  db: DbClient,
  id: string,
  playerId: string,
) {
  return db.playerCharacter.findFirst({
    where: { id, playerId },
  });
}

export function findIdleCharacters(db: DbClient, playerId: string) {
  return db.playerCharacter.findMany({
    where: { playerId, status: "idle" },
    include: { character: true },
  });
}

export function updateCharacter(
  db: DbClient,
  id: string,
  data: Prisma.PlayerCharacterUpdateInput,
) {
  return db.playerCharacter.update({ where: { id }, data });
}

export function findBuildingByAssignedChar(
  db: DbClient,
  playerId: string,
  characterId: string,
) {
  return db.playerBuilding.findFirst({
    where: { playerId, assignedCharId: characterId },
    include: { building: true },
  });
}

export function findBuildingByAssignedCharBasic(
  db: DbClient,
  playerId: string,
  characterId: string,
) {
  return db.playerBuilding.findFirst({
    where: { playerId, assignedCharId: characterId },
  });
}

export function findPlayerBuildingWithTemplate(
  db: DbClient,
  id: string,
  playerId: string,
) {
  return db.playerBuilding.findFirst({
    where: { id, playerId },
    include: { building: true },
  });
}

export function updatePlayerBuilding(
  db: DbClient,
  id: string,
  data: Prisma.PlayerBuildingUpdateInput,
) {
  return db.playerBuilding.update({ where: { id }, data });
}
