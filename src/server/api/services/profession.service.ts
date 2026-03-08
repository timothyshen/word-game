/**
 * Profession Service — business logic for player/character profession management
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import {
  parseStatModifiers,
  parseConditions,
  checkConditions,
} from "~/shared/effects";
import type { Condition, StatModifier } from "~/shared/effects";
import type { ConditionContext } from "~/shared/effects/condition-checker";
import { parseCharacterState, type CharacterEntity } from "../utils/character-utils";

// ── Private helpers ──

/** Convert StatModifier[] to Record<string,number> for API compatibility */
function modifiersToRecord(modifiers: StatModifier[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const m of modifiers) r[m.stat] = (r[m.stat] ?? 0) + m.value;
  return r;
}

/** Parse bonuses — typed format first, fallback to legacy Record<string,number> */
function parseBonuses(json: string): Record<string, number> {
  const typed = parseStatModifiers(json);
  if (typed.length > 0) return modifiersToRecord(typed);
  try { return JSON.parse(json) as Record<string, number>; } catch { return {}; }
}

/** Parse conditions — typed Condition[] first, fallback to legacy { tier, level } */
function parseUnlockConditions(json: string): Condition[] {
  const typed = parseConditions(json);
  if (typed.length > 0) return typed;
  try {
    const legacy = JSON.parse(json) as Record<string, unknown>;
    const conds: Condition[] = [];
    if (typeof legacy.tier === "number") conds.push({ type: "tier", min: legacy.tier });
    if (typeof legacy.level === "number") conds.push({ type: "level", min: legacy.level });
    return conds;
  } catch { return []; }
}

/** Build a minimal ConditionContext for a player or character */
function buildConditionContext(entity: {
  level: number;
  tier: number;
  strength?: number;
  agility?: number;
  intellect?: number;
  luck?: number;
}): ConditionContext {
  return {
    level: entity.level,
    tier: entity.tier,
    stats: {
      strength: entity.strength ?? 0,
      agility: entity.agility ?? 0,
      intellect: entity.intellect ?? 0,
      luck: entity.luck ?? 0,
    },
    skills: [],
    flags: [],
    items: [],
  };
}

// ── Get All Professions ──

export async function getAllProfessions(db: FullDbClient) {
  const professions = await db.profession.findMany();

  return professions.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    bonuses: parseBonuses(p.bonuses),
    unlockConditions: parseUnlockConditions(p.unlockConditions),
  }));
}

// ── Get Player Profession ──

export async function getPlayerProfession(db: FullDbClient, userId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: {
      profession: {
        include: { profession: true },
      },
    },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  if (!player.profession) {
    return { hasProfession: false, profession: null };
  }

  return {
    hasProfession: true,
    profession: {
      id: player.profession.profession.id,
      name: player.profession.profession.name,
      description: player.profession.profession.description,
      bonuses: parseBonuses(player.profession.profession.bonuses),
      obtainedAt: player.profession.obtainedAt,
    },
  };
}

// ── Get Character Profession ──

export async function getCharacterProfession(db: FullDbClient, entities: IEntityManager, userId: string, characterId: string) {
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

  const profession = await db.characterProfession.findFirst({
    where: { playerCharacterId: entity.id },
    include: { profession: true },
  });

  return {
    characterId: entity.id,
    characterName: charTemplate.name,
    baseClass: charTemplate.baseClass,
    hasProfession: !!profession,
    profession: profession ? {
      id: profession.profession.id,
      name: profession.profession.name,
      description: profession.profession.description,
      bonuses: parseBonuses(profession.profession.bonuses),
      obtainedAt: profession.obtainedAt,
    } : null,
  };
}

// ── Learn Player Profession ──

export async function learnPlayerProfession(db: FullDbClient, userId: string, professionId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { profession: true },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  if (player.profession) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已有职业，无法重复学习" });
  }

  const profession = await db.profession.findUnique({
    where: { id: professionId },
  });

  if (!profession) {
    throw new TRPCError({ code: "NOT_FOUND", message: "职业不存在" });
  }

  // 检查解锁条件
  const conditions = parseUnlockConditions(profession.unlockConditions);
  const condCtx = buildConditionContext(player);
  const check = checkConditions(conditions, condCtx);

  if (!check.met) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: check.reason ?? "不满足解锁条件",
    });
  }

  // 创建职业记录
  await db.playerProfession.create({
    data: {
      playerId: player.id,
      professionId,
    },
  });

  return {
    success: true,
    professionName: profession.name,
    message: `成功习得${profession.name}职业！`,
  };
}

// ── Learn Character Profession ──

export async function learnCharacterProfession(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  characterId: string,
  professionId: string,
) {
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

  const existingProfession = await db.characterProfession.findFirst({
    where: { playerCharacterId: entity.id },
  });
  if (existingProfession) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "角色已有职业" });
  }

  const character = { id: entity.id, ...charState, character: charTemplate };

  const profession = await db.profession.findUnique({
    where: { id: professionId },
  });

  if (!profession) {
    throw new TRPCError({ code: "NOT_FOUND", message: "职业不存在" });
  }

  // 检查条件
  const conditions = parseUnlockConditions(profession.unlockConditions);
  const condCtx = buildConditionContext(character);
  const check = checkConditions(conditions, condCtx);

  if (!check.met) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: check.reason ?? "角色不满足解锁条件",
    });
  }

  await db.characterProfession.create({
    data: {
      playerCharacterId: characterId,
      professionId,
    },
  });

  return {
    success: true,
    characterName: character.character.name,
    professionName: profession.name,
    message: `${character.character.name}习得${profession.name}职业！`,
  };
}
