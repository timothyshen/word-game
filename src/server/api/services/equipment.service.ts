/**
 * Equipment Service — equipment management business logic
 *
 * Uses the Entity system (EntityManager) for equipment instances.
 * The Equipment template table is still used for base stat lookups.
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";

const EQUIPMENT_SLOTS = [
  "mainHand", "offHand", "helmet", "chest", "belt",
  "gloves", "pants", "boots", "necklace", "ring1", "ring2",
] as const;

type EquipmentSlot = typeof EQUIPMENT_SLOTS[number];

const SLOT_NAMES: Record<EquipmentSlot, string> = {
  mainHand: "主手", offHand: "副手", helmet: "头盔", chest: "胸甲", belt: "腰带",
  gloves: "手套", pants: "腿甲", boots: "鞋子", necklace: "项链", ring1: "戒指1", ring2: "戒指2",
};

export { EQUIPMENT_SLOTS, SLOT_NAMES };
export type { EquipmentSlot };

/** State stored in each equipment Entity instance */
interface EquipmentEntityState {
  enhanceLevel: number;
  equippedBy: string | null;
  slot: string | null;
  equipmentId: string;
}

function parseEntityState(entity: { state: string }): EquipmentEntityState {
  return JSON.parse(entity.state) as EquipmentEntityState;
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllEquipment(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const entityList = await entities.getEntitiesByOwner(player.id, "equipment") as Array<{ id: string; state: string }>;

  const results = [];
  for (const entity of entityList) {
    const state = parseEntityState(entity);
    const equipment = await db.equipment.findUnique({ where: { id: state.equipmentId } });
    if (!equipment) continue;

    results.push({
      id: entity.id,
      enhanceLevel: state.enhanceLevel,
      equipment,
      isEquipped: !!state.equippedBy,
      equippedTo: state.equippedBy
        ? { slot: state.slot, playerId: player.id, characterId: state.equippedBy }
        : null,
    });
  }

  return results;
}

export async function getCharacterEquipment(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const charEntity = await entities.getEntity(characterId) as { id: string; ownerId: string; template?: { schema: { name: string } } } | null;
  if (!charEntity || charEntity.ownerId !== player.id || charEntity.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  // Find all equipment entities equipped by this character
  const equippedEntities = await entities.queryEntitiesByState(player.id, "equipment", { equippedBy: characterId }) as Array<{ id: string; state: string }>;

  const slots: Record<string, {
    slot: string; slotName: string;
    equipment: { id: string; name: string; icon: string; rarity: string; enhanceLevel: number;
      stats: { attack: number; defense: number; speed: number; luck: number; hp: number; mp: number };
    } | null;
  }> = {};

  // Build a map of equipped items by slot
  const equippedBySlot = new Map<string, { entityId: string; state: EquipmentEntityState }>();
  for (const entity of equippedEntities) {
    const state = parseEntityState(entity);
    if (state.slot) {
      equippedBySlot.set(state.slot, { entityId: entity.id, state });
    }
  }

  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = equippedBySlot.get(slot);
    if (equipped) {
      const eq = await db.equipment.findUnique({ where: { id: equipped.state.equipmentId } });
      slots[slot] = {
        slot,
        slotName: SLOT_NAMES[slot],
        equipment: eq
          ? {
              id: equipped.entityId,
              name: eq.name,
              icon: eq.icon,
              rarity: eq.rarity,
              enhanceLevel: equipped.state.enhanceLevel,
              stats: {
                attack: eq.attackBonus,
                defense: eq.defenseBonus,
                speed: eq.speedBonus,
                luck: eq.luckBonus,
                hp: eq.hpBonus,
                mp: eq.mpBonus,
              },
            }
          : null,
      };
    } else {
      slots[slot] = { slot, slotName: SLOT_NAMES[slot], equipment: null };
    }
  }

  const totalBonus = { attack: 0, defense: 0, speed: 0, luck: 0, hp: 0, mp: 0 };
  for (const equipped of equippedBySlot.values()) {
    const eq = await db.equipment.findUnique({ where: { id: equipped.state.equipmentId } });
    if (!eq) continue;
    const enhanceMult = 1 + equipped.state.enhanceLevel * 0.1;
    totalBonus.attack += Math.floor(eq.attackBonus * enhanceMult);
    totalBonus.defense += Math.floor(eq.defenseBonus * enhanceMult);
    totalBonus.speed += Math.floor(eq.speedBonus * enhanceMult);
    totalBonus.luck += Math.floor(eq.luckBonus * enhanceMult);
    totalBonus.hp += Math.floor(eq.hpBonus * enhanceMult);
    totalBonus.mp += Math.floor(eq.mpBonus * enhanceMult);
  }

  return { slots, totalBonus };
}

export async function equipItem(
  db: FullDbClient, entities: IEntityManager, userId: string,
  equipmentId: string, characterId: string, slot: EquipmentSlot,
) {
  const player = await getPlayerOrThrow(db, userId);

  // Find the equipment entity
  const entity = await entities.getEntity(equipmentId) as { id: string; ownerId: string; state: string } | null;
  if (!entity || entity.ownerId !== player.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "装备不存在" });
  }

  const state = parseEntityState(entity);

  // Look up the Equipment template for slot validation
  const equipTemplate = await db.equipment.findUnique({ where: { id: state.equipmentId } });
  if (!equipTemplate) throw new TRPCError({ code: "NOT_FOUND", message: "装备模板不存在" });

  const equipSlot = equipTemplate.slot;
  if (equipSlot !== slot && !(equipSlot === "ring" && (slot === "ring1" || slot === "ring2"))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "装备槽位不匹配" });
  }

  const charEntity2 = await entities.getEntity(characterId) as { id: string; ownerId: string; template?: { schema: { name: string } } } | null;
  if (!charEntity2 || charEntity2.ownerId !== player.id || charEntity2.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  // If this equipment is already equipped somewhere, unequip it first
  if (state.equippedBy) {
    await entities.updateEntityState(entity.id, { equippedBy: null, slot: null });
  }

  // If there's already something in the target slot on this character, unequip it
  const existingInSlot = await entities.queryEntitiesByState(player.id, "equipment", { equippedBy: characterId, slot }) as Array<{ id: string }>;
  for (const existing of existingInSlot) {
    if (existing.id !== entity.id) {
      await entities.updateEntityState(existing.id, { equippedBy: null, slot: null });
    }
  }

  // Equip the item
  await entities.updateEntityState(entity.id, { equippedBy: characterId, slot });

  return { equipped: true, equipmentName: equipTemplate.name, slot, slotName: SLOT_NAMES[slot] };
}

export async function unequipItem(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string, slot: EquipmentSlot) {
  const player = await getPlayerOrThrow(db, userId);

  const charEntity3 = await entities.getEntity(characterId) as { id: string; ownerId: string; template?: { schema: { name: string } } } | null;
  if (!charEntity3 || charEntity3.ownerId !== player.id || charEntity3.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  const equippedInSlot = await entities.queryEntitiesByState(player.id, "equipment", { equippedBy: characterId, slot }) as Array<{ id: string; state: string }>;
  if (equippedInSlot.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "该槽位没有装备" });
  }

  const entity = equippedInSlot[0]!;
  const state = parseEntityState(entity);

  const equipTemplate = await db.equipment.findUnique({ where: { id: state.equipmentId } });
  const equipmentName = equipTemplate?.name ?? "未知装备";

  await entities.updateEntityState(entity.id, { equippedBy: null, slot: null });

  return { unequipped: true, equipmentName, slot };
}

export async function enhanceEquipment(db: FullDbClient, entities: IEntityManager, userId: string, equipmentId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const entity = await entities.getEntity(equipmentId) as { id: string; ownerId: string; state: string } | null;
  if (!entity || entity.ownerId !== player.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "装备不存在" });
  }

  const state = parseEntityState(entity);
  const equipTemplate = await db.equipment.findUnique({ where: { id: state.equipmentId } });
  if (!equipTemplate) throw new TRPCError({ code: "NOT_FOUND", message: "装备模板不存在" });

  const currentLevel = state.enhanceLevel;
  if (currentLevel >= 10) throw new TRPCError({ code: "BAD_REQUEST", message: "装备已达最高强化等级" });

  const baseCost = { gold: 100, crystals: 5 };
  const rarityMult: Record<string, number> = { "普通": 1, "精良": 1.5, "稀有": 2, "史诗": 3, "传说": 5 };
  const mult = (rarityMult[equipTemplate.rarity] ?? 1) * (1 + currentLevel * 0.5);
  const goldCost = Math.floor(baseCost.gold * mult);
  const crystalsCost = Math.floor(baseCost.crystals * mult);

  if (player.gold < goldCost) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  if (player.crystals < crystalsCost) throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });

  const successRate = Math.max(0.3, 1 - currentLevel * 0.08);
  const success = Math.random() < successRate;

  await updatePlayer(db, player.id, { gold: { decrement: goldCost }, crystals: { decrement: crystalsCost } });

  if (success) {
    await entities.updateEntityState(entity.id, { enhanceLevel: currentLevel + 1 });
    return { success: true, newLevel: currentLevel + 1, equipmentName: equipTemplate.name, cost: { gold: goldCost, crystals: crystalsCost } };
  }
  return { success: false, currentLevel, equipmentName: equipTemplate.name, cost: { gold: goldCost, crystals: crystalsCost }, message: "强化失败，装备等级未变化" };
}

export async function getAvailableEquipment(db: FullDbClient, entities: IEntityManager, userId: string, slot?: EquipmentSlot) {
  const player = await getPlayerOrThrow(db, userId);

  // Get all unequipped equipment entities
  const allEntities = await entities.getEntitiesByOwner(player.id, "equipment") as Array<{ id: string; state: string }>;
  const unequipped = allEntities.filter((e) => {
    const state = parseEntityState(e);
    return state.equippedBy === null;
  });

  const results = [];
  for (const entity of unequipped) {
    const state = parseEntityState(entity);
    const equipment = await db.equipment.findUnique({ where: { id: state.equipmentId } });
    if (!equipment) continue;

    // Filter by slot if specified
    if (slot) {
      const targetSlot = slot.startsWith("ring") ? "ring" : slot;
      if (equipment.slot !== targetSlot) continue;
    }

    results.push({ id: entity.id, enhanceLevel: state.enhanceLevel, equipment });
  }

  return results;
}
