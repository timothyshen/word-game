import type { PrismaClient } from "@prisma/client";
import type { IEntityManager } from "~/engine/types";
import { rollRarity } from "./card-utils";

export interface EquipmentDropResult {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  icon: string;
  description: string;
}

/**
 * Get equipment drop chance and rarity pool based on monster level.
 */
export function getEquipmentDropTable(monsterLevel: number): {
  chance: number;
  pool: Record<string, number>;
} {
  if (monsterLevel >= 36) return { chance: 0.20, pool: { "稀有": 40, "史诗": 40, "传说": 20 } };
  if (monsterLevel >= 21) return { chance: 0.18, pool: { "精良": 40, "稀有": 40, "史诗": 20 } };
  if (monsterLevel >= 11) return { chance: 0.15, pool: { "普通": 40, "精良": 40, "稀有": 20 } };
  if (monsterLevel >= 6)  return { chance: 0.12, pool: { "普通": 70, "精良": 30 } };
  return { chance: 0.08, pool: { "普通": 100 } };
}

/** Cached equipment template ID to avoid repeated lookups */
let cachedEquipmentTemplateId: string | null = null;

/**
 * Find or create the generic equipment EntityTemplate.
 * All equipment entities share this template; the actual equipment type
 * is differentiated via the equipmentId in state.
 */
async function getEquipmentTemplateId(db: PrismaClient, entityManager: IEntityManager): Promise<string> {
  if (cachedEquipmentTemplateId) return cachedEquipmentTemplateId;

  // Find the equipment schema
  const game = await db.game.findFirst({ where: { name: "诸天领域" } });
  if (!game) throw new Error("Game not found");

  const schema = await entityManager.getSchema(game.id, "equipment") as { id: string } | null;
  if (!schema) throw new Error("Equipment entity schema not found");

  // Find or create the generic equipment template
  let template = await entityManager.getTemplateBySchemaAndName(schema.id, "generic-equipment") as { id: string } | null;
  if (!template) {
    template = await entityManager.createTemplate(
      schema.id,
      "generic-equipment",
      { enhanceLevel: 0, equippedBy: null, slot: null, equipmentId: "" },
      { description: "Generic equipment entity template" },
    ) as { id: string };
  }

  cachedEquipmentTemplateId = template.id;
  return template.id;
}

/**
 * Grant a random equipment of the given rarity to a player.
 * Creates a new equipment Entity instance (unequipped).
 * Returns equipment info if granted, null if no equipment of that rarity exists.
 */
export async function grantRandomEquipment(
  db: PrismaClient,
  entityManager: IEntityManager,
  playerId: string,
  rarity: string,
): Promise<EquipmentDropResult | null> {
  const templates = await db.equipment.findMany({ where: { rarity } });
  if (templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)]!;

  const entityTemplateId = await getEquipmentTemplateId(db, entityManager);
  await entityManager.createEntity(entityTemplateId, playerId, {
    enhanceLevel: 0,
    equippedBy: null,
    slot: null,
    equipmentId: template.id,
  });

  return {
    id: template.id,
    name: template.name,
    slot: template.slot,
    rarity: template.rarity,
    icon: template.icon,
    description: template.description,
  };
}

export { rollRarity };
