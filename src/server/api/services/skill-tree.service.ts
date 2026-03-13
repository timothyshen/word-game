/**
 * Skill Tree Service — profession-based skill progression
 *
 * Each profession unlocks a branch of skills (matched by category).
 * Characters earn 1 skill point per level, spent to learn or upgrade skills.
 *
 * Branching: at positions 3 and 6 within each branch, two variant skills
 * share the same position. The player must choose one. Either branch skill
 * satisfies the prerequisite for the next tier.
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer } from "../repositories/player.repo";
import {
  parseCharacterState,
  type CharacterEntity,
} from "../utils/character-utils";
import { parseConditions } from "~/shared/effects";
import type { SkillLevelEntry } from "~/shared/effects/types";
import { ruleService } from "~/server/api/engine";

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
  isBranchPoint: boolean;
  branchGroup?: string; // shared identifier for branch-choice siblings
}

export interface SkillTreeInfo {
  professionName: string;
  branches: SkillTreeBranch[];
  availablePoints: number;
  totalPointsSpent: number;
}

// ── Branch point positions (0-indexed within each branch) ──
const BRANCH_POSITIONS = [2, 5]; // positions 3 and 6 (0-indexed)

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

/**
 * Check if a skill at the given position within a branch is a branch point.
 * Branch points are at positions 3 and 6 (0-indexed: 2 and 5).
 * At branch points, skills whose names end with "_a" or "_b" suffix are variants.
 */
function isBranchPosition(position: number): boolean {
  return BRANCH_POSITIONS.includes(position);
}

/**
 * Check prerequisite for a skill considering branch points.
 * At branch points (positions 3,6), either variant from the previous
 * branch point satisfies the prerequisite. For normal positions,
 * any skill at the previous position must be learned.
 */
function checkPrerequisiteMet(
  skillPosition: number,
  branchSkills: Array<{ id: string; name: string }>,
  learnedMap: Map<string, unknown>,
): boolean {
  if (skillPosition === 0) return true;

  // Find all skills at the previous position
  const prevPosition = skillPosition - 1;
  const prevSkills = branchSkills.filter((_, idx) => {
    // We need the actual position mapping — skills at branch points share positions
    return getSkillPosition(idx, branchSkills) === prevPosition;
  });

  // If previous position is a branch point, either variant satisfies
  if (prevSkills.length > 0) {
    return prevSkills.some((s) => learnedMap.has(s.id));
  }

  return false;
}

/**
 * Calculate the logical position of a skill based on its index,
 * accounting for branch point siblings sharing the same position.
 */
function getSkillPosition(
  physicalIndex: number,
  skills: Array<{ name: string }>,
): number {
  // Skills whose names end with "_b" at branch positions share the same
  // logical position as the "_a" variant before them.
  let logicalPos = 0;
  for (let i = 0; i <= physicalIndex; i++) {
    if (i > 0) {
      const prevName = skills[i - 1]?.name ?? "";
      const currName = skills[i]?.name ?? "";
      // If current skill is a branch variant "_b" at a known branch position,
      // it shares the same logical position
      if (currName.endsWith("_b") && prevName.endsWith("_a")) {
        // Same position as previous
      } else {
        logicalPos++;
      }
    }
  }
  return logicalPos;
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

  // Build skill tree nodes with branch point awareness
  const nodes: SkillTreeNode[] = skills.map((skill, index) => {
    const learned = learnedMap.get(skill.id);
    const levelInfo = parseSkillLevelInfo(skill.levelData);
    const logicalPosition = getSkillPosition(index, skills);
    const isBranch = isBranchPosition(logicalPosition);

    // Determine branch group for branch points
    let branchGroup: string | undefined;
    if (isBranch) {
      branchGroup = `${category}_branch_${logicalPosition}`;
    }

    // Check prerequisite with branch point awareness
    const prevLearned = checkPrerequisiteMet(logicalPosition, skills, learnedMap);

    // At a branch point, if the sibling variant is already learned, can't learn this one
    let siblingLearned = false;
    if (isBranch) {
      const siblingSkills = skills.filter((s, i) => {
        return i !== index && getSkillPosition(i, skills) === logicalPosition;
      });
      siblingLearned = siblingSkills.some((s) => learnedMap.has(s.id));
    }

    const canLearn =
      !learned && !siblingLearned && prevLearned && availablePoints > 0;

    return {
      skillId: skill.id,
      skillName: skill.name,
      description: skill.description,
      icon: skill.icon,
      category: skill.category,
      position: logicalPosition,
      learned: !!learned,
      level: learned?.level ?? 0,
      maxLevel: levelInfo.maxLevel,
      canLearn,
      mpCost: levelInfo.mpCost,
      effects: levelInfo.effectsPreview,
      isBranchPoint: isBranch,
      branchGroup,
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

  // Get all branch skills and determine position
  const branchSkills = await db.skill.findMany({
    where: { category },
    orderBy: { name: "asc" },
  });
  const skillIndex = branchSkills.findIndex((s) => s.id === skillId);
  const logicalPosition = getSkillPosition(skillIndex, branchSkills);

  // Check if this is a branch point and the sibling is already learned
  if (isBranchPosition(logicalPosition)) {
    const siblingSkills = branchSkills.filter((s, i) => {
      return i !== skillIndex && getSkillPosition(i, branchSkills) === logicalPosition;
    });
    for (const sibling of siblingSkills) {
      const siblingLearned = await db.characterSkill.findUnique({
        where: {
          playerCharacterId_skillId: {
            playerCharacterId: characterId,
            skillId: sibling.id,
          },
        },
      });
      if (siblingLearned) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `已学习分支技能「${sibling.name}」，无法学习另一分支`,
        });
      }
    }
  }

  // Verify prerequisite with branch awareness
  if (logicalPosition > 0) {
    const prevPosition = logicalPosition - 1;
    const prevSkills = branchSkills.filter((_, i) => {
      return getSkillPosition(i, branchSkills) === prevPosition;
    });

    let anyPrevLearned = false;
    for (const prev of prevSkills) {
      const prevLearned = await db.characterSkill.findUnique({
        where: {
          playerCharacterId_skillId: {
            playerCharacterId: characterId,
            skillId: prev.id,
          },
        },
      });
      if (prevLearned) {
        anyPrevLearned = true;
        break;
      }
    }

    if (!anyPrevLearned) {
      const prevNames = prevSkills.map((s) => s.name).join("」或「");
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `需要先学习前置技能「${prevNames}」`,
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

// ── Respec Profession ──

export async function respecProfession(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  characterId: string,
): Promise<{ success: true; message: string; pointsRefunded: number; crystalsCost: number }> {
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

  // Verify character has a profession
  const charProfession = await db.characterProfession.findFirst({
    where: { playerCharacterId: characterId },
    include: { profession: true },
  });
  if (!charProfession) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "角色没有职业，无法洗点",
    });
  }

  // Check crystal cost (default 50, read from config if available)
  let crystalsCost = 50;
  try {
    const config = await ruleService.getConfig<{ value: number }>("respec_crystal_cost");
    crystalsCost = config.value;
  } catch {
    // Use default
  }

  if (player.crystals < crystalsCost) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `水晶不足，洗点需要 ${crystalsCost} 水晶，当前 ${player.crystals}`,
    });
  }

  // Calculate points to refund
  const pointsRefunded = await calculatePointsSpent(db, characterId);

  // Delete all character skills for this profession's category
  const category = extractProfessionCategory(charProfession.profession.unlockConditions);
  if (category) {
    const categorySkills = await db.skill.findMany({ where: { category } });
    const categorySkillIds = categorySkills.map((s) => s.id);

    await db.characterSkill.deleteMany({
      where: {
        playerCharacterId: characterId,
        skillId: { in: categorySkillIds },
      },
    });
  }

  // Remove profession assignment
  await db.characterProfession.delete({
    where: { id: charProfession.id },
  });

  // Deduct crystals
  await updatePlayer(db, player.id, {
    crystals: { decrement: crystalsCost },
  });

  return {
    success: true,
    message: `已重置「${charProfession.profession.name}」职业，退还 ${pointsRefunded} 技能点`,
    pointsRefunded,
    crystalsCost,
  };
}
