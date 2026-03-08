/**
 * Breakthrough Service — business logic for player/character tier breakthrough
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import { parseCharacterState, type CharacterEntity } from "../utils/character-utils";

// 突破条件
interface BreakthroughRequirement {
  tier: number;
  level: number; // 需要达到的等级
  gold: number;
  crystals: number;
  specialItem?: string; // 特殊物品（如突破卡）
}

// 突破条件配置
const BREAKTHROUGH_REQUIREMENTS: BreakthroughRequirement[] = [
  { tier: 1, level: 10, gold: 500, crystals: 20 },
  { tier: 2, level: 20, gold: 1500, crystals: 50 },
  { tier: 3, level: 30, gold: 3000, crystals: 100, specialItem: "tier_3_breakthrough" },
  { tier: 4, level: 40, gold: 5000, crystals: 200, specialItem: "tier_4_breakthrough" },
  { tier: 5, level: 50, gold: 10000, crystals: 500, specialItem: "tier_5_breakthrough" },
];

// ── Get Player Breakthrough Status ──

export async function getPlayerStatus(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const currentTier = player.tier;
  const nextRequirement = BREAKTHROUGH_REQUIREMENTS.find(r => r.tier === currentTier);

  if (!nextRequirement) {
    return {
      currentTier,
      maxTier: true,
      skillSlots: currentTier * 6,
      nextTierSlots: null,
      requirements: null,
      canBreakthrough: false,
    };
  }

  // 检查是否满足条件
  const meetsLevel = player.level >= nextRequirement.level;
  const meetsGold = player.gold >= nextRequirement.gold;
  const meetsCrystals = player.crystals >= nextRequirement.crystals;

  return {
    currentTier,
    maxTier: false,
    skillSlots: currentTier * 6,
    nextTierSlots: (currentTier + 1) * 6,
    requirements: nextRequirement,
    currentResources: {
      level: player.level,
      gold: player.gold,
      crystals: player.crystals,
    },
    canBreakthrough: meetsLevel && meetsGold && meetsCrystals,
    checks: { meetsLevel, meetsGold, meetsCrystals },
  };
}

// ── Execute Player Breakthrough ──

export async function breakthroughPlayer(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const requirement = BREAKTHROUGH_REQUIREMENTS.find(r => r.tier === player.tier);
  if (!requirement) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已达最高职阶" });
  }

  // 验证条件
  if (player.level < requirement.level) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${requirement.level}级` });
  }
  if (player.gold < requirement.gold) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  }
  if (player.crystals < requirement.crystals) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });
  }

  // 扣除资源并提升职阶
  await updatePlayer(db, player.id, {
    tier: { increment: 1 },
    gold: { decrement: requirement.gold },
    crystals: { decrement: requirement.crystals },
  });

  return {
    success: true,
    newTier: player.tier + 1,
    newSkillSlots: (player.tier + 1) * 6,
    message: `恭喜突破到${player.tier + 1}阶！技能槽位增加到${(player.tier + 1) * 6}个`,
  };
}

// ── Get Character Breakthrough Status ──

export async function getCharacterStatus(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const entity = (await entities.getEntity(characterId)) as CharacterEntity | null;
  if (!entity || entity.ownerId !== player.id || entity.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }
  const charState = parseCharacterState(entity);
  const charTemplate = await db.character.findUnique({ where: { id: charState.characterId } });
  if (!charTemplate) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色模板不存在" });
  }

  const character = { id: entity.id, ...charState, character: charTemplate };

  const currentTier = character.tier;
  const requirement = BREAKTHROUGH_REQUIREMENTS.find(r => r.tier === currentTier);

  if (!requirement) {
    return {
      characterId: character.id,
      characterName: character.character.name,
      currentTier,
      maxTier: true,
      skillSlots: currentTier * 6,
      requirements: null,
      canBreakthrough: false,
    };
  }

  const meetsLevel = character.level >= requirement.level;
  const meetsGold = player.gold >= requirement.gold;
  const meetsCrystals = player.crystals >= requirement.crystals;

  return {
    characterId: character.id,
    characterName: character.character.name,
    currentTier,
    maxTier: false,
    skillSlots: currentTier * 6,
    nextTierSlots: (currentTier + 1) * 6,
    requirements: requirement,
    currentStatus: {
      level: character.level,
      gold: player.gold,
      crystals: player.crystals,
    },
    canBreakthrough: meetsLevel && meetsGold && meetsCrystals,
    checks: { meetsLevel, meetsGold, meetsCrystals },
  };
}

// ── Execute Character Breakthrough ──

export async function breakthroughCharacter(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const entity = (await entities.getEntity(characterId)) as CharacterEntity | null;
  if (!entity || entity.ownerId !== player.id || entity.template?.schema?.name !== "character") {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }
  const charState = parseCharacterState(entity);
  const charTemplate = await db.character.findUnique({ where: { id: charState.characterId } });
  if (!charTemplate) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色模板不存在" });
  }

  const character = { id: entity.id, ...charState, character: charTemplate };

  const requirement = BREAKTHROUGH_REQUIREMENTS.find(r => r.tier === character.tier);
  if (!requirement) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "角色已达最高职阶" });
  }

  // 验证条件
  if (character.level < requirement.level) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `角色需要达到${requirement.level}级` });
  }
  if (player.gold < requirement.gold) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "金币不足" });
  }
  if (player.crystals < requirement.crystals) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "水晶不足" });
  }

  // 扣除资源
  await updatePlayer(db, player.id, {
    gold: { decrement: requirement.gold },
    crystals: { decrement: requirement.crystals },
  });

  // 提升角色职阶并提高等级上限
  const newTier = character.tier + 1;
  const newMaxLevel = character.maxLevel + 20; // 每阶增加20级上限

  await entities.updateEntityState(character.id, {
    tier: newTier,
    maxLevel: newMaxLevel,
  });

  return {
    success: true,
    characterName: character.character.name,
    newTier,
    newMaxLevel,
    newSkillSlots: newTier * 6,
    message: `${character.character.name}突破到${newTier}阶！`,
  };
}
