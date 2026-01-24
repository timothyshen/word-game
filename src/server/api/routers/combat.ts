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

// 战斗状态
interface CombatState {
  id: string;
  playerId: string;
  monster: Monster;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  turn: number;
  combatLog: string[];
  status: "ongoing" | "victory" | "defeat" | "fled";
  playerBuffs: Array<{ name: string; turns: number; effect: string }>;
  monsterBuffs: Array<{ name: string; turns: number; effect: string }>;
  characterId?: string; // 如果使用角色战斗
}

// 内存中存储战斗状态（实际项目应用Redis或数据库）
const combatStates = new Map<string, CombatState>();

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
  const variance = 0.9 + Math.random() * 0.2; // 90%-110%
  return Math.floor(baseDamage * multiplier * critMult * variance);
}

export const combatRouter = createTRPCRouter({
  // 开始战斗
  startCombat: protectedProcedure
    .input(z.object({
      monsterLevel: z.number().min(1).max(100).default(1),
      monsterType: z.string().optional(),
      characterId: z.string().optional(), // 可选：使用某个角色战斗
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
      let playerHp = 100;
      let playerMaxHp = 100;
      let playerMp = 50;
      let playerMaxMp = 50;

      if (input.characterId && player.characters.length > 0) {
        const char = player.characters[0]!;
        playerHp = char.hp;
        playerMaxHp = char.maxHp;
        playerMp = char.mp;
        playerMaxMp = char.maxMp;
      }

      const monster = generateMonster(input.monsterLevel, input.monsterType);

      const combatId = `combat_${player.id}_${Date.now()}`;
      const combatState: CombatState = {
        id: combatId,
        playerId: player.id,
        monster,
        playerHp,
        playerMaxHp,
        playerMp,
        playerMaxMp,
        turn: 1,
        combatLog: [`⚔️ 战斗开始！你遭遇了 Lv.${monster.level} ${monster.name}！`],
        status: "ongoing",
        playerBuffs: [],
        monsterBuffs: [],
        characterId: input.characterId,
      };

      combatStates.set(combatId, combatState);

      return {
        combatId,
        monster: {
          name: monster.name,
          icon: monster.icon,
          level: monster.level,
          hp: monster.hp,
          maxHp: monster.maxHp,
        },
        playerHp,
        playerMaxHp,
        playerMp,
        playerMaxMp,
        turn: 1,
        log: combatState.combatLog,
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

      const state = combatStates.get(input.combatId);
      if (!state || state.playerId !== player.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      return {
        monster: {
          name: state.monster.name,
          icon: state.monster.icon,
          level: state.monster.level,
          hp: state.monster.hp,
          maxHp: state.monster.maxHp,
        },
        playerHp: state.playerHp,
        playerMaxHp: state.playerMaxHp,
        playerMp: state.playerMp,
        playerMaxMp: state.playerMaxMp,
        turn: state.turn,
        status: state.status,
        log: state.combatLog.slice(-10), // 最近10条
        playerBuffs: state.playerBuffs,
        monsterBuffs: state.monsterBuffs,
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

      const state = combatStates.get(input.combatId);
      if (!state || state.playerId !== player.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      if (state.status !== "ongoing") {
        return { actions: [] };
      }

      const actions = [
        { id: "attack", name: "攻击", description: "对敌人造成物理伤害", icon: "⚔️", mpCost: 0 },
        { id: "heavy_attack", name: "重击", description: "造成1.5倍伤害，但下回合防御降低", icon: "💥", mpCost: 10 },
        { id: "defend", name: "防御", description: "本回合受到的伤害减半，回复少量MP", icon: "🛡️", mpCost: 0 },
        { id: "skill_fire", name: "火焰术", description: "造成魔法伤害并附加灼烧", icon: "🔥", mpCost: 20 },
        { id: "skill_heal", name: "治疗术", description: "回复30%最大生命值", icon: "💚", mpCost: 25 },
        { id: "flee", name: "逃跑", description: "尝试逃离战斗（50%成功率）", icon: "🏃", mpCost: 0 },
      ];

      // 过滤MP不足的技能
      return {
        actions: actions.map(a => ({
          ...a,
          disabled: a.mpCost > state.playerMp,
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

      const state = combatStates.get(input.combatId);
      if (!state || state.playerId !== player.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
      }

      if (state.status !== "ongoing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });
      }

      const logs: string[] = [];
      let playerDefending = false;
      let actionUsed = false;

      // 玩家行动
      switch (input.actionId) {
        case "attack": {
          const isCrit = Math.random() < 0.15;
          const damage = calculateDamage(player.strength * 2, state.monster.defense, 1.0, isCrit);
          state.monster.hp -= damage;
          logs.push(`你发起攻击，${isCrit ? "暴击！" : ""}对${state.monster.name}造成 ${damage} 点伤害`);
          actionUsed = true;
          break;
        }

        case "heavy_attack": {
          if (state.playerMp < 10) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          state.playerMp -= 10;
          const isCrit = Math.random() < 0.2;
          const damage = calculateDamage(player.strength * 2, state.monster.defense, 1.5, isCrit);
          state.monster.hp -= damage;
          logs.push(`你使出重击！${isCrit ? "暴击！" : ""}对${state.monster.name}造成 ${damage} 点伤害`);
          state.playerBuffs.push({ name: "破绽", turns: 1, effect: "defense_down" });
          actionUsed = true;
          break;
        }

        case "defend": {
          playerDefending = true;
          state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);
          logs.push("你采取防御姿态，准备承受敌人的攻击，MP恢复10点");
          actionUsed = true;
          break;
        }

        case "skill_fire": {
          if (state.playerMp < 20) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          state.playerMp -= 20;
          const damage = calculateDamage(player.intellect * 2.5, state.monster.defense * 0.5, 1.0, false);
          state.monster.hp -= damage;
          state.monsterBuffs.push({ name: "灼烧", turns: 2, effect: "burn" });
          logs.push(`你释放火焰术！对${state.monster.name}造成 ${damage} 点魔法伤害并附加灼烧`);
          actionUsed = true;
          break;
        }

        case "skill_heal": {
          if (state.playerMp < 25) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
          }
          state.playerMp -= 25;
          const healAmount = Math.floor(state.playerMaxHp * 0.3);
          state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
          logs.push(`你使用治疗术，恢复了 ${healAmount} 点生命值`);
          actionUsed = true;
          break;
        }

        case "flee": {
          const fleeSuccess = Math.random() < 0.5;
          if (fleeSuccess) {
            state.status = "fled";
            logs.push("你成功逃离了战斗！");
            state.combatLog.push(...logs);
            combatStates.set(input.combatId, state);
            return {
              success: true,
              status: "fled",
              message: "成功逃跑",
              log: logs,
              playerHp: state.playerHp,
              playerMp: state.playerMp,
              monsterHp: state.monster.hp,
            };
          } else {
            logs.push("逃跑失败！敌人追了上来...");
            actionUsed = true;
          }
          break;
        }
      }

      // 检查怪物是否死亡
      if (state.monster.hp <= 0) {
        state.status = "victory";
        logs.push(`🎉 战斗胜利！你击败了 ${state.monster.name}！`);

        // 发放奖励
        const rewards = state.monster.rewards;
        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            exp: player.exp + rewards.exp,
          },
        });
        logs.push(`获得：${rewards.gold} 金币，${rewards.exp} 经验`);

        // 记录战斗分数
        await ctx.db.actionLog.create({
          data: {
            playerId: player.id,
            day: getCurrentGameDay(),
            type: "combat",
            description: `击败了 Lv.${state.monster.level} ${state.monster.name}`,
            baseScore: 20 * state.monster.level,
            bonus: state.monster.level >= 5 ? 30 : 0,
            bonusReason: state.monster.level >= 5 ? "击败强敌" : undefined,
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
            logs.push(`🃏 获得卡牌：${card.name}（${card.rarity}）`);
          }
        }

        state.combatLog.push(...logs);
        combatStates.set(input.combatId, state);

        return {
          success: true,
          status: "victory",
          message: "战斗胜利",
          log: logs,
          rewards: {
            gold: rewards.gold,
            exp: rewards.exp,
          },
          playerHp: state.playerHp,
          playerMp: state.playerMp,
          monsterHp: 0,
        };
      }

      // 处理怪物buff（如灼烧）
      for (const buff of state.monsterBuffs) {
        if (buff.effect === "burn") {
          const burnDamage = Math.floor(state.monster.maxHp * 0.05);
          state.monster.hp -= burnDamage;
          logs.push(`${state.monster.name}受到灼烧，损失 ${burnDamage} 点生命`);
        }
        buff.turns--;
      }
      state.monsterBuffs = state.monsterBuffs.filter(b => b.turns > 0);

      // 检查灼烧后怪物是否死亡
      if (state.monster.hp <= 0) {
        state.status = "victory";
        logs.push(`🎉 ${state.monster.name}被灼烧击杀！战斗胜利！`);

        const rewards = state.monster.rewards;
        await ctx.db.player.update({
          where: { id: player.id },
          data: {
            gold: player.gold + rewards.gold,
            exp: player.exp + rewards.exp,
          },
        });
        logs.push(`获得：${rewards.gold} 金币，${rewards.exp} 经验`);

        await ctx.db.actionLog.create({
          data: {
            playerId: player.id,
            day: getCurrentGameDay(),
            type: "combat",
            description: `击败了 Lv.${state.monster.level} ${state.monster.name}`,
            baseScore: 20 * state.monster.level,
          },
        });

        state.combatLog.push(...logs);
        combatStates.set(input.combatId, state);

        return {
          success: true,
          status: "victory",
          message: "战斗胜利",
          log: logs,
          rewards: { gold: rewards.gold, exp: rewards.exp },
          playerHp: state.playerHp,
          playerMp: state.playerMp,
          monsterHp: 0,
        };
      }

      // 怪物行动
      if (actionUsed) {
        // 选择怪物技能
        const availableSkills = state.monster.skills.filter(s => s.currentCooldown === 0);
        const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)]!;

        // 计算伤害
        let monsterDamage = calculateDamage(state.monster.attack, player.agility, skill.damage);

        // 防御减伤
        if (playerDefending) {
          monsterDamage = Math.floor(monsterDamage * 0.5);
          logs.push(`你的防御抵消了部分伤害`);
        }

        // 破绽增伤
        const hasWeakness = state.playerBuffs.some(b => b.effect === "defense_down");
        if (hasWeakness) {
          monsterDamage = Math.floor(monsterDamage * 1.3);
          logs.push(`由于破绽，你受到了额外伤害`);
        }

        state.playerHp -= monsterDamage;
        logs.push(`${state.monster.name}使用${skill.name}，对你造成 ${monsterDamage} 点伤害`);

        // 重置技能冷却
        if (skill.cooldown > 0) {
          skill.currentCooldown = skill.cooldown;
        }

        // 减少冷却
        state.monster.skills.forEach(s => {
          if (s.currentCooldown > 0) s.currentCooldown--;
        });
      }

      // 处理玩家buff
      state.playerBuffs = state.playerBuffs.filter(b => {
        b.turns--;
        return b.turns > 0;
      });

      // 检查玩家是否死亡
      if (state.playerHp <= 0) {
        state.status = "defeat";
        logs.push("💀 你被击败了...");
        state.combatLog.push(...logs);
        combatStates.set(input.combatId, state);

        return {
          success: true,
          status: "defeat",
          message: "战斗失败",
          log: logs,
          playerHp: 0,
          playerMp: state.playerMp,
          monsterHp: state.monster.hp,
        };
      }

      // 回合结束
      state.turn++;
      state.combatLog.push(...logs);
      combatStates.set(input.combatId, state);

      return {
        success: true,
        status: "ongoing",
        message: `回合 ${state.turn - 1} 结束`,
        log: logs,
        playerHp: state.playerHp,
        playerMp: state.playerMp,
        monsterHp: state.monster.hp,
        turn: state.turn,
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

      const state = combatStates.get(input.combatId);
      if (state && state.playerId === player.id) {
        combatStates.delete(input.combatId);
      }

      return { success: true };
    }),
});
