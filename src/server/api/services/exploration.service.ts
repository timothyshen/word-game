/**
 * Exploration Service — exploration, events, and wilderness facility business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import * as exploRepo from "../repositories/exploration.repo";
import { upsertUnlockFlag } from "../repositories/card.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { grantRandomCards } from "../utils/card-utils";
import {
  parseAdventureOptions,
  parseRewards,
  parseMonsterConfig,
  resolveRewards,
  buildResourceUpdate,
} from "~/shared/effects";
import type { RewardEntry, AdventureOutcome } from "~/shared/effects";

// ── Private types ──

type EventType = "resource" | "monster" | "merchant" | "treasure" | "trap" | "nothing";

interface ExplorationEvent {
  type: EventType;
  title: string;
  description: string;
  options: Array<{
    text: string;
    action: string;
    cost?: Record<string, number>;
    requirement?: { stat?: string; minValue?: number };
    outcomes?: AdventureOutcome[];
  }>;
  rewards?: {
    gold?: number;
    wood?: number;
    stone?: number;
    food?: number;
    exp?: number;
    cards?: Array<{ rarity: string; count: number }>;
  };
  monster?: {
    name: string;
    level: number;
    hp: number;
    attack: number;
    defense: number;
    rewards: {
      exp: number;
      gold: number;
      cards?: Array<{ rarity: string; count: number }>;
    };
  };
}

// ── Private constants ──

const EXPLORE_STAMINA_COST = 15;
const TRIGGER_EVENT_STAMINA_COST = 10;
const FACILITY_STAMINA_COST = 5;
const FACILITY_SPAWN_CHANCE = 0.4;
const EXPLORE_BASE_SCORE = 40;
const EXPLORE_BONUS_SCORE = 30;
const VALID_FACILITY_RESOURCES = ["gold", "wood", "stone", "food"] as const;

// ── Private helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

/** Weighted random selection from outcomes array */
function selectOutcome(outcomes: AdventureOutcome[]): AdventureOutcome | null {
  if (outcomes.length === 0) return null;
  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  if (totalWeight <= 0) return outcomes[0] ?? null;
  let random = Math.random() * totalWeight;
  for (const outcome of outcomes) {
    random -= outcome.weight;
    if (random <= 0) return outcome;
  }
  return outcomes[outcomes.length - 1] ?? null;
}

function generateRandomEvent(areaLevel: number): ExplorationEvent {
  const eventTypes: EventType[] = ["resource", "resource", "monster", "monster", "treasure", "merchant", "trap", "nothing"];
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)] as EventType;

  switch (type) {
    case "resource":
      return generateResourceEvent(areaLevel);
    case "monster":
      return generateMonsterEvent(areaLevel);
    case "treasure":
      return generateTreasureEvent(areaLevel);
    case "merchant":
      return generateMerchantEvent();
    case "trap":
      return generateTrapEvent(areaLevel);
    default:
      return {
        type: "nothing",
        title: "平静的旅途",
        description: "这片区域看起来很平静，没有发现任何特别的东西。",
        options: [{ text: "继续前进", action: "continue" }],
      };
  }
}

function generateResourceEvent(level: number): ExplorationEvent {
  const resources = [
    { name: "木材堆", resource: "wood", base: 15 },
    { name: "矿石脉", resource: "stone", base: 12 },
    { name: "野果林", resource: "food", base: 20 },
    { name: "废弃宝箱", resource: "gold", base: 30 },
  ];
  const chosen = resources[Math.floor(Math.random() * resources.length)]!;
  const amount = Math.floor(chosen.base * (1 + level * 0.2));

  return {
    type: "resource",
    title: `发现${chosen.name}`,
    description: `你发现了一处${chosen.name}，看起来可以采集一些资源。`,
    options: [
      { text: `采集 (消耗5体力)`, action: "collect", cost: { stamina: 5 } },
      { text: "离开", action: "leave" },
    ],
    rewards: { [chosen.resource]: amount },
  };
}

function generateMonsterEvent(level: number): ExplorationEvent {
  const monsters = [
    { name: "野狼", baseHp: 30, baseAtk: 8, baseDef: 3 },
    { name: "山贼", baseHp: 50, baseAtk: 12, baseDef: 5 },
    { name: "哥布林", baseHp: 25, baseAtk: 10, baseDef: 2 },
    { name: "骷髅兵", baseHp: 40, baseAtk: 15, baseDef: 8 },
  ];
  const chosen = monsters[Math.floor(Math.random() * monsters.length)]!;
  const monsterLevel = Math.max(1, level + Math.floor(Math.random() * 3) - 1);

  return {
    type: "monster",
    title: `遭遇${chosen.name}`,
    description: `一只${chosen.name}挡住了你的去路！它看起来很有攻击性。`,
    options: [
      { text: "战斗 (消耗15体力)", action: "fight", cost: { stamina: 15 } },
      { text: "尝试逃跑", action: "flee" },
      { text: "使用烟雾弹逃跑", action: "smoke_escape" },
    ],
    monster: {
      name: chosen.name,
      level: monsterLevel,
      hp: Math.floor(chosen.baseHp * (1 + monsterLevel * 0.3)),
      attack: Math.floor(chosen.baseAtk * (1 + monsterLevel * 0.2)),
      defense: Math.floor(chosen.baseDef * (1 + monsterLevel * 0.15)),
      rewards: {
        exp: 20 * monsterLevel,
        gold: 10 * monsterLevel,
        cards: Math.random() < (0.1 + monsterLevel * 0.05)
          ? [{ rarity: "精良", count: 1 }]
          : undefined,
      },
    },
  };
}

function generateTreasureEvent(level: number): ExplorationEvent {
  return {
    type: "treasure",
    title: "神秘宝箱",
    description: "你发现了一个古老的宝箱，上面刻满了奇怪的符文。",
    options: [
      { text: "打开宝箱 (消耗10体力)", action: "open", cost: { stamina: 10 } },
      { text: "谨慎离开", action: "leave" },
    ],
    rewards: {
      gold: 50 + level * 20,
      cards: [{ rarity: level >= 3 ? "稀有" : "精良", count: 1 }],
    },
  };
}

function generateMerchantEvent(): ExplorationEvent {
  return {
    type: "merchant",
    title: "流浪商人",
    description: "一个神秘的商人正在路边休息，他似乎有一些有趣的商品。",
    options: [
      { text: "查看商品", action: "trade" },
      { text: "继续赶路", action: "leave" },
    ],
  };
}

function generateTrapEvent(level: number): ExplorationEvent {
  const damage = 10 + level * 5;
  return {
    type: "trap",
    title: "陷阱！",
    description: "你不小心触发了一个隐藏的陷阱！",
    options: [
      { text: `承受伤害 (${damage}点)`, action: "take_damage" },
      { text: "尝试闪避 (需要敏捷>15)", action: "dodge", requirement: { stat: "agility", minValue: 15 } },
    ],
  };
}

function computeAreaLevel(positionX: number, positionY: number): number {
  const distance = Math.sqrt(positionX ** 2 + positionY ** 2);
  return Math.max(1, Math.floor(distance / 2));
}

function generateAreaName(): string {
  const areaNames = ["平原", "森林", "山丘", "沼泽", "荒地", "遗迹"];
  return `${areaNames[Math.floor(Math.random() * areaNames.length)]}区域`;
}

// ── Exported service functions ──

export async function getExploredAreas(
  db: FullDbClient,
  userId: string,
  input: { worldId: string },
) {
  const player = await getPlayerOrThrow(db, userId);

  const areas = await exploRepo.findExploredAreas(db, player.id, input.worldId);

  return areas;
}

export async function getWildernessFacilities(
  db: FullDbClient,
  userId: string,
  input: { worldId: string },
) {
  const player = await getPlayerOrThrow(db, userId);

  const facilities = await exploRepo.findActiveFacilities(db, player.id, input.worldId);

  return facilities.map(f => ({
    ...f,
    data: JSON.parse(f.data) as Record<string, unknown>,
  }));
}

export async function exploreArea(
  db: FullDbClient,
  userId: string,
  input: { worldId: string; positionX: number; positionY: number },
) {
  const player = await getPlayerOrThrow(db, userId);

  // Check stamina
  if (player.stamina < EXPLORE_STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // Check if already explored
  const existing = await exploRepo.findExploredArea(db, player.id, input.worldId, input.positionX, input.positionY);

  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该区域已探索过" });
  }

  // Deduct stamina
  await updatePlayer(db, player.id, {
    stamina: { decrement: EXPLORE_STAMINA_COST },
    lastStaminaUpdate: new Date(),
  });

  // Compute area level based on distance
  const areaLevel = computeAreaLevel(input.positionX, input.positionY);

  // Generate area name
  const areaName = generateAreaName();

  // Create exploration record
  await exploRepo.createExploredArea(db, {
    playerId: player.id,
    worldId: input.worldId,
    positionX: input.positionX,
    positionY: input.positionY,
    name: areaName,
  });

  // Randomly spawn wilderness facility
  let newFacility = null;

  if (Math.random() < FACILITY_SPAWN_CHANCE) {
    newFacility = await spawnFacility(db, player.id, input.worldId, input.positionX, input.positionY, areaLevel);
  }

  // Record action score
  await createActionLog(db, {
    playerId: player.id,
    day: getCurrentGameDay(),
    type: "explore",
    description: `探索了${areaName}`,
    baseScore: EXPLORE_BASE_SCORE,
    bonus: EXPLORE_BONUS_SCORE,
    bonusReason: "发现新区域",
  });

  await updatePlayer(db, player.id, {
    currentDayScore: { increment: EXPLORE_BASE_SCORE + EXPLORE_BONUS_SCORE },
  });

  return {
    explored: true,
    areaName,
    position: { x: input.positionX, y: input.positionY },
    staminaCost: EXPLORE_STAMINA_COST,
    facilityFound: newFacility ? {
      name: newFacility.name,
      type: newFacility.type,
      icon: newFacility.icon,
    } : null,
  };
}

export async function triggerEvent(
  db: FullDbClient,
  userId: string,
  input: { worldId: string; positionX: number; positionY: number },
) {
  const player = await getPlayerOrThrow(db, userId);

  // Check area is explored
  const area = await exploRepo.findExploredArea(db, player.id, input.worldId, input.positionX, input.positionY);

  if (!area) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "请先探索该区域" });
  }

  // Check stamina
  if (player.stamina < TRIGGER_EVENT_STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // Deduct stamina
  await updatePlayer(db, player.id, {
    stamina: { decrement: TRIGGER_EVENT_STAMINA_COST },
    lastStaminaUpdate: new Date(),
  });

  // Compute area level
  const areaLevel = computeAreaLevel(input.positionX, input.positionY);

  // Try to get adventure events from database
  const dbAdventures = await exploRepo.findActiveAdventures(db, areaLevel, input.worldId);

  let event: ExplorationEvent;

  // If database has adventures, randomly select by weight
  if (dbAdventures.length > 0) {
    event = buildEventFromDbAdventure(dbAdventures);
  } else {
    // No database adventures, use generated event
    event = generateRandomEvent(areaLevel);
  }

  // Store event server-side so handleEventChoice can't be exploited
  await exploRepo.setExploredAreaPendingEvent(
    db, player.id, input.worldId, input.positionX, input.positionY,
    JSON.stringify(event),
  );

  return {
    event,
    staminaCost: TRIGGER_EVENT_STAMINA_COST,
    areaName: area.name,
  };
}

export async function handleEventChoice(
  db: FullDbClient,
  userId: string,
  input: {
    eventType: string;
    action: string;
    eventData?: string;
    worldId: string;
    positionX?: number;
    positionY?: number;
  },
) {
  const player = await getPlayerOrThrow(db, userId);

  const result: {
    success: boolean;
    message: string;
    rewards?: Record<string, unknown>;
    damage?: number;
    fled?: boolean;
    combat?: {
      victory: boolean;
      playerDamage: number;
      monsterDefeated: boolean;
      rewards: { exp: number; gold: number; cardDrop: boolean };
    };
  } = { success: true, message: "" };

  // Load event from server-side storage instead of trusting client data
  let eventData: ExplorationEvent | null = null;
  if (input.positionX !== undefined && input.positionY !== undefined) {
    const area = await exploRepo.findExploredArea(db, player.id, input.worldId, input.positionX, input.positionY);
    if (area?.pendingEvent) {
      eventData = JSON.parse(area.pendingEvent) as ExplorationEvent;
      // Clear the pending event after use
      await exploRepo.updateExploredAreaEvent(db, area.id, null);
    }
  }
  // Legacy fallback: parse client-sent eventData if no server-side event found
  if (!eventData && input.eventData) {
    eventData = JSON.parse(input.eventData) as ExplorationEvent;
  }

  const playerId = player.id;

  /** Grant RewardEntry[] rewards (from typed outcomes) */
  async function grantOutcomeRewards(rewards: RewardEntry[]) {
    const resolved = resolveRewards(rewards);
    const resourceUpdate = buildResourceUpdate(
      resolved.resourcesGranted,
      player as unknown as Record<string, number>,
    );
    if (Object.keys(resourceUpdate).length > 0) {
      await updatePlayer(db, playerId, resourceUpdate);
    }
    // Grant cards
    for (const cardReward of resolved.cardsGranted) {
      await grantRandomCards(db, playerId, cardReward.rarity, cardReward.count);
    }
    return resolved;
  }

  /** Grant resource rewards + card rewards to player */
  async function grantEventRewards(eventRewards: NonNullable<ExplorationEvent["rewards"]>) {
    const resourceUpdate = buildResourceUpdate(
      {
        gold: eventRewards.gold ?? 0,
        wood: eventRewards.wood ?? 0,
        stone: eventRewards.stone ?? 0,
        food: eventRewards.food ?? 0,
        exp: eventRewards.exp ?? 0,
      },
      player as unknown as Record<string, number>,
    );
    if (Object.keys(resourceUpdate).length > 0) {
      await updatePlayer(db, playerId, resourceUpdate);
    }

    if (eventRewards.cards && eventRewards.cards.length > 0) {
      for (const cardReward of eventRewards.cards) {
        await grantRandomCards(db, playerId, cardReward.rarity, cardReward.count);
      }
    }
  }

  // Check for typed outcomes and use them if available
  if (eventData?.options) {
    const selectedOption = eventData.options.find(o => o.action === input.action);
    if (selectedOption?.outcomes && selectedOption.outcomes.length > 0) {
      const outcome = selectOutcome(selectedOption.outcomes);
      if (outcome) {
        result.message = outcome.description;

        if (outcome.rewards && outcome.rewards.length > 0) {
          const resolved = await grantOutcomeRewards(outcome.rewards);
          result.rewards = { ...resolved.resourcesGranted };
        }

        if (outcome.damage && outcome.damage > 0) {
          result.damage = outcome.damage;
        }

        if (outcome.combat) {
          const playerPower = player.strength * 2 + player.agility;
          const monsterPower = outcome.combat.attack + outcome.combat.defense;
          const victory = playerPower > monsterPower * 0.8;

          if (victory) {
            const monsterResolved = resolveRewards(outcome.combat.rewards);
            const combatUpdate = buildResourceUpdate(
              monsterResolved.resourcesGranted,
              player as unknown as Record<string, number>,
            );
            if (Object.keys(combatUpdate).length > 0) {
              await updatePlayer(db, playerId, combatUpdate);
            }
            result.combat = {
              victory: true,
              playerDamage: Math.floor(outcome.combat.attack * 0.5),
              monsterDefeated: true,
              rewards: {
                exp: monsterResolved.resourcesGranted.exp ?? 0,
                gold: monsterResolved.resourcesGranted.gold ?? 0,
                cardDrop: monsterResolved.cardsGranted.length > 0,
              },
            };
          } else {
            result.combat = {
              victory: false,
              playerDamage: outcome.combat.attack,
              monsterDefeated: false,
              rewards: { exp: 0, gold: 0, cardDrop: false },
            };
          }
        }

        return result;
      }
    }
  }

  // Legacy fallback: hardcoded action handlers
  switch (input.action) {
    case "collect":
      if (eventData?.rewards) {
        await grantEventRewards(eventData.rewards);
        result.rewards = eventData.rewards;
        result.message = "成功采集了资源！";
      }
      break;

    case "fight":
      if (eventData?.monster) {
        const playerPower = player.strength * 2 + player.agility;
        const monsterPower = eventData.monster.attack + eventData.monster.defense;
        const victory = playerPower > monsterPower * 0.8;

        if (victory) {
          const rewards = eventData.monster.rewards;
          const combatResourceUpdate = buildResourceUpdate(
            { gold: rewards.gold, exp: rewards.exp },
            player as unknown as Record<string, number>,
          );
          if (Object.keys(combatResourceUpdate).length > 0) {
            await updatePlayer(db, player.id, combatResourceUpdate);
          }

          await createActionLog(db, {
            playerId: player.id,
            day: getCurrentGameDay(),
            type: "combat",
            description: `击败了${eventData.monster.name}`,
            baseScore: 20 * eventData.monster.level,
            bonus: 0,
            bonusReason: null,
          });

          let cardDrop = false;
          if (rewards.cards && rewards.cards.length > 0) {
            for (const cardReward of rewards.cards) {
              const granted = await grantRandomCards(db, player.id, cardReward.rarity, cardReward.count);
              if (granted.length > 0) cardDrop = true;
            }
          }

          result.combat = {
            victory: true,
            playerDamage: Math.floor(eventData.monster.attack * 0.5),
            monsterDefeated: true,
            rewards: {
              exp: rewards.exp,
              gold: rewards.gold,
              cardDrop,
            },
          };
          result.message = `战斗胜利！击败了${eventData.monster.name}`;
        } else {
          result.combat = {
            victory: false,
            playerDamage: eventData.monster.attack,
            monsterDefeated: false,
            rewards: { exp: 0, gold: 0, cardDrop: false },
          };
          result.message = "战斗失败，仓皇逃跑...";
        }
      }
      break;

    case "flee":
      result.fled = Math.random() > 0.5;
      result.message = result.fled ? "成功逃跑！" : "逃跑失败，受到了一些伤害";
      if (!result.fled) {
        result.damage = 15;
      }
      break;

    case "open":
      if (eventData?.rewards) {
        await grantEventRewards(eventData.rewards);
        result.rewards = eventData.rewards;
        result.message = "打开了宝箱，获得了宝贵的奖励！";
      }
      break;

    case "leave":
    case "continue":
      result.message = "你选择继续前进。";
      break;

    default:
      result.message = "未知的选择";
  }

  return result;
}

export async function useFacility(
  db: FullDbClient,
  userId: string,
  input: { facilityId: string },
) {
  const player = await getPlayerOrThrow(db, userId);

  const facility = await exploRepo.findFacilityById(db, input.facilityId, player.id);

  if (!facility) {
    throw new TRPCError({ code: "NOT_FOUND", message: "设施不存在" });
  }

  if (facility.remainingUses !== null && facility.remainingUses <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "设施已耗尽" });
  }

  if (player.stamina < FACILITY_STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // Deduct stamina
  await updatePlayer(db, player.id, {
    stamina: { decrement: FACILITY_STAMINA_COST },
    lastStaminaUpdate: new Date(),
  });

  const facilityData = JSON.parse(facility.data) as Record<string, unknown>;
  let result: Record<string, unknown> = {};

  if (facility.type === "resource") {
    const resourceType = facilityData.resourceType as string;
    const amount = facilityData.amount as number;

    if (!VALID_FACILITY_RESOURCES.includes(resourceType as typeof VALID_FACILITY_RESOURCES[number])) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "无效的资源类型" });
    }

    await updatePlayer(db, player.id, { [resourceType]: { increment: amount } });

    result = { collected: true, resourceType, amount };
  }

  // Decrement remaining uses
  if (facility.remainingUses !== null) {
    const newUses = facility.remainingUses - 1;
    if (newUses <= 0) {
      await exploRepo.deleteFacility(db, facility.id);
    } else {
      await exploRepo.updateFacilityUses(db, facility.id, newUses);
    }
    result.remainingUses = newUses;
  }

  return result;
}

// ── Private facility spawning helpers ──

async function spawnFacility(
  db: FullDbClient,
  playerId: string,
  worldId: string,
  positionX: number,
  positionY: number,
  areaLevel: number,
) {
  // Determine facility type based on area level and distance
  let facilityTypes = ["resource", "resource", "monster", "merchant"];

  if (areaLevel >= 2 && Math.random() < 0.15) {
    facilityTypes = ["altar"];
  } else if (areaLevel >= 3 && Math.random() < 0.1) {
    facilityTypes = ["portal"];
  }

  const facilityType = facilityTypes[Math.floor(Math.random() * facilityTypes.length)]!;

  const facilityData: Record<string, unknown> = {
    level: areaLevel,
  };

  let facilityName = "";
  let facilityIcon = "";
  let facilityDescription = "";

  if (facilityType === "resource") {
    const resources = ["采矿点", "伐木点", "采集点"];
    facilityName = resources[Math.floor(Math.random() * resources.length)]!;
    facilityIcon = facilityName === "采矿点" ? "⛏️" : facilityName === "伐木点" ? "🪓" : "🌿";
    facilityData.resourceType = facilityName === "采矿点" ? "stone" : facilityName === "伐木点" ? "wood" : "food";
    facilityData.amount = 10 + areaLevel * 5;
    facilityDescription = `等级${areaLevel}的${facilityName}`;
  } else if (facilityType === "monster") {
    facilityName = "怪物巢穴";
    facilityIcon = "💀";
    facilityData.monsterLevel = areaLevel;
    facilityDescription = `等级${areaLevel}的${facilityName}`;
  } else if (facilityType === "merchant") {
    facilityName = "商人营地";
    facilityIcon = "🏕️";
    facilityDescription = "流浪商人的营地";
  } else if (facilityType === "altar") {
    if (areaLevel >= 5) {
      facilityName = "远古祭坛";
      facilityIcon = "🏛️";
      facilityData.altarType = "ancient_altar";
      facilityDescription = "远古文明遗留的神秘祭坛，有强大的守护者";
    } else if (areaLevel >= 3) {
      facilityName = "神圣祭坛";
      facilityIcon = "⛩️";
      facilityData.altarType = "sacred_altar";
      facilityDescription = "蕴含神圣力量的祭坛，有守护者守卫";
    } else {
      facilityName = "普通祭坛";
      facilityIcon = "🗿";
      facilityData.altarType = "basic_altar";
      facilityDescription = "散发微弱光芒的古老祭坛，有守卫看守";
    }
    facilityData.isDefeated = false;
  } else if (facilityType === "portal") {
    const portalWorlds = [
      { id: "fire_realm", name: "火焰位面", icon: "🔥" },
      { id: "ice_realm", name: "寒冰位面", icon: "❄️" },
      { id: "shadow_realm", name: "暗影位面", icon: "🌑" },
    ];
    const targetWorld = portalWorlds[Math.floor(Math.random() * portalWorlds.length)]!;
    facilityName = `${targetWorld.name}传送门`;
    facilityIcon = "🌀";
    facilityData.targetWorld = targetWorld.id;
    facilityData.isDefeated = false;
    facilityData.guardianLevel = areaLevel * 2;
    facilityDescription = `通往${targetWorld.name}的神秘传送门，有强大守护者守卫`;
  }

  const newFacility = await exploRepo.createFacility(db, {
    playerId,
    worldId,
    type: facilityType,
    name: facilityName,
    icon: facilityIcon,
    description: facilityDescription,
    positionX,
    positionY,
    data: JSON.stringify(facilityData),
    remainingUses: facilityType === "resource" ? 3 : null,
    isDiscovered: true,
  });

  // Unlock system based on facility type discovered
  let unlockFlagName: string | null = null;
  if (facilityType === "altar") {
    unlockFlagName = "altar_system";
  } else if (facilityType === "portal") {
    unlockFlagName = "portal_system";
  } else if (facilityType === "merchant") {
    unlockFlagName = "shop_system";
  }

  if (unlockFlagName) {
    await upsertUnlockFlag(db, playerId, unlockFlagName);
  }

  return newFacility;
}

// ── Private DB adventure conversion ──

function buildEventFromDbAdventure(
  dbAdventures: Array<{
    type: string;
    title: string;
    description: string;
    optionsJson: string;
    rewardsJson: string | null;
    monsterJson: string | null;
    weight: number;
  }>,
): ExplorationEvent {
  const totalWeight = dbAdventures.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedAdventure = dbAdventures[0]!;

  for (const adventure of dbAdventures) {
    random -= adventure.weight;
    if (random <= 0) {
      selectedAdventure = adventure;
      break;
    }
  }

  // Convert DB adventure to event format (typed parsers + legacy fallback)
  const typedOptions = parseAdventureOptions(selectedAdventure.optionsJson);
  const options = typedOptions.length > 0
    ? typedOptions.map(o => ({
        text: o.text,
        action: o.action,
        cost: o.cost && o.cost.length > 0
          ? Object.fromEntries(o.cost.map(c => [c.stat, c.amount]))
          : undefined,
        requirement: o.conditions?.[0]?.type === "stat"
          ? { stat: (o.conditions[0] as { stat: string }).stat, minValue: (o.conditions[0] as { min: number }).min }
          : undefined,
        outcomes: o.outcomes,
      }))
    : (JSON.parse(selectedAdventure.optionsJson) as Array<{
        text: string;
        action: string;
        cost?: Record<string, number>;
        requirement?: { stat?: string; minValue?: number };
      }>);

  let rewards: Record<string, number> | undefined;
  if (selectedAdventure.rewardsJson) {
    const typedRewards = parseRewards(selectedAdventure.rewardsJson);
    if (typedRewards.length > 0) {
      const grant = resolveRewards(typedRewards);
      rewards = grant.resourcesGranted;
    } else {
      rewards = JSON.parse(selectedAdventure.rewardsJson) as Record<string, number>;
    }
  }

  let monster: ExplorationEvent["monster"];
  if (selectedAdventure.monsterJson) {
    const typedMonster = parseMonsterConfig(selectedAdventure.monsterJson);
    if (typedMonster) {
      const monsterRewards = resolveRewards(typedMonster.rewards);
      monster = {
        name: typedMonster.name,
        level: typedMonster.level,
        hp: typedMonster.hp,
        attack: typedMonster.attack,
        defense: typedMonster.defense,
        rewards: {
          exp: monsterRewards.resourcesGranted.exp ?? 0,
          gold: monsterRewards.resourcesGranted.gold ?? 0,
          cards: monsterRewards.cardsGranted.length > 0 ? monsterRewards.cardsGranted : undefined,
        },
      };
    } else {
      monster = JSON.parse(selectedAdventure.monsterJson) as ExplorationEvent["monster"];
    }
  }

  return {
    type: selectedAdventure.type as EventType,
    title: selectedAdventure.title,
    description: selectedAdventure.description,
    options,
    rewards,
    monster,
  };
}
