/**
 * Territory Service — territory tile management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";

// 地形类型
const TERRAIN_TYPES = ["grass", "forest", "mountain", "water", "desert"] as const;

// 计算解锁费用（基于距离和已解锁数量）
function calculateUnlockCost(
  positionX: number,
  positionY: number,
  unlockedCount: number,
): { gold: number; wood: number; stone: number } {
  const distance = Math.abs(positionX) + Math.abs(positionY);
  const baseCost = 100;
  const distanceMultiplier = 1 + distance * 0.3;
  const countMultiplier = 1 + Math.floor(unlockedCount / 5) * 0.2;

  return {
    gold: Math.floor(baseCost * distanceMultiplier * countMultiplier),
    wood: Math.floor(baseCost * 0.5 * distanceMultiplier * countMultiplier),
    stone: Math.floor(baseCost * 0.3 * distanceMultiplier * countMultiplier),
  };
}

// 检查位置是否可以解锁（必须与已解锁格子相邻）
function canUnlockPosition(
  x: number,
  y: number,
  unlockedTiles: Array<{ positionX: number; positionY: number }>,
): boolean {
  // (0,0) 始终是起点，已解锁
  if (x === 0 && y === 0) return false;

  const adjacent = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];

  return adjacent.some(
    (pos) =>
      (pos.x === 0 && pos.y === 0) ||
      unlockedTiles.some((t) => t.positionX === pos.x && t.positionY === pos.y),
  );
}

// 随机生成地形
function generateTerrain(): string {
  const weights = { grass: 50, forest: 25, mountain: 15, desert: 10 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (const [terrain, weight] of Object.entries(weights)) {
    if (roll < weight) return terrain;
    roll -= weight;
  }
  return "grass";
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getAll(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  // 获取所有已解锁的格子
  const tiles = await db.territoryTile.findMany({
    where: { playerId: player.id },
    orderBy: [{ positionY: "asc" }, { positionX: "asc" }],
  });

  // 如果没有格子，初始化起点
  if (tiles.length === 0) {
    const startTile = await db.territoryTile.create({
      data: {
        playerId: player.id,
        positionX: 0,
        positionY: 0,
        terrain: "grass",
        unlocked: true,
        unlockedAt: new Date(),
      },
    });
    return [startTile];
  }

  return tiles;
}

export async function getUnlockable(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const unlockedTiles = await db.territoryTile.findMany({
    where: { playerId: player.id, unlocked: true },
  });

  // 找出所有相邻但未解锁的位置
  const unlockableSet = new Set<string>();

  // 始终包含(0,0)相邻的格子
  const startAdjacent = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ];

  for (const pos of startAdjacent) {
    const key = `${pos.x},${pos.y}`;
    const isUnlocked = unlockedTiles.some(
      (t) => t.positionX === pos.x && t.positionY === pos.y,
    );
    if (!isUnlocked) {
      unlockableSet.add(key);
    }
  }

  // 检查所有已解锁格子的相邻位置
  for (const tile of unlockedTiles) {
    const adjacent = [
      { x: tile.positionX - 1, y: tile.positionY },
      { x: tile.positionX + 1, y: tile.positionY },
      { x: tile.positionX, y: tile.positionY - 1 },
      { x: tile.positionX, y: tile.positionY + 1 },
    ];

    for (const pos of adjacent) {
      const key = `${pos.x},${pos.y}`;
      const isUnlocked = unlockedTiles.some(
        (t) => t.positionX === pos.x && t.positionY === pos.y,
      );
      if (!isUnlocked && !(pos.x === 0 && pos.y === 0)) {
        unlockableSet.add(key);
      }
    }
  }

  // 转换为带费用的列表
  const unlockableList = Array.from(unlockableSet).map((key) => {
    const [x, y] = key.split(",").map(Number) as [number, number];
    return {
      positionX: x,
      positionY: y,
      cost: calculateUnlockCost(x, y, unlockedTiles.length),
    };
  });

  return {
    unlockable: unlockableList,
    unlockedCount: unlockedTiles.length,
    playerResources: {
      gold: player.gold,
      wood: player.wood,
      stone: player.stone,
    },
  };
}

export async function getUnlockCost(
  db: FullDbClient,
  userId: string,
  positionX: number,
  positionY: number,
) {
  const player = await getPlayerOrThrow(db, userId);

  const unlockedCount = await db.territoryTile.count({
    where: { playerId: player.id, unlocked: true },
  });

  const cost = calculateUnlockCost(positionX, positionY, unlockedCount);

  return {
    cost,
    canAfford:
      player.gold >= cost.gold &&
      player.wood >= cost.wood &&
      player.stone >= cost.stone,
    playerResources: {
      gold: player.gold,
      wood: player.wood,
      stone: player.stone,
    },
  };
}

export async function unlock(
  db: FullDbClient,
  userId: string,
  positionX: number,
  positionY: number,
) {
  const player = await getPlayerOrThrow(db, userId);

  // 检查是否已解锁
  const existing = await db.territoryTile.findUnique({
    where: {
      playerId_positionX_positionY: {
        playerId: player.id,
        positionX,
        positionY,
      },
    },
  });

  if (existing?.unlocked) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该格子已解锁" });
  }

  // 获取已解锁的格子
  const unlockedTiles = await db.territoryTile.findMany({
    where: { playerId: player.id, unlocked: true },
  });

  // 检查是否可以解锁（相邻检查）
  if (!canUnlockPosition(positionX, positionY, unlockedTiles)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该位置无法解锁，需要与已解锁区域相邻" });
  }

  // 计算费用
  const cost = calculateUnlockCost(positionX, positionY, unlockedTiles.length);

  // 检查资源
  if (player.gold < cost.gold) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${cost.gold}` });
  }
  if (player.wood < cost.wood) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${cost.wood}` });
  }
  if (player.stone < cost.stone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${cost.stone}` });
  }

  // 扣除资源
  await db.player.update({
    where: { id: player.id },
    data: {
      gold: { decrement: cost.gold },
      wood: { decrement: cost.wood },
      stone: { decrement: cost.stone },
    },
  });

  // 创建或更新格子
  const terrain = generateTerrain();
  const tile = await db.territoryTile.upsert({
    where: {
      playerId_positionX_positionY: {
        playerId: player.id,
        positionX,
        positionY,
      },
    },
    update: {
      unlocked: true,
      unlockedAt: new Date(),
      terrain,
    },
    create: {
      playerId: player.id,
      positionX,
      positionY,
      terrain,
      unlocked: true,
      unlockedAt: new Date(),
    },
  });

  return {
    success: true,
    tile,
    cost,
    message: `成功解锁 (${positionX}, ${positionY}) 区域`,
  };
}

export async function getTileDetail(
  db: FullDbClient,
  userId: string,
  positionX: number,
  positionY: number,
) {
  const player = await getPlayerOrThrow(db, userId);

  const tile = await db.territoryTile.findUnique({
    where: {
      playerId_positionX_positionY: {
        playerId: player.id,
        positionX,
        positionY,
      },
    },
  });

  // 获取该格子上的建筑
  const building = await db.playerBuilding.findUnique({
    where: {
      playerId_positionX_positionY: {
        playerId: player.id,
        positionX,
        positionY,
      },
    },
    include: { building: true },
  });

  return {
    tile: tile ?? {
      positionX,
      positionY,
      unlocked: positionX === 0 && positionY === 0,
      terrain: "grass",
    },
    building: building
      ? {
          id: building.id,
          name: building.building.name,
          icon: building.building.icon,
          level: building.level,
        }
      : null,
  };
}
