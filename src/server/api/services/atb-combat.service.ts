/**
 * ATB Combat Service — 3-character party ATB combat system
 *
 * Replaces the old 1v1 combat with multi-character ATB battles.
 */
import { TRPCError } from "@trpc/server";
import { engine, ruleService } from "~/server/api/engine";
import type { FullDbClient } from "../repositories/types";
import type { IEntityManager } from "~/engine/types";
import type { EntityWithRelations } from "~/engine/entity/IEntityStore";
import {
  findPlayerByUserId,
  updatePlayer,
  createActionLog,
} from "../repositories/player.repo";
import * as combatRepo from "../repositories/combat.repo";
import * as partyRepo from "../repositories/party.repo";
import { getCurrentGameDay } from "../utils/game-time";
import { calculateCurrentStamina } from "../utils/player-utils";
import { parseCharacterState } from "../utils/character-utils";
import {
  resolveSkillEffect,
  tickBuffs,
  getBuffedStat,
} from "~/shared/effects";
import type {
  ATBCombatState,
  ATBUnit,
  PartyMember,
  EnemyUnit,
  EnemyMechanic,
  CombatUnit,
  CombatAction,
  CombatActionV2,
  CombatLog,
  CombatRating,
  Element,
  ElementalProfile,
  SkillEffect,
  TargetType,
} from "~/shared/effects/types";

// ── Constants ──

const ATB_FULL = 100;
const MAX_PARTY_SIZE = 3;

// Default monster templates with elemental profiles
const MONSTER_TEMPLATES: Array<{
  name: string;
  icon: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  baseInt: number;
  element?: Element;
  weaknesses: Element[];
  resistances: Element[];
  skills: Array<{ name: string; effects: SkillEffect[]; cooldown: number }>;
}> = [
  {
    name: "野狼",
    icon: "🐺",
    baseHp: 40,
    baseAtk: 12,
    baseDef: 4,
    baseSpd: 8,
    baseInt: 2,
    weaknesses: ["fire"],
    resistances: [],
    skills: [
      {
        name: "撕咬",
        effects: [
          { type: "damage", damageType: "physical", multiplier: 1.0 },
        ],
        cooldown: 0,
      },
    ],
  },
  {
    name: "山贼",
    icon: "🗡️",
    baseHp: 60,
    baseAtk: 15,
    baseDef: 6,
    baseSpd: 5,
    baseInt: 3,
    weaknesses: [],
    resistances: [],
    skills: [
      {
        name: "劈砍",
        effects: [
          { type: "damage", damageType: "physical", multiplier: 1.0 },
        ],
        cooldown: 0,
      },
      {
        name: "致命一击",
        effects: [
          { type: "damage", damageType: "physical", multiplier: 1.8 },
        ],
        cooldown: 3,
      },
    ],
  },
  {
    name: "哥布林",
    icon: "👺",
    baseHp: 35,
    baseAtk: 10,
    baseDef: 3,
    baseSpd: 10,
    baseInt: 4,
    weaknesses: ["light"],
    resistances: ["dark"],
    skills: [
      {
        name: "投石",
        effects: [
          { type: "damage", damageType: "physical", multiplier: 0.8 },
        ],
        cooldown: 0,
      },
    ],
  },
  {
    name: "骷髅兵",
    icon: "💀",
    baseHp: 50,
    baseAtk: 18,
    baseDef: 8,
    baseSpd: 4,
    baseInt: 1,
    element: "dark",
    weaknesses: ["light", "fire"],
    resistances: ["dark", "ice"],
    skills: [
      {
        name: "骨刃",
        effects: [
          { type: "damage", damageType: "physical", multiplier: 1.2 },
        ],
        cooldown: 0,
      },
    ],
  },
  {
    name: "火焰精灵",
    icon: "🔥",
    baseHp: 45,
    baseAtk: 8,
    baseDef: 4,
    baseSpd: 9,
    baseInt: 15,
    element: "fire",
    weaknesses: ["ice", "thunder"],
    resistances: ["fire"],
    skills: [
      {
        name: "火球术",
        effects: [
          {
            type: "damage",
            damageType: "magic",
            multiplier: 1.0,
            element: "fire",
          },
        ],
        cooldown: 0,
      },
      {
        name: "烈焰风暴",
        effects: [
          {
            type: "damage",
            damageType: "magic",
            multiplier: 1.5,
            element: "fire",
          },
        ],
        cooldown: 3,
      },
    ],
  },
  {
    name: "冰霜巨人",
    icon: "🧊",
    baseHp: 80,
    baseAtk: 20,
    baseDef: 12,
    baseSpd: 3,
    baseInt: 8,
    element: "ice",
    weaknesses: ["fire", "thunder"],
    resistances: ["ice"],
    skills: [
      {
        name: "冰拳",
        effects: [
          {
            type: "damage",
            damageType: "physical",
            multiplier: 1.3,
            element: "ice",
          },
        ],
        cooldown: 0,
      },
      {
        name: "冰冻",
        effects: [
          {
            type: "buff",
            target: "enemy",
            modifiers: [{ stat: "speed", value: -0.5, type: "percent" }],
            duration: 2,
          },
        ],
        cooldown: 4,
      },
    ],
  },
];

// Base actions available to all party members
const BASE_ACTIONS: CombatActionV2[] = [
  {
    id: "attack",
    name: "攻击",
    description: "物理攻击",
    icon: "⚔️",
    mpCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    effects: [{ type: "damage", damageType: "physical", multiplier: 1.0 }],
    targetType: "single_enemy",
  },
  {
    id: "defend",
    name: "防御",
    description: "减伤50%，回复10MP，ATB加速",
    icon: "🛡️",
    mpCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    effects: [
      {
        type: "buff",
        target: "self",
        modifiers: [{ stat: "damageReduction", value: 0.5, type: "flat" }],
        duration: 1,
      },
      {
        type: "heal",
        healType: "mp",
        target: "self",
        amount: 10,
        isPercent: false,
      },
    ],
    targetType: "self",
  },
  {
    id: "item",
    name: "道具",
    description: "使用道具",
    icon: "🎒",
    mpCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    effects: [],
    targetType: "single_ally",
  },
  {
    id: "flee",
    name: "逃跑",
    description: "尝试逃离战斗",
    icon: "🏃",
    mpCost: 0,
    cooldown: 0,
    currentCooldown: 0,
    effects: [{ type: "flee", successRate: 0.5 }],
    targetType: "self",
  },
];

// ── Formula helper ──

async function calcFormula(
  ruleName: string,
  vars: Record<string, number>,
): Promise<number> {
  try {
    const formula = await ruleService.getFormula(ruleName);
    return engine.formulas.calculate(formula, vars);
  } catch {
    // Fallback defaults if formula not in DB
    if (ruleName === "combat_monster_scaling")
      return 1 + (vars.level ?? 1) * 0.15;
    if (ruleName === "combat_reward_exp") return 10 + (vars.level ?? 1) * 5;
    if (ruleName === "combat_reward_gold") return 5 + (vars.level ?? 1) * 3;
    return 1;
  }
}

// ── ATB Core ──

/**
 * Advance ATB for all alive units. Returns the ID of the unit that reaches ATB_FULL first.
 * Modifies unit ATB values in-place.
 */
export function tickATB(state: ATBCombatState): string | null {
  const allUnits: ATBUnit[] = [
    ...state.party.filter((u) => u.isAlive),
    ...state.enemies.filter((u) => u.isAlive),
  ];
  if (allUnits.length === 0) return null;

  // Find minimum ticks needed for any unit to reach ATB_FULL
  let minTicks = Infinity;
  for (const unit of allUnits) {
    if (unit.atb >= ATB_FULL) return unit.id; // already ready
    const remaining = ATB_FULL - unit.atb;
    const speed = Math.max(1, getBuffedStat(unit, "speed"));
    const ticks = remaining / speed;
    if (ticks < minTicks) minTicks = ticks;
  }

  // Advance all units
  for (const unit of allUnits) {
    const speed = Math.max(1, getBuffedStat(unit, "speed"));
    unit.atb = Math.min(ATB_FULL, unit.atb + speed * minTicks);
  }

  // Return highest ATB unit (ties broken by speed)
  allUnits.sort((a, b) => {
    if (b.atb !== a.atb) return b.atb - a.atb;
    return b.speed - a.speed;
  });

  return allUnits[0]?.id ?? null;
}

// ── Enemy Group Generation ──

interface EnemySkillSlot {
  name: string;
  effects: SkillEffect[];
  cooldown: number;
  currentCooldown: number;
}

export async function generateEnemyGroup(
  level: number,
  combatType: "normal" | "elite" | "boss",
): Promise<EnemyUnit[]> {
  const levelMult = await calcFormula("combat_monster_scaling", { level });
  const rewardExp = await calcFormula("combat_reward_exp", { level });
  const rewardGold = await calcFormula("combat_reward_gold", { level });

  const count =
    combatType === "boss"
      ? 1
      : combatType === "elite"
        ? Math.floor(Math.random() * 2) + 1
        : Math.floor(Math.random() * 3) + 2;

  const enemies: EnemyUnit[] = [];
  for (let i = 0; i < count; i++) {
    const template =
      MONSTER_TEMPLATES[Math.floor(Math.random() * MONSTER_TEMPLATES.length)]!;
    const scaledHp = Math.floor(template.baseHp * levelMult);
    const scaledAtk = Math.floor(template.baseAtk * levelMult);
    const scaledDef = Math.floor(template.baseDef * levelMult);
    const scaledSpd = Math.max(
      1,
      Math.floor(template.baseSpd * (1 + level * 0.02)),
    );
    const scaledInt = Math.floor(template.baseInt * levelMult);

    const tierMult =
      combatType === "boss" ? 3 : combatType === "elite" ? 1.8 : 1;

    const enemy: EnemyUnit & { skills: EnemySkillSlot[] } = {
      id: `enemy_${i}_${Date.now()}`,
      name:
        combatType === "elite"
          ? `精英${template.name}`
          : combatType === "boss"
            ? `Boss·${template.name}`
            : template.name,
      hp: Math.floor(scaledHp * tierMult),
      maxHp: Math.floor(scaledHp * tierMult),
      mp: 100,
      maxMp: 100,
      attack: Math.floor(scaledAtk * tierMult),
      defense: Math.floor(scaledDef * tierMult),
      speed: scaledSpd,
      luck: 5 + level,
      intellect: Math.floor(scaledInt * tierMult),
      buffs: [],
      atb: Math.floor(Math.random() * 30), // random starting ATB
      element: template.element,
      elementalProfile: {
        weaknesses: template.weaknesses,
        resistances: template.resistances,
      },
      isAlive: true,
      teamIndex: i,
      tier: combatType,
      loot: {
        exp: Math.floor((rewardExp * tierMult) / count),
        gold: Math.floor((rewardGold * tierMult) / count),
      },
      specialMechanics:
        combatType === "elite" ? generateEliteMechanics() : undefined,
      skills: template.skills.map((s) => ({
        ...s,
        currentCooldown: 0,
      })),
    };

    enemies.push(enemy);
  }

  return enemies;
}

function generateEliteMechanics(): EnemyMechanic[] {
  const mechanics: EnemyMechanic[] = [
    {
      name: "狂暴",
      trigger: "hp_threshold",
      value: 50, // triggers at 50% HP
      effects: [
        {
          type: "buff",
          target: "self",
          modifiers: [{ stat: "attack", value: 0.5, type: "percent" }],
          duration: 99,
        },
      ],
      description: "HP低于50%时攻击力提升50%",
    },
  ];
  return [mechanics[Math.floor(Math.random() * mechanics.length)]!];
}

// ── Build Party ──

export async function buildPartyMembers(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
): Promise<PartyMember[]> {
  const party = await partyRepo.findParty(db, userId);
  const memberIds = partyRepo.parsePartyMembers(party);

  if (memberIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请先编排队伍（至少1名角色）",
    });
  }

  const members: PartyMember[] = [];
  for (let i = 0; i < memberIds.length && i < MAX_PARTY_SIZE; i++) {
    const entityId = memberIds[i]!;
    const entity = (await entities.getEntity(
      entityId,
    )) as EntityWithRelations | null;
    if (!entity) continue;

    const charState = parseCharacterState(entity);

    // Load character skills from DB
    const charSkills = await db.characterSkill.findMany({
      where: { playerCharacterId: entityId },
      include: { skill: true },
    });

    const skillSlots: CombatAction[] = charSkills
      .filter((cs) => cs.skill.type === "combat")
      .slice(0, 3) // max 3 extra skill slots
      .map((cs) => {
        let effects: SkillEffect[] = [];
        let mpCost = 10;
        try {
          const levelData = JSON.parse(cs.skill.levelData) as Array<{
            level: number;
            effects: SkillEffect[];
            mpCost: number;
            cooldown: number;
          }>;
          const entry =
            levelData.find((e) => e.level === cs.level) ?? levelData[0];
          if (entry) {
            effects = entry.effects;
            mpCost = entry.mpCost;
          }
        } catch {
          try {
            effects = JSON.parse(cs.skill.effects) as SkillEffect[];
          } catch {
            /* use empty */
          }
        }
        return {
          id: cs.skillId,
          name: cs.skill.name,
          description: cs.skill.description,
          icon: cs.skill.icon,
          mpCost,
          cooldown: 0,
          currentCooldown: 0,
          effects,
        };
      });

    // Parse template data for baseClass
    let baseClass = "战士";
    try {
      const templateData = entity.template.data
        ? (JSON.parse(entity.template.data) as { baseClass?: string })
        : {};
      baseClass = templateData.baseClass ?? "战士";
    } catch {
      /* use default */
    }

    members.push({
      id: entityId,
      characterId: entityId,
      name: entity.template.name,
      portrait: entity.template.icon,
      baseClass,
      hp: charState.hp ?? charState.maxHp ?? 100,
      maxHp: charState.maxHp ?? 100,
      mp: charState.mp ?? charState.maxMp ?? 50,
      maxMp: charState.maxMp ?? 50,
      attack: charState.attack ?? 10,
      defense: charState.defense ?? 5,
      speed: charState.speed ?? 5,
      luck: charState.luck ?? 5,
      intellect: 5, // CharacterEntityState does not have intellect; use default
      buffs: [],
      atb: 0,
      isAlive: true,
      teamIndex: i,
      skillSlots,
    });
  }

  if (members.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "队伍中没有有效角色",
    });
  }

  return members;
}

// ── Start Combat ──

export async function startATBCombat(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  options: {
    monsterLevel: number;
    combatType: "normal" | "elite" | "boss";
  },
): Promise<{ combatId: string; state: ATBCombatState }> {
  // Check no active combat
  const active = await combatRepo.findActiveCombat(db, userId);
  if (active) {
    throw new TRPCError({ code: "CONFLICT", message: "已有进行中的战斗" });
  }

  // Check stamina
  const player = await findPlayerByUserId(db, userId);
  if (!player)
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });

  let staminaCost = 5;
  try {
    const config = await ruleService.getConfig<{ cost?: number }>(
      "combat_stamina_cost",
    );
    staminaCost = config.cost ?? 5;
  } catch {
    /* use default */
  }

  const { stamina: currentStamina } = calculateCurrentStamina(
    player.stamina,
    player.maxStamina,
    player.staminaPerMin ?? 0.5,
    player.lastStaminaUpdate,
  );
  if (currentStamina < staminaCost) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `体力不足（需要${staminaCost}，当前${Math.floor(currentStamina)}）`,
    });
  }

  // Deduct stamina
  await updatePlayer(db, userId, {
    stamina: currentStamina - staminaCost,
    lastStaminaUpdate: new Date(),
  });

  // Build party and enemies
  const partyMembers = await buildPartyMembers(db, entities, userId);
  const enemies = await generateEnemyGroup(
    options.monsterLevel,
    options.combatType,
  );

  const state: ATBCombatState = {
    party: partyMembers,
    enemies,
    currentActorId: null,
    turnCount: 0,
    logs: [
      {
        turn: 0,
        actorName: "系统",
        message: `战斗开始！${enemies.map((e) => e.name).join("、")} 出现了！`,
        type: "system",
      },
    ],
    status: "active",
    combatType: options.combatType,
  };

  // Tick ATB to find first actor
  const firstActor = tickATB(state);
  state.currentActorId = firstActor;

  // Process enemy turns until a party member acts
  processEnemyTurns(state);

  // Save to DB
  const session = await combatRepo.createCombatSession(db, {
    playerId: userId,
    status: "active",
    currentTurn: state.turnCount,
    playerTeam: JSON.stringify(state.party),
    enemyTeam: JSON.stringify(state.enemies),
    combatType: options.combatType,
    areaLevel: options.monsterLevel,
    logs: JSON.stringify(state.logs),
    rewards: "{}",
    combatState: JSON.stringify(state),
  });

  return { combatId: session.id, state };
}

// ── Process Enemy Turns ──

function processEnemyTurns(state: ATBCombatState): void {
  // Keep processing while current actor is an enemy
  let safety = 20; // prevent infinite loops
  while (safety-- > 0) {
    if (!state.currentActorId) {
      const nextId = tickATB(state);
      if (!nextId) break;
      state.currentActorId = nextId;
    }

    const currentActor = state.enemies.find(
      (e) => e.id === state.currentActorId && e.isAlive,
    );
    if (!currentActor) break; // it's a party member's turn

    // Enemy AI: pick action and target
    executeEnemyAI(state, currentActor);

    // Check for victory
    if (state.enemies.every((e) => !e.isAlive)) {
      state.status = "victory";
      break;
    }
    if (state.party.every((p) => !p.isAlive)) {
      state.status = "defeat";
      break;
    }

    // Advance to next
    state.currentActorId = null;
    const nextId = tickATB(state);
    state.currentActorId = nextId;
  }
}

function executeEnemyAI(state: ATBCombatState, enemy: EnemyUnit): void {
  state.turnCount++;

  // Check special mechanics
  if (enemy.specialMechanics) {
    for (const mech of enemy.specialMechanics) {
      if (mech.activated) continue;
      if (
        mech.trigger === "hp_threshold" &&
        (enemy.hp / enemy.maxHp) * 100 <= mech.value
      ) {
        mech.activated = true;
        for (const eff of mech.effects) {
          resolveSkillEffect(eff, enemy, enemy);
        }
        state.logs.push({
          turn: state.turnCount,
          actorName: enemy.name,
          message: `${enemy.name} 触发了 ${mech.name}！${mech.description}`,
          type: "system",
        });
      }
    }
  }

  // Pick a skill
  const enemyWithSkills = enemy as EnemyUnit & {
    skills?: EnemySkillSlot[];
  };
  const skills = enemyWithSkills.skills ?? [];
  const available = skills.filter((s) => s.currentCooldown <= 0);
  const skill: EnemySkillSlot =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]!
      : {
          name: "攻击",
          effects: [
            {
              type: "damage" as const,
              damageType: "physical" as const,
              multiplier: 1.0,
            },
          ],
          cooldown: 0,
          currentCooldown: 0,
        };

  // Pick target — lowest HP alive party member
  const aliveParty = state.party.filter((p) => p.isAlive);
  if (aliveParty.length === 0) return;
  aliveParty.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const target = aliveParty[0]!;

  // Resolve
  for (const effect of skill.effects) {
    const result = resolveSkillEffect(effect, enemy, target);
    for (const log of result.logs) {
      state.logs.push({
        turn: state.turnCount,
        actorName: enemy.name,
        message: log,
        type: result.damageDealt
          ? "damage"
          : result.healAmount
            ? "heal"
            : "action",
      });
    }
  }

  // Set cooldown
  if (skill.cooldown > 0) skill.currentCooldown = skill.cooldown;

  // Tick cooldowns for all skills
  for (const s of skills) {
    if (s !== skill && s.currentCooldown > 0) s.currentCooldown--;
  }

  // Check if target died
  if (target.hp <= 0) {
    target.hp = 0;
    target.isAlive = false;
    state.logs.push({
      turn: state.turnCount,
      actorName: "系统",
      message: `${target.name} 力竭倒下了！`,
      type: "system",
    });
  }

  // Tick buffs
  tickBuffs(enemy);

  // Reset ATB
  enemy.atb = 0;
}

// ── Get Actions ──

export async function getATBActions(
  db: FullDbClient,
  userId: string,
  combatId: string,
): Promise<{ actions: CombatActionV2[]; currentActor: PartyMember | null }> {
  const session = await combatRepo.findCombatById(db, combatId, userId);
  if (!session)
    throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });

  const state = JSON.parse(
    session.combatState ?? "{}",
  ) as ATBCombatState;
  if (state.status !== "active") return { actions: [], currentActor: null };

  const actor = state.party.find(
    (p) => p.id === state.currentActorId && p.isAlive,
  );
  if (!actor) return { actions: [], currentActor: null };

  // Base actions (attack, defend, item, flee)
  const actions: CombatActionV2[] = [...BASE_ACTIONS].map((a) => ({
    ...a,
    // Disable if not enough MP
    currentCooldown: actor.mp < a.mpCost ? 1 : 0,
  }));

  // Character's equipped skills
  for (const skill of actor.skillSlots) {
    actions.push({
      ...skill,
      targetType: guessTargetType(skill.effects),
      currentCooldown: actor.mp < skill.mpCost ? 1 : skill.currentCooldown,
    });
  }

  return { actions, currentActor: actor };
}

function guessTargetType(effects: SkillEffect[]): TargetType {
  for (const e of effects) {
    if (e.type === "damage") return "single_enemy";
    if (e.type === "heal") return e.target === "self" ? "self" : "single_ally";
    if (e.type === "buff")
      return e.target === "self" ? "self" : "single_enemy";
    if (e.type === "flee") return "self";
  }
  return "single_enemy";
}

// ── Execute Player Action ──

export interface CombatRewards {
  totalExp: number;
  totalGold: number;
  expPerMember: Record<string, number>;
}

export async function executeATBAction(
  db: FullDbClient,
  entities: IEntityManager,
  userId: string,
  combatId: string,
  actionId: string,
  targetIds: string[],
): Promise<{ state: ATBCombatState; rewards?: CombatRewards }> {
  const session = await combatRepo.findCombatById(db, combatId, userId);
  if (!session)
    throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
  if (session.status !== "active")
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });

  const state = JSON.parse(
    session.combatState ?? "{}",
  ) as ATBCombatState;
  if (state.status !== "active")
    throw new TRPCError({ code: "BAD_REQUEST", message: "战斗已结束" });

  const actor = state.party.find(
    (p) => p.id === state.currentActorId && p.isAlive,
  );
  if (!actor)
    throw new TRPCError({ code: "BAD_REQUEST", message: "没有可行动的角色" });

  state.turnCount++;

  // Find action
  const allActions: (CombatAction | CombatActionV2)[] = [
    ...BASE_ACTIONS,
    ...actor.skillSlots,
  ];
  const action = allActions.find((a) => a.id === actionId);
  if (!action)
    throw new TRPCError({ code: "BAD_REQUEST", message: "无效的行动" });

  // Check MP
  if (actor.mp < action.mpCost) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "MP不足" });
  }
  actor.mp -= action.mpCost;

  // Handle flee
  if (actionId === "flee") {
    if (state.combatType === "boss") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Boss战不可逃跑",
      });
    }
    const fled = Math.random() < 0.5;
    state.logs.push({
      turn: state.turnCount,
      actorName: actor.name,
      message: fled ? "逃跑成功！" : "逃跑失败！",
      type: "action",
    });
    if (fled) {
      state.status = "fled";
      await saveCombatState(db, combatId, state);
      return { state };
    }
    // Failed flee - continue to enemy turns
    actor.atb = 0;
    tickBuffs(actor);
    state.currentActorId = null;
    processEnemyTurns(state);
    await saveCombatState(db, combatId, state);
    return { state };
  }

  // Resolve action against targets
  const targets = resolveTargets(state, action, targetIds);
  for (const effect of action.effects) {
    for (const target of targets) {
      const profile =
        "elementalProfile" in target
          ? (target as EnemyUnit).elementalProfile
          : undefined;
      const result = resolveSkillEffect(effect, actor, target, profile);
      for (const log of result.logs) {
        const logType: CombatLog["type"] = result.damageDealt
          ? log.includes("弱点")
            ? "weakness"
            : log.includes("暴击")
              ? "critical"
              : "damage"
          : result.healAmount
            ? "heal"
            : "action";
        state.logs.push({
          turn: state.turnCount,
          actorName: actor.name,
          message: log,
          type: logType,
        });
      }
    }
  }

  // Mark dead enemies
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && enemy.isAlive) {
      enemy.hp = 0;
      enemy.isAlive = false;
      state.logs.push({
        turn: state.turnCount,
        actorName: "系统",
        message: `${enemy.name} 被击败了！`,
        type: "system",
      });
    }
  }

  // Check victory
  if (state.enemies.every((e) => !e.isAlive)) {
    state.status = "victory";
    state.rating = calculateRating(state);
    const rewards = calculateRewards(state);
    await distributeRewards(db, entities, userId, rewards);
    state.logs.push({
      turn: state.turnCount,
      actorName: "系统",
      message: `战斗胜利！评价：${state.rating.grade}（奖励倍率：${state.rating.multiplier}x）`,
      type: "system",
    });
    await saveCombatState(db, combatId, state, "victory");
    return { state, rewards };
  }

  // Tick actor buffs and reset ATB
  tickBuffs(actor);
  actor.atb = 0;

  // Process enemy turns and find next player actor
  state.currentActorId = null;
  processEnemyTurns(state);

  // Check defeat after enemy turns
  if (state.party.every((p) => !p.isAlive)) {
    state.status = "defeat";
    state.logs.push({
      turn: state.turnCount,
      actorName: "系统",
      message: "队伍全灭...战斗失败",
      type: "system",
    });
    await saveCombatState(db, combatId, state, "defeat");
    return { state };
  }

  await saveCombatState(db, combatId, state);
  return { state };
}

function resolveTargets(
  state: ATBCombatState,
  action: CombatAction | CombatActionV2,
  targetIds: string[],
): CombatUnit[] {
  const targetType: TargetType =
    "targetType" in action ? action.targetType : "single_enemy";

  switch (targetType) {
    case "single_enemy":
      return state.enemies
        .filter((e) => targetIds.includes(e.id) && e.isAlive)
        .slice(0, 1);
    case "all_enemies":
      return state.enemies.filter((e) => e.isAlive);
    case "single_ally":
      return state.party
        .filter((p) => targetIds.includes(p.id))
        .slice(0, 1);
    case "all_allies":
      return state.party.filter((p) => p.isAlive);
    case "self": {
      const actor = state.party.find((p) => p.id === state.currentActorId);
      return actor ? [actor] : [];
    }
    default:
      return state.enemies
        .filter((e) => targetIds.includes(e.id) && e.isAlive)
        .slice(0, 1);
  }
}

// ── Rating ──

export function calculateRating(state: ATBCombatState): CombatRating {
  const survivors = state.party.filter((p) => p.isAlive).length;
  const weaknessHits = state.logs.filter((l) => l.type === "weakness").length;
  const combos = state.logs.filter((l) => l.type === "combo").length;

  let score = 100;
  score -= state.turnCount * 3;
  score += survivors * 15;
  score += weaknessHits * 5;
  score += combos * 10;
  score = Math.max(0, Math.min(100, score));

  const grade: CombatRating["grade"] =
    score >= 90
      ? "S"
      : score >= 70
        ? "A"
        : score >= 50
          ? "B"
          : "C";
  const multiplier =
    grade === "S" ? 1.5 : grade === "A" ? 1.2 : grade === "B" ? 1.0 : 0.8;

  return {
    grade,
    turnsUsed: state.turnCount,
    survivorCount: survivors,
    weaknessHits,
    combosTriggered: combos,
    multiplier,
  };
}

// ── Rewards ──

function calculateRewards(state: ATBCombatState): CombatRewards {
  const mult = state.rating?.multiplier ?? 1.0;
  let totalExp = 0;
  let totalGold = 0;

  for (const enemy of state.enemies) {
    totalExp += Math.floor(enemy.loot.exp * mult);
    totalGold += Math.floor(enemy.loot.gold * mult);
  }

  const aliveMembers = state.party.filter((p) => p.isAlive);
  const deadMembers = state.party.filter((p) => !p.isAlive);
  const baseShare = Math.floor(totalExp / Math.max(1, state.party.length));
  const aliveBonus = Math.floor(baseShare * 0.2); // +20% for surviving

  const expPerMember: Record<string, number> = {};
  for (const m of aliveMembers) {
    expPerMember[m.id] = baseShare + aliveBonus;
  }
  for (const m of deadMembers) {
    expPerMember[m.id] = baseShare;
  }

  return { totalExp, totalGold, expPerMember };
}

async function distributeRewards(
  db: FullDbClient,
  _entities: IEntityManager,
  userId: string,
  rewards: CombatRewards,
): Promise<void> {
  const player = await findPlayerByUserId(db, userId);
  if (!player) return;

  await updatePlayer(db, userId, {
    gold: player.gold + rewards.totalGold,
    exp: player.exp + rewards.totalExp,
  });

  // Create action log for settlement system
  const gameDay = getCurrentGameDay();
  const actionPoints = 20 + Math.floor(rewards.totalExp / 10);
  await createActionLog(db, {
    playerId: userId,
    day: gameDay,
    type: "combat",
    description: `ATB战斗胜利 - 获得${rewards.totalExp}经验 ${rewards.totalGold}金币`,
    baseScore: actionPoints,
    bonus: 0,
    bonusReason: null,
  });
}

// ── Persistence ──

async function saveCombatState(
  db: FullDbClient,
  combatId: string,
  state: ATBCombatState,
  status?: string,
): Promise<void> {
  await combatRepo.updateCombatSession(db, combatId, {
    status: status ?? state.status,
    currentTurn: state.turnCount,
    playerTeam: JSON.stringify(state.party),
    enemyTeam: JSON.stringify(state.enemies),
    logs: JSON.stringify(state.logs),
    combatState: JSON.stringify(state),
  });
}

// ── Get Status ──

export async function getATBStatus(
  db: FullDbClient,
  userId: string,
  combatId: string,
): Promise<ATBCombatState> {
  const session = await combatRepo.findCombatById(db, combatId, userId);
  if (!session)
    throw new TRPCError({ code: "NOT_FOUND", message: "战斗不存在" });
  return JSON.parse(session.combatState ?? "{}") as ATBCombatState;
}
