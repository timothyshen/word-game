import type { Condition } from "./types";

export interface ConditionContext {
  level: number;
  tier: number;
  stats: Record<string, number>;
  skills: { category: string; level: number }[];
  flags: string[];
  items: { itemId: string; count: number }[];
}

export interface ConditionResult {
  met: boolean;
  reason?: string;
}

/**
 * Checks whether all conditions are satisfied by the given context.
 * Returns on first failure with a human-readable reason.
 */
export function checkConditions(
  conditions: Condition[],
  ctx: ConditionContext,
): ConditionResult {
  for (const cond of conditions) {
    switch (cond.type) {
      case "level":
        if (ctx.level < cond.min) {
          return { met: false, reason: `需要达到 ${cond.min} 级（当前 ${ctx.level} 级）` };
        }
        break;

      case "tier":
        if (ctx.tier < cond.min) {
          return { met: false, reason: `需要达到 ${cond.min} 阶（当前 ${ctx.tier} 阶）` };
        }
        break;

      case "stat":
        if ((ctx.stats[cond.stat] ?? 0) < cond.min) {
          return { met: false, reason: `${cond.stat} 需要至少 ${cond.min}（当前 ${ctx.stats[cond.stat] ?? 0}）` };
        }
        break;

      case "skill": {
        const skill = ctx.skills.find((s) => s.category === cond.category);
        if (!skill || skill.level < cond.minLevel) {
          return {
            met: false,
            reason: `需要 ${cond.category} 类技能达到 ${cond.minLevel} 级`,
          };
        }
        break;
      }

      case "skillCount": {
        const count = ctx.skills.filter((s) => s.category === cond.skillType).length;
        if (count < cond.count) {
          return {
            met: false,
            reason: `需要 ${cond.count} 个 ${cond.skillType} 类技能（当前 ${count} 个）`,
          };
        }
        break;
      }

      case "item": {
        const item = ctx.items.find((i) => i.itemId === cond.itemId);
        const required = cond.count ?? 1;
        if (!item || item.count < required) {
          return {
            met: false,
            reason: `需要物品 ${cond.itemId} x${required}`,
          };
        }
        break;
      }

      case "flag":
        if (!ctx.flags.includes(cond.flagName)) {
          return { met: false, reason: `需要解锁 ${cond.flagName}` };
        }
        break;
    }
  }

  return { met: true };
}
