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
