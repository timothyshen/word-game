/**
 * Boss Service — boss challenge system business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { getCurrentGameDay, getWeekStartDate } from "../utils/game-time";
import { grantRandomEquipment } from "../utils/equipment-utils";

// Boss稀有度 → 宝箱名称映射
const BOSS_CHEST_MAP: Record<string, string> = {
  "精良": "精良宝箱",
  "稀有": "稀有宝箱",
  "史诗": "史诗宝箱",
  "传说": "传说宝箱",
};

// Boss定义
interface BossDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  skills: Array<{
    name: string;
    damage: number;
    effect?: string;
  }>;
  weeklyAttemptLimit: number;
  unlockCondition: {
    tier?: number;
    level?: number;
    world?: string;
  };
  rewards: {
    gold: number;
    crystals: number;
    exp: number;
    cardRarity: string;
    cardChance: number;
  };
}

const BOSSES: BossDefinition[] = [
  {
    id: "goblin_king",
    name: "哥布林王",
    icon: "👺",
    description: "统领哥布林部落的凶残首领",
    level: 10,
    hp: 500,
    attack: 30,
    defense: 15,
    skills: [
      { name: "王者重击", damage: 1.8 },
      { name: "召唤小弟", damage: 0, effect: "summon" },
    ],
    weeklyAttemptLimit: 3,
    unlockCondition: { level: 5 },
    rewards: { gold: 500, crystals: 20, exp: 200, cardRarity: "精良", cardChance: 0.3 },
  },
  {
    id: "fire_dragon",
    name: "炎龙",
    icon: "🐉",
    description: "居住在火焰位面的远古巨龙",
    level: 25,
    hp: 2000,
    attack: 80,
    defense: 40,
    skills: [
      { name: "龙息", damage: 2.0, effect: "burn" },
      { name: "龙爪撕裂", damage: 1.5 },
      { name: "火焰风暴", damage: 2.5, effect: "aoe" },
    ],
    weeklyAttemptLimit: 2,
    unlockCondition: { tier: 2, level: 15, world: "fire_realm" },
    rewards: { gold: 1500, crystals: 50, exp: 500, cardRarity: "稀有", cardChance: 0.4 },
  },
  {
    id: "shadow_lord",
    name: "暗影领主",
    icon: "👤",
    description: "暗影位面的统治者，掌控黑暗力量",
    level: 40,
    hp: 5000,
    attack: 150,
    defense: 80,
    skills: [
      { name: "暗影吞噬", damage: 2.0, effect: "drain" },
      { name: "黑暗降临", damage: 1.5, effect: "blind" },
      { name: "灵魂收割", damage: 3.0 },
    ],
    weeklyAttemptLimit: 1,
    unlockCondition: { tier: 3, level: 30, world: "shadow_realm" },
    rewards: { gold: 3000, crystals: 100, exp: 1000, cardRarity: "史诗", cardChance: 0.5 },
  },
  {
    id: "celestial_guardian",
    name: "天界守护者",
    icon: "👼",
    description: "守护天界入口的神圣存在",
    level: 60,
    hp: 10000,
    attack: 250,
    defense: 150,
    skills: [
      { name: "神圣裁决", damage: 2.5 },
      { name: "天使之翼", damage: 0, effect: "heal" },
      { name: "天堂之怒", damage: 4.0, effect: "holy" },
    ],
    weeklyAttemptLimit: 1,
    unlockCondition: { tier: 5, level: 50, world: "celestial_realm" },
    rewards: { gold: 10000, crystals: 300, exp: 3000, cardRarity: "传说", cardChance: 0.3 },
  },
];

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAllBosses(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const weekStart = getWeekStartDate();

  // 获取本周挑战记录
  const bossStatuses = await db.bossStatus.findMany({
    where: {
      playerId: player.id,
      weekStartDate: { gte: weekStart },
    },
  });

  const statusMap = new Map(bossStatuses.map(s => [s.bossId, s]));

  return BOSSES.map(boss => {
    const isUnlocked =
      (!boss.unlockCondition.tier || player.tier >= boss.unlockCondition.tier) &&
      (!boss.unlockCondition.level || player.level >= boss.unlockCondition.level) &&
      (!boss.unlockCondition.world || player.currentWorld === boss.unlockCondition.world);

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
      rewards: boss.rewards,
      unlockCondition: boss.unlockCondition,
    };
  });
}

export async function challengeBoss(db: FullDbClient, userId: string, bossId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { characters: { include: { character: true } } },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const boss = BOSSES.find(b => b.id === bossId);
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  // 检查解锁条件
  if (boss.unlockCondition.tier && player.tier < boss.unlockCondition.tier) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.unlockCondition.tier}阶` });
  }
  if (boss.unlockCondition.level && player.level < boss.unlockCondition.level) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `需要达到${boss.unlockCondition.level}级` });
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
    // 新的一周，重置计数
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

  // Boss战斗力
  const bossPower = boss.attack + boss.defense * 0.5 + boss.hp * 0.01;

  // 简化的战斗判定
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
    const rewards = boss.rewards;

    // 发放奖励
    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: rewards.gold },
        crystals: { increment: rewards.crystals },
        exp: { increment: rewards.exp },
      },
    });

    // 记录行动分数
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
    const chestName = BOSS_CHEST_MAP[rewards.cardRarity];
    let droppedChest = null;
    if (chestName) {
      const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
      if (chestCard) {
        await db.playerCard.upsert({
          where: { playerId_cardId: { playerId: player.id, cardId: chestCard.id } },
          update: { quantity: { increment: 1 } },
          create: { playerId: player.id, cardId: chestCard.id, quantity: 1 },
        });
        droppedChest = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
      }
    }

    // 装备掉落 (100% on victory)
    let droppedEquipment = null;
    if (rewards.cardRarity) {
      droppedEquipment = await grantRandomEquipment(db, player.id, rewards.cardRarity);
    }

    return {
      victory: true,
      bossName: boss.name,
      rewards: {
        gold: rewards.gold,
        crystals: rewards.crystals,
        exp: rewards.exp,
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

export function getBossDetail(bossId: string) {
  const boss = BOSSES.find(b => b.id === bossId);
  if (!boss) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Boss不存在" });
  }

  return {
    ...boss,
    skills: boss.skills.map(s => ({
      name: s.name,
      description: s.effect ?? "普通攻击",
    })),
  };
}
