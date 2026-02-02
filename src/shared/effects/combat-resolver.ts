import type {
  SkillEffect, CombatUnit, CombatBuff, CombatResult,
} from "./types";

/**
 * Core damage formula — parameterized version of the original hardcoded formula.
 */
export function calculateDamage(
  attackPower: number,
  defense: number,
  multiplier: number = 1.0,
  isCritical: boolean = false,
  critMultiplier: number = 1.5,
): number {
  const baseDamage = Math.max(1, attackPower - defense * 0.5);
  const critMult = isCritical ? critMultiplier : 1.0;
  const variance = 0.9 + Math.random() * 0.2;
  return Math.floor(baseDamage * multiplier * critMult * variance);
}

/**
 * Resolves a single skill effect against an attacker and defender.
 */
export function resolveSkillEffect(
  effect: SkillEffect,
  attacker: CombatUnit,
  defender: CombatUnit,
): CombatResult {
  switch (effect.type) {
    case "damage":
      return resolveDamage(effect, attacker, defender);
    case "heal":
      return resolveHeal(effect, attacker);
    case "buff":
      return resolveBuff(effect, attacker, defender);
    case "flee":
      return resolveFlee(effect);
    case "special":
      return {
        logs: [`${attacker.name} 使用了特殊技能 ${effect.action}`],
        specialAction: { action: effect.action, params: effect.params },
      };
  }
}

function resolveDamage(
  effect: Extract<SkillEffect, { type: "damage" }>,
  attacker: CombatUnit,
  defender: CombatUnit,
): CombatResult {
  const attackStat = effect.damageType === "magic"
    ? getBuffedStat(attacker, "intellect") * 2.5
    : getBuffedStat(attacker, "attack");
  const defenseStat = effect.damageType === "magic"
    ? getBuffedStat(defender, "defense") * 0.5
    : getBuffedStat(defender, "defense");

  // Use critRate/critDamage from buffs (falling back to base formula)
  const baseCritChance = 0.1 + (attacker.luck * 0.005);
  const critChance = baseCritChance + getBuffedStat(attacker, "critRate") - ((attacker as unknown as Record<string, number>).critRate ?? 0);
  const isCrit = Math.random() < critChance;
  const critDmgBase = 1.5;
  const critDmgBonus = getBuffedStat(attacker, "critDamage") - ((attacker as unknown as Record<string, number>).critDamage ?? 0);
  const critMultiplier = critDmgBase + critDmgBonus;

  let damage = calculateDamage(attackStat, defenseStat, effect.multiplier, isCrit, critMultiplier);

  // Apply defender's damageReduction
  const dmgReduction = getBuffedStat(defender, "damageReduction");
  if (dmgReduction > 0) {
    damage = Math.max(1, Math.floor(damage * (1 - Math.min(dmgReduction, 0.9))));
  }

  defender.hp -= damage;

  const logs: string[] = [];
  const typeLabel = effect.damageType === "magic" ? "魔法" : "物理";
  const elementLabel = effect.element ? `[${effect.element}]` : "";
  logs.push(
    `${attacker.name} 造成了 ${damage} 点${typeLabel}${elementLabel}伤害${isCrit ? "（暴击！）" : ""}`,
  );

  // Apply lifesteal
  const lifesteal = getBuffedStat(attacker, "lifesteal");
  if (lifesteal > 0) {
    const stolen = Math.floor(damage * Math.min(lifesteal, 1));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + stolen);
    if (stolen > 0) logs.push(`${attacker.name} 吸取了 ${stolen} 点生命值`);
  }

  return { logs, damageDealt: damage };
}

function resolveHeal(
  effect: Extract<SkillEffect, { type: "heal" }>,
  caster: CombatUnit,
): CombatResult {
  const target = caster; // "self" target for now; "ally" would need team context

  let healAmount: number;
  if (effect.healType === "hp") {
    healAmount = effect.isPercent
      ? Math.floor(target.maxHp * effect.amount)
      : effect.amount;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
  } else {
    healAmount = effect.isPercent
      ? Math.floor(target.maxMp * effect.amount)
      : effect.amount;
    target.mp = Math.min(target.maxMp, target.mp + healAmount);
  }

  const label = effect.healType === "hp" ? "生命值" : "魔力值";
  return {
    logs: [`${caster.name} 恢复了 ${healAmount} 点${label}`],
    healAmount,
  };
}

function resolveBuff(
  effect: Extract<SkillEffect, { type: "buff" }>,
  caster: CombatUnit,
  target: CombatUnit,
): CombatResult {
  const buffTarget = effect.target === "self" ? caster : target;
  const buff: CombatBuff = {
    name: effect.modifiers.map((m) => `${m.stat}${m.type === "percent" ? "%" : ""}${m.value > 0 ? "+" : ""}${m.value}`).join(", "),
    modifiers: effect.modifiers,
    turnsRemaining: effect.duration,
    source: effect.target,
  };

  buffTarget.buffs.push(buff);

  const label = effect.target === "self" ? "获得了增益" : "被施加了减益";
  return {
    logs: [`${buffTarget.name} ${label}：${buff.name}（${effect.duration} 回合）`],
    buffsApplied: [buff],
  };
}

function resolveFlee(
  effect: Extract<SkillEffect, { type: "flee" }>,
): CombatResult {
  const success = Math.random() < effect.successRate;
  return {
    logs: [success ? "逃跑成功！" : "逃跑失败！"],
    fled: success,
  };
}

/**
 * Tick down buff durations, removing expired ones. Returns removed buff names.
 */
export function tickBuffs(unit: CombatUnit): string[] {
  const removed: string[] = [];
  unit.buffs = unit.buffs.filter((b) => {
    b.turnsRemaining--;
    if (b.turnsRemaining < 0) {
      removed.push(b.name);
      return false;
    }
    return true;
  });
  return removed;
}

/**
 * Get effective stat value considering active buffs.
 */
export function getBuffedStat(unit: CombatUnit, stat: string): number {
  const base = (unit as unknown as Record<string, number>)[stat] ?? 0;
  let flat = 0;
  let pct = 0;
  for (const buff of unit.buffs) {
    for (const mod of buff.modifiers) {
      if (mod.stat === stat) {
        if (mod.type === "flat") flat += mod.value;
        else pct += mod.value;
      }
    }
  }
  return Math.floor((base + flat) * (1 + pct));
}
