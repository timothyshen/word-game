import type { PrismaClient } from "@prisma/client";
import type { IEntityManager } from "~/engine/types";

/** State stored in each character Entity instance */
export interface CharacterEntityState {
  characterId: string;
  level: number;
  exp: number;
  maxLevel: number;
  tier: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  status: string;
  workingAt: string | null;
}

/** Parsed entity with typed state */
export interface CharacterEntity {
  id: string;
  state: string;
  ownerId: string;
  templateId: string;
  template?: { id: string; schema: { id: string; name: string } };
}

export function parseCharacterState(entity: { state: string }): CharacterEntityState {
  return JSON.parse(entity.state) as CharacterEntityState;
}

/** Cached character template ID to avoid repeated lookups */
let cachedCharacterTemplateId: string | null = null;

/**
 * Find or create the generic character EntityTemplate.
 * All character entities share this template; the actual character type
 * is differentiated via the characterId in state.
 */
export async function getCharacterTemplateId(
  db: PrismaClient,
  entityManager: IEntityManager,
): Promise<string> {
  if (cachedCharacterTemplateId) return cachedCharacterTemplateId;

  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new Error("Game not found");

  const schema = (await entityManager.getSchema(game.id, "character")) as {
    id: string;
  } | null;
  if (!schema) throw new Error("Character entity schema not found");

  let template = (await entityManager.getTemplateBySchemaAndName(
    schema.id,
    "generic-character",
  )) as { id: string } | null;
  if (!template) {
    template = (await entityManager.createTemplate(
      schema.id,
      "generic-character",
      {
        characterId: "",
        level: 1,
        exp: 0,
        maxLevel: 10,
        tier: 1,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        speed: 8,
        luck: 5,
        status: "idle",
        workingAt: null,
      },
      { description: "Generic character entity template" },
    )) as { id: string };
  }

  cachedCharacterTemplateId = template.id;
  return template.id;
}

/**
 * Reset the cached template ID (useful for tests).
 */
export function resetCharacterTemplateCache(): void {
  cachedCharacterTemplateId = null;
}
