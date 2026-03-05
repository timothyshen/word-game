/**
 * Card Service — card management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import * as cardRepo from "../repositories/card.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { parseCardEffect, resolveCardEffect } from "~/shared/effects";
import type { CardEffect, CardDbAdapter, CardContext } from "~/shared/effects";
import type { PrismaClient } from "../../../../generated/prisma";

// ── Helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

/** Create a CardDbAdapter from Prisma context for use with resolveCardEffect */
function createCardDbAdapter(db: PrismaClient, playerId: string): CardDbAdapter {
  return {
    async getPlayer(id) {
      const p = await db.player.findUnique({ where: { id } });
      return p ? { id: p.id, exp: p.exp, gold: p.gold } : null;
    },
    async updatePlayer(id, data) {
      await db.player.update({ where: { id }, data });
    },
    async getCharacter(id) {
      const c = await db.playerCharacter.findUnique({ where: { id } });
      return c ? { id: c.id, hp: c.hp, maxHp: c.maxHp, mp: c.mp, maxMp: c.maxMp } : null;
    },
    async updateCharacter(id, data) {
      await db.playerCharacter.update({ where: { id }, data });
    },
    async getBuilding(id) {
      const b = await cardRepo.findBuildingTemplateById(db, id);
      return b ? { id: b.id, name: b.name, slot: b.slot } : null;
    },
    async getCharacterTemplate(id) {
      const t = await cardRepo.findCharacterTemplateById(db, id);
      return t ? {
        id: t.id, name: t.name, rarity: t.rarity,
        baseAttack: t.baseAttack, baseDefense: t.baseDefense,
        baseSpeed: t.baseSpeed, baseLuck: t.baseLuck,
        baseHp: t.baseHp, baseMp: t.baseMp,
      } : null;
    },
    async getSkillTemplate(id) {
      const s = await cardRepo.findSkillById(db, id);
      return s ? { id: s.id, name: s.name } : null;
    },
    async createPlayerCharacter(data) {
      const pc = await db.playerCharacter.create({ data: data as Parameters<typeof db.playerCharacter.create>[0]["data"] });
      return pc.id;
    },
    async createPlayerSkill(data) {
      const ps = await db.playerSkill.create({ data: data as Parameters<typeof db.playerSkill.create>[0]["data"] });
      return ps.id;
    },
    async upsertFlag(pid, flagName) {
      await cardRepo.upsertUnlockFlag(db, pid, flagName);
    },
  };
}

// ── Service Functions ──

export async function getAllCards(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCards = await cardRepo.findPlayerCards(db, player.id);

  return playerCards.map(pc => ({
    id: pc.id,
    quantity: pc.quantity,
    card: pc.card,
  }));
}

export async function getCardsByType(
  db: FullDbClient,
  userId: string,
  type: "building" | "recruit" | "skill" | "enhance" | "item" | "expansion",
) {
  const player = await getPlayerOrThrow(db, userId);

  const playerCards = await cardRepo.findPlayerCardsByType(db, player.id, type);

  return playerCards.map(pc => ({
    id: pc.id,
    quantity: pc.quantity,
    card: pc.card,
  }));
}

export async function useCard(
  db: FullDbClient,
  userId: string,
  input: { cardId: string; quantity: number; targetId?: string },
) {
  const player = await getPlayerOrThrow(db, userId);

  // 检查玩家是否拥有该卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, input.cardId);

  if (!playerCard || playerCard.quantity < input.quantity) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌数量不足" });
  }

  // 减少卡牌数量
  if (playerCard.quantity === input.quantity) {
    await cardRepo.deletePlayerCard(db, playerCard.id);
  } else {
    await cardRepo.updatePlayerCardQuantity(db, playerCard.id, playerCard.quantity - input.quantity);
  }

  // 根据卡牌类型执行效果
  const typedEffect = parseCardEffect(playerCard.card.effects);
  const effects = typedEffect ?? (JSON.parse(playerCard.card.effects) as Record<string, unknown>);

  // Handle unlock effects automatically
  if (typedEffect?.type === "unlock") {
    await cardRepo.upsertUnlockFlag(db, player.id, typedEffect.flagName);
  }

  return {
    used: true,
    cardType: playerCard.card.type,
    cardName: playerCard.card.name,
    effects,
    targetId: input.targetId,
  };
}

export async function addCard(
  db: FullDbClient,
  userId: string,
  input: { cardId: string; quantity: number },
) {
  const player = await getPlayerOrThrow(db, userId);

  // 检查卡牌是否存在
  const card = await cardRepo.findCardById(db, input.cardId);
  if (!card) {
    throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在" });
  }

  // 更新或创建玩家卡牌记录
  const existingPlayerCard = await cardRepo.findPlayerCardUnique(db, player.id, input.cardId);

  if (existingPlayerCard) {
    await cardRepo.updatePlayerCardQuantity(db, existingPlayerCard.id, existingPlayerCard.quantity + input.quantity);
  } else {
    await cardRepo.createPlayerCardRecord(db, player.id, input.cardId, input.quantity);
  }

  // Check if card has unlock effect
  const typedEffect = parseCardEffect(card.effects);
  if (typedEffect?.type === "unlock") {
    await cardRepo.upsertUnlockFlag(db, player.id, typedEffect.flagName);
  }
  // Legacy fallback: card name contains "突破"
  if (card.name.includes("突破")) {
    await cardRepo.upsertUnlockFlag(db, player.id, "breakthrough_system");
  }

  return {
    added: true,
    cardName: card.name,
    quantity: input.quantity,
  };
}

export async function useBuildingCard(
  db: FullDbClient,
  userId: string,
  input: { cardId: string; positionX: number; positionY: number },
) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { buildings: true },
  });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, input.cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有该建筑卡" });
  }

  if (playerCard.card.type !== "building") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是建筑卡" });
  }

  const effects = JSON.parse(playerCard.card.effects) as { buildingId: string };
  const buildingId = effects.buildingId;

  // 检查建筑模板
  const building = await cardRepo.findBuildingTemplateById(db, buildingId);
  if (!building) {
    throw new TRPCError({ code: "NOT_FOUND", message: "建筑模板不存在" });
  }

  // 检查位置是否已有建筑
  const existingBuilding = await cardRepo.findPlayerBuildingByPosition(db, player.id, input.positionX, input.positionY);

  if (existingBuilding) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该位置已有建筑" });
  }

  // 检查是否已有同类型建筑（特殊建筑只能建一个）
  if (building.slot === "special" || building.slot === "core") {
    const sameBuilding = player.buildings.find(b => b.buildingId === buildingId);
    if (sameBuilding) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "已有该建筑，无法重复建造" });
    }
  }

  // 创建建筑
  const newBuilding = await cardRepo.createPlayerBuildingRecord(db, {
    playerId: player.id,
    buildingId,
    level: 1,
    positionX: input.positionX,
    positionY: input.positionY,
  });

  // Check if building unlocks profession system (building name contains "职业")
  if (building.name.includes("职业")) {
    await cardRepo.upsertUnlockFlag(db, player.id, "profession_system");
  }

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  // 记录行动分数
  await createActionLog(db, {
    playerId: player.id,
    day: getCurrentGameDay(),
    type: "build",
    description: `建造了${building.name}`,
    baseScore: 50,
    bonus: 20,
    bonusReason: "首次建造",
  });

  // 更新当日分数
  await updatePlayer(db, player.id, { currentDayScore: { increment: 70 } });

  return {
    built: true,
    buildingName: building.name,
    position: { x: input.positionX, y: input.positionY },
    playerBuilding: newBuilding,
  };
}

export async function useRecruitCard(
  db: FullDbClient,
  userId: string,
  cardId: string,
) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { characters: true },
  });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有该招募卡" });
  }

  if (playerCard.card.type !== "recruit") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是招募卡" });
  }

  const effects = JSON.parse(playerCard.card.effects) as { characterId: string };
  const characterId = effects.characterId;

  // 检查角色模板
  const character = await cardRepo.findCharacterTemplateById(db, characterId);
  if (!character) {
    throw new TRPCError({ code: "NOT_FOUND", message: "角色模板不存在" });
  }

  // 创建角色实例
  const newCharacter = await cardRepo.createPlayerCharacterRecord(db, {
    playerId: player.id,
    characterId,
    level: 1,
    tier: 1,
    hp: character.baseHp,
    maxHp: character.baseHp,
    mp: character.baseMp,
    maxMp: character.baseMp,
    attack: character.baseAttack,
    defense: character.baseDefense,
    speed: character.baseSpeed,
    luck: character.baseLuck,
  });

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  // 计算稀有度加成
  const rarityBonus: Record<string, number> = {
    "普通": 0,
    "精英": 20,
    "稀有": 40,
    "史诗": 60,
    "传说": 100,
  };

  // 记录行动分数
  await createActionLog(db, {
    playerId: player.id,
    day: getCurrentGameDay(),
    type: "recruit",
    description: `招募了${character.name}`,
    baseScore: 60,
    bonus: rarityBonus[character.rarity] ?? 0,
    bonusReason: `${character.rarity}角色`,
  });

  // 更新当日分数
  const totalScore = 60 + (rarityBonus[character.rarity] ?? 0);
  await updatePlayer(db, player.id, { currentDayScore: { increment: totalScore } });

  return {
    recruited: true,
    characterName: character.name,
    rarity: character.rarity,
    playerCharacter: newCharacter,
  };
}

export async function useItemCard(
  db: FullDbClient,
  userId: string,
  input: { cardId: string; targetType: "player" | "character"; targetId?: string },
) {
  const player = await getPlayerOrThrow(db, userId);

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, input.cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有该道具卡" });
  }

  if (playerCard.card.type !== "item") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是道具卡" });
  }

  const typedEffect = parseCardEffect(playerCard.card.effects);
  let result: Record<string, unknown> = {};

  if (typedEffect) {
    // Use the unified card resolver
    const adapter = createCardDbAdapter(db, player.id);
    const cardCtx: CardContext = {
      playerId: player.id,
      targetId: input.targetId,
      targetType: input.targetType,
      db: adapter,
    };
    const cardResult = await resolveCardEffect(typedEffect, cardCtx);
    if (!cardResult.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: cardResult.message });
    }
    result = { message: cardResult.message, ...cardResult.data };
  } else {
    // Legacy fallback for old-format effects
    const legacyEffects = JSON.parse(playerCard.card.effects) as Record<string, unknown>;

    if (input.targetType === "character" && input.targetId) {
      const character = await db.playerCharacter.findFirst({
        where: { id: input.targetId, playerId: player.id },
      });
      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      const heal = legacyEffects.heal as number | undefined;
      const type = legacyEffects.type as string | undefined;
      if (heal && type === "hp") {
        const newHp = Math.min(character.hp + heal, character.maxHp);
        await db.playerCharacter.update({ where: { id: character.id }, data: { hp: newHp } });
        result = { healed: heal, newHp };
      } else if (heal && type === "mp") {
        const newMp = Math.min(character.mp + heal, character.maxMp);
        await db.playerCharacter.update({ where: { id: character.id }, data: { mp: newMp } });
        result = { restored: heal, newMp };
      } else {
        result = { message: "道具效果已应用", effects: legacyEffects };
      }
    } else {
      result = { message: "道具效果已应用", effects: legacyEffects };
    }
  }

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  return {
    used: true,
    itemName: playerCard.card.name,
    ...result,
  };
}

export async function learnSkill(
  db: FullDbClient,
  userId: string,
  input: { cardId: string; targetType: "player" | "character"; targetId?: string },
) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { learnedSkills: true },
  });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, input.cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有该技能卡" });
  }

  if (playerCard.card.type !== "skill") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该卡牌不是技能卡" });
  }

  const effects = JSON.parse(playerCard.card.effects) as { skillId: string };
  const skillId = effects.skillId;

  if (!skillId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "技能卡数据错误" });
  }

  // 检查技能是否存在
  const skill = await cardRepo.findSkillById(db, skillId);
  if (!skill) {
    throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });
  }

  if (input.targetType === "player") {
    // 玩家学习技能
    const skillSlots = player.tier * 6;
    const currentSkillCount = player.learnedSkills.length;

    // 检查是否已学习该技能
    const existingSkill = await cardRepo.findPlayerSkillUnique(db, player.id, skillId);

    if (existingSkill) {
      // 升级技能
      await cardRepo.updatePlayerSkillLevel(db, existingSkill.id, existingSkill.level + 1);
    } else {
      // 检查槽位
      if (currentSkillCount >= skillSlots) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "技能槽已满" });
      }

      // 学习新技能
      await cardRepo.createPlayerSkillRecord(db, player.id, skillId, 1);
    }
  } else {
    // 角色学习技能
    if (!input.targetId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "需要指定角色" });
    }

    const character = await db.playerCharacter.findFirst({
      where: {
        id: input.targetId,
        playerId: player.id,
      },
      include: { learnedSkills: true },
    });

    if (!character) {
      throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
    }

    const skillSlots = character.tier * 6;
    const currentSkillCount = character.learnedSkills.length;

    // 检查是否已学习
    const existingSkill = await cardRepo.findCharacterSkillUnique(db, character.id, skillId);

    if (existingSkill) {
      // 升级
      await cardRepo.updateCharacterSkillLevel(db, existingSkill.id, existingSkill.level + 1);
    } else {
      if (currentSkillCount >= skillSlots) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "角色技能槽已满" });
      }

      await cardRepo.createCharacterSkillRecord(db, character.id, skillId, 1);
    }
  }

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  return {
    learned: true,
    skillName: skill.name,
    targetType: input.targetType,
  };
}
