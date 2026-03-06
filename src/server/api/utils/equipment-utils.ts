import type { PrismaClient } from "@prisma/client";
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

/**
 * Grant a random equipment of the given rarity to a player.
 * Creates a new PlayerEquipment instance (unequipped).
 * Returns equipment info if granted, null if no equipment of that rarity exists.
 */
export async function grantRandomEquipment(
  db: PrismaClient,
  playerId: string,
  rarity: string,
): Promise<EquipmentDropResult | null> {
  const templates = await db.equipment.findMany({ where: { rarity } });
  if (templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)]!;

  await db.playerEquipment.create({
    data: { playerId, equipmentId: template.id },
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
