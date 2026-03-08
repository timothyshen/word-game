import type { PrismaClient } from "@prisma/client";
import type { IEntityManager } from "~/engine/types";

/** State stored in each card Entity instance */
export interface CardEntityState {
  cardId: string;
  quantity: number;
}

/** Parsed entity with typed state */
export interface CardEntity {
  id: string;
  state: string;
  ownerId: string;
  templateId: string;
  template?: { id: string; schema: { id: string; name: string } };
}

export function parseCardState(entity: { state: string }): CardEntityState {
  return JSON.parse(entity.state) as CardEntityState;
}

/** Cached card template ID to avoid repeated lookups */
let cachedCardTemplateId: string | null = null;

/**
 * Find or create the generic card EntityTemplate.
 * All card entities share this template; the actual card type
 * is differentiated via the cardId in state.
 */
export async function getCardTemplateId(
  db: PrismaClient,
  entityManager: IEntityManager,
): Promise<string> {
  if (cachedCardTemplateId) return cachedCardTemplateId;

  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new Error("Game not found");

  const schema = (await entityManager.getSchema(game.id, "card")) as {
    id: string;
  } | null;
  if (!schema) throw new Error("Card entity schema not found");

  let template = (await entityManager.getTemplateBySchemaAndName(
    schema.id,
    "generic-card",
  )) as { id: string } | null;
  if (!template) {
    template = (await entityManager.createTemplate(
      schema.id,
      "generic-card",
      { cardId: "", quantity: 0 },
      { description: "Generic card entity template" },
    )) as { id: string };
  }

  cachedCardTemplateId = template.id;
  return template.id;
}

/**
 * Reset the cached template ID (useful for tests).
 */
export function resetCardTemplateCache(): void {
  cachedCardTemplateId = null;
}

// ── Entity-based card operations ──

/**
 * Find all card entities for a player, returning parsed state with card template info.
 */
export async function findPlayerCardEntities(
  entities: IEntityManager,
  playerId: string,
): Promise<Array<CardEntity>> {
  const rawEntities = (await entities.getEntitiesByOwner(playerId, "card")) as CardEntity[];
  return rawEntities;
}

/**
 * Find a card entity by owner and cardId (from state).
 */
export async function findCardEntityByCardId(
  entities: IEntityManager,
  playerId: string,
  cardId: string,
): Promise<CardEntity | null> {
  const results = (await entities.queryEntitiesByState(playerId, "card", { cardId })) as CardEntity[];
  return results[0] ?? null;
}

/**
 * Add cards to a player: find existing entity with same cardId and increment,
 * or create a new entity.
 */
export async function addCardEntity(
  db: PrismaClient,
  entities: IEntityManager,
  playerId: string,
  cardId: string,
  quantity: number,
): Promise<void> {
  const existing = await findCardEntityByCardId(entities, playerId, cardId);
  if (existing) {
    const state = parseCardState(existing);
    await entities.updateEntityState(existing.id, { quantity: state.quantity + quantity });
  } else {
    const templateId = await getCardTemplateId(db, entities);
    await entities.createEntity(templateId, playerId, { cardId, quantity });
  }
}

/**
 * Consume (decrement) a card entity's quantity. Deletes the entity if quantity reaches 0.
 */
export async function consumeCardEntity(
  entities: IEntityManager,
  entityId: string,
  currentQuantity: number,
  amount: number = 1,
): Promise<void> {
  if (currentQuantity <= amount) {
    await entities.deleteEntity(entityId);
  } else {
    await entities.updateEntityState(entityId, { quantity: currentQuantity - amount });
  }
}
