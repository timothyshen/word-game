/**
 * Building Repository — data access via Entity system + EconomyLog
 */
import type { IEntityManager } from "~/engine/types";
import type { DbClient } from "./types";
import { parseCharacterState, type CharacterEntity } from "../utils/character-utils";
import {
  findPlayerBuildingEntities,
  findBuildingEntityById,
  parseBuildingState,
  type BuildingEntity,
} from "../utils/building-utils";

// ── Building type with template info ──

export interface BuildingWithTemplate {
  id: string;
  buildingId: string;
  level: number;
  positionX: number;
  positionY: number;
  assignedCharId: string | null;
  building: NonNullable<Awaited<ReturnType<DbClient["building"]["findUnique"]>>>;
}

// ── PlayerBuilding queries (via Entity system) ──

export async function findPlayerBuildings(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
): Promise<BuildingWithTemplate[]> {
  const buildingEntities = await findPlayerBuildingEntities(entities, playerId);

  const results: BuildingWithTemplate[] = [];
  for (const entity of buildingEntities) {
    const state = parseBuildingState(entity);
    const building = await db.building.findUnique({ where: { id: state.buildingId } });
    if (!building) continue;

    results.push({
      id: entity.id,
      buildingId: state.buildingId,
      level: state.level,
      positionX: state.positionX,
      positionY: state.positionY,
      assignedCharId: state.assignedCharId,
      building,
    });
  }

  return results;
}

export async function findPlayerBuildingById(
  db: DbClient,
  entities: IEntityManager,
  id: string,
  playerId: string,
): Promise<BuildingWithTemplate | null> {
  const entity = await findBuildingEntityById(entities, id, playerId);
  if (!entity) return null;

  const state = parseBuildingState(entity);
  const building = await db.building.findUnique({ where: { id: state.buildingId } });
  if (!building) return null;

  return {
    id: entity.id,
    buildingId: state.buildingId,
    level: state.level,
    positionX: state.positionX,
    positionY: state.positionY,
    assignedCharId: state.assignedCharId,
    building,
  };
}

export async function updatePlayerBuildingLevel(
  db: DbClient,
  entities: IEntityManager,
  id: string,
  level: number,
): Promise<BuildingWithTemplate> {
  await entities.updateEntityState(id, { level });
  const entity = (await entities.getEntity(id)) as BuildingEntity;
  const state = parseBuildingState(entity);
  const building = await db.building.findUnique({ where: { id: state.buildingId } });
  if (!building) throw new Error(`Building template not found: ${state.buildingId}`);

  return {
    id: entity.id,
    buildingId: state.buildingId,
    level: state.level,
    positionX: state.positionX,
    positionY: state.positionY,
    assignedCharId: state.assignedCharId,
    building,
  };
}

export async function updatePlayerBuildingAssignment(
  entities: IEntityManager,
  id: string,
  data: { assignedCharId: string | null },
): Promise<void> {
  await entities.updateEntityState(id, { assignedCharId: data.assignedCharId });
}

// ── PlayerCharacter queries (building-related, via Entity system) ──

export async function findAssignedCharacter(db: DbClient, entities: IEntityManager, id: string) {
  const entity = (await entities.getEntity(id)) as CharacterEntity | null;
  if (!entity) return null;

  const state = parseCharacterState(entity);
  const character = await db.character.findUnique({
    where: { id: state.characterId },
  });
  if (!character) return null;

  return {
    id: entity.id,
    ...state,
    character,
  };
}

export async function findCharacterWithTemplate(db: DbClient, entities: IEntityManager, id: string, playerId: string) {
  const entity = (await entities.getEntity(id)) as CharacterEntity | null;
  if (!entity || entity.ownerId !== playerId) return null;
  if (entity.template?.schema?.name !== "character") return null;

  const state = parseCharacterState(entity);
  const character = await db.character.findUnique({
    where: { id: state.characterId },
  });
  if (!character) return null;

  return {
    id: entity.id,
    ...state,
    character,
  };
}

export async function findAllPlayerCharacters(entities: IEntityManager, playerId: string) {
  const entityList = (await entities.getEntitiesByOwner(
    playerId,
    "character",
  )) as CharacterEntity[];

  return entityList.map((entity) => ({
    id: entity.id,
    ...parseCharacterState(entity),
  }));
}

export async function updateCharacterStatus(entities: IEntityManager, id: string, status: string, workingAt: string | null) {
  return entities.updateEntityState(id, { status, workingAt });
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
