/**
 * Boss Service — boss challenge system business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { getWeekStartDate } from "../utils/game-time";
import { ruleService } from "~/server/api/engine";
import { startATBCombat } from "./atb-combat.service";

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
  const player = await db.player.findUnique({ where: { userId } });

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

  // 消耗体力（从规则引擎获取）
  const staminaConfig = await ruleService.getConfig<{ value: number }>("boss_stamina_cost");
  const staminaCost = staminaConfig.value;
  if (player.stamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // 先启动 ATB 战斗，成功后再扣体力和记录次数，避免战斗创建失败时资源已被扣除
  const combatResult = await startATBCombat(db, entities, userId, {
    monsterLevel: boss.level,
    combatType: "boss",
    skipStamina: true,
  });

  // 战斗创建成功，扣除体力
  await db.player.update({
    where: { id: player.id },
    data: {
      stamina: { decrement: staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  // 更新挑战次数
  if (bossStatus) {
    await db.bossStatus.update({
      where: { id: bossStatus.id },
      data: {
        weeklyAttempts: (bossStatus.weeklyAttempts ?? 0) + 1,
        lastAttempt: new Date(),
      },
    });
  } else {
    await db.bossStatus.create({
      data: {
        playerId: player.id,
        bossId,
        weeklyAttempts: 1,
        lastAttempt: new Date(),
        lastDefeat: null,
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

  return {
    combatStarted: true,
    combatId: combatResult.combatId,
    bossName: boss.name,
    bossId: boss.id,
    remainingAttempts: boss.weeklyAttemptLimit - ((bossStatus?.weeklyAttempts ?? 0) + 1),
  };
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
