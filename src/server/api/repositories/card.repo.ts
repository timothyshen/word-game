/**
 * Card Repository — pure data access for PlayerCard, Card, UnlockFlag, PlayerSkill, CharacterSkill
 */
import type { DbClient } from "./types";

// ── PlayerCard queries ──

export function findPlayerCards(db: DbClient, playerId: string) {
  return db.playerCard.findMany({
    where: { playerId },
    include: { card: true },
    orderBy: [{ card: { type: "asc" } }, { card: { rarity: "asc" } }],
  });
}

export function findPlayerCardsByType(db: DbClient, playerId: string, type: string) {
  return db.playerCard.findMany({
    where: { playerId, card: { type } },
    include: { card: true },
  });
}

export function findPlayerCardByCardId(db: DbClient, playerId: string, cardId: string) {
  return db.playerCard.findFirst({
    where: { playerId, cardId },
    include: { card: true },
  });
}

export function findPlayerCardUnique(db: DbClient, playerId: string, cardId: string) {
  return db.playerCard.findUnique({
    where: { playerId_cardId: { playerId, cardId } },
  });
}

export function deletePlayerCard(db: DbClient, id: string) {
  return db.playerCard.delete({ where: { id } });
}

export function updatePlayerCardQuantity(db: DbClient, id: string, quantity: number) {
  return db.playerCard.update({ where: { id }, data: { quantity } });
}

export function createPlayerCardRecord(db: DbClient, playerId: string, cardId: string, quantity: number) {
  return db.playerCard.create({ data: { playerId, cardId, quantity } });
}

/** Decrement card quantity by 1, or delete if last copy */
export async function consumeCard(db: DbClient, playerCardId: string, currentQuantity: number) {
  if (currentQuantity === 1) {
    await db.playerCard.delete({ where: { id: playerCardId } });
  } else {
    await db.playerCard.update({
      where: { id: playerCardId },
      data: { quantity: currentQuantity - 1 },
    });
  }
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

export function findPlayerBuildingByPosition(db: DbClient, playerId: string, positionX: number, positionY: number) {
  return db.playerBuilding.findUnique({
    where: { playerId_positionX_positionY: { playerId, positionX, positionY } },
  });
}

export function createPlayerBuildingRecord(
  db: DbClient,
  data: { playerId: string; buildingId: string; level: number; positionX: number; positionY: number },
) {
  return db.playerBuilding.create({ data, include: { building: true } });
}

// ── Character template (for recruit cards) ──

export function findCharacterTemplateById(db: DbClient, id: string) {
  return db.character.findUnique({ where: { id } });
}

export function createPlayerCharacterRecord(
  db: DbClient,
  data: {
    playerId: string; characterId: string; level: number; tier: number;
    hp: number; maxHp: number; mp: number; maxMp: number;
    attack: number; defense: number; speed: number; luck: number;
  },
) {
  return db.playerCharacter.create({ data, include: { character: true } });
}
