// ---------------------------------------------------------------------------
// IRuleStore — abstract data-access interface for game rules
// ---------------------------------------------------------------------------

import type { GameRuleRecord } from "./GameRuleService";

/**
 * Storage backend for game rules.
 * Implementations may use Prisma, in-memory maps, or any other persistence.
 */
export interface IRuleStore {
  findRuleByName(name: string): Promise<GameRuleRecord | null>;
  findRulesByCategory(category: string): Promise<GameRuleRecord[]>;
}
