/**
 * Combat Service — combat system business logic
 */
import { TRPCError } from "@trpc/server";
import { engine, ruleService } from "~/server/api/engine";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId, updatePlayer, createActionLog } from "../repositories/player.repo";
import * as combatRepo from "../repositories/combat.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { upsertUnlockFlag } from "../repositories/card.repo";
import { grantRandomCard, rollRarity } from "../utils/card-utils";
import { grantRandomEquipment, getEquipmentDropTable } from "../utils/equipment-utils";
import { calculateCurrentStamina } from "../utils/player-utils";
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

// ── Formula helper ──

async function calcFormula(ruleName: string, vars: Record<string, number>): Promise<number> {
  const formula = await ruleService.getFormula(ruleName);
  return engine.formulas.calculate(formula, vars);
}

async function generateMonster(level: number, type?: string, config?: MonsterConfig | null): Promise<SerializedMonster> {
  const levelMult = await calcFormula("combat_monster_scaling", { level });
  const rewardExp = await calcFormula("combat_reward_exp", { level });
  const rewardGold = await calcFormula("combat_reward_gold", { level });
  const cardDropChance = await calcFormula("combat_card_drop_chance", { level });

  // Use DB monster config if provided
  if (config) {
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
        exp: rewardExp,
        gold: rewardGold,
        cardChance: cardDropChance,
        cardRarity: level >= 5 ? "稀有" : level >= 3 ? "精良" : "普通",
      },
    };
  }

  // Fallback to default templates
  const chosen = type
    ? DEFAULT_MONSTERS.find(m => m.name === type) ?? DEFAULT_MONSTERS[0]!
    : DEFAULT_MONSTERS[Math.floor(Math.random() * DEFAULT_MONSTERS.length)]!;

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
      exp: rewardExp,
      gold: rewardGold,
      cardChance: cardDropChance,
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

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

export async function startCombat(
  db: FullDbClient,
  userId: string,
  options: {
    monsterLevel: number;
    monsterType?: string;
    monsterConfigJson?: string;
    characterId?: string;
  },
) {
  const player = await combatRepo.findPlayerWithCharacters(db, userId, options.characterId);

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const existingCombat = await combatRepo.findActiveCombat(db, player.id);

  if (existingCombat) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "已有进行中的战斗" });
  }

  // Recalculate stamina accounting for time-based regeneration
  const { stamina: currentStamina } = calculateCurrentStamina(
    player.stamina,
    player.maxStamina,
    player.staminaPerMin ?? 0.5,
    player.lastStaminaUpdate,
  );

  const staminaConfig = await ruleService.getConfig<{ value: number }>("combat_stamina_cost");
  const staminaCost = staminaConfig.value;
  if (currentStamina < staminaCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "体力不足" });
  }

  await updatePlayer(db, player.id, {
    stamina: currentStamina - staminaCost,
    lastStaminaUpdate: new Date(),
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

  if (options.characterId && player.characters.length > 0) {
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

  const monsterConfig = options.monsterConfigJson
    ? parseMonsterConfig(options.monsterConfigJson)
    : null;
  const monster = await generateMonster(options.monsterLevel, options.monsterType, monsterConfig);
  const initialLog = [`⚔️ 战斗开始！你遭遇了 Lv.${monster.level} ${monster.name}！`];

  const combatSession = await combatRepo.createCombatSession(db, {
    playerId: player.id,
    status: "active",
    currentTurn: 1,
    playerTeam: JSON.stringify([playerUnit]),
    enemyTeam: JSON.stringify([monster]),
    combatType: "normal",
    areaLevel: options.monsterLevel,
    logs: JSON.stringify(initialLog),
    rewards: JSON.stringify(monster.rewards),
  });

  await upsertUnlockFlag(db, player.id, "combat_system");

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
}

export async function getCombatStatus(db: FullDbClient, userId: string, combatId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const combat = await combatRepo.findCombatById(db, combatId, player.id);

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
}

export async function getActiveCombat(db: FullDbClient, userId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const combat = await combatRepo.findActiveCombat(db, player.id);

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
}

export async function getActions(db: FullDbClient, userId: string, combatId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const combat = await combatRepo.findCombatById(db, combatId, player.id);

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
    const playerSkills = await combatRepo.findPlayerCombatSkills(db, player.id);

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
}

export async function executeAction(
  db: FullDbClient,
  userId: string,
  combatId: string,
  actionId: string,
) {
  const player = await getPlayerOrThrow(db, userId);

  const combat = await combatRepo.findCombatById(db, combatId, player.id);

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
  let action = BASE_ACTIONS.find(a => a.id === actionId);

  // Check DB skills if not a base action
  if (!action && actionId.startsWith("skill_")) {
    const skillId = actionId.replace("skill_", "");
    try {
      const ps = await combatRepo.findPlayerSkillBySkillId(db, player.id, skillId);
      if (ps) {
        const levelData = parseSkillLevelData(ps.skill.levelData);
        const currentLevel = levelData.find(l => l.level === ps.level) ?? levelData[0];
        if (currentLevel) {
          action = {
            id: actionId,
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

    // Handle special actions (production skills used in combat)
    if (result.specialAction) {
      const { action: specialType, params } = result.specialAction;
      // Production skills don't have combat effects but we acknowledge them
      if (specialType === "qualityBoost" || specialType === "productionBoost") {
        const pct = params.percentage ?? params.amount ?? 0;
        newLogs.push(`（生产技能效果：${specialType} +${Math.round(pct * 100)}%，战斗中不生效）`);
      }
      // Future: Add handlers for other special action types here
    }

    if (result.fled !== undefined) {
      if (result.fled) {
        // Successful flee
        await combatRepo.updateCombatSession(db, combat.id, {
          status: "fled",
          logs: JSON.stringify([...logs, ...newLogs]),
          playerTeam: JSON.stringify(playerTeam),
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

    await updatePlayer(db, player.id, {
      gold: { increment: rewards.gold },
      exp: { increment: rewards.exp },
      combatWins: { increment: 1 },
      totalGoldEarned: { increment: rewards.gold },
    });
    newLogs.push(`获得：${rewards.gold} 金币，${rewards.exp} 经验`);

    await createActionLog(db, {
      playerId: player.id,
      day: getCurrentGameDay(),
      type: "combat",
      description: `击败了 Lv.${monster.level} ${monster.name}`,
      baseScore: 20 * monster.level,
      bonus: monster.level >= 5 ? 30 : 0,
      bonusReason: monster.level >= 5 ? "击败强敌" : null,
    });

    // Card drop
    if (Math.random() < rewards.cardChance) {
      const droppedCard = await grantRandomCard(db, player.id, rewards.cardRarity);
      if (droppedCard) {
        newLogs.push(`🃏 获得卡牌：${droppedCard.name}（${droppedCard.rarity}）`);
      }
    }

    // Equipment drop
    const equipDrop = getEquipmentDropTable(monster.level);
    if (Math.random() < equipDrop.chance) {
      const eqRarity = rollRarity(equipDrop.pool);
      const droppedEquipment = await grantRandomEquipment(db, player.id, eqRarity);
      if (droppedEquipment) {
        newLogs.push(`⚔️ 获得装备：${droppedEquipment.name}（${droppedEquipment.rarity}）`);
      }
    }

    await combatRepo.updateCombatSession(db, combat.id, {
      status: "victory",
      logs: JSON.stringify([...logs, ...newLogs]),
      playerTeam: JSON.stringify(playerTeam),
      enemyTeam: JSON.stringify(enemyTeam),
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
        // Handle monster special actions if any
        if (result.specialAction) {
          newLogs.push(`${monster.name}使用了特殊能力：${result.specialAction.action}`);
        }
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

    await combatRepo.updateCombatSession(db, combat.id, {
      status: "defeat",
      logs: JSON.stringify([...logs, ...newLogs]),
      playerTeam: JSON.stringify(playerTeam),
      enemyTeam: JSON.stringify(enemyTeam),
    });

    return {
      success: true, status: "defeat", message: "战斗失败",
      log: newLogs, playerHp: 0, playerMp: playerUnit.mp, monsterHp: monster.hp,
    };
  }

  // Turn end
  const newTurn = combat.currentTurn + 1;

  await combatRepo.updateCombatSession(db, combat.id, {
    currentTurn: newTurn,
    logs: JSON.stringify([...logs, ...newLogs]),
    playerTeam: JSON.stringify(playerTeam),
    enemyTeam: JSON.stringify(enemyTeam),
  });

  return {
    success: true, status: "active",
    message: `回合 ${combat.currentTurn} 结束`,
    log: newLogs, playerHp: playerUnit.hp, playerMp: playerUnit.mp,
    monsterHp: monster.hp, turn: newTurn,
  };
}

export async function endCombat(db: FullDbClient, userId: string, combatId: string) {
  const player = await getPlayerOrThrow(db, userId);

  const combat = await combatRepo.findCombatById(db, combatId, player.id);

  if (combat && combat.status === "active") {
    await combatRepo.updateCombatSession(db, combat.id, { status: "fled" });
  }

  return { success: true };
}

export async function getHistory(db: FullDbClient, userId: string, limit: number) {
  const player = await getPlayerOrThrow(db, userId);

  const combats = await combatRepo.findCombatHistory(db, player.id, limit);

  return combats.map(c => {
    const enemyTeam = JSON.parse(c.enemyTeam) as SerializedMonster[];
    const monster = enemyTeam[0]!;

    return {
      id: c.id, status: c.status,
      monsterName: monster.name, monsterLevel: monster.level,
      turns: c.currentTurn, createdAt: c.createdAt,
    };
  });
}
