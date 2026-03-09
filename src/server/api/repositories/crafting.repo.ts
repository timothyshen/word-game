/**
 * Crafting Repository — recipe queries + material Entity CRUD with stacking
 */
import type { IEntityManager } from "~/engine/types";
import type { EntityWithRelations } from "~/engine/entity/IEntityStore";
import type { DbClient } from "./types";

// ── Types ──

export interface MaterialInfo {
  entityId: string;
  templateId: string;
  name: string;
  icon: string;
  rarity: string;
  count: number;
}

export interface RecipeMaterial {
  materialTemplateId: string;
  count: number;
}

/** State stored in each material Entity instance */
interface MaterialEntityState {
  stackable: {
    count: number;
    maxStack: number;
  };
}

function parseMaterialState(entity: { state: string }): MaterialEntityState {
  return JSON.parse(entity.state) as MaterialEntityState;
}

// ── Recipe queries ──

export function findAllRecipes(db: DbClient) {
  return db.craftingRecipe.findMany({ orderBy: { requiredLevel: "asc" } });
}

export function findRecipeById(db: DbClient, id: string) {
  return db.craftingRecipe.findUnique({ where: { id } });
}

export function findRecipesByCategory(db: DbClient, category: string) {
  return db.craftingRecipe.findMany({
    where: { category },
    orderBy: { requiredLevel: "asc" },
  });
}

// ── Material Entity operations ──

export async function findPlayerMaterials(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
): Promise<MaterialInfo[]> {
  const materialEntities = (await entities.getEntitiesByOwner(
    playerId,
    "material",
  )) as EntityWithRelations[];

  return materialEntities.map((entity) => {
    const state = parseMaterialState(entity);
    return {
      entityId: entity.id,
      templateId: entity.templateId,
      name: entity.template.name,
      icon: entity.template.icon,
      rarity: entity.template.rarity ?? "普通",
      count: state.stackable.count,
    };
  });
}

export async function addMaterial(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  materialTemplateId: string,
  count: number,
): Promise<void> {
  // Check if this player already has a stack of this material
  const existing = (await entities.findEntityByOwnerAndTemplate(
    playerId,
    materialTemplateId,
  )) as EntityWithRelations | null;

  if (existing) {
    // Update existing stack count
    const state = parseMaterialState(existing);
    await entities.updateEntityState(existing.id, {
      stackable: {
        ...state.stackable,
        count: state.stackable.count + count,
      },
    });
  } else {
    // Create new material entity with initial count
    await entities.createEntity(materialTemplateId, playerId, {
      stackable: { count, maxStack: 99 },
    });
  }
}

export async function removeMaterial(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  materialTemplateId: string,
  count: number,
): Promise<boolean> {
  const existing = (await entities.findEntityByOwnerAndTemplate(
    playerId,
    materialTemplateId,
  )) as EntityWithRelations | null;

  if (!existing) return false;

  const state = parseMaterialState(existing);
  const currentCount = state.stackable.count;

  if (currentCount < count) return false;

  if (currentCount === count) {
    // Remove the entity entirely when count reaches 0
    await entities.deleteEntity(existing.id);
  } else {
    await entities.updateEntityState(existing.id, {
      stackable: {
        ...state.stackable,
        count: currentCount - count,
      },
    });
  }

  return true;
}

export async function getMaterialCount(
  db: DbClient,
  entities: IEntityManager,
  playerId: string,
  materialTemplateId: string,
): Promise<number> {
  const existing = (await entities.findEntityByOwnerAndTemplate(
    playerId,
    materialTemplateId,
  )) as EntityWithRelations | null;

  if (!existing) return 0;

  const state = parseMaterialState(existing);
  return state.stackable.count;
}
