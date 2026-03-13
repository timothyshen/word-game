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
 * Uses groupBy aggregate to avoid loading all logs into memory.
 */
export async function getWeeklyLeaderboard(db: FullDbClient): Promise<LeaderboardEntry[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Aggregate scores per player in the database
  const grouped = await db.settlementLog.groupBy({
    by: ["playerId"],
    where: { settledAt: { gte: sevenDaysAgo } },
    _sum: { totalScore: true },
    _count: { _all: true },
    orderBy: { _sum: { totalScore: "desc" } },
    take: 10,
  });

  if (grouped.length === 0) return [];

  // Fetch player details for top 10 only
  const playerIds = grouped.map(g => g.playerId);
  const players = await db.player.findMany({
    where: { id: { in: playerIds } },
    include: { user: true },
  });
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Fetch grades for these players to compute average
  const gradeLogs = await db.settlementLog.findMany({
    where: {
      settledAt: { gte: sevenDaysAgo },
      playerId: { in: playerIds },
    },
    select: { playerId: true, grade: true },
  });

  const GRADE_VALUES: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const VALUE_GRADES = ["D", "D", "C", "B", "A", "S"];

  const gradesByPlayer = new Map<string, string[]>();
  for (const log of gradeLogs) {
    const existing = gradesByPlayer.get(log.playerId) ?? [];
    existing.push(log.grade);
    gradesByPlayer.set(log.playerId, existing);
  }

  return grouped.map((g) => {
    const player = playerMap.get(g.playerId);
    const grades = gradesByPlayer.get(g.playerId) ?? [];
    const avgValue =
      grades.length > 0
        ? grades.reduce((sum, grade) => sum + (GRADE_VALUES[grade] ?? 1), 0) / grades.length
        : 1;
    const avgGrade = VALUE_GRADES[Math.round(avgValue)] ?? "D";

    return {
      username: player?.user?.name ?? "未知玩家",
      totalScore: g._sum.totalScore ?? 0,
      averageGrade: avgGrade,
      streakDays: player?.streakDays ?? 0,
    };
  });
}

/**
 * Get the current player's rank in the weekly leaderboard.
 * Uses groupBy to aggregate in the database.
 */
export async function getPlayerRank(
  db: FullDbClient,
  userId: string,
): Promise<{ rank: number; totalScore: number; totalPlayers: number }> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Aggregate scores per player in the database
  const grouped = await db.settlementLog.groupBy({
    by: ["playerId"],
    where: { settledAt: { gte: sevenDaysAgo } },
    _sum: { totalScore: true },
  });

  const myScore = grouped.find(g => g.playerId === player.id)?._sum.totalScore ?? 0;

  // Count how many players have a higher score
  let rank = 1;
  for (const g of grouped) {
    if ((g._sum.totalScore ?? 0) > myScore) rank++;
  }

  return {
    rank,
    totalScore: myScore,
    totalPlayers: grouped.length,
  };
}
