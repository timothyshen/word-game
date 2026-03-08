/**
 * World Events Service — exploration event generation and handling
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import { resolveHeroCharacter } from "../utils/hero-utils";

// ===== Types =====

export type EventType = "resource" | "monster" | "merchant" | "treasure" | "trap" | "nothing";

export interface ExplorationEvent {
  type: EventType;
  title: string;
  description: string;
  options: Array<{
    id: string;
    text: string;
    action: string;
    cost?: { stamina?: number };
    requirement?: { stat?: string; minValue?: number };
  }>;
  rewards?: {
    gold?: number;
    wood?: number;
    stone?: number;
    food?: number;
    exp?: number;
  };
  monster?: {
    name: string;
    icon: string;
    level: number;
    hp: number;
    attack: number;
    defense: number;
    rewards: {
      exp: number;
      gold: number;
    };
  };
}

// ===== Constants =====

const EVENT_WEIGHTS: Record<EventType, number> = {
  resource: 25,
  monster: 20,
  nothing: 20,
  merchant: 15,
  treasure: 10,
  trap: 10,
};

// ===== Private Helpers =====

function selectEventType(): EventType {
  const totalWeight = Object.values(EVENT_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(EVENT_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return type as EventType;
    }
  }
  return "nothing";
}

function generateResourceEvent(level: number): ExplorationEvent {
  const resources = [
    { name: "木材堆", resource: "wood", base: 15, icon: "🪵" },
    { name: "矿石脉", resource: "stone", base: 12, icon: "🪨" },
    { name: "野果林", resource: "food", base: 20, icon: "🍎" },
    { name: "废弃宝箱", resource: "gold", base: 30, icon: "💰" },
  ];
  const chosen = resources[Math.floor(Math.random() * resources.length)]!;
  const amount = Math.floor(chosen.base * (1 + level * 0.2));

  return {
    type: "resource",
    title: `发现${chosen.name}`,
    description: `${chosen.icon} 你发现了一处${chosen.name}，看起来可以采集一些资源。`,
    options: [
      { id: "collect", text: "采集", action: "collect" },
      { id: "leave", text: "离开", action: "leave" },
    ],
    rewards: { [chosen.resource]: amount },
  };
}

function generateMonsterEvent(level: number): ExplorationEvent {
  const monsters = [
    { name: "野狼", icon: "🐺", baseHp: 30, baseAtk: 8, baseDef: 3 },
    { name: "山贼", icon: "🗡️", baseHp: 50, baseAtk: 12, baseDef: 5 },
    { name: "哥布林", icon: "👺", baseHp: 25, baseAtk: 10, baseDef: 2 },
    { name: "骷髅兵", icon: "💀", baseHp: 40, baseAtk: 15, baseDef: 8 },
  ];
  const chosen = monsters[Math.floor(Math.random() * monsters.length)]!;
  const monsterLevel = Math.max(1, level + Math.floor(Math.random() * 3) - 1);

  return {
    type: "monster",
    title: `遭遇${chosen.name}`,
    description: `${chosen.icon} 一只Lv.${monsterLevel}的${chosen.name}挡住了去路！`,
    options: [
      { id: "fight", text: "战斗", action: "fight" },
      { id: "flee", text: "逃跑", action: "flee" },
    ],
    monster: {
      name: chosen.name,
      icon: chosen.icon,
      level: monsterLevel,
      hp: Math.floor(chosen.baseHp * (1 + monsterLevel * 0.3)),
      attack: Math.floor(chosen.baseAtk * (1 + monsterLevel * 0.2)),
      defense: Math.floor(chosen.baseDef * (1 + monsterLevel * 0.15)),
      rewards: {
        exp: 20 * monsterLevel,
        gold: 10 * monsterLevel,
      },
    },
  };
}

function generateTreasureEvent(level: number): ExplorationEvent {
  const goldReward = 50 + level * 20;
  return {
    type: "treasure",
    title: "神秘宝箱",
    description: "💎 你发现了一个古老的宝箱，上面刻满了奇怪的符文。",
    options: [
      { id: "open", text: "打开宝箱", action: "open" },
      { id: "leave", text: "谨慎离开", action: "leave" },
    ],
    rewards: { gold: goldReward },
  };
}

function generateMerchantEvent(): ExplorationEvent {
  return {
    type: "merchant",
    title: "流浪商人",
    description: "🧙 一个神秘的商人正在路边休息，他似乎有一些有趣的商品。",
    options: [
      { id: "trade", text: "查看商品", action: "trade" },
      { id: "leave", text: "继续赶路", action: "leave" },
    ],
  };
}

function generateTrapEvent(level: number): ExplorationEvent {
  const damage = 10 + level * 5;
  return {
    type: "trap",
    title: "陷阱！",
    description: `⚠️ 你不小心触发了一个隐藏的陷阱！将受到${damage}点伤害。`,
    options: [
      { id: "take_damage", text: `承受伤害 (${damage}点)`, action: "take_damage" },
      { id: "dodge", text: "尝试闪避", action: "dodge" },
    ],
  };
}

// ===== Public API =====

/** Generate a random exploration event based on area level */
export function generateRandomEvent(areaLevel: number): ExplorationEvent {
  const type = selectEventType();

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
        options: [{ id: "continue", text: "继续前进", action: "continue" }],
      };
  }
}

/** Handle event choice for a hero */
export async function handleChoice(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  input: {
    heroId: string;
    eventType: string;
    action: string;
    eventData?: string;
  },
): Promise<{ success: boolean; message: string; rewards?: Record<string, number> }> {
  const player = await db.player.findFirst({ where: { userId } });
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const hero = await db.heroInstance.findFirst({
    where: { id: input.heroId, playerId: player.id },
  });

  if (!hero) {
    throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
  }

  const eventData = input.eventData ? JSON.parse(input.eventData) as ExplorationEvent : null;
  const result: { success: boolean; message: string; rewards?: Record<string, number> } = {
    success: true,
    message: "",
  };

  switch (input.action) {
    case "continue":
    case "leave":
      result.message = "你继续前进...";
      break;

    case "collect":
      if (eventData?.rewards) {
        await db.player.update({
          where: { id: player.id },
          data: {
            gold: { increment: eventData.rewards.gold ?? 0 },
            wood: { increment: eventData.rewards.wood ?? 0 },
            stone: { increment: eventData.rewards.stone ?? 0 },
            food: { increment: eventData.rewards.food ?? 0 },
          },
        });
        result.message = "采集成功！";
        result.rewards = eventData.rewards;
      }
      break;

    case "open":
      if (eventData?.rewards) {
        await db.player.update({
          where: { id: player.id },
          data: {
            gold: { increment: eventData.rewards.gold ?? 0 },
          },
        });
        result.message = `打开宝箱获得 ${eventData.rewards.gold} 金币！`;
        result.rewards = eventData.rewards;
      }
      break;

    case "fight":
      if (eventData?.monster) {
        const charData = await resolveHeroCharacter(db, entities, hero.characterId);
        const heroPower = charData.state.attack + charData.state.defense;
        const monsterPower = eventData.monster.attack + eventData.monster.defense;

        const winChance = heroPower / (heroPower + monsterPower);
        const won = Math.random() < winChance;

        if (won) {
          await db.player.update({
            where: { id: player.id },
            data: {
              gold: { increment: eventData.monster.rewards.gold },
              exp: { increment: eventData.monster.rewards.exp },
            },
          });
          result.message = `战斗胜利！获得 ${eventData.monster.rewards.gold} 金币和 ${eventData.monster.rewards.exp} 经验！`;
          result.rewards = {
            gold: eventData.monster.rewards.gold,
            exp: eventData.monster.rewards.exp,
          };
        } else {
          await db.heroInstance.update({
            where: { id: hero.id },
            data: { stamina: Math.max(0, hero.stamina - 20) },
          });
          result.success = false;
          result.message = `战斗失败！英雄损失20点体力。`;
        }
      }
      break;

    case "flee": {
      const fleeSuccess = Math.random() > 0.3;
      if (fleeSuccess) {
        result.message = "成功逃跑！";
      } else {
        await db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: Math.max(0, hero.stamina - 10) },
        });
        result.success = false;
        result.message = "逃跑失败！损失10点体力。";
      }
      break;
    }

    case "take_damage":
      await db.heroInstance.update({
        where: { id: hero.id },
        data: { stamina: Math.max(0, hero.stamina - 15) },
      });
      result.message = "你承受了陷阱伤害，损失15点体力。";
      break;

    case "dodge": {
      const dodgeSuccess = Math.random() > 0.5;
      if (dodgeSuccess) {
        result.message = "成功闪避了陷阱！";
      } else {
        await db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: Math.max(0, hero.stamina - 10) },
        });
        result.message = "闪避失败，损失10点体力。";
      }
      break;
    }

    case "trade":
      result.message = "商人向你展示了商品，但你决定不购买。";
      break;

    default:
      result.message = "未知操作。";
  }

  return result;
}
