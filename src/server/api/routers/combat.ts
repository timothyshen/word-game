import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCurrentGameDay } from "../utils";

// 怪物模板
interface Monster {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: Array<{
    name: string;
    damage: number;
    effect?: string;
    cooldown: number;
    currentCooldown: number;
  }>;
  rewards: {
    exp: number;
    gold: number;
    cardChance: number;
    cardRarity: string;
  };
}

// 玩家战斗单位
interface PlayerUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  buffs: Array<{ name: string; turns: number; effect: string }>;
}

// 生成怪物
function generateMonster(level: number, type?: string): Monster {
  const monsters = [
    { name: "野狼", icon: "🐺", baseHp: 40, baseAtk: 12, baseDef: 4, baseSpd: 8 },
    { name: "山贼", icon: "🗡️", baseHp: 60, baseAtk: 15, baseDef: 6, baseSpd: 5 },
    { name: "哥布林", icon: "👺", baseHp: 35, baseAtk: 10, baseDef: 3, baseSpd: 10 },
    { name: "骷髅兵", icon: "💀", baseHp: 50, baseAtk: 18, baseDef: 8, baseSpd: 4 },
    { name: "食人魔", icon: "👹", baseHp: 80, baseAtk: 20, baseDef: 10, baseSpd: 3 },
    { name: "暗影刺客", icon: "🥷", baseHp: 45, baseAtk: 22, baseDef: 5, baseSpd: 12 },
  ];

  const chosen = type
    ? monsters.find(m => m.name === type) ?? monsters[0]!
    : monsters[Math.floor(Math.random() * monsters.length)]!;

  const levelMult = 1 + (level - 1) * 0.25;
  const hp = Math.floor(chosen.baseHp * levelMult);

  return {
    id: `monster_${Date.now()}`,
    name: chosen.name,
    icon: chosen.icon,
    level,
    maxHp: hp,
    hp,
    attack: Math.floor(chosen.baseAtk * levelMult),
    defense: Math.floor(chosen.baseDef * levelMult),
    speed: Math.floor(chosen.baseSpd * levelMult),
    skills: [
      { name: "普通攻击", damage: 1.0, cooldown: 0, currentCooldown: 0 },
      { name: "猛击", damage: 1.5, cooldown: 3, currentCooldown: 0 },
    ],
    rewards: {
      exp: 15 * level,
      gold: 10 * level,
      cardChance: 0.1 + level * 0.03,
      cardRarity: level >= 5 ? "稀有" : level >= 3 ? "精良" : "普通",
    },
  };
}

// 计算伤害
function calculateDamage(
  attackPower: number,
  defense: number,
  multiplier: number = 1.0,
  isCritical: boolean = false
): number {
  const baseDamage = Math.max(1, attackPower - defense * 0.5);
  const critMult = isCritical ? 1.5 : 1.0;
  const variance = 0.9 + Math.random() * 0.2;
  return Math.floor(baseDamage * multiplier * critMult * variance);
}

export const combatRouter = createTRPCRouter({
  // 开始战斗
  startCombat: protectedProcedure
    .input(z.object({
      monsterLevel: z.number().min(1).max(100).default(1),
      monsterType: z.string().optional(),
      characterId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: {
          characters: {
            include: { character: true },
            where: input.characterId ? { id: input.characterId } : undefined,
          },
        },
      });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      // 检查是否有进行中的战斗
      const existingCombat = await ctx.db.combatSession.findFirst({
        where: { playerId: player.id, status: "active" },
      });

      if (existingCombat) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已有进行中的战斗" });
      }

      // 检查体力
      const staminaCost = 15;
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

      // 获取战斗角色属性
      let playerUnit: PlayerUnit = {
        id: player.id,
        name: player.name,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: player.strength * 2,
        defense: player.agility,
        speed: player.agility,
        buffs: [],
      };

      if (input.characterId && player.characters.length > 0) {
        const char = player.characters[0]!;
        playerUnit = {
          id: char.id,
          name: char.character.name,
          hp: char.hp,
          maxHp: char.maxHp,
          mp: char.mp,
          maxMp: char.maxMp,
          attack: char.attack,
          defense: char.defense,
          speed: char.speed,
          buffs: [],
        };
      }

      const monster = generateMonster(input.monsterLevel, input.monsterType);
      const initialLog = [`⚔️ 战斗开始！你遭遇了 Lv.${monster.level} ${monster.name}！`];

      // 创建战斗会话（持久化到数据库）
      const combatSession = await ctx.db.combatSession.create({
        data: {
          playerId: player.id,
          status: "active",
          currentTurn: 1,
          playerTeam: JSON.stringify([playerUnit]),
          enemyTeam: JSON.stringify([monster]),
          combatType: "normal",
          areaLevel: input.monsterLevel,
          logs: JSON.stringify(initialLog),
          rewards: JSON.stringify(monster.rewards),
        },
      });

      return {
        combatId: combatSession.id,
        monster: {
          name: monster.name,
          icon: monster.icon,
          level: monster.level,
          hp: monster.hp,
          maxHp: monster.maxHp,
        },
        playerHp: playerUnit.hp,
        playerMaxHp: playerUnit.maxHp,
        playerMp: playerUnit.mp,
        playerMaxMp: playerUnit.maxMp,
        turn: 1,
        log: initialLog,
      };
    }),

  // 获取战斗状态
  getCombatStatus: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const player = await ctx.db.player.findUnique({ where: { userId } });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const combat = await ctx.db.combatSession.findFirst({
        where: { id: input.combatId, playerId: player.id },
      });

      if (!combat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      const playerTeam = JSON.parse(combat.playerTeam) as PlayerUnit[];
      const enemyTeam = JSON.parse(combat.enemyTeam) as Monster[];
      const logs = JSON.parse(combat.logs) as string[];
      const playerUnit = playerTeam[0]!;
      const monster = enemyTeam[0]!;

      return {
        monster: {
          name: monster.name,
          icon: monster.icon,
          level: monster.level,
          hp: monster.hp,
          maxHp: monster.maxHp,
        },
        playerHp: playerUnit.hp,
        playerMaxHp: playerUnit.maxHp,
        playerMp: playerUnit.mp,
        playerMaxMp: playerUnit.maxMp,
        turn: combat.currentTurn,
        status: combat.status,
        log: logs.slice(-10),
        playerBuffs: playerUnit.buffs,
      };
    }),

  // 获取当前活动的战斗
  getActiveCombat: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const player = await ctx.db.player.findUnique({ where: { userId } });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const combat = await ctx.db.combatSession.findFirst({
      where: { playerId: player.id, status: "active" },
    });

    if (!combat) {
      return null;
    }

    const playerTeam = JSON.parse(combat.playerTeam) as PlayerUnit[];
    const enemyTeam = JSON.parse(combat.enemyTeam) as Monster[];
    const playerUnit = playerTeam[0]!;
    const monster = enemyTeam[0]!;

    return {
      combatId: combat.id,
      monster: {
        name: monster.name,
        icon: monster.icon,
        level: monster.level,
        hp: monster.hp,
        maxHp: monster.maxHp,
      },
      playerHp: playerUnit.hp,
      playerMaxHp: playerUnit.maxHp,
      playerMp: playerUnit.mp,
      playerMaxMp: playerUnit.maxMp,
      turn: combat.currentTurn,
    };
  }),

  // 获取可用行动选项
  getActions: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const player = await ctx.db.player.findUnique({ where: { userId } });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const combat = await ctx.db.combatSession.findFirst({
        where: { id: input.combatId, playerId: player.id },
      });

      if (!combat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      if (combat.status !== "active") {
        return { actions: [] };
      }

      const playerTeam = JSON.parse(combat.playerTeam) as PlayerUnit[];
      const playerUnit = playerTeam[0]!;

      const actions = [
        { id: "attack", name: "攻击", description: "对敌人造成物理伤害", icon: "⚔️", mpCost: 0 },
        { id: "heavy_attack", name: "重击", description: "造成1.5倍伤害，但下回合防御降低", icon: "💥", mpCost: 10 },
        { id: "defend", name: "防御", description: "本回合受到的伤害减半，回复少量MP", icon: "🛡️", mpCost: 0 },
        { id: "skill_fire", name: "火焰术", description: "造成魔法伤害并附加灼烧", icon: "🔥", mpCost: 20 },
        { id: "skill_heal", name: "治疗术", description: "回复30%最大生命值", icon: "💚", mpCost: 25 },
        { id: "flee", name: "逃跑", description: "尝试逃离战斗（50%成功率）", icon: "🏃", mpCost: 0 },
      ];

      return {
        actions: actions.map(a => ({
          ...a,
          disabled: a.mpCost > playerUnit.mp,
        })),
      };
    }),

  // 执行行动
  executeAction: protectedProcedure
    .input(z.object({
      combatId: z.string(),
      actionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const player = await ctx.db.player.findUnique({ where: { userId } });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const combat = await ctx.db.combatSession.findFirst({
        where: { id: input.combatId, playerId: player.id },
      });

      if (!combat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      if (combat.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });
      }

      const playerTeam = JSON.parse(combat.playerTeam) as PlayerUnit[];
      const enemyTeam = JSON.parse(combat.enemyTeam) as Monster[];
      const logs = JSON.parse(combat.logs) as string[];
      const rewards = JSON.parse(combat.rewards) as Monster["rewards"];

      const playerUnit = playerTeam[0]!;
      const monster = enemyTeam[0]!;

      const newLogs: string[] = [];
      let playerDefending = false;
      let actionUsed = false;

      // 玩家行动
      switch (input.actionId) {
        case "attack": {
          const isCrit = Math.random() < 0.15;
          const damage = calculateDamage(playerUnit.attack, monster.defense, 1.0, isCrit);
          monster.hp -= damage;
          newLogs.push(`你发起攻击，${isCrit ? "暴击！" : ""}对${monster.name}造成 ${damage} 点伤害`);
          actionUsed = true;
          break;
        }

        case "heavy_attack": {
          if (playerUnit.mp < 10) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          playerUnit.mp -= 10;
          const isCrit = Math.random() < 0.2;
          const damage = calculateDamage(playerUnit.attack, monster.defense, 1.5, isCrit);
          monster.hp -= damage;
          newLogs.push(`你使出重击！${isCrit ? "暴击！" : ""}对${monster.name}造成 ${damage} 点伤害`);
          playerUnit.buffs.push({ name: "破绽", turns: 1, effect: "defense_down" });
          actionUsed = true;
          break;
        }

        case "defend": {
          playerDefending = true;
          playerUnit.mp = Math.min(playerUnit.maxMp, playerUnit.mp + 10);
          newLogs.push("你采取防御姿态，准备承受敌人的攻击，MP恢复10点");
          actionUsed = true;
          break;
        }

        case "skill_fire": {
          if (playerUnit.mp < 20) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          playerUnit.mp -= 20;
          const damage = calculateDamage(player.intellect * 2.5, monster.defense * 0.5, 1.0, false);
          monster.hp -= damage;
          newLogs.push(`你释放火焰术！对${monster.name}造成 ${damage} 点魔法伤害`);
          actionUsed = true;
          break;
        }

        case "skill_heal": {
          if (playerUnit.mp < 25) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          playerUnit.mp -= 25;
          const healAmount = Math.floor(playerUnit.maxHp * 0.3);
          playerUnit.hp = Math.min(playerUnit.maxHp, playerUnit.hp + healAmount);
          newLogs.push(`你使用治疗术，恢复了 ${healAmount} 点生命值`);
          actionUsed = true;
          break;
        }

        case "flee": {
          const fleeSuccess = Math.random() < 0.5;
          if (fleeSuccess) {
            newLogs.push("你成功逃离了战斗！");

            await ctx.db.combatSession.update({
              where: { id: combat.id },
              data: {
                status: "fled",
                logs: JSON.stringify([...logs, ...newLogs]),
                playerTeam: JSON.stringify(playerTeam),
              },
            });

            return {
              success: true,
              status: "fled",
              message: "成功逃跑",
              log: newLogs,
              playerHp: playerUnit.hp,
              playerMp: playerUnit.mp,
              monsterHp: monster.hp,
            };
          } else {
            newLogs.push("逃跑失败！敌人追了上来...");
            actionUsed = true;
          }
          break;
        }
      }

      // 检查怪物是否死亡
      if (monster.hp <= 0) {
        newLogs.push(`🎉 战斗胜利！你击败了 ${monster.name}！`);

        // 发放奖励
        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            exp: player.exp + rewards.exp,
            combatWins: player.combatWins + 1,
            totalGoldEarned: player.totalGoldEarned + rewards.gold,
          },
        });
        newLogs.push(`获得：${rewards.gold} 金币，${rewards.exp} 经验`);

        // 记录战斗分数
        await ctx.db.actionLog.create({
          data: {
            playerId: player.id,
            day: getCurrentGameDay(),
            type: "combat",
            description: `击败了 Lv.${monster.level} ${monster.name}`,
            baseScore: 20 * monster.level,
            bonus: monster.level >= 5 ? 30 : 0,
            bonusReason: monster.level >= 5 ? "击败强敌" : undefined,
          },
        });

        // 卡牌掉落
        if (Math.random() < rewards.cardChance) {
          const cards = await ctx.db.card.findMany({
            where: { rarity: rewards.cardRarity },
          });
          if (cards.length > 0) {
            const card = cards[Math.floor(Math.random() * cards.length)]!;
            const existing = await ctx.db.playerCard.findUnique({
              where: { playerId_cardId: { playerId: player.id, cardId: card.id } },
            });
            if (existing) {
              await ctx.db.playerCard.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + 1 },
              });
            } else {
              await ctx.db.playerCard.create({
                data: { playerId: player.id, cardId: card.id, quantity: 1 },
              });
            }
            newLogs.push(`🃏 获得卡牌：${card.name}（${card.rarity}）`);
          }
        }

        await ctx.db.combatSession.update({
          where: { id: combat.id },
          data: {
            status: "victory",
            logs: JSON.stringify([...logs, ...newLogs]),
            playerTeam: JSON.stringify(playerTeam),
            enemyTeam: JSON.stringify(enemyTeam),
          },
        });

        return {
          success: true,
          status: "victory",
          message: "战斗胜利",
          log: newLogs,
          rewards: { gold: rewards.gold, exp: rewards.exp },
          playerHp: playerUnit.hp,
          playerMp: playerUnit.mp,
          monsterHp: 0,
        };
      }

      // 怪物行动
      if (actionUsed) {
        const availableSkills = monster.skills.filter(s => s.currentCooldown === 0);
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]!;

        let monsterDamage = calculateDamage(monster.attack, playerUnit.defense, skill.damage);

        if (playerDefending) {
          monsterDamage = Math.floor(monsterDamage * 0.5);
          newLogs.push(`你的防御抵消了部分伤害`);
        }

        const hasWeakness = playerUnit.buffs.some(b => b.effect === "defense_down");
        if (hasWeakness) {
          monsterDamage = Math.floor(monsterDamage * 1.3);
          newLogs.push(`由于破绽，你受到了额外伤害`);
        }

        playerUnit.hp -= monsterDamage;
        newLogs.push(`${monster.name}使用${skill.name}，对你造成 ${monsterDamage} 点伤害`);

        if (skill.cooldown > 0) {
          skill.currentCooldown = skill.cooldown;
        }

        monster.skills.forEach(s => {
          if (s.currentCooldown > 0) s.currentCooldown--;
        });
      }

      // 处理玩家buff
      playerUnit.buffs = playerUnit.buffs.filter(b => {
        b.turns--;
        return b.turns > 0;
      });

      // 检查玩家是否死亡
      if (playerUnit.hp <= 0) {
        newLogs.push("💀 你被击败了...");

        await ctx.db.combatSession.update({
          where: { id: combat.id },
          data: {
            status: "defeat",
            logs: JSON.stringify([...logs, ...newLogs]),
            playerTeam: JSON.stringify(playerTeam),
            enemyTeam: JSON.stringify(enemyTeam),
          },
        });

        return {
          success: true,
          status: "defeat",
          message: "战斗失败",
          log: newLogs,
          playerHp: 0,
          playerMp: playerUnit.mp,
          monsterHp: monster.hp,
        };
      }

      // 回合结束
      const newTurn = combat.currentTurn + 1;

      await ctx.db.combatSession.update({
        where: { id: combat.id },
        data: {
          currentTurn: newTurn,
          logs: JSON.stringify([...logs, ...newLogs]),
          playerTeam: JSON.stringify(playerTeam),
          enemyTeam: JSON.stringify(enemyTeam),
        },
      });

      return {
        success: true,
        status: "active",
        message: `回合 ${combat.currentTurn} 结束`,
        log: newLogs,
        playerHp: playerUnit.hp,
        playerMp: playerUnit.mp,
        monsterHp: monster.hp,
        turn: newTurn,
      };
    }),

  // 结束战斗（清理状态）
  endCombat: protectedProcedure
    .input(z.object({ combatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const player = await ctx.db.player.findUnique({ where: { userId } });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const combat = await ctx.db.combatSession.findFirst({
        where: { id: input.combatId, playerId: player.id },
      });

      if (combat && combat.status === "active") {
        await ctx.db.combatSession.update({
          where: { id: combat.id },
          data: { status: "fled" },
        });
      }

      return { success: true };
    }),

  // 获取战斗历史
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const player = await ctx.db.player.findUnique({ where: { userId } });

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
      }

      const combats = await ctx.db.combatSession.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return combats.map(c => {
        const enemyTeam = JSON.parse(c.enemyTeam) as Monster[];
        const monster = enemyTeam[0]!;

        return {
          id: c.id,
          status: c.status,
          monsterName: monster.name,
          monsterLevel: monster.level,
          turns: c.currentTurn,
          createdAt: c.createdAt,
        };
      });
    }),
});
