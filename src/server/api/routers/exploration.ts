import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 获取当前游戏日
function getCurrentGameDay(): number {
  const now = new Date();
  const gameStart = new Date("2024-01-01T00:00:00Z");
  const daysPassed = Math.floor((now.getTime() - gameStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysPassed + 1;
}

// 随机事件类型
type EventType = "resource" | "monster" | "merchant" | "treasure" | "trap" | "nothing";

interface ExplorationEvent {
  type: EventType;
  title: string;
  description: string;
  options: Array<{
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
      cardChance: number;
    };
  };
}

// 生成随机探索事件
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
        cardChance: 0.1 + monsterLevel * 0.05,
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

export const explorationRouter = createTRPCRouter({
  // 获取已探索区域
  getExploredAreas: protectedProcedure
    .input(z.object({ worldId: z.string().default("main") }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const areas = await ctx.db.exploredArea.findMany({
        where: { playerId: player.id, worldId: input.worldId },
        orderBy: { discoveredAt: "asc" },
      });

      return areas;
    }),

  // 获取野外设施
  getWildernessFacilities: protectedProcedure
    .input(z.object({ worldId: z.string().default("main") }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const now = new Date();

      // 获取未过期的设施
      const facilities = await ctx.db.wildernessFacility.findMany({
        where: {
          playerId: player.id,
          worldId: input.worldId,
          isDiscovered: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      });

      return facilities.map(f => ({
        ...f,
        data: JSON.parse(f.data) as Record<string, unknown>,
      }));
    }),

  // 探索新区域
  exploreArea: protectedProcedure
    .input(
      z.object({
        worldId: z.string().default("main"),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查体力
      const staminaCost = 15;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 检查是否已探索
      const existing = await ctx.db.exploredArea.findUnique({
        where: {
          playerId_worldId_positionX_positionY: {
            playerId: player.id,
            worldId: input.worldId,
            positionX: input.positionX,
            positionY: input.positionY,
          },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该区域已探索过" });
      }

      // 消耗体力
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      // 计算区域等级（基于距离）
      const distance = Math.sqrt(input.positionX ** 2 + input.positionY ** 2);
      const areaLevel = Math.max(1, Math.floor(distance / 2));

      // 生成区域名称
      const areaNames = ["平原", "森林", "山丘", "沼泽", "荒地", "遗迹"];
      const areaName = `${areaNames[Math.floor(Math.random() * areaNames.length)]}区域`;

      // 创建探索记录
      await ctx.db.exploredArea.create({
        data: {
          playerId: player.id,
          worldId: input.worldId,
          positionX: input.positionX,
          positionY: input.positionY,
          name: areaName,
        },
      });

      // 随机生成野外设施
      const facilityChance = 0.4;
      let newFacility = null;

      if (Math.random() < facilityChance) {
        const facilityTypes = ["resource", "monster", "merchant"];
        const facilityType = facilityTypes[Math.floor(Math.random() * facilityTypes.length)]!;

        const facilityData: Record<string, unknown> = {
          level: areaLevel,
        };

        let facilityName = "";
        let facilityIcon = "";

        if (facilityType === "resource") {
          const resources = ["采矿点", "伐木点", "采集点"];
          facilityName = resources[Math.floor(Math.random() * resources.length)]!;
          facilityIcon = facilityName === "采矿点" ? "⛏️" : facilityName === "伐木点" ? "🪓" : "🌿";
          facilityData.resourceType = facilityName === "采矿点" ? "stone" : facilityName === "伐木点" ? "wood" : "food";
          facilityData.amount = 10 + areaLevel * 5;
        } else if (facilityType === "monster") {
          facilityName = "怪物巢穴";
          facilityIcon = "💀";
          facilityData.monsterLevel = areaLevel;
        } else {
          facilityName = "商人营地";
          facilityIcon = "🏕️";
        }

        newFacility = await ctx.db.wildernessFacility.create({
          data: {
            playerId: player.id,
            worldId: input.worldId,
            type: facilityType,
            name: facilityName,
            icon: facilityIcon,
            description: `等级${areaLevel}的${facilityName}`,
            positionX: input.positionX,
            positionY: input.positionY,
            data: JSON.stringify(facilityData),
            remainingUses: facilityType === "resource" ? 3 : null,
            isDiscovered: true,
          },
        });
      }

      // 记录行动分数
      const baseScore = 40;
      const bonus = 30; // 发现新区域奖励
      await ctx.db.actionLog.create({
        data: {
          playerId: player.id,
          day: getCurrentGameDay(),
          type: "explore",
          description: `探索了${areaName}`,
          baseScore,
          bonus,
          bonusReason: "发现新区域",
        },
      });

      await ctx.db.player.update({
        where: { id: player.id },
        data: { currentDayScore: player.currentDayScore + baseScore + bonus },
      });

      return {
        explored: true,
        areaName,
        position: { x: input.positionX, y: input.positionY },
        staminaCost,
        facilityFound: newFacility ? {
          name: newFacility.name,
          type: newFacility.type,
          icon: newFacility.icon,
        } : null,
      };
    }),

  // 触发探索事件（进入已探索区域）
  triggerEvent: protectedProcedure
    .input(
      z.object({
        worldId: z.string().default("main"),
        positionX: z.number(),
        positionY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查区域是否已探索
      const area = await ctx.db.exploredArea.findUnique({
        where: {
          playerId_worldId_positionX_positionY: {
            playerId: player.id,
            worldId: input.worldId,
            positionX: input.positionX,
            positionY: input.positionY,
          },
        },
      });

      if (!area) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先探索该区域" });
      }

      // 检查体力
      const staminaCost = 10;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 消耗体力
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      // 计算区域等级
      const distance = Math.sqrt(input.positionX ** 2 + input.positionY ** 2);
      const areaLevel = Math.max(1, Math.floor(distance / 2));

      // 生成随机事件
      const event = generateRandomEvent(areaLevel);

      return {
        event,
        staminaCost,
        areaName: area.name,
      };
    }),

  // 处理事件选择
  handleEventChoice: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
        action: z.string(),
        eventData: z.string().optional(), // JSON 事件数据
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

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

      const eventData = input.eventData ? JSON.parse(input.eventData) as ExplorationEvent : null;

      switch (input.action) {
        case "collect":
          // 采集资源
          if (eventData?.rewards) {
            await ctx.db.player.update({
              where: { id: player.id },
              data: {
                gold: player.gold + (eventData.rewards.gold ?? 0),
                wood: player.wood + (eventData.rewards.wood ?? 0),
                stone: player.stone + (eventData.rewards.stone ?? 0),
                food: player.food + (eventData.rewards.food ?? 0),
              },
            });
            result.rewards = eventData.rewards;
            result.message = "成功采集了资源！";
          }
          break;

        case "fight":
          // 简化的战斗计算
          if (eventData?.monster) {
            const playerPower = player.strength * 2 + player.agility;
            const monsterPower = eventData.monster.attack + eventData.monster.defense;
            const victory = playerPower > monsterPower * 0.8;

            if (victory) {
              const rewards = eventData.monster.rewards;
              await ctx.db.player.update({
                where: { id: player.id },
                data: {
                  gold: player.gold + rewards.gold,
                  exp: player.exp + rewards.exp,
                },
              });

              // 记录战斗分数
              await ctx.db.actionLog.create({
                data: {
                  playerId: player.id,
                  day: getCurrentGameDay(),
                  type: "combat",
                  description: `击败了${eventData.monster.name}`,
                  baseScore: 20 * eventData.monster.level,
                },
              });

              result.combat = {
                victory: true,
                playerDamage: Math.floor(eventData.monster.attack * 0.5),
                monsterDefeated: true,
                rewards: {
                  exp: rewards.exp,
                  gold: rewards.gold,
                  cardDrop: Math.random() < rewards.cardChance,
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
          // 尝试逃跑（50%成功率）
          result.fled = Math.random() > 0.5;
          result.message = result.fled ? "成功逃跑！" : "逃跑失败，受到了一些伤害";
          if (!result.fled) {
            result.damage = 15;
          }
          break;

        case "open":
          // 打开宝箱
          if (eventData?.rewards) {
            await ctx.db.player.update({
              where: { id: player.id },
              data: {
                gold: player.gold + (eventData.rewards.gold ?? 0),
              },
            });
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
    }),

  // 使用野外设施
  useFacility: protectedProcedure
    .input(z.object({ facilityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const facility = await ctx.db.wildernessFacility.findFirst({
        where: { id: input.facilityId, playerId: player.id },
      });

      if (!facility) {
        throw new TRPCError({ code: "NOT_FOUND", message: "设施不存在" });
      }

      if (facility.remainingUses !== null && facility.remainingUses <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "设施已耗尽" });
      }

      const staminaCost = 5;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 消耗体力
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      const facilityData = JSON.parse(facility.data) as Record<string, unknown>;
      let result: Record<string, unknown> = {};

      if (facility.type === "resource") {
        // 采集资源
        const resourceType = facilityData.resourceType as string;
        const amount = facilityData.amount as number;

        const updateData: Record<string, number> = {};
        updateData[resourceType] = (player[resourceType as keyof typeof player] as number) + amount;

        await ctx.db.player.update({
          where: { id: player.id },
          data: updateData,
        });

        result = { collected: true, resourceType, amount };
      }

      // 减少使用次数
      if (facility.remainingUses !== null) {
        const newUses = facility.remainingUses - 1;
        if (newUses <= 0) {
          await ctx.db.wildernessFacility.delete({ where: { id: facility.id } });
        } else {
          await ctx.db.wildernessFacility.update({
            where: { id: facility.id },
            data: { remainingUses: newUses },
          });
        }
        result.remainingUses = newUses;
      }

      return result;
    }),
});
