/**
 * Dungeon Service — daily repeatable dungeon system
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { getCurrentGameDay } from "../utils/game-time";

// ── Dungeon definitions ──

interface DungeonDef {
  id: string;
  name: string;
  icon: string;
  minLevel: number;
  staminaCost: number;
  floors: number;
  rewards: { gold: number; crystals: number; exp: number };
}

const DUNGEONS: DungeonDef[] = [
  {
    id: "goblin_cave",
    name: "哥布林洞穴",
    icon: "🕳️",
    minLevel: 5,
    staminaCost: 25,
    floors: 3,
    rewards: { gold: 500, crystals: 5, exp: 300 },
  },
  {
    id: "undead_crypt",
    name: "亡灵地穴",
    icon: "💀",
    minLevel: 15,
    staminaCost: 25,
    floors: 3,
    rewards: { gold: 1200, crystals: 10, exp: 800 },
  },
  {
    id: "dragon_lair",
    name: "龙之巢穴",
    icon: "🐉",
    minLevel: 30,
    staminaCost: 25,
    floors: 3,
    rewards: { gold: 3000, crystals: 20, exp: 2000 },
  },
];

const MAX_DAILY_ATTEMPTS = 3;

// ── Helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

function findDungeonOrThrow(dungeonId: string): DungeonDef {
  const dungeon = DUNGEONS.find((d) => d.id === dungeonId);
  if (!dungeon) throw new TRPCError({ code: "NOT_FOUND", message: "副本不存在" });
  return dungeon;
}

async function getTodayDungeonAttempts(db: FullDbClient, playerId: string): Promise<number> {
  const today = getCurrentGameDay();
  const logs = await db.actionLog.findMany({
    where: {
      playerId,
      day: today,
      type: "dungeon",
    },
  });
  return logs.length;
}

// ── Public API ──

export async function getDungeonStatus(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);
  const attempts = await getTodayDungeonAttempts(db, player.id);

  const dungeons = DUNGEONS.map((d) => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    minLevel: d.minLevel,
    floors: d.floors,
    isUnlocked: player.level >= d.minLevel,
    rewards: d.rewards,
  }));

  return {
    todayAttempts: attempts,
    maxAttempts: MAX_DAILY_ATTEMPTS,
    attemptsRemaining: Math.max(0, MAX_DAILY_ATTEMPTS - attempts),
    dungeons,
  };
}

export async function startDungeon(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  dungeonId: string,
) {
  const player = await getPlayerOrThrow(db, userId);
  const dungeon = findDungeonOrThrow(dungeonId);

  // Check level requirement
  if (player.level < dungeon.minLevel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `需要达到${dungeon.minLevel}级才能进入${dungeon.name}`,
    });
  }

  // Check daily attempts
  const attempts = await getTodayDungeonAttempts(db, player.id);
  if (attempts >= MAX_DAILY_ATTEMPTS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "今日副本挑战次数已用完",
    });
  }

  // Check stamina
  if (player.stamina < dungeon.staminaCost) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `体力不足，需要${dungeon.staminaCost}点体力`,
    });
  }

  // Deduct stamina
  await db.player.update({
    where: { id: player.id },
    data: {
      stamina: { decrement: dungeon.staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  // Create action log to record the attempt
  await db.actionLog.create({
    data: {
      playerId: player.id,
      day: getCurrentGameDay(),
      type: "dungeon",
      description: `进入副本：${dungeon.name}（第1层）`,
      baseScore: 10,
      bonus: 0,
      bonusReason: null,
    },
  });

  return {
    dungeonId: dungeon.id,
    dungeonName: dungeon.name,
    currentFloor: 1,
    totalFloors: dungeon.floors,
    message: `进入了${dungeon.name}，准备战斗！`,
  };
}

export async function completeDungeonFloor(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  dungeonId: string,
) {
  const player = await getPlayerOrThrow(db, userId);
  const dungeon = findDungeonOrThrow(dungeonId);

  // Find the latest dungeon action log for this dungeon to track floor progress
  const today = getCurrentGameDay();
  const dungeonLogs = await db.actionLog.findMany({
    where: {
      playerId: player.id,
      day: today,
      type: "dungeon",
      description: { contains: dungeon.name },
    },
    orderBy: { timestamp: "desc" },
  });

  if (dungeonLogs.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请先进入副本",
    });
  }

  // Determine current floor from the latest log
  const latestLog = dungeonLogs[0]!;
  const floorMatch = latestLog.description.match(/第(\d+)层/);
  const currentFloor = floorMatch ? parseInt(floorMatch[1]!, 10) : 1;

  if (currentFloor >= dungeon.floors) {
    // Final floor cleared — grant rewards
    const rewards = getDungeonRewards(dungeonId, dungeon.floors);

    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: rewards.gold },
        crystals: { increment: rewards.crystals },
        exp: { increment: rewards.exp },
      },
    });

    // Update the action log with full completion
    await db.actionLog.update({
      where: { id: latestLog.id },
      data: {
        description: `完成副本：${dungeon.name}（全部${dungeon.floors}层通关）`,
        baseScore: 30,
        bonus: 20,
        bonusReason: "副本通关奖励",
      },
    });

    return {
      dungeonId: dungeon.id,
      dungeonName: dungeon.name,
      currentFloor,
      totalFloors: dungeon.floors,
      completed: true,
      rewards,
      message: `恭喜通关${dungeon.name}！获得奖励：${rewards.gold}金币、${rewards.crystals}水晶、${rewards.exp}经验`,
    };
  }

  // Advance to next floor
  const nextFloor = currentFloor + 1;
  await db.actionLog.update({
    where: { id: latestLog.id },
    data: {
      description: `进入副本：${dungeon.name}（第${nextFloor}层）`,
    },
  });

  return {
    dungeonId: dungeon.id,
    dungeonName: dungeon.name,
    currentFloor: nextFloor,
    totalFloors: dungeon.floors,
    completed: false,
    message: `击败了第${currentFloor}层的敌人，进入第${nextFloor}层！`,
  };
}

export function getDungeonRewards(
  dungeonId: string,
  floorsCleared: number,
): { gold: number; crystals: number; exp: number } {
  const dungeon = findDungeonOrThrow(dungeonId);

  // Scale rewards by floors cleared ratio
  const ratio = floorsCleared / dungeon.floors;
  return {
    gold: Math.floor(dungeon.rewards.gold * ratio),
    crystals: Math.floor(dungeon.rewards.crystals * ratio),
    exp: Math.floor(dungeon.rewards.exp * ratio),
  };
}
