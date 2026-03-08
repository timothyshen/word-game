/**
 * Settlement Service — daily settlement logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, findActionLogs, updatePlayer } from "../repositories/player.repo";
import { createSettlementLog, findSettlementHistory } from "../repositories/settlement.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { grantRandomCards } from "../utils/card-utils";
import { addCardEntity } from "../utils/card-entity-utils";

// ── Pure helpers ──

function getGrade(score: number): string {
  if (score >= 500) return "S";
  if (score >= 400) return "A";
  if (score >= 300) return "B";
  if (score >= 200) return "C";
  return "D";
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

function computeBreakdown(dayActions: ActionLog[]): ScoreBreakdown {
  const scoreFor = (type: string) => dayActions.filter((a) => a.type === type).reduce((s, a) => s + a.baseScore + a.bonus, 0);
  return {
    build: scoreFor("build"),
    explore: scoreFor("explore"),
    combat: scoreFor("combat"),
    upgrade: scoreFor("upgrade"),
    production: scoreFor("production"),
    recruit: scoreFor("recruit"),
  };
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

  const dailyResults = Object.entries(actionsByDay).map(([day, dayActions]) => {
    const totalScore = dayActions.reduce((sum, a) => sum + a.baseScore + a.bonus, 0);
    return {
      day: parseInt(day),
      totalScore,
      grade: getGrade(totalScore),
      rewards: calculateRewards(totalScore),
      breakdown: computeBreakdown(dayActions),
      actions: dayActions,
    };
  });

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

  for (let day = player.lastSettlementDay + 1; day <= currentDay; day++) {
    const dayActions = actionsByDay[day] ?? [];
    const totalScore = dayActions.reduce((sum, a) => sum + a.baseScore + a.bonus, 0);
    const grade = getGrade(totalScore);
    const rewards = calculateRewards(totalScore);
    const breakdown = computeBreakdown(dayActions);

    // Streak tracking
    if (totalScore >= 200) {
      newStreakDays++;
    } else {
      newStreakDays = 0;
    }

    // Streak bonuses
    if (newStreakDays === 3) {
      rewards.cards.push({ rarity: "稀有", count: 1 });
      rewards.bonus.push("连续3日达标奖励");
    }
    if (newStreakDays === 7) {
      rewards.cards.push({ rarity: "史诗", count: 1 });
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

    settlementResults.push({ day, totalScore, grade, rewards });
  }

  // Update player state
  await updatePlayer(db, player.id, {
    lastSettlementDay: currentDay,
    currentDayScore: 0,
    streakDays: newStreakDays,
  });

  // Grant card rewards
  const grantedCards: Array<{ name: string; rarity: string }> = [];
  for (const reward of totalRewardCards) {
    const cards = await grantRandomCards(db, entities, player.id, reward.rarity, reward.count);
    grantedCards.push(...cards);
  }

  // Grant chest based on best grade
  const GRADE_CHEST: Record<string, string | null> = {
    D: null,
    C: "普通宝箱",
    B: "精良宝箱",
    A: "稀有宝箱",
    S: "史诗宝箱",
  };

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
