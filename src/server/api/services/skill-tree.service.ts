/**
 * Skill Tree Service — profession-based skill progression
 *
 * Each profession unlocks a branch of skills (matched by category).
 * Characters earn 1 skill point per level, spent to learn or upgrade skills.
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import {
  parseCharacterState,
  type CharacterEntity,
} from "../utils/character-utils";
import { parseConditions } from "~/shared/effects";
import type { SkillLevelEntry } from "~/shared/effects/types";

// ── Types ──

export interface SkillTreeBranch {
  name: string;
  skills: SkillTreeNode[];
}

export interface SkillTreeNode {
  skillId: string;
  skillName: string;
  description: string;
  icon: string;
  category: string;
  position: number;
  learned: boolean;
  level: number;
  maxLevel: number;
  canLearn: boolean;
  mpCost: number;
  effects: string;
}

export interface SkillTreeInfo {
  professionName: string;
  branches: SkillTreeBranch[];
  availablePoints: number;
  totalPointsSpent: number;
}

// ── Helpers ──

/** Extract the skill category from a profession's unlock conditions */
function extractProfessionCategory(unlockConditions: string): string | null {
  const conditions = parseConditions(unlockConditions);
  for (const cond of conditions) {
    if (cond.type === "skill" && "category" in cond) {
      return cond.category;
    }
    if (cond.type === "skillCount" && "skillType" in cond) {
      return cond.skillType;
    }
  }
  // Fallback: try legacy JSON
  try {
    const legacy = JSON.parse(unlockConditions) as Record<string, unknown>;
    if (legacy.requiredSkills && Array.isArray(legacy.requiredSkills)) {
      const first = legacy.requiredSkills[0] as
        | { category?: string }
        | undefined;
      if (first?.category) return first.category;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Parse level data from a skill to get max level and mp cost at level 1 */
function parseSkillLevelInfo(levelDataJson: string): {
  maxLevel: number;
  mpCost: number;
  effectsPreview: string;
} {
  try {
    const levelData = JSON.parse(levelDataJson) as SkillLevelEntry[];
    const maxLevel = levelData.length;
    const firstEntry = levelData[0];
    return {
      maxLevel,
      mpCost: firstEntry?.mpCost ?? 0,
      effectsPreview: JSON.stringify(firstEntry?.effects ?? []),
    };
  } catch {
    return { maxLevel: 1, mpCost: 0, effectsPreview: "[]" };
  }
}

/** Calculate total skill points spent by a character */
async function calculatePointsSpent(
  db: FullDbClient,
  characterEntityId: string,
): Promise<number> {
  const charSkills = await db.characterSkill.findMany({
    where: { playerCharacterId: characterEntityId },
  });
  // Each learned skill costs 1 point, each upgrade costs 1 point
  // Total = sum of levels for all skills (level 1 = 1 point, level 2 = 2 points, etc.)
  let total = 0;
  for (const cs of charSkills) {
    total += cs.level;
  }
  return total;
}

// ── Get Character Skill Tree ──

export async function getCharacterSkillTree(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  characterId: string,
): Promise<SkillTreeInfo | null> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const entity = (await entities.getEntity(characterId)) as CharacterEntity | null;
  if (
    !entity ||
    entity.ownerId !== player.id ||
    entity.template?.schema?.name !== "character"
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  const charState = parseCharacterState(entity);

  // Find character's profession
  const charProfession = await db.characterProfession.findFirst({
    where: { playerCharacterId: characterId },
    include: { profession: true },
  });

  if (!charProfession) {
    return null; // No profession = no skill tree
  }

  const profession = charProfession.profession;

  // Extract category from profession unlock conditions
  const category = extractProfessionCategory(profession.unlockConditions);

  // Find all skills matching the profession's category
  const skills = category
    ? await db.skill.findMany({
        where: { category },
        orderBy: { name: "asc" },
      })
    : [];

  // Get character's learned skills
  const learnedSkills = await db.characterSkill.findMany({
    where: { playerCharacterId: characterId },
  });
  const learnedMap = new Map(learnedSkills.map((cs) => [cs.skillId, cs]));

  // Calculate points
  const totalPointsSpent = await calculatePointsSpent(db, characterId);
  const availablePoints = Math.max(0, charState.level - totalPointsSpent);

  // Build skill tree nodes
  const nodes: SkillTreeNode[] = skills.map((skill, index) => {
    const learned = learnedMap.get(skill.id);
    const levelInfo = parseSkillLevelInfo(skill.levelData);

    // Prerequisite: previous skill in branch must be learned (except first)
    const prevSkill = index > 0 ? skills[index - 1] : null;
    const prevLearned = prevSkill ? learnedMap.has(prevSkill.id) : true;

    const canLearn =
      !learned && prevLearned && availablePoints > 0;

    return {
      skillId: skill.id,
      skillName: skill.name,
      description: skill.description,
      icon: skill.icon,
      category: skill.category,
      position: index,
      learned: !!learned,
      level: learned?.level ?? 0,
      maxLevel: levelInfo.maxLevel,
      canLearn,
      mpCost: levelInfo.mpCost,
      effects: levelInfo.effectsPreview,
    };
  });

  const branch: SkillTreeBranch = {
    name: profession.name,
    skills: nodes,
  };

  return {
    professionName: profession.name,
    branches: [branch],
    availablePoints,
    totalPointsSpent,
  };
}

// ── Learn Skill ──

export async function learnSkillTreeSkill(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  characterId: string,
  skillId: string,
): Promise<{ success: true; message: string }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const entity = (await entities.getEntity(characterId)) as CharacterEntity | null;
  if (
    !entity ||
    entity.ownerId !== player.id ||
    entity.template?.schema?.name !== "character"
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  const charState = parseCharacterState(entity);

  // Verify profession
  const charProfession = await db.characterProfession.findFirst({
    where: { playerCharacterId: characterId },
    include: { profession: true },
  });
  if (!charProfession) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "角色没有职业，无法学习技能树技能",
    });
  }

  // Verify skill exists
  const skill = await db.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });
  }

  // Verify skill belongs to profession's category
  const category = extractProfessionCategory(
    charProfession.profession.unlockConditions,
  );
  if (!category || skill.category !== category) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "该技能不属于当前职业技能树",
    });
  }

  // Verify not already learned
  const existing = await db.characterSkill.findUnique({
    where: {
      playerCharacterId_skillId: {
        playerCharacterId: characterId,
        skillId,
      },
    },
  });
  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "已学习该技能，请使用升级功能",
    });
  }

  // Verify prerequisite (previous skill in branch)
  const branchSkills = await db.skill.findMany({
    where: { category },
    orderBy: { name: "asc" },
  });
  const skillIndex = branchSkills.findIndex((s) => s.id === skillId);
  if (skillIndex > 0) {
    const prevSkill = branchSkills[skillIndex - 1]!;
    const prevLearned = await db.characterSkill.findUnique({
      where: {
        playerCharacterId_skillId: {
          playerCharacterId: characterId,
          skillId: prevSkill.id,
        },
      },
    });
    if (!prevLearned) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `需要先学习前置技能「${prevSkill.name}」`,
      });
    }
  }

  // Verify enough skill points
  const totalPointsSpent = await calculatePointsSpent(db, characterId);
  const availablePoints = charState.level - totalPointsSpent;
  if (availablePoints < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "技能点不足",
    });
  }

  // Create CharacterSkill record
  await db.characterSkill.create({
    data: {
      playerCharacterId: characterId,
      skillId,
      level: 1,
      exp: 0,
    },
  });

  return {
    success: true,
    message: `成功学习技能「${skill.name}」！`,
  };
}

// ── Upgrade Skill ──

export async function upgradeSkillTreeSkill(
  db: FullDbClient,
  userId: string,
  characterId: string,
  skillId: string,
): Promise<{ success: true; newLevel: number }> {
  // Verify character ownership via player
  const player = await findPlayerByUserId(db, userId);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Verify character skill exists
  const charSkill = await db.characterSkill.findUnique({
    where: {
      playerCharacterId_skillId: {
        playerCharacterId: characterId,
        skillId,
      },
    },
    include: { skill: true, entity: true },
  });
  if (!charSkill) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "角色尚未学习该技能",
    });
  }

  // Verify entity belongs to user
  if (charSkill.entity.ownerId !== player.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  // Check max level
  const levelInfo = parseSkillLevelInfo(charSkill.skill.levelData);
  if (charSkill.level >= levelInfo.maxLevel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `技能「${charSkill.skill.name}」已达最高等级`,
    });
  }

  // Verify enough skill points
  const charState = parseCharacterState(charSkill.entity as unknown as { state: string });
  const totalPointsSpent = await calculatePointsSpent(db, characterId);
  const availablePoints = charState.level - totalPointsSpent;
  if (availablePoints < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "技能点不足",
    });
  }

  // Upgrade
  const newLevel = charSkill.level + 1;
  await db.characterSkill.update({
    where: { id: charSkill.id },
    data: { level: newLevel },
  });

  return { success: true, newLevel };
}
