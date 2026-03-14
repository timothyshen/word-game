/**
 * Portal Service — portal and world travel business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import { ruleService } from "~/server/api/engine";

// 世界效果定义
export interface WorldEffect {
  statModifier?: { stat: string; multiplier: number };
  elementalDamageBonus?: string;
  staminaCostMultiplier?: number;
  materialDropBonus?: number;
}

// 世界定义
interface World {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  unlockCondition: {
    tier?: number;
    level?: number;
    quest?: string;
  };
  features: string[];
  effects: WorldEffect;
}

const WORLDS: World[] = [
  {
    id: "main",
    name: "主位面",
    description: "你的领地所在的世界，资源丰富，适合发展。",
    icon: "🏰",
    level: 1,
    unlockCondition: {},
    features: ["建筑发展", "资源采集", "基础战斗"],
    effects: {},
  },
  {
    id: "fire_realm",
    name: "火焰位面",
    description: "燃烧的世界，充满火元素的危险区域。",
    icon: "🔥",
    level: 15,
    unlockCondition: { tier: 2, level: 10 },
    features: ["火属性材料", "火焰怪物", "熔岩地形"],
    effects: {
      statModifier: { stat: "attack", multiplier: 1.2 },
      staminaCostMultiplier: 1.2,
      elementalDamageBonus: "fire",
    },
  },
  {
    id: "ice_realm",
    name: "寒冰位面",
    description: "永恒冰封的世界，隐藏着远古的秘密。",
    icon: "❄️",
    level: 20,
    unlockCondition: { tier: 2, level: 15 },
    features: ["冰属性材料", "冰霜怪物", "极寒环境"],
    effects: {
      statModifier: { stat: "defense", multiplier: 1.3 },
      staminaCostMultiplier: 1.3,
      elementalDamageBonus: "ice",
    },
  },
  {
    id: "shadow_realm",
    name: "暗影位面",
    description: "黑暗笼罩的世界，强大的暗影生物徘徊其中。",
    icon: "🌑",
    level: 30,
    unlockCondition: { tier: 3, level: 25 },
    features: ["暗属性材料", "暗影Boss", "神秘遗迹"],
    effects: {
      statModifier: { stat: "speed", multiplier: 1.25 },
      staminaCostMultiplier: 1.5,
      materialDropBonus: 0.3,
    },
  },
  {
    id: "celestial_realm",
    name: "天界",
    description: "神圣的领域，只有最强大的冒险者才能踏足。",
    icon: "✨",
    level: 50,
    unlockCondition: { tier: 5, level: 40 },
    features: ["神圣材料", "天使守卫", "传说宝藏"],
    effects: {
      statModifier: { stat: "luck", multiplier: 1.5 },
      staminaCostMultiplier: 2.0,
      materialDropBonus: 0.5,
    },
  },
];

// 传送门守护者定义
interface PortalGuardian {
  name: string;
  icon: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
}

const PORTAL_GUARDIANS: Record<string, PortalGuardian> = {
  fire_realm: {
    name: "炎魔守卫",
    icon: "🔥",
    baseHp: 200,
    baseAttack: 35,
    baseDefense: 20,
  },
  ice_realm: {
    name: "冰霜巨人",
    icon: "❄️",
    baseHp: 250,
    baseAttack: 30,
    baseDefense: 30,
  },
  shadow_realm: {
    name: "暗影使者",
    icon: "👤",
    baseHp: 180,
    baseAttack: 45,
    baseDefense: 15,
  },
  celestial_realm: {
    name: "天使守卫",
    icon: "👼",
    baseHp: 500,
    baseAttack: 60,
    baseDefense: 40,
  },
};

interface PortalData {
  targetWorld: string;
  isDefeated?: boolean;
  guardianLevel?: number;
}

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function getWorlds(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  return WORLDS.map(world => {
    const meetsCondition =
      (!world.unlockCondition.tier || player.tier >= world.unlockCondition.tier) &&
      (!world.unlockCondition.level || player.level >= world.unlockCondition.level);

    return {
      ...world,
      isUnlocked: meetsCondition,
      isCurrent: player.currentWorld === world.id,
    };
  });
}

export async function getDiscoveredPortals(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const portals = await db.wildernessFacility.findMany({
    where: {
      playerId: player.id,
      type: "portal",
      isDiscovered: true,
    },
  });

  return portals.map(portal => {
    const data = JSON.parse(portal.data) as PortalData;
    const targetWorld = WORLDS.find(w => w.id === data.targetWorld);
    const guardian = PORTAL_GUARDIANS[data.targetWorld];

    return {
      id: portal.id,
      name: portal.name,
      icon: portal.icon,
      description: portal.description,
      position: { x: portal.positionX, y: portal.positionY },
      worldId: portal.worldId,
      targetWorld: data.targetWorld,
      targetWorldName: targetWorld?.name ?? "未知世界",
      isDefeated: data.isDefeated ?? false,
      canUse: data.isDefeated ?? false,
      guardian: !data.isDefeated && guardian ? {
        name: guardian.name,
        icon: guardian.icon,
        level: data.guardianLevel ?? 10,
      } : null,
    };
  });
}

export async function challengePortalGuardian(db: FullDbClient, entities: IEntityManager, userId: string, portalId: string) {
  const player = await db.player.findUnique({ where: { userId } });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const portal = await db.wildernessFacility.findFirst({
    where: { id: portalId, playerId: player.id, type: "portal" },
  });

  if (!portal) {
    throw new TRPCError({ code: "NOT_FOUND", message: "传送门不存在" });
  }

  const data = JSON.parse(portal.data) as PortalData;

  if (data.isDefeated) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "守护者已被击败" });
  }

  const guardian = PORTAL_GUARDIANS[data.targetWorld];
  if (!guardian) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "守护者信息无效" });
  }

  // 检查体力（从规则引擎获取）
  const guardianStaminaConfig = await ruleService.getConfig<{ value: number }>("portal_guardian_stamina_cost");
  const staminaCost = guardianStaminaConfig.value;
  if (player.stamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // 消耗体力
  await db.player.update({
    where: { id: player.id },
    data: {
      stamina: { decrement: staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  // 计算战斗力
  const guardianLevel = data.guardianLevel ?? 10;
  const guardianHp = Math.floor(guardian.baseHp * (1 + guardianLevel * 0.2));
  const guardianAttack = Math.floor(guardian.baseAttack * (1 + guardianLevel * 0.15));
  const guardianDefense = Math.floor(guardian.baseDefense * (1 + guardianLevel * 0.1));

  const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
  const charEntities = await entities.getEntitiesByOwner(player.id, "character") as Array<{ id: string; state: string }>;
  const charactersPower = charEntities.reduce((sum, e) => {
    const state = JSON.parse(e.state) as { attack: number; defense: number; speed: number };
    return sum + state.attack + state.defense + state.speed;
  }, 0);
  const totalPower = playerPower + charactersPower;
  const guardianPower = guardianAttack + guardianDefense * 0.5 + guardianHp * 0.01;

  // 战斗判定
  const powerRatio = totalPower / guardianPower;
  const baseWinChance = Math.min(0.8, Math.max(0.1, powerRatio * 0.45));
  const victory = Math.random() < baseWinChance;

  if (victory) {
    // 更新传送门状态
    data.isDefeated = true;
    await db.wildernessFacility.update({
      where: { id: portal.id },
      data: { data: JSON.stringify(data) },
    });

    // 奖励
    const rewards = {
      gold: guardianLevel * 80,
      exp: guardianLevel * 50,
      crystals: Math.floor(guardianLevel / 3) + 3,
    };

    await db.player.update({
      where: { id: player.id },
      data: {
        gold: { increment: rewards.gold },
        exp: { increment: rewards.exp },
        crystals: { increment: rewards.crystals },
      },
    });

    const targetWorld = WORLDS.find(w => w.id === data.targetWorld);

    return {
      victory: true,
      guardianName: guardian.name,
      message: `击败了${guardian.name}！传送门已开启，现在可以前往${targetWorld?.name ?? "未知世界"}了。`,
      rewards,
    };
  } else {
    return {
      victory: false,
      guardianName: guardian.name,
      message: `败给了${guardian.name}...提升实力后再来挑战吧！`,
    };
  }
}

export async function usePortal(db: FullDbClient, userId: string, portalId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const portal = await db.wildernessFacility.findFirst({
    where: { id: portalId, playerId: player.id, type: "portal" },
  });

  if (!portal) {
    throw new TRPCError({ code: "NOT_FOUND", message: "传送门不存在" });
  }

  const data = JSON.parse(portal.data) as PortalData;

  if (!data.isDefeated) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败传送门守护者" });
  }

  const targetWorld = WORLDS.find(w => w.id === data.targetWorld);
  if (!targetWorld) {
    throw new TRPCError({ code: "NOT_FOUND", message: "目标世界不存在" });
  }

  // 传送消耗体力（config-driven）
  const portalTravelConfig = await ruleService.getConfig<{ value: number }>("portal_travel_stamina_cost");
  const staminaCost = portalTravelConfig.value;
  if (player.stamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  await db.player.update({
    where: { id: player.id },
    data: {
      currentWorld: data.targetWorld,
      stamina: { decrement: staminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  return {
    success: true,
    world: targetWorld.name,
    message: `通过传送门进入了${targetWorld.name}！`,
    staminaCost,
  };
}

export async function getCurrentWorld(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const world = WORLDS.find(w => w.id === player.currentWorld);
  return world ?? WORLDS[0]!;
}

export async function getWorldEffects(db: FullDbClient, userId: string): Promise<WorldEffect> {
  const player = await getPlayerOrThrow(db, userId);
  const world = WORLDS.find(w => w.id === player.currentWorld);
  return world?.effects ?? {};
}

export async function travel(db: FullDbClient, userId: string, worldId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const world = WORLDS.find(w => w.id === worldId);
  if (!world) {
    throw new TRPCError({ code: "NOT_FOUND", message: "世界不存在" });
  }

  // 检查解锁条件
  if (world.unlockCondition.tier && player.tier < world.unlockCondition.tier) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `需要达到${world.unlockCondition.tier}阶才能进入${world.name}`,
    });
  }

  if (world.unlockCondition.level && player.level < world.unlockCondition.level) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `需要达到${world.unlockCondition.level}级才能进入${world.name}`,
    });
  }

  // 检查是否击败了传送门守护者（主位面不需要）
  if (worldId !== "main" && PORTAL_GUARDIANS[worldId]) {
    const portal = await db.wildernessFacility.findFirst({
      where: { playerId: player.id, type: "portal" },
    });
    // If a portal exists for this world, must be defeated first
    if (portal) {
      const portalData = JSON.parse(portal.data) as PortalData;
      if (portalData.targetWorld === worldId && !portalData.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败传送门守护者" });
      }
    }
  }

  // 传送消耗体力（从规则引擎获取）
  const travelStaminaConfig = await ruleService.getConfig<{ value: number }>("portal_travel_stamina_cost");
  const travelStaminaCost = travelStaminaConfig.value;
  if (player.stamina < travelStaminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // 更新玩家当前世界
  await db.player.update({
    where: { id: player.id },
    data: {
      currentWorld: worldId,
      stamina: { decrement: travelStaminaCost },
      lastStaminaUpdate: new Date(),
    },
  });

  return {
    success: true,
    world: world.name,
    message: `成功传送到${world.name}！`,
    staminaCost: travelStaminaCost,
  };
}

export async function getWorldResources(db: FullDbClient, userId: string, worldId: string) {
  const player = await getPlayerOrThrow(db, userId);

  // 获取该世界的野外设施
  const facilities = await db.wildernessFacility.findMany({
    where: {
      playerId: player.id,
      worldId,
      isDiscovered: true,
    },
  });

  return facilities.map(f => ({
    id: f.id,
    name: f.name,
    type: f.type,
    icon: f.icon,
    description: f.description,
    position: { x: f.positionX, y: f.positionY },
    remainingUses: f.remainingUses,
    data: JSON.parse(f.data) as Record<string, unknown>,
  }));
}
