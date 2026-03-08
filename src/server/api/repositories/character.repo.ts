/**
 * Character Repository — data access for PlayerCharacter via Entity system
 *
 * Uses EntityManager for character instances.
 * The Character template table is still used for base stat/config lookups.
 */
import type { IEntityManager } from "~/engine/types";
import type { DbClient } from "./types";
import {
  parseCharacterState,
  type CharacterEntityState,
  type CharacterEntity,
} from "../utils/character-utils";

// ── Character Entity queries ──

export async function findPlayerCharacters(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
) {
  const entityList = (await entities.getEntitiesByOwner(
    playerId,
    "character",
  )) as CharacterEntity[];

  const results = [];
  for (const entity of entityList) {
    const state = parseCharacterState(entity);
    const character = await db.character.findUnique({
      where: { id: state.characterId },
    });
    if (!character) continue;

    // Load profession and skills from junction tables (still in Prisma)
    const profession = await db.characterProfession.findFirst({
      where: { playerCharacterId: entity.id },
      include: { profession: true },
    });
    const learnedSkills = await db.characterSkill.findMany({
      where: { playerCharacterId: entity.id },
      include: { skill: true },
    });

    results.push({
      id: entity.id,
      ...state,
      character,
      profession: profession ?? null,
      learnedSkills,
    });
  }

  return results;
}

export async function findPlayerCharacterById(
  db: DbClient,
  entities: IEntityManager,
  id: string,
  playerId: string,
) {
  const entity = (await entities.getEntity(id)) as CharacterEntity | null;
  if (!entity || entity.ownerId !== playerId) return null;

  // Verify it's a character entity
  if (entity.template?.schema?.name !== "character") return null;

  const state = parseCharacterState(entity);
  const character = await db.character.findUnique({
    where: { id: state.characterId },
  });
  if (!character) return null;

  const profession = await db.characterProfession.findFirst({
    where: { playerCharacterId: entity.id },
    include: { profession: true },
  });
  const learnedSkills = await db.characterSkill.findMany({
    where: { playerCharacterId: entity.id },
    include: { skill: true },
  });

  return {
    id: entity.id,
    ...state,
    character,
    profession: profession ?? null,
    learnedSkills,
  };
}

export async function findPlayerCharacterWithTemplate(
  db: DbClient,
  entities: IEntityManager,
  id: string,
  playerId: string,
) {
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

export async function findPlayerCharacterBasic(
  _db: DbClient,
  entities: IEntityManager,
  id: string,
  playerId: string,
) {
  const entity = (await entities.getEntity(id)) as CharacterEntity | null;
  if (!entity || entity.ownerId !== playerId) return null;
  if (entity.template?.schema?.name !== "character") return null;

  const state = parseCharacterState(entity);
  return {
    id: entity.id,
    ...state,
  };
}

export async function findIdleCharacters(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
) {
  const idleEntities = (await entities.queryEntitiesByState(
    playerId,
    "character",
    { status: "idle" },
  )) as CharacterEntity[];

  const results = [];
  for (const entity of idleEntities) {
    const state = parseCharacterState(entity);
    const character = await db.character.findUnique({
      where: { id: state.characterId },
    });
    if (!character) continue;

    results.push({
      id: entity.id,
      ...state,
      character,
    });
  }

  return results;
}

export async function updateCharacter(
  entities: IEntityManager,
  id: string,
  data: Partial<CharacterEntityState>,
) {
  return entities.updateEntityState(id, data);
}

// ── Building queries (via Entity system) ──

export async function findBuildingByAssignedChar(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  characterId: string,
) {
  const { findBuildingByAssignedChar: findByChar, parseBuildingState } = await import("../utils/building-utils");
  const entity = await findByChar(entities, playerId, characterId);
  if (!entity) return null;
  const state = parseBuildingState(entity);
  const building = await db.building.findUnique({ where: { id: state.buildingId } });
  return { id: entity.id, ...state, building };
}

export async function findBuildingByAssignedCharBasic(
  entities: IEntityManager,
  playerId: string,
  characterId: string,
) {
  const { findBuildingByAssignedChar: findByChar, parseBuildingState } = await import("../utils/building-utils");
  const entity = await findByChar(entities, playerId, characterId);
  if (!entity) return null;
  const state = parseBuildingState(entity);
  return { id: entity.id, ...state };
}

export async function findPlayerBuildingWithTemplate(
  db: DbClient,
  entities: IEntityManager,
  id: string,
  playerId: string,
) {
  const { findBuildingEntityById, parseBuildingState } = await import("../utils/building-utils");
  const entity = await findBuildingEntityById(entities, id, playerId);
  if (!entity) return null;
  const state = parseBuildingState(entity);
  const building = await db.building.findUnique({ where: { id: state.buildingId } });
  return { id: entity.id, ...state, building };
}

export async function updatePlayerBuilding(
  entities: IEntityManager,
  id: string,
  data: { assignedCharId?: string | null; status?: string },
) {
  const updateData: Record<string, unknown> = {};
  if (data.assignedCharId !== undefined) updateData.assignedCharId = data.assignedCharId;
  await entities.updateEntityState(id, updateData);
}
