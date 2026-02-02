import type { RewardEntry } from "./types";

/**
 * Result of granting rewards to a player.
 */
export interface GrantResult {
  resourcesGranted: Record<string, number>;
  cardsGranted: { rarity: string; count: number }[];
  itemsGranted: { itemId: string; count: number }[];
}

/**
 * Compute the resource updates and item/card grants from a reward list.
 * Returns structured data — caller is responsible for executing DB updates.
 *
 * This is a pure function (no DB access) so it can be tested independently.
 */
export function resolveRewards(rewards: RewardEntry[]): GrantResult {
  const result: GrantResult = {
    resourcesGranted: {},
    cardsGranted: [],
    itemsGranted: [],
  };

  for (const reward of rewards) {
    switch (reward.type) {
      case "resource":
        result.resourcesGranted[reward.stat] =
          (result.resourcesGranted[reward.stat] ?? 0) + reward.amount;
        break;
      case "card":
        result.cardsGranted.push({ rarity: reward.rarity, count: reward.count });
        break;
      case "item":
        result.itemsGranted.push({ itemId: reward.itemId, count: reward.count });
        break;
    }
  }

  return result;
}

/**
 * Build a Prisma player update object from resource grants.
 * Only includes fields that have non-zero values.
 */
export function buildResourceUpdate(
  resources: Record<string, number>,
  currentPlayer: Record<string, number>,
): Record<string, number> {
  const update: Record<string, number> = {};

  const RESOURCE_FIELDS = ["gold", "crystals", "food", "wood", "stone", "iron", "exp"];

  for (const field of RESOURCE_FIELDS) {
    const amount = resources[field];
    if (amount && amount !== 0) {
      update[field] = (currentPlayer[field] ?? 0) + amount;
    }
  }

  return update;
}
