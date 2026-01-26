import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 世界定义
interface World {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number; // 推荐等级
  unlockCondition: {
    tier?: number;
    level?: number;
    quest?: string;
  };
  features: string[];
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
  },
  {
    id: "fire_realm",
    name: "火焰位面",
    description: "燃烧的世界，充满火元素的危险区域。",
    icon: "🔥",
    level: 15,
    unlockCondition: { tier: 2, level: 10 },
    features: ["火属性材料", "火焰怪物", "熔岩地形"],
  },
  {
    id: "ice_realm",
    name: "寒冰位面",
    description: "永恒冰封的世界，隐藏着远古的秘密。",
    icon: "❄️",
    level: 20,
    unlockCondition: { tier: 2, level: 15 },
    features: ["冰属性材料", "冰霜怪物", "极寒环境"],
  },
  {
    id: "shadow_realm",
    name: "暗影位面",
    description: "黑暗笼罩的世界，强大的暗影生物徘徊其中。",
    icon: "🌑",
    level: 30,
    unlockCondition: { tier: 3, level: 25 },
    features: ["暗属性材料", "暗影Boss", "神秘遗迹"],
  },
  {
    id: "celestial_realm",
    name: "天界",
    description: "神圣的领域，只有最强大的冒险者才能踏足。",
    icon: "✨",
    level: 50,
    unlockCondition: { tier: 5, level: 40 },
    features: ["神圣材料", "天使守卫", "传说宝藏"],
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
};

export const portalRouter = createTRPCRouter({
  // 获取所有世界
  getWorlds: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

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
  }),

  // 获取已发现的传送门
  getDiscoveredPortals: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const portals = await ctx.db.wildernessFacility.findMany({
      where: {
        playerId: player.id,
        type: "portal",
        isDiscovered: true,
      },
    });

    return portals.map(portal => {
      const data = JSON.parse(portal.data) as {
        targetWorld: string;
        isDefeated?: boolean;
        guardianLevel?: number;
      };
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
  }),

  // 挑战传送门守护者
  challengePortalGuardian: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: { characters: { include: { character: true } } },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const portal = await ctx.db.wildernessFacility.findFirst({
        where: { id: input.portalId, playerId: player.id, type: "portal" },
      });

      if (!portal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "传送门不存在" });
      }

      const data = JSON.parse(portal.data) as {
        targetWorld: string;
        isDefeated?: boolean;
        guardianLevel?: number;
      };

      if (data.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "守护者已被击败" });
      }

      const guardian = PORTAL_GUARDIANS[data.targetWorld];
      if (!guardian) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "守护者信息无效" });
      }

      // 检查体力
      const staminaCost = 40;
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

      // 计算战斗力
      const guardianLevel = data.guardianLevel ?? 10;
      const guardianHp = Math.floor(guardian.baseHp * (1 + guardianLevel * 0.2));
      const guardianAttack = Math.floor(guardian.baseAttack * (1 + guardianLevel * 0.15));
      const guardianDefense = Math.floor(guardian.baseDefense * (1 + guardianLevel * 0.1));

      const playerPower = player.strength * 3 + player.agility * 2 + player.intellect * 2;
      const charactersPower = player.characters.reduce(
        (sum, c) => sum + c.attack + c.defense + c.speed,
        0
      );
      const totalPower = playerPower + charactersPower;
      const guardianPower = guardianAttack + guardianDefense * 0.5 + guardianHp * 0.01;

      // 战斗判定
      const powerRatio = totalPower / guardianPower;
      const baseWinChance = Math.min(0.8, Math.max(0.1, powerRatio * 0.45));
      const victory = Math.random() < baseWinChance;

      if (victory) {
        // 更新传送门状态
        data.isDefeated = true;
        await ctx.db.wildernessFacility.update({
          where: { id: portal.id },
          data: { data: JSON.stringify(data) },
        });

        // 奖励
        const rewards = {
          gold: guardianLevel * 80,
          exp: guardianLevel * 50,
          crystals: Math.floor(guardianLevel / 3) + 3,
        };

        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            exp: player.exp + rewards.exp,
            crystals: player.crystals + rewards.crystals,
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
    }),

  // 使用传送门（需要先击败守护者）
  usePortal: protectedProcedure
    .input(z.object({ portalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const portal = await ctx.db.wildernessFacility.findFirst({
        where: { id: input.portalId, playerId: player.id, type: "portal" },
      });

      if (!portal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "传送门不存在" });
      }

      const data = JSON.parse(portal.data) as {
        targetWorld: string;
        isDefeated?: boolean;
      };

      if (!data.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请先击败传送门守护者" });
      }

      const targetWorld = WORLDS.find(w => w.id === data.targetWorld);
      if (!targetWorld) {
        throw new TRPCError({ code: "NOT_FOUND", message: "目标世界不存在" });
      }

      // 传送消耗体力（比普通传送少）
      const staminaCost = 10;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          currentWorld: data.targetWorld,
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      return {
        success: true,
        world: targetWorld.name,
        message: `通过传送门进入了${targetWorld.name}！`,
        staminaCost,
      };
    }),

  // 获取当前世界
  getCurrentWorld: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const world = WORLDS.find(w => w.id === player.currentWorld);
    return world ?? WORLDS[0]!;
  }),

  // 传送到另一个世界
  travel: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const world = WORLDS.find(w => w.id === input.worldId);
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

      // 传送消耗体力
      const staminaCost = 20;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 更新玩家当前世界
      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          currentWorld: input.worldId,
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      return {
        success: true,
        world: world.name,
        message: `成功传送到${world.name}！`,
        staminaCost,
      };
    }),

  // 获取世界特有资源点
  getWorldResources: protectedProcedure
    .input(z.object({ worldId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 获取该世界的野外设施
      const facilities = await ctx.db.wildernessFacility.findMany({
        where: {
          playerId: player.id,
          worldId: input.worldId,
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
    }),
});
