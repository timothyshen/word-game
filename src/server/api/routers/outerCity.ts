import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma";

// ===== 内外城联动：获取内城建筑加成 =====
interface CityBonuses {
  attackBonus: number;   // 攻击力加成百分比 (兵营)
  defenseBonus: number;  // 防御力加成百分比 (铁匠铺)
  tradeBonus: number;    // 交易加成百分比 (市场)
  staminaBonus: number;  // 体力恢复加成 (农田)
}

async function getInnerCityBonuses(db: PrismaClient, playerId: string): Promise<CityBonuses> {
  const buildings = await db.innerCityBuilding.findMany({
    where: { playerId },
    include: { template: true },
  });

  let attackBonus = 0;
  let defenseBonus = 0;
  let tradeBonus = 0;
  let staminaBonus = 0;

  for (const building of buildings) {
    const templateName = building.template.name;
    const level = building.level;

    switch (templateName) {
      case "兵营":
        // 每级增加10%攻击力
        attackBonus += level * 0.1;
        break;
      case "铁匠铺":
        // 每级增加5%防御力
        defenseBonus += level * 0.05;
        break;
      case "市场":
        // 每级增加15%交易收益
        tradeBonus += level * 0.15;
        break;
      case "农田":
        // 每级增加10体力恢复
        staminaBonus += level * 10;
        break;
    }
  }

  return { attackBonus, defenseBonus, tradeBonus, staminaBonus };
}

export const outerCityRouter = createTRPCRouter({
  // 获取外城状态
  getStatus: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
    }

    const player = await ctx.db.player.findFirst({
      where: { userId },
      include: {
        heroInstances: {
          include: {
            character: {
              include: {
                character: true,
              },
            },
          },
        },
        exploredAreas: {
          where: { worldId: "main" },
        },
        characters: {
          include: {
            character: true,
            heroInstance: true,
          },
        },
      },
    });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    // 获取全局POI列表
    const pois = await ctx.db.outerCityPOI.findMany();

    return {
      heroes: player.heroInstances,
      exploredAreas: player.exploredAreas,
      availableCharacters: player.characters.filter((c) => !c.heroInstance),
      pois,
    };
  }),

  // 派遣英雄到外城
  deployHero: publicProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查角色是否属于玩家
      const character = await ctx.db.playerCharacter.findFirst({
        where: { id: input.characterId, playerId: player.id },
        include: { heroInstance: true },
      });

      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      }

      if (character.heroInstance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "角色已在外城" });
      }

      // 创建英雄实例，初始位置在城门 (0, 0)
      const hero = await ctx.db.heroInstance.create({
        data: {
          playerId: player.id,
          characterId: input.characterId,
          positionX: 0,
          positionY: 0,
          status: "idle",
          stamina: 100,
        },
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      // 确保起始位置已探索
      await ctx.db.exploredArea.upsert({
        where: {
          playerId_worldId_positionX_positionY: {
            playerId: player.id,
            worldId: "main",
            positionX: 0,
            positionY: 0,
          },
        },
        update: { explorationLevel: 2 },
        create: {
          playerId: player.id,
          worldId: "main",
          positionX: 0,
          positionY: 0,
          name: "城门",
          biome: "grassland",
          explorationLevel: 2,
        },
      });

      return { success: true, hero };
    }),

  // 召回英雄
  recallHero: publicProcedure
    .input(z.object({ heroId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      if (hero.status === "fighting") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "战斗中无法召回" });
      }

      await ctx.db.heroInstance.delete({ where: { id: input.heroId } });

      return { success: true };
    }),

  // 移动英雄
  moveHero: publicProcedure
    .input(
      z.object({
        heroId: z.string(),
        targetX: z.number(),
        targetY: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      if (hero.status === "fighting") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "战斗中无法移动" });
      }

      // 计算移动距离（只能移动到相邻格子）
      const dx = Math.abs(input.targetX - hero.positionX);
      const dy = Math.abs(input.targetY - hero.positionY);

      if (dx + dy !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "只能移动到相邻格子",
        });
      }

      // 检查体力
      const staminaCost = 5;
      if (hero.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 移动英雄
      await ctx.db.heroInstance.update({
        where: { id: input.heroId },
        data: {
          positionX: input.targetX,
          positionY: input.targetY,
          stamina: hero.stamina - staminaCost,
        },
      });

      // 探索新区域
      const biomes = ["grassland", "forest", "mountain", "desert", "swamp"];
      const randomBiome = biomes[Math.floor(Math.random() * biomes.length)]!;

      await ctx.db.exploredArea.upsert({
        where: {
          playerId_worldId_positionX_positionY: {
            playerId: player.id,
            worldId: "main",
            positionX: input.targetX,
            positionY: input.targetY,
          },
        },
        update: { explorationLevel: 2 },
        create: {
          playerId: player.id,
          worldId: "main",
          positionX: input.targetX,
          positionY: input.targetY,
          name: `区域 (${input.targetX}, ${input.targetY})`,
          biome: randomBiome,
          explorationLevel: 2,
        },
      });

      // 同时让相邻区域变为迷雾状态 (explorationLevel = 1)
      const neighbors = [
        [input.targetX - 1, input.targetY],
        [input.targetX + 1, input.targetY],
        [input.targetX, input.targetY - 1],
        [input.targetX, input.targetY + 1],
      ];

      for (const [nx, ny] of neighbors) {
        // 检查是否已存在
        const existing = await ctx.db.exploredArea.findUnique({
          where: {
            playerId_worldId_positionX_positionY: {
              playerId: player.id,
              worldId: "main",
              positionX: nx!,
              positionY: ny!,
            },
          },
        });

        if (!existing) {
          const neighborBiome =
            biomes[Math.floor(Math.random() * biomes.length)]!;
          await ctx.db.exploredArea.create({
            data: {
              playerId: player.id,
              worldId: "main",
              positionX: nx!,
              positionY: ny!,
              name: `未知区域`,
              biome: neighborBiome,
              explorationLevel: 1, // 迷雾状态
            },
          });
        }
      }

      return { success: true, newPosition: { x: input.targetX, y: input.targetY } };
    }),

  // 获取可见地图
  getVisibleMap: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
    }

    const player = await ctx.db.player.findFirst({ where: { userId } });
    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const exploredAreas = await ctx.db.exploredArea.findMany({
      where: { playerId: player.id, worldId: "main" },
    });

    const pois = await ctx.db.outerCityPOI.findMany();

    // 只返回已探索区域内的POI
    const visiblePois = pois.filter((poi) =>
      exploredAreas.some(
        (area) =>
          area.positionX === poi.positionX &&
          area.positionY === poi.positionY &&
          area.explorationLevel === 2
      )
    );

    return {
      areas: exploredAreas,
      pois: visiblePois,
    };
  }),

  // 与POI互动
  interactPOI: publicProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      // 检查英雄是否在POI位置
      if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
      }

      // 根据POI类型处理互动
      switch (poi.type) {
        case "resource": {
          // 资源点：直接获取资源
          if (poi.resourceType && poi.resourceAmount > 0) {
            const updateData: Record<string, number> = {};
            updateData[poi.resourceType] = poi.resourceAmount;

            await ctx.db.player.update({
              where: { id: player.id },
              data: {
                gold:
                  poi.resourceType === "gold"
                    ? player.gold + poi.resourceAmount
                    : player.gold,
                wood:
                  poi.resourceType === "wood"
                    ? player.wood + poi.resourceAmount
                    : player.wood,
                stone:
                  poi.resourceType === "stone"
                    ? player.stone + poi.resourceAmount
                    : player.stone,
                food:
                  poi.resourceType === "food"
                    ? player.food + poi.resourceAmount
                    : player.food,
              },
            });

            return {
              success: true,
              type: "resource",
              message: `获得 ${poi.resourceAmount} ${poi.resourceType}`,
            };
          }
          break;
        }
        case "garrison":
        case "lair": {
          // 驻军/巢穴：需要战斗
          if (poi.isDefeated) {
            return {
              success: false,
              type: "already_defeated",
              message: "该地点已被征服",
            };
          }
          // TODO: 触发战斗系统
          return {
            success: true,
            type: "combat",
            message: "发现敌人，准备战斗！",
            difficulty: poi.difficulty,
          };
        }
        case "settlement": {
          // 定居点：可交易
          return {
            success: true,
            type: "settlement",
            message: "发现友好定居点",
          };
        }
      }

      return { success: true, type: "unknown", message: "未知互动" };
    }),

  // 恢复英雄体力
  restHero: publicProcedure
    .input(z.object({ heroId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      // 获取内城建筑加成
      const cityBonuses = await getInnerCityBonuses(ctx.db, player.id);

      // 恢复体力需要消耗食物
      const foodCost = 10;
      const baseStaminaRestore = 30;
      const staminaRestore = baseStaminaRestore + cityBonuses.staminaBonus;

      if (player.food < foodCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "食物不足" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: { food: player.food - foodCost },
      });

      const newStamina = Math.min(100, hero.stamina + staminaRestore);
      await ctx.db.heroInstance.update({
        where: { id: input.heroId },
        data: { stamina: newStamina },
      });

      const bonusText = cityBonuses.staminaBonus > 0 ? ` (农田加成+${cityBonuses.staminaBonus})` : "";
      return {
        success: true,
        newStamina,
        message: `消耗 ${foodCost} 食物，恢复 ${staminaRestore} 体力${bonusText}`,
      };
    }),

  // ===== 外城战斗系统 =====

  // 开始战斗
  startCombat: publicProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      if (poi.type !== "garrison" && poi.type !== "lair" && poi.type !== "ruin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该地点无法战斗" });
      }

      if (poi.isDefeated) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该地点已被征服" });
      }

      if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
      }

      // 更新英雄状态
      await ctx.db.heroInstance.update({
        where: { id: hero.id },
        data: { status: "fighting" },
      });

      // 生成敌人数据
      const enemyLevel = poi.guardianLevel || poi.difficulty;
      const enemyHp = 50 + enemyLevel * 20;
      const enemyAtk = 8 + enemyLevel * 3;
      const enemyDef = 3 + enemyLevel * 2;

      const enemyNames: Record<string, string> = {
        garrison: "守卫",
        lair: "巢穴怪物",
        ruin: "遗迹守护者",
      };

      const enemyIcons: Record<string, string> = {
        garrison: "⚔️",
        lair: "🐺",
        ruin: "👻",
      };

      // 返回战斗初始状态
      return {
        success: true,
        combat: {
          heroId: hero.id,
          poiId: poi.id,
          turn: 1,
          hero: {
            name: hero.character.character.name,
            portrait: hero.character.character.portrait,
            hp: hero.character.hp,
            maxHp: hero.character.maxHp,
            attack: hero.character.attack,
            defense: hero.character.defense,
          },
          enemy: {
            name: `${enemyNames[poi.type] ?? "敌人"} Lv.${enemyLevel}`,
            icon: poi.icon || enemyIcons[poi.type] || "👹",
            hp: enemyHp,
            maxHp: enemyHp,
            attack: enemyAtk,
            defense: enemyDef,
            level: enemyLevel,
          },
          logs: [`战斗开始！${hero.character.character.name} 对阵 ${poi.name}`],
        },
      };
    }),

  // 战斗行动
  combatAction: publicProcedure
    .input(
      z.object({
        heroId: z.string(),
        poiId: z.string(),
        action: z.enum(["attack", "defend", "skill", "flee"]),
        // 战斗状态（由前端传递）
        heroHp: z.number(),
        enemyHp: z.number(),
        turn: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      const logs: string[] = [];
      let heroHp = input.heroHp;
      let enemyHp = input.enemyHp;
      let turn = input.turn;

      // 获取内城建筑加成
      const cityBonuses = await getInnerCityBonuses(ctx.db, player.id);

      // 应用内城加成到战斗属性
      const heroBaseAtk = hero.character.attack;
      const heroBaseDef = hero.character.defense;
      const heroAtk = Math.floor(heroBaseAtk * (1 + cityBonuses.attackBonus));
      const heroDef = Math.floor(heroBaseDef * (1 + cityBonuses.defenseBonus));

      const enemyLevel = poi.guardianLevel || poi.difficulty;
      const enemyAtk = 8 + enemyLevel * 3;
      const enemyDef = 3 + enemyLevel * 2;

      // 显示加成信息（仅首回合）
      if (turn === 1 && (cityBonuses.attackBonus > 0 || cityBonuses.defenseBonus > 0)) {
        const bonusInfo: string[] = [];
        if (cityBonuses.attackBonus > 0) bonusInfo.push(`攻击+${Math.floor(cityBonuses.attackBonus * 100)}%`);
        if (cityBonuses.defenseBonus > 0) bonusInfo.push(`防御+${Math.floor(cityBonuses.defenseBonus * 100)}%`);
        logs.push(`内城加成: ${bonusInfo.join(", ")}`);
      }

      // 处理逃跑
      if (input.action === "flee") {
        const fleeChance = 0.5 + (hero.character.speed / 100) * 0.3;
        if (Math.random() < fleeChance) {
          await ctx.db.heroInstance.update({
            where: { id: hero.id },
            data: { status: "idle" },
          });
          return {
            success: true,
            result: "fled",
            logs: ["成功逃离战斗！"],
            heroHp,
            enemyHp,
            turn,
          };
        } else {
          logs.push("逃跑失败！");
          // 敌人攻击
          const damage = Math.max(1, enemyAtk - heroDef);
          heroHp -= damage;
          logs.push(`敌人攻击造成 ${damage} 伤害`);
        }
      } else {
        // 英雄行动
        if (input.action === "attack") {
          const damage = Math.max(1, heroAtk - enemyDef);
          const crit = Math.random() < 0.15;
          const finalDamage = crit ? Math.floor(damage * 1.5) : damage;
          enemyHp -= finalDamage;
          logs.push(`${hero.character.character.name} 攻击造成 ${finalDamage} 伤害${crit ? "（暴击！）" : ""}`);
        } else if (input.action === "defend") {
          logs.push(`${hero.character.character.name} 进入防御姿态`);
        } else if (input.action === "skill") {
          const damage = Math.max(1, Math.floor(heroAtk * 1.5) - enemyDef);
          enemyHp -= damage;
          logs.push(`${hero.character.character.name} 使用技能造成 ${damage} 伤害！`);
        }

        // 敌人反击（如果还活着）
        if (enemyHp > 0) {
          const defendMod = input.action === "defend" ? 0.5 : 1;
          const damage = Math.max(1, Math.floor((enemyAtk - heroDef) * defendMod));
          heroHp -= damage;
          logs.push(`敌人反击造成 ${damage} 伤害${input.action === "defend" ? "（已减半）" : ""}`);
        }
      }

      turn++;

      // 检查战斗结果
      if (enemyHp <= 0) {
        // 胜利
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { status: "idle" },
        });

        // 标记POI已征服
        await ctx.db.outerCityPOI.update({
          where: { id: poi.id },
          data: {
            isDefeated: true,
            defeatedAt: new Date(),
            respawnsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后刷新
          },
        });

        // 给予奖励 - 遗迹有额外宝藏
        let goldReward = 20 + enemyLevel * 10;
        let expReward = 10 + enemyLevel * 5;
        let crystalsReward = 0;
        let extraMessage = "";

        if (poi.type === "ruin") {
          // 遗迹宝藏
          if (poi.resourceType === "gold") {
            goldReward += poi.resourceAmount ?? 0;
            extraMessage = `，发现宝藏 ${poi.resourceAmount} 金币`;
          } else if (poi.resourceType === "crystals") {
            crystalsReward = poi.resourceAmount ?? 0;
            extraMessage = `，发现 ${crystalsReward} 水晶`;
          }
        }

        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + goldReward,
            exp: player.exp + expReward,
            crystals: player.crystals + crystalsReward,
          },
        });

        // 更新角色经验
        await ctx.db.playerCharacter.update({
          where: { id: hero.characterId },
          data: {
            exp: hero.character.exp + expReward,
          },
        });

        logs.push(`胜利！获得 ${goldReward} 金币，${expReward} 经验${extraMessage}`);

        return {
          success: true,
          result: "victory",
          logs,
          heroHp: Math.max(0, heroHp),
          enemyHp: 0,
          turn,
          rewards: { gold: goldReward, exp: expReward, crystals: crystalsReward },
        };
      }

      if (heroHp <= 0) {
        // 失败
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { status: "idle", stamina: Math.max(0, hero.stamina - 30) },
        });

        // 更新角色HP
        await ctx.db.playerCharacter.update({
          where: { id: hero.characterId },
          data: { hp: Math.floor(hero.character.maxHp * 0.3) },
        });

        logs.push("战斗失败...英雄撤退");

        return {
          success: true,
          result: "defeat",
          logs,
          heroHp: 0,
          enemyHp,
          turn,
        };
      }

      // 战斗继续
      return {
        success: true,
        result: "ongoing",
        logs,
        heroHp,
        enemyHp,
        turn,
      };
    }),

  // ===== POI资源采集 =====

  // 采集资源
  harvestResource: publicProcedure
    .input(z.object({ heroId: z.string(), poiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
      }

      const player = await ctx.db.player.findFirst({ where: { userId } });
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const hero = await ctx.db.heroInstance.findFirst({
        where: { id: input.heroId, playerId: player.id },
        include: {
          character: {
            include: { character: true },
          },
        },
      });

      if (!hero) {
        throw new TRPCError({ code: "NOT_FOUND", message: "英雄不存在" });
      }

      const poi = await ctx.db.outerCityPOI.findUnique({
        where: { id: input.poiId },
      });

      if (!poi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "兴趣点不存在" });
      }

      if (poi.type !== "resource" && poi.type !== "shrine" && poi.type !== "caravan") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该地点无法互动" });
      }

      if (hero.positionX !== poi.positionX || hero.positionY !== poi.positionY) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "英雄不在该位置" });
      }

      // ===== 神殿：祈祷获得buff =====
      if (poi.type === "shrine") {
        const staminaCost = 5;
        if (hero.stamina < staminaCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
        }

        // 消耗体力
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: hero.stamina - staminaCost },
        });

        // 根据神殿类型给予不同buff
        let message = "";
        if (poi.resourceType === "stamina") {
          // 恢复英雄体力
          const restoreAmount = poi.resourceAmount ?? 30;
          const newStamina = Math.min(100, hero.stamina - staminaCost + restoreAmount);
          await ctx.db.heroInstance.update({
            where: { id: hero.id },
            data: { stamina: newStamina },
          });
          message = `神殿祝福！恢复 ${restoreAmount} 体力`;
        } else if (poi.resourceType === "attack") {
          // 临时增加攻击力 - 更新角色基础攻击
          const boostAmount = poi.resourceAmount ?? 5;
          await ctx.db.playerCharacter.update({
            where: { id: hero.characterId },
            data: { attack: hero.character.attack + boostAmount },
          });
          message = `战神祝福！攻击力+${boostAmount}`;
        } else {
          message = "获得神殿祝福";
        }

        return {
          success: true,
          harvested: 0,
          resourceType: poi.resourceType,
          remaining: 0,
          message,
        };
      }

      // ===== 商队：随机交易 =====
      if (poi.type === "caravan") {
        const staminaCost = 5;
        if (hero.stamina < staminaCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
        }

        // 消耗体力
        await ctx.db.heroInstance.update({
          where: { id: hero.id },
          data: { stamina: hero.stamina - staminaCost },
        });

        // 获取内城建筑加成
        const cityBonuses = await getInnerCityBonuses(ctx.db, player.id);

        // 随机交易 - 用金币换取其他资源
        const tradeOptions = [
          { give: "gold", giveAmount: 50, receive: "wood", receiveAmount: 30 },
          { give: "gold", giveAmount: 50, receive: "stone", receiveAmount: 25 },
          { give: "gold", giveAmount: 30, receive: "food", receiveAmount: 40 },
          { give: "wood", giveAmount: 40, receive: "gold", receiveAmount: 30 },
          { give: "stone", giveAmount: 30, receive: "gold", receiveAmount: 40 },
        ];

        const trade = tradeOptions[Math.floor(Math.random() * tradeOptions.length)]!;

        // 应用市场加成到交易收益
        const bonusReceive = Math.floor(trade.receiveAmount * cityBonuses.tradeBonus);
        const finalReceiveAmount = trade.receiveAmount + bonusReceive;

        // 检查玩家是否有足够资源
        const giveKey = trade.give as keyof typeof player;
        const playerResource = player[giveKey] as number;
        if (playerResource < trade.giveAmount) {
          return {
            success: false,
            harvested: 0,
            resourceType: "trade",
            remaining: 0,
            message: `商人想要 ${trade.giveAmount} ${trade.give}，但你没有足够资源`,
          };
        }

        // 执行交易
        const updates: Record<string, number> = {};
        updates[trade.give] = playerResource - trade.giveAmount;
        const receiveKey = trade.receive as keyof typeof player;
        updates[trade.receive] = (player[receiveKey] as number) + finalReceiveAmount;

        await ctx.db.player.update({
          where: { id: player.id },
          data: updates,
        });

        const bonusText = bonusReceive > 0 ? ` (市场加成+${bonusReceive})` : "";
        return {
          success: true,
          harvested: finalReceiveAmount,
          resourceType: trade.receive,
          remaining: 0,
          message: `交易完成！用 ${trade.giveAmount} ${trade.give} 换取 ${finalReceiveAmount} ${trade.receive}${bonusText}`,
        };
      }

      // ===== 资源点：采集资源 =====
      // 检查资源是否可采集
      if (poi.resourceAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "资源已耗尽" });
      }

      // 检查体力
      const staminaCost = 10;
      if (hero.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      // 采集资源
      const harvestAmount = Math.min(poi.resourceAmount, 10 + Math.floor(Math.random() * 10));

      // 更新玩家资源
      const resourceUpdates: Record<string, number> = {};
      if (poi.resourceType === "gold") resourceUpdates.gold = player.gold + harvestAmount;
      if (poi.resourceType === "wood") resourceUpdates.wood = player.wood + harvestAmount;
      if (poi.resourceType === "stone") resourceUpdates.stone = player.stone + harvestAmount;
      if (poi.resourceType === "food") resourceUpdates.food = player.food + harvestAmount;

      await ctx.db.player.update({
        where: { id: player.id },
        data: resourceUpdates,
      });

      // 减少POI资源量
      await ctx.db.outerCityPOI.update({
        where: { id: poi.id },
        data: {
          resourceAmount: poi.resourceAmount - harvestAmount,
        },
      });

      // 消耗英雄体力
      await ctx.db.heroInstance.update({
        where: { id: hero.id },
        data: { stamina: hero.stamina - staminaCost },
      });

      return {
        success: true,
        harvested: harvestAmount,
        resourceType: poi.resourceType,
        remaining: poi.resourceAmount - harvestAmount,
        message: `采集了 ${harvestAmount} ${poi.resourceType}`,
      };
    }),

  // 刷新资源（定时任务或手动触发）
  refreshResources: publicProcedure.mutation(async ({ ctx }) => {
    // 刷新所有资源点
    const resourcePOIs = await ctx.db.outerCityPOI.findMany({
      where: { type: "resource" },
    });

    let refreshed = 0;
    for (const poi of resourcePOIs) {
      // 基础刷新量
      const baseAmount = poi.difficulty * 20;
      if (poi.resourceAmount < baseAmount) {
        await ctx.db.outerCityPOI.update({
          where: { id: poi.id },
          data: { resourceAmount: baseAmount },
        });
        refreshed++;
      }
    }

    // 刷新已征服的驻军/巢穴
    const now = new Date();
    const defeatedPOIs = await ctx.db.outerCityPOI.findMany({
      where: {
        isDefeated: true,
        respawnsAt: { lte: now },
      },
    });

    for (const poi of defeatedPOIs) {
      await ctx.db.outerCityPOI.update({
        where: { id: poi.id },
        data: {
          isDefeated: false,
          defeatedAt: null,
          respawnsAt: null,
        },
      });
      refreshed++;
    }

    return { success: true, refreshed };
  }),
});
