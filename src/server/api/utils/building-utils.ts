import type { PrismaClient } from "@prisma/client";
import type { IEntityManager } from "~/engine/types";

/** State stored in each building Entity instance */
export interface BuildingEntityState {
  buildingId: string;
  level: number;
  positionX: number;
  positionY: number;
  assignedCharId: string | null;
}

/** Parsed entity with typed state */
export interface BuildingEntity {
  id: string;
  state: string;
  ownerId: string;
  templateId: string;
  template?: { id: string; schema: { id: string; name: string } };
}

export function parseBuildingState(entity: { state: string }): BuildingEntityState {
  return JSON.parse(entity.state) as BuildingEntityState;
}

/** Cached building template ID to avoid repeated lookups */
let cachedBuildingTemplateId: string | null = null;

/**
 * Find or create the generic building EntityTemplate.
 * All building entities share this template; the actual building type
 * is differentiated via the buildingId in state.
 */
export async function getBuildingTemplateId(
  db: PrismaClient,
  entityManager: IEntityManager,
): Promise<string> {
  if (cachedBuildingTemplateId) return cachedBuildingTemplateId;

  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new Error("Game not found");

  const schema = (await entityManager.getSchema(game.id, "building")) as {
    id: string;
  } | null;
  if (!schema) throw new Error("Building entity schema not found");

  let template = (await entityManager.getTemplateBySchemaAndName(
    schema.id,
    "generic-building",
  )) as { id: string } | null;
  if (!template) {
    template = (await entityManager.createTemplate(
      schema.id,
      "generic-building",
      {
        buildingId: "",
        level: 1,
        positionX: 0,
        positionY: 0,
        assignedCharId: null,
      },
      { description: "Generic building entity template" },
    )) as { id: string };
  }

  cachedBuildingTemplateId = template.id;
  return template.id;
}

/**
 * Reset the cached template ID (useful for tests).
 */
export function resetBuildingTemplateCache(): void {
  cachedBuildingTemplateId = null;
}

// ── Entity-based building operations ──

/**
 * Find all building entities for a player, returning raw entities.
 */
export async function findPlayerBuildingEntities(
  entities: IEntityManager,
  playerId: string,
): Promise<BuildingEntity[]> {
  return (await entities.getEntitiesByOwner(playerId, "building")) as BuildingEntity[];
}

/**
 * Find a building entity by its entity ID and verify ownership.
 */
export async function findBuildingEntityById(
  entities: IEntityManager,
  id: string,
  playerId: string,
): Promise<BuildingEntity | null> {
  const entity = (await entities.getEntity(id)) as BuildingEntity | null;
  if (!entity || entity.ownerId !== playerId) return null;
  if (entity.template?.schema?.name !== "building") return null;
  return entity;
}

/**
 * Find building entities at a specific position for a player.
 */
export async function findBuildingEntityByPosition(
  entities: IEntityManager,
  playerId: string,
  positionX: number,
  positionY: number,
): Promise<BuildingEntity | null> {
  const results = (await entities.queryEntitiesByState(playerId, "building", {
    positionX,
    positionY,
  })) as BuildingEntity[];
  return results[0] ?? null;
}

/**
 * Find building entities by buildingId (template reference) for a player.
 */
export async function findBuildingEntityByBuildingId(
  entities: IEntityManager,
  playerId: string,
  buildingId: string,
): Promise<BuildingEntity | null> {
  const results = (await entities.queryEntitiesByState(playerId, "building", {
    buildingId,
  })) as BuildingEntity[];
  return results[0] ?? null;
}

/**
 * Find a building entity that has a specific character assigned.
 */
export async function findBuildingByAssignedChar(
  entities: IEntityManager,
  playerId: string,
  characterId: string,
): Promise<BuildingEntity | null> {
  const results = (await entities.queryEntitiesByState(playerId, "building", {
    assignedCharId: characterId,
  })) as BuildingEntity[];
  return results[0] ?? null;
}

/**
 * Create a new building entity.
 */
export async function createBuildingEntity(
  db: PrismaClient,
  entities: IEntityManager,
  playerId: string,
  data: { buildingId: string; level: number; positionX: number; positionY: number },
): Promise<BuildingEntity> {
  const templateId = await getBuildingTemplateId(db, entities);
  return (await entities.createEntity(templateId, playerId, {
    buildingId: data.buildingId,
    level: data.level,
    positionX: data.positionX,
    positionY: data.positionY,
    assignedCharId: null,
  })) as BuildingEntity;
}
