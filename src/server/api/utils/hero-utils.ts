/**
 * Hero utilities — resolve character data from Entity system for HeroInstance
 */
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { parseCharacterState, type CharacterEntityState } from "./character-utils";

export interface ResolvedHeroCharacter {
  name: string;
  portrait: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
}

/**
 * Resolve character stats and template info for a HeroInstance.
 * Replaces the old `hero.character.character.name` pattern.
 */
export async function resolveHeroCharacter(
  db: FullDbClient,
  entities: IEntityManager,
  characterEntityId: string,
): Promise<{ state: CharacterEntityState; template: { name: string; portrait: string } }> {
  const entity = await entities.getEntity(characterEntityId) as { id: string; state: string } | null;
  if (!entity) throw new Error(`Character entity ${characterEntityId} not found`);

  const state = parseCharacterState(entity);
  const charTemplate = await db.character.findUnique({ where: { id: state.characterId } });

  return {
    state,
    template: {
      name: charTemplate?.name ?? "未知角色",
      portrait: charTemplate?.portrait ?? "👤",
    },
  };
}
