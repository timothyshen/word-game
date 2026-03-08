/**
 * Breakthrough Service — business logic for player/character tier breakthrough
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import { parseCharacterState, type CharacterEntity } from "../utils/character-utils";
import { engine, ruleService } from "~/server/api/engine";

// 突破条件
interface BreakthroughRequirement {
  tier: number;
  level: number; // 需要达到的等级
  gold: number;
  crystals: number;
  specialItem?: string; // 特殊物品（如突破卡）
}

// 从规则引擎获取突破条件
async function getBreakthroughRequirement(tier: number): Promise<BreakthroughRequirement | null> {
  try {
    const config = await ruleService.getConfig<{ level: number; gold: number; crystals: number; item?: string }>(
      `breakthrough_tier_${tier}`,
    );
    return {
      tier,
      level: config.level,
      gold: config.gold,
      crystals: config.crystals,
      specialItem: config.item,
    };
  } catch {
    return null; // No rule for this tier = max tier reached
  }
}

// 从规则引擎计算技能槽位
async function calcSkillSlots(tier: number): Promise<number> {
  const slotsFormula = await ruleService.getFormula("player_skill_slots");
  return engine.formulas.calculate(slotsFormula, { tier });
}

// ── Get Player Breakthrough Status ──

export async function getPlayerStatus(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const currentTier = player.tier;
  const nextRequirement = await getBreakthroughRequirement(currentTier);
  const skillSlots = await calcSkillSlots(currentTier);

  if (!nextRequirement) {
    return {
      currentTier,
      maxTier: true,
      skillSlots,
      nextTierSlots: null,
      requirements: null,
      canBreakthrough: false,
    };
  }

  // 检查是否满足条件
  const meetsLevel = player.level >= nextRequirement.level;
  const meetsGold = player.gold >= nextRequirement.gold;
  const meetsCrystals = player.crystals >= nextRequirement.crystals;
  const nextTierSlots = await calcSkillSlots(currentTier + 1);

  return {
    currentTier,
    maxTier: false,
    skillSlots,
    nextTierSlots,
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

  const requirement = await getBreakthroughRequirement(player.tier);
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

  const newTier = player.tier + 1;
  const newSkillSlots = await calcSkillSlots(newTier);

  return {
    success: true,
    newTier,
    newSkillSlots,
    message: `恭喜突破到${newTier}阶！技能槽位增加到${newSkillSlots}个`,
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
  const requirement = await getBreakthroughRequirement(currentTier);
  const skillSlots = await calcSkillSlots(currentTier);

  if (!requirement) {
    return {
      characterId: character.id,
      characterName: character.character.name,
      currentTier,
      maxTier: true,
      skillSlots,
      requirements: null,
      canBreakthrough: false,
    };
  }

  const meetsLevel = character.level >= requirement.level;
  const meetsGold = player.gold >= requirement.gold;
  const meetsCrystals = player.crystals >= requirement.crystals;
  const nextTierSlots = await calcSkillSlots(currentTier + 1);

  return {
    characterId: character.id,
    characterName: character.character.name,
    currentTier,
    maxTier: false,
    skillSlots,
    nextTierSlots,
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

  const requirement = await getBreakthroughRequirement(character.tier);
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
  const levelCapIncrease = await ruleService.getConfig<{ value: number }>("breakthrough_level_cap_increase");
  const newMaxLevel = character.maxLevel + levelCapIncrease.value;

  await entities.updateEntityState(character.id, {
    tier: newTier,
    maxLevel: newMaxLevel,
  });

  const newSkillSlots = await calcSkillSlots(newTier);

  return {
    success: true,
    characterName: character.character.name,
    newTier,
    newMaxLevel,
    newSkillSlots,
    message: `${character.character.name}突破到${newTier}阶！`,
  };
}
