/**
 * InnerCity Repository — pure data access for InnerCityConfig, InnerCityBuilding
 */
import type { DbClient } from "./types";

// ── InnerCityConfig queries ──

export function findConfig(db: DbClient, playerId: string) {
  return db.innerCityConfig.findUnique({ where: { playerId } });
}

export function createConfig(db: DbClient, playerId: string, width: number, height: number, cornerRadius: number) {
  return db.innerCityConfig.create({
    data: { playerId, territoryWidth: width, territoryHeight: height, cornerRadius },
  });
}

export function updateConfig(db: DbClient, playerId: string, data: { territoryWidth: number; territoryHeight: number; cornerRadius: number }) {
  return db.innerCityConfig.update({ where: { playerId }, data });
}

// ── InnerCityBuilding queries ──

export function countBuildings(db: DbClient, playerId: string) {
  return db.innerCityBuilding.count({ where: { playerId } });
}

export function findBuildings(db: DbClient, playerId: string) {
  return db.innerCityBuilding.findMany({
    where: { playerId },
    include: { template: true },
  });
}

export function findBuildingById(db: DbClient, id: string, playerId: string) {
  return db.innerCityBuilding.findFirst({
    where: { id, playerId },
    include: { template: true },
  });
}

export function createBuilding(
  db: DbClient,
  data: { playerId: string; templateId: string; positionX: number; positionY: number; level: number },
) {
  return db.innerCityBuilding.create({ data, include: { template: true } });
}

export function updateBuildingLevel(db: DbClient, id: string, level: number) {
  return db.innerCityBuilding.update({
    where: { id },
    data: { level },
    include: { template: true },
  });
}

export function deleteBuilding(db: DbClient, id: string) {
  return db.innerCityBuilding.delete({ where: { id } });
}

// ── Building template queries ──

export function findBuildingTemplate(db: DbClient, name: string) {
  return db.building.findFirst({ where: { name } });
}
