/**
 * InnerCity Service — inner city management business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import * as icRepo from "../repositories/innerCity.repo";
import * as cardRepo from "../repositories/card.repo";
import {
  getBuildingRadius,
  getBuildingSize,
  wouldRadiusGrow,
  canPlaceBuilding,
  canUpgradeBuilding,
  snapToGrid,
  type BuildingForCollision,
} from "~/shared/building-radius";

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getStatus(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const config = await icRepo.findConfig(db, player.id);

  if (!config) {
    return {
      initialized: false,
      territoryWidth: 0,
      territoryHeight: 0,
      cornerRadius: 0,
      buildingCount: 0,
      territoryArea: 0,
    };
  }

  const buildingCount = await icRepo.countBuildings(db, player.id);

  // 圆角矩形近似面积
  const w = config.territoryWidth * 2;
  const h = config.territoryHeight * 2;
  const r = config.cornerRadius;
  const territoryArea = w * h - (4 - Math.PI) * r * r;

  return {
    initialized: true,
    territoryWidth: config.territoryWidth,
    territoryHeight: config.territoryHeight,
    cornerRadius: config.cornerRadius,
    buildingCount,
    territoryArea: Math.round(territoryArea),
  };
}

export async function getCity(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const config = await icRepo.findConfig(db, player.id);

  if (!config) {
    return {
      buildings: [],
      territory: { halfW: 0, halfH: 0, cornerR: 0 },
    };
  }

  const buildings = await icRepo.findBuildings(db, player.id);

  return {
    territory: {
      halfW: config.territoryWidth,
      halfH: config.territoryHeight,
      cornerR: config.cornerRadius,
    },
    buildings: buildings.map((b) => {
      const size = getBuildingSize(b.template.name, b.level);
      return {
        id: b.id,
        x: b.positionX,
        y: b.positionY,
        level: b.level,
        radius: size.radius,
        visualW: size.visualW,
        visualH: size.visualH,
        height: size.height,
        templateId: b.templateId,
        name: b.template.name,
        icon: b.template.icon,
        slot: b.template.slot,
      };
    }),
  };
}

export async function initialize(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const existingConfig = await icRepo.findConfig(db, player.id);

  if (existingConfig) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "内城已初始化" });
  }

  // 创建领地配置
  await icRepo.createConfig(db, player.id, 4.0, 4.0, 1.5);

  // 在中心放置主城堡
  const castle = await icRepo.findBuildingTemplate(db, "主城堡");

  if (castle) {
    await icRepo.createBuilding(db, {
      playerId: player.id,
      templateId: castle.id,
      positionX: 0,
      positionY: 0,
      level: 1,
    });
  }

  return {
    success: true,
    message: "内城初始化完成",
    territory: { halfW: 4.0, halfH: 4.0, cornerR: 1.5 },
  };
}

export async function placeBuilding(
  db: FullDbClient,
  userId: string,
  cardId: string,
  positionX: number,
  positionY: number,
) {
  const player = await getPlayerOrThrow(db, userId);

  const config = await icRepo.findConfig(db, player.id);

  if (!config) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
  }

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在或数量不足" });
  }

  if (playerCard.card.type !== "building") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "只能使用建筑卡" });
  }

  // 解析卡牌效果
  let effects: { buildingId?: string };
  try {
    effects = JSON.parse(playerCard.card.effects) as { buildingId?: string };
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "卡牌效果解析失败" });
  }

  if (!effects.buildingId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "卡牌缺少建筑ID" });
  }

  const buildingTemplate = await db.building.findUnique({
    where: { id: effects.buildingId },
  });

  if (!buildingTemplate) {
    throw new TRPCError({ code: "NOT_FOUND", message: "建筑模板不存在" });
  }

  // 吸附到 0.5 网格
  const x = snapToGrid(positionX);
  const y = snapToGrid(positionY);

  const buildingRadius = getBuildingRadius(buildingTemplate.name, 1);

  // 加载现有建筑进行碰撞检测
  const existingRaw = await icRepo.findBuildings(db, player.id);
  const existingForCollision: BuildingForCollision[] = existingRaw.map((b) => ({
    x: b.positionX,
    y: b.positionY,
    radius: getBuildingRadius(b.template.name, b.level),
  }));

  const territory = {
    halfW: config.territoryWidth,
    halfH: config.territoryHeight,
    cornerR: config.cornerRadius,
  };

  if (!canPlaceBuilding(x, y, buildingRadius, existingForCollision, territory)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "无法在此位置放置建筑：超出领地范围或与其他建筑冲突",
    });
  }

  // 创建建筑
  const building = await icRepo.createBuilding(db, {
    playerId: player.id,
    templateId: buildingTemplate.id,
    positionX: x,
    positionY: y,
    level: 1,
  });

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  // 记录行动分数
  const gameDay = Math.floor(
    (Date.now() - new Date(player.createdAt).getTime()) / (24 * 60 * 60 * 1000)
  ) + 1;

  await createActionLog(db, {
    playerId: player.id,
    day: gameDay,
    type: "build",
    description: `在内城建造了 ${buildingTemplate.name}`,
    baseScore: 50,
    bonus: 0,
    bonusReason: null,
  });

  await updatePlayer(db, player.id, { currentDayScore: { increment: 50 } });

  const size = getBuildingSize(building.template.name, 1);
  return {
    success: true,
    building: {
      id: building.id,
      name: building.template.name,
      icon: building.template.icon,
      level: building.level,
      x,
      y,
      radius: size.radius,
    },
    message: `成功建造 ${buildingTemplate.name}`,
  };
}

export async function expandTerritory(db: FullDbClient, userId: string, cardId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const config = await icRepo.findConfig(db, player.id);

  if (!config) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
  }

  // 获取卡牌
  const playerCard = await cardRepo.findPlayerCardByCardId(db, player.id, cardId);

  if (!playerCard || playerCard.quantity < 1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "卡牌不存在或数量不足" });
  }

  if (playerCard.card.type !== "expansion") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "只能使用扩张卡" });
  }

  let effects: { type?: string; amount?: number };
  try {
    effects = JSON.parse(playerCard.card.effects) as { type?: string; amount?: number };
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "卡牌效果解析失败" });
  }

  const amount = effects.amount ?? 1;
  const widthIncrement = amount * 1.5;
  const cornerIncrement = amount * 0.5;

  const newWidth = config.territoryWidth + widthIncrement;
  const newHeight = config.territoryHeight + widthIncrement;
  const newCorner = config.cornerRadius + cornerIncrement;

  await icRepo.updateConfig(db, player.id, {
    territoryWidth: newWidth,
    territoryHeight: newHeight,
    cornerRadius: newCorner,
  });

  // 消耗卡牌
  await cardRepo.consumeCard(db, playerCard.id, playerCard.quantity);

  return {
    success: true,
    territory: { halfW: newWidth, halfH: newHeight, cornerR: newCorner },
    message: `领地扩张完成！新范围: ${(newWidth * 2).toFixed(1)} x ${(newHeight * 2).toFixed(1)}`,
  };
}

export async function upgradeBuilding(db: FullDbClient, userId: string, buildingId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const building = await icRepo.findBuildingById(db, buildingId, player.id);

  if (!building) {
    throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
  }

  if (building.level >= building.template.maxLevel) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "建筑已达最高等级" });
  }

  // 检查碰撞半径是否会增长
  if (wouldRadiusGrow(building.template.name, building.level)) {
    const config = await icRepo.findConfig(db, player.id);

    if (!config) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "内城未初始化" });
    }

    const newRadius = getBuildingRadius(building.template.name, building.level + 1);

    const allBuildings = await icRepo.findBuildings(db, player.id);
    const allForCollision = allBuildings.map((b) => ({
      id: b.id,
      x: b.positionX,
      y: b.positionY,
      radius: getBuildingRadius(b.template.name, b.level),
    }));

    const territory = {
      halfW: config.territoryWidth,
      halfH: config.territoryHeight,
      cornerR: config.cornerRadius,
    };

    if (!canUpgradeBuilding(building.id, building.positionX, building.positionY, newRadius, allForCollision, territory)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "升级后建筑体积增大，与周围建筑冲突或超出领地范围",
      });
    }
  }

  // 计算升级费用
  const upgradeCost = {
    gold: 100 * building.level,
    wood: 50 * building.level,
    stone: 30 * building.level,
  };

  if (player.gold < upgradeCost.gold) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `金币不足，需要 ${upgradeCost.gold}` });
  }
  if (player.wood < upgradeCost.wood) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `木材不足，需要 ${upgradeCost.wood}` });
  }
  if (player.stone < upgradeCost.stone) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `石材不足，需要 ${upgradeCost.stone}` });
  }

  await updatePlayer(db, player.id, {
    gold: { decrement: upgradeCost.gold },
    wood: { decrement: upgradeCost.wood },
    stone: { decrement: upgradeCost.stone },
  });

  const updatedBuilding = await icRepo.updateBuildingLevel(db, building.id, building.level + 1);

  const newSize = getBuildingSize(updatedBuilding.template.name, updatedBuilding.level);
  return {
    success: true,
    building: {
      id: updatedBuilding.id,
      name: updatedBuilding.template.name,
      level: updatedBuilding.level,
      radius: newSize.radius,
    },
    cost: upgradeCost,
    message: `${building.template.name} 升级到 ${updatedBuilding.level} 级`,
  };
}

export async function demolish(db: FullDbClient, userId: string, buildingId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const building = await icRepo.findBuildingById(db, buildingId, player.id);

  if (!building) {
    throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
  }

  if (building.template.name === "主城堡") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "主城堡不能拆除" });
  }

  const refund = {
    gold: Math.floor(50 * building.level * 0.5),
    wood: Math.floor(25 * building.level * 0.5),
    stone: Math.floor(15 * building.level * 0.5),
  };

  await updatePlayer(db, player.id, {
    gold: { increment: refund.gold },
    wood: { increment: refund.wood },
    stone: { increment: refund.stone },
  });

  await icRepo.deleteBuilding(db, building.id);

  return {
    success: true,
    refund,
    message: `拆除了 ${building.template.name}，返还部分资源`,
  };
}
