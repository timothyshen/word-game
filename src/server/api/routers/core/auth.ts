import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getCurrentGameDay } from "../../utils";

export const authRouter = createTRPCRouter({
  // 注册新用户
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱"),
        name: z.string().min(2, "名称至少2个字符").max(20, "名称最多20个字符"),
        playerName: z.string().min(2, "角色名至少2个字符").max(20, "角色名最多20个字符"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查邮箱是否已存在
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该邮箱已被注册",
        });
      }

      // 创建用户
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
        },
      });

      // 创建玩家存档
      const player = await ctx.db.player.create({
        data: {
          userId: user.id,
          name: input.playerName,
          title: "领主",
          level: 1,
          exp: 0,
          lastSettlementDay: getCurrentGameDay() - 1, // 确保首次登录不会立即触发结算
          gold: 500,
          wood: 200,
          stone: 100,
          food: 300,
          crystals: 0,
          stamina: 100,
          maxStamina: 100,
          strength: 10,
          agility: 10,
          intellect: 10,
          charisma: 14,
        },
      });

      // 初始化主城堡 (via Entity system)
      const { createBuildingEntity } = await import("../../utils/building-utils");
      const mainCastle = await ctx.db.building.findFirst({
        where: { name: "主城堡" },
      });
      if (mainCastle) {
        await createBuildingEntity(ctx.db, ctx.engine.entities, player.id, {
          buildingId: mainCastle.id, level: 1, positionX: 0, positionY: 0,
        });
      }

      // 初始化农田
      const farmland = await ctx.db.building.findFirst({
        where: { name: "农田" },
      });
      if (farmland) {
        await createBuildingEntity(ctx.db, ctx.engine.entities, player.id, {
          buildingId: farmland.id, level: 1, positionX: 1, positionY: 0,
        });
      }

      // 创建玩家初始角色（流浪剑士）via Entity system
      const lordCharacter = await ctx.db.character.findFirst({
        where: { name: "流浪剑士" },
      });
      if (lordCharacter) {
        const { getCharacterTemplateId } = await import("../../utils/character-utils");
        const templateId = await getCharacterTemplateId(ctx.db, ctx.engine.entities);
        await ctx.engine.entities.createEntity(templateId, player.id, {
          characterId: lordCharacter.id,
          level: 1,
          exp: 0,
          maxLevel: 10,
          tier: 1,
          hp: lordCharacter.baseHp,
          maxHp: lordCharacter.baseHp,
          mp: lordCharacter.baseMp,
          maxMp: lordCharacter.baseMp,
          attack: lordCharacter.baseAttack,
          defense: lordCharacter.baseDefense,
          speed: lordCharacter.baseSpeed,
          luck: lordCharacter.baseLuck,
          status: "idle",
          workingAt: null,
        });
      }

      // 给玩家一些初始卡牌
      const { addCardEntity } = await import("../../utils/card-entity-utils");
      const starterCards = await ctx.db.card.findMany({
        where: {
          OR: [
            { name: "回复药水" },
            { name: "经验书" },
          ],
        },
      });
      for (const card of starterCards) {
        await addCardEntity(ctx.db, ctx.engine.entities, player.id, card.id, 3);
      }

      return {
        success: true,
        userId: user.id,
        message: "注册成功",
      };
    }),

  // 登录（通过邮箱）
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: { player: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在，请先注册",
        });
      }

      return {
        success: true,
        userId: user.id,
        userName: user.name,
        playerName: user.player?.name,
        message: "登录成功",
      };
    }),

  // 获取当前用户信息
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return null;
    }

    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: { player: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      player: user.player
        ? {
            id: user.player.id,
            name: user.player.name,
            level: user.player.level,
          }
        : null,
    };
  }),

  // 登出（客户端处理cookie清除）
  logout: publicProcedure.mutation(async () => {
    return { success: true, message: "登出成功" };
  }),
});
