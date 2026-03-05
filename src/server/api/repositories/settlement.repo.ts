/**
 * Settlement Repository — pure data access for SettlementLog
 */
import type { DbClient } from "./types";

export function createSettlementLog(
  db: DbClient,
  data: {
    playerId: string;
    day: number;
    totalScore: number;
    grade: string;
    rewards: string;
    breakdown: string;
  },
) {
  return db.settlementLog.create({ data });
}

export function findSettlementHistory(db: DbClient, playerId: string, limit = 30) {
  return db.settlementLog.findMany({
    where: { playerId },
    orderBy: { day: "desc" },
    take: limit,
  });
}
