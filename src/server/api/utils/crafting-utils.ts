/**
 * Crafting utility functions — material drop pool helpers
 */

export interface MaterialDropConfig {
  combat: {
    baseChance: number;
    rarityByLevel: Array<{ maxLevel: number; pool: Record<string, number> }>;
  };
  exploration: {
    baseChance: number;
    rarityByLevel: Array<{ maxLevel: number; pool: Record<string, number> }>;
  };
}

/**
 * Pick the rarity pool matching the given level from a rarityByLevel table.
 */
export function pickRarityPool(
  rarityByLevel: Array<{ maxLevel: number; pool: Record<string, number> }>,
  level: number,
): Record<string, number> {
  for (const entry of rarityByLevel) {
    if (level <= entry.maxLevel) return entry.pool;
  }
  return rarityByLevel[rarityByLevel.length - 1]!.pool;
}

/**
 * Roll a weighted random rarity from a pool of { rarity: weight } entries.
 */
export function rollFromPool(pool: Record<string, number>): string {
  const entries = Object.entries(pool);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[entries.length - 1]![0];
}
