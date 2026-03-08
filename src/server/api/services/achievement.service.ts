/**
 * Achievement Service — business logic for achievement tracking and claiming
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { grantRandomCard } from "../utils/card-utils";
import { findPlayerBuildings } from "../repositories/building.repo";

// 成就定义
interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "building" | "combat" | "exploration" | "collection" | "special";
  condition: {
    type: string;
    value: number;
  };
  rewards: {
    gold?: number;
    crystals?: number;
    exp?: number;
    cardRarity?: string;
  };
  hidden?: boolean;
}

// 成就列表
const ACHIEVEMENTS: Achievement[] = [
  // 建筑类
  {
    id: "first_building",
    name: "初出茅庐",
    icon: "🏠",
    description: "建造第一座建筑",
    category: "building",
    condition: { type: "buildings_count", value: 1 },
    rewards: { gold: 100, exp: 50 },
  },
  {
    id: "builder_5",
    name: "小有成就",
    icon: "🏗️",
    description: "拥有5座建筑",
    category: "building",
    condition: { type: "buildings_count", value: 5 },
    rewards: { gold: 300, crystals: 10 },
  },
  {
    id: "builder_10",
    name: "领地扩张",
    icon: "🏰",
    description: "拥有10座建筑",
    category: "building",
    condition: { type: "buildings_count", value: 10 },
    rewards: { gold: 800, crystals: 30, cardRarity: "稀有" },
  },
  {
    id: "upgrader_5",
    name: "精益求精",
    icon: "⬆️",
    description: "将任意建筑升级到5级",
    category: "building",
    condition: { type: "max_building_level", value: 5 },
    rewards: { gold: 500, crystals: 20 },
  },

  // 战斗类
  {
    id: "first_combat",
    name: "初战告捷",
    icon: "⚔️",
    description: "赢得第一场战斗",
    category: "combat",
    condition: { type: "combat_wins", value: 1 },
    rewards: { gold: 100, exp: 50 },
  },
  {
    id: "warrior_10",
    name: "战场新星",
    icon: "🗡️",
    description: "赢得10场战斗",
    category: "combat",
    condition: { type: "combat_wins", value: 10 },
    rewards: { gold: 500, crystals: 15 },
  },
  {
    id: "warrior_50",
    name: "百战勇士",
    icon: "🛡️",
    description: "赢得50场战斗",
    category: "combat",
    condition: { type: "combat_wins", value: 50 },
    rewards: { gold: 1500, crystals: 50, cardRarity: "史诗" },
  },
  {
    id: "boss_slayer",
    name: "Boss猎人",
    icon: "👑",
    description: "击败任意Boss",
    category: "combat",
    condition: { type: "boss_kills", value: 1 },
    rewards: { gold: 800, crystals: 30 },
  },

  // 探索类
  {
    id: "explorer_5",
    name: "探险新手",
    icon: "🗺️",
    description: "探索5个区域",
    category: "exploration",
    condition: { type: "explored_areas", value: 5 },
    rewards: { gold: 200, exp: 100 },
  },
  {
    id: "explorer_20",
    name: "探险家",
    icon: "🧭",
    description: "探索20个区域",
    category: "exploration",
    condition: { type: "explored_areas", value: 20 },
    rewards: { gold: 800, crystals: 25 },
  },
  {
    id: "world_traveler",
    name: "位面旅行者",
    icon: "🌀",
    description: "进入其他位面",
    category: "exploration",
    condition: { type: "worlds_visited", value: 2 },
    rewards: { gold: 1000, crystals: 40, cardRarity: "稀有" },
  },

  // 收集类
  {
    id: "collector_10",
    name: "卡牌收藏家",
    icon: "🎴",
    description: "收集10种不同卡牌",
    category: "collection",
    condition: { type: "unique_cards", value: 10 },
    rewards: { gold: 300, crystals: 10 },
  },
  {
    id: "collector_30",
    name: "卡牌大师",
    icon: "🃏",
    description: "收集30种不同卡牌",
    category: "collection",
    condition: { type: "unique_cards", value: 30 },
    rewards: { gold: 1000, crystals: 50 },
  },
  {
    id: "recruiter_5",
    name: "招募达人",
    icon: "👥",
    description: "招募5名角色",
    category: "collection",
    condition: { type: "characters_count", value: 5 },
    rewards: { gold: 500, crystals: 20 },
  },

  // 特殊类
  {
    id: "rich_1000",
    name: "小有积蓄",
    icon: "💰",
    description: "累计获得1000金币",
    category: "special",
    condition: { type: "total_gold_earned", value: 1000 },
    rewards: { gold: 200 },
  },
  {
    id: "rich_10000",
    name: "富甲一方",
    icon: "💎",
    description: "累计获得10000金币",
    category: "special",
    condition: { type: "total_gold_earned", value: 10000 },
    rewards: { gold: 1000, crystals: 50 },
  },
  {
    id: "level_10",
    name: "初露锋芒",
    icon: "⭐",
    description: "玩家等级达到10级",
    category: "special",
    condition: { type: "player_level", value: 10 },
    rewards: { gold: 500, crystals: 20 },
  },
  {
    id: "tier_2",
    name: "突破极限",
    icon: "🌟",
    description: "玩家职阶达到2阶",
    category: "special",
    condition: { type: "player_tier", value: 2 },
    rewards: { gold: 1000, crystals: 50, cardRarity: "稀有" },
  },
  {
    id: "streak_7",
    name: "坚持不懈",
    icon: "🔥",
    description: "连续7天达标",
    category: "special",
    condition: { type: "streak_days", value: 7 },
    rewards: { gold: 800, crystals: 30, cardRarity: "稀有" },
  },
];

// ── Private helpers ──

/** Calculate current progress for an achievement condition */
function getProgress(
  condition: Achievement["condition"],
  player: {
    buildings: { level: number }[];
    characters: unknown[];
    cards: unknown[];
    combatWins: number;
    bossKills: number;
    currentWorld: string;
    totalGoldEarned: number;
    level: number;
    tier: number;
    streakDays: number;
  },
  exploredAreasCount: number,
): number {
  switch (condition.type) {
    case "buildings_count":
      return player.buildings.length;
    case "max_building_level":
      return Math.max(...player.buildings.map((b) => b.level), 0);
    case "combat_wins":
      return player.combatWins;
    case "boss_kills":
      return player.bossKills;
    case "explored_areas":
      return exploredAreasCount;
    case "worlds_visited":
      // 简化处理：检查是否进入过其他世界
      return player.currentWorld !== "main" ? 2 : 1;
    case "unique_cards":
      return player.cards.length;
    case "characters_count":
      return player.characters.length;
    case "total_gold_earned":
      return player.totalGoldEarned;
    case "player_level":
      return player.level;
    case "player_tier":
      return player.tier;
    case "streak_days":
      return player.streakDays;
    default:
      return 0;
  }
}

// ── Get All Achievements ──

export async function getAllAchievements(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: {
      characters: true,
      cards: true,
      achievements: true,
    },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Load buildings from entity system
  const buildingEntities = await findPlayerBuildings(db, entities, player.id);
  const playerWithBuildings = {
    ...player,
    buildings: buildingEntities.map(b => ({ level: b.level })),
  };

  // 获取统计数据
  const exploredAreasCount = await db.exploredArea.count({
    where: { playerId: player.id },
  });

  const claimedIds = new Set(player.achievements.map((a) => a.achievementId));

  return ACHIEVEMENTS.filter((a) => !a.hidden).map((achievement) => {
    const progress = getProgress(achievement.condition, playerWithBuildings, exploredAreasCount);
    const isCompleted = progress >= achievement.condition.value;
    const isClaimed = claimedIds.has(achievement.id);

    return {
      id: achievement.id,
      name: achievement.name,
      icon: achievement.icon,
      description: achievement.description,
      category: achievement.category,
      progress,
      target: achievement.condition.value,
      isCompleted,
      isClaimed,
      canClaim: isCompleted && !isClaimed,
      rewards: achievement.rewards,
    };
  });
}

// ── Claim Achievement ──

export async function claimAchievement(db: FullDbClient, entities: IEntityManager, userId: string, achievementId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: {
      characters: true,
      cards: true,
      achievements: true,
    },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Load buildings from entity system
  const buildingEntities = await findPlayerBuildings(db, entities, player.id);
  const playerWithBuildings = {
    ...player,
    buildings: buildingEntities.map(b => ({ level: b.level })),
  };

  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) {
    throw new TRPCError({ code: "NOT_FOUND", message: "成就不存在" });
  }

  // 检查是否已领取
  const existingClaim = player.achievements.find(
    (a) => a.achievementId === achievementId
  );
  if (existingClaim) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已领取该成就奖励" });
  }

  // 检查是否达成条件
  const exploredAreasCount = await db.exploredArea.count({
    where: { playerId: player.id },
  });

  const progress = getProgress(achievement.condition, playerWithBuildings, exploredAreasCount);
  if (progress < achievement.condition.value) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "成就未完成" });
  }

  // 记录领取
  await db.playerAchievement.create({
    data: {
      playerId: player.id,
      achievementId: achievement.id,
    },
  });

  // 发放奖励
  const rewards = achievement.rewards;
  await db.player.update({
    where: { id: player.id },
    data: {
      gold: { increment: rewards.gold ?? 0 },
      crystals: { increment: rewards.crystals ?? 0 },
      exp: { increment: rewards.exp ?? 0 },
    },
  });

  // 发放卡牌奖励
  let cardReward = null;
  if (rewards.cardRarity) {
    const result = await grantRandomCard(db, entities, player.id, rewards.cardRarity);
    if (result) {
      cardReward = { name: result.name, rarity: result.rarity };
    }
  }

  // 解锁成就系统（首次领取成就时）
  await db.unlockFlag.upsert({
    where: { playerId_flagName: { playerId: player.id, flagName: "achievement_system" } },
    update: {},
    create: { playerId: player.id, flagName: "achievement_system" },
  });

  return {
    success: true,
    achievementName: achievement.name,
    rewards: {
      gold: rewards.gold ?? 0,
      crystals: rewards.crystals ?? 0,
      exp: rewards.exp ?? 0,
      card: cardReward,
    },
  };
}

// ── Get Achievements By Category ──

export async function getByCategory(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  category: "building" | "combat" | "exploration" | "collection" | "special",
) {
  const player = await db.player.findUnique({
    where: { userId },
    include: {
      characters: true,
      cards: true,
      achievements: true,
    },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  // Load buildings from entity system
  const buildingEntities = await findPlayerBuildings(db, entities, player.id);
  const playerWithBuildings = {
    ...player,
    buildings: buildingEntities.map(b => ({ level: b.level })),
  };

  const exploredAreasCount = await db.exploredArea.count({
    where: { playerId: player.id },
  });

  const claimedIds = new Set(player.achievements.map((a) => a.achievementId));

  return ACHIEVEMENTS.filter((a) => a.category === category && !a.hidden).map(
    (achievement) => {
      const progress = getProgress(achievement.condition, playerWithBuildings, exploredAreasCount);
      const isCompleted = progress >= achievement.condition.value;
      const isClaimed = claimedIds.has(achievement.id);

      return {
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
        description: achievement.description,
        progress,
        target: achievement.condition.value,
        isCompleted,
        isClaimed,
        canClaim: isCompleted && !isClaimed,
        rewards: achievement.rewards,
      };
    }
  );
}

// ── Get Achievement Stats ──

export async function getStats(db: FullDbClient, userId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { achievements: true },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const totalAchievements = ACHIEVEMENTS.filter((a) => !a.hidden).length;
  const claimedCount = player.achievements.length;

  const categoryStats = {
    building: { total: 0, claimed: 0 },
    combat: { total: 0, claimed: 0 },
    exploration: { total: 0, claimed: 0 },
    collection: { total: 0, claimed: 0 },
    special: { total: 0, claimed: 0 },
  };

  for (const achievement of ACHIEVEMENTS.filter((a) => !a.hidden)) {
    categoryStats[achievement.category].total++;
    if (player.achievements.some((a) => a.achievementId === achievement.id)) {
      categoryStats[achievement.category].claimed++;
    }
  }

  return {
    totalAchievements,
    claimedCount,
    completionRate: Math.round((claimedCount / totalAchievements) * 100),
    categoryStats,
  };
}
