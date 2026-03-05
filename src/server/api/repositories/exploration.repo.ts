/**
 * Exploration Repository — pure data access for ExploredArea, WildernessFacility, Adventure
 */
import type { DbClient } from "./types";

// ── ExploredArea ──

export function findExploredAreas(db: DbClient, playerId: string, worldId: string) {
  return db.exploredArea.findMany({
    where: { playerId, worldId },
    orderBy: { discoveredAt: "asc" },
  });
}

export function findExploredArea(
  db: DbClient,
  playerId: string,
  worldId: string,
  positionX: number,
  positionY: number,
) {
  return db.exploredArea.findUnique({
    where: {
      playerId_worldId_positionX_positionY: {
        playerId,
        worldId,
        positionX,
        positionY,
      },
    },
  });
}

export function createExploredArea(
  db: DbClient,
  data: {
    playerId: string;
    worldId: string;
    positionX: number;
    positionY: number;
    name: string;
  },
) {
  return db.exploredArea.create({ data });
}

export function updateExploredAreaEvent(
  db: DbClient,
  id: string,
  pendingEvent: string | null,
) {
  return db.exploredArea.update({
    where: { id },
    data: { pendingEvent },
  });
}

export function setExploredAreaPendingEvent(
  db: DbClient,
  playerId: string,
  worldId: string,
  positionX: number,
  positionY: number,
  pendingEvent: string,
) {
  return db.exploredArea.update({
    where: {
      playerId_worldId_positionX_positionY: {
        playerId,
        worldId,
        positionX,
        positionY,
      },
    },
    data: { pendingEvent },
  });
}

// ── WildernessFacility ──

export function findActiveFacilities(
  db: DbClient,
  playerId: string,
  worldId: string,
) {
  const now = new Date();
  return db.wildernessFacility.findMany({
    where: {
      playerId,
      worldId,
      isDiscovered: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
}

export function findFacilityById(
  db: DbClient,
  id: string,
  playerId: string,
) {
  return db.wildernessFacility.findFirst({ where: { id, playerId } });
}

export function createFacility(
  db: DbClient,
  data: {
    playerId: string;
    worldId: string;
    type: string;
    name: string;
    icon: string;
    description: string;
    positionX: number;
    positionY: number;
    data: string;
    remainingUses: number | null;
    isDiscovered: boolean;
  },
) {
  return db.wildernessFacility.create({ data });
}

export function updateFacilityUses(
  db: DbClient,
  id: string,
  remainingUses: number,
) {
  return db.wildernessFacility.update({
    where: { id },
    data: { remainingUses },
  });
}

export function deleteFacility(db: DbClient, id: string) {
  return db.wildernessFacility.delete({ where: { id } });
}

// ── Adventure ──

export function findActiveAdventures(
  db: DbClient,
  areaLevel: number,
  worldId: string,
) {
  return db.adventure.findMany({
    where: {
      isActive: true,
      minLevel: { lte: areaLevel },
      AND: [
        { OR: [{ maxLevel: null }, { maxLevel: { gte: areaLevel } }] },
        { OR: [{ worldId: null }, { worldId }] },
      ],
    },
  });
}
