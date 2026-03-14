/**
 * Settlement Service — daily settlement logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, findActionLogs, updatePlayer } from "../repositories/player.repo";
import { createSettlementLog, findSettlementHistory } from "../repositories/settlement.repo";
import { findPlayerBuildings, findAllPlayerCharacters } from "../repositories/building.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { grantRandomCards } from "../utils/card-utils";
import { addCardEntity } from "../utils/card-entity-utils";
import { ruleService } from "~/server/api/engine";

// ── Pure helpers ──

async function getGrade(score: number): Promise<string> {
  const thresholds = await ruleService.getConfig<Record<string, number>>("settlement_grade_thresholds");
  // thresholds = { S: 500, A: 400, B: 300, C: 200 }
  const grades = Object.entries(thresholds).sort((a, b) => b[1] - a[1]);
  for (const [grade, threshold] of grades) {
    if (score >= threshold) return grade;
  }
  return "D";
}

function getCrystalReward(grade: string): number {
  switch (grade) {
    case "S": return 15;
    case "A": return 10;
    case "B": return 5;
    case "C": return 2;
    default: return 0;
  }
}

function calculateRewards(score: number): { cards: Array<{ rarity: string; count: number }>; bonus: string[] } {
  const cards: Array<{ rarity: string; count: number }> = [];
  const bonus: string[] = [];

  if (score >= 500) {
    cards.push({ rarity: "精良", count: 3 }, { rarity: "稀有", count: 1 });
    bonus.push("随机奖励");
  } else if (score >= 400) {
    cards.push({ rarity: "精良", count: 2 }, { rarity: "稀有", count: 1 });
  } else if (score >= 300) {
    cards.push({ rarity: "普通", count: 3 }, { rarity: "精良", count: 1 });
  } else if (score >= 200) {
    cards.push({ rarity: "普通", count: 2 }, { rarity: "精良", count: 1 });
  } else if (score >= 100) {
    cards.push({ rarity: "普通", count: 2 });
  } else {
    cards.push({ rarity: "普通", count: 1 });
  }

  return { cards, bonus };
}

type ActionLog = { day: number; type: string; baseScore: number; bonus: number };

interface ScoreBreakdown {
  build: number;
  explore: number;
  combat: number;
  upgrade: number;
  production: number;
  recruit: number;
}

/** Per-category diminishing returns threshold */
const DIMINISHING_RETURNS_THRESHOLD = 3;
const DIMINISHING_RETURNS_MULTIPLIER = 0.5;
/** Balanced lord bonus: if scored in 3+ categories, +20% total */
const BALANCED_CATEGORY_THRESHOLD = 3;
const BALANCED_BONUS_MULTIPLIER = 0.2;

function computeScoreForCategory(actions: ActionLog[]): number {
  let total = 0;
  for (let i = 0; i < actions.length; i++) {
    const base = actions[i]!.baseScore + actions[i]!.bonus;
    if (i >= DIMINISHING_RETURNS_THRESHOLD) {
      // After 3rd action in same category, 50% score
      total += Math.floor(base * DIMINISHING_RETURNS_MULTIPLIER);
    } else {
      total += base;
    }
  }
  return total;
}

function computeBreakdown(dayActions: ActionLog[]): ScoreBreakdown {
  const categories = ["build", "explore", "combat", "upgrade", "production", "recruit"] as const;
  const grouped = new Map<string, ActionLog[]>();
  for (const cat of categories) {
    grouped.set(cat, dayActions.filter((a) => a.type === cat));
  }

  return {
    build: computeScoreForCategory(grouped.get("build") ?? []),
    explore: computeScoreForCategory(grouped.get("explore") ?? []),
    combat: computeScoreForCategory(grouped.get("combat") ?? []),
    upgrade: computeScoreForCategory(grouped.get("upgrade") ?? []),
    production: computeScoreForCategory(grouped.get("production") ?? []),
    recruit: computeScoreForCategory(grouped.get("recruit") ?? []),
  };
}

/** Compute total daily score with diminishing returns and balanced lord bonus */
function computeDailyScore(dayActions: ActionLog[]): number {
  const breakdown = computeBreakdown(dayActions);
  let total = breakdown.build + breakdown.explore + breakdown.combat
    + breakdown.upgrade + breakdown.production + breakdown.recruit;

  // Count categories with non-zero score
  const activeCategories = Object.values(breakdown).filter((v) => v > 0).length;
  if (activeCategories >= BALANCED_CATEGORY_THRESHOLD) {
    total = Math.floor(total * (1 + BALANCED_BONUS_MULTIPLIER));
  }

  return total;
}

// ── Exported service functions ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function checkSettlement(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const currentDay = getCurrentGameDay();
  const needsSettlement = player.lastSettlementDay < currentDay;

  return {
    needsSettlement,
    currentDay,
    lastSettlementDay: player.lastSettlementDay,
    pendingDays: needsSettlement ? currentDay - player.lastSettlementDay : 0,
  };
}

export async function getSettlementPreview(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const currentDay = getCurrentGameDay();

  const actions = await findActionLogs(db, player.id, {
    dayGt: player.lastSettlementDay,
    dayLte: currentDay,
  });

  // Group by day
  const actionsByDay = actions.reduce(
    (acc, action) => {
      (acc[action.day] ??= []).push(action);
      return acc;
    },
    {} as Record<number, typeof actions>,
  );

  const dailyResults = await Promise.all(Object.entries(actionsByDay).map(async ([day, dayActions]) => {
    const totalScore = computeDailyScore(dayActions);
    return {
      day: parseInt(day),
      totalScore,
      grade: await getGrade(totalScore),
      rewards: calculateRewards(totalScore),
      breakdown: computeBreakdown(dayActions),
      actions: dayActions,
    };
  }));

  return { pendingDays: currentDay - player.lastSettlementDay, dailyResults, currentStreakDays: player.streakDays };
}

export async function executeSettlement(db: FullDbClient, entities: IEntityManager, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const currentDay = getCurrentGameDay();

  if (player.lastSettlementDay >= currentDay) {
    return { settled: false, message: "今日已结算" };
  }

  const actions = await findActionLogs(db, player.id, {
    dayGt: player.lastSettlementDay,
    dayLte: currentDay,
  });

  const actionsByDay = actions.reduce(
    (acc, action) => {
      (acc[action.day] ??= []).push(action);
      return acc;
    },
    {} as Record<number, typeof actions>,
  );

  const settlementResults = [];
  let newStreakDays = player.streakDays;
  const totalRewardCards: Array<{ rarity: string; count: number }> = [];
  let totalCrystals = 0;

  // Fetch config values once before the loop
  const streakThreshold = await ruleService.getConfig<{ value: number }>("settlement_streak_threshold");
  const streak3 = await ruleService.getConfig<{ rarity: string }>("settlement_streak_3_reward");
  const streak7 = await ruleService.getConfig<{ rarity: string }>("settlement_streak_7_reward");

  // ── Resource sinks: building maintenance + character wages ──
  const buildings = await findPlayerBuildings(db, entities, player.id);
  const characters = await findAllPlayerCharacters(entities, player.id);

  // Building maintenance costs (level 3+)
  let buildingMaintenanceCost = 0;
  const buildingsNeedingMaintenance: Array<{ name: string; level: number; cost: number }> = [];
  for (const pb of buildings) {
    let maintenanceCost = 0;
    if (pb.level >= 5) maintenanceCost = 50;
    else if (pb.level >= 4) maintenanceCost = 25;
    else if (pb.level >= 3) maintenanceCost = 10;

    if (maintenanceCost > 0) {
      buildingMaintenanceCost += maintenanceCost;
      buildingsNeedingMaintenance.push({
        name: pb.building.name,
        level: pb.level,
        cost: maintenanceCost,
      });
    }
  }

  // Character wages: level * 2 gold per character per day
  let characterWages = 0;
  for (const char of characters) {
    characterWages += (char.level ?? 1) * 2;
  }

  const totalDailyExpenses = buildingMaintenanceCost + characterWages;
  const daysToSettle = currentDay - player.lastSettlementDay;
  const totalExpenses = totalDailyExpenses * daysToSettle;

  // Deduct expenses (player gold cannot go below 0)
  const canPayFull = player.gold >= totalExpenses;
  const actualDeduction = canPayFull ? totalExpenses : player.gold;

  if (actualDeduction > 0) {
    await updatePlayer(db, player.id, {
      gold: { decrement: actualDeduction },
    });
  }

  // If can't pay, building output is halved (tracked via settlement result)
  // The halving effect is informational — actual output reduction would be
  // applied in building.service.ts collectDailyOutput if needed

  for (let day = player.lastSettlementDay + 1; day <= currentDay; day++) {
    const dayActions = actionsByDay[day] ?? [];
    const totalScore = computeDailyScore(dayActions);
    const grade = await getGrade(totalScore);
    const rewards = calculateRewards(totalScore);
    const breakdown = computeBreakdown(dayActions);

    // Crystal rewards based on grade
    const crystalReward = getCrystalReward(grade);
    totalCrystals += crystalReward;

    // Streak tracking
    if (totalScore >= streakThreshold.value) {
      newStreakDays++;
    } else {
      newStreakDays = 0;
    }

    // Streak bonuses
    if (newStreakDays === 3) {
      rewards.cards.push({ rarity: streak3.rarity, count: 1 });
      rewards.bonus.push("连续3日达标奖励");
    }
    if (newStreakDays === 7) {
      rewards.cards.push({ rarity: streak7.rarity, count: 1 });
      rewards.bonus.push("连续7日达标奖励");
    }

    // Accumulate card rewards
    for (const card of rewards.cards) {
      const existing = totalRewardCards.find((c) => c.rarity === card.rarity);
      if (existing) existing.count += card.count;
      else totalRewardCards.push({ ...card });
    }

    await createSettlementLog(db, {
      playerId: player.id,
      day,
      totalScore,
      grade,
      rewards: JSON.stringify(rewards),
      breakdown: JSON.stringify(breakdown),
    });

    settlementResults.push({ day, totalScore, grade, rewards, crystals: crystalReward });
  }

  // Update player state and grant crystal rewards
  await updatePlayer(db, player.id, {
    lastSettlementDay: currentDay,
    currentDayScore: 0,
    streakDays: newStreakDays,
    ...(totalCrystals > 0 ? { crystals: { increment: totalCrystals } } : {}),
  });

  // Grant card rewards
  const grantedCards: Array<{ name: string; rarity: string }> = [];
  for (const reward of totalRewardCards) {
    const cards = await grantRandomCards(db, entities, player.id, reward.rarity, reward.count);
    grantedCards.push(...cards);
  }

  // Grant chest based on best grade
  const GRADE_CHEST = await ruleService.getConfig<Record<string, string | null>>("settlement_grade_chests");

  let chestReward = null;
  if (settlementResults.length > 0) {
    const gradeOrder = ["D", "C", "B", "A", "S"];
    const bestGrade = settlementResults.reduce((best, r) => {
      return gradeOrder.indexOf(r.grade) > gradeOrder.indexOf(best) ? r.grade : best;
    }, "D");

    const chestName = GRADE_CHEST[bestGrade];
    if (chestName) {
      const chestCard = await db.card.findFirst({ where: { name: chestName, type: "chest" } });
      if (chestCard) {
        await addCardEntity(db, entities, player.id, chestCard.id, 1);
        chestReward = { name: chestCard.name, rarity: chestCard.rarity, icon: chestCard.icon };
      }
    }
  }

  return {
    settled: true,
    daysSettled: currentDay - player.lastSettlementDay,
    results: settlementResults,
    totalRewardCards,
    grantedCards,
    chestReward,
    newStreakDays,
    totalCrystals,
    expenses: {
      buildingMaintenance: buildingMaintenanceCost * daysToSettle,
      characterWages: characterWages * daysToSettle,
      total: totalExpenses,
      paid: actualDeduction,
      unpaid: totalExpenses - actualDeduction,
      buildingsAffected: !canPayFull ? buildingsNeedingMaintenance.map(b => b.name) : [],
    },
  };
}

export async function getSettlementHistory(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const history = await findSettlementHistory(db, player.id);

  return history.map((log) => ({
    ...log,
    rewards: JSON.parse(log.rewards) as { cards: Array<{ rarity: string; count: number }>; bonus: string[] },
    breakdown: JSON.parse(log.breakdown) as ScoreBreakdown,
  }));
}
