/**
 * Card Repository — data access for Card entities (via EntityManager), Card templates, UnlockFlag, PlayerSkill, CharacterSkill
 */
import type { DbClient } from "./types";
import type { IEntityManager } from "~/engine/types";
import {
  findCardEntityByCardId,
  findPlayerCardEntities,
  parseCardState,
  consumeCardEntity,
  addCardEntity,
  type CardEntity,
} from "../utils/card-entity-utils";

// ── PlayerCard queries (Entity-based) ──

/** Represents a player card with its template info, matching the old Prisma shape */
export interface PlayerCardWithTemplate {
  id: string;
  quantity: number;
  card: {
    id: string;
    name: string;
    type: string;
    rarity: string;
    icon: string;
    description: string;
    effects: string;
  };
}

/** Load card template from DB */
async function loadCardTemplate(db: DbClient, cardId: string) {
  return db.card.findUnique({ where: { id: cardId } });
}

/** Convert a card entity + template into the PlayerCardWithTemplate shape */
function toPlayerCardWithTemplate(
  entity: CardEntity,
  state: { cardId: string; quantity: number },
  card: { id: string; name: string; type: string; rarity: string; icon: string; description: string; effects: string },
): PlayerCardWithTemplate {
  return {
    id: entity.id,
    quantity: state.quantity,
    card,
  };
}

export async function findPlayerCards(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
): Promise<PlayerCardWithTemplate[]> {
  const cardEntities = await findPlayerCardEntities(entities, playerId);
  const results: PlayerCardWithTemplate[] = [];

  for (const entity of cardEntities) {
    const state = parseCardState(entity);
    const card = await loadCardTemplate(db, state.cardId);
    if (card) {
      results.push(toPlayerCardWithTemplate(entity, state, card));
    }
  }

  // Sort by type then rarity to match old behavior
  results.sort((a, b) => {
    const typeCmp = a.card.type.localeCompare(b.card.type);
    if (typeCmp !== 0) return typeCmp;
    return a.card.rarity.localeCompare(b.card.rarity);
  });

  return results;
}

export async function findPlayerCardsByType(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  type: string,
): Promise<PlayerCardWithTemplate[]> {
  const all = await findPlayerCards(db, entities, playerId);
  return all.filter(pc => pc.card.type === type);
}

export async function findPlayerCardByCardId(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  cardId: string,
): Promise<PlayerCardWithTemplate | null> {
  const entity = await findCardEntityByCardId(entities, playerId, cardId);
  if (!entity) return null;
  const state = parseCardState(entity);
  const card = await loadCardTemplate(db, state.cardId);
  if (!card) return null;
  return toPlayerCardWithTemplate(entity, state, card);
}

export async function findPlayerCardUnique(
  entities: IEntityManager,
  playerId: string,
  cardId: string,
): Promise<{ id: string; quantity: number } | null> {
  const entity = await findCardEntityByCardId(entities, playerId, cardId);
  if (!entity) return null;
  const state = parseCardState(entity);
  return { id: entity.id, quantity: state.quantity };
}

export async function deletePlayerCard(entities: IEntityManager, id: string): Promise<void> {
  await entities.deleteEntity(id);
}

export async function updatePlayerCardQuantity(entities: IEntityManager, id: string, quantity: number): Promise<void> {
  await entities.updateEntityState(id, { quantity });
}

export async function createPlayerCardRecord(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  cardId: string,
  quantity: number,
): Promise<void> {
  await addCardEntity(db as Parameters<typeof addCardEntity>[0], entities, playerId, cardId, quantity);
}

/** Decrement card quantity by 1, or delete if last copy */
export async function consumeCard(entities: IEntityManager, playerCardId: string, currentQuantity: number): Promise<void> {
  await consumeCardEntity(entities, playerCardId, currentQuantity);
}

// ── Card template queries ──

export function findCardById(db: DbClient, id: string) {
  return db.card.findUnique({ where: { id } });
}

// ── UnlockFlag ──

export function upsertUnlockFlag(db: DbClient, playerId: string, flagName: string) {
  return db.unlockFlag.upsert({
    where: { playerId_flagName: { playerId, flagName } },
    update: {},
    create: { playerId, flagName },
  });
}

// ── Skill queries (for skill cards) ──

export function findSkillById(db: DbClient, id: string) {
  return db.skill.findUnique({ where: { id } });
}

export function findPlayerSkillUnique(db: DbClient, playerId: string, skillId: string) {
  return db.playerSkill.findUnique({
    where: { playerId_skillId: { playerId, skillId } },
  });
}

export function createPlayerSkillRecord(db: DbClient, playerId: string, skillId: string, level: number) {
  return db.playerSkill.create({ data: { playerId, skillId, level } });
}

export function updatePlayerSkillLevel(db: DbClient, id: string, level: number) {
  return db.playerSkill.update({ where: { id }, data: { level } });
}

export function findCharacterSkillUnique(db: DbClient, playerCharacterId: string, skillId: string) {
  return db.characterSkill.findUnique({
    where: { playerCharacterId_skillId: { playerCharacterId, skillId } },
  });
}

export function createCharacterSkillRecord(db: DbClient, playerCharacterId: string, skillId: string, level: number) {
  return db.characterSkill.create({ data: { playerCharacterId, skillId, level } });
}

export function updateCharacterSkillLevel(db: DbClient, id: string, level: number) {
  return db.characterSkill.update({ where: { id }, data: { level } });
}

// ── Building template (for building cards) ──

export function findBuildingTemplateById(db: DbClient, id: string) {
  return db.building.findUnique({ where: { id } });
}

export async function findPlayerBuildingByPosition(
  entities: IEntityManager,
  playerId: string,
  positionX: number,
  positionY: number,
) {
  const { findBuildingEntityByPosition } = await import("../utils/building-utils");
  return findBuildingEntityByPosition(entities, playerId, positionX, positionY);
}

export async function createPlayerBuildingRecord(
  db: DbClient,
  entities: IEntityManager,
  data: { playerId: string; buildingId: string; level: number; positionX: number; positionY: number },
) {
  const { createBuildingEntity, parseBuildingState } = await import("../utils/building-utils");
  const entity = await createBuildingEntity(
    db as Parameters<typeof createBuildingEntity>[0],
    entities,
    data.playerId,
    { buildingId: data.buildingId, level: data.level, positionX: data.positionX, positionY: data.positionY },
  );
  const state = parseBuildingState(entity);
  const building = await db.building.findUnique({ where: { id: state.buildingId } });
  return { ...state, id: entity.id, playerId: data.playerId, building };
}

// ── Character template (for recruit cards) ──

export function findCharacterTemplateById(db: DbClient, id: string) {
  return db.character.findUnique({ where: { id } });
}
