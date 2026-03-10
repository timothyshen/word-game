/**
 * Combat Repository — pure data access for CombatSession, PlayerSkill (combat)
 */
import type { DbClient } from "./types";

export function findActiveCombat(db: DbClient, playerId: string) {
  return db.combatSession.findFirst({ where: { playerId, status: "active" } });
}

export function findCombatById(db: DbClient, id: string, playerId: string) {
  return db.combatSession.findFirst({ where: { id, playerId } });
}

export function createCombatSession(
  db: DbClient,
  data: {
    playerId: string;
    status: string;
    currentTurn: number;
    playerTeam: string;
    enemyTeam: string;
    combatType: string;
    areaLevel: number;
    logs: string;
    rewards: string;
    combatState?: string;
  },
) {
  return db.combatSession.create({ data });
}

export function updateCombatSession(
  db: DbClient,
  id: string,
  data: {
    status?: string;
    currentTurn?: number;
    playerTeam?: string;
    enemyTeam?: string;
    logs?: string;
    combatState?: string;
  },
) {
  return db.combatSession.update({ where: { id }, data });
}

export function findCombatHistory(
  db: DbClient,
  playerId: string,
  limit: number,
) {
  return db.combatSession.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function findPlayerCombatSkills(db: DbClient, playerId: string) {
  return db.playerSkill.findMany({
    where: { playerId },
    include: { skill: true },
  });
}

export function findPlayerSkillBySkillId(
  db: DbClient,
  playerId: string,
  skillId: string,
) {
  return db.playerSkill.findFirst({
    where: { playerId, skillId },
    include: { skill: true },
  });
}

