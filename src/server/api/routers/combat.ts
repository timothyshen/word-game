import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCurrentGameDay } from "../utils";
import {
  calculateDamage,
  resolveSkillEffect,
  tickBuffs,
  getBuffedStat,
  parseSkillEffects,
  parseSkillLevelData,
  parseMonsterConfig,
} from "~/shared/effects";
import type {
  CombatUnit,
  CombatBuff,
  CombatAction,
  SkillEffect,
  MonsterConfig,
} from "~/shared/effects";

// Serialized monster format (stored in combat session)
interface SerializedMonster {
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
    effects: SkillEffect[];
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

// Default monster templates (fallback when no DB config exists)
const DEFAULT_MONSTERS = [
  { name: "野狼", icon: "🐺", baseHp: 40, baseAtk: 12, baseDef: 4, baseSpd: 8 },
  { name: "山贼", icon: "🗡️", baseHp: 60, baseAtk: 15, baseDef: 6, baseSpd: 5 },
  { name: "哥布林", icon: "👺", baseHp: 35, baseAtk: 10, baseDef: 3, baseSpd: 10 },
  { name: "骷髅兵", icon: "💀", baseHp: 50, baseAtk: 18, baseDef: 8, baseSpd: 4 },
  { name: "食人魔", icon: "👹", baseHp: 80, baseAtk: 20, baseDef: 10, baseSpd: 3 },
  { name: "暗影刺客", icon: "🥷", baseHp: 45, baseAtk: 22, baseDef: 5, baseSpd: 12 },
];

// Default combat actions (always available)
const BASE_ACTIONS: CombatAction[] = [
  {
    id: "attack", name: "攻击", description: "对敌人造成物理伤害", icon: "⚔️",
    mpCost: 0, cooldown: 0, currentCooldown: 0,
    effects: [{ type: "damage", damageType: "physical", multiplier: 1.0 }],
  },
  {
    id: "heavy_attack", name: "重击", description: "造成1.5倍伤害，但下回合防御降低", icon: "💥",
    mpCost: 10, cooldown: 0, currentCooldown: 0,
    effects: [
      { type: "damage", damageType: "physical", multiplier: 1.5 },
      { type: "buff", target: "self", modifiers: [{ stat: "defense", value: -0.3, type: "percent" }], duration: 1 },
    ],
  },
  {
    id: "defend", name: "防御", description: "本回合受到的伤害减半，回复少量MP", icon: "🛡️",
    mpCost: 0, cooldown: 0, currentCooldown: 0,
    effects: [
      { type: "buff", target: "self", modifiers: [{ stat: "damageReduction", value: 0.5, type: "flat" }], duration: 1 },
      { type: "heal", healType: "mp", target: "self", amount: 10, isPercent: false },
    ],
  },
  {
    id: "skill_fire", name: "火焰术", description: "造成魔法伤害并附加灼烧", icon: "🔥",
    mpCost: 20, cooldown: 0, currentCooldown: 0,
    effects: [{ type: "damage", damageType: "magic", multiplier: 1.0, element: "fire" }],
  },
  {
    id: "skill_heal", name: "治疗术", description: "回复30%最大生命值", icon: "💚",
    mpCost: 25, cooldown: 0, currentCooldown: 0,
    effects: [{ type: "heal", healType: "hp", target: "self", amount: 0.3, isPercent: true }],
  },
  {
    id: "flee", name: "逃跑", description: "尝试逃离战斗（50%成功率）", icon: "🏃",
    mpCost: 0, cooldown: 0, currentCooldown: 0,
    effects: [{ type: "flee", successRate: 0.5 }],
  },
];

function generateMonster(level: number, type?: string, config?: MonsterConfig | null): SerializedMonster {
  // Use DB monster config if provided
  if (config) {
    const levelMult = 1 + (level - 1) * 0.25;
    return {
      id: `monster_${Date.now()}`,
      name: config.name,
      icon: config.icon,
      level,
      maxHp: Math.floor(config.hp * levelMult),
      hp: Math.floor(config.hp * levelMult),
      attack: Math.floor(config.attack * levelMult),
      defense: Math.floor(config.defense * levelMult),
      speed: Math.floor(config.speed * levelMult),
      skills: config.skills.map(s => ({
        name: s.name,
        effects: s.effects,
        cooldown: s.cooldown,
        currentCooldown: 0,
      })),
      rewards: {
        exp: 15 * level,
        gold: 10 * level,
        cardChance: 0.1 + level * 0.03,
        cardRarity: level >= 5 ? "稀有" : level >= 3 ? "精良" : "普通",
      },
    };
  }

  // Fallback to default templates
  const chosen = type
    ? DEFAULT_MONSTERS.find(m => m.name === type) ?? DEFAULT_MONSTERS[0]!
    : DEFAULT_MONSTERS[Math.floor(Math.random() * DEFAULT_MONSTERS.length)]!;

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
      {
        name: "普通攻击",
        effects: [{ type: "damage", damageType: "physical", multiplier: 1.0 }],
        cooldown: 0,
        currentCooldown: 0,
      },
      {
        name: "猛击",
        effects: [{ type: "damage", damageType: "physical", multiplier: 1.5 }],
        cooldown: 3,
        currentCooldown: 0,
      },
    ],
    rewards: {
      exp: 15 * level,
      gold: 10 * level,
      cardChance: 0.1 + level * 0.03,
      cardRarity: level >= 5 ? "稀有" : level >= 3 ? "精良" : "普通",
    },
  };
}

function monsterToCombatUnit(m: SerializedMonster): CombatUnit {
  return {
    id: m.id, name: m.name,
    hp: m.hp, maxHp: m.maxHp, mp: 0, maxMp: 0,
    attack: m.attack, defense: m.defense, speed: m.speed,
    luck: 5, intellect: 5, buffs: [],
  };
}

export const combatRouter = createTRPCRouter({
  startCombat: protectedProcedure
    .input(z.object({
      monsterLevel: z.number().min(1).max(100).default(1),
      monsterType: z.string().optional(),
      monsterConfigJson: z.string().optional(),
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

      const existingCombat = await ctx.db.combatSession.findFirst({
        where: { playerId: player.id, status: "active" },
      });

      if (existingCombat) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已有进行中的战斗" });
      }

      const staminaCost = 15;
      if (player.stamina < staminaCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: {
          stamina: player.stamina - staminaCost,
          lastStaminaUpdate: new Date(),
        },
      });

      // Build player combat unit
      let playerUnit: CombatUnit = {
        id: player.id,
        name: player.name,
        hp: 100, maxHp: 100,
        mp: 50, maxMp: 50,
        attack: player.strength * 2,
        defense: player.agility,
        speed: player.agility,
        luck: 5, intellect: player.intellect,
        buffs: [],
      };

      if (input.characterId && player.characters.length > 0) {
        const char = player.characters[0]!;
        playerUnit = {
          id: char.id,
          name: char.character.name,
          hp: char.hp, maxHp: char.maxHp,
          mp: char.mp, maxMp: char.maxMp,
          attack: char.attack, defense: char.defense,
          speed: char.speed, luck: 5, intellect: 10,
          buffs: [],
        };
      }

      const monsterConfig = input.monsterConfigJson
        ? parseMonsterConfig(input.monsterConfigJson)
        : null;
      const monster = generateMonster(input.monsterLevel, input.monsterType, monsterConfig);
      const initialLog = [`⚔️ 战斗开始！你遭遇了 Lv.${monster.level} ${monster.name}！`];

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
          name: monster.name, icon: monster.icon,
          level: monster.level, hp: monster.hp, maxHp: monster.maxHp,
        },
        playerHp: playerUnit.hp, playerMaxHp: playerUnit.maxHp,
        playerMp: playerUnit.mp, playerMaxMp: playerUnit.maxMp,
        turn: 1, log: initialLog,
      };
    }),

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

      const playerTeam = JSON.parse(combat.playerTeam) as CombatUnit[];
      const enemyTeam = JSON.parse(combat.enemyTeam) as SerializedMonster[];
      const logs = JSON.parse(combat.logs) as string[];
      const playerUnit = playerTeam[0]!;
      const monster = enemyTeam[0]!;

      return {
        monster: {
          name: monster.name, icon: monster.icon,
          level: monster.level, hp: monster.hp, maxHp: monster.maxHp,
        },
        playerHp: playerUnit.hp, playerMaxHp: playerUnit.maxHp,
        playerMp: playerUnit.mp, playerMaxMp: playerUnit.maxMp,
        turn: combat.currentTurn, status: combat.status,
        log: logs.slice(-10), playerBuffs: playerUnit.buffs,
      };
    }),

  getActiveCombat: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const player = await ctx.db.player.findUnique({ where: { userId } });

    if (!player) {
      throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
    }

    const combat = await ctx.db.combatSession.findFirst({
      where: { playerId: player.id, status: "active" },
    });

    if (!combat) return null;

    const playerTeam = JSON.parse(combat.playerTeam) as CombatUnit[];
    const enemyTeam = JSON.parse(combat.enemyTeam) as SerializedMonster[];
    const playerUnit = playerTeam[0]!;
    const monster = enemyTeam[0]!;

    return {
      combatId: combat.id,
      monster: {
        name: monster.name, icon: monster.icon,
        level: monster.level, hp: monster.hp, maxHp: monster.maxHp,
      },
      playerHp: playerUnit.hp, playerMaxHp: playerUnit.maxHp,
      playerMp: playerUnit.mp, playerMaxMp: playerUnit.maxMp,
      turn: combat.currentTurn,
    };
  }),

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

      const playerTeam = JSON.parse(combat.playerTeam) as CombatUnit[];
      const playerUnit = playerTeam[0]!;

      // Try to load learned skills from DB
      const dbActions: CombatAction[] = [];
      try {
        const playerSkills = await ctx.db.playerSkill.findMany({
          where: { playerId: player.id },
          include: { skill: true },
        });

        for (const ps of playerSkills) {
          if (ps.skill.type !== "combat") continue;
          const levelData = parseSkillLevelData(ps.skill.levelData);
          const currentLevel = levelData.find(l => l.level === ps.level) ?? levelData[0];
          if (!currentLevel) continue;

          dbActions.push({
            id: `skill_${ps.skill.id}`,
            name: ps.skill.name,
            description: ps.skill.description,
            icon: ps.skill.icon,
            mpCost: currentLevel.mpCost,
            cooldown: currentLevel.cooldown,
            currentCooldown: 0,
            effects: currentLevel.effects,
          });
        }
      } catch {
        // If no skills table or data, use defaults
      }

      // Combine base actions with learned skills
      const allActions = [...BASE_ACTIONS, ...dbActions];

      return {
        actions: allActions.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          mpCost: a.mpCost,
          disabled: a.mpCost > playerUnit.mp,
        })),
      };
    }),

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

      const playerTeam = JSON.parse(combat.playerTeam) as CombatUnit[];
      const enemyTeam = JSON.parse(combat.enemyTeam) as SerializedMonster[];
      const logs = JSON.parse(combat.logs) as string[];
      const rewards = JSON.parse(combat.rewards) as SerializedMonster["rewards"];

      const playerUnit = playerTeam[0]!;
      if (!playerUnit.buffs) playerUnit.buffs = [];
      const monster = enemyTeam[0]!;

      const newLogs: string[] = [];
      let actionUsed = false;

      // Find the action
      let action = BASE_ACTIONS.find(a => a.id === input.actionId);

      // Check DB skills if not a base action
      if (!action && input.actionId.startsWith("skill_")) {
        const skillId = input.actionId.replace("skill_", "");
        try {
          const ps = await ctx.db.playerSkill.findFirst({
            where: { playerId: player.id, skillId },
            include: { skill: true },
          });
          if (ps) {
            const levelData = parseSkillLevelData(ps.skill.levelData);
            const currentLevel = levelData.find(l => l.level === ps.level) ?? levelData[0];
            if (currentLevel) {
              action = {
                id: input.actionId,
                name: ps.skill.name,
                description: ps.skill.description,
                icon: ps.skill.icon,
                mpCost: currentLevel.mpCost,
                cooldown: currentLevel.cooldown,
                currentCooldown: 0,
                effects: currentLevel.effects,
              };
            }
          }
        } catch {
          // DB skills not available
        }
      }

      if (!action) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "无效的行动" });
      }

      // Check MP cost
      if (action.mpCost > playerUnit.mp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
      }

      // Deduct MP
      playerUnit.mp -= action.mpCost;

      // Resolve each effect in the action
      const monsterUnit = monsterToCombatUnit(monster);

      for (const effect of action.effects) {
        const result = resolveSkillEffect(effect, playerUnit, monsterUnit);
        newLogs.push(...result.logs);

        if (result.fled !== undefined) {
          if (result.fled) {
            // Successful flee
            await ctx.db.combatSession.update({
              where: { id: combat.id },
              data: {
                status: "fled",
                logs: JSON.stringify([...logs, ...newLogs]),
                playerTeam: JSON.stringify(playerTeam),
              },
            });

            return {
              success: true, status: "fled", message: "成功逃跑",
              log: newLogs, playerHp: playerUnit.hp, playerMp: playerUnit.mp,
              monsterHp: monster.hp,
            };
          } else {
            // Failed flee — monster still gets a turn
            actionUsed = true;
          }
        }
      }

      // Sync monster HP back from combat unit
      monster.hp = monsterUnit.hp;
      actionUsed = true;

      // Check if monster is dead
      if (monster.hp <= 0) {
        newLogs.push(`🎉 战斗胜利！你击败了 ${monster.name}！`);

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

        // Card drop
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
          success: true, status: "victory", message: "战斗胜利",
          log: newLogs, rewards: { gold: rewards.gold, exp: rewards.exp },
          playerHp: playerUnit.hp, playerMp: playerUnit.mp, monsterHp: 0,
        };
      }

      // Monster turn
      if (actionUsed) {
        const availableSkills = monster.skills.filter(s => s.currentCooldown === 0);
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]!;

        // Resolve monster skill effects against player
        const mUnit = monsterToCombatUnit(monster);
        for (const effect of skill.effects) {
          if (effect.type === "damage") {
            // Apply damage reduction from defend buff
            const drBuff = playerUnit.buffs.find(b =>
              b.modifiers.some(m => m.stat === "damageReduction")
            );
            const dr = drBuff
              ? drBuff.modifiers.find(m => m.stat === "damageReduction")?.value ?? 0
              : 0;

            const damage = calculateDamage(monster.attack, getBuffedStat(playerUnit, "defense"), effect.multiplier);
            const finalDamage = dr > 0 ? Math.floor(damage * (1 - dr)) : damage;

            playerUnit.hp -= finalDamage;
            newLogs.push(`${monster.name}使用${skill.name}，对你造成 ${finalDamage} 点伤害${dr > 0 ? "（防御减免）" : ""}`);
          } else {
            const result = resolveSkillEffect(effect, mUnit, playerUnit);
            newLogs.push(...result.logs);
          }
        }

        if (skill.cooldown > 0) {
          skill.currentCooldown = skill.cooldown;
        }
        monster.skills.forEach(s => {
          if (s.currentCooldown > 0) s.currentCooldown--;
        });
      }

      // Tick player buffs
      const removedBuffs = tickBuffs(playerUnit);
      if (removedBuffs.length > 0) {
        newLogs.push(`效果消失：${removedBuffs.join("、")}`);
      }

      // Check player death
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
          success: true, status: "defeat", message: "战斗失败",
          log: newLogs, playerHp: 0, playerMp: playerUnit.mp, monsterHp: monster.hp,
        };
      }

      // Turn end
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
        success: true, status: "active",
        message: `回合 ${combat.currentTurn} 结束`,
        log: newLogs, playerHp: playerUnit.hp, playerMp: playerUnit.mp,
        monsterHp: monster.hp, turn: newTurn,
      };
    }),

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
        const enemyTeam = JSON.parse(c.enemyTeam) as SerializedMonster[];
        const monster = enemyTeam[0]!;

        return {
          id: c.id, status: c.status,
          monsterName: monster.name, monsterLevel: monster.level,
          turns: c.currentTurn, createdAt: c.createdAt,
        };
      });
    }),
});
