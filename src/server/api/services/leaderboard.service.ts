/**
 * Leaderboard Service — weekly leaderboard logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";

interface LeaderboardEntry {
  username: string;
  totalScore: number;
  averageGrade: string;
  streakDays: number;
}

/**
 * Get the top 10 players for the current week based on SettlementLog scores.
 */
export async function getWeeklyLeaderboard(db: FullDbClient): Promise<LeaderboardEntry[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch settlement logs from the past 7 days, grouped by player
  const recentLogs = await db.settlementLog.findMany({
    where: {
      settledAt: { gte: sevenDaysAgo },
    },
    include: {
      player: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { totalScore: "desc" },
  });

  // Aggregate scores per player
  const playerScores = new Map<
    string,
    {
      username: string;
      totalScore: number;
      grades: string[];
      streakDays: number;
    }
  >();

  for (const log of recentLogs) {
    const playerId = log.playerId;
    const existing = playerScores.get(playerId);
    if (existing) {
      existing.totalScore += log.totalScore;
      existing.grades.push(log.grade);
    } else {
      playerScores.set(playerId, {
        username: log.player.user.name ?? "未知玩家",
        totalScore: log.totalScore,
        grades: [log.grade],
        streakDays: log.player.streakDays,
      });
    }
  }

  // Compute average grade per player and sort
  const GRADE_VALUES: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const VALUE_GRADES = ["D", "D", "C", "B", "A", "S"];

  const entries: LeaderboardEntry[] = Array.from(playerScores.values()).map((p) => {
    const avgValue =
      p.grades.length > 0
        ? p.grades.reduce((sum, g) => sum + (GRADE_VALUES[g] ?? 1), 0) / p.grades.length
        : 1;
    const avgGrade = VALUE_GRADES[Math.round(avgValue)] ?? "D";

    return {
      username: p.username,
      totalScore: p.totalScore,
      averageGrade: avgGrade,
      streakDays: p.streakDays,
    };
  });

  // Sort by total score descending and return top 10
  entries.sort((a, b) => b.totalScore - a.totalScore);
  return entries.slice(0, 10);
}

/**
 * Get the current player's rank in the weekly leaderboard.
 */
export async function getPlayerRank(
  db: FullDbClient,
  userId: string,
): Promise<{ rank: number; totalScore: number; totalPlayers: number }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all player scores for the week
  const recentLogs = await db.settlementLog.findMany({
    where: {
      settledAt: { gte: sevenDaysAgo },
    },
    select: {
      playerId: true,
      totalScore: true,
    },
  });

  // Aggregate per player
  const playerTotals = new Map<string, number>();
  for (const log of recentLogs) {
    playerTotals.set(log.playerId, (playerTotals.get(log.playerId) ?? 0) + log.totalScore);
  }

  const myScore = playerTotals.get(player.id) ?? 0;

  // Count how many players have a higher score
  let rank = 1;
  for (const score of playerTotals.values()) {
    if (score > myScore) rank++;
  }

  return {
    rank,
    totalScore: myScore,
    totalPlayers: playerTotals.size,
  };
}
