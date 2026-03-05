/**
 * 玩家相关工具函数
 * 统一管理玩家数据获取和操作
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient, Player } from "../../../../generated/prisma";
import { getCurrentGameDay } from "./game-time";

/**
 * 获取玩家或抛出错误
 * 统一处理用户ID检查和玩家存在性检查
 */
export async function getPlayerOrThrow(
  db: PrismaClient,
  userId: string | undefined
): Promise<Player> {
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
  }

  const player = await db.player.findUnique({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  return player;
}

/**
 * 获取玩家（通过findFirst，支持session?.user?.id）
 * 用于publicProcedure中可能为undefined的userId
 */
export async function getPlayerByUserId(
  db: PrismaClient,
  userId: string | undefined
): Promise<Player | null> {
  if (!userId) return null;
  return db.player.findFirst({ where: { userId } });
}

/**
 * 计算当前体力值（基于时间回复）
 */
export function calculateCurrentStamina(
  lastStamina: number,
  maxStamina: number,
  staminaPerMin: number,
  lastUpdate: Date
): { stamina: number; shouldUpdate: boolean } {
  const now = new Date();
  const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  const regenerated = Math.floor(minutesPassed * staminaPerMin);

  if (regenerated <= 0) {
    return { stamina: lastStamina, shouldUpdate: false };
  }

  const newStamina = Math.min(lastStamina + regenerated, maxStamina);
  return { stamina: newStamina, shouldUpdate: newStamina !== lastStamina };
}

/**
 * 资源类型
 */
export type ResourceType = "gold" | "wood" | "stone" | "food" | "crystals";

/**
 * 资源更新对象
 */
export interface ResourceUpdates {
  gold?: number;
  wood?: number;
  stone?: number;
  food?: number;
  crystals?: number;
}

/**
 * 更新玩家资源
 * 支持增量更新和绝对值设置
 */
export async function updatePlayerResources(
  db: PrismaClient,
  playerId: string,
  updates: ResourceUpdates
): Promise<Player> {
  return db.player.update({
    where: { id: playerId },
    data: updates,
  });
}

/**
 * 增加玩家资源（相对值）
 */
export async function addPlayerResources(
  db: PrismaClient,
  player: Player,
  additions: ResourceUpdates
): Promise<Player> {
  const updates: ResourceUpdates = {};
  if (additions.gold) updates.gold = player.gold + additions.gold;
  if (additions.wood) updates.wood = player.wood + additions.wood;
  if (additions.stone) updates.stone = player.stone + additions.stone;
  if (additions.food) updates.food = player.food + additions.food;
  if (additions.crystals) updates.crystals = player.crystals + additions.crystals;

  return db.player.update({
    where: { id: player.id },
    data: updates,
  });
}

/**
 * 检查玩家是否有足够资源
 */
export function hasEnoughResources(
  player: Player,
  required: ResourceUpdates
): boolean {
  if (required.gold && player.gold < required.gold) return false;
  if (required.wood && player.wood < required.wood) return false;
  if (required.stone && player.stone < required.stone) return false;
  if (required.food && player.food < required.food) return false;
  if (required.crystals && player.crystals < required.crystals) return false;
  return true;
}

/**
 * 验证并扣除资源，如果不足则抛出错误
 */
export async function deductResourcesOrThrow(
  db: PrismaClient,
  player: Player,
  required: ResourceUpdates,
  errorMessage = "资源不足"
): Promise<Player> {
  if (!hasEnoughResources(player, required)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errorMessage });
  }

  const updates: ResourceUpdates = {};
  if (required.gold) updates.gold = player.gold - required.gold;
  if (required.wood) updates.wood = player.wood - required.wood;
  if (required.stone) updates.stone = player.stone - required.stone;
  if (required.food) updates.food = player.food - required.food;
  if (required.crystals) updates.crystals = player.crystals - required.crystals;

  return db.player.update({
    where: { id: player.id },
    data: updates,
  });
}

/**
 * 记录行动日志（服务端内部使用，不暴露为 tRPC mutation）
 */
export type ActionType = "build" | "explore" | "combat" | "upgrade" | "production" | "recruit";

export async function logActionInternal(
  db: PrismaClient,
  playerId: string,
  type: ActionType,
  description: string,
  baseScore: number,
  bonus = 0,
  bonusReason?: string,
): Promise<void> {
  const currentDay = getCurrentGameDay();
  await db.actionLog.create({
    data: {
      playerId,
      day: currentDay,
      type,
      description,
      baseScore,
      bonus,
      bonusReason: bonusReason ?? null,
    },
  });
  await db.player.update({
    where: { id: playerId },
    data: { currentDayScore: { increment: baseScore + bonus } },
  });
}
