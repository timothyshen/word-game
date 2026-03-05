/**
 * Equipment Service — equipment management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
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

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllEquipment(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const equipment = await db.playerEquipment.findMany({
    where: { playerId: player.id },
    include: { equipment: true, equippedOn: true },
  });

  return equipment.map((e) => ({
    id: e.id,
    enhanceLevel: e.enhanceLevel,
    equipment: e.equipment,
    isEquipped: !!e.equippedOn,
    equippedTo: e.equippedOn
      ? { slot: e.equippedOn.slot, playerId: e.equippedOn.playerId, characterId: e.equippedOn.playerCharacterId }
      : null,
  }));
}

export async function getCharacterEquipment(db: FullDbClient, userId: string, characterId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await db.playerCharacter.findFirst({
    where: { id: characterId, playerId: player.id },
  });
  if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

  const equipped = await db.equippedItem.findMany({
    where: { playerCharacterId: characterId },
    include: { playerEquipment: { include: { equipment: true } } },
  });

  const slots: Record<string, {
    slot: string; slotName: string;
    equipment: { id: string; name: string; icon: string; rarity: string; enhanceLevel: number;
      stats: { attack: number; defense: number; speed: number; luck: number; hp: number; mp: number };
    } | null;
  }> = {};

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipped.find((e) => e.slot === slot);
    slots[slot] = {
      slot,
      slotName: SLOT_NAMES[slot],
      equipment: item
        ? {
            id: item.playerEquipment.id,
            name: item.playerEquipment.equipment.name,
            icon: item.playerEquipment.equipment.icon,
            rarity: item.playerEquipment.equipment.rarity,
            enhanceLevel: item.playerEquipment.enhanceLevel,
            stats: {
              attack: item.playerEquipment.equipment.attackBonus,
              defense: item.playerEquipment.equipment.defenseBonus,
              speed: item.playerEquipment.equipment.speedBonus,
              luck: item.playerEquipment.equipment.luckBonus,
              hp: item.playerEquipment.equipment.hpBonus,
              mp: item.playerEquipment.equipment.mpBonus,
            },
          }
        : null,
    };
  }

  const totalBonus = { attack: 0, defense: 0, speed: 0, luck: 0, hp: 0, mp: 0 };
  for (const item of equipped) {
    const eq = item.playerEquipment.equipment;
    const enhanceMult = 1 + item.playerEquipment.enhanceLevel * 0.1;
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
  db: FullDbClient, userId: string,
  equipmentId: string, characterId: string, slot: EquipmentSlot,
) {
  const player = await getPlayerOrThrow(db, userId);

  const playerEquipment = await db.playerEquipment.findFirst({
    where: { id: equipmentId, playerId: player.id },
    include: { equipment: true, equippedOn: true },
  });
  if (!playerEquipment) throw new TRPCError({ code: "NOT_FOUND", message: "装备不存在" });

  const equipSlot = playerEquipment.equipment.slot;
  if (equipSlot !== slot && !(equipSlot === "ring" && (slot === "ring1" || slot === "ring2"))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "装备槽位不匹配" });
  }

  const character = await db.playerCharacter.findFirst({
    where: { id: characterId, playerId: player.id },
  });
  if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

  if (playerEquipment.equippedOn) {
    await db.equippedItem.delete({ where: { id: playerEquipment.equippedOn.id } });
  }

  const existingEquipped = await db.equippedItem.findUnique({
    where: { playerCharacterId_slot: { playerCharacterId: characterId, slot } },
  });
  if (existingEquipped) {
    await db.equippedItem.delete({ where: { id: existingEquipped.id } });
  }

  await db.equippedItem.create({
    data: { playerEquipmentId: playerEquipment.id, slot, playerCharacterId: characterId },
  });

  return { equipped: true, equipmentName: playerEquipment.equipment.name, slot, slotName: SLOT_NAMES[slot] };
}

export async function unequipItem(db: FullDbClient, userId: string, characterId: string, slot: EquipmentSlot) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await db.playerCharacter.findFirst({
    where: { id: characterId, playerId: player.id },
  });
  if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

  const equipped = await db.equippedItem.findUnique({
    where: { playerCharacterId_slot: { playerCharacterId: characterId, slot } },
    include: { playerEquipment: { include: { equipment: true } } },
  });
  if (!equipped) throw new TRPCError({ code: "NOT_FOUND", message: "该槽位没有装备" });

  await db.equippedItem.delete({ where: { id: equipped.id } });
  return { unequipped: true, equipmentName: equipped.playerEquipment.equipment.name, slot };
}

export async function enhanceEquipment(db: FullDbClient, userId: string, equipmentId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const playerEquipment = await db.playerEquipment.findFirst({
    where: { id: equipmentId, playerId: player.id },
    include: { equipment: true },
  });
  if (!playerEquipment) throw new TRPCError({ code: "NOT_FOUND", message: "装备不存在" });

  const currentLevel = playerEquipment.enhanceLevel;
  if (currentLevel >= 10) throw new TRPCError({ code: "BAD_REQUEST", message: "装备已达最高强化等级" });

  const baseCost = { gold: 100, crystals: 5 };
  const rarityMult: Record<string, number> = { "普通": 1, "精良": 1.5, "稀有": 2, "史诗": 3, "传说": 5 };
  const mult = (rarityMult[playerEquipment.equipment.rarity] ?? 1) * (1 + currentLevel * 0.5);
  const goldCost = Math.floor(baseCost.gold * mult);
  const crystalsCost = Math.floor(baseCost.crystals * mult);

  if (player.gold < goldCost) throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  if (player.crystals < crystalsCost) throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });

  const successRate = Math.max(0.3, 1 - currentLevel * 0.08);
  const success = Math.random() < successRate;

  await updatePlayer(db, player.id, { gold: { decrement: goldCost }, crystals: { decrement: crystalsCost } });

  if (success) {
    await db.playerEquipment.update({ where: { id: playerEquipment.id }, data: { enhanceLevel: currentLevel + 1 } });
    return { success: true, newLevel: currentLevel + 1, equipmentName: playerEquipment.equipment.name, cost: { gold: goldCost, crystals: crystalsCost } };
  }
  return { success: false, currentLevel, equipmentName: playerEquipment.equipment.name, cost: { gold: goldCost, crystals: crystalsCost }, message: "强化失败，装备等级未变化" };
}

export async function getAvailableEquipment(db: FullDbClient, userId: string, slot?: EquipmentSlot) {
  const player = await getPlayerOrThrow(db, userId);

  const where: { playerId: string; equippedOn: null; equipment?: { slot: string } } = {
    playerId: player.id, equippedOn: null,
  };
  if (slot) {
    where.equipment = { slot: slot.startsWith("ring") ? "ring" : slot };
  }

  const available = await db.playerEquipment.findMany({ where, include: { equipment: true } });
  return available.map((e) => ({ id: e.id, enhanceLevel: e.enhanceLevel, equipment: e.equipment }));
}
