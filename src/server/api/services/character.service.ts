/**
 * Character Service — character management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import * as charRepo from "../repositories/character.repo";

// ── Private constants ──

const GROWTH_RATE = 0.05; // 每级5%成长

// ── Private helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

function getExpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

function calculateStatGrowth(baseStat: number, level: number, growthRate: number): number {
  return Math.floor(baseStat * (1 + (level - 1) * growthRate));
}

// ── Exported service functions ──

export async function getAllCharacters(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const characters = await charRepo.findPlayerCharacters(db, player.id);

  return characters.map((c) => ({
    id: c.id,
    name: c.character.name,
    icon: c.character.portrait,
    rarity: c.character.rarity,
    baseClass: c.character.baseClass,
    level: c.level,
    tier: c.tier,
    maxLevel: c.maxLevel,
    exp: c.exp,
    expToNext: getExpForLevel(c.level + 1),
    hp: c.hp,
    maxHp: c.maxHp,
    mp: c.mp,
    maxMp: c.maxMp,
    attack: c.attack,
    defense: c.defense,
    speed: c.speed,
    luck: c.luck,
    status: c.status,
    workingAt: c.workingAt,
    profession: c.profession
      ? {
          id: c.profession.profession.id,
          name: c.profession.profession.name,
        }
      : null,
    skillCount: c.learnedSkills.length,
    skillSlots: c.tier * 6,
  }));
}

export async function getCharacterById(db: FullDbClient, userId: string, characterId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterById(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  return {
    id: character.id,
    name: character.character.name,
    icon: character.character.portrait,
    description: character.character.description,
    rarity: character.character.rarity,
    baseClass: character.character.baseClass,
    level: character.level,
    tier: character.tier,
    maxLevel: character.maxLevel,
    exp: character.exp,
    expToNext: getExpForLevel(character.level + 1),
    hp: character.hp,
    maxHp: character.maxHp,
    mp: character.mp,
    maxMp: character.maxMp,
    attack: character.attack,
    defense: character.defense,
    speed: character.speed,
    luck: character.luck,
    status: character.status,
    workingAt: character.workingAt,
    profession: character.profession
      ? {
          id: character.profession.profession.id,
          name: character.profession.profession.name,
          description: character.profession.profession.description,
          bonuses: JSON.parse(character.profession.profession.bonuses) as Record<string, number>,
        }
      : null,
    skills: character.learnedSkills.map((s) => ({
      id: s.skill.id,
      name: s.skill.name,
      description: s.skill.description,
      level: s.level,
      type: s.skill.type,
      icon: s.skill.icon,
    })),
    skillSlots: character.tier * 6,
    baseStats: {
      hp: character.character.baseHp,
      mp: character.character.baseMp,
      attack: character.character.baseAttack,
      defense: character.character.baseDefense,
      speed: character.character.baseSpeed,
      luck: character.character.baseLuck,
    },
  };
}

export async function levelUp(db: FullDbClient, userId: string, characterId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterWithTemplate(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  if (character.level >= character.maxLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已达当前阶位等级上限，请先突破" });
  }

  const expNeeded = getExpForLevel(character.level + 1);
  if (character.exp < expNeeded) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `经验不足，需要 ${expNeeded}，当前 ${character.exp}`,
    });
  }

  const newLevel = character.level + 1;
  const newMaxHp = calculateStatGrowth(character.character.baseHp, newLevel, GROWTH_RATE);
  const newMaxMp = calculateStatGrowth(character.character.baseMp, newLevel, GROWTH_RATE);
  const newAttack = calculateStatGrowth(character.character.baseAttack, newLevel, GROWTH_RATE);
  const newDefense = calculateStatGrowth(character.character.baseDefense, newLevel, GROWTH_RATE);
  const newSpeed = calculateStatGrowth(character.character.baseSpeed, newLevel, GROWTH_RATE);
  const newLuck = calculateStatGrowth(character.character.baseLuck, newLevel, GROWTH_RATE);

  await charRepo.updateCharacter(db, character.id, {
    level: newLevel,
    exp: character.exp - expNeeded,
    maxHp: newMaxHp,
    maxMp: newMaxMp,
    hp: newMaxHp,
    mp: newMaxMp,
    attack: newAttack,
    defense: newDefense,
    speed: newSpeed,
    luck: newLuck,
  });

  return {
    success: true,
    characterName: character.character.name,
    newLevel,
    expUsed: expNeeded,
    remainingExp: character.exp - expNeeded,
    stats: {
      maxHp: newMaxHp,
      maxMp: newMaxMp,
      attack: newAttack,
      defense: newDefense,
      speed: newSpeed,
      luck: newLuck,
    },
  };
}

export async function addExp(db: FullDbClient, userId: string, characterId: string, amount: number) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterWithTemplate(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  const newExp = character.exp + amount;
  const expToNext = getExpForLevel(character.level + 1);

  await charRepo.updateCharacter(db, character.id, { exp: newExp });

  return {
    success: true,
    characterName: character.character.name,
    expAdded: amount,
    totalExp: newExp,
    expToNext,
    canLevelUp: newExp >= expToNext && character.level < character.maxLevel,
  };
}

export async function heal(
  db: FullDbClient,
  userId: string,
  characterId: string,
  type: "hp" | "mp" | "both",
  amount?: number,
) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterWithTemplate(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  const updates: { hp?: number; mp?: number } = {};
  const result: { hpHealed?: number; mpRestored?: number } = {};

  if (type === "hp" || type === "both") {
    const healAmount = amount ?? character.maxHp;
    const newHp = Math.min(character.hp + healAmount, character.maxHp);
    updates.hp = newHp;
    result.hpHealed = newHp - character.hp;
  }

  if (type === "mp" || type === "both") {
    const restoreAmount = amount ?? character.maxMp;
    const newMp = Math.min(character.mp + restoreAmount, character.maxMp);
    updates.mp = newMp;
    result.mpRestored = newMp - character.mp;
  }

  await charRepo.updateCharacter(db, character.id, updates);

  return {
    success: true,
    characterName: character.character.name,
    ...result,
    currentHp: updates.hp ?? character.hp,
    currentMp: updates.mp ?? character.mp,
    maxHp: character.maxHp,
    maxMp: character.maxMp,
  };
}

export async function assignToBuilding(
  db: FullDbClient,
  userId: string,
  characterId: string,
  buildingId: string | null,
) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterWithTemplate(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  if (buildingId === null) {
    // 取消分配
    const currentBuilding = await charRepo.findBuildingByAssignedChar(db, player.id, characterId);

    if (currentBuilding) {
      await charRepo.updatePlayerBuilding(db, currentBuilding.id, {
        assignedCharId: null,
        status: "idle",
      });
    }

    await charRepo.updateCharacter(db, character.id, {
      status: "idle",
      workingAt: null,
    });

    return {
      success: true,
      characterName: character.character.name,
      message: "角色已空闲",
    };
  }

  // 分配到新建筑
  const building = await charRepo.findPlayerBuildingWithTemplate(db, buildingId, player.id);

  if (!building) {
    throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
  }

  // 如果角色正在其他建筑工作，先解除
  if (character.status === "working") {
    const oldBuilding = await charRepo.findBuildingByAssignedCharBasic(db, player.id, characterId);
    if (oldBuilding) {
      await charRepo.updatePlayerBuilding(db, oldBuilding.id, {
        assignedCharId: null,
        status: "idle",
      });
    }
  }

  // 如果目标建筑已有其他角色，先解除
  if (building.assignedCharId && building.assignedCharId !== characterId) {
    await charRepo.updateCharacter(db, building.assignedCharId, {
      status: "idle",
      workingAt: null,
    });
  }

  // 分配角色到建筑
  await charRepo.updatePlayerBuilding(db, building.id, {
    assignedCharId: characterId,
    status: "working",
  });

  await charRepo.updateCharacter(db, character.id, {
    status: "working",
    workingAt: building.building.name,
  });

  return {
    success: true,
    characterName: character.character.name,
    buildingName: building.building.name,
    message: `${character.character.name} 已分配到 ${building.building.name}`,
  };
}

export async function getIdleCharacters(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const idleCharacters = await charRepo.findIdleCharacters(db, player.id);

  return idleCharacters.map((c) => ({
    id: c.id,
    name: c.character.name,
    icon: c.character.portrait,
    level: c.level,
    rarity: c.character.rarity,
  }));
}

export async function updateStatus(
  db: FullDbClient,
  userId: string,
  characterId: string,
  status: "idle" | "working" | "exploring" | "combat" | "resting",
) {
  const player = await getPlayerOrThrow(db, userId);

  const character = await charRepo.findPlayerCharacterBasic(db, characterId, player.id);

  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
  }

  await charRepo.updateCharacter(db, character.id, {
    status,
    workingAt: status === "idle" ? null : character.workingAt,
  });

  return { success: true, newStatus: status };
}
