import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// 升级所需经验计算
function getExpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

// 属性成长计算
function calculateStatGrowth(baseStat: number, level: number, growthRate: number): number {
  return Math.floor(baseStat * (1 + (level - 1) * growthRate));
}

export const characterRouter = createTRPCRouter({
  // 获取所有角色
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const characters = await ctx.db.playerCharacter.findMany({
      where: { playerId: player.id },
      include: {
        character: true,
        profession: { include: { profession: true } },
        learnedSkills: { include: { skill: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return characters.map((c) => ({
      id: c.id,
      name: c.character.name,
      icon: c.character.portrait,
      rarity: c.character.rarity,
      baseClass: c.character.baseClass,
      level: c.level,
      tier: c.tier,
      maxLevel: c.maxLevel,
      exp: c.exp,
      expToNext: getExpForLevel(c.level + 1),
      hp: c.hp,
      maxHp: c.maxHp,
      mp: c.mp,
      maxMp: c.maxMp,
      attack: c.attack,
      defense: c.defense,
      speed: c.speed,
      luck: c.luck,
      status: c.status,
      workingAt: c.workingAt,
      profession: c.profession
        ? {
            id: c.profession.profession.id,
            name: c.profession.profession.name,
          }
        : null,
      skillCount: c.learnedSkills.length,
      skillSlots: c.tier * 6,
    }));
  }),

  // 获取角色详情
  getById: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: {
          character: true,
          profession: { include: { profession: true } },
          learnedSkills: { include: { skill: true } },
        },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      return {
        id: character.id,
        name: character.character.name,
        icon: character.character.portrait,
        description: character.character.description,
        rarity: character.character.rarity,
        baseClass: character.character.baseClass,
        level: character.level,
        tier: character.tier,
        maxLevel: character.maxLevel,
        exp: character.exp,
        expToNext: getExpForLevel(character.level + 1),
        hp: character.hp,
        maxHp: character.maxHp,
        mp: character.mp,
        maxMp: character.maxMp,
        attack: character.attack,
        defense: character.defense,
        speed: character.speed,
        luck: character.luck,
        status: character.status,
        workingAt: character.workingAt,
        profession: character.profession
          ? {
              id: character.profession.profession.id,
              name: character.profession.profession.name,
              description: character.profession.profession.description,
              bonuses: JSON.parse(character.profession.profession.bonuses) as Record<string, number>,
            }
          : null,
        skills: character.learnedSkills.map((s) => ({
          id: s.skill.id,
          name: s.skill.name,
          description: s.skill.description,
          level: s.level,
          type: s.skill.type,
          icon: s.skill.icon,
        })),
        skillSlots: character.tier * 6,
        baseStats: {
          hp: character.character.baseHp,
          mp: character.character.baseMp,
          attack: character.character.baseAttack,
          defense: character.character.baseDefense,
          speed: character.character.baseSpeed,
          luck: character.character.baseLuck,
        },
      };
    }),

  // 角色升级
  levelUp: protectedProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (character.level >= character.maxLevel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已达当前阶位等级上限，请先突破" });
      }

      const expNeeded = getExpForLevel(character.level + 1);
      if (character.exp < expNeeded) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `经验不足，需要 ${expNeeded}，当前 ${character.exp}`,
        });
      }

      // 计算新属性（每级成长）
      const growthRate = 0.05; // 每级5%成长
      const newLevel = character.level + 1;
      const newMaxHp = calculateStatGrowth(character.character.baseHp, newLevel, growthRate);
      const newMaxMp = calculateStatGrowth(character.character.baseMp, newLevel, growthRate);
      const newAttack = calculateStatGrowth(character.character.baseAttack, newLevel, growthRate);
      const newDefense = calculateStatGrowth(character.character.baseDefense, newLevel, growthRate);
      const newSpeed = calculateStatGrowth(character.character.baseSpeed, newLevel, growthRate);
      const newLuck = calculateStatGrowth(character.character.baseLuck, newLevel, growthRate);

      // 更新角色
      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: {
          level: newLevel,
          exp: character.exp - expNeeded,
          maxHp: newMaxHp,
          maxMp: newMaxMp,
          hp: newMaxHp, // 升级回满血
          mp: newMaxMp, // 升级回满蓝
          attack: newAttack,
          defense: newDefense,
          speed: newSpeed,
          luck: newLuck,
        },
      });

      return {
        success: true,
        characterName: character.character.name,
        newLevel,
        expUsed: expNeeded,
        remainingExp: character.exp - expNeeded,
        stats: {
          maxHp: newMaxHp,
          maxMp: newMaxMp,
          attack: newAttack,
          defense: newDefense,
          speed: newSpeed,
          luck: newLuck,
        },
      };
    }),

  // 给角色增加经验
  addExp: protectedProcedure
    .input(z.object({ characterId: z.string(), amount: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      const newExp = character.exp + input.amount;
      const expToNext = getExpForLevel(character.level + 1);

      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: { exp: newExp },
      });

      return {
        success: true,
        characterName: character.character.name,
        expAdded: input.amount,
        totalExp: newExp,
        expToNext,
        canLevelUp: newExp >= expToNext && character.level < character.maxLevel,
      };
    }),

  // 恢复角色HP/MP
  heal: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        type: z.enum(["hp", "mp", "both"]),
        amount: z.number().min(1).optional(), // 不指定则全部恢复
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      const updates: { hp?: number; mp?: number } = {};
      const result: { hpHealed?: number; mpRestored?: number } = {};

      if (input.type === "hp" || input.type === "both") {
        const healAmount = input.amount ?? character.maxHp;
        const newHp = Math.min(character.hp + healAmount, character.maxHp);
        updates.hp = newHp;
        result.hpHealed = newHp - character.hp;
      }

      if (input.type === "mp" || input.type === "both") {
        const restoreAmount = input.amount ?? character.maxMp;
        const newMp = Math.min(character.mp + restoreAmount, character.maxMp);
        updates.mp = newMp;
        result.mpRestored = newMp - character.mp;
      }

      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: updates,
      });

      return {
        success: true,
        characterName: character.character.name,
        ...result,
        currentHp: updates.hp ?? character.hp,
        currentMp: updates.mp ?? character.mp,
        maxHp: character.maxHp,
        maxMp: character.maxMp,
      };
    }),

  // 分配角色到建筑（与 building.assignCharacter 配合）
  assignToBuilding: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        buildingId: z.string().nullable(), // null 表示取消分配
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { character: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (input.buildingId === null) {
        // 取消分配
        // 找到当前分配的建筑
        const currentBuilding = await ctx.db.playerBuilding.findFirst({
          where: { playerId: player.id, assignedCharId: input.characterId },
          include: { building: true },
        });

        if (currentBuilding) {
          await ctx.db.playerBuilding.update({
            where: { id: currentBuilding.id },
            data: { assignedCharId: null, status: "idle" },
          });
        }

        await ctx.db.playerCharacter.update({
          where: { id: character.id },
          data: { status: "idle", workingAt: null },
        });

        return {
          success: true,
          characterName: character.character.name,
          message: "角色已空闲",
        };
      }

      // 分配到新建筑
      const building = await ctx.db.playerBuilding.findFirst({
        where: { id: input.buildingId, playerId: player.id },
        include: { building: true },
      });

      if (!building) {
        throw new TRPCError({ code: "NOT_FOUND", message: "建筑不存在" });
      }

      // 如果角色正在其他建筑工作，先解除
      if (character.status === "working") {
        const oldBuilding = await ctx.db.playerBuilding.findFirst({
          where: { playerId: player.id, assignedCharId: input.characterId },
        });
        if (oldBuilding) {
          await ctx.db.playerBuilding.update({
            where: { id: oldBuilding.id },
            data: { assignedCharId: null, status: "idle" },
          });
        }
      }

      // 如果目标建筑已有其他角色，先解除
      if (building.assignedCharId && building.assignedCharId !== input.characterId) {
        await ctx.db.playerCharacter.update({
          where: { id: building.assignedCharId },
          data: { status: "idle", workingAt: null },
        });
      }

      // 分配角色到建筑
      await ctx.db.playerBuilding.update({
        where: { id: building.id },
        data: { assignedCharId: input.characterId, status: "working" },
      });

      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: { status: "working", workingAt: building.building.name },
      });

      return {
        success: true,
        characterName: character.character.name,
        buildingName: building.building.name,
        message: `${character.character.name} 已分配到 ${building.building.name}`,
      };
    }),

  // 获取空闲角色列表
  getIdle: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const player = await ctx.db.player.findUnique({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const idleCharacters = await ctx.db.playerCharacter.findMany({
      where: { playerId: player.id, status: "idle" },
      include: { character: true },
    });

    return idleCharacters.map((c) => ({
      id: c.id,
      name: c.character.name,
      icon: c.character.portrait,
      level: c.level,
      rarity: c.character.rarity,
    }));
  }),

  // 更新角色状态
  updateStatus: protectedProcedure
    .input(
      z.object({
        characterId: z.string(),
        status: z.enum(["idle", "working", "exploring", "combat", "resting"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      await ctx.db.playerCharacter.update({
        where: { id: character.id },
        data: {
          status: input.status,
          workingAt: input.status === "idle" ? null : character.workingAt,
        },
      });

      return { success: true, newStatus: input.status };
    }),
});
