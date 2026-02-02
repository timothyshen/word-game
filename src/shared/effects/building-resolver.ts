import type { BuildingEffects } from "./types";

const DEFAULT_UPGRADE_COSTS: Record<string, { gold: number; wood: number; stone: number }> = {
  core: { gold: 500, wood: 200, stone: 200 },
  production: { gold: 100, wood: 50, stone: 30 },
  military: { gold: 200, wood: 80, stone: 100 },
  commerce: { gold: 300, wood: 40, stone: 20 },
  special: { gold: 400, wood: 100, stone: 100 },
};

/**
 * Calculate building resource output based on its effects, level, and worker status.
 * Replaces the hardcoded baseOutputs map in building.ts.
 */
export function calculateBuildingOutput(
  effects: BuildingEffects,
  level: number,
  hasWorker: boolean,
  workerSkillBonus: number = 0,
): Record<string, number> {
  if (!effects.production || effects.production.length === 0) return {};

  const output: Record<string, number> = {};
  const levelMultiplier = 1 + (level - 1) * 0.3;
  const workerBase = effects.workerMultiplier ?? 1.5;
  const workerMultiplier = hasWorker ? workerBase + workerSkillBonus : 1;

  for (const prod of effects.production) {
    output[prod.stat] = Math.floor(prod.amountPerHour * levelMultiplier * workerMultiplier);
  }

  return output;
}

/**
 * Calculate upgrade cost for a building.
 * Uses building's own upgradeCostMultiplier if available, otherwise falls back to slot defaults.
 */
export function getUpgradeCost(
  effects: BuildingEffects,
  slot: string,
  currentLevel: number,
): { gold: number; wood: number; stone: number } {
  const base = DEFAULT_UPGRADE_COSTS[slot] ?? DEFAULT_UPGRADE_COSTS.production!;
  const costMultiplier = effects.upgradeCostMultiplier ?? 1;
  const levelMultiplier = currentLevel;

  return {
    gold: Math.floor(base.gold * levelMultiplier * costMultiplier),
    wood: Math.floor(base.wood * levelMultiplier * costMultiplier),
    stone: Math.floor(base.stone * levelMultiplier * costMultiplier),
  };
}
