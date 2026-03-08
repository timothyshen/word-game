/**
 * Boss Service — boss challenge system business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { getCurrentGameDay, getWeekStartDate } from "../utils/game-time";
import { grantRandomEquipment } from "../utils/equipment-utils";
import { addCardEntity } from "../utils/card-entity-utils";

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllBosses(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const weekStart = getWeekStartDate();

  const bosses = await db.boss.findMany({ orderBy: { sortOrder: "asc" } });

  const bossStatuses = await db.bossStatus.findMany({
    where: {
      playerId: player.id,
      weekStartDate: { gte: weekStart },
    },
  });
  const statusMap = new Map(bossStatuses.map(s => [s.bossId, s]));

  return bosses.map(boss => {
    const isUnlocked =
      player.tier >= boss.requiredTier &&
      player.level >= boss.requiredLevel &&
      (!boss.requiredWorld || player.currentWorld === boss.requiredWorld);

    const status = statusMap.get(boss.id);
    const weeklyAttempts = status?.weeklyAttempts ?? 0;
    const canChallenge = isUnlocked && weeklyAttempts < boss.weeklyAttemptLimit;

    return {
      id: boss.id,
      name: boss.name,
      icon: boss.icon,
      description: boss.description,
      level: boss.level,
      hp: boss.hp,
      isUnlocked,
      canChallenge,
      weeklyAttempts,
      weeklyAttemptLimit: boss.weeklyAttemptLimit,
      lastDefeat: status?.lastDefeat,
      rewards: {
        gold: boss.rewardGold,
        crystals: boss.rewardCrystals,
        exp: boss.rewardExp,
        cardRarity: boss.rewardChestRarity,
      },
      unlockCondition: {
        tier: boss.requiredTier || undefined,
        level: boss.requiredLevel,
        world: boss.requiredWorld ?? undefined,
      },
    };
  });
}

export async function challengeBoss(db: FullDbClient, entities: IEntityManager, userId: string, bossId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { characters: { include: { character: true } } },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const boss = await db.boss.findUnique({ where: { id: bossId } });
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  // 检查解锁条件
  if (boss.requiredTier && player.tier < boss.requiredTier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.requiredTier}阶` });
  }
  if (player.level < boss.requiredLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.requiredLevel}级` });
  }

  // 检查本周挑战次数
  const weekStart = getWeekStartDate();
  let bossStatus = await db.bossStatus.findUnique({
    where: { playerId_bossId: { playerId: player.id, bossId } },
  });

  if (bossStatus && bossStatus.weekStartDate >= weekStart) {
    if (bossStatus.weeklyAttempts >= boss.weeklyAttemptLimit) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "本周挑战次数已用完" });
    }
  } else {
    if (bossStatus) {
      await db.bossStatus.update({
        where: { id: bossStatus.id },
        data: { weeklyAttempts: 0, weekStartDate: weekStart },
      });
      bossStatus.weeklyAttempts = 0;
    }
  }

  // 消耗体力
  const staminaCost = 30;
  if (player.stamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  await db.player.update({
    where: { id: player.id },
    data: {
      stamina: { decrement: staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  // 计算战斗力
  const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
  const charactersPower = player.characters.reduce(
    (sum, c) => sum + c.attack + c.defense + c.speed,
    0
  );
  const totalPower = playerPower + charactersPower;
  const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;

  const powerRatio = totalPower / bossPower;
  const baseWinChance = Math.min(0.9, Math.max(0.1, powerRatio * 0.5));
  const victory = Math.random() < baseWinChance;

  // 更新挑战次数
  if (bossStatus) {
    await db.bossStatus.update({
      where: { id: bossStatus.id },
      data: {
        weeklyAttempts: (bossStatus.weeklyAttempts ?? 0) + 1,
        lastAttempt: new Date(),
        lastDefeat: victory ? new Date() : bossStatus.lastDefeat,
      },
    });
  } else {
    await db.bossStatus.create({
      data: {
        playerId: player.id,
        bossId,
        weeklyAttempts: 1,
        lastAttempt: new Date(),
        lastDefeat: victory ? new Date() : null,
        weekStartDate: weekStart,
      },
    });

    // First boss challenge - unlock boss system
    await db.unlockFlag.upsert({
      where: {
        playerId_flagName: {
          playerId: player.id,
          flagName: "boss_system",
        },
      },
      update: {},
      create: {
        playerId: player.id,
        flagName: "boss_system",
      },
    });
  }

  if (victory) {
    // 发放奖励
    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: boss.rewardGold },
        crystals: { increment: boss.rewardCrystals },
        exp: { increment: boss.rewardExp },
      },
    });

    await db.actionLog.create({
      data: {
        playerId: player.id,
        day: getCurrentGameDay(),
        type: "combat",
        description: `击败了Boss：${boss.name}`,
        baseScore: 50 * boss.level,
        bonus: 100,
        bonusReason: "Boss战胜利",
      },
    });

    // 宝箱掉落 (100% on victory)
    const chestName = `${boss.rewardChestRarity}宝箱`;
    let droppedChest = null;
    const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
    if (chestCard) {
      await addCardEntity(db, entities, player.id, chestCard.id, 1);
      droppedChest = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
    }

    // 装备掉落 (100% on victory)
    const droppedEquipment = await grantRandomEquipment(db, entities, player.id, boss.rewardEquipRarity);

    return {
      victory: true,
      bossName: boss.name,
      rewards: {
        gold: boss.rewardGold,
        crystals: boss.rewardCrystals,
        exp: boss.rewardExp,
        chest: droppedChest,
        equipment: droppedEquipment,
      },
      message: `击败了${boss.name}！`,
    };
  } else {
    return {
      victory: false,
      bossName: boss.name,
      message: `挑战${boss.name}失败，下次再来！`,
      remainingAttempts: boss.weeklyAttemptLimit - ((bossStatus?.weeklyAttempts ?? 0) + 1),
    };
  }
}

export async function getBossDetail(db: FullDbClient, bossId: string) {
  const boss = await db.boss.findUnique({ where: { id: bossId } });
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  const skills = JSON.parse(boss.skills) as Array<{ name: string; damage: number; effect?: string }>;

  return {
    id: boss.id,
    name: boss.name,
    icon: boss.icon,
    description: boss.description,
    level: boss.level,
    hp: boss.hp,
    attack: boss.attack,
    defense: boss.defense,
    weeklyAttemptLimit: boss.weeklyAttemptLimit,
    skills: skills.map(s => ({
      name: s.name,
      description: s.effect ?? "普通攻击",
    })),
    rewards: {
      gold: boss.rewardGold,
      crystals: boss.rewardCrystals,
      exp: boss.rewardExp,
      cardRarity: boss.rewardChestRarity,
    },
    unlockCondition: {
      tier: boss.requiredTier || undefined,
      level: boss.requiredLevel,
      world: boss.requiredWorld ?? undefined,
    },
  };
}
