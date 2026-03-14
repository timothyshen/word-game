/**
 * Exploration Service — exploration, events, and wilderness facility business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import * as exploRepo from "../repositories/exploration.repo";
import { upsertUnlockFlag } from "../repositories/card.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { engine, ruleService } from "~/server/api/engine";
import { grantRandomCards } from "../utils/card-utils";
import { addMaterial } from "../repositories/crafting.repo";
import { pickRarityPool, rollFromPool, type MaterialDropConfig } from "../utils/crafting-utils";
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

const TILE_REFRESH_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const FACILITY_STAMINA_COST = 5;
const EXPLORE_BONUS_SCORE = 30;
const VALID_FACILITY_RESOURCES = ["gold", "wood", "stone", "food"] as const;

async function getExplorationConfig() {
  const [staminaCost, eventStaminaCost, facilitySpawnChance, baseScore] = await Promise.all([
    ruleService.getConfig<{ value: number }>("explore_stamina_cost"),
    ruleService.getConfig<{ value: number }>("explore_event_stamina_cost"),
    ruleService.getConfig<{ value: number }>("explore_facility_spawn_chance"),
    ruleService.getConfig<{ value: number }>("explore_base_score"),
  ]);
  return {
    EXPLORE_STAMINA_COST: staminaCost.value,
    TRIGGER_EVENT_STAMINA_COST: eventStaminaCost.value,
    FACILITY_SPAWN_CHANCE: facilitySpawnChance.value,
    EXPLORE_BASE_SCORE: baseScore.value,
  };
}

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

// ── Hand-crafted landmarks ──

interface Landmark {
  x: number;
  y: number;
  name: string;
  flagName: string;
  event: ExplorationEvent;
  facilityOverride?: {
    type: string;
    name: string;
    icon: string;
    description: string;
  };
}

const LANDMARKS: Landmark[] = [
  {
    x: 5, y: 0,
    name: "废弃城堡",
    flagName: "landmark_ruined_castle",
    event: {
      type: "treasure",
      title: "废弃城堡",
      description: "一座古老的城堡矗立在荒野之中，城墙已经破败不堪，但内部似乎隐藏着珍贵的宝藏。",
      options: [
        { text: "探索城堡内部 (消耗20体力)", action: "open", cost: { stamina: 20 } },
        { text: "远远观望后离开", action: "leave" },
      ],
      rewards: {
        gold: 200,
        exp: 100,
        cards: [{ rarity: "稀有", count: 1 }, { rarity: "精良", count: 2 }],
      },
    },
  },
  {
    x: 0, y: 5,
    name: "龙之巢穴",
    flagName: "landmark_dragon_den",
    event: {
      type: "monster",
      title: "龙之巢穴",
      description: "一个散发着炙热气息的巨大洞穴，里面传来低沉的咆哮声。一只年幼的巨龙正在此处守卫巢穴！",
      options: [
        { text: "挑战巨龙 (消耗30体力)", action: "fight", cost: { stamina: 30 } },
        { text: "悄悄离开", action: "leave" },
      ],
      monster: {
        name: "幼龙",
        level: 8,
        hp: 300,
        attack: 45,
        defense: 25,
        rewards: {
          exp: 200,
          gold: 300,
          cards: [{ rarity: "史诗", count: 1 }],
        },
      },
    },
  },
  {
    x: -5, y: -5,
    name: "遗忘图书馆",
    flagName: "landmark_forgotten_library",
    event: {
      type: "treasure",
      title: "遗忘图书馆",
      description: "一座被藤蔓覆盖的图书馆，里面的书籍虽然古老但保存完好。你感受到了蕴含其中的知识力量。",
      options: [
        { text: "研读古籍 (消耗15体力)", action: "open", cost: { stamina: 15 } },
        { text: "离开", action: "leave" },
      ],
      rewards: {
        exp: 300,
        cards: [{ rarity: "稀有", count: 1 }],
      },
    },
  },
  {
    x: 3, y: -3,
    name: "古代祭坛",
    flagName: "landmark_ancient_altar",
    event: {
      type: "treasure",
      title: "古代祭坛",
      description: "一座散发着古老力量的祭坛，祭坛上的符文仍然闪烁着微光。",
      options: [
        { text: "祈祷 (消耗10体力)", action: "open", cost: { stamina: 10 } },
        { text: "离开", action: "leave" },
      ],
      rewards: {
        gold: 100,
        exp: 50,
      },
    },
    facilityOverride: {
      type: "altar",
      name: "远古祭坛",
      icon: "🏛️",
      description: "远古文明遗留的神秘祭坛，散发着强大的力量",
    },
  },
  {
    x: -3, y: 3,
    name: "商人营地",
    flagName: "landmark_merchant_camp",
    event: {
      type: "merchant",
      title: "商人营地",
      description: "一个繁忙的商人营地，各种珍稀商品琳琅满目。营地主人热情地邀请你看看他的货物。",
      options: [
        { text: "查看商品", action: "trade" },
        { text: "继续赶路", action: "leave" },
      ],
    },
    facilityOverride: {
      type: "merchant",
      name: "商人营地",
      icon: "🏕️",
      description: "繁忙的商人营地，货物种类齐全",
    },
  },
];

/** Check if coordinates match a known landmark */
function findLandmark(x: number, y: number): Landmark | null {
  return LANDMARKS.find(l => l.x === x && l.y === y) ?? null;
}

/** Check if a landmark has already been completed by the player */
async function isLandmarkCompleted(db: FullDbClient, playerId: string, flagName: string): Promise<boolean> {
  const flag = await db.unlockFlag.findUnique({
    where: { playerId_flagName: { playerId, flagName } },
  });
  return !!flag;
}

// ── World-specific material drops ──

const WORLD_MATERIAL_DROPS: Record<string, { name: string; description: string }> = {
  fire_realm: { name: "火焰矿石", description: "蕴含火焰之力的矿石" },
  ice_realm: { name: "寒冰水晶", description: "永冻的冰之结晶" },
  shadow_realm: { name: "暗影精华", description: "凝聚暗影之力的精华" },
  celestial_realm: { name: "天界碎片", description: "天界掉落的圣光碎片" },
};

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
  const config = await getExplorationConfig();

  // Check stamina
  if (player.stamina < config.EXPLORE_STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // Check if already explored (with 3-day cooldown for re-exploration)
  const existing = await exploRepo.findExploredArea(db, player.id, input.worldId, input.positionX, input.positionY);
  let isReexploration = false;

  if (existing) {
    const timeSinceExplored = Date.now() - existing.discoveredAt.getTime();
    if (timeSinceExplored < TILE_REFRESH_COOLDOWN_MS) {
      const hoursRemaining = Math.ceil((TILE_REFRESH_COOLDOWN_MS - timeSinceExplored) / (1000 * 60 * 60));
      throw new TRPCError({ code: "BAD_REQUEST", message: `该区域已探索过，${hoursRemaining}小时后可重新探索` });
    }
    isReexploration = true;
  }

  // Deduct stamina
  await updatePlayer(db, player.id, {
    stamina: { decrement: config.EXPLORE_STAMINA_COST },
    lastStaminaUpdate: new Date(),
  });

  // Compute area level based on distance
  const areaLevel = computeAreaLevel(input.positionX, input.positionY);

  // Check for hand-crafted landmark, preserve name on re-exploration
  const landmark = findLandmark(input.positionX, input.positionY);
  const areaName = isReexploration ? existing!.name : (landmark ? landmark.name : generateAreaName());

  if (isReexploration) {
    // Reset the timestamp for re-exploration cooldown
    await exploRepo.resetExploredAreaTimestamp(db, existing!.id);
  } else {
    // Create exploration record
    await exploRepo.createExploredArea(db, {
      playerId: player.id,
      worldId: input.worldId,
      positionX: input.positionX,
      positionY: input.positionY,
      name: areaName,
    });
  }

  // Landmark facility override or random spawn
  let newFacility = null;

  if (landmark?.facilityOverride) {
    newFacility = await exploRepo.createFacility(db, {
      playerId: player.id,
      worldId: input.worldId,
      type: landmark.facilityOverride.type,
      name: landmark.facilityOverride.name,
      icon: landmark.facilityOverride.icon,
      description: landmark.facilityOverride.description,
      positionX: input.positionX,
      positionY: input.positionY,
      data: JSON.stringify({ level: areaLevel }),
      remainingUses: null,
      isDiscovered: true,
    });
  } else if (Math.random() < config.FACILITY_SPAWN_CHANCE) {
    newFacility = await spawnFacility(db, player.id, input.worldId, input.positionX, input.positionY, areaLevel);
  }

  // Record action score
  await createActionLog(db, {
    playerId: player.id,
    day: getCurrentGameDay(),
    type: "explore",
    description: `探索了${areaName}`,
    baseScore: config.EXPLORE_BASE_SCORE,
    bonus: EXPLORE_BONUS_SCORE,
    bonusReason: "发现新区域",
  });

  await updatePlayer(db, player.id, {
    currentDayScore: { increment: config.EXPLORE_BASE_SCORE + EXPLORE_BONUS_SCORE },
  });

  return {
    explored: true,
    areaName,
    position: { x: input.positionX, y: input.positionY },
    staminaCost: config.EXPLORE_STAMINA_COST,
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

  const config = await getExplorationConfig();

  // Check area is explored
  const area = await exploRepo.findExploredArea(db, player.id, input.worldId, input.positionX, input.positionY);

  if (!area) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "请先探索该区域" });
  }

  // Check stamina
  if (player.stamina < config.TRIGGER_EVENT_STAMINA_COST) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  // Deduct stamina
  await updatePlayer(db, player.id, {
    stamina: { decrement: config.TRIGGER_EVENT_STAMINA_COST },
    lastStaminaUpdate: new Date(),
  });

  // Compute area level
  const areaLevel = computeAreaLevel(input.positionX, input.positionY);

  let event: ExplorationEvent;

  // Check for hand-crafted landmark event (one-time only)
  const landmark = findLandmark(input.positionX, input.positionY);
  if (landmark && !(await isLandmarkCompleted(db, player.id, landmark.flagName))) {
    event = landmark.event;
    // Mark landmark as completed
    await upsertUnlockFlag(db, player.id, landmark.flagName);
  } else {
    // Try to get adventure events from database
    const dbAdventures = await exploRepo.findActiveAdventures(db, areaLevel, input.worldId);

    // If database has adventures, randomly select by weight
    if (dbAdventures.length > 0) {
      event = buildEventFromDbAdventure(dbAdventures);
    } else {
      // No database adventures, use generated event
      event = generateRandomEvent(areaLevel);
    }
  }

  // Store event server-side so handleEventChoice can't be exploited
  await exploRepo.setExploredAreaPendingEvent(
    db, player.id, input.worldId, input.positionX, input.positionY,
    JSON.stringify(event),
  );

  return {
    event,
    staminaCost: config.TRIGGER_EVENT_STAMINA_COST,
    areaName: area.name,
  };
}

export async function handleEventChoice(
  db: FullDbClient,
  entities: IEntityManager,
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
  // No legacy fallback — client-supplied eventData is not trusted
  if (!eventData) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "事件数据不存在，请重新探索" });
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
      await grantRandomCards(db, entities, playerId, cardReward.rarity, cardReward.count);
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
        await grantRandomCards(db, entities, playerId, cardReward.rarity, cardReward.count);
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
        // Simplified turn-based combat simulation (up to 5 rounds)
        const playerAtk = player.strength * 1.5 + player.agility * 0.5 + player.intellect * 0.3;
        const playerDef = player.strength * 0.5 + player.agility * 0.8;
        let playerHp = 100 + player.level * 5 + player.strength * 3;

        const monsterAtk = eventData.monster.attack;
        const monsterDef = eventData.monster.defense;
        let monsterHp = (eventData.monster.hp as number | undefined) ?? (monsterAtk * 3 + monsterDef * 2);

        const MAX_ROUNDS = 5;
        for (let round = 0; round < MAX_ROUNDS && playerHp > 0 && monsterHp > 0; round++) {
          // Player attacks monster
          const playerVariance = 0.8 + Math.random() * 0.4; // ±20%
          const playerDmg = Math.max(1, playerAtk - monsterDef * 0.5) * playerVariance;
          monsterHp -= playerDmg;

          if (monsterHp <= 0) break;

          // Monster attacks player
          const monsterVariance = 0.8 + Math.random() * 0.4; // ±20%
          const monsterDmg = Math.max(1, monsterAtk - playerDef * 0.5) * monsterVariance;
          playerHp -= monsterDmg;
        }

        const victory = monsterHp <= 0;

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
              const granted = await grantRandomCards(db, entities, player.id, cardReward.rarity, cardReward.count);
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

    case "trade": {
      // Merchant interaction: spend gold for random rewards
      const tradeGoldCost = 50 + Math.floor(player.level * 10);
      if (player.gold < tradeGoldCost) {
        result.message = `商人要价 ${tradeGoldCost} 金币，但你的金币不足。`;
      } else {
        await updatePlayer(db, player.id, { gold: { decrement: tradeGoldCost } });
        // Merchant offers: random potion (HP/stamina restore) or crystal
        const roll = Math.random();
        if (roll < 0.4) {
          // Stamina potion — restore 20 stamina
          await updatePlayer(db, player.id, { stamina: { increment: 20 } });
          result.message = `花费 ${tradeGoldCost} 金币购买了精力药水，恢复了20点体力！`;
          result.rewards = { gold: -tradeGoldCost };
        } else if (roll < 0.7) {
          // Crystals
          const crystalAmount = 3 + Math.floor(player.level / 5);
          await updatePlayer(db, player.id, { crystals: { increment: crystalAmount } });
          result.message = `花费 ${tradeGoldCost} 金币购买了 ${crystalAmount} 颗水晶！`;
          result.rewards = { gold: -tradeGoldCost, crystals: crystalAmount };
        } else {
          // EXP scroll
          const expAmount = 50 + player.level * 15;
          await updatePlayer(db, player.id, { exp: { increment: expAmount } });
          result.message = `花费 ${tradeGoldCost} 金币购买了经验卷轴，获得 ${expAmount} 经验！`;
          result.rewards = { gold: -tradeGoldCost, exp: expAmount };
        }
      }
      break;
    }

    case "leave":
    case "continue":
      result.message = "你选择继续前进。";
      break;

    default:
      result.message = "未知的选择";
  }

  // Material drop from exploration events (with world-specific drops)
  if (result.rewards ?? result.combat?.victory) {
    try {
      const materialDropConfig = await ruleService.getConfig<MaterialDropConfig>("crafting_material_drop");
      const explorationDropConfig = materialDropConfig.exploration;
      const areaLevel = (input.positionX !== undefined && input.positionY !== undefined)
        ? computeAreaLevel(input.positionX, input.positionY)
        : 1;
      if (Math.random() < explorationDropConfig.baseChance) {
        const rarityPool = pickRarityPool(explorationDropConfig.rarityByLevel, areaLevel);
        const rarity = rollFromPool(rarityPool);

        const game = await db.game.findFirst({ where: { name: "诸天领域" } });
        if (game) {
          const materialSchema = await entities.getSchema(game.id, "material");
          if (materialSchema) {
            const schemaId = (materialSchema as { id: string }).id;
            const templates = await entities.getTemplatesBySchema(schemaId);
            let matchingTemplates = (templates as Array<{ id: string; name: string; rarity: string | null }>)
              .filter(t => t.rarity === rarity);

            // World-specific material drops: in non-main worlds, prefer world-specific materials
            const worldMaterial = WORLD_MATERIAL_DROPS[input.worldId];
            if (worldMaterial && Math.random() < 0.6) {
              // 60% chance to drop world-specific material instead
              const worldTemplates = matchingTemplates.filter(t => t.name.includes(worldMaterial.name));
              if (worldTemplates.length > 0) {
                matchingTemplates = worldTemplates;
              }
            }

            if (matchingTemplates.length > 0) {
              const template = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]!;
              const dropCount = 1;
              await addMaterial(db, entities, playerId, template.id, dropCount);
              await engine.events.emit("crafting:materialDrop", {
                userId, materialId: template.id, count: dropCount, source: "exploration" as const,
              }, "exploration");
            }
          }
        }
      }
    } catch {
      // Material drop config not yet set up — skip silently
    }
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
