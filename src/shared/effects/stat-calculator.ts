import type { StatModifier, StatSource, BaseStats } from "./types";

/**
 * Collects all modifiers from multiple sources and computes final stats.
 * Formula: final[stat] = (base[stat] + sum_flat) * (1 + sum_percent)
 */
export function calculateFinalStats(
  base: BaseStats,
  sources: StatSource[],
): BaseStats {
  const flatTotals: Record<string, number> = {};
  const percentTotals: Record<string, number> = {};

  for (const source of sources) {
    for (const mod of source.modifiers) {
      if (mod.type === "flat") {
        flatTotals[mod.stat] = (flatTotals[mod.stat] ?? 0) + mod.value;
      } else {
        percentTotals[mod.stat] = (percentTotals[mod.stat] ?? 0) + mod.value;
      }
    }
  }

  const result = { ...base };

  for (const key of Object.keys(result)) {
    const baseVal = base[key] ?? 0;
    const flat = flatTotals[key] ?? 0;
    const pct = percentTotals[key] ?? 0;
    result[key] = Math.floor((baseVal + flat) * (1 + pct));
  }

  return result;
}

/**
 * Applies temporary combat buffs as a stat source.
 */
export function combatBuffsToSource(
  buffs: { name: string; modifiers: StatModifier[] }[],
): StatSource {
  return {
    label: "combat-buffs",
    modifiers: buffs.flatMap((b) => b.modifiers),
  };
}
