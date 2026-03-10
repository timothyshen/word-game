/**
 * Army Repository — data access for troops, armies, and army combat
 */
import type { DbClient } from "./types";

// ── Troop Types ──

export function getAllTroopTypes(db: DbClient) {
  return db.troopType.findMany({ orderBy: [{ category: "asc" }, { tier: "asc" }] });
}

export function getTroopTypeById(db: DbClient, id: string) {
  return db.troopType.findUnique({ where: { id } });
}

export function getTroopTypesByBuilding(db: DbClient, buildingType: string) {
  return db.troopType.findMany({ where: { requiredBuilding: buildingType } });
}

// ── Player Troops ──

export function getPlayerTroops(db: DbClient, playerId: string) {
  return db.troop.findMany({
    where: { playerId },
    include: { troopType: true },
    orderBy: [{ troopType: { category: "asc" } }, { troopType: { tier: "asc" } }],
  });
}

export function getPlayerTroop(db: DbClient, playerId: string, troopTypeId: string) {
  return db.troop.findUnique({
    where: { playerId_troopTypeId: { playerId, troopTypeId } },
    include: { troopType: true },
  });
}

export function upsertTroop(
  db: DbClient,
  playerId: string,
  troopTypeId: string,
  data: { count?: number; maxCount?: number; exp?: number; level?: number },
) {
  return db.troop.upsert({
    where: { playerId_troopTypeId: { playerId, troopTypeId } },
    create: { playerId, troopTypeId, ...data },
    update: data,
  });
}

export function updateTroop(db: DbClient, id: string, data: { count?: number; exp?: number; level?: number }) {
  return db.troop.update({ where: { id }, data });
}

// ── Army ──

export function getArmy(db: DbClient, playerId: string) {
  return db.army.findUnique({ where: { playerId } });
}

export function upsertArmy(db: DbClient, playerId: string, formation: string) {
  return db.army.upsert({
    where: { playerId },
    create: { playerId, formation },
    update: { formation },
  });
}

// ── Army Combat ──

export function getActiveArmyCombat(db: DbClient, playerId: string) {
  return db.armyCombat.findFirst({ where: { playerId, status: "active" } });
}

export function createArmyCombat(db: DbClient, data: {
  playerId: string;
  combatType: string;
  combatState: string;
  logs: string;
}) {
  return db.armyCombat.create({ data });
}

export function updateArmyCombat(db: DbClient, id: string, data: {
  status?: string;
  combatState?: string;
  logs?: string;
}) {
  return db.armyCombat.update({ where: { id }, data });
}

export function getArmyCombatHistory(db: DbClient, playerId: string, limit: number) {
  return db.armyCombat.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
